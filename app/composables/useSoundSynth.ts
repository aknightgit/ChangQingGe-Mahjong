/**
 * 麻将游戏音效合成器
 * 使用 Web Audio API 直接合成，无需音频文件
 * 音效预置:
 *   tile-draw    - 摸牌：短促点击
 *   tile-discard - 弃牌：清脆落牌
 *   tile-chow    - 吃牌：两音上行
 *   tile-pong    - 碰牌：双击脆响
 *   tile-kong    - 杠牌：三连冲击
 *   tile-hu      - 胡牌：和弦庆祝
 *   tile-rebel   - 造反：下行警告
 *   dice-roll    - 掷骰子：滚动噪音
 *   timer-warn   - 定时器：三连警告
 *   turn-notify  - 回合通知：单音提示
 */

let _audioContext: AudioContext | null = null

const getCtx = (): AudioContext | null => {
  if (!process.client) return null
  if (!_audioContext) {
    try { _audioContext = new AudioContext() } catch { return null }
  }
  return _audioContext
}

/** 创建噪音源（白噪音） */
const createNoise = (ctx: AudioContext, duration: number): AudioBufferSourceNode => {
  const bufferSize = Math.floor(ctx.sampleRate * duration)
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1
  const source = ctx.createBufferSource()
  source.buffer = buffer
  return source
}

/** 创建带增益的振荡器 */
const createOsc = (ctx: AudioContext, freq: number, type: OscillatorType, volume: number, startTime: number, duration: number): OscillatorNode => {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, startTime)
  gain.gain.setValueAtTime(volume, startTime)
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(startTime)
  osc.stop(startTime + duration + 0.01)
  return osc
}

// ============================================================
// 音效实现
// ============================================================

/** 摸牌：短促点击（噪音+中频音混合） */
export const playTileDraw = (): void => {
  const ctx = getCtx()
  if (!ctx) return
  const t = ctx.currentTime

  // 中频点击音
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(800, t)
  osc.frequency.exponentialRampToValueAtTime(400, t + 0.06)
  gain.gain.setValueAtTime(0.5, t)
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(t)
  osc.stop(t + 0.1)

  // 噪音层（模拟牌面触感）
  const noise = createNoise(ctx, 0.05)
  const nGain = ctx.createGain()
  const nFilter = ctx.createBiquadFilter()
  nFilter.type = 'bandpass'
  nFilter.frequency.setValueAtTime(2000, t)
  nFilter.Q.setValueAtTime(2, t)
  nGain.gain.setValueAtTime(0.3, t)
  nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05)
  noise.connect(nFilter)
  nFilter.connect(nGain)
  nGain.connect(ctx.destination)
  noise.start(t)
  noise.stop(t + 0.06)
}

/** 弃牌：清脆落牌声（高频点击+低频 thud） */
export const playTileDiscard = (): void => {
  const ctx = getCtx()
  if (!ctx) return
  const t = ctx.currentTime

  // 低频 thud
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(200, t)
  osc.frequency.exponentialRampToValueAtTime(80, t + 0.06)
  gain.gain.setValueAtTime(0.4, t)
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(t)
  osc.stop(t + 0.12)

  // 高频点击
  const osc2 = ctx.createOscillator()
  const gain2 = ctx.createGain()
  osc2.type = 'triangle'
  osc2.frequency.setValueAtTime(1200, t)
  osc2.frequency.exponentialRampToValueAtTime(600, t + 0.03)
  gain2.gain.setValueAtTime(0.25, t)
  gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.05)
  osc2.connect(gain2)
  gain2.connect(ctx.destination)
  osc2.start(t)
  osc2.stop(t + 0.07)
}

/** 吃牌：两音上行（440→523Hz） */
export const playTileChow = (): void => {
  const ctx = getCtx()
  if (!ctx) return
  const t = ctx.currentTime

  createOsc(ctx, 440, 'triangle', 0.5, t, 0.08)
  createOsc(ctx, 523, 'triangle', 0.5, t + 0.09, 0.1)
}

