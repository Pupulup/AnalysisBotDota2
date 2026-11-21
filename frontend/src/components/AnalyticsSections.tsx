import ReactECharts from "echarts-for-react";
import {
  Activity,
  Award,
  Crosshair,
  Heart,
  Shield,
  Swords,
  Target,
  TrendingUp,
  Users
} from "lucide-react";
import "./AnalyticsSections.css";

export interface MatchPlayer {
  account_id: number | null;
  player_slot: number;
  personaname: string | null;
  name: string | null;
  hero_id: number | null;
  hero_name: string | null;
  hero_image: string | null;
  kills: number;
  deaths: number;
  assists: number;
  gold_per_min: number;
  xp_per_min: number;
  last_hits: number;
  denies: number;
  hero_damage: number;
  tower_damage: number;
  hero_healing: number;
  net_worth: number;
  level: number;
  total_gold?: number | null;
  total_xp?: number | null;
  teamfight_participation?: number | null;
  stuns?: number | null;
  obs_placed?: number | null;
  sen_placed?: number | null;
  tower_kills?: number | null;
  roshan_kills?: number | null;
  buyback_count?: number | null;
  times?: number[] | null;
  gold_t?: number[] | null;
  xp_t?: number[] | null;
  lh_t?: number[] | null;
  purchase_log?: Array<{ time?: number; key?: string }> | null;
  kills_log?: Array<{ time?: number; key?: string }> | null;
  ability_upgrades?: Array<{ time?: number; ability?: string; level?: number }> | null;
}

export interface MatchData {
  match_id: number;
  radiant_win: boolean | null;
  radiant_score: number;
  dire_score: number;
  duration: number;
  start_time: number | null;
  game_mode: number | null;
  lobby_type: number | null;
  human_players: number | null;
  is_parsed: boolean;
  players: MatchPlayer[];
  radiant_gold_adv?: number[] | null;
  radiant_xp_adv?: number[] | null;
  objectives?: Array<Record<string, any>> | null;
  teamfights?: Array<Record<string, any>> | null;
}

const number = (value: number) => new Intl.NumberFormat("en-US").format(value || 0);
const duration = (value: number) => {
  const mins = Math.floor(value / 60);
  return `${mins}:${String(value % 60).padStart(2, "0")}`;
};
export const playerName = (p: MatchPlayer) =>
  p.personaname || p.name || (p.account_id ? `Player ${p.account_id}` : "Anonymous player");
const kda = (p: MatchPlayer) => (p.kills + p.assists) / Math.max(p.deaths, 1);
const radiant = (p: MatchPlayer) => p.player_slot < 128;

function Metric({ label, value, icon: Icon, tone = "" }: {
  label: string; value: string; icon: React.ElementType; tone?: string;
}) {
  return <div className="analytics-metric">
    <div className={`analytics-metric-icon ${tone}`}><Icon size={18} /></div>
    <span>{label}</span><strong>{value}</strong>
  </div>;
}

function Panel({ title, subtitle, children }: {
  title: string; subtitle?: string; children: React.ReactNode;
}) {
  return <section className="analytics-panel">
    <div className="analytics-panel-heading">
      <div><h2>{title}</h2>{subtitle && <span>{subtitle}</span>}</div>
    </div>
    {children}
  </section>;
}

