import { computed, ref } from 'vue'

export type VoiceScheme = 'bingtang'

interface TileVoiceEntry {
  key: string
  text: string
  mp3?: string
  opus?: string
}

interface Manifest {
  voice: string
  tiles: TileVoiceEntry[]
}

const VOICE_TEXT_MAP: Record<string, string> = {
  feng_east: '东',
  feng_south: '南',
  feng_west: '西',
  feng_north: '北',
  jian_zhong: '中',
  jian_fa: '发',
  jian_bai: '白板',
  hua_plum: '花',
  wan_1: '一万', wan_2: '二万', wan_3: '三万', wan_4: '四万', wan_5: '五万', wan_6: '六万', wan_7: '七万', wan_8: '八万', wan_9: '九万',
  tong_1: '一筒', tong_2: '二筒', tong_3: '三筒', tong_4: '四筒', tong_5: '五筒', tong_6: '六筒', tong_7: '七筒', tong_8: '八筒', tong_9: '九筒',
  tiao_1: '一条', tiao_2: '二条', tiao_3: '三条', tiao_4: '四条', tiao_5: '五条', tiao_6: '六条', tiao_7: '七条', tiao_8: '八条', tiao_9: '九条',
}

const VOICE_ACTION_MAP = {
  flowerReplace: 'buhua',
  chow: 'wochi',
  pong: 'peng',
  kong: 'gang',
  hu: 'hule',
  selfHu: 'zimo',
} as const

const VOICE_ACTION_TEXT_MAP: Record<keyof typeof VOICE_ACTION_MAP, string> = {
  flowerReplace: '补花',
  chow: '吃',
  pong: '碰',
  kong: '杠',
  hu: '胡',
  selfHu: '自摸',
}

const SILENT_WAV_DATA_URI =
  'data:audio/wav;base64,UklGRlQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YTAAAAAA'

const audioModules = import.meta.glob('../../assets/voice/**/*.{mp3,opus}', {
  eager: true,
  import: 'default',
}) as Record<string, string>

const schemeEntries = Object.entries(audioModules)
  .map(([path, url]) => {
    const match = path.match(/\.\.\/\.\.\/assets\/voice\/([^/]+)\/([^/.]+)\.(mp3|opus)$/)
    if (!match) return null
    const [, scheme, key, ext] = match
    return { scheme, key, ext: ext as 'mp3' | 'opus', url }
  })
  .filter(Boolean) as Array<{ scheme: string; key: string; ext: 'mp3' | 'opus'; url: string }>

const buildManifest = (scheme: VoiceScheme): Manifest => {
  const grouped = new Map<string, Partial<TileVoiceEntry>>()
  for (const entry of schemeEntries) {
    if (entry.scheme !== scheme) continue
    const current = grouped.get(entry.key) || { key: entry.key, text: VOICE_TEXT_MAP[entry.key] || entry.key }
    if (entry.ext === 'mp3') current.mp3 = entry.url
    if (entry.ext === 'opus') current.opus = entry.url
    grouped.set(entry.key, current)
  }

  const tiles = [...grouped.values()]
    .filter((item): item is TileVoiceEntry => !!(item.mp3 || item.opus))
    .sort((a, b) => a.key.localeCompare(b.key, 'zh-CN'))

  return {
    voice: '冰糖',
    tiles,
  }
}

const _currentScheme = ref<VoiceScheme>('bingtang')
const _manifest = ref<Manifest | null>(null)
const _audioMap = ref<Map<string, string>>(new Map())
const _volume = ref(0.50)
let _audioEl: HTMLAudioElement | null = null
let _voiceQueue: Promise<void> = Promise.resolve()
let _voicePrimed = false
let _lastSpokenAt = 0

const getAudioEl = (): HTMLAudioElement => {
  if (!_audioEl) {
    _audioEl = new Audio()
    _audioEl.preload = 'auto'
    _audioEl.volume = _volume.value
  }
  return _audioEl
}

const speakTextFallback = (text?: string) => {
  if (!process.client || !text || !('speechSynthesis' in window)) return
  const now = Date.now()
  if (now - _lastSpokenAt < 120) return
  _lastSpokenAt = now
  try {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'zh-CN'
    utterance.rate = 1
    utterance.pitch = 1
    utterance.volume = _volume.value
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
  } catch {}
}

const playAudioQueued = (url: string, fallbackText?: string): Promise<void> => new Promise((resolve) => {
  const el = getAudioEl()
  let settled = false
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  let fallbackTriggered = false

  const finish = () => {
    if (settled) return
    settled = true
    el.onended = null
    el.onerror = null
    el.onabort = null
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
    resolve()
  }

  const fallback = () => {
    if (fallbackTriggered) return
    fallbackTriggered = true
    speakTextFallback(fallbackText)
  }

  el.onended = finish
  el.onerror = () => {
    fallback()
    finish()
  }
  el.onabort = finish
  el.src = url
  el.currentTime = 0
  timeoutId = setTimeout(() => {
    fallback()
    finish()
  }, 5000)
  el.play().catch(() => {
    fallback()
    finish()
  })
})

