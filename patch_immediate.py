#!/usr/bin/env python3
"""Fix HAND_REVEAL countdown: immediate watch + server-time-based countdown"""
c = open("app/pages/gameroom/[roomId].vue").read()

old = """// 亮牌阶段倒计时
const handRevealCountdown = ref(5)
let handRevealTimer = null

watch(() => gameState.value?.phase, (newPhase) => {
  if (newPhase === GamePhase.HAND_REVEAL) {
    handRevealCountdown.value = 5
    if (handRevealTimer) clearInterval(handRevealTimer)
    handRevealTimer = setInterval(() => {
      handRevealCountdown.value = Math.max(0, handRevealCountdown.value - 1)
    }, 1000)
  } else {
    if (handRevealTimer) {
      clearInterval(handRevealTimer)
      handRevealTimer = null
    }
  }
})"""

new = """// 亮牌阶段倒计时（基于服务器 handRevealEndTime，进房间时立即生效）
const handRevealCountdown = ref(0)
let handRevealTimer = null

const updateHandRevealCountdown = () => {
  const endTime = gameState.value?.handRevealEndTime
  if (!endTime) { handRevealCountdown.value = 0; return }
  handRevealCountdown.value = Math.max(0, Math.ceil((endTime - Date.now()) / 1000))
}

watch(() => gameState.value?.phase, (newPhase) => {
  if (newPhase === GamePhase.HAND_REVEAL) {
    updateHandRevealCountdown()
    if (handRevealTimer) clearInterval(handRevealTimer)
    handRevealTimer = setInterval(updateHandRevealCountdown, 1000)
  } else {
    if (handRevealTimer) { clearInterval(handRevealTimer); handRevealTimer = null }
  }
}, { immediate: true })"""

if old in c:
    c = c.replace(old, new, 1)
    print("OK: fixed countdown with immediate watch")
else:
    print("FAIL: pattern not found")
    idx = c.find("// 亮牌阶段倒计时")
    if idx >= 0: print("Found at", idx, ":", c[idx:idx+350])
    import sys; sys.exit(1)

open("app/pages/gameroom/[roomId].vue", "w").write(c)
print("=== DONE ===")
