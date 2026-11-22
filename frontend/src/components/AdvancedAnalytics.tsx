import { useState } from "react";
import type { ReactNode } from "react";
import ReactECharts from "echarts-for-react";
import type { MatchData, MatchPlayer } from "./AnalyticsSections";
import { playerName } from "./AnalyticsSections";
import "./AdvancedAnalytics.css";

type Lang = "en" | "ru";
type Props = { match: MatchData; language: Lang };

const copy = (lang: Lang, en: string, ru: string) => lang === "ru" ? ru : en;
const fmt = (n: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Number.isFinite(n) ? n : 0);
const mmss = (n: number) => { const value=Math.trunc(Number(n)||0); const abs=Math.abs(value); return `${value<0?"−":""}${Math.floor(abs/60)}:${String(abs%60).padStart(2,"0")}`; };
const radiant = (p: MatchPlayer) => p.player_slot < 128;
const heroName = (p: MatchPlayer) => p.hero_name || (p.hero_id ? `Hero ${p.hero_id}` : "Unknown hero");
const cleanKey = (key: string) => key.replace(/^item_/, "").replace(/_/g, " ");
const itemImage = (key?: string | null) => key ? `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/items/${cleanKey(key)}_lg.png` : null;

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return <section className="analytics-panel"><div className="analytics-panel-heading"><div><h2>{title}</h2>{subtitle && <span>{subtitle}</span>}</div></div>{children}</section>;
}

function TeamfightSection({ match, language }: Props) {
  const fights = match.teamfights || [];
  const playersBySlot = new Map<number, MatchPlayer>(match.players.map(p => [p.player_slot, p] as const));
  return <div className="analytics-page">
    <Panel title={copy(language,"Teamfight breakdown","Разбор командных сражений")} subtitle={copy(language,"PLAYER CONTRIBUTION · DAMAGE · HEALING · GOLD","ВКЛАД ИГРОКОВ · УРОН · ЛЕЧЕНИЕ · ЗОЛОТО")}>
      {!fights.length ? <div className="analytics-empty">{copy(language,"OpenDota has not supplied parsed teamfight data for this match.","OpenDota не предоставила обработанные данные о командных сражениях.")}</div> :
        <div className="advanced-fights">{fights.map((fight, index) => {
          const fightPlayers = Array.isArray(fight.players) ? fight.players as Array<Record<string, any>> : [];
          const base = fightPlayers.map((stats, i) => ({
            stats,
            player: playersBySlot.get(Number(stats.player_slot)) || match.players[i]
          })).filter(x => x.player);
          const percentile = (value: number, values: number[]) => {
            if (!values.length) return 50;
            const below = values.filter(candidate => candidate < value).length;
            const equal = values.filter(candidate => candidate === value).length;
            return (below + equal * 0.5) / values.length * 100;
          };
          const values = {
            damage: base.map(x => Number(x.stats.damage || 0)),
            healing: base.map(x => Number(x.stats.healing || 0)),
            gold: base.map(x => Number(x.stats.gold_delta || 0)),
            involvement: base.map(x => Number(x.stats.kills || 0) + Number(x.stats.assists || 0)),
            deaths: base.map(x => Number(x.stats.deaths || 0))
          };
          const contributions = base.map(({stats,player}) => {
            const impact =
              percentile(Number(stats.kills || 0) + Number(stats.assists || 0), values.involvement) * 0.25 +
              percentile(Number(stats.damage || 0), values.damage) * 0.25 +
              percentile(Number(stats.healing || 0), values.healing) * 0.20 +
              percentile(Number(stats.gold_delta || 0), values.gold) * 0.15 +
              (100 - percentile(Number(stats.deaths || 0), values.deaths)) * 0.15;
            return {stats,player,impact};
          }).sort((a,b)=>b.impact-a.impact);
          const max = Math.max(1, ...contributions.map(x=>x.impact));
          return <article className="advanced-fight-card" key={index}>
            <div className="advanced-fight-head"><strong>{copy(language,"Fight","Сражение")} #{index+1}</strong><span>{mmss(Number(fight.start)||0)} – {mmss(Number(fight.end)||0)}</span><b>{Number(fight.deaths||0)} {copy(language,"deaths","смертей")}</b></div>
            <div className="advanced-fight-grid">
              {contributions.map(({stats,player,impact})=><div className="advanced-fight-player" key={player!.player_slot}>
                <div className="advanced-player-label">{player!.hero_image?<img src={player!.hero_image} alt={heroName(player!)}/>:null}<div><strong>{playerName(player!)}</strong><small>{heroName(player!)} · {radiant(player!)?copy(language,"Radiant","Свет"):copy(language,"Dire","Тьма")}</small></div></div>
                <div className="advanced-impact-track"><span style={{width:`${impact/max*100}%`,background:radiant(player!)?"#55b991":"#c66f7b"}}/></div>
                <div className="advanced-fight-stats"><span>{copy(language,"Damage","Урон")} <b>{fmt(Number(stats.damage||0))}</b></span><span>{copy(language,"Healing","Лечение")} <b>{fmt(Number(stats.healing||0))}</b></span><span>{copy(language,"Gold Δ","Δ золота")} <b>{fmt(Number(stats.gold_delta||0))}</b></span><span>{copy(language,"Deaths","Смерти")} <b>{Number(stats.deaths||0)}</b></span></div>
              </div>)}
            </div>
            {!contributions.length && <div className="analytics-empty">{copy(language,"Player-level fight details are unavailable.","Подробности сражения по игрокам недоступны.")}</div>}
          </article>;
        })}</div>}
    </Panel>
    <Panel title={copy(language,"How to read this section","Как читать этот раздел")}><p className="advanced-note">{copy(language,"Impact bars use relative percentiles within each fight for kill involvement, damage, healing, gold swing and survival. This reduces the dominance of raw damage, but remains a descriptive heuristic rather than an official or causal fight rating. OpenDota may omit some fields.","Полосы вклада используют относительные процентили внутри сражения: участие в убийствах, урон, лечение, изменение золота и выживаемость. Это снижает доминирование абсолютного урона, но остаётся эвристикой, а не официальной или причинной оценкой. OpenDota может не вернуть часть показателей.")}</p></Panel>
  </div>;
}

