
import time
import httpx


class OpenDotaError(Exception):
    def __init__(self, message: str, status_code: int = 502):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class OpenDotaClient:
    BASE_URL = "https://api.opendota.com/api"

    def __init__(self):
        self.timeout = httpx.Timeout(20.0, connect=10.0)
        self._heroes_cache = None
        self._heroes_cache_time = 0
        self._items_cache = None
        self._items_cache_time = 0

    async def _request(self, endpoint: str, method: str = "GET"):
        url = f"{self.BASE_URL}/{endpoint}"

        try:
            async with httpx.AsyncClient(
                    timeout=self.timeout
            ) as client:
                if method == "POST":
                    response = await client.post(url)
                else:
                    response = await client.get(url)

            if response.status_code == 404:
                raise OpenDotaError("Данные не найдены.", 404)

            if response.status_code == 429:
                raise OpenDotaError(
                    "Превышен лимит запросов OpenDota.",
                    429
                )

            if response.status_code >= 500:
                raise OpenDotaError(
                    "Сервер OpenDota временно недоступен.",
                    502
                )

            if response.status_code != 200:
                raise OpenDotaError(
                    f"Ошибка OpenDota: {response.status_code}",
                    502
                )

            try:
                return response.json()
            except ValueError:
                raise OpenDotaError(
                    "Некорректный ответ OpenDota.",
                    502
                )

        except httpx.TimeoutException:
            raise OpenDotaError(
                "Превышено время ожидания OpenDota.",
                504
            )

        except httpx.RequestError:
            raise OpenDotaError(
                "Не удалось подключиться к OpenDota.",
                502
            )

    async def request_parse(self, match_id: int) -> dict:
        data = await self._request(f"request/{match_id}", method="POST")
        if not isinstance(data, dict):
            raise OpenDotaError("Некорректный ответ при запросе обработки реплея.")
        if data.get("status") == "failed" or data.get("err"):
            raise OpenDotaError(data.get("err") or "OpenDota не смогла поставить матч в очередь обработки.", 502)
        return data

    async def get_abilities(self) -> dict:
        data = await self._request("constants/abilities")
        return data if isinstance(data, dict) else {}

    async def get_ability_ids(self) -> dict:
        data = await self._request("constants/ability_ids")
        return data if isinstance(data, dict) else {}

    async def get_hero_stats(self) -> list[dict]:
        data = await self._request("heroStats")
        if not isinstance(data, list):
            raise OpenDotaError("Некорректный список героев OpenDota.")
        return data

    async def get_hero_item_popularity(self, hero_id: int) -> dict:
        data = await self._request(f"heroes/{hero_id}/itemPopularity")
        return data if isinstance(data, dict) else {}

    async def get_hero_matchups(self, hero_id: int) -> list[dict]:
        data = await self._request(f"heroes/{hero_id}/matchups")
        return data if isinstance(data, list) else []

    async def get_match(self, match_id: int) -> dict:
        data = await self._request(f"matches/{match_id}")

        if not isinstance(data, dict):
            raise OpenDotaError("Некорректный формат матча.")

        return data

    async def get_heroes(self) -> dict:
        cache_valid = (
                self._heroes_cache is not None
                and time.time() - self._heroes_cache_time < 86400
        )

        if cache_valid:
            return self._heroes_cache

        data = await self._request("constants/heroes")

        if not isinstance(data, dict):
            raise OpenDotaError(
                "Некорректный справочник героев."
            )

        heroes = {}

        for hero in data.values():
            hero_id = hero.get("id")
            internal_name = hero.get("name", "")

            if not hero_id:
                continue

            short_name = internal_name.replace(
                "npc_dota_hero_", ""
            )

            heroes[int(hero_id)] = {
                "name": hero.get(
                    "localized_name",
                    "Unknown Hero"
                ),
                "internal_name": internal_name,
                "image": (
                    "https://cdn.cloudflare.steamstatic.com/"
                    "apps/dota2/images/dota_react/heroes/"
                    f"{short_name}.png"
                )
            }

        self._heroes_cache = heroes
        self._heroes_cache_time = time.time()

        return heroes

    async def get_items(self) -> dict:
        cache_valid = (
            self._items_cache is not None
            and time.time() - self._items_cache_time < 86400
        )

        if cache_valid:
            return self._items_cache

        data = await self._request("constants/items")

        if not isinstance(data, dict):
            raise OpenDotaError("Некорректный справочник предметов.")

        items = {}
        for key, item in data.items():
            item_id = item.get("id")
            if item_id is None:
                continue
            items[int(item_id)] = {
                "name": item.get("dname") or key.replace("_", " "),
                "key": key,
            }

        self._items_cache = items
        self._items_cache_time = time.time()
        return items
