import json
import re
import os
import time
import calendar
import hashlib
import requests
import feedparser
import torch
import numpy as np
from datetime import datetime
from email.utils import parsedate_to_datetime
from bs4 import BeautifulSoup
from concurrent.futures import ThreadPoolExecutor
from sentence_transformers import SentenceTransformer

# ==============================================================================
# 1. KONFIGURÁCIÓ (ERDÉLYI ÉS ROMÁNIAI RSS FORRÁSOK)
# ==============================================================================
PUBLIC_RSS_FEEDS = {
    "Maszol": "https://maszol.ro/rss",
    "Maszol Sport": "https://maszol.ro/sport/rss",
    "Maszol Életmód": "https://maszol.ro/eletmod/rss",
    "Maszol Gazdaság": "https://maszol.ro/gazdasag/rss",
    "Transtelex": "https://transtelex.ro/rss",
    "Átlátszó Erdély": "https://atlatszo.ro/feed/",
    "Udvarhelyi Hírportál (UH.ro)": "https://www.uh.ro/feed/",
    "Kolozsvári Rádió (HU)": "https://www.kolozsvariradio.ro/feed/",
    "Vásárhely.ma": "https://www.vasarhely.ma/feed/",
    "Marosvásárhelyi Rádió (HU)": "https://www.marosvasarhelyiradio.ro/feed/",
    "Mediatica.ro": "https://www.mediatica.ro/feed/",
    "Szatmári sporthírek": "https://szmsport.ro/feed/",
    "Manna": "https://manna.ro/feed/",
    "RomKat": "https://romkat.ro/feed/",
    "Hargita Népe": "https://hargitanepe.ro/rss",
    "Agerpres (HU)": "https://www.agerpres.ro/magyar/rss",
    "GSP - Gazeta Sporturilor": "https://www.gsp.ro/rss.xml",
    "Cancan.ro": "https://www.cancan.ro/feed",
    "PresaSM (Szatmár)": "https://www.presasm.ro/feed/",
    "Digi24": "https://www.digi24.ro/rss",
    "G4Media": "https://www.g4media.ro/feed",
    "HotNews.ro": "https://www.hotnews.ro/rss",
    "Adevărul": "https://adevarul.ro/rss/",
    "Mediafax": "https://www.mediafax.ro/rss/",
    "ProTV Stiri": "https://stirileprotv.ro/rss",
    "Ebihoreanul (Nagyvárad/Bihar)": "https://www.ebihoreanul.ro/rss",
    "Pontmaros": "https://www.pontmaros.ro/feed/"
}

MEMORY_FILE = "erdelyi_hirek_memoria.json"
GROUPED_FILE = "erdelyi_hirek_csoportositott.json"
ARCHIVE_FILE = "erdelyi_hirek_archivum.json"
OUTPUT_FILE = "src/data/news.json"
MANUAL_TOP_FILE = "manual_top.json"
TOP_SELECTOR_FILE = "top_valaszto.json"

SIMILARITY_THRESHOLD_CROSS_SOURCE = 0.72
SIMILARITY_THRESHOLD_SAME_SOURCE = 0.80

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
}

CATEGORIES = {
    "Sport": ["foci", "labdarúgás", "mérkőzés", "bajnokság", "edző", "győzelem", "vereség", "liga", "kupa", "meccs", "gól", "kézilabda", "kosárlabda", "jégkorong", "hoki", "fotbal", "meci", "campionat"],
    "Politika": ["kormány", "parlament", "választás", "párt", "politika", "tanács", "polgármester", "miniszter", "szenátus", "döntés", "törvény", "rmdsz", "psd", "pnl", "usr", "aur", "guvern", "alegeri", "primar"],
    "Gazdaság": ["pénz", "euró", "lej", "infláció", "befektetés", "gazdaság", "cégek", "üzlet", "piac", "drágulás", "árak", "bank", "fizetés", "bér", "bani", "inflatie", "investitii", "economie"],
    "Kultúra": ["színház", "múzeum", "koncert", "kiállítás", "könyv", "irodalom", "zene", "művészet", "fesztivál", "egyház", "teatru", "muzeu", "carte", "muzica", "biserica"],
    "Erdély": ["erdély", "székelyföld", "kolozsvár", "marosvásárhely", "csíkszereda", "sepsiszentgyörgy", "székelyudvarhely", "nagyvárad", "szatmárnémeti", "brassó", "hargita", "kovászna", "maros"],
    "Bulvár": ["sztár", "celeb", "szerelem", "szakítás", "házasság", "botrány", "vedeta", "scandal", "divort", "cancan", "showbiz", "horoszkóp"]
}