/** 碰牌：双击脆响（两个尖锐短音） */
export const playTilePong = (): void => {
  const ctx = getCtx()
  if (!ctx) return
  const t = ctx.currentTime

  // 双击
  const makeClick = (startTime: number) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'square'
    osc.frequency.setValueAtTime(1200, startTime)
    osc.frequency.exponentialRampToValueAtTime(600, startTime + 0.04)
    gain.gain.setValueAtTime(0.35, startTime)
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.06)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(startTime)
    osc.stop(startTime + 0.08)
  }

  makeClick(t)
  makeClick(t + 0.1)
}

/** 杠牌：三连下行冲击 */
export const playTileKong = (): void => {
  const ctx = getCtx()
  if (!ctx) return
  const t = ctx.currentTime

  // 三连音：523→392→330，下行冲击感
  createOsc(ctx, 523, 'sawtooth', 0.5, t, 0.06)
  createOsc(ctx, 392, 'sawtooth', 0.5, t + 0.08, 0.06)
  createOsc(ctx, 330, 'sawtooth', 0.6, t + 0.16, 0.12)

  // 低频 thud 增强冲击感
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(150, t + 0.16)
  osc.frequency.exponentialRampToValueAtTime(60, t + 0.28)
  gain.gain.setValueAtTime(0.5, t + 0.16)
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(t + 0.16)
  osc.stop(t + 0.32)
}

/** 胡牌：和弦+上扬庆祝 */
export const playTileHu = (): void => {
  const ctx = getCtx()
  if (!ctx) return
  const t = ctx.currentTime

  // 和弦：C大调三和弦 523+659+784，渐强
  const chord = [523, 659, 784]
  chord.forEach((freq, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, t)
    // 上扬
    osc.frequency.setValueAtTime(freq * 1.05, t + 0.3)
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(0.35, t + 0.05)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(t)
    osc.stop(t + 0.55)
  })

  // 高音点缀
  createOsc(ctx, 1047, 'sine', 0.25, t + 0.05, 0.15)
  createOsc(ctx, 1175, 'sine', 0.2, t + 0.2, 0.2)
}

/** 造反：下行警告音（两次下降） */
export const playTileRebel = (): void => {
  const ctx = getCtx()
  if (!ctx) return
  const t = ctx.currentTime

  const makeWarn = (startTime: number) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(440, startTime)
    osc.frequency.exponentialRampToValueAtTime(220, startTime + 0.15)
    gain.gain.setValueAtTime(0.5, startTime)
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(startTime)
    osc.stop(startTime + 0.22)
  }

  makeWarn(t)
  makeWarn(t + 0.25)
}

/** 掷骰子：白噪音滚动（模拟骰子撞击） */
export const playDiceRoll = (): void => {
  const ctx = getCtx()
  if (!ctx) return
  const t = ctx.currentTime

  // 噪音源
  const noise = createNoise(ctx, 0.35)
  const gain = ctx.createGain()
  const filter = ctx.createBiquadFilter()

  filter.type = 'bandpass'
  filter.frequency.setValueAtTime(400, t)
  filter.frequency.linearRampToValueAtTime(1200, t + 0.15)
  filter.frequency.linearRampToValueAtTime(300, t + 0.3)
  filter.Q.setValueAtTime(1, t)

  gain.gain.setValueAtTime(0, t)
  gain.gain.linearRampToValueAtTime(0.7, t + 0.02)
  gain.gain.setValueAtTime(0.7, t + 0.2)
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35)

  noise.connect(filter)
  filter.connect(gain)
  gain.connect(ctx.destination)
  noise.start(t)
  noise.stop(t + 0.4)

  // 低频 thud（骰子落桌）
  const osc = ctx.createOscillator()
  const oscGain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(200, t + 0.25)
  osc.frequency.exponentialRampToValueAtTime(80, t + 0.35)
  oscGain.gain.setValueAtTime(0.5, t + 0.25)
  oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.4)
  osc.connect(oscGain)
  oscGain.connect(ctx.destination)
  osc.start(t + 0.25)
  osc.stop(t + 0.42)
}

