/**
 * 音效管理器
 * 
 * 使用 Web Audio API 播放音效
 * 音效文件放在 public/sounds/ 目录
 * 
 * 使用方式:
 *   const { play, isEnabled, setEnabled } = useSound()
 *   play('tile-draw')
 *   setEnabled(false) // 静音
 */

interface SoundConfig {
  src: string
  volume?: number
}

const SOUNDS: Record<string, SoundConfig> = {
  'tile-draw': { src: '/sounds/tile-draw.mp3', volume: 0.6 },
  'tile-discard': { src: '/sounds/tile-discard.mp3', volume: 0.5 },
  'tile-chow': { src: '/sounds/tile-chow.mp3', volume: 0.7 },
  'tile-pong': { src: '/sounds/tile-pong.mp3', volume: 0.7 },
  'tile-kong': { src: '/sounds/tile-kong.mp3', volume: 0.8 },
  'tile-hu': { src: '/sounds/tile-hu.mp3', volume: 1.0 },
  'tile-rebel': { src: '/sounds/tile-rebel.mp3', volume: 0.9 },
  'dice-roll': { src: '/sounds/dice-roll.mp3', volume: 0.7 },
  'timer-warn': { src: '/sounds/timer-warn.mp3', volume: 0.4 },
  'turn-notify': { src: '/sounds/turn-notify.mp3', volume: 0.5 },
}

// 全局状态（单例）
const _isEnabled = ref(true)
const _volume = ref(0.7)
const _audioCache = new Map<string, HTMLAudioElement>()

const _getAudio = (name: string): HTMLAudioElement | null => {
  if (!process.client) return null
  const config = SOUNDS[name]
  if (!config) return null
  if (_audioCache.has(name)) return _audioCache.get(name)!
  try {
    const audio = new Audio(config.src)
    audio.volume = (config.volume ?? 1.0) * _volume.value
    audio.preload = 'auto'
    _audioCache.set(name, audio)
    return audio
  } catch {
    return null
  }
}

export const useSound = () => {
  const play = (name: string) => {
    if (!_isEnabled.value || !process.client) return
    const audio = _getAudio(name)
    if (!audio) return
    audio.currentTime = 0
    audio.play().catch(() => {/* silent fail before user interaction */})
  }

  const setEnabled = (enabled: boolean) => {
    _isEnabled.value = enabled
  }

  const setVolume = (v: number) => {
    _volume.value = Math.max(0, Math.min(1, v))
    _audioCache.forEach((audio, name) => {
      const cfg = SOUNDS[name]
      if (cfg) audio.volume = (cfg.volume ?? 1.0) * _volume.value
    })
  }

  // 导出可直接用的 ref（不是 readonly，保证模板中能读取）
  return {
    play,
    isEnabled: _isEnabled,
    setEnabled,
    setVolume,
    volume: _volume,
  }
}

