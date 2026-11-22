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
        })
    return sorted(result, key=lambda entry: (entry["win_rate"] or 0, entry["matches"]), reverse=True)


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
        })
    return sorted(result, key=lambda entry: entry["matches"], reverse=True)


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
):
    if hero_id <= 0:
        raise HTTPException(status_code=400, detail="Некорректный ID героя.")

    try:
        heroes, items = await __import__("asyncio").gather(
            opendota.get_hero_stats(),
            opendota.get_items(),
        )
        hero = next((entry for entry in heroes if int(entry.get("id") or 0) == hero_id), None)
        if hero is None:
            raise HTTPException(status_code=404, detail="Герой не найден.")

        matchups = await opendota.get_hero_matchups(hero_id)
        matchup_by_hero = {int(row.get("hero_id") or 0): row for row in matchups}
        selected_matchups = []
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
                })

        build = {}
        abilities = []
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
                abilities = stats.get("abilities") or []
                talents = stats.get("talents") or []
                data_source = "stratz+opendota"
            except StratzError:
                pass

        if not build:
            popularity = await opendota.get_hero_item_popularity(hero_id)
            build = {
                "starting": normalize_opendota_items(popularity.get("start_game_items"), items),
                "early": normalize_opendota_items(popularity.get("early_game_items"), items),
                "mid": normalize_opendota_items(popularity.get("mid_game_items"), items),
                "late": normalize_opendota_items(popularity.get("late_game_items"), items),
            }

        return {
            "hero": {
                "id": hero_id,
                "name": hero.get("localized_name") or hero.get("name"),
                "image": hero.get("img"),
            },
            "build": build,
            "abilities": abilities,
            "talents": talents,
            "enemy_matchups": selected_matchups,
            "data_source": data_source,
        }
    except HTTPException:
        raise
    except OpenDotaError as error:
        raise HTTPException(status_code=error.status_code, detail=error.message)
