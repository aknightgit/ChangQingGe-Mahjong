import { isTing, canWin } from './server/utils/handValidator.ts'
import { TileSuit, WindValue } from './server/types/game.ts'

const hand = [
  { suit: TileSuit.DOTS, value: 1 },
  { suit: TileSuit.DOTS, value: 1 },
  { suit: TileSuit.DOTS, value: 1 },
  { suit: TileSuit.DOTS, value: 2 },
  { suit: TileSuit.DOTS, value: 3 },
  { suit: TileSuit.DOTS, value: 3 },
  { suit: TileSuit.DOTS, value: 4 },
  { suit: TileSuit.DOTS, value: 7 },
  { suit: TileSuit.DOTS, value: 8 },
  { suit: TileSuit.DOTS, value: 9 },
  { suit: TileSuit.WIND, value: WindValue.NORTH },
  { suit: TileSuit.WIND, value: WindValue.NORTH },
  { suit: TileSuit.WIND, value: WindValue.NORTH },
]

console.log('isTing', isTing(hand as any, 0, null))

const candidates:any[] = []
for (const v of [1,2,3,4,5,6,7,8,9]) candidates.push({ suit: TileSuit.DOTS, value: v, label:`筒${v}`})
for (const v of [1,2,3,4]) candidates.push({ suit: TileSuit.WIND, value: v, label:`风${v}`})
for (const v of [1,2,3]) candidates.push({ suit: TileSuit.DRAGON, value: v, label:`箭${v}`})
for (const v of [1,2,3,4,5,6,7,8,9]) candidates.push({ suit: TileSuit.CHARACTERS, value: v, label:`万${v}`})
for (const v of [1,2,3,4,5,6,7,8,9]) candidates.push({ suit: TileSuit.BAMBOOS, value: v, label:`条${v}`})
const wins = candidates.filter(c => canWin([...hand, c] as any, 0, null).canWin).map(c=>c.label)
console.log('win draws', wins)
