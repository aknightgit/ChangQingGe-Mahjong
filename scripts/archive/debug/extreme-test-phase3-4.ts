/**
 * Phase 3-4: 极端测试
 * 10轮 × 200局，每轮输出独立训练文件
 */

import { canWin, detectHandTypes, findBestDiscardForTing, checkChowPongExclusion, updateChowPongExclusion, HandType, HAND_TYPE_PRIORITY, ChowPongExclusionState } from '../server/utils/handValidator';
import { generateWinOptions, calculateScore } from '../server/utils/scoring';
import { Tile, Meld, MeldType, TileSuit } from '../server/types/game';
import { isFlower, isWind, isDragon, groupTiles } from '../server/utils/tiles';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================
// 工具函数
// ============================================================
let _tileIdCounter = 0;
function makeTile(suit: string, value: number): Tile {
  return { suit: suit as TileSuit, value, id: `${suit}-${value}-${_tileIdCounter++}`, isFlower: false };
}

function makeTiles(suit: string, values: number[]): Tile[] {
  return values.map(v => makeTile(suit, v));
}

// ============================================================
// Phase 3: 枚举所有分解方案选最优番数
// ============================================================
function testPhase3Decomposition(): { passed: number; failed: number; details: string[] } {
  const results = { passed: 0, failed: 0, details: [] as string[] };

  // 测试1: 碰碰胡 - 14张全刻子+对子
  // 111 222 333 444 55万 → 碰碰胡 + 清一色 = 清碰
  const test1Hand = [
    ...makeTiles('dots', [1,1,1,2,2,2,3,3,3,4,4,4,5,5])
  ];

  const test1Result = canWin(test1Hand, 0, null);
  if (test1Result.canWin && test1Result.types.includes(HandType.QING_PENG)) {
    results.passed++;
    results.details.push(`[P3-T1] ✅ 清碰检测通过, 牌型: ${test1Result.types.join(', ')}`);
  } else if (test1Result.canWin) {
    results.passed++;
    results.details.push(`[P3-T1] ⚠️ 能胡但没检测到清碰, 牌型: ${test1Result.types.join(', ')}`);
  } else {
    results.failed++;
    results.details.push(`[P3-T1] ❌ 碰碰胡检测失败, 手牌14张: ${test1Hand.map(t => `${t.suit}${t.value}`).join(' ')}`);
  }

  // 测试2: 有百搭时，不同分配 → 不同牌型
  const test2Hand = [
    makeTile('dots', 1), makeTile('dots', 1),
    makeTile('dots', 5), makeTile('dots', 5), // 百搭
    ...makeTiles('dots', [2,3,4,5,6,7,8,9,9]),
    makeTile('dots', 9)
  ];

  const test2Result = canWin(test2Hand, 0, 'dots-5');
  if (test2Result.canWin) {
    results.passed++;
    results.details.push(`[P3-T2] ✅ 百搭分配检测通过, 牌型: ${test2Result.types.join(', ')}`);
  } else {
    results.failed++;
    results.details.push(`[P3-T2] ❌ 百搭分配检测失败`);
  }

  // 测试3: generateWinOptions 返回多个方案
  const test3Options = generateWinOptions({
    handTiles: test1Hand,
    exposedMelds: [],
    flowerTiles: [],
    handTypes: test1Result.types,
    isKongFlower: false,
    isRobbingKong: false,
    isMenQing: true,
    roundMultiplier: 1,
    globalMultiplier: 1,
  });

  if (test3Options.length >= 1) {
    results.passed++;
    results.details.push(`[P3-T3] ✅ generateWinOptions 返回 ${test3Options.length} 个方案: ${test3Options.map(o => o.label).join(', ')}`);
  } else {
    results.failed++;
    results.details.push(`[P3-T3] ❌ generateWinOptions 返回 0 个方案`);
  }

  // 测试4: 无百搭翻倍
  const test4Hand = [
    ...makeTiles('dots', [1,1,1,2,2,2,3,3,3,4,4,4]),
    makeTile('dots', 5), makeTile('dots', 5) // 百搭
  ];

  const test4Result = canWin(test4Hand, 0, 'dots-5');
  if (test4Result.canWin) {
    const noWildCheck = canWin(test4Hand, 0, () => false);
    if (noWildCheck.canWin) {
      results.passed++;
      results.details.push(`[P3-T4] ✅ 无百搭翻倍: 有百搭牌型=${test4Result.types.join(',')}, 无百搭也能胡=${noWildCheck.types.join(',')}`);
    } else {
      results.passed++;
      results.details.push(`[P3-T4] ✅ 有百搭能胡(${test4Result.types.join(',')}), 无百搭不能胡(正常)`);
    }
  } else {
    results.failed++;
    results.details.push(`[P3-T4] ❌ 有百搭都没胡`);
  }

  return results;
}

