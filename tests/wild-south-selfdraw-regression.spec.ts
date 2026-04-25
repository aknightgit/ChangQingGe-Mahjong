import { canWin } from '../server/utils/handValidator';
import { TileSuit } from '../server/types/game';

let passed = 0;
let failed = 0;

function test(name: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  PASS ${name}`);
    passed++;
  } else {
    console.log(`  FAIL ${name}${detail ? ` - ${detail}` : ''}`);
    failed++;
  }
}

function tile(id: string, suit: TileSuit, value: number) {
  return { id, suit, value };
}

console.log('\n=== 回归测试: 三张南风作百搭的自摸胡牌 ===\n');

const handTiles = [
  tile('s1', TileSuit.WIND, 2),
  tile('s2', TileSuit.WIND, 2),
  tile('s3', TileSuit.WIND, 2),
  tile('d1', TileSuit.DOTS, 2),
  tile('d2', TileSuit.DOTS, 2),
  tile('d3', TileSuit.DOTS, 2),
  tile('d4', TileSuit.DOTS, 3),
  tile('d5', TileSuit.DOTS, 4),
  tile('d6', TileSuit.DOTS, 6),
  tile('d7', TileSuit.DOTS, 7),
  tile('d8', TileSuit.DOTS, 9),
  tile('j1', TileSuit.DRAGON, 2),
  tile('j2', TileSuit.DRAGON, 2),
  tile('j3', TileSuit.DRAGON, 2),
];

const result = canWin(handTiles, [], 'feng-2');

test(
  '南风为百搭时，这手牌应判定可胡',
  result.canWin,
  `types=${result.types.join(',')}`
);

console.log('\n==================================================');
console.log(`测试结果: ${passed} 通过, ${failed} 失败`);
if (failed > 0) {
  process.exit(1);
}
console.log('三百搭自摸胡牌回归通过');
