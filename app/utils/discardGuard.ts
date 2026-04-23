import { ActionType } from '../types/game'

export interface DiscardGuardSnapshot {
  activePosition: number | null
  currentPlayerId: string | null
  concealedCount: number
  discardPileLength: number
  pendingActionsCount: number
  availableActionsKey: string
}

export function buildDiscardGuardSnapshot(input: {
  activePosition: number | null
  currentPlayerId: string | null
  concealedCount: number
  discardPileLength: number
  pendingActionsCount: number
  availableActions: string[]
}): DiscardGuardSnapshot {
  return {
    activePosition: input.activePosition,
    currentPlayerId: input.currentPlayerId,
    concealedCount: input.concealedCount,
    discardPileLength: input.discardPileLength,
    pendingActionsCount: input.pendingActionsCount,
    availableActionsKey: [...input.availableActions].sort().join(',')
  }
}

export function shouldReleasePendingDiscardGuard(
  previous: DiscardGuardSnapshot | null,
  next: DiscardGuardSnapshot,
  isMyTurn: boolean
): boolean {
  if (!previous) return true

  const discardStillAvailable = next.availableActionsKey.split(',').includes(ActionType.DISCARD)
  if (!isMyTurn || !discardStillAvailable) return true

  return (
    previous.activePosition !== next.activePosition ||
    previous.currentPlayerId !== next.currentPlayerId ||
    previous.concealedCount !== next.concealedCount ||
    previous.discardPileLength !== next.discardPileLength ||
    previous.pendingActionsCount !== next.pendingActionsCount ||
    previous.availableActionsKey !== next.availableActionsKey
  )
}
