import type { ReactNode } from "react";
import type { MatchData, MatchPlayer } from "./AnalyticsSections";
import { playerName } from "./AnalyticsSections";
import "./DecisionAnalysis.css";

type Lang = "en" | "ru";
type Props = { match: MatchData; language: Lang };
type EventRow = { time: number; label: string; team?: "Radiant" | "Dire"; kind: string };

const copy = (lang: Lang, en: string, ru: string) => lang === "ru" ? ru : en;
const fmt = (value: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Number.isFinite(value) ? value : 0);
const clock = (seconds: number) => {
  const value = Math.max(0, Math.trunc(Number(seconds) || 0));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
};
const radiant = (player: MatchPlayer) => player.player_slot < 128;
const teamName = (isRadiant: boolean, lang: Lang) => copy(lang, isRadiant ? "Radiant" : "Dire", isRadiant ? "Свет" : "Тьма");

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return <section className="analytics-panel decision-panel">
    <div className="analytics-panel-heading"><div><h2>{title}</h2>{subtitle && <span>{subtitle}</span>}</div></div>
    {children}
  </section>;
}

function eventTitle(event: Record<string, any>, lang: Lang) {
  const raw = String(event.type || event.key || "event").toLowerCase();
  if (raw.includes("roshan")) return copy(lang, "Roshan", "Рошан");
  if (raw.includes("tower")) return copy(lang, "Tower objective", "Башня");
  if (raw.includes("barracks")) return copy(lang, "Barracks", "Бараки");
  if (raw.includes("aghanim")) return "Aghanim";
  return String(event.key || event.type || copy(lang, "Objective", "Объект")).replace(/_/g, " ");
}

