import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx
from dotenv import load_dotenv


load_dotenv(Path(__file__).resolve().parents[2] / ".env", override=False)

STRATZ_API_URL = "https://api.stratz.com/graphql"

MATCH_QUERY = """
query GetMatch($matchId: Long!) {
  match(id: $matchId) {
    id
    didRadiantWin
    durationSeconds
    startDateTime
    gameMode
    lobbyType
    radiantKills
    direKills
    players {
      steamAccountId
      steamAccount { name proSteamAccount { name } }
      isRadiant
      playerSlot
      hero { id shortName displayName }
      kills
      deaths
      assists
      networth
      heroDamage
      towerDamage
      heroHealing
      goldPerMinute
      experiencePerMinute
      numLastHits
      numDenies
      level
      position
      lane
      role
      isVictory
      item0Id
      item1Id
      item2Id
      item3Id
      item4Id
      item5Id
    }
  }
}
"""

GUIDE_QUERY = """
query HeroGuide($heroId: Short!) {
  heroStats {
    heroBase: winDay(take: 30, heroIds: [$heroId]) {
      matchCount
      winCount
    }
    startingItems: itemStartingPurchase(heroId: $heroId) {
      matchCount
      winCount
      itemId
    }
    earlyItems: itemFullPurchase(heroId: $heroId, minTime: 1, maxTime: 15) {
      matchCount
      winCount
      itemId
    }
    midItems: itemFullPurchase(heroId: $heroId, minTime: 16, maxTime: 30) {
      matchCount
      winCount
      itemId
    }
    lateItems: itemFullPurchase(heroId: $heroId, minTime: 31) {
      matchCount
      winCount
      itemId
    }
    firstPoints: abilityMinLevel(heroId: $heroId) {
      matchCount
      winCount
      abilityId
      level
    }
    maxLevels: abilityMaxLevel(heroId: $heroId) {
      matchCount
      winCount
      abilityId
      level
    }
    talents: talent(heroId: $heroId) {
      matchCount
      winCount
      abilityId
      time
      timeAverage
    }
    heroVsHeroMatchup(heroId: $heroId) {
      advantage {
        heroId
        matchCountWith
        matchCountVs
        with {
          heroId2
          matchCount
          winCount
          synergy
          winRateHeroId1
          winRateHeroId2
          winsAverage
        }
        vs {
          heroId2
          matchCount
          winCount
          synergy
          winRateHeroId1
          winRateHeroId2
          winsAverage
        }
      }
      disadvantage {
        heroId
        matchCountWith
        matchCountVs
        with {
          heroId2
          matchCount
          winCount
          synergy
          winRateHeroId1
          winRateHeroId2
          winsAverage
        }
        vs {
          heroId2
          matchCount
          winCount
          synergy
          winRateHeroId1
          winRateHeroId2
          winsAverage
        }
      }
    }
  }
}"""

CURRENT_GAME_VERSION_QUERY = """
query CurrentGameVersions {
  constants {
    gameVersions {
      id
      name
      asOfDateTime
    }
  }
}
"""

PLAYER_PROFILE_QUERY = """
query PlayerProfile($steamAccountId: Long!) {
  player(steamAccountId: $steamAccountId) {
    steamAccountId
    matchCount
    winCount
    steamAccount {
      id
      name
      isAnonymous
      isStratzPublic
      seasonRank
      seasonLeaderboardRank
    }
  }
}
"""

PLAYER_HISTORY_QUERY = """
query PlayerPatchHistory($steamAccountId: Long!, $request: PlayerMatchesRequestType!) {
  player(steamAccountId: $steamAccountId) {
    steamAccountId
    matches(request: $request) {
      id
      didRadiantWin
      durationSeconds
      startDateTime
      gameVersionId
      gameMode
      lobbyType
      players(steamAccountId: $steamAccountId) {
        steamAccountId
        steamAccount { name }
        playerSlot
        isRadiant
        isVictory
        heroId
        gameVersionId
        position
        lane
        role
        kills
        deaths
        assists
        networth
        gold
        goldSpent
        stats {
          level
          lastHitsPerMinute
          goldPerMinute
          experiencePerMinute
          heroDamagePerMinute
          towerDamagePerMinute
        }
      }
    }
  }
}
"""

