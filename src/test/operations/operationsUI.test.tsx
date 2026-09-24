import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OperationSelector } from '../../features/operations/components/OperationSelector';
import { LevelSelector } from '../../features/operations/components/LevelSelector';
import { OperationSummaryModal } from '../../features/operations/components/OperationSummaryModal';
import { ArithmeticPractice } from '../../features/operations/components/ArithmeticPractice';
import { OperationQuestion } from '../../features/operations/types';

describe('Operations UI Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('OperationSelector', () => {
    it('renders all 4 operator chips and All Mixed button', () => {
      render(
        <OperationSelector
          selectedOperators={['+']}
          onChange={vi.fn()}
        />
      );

      expect(screen.getByRole('button', { name: 'Toggle Addition' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Toggle Subtraction' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Toggle Multiplication' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Toggle Division' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /all mixed/i })).toBeInTheDocument();
    });

    it('toggles operator selection and prevents empty selection', () => {
      const handleChange = vi.fn();
      const { rerender } = render(
        <OperationSelector
          selectedOperators={['+', '*']}
          onChange={handleChange}
        />
      );

      // Deselect *
      fireEvent.click(screen.getByRole('button', { name: 'Toggle Multiplication' }));
      expect(handleChange).toHaveBeenCalledWith(['+']);

      // Attempting to deselect the last operator '+' should not remove it
      handleChange.mockClear();
      rerender(
        <OperationSelector
          selectedOperators={['+']}
          onChange={handleChange}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: 'Toggle Addition' }));
      expect(handleChange).not.toHaveBeenCalled();
    });

    it('All Mixed button selects all 4 operators', () => {
      const handleChange = vi.fn();
      render(
        <OperationSelector
          selectedOperators={['+']}
          onChange={handleChange}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /all mixed/i }));
      expect(handleChange).toHaveBeenCalledWith(['+', '-', '*', '/']);
    });
  });

  describe('LevelSelector', () => {
    it('renders Levels 1 through 5 with difficulty badges and dynamic description', () => {
      const handleSelect = vi.fn();
      render(
        <LevelSelector
          selectedLevel={3}
          selectedOperators={['+']}
          onSelectLevel={handleSelect}
        />
      );

      expect(screen.getByRole('radio', { name: /lv.1/i })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: /lv.3/i })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: /lv.5/i })).toBeInTheDocument();
      expect(screen.getByText('Intermediate')).toBeInTheDocument();
      expect(screen.getByText(/two-digit addition with carry/i)).toBeInTheDocument();

      fireEvent.click(screen.getByRole('radio', { name: /lv.4/i }));
      expect(handleSelect).toHaveBeenCalledWith(4);
    });
  });

  describe('ArithmeticPractice', () => {
    const mockQuestion: OperationQuestion = {
      id: 'add_12_34_0',
      operator: '+',
      operandA: 12,
      operandB: 34,
      answer: 46,
      promptText: '12 + 34 = ?',
      options: [46, 56, 36, 42],
      correctIndex: 0,
      difficulty: 'normal',
      level: 2,
    };

    it('renders prompt and Mode A multiple-choice options', () => {
      const handleSelect = vi.fn();
      render(
        <ArithmeticPractice
          question={mockQuestion}
          currentIndex={0}
          totalQuestions={10}
          inputMode="choice"
          combo={3}
          score={1}
          useVirtualKeypad={false}
          onExit={vi.fn()}
          selectedOptionIndex={null}
          choiceFeedback="idle"
          onSelectOption={handleSelect}
          inputValue=""
          shakeKey={0}
          inputFeedback="idle"
          onDigit={vi.fn()}
          onBackspace={vi.fn()}
          onClear={vi.fn()}
          onSubmit={vi.fn()}
          onInputChange={vi.fn()}
        />
      );

      expect(screen.getByText(/12 \+ 34 = \?/i)).toBeInTheDocument();
      expect(screen.getByText('3 Streak!')).toBeInTheDocument();
      expect(screen.getByText('46')).toBeInTheDocument();
      expect(screen.getByText('56')).toBeInTheDocument();

      fireEvent.click(screen.getByText('46'));
      expect(handleSelect).toHaveBeenCalledWith(0);
    });

    it('renders Mode B input field and handles typing submit', () => {
      const handleSubmit = vi.fn();
      const handleChange = vi.fn();
      render(
        <ArithmeticPractice
          question={mockQuestion}
          currentIndex={0}
          totalQuestions={10}
          inputMode="direct"
          combo={0}
          score={0}
          useVirtualKeypad={false}
          onExit={vi.fn()}
          selectedOptionIndex={null}
          choiceFeedback="idle"
          onSelectOption={vi.fn()}
          inputValue="46"
          shakeKey={0}
          inputFeedback="idle"
          onDigit={vi.fn()}
          onBackspace={vi.fn()}
          onClear={vi.fn()}
          onSubmit={handleSubmit}
          onInputChange={handleChange}
        />
      );

      const input = screen.getByLabelText('Your Answer');
      expect(input).toHaveValue('46');

      const submitBtn = screen.getByRole('button', { name: /submit answer/i });
      fireEvent.click(submitBtn);
      expect(handleSubmit).toHaveBeenCalledTimes(1);
    });
  });

  describe('OperationSummaryModal', () => {
    it('renders accuracy, speed, and handles action buttons', () => {
      const onPlayAgain = vi.fn();
      const onChangeSettings = vi.fn();
      const mockSummary = {
        totalQuestions: 10,
        correctFirstTryCount: 9,
        accuracyPercentage: 90,
        averageResponseTimeMs: 1600,
        maxCombo: 8,
        totalXpGained: 145,
        operatorBreakdown: {
          '+': { total: 5, correct: 5 },
          '-': { total: 5, correct: 4 },
          '*': { total: 0, correct: 0 },
          '/': { total: 0, correct: 0 },
        },
        elapsedTimeMs: 16000,
      };

      render(
        <OperationSummaryModal
          isOpen={true}
          summary={mockSummary}
          onPlayAgain={onPlayAgain}
          onChangeSettings={onChangeSettings}
        />
      );

      expect(screen.getByText('90%')).toBeInTheDocument();
      expect(screen.getByText('+145 XP Earned')).toBeInTheDocument();
      expect(screen.getByText('1.6s')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /play again/i }));
      expect(onPlayAgain).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByRole('button', { name: /change settings/i }));
      expect(onChangeSettings).toHaveBeenCalledTimes(1);
    });
  });
});
