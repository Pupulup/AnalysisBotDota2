import asyncio
import os
from pathlib import Path

import httpx
from dotenv import load_dotenv


load_dotenv(Path(__file__).resolve().parents[1] / ".env")

ENDPOINT = "https://api.stratz.com/graphql"
FIELDS = {
    "stats",
    "itemStartingPurchase",
    "itemFullPurchase",
    "abilityMinLevel",
    "abilityMaxLevel",
    "talent",
    "heroVsHeroMatchup",
}

QUERY = """
query InspectHeroStatsPatchFilters {
  __type(name: "HeroStats") {
    fields {
      name
      args {
        name
        type {
          kind
          name
          ofType {
            kind
            name
            ofType { kind name }
          }
        }
      }
    }
  }
  constants {
    gameVersions {
      id
      name
      asOfDateTime
    }
  }
}
"""


async def main() -> None:
    token = os.getenv("STRATZ_API_KEY", "").strip()
    if not token:
        raise SystemExit("STRATZ_API_KEY was not found in backend/.env.")

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "User-Agent": "DotaAnalytics/1.0",
    }
    async with httpx.AsyncClient(timeout=httpx.Timeout(25.0, connect=10.0)) as client:
        response = await client.post(ENDPOINT, headers=headers, json={"query": QUERY})
        if response.status_code in (401, 403):
            raise SystemExit("STRATZ rejected the configured API token.")
        response.raise_for_status()
        payload = response.json()

    if payload.get("errors"):
        messages = "; ".join(str(item.get("message", "GraphQL error")) for item in payload["errors"])
        raise SystemExit(f"STRATZ schema inspection failed: {messages}")

    data = payload.get("data") or {}
    hero_stats = data.get("__type") or {}
    fields = {field.get("name"): field for field in hero_stats.get("fields") or []}

    print("STRATZ HeroStats filter support")
    for field_name in sorted(FIELDS):
        field = fields.get(field_name)
        if not field:
            print(f"- {field_name}: field not present in schema")
            continue
        arguments = sorted(arg.get("name", "") for arg in field.get("args") or [])
        has_version_filter = any("gameVersion" in name.lower() for name in arguments)
        print(f"- {field_name}: args={', '.join(arguments) or '(none)'}")
        print(f"  explicit game-version filter: {'YES' if has_version_filter else 'NO'}")

    versions = ((data.get("constants") or {}).get("gameVersions") or [])
    if versions:
        latest = max(versions, key=lambda row: int(row.get("asOfDateTime") or 0))
        print(
            "Latest STRATZ game version: "
            f"{latest.get('name')} (id={latest.get('id')}, asOfDateTime={latest.get('asOfDateTime')})"
        )
    else:
        print("STRATZ did not return game-version constants.")


if __name__ == "__main__":
    asyncio.run(main())
