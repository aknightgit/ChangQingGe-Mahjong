// AI-AK 手牌: 一筒一筒一筒 / 二筒三筒三筒四筒 / 七八九筒 / 北北北
// 共13张（无花牌，无百搭）
// 分析：13张手牌，标准麻将14张起手后打1张=13张待机（听牌状态）
// 当前13张，分析"摸任意一张后能否成牌型"来判断听牌

import { canWin } from './server/utils/handValidator.ts';

const DOT = 'dot';
const WIND = 'wind';

function makeTile(suit, value) {
  return { suit, value };
}

const hand = [
  makeTile(DOT, 1), makeTile(DOT, 1), makeTile(DOT, 1), // 一筒111刻
  makeTile(DOT, 2), makeTile(DOT, 3), makeTile(DOT, 3), makeTile(DOT, 4), // 二筒三筒三筒四筒
  makeTile(DOT, 7), makeTile(DOT, 8), makeTile(DOT, 9), // 7筒8筒9筒
  makeTile(WIND, 3), makeTile(WIND, 3), makeTile(WIND, 3), // 北北北刻
];

console.log('=== AI-AK 手牌听牌分析 ===');
console.log('手牌:', hand.map(t => `${t.suit}_${t.value}`).join(' '));
console.log('共', hand.length, '张，无百搭');
console.log();

// 标准麻将：14张起手，摸到第14张后打出1张 → 13张待机（听牌）
// 当前13张，分析"摸任意牌后能否直接成3n+2"
console.log('=== 枚举摸牌后能否成胡 ===');

const allTiles = [];
for (const suit of ['dot', 'bamboo', 'character']) {
  for (let v = 1; v <= 9; v++) allTiles.push({ suit, value: v });
}
for (let v = 1; v <= 4; v++) allTiles.push({ suit: 'wind', value: v });
for (let v = 1; v <= 3; v++) allTiles.push({ suit: 'dragon', value: v });

const winningDraws = [];
for (const draw of allTiles) {
  const testHand = [...hand, draw]; // 13+1=14张
  const result = canWin(testHand as any, [], null);
  if (result.canWin) {
    const tileName = `${draw.suit}_${draw.value}`;
    winningDraws.push({ tile: tileName, types: result.types });
  }
}

if (winningDraws.length > 0) {
  console.log('摸到以下牌可直接成胡:');
  for (const w of winningDraws) {
    console.log(`  ${w.tile} → ${w.types.join(', ')}`);
  }
} else {
  console.log('没有任何摸牌能直接成胡');
}
console.log();

// 手牌组牌分析
console.log('=== 手牌组牌分析 ===');
console.log('111筒(刻) + 789筒(顺) + 北北北(刻) = 9张面子');
console.log('234筒(4张) = 待拆');
console.log('如果234筒作为面子: 9+3=12张面子，缺1对将');
console.log('如果234筒拆: 2筒或3筒或4筒作将，余下234作为顺(缺1和5)');
console.log();
console.log('结论: 当前13张需要摸1张成对才能听牌');
console.log('234筒组合下，任何一张筒子凑成对都能听牌');
console.log('具体听牌取决于234筒如何拆分');

// 更精确：枚举打哪张后摸哪张能听牌（14张摸1打1=13待机）
console.log();
console.log('=== 14张起手后打1张的听牌分析 ===');
for (let discardIdx = 0; discardIdx < hand.length; discardIdx++) {
  const thirteen = hand.filter((_, i) => i !== discardIdx); // 14-1=13张
  const winningDraws13 = [];
  
  for (const draw of allTiles) {
    const testHand = [...thirteen, draw]; // 13+1=14张
    const result = canWin(testHand as any, [], null);
    if (result.canWin) {
      winningDraws13.push(`${draw.suit}_${draw.value}`);
    }
  }
  
  if (winningDraws13.length > 0) {
    console.log(`打 ${hand[discardIdx].suit}_${hand[discardIdx].value} 后，听: ${winningDraws13.join(', ')}`);
  }
}