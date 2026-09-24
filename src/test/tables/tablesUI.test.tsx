import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TableSelector } from '../../features/tables/components/TableSelector';
import { TableMasteryCard } from '../../features/tables/components/TableMasteryCard';
import { TableModeAChoice } from '../../features/tables/components/TableModeAChoice';
import { TableModeBDirect } from '../../features/tables/components/TableModeBDirect';
import { TableMasteryReport } from '../../features/tables/types';

describe('Table UI Components Suite', () => {
  describe('TableSelector', () => {
    it('renders presets and triggers onSelectPreset when clicked', () => {
      const onSelectPreset = vi.fn();
      const mockConfig = {
        selectedTables: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        selectionMode: 'preset' as const,
        activePreset: '1-10' as const,
        customTableRange: { min: 1, max: 10 },
        multiplierPreset: '1-12' as const,
        multiplierRange: { min: 1, max: 12 },
        difficulty: 'normal' as const,
        inputMode: 'choice' as const,
        questionTarget: 20,
      };

      render(
        <TableSelector
          config={mockConfig}
          masteryReports={{}}
          onSelectPreset={onSelectPreset}
          onChangeCustomRange={vi.fn()}
          onToggleTable={vi.fn()}
          onSetSelectedTables={vi.fn()}
          onSelectMultiplierPreset={vi.fn()}
          onChangeMultiplierRange={vi.fn()}
          onSetInputMode={vi.fn()}
          onSetQuestionTarget={vi.fn()}
          onStartLearn={vi.fn()}
          onStartPractice={vi.fn()}
        />
      );

      expect(screen.getByText('1–10')).toBeInTheDocument();
      expect(screen.getByText('1–43')).toBeInTheDocument();
      expect(screen.getByText('1–100')).toBeInTheDocument();

      fireEvent.click(screen.getByText('1–43'));
      expect(onSelectPreset).toHaveBeenCalledWith('1-43');
    });
  });

  describe('TableMasteryCard', () => {
    it('renders correct badges and mastery percentage', () => {
      const mockReport: TableMasteryReport = {
        tableNumber: 12,
        masteryPercentage: 92,
        statusBadge: 'mastered',
        totalAttempts: 30,
        accuracyPercentage: 96,
        avgResponseTimeMs: 1800,
        factsMastered: 10,
        totalFacts: 10,
        factStats: {},
      };

      render(<TableMasteryCard report={mockReport} />);

      expect(screen.getByText('Table 12')).toBeInTheDocument();
      expect(screen.getByText('92%')).toBeInTheDocument();
      expect(screen.getByText('Mastered')).toBeInTheDocument();
    });

    it('displays Novice badge for <50% mastery', () => {
      const mockReport: TableMasteryReport = {
        tableNumber: 7,
        masteryPercentage: 30,
        statusBadge: 'novice',
        totalAttempts: 5,
        accuracyPercentage: 60,
        avgResponseTimeMs: 4000,
        factsMastered: 1,
        totalFacts: 10,
        factStats: {},
      };

      render(<TableMasteryCard report={mockReport} />);
      expect(screen.getByText('Novice')).toBeInTheDocument();
      expect(screen.getByText('30%')).toBeInTheDocument();
    });
  });

  describe('TableModeAChoice', () => {
    it('renders 4 choices with keyboard shortcut indicators 1-4', () => {
      const onSelectOption = vi.fn();
      render(
        <TableModeAChoice
          options={[49, 56, 46, 64]}
          correctAnswer={56}
          selectedIndex={null}
          feedback="idle"
          onSelectOption={onSelectOption}
        />
      );

      expect(screen.getByText('56')).toBeInTheDocument();
      expect(screen.getByText('49')).toBeInTheDocument();
      expect(screen.getByText('46')).toBeInTheDocument();
      expect(screen.getByText('64')).toBeInTheDocument();

      fireEvent.click(screen.getByText('56'));
      expect(onSelectOption).toHaveBeenCalledWith(1);
    });
  });

  describe('TableModeBDirect', () => {
    it('sets inputMode to "none" when useVirtualKeypad is true and "numeric" when false', () => {
      const { rerender } = render(
        <TableModeBDirect
          inputValue=""
          feedback="idle"
          shakeKey={0}
          useVirtualKeypad={true}
          onChangeInput={vi.fn()}
          onDigit={vi.fn()}
          onBackspace={vi.fn()}
          onClear={vi.fn()}
          onSubmit={vi.fn()}
        />
      );

      const input = screen.getByLabelText('Your Answer');
      expect(input).toHaveAttribute('inputMode', 'none');

      rerender(
        <TableModeBDirect
          inputValue=""
          feedback="idle"
          shakeKey={0}
          useVirtualKeypad={false}
          onChangeInput={vi.fn()}
          onDigit={vi.fn()}
          onBackspace={vi.fn()}
          onClear={vi.fn()}
          onSubmit={vi.fn()}
        />
      );

      expect(input).toHaveAttribute('inputMode', 'numeric');
    });
  });
});
