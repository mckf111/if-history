export interface AudioPreferences {
  muted: boolean
  volume: number
}

export type AudioCue = 'paper' | 'ink' | 'stamp' | 'step' | 'latch' | 'cannon' | 'night' | 'ending-success' | 'ending-failure' | 'error'
export type Ambience = 'day' | 'night' | 'none'

export const AUDIO_PREF_KEY = 'what-if-history.audio.v1'
export const DEFAULT_AUDIO_PREFERENCES: AudioPreferences = { muted: false, volume: 0.42 }

let context: AudioContext | null = null
let master: GainNode | null = null
let currentAmbience: Ambience = 'none'
let ambienceNodes: AudioScheduledSourceNode[] = []
let ambienceGain: GainNode | null = null

function clampVolume(value: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : DEFAULT_AUDIO_PREFERENCES.volume))
}

export function loadAudioPreferences(): AudioPreferences {
  try {
    const raw = localStorage.getItem(AUDIO_PREF_KEY)
    if (!raw) return DEFAULT_AUDIO_PREFERENCES
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return DEFAULT_AUDIO_PREFERENCES
    const value = parsed as Partial<AudioPreferences>
    if (typeof value.muted !== 'boolean' || typeof value.volume !== 'number') return DEFAULT_AUDIO_PREFERENCES
    return { muted: value.muted, volume: clampVolume(value.volume) }
  } catch {
    return DEFAULT_AUDIO_PREFERENCES
  }
}

export function saveAudioPreferences(preferences: AudioPreferences): void {
  try {
    localStorage.setItem(AUDIO_PREF_KEY, JSON.stringify({
      muted: preferences.muted,
      volume: clampVolume(preferences.volume),
    }))
  } catch {
    // 声音偏好写不进时不影响游戏与主存档。
  }
}

function audioContextConstructor(): typeof AudioContext | undefined {
  if (typeof window === 'undefined') return undefined
  return window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
}

function ensureAudio(preferences: AudioPreferences): { context: AudioContext; master: GainNode } | null {
  const AudioContextClass = audioContextConstructor()
  if (!AudioContextClass) return null
  if (!context || !master) {
    context = new AudioContextClass()
    master = context.createGain()
    master.connect(context.destination)
  }
  master.gain.setTargetAtTime(preferences.muted ? 0 : clampVolume(preferences.volume), context.currentTime, 0.015)
  if (context.state === 'suspended') void context.resume().catch(() => undefined)
  return { context, master }
}

function deterministicNoise(ctx: AudioContext, seconds: number, seed: number): AudioBuffer {
  const length = Math.max(1, Math.floor(ctx.sampleRate * seconds))
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  let state = seed >>> 0
  for (let index = 0; index < length; index += 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    data[index] = ((state >>> 8) / 0x00ffffff) * 2 - 1
  }
  return buffer
}

function noiseBurst(
  ctx: AudioContext,
  destination: AudioNode,
  seconds: number,
  seed: number,
  frequency: number,
  gainValue: number,
): void {
  const source = ctx.createBufferSource()
  const filter = ctx.createBiquadFilter()
  const gain = ctx.createGain()
  const now = ctx.currentTime
  source.buffer = deterministicNoise(ctx, seconds, seed)
  filter.type = frequency < 700 ? 'lowpass' : 'bandpass'
  filter.frequency.value = frequency
  filter.Q.value = frequency < 700 ? 0.7 : 1.3
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(gainValue, now + 0.008)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + seconds)
  source.connect(filter).connect(gain).connect(destination)
  source.start(now)
  source.stop(now + seconds + 0.02)
}

function tone(
  ctx: AudioContext,
  destination: AudioNode,
  from: number,
  to: number,
  seconds: number,
  gainValue: number,
  type: OscillatorType = 'sine',
  delay = 0,
): void {
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()
  const now = ctx.currentTime + delay
  oscillator.type = type
  oscillator.frequency.setValueAtTime(from, now)
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, to), now + seconds)
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(gainValue, now + Math.min(0.025, seconds / 3))
  gain.gain.exponentialRampToValueAtTime(0.0001, now + seconds)
  oscillator.connect(gain).connect(destination)
  oscillator.start(now)
  oscillator.stop(now + seconds + 0.02)
}

