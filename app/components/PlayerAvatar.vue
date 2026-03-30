<template>
  <div
    class="player-avatar"
    :class="[`avatar--${mood}`, { 'avatar--active': isActive }]"
    :style="colorScheme"
  >
    <svg viewBox="0 0 100 100" class="avatar-svg">
      <!-- 脸 -->
      <circle cx="50" cy="52" r="38" class="face" />

      <!-- 腮红 -->
      <ellipse cx="28" cy="60" rx="8" ry="5" class="blush" />
      <ellipse cx="72" cy="60" rx="8" ry="5" class="blush" />

      <!-- 头发 -->
      <g class="hair">
        <!-- 发型1: 经典刘海 -->
        <template v-if="hairStyle === 0">
          <path d="M12 42 Q20 18 50 14 Q80 18 88 42 Q84 30 50 22 Q16 30 12 42Z" fill="var(--hair-color)" />
        </template>
        <!-- 发型2: 分头 -->
        <template v-else-if="hairStyle === 1">
          <path d="M12 42 Q20 18 50 14 Q80 18 88 42 Q84 30 50 22 Q16 30 12 42Z" fill="var(--hair-color)" />
          <path d="M50 14 Q48 22 52 28" stroke="var(--skin-shadow)" stroke-width="2" fill="none" />
        </template>
        <!-- 发型3: 刺猬头 -->
        <template v-else-if="hairStyle === 2">
          <path d="M14 40 Q18 14 30 18 Q28 8 42 14 Q44 4 50 12 Q56 4 58 14 Q72 8 70 18 Q82 14 86 40 Q82 28 50 22 Q18 28 14 40Z" fill="var(--hair-color)" />
        </template>
        <!-- 发型4: 侧分长发 -->
        <template v-else-if="hairStyle === 3">
          <path d="M12 42 Q20 18 50 14 Q80 18 88 42 Q84 30 50 22 Q16 30 12 42Z" fill="var(--hair-color)" />
          <path d="M12 42 Q8 52 14 68 Q18 62 16 42Z" fill="var(--hair-color)" />
          <path d="M88 42 Q92 52 86 68 Q82 62 84 42Z" fill="var(--hair-color)" />
        </template>
        <!-- 发型5: 呆毛 -->
        <template v-else>
          <path d="M14 42 Q22 18 50 14 Q78 18 86 42 Q82 30 50 22 Q18 30 14 42Z" fill="var(--hair-color)" />
          <path d="M55 14 Q58 4 62 6 Q60 12 58 18Z" fill="var(--hair-color)" />
        </template>
      </g>

      <!-- 眉毛 -->
      <g class="eyebrows">
        <template v-if="mood === 'angry'">
          <line x1="30" y1="38" x2="40" y2="40" stroke="var(--hair-color)" stroke-width="2.5" stroke-linecap="round" />
          <line x1="60" y1="40" x2="70" y2="38" stroke="var(--hair-color)" stroke-width="2.5" stroke-linecap="round" />
        </template>
        <template v-else-if="mood === 'thinking'">
          <line x1="30" y1="40" x2="40" y2="38" stroke="var(--hair-color)" stroke-width="2" stroke-linecap="round" />
          <line x1="60" y1="38" x2="70" y2="40" stroke="var(--hair-color)" stroke-width="2" stroke-linecap="round" />
        </template>
        <template v-else>
          <line x1="30" y1="40" x2="40" y2="40" stroke="var(--hair-color)" stroke-width="2" stroke-linecap="round" />
          <line x1="60" y1="40" x2="70" y2="40" stroke="var(--hair-color)" stroke-width="2" stroke-linecap="round" />
        </template>
      </g>

      <!-- 眼睛 -->
      <g class="eyes">
        <!-- 正常/思考 -->
        <template v-if="mood === 'normal' || mood === 'thinking'">
          <ellipse cx="35" cy="48" rx="6" ry="7" class="eye-white" />
          <circle cx="35" cy="49" r="4" class="pupil" />
          <circle cx="37" cy="47" r="1.5" class="eye-shine" />
          <ellipse cx="65" cy="48" rx="6" ry="7" class="eye-white" />
          <circle cx="65" cy="49" r="4" class="pupil" />
          <circle cx="67" cy="47" r="1.5" class="eye-shine" />
        </template>
        <!-- 开心 -->
        <template v-else-if="mood === 'happy' || mood === 'winning'">
          <path d="M28 48 Q35 42 42 48" stroke="var(--pupil-color)" stroke-width="3" fill="none" stroke-linecap="round" />
          <path d="M58 48 Q65 42 72 48" stroke="var(--pupil-color)" stroke-width="3" fill="none" stroke-linecap="round" />
        </template>
        <!-- 生气 -->
        <template v-else-if="mood === 'angry'">
          <ellipse cx="35" cy="48" rx="6" ry="7" class="eye-white" />
          <circle cx="35" cy="50" r="4" class="pupil" />
          <ellipse cx="65" cy="48" rx="6" ry="7" class="eye-white" />
          <circle cx="65" cy="50" r="4" class="pupil" />
        </template>
        <!-- 不耐烦 -->
        <template v-else-if="mood === 'impatient'">
          <ellipse cx="35" cy="48" rx="5" ry="3" class="eye-white" />
          <circle cx="35" cy="48" r="3" class="pupil" />
          <ellipse cx="65" cy="48" rx="5" ry="3" class="eye-white" />
          <circle cx="65" cy="48" r="3" class="pupil" />
        </template>
        <!-- 默认 -->
        <template v-else>
          <ellipse cx="35" cy="48" rx="6" ry="7" class="eye-white" />
          <circle cx="35" cy="49" r="4" class="pupil" />
          <circle cx="37" cy="47" r="1.5" class="eye-shine" />
          <ellipse cx="65" cy="48" rx="6" ry="7" class="eye-white" />
          <circle cx="65" cy="49" r="4" class="pupil" />
          <circle cx="67" cy="47" r="1.5" class="eye-shine" />
        </template>
      </g>

      <!-- 嘴巴 -->
      <g class="mouth">
        <!-- 正常: 微笑 -->
        <path v-if="mood === 'normal'" d="M40 66 Q50 74 60 66" stroke="var(--mouth-color)" stroke-width="2.5" fill="none" stroke-linecap="round" />
        <!-- 开心: 大笑 -->
        <template v-else-if="mood === 'happy'">
          <path d="M36 64 Q50 78 64 64" stroke="var(--mouth-color)" stroke-width="2.5" fill="#fff" stroke-linecap="round" />
          <path d="M42 68 Q50 73 58 68" fill="#f48fb1" />
        </template>
        <!-- 生气: 嘟嘴 -->
        <template v-else-if="mood === 'angry'">
          <ellipse cx="50" cy="68" rx="6" ry="5" fill="var(--mouth-color)" />
          <circle cx="50" cy="66" r="3" fill="#fff" />
        </template>
        <!-- 思考: 歪嘴 -->
        <path v-else-if="mood === 'thinking'" d="M42 68 Q52 66 58 70" stroke="var(--mouth-color)" stroke-width="2.5" fill="none" stroke-linecap="round" />
        <!-- 不耐烦: 线条嘴 -->
        <line v-else-if="mood === 'impatient'" x1="40" y1="68" x2="60" y2="68" stroke="var(--mouth-color)" stroke-width="2.5" stroke-linecap="round" />
        <!-- 胜利: 大笑 -->
        <template v-else-if="mood === 'winning'">
          <path d="M34 64 Q50 80 66 64" stroke="var(--mouth-color)" stroke-width="2.5" fill="#fff" stroke-linecap="round" />
          <path d="M40 70 Q50 77 60 70" fill="#f48fb1" />
        </template>
        <!-- 默认 -->
        <path v-else d="M40 66 Q50 74 60 66" stroke="var(--mouth-color)" stroke-width="2.5" fill="none" stroke-linecap="round" />
      </g>

      <!-- 胜利星星特效 -->
      <g v-if="mood === 'winning'" class="winning-stars">
        <polygon points="20,20 22,26 28,26 23,30 25,36 20,32 15,36 17,30 12,26 18,26" fill="#FFD700" class="star star--1" />
        <polygon points="80,18 82,24 88,24 83,28 85,34 80,30 75,34 77,28 72,24 78,24" fill="#FFD700" class="star star--2" />
        <polygon points="50,8 51,12 55,12 52,15 53,19 50,17 47,19 48,15 45,12 49,12" fill="#FFD700" class="star star--3" />
      </g>

      <!-- 思考泡泡 -->
      <g v-if="mood === 'thinking'" class="thinking-bubbles">
        <circle cx="82" cy="22" r="4" fill="rgba(255,255,255,0.6)" />
        <circle cx="88" cy="14" r="3" fill="rgba(255,255,255,0.5)" />
        <circle cx="91" cy="7" r="2" fill="rgba(255,255,255,0.4)" />
      </g>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export type AvatarMood = 'normal' | 'happy' | 'angry' | 'thinking' | 'impatient' | 'winning'