function ItemsSection({ match, language }: Props) {
  const [selected, setSelected] = useState("all");
  const players = selected === "all" ? match.players : match.players.filter(p=>String(p.player_slot)===selected);
  const inventory = (p: MatchPlayer) => p.item_inventory?.length ? p.item_inventory : [];
  const logs = players.flatMap(p=>(p.purchase_log||[]).map(entry=>({p,entry}))).sort((a,b)=>(a.entry.time||0)-(b.entry.time||0));
  return <div className="analytics-page">
    <Panel title={copy(language,"Item builds and purchase timing","Сборки и время покупки предметов")} subtitle={copy(language,"PURCHASE EVENTS · STRATZ PLAYBACK / OPENDOTA FALLBACK","СОБЫТИЯ ПОКУПОК · STRATZ PLAYBACK / РЕЗЕРВ OPENDOTA")}>
      <div className="advanced-toolbar"><label>{copy(language,"Player","Игрок")}</label><select value={selected} onChange={e=>setSelected(e.target.value)}><option value="all">{copy(language,"All players","Все игроки")}</option>{match.players.map(p=><option key={p.player_slot} value={String(p.player_slot)}>{playerName(p)}</option>)}</select></div>
      <div className="advanced-item-grid">{players.map(p=><article className="advanced-item-player" key={p.player_slot}>
        <div className="advanced-player-label">{p.hero_image?<img src={p.hero_image} alt={heroName(p)}/>:null}<div><strong>{playerName(p)}</strong><small>{heroName(p)} · {radiant(p)?copy(language,"Radiant","Свет"):copy(language,"Dire","Тьма")}</small></div></div>
        <div className="advanced-inventory"><b>{copy(language,"Recorded inventory","Текущий инвентарь")}</b>
          {inventory(p).length ? <div className="item-icon-row">{inventory(p).map((item,i)=><div className="item-icon-wrap" key={item.slot || i} title={item.name}>{item.key && <img src={itemImage(item.key) || ""} alt={item.name}/>}<span>{item.name}</span></div>)}
          </div> : <span>{copy(language,"Not provided","Нет данных")}</span>}
        </div>
        <div className="advanced-purchases">{(p.purchase_log||[]).length?(p.purchase_log||[]).map((entry,i)=><div className="purchase-icon-row" key={i}>
          <time>{mmss(Number(entry.time)||0)}</time>{itemImage(entry.key) && <img src={itemImage(entry.key) || ""} alt="" loading="lazy"/>}<span>{cleanKey(entry.key||"unknown")}</span>
        </div>):<small>{copy(language,"No purchase log available.","История покупок недоступна.")}</small>}</div>
      </article>)}</div>
    </Panel>
    <Panel title={copy(language,"Purchase timeline","Хронология покупок")} subtitle={copy(language,"ALL SELECTED PLAYERS · CHRONOLOGICAL ORDER","ВЫБРАННЫЕ ИГРОКИ · ПО ВРЕМЕНИ")}>
      {logs.length?<div className="advanced-purchase-timeline">{logs.map((x,i)=><div key={i}>
        <time>{mmss(Number(x.entry.time)||0)}</time><strong>{playerName(x.p)}</strong>{itemImage(x.entry.key) && <img src={itemImage(x.entry.key) || ""} alt="" loading="lazy"/>}<span>{cleanKey(x.entry.key||"unknown")}</span>
      </div>)}</div>:<div className="analytics-empty">{copy(language,"No purchase events are available for the selected players.","Для выбранных игроков нет данных о покупках.")}</div>}
    </Panel>
    <p className="advanced-note">{copy(language,"Item icons are loaded from the Dota 2 item image catalogue. Purchase timing is descriptive and does not by itself establish item effectiveness.","Иконки загружаются из каталога изображений предметов Dota 2. Время покупки само по себе не доказывает эффективность предмета.")}</p>
  </div>;
}

