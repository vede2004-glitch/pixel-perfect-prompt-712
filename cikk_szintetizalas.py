import json
import os
import time
import requests
import hashlib
from bs4 import BeautifulSoup
from difflib import SequenceMatcher
from concurrent.futures import ThreadPoolExecutor
from openai import OpenAI

# ==============================================================================
# 1. KONFIGURÁCIÓ
# ==============================================================================
MEMORY_FILE = "erdelyi_hirek_memoria.json"
OUTPUT_FILE = "src/data/news.json"

os.makedirs("src/data", exist_ok=True)

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
client = OpenAI(api_key=OPENAI_API_KEY)

MODEL_NAME = "gpt-6-luna"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
}

# ==============================================================================
# 2. SEGÉDFUNKCIÓK ÉS BIZTONSÁGI KORREKCIÓK
# ==============================================================================
def fix_hungarian_names_and_places(text: str) -> str:
    """
    Könnyű biztonsági védőháló a leggyakoribb félreírt magyar nevek és románul maradt városnevek javítására.
    """
    if not text:
        return text

    replacements = {
        "Peter Magyar": "Magyar Péter",
        "Péter Magyar": "Magyar Péter",
        "Viktor Orbán": "Orbán Viktor",
        "Cluj-Napoca": "Kolozsvár",
        "Cluj": "Kolozsvár",
        "Oradea": "Nagyvárad",
        "Târgu Mureș": "Marosvásárhely",
        "Târgu-Mureș": "Marosvásárhely",
        "Targu Mures": "Marosvásárhely",
        "Timisoara": "Temesvár",
        "Timișoara": "Temesvár",
        "Brașov": "Brassó",
        "Brasov": "Brassó",
        "Sibiu": "Nagyszeben",
        "Satu Mare": "Szatmárnémeti",
        "Baia Mare": "Nagybánya",
        "Bistrița": "Beszterce",
        "Sfântu Gheorghe": "Sepsiszentgyörgy",
        "Miercurea Ciuc": "Csíkszereda",
        "Odorheiu Secuiesc": "Székelyudvarhely",
        "Zalău": "Zilah",
        "Alba Iulia": "Gyulafehérvár",
        "Sighișoara": "Segesvár",
    }
    
    for wrong, correct in replacements.items():
        if wrong in text:
            text = text.replace(wrong, correct)
            
    return text

def calculate_similarity(text1: str, text2: str) -> float:
    """Kiszámolja két szöveg hasonlóságát 0.0 és 1.0 között."""
    if not text1 or not text2:
        return 0.0
    return SequenceMatcher(None, text1, text2).ratio()

def check_has_new_info_with_ai(existing_summary: str, new_article_text: str) -> bool:
    truncated_new_text = new_article_text[:1000] if new_article_text else ""

    prompt = f"""
MEGLÉVŐ ÖSSZEFOGLALÓ / ALAPCIKK:
{existing_summary}

ÚJ CIKK RÉSZLETE (ELSŐ 2 BEKEZDÉS):
{truncated_new_text}

FELADAT:
Tartalmaz az új cikk részlete BÁRMILYEN ÉRDEMI ÚJ TÉNYT, adatot, fejleményt vagy új nyilatkozatot a meglévő tartalomhoz képest?
Kizárólag egyetlen szóval válaszolj: "IGEN" vagy "NEM".
"""
    try:
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[{"role": "user", "content": prompt}],
            max_completion_tokens=100
        )
        answer = response.choices[0].message.content.strip().upper()
        return "IGEN" in answer
    except Exception as e:
        print(f"⚠️ Hiba az AI döntéshozatal során: {e}")
        return True

def calculate_fingerprint(articles_or_sources: list) -> str:
    links = []
    for item in articles_or_sources:
        link = item.get("link", "")
        if link:
            links.append(link)
    sorted_links = sorted(list(set(links)))
    combined = "|".join(sorted_links)
    return hashlib.md5(combined.encode("utf-8")).hexdigest()

