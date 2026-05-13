<template>
  <div class="mahjong-page">
    <div class="mahjong-card join-card">
      <header class="join-header">
        <div>
          <h1 class="mahjong-title">加入牌局</h1>
          <p class="mahjong-subtitle">输入房间号加入，或从下方列表选择。</p>
        </div>
        <button class="mahjong-button secondary" @click="backToLobby">返回大厅</button>
      </header>

      <!-- 我的牌局（置顶） -->
      <section v-if="myGames.length > 0" class="my-games-section">
        <div class="available-header">
          <h2>🪑 我的牌局</h2>
          <button class="mahjong-button small" :disabled="isLoadingMy" @click="fetchMyGames">
            {{ isLoadingMy ? '加载中…' : '刷新' }}
          </button>
        </div>
        <ul class="available-list">
          <li v-for="game in myGames" :key="game.gameId" class="available-item my-game-item">
            <div class="available-details">
              <span class="available-id">
                #{{ game.roomNumber }}
                <span v-if="game.isBotMode" class="bot-badge">AI托管中</span>
                <span v-if="game.phase === 'waiting'" class="phase-badge waiting">等待中</span>
                <span v-if="game.phase === 'playing'" class="phase-badge playing">进行中</span>
              </span>
              <span class="available-meta">
                {{ game.playerCount }}/4人
                <span v-if="game.isMyTurn"> · 轮到你了！</span>
              </span>
            </div>
            <div class="my-game-actions">
              <button
                v-if="game.isBotMode"
                class="mahjong-button comeback"
                @click="handleComeback(game)"
                :disabled="isComingBack"
              >
                我要回来
              </button>
              <button
                class="mahjong-button primary"
                @click="enterGame(game)"
              >
                进入
              </button>
            </div>
          </li>
        </ul>
      </section>

      <!-- 输入房间号 -->
      <section class="manual-join">
        <label for="manual-id">输入4位房间号</label>
        <div class="manual-controls">
          <input
            id="manual-id"
            v-model="manualGameId"
            type="text"
            placeholder="例如：7392"
            maxlength="4"
            pattern="[0-9]{4}"
            inputmode="numeric"
          />
          <button
            class="mahjong-button primary"
            :disabled="isJoining || !manualGameId.trim()"
            @click="joinById"
          >
            {{ isJoining ? '加入中…' : '加入' }}
          </button>
        </div>
        <p v-if="joinError" class="available-error">{{ joinError }}</p>
      </section>

      <!-- 空闲牌桌 -->
      <section class="mahjong-available">
        <div class="available-header">
          <h2>空闲牌桌</h2>
          <button class="mahjong-button small" :disabled="isWaitingLoading" @click="fetchWaitingGames">
            {{ isWaitingLoading ? '加载中…' : '刷新' }}
          </button>
        </div>

        <p v-if="waitingGamesError" class="available-error">{{ waitingGamesError }}</p>
        <p v-else-if="!isWaitingLoading && waitingGames.length === 0" class="available-empty">
          暂无空闲牌桌，去大厅创建一个吧！
        </p>

        <ul v-else class="available-list">
          <li v-for="game in waitingGames" :key="game.gameId" class="available-item">
            <div class="available-details">
              <span class="available-id">{{ game.roomNumber || game.gameId.slice(0, 8) }}</span>
              <span class="available-meta">{{ game.playerCount }}/4 人 · 庄家: {{ game.dealerName || '待定' }}</span>
            </div>
            <button class="mahjong-button secondary join" @click="joinExistingGame(game.roomNumber || game.gameId)">
              加入
            </button>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'

const buildGameRoomPath = (gameId: string, playerId: string, spectator = false) => {
  const params = new URLSearchParams({ playerId })
  if (spectator) params.set('spectator', '1')
  return `/gameroom/${gameId}?${params.toString()}`
}

const userName = useCookie('user_name')
const userId = useCookie('user_id')
const waitingGames = ref<any[]>([])
const waitingGamesError = ref<string | null>(null)
const isWaitingLoading = ref(false)
const manualGameId = ref('')
const joinError = ref<string | null>(null)
const isJoining = ref(false)

// 我的牌局
const myGames = ref<any[]>([])
const isLoadingMy = ref(false)
const isComingBack = ref(false)

const backToLobby = () => navigateTo('/mahjong/')

// 获取我的活跃牌局
const fetchMyGames = async () => {
  isLoadingMy.value = true
  try {
    const res = await $fetch<{ success: boolean; data: { games: any[] } }>('/api/game/my-games', {
      cache: 'no-cache'
    })
    if (res?.success) {
      myGames.value = res.data.games || []
    }
  } catch (err) {
    console.warn('Failed to fetch my games:', err)
  } finally {
    isLoadingMy.value = false
  }
}

// 我要回来
const handleComeback = async (game: any) => {
  if (isComingBack.value) return
  isComingBack.value = true
  try {
    await $fetch('/mahjong/api/game/comeback', {
      method: 'POST',
      body: { gameId: game.gameId, playerId: game.myPlayerId }
    })
    // 进入房间
    await navigateTo(`${appBaseURL}/gameroom/${game.gameId}?playerId=${game.myPlayerId}`)
  } catch (err) {
    console.error('Comeback failed:', err)
  } finally {
    isComingBack.value = false
  }
}

