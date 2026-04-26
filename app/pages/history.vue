<template>
  <div class="history-page">
    <div class="history-shell">
      <header class="history-header">
        <button class="ghost-button" @click="goBack">← 返回</button>
        <div>
          <h1>对局记录</h1>
          <p class="subtitle">所有房间的近期对局</p>
        </div>
        <button class="ghost-button" @click="loadAll" :disabled="isLoading">
          刷新
        </button>
      </header>

      <!-- 战绩统计表格 -->
      <section class="stats-section">
        <h2 class="section-title">📊 战绩统计</h2>
        <p v-if="statsLoading" class="loading">加载统计中…</p>
        <p v-else-if="!playerStats.length" class="empty">暂无统计数据。</p>
        <div v-else class="stats-table-wrap">
          <table class="stats-table">
            <thead>
              <tr>
                <th>玩家</th>
                <th>总输赢</th>
                <th class="highlight-col">有效战绩</th>
                <th>与AI战绩</th>
                <th>自摸</th>
                <th>捉冲</th>
                <th>最大赢</th>
                <th>最大输</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="stat in playerStats"
                :key="stat.playerId"
                :class="{ 'ai-row': stat.isAI, 'me-row': stat.playerId === userIdCookie }"
              >
                <td class="player-cell">
                  <span v-if="stat.isAI" class="ai-badge">AI</span>
                  <span class="name">{{ stat.name }}</span>
                </td>
                <td :class="scoreClass(stat.totalScore)">{{ formatSigned(stat.totalScore) }}</td>
                <td class="highlight-col" :class="scoreClass(stat.effectiveScore)">
                  <strong>{{ formatSigned(stat.effectiveScore) }}</strong>
                </td>
                <td :class="scoreClass(stat.vsAINet)">
                  {{ formatSigned(stat.vsAINet) }}
                  <span class="vs-ai-detail">赢{{ stat.vsAIWin }} 输{{ stat.vsAILose }}</span>
                </td>
                <td class="center">{{ stat.selfDrawCount }}</td>
                <td class="center">{{ stat.catchDiscardCount }}</td>
                <td class="score-positive">{{ stat.maxWin > 0 ? '+' + stat.maxWin : '-' }}</td>
                <td class="score-negative">{{ stat.maxLoss < 0 ? stat.maxLoss : '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="filter-bar">
        <label class="toggle">
          <input type="checkbox" v-model="showOnlyMine" :disabled="!userIdCookie" />
          <span>只看我的对局</span>
        </label>
        <span v-if="!userIdCookie" class="filter-hint">登录后可按玩家筛选。</span>
      </section>

      <section class="history-content">
        <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
        <p v-else-if="isLoading" class="loading">加载对局记录中…</p>
        <p v-else-if="!histories.length" class="empty">暂无对局记录。</p>

        <div v-else class="history-list">
          <article v-for="match in histories" :key="match.gameId" class="history-card">
            <div class="card-header">
              <div>
                <p class="room-label">房间 {{ match.roomId }}</p>
                <h2>{{ formatDate(match.completedAt) }}</h2>
              </div>
              <div class="meta">
                <span class="badge">{{ match.winnersCount }} 位赢家</span>
                <span class="badge subtle">第 {{ match.roundNumber }} 局</span>
              </div>
            </div>

            <ul class="player-list">
              <li
                v-for="player in match.results"
                :key="player.playerId"
                :class="['player-row', { winner: player.status === 'won', me: player.playerId === userIdCookie }]"
              >
                <div>
                  <p class="player-name">
                    {{ player.name }}
                    <span v-if="player.winType === 'self_draw'" class="win-tag self-draw">自摸</span>
                    <span v-else-if="player.winType === 'catch_discard'" class="win-tag catch">捉冲</span>
                    <span v-else-if="player.winType === 'rob_kong'" class="win-tag rob">抢杠</span>
                  </p>
                  <p class="player-meta">
                    {{ player.status === 'won' ? '赢家' : '参与者' }} · 第 {{ player.position + 1 }} 位
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
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

const histories = ref<MatchHistoryItem[]>([])
const playerStats = ref<PlayerStat[]>([])
const isLoading = ref(false)
const statsLoading = ref(false)
const errorMessage = ref<string | null>(null)
const showOnlyMine = ref(false)
const userIdCookie = useCookie<string | null>('user_id')

const queryUserId = computed(() => {
  if (!showOnlyMine.value) return undefined
  return userIdCookie.value || undefined
})

const loadHistory = async () => {
  isLoading.value = true
  errorMessage.value = null
  try {
    const response = await $fetch<{ success: boolean; data: MatchHistoryItem[] }>('/api/history/list', {
      query: {
        limit: 20,
        ...(queryUserId.value ? { userId: queryUserId.value } : {})
      },
      cache: 'no-cache'
    })

    if (response?.success) {
      histories.value = response.data || []
    } else {
      throw new Error('Unable to fetch match history')
    }
  } catch (err: any) {
    errorMessage.value = err?.message || '加载失败，请重试'
  } finally {
    isLoading.value = false
  }
}

const loadStats = async () => {
  statsLoading.value = true
  try {
    const response = await $fetch<{ success: boolean; data: PlayerStat[] }>('/api/history/stats', {
      query: { limit: 100 },
      cache: 'no-cache'
    })
    if (response?.success) {
      playerStats.value = response.data || []
    }
  } catch (err) {
    console.warn('Failed to load stats:', err)
  } finally {
    statsLoading.value = false
  }
}

const loadAll = () => {
  loadHistory()
  loadStats()
}

watch(queryUserId, () => {
  loadHistory()
})

onMounted(() => {
  loadAll()
})

const goBack = () => navigateTo('/')

const formatDate = (value: string | Date) => {
  return formatBeijingDateTime(value)
}

const formatSigned = (value: number) => {
  if (value === 0) return '0'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value}`
}

const scoreClass = (value: number) => {
  if (value > 0) return 'score-positive'
  if (value < 0) return 'score-negative'
  return 'score-neutral'
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
  width: min(960px, 100%);
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
  font-size: 0.9rem;
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

/* === Stats Section === */
.stats-section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 1.1rem;
  margin: 0 0 12px;
  font-weight: 600;
}

.stats-table-wrap {
  overflow-x: auto;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.stats-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.stats-table th,
.stats-table td {
  padding: 10px 12px;
  text-align: right;
  white-space: nowrap;
}

.stats-table th {
  background: rgba(255, 255, 255, 0.06);
  font-weight: 600;
  text-align: right;
  position: sticky;
  top: 0;
}

.stats-table th:first-child,
.stats-table td:first-child {
  text-align: left;
}

.stats-table tbody tr {
  border-top: 1px solid rgba(255, 255, 255, 0.04);
}

.stats-table tbody tr:hover {
  background: rgba(255, 255, 255, 0.03);
}

.highlight-col {
  background: rgba(255, 226, 122, 0.08) !important;
  border-left: 2px solid rgba(255, 226, 122, 0.3);
  border-right: 2px solid rgba(255, 226, 122, 0.3);
}

.stats-table thead .highlight-col {
  background: rgba(255, 226, 122, 0.15) !important;
  color: #ffe27a;
}

.ai-row {
  opacity: 0.7;
}

.me-row {
  box-shadow: inset 0 0 0 1px rgba(95, 255, 176, 0.3);
}

.player-cell {
  display: flex;
  align-items: center;
  gap: 6px;
}

.ai-badge {
  background: rgba(255, 157, 157, 0.2);
  color: #ff9d9d;
  font-size: 0.7rem;
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 700;
}

.vs-ai-detail {
  display: block;
  font-size: 0.7rem;
  opacity: 0.7;
  margin-top: 2px;
}

.name {
  font-weight: 600;
}

.center {
  text-align: center !important;
}

/* === Filter Bar === */
.filter-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  margin-bottom: 16px;
  font-size: 0.9rem;
}

.toggle {
  display: flex;
  align-items: center;
  gap: 6px;
}

.filter-hint {
  opacity: 0.6;
}

.history-content {
  min-height: 200px;
}

.error,
.loading,
.empty {
  text-align: center;
  opacity: 0.8;
  margin: 40px 0;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.history-card {
  background: rgba(255, 255, 255, 0.04);
  border-radius: 16px;
  padding: 16px 18px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
}

.room-label {
  font-size: 0.8rem;
  opacity: 0.8;
  margin: 0;
}

.card-header h2 {
  margin: 2px 0 0;
  font-size: 1.1rem;
}

.meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: flex-end;
}

.badge {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  padding: 4px 12px;
  font-size: 0.85rem;
  font-weight: 600;
}

.badge.subtle {
  opacity: 0.8;
}

.player-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.player-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  padding: 10px 12px;
}

.player-row.winner {
  border: 1px solid rgba(255, 226, 122, 0.4);
}

.player-row.me {
  box-shadow: 0 0 0 1px rgba(95, 255, 176, 0.35);
}

.player-name {
  margin: 0;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.win-tag {
  font-size: 0.7rem;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 700;
}

.win-tag.self-draw {
  background: rgba(95, 255, 176, 0.2);
  color: #5fffb0;
}

.win-tag.catch {
  background: rgba(255, 226, 122, 0.2);
  color: #ffe27a;
}

.win-tag.rob {
  background: rgba(255, 157, 157, 0.2);
  color: #ff9d9d;
}

.player-meta {
  margin: 2px 0 0;
  font-size: 0.8rem;
  opacity: 0.75;
}

.player-score {
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 999px;
}

.score-positive {
  color: #5fffb0;
  background: rgba(95, 255, 176, 0.1);
}

.score-negative {
  color: #ff9d9d;
  background: rgba(255, 157, 157, 0.1);
}

.score-neutral {
  color: #f5f5f5;
  background: rgba(255, 255, 255, 0.08);
}

@media (max-width: 640px) {
  .history-shell {
    padding: 20px;
  }

  .card-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .meta {
    flex-direction: row;
  }

  .stats-table th,
  .stats-table td {
    padding: 8px 6px;
    font-size: 0.8rem;
  }
}
</style>
