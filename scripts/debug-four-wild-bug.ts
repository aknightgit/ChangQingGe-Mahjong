import { createDeck, shuffleTiles, isFlower } from '../server/utils/tiles';
import { canWin, HandType, buildWildTileChecker } from '../server/utils/handValidator';

// 模拟10000局初始发牌，统计四百搭出现次数
let fourWildCount = 0;
let totalHands = 0;

for (let g = 0; g < 10000; g++) {
  const deck = createDeck();
  const shuffled = shuffleTiles(deck);
  const hands: any[][] = [[], [], [], []];
  const flowers: any[][] = [[], [], [], []];
  let idx = 0;
  for (let p = 0; p < 4; p++) {
    while (hands[p].length < 13 && idx < shuffled.length) {
      const tile = shuffled[idx++];
      if (isFlower(tile)) flowers[p].push(tile);
      else hands[p].push(tile);
    }
  }
  const nonFlowerPool = shuffled.filter(t => !isFlower(t));
  const wildSource = nonFlowerPool[Math.floor(Math.random() * nonFlowerPool.length)];
  const wildTileId = wildSource ? `${wildSource.suit}-${wildSource.value}` : null;
  
  for (let p = 0; p < 4; p++) {
    totalHands++;
    const wildCount = hands[p].filter(t => `${t.suit}-${t.value}` === wildTileId).length;
    if (wildCount >= 4) fourWildCount++;
  }
}
console.log(`初始发牌四百搭: ${fourWildCount}/${totalHands} = ${(fourWildCount/totalHands*100).toFixed(4)}%`);
console.log(`理论概率: ~0.0001% (1/10000级别)`);
