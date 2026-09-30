/**
 * Tiny synthesised chiptune sound: no audio files. Browsers only allow audio
 * after a user gesture, so `unlock()` is called from the start screen.
 */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuffer: AudioBuffer | null = null;
let muted = false;
let slideGain: GainNode | null = null;

export function unlock(): void {
  if (ctx) {
    void ctx.resume();
    return;
  }
  try {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0.35;
    master.connect(ctx.destination);
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  } catch {
    ctx = null; // no audio available; the game works silently
  }
}

export function toggleMute(): boolean {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : 0.35;
  return muted;
}

export function isMuted(): boolean {
  return muted;
}

function tone(freq: number, seconds: number, type: OscillatorType, volume: number, glideTo?: number, delay = 0): void {
  if (!ctx || !master) return;
  const t = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t + seconds);
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
  osc.connect(gain).connect(master);
  osc.start(t);
  osc.stop(t + seconds + 0.02);
}

function noise(seconds: number, volume: number, filterFreq: number): void {
  if (!ctx || !master || !noiseBuffer) return;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = filterFreq;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + seconds);
  src.connect(filter).connect(gain).connect(master);
  src.start();
  src.stop(ctx.currentTime + seconds);
}

/** Pentatonic pitch for a temperature anomaly, so the trend can be heard. */
export function pitchFor(value: number, low = -0.6, high = 1.6): number {
  const scale = [0, 2, 4, 7, 9];
  const steps = Math.round(((value - low) / (high - low)) * 15);
  const clamped = Math.max(0, Math.min(15, steps));
  const semitone = Math.floor(clamped / 5) * 12 + scale[clamped % 5];
  return 220 * Math.pow(2, semitone / 12);
}

export const sfx = {
  jump: () => tone(330, 0.12, "square", 0.08, 660),
  land: () => noise(0.08, 0.12, 600),
  step: (value: number) => tone(pitchFor(value), 0.09, "triangle", 0.12),
  blip: () => tone(880, 0.04, "square", 0.04),
  zoomTick: (t: number) => tone(200 + t * 500, 0.05, "sine", 0.05),
  reveal: () => [0, 4, 7, 12].forEach((s, i) => tone(262 * Math.pow(2, s / 12), 0.6, "triangle", 0.1, undefined, i * 0.12)),
  whoosh: () => noise(0.5, 0.2, 2400),
};

/** Continuous sled noise; volume follows speed. */
export function setSlideVolume(speed01: number): void {
  if (!ctx || !master || !noiseBuffer) return;
  if (!slideGain) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 900;
    slideGain = ctx.createGain();
    slideGain.gain.value = 0;
    src.connect(filter).connect(slideGain).connect(master);
    src.start();
  }
  slideGain.gain.setTargetAtTime(Math.min(1, speed01) * 0.12, ctx.currentTime, 0.05);
}
