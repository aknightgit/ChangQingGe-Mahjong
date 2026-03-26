<!-- 筒子 SVG - 更真实的红圆点，带阴影和高光 -->
<template>
  <g>
    <defs>
      <radialGradient id="rd3d" cx="38%" cy="32%" r="62%">
        <stop offset="0%" stop-color="#ff6659" />
        <stop offset="40%" stop-color="#e53935" />
        <stop offset="100%" stop-color="#8b0000" />
      </radialGradient>
      <filter id="dotShadow">
        <feDropShadow dx="0.5" dy="1" stdDeviation="0.5" flood-opacity="0.25" />
      </filter>
    </defs>
    <!-- 1筒 -->
    <template v-if="value === 1">
      <circle cx="20" cy="28" r="10" fill="url(#rd3d)" filter="url(#dotShadow)" />
      <ellipse cx="17" cy="25" rx="3" ry="2.5" fill="rgba(255,255,255,0.25)" />
    </template>
    <!-- 2筒 -->
    <template v-else-if="value === 2">
      <circle cx="20" cy="16" r="7" fill="url(#rd3d)" filter="url(#dotShadow)" />
      <circle cx="20" cy="40" r="7" fill="url(#rd3d)" filter="url(#dotShadow)" />
      <ellipse cx="17.5" cy="13.5" rx="2" ry="1.5" fill="rgba(255,255,255,0.2)" />
      <ellipse cx="17.5" cy="37.5" rx="2" ry="1.5" fill="rgba(255,255,255,0.2)" />
    </template>
    <!-- 3筒 -->
    <template v-else-if="value === 3">
      <circle cx="11" cy="15" r="6" fill="url(#rd3d)" filter="url(#dotShadow)" />
      <circle cx="20" cy="28" r="6" fill="url(#rd3d)" filter="url(#dotShadow)" />
      <circle cx="29" cy="41" r="6" fill="url(#rd3d)" filter="url(#dotShadow)" />
      <ellipse cx="9" cy="13" rx="1.8" ry="1.3" fill="rgba(255,255,255,0.2)" />
    </template>
    <!-- 4筒 -->
    <template v-else-if="value === 4">
      <circle cx="13" cy="18" r="6.5" fill="url(#rd3d)" filter="url(#dotShadow)" />
      <circle cx="27" cy="18" r="6.5" fill="url(#rd3d)" filter="url(#dotShadow)" />
      <circle cx="13" cy="38" r="6.5" fill="url(#rd3d)" filter="url(#dotShadow)" />
      <circle cx="27" cy="38" r="6.5" fill="url(#rd3d)" filter="url(#dotShadow)" />
      <ellipse cx="11" cy="16" rx="2" ry="1.5" fill="rgba(255,255,255,0.2)" />
    </template>
    <!-- 5筒 -->
    <template v-else-if="value === 5">
      <circle cx="12" cy="16" r="5.8" fill="url(#rd3d)" filter="url(#dotShadow)" />
      <circle cx="28" cy="16" r="5.8" fill="url(#rd3d)" filter="url(#dotShadow)" />
      <circle cx="20" cy="28" r="6.5" fill="url(#rd3d)" filter="url(#dotShadow)" />
      <circle cx="12" cy="40" r="5.8" fill="url(#rd3d)" filter="url(#dotShadow)" />
      <circle cx="28" cy="40" r="5.8" fill="url(#rd3d)" filter="url(#dotShadow)" />
      <ellipse cx="18" cy="25.5" rx="2" ry="1.5" fill="rgba(255,255,255,0.2)" />
    </template>
    <!-- 6筒 -->
    <template v-else-if="value === 6">
      <circle cx="13" cy="13" r="5.5" fill="url(#rd3d)" filter="url(#dotShadow)" />
      <circle cx="27" cy="13" r="5.5" fill="url(#rd3d)" filter="url(#dotShadow)" />
      <circle cx="13" cy="28" r="5.5" fill="url(#rd3d)" filter="url(#dotShadow)" />
      <circle cx="27" cy="28" r="5.5" fill="url(#rd3d)" filter="url(#dotShadow)" />
      <circle cx="13" cy="43" r="5.5" fill="url(#rd3d)" filter="url(#dotShadow)" />
      <circle cx="27" cy="43" r="5.5" fill="url(#rd3d)" filter="url(#dotShadow)" />
    </template>
    <!-- 7筒 -->
    <template v-else-if="value === 7">
      <circle cx="10" cy="12" r="5" fill="url(#rd3d)" filter="url(#dotShadow)" />
      <circle cx="20" cy="12" r="5" fill="url(#rd3d)" filter="url(#dotShadow)" />
      <circle cx="30" cy="12" r="5" fill="url(#rd3d)" filter="url(#dotShadow)" />
      <circle cx="20" cy="25" r="5" fill="url(#rd3d)" filter="url(#dotShadow)" />
      <circle cx="10" cy="40" r="5" fill="url(#rd3d)" filter="url(#dotShadow)" />
      <circle cx="20" cy="40" r="5" fill="url(#rd3d)" filter="url(#dotShadow)" />
      <circle cx="30" cy="40" r="5" fill="url(#rd3d)" filter="url(#dotShadow)" />
    </template>
    <!-- 8筒 -->
    <template v-else-if="value === 8">
      <circle cx="20" cy="8" r="3.8" fill="url(#rd3d)" filter="url(#dotShadow)" />
      <circle cx="11" cy="19" r="5.2" fill="url(#rd3d)" filter="url(#dotShadow)" />
      <circle cx="29" cy="19" r="5.2" fill="url(#rd3d)" filter="url(#dotShadow)" />
      <circle cx="11" cy="31" r="5.2" fill="url(#rd3d)" filter="url(#dotShadow)" />
      <circle cx="29" cy="31" r="5.2" fill="url(#rd3d)" filter="url(#dotShadow)" />
      <circle cx="11" cy="43" r="5.2" fill="url(#rd3d)" filter="url(#dotShadow)" />
      <circle cx="29" cy="43" r="5.2" fill="url(#rd3d)" filter="url(#dotShadow)" />
      <circle cx="20" cy="50" r="3.8" fill="url(#rd3d)" filter="url(#dotShadow)" />
    </template>
    <!-- 9筒 -->
    <template v-else-if="value === 9">
      <circle cx="10" cy="11" r="4.8" fill="url(#rd3d)" filter="url(#dotShadow)" />
      <circle cx="20" cy="11" r="4.8" fill="url(#rd3d)" filter="url(#dotShadow)" />
      <circle cx="30" cy="11" r="4.8" fill="url(#rd3d)" filter="url(#dotShadow)" />
      <circle cx="10" cy="28" r="4.8" fill="url(#rd3d)" filter="url(#dotShadow)" />
      <circle cx="20" cy="28" r="4.8" fill="url(#rd3d)" filter="url(#dotShadow)" />
      <circle cx="30" cy="28" r="4.8" fill="url(#rd3d)" filter="url(#dotShadow)" />
      <circle cx="10" cy="45" r="4.8" fill="url(#rd3d)" filter="url(#dotShadow)" />
      <circle cx="20" cy="45" r="4.8" fill="url(#rd3d)" filter="url(#dotShadow)" />
      <circle cx="30" cy="45" r="4.8" fill="url(#rd3d)" filter="url(#dotShadow)" />
    </template>
  </g>
</template>

<script setup lang="ts">
defineProps<{ value: number }>()
</script>
