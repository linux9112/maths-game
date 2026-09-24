import React, { useState } from 'react';
import { VisualViewportWrapper } from '../components/common/VisualViewportWrapper';
import { Header } from '../components/common/Header';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { useAudio } from '../core/audio/useAudio';
import { SettingsStore } from '../core/storage/settingsStore';
import { OperationsFeature } from '../features/operations';
import { TablesFeature } from '../features/tables';
import { ProgressDashboard } from '../features/dashboard';
import { DailyChallengeFeature } from '../features/daily';
import { AdaptiveFeature } from '../features/adaptive';
import { useProgression } from '../features/progression/progressionStore';
import {
  LayoutDashboard,
  Grid3X3,
  Calculator,
  Calendar,
  Zap,
  Layers,
  HelpCircle,
  Gamepad2,
} from 'lucide-react';
import { GamesHubView } from '../features/games/hub';

export type AppNavTab =
  | 'dashboard'
  | 'tables'
  | 'operations'
  | 'daily'
  | 'adaptive'
  | 'games'
  | 'components';

export const App: React.FC = () => {
  const audio = useAudio();
  const { profile, levelProgress } = useProgression();
  const [activeTab, setActiveTab] = useState<AppNavTab>('dashboard');
  const [useVirtualKeypad, setUseVirtualKeypad] = useState<boolean>(
    () => SettingsStore.get().useVirtualKeypad
  );
  const [testModalOpen, setTestModalOpen] = useState<boolean>(false);

  const toggleKeypad = () => {
    const next = !useVirtualKeypad;
    setUseVirtualKeypad(next);
    SettingsStore.set({ useVirtualKeypad: next });
    audio.playButtonTap();
  };

  return (
    <VisualViewportWrapper className="bg-slate-900 text-slate-100 font-sans">
      {/* Header with real progression state */}
      <Header
        title="MathMastery"
        xp={profile.xp}
        level={levelProgress.level}
        levelTitle={levelProgress.title}
        streakDays={profile.currentStreak}
        isMuted={audio.isMuted}
        onToggleMute={audio.toggleMute}
        onPlaySound={audio.playButtonTap}
        useVirtualKeypad={useVirtualKeypad}
        onToggleVirtualKeypad={toggleKeypad}
        onHomeClick={() => {
          setActiveTab('dashboard');
          audio.playButtonTap();
        }}
        onGamesClick={() => {
          setActiveTab('games');
          audio.playButtonTap();
        }}
      />

      {/* Main Navigation & View Container */}
      <main className="flex-1 flex flex-col overflow-y-auto px-2.5 sm:px-6 lg:px-8 py-2.5 sm:py-5 max-w-7xl mx-auto w-full">
        {/* Navigation Tabs - Scrolls cleanly on mobile without clipping, centers on desktop */}
        <nav
          aria-label="Main Navigation"
          className="flex items-center justify-start md:justify-center gap-1 sm:gap-1.5 p-1 sm:p-1.5 bg-slate-800/90 rounded-2xl border border-slate-700/60 shadow-inner mb-4 sm:mb-6 overflow-x-auto scrollbar-none w-full max-w-full flex-shrink-0"
        >
          <button
            type="button"
            onClick={() => {
              setActiveTab('dashboard');
              audio.playButtonTap();
            }}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2.5 sm:py-2 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex-shrink-0 ${
              activeTab === 'dashboard'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            Dashboard
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('tables');
              audio.playButtonTap();
            }}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2.5 sm:py-2 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex-shrink-0 ${
              activeTab === 'tables'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40'
            }`}
          >
            <Grid3X3 className="w-3.5 h-3.5" />
            Tables
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('operations');
              audio.playButtonTap();
            }}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2.5 sm:py-2 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex-shrink-0 ${
              activeTab === 'operations'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            Operations
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('daily');
              audio.playButtonTap();
            }}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2.5 sm:py-2 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex-shrink-0 ${
              activeTab === 'daily'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Daily
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('adaptive');
              audio.playButtonTap();
            }}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2.5 sm:py-2 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex-shrink-0 ${
              activeTab === 'adaptive'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            Adaptive
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('games');
              audio.playButtonTap();
            }}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2.5 sm:py-2 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex-shrink-0 ${
              activeTab === 'games'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40'
            }`}
          >
            <Gamepad2 className="w-3.5 h-3.5 text-purple-400" />
            Games
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('components');
              audio.playButtonTap();
            }}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2.5 sm:py-2 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex-shrink-0 ${
              activeTab === 'components'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            UI Kit
          </button>
        </nav>

        {/* View Router */}
        {activeTab === 'dashboard' && (
          <ProgressDashboard
            onPracticeWeakness={() => setActiveTab('adaptive')}
            onPlayDaily={() => setActiveTab('daily')}
            onPracticeTable={() => setActiveTab('tables')}
          />
        )}

        {activeTab === 'tables' && (
          <TablesFeature useVirtualKeypad={useVirtualKeypad} />
        )}

        {activeTab === 'operations' && (
          <OperationsFeature useVirtualKeypad={useVirtualKeypad} />
        )}

        {activeTab === 'daily' && (
          <DailyChallengeFeature onBackToDashboard={() => setActiveTab('dashboard')} />
        )}

        {activeTab === 'adaptive' && (
          <AdaptiveFeature onBackToDashboard={() => setActiveTab('dashboard')} />
        )}

        {activeTab === 'games' && (
          <GamesHubView onBackToDashboard={() => setActiveTab('dashboard')} />
        )}

        {activeTab === 'components' && (
          <div className="flex-1 flex flex-col justify-center my-4 space-y-5">
            <div className="text-center space-y-1">
              <h2 className="text-xl font-extrabold text-white flex items-center justify-center gap-2">
                <Layers className="w-5 h-5 text-indigo-400" />
                UI Kit & Synthesizer
              </h2>
            </div>

            <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Buttons</h3>
              <div className="flex flex-wrap gap-2">
                <Button variant="primary" size="sm">Primary</Button>
                <Button variant="secondary" size="md">Secondary</Button>
                <Button variant="success" size="md">Success</Button>
                <Button variant="danger" size="md">Danger</Button>
                <Button variant="outline" size="md">Outline</Button>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Modal Dialog</h3>
                <p className="text-xs text-slate-400">ESC dismiss & backdrop blur</p>
              </div>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<HelpCircle className="w-4 h-4" />}
                onClick={() => setTestModalOpen(true)}
              >
                Open Modal
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* Reusable Test Modal */}
      <Modal
        isOpen={testModalOpen}
        onClose={() => setTestModalOpen(false)}
        title="Foundation Architecture"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="primary" size="md" onClick={() => setTestModalOpen(false)}>
              Got it!
            </Button>
          </div>
        }
      >
        <p className="text-sm text-slate-300">
          MathMastery Milestone 4 is fully integrated.
        </p>
      </Modal>
    </VisualViewportWrapper>
  );
};
