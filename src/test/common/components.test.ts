import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { VirtualKeypad } from '../../components/common/VirtualKeypad';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { ProgressBar } from '../../components/common/ProgressBar';
import { Header } from '../../components/common/Header';

describe('Common UI Components Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('VirtualKeypad', () => {
    const onDigit = vi.fn();
    const onBackspace = vi.fn();
    const onSubmit = vi.fn();

    it('renders all digits 0-9, backspace, and submit button', () => {
      render(
        React.createElement(VirtualKeypad, {
          onDigit,
          onBackspace,
          onSubmit,
        })
      );

      for (let i = 0; i <= 9; i++) {
        expect(screen.getByRole('button', { name: `Digit ${i}` })).toBeInTheDocument();
      }
      expect(screen.getByRole('button', { name: 'Backspace' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Submit Answer' })).toBeInTheDocument();
    });

    it('invokes onDigit and haptic vibration when digit is pressed', () => {
      render(
        React.createElement(VirtualKeypad, {
          onDigit,
          onBackspace,
          onSubmit,
        })
      );

      const digit8 = screen.getByRole('button', { name: 'Digit 8' });
      fireEvent.pointerDown(digit8);

      expect(onDigit).toHaveBeenCalledWith('8');
      expect(navigator.vibrate).toHaveBeenCalledWith(12);
    });

    it('invokes onBackspace when backspace button is pressed', () => {
      render(
        React.createElement(VirtualKeypad, {
          onDigit,
          onBackspace,
          onSubmit,
        })
      );

      const backspaceBtn = screen.getByRole('button', { name: 'Backspace' });
      fireEvent.pointerDown(backspaceBtn);

      expect(onBackspace).toHaveBeenCalledTimes(1);
    });

    it('invokes onSubmit when submit button is pressed', () => {
      render(
        React.createElement(VirtualKeypad, {
          onDigit,
          onBackspace,
          onSubmit,
        })
      );

      const submitBtn = screen.getByRole('button', { name: 'Submit Answer' });
      fireEvent.pointerDown(submitBtn);

      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it('disables all buttons when disabled prop is true', () => {
      render(
        React.createElement(VirtualKeypad, {
          onDigit,
          onBackspace,
          onSubmit,
          disabled: true,
        })
      );

      const digit4 = screen.getByRole('button', { name: 'Digit 4' });
      expect(digit4).toBeDisabled();
      fireEvent.pointerDown(digit4);
      expect(onDigit).not.toHaveBeenCalled();
    });
  });

  describe('Button', () => {
    it('renders with children, responds to click, and handles loading state', () => {
      const handleClick = vi.fn();
      const { rerender } = render(
        React.createElement(
          Button,
          { onClick: handleClick, variant: 'primary', size: 'md' },
          'Click Me'
        )
      );

      const btn = screen.getByRole('button', { name: 'Click Me' });
      fireEvent.click(btn);
      expect(handleClick).toHaveBeenCalledTimes(1);

      // Loading state
      rerender(
        React.createElement(
          Button,
          { onClick: handleClick, isLoading: true },
          'Click Me'
        )
      );

      expect(btn).toBeDisabled();
      fireEvent.click(btn);
      expect(handleClick).toHaveBeenCalledTimes(1); // Not called again
    });
  });

  describe('Modal', () => {
    it('does not render when isOpen is false', () => {
      render(
        React.createElement(
          Modal,
          { isOpen: false, onClose: vi.fn(), title: 'Test Modal' },
          React.createElement('div', null, 'Modal Content')
        )
      );

      expect(screen.queryByText('Modal Content')).not.toBeInTheDocument();
    });

    it('renders when isOpen is true and closes on Escape key or close button', () => {
      const handleClose = vi.fn();
      render(
        React.createElement(
          Modal,
          { isOpen: true, onClose: handleClose, title: 'Test Modal' },
          React.createElement('div', null, 'Modal Content')
        )
      );

      expect(screen.getByText('Test Modal')).toBeInTheDocument();
      expect(screen.getByText('Modal Content')).toBeInTheDocument();

      // Test close button
      const closeBtn = screen.getByRole('button', { name: 'Close dialog' });
      fireEvent.click(closeBtn);
      expect(handleClose).toHaveBeenCalledTimes(1);

      // Test Escape key
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(handleClose).toHaveBeenCalledTimes(2);
    });
  });

  describe('ProgressBar', () => {
    it('renders with correct role, aria attributes, and percentage width', () => {
      render(
        React.createElement(ProgressBar, {
          value: 40,
          max: 100,
          showLabel: true,
          label: 'Test Progress',
          variant: 'emerald',
        })
      );

      const pb = screen.getByRole('progressbar');
      expect(pb).toHaveAttribute('aria-valuenow', '40');
      expect(pb).toHaveAttribute('aria-valuemin', '0');
      expect(pb).toHaveAttribute('aria-valuemax', '100');
      expect(screen.getByText('Test Progress')).toBeInTheDocument();
      expect(screen.getByText('40%')).toBeInTheDocument();
    });
  });

  describe('Header', () => {
    it('renders title, XP, level, and streak badge', () => {
      render(
        React.createElement(Header, {
          title: 'MathMastery',
          xp: 250,
          level: 3,
          levelTitle: 'Skilled',
          streakDays: 5,
        })
      );

      expect(screen.getByText('MathMastery')).toBeInTheDocument();
      expect(screen.getByText('Lv.3')).toBeInTheDocument();
      expect(screen.getByText('250 XP')).toBeInTheDocument();
      expect(screen.getByText('5d')).toBeInTheDocument();
    });
  });
});
