import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import "./Guides.css";

type Hero = { id: number; name: string; image?: string | null };
type ItemStat = { item_id: number; name: string; key?: string | null; matches: number; wins?: number | null; win_rate?: number | null };
type SkillStat = { ability_id: number; name: string; level?: number | null; time?: number | null; time_average?: number | null; matches: number; wins: number; win_rate: number | null };
type GuideData = {
  hero: Hero;
  build: Record<string, ItemStat[]>;
  first_points: SkillStat[];
  max_levels: SkillStat[];
  talents: SkillStat[];
  enemy_matchups: Array<{ hero_id: number; games: number; wins: number; win_rate: number | null; edge?: number | null }>;
  ally_synergies: Array<{ hero_id: number; games: number; wins: number; win_rate: number | null; edge?: number | null }>;
  matchup_data_available: boolean;
  data_source: string;
};
type Lang = "en" | "ru";

const copy = (lang: Lang, en: string, ru: string) => lang === "ru" ? ru : en;
const itemImage = (key?: string | null) => key ? `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/items/${key.replace(/^item_/, "")}_lg.png` : null;

function PickSelectors({ title, values, heroes, onChange, language }: {
  title: string; values: number[]; heroes: Hero[]; onChange: (next: number[]) => void; language: Lang;
}) {
  return <div className="guide-picks-group">
    <h3>{title}</h3>
    {values.map((value, index) => <select key={index} value={value || ""} onChange={event => {
      const next = [...values];
      next[index] = Number(event.target.value) || 0;
      onChange(next);
    }}>
      <option value="">{copy(language, `Pick ${index + 1}`, `Пик ${index + 1}`)}</option>
      {heroes.map(hero => <option key={hero.id} value={hero.id}>{hero.name}</option>)}
    </select>)}
  </div>;
}

