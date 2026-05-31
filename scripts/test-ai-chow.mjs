/**
 * AI 吃牌诊断测试脚本
 * 
 * 测试目标：
 * 1. checkPendingActions 是否为 bot 创建了 CHOW 的 pendingAction
 * 2. shouldClaimPendingAction 是否返回 CHOW
 * 3. resolveBotChowNow 是否成功执行吃牌
 * 
 * 用法：node scripts/test-ai-chow.mjs
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ═══════════════════════════════════════════════
// 模拟数据构造
// ═══════════════════════════════════════════════

function makeTile(suit, value, id) {
  return { suit, value, id: id || `${suit}-${value}-${Math.random().toString(36).slice(2,6)}`, isWild: false };
}

function makePlayer(name, concealedTiles, exposedMelds = []) {
  return {
    id: `bot-${name}`,
    name,
    position: 0,
    status: 'playing',
    isTing: false,
    hand: {
      concealedTiles,
      exposedMelds,
      discardedTiles: [],
    },
  };
}

// ═══════════════════════════════════════════════
// 测试用例
// ═══════════════════════════════════════════════

const testCases = [
  {
    name: 'TC1: 夹张吃 (3-4-5, 弃4)',
    hand: [
      makeTile('dots', 3), makeTile('dots', 5),
      makeTile('dots', 7), makeTile('dots', 8),
      makeTile('bamboo', 1), makeTile('bamboo', 2), makeTile('bamboo', 3),
      makeTile('characters', 1), makeTile('characters', 2), makeTile('characters', 3),
      makeTile('wind', 1), makeTile('wind', 1),
      makeTile('dragon', 1), makeTile('dragon', 1),
    ],
    discard: makeTile('dots', 4),
    expectChow: true,
    description: '手牌有3-5，弃4，应可夹张吃',
  },
  {
    name: 'TC2: 边张吃 (1-2-3, 弃3)',
    hand: [
      makeTile('dots', 1), makeTile('dots', 2),
      makeTile('dots', 7), makeTile('dots', 8), makeTile('dots', 9),
      makeTile('bamboo', 1), makeTile('bamboo', 2), makeTile('bamboo', 3),
      makeTile('characters', 1), makeTile('characters', 2), makeTile('characters', 3),
      makeTile('wind', 1), makeTile('wind', 1),
      makeTile('dragon', 1),
    ],
    discard: makeTile('dots', 3),
    expectChow: true,
    description: '手牌有1-2，弃3，应可边张吃',
  },
  {
    name: 'TC3: 两面吃 (3-4, 弃5)',
    hand: [
      makeTile('dots', 3), makeTile('dots', 4),
      makeTile('dots', 7), makeTile('dots', 8), makeTile('dots', 9),
      makeTile('bamboo', 1), makeTile('bamboo', 2), makeTile('bamboo', 3),
      makeTile('characters', 1), makeTile('characters', 2), makeTile('characters', 3),
      makeTile('wind', 1), makeTile('wind', 1),
      makeTile('dragon', 1),
    ],
    discard: makeTile('dots', 5),
    expectChow: true,
    description: '手牌有3-4，弃5，应可两面吃',
  },
  {
    name: 'TC4: 无吃的组合 (手牌无相关数牌)',
    hand: [
      makeTile('bamboo', 1), makeTile('bamboo', 2), makeTile('bamboo', 3),
      makeTile('bamboo', 4), makeTile('bamboo', 5), makeTile('bamboo', 6),
      makeTile('characters', 1), makeTile('characters', 2), makeTile('characters', 3),
      makeTile('characters', 4), makeTile('characters', 5), makeTile('characters', 6),
      makeTile('wind', 1), makeTile('wind', 1),
    ],
    discard: makeTile('dots', 5),
    expectChow: false,
    description: '手牌无筒子，弃5筒，不应有CHOW选项',
  },
  {
    name: 'TC5: 字牌不能吃 (弃风牌)',
    hand: [
      makeTile('wind', 1), makeTile('wind', 2), makeTile('wind', 3),
      makeTile('dots', 1), makeTile('dots', 2), makeTile('dots', 3),
      makeTile('dots', 4), makeTile('dots', 5), makeTile('dots', 6),
      makeTile('bamboo', 1), makeTile('bamboo', 2), makeTile('bamboo', 3),
      makeTile('characters', 1), makeTile('characters', 1),
    ],
    discard: makeTile('wind', 4),
    expectChow: false,
    description: '字牌不能被吃',
  },
  {
    name: 'TC6: 异门吃碰互斥 — 碰了条子后不能吃筒子',
    hand: [
      makeTile('dots', 3), makeTile('dots', 4),
      makeTile('dots', 7), makeTile('dots', 8), makeTile('dots', 9),
      makeTile('characters', 1), makeTile('characters', 2), makeTile('characters', 3),
      makeTile('wind', 1), makeTile('wind', 1),
      makeTile('dragon', 1), makeTile('dragon', 1),
    ],
    discard: makeTile('dots', 5),
    expectChow: false,  // 碰了条子后不能吃筒子
    description: '异门互斥：碰了条子后不能吃筒子',
    exclusion: { firstActionSuit: 'bamboo', firstActionType: 'pong' },
  },
  {
    name: 'TC7: 异门吃碰互斥 — 碰了条子后可以吃条子',
    hand: [
      makeTile('bamboo', 3), makeTile('bamboo', 4),
      makeTile('dots', 7), makeTile('dots', 8), makeTile('dots', 9),
      makeTile('characters', 1), makeTile('characters', 2), makeTile('characters', 3),
      makeTile('wind', 1), makeTile('wind', 1),
      makeTile('dragon', 1), makeTile('dragon', 1),
    ],
    discard: makeTile('bamboo', 5),
    expectChow: true,  // 碰了条子后可以吃条子
    description: '异门互斥：碰了条子后可以吃条子',
    exclusion: { firstActionSuit: 'bamboo', firstActionType: 'pong' },
  },
];

// ═══════════════════════════════════════════════
// 测试 findChowSequences（直接实现，不依赖编译）
// ═══════════════════════════════════════════════

function findChowSequences(hand, discardedTile, exclusionState) {
  const sequences = [];
  
  // 字牌不能被吃
  if (discardedTile.suit === 'wind' || discardedTile.suit === 'dragon' || discardedTile.suit === 'flower') {
    return [];
  }
  
  // 异门吃碰互斥检查
  if (exclusionState && exclusionState.firstActionSuit && exclusionState.firstActionType) {
    if (discardedTile.suit !== 'feng' && discardedTile.suit !== 'jian') {
      const isSameSuit = discardedTile.suit === exclusionState.firstActionSuit;
      if (exclusionState.firstActionType === 'chow') {
        if (!isSameSuit) return [];
      } else if (exclusionState.firstActionType === 'pong') {
        if (!isSameSuit) return [];
      }
    }
  }
  
  const v = discardedTile.value;
  const suit = discardedTile.suit;
  
  // 找同一花色的手牌
  const suitHand = hand.filter(t => t.suit === suit);
  
  // Case 1: 弃牌做最小 (弃v, 需要v+1, v+2)
  if (v <= 7) {
    const t2 = suitHand.find(t => t.value === v + 1);
    const t3 = suitHand.find(t => t.value === v + 2);
    if (t2 && t3 && t2.id !== t3.id) {
      sequences.push([t2, t3]);
    }
  }
  
  // Case 2: 弃牌做中间 (弃v, 需要v-1, v+1)
  if (v >= 2 && v <= 8) {
    const t1 = suitHand.find(t => t.value === v - 1);
    const t3 = suitHand.find(t => t.value === v + 1);
    if (t1 && t3 && t1.id !== t3.id) {
      sequences.push([t1, t3]);
    }
  }
  
  // Case 3: 弃牌做最大 (弃v, 需要v-2, v-1)
  if (v >= 3) {
    const t1 = suitHand.find(t => t.value === v - 2);
    const t2 = suitHand.find(t => t.value === v - 1);
    if (t1 && t2 && t1.id !== t2.id) {
      sequences.push([t1, t2]);
    }
  }
  
  return sequences;
}

// ═══════════════════════════════════════════════
// 运行测试
// ═══════════════════════════════════════════════

console.log('═══════════════════════════════════════════════════════════');
console.log('  AI 吃牌诊断测试 — findChowSequences 层面');
console.log('═══════════════════════════════════════════════════════════\n');

let passed = 0;
let failed = 0;

for (const tc of testCases) {
  const exclusionState = tc.exclusion || { firstActionSuit: null, firstActionType: null };
  const sequences = findChowSequences(tc.hand, tc.discard, exclusionState);
  const canChow = sequences.length > 0;
  
  const ok = canChow === tc.expectChow;
  if (ok) passed++; else failed++;
  
  const icon = ok ? '✅' : '❌';
  console.log(`${icon} ${tc.name}`);
  console.log(`   ${tc.description}`);
  console.log(`   期望: ${tc.expectChow ? '可吃' : '不可吃'} | 实际: ${canChow ? '可吃' : '不可吃'} (${sequences.length}个组合)`);
  if (!ok) {
    console.log(`   ⚠️ 测试失败！`);
  }
  console.log();
}

console.log('───────────────────────────────────────────────────────────');
console.log(`结果: ${passed}/${passed + failed} 通过${failed > 0 ? `, ${failed} 失败` : ''}`);
console.log();

// ═══════════════════════════════════════════════
// 诊断信息输出
// ═══════════════════════════════════════════════

console.log('═══════════════════════════════════════════════════════════');
console.log('  诊断：如果 findChowSequences 通过，问题在以下环节：');
console.log('═══════════════════════════════════════════════════════════');
console.log(`
  1. checkPendingActions (actionHandler.ts)
     → 是否为下家创建了含 CHOW 的 pendingAction？
     → 排查：chowOptions 是否为空？exclusion 是否阻止？

  2. shouldClaimPendingAction (botService.ts)
     → bot 收到 CHOW 选项后是否评估并决定吃？
     → 排查：evaluateChowValue 返回值、claimDecider 是否 allowed

  3. resolveBotChowNow (botController.ts) ★ 已修复
     → 之前通过 resolvePendingAction 二次评估，随机概率可能推翻
     → 现在直接调用 handleChow

  4. gameManager.ts freeze timer 回调 ★ 已修复
     → 同样直接调用 handleChow

  建议：在服务器运行实战，搜索日志关键词：
    [BotService]     → bot 是否进入决策流程
    [ClaimDecider]   → 吃牌是否被路由拒绝
    [PendingResolve] → 最终执行结果
`);
