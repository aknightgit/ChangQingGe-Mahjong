/**
 * 长清阁麻将 - AI模拟训练
 * 
 * 用法: npx tsx test-simulation.ts [局数]
 * 默认跑100局
 */

import { createDeck, shuffleTiles, sortTiles, isFlower, tilesEqual, groupTiles, getTileDisplayName, isFivePoison } from './server/utils/tiles';
import { canWin, detectHandTypes, HandType } from './server/utils/handValidator';
import { calculateScore } from './server/utils/scoring';
import { Tile, TileSuit, MeldType } from './server/types/game';

// ===== 配置 =====
const TOTAL_GAMES = parseInt(process.argv[2]) || 100;
const PLAYER_NAMES = ['K哥', 'AI-东', 'AI-西', 'AI-北'];

// ===== 模拟一局 =====
interface GameRecord {
  gameNum: number;
  winners: Array<{ name: string; handType: string; points: number; tiles: string[] }>;
  losers: Array<{ name: string; score: number }>;
  totalPot: number;
  rounds: number;
  reason: string;
}

function simulateGame(gameNum: number): GameRecord {
  // 创建牌墙
  let wall = shuffleTiles(createDeck());
  
  // 随机选百搭
  const allTypes: Array<{suit: TileSuit; value: number}> = [];
  for (const suit of [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS]) {
    for (let v = 1; v <= 9; v++) allTypes.push({suit, value: v});
  }
  for (let v = 1; v <= 4; v++) allTypes.push({suit: TileSuit.WIND, value: v});
  for (let v = 1; v <= 3; v++) allTypes.push({suit: TileSuit.DRAGON, value: v});
  
  const wildIdx = Math.floor(Math.random() * allTypes.length);
  const wildType = allTypes[wildIdx];
  const wildTileId = `${wildType.suit}-${wildType.value}`;

  // 发牌
  const hands: Tile[][] = [[], [], [], []];
  const melds: Array<Array<{tiles: Tile[], type: string, source: number}>> = [[], [], [], []];
  const discards: Tile[][] = [[], [], [], []];
  const flowers: Tile[][] = [[], [], [], []];
  const status: string[] = ['playing', 'playing', 'playing', 'playing'];
  const scores = [0, 0, 0, 0];

  // 每人发13张（花牌自动补花）
  for (let round = 0; round < 13; round++) {
    for (let p = 0; p < 4; p++) {
      drawTile(wall, hands, flowers, p);
    }
  }
  // 庄家多摸一张
  drawTile(wall, hands, flowers, 0);

  let currentPlayer = 0;
  let rounds = 0;
  const maxRounds = 300;
  let winnersCount = 0;
  let reason = '流局';

  // 模拟打牌
  while (rounds < maxRounds && wall.length > 0 && winnersCount < 3) {
    if (status[currentPlayer] !== 'playing') {
      currentPlayer = (currentPlayer + 1) % 4;
      rounds++;
      continue;
    }

    const hand = hands[currentPlayer];
    
    // 回合开始时补花
    replaceFlowers(wall, hands, flowers, currentPlayer);

    // 检查是否能胡
    const winCheck = canWin(hand, melds[currentPlayer].length);
    if (winCheck.canWin) {
      // AI胡牌决策: 80%概率胡
      if (Math.random() < 0.8) {
        const handTypes = detectHandTypes(hand, melds[currentPlayer].map(m => ({
          type: MeldType.TRIPLET,
          tiles: m.tiles,
          isConcealed: false
        })), true, flowers[currentPlayer].length, wildTileId);
        
        const scoreResult = calculateScore({
          handTiles: hand,
          exposedMelds: melds[currentPlayer].map(m => ({
            type: MeldType.TRIPLET,
            tiles: m.tiles,
            isConcealed: false
          })),
          flowerTiles: flowers[currentPlayer],
          handTypes,
          isSelfDrawn: true,
          isKongFlower: false,
          isRobbingKong: false,
          isMenQing: melds[currentPlayer].length === 0,
          wildTileSuit: wildType.suit,
          wildTileValue: wildType.value,
          roundMultiplier: 1,
          globalMultiplier: 1
        });

        scores[currentPlayer] += scoreResult.finalPoints;
        for (let i = 0; i < 4; i++) {
          if (i !== currentPlayer) scores[i] -= Math.floor(scoreResult.finalPoints / 3);
        }
        status[currentPlayer] = 'won';
        winnersCount++;
        reason = '自摸胡牌';
        
        if (winnersCount >= 3) break;
      }
    }

    // 打牌: AI策略 - 打最后一张
    const discard = hand.pop()!;
    discards[currentPlayer].push(discard);

    // 检查其他人是否能碰/杠/胡
    let claimed = false;
    for (let p = 1; p <= 3; p++) {
      const otherIdx = (currentPlayer + p) % 4;
      if (status[otherIdx] !== 'playing') continue;
      
      const otherHand = hands[otherIdx];
      
      // 检查胡
      const otherWin = canWin([...otherHand, discard], melds[otherIdx].length);
      if (otherWin.canWin && Math.random() < 0.7) {
        // 抢胡
        otherHand.push(discard);
        const handTypes = detectHandTypes(otherHand, melds[otherIdx].map(m => ({
          type: MeldType.TRIPLET,
          tiles: m.tiles,
          isConcealed: false
        })), false, flowers[otherIdx].length, wildTileId);
        
        const scoreResult = calculateScore({
          handTiles: otherHand,
          exposedMelds: melds[otherIdx].map(m => ({
            type: MeldType.TRIPLET,
            tiles: m.tiles,
            isConcealed: false
          })),
          flowerTiles: flowers[otherIdx],
          handTypes,
          isSelfDrawn: false,
          isKongFlower: false,
          isRobbingKong: false,
          isMenQing: melds[otherIdx].length === 0,
          wildTileSuit: wildType.suit,
          wildTileValue: wildType.value,
          roundMultiplier: 1,
          globalMultiplier: 1
        });

        scores[otherIdx] += scoreResult.finalPoints;
        scores[currentPlayer] -= scoreResult.finalPoints;
        status[otherIdx] = 'won';
        winnersCount++;
        reason = '放冲胡牌';
        claimed = true;
        
        if (winnersCount >= 3) break;
      }
      
      // 检查碰
      if (!claimed) {
        const sameTiles = otherHand.filter(t => tilesEqual(t, discard));
        if (sameTiles.length >= 2 && Math.random() < 0.4) {
          // 碰
          melds[otherIdx].push({
            tiles: [discard, sameTiles[0], sameTiles[1]],
            type: 'pung',
            source: currentPlayer
          });
          otherHand.splice(otherHand.indexOf(sameTiles[0]), 1);
          otherHand.splice(otherHand.indexOf(sameTiles[1]), 1);
          // 碰完要打一张
          if (otherHand.length > 0) {
            const pengDiscard = otherHand.pop()!;
            discards[otherIdx].push(pengDiscard);
          }
          claimed = true;
        }
      }
    }

    currentPlayer = (currentPlayer + 1) % 4;
    rounds++;
  }

  // 如果流局
  if (winnersCount === 0) {
    reason = wall.length === 0 ? '牌墙摸完流局' : '超时流局';
  }

  // 计算最终得分
  const gameResult: GameRecord = {
    gameNum,
    winners: [],
    losers: [],
    totalPot: 0,
    rounds,
    reason
  };

  for (let i = 0; i < 4; i++) {
    if (status[i] === 'won') {
      const handTypes = detectHandTypes(hands[i], melds[i].map(m => ({
        type: MeldType.TRIPLET,
        tiles: m.tiles,
        isConcealed: false
      })), true, flowers[i].length, wildTileId);
      
      const typeName = handTypes.length > 0 ? handTypes[0] : '普通胡';
      gameResult.winners.push({
        name: PLAYER_NAMES[i],
        handType: typeName,
        points: scores[i],
        tiles: [...hands[i], ...melds[i].flatMap(m => m.tiles)].map(t => getTileDisplayName(t))
      });
    } else {
      gameResult.losers.push({
        name: PLAYER_NAMES[i],
        score: scores[i]
      });
    }
    gameResult.totalPot += Math.abs(scores[i]);
  }

  return gameResult;
}

