<template>
  <div class="create-page">
    <div class="create-shell">
      <header class="create-header">
        <div>
          <h1 class="create-title">🀄 创建牌局</h1>
          <p class="create-subtitle">整页设置，手机上可直接上下滑动。</p>
        </div>
        <button class="nav-btn" @click="goBack">返回大厅</button>
      </header>

      <div class="create-content">
        <section class="param-group">
          <h3 class="param-group-title">⚙️ 基础设置</h3>

          <div class="create-field">
            <div class="field-header">
              <label>结算膨胀倍数</label>
              <button class="help-btn" @click="toggleHelp('settle')">?</button>
            </div>
            <input type="number" v-model.number="createParams.settlementMultiplier" min="1" max="10" />
            <span v-if="activeHelp === 'settle'" class="help-bubble">最终结算时，所有分数额外乘以此倍数。默认10倍。</span>
          </div>

          <div class="create-field">
            <div class="field-header">
              <label>掷骰子次数</label>
              <button class="help-btn" @click="toggleHelp('dice')">?</button>
            </div>
            <input type="number" v-model.number="createParams.maxDiceRolls" min="1" max="10" />
            <span v-if="activeHelp === 'dice'" class="help-bubble">决定发牌起始位置。默认2次。</span>
          </div>

          <div class="create-field">
            <div class="field-header">
              <label>决策犹豫期（秒）</label>
              <button class="help-btn" @click="toggleHelp('hesitation')">?</button>
            </div>
            <input type="number" v-model.number="createParams.hesitationSeconds" min="0.5" max="10" step="0.5" />
            <span v-if="activeHelp === 'hesitation'" class="help-bubble">上家打出牌后，所有玩家做吃/碰/杠/胡决策的时间窗口。默认5秒。</span>
          </div>

          <div class="create-field create-field--checkbox">
            <label class="checkbox-label">
              <input type="checkbox" v-model="createParams.firstRoundDouble" />
              <span>首局翻倍</span>
              <button class="help-btn help-btn--inline" @click="toggleHelp('double')">?</button>
            </label>
            <span v-if="activeHelp === 'double'" class="help-bubble">今天第一局全局倍数 ×2。默认开启。</span>
          </div>
        </section>

        <section class="param-group">
          <h3 class="param-group-title">🔥 特殊玩法</h3>

          <div class="create-field">
            <div class="field-header">
              <label>被聚义QJ线</label>
              <button class="help-btn" @click="toggleHelp('qj')">?</button>
            </div>
            <input type="number" v-model.number="createParams.liangShanThreshold" min="0" max="99999" step="100" />
            <span v-if="activeHelp === 'qj'" class="help-bubble">累积赢分超过此值的玩家，在梁山聚义投票时无否决权。默认4000。</span>
          </div>

          <div class="create-field">
            <div class="field-header">
              <label>等我想一想 次数</label>
              <button class="help-btn" @click="toggleHelp('think')">?</button>
            </div>
            <input type="number" v-model.number="createParams.thinkChances" min="0" max="10" />
            <span v-if="activeHelp === 'think'" class="help-bubble">每局限N次。默认3次。</span>
          </div>
        </section>

        <section class="param-group">
          <h3 class="param-group-title">🤖 AI玩家</h3>
          <div class="create-field">
            <label>AI玩家上限</label>
            <select v-model.number="createParams.maxBots">
              <option :value="0">0 - 禁止AI加入</option>
              <option :value="1">1个</option>
              <option :value="2">2个</option>
              <option :value="3">3个（默认）</option>
            </select>
          </div>

          <button v-if="createParams.maxBots > 0" class="ai-toggle-btn" @click="showAISelection = !showAISelection">
            {{ showAISelection ? '▼ 收起' : '▶ 选择AI玩家' }}
            <span v-if="selectedBots.length" class="ai-count-badge">{{ selectedBots.length }}/3</span>
          </button>

          <div v-if="showAISelection" class="ai-select-list">
            <label
              v-for="bot in allAIBots"
              :key="bot.id"
              class="ai-select-item"
              :class="{ 'ai-select-item--active': selectedBots.includes(bot.id) }"
            >
              <input
                type="checkbox"
                :value="bot.id"
                v-model="selectedBots"
                :disabled="!selectedBots.includes(bot.id) && selectedBots.length >= createParams.maxBots"
              />
              <span class="ai-select-name">{{ bot.name }}</span>
              <span class="ai-select-desc">{{ bot.desc }}</span>
            </label>
          </div>

          <span class="create-hint" v-if="selectedBots.length > 0">
            已选 {{ selectedBots.length }} 个AI，还需 {{ 4 - selectedBots.length - 1 }} 位真人
          </span>
        </section>
      </div>

      <div class="create-actions">
        <button class="create-btn create-btn--cancel" @click="goBack">取消</button>
        <button
          type="button"
          class="create-btn create-btn--start"
          :disabled="isCreatingGame"
          @click="confirmCreateGame"
        >
          {{ isCreatingGame ? '创建中...' : '创建新局' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ ssr: false })