def fetch_article_snippet_or_full(url: str, mode: str = "snippet") -> str:
    if not url:
        return ""
    try:
        response = requests.get(url, headers=HEADERS, timeout=8)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, "html.parser")
        
        paragraphs = soup.find_all("p")
        text_blocks = [p.text.strip() for p in paragraphs if len(p.text.strip()) > 35]
        
        if mode == "snippet":
            snippet_text = "\n\n".join(text_blocks[:2])
            return snippet_text[:500]
        else:
            full_text = "\n\n".join(text_blocks)
            return full_text[:2000]
    except Exception as e:
        print(f"⚠️ Nem sikerült a cikk letöltése ({url}): {e}")
        return ""

def load_existing_synthesized_articles() -> dict:
    if os.path.exists(OUTPUT_FILE):
        try:
            with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                return {item["group_id"]: item for item in data if "group_id" in item}
        except Exception as e:
            print(f"⚠️ Nem sikerült beolvasni a meglévő {OUTPUT_FILE} fájlt: {e}")
    return {}

# ==============================================================================
# 3. SZELEKTÍV CIKKFELDOLGOZÁS ÉS SZINTÉZIS (JOGILAG VÉDETT FOGALMAZÁS)
# ==============================================================================
def process_group_direct(g_id: str, articles: list, existing_synthesized: dict, group_fingerprint: str):
    is_update = bool(existing_synthesized and existing_synthesized.get("is_synthesized") and not existing_synthesized.get("rejected"))
    tag = "🔄 [FORRÁSBŐVÍTÉS / ÚJRAÍRÁS]" if is_update else "🆕 [ÚJ TÉMA GENERÁLÁSA]"
    
    print(f"\n{tag} Csoport [{g_id}] feldolgozása indult ({len(articles)} db forrás)...")
    
    category = articles[0].get("category", "Általános")
    latest_timestamp = max([int(a.get("published_at", a.get("fetched_at", time.time()))) for a in articles])

    all_group_sources = []
    seen_links = set()
    for art in articles:
        l = art.get("link", "")
        if l and l not in seen_links:
            seen_links.add(l)
            all_group_sources.append({
                "source": art.get("source", ""),
                "title": art.get("title", ""),
                "link": l
            })

    first_art = articles[0]
    first_full_text = fetch_article_snippet_or_full(first_art.get("link", ""), mode="full") or first_art.get("summary", "")

    selected_articles_for_ai = [{
        "source": first_art.get("source", ""),
        "title": first_art.get("title", ""),
        "link": first_art.get("link", ""),
        "content": first_full_text
    }]

    for idx, art in enumerate(articles[1:], start=2):
        snippet = fetch_article_snippet_or_full(art.get("link", ""), mode="snippet") or art.get("summary", "")
        if calculate_similarity(snippet, first_full_text[:500]) > 0.80:
            continue

        has_new = check_has_new_info_with_ai(first_full_text, snippet)
        if has_new:
            full_text = fetch_article_snippet_or_full(art.get("link", ""), mode="full")
            selected_articles_for_ai.append({
                "source": art.get("source", ""),
                "title": art.get("title", ""),
                "link": art.get("link", ""),
                "content": full_text if full_text else snippet
            })

    new_sources_text = ""
    for idx, res in enumerate(selected_articles_for_ai, 1):
        new_sources_text += f"\n--- {idx}. FORRÁS ({res['source']}): {res['title']} ---\n"
        new_sources_text += f"{res['content']}\n"

    # 🛑 SZIGORÚ JOGI ÉS PARAFRAZEÁLÁSI PROMPT UTASÍTÁSOK
    LEGAL_PARAPHRASE_INSTRUCTION = """
SZIGORÚ SZERZŐI JOGI ÉS MEGFOGALMAZÁSI SZABÁLYOK:
1. TELJES ÁTFOGALMAZÁS (PARAFRÁZIS): SZIGORÚAN TILOS a forrásszövegekből teljes mondatokat vagy egyedi szófordulatokat szó szerint átvenni!
2. KIZÁRÓLAG TÉNY-KIVONATOLÁS: A forrásokból kizárólag a puszta tényeket (dátumok, nevek, számok, helyszínek, események) használd fel.
3. SAJÁT SZAVAK ÉS MONDTASZERKEZET: A cikket teljesen új, saját mondatszerkezetekkel és újságírói megfogalmazással írd meg.
4. TÁRGYILAGOS HÍRSTÍLUS: Legyen szintetizált, tényalapú és független elemzés.
"""

    if is_update:
        old_title_hu = existing_synthesized.get("title_hu", "")
        old_lead_hu = existing_synthesized.get("lead_hu", "")
        old_content_hu = existing_synthesized.get("content_hu", "")

        prompt = f"""
Te a Hírelemző szerkesztője vagy. Korábban már írtál egy pontokba szedett összefoglalót egy témában, de most ÚJ forrás(ok) érkeztek hozzá.

{LEGAL_PARAPHRASE_INSTRUCTION}

MÁR MEGLÉVŐ ÖSSZEFOGLALÓ (HU):
Cím: {old_title_hu}
Lead: {old_lead_hu}
Tartalom:
{old_content_hu}

ÚJONNAN ÉRKEZETT FORRÁSOK TARTALMA:
{new_sources_text}

FELADAT:
1. Vizsgáld meg az új forrásokat!
2. HA tartalmaz új tényt vagy adatot, EGÉSZÍTSD KI a meglévő pontokat teljesen új megfogalmazású gondolatjelekkel (•)!
3. HA nincs benne új információ, állítsd a "skip" mezőt true-ra!
4. Írd meg a frissített összefoglalót MAGYAR és ROMÁN nyelven is!

TERJEDELMI ÉS FORMÁTUMSZABÁLYOK:
- A "content_hu" és "content_ro" mezőben KIZÁRÓLAG gondolatjelekkel (•) kezdődő pontokat írj!
- A törzsszöveg ("content_hu" és "content_ro") hossza KÖZELÍTŐLEG 1200 KARAKTER LEGYEN (kb. 4-6 részletes, alaposan kifejtett gondolatjel)!
- MINDEN EGYES PONT LEGELEJÉN A KULCSÁLLÍTÁST / DÁTUMOT / FŐSZEREPLŐT KÖTELEZŐ FÉLKÖVÉR MARKDOWN-NAL (**szöveg**) KIEMELNED!

KIZÁRÓLAG az alábbi JSON szerkezetben válaszolj:
{{
  "skip": false,
  "title_hu": "Frissített magyar cím",
  "lead_hu": "Frissített 2-3 mondatos magyar lead",
  "content_hu": "• **Dátum vagy Főállítás** első fontos magyar pont...\\n\\n• **Kulcsszó vagy Szereplő** második magyar pont...",
  "title_ro": "Titlu actualizat în română",
  "lead_ro": "Lead de 2-3 propoziții în română",
  "content_ro": "• **Data sau Afirmația Cheie** primul punct în română...\\n\\n• **Cuvânt cheie** al doilea punct..."
}}
"""
    else:
        prompt = f"""
Te a Hírelemző portál vezető szerkesztője vagy. Az alábbiakban megadok több hírforrásból származó cikket egy témacsoportból.

{LEGAL_PARAPHRASE_INSTRUCTION}

FELADAT ÉS SZŰRÉS:
1. Szigorúan vizsgáld meg a megadott források tartalmát!
2. HA BÁRMELYIK FORRÁS NEM UGYANARRÓL AZ ESEMÉNYRŐL SZÓL, AZT TELJESEN HAGYD KI!
3. Fogalmazd át a tényeket saját szavaiddal 100%-ban újszerű mondatokba.
4. Készíts két teljes értékű összefoglalót: egyet MAGYARUL és egyet ROMÁNUL!

TERJEDELMI ÉS FORMÁTUMSZABÁLYOK:
- A "content_hu" és "content_ro" mezőkben KIZÁRÓLAG gondolatjelekkel (•) kezdődő, különálló pontokat írj!
- A törzsszöveg ("content_hu" és "content_ro") hossza KÖZELÍTŐLEG 1200 KARAKTER LEGYEN (kb. 4-6 részletes, alaposan kifejtett gondolatjel)!
- MINDEN EGYES PONT LEGELEJÉN A KULCSÁLLÍTÁST / DÁTUMOT / FŐSZEREPLŐT KÖTELEZŐ FÉLKÖVÉR MARKDOWN-NAL (**szöveg**) KIEMELNED!

KIZÁRÓLAG az alábbi JSON szerkezetben válaszolj:
{{
  "skip": false,
  "title_hu": "A tényekre fókuszáló magyar cím",
  "lead_hu": "2-3 mondatos magyar összefoglaló lead",
  "content_hu": "• **Szeptember 30-án** az Orosz Föderáció újabb nagyszabású...\\n\\n• A **hőerőmű elleni támadás** következtében...",
  "title_ro": "Titlul în română focalizat pe fapte",
  "lead_ro": "Rezumat de 2-3 propoziții în română",
  "content_ro": "• Pe **30 septembrie** atacurile au vizat...\\n\\n• Centrala termică a fost grav afectată..."
}}

FORRÁSOK:
{new_sources_text}
"""

    try:
        print(f"🚀 Teljes AI szintetizálás hívása ({MODEL_NAME}) -> [{g_id}]...")
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": "Kizárólag érvényes JSON objektumot adj vissza!"},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            max_completion_tokens=2500
        )
        content_str = response.choices[0].message.content
        parsed_article = json.loads(content_str)

        if parsed_article.get("skip") is True:
            rejected_entry = {
                "group_id": g_id,
                "fingerprint": group_fingerprint,
                "is_synthesized": False,
                "rejected": True,
                "is_b2b_only": False,
                "published_at": latest_timestamp
            }
            return [rejected_entry], False, is_update

        if is_update and existing_synthesized and "sources" in existing_synthesized:
            for s in existing_synthesized["sources"]:
                if s.get("link") and s.get("link") not in seen_links:
                    seen_links.add(s["link"])
                    all_group_sources.append(s)

        synthesized_entry = {
            "group_id": g_id,
            "fingerprint": group_fingerprint,
            "category": category,
            "is_synthesized": True,
            "rejected": False,
            "is_b2b_only": False,
            "sources_count": len(all_group_sources),
            "sources": all_group_sources,
            "published_at": latest_timestamp,
            "title_hu": fix_hungarian_names_and_places(parsed_article.get("title_hu", "")),
            "lead_hu": fix_hungarian_names_and_places(parsed_article.get("lead_hu", "")),
            "content_hu": fix_hungarian_names_and_places(parsed_article.get("content_hu", "")),
            "title_ro": parsed_article.get("title_ro", ""),
            "lead_ro": parsed_article.get("lead_ro", ""),
            "content_ro": parsed_article.get("content_ro", "")
        }
        return [synthesized_entry], True, is_update

    except Exception as e:
        print(f"⚠️ Hiba a(z) {g_id} feldolgozásakor: {e}")
        return [], False, is_update

