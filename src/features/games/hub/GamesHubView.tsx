import React, { useState } from 'react';
import {
  Gamepad2,
  Search,
  ArrowRight,
  LayoutDashboard,
} from 'lucide-react';
import { GAME_CATALOG, GameCategory } from './gameCatalog';
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
        <div className="flex items-center gap-1 p-1 bg-slate-800/80 rounded-2xl border border-slate-700/60 w-full sm:w-auto overflow-x-auto scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`py-1.5 px-3 sm:px-3.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex-shrink-0 ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
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
            className="w-full pl-9 pr-4 py-1.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>

      {/* Games Catalog Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-5">
        {filteredGames.map((game) => {
          const Icon = game.icon;
          return (
            <div
              key={game.id}
              onClick={() => setActiveGameId(game.id)}
              className={`p-5 rounded-3xl bg-gradient-to-b ${game.bgClass} border ${game.borderClass} shadow-xl hover:shadow-2xl transition-all cursor-pointer group flex flex-col justify-between space-y-4`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className={`p-3 rounded-2xl bg-slate-800/80 border border-slate-700 shadow-md ${game.colorClass} group-hover:scale-110 transition-transform`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-slate-800/90 text-slate-300 border border-slate-700">
                      {game.difficultyBadge}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-800/60">
                      {game.category}
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-black text-white group-hover:text-indigo-300 transition-colors">
                    {game.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {game.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs font-bold text-indigo-400 group-hover:text-indigo-300">
                <span className="text-[11px] font-mono text-slate-500 uppercase">{game.badge}</span>
                <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">
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
