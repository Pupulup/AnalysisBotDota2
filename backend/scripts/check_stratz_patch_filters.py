import asyncio
import os
from pathlib import Path

import httpx
from dotenv import load_dotenv


load_dotenv(Path(__file__).resolve().parents[1] / ".env", override=False)

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

ROOT_QUERY = """
query InspectStratzRoot {
  __schema { queryType { name } }
  constants {
    gameVersions {
      id
      name
      asOfDateTime
    }
  }
}
"""


def named_type(type_info: dict | None) -> str | None:
    while type_info:
        if type_info.get("name"):
            return str(type_info["name"])
        type_info = type_info.get("ofType")
    return None


def describe_http_error(response: httpx.Response, token: str) -> str:
    metadata = [
        f"HTTP status: {response.status_code}",
        f"Content-Type: {response.headers.get('content-type', 'unknown')}",
        f"Server: {response.headers.get('server', 'unknown')}",
        f"CF-Ray: {response.headers.get('cf-ray', 'not present')}",
        f"CF-Mitigated: {response.headers.get('cf-mitigated', 'not present')}",
        f"Request ID: {response.headers.get('x-request-id', 'not present')}",
    ]
    body = response.text[:800].replace(token, "[REDACTED]")
    if body:
        metadata.append(f"Response preview: {body}")
    return "\n".join(metadata)


async def graphql(
    client: httpx.AsyncClient,
    query: str,
    headers: dict,
    token: str,
) -> dict:
    response = await client.post(ENDPOINT, headers=headers, json={"query": query})
    if response.status_code == 401:
        details = describe_http_error(response, token)
        raise SystemExit(
            "STRATZ returned HTTP 401. The token may be invalid, expired or unauthorized.\n"
            f"{details}"
        )
    if response.status_code == 403:
        details = describe_http_error(response, token)
        raise SystemExit(
            "STRATZ returned HTTP 403. This does not always mean the token is invalid; "
            "the request may be blocked by an access policy or network protection.\n"
            f"{details}"
        )
    if response.status_code == 429:
        raise SystemExit("STRATZ rate limit reached (HTTP 429).")
    if response.status_code >= 400:
        details = describe_http_error(response, token)
        raise SystemExit(f"STRATZ returned an HTTP error.\n{details}")
    response.raise_for_status()
    payload = response.json()
    if payload.get("errors"):
        messages = "; ".join(str(item.get("message", "GraphQL error")) for item in payload["errors"])
        raise SystemExit(f"STRATZ schema inspection failed: {messages}")
    return payload.get("data") or {}


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
        root_data = await graphql(client, ROOT_QUERY, headers, token)
        root_type_name = ((root_data.get("__schema") or {}).get("queryType") or {}).get("name")
        if not root_type_name:
            raise SystemExit("STRATZ did not expose the GraphQL root query type.")

        root_query = f'''
        query InspectRootFields {{
          __type(name: "{root_type_name}") {{
            fields {{
              name
              type {{ kind name ofType {{ kind name ofType {{ kind name }} }} }}
            }}
          }}
        }}
        '''
        root_fields = ((await graphql(client, root_query, headers, token)).get("__type") or {}).get("fields") or []
        hero_stats_field = next((field for field in root_fields if field.get("name") == "heroStats"), None)
        hero_stats_type = named_type((hero_stats_field or {}).get("type"))
        if not hero_stats_type:
            raise SystemExit("STRATZ schema does not expose a heroStats query field.")

        hero_query = f'''
        query InspectHeroStatsFields {{
          __type(name: "{hero_stats_type}") {{
            fields {{
              name
              args {{
                name
                type {{ kind name ofType {{ kind name ofType {{ kind name }} }} }}
              }}
            }}
          }}
        }}
        '''
        hero_fields = ((await graphql(client, hero_query, headers, token)).get("__type") or {}).get("fields") or []

    fields = {field.get("name"): field for field in hero_fields}
    print("STRATZ HeroStats filter support")
    for field_name in sorted(FIELDS):
        field = fields.get(field_name)
        if not field:
            print(f"- {field_name}: field not present in schema")
            continue
        arguments = sorted(arg.get("name", "") for arg in field.get("args") or [])
        has_version_filter = any("gameversion" in name.lower() for name in arguments)
        print(f"- {field_name}: args={', '.join(arguments) or '(none)'}")
        print(f"  explicit game-version filter: {'YES' if has_version_filter else 'NO'}")

    versions = ((root_data.get("constants") or {}).get("gameVersions") or [])
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
