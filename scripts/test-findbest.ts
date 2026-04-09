import { findBestHandTypes, detectTypes, canWin } from '../server/utils/handValidator.js';

function t(suit: string, value: number, id: string) {
  return { suit, value, id };
}

// Test 1: hand with 4 wilds (dots-1) and 10 jank tiles
const hand1 = [
  // 4 wilds (dots-1)
  t('dots', 1, 'd1w1'), t('dots', 1, 'd1w2'), t('dots', 1, 'd1w3'), t('dots', 1, 'd1w4'),
  // 10 jank tiles - mixed suits
  t('wan', 1, 'w1'), t('wan', 2, 'w2'), t('wan', 3, 'w3'),
  t('tiao', 5, 't5'), t('tiao', 5, 't5b'), t('tiao', 6, 't6'),
  t('wan', 9, 'w9'), t('wan', 9, 'w9b'),
  t('tiao', 7, 't7'), t('tiao', 8, 't8'),
];
const exposed1: any[] = [];
const wildTileId1 = 'dots-1';

console.log('=== Test 1: 4 wilds + 10 jank (mixed suits) ===');
console.log('wildTileId:', wildTileId1);
const r1 = findBestHandTypes(hand1, exposed1, wildTileId1);
console.log('findBestHandTypes:', JSON.stringify(r1));
const cw1 = canWin(hand1, exposed1, wildTileId1);
console.log('canWin:', JSON.stringify(cw1));

// Test 2: 14-tile hand NO wilds, single suit
const hand2 = [
  t('wan', 1, 'w1'), t('wan', 1, 'w1b'), t('wan', 1, 'w1c'), // pong 1wan
  t('wan', 2, 'w2'), t('wan', 3, 'w3'), t('wan', 4, 'w4'), // chow 234
  t('wan', 5, 'w5'), t('wan', 5, 'w5b'), t('wan', 5, 'w5c'), // pong 5wan
  t('wan', 7, 'w7'), t('wan', 8, 'w8'), t('wan', 9, 'w9'), // chow 789
  t('wan', 9, 'w9b'), t('wan', 9, 'w9c'), // pair 9wan
];
console.log('\n=== Test 2: 14-tile single-suit (FULL_FLUSH) ===');
const cw2 = canWin(hand2, [], null);
console.log('canWin:', JSON.stringify(cw2));

// Test 3: 14-tile ALL_TRIPLETS
const hand3 = [
  t('wan', 1, 'w1a'), t('wan', 1, 'w1b'), t('wan', 1, 'w1c'),
  t('wan', 3, 'w3a'), t('wan', 3, 'w3b'), t('wan', 3, 'w3c'),
  t('wan', 5, 'w5a'), t('wan', 5, 'w5b'), t('wan', 5, 'w5c'),
  t('wan', 7, 'w7a'), t('wan', 7, 'w7b'), t('wan', 7, 'w7c'),
  t('wan', 9, 'w9a'), t('wan', 9, 'w9b'),
];
console.log('\n=== Test 3: ALL_TRIPLETS (14 tiles) ===');
const cw3 = canWin(hand3, [], null);
console.log('canWin:', JSON.stringify(cw3));
