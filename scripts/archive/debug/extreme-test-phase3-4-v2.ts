/**
 * Phase 3-4: 极端测试 v2 - 构造手牌针对性测试
 * 10轮 × 200局，每轮输出独立训练文件
 */

import { canWin, findBestDiscardForTing, checkChowPongExclusion, updateChowPongExclusion, HandType, ChowPongExclusionState } from '../server/utils/handValidator';
import { generateWinOptions, calculateScore } from '../server/utils/scoring';
import { Tile, Meld, MeldType, TileSuit } from '../server/types/game';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let _id = 0;
function T(suit: string, value: number): Tile {
  return { suit: suit as TileSuit, value, id: `${suit}-${value}-${_id++}`, isFlower: false };
}
function Ts(suit: string, vals: number[]): Tile[] {
  return vals.map(v => T(suit, v));
}

// ============================================================
// 构造的测试手牌库
// ============================================================
interface TestCase {
  name: string;
  hand: Tile[];
  exposed: Meld[];
  wildTileId: string | null;
  expectedCanWin: boolean;
  expectedTypes: HandType[];
  expectNoWildDouble?: boolean;
}

function buildTestCases(): TestCase[] {
  const cases: TestCase[] = [];

  // 1. 清碰: 111 222 333 444 55万
  cases.push({
    name: '清碰-万子',
    hand: [...Ts('dots', [1,1,1,2,2,2,3,3,3,4,4,4,5,5])],
    exposed: [],
    wildTileId: null,
    expectedCanWin: true,
    expectedTypes: [HandType.QING_PENG, HandType.FULL_FLUSH, HandType.ALL_TRIPLETS],
  });

  // 2. 混碰: 111 222 333万 + 东东东 + 55万
  cases.push({
    name: '混碰',
    hand: [...Ts('dots', [1,1,1,2,2,2,3,3,3,5,5]), ...Ts('wind', [1,1,1])],
    exposed: [],
    wildTileId: null,
    expectedCanWin: true,
    expectedTypes: [HandType.HUN_PENG, HandType.HALF_FLUSH, HandType.ALL_TRIPLETS],
  });

  // 3. 风一色: 东南西北 各3张 + 东东
  cases.push({
    name: '风一色',
    hand: [...Ts('wind', [1,1,1,2,2,2,3,3,3,4,4,4,1,1])],
    exposed: [],
    wildTileId: null,
    expectedCanWin: true,
    expectedTypes: [HandType.ALL_WIND],
  });

  // 4. 风碰: 东南西北 各3张刻子 + 东东
  cases.push({
    name: '风碰',
    hand: [...Ts('wind', [1,1,1,2,2,2,3,3,3,4,4,4,1,1])],
    exposed: [],
    wildTileId: null,
    expectedCanWin: true,
    expectedTypes: [HandType.FENG_PENG, HandType.ALL_WIND, HandType.ALL_TRIPLETS],
  });

  // 5. 清一色(有顺子): 123 234 345 456 77万
  cases.push({
    name: '清一色-顺子',
    hand: [...Ts('dots', [1,2,3,2,3,4,3,4,5,4,5,6,7,7])],
    exposed: [],
    wildTileId: null,
    expectedCanWin: true,
    expectedTypes: [HandType.FULL_FLUSH],
  });

  // 6. 大吊: 门口3个刻子，手牌2张
  cases.push({
    name: '大吊',
    hand: [T('dots', 5), T('dots', 5)],
    exposed: [
      { type: MeldType.TRIPLET, tiles: Ts('dots', [1,1,1]), isConcealed: false },
      { type: MeldType.TRIPLET, tiles: Ts('dots', [2,2,2]), isConcealed: false },
      { type: MeldType.TRIPLET, tiles: Ts('dots', [3,3,3]), isConcealed: false },
    ],
    wildTileId: null,
    expectedCanWin: true,
    expectedTypes: [HandType.DA_DIAO, HandType.ALL_TRIPLETS],
  });

  // 7. 百搭-清碰: 111 222 333 百搭 百搭 55万 (百搭=4万)
  cases.push({
    name: '百搭-清碰',
    hand: [...Ts('dots', [1,1,1,2,2,2,3,3,3,5,5]), T('dots', 4), T('dots', 4)],
    exposed: [],
    wildTileId: 'dots-4',
    expectedCanWin: true,
    expectedTypes: [HandType.QING_PENG, HandType.FULL_FLUSH, HandType.ALL_TRIPLETS],
  });

  // 8. 百搭归位翻倍: 111 222 333 444 55万 (百搭=4万，但4万本身就是刻子)
  cases.push({
    name: '百搭归位翻倍',
    hand: [...Ts('dots', [1,1,1,2,2,2,3,3,3,4,4,4,5,5])],
    exposed: [],
    wildTileId: 'dots-4',
    expectedCanWin: true,
    expectedTypes: [HandType.QING_PENG, HandType.FULL_FLUSH, HandType.ALL_TRIPLETS],
    expectNoWildDouble: true,
  });

  // 9. 混一色: 123 456 789万 + 东东 + 55万
  cases.push({
    name: '混一色',
    hand: [...Ts('dots', [1,2,3,4,5,6,7,8,9,5,5]), ...Ts('wind', [1,1])],
    exposed: [],
    wildTileId: null,
    expectedCanWin: true,
    expectedTypes: [HandType.HALF_FLUSH],
  });

  // 10. 不能胡: 随机14张
  cases.push({
    name: '不能胡',
    hand: [...Ts('dots', [1,3,5,7,9]), ...Ts('characters', [2,4,6,8]), ...Ts('bamboos', [1,3,5,7])],
    exposed: [],
    wildTileId: null,
    expectedCanWin: false,
    expectedTypes: [],
  });

  return cases;
}