export function OverviewSection({ match }: { match: MatchData }) {
  const players = match.players || [];
  const totalDamage = players.reduce((sum, p) => sum + p.hero_damage, 0);
  const totalNetWorth = players.reduce((sum, p) => sum + p.net_worth, 0);
  const mvp = [...players].sort((a, b) => playerScore(b, players) - playerScore(a, players))[0];
  const objectives = match.objectives || [];
  const winner = match.radiant_win === null ? "Unknown" : match.radiant_win ? "Radiant" : "Dire";

  return <div className="analytics-page">
    <div className="analytics-metrics-grid">
      <Metric label="MATCH DURATION" value={duration(match.duration)} icon={Activity} />
      <Metric label="TOTAL KILLS" value={number(match.radiant_score + match.dire_score)} icon={Swords} />
      <Metric label="TOTAL NET WORTH" value={number(totalNetWorth)} icon={TrendingUp} />
      <Metric label="HERO DAMAGE" value={number(totalDamage)} icon={Crosshair} />
    </div>
    <Panel title="Match result" subtitle={`MATCH #${match.match_id} · ${match.is_parsed ? "PARSED DATA" : "BASIC DATA"}`}>
      <div className="overview-result">
        <div className="overview-team radiant">
          <span>RADIANT</span><strong>{match.radiant_score}</strong>
          <small>{match.radiant_win === null ? "RESULT UNKNOWN" : match.radiant_win ? "VICTORY" : "DEFEAT"}</small>
        </div>
        <div className="overview-vs">VS</div>
        <div className="overview-team dire">
          <span>DIRE</span><strong>{match.dire_score}</strong>
          <small>{match.radiant_win === null ? "RESULT UNKNOWN" : !match.radiant_win ? "VICTORY" : "DEFEAT"}</small>
        </div>
      </div>
      <div className="overview-facts">
        <div><span>WINNER</span><strong>{winner}</strong></div>
        <div><span>PLAYERS</span><strong>{players.length || match.human_players || 0}/10</strong></div>
        <div><span>OBJECTIVES</span><strong>{objectives.length}</strong></div>
        <div><span>GAME MODE ID</span><strong>{match.game_mode ?? "—"}</strong></div>
      </div>
    </Panel>
    {mvp && <Panel title="Match MVP" subtitle="ESTIMATED PERFORMANCE LEADER">
      <div className="analytics-mvp">
        {mvp.hero_image && <img src={mvp.hero_image} alt={mvp.hero_name || "Hero"} />}
        <div className="analytics-mvp-info">
          <span className={radiant(mvp) ? "team-tag radiant-tag" : "team-tag dire-tag"}>{radiant(mvp) ? "RADIANT" : "DIRE"}</span>
          <h3>{playerName(mvp)}</h3><p>{mvp.hero_name || "Unknown hero"} · Level {mvp.level}</p>
        </div>
        <div className="analytics-mvp-score"><strong>{playerScore(mvp, players).toFixed(0)}</strong><span>PERFORMANCE</span></div>
      </div>
    </Panel>}
  </div>;
}

function PlayerCard({ player, onSelect }: { player: MatchPlayer; onSelect: (p: MatchPlayer) => void }) {
  return <button className="analytics-player-row" onClick={() => onSelect(player)}>
    <div className="analytics-player-identity">
      {player.hero_image ? <img src={player.hero_image} alt={player.hero_name || "Hero"} /> : <div className="analytics-hero-fallback">?</div>}
      <div><strong>{playerName(player)}</strong><span>{player.hero_name || "Unknown hero"} · LVL {player.level}</span></div>
    </div>
    <div className="analytics-player-cell"><strong>{player.kills}/{player.deaths}/{player.assists}</strong><span>K/D/A</span></div>
    <div className="analytics-player-cell"><strong>{player.gold_per_min}</strong><span>GPM</span></div>
    <div className="analytics-player-cell"><strong>{number(player.net_worth)}</strong><span>NET WORTH</span></div>
    <div className="analytics-player-cell"><strong>{kda(player).toFixed(2)}</strong><span>KDA</span></div>
    <span className="analytics-open">›</span>
  </button>;
}

export function PlayersSection({ match, onSelect }: {
  match: MatchData; onSelect: (p: MatchPlayer) => void;
}) {
  const radiantPlayers = match.players.filter(radiant);
  const direPlayers = match.players.filter(p => !radiant(p));
  const renderTeam = (teamPlayers: MatchPlayer[], team: "radiant" | "dire") =>
    <Panel title={team === "radiant" ? "Radiant roster" : "Dire roster"} subtitle={`${teamPlayers.length} PLAYERS`}>
      <div className="analytics-player-table">
        {teamPlayers.map(p => <PlayerCard key={p.player_slot} player={p} onSelect={onSelect} />)}
      </div>
    </Panel>;

  return <div className="analytics-page">
    <div className="analytics-section-note">Select a player to open their detailed performance card.</div>
    {renderTeam(radiantPlayers, "radiant")}
    {renderTeam(direPlayers, "dire")}
  </div>;
}