PLAYBACK_QUERY = """
query GetMatchPlayback($matchId: Long!) {
  match(id: $matchId) {
    players {
      steamAccountId
      playbackData {
        deathEvents { time steamAccountId positionX positionY }
        playerUpdatePositionEvents { time x y }
        purchaseEvents { time itemId }
        goldEvents { time amount }
      }
    }
  }
}
"""


class StratzError(Exception):
    pass


class StratzClient:
    def __init__(self):
        self.api_key = os.getenv("STRATZ_API_KEY", "").strip()
        self.timeout = httpx.Timeout(25.0, connect=10.0)
        self._game_version_cache = None
        self._game_version_cache_time = 0

    @property
    def enabled(self) -> bool:
        return bool(self.api_key)

    async def _graphql(self, query: str, variables: int | dict[str, Any]) -> dict[str, Any]:
        if not self.enabled:
            raise StratzError("STRATZ_API_KEY не настроен.")

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "User-Agent": "DotaAnalytics/1.0",
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    STRATZ_API_URL,
                    headers=headers,
                    json={"query": query, "variables": variables if isinstance(variables, dict) else {"matchId": variables}},
                )
            if response.status_code == 401 or response.status_code == 403:
                raise StratzError("STRATZ отклонил API-токен. Проверь STRATZ_API_KEY.")
            if response.status_code == 429:
                raise StratzError("Превышен лимит запросов STRATZ.")
            if response.status_code >= 500:
                raise StratzError(f"STRATZ временно недоступен: HTTP {response.status_code}.")
            response.raise_for_status()
            payload = response.json()
        except StratzError:
            raise
        except httpx.TimeoutException as exc:
            raise StratzError("Истекло время ожидания ответа STRATZ.") from exc
        except (httpx.HTTPError, ValueError) as exc:
            raise StratzError(f"Не удалось получить данные STRATZ: {exc}") from exc

        errors = payload.get("errors") or []
        if errors:
            messages = "; ".join(
                str(error.get("message", "GraphQL error")) for error in errors
            )
            raise StratzError(f"Ошибка GraphQL STRATZ: {messages}")

        data = payload.get("data") or {}
        if not isinstance(data, dict) or not data:
            raise StratzError("STRATZ вернул пустой ответ GraphQL.")
        return data

    @staticmethod
    def timestamp(value: Any) -> int | None:
        if value is None:
            return None
        if isinstance(value, (int, float)):
            return int(value)
        if isinstance(value, str):
            try:
                return int(float(value))
            except ValueError:
                try:
                    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
                    if parsed.tzinfo is None:
                        parsed = parsed.replace(tzinfo=timezone.utc)
                    return int(parsed.timestamp())
                except ValueError:
                    return None
        return None

    async def get_current_game_version(self) -> dict[str, Any]:
        if (
            self._game_version_cache is not None
            and datetime.now(timezone.utc).timestamp() - self._game_version_cache_time < 3600
        ):
            return self._game_version_cache

        data = await self._graphql(CURRENT_GAME_VERSION_QUERY, {})
        versions = (data.get("constants") or {}).get("gameVersions") or []
        valid = [
            version for version in versions
            if isinstance(version, dict) and version.get("id") is not None
        ]
        if not valid:
            raise StratzError("STRATZ не вернул список версий игры.")

        latest = max(
            valid,
            key=lambda version: self.timestamp(version.get("asOfDateTime")) or 0,
        )
        result = {
            "id": int(latest["id"]),
            "name": latest.get("name") or f"Game version #{latest['id']}",
            "date": latest.get("asOfDateTime"),
            "source": "stratz",
        }
        self._game_version_cache = result
        self._game_version_cache_time = datetime.now(timezone.utc).timestamp()
        return result

    async def get_player_profile(self, account_id: int) -> dict[str, Any]:
        data = await self._graphql(
            PLAYER_PROFILE_QUERY,
            {"steamAccountId": account_id},
        )
        player = data.get("player") or {}
        account = player.get("steamAccount") or {}
        if not account:
            raise StratzError("STRATZ не вернул профиль игрока.")
        return {
            "profile": {
                "personaname": account.get("name") or f"Player {account_id}",
                "avatarfull": None,
            },
            "rank_tier": None,
            "leaderboard_rank": account.get("seasonLeaderboardRank"),
        }

    async def get_player_matches_for_version(
        self,
        account_id: int,
        game_version_id: int,
        mode_category: str,
        limit: int = 50,
    ) -> list[dict[str, Any]]:
        from app.services.game_modes import describe_game_mode

        collected: list[dict[str, Any]] = []
        skip = 0
        page_size = 100

        for _ in range(10):
            data = await self._graphql(
                PLAYER_HISTORY_QUERY,
                {
                    "steamAccountId": account_id,
                    "request": {
                        "take": page_size,
                        "skip": skip,
                        "gameVersionIds": [game_version_id],
                    },
                },
            )
            player = data.get("player") or {}
            page = player.get("matches") or []
            if not isinstance(page, list):
                raise StratzError("STRATZ вернул некорректную историю матчей игрока.")
            if not page:
                break

            for match in page:
                category = describe_game_mode(
                    match.get("gameMode"),
                    match.get("lobbyType"),
                )["mode_category"]
                if category != mode_category:
                    continue

                player_rows = match.get("players") or []
                if not player_rows:
                    continue
                player_row = player_rows[0]
                stats = player_row.get("stats") or {}
                duration = int(match.get("durationSeconds") or 0)

                def total_from_rate(field: str) -> int:
                    value = stats.get(field)
                    if value is None or duration <= 0:
                        return 0
                    return round(float(value) * duration / 60)

                match_id = match.get("id")
                try:
                    match_id = int(match_id)
                except (TypeError, ValueError):
                    continue

                collected.append({
                    "match_id": match_id,
                    "start_time": self.timestamp(match.get("startDateTime")),
                    "duration": duration,
                    "radiant_win": match.get("didRadiantWin"),
                    "player_slot": int(player_row.get("playerSlot") or 0),
                    "game_mode": match.get("gameMode"),
                    "lobby_type": match.get("lobbyType"),
                    "hero_id": player_row.get("heroId"),
                    "position": player_row.get("position"),
                    "lane": player_row.get("lane"),
                    "role": player_row.get("role"),
                    "lane_role": 0,
                    "kills": int(player_row.get("kills") or 0),
                    "deaths": int(player_row.get("deaths") or 0),
                    "assists": int(player_row.get("assists") or 0),
                    "gold_per_min": stats.get("goldPerMinute"),
                    "xp_per_min": stats.get("experiencePerMinute"),
                    "last_hits": total_from_rate("lastHitsPerMinute"),
                    "hero_damage": total_from_rate("heroDamagePerMinute"),
                    "tower_damage": total_from_rate("towerDamagePerMinute"),
                    "level": int(stats.get("level") or 0),
                })
                if len(collected) >= limit:
                    break

            if len(collected) >= limit or len(page) < page_size:
                break
            skip += page_size

        return collected[:limit]

    async def get_hero_guide(self, hero_id: int) -> dict[str, Any]:
        if not self.enabled:
            raise StratzError("STRATZ_API_KEY не настроен.")
        data = await self._graphql(GUIDE_QUERY, {"heroId": hero_id})
        if not isinstance(data.get("heroStats"), dict):
            raise StratzError("STRATZ не вернул статистику гайда для этого героя.")
        return data

    async def get_match(self, match_id: int, include_playback: bool = True) -> dict[str, Any]:
        data = await self._graphql(MATCH_QUERY, match_id)
        match = data.get("match")
        if not isinstance(match, dict):
            raise StratzError("STRATZ не вернул данные для указанного матча.")
        start_time = self.timestamp(match.get("startDateTime"))
        if include_playback and start_time is not None:
            age_seconds = int(datetime.now(timezone.utc).timestamp()) - start_time
            if 0 <= age_seconds <= 90 * 24 * 60 * 60:
                try:
                    playback_data = await self._graphql(PLAYBACK_QUERY, match_id)
                    playback_match = playback_data.get("match") or {}
                    playback_players = playback_match.get("players") or []
                    playback_by_account = {
                        str(player.get("steamAccountId")): player.get("playbackData") or {}
                        for player in playback_players
                    }
                    for player in match.get("players") or []:
                        account_id = str(player.get("steamAccountId"))
                        player["_playback"] = playback_by_account.get(account_id, {})
                except StratzError:
                    # Keep the STRATZ match summary even when playback is unavailable.
                    for player in match.get("players") or []:
                        player["_playback"] = {}
        return match
