import React, { useEffect, useRef } from 'react';
import { X, Keyboard } from 'lucide-react';

export interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  keys: string[];
  description: string;
}

const SHORTCUT_GROUPS: { group: string; items: ShortcutItem[] }[] = [
  {
    group: 'General Navigation',
    items: [
      { keys: ['Esc'], description: 'Close modal / Pause game / Return to menu' },
      { keys: ['?'], description: 'Open this keyboard shortcuts guide' },
      { keys: ['Tab', 'Shift+Tab'], description: 'Navigate active interactive elements' },
    ],
  },
  {
    group: 'Mode B: Direct Typing Practice',
    items: [
      { keys: ['0', '–', '9'], description: 'Directly type numerical answer' },
      { keys: ['Backspace'], description: 'Delete last entered digit' },
      { keys: ['Enter'], description: 'Submit current answer' },
      { keys: ['Delete', 'C'], description: 'Clear entire answer field' },
    ],
  },
  {
    group: 'Mode A: Multiple Choice Options',
    items: [
      { keys: ['1', '2', '3', '4'], description: 'Select corresponding answer choice (1 to 4)' },
    ],
  },
  {
    group: 'App Controls',
    items: [
      { keys: ['M'], description: 'Toggle sound mute / unmute' },
      { keys: ['T'], description: 'Toggle light / dark theme' },
      { keys: ['K'], description: 'Toggle mobile on-screen keypad' },
    ],
  },
];

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ isOpen, onClose }) => {
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    closeBtnRef.current?.focus();

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-shortcuts-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-6 text-slate-900 dark:text-slate-100 animate-scale-in max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400">
              <Keyboard className="w-5 h-5" />
            </div>
            <h2 id="modal-shortcuts-title" className="text-xl font-extrabold tracking-tight">
              Keyboard Shortcuts
            </h2>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Close shortcuts dialog"
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Shortcuts List */}
        <div className="overflow-y-auto pt-4 space-y-6 flex-1 pr-1">
          {SHORTCUT_GROUPS.map(({ group, items }) => (
            <div key={group} className="space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {group}
              </h3>
              <div className="grid gap-2">
                {items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800/80 text-sm"
                  >
                    <span className="text-slate-700 dark:text-slate-300 font-medium">
                      {item.description}
                    </span>
                    <div className="flex items-center gap-1">
                      {item.keys.map((k, kIdx) => (
                        <kbd
                          key={kIdx}
                          className="px-2.5 py-1 text-xs font-mono font-bold rounded-lg border bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 shadow-xs"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Modal Footer */}
        <div className="pt-4 mt-2 border-t border-slate-200 dark:border-slate-800 text-center flex-shrink-0">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Press <kbd className="px-1.5 py-0.5 font-mono text-[10px] rounded border bg-slate-100 dark:bg-slate-800">Esc</kbd> anytime to dismiss.
          </p>
        </div>
      </div>
    </div>
  );
};
