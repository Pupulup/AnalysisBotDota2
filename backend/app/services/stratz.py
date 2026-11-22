import os
from datetime import datetime, timezone
from typing import Any

import httpx
from dotenv import load_dotenv


load_dotenv()

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
    startingItems: itemFullPurchase(heroId: $heroId, minTime: 0, maxTime: 0) {
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
    talents: talent(heroId: $heroId) {
      matchCount
      winCount
      abilityId
    }
    abilities: ability(heroId: $heroId) {
      matchCount
      winCount
      abilityId
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
        deathEvents { time steamAccountId }
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
        return match
