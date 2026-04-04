import { createDeck, shuffleTiles, isFlower } from '../server/utils/tiles';
import { canWin, HandType } from '../server/utils/handValidator';

// 模拟完整游戏，追踪四百搭
let fourWildWins = 0;
let totalGames = 500;

for (let g = 0; g < totalGames; g++) {
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
  const wall = shuffled.slice(idx);
  const nonFlowerPool = shuffled.filter(t => !isFlower(t));
  const wildSource = nonFlowerPool[Math.floor(Math.random() * nonFlowerPool.length)];
  const wildTileId = wildSource ? `${wildSource.suit}-${wildSource.value}` : null;
  
  // 检查初始发牌后各玩家百搭数
  for (let p = 0; p < 4; p++) {
    const wildCount = hands[p].filter(t => `${t.suit}-${t.value}` === wildTileId).length;
    if (wildCount >= 4) {
      fourWildWins++;
      console.log(`Game ${g}, Player ${p} initial: ${wildCount} wild! wildTileId=${wildTileId}`);
    }
  }
  
  // 模拟摸牌过程
  let wallIdx = 0;
  let currentPlayer = 0;
  for (let turn = 0; turn < 200; turn++) {
    if (wallIdx < wall.length) {
      const drawn = wall[wallIdx++];
      if (!isFlower(drawn)) {
        hands[currentPlayer].push(drawn);
        const wildCount = hands[currentPlayer].filter(t => `${t.suit}-${t.value}` === wildTileId).length;
        if (wildCount >= 4) {
          fourWildWins++;
          console.log(`Game ${g}, Player ${currentPlayer} after draw ${turn}: ${wildCount} wild! wildTileId=${wildTileId}, drew=${drawn.suit}-${drawn.value}`);
          break;
        }
        // 模拟打牌（随机打）
        if (hands[currentPlayer].length > 13) {
          hands[currentPlayer].splice(Math.floor(Math.random() * hands[currentPlayer].length), 1);
        }
      }
    }
    currentPlayer = (currentPlayer + 1) % 4;
  }
}

console.log(`\n四百搭胡牌: ${fourWildWins}/${totalGames} = ${(fourWildWins/totalGames*100).toFixed(1)}%`);
