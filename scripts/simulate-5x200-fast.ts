/**
 * 4AI 快速模拟器 - 5轮×200局
 * 基于 simulate-4ai-v8.ts，保留完整游戏逻辑但优化统计记录
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
const NUM_ROUNDS = 5;
const GAMES_PER_ROUND = 200;
const OUTPUT_FILE = '/home/node/.openclaw/workspace/memory/sim-5x200-result.json';

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
      if (isFlower(tile)) { flowers[p].push(tile); }
      else { hands[p].push(tile); }
    }
  }
  const wall = shuffled.slice(idx);
  const nonFlowerPool = shuffled.filter(t => !isFlower(t));
  const wildSource = nonFlowerPool.length > 0 ? nonFlowerPool[Math.floor(Math.random() * nonFlowerPool.length)] : null;
  const wildTileId = wildSource ? `${wildSource.suit}-${wildSource.value}` : null;
  return { hands, wall, flowers, wildTileId };
}

// ========== Win check ==========
function checkWin(hand: Tile[], exposed: Meld[], wildTileId: string | null = null): { canWin: boolean; types: HandType[] } {
  return canWin(hand, exposed, wildTileId);
}

// ========== Ting check ==========
function checkTing(hand: Tile[], exposed: Meld[], wildTileId: string | null = null): boolean {
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
      newHand.splice(i1, 1);
      newHand.splice(i2, 1);
      const t1 = hand[idxA], t2 = hand[idxB];
      const meldTiles = [
        { ...discarded, id: `${discarded.suit}-${discarded.value}-c0` },
        { ...t1, id: `${t1.suit}-${t1.value}-c1` },
        { ...t2, id: `${t2.suit}-${t2.value}-c2` },
      ].sort((x, y) => x.value - y.value);
      const meld: Meld = { type: MeldType.SEQUENCE, tiles: meldTiles, isConcealed: false };
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

// ========== Priority order ==========
function getPriorityOrder(discarderIdx: number): number[] {
  return [(discarderIdx + 1) % 4, (discarderIdx + 2) % 4, (discarderIdx + 3) % 4];
}

// ========== Draw non-flower ==========
function drawNonFlower(wall: Tile[], wallIdx: number, player: SimPlayer): { tile: Tile | null; wallIdx: number } {
  while (wallIdx < wall.length) {
    const drawn = wall[wallIdx++];
    if (isFlower(drawn)) { player.flowers.push(drawn); continue; }
    return { tile: drawn, wallIdx };
  }
  return { tile: null, wallIdx };
}

// ========== Simple shanten (no wild tile) ==========
function calcShantenSimple(hand: Tile[], exposedCount: number): number {
  const expectedWinLen = 14 - exposedCount * 3;
  const needDraws = Math.max(0, expectedWinLen - hand.length);
  for (let drawCount = needDraws; drawCount <= 8; drawCount++) {
    if (drawCount === 0) {
      if (canWin(hand, exposedCount, () => false).canWin) return 0;
      continue;
    }
    const placeholders: Tile[] = [];
    for (let i = 0; i < drawCount; i++) {
      placeholders.push({ suit: TileSuit.DOTS, value: 1, id: `sh-ph-${i}`, isFlower: false });
    }
    if (canWin([...hand, ...placeholders], exposedCount, () => false).canWin) return drawCount - 1;
  }
  return 8;
}

// ========== Quick result return helper ==========
function makeResult(winner: string | null, winTypes: HandType[], pengCount: number, chowCount: number, kongCount: number, anGangCount: number, shantenSums: number[], shantenCount: number[], firstTingTurn: number[]) {
  const avgShanten = shantenSums.map((s, i) => shantenCount[i] > 0 ? s / shantenCount[i] : 0);
  const validTing = firstTingTurn.filter(t => t > 0);
  const avgTingTurn = validTing.length > 0 ? validTing.reduce((a, b) => a + b, 0) / validTing.length : null;
  return { winner, winTypes, score: winner ? 1 : 0, pengCount, chowCount, kongCount, anGangCount, shantenAvg: avgShanten, avgTingTurn };
}

// ========== Main game loop ==========
function playOneGame(): ReturnType<typeof makeResult> {
  const { hands, wall, flowers, wildTileId } = dealTiles();
  const players: SimPlayer[] = AI_NAMES.map((name, i) => ({
    name, hand: hands[i], exposed: [], flowers: flowers[i],
    score: 0, wins: 0,
    chowPongExclusion: { firstActionSuit: null, firstActionType: null },
    isTing: false,
  }));
  let wallIdx = 0;
  let currentPlayer = 0;
  let lastDiscard: Tile | null = null;
  const maxTurns = 300;
  let turn = 0;
  let pengCount = 0, chowCount = 0, kongCount = 0, anGangCount = 0;
  const shantenSums = [0, 0, 0, 0];
  const shantenCount = [0, 0, 0, 0];
  const firstTingTurn = [-1, -1, -1, -1];

  while (turn < maxTurns) {
    turn++;
    const player = players[currentPlayer];
    const draw = drawNonFlower(wall, wallIdx, player);
    wallIdx = draw.wallIdx;
    if (!draw.tile) break;
    player.hand.push(draw.tile);

    const winResult = checkWin(player.hand, player.exposed, wildTileId);
    if (winResult.canWin) return makeResult(player.name, winResult.types, pengCount, chowCount, kongCount, anGangCount, shantenSums, shantenCount, firstTingTurn);

    const anGangTile = canAnGang(player.hand);
    if (anGangTile && player.exposed.length < 4) {
      const botPlayer = createBotPlayer(player, currentPlayer);
      const botGame = createBotGame(players, wallIdx, currentPlayer, [{ playerId: `bot-${currentPlayer}`, tile: anGangTile, availableActions: ['ANGANG'] }]);
      const gangAction = shouldClaimPendingAction(botPlayer, [ActionType.KONG, ActionType.PASS], botGame);
      if (gangAction === 'kong') {
        const gangResult = doAnGang(player.hand, anGangTile);
        player.hand = gangResult.hand;
        player.exposed.push(gangResult.meld);
        anGangCount++;
        const kongDraw = drawNonFlower(wall, wallIdx, player);
        wallIdx = kongDraw.wallIdx;
        if (kongDraw.tile) {
          player.hand.push(kongDraw.tile);
          const kongWinResult = checkWin(player.hand, player.exposed, wildTileId);
          if (kongWinResult.canWin) return makeResult(player.name, kongWinResult.types, pengCount, chowCount, kongCount, anGangCount, shantenSums, shantenCount, firstTingTurn);
        }
      }
    }

    const botPlayer = createBotPlayer(player, currentPlayer);
    const botGame = createBotGame(players, wallIdx, currentPlayer, []);
    const discardId = selectDiscardTile(botPlayer, botGame);
    if (!discardId) break;
    const discardIdx = player.hand.findIndex(t => t.id === discardId);
    if (discardIdx >= 0) lastDiscard = player.hand.splice(discardIdx, 1)[0];
    else {
      const parts = discardId.split('-');
      const suit = parts.slice(0, -1).join('-');
      const value = parseInt(parts[parts.length - 1]);
      const fallbackIdx = player.hand.findIndex(t => t.suit === suit && t.value === value);
      if (fallbackIdx >= 0) lastDiscard = player.hand.splice(fallbackIdx, 1)[0];
      else break;
    }

    let actionTaken = false;
    const winOrder = getPriorityOrder(currentPlayer);
    for (const p of winOrder) {
      const pPlayer = players[p];
      const discardWin = checkWin([...pPlayer.hand, lastDiscard!], pPlayer.exposed, wildTileId);
      if (discardWin.canWin) return makeResult(pPlayer.name, discardWin.types, pengCount, chowCount, kongCount, anGangCount, shantenSums, shantenCount, firstTingTurn);
    }

    for (const p of winOrder) {
      const pPlayer = players[p];
      if (lastDiscard && canMingGang(pPlayer.hand, lastDiscard) && pPlayer.exposed.length < 4) {
        const gangPlayer = createBotPlayer(pPlayer, p);
        const gangGame = createBotGame(players, wallIdx, p, [{ playerId: `bot-${p}`, tile: lastDiscard, availableActions: ['MINGGANG'] }]);
        const gangAction = shouldClaimPendingAction(gangPlayer, [ActionType.KONG, ActionType.PASS], gangGame);
        if (gangAction === 'kong') {
          const gangResult = doMingGang(pPlayer.hand, lastDiscard);
          pPlayer.hand = gangResult.hand;
          pPlayer.exposed.push(gangResult.meld);
          kongCount++;
          const kongDraw = drawNonFlower(wall, wallIdx, pPlayer);
          wallIdx = kongDraw.wallIdx;
          if (kongDraw.tile) {
            pPlayer.hand.push(kongDraw.tile);
            const kongWinResult = checkWin(pPlayer.hand, pPlayer.exposed, wildTileId);
            if (kongWinResult.canWin) return makeResult(pPlayer.name, kongWinResult.types, pengCount, chowCount, kongCount, anGangCount, shantenSums, shantenCount, firstTingTurn);
          }
          lastDiscard = null;
          currentPlayer = p;
          actionTaken = true;
          break;
        }
      }
    }
    if (actionTaken) continue;

    for (const p of winOrder) {
      const pPlayer = players[p];
      if (lastDiscard && canPeng(pPlayer.hand, lastDiscard)) {
        if (checkChowPongExclusion(pPlayer.chowPongExclusion, 'pong', lastDiscard.suit)) {
          const pengPlayer = createBotPlayer(pPlayer, p);
          const pengGame = createBotGame(players, wallIdx, p, [{ playerId: `bot-${p}`, tile: lastDiscard, availableActions: ['PENG'] }]);
          const action = shouldClaimPendingAction(pengPlayer, ['peng', 'pass'], pengGame);
          if (action?.toLowerCase() === 'peng') {
            const pengResult = doPeng(pPlayer.hand, lastDiscard);
            pPlayer.hand = pengResult.hand;
            pPlayer.exposed.push(pengResult.meld);
            pPlayer.chowPongExclusion = updateChowPongExclusion(pPlayer.chowPongExclusion, 'pong', lastDiscard.suit);
            pengCount++;
            lastDiscard = null;
            currentPlayer = p;
            actionTaken = true;
            break;
          }
        }
      }
    }
    if (actionTaken) continue;

    const nextPlayer = (currentPlayer + 1) % 4;
    const nextP = players[nextPlayer];
    if (lastDiscard && canChow(nextP.hand, lastDiscard)) {
      if (checkChowPongExclusion(nextP.chowPongExclusion, 'chow', lastDiscard.suit)) {
        const chowPlayer = createBotPlayer(nextP, nextPlayer);
        const chowGame = createBotGame(players, wallIdx, nextPlayer, [{ playerId: `bot-${nextPlayer}`, tile: lastDiscard, availableActions: ['CHOW'] }]);
        const action = shouldClaimPendingAction(chowPlayer, ['chow', 'pass'], chowGame);
        if (action?.toLowerCase() === 'chow') {
          const chowResult = doChow(nextP.hand, lastDiscard);
          if (chowResult) {
            nextP.hand = chowResult.hand;
            nextP.exposed.push(chowResult.meld);
            nextP.chowPongExclusion = updateChowPongExclusion(nextP.chowPongExclusion, 'chow', lastDiscard.suit);
            chowCount++;
            lastDiscard = null;
            currentPlayer = nextPlayer;
            actionTaken = true;
          }
        }
      }
    }
    if (actionTaken) continue;

    for (let p = 0; p < 4; p++) {
      const s = calcShantenSimple(players[p].hand, players[p].exposed.length);
      shantenSums[p] += s;
      shantenCount[p]++;
      players[p].isTing = checkTing(players[p].hand, players[p].exposed, wildTileId);
      if (players[p].isTing && firstTingTurn[p] === -1) firstTingTurn[p] = turn;
    }
    currentPlayer = (currentPlayer + 1) % 4;
  }

  return makeResult(null, [], pengCount, chowCount, kongCount, anGangCount, shantenSums, shantenCount, firstTingTurn);
}

// ========== Main ==========
async function main() {
  console.log(`=== 4AI 模拟器 | 5轮×200局 ===`);
  console.log(`Policy 路径: AI_policies/characters/ (最新)\n`);

  const outDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const allRoundStats: any[] = [];

  for (let round = 1; round <= NUM_ROUNDS; round++) {
    const startTime = Date.now();
    console.log(`\n========== 轮次 ${round}/${NUM_ROUNDS} ==========`);

    const stats = {
      totalGames: 0, wins: 0, draws: 0,
      winTypes: {} as Record<string, number>,
      playerWins: {} as Record<string, number>,
      totalPeng: 0, totalChow: 0, totalMingKong: 0, totalAnKong: 0,
      shantenSums: [0, 0, 0, 0], shantenCount: [0, 0, 0, 0],
      firstTingTurnSum: 0, firstTingTurnCount: 0,
    };

    for (let game = 0; game < GAMES_PER_ROUND; game++) {
      stats.totalGames++;
      const result = playOneGame();

      stats.totalPeng += result.pengCount;
      stats.totalChow += result.chowCount;
      stats.totalMingKong += result.kongCount;
      stats.totalAnKong += result.anGangCount;

      for (let i = 0; i < 4; i++) {
        stats.shantenSums[i] += result.shantenAvg[i];
        stats.shantenCount[i]++;
      }
      if (result.avgTingTurn !== null) {
        stats.firstTingTurnSum += result.avgTingTurn;
        stats.firstTingTurnCount++;
      }

      if (result.winner) {
        stats.wins++;
        stats.playerWins[result.winner] = (stats.playerWins[result.winner] || 0) + 1;
        for (const t of result.winTypes) stats.winTypes[t] = (stats.winTypes[t] || 0) + 1;
      } else {
        stats.draws++;
      }

      if ((game + 1) % 50 === 0) {
        process.stdout.write(`  [${round}/${NUM_ROUNDS}] ${game + 1}/${GAMES_PER_ROUND} 完成\n`);
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const shantenDist = AI_NAMES.reduce((acc, name, idx) => {
      acc[name] = stats.shantenCount[idx] > 0 ? Number((stats.shantenSums[idx] / stats.shantenCount[idx]).toFixed(3)) : 0;
      return acc;
    }, {} as Record<string, number>);
    const avgFirstTingTurn = stats.firstTingTurnCount > 0
      ? Number((stats.firstTingTurnSum / stats.firstTingTurnCount).toFixed(3)) : null;

    const roundReport = {
      round,
      totalGames: stats.totalGames,
      wins: stats.wins,
      draws: stats.draws,
      winRate: `${((stats.wins / stats.totalGames) * 100).toFixed(1)}%`,
      drawRate: `${((stats.draws / stats.totalGames) * 100).toFixed(1)}%`,
      winTypes: stats.winTypes,
      playerWins: stats.playerWins,
      claimStats: {
        totalPeng: stats.totalPeng,
        totalChow: stats.totalChow,
        totalMingKong: stats.totalMingKong,
        totalAnKong: stats.totalAnKong,
        avgPengPerGame: Number((stats.totalPeng / stats.totalGames).toFixed(2)),
        avgChowPerGame: Number((stats.totalChow / stats.totalGames).toFixed(2)),
        avgKongPerGame: Number(((stats.totalMingKong + stats.totalAnKong) / stats.totalGames).toFixed(2)),
      },
      calibrationMetrics: {
        shantenDistribution: shantenDist,
        avgFirstTingTurn,
      },
      elapsedSeconds: Number(elapsed),
    };

    console.log(`  ✓ 轮次 ${round} 完成 (${elapsed}s) | 胡 ${stats.wins} | 流局 ${stats.draws} | ${stats.wins + stats.draws}/${stats.totalGames}`);
    console.log(`  各AI胡牌: ${JSON.stringify(stats.playerWins)}`);
    console.log(`  各牌型: ${JSON.stringify(stats.winTypes)}`);
    console.log(`  吃碰杠: 碰=${stats.totalPeng}, 吃=${stats.totalChow}, 明杠=${stats.totalMingKong}, 暗杠=${stats.totalAnKong}`);
    console.log(`  平均向听: ${JSON.stringify(shantenDist)} | 平均首听回合: ${avgFirstTingTurn}`);

    allRoundStats.push(roundReport);
  }

  // ========== Summary ==========
  const totalGames = allRoundStats.reduce((s, r) => s + r.totalGames, 0);
  const totalWins = allRoundStats.reduce((s, r) => s + r.wins, 0);
  const totalDraws = allRoundStats.reduce((s, r) => s + r.draws, 0);
  const totalPeng = allRoundStats.reduce((s, r) => s + r.claimStats.totalPeng, 0);
  const totalChow = allRoundStats.reduce((s, r) => s + r.claimStats.totalChow, 0);
  const totalMingKong = allRoundStats.reduce((s, r) => s + r.claimStats.totalMingKong, 0);
  const totalAnKong = allRoundStats.reduce((s, r) => s + r.claimStats.totalAnKong, 0);

  const allWinTypes: Record<string, number> = {};
  const allPlayerWins: Record<string, number> = {};
  for (const r of allRoundStats) {
    for (const [k, v] of Object.entries(r.winTypes)) allWinTypes[k] = (allWinTypes[k] || 0) + (v as number);
    for (const [k, v] of Object.entries(r.playerWins)) allPlayerWins[k] = (allPlayerWins[k] || 0) + (v as number);
  }

  const totalShantens = [0, 0, 0, 0];
  let totalShCount = 0;
  let totalTingSum = 0;
  let totalTingCount = 0;
  for (const r of allRoundStats) {
    for (let i = 0; i < 4; i++) totalShantens[i] += r.calibrationMetrics.shantenDistribution[AI_NAMES[i]] * GAMES_PER_ROUND;
    totalShCount += GAMES_PER_ROUND;
    if (r.calibrationMetrics.avgFirstTingTurn !== null) {
      totalTingSum += r.calibrationMetrics.avgFirstTingTurn * GAMES_PER_ROUND;
      totalTingCount += GAMES_PER_ROUND;
    }
  }
  const finalShanten = AI_NAMES.reduce((acc, name, idx) => {
    acc[name] = totalShCount > 0 ? Number((totalShantens[idx] / totalShCount).toFixed(3)) : 0;
    return acc;
  }, {} as Record<string, number>);
  const finalAvgTingTurn = totalTingCount > 0 ? Number((totalTingSum / totalTingCount).toFixed(3)) : null;

  const summary = {
    timestamp: new Date().toISOString(),
    config: { numRounds: NUM_ROUNDS, gamesPerRound: GAMES_PER_ROUND, totalGames, policyDir: 'AI_policies/characters/' },
    totalGames, wins: totalWins, draws: totalDraws,
    overallWinRate: `${((totalWins / totalGames) * 100).toFixed(1)}%`,
    overallDrawRate: `${((totalDraws / totalGames) * 100).toFixed(1)}%`,
    winTypes: allWinTypes,
    playerWins: allPlayerWins,
    claimStats: {
      totalPeng, totalChow, totalMingKong, totalAnKong,
      avgPengPerGame: Number((totalPeng / totalGames).toFixed(2)),
      avgChowPerGame: Number((totalChow / totalGames).toFixed(2)),
      avgKongPerGame: Number(((totalMingKong + totalAnKong) / totalGames).toFixed(2)),
    },
    calibrationMetrics: {
      shantenDistribution: finalShanten,
      avgFirstTingTurn: finalAvgTingTurn,
    },
    rounds: allRoundStats,
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(summary, null, 2));
  console.log(`\n========== 汇总 ==========`);
  console.log(`总游戏: ${totalGames} | 胡牌: ${totalWins} (${summary.overallWinRate}) | 流局: ${totalDraws} (${summary.overallDrawRate})`);
  console.log(`各AI胡牌: ${JSON.stringify(allPlayerWins)}`);
  console.log(`各牌型: ${JSON.stringify(allWinTypes)}`);
  console.log(`吃碰杠: 碰=${totalPeng}, 吃=${totalChow}, 明杠=${totalMingKong}, 暗杠=${totalAnKong}`);
  console.log(`平均向听: ${JSON.stringify(finalShanten)}`);
  console.log(`平均首听回合: ${finalAvgTingTurn}`);
  console.log(`\n结果已保存: ${OUTPUT_FILE}`);
}

main().catch(console.error);
