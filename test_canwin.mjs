import { canWin } from './server/utils/handValidator.js';
import { TileSuit } from './server/types/game.js';

const concealed = [
  { id: 'dots-6-3', suit: TileSuit.DOTS, value: 6 },
  { id: 'dots-7-1', suit: TileSuit.DOTS, value: 7 },
  { id: 'feng-bei-1', suit: TileSuit.WIND, value: 4 },
  { id: 'feng-bei-2', suit: TileSuit.WIND, value: 4 },
  { id: 'feng-bei-0', suit: TileSuit.WIND, value: 4 },
  { id: 'jian-fa-1', suit: TileSuit.DRAGON, value: 2 },
  { id: 'jian-fa-3', suit: TileSuit.DRAGON, value: 2 },
];

const testTile5 = { id: 'test-5', suit: TileSuit.DOTS, value: 5 };
const testTile8 = { id: 'test-8', suit: TileSuit.DOTS, value: 8 };

const exposedMelds = [
  { type: 'triplet', tiles: [{ id: 'hua-zhu', suit: TileSuit.FLOWER, value: 7 }], isConcealed: false },
  { type: 'sequence', tiles: [
    { id: 'dots-1-0', suit: TileSuit.DOTS, value: 1 },
    { id: 'dots-2-1', suit: TileSuit.DOTS, value: 2 },
    { id: 'dots-3-3', suit: TileSuit.DOTS, value: 3 }
  ], isConcealed: false },
  { type: 'sequence', tiles: [
    { id: 'dots-2-2', suit: TileSuit.DOTS, value: 2 },
    { id: 'dots-3-0', suit: TileSuit.DOTS, value: 3 },
    { id: 'dots-4-2', suit: TileSuit.DOTS, value: 4 }
  ], isConcealed: false }
];

console.log('=== Test draw 五筒 (dots-5) with wild=wan-4 ===');
const r5 = canWin([...concealed, testTile5], exposedMelds, 'wan-4');
console.log('canWin:', r5.canWin, 'types:', r5.types);

console.log('\n=== Test draw 八筒 (dots-8) with wild=wan-4 ===');
const r8 = canWin([...concealed, testTile8], exposedMelds, 'wan-4');
console.log('canWin:', r8.canWin, 'types:', r8.types);

console.log('\n=== Test draw 五筒 (dots-5) WITHOUT wild ===');
const r5n = canWin([...concealed, testTile5], exposedMelds, null);
console.log('canWin:', r5n.canWin, 'types:', r5n.types);

console.log('\n=== Test draw 八筒 (dots-8) WITHOUT wild ===');
const r8n = canWin([...concealed, testTile8], exposedMelds, null);
console.log('canWin:', r8n.canWin, 'types:', r8n.types);
