import { canWin, buildWildTileChecker } from '../server/utils/handValidator.ts'
import { calcTenpaiDistance } from './route-evaluator.ts'
import { TileSuit } from '../server/types/game.ts'

// 模拟AK第0回合手牌（wild=dots-7）
const hand = [
  {suit:'dots',value:1,id:'d1'},{suit:'wan',value:4,id:'w4'},{suit:'dots',value:4,id:'d4'},
  {suit:'dots',value:1,id:'d1b'},{suit:'wan',value:7,id:'w7'},{suit:'wan',value:2,id:'w2'},
  {suit:'tiao',value:6,id:'t6'},{suit:'wan',value:8,id:'w8'},{suit:'dots',value:3,id:'d3'},
  {suit:'wan',value:8,id:'w8b'},{suit:'dots',value:8,id:'d8'},{suit:'feng',value:2,id:'f2'},
  {suit:'feng',value:1,id:'f1'},{suit:'dots',value:7,id:'d7'}
]

const wildFn = buildWildTileChecker('dots-7')
console.log('=== Round 0 hand (14 tiles, wild=dots-7) ===')
console.log('canWin:', JSON.stringify(canWin(hand, 0, wildFn)))
console.log('calcTenpaiDistance:', calcTenpaiDistance(hand, [], TileSuit.DOTS, 7))

// 弃1张后shanten
console.log('\n=== 弃1张后shanten ≤2 ===')
for (let i = 0; i < hand.length; i++) {
  const after = hand.filter((_, j) => j !== i)
  const sh = calcTenpaiDistance(after, [], TileSuit.DOTS, 7)
  if (sh <= 2) {
    const cw = canWin(after, 0, wildFn)
    console.log(`弃${hand[i].id}→sh=${sh} canWin=${cw.canWin}`)
  }
}

// 找最佳弃牌（shanten最低）
console.log('\n=== 最佳弃牌 ===')
let best = null, bestSh = 99
for (let i = 0; i < hand.length; i++) {
  const after = hand.filter((_, j) => j !== i)
  const sh = calcTenpaiDistance(after, [], TileSuit.DOTS, 7)
  if (sh < bestSh) { bestSh = sh; best = hand[i] }
}
console.log(`最佳弃: ${best?.id}, shanten=${bestSh}`)