function EconomySection({ match, language }: Props) {
  const players = [...match.players].sort((a,b)=>b.net_worth-a.net_worth);
  const series = players.slice(0,5).filter(p=>(p.gold_t||[]).length).map(p=>({name:playerName(p),type:"line",smooth:true,showSymbol:false,data:p.gold_t}));
  const times = players.find(p=>(p.times||[]).length)?.times || [];
  const option = {tooltip:{trigger:"axis"},legend:{textStyle:{color:"#9aa9bd"}},grid:{left:60,right:25,top:35,bottom:35},xAxis:{type:"category",data:times.map(t=>mmss(t)),axisLabel:{color:"#8290a5"}},yAxis:{type:"value",axisLabel:{color:"#8290a5"},splitLine:{lineStyle:{color:"#29374c"}}},series};
  return <div className="analytics-page">
    <Panel title={copy(language,"Economy progression","Динамика экономики")} subtitle={copy(language,"PLAYER GOLD OVER TIME · TOP FIVE BY NET WORTH","ЗОЛОТО ИГРОКОВ ПО ВРЕМЕНИ · ПЯТЬ ЛИДЕРОВ ПО СТОИМОСТИ")}>
      {series.length?<div className="analytics-chart"><ReactECharts option={option} style={{height:320,width:"100%"}}/></div>:<div className="analytics-empty">{copy(language,"Player gold time series are unavailable for this match.","Временные ряды золота игроков для этого матча недоступны.")}</div>}
    </Panel>
    <Panel title={copy(language,"Economic efficiency","Экономическая эффективность")} subtitle={copy(language,"GPM · XPM · NET WORTH · LAST HITS","GPM · XPM · СТОИМОСТЬ · ДОБИВАНИЯ")}>
      <div className="advanced-economy-table"><div className="advanced-economy-row advanced-economy-head"><span>{copy(language,"Player","Игрок")}</span><span>GPM</span><span>XPM</span><span>{copy(language,"Net worth","Стоимость")}</span><span>{copy(language,"Last hits","Добивания")}</span></div>
      {players.map(p=><div className="advanced-economy-row" key={p.player_slot}><strong>{playerName(p)}</strong><span>{p.gold_per_min}</span><span>{p.xp_per_min}</span><span>{fmt(p.net_worth)}</span><span>{p.last_hits}</span></div>)}</div>
    </Panel>
    <Panel title={copy(language,"Team gold advantage","Преимущество команды по золоту")}>
      {match.radiant_gold_adv?.length?<div className="analytics-chart"><ReactECharts option={{tooltip:{trigger:"axis"},grid:{left:60,right:20,top:20,bottom:35},xAxis:{type:"category",data:match.radiant_gold_adv.map((_,i)=>i),axisLabel:{color:"#8290a5"}},yAxis:{type:"value",axisLabel:{color:"#8290a5"},splitLine:{lineStyle:{color:"#29374c"}}},series:[{name:copy(language,"Radiant","Свет"),type:"line",smooth:true,showSymbol:false,data:match.radiant_gold_adv,areaStyle:{opacity:.12}}]}} style={{height:260,width:"100%"}}/></div>:<div className="analytics-empty">{copy(language,"Team gold advantage series are unavailable.","Временной ряд преимущества по золоту недоступен.")}</div>}
    </Panel>
  </div>;
}

