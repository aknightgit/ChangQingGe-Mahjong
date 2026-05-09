import { ref, computed } from 'vue'
import type { GameState, Player, ActionType, Tile } from '~/types/game'
import { GamePhase } from '~/types/game'
import { io, type Socket } from 'socket.io-client'


export const useGame = () => {
  const route = useRoute()
  const isLocalDevHost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  const debugAccessToken =
    typeof route.query.debugAccessToken === 'string' ? route.query.debugAccessToken : undefined
  const gameState = ref<GameState | null>(null)
  const playerView = ref<any>(null) // Player's hand view
  const tingPreview = ref<{ isTing: boolean; winningTiles: Array<{ tile: Tile; remainingCount?: number }> }>({
    isTing: false,
    winningTiles: []
  })
  const availableActions = ref<ActionType[]>([])
  const socket = ref<Socket | null>(null)
  const isConnected = ref(false)
  const error = ref<string | null>(null)
  const leadingBrotherEvent = ref<{ firstPlayerName: string; tileKey: string } | null>(null)
  const actionApprovalEvent = ref<{ requesterName: string; requesterAction: string; candidatePlayerId: string; availableActions: string[]; tileKey: string; expiresAt?: number } | null>(null)
  const isActionPending = ref(false)
  const roomDismissedReason = ref<string | null>(null)
  // 延迟高亮：记录最后一次 state-changed 的时间戳
  const lastStateChangeAt = ref<number>(0)
  let lastRefreshTriggerAt = 0

  // 🔧 轮询兜底：socket 不可靠时（Capacitor/移动网络），定时刷新确保牌局推进
  let pollingTimer: ReturnType<typeof setInterval> | null = null
  const POLLING_MS = 3000

  const startPolling = () => {
    if (pollingTimer) return
    pollingTimer = setInterval(() => {
      const gs = gameState.value
      if (gameId.value && playerId.value && gs && (gs.phase === 'playing' || gs.phase === 'waiting')) {
        void refreshState()
      }
    }, POLLING_MS)
  }

  const stopPolling = () => {
    if (pollingTimer) { clearInterval(pollingTimer); pollingTimer = null }
  }

  const playerId = ref<string | null>(null)
  const gameId = ref<string | null>(null)

  const currentPlayer = computed(() => {
    if (!gameState.value || !playerId.value) return null
    return gameState.value.players.find(p => p.id === playerId.value)
  })

  const currentRound = computed(() => {
    const raw = Number(gameState.value?.currentRound ?? gameState.value?.roundNumber ?? 1)
    return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 1
  })

  const fetchGameState = async (gId: string, pId: string) => {
    try {
      const response = await $fetch('/api/game/state', {
        query: {
          gameId: gId,
          playerId: pId,
          debugAccessToken: typeof route.query.debugAccessToken === 'string' ? route.query.debugAccessToken : undefined
        },
        cache: 'no-cache'
      })

      if ((response as any)?.success) {
        updateState((response as any).data)
        isConnected.value = true
        error.value = null
      }
    } catch (e) {
      console.error('Failed to fetch game state:', e)
    }
  }

  const requestRefreshState = () => {
    const now = Date.now()
    if (now - lastRefreshTriggerAt < 180) return
    lastRefreshTriggerAt = now
    void refreshState()
  }

  const connect = async (gId: string, pId: string) => {
    gameId.value = gId
    playerId.value = pId
    roomDismissedReason.value = null
    const userName = useCookie('user_name').value || 'Player'

    try {
      // Fetch initial state (optional, but good for immediate render)
      await fetchGameState(gId, pId)
      startPolling() // 无论 socket 状态，都启动轮询兜底

      if (debugAccessToken) {
        isConnected.value = true
        error.value = null
        return
      }

      // Connect Socket.IO.
      // Prefer WebSocket for lower latency on mobile/public networks,
      // but keep polling as a fallback for restrictive proxies/tunnels.
      const wsUrl = window.location.origin
      const transports = isLocalDevHost ? ['polling'] : ['websocket', 'polling']
      socket.value = io(wsUrl, {
        path: '/mahjong/socket.io',
        auth: {
          debugAccessToken,
          roomId: gId,
          playerId: pId
        },
        withCredentials: true,
        transports,
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000
      })

      socket.value.on('connect', () => {
        console.log('Socket.IO connected:', socket.value?.id, 'transport=', socket.value?.io.engine.transport.name)
        isConnected.value = true
        error.value = null

        // Authenticate
        socket.value?.emit('auth:login', {
          userId: pId,
          userName: userName,
          debugAccessToken,
          roomId: gId
        })

        // Join Room
        socket.value?.emit('room:join', {
          roomId: gId,
          userId: pId,
          userName: userName,
          debugAccessToken
        })
      })

      socket.value.on('connect_error', (err) => {
        // Suppress first websocket error (expected fallback to polling)
        if (err.message?.includes('websocket') && !isConnected.value) return
        console.warn('Socket connect_error:', err.message, 'transport=', socket.value?.io.engine.transport.name)
        // 已经拿到状态时，保留页面可交互，不退回“连接中”空壳
        if (!gameState.value) {
          isConnected.value = false
        }
      })

      socket.value.on('disconnect', () => {
        console.log('Socket disconnected', 'transport=', socket.value?.io.engine.transport.name)
        if (!gameState.value) {
          isConnected.value = false
        }
      })

      // Room Events
      socket.value.on('room:user-joined', async (data) => {
        console.log('User joined:', data)
        requestRefreshState()
      })

      socket.value.on('room:user-left', async (data) => {
        console.log('User left:', data)
        requestRefreshState()
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

      // 房主断连等待重连
      socket.value.on('room:owner-disconnected', (data) => {
        console.warn('Owner disconnected, waiting for reconnect...', data)
        error.value = `房主暂时离线，等待重连中（${data?.graceSeconds || 15}秒）...`
      })

      // 房主重连成功
      socket.value.on('room:owner-reconnected', async (data) => {
        console.log('Owner reconnected:', data)
        error.value = null
        requestRefreshState()
      })

      // Game Events
      socket.value.on('game:state-changed', async (data) => {
        console.log('Game state update:', data)
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('mahjong-realtime-state', { detail: data }))
        }
        requestRefreshState()
      })

      // Listen for server's broadcastGameState events (different name from action-triggered events)
      socket.value.on('gameStateUpdate', async (data) => {
        console.log('GameStateUpdate from server:', data)
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('mahjong-realtime-state', { detail: data }))
        }
        requestRefreshState()
      })

      socket.value.on('game:action-received', async (data) => {
        console.log('Action received:', data)
        requestRefreshState()
      })

      // 牌局快讯广播
      socket.value.on('broadcastMessage', (data: { id: number; text: string; type: string; timestamp: number; timeLabel: string; actionKind?: string }) => {
        console.log('📢 广播消息:', data)
        window.dispatchEvent(new CustomEvent('mahjong-broadcast', { detail: data }))
      })

      // 谢谢带头大哥事件
      socket.value.on('leadingBrother', (data: { firstPlayerName: string; tileKey: string }) => {
        console.log('🔥 谢谢带头大哥！', data)
        leadingBrotherEvent.value = data
        // 0.1s 后自动清除
        setTimeout(() => {
          leadingBrotherEvent.value = null
        }, 100)
      })

      // 通用审批流程
      socket.value.on('actionApproval', (data: { requesterName: string; requesterAction: string; candidatePlayerId: string; availableActions: string[]; tileKey: string; expiresAt?: number }) => {
        console.log('⚡ 审批流程:', data)
        actionApprovalEvent.value = data
      })

    } catch (e: any) {
      error.value = e.message || 'Failed to connect'
    }
  }

  const disconnect = () => {
    stopPolling()
    if (socket.value) {
      socket.value.disconnect()
      socket.value = null
    }
    isConnected.value = false
  }

  // 防止并发 refresh + 防抖
  let isRefreshing = false
  let refreshQueued = false
  let lastRefreshAt = 0
  const DEBOUNCE_MS = 100

  const refreshState = async () => {
    if (!gameId.value || !playerId.value) return
    const now = Date.now()
    if (isRefreshing) {
      refreshQueued = true
      return
    }
    if (now - lastRefreshAt < DEBOUNCE_MS) {
      refreshQueued = true
      setTimeout(() => {
        if (refreshQueued) {
          refreshQueued = false
          refreshState()
        }
      }, DEBOUNCE_MS)
      return
    }
    isRefreshing = true
    lastRefreshAt = now
    try {
      await fetchGameState(gameId.value, playerId.value)
    } catch (e) {
      // 静默处理刷新错误，不触发 re-render
      console.warn('refreshState failed:', e)
    } finally {
      isRefreshing = false
      if (refreshQueued) {
        refreshQueued = false
        lastRefreshAt = 0
        await refreshState()
      }
    }
  }

  const updateState = (data: any) => {
    gameState.value = data.game
    playerView.value = data.playerView
    tingPreview.value = data.tingPreview || { isTing: false, winningTiles: [] }
    // 只在availableActions实际变化时才更新lastStateChangeAt
    const oldActions = availableActions.value
    const newActions = data.availableActions || []
    availableActions.value = newActions
    if (JSON.stringify(oldActions.sort()) !== JSON.stringify(newActions.sort())) {
      lastStateChangeAt.value = Date.now()
    }
  }

  const replacePendingAction = (action: ActionType, extras: Record<string, any> = {}) => {
    if (!gameState.value || !playerId.value) return
    const nextPending = (gameState.value.pendingActions || []).filter((pa: any) => pa.playerId !== playerId.value)
    nextPending.push({
      playerId: playerId.value,
      availableActions: [action],
      expiresAt: Date.now() + 5000,
      ...extras
    })
    gameState.value = {
      ...gameState.value,
      pendingActions: nextPending
    }
    availableActions.value = [action]
    lastStateChangeAt.value = Date.now()
  }

  const executeAction = async (action: ActionType, tileId?: string, tileIds?: string[], winOptionLabel?: string) => {
    if (!gameId.value || !playerId.value) return false
    if (gameState.value?.phase === GamePhase.ENDED) return false
    if (isActionPending.value) return false
    if (action === 'discard' && !availableActions.value.includes(action)) return false
    isActionPending.value = true

    try {
      const response = await $fetch('/api/game/action', {
        method: 'POST',
        body: {
          gameId: gameId.value,
          playerId: playerId.value,
        action,
        type: action,
        tileId,
        tileIds,
        winOptionLabel
      }
    })

      if ((response as any)?.success) {
        updateState((response as any).data)
        return true
      } else {
        console.error('Action failed:', response)
        return false
      }
    } catch (e) {
      console.error('Error executing action:', e)
      return false
    } finally {
      isActionPending.value = false
    }
  }

  const startGame = async (options?: { hesitationWindow?: number; fixedDice?: [number, number] }) => {
    if (!gameId.value || !playerId.value) return

    console.log('[startGame] Starting game:', gameId.value)
    try {
      const response = await $fetch('/api/game/start', {
        method: 'POST',
        body: {
          gameId: gameId.value,
          playerId: playerId.value,
          hesitationWindow: Math.max(1000, options?.hesitationWindow ?? 5000),
          dice: options?.fixedDice
        }
      })

      if ((response as any)?.success) {
        console.log('[startGame] API success, refreshing state...')
        roomDismissedReason.value = null  // 清除 overlay 原因
        await refreshState()
        socket.value?.emit('game:state-update', { gameId: gameId.value })
        console.log('[startGame] Done, phase:', gameState.value?.phase)
      } else {
        console.warn('[startGame] API returned non-success:', response)
      }
    } catch (e) {
      console.error('[startGame] Failed:', e)
    }
  }

  // 强制刷新（绕过debounce），用于关键操作后（如startGame）
  const forceRefreshState = async () => {
    if (!gameId.value || !playerId.value) return
    lastRefreshAt = 0 // 重置debounce
    isRefreshing = false
    await refreshState()
  }

  return {
    gameState,
    currentRound,
    currentPlayer,
    tingPreview,
    availableActions,
    isConnected,
    error,
    connect,
    disconnect,
    executeAction,
    startGame,
    refreshState,
    forceRefreshState,
    replacePendingAction,
    isActionPending,
    roomDismissedReason,
    lastStateChangeAt,
    leadingBrotherEvent,
    actionApprovalEvent
  }
}