function timelineOption(match: MatchData, key: "radiant_gold_adv" | "radiant_xp_adv") {
  const values = match[key] || [];
  const label = key === "radiant_gold_adv" ? "Gold advantage" : "Experience advantage";
  return {
    backgroundColor: "transparent",
    tooltip: { trigger: "axis", backgroundColor: "#151e2c", borderColor: "#34445d", textStyle: { color: "#edf1fa" } },
    grid: { left: 54, right: 24, top: 30, bottom: 38 },
    xAxis: { type: "category", name: "MIN", boundaryGap: false, axisLabel: { color: "#8290a5" }, axisLine: { lineStyle: { color: "#34445d" } }, data: values.map((_, i) => i) },
    yAxis: { type: "value", name: label, axisLabel: { color: "#8290a5" }, splitLine: { lineStyle: { color: "#263246" } }, axisLine: { show: false } },
    series: [{ name: label, type: "line", smooth: true, showSymbol: false, lineStyle: { width: 2 }, areaStyle: { opacity: 0.12 }, data: values }],
    visualMap: { show: false, pieces: [{ lte: 0, color: "#e16d79" }, { gt: 0, color: "#55bd91" }], outOfRange: { color: "#7daeff" } }
  };
}

function eventLabel(event: Record<string, any>) {
  const type = String(event.type || "event").replaceAll("_", " ");
  const key = event.key ? String(event.key).replaceAll("_", " ") : "";
  return key ? `${type}: ${key}` : type;
}

export function TimelineSection({ match }: { match: MatchData }) {
  const gold = match.radiant_gold_adv || [];
  const xp = match.radiant_xp_adv || [];
  const events = [...(match.objectives || [])].sort((a, b) => (a.time || 0) - (b.time || 0));
  const hasTimeline = gold.length > 0 || xp.length > 0;

  return <div className="analytics-page">
    {hasTimeline ? <>
      {gold.length > 0 && <Panel title="Gold advantage" subtitle="RADIANT POSITIVE · DIRE NEGATIVE">
        <div className="analytics-chart"><ReactECharts option={timelineOption(match, "radiant_gold_adv")} style={{ height: 300, width: "100%" }} /></div>
      </Panel>}
      {xp.length > 0 && <Panel title="Experience advantage" subtitle="RADIANT POSITIVE · DIRE NEGATIVE">
        <div className="analytics-chart"><ReactECharts option={timelineOption(match, "radiant_xp_adv")} style={{ height: 300, width: "100%" }} /></div>
      </Panel>}
    </> : <Panel title="Timeline unavailable" subtitle="OPEN DOTA HAS NOT PROVIDED ADVANTAGE SERIES">
      <div className="analytics-empty">This match does not contain parsed gold or experience timeline data. The match overview and player statistics are still available.</div>
    </Panel>}
    <Panel title="Match objectives" subtitle={`${events.length} RECORDED EVENTS`}>
      {events.length ? <div className="analytics-events">
        {events.map((event, index) => <div className="analytics-event" key={index}>
          <span className="analytics-event-time">{duration(Math.max(0, Number(event.time) || 0))}</span>
          <span className="analytics-event-marker"><Target size={14} /></span>
          <div><strong>{eventLabel(event)}</strong><small>{event.team === 2 ? "RADIANT" : event.team === 3 ? "DIRE" : "TEAM NOT SPECIFIED"}</small></div>
        </div>)}
      </div> : <div className="analytics-empty">No objective events are available for this match.</div>}
    </Panel>
  </div>;
}

