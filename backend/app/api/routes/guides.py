import asyncio

from fastapi import APIRouter, HTTPException, Query

from app.services.opendota import OpenDotaClient, OpenDotaError
from app.services.stratz import StratzClient, StratzError


router = APIRouter(prefix="/api/guides", tags=["Hero Guides"])
opendota = OpenDotaClient()
stratz = StratzClient()


def normalize_stratz_items(rows: list[dict] | None, items: dict) -> list[dict]:
    result = []
    for row in rows or []:
        item_id = row.get("itemId")
        if item_id is None:
            continue
        item = items.get(int(item_id), {})
        matches = int(row.get("matchCount") or 0)
        wins = int(row.get("winCount") or 0)
        result.append({
            "item_id": int(item_id),
            "name": item.get("name") or f"Item #{item_id}",
            "key": item.get("key"),
            "matches": matches,
            "wins": wins,
            "win_rate": (wins / matches * 100) if matches else None,
            "adjusted_win_rate": ((wins + 50) / (matches + 100) * 100) if matches else None,
        })
    return sorted(result, key=lambda entry: (entry["adjusted_win_rate"] or 0, entry["matches"]), reverse=True)


def normalize_opendota_items(values: dict | None, items: dict) -> list[dict]:
    result = []
    for raw_id, count in (values or {}).items():
        try:
            item_id = int(raw_id)
            matches = int(count or 0)
        except (TypeError, ValueError):
            continue
        item = items.get(item_id, {})
        result.append({
            "item_id": item_id,
            "name": item.get("name") or f"Item #{item_id}",
            "key": item.get("key"),
            "matches": matches,
            "wins": None,
            "win_rate": None,
            "adjusted_win_rate": None,
        })
    return sorted(result, key=lambda entry: entry["matches"], reverse=True)


def normalize_ability_rows(rows: list[dict] | None, ability_ids: dict, abilities: dict) -> list[dict]:
    result = []
    for row in rows or []:
        ability_id = int(row.get("abilityId") or 0)
        ability_key = ability_ids.get(str(ability_id)) or ability_ids.get(ability_id)
        ability = abilities.get(ability_key, {}) if ability_key else {}
        matches = int(row.get("matchCount") or 0)
        wins = int(row.get("winCount") or 0)
        result.append({
            "ability_id": ability_id,
            "name": ability.get("dname") or ability_key or f"Ability #{ability_id}",
            "level": row.get("level"),
            "time": row.get("time"),
            "time_average": row.get("timeAverage"),
            "matches": matches,
            "wins": wins,
            "win_rate": (wins / matches * 100) if matches else None,
        })
    return sorted(result, key=lambda entry: (entry["level"] or 99, -entry["matches"]))




@router.get("/heroes")
async def get_guide_heroes():
    try:
        heroes = await opendota.get_hero_stats()
        return [
            {
                "id": hero.get("id"),
                "name": hero.get("localized_name") or hero.get("name") or f"Hero {hero.get('id')}",
                "image": hero.get("img"),
            }
            for hero in heroes if hero.get("id")
        ]
    except OpenDotaError as error:
        raise HTTPException(status_code=error.status_code, detail=error.message)


