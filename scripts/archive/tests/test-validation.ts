/**
 * 麻将核心功能验证测试集
 * 验证：canWin 一致性、百搭最优分配
 */

import { canWin, findBestHandTypes, findBestDiscardForTing, HandType } from '../server/utils/handValidator';
import { Tile, TileSuit, Meld } from '../server/types/game';

// TileSuit 别名（统一使用）
const WAN = TileSuit.CHARACTERS;
const TIAO = TileSuit.BAMBOOS;
const TONG = TileSuit.DOTS;
const FENG = TileSuit.WIND;
const JIAN = TileSuit.DRAGON;

let _id = 0;
function T(suit: TileSuit, value: number): Tile {
  return { suit, value, id: `${suit}-${value}-${_id++}`, isFlower: false };
}
function W(suit: TileSuit, value: number): Tile {
  // 百搭牌：suit 和 value 与 wildTileId 匹配
  return { suit, value, id: `${suit}-${value}-${_id++}`, isFlower: false };
}

interface TestCase {
  name: string;
  hand: Tile[];
  exposed: Meld[];
  wildTileId: string | null;
  expectWin: boolean;
  expectTypes?: HandType[];
  desc: string;
}

const tests: TestCase[] = [];

// ============================================================
// 1. 基础胡牌测试
// ============================================================

// 标准手牌：1-2-3万 + 4-5-6万 + 7-8-9万 + 1-1-1万 + 2-2条 = 14张
tests.push({
  name: '标准胡牌-14张',
  hand: [
    T(WAN, 1), T(WAN, 2), T(WAN, 3),
    T(WAN, 4), T(WAN, 5), T(WAN, 6),
    T(WAN, 7), T(WAN, 8), T(WAN, 9),
    T(WAN, 1), T(WAN, 1), T(WAN, 1),
    T(TIAO, 2), T(TIAO, 2),
  ],
  exposed: [],
  wildTileId: null,
  expectWin: true,
  desc: '3顺子+1刻子+1对=14张，标准胡牌'
});

// 碰碰胡：1-1-1万 + 2-2-2万 + 3-3-3万 + 4-4条 = 11张
tests.push({
  name: '碰碰胡-11张',
  hand: [
    T(WAN, 1), T(WAN, 1), T(WAN, 1),
    T(WAN, 2), T(WAN, 2), T(WAN, 2),
    T(WAN, 3), T(WAN, 3), T(WAN, 3),
    T(TIAO, 4), T(TIAO, 4),
  ],
  exposed: [],
  wildTileId: null,
  expectWin: true,
  expectTypes: [HandType.ALL_TRIPLETS],
  desc: '3组刻子+1对=11张，碰碰胡'
});

// ============================================================
// 2. 百搭牌测试
// ============================================================

// 百搭替代：1-2万 + 百搭(3万) + 4-5-6万 + 7-8-9万 + 1-1-1万 + 2-2条 = 14张
tests.push({
  name: '百搭替代-胡牌',
  hand: [
    T(WAN, 1), T(WAN, 2),
    W(WAN, 3), // 百搭=3万
    T(WAN, 4), T(WAN, 5), T(WAN, 6),
    T(WAN, 7), T(WAN, 8), T(WAN, 9),
    T(WAN, 1), T(WAN, 1), T(WAN, 1),
    T(TIAO, 2), T(TIAO, 2),
  ],
  exposed: [],
  wildTileId: 'wan-3',
  expectWin: true,
  desc: '百搭替代3万形成顺子，标准胡牌'
});

// 百搭最优分配：2个百搭，14张
// 1-1-1万 + 2-2-2万 + 3-3-3万 + 百搭(1万) + 百搭(2万) + 1-1条 = 14张
tests.push({
  name: '百搭最优分配',
  hand: [
    T(WAN, 1), T(WAN, 1), T(WAN, 1),
    W(WAN, 1), // 百搭=1万
    T(WAN, 2), T(WAN, 2), T(WAN, 2),
    W(WAN, 2), // 百搭=2万
    T(WAN, 3), T(WAN, 3), T(WAN, 3),
    T(TIAO, 1), T(TIAO, 1),
  ],
  exposed: [],
  wildTileId: 'wan-1',
  expectWin: true,
  desc: '2个百搭+3刻子+1对=14张，应该能胡'
});

// ============================================================
// 3. 风一色测试（K哥修正：不需要3n+2）
// ============================================================

tests.push({
  name: '风一色-纯风牌',
  hand: [
    T(FENG, 1), T(FENG, 1), T(FENG, 1),
    T(FENG, 2), T(FENG, 2), T(FENG, 2),
    T(FENG, 3), T(FENG, 3), T(FENG, 3),
    T(FENG, 4), T(FENG, 4),
  ],
  exposed: [],
  wildTileId: null,
  expectWin: true,
  expectTypes: [HandType.ALL_WIND],
  desc: '全部风牌，风一色胡牌（不需要3n+2）'
});

