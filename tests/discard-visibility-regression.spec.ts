import { collectClaimedDiscardIds, filterVisibleDiscards } from '../app/utils/discardVisibility'

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

function tile(id: string) {
  return { id, suit: 'wan', value: 1, isFlower: false } as any
}

console.log('\n=== Regression: claimed discard visibility ===\n')

const players = [
  {
    id: 'p1',
    hand: {
      exposedMelds: [],
      discardedTiles: [tile('d1'), tile('d2')],
    },
  },
  {
    id: 'p2',
    hand: {
      exposedMelds: [
        {
          type: 'triplet',
          tiles: [tile('d2'), tile('x1'), tile('x2')],
          sourceTileId: 'd2',
        },
      ],
      discardedTiles: [],
    },
  },
] as any

const claimedIds = collectClaimedDiscardIds(players)
const visible = filterVisibleDiscards(players[0].hand.discardedTiles, claimedIds)

test('collects claimed source tile ids from exposed melds', claimedIds.has('d2') === true)
test('filters out the claimed discard from visible discard lanes', visible.map((t: any) => t.id).join(',') === 'd1')
test('keeps unrelated discards visible', visible.length === 1 && visible[0].id === 'd1')

console.log(`\nResult: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
