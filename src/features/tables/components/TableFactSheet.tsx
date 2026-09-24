import React from 'react';
import { TableFact } from '../types';
import { Sparkles, Hash } from 'lucide-react';
import { useAudio } from '../../../core/audio/useAudio';

export interface TableFactSheetProps {
  facts: readonly TableFact[];
}

export const TableFactSheet: React.FC<TableFactSheetProps> = ({ facts }) => {
  const audio = useAudio();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {facts.map((fact) => {
        return (
          <div
            key={fact.id}
            onClick={() => audio.playButtonTap()}
            className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/70 hover:border-indigo-500/60 transition-all cursor-pointer flex flex-col justify-between space-y-2 group"
          >
            <div className="flex items-center justify-between">
              <div className="font-mono text-xl sm:text-2xl font-black text-white group-hover:text-indigo-300 transition-colors">
                {fact.promptText} = <span className="text-emerald-400">{fact.answer}</span>
              </div>

              {/* Badges */}
              <div className="flex items-center gap-1">
                {fact.isSquare && (
                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    <Sparkles className="w-2.5 h-2.5" />
                    Square
                  </span>
                )}
                {fact.isMilestone && (
                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    <Hash className="w-2.5 h-2.5" />
                    {fact.multiplier === 10 ? 'Decade' : 'Midpoint'}
                  </span>
                )}
              </div>
            </div>

            {/* Decomposition / Mental Shortcut */}
            <div className="text-xs text-slate-400 bg-slate-900/60 px-2.5 py-1.5 rounded-xl border border-slate-800 font-mono">
              💡 {fact.breakdownHint}
            </div>
          </div>
        );
      })}
    </div>
  );
};