const props = defineProps<{
  name: string
  mood?: AvatarMood
  isActive?: boolean
  size?: number
}>()

// 基于名字生成确定性随机参数
function nameHash(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i++) {
    h = ((h << 5) - h + name.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

const skinIndex = computed(() => nameHash(props.name) % SKIN_COLORS.length)
const hairIndex = computed(() => (nameHash(props.name + 'hair') % HAIR_COLORS.length))
const hairStyle = computed(() => nameHash(props.name + 'style') % 6)

// 配色方案
const SKIN_COLORS = [
  ['#FFE0BD', '#D4A373'],  // 暖白
  ['#F5D0A9', '#C4956A'],  // 小麦色
  ['#FFDCB1', '#D0A87C'],  // 蜜桃
  ['#E8C4A0', '#B89470'],  // 蜜色
  ['#F0D5BE', '#C8A48C'],  // 浅蜜
]

const HAIR_COLORS = [
  '#2C1810',  // 黑发
  '#4A3728',  // 棕发
  '#8B4513',  // 深棕
  '#D4A017',  // 金发
  '#B22222',  // 红发
  '#4169E1',  // 蓝发（彩）
  '#9B59B6',  // 紫发（彩）
  '#27AE60',  // 绿发（彩）
]

const colorScheme = computed(() => ({
  '--skin-color': SKIN_COLORS[skinIndex.value][0],
  '--skin-shadow': SKIN_COLORS[skinIndex.value][1],
  '--hair-color': HAIR_COLORS[hairIndex.value],
  '--pupil-color': '#2C3E50',
  '--mouth-color': '#E74C3C',
}))
</script>

<style scoped>
.player-avatar {
  display: inline-block;
  width: v-bind('size || 44');
  height: v-bind('size || 44');
  line-height: 0;
  position: relative;
}

.avatar-svg {
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.3));
}

