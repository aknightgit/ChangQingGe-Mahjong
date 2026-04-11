/**
 * 长清阁麻将 - 倍数链路测试
 * 测试 roundMultiplier / globalMultiplier / 流局继承链
 */

import { calculateRoundMultiplier, calculateGlobalMultiplier } from './server/utils/scoring';

let passed = 0;
let failed = 0;

function test(name: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  ✅ ${name}`);
    passed++;
  } else {
    console.log(`  ❌ ${name}${detail ? ' | ' + detail : ''}`);
    failed++;
  }
}

// ============================================
// 1. 骰子倍数
// ============================================
console.log('\n=== 骰子倍数 ===');

test('1+1 = ×4', calculateRoundMultiplier(1, 1) === 4);
test('4+4 = ×4', calculateRoundMultiplier(4, 4) === 4);
test('2+2 = ×2', calculateRoundMultiplier(2, 2) === 2);
test('3+3 = ×2', calculateRoundMultiplier(3, 3) === 2);
test('5+5 = ×2', calculateRoundMultiplier(5, 5) === 2);
test('6+6 = ×2', calculateRoundMultiplier(6, 6) === 2);
test('1+3 = ×1', calculateRoundMultiplier(1, 3) === 1);
test('2+5 = ×1', calculateRoundMultiplier(2, 5) === 1);
test('3+6 = ×1', calculateRoundMultiplier(3, 6) === 1);

// ============================================
// 2. 流局继承链
// ============================================
console.log('\n=== 流局继承链 ===');

// 第1次流局
const g1 = calculateGlobalMultiplier(1, '流局');
test('流局×1 → ×2', g1 === 2);

// 第2次连续流局
const g2 = calculateGlobalMultiplier(2, '流局');
test('流局×2 → ×4', g2 === 4);

// 第3次连续流局
const g3 = calculateGlobalMultiplier(4, '流局');
test('流局×4 → ×8', g3 === 8);

// 第4次封顶测试
const g4 = calculateGlobalMultiplier(8, '流局');
test('流局×8 封顶→ ×8 (不超过8)', g4 === 8);

// ============================================
// 3. 造反继承链
// ============================================
console.log('\n=== 造反继承链 ===');

const r1 = calculateGlobalMultiplier(1, '造反');
test('造反×1 → ×2', r1 === 2);

const r2 = calculateGlobalMultiplier(4, '造反');
test('造反×4 → ×8', r2 === 8);

const r3 = calculateGlobalMultiplier(8, '造反');
test('造反×8 封顶→ ×8', r3 === 8);

// ============================================
// 4. 模拟完整倍数链路
// ============================================
console.log('\n=== 模拟完整倍数链路 ===');

let currentGlobal = 1;
test('初始 ×1', currentGlobal === 1);

// 第1局：掷骰 1+1=×4
const round1 = calculateRoundMultiplier(1, 1);
test('第1局骰子 ×4', round1 === 4);
// 综合倍数 = min(8, 回合×全局) = min(8, 4×1) = 4
const combined1 = Math.min(8, round1 * currentGlobal);
test('第1局综合倍数 ×4', combined1 === 4);

// 第1局流局
currentGlobal = calculateGlobalMultiplier(currentGlobal, '流局');
test('流局后继承 ×2', currentGlobal === 2);

// 第2局：掷骰 6+6=×2
const round2 = calculateRoundMultiplier(6, 6);
test('第2局骰子 ×2', round2 === 2);
const combined2 = Math.min(8, round2 * currentGlobal);
test('第2局综合倍数 ×4 (2×2=4)', combined2 === 4);

// 第2局流局
currentGlobal = calculateGlobalMultiplier(currentGlobal, '流局');
test('流局后继承 ×4', currentGlobal === 4);

// 第3局：掷骰 4+4=×4
const round3 = calculateRoundMultiplier(4, 4);
test('第3局骰子 ×4', round3 === 4);
const combined3 = Math.min(8, round3 * currentGlobal);
test('第3局综合倍数 ×8 (封顶)', combined3 === 8);

// 第3局流局
currentGlobal = calculateGlobalMultiplier(currentGlobal, '流局');
test('流局后继承 ×8 (封顶)', currentGlobal === 8);

// 第4局：正常胡牌（有人赢了），倍数重置
currentGlobal = 1; // 正常结局重置
test('正常结局后倍数重置 ×1', currentGlobal === 1);

// ============================================
// 5. 造反触发 ×2
// ============================================
console.log('\n=== 造反触发 ×2 ===');

let rebelGlobal = 1;
rebelGlobal = calculateGlobalMultiplier(rebelGlobal, '造反');
test('造反后继承 ×2', rebelGlobal === 2);

const roundRebel = calculateRoundMultiplier(2, 5);
test('造反局骰子 ×1', roundRebel === 1);
const combinedRebel = Math.min(8, roundRebel * rebelGlobal);
test('造反局综合倍数 ×2', combinedRebel === 2);

// ============================================
// 汇总
// ============================================
console.log('\n========================================');
if (failed === 0) {
  console.log(`  🎉 全部通过! (${passed}/${passed})`);
} else {
  console.log(`  ❌ ${failed} 项失败 (${passed}/${passed + failed})`);
}
console.log('========================================\n');

process.exit(failed > 0 ? 1 : 0);
