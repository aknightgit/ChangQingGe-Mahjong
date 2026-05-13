<template>
  <div class="history-page">
    <div class="history-shell">
      <header class="history-header">
        <button class="ghost-button" @click="goBack">返回大厅</button>
        <div>
          <h1>对局记录</h1>
          <p class="subtitle">支持按局次回顾，也支持按玩家查看战绩与对局</p>
        </div>
        <button class="ghost-button" @click="loadAll" :disabled="isLoading || statsLoading || roundsLoading">
          刷新
        </button>
      </header>

      <section class="view-tabs">
        <button
          class="tab-chip"
          :class="{ 'tab-chip--active': viewMode === 'rounds' }"
          @click="viewMode = 'rounds'"
        >按局次回顾</button>
        <button
          class="tab-chip"
          :class="{ 'tab-chip--active': viewMode === 'players' }"
          @click="viewMode = 'players'"
        >按玩家查看</button>
      </section>

      <template v-if="viewMode === 'rounds'">
        <section class="filter-bar">
          <label class="toggle">
            <input type="checkbox" v-model="showOnlyMineRounds" :disabled="!userIdCookie" />
            <span>只看我参与的局次</span>
          </label>
          <span v-if="!userIdCookie" class="filter-hint">当前未识别登录玩家，无法按本人过滤。</span>
        </section>

        <section class="history-content">
          <p v-if="roundsError" class="error">{{ roundsError }}</p>
          <p v-else-if="roundsLoading" class="loading">加载局次回顾中…</p>
          <p v-else-if="!roundReviews.length" class="empty">暂无局次记录。</p>

          <div v-else class="round-list">
            <article v-for="round in roundReviews" :key="`${round.gameId}-${round.roundNumber}`" class="round-card">
              <div class="card-header">
                <div>
                  <p class="room-label">{{ formatDate(round.recordedAt) }}</p>
                  <h2>房间 {{ round.roomNumber }} · 第 {{ round.roundNumber }} 局</h2>
                </div>
                <div class="meta">
                  <span class="badge">{{ round.winnerNames.length ? round.winnerNames.join(' / ') : '流局' }}</span>
                  <span class="badge subtle">{{ formatEndReason(round.endReason) }}</span>
                </div>
              </div>

              <div class="round-table-wrap">
                <table class="round-table">
                  <thead>
                    <tr>
                      <th>玩家</th>
                      <th>结果</th>
                      <th>分数</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="player in round.players"
                      :key="player.playerId"
                      :class="{ 'winner-row': player.isWinner, 'me-row': player.playerId === userIdCookie }"
                    >
                      <td>{{ player.name }}</td>
                      <td>{{ player.isWinner ? '胡牌' : formatPlayerStatus(player.status) }}</td>
                      <td :class="scoreClass(player.score)">{{ formatSigned(player.score) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </article>
          </div>
        </section>
      </template>

      <template v-else>
        <section class="stats-section">
          <div class="stats-section-header">
            <h2 class="section-title">玩家战绩</h2>
            <div class="player-picker">
              <label for="player-record-filter">查看玩家</label>
              <select id="player-record-filter" v-model="selectedPlayerId">
                <option value="">全部玩家</option>
                <option v-for="stat in playerStats" :key="stat.playerId" :value="stat.playerId">
                  {{ stat.name }}
                </option>
              </select>
            </div>
          </div>

          <p v-if="statsLoading" class="loading">加载玩家战绩中…</p>
          <p v-else-if="!playerStats.length" class="empty">暂无玩家战绩。</p>
          <div v-else class="stats-table-wrap">
            <table class="stats-table">
              <thead>
                <tr>
                  <th>玩家</th>
                  <th>总局数</th>
                  <th>总分</th>
                  <th class="highlight-col">有效分</th>
                  <th>自摸</th>
                  <th>接炮</th>
                  <th>单局最高</th>
                  <th>单局最低</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="stat in playerStats"
                  :key="stat.playerId"
                  :class="{
                    'ai-row': stat.isAI,
                    'me-row': stat.playerId === userIdCookie,
                    'selected-row': stat.playerId === selectedPlayerId
                  }"
                  @click="selectedPlayerId = stat.playerId"
                >
                  <td class="player-cell">
                    <span v-if="stat.isAI" class="ai-badge">AI</span>
                    <span class="name">{{ stat.name }}</span>
                  </td>
                  <td>{{ stat.totalGames }}</td>
                  <td :class="scoreClass(stat.totalScore)">{{ formatSigned(stat.totalScore) }}</td>
                  <td class="highlight-col" :class="scoreClass(stat.effectiveScore)">{{ formatSigned(stat.effectiveScore) }}</td>
                  <td>{{ stat.selfDrawCount }}</td>
                  <td>{{ stat.catchDiscardCount }}</td>
                  <td class="score-positive">{{ stat.maxWin > 0 ? `+${stat.maxWin}` : '-' }}</td>
                  <td class="score-negative">{{ stat.maxLoss < 0 ? stat.maxLoss : '-' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="history-content">
          <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
          <p v-else-if="isLoading" class="loading">加载玩家对局中…</p>
          <p v-else-if="!histories.length" class="empty">暂无该玩家的对局记录。</p>

          <div v-else class="history-list">
            <article v-for="match in histories" :key="match.gameId" class="history-card">
              <div class="card-header">
                <div>
                  <p class="room-label">房间 {{ match.roomNumber || match.roomId }}</p>
                  <h2>{{ formatDate(match.completedAt) }}</h2>
                </div>
                <div class="meta">
                  <span class="badge">{{ match.winnersCount }} 人胡牌</span>
                  <span class="badge subtle">第 {{ match.roundNumber }} 巡结束</span>
                </div>
              </div>

              <ul class="player-list">
                <li
                  v-for="player in match.results"
                  :key="player.playerId"
                  :class="['player-row', { winner: player.status === 'won', me: player.playerId === userIdCookie, focus: player.playerId === selectedPlayerId }]"
                >
                  <div>
                    <p class="player-name">
                      {{ player.name }}
                      <span v-if="player.winType === 'self_draw'" class="win-tag self-draw">自摸</span>
                      <span v-else-if="player.winType === 'catch_discard'" class="win-tag catch">接炮</span>
                      <span v-else-if="player.winType === 'rob_kong'" class="win-tag rob">抢杠</span>
                    </p>
                    <p class="player-meta">
                      {{ player.status === 'won' ? '胡牌' : '未胡牌' }} · 座位 {{ player.position + 1 }}
                    </p>
                  </div>
                  <div class="player-score" :class="scoreClass(player.finalScore ?? match.finalScores?.[player.playerId] ?? 0)">
                    {{ formatSigned(player.finalScore ?? match.finalScores?.[player.playerId] ?? 0) }}
                  </div>
                </li>
              </ul>
            </article>
          </div>
        </section>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { formatBeijingDateTime } from '~/utils/beijingTime'

interface MatchHistoryResult {
  playerId: string
  name: string
  position: number
  status: 'waiting' | 'playing' | 'won' | 'lost'
  winOrder: number | null
  winRound: number | null
  winTimestamp: number | null
  winType: 'self_draw' | 'catch_discard' | 'rob_kong' | null
  wonFan: number
  windScore: number
  rainScore: number
  finalScore: number
}

interface MatchHistoryItem {
  gameId: string
  roomId: string
  roomNumber?: string
  endReason: string | null
  winnersCount: number
  roundNumber: number
  completedAt: string | Date
  durationMs: number
  finalScores?: Record<string, number>
  results: MatchHistoryResult[]
}

interface PlayerStat {
  playerId: string
  name: string
  isAI: boolean
  totalGames: number
  totalScore: number
  effectiveScore: number
  vsAIWin: number
  vsAILose: number
  vsAINet: number
  selfDrawCount: number
  catchDiscardCount: number
  maxWin: number
  maxLoss: number
}

interface RoundReviewPlayer {
  playerId: string
  name: string
  status: string
  isWinner: boolean
  score: number
}

interface RoundReviewItem {
  gameId: string
  roomId: string
  roomNumber: string
  roundNumber: number
  recordedAt: string | Date
  endReason: string | null
  winnerNames: string[]
  players: RoundReviewPlayer[]
}

const histories = ref<MatchHistoryItem[]>([])
const roundReviews = ref<RoundReviewItem[]>([])
const playerStats = ref<PlayerStat[]>([])
const isLoading = ref(false)
const roundsLoading = ref(false)
const statsLoading = ref(false)
const errorMessage = ref<string | null>(null)
const roundsError = ref<string | null>(null)
const viewMode = ref<'rounds' | 'players'>('rounds')
const selectedPlayerId = ref('')
const showOnlyMineRounds = ref(false)
const userIdCookie = useCookie<string | null>('user_id')

const queryPlayerId = computed(() => selectedPlayerId.value || undefined)
const roundQueryPlayerId = computed(() => {
  if (!showOnlyMineRounds.value) return undefined
  return userIdCookie.value || undefined
})

const loadHistory = async () => {
  isLoading.value = true
  errorMessage.value = null
  try {
    const response = await $fetch<{ success: boolean; data: MatchHistoryItem[] }>('/api/history/list', {
      query: {
        limit: 40,
        ...(queryPlayerId.value ? { playerId: queryPlayerId.value } : {})
      },
      cache: 'no-cache'
    })
    histories.value = response?.success ? (response.data || []) : []
  } catch (err: any) {
    errorMessage.value = err?.message || '加载对局记录失败'
  } finally {
    isLoading.value = false
  }
}

const loadRoundReviews = async () => {
  roundsLoading.value = true
  roundsError.value = null
  try {
    const response = await $fetch<{ success: boolean; data: RoundReviewItem[] }>('/api/history/rounds', {
      query: {
        limit: 80,
        ...(roundQueryPlayerId.value ? { playerId: roundQueryPlayerId.value } : {})
      },
      cache: 'no-cache'
    })
    roundReviews.value = response?.success ? (response.data || []) : []
  } catch (err: any) {
    roundsError.value = err?.message || '加载局次记录失败'
  } finally {
    roundsLoading.value = false
  }
}

const loadStats = async () => {
  statsLoading.value = true
  try {
    const response = await $fetch<{ success: boolean; data: PlayerStat[] }>('/api/history/stats', {
      query: { limit: 100 },
      cache: 'no-cache'
    })
    playerStats.value = response?.success ? (response.data || []) : []
    if (!selectedPlayerId.value && userIdCookie.value && playerStats.value.some(stat => stat.playerId === userIdCookie.value)) {
      selectedPlayerId.value = userIdCookie.value
    }
  } finally {
    statsLoading.value = false
  }
}

const loadAll = () => {
  loadRoundReviews()
  loadStats()
  loadHistory()
}

watch(queryPlayerId, () => {
  if (viewMode.value === 'players') loadHistory()
})

watch(roundQueryPlayerId, () => {
  if (viewMode.value === 'rounds') loadRoundReviews()
})

watch(viewMode, (mode) => {
  if (mode === 'players' && !histories.value.length && !isLoading.value) {
    loadHistory()
  }
  if (mode === 'rounds' && !roundReviews.value.length && !roundsLoading.value) {
    loadRoundReviews()
  }
})

onMounted(() => {
  loadAll()
})

const goBack = () => navigateTo('/mahjong/')

const formatDate = (value: string | Date) => formatBeijingDateTime(value)

const formatSigned = (value: number) => {
  if (value === 0) return '0'
  return `${value > 0 ? '+' : ''}${value}`
}

const scoreClass = (value: number) => {
  if (value > 0) return 'score-positive'
  if (value < 0) return 'score-negative'
  return 'score-neutral'
}

const formatEndReason = (reason: string | null) => {
  if (reason === 'wall_exhausted') return '流局'
  if (reason === 'last_player') return '正常结算'
  return reason || '结束'
}

const formatPlayerStatus = (status: string) => {
  if (status === 'lost') return '未胡牌'
  if (status === 'won') return '胡牌'
  return status
}
</script>

<style scoped>
.history-page {
  min-height: 100vh;
  background: radial-gradient(circle at top, #153b2f, #07130e);
  display: flex;
  justify-content: center;
  padding: 24px;
}

.history-shell {
  width: min(1120px, 100%);
  background: rgba(7, 19, 14, 0.95);
  border-radius: 18px;
  padding: 24px 28px;
  color: #f5f5f5;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 18px 45px rgba(0, 0, 0, 0.5);
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.history-header h1 {
  margin: 0;
  font-size: 1.4rem;
}

.subtitle {
  margin: 0;
  opacity: 0.75;
  font-size: 0.92rem;
}

.ghost-button {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 999px;
  padding: 8px 16px;
  color: inherit;
  cursor: pointer;
  font-weight: 600;
}

.ghost-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.view-tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 18px;
}

.tab-chip {
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.78);
  border-radius: 999px;
  padding: 9px 16px;
  cursor: pointer;
  font-weight: 700;
}

.tab-chip--active {
  background: rgba(255, 215, 0, 0.16);
  border-color: rgba(255, 215, 0, 0.38);
  color: #ffe082;
}

.filter-bar,
.stats-section,
.history-content {
  margin-bottom: 22px;
}

.toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.filter-hint {
  margin-left: 12px;
  color: rgba(255, 255, 255, 0.56);
  font-size: 0.85rem;
}

.stats-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}

.section-title {
  font-size: 1.08rem;
  margin: 0;
  font-weight: 700;
}

.player-picker {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.9rem;
}

.player-picker select {
  min-width: 180px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(255, 255, 255, 0.08);
  color: #f5f5f5;
  padding: 8px 10px;
}

.stats-table-wrap,
.round-table-wrap {
  overflow-x: auto;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.stats-table,
.round-table {
  width: 100%;
  border-collapse: collapse;
}

.stats-table th,
.stats-table td,
.round-table th,
.round-table td {
  padding: 10px 12px;
  white-space: nowrap;
}

.stats-table th,
.round-table th {
  background: rgba(255, 255, 255, 0.06);
  font-weight: 700;
  text-align: right;
}

.stats-table th:first-child,
.stats-table td:first-child,
.round-table th:first-child,
.round-table td:first-child {
  text-align: left;
}

.stats-table tbody tr,
.round-table tbody tr {
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.stats-table tbody tr:hover,
.round-table tbody tr:hover,
.player-row:hover {
  background: rgba(255, 255, 255, 0.03);
}

.selected-row {
  background: rgba(255, 215, 0, 0.07);
}

.highlight-col {
  background: rgba(255, 226, 122, 0.08);
}

.player-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ai-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px 6px;
  border-radius: 999px;
  background: rgba(33, 150, 243, 0.18);
  color: #90caf9;
  font-size: 0.72rem;
  font-weight: 700;
}

.round-list,
.history-list {
  display: grid;
  gap: 14px;
}

.round-card,
.history-card {
  border-radius: 16px;
  padding: 16px 18px;
  background: rgba(255, 255, 255, 0.045);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.card-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}

.card-header h2 {
  margin: 4px 0 0;
  font-size: 1.02rem;
}

.room-label {
  margin: 0;
  color: rgba(255, 255, 255, 0.58);
  font-size: 0.82rem;
}

.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.badge {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(255, 215, 0, 0.12);
  color: #ffe082;
  font-size: 0.78rem;
  font-weight: 700;
}

.badge.subtle {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.76);
}

.player-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 8px;
}

.player-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
}

