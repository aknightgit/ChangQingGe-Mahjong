<template>
  <div class="room-stats">
    <div class="stats-header">
      <span class="stats-title">🏆 战绩榜</span>
      <span class="stats-round">第 {{ currentRound }} 局</span>
    </div>

    <!-- 积分排名 -->
    <div class="stats-ranking">
      <div
        v-for="(player, i) in rankedPlayers"
        :key="player.id"
        class="rank-row"
        :class="{ 'rank-winner': i === 0 && player.score > 0, 'rank-me': player.isMe }"
      >
        <span class="rank-pos">
          <span class="rank-medal" v-if="i === 0">🥇</span>
          <span class="rank-medal" v-else-if="i === 1">🥈</span>
          <span class="rank-medal" v-else-if="i === 2">🥉</span>
          <span v-else class="rank-num">{{ i + 1 }}</span>
        </span>
        <span class="rank-dot" :class="`dot--${player.color}`"></span>
        <span class="rank-name" :class="{ 'rank-name--me': player.isMe }">{{ player.name }}</span>
        <span v-if="i === 0 && player.score > 0" class="rank-star">⭐</span>
        <span class="rank-score" :class="player.score > 0 ? 'sc-pos' : player.score < 0 ? 'sc-neg' : ''">
          {{ player.score > 0 ? '+' : '' }}{{ player.score }}
        </span>
      </div>
    </div>

    <!-- 输赢盘数 -->
    <div class="stats-record">
      <div v-for="player in rankedPlayers" :key="'r-' + player.id" class="record-row">
        <span class="record-name">{{ player.name }}</span>
        <span class="record-wins">{{ player.wins }}胜</span>
        <span class="record-losses">{{ player.losses }}负</span>
        <span class="record-bar">
          <span class="bar-fill" :style="{ width: winRate(player) + '%' }"></span>
        </span>
      </div>
    </div>

    <!-- 观赛模式 -->
    <div class="stats-spectate">
      <p class="spectate-title">👁️ 观赛视角</p>
      <div class="spectate-btns">
        <button
          v-for="p in rankedPlayers"
          :key="'s-' + p.id"
          class="spectate-btn"
          :class="{ active: spectatingId === p.id }"
          @click="$emit('spectate', p.id)"
        >
          {{ p.name }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface PlayerStat {
  id: string
  name: string
  score: number
  wins: number
  losses: number
  color: string
  isMe: boolean
}

const props = defineProps<{
  players: PlayerStat[]
  currentRound: number
  spectatingId?: string | null
}>()

defineEmits<{ spectate: [id: string] }>()

const rankedPlayers = computed(() =>
  [...props.players].sort((a, b) => b.score - a.score)
)

const winRate = (p: PlayerStat) => {
  const total = p.wins + p.losses
  return total > 0 ? (p.wins / total) * 100 : 0
}
</script>

<style scoped>
.room-stats {
  width: 380px;
  min-width: 280px;
  max-width: 460px;
  background: linear-gradient(180deg, #1a0a2e 0%, #0d1b3e 50%, #0a2020 100%);
  border-radius: 16px;
  border: 2px solid rgba(255, 215, 0, 0.2);
  box-shadow: 0 0 20px rgba(255, 215, 0, 0.1), inset 0 0 30px rgba(0, 0, 0, 0.3);
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  color: #e0e0e0;
  font-size: 0.8rem;
  overflow-y: auto;
}

.stats-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 215, 0, 0.15);
}

.stats-title {
  font-size: 1rem;
  font-weight: 700;
  color: #ffd700;
  text-shadow: 0 0 8px rgba(255, 215, 0, 0.4);
}

.stats-round {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
}

/* 排名 */
.stats-ranking {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.rank-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  transition: background 0.2s;
}

.rank-row.rank-winner {
  background: rgba(255, 215, 0, 0.12);
  border: 1px solid rgba(255, 215, 0, 0.2);
}

.rank-row.rank-me {
  border-left: 3px solid #ffd700;
}

.rank-medal { font-size: 1rem; }
.rank-num { font-size: 0.75rem; color: rgba(255,255,255,0.4); width: 16px; text-align: center; }

.rank-dot {
  width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
}
.dot--east { background: #f44336; box-shadow: 0 0 4px rgba(244,67,54,0.5); }
.dot--south { background: #4caf50; box-shadow: 0 0 4px rgba(76,175,80,0.5); }
.dot--west { background: #2196f3; box-shadow: 0 0 4px rgba(33,150,243,0.5); }
.dot--north { background: #ffc107; box-shadow: 0 0 4px rgba(255,193,7,0.5); }

.rank-name { flex: 1; font-weight: 600; }
.rank-name--me { color: #ffd700; }
.rank-star { font-size: 0.8rem; animation: glow 1.5s infinite; }

@keyframes glow {
  0%, 100% { text-shadow: 0 0 4px rgba(255,215,0,0.4); }
  50% { text-shadow: 0 0 12px rgba(255,215,0,0.8); }
}

.rank-score { font-weight: 700; font-size: 0.85rem; }
.sc-pos { color: #66bb6a; }
.sc-neg { color: #ef5350; }

/* 输赢盘数 */
.stats-record {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.record-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.7rem;
}
.record-name { width: 48px; font-weight: 600; }
.record-wins { color: #66bb6a; }
.record-losses { color: #ef5350; }
.record-bar {
  flex: 1; height: 4px; background: rgba(255,255,255,0.08); border-radius: 2px; overflow: hidden;
}
.bar-fill {
  height: 100%; background: linear-gradient(90deg, #66bb6a, #4caf50); border-radius: 2px;
  transition: width 0.3s;
}

/* 观赛 */
.stats-spectate {
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}
.spectate-title {
  font-size: 0.75rem; color: rgba(255,255,255,0.5); margin-bottom: 6px;
}
.spectate-btns {
  display: flex; flex-wrap: wrap; gap: 4px;
}
.spectate-btn {
  padding: 3px 10px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.15);
  background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.6);
  font-size: 0.7rem; cursor: pointer; transition: all 0.2s;
}
.spectate-btn:hover { background: rgba(255,255,255,0.1); }
.spectate-btn.active {
  background: rgba(255, 215, 0, 0.2); border-color: rgba(255, 215, 0, 0.5);
  color: #ffd700;
}

@media (max-width: 1100px) {
  .room-stats {
    width: 280px;
    min-width: 240px;
  }
}
</style>
