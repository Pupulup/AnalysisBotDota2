import { useState } from "react";
import type { ReactNode } from "react";
import ReactECharts from "echarts-for-react";

type Lang = "en" | "ru";
type Mode = "ranked" | "turbo" | "unranked" | "other";
type Summary = {
  matches: number; wins: number; losses: number; win_rate: number | null;
  avg_gpm: number | null; avg_xpm: number | null; avg_kda: number | null;
  avg_kills: number | null; avg_deaths: number | null; avg_assists: number | null;
  avg_hero_damage: number | null; avg_last_hits: number | null; avg_duration: number | null;
};
type PlayerAnalytics = {
  account_id: number;
  profile: { personaname: string; avatarfull?: string | null; rank_tier?: number | null; leaderboard_rank?: number | null };
  patch: { id: number; name: string; date: string };
  mode_category: Mode;
  sample: { count: number; level: "low" | "moderate" | "large"; requested: number };
  summary: Summary;
  recent_period: Summary;
  previous_period: Summary | null;
  period_delta: Record<string, number | null> | null;
  insights: Array<{ code: string; severity: "warning" | "info" | "positive"; delta: number | null }>;
  role_breakdown: Array<{ label: string; matches: number; win_rate: number | null; avg_gpm: number | null; avg_xpm: number | null; avg_kda: number | null }>;
  hero_breakdown: Array<{ hero_id: number; hero_name: string; hero_image?: string | null; matches: number; win_rate: number | null; avg_gpm: number | null; avg_kda: number | null }>;
  trend: Array<{ match_id: number; start_time: number; win: boolean | null; hero_name: string; hero_image?: string | null; lane_role_name: string; kills: number; deaths: number; assists: number; gold_per_min: number | null; xp_per_min: number | null; hero_damage: number | null }>;
};

const copy = (lang: Lang, en: string, ru: string) => lang === "ru" ? ru : en;
const number = (value: number | null | undefined, digits = 0) =>
  value == null ? "—" : new Intl.NumberFormat("en-US", { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value);
const dateLabel = (timestamp: number | null | undefined) =>
  timestamp ? new Date(timestamp * 1000).toLocaleDateString() : "—";
const rankLabel = (tier?: number | null) => {
  if (!tier) return "—";
  const names = ["", "Herald", "Guardian", "Crusader", "Archon", "Legend", "Ancient", "Divine", "Immortal"];
  return names[Math.floor(tier / 10)] || "Rank unavailable";
};

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return <section className="player-analytics-panel"><header><div><h2>{title}</h2>{subtitle && <span>{subtitle}</span>}</div></header>{children}</section>;
}

