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

        <div class="header-actions">
          <button
            class="mahjong-button small secondary"
            :class="{ 'sound-off': !soundEnabled }"
            @click="toggleSound"
            :title="soundEnabled ? '🔊 音效开' : '🔇 音效关'"
          >
            {{ soundEnabled ? '🔊' : '🔇' }}
          </button>
          <button class="mahjong-button small secondary" @click="showSettings = true">
            ⚙️ 设置
          </button>
          <button class="mahjong-button small secondary" @click="navigateTo('/rules')">
            📖 规则
          </button>
          <button class="mahjong-button small" @click="backToLobby">
            返回大厅
          </button>
        </div>
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

        <!-- 设置面板 -->
        <Transition name="settings-slide">
          <div v-if="showSettings" class="settings-overlay" @click.self="showSettings = false">
            <div class="settings-panel">
              <div class="settings-header">
                <h2 class="settings-title">⚙️ 游戏设置</h2>
                <button class="settings-close" @click="showSettings = false">✕</button>
              </div>
              <div class="settings-body">
                <!-- 音效开关 -->
                <div class="settings-item">
                  <div class="settings-item-label">
                    <span class="settings-icon">🔊</span>
                    <span>音效</span>
                  </div>
                  <label class="toggle-switch">
                    <input type="checkbox" :checked="soundEnabled" @change="toggleSound" />
                    <span class="toggle-slider"></span>
                  </label>
                </div>
                <!-- 出牌提示 -->
                <div class="settings-item">
                  <div class="settings-item-label">
                    <span class="settings-icon">💡</span>
                    <span>出牌提示</span>
                  </div>
                  <label class="toggle-switch">
                    <input type="checkbox" v-model="showHintEnabled" />
                    <span class="toggle-slider"></span>
                  </label>
                </div>
                <!-- 牌面动画 -->
                <div class="settings-item">
                  <div class="settings-item-label">
                    <span class="settings-icon">✨</span>
                    <span>牌面动画</span>
                  </div>
                  <label class="toggle-switch">
                    <input type="checkbox" v-model="tileAnimationEnabled" />
                    <span class="toggle-slider"></span>
                  </label>
                </div>
                <!-- 操作音效 -->
                <div class="settings-item">
                  <div class="settings-item-label">
                    <span class="settings-icon">🎵</span>
                    <span>操作音效</span>
                  </div>
                  <label class="toggle-switch">
                    <input type="checkbox" v-model="actionSoundEnabled" />
                    <span class="toggle-slider"></span>
                  </label>
                </div>
                <!-- 倒计时警告 -->
                <div class="settings-item">
                  <div class="settings-item-label">
                    <span class="settings-icon">⏱</span>
                    <span>倒计时警告</span>
                  </div>
                  <label class="toggle-switch">
                    <input type="checkbox" v-model="timerWarningEnabled" />
                    <span class="toggle-slider"></span>
                  </label>
                </div>
                <div class="settings-divider"></div>
                <div class="settings-item settings-item--info">
                  <span class="settings-icon">ℹ️</span>
                  <span>长清阁麻将 v2.2</span>
                </div>
              </div>
            </div>
          </div>
        </Transition>

        <!-- Big responsive table -->
        <div class="table-wrapper">
          <div class="mahjong-table">
            <!-- 绿色桌布内层 -->
            <div class="table-felt">
            <!-- 左上角: 轮次信息 -->
            <div class="round-info" v-if="gameState?.phase === 'playing'">
              {{ roundDisplay }}
            </div>
            <!-- 十字定位标志 -->
            <div class="cross-marker">
              <div class="cross-h"></div>
              <div class="cross-v"></div>
            </div>
            <!-- 中心金色圆环 -->
            <div class="center-glow"></div>
            <!-- 四方位标注 -->
            <span class="compass compass--n">北</span>
            <span class="compass compass--s">南</span>
            <span class="compass compass--w">西</span>
            <span class="compass compass--e">东</span>
            <!-- 状态消息（非中心显示） -->
            <div class="turn-indicator">
              <span v-if="isWinner" class="turn-win">🎉 你赢了！</span>
              <span v-else-if="isAIControlled" class="turn-ai">🤖 AI托管中</span>
              <span v-else-if="showMobileActionNotice" class="turn-action">有可用操作</span>
              <span v-else>{{ turnMessage }}</span>
              <span v-if="turnTimerActive && !isWinner && !isAIControlled" class="turn-timer" :class="{ 'turn-timer--urgent': turnTimer <= 10 }">
                ⏱ {{ turnTimer }}s
              </span>
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

            <!-- 弃牌区（4个独立位置） -->
            <DiscardZone
              position="bottom"
              :tiles="playerDiscards"
              :is-winner="isWinner"
              :latest-tile-id="selfLatestDiscardId"
            />
            <DiscardZone
              position="top"
              :tiles="northDiscards"
              :is-winner="northIsWinner"
              :latest-tile-id="northLatestDiscardId"
            />
            <DiscardZone
              position="left"
              :tiles="westDiscards"
              :is-winner="westIsWinner"
              :latest-tile-id="westLatestDiscardId"
            />
            <DiscardZone
              position="right"
              :tiles="eastDiscards"
              :is-winner="eastIsWinner"
              :latest-tile-id="eastLatestDiscardId"
            />

            </div>

            <!-- Top player -->
            <div class="seat seat-top" :class="{ 'seat-active': activePosition !== null && topPlayer?.position === activePosition }">
              <PlayerOtherArea
                :name="topPlayer?.name || '北家'"
                position="top"
                :hand="northHand"
                :melds="northMelds"
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
                :is-winner="eastIsWinner"
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
                  :selected-tile-id="selectedTileId"
                  :is-winner="isWinner"
                  @tileClick="handleTileClick"
                  @tileDblclick="handleTileDblclick"
                  @tileDiscard="handleTileDiscard"
                />
                <!-- 动作按钮放在手牌右侧 -->
                <div v-if="isAIControlled" class="inline-action-buttons">
                  <div class="ai-controlled-notice">
                    🤖 已由AI自动出牌
                  </div>
                  <button
                    class="inline-action-btn inline-action-btn--comeback"
                    @click="onPlayerBack"
                  >我回来了</button>
                </div>
                <div class="inline-action-buttons" v-else-if="isConnected && !isInteractionLocked">
                  <div v-if="actionWindowText" class="inline-action-timer">{{ actionWindowText }}</div>
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
          <div class="ext-section ext-section--actions" v-if="gameState?.phase === 'playing'">
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
  </div>
