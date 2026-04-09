import { canWin } from '../server/utils/handValidator.js';

// 4 pungs + pair (wan only)
const hand = [
  { suit: 'wan', value: 1, id: 'w1-1' }, { suit: 'wan', value: 1, id: 'w1-2' }, { suit: 'wan', value: 1, id: 'w1-3' },
  { suit: 'wan', value: 3, id: 'w3-1' }, { suit: 'wan', value: 3, id: 'w3-2' }, { suit: 'wan', value: 3, id: 'w3-3' },
  { suit: 'wan', value: 5, id: 'w5-1' }, { suit: 'wan', value: 5, id: 'w5-2' }, { suit: 'wan', value: 5, id: 'w5-3' },
  { suit: 'wan', value: 7, id: 'w7-1' }, { suit: 'wan', value: 7, id: 'w7-2' }, { suit: 'wan', value: 7, id: 'w7-3' },
  { suit: 'wan', value: 9, id: 'w9-1' }, { suit: 'wan', value: 9, id: 'w9-2' },
];

console.log('no wild:', JSON.stringify(canWin(hand, [], null)));
console.log('wild=wan-5:', JSON.stringify(canWin(hand, [], 'wan-5')));
console.log('wild=wan-1:', JSON.stringify(canWin(hand, [], 'wan-1')));
console.log('wild=wan-9:', JSON.stringify(canWin(hand, [], 'wan-9')));
console.log('wild=tiao-5:', JSON.stringify(canWin(hand, [], 'tiao-5')));
