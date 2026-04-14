/**
 * 长清阁麻将 - 极端参数测试 (100局)
 *
 * 目标：配置4个AI使用极端参数，测试极限胡牌/吃/碰行为
 * 极端参数：
 *   - chowChance = 1.0 (有吃必吃)
 *   - pengChance = 1.0 (有碰必碰)
 *   - kongChance = 1.0 (有杠必杠)
 *   - selfWinChance = 1.0 (有胡必胡)
 *   - wildKeepPenalty = 0 (随意丢百搭)
 *   - discardHuChance = 0 (不弃胡)
 *   - hesitationWindow = 100ms (快速决策)
 *
 * 用法：
 *   npx tsx extreme-test-100.ts
 */

import { randomUUID } from 'crypto';
import { Tile, TileSuit, MeldType, ActionType, PlayerStatus, GamePhase, GameEndReason } from './server/types/game';
import { createDeck, shuffleTiles, sortTiles, isFlower, tilesEqual, groupTiles, findTileById, removeTile, getTileDisplayName } from './server/utils/tiles';
import { canWin, detectHandTypes, buildWildTileChecker } from './server/utils/handValidator';
import { calculateScore } from './server/utils/scoring';

// ===== Extreme Policy (always claim everything) =====
const EXTREME_POLICY = {
  id: 'extreme',
  selfWinChance: 1.0,
  discardHuChance: 0.0,
  discardHuWildPenalty: 0.0,
  discardHuMenQingPenalty: 0.0,
  pengChance: 1.0,
  kongChance: 1.0,
  chowChance: 1.0,
  chowWildPenalty: 0.0,
  wildKeepPenalty: 0,
  dominantSuitBonus: 3.0,
  tripletKeepBonus: 1.0,
  pairWeight: 8.0,
  nearWeight: 0.8,
  honorPairBonus: 0,
  honorRushThreshold: 8,
  honorRushBoost: 0.2,
  bailoutHuPenaltyPerMeld: 0.01,
};

// ===== Simplified game simulation (no MongoDB/Redis needed) =====

interface SimplePlayer {
  id: string;
  name: string;
  position: number;
  hand: Tile[];
  melds: MeldType[];
  meldTiles: Tile[][];  // actual tiles in each meld
  flowers: Tile[];
  status: 'playing' | 'won' | 'lost';
  score: number;
  // Exposed melds tracking for canWin
  exposedMelds: MeldType[];
}

interface SimpleGame {
  gameId: string;
  wall: Tile[];
  players: SimplePlayer[];
  currentPlayerIndex: number;
  discardPile: Tile[];
  wildTileId: string;
  wildGroup: string[] | null;
  wildSuit: TileSuit;
  wildValue: number;
  // Mutual bailout tracking: gameId -> playerIdx -> sourceIdx -> count
  bailout: Map<string, Map<string, number>>;
  rounds: number;
  reason: string;
  // Stats
  chowCount: number;
  pengCount: number;
  kongCount: number;
  huCount: number;
  selfHuCount: number;
  discardHuCount: number;
  drawCount: number;
  handTypeStats: Map<string, number>;  // handType -> count
  winnerStats: Map<string, number>;     // playerName -> win count
  pointsByPlayer: Map<string, number>;   // playerName -> total points
}

type WinMode = '自摸' | '放冲' | '抢杠';

interface WinDetail {
  name: string;
  winMode: WinMode;
  handType: string;
  baseFan: number;
  finalPoints: number;
  handTiles: string[];
  from?: string;
}

function pickWild(): { wildTileId: string; wildGroup: string[] | null; wildSuit: TileSuit; wildValue: number } {
  const allTypes: Array<{ suit: TileSuit; value: number }> = [];
  for (const suit of [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS]) {
    for (let v = 1; v <= 9; v++) allTypes.push({ suit, value: v });
  }
  for (let v = 1; v <= 4; v++) allTypes.push({ suit: TileSuit.WIND, value: v });
  for (let v = 1; v <= 3; v++) allTypes.push({ suit: TileSuit.DRAGON, value: v });
  for (let v = 1; v <= 8; v++) allTypes.push({ suit: TileSuit.FLOWER, value: v });

  const t = allTypes[Math.floor(Math.random() * allTypes.length)]!;
  const wildTileId = `${t.suit}-${t.value}`;
  let wildGroup: string[] | null = null;
  if (t.suit === TileSuit.FLOWER) {
    wildGroup = t.value <= 4 ? ['1', '2', '3', '4'] : ['5', '6', '7', '8'];
  }
  return { wildTileId, wildGroup, wildSuit: t.suit, wildValue: t.value };
}

