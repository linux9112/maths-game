import { useState, useEffect, useCallback, useMemo } from 'react';
import { TableFact, ReviewTimerDuration, LearnViewType, FlashcardConfidence } from '../types';
import { useAudio } from '../../../core/audio/useAudio';

export interface UseTableLearnOptions {
  selectedTables: readonly number[];
  multiplierRange: { min: number; max: number };
  initialTimerDuration?: ReviewTimerDuration;
}

export function useTableLearn({
  selectedTables,
  multiplierRange,
  initialTimerDuration = 0,
}: UseTableLearnOptions) {
  const audio = useAudio();

  const [activeTable, setActiveTable] = useState<number>(selectedTables[0] ?? 1);
  const [viewType, setViewType] = useState<LearnViewType>('sheet');
  const [isShuffled, setIsShuffled] = useState<boolean>(false);
  const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [timerDuration, setTimerDuration] = useState<ReviewTimerDuration>(initialTimerDuration);
  const [timeRemainingSec, setTimeRemainingSec] = useState<number>(initialTimerDuration);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [confidenceMap, setConfidenceMap] = useState<Record<string, FlashcardConfidence>>({});

  useEffect(() => {
    if (!selectedTables.includes(activeTable)) {
      setActiveTable(selectedTables[0] ?? 1);
      setCurrentCardIndex(0);
      setIsFlipped(false);
    }
  }, [selectedTables, activeTable]);

  const orderedFacts = useMemo<TableFact[]>(() => {
    const facts: TableFact[] = [];
    const t = activeTable;
    for (let m = multiplierRange.min; m <= multiplierRange.max; m++) {
      const ans = t * m;
      let hint = `${t} added ${m} times`;
      if (m === 9) hint = `(${t} × 10) − ${t} = ${t * 10} − ${t} = ${ans}`;
      else if (m === 5) hint = `Half of (${t} × 10) = ${t * 10} ÷ 2 = ${ans}`;
      else if (m === 4) hint = `Double ${t} twice: ${t * 2} → ${ans}`;
      else if (m === t) hint = `Perfect square: ${t}² = ${ans}`;

      facts.push({
        id: `fact_${t}_${m}`,
        table: t,
        multiplier: m,
        answer: ans,
        promptText: `${t} × ${m}`,
        fullEquation: `${t} × ${m} = ${ans}`,
        isSquare: t === m,
        isMilestone: m === 5 || m === 10,
        breakdownHint: hint,
      });
    }
    return facts;
  }, [activeTable, multiplierRange]);

  const deck = useMemo<TableFact[]>(() => {
    if (!isShuffled) return orderedFacts;
    const copy = [...orderedFacts];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    return copy;
  }, [orderedFacts, isShuffled]);

  const currentFact = deck[currentCardIndex] || deck[0];

  const resetTimer = useCallback(() => {
    setTimeRemainingSec(timerDuration);
    setIsTimerRunning(timerDuration > 0);
  }, [timerDuration]);

  useEffect(() => {
    if (timerDuration === 0 || !isTimerRunning || viewType !== 'flashcard') return;

    const interval = setInterval(() => {
      setTimeRemainingSec((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          audio.playTick(true);
          setIsFlipped(true);

          setTimeout(() => {
            setCurrentCardIndex((idx) => (idx + 1) % deck.length);
            setIsFlipped(false);
            resetTimer();
          }, 2500);

          return 0;
        }

        if (prev <= 4) {
          audio.playTick(false);
        }

        return Math.round((prev - 0.5) * 10) / 10;
      });
    }, 500);

    return () => clearInterval(interval);
  }, [timerDuration, isTimerRunning, viewType, deck.length, resetTimer, audio]);

  const flipCard = useCallback(() => {
    setIsFlipped((f) => !f);
    audio.playButtonTap();
  }, [audio]);

  const nextCard = useCallback(() => {
    setIsFlipped(false);
    setCurrentCardIndex((idx) => (idx + 1) % deck.length);
    resetTimer();
    audio.playButtonTap();
  }, [deck.length, resetTimer, audio]);

  const prevCard = useCallback(() => {
    setIsFlipped(false);
    setCurrentCardIndex((idx) => (idx - 1 + deck.length) % deck.length);
    resetTimer();
    audio.playButtonTap();
  }, [deck.length, resetTimer, audio]);

  const markConfidence = useCallback(
    (status: 'learning' | 'mastered') => {
      if (!currentFact) return;
      setConfidenceMap((prev) => ({
        ...prev,
        [currentFact.id]: {
          factId: currentFact.id,
          status,
          reviewCount: (prev[currentFact.id]?.reviewCount || 0) + 1,
        },
      }));

      if (status === 'mastered') {
        audio.playCorrect();
      } else {
        audio.playButtonTap();
      }

      nextCard();
    },
    [currentFact, nextCard, audio]
  );

  return {
    activeTable,
    setActiveTable,
    viewType,
    setViewType,
    orderedFacts,
    deck,
    currentCardIndex,
    currentFact,
    isFlipped,
    flipCard,
    nextCard,
    prevCard,
    isShuffled,
    setIsShuffled: (shuffled: boolean) => {
      setIsShuffled(shuffled);
      setCurrentCardIndex(0);
      setIsFlipped(false);
    },
    timerDuration,
    setTimerDuration: (dur: ReviewTimerDuration) => {
      setTimerDuration(dur);
      setTimeRemainingSec(dur);
      setIsTimerRunning(dur > 0);
    },
    timeRemainingSec,
    isTimerRunning,
    togglePauseTimer: () => setIsTimerRunning((r) => !r),
    confidenceMap,
    markConfidence,
  };
}
