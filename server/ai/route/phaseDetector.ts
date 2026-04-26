import type { DecisionPhase } from './types'

export interface PhaseDetectionInput {
  estimatedRound: number
  shanten: number
  tableThreat: number
  wallRemaining: number
  meldCount: number
}

export function detectDecisionPhase(input: PhaseDetectionInput): DecisionPhase {
  const {
    estimatedRound,
    shanten,
    tableThreat,
    wallRemaining,
    meldCount,
  } = input

  if ((tableThreat >= 0.9 && shanten > 1) || (wallRemaining <= 18 && shanten > 0)) {
    return 'DEFENSE'
  }

  if (shanten <= 1 || estimatedRound >= 11 || wallRemaining <= 30 || meldCount >= 2) {
    return 'RUSH'
  }

  if (estimatedRound >= 6) {
    return 'COMMIT'
  }

  return 'OBSERVE'
}
