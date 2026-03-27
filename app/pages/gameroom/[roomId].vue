<template>
  <div class="mahjong-page" :class="{ 'mobile-portrait': shouldRotateView }">
    <div class="room-viewport" :class="{ 'room-viewport--rotated': shouldRotateView }">
      <div class="room-container" :class="{ 'room-container--rotated': shouldRotateView }">
      <header class="room-header">
        <div class="room-info">
          <h1 class="mahjong-title">长清阁麻将</h1>
          <p class="mahjong-subtitle">
            房间 #{{ roomId }}
          </p>
        </div>

        <button class="mahjong-button small" @click="backToLobby">
          返回大厅
        </button>
      </header>

      <main class="room-main">
        <div v-if="isOverlayVisible" class="game-over-overlay">
          <div class="game-over-card">
            <p class="overlay-title">{{ overlayTitle }}</p>
            <p class="overlay-message">{{ overlayMessage }}</p>
            <ul v-if="playerResults.length" class="overlay-results">
              <li v-for="player in playerResults" :key="player.id" class="overlay-result-item">
                <div>
                  <span class="result-rank" :class="{ 'rank-winner': player.isWinner }">{{ player.rankLabel }}</span>
                  <span class="result-name">{{ player.name }}</span>
                </div>
                <div class="result-meta">
                  <span class="result-score" :class="player.scoreClass">{{ player.scoreLabel }}</span>
                  <span class="result-status">{{ player.statusLabel }}</span>
                  <span v-if="player.winRoundLabel" class="result-round">{{ player.winRoundLabel }}</span>
                </div>
              </li>
            </ul>
            <p v-else class="overlay-empty">游戏结果将在服务端结算后显示。</p>
            <button class="mahjong-button primary overlay-button" @click="backToLobby">
              退出到大厅
            </button>
          </div>
        </div>

        <!-- Big responsive table -->
        <div class="table-wrapper">
          <div class="mahjong-table">
            <!-- 绿色桌布内层 -->
            <div class="table-felt">
            <!-- 左上角: 轮次信息 -->
            <div class="round-info" v-if="gameState?.phase === 'playing'">
              第 {{ currentRound || 1 }} 局
            </div>
            <!-- 状态消息（非中心显示） -->
            <div class="turn-indicator">
              <span v-if="isWinner" class="turn-win">🎉 你赢了！</span>
              <span v-else-if="showMobileActionNotice" class="turn-action">有可用操作</span>
              <span v-else>{{ turnMessage }}</span>
            </div>
            <!-- 桌面中心: 弃牌池 + 牌墙 + 倍数 -->
            <TableCenter
              :remaining-tiles="remainingTileCount"
              :status-message="showMobileActionNotice ? '有可用操作 — 请向下滚动查看按钮' : turnMessage"
              hint-message="点击选牌，再次点击出牌。操作按钮将根据规则自动显示。"
              :is-winner="isWinner"
              :round-multiplier="roundMultiplier"
              :global-multiplier="globalMultiplier"
              :wild-tile="wildTile"
            />

            <!-- 操作按钮：永远显示在桌面中央（playing阶段） -->
            <div class="center-actions" v-if="gameState?.phase === 'playing' && availableActions.length">
              <CircularActionButtons
                :available-actions="availableActions"
                :is-connected="isConnected"
                :is-interaction-locked="isInteractionLocked"
                :last-state-change-at="lastStateChangeAt"
                :now-ts="nowTs"
                :highlight-delay-ms="ACTION_HIGHLIGHT_DELAY_MS"
                @action="handleCircularAction"
              />
            </div>

            <!-- Top player -->
            <div class="seat seat-top" :class="{ 'seat-active': activePosition !== null && topPlayer?.position === activePosition }">
              <PlayerOtherArea
                :name="topPlayer?.name || '北家'"
                position="top"
                :hand="northHand"
                :melds="northMelds"
                :discards="northDiscards"
                :is-winner="northIsWinner"
                :reveal-hand="shouldRevealOpponents"
              />
            </div>

            <!-- Left player -->
            <div class="seat seat-left" :class="{ 'seat-active': activePosition !== null && leftPlayer?.position === activePosition }">
              <PlayerOtherArea
                :name="leftPlayer?.name || '西家'"
                position="left"
                :hand="westHand"
                :melds="westMelds"
                :discards="westDiscards"
                :is-winner="westIsWinner"
                :reveal-hand="shouldRevealOpponents"
              />
            </div>

            <!-- Right player -->
            <div class="seat seat-right" :class="{ 'seat-active': activePosition !== null && rightPlayer?.position === activePosition }">
              <PlayerOtherArea
                :name="rightPlayer?.name || '东家'"
                position="right"
                :hand="eastHand"
                :melds="eastMelds"
                :discards="eastDiscards"
                :is-winner="eastIsWinner"
                :claimable-discard-tile-id="claimableDiscardTileId"
                :reveal-hand="shouldRevealOpponents"
              />
            </div>

            <!-- Bottom (self) player -->
            <div class="seat seat-bottom" :class="{ 'seat-active': activePosition !== null && currentPlayer?.position === activePosition }">
              <div class="self-area-with-actions">
                <PlayerSelfArea
                  name="我"
                  :hand="playerHand"
                  :melds="playerMelds"
                  :discards="playerDiscards"
                  :selected-tile-id="selectedTileId"
                  :is-winner="isWinner"

                  @tileClick="handleTileClick"
                />
                <!-- 动作按钮放在手牌右侧 -->
                <div class="inline-action-buttons" v-if="isConnected && !isInteractionLocked">
                  <div v-if="actionWindowText" class="inline-action-timer">{{ actionWindowText }}</div>
                  <button
                    v-if="showDraw"
                    class="inline-action-btn inline-action-btn--draw"
                    :disabled="isInteractionLocked"
                    @click="onDraw"
                  >摸牌</button>
                  <button
                    v-if="showChow"
                    class="inline-action-btn inline-action-btn--chow"
                    :disabled="isInteractionLocked"
                    @click="onChow"
                  >吃</button>
                  <button
                    v-if="showPeng"
                    class="inline-action-btn inline-action-btn--peng"
                    :disabled="isInteractionLocked"
                    @click="onPeng"
                  >碰</button>
                  <button
                    v-if="showKong || showConcealedKong || showExtendedKong"
                    class="inline-action-btn inline-action-btn--kong"
                    :disabled="isInteractionLocked"
                    @click="handleCircularAction('kong')"
                  >杠</button>
                  <button
                    v-if="showHu"
                    class="inline-action-btn inline-action-btn--hu"
                    :disabled="isInteractionLocked"
                    @click="onHu"
                  >胡</button>
                  <button
                    v-if="showPass && hasPriorityActions"
                    class="inline-action-btn inline-action-btn--pass"
                    :disabled="isInteractionLocked"
                    @click="onPass"
                  >过</button>
                  <button
                    v-if="showRebel"
                    class="inline-action-btn inline-action-btn--rebel"
                    :disabled="isInteractionLocked"
                    @click="onRebel"
                  >🚨造反</button>
                  <div v-if="!showDraw && !showChow && !showPeng && !showKong && !showHu && !showPass && !showConcealedKong && !showExtendedKong && !showRebel" class="inline-action-waiting">
                    等待中…
                  </div>
                </div>
                <div v-else-if="!isConnected" class="inline-action-buttons">
                  <div class="inline-action-waiting">连接中...</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 扩展信息区（右侧，高度=牌桌，宽度≈牌桌1/4） -->
        <aside class="extended-info-panel">
          <!-- 战绩统计 -->
          <RoomStats
            :players="statsPlayers"
            :current-round="currentRound"
            :spectating-id="spectatingId"
            @spectate="handleSpectate"
          />

          <!-- 功能菜单：紧贴战绩榜下方 -->
          <div class="ext-section ext-section--actions" v-if="gameState?.phase === 'playing' && availableActions.length">
            <h3 class="ext-title">操作</h3>
            <CircularActionButtons
              :available-actions="availableActions"
              :is-connected="isConnected"
              :is-interaction-locked="isInteractionLocked"
              :last-state-change-at="lastStateChangeAt"
              :now-ts="nowTs"
              :highlight-delay-ms="ACTION_HIGHLIGHT_DELAY_MS"
              @action="handleCircularAction"
            />
          </div>

          <!-- 房间控制 / 管理面板 -->
          <div class="ext-section" v-if="canStartGame">
            <h3 class="ext-title">房间控制</h3>
            <button class="mahjong-button panel-button" @click="onStartGame" :disabled="isInteractionLocked">
              🎲 掷骰子开局 ({{ gameState?.players.length }}/4)
            </button>
          </div>

          <div class="ext-section" v-if="isAdminUser">
            <h3 class="ext-title">调试</h3>
            <p class="ext-meta">阶段: {{ gameState?.phase }} · {{ gameState?.players.length }}人</p>
            <div v-if="gameState?.phase === 'waiting' && (gameState?.players.length || 0) < 4" style="margin-bottom:6px">
              <button class="mahjong-button panel-button small" @click="setupTestGame" :disabled="isInteractionLocked">
                添加机器人 → 掷骰子
              </button>
            </div>
            <button class="mahjong-button panel-button small" @click="refreshState" :disabled="isInteractionLocked">刷新</button>
            <button class="mahjong-button panel-button small" @click="toggleShowAllCards" :disabled="isInteractionLocked">
              {{ shouldRevealOpponents ? '隐藏手牌' : '显示手牌' }}
            </button>
            <div v-if="gameState?.phase === 'playing'" style="margin-top:8px">
              <p class="ext-meta" v-for="p in otherPlayers" :key="p.id">
                {{ p.name }}
                <button class="mahjong-button panel-button small" style="display:inline;padding:2px 8px;font-size:0.7rem;margin-left:4px"
                  @click="forceDiscard(p)"
                  :disabled="isInteractionLocked || gameState?.currentPlayerIndex !== p.position">
                  出牌
                </button>
              </p>
            </div>
          </div>

          <div class="ext-section" v-if="isAdminUser && canCheatHu">
            <button class="mahjong-button panel-button" @click="onCheatHu" :disabled="isInteractionLocked">
              测试胡牌
            </button>
          </div>
        </aside>
      </main>

      <!-- 圆形操作按钮已移至手牌右侧（inline-action-buttons），此浮层保留为移动端备用 -->
      <CircularActionButtons
        v-if="shouldRotateView"
        :available-actions="availableActions"
        :is-connected="isConnected"
        :is-interaction-locked="isInteractionLocked"
        :last-state-change-at="lastStateChangeAt"
        :now-ts="nowTs"
        :highlight-delay-ms="ACTION_HIGHLIGHT_DELAY_MS"
        @action="handleCircularAction"
      />

      <!-- 骰子投掷动画（Teleport到body避免被父级裁剪） -->
      <Teleport to="body">
        <DiceAnimation
          v-if="showDiceOverlay"
          :dice1="diceValues[0]"
          :dice2="diceValues[1]"
          :dealer-name="dealerName"
          @deal="onDealTiles"
        />
      </Teleport>
      </div>
      <!-- 绿色桌布内层结束 -->
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import PlayerSelfArea from '~/components/PlayerSelfArea.vue'
import PlayerOtherArea from '~/components/PlayerOtherArea.vue'
import CircularActionButtons from '~/components/CircularActionButtons.vue'
import TableCenter from '~/components/TableCenter.vue'
import DiceAnimation from '~/components/DiceAnimation.vue'
import PlayerInfo from '~/components/PlayerInfo.vue'
import RoomStats from '~/components/RoomStats.vue'
import { useGame, ACTION_HIGHLIGHT_DELAY_MS } from '~/composables/useGame'
import { ActionType, GamePhase, GameEndReason, type Tile, type Meld, type Player } from '~/types/game'