function isWildTile(tile: Tile, game: SimpleGame): boolean {
  if (tile.suit === game.wildSuit && tile.value === game.wildValue) return true;
  if (tile.suit === TileSuit.FLOWER && game.wildSuit === TileSuit.FLOWER && game.wildGroup) {
    return game.wildGroup.includes(String(tile.value));
  }
  return false;
}

function isWildTileFn(wildTileId: string, wildGroup: string[] | null): (tile: Tile) => boolean {
  return (tile: Tile) => {
    const parts = wildTileId.split('-');
    if (parts.length < 2) return false;
    const suit = parts[0] as TileSuit;
    const value = parseInt(parts[1]);
    if (tile.suit === suit && tile.value === value) return true;
    if (tile.suit === TileSuit.FLOWER && suit === TileSuit.FLOWER && wildGroup) {
      return wildGroup.includes(String(tile.value));
    }
    return false;
  };
}

function drawTile(player: SimplePlayer, wall: Tile[], game: SimpleGame): boolean {
  while (wall.length > 0) {
    const tile = wall.pop()!;
    if (isFlower(tile)) {
      if (isWildTile(tile, game)) {
        player.hand.push(tile);
        player.hand = sortTiles(player.hand);
        return true;
      }
      player.flowers.push(tile);
      continue;
    }
    player.hand.push(tile);
    player.hand = sortTiles(player.hand);
    return true;
  }
  return false;
}

function findChowSequences(hand: Tile[], discarded: Tile, game: SimpleGame): Tile[][] {
  const numberSuits = [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS];
  if (!numberSuits.includes(discarded.suit)) return [];
  if (isWildTile(discarded, game)) return [];

  const suit = discarded.suit;
  const v = discarded.value;
  const seqs: Tile[][] = [];

  // Filter out wild tiles from hand for sequence building
  const eligibleHand = hand.filter(t => !isWildTile(t, game));

  if (v <= 7) {
    const t2 = eligibleHand.find(t => t.suit === suit && t.value === v + 1);
    const t3 = eligibleHand.find(t => t.suit === suit && t.value === v + 2);
    if (t2 && t3) seqs.push([discarded, t2, t3]);
  }

  if (v >= 2 && v <= 8) {
    const t1 = eligibleHand.find(t => t.suit === suit && t.value === v - 1);
    const t3 = eligibleHand.find(t => t.suit === suit && t.value === v + 1);
    if (t1 && t3) seqs.push([t1, discarded, t3]);
  }

  if (v >= 3) {
    const t1 = eligibleHand.find(t => t.suit === suit && t.value === v - 2);
    const t2 = eligibleHand.find(t => t.suit === suit && t.value === v - 1);
    if (t1 && t2) seqs.push([t1, t2, discarded]);
  }

  return seqs;
}

function removeTileFromHand(hand: Tile[], tile: Tile) {
  const idx = hand.findIndex(t => t.id === tile.id);
  if (idx >= 0) hand.splice(idx, 1);
}

