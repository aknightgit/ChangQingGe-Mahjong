import { createDeck, shuffleTiles, isFlower } from '../server/utils/tiles';
import { canWin, HandType } from '../server/utils/handValidator';

// 模拟1000局，统计四百搭出现次数
let fourWildCount = 0;
let totalGames = 1000;

for (let g = 0; g < totalGames; g++) {
  const deck = createDeck();
  const shuffled = shuffleTiles(deck);
  
  const hands: any[][] = [[], [], [], []];
  const flowers: any[][] = [[], [], [], []];
  let idx = 0;
  
  for (let p = 0; p < 4; p++) {
    while (hands[p].length < 13 && idx < shuffled.length) {
      const tile = shuffled[idx++];
      if (isFlower(tile)) {
        flowers[p].push(tile);
      } else {
        hands[p].push(tile);
      }
    }
  }
  
  const nonFlowerPool = shuffled.filter(t => !isFlower(t));
  const wildSource = nonFlowerPool[Math.floor(Math.random() * nonFlowerPool.length)];
  const wildTileId = wildSource ? `${wildSource.suit}-${wildSource.value}` : null;
  
  // 检查每个玩家手牌中百搭数量
  for (let p = 0; p < 4; p++) {
    const wildCount = hands[p].filter(t => `${t.suit}-${t.value}` === wildTileId).length;
    if (wildCount >= 4) {
      fourWildCount++;
      console.log(`Game ${g}, Player ${p}: ${wildCount} wild tiles! wildTileId=${wildTileId}`);
      console.log(`  Hand: ${hands[p].map(t => `${t.suit}-${t.value}`).join(' ')}`);
    }
  }
}

console.log(`\n四百搭出现次数: ${fourWildCount}/${totalGames * 4} 手牌`);
console.log(`概率: ${(fourWildCount / (totalGames * 4) * 100).toFixed(4)}%`);
