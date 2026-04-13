import { canWin } from './utils/handValidator'
import { TileSuit } from './types/game'
import { normalizeHand } from './utils/tiles'

// Test 1: 手牌11张+1个暗杠(碰)=14张, 百搭wan-9
const wildTile = "wan-9"

const hand11: any[] = [
  {suit: 'wan', value: 9, id: 'w1', isFlower: false},
  {suit: 'wan', value: 9, id: 'w2', isFlower: false},
  {suit: 'wan', value: 9, id: 'w3', isFlower: false},
  {suit: 'dots', value: 1, id: 'd1', isFlower: false},
  {suit: 'dots', value: 1, id: 'd2', isFlower: false},
  {suit: 'dots', value: 1, id: 'd3', isFlower: false},
  {suit: 'tiao', value: 5, id: 'b1', isFlower: false},
  {suit: 'tiao', value: 5, id: 'b2', isFlower: false},
  {suit: 'tiao', value: 5, id: 'b3', isFlower: false},
  {suit: 'wan', value: 1, id: 'y1', isFlower: false},
  {suit: 'wan', value: 1, id: 'y2', isFlower: false},
]

const exposed1 = [{
  type: 2, tiles: [
    {suit: 'dots', value: 5, id: 'p1', isFlower: false},
    {suit: 'dots', value: 5, id: 'p2', isFlower: false},
    {suit: 'dots', value: 5, id: 'p3', isFlower: false},
  ]
}]

console.log('Test1: hand=11, 1 pung, wild=wan-9:', JSON.stringify(canWin(hand11, exposed1, wildTile)))

// Test 2: 8张+2 pung=14张
const hand8: any[] = [
  {suit: 'wan', value: 9, id: 'w1', isFlower: false},
  {suit: 'wan', value: 9, id: 'w2', isFlower: false},
  {suit: 'wan', value: 9, id: 'w3', isFlower: false},
  {suit: 'wan', value: 9, id: 'w4', isFlower: false},
  {suit: 'wan', value: 1, id: 'y1', isFlower: false},
  {suit: 'wan', value: 1, id: 'y2', isFlower: false},
  {suit: 'wan', value: 2, id: 'y3', isFlower: false},
  {suit: 'wan', value: 3, id: 'y4', isFlower: false},
]

const exposed2 = [
  {type: 2, tiles: [
    {suit: 'dots', value: 5, id: 'p1', isFlower: false},
    {suit: 'dots', value: 5, id: 'p2', isFlower: false},
    {suit: 'dots', value: 5, id: 'p3', isFlower: false},
  ]},
  {type: 2, tiles: [
    {suit: 'tiao', value: 5, id: 'p4', isFlower: false},
    {suit: 'tiao', value: 5, id: 'p5', isFlower: false},
    {suit: 'tiao', value: 5, id: 'p6', isFlower: false},
  ]},
]

console.log('Test2: hand=8, 2 pung, wild=wan-9:', JSON.stringify(canWin(hand8, exposed2, wildTile)))

// Test 3: 11张+1 pung (all triplets)，百搭wan-9，wild替代9万
const hand11b: any[] = [
  {suit: 'wan', value: 9, id: 'w1', isFlower: false}, // wild
  {suit: 'wan', value: 9, id: 'w2', isFlower: false}, // wild
  {suit: 'wan', value: 9, id: 'w3', isFlower: false}, // wild  
  {suit: 'wan', value: 9, id: 'w4', isFlower: false}, // wild
  {suit: 'wan', value: 1, id: 'y1', isFlower: false},
  {suit: 'wan', value: 1, id: 'y2', isFlower: false},
  {suit: 'wan', value: 2, id: 'y3', isFlower: false},
  {suit: 'wan', value: 3, id: 'y4', isFlower: false},
  {suit: 'dots', value: 1, id: 'd1', isFlower: false},
  {suit: 'dots', value: 1, id: 'd2', isFlower: false},
  {suit: 'dots', value: 1, id: 'd3', isFlower: false},
]

const r3 = canWin(hand11b, [{
  type: 2, tiles: [
    {suit: 'dots', value: 5, id: 'p1', isFlower: false},
    {suit: 'dots', value: 5, id: 'p2', isFlower: false},
    {suit: 'dots', value: 5, id: 'p3', isFlower: false},
  ]
}], wildTile)
console.log('Test3: hand=11, 1 pung, wild=wan-9, all triplets:', JSON.stringify(r3))
