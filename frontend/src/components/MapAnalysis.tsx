import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import ReactECharts from "echarts-for-react";
import type { MatchData, MatchPlayer } from "./AnalyticsSections";
import { playerName } from "./AnalyticsSections";
import "./MapAnalysis.css";

type Lang = "en" | "ru";
const copy = (lang: Lang, en: string, ru: string) => lang === "ru" ? ru : en;
const radiant = (player: MatchPlayer) => player.player_slot < 128;

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return <section className="analytics-panel map-analysis-panel">
    <div className="analytics-panel-heading"><div><h2>{title}</h2>{subtitle && <span>{subtitle}</span>}</div></div>
    {children}
  </section>;
}

export default function MapAnalysis({ match, language }: { match: MatchData; language: Lang }) {
  const [selectedPlayer, setSelectedPlayer] = useState("all");
  const [selectedTeam, setSelectedTeam] = useState("all");

  const filteredPlayers = match.players.filter(player => {
    const teamMatches = selectedTeam === "all" || (selectedTeam === "radiant" ? radiant(player) : !radiant(player));
    const playerMatches = selectedPlayer === "all" || String(player.player_slot) === selectedPlayer;
    return teamMatches && playerMatches;
  });

  const positionRows = filteredPlayers.flatMap(player =>
    (player.position_events || []).map(event => ({ ...event, player_slot: player.player_slot }))
  );
  const deathRows = filteredPlayers.flatMap(player =>
    (player.death_events || []).filter(event => event.x != null && event.y != null)
      .map(event => ({ x: event.x, y: event.y, time: event.time, player_slot: player.player_slot }))
  );

  const chartOption = useMemo(() => {
    const coords = [
      ...positionRows.map(point => ({ x: Number(point.x), y: Number(point.y) })),
      ...deathRows.map(point => ({ x: Number(point.x), y: Number(point.y) })),
    ].filter(point => Number.isFinite(point.x) && Number.isFinite(point.y));
    if (!coords.length || !positionRows.length) return {};

    const minX = Math.min(...coords.map(point => point.x));
    const maxX = Math.max(...coords.map(point => point.x));
    const minY = Math.min(...coords.map(point => point.y));
    const maxY = Math.max(...coords.map(point => point.y));
    const bins = 24;
    const xBin = (value: number) => Math.min(bins - 1, Math.max(0, Math.floor((value - minX) / Math.max(1, maxX - minX) * bins)));
    const yBin = (value: number) => Math.min(bins - 1, Math.max(0, Math.floor((value - minY) / Math.max(1, maxY - minY) * bins)));
    const counts = new Map<string, number>();
    for (const point of positionRows) {
      const x = xBin(Number(point.x));
      const y = yBin(Number(point.y));
      const key = x + ":" + y;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    const heat = Array.from(counts.entries()).map(([key, count]) => {
      const [x, y] = key.split(":").map(Number);
      return [x, y, count];
    });
    const deaths = deathRows.map(point => [xBin(Number(point.x)), yBin(Number(point.y))]);
    const maxCount = Math.max(1, ...heat.map(point => Number(point[2])));
    return {
      animation: false,
      tooltip: { position: "top", formatter: (params: { value: number[]; seriesName: string }) =>
        params.seriesName === "Deaths"
          ? copy(language, "Recorded death location", "Зафиксированное место смерти")
          : copy(language, "Position samples", "Отметки позиции") + ": " + params.value[2] },
      grid: { left: 42, right: 18, top: 18, bottom: 50 },
      xAxis: {
        type: "category", data: Array.from({ length: bins }, (_, i) => String(i + 1)),
        name: "X", nameTextStyle: { color: "#8799b1" }, axisLabel: { show: false },
        axisLine: { lineStyle: { color: "#3b4a60" } }, splitArea: { show: true, areaStyle: { color: ["#121c2a", "#152132"] } },
      },
      yAxis: {
        type: "category", data: Array.from({ length: bins }, (_, i) => String(i + 1)),
        name: "Y", nameTextStyle: { color: "#8799b1" }, axisLabel: { show: false },
        axisLine: { lineStyle: { color: "#3b4a60" } }, splitArea: { show: true, areaStyle: { color: ["#121c2a", "#152132"] } },
      },
      visualMap: {
        min: 0, max: maxCount, calculable: false, orient: "horizontal", left: "center", bottom: 2,
        text: [copy(language, "High activity", "Высокая активность"), copy(language, "Low", "Низкая")],
        textStyle: { color: "#91a2b8" }, inRange: { color: ["#1b2a40", "#2d6196", "#e4a75b"] },
      },
      series: [
        { name: "Positions", type: "heatmap", data: heat, progressive: 0, itemStyle: { borderWidth: 1, borderColor: "#111a27" } },
        { name: "Deaths", type: "scatter", data: deaths, symbolSize: 10, itemStyle: { color: "#ed7180", borderColor: "#fff", borderWidth: 1 }, z: 5 },
      ],
    };
  }, [positionRows, deathRows, language]);

  const totalPositions = match.players.reduce((sum, player) => sum + (player.position_events?.length || 0), 0);
  const totalDeaths = match.players.reduce((sum, player) => sum + (player.death_events?.length || 0), 0);

  return <div className="analytics-page map-analysis-page">
    <Panel title={copy(language, "Map activity analysis", "Анализ активности на карте")} subtitle={copy(language, "STRATZ PLAYBACK COORDINATES · SAMPLED EVERY 10 SECONDS", "КООРДИНАТЫ STRATZ PLAYBACK · ВЫБОРКА КАЖДЫЕ 10 СЕКУНД")}>
      <div className="map-analysis-toolbar">
        <label>{copy(language, "Team", "Команда")}
          <select value={selectedTeam} onChange={event => setSelectedTeam(event.target.value)}>
            <option value="all">{copy(language, "Both teams", "Обе команды")}</option>
            <option value="radiant">{copy(language, "Radiant", "Свет")}</option>
            <option value="dire">{copy(language, "Dire", "Тьма")}</option>
          </select>
        </label>
        <label>{copy(language, "Player", "Игрок")}
          <select value={selectedPlayer} onChange={event => setSelectedPlayer(event.target.value)}>
            <option value="all">{copy(language, "All players", "Все игроки")}</option>
            {match.players.map(player => <option key={player.player_slot} value={String(player.player_slot)}>{playerName(player)}</option>)}
          </select>
        </label>
        <div className="map-analysis-stat"><strong>{positionRows.length}</strong><span>{copy(language, "Position samples", "Отметки позиции")}</span></div>
        <div className="map-analysis-stat"><strong>{deathRows.length}</strong><span>{copy(language, "Death locations", "Места смертей")}</span></div>
      </div>
      {positionRows.length ? <div className="map-analysis-chart"><ReactECharts option={chartOption} style={{ height: 470, width: "100%" }} /></div>
        : <div className="analytics-empty">{copy(language, "No position playback is available for this match or the selected player. STRATZ playback is requested only for matches within the 90-day analysis window.", "Для этого матча или выбранного игрока нет координат перемещения. STRATZ playback запрашивается только для матчей в пределах 90-дневного окна анализа.")}</div>}
      <div className="map-analysis-legend"><span><i className="map-heat-legend" />{copy(language, "Position density", "Плотность перемещений")}</span><span><i className="map-death-legend" />{copy(language, "Death location", "Место смерти")}</span></div>
      <p className="map-analysis-note">{copy(language, "This is a coordinate-density view from recorded playback events, not a reconstructed minimap. Position samples are downsampled to one point per 10-second interval to keep the report compact. Absence of events does not imply that a player was stationary.", "Это карта плотности координат из событий playback, а не реконструированная мини-карта. Координаты прореживаются до одной отметки за 10 секунд, чтобы уменьшить объём отчёта. Отсутствие событий не означает, что игрок стоял на месте.")}</p>
    </Panel>
    <Panel title={copy(language, "Playback coverage", "Покрытие playback")}>
      <div className="map-analysis-coverage">
        <div><strong>{totalPositions}</strong><span>{copy(language, "All position samples", "Все отметки позиций")}</span></div>
        <div><strong>{totalDeaths}</strong><span>{copy(language, "All recorded death locations", "Все зафиксированные места смертей")}</span></div>
        <div><strong>{match.players.filter(player => (player.position_events?.length || 0) > 0).length}/10</strong><span>{copy(language, "Players with movement data", "Игроки с данными перемещений")}</span></div>
      </div>
    </Panel>
  </div>;
}
