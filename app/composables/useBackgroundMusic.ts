type BgmLoopMode = 'single' | 'all' | 'shuffle'

export interface BgmTrack {
  id: string
  label: string
  title: string
  fileName: string
  url: string
  path: string
}

const rootTrackModules = import.meta.glob('../../assets/*.{mp3,ogg,wav,m4a,aac,flac}', {
  eager: true,
  import: 'default',
}) as Record<string, string>
const bgmTrackModules = import.meta.glob('../../assets/bgm/**/*.{mp3,ogg,wav,m4a,aac,flac}', {
  eager: true,
  import: 'default',
}) as Record<string, string>

const normalizeTrackTitle = (filePath: string) => {
  const rawName = filePath.split('/').pop() || filePath
  return rawName.replace(/\.[^.]+$/, '')
}

const buildTrackList = (): BgmTrack[] => {
  const seen = new Set<string>()
  return [...Object.entries(rootTrackModules), ...Object.entries(bgmTrackModules)]
    .map(([path, url]) => {
      const fileName = path.split('/').pop() || path
      return {
        id: path,
        label: normalizeTrackTitle(path),
        title: normalizeTrackTitle(path),
        fileName,
        url,
        path,
      } satisfies BgmTrack
    })
    .filter(track => {
      if (seen.has(track.id)) return false
      seen.add(track.id)
      return true
    })
    .sort((a, b) => a.title.localeCompare(b.title, 'zh-Hans-CN'))
}

const _tracks = buildTrackList()
const _enabled = ref(true)
const _loopMode = ref<BgmLoopMode>('single')
const _currentTrackId = ref<string | null>(_tracks[0]?.id || null)
const _volume = ref(0.35)
const _isPlaying = ref(false)
let _audio: HTMLAudioElement | null = null
let _didInit = false

const STORAGE_KEYS = {
  enabled: 'mahjong.bgm.enabled',
  loopMode: 'mahjong.bgm.loopMode',
  currentTrackId: 'mahjong.bgm.currentTrackId',
  volume: 'mahjong.bgm.volume',
}

const getAudio = () => {
  if (!process.client) return null
  if (!_audio) {
    _audio = new Audio()
    _audio.preload = 'auto'
    _audio.addEventListener('ended', () => {
      handleTrackEnded()
    })
    _audio.addEventListener('play', () => {
      _isPlaying.value = true
    })
    _audio.addEventListener('pause', () => {
      _isPlaying.value = false
    })
  }
  _audio.volume = _volume.value
  return _audio
}

const persistState = () => {
  if (!process.client) return
  try {
    localStorage.setItem(STORAGE_KEYS.enabled, String(_enabled.value))
    localStorage.setItem(STORAGE_KEYS.loopMode, _loopMode.value)
    if (_currentTrackId.value) {
      localStorage.setItem(STORAGE_KEYS.currentTrackId, _currentTrackId.value)
    }
    localStorage.setItem(STORAGE_KEYS.volume, String(_volume.value))
  } catch {}
}

const syncAudioSource = () => {
  const audio = getAudio()
  if (!audio) return
  const current = _tracks.find(track => track.id === _currentTrackId.value) || null
  if (!current) return
  if (audio.src !== current.url) {
    audio.src = current.url
  }
  audio.loop = _loopMode.value === 'single'
  audio.volume = _volume.value
}

const pickNextTrack = (direction: 1 | -1 = 1) => {
  if (_tracks.length === 0) return null
  const currentIndex = Math.max(0, _tracks.findIndex(track => track.id === _currentTrackId.value))
  const nextIndex = (currentIndex + direction + _tracks.length) % _tracks.length
  return _tracks[nextIndex]
}

const pickShuffleTrack = () => {
  if (_tracks.length === 0) return null
  if (_tracks.length === 1) return _tracks[0]
  const pool = _tracks.filter(track => track.id !== _currentTrackId.value)
  return pool[Math.floor(Math.random() * pool.length)] || _tracks[0]
}

const playCurrentTrack = async () => {
  if (!process.client || !_enabled.value) return
  const audio = getAudio()
  if (!audio) return
  syncAudioSource()
  try {
    await audio.play()
  } catch {
    _isPlaying.value = false
  }
}

const pauseCurrentTrack = () => {
  const audio = getAudio()
  if (!audio) return
  audio.pause()
}

const setCurrentTrack = async (trackId: string) => {
  _currentTrackId.value = trackId
  persistState()
  syncAudioSource()
  if (_enabled.value) {
    await playCurrentTrack()
  }
}

const handleTrackEnded = async () => {
  if (_loopMode.value === 'single') {
    await playCurrentTrack()
    return
  }
  const nextTrack = _loopMode.value === 'shuffle' ? pickShuffleTrack() : pickNextTrack(1)
  if (!nextTrack) return
  _currentTrackId.value = nextTrack.id
  persistState()
  await playCurrentTrack()
}

const setEnabled = async (enabled: boolean) => {
  _enabled.value = enabled
  persistState()
  if (!_enabled.value) {
    pauseCurrentTrack()
    return
  }
  await playCurrentTrack()
}

const setLoopMode = (mode: BgmLoopMode) => {
  _loopMode.value = mode
  persistState()
  syncAudioSource()
}

const setVolume = (volume: number) => {
  _volume.value = Math.min(1, Math.max(0, volume))
  persistState()
  const audio = getAudio()
  if (audio) {
    audio.volume = _volume.value
  }
}

const playNextTrack = async () => {
  const nextTrack = _loopMode.value === 'shuffle' ? pickShuffleTrack() : pickNextTrack(1)
  if (!nextTrack) return
  await setCurrentTrack(nextTrack.id)
}

const ensureInitialized = () => {
  if (!process.client || _didInit) return
  _didInit = true
  try {
    const storedEnabled = localStorage.getItem(STORAGE_KEYS.enabled)
    const storedLoopMode = localStorage.getItem(STORAGE_KEYS.loopMode)
    const storedTrackId = localStorage.getItem(STORAGE_KEYS.currentTrackId)
    const storedVolume = localStorage.getItem(STORAGE_KEYS.volume)
    if (storedEnabled !== null) {
      _enabled.value = storedEnabled === 'true'
    }
    if (storedLoopMode === 'single' || storedLoopMode === 'all' || storedLoopMode === 'shuffle') {
      _loopMode.value = storedLoopMode
    }
    if (storedTrackId && _tracks.some(track => track.id === storedTrackId)) {
      _currentTrackId.value = storedTrackId
    } else if (_tracks.length > 0) {
      _currentTrackId.value = _tracks[0].id
    }
    if (storedVolume !== null) {
      const parsedVolume = Number(storedVolume)
      if (Number.isFinite(parsedVolume)) {
        _volume.value = Math.min(1, Math.max(0, parsedVolume))
      }
    }
  } catch {}
  syncAudioSource()
}

export const useBackgroundMusic = () => {
  const currentTrack = computed(() => _tracks.find(track => track.id === _currentTrackId.value) || null)

  return {
    tracks: _tracks,
    enabled: _enabled,
    loopMode: _loopMode,
    currentTrackId: _currentTrackId,
    currentTrack,
    volume: _volume,
    isPlaying: _isPlaying,
    ensureInitialized,
    setEnabled,
    setTrack: setCurrentTrack,
    setLoopMode,
    setCurrentTrack,
    setVolume,
    play: playCurrentTrack,
    playCurrentTrack,
    pause: pauseCurrentTrack,
    pauseCurrentTrack,
    next: playNextTrack,
    playNextTrack,
  }
}