export function playAudioCue(cue: AudioCue, preferences: AudioPreferences): void {
  try {
    const audio = ensureAudio(preferences)
    if (!audio || preferences.muted || preferences.volume <= 0) return
    const { context: ctx, master: destination } = audio

    if (cue === 'paper') noiseBurst(ctx, destination, 0.12, 1644, 2400, 0.075)
    if (cue === 'ink') {
      noiseBurst(ctx, destination, 0.16, 1645, 1800, 0.05)
      tone(ctx, destination, 390, 250, 0.12, 0.018, 'triangle')
    }
    if (cue === 'stamp') {
      noiseBurst(ctx, destination, 0.13, 1646, 420, 0.12)
      tone(ctx, destination, 105, 52, 0.16, 0.12)
    }
    if (cue === 'step') noiseBurst(ctx, destination, 0.09, 1647, 320, 0.065)
    if (cue === 'latch') {
      tone(ctx, destination, 980, 430, 0.08, 0.035, 'triangle')
      noiseBurst(ctx, destination, 0.075, 1648, 1250, 0.035)
    }
    if (cue === 'cannon') {
      noiseBurst(ctx, destination, 0.9, 1649, 145, 0.15)
      tone(ctx, destination, 64, 32, 0.85, 0.14)
    }
    if (cue === 'night') {
      tone(ctx, destination, 246, 184, 0.75, 0.035, 'sine')
      tone(ctx, destination, 184, 123, 0.9, 0.028, 'sine', 0.32)
    }
    if (cue === 'ending-success') {
      tone(ctx, destination, 165, 247, 1.2, 0.04, 'sine')
      tone(ctx, destination, 220, 330, 1.5, 0.035, 'sine', 0.2)
      tone(ctx, destination, 247, 392, 1.7, 0.025, 'sine', 0.42)
    }
    if (cue === 'ending-failure') {
      tone(ctx, destination, 196, 146, 1.4, 0.045, 'sine')
      tone(ctx, destination, 247, 196, 1.7, 0.03, 'sine', 0.22)
      tone(ctx, destination, 294, 220, 1.9, 0.022, 'sine', 0.44)
    }
    if (cue === 'error') {
      tone(ctx, destination, 148, 82, 0.24, 0.06, 'sawtooth')
    }
  } catch {
    // 声音能力被浏览器拒绝时，任何玩法操作仍必须继续。
  }
}

function stopAmbience(ctx: AudioContext): void {
  if (ambienceGain) {
    ambienceGain.gain.cancelScheduledValues(ctx.currentTime)
    ambienceGain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.08)
  }
  const nodes = ambienceNodes
  window.setTimeout(() => {
    for (const node of nodes) {
      try { node.stop() } catch { /* 已停止 */ }
      try { node.disconnect() } catch { /* 已断开 */ }
    }
  }, 420)
  ambienceNodes = []
  ambienceGain = null
}

export function setAmbience(mode: Ambience, preferences: AudioPreferences): void {
  try {
    if (!context || !master) return
    master.gain.setTargetAtTime(preferences.muted ? 0 : clampVolume(preferences.volume), context.currentTime, 0.03)
    if (mode === currentAmbience) return
    stopAmbience(context)
    currentAmbience = mode
    if (mode === 'none') return

    const gain = context.createGain()
    const filter = context.createBiquadFilter()
    const noise = context.createBufferSource()
    const hum = context.createOscillator()
    gain.gain.value = mode === 'day' ? 0.012 : 0.009
    filter.type = 'lowpass'
    filter.frequency.value = mode === 'day' ? 680 : 260
    noise.buffer = deterministicNoise(context, 2.4, mode === 'day' ? 1650 : 1651)
    noise.loop = true
    hum.type = 'sine'
    hum.frequency.value = mode === 'day' ? 58 : 43
    const humGain = context.createGain()
    humGain.gain.value = mode === 'day' ? 0.002 : 0.0035
    noise.connect(filter).connect(gain).connect(master)
    hum.connect(humGain).connect(gain)
    noise.start()
    hum.start()
    ambienceNodes = [noise, hum]
    ambienceGain = gain
  } catch {
    // 环境声失败不影响规则或界面。
  }
}

export function updateAudioPreferences(preferences: AudioPreferences): void {
  try {
    if (context && master) {
      master.gain.setTargetAtTime(preferences.muted ? 0 : clampVolume(preferences.volume), context.currentTime, 0.02)
    }
  } catch {
    // 即使当前音频节点失效，偏好仍然要保存。
  }
  saveAudioPreferences(preferences)
}
