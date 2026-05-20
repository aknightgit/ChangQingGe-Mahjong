import { computed, ref, watch } from 'vue'

interface UseHuReviewOptions {
  roomId: () => string
  getCurrentPlayerId: () => string | null | undefined
  canHu: () => boolean
  isMyTurn: () => boolean
  isSettlementVisible: () => boolean
  getCurrentSettlementRound: () => any
  onBeforeConfirm: () => void
  onExecuteHu: (option: any) => void
}

export const useHuReview = (options: UseHuReviewOptions) => {
  const showHuPanel = ref(false)
  const selectedHuCombo = ref<number | null>(null)
  const winOptions = ref<any[]>([])
  const lastHuReviewOptions = ref<any[]>([])
  const lastSelectedHuCombo = ref<number | null>(null)
  const isHuReviewMode = ref(false)

  const displayWinOptions = computed(() =>
    [...winOptions.value]
      .sort((a, b) => (b.summary?.finalPoints ?? b.score ?? 0) - (a.summary?.finalPoints ?? a.score ?? 0))
      .slice(0, 3)
  )

  const activeHuOptions = computed(() => (isHuReviewMode.value ? lastHuReviewOptions.value : displayWinOptions.value))

  const canReviewHuSelection = computed(() => {
    if (!options.isSettlementVisible()) return false
    const currentPlayerId = options.getCurrentPlayerId()
    if (!currentPlayerId) return false
    const winners = Array.isArray(options.getCurrentSettlementRound()?.winnerDetails)
      ? options.getCurrentSettlementRound().winnerDetails
      : []
    return winners.some((winner: any) => winner.playerId === currentPlayerId) && lastHuReviewOptions.value.length > 0
  })

  const fetchWinOptions = async () => {
    const playerId = options.getCurrentPlayerId()
    if (!playerId) {
      winOptions.value = []
      return
    }
    try {
      const res = await $fetch<any>('/api/game/win-options', {
        query: { gameId: options.roomId(), playerId }
      })
      winOptions.value = (res.winOptions || []).slice(0, 3)
    } catch (err) {
      console.error('Failed to fetch win options:', err)
      winOptions.value = []
    }
  }

  // 禁用自动弹出胡牌选择弹窗
  // let autoHuShown = false
  // watch(() => [options.canHu(), options.isMyTurn()], async ([canHu, myTurn]) => {
  //   if (canHu && myTurn && !showHuPanel.value && !autoHuShown) {
  //     autoHuShown = true
  //     await onHu()
  //   }
  //   if (!canHu) autoHuShown = false
  // })

  const onHu = async () => {
    isHuReviewMode.value = false
    await fetchWinOptions()
    showHuPanel.value = true
    selectedHuCombo.value = 0
  }

  const onConfirmHu = (index: number) => {
    const selectedOption = displayWinOptions.value[index]
    options.onBeforeConfirm()
    lastHuReviewOptions.value = displayWinOptions.value.map((option: any) => ({ ...option }))
    lastSelectedHuCombo.value = index
    isHuReviewMode.value = false
    showHuPanel.value = false
    options.onExecuteHu(selectedOption)
  }

  const onCancelHu = () => {
    showHuPanel.value = false
    selectedHuCombo.value = isHuReviewMode.value ? lastSelectedHuCombo.value : null
    isHuReviewMode.value = false
  }

  const openHuReviewPanel = () => {
    if (!lastHuReviewOptions.value.length) return
    isHuReviewMode.value = true
    showHuPanel.value = true
    selectedHuCombo.value = lastSelectedHuCombo.value ?? 0
  }

  return {
    showHuPanel,
    selectedHuCombo,
    isHuReviewMode,
    activeHuOptions,
    canReviewHuSelection,
    onHu,
    onConfirmHu,
    onCancelHu,
    openHuReviewPanel,
  }
}