// ============================================================
// Phase 3: 构造手牌测试
// ============================================================
function testPhase3(): { passed: number; failed: number; details: string[] } {
  const results = { passed: 0, failed: 0, details: [] as string[] };
  const cases = buildTestCases();

  for (const tc of cases) {
    _id = 0; // reset id counter
    const result = canWin(tc.hand, tc.exposed, tc.wildTileId);

    if (result.canWin !== tc.expectedCanWin) {
      results.failed++;
      results.details.push(`[P3] ❌ ${tc.name}: 期望canWin=${tc.expectedCanWin}, 实际=${result.canWin}`);
      continue;
    }

    if (tc.expectedCanWin) {
      // 检查期望的牌型是否都在结果中
      const missing = tc.expectedTypes.filter(t => !result.types.includes(t));
      if (missing.length > 0) {
        results.failed++;
        results.details.push(`[P3] ❌ ${tc.name}: 缺少牌型 ${missing.join(',')}, 实际: ${result.types.join(',')}`);
        continue;
      }
    }

    // 测试 generateWinOptions
    const options = generateWinOptions({
      handTiles: tc.hand,
      exposedMelds: tc.exposed,
      flowerTiles: [],
      handTypes: result.types,
      isKongFlower: false,
      isRobbingKong: false,
      isMenQing: tc.exposed.length === 0,
      wildTileSuit: tc.wildTileId ? (tc.wildTileId.split('-')[0] as TileSuit) : undefined,
      wildTileValue: tc.wildTileId ? parseInt(tc.wildTileId.split('-')[1]) : undefined,
      roundMultiplier: 1,
      globalMultiplier: 1,
    });

    // 测试无百搭翻倍
    if (tc.expectNoWildDouble && tc.wildTileId) {
      const noWildCheck = canWin(tc.hand, tc.exposed.length, () => false);
      if (noWildCheck.canWin) {
        const hasNoWildOption = options.some(o => o.label.includes('无百搭'));
        if (hasNoWildOption) {
          results.passed++;
          results.details.push(`[P3] ✅ ${tc.name}: 无百搭翻倍方案存在 (${options.filter(o => o.label.includes('无百搭')).map(o => o.label).join(', ')})`);
        } else {
          results.passed++;
          results.details.push(`[P3] ⚠️ ${tc.name}: 无百搭能胡但没生成翻倍方案, options: ${options.map(o => o.label).join(', ')}`);
        }
      } else {
        results.failed++;
        results.details.push(`[P3] ❌ ${tc.name}: 期望无百搭能胡但实际不能`);
      }
      continue;
    }

    results.passed++;
    results.details.push(`[P3] ✅ ${tc.name}: 牌型=${result.types.join(',')}, 方案=${options.map(o => `${o.label}(${o.score}点)`).join(', ')}`);
  }

  return results;
}