function scoreTileForDiscard(tile: Tile, hand: Tile[], game: SimpleGame): number {
  let score = 0;

  const groups = groupTiles(hand.filter(t => !isWildTile(t, game)));
  const tileKey = `${tile.suit}-${tile.value}`;
  const sameTypeCount = groups.get(tileKey)?.length || 0;

  // Wild tile: very bad to discard (low score)
  if (isWildTile(tile, game)) {
    score -= EXTREME_POLICY.wildKeepPenalty;
    return score;
  }

  // Honor tiles
  const isHonor = tile.suit === TileSuit.WIND || tile.suit === TileSuit.DRAGON;
  if (isHonor) {
    if (sameTypeCount >= 2) {
      score -= EXTREME_POLICY.pairWeight * (EXTREME_POLICY.honorPairBonus || 0);
    } else {
      score += 5;
    }
    return score;
  }

  // Number tiles
  if (sameTypeCount >= 3) {
    score -= EXTREME_POLICY.tripletKeepBonus * 3;
  } else if (sameTypeCount >= 2) {
    score -= EXTREME_POLICY.pairWeight;
  }

  // Near sequence
  if (tile.suit !== TileSuit.FLOWER && tile.suit !== TileSuit.WIND && tile.suit !== TileSuit.DRAGON) {
    const value = tile.value;
    const suit = tile.suit;
    for (const v of [value - 1, value - 2, value + 1, value + 2]) {
      if (v >= 1 && v <= 9) {
        const key = `${suit}-${v}`;
        if (groups.has(key)) {
          score -= EXTREME_POLICY.nearWeight;
        }
      }
    }
  }

  // Dominant suit
  const suitCounts: Record<string, number> = {};
  for (const t of hand) {
    if (t.suit === TileSuit.FLOWER) continue;
    suitCounts[t.suit] = (suitCounts[t.suit] || 0) + 1;
  }
  const maxSuitCount = Math.max(...Object.values(suitCounts), 0);
  if (maxSuitCount >= EXTREME_POLICY.honorRushThreshold) {
    const dominantSuit = Object.keys(suitCounts).find(s => suitCounts[s] === maxSuitCount);
    if (dominantSuit && tile.suit !== dominantSuit && tile.suit !== TileSuit.FLOWER) {
      score += EXTREME_POLICY.dominantSuitBonus;
    }
  }

  // Edge tiles (1, 9)
  if (tile.suit !== TileSuit.FLOWER && tile.suit !== TileSuit.WIND && tile.suit !== TileSuit.DRAGON) {
    if (tile.value === 1 || tile.value === 9) {
      score += 0.5;
    }
  }

  return score;
}

function selectDiscardTile(player: SimplePlayer, game: SimpleGame): Tile {
  const hand = player.hand;
  if (hand.length === 0) return game.wall[game.wall.length - 1] || hand[0];

  let bestTile = hand[0];
  let bestScore = -Infinity;

  for (const tile of hand) {
    const score = scoreTileForDiscard(tile, hand, game);
    if (score > bestScore) {
      bestScore = score;
      bestTile = tile;
    }
  }

  return bestTile;
}

function shouldClaimHu(player: SimplePlayer, game: SimpleGame): boolean {
  // Extreme: always claim HU
  return EXTREME_POLICY.selfWinChance >= Math.random();
}

function shouldClaimPeng(player: SimplePlayer): boolean {
  return EXTREME_POLICY.pengChance >= Math.random();
}

function shouldClaimKong(player: SimplePlayer): boolean {
  return EXTREME_POLICY.kongChance >= Math.random();
}

function shouldClaimChow(player: SimplePlayer, game: SimpleGame): boolean {
  // Extreme: always claim chow if possible
  return EXTREME_POLICY.chowChance >= Math.random();
}

function nextPlaying(players: SimplePlayer[], from: number): number {
  for (let step = 1; step <= players.length; step++) {
    const i = (from + step) % players.length;
    if (players[i]?.status === 'playing') return i;
  }
  return from;
}

function addBailoutCount(bailout: Map<string, Map<string, number>>, claimer: number, source: number) {
  const c = String(claimer);
  const s = String(source);
  if (!bailout.has(c)) bailout.set(c, new Map());
  const row = bailout.get(c)!;
  row.set(s, (row.get(s) || 0) + 1);
}

function getRelationType(bailout: Map<string, Map<string, number>>, a: number, b: number): '四口' | '三口' | null {
  const aToB = bailout.get(String(a))?.get(String(b)) || 0;
  const bToA = bailout.get(String(b))?.get(String(a)) || 0;
  const mx = Math.max(aToB, bToA);
  if (mx >= 4) return '四口';
  if (mx >= 3) return '三口';
  return null;
}

