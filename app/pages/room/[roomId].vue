<template>
  <div class="waiting-room">
    <header class="waiting-header">
      <button class="back-btn" @click="goBack">← 返回</button>
      <h2 class="room-number-title">房间号 <span class="room-num">{{ roomNumber }}</span></h2>
      <div class="room-phase-badge" :class="'phase-'+roomPhase">{{ phaseLabel }}</div>
    </header>

    <section class="news-section">
      <h4 class="section-title">📢 牌局快讯</h4>
      <div class="news-feed" ref="newsFeedRef">
        <div v-for="msg in roomMessages" :key="msg.time" class="news-item">{{ msg.text }}</div>
      </div>
    </section>

    <section class="players-section">
      <h4 class="section-title">👥 玩家列表（{{ playerCount }}/4）</h4>
      <div class="player-grid">
        <div v-for="p in roomPlayers" :key="p.id" class="player-card" :class="{ 'is-owner': p.isOwner }">
          <div class="player-avatar">{{ p.name[0] }}</div>
          <div class="player-info">
            <div class="player-name">{{ p.name }}</div>
            <div class="player-badge" v-if="p.isOwner">👑 房主</div>
          </div>
        </div>
        <div v-for="n in emptySlots" :key="'e-'+n" class="player-card player-card--empty">
          <div class="player-avatar">?</div>
          <div class="player-info"><div class="player-name">等待加入...</div></div>
        </div>
      </div>
    </section>

    <section class="actions-section">
      <div class="share-hint" v-if="!isOwner && roomPhase==='waiting'">等待房主开始牌局...</div>
      <div class="share-hint" v-else-if="roomPhase==='waiting'">等待更多玩家加入...</div>
      <button v-if="isOwner && roomPhase==='ready'" class="start-btn" @click="startGame">🎮 开始牌局</button>
    </section>

    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner">🀄</div>
      <p>{{ loadingText }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'


const route = useRoute()
const router = useRouter()
const roomNumber = computed(() => String(route.params.roomId || ''))

const roomPhase = ref<'waiting'|'ready'|'playing'|'ended'>('waiting')
const roomPlayers = ref<Array<{id:string;name:string;isOwner:boolean}>>([])
const roomMessages = ref<Array<{text:string;time:number}>>([])
const myPlayerId = ref('')
const loading = ref(false)
const loadingText = ref('')
const newsFeedRef = ref<HTMLElement|null>(null)

const playerCount = computed(() => roomPlayers.value.length)
const availableBotNames = ['AI-小胖', 'AI-老赵', 'AI-阿水', 'AI-AK', 'AI-老蒋', 'AI-小猪']
const selectedBotsForGame = computed(() => {
  const needed = 4 - playerCount.value
  if (needed <= 0) return []
  const used = new Set(roomPlayers.value.map(p => p.name))
  return availableBotNames.filter(n => !used.has(n)).slice(0, needed)
})
const emptySlots = computed(() => Math.max(0, 4 - playerCount.value))
const isOwner = computed(() => roomPlayers.value.some(p => p.isOwner && p.id === myPlayerId.value))
const phaseLabel = computed(() => {
  const m: Record<string,string> = {waiting:'等待中',ready:'🀄 准备就绪',playing:'游戏中',ended:'已结束'}
  return m[roomPhase.value] || ''
})

let pollTimer: ReturnType<typeof setInterval>|null = null

async function pollRoomState() {
  try {
    const data = await $fetch(`/api/room/state?roomNumber=${roomNumber.value}`)
    if (!data || !data.success || !data.room) {
      if (pollTimer) clearInterval(pollTimer)
      router.replace('/')
      return
    }
    const r = data.room
    roomPhase.value = r.phase
    roomPlayers.value = r.players
    roomMessages.value = r.messages
    if (r.phase === 'playing') {
      if (pollTimer) clearInterval(pollTimer)
      router.replace(`/gameroom/${roomNumber.value}`)
    }
  } catch (_) {}
}

watch(roomMessages, async () => {
  await nextTick()
  if (newsFeedRef.value) newsFeedRef.value.scrollTop = newsFeedRef.value.scrollHeight
})

async function startGame() {
  loading.value = true; loadingText.value = '正在创建牌局...'
  try {
    const res = await fetch('/api/game/create', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ roomNumber: roomNumber.value, selectedBots: selectedBotsForGame.value, maxBots: 3, minPlayers: 4 })
    })
    const data = await res.json()
    if (!data.success) throw new Error(data.message || '创建失败')

    await $fetch('/api/room/mark-playing', {
      method: 'POST',
      body: { roomNumber: roomNumber.value }
    })

    router.replace(`/gameroom/${roomNumber.value}?playerId=${myPlayerId.value}`)
  } catch (e: any) {
    loading.value = false; alert('创建失败：'+(e.message||'未知错误'))
  }
}