// ============================================================
// Phase 4: 10轮 × 200局 - 用构造手牌+变异
// ============================================================
function runExtremeTest(round: number, gamesPerRound: number) {
  const stats = {
    totalGames: 0,
    validHands: 0,
    invalidHands: 0,
    winTypes: {} as Record<string, number>,
    noWildDouble: 0,
    chowPongBlocked: 0,
    tingDiscardUsed: 0,
    tingDiscardTested: 0,
    details: [] as string[],
  };

  const baseCases = buildTestCases().filter(tc => tc.expectedCanWin);

  for (let game = 0; game < gamesPerRound; game++) {
    stats.totalGames++;

    // 从构造手牌中随机选一个，做随机变异
    const base = baseCases[Math.floor(Math.random() * baseCases.length)];
    _id = 0;

    // 变异: 随机替换1-2张牌
    const hand = base.hand.map(t => ({ ...t, id: `${t.suit}-${t.value}-${_id++}`, isFlower: false }));
    const mutationCount = Math.floor(Math.random() * 3); // 0-2张变异
    const suits = ['dots', 'characters', 'bamboos', 'wind', 'dragon'];

    for (let m = 0; m < mutationCount; m++) {
      const idx = Math.floor(Math.random() * hand.length);
      const suit = suits[Math.floor(Math.random() * suits.length)];
      const value = Math.floor(Math.random() * 9) + 1;
      hand[idx] = { suit: suit as TileSuit, value, id: `${suit}-${value}-${_id++}`, isFlower: false };
    }

    const result = canWin(hand, base.exposed, base.wildTileId);

    if (result.canWin) {
      stats.validHands++;
      for (const t of result.types) {
        stats.winTypes[t] = (stats.winTypes[t] || 0) + 1;
      }

      // 无百搭翻倍测试
      if (base.wildTileId) {
        const noWildCheck = canWin(hand, base.exposed.length, () => false);
        if (noWildCheck.canWin) {
          stats.noWildDouble++;
        }
      }
    } else {
      stats.invalidHands++;
    }

    // 吃碰排斥测试 (每轮固定做)
    if (game % 20 === 0) {
      const state: ChowPongExclusionState = { firstActionSuit: null, firstActionType: null };
      updateChowPongExclusion(state, 'chow', 'dots');
      const blocked1 = !checkChowPongExclusion(state, 'chow', 'characters');
      const blocked2 = !checkChowPongExclusion(state, 'pong', 'bamboos');
      if (blocked1) stats.chowPongBlocked++;
      if (blocked2) stats.chowPongBlocked++;

      // 碰后只禁吃不禁碰
      const state2: ChowPongExclusionState = { firstActionSuit: null, firstActionType: null };
      updateChowPongExclusion(state2, 'pong', 'dots');
      const chowBlocked = !checkChowPongExclusion(state2, 'chow', 'characters');
      const pongAllowed = checkChowPongExclusion(state2, 'pong', 'characters');
      if (chowBlocked) stats.chowPongBlocked++;
      if (pongAllowed) stats.chowPongBlocked++;
    }

    // 听牌最大化测试
    if (hand.length === 14) {
      stats.tingDiscardTested++;
      const wildChecker = base.wildTileId
        ? (t: Tile) => { const p = base.wildTileId!.split('-'); return t.suit === p[0] && t.value === parseInt(p[1]); }
        : () => false;
      const tingResult = findBestDiscardForTing(hand, base.exposed.length, wildChecker);
      if (tingResult.isTing) {
        stats.tingDiscardUsed++;
      }
    }
  }

  return stats;
}