_MODEL = None

def get_model():
    global _MODEL
    if _MODEL is None:
        print("🧠 SentenceTransformer AI modell betöltése (Erdély/RO)...")
        _MODEL = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")
        _MODEL.to(torch.float32)
    return _MODEL

# ==============================================================================
# 2. SEGÉDFUNKCIÓK
# ==============================================================================
def slugify(text):
    """Ékezetmentesíti és URL-baráttá alakítja a magyar és román karaktereket is."""
    if not text:
        return ""
    char_map = {
        'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ő': 'o', 'ú': 'u', 'ű': 'u', 'ü': 'u',
        'Á': 'a', 'É': 'e', 'Í': 'i', 'Ó': 'o', 'Ő': 'o', 'Ú': 'u', 'Ű': 'u', 'Ü': 'u',
        'ă': 'a', 'â': 'a', 'î': 'i', 'ș': 's', 'ş': 's', 'ț': 't', 'ţ': 't',
        'Ă': 'a', 'Â': 'a', 'Î': 'i', 'Ș': 's', 'Ş': 's', 'Ț': 't', 'Ţ': 't'
    }
    for orig, repl in char_map.items():
        text = text.replace(orig, repl)
    text = text.lower()
    text = re.sub(r'[^a-z0-9\s-]', '', text)
    return re.sub(r'[\s-]+', '-', text).strip('-')[:80]

def parse_published_time(entry) -> int:
    pub_parsed = entry.get('published_parsed') or entry.get('updated_parsed')
    if pub_parsed:
        try:
            return int(calendar.timegm(pub_parsed))
        except Exception:
            pass
    raw_date = entry.get('published') or entry.get('updated') or entry.get('pubDate')
    if raw_date:
        try:
            return int(parsedate_to_datetime(raw_date).timestamp())
        except Exception:
            pass
    return 0

def load_json_file(filename):
    if os.path.exists(filename):
        try:
            with open(filename, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []
    return []

def load_manual_top_ids(filename) -> list:
    """Biztonságosan kiolvassa a kézzel kiemelt group_id-kat a manual_top.json fájlból."""
    if not os.path.exists(filename):
        return []
    try:
        with open(filename, "r", encoding="utf-8") as f:
            data = json.load(f)
        raw_ids = []
        if isinstance(data, list):
            raw_ids = data
        elif isinstance(data, dict):
            if "group_ids" in data and isinstance(data["group_ids"], list):
                raw_ids = data["group_ids"]
            elif "group_id" in data and data["group_id"]:
                raw_ids = [data["group_id"]]
        return [str(gid).strip() for gid in raw_ids if str(gid).strip()]
    except Exception as e:
        print(f"⚠️ Hiba a(z) {filename} beolvasásakor: {e}")
        return []

def save_json_file(filename, data):
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def clean_text(text):
    if not text:
        return ""
    return re.sub(r'\s+', ' ', BeautifulSoup(text, 'html.parser').text).strip()

def classify_article(title, summary, source_name):
    text = f"{title} {summary}".lower()

    crime_education_keywords = [
        "rendőrség", "bántalmazás", "letartóztatás", "bíróság", "miniszter", 
        "iskola", "profesor", "politie", "dosar penal", "reţinut", "agresat", "tanár"
    ]
    if any(kw in text for kw in crime_education_keywords):
        if any(w in text for w in ["erdély", "timișoara", "temesvár", "kolozsvár", "marosvásárhely", "székelyföld"]):
            return "Erdély"
        return "Általános"

    if source_name in ["Szatmári sporthírek", "Székely Sport", "Maszol Sport", "GSP - Gazeta Sporturilor"]:
        return "Sport"
    if source_name in ["Maszol Gazdaság", "Economedia", "Ziarul Financiar"]:
        return "Gazdaság"
    if source_name in ["Click.ro", "Cancan.ro", "Maszol Életmód"]:
        return "Bulvár"
    if source_name in ["Udvarhelyi Hírportál (UH.ro)", "Hargita Népe", "PresaSM (Szatmár)", "Szatmári Friss Újság", "Vásárhely.ma", "Átlátszó Erdély", "Ebihoreanul (Nagyvárad/Bihar)"]:
        return "Erdély"

    for category, keywords in CATEGORIES.items():
        if any(re.search(r'\b' + re.escape(kw) + r'\b', text) for kw in keywords):
            return category

    return "Általános"

def extract_cover_image(entry):
    if 'media_content' in entry and entry.media_content:
        for media in entry.media_content:
            if 'url' in media and media['url']:
                return media['url']
    if 'links' in entry:
        for link in entry.links:
            if link.get('type', '').startswith('image/') and 'href' in link:
                return link['href']
    raw_html = entry.get('summary', '') or entry.get('description', '')
    if raw_html:
        soup = BeautifulSoup(raw_html, 'html.parser')
        img = soup.find('img')
        if img and img.get('src'):
            return img['src']
    return ""

def get_embedding(title, summary):
    clean_title = clean_text(title)
    clean_sum = clean_text(summary)[:250]
    text_to_embed = f"{clean_title}. {clean_title}. {clean_sum}"
    if not text_to_embed.strip():
        return []
    embedding = get_model().encode(text_to_embed, convert_to_numpy=True)
    return np.round(embedding, 4).tolist()

def cosine_similarity(v1, v2):
    if not v1 or not v2:
        return 0.0
    a, b = np.array(v1), np.array(v2)
    norm_a, norm_b = np.linalg.norm(a), np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(a, b) / (norm_a * norm_b))

def extract_article_data(entry, source_name, cutoff_24h):
    title = clean_text(entry.get('title', ''))
    link = entry.get('link', '').strip()

    pub_timestamp = parse_published_time(entry)
    current_now = int(time.time())

    if pub_timestamp > current_now:
        pub_timestamp = current_now

    if pub_timestamp == 0 or pub_timestamp < cutoff_24h:
        return None

    clean_summary = clean_text(entry.get('summary', '') or entry.get('description', ''))
    image_url = extract_cover_image(entry)
    category = classify_article(title, clean_summary, source_name)

    return {
        "source": source_name,
        "title": title,
        "link": link,
        "summary": clean_summary,
        "image": image_url,
        "published_at": pub_timestamp,
        "category": category
    }

def fetch_single_feed(item_and_cutoff):
    (source_name, feed_url), cutoff_24h = item_and_cutoff
    extracted = []
    session = requests.Session()
    session.headers.update(HEADERS)
    try:
        response = session.get(feed_url, timeout=12, allow_redirects=True)
        feed = feedparser.parse(response.content if response.status_code == 200 else feed_url)
        for entry in feed.entries:
            art = extract_article_data(entry, source_name, cutoff_24h)
            if art and art["title"]:
                extracted.append(art)
    except Exception as e:
        print(f"⚠️ Hiba a(z) {source_name} feed beolvasásakor: {e}")
    return extracted

def calculate_importance_score(item):
    sources_count = item.get("sources_count", 1)
    if sources_count <= 1:
        return 0.0

    score = sources_count * 10.0
    text = f"{item.get('title_hu', '')} {item.get('lead_hu', '')} {item.get('title_ro', '')}".lower()
    
    breaking_keywords = ["rendkívüli", "bejelentés", "friss", "döntés", "kormány", "háború", "incendiu", "accident", "guvern", "urgenta"]
    if any(kw in text for kw in breaking_keywords):
        score += 5.0

    pub_time = item.get("published_at", 0)
    age_hours = (time.time() - pub_time) / 3600.0
    if age_hours < 3:
        score += 15.0
    elif age_hours < 6:
        score += 8.0
    elif age_hours < 12:
        score += 3.0

    return score

