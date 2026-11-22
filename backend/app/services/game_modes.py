from typing import Any

GAME_MODES = {
    0: "Unknown", 1: "All Pick", 2: "Captains Mode", 3: "Random Draft",
    4: "Single Draft", 5: "All Random", 6: "Intro", 7: "Diretide",
    8: "Reverse Captains Mode", 9: "Greeviling", 10: "Tutorial",
    11: "Mid Only", 12: "Least Played", 13: "New Player Pool",
    14: "Compendium Matchmaking", 15: "Custom", 16: "Captains Draft",
    17: "Balanced Draft", 18: "Ability Draft", 19: "Event",
    20: "All Random Deathmatch", 21: "1v1 Mid", 22: "All Draft",
    23: "Turbo", 24: "Mutation", 25: "Coach's Challenge",
}

LOBBY_TYPES = {
    0: "Normal", 1: "Practice", 2: "Tournament", 3: "Tutorial",
    4: "Co-op Bots", 5: "Ranked Team MM", 6: "Ranked Solo MM",
    7: "Ranked", 8: "1v1 Mid", 9: "Battle Cup",
}


def describe_game_mode(game_mode: int | None, lobby_type: int | None) -> dict[str, Any]:
    mode = int(game_mode) if game_mode is not None else None
    lobby = int(lobby_type) if lobby_type is not None else None

    if mode == 23:
        category = "turbo"
    elif lobby in {5, 6, 7}:
        category = "ranked"
    elif lobby in {1, 2, 3, 4, 8, 9} or mode in {10, 15, 19, 24, 25}:
        category = "other"
    elif lobby == 0:
        category = "unranked"
    else:
        category = "unknown"

    return {
        "game_mode_name": GAME_MODES.get(mode, f"Game mode #{mode}" if mode is not None else None),
        "lobby_type_name": LOBBY_TYPES.get(lobby, f"Lobby #{lobby}" if lobby is not None else None),
        "mode_category": category,
    }
