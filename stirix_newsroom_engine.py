import json
import os
import time
import requests
import hashlib
import feedparser
from bs4 import BeautifulSoup
from difflib import SequenceMatcher
from concurrent.futures import ThreadPoolExecutor

# ==============================================================================
# 1. KONFIGURÁCIÓ ÉS REGISZTEREK
# ==============================================================================
LOCAL_NEWS_FILE = "src/data/news.json"
MEMORY_NEWS_FILE = "erdelyi_hirek_memoria.json"
ARCHIVE_NEWS_FILE = "erdelyi_hirek_archivum.json"

# A) ALAPÉRTELMEZETT RSS CSATORNÁK (A főoldal és a Dashboard közös forrásai)
STANDARD_RSS_FEEDS = {
    "Maszol": "https://maszol.ro/rss",
    "Maszol Sport": "https://maszol.ro/sport/rss",
    "Maszol Gazdaság": "https://maszol.ro/gazdasag/rss",
    "Maszol Életmód": "https://maszol.ro/eletmod/rss",
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
    "Economedia": "https://economedia.ro/feed",
    "Ziarul Financiar": "https://www.zf.ro/rss",
    "Go4IT": "https://www.go4it.ro/feed/",
    "Zonait.ro": "https://zonait.ro/feed/",
    "Digi24": "https://www.digi24.ro/rss",
    "G4Media": "https://www.g4media.ro/feed",
    "HotNews.ro": "https://www.hotnews.ro/rss",
    "Adevărul": "https://adevarul.ro/rss/",
    "Mediafax": "https://www.mediafax.ro/rss/",
    "ProTV Stiri": "https://stirileprotv.ro/rss",
    "Ebihoreanul (Nagyvárad/Bihar)": "https://www.ebihoreanul.ro/rss"
}

# B) EXTRA B2B RSS CSATORNÁK (Csak a Dashboardon jelennek meg, ha az ügyfél kéri!)
EXTRA_B2B_FEEDS = {
    
}

# Egyesített szótár a lekérésekhez
ALL_AVAILABLE_FEEDS = {**STANDARD_RSS_FEEDS, **EXTRA_B2B_FEEDS}

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

# ==============================================================================
# 2. SEGÉDFUNKCIÓK
# ==============================================================================
def calculate_similarity(text1: str, text2: str) -> float:
    if not text1 or not text2:
        return 0.0
    return SequenceMatcher(None, text1, text2).ratio()

def generate_hash(text: str) -> str:
    return hashlib.md5(text.encode("utf-8")).hexdigest()[:10]

def fetch_single_rss(source_name: str, rss_url: str) -> list:
    """Valós idejű RSS lekérés a specifikus forráshoz."""
    fetched_articles = []
    try:
        response = requests.get(rss_url, headers=HEADERS, timeout=8)
        feed = feedparser.parse(response.content)
        
        for entry in feed.entries[:10]:
            pub_time = int(time.mktime(entry.published_parsed)) if hasattr(entry, "published_parsed") and entry.published_parsed else int(time.time())
            
            image_url = ""
            if "media_content" in entry and len(entry.media_content) > 0:
                image_url = entry.media_content[0].get("url", "")
            elif "enclosures" in entry and len(entry.enclosures) > 0:
                image_url = entry.enclosures[0].get("href", "")

            summary = BeautifulSoup(getattr(entry, "summary", getattr(entry, "description", "")), "html.parser").get_text().strip()

            fetched_articles.append({
                "group_id": f"live_{generate_hash(entry.link)}",
                "title": entry.title.strip(),
                "title_hu": entry.title.strip(),
                "link": entry.link.strip(),
                "source": source_name,
                "summary": summary,
                "lead_hu": (summary[:180] + "…") if len(summary) > 180 else summary,
                "published_at": pub_time,
                "image": image_url,
                "is_extra_source": source_name in EXTRA_B2B_FEEDS
            })
    except Exception as e:
        print(f"⚠️ Hiba az RSS lekérésekor ({source_name}): {e}")
    return fetched_articles

def fetch_live_rss_data(selected_sources: list) -> list:
    """Párhuzamosan lekéri az élő RSS adatokat a kijelölt csatornákból."""
    # Csak azokat futtatjuk le élőben, amik szerepelnek a kijelöltek között
    active_targets = [src for src in selected_sources if src in ALL_AVAILABLE_FEEDS]
    if not active_targets:
        return []

    print(f"📡 Élő RSS lekérés indítása {len(active_targets)} forrásból...")
    all_live_articles = []
    
    with ThreadPoolExecutor(max_workers=min(len(active_targets), 15)) as executor:
        futures = [
            executor.submit(fetch_single_rss, source, ALL_AVAILABLE_FEEDS[source])
            for source in active_targets
        ]
        for future in futures:
            all_live_articles.extend(future.result())
            
    print(f"✅ Összesen {len(all_live_articles)} élő cikk beérkezett.")
    return all_live_articles

