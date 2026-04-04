/**
 * 4AI 正常对战模拟 v4
 * 使用实际 botService 的 shouldClaimPendingAction + selectDiscardTile
 * 用法: npx tsx scripts/simulate-4ai-v4.ts [rounds] [gamesPerRound]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createDeck, shuffleTiles, isFlower, groupTiles } from '../server/utils/tiles';
import { Tile, TileSuit, MeldType, type Meld, type Player, type GameState } from '../server/types/game';
import { canWin, detectTypes, findBestDiscardForTing, checkChowPongExclusion, updateChowPongExclusion, HandType } from '../server/utils/handValidator';
import { shouldClaimPendingAction, selectDiscardTile } from '../server/services/botService';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const AI_NAMES = ['AI-AK', 'AI-小胖', 'AI-阿水', 'AI-老赵'];

// ========== Tile helpers ==========
function tilesEqual(a: Tile, b: Tile): boolean { return a.suit === b.suit && a.value === b.value; }
function isHonor(t: Tile): boolean { return t.suit === TileSuit.WIND || t.suit === TileSuit.DRAGON; }
function tileStr(t: Tile): string { return `${t.suit[0]}${t.value}`; }

// ========== Simple game state ==========
interface SimPlayer {
  name: string;
  hand: Tile[];
  exposed: Meld[];
  score: number;
  isTing: boolean;
  wins: number;
}

// ========== Deal tiles ==========
function dealTiles(): { hands: Tile[][]; wall: Tile[] } {
  const deck = createDeck();
  const shuffled = shuffleTiles(deck);
  
  // Remove flowers
  const nonFlowers = shuffled.filter(t => !isFlower(t));
  
  const hands: Tile[][] = [[], [], [], []];
  let idx = 0;
  
  // Deal 13 tiles to each player
  for (let p = 0; p < 4; p++) {
    for (let i = 0; i < 13; i++) {
      hands[p].push(nonFlowers[idx++]);
    }
  }
  
  const wall = nonFlowers.slice(idx);
  return { hands, wall };
}

// ========== Win detection ==========
function checkWin(hand: Tile[], exposed: Meld[]): { canWin: boolean; types: HandType[] } {
  const wildTileId = null;
  return canWin(hand, exposed, wildTileId);
}

// ========== Peng detection ==========
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
    tiles: [discarded, ...newHand.filter((_, i) => false)], // placeholder
    isConcealed: false,
  };
  // Actually create proper meld tiles
  meld.tiles = [
    { ...discarded, id: `${discarded.suit}-${discarded.value}-p1` },
    { ...discarded, id: `${discarded.suit}-${discarded.value}-p2` },
    { ...discarded, id: `${discarded.suit}-${discarded.value}-p3` },
  ];
  return { hand: newHand, meld };
}

// ========== Chow detection ==========
function canChow(hand: Tile[], discarded: Tile): boolean {
  if (isHonor(discarded)) return false;
  const v = discarded.value;
  const suit = discarded.suit;
  const groups = groupTiles(hand);
  
  const hasLeft = groups.has(`${suit}-${v - 1}`);
  const hasRight = groups.has(`${suit}-${v + 1}`);
  
  return hasLeft || hasRight;
}

function doChow(hand: Tile[], discarded: Tile): { hand: Tile[]; meld: Meld } | null {
  if (isHonor(discarded)) return null;
  const v = discarded.value;
  const suit = discarded.suit;
  
  const newHand = [...hand];
  const usedTiles: Tile[] = [discarded];
  
  // Try to find matching tiles
  const leftIdx = newHand.findIndex(t => t.suit === suit && t.value === v - 1);
  const rightIdx = newHand.findIndex(t => t.suit === suit && t.value === v + 1);
  
  if (leftIdx >= 0 && rightIdx >= 0) {
    // Use both sides
    usedTiles.push(newHand[leftIdx], newHand[rightIdx]);
    newHand.splice(Math.max(leftIdx, rightIdx), 1);
    newHand.splice(Math.min(leftIdx, rightIdx), 1);
  } else if (leftIdx >= 0) {
    // Use left side
    usedTiles.push(newHand[leftIdx]);
    newHand.splice(leftIdx, 1);
  } else if (rightIdx >= 0) {
    // Use right side
    usedTiles.push(newHand[rightIdx]);
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

// ========== Create bot Player object ==========
function createBotPlayer(simPlayer: SimPlayer, index: number): Player {
  return {
    id: `bot-${index}`,
    name: simPlayer.name,
    position: index,
    hand: {
      concealedTiles: simPlayer.hand,
      exposedMelds: simPlayer.exposed,
      flowerTiles: [],
    },
    score: simPlayer.score,
    isTing: simPlayer.isTing,
    isAI: true,
  };
}

function createBotGame(players: SimPlayer[], wall: Tile[], wallIdx: number, currentTurn: number): GameState {
  return {
    id: 'sim-game',
    players: players.map((p, i) => createBotPlayer(p, i)),
    wall: wall.slice(wallIdx),
    discardPile: [],
    currentTurn,
    dealerIndex: 0,
    roundStats: [],
    chowPongExclusion: {},
    pendingActions: [],
  } as GameState;
}

// ========== Main game loop ==========
function playOneGame(round: number, gameNum: number): { winner: string | null; winTypes: HandType[]; score: number } {
  const { hands, wall } = dealTiles();
  
  const players: SimPlayer[] = AI_NAMES.map((name, i) => ({
    name,
    hand: hands[i],
    exposed: [],
    score: 0,
    isTing: false,
    wins: 0,
  }));
  
  let wallIdx = 0;
  let currentPlayer = 0; // Dealer starts
  let lastDiscard: Tile | null = null;
  
  let maxTurns = 200; // Prevent infinite loops
  let turn = 0;
  
  while (turn < maxTurns) {
    turn++;
    const player = players[currentPlayer];
    
    // Draw tile
    if (wallIdx < wall.length) {
      player.hand.push(wall[wallIdx++]);
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
    const botGame = createBotGame(players, wall, wallIdx, currentPlayer);
    
    const discard = selectDiscardTile(botPlayer, botGame);
    if (!discard) break;
    
    // Remove discarded tile from hand (match by id)
    const discardIdx = player.hand.findIndex(t => t.id === discard);
    if (discardIdx >= 0) {
      player.hand.splice(discardIdx, 1);
    } else {
      // Fallback: match by suit-value
      const parts = discard.split('-');
      const suit = parts.slice(0, -1).join('-');
      const value = parseInt(parts[parts.length - 1]);
      const fallbackIdx = player.hand.findIndex(t => t.suit === suit && t.value === value);
      if (fallbackIdx >= 0) {
        player.hand.splice(fallbackIdx, 1);
      }
    }
    
    lastDiscard = discard;
    
    // Check if next player can peng/chow/win
    const nextPlayer = (currentPlayer + 1) % 4;
    const nextP = players[nextPlayer];
    
    // Check win on discard
    if (lastDiscard) {
      const tempHand = [...nextP.hand, lastDiscard];
      const discardWin = checkWin(tempHand, nextP.exposed);
      if (discardWin.canWin) {
        return { winner: nextP.name, winTypes: discardWin.types, score: 1 };
      }
    }
    
    // Check peng
    if (lastDiscard && canPeng(nextP.hand, lastDiscard)) {
      const pengPlayer = createBotPlayer(nextP, nextPlayer);
      const pengGame = createBotGame(players, wall, wallIdx, nextPlayer);
      pengGame.pendingActions = [{
        playerId: `bot-${nextPlayer}`,
        tile: lastDiscard,
        availableActions: ['PENG' as any],
      }];
      
      const action = shouldClaimPendingAction(pengPlayer, ['PENG' as any, 'PASS' as any], pengGame);
      if (action === 'PENG') {
        const pengResult = doPeng(nextP.hand, lastDiscard);
        nextP.hand = pengResult.hand;
        nextP.exposed.push(pengResult.meld);
        lastDiscard = null;
        currentPlayer = nextPlayer;
        continue;
      }
    }
    
    // Check chow (only for next player after discard)
    if (lastDiscard && canChow(nextP.hand, lastDiscard)) {
      const chowPlayer = createBotPlayer(nextP, nextPlayer);
      const chowGame = createBotGame(players, wall, wallIdx, nextPlayer);
      chowGame.pendingActions = [{
        playerId: `bot-${nextPlayer}`,
        tile: lastDiscard,
        availableActions: ['CHOW' as any],
      }];
      
      const action = shouldClaimPendingAction(chowPlayer, ['CHOW' as any, 'PASS' as any], chowGame);
      if (action === 'CHOW') {
        const chowResult = doChow(nextP.hand, lastDiscard);
        if (chowResult) {
          nextP.hand = chowResult.hand;
          nextP.exposed.push(chowResult.meld);
          lastDiscard = null;
          currentPlayer = nextPlayer;
          continue;
        }
      }
    }
    
    // Next player's turn
    currentPlayer = (currentPlayer + 1) % 4;
  }
  
  return { winner: null, winTypes: [], score: 0 }; // Draw
}

// ========== Main ==========
async function main() {
  const startRound = parseInt(process.argv[2] || '1');
  const rounds = parseInt(process.argv[3] || '10');
  const gamesPerRound = parseInt(process.argv[4] || '200');
  
  console.log(`=== 4AI 正常对战模拟 v4 ===`);
  console.log(` startRound=${startRound}, totalRounds=${rounds}, gamesPerRound=${gamesPerRound}\n`);
  
  const outputDir = path.join(__dirname, '../training-output/sim-4ai');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  
  // Load existing round data if starting from round > 1
  const allRoundStats: any[] = [];
  for (let r = 1; r < startRound; r++) {
    const f = path.join(outputDir, `round-${r}-sim-4ai-v4.json`);
    if (fs.existsSync(f)) {
      try { allRoundStats.push(JSON.parse(fs.readFileSync(f, 'utf-8'))); } catch(e) {}
    }
  }
  
  for (let round = startRound; round <= rounds; round++) {
    console.log(`\n轮次 ${round}/${rounds}...`);
    
    const stats = {
      totalGames: 0,
      wins: 0,
      draws: 0,
      winTypes: {} as Record<string, number>,
      playerWins: {} as Record<string, number>,
    };
    
    for (let game = 0; game < gamesPerRound; game++) {
      stats.totalGames++;
      const result = playOneGame(round, game);
      
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
    
    const outputFile = path.join(outputDir, `round-${round}-sim-4ai-v4.json`);
    fs.writeFileSync(outputFile, JSON.stringify({ ...roundReport, timestamp: new Date().toISOString() }, null, 2));
    console.log(`  → ${outputFile}`);
    
    allRoundStats.push(roundReport);
  }
  
  // Summary
  console.log('\n=== 汇总 ===');
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
  
  const summaryFile = path.join(outputDir, 'summary-sim-4ai-v4.json');
  fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
  console.log(`\n汇总: ${summaryFile}`);
}

main().catch(console.error);