const route = useRoute()
const roomId = computed(() => String(route.params.roomId || ''))
const playerId = computed(() => String(route.query.playerId || ''))

const { 
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
  roomDismissedReason,
  lastStateChangeAt
} = useGame()

const backToLobby = () => navigateTo('/')
const isAdmin = useCookie('is_admin')
const isAdminUser = computed(() => isAdmin.value === 'true' || isAdmin.value === true)
const showAllCards = ref(false)
const shouldRevealOpponents = computed(() => isAdminUser.value && showAllCards.value)
const isMobilePortrait = ref(false)
const shouldRotateView = computed(() => isMobilePortrait.value)
const nowTs = ref(Date.now())
let actionWindowTimer: ReturnType<typeof setInterval> | null = null

// 骰子动画状态
const showDiceOverlay = ref(false)
const diceValues = ref<[number, number]>([1, 1])
const dealerName = computed(() => {
  if (!gameState.value) return ''
  const dealer = gameState.value.players.find(p => p.isDealer)
  return dealer?.name || '庄家'
})

watch(isAdminUser, (next) => {
  if (!next && showAllCards.value) {
    showAllCards.value = false
  }
})

const evaluateViewport = () => {
  if (!process.client) {
    return
  }

  const { innerWidth: width, innerHeight: height } = window
  const smallestSide = Math.min(width, height)
  const isPortrait = height >= width
  isMobilePortrait.value = isPortrait && smallestSide <= 768
}

