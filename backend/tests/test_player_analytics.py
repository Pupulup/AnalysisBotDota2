import unittest

from app.services.player_analytics import build_player_analytics, summarize


class PlayerAnalyticsTests(unittest.TestCase):
    def setUp(self):
        self.matches = [
            {
                "match_id": 1, "start_time": 300, "duration": 2400,
                "radiant_win": True, "player_slot": 0, "game_mode": 1,
                "lobby_type": 7, "lane_role": 2, "hero_id": 1,
                "kills": 8, "deaths": 2, "assists": 10,
                "gold_per_min": 600, "xp_per_min": 700,
                "last_hits": 250, "hero_damage": 25000,
            },
            {
                "match_id": 2, "start_time": 200, "duration": 2200,
                "radiant_win": False, "player_slot": 128, "game_mode": 1,
                "lobby_type": 7, "lane_role": 2, "hero_id": 1,
                "kills": 4, "deaths": 5, "assists": 8,
                "gold_per_min": 500, "xp_per_min": 600,
                "last_hits": 180, "hero_damage": 18000,
            },
        ]

    def test_summary_calculates_win_rate_and_averages(self):
        result = summarize(self.matches)
        self.assertEqual(result["matches"], 2)
        self.assertEqual(result["wins"], 1)
        self.assertEqual(result["win_rate"], 50.0)
        self.assertEqual(result["avg_gpm"], 550.0)

    def test_profile_is_patch_and_mode_scoped(self):
        result = build_player_analytics(
            123, {"profile": {"personaname": "Test"}},
            {"id": 99, "name": "7.xx", "date": "2026-01-01"},
            "ranked", self.matches, {1: {"name": "Anti-Mage"}},
        )
        self.assertEqual(result["patch"]["id"], 99)
        self.assertEqual(result["mode_category"], "ranked")
        self.assertEqual(result["sample"]["count"], 2)
        self.assertEqual(result["hero_breakdown"][0]["hero_name"], "Anti-Mage")

    def test_sample_level_is_conservative(self):
        result = build_player_analytics(
            123, {"profile": {}}, {"id": 1, "name": "7.xx", "date": "2026-01-01"},
            "ranked", self.matches, {},
        )
        self.assertEqual(result["sample"]["level"], "low")
