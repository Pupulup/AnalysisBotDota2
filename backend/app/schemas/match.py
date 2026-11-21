
from pydantic import BaseModel, ConfigDict, Field


class MatchPlayer(BaseModel):
    model_config = ConfigDict(extra="ignore")

    account_id: int | None = None
    player_slot: int

    personaname: str | None = None
    name: str | None = None

    hero_id: int | None = None
    hero_name: str | None = None
    hero_image: str | None = None

    kills: int = 0
    deaths: int = 0
    assists: int = 0

    gold_per_min: int = 0
    xp_per_min: int = 0

    last_hits: int = 0
    denies: int = 0

    hero_damage: int = 0
    tower_damage: int = 0
    hero_healing: int = 0

    net_worth: int = 0
    level: int = 0

    total_gold: int | None = None
    total_xp: int | None = None


class MatchResponse(BaseModel):
    match_id: int
    radiant_win: bool | None = None

    radiant_score: int = 0
    dire_score: int = 0

    duration: int = 0
    start_time: int | None = None

    game_mode: int | None = None
    lobby_type: int | None = None
    human_players: int | None = None

    is_parsed: bool

    players: list[MatchPlayer] = Field(
        default_factory=list
    )