function TrendsSection({ match, language }: Props) {
  const [idsText,setIdsText]=useState(String(match.match_id));
  const [selected,setSelected]=useState(String(match.players.find(p=>p.account_id)?.account_id ?? match.players[0]?.player_slot ?? ""));
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [rows,setRows]=useState<Array<{id:number;match:MatchData;player:MatchPlayer|null}>>([]);
  const selectedPlayer=match.players.find(p=>String(p.account_id ?? p.player_slot)===selected);
  async function compare(){
    if (!selectedPlayer) { setError(copy(language,"Select a player with available match data.","Выберите игрока с доступными данными.")); return; }
    const ids=[...new Set(idsText.split(/[\s,;]+/).map(x=>x.trim()).filter(x=>/^\d+$/.test(x)).map(Number))].slice(0,10);
    if(!ids.length){setError(copy(language,"Enter at least one valid match ID.","Введите хотя бы один корректный ID матча."));return;}
    setLoading(true);setError("");
    try{
      const fetched=await Promise.all(ids.map(async id=>{
        const data=id===match.match_id?match:await fetch(`/api/matches/${id}`).then(async r=>{const j=await r.json();if(!r.ok)throw new Error(j.detail||`Match ${id} failed`);return j as MatchData;});
        const p=data.players.find(x=>selectedPlayer?.account_id!=null?x.account_id===selectedPlayer.account_id:playerName(x)===playerName(selectedPlayer!))||null;
        return {id,match:data,player:p};
      }));
      setRows(fetched);
    }catch(e){setError(e instanceof Error?e.message:copy(language,"Could not load match history.","Не удалось загрузить историю матчей."));}
    finally{setLoading(false);}
  }
  const valid=rows.filter(x=>x.player);
  const option={tooltip:{trigger:"axis"},legend:{textStyle:{color:"#9aa9bd"}},grid:{left:55,right:55,top:35,bottom:35},xAxis:{type:"category",data:valid.map(x=>String(x.id)),axisLabel:{color:"#8290a5"}},yAxis:[{type:"value",name:"GPM",axisLabel:{color:"#8290a5"},splitLine:{lineStyle:{color:"#29374c"}}},{type:"value",name:"KDA",position:"right",axisLabel:{color:"#8290a5"},splitLine:{show:false}}],series:[{name:"GPM",type:"line",smooth:true,yAxisIndex:0,data:valid.map(x=>x.player!.gold_per_min)},{name:"KDA",type:"line",smooth:true,yAxisIndex:1,data:valid.map(x=>(x.player!.kills+x.player!.assists)/Math.max(x.player!.deaths,1))}]};
  return <div className="analytics-page">
    <Panel title={copy(language,"Player match history","История матчей игрока")} subtitle={copy(language,"COMPARE UP TO TEN MATCHES","СРАВНЕНИЕ ДО ДЕСЯТИ МАТЧЕЙ")}>
      <div className="advanced-history-controls"><label>{copy(language,"Player from current match","Игрок из текущего матча")}<select value={selected} onChange={e=>{setSelected(e.target.value);setRows([]);}}>{match.players.map(p=><option key={p.player_slot} value={String(p.account_id??p.player_slot)}>{playerName(p)} · {heroName(p)}</option>)}</select></label>
      <label>{copy(language,"Match IDs (comma or space separated)","ID матчей (через запятую или пробел)")}<textarea value={idsText} onChange={e=>setIdsText(e.target.value)} rows={3} placeholder="123456789, 123456790"/></label>
      <button onClick={compare} disabled={loading}>{loading?copy(language,"Loading…","Загрузка…"):copy(language,"Compare matches","Сравнить матчи")}</button></div>
      {error&&<div className="advanced-error">{error}</div>}
      {rows.length>0&&<><div className="advanced-history-summary">{valid.length} / {rows.length} {copy(language,"matches contain a matching player identity.","матчей содержат совпадение игрока.")}</div>
      {valid.length>0?<><div className="analytics-chart"><ReactECharts option={option} style={{height:300,width:"100%"}}/></div>
      <div className="advanced-economy-table"><div className="advanced-economy-row advanced-economy-head"><span>{copy(language,"Match","Матч")}</span><span>{copy(language,"Result","Результат")}</span><span>K/D/A</span><span>GPM</span><span>{copy(language,"Hero damage","Урон героя")}</span></div>
      {valid.map(x=><div className="advanced-economy-row" key={x.id}><strong>#{x.id}</strong><span>{x.match.radiant_win==null?"—":(x.match.radiant_win===(x.player!.player_slot<128))?copy(language,"Win","Победа"):copy(language,"Loss","Поражение")}</span><span>{x.player!.kills}/{x.player!.deaths}/{x.player!.assists}</span><span>{x.player!.gold_per_min}</span><span>{fmt(x.player!.hero_damage)}</span></div>)}</div></>:<div className="analytics-empty">{copy(language,"No matching player identity found in the requested matches. Public account IDs may be hidden.","Не удалось найти этого игрока в указанных матчах. Публичный ID аккаунта может быть скрыт.")}</div>}</>}
    </Panel>
    <p className="advanced-note">{copy(language,"History is matched by OpenDota account_id. If the account ID is hidden, the app falls back to an exact player-name match, which may be ambiguous. A match can be absent or unparsed.","История сопоставляется по account_id из OpenDota. Если ID скрыт, используется точное совпадение имени, которое может быть неоднозначным. Некоторые матчи могут отсутствовать или быть не обработаны.")}</p>
  </div>;
}

export default function AdvancedAnalytics({match,language,section}:Props & {section:"Fights"|"Items"|"Economy"}) {
  if(section==="Fights") return <TeamfightSection match={match} language={language}/>;
  if(section==="Items") return <ItemsSection match={match} language={language}/>;
  if(section==="Economy") return <EconomySection match={match} language={language}/>;
  return <EconomySection match={match} language={language}/>;
}
