/**
 * 麻将结算系统回归测试
 * 运行方式: npx tsx scripts/scoring-test.ts
 */
import {
  shuffleTiles, isFlower, groupTiles, sortTiles, tilesEqual
} from '../server/utils/tiles'
import {
  canWin, buildWildTileChecker,
  detectHandTypes, HandType,
  HAND_TYPE_PRIORITY, HAND_TYPE_TIER
} from '../server/utils/handValidator'
import {
  calculateScore, calculateSettlement
} from '../server/utils/scoring'
import { TileSuit, MeldType, type Tile, type Meld } from '../server/types/game'

// ===== 辅助函数 =====

function createTile(suit: TileSuit, value: number, id?: string): any {
  return { suit, value, id: id || `${suit}-${value}`, isWild: false };
}

function createEmptyMelds() {
  return [];
}

// ===== 测试用例 =====

interface TestCase {
  name: string;
  input: {
    handTiles: any[];
    exposedMelds?: any[];
    flowerTiles?: any[];
    handTypes: HandType[];
    isSelfDrawn: boolean;
    isKongFlower?: boolean;
    isRobbingKong?: boolean;
    isMenQing: boolean;
    isDaDiao?: boolean;
    rawRoundMultiplier?: number;
    rawInheritMultiplier?: number;
  };
  expected: {
    baseFan: number;
    extraMultipliers?: number;
    globalMultiplier?: number;
    finalPoints?: number;
  };
}

const testCases: TestCase[] = [
  // ===== TIER_1: 顶级固定番数牌型 =====
  {
    name: '[TIER_1] 风碰 = 40点',
    input: {
      handTiles: [createTile(TileSuit.WIND, 1), createTile(TileSuit.WIND, 1), createTile(TileSuit.WIND, 1)],
      exposedMelds: [],
      handTypes: [HandType.FENG_PENG],
      isSelfDrawn: false,
      isMenQing: true,
      rawRoundMultiplier: 1,
      rawInheritMultiplier: 1,
    },
    expected: { baseFan: 40 },
  },
  {
    name: '[TIER_1] 风一色 = 20点',
    input: {
      handTiles: [createTile(TileSuit.WIND, 1), createTile(TileSuit.WIND, 2), createTile(TileSuit.WIND, 3)],
      exposedMelds: [],
      handTypes: [HandType.ALL_WIND],
      isSelfDrawn: false,
      isMenQing: true,
      rawRoundMultiplier: 1,
      rawInheritMultiplier: 1,
    },
    expected: { baseFan: 20 },
  },
  {
    name: '[TIER_1] 清碰 = 20点',
    input: {
      handTiles: [createTile(TileSuit.DOTS, 1), createTile(TileSuit.DOTS, 1), createTile(TileSuit.DOTS, 1)],
      exposedMelds: [],
      handTypes: [HandType.QING_PENG],
      isSelfDrawn: false,
      isMenQing: true,
      rawRoundMultiplier: 1,
      rawInheritMultiplier: 1,
    },
    expected: { baseFan: 20 },
  },

  // ===== TIER_2: 次级固定番数牌型 =====
  {
    name: '[TIER_2] 混碰 = 10点',
    input: {
      handTiles: [createTile(TileSuit.DOTS, 1), createTile(TileSuit.DOTS, 1), createTile(TileSuit.DOTS, 1)],
      exposedMelds: [],
      handTypes: [HandType.HUN_PENG],
      isSelfDrawn: false,
      isMenQing: true,
      rawRoundMultiplier: 1,
      rawInheritMultiplier: 1,
    },
    expected: { baseFan: 10 },
  },

  // ===== 大吊 + 高优先级牌型 =====
  {
    name: '[大吊+风碰] 大吊风碰 = 40点',
    input: {
      handTiles: [createTile(TileSuit.WIND, 1)],
      exposedMelds: [],
      handTypes: [HandType.DA_DIAO, HandType.FENG_PENG],
      isSelfDrawn: false,
      isMenQing: true,
      isDaDiao: true,
      rawRoundMultiplier: 1,
      rawInheritMultiplier: 1,
    },
    expected: { baseFan: 40 },
  },
  {
    name: '[大吊+清碰] 大吊清碰 = 20点',
    input: {
      handTiles: [createTile(TileSuit.DOTS, 1)],
      exposedMelds: [],
      handTypes: [HandType.DA_DIAO, HandType.QING_PENG],
      isSelfDrawn: false,
      isMenQing: true,
      isDaDiao: true,
      rawRoundMultiplier: 1,
      rawInheritMultiplier: 1,
    },
    expected: { baseFan: 20 },
  },

  // ===== 全局倍数封顶8 =====
  {
    name: '[全局倍数] 继承×回合 > 8 时封顶',
    input: {
      handTiles: [createTile(TileSuit.WIND, 1), createTile(TileSuit.WIND, 1), createTile(TileSuit.WIND, 1)],
      exposedMelds: [],
      handTypes: [HandType.FENG_PENG],
      isSelfDrawn: false,
      isMenQing: false,
      rawRoundMultiplier: 4,  // 骰子4+4=×4
      rawInheritMultiplier: 4, // 上局继承×4
    },
    expected: { 
      baseFan: 40,
      globalMultiplier: 8, // min(4×4, 8) = 8
      finalPoints: 40 * 8,  // = 320
    },
  },

  // ===== 门清/无百搭 翻倍 =====
  {
    name: '[门清×2] 门清时额外翻倍',
    input: {
      handTiles: [createTile(TileSuit.DOTS, 1), createTile(TileSuit.DOTS, 1), createTile(TileSuit.DOTS, 1)],
      exposedMelds: [],
      handTypes: [HandType.HALF_FLUSH],
      isSelfDrawn: false,
      isMenQing: true,  // 门清
      rawRoundMultiplier: 1,
      rawInheritMultiplier: 1,
    },
    expected: { 
      extraMultipliers: 2, // 门清×2
    },
  },
];