/** 定时器警告：急促三连哔哔 */
export const playTimerWarn = (): void => {
  const ctx = getCtx()
  if (!ctx) return
  const t = ctx.currentTime

  const makeBeep = (startTime: number) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'square'
    osc.frequency.setValueAtTime(880, startTime)
    gain.gain.setValueAtTime(0.3, startTime)
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.07)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(startTime)
    osc.stop(startTime + 0.09)
  }

  makeBeep(t)
  makeBeep(t + 0.12)
  makeBeep(t + 0.24)
}

/** 回合通知：单音提示（柔和叮） */
export const playTurnNotify = (): void => {
  const ctx = getCtx()
  if (!ctx) return
  const t = ctx.currentTime

  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(660, t)
  gain.gain.setValueAtTime(0.35, t)
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(t)
  osc.stop(t + 0.25)
}

// ============================================================
// 新增：游戏阶段音效
// ============================================================

/** 开局：洗牌+发牌音效（短促扫频噪音） */
export const playGameStart = (): void => {
  const ctx = getCtx()
  if (!ctx) return
  const t = ctx.currentTime

  // 洗牌噪音
  const noise = createNoise(ctx, 0.4)
  const nGain = ctx.createGain()
  const nFilter = ctx.createBiquadFilter()
  nFilter.type = 'bandpass'
  nFilter.frequency.setValueAtTime(600, t)
  nFilter.frequency.linearRampToValueAtTime(2000, t + 0.2)
  nFilter.frequency.linearRampToValueAtTime(800, t + 0.4)
  nFilter.Q.setValueAtTime(0.8, t)
  nGain.gain.setValueAtTime(0, t)
  nGain.gain.linearRampToValueAtTime(0.4, t + 0.05)
  nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.4)
  noise.connect(nFilter)
  nFilter.connect(nGain)
  nGain.connect(ctx.destination)
  noise.start(t)
  noise.stop(t + 0.45)

  // 发牌短促音（四个小节拍）
  for (let i = 0; i < 4; i++) {
    createOsc(ctx, 400 + i * 100, 'triangle', 0.25, t + 0.2 + i * 0.1, 0.05)
  }
}

/** 流局：低沉下行结束音 */
export const playRoundDraw = (): void => {
  const ctx = getCtx()
  if (!ctx) return
  const t = ctx.currentTime

  // 低频下行
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(300, t)
  osc.frequency.exponentialRampToValueAtTime(80, t + 0.5)
  gain.gain.setValueAtTime(0.4, t)
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(t)
  osc.stop(t + 0.7)

  // 低音点缀
  createOsc(ctx, 150, 'sine', 0.3, t + 0.1, 0.3)
}

/** 胜负揭晓：结果展示音（比胡牌轻，但有仪式感） */
export const playRoundEnd = (): void => {
  const ctx = getCtx()
  if (!ctx) return
  const t = ctx.currentTime

  // C 和弦渐强
  const chord = [523, 659, 784]
  chord.forEach((freq) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, t)
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(0.3, t + 0.05)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(t)
    osc.stop(t + 0.65)
  })

  // 高音点缀
  createOsc(ctx, 880, 'sine', 0.15, t + 0.1, 0.15)
}

/** 杠后补摸：短促提示音（比摸牌轻，表示有事情发生） */
export const playKongDraw = (): void => {
  const ctx = getCtx()
  if (!ctx) return
  const t = ctx.currentTime

  createOsc(ctx, 700, 'sine', 0.3, t, 0.05)
  createOsc(ctx, 700, 'sine', 0.2, t + 0.08, 0.05)
}

/** 其他人回合：轻柔方位提示（panning 左/右） */
export const playOtherTurn = (pan: number = 0): void => {
  // pan: -1 = 左家, 0 = 对家, 1 = 右家
  const ctx = getCtx()
  if (!ctx) return
  const t = ctx.currentTime

  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  const panner = ctx.createStereoPanner()

  osc.type = 'sine'
  osc.frequency.setValueAtTime(500, t)
  osc.frequency.exponentialRampToValueAtTime(350, t + 0.1)

  gain.gain.setValueAtTime(0.2, t)
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12)

  panner.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), t)

  osc.connect(gain)
  gain.connect(panner)
  panner.connect(ctx.destination)
  osc.start(t)
  osc.stop(t + 0.15)
}
