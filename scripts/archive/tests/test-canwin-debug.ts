/**
 * 快速测试 canWin 函数 - 使用正确的 TileSuit 枚举值
 */
import { canWin, findBestHandTypes, HandType } from '../server/utils/handValidator.js';
import { TileSuit } from '../server/types/game.js';

// TileSuit: CHARACTERS='wan', DOTS='dots', BAMBOOS='tiao', WIND='feng', DRAGON='jian', FLOWER='hua'

function t(suit: string, value: number, id?: string): any {
  return { suit, value, id: id || `${suit}-${value}` };
}

const tests = [
  {
    name: 'FOUR_WILD: wild=wan-8, 4 wilds + 10 jank',
    hand: [
      t('wan', 8), t('wan', 8), t('wan', 8), t('wan', 8), // 4 wilds (wan-8)
      t('wan', 1), t('wan', 2), t('wan', 3), // chow 123
      t('wan', 4), t('wan', 5), t('wan', 6), // chow 456
      t('wan', 7), t('wan', 9), // pair 79
      t('wan', 9) // extra
    ],
    exposed: [],
    wildTileId: 'wan-8'
  },
  {
    name: 'FOUR_WILD: wild=tiao-8, 4 wilds + 10 jank',
    hand: [
      t('tiao', 8), t('tiao', 8), t('tiao', 8), t('tiao', 8), // 4 wilds (tiao-8)
      t('wan', 1), t('wan', 2), t('wan', 3), // chow 123
      t('wan', 4), t('wan', 5), t('wan', 6), // chow 456
      t('wan', 7), t('wan', 9), // pair 79
      t('wan', 9) // extra
    ],
    exposed: [],
    wildTileId: 'tiao-8'
  },
  {
    name: 'FOUR_WILD: wild=wan-8, exact 4 wilds',
    hand: [
      t('wan', 8), t('wan', 8), t('wan', 8), t('wan', 8), // 4 wilds
      t('wan', 1), t('wan', 1), t('wan', 1), t('wan', 1), // pong 1wan
      t('wan', 9), t('wan', 9), t('wan', 9), t('wan', 9), // pong 9wan
      t('wan', 2) // extra
    ],
    exposed: [],
    wildTileId: 'wan-8'
  },
  {
    name: 'Normal: wild=null, valid 3n+2 hand (混一色)',
    hand: [
      t('wan', 1), t('wan', 1), t('wan', 1), // pong 1wan
      t('wan', 2), t('wan', 3), t('wan', 4), // chow 234
      t('wan', 5), t('wan', 5), t('wan', 5), // pong 5wan
      t('wan', 7), t('wan', 8), t('wan', 9), // chow 789
      t('wan', 9), t('wan', 9) // pair 9wan
    ],
    exposed: [],
    wildTileId: null
  },
  {
    name: 'ALL_TRIPLETS: wild=null, all triplets',
    hand: [
      t('wan', 1), t('wan', 1), t('wan', 1), // pong 1
      t('wan', 3), t('wan', 3), t('wan', 3), // pong 3
      t('wan', 5), t('wan', 5), t('wan', 5), // pong 5
      t('wan', 7), t('wan', 7), t('wan', 7), // pong 7
      t('wan', 9), t('wan', 9) // pair 9
    ],
    exposed: [],
    wildTileId: null
  },
  {
    name: 'EIGHT_FLOWERS: 8 flowers',
    hand: [
      t('hua', 1), t('hua', 2), t('hua', 3), t('hua', 4),
      t('hua', 5), t('hua', 6), t('hua', 7), t('hua', 8),
      t('wan', 1), t('wan', 1), t('wan', 1), t('wan', 1),
      t('wan', 2), t('wan', 2)
    ],
    exposed: [],
    wildTileId: null
  },
  {
    name: 'DA_DIAO: 2 concealed + 1 exposed meld',
    hand: [t('wan', 9), t('wan', 9)],
    exposed: [{ type: 'TRIPLET', tiles: [t('wan', 5), t('wan', 5), t('wan', 5)] }],
    wildTileId: null
  },
  {
    name: 'FULL_FLUSH: wild=null, one suit only',
    hand: [
      t('wan', 1), t('wan', 1), t('wan', 1), // pong 1
      t('wan', 2), t('wan', 3), t('wan', 4), // chow 234
      t('wan', 5), t('wan', 5), t('wan', 5), // pong 5
      t('wan', 7), t('wan', 8), t('wan', 9), // chow 789
      t('wan', 9) // extra
    ],
    exposed: [],
    wildTileId: null
  },
];

console.log('=== canWin Test Results ===\n');
let pass = 0, fail = 0;
for (const test of tests) {
  const result = canWin(test.hand, test.exposed, test.wildTileId);
  const fbht = findBestHandTypes(test.hand, test.exposed, test.wildTileId);
  const status = result.canWin ? '✅ WIN' : '❌ LOSE';
  if (result.canWin) pass++; else fail++;
  console.log(`${status} | ${test.name}`);
  console.log(`   wildTileId=${test.wildTileId}, hand=${test.hand.length}, exposed=${test.exposed.length}`);
  console.log(`   canWin types=[${result.types.join(', ')}]`);
  console.log(`   fbht types=[${fbht.join(', ')}]`);
  console.log();
}
console.log(`Total: ${pass} pass, ${fail} fail`);
