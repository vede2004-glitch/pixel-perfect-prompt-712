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
# 1. KONFIGURÁCIÓ ÉS TELJES RSS FORRÁSLISTA
# ==============================================================================
LOCAL_NEWS_FILE = "src/data/news.json"
ARCHIVE_NEWS_FILE = "src/data/news_archive.json"

RSS_FEEDS = {
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

    "Cancan.ro": "https://www.cancan.ro/feed",

    "PresaSM (Szatmár)": "https://www.presasm.ro/feed/",

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
    return hashlib.md5(text.encode("utf-8")).hexdigest()

def fetch_single_rss(source_name: str, rss_url: str) -> list:
    """Valós idejű RSS lekérés egy adott forráshoz."""
    fetched_articles = []
    try:
        feed = feedparser.parse(rss_url)
        for entry in feed.entries[:10]:
            pub_time = int(time.mktime(entry.published_parsed)) if hasattr(entry, "published_parsed") and entry.published_parsed else int(time.time())
            
            image_url = "https://via.placeholder.com/600x400?text=" + source_name
            if "media_content" in entry:
                image_url = entry.media_content[0]["url"]
            elif "enclosures" in entry and len(entry.enclosures) > 0:
                image_url = entry.enclosures[0]["href"]

            summary = BeautifulSoup(getattr(entry, "summary", ""), "html.parser").get_text().strip()

            fetched_articles.append({
                "title": entry.title.strip(),
                "link": entry.link.strip(),
                "source": source_name,
                "summary": summary,
                "published_at": pub_time,
                "image": image_url
            })
    except Exception as e:
        print(f"⚠️ Hiba az RSS lekérésekor ({source_name}): {e}")
    return fetched_articles

def fetch_live_rss_data(selected_sources: list) -> list:
    """Párhuzamos RSS lekérés a kijelölt forrásokból."""
    print(f"📡 Élő RSS lekérés indítása {len(selected_sources)} forrásból...")
    all_live_articles = []
    
    with ThreadPoolExecutor(max_workers=min(len(selected_sources) or 1, 15)) as executor:
        futures = [
            executor.submit(fetch_single_rss, source, RSS_FEEDS[source])
            for source in selected_sources if source in RSS_FEEDS
        ]
        for future in futures:
            all_live_articles.extend(future.result())
            
    print(f"✅ Összesen {len(all_live_articles)} friss cikk érkezett az élő RSS-ből.")
    return all_live_articles

# ==============================================================================
# 3. FŐ STRIX NEWSROOM ENGINE
# ==============================================================================
def get_dashboard_newsroom_data(selected_sources: list, time_window_hours: int = 6) -> dict:
    current_time = int(time.time())
    cutoff_time = current_time - (time_window_hours * 3600)

    # 1. HELYI ADATOK BEOLVASÁSA A RENDES OLDALRÓL
    local_articles = []
    for file_path in [LOCAL_NEWS_FILE, ARCHIVE_NEWS_FILE]:
        if os.path.exists(file_path):
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    local_articles.extend(data)
            except Exception as e:
                print(f"⚠️ Hiba a {file_path} beolvasásakor: {e}")

    # 2. ÉLŐ RSS LEKÉRÉS FUTTATÁSA
    live_rss_articles = fetch_live_rss_data(selected_sources)

    # 3. ADATOK SZŰRÉSE ÉS ÖSSZEFŰZÉSE
    combined_raw_list = []
    seen_links = set()

    for item in local_articles:
        if item.get("published_at", 0) >= cutoff_time:
            item_sources = [s.get("source") for s in item.get("sources", [])]
            if any(src in selected_sources for src in item_sources) or item.get("source") in selected_sources:
                combined_raw_list.append(item)
                for src in item.get("sources", []):
                    seen_links.add(src.get("link"))

    for rss_art in live_rss_articles:
        if rss_art["published_at"] >= cutoff_time and rss_art["link"] not in seen_links:
            combined_raw_list.append(rss_art)
            seen_links.add(rss_art["link"])

    # 4. TÉMACSOPORTOSÍTÁS ÉS RÖVID LEÍRÁS SZELEKCIÓ
    multi_source_groups = []
    single_source_articles = []
    processed_ids = set()

    for i, art in enumerate(combined_raw_list):
        art_id = art.get("group_id", generate_hash(art.get("link", str(i))))
        if art_id in processed_ids:
            continue

        # A) Már szintetizált többforrásos cikk a rendes oldalról:
        if art.get("is_synthesized") and art.get("sources_count", 1) > 1:
            multi_source_groups.append({
                "group_id": art_id,
                "is_synthesized": True,
                "sources_count": art.get("sources_count", len(art.get("sources", []))),
                "sources": art.get("sources", []),
                "title_hu": art.get("title_hu", ""),
                "lead_hu": art.get("lead_hu", ""),  # A rendes oldalról leszedett rövid leírás
                "lead_ro": art.get("lead_ro", ""),
                "image": art.get("image"),
                "published_at": art.get("published_at")
            })
            processed_ids.add(art_id)
            continue

        # B) Dinamikus csoportosítás az élő hírekből:
        cluster = [art]
        art_title = art.get("title_hu", art.get("title", ""))

        for j, candidate in enumerate(combined_raw_list[i+1:], start=i+1):
            cand_id = candidate.get("group_id", generate_hash(candidate.get("link", str(j))))
            if cand_id in processed_ids:
                continue

            cand_title = candidate.get("title_hu", candidate.get("title", ""))
            
            if calculate_similarity(art_title, cand_title) > 0.60:
                cluster.append(candidate)
                processed_ids.add(cand_id)

        processed_ids.add(art_id)

        unique_sources_in_cluster = list(set([c.get("source", c.get("sources", [{}])[0].get("source")) for c in cluster if c]))

        if len(unique_sources_in_cluster) > 1:
            extracted_lead = art.get("lead_hu", "") or art.get("summary", "")[:250] + "…"
            
            multi_source_groups.append({
                "group_id": art_id,
                "is_synthesized": False,
                "sources_count": len(unique_sources_in_cluster),
                "sources": [{"source": src} for src in unique_sources_in_cluster],
                "title_hu": art_title,
                "lead_hu": extracted_lead,  # A rendes oldalról leszedett rövid leírás
                "image": art.get("image"),
                "published_at": art.get("published_at")
            })
        else:
            single_source_articles.append({
                "group_id": art_id,
                "source": unique_sources_in_cluster[0] if unique_sources_in_cluster else "Ismeretlen",
                "title_hu": art_title,
                "lead_hu": art.get("lead_hu", art.get("summary", "")[:200]),
                "image": art.get("image"),
                "published_at": art.get("published_at")
            })

    return {
        "time_window_hours": time_window_hours,
        "selected_sources": selected_sources,
        "stats": {
            "multi_source_count": len(multi_source_groups),
            "single_source_count": len(single_source_articles)
        },
        "multi_source_news": multi_source_groups,
        "single_source_news": single_source_articles
    }

if __name__ == "__main__":
    all_sources = list(RSS_FEEDS.keys())
    result = get_dashboard_newsroom_data(selected_sources=all_sources, time_window_hours=6)

    print("\n==================================================================")
    print("🎯 STRIX NEWSROOM ENGINE LEKÉRDEZÉS SIKERES")
    print(f"📊 Összes kezelt RSS csatorna: {len(RSS_FEEDS)}")
    print(f"📊 Többforrásos hírek száma: {result['stats']['multi_source_count']}")
    print(f"📊 Egyforrásos hírek száma: {result['stats']['single_source_count']}")
    print("==================================================================")