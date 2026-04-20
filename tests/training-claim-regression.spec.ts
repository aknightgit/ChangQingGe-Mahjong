import { checkChowPongExclusion, updateChowPongExclusion } from '../server/utils/handValidator'

let passed = 0
let failed = 0

function test(name: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`PASS ${name}`)
    passed++
  } else {
    console.log(`FAIL ${name}${detail ? ` - ${detail}` : ''}`)
    failed++
  }
}

type ClaimState = {
  currentPlayer: number
  handCount: number
  meldCount: number
}

function applyClaimAndDiscard(state: ClaimState, claimant: number): ClaimState {
  const meldCount = state.meldCount + 1
  const handAfterClaim = state.handCount - 2
  const handAfterDiscard = handAfterClaim - 1
  return {
    currentPlayer: (claimant + 1) % 4,
    handCount: handAfterDiscard,
    meldCount,
  }
}

console.log('\n=== Regression: training claim flow ===\n')

{
  const state = { firstActionSuit: null, firstActionType: null }
  const afterChow = updateChowPongExclusion(state, 'chow', 'WAN')
  test('chow establishes first suit lock', afterChow.firstActionSuit === 'WAN')
  test('after chow same suit chow allowed', checkChowPongExclusion(afterChow, 'chow', 'WAN') === true)
  test('after chow other suit chow blocked', checkChowPongExclusion(afterChow, 'chow', 'BAM') === false)
  test('after chow other suit pong blocked', checkChowPongExclusion(afterChow, 'pong', 'BAM') === false)
}

{
  const state = { firstActionSuit: null, firstActionType: null }
  const afterPong = updateChowPongExclusion(state, 'pong', 'DOT')
  test('pong establishes first suit lock', afterPong.firstActionSuit === 'DOT')
  test('after pong same suit chow allowed', checkChowPongExclusion(afterPong, 'chow', 'DOT') === true)
  test('after pong other suit chow blocked', checkChowPongExclusion(afterPong, 'chow', 'WAN') === false)
  test('after pong other suit pong still allowed', checkChowPongExclusion(afterPong, 'pong', 'WAN') === true)
}

{
  const claimed = applyClaimAndDiscard({ currentPlayer: 0, handCount: 13, meldCount: 0 }, 2)
  test('first claim then discard leaves 10 concealed tiles', claimed.handCount === 10, `actual=${claimed.handCount}`)
  test('first claim advances to claimant next player', claimed.currentPlayer === 3, `actual=${claimed.currentPlayer}`)
  test('first claim increments meld count once', claimed.meldCount === 1, `actual=${claimed.meldCount}`)
}

{
  const claimed = applyClaimAndDiscard({ currentPlayer: 1, handCount: 10, meldCount: 1 }, 0)
  test('second claim then discard leaves 7 concealed tiles', claimed.handCount === 7, `actual=${claimed.handCount}`)
  test('second claim still advances to next player', claimed.currentPlayer === 1, `actual=${claimed.currentPlayer}`)
  test('second claim increments meld count once', claimed.meldCount === 2, `actual=${claimed.meldCount}`)
}

console.log(`\nResult: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
