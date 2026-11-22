import React, { cloneElement, createContext, isValidElement, useContext } from "react";
import type { ReactNode } from "react";

export type Language = "en" | "ru";

const LanguageContext = createContext<Language>("en");
export function I18nProvider({ language, children }: { language: Language; children: ReactNode }) {
  return <LanguageContext.Provider value={language}>{children}</LanguageContext.Provider>;
}
export function useLanguage() { return useContext(LanguageContext); }

const dictionary: Record<string, string> = {
  "WORKSPACE":"РАБОЧАЯ ОБЛАСТЬ","Map":"Карта","Map Analysis":"Анализ карты","Game mode:":"Игровой режим:","Lobby:":"Лобби:","Patch ID:":"ID патча:","PATCH ID":"ID ПАТЧА","OVERVIEW":"ОБЗОР","PLAYERS":"ИГРОКИ","TIMELINE":"ХРОНОЛОГИЯ","TEAMS":"КОМАНДЫ","ANALYSIS":"АНАЛИЗ","DECISIONS":"РЕШЕНИЯ","FIGHTS":"СРАЖЕНИЯ","ITEMS":"ПРЕДМЕТЫ","ECONOMY":"ЭКОНОМИКА","ROLES":"РОЛИ","TRENDS":"ДИНАМИКА","Overview":"Обзор","Players":"Игроки","Timeline":"Хронология","Teams":"Команды","Analysis":"Анализ","Decisions":"Решения","Review":"Разбор матча","Guides":"Гайды","Player Performance":"Персональная аналитика",
  "Fights":"Сражения","Items":"Предметы","Economy":"Экономика","Roles":"Роли","Trends":"Динамика",
  "Match Overview":"Обзор матча","Player Statistics":"Статистика игроков","Match Timeline":"Хронология матча","Team Comparison":"Сравнение команд","Match Analysis":"Анализ матча","Decision Analysis":"Анализ решений","Teamfight Analysis":"Анализ командных сражений","Item Builds":"Сборки предметов","Economy Analysis":"Анализ экономики","Role Analysis":"Анализ ролей","Player Trends":"Динамика игрока","Match Review":"Разбор матча","Hero Guides":"Гайды героев",
  "MATCH CENTER":"ЦЕНТР АНАЛИЗА МАТЧЕЙ","Detailed Dota 2 match analytics platform.":"Платформа подробной аналитики матчей Dota 2.",
  "Enter Dota 2 Match ID...":"Введите ID матча Dota 2...","Analyze":"Анализировать","Loading":"Загрузка","Loading match data...":"Загрузка данных матча...",
  "Ready to analyze":"Готово к анализу","Enter a Dota 2 Match ID to load match statistics.":"Введите ID матча Dota 2, чтобы загрузить статистику.",
  "API SYSTEM ONLINE":"API СИСТЕМА РАБОТАЕТ","WORKSPACE /":"РАБОЧАЯ ОБЛАСТЬ /","PARSED":"ДАННЫЕ ОБРАБОТАНЫ","NOT PARSED":"НЕ ОБРАБОТАНО",
  "RADIANT":"СВЕТ","Radiant":"Свет","DIRE":"ТЬМА","Dire":"Тьма","VICTORY":"ПОБЕДА","Victory":"Победа","DEFEAT":"ПОРАЖЕНИЕ","Defeat":"Поражение","UNKNOWN":"НЕИЗВЕСТНО","Unknown":"Неизвестно",
  "Radiant victory":"Победа Света","Dire victory":"Победа Тьмы",
  "WINNER":"ПОБЕДИТЕЛЬ","OBJECTIVES":"ЦЕЛИ","GAME MODE ID":"ID РЕЖИМА ИГРЫ",
  "MATCH DURATION":"ДЛИТЕЛЬНОСТЬ МАТЧА","TOTAL KILLS":"ВСЕГО УБИЙСТВ","TOTAL NET WORTH":"ОБЩАЯ СТОИМОСТЬ","HERO DAMAGE":"УРОН ПО ГЕРОЯМ",
  "Match result":"Результат матча","Match MVP":"MVP матча","ESTIMATED PERFORMANCE LEADER":"ЛИДЕР ПО ОЦЕНОЧНОЙ ЭФФЕКТИВНОСТИ",
  "PERFORMANCE":"ЭФФЕКТИВНОСТЬ","Select a player to open their detailed performance card.":"Выберите игрока, чтобы открыть подробную карточку.",
  "Radiant roster":"Состав Света","Dire roster":"Состав Тьмы","K/D/A":"У/С/П","NET WORTH":"СТОИМОСТЬ","KDA":"KDA",
  "Gold advantage":"Преимущество по золоту","Experience advantage":"Преимущество по опыту","RADIANT POSITIVE · DIRE NEGATIVE":"ПЛЮС — СВЕТ · МИНУС — ТЬМА",
  "Timeline unavailable":"Хронология недоступна","OPEN DOTA HAS NOT PROVIDED ADVANTAGE SERIES":"OPENDOTA НЕ ПРЕДОСТАВИЛА ДАННЫЕ О ПРЕИМУЩЕСТВЕ",
  "This match does not contain parsed gold or experience timeline data. The match overview and player statistics are still available.":"Для этого матча нет обработанных данных о золоте или опыте по времени. Обзор матча и статистика игроков доступны.",
  "Teamfight summary":"Сводка командных сражений","Match objectives":"Цели матча","No objective events are available for this match.":"Для этого матча нет данных о целях.",
  "Combat statistics":"Боевые показатели","TEAM FIGHT OUTPUT":"РЕЗУЛЬТАТИВНОСТЬ В СРАЖЕНИЯХ","Economy and farming":"Экономика и фарм",
  "TEAM TOTALS AND PER-PLAYER AVERAGES":"КОМАНДНЫЕ СУММЫ И СРЕДНИЕ НА ИГРОКА","Damage and utility":"Урон и полезность","TOTAL TEAM CONTRIBUTION":"ОБЩИЙ ВКЛАД КОМАНДЫ",
  "Kills":"Убийства","Deaths":"Смерти","Assists":"Помощь","Net worth":"Общая стоимость","Average GPM":"Средний GPM","Average XPM":"Средний XPM","Last hits":"Добивания",
  "Tower damage":"Урон по строениям","Hero healing":"Лечение героев","RADIANT NET WORTH":"СТОИМОСТЬ СВЕТА","DIRE NET WORTH":"СТОИМОСТЬ ТЬМЫ",
  "RADIANT HERO DAMAGE":"УРОН ГЕРОЕВ СВЕТА","DIRE HERO DAMAGE":"УРОН ГЕРОЕВ ТЬМЫ","RADIANT LEADS":"ПРЕИМУЩЕСТВО СВЕТА","DIRE LEADS":"ПРЕИМУЩЕСТВО ТЬМЫ","EVEN":"РАВНО",
  "Team efficiency":"Эффективность команд","AVERAGE PER PLAYER":"В СРЕДНЕМ НА ИГРОКА",
  "Match interpretation":"Интерпретация матча","AUTOMATED STATISTICAL SUMMARY":"АВТОМАТИЧЕСКАЯ СТАТИСТИЧЕСКАЯ СВОДКА",
  "Performance leader":"Лидер по эффективности","Combat damage":"Боевой урон","Match data":"Данные матча","players":"игроков","No player data":"Нет данных игроков",
  "Individual player contribution":"Индивидуальный вклад игроков","COMBAT · ECONOMY · OBJECTIVES · SUPPORT":"БОЙ · ЭКОНОМИКА · ЦЕЛИ · ПОДДЕРЖКА",
  "Player performance ranking":"Рейтинг эффективности игроков","RELATIVE SCORE WITHIN THIS MATCH":"ОТНОСИТЕЛЬНАЯ ОЦЕНКА В ЭТОМ МАТЧЕ",
  "Positive indicators":"Сильные стороны","Review points":"На что обратить внимание","Strengths":"Сильные стороны",
  "PLAYER PERFORMANCE":"ЭФФЕКТИВНОСТЬ ИГРОКА","Estimated performance":"Оценочная эффективность","Close player details":"Закрыть карточку игрока",
  "No purchase log available.":"История покупок недоступна.","No kill log available.":"История убийств недоступна.",
  "No ability upgrade log available.":"История прокачки способностей недоступна.","Unknown hero":"Неизвестный герой",
  "Export PDF report":"Экспорт PDF-отчёта","Export a detailed match report with player-by-player statistics and event logs.":"Экспорт подробного отчёта со статистикой игроков и журналом событий.",
  "Team comparison":"Сравнение команд","Teamfight contribution":"Вклад в командные сражения","Player contribution ranking":"Рейтинг вклада игроков","Individual player breakdown":"Подробная статистика игроков",
  "Match events":"События матча","Generated by Dota Analytics · Data source: OpenDota · Missing fields are shown as unavailable or zero only where the API returns no value.":"Создано Dota Analytics · Источник: OpenDota · Отсутствующие поля обозначены прочерком.",
  "Parsed match data":"Обработанные данные матча","Partial match data":"Частичные данные матча",
  "Item purchase log":"История покупки предметов","Current inventory":"Текущий инвентарь","Gold swing":"Изменение золота","Damage":"Урон","Healing":"Лечение","Player":"Игрок","Kill log":"История убийств","Ability upgrades":"Прокачка способностей",
  "Time":"Время","Item":"Предмет","Target":"Цель","Ability":"Способность","Level":"Уровень","Gold":"Золото","Experience":"Опыт",
  "No player progression series available.":"Нет данных о динамике игрока.","Player progression · 5-minute intervals":"Динамика игрока · интервалы 5 минут",
  "Values are cumulative snapshots supplied by OpenDota; unavailable fields are shown as —.":"Накопительные значения из OpenDota; отсутствующие данные обозначены прочерком.",
  "RADIANT SCORE":"СЧЁТ СВЕТА","DIRE SCORE":"СЧЁТ ТЬМЫ","DURATION":"ДЛИТЕЛЬНОСТЬ",
  "OpenDota has not parsed full player data for this match. Some sections may be incomplete.":"OpenDota не обработала полные данные игроков для этого матча. Некоторые разделы могут быть неполными.",
    "PLAYER / HERO":"ИГРОК / ГЕРОЙ","HERO DMG":"УРОН ГЕРОЯ","TOWER DMG":"УРОН ПО СТРОЕНИЯМ","SCORE":"ОЦЕНКА","TEAM NOT SPECIFIED":"КОМАНДА НЕ УКАЗАНА","RESULT UNKNOWN":"РЕЗУЛЬТАТ НЕИЗВЕСТЕН",
  "TOP-RANKED PLAYER":"ЛУЧШИЙ ПО РЕЙТИНГУ","No objective event log available.":"Журнал целей матча недоступен.","No teamfight details available.":"Подробности сражений недоступны.",
  "Performance score is a heuristic, relative to the players in this match. It is not an official Dota 2 rating.":"Оценка эффективности — эвристика относительно игроков этого матча, а не официальный рейтинг Dota 2.",
  "Performance score is a heuristic indicator calculated from KDA, GPM, hero damage, tower damage, teamfight participation (when supplied) and healing. It is not an official Dota 2 rating and should not be interpreted as a causal measure of a player's impact.":"Оценка эффективности — эвристический показатель на основе KDA, GPM, урона, участия в сражениях и лечения. Это не официальный рейтинг Dota 2 и не причинная оценка влияния игрока.",
  "High kill participation through kills and assists.":"Высокое участие в убийствах за счёт убийств и помощи.","One of the match leaders in hero damage.":"Один из лидеров матча по урону героям.","Meaningful contribution to structural damage.":"Заметный вклад в нанесение урона строениям.","Among the strongest players by net worth.":"Один из лидеров по общей стоимости.","High death count; review positioning and fight selection.":"Много смертей: стоит пересмотреть позиционирование и выбор сражений.","Low building damage relative to combat involvement.":"Низкий урон строениям относительно участия в боях.","Performance is distributed across the recorded match statistics.":"Вклад распределён между доступными статистическими показателями.","No major statistical warning is apparent from the available summary fields.":"По доступной сводке серьёзных статистических проблем не выявлено."
};