const playAudio = (url: string, fallbackText?: string) => {
  _voiceQueue = _voiceQueue
    .catch(() => {})
    .then(() => playAudioQueued(url, fallbackText))
}

const playVoiceKey = (key: string, fallbackText: string) => {
  const url = _audioMap.value.get(key)
  if (!url) {
    console.warn(`[VoiceTile] No audio for key="${key}" scheme="${_currentScheme.value}"`)
    speakTextFallback(fallbackText)
    return
  }
  playAudio(url, fallbackText)
}

export const primeVoiceAudio = (): void => {
  if (!process.client || _voicePrimed) return
  const el = getAudioEl()
  const prevMuted = el.muted
  const prevVolume = el.volume
  const prevSrc = el.src
  _voicePrimed = true
  el.muted = true
  el.volume = 0
  el.src = SILENT_WAV_DATA_URI
  const restore = () => {
    el.pause()
    el.currentTime = 0
    el.muted = prevMuted
    el.volume = prevVolume
    el.src = prevSrc
  }
  el.play()
    .then(() => restore())
    .catch(() => {
      _voicePrimed = false
      restore()
    })
}

export const setVoiceVolume = (volume: number): void => {
  const normalized = Number.isFinite(volume) ? Math.min(1, Math.max(0, volume)) : 0.85
  _volume.value = normalized
  if (_audioEl) {
    _audioEl.volume = normalized
  }
  if (process.client) {
    try {
      localStorage.setItem('mahjong.voiceVolume', String(normalized))
    } catch {}
  }
}

export const loadVoiceScheme = async (scheme: VoiceScheme): Promise<void> => {
  try {
    const manifest = buildManifest(scheme)
    _manifest.value = manifest
    _currentScheme.value = scheme

    const map = new Map<string, string>()
    for (const tile of manifest.tiles) {
      if (tile.mp3) map.set(tile.key, tile.mp3)
      else if (tile.opus) map.set(tile.key, tile.opus)
    }
    _audioMap.value = map
    console.info(`[VoiceTile] Loaded scheme="${scheme}" voice="${manifest.voice}" tiles=${manifest.tiles.length}`)
  } catch (e) {
    console.error(`[VoiceTile] Failed to load scheme ${scheme}:`, e)
  }
}

function resolveTileKey(suit: string, value: number): string {
  const normalizedSuit = suit.toLowerCase()
  const suitMap: Record<string, string> = {
    wan: 'wan',
    man: 'wan',
    dots: 'tong',
    tong: 'tong',
    tiao: 'tiao',
    characters: 'tiao',
    bamboos: 'tiao',
    feng: 'feng',
    wind: 'feng',
    jian: 'jian',
    dragon: 'jian',
    hua: 'hua',
    flower: 'hua',
  }
  const windMap: Record<number, string> = { 1: 'east', 2: 'south', 3: 'west', 4: 'north' }
  const jianMap: Record<number, string> = { 1: 'zhong', 2: 'fa', 3: 'bai' }
  const prefix = suitMap[normalizedSuit] || normalizedSuit

  if (prefix === 'feng') return `feng_${windMap[value] || value}`
  if (prefix === 'jian') return `jian_${jianMap[value] || value}`
  if (prefix === 'hua') return 'hua_plum'
  return `${prefix}_${value}`
}

export const playVoiceAction = (action: keyof typeof VOICE_ACTION_MAP): void => {
  if (!process.client) return
  const key = VOICE_ACTION_MAP[action]
  if (!key) return
  playVoiceKey(key, VOICE_ACTION_TEXT_MAP[action] || action)
}

export const playVoiceTile = (suit: string, value: number): void => {
  if (!process.client) return
  const key = resolveTileKey(suit, value)
  playVoiceKey(key, VOICE_TEXT_MAP[key] || key)
}

export const preloadAllTiles = async (): Promise<void> => {
  const urls = [..._audioMap.value.values()]
  urls.forEach(url => {
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'audio'
    link.href = url
    document.head.appendChild(link)
  })
}

export const getCurrentVoiceName = (): string => {
  return _manifest.value?.voice ?? _currentScheme.value
}

export const useVoiceTile = () => {
  if (process.client) {
    try {
      const saved = Number(localStorage.getItem('mahjong.voiceVolume'))
      if (Number.isFinite(saved) && saved >= 0 && saved <= 1 && Math.abs(saved - _volume.value) > 0.0001) {
        setVoiceVolume(saved)
      }
    } catch {}
  }

  return {
    currentScheme: _currentScheme,
    currentVoiceName: computed(() => _manifest.value?.voice ?? _currentScheme.value),
    currentVoiceVolume: computed(() => _volume.value),
    loadVoiceScheme,
    playVoiceTile,
    playVoiceAction,
    preloadAllTiles,
    primeVoiceAudio,
    setVoiceVolume,
  }
}
