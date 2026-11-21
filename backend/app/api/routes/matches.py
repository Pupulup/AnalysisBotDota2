
from fastapi import APIRouter, HTTPException, Path

from app.services.opendota import (
    OpenDotaClient,
    OpenDotaError
)

from app.schemas.match import MatchResponse


router = APIRouter(
    prefix="/api/matches",
    tags=["Matches"]
)

opendota = OpenDotaClient()


@router.get("/{match_id}", response_model=MatchResponse)
async def get_match(
        match_id: int = Path(
            ...,
            gt=0,
            description="Dota 2 Match ID"
        )
):
    try:
        data = await opendota.get_match(match_id)

        raw_players = data.get("players") or []

        try:
            heroes = await opendota.get_heroes()
        except OpenDotaError:
            heroes = {}

        players = []

        for player in raw_players:
            player_data = dict(player)

            hero_id = player_data.get("hero_id")
            hero = heroes.get(hero_id, {})

            player_data["hero_name"] = hero.get(
                "name",
                "Unknown Hero"
            )

            player_data["hero_image"] = hero.get("image")

            players.append(player_data)

        players.sort(
            key=lambda player: player.get("player_slot", 0)
        )

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
            players=players
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