function DecisionAnalysis({ match, language }: Props) {
  const fights = Array.isArray(match.teamfights) ? match.teamfights : [];
  const objectives = Array.isArray(match.objectives) ? match.objectives : [];
  const gold = Array.isArray(match.radiant_gold_adv) ? match.radiant_gold_adv : [];
  const players = match.players || [];

  const fightRows = fights.map((fight: Record<string, any>, index: number) => {
    const fightPlayers = Array.isArray(fight.players) ? fight.players as Array<Record<string, any>> : [];
    let radiantDeaths = 0;
    let direDeaths = 0;
    let radiantGold = 0;
    let direGold = 0;
    let radiantDamage = 0;
    let direDamage = 0;
    for (const stat of fightPlayers) {
      const isRadiant = Number(stat.player_slot) < 128;
      const deaths = Number(stat.deaths) || 0;
      if (isRadiant) {
        radiantDeaths += deaths;
        radiantGold += Number(stat.gold_delta) || 0;
        radiantDamage += Number(stat.damage) || 0;
      } else {
        direDeaths += deaths;
        direGold += Number(stat.gold_delta) || 0;
        direDamage += Number(stat.damage) || 0;
      }
    }
    const start = Number(fight.start) || 0;
    const end = Number(fight.end) || start;
    const swing = radiantGold - direGold;
    const before = gold.length ? gold[Math.min(gold.length - 1, Math.max(0, Math.floor(start / 60)))] : null;
    const after = gold.length ? gold[Math.min(gold.length - 1, Math.max(0, Math.floor(end / 60)))] : null;
    const advantageChange = before == null || after == null ? null : after - before;
    const nearbyObjective = objectives
      .map((event: Record<string, any>) => ({ event, delta: Number(event.time) - end }))
      .filter((entry: { event: Record<string, any>; delta: number }) => entry.delta >= 0 && entry.delta <= 180)
      .sort((a: { delta: number }, b: { delta: number }) => a.delta - b.delta)[0];
    return {
      index, start, end, radiantDeaths, direDeaths, radiantGold, direGold,
      radiantDamage, direDamage, swing, advantageChange, nearbyObjective
    };
  });

  const objectiveRows: EventRow[] = objectives.map((event: Record<string, any>): EventRow => ({
    time: Number(event.time) || 0,
    label: eventTitle(event, language),
    team: event.team === 0 || event.team === "radiant" ? "Radiant" : event.team === 1 || event.team === "dire" ? "Dire" : undefined,
    kind: String(event.type || "objective")
  })).sort((a, b) => a.time - b.time);

  const criticalFights = [...fightRows]
    .filter(fight => fight.radiantDeaths + fight.direDeaths > 0)
    .sort((a, b) => (b.radiantDeaths + b.direDeaths) - (a.radiantDeaths + a.direDeaths))
    .slice(0, 5);

  const playerRows = players.map(player => {
    const fightStats = fights.flatMap((fight: Record<string, any>) =>
      (Array.isArray(fight.players) ? fight.players : [])
        .filter((stat: Record<string, any>) => Number(stat.player_slot) === player.player_slot)
    );
    const fightDeaths = fightStats.reduce((sum: number, stat: Record<string, any>) => sum + (Number(stat.deaths) || 0), 0);
    const fightDamage = fightStats.reduce((sum: number, stat: Record<string, any>) => sum + (Number(stat.damage) || 0), 0);
    const purchases = Array.isArray(player.purchase_log) ? player.purchase_log : [];
    const meaningfulPurchases = purchases.filter((item: Record<string, any>) => Number(item.time) >= 0 && Number(item.time) <= match.duration);
    const earlyPurchases = meaningfulPurchases.filter((item: Record<string, any>) => Number(item.time) <= 15 * 60).length;
    return { player, fightDeaths, fightDamage, earlyPurchases, purchaseCount: meaningfulPurchases.length };
  }).sort((a, b) => b.fightDeaths - a.fightDeaths);

  const allPurchaseCount = players.reduce((sum, player) => sum + (Array.isArray(player.purchase_log) ? player.purchase_log.length : 0), 0);
  const purchaseRows = players.flatMap(player =>
    (Array.isArray(player.purchase_log) ? player.purchase_log : [])
      .filter((item: Record<string, any>) => Number(item.time) >= 0 && Number(item.time) <= match.duration)
      .map((item: Record<string, any>) => ({ player, item, time: Number(item.time) || 0 }))
  ).sort((a, b) => a.time - b.time).slice(0, 18);

  const hasAnyData = fights.length > 0 || objectives.length > 0 || players.some(player => (player.purchase_log || []).length > 0);

  return <div className="analytics-page decision-analysis">
    <Panel title={copy(language, "Match decision analysis", "Анализ ключевых решений")} subtitle={copy(language, "FIGHT SWINGS · OBJECTIVES · PLAYER RISK · ITEM TIMING", "ПЕРЕЛОМЫ В СРАЖЕНИЯХ · ОБЪЕКТЫ · РИСК ИГРОКОВ · ТАЙМИНГИ ПРЕДМЕТОВ")}>
      <div className="decision-intro">{copy(language,
        "This report highlights events that deserve review: costly fights, deaths shortly before objectives, player death patterns and purchase timing. It combines STRATZ playback with supplemental OpenDota match data.",
        "Отчёт выделяет эпизоды для разбора: дорогие командные сражения, смерти перед важными объектами, индивидуальные паттерны смертей и время покупок. Объединяются события STRATZ playback и дополнительные данные OpenDota."
      )}</div>
      {!hasAnyData && <div className="analytics-empty">{copy(language, "OpenDota did not return enough parsed event data for decision analysis.", "OpenDota не вернула достаточно обработанных событий для анализа решений.")}</div>}
      <div className="decision-kpis">
        <div><span>{copy(language, "Teamfights", "Сражения")}</span><strong>{fights.length}</strong></div>
        <div><span>{copy(language, "Objectives", "Объекты")}</span><strong>{objectives.length}</strong></div>
        <div><span>{copy(language, "Fight deaths", "Смерти в сражениях")}</span><strong>{fmt(fightRows.reduce((sum, fight) => sum + fight.radiantDeaths + fight.direDeaths, 0))}</strong></div>
        <div><span>{copy(language, "Purchase events", "Покупки")}</span><strong>{fmt(allPurchaseCount)}</strong></div>
      </div>
    </Panel>

    <Panel title={copy(language, "Deaths before objectives", "Смерти перед важными объектами")} subtitle={copy(language, "TEAMFIGHTS ENDING WITHIN 3 MINUTES BEFORE AN OBJECTIVE", "СРАЖЕНИЯ, ЗАВЕРШИВШИЕСЯ НЕ БОЛЕЕ ЧЕМ ЗА 3 МИНУТЫ ДО ОБЪЕКТА")}>
      {objectiveRows.length && fightRows.length ? <div className="decision-list">{objectiveRows.map((objective, index) => {
        const preceding = fightRows.filter(fight => fight.end <= objective.time && objective.time - fight.end <= 180)
          .sort((a, b) => b.end - a.end)[0];
        return <article className="decision-event" key={index}>
          <div className="decision-event-top"><strong>{objective.label}</strong><span>{clock(objective.time)}</span></div>
          {preceding ? <p>{copy(language, "Closest preceding fight:", "Ближайшее предшествующее сражение:")} <strong>#{preceding.index + 1}</strong> · {copy(language, "deaths", "смертей")}: {teamName(true, language)} {preceding.radiantDeaths}, {teamName(false, language)} {preceding.direDeaths}. {preceding.radiantDeaths === preceding.direDeaths ? copy(language, "Death count was even.", "Число смертей было равным.") : copy(language, "The team with more deaths may have entered the objective at a disadvantage.", "Команда с большим числом смертей могла подойти к объекту в менее выгодном состоянии.")}</p>
            : <p>{copy(language, "No teamfight ending in the previous three minutes was found in the parsed data.", "В обработанных данных не найдено сражений, завершившихся в течение трёх минут до события.")}</p>}
        </article>;
      })}</div> : <div className="analytics-empty">{copy(language, "Objective and teamfight timestamps are required for this comparison.", "Для сравнения нужны временные метки объектов и командных сражений.")}</div>}
    </Panel>

    <Panel title={copy(language, "Player risk and contribution", "Риски и вклад игроков")} subtitle={copy(language, "RECORDED TEAMFIGHT DEATHS · DAMAGE · EARLY PURCHASE COUNT", "СМЕРТИ В СРАЖЕНИЯХ · УРОН · ЧИСЛО РАННИХ ПОКУПОК")}>
      {!playerRows.length ? <div className="analytics-empty">{copy(language, "Player statistics are unavailable.", "Статистика игроков недоступна.")}</div> :
        <div className="decision-player-table">
          <div className="decision-player-row decision-player-head"><span>{copy(language, "Player", "Игрок")}</span><span>{copy(language, "Team", "Команда")}</span><span>{copy(language, "Fight deaths", "Смерти в боях")}</span><span>{copy(language, "Fight damage", "Урон в боях")}</span><span>{copy(language, "Purchases ≤15m", "Покупки до 15 мин.")}</span></div>
          {playerRows.map(({ player, fightDeaths, fightDamage, earlyPurchases }) => <div className="decision-player-row" key={player.player_slot}>
            <strong>{playerName(player)}</strong><span>{teamName(radiant(player), language)}</span><span>{fightDeaths}</span><span>{fmt(fightDamage)}</span><span>{earlyPurchases}</span>
          </div>)}
        </div>}
      <p className="decision-method">{copy(language,
        "A high death count is a review signal, not proof of a mistake. It must be interpreted alongside role, fight participation, team strategy and match context.",
        "Большое число смертей — повод для разбора, а не доказательство ошибки. Показатель необходимо оценивать с учётом роли, участия в сражениях, стратегии команды и контекста матча."
      )}</p>
    </Panel>

    <p className="decision-method">{copy(language,
      "Interpretation limits: STRATZ and OpenDota event logs may be incomplete or absent. Gold swing is computed from per-player gold_delta in parsed fights; the advantage curve is sampled at minute resolution. Temporal proximity does not establish that a fight caused an objective outcome.",
      "Ограничения: журналы STRATZ и OpenDota могут быть неполными или отсутствовать. Разница золота рассчитывается по gold_delta игроков в обработанных сражениях; кривая преимущества берётся с минутной точностью. Близость событий по времени не доказывает, что сражение стало причиной результата борьбы за объект."
    )}</p>
  </div>;
}

export default DecisionAnalysis;