</div></template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import PlayerSelfArea from '~/components/PlayerSelfArea.vue'
import PlayerOtherArea from '~/components/PlayerOtherArea.vue'
import CircularActionButtons from '~/components/CircularActionButtons.vue'
import TableCenter from '~/components/TableCenter.vue'
import DiceAnimation from '~/components/DiceAnimation.vue'
import PlayerInfo from '~/components/PlayerInfo.vue'
import RoomStats from '~/components/RoomStats.vue'
import DiscardZone from '~/components/DiscardZone.vue'
import { useGame, ACTION_HIGHLIGHT_DELAY_MS } from '~/composables/useGame'
import { useSound } from '~/composables/useSound'
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
const { play: playSound, isEnabled: soundEnabled, setEnabled: setSoundEnabled } = useSound()

const toggleSound = () => {
  setSoundEnabled(!soundEnabled.value)
}
// Admin/Debug — 目前禁用 (isAdminUser=false)
const isAdminUser = computed(() => false)
const showAllCards = ref(false)
const shouldRevealOpponents = computed(() => false)
const isMobilePortrait = ref(false)
const shouldRotateView = computed(() => isMobilePortrait.value)
const nowTs = ref(Date.now())
let actionWindowTimer: ReturnType<typeof setInterval> | null = null

// ===== 出牌倒计时 & AI托管 =====
const TURN_TIMEOUT_SEC = 60
const CONSECUTIVE_AUTO_THRESHOLD = 2 // 连续自动操作N次后AI接管
const turnTimer = ref(TURN_TIMEOUT_SEC)
const turnTimerActive = ref(false)
let turnTimerInterval: ReturnType<typeof setInterval> | null = null
let lastWarnAt = 0
let consecutiveAutoCount = 0   // 连续自动操作次数
const isAIControlled = ref(false) // 是否被AI接管
const showSettings = ref(false) // 显示设置面板

// 游戏设置
const showHintEnabled = ref(true)       // 出牌提示
const tileAnimationEnabled = ref(true)   // 牌面动画
const actionSoundEnabled = ref(true)    // 操作音效
const timerWarningEnabled = ref(true)   // 倒计时警告音

const startTurnTimer = () => {
  stopTurnTimer()
  // AI接管期间不启动人类计时器
  if (isAIControlled.value) return
  turnTimer.value = TURN_TIMEOUT_SEC
  turnTimerActive.value = true
  lastWarnAt = 0
  turnTimerInterval = setInterval(() => {
    turnTimer.value--
    // 10秒警告音效
    if (turnTimer.value === 10 && lastWarnAt !== 10) {
      playSound('timer-warn')
      lastWarnAt = 10
    }
    if (turnTimer.value <= 0) {
      stopTurnTimer()
      handleAutoAction()
    }
  }, 1000)
}