const toggleShowAllCards = () => {
  if (!isAdminUser.value) return
  showAllCards.value = !showAllCards.value
}

onMounted(() => {
  if (roomId.value && playerId.value) {
    connect(roomId.value, playerId.value)
  }

  if (process.client) {
    evaluateViewport()
    window.addEventListener('resize', evaluateViewport)
    window.addEventListener('orientationchange', evaluateViewport)
    actionWindowTimer = setInterval(() => {
      nowTs.value = Date.now()
    }, 250)
  }
})

onUnmounted(() => {
  disconnect()

  if (process.client) {
    window.removeEventListener('resize', evaluateViewport)
    window.removeEventListener('orientationchange', evaluateViewport)
    if (actionWindowTimer) {
      clearInterval(actionWindowTimer)
      actionWindowTimer = null
    }
  }
})

// ---- Computed Players ----
const getPlayerByRelativePos = (offset: number) => {
  if (!gameState.value || !currentPlayer.value) return null
  const selfPos = currentPlayer.value.position
  const targetPos = (selfPos + offset) % 4
  return gameState.value.players.find(p => p.position === targetPos)
}

const rightPlayer = computed(() => getPlayerByRelativePos(1))
const topPlayer = computed(() => getPlayerByRelativePos(2))
const leftPlayer = computed(() => getPlayerByRelativePos(3))

// ---- Self State ----
const playerHand = computed(() => currentPlayer.value?.hand.concealedTiles || [])
const playerMelds = computed(() => currentPlayer.value?.hand.exposedMelds || [])
const playerDiscards = computed(() => currentPlayer.value?.hand.discardedTiles || [])
const isWinner = computed(() => currentPlayer.value?.status === 'won')



// ---- Table Center Data ----
const allDiscards = computed(() => {
  if (!gameState.value) return []
  const all: any[] = []
  for (const p of gameState.value.players) {
    all.push(...(p.hand.discardedTiles || []))
  }
  return all
})
const remainingTileCount = computed(() => gameState.value?.wallRemaining ?? 0)
const currentRound = computed(() => gameState.value?.currentRound ?? 1)
const roundMultiplier = computed(() => gameState.value?.roundMultiplier ?? 1)
const globalMultiplier = computed(() => gameState.value?.globalMultiplier ?? 1)
const wildTile = computed(() => {
  const w = gameState.value?.wildTile
  if (!w) return null
  return { suit: w.suit, value: w.value, id: 'center-wild', isWild: true, isFlower: false } as any
})

// ---- Room Stats ----
const spectatingId = ref<string | null>(null)
const positionColors = ['east', 'south', 'west', 'north']
const botAvatars = ['😎', '🤖', '🧠']

