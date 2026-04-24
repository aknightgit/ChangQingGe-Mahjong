/**
 * 音效合成器 - 使用 Web Audio API 直接合成音效
 * 无需外部音频文件
 */

export interface SoundParams {
  frequency?: number
  duration?: number
  type?: OscillatorType
  volume?: number
  fadeOut?: number
}

// 音效预置配置
const SOUND_PRESETS: Record<string, SoundParams> = {
  // 摸牌：短促上升音
  'tile-draw': { frequency: 440, duration: 0.08, type: 'sine', volume: 0.6, fadeOut: 0.02 },
  // 弃牌：短促下降音
  'tile-discard': { frequency: 330, duration: 0.08, type: 'sine', volume: 0.5, fadeOut: 0.02 },
  // 吃牌：两音上升
  'tile-chow': { frequency: 523, duration: 0.12, type: 'triangle', volume: 0.7, fadeOut: 0.04 },
  // 碰牌：两音各别
  'tile-pong': { frequency: 392, duration: 0.15, type: 'square', volume: 0.7, fadeOut: 0.05 },
  // 杠牌：三音下降
  'tile-kong': { frequency: 349, duration: 0.2, type: 'sawtooth', volume: 0.8, fadeOut: 0.08 },
  // 胡牌：四音和弦
  'tile-hu': { frequency: 523, duration: 0.4, type: 'sine', volume: 1.0, fadeOut: 0.15 },
  // 造反：下降警告音
  'tile-rebel': { frequency: 220, duration: 0.3, type: 'sawtooth', volume: 0.9, fadeOut: 0.1 },
  // 掷骰子：滚动噪音
  'dice-roll': { frequency: 150, duration: 0.25, type: 'sawtooth', volume: 0.7, fadeOut: 0.2 },
  // 定时器警告：急促哔哔
  'timer-warn': { frequency: 880, duration: 0.1, type: 'square', volume: 0.4, fadeOut: 0.05 },
  // 回合通知：单音
  'turn-notify': { frequency: 660, duration: 0.15, type: 'sine', volume: 0.5, fadeOut: 0.05 },
}

let _audioContext: AudioContext | null = null

const _getContext = (): AudioContext | null => {
  if (!process.client) return null
  if (!_audioContext) {
    try {
      _audioContext = new AudioContext()
    } catch {
      return null
    }
  }
  return _audioContext
}

/**
 * 播放指定音效
 */
export const playSound = (name: string): void => {
  const preset = SOUND_PRESETS[name]
  if (!preset) return
  _playTone(preset)
}

/**
 * 直接播放一个音调
 */
const _playTone = (params: SoundParams): void => {
  const ctx = _getContext()
  if (!ctx) return

  try {
    const {
      frequency = 440,
      duration = 0.2,
      type = 'sine',
      volume = 0.5,
      fadeOut = 0.05,
    } = params

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = type
    osc.frequency.setValueAtTime(frequency, ctx.currentTime)

    gain.gain.setValueAtTime(volume, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + duration + fadeOut)
  } catch {
    // silent fail
  }
}

/**
 * 播放和弦（多个频率同时）
 */
export const playChord = (frequencies: number[], duration: number, volume = 0.5): void => {
  const ctx = _getContext()
  if (!ctx) return

  try {
    const masterGain = ctx.createGain()
    masterGain.gain.setValueAtTime(volume, ctx.currentTime)
    masterGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
    masterGain.connect(ctx.destination)

    frequencies.forEach((freq) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, ctx.currentTime)
      gain.gain.setValueAtTime(1 / frequencies.length, ctx.currentTime)
      osc.connect(gain)
      gain.connect(masterGain)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + duration)
    })
  } catch {
    // silent fail
  }
}

/**
 * 播放序列音（多音逐一）
 */
export const playSequence = (
  notes: Array<{ frequency: number; duration: number; delay?: number }>,
  type: OscillatorType = 'sine',
  volume = 0.5
): void => {
  const ctx = _getContext()
  if (!ctx) return

  try {
    let startTime = ctx.currentTime
    notes.forEach(({ frequency, duration, delay = 0 }) => {
      startTime += delay
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = type
      osc.frequency.setValueAtTime(frequency, startTime)
      gain.gain.setValueAtTime(volume, startTime)
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(startTime)
      osc.stop(startTime + duration + 0.02)
    })
  } catch {
    // silent fail
  }
}

// ==================== 麻将专用序列 ====================

/** 胡牌音：四音和弦 + 延长 */
export const playTileHu = (): void => {
  playChord([523, 659, 784], 0.5, 1.0)
}

/** 碰牌音：两音各别 */
export const playTilePong = (): void => {
  playSequence([
    { frequency: 392, duration: 0.08 },
    { frequency: 392, duration: 0.08, delay: 0.12 },
  ], 'square', 0.7)
}

/** 杠牌音：三音下行 */
export const playTileKong = (): void => {
  playSequence([
    { frequency: 523, duration: 0.07 },
    { frequency: 392, duration: 0.07, delay: 0.1 },
    { frequency: 330, duration: 0.12, delay: 0.2 },
  ], 'sawtooth', 0.8)
}

/** 吃牌音：两音上行 */
export const playTileChow = (): void => {
  playSequence([
    { frequency: 440, duration: 0.08 },
    { frequency: 523, duration: 0.1, delay: 0.09 },
  ], 'triangle', 0.7)
}

/** 摸牌音：短促上升 */
export const playTileDraw = (): void => {
  const ctx = _getContext()
  if (!ctx) return
  try {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(330, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(520, ctx.currentTime + 0.08)
    gain.gain.setValueAtTime(0.6, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.12)
  } catch {
    // silent fail
  }
}

/** 弃牌音：短促下降 */
export const playTileDiscard = (): void => {
  const ctx = _getContext()
  if (!ctx) return
  try {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(480, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(280, ctx.currentTime + 0.08)
    gain.gain.setValueAtTime(0.5, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.12)
  } catch {
    // silent fail
  }
}

/** 造反音：下行警告 */
export const playTileRebel = (): void => {
  playSequence([
    { frequency: 440, duration: 0.1 },
    { frequency: 330, duration: 0.15, delay: 0.12 },
    { frequency: 220, duration: 0.2, delay: 0.28 },
  ], 'sawtooth', 0.9)
}

/** 掷骰子音：噪音 */
export const playDiceRoll = (): void => {
  const ctx = _getContext()
  if (!ctx) return
  try {
    const bufferSize = ctx.sampleRate * 0.25
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1
    }
    const source = ctx.createBufferSource()
    source.buffer = buffer

    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(800, ctx.currentTime)

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.7, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25)

    source.connect(filter)
    filter.connect(gain)
    gain.connect(ctx.destination)
    source.start(ctx.currentTime)
  } catch {
    // silent fail
  }
}

/** 定时器警告音 */
export const playTimerWarn = (): void => {
  playSequence([
    { frequency: 880, duration: 0.08 },
    { frequency: 880, duration: 0.08, delay: 0.12 },
  ], 'square', 0.4)
}

/** 回合通知音 */
export const playTurnNotify = (): void => {
  const ctx = _getContext()
  if (!ctx) return
  try {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(660, ctx.currentTime)
    gain.gain.setValueAtTime(0.5, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.2)
  } catch {
    // silent fail
  }
}
