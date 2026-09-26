import React, { useState } from 'react';
import {
  Gamepad2,
  Search,
  ArrowRight,
  LayoutDashboard,
} from 'lucide-react';
import { GAME_CATALOG, GameCategory } from './gameCatalog';
import { useTheme } from '../../../components/common/useTheme';
import { RainCalculationGame } from '../speed/RainCalculationGame';
import { SixtySecondRushGame } from '../speed/SixtySecondRushGame';
import { RocketGame } from '../speed/RocketGame';
import { BombDefusalGame } from '../speed/BombDefusalGame';
import { SurvivalGame } from '../survival/SurvivalGame';
import { CalculationRunnerGame } from '../survival/CalculationRunnerGame';
import { BossBattleGame } from '../survival/BossBattleGame';
import { MemoryCalculationGame } from '../memory/MemoryCalculationGame';
import { OperationSwitchGame } from '../memory/OperationSwitchGame';
import { TableChainGame } from '../memory/TableChainGame';
import { TableBattleGame } from '../battles/TableBattleGame';
import { QuickCompareGame } from '../battles/QuickCompareGame';
import { BiggerSmallerGame } from '../battles/BiggerSmallerGame';
import { NumberTargetGame } from '../challenges/NumberTargetGame';
import { TableBreakerGame } from '../challenges/TableBreakerGame';
import { FindMistakeGame } from '../challenges/FindMistakeGame';
import { ClosestAnswerGame } from '../challenges/ClosestAnswerGame';

export interface GamesHubViewProps {
  onBackToDashboard?: () => void;
}

