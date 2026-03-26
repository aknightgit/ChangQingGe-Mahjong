<!-- 筒子 - 真实红圆点，多层渐变+高光+阴影 -->
<template>
  <g>
    <defs>
      <radialGradient id="dot3d" cx="38%" cy="30%" r="62%">
        <stop offset="0%" stop-color="#ff8a80" />
        <stop offset="30%" stop-color="#e53935" />
        <stop offset="70%" stop-color="#c62828" />
        <stop offset="100%" stop-color="#7f0000" />
      </radialGradient>
      <radialGradient id="dotHi" cx="35%" cy="28%" r="30%">
        <stop offset="0%" stop-color="rgba(255,255,255,0.45)" />
        <stop offset="100%" stop-color="rgba(255,255,255,0)" />
      </radialGradient>
      <filter id="dsh"><feDropShadow dx=".4" dy=".8" stdDeviation=".6" flood-opacity=".3"/></filter>
    </defs>
    <template v-if="value === 1">
      <circle cx="20" cy="28" r="11" fill="url(#dot3d)" filter="url(#dsh)"/>
      <circle cx="16.5" cy="24.5" r="4.5" fill="url(#dotHi)"/>
    </template>
    <template v-else-if="value === 2">
      <circle cx="20" cy="16" r="7.5" fill="url(#dot3d)" filter="url(#dsh)"/>
      <circle cx="17" cy="13.5" r="3" fill="url(#dotHi)"/>
      <circle cx="20" cy="40" r="7.5" fill="url(#dot3d)" filter="url(#dsh)"/>
      <circle cx="17" cy="37.5" r="3" fill="url(#dotHi)"/>
    </template>
    <template v-else-if="value === 3">
      <circle cx="11" cy="15" r="6.5" fill="url(#dot3d)" filter="url(#dsh)"/>
      <circle cx="8.5" cy="12.8" r="2.5" fill="url(#dotHi)"/>
      <circle cx="20" cy="28" r="6.5" fill="url(#dot3d)" filter="url(#dsh)"/>
      <circle cx="17.5" cy="25.8" r="2.5" fill="url(#dotHi)"/>
      <circle cx="29" cy="41" r="6.5" fill="url(#dot3d)" filter="url(#dsh)"/>
      <circle cx="26.5" cy="38.8" r="2.5" fill="url(#dotHi)"/>
    </template>
    <template v-else-if="value === 4">
      <circle cx="13" cy="18" r="6.5" fill="url(#dot3d)" filter="url(#dsh)"/>
      <circle cx="27" cy="18" r="6.5" fill="url(#dot3d)" filter="url(#dsh)"/>
      <circle cx="13" cy="38" r="6.5" fill="url(#dot3d)" filter="url(#dsh)"/>
      <circle cx="27" cy="38" r="6.5" fill="url(#dot3d)" filter="url(#dsh)"/>
      <circle cx="10.5" cy="15.8" r="2.5" fill="url(#dotHi)"/>
    </template>
    <template v-else-if="value === 5">
      <circle cx="12" cy="16" r="5.8" fill="url(#dot3d)" filter="url(#dsh)"/>
      <circle cx="28" cy="16" r="5.8" fill="url(#dot3d)" filter="url(#dsh)"/>
      <circle cx="20" cy="28" r="6.5" fill="url(#dot3d)" filter="url(#dsh)"/>
      <circle cx="12" cy="40" r="5.8" fill="url(#dot3d)" filter="url(#dsh)"/>
      <circle cx="28" cy="40" r="5.8" fill="url(#dot3d)" filter="url(#dsh)"/>
      <circle cx="17.5" cy="25.8" r="2.5" fill="url(#dotHi)"/>
    </template>
    <template v-else-if="value === 6">
      <circle cx="13" cy="13" r="5.5" fill="url(#dot3d)" filter="url(#dsh)"/>
      <circle cx="27" cy="13" r="5.5" fill="url(#dot3d)" filter="url(#dsh)"/>
      <circle cx="13" cy="28" r="5.5" fill="url(#dot3d)" filter="url(#dsh)"/>
      <circle cx="27" cy="28" r="5.5" fill="url(#dot3d)" filter="url(#dsh)"/>
      <circle cx="13" cy="43" r="5.5" fill="url(#dot3d)" filter="url(#dsh)"/>
      <circle cx="27" cy="43" r="5.5" fill="url(#dot3d)" filter="url(#dsh)"/>
    </template>
    <template v-else-if="value === 7">
      <circle cx="10" cy="12" r="5" fill="url(#dot3d)" filter="url(#dsh)"/>
      <circle cx="20" cy="12" r="5" fill="url(#dot3d)" filter="url(#dsh)"/>
      <circle cx="30" cy="12" r="5" fill="url(#dot3d)" filter="url(#dsh)"/>
      <circle cx="20" cy="25" r="5" fill="url(#dot3d)" filter="url(#dsh)"/>
      <circle cx="10" cy="40" r="5" fill="url(#dot3d)" filter="url(#dsh)"/>
      <circle cx="20" cy="40" r="5" fill="url(#dot3d)" filter="url(#dsh)"/>
      <circle cx="30" cy="40" r="5" fill="url(#dot3d)" filter="url(#dsh)"/>
    </template>
    <template v-else-if="value === 8">
      <circle cx="20" cy="8" r="3.8" fill="url(#dot3d)" filter="url(#dsh)"/>
      <circle cx="11" cy="19" r="5.2" fill="url(#dot3d)" filter="url(#dsh)"/>
      <circle cx="29" cy="19" r="5.2" fill="url(#dot3d)" filter="url(#dsh)"/>
      <circle cx="11" cy="31" r="5.2" fill="url(#dot3d)" filter="url(#dsh)"/>
      <circle cx="29" cy="31" r="5.2" fill="url(#dot3d)" filter="url(#dsh)"/>
      <circle cx="11" cy="43" r="5.2" fill="url(#dot3d)" filter="url(#dsh)"/>
      <circle cx="29" cy="43" r="5.2" fill="url(#dot3d)" filter="url(#dsh)"/>
      <circle cx="20" cy="50" r="3.8" fill="url(#dot3d)" filter="url(#dsh)"/>
    </template>
    <template v-else-if="value === 9">
      <circle cx="10" cy="11" r="4.8" fill="url(#dot3d)" filter="url(#dsh)"/>
      <circle cx="20" cy="11" r="4.8" fill="url(#dot3d)" filter="url(#dsh)"/>
      <circle cx="30" cy="11" r="4.8" fill="url(#dot3d)" filter="url(#dsh)"/>
      <circle cx="10" cy="28" r="4.8" fill="url(#dot3d)" filter="url(#dsh)"/>
      <circle cx="20" cy="28" r="4.8" fill="url(#dot3d)" filter="url(#dsh)"/>
      <circle cx="30" cy="28" r="4.8" fill="url(#dot3d)" filter="url(#dsh)"/>
      <circle cx="10" cy="45" r="4.8" fill="url(#dot3d)" filter="url(#dsh)"/>
      <circle cx="20" cy="45" r="4.8" fill="url(#dot3d)" filter="url(#dsh)"/>
      <circle cx="30" cy="45" r="4.8" fill="url(#dot3d)" filter="url(#dsh)"/>
    </template>
  </g>
</template>

<script setup lang="ts">
defineProps<{ value: number }>()
</script>