const statsPlayers = computed(() => {
  if (!gameState.value) return []
  return gameState.value.players.map((p, i) => ({
    id: p.id,
    name: p.name,
    score: p.score || 0,
    wins: p.status === 'won' ? 1 : 0,
    losses: p.status === 'lost' ? 1 : 0,
    color: positionColors[p.position] || 'south',
    isMe: p.id === currentPlayer.value?.id,
    // 累积/上局数据（暂无历史接口，先用占位）
    totalWins: p.status === 'won' ? 1 : 0,
    totalLosses: p.status === 'lost' ? 1 : 0,
    lastRoundStatus: null as 'won' | 'lost' | 'none' | null,
  }))
})

const handleSpectate = (id: string) => {
  spectatingId.value = spectatingId.value === id ? null : id
}
const isDealer = computed(() => currentPlayer.value?.isDealer)
const isGameEnded = computed(() => gameState.value?.phase === GamePhase.ENDED)
const overlayReason = computed(() => roomDismissedReason.value || gameState.value?.endReason || null)
const isOverlayVisible = computed(() => isGameEnded.value || !!roomDismissedReason.value)
const overlayTitle = computed(() => {
  if (roomDismissedReason.value === GameEndReason.OWNER_LEFT) {
    return '房间已关闭'
  }
  return '游戏结束'
})
const overlayMessage = computed(() => {
  const reason = overlayReason.value
  switch (reason) {
    case GameEndReason.WALL_EXHAUSTED:
      return '牌墙已空，无法继续摸牌。'
    case GameEndReason.LAST_PLAYER:
      return '只剩一名玩家，本轮结束。'
    case GameEndReason.OWNER_LEFT:
      return '房主已离开房间，游戏已解散。'
    case GameEndReason.EMPTY_ROOM:
      return '所有玩家已离开，游戏结束。'
    default:
      return '本轮已结束，请退出到大厅。'
  }
})
const isInteractionLocked = computed(() => isOverlayVisible.value)

const formatOrdinal = (value: number | null | undefined) => {
  if (!value) return null
  return `第${value}名`
}