/* 基础样式 */
.face {
  fill: var(--skin-color);
  stroke: var(--skin-shadow);
  stroke-width: 1;
}

.blush {
  fill: rgba(255, 150, 150, 0.4);
}

.eye-white {
  fill: #fff;
  stroke: #ddd;
  stroke-width: 0.5;
}

.pupil {
  fill: var(--pupil-color);
}

.eye-shine {
  fill: #fff;
  opacity: 0.9;
}

/* ===== 动画 ===== */

/* 眨眼动画 */
.eyes {
  animation: blink 3.5s infinite;
  transform-origin: 50% 48px;
}

@keyframes blink {
  0%, 92%, 100% { transform: scaleY(1); }
  95%, 97% { transform: scaleY(0.1); }
}

/* 活跃状态: 快速眨眼 */
.avatar--active .eyes {
  animation: activeBlink 2s infinite;
}

@keyframes activeBlink {
  0%, 88%, 100% { transform: scaleY(1); }
  92%, 96% { transform: scaleY(0.05); }
}

/* 生气: 脸抖动 */
.avatar--angry {
  animation: angryShake 0.3s infinite;
}

@keyframes angryShake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-2px) rotate(-1deg); }
  75% { transform: translateX(2px) rotate(1deg); }
}

/* 不耐烦: 上下晃 */
.avatar--impatient {
  animation: impatientBounce 1s infinite ease-in-out;
}

@keyframes impatientBounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}

/* 胜利: 放大抖动 */
.avatar--winning {
  animation: winningPulse 0.6s infinite alternate ease-in-out;
}

@keyframes winningPulse {
  0% { transform: scale(1); }
  100% { transform: scale(1.08); }
}

/* 思考泡泡浮动 */
.thinking-bubbles {
  animation: floatUp 2s infinite ease-in-out;
}

@keyframes floatUp {
  0%, 100% { transform: translateY(0); opacity: 0.8; }
  50% { transform: translateY(-3px); opacity: 1; }
}

/* 胜利星星闪烁 */
.star {
  animation: sparkle 0.8s infinite alternate;
}
.star--1 { animation-delay: 0s; }
.star--2 { animation-delay: 0.3s; }
.star--3 { animation-delay: 0.6s; }

@keyframes sparkle {
  0% { opacity: 0.4; transform: scale(0.8); }
  100% { opacity: 1; transform: scale(1.2); }
}

/* 开心: 腮红加深 */
.avatar--happy .blush,
.avatar--winning .blush {
  fill: rgba(255, 120, 120, 0.6);
  transition: fill 0.3s ease;
}
</style>
