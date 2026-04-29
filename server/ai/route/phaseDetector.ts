import type { DecisionPhase } from './types'

export interface PhaseDetectionInput {
  estimatedRound: number
  shanten: number
  tableThreat: number
  wallRemaining: number
  meldCount: number
  opponentOpenMelds: number
  downstreamPressure: number
}

export function detectDecisionPhase(input: PhaseDetectionInput): DecisionPhase {
  const {
    estimatedRound,
    shanten,
    tableThreat,
    wallRemaining,
    meldCount,
    opponentOpenMelds,
    downstreamPressure,
  } = input

  if (
    (tableThreat >= 0.84 && shanten > 1) ||
    downstreamPressure >= 1.35 ||
    (opponentOpenMelds >= 5 && shanten > 1) ||
    (wallRemaining <= 18 && shanten > 0)
  ) {
    return 'DEFENSE'
  }

  if (
    shanten <= 1 ||
    estimatedRound >= 11 ||
    wallRemaining <= 30 ||
    meldCount >= 2 ||
    downstreamPressure >= 0.9 ||
    opponentOpenMelds >= 4
  ) {
    return 'RUSH'
  }

  if (estimatedRound >= 6 || opponentOpenMelds >= 2) {
    return 'COMMIT'
  }

  return 'OBSERVE'
}
