<!-- 条子 SVG - 更真实的竹节效果 -->
<template>
  <g>
    <defs>
      <linearGradient id="bamV" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#388e3c" />
        <stop offset="20%" stop-color="#66bb6a" />
        <stop offset="50%" stop-color="#43a047" />
        <stop offset="80%" stop-color="#66bb6a" />
        <stop offset="100%" stop-color="#2e7d32" />
      </linearGradient>
      <linearGradient id="bamH" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#388e3c" />
        <stop offset="20%" stop-color="#66bb6a" />
        <stop offset="50%" stop-color="#43a047" />
        <stop offset="80%" stop-color="#66bb6a" />
        <stop offset="100%" stop-color="#2e7d32" />
      </linearGradient>
      <filter id="bamShadow">
        <feDropShadow dx="0.3" dy="0.6" stdDeviation="0.3" flood-opacity="0.2" />
      </filter>
    </defs>

    <!-- 2条 -->
    <template v-if="value === 2">
      <rect x="12" y="5" width="8" height="22" rx="2.5" fill="url(#bamV)" filter="url(#bamShadow)" />
      <line x1="12" y1="12" x2="20" y2="12" stroke="#2e7d32" stroke-width="0.8" opacity="0.4"/>
      <line x1="12" y1="19" x2="20" y2="19" stroke="#2e7d32" stroke-width="0.8" opacity="0.4"/>
      <rect x="20" y="29" width="8" height="22" rx="2.5" fill="url(#bamV)" filter="url(#bamShadow)" />
      <line x1="20" y1="36" x2="28" y2="36" stroke="#2e7d32" stroke-width="0.8" opacity="0.4"/>
      <line x1="20" y1="43" x2="28" y2="43" stroke="#2e7d32" stroke-width="0.8" opacity="0.4"/>
    </template>
    <!-- 3条 -->
    <template v-else-if="value === 3">
      <rect x="8" y="5" width="7" height="17" rx="2" fill="url(#bamV)" filter="url(#bamShadow)" />
      <line x1="8" y1="11" x2="15" y2="11" stroke="#2e7d32" stroke-width="0.7" opacity="0.4"/>
      <rect x="17" y="19" width="7" height="17" rx="2" fill="url(#bamV)" filter="url(#bamShadow)" />
      <line x1="17" y1="25" x2="24" y2="25" stroke="#2e7d32" stroke-width="0.7" opacity="0.4"/>
      <rect x="26" y="33" width="7" height="17" rx="2" fill="url(#bamV)" filter="url(#bamShadow)" />
      <line x1="26" y1="39" x2="33" y2="39" stroke="#2e7d32" stroke-width="0.7" opacity="0.4"/>
    </template>
    <!-- 4条 -->
    <template v-else-if="value === 4">
      <rect x="8" y="7" width="7" height="17" rx="2" fill="url(#bamV)" filter="url(#bamShadow)" />
      <rect x="23" y="7" width="7" height="17" rx="2" fill="url(#bamV)" filter="url(#bamShadow)" />
      <rect x="8" y="32" width="7" height="17" rx="2" fill="url(#bamV)" filter="url(#bamShadow)" />
      <rect x="23" y="32" width="7" height="17" rx="2" fill="url(#bamV)" filter="url(#bamShadow)" />
    </template>
    <!-- 5条 -->
    <template v-else-if="value === 5">
      <rect x="8" y="6" width="7" height="15" rx="2" fill="url(#bamV)" filter="url(#bamShadow)" />
      <rect x="25" y="6" width="7" height="15" rx="2" fill="url(#bamV)" filter="url(#bamShadow)" />
      <rect x="10" y="25" width="20" height="6" rx="2" fill="url(#bamH)" filter="url(#bamShadow)" />
      <rect x="8" y="35" width="7" height="15" rx="2" fill="url(#bamV)" filter="url(#bamShadow)" />
      <rect x="25" y="35" width="7" height="15" rx="2" fill="url(#bamV)" filter="url(#bamShadow)" />
    </template>
    <!-- 6条 -->
    <template v-else-if="value === 6">
      <rect x="8" y="4" width="7" height="14" rx="2" fill="url(#bamV)" filter="url(#bamShadow)" />
      <rect x="24" y="4" width="7" height="14" rx="2" fill="url(#bamV)" filter="url(#bamShadow)" />
      <rect x="8" y="21" width="7" height="14" rx="2" fill="url(#bamV)" filter="url(#bamShadow)" />
      <rect x="24" y="21" width="7" height="14" rx="2" fill="url(#bamV)" filter="url(#bamShadow)" />
      <rect x="8" y="38" width="7" height="14" rx="2" fill="url(#bamV)" filter="url(#bamShadow)" />
      <rect x="24" y="38" width="7" height="14" rx="2" fill="url(#bamV)" filter="url(#bamShadow)" />
    </template>
    <!-- 7条 -->
    <template v-else-if="value === 7">
      <rect x="6" y="3" width="6" height="13" rx="2" fill="url(#bamV)" filter="url(#bamShadow)" />
      <rect x="17" y="3" width="6" height="13" rx="2" fill="url(#bamV)" filter="url(#bamShadow)" />
      <rect x="28" y="3" width="6" height="13" rx="2" fill="url(#bamV)" filter="url(#bamShadow)" />
      <rect x="10" y="22" width="20" height="5" rx="2" fill="url(#bamH)" filter="url(#bamShadow)" />
      <rect x="6" y="35" width="6" height="15" rx="2" fill="url(#bamV)" filter="url(#bamShadow)" />
      <rect x="17" y="35" width="6" height="15" rx="2" fill="url(#bamV)" filter="url(#bamShadow)" />
      <rect x="28" y="35" width="6" height="15" rx="2" fill="url(#bamV)" filter="url(#bamShadow)" />
    </template>
    <!-- 8条 -->
    <template v-else-if="value === 8">
      <rect x="9" y="3" width="6" height="12" rx="2" fill="url(#bamV)" filter="url(#bamShadow)" />
      <rect x="24" y="3" width="6" height="12" rx="2" fill="url(#bamV)" filter="url(#bamShadow)" />
      <rect x="9" y="17" width="6" height="12" rx="2" fill="url(#bamV)" filter="url(#bamShadow)" />
      <rect x="24" y="17" width="6" height="12" rx="2" fill="url(#bamV)" filter="url(#bamShadow)" />
      <rect x="9" y="31" width="6" height="12" rx="2" fill="url(#bamV)" filter="url(#bamShadow)" />
      <rect x="24" y="31" width="6" height="12" rx="2" fill="url(#bamV)" filter="url(#bamShadow)" />
      <rect x="9" y="44" width="6" height="12" rx="2" fill="url(#bamV)" filter="url(#bamShadow)" />
      <rect x="24" y="44" width="6" height="12" rx="2" fill="url(#bamV)" filter="url(#bamShadow)" />
    </template>
    <!-- 9条 -->
    <template v-else-if="value === 9">
      <rect x="5" y="3" width="6" height="13" rx="2" fill="url(#bamV)" filter="url(#bamShadow)" />
      <rect x="17" y="3" width="6" height="13" rx="2" fill="url(#bamV)" filter="url(#bamShadow)" />
      <rect x="29" y="3" width="6" height="13" rx="2" fill="url(#bamV)" filter="url(#bamShadow)" />
      <rect x="5" y="21" width="6" height="13" rx="2" fill="url(#bamV)" filter="url(#bamShadow)" />
      <rect x="17" y="21" width="6" height="13" rx="2" fill="url(#bamV)" filter="url(#bamShadow)" />
      <rect x="29" y="21" width="6" height="13" rx="2" fill="url(#bamV)" filter="url(#bamShadow)" />
      <rect x="5" y="39" width="6" height="13" rx="2" fill="url(#bamV)" filter="url(#bamShadow)" />
      <rect x="17" y="39" width="6" height="13" rx="2" fill="url(#bamV)" filter="url(#bamShadow)" />
      <rect x="29" y="39" width="6" height="13" rx="2" fill="url(#bamV)" filter="url(#bamShadow)" />
    </template>
  </g>
</template>

<script setup lang="ts">
defineProps<{ value: number }>()
</script>
