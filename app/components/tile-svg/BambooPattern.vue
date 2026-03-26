<!-- 条子 SVG 图案 - 绿色竹节 -->
<template>
  <g>
    <defs>
      <linearGradient id="bambooGreen" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#66bb6a" />
        <stop offset="15%" stop-color="#2e7d32" />
        <stop offset="16%" stop-color="#66bb6a" />
        <stop offset="40%" stop-color="#2e7d32" />
        <stop offset="41%" stop-color="#66bb6a" />
        <stop offset="65%" stop-color="#2e7d32" />
        <stop offset="66%" stop-color="#66bb6a" />
        <stop offset="90%" stop-color="#2e7d32" />
        <stop offset="100%" stop-color="#43a047" />
      </linearGradient>
      <linearGradient id="bambooGreenH" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#66bb6a" />
        <stop offset="15%" stop-color="#2e7d32" />
        <stop offset="16%" stop-color="#66bb6a" />
        <stop offset="40%" stop-color="#2e7d32" />
        <stop offset="41%" stop-color="#66bb6a" />
        <stop offset="65%" stop-color="#2e7d32" />
        <stop offset="66%" stop-color="#66bb6a" />
        <stop offset="90%" stop-color="#2e7d32" />
        <stop offset="100%" stop-color="#43a047" />
      </linearGradient>
    </defs>

    <!-- 2条: 上下2根竖竹 -->
    <template v-if="value === 2">
      <rect x="12" y="6" width="7" height="20" rx="2" fill="url(#bambooGreen)" />
      <rect x="21" y="30" width="7" height="20" rx="2" fill="url(#bambooGreen)" />
    </template>
    <!-- 3条: 斜排3根 -->
    <template v-else-if="value === 3">
      <rect x="8" y="6" width="6" height="16" rx="2" fill="url(#bambooGreen)" />
      <rect x="17" y="20" width="6" height="16" rx="2" fill="url(#bambooGreen)" />
      <rect x="26" y="34" width="6" height="16" rx="2" fill="url(#bambooGreen)" />
    </template>
    <!-- 4条: 2x2 -->
    <template v-else-if="value === 4">
      <rect x="8" y="8" width="6" height="16" rx="2" fill="url(#bambooGreen)" />
      <rect x="22" y="8" width="6" height="16" rx="2" fill="url(#bambooGreen)" />
      <rect x="8" y="32" width="6" height="16" rx="2" fill="url(#bambooGreen)" />
      <rect x="22" y="32" width="6" height="16" rx="2" fill="url(#bambooGreen)" />
    </template>
    <!-- 5条: 2x2 + 中心(横) -->
    <template v-else-if="value === 5">
      <rect x="8" y="7" width="6" height="14" rx="2" fill="url(#bambooGreen)" />
      <rect x="24" y="7" width="6" height="14" rx="2" fill="url(#bambooGreen)" />
      <rect x="8" y="35" width="6" height="14" rx="2" fill="url(#bambooGreen)" />
      <rect x="24" y="35" width="6" height="14" rx="2" fill="url(#bambooGreen)" />
      <rect x="10" y="24" width="20" height="6" rx="2" fill="url(#bambooGreenH)" />
    </template>
    <!-- 6条: 2列x3行 -->
    <template v-else-if="value === 6">
      <rect x="8" y="5" width="6" height="13" rx="2" fill="url(#bambooGreen)" />
      <rect x="24" y="5" width="6" height="13" rx="2" fill="url(#bambooGreen)" />
      <rect x="8" y="22" width="6" height="13" rx="2" fill="url(#bambooGreen)" />
      <rect x="24" y="22" width="6" height="13" rx="2" fill="url(#bambooGreen)" />
      <rect x="8" y="38" width="6" height="13" rx="2" fill="url(#bambooGreen)" />
      <rect x="24" y="38" width="6" height="13" rx="2" fill="url(#bambooGreen)" />
    </template>
    <!-- 7条: 上3 + 中间横 + 下3 -->
    <template v-else-if="value === 7">
      <rect x="6" y="4" width="5" height="12" rx="2" fill="url(#bambooGreen)" />
      <rect x="17" y="4" width="5" height="12" rx="2" fill="url(#bambooGreen)" />
      <rect x="28" y="4" width="5" height="12" rx="2" fill="url(#bambooGreen)" />
      <rect x="10" y="23" width="20" height="5" rx="2" fill="url(#bambooGreenH)" />
      <rect x="6" y="36" width="5" height="14" rx="2" fill="url(#bambooGreen)" />
      <rect x="17" y="36" width="5" height="14" rx="2" fill="url(#bambooGreen)" />
      <rect x="28" y="36" width="5" height="14" rx="2" fill="url(#bambooGreen)" />
    </template>
    <!-- 8条: 2列x4行 -->
    <template v-else-if="value === 8">
      <rect x="9" y="3" width="5" height="11" rx="2" fill="url(#bambooGreen)" />
      <rect x="24" y="3" width="5" height="11" rx="2" fill="url(#bambooGreen)" />
      <rect x="9" y="16" width="5" height="11" rx="2" fill="url(#bambooGreen)" />
      <rect x="24" y="16" width="5" height="11" rx="2" fill="url(#bambooGreen)" />
      <rect x="9" y="29" width="5" height="11" rx="2" fill="url(#bambooGreen)" />
      <rect x="24" y="29" width="5" height="11" rx="2" fill="url(#bambooGreen)" />
      <rect x="9" y="42" width="5" height="11" rx="2" fill="url(#bambooGreen)" />
      <rect x="24" y="42" width="5" height="11" rx="2" fill="url(#bambooGreen)" />
    </template>
    <!-- 9条: 3列x3行 -->
    <template v-else-if="value === 9">
      <rect x="5" y="4" width="5" height="12" rx="2" fill="url(#bambooGreen)" />
      <rect x="17" y="4" width="5" height="12" rx="2" fill="url(#bambooGreen)" />
      <rect x="29" y="4" width="5" height="12" rx="2" fill="url(#bambooGreen)" />
      <rect x="5" y="22" width="5" height="12" rx="2" fill="url(#bambooGreen)" />
      <rect x="17" y="22" width="5" height="12" rx="2" fill="url(#bambooGreen)" />
      <rect x="29" y="22" width="5" height="12" rx="2" fill="url(#bambooGreen)" />
      <rect x="5" y="40" width="5" height="12" rx="2" fill="url(#bambooGreen)" />
      <rect x="17" y="40" width="5" height="12" rx="2" fill="url(#bambooGreen)" />
      <rect x="29" y="40" width="5" height="12" rx="2" fill="url(#bambooGreen)" />
    </template>
  </g>
</template>

<script setup lang="ts">
defineProps<{ value: number }>()
</script>
