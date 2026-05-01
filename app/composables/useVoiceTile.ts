/**
 * 麻将牌面语音播放
 * 资源统一放在 assets/voice 下，不依赖 public 目录
 */

import { ref, computed } from 'vue'

export type VoiceScheme = 'bingtang'

interface TileVoiceEntry {
  key: string
  text: string
  mp3?: string
  opus: string
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

// 动作语音（补花、吃、碰、杠、胡、自摸）
const VOICE_ACTION_MAP: Record<string, string> = {
  flowerReplace: '补花',
  chow: '我吃',
  pong: '碰',
  kong: '杠',
  hu: '胡了',
  selfHu: '自摸',
}

const audioModules = import.meta.glob('../../assets/voice/**/*.{mp3,opus}', {
  eager: true,
  import: 'default',
}) as Record<string, string>

const schemeEntries = Object.entries(audioModules)
  .map(([path, url]) => {
    const match = path.match(/\.\.\/\.\.\/assets\/voice\/([^/]+)\/([^/.]+)\.(mp3|opus)$/)
    if (!match) return null
    const [, scheme, key, ext] = match
    return { scheme, key, ext, url }
  })
  .filter(Boolean) as Array<{ scheme: string, key: string, ext: 'mp3' | 'opus', url: string }>

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
    .filter((item): item is TileVoiceEntry => !!item.opus)
    .sort((a, b) => a.key.localeCompare(b.key, 'zh-CN'))

  return {
    voice: '冰糖',
    tiles,
  }
}

const _currentScheme = ref<VoiceScheme>('bingtang')
const _manifest = ref<Manifest | null>(null)
const _audioMap = ref<Map<string, string>>(new Map())
const _volume = ref(0.85)
let _audioEl: HTMLAudioElement | null = null

const getAudioEl = (): HTMLAudioElement => {
  if (!_audioEl) {
    _audioEl = new Audio()
    _audioEl.volume = _volume.value
  }
  return _audioEl
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
      map.set(tile.key, tile.opus)
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
  // 冰糖风牌素材里南/西命名与实际内容相反，这里统一纠正映射，避免播报错位。
  const windMap: Record<number, string> = { 1: 'east', 2: 'west', 3: 'south', 4: 'north' }
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
  // 动作语音放在 bingtang/ 目录，key 即文件名
  const url = _audioMap.value.get(key)
  if (url) {
    playAudio(url)
  } else {
    console.warn(`[VoiceTile] No action audio for action="${action}" key="${key}"`)
  }
}

export const playVoiceTile = (suit: string, value: number): void => {
  if (!process.client) return
  const key = resolveTileKey(suit, value)
  const url = _audioMap.value.get(key)
  if (!url) {
    console.warn(`[VoiceTile] No audio for key="${key}" scheme="${_currentScheme.value}"`)
    return
  }
  playAudio(url)
}

const playAudio = (url: string) => {
  const el = getAudioEl()
  el.src = url
  el.currentTime = 0
  el.play().catch(() => {})
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
    setVoiceVolume,
  }
}
