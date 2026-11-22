import { useEffect, useState } from "react";
import {
  Swords, ChartNoAxesCombined, Trophy, Activity,
  ChevronRight, Search, Clock, Shield, RefreshCw, Package, Coins, BrainCircuit, BookOpen
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