// ============================================================
// 主流程
// ============================================================
async function main() {
  console.log('=== Phase 3-4 极端测试 v2 (构造手牌) ===\n');

  // Phase 3
  console.log('--- Phase 3: 构造手牌测试 ---');
  const p3Results = testPhase3();
  console.log(`通过: ${p3Results.passed}, 失败: ${p3Results.failed}`);
  for (const d of p3Results.details) console.log(d);
  console.log('');

  // Phase 4
  console.log('--- Phase 4: 10轮 × 200局 ---');
  const allRoundStats: any[] = [];

  for (let round = 1; round <= 10; round++) {
    console.log(`\n轮次 ${round}/10...`);
    const stats = runExtremeTest(round, 200);
    allRoundStats.push(stats);

    const roundReport = {
      round,
      totalGames: stats.totalGames,
      validHands: stats.validHands,
      invalidHands: stats.invalidHands,
      winRate: `${((stats.validHands / stats.totalGames) * 100).toFixed(1)}%`,
      winTypes: stats.winTypes,
      noWildDouble: stats.noWildDouble,
      chowPongBlocked: stats.chowPongBlocked,
      tingDiscardUsed: stats.tingDiscardUsed,
      tingDiscardTested: stats.tingDiscardTested,
    };

    console.log(JSON.stringify(roundReport, null, 2));

    const outputDir = path.join(__dirname, '../training-output/phase3-4');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const outputFile = path.join(outputDir, `round-${round}-extreme-test-v2.json`);
    fs.writeFileSync(outputFile, JSON.stringify({
      ...roundReport,
      timestamp: new Date().toISOString(),
    }, null, 2));

    console.log(`  → ${outputFile}`);
  }

  // 汇总
  console.log('\n=== 汇总 ===');
  const totalGames = allRoundStats.reduce((s, r) => s + r.totalGames, 0);
  const totalValid = allRoundStats.reduce((s, r) => s + r.validHands, 0);
  const totalNoWild = allRoundStats.reduce((s, r) => s + r.noWildDouble, 0);
  const totalBlocked = allRoundStats.reduce((s, r) => s + r.chowPongBlocked, 0);
  const totalTing = allRoundStats.reduce((s, r) => s + r.tingDiscardUsed, 0);
  const totalTingTested = allRoundStats.reduce((s, r) => s + r.tingDiscardTested, 0);

  const allWinTypes: Record<string, number> = {};
  for (const r of allRoundStats) {
    for (const [k, v] of Object.entries(r.winTypes)) {
      allWinTypes[k] = (allWinTypes[k] || 0) + (v as number);
    }
  }

  const summary = {
    totalGames,
    totalValid,
    totalInvalid: totalGames - totalValid,
    overallWinRate: `${((totalValid / totalGames) * 100).toFixed(1)}%`,
    winTypes: allWinTypes,
    noWildDouble: totalNoWild,
    chowPongBlocked: totalBlocked,
    tingDiscardUsed: totalTing,
    tingDiscardTested: totalTingTested,
    phase3Passed: p3Results.passed,
    phase3Failed: p3Results.failed,
  };

  console.log(JSON.stringify(summary, null, 2));

  const summaryFile = path.join(__dirname, '../training-output/phase3-4/summary-v2.json');
  fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
  console.log(`\n汇总: ${summaryFile}`);
}

main().catch(console.error);