export default function Guides({ language }: { language: Lang }) {
  const [heroes, setHeroes] = useState<Hero[]>([]);
  const [heroId, setHeroId] = useState(0);
  const [allies, setAllies] = useState<number[]>([0,0,0,0,0]);
  const [enemies, setEnemies] = useState<number[]>([0,0,0,0,0]);
  const [guide, setGuide] = useState<GuideData | null>(null);
  const [loadingHeroes, setLoadingHeroes] = useState(true);
  const [loadingGuide, setLoadingGuide] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/guides/heroes").then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Could not load heroes.");
      return data as Hero[];
    }).then(data => {
      if (!active) return;
      setHeroes(data);
      if (data.length) setHeroId(data[0].id);
    }).catch(err => {
      if (active) setError(err instanceof Error ? err.message : "Could not load heroes.");
    }).finally(() => { if (active) setLoadingHeroes(false); });
    return () => { active = false; };
  }, []);

  const enemyKey = enemies.filter(Boolean).join(",");
  const allyKey = allies.filter(Boolean).join(",");
  useEffect(() => {
    if (!heroId) return;
    const controller = new AbortController();
    setLoadingGuide(true);
    setError("");
    const params = new URLSearchParams();
    enemies.filter(Boolean).forEach(id => params.append("enemy_hero_ids", String(id)));
    allies.filter(Boolean).forEach(id => params.append("ally_hero_ids", String(id)));
    fetch(`/api/guides/${heroId}?${params.toString()}`, { signal: controller.signal })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || "Could not load hero guide.");
        return data as GuideData;
      })
      .then(setGuide)
      .catch(err => {
        if (!(err instanceof Error) || err.name !== "AbortError") setError(err instanceof Error ? err.message : "Could not load hero guide.");
      })
      .finally(() => { if (!controller.signal.aborted) setLoadingGuide(false); });
    return () => controller.abort();
  }, [heroId, enemyKey, allyKey]);

  const heroById = useMemo(() => new Map(heroes.map(hero => [hero.id, hero])), [heroes]);
  const phases = [
    ["starting", copy(language,"Starting items","Стартовые предметы")],
    ["early", copy(language,"Early game","Начало игры")],
    ["mid", copy(language,"Mid game","Середина игры")],
    ["late", copy(language,"Late game","Поздняя игра")]
  ] as const;

  if (loadingHeroes) return <div className="guides-loading"><RefreshCw className="spin" />{copy(language,"Loading hero catalogue…","Загрузка списка героев…")}</div>;

  return <div className="analytics-page guides-page">
    <section className="analytics-panel">
      <div className="analytics-panel-heading"><div><h2>{copy(language,"Hero guides and draft assistant","Гайды героев и помощник драфта")}</h2><span>{copy(language,"ITEM BUILDS · ABILITY TRENDS · ENEMY MATCHUPS","СБОРКИ ПРЕДМЕТОВ · ПРОКАЧКА · МАТЧАПЫ ПРОТИВНИКОВ")}</span></div></div>
      <div className="guide-hero-select">
        <label>{copy(language,"Hero to build","Герой для гайда")}
          <select value={heroId} onChange={event => setHeroId(Number(event.target.value))}>
            {heroes.map(hero => <option key={hero.id} value={hero.id}>{hero.name}</option>)}
          </select>
        </label>
      </div>
      <div className="guide-draft-grid">
        <PickSelectors title={copy(language,"Allied picks","Пики союзников")} values={allies} heroes={heroes} onChange={setAllies} language={language}/>
        <PickSelectors title={copy(language,"Enemy picks","Пики противников")} values={enemies} heroes={heroes} onChange={setEnemies} language={language}/>
      </div>
      <p className="guide-note">{copy(language,"STRATZ supplies ally synergy and enemy matchup edges where available; OpenDota is the fallback for enemy win rates. Item win rates are hero-specific aggregates, not a measured item-versus-enemy interaction.","STRATZ предоставляет синергию с союзниками и матчапы против противников, если данные доступны; OpenDota используется как резерв для винрейта против врагов. Винрейты предметов — агрегаты для героя, а не измеренная эффективность предмета против конкретного пика.")}</p>
    </section>

    {error && <div className="advanced-error">{error}</div>}
    {loadingGuide && <div className="guides-loading"><RefreshCw className="spin"/>{copy(language,"Loading guide data…","Загрузка данных гайда…")}</div>}

    {guide && !loadingGuide && <>
      <section className="analytics-panel">
        <div className="analytics-panel-heading"><div><h2>{guide.hero.name}</h2><span>{copy(language,"DATA SOURCES","ИСТОЧНИКИ ДАННЫХ")}: {guide.data_source.toUpperCase()}</span></div></div>
        <div className="guide-build-grid">
          {phases.map(([key,label]) => <article className="guide-phase" key={key}>
            <h3>{label}</h3>
            {guide.build[key]?.length ? guide.build[key].slice(0,8).map(item => <div className="guide-item-row" key={item.item_id}>
              {itemImage(item.key) ? <img src={itemImage(item.key) || ""} alt="" loading="lazy"/> : <span className="guide-item-placeholder">{item.item_id}</span>}
              <div><strong>{item.name}</strong><small>{item.matches.toLocaleString()} {copy(language,"matches","матчей")}</small></div>
              <b>{item.win_rate == null ? "—" : `${item.win_rate.toFixed(1)}%`}</b>
            </div>) : <p className="guide-empty">{copy(language,"No item data for this phase.","Нет данных о предметах для этой стадии.")}</p>}
          </article>)}
        </div>
      </section>

      <section className="analytics-panel">
        <div className="analytics-panel-heading"><div><h2>{copy(language,"Skill build and talents","Раскачка способностей и таланты")}</h2><span>{copy(language,"FIRST POINT · MAX LEVEL · TALENT CHOICES","ПЕРВОЕ ОЧКО · МАКСИМАЛЬНЫЙ УРОВЕНЬ · ВЫБОР ТАЛАНТОВ")}</span></div></div>
        <div className="guide-ability-grid">
          <div><h3>{copy(language,"First skill point","Первое изучение")}</h3>{guide.first_points?.length ? guide.first_points.slice(0,12).map((entry,index)=><div className="guide-ability-row" key={entry.ability_id}><span>{entry.name} · Lv {entry.level ?? "—"}</span><b>{entry.matches.toLocaleString()}</b><small>{entry.win_rate == null ? "—" : entry.win_rate.toFixed(1)+"%"}</small></div>) : <p className="guide-empty">{copy(language,"First-point data is unavailable.","Нет данных о первом изучении способностей.")}</p>}</div>
          <div><h3>{copy(language,"Ability max level","Максимальный уровень")}</h3>{guide.max_levels?.length ? guide.max_levels.slice(0,12).map((entry,index)=><div className="guide-ability-row" key={entry.ability_id}><span>{entry.name} · Lv {entry.level ?? "—"}</span><b>{entry.matches.toLocaleString()}</b><small>{entry.win_rate == null ? "—" : entry.win_rate.toFixed(1)+"%"}</small></div>) : <p className="guide-empty">{copy(language,"Max-level data is unavailable.","Нет данных о приоритете максимального уровня.")}</p>}</div>
          <div><h3>{copy(language,"Talents","Таланты")}</h3>{guide.talents?.length ? guide.talents.slice(0,10).map(entry=><div className="guide-ability-row" key={entry.ability_id}><span>{entry.name}</span><b>{entry.matches.toLocaleString()}</b><small>{entry.win_rate == null ? "—" : entry.win_rate.toFixed(1)+"%"}</small></div>) : <p className="guide-empty">{copy(language,"Talent distribution is unavailable.","Статистика талантов недоступна.")}</p>}</div>
        </div>
        <p className="guide-note">{copy(language,"STRATZ provides aggregated first-point and max-level distributions, not a single fixed 1–30 skill sequence. The tables show the most common level choices and their sample sizes.","STRATZ предоставляет агрегированные распределения первого изучения и максимального уровня способностей, а не единую фиксированную последовательность прокачки с 1-го по 30-й уровень. Таблицы показывают наиболее частые варианты и размер выборки.")}</p>
      </section>

      <section className="analytics-panel">
        <div className="analytics-panel-heading"><div><h2>{copy(language,"Allied hero synergy","Синергия с союзниками")}</h2><span>{copy(language,"STRATZ TEAMMATE WIN-RATE EDGE","ПРЕИМУЩЕСТВО ВИНРЕЙТА С СОЮЗНИКАМИ ПО STRATZ")}</span></div></div>
        {guide.ally_synergies?.length ? <div className="guide-matchup-list">{guide.ally_synergies.map(row=>{
          const ally=heroById.get(row.hero_id);
          return <div className="guide-matchup-row" key={row.hero_id}><span>{ally?.name || `Hero #${row.hero_id}`}</span><b>{row.edge == null ? "—" : `${row.edge > 0 ? "+" : ""}${row.edge.toFixed(2)}`}</b><small>{row.games.toLocaleString()} {copy(language,"matches","матчей")}</small></div>;
        })}</div> : <p className="guide-empty">{copy(language,"Choose allied heroes to see STRATZ synergy data. If unavailable, the provider may not have enough matchup samples.","Выберите героев союзников, чтобы увидеть синергию STRATZ. Если данных нет, у провайдера может быть недостаточно матчей для этой пары.")}</p>}
      </section>

      <section className="analytics-panel">
        <div className="analytics-panel-heading"><div><h2>{copy(language,"Selected enemy matchups","Матчапы против выбранных противников")}</h2><span>{copy(language,"HERO WIN RATE AGAINST EACH SELECTED ENEMY","ВИНРЕЙТ ГЕРОЯ ПРОТИВ КАЖДОГО ВЫБРАННОГО ПРОТИВНИКА")}</span></div></div>
        {guide.enemy_matchups?.length ? <div className="guide-matchup-list">{guide.enemy_matchups.map(row=>{
          const enemy=heroById.get(row.hero_id);
          return <div className="guide-matchup-row" key={row.hero_id}><span>{enemy?.name || `Hero #${row.hero_id}`}</span><b>{row.win_rate == null ? "—" : `${row.win_rate.toFixed(1)}%`}</b><small>{row.edge == null ? "" : `Edge ${row.edge > 0 ? "+" : ""}${row.edge.toFixed(2)} · `}{row.games.toLocaleString()} {copy(language,"matches","матчей")}</small></div>;
        })}</div> : <p className="guide-empty">{copy(language,"Choose enemy heroes to see matchup statistics.","Выберите героев противника, чтобы увидеть статистику матчапов.")}</p>}
      </section>
    </>}
  </div>;
}
