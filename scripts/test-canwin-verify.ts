import { canWin, findBestHandTypes } from '../server/utils/handValidator.js';

console.log('=== canWin verification ===');

// Test 1: ALL_TRIPLETS (4 pungs + pair)
const hand1 = [
  { suit: 'wan', value: 1, id: 'w1-1' }, { suit: 'wan', value: 1, id: 'w1-2' }, { suit: 'wan', value: 1, id: 'w1-3' },
  { suit: 'wan', value: 3, id: 'w3-1' }, { suit: 'wan', value: 3, id: 'w3-2' }, { suit: 'wan', value: 3, id: 'w3-3' },
  { suit: 'wan', value: 5, id: 'w5-1' }, { suit: 'wan', value: 5, id: 'w5-2' }, { suit: 'wan', value: 5, id: 'w5-3' },
  { suit: 'wan', value: 7, id: 'w7-1' }, { suit: 'wan', value: 7, id: 'w7-2' }, { suit: 'wan', value: 7, id: 'w7-3' },
  { suit: 'wan', value: 9, id: 'w9-1' }, { suit: 'wan', value: 9, id: 'w9-2' },
];
console.log('\nTest 1: 4 pungs + pair (wan-1, wan-3, wan-5, wan-7 + pair wan-9)');
const r1 = canWin(hand1, [], null);
console.log('canWin =>', JSON.stringify(r1));
const fbht1 = findBestHandTypes(hand1, [], null);
console.log('fbht =>', JSON.stringify(fbht1));

// Test 2: Mixed suits standard
const hand2 = [
  { suit: 'wan', value: 1, id: 'h1' }, { suit: 'wan', value: 2, id: 'h2' }, { suit: 'wan', value: 3, id: 'h3' },
  { suit: 'dots', value: 4, id: 'h4' }, { suit: 'dots', value: 5, id: 'h5' }, { suit: 'dots', value: 6, id: 'h6' },
  { suit: 'tiao', value: 7, id: 'h7' }, { suit: 'tiao', value: 8, id: 'h8' }, { suit: 'tiao', value: 9, id: 'h9' },
  { suit: 'wan', value: 9, id: 'h10' }, { suit: 'wan', value: 9, id: 'h11' }, { suit: 'dots', value: 1, id: 'h12' },
  { suit: 'dots', value: 2, id: 'h13' }, { suit: 'dots', value: 3, id: 'h14' },
];
console.log('\nTest 2: 3 sequences (wan123, dots456, tiao789) + pair dots123');
const r2 = canWin(hand2, [], null);
console.log('canWin =>', JSON.stringify(r2));
const fbht2 = findBestHandTypes(hand2, [], null);
console.log('fbht =>', JSON.stringify(fbht2));

// Test 3: Wild tile - all triplets
const hand3 = [
  { suit: 'wan', value: 1, id: 'w1-1' }, { suit: 'wan', value: 1, id: 'w1-2' }, { suit: 'wan', value: 1, id: 'w1-3' },
  { suit: 'wan', value: 3, id: 'w3-1' }, { suit: 'wan', value: 3, id: 'w3-2' }, { suit: 'wan', value: 3, id: 'w3-3' },
  { suit: 'wan', value: 5, id: 'w5-1' }, { suit: 'wan', value: 5, id: 'w5-2' }, { suit: 'wan', value: 5, id: 'w5-3' },
  { suit: 'wan', value: 7, id: 'w7-1' }, { suit: 'wan', value: 7, id: 'w7-2' }, { suit: 'wan', value: 7, id: 'w7-3' },
  { suit: 'wan', value: 9, id: 'w9-1' }, { suit: 'wan', value: 9, id: 'w9-2' },
];
console.log('\nTest 3: Same as test 1 but with wild=wan-5');
const r3 = canWin(hand3, [], 'wan-5');
console.log('canWin =>', JSON.stringify(r3));

console.log('\n=== Done ===');