export const GamesHubView: React.FC<GamesHubViewProps> = ({ onBackToDashboard }) => {
  const { isDark } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState<GameCategory>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeGameId, setActiveGameId] = useState<string | null>(null);

  // Filter games based on selected category & search query
  const filteredGames = GAME_CATALOG.filter((game) => {
    const matchesCategory =
      selectedCategory === 'All' || game.category === selectedCategory;
    const matchesSearch =
      searchQuery.trim() === '' ||
      game.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      game.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      game.badge.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // If a game is actively playing, render that game component with a back handler
  if (activeGameId) {
    const returnToHub = () => setActiveGameId(null);

    switch (activeGameId) {
      case 'rain_calculation':
        return <RainCalculationGame onBackToHub={returnToHub} />;
      case 'rush_60':
        return <SixtySecondRushGame onBackToHub={returnToHub} />;
      case 'rocket_launch':
        return <RocketGame onBackToHub={returnToHub} />;
      case 'bomb_defusal':
        return <BombDefusalGame onBackToHub={returnToHub} />;
      case 'survival_endurance':
        return <SurvivalGame onBackToHub={returnToHub} />;
      case 'calculation_runner':
        return <CalculationRunnerGame onBackToHub={returnToHub} />;
      case 'boss_battle':
        return <BossBattleGame onBackToHub={returnToHub} />;
      case 'memory_calculation':
        return <MemoryCalculationGame onBackToHub={returnToHub} />;
      case 'operation_switch':
        return <OperationSwitchGame onBackToHub={returnToHub} />;
      case 'table_chain':
        return <TableChainGame onBackToHub={returnToHub} />;
      case 'table_battle':
        return <TableBattleGame onBackToHub={returnToHub} />;
      case 'quick_compare':
        return <QuickCompareGame onBackToHub={returnToHub} />;
      case 'bigger_smaller':
        return <BiggerSmallerGame onBackToHub={returnToHub} />;
      case 'number_target':
        return <NumberTargetGame onBackToHub={returnToHub} />;
      case 'table_breaker':
        return <TableBreakerGame onBackToHub={returnToHub} />;
      case 'find_mistake':
        return <FindMistakeGame onBackToHub={returnToHub} />;
      case 'closest_answer':
        return <ClosestAnswerGame onBackToHub={returnToHub} />;
      default:
        setActiveGameId(null);
        break;
    }
  }

  const categories: GameCategory[] = [
    'All',
    'Speed',
    'Survival',
    'Memory',
    'Battles',
    'Challenges',
  ];

  return (
    <div className="flex-1 flex flex-col space-y-4 sm:space-y-6 w-full max-w-7xl mx-auto pb-8">
      {/* Header Hero Banner */}
      <div className="p-4 sm:p-8 rounded-3xl bg-gradient-to-r from-indigo-900/60 via-purple-900/50 to-slate-900 border border-indigo-500/30 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 flex items-center gap-1.5">
                <Gamepad2 className="w-3.5 h-3.5 text-indigo-400" />
                Gamified Practice Suite
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                17 Modes
              </span>
            </div>
            <h1 className="text-xl sm:text-3xl font-black text-white tracking-tight">
              Math Arcade Arena
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
              Sharpen your mental arithmetic across Speed runs, Survival gauntlets, Memory recall, Battles, and Estimation challenges.
            </p>
          </div>

          {onBackToDashboard && (
            <button
              type="button"
              onClick={onBackToDashboard}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 self-start sm:self-center transition-colors shadow-sm flex-shrink-0"
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Category Pills */}
        <div className="flex items-center gap-1 p-1 bg-slate-200/80 dark:bg-slate-800/80 rounded-2xl border border-slate-300/80 dark:border-slate-700/60 w-full sm:w-auto overflow-x-auto scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`py-1.5 px-3 sm:px-3.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex-shrink-0 ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search Field */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search games..."
            className="w-full pl-9 pr-4 py-1.5 bg-white dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>

      {/* Games Catalog Grid - 17 Game Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-5">
        {filteredGames.map((game) => {
          const Icon = game.icon;
          const { accent, dayTop, dayBottom, nightTop, nightBottom } = game.themeColors;

          const cardBg = isDark
            ? `linear-gradient(to bottom, ${nightTop}, ${nightBottom})`
            : `linear-gradient(to bottom, ${dayTop}, ${dayBottom})`;

          const cardBorder = `${accent}33`; // ~20% opacity
          const cardShadow = isDark
            ? '0 8px 24px rgba(0, 0, 0, 0.35)'
            : '0 8px 24px rgba(15, 23, 42, 0.08)';

          return (
            <div
              key={game.id}
              onClick={() => setActiveGameId(game.id)}
              className="game-catalog-card p-5 rounded-3xl border cursor-pointer group flex flex-col justify-between space-y-4"
              style={{
                background: cardBg,
                borderColor: cardBorder,
                boxShadow: cardShadow,
                ['--card-hover-border' as string]: `${accent}66`,
                ['--card-hover-shadow' as string]: isDark
                  ? `0 12px 30px rgba(0, 0, 0, 0.5), 0 0 16px ${accent}25`
                  : '0 12px 28px rgba(15, 23, 42, 0.14)',
              }}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  {/* Icon Container */}
                  <div
                    className="p-3 rounded-2xl shadow-sm transition-transform group-hover:scale-105 flex items-center justify-center flex-shrink-0"
                    style={{
                      backgroundColor: isDark
                        ? 'rgba(255, 255, 255, 0.08)'
                        : 'rgba(255, 255, 255, 0.85)',
                      borderColor: isDark ? `${accent}33` : 'rgba(15, 23, 42, 0.08)',
                      borderWidth: '1px',
                      borderStyle: 'solid',
                    }}
                  >
                    <Icon className="w-6 h-6" style={{ color: accent }} />
                  </div>

                  {/* Badges */}
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    <span
                      className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border shadow-2xs"
                      style={{
                        backgroundColor: isDark
                          ? 'rgba(255, 255, 255, 0.08)'
                          : 'rgba(255, 255, 255, 0.85)',
                        borderColor: isDark
                          ? 'rgba(255, 255, 255, 0.15)'
                          : 'rgba(15, 23, 42, 0.08)',
                        color: isDark ? '#F8FAFC' : '#172033',
                      }}
                    >
                      {game.difficultyBadge}
                    </span>
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-bold border"
                      style={{
                        backgroundColor: isDark ? `${accent}25` : `${accent}18`,
                        borderColor: isDark ? `${accent}40` : `${accent}35`,
                        color: accent,
                      }}
                    >
                      {game.category}
                    </span>
                  </div>
                </div>

                {/* Title & Description */}
                <div>
                  <h3
                    className="text-lg font-black transition-colors"
                    style={{ color: isDark ? '#F8FAFC' : '#172033' }}
                  >
                    {game.title}
                  </h3>
                  <p
                    className="text-xs mt-1 line-clamp-2 leading-relaxed"
                    style={{ color: isDark ? '#AAB5C7' : '#526078' }}
                  >
                    {game.description}
                  </p>
                </div>
              </div>

              {/* Card Footer: Badge & Play Now */}
              <div
                className="flex items-center justify-between pt-3 text-xs font-bold transition-colors"
                style={{
                  borderTop: isDark
                    ? '1px solid rgba(255, 255, 255, 0.1)'
                    : '1px solid rgba(15, 23, 42, 0.08)',
                }}
              >
                <span
                  className="text-[11px] font-mono uppercase tracking-wide"
                  style={{ color: isDark ? '#AAB5C7' : '#526078' }}
                >
                  {game.badge}
                </span>
                <span
                  className="flex items-center gap-1 group-hover:translate-x-1 transition-transform"
                  style={{ color: accent }}
                >
                  Play Now <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {filteredGames.length === 0 && (
        <div className="p-12 text-center bg-slate-900/60 rounded-3xl border border-slate-800 space-y-2">
          <Gamepad2 className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No games found</h3>
          <p className="text-xs text-slate-400">
            Try adjusting your search query or selecting a different category tab.
          </p>
        </div>
      )}
    </div>
  );
};