function teamTotals(players: MatchPlayer[]) {
  return players.reduce((sum, p) => ({
    kills: sum.kills + p.kills,
    deaths: sum.deaths + p.deaths,
    assists: sum.assists + p.assists,
    netWorth: sum.netWorth + p.net_worth,
    damage: sum.damage + p.hero_damage,
    towerDamage: sum.towerDamage + p.tower_damage,
    healing: sum.healing + p.hero_healing,
    gpm: sum.gpm + p.gold_per_min,
    xpm: sum.xpm + p.xp_per_min,
    lastHits: sum.lastHits + p.last_hits
  }), { kills: 0, deaths: 0, assists: 0, netWorth: 0, damage: 0, towerDamage: 0, healing: 0, gpm: 0, xpm: 0, lastHits: 0 });
}

export function TeamsSection({ match }: { match: MatchData }) {
  const r = teamTotals(match.players.filter(radiant));
  const d = teamTotals(match.players.filter(p => !radiant(p)));
  const rows = [
    ["Kills", r.kills, d.kills],
    ["Assists", r.assists, d.assists],
    ["Net worth", r.netWorth, d.netWorth],
    ["Hero damage", r.damage, d.damage],
    ["Tower damage", r.towerDamage, d.towerDamage],
    ["Hero healing", r.healing, d.healing],
    ["Last hits", r.lastHits, d.lastHits],
    ["Average GPM", Math.round(r.gpm / Math.max(match.players.filter(radiant).length, 1)), Math.round(d.gpm / Math.max(match.players.filter(p => !radiant(p)).length, 1))],
    ["Average XPM", Math.round(r.xpm / Math.max(match.players.filter(radiant).length, 1)), Math.round(d.xpm / Math.max(match.players.filter(p => !radiant(p)).length, 1))]
  ] as Array<[string, number, number]>;
  const chartOption = {
    backgroundColor: "transparent",
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, backgroundColor: "#151e2c", borderColor: "#34445d", textStyle: { color: "#edf1fa" } },
    legend: { textStyle: { color: "#aab7ca" } },
    grid: { left: 110, right: 24, top: 42, bottom: 25 },
    xAxis: { type: "value", axisLabel: { color: "#8290a5" }, splitLine: { lineStyle: { color: "#263246" } } },
    yAxis: { type: "category", data: rows.map(x => x[0]), axisLabel: { color: "#aab7ca" }, axisLine: { show: false } },
    series: [
      { name: "Radiant", type: "bar", data: rows.map(x => x[1]), itemStyle: { color: "#4d9c83" }, barMaxWidth: 13 },
      { name: "Dire", type: "bar", data: rows.map(x => x[2]), itemStyle: { color: "#c16b79" }, barMaxWidth: 13 }
    ]
  };

  return <div className="analytics-page">
    <div className="analytics-metrics-grid">
      <Metric label="RADIANT NET WORTH" value={number(r.netWorth)} icon={TrendingUp} tone="green" />
      <Metric label="DIRE NET WORTH" value={number(d.netWorth)} icon={TrendingUp} tone="red" />
      <Metric label="RADIANT HERO DAMAGE" value={number(r.damage)} icon={Crosshair} />
      <Metric label="DIRE HERO DAMAGE" value={number(d.damage)} icon={Crosshair} />
    </div>
    <Panel title="Team comparison" subtitle="AGGREGATED MATCH STATISTICS">
      <div className="analytics-chart"><ReactECharts option={chartOption} style={{ height: 390, width: "100%" }} /></div>
    </Panel>
    <Panel title="Team efficiency" subtitle="AVERAGE PER PLAYER">
      <div className="analytics-efficiency">
        <div><span>RADIANT</span><strong>{Math.round(r.gpm / Math.max(match.players.filter(radiant).length, 1))} GPM</strong><small>{Math.round(r.xpm / Math.max(match.players.filter(radiant).length, 1))} XPM</small></div>
        <div><span>DIRE</span><strong>{Math.round(d.gpm / Math.max(match.players.filter(p => !radiant(p)).length, 1))} GPM</strong><small>{Math.round(d.xpm / Math.max(match.players.filter(p => !radiant(p)).length, 1))} XPM</small></div>
      </div>
    </Panel>
  </div>;
}

