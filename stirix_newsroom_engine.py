import json
import os
import time

# ==============================================================================
# 1. KONFIGURÁCIÓ ÉS REGISZTEREK
# ==============================================================================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LOCAL_NEWS_FILE = os.path.join(BASE_DIR, "src/data/news.json")
MEMORY_NEWS_FILE = os.path.join(BASE_DIR, "erdelyi_hirek_memoria.json")
ARCHIVE_NEWS_FILE = os.path.join(BASE_DIR, "erdelyi_hirek_archivum.json")

# ==============================================================================
# 2. DASHBOARD ADATGENERÁLÓ ENGINE (Csak a news.json-ből dolgozik)
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

    # 2. SZŰRÉS ÉS CSOPORTOSÍTÁS A FELHASZNÁLÓ ÁLTAL KÉRT FORRÁSOK ALAPJÁN
    multi_source_groups = []
    single_source_articles = []
    seen_group_ids = set()

    for item in local_articles:
        if not isinstance(item, dict):
            continue
        pub_at = item.get("published_at") or item.get("fetched_at", 0)
        
        # Időablak szűrés
        if not isinstance(pub_at, (int, float)) or pub_at < cutoff_time or pub_at > current_time:
            continue

        # Források összegyűjtése, majd szigorú leszűkítés a kijelölt forrásokra
        raw_sources = item.get("sources") if isinstance(item.get("sources"), list) else []
        all_sources = [s for s in raw_sources if isinstance(s, dict) and s.get("source")]
        if not all_sources and item.get("source"):
            all_sources = [{"source": item.get("source"), "title": item.get("title", ""), "link": item.get("link", "")}]
        distinct_sources = [s for s in all_sources if s.get("source") in selected_sources]
        if not distinct_sources:
            continue

        group_id = item.get("group_id", item.get("link", ""))
        if not group_id or group_id in seen_group_ids:
            continue
        seen_group_ids.add(group_id)

        sources_count = len(distinct_sources)
        art_title = item.get("title_hu", item.get("title", ""))
        art_lead = item.get("lead_hu", item.get("summary", "")) or ""
        cover_image = item.get("image", "")

        # A szűrt forrásszám dönti el az oszlopot
        if sources_count > 1:
            multi_source_groups.append({
                "group_id": group_id,
                "is_synthesized": bool(item.get("is_synthesized", False)),
                "sources_count": sources_count,
                "sources": distinct_sources,
                "source": distinct_sources[0].get("source"),
                "title_hu": art_title,
                "lead_hu": art_lead,
                "image": cover_image,
                "published_at": pub_at
            })
        else:
            single_source_articles.append({
                "group_id": group_id,
                "source": distinct_sources[0].get("source"),
                "sources": distinct_sources,
                "sources_count": 1,
                "is_synthesized": bool(item.get("is_synthesized", False)),
                "title_hu": art_title,
                "lead_hu": art_lead,
                "image": cover_image,
                "published_at": pub_at
            })

    # Rendezzük frissesség szerint
    multi_source_groups.sort(key=lambda x: x.get("published_at", 0), reverse=True)
    single_source_articles.sort(key=lambda x: x.get("published_at", 0), reverse=True)

    return {
        "time_window_hours": time_window_hours,
        "selected_sources_count": len(set(selected_sources)),
        "selected_sources": list(dict.fromkeys(selected_sources)),
        "stats": {
            "multi_source_count": len(multi_source_groups),
            "single_source_count": len(single_source_articles)
        },
        "multi_source_news": multi_source_groups,
        "single_source_news": single_source_articles
    }

if __name__ == "__main__":
    # Teszt futtatás a kiválasztott forrásokkal
    test_selected_sources = [
        "Maszol", "Transtelex", "Székelyhon", "Krónika", 
        "AGERPRES (HU)", "Hargita Népe", "Erdon", "Cancan.ro"
    ]
    
    result = get_dashboard_newsroom_data(selected_sources=test_selected_sources, time_window_hours=6)

    print("\n==================================================================")
    print("🎯 STRIX NEWSROOM ENGINE (CSAK NEWS.JSON ALAPÚ) SIKERES")
    print(f"📊 Kijelölt források száma: {result['selected_sources_count']}")
    print(f"🟢 Többforrásos / Párosított hírek (Bal oszlop): {result['stats']['multi_source_count']} db")
    print(f"🟢 Egyforrásos hírek (Jobb oszlop): {result['stats']['single_source_count']} db")
    print("==================================================================")