# ==============================================================================
# 3. FŐ FOLYAMAT
# ==============================================================================
def run_pipeline():
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"\n[{now_str}] 🔄 Erdélyi/RO hírcsatornák frissítése indult ({len(PUBLIC_RSS_FEEDS)} forrás)...")

    cutoff_24h = int(time.time()) - (24 * 3600)
    memory = load_json_file(MEMORY_FILE)
    archive = load_json_file(ARCHIVE_FILE)

    fetched_articles = []
    feed_items = [((src, url), cutoff_24h) for src, url in PUBLIC_RSS_FEEDS.items()]
    
    with ThreadPoolExecutor(max_workers=min(len(PUBLIC_RSS_FEEDS), 15)) as executor:
        results = executor.map(fetch_single_feed, feed_items)

    for article_list in results:
        fetched_articles.extend(article_list)

    for art in fetched_articles:
        existing_item = next((m for m in memory if m["link"] == art["link"]), None)
        if existing_item:
            if art["published_at"] > existing_item.get("fetched_at", 0):
                existing_item["title"] = art["title"]
                existing_item["summary"] = art["summary"]
                existing_item["fetched_at"] = art["published_at"]
                if art.get("image"):
                    existing_item["image"] = art["image"]
            continue

        art_embedding = get_embedding(art['title'], art['summary'])
        if not art_embedding:
            continue

        best_match_group_id = None
        highest_similarity = -1.0
        best_match_source = ""

        for m_item in memory:
            if "embedding" not in m_item or not m_item["embedding"]:
                m_item["embedding"] = get_embedding(m_item['title'], m_item.get('summary', ''))

            sim = cosine_similarity(art_embedding, m_item["embedding"])
            if sim > highest_similarity:
                highest_similarity = sim
                best_match_group_id = m_item["group_id"]
                best_match_source = m_item["source"]

        required_threshold = SIMILARITY_THRESHOLD_SAME_SOURCE if art["source"] == best_match_source else SIMILARITY_THRESHOLD_CROSS_SOURCE

        if highest_similarity >= required_threshold and best_match_group_id:
            group_id = best_match_group_id
        else:
            link_hash = hashlib.md5(art["link"].encode("utf-8")).hexdigest()[:10]
            group_id = f"group_{link_hash}"

        memory.append({
            "group_id": group_id,
            "source": art["source"],
            "title": art["title"],
            "link": art["link"],
            "image": art.get("image", ""),
            "summary": art["summary"],
            "category": art["category"],
            "embedding": art_embedding,
            "fetched_at": art["published_at"]
        })

    # ARCHIVÁLÁS
    fresh_memory = []
    archive_updated = False
    existing_archive_links = {a["link"] for a in archive}

    for item in memory:
        if item.get("fetched_at", 0) >= cutoff_24h:
            fresh_memory.append(item)
        else:
            if item["link"] not in existing_archive_links:
                clean_arch_item = {k: v for k, v in item.items() if k != "embedding"}
                archive.append(clean_arch_item)
                existing_archive_links.add(item["link"])
                archive_updated = True

    save_json_file(MEMORY_FILE, fresh_memory)
    if archive_updated:
        save_json_file(ARCHIVE_FILE, archive)

    # CSOPORTOSÍTOTT MEMÓRIA
    grouped_dictionary = {}
    for item in fresh_memory:
        g_id = item["group_id"]
        clean_item = {
            "source": item["source"],
            "title": item["title"],
            "link": item["link"],
            "image": item.get("image", ""),
            "summary": item["summary"],
            "category": item["category"],
            "published_at": item["fetched_at"]
        }
        if g_id not in grouped_dictionary:
            grouped_dictionary[g_id] = {
                "group_id": g_id,
                "category": item["category"],
                "articles_count": 0,
                "articles": []
            }
        grouped_dictionary[g_id]["articles"].append(clean_item)
        grouped_dictionary[g_id]["articles_count"] += 1

    save_json_file(GROUPED_FILE, list(grouped_dictionary.values()))

    # NEWS.JSON FRISSÍTÉS
    os.makedirs("src/data", exist_ok=True)
    existing_news = load_json_file(OUTPUT_FILE)
    news_map = {item["group_id"]: item for item in existing_news if isinstance(item, dict) and "group_id" in item}

    for item in fresh_memory:
        g_id = item.get("group_id")
        pub_time = int(item.get("fetched_at", 0))
        short_id = g_id.replace("group_", "")[:6]

        if g_id in news_map:
            existing_sources = {s.get("link") for s in news_map[g_id].get("sources", [])}
            new_source_link = item.get("link")
            if new_source_link and new_source_link not in existing_sources:
                news_map[g_id].setdefault("sources", []).append({
                    "source": item.get("source"),
                    "title": item.get("title"),
                    "link": item.get("link")
                })
            news_map[g_id]["sources_count"] = len(news_map[g_id]["sources"])

            title_for_slug = news_map[g_id].get("title_hu") or news_map[g_id].get("title_ro")
            if news_map[g_id].get("is_synthesized") and title_for_slug:
                clean_slug = slugify(title_for_slug)
                news_map[g_id]["slug"] = f"{clean_slug}-{short_id}" if clean_slug else g_id
            elif "slug" not in news_map[g_id]:
                clean_slug = slugify(item.get("title", ""))
                news_map[g_id]["slug"] = f"{clean_slug}-{short_id}" if clean_slug else g_id

            if "tags" not in news_map[g_id] or not news_map[g_id]["tags"]:
                cat_tag = slugify(item.get("category", "Általános"))
                news_map[g_id]["tags"] = [cat_tag] if cat_tag else ["hirek"]
        else:
            sources_list = [{"source": item.get("source"), "title": item.get("title"), "link": item.get("link")}]
            clean_slug = slugify(item.get("title", ""))
            cat_tag = slugify(item.get("category", "Általános"))

            news_map[g_id] = {
                "group_id": g_id,
                "slug": f"{clean_slug}-{short_id}" if clean_slug else g_id,
                "tags": [cat_tag] if cat_tag else ["hirek"],
                "category": item.get("category", "Általános"),
                "image": item.get("image", ""),
                "is_synthesized": False,
                "sources_count": 1,
                "sources": sources_list,
                "published_at": pub_time,
                "title_hu": item.get("title", ""),
                "lead_hu": item.get("summary", "")[:200] + "..." if item.get("summary") else "",
                "content_hu": item.get("summary", ""),
                "title_ro": item.get("title", ""),
                "lead_ro": item.get("summary", "")[:200] + "..." if item.get("summary") else "",
                "content_ro": item.get("summary", "")
            }

    valid_news_list = [item for item in news_map.values() if item.get("published_at", 0) >= cutoff_24h]

    for item in valid_news_list:
        item["sources_count"] = len(item.get("sources", []))

    # SÚLYOZÁS ÉS RENDEZÉS
    for item in valid_news_list:
        item["importance_score"] = calculate_importance_score(item)

    valid_news_list.sort(key=lambda x: (x.get("importance_score", 0), x.get("published_at", 0)), reverse=True)

    # KÉZI FELÜLBÍRÁLÁS (MANUAL TOP)
    forced_group_ids = load_manual_top_ids(MANUAL_TOP_FILE)
    if forced_group_ids:
        print(f"📌 Kézzel kiemelt csoportok betöltve ({MANUAL_TOP_FILE}): {forced_group_ids}")

    final_sorted_list = []
    forced_items = []

    for item in valid_news_list:
        if item.get("group_id") in forced_group_ids:
            forced_items.append(item)
        else:
            final_sorted_list.append(item)

    if forced_items:
        forced_items.sort(key=lambda x: forced_group_ids.index(x.get("group_id")) if x.get("group_id") in forced_group_ids else 999)
        final_sorted_list = forced_items + final_sorted_list

    # FORRÁS KIEGYENSÚLYOZÁS (a kézzel kiemelteket nem bontja meg)
    balanced_list = []
    skipped_items = []

    for item in final_sorted_list:
        if item.get("group_id") in forced_group_ids:
            balanced_list.append(item)
            continue

        item_source = item.get("sources", [{}])[0].get("source")
        if (
            len(balanced_list) >= 2 
            and balanced_list[-1].get("sources", [{}])[0].get("source") == item_source
            and balanced_list[-2].get("sources", [{}])[0].get("source") == item_source
        ):
            skipped_items.append(item)
        else:
            balanced_list.append(item)

    final_list = balanced_list + skipped_items

    # 🎯 TOP_RANK SORSZÁM ÉS ÁTLÁTHATÓ GROUP_ID LISTA GENERÁLÁSA
    top_valaszto_lista = []
    current_rank = 1

    for idx, item in enumerate(final_list):
        is_forced = item.get("group_id") in forced_group_ids
        is_multi_source = item.get("sources_count", 1) >= 2
        
        if is_forced or is_multi_source or (idx < 12):
            item["top_rank"] = current_rank
            item["is_top_hero"] = (current_rank == 1)
            item["is_top_list"] = True
            current_rank += 1
        else:
            item["top_rank"] = None
            item["is_top_hero"] = False
            item["is_top_list"] = False

        top_valaszto_lista.append({
            "top_helyezes": item["top_rank"] if item["top_rank"] else "Nincs a Top listán",
            "cim_hu": item.get("title_hu", ""),
            "cim_ro": item.get("title_ro", ""),
            "group_id": item.get("group_id"),
            "forrasok_szama": item.get("sources_count", 1),
            "kategoria": item.get("category", "Általános"),
            "kezileg_kiemelve": is_forced
        })

    save_json_file(TOP_SELECTOR_FILE, top_valaszto_lista)
    save_json_file(OUTPUT_FILE, final_list)
    print(f"⚡ Erdélyi/RO hírfrissítés kész! Megőrizve {len(final_list)} cikk a {OUTPUT_FILE}-ban, és {len(top_valaszto_lista)} ID a {TOP_SELECTOR_FILE}-ban.")

if __name__ == "__main__":
    run_pipeline()
