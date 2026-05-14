import type { DecisionPhase } from './types'

export interface PhaseDetectionInput {
  estimatedRound: number
  shanten: number
  tableThreat: number
  wallRemaining: number
  meldCount: number
  opponentOpenMelds: number
  downstreamPressure: number
  fastOpenOpponentCount: number
  bigOpenOpponentCount: number
  wallEarlySpeedPush?: number
  wallMidBalance?: number
  wallLateDefense?: number
  safeTilePriority?: number
  defenseRiskAversion?: number
  wallTilesImpact?: number
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
    fastOpenOpponentCount,
    bigOpenOpponentCount,
    wallEarlySpeedPush = 0,
    wallMidBalance = 0,
    wallLateDefense = 0,
    safeTilePriority = 0,
    defenseRiskAversion = 0,
    wallTilesImpact = 0,
  } = input

  const defenseBias = (wallLateDefense + safeTilePriority + defenseRiskAversion) / 3
  const defenseThreatThreshold = 0.84 - defenseBias * 0.12
  const rushRoundThreshold = Math.max(7, 11 - wallMidBalance * 2.2 - wallEarlySpeedPush * 1.2)
  const commitRoundThreshold = Math.max(4, 6 - wallEarlySpeedPush * 1.6)
  const lateWallPressureThreshold = Math.max(14, 18 + wallTilesImpact * 8 - wallLateDefense * 3)
  const rushWallThreshold = Math.max(22, 30 + wallTilesImpact * 10 - wallMidBalance * 4)

  if (
    (tableThreat >= defenseThreatThreshold && shanten > 1) ||
    downstreamPressure >= 1.35 ||
    (bigOpenOpponentCount >= 1 && tableThreat >= 0.6 && shanten > 1) ||
    (fastOpenOpponentCount >= 2 && shanten > 1) ||
    (opponentOpenMelds >= 5 && shanten > 1) ||
    (wallRemaining <= lateWallPressureThreshold && shanten > 0)
  ) {
    return 'DEFENSE'
  }

  if (
    shanten <= 1 ||
    estimatedRound >= rushRoundThreshold ||
    wallRemaining <= rushWallThreshold ||
    meldCount >= 2 ||
    downstreamPressure >= 0.9 ||
    bigOpenOpponentCount >= 1 ||
    fastOpenOpponentCount >= 1 ||
    opponentOpenMelds >= 4
  ) {
    return 'RUSH'
  }

  if (estimatedRound >= commitRoundThreshold || opponentOpenMelds >= 2 || fastOpenOpponentCount >= 1) {
    return 'COMMIT'
  }

  return 'OBSERVE'
}