export default function PlayerProfile({ language }: { language: Lang }) {
  const [accountId, setAccountId] = useState("");
  const [mode, setMode] = useState<Mode>("ranked");
  const [limit, setLimit] = useState("50");
  const [data, setData] = useState<PlayerAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadProfile() {
    const id = accountId.trim();
    if (!/^\d+$/.test(id) || Number(id) <= 0 || Number(id) > 4294967295) {
      setError(copy(language, "Enter a valid Steam32 account ID.", "Введите корректный Steam32 account ID."));
      return;
    }
    setLoading(true);
    setError("");
    setData(null);
    try {
      const response = await fetch(`/api/players/${id}/analytics?mode=${mode}&limit=${limit}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail || copy(language, "Could not load player analytics.", "Не удалось загрузить аналитику игрока."));
      setData(result as PlayerAnalytics);
    } catch (err) {
      setError(err instanceof Error ? err.message : copy(language, "Unexpected error.", "Неизвестная ошибка."));
    } finally {
      setLoading(false);
    }
  }

  const summary = data?.summary;
  const sampleLabel = data?.sample.level === "large"
    ? copy(language, "Large sample", "Большая выборка")
    : data?.sample.level === "moderate"
      ? copy(language, "Moderate sample", "Средняя выборка")
      : copy(language, "Small sample", "Малая выборка");

  const trendOption = data ? {
    tooltip: { trigger: "axis" },
    legend: { textStyle: { color: "#9aa9bd" } },
    grid: { left: 55, right: 55, top: 35, bottom: 45 },
    xAxis: { type: "category", data: data.trend.map(m => dateLabel(m.start_time)), axisLabel: { color: "#8290a5", rotate: 25 } },
    yAxis: [
      { type: "value", name: "GPM", axisLabel: { color: "#8290a5" }, splitLine: { lineStyle: { color: "#29374c" } } },
      { type: "value", name: "XPM", position: "right", axisLabel: { color: "#8290a5" }, splitLine: { show: false } },
    ],
    series: [
      { name: "GPM", type: "line", smooth: true, showSymbol: false, data: data.trend.map(m => m.gold_per_min) },
      { name: "XPM", type: "line", smooth: true, showSymbol: false, yAxisIndex: 1, data: data.trend.map(m => m.xp_per_min) },
    ],
  } : {};

  return <div className="player-analytics-page">
    <Panel title={copy(language, "Player profile", "Профиль игрока")} subtitle={copy(language, "CURRENT GLOBAL PATCH · MODE-SPECIFIC HISTORY", "АКТУАЛЬНЫЙ ГЛОБАЛЬНЫЙ ПАТЧ · ИСТОРИЯ ПО РЕЖИМАМ")}>
      <div className="player-profile-controls">
        <label>{copy(language, "Steam32 account ID", "Steam32 account ID")}
          <input value={accountId} onChange={e => setAccountId(e.target.value)} onKeyDown={e => { if (e.key === "Enter") void loadProfile(); }} inputMode="numeric" placeholder="e.g. 123456789" />
          <small>{copy(language, "Use the numeric Steam32 ID, not the 17-digit SteamID64.", "Укажите числовой Steam32 ID, а не 17-значный SteamID64.")}</small>
        </label>
        <label>{copy(language, "Game mode", "Игровой режим")}
          <select value={mode} onChange={e => setMode(e.target.value as Mode)}>
            <option value="ranked">{copy(language, "Ranked", "Рейтинг")}</option>
            <option value="turbo">Turbo</option>
            <option value="unranked">{copy(language, "Unranked", "Обычный подбор")}</option>
            <option value="other">{copy(language, "Other modes", "Другие режимы")}</option>
          </select>
        </label>
        <label>{copy(language, "Matches", "Матчи")}
          <select value={limit} onChange={e => setLimit(e.target.value)}>
            <option value="10">10</option><option value="20">20</option><option value="50">50</option>
          </select>
        </label>
        <button onClick={() => void loadProfile()} disabled={loading}>{loading ? copy(language, "Loading…", "Загрузка…") : copy(language, "Load analytics", "Загрузить аналитику")}</button>
      </div>
      {error && <div className="player-analytics-error">{error}</div>}
    </Panel>

    {!data && !loading && <div className="player-analytics-empty">
      <strong>{copy(language, "Analyze a player across the current patch", "Анализ игрока в рамках актуального патча")}</strong>
      <span>{copy(language, "Choose a game mode to avoid mixing ranked, Turbo and unranked performance.", "Выберите режим, чтобы не смешивать показатели рейтинга, Turbo и обычного подбора.")}</span>
    </div>}
    {loading && <div className="player-analytics-empty">{copy(language, "Loading player history…", "Загружаем историю игрока…")}</div>}

    {data && summary && <>
      <section className="player-profile-banner">
        {data.profile.avatarfull && <img src={data.profile.avatarfull} alt="" />}
        <div><h2>{data.profile.personaname}</h2><span>Steam32: {data.account_id} · {rankLabel(data.profile.rank_tier)}</span></div>
        <div className="player-profile-patch"><strong>{data.patch.name}</strong><small>{copy(language, "CURRENT PATCH", "ТЕКУЩИЙ ПАТЧ")}</small></div>
      </section>

      <div className="player-profile-meta">
        <span>{copy(language, "Mode", "Режим")}: <b>{mode === "ranked" ? copy(language, "Ranked", "Рейтинг") : mode === "turbo" ? "Turbo" : mode === "unranked" ? copy(language, "Unranked", "Обычный подбор") : copy(language, "Other", "Другие")}</b></span>
        <span>{copy(language, "Matches in sample", "Матчей в выборке")}: <b>{data.sample.count}</b></span>
        <span className={data.sample.level === "low" ? "sample-low" : data.sample.level === "moderate" ? "sample-medium" : "sample-large"}>{sampleLabel}</span>
      </div>

      <div className="player-profile-kpis">
        <div><span>{copy(language, "Win rate", "Винрейт")}</span><strong>{number(summary.win_rate, 1)}%</strong><small>{summary.wins}W / {summary.losses}L</small></div>
        <div><span>GPM</span><strong>{number(summary.avg_gpm)}</strong><small>{copy(language, "Average", "Среднее")}</small></div>
        <div><span>XPM</span><strong>{number(summary.avg_xpm)}</strong><small>{copy(language, "Average", "Среднее")}</small></div>
        <div><span>KDA</span><strong>{number(summary.avg_kda, 2)}</strong><small>{copy(language, "Average", "Среднее")}</small></div>
        <div><span>{copy(language, "Matches", "Матчи")}</span><strong>{summary.matches}</strong><small>{data.patch.name}</small></div>
      </div>

      {data.sample.count < 10 && <div className="player-analytics-warning">{copy(language, "Fewer than 10 matches were found for this mode and patch. Treat all averages as preliminary.", "Для этого режима и патча найдено меньше 10 матчей. Средние показатели пока предварительные.")}</div>}

      <Panel title={copy(language, "Coaching signals", "Сигналы для улучшения")} subtitle={copy(language, "HEURISTIC COMPARISON · NOT CAUSAL PROOF", "ЭВРИСТИЧЕСКОЕ СРАВНЕНИЕ · НЕ ДОКАЗАТЕЛЬСТВО ПРИЧИНЫ")}>
        <div className="player-insights-list">{data.insights.map((insight, index) => {
          const textByCode: Record<string, [string, string]> = {
            deaths_increased: ["Average deaths increased versus the previous 10 matches. Review positioning and death timings.", "Среднее число смертей выросло относительно предыдущих 10 матчей. Проверьте позиционирование и моменты смертей."],
            kda_decreased: ["KDA decreased noticeably. Review fight selection and survival.", "KDA заметно снизился. Проверьте выбор сражений и выживаемость."],
            gpm_decreased: ["GPM decreased. Review farming tempo and downtime between actions.", "GPM снизился. Проверьте темп фарма и простои между действиями."],
            win_rate_decreased: ["Win rate decreased. Review the recent match set rather than attributing the change to one metric.", "Винрейт снизился. Анализируйте последние матчи в целом, не связывая результат с одним показателем."],
            gpm_improved: ["GPM improved compared with the previous period.", "GPM вырос относительно предыдущего периода."],
            kda_improved: ["KDA improved compared with the previous period.", "KDA вырос относительно предыдущего периода."],
            insufficient_history: ["At least 20 matches in this mode and patch are needed to compare two periods.", "Для сравнения двух периодов нужно не менее 20 матчей в этом режиме и патче."],
          };
          const pair = textByCode[insight.code] || ["Review the recent match sample.", "Проверьте выборку последних матчей."];
          return <div className={"player-insight " + insight.severity} key={index}><span>{insight.severity === "warning" ? "!" : insight.severity === "positive" ? "↑" : "i"}</span><p>{copy(language, pair[0], pair[1])}</p></div>;
        })}</div>
      </Panel>

      <Panel title={copy(language, "Performance trend", "Динамика показателей")} subtitle={copy(language, "OLDEST → NEWEST · CURRENT PATCH ONLY", "ОТ СТАРЫХ К НОВЫМ · ТОЛЬКО ТЕКУЩИЙ ПАТЧ")}>
        {data.trend.length ? <div className="player-analytics-chart"><ReactECharts option={trendOption} style={{ height: 300, width: "100%" }} /></div> : <p className="player-analytics-empty">{copy(language, "No matches found for this mode in the current patch.", "В текущем патче не найдено матчей для выбранного режима.")}</p>}
      </Panel>

      <Panel title={copy(language, "Recent 10 vs previous 10", "Последние 10 против предыдущих 10")} subtitle={copy(language, "SAME PATCH · SAME GAME MODE", "ОДИН ПАТЧ · ОДИН ИГРОВОЙ РЕЖИМ")}>
        {data.previous_period && data.period_delta ? <div className="player-compare-grid">
          {(["win_rate", "avg_gpm", "avg_xpm", "avg_kda", "avg_deaths"] as const).map(key => {
            const labels: Record<typeof key, string> = { win_rate: copy(language, "Win rate", "Винрейт"), avg_gpm: "GPM", avg_xpm: "XPM", avg_kda: "KDA", avg_deaths: copy(language, "Deaths", "Смерти") };
            const current = data.recent_period[key];
            const previous = data.previous_period![key];
            const delta = data.period_delta![key];
            return <div key={key}><span>{labels[key]}</span><strong>{number(current, key === "avg_kda" || key === "win_rate" ? 1 : 0)}</strong><small>{copy(language, "Previous", "Ранее")}: {number(previous, key === "avg_kda" || key === "win_rate" ? 1 : 0)} · Δ {delta == null ? "—" : number(delta, 1)}</small></div>;
          })}
        </div> : <div className="player-analytics-empty">{copy(language, "At least 20 matches are required for a period comparison.", "Для сравнения периодов необходимо не менее 20 матчей.")}</div>}
      </Panel>

      <div className="player-analytics-columns">
        <Panel title={copy(language, "Performance by lane role", "Эффективность по линии")} subtitle={copy(language, "SELF-COMPARISON · NOT A GLOBAL ROLE RATING", "СРАВНЕНИЕ С СОБОЙ · НЕ ГЛОБАЛЬНЫЙ РЕЙТИНГ РОЛИ")}>
          <div className="player-analytics-table"><div className="player-analytics-row player-analytics-head"><span>{copy(language, "Lane", "Линия")}</span><span>{copy(language, "Games", "Матчи")}</span><span>Win%</span><span>GPM</span><span>KDA</span></div>
            {data.role_breakdown.map(row => <div className="player-analytics-row" key={row.label}><strong>{row.label}</strong><span>{row.matches}</span><span>{number(row.win_rate, 1)}</span><span>{number(row.avg_gpm)}</span><span>{number(row.avg_kda, 2)}</span></div>)}
            {!data.role_breakdown.length && <p className="player-analytics-empty">{copy(language, "Lane role data is unavailable.", "Данные о линии недоступны.")}</p>}
          </div>
        </Panel>
        <Panel title={copy(language, "Most played heroes", "Чаще всего используемые герои")} subtitle={copy(language, "CURRENT PATCH AND SELECTED MODE", "ТЕКУЩИЙ ПАТЧ И ВЫБРАННЫЙ РЕЖИМ")}>
          <div className="player-hero-list">{data.hero_breakdown.map(hero => <div key={hero.hero_id}>
            {hero.hero_image && <img src={hero.hero_image} alt="" />}
            <strong>{hero.hero_name}</strong><span>{hero.matches} {copy(language, "games", "матчей")}</span><b>{number(hero.win_rate, 1)}%</b>
          </div>)}
          {!data.hero_breakdown.length && <p className="player-analytics-empty">{copy(language, "No hero statistics available.", "Статистика героев недоступна.")}</p>}</div>
        </Panel>
      </div>

      <Panel title={copy(language, "Recent matches", "Последние матчи")} subtitle={copy(language, "ALL ROWS FILTERED TO THE SELECTED MODE AND CURRENT PATCH", "ВСЕ МАТЧИ ОТФИЛЬТРОВАНЫ ПО РЕЖИМУ И ТЕКУЩЕМУ ПАТЧУ")}>
        <div className="player-analytics-table"><div className="player-match-row player-analytics-head"><span>{copy(language, "Date", "Дата")}</span><span>{copy(language, "Hero", "Герой")}</span><span>{copy(language, "Result", "Результат")}</span><span>K/D/A</span><span>GPM</span></div>
          {data.matches.map(match => <div className="player-match-row" key={match.match_id}>
            <span>#{match.match_id}<small>{dateLabel(match.start_time)}</small></span>
            <span className="player-match-hero">{match.hero_image && <img src={match.hero_image} alt="" />}{match.hero_name}</span>
            <span className={match.win === true ? "match-win" : match.win === false ? "match-loss" : ""}>{match.win == null ? "—" : match.win ? copy(language, "Win", "Победа") : copy(language, "Loss", "Поражение")}</span>
            <span>{match.kills}/{match.deaths}/{match.assists}</span><span>{number(match.gold_per_min)}</span>
          </div>)}
          {!data.matches.length && <p className="player-analytics-empty">{copy(language, "No matches found in the current patch.", "В текущем патче матчи не найдены.")}</p>}
        </div>
      </Panel>
    </>}
  </div>;
}

import "./PlayerProfile.css";