// ===== 运行测试 =====

function runTests() {
  console.log('🀄 麻将结算系统回归测试\n');
  console.log('='.repeat(60));
  
  let passed = 0;
  let failed = 0;

  for (const tc of testCases) {
    try {
      const result = calculateScore({
        handTiles: tc.input.handTiles,
        exposedMelds: tc.input.exposedMelds || createEmptyMelds(),
        flowerTiles: tc.input.flowerTiles || [],
        handTypes: tc.input.handTypes,
        isSelfDrawn: tc.input.isSelfDrawn,
        isKongFlower: tc.input.isKongFlower || false,
        isRobbingKong: tc.input.isRobbingKong || false,
        isMenQing: tc.input.isMenQing,
        isDaDiao: tc.input.isDaDiao,
        rawRoundMultiplier: tc.input.rawRoundMultiplier,
        rawInheritMultiplier: tc.input.rawInheritMultiplier,
        globalIncludesRound: true,
      });

      // 验证
      let ok = true;
      const errors: string[] = [];

      if (tc.expected.baseFan !== undefined && result.baseFan !== tc.expected.baseFan) {
        ok = false;
        errors.push(`baseFan: expected ${tc.expected.baseFan}, got ${result.baseFan}`);
      }
      if (tc.expected.extraMultipliers !== undefined && result.extraMultipliers !== tc.expected.extraMultipliers) {
        ok = false;
        errors.push(`extraMultipliers: expected ${tc.expected.extraMultipliers}, got ${result.extraMultipliers}`);
      }
      if (tc.expected.globalMultiplier !== undefined && result.globalMultiplier !== tc.expected.globalMultiplier) {
        ok = false;
        errors.push(`globalMultiplier: expected ${tc.expected.globalMultiplier}, got ${result.globalMultiplier}`);
      }
      if (tc.expected.finalPoints !== undefined && result.finalPoints !== tc.expected.finalPoints) {
        ok = false;
        errors.push(`finalPoints: expected ${tc.expected.finalPoints}, got ${result.finalPoints}`);
      }

      if (ok) {
        console.log(`✅ ${tc.name}`);
        passed++;
      } else {
        console.log(`❌ ${tc.name}`);
        errors.forEach(e => console.log(`   ${e}`));
        failed++;
      }

      // 打印详情
      console.log(`   baseFan=${result.baseFan}, extra=${result.extraMultipliers}, global=${result.globalMultiplier}, final=${result.finalPoints}`);
      console.log(`   details: ${result.details.join(' | ')}`);

    } catch (e: any) {
      console.log(`❌ ${tc.name}`);
      console.log(`   ERROR: ${e.message}`);
      failed++;
    }
    console.log('');
  }

  // ===== 互包赔付测试 =====
  console.log('='.repeat(60));
  console.log('📋 互包赔付测试\n');

  const mutualBailout = new Map<number, { partnerIndex: number; type: '三口' | '四口' }>();
  mutualBailout.set(1, { partnerIndex: 0, type: '三口' });
  mutualBailout.set(2, { partnerIndex: 0, type: '四口' });

  // 测试互包自摸
  const selfDrawResult = calculateSettlement(
    100,   // winnerFinalPoints = 100
    true,  // isSelfDrawn
    0,     // winnerIndex
    [0, 1, 2, 3],
    mutualBailout,
  );

  console.log(`互包自摸测试 (finalPoints=100):`);
  console.log(`  三口玩家(索引1)应支付: ${selfDrawResult.get(1)} (应为 -300，即 100×3)`);
  console.log(`  四口玩家(索引2)应支付: ${selfDrawResult.get(2)} (应为 -500，即 100×5)`);
  console.log(`  正常玩家(索引3)应支付: ${selfDrawResult.get(3)} (应为 -100，即 100×1)`);
  console.log(`  赢家(索引0)应收: ${selfDrawResult.get(0)}`);

  // 测试互包捉冲
  const discardResult = calculateSettlement(
    200,   // winnerFinalPoints = 200
    false, // isSelfDrawn
    0,     // winnerIndex
    [0, 1, 2, 3],
    mutualBailout,
    1,     // discarderId = 1 (三口玩家放冲)
  );

  console.log(`\n互包捉冲测试 (finalPoints=200, 三口玩家放冲):`);
  console.log(`  放冲者(三口玩家索引1)应支付: ${discardResult.get(1)} (应为 -400，即 200×2)`);
  console.log(`  其他玩家(索引2)应支付: ${discardResult.get(2)} (应为 0，未放冲)`);
  console.log(`  赢家(索引0)应收: ${discardResult.get(0)}`);

  // ===== 牌型优先级验证 =====
  console.log('\n' + '='.repeat(60));
  console.log('📋 牌型优先级验证\n');

  console.log('HAND_TYPE_TIER 配置:');
  for (const [tierName, tier] of Object.entries(HAND_TYPE_TIER)) {
    console.log(`  ${tierName}:`);
    for (const [type, priority] of Object.entries(tier)) {
      console.log(`    ${type}: ${priority}`);
    }
  }

  console.log('\nHAND_TYPE_PRIORITY 扁平化:');
  const sorted = Object.entries(HAND_TYPE_PRIORITY)
    .sort(([,a], [,b]) => (b as number) - (a as number));
  for (const [type, priority] of sorted) {
    console.log(`  ${type}: ${priority}`);
  }

  // ===== 结果汇总 =====
  console.log('\n' + '='.repeat(60));
  console.log(`📊 测试结果: ${passed} 通过, ${failed} 失败`);
  
  if (failed === 0) {
    console.log('✅ 所有测试通过!');
  } else {
    console.log('❌ 有测试失败，请检查!');
    process.exit(1);
  }
}

runTests();
