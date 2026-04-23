import { buildDiscardGuardSnapshot, shouldReleasePendingDiscardGuard } from '../app/utils/discardGuard'

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

console.log('\n=== Regression: frontend discard guard release ===\n')

const before = buildDiscardGuardSnapshot({
  activePosition: 0,
  currentPlayerId: 'p1',
  concealedCount: 14,
  discardPileLength: 6,
  pendingActionsCount: 0,
  availableActions: ['discard']
})

test(
  'keeps guard while request finished but visible state is still unchanged',
  shouldReleasePendingDiscardGuard(
    before,
    buildDiscardGuardSnapshot({
      activePosition: 0,
      currentPlayerId: 'p1',
      concealedCount: 14,
      discardPileLength: 6,
      pendingActionsCount: 0,
      availableActions: ['discard']
    }),
    true
  ) === false
)

test(
  'releases guard after discard pile advances',
  shouldReleasePendingDiscardGuard(
    before,
    buildDiscardGuardSnapshot({
      activePosition: 0,
      currentPlayerId: 'p1',
      concealedCount: 13,
      discardPileLength: 7,
      pendingActionsCount: 1,
      availableActions: []
    }),
    true
  ) === true
)

test(
  'releases guard when turn moves away from current player',
  shouldReleasePendingDiscardGuard(
    before,
    buildDiscardGuardSnapshot({
      activePosition: 1,
      currentPlayerId: 'p1',
      concealedCount: 13,
      discardPileLength: 7,
      pendingActionsCount: 0,
      availableActions: []
    }),
    false
  ) === true
)

console.log(`\nResult: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