// ============================================================
// Phase 4: 10轮 × 200局 极端测试
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
  };

  const suits = ['dots', 'characters', 'bamboos'];
  const honors = ['wind', 'dragon'];

  for (let game = 0; game < gamesPerRound; game++) {
    stats.totalGames++;

    const handSize = [2, 5, 8, 11, 14][Math.floor(Math.random() * 5)];
    const hand: Tile[] = [];

    const hasWild = Math.random() < 0.3;
    const wildSuit = suits[Math.floor(Math.random() * suits.length)];
    const wildValue = Math.floor(Math.random() * 9) + 1;

    for (let i = 0; i < handSize; i++) {
      if (hasWild && Math.random() < 0.15) {
        hand.push(makeTile(wildSuit, wildValue));
      } else {
        const suitPool = Math.random() < 0.7 ? suits : honors;
        const suit = suitPool[Math.floor(Math.random() * suitPool.length)];
        const value = Math.floor(Math.random() * 9) + 1;
        hand.push(makeTile(suit, value));
      }
    }

    const wildTileId = hasWild ? `${wildSuit}-${wildValue}` : null;
    const result = canWin(hand, 0, wildTileId);

    if (result.canWin) {
      stats.validHands++;
      for (const t of result.types) {
        stats.winTypes[t] = (stats.winTypes[t] || 0) + 1;
      }

      if (hasWild) {
        const noWildCheck = canWin(hand, 0, () => false);
        if (noWildCheck.canWin) {
          stats.noWildDouble++;
        }
      }
    } else {
      stats.invalidHands++;
    }

    // 吃碰排斥测试
    if (Math.random() < 0.1) {
      const state: ChowPongExclusionState = { firstActionSuit: null, firstActionType: null };
      const firstSuit = suits[Math.floor(Math.random() * suits.length)];
      updateChowPongExclusion(state, 'chow', firstSuit);
      const otherSuit = suits.filter(s => s !== firstSuit)[Math.floor(Math.random() * 2)];
      const blocked = !checkChowPongExclusion(state, 'chow', otherSuit);
      if (blocked) stats.chowPongBlocked++;
    }

    // 听牌最大化弃牌测试
    if (handSize === 14) {
      stats.tingDiscardTested++;
      const wildChecker = hasWild ? (t: Tile) => t.suit === wildSuit && t.value === wildValue : () => false;
      const tingResult = findBestDiscardForTing(hand, 0, wildChecker);
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
  console.log('=== Phase 3-4 极端测试开始 ===\n');

  // Phase 3
  console.log('--- Phase 3: 枚举分解方案 ---');
  const p3Results = testPhase3Decomposition();
  console.log(`通过: ${p3Results.passed}, 失败: ${p3Results.failed}`);
  for (const d of p3Results.details) console.log(d);
  console.log('');

  // Phase 4
  console.log('--- Phase 4: 10轮 × 200局极端测试 ---');
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

    // 保存本轮训练文件
    const outputDir = path.join(__dirname, '../training-output/phase3-4');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const outputFile = path.join(outputDir, `round-${round}-extreme-test.json`);
    fs.writeFileSync(outputFile, JSON.stringify({
      ...roundReport,
      timestamp: new Date().toISOString(),
    }, null, 2));

    console.log(`  → 已保存: ${outputFile}`);
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

  const summaryFile = path.join(__dirname, '../training-output/phase3-4/summary.json');
  fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
  console.log(`\n汇总已保存: ${summaryFile}`);
}

main().catch(console.error);
