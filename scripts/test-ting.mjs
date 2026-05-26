// 手牌: 一筒一筒一筒 / 二筒三筒三筒四筒 / 七八九筒 / 北北北 (13张)
import { canWin } from './server/utils/handValidator.ts';

// TileSuit values
const DOT = 'dot';
const WIND = 'wind';

function makeTile(suit: string, value: number) {
  return { suit, value };
}

const hand = [
  makeTile(DOT, 1),  // 一筒
  makeTile(DOT, 1),  
  makeTile(DOT, 1),  // 一筒111刻
  makeTile(DOT, 2),  // 二筒
  makeTile(DOT, 3),  // 三筒
  makeTile(DOT, 3),  // 三筒
  makeTile(DOT, 4),  // 四筒 (2,3,3,4)
  makeTile(DOT, 7),  // 七筒
  makeTile(DOT, 8),  // 八筒
  makeTile(DOT, 9),  // 九筒 (7,8,9)
  makeTile(WIND, 3), // 北风 (WindValue.NORTH = 3)
  makeTile(WIND, 3),
  makeTile(WIND, 3), // 北北北刻
];

console.log('=== AI-AK 手牌分析 ===');
console.log('手牌:', hand.map(t => `${t.suit}_${t.value}`).join(' '));
console.log('共', hand.length, '张，无百搭');
console.log();

// 分析：13张手牌需要摸1张变14，再打1张才是正确待机状态
// 当前13张，分析"打哪张后摸什么能胡"
console.log('=== 分析每种打出方案的待牌 ===');
// 手牌组合：
// 111筒(刻) + 234筒(顺缺3) + 789筒(顺) + 刻子北北北 + 缺将
// 需要将牌，手牌分析：
// - 111刻子 (3n)
// - 789顺子 (3n)
// - 北北北刻子 (3n)
// - 234筒缺1 (待拆)
// - 缺将牌

// 标准分析：13张，移除每张后补到14张（摸任意牌），检查能否胡
const allSuits = [
  {suit: DOT, value: 1}, {suit: DOT, value: 2}, {suit: DOT, value: 3},
  {suit: DOT, value: 4}, {suit: DOT, value: 5}, {suit: DOT, value: 6},
  {suit: DOT, value: 7}, {suit: DOT, value: 8}, {suit: DOT, value: 9},
];

for (let removeIdx = 0; removeIdx < hand.length; removeIdx++) {
  const remaining = hand.filter((_, i) => i !== removeIdx);
  // 12张，需要摸2张变14（实际上是13摸1变14再打1，但这里13已经缺1了）
  // 实际上正确的13张待机是：14起手→打1=13→摸1=14→打1=13
  // 当前13张，分析"打这张后，摸任意一张能否胡"
  
  // 更准确：剩余12张，从"牌河"摸1张变13，检查能否听牌
  // 但12张无法直接判断，需要枚举所有可能摸牌
  
  // 简单分析：当前13张，如果打掉1张，剩余12张+摸1张=13张
  // 这是错误的分析。正确是：
  // 14起手 → 打1张 = 13张待机（听牌状态）
  // 所以13张待机时，已经打了1张，手里是"待胡的13张"
  // 当前13张就是"已经完成听牌"的状态，只需要验证即可
  
  // 所以用13张直接检查：能否成3n+2
  // 但这里有个问题：13张要分成3n+2=11张面子+1对将
  // 手牌：111刻 + 789顺 + 北北北刻 + 234筒 + ? 缺1对将
  // 234筒如果拆开：2+3+4可成顺，那么234筒作为面子，缺将
  // 111 + 789 + 北北北 + 234 = 3+3+3+3 = 12张面子，还差1对将
  
  // 所以当前13张=12张面子+1张单张，需要再摸1张成对才能听牌
  // 但如果分析"打哪张后听什么"，需要更复杂的推理
  
  // 让我直接用canWin验证13张整体（不是听牌，只是检查能否胡）
  const result = canWin(remaining as any, [], null);
  if (result.canWin) {
    console.log(`打第${removeIdx+1}张(${hand[removeIdx].suit}_${hand[removeIdx].value}): 可胡 ${result.types.join(',')}`);
  }
}