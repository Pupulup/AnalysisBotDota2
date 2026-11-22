import unittest

from app.services.game_modes import describe_game_mode


class GameModeClassificationTests(unittest.TestCase):
    def test_turbo_is_classified_independently_of_lobby(self):
        self.assertEqual(describe_game_mode(23, 0)["mode_category"], "turbo")

    def test_ranked_lobby_is_classified_as_ranked(self):
        self.assertEqual(describe_game_mode(1, 7)["mode_category"], "ranked")
        self.assertEqual(describe_game_mode(1, 5)["mode_category"], "ranked")
        self.assertEqual(describe_game_mode(1, 6)["mode_category"], "ranked")

    def test_normal_lobby_is_unranked(self):
        self.assertEqual(describe_game_mode(1, 0)["mode_category"], "unranked")

    def test_bot_and_custom_lobbies_are_other(self):
        self.assertEqual(describe_game_mode(1, 4)["mode_category"], "other")
        self.assertEqual(describe_game_mode(15, 0)["mode_category"], "other")

    def test_missing_metadata_is_unknown(self):
        result = describe_game_mode(None, None)
        self.assertEqual(result["mode_category"], "unknown")
        self.assertIsNone(result["game_mode_name"])