# ==============================================================================
# 3. DASHBOARD ADATGENERÁLÓ ENGINE
# ==============================================================================
def get_dashboard_newsroom_data(selected_sources: list, time_window_hours: int = 6) -> dict:
    current_time = int(time.time())
    cutoff_time = current_time - (time_window_hours * 3600)

    # 1. MEGLÉVŐ LOKÁLIS ADATOK BEOLVASÁSA (news.json, memoria.json, archivum.json)
    local_articles = []
    for file_path in [LOCAL_NEWS_FILE, MEMORY_NEWS_FILE, ARCHIVE_NEWS_FILE]:
        if os.path.exists(file_path):
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, list):
                        local_articles.extend(data)
            except Exception as e:
                print(f"⚠️ Hiba a {file_path} beolvasásakor: {e}")

    # 2. ÉLŐ RSS LEKÉRÉS FUTTATÁSA A KIJELÖLT FORRÁSOKRA
    live_rss_articles = fetch_live_rss_data(selected_sources)

    # 3. ÖSSZEFÉSÜLÉS ÉS DUPLESZŰRÉS
    combined_raw_list = []
    seen_links = set()

    # A) Meglévő helyi fájlok szűrése
    for item in local_articles:
        pub_at = item.get("published_at", item.get("fetched_at", 0))
        if pub_at >= cutoff_time:
            # Megnézzük, hogy a cikk forrása benne van-e a kiválasztottakban
            item_sources = [s.get("source") for s in item.get("sources", [])] if item.get("sources") else [item.get("source")]
            if any(src in selected_sources for src in item_sources):
                link = item.get("link") or (item.get("sources", [{}])[0].get("link") if item.get("sources") else "")
                if link and link not in seen_links:
                    combined_raw_list.append(item)
                    seen_links.add(link)

    # B) Élő RSS cikkek hozzáadása (ha még nem szerepelnek)
    for rss_art in live_rss_articles:
        if rss_art["published_at"] >= cutoff_time and rss_art["link"] not in seen_links:
            combined_raw_list.append(rss_art)
            seen_links.add(rss_art["link"])

    # 4. TÉMACSOPORTOSÍTÁS A B2B DIZÁJNHOSZ (Többforrásos vs. Egyforrásos)
    multi_source_groups = []
    single_source_articles = []
    processed_ids = set()

    for i, art in enumerate(combined_raw_list):
        art_id = art.get("group_id", generate_hash(art.get("link", str(i))))
        if art_id in processed_ids:
            continue

        art_title = art.get("title_hu", art.get("title", ""))
        art_lead = art.get("lead_hu", art.get("summary", ""))

        # Cikkcsoport építése hasonlóság alapján
        cluster = [art]
        for j, candidate in enumerate(combined_raw_list[i+1:], start=i+1):
            cand_id = candidate.get("group_id", generate_hash(candidate.get("link", str(j))))
            if cand_id in processed_ids:
                continue

            cand_title = candidate.get("title_hu", candidate.get("title", ""))
            
            # Ha a címek hasonlósága > 60%, egy csoportba tesszük őket
            if calculate_similarity(art_title, cand_title) > 0.60:
                cluster.append(candidate)
                processed_ids.add(cand_id)

        processed_ids.add(art_id)

        # Források kigyűjtése a csoportból
        sources_list = []
        for c in cluster:
            if c.get("sources"):
                sources_list.extend(c.get("sources"))
            elif c.get("source"):
                sources_list.append({"source": c.get("source"), "title": c.get("title", ""), "link": c.get("link", "")})

        # Egyedi források kiszűrése
        unique_sources = {}
        for s in sources_list:
            src_name = s.get("source")
            if src_name and src_name not in unique_sources:
                unique_sources[src_name] = s

        distinct_sources = list(unique_sources.values())
        sources_count = len(distinct_sources)

        # Kép kiválasztása
        cover_image = art.get("image") or next((c.get("image") for c in cluster if c.get("image")), "")

        # A) TÖBBFORRÁSOS HÍREK (Bal oldali oszlop a dizájnban)
        if sources_count > 1:
            multi_source_groups.append({
                "group_id": art_id,
                "is_synthesized": art.get("is_synthesized", False),
                "sources_count": sources_count,
                "sources": distinct_sources,
                "title_hu": art_title,
                "lead_hu": (art_lead[:220] + "…") if len(art_lead) > 220 else art_lead,
                "image": cover_image,
                "published_at": art.get("published_at", int(time.time()))
            })
        # B) EGYFORRÁSOS HÍREK (Jobb oldali oszlop a dizájnban)
        else:
            main_source = distinct_sources[0].get("source") if distinct_sources else "Hírforrás"
            single_source_articles.append({
                "group_id": art_id,
                "source": main_source,
                "title_hu": art_title,
                "lead_hu": (art_lead[:180] + "…") if len(art_lead) > 180 else art_lead,
                "image": cover_image,
                "published_at": art.get("published_at", int(time.time()))
            })

    # Rendezzük frissesség szerint
    multi_source_groups.sort(key=lambda x: x.get("published_at", 0), reverse=True)
    single_source_articles.sort(key=lambda x: x.get("published_at", 0), reverse=True)

    return {
        "time_window_hours": time_window_hours,
        "selected_sources_count": len(selected_sources),
        "stats": {
            "multi_source_count": len(multi_source_groups),
            "single_source_count": len(single_source_articles)
        },
        "multi_source_news": multi_source_groups,
        "single_source_news": single_source_articles
    }

if __name__ == "__main__":
    # Teszt futtatás a felületen kiválasztott forrásokkal (beleértve az extra B2B forrásokat is)
    test_selected_sources = [
        "Maszol", "Transtelex", "Székelyhon", "Krónika", 
        "AGERPRES (HU)", "Hargita Népe", "Erdon", "Cancan.ro"
    ]
    
    result = get_dashboard_newsroom_data(selected_sources=test_selected_sources, time_window_hours=6)

    print("\n==================================================================")
    print("🎯 STRIX NEWSROOM ENGINE B2B LEKÉRDEZÉS SIKERES")
    print(f"📊 Kijelölt források száma: {result['selected_sources_count']}")
    print(f"🟢 Többforrásos hírek (Bal oszlop): {result['stats']['multi_source_count']} db")
    print(f"🟢 Egyforrásos hírek (Jobb oszlop): {result['stats']['single_source_count']} db")
    print("==================================================================")