// 进入已有牌局
const enterGame = (game: any) => {
  navigateTo(buildGameRoomPath(game.gameId, game.myPlayerId))
}

// 获取空闲牌桌
const fetchWaitingGames = async () => {
  isWaitingLoading.value = true
  waitingGamesError.value = null
  try {
    const { data, error } = await useFetch('/mahjong/api/game/waiting', {
      method: 'GET',
      cache: 'no-cache'
    })
    if (error.value) {
      waitingGamesError.value = error.value.message || '加载房间列表失败'
      waitingGames.value = []
      return
    }
    waitingGames.value = data.value?.data?.games || []
  } catch (err) {
    waitingGamesError.value = err instanceof Error ? err.message : '加载房间列表失败'
    waitingGames.value = []
  } finally {
    isWaitingLoading.value = false
  }
}

const joinExistingGame = (gameId: string) => {
  manualGameId.value = gameId
  joinById()
}

const joinById = () => {
  if (!manualGameId.value.trim()) {
    joinError.value = '请输入房间号'
    return
  }
  joinGame(manualGameId.value.trim())
}

const joinGame = async (gameId: string) => {
  joinError.value = null
  isJoining.value = true
  try {
    const data = await $fetch('/mahjong/api/game/join', {
      method: 'POST',
      body: { gameId, playerName: userName.value || 'Player ' + Math.floor(Math.random() * 1000) }
    })
    if (data?.success) {
      const { playerId, gameId: realGameId, isSpectator } = data.data
      const targetGameId = realGameId || gameId
      console.log('[Join] Joined game:', targetGameId, 'playerId:', playerId, 'spectator:', isSpectator)
      await navigateTo(buildGameRoomPath(targetGameId, playerId, !!isSpectator))
    } else {
      joinError.value = '无法加入牌局，请重试。'
    }
  } catch (err) {
    joinError.value = err instanceof Error ? err.message : '加入失败，请重试'
  } finally {
    isJoining.value = false
  }
}

onMounted(() => {
  fetchMyGames()
  fetchWaitingGames()
})
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
}

.mahjong-card.join-card {
  background: rgba(7, 19, 14, 0.94);
  border-radius: 20px;
  padding: 32px 36px;
  max-width: 640px;
  width: 90%;
  box-shadow: 0 18px 45px rgba(0, 0, 0, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.join-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

/* 我的牌局 */
.my-games-section {
  border: 1px solid rgba(255, 215, 0, 0.2);
  border-radius: 14px;
  padding: 16px;
  background: rgba(255, 215, 0, 0.03);
}

.my-games-section h2 {
  color: #ffd700;
}

.my-game-item {
  border-left: 3px solid rgba(255, 215, 0, 0.3);
}

.bot-badge {
  display: inline-block;
  background: rgba(255, 100, 100, 0.2);
  color: #ff9d9d;
  font-size: 0.7rem;
  padding: 2px 6px;
  border-radius: 4px;
  margin-left: 8px;
  font-weight: 700;
}

.phase-badge {
  display: inline-block;
  font-size: 0.7rem;
  padding: 2px 8px;
  border-radius: 4px;
  margin-left: 8px;
  font-weight: 700;
}

.phase-badge.waiting {
  background: rgba(100, 200, 255, 0.15);
  color: #64c8ff;
}

.phase-badge.playing {
  background: rgba(100, 255, 100, 0.15);
  color: #64ff64;
}

.my-game-actions {
  display: flex;
  gap: 8px;
}

.comeback {
  background: linear-gradient(135deg, #ff8c00, #ffa726);
  color: #fff;
  font-weight: 700;
  animation: comeback-pulse 2s infinite;
}

@keyframes comeback-pulse {
  0%, 100% { box-shadow: 0 0 10px rgba(255, 140, 0, 0.3); }
  50% { box-shadow: 0 0 20px rgba(255, 140, 0, 0.6); }
}

/* 输入房间号 */
.manual-join label {
  display: block;
  font-size: 0.9rem;
  margin-bottom: 6px;
  opacity: 0.9;
}

.manual-controls {
  display: flex;
  gap: 12px;
}

.manual-controls input {
  flex: 1;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(18, 43, 33, 0.9);
  color: #f5f5f5;
  padding: 12px 16px;
  font-size: 1rem;
}

/* 空闲牌桌 */
.mahjong-available {
  text-align: left;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding-top: 16px;
}

.available-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.available-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.available-item {
  background: rgba(18, 43, 33, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.available-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.available-id {
  font-weight: 600;
  letter-spacing: 0.02em;
}

.available-meta {
  font-size: 0.85rem;
  opacity: 0.85;
}

.available-empty,
.available-error {
  font-size: 0.9rem;
  opacity: 0.85;
}

/* 按钮 */
.mahjong-button {
  padding: 12px 24px;
  border-radius: 999px;
  border: none;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.95rem;
  transition: transform 0.12s ease, box-shadow 0.12s ease, filter 0.12s ease;
}

.mahjong-button.small {
  padding: 6px 16px;
  font-size: 0.85rem;
}

.mahjong-button.join {
  min-width: 80px;
}

.mahjong-button.primary {
  background: linear-gradient(135deg, #1f8a52, #46c574);
  color: #03100a;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.35);
}

.mahjong-button.secondary {
  background: rgba(22, 51, 40, 0.95);
  color: #e0f2e9;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.mahjong-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
