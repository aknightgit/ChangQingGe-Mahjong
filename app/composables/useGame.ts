import { ref, computed } from 'vue'
import type { GameState, Player, ActionType, Tile } from '~/types/game'
import { GamePhase } from '~/types/game'
import { io, type Socket } from 'socket.io-client'

// 延迟高亮配置（毫秒）
export const ACTION_HIGHLIGHT_DELAY_MS = 2000

export const useGame = () => {
  const gameState = ref<GameState | null>(null)
  const playerView = ref<any>(null) // Player's hand view
  const availableActions = ref<ActionType[]>([])
  const socket = ref<Socket | null>(null)
  const isConnected = ref(false)
  const error = ref<string | null>(null)
  const isActionPending = ref(false)
  const roomDismissedReason = ref<string | null>(null)
  // 延迟高亮：记录最后一次 state-changed 的时间戳
  const lastStateChangeAt = ref<number>(0)

  const currentPlayer = computed(() => {
    if (!gameState.value || !playerId.value) return null
    return gameState.value.players.find(p => p.id === playerId.value)
  })

  const playerId = ref<string | null>(null)
  const gameId = ref<string | null>(null)

  const fetchGameState = async (gId: string, pId: string) => {
    try {
      const response = await $fetch('/api/game/state', {
        query: { gameId: gId, playerId: pId },
        cache: 'no-cache'
      })

      if ((response as any)?.success) {
        updateState((response as any).data)
      }
    } catch (e) {
      console.error('Failed to fetch game state:', e)
    }
  }

  const connect = async (gId: string, pId: string) => {
    gameId.value = gId
    playerId.value = pId
    roomDismissedReason.value = null
    const userName = useCookie('user_name').value || 'Player'

    try {
      // Fetch initial state (optional, but good for immediate render)
      await fetchGameState(gId, pId)

      // Connect Socket.IO
      // Use WebSocket-first transport for faster, more reliable connections
      const wsUrl = window.location.origin
      socket.value = io(wsUrl, {
        withCredentials: true,
        transports: ['polling', 'websocket'],
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000
      })

      socket.value.on('connect', () => {
        console.log('Socket.IO connected:', socket.value?.id)
        isConnected.value = true
        error.value = null

        // Authenticate
        socket.value?.emit('auth:login', {
          userId: pId,
          userName: userName
        })

        // Join Room
        socket.value?.emit('room:join', {
          roomId: gId,
          userId: pId,
          userName: userName
        })
      })

      socket.value.on('connect_error', (err) => {
        // Suppress first websocket error (expected fallback to polling)
        if (err.message?.includes('websocket') && !isConnected.value) return
        console.warn('Socket connect_error:', err.message)
        // 不设置 error.value，避免触发不必要的 re-render
        isConnected.value = false
      })

      socket.value.on('disconnect', () => {
        console.log('Socket disconnected')
        isConnected.value = false
      })

      // Room Events
      socket.value.on('room:user-joined', async (data) => {
        console.log('User joined:', data)
        await refreshState()
      })

      socket.value.on('room:user-left', async (data) => {
        console.log('User left:', data)
        await refreshState()
      })

      socket.value.on('room:error', (data) => {
        console.error('Room error:', data)
        error.value = data.message
      })

      socket.value.on('room:dismissed', async (payload) => {
        console.warn('Room dismissed:', payload)
        roomDismissedReason.value = payload?.reason || 'owner_left'
        error.value = payload?.message || 'Room dismissed by host'
        await refreshState()
      })

      // Game Events
      socket.value.on('game:state-changed', async (data) => {
        console.log('Game state update:', data)
        lastStateChangeAt.value = Date.now()
        await refreshState()
      })

      // Listen for server's broadcastGameState events (different name from action-triggered events)
      socket.value.on('gameStateUpdate', async (data) => {
        console.log('GameStateUpdate from server:', data)
        lastStateChangeAt.value = Date.now()
        await refreshState()
      })

      socket.value.on('game:action-received', async (data) => {
        console.log('Action received:', data)
        lastStateChangeAt.value = Date.now()
        await refreshState()
      })

    } catch (e: any) {
      error.value = e.message || 'Failed to connect'
    }
  }

  const disconnect = () => {
    if (socket.value) {
      socket.value.disconnect()
      socket.value = null
    }
    isConnected.value = false
  }

  // 防止并发 refresh + 防抖
  let isRefreshing = false
  let lastRefreshAt = 0
  const DEBOUNCE_MS = 1500

  const refreshState = async () => {
    if (!gameId.value || !playerId.value) return
    if (isRefreshing) return
    const now = Date.now()
    if (now - lastRefreshAt < DEBOUNCE_MS) return
    isRefreshing = true
    lastRefreshAt = now
    try {
      await fetchGameState(gameId.value, playerId.value)
    } catch (e) {
      // 静默处理刷新错误，不触发 re-render
      console.warn('refreshState failed:', e)
    } finally {
      isRefreshing = false
    }
  }

  const updateState = (data: any) => {
    gameState.value = data.game
    playerView.value = data.playerView
    availableActions.value = data.availableActions
  }

  const executeAction = async (action: ActionType, tileId?: string, tileIds?: string[]) => {
    if (!gameId.value || !playerId.value) return
    if (gameState.value?.phase === GamePhase.ENDED) return
    if (isActionPending.value) return
    isActionPending.value = true

    // 单通道执行：统一走 API，避免 Socket + API 重复执行
    try {
      const { data, error: apiError } = await useFetch('/api/game/action', {
        method: 'POST',
        body: {
          gameId: gameId.value,
          playerId: playerId.value,
          action,
          type: action, // 兼容旧字段
          tileId,
          tileIds
        }
      })

      if (apiError.value) {
        console.error('Action failed:', apiError.value)
        return
      }

      if (data.value?.success) {
        updateState(data.value.data)
        await refreshState()
      }
    } catch (e) {
      console.error('Error executing action:', e)
    } finally {
      isActionPending.value = false
    }
  }

  const startGame = async () => {
    if (!gameId.value || !playerId.value) return

    console.log('[startGame] Starting game:', gameId.value)
    try {
      const { data } = await useFetch('/api/game/start', {
        method: 'POST',
        body: { gameId: gameId.value, playerId: playerId.value }
      })

      if (data.value?.success) {
        console.log('[startGame] API success, refreshing state...')
        await refreshState()
        // Notify others via socket
        socket.value?.emit('game:state-update', { gameId: gameId.value })
        console.log('[startGame] Done, phase:', gameState.value?.phase)
      } else {
        console.warn('[startGame] API returned non-success:', data.value)
      }
    } catch (e) {
      console.error('[startGame] Failed:', e)
    }
  }

  return {
    gameState,
    currentPlayer,
    availableActions,
    isConnected,
    error,
    connect,
    disconnect,
    executeAction,
    startGame,
    refreshState,
    isActionPending,
    roomDismissedReason,
    lastStateChangeAt
  }
}