function buildWinDetail(
  player: SimplePlayer,
  winMode: WinMode,
  handForCalc: Tile[],
  game: SimpleGame,
  fromIdx?: number
): { detail: WinDetail; points: number } {
  const wildChecker = isWildTileFn(game.wildTileId, game.wildGroup);
  const handTypes = detectHandTypes(
    handForCalc,
    player.exposedMelds,
    winMode === '自摸',
    player.flowers.length,
    game.wildTileId,
    game.wildGroup || undefined
  );

  const score = calculateScore({
    handTiles: handForCalc,
    exposedMelds: player.exposedMelds.map((mt, i) => ({
      type: player.melds[i],
      tiles: player.meldTiles[i],
      isConcealed: false
    })),
    flowerTiles: player.flowers,
    handTypes,
    isSelfDrawn: winMode === '自摸',
    isKongFlower: false,
    isRobbingKong: winMode === '抢杠',
    isMenQing: player.exposedMelds.every(m => m !== MeldType.SEQUENCE && m !== MeldType.TRIPLET),
    wildTileSuit: game.wildSuit,
    wildTileValue: game.wildValue,
    wildTileGroup: game.wildGroup || undefined,
    roundMultiplier: 1,
    globalMultiplier: 1
  });

  return {
    detail: {
      name: player.name,
      winMode,
      handType: score.handTypeName,
      baseFan: score.baseFan,
      finalPoints: score.finalPoints,
      handTiles: sortTiles([...handForCalc]).map(getTileDisplayName),
      from: fromIdx !== undefined ? game.players[fromIdx]?.name : undefined
    },
    points: score.finalPoints
  };
}

