import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, renderHook, act } from '@testing-library/react';
import React from 'react';
import { ThemeToggle } from '../../components/common/ThemeToggle';
import { useTheme } from '../../components/common/useTheme';
import { SettingsStore } from '../../core/storage/settingsStore';

describe('Theme Management System', () => {
  beforeEach(() => {
    SettingsStore.reset();
    document.documentElement.className = '';
  });

  afterEach(() => {
    document.documentElement.className = '';
  });

  it('useTheme hook initializes with dark theme and synchronizes class', () => {
    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe('dark');
    expect(result.current.isDark).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('useTheme hook toggles between dark and light', () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).toBe('light');
    expect(result.current.isDark).toBe(false);
    expect(document.documentElement.classList.contains('light')).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(SettingsStore.get().theme).toBe('light');

    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).toBe('dark');
    expect(result.current.isDark).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.classList.contains('light')).toBe(false);
    expect(SettingsStore.get().theme).toBe('dark');
  });

  it('ThemeToggle component switches theme and updates DOM and storage on click', () => {
    render(React.createElement(ThemeToggle));

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Switch to light mode');

    fireEvent.click(button);

    expect(document.documentElement.classList.contains('light')).toBe(true);
    expect(button).toHaveAttribute('aria-label', 'Switch to dark mode');
    expect(SettingsStore.get().theme).toBe('light');

    fireEvent.click(button);

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(button).toHaveAttribute('aria-label', 'Switch to light mode');
    expect(SettingsStore.get().theme).toBe('dark');
  });
});