function drawTile(wall: Tile[], hands: Tile[][], flowers: Tile[][], playerIdx: number) {
  if (wall.length === 0) return;
  const tile = wall.pop()!;
  if (isFlower(tile)) {
    flowers[playerIdx].push(tile);
    drawTile(wall, hands, flowers, playerIdx); // 补花
  } else {
    hands[playerIdx].push(tile);
  }
}

function replaceFlowers(wall: Tile[], hands: Tile[][], flowers: Tile[][], playerIdx: number) {
  // 检查是否需要补花（简化版）
  // 实际游戏中花牌在摸牌时自动处理
}

// ===== 主程序 =====
console.log(`🀄 开始模拟 ${TOTAL_GAMES} 局长清阁麻将...\n`);

const results: GameRecord[] = [];
const startTime = Date.now();

for (let i = 0; i < TOTAL_GAMES; i++) {
  results.push(simulateGame(i + 1));
  if ((i + 1) % 20 === 0) {
    process.stdout.write(`  完成 ${i + 1}/${TOTAL_GAMES} 局...\r`);
  }
}

const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

console.log(`\n\n✅ 模拟完成！${TOTAL_GAMES} 局，耗时 ${elapsed}s\n`);

// 统计
const winners = results.flatMap(r => r.winners);
const totalWins = winners.length;
const handTypeCounts: Record<string, number> = {};
winners.forEach(w => {
  handTypeCounts[w.handType] = (handTypeCounts[w.handType] || 0) + 1;
});

// 找最大输赢局
const sortedByPot = [...results].sort((a, b) => b.totalPot - a.totalPot);
const biggest = sortedByPot[0];

console.log('📊 统计摘要:');
console.log(`  总局数: ${TOTAL_GAMES}`);
console.log(`  有赢家: ${results.filter(r => r.winners.length > 0).length} 局`);
console.log(`  流局: ${results.filter(r => r.winners.length === 0).length} 局`);
console.log(`  平均回合: ${(results.reduce((s, r) => s + r.rounds, 0) / TOTAL_GAMES).toFixed(0)}`);
console.log('');

console.log('🏆 牌型分布:');
Object.entries(handTypeCounts)
  .sort((a, b) => b[1] - a[1])
  .forEach(([type, count]) => {
    console.log(`  ${type}: ${count} 次 (${(count / totalWins * 100).toFixed(1)}%)`);
  });

console.log('');
console.log(`💰 最大输赢局 (第${biggest.gameNum}局):`);
console.log(`  原因: ${biggest.reason}`);
console.log(`  总筹码: ${biggest.totalPot}`);
console.log(`  回合: ${biggest.rounds}`);
console.log('');
biggest.winners.forEach(w => {
  console.log(`  🏅 ${w.name}: ${w.handType} (+${w.points}番)`);
  console.log(`    牌面: ${w.tiles.join(' ')}`);
});
biggest.losers.forEach(l => {
  console.log(`  💸 ${l.name}: ${l.score}`);
});