const PENDING_ROOM_STORAGE_KEY = 'mahjong-pending-room-target'
const PENDING_ROOM_TTL_MS = 8000

const savePendingRoomTarget = (targetUrl: string) => {
  if (!process.client) return
  try {
    sessionStorage.setItem(PENDING_ROOM_STORAGE_KEY, JSON.stringify({ targetUrl, createdAt: Date.now() }))
  } catch {}
}

const clearPendingRoomTarget = () => {
  if (!process.client) return
  try { sessionStorage.removeItem(PENDING_ROOM_STORAGE_KEY) } catch {}
}

const userName = useCookie('user_name')
const router = useRouter()
const isCreatingGame = ref(false)
const activeHelp = ref<string | null>(null)
const showAISelection = ref(true)

const toggleHelp = (key: string) => {
  activeHelp.value = activeHelp.value === key ? null : key
}

const createParams = reactive({
  maxDiceRolls: 2,
  hesitationSeconds: 5,
  firstRoundDouble: true,
  liangShanThreshold: 4000,
  thinkChances: 3,
  settlementMultiplier: 10,
  maxBots: 3
})

const allAIBots = [
  { id: 'AI-小胖', name: 'AI-小胖', desc: '稳健型' },
  { id: 'AI-老赵', name: 'AI-老赵', desc: '进攻型' },
  { id: 'AI-阿水', name: 'AI-阿水', desc: '做大做强型' },
  { id: 'AI-AK', name: 'AI-AK', desc: '默认策略' },
  { id: 'AI-老蒋', name: 'AI-老蒋', desc: '均衡型' },
  { id: 'AI-小猪', name: 'AI-小猪', desc: '风险规避型' }
]
const selectedBots = ref<string[]>([])

watch(() => createParams.maxBots, (newMax) => {
  if (selectedBots.value.length > newMax) selectedBots.value = selectedBots.value.slice(0, newMax)
})

const navigateToCreatedRoom = async (targetUrl: string) => {
  savePendingRoomTarget(targetUrl)
  try {
    await router.push(targetUrl)
  } catch (error) {
    console.warn('[CreatePage] router.push failed, fallback to location.assign', error)
  }
  if (!process.client) return
  const currentPath = window.location.pathname
  if (currentPath === targetUrl.split('?')[0]) {
    clearPendingRoomTarget()
    return
  }
  window.location.assign(targetUrl)
}

const confirmCreateGame = async () => {
  if (isCreatingGame.value) return
  isCreatingGame.value = true
  try {
    const response = await $fetch('/api/game/create', {
      method: 'POST',
      body: {
        playerName: userName.value || 'Player 1',
        diceRollCount: createParams.maxDiceRolls,
        firstRoundDouble: createParams.firstRoundDouble,
        liangShanThreshold: createParams.liangShanThreshold,
        thinkChances: createParams.thinkChances,
        settlementMultiplier: createParams.settlementMultiplier,
        maxBots: createParams.maxBots,
        hesitationWindow: Math.round(createParams.hesitationSeconds * 1000)
      },
      headers: { 'Cache-Control': 'no-cache' }
    })

    if (!response?.success) {
      alert('创建失败，请重试')
      return
    }

    const gameId = response.data?.gameId
    const playerId = response.data?.playerId
    if (!gameId || !playerId) {
      alert('创建失败：服务端未返回有效数据')
      return
    }

    const targetUrl = `/gameroom/${gameId}?playerId=${playerId}&dice=${createParams.maxDiceRolls}`
    const botsToJoin = selectedBots.value.slice(0, createParams.maxBots)

    await navigateToCreatedRoom(targetUrl)

    if (botsToJoin.length) {
      Promise.allSettled(
        botsToJoin.map(botId =>
          $fetch('/api/game/join', {
            method: 'POST',
            body: { gameId, playerName: botId },
            headers: { 'Cache-Control': 'no-cache' }
          })
        )
      )
    }
  } catch (e: any) {
    if (e?.status === 401 || e?.statusCode === 401 || e?.data?.statusCode === 401) {
      useCookie('auth_token').value = null
      useCookie('user_id').value = null
      useCookie('user_name').value = null
      await navigateTo('/login')
      return
    }
    alert('创建房间失败：' + (e?.message || '未知错误'))
  } finally {
    isCreatingGame.value = false
  }
}

