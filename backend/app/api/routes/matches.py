from fastapi import APIRouter, HTTPException, Path

from app.services.opendota import OpenDotaClient, OpenDotaError
from app.schemas.match import MatchResponse


router = APIRouter(prefix="/api/matches", tags=["Matches"])
opendota = OpenDotaClient()


@router.get("/{match_id}", response_model=MatchResponse)
async def get_match(
    match_id: int = Path(..., gt=0, description="Dota 2 Match ID")
):
    try:
        data = await opendota.get_match(match_id)
        raw_players = data.get("players") or []

        try:
            heroes = await opendota.get_heroes()
        except OpenDotaError:
            heroes = {}

        try:
            items = await opendota.get_items()
        except OpenDotaError:
            items = {}

        players = []
        for player in raw_players:
            player_data = dict(player)
            hero_id = player_data.get("hero_id")
            hero = heroes.get(hero_id, {})

            player_data["hero_name"] = hero.get("name", "Unknown Hero")
            player_data["hero_image"] = hero.get("image")

            inventory = []
            for slot in ("item_0", "item_1", "item_2", "item_3", "item_4", "item_5", "item_neutral"):
                item_id = player_data.get(slot)
                if item_id:
                    item = items.get(int(item_id))
                    inventory.append({
                        "id": int(item_id),
                        "name": item.get("name") if item else f"Item #{item_id}",
                        "slot": slot,
                    })
            player_data["item_inventory"] = inventory
            players.append(player_data)

        players.sort(key=lambda player: player.get("player_slot", 0))

        return MatchResponse(
            match_id=data.get("match_id", match_id),
            radiant_win=data.get("radiant_win"),
            radiant_score=data.get("radiant_score", 0),
            dire_score=data.get("dire_score", 0),
            duration=data.get("duration", 0),
            start_time=data.get("start_time"),
            game_mode=data.get("game_mode"),
            lobby_type=data.get("lobby_type"),
            human_players=data.get("human_players"),
            is_parsed=len(players) > 0,
            players=players,
            radiant_gold_adv=data.get("radiant_gold_adv"),
            radiant_xp_adv=data.get("radiant_xp_adv"),
            objectives=data.get("objectives"),
            teamfights=data.get("teamfights"),
        )

    except OpenDotaError as error:
        raise HTTPException(
            status_code=error.status_code,
            detail=error.message
        )

    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Внутренняя ошибка при обработке матча."
        )
