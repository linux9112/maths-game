import { LucideIcon } from 'lucide-react';
import {
  CloudRain,
  Timer,
  Rocket,
  Bomb,
  Shield,
  Footprints,
  Skull,
  Brain,
  RefreshCw,
  Link2,
  Swords,
  Scale,
  ArrowUpDown,
  Target,
  LayoutGrid,
  Search,
  Compass,
} from 'lucide-react';

export type GameCategory = 'All' | 'Speed' | 'Survival' | 'Memory' | 'Battles' | 'Challenges';

export interface GameThemeColors {
  readonly accent: string;
  readonly dayTop: string;
  readonly dayBottom: string;
  readonly nightTop: string;
  readonly nightBottom: string;
}

export interface GameCatalogItem {
  id: string;
  title: string;
  category: 'Speed' | 'Survival' | 'Memory' | 'Battles' | 'Challenges';
  description: string;
  badge: string;
  difficultyBadge: 'Beginner' | 'Normal' | 'Hard' | 'Expert';
  icon: LucideIcon;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  themeColors: GameThemeColors;
}

export const GAME_CATALOG: GameCatalogItem[] = [
  // Speed (4)
  // GAME 1 — RAIN CALCULATION
  {
    id: 'rain_calculation',
    title: 'Rain Calculation',
    category: 'Speed',
    description: 'Pop falling arithmetic raindrops before they hit the splash zone.',
    badge: 'Falling Drops',
    difficultyBadge: 'Normal',
    icon: CloudRain,
    colorClass: 'text-cyan-400',
    bgClass: 'from-cyan-950/40 to-slate-900',
    borderClass: 'border-cyan-500/30 hover:border-cyan-400',
    themeColors: {
      accent: '#06B6D4',
      dayTop: '#E0F7FA',
      dayBottom: '#B2EBF2',
      nightTop: '#102C35',
      nightBottom: '#16424D',
    },
  },
  // GAME 2 — 60-SECOND RUSH
  {
    id: 'rush_60',
    title: '60-Second Rush',
    category: 'Speed',
    description: 'Global 60-second time attack with sub-second bonuses and combo streak extensions.',
    badge: 'Time Attack',
    difficultyBadge: 'Normal',
    icon: Timer,
    colorClass: 'text-amber-400',
    bgClass: 'from-amber-950/40 to-slate-900',
    borderClass: 'border-amber-500/30 hover:border-amber-400',
    themeColors: {
      accent: '#F59E0B',
      dayTop: '#FFF3D6',
      dayBottom: '#FFE0A3',
      nightTop: '#352710',
      nightBottom: '#4A3414',
    },
  },
  // GAME 3 — ROCKET MATH
  {
    id: 'rocket_launch',
    title: 'Rocket Math',
    category: 'Speed',
    description: 'Propel your rocket through atmospheric stages into orbit against constant gravity.',
    badge: 'Altitude Rush',
    difficultyBadge: 'Hard',
    icon: Rocket,
    colorClass: 'text-purple-400',
    bgClass: 'from-indigo-950/40 to-slate-900',
    borderClass: 'border-indigo-500/30 hover:border-indigo-400',
    themeColors: {
      accent: '#8B5CF6',
      dayTop: '#E9E5FF',
      dayBottom: '#D5CCFF',
      nightTop: '#211B43',
      nightBottom: '#302666',
    },
  },
  // GAME 4 — BOMB DEFUSAL
  {
    id: 'bomb_defusal',
    title: 'Bomb Defusal',
    category: 'Speed',
    description: 'Cut colored wires before their ticking fuses detonate. Mistakes burn fuses 2x faster.',
    badge: 'Ticking Fuse',
    difficultyBadge: 'Expert',
    icon: Bomb,
    colorClass: 'text-rose-400',
    bgClass: 'from-red-950/40 to-slate-900',
    borderClass: 'border-red-500/30 hover:border-red-400',
    themeColors: {
      accent: '#F43F5E',
      dayTop: '#FFE5E8',
      dayBottom: '#FFC9D0',
      nightTop: '#3B151D',
      nightBottom: '#551D29',
    },
  },

  // Survival (3)
  // GAME 5 — SURVIVAL ENDURANCE
  {
    id: 'survival_endurance',
    title: 'Survival Endurance',
    category: 'Survival',
    description: 'Classic 3-lives endurance through escalating waves. Shields & heart recovery on streaks.',
    badge: 'Endurance',
    difficultyBadge: 'Normal',
    icon: Shield,
    colorClass: 'text-pink-400',
    bgClass: 'from-rose-950/40 to-slate-900',
    borderClass: 'border-rose-500/30 hover:border-rose-400',
    themeColors: {
      accent: '#EC4899',
      dayTop: '#FFE8F0',
      dayBottom: '#FFCFE0',
      nightTop: '#391727',
      nightBottom: '#542039',
    },
  },
  // GAME 6 — CALCULATION RUNNER
  {
    id: 'calculation_runner',
    title: 'Calculation Runner',
    category: 'Survival',
    description: '3-lane perspective runner. Steer into the lane carrying the correct answer before impact.',
    badge: '3-Lane Action',
    difficultyBadge: 'Hard',
    icon: Footprints,
    colorClass: 'text-sky-400',
    bgClass: 'from-teal-950/40 to-slate-900',
    borderClass: 'border-teal-500/30 hover:border-teal-400',
    themeColors: {
      accent: '#0EA5E9',
      dayTop: '#E0F2FE',
      dayBottom: '#C7E5FF',
      nightTop: '#12283D',
      nightBottom: '#183C59',
    },
  },
  // GAME 7 — BOSS BATTLE ARENA
  {
    id: 'boss_battle',
    title: 'Boss Battle Arena',
    category: 'Survival',
    description: 'Active Time Battle RPG against legendary math bosses with charge meters and combos.',
    badge: 'RPG Arena',
    difficultyBadge: 'Expert',
    icon: Skull,
    colorClass: 'text-purple-400',
    bgClass: 'from-purple-950/40 to-slate-900',
    borderClass: 'border-purple-500/30 hover:border-purple-400',
    themeColors: {
      accent: '#A855F7',
      dayTop: '#F0E5FF',
      dayBottom: '#DEC7FF',
      nightTop: '#28163D',
      nightBottom: '#3D205C',
    },
  },

  // Memory (3)
  // GAME 8 — MEMORY CALCULATION
  {
    id: 'memory_calculation',
    title: 'Memory Calculation',
    category: 'Memory',
    description: 'Card flashes for 1.8 seconds and flips face-down. Solve strictly from mental memory.',
    badge: 'Flash Memory',
    difficultyBadge: 'Normal',
    icon: Brain,
    colorClass: 'text-emerald-400',
    bgClass: 'from-indigo-950/40 to-slate-900',
    borderClass: 'border-indigo-500/30 hover:border-indigo-400',
    themeColors: {
      accent: '#10B981',
      dayTop: '#E5F8EF',
      dayBottom: '#C8EDDC',
      nightTop: '#102F27',
      nightBottom: '#164438',
    },
  },
  // GAME 9 — OPERATION SWITCH
  {
    id: 'operation_switch',
    title: 'Operation Switch',
    category: 'Memory',
    description: 'Cognitive flexibility test. Operators dynamically switch between +, −, ×, and ÷.',
    badge: 'Agility',
    difficultyBadge: 'Hard',
    icon: RefreshCw,
    colorClass: 'text-teal-400',
    bgClass: 'from-emerald-950/40 to-slate-900',
    borderClass: 'border-emerald-500/30 hover:border-emerald-400',
    themeColors: {
      accent: '#14B8A6',
      dayTop: '#E3F7F3',
      dayBottom: '#C5ECE5',
      nightTop: '#102F2C',
      nightBottom: '#17453F',
    },
  },
  // GAME 10 — TABLE CHAIN
  {
    id: 'table_chain',
    title: 'Table Chain',
    category: 'Memory',
    description: 'Sequence pattern deduction. Determine the times-table interval to fill missing sequence slots.',
    badge: 'Sequence',
    difficultyBadge: 'Normal',
    icon: Link2,
    colorClass: 'text-orange-400',
    bgClass: 'from-amber-950/40 to-slate-900',
    borderClass: 'border-amber-500/30 hover:border-amber-400',
    themeColors: {
      accent: '#F97316',
      dayTop: '#FFF0D9',
      dayBottom: '#FFDEAE',
      nightTop: '#382712',
      nightBottom: '#503817',
    },
  },

  // Battles (3)
  // GAME 11 — TABLE BATTLE
  {
    id: 'table_battle',
    title: 'Table Battle',
    category: 'Battles',
    description: 'Head-to-head multiplication tables duel. Decide whether left is <, =, or > right.',
    badge: 'Duel',
    difficultyBadge: 'Normal',
    icon: Swords,
    colorClass: 'text-orange-400',
    bgClass: 'from-amber-950/40 to-slate-900',
    borderClass: 'border-amber-500/30 hover:border-amber-400',
    themeColors: {
      accent: '#F97316',
      dayTop: '#FFE9D8',
      dayBottom: '#FFD0A8',
      nightTop: '#3A2112',
      nightBottom: '#523019',
    },
  },
  // GAME 12 — QUICK COMPARE
  {
    id: 'quick_compare',
    title: 'Quick Compare',
    category: 'Battles',
    description: 'Compare arithmetic expressions across operations with rapid-fire <, =, and > decisions.',
    badge: 'Comparison',
    difficultyBadge: 'Normal',
    icon: Scale,
    colorClass: 'text-blue-400',
    bgClass: 'from-blue-950/40 to-slate-900',
    borderClass: 'border-blue-500/30 hover:border-blue-400',
    themeColors: {
      accent: '#3B82F6',
      dayTop: '#E7EEFF',
      dayBottom: '#CBDCFF',
      nightTop: '#142542',
      nightBottom: '#1B3560',
    },
  },
  // GAME 16 — BIGGER OR SMALLER (MEMORY/THRESHOLD BATTLES)
  {
    id: 'bigger_smaller',
    title: 'Bigger or Smaller',
    category: 'Battles',
    description: 'Evaluate whether a dynamic arithmetic problem is greater or less than a benchmark threshold.',
    badge: 'Threshold',
    difficultyBadge: 'Normal',
    icon: ArrowUpDown,
    colorClass: 'text-teal-400',
    bgClass: 'from-teal-950/40 to-slate-900',
    borderClass: 'border-teal-500/30 hover:border-teal-400',
    themeColors: {
      accent: '#0D9488',
      dayTop: '#E8F7F5',
      dayBottom: '#C9ECE7',
      nightTop: '#102D2B',
      nightBottom: '#16413D',
    },
  },

  // Challenges (4)
  // GAME 13 — NUMBER TARGET
  {
    id: 'number_target',
    title: 'Number Target',
    category: 'Challenges',
    description: 'Combine given number tiles and operations to build an expression matching the target value.',
    badge: 'Tile Puzzle',
    difficultyBadge: 'Hard',
    icon: Target,
    colorClass: 'text-blue-500',
    bgClass: 'from-indigo-950/40 to-slate-900',
    borderClass: 'border-indigo-500/30 hover:border-indigo-400',
    themeColors: {
      accent: '#2563EB',
      dayTop: '#E4F0FF',
      dayBottom: '#C9DFFF',
      nightTop: '#12263D',
      nightBottom: '#193A5C',
    },
  },
  // GAME 17 — TABLE BREAKER (MIXED/CHALLENGE)
  {
    id: 'table_breaker',
    title: 'Table Breaker',
    category: 'Challenges',
    description: 'Breakout brick wall demolition. Solve calculations to shatter each colored brick.',
    badge: 'Demolition',
    difficultyBadge: 'Normal',
    icon: LayoutGrid,
    colorClass: 'text-indigo-400',
    bgClass: 'from-amber-950/40 to-slate-900',
    borderClass: 'border-amber-500/30 hover:border-amber-400',
    themeColors: {
      accent: '#6366F1',
      dayTop: '#EEF2FF',
      dayBottom: '#DDE4FF',
      nightTop: '#171D38',
      nightBottom: '#232D55',
    },
  },
  // GAME 14 — FIND THE MISTAKE
  {
    id: 'find_mistake',
    title: 'Find the Mistake',
    category: 'Challenges',
    description: 'Audit 4 displayed arithmetic equations and immediately spot the single erroneous calculation.',
    badge: 'Error Audit',
    difficultyBadge: 'Normal',
    icon: Search,
    colorClass: 'text-rose-500',
    bgClass: 'from-rose-950/40 to-slate-900',
    borderClass: 'border-rose-500/30 hover:border-rose-400',
    themeColors: {
      accent: '#E11D48',
      dayTop: '#FFF0F2',
      dayBottom: '#FFD9DE',
      nightTop: '#35171C',
      nightBottom: '#4D2028',
    },
  },
  // GAME 15 — CLOSEST ANSWER
  {
    id: 'closest_answer',
    title: 'Closest Answer',
    category: 'Challenges',
    description: 'Mental rounding and magnitude estimation. Pick the closest estimate without scratch paper.',
    badge: 'Estimation',
    difficultyBadge: 'Expert',
    icon: Compass,
    colorClass: 'text-purple-500',
    bgClass: 'from-cyan-950/40 to-slate-900',
    borderClass: 'border-cyan-500/30 hover:border-cyan-400',
    themeColors: {
      accent: '#7C3AED',
      dayTop: '#F1EDFF',
      dayBottom: '#DDD5FF',
      nightTop: '#211B3B',
      nightBottom: '#30275A',
    },
  },
];

export function getGameTheme(gameId?: string): GameThemeColors {
  if (!gameId) {
    return {
      accent: '#6366F1',
      dayTop: '#EEF2FF',
      dayBottom: '#DDE4FF',
      nightTop: '#171D38',
      nightBottom: '#232D55',
    };
  }
  const match = GAME_CATALOG.find((g) => g.id === gameId);
  return (
    match?.themeColors || {
      accent: '#6366F1',
      dayTop: '#EEF2FF',
      dayBottom: '#DDE4FF',
      nightTop: '#171D38',
      nightBottom: '#232D55',
    }
  );
}

