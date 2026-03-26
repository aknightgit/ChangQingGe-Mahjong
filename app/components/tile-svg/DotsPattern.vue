<!-- 筒子 SVG 图案 - 红色圆点排列 -->
<template>
  <g>
    <!-- 1筒: 中心1个大圆 -->
    <template v-if="value === 1">
      <circle cx="20" cy="28" r="9" fill="url(#redDot)" />
    </template>
    <!-- 2筒: 上下2个 -->
    <template v-else-if="value === 2">
      <circle cx="20" cy="16" r="6.5" fill="url(#redDot)" />
      <circle cx="20" cy="40" r="6.5" fill="url(#redDot)" />
    </template>
    <!-- 3筒: 斜排3个 -->
    <template v-else-if="value === 3">
      <circle cx="11" cy="16" r="5.5" fill="url(#redDot)" />
      <circle cx="20" cy="28" r="5.5" fill="url(#redDot)" />
      <circle cx="29" cy="40" r="5.5" fill="url(#redDot)" />
    </template>
    <!-- 4筒: 2x2 -->
    <template v-else-if="value === 4">
      <circle cx="13" cy="19" r="5.5" fill="url(#redDot)" />
      <circle cx="27" cy="19" r="5.5" fill="url(#redDot)" />
      <circle cx="13" cy="37" r="5.5" fill="url(#redDot)" />
      <circle cx="27" cy="37" r="5.5" fill="url(#redDot)" />
    </template>
    <!-- 5筒: 2x2 + 中心 -->
    <template v-else-if="value === 5">
      <circle cx="12" cy="17" r="5" fill="url(#redDot)" />
      <circle cx="28" cy="17" r="5" fill="url(#redDot)" />
      <circle cx="20" cy="28" r="5.5" fill="url(#redDot)" />
      <circle cx="12" cy="39" r="5" fill="url(#redDot)" />
      <circle cx="28" cy="39" r="5" fill="url(#redDot)" />
    </template>
    <!-- 6筒: 2列x3行 -->
    <template v-else-if="value === 6">
      <circle cx="13" cy="14" r="5" fill="url(#redDot)" />
      <circle cx="27" cy="14" r="5" fill="url(#redDot)" />
      <circle cx="13" cy="28" r="5" fill="url(#redDot)" />
      <circle cx="27" cy="28" r="5" fill="url(#redDot)" />
      <circle cx="13" cy="42" r="5" fill="url(#redDot)" />
      <circle cx="27" cy="42" r="5" fill="url(#redDot)" />
    </template>
    <!-- 7筒: 3列(3-1-3) -->
    <template v-else-if="value === 7">
      <circle cx="10" cy="13" r="4.5" fill="url(#redDot)" />
      <circle cx="20" cy="13" r="4.5" fill="url(#redDot)" />
      <circle cx="30" cy="13" r="4.5" fill="url(#redDot)" />
      <circle cx="20" cy="26" r="4.5" fill="url(#redDot)" />
      <circle cx="10" cy="39" r="4.5" fill="url(#redDot)" />
      <circle cx="20" cy="39" r="4.5" fill="url(#redDot)" />
      <circle cx="30" cy="39" r="4.5" fill="url(#redDot)" />
    </template>
    <!-- 8筒: 3列(2-2-2+上下各1) -->
    <template v-else-if="value === 8">
      <circle cx="20" cy="9" r="3.5" fill="url(#redDot)" />
      <circle cx="10" cy="19" r="4.5" fill="url(#redDot)" />
      <circle cx="30" cy="19" r="4.5" fill="url(#redDot)" />
      <circle cx="10" cy="29" r="4.5" fill="url(#redDot)" />
      <circle cx="30" cy="29" r="4.5" fill="url(#redDot)" />
      <circle cx="10" cy="39" r="4.5" fill="url(#redDot)" />
      <circle cx="30" cy="39" r="4.5" fill="url(#redDot)" />
      <circle cx="20" cy="47" r="3.5" fill="url(#redDot)" />
    </template>
    <!-- 9筒: 3x3 -->
    <template v-else-if="value === 9">
      <circle cx="10" cy="12" r="4.2" fill="url(#redDot)" />
      <circle cx="20" cy="12" r="4.2" fill="url(#redDot)" />
      <circle cx="30" cy="12" r="4.2" fill="url(#redDot)" />
      <circle cx="10" cy="28" r="4.2" fill="url(#redDot)" />
      <circle cx="20" cy="28" r="4.2" fill="url(#redDot)" />
      <circle cx="30" cy="28" r="4.2" fill="url(#redDot)" />
      <circle cx="10" cy="44" r="4.2" fill="url(#redDot)" />
      <circle cx="20" cy="44" r="4.2" fill="url(#redDot)" />
      <circle cx="30" cy="44" r="4.2" fill="url(#redDot)" />
    </template>
    <!-- 渐变定义 -->
    <defs>
      <radialGradient id="redDot" cx="35%" cy="35%" r="60%">
        <stop offset="0%" stop-color="#ef5350" />
        <stop offset="100%" stop-color="#b71c1c" />
      </radialGradient>
    </defs>
  </g>
</template>

<script setup lang="ts">
defineProps<{ value: number }>()
</script>
