// AI-AK 手牌: 一筒一筒一筒 / 二筒三筒三筒四筒 / 七八九筒 / 北北北
// 共13张，无百搭
// 分析：13张手牌，当前是"还没听牌"状态，分析打哪张+摸什么能听牌

import { canWin } from './server/utils/handValidator.ts';

const DOT = 'dot';
const WIND = 'wind';

function makeTile(suit, value) {
  return { suit, value };
}

// 手牌：111 / 2筒3筒3筒4筒 / 789 / 333北
// 共13张
const hand = [
  makeTile(DOT, 1), makeTile(DOT, 1), makeTile(DOT, 1), // 111一筒刻
  makeTile(DOT, 2), makeTile(DOT, 3), makeTile(DOT, 3), makeTile(DOT, 4), // 2,3,3,4筒
  makeTile(DOT, 7), makeTile(DOT, 8), makeTile(DOT, 9), // 789筒
  makeTile(WIND, 3), makeTile(WIND, 3), makeTile(WIND, 3), // 北北北刻
];

// 枚举所有牌
const allTiles = [];
for (const suit of ['dot', 'bamboo', 'character']) {
  for (let v = 1; v <= 9; v++) allTiles.push({ suit, value: v, name: `${suit[0]}${v}` });
}
for (let v = 1; v <= 4; v++) allTiles.push({ suit: 'wind', value: v, name: `风${v}` });
for (let v = 1; v <= 3; v++) allTiles.push({ suit: 'dragon', value: v, name: `龙${v}` });

console.log('=== AI-AK 手牌听牌分析 (13张无百搭) ===');
console.log('手牌:', hand.map(t => `${t.suit[0]}${t.value}`).join(' '));
console.log();

// 标准麻将14张起手，摸到14后打1张=13张待机（听牌）
// 当前13张，分析"打掉X后，剩余12张+摸Y"的听牌情况
// 12张+1=13，需要组成3n+2
console.log('=== 枚举打出+摸牌组合 ===');

let found = false;
for (let discardIdx = 0; discardIdx < hand.length; discardIdx++) {
  const remaining = hand.filter((_, i) => i !== discardIdx); // 12张
  const winningDraws = [];
  
  for (const draw of allTiles) {
    const testHand = [...remaining, draw]; // 12+1=13张
    const result = canWin(testHand as any, [], null);
    if (result.canWin) {
      winningDraws.push(draw.name);
    }
  }
  
  if (winningDraws.length > 0) {
    found = true;
    const discardName = `${hand[discardIdx].suit[0]}${hand[discardIdx].value}`;
    console.log(`打 ${discardName}: 摸 ${winningDraws.join('/')} 可成胡`);
  }
}

if (!found) {
  console.log('没有任何组合能成胡（当前手牌不成听牌）');
}