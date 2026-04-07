import { canWin } from '../server/utils/handValidator'
const wildNull: string | null = null

// 4个面子(1-9 dots各3个) + 1对(wan-1)
const hand_full = [
  { suit: 'dots', value: 1, id: 'd1a', isFlower: false },
  { suit: 'dots', value: 2, id: 'd2a', isFlower: false },
  { suit: 'dots', value: 3, id: 'd3a', isFlower: false },
  { suit: 'dots', value: 1, id: 'd1b', isFlower: false },
  { suit: 'dots', value: 2, id: 'd2b', isFlower: false },
  { suit: 'dots', value: 3, id: 'd3b', isFlower: false },
  { suit: 'dots', value: 1, id: 'd1c', isFlower: false },
  { suit: 'dots', value: 2, id: 'd2c', isFlower: false },
  { suit: 'dots', value: 3, id: 'd3c', isFlower: false },
  { suit: 'dots', value: 1, id: 'd1d', isFlower: false },
  { suit: 'dots', value: 2, id: 'd2d', isFlower: false },
  { suit: 'dots', value: 3, id: 'd3d', isFlower: false },
  { suit: 'wan', value: 1, id: 'w1a', isFlower: false },
  { suit: 'wan', value: 1, id: 'w1b', isFlower: false },
]
console.log('=== Test: 4 seq(1-9) + pair(wan) = 14 tiles ===')
console.log('Hand:', hand_full.map(t => `${t.suit[0]}${t.value}`).join(', '))
console.log('Dots count:', hand_full.filter(t=>t.suit==='dots').length)
const r1 = canWin(hand_full, [], wildNull)
console.log('canWin:', JSON.stringify(r1))
console.log()

// 3 triplets + 1 seq + 1 pair
const hand_full2 = [
  { suit: 'dots', value: 1, id: 'd1a', isFlower: false },
  { suit: 'dots', value: 1, id: 'd1b', isFlower: false },
  { suit: 'dots', value: 1, id: 'd1c', isFlower: false },
  { suit: 'dots', value: 2, id: 'd2a', isFlower: false },
  { suit: 'dots', value: 2, id: 'd2b', isFlower: false },
  { suit: 'dots', value: 2, id: 'd2c', isFlower: false },
  { suit: 'dots', value: 3, id: 'd3a', isFlower: false },
  { suit: 'dots', value: 3, id: 'd3b', isFlower: false },
  { suit: 'dots', value: 3, id: 'd3c', isFlower: false },
  { suit: 'dots', value: 4, id: 'd4a', isFlower: false },
  { suit: 'dots', value: 5, id: 'd5a', isFlower: false },
  { suit: 'dots', value: 6, id: 'd6a', isFlower: false },
  { suit: 'wan', value: 1, id: 'w1a', isFlower: false },
  { suit: 'wan', value: 1, id: 'w1b', isFlower: false },
]
console.log('=== Test: 3 triplets + 1 seq + 1 pair ===')
console.log('Hand:', hand_full2.map(t => `${t.suit[0]}${t.value}`).join(', '))
const r2 = canWin(hand_full2, [], wildNull)
console.log('canWin:', JSON.stringify(r2))