export function playerScore(player: MatchPlayer, allPlayers: MatchPlayer[]) {
  const max = (selector: (p: MatchPlayer) => number) => Math.max(...allPlayers.map(selector), 1);
  const normalized = (value: number, maximum: number) => Math.min(value / Math.max(maximum, 1), 1);
  const participation = player.teamfight_participation != null
    ? Math.max(0, Math.min(player.teamfight_participation, 1))
    : normalized(player.kills + player.assists, max(p => p.kills + p.assists));
  const kdaScore = Math.min(kda(player) / 8, 1);
  const gpmScore = normalized(player.gold_per_min, max(p => p.gold_per_min));
  const damageScore = normalized(player.hero_damage, max(p => p.hero_damage));
  const objectiveScore = normalized(player.tower_damage, max(p => p.tower_damage));
  const healingScore = normalized(player.hero_healing, max(p => p.hero_healing));
  return 100 * (kdaScore * 0.20 + gpmScore * 0.20 + damageScore * 0.25 + objectiveScore * 0.15 + participation * 0.15 + healingScore * 0.05);
}

function playerInsight(player: MatchPlayer, allPlayers: MatchPlayer[]) {
  const score = playerScore(player, allPlayers);
  const contributions = [
    { label: "Hero damage", value: player.hero_damage },
    { label: "Net worth", value: player.net_worth },
    { label: "KDA", value: kda(player) }
  ].sort((a, b) => b.value - a.value);
  const positives: string[] = [];
  const concerns: string[] = [];
  if (player.kills + player.assists >= 10) positives.push("High kill participation through kills and assists.");
  if (player.hero_damage >= allPlayers.reduce((m, p) => Math.max(m, p.hero_damage), 0) * 0.85) positives.push("One of the match leaders in hero damage.");
  if (player.tower_damage > 1500) positives.push("Meaningful contribution to structural damage.");
  if (player.net_worth >= allPlayers.reduce((m, p) => Math.max(m, p.net_worth), 0) * 0.85) positives.push("Among the strongest players by net worth.");
  if (player.deaths >= 10) concerns.push("High death count; review positioning and fight selection.");
  if (player.tower_damage < 300 && player.kills + player.assists > 8) concerns.push("Low building damage relative to combat involvement.");
  if (!positives.length) positives.push("Performance is distributed across the recorded match statistics.");
  if (!concerns.length) concerns.push("No major statistical warning is apparent from the available summary fields.");
  return { score, contributions, positives, concerns };
}

