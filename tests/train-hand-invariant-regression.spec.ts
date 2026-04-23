import { expectedHandCountForPhase } from '../scripts/train-ai-ak'

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

console.log('\n=== Regression: training hand invariant expectations ===\n')

test('deal/discard state uses 13 tiles with zero melds', expectedHandCountForPhase(0, 'discard') === 13)
test('draw state uses 14 tiles with zero melds', expectedHandCountForPhase(0, 'draw') === 14)
test('claim state uses 11 tiles after one meld', expectedHandCountForPhase(1, 'claim') === 11)
test('claim-discard state uses 10 tiles after one meld', expectedHandCountForPhase(1, 'claim_discard') === 10)
test('claim state uses 8 tiles after two melds', expectedHandCountForPhase(2, 'claim') === 8)
test('draw state uses 8 tiles after two melds', expectedHandCountForPhase(2, 'draw') === 8)

console.log(`\nResult: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
