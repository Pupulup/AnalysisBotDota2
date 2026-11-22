from typing import Any

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
    teamfight_participation: float | None = None
    stuns: float | None = None
    obs_placed: int | None = None
    sen_placed: int | None = None
    tower_kills: int | None = None
    roshan_kills: int | None = None
    buyback_count: int | None = None
    camps_stacked: int | None = None
    rune_pickups: int | None = None
    firstblood_claimed: int | None = None
    times: list[int] | None = None
    gold_t: list[int] | None = None
    xp_t: list[int] | None = None
    lh_t: list[int] | None = None
    purchase_log: list[dict[str, Any]] | None = None
    kills_log: list[dict[str, Any]] | None = None
    ability_upgrades: list[dict[str, Any]] | None = None
    lane_role: int | None = None
    is_roaming: bool | None = None
    damage_taken: Any | None = None
    item_uses: dict[str, int] | None = None
    ability_uses: dict[str, int] | None = None
    item_0: int | None = None
    item_1: int | None = None
    item_2: int | None = None
    item_3: int | None = None
    item_4: int | None = None
    item_5: int | None = None
    item_neutral: int | None = None
    item_inventory: list[dict[str, Any]] | None = None


class MatchResponse(BaseModel):
    match_id: int
    radiant_win: bool | None = None
    radiant_score: int = 0
    dire_score: int = 0
    duration: int = 0
    start_time: int | None = None
    game_mode: int | None = None
    lobby_type: int | None = None
    game_mode_name: str | None = None
    lobby_type_name: str | None = None
    mode_category: str = "unknown"
    human_players: int | None = None
    is_parsed: bool
    data_source: str = "opendota"
    replay_age_days: int | None = None
    replay_analysis_allowed: bool = False
    players: list[MatchPlayer] = Field(default_factory=list)
    radiant_gold_adv: list[int] | None = None
    radiant_xp_adv: list[int] | None = None
    objectives: list[dict[str, Any]] | None = None
    teamfights: list[dict[str, Any]] | None = None