function simulateOneGame(gameNum: number): SimpleGame {
  const wall = shuffleTiles(createDeck());
  const NAMES = ['AI-极端K哥', 'AI-极端东', 'AI-极端西', 'AI-极端北'];

  const players: SimplePlayer[] = NAMES.map((name, i) => ({
    id: randomUUID(),
    name,
    position: i,
    hand: [],
    melds: [],
    meldTiles: [],
    flowers: [],
    status: 'playing',
    score: 0,
    exposedMelds: []
  }));

  const { wildTileId, wildGroup, wildSuit, wildValue } = pickWild();

  const game: SimpleGame = {
    gameId: `game-${gameNum}`,
    wall,
    players,
    currentPlayerIndex: 0,
    discardPile: [],
    wildTileId,
    wildGroup,
    wildSuit,
    wildValue,
    bailout: new Map(),
    rounds: 0,
    reason: '流局',
    chowCount: 0,
    pengCount: 0,
    kongCount: 0,
    huCount: 0,
    selfHuCount: 0,
    discardHuCount: 0,
    drawCount: 0,
    handTypeStats: new Map(),
    winnerStats: new Map(),
    pointsByPlayer: new Map()
  };

  // Initialize points tracking
  for (const p of players) {
    game.pointsByPlayer.set(p.name, 0);
  }

  // Deal 13 tiles each
  for (let r = 0; r < 13; r++) {
    for (let p = 0; p < 4; p++) {
      drawTile(players[p]!, wall, game);
    }
  }
  // Dealer gets 14th tile
  drawTile(players[0]!, wall, game);

  let current = 0;
  const maxRounds = 500;
  const winners: WinDetail[] = [];

  while (game.rounds < maxRounds && wall.length > 0) {
    const activePlayers = players.filter(p => p.status === 'playing');
    if (activePlayers.length <= 1) {
      game.reason = '最后一人';
      break;
    }

    const player = players[current]!;
    if (player.status !== 'playing') {
      current = nextPlaying(players, current);
      game.rounds++;
      continue;
    }

    // Ensure player has 14 tiles (draw if 13)
    if (player.hand.length % 3 !== 2) {
      const ok = drawTile(player, wall, game);
      game.drawCount++;
      if (!ok) {
        game.reason = '牌墙摸完流局';
        break;
      }
    }

    // Self-draw HU check
    const wildChecker = isWildTileFn(wildTileId, wildGroup);
    const selfWin = canWin(player.hand, player.exposedMelds.length, wildChecker);
    if (selfWin.canWin && shouldClaimHu(player, game)) {
      const { detail, points } = buildWinDetail(player, '自摸', [...player.hand], game);
      winners.push(detail);
      player.status = 'won';
      game.huCount++;
      game.selfHuCount++;
      game.handTypeStats.set(detail.handType, (game.handTypeStats.get(detail.handType) || 0) + 1);
      game.winnerStats.set(player.name, (game.winnerStats.get(player.name) || 0) + 1);
      game.pointsByPlayer.set(player.name, (game.pointsByPlayer.get(player.name) || 0) + points);

      // Settlement: self-drawn, other players pay
      const others = players.filter(p => p.status === 'playing' && p.id !== player.id);
      for (const o of others) {
        const rel = getRelationType(game.bailout, player.position, o.position);
        const mult = rel === '四口' ? 5 : rel === '三口' ? 3 : 1;
        const pay = points * mult;
        o.score -= pay;
        player.score += pay;
      }

      current = nextPlaying(players, player.position);
      game.rounds++;
      continue;
    }

    // Discard
    const discard = selectDiscardTile(player, game);
    removeTileFromHand(player.hand, discard);
    game.discardPile.push(discard);

    // Discard HU check (放冲)
    const huCandidates: Array<{ idx: number; points: number; detail: WinDetail }> = [];
    for (let step = 1; step <= 3; step++) {
      const i = (player.position + step) % 4;
      const other = players[i]!;
      if (other.status !== 'playing') continue;

      const testHand = sortTiles([...other.hand, discard]);
      const can = canWin(testHand, other.exposedMelds.length, wildChecker);
      if (!can.canWin) continue;

      if (EXTREME_POLICY.discardHuChance >= Math.random()) {
        const built = buildWinDetail(other, '放冲', testHand, game, player.position);
        huCandidates.push({ idx: i, points: built.points, detail: built.detail });
      }
    }

    if (huCandidates.length > 0) {
      // Multiple wins from one discard
      for (const c of huCandidates) {
        const winner = players[c.idx]!;
        winner.status = 'won';
        winners.push(c.detail);
        game.huCount++;
        game.discardHuCount++;
        game.handTypeStats.set(c.detail.handType, (game.handTypeStats.get(c.detail.handType) || 0) + 1);
        game.winnerStats.set(winner.name, (game.winnerStats.get(winner.name) || 0) + 1);
        game.pointsByPlayer.set(winner.name, (game.pointsByPlayer.get(winner.name) || 0) + c.points);

        // Discarder pays
        const rel = getRelationType(game.bailout, player.position, winner.position);
        const mult = rel ? 2 : 1;
        const pay = c.points * mult;
        player.score -= pay;
        winner.score += pay;

        // Third-party mutual bailout extra
        for (const other of players) {
          if (other.status !== 'playing') continue;
          if (other.id === player.id || other.id === winner.id) continue;
          const r = getRelationType(game.bailout, other.position, winner.position);
          if (r) {
            const pay2 = c.points;
            other.score -= pay2;
            winner.score += pay2;
          }
        }
      }

      // From first winner's right continue
      const firstWinnerIdx = huCandidates
        .map(c => c.idx)
        .sort((a, b) => ((a - player.position + 4) % 4) - ((b - player.position + 4) % 4))[0]!;
      current = nextPlaying(players, firstWinnerIdx);
      game.rounds++;
      continue;
    }

    // PENG/KONG check (other players, clockwise from discarder)
    let claimed = false;
    for (let step = 1; step <= 3 && !claimed; step++) {
      const i = (player.position + step) % 4;
      const other = players[i]!;
      if (other.status !== 'playing') continue;

      const same = other.hand.filter(t => tilesEqual(t, discard));

      // KONG first (3+ matching)
      if (same.length >= 3 && shouldClaimKong(other)) {
        const use = same.slice(0, 3);
        for (const t of use) removeTileFromHand(other.hand, t);
        other.exposedMelds.push(MeldType.KONG);
        other.melds.push(MeldType.KONG);
        other.meldTiles.push([discard, ...use]);
        addBailoutCount(game.bailout, other.position, player.position);
        game.kongCount++;

        // Kong draw
        drawTile(other, wall, game);
        game.drawCount++;
        current = other.position;
        claimed = true;
        break;
      }

      // PENG (2+ matching)
      if (same.length >= 2 && shouldClaimPeng(other)) {
        const use = same.slice(0, 2);
        for (const t of use) removeTileFromHand(other.hand, t);
        other.exposedMelds.push(MeldType.TRIPLET);
        other.melds.push(MeldType.TRIPLET);
        other.meldTiles.push([discard, ...use]);
        addBailoutCount(game.bailout, other.position, player.position);
        game.pengCount++;

        current = other.position;
        claimed = true;
        break;
      }
    }

    if (claimed) {
      game.rounds++;
      continue;
    }

    // CHOW check (only downsteam player / 下家)
    const downIdx = nextPlaying(players, player.position);
    const down = players[downIdx]!;
    if (down.status === 'playing') {
      const seqs = findChowSequences(down.hand, discard, game);
      if (seqs.length > 0 && shouldClaimChow(down, game)) {
        // Pick best sequence (prefer夹张)
        const seq = seqs[0]!;
        const inHand = seq.filter(t => t.id !== discard.id);
        for (const t of inHand) removeTileFromHand(down.hand, t);
        down.exposedMelds.push(MeldType.SEQUENCE);
        down.melds.push(MeldType.SEQUENCE);
        down.meldTiles.push(seq);
        addBailoutCount(game.bailout, down.position, player.position);
        game.chowCount++;

        current = down.position;
        game.rounds++;
        continue;
      }
    }

    // Normal next player
    current = nextPlaying(players, player.position);
    game.rounds++;
  }

  if (game.rounds >= maxRounds) {
    game.reason = '超时流局';
  } else if (game.reason === '流局' && wall.length === 0) {
    game.reason = '牌墙摸完流局';
  }

  return game;
}

