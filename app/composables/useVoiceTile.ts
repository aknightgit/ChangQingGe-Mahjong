/**
 * 麻将牌面语音播放
 * 支持多音色方案（bingtang / pure_zh）
 * 每张出牌立即念牌
 */

import { ref, computed } from 'vue'

export type VoiceScheme = 'bingtang' | 'pure_zh'

interface TileVoiceEntry {
  key: string
  text: string
  opus: string
}

interface Manifest {
  voice: string
  tiles: TileVoiceEntry[]
}

// 全局单例
const _currentScheme = ref<VoiceScheme>('bingtang')
const _manifest = ref<Manifest | null>(null)
const _audioMap = ref<Map<string, string>>(new Map())
let _audioEl: HTMLAudioElement | null = null

// 获取音频元素（复用）
const getAudioEl = (): HTMLAudioElement => {
  if (!_audioEl) {
    _audioEl = new Audio()
    _audioEl.volume = 0.85
  }
  return _audioEl
}

// 加载音色方案
export const loadVoiceScheme = async (scheme: VoiceScheme): Promise<void> => {
  const manifestPath = `/assets/voice/${scheme}/manifest.json`
  try {
    const res = await fetch(manifestPath)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const manifest: Manifest = await res.json()
    _manifest.value = manifest
    _currentScheme.value = scheme

    // 建立 key → opus URL 的映射
    const map = new Map<string, string>()
    for (const tile of manifest.tiles) {
      map.set(tile.key, tile.opus)
    }
    _audioMap.value = map
    console.info(`[VoiceTile] Loaded scheme="${scheme}" voice="${manifest.voice}" tiles=${manifest.tiles.length}`)
  } catch (e) {
    console.error(`[VoiceTile] Failed to load scheme ${scheme}:`, e)
  }
}

// 将牌面 key 映射为出声 key（处理特殊情况）
function resolveTileKey(suit: string, value: number): string {
  // suit 来自 TileSuit enum 或字面量（小写）
  const suitMap: Record<string, string> = {
    wan: 'wan',
    dots: 'tong',
    tiao: 'tiao',
    feng: 'feng',
    jian: 'jian',
    hua: 'hua',
    // 大写枚举值（TileSuit.WAN 等）
    WAN: 'wan',
    DOTS: 'tong',
    CHARACTERS: 'tiao',
    BAMBOOS: 'tiao',
    WIND: 'feng',
    DRAGON: 'jian',
    FLOWER: 'hua',
  }
  const windMap: Record<number, string> = { 1: 'east', 2: 'south', 3: 'west', 4: 'north' }
  const jianMap: Record<number, string> = { 1: 'zhong', 2: 'fa', 3: 'bai' }
  const prefix = suitMap[suit.toLowerCase()] || suit.toLowerCase()
  let suffix: string

  if (suit === 'feng' || suit === 'WIND') {
    suffix = windMap[value] || String(value)
  } else if (suit === 'jian' || suit === 'DRAGON') {
    suffix = jianMap[value] || String(value)
  } else if (suit === 'hua' || suit === 'FLOWER') {
    // 所有花牌统一用「花」语音（hua_plum）
    return 'hua_plum'
  } else {
    suffix = String(value)
  }

  return `${prefix}_${suffix}`
}

/** 播放指定牌面的语音 */
export const playVoiceTile = (suit: string, value: number): void => {
  if (!process.client) return
  const key = resolveTileKey(suit, value)
  const url = _audioMap.value.get(key)
  if (!url) {
    // 尝试兜底：用 value 配合 suit 前缀
    const altKey = `${suit.toLowerCase()}_${value}`
    const altUrl = _audioMap.value.get(altKey)
    if (altUrl) {
      playAudio(altUrl)
    } else {
      console.warn(`[VoiceTile] No audio for key="${key}" alt="${altKey}" scheme="${_currentScheme.value}"`)
    }
    return
  }
  playAudio(url)
}

/** 播放 URL */
const playAudio = (url: string) => {
  const el = getAudioEl()
  el.src = url
  el.currentTime = 0
  el.play().catch(() => {
    // 播放失败静默
  })
}

/** 预加载所有音频（可选，加速首次播放） */
export const preloadAllTiles = async (): Promise<void> => {
  const map = _audioMap.value
  const urls = [...map.values()]
  // 并发预加载（不阻塞）
  urls.forEach(url => {
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'audio'
    link.href = url
    document.head.appendChild(link)
  })
  console.info(`[VoiceTile] Preloading ${urls.length} audio files`)
}

/** 获取当前音色名 */
export const getCurrentVoiceName = (): string => {
  return _manifest.value?.voice ?? _currentScheme.value
}

export const useVoiceTile = () => {
  return {
    currentScheme: _currentScheme,
    currentVoiceName: computed(() => _manifest.value?.voice ?? _currentScheme.value),
    loadVoiceScheme,
    playVoiceTile,
    preloadAllTiles,
  }
}