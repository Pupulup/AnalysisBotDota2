import { useEffect, useState } from "react";
import {
  Swords, Users, ChartNoAxesCombined, Trophy, Activity,
  ChevronRight, Search, Clock, Shield, RefreshCw, Flame, Package, Coins, ShieldCheck, TrendingUp
} from "lucide-react";
import {
  AnalysisSection,
  MatchData,
  MatchPlayer,
  OverviewSection,
  PlayersSection,
  PlayerDetail,
  TimelineSection,
  TeamsSection
} from "./components/AnalyticsSections";
import AdvancedAnalytics from "./components/AdvancedAnalytics";
import { I18nProvider, Language, Localize } from "./i18n";
import "./App.css";

const API_URL = "";

const navigation = [
  { name: "Overview", icon: Activity },
  { name: "Players", icon: Users },
  { name: "Timeline", icon: ChartNoAxesCombined },
  { name: "Teams", icon: Swords },
  { name: "Analysis", icon: Trophy },
  { name: "Fights", icon: Flame },
  { name: "Items", icon: Package },
  { name: "Economy", icon: Coins },
  { name: "Roles", icon: ShieldCheck },
  { name: "Trends", icon: TrendingUp }
];

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

function App() {
  const [matchId, setMatchId] = useState("");
  const [match, setMatch] = useState<MatchData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("Overview");
  const [selectedPlayer, setSelectedPlayer] = useState<MatchPlayer | null>(null);
  const [language, setLanguage] = useState<Language>(() => {
    try { return localStorage.getItem("dota-analytics-language") === "ru" ? "ru" : "en"; }
    catch { return "en"; }
  });

  useEffect(() => {
    try { localStorage.setItem("dota-analytics-language", language); } catch { /* storage may be unavailable */ }
    document.documentElement.lang = language;
  }, [language]);

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
      const response = await fetch(`${API_URL}/api/matches/${normalizedId}`);
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.detail || "Не удалось получить матч.");
      }
      setMatch(result as MatchData);
      setActiveTab("Overview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка.");
    } finally {
      setLoading(false);
    }
  }

  function renderActiveSection() {
    if (!match) return null;
    switch (activeTab) {
      case "Players":
        return <PlayersSection match={match} onSelect={setSelectedPlayer} />;
      case "Timeline":
        return <TimelineSection match={match} />;
      case "Teams":
        return <TeamsSection match={match} />;
      case "Analysis":
        return <AnalysisSection match={match} />;
      case "Fights":
      case "Items":
      case "Economy":
      case "Roles":
      case "Trends":
        return <AdvancedAnalytics match={match} language={language} section={activeTab as "Fights" | "Items" | "Economy" | "Roles" | "Trends"} />;
      case "Overview":
      default:
        return <OverviewSection match={match} />;
    }
  }

  const activeTitle: Record<string, string> = {
    Overview: "Match Overview",
    Players: "Player Statistics",
    Timeline: "Match Timeline",
    Teams: "Team Comparison",
    Analysis: "Match Analysis",
    Fights: "Teamfight Analysis",
    Items: "Item Builds",
    Economy: "Economy Analysis",
    Roles: "Role Analysis",
    Trends: "Player Trends"
  };

  return (
    <I18nProvider language={language}>
    <Localize language={language}>
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon"><Swords size={23} /></div>
          <div><h2>DOTA</h2><span>ANALYTICS</span></div>
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav>
          {navigation.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.name}
                className={`nav-item ${activeTab === item.name ? "active" : ""}`}
                onClick={() => {
                  setActiveTab(item.name);
                  setSelectedPlayer(null);
                }}
              >
                <Icon size={19} />
                <span>{item.name}</span>
                {activeTab === item.name && <div className="active-indicator" />}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-footer"><div className="status-dot" />API SYSTEM ONLINE</div>
      </aside>
      <nav className="mobile-nav" aria-label="Main navigation">
        {navigation.map(item => { const Icon = item.icon; return <button key={item.name} className={activeTab === item.name ? "active" : ""} onClick={() => { setActiveTab(item.name); setSelectedPlayer(null); }}><Icon size={17}/><span>{item.name}</span></button>; })}
      </nav>

      <main className="main">
        <header className="topbar">
          <div>
            <span className="breadcrumb">WORKSPACE /</span>
            <span className="breadcrumb-current"> {activeTab.toUpperCase()}</span>
          </div>
          <div className="topbar-actions">
            <label className="language-switcher"><span>LANG</span><select aria-label="Interface language" value={language} onChange={event => setLanguage(event.target.value as Language)}><option value="en">English</option><option value="ru">Русский</option></select></label>
            <div className="version">BETA 1.2</div>
          </div>
        </header>

        <section className="content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">MATCH CENTER</div>
              <h1>{activeTitle[activeTab]}</h1>
              <p>Detailed Dota 2 match analytics platform.</p>
            </div>
          </div>

          <div className="search-panel">
            <Search size={19} />
            <input
              value={matchId}
              onChange={event => setMatchId(event.target.value)}
              onKeyDown={event => {
                if (event.key === "Enter") analyzeMatch();
              }}
              placeholder="Enter Dota 2 Match ID..."
              inputMode="numeric"
            />
            <button className="analyze-button" onClick={analyzeMatch} disabled={loading}>
              {loading ? <><RefreshCw size={16} className="spin" />Loading</> : <>Analyze<ChevronRight size={17} /></>}
            </button>
          </div>

          {error && <div className="error-panel"><Shield size={19} /><span>{error}</span></div>}
          {loading && <div className="loading-panel"><RefreshCw size={24} className="spin" /><span>Loading match data...</span></div>}

          {!match && !loading && !error && (
            <div className="empty-state">
              <div className="empty-icon"><Swords size={35} /></div>
              <h2>Ready to analyze</h2>
              <p>Enter a Dota 2 Match ID to load match statistics.</p>
            </div>
          )}

          {match && (
            <>
              <div className="section-heading">
                <div>
                  <h2>Match #{match.match_id}</h2>
                  <span><Clock size={12} /> {formatDuration(match.duration)} · {match.players.length} PLAYERS</span>
                </div>
                <div className="parsed-badge">{match.is_parsed ? "PARSED" : "NOT PARSED"}</div>
              </div>

              <section className="match-card">
                <div className="match-meta">
                  <span>MATCH #{match.match_id}</span>
                  <span><Clock size={12} />{formatDuration(match.duration)}</span>
                  <span>{match.human_players ?? match.players.length} PLAYERS</span>
                </div>
                <div className="scoreboard">
                  <div className="team radiant">
                    <span className="team-label">RADIANT</span>
                    <strong>{match.radiant_score}</strong>
                    <span className="team-result">{match.radiant_win === null ? "UNKNOWN" : match.radiant_win ? "VICTORY" : "DEFEAT"}</span>
                  </div>
                  <div className="score-divider"><span>VS</span></div>
                  <div className="team dire">
                    <span className="team-label">DIRE</span>
                    <strong>{match.dire_score}</strong>
                    <span className="team-result">{match.radiant_win === null ? "UNKNOWN" : !match.radiant_win ? "VICTORY" : "DEFEAT"}</span>
                  </div>
                </div>
                <div className="match-stats">
                  <div><span>RADIANT SCORE</span><strong className="positive">{match.radiant_score}</strong></div>
                  <div><span>DIRE SCORE</span><strong className="negative">{match.dire_score}</strong></div>
                  <div><span>DURATION</span><strong>{formatDuration(match.duration)}</strong></div>
                </div>
              </section>

              {!match.is_parsed && (
                <div className="error-panel"><Shield size={19} /><span>OpenDota has not parsed full player data for this match. Some sections may be incomplete.</span></div>
              )}

              {renderActiveSection()}

              {selectedPlayer && (
                <PlayerDetail
                  player={selectedPlayer}
                  players={match.players}
                  onClose={() => setSelectedPlayer(null)}
                />
              )}
            </>
          )}

          <footer>DOTA ANALYTICS <span>·</span> POWERED BY OPENDOTA</footer>
        </section>
      </main>
    </div>
    </Localize>
    </I18nProvider>
  );
}

export default App;