# ==============================================================================
# 4. FŐ FOLYAMAT (SZELEKTÍV HÍR SZINTETIZÁLÓ)
# ==============================================================================
def run_synthesis_direct():
    print("==================================================================")
    print("🚀 INTELLIGENS, SZELEKTÍV HÍR SZINTETIZÁLÓ FOLYAMAT INDÍTÁSA")
    print("==================================================================")

    if not os.path.exists(MEMORY_FILE):
        print(f"⚠️ A memóriafájl ({MEMORY_FILE}) nem található! Leállás.")
        return

    with open(MEMORY_FILE, "r", encoding="utf-8") as f:
        memory = json.load(f)

    existing_articles = load_existing_synthesized_articles()

    grouped_data = {}
    for item in memory:
        g_id = item.get("group_id")
        if g_id:
            grouped_data.setdefault(g_id, []).append(item)

    multi_groups = []
    single_results = []
    
    CURRENT_TIME = int(time.time())
    AI_PROCESS_CUTOFF = CURRENT_TIME - (12 * 3600)
    RETENTION_CUTOFF = CURRENT_TIME - (24 * 3600)

    stats = {
        "total_groups": len(grouped_data),
        "expired_groups": 0,
        "single_source_groups": 0,
        "skipped_b2b_groups": 0,
        "skipped_fingerprint": 0,
        "skipped_hybrid_filter": 0,
        "processed_by_ai": 0
    }

    for g_id, articles in grouped_data.items():
        latest_timestamp = max([int(a.get("published_at", a.get("fetched_at", 0))) for a in articles])

        if latest_timestamp < RETENTION_CUTOFF:
            stats["expired_groups"] += 1
            continue

        # 💼 B2B CSOPORTOK
        is_b2b_group = any(art.get("is_b2b_only", False) for art in articles)
        if is_b2b_group:
            stats["skipped_b2b_groups"] += 1
            art = max(articles, key=lambda a: int(a.get("published_at", a.get("fetched_at", 0))))
            summ = fix_hungarian_names_and_places(art.get("summary", "") or "")
            lead = (summ[:200] + "…") if len(summ) > 200 else summ
            
            sources_list = []
            seen = set()
            for a in articles:
                l = a.get("link", "")
                if l and l not in seen:
                    seen.add(l)
                    sources_list.append({"source": a.get("source", ""), "title": a.get("title", ""), "link": l})

            single_results.append({
                "group_id": g_id,
                "category": art.get("category", "Gazdaság"),
                "is_synthesized": False,
                "is_b2b_only": True,
                "sources_count": len(sources_list),
                "sources": sources_list,
                "published_at": latest_timestamp,
                "title_hu": fix_hungarian_names_and_places(art.get("title", "")), 
                "lead_hu": lead, 
                "content_hu": summ,
                "title_ro": art.get("title", ""), 
                "lead_ro": lead, 
                "content_ro": summ,
            })
            continue

        unique_sources = set(art.get("source") for art in articles if art.get("source"))
        if len(unique_sources) < 2:
            stats["single_source_groups"] += 1
            art = max(articles, key=lambda a: int(a.get("published_at", a.get("fetched_at", 0))))
            summ = fix_hungarian_names_and_places(art.get("summary", "") or "")
            lead = (summ[:200] + "…") if len(summ) > 200 else summ
            single_results.append({
                "group_id": g_id,
                "category": art.get("category", "Általános"),
                "is_synthesized": False,
                "is_b2b_only": False,
                "sources_count": 1,
                "sources": [{"source": art.get("source", ""), "title": art.get("title", ""), "link": art.get("link", "")}],
                "published_at": latest_timestamp,
                "title_hu": fix_hungarian_names_and_places(art.get("title", "")), 
                "lead_hu": lead, 
                "content_hu": summ,
                "title_ro": art.get("title", ""), 
                "lead_ro": lead, 
                "content_ro": summ,
            })
            continue

        current_fingerprint = calculate_fingerprint(articles)
        existing_synth = existing_articles.get(g_id)

        if existing_synth and existing_synth.get("is_synthesized"):
            existing_fingerprint = existing_synth.get("fingerprint")
            if not existing_fingerprint and "sources" in existing_synth:
                existing_fingerprint = calculate_fingerprint(existing_synth["sources"])

            if existing_fingerprint and current_fingerprint == existing_fingerprint:
                stats["skipped_fingerprint"] += 1
                continue

            newest_article = max(articles, key=lambda a: int(a.get("published_at", a.get("fetched_at", 0))))
            new_text = newest_article.get("summary", "") or newest_article.get("title", "")
            existing_summary = existing_synth.get("content_hu", "")
            
            similarity = calculate_similarity(new_text, existing_summary)

            if similarity > 0.85:
                existing_links = {s.get("link") for s in existing_synth.get("sources", [])}
                for a in articles:
                    src_entry = {"source": a.get("source", ""), "title": a.get("title", ""), "link": a.get("link", "")}
                    if src_entry["link"] and src_entry["link"] not in existing_links:
                        existing_synth.setdefault("sources", []).append(src_entry)
                        existing_links.add(src_entry["link"])
                
                existing_synth["sources_count"] = len(existing_synth["sources"])
                stats["skipped_hybrid_filter"] += 1
                continue

            elif similarity > 0.40:
                has_new_info = check_has_new_info_with_ai(existing_summary, new_text)
                if not has_new_info:
                    existing_links = {s.get("link") for s in existing_synth.get("sources", [])}
                    for a in articles:
                        src_entry = {"source": a.get("source", ""), "title": a.get("title", ""), "link": a.get("link", "")}
                        if src_entry["link"] and src_entry["link"] not in existing_links:
                            existing_synth.setdefault("sources", []).append(src_entry)
                            existing_links.add(src_entry["link"])
                    
                    existing_synth["sources_count"] = len(existing_synth["sources"])
                    stats["skipped_hybrid_filter"] += 1
                    continue

        if latest_timestamp >= AI_PROCESS_CUTOFF:
            multi_groups.append((g_id, articles, existing_synth, current_fingerprint))

    stats["processed_by_ai"] = len(multi_groups)

    synthesized_results = []
    if multi_groups:
        print(f"\n🚀 {len(multi_groups)} db friss (12h) többforrásos csoport párhuzamos feldolgozása indult ({MODEL_NAME})...")
        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = [
                executor.submit(process_group_direct, g_id, articles, existing, fingerprint)
                for g_id, articles, existing, fingerprint in multi_groups
            ]
            for future in futures:
                entries, is_synth, is_update = future.result()
                if is_synth:
                    synthesized_results.extend(entries)

    all_final_results = {}
    if os.path.exists(OUTPUT_FILE):
        try:
            with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
                existing_data = json.load(f)
                for item in existing_data:
                    if "group_id" in item:
                        all_final_results[item["group_id"]] = item
        except Exception as e:
            print(f"⚠️ Nem sikerült beolvasni a korábbi {OUTPUT_FILE} fájlt: {e}")

    for item in single_results:
        all_final_results[item["group_id"]] = item
    for item in synthesized_results:
        all_final_results[item["group_id"]] = item

    fresh_items = [
        item for item in all_final_results.values() 
        if item.get("published_at", 0) >= RETENTION_CUTOFF
    ]

    frontend_news = [
        item for item in fresh_items 
        if not item.get("rejected")
    ]

    for item in frontend_news:
        if "sources" in item and isinstance(item["sources"], list):
            item["sources_count"] = len(item["sources"])

    final_sorted_list = sorted(
        frontend_news, 
        key=lambda x: x.get("published_at", 0), 
        reverse=True
    )

    print(f"\n💾 Mentés indítása a(z) {OUTPUT_FILE} fájlba...")
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(final_sorted_list, f, ensure_ascii=False, indent=2)

    HISTORY_FILE = "src/data/news_archive.json"
    history = {}
    if os.path.exists(HISTORY_FILE):
        try:
            with open(HISTORY_FILE, "r", encoding="utf-8") as f:
                for item in json.load(f):
                    if "group_id" in item:
                        history[item["group_id"]] = item
        except Exception as e:
            print(f"⚠️ Nem sikerült beolvasni a {HISTORY_FILE} fájlt: {e}")
    for item in all_final_results.values():
        if not item.get("rejected"):
            if "sources" in item and isinstance(item["sources"], list):
                item["sources_count"] = len(item["sources"])
            history[item["group_id"]] = item
    with open(HISTORY_FILE, "w", encoding="utf-8") as f:
        json.dump(sorted(history.values(), key=lambda x: x.get("published_at", 0), reverse=True), f, ensure_ascii=False, indent=2)

    print("\n==================================================================")
    print("🎉 FOLYAMAT BEFEJEZŐDÖTT - JOGILAG VÉDETT, SAJÁT SZAVAS MONDTOSZERKEZETEK!")
    print("==================================================================")

if __name__ == "__main__":
    run_synthesis_direct()
