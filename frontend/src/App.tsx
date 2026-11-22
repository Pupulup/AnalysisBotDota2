import { useEffect, useState } from "react";
import {
  Swords, ChartNoAxesCombined, Trophy, Activity,
  ChevronRight, Search, Clock, Shield, RefreshCw, Package, Coins, BrainCircuit, BookOpen, User
} from "lucide-react";
import {
  AnalysisSection,
  MatchData,
  MatchPlayer,
  OverviewSection,
  PlayerDetail,
  TimelineSection
} from "./components/AnalyticsSections";
import AdvancedAnalytics from "./components/AdvancedAnalytics";
import DecisionAnalysis from "./components/DecisionAnalysis";
import Guides from "./components/Guides";
import PlayerProfile from "./components/PlayerProfile";
import { I18nProvider, Localize } from "./i18n";
import type { Language } from "./i18n";
import "./App.css";

const API_URL = "";

const navigation = [
  { name: "Overview", icon: Activity },
  { name: "Timeline", icon: ChartNoAxesCombined },
  { name: "Analysis", icon: Trophy },
  { name: "Review", icon: BrainCircuit },
  { name: "Items", icon: Package },
  { name: "Economy", icon: Coins },
  { name: "Guides", icon: BookOpen },
  { name: "Player", icon: User },
  // { name: "Trends", icon: TrendingUp }, // Temporarily hidden; may return later.
];

function modeCategoryLabel(category: string | undefined, language: Language) {
  const labels: Record<string, [string, string]> = {
    ranked: ["RANKED", "РЕЙТИНГОВЫЙ"],
    turbo: ["TURBO", "ТУРБО"],
    unranked: ["UNRANKED", "ОБЫЧНЫЙ ПОДБОР"],
    other: ["OTHER MODE", "ДРУГОЙ РЕЖИМ"],
    unknown: ["UNKNOWN", "НЕИЗВЕСТНО"],
  };
  const pair = labels[category || "unknown"] || labels.unknown;
  return language === "ru" ? pair[1] : pair[0];
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

function App() {
  const [matchId, setMatchId] = useState("");
  const [match, setMatch] = useState<MatchData | null>(null);
  const [loading, setLoading] = useState(false);
  const [parseLoading, setParseLoading] = useState(false);
  const [parseMessage, setParseMessage] = useState("");
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
    setParseMessage("");
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

  async function requestMatchParse() {
    if (!match) return;
    setParseLoading(true);
    setParseMessage("");
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/matches/${match.match_id}/parse`, { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail || "Не удалось отправить запрос на обработку реплея.");
      setParseMessage("Запрос отправлен в OpenDota. Обработка может занять несколько минут. После завершения нажмите Analyze ещё раз.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось запросить обработку матча.");
    } finally {
      setParseLoading(false);
    }
  }

  function renderActiveSection() {
    if (!match || activeTab === "Player") return null;
    switch (activeTab) {
      case "Timeline":
        return <TimelineSection match={match} />;
      case "Analysis":
        return <AnalysisSection match={match} />;
      case "Review":
        return <><DecisionAnalysis match={match} language={language} /><AdvancedAnalytics match={match} language={language} section="Fights" /></>;
      case "Guides":
        return <Guides language={language} />;
      case "Items":
      case "Economy":
        return <AdvancedAnalytics match={match} language={language} section={activeTab as "Items" | "Economy"} />;
      case "Overview":
      default:
        return <OverviewSection match={match} onSelect={setSelectedPlayer} />;
    }
  }

  const activeTitle: Record<string, string> = {
    Overview: "Match Overview",
    Timeline: "Match Timeline",
    Analysis: "Match Analysis",
    Review: "Match Review",
    Guides: "Hero Guides",
    Player: "Player Performance",
    Items: "Item Builds",
    Economy: "Economy Analysis",

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

          {activeTab !== "Player" && <div className="search-panel">
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
          </div>}

          {error && activeTab !== "Player" && <div className="error-panel"><Shield size={19} /><span>{error}</span></div>}
          {loading && activeTab !== "Player" && <div className="loading-panel"><RefreshCw size={24} className="spin" /><span>Loading match data...</span></div>}

          {!match && !loading && !error && activeTab !== "Guides" && activeTab !== "Player" && (
            <div className="empty-state">
              <div className="empty-icon"><Swords size={35} /></div>
              <h2>Ready to analyze</h2>
              <p>Enter a Dota 2 Match ID to load match statistics.</p>
            </div>
          )}

          {!match && activeTab === "Guides" && <Guides language={language} />}
          {activeTab === "Player" && <PlayerProfile language={language} />}

          {match && activeTab !== "Player" && (
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
                  <span>{match.game_mode_name || "UNKNOWN MODE"} · {match.lobby_type_name || "UNKNOWN LOBBY"}</span>
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

              <div className="match-meta">
                <span>MODE CATEGORY: {modeCategoryLabel(match.mode_category, language)}</span>
                <span>DATA SOURCE: {match.data_source?.toUpperCase() || "OPENDOTA"}</span>
                {match.replay_age_days !== null && match.replay_age_days !== undefined && (
                  <span>REPLAY AGE: {match.replay_age_days} DAYS</span>
                )}
              </div>
              {!match.is_parsed && match.replay_analysis_allowed && (
                <div className="error-panel"><Shield size={19} /><span>Replay events are not available yet. You can request replay parsing as a fallback.</span><button className="analyze-button" onClick={requestMatchParse} disabled={parseLoading}>{parseLoading ? "Sending..." : "Request replay parsing"}</button></div>
              )}
              {!match.replay_analysis_allowed && (
                <div className="error-panel"><Shield size={19} /><span>This match is older than 90 days or its date is unavailable. Replay parsing is disabled; available match statistics can still be viewed.</span></div>
              )}
              {parseMessage && <div className="loading-panel"><span>{parseMessage}</span></div>}

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

          <footer>DOTA ANALYTICS <span>·</span> POWERED BY STRATZ / OPENDOTA</footer>
        </section>
      </main>
    </div>
    </Localize>
    </I18nProvider>
  );
}

export default App;