@router.get("/{hero_id}")
async def get_hero_guide(
    hero_id: int,
    enemy_hero_ids: list[int] = Query(default=[]),
    ally_hero_ids: list[int] = Query(default=[]),
):
    if hero_id <= 0:
        raise HTTPException(status_code=400, detail="Некорректный ID героя.")

    try:
        heroes, items = await asyncio.gather(
            opendota.get_hero_stats(),
            opendota.get_items(),
        )
        try:
            ability_ids, ability_constants = await asyncio.gather(
                opendota.get_ability_ids(),
                opendota.get_abilities(),
            )
        except OpenDotaError:
            ability_ids, ability_constants = {}, {}
        hero = next((entry for entry in heroes if int(entry.get("id") or 0) == hero_id), None)
        if hero is None:
            raise HTTPException(status_code=404, detail="Герой не найден.")

        selected_matchups = []
        ally_synergies = []
        matchup_data_available = False

        build = {}
        first_points = []
        max_levels = []
        talents = []
        data_source = "opendota"
        if stratz.enabled:
            try:
                stratz_data = await stratz.get_hero_guide(hero_id)
                stats = stratz_data.get("heroStats") or {}
                build = {
                    "starting": normalize_stratz_items(stats.get("startingItems"), items),
                    "early": normalize_stratz_items(stats.get("earlyItems"), items),
                    "mid": normalize_stratz_items(stats.get("midItems"), items),
                    "late": normalize_stratz_items(stats.get("lateItems"), items),
                }
                first_points = normalize_ability_rows(stats.get("firstPoints"), ability_ids, ability_constants)
                max_levels = normalize_ability_rows(stats.get("maxLevels"), ability_ids, ability_constants)
                talents = normalize_ability_rows(stats.get("talents"), ability_ids, ability_constants)

                matchup = stats.get("heroVsHeroMatchup") or {}
                advantages = matchup.get("advantage") or []
                hero_advantage = next(
                    (entry for entry in advantages if int(entry.get("heroId") or 0) == hero_id),
                    advantages[0] if advantages else {},
                )
                with_rows = {
                    int(entry.get("heroId2") or 0): entry
                    for entry in hero_advantage.get("with") or []
                }
                vs_rows = {
                    int(entry.get("heroId2") or 0): entry
                    for entry in hero_advantage.get("vs") or []
                }

                for ally_id in ally_hero_ids:
                    row = with_rows.get(ally_id)
                    if row:
                        games = int(row.get("matchCount") or 0)
                        wins = int(row.get("winCount") or 0)
                        ally_synergies.append({
                            "hero_id": ally_id,
                            "games": games,
                            "wins": wins,
                            "win_rate": (wins / games * 100) if games else None,
                            "edge": row.get("synergy"),
                        })

                for enemy_id in enemy_hero_ids:
                    row = vs_rows.get(enemy_id)
                    if row:
                        games = int(row.get("matchCount") or 0)
                        wins = int(row.get("winCount") or 0)
                        selected_matchups.append({
                            "hero_id": enemy_id,
                            "games": games,
                            "wins": wins,
                            "win_rate": (wins / games * 100) if games else None,
                            "edge": row.get("synergy"),
                        })
                matchup_data_available = bool(with_rows or vs_rows)
                data_source = "stratz+opendota"
            except StratzError:
                pass

        if enemy_hero_ids and not selected_matchups:
            try:
                opendota_matchups = await opendota.get_hero_matchups(hero_id)
                matchup_by_hero = {int(row.get("hero_id") or 0): row for row in opendota_matchups}
                for enemy_id in enemy_hero_ids:
                    row = matchup_by_hero.get(enemy_id)
                    if row:
                        games = int(row.get("games_played") or 0)
                        wins = int(row.get("wins") or 0)
                        selected_matchups.append({
                            "hero_id": enemy_id,
                            "games": games,
                            "wins": wins,
                            "win_rate": (wins / games * 100) if games else None,
                            "edge": None,
                        })
            except OpenDotaError:
                pass

        popularity = await opendota.get_hero_item_popularity(hero_id)
        fallback_build = {
            "starting": normalize_opendota_items(popularity.get("start_game_items"), items),
            "early": normalize_opendota_items(popularity.get("early_game_items"), items),
            "mid": normalize_opendota_items(popularity.get("mid_game_items"), items),
            "late": normalize_opendota_items(popularity.get("late_game_items"), items),
        }
        build = {
            phase: build.get(phase) or fallback_build[phase]
            for phase in ("starting", "early", "mid", "late")
        }
        if data_source == "stratz+opendota" and any(
            not build.get(phase) and fallback_build.get(phase)
            for phase in ("starting", "early", "mid", "late")
        ):
            data_source = "stratz+opendota"

        return {
            "hero": {
                "id": hero_id,
                "name": hero.get("localized_name") or hero.get("name"),
                "image": hero.get("img"),
            },
            "build": build,
            "first_points": first_points,
            "max_levels": max_levels,
            "talents": talents,
            "enemy_matchups": selected_matchups,
            "ally_synergies": ally_synergies,
            "matchup_data_available": matchup_data_available,
            "data_source": data_source,
        }
    except HTTPException:
        raise
    except OpenDotaError as error:
        raise HTTPException(status_code=error.status_code, detail=error.message)
