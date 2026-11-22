from typing import Literal

from fastapi import APIRouter, HTTPException, Path, Query

from app.services.opendota import OpenDotaClient, OpenDotaError
from app.services.player_analytics import build_player_analytics
from app.services.stratz import StratzClient, StratzError


router = APIRouter(prefix="/api/players", tags=["Players"])
opendota = OpenDotaClient()
stratz = StratzClient()


@router.get("/{account_id}/analytics")
async def get_player_analytics(
    account_id: int = Path(..., gt=0, le=4294967295, description="Steam32 account ID"),
    mode: Literal["ranked", "turbo", "unranked", "other"] = Query("ranked"),
    limit: int = Query(50, ge=10, le=50),
):
    if limit not in {10, 20, 50}:
        raise HTTPException(status_code=400, detail="Допустимые значения limit: 10, 20 или 50.")

    try:
        data_source = "opendota"
        if stratz.enabled:
            try:
                patch = await stratz.get_current_game_version()
                matches = await stratz.get_player_matches_for_version(
                    account_id=account_id,
                    game_version_id=patch["id"],
                    mode_category=mode,
                    limit=limit,
                )
                try:
                    profile = await opendota.get_player_profile(account_id)
                except OpenDotaError:
                    profile = await stratz.get_player_profile(account_id)
                data_source = "stratz"
            except StratzError:
                patch = await opendota.get_current_patch()
                profile = await opendota.get_player_profile(account_id)
                matches = await opendota.get_player_matches(
                    account_id=account_id,
                    patch_id=patch["id"],
                    mode_category=mode,
                    limit=limit,
                )
        else:
            patch = await opendota.get_current_patch()
            profile = await opendota.get_player_profile(account_id)
            matches = await opendota.get_player_matches(
                account_id=account_id,
                patch_id=patch["id"],
                mode_category=mode,
                limit=limit,
            )

        try:
            heroes = await opendota.get_heroes()
        except OpenDotaError:
            heroes = {}

        return build_player_analytics(
            account_id=account_id,
            profile=profile,
            patch=patch,
            mode_category=mode,
            matches=matches,
            heroes=heroes,
            data_source=data_source,
        )
    except OpenDotaError as error:
        raise HTTPException(status_code=error.status_code, detail=error.message)