const formatScore = (value: number | null | undefined) => {
  if (value === null || value === undefined) return '--'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value}`
}

const getScoreClass = (value: number | null | undefined) => {
  if (value === null || value === undefined) return 'score-neutral'
  if (value > 0) return 'score-positive'
  if (value < 0) return 'score-negative'
  return 'score-neutral'
}

const playerResults = computed(() => {
  if (!gameState.value) return []

  return [...gameState.value.players]
    .map((player) => {
      const isWinner = player.status === 'won'
      const finalScore = player.score ?? gameState.value?.finalScores?.[player.id] ?? null
      return {
        id: player.id,
        name: player.name,
        isWinner,
        winOrder: player.winOrder,
        rankLabel: isWinner && player.winOrder ? formatOrdinal(player.winOrder) : '未胡牌',
        statusLabel: isWinner ? '赢家' : player.status === 'lost' ? '输了' : '未胡牌',
        winRoundLabel: isWinner && player.winRound ? `第${player.winRound}轮` : null,
        scoreLabel: formatScore(finalScore),
        scoreClass: getScoreClass(finalScore)
      }
    })
    .sort((a, b) => {
      if (a.isWinner && !b.isWinner) return -1
      if (!a.isWinner && b.isWinner) return 1
      if (a.isWinner && b.isWinner) {
        const orderA = a.winOrder ?? Number.MAX_SAFE_INTEGER
        const orderB = b.winOrder ?? Number.MAX_SAFE_INTEGER
        return orderA - orderB
      }
      return a.name.localeCompare(b.name)
    })
})
const canStartGame = computed(() => {
  // Debug log to see why button might not show
  console.log('canStartGame check:', {
    isDealer: isDealer.value,
    phase: gameState.value?.phase,
    playerCount: gameState.value?.players.length
  })
  
  return isDealer.value && 
         gameState.value?.phase === 'waiting' && 
         (gameState.value?.players.length || 0) >= 2
})

// ---- Other Players State ----
const northHand = computed(() => topPlayer.value?.hand.concealedTiles || []) // Will be empty/hidden by backend usually
const northMelds = computed(() => topPlayer.value?.hand.exposedMelds || [])
const northDiscards = computed(() => topPlayer.value?.hand.discardedTiles || [])
const northIsWinner = computed(() => topPlayer.value?.status === 'won')

const activePosition = computed(() => gameState.value?.currentPlayerIndex ?? null)
const currentTurnPlayer = computed(() => {
  if (!gameState.value || activePosition.value === null) return null
  return gameState.value.players[activePosition.value] || null
})

const turnMessage = computed(() => {
  if (!gameState.value) {
    return '正在加载房间…'
  }

  const phase = gameState.value.phase
  // 如果牌已发（有人有手牌），即使 phase 还没更新也按 playing 处理
  const hasDealtCards = (gameState.value.players || []).some(
    (p: any) => (p.hand?.concealedTiles?.length || 0) > 0
  )

  if (phase === 'waiting' && !hasDealtCards) {
    return '等待玩家加入开始'
  }

  if (phase === 'waiting' && hasDealtCards) {
    return '准备发牌…'
  }

  const player = currentTurnPlayer.value
  if (player) {
    if (player.id === currentPlayer.value?.id) {
      return '轮到你了'
    }
    return `${player.name} 的回合`
  }

  return '等待其他玩家出牌'
})

const westHand = computed(() => leftPlayer.value?.hand.concealedTiles || [])
const westMelds = computed(() => leftPlayer.value?.hand.exposedMelds || [])
const westDiscards = computed(() => leftPlayer.value?.hand.discardedTiles || [])
const westIsWinner = computed(() => leftPlayer.value?.status === 'won')

const eastHand = computed(() => rightPlayer.value?.hand.concealedTiles || [])
const eastMelds = computed(() => rightPlayer.value?.hand.exposedMelds || [])
const eastDiscards = computed(() => rightPlayer.value?.hand.discardedTiles || [])
const eastIsWinner = computed(() => rightPlayer.value?.status === 'won')

// ---- Interaction ----
const selectedTileId = ref<string | null>(null)
const claimableDiscardTileId = ref<string | null>(null)

const handleTileClick = (tile: Tile) => {
  if (isWinner.value || isInteractionLocked.value) return
  
  // If it's our turn and we can discard
  const canDiscard = availableActions.value.includes(ActionType.DISCARD)
  
  if (selectedTileId.value === tile.id) {
    if (canDiscard) {
      executeAction(ActionType.DISCARD, tile.id)
      selectedTileId.value = null
    }
  } else {
    selectedTileId.value = tile.id
  }
}

// ---- Claims ----
// Check if we have pending actions that require user input (like Pung/Kong/Hu)
// The backend sends availableActions. If we have PENG/KONG/HU, we show buttons.
// For PENG/KONG, we might need to select tiles if there are multiple options, 
// but usually PENG is unique for a given discard. KONG might be unique too.
// The backend `executeAction` for PENG doesn't require tileId if it's obvious, 
// but `gameManager.ts` implementation of `handlePeng` finds matching tiles automatically.

const showDraw = computed(() => availableActions.value.includes(ActionType.DRAW))
const showChow = computed(() => availableActions.value.includes(ActionType.CHOW))
const showPeng = computed(() => availableActions.value.includes(ActionType.PENG))
const showKong = computed(() => availableActions.value.includes(ActionType.KONG))
const showHu = computed(() => availableActions.value.includes(ActionType.HU))
const showPass = computed(() => availableActions.value.includes(ActionType.PASS))
const showRebel = computed(() => availableActions.value.includes(ActionType.REBEL))
const isMyTurn = computed(() => currentTurnPlayer.value?.id === currentPlayer.value?.id)
const canCheatHu = computed(
  () => isAdminUser.value && isMyTurn.value && gameState.value?.phase === GamePhase.PLAYING
)

const onDraw = () => executeAction(ActionType.DRAW)
const onChow = () => executeAction(ActionType.CHOW)
const onPeng = () => executeAction(ActionType.PENG)
const onKong = () => executeAction(ActionType.KONG)
const onHu = () => executeAction(ActionType.HU)
const onPass = () => executeAction(ActionType.PASS)
const onRebel = () => executeAction(ActionType.REBEL)
const onCheatHu = () => executeAction(ActionType.CHEAT_HU)

// 圆形操作按钮事件处理
const handleCircularAction = (type: string) => {
  switch (type) {
    case 'draw':
      // 摸牌通常由服务端自动触发，这里尝试执行 draw action
      executeAction(ActionType.DRAW)
      break
    case 'chow':
      onChow()
      break
    case 'peng':
      onPeng()
      break
    case 'kong':
      // 杠牌优先级：明杠(弃牌) > 续杠 > 暗杠
      // 明杠是响应式操作（别人出的牌），优先级最高
      // 续杠和暗杠是自摸操作，续杠修改已有的副露，优先级高于暗杠
      if (showKong.value) {
        onKong()
      } else if (showExtendedKong.value) {
        onExtendedKong()
      } else if (showConcealedKong.value) {
        onConcealedKong()
      }
      break
    case 'hu':
      onHu()
      break
    case 'pass':
      onPass()
      break
  }
}

// For self-drawn Kong (Concealed or Extended)
const showConcealedKong = computed(() => availableActions.value.includes(ActionType.CONCEALED_KONG))
const showExtendedKong = computed(() => availableActions.value.includes(ActionType.EXTENDED_KONG))
const hasPriorityActions = computed(
  () =>
    showChow.value ||
    showPeng.value ||
    showKong.value ||
    showHu.value ||
    showConcealedKong.value ||
    showExtendedKong.value
)

const myPendingAction = computed(() => {
  if (!gameState.value || !currentPlayer.value) return null
  return gameState.value.pendingActions.find(pa => pa.playerId === currentPlayer.value!.id) || null
})

const actionWindowText = computed(() => {
  if (!hasPriorityActions.value) return ''
  const pending = myPendingAction.value
  if (!pending?.expiresAt) return '响应窗口：1.0s（超时自动过）'
  const leftMs = Math.max(0, pending.expiresAt - nowTs.value)
  return `响应窗口：${(leftMs / 1000).toFixed(1)}s（超时自动过）`
})

const showMobileActionNotice = computed(() => shouldRotateView.value && hasPriorityActions.value)

const onConcealedKong = () => {
  // We need to know which tiles to kong. 
  // If there's only one set of 4, we can auto-select.
  // For now, let's assume the backend handles it or we need UI for it.
  // The backend `handleConcealedKong` expects `tileIds`.
  // We can find the group of 4 in hand.
  if (!currentPlayer.value) return
  const counts: Record<string, Tile[]> = {}
  for (const t of currentPlayer.value.hand.concealedTiles) {
    const key = `${t.suit}-${t.value}`
    if (!counts[key]) counts[key] = []
    counts[key].push(t)
  }
  
  for (const key in counts) {
    const group = counts[key]
    if (group && group.length === 4) {
      executeAction(ActionType.CONCEALED_KONG, undefined, group.map(t => t.id))
      return // Just do the first one for now
    }
  }
}

const onExtendedKong = () => {
  // Find the tile in hand that matches an exposed triplet
  if (!currentPlayer.value) return
  for (const meld of currentPlayer.value.hand.exposedMelds) {
    if (meld.type === 'triplet' && meld.tiles.length) { // MeldType.TRIPLET
      const baseTile = meld.tiles[0]!
      const match = currentPlayer.value.hand.concealedTiles.find(t => 
        t.suit === baseTile.suit && t.value === baseTile.value
      )
      if (match) {
        executeAction(ActionType.EXTENDED_KONG, match.id)
        return
      }
    }
  }
}

// ---- 开局流程：掷骰子 → 发牌 ----
// 防重复点击标志
let isGameStarting = false

const onStartGame = () => {
  if (isGameStarting) return
  if (gameState.value?.phase === GamePhase.PLAYING) {
    console.warn('[onStartGame] Game already in PLAYING phase, skipping dice overlay')
    return
  }
  console.log('[onStartGame] Showing dice overlay, phase:', gameState.value?.phase)
  diceValues.value = [
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1
  ]
  // 强制先关闭再打开，确保 DiceAnimation 组件重新 mount
  showDiceOverlay.value = false
  nextTick(() => {
    showDiceOverlay.value = true
    console.log('[onStartGame] showDiceOverlay set to true')
  })
}

const onDealTiles = async () => {
  // 防止重复调用：只有当 overlay 可见时才处理
  if (!showDiceOverlay.value || isGameStarting) return
  isGameStarting = true
  showDiceOverlay.value = false
  // 等 DiceAnimation 的 Leave 动画完成（约 300ms）再正式开始
  await new Promise(resolve => setTimeout(resolve, 350))
  console.log('[onDealTiles] Calling startGame API...')
  try {
    await startGame()
    console.log('[onDealTiles] startGame done, refreshing state...')
    await refreshState()
    console.log('[onDealTiles] Done, phase:', gameState.value?.phase)
  } finally {
    isGameStarting = false
  }
}

// ---- Admin / Debug Functions ----
const otherPlayers = computed(() => {
  if (!gameState.value || !currentPlayer.value) return []
  return gameState.value.players.filter(p => p.id !== currentPlayer.value!.id)
})

const setupTestGame = async () => {
  if (!roomId.value) return
  
  // Join 3 bots
  const currentCount = gameState.value?.players.length || 1
  
  for (let i = currentCount + 1; i <= 4; i++) {
    await useFetch('/api/game/join', {
      method: 'POST',
      body: { gameId: roomId.value, playerName: `电脑${i}` }
    })
  }
  
  await refreshState()
  
  // 进入骰子流程
  onStartGame()
}

const forceDiscard = async (p: Player) => {
  if (!roomId.value || !p.hand.concealedTiles.length) {
    console.warn('Cannot force discard: No tiles found for player', p.name)
    return
  }
  
  // Pick first tile
  const firstTile = p.hand.concealedTiles.at(0)
  if (!firstTile) {
    console.warn('Cannot force discard: player has empty hand now', p.name)
    return
  }
  
  await useFetch('/api/game/action', {
    method: 'POST',
    body: {
      gameId: roomId.value,
      playerId: p.id,
      action: ActionType.DISCARD,
      tileId: firstTile.id
    }
  })
  
  await refreshState()
}
</script>

<style scoped>
.mahjong-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at top, #153b2f, #07130e);
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: #f5f5f5;
  padding: 16px;
}

.room-viewport {
  width: 100%;
  display: flex;
  justify-content: center;
}

.room-container--rotated {
  max-width: none;
  display: flex;
  flex-direction: column;
}

.room-container {
  background: rgba(7, 19, 14, 0.92);
  border-radius: 20px;
  padding: 16px 16px 20px;
  max-width: 1400px;
  width: 100%;
  box-shadow: 0 18px 45px rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.room-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.mahjong-title {
  font-size: 1.4rem;
  margin-bottom: 2px;
  letter-spacing: 0.04em;
}

.mahjong-subtitle {
  font-size: 0.9rem;
  opacity: 0.85;
}

/* ===== 主布局：牌桌 + 扩展信息区 ===== */
.room-main {
  display: flex;
  flex-direction: column;
  gap: 12px;
  position: relative;
}

@media (min-width: 900px) {
  .room-main {
    flex-direction: row;
    align-items: stretch;
    gap: 12px;
  }
}

.table-wrapper {
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
}

.mahjong-table {
  position: relative;
  width: min(80vw, 80vh, 900px);
  /* 1:1 正方形，参考图比例 */
  aspect-ratio: 1 / 1;
  border-radius: 20px;
  /* 深木色外框 */
  background: #4a2c0a;
  border: 12px solid #3a2006;
  box-shadow:
    inset 0 0 0 3px rgba(90,60,20,0.5),
    inset 0 0 40px rgba(0,0,0,0.4),
    0 12px 30px rgba(0, 0, 0, 0.8);
  padding: 0;
  overflow: hidden;
}

/* 绿色麻将桌布内层 */
.table-felt {
  position: absolute;
  inset: 0;
  /* 绿色桌布 + 中央聚光 */
  background:
    radial-gradient(ellipse at 50% 50%, rgba(40,90,50,0.95) 0%, rgba(28,65,35,0.98) 45%, rgba(18,42,22,1) 100%);
  border-radius: 8px;
  overflow: hidden;
}

/* 操作按钮：固定在桌面正中央 */
.center-actions {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 20;
}

/* ===== 扩展信息区 ===== */
.extended-info-panel {
  flex: 0 0 280px;
  max-width: 280px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
  max-height: 80vh;
}

/* 桌面端严格 1/4 宽 */
@media (min-width: 1101px) {
  .extended-info-panel {
    /* 牌桌宽度约 75vw (table-wrapper flex), 1/4 ≈ 25vw; 但受 max-width 约束 */
    flex: 0 0 25%;
    max-width: 320px;
  }
}

/* 窄屏降级 */
@media (max-width: 1100px) {
  .extended-info-panel {
    flex: 0 0 240px;
    max-width: 240px;
  }
}

@media (max-width: 900px) {
  .extended-info-panel {
    flex: 0 0 auto;
    max-width: 100%;
    max-height: none;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 8px;
  }
}

.ext-section {
  padding: 8px 10px 10px;
  border-radius: 14px;
  background: rgba(5, 14, 10, 0.9);
}

.ext-section--actions {
  margin-top: -6px;
}

.ext-title {
  font-size: 0.9rem;
  margin-bottom: 6px;
  opacity: 0.9;
  font-weight: 600;
}

.ext-meta {
  font-size: 0.8rem;
  margin-bottom: 4px;
  opacity: 0.85;
}

/* ===== 座位定位 ===== */
.seat {
  position: absolute;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: transform 0.15s ease, filter 0.15s ease;
}

.seat-active {
  filter: drop-shadow(0 0 12px rgba(255, 234, 120, 0.8));
}

/* Counter-rotate names so they read upright despite seat rotation */
.seat-top :deep(.player-other-name) {
  display: inline-block;
  transform: rotate(180deg);
}

.seat-left :deep(.player-other-name) {
  display: inline-block;
  transform: rotate(-90deg);
}

.seat-right :deep(.player-other-name) {
  display: inline-block;
  transform: rotate(-90deg);
}

.seat-top {
  top: 1%;
  left: 50%;
  transform: translateX(-50%) rotate(180deg);
  width: 62%;
}

.seat-bottom {
  bottom: 0.5%;
  left: 50%;
  transform: translateX(-50%);
  width: 62%;
}

.seat-left {
  left: 0.5%;
  top: 50%;
  transform: translateY(-50%) rotate(90deg);
  width: 62%;
}

.seat-right {
  right: 0.5%;
  top: 50%;
  transform: translateY(-50%) rotate(-90deg);
  width: 62%;
}

/* ===== 本家：手牌 + 动作按钮横排 ===== */
.self-area-with-actions {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  width: 100%;
}

/* 内联动作按钮组 — 放在手牌右侧 */
.inline-action-buttons {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex-shrink: 0;
  min-width: 56px;
}

.inline-action-btn {
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.15);
  background: rgba(15, 35, 25, 0.88);
  color: #fff;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  text-align: center;
  transition: all 0.15s ease;
  backdrop-filter: blur(4px);
  box-shadow: 0 2px 6px rgba(0,0,0,0.3);
}

.inline-action-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  filter: brightness(1.15);
}

.inline-action-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.inline-action-btn--draw {
  background: linear-gradient(135deg, #1f8a52, #46c574);
  color: #fff;
  border-color: rgba(70,197,116,0.5);
}

.inline-action-btn--chow {
  background: linear-gradient(135deg, #1565c0, #42a5f5);
  color: #fff;
  border-color: rgba(66,165,245,0.5);
}

.inline-action-btn--peng {
  background: linear-gradient(135deg, #e65100, #ff9800);
  color: #fff;
  border-color: rgba(255,152,0,0.5);
}

.inline-action-btn--kong {
  background: linear-gradient(135deg, #6a1b9a, #ab47bc);
  color: #fff;
  border-color: rgba(171,71,188,0.5);
}

.inline-action-btn--hu {
  background: linear-gradient(135deg, #c62828, #ef5350);
  color: #fff;
  border-color: rgba(239,83,80,0.5);
  font-size: 0.9rem;
  animation: hu-glow 1s infinite;
}

@keyframes hu-glow {
  0%, 100% { box-shadow: 0 0 8px rgba(239,83,80,0.4); }
  50% { box-shadow: 0 0 18px rgba(239,83,80,0.8); }
}

.inline-action-btn--pass {
  background: rgba(60, 60, 60, 0.85);
  color: #fff;
  border-color: rgba(255,255,255,0.1);
  font-size: 0.75rem;
}

.inline-action-btn--rebel {
  background: linear-gradient(135deg, #dc2626, #b91c1c);
  color: #fff;
  border-color: #ffd700;
  animation: heartbeat 1.2s ease-in-out infinite;
}

.inline-action-timer {
  font-size: 0.65rem;
  color: #ffd36a;
  font-weight: 700;
  text-align: center;
  padding: 2px 0;
  white-space: nowrap;
}

.inline-action-waiting {
  font-size: 0.7rem;
  color: rgba(255,255,255,0.5);
  text-align: center;
  padding: 8px 4px;
}

/* ===== 左上角轮次 ===== */
.round-info {
  position: absolute;
  top: 8px;
  left: 12px;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 600;
  z-index: 4;
  background: rgba(0, 0, 0, 0.35);
  padding: 2px 10px;
  border-radius: 999px;
}

/* 状态提示 */
.turn-indicator {
  position: absolute;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.8);
  z-index: 4;
  background: rgba(0, 0, 0, 0.4);
  padding: 3px 14px;
  border-radius: 999px;
  white-space: nowrap;
}

.turn-win {
  color: #ffd700;
  font-weight: 700;
  text-shadow: 0 0 8px rgba(255, 215, 0, 0.5);
}

.turn-action {
  color: #ffd36a;
  font-weight: 700;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

/* ===== 通用按钮 ===== */
.mahjong-button {
  padding: 10px 18px;
  border-radius: 999px;
  border: none;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
  background: linear-gradient(135deg, #1f8a52, #46c574);
  color: #03100a;
  transition: transform 0.12s ease, box-shadow 0.12s ease, filter 0.12s ease;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.35);
  white-space: nowrap;
}

.mahjong-button.small {
  padding: 8px 14px;
  font-size: 0.85rem;
}

.mahjong-button:hover {
  transform: translateY(-1px);
  filter: brightness(1.05);
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.45);
}

.mahjong-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
  transform: none;
}

.panel-button {
  display: block;
  width: 100%;
  text-align: center;
  margin-bottom: 6px;
}

.panel-button.danger {
  background: rgba(123, 26, 26, 0.9);
  color: #ffdada;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.panel-button.danger:hover {
  background: rgba(160, 38, 38, 1);
}

/* ===== 游戏结束浮层 ===== */
.game-over-overlay {
  position: absolute;
  inset: 0;
  background: rgba(3, 10, 8, 0.82);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
  z-index: 10;
}

.game-over-card {
  background: rgba(4, 16, 11, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;
  padding: 32px;
  width: min(360px, 90%);
  text-align: center;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.6);
}

.overlay-title {
  font-size: 1.6rem;
  margin-bottom: 12px;
}

.overlay-message {
  font-size: 1rem;
  opacity: 0.9;
  margin-bottom: 20px;
}

.overlay-button {
  width: 100%;
}

.overlay-results {
  list-style: none;
  padding: 0;
  margin: 0 0 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.overlay-result-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
}

.result-rank {
  font-weight: 600;
  margin-right: 8px;
  color: #d5d5d5;
}

.rank-winner {
  color: #ffe27a;
}

.result-name {
  font-weight: 500;
}

.result-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  text-align: right;
}

.result-score {
  font-weight: 600;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 0.85rem;
  background: rgba(255, 255, 255, 0.1);
}

.score-positive {
  color: #5fffb0;
  background: rgba(95, 255, 176, 0.12);
}

.score-negative {
  color: #ff9d9d;
  background: rgba(255, 157, 157, 0.12);
}

.score-neutral {
  color: #f5f5f5;
}

.result-status {
  font-size: 0.85rem;
  opacity: 0.85;
}

.result-round {
  font-size: 0.8rem;
  color: #9ed3b4;
}

.overlay-empty {
  font-size: 0.9rem;
  opacity: 0.8;
  margin-bottom: 20px;
}

/* ===== 造反按钮 ===== */
@keyframes heartbeat {
  0%, 100% { transform: scale(1); }
  15% { transform: scale(1.08); }
  30% { transform: scale(1); }
  45% { transform: scale(1.05); }
  60% { transform: scale(1); }
}

/* ===== 响应式降级 ===== */
@media (max-width: 768px) {
  .room-container {
    padding: 12px;
  }

  .room-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .mahjong-title {
    font-size: 1.2rem;
  }

  .mahjong-subtitle {
    font-size: 0.8rem;
  }

  .mahjong-table {
    width: 100%;
    border-width: 3px;
    padding: 10px;
  }

  .self-area-with-actions {
    flex-direction: column;
    align-items: center;
    gap: 6px;
  }

  .inline-action-buttons {
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
  }

  .inline-action-btn {
    font-size: 0.75rem;
    padding: 5px 10px;
  }
}

@media (max-width: 600px) {
  .mahjong-table {
    border-width: 2px;
  }

  .mahjong-button {
    font-size: 0.75rem;
    padding: 6px 10px;
  }
}

/* 移动竖屏旋转模式 */
@media (max-width: 768px) and (orientation: portrait) {
  .mobile-portrait {
    min-height: 100vw;
  }

  .room-viewport--rotated {
    width: 100vh;
    height: 100vw;
    align-items: center;
    overflow: hidden;
  }

  .room-container--rotated {
    transform: rotate(90deg);
    transform-origin: center;
    width: min(900px, 90vh);
    max-height: calc(100vw - 24px);
  }

  .room-container--rotated .room-header {
    order: 2;
    margin-top: 12px;
  }

  .room-container--rotated .room-main {
    order: 1;
    flex-direction: column;
  }

  .room-container--rotated .table-wrapper {
    order: 1;
  }

  .room-container--rotated .extended-info-panel {
    order: 2;
    width: 100%;
  }
}
</style>