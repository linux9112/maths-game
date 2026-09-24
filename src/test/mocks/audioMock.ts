import { vi } from 'vitest';

export interface MockParamCall {
  type: 'setValue' | 'linearRamp' | 'exponentialRamp' | 'cancelScheduled';
  value?: number;
  time?: number;
}

export class MockAudioParam {
  public value: number;
  public calls: MockParamCall[] = [];

  constructor(defaultValue: number = 0) {
    this.value = defaultValue;
  }

  setValueAtTime = vi.fn((val: number, time: number) => {
    this.value = val;
    this.calls.push({ type: 'setValue', value: val, time });
    return this;
  });

  linearRampToValueAtTime = vi.fn((val: number, time: number) => {
    this.value = val;
    this.calls.push({ type: 'linearRamp', value: val, time });
    return this;
  });

  exponentialRampToValueAtTime = vi.fn((val: number, time: number) => {
    this.value = val;
    this.calls.push({ type: 'exponentialRamp', value: val, time });
    return this;
  });

  cancelScheduledValues = vi.fn((time: number) => {
    this.calls.push({ type: 'cancelScheduled', time });
    return this;
  });

  setTargetAtTime = vi.fn((val: number, _time: number) => {
    this.value = val;
    return this;
  });
}

export class MockAudioNode {
  public connectedTo: MockAudioNode[] = [];

  connect = vi.fn((target: MockAudioNode) => {
    this.connectedTo.push(target);
    return target;
  });

  disconnect = vi.fn(() => {
    this.connectedTo = [];
  });
}

export class MockGainNode extends MockAudioNode {
  public gain: MockAudioParam;

  constructor(defaultGain: number = 1) {
    super();
    this.gain = new MockAudioParam(defaultGain);
  }
}

export class MockOscillatorNode extends MockAudioNode {
  public type: OscillatorType = 'sine';
  public frequency: MockAudioParam;
  public onended: (() => void) | null = null;
  public isStarted: boolean = false;
  public isStopped: boolean = false;
  public startTime: number = 0;
  public stopTime: number = 0;

  constructor(defaultFreq: number = 440) {
    super();
    this.frequency = new MockAudioParam(defaultFreq);
  }

  start = vi.fn((time: number = 0) => {
    this.isStarted = true;
    this.startTime = time;
  });

  stop = vi.fn((time: number = 0) => {
    this.isStopped = true;
    this.stopTime = time;
  });
}

export class MockAudioContext {
  public currentTime: number = 0;
  public state: AudioContextState = 'suspended';
  public destination: MockAudioNode = new MockAudioNode();
  public createdGainNodes: MockGainNode[] = [];
  public createdOscillators: MockOscillatorNode[] = [];

  createGain = vi.fn((): GainNode => {
    const gain = new MockGainNode();
    this.createdGainNodes.push(gain);
    return gain as unknown as GainNode;
  });

  createOscillator = vi.fn((): OscillatorNode => {
    const osc = new MockOscillatorNode();
    this.createdOscillators.push(osc);
    return osc as unknown as OscillatorNode;
  });

  resume = vi.fn(async () => {
    this.state = 'running';
  });

  suspend = vi.fn(async () => {
    this.state = 'suspended';
  });

  close = vi.fn(async () => {
    this.state = 'closed';
  });
}

let activeInstance: MockAudioContext | null = null;

export function setupAudioMock(): void {
  class MockAudioContextConstructor extends MockAudioContext {
    constructor() {
      super();
      activeInstance = this;
    }
  }

  (globalThis as any).AudioContext = MockAudioContextConstructor;
  (globalThis as any).webkitAudioContext = MockAudioContextConstructor;
}

export function getActiveMockAudioContext(): MockAudioContext | null {
  return activeInstance;
}

export function resetActiveMockAudioContext(): void {
  activeInstance = null;
}