.player-row.winner,
.winner-row {
  background: rgba(255, 215, 0, 0.08);
}

.player-row.focus {
  outline: 1px solid rgba(255, 215, 0, 0.28);
}

.me-row {
  box-shadow: inset 0 0 0 1px rgba(102, 187, 106, 0.3);
}

.player-name {
  margin: 0 0 4px;
  font-weight: 700;
}

.player-meta {
  margin: 0;
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.84rem;
}

.player-score {
  font-size: 1rem;
  font-weight: 800;
}

.win-tag {
  display: inline-flex;
  margin-left: 8px;
  padding: 2px 6px;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
}

.win-tag.self-draw {
  background: rgba(102, 187, 106, 0.18);
  color: #81c784;
}

.win-tag.catch,
.win-tag.rob {
  background: rgba(255, 167, 38, 0.18);
  color: #ffcc80;
}

.score-positive {
  color: #66bb6a;
}

.score-negative {
  color: #ef5350;
}

.score-neutral {
  color: rgba(255, 255, 255, 0.72);
}

.loading,
.empty,
.error {
  padding: 16px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
}

.error {
  color: #ef9a9a;
}

@media (max-width: 900px) {
  .history-page {
    padding: 12px;
  }

  .history-shell {
    padding: 18px;
  }

  .history-header,
  .stats-section-header,
  .card-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .player-picker {
    width: 100%;
  }

  .player-picker select {
    flex: 1 1 auto;
    min-width: 0;
  }
}
</style>