// ===== Run 100 games and collect stats =====

interface AggregatedStats {
  totalGames: number;
  huGames: number;
  drawGames: number;
  totalHu: number;
  totalSelfHu: number;
  totalDiscardHu: number;
  totalChow: number;
  totalPeng: number;
  totalKong: number;
  totalDraw: number;
  totalRounds: number;
  handTypeDistribution: Map<string, number>;
  playerWins: Map<string, number>;
  playerPoints: Map<string, number>;
  biggestWinGame: { gameNum: number; winner: string; points: number; handType: string } | null;
  longestGame: { gameNum: number; rounds: number } | null;
}

function aggregateStats(games: SimpleGame[]): AggregatedStats {
  const stats: AggregatedStats = {
    totalGames: games.length,
    huGames: 0,
    drawGames: 0,
    totalHu: 0,
    totalSelfHu: 0,
    totalDiscardHu: 0,
    totalChow: 0,
    totalPeng: 0,
    totalKong: 0,
    totalDraw: 0,
    totalRounds: 0,
    handTypeDistribution: new Map(),
    playerWins: new Map(),
    playerPoints: new Map(),
    biggestWinGame: null,
    longestGame: null,
  };

  const allNames = ['AI-极端K哥', 'AI-极端东', 'AI-极端西', 'AI-极端北'];
  for (const n of allNames) {
    stats.playerWins.set(n, 0);
    stats.playerPoints.set(n, 0);
  }

  for (const g of games) {
    if (g.huCount > 0) {
      stats.huGames++;
    } else {
      stats.drawGames++;
    }

    stats.totalHu += g.huCount;
    stats.totalSelfHu += g.selfHuCount;
    stats.totalDiscardHu += g.discardHuCount;
    stats.totalChow += g.chowCount;
    stats.totalPeng += g.pengCount;
    stats.totalKong += g.kongCount;
    stats.totalDraw += g.drawCount;
    stats.totalRounds += g.rounds;

    for (const [ht, cnt] of g.handTypeStats) {
      stats.handTypeDistribution.set(ht, (stats.handTypeDistribution.get(ht) || 0) + cnt);
    }

    for (const [name, wins] of g.winnerStats) {
      stats.playerWins.set(name, (stats.playerWins.get(name) || 0) + wins);
    }

    for (const [name, pts] of g.pointsByPlayer) {
      stats.playerPoints.set(name, (stats.playerPoints.get(name) || 0) + pts);
    }

    // Track biggest win
    for (const [name, pts] of g.pointsByPlayer) {
      if (pts > 0 && (!stats.biggestWinGame || pts > stats.biggestWinGame.points)) {
        const ht = [...g.handTypeStats.keys()][0] || '未知';
        stats.biggestWinGame = { gameNum: g.gameId, winner: name, points: pts, handType: ht };
      }
    }

    // Track longest game
    if (!stats.longestGame || g.rounds > stats.longestGame.rounds) {
      stats.longestGame = { gameNum: parseInt(g.gameId.replace('game-', '')), rounds: g.rounds };
    }
  }

  return stats;
}

