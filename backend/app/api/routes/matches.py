from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Path

from app.services.opendota import OpenDotaClient, OpenDotaError
from app.services.stratz import StratzClient, StratzError
from app.schemas.match import MatchResponse


router = APIRouter(prefix="/api/matches", tags=["Matches"])
opendota = OpenDotaClient()
stratz = StratzClient()
MAX_REPLAY_AGE_DAYS = 90


def replay_age_days(start_time: int | None) -> int | None:
    if start_time is None:
        return None
    now = int(datetime.now(timezone.utc).timestamp())
    return max(0, (now - start_time) // 86400)


def replay_allowed(start_time: int | None) -> bool:
    if start_time is None:
        return False
    now = datetime.now(timezone.utc).timestamp()
    return 0 <= now - start_time <= MAX_REPLAY_AGE_DAYS * 86400


def normalize_stratz_match(data: dict, match_id: int, items: dict) -> MatchResponse:
    start_time = stratz.timestamp(data.get("startDateTime"))
    age_days = replay_age_days(start_time)
    raw_players = data.get("players") or []
    team_positions = {True: 0, False: 0}
    players = []
    has_playback = False

    for raw in raw_players:
        is_radiant = bool(raw.get("isRadiant"))
        fallback_slot = (0 if is_radiant else 128) + team_positions[is_radiant]
        team_positions[is_radiant] += 1
        slot = raw.get("playerSlot")
        if slot is None:
            slot = fallback_slot

        hero = raw.get("hero") or {}
        short_name = hero.get("shortName") or ""
        if short_name.startswith("npc_dota_hero_"):
            short_name = short_name.removeprefix("npc_dota_hero_")

        player = {
            "account_id": raw.get("steamAccountId"),
            "player_slot": int(slot),
            "personaname": (raw.get("steamAccount") or {}).get("name"),
            "name": ((raw.get("steamAccount") or {}).get("proSteamAccount") or {}).get("name"),
            "hero_id": hero.get("id"),
            "hero_name": hero.get("displayName") or "Unknown Hero",
            "hero_image": (
                "https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/"
                f"{short_name}.png" if short_name else None
            ),
            "kills": raw.get("kills") or 0,
            "deaths": raw.get("deaths") or 0,
            "assists": raw.get("assists") or 0,
            "gold_per_min": raw.get("goldPerMinute") or 0,
            "xp_per_min": raw.get("experiencePerMinute") or 0,
            "last_hits": raw.get("numLastHits") or 0,
            "denies": raw.get("numDenies") or 0,
            "net_worth": raw.get("networth") or 0,
            "hero_damage": raw.get("heroDamage") or 0,
            "tower_damage": raw.get("towerDamage") or 0,
            "hero_healing": raw.get("heroHealing") or 0,
            "level": raw.get("level") or 0,
        }

        for index in range(6):
            player[f"item_{index}"] = raw.get(f"item{index}Id")

        inventory = []
        for index in range(6):
            item_id = raw.get(f"item{index}Id")
            if item_id:
                item = items.get(int(item_id))
                inventory.append({
                    "id": int(item_id),
                    "name": item.get("name") if item else f"Item #{item_id}",
                    "slot": f"item_{index}",
                })
        player["item_inventory"] = inventory

        playback = raw.get("_playback") or {}
        purchases = playback.get("purchaseEvents") or []
        if purchases:
            has_playback = True
            player["purchase_log"] = [
                {
                    "time": event.get("time"),
                    "key": str(event.get("itemId")),
                    "item_id": event.get("itemId"),
                }
                for event in purchases
            ]
        else:
            player["purchase_log"] = []

        if playback.get("deathEvents") or playback.get("goldEvents"):
            has_playback = True
        players.append(player)

    players.sort(key=lambda player: player["player_slot"])
    return MatchResponse(
        match_id=int(data.get("id") or match_id),
        radiant_win=data.get("didRadiantWin"),
        radiant_score=data.get("radiantKills") or 0,
        dire_score=data.get("direKills") or 0,
        duration=data.get("durationSeconds") or 0,
        start_time=start_time,
        game_mode=data.get("gameMode"),
        lobby_type=data.get("lobbyType"),
        human_players=len(raw_players),
        is_parsed=has_playback,
        data_source="stratz",
        replay_age_days=age_days,
        replay_analysis_allowed=replay_allowed(start_time),
        players=players,
    )


@router.post("/{match_id}/parse")
async def request_match_parse(
    match_id: int = Path(..., gt=0, description="Dota 2 Match ID")
):
    try:
        if stratz.enabled:
            match_data = await stratz.get_match(match_id, include_playback=False)
            start_time = stratz.timestamp(match_data.get("startDateTime"))
        else:
            match_data = await opendota.get_match(match_id)
            start_time = match_data.get("start_time")

        age_days = replay_age_days(start_time)
        if not replay_allowed(start_time):
            raise HTTPException(
                status_code=400,
                detail=(
                    "Подробный анализ реплея доступен только для матчей не старше 90 дней. "
                    "Дата матча отсутствует или матч старше установленного срока."
                ),
            )

        result = await opendota.request_parse(match_id)
        job = result.get("job") or {}
        return {
            "status": result.get("status", "queued"),
            "job_id": job.get("jobId"),
            "message": "Запрос на обработку реплея отправлен."
        }
    except HTTPException:
        raise
    except (OpenDotaError, StratzError) as error:
        status_code = getattr(error, "status_code", 502)
        raise HTTPException(status_code=status_code, detail=str(error))


@router.get("/{match_id}", response_model=MatchResponse)
async def get_match(
    match_id: int = Path(..., gt=0, description="Dota 2 Match ID")
):
    try:
        if stratz.enabled:
            try:
                stratz_data = await stratz.get_match(match_id, include_playback=True)
                try:
                    items = await opendota.get_items()
                except OpenDotaError:
                    items = {}
                return normalize_stratz_match(stratz_data, match_id, items)
            except StratzError:
                pass

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
        age_days = replay_age_days(data.get("start_time"))

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
            is_parsed=(
                data.get("version") is not None
                or bool(data.get("teamfights"))
                or bool(data.get("objectives"))
                or bool(data.get("radiant_gold_adv"))
                or bool(data.get("radiant_xp_adv"))
                or any(
                    player.get("purchase_log") or player.get("kills_log")
                    for player in raw_players
                )
            ),
            data_source="opendota",
            replay_age_days=age_days,
            replay_analysis_allowed=replay_allowed(data.get("start_time")),
            players=players,
            radiant_gold_adv=data.get("radiant_gold_adv"),
            radiant_xp_adv=data.get("radiant_xp_adv"),
            objectives=data.get("objectives"),
            teamfights=data.get("teamfights"),
        )

    except OpenDotaError as error:
        raise HTTPException(status_code=error.status_code, detail=error.message)
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Внутренняя ошибка при обработке матча."
        )
