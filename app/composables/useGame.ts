import { ref, computed } from 'vue'
import type { GameState, Player, ActionType, Tile } from '~/types/game'
import { GamePhase } from '~/types/game'
import { io, type Socket } from 'socket.io-client'


export const useGame = () => {
  const route = useRoute()
  const pushDiag = (event: string, detail: Record<string, any> = {}) => {
    if (typeof window === 'undefined') return
    try {
      const payload = {
        ts: new Date().toISOString(),
        event,
        detail
      }
      const w = window as any
      if (!Array.isArray(w.__mahjongDiagLog)) w.__mahjongDiagLog = []
      w.__mahjongDiagLog.push(payload)
      if (w.__mahjongDiagLog.length > 300) w.__mahjongDiagLog.shift()
      console.log(`[Diag][useGame] ${event}`, detail)
    } catch (err) {
      console.warn('[Diag][useGame] pushDiag failed:', err)
    }
  }
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
  const isReconnecting = ref(false)  // ★ 正在重连中（用于 UI 提示）
  const reconnectAttempt = ref(0)   // ★ 重连尝试次数
  const error = ref<string | null>(null)
  const rebelEvent = ref<{ playerId: string; playerName: string; hand: any[]; rebelEndTime: number } | null>(null)
  const leadingBrotherEvent = ref<{ firstPlayerName: string; tileKey: string } | null>(null)
  const actionApprovalEvent = ref<{ requesterName: string; requesterAction: string; candidatePlayerId: string; availableActions: string[]; tileKey: string; expiresAt?: number } | null>(null)
  const isActionPending = ref(false)
  const roomDismissedReason = ref<string | null>(null)
  // 延迟高亮：记录最后一次 state-changed 的时间戳
  const lastStateChangeAt = ref<number>(0)
  let lastRefreshTriggerAt = 0

  // 🔧 轮询兜底：socket 不可靠时（Capacitor/移动网络），定时刷新确保牌局推进
  let pollingTimer: ReturnType<typeof setInterval> | null = null
  const POLLING_MS = 1000
  let pollingTickCount = 0
  let lastFetchStartedAt = 0
  let lastFetchSucceededAt = 0
  let lastStateSummary = ''
  // 已显示过的广播ID（HTTP兜底用，避免轮询重复追加）
  const seenBroadcastIds = new Set<number>()

  const startPolling = () => {
    if (pollingTimer) {
      pushDiag('polling:start:skip-existing', { gameId: gameId.value, playerId: playerId.value })
      return
    }
    pollingTickCount = 0
    pushDiag('polling:start', { gameId: gameId.value, playerId: playerId.value, intervalMs: POLLING_MS })
    pollingTimer = setInterval(() => {
      pollingTickCount += 1
      const gs = gameState.value
      if (gameId.value && playerId.value && gs && (gs.phase === 'playing' || gs.phase === 'waiting' || gs.phase === 'starting' || gs.phase === 'reveal' || gs.phase === 'ended')) {
        if (pollingTickCount === 1 || pollingTickCount % 5 === 0) {
          pushDiag('polling:tick', {
            tick: pollingTickCount,
            phase: gs.phase,
            currentPlayerIndex: gs.currentPlayerIndex,
            pendingActions: gs.pendingActions?.length || 0,
            msSinceLastFetchSuccess: lastFetchSucceededAt ? Date.now() - lastFetchSucceededAt : null
          })
        }
        void refreshState('polling')
      }
    }, POLLING_MS)
  }

  const stopPolling = () => {
    if (pollingTimer) {
      clearInterval(pollingTimer)
      pollingTimer = null
      pushDiag('polling:stop', { tickCount: pollingTickCount, gameId: gameId.value, playerId: playerId.value })
    }
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
    lastFetchStartedAt = Date.now()
    pushDiag('fetch:start', { gId, pId })
    try {
      const response = await $fetch('/mahjong/api/game/state', {
        query: {
          gameId: gId,
          playerId: pId,
          debugAccessToken: typeof route.query.debugAccessToken === 'string' ? route.query.debugAccessToken : undefined
        },
        cache: 'no-cache'
      })

      if ((response as any)?.success) {
        const stateData = (response as any).data
        updateState((response as any).data)
        isConnected.value = true
        error.value = null
        lastFetchSucceededAt = Date.now()
        pushDiag('fetch:success', {
          gId,
          pId,
          phase: stateData?.game?.phase,
          currentPlayerIndex: stateData?.game?.currentPlayerIndex,
          currentPlayerName: stateData?.game?.players?.[stateData?.game?.currentPlayerIndex || 0]?.name,
          pendingActions: stateData?.game?.pendingActions?.length || 0,
          updatedAt: stateData?.game?.updatedAt || null,
          durationMs: Date.now() - lastFetchStartedAt,
          availableActions: (stateData?.availableActions || []).join(',')
        })

        // 🔧 关键保险：每次fetchGameState拿到状态后，如果phase不是STARTING，发出事件让页面关掉骰子覆盖层
        if (stateData?.game?.phase && stateData.game.phase !== 'starting') {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('mahjong-phase-check', { detail: { phase: stateData.game.phase } }))
          }
        }
      }
    } catch (e: any) {
      // 404 = 刚创建房间服务端还没就绪，静默重试，不抛出
      if (e?.statusCode === 404 || e?.status === 404) {
        pushDiag('fetch:retry-404', { gId, pId, message: e?.message || '404' })
        console.warn('[fetchGameState] 404, retrying in 800ms...')
        await new Promise(r => setTimeout(r, 800))
        return fetchGameState(gId, pId)
      }
      // 403 = 鉴权问题，观赛者/访客可能遇到，也自动重试
      if (e?.statusCode === 403 || e?.status === 403) {
        pushDiag('fetch:retry-403', { gId, pId, message: e?.message || '403' })
        console.warn('[fetchGameState] 403, retrying in 800ms...')
        await new Promise(r => setTimeout(r, 800))
        return fetchGameState(gId, pId)
      }
      pushDiag('fetch:error', {
        gId,
        pId,
        statusCode: e?.statusCode || e?.status || null,
        durationMs: Date.now() - lastFetchStartedAt,
        message: e?.message || String(e)
      })
      console.error('Failed to fetch game state:', e)
    }
  }

  const requestRefreshState = (source = 'request') => {
    const now = Date.now()
    if (now - lastRefreshTriggerAt < 180) {
      pushDiag('refresh:request:throttled', { source, deltaMs: now - lastRefreshTriggerAt })
      return
    }
    lastRefreshTriggerAt = now
    pushDiag('refresh:request', { source })
    void refreshState(source)
  }

  const connect = async (gId: string, pId: string) => {
    gameId.value = gId
    playerId.value = pId
    roomDismissedReason.value = null
    const userName = useCookie('user_name', { path: '/' }).value || 'Player'

    try {
      // Fetch initial state (optional, but good for immediate render)
      await fetchGameState(gId, pId)
      startPolling() // 无论 socket 状态，都启动轮询兜底
      pushDiag('connect:after-initial-fetch', { gId, pId, hasGameState: !!gameState.value })

      if (debugAccessToken) {
        isConnected.value = true
        error.value = null
        pushDiag('connect:debug-access-token', { gId, pId })
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
        reconnectionAttempts: Infinity,  // ★ 无线重连
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        // ★ ping/pong 心跳: 30s ping, 25s pong timeout
        pingInterval: 30000,
        pingTimeout: 25000
      })

      socket.value.on('connect', () => {
        console.log('Socket.IO connected:', socket.value?.id, 'transport=', socket.value?.io.engine.transport.name)
        pushDiag('socket:connect', {
          socketId: socket.value?.id,
          transport: socket.value?.io.engine.transport.name,
          gId,
          pId
        })
        isConnected.value = true
        error.value = null
        // Socket.IO 已连接，停止轮询（减少无谓请求）
        stopPolling()

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

        // ★ Socket 重连后刷新状态（防止 REVEAL→ENDED 转换被错过）
        void refreshState('socket-reconnect')
      })

      socket.value.on('connect_error', (err) => {
        // Suppress first websocket error (expected fallback to polling)
        if (err.message?.includes('websocket') && !isConnected.value) return
        pushDiag('socket:connect_error', {
          message: err.message,
          transport: socket.value?.io.engine.transport.name,
          hasGameState: !!gameState.value
        })
        console.warn('Socket connect_error:', err.message, 'transport=', socket.value?.io.engine.transport.name)
        // 已经拿到状态时，保留页面可交互，不退回“连接中”空壳
        if (!gameState.value) {
          isConnected.value = false
        }
      })

      socket.value.on('disconnect', (reason) => {
        pushDiag('socket:disconnect', {
          reason,
          transport: socket.value?.io.engine.transport.name,
          hasGameState: !!gameState.value
        })
        console.log('Socket disconnected, reason=', reason)
        if (!gameState.value) {
          isConnected.value = false
        }
        // Socket.IO 断开，恢复轮询兜底
        startPolling()
      })

      // ★ Socket.IO 内部重连事件处理
      socket.value.on('reconnect_attempt', (attempt) => {
        isReconnecting.value = true
        reconnectAttempt.value = attempt
        pushDiag('socket:reconnect_attempt', { attempt })
        console.log(`[Socket] reconnect attempt #${attempt}`)
      })
      socket.value.on('reconnect', (attempt) => {
        isReconnecting.value = false
        reconnectAttempt.value = 0
        pushDiag('socket:reconnect', { attempt })
        console.log(`[Socket] reconnected after #${attempt} attempts`)
        void refreshState('socket-reconnect-success')
      })
      socket.value.on('reconnect_failed', () => {
        pushDiag('socket:reconnect_failed', {})
        console.warn('[Socket] reconnect failed (all attempts exhausted), keep polling')
        // 重连全部失败，轮询顶住
        startPolling()
      })

      // ★ 应用层心跳检测：socket.on('disconnect') 在移动端可能不触发
      // 每 15s 检查一次 lastHeartbeat，超过 45s 没更新就主动 reconnect
      let lastHeartbeat = Date.now()
      const heartbeatTimer = setInterval(() => {
        if (!socket.value?.connected) {
          lastHeartbeat = Date.now()
          return
        }
        const now = Date.now()
        const silentMs = now - lastHeartbeat
        if (silentMs > 45000) {
          pushDiag('socket:silent_timeout', { silentMs })
          console.warn(`[Socket] 静默断连 ${silentMs}ms, 主动 reconnect`)
          socket.value.disconnect()
          socket.value.connect()
          lastHeartbeat = now
        }
      }, 15000)
      // 在 connect 时刷新心跳
      socket.value.on('connect', () => { lastHeartbeat = Date.now() })

      // Room Events
      socket.value.on('room:user-joined', async (data) => {
        console.log('User joined:', data)
        requestRefreshState('socket:room:user-joined')
      })

      socket.value.on('room:user-left', async (data) => {
        console.log('User left:', data)
        requestRefreshState('socket:room:user-left')
      })

      socket.value.on('room:error', (data) => {
        console.error('Room error:', data)
        error.value = data.message
      })

      socket.value.on('room:dismissed', async (payload) => {
        console.warn('Room dismissed:', payload)
        pushDiag('socket:room:dismissed', payload || {})
        roomDismissedReason.value = payload?.reason || 'owner_left'
        error.value = payload?.message || 'Room dismissed by host'
        await refreshState('socket:room:dismissed')
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
        requestRefreshState('socket:room:owner-reconnected')
      })

      // Game Events
      socket.value.on('game:state-changed', async (data) => {
        console.log('Game state update:', data)
        pushDiag('socket:game:state-changed', {
          keys: data ? Object.keys(data) : [],
          gameId: data?.gameId || gId
        })
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('mahjong-realtime-state', { detail: data }))
        }
        requestRefreshState('socket:game:state-changed')
      })

      // Listen for server's broadcastGameState events (different name from action-triggered events)
      socket.value.on('gameStateUpdate', async (data) => {
        console.log('GameStateUpdate from server:', data)
        pushDiag('socket:gameStateUpdate', {
          keys: data ? Object.keys(data) : [],
          gameId: data?.gameId || gId
        })
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('mahjong-realtime-state', { detail: data }))
        }
        // REVEAL/ENDED 阶段：WebSocket 直接合并到 gameState
        // 避免等 HTTP poll 延迟导致亮牌/结算不显示
        if (data?.phase === 'reveal' || data?.phase === 'ended') {
          if (gameState.value) {
            gameState.value = { ...gameState.value, ...data }
          }
        }
        requestRefreshState('socket:gameStateUpdate')
      })

      socket.value.on('game:action-received', async (data) => {
        console.log('Action received:', data)
        requestRefreshState('socket:game:action-received')
      })

      // 牌局快讯广播
      socket.value.on('broadcastMessage', (data: { id: number; text: string; type: string; timestamp: number; timeLabel: string; actionKind?: string }) => {
        if (data.id && seenBroadcastIds.has(data.id)) { console.log('[BC-DIAG] WS BLOCK:', data.id, data.text?.slice(0,20)); return }
        if (data.id) seenBroadcastIds.add(data.id)
        console.log('📢 广播消息:', data)
        window.dispatchEvent(new CustomEvent('mahjong-broadcast', { detail: data }))
      })

      socket.value.on('diceRoll', (data: { dice1: number; dice2: number; dice3?: number; dice4?: number; timestamp: number }) => {
        console.log('🎲 骰子广播:', data)
        window.dispatchEvent(new CustomEvent('mahjong-dice-roll', { detail: data }))
      })

      // 造反亮手牌事件
      socket.value.on('rebel', (data: { playerId: string; playerName: string; hand: any[]; rebelEndTime: number }) => {
        console.log('⚔️ 造反事件:', data.playerName, data.rebelEndTime)
        rebelEvent.value = data
        // rebelEndTime 后自动清除
        const remaining = data.rebelEndTime - Date.now()
        if (remaining > 0) {
          setTimeout(() => { rebelEvent.value = null }, remaining + 100)
        }
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
      pushDiag('connect:error', { gId, pId, message: e?.message || String(e) })
      error.value = e.message || 'Failed to connect'
    }
  }

  const disconnect = () => {
    pushDiag('disconnect:begin', { gameId: gameId.value, playerId: playerId.value })
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

  const refreshState = async (source = 'manual') => {
    if (!gameId.value || !playerId.value) return
    const now = Date.now()
    if (isRefreshing) {
      refreshQueued = true
      pushDiag('refresh:queued:busy', { source, gameId: gameId.value, playerId: playerId.value })
      return
    }
    if (now - lastRefreshAt < DEBOUNCE_MS) {
      refreshQueued = true
      pushDiag('refresh:queued:debounced', {
        source,
        deltaMs: now - lastRefreshAt,
        debounceMs: DEBOUNCE_MS
      })
      setTimeout(() => {
        if (refreshQueued) {
          refreshQueued = false
          void refreshState(`${source}:debounced-retry`)
        }
      }, DEBOUNCE_MS)
      return
    }
    isRefreshing = true
    lastRefreshAt = now
    pushDiag('refresh:start', { source, gameId: gameId.value, playerId: playerId.value })
    try {
      await fetchGameState(gameId.value, playerId.value)
    } catch (e) {
      // 静默处理刷新错误，不触发 re-render
      pushDiag('refresh:error', { source, message: (e as any)?.message || String(e) })
      console.warn('refreshState failed:', e)
    } finally {
      isRefreshing = false
      pushDiag('refresh:done', {
        source,
        queued: refreshQueued,
        msSinceFetchSuccess: lastFetchSucceededAt ? Date.now() - lastFetchSucceededAt : null
      })
      if (refreshQueued) {
        refreshQueued = false
        lastRefreshAt = 0
        await refreshState(`${source}:queued-followup`)
      }
    }
  }

  const updateState = (data: any) => {
    const oldGame = gameState.value
    const oldSummary = oldGame
      ? `${oldGame.phase}|${oldGame.currentPlayerIndex}|${oldGame.pendingActions?.length || 0}|${oldGame.updatedAt || ''}`
      : 'none'
    const newGame = data.game
    const newSummary = newGame
      ? `${newGame.phase}|${newGame.currentPlayerIndex}|${newGame.pendingActions?.length || 0}|${newGame.updatedAt || ''}`
      : 'none'
    gameState.value = data.game
    playerView.value = data.playerView
    if (data.tingPreview !== undefined) { tingPreview.value = data.tingPreview }
    // 从HTTP API兜底广播消息（仅取最新3条，避免反复重放旧消息）
    // 从HTTP API兜底广播消息（用 Set 追踪已显示ID，绝不重复）
    if (data.broadcastMessages && Array.isArray(data.broadcastMessages)) {
      const msgs = data.broadcastMessages.slice(-3);
      for (const msg of msgs) {
        if (msg.id && seenBroadcastIds.has(msg.id)) { console.log('[BC-DIAG] HTTP DUPLICATE blocked:', msg.id, msg.text?.slice(0,20)); continue; }
        if (msg.id) seenBroadcastIds.add(msg.id);
        console.log('[BC-DIAG] HTTP dispatch:', msg.id, msg.text?.slice(0,20));
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('mahjong-broadcast', { detail: msg }))
        }
      }
    }
    // 只在availableActions实际变化时才更新lastStateChangeAt
    const oldActions = availableActions.value
    const newActions = data.availableActions || []
    availableActions.value = newActions
    if (JSON.stringify(oldActions.sort()) !== JSON.stringify(newActions.sort())) {
      lastStateChangeAt.value = Date.now()
    }
    if (oldSummary !== newSummary || lastStateSummary !== newSummary) {
      lastStateSummary = newSummary
      pushDiag('state:update', {
        from: oldSummary,
        to: newSummary,
        currentPlayerName: newGame?.players?.[newGame?.currentPlayerIndex || 0]?.name,
        availableActions: newActions.join(',')
      })
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
      // 优先走 WebSocket（绕过 vicp.fun 代理延迟）
      const s = socket.value
      if (s?.connected) {
        const result = await new Promise<any>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('WS action timeout')), 15000)
          s.once('game:action-response', (resp: any) => {
            clearTimeout(timeout)
            resolve(resp)
          })
          s.emit('game:action', {
            gameId: gameId.value,
            playerId: playerId.value,
            type: action,
            tileId,
            tileIds,
            winOptionLabel
          })
        })
        if (result?.success) {
          updateState(result.data)
          return true
        } else {
          console.error('WS action failed:', result?.error)
          return false
        }
      }

      // fallback: HTTP POST
      const response = await $fetch('/mahjong/api/game/action', {
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
      const response = await $fetch('/mahjong/api/game/start', {
        method: 'POST',
        body: {
          gameId: gameId.value,
          playerId: playerId.value,
          hesitationWindow: options?.hesitationWindow ?? 5000,
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

  // ═══ 新开局流程 API ═══

  const beginGame = async (options?: { hesitationWindow?: number }) => {
    if (!gameId.value || !playerId.value) return
    console.log('[beginGame] Starting:', gameId.value)
    try {
      const response = await $fetch('/mahjong/api/game/begin', {
        method: 'POST',
        body: {
          gameId: gameId.value,
          playerId: playerId.value,
          hesitationWindow: options?.hesitationWindow ?? 5000,
        }
      })
      if ((response as any)?.success) {
        roomDismissedReason.value = null
        // Don't block overlay - refreshState runs in background
        refreshState()
        socket.value?.emit('game:state-update', { gameId: gameId.value })
        console.log('[beginGame] Done, phase:', gameState.value?.phase)
      }
      return response
    } catch (e) {
      console.error('[beginGame] Failed:', e)
      throw e
    }
  }

  const rollSecondDice = async () => {
    if (!gameId.value || !playerId.value) return
    console.log('[rollSecondDice] Rolling:', gameId.value)
    try {
      const response = await $fetch('/mahjong/api/game/roll-dice', {
        method: 'POST',
        body: {
          gameId: gameId.value,
          playerId: playerId.value,
        }
      })
      if ((response as any)?.success) {
        refreshState()
        socket.value?.emit('game:state-update', { gameId: gameId.value })
        console.log('[rollSecondDice] Done')
      }
      return response
    } catch (e) {
      console.error('[rollSecondDice] Failed:', e)
      throw e
    }
  }

  const rollFirstDice = async () => {
    if (!gameId.value || !playerId.value) return
    console.log('[rollFirstDice] Rolling:', gameId.value)
    try {
      const response = await $fetch('/mahjong/api/game/roll-first-dice', {
        method: 'POST',
        body: {
          gameId: gameId.value,
          playerId: playerId.value,
        }
      })
      if ((response as any)?.success) {
        refreshState()
        socket.value?.emit('game:state-update', { gameId: gameId.value })
        console.log('[rollFirstDice] Done')
      }
      return response
    } catch (e) {
      console.error('[rollFirstDice] Failed:', e)
      throw e
    }
  }

  const dealGame = async () => {
    if (!gameId.value || !playerId.value) return
    console.log('[dealGame] Dealing:', gameId.value)
    try {
      const response = await $fetch('/mahjong/api/game/deal', {
        method: 'POST',
        body: {
          gameId: gameId.value,
          playerId: playerId.value,
        }
      })
      if ((response as any)?.success) {
        roomDismissedReason.value = null
        refreshState()
        socket.value?.emit('game:state-update', { gameId: gameId.value })
        console.log('[dealGame] Done, phase:', gameState.value?.phase)
      }
      return response
    } catch (e) {
      console.error('[dealGame] Failed:', e)
      throw e
    }
  }

  // 强制刷新（绕过debounce），用于关键操作后（如startGame）
  const forceRefreshState = async () => {
    if (!gameId.value || !playerId.value) return
    lastRefreshAt = 0 // 重置debounce
    isRefreshing = false
    await refreshState()
    // 🔧 forceRefresh后也发出phase-check事件
    if (gameState.value?.phase && gameState.value.phase !== 'starting' && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mahjong-phase-check', { detail: { phase: gameState.value.phase } }))
    }
  }

  // 请求听牌提示：带 tingPreview=true 参数刷新 state，后端才执行听牌计算
  const refreshTingPreview = async () => {
    if (!gameId.value || !playerId.value) return
    try {
      const response = await $fetch('/mahjong/api/game/state', {
        query: {
          gameId: gameId.value,
          playerId: playerId.value,
          tingPreview: 'true',
          debugAccessToken: typeof route.query.debugAccessToken === 'string' ? route.query.debugAccessToken : undefined
        },
        cache: 'no-cache'
      })
      if ((response as any)?.success) {
        updateState((response as any).data)
      }
    } catch (e: any) {
      console.warn('refreshTingPreview failed:', e?.message || e)
    }
  }

  return {
    gameState,
    currentRound,
    currentPlayer,
    tingPreview,
    availableActions,
    isConnected,
    isReconnecting,
    reconnectAttempt,
    error,
    connect,
    disconnect,
    executeAction,
    startGame,
    beginGame,
    rollFirstDice,
    rollSecondDice,
    dealGame,
    refreshState,
    forceRefreshState,
    refreshTingPreview,
    replacePendingAction,
    isActionPending,
    roomDismissedReason,
    lastStateChangeAt,
    rebelEvent,
    leadingBrotherEvent,
    actionApprovalEvent
  }
}