function goBack() {
  if (myPlayerId.value && roomNumber.value) {
    fetch('/api/room/leave', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({roomNumber:roomNumber.value,playerId:myPlayerId.value}) }).catch(()=>{})
  }
  router.replace('/')
}

onMounted(async () => {
  myPlayerId.value = route.query.playerId as string || sessionStorage.getItem('mahjong.playerId') || ''
  if (!myPlayerId.value) { router.replace('/'); return }
  await pollRoomState()
  pollTimer = setInterval(pollRoomState, 1500)
})

onUnmounted(() => { if (pollTimer) clearInterval(pollTimer) })
</script>

<style scoped>
.waiting-room{max-width:480px;margin:0 auto;padding:16px;min-height:100vh;display:flex;flex-direction:column;gap:16px}
.waiting-header{display:flex;align-items:center;gap:12px;padding:12px 16px;background:var(--card-bg,#1a1d2e);border-radius:12px}
.back-btn{background:none;border:none;color:var(--text-secondary,#8892b0);font-size:14px;cursor:pointer;padding:4px 8px}
.room-number-title{flex:1;font-size:16px;margin:0}
.room-num{font-size:24px;font-weight:700;color:var(--accent,#ffd700);letter-spacing:4px}
.room-phase-badge{padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600}
.phase-waiting{background:#2d3748;color:#a0aec0}
.phase-ready{background:#22543d;color:#68d391;animation:pulse 2s infinite}
.phase-playing{background:#2b6cb0;color:#90cdf4}
.phase-ended{background:#4a5568;color:#a0aec0}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.7}}
.news-section{background:var(--card-bg,#1a1d2e);border-radius:12px;padding:12px}
.section-title{margin:0 0 8px;font-size:14px;color:var(--text-secondary,#8892b0)}
.news-feed{max-height:120px;overflow-y:auto;display:flex;flex-direction:column;gap:4px}
.news-item{font-size:13px;color:var(--text,#ccd6f6);padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.05)}
.players-section{flex:1}
.player-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.player-card{display:flex;align-items:center;gap:10px;padding:12px;background:var(--card-bg,#1a1d2e);border-radius:12px;border:1px solid rgba(255,255,255,0.08)}
.player-card.is-owner{border-color:var(--accent,#ffd700);box-shadow:0 0 8px rgba(255,215,0,0.15)}
.player-card--empty{opacity:0.4;border-style:dashed}
.player-avatar{width:40px;height:40px;border-radius:50%;background:var(--accent-dim,#2d3748);display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700}
.player-card.is-owner .player-avatar{background:linear-gradient(135deg,#ffd700,#f5a623);color:#1a1d2e}
.player-info{flex:1;min-width:0}
.player-name{font-size:14px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.player-badge{font-size:11px;color:var(--accent,#ffd700)}
.actions-section{text-align:center;padding:16px 0}
.share-hint{font-size:13px;color:var(--text-secondary,#8892b0)}
.start-btn{padding:14px 48px;font-size:18px;font-weight:700;background:linear-gradient(135deg,#48bb78,#38a169);color:#fff;border:none;border-radius:12px;cursor:pointer;box-shadow:0 4px 12px rgba(72,187,120,0.3)}
.start-btn:active{transform:scale(0.97)}
.loading-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.7);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:100;color:#fff}
.loading-spinner{font-size:48px;animation:spin 1s linear infinite}
@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
</style>
