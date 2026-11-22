from collections import defaultdict
from typing import Any

from app.services.game_modes import describe_game_mode


LANE_ROLES = {1: "Safe lane", 2: "Mid lane", 3: "Off lane", 4: "Jungle", 0: "Unknown lane"}


def _win(match: dict[str, Any]) -> bool | None:
    radiant_win = match.get("radiant_win")
    player_slot = match.get("player_slot")
    if radiant_win is None or player_slot is None:
        return None
    return bool(radiant_win) == (int(player_slot) < 128)


def _number(match: dict[str, Any], key: str) -> float | None:
    value = match.get(key)
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def summarize(matches: list[dict[str, Any]]) -> dict[str, Any]:
    wins = [result for result in (_win(match) for match in matches) if result is not None]
    kdas = [
        ((_number(match, "kills") or 0) + (_number(match, "assists") or 0))
        / max(_number(match, "deaths") or 0, 1)
        for match in matches
    ]

    def average(key: str) -> float | None:
        values = [value for value in (_number(match, key) for match in matches) if value is not None]
        return round(sum(values) / len(values), 1) if values else None

    return {
        "matches": len(matches),
        "wins": sum(1 for result in wins if result),
        "losses": sum(1 for result in wins if not result),
        "win_rate": round(sum(1 for result in wins if result) / len(wins) * 100, 1) if wins else None,
        "avg_gpm": average("gold_per_min"),
        "avg_xpm": average("xp_per_min"),
        "avg_kda": round(sum(kdas) / len(kdas), 2) if kdas else None,
        "avg_kills": average("kills"),
        "avg_deaths": average("deaths"),
        "avg_assists": average("assists"),
        "avg_hero_damage": average("hero_damage"),
        "avg_last_hits": average("last_hits"),
        "avg_duration": average("duration"),
    }


def build_player_analytics(
    account_id: int,
    profile: dict[str, Any],
    patch: dict[str, Any],
    mode_category: str,
    matches: list[dict[str, Any]],
    heroes: dict[int, dict[str, Any]],
) -> dict[str, Any]:
    ordered = sorted(matches, key=lambda item: int(item.get("start_time") or 0), reverse=True)
    summary = summarize(ordered)
    recent_summary = summarize(ordered[:10])
    previous = ordered[10:20]
    previous_summary = summarize(previous) if previous else None

    role_groups: dict[int, list[dict[str, Any]]] = defaultdict(list)
    hero_groups: dict[int, list[dict[str, Any]]] = defaultdict(list)
    normalized_matches = []

    for match in ordered:
        lane_role = int(match.get("lane_role") or 0)
        hero_id = int(match.get("hero_id") or 0)
        role_groups[lane_role].append(match)
        if hero_id:
            hero_groups[hero_id].append(match)
        mode = describe_game_mode(match.get("game_mode"), match.get("lobby_type"))
        hero = heroes.get(hero_id, {})
        normalized_matches.append({
            "match_id": match.get("match_id"),
            "start_time": match.get("start_time"),
            "duration": match.get("duration"),
            "win": _win(match),
            "hero_id": hero_id or None,
            "hero_name": hero.get("name") or (f"Hero #{hero_id}" if hero_id else "Unknown hero"),
            "hero_image": hero.get("image"),
            "lane_role": lane_role or None,
            "lane_role_name": LANE_ROLES.get(lane_role, "Unknown lane"),
            "game_mode": match.get("game_mode"),
            "lobby_type": match.get("lobby_type"),
            "mode_category": mode["mode_category"],
            "kills": int(match.get("kills") or 0),
            "deaths": int(match.get("deaths") or 0),
            "assists": int(match.get("assists") or 0),
            "gold_per_min": match.get("gold_per_min"),
            "xp_per_min": match.get("xp_per_min"),
            "last_hits": match.get("last_hits"),
            "hero_damage": match.get("hero_damage"),
        })

    role_breakdown = [
        {"lane_role": lane_role or None, "label": LANE_ROLES.get(lane_role, "Unknown lane"), **summarize(group)}
        for lane_role, group in role_groups.items()
    ]
    role_breakdown.sort(key=lambda item: item["matches"], reverse=True)

    hero_breakdown = []
    for hero_id, group in hero_groups.items():
        hero = heroes.get(hero_id, {})
        hero_breakdown.append({
            "hero_id": hero_id,
            "hero_name": hero.get("name") or f"Hero #{hero_id}",
            "hero_image": hero.get("image"),
            **summarize(group),
        })
    hero_breakdown.sort(key=lambda item: item["matches"], reverse=True)

    deltas = None
    if previous_summary and previous_summary["matches"]:
        deltas = {}
        for metric in ("win_rate", "avg_gpm", "avg_xpm", "avg_kda", "avg_deaths"):
            current_value = recent_summary.get(metric)
            previous_value = previous_summary.get(metric)
            deltas[metric] = (
                round(current_value - previous_value, 1)
                if current_value is not None and previous_value is not None
                else None
            )

    insights = []
    if previous_summary and previous_summary["matches"]:
        for metric, threshold, code, severity in (
            ("avg_deaths", 1.0, "deaths_increased", "warning"),
            ("avg_kda", -0.5, "kda_decreased", "warning"),
            ("avg_gpm", -35.0, "gpm_decreased", "info"),
            ("win_rate", -10.0, "win_rate_decreased", "warning"),
        ):
            delta = deltas.get(metric) if deltas else None
            if delta is not None and ((metric == "avg_deaths" and delta >= threshold) or (metric != "avg_deaths" and delta <= threshold)):
                insights.append({"code": code, "severity": severity, "delta": delta})
        if deltas and deltas.get("avg_gpm") is not None and deltas["avg_gpm"] >= 35:
            insights.append({"code": "gpm_improved", "severity": "positive", "delta": deltas["avg_gpm"]})
        if deltas and deltas.get("avg_kda") is not None and deltas["avg_kda"] >= 0.5:
            insights.append({"code": "kda_improved", "severity": "positive", "delta": deltas["avg_kda"]})
    else:
        insights.append({"code": "insufficient_history", "severity": "info", "delta": None})

    count = len(ordered)
    sample_level = "low" if count < 10 else "moderate" if count < 30 else "large"
    profile_data = profile.get("profile") or {}
    return {
        "account_id": account_id,
        "profile": {
            "personaname": profile_data.get("personaname") or profile_data.get("name") or f"Player {account_id}",
            "avatarfull": profile_data.get("avatarfull"),
            "rank_tier": profile.get("rank_tier"),
            "leaderboard_rank": profile.get("leaderboard_rank"),
        },
        "patch": patch,
        "mode_category": mode_category,
        "sample": {"count": count, "level": sample_level},
        "summary": summary,
        "recent_period": recent_summary,
        "previous_period": previous_summary,
        "period_delta": deltas,
        "insights": insights[:4],
        "role_breakdown": role_breakdown,
        "hero_breakdown": hero_breakdown[:8],
        "matches": normalized_matches,
        "trend": list(reversed(normalized_matches)),
    }