export function AnalysisSection({ match }: { match: MatchData }) {
  const ranked = [...match.players].sort((a, b) => playerScore(b, match.players) - playerScore(a, match.players));
  const top = ranked[0];
  const winnerPlayers = match.players.filter(p => match.radiant_win === null || radiant(p) === match.radiant_win);
  const loserPlayers = match.players.filter(p => match.radiant_win !== null && radiant(p) !== match.radiant_win);
  const winnerDamage = winnerPlayers.reduce((s, p) => s + p.hero_damage, 0);
  const loserDamage = loserPlayers.reduce((s, p) => s + p.hero_damage, 0);

  return <div className="analytics-page">
    <Panel title="Match interpretation" subtitle="AUTOMATED STATISTICAL SUMMARY">
      <div className="analytics-insight-grid">
        <div><Award size={20} /><span>Performance leader</span><strong>{top ? playerName(top) : "Unavailable"}</strong><small>{top ? `${playerScore(top, match.players).toFixed(0)} / 100 estimated score` : "No player data"}</small></div>
        <div><Swords size={20} /><span>Combat damage</span><strong>{number(winnerDamage || loserDamage)}</strong><small>{match.radiant_win === null ? "Team result is unknown" : "Hero damage by winning team"}</small></div>
        <div><Users size={20} /><span>Match data</span><strong>{match.players.length} players</strong><small>{match.is_parsed ? "Parsed player statistics" : "Partial match data"}</small></div>
      </div>
      <p className="analytics-method-note">Performance score is a heuristic indicator calculated from KDA, GPM, hero damage, tower damage, teamfight participation (when supplied) and healing. It is not an official Dota 2 rating and should not be interpreted as a causal measure of a player's impact.</p>
    </Panel>
    <Panel title="Player performance ranking" subtitle="RELATIVE SCORE WITHIN THIS MATCH">
      <div className="analytics-ranking">
        {ranked.map((p, index) => <div className="analytics-ranking-row" key={p.player_slot}>
          <span className="analytics-rank">{index + 1}</span>
          {p.hero_image ? <img src={p.hero_image} alt={p.hero_name || "Hero"} /> : <div className="analytics-hero-fallback">?</div>}
          <div className="analytics-ranking-name"><strong>{playerName(p)}</strong><small>{p.hero_name || "Unknown hero"} · {radiant(p) ? "Radiant" : "Dire"}</small></div>
          <div className="analytics-score-track"><span style={{ width: `${playerScore(p, match.players)}%` }} /></div>
          <strong className="analytics-score-value">{playerScore(p, match.players).toFixed(0)}</strong>
        </div>)}
      </div>
    </Panel>
    {top && <Panel title={`Detailed insight · ${playerName(top)}`} subtitle={top.hero_name || "TOP-RANKED PLAYER"}>
      <div className="analytics-insight-columns">
        <div><h3><TrendingUp size={16} /> Positive indicators</h3>{playerInsight(top, match.players).positives.map((x, i) => <p key={i}>{x}</p>)}</div>
        <div><h3><Shield size={16} /> Review points</h3>{playerInsight(top, match.players).concerns.map((x, i) => <p key={i}>{x}</p>)}</div>
      </div>
    </Panel>}
  </div>;
}

export function PlayerDetail({ player, players, onClose }: {
  player: MatchPlayer; players: MatchPlayer[]; onClose: () => void;
}) {
  const insight = playerInsight(player, players);
  return <div className="analytics-player-detail">
    <div className="analytics-detail-header">
      <div><span>PLAYER PERFORMANCE</span><h2>{playerName(player)}</h2><p>{player.hero_name || "Unknown hero"} · Level {player.level} · {radiant(player) ? "Radiant" : "Dire"}</p></div>
      <button onClick={onClose} aria-label="Close player details">×</button>
    </div>
    <div className="analytics-detail-grid">
      <Metric label="K / D / A" value={`${player.kills}/${player.deaths}/${player.assists}`} icon={Swords} />
      <Metric label="KDA RATIO" value={kda(player).toFixed(2)} icon={Activity} />
      <Metric label="NET WORTH" value={number(player.net_worth)} icon={TrendingUp} />
      <Metric label="GPM / XPM" value={`${player.gold_per_min} / ${player.xp_per_min}`} icon={Award} />
      <Metric label="HERO DAMAGE" value={number(player.hero_damage)} icon={Crosshair} />
      <Metric label="TOWER DAMAGE" value={number(player.tower_damage)} icon={Target} />
      <Metric label="HEALING" value={number(player.hero_healing)} icon={Heart} />
      <Metric label="LAST HITS / DENIES" value={`${player.last_hits} / ${player.denies}`} icon={Shield} />
    </div>
    <div className="analytics-player-scoreline"><span>Estimated performance</span><strong>{insight.score.toFixed(0)} / 100</strong></div>
    <div className="analytics-detail-columns">
      <div><h3>Strengths</h3>{insight.positives.map((x, i) => <p key={i}>{x}</p>)}</div>
      <div><h3>Review points</h3>{insight.concerns.map((x, i) => <p key={i}>{x}</p>)}</div>
    </div>
    <div className="analytics-extra-stats">
      <span>Stuns: {Number(player.stuns || 0).toFixed(1)}</span>
      <span>Observers: {player.obs_placed ?? 0}</span>
      <span>Sentries: {player.sen_placed ?? 0}</span>
      <span>Roshan kills: {player.roshan_kills ?? 0}</span>
      <span>Buybacks: {player.buyback_count ?? 0}</span>
    </div>
  </div>;
}
