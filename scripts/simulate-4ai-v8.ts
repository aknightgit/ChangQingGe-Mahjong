/**
 * 4AI 完整游戏模拟器 v8
 * Phase 1 修复：
 * 1. 杠牌逻辑（暗杠/明杠 + 岭上补牌）
 * 2. 胡牌优先级（离出牌者最近优先）
 * 3. 碰牌优先级（离出牌者最近优先）
 * 4. 听牌状态追踪（影响吃牌决策）
 * 5. 花牌补牌后重新检查胡牌
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createDeck, shuffleTiles, isFlower, groupTiles } from '../server/utils/tiles';
import { Tile, TileSuit, MeldType, ActionType, type Meld, type Player, type GameState } from '../server/types/game';
import { canWin, findBestDiscardForTing, checkChowPongExclusion, updateChowPongExclusion, HandType, ChowPongExclusionState } from '../server/utils/handValidator';
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
  isTing: boolean;
}

// ========== Deal ==========
function dealTiles(): { hands: Tile[][]; wall: Tile[]; flowers: Tile[][]; wildTileId: string | null } {
  const deck = createDeck();
  const shuffled = shuffleTiles(deck);
  
  const hands: Tile[][] = [[], [], [], []];
  const flowers: Tile[][] = [[], [], [], []];
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
  
  const wall = shuffled.slice(idx);
  const nonFlowerPool = shuffled.filter(t => !isFlower(t));
  const wildSource = nonFlowerPool.length > 0
    ? nonFlowerPool[Math.floor(Math.random() * nonFlowerPool.length)]
    : null;
  const wildTileId = wildSource ? `${wildSource.suit}-${wildSource.value}` : null;
  return { hands, wall, flowers, wildTileId };
}

// ========== Win check ==========
function checkWin(hand: Tile[], exposed: Meld[], wildTileId: string | null = null): { canWin: boolean; types: HandType[] } {
  return canWin(hand, exposed, wildTileId);
}

// ========== Ting check ==========
function checkTing(hand: Tile[], exposed: Meld[], wildTileId: string | null = null): boolean {
  // 听牌：打任意一张后，存在任意进张可胡
  for (let i = 0; i < hand.length; i++) {
    const remaining = [...hand.slice(0, i), ...hand.slice(i + 1)];
    const result = findBestDiscardForTing(remaining, exposed.length, wildTileId as any);
    if (result.isTing) return true;
  }
  return false;
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

// ========== Kong (杠) ==========
function canAnGang(hand: Tile[]): Tile | null {
  // 暗杠：手牌有4张相同的牌
  const countMap = new Map<string, Tile>();
  for (const t of hand) {
    const key = `${t.suit}-${t.value}`;
    const existing = countMap.get(key);
    if (existing) {
      // 检查是否已有4张
      let count = 0;
      for (const h of hand) { if (tilesEqual(h, existing)) count++; }
      if (count >= 4) return existing;
    } else {
      countMap.set(key, t);
    }
  }
  // 重新计数
  const counts = new Map<string, number>();
  for (const t of hand) {
    const key = `${t.suit}-${t.value}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  for (const [key, cnt] of counts) {
    if (cnt >= 4) {
      const parts = key.split('-');
      return { suit: parts[0] as TileSuit, value: parseInt(parts[1]), id: `${key}-ag`, isFlower: false };
    }
  }
  return null;
}

function canMingGang(hand: Tile[], discarded: Tile): boolean {
  // 明杠：手牌有3张相同的牌 + 别人打出第4张
  let count = 0;
  for (const t of hand) { if (tilesEqual(t, discarded)) count++; }
  return count >= 3;
}

function doAnGang(hand: Tile[], tile: Tile): { hand: Tile[]; meld: Meld } {
  const newHand = [...hand];
  let removed = 0;
  for (let i = newHand.length - 1; i >= 0 && removed < 4; i--) {
    if (tilesEqual(newHand[i], tile)) { newHand.splice(i, 1); removed++; }
  }
  const meld: Meld = {
    type: MeldType.KONG,
    tiles: [
      { ...tile, id: `${tile.suit}-${tile.value}-k1` },
      { ...tile, id: `${tile.suit}-${tile.value}-k2` },
      { ...tile, id: `${tile.suit}-${tile.value}-k3` },
      { ...tile, id: `${tile.suit}-${tile.value}-k4` },
    ],
    isConcealed: true,
  };
  return { hand: newHand, meld };
}

function doMingGang(hand: Tile[], discarded: Tile): { hand: Tile[]; meld: Meld } {
  const newHand = [...hand];
  let removed = 0;
  for (let i = newHand.length - 1; i >= 0 && removed < 3; i--) {
    if (tilesEqual(newHand[i], discarded)) { newHand.splice(i, 1); removed++; }
  }
  const meld: Meld = {
    type: MeldType.KONG,
    tiles: [
      { ...discarded, id: `${discarded.suit}-${discarded.value}-k1` },
      { ...discarded, id: `${discarded.suit}-${discarded.value}-k2` },
      { ...discarded, id: `${discarded.suit}-${discarded.value}-k3` },
      { ...discarded, id: `${discarded.suit}-${discarded.value}-k4` },
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

  const has = (value: number) => groups.has(`${suit}-${value}`);
  return (has(v - 2) && has(v - 1)) || (has(v - 1) && has(v + 1)) || (has(v + 1) && has(v + 2));
}

function doChow(hand: Tile[], discarded: Tile): { hand: Tile[]; meld: Meld } | null {
  if (isHonor(discarded)) return null;
  const v = discarded.value;
  const suit = discarded.suit;

  const patterns: [number, number][] = [
    [v - 2, v - 1],
    [v - 1, v + 1],
    [v + 1, v + 2],
  ];

  for (const [a, b] of patterns) {
    const idxA = hand.findIndex(t => t.suit === suit && t.value === a);
    const idxB = hand.findIndex((t, i) => i !== idxA && t.suit === suit && t.value === b);
    if (idxA >= 0 && idxB >= 0) {
      const newHand = [...hand];
      const i1 = Math.max(idxA, idxB);
      const i2 = Math.min(idxA, idxB);
      const t1 = newHand[i1];
      const t2 = newHand[i2];
      newHand.splice(i1, 1);
      newHand.splice(i2, 1);

      const meldTiles = [
        { ...discarded, id: `${discarded.suit}-${discarded.value}-c0` },
        { ...t1, id: `${t1.suit}-${t1.value}-c1` },
        { ...t2, id: `${t2.suit}-${t2.value}-c2` },
      ].sort((x, y) => x.value - y.value);

      const meld: Meld = {
        type: MeldType.SEQUENCE,
        tiles: meldTiles,
        isConcealed: false,
      };

      return { hand: newHand, meld };
    }
  }

  return null;
}

// ========== Create bot objects ==========
function createBotPlayer(p: SimPlayer, idx: number): Player {
  return {
    id: `bot-${idx}`,
    name: p.name,
    position: idx,
    hand: { concealedTiles: p.hand, exposedMelds: p.exposed, flowerTiles: p.flowers },
    score: p.score,
    isTing: p.isTing,
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
    chowPongExclusion: Object.fromEntries(players.map((p, i) => [`bot-${i}`, p.chowPongExclusion])) as any,
    pendingActions,
  } as GameState;
}

// ========== Get players in priority order (closest to discarder first, counter-clockwise) ==========
function getPriorityOrder(discarderIdx: number): number[] {
  // 逆时针：discarder+1, discarder+2, discarder+3
  return [
    (discarderIdx + 1) % 4,
    (discarderIdx + 2) % 4,
    (discarderIdx + 3) % 4,
  ];
}

// ========== Main game loop ==========
function drawNonFlower(wall: Tile[], wallIdx: number, player: SimPlayer): { tile: Tile | null; wallIdx: number } {
  while (wallIdx < wall.length) {
    const drawn = wall[wallIdx++];
    if (isFlower(drawn)) {
      player.flowers.push(drawn);
      continue;
    }
    return { tile: drawn, wallIdx };
  }
  return { tile: null, wallIdx };
}

function playOneGame(): { winner: string | null; winTypes: HandType[]; score: number } {
  const { hands, wall, flowers, wildTileId } = dealTiles();
  
  const players: SimPlayer[] = AI_NAMES.map((name, i) => ({
    name,
    hand: hands[i],
    exposed: [],
    flowers: flowers[i],
    score: 0,
    wins: 0,
    chowPongExclusion: { firstActionSuit: null, firstActionType: null },
    isTing: false,
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
    
    // Draw tile（连续补花直到非花）
    {
      const draw = drawNonFlower(wall, wallIdx, player);
      wallIdx = draw.wallIdx;
      if (!draw.tile) break;
      player.hand.push(draw.tile);
    }
    
    // Check win after draw (自摸)
    const winResult = checkWin(player.hand, player.exposed, wildTileId);
    if (winResult.canWin) {
      return { winner: player.name, winTypes: winResult.types, score: 1 };
    }
    
    // Check 暗杠 (before discard)
    const anGangTile = canAnGang(player.hand);
    if (anGangTile && player.exposed.length < 4) {
      // 用 botService 决定是否杠
      const botPlayer = createBotPlayer(player, currentPlayer);
      const botGame = createBotGame(players, wallIdx, currentPlayer, [{
        playerId: `bot-${currentPlayer}`,
        tile: anGangTile,
        availableActions: ['ANGANG'],
      }]);
      const gangAction = shouldClaimPendingAction(botPlayer, [ActionType.KONG, ActionType.PASS], botGame);
      if (gangAction === 'kong') {
        const gangResult = doAnGang(player.hand, anGangTile);
        player.hand = gangResult.hand;
        player.exposed.push(gangResult.meld);
        // 岭上补牌（连续补花）
        const kongDraw = drawNonFlower(wall, wallIdx, player);
        wallIdx = kongDraw.wallIdx;
        if (kongDraw.tile) {
          player.hand.push(kongDraw.tile);
          // 岭上开花：补牌后检查胡牌
          const kongWinResult = checkWin(player.hand, player.exposed, wildTileId);
          if (kongWinResult.canWin) {
            return { winner: player.name, winTypes: kongWinResult.types, score: 1 };
          }
        }
        // 杠后继续出牌
      }
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
    
    // ========== Check ALL players for actions on discard ==========
    let actionTaken = false;
    
    // 1. Check win on discard (捉冲) - priority order: closest first
    const winOrder = getPriorityOrder(currentPlayer);
    for (const p of winOrder) {
      const pPlayer = players[p];
      const tempHand = [...pPlayer.hand, lastDiscard!];
      const discardWin = checkWin(tempHand, pPlayer.exposed, wildTileId);
      if (discardWin.canWin) {
        return { winner: pPlayer.name, winTypes: discardWin.types, score: 1 };
      }
    }
    
    // 2. Check 明杠 - priority order
    for (const p of winOrder) {
      const pPlayer = players[p];
      if (lastDiscard && canMingGang(pPlayer.hand, lastDiscard) && pPlayer.exposed.length < 4) {
        const gangPlayer = createBotPlayer(pPlayer, p);
        const gangGame = createBotGame(players, wallIdx, p, [{
          playerId: `bot-${p}`,
          tile: lastDiscard,
          availableActions: ['MINGGANG'],
        }]);
        const gangAction = shouldClaimPendingAction(gangPlayer, [ActionType.KONG, ActionType.PASS], gangGame);
        if (gangAction === 'kong') {
          const gangResult = doMingGang(pPlayer.hand, lastDiscard);
          pPlayer.hand = gangResult.hand;
          pPlayer.exposed.push(gangResult.meld);
          // 岭上补牌（连续补花）
          const kongDraw = drawNonFlower(wall, wallIdx, pPlayer);
          wallIdx = kongDraw.wallIdx;
          if (kongDraw.tile) {
            pPlayer.hand.push(kongDraw.tile);
            const kongWinResult = checkWin(pPlayer.hand, pPlayer.exposed, wildTileId);
            if (kongWinResult.canWin) {
              return { winner: pPlayer.name, winTypes: kongWinResult.types, score: 1 };
            }
          }
          lastDiscard = null;
          currentPlayer = p;
          actionTaken = true;
          break;
        }
      }
    }
    
    if (actionTaken) continue;
    
    // 3. Check peng - priority order
    for (const p of winOrder) {
      const pPlayer = players[p];
      if (lastDiscard && canPeng(pPlayer.hand, lastDiscard)) {
        if (checkChowPongExclusion(pPlayer.chowPongExclusion, 'pong', lastDiscard.suit)) {
          const pengPlayer = createBotPlayer(pPlayer, p);
          const pengGame = createBotGame(players, wallIdx, p, [{
            playerId: `bot-${p}`,
            tile: lastDiscard,
            availableActions: ['PENG'],
          }]);
          
          const action = shouldClaimPendingAction(pengPlayer, ['peng', 'pass'], pengGame);
          if (action?.toLowerCase() === 'peng') {
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
    
    // 4. Check chow (only next player)
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
        
        const action = shouldClaimPendingAction(chowPlayer, ['chow', 'pass'], chowGame);
        if (action?.toLowerCase() === 'chow') {
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
    
    // Update ting status for all players
    for (let p = 0; p < 4; p++) {
      players[p].isTing = checkTing(players[p].hand, players[p].exposed, wildTileId);
    }
    
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
  
  console.log(`=== 4AI 完整游戏模拟器 v8 ===`);
  console.log(` rounds=${rounds}, gamesPerRound=${gamesPerRound}\n`);
  
  const outputDir = path.join(__dirname, '../training-output/sim-4ai-v8');
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
    
    const outputFile = path.join(outputDir, `round-${round}-sim-4ai-v8.json`);
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
  
  const summaryFile = path.join(outputDir, 'summary-sim-4ai-v8.json');
  fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
  console.log(`\n汇总: ${summaryFile}`);
}

main().catch(console.error);