const stopTurnTimer = () => {
  turnTimerActive.value = false
  if (turnTimerInterval) {
    clearInterval(turnTimerInterval)
    turnTimerInterval = null
  }
}

// 玩家主动操作时重置连续计数
const resetAutoCount = () => {
  consecutiveAutoCount = 0
}

// 超时自动操作
const handleAutoAction = () => {
  consecutiveAutoCount++

  // 1. 有摸到的牌但没出 → 自动打出摸到的牌
  if (currentPlayer.value?.hand?.concealedTiles?.length) {
    const lastTile = currentPlayer.value.hand.concealedTiles.at(-1)
    if (lastTile) {
      playSound('tile-discard')
      executeAction(ActionType.DISCARD, lastTile.id)
    }
  }
  // 2. 有优先操作（吃/碰/杠/胡）→ 自动过
  else if (showPass.value) {
    onPass()
  }
  // 3. 轮到摸牌 → 自动摸
  else if (showDraw.value) {
    playSound('tile-draw')
    executeAction(ActionType.DRAW)
  }

  // 检查是否达到连续阈值 → AI托管
  if (consecutiveAutoCount >= CONSECUTIVE_AUTO_THRESHOLD) {
    isAIControlled.value = true
    consecutiveAutoCount = 0
    // 通知服务器开启AI托管
    useFetch('/api/game/bot-mode', {
      method: 'POST',
      body: { gameId: roomId.value, playerId: playerId.value, enabled: true }
    }).catch(console.error)
  }
}

// 玩家回来：点击"我回来了"恢复控制
const onPlayerBack = () => {
  isAIControlled.value = false
  consecutiveAutoCount = 0
  // 通知服务器关闭AI托管
  useFetch('/api/game/bot-mode', {
    method: 'POST',
    body: { gameId: roomId.value, playerId: playerId.value, enabled: false }
  }).catch(console.error)
  // 恢复后重新启动计时
  if (isMyTurn.value || hasPriorityActions.value) {
    startTurnTimer()
  }
}

const isMyTurn = computed(() => currentTurnPlayer.value?.id === currentPlayer.value?.id)

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

