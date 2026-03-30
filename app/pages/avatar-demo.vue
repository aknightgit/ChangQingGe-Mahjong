<template>
  <div class="demo-page">
    <h1>🀄 Q版头像系统</h1>

    <!-- 表情展示 -->
    <section>
      <h2>表情状态</h2>
      <div class="demo-row">
        <div v-for="m in moods" :key="m" class="demo-cell">
          <PlayerAvatar name="AK" :mood="m" :size="80" />
          <span class="label">{{ moodLabels[m] }}</span>
        </div>
      </div>
    </section>

    <!-- 不同玩家 -->
    <section>
      <h2>随机头像（4人对局）</h2>
      <div class="demo-row">
        <div v-for="name in playerNames" :key="name" class="demo-cell">
          <PlayerAvatar :name="name" :size="80" />
          <span class="label">{{ name }}</span>
        </div>
      </div>
    </section>

    <!-- 配合 PlayerInfo -->
    <section>
      <h2>集成效果 (PlayerInfo)</h2>
      <div class="demo-row">
        <div v-for="(p, i) in players" :key="p.name" class="demo-cell">
          <PlayerInfo
            :name="p.name"
            :score="p.score"
            :position="p.position"
            :is-active="p.active"
            :is-dealer="p.dealer"
          />
          <PlayerAvatar :name="p.name" :mood="p.mood" :size="60" class="demo-avatar" />
        </div>
      </div>
    </section>

    <!-- 对局状态模拟 -->
    <section>
      <h2>对局状态</h2>
      <div class="demo-row">
        <div class="demo-cell">
          <PlayerAvatar name="AI-AK" mood="normal" :size="60" :is-active="true" />
          <span class="label">轮到我</span>
        </div>
        <div class="demo-cell">
          <PlayerAvatar name="AI-小胖" mood="thinking" :size="60" />
          <span class="label">思考中</span>
        </div>
        <div class="demo-cell">
          <PlayerAvatar name="AI-阿水" mood="impatient" :size="60" />
          <span class="label">不耐烦</span>
        </div>
        <div class="demo-cell">
          <PlayerAvatar name="AI-老赵" mood="angry" :size="60" />
          <span class="label">被截胡</span>
        </div>
        <div class="demo-cell">
          <PlayerAvatar name="AKnight" mood="winning" :size="60" />
          <span class="label">我胡了！</span>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import PlayerAvatar from '~/components/PlayerAvatar.vue'
import PlayerInfo from '~/components/PlayerInfo.vue'

const moods = ['normal', 'happy', 'angry', 'thinking', 'impatient', 'winning'] as const
const moodLabels: Record<string, string> = {
  normal: '正常',
  happy: '开心',
  angry: '生气',
  thinking: '思考中',
  impatient: '不耐烦',
  winning: '赢了！',
}

const playerNames = ['AI-AK', 'AI-小胖', 'AI-阿水', 'AI-老赵']

const players = [
  { name: 'AK', score: 120, position: 'bottom' as const, active: true, dealer: true, mood: 'normal' as const },
  { name: 'AI-小胖', score: -40, position: 'right' as const, active: false, dealer: false, mood: 'thinking' as const },
  { name: 'AI-阿水', score: 220, position: 'top' as const, active: false, dealer: false, mood: 'winning' as const },
  { name: 'AI-老赵', score: -60, position: 'left' as const, active: false, dealer: false, mood: 'impatient' as const },
]
</script>

<style scoped>
.demo-page {
  background: #1a1a2e;
  min-height: 100vh;
  padding: 24px;
  color: #eee;
  font-family: system-ui, sans-serif;
}

h1 {
  text-align: center;
  margin-bottom: 32px;
  font-size: 1.6rem;
}

section {
  margin-bottom: 40px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 20px;
}

h2 {
  font-size: 1rem;
  margin-bottom: 16px;
  color: #aaa;
}

.demo-row {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
  align-items: flex-end;
}

.demo-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.demo-avatar {
  margin-top: 8px;
}

.label {
  font-size: 0.75rem;
  color: #aaa;
}
</style>
