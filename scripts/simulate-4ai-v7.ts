/**
 * 4AI 完整游戏模拟器 v7
 * 用于AI策略训练：完整游戏流程 + 正确碰/吃/杠/胡判断
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createDeck, shuffleTiles, isFlower, groupTiles, getSuits } from '../server/utils/tiles';
import { Tile, TileSuit, MeldType, type Meld, type Player, type GameState } from '../server/types/game';
import { canWin, findBestDiscardForTing, checkChowPongExclusion, updateChowPongExclusion, HandType, ChowPongExclusionState } from '../server/utils/handValidator';
import { generateWinOptions, calculateScore } from '../server/utils/scoring';
import { selectDiscardTile, shouldClaimPendingAction } from '../server/services/botService';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const AI_NAMES = ['AI-AK', 'AI-小胖', 'AI-阿水', 'AI-老赵'];

// ========== Tile helpers ==========
function tilesEqual(a: Tile, b: Tile): boolean { return a.suit === b.suit && a.value === b.value; }
function isHonor(t: Tile): boolean { return t.suit === TileSuit.WIND || t.suit === TileSuit.DRAGON; }

// ========== Game State ==========
interface SimPlayer {
  name: string;
  hand: Tile[];
  exposed: Meld[];
  flowers: Tile[];
  score: number;
  wins: number;
  chowPongExclusion: ChowPongExclusionState;
}

// ========== Deal ==========
function dealTiles(): { hands: Tile[][]; wall: Tile[]; flowers: Tile[][] } {
  const deck = createDeck();
  const shuffled = shuffleTiles(deck);
  
  const hands: Tile[][] = [[], [], [], []];
  const flowers: Tile[][] = [[], [], [], []];
  let idx = 0;
  
  // Deal 13 tiles to each player, extract flowers
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
  
  const wall = shuffled.slice(idx);
  return { hands, wall, flowers };
}

// ========== Win check ==========
function checkWin(hand: Tile[], exposed: Meld[]): { canWin: boolean; types: HandType[] } {
  return canWin(hand, exposed, null);
}

// ========== Peng ==========
function canPeng(hand: Tile[], discarded: Tile): boolean {
  let count = 0;
  for (const t of hand) { if (tilesEqual(t, discarded)) count++; }
  return count >= 2;
}

function doPeng(hand: Tile[], discarded: Tile): { hand: Tile[]; meld: Meld } {
  const newHand = [...hand];
  let removed = 0;
  for (let i = newHand.length - 1; i >= 0 && removed < 2; i--) {
    if (tilesEqual(newHand[i], discarded)) { newHand.splice(i, 1); removed++; }
  }
  const meld: Meld = {
    type: MeldType.TRIPLET,
    tiles: [
      { ...discarded, id: `${discarded.suit}-${discarded.value}-p1` },
      { ...discarded, id: `${discarded.suit}-${discarded.value}-p2` },
      { ...discarded, id: `${discarded.suit}-${discarded.value}-p3` },
    ],
    isConcealed: false,
  };
  return { hand: newHand, meld };
}

// ========== Chow ==========
function canChow(hand: Tile[], discarded: Tile): boolean {
  if (isHonor(discarded)) return false;
  const v = discarded.value;
  const suit = discarded.suit;
  const groups = groupTiles(hand);
  return groups.has(`${suit}-${v - 1}`) || groups.has(`${suit}-${v + 1}`);
}

function doChow(hand: Tile[], discarded: Tile): { hand: Tile[]; meld: Meld } | null {
  if (isHonor(discarded)) return null;
  const v = discarded.value;
  const suit = discarded.suit;
  
  const newHand = [...hand];
  const usedTiles: Tile[] = [{ ...discarded, id: `${discarded.suit}-${discarded.value}-c0` }];
  
  const leftIdx = newHand.findIndex(t => t.suit === suit && t.value === v - 1);
  const rightIdx = newHand.findIndex(t => t.suit === suit && t.value === v + 1);
  
  if (leftIdx >= 0 && rightIdx >= 0) {
    usedTiles.push({ ...newHand[leftIdx], id: `${suit}-${v-1}-c1` });
    usedTiles.push({ ...newHand[rightIdx], id: `${suit}-${v+1}-c2` });
    newHand.splice(Math.max(leftIdx, rightIdx), 1);
    newHand.splice(Math.min(leftIdx, rightIdx), 1);
  } else if (leftIdx >= 0) {
    usedTiles.push({ ...newHand[leftIdx], id: `${suit}-${v-1}-c1` });
    newHand.splice(leftIdx, 1);
  } else if (rightIdx >= 0) {
    usedTiles.push({ ...newHand[rightIdx], id: `${suit}-${v+1}-c1` });
    newHand.splice(rightIdx, 1);
  } else {
    return null;
  }
  
  const meld: Meld = {
    type: MeldType.SEQUENCE,
    tiles: usedTiles,
    isConcealed: false,
  };
  
  return { hand: newHand, meld };
}

// ========== Create bot objects ==========
function createBotPlayer(p: SimPlayer, idx: number): Player {
  return {
    id: `bot-${idx}`,
    name: p.name,
    position: idx,
    hand: { concealedTiles: p.hand, exposedMelds: p.exposed, flowerTiles: p.flowers },
    score: p.score,
    isTing: false,
    isAI: true,
  };
}

function createBotGame(players: SimPlayer[], wallIdx: number, currentTurn: number, pendingActions: any[]): GameState {
  return {
    id: 'sim',
    players: players.map((p, i) => createBotPlayer(p, i)),
    wall: [],
    discardPile: [],
    currentTurn,
    dealerIndex: 0,
    roundStats: [],
    chowPongExclusion: {},
    pendingActions,
  } as GameState;
}

// ========== Main game loop ==========
function playOneGame(): { winner: string | null; winTypes: HandType[]; score: number } {
  const { hands, wall, flowers } = dealTiles();
  
  const players: SimPlayer[] = AI_NAMES.map((name, i) => ({
    name,
    hand: hands[i],
    exposed: [],
    flowers: flowers[i],
    score: 0,
    wins: 0,
    chowPongExclusion: { firstActionSuit: null, firstActionType: null },
  }));
  
  let wallIdx = 0;
  let currentPlayer = 0;
  let lastDiscard: Tile | null = null;
  let lastDiscardPlayer = -1;
  
  let maxTurns = 300;
  let turn = 0;
  
  while (turn < maxTurns) {
    turn++;
    const player = players[currentPlayer];
    
    // Draw tile
    if (wallIdx < wall.length) {
      const drawn = wall[wallIdx++];
      if (isFlower(drawn)) {
        player.flowers.push(drawn);
        // Draw again
        if (wallIdx < wall.length) {
          player.hand.push(wall[wallIdx++]);
        } else break;
      } else {
        player.hand.push(drawn);
      }
    } else {
      break; // Wall exhausted
    }
    
    // Check win after draw
    const winResult = checkWin(player.hand, player.exposed);
    if (winResult.canWin) {
      return { winner: player.name, winTypes: winResult.types, score: 1 };
    }
    
    // Discard using botService
    const botPlayer = createBotPlayer(player, currentPlayer);
    const botGame = createBotGame(players, wallIdx, currentPlayer, []);
    
    const discardId = selectDiscardTile(botPlayer, botGame);
    if (!discardId) break;
    
    // Find and remove discarded tile
    const discardIdx = player.hand.findIndex(t => t.id === discardId);
    if (discardIdx >= 0) {
      lastDiscard = player.hand.splice(discardIdx, 1)[0];
    } else {
      // Fallback
      const parts = discardId.split('-');
      const suit = parts.slice(0, -1).join('-');
      const value = parseInt(parts[parts.length - 1]);
      const fallbackIdx = player.hand.findIndex(t => t.suit === suit && t.value === value);
      if (fallbackIdx >= 0) {
        lastDiscard = player.hand.splice(fallbackIdx, 1)[0];
      } else {
        break;
      }
    }
    
    lastDiscardPlayer = currentPlayer;
    
    // Check ALL players for win/peng/chow on discard
    let actionTaken = false;
    
    // Check win on discard (all players)
    for (let p = 0; p < 4; p++) {
      if (p === currentPlayer) continue;
      const pPlayer = players[p];
      const tempHand = [...pPlayer.hand, lastDiscard!];
      const discardWin = checkWin(tempHand, pPlayer.exposed);
      if (discardWin.canWin) {
        return { winner: pPlayer.name, winTypes: discardWin.types, score: 1 };
      }
    }
    
    // Check peng (all players except discarder)
    for (let p = 0; p < 4; p++) {
      if (p === currentPlayer) continue;
      const pPlayer = players[p];
      if (lastDiscard && canPeng(pPlayer.hand, lastDiscard)) {
        if (checkChowPongExclusion(pPlayer.chowPongExclusion, 'pong', lastDiscard.suit)) {
          const pengPlayer = createBotPlayer(pPlayer, p);
          const pengGame = createBotGame(players, wallIdx, p, [{
            playerId: `bot-${p}`,
            tile: lastDiscard,
            availableActions: ['PENG'],
          }]);
          
          const action = shouldClaimPendingAction(pengPlayer, ['PENG', 'PASS'], pengGame);
          if (action === 'PENG') {
            const pengResult = doPeng(pPlayer.hand, lastDiscard);
            pPlayer.hand = pengResult.hand;
            pPlayer.exposed.push(pengResult.meld);
            pPlayer.chowPongExclusion = updateChowPongExclusion(pPlayer.chowPongExclusion, 'pong', lastDiscard.suit);
            lastDiscard = null;
            currentPlayer = p;
            actionTaken = true;
            break;
          }
        }
      }
    }
    
    if (actionTaken) continue;
    
    // Check chow (only next player)
    const nextPlayer = (currentPlayer + 1) % 4;
    const nextP = players[nextPlayer];
    if (lastDiscard && canChow(nextP.hand, lastDiscard)) {
      if (checkChowPongExclusion(nextP.chowPongExclusion, 'chow', lastDiscard.suit)) {
        const chowPlayer = createBotPlayer(nextP, nextPlayer);
        const chowGame = createBotGame(players, wallIdx, nextPlayer, [{
          playerId: `bot-${nextPlayer}`,
          tile: lastDiscard,
          availableActions: ['CHOW'],
        }]);
        
        const action = shouldClaimPendingAction(chowPlayer, ['CHOW', 'PASS'], chowGame);
        if (action === 'CHOW') {
          const chowResult = doChow(nextP.hand, lastDiscard);
          if (chowResult) {
            nextP.hand = chowResult.hand;
            nextP.exposed.push(chowResult.meld);
            nextP.chowPongExclusion = updateChowPongExclusion(nextP.chowPongExclusion, 'chow', lastDiscard.suit);
            lastDiscard = null;
            currentPlayer = nextPlayer;
            actionTaken = true;
          }
        }
      }
    }
    
    if (actionTaken) continue;
    
    // Next player's turn
    currentPlayer = (currentPlayer + 1) % 4;
  }
  
  return { winner: null, winTypes: [], score: 0 };
}

// ========== Main ==========
async function main() {
  const startRound = parseInt(process.argv[2] || '1');
  const rounds = parseInt(process.argv[3] || '10');
  const gamesPerRound = parseInt(process.argv[4] || '500');
  
  console.log(`=== 4AI 完整游戏模拟器 v7 ===`);
  console.log(` rounds=${rounds}, gamesPerRound=${gamesPerRound}\n`);
  
  const outputDir = path.join(__dirname, '../training-output/sim-4ai-v7');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  
  const allRoundStats: any[] = [];
  
  for (let round = startRound; round <= rounds; round++) {
    console.log(`\n========== 轮次 ${round}/${rounds} ==========`);
    
    const stats = {
      totalGames: 0,
      wins: 0,
      draws: 0,
      winTypes: {} as Record<string, number>,
      playerWins: {} as Record<string, number>,
    };
    
    for (let game = 0; game < gamesPerRound; game++) {
      stats.totalGames++;
      const result = playOneGame();
      
      if (result.winner) {
        stats.wins++;
        stats.playerWins[result.winner] = (stats.playerWins[result.winner] || 0) + 1;
        for (const t of result.winTypes) {
          stats.winTypes[t] = (stats.winTypes[t] || 0) + 1;
        }
      } else {
        stats.draws++;
      }
    }
    
    const roundReport = {
      round,
      totalGames: stats.totalGames,
      wins: stats.wins,
      draws: stats.draws,
      winRate: `${((stats.wins / stats.totalGames) * 100).toFixed(1)}%`,
      winTypes: stats.winTypes,
      playerWins: stats.playerWins,
    };
    
    console.log(JSON.stringify(roundReport, null, 2));
    
    const outputFile = path.join(outputDir, `round-${round}-sim-4ai-v7.json`);
    fs.writeFileSync(outputFile, JSON.stringify({ ...roundReport, timestamp: new Date().toISOString() }, null, 2));
    console.log(`  → ${outputFile}`);
    
    allRoundStats.push(roundReport);
  }
  
  // Summary
  console.log('\n========== 汇总 ==========');
  const totalGames = allRoundStats.reduce((s, r) => s + r.totalGames, 0);
  const totalWins = allRoundStats.reduce((s, r) => s + r.wins, 0);
  const totalDraws = allRoundStats.reduce((s, r) => s + r.draws, 0);
  
  const allWinTypes: Record<string, number> = {};
  const allPlayerWins: Record<string, number> = {};
  for (const r of allRoundStats) {
    for (const [k, v] of Object.entries(r.winTypes)) {
      allWinTypes[k] = (allWinTypes[k] || 0) + (v as number);
    }
    for (const [k, v] of Object.entries(r.playerWins)) {
      allPlayerWins[k] = (allPlayerWins[k] || 0) + (v as number);
    }
  }
  
  const summary = {
    totalGames,
    wins: totalWins,
    draws: totalDraws,
    overallWinRate: `${((totalWins / totalGames) * 100).toFixed(1)}%`,
    winTypes: allWinTypes,
    playerWins: allPlayerWins,
  };
  
  console.log(JSON.stringify(summary, null, 2));
  
  const summaryFile = path.join(outputDir, 'summary-sim-4ai-v7.json');
  fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
  console.log(`\n汇总: ${summaryFile}`);
}

main().catch(console.error);
