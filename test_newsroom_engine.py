import unittest
from unittest.mock import patch
import stirix_newsroom_engine as engine


class NewsroomRules(unittest.TestCase):
    def run_engine(self, rows, sources, hours=6):
        with patch.object(engine.time, "time", return_value=2_000_000_000), patch.object(engine.os.path, "exists", return_value=True), patch("builtins.open"), patch.object(engine.json, "load", side_effect=[rows, [], []]):
            return engine.get_dashboard_newsroom_data(sources, hours)

    def test_selected_sources_and_columns(self):
        result = self.run_engine([
            {"group_id": "pair", "published_at": 1_999_999_000, "sources": [{"source": "Maszol"}, {"source": "Transtelex"}]},
            {"group_id": "single", "published_at": 1_999_999_500, "source": "Maszol"},
            {"group_id": "other", "published_at": 1_999_999_500, "source": "Digi24"},
        ], ["Maszol"])
        self.assertEqual(result["multi_source_news"], [])
        self.assertEqual([n["group_id"] for n in result["single_source_news"]], ["single", "pair"])
        self.assertEqual([s["source"] for s in result["single_source_news"][1]["sources"]], ["Maszol"])

    def test_pair_stays_multi_when_both_selected(self):
        result = self.run_engine([
            {"group_id": "trio", "published_at": 1_999_999_000, "sources": [{"source": "Maszol"}, {"source": "Transtelex"}, {"source": "Digi24"}]},
        ], ["Maszol", "Transtelex"])
        self.assertEqual([s["source"] for s in result["multi_source_news"][0]["sources"]], ["Maszol", "Transtelex"])

    def test_six_hour_window(self):
        result = self.run_engine([
            {"group_id": "edge", "published_at": 2_000_000_000 - 6 * 3600, "source": "Maszol"},
            {"group_id": "old", "published_at": 2_000_000_000 - 6 * 3600 - 1, "source": "Maszol"},
        ], ["Maszol"])
        self.assertEqual([n["group_id"] for n in result["single_source_news"]], ["edge"])

    def test_empty_source_selection(self):
        result = self.run_engine([{"group_id": "one", "published_at": 1_999_999_000, "source": "Maszol"}], [])
        self.assertEqual(result["stats"], {"multi_source_count": 0, "single_source_count": 0})


if __name__ == "__main__":
    unittest.main()