import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SoundEngine } from '../../core/audio/soundEngine';
import { SettingsStore } from '../../core/storage/settingsStore';
import {
  getActiveMockAudioContext,
  resetActiveMockAudioContext,
} from '../mocks/audioMock';

describe('SoundEngine (Zero-Asset Procedural Web Audio API Synthesizer)', () => {
  let engine: SoundEngine;

  beforeEach(() => {
    SettingsStore.reset();
    resetActiveMockAudioContext();
    engine = new SoundEngine();
  });

  afterEach(async () => {
    await engine.destroy();
    vi.clearAllMocks();
  });

  it('initializes context lazily and resumes on init()', async () => {
    expect(getActiveMockAudioContext()).toBeNull();

    await engine.init();

    const ctx = getActiveMockAudioContext();
    expect(ctx).not.toBeNull();
    expect(ctx?.resume).toHaveBeenCalled();
    expect(engine.getState()).toBe('running');
  });

  it('respects default volume and mute settings from SettingsStore', () => {
    expect(engine.isMuted()).toBe(false);
    expect(engine.getVolume()).toBe(0.7);

    engine.setVolume(0.4);
    expect(engine.getVolume()).toBe(0.4);
    expect(SettingsStore.get().soundVolume).toBe(0.4);

    engine.setMuted(true);
    expect(engine.isMuted()).toBe(true);
    expect(SettingsStore.get().soundEnabled).toBe(false);
  });

  it('clamps volume within [0, 1] range', () => {
    engine.setVolume(1.5);
    expect(engine.getVolume()).toBe(1);

    engine.setVolume(-0.2);
    expect(engine.getVolume()).toBe(0);
  });

  it('plays correct chime by instantiating sine oscillators with ascending frequencies', async () => {
    await engine.init();
    const ctx = getActiveMockAudioContext()!;

    engine.playCorrect();

    // Allow promise tick for lazy context resolution
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(ctx.createdOscillators.length).toBeGreaterThanOrEqual(3);
    const oscs = ctx.createdOscillators;
    expect(oscs.every((o) => o.type === 'sine')).toBe(true);

    // Verify frequencies: 523.25 (C5), 659.25 (E5), 1046.5 (C6)
    const freqs = oscs.map((o) => o.frequency.calls.find((c) => c.type === 'setValue')?.value);
    expect(freqs).toContain(523.25);
    expect(freqs).toContain(659.25);
    expect(freqs).toContain(1046.5);
  });

  it('plays incorrect thud with downward frequency sweeps', async () => {
    await engine.init();
    const ctx = getActiveMockAudioContext()!;

    engine.playIncorrect();

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(ctx.createdOscillators.length).toBeGreaterThanOrEqual(2);
    const triangleOsc = ctx.createdOscillators.find((o) => o.type === 'triangle');
    expect(triangleOsc).toBeDefined();

    const startFreq = triangleOsc?.frequency.calls.find((c) => c.type === 'setValue')?.value;
    expect(startFreq).toBe(150);

    const rampFreq = triangleOsc?.frequency.calls.find((c) => c.type === 'exponentialRamp')?.value;
    expect(rampFreq).toBe(80);
  });

  it('escalates combo frequencies and note counts based on combo multiplier', async () => {
    await engine.init();
    const ctx = getActiveMockAudioContext()!;

    // Combo 2
    engine.playCombo(2);
    await new Promise((resolve) => setTimeout(resolve, 10));
    const combo2Count = ctx.createdOscillators.length;
    expect(combo2Count).toBe(2);

    // Combo 5
    engine.playCombo(5);
    await new Promise((resolve) => setTimeout(resolve, 10));
    const combo5Count = ctx.createdOscillators.length - combo2Count;
    expect(combo5Count).toBe(4);

    // Verify root frequency is higher for combo 5 than combo 2
    const combo2FirstFreq = ctx.createdOscillators[0].frequency.calls[0]?.value ?? 0;
    const combo5FirstFreq = ctx.createdOscillators[combo2Count].frequency.calls[0]?.value ?? 0;
    expect(combo5FirstFreq).toBeGreaterThan(combo2FirstFreq);
  });

  it('plays countdown ticks with transient bursts', async () => {
    await engine.init();
    const ctx = getActiveMockAudioContext()!;

    engine.playTick(false);
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(ctx.createdOscillators.length).toBe(1);

    const regularTick = ctx.createdOscillators[0];
    expect(regularTick.frequency.calls.find((c) => c.type === 'setValue')?.value).toBe(1100);

    // Final tick
    engine.playTick(true);
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(ctx.createdOscillators.length).toBeGreaterThan(1);
  });

  it('plays tactile button tap pop with short duration', async () => {
    await engine.init();
    const ctx = getActiveMockAudioContext()!;

    engine.playButtonTap();
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(ctx.createdOscillators.length).toBe(1);
    const tapOsc = ctx.createdOscillators[0];
    expect(tapOsc.frequency.calls.find((c) => c.type === 'setValue')?.value).toBe(420);
    expect(tapOsc.frequency.calls.find((c) => c.type === 'exponentialRamp')?.value).toBe(210);
  });

  it('suppresses audio scheduling completely when muted', async () => {
    await engine.init();
    const ctx = getActiveMockAudioContext()!;

    engine.setMuted(true);
    engine.playCorrect();
    engine.playIncorrect();
    engine.playCombo(3);
    engine.playButtonTap();

    await new Promise((resolve) => setTimeout(resolve, 10));

    // Zero oscillators should be created when muted
    expect(ctx.createdOscillators.length).toBe(0);
  });

  it('closes AudioContext on destroy()', async () => {
    await engine.init();
    const ctx = getActiveMockAudioContext()!;

    await engine.destroy();
    expect(ctx.close).toHaveBeenCalled();
  });
});
