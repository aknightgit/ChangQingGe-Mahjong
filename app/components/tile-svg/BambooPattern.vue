<!-- 条子 - 真实竹节效果，圆角矩形+多色渐变+节点线 -->
<template>
  <g>
    <defs>
      <linearGradient id="bamV" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#2e7d32" />
        <stop offset="15%" stop-color="#66bb6a" />
        <stop offset="35%" stop-color="#4caf50" />
        <stop offset="50%" stop-color="#388e3c" />
        <stop offset="65%" stop-color="#4caf50" />
        <stop offset="85%" stop-color="#66bb6a" />
        <stop offset="100%" stop-color="#1b5e20" />
      </linearGradient>
      <linearGradient id="bamH" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#2e7d32" />
        <stop offset="15%" stop-color="#66bb6a" />
        <stop offset="50%" stop-color="#43a047" />
        <stop offset="85%" stop-color="#66bb6a" />
        <stop offset="100%" stop-color="#1b5e20" />
      </linearGradient>
      <filter id="bsh"><feDropShadow dx=".3" dy=".5" stdDeviation=".4" flood-opacity=".25"/></filter>
    </defs>
    <template v-if="value === 2">
      <rect x="11" y="5" width="9" height="22" rx="3" fill="url(#bamV)" filter="url(#bsh)"/>
      <line x1="11" y1="12" x2="20" y2="12" stroke="#1b5e20" stroke-width=".6" opacity=".35"/>
      <line x1="11" y1="19" x2="20" y2="19" stroke="#1b5e20" stroke-width=".6" opacity=".35"/>
      <rect x="20" y="29" width="9" height="22" rx="3" fill="url(#bamV)" filter="url(#bsh)"/>
      <line x1="20" y1="36" x2="29" y2="36" stroke="#1b5e20" stroke-width=".6" opacity=".35"/>
      <line x1="20" y1="43" x2="29" y2="43" stroke="#1b5e20" stroke-width=".6" opacity=".35"/>
    </template>
    <template v-else-if="value === 3">
      <rect x="7" y="5" width="8" height="17" rx="2.5" fill="url(#bamV)" filter="url(#bsh)"/>
      <line x1="7" y1="11" x2="15" y2="11" stroke="#1b5e20" stroke-width=".5" opacity=".3"/>
      <rect x="16" y="19" width="8" height="17" rx="2.5" fill="url(#bamV)" filter="url(#bsh)"/>
      <line x1="16" y1="25" x2="24" y2="25" stroke="#1b5e20" stroke-width=".5" opacity=".3"/>
      <rect x="25" y="33" width="8" height="17" rx="2.5" fill="url(#bamV)" filter="url(#bsh)"/>
      <line x1="25" y1="39" x2="33" y2="39" stroke="#1b5e20" stroke-width=".5" opacity=".3"/>
    </template>
    <template v-else-if="value === 4">
      <rect x="7" y="7" width="8" height="17" rx="2.5" fill="url(#bamV)" filter="url(#bsh)"/>
      <rect x="23" y="7" width="8" height="17" rx="2.5" fill="url(#bamV)" filter="url(#bsh)"/>
      <rect x="7" y="32" width="8" height="17" rx="2.5" fill="url(#bamV)" filter="url(#bsh)"/>
      <rect x="23" y="32" width="8" height="17" rx="2.5" fill="url(#bamV)" filter="url(#bsh)"/>
    </template>
    <template v-else-if="value === 5">
      <rect x="7" y="5" width="8" height="15" rx="2.5" fill="url(#bamV)" filter="url(#bsh)"/>
      <rect x="25" y="5" width="8" height="15" rx="2.5" fill="url(#bamV)" filter="url(#bsh)"/>
      <rect x="9" y="25" width="22" height="6" rx="2" fill="url(#bamH)" filter="url(#bsh)"/>
      <rect x="7" y="36" width="8" height="15" rx="2.5" fill="url(#bamV)" filter="url(#bsh)"/>
      <rect x="25" y="36" width="8" height="15" rx="2.5" fill="url(#bamV)" filter="url(#bsh)"/>
    </template>
    <template v-else-if="value === 6">
      <rect x="7" y="4" width="7" height="14" rx="2.5" fill="url(#bamV)" filter="url(#bsh)"/>
      <rect x="24" y="4" width="7" height="14" rx="2.5" fill="url(#bamV)" filter="url(#bsh)"/>
      <rect x="7" y="21" width="7" height="14" rx="2.5" fill="url(#bamV)" filter="url(#bsh)"/>
      <rect x="24" y="21" width="7" height="14" rx="2.5" fill="url(#bamV)" filter="url(#bsh)"/>
      <rect x="7" y="38" width="7" height="14" rx="2.5" fill="url(#bamV)" filter="url(#bsh)"/>
      <rect x="24" y="38" width="7" height="14" rx="2.5" fill="url(#bamV)" filter="url(#bsh)"/>
    </template>
    <template v-else-if="value === 7">
      <rect x="5" y="3" width="7" height="13" rx="2" fill="url(#bamV)" filter="url(#bsh)"/>
      <rect x="16" y="3" width="7" height="13" rx="2" fill="url(#bamV)" filter="url(#bsh)"/>
      <rect x="27" y="3" width="7" height="13" rx="2" fill="url(#bamV)" filter="url(#bsh)"/>
      <rect x="9" y="22" width="22" height="5" rx="2" fill="url(#bamH)" filter="url(#bsh)"/>
      <rect x="5" y="35" width="7" height="15" rx="2" fill="url(#bamV)" filter="url(#bsh)"/>
      <rect x="16" y="35" width="7" height="15" rx="2" fill="url(#bamV)" filter="url(#bsh)"/>
      <rect x="27" y="35" width="7" height="15" rx="2" fill="url(#bamV)" filter="url(#bsh)"/>
    </template>
    <template v-else-if="value === 8">
      <rect x="8" y="3" width="7" height="11" rx="2" fill="url(#bamV)" filter="url(#bsh)"/>
      <rect x="24" y="3" width="7" height="11" rx="2" fill="url(#bamV)" filter="url(#bsh)"/>
      <rect x="8" y="16" width="7" height="11" rx="2" fill="url(#bamV)" filter="url(#bsh)"/>
      <rect x="24" y="16" width="7" height="11" rx="2" fill="url(#bamV)" filter="url(#bsh)"/>
      <rect x="8" y="29" width="7" height="11" rx="2" fill="url(#bamV)" filter="url(#bsh)"/>
      <rect x="24" y="29" width="7" height="11" rx="2" fill="url(#bamV)" filter="url(#bsh)"/>
      <rect x="8" y="43" width="7" height="11" rx="2" fill="url(#bamV)" filter="url(#bsh)"/>
      <rect x="24" y="43" width="7" height="11" rx="2" fill="url(#bamV)" filter="url(#bsh)"/>
    </template>
    <template v-else-if="value === 9">
      <rect x="5" y="3" width="6" height="13" rx="2" fill="url(#bamV)" filter="url(#bsh)"/>
      <rect x="17" y="3" width="6" height="13" rx="2" fill="url(#bamV)" filter="url(#bsh)"/>
      <rect x="29" y="3" width="6" height="13" rx="2" fill="url(#bamV)" filter="url(#bsh)"/>
      <rect x="5" y="21" width="6" height="13" rx="2" fill="url(#bamV)" filter="url(#bsh)"/>
      <rect x="17" y="21" width="6" height="13" rx="2" fill="url(#bamV)" filter="url(#bsh)"/>
      <rect x="29" y="21" width="6" height="13" rx="2" fill="url(#bamV)" filter="url(#bsh)"/>
      <rect x="5" y="39" width="6" height="13" rx="2" fill="url(#bamV)" filter="url(#bsh)"/>
      <rect x="17" y="39" width="6" height="13" rx="2" fill="url(#bamV)" filter="url(#bsh)"/>
      <rect x="29" y="39" width="6" height="13" rx="2" fill="url(#bamV)" filter="url(#bsh)"/>
    </template>
  </g>
</template>

<script setup lang="ts">
defineProps<{ value: number }>()
</script>