onMounted(async () => {
  if (roomId.value && playerId.value) {
    await connect(roomId.value, playerId.value)

    // 游戏未开始 → 自动显示掷骰子
    await nextTick()
    if (gameState.value && gameState.value.phase !== GamePhase.PLAYING && gameState.value.phase !== GamePhase.ENDED) {
      // 等 Socket.IO 连接完成后检查玩家数
      setTimeout(() => {
        if (gameState.value?.players?.length >= 2 && gameState.value.phase !== GamePhase.PLAYING) {
          console.log('[gameroom] Auto-showing dice overlay for game setup')
          onStartGame()
        }
      }, 500)
    }
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
    stopTurnTimer()
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

// ---- Latest Discard ID per Player ----
// 全局最后一张弃牌（所有玩家中打出的最新一张）
const globalLatestDiscardId = computed(() => {
  const allDiscards = gameState.value?.discardPile || []
  return allDiscards.length > 0 ? allDiscards[allDiscards.length - 1]?.id : null
})

const selfLatestDiscardId = computed(() => globalLatestDiscardId.value)
const northLatestDiscardId = computed(() => globalLatestDiscardId.value)
const westLatestDiscardId = computed(() => globalLatestDiscardId.value)
const eastLatestDiscardId = computed(() => globalLatestDiscardId.value)
const playerHand = computed(() => currentPlayer.value?.hand.concealedTiles || [])
const playerMelds = computed(() => currentPlayer.value?.hand.exposedMelds || [])
const playerDiscards = computed(() => currentPlayer.value?.hand.discardedTiles || [])
const isWinner = computed(() => currentPlayer.value?.status === 'won')



// ---- Table Center Data ----
const remainingTileCount = computed(() => gameState.value?.wallRemaining ?? 0)
const currentRound = computed(() => gameState.value?.currentRound ?? 1)
const roundMultiplier = computed(() => gameState.value?.roundMultiplier ?? 1)

// 圈方位 & 局数（用于显示"第1圈 东二局"格式）
const windNames = ['东', '南', '西', '北']
const roundCircle = computed(() => Math.floor((currentRound.value - 1) / 4) + 1)
const prevailingWind = computed(() => {
  // 每4局换一次方位：1-4局=东，5-8局=南，9-12局=西，13-16局=北
  return windNames[Math.floor((currentRound.value - 1) / 4) % 4]
})
const roundPosition = computed(() => ((currentRound.value - 1) % 4) + 1)
const roundDisplay = computed(() => `第${roundCircle.value}圈 ${prevailingWind.value}${roundPosition.value}局`)
const globalMultiplier = computed(() => gameState.value?.globalMultiplier ?? 1)
const wildTile = computed(() => {
  const raw = gameState.value?.customScoringMode
  if (!raw || raw === 'cheat') return null

  // 解析 "suit-value" 格式（如 "dots-3", "hua-5"）
  const parts = raw.split('-')
  if (parts.length < 2) return null
  const suit = parts[0]
  const value = parseInt(parts[1], 10)

  // 花牌百搭: 整组为百搭（春夏秋冬 或 梅兰竹菊）
  const isFlower = suit === 'hua'
  const group = gameState.value?.wildTileGroup

  return {
    suit,
    value,
    id: 'center-wild',
    isWild: true,
    isFlower,
    flowerGroup: isFlower ? group : undefined
  } as any
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

// ===== 出牌 =====
const commitDiscard = (tile: Tile) => {
  resetAutoCount()
  playSound('tile-discard')
  executeAction(ActionType.DISCARD, tile.id)
  selectedTileId.value = null
}

// 拖拽超出阈值 → 直接出牌
const handleTileDiscard = (tile: Tile) => {
  if (isWinner.value || isInteractionLocked.value) return
  const canDiscard = availableActions.value.includes(ActionType.DISCARD)
  if (!canDiscard) return
  commitDiscard(tile)
}

// ===== 双击出牌 =====
const handleTileDblclick = (tile: Tile) => {
  if (isWinner.value || isInteractionLocked.value) return
  const canDiscard = availableActions.value.includes(ActionType.DISCARD)
  if (!canDiscard) return
  commitDiscard(tile)
}

const handleTileClick = (tile: Tile) => {
  if (isWinner.value || isInteractionLocked.value) return
  
  // If it's our turn and we can discard
  const canDiscard = availableActions.value.includes(ActionType.DISCARD)
  
  if (selectedTileId.value === tile.id) {
    if (canDiscard) {
      // 二次点击 → 直接出牌
      commitDiscard(tile)
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
const canCheatHu = computed(
  () => isAdminUser.value && isMyTurn.value && gameState.value?.phase === GamePhase.PLAYING
)

const onDraw = () => { resetAutoCount(); playSound('tile-draw'); executeAction(ActionType.DRAW) }
const onChow = () => { resetAutoCount(); playSound('tile-chow'); executeAction(ActionType.CHOW) }
const onPeng = () => { resetAutoCount(); playSound('tile-pong'); executeAction(ActionType.PENG) }
const onKong = () => { resetAutoCount(); playSound('tile-kong'); executeAction(ActionType.KONG) }
const onHu = () => { resetAutoCount(); playSound('tile-hu'); executeAction(ActionType.HU) }
const onPass = () => { resetAutoCount(); executeAction(ActionType.PASS) }
const onRebel = () => { resetAutoCount(); playSound('tile-rebel'); executeAction(ActionType.REBEL) }
const onCheatHu = () => { resetAutoCount(); playSound('tile-hu'); executeAction(ActionType.CHEAT_HU) }

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

// 监听回合变化，启动/停止倒计时（移到 hasPriorityActions 定义之后，避免 TDZ）
watch([isMyTurn, hasPriorityActions], ([myTurn, hasActions]) => {
  if (isAIControlled.value) return
  if (myTurn || hasActions) {
    startTurnTimer()
  } else {
    stopTurnTimer()
  }
})

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
  playSound('dice-roll')
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

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.mahjong-button.secondary {
  background: rgba(60, 60, 60, 0.85);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.15);
}

.sound-off {
  opacity: 0.5;
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
  /* 4:3 比例，56em×42em ≈ 896×672px，保证零隐藏 */
  width: min(100vw, calc(80vh * 4/3), 1200px);
  aspect-ratio: 4 / 3;
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

/* ===== 弃牌区定位 ===== */
/* 上家：靠近牌桌中心，旋转180° */
:deep(.discard-zone--top) {
  top: 30%;
  left: 28%;
  width: 44%;
  display: flex;
  justify-content: center;
  transform: rotate(180deg);
}
/* 下家（本家）：靠近牌桌中心 */
:deep(.discard-zone--bottom) {
  bottom: 30%;
  left: 28%;
  width: 44%;
  display: flex;
  justify-content: center;
}
/* 左家：桌面左侧，旋转90° */
:deep(.discard-zone--left) {
  top: 30%;
  left: 14%;
  width: 20%;
  display: flex;
  justify-content: center;
  transform: rotate(90deg);
}
/* 右家：桌面右侧，旋转-90° */
:deep(.discard-zone--right) {
  top: 30%;
  right: 14%;
  width: 20%;
  display: flex;
  justify-content: center;
  transform: rotate(-90deg);
}

/* ===== 扩展信息区 ===== */
.extended-info-panel {
  flex: 0 0 308px;
  max-width: 308px;
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
  z-index: 5; /* 在牌墙z-index=1之上 */
  transition: transform 0.15s ease, filter 0.15s ease;
}

.seat-active {
  filter: drop-shadow(0 0 16px rgba(255, 220, 60, 0.9));
  animation: seat-glow 1.5s ease-in-out infinite;
}

@keyframes seat-glow {
  0%, 100% { filter: drop-shadow(0 0 14px rgba(255, 220, 60, 0.8)); }
  50% { filter: drop-shadow(0 0 24px rgba(255, 220, 60, 1.0)); }
}

.seat-top {
  top: 0;
  left: 50%;
  transform: translateX(-50%) rotate(180deg);
  width: 62%;
  height: auto;
}

.seat-bottom {
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 62%;
  height: auto;
}

/* 对家名字反向旋转，保持正向可读 */
.seat-top :deep(.player-other-name) {
  display: inline-block;
  transform: rotate(180deg);
}

.seat-left {
  left: 5%;
  top: 0;
  height: 100%;
  width: 60px;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  overflow: hidden;
}

.seat-right {
  right: 5%;
  top: 0;
  height: 100%;
  width: 60px;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
  overflow: hidden;
}

/* ===== 本家：手牌 + 动作按钮横排 ===== */
.self-area-with-actions {
  display: flex;
  justify-content: center;
  align-items: flex-end;
  gap: 8px;
  width: 100%;
  position: relative;
}

/* 内联动作按钮组 — 放在手牌右侧 */
.inline-action-buttons {
  position: absolute;
  right: 0;
  bottom: 0;
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

.inline-action-btn--comeback {
  background: linear-gradient(135deg, #0d6efd, #42a5f5);
  color: #fff;
  border-color: rgba(66, 165, 245, 0.6);
  font-size: 0.85rem;
  padding: 8px 16px;
  animation: comeback-glow 1.5s infinite;
}

@keyframes comeback-glow {
  0%, 100% { box-shadow: 0 0 8px rgba(66, 165, 245, 0.4); }
  50% { box-shadow: 0 0 20px rgba(66, 165, 245, 0.8); }
}

.ai-controlled-notice {
  font-size: 0.7rem;
  color: #ffd36a;
  text-align: center;
  padding: 4px;
  white-space: nowrap;
}

.turn-ai {
  color: #ffd36a;
  font-weight: 700;
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

/* 十字定位标志 */
.cross-marker {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 30px;
  height: 30px;
  z-index: 2;
  pointer-events: none;
}

/* 中心金色圆环 */
.center-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 173px;
  height: 173px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 215, 0, 0.15) 0%, rgba(255, 180, 0, 0.08) 50%, transparent 70%);
  border: 1.5px solid rgba(255, 215, 0, 0.25);
  z-index: 1;
  pointer-events: none;
}
.cross-h, .cross-v {
  position: absolute;
  background: rgba(255, 255, 255, 0.12);
}
.cross-h {
  top: 50%; left: 0; width: 100%; height: 1px;
  transform: translateY(-0.5px);
}
.cross-v {
  left: 50%; top: 0; height: 100%; width: 1px;
  transform: translateX(-0.5px);
}

/* 四方位标注 */
.compass {
  position: absolute;
  font-size: 0.7rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.35);
  z-index: 2;
  pointer-events: none;
}
.compass--n { top: 2%; left: 50%; transform: translateX(-50%); }
.compass--s { bottom: 2%; left: 50%; transform: translateX(-50%); }
.compass--w { left: 2%; top: 50%; transform: translateY(-50%); }
.compass--e { right: 2%; top: 50%; transform: translateY(-50%); }

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

/* 出牌倒计时 */
.turn-timer {
  margin-left: 8px;
  font-size: 0.8rem;
  font-weight: 700;
  color: #81c784;
  background: rgba(0, 0, 0, 0.3);
  padding: 1px 8px;
  border-radius: 999px;
}

.turn-timer--urgent {
  color: #ef5350;
  animation: timer-pulse 0.5s infinite;
}

@keyframes timer-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.05); }
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