function printBanner(text: string, width = 80) {
  const pad = Math.max(0, Math.floor((width - text.length - 2) / 2));
  console.log('='.repeat(width));
  console.log(`${' '.repeat(pad)} ${text}`);
  console.log('='.repeat(width));
}

function printReport(stats: AggregatedStats, games: SimpleGame[]) {
  const TOTAL = stats.totalGames;
  const huRate = ((stats.huGames / TOTAL) * 100).toFixed(1);
  const drawRate = ((stats.drawGames / TOTAL) * 100).toFixed(1);
  const avgRounds = (stats.totalRounds / TOTAL).toFixed(1);
  const avgHuPerGame = (stats.totalHu / TOTAL).toFixed(2);
  const avgChow = (stats.totalChow / TOTAL).toFixed(2);
  const avgPeng = (stats.totalPeng / TOTAL).toFixed(2);
  const avgKong = (stats.totalKong / TOTAL).toFixed(2);

  printBanner('🀄 麻将极端参数测试报告 - 100局统计');

  console.log('\n📋 测试配置（极端参数）');
  console.log('  chowChance     = 1.0  (有吃必吃)');
  console.log('  pengChance     = 1.0  (有碰必碰)');
  console.log('  kongChance     = 1.0  (有杠必杠)');
  console.log('  selfWinChance  = 1.0  (有胡必胡)');
  console.log('  discardHuChance= 0.0  (不弃胡)');
  console.log('  wildKeepPenalty= 0    (随意丢百搭)');
  console.log('  玩家: 4个AI (AI-极端K哥, AI-极端东, AI-极端西, AI-极端北)');

  console.log('\n📊 全局统计');
  console.log(`  总局数:          ${TOTAL}`);
  console.log(`  胡牌局:         ${stats.huGames} (${huRate}%)`);
  console.log(`  流局:           ${stats.drawGames} (${drawRate}%)`);
  console.log(`  平均每局回合:    ${avgRounds}`);
  console.log(`  总胡牌次数:      ${stats.totalHu} (自摸${stats.totalSelfHu}, 放冲${stats.totalDiscardHu})`);
  console.log(`  平均每局胡次数:  ${avgHuPerGame}`);
  console.log(`  平均每局吃次数:  ${avgChow}`);
  console.log(`  平均每局碰次数:  ${avgPeng}`);
  console.log(`  平均每局杠次数:  ${avgKong}`);
  console.log(`  总摸牌次数:      ${stats.totalDraw}`);

  console.log('\n🏆 胡牌玩家分布');
  const sortedWins = [...stats.playerWins.entries()].sort((a, b) => b[1] - a[1]);
  for (const [name, wins] of sortedWins) {
    const pct = ((wins / stats.totalHu) * 100).toFixed(1);
    const bar = '█'.repeat(Math.round((wins / (stats.totalHu || 1)) * 20));
    console.log(`  ${name.padEnd(12)} ${String(wins).padStart(4)}次 ${pct.padStart(6)}%  ${bar}`);
  }

  console.log('\n💰 累计积分（胡牌获得）');
  const sortedPts = [...stats.playerPoints.entries()].sort((a, b) => b[1] - a[1]);
  for (const [name, pts] of sortedPts) {
    const sign = pts >= 0 ? '+' : '';
    console.log(`  ${name.padEnd(12)} ${sign}${pts}`);
  }

  console.log('\n🀐 牌型分布（胡牌番数）');
  const sortedHT = [...stats.handTypeDistribution.entries()].sort((a, b) => b[1] - a[1]);
  if (sortedHT.length === 0) {
    console.log('  (无胡牌)');
  } else {
    for (const [ht, cnt] of sortedHT) {
      const pct = ((cnt / stats.totalHu) * 100).toFixed(1);
      const bar = '█'.repeat(Math.round((cnt / stats.totalHu) * 30));
      console.log(`  ${ht.padEnd(15)} ${String(cnt).padStart(4)}次 ${pct.padStart(6)}%  ${bar}`);
    }
  }

  if (stats.biggestWinGame) {
    console.log('\n💥 最大单局赢分');
    console.log(`  第${stats.biggestWinGame.gameNum}局: ${stats.biggestWinGame.winner} 获得 ${stats.biggestWinGame.points}分 (${stats.biggestWinGame.handType})`);
  }

  if (stats.longestGame) {
    console.log('\n⏱️  最长一局');
    console.log(`  第${stats.longestGame.gameNum}局: ${stats.longestGame.rounds}回合`);
  }

  // Show a few sample games
  console.log('\n📝 样本局详情（前5局）');
  for (let i = 0; i < Math.min(5, games.length); i++) {
    const g = games[i]!;
    console.log(`\n  【第${g.gameId.replace('game-', '')}局】`);
    console.log(`    百搭: ${g.wildTileId}${g.wildGroup ? ` (组:${g.wildGroup.join('/')})` : ''}`);
    console.log(`    回合: ${g.rounds}  |  结束原因: ${g.reason}`);
    console.log(`    吃:${g.chowCount} 碰:${g.pengCount} 杠:${g.kongCount} 胡:${g.huCount}(自摸${g.selfHuCount} 放冲${g.discardHuCount})`);
    if (g.huCount > 0) {
      for (const [name, pts] of g.pointsByPlayer) {
        if (pts !== 0) {
          console.log(`    ${name}: ${pts >= 0 ? '+' : ''}${pts}分`);
        }
      }
    }
  }

  // Distribution of hu vs draw
  console.log('\n📈 胡/流分布');
  const
  const huBar = '█'.repeat(Math.round((stats.huGames / TOTAL) * 40));
  const drawBar = '░'.repeat(40 - Math.round((stats.huGames / TOTAL) * 40));
  console.log(`  胡 ${stats.huGames}局  [${huBar}${drawBar}] ${huRate}%`);
  console.log(`  流 ${stats.drawGames}局`);

  // Per-game round distribution
  const roundDist: number[] = [];
  for (const g of games) roundDist.push(g.rounds);
  roundDist.sort((a, b) => a - b);
  const p25 = roundDist[Math.floor(TOTAL * 0.25)] || 0;
  const p50 = roundDist[Math.floor(TOTAL * 0.50)] || 0;
  const p75 = roundDist[Math.floor(TOTAL * 0.75)] || 0;
  const p90 = roundDist[Math.floor(TOTAL * 0.90)] || 0;
  console.log('\n📉 回合数分布');
  console.log(`  P25=${p25}  P50(中位)=${p50}  P75=${p75}  P90=${p90}  最大=${roundDist[roundDist.length - 1] || 0}`);
}

// ===== Main =====
const TOTAL = 100;
printBanner(`🀄 极端测试开始: ${TOTAL}局`);

const startMs = Date.now();
const games: SimpleGame[] = [];

for (let i = 1; i <= TOTAL; i++) {
  try {
    const g = simulateOneGame(i);
    games.push(g);
  } catch (err: any) {
    console.error(`❌ 第${i}局异常: ${err?.message || err}`);
  }
  if (i % 10 === 0 || i === TOTAL) {
    process.stdout.write(`  ▶ 进度: ${i}/${TOTAL} 局完成\r`);
  }
}

const elapsed = ((Date.now() - startMs) / 1000).toFixed(1);
console.log(`\n\n⏱️  耗时: ${elapsed}s (${(TOTAL / parseFloat(elapsed)).toFixed(1)}局/秒)`);

const stats = aggregateStats(games);
printReport(stats, games);

printBanner('测试完成');