const goBack = () => navigateTo('/')
</script>

<style scoped>
.create-page {
  min-height: 100vh;
  background: radial-gradient(circle at top, #153b2f, #07130e);
  color: #f5f5f5;
  padding: max(12px, env(safe-area-inset-top)) 12px max(96px, calc(96px + env(safe-area-inset-bottom)));
}

.create-shell {
  width: min(760px, 100%);
  margin: 0 auto;
  background: rgba(7, 19, 14, 0.94);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 20px;
  padding: 20px;
  box-shadow: 0 18px 45px rgba(0,0,0,0.45);
}

.create-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 20px;
}

.create-title { font-size: 1.5rem; margin: 0 0 6px; }
.create-subtitle { margin: 0; opacity: 0.82; font-size: 0.92rem; }

.nav-btn {
  border: none;
  border-radius: 12px;
  background: rgba(255,255,255,0.08);
  color: #fff;
  padding: 10px 14px;
}

.create-content {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.param-group {
  padding-bottom: 14px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.param-group:last-child { border-bottom: none; }
.param-group-title {
  font-size: 0.9rem;
  color: rgba(255,255,255,0.65);
  margin: 0 0 12px;
}

.create-field { margin-bottom: 14px; }
.field-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}
.field-header label, .create-field > label {
  color: #e0e0e0;
  font-size: 0.95rem;
  font-weight: 600;
}

.create-field input,
.create-field select {
  width: 100%;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.15);
  background: rgba(0,0,0,0.3);
  color: #fff;
  box-sizing: border-box;
}

.create-field--checkbox {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-weight: 600;
}
.checkbox-label input[type='checkbox'] {
  width: 18px;
  height: 18px;
  accent-color: #46c574;
}

.help-btn {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.2);
  background: rgba(255,255,255,0.05);
  color: rgba(255,255,255,0.75);
}
.help-btn--inline { margin-left: 4px; }
.help-bubble {
  display: block;
  margin-top: 6px;
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(100, 200, 255, 0.08);
  border: 1px solid rgba(100, 200, 255, 0.15);
  font-size: 0.8rem;
  line-height: 1.5;
}

.ai-toggle-btn {
  width: 100%;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.1);
  background: rgba(0,0,0,0.2);
  color: #fff;
  text-align: left;
}
.ai-count-badge {
  float: right;
  background: rgba(70,197,116,0.18);
  color: #7df0a6;
  padding: 2px 8px;
  border-radius: 999px;
}
.ai-select-list {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.ai-select-item {
  display: grid;
  grid-template-columns: 24px 1fr auto;
  gap: 10px;
  align-items: center;
  padding: 12px;
  border-radius: 12px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.06);
}
.ai-select-item--active {
  border-color: rgba(70,197,116,0.45);
  background: rgba(70,197,116,0.08);
}
.ai-select-name { font-weight: 700; }
.ai-select-desc { font-size: 0.8rem; opacity: 0.72; }
.create-hint {
  display: block;
  margin-top: 10px;
  opacity: 0.78;
  font-size: 0.84rem;
}

.create-actions {
  position: sticky;
  bottom: 0;
  margin: 20px -20px -20px;
  padding: 14px 20px calc(14px + env(safe-area-inset-bottom));
  display: flex;
  gap: 12px;
  background: linear-gradient(to top, rgba(13,31,23,0.98) 78%, rgba(13,31,23,0));
  border-top: 1px solid rgba(255,255,255,0.06);
}
.create-btn {
  flex: 1;
  padding: 14px;
  border-radius: 12px;
  border: none;
  font-size: 1rem;
  font-weight: 700;
}
.create-btn--cancel {
  background: rgba(255,255,255,0.08);
  color: #ddd;
}
.create-btn--start {
  background: linear-gradient(135deg, #1f8a52, #2eaa6a);
  color: #fff;
}

@media (max-width: 600px) {
  .create-shell { padding: 16px; }
  .create-header { flex-direction: column; }
  .nav-btn { width: 100%; }
  .ai-select-item {
    grid-template-columns: 24px 1fr;
  }
  .ai-select-desc {
    grid-column: 2;
  }
  .create-actions {
    margin: 20px -16px -16px;
    padding-left: 16px;
    padding-right: 16px;
  }
}
</style>