tests.push({
  name: '风碰-风一色+碰碰胡',
  hand: [
    T(FENG, 1), T(FENG, 1), T(FENG, 1),  // 东×3
    T(FENG, 2), T(FENG, 2), T(FENG, 2),  // 南×3
    T(FENG, 3), T(FENG, 3), T(FENG, 3),  // 西×3
    T(FENG, 4), T(FENG, 4), T(FENG, 4),  // 北×3
    T(JIAN, 1), T(JIAN, 1),              // 中×2 (对子)
  ],
  exposed: [],
  wildTileId: null,
  expectWin: true,
  desc: '风一色+碰碰胡=风碰，14张（风牌+箭牌）'
});

// ============================================================
// 4. 混一色测试
// ============================================================

tests.push({
  name: '混一色胡牌',
  hand: [
    T(WAN, 1), T(WAN, 2), T(WAN, 3),
    T(WAN, 4), T(WAN, 5), T(WAN, 6),
    T(WAN, 7), T(WAN, 8), T(WAN, 9),
    T(FENG, 1), T(FENG, 1),
    T(FENG, 2), T(FENG, 2), T(FENG, 2),
  ],
  exposed: [],
  wildTileId: null,
  expectWin: true,
  expectTypes: [HandType.HALF_FLUSH],
  desc: '混一色胡牌'
});

// ============================================================
// 5. 清一色测试
// ============================================================

tests.push({
  name: '清一色胡牌',
  hand: [
    T(WAN, 1), T(WAN, 2), T(WAN, 3),
    T(WAN, 4), T(WAN, 5), T(WAN, 6),
    T(WAN, 7), T(WAN, 8), T(WAN, 9),
    T(WAN, 1), T(WAN, 1),
    T(WAN, 2), T(WAN, 2), T(WAN, 2),
  ],
  exposed: [],
  wildTileId: null,
  expectWin: true,
  expectTypes: [HandType.FULL_FLUSH],
  desc: '清一色胡牌'
});

// ============================================================
// 6. 不胡牌测试
// ============================================================

tests.push({
  name: '不胡-散牌',
  hand: [
    T(WAN, 1), T(WAN, 3), T(WAN, 5),
    T(WAN, 7), T(WAN, 9),
    T(TIAO, 1), T(TIAO, 3), T(TIAO, 5),
    T(TIAO, 7), T(TIAO, 9),
    T(FENG, 1), T(FENG, 2), T(FENG, 3),
  ],
  exposed: [],
  wildTileId: null,
  expectWin: false,
  desc: '13张散牌，远未听牌'
});

tests.push({
  name: '不胡-12张',
  hand: [
    T(WAN, 1), T(WAN, 2), T(WAN, 3),
    T(WAN, 4), T(WAN, 5), T(WAN, 6),
    T(WAN, 7), T(WAN, 8), T(WAN, 9),
    T(TIAO, 1), T(TIAO, 1), T(TIAO, 1),
  ],
  exposed: [],
  wildTileId: null,
  expectWin: false,
  desc: '12张，不是有效手牌数'
});

// ============================================================
// 运行测试
// ============================================================

let passed = 0;
let failed = 0;
const results: string[] = [];

for (const tc of tests) {
  const errors: string[] = [];

  // 测试 canWin
  const winResult = canWin(tc.hand, tc.exposed, tc.wildTileId);
  if (winResult.canWin !== tc.expectWin) {
    errors.push(`canWin: 期望 ${tc.expectWin}, 实际 ${winResult.canWin}`);
  }

  // 测试牌型
  if (tc.expectTypes && winResult.canWin) {
    for (const et of tc.expectTypes) {
      if (!winResult.types.includes(et)) {
        errors.push(`牌型: 缺少 ${HandType[et]}, 实际 [${winResult.types.map(t => HandType[t]).join(', ')}]`);
      }
    }
  }

  if (errors.length === 0) {
    passed++;
    results.push(`✅ ${tc.name}: ${tc.desc}`);
  } else {
    failed++;
    results.push(`❌ ${tc.name}: ${tc.desc}`);
    for (const e of errors) {
      results.push(`   ${e}`);
    }
  }
}

// ============================================================
// 输出结果
// ============================================================

console.log('\n========================================');
console.log('麻将核心功能验证测试');
console.log('========================================\n');

for (const r of results) {
  console.log(r);
}

console.log(`\n========================================`);
console.log(`总计: ${passed + failed} 项, 通过 ${passed}, 失败 ${failed}`);
console.log(`========================================`);

if (failed > 0) {
  process.exit(1);
}
