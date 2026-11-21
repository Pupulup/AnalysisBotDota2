
import { useState } from "react";

import {
  Swords,
  Users,
  ChartNoAxesCombined,
  Trophy,
  Activity,
  ChevronRight,
  Search,
  Clock,
  Shield,
  RefreshCw,
  Target,
  Coins,
  Heart,
  Crosshair,
  X,
  TrendingUp
} from "lucide-react";

import "./App.css";


interface MatchPlayer {
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
}


interface Match {
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
}


const API_URL = "";


const navigation = [
  { name: "Overview", icon: Activity },
  { name: "Players", icon: Users },
  { name: "Timeline", icon: ChartNoAxesCombined },
  { name: "Teams", icon: Swords },
  { name: "Analysis", icon: Trophy }
];


function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}


function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value || 0);
}


function getPlayerName(player: MatchPlayer) {
  return (
    player.personaname ||
    player.name ||
    (player.account_id
      ? `Player ${player.account_id}`
      : "Anonymous player")
  );
}


function getKda(player: MatchPlayer) {
  return (
    (player.kills + player.assists) /
    Math.max(player.deaths, 1)
  );
}


function StatCard({
  label,
  value,
  icon: Icon
}: {
  label: string;
  value: string;
  icon: typeof Coins;
}) {
  return (
    <div className="detail-stat-card">
      <div className="detail-stat-icon">
        <Icon size={18} />
      </div>

      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}


function App() {
  const [matchId, setMatchId] = useState("");
  const [match, setMatch] = useState<Match | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [activeTab, setActiveTab] = useState("Overview");

  const [selectedPlayer, setSelectedPlayer] =
    useState<MatchPlayer | null>(null);


  async function analyzeMatch() {
    const normalizedId = matchId.trim();

    if (!/^\d+$/.test(normalizedId)) {
      setError("Введите корректный Match ID.");
      return;
    }

    if (BigInt(normalizedId) <= 0n) {
      setError("Match ID должен быть больше нуля.");
      return;
    }

    setLoading(true);
    setError("");
    setMatch(null);
    setSelectedPlayer(null);

    try {
      const response = await fetch(
        `${API_URL}/api/matches/${normalizedId}`
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.detail || "Не удалось получить матч."
        );
      }

      setMatch(result);
      setActiveTab("Overview");

    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Неизвестная ошибка."
      );
    } finally {
      setLoading(false);
    }
  }


  const radiantPlayers =
    match?.players.filter(
      player => player.player_slot < 128
    ) || [];

  const direPlayers =
    match?.players.filter(
      player => player.player_slot >= 128
    ) || [];


  function renderPlayer(player: MatchPlayer) {
    const kda = getKda(player);

    return (
      <button
        className="player-row"
        key={player.player_slot}
        onClick={() => setSelectedPlayer(player)}
      >

        <div className="player-info">

          {player.hero_image ? (
            <img
              className="hero-portrait"
              src={player.hero_image}
              alt={player.hero_name || "Hero"}
              loading="lazy"
            />
          ) : (
            <div className="hero-placeholder">
              {player.hero_id ?? "?"}
            </div>
          )}

          <div className="player-name">
            <strong>{getPlayerName(player)}</strong>

            <span>
              {player.hero_name || "Unknown Hero"}
              {" · "}LVL {player.level}
            </span>
          </div>

        </div>


        <div className="player-kda">
          <strong>
            {player.kills}/{player.deaths}/{player.assists}
          </strong>
          <span>K / D / A</span>
        </div>


        <div className="player-stat">
          <strong>{player.gold_per_min}</strong>
          <span>GPM</span>
        </div>


        <div className="player-stat">
          <strong>{player.xp_per_min}</strong>
          <span>XPM</span>
        </div>


        <div className="player-stat">
          <strong>{kda.toFixed(2)}</strong>
          <span>KDA</span>
        </div>

        <ChevronRight
          size={16}
          className="player-chevron"
        />

      </button>
    );
  }


  return (
    <div className="app">

      <aside className="sidebar">

        <div className="brand">
          <div className="brand-icon">
            <Swords size={23} />
          </div>

          <div>
            <h2>DOTA</h2>
            <span>ANALYTICS</span>
          </div>
        </div>


        <div className="nav-label">WORKSPACE</div>

        <nav>
          {navigation.map(item => {
            const Icon = item.icon;

            return (
              <button
                key={item.name}
                className={`nav-item ${
                  activeTab === item.name ? "active" : ""
                }`}
                onClick={() => {
                  setActiveTab(item.name);
                  setSelectedPlayer(null);
                }}
              >
                <Icon size={19} />
                <span>{item.name}</span>

                {activeTab === item.name && (
                  <div className="active-indicator" />
                )}
              </button>
            );
          })}
        </nav>


        <div className="sidebar-footer">
          <div className="status-dot" />
          API SYSTEM ONLINE
        </div>

      </aside>


      <main className="main">

        <header className="topbar">

          <div>
            <span className="breadcrumb">WORKSPACE /</span>
            <span className="breadcrumb-current">
              {" "}{activeTab.toUpperCase()}
            </span>
          </div>

          <div className="version">BETA 1.0</div>

        </header>


        <section className="content">

          <div className="page-heading">
            <div>
              <div className="eyebrow">MATCH CENTER</div>
              <h1>Match Overview</h1>
              <p>
                Detailed Dota 2 match analytics platform.
              </p>
            </div>
          </div>


          <div className="search-panel">

            <Search size={19} />

            <input
              value={matchId}
              onChange={event => setMatchId(event.target.value)}
              onKeyDown={event => {
                if (event.key === "Enter") {
                  analyzeMatch();
                }
              }}
              placeholder="Enter Dota 2 Match ID..."
              inputMode="numeric"
            />

            <button
              className="analyze-button"
              onClick={analyzeMatch}
              disabled={loading}
            >
              {loading ? (
                <>
                  <RefreshCw size={16} className="spin" />
                  Loading
                </>
              ) : (
                <>
                  Analyze
                  <ChevronRight size={17} />
                </>
              )}
            </button>

          </div>


          {error && (
            <div className="error-panel">
              <Shield size={19} />
              <span>{error}</span>
            </div>
          )}


          {loading && (
            <div className="loading-panel">
              <RefreshCw size={24} className="spin" />
              <span>Loading match data...</span>
            </div>
          )}


          {!match && !loading && !error && (
            <div className="empty-state">
              <div className="empty-icon">
                <Swords size={35} />
              </div>

              <h2>Ready to analyze</h2>

              <p>
                Enter a Dota 2 Match ID to load match statistics.
              </p>
            </div>
          )}


          {match && (
            <>

              <div className="section-heading">
                <div>
                  <h2>Match Overview</h2>
                  <span>MATCH #{match.match_id}</span>
                </div>

                <div className="parsed-badge">
                  {match.is_parsed ? "PARSED" : "NOT PARSED"}
                </div>
              </div>


              <section className="match-card">

                <div className="match-meta">
                  <span>MATCH #{match.match_id}</span>

                  <span>
                    <Clock size={12} />
                    {formatDuration(match.duration)}
                  </span>

                  <span>
                    {match.human_players ?? 10} PLAYERS
                  </span>
                </div>


                <div className="scoreboard">

                  <div className="team radiant">
                    <span className="team-label">RADIANT</span>
                    <strong>{match.radiant_score}</strong>

                    <span className="team-result">
                      {match.radiant_win === null
                        ? "UNKNOWN"
                        : match.radiant_win
                          ? "VICTORY"
                          : "DEFEAT"}
                    </span>
                  </div>


                  <div className="score-divider">
                    <span>VS</span>
                  </div>


                  <div className="team dire">
                    <span className="team-label">DIRE</span>
                    <strong>{match.dire_score}</strong>

                    <span className="team-result">
                      {match.radiant_win === null
                        ? "UNKNOWN"
                        : !match.radiant_win
                          ? "VICTORY"
                          : "DEFEAT"}
                    </span>
                  </div>

                </div>


                <div className="match-stats">

                  <div>
                    <span>RADIANT SCORE</span>
                    <strong className="positive">
                      {match.radiant_score}
                    </strong>
                  </div>

                  <div>
                    <span>DIRE SCORE</span>
                    <strong className="negative">
                      {match.dire_score}
                    </strong>
                  </div>

                  <div>
                    <span>DURATION</span>
                    <strong>
                      {formatDuration(match.duration)}
                    </strong>
                  </div>

                </div>

              </section>


              {!match.is_parsed && (
                <div className="error-panel">
                  <Shield size={19} />
                  <span>
                    OpenDota has not parsed this match yet.
                  </span>
                </div>
              )}


              {match.is_parsed && (
                <>

                  <div className="section-heading">
                    <div>
                      <h2>Player Statistics</h2>
                      <span>
                        SELECT A PLAYER TO VIEW DETAILED ANALYTICS
                      </span>
                    </div>
                  </div>


                  <div className="players-section">

                    <div className="players-team radiant-team">

                      <div className="players-team-heading">
                        <span>RADIANT</span>
                        <span>{radiantPlayers.length} PLAYERS</span>
                      </div>

                      <div className="players-table-header">
                        <span>PLAYER / HERO</span>
                        <span>K / D / A</span>
                        <span>GPM</span>
                        <span>XPM</span>
                        <span>KDA</span>
                        <span></span>
                      </div>

                      {radiantPlayers.map(renderPlayer)}

                    </div>


                    <div className="players-team dire-team">

                      <div className="players-team-heading">
                        <span>DIRE</span>
                        <span>{direPlayers.length} PLAYERS</span>
                      </div>

                      <div className="players-table-header">
                        <span>PLAYER / HERO</span>
                        <span>K / D / A</span>
                        <span>GPM</span>
                        <span>XPM</span>
                        <span>KDA</span>
                        <span></span>
                      </div>

                      {direPlayers.map(renderPlayer)}

                    </div>

                  </div>


                  {selectedPlayer && (
                    <section className="player-detail">

                      <div className="player-detail-heading">

                        <div className="detail-title">
                          <span>PLAYER PERFORMANCE</span>
                          <h2>{getPlayerName(selectedPlayer)}</h2>
                          <p>
                            {selectedPlayer.hero_name || "Unknown Hero"}
                            {" · "}LEVEL {selectedPlayer.level}
                          </p>
                        </div>

                        <button
                          className="close-detail"
                          onClick={() => setSelectedPlayer(null)}
                          aria-label="Close player details"
                        >
                          <X size={20} />
                        </button>

                      </div>


                      <div className="detail-hero">

                        {selectedPlayer.hero_image && (
                          <img
                            src={selectedPlayer.hero_image}
                            alt={selectedPlayer.hero_name || "Hero"}
                          />
                        )}

                        <div>
                          <span>HERO</span>
                          <h3>{selectedPlayer.hero_name}</h3>
                          <p>
                            {selectedPlayer.player_slot < 128
                              ? "RADIANT"
                              : "DIRE"}
                          </p>
                        </div>

                        <div className="detail-kda">
                          <span>K / D / A</span>
                          <strong>
                            {selectedPlayer.kills}/
                            {selectedPlayer.deaths}/
                            {selectedPlayer.assists}
                          </strong>
                          <small>
                            KDA RATIO: {getKda(selectedPlayer).toFixed(2)}
                          </small>
                        </div>

                      </div>


                      <div className="detail-grid">

                        <StatCard
                          label="NET WORTH"
                          value={formatNumber(selectedPlayer.net_worth)}
                          icon={Coins}
                        />

                        <StatCard
                          label="GPM"
                          value={formatNumber(selectedPlayer.gold_per_min)}
                          icon={TrendingUp}
                        />

                        <StatCard
                          label="XPM"
                          value={formatNumber(selectedPlayer.xp_per_min)}
                          icon={Activity}
                        />

                        <StatCard
                          label="HERO DAMAGE"
                          value={formatNumber(selectedPlayer.hero_damage)}
                          icon={Crosshair}
                        />

                        <StatCard
                          label="TOWER DAMAGE"
                          value={formatNumber(selectedPlayer.tower_damage)}
                          icon={Target}
                        />

                        <StatCard
                          label="HERO HEALING"
                          value={formatNumber(selectedPlayer.hero_healing)}
                          icon={Heart}
                        />

                        <StatCard
                          label="LAST HITS"
                          value={formatNumber(selectedPlayer.last_hits)}
                          icon={Swords}
                        />

                        <StatCard
                          label="DENIES"
                          value={formatNumber(selectedPlayer.denies)}
                          icon={Shield}
                        />

                      </div>

                    </section>
                  )}

                </>
              )}

            </>
          )}


          <footer>
            DOTA ANALYTICS
            <span>·</span>
            POWERED BY OPENDOTA
          </footer>

        </section>

      </main>

    </div>
  );
}


export default App;