export function translateText(value: string, language: Language): string {
  if (language === "en") return value;
  const trimmed = value.trim();
  const exact = dictionary[trimmed] ?? dictionary[trimmed.toUpperCase()];
  if (exact) return value.replace(trimmed, exact);
  const matchPlayers = trimmed.match(/^(\d+) PLAYERS$/);
  if (matchPlayers) return value.replace(trimmed, `${matchPlayers[1]} ИГРОКОВ`);
  const fights = trimmed.match(/^(\d+) DETECTED TEAMFIGHTS$/);
  if (fights) return value.replace(trimmed, `${fights[1]} ОБНАРУЖЕННЫХ СРАЖЕНИЙ`);
  const events = trimmed.match(/^(\d+) RECORDED EVENTS$/);
  if (events) return value.replace(trimmed, `${events[1]} ЗАПИСАННЫХ СОБЫТИЙ`);
  return value;
}

function translateNode(node: ReactNode, language: Language): ReactNode {
  if (typeof node === "string") return translateText(node, language);
  if (Array.isArray(node)) return node.map((child, index) => <React.Fragment key={index}>{translateNode(child, language)}</React.Fragment>);
  if (isValidElement(node)) {
    const props: Record<string, unknown> = { ...node.props };
    for (const key of ["title", "subtitle", "placeholder", "aria-label", "label"]) {
      if (typeof props[key] === "string") props[key] = translateText(props[key] as string, language);
    }
    if (props.children !== undefined) props.children = translateNode(props.children as ReactNode, language);
    return cloneElement(node, props);
  }
  return node;
}

export function Localize({ language, children }: { language: Language; children: ReactNode }) {
  return <>{translateNode(children, language)}</>;
}
