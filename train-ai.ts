import fs from 'fs';
import path from 'path';

import { createDeck, shuffleTiles, sortTiles, isFlower, tilesEqual, getTileDisplayName } from './server/utils/tiles';
import { canWin, detectHandTypes, buildWildTileChecker } from './server/utils/handValidator';
import { calculateScore, calculateRoundMultiplier, calculateGlobalMultiplier } from './server/utils/scoring';
import { Tile, TileSuit, Meld, MeldType } from './server/types/game';

const ROUNDS = parseInt(process.argv[2] || '20', 10);
const GAMES_PER_ROUND = parseInt(process.argv[3] || '1000', 10);
const OUT_DIR = '/data/training';
const OUT_FILE = path.join(OUT_DIR, 'ai-training-log.md');
const POLICY_DIR = path.join(OUT_DIR, 'policies');
const BEST_POLICY_FILE = path.join(OUT_DIR, 'best-policy.json');

const PLAYER_NAMES = ['K哥', 'AI东', 'AI西', 'AI北'];

type PlayerStatus = 'playing' | 'won';
type WinMode = '自摸' | '放冲';
type RelationType = '三口' | '四口';

interface Policy {
  id: string;
  selfWinChance: number;
  selfWinWildBoost: number;

  // 偏向自摸不捉冲
  discardHuChance: number;
  discardHuWildPenalty: number;
  discardHuMenQingPenalty: number;

  // 进攻动作
  pengChance: number;
  kongChance: number;
  chowChance: number;
  pengWildBoost: number;
  kongWildBoost: number;
  chowWildPenalty: number;

  // 出牌策略（做大牌）
  pairWeight: number;
  nearWeight: number;
  honorPairBonus: number;
  wildKeepPenalty: number;
  dominantSuitBonus: number;
  tripletKeepBonus: number;
}

interface WinDetail {
  name: string;
  winMode: WinMode;
  handType: string;
  baseFan: number;
  finalPoints: number;
  handTiles: string[];
  melds: string[];
  flowers: string[];
  from?: string;
}

interface PlayerState {
  index: number;
  name: string;
  hand: Tile[];
  melds: Meld[];
  flowers: Tile[];
  status: PlayerStatus;
  score: number;
  winDetail?: WinDetail;
}

interface Relation {
  player1: string;
  player2: string;
  type: RelationType;
  aToB: number;
  bToA: number;
}

interface GameRecord {
  gameNum: number;
  wildTile: string;
  wildGroup: string[] | null;
  rounds: number;
  reason: string;
  dice1: number;
  dice2: number;
  roundMultiplier: number;
  globalMultiplierAtStart: number;
  prevRoundWasDraw: boolean;
  prevRoundHadRebel: boolean;
  winners: WinDetail[];
  losers: Array<{ name: string; score: number }>;
  relations: Relation[];
  settlementDetails: string[];
  totalPot: number;
}

interface RoundMetrics {
  round: number;
  policy: Policy;
  games: number;
  huGames: number;
  drawGames: number;
  lastPlayerGames: number;
  huRate: number;
  drawRate: number;
  lastPlayerRate: number;
  avgRounds: number;
  avgPot: number;
  fitness: number;
  biggest: GameRecord;
}

interface TrainingContext {
  prevRoundWasDraw: boolean;
  prevRoundHadRebel: boolean;
  globalMultiplier: number;
}

function rnd(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function makePolicy(seed = 'base'): Policy {
  return {
    id: seed,
    selfWinChance: 0.9,
    selfWinWildBoost: 0.05,

    discardHuChance: 0.75,
    discardHuWildPenalty: 0.22,
    discardHuMenQingPenalty: 0.08,

    pengChance: 0.42,
    kongChance: 0.18,
    chowChance: 0.28,
    pengWildBoost: 0.15,
    kongWildBoost: 0.2,
    chowWildPenalty: 0.12,

    pairWeight: 4,
    nearWeight: 2,
    honorPairBonus: 2,
    wildKeepPenalty: 1300,
    dominantSuitBonus: 2.2,
    tripletKeepBonus: 2.6
  };
}

function mutate(base: Policy, idx: number): Policy {
  return {
    ...base,
    id: `${base.id}-m${idx}`,
    selfWinChance: clamp(base.selfWinChance + rnd(-0.08, 0.08), 0.65, 0.99),
    selfWinWildBoost: clamp(base.selfWinWildBoost + rnd(-0.05, 0.05), 0, 0.25),

    discardHuChance: clamp(base.discardHuChance + rnd(-0.1, 0.1), 0.2, 0.95),
    discardHuWildPenalty: clamp(base.discardHuWildPenalty + rnd(-0.08, 0.08), 0, 0.45),
    discardHuMenQingPenalty: clamp(base.discardHuMenQingPenalty + rnd(-0.06, 0.06), 0, 0.25),

    pengChance: clamp(base.pengChance + rnd(-0.12, 0.12), 0.05, 0.9),
    kongChance: clamp(base.kongChance + rnd(-0.08, 0.08), 0.02, 0.6),
    chowChance: clamp(base.chowChance + rnd(-0.1, 0.1), 0.01, 0.7),
    pengWildBoost: clamp(base.pengWildBoost + rnd(-0.08, 0.08), 0, 0.35),
    kongWildBoost: clamp(base.kongWildBoost + rnd(-0.08, 0.08), 0, 0.4),
    chowWildPenalty: clamp(base.chowWildPenalty + rnd(-0.06, 0.06), 0, 0.3),

    pairWeight: clamp(base.pairWeight + rnd(-1.2, 1.2), 1, 9),
    nearWeight: clamp(base.nearWeight + rnd(-1, 1), 0.1, 5),
    honorPairBonus: clamp(base.honorPairBonus + rnd(-1, 1), 0, 6),
    wildKeepPenalty: clamp(base.wildKeepPenalty + rnd(-280, 280), 400, 2500),
    dominantSuitBonus: clamp(base.dominantSuitBonus + rnd(-0.8, 0.8), 0, 6),
    tripletKeepBonus: clamp(base.tripletKeepBonus + rnd(-0.8, 0.8), 0, 6)
  };
}

function key(i: number) {
  return String(i);
}

function pickWild() {
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

function addBailoutCount(matrix: Map<string, Map<string, number>>, claimer: number, source: number) {
  const c = key(claimer);
  const s = key(source);
  if (!matrix.has(c)) matrix.set(c, new Map());
  const row = matrix.get(c)!;
  row.set(s, (row.get(s) || 0) + 1);
}

function getRelations(matrix: Map<string, Map<string, number>>): Relation[] {
  const relations: Relation[] = [];
  const seen = new Set<string>();
  for (const [a, row] of matrix) {
    for (const b of row.keys()) {
      const k = [a, b].sort().join('-');
      if (seen.has(k)) continue;
      seen.add(k);
      const aToB = matrix.get(a)?.get(b) || 0;
      const bToA = matrix.get(b)?.get(a) || 0;
      const mx = Math.max(aToB, bToA);
      if (mx >= 4) {
        relations.push({
          player1: PLAYER_NAMES[parseInt(a, 10)] || a,
          player2: PLAYER_NAMES[parseInt(b, 10)] || b,
          type: '四口',
          aToB,
          bToA
        });
      } else if (mx >= 3) {
        relations.push({
          player1: PLAYER_NAMES[parseInt(a, 10)] || a,
          player2: PLAYER_NAMES[parseInt(b, 10)] || b,
          type: '三口',
          aToB,
          bToA
        });
      }
    }
  }
  return relations;
}

function relationBetween(matrix: Map<string, Map<string, number>>, a: number, b: number): RelationType | null {
  const aToB = matrix.get(key(a))?.get(key(b)) || 0;
  const bToA = matrix.get(key(b))?.get(key(a)) || 0;
  const mx = Math.max(aToB, bToA);
  if (mx >= 4) return '四口';
  if (mx >= 3) return '三口';
  return null;
}

function nextPlaying(players: PlayerState[], from: number): number {
  for (let step = 1; step <= players.length; step++) {
    const i = (from + step) % players.length;
    if (players[i]?.status === 'playing') return i;
  }
  return from;
}

function findChowSequences(hand: Tile[], discarded: Tile): Tile[][] {
  const numberSuits = [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS];
  if (!numberSuits.includes(discarded.suit)) return [];

  const suit = discarded.suit;
  const v = discarded.value;
  const seqs: Tile[][] = [];

  if (v <= 7) {
    const t2 = hand.find(t => t.suit === suit && t.value === v + 1);
    const t3 = hand.find(t => t.suit === suit && t.value === v + 2);
    if (t2 && t3) seqs.push([discarded, t2, t3]);
  }

  if (v >= 2 && v <= 8) {
    const t1 = hand.find(t => t.suit === suit && t.value === v - 1);
    const t3 = hand.find(t => t.suit === suit && t.value === v + 1);
    if (t1 && t3) seqs.push([t1, discarded, t3]);
  }

  if (v >= 3) {
    const t1 = hand.find(t => t.suit === suit && t.value === v - 2);
    const t2 = hand.find(t => t.suit === suit && t.value === v - 1);
    if (t1 && t2) seqs.push([t1, t2, discarded]);
  }

  return seqs;
}

function removeTile(hand: Tile[], tile: Tile) {
  const idx = hand.findIndex(t => t.id === tile.id);
  if (idx >= 0) hand.splice(idx, 1);
}

function keepScore(hand: Tile[], tile: Tile, isWild: (t: Tile) => boolean, policy: Policy): number {
  if (isWild(tile)) return policy.wildKeepPenalty;

  const wildCount = hand.filter(t => isWild(t)).length;
  const attackScale = 1 + wildCount * 0.22; // 百搭越多越激进做大牌

  let score = 0;
  const same = hand.filter(t => t.suit === tile.suit && t.value === tile.value).length;
  score += same * policy.pairWeight;

  // 偏向保留刻子胚
  if (same >= 3) {
    score += policy.tripletKeepBonus * attackScale;
  }

  // 偏向单花色（冲清一色/清碰）
  const numberSuits = [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS];
  const suitCount = new Map<TileSuit, number>();
  for (const t of hand) {
    if (!numberSuits.includes(t.suit)) continue;
    suitCount.set(t.suit, (suitCount.get(t.suit) || 0) + 1);
  }
  let dominantSuit: TileSuit | null = null;
  let dominant = 0;
  for (const [s, c] of suitCount) {
    if (c > dominant) {
      dominant = c;
      dominantSuit = s;
    }
  }
  if (dominantSuit && tile.suit === dominantSuit) {
    score += policy.dominantSuitBonus * attackScale;
  }

  const isNum = numberSuits.includes(tile.suit);
  if (isNum) {
    const near = hand.filter(t =>
      t.suit === tile.suit && Math.abs(t.value - tile.value) <= 2 && t.id !== tile.id
    ).length;
    score += near * policy.nearWeight;
  } else {
    if (same >= 2) score += policy.honorPairBonus;
  }

  return score;
}

function pickDiscard(hand: Tile[], isWild: (t: Tile) => boolean, policy: Policy): Tile {
  let best = hand[0]!;
  let bestScore = Number.POSITIVE_INFINITY;
  for (const t of hand) {
    const s = keepScore(hand, t, isWild, policy);
    if (s < bestScore) {
      bestScore = s;
      best = t;
    }
  }
  return best;
}

function drawTile(player: PlayerState, wall: Tile[], isWild: (t: Tile) => boolean): boolean {
  while (wall.length > 0) {
    const tile = wall.pop()!;
    if (isFlower(tile)) {
      if (isWild(tile)) {
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

function toMeldText(m: Meld) {
  const type = m.type === MeldType.SEQUENCE
    ? '吃'
    : m.type === MeldType.TRIPLET
      ? '碰'
      : m.type === MeldType.KONG
        ? '杠'
        : m.type;
  return `${type}:${m.tiles.map(getTileDisplayName).join(' ')}`;
}

function buildWinDetail(
  player: PlayerState,
  winMode: WinMode,
  handForCalc: Tile[],
  wildTileId: string,
  wildGroup: string[] | null,
  wildSuit: TileSuit,
  wildValue: number,
  roundMultiplier: number,
  globalMultiplier: number,
  from?: string
): { detail: WinDetail; points: number } | null {
  const handTypes = detectHandTypes(
    handForCalc,
    player.melds,
    winMode === '自摸',
    player.flowers.length,
    wildTileId,
    wildGroup || undefined
  );

  // 规则约束：仅允许8种结算牌型；普通胡/七对不参与结算展示
  if (handTypes.length === 0) {
    return null;
  }

  const score = calculateScore({
    handTiles: handForCalc,
    exposedMelds: player.melds,
    flowerTiles: player.flowers,
    handTypes,
    isSelfDrawn: winMode === '自摸',
    isKongFlower: false,
    isRobbingKong: false,
    isMenQing: player.melds.every(m => m.type !== MeldType.SEQUENCE && m.type !== MeldType.TRIPLET),
    wildTileSuit: wildSuit,
    wildTileValue: wildValue,
    wildTileGroup: wildGroup || undefined,
    roundMultiplier,
    globalMultiplier
  });

  return {
    detail: {
      name: player.name,
      winMode,
      handType: score.handTypeName,
      baseFan: score.baseFan,
      finalPoints: score.finalPoints,
      handTiles: sortTiles([...handForCalc]).map(getTileDisplayName),
      melds: player.melds.map(toMeldText),
      flowers: player.flowers.map(getTileDisplayName),
      from
    },
    points: score.finalPoints
  };
}

function simulateOne(gameNum: number, policy: Policy, ctx: TrainingContext): GameRecord {
  const wall = shuffleTiles(createDeck());
  const players: PlayerState[] = PLAYER_NAMES.map((name, i) => ({
    index: i,
    name,
    hand: [],
    melds: [],
    flowers: [],
    status: 'playing',
    score: 0
  }));

  const { wildTileId, wildGroup, wildSuit, wildValue } = pickWild();
  const isWild = buildWildTileChecker(wildTileId, wildGroup || undefined);

  // 本局倍数上下文
  const dice1 = Math.floor(Math.random() * 6) + 1;
  const dice2 = Math.floor(Math.random() * 6) + 1;
  const roundMultiplier = calculateRoundMultiplier(dice1, dice2);
  const globalMultiplierAtStart = Math.max(1, Math.min(ctx.globalMultiplier, 8));

  const bailout = new Map<string, Map<string, number>>();
  const settlementDetails: string[] = [];

  for (let r = 0; r < 13; r++) {
    for (let p = 0; p < 4; p++) drawTile(players[p]!, wall, isWild);
  }
  drawTile(players[0]!, wall, isWild);

  let current = 0;
  let rounds = 0;
  const maxRounds = 500;
  let reason = '流局';

  while (rounds < maxRounds && wall.length > 0) {
    const activePlayers = players.filter(p => p.status === 'playing');
    if (activePlayers.length <= 1) {
      reason = '最后一人';
      break;
    }

    const player = players[current]!;
    if (player.status !== 'playing') {
      current = nextPlaying(players, current);
      rounds++;
      continue;
    }

    if (player.hand.length % 3 !== 2) {
      const ok = drawTile(player, wall, isWild);
      if (!ok) {
        reason = '牌墙摸完流局';
        break;
      }
    }

    const selfWin = canWin(player.hand, player.melds.length, isWild);
    const wildCountNow = player.hand.filter(t => isWild(t)).length;
    const selfWinChanceNow = clamp(policy.selfWinChance + wildCountNow * policy.selfWinWildBoost, 0.65, 0.999);
    if (selfWin.canWin && Math.random() < selfWinChanceNow) {
      const built = buildWinDetail(
        player,
        '自摸',
        [...player.hand],
        wildTileId,
        wildGroup,
        wildSuit,
        wildValue,
        roundMultiplier,
        globalMultiplierAtStart
      );
      if (built) {
        const { detail, points } = built;
        player.winDetail = detail;
        player.status = 'won';

        const others = players.filter(p => p.status === 'playing' && p.index !== player.index);
        const fourPartners = others.filter(o => relationBetween(bailout, o.index, player.index) === '四口');
        const threePartners = others.filter(o => relationBetween(bailout, o.index, player.index) === '三口');

        if (fourPartners.length > 0) {
          for (const o of others) {
            if (fourPartners.some(fp => fp.index === o.index)) {
              const pay = points * 5;
              o.score -= pay;
              player.score += pay;
              settlementDetails.push(`[自摸-四口] ${o.name} -> ${player.name} : ${pay} (${points}x5)`);
            } else {
              settlementDetails.push(`[自摸-四口] ${o.name} -> ${player.name} : 0 (四口他家不赔)`);
            }
          }
        } else if (threePartners.length > 0) {
          for (const o of others) {
            const mult = threePartners.some(tp => tp.index === o.index) ? 3 : 1;
            const pay = points * mult;
            o.score -= pay;
            player.score += pay;
            settlementDetails.push(`[自摸-三口] ${o.name} -> ${player.name} : ${pay} (${points}x${mult})`);
          }
        } else {
          for (const o of others) {
            const pay = points;
            o.score -= pay;
            player.score += pay;
            settlementDetails.push(`[自摸] ${o.name} -> ${player.name} : ${pay}`);
          }
        }

        current = nextPlaying(players, player.index);
        rounds++;
        continue;
      }
    }

    const discard = pickDiscard(player.hand, isWild, policy);
    removeTile(player.hand, discard);

    const huCandidates: Array<{ idx: number; points: number; detail: WinDetail }> = [];
    for (let step = 1; step <= 3; step++) {
      const i = (player.index + step) % 4;
      const other = players[i]!;
      if (other.status !== 'playing') continue;

      const testHand = sortTiles([...other.hand, discard]);
      const can = canWin(testHand, other.melds.length, isWild);
      if (!can.canWin) continue;

      // 策略：偏向自摸不捉冲；百搭越多越贪大牌
      const otherWildCount = other.hand.filter(t => isWild(t)).length;
      const hasOpenMeld = other.melds.some(m => m.type === MeldType.SEQUENCE || m.type === MeldType.TRIPLET);
      let huOnDiscardChance = policy.discardHuChance;
      huOnDiscardChance -= otherWildCount * policy.discardHuWildPenalty;
      if (!hasOpenMeld) huOnDiscardChance -= policy.discardHuMenQingPenalty;
      huOnDiscardChance = clamp(huOnDiscardChance, 0.05, 0.95);

      if (Math.random() < huOnDiscardChance) {
        const built = buildWinDetail(
          other,
          '放冲',
          testHand,
          wildTileId,
          wildGroup,
          wildSuit,
          wildValue,
          roundMultiplier,
          globalMultiplierAtStart,
          player.name
        );
        if (built) {
          huCandidates.push({ idx: i, points: built.points, detail: built.detail });
        }
      }
    }

    if (huCandidates.length > 0) {
      for (const c of huCandidates) {
        const winner = players[c.idx]!;
        winner.status = 'won';
        winner.winDetail = c.detail;

        const rel = relationBetween(bailout, player.index, winner.index);
        const discarderMult = rel ? 2 : 1;
        const discarderPay = c.points * discarderMult;
        player.score -= discarderPay;
        winner.score += discarderPay;
        settlementDetails.push(`[放冲] ${player.name} -> ${winner.name} : ${discarderPay} (${c.points}x${discarderMult})`);

        for (const other of players) {
          if (other.status !== 'playing') continue;
          if (other.index === player.index || other.index === winner.index) continue;
          const r = relationBetween(bailout, other.index, winner.index);
          if (r) {
            const pay = c.points;
            other.score -= pay;
            winner.score += pay;
            settlementDetails.push(`[放冲-互包补赔] ${other.name} -> ${winner.name} : ${pay} (${r}补赔1倍)`);
          }
        }
      }

      const firstWinner = huCandidates
        .map(c => c.idx)
        .sort((a, b) => ((a - player.index + 4) % 4) - ((b - player.index + 4) % 4))[0]!;
      current = nextPlaying(players, firstWinner);
      rounds++;
      continue;
    }

    let claimed = false;
    for (let step = 1; step <= 3 && !claimed; step++) {
      const i = (player.index + step) % 4;
      const other = players[i]!;
      if (other.status !== 'playing') continue;

      const same = other.hand.filter(t => tilesEqual(t, discard));

      const otherWildCount = other.hand.filter(t => isWild(t)).length;
      const kongChanceNow = clamp(policy.kongChance + otherWildCount * policy.kongWildBoost, 0.02, 0.95);
      const pengChanceNow = clamp(policy.pengChance + otherWildCount * policy.pengWildBoost, 0.02, 0.95);

      if (same.length >= 3 && Math.random() < kongChanceNow) {
        const use = same.slice(0, 3);
        for (const t of use) removeTile(other.hand, t);
        other.melds.push({ type: MeldType.KONG, tiles: [discard, ...use], isConcealed: false });
        addBailoutCount(bailout, other.index, player.index);
        drawTile(other, wall, isWild);
        current = other.index;
        claimed = true;
        break;
      }

      if (same.length >= 2 && Math.random() < pengChanceNow) {
        const use = same.slice(0, 2);
        for (const t of use) removeTile(other.hand, t);
        other.melds.push({ type: MeldType.TRIPLET, tiles: [discard, ...use], isConcealed: false });
        addBailoutCount(bailout, other.index, player.index);
        current = other.index;
        claimed = true;
        break;
      }
    }

    if (claimed) {
      rounds++;
      continue;
    }

    const down = nextPlaying(players, player.index);
    const downPlayer = players[down]!;
    if (downPlayer.status === 'playing') {
      const seqs = findChowSequences(downPlayer.hand, discard);
      const downWildCount = downPlayer.hand.filter(t => isWild(t)).length;
      const chowChanceNow = clamp(policy.chowChance - downWildCount * policy.chowWildPenalty, 0.01, 0.9);
      if (seqs.length > 0 && Math.random() < chowChanceNow) {
        const seq = seqs[0]!;
        const inHand = seq.filter(t => t.id !== discard.id);
        for (const t of inHand) removeTile(downPlayer.hand, t);
        downPlayer.melds.push({ type: MeldType.SEQUENCE, tiles: seq, isConcealed: false });
        addBailoutCount(bailout, downPlayer.index, player.index);
        current = down;
        rounds++;
        continue;
      }
    }

    current = nextPlaying(players, player.index);
    rounds++;
  }

  if (rounds >= maxRounds) reason = '超时流局';
  else if (reason === '流局' && wall.length === 0) reason = '牌墙摸完流局';

  const winners = players.filter(p => p.status === 'won' && p.winDetail).map(p => p.winDetail!);
  const losers = players.filter(p => p.status !== 'won').map(p => ({ name: p.name, score: p.score }));
  const totalPot = players.reduce((s, p) => s + Math.abs(p.score), 0);

  return {
    gameNum,
    wildTile: wildTileId,
    wildGroup,
    rounds,
    reason,
    dice1,
    dice2,
    roundMultiplier,
    globalMultiplierAtStart,
    prevRoundWasDraw: ctx.prevRoundWasDraw,
    prevRoundHadRebel: ctx.prevRoundHadRebel,
    winners,
    losers,
    relations: getRelations(bailout),
    settlementDetails,
    totalPot
  };
}

function evaluate(policy: Policy, games: number, round: number): RoundMetrics {
  const all: GameRecord[] = [];
  let ctx: TrainingContext = {
    prevRoundWasDraw: false,
    prevRoundHadRebel: false,
    globalMultiplier: 1
  };

  for (let i = 1; i <= games; i++) {
    const g = simulateOne(i, policy, ctx);
    all.push(g);

    const isDraw = g.reason.includes('流局');
    const hadRebel = false; // 当前训练器未启用造反动作

    let nextGlobal = ctx.globalMultiplier;
    if (isDraw) {
      nextGlobal = calculateGlobalMultiplier(nextGlobal, '流局');
    } else if (hadRebel) {
      nextGlobal = calculateGlobalMultiplier(nextGlobal, '造反');
    } else {
      nextGlobal = 1;
    }

    ctx = {
      prevRoundWasDraw: isDraw,
      prevRoundHadRebel: hadRebel,
      globalMultiplier: nextGlobal
    };
  }

  const huGames = all.filter(g => g.winners.length > 0).length;
  const drawGames = games - huGames;
  const lastPlayerGames = all.filter(g => g.reason === '最后一人').length;
  const huRate = huGames / games;
  const drawRate = drawGames / games;
  const lastPlayerRate = lastPlayerGames / games;
  const avgRounds = all.reduce((s, g) => s + g.rounds, 0) / games;
  const avgPot = all.reduce((s, g) => s + g.totalPot, 0) / games;

  // 目标: 胡牌率↑, 流局率↓, 血战到最后一家的概率↑, 积分博弈强度↑
  const fitness = huRate * 120 - drawRate * 120 + lastPlayerRate * 140 + (avgPot / 100);

  const biggest = [...all].sort((a, b) => b.totalPot - a.totalPot)[0]!;

  return {
    round,
    policy,
    games,
    huGames,
    drawGames,
    lastPlayerGames,
    huRate,
    drawRate,
    lastPlayerRate,
    avgRounds,
    avgPot,
    fitness,
    biggest
  };
}

function appendRoundDoc(metrics: RoundMetrics) {
  const now = new Date().toISOString();
  const p = metrics.policy;
  const b = metrics.biggest;

  const lines: string[] = [];
  lines.push(`\n\n## Round ${metrics.round} (${now})`);
  lines.push('');
  lines.push('### 训练指标');
  lines.push(`- Games: ${metrics.games}`);
  lines.push(`- 胡牌局: ${metrics.huGames} (${(metrics.huRate * 100).toFixed(2)}%)`);
  lines.push(`- 流局: ${metrics.drawGames} (${(metrics.drawRate * 100).toFixed(2)}%)`);
  lines.push(`- 血战到最后一人: ${metrics.lastPlayerGames} (${(metrics.lastPlayerRate * 100).toFixed(2)}%)`);
  lines.push(`- 平均回合: ${metrics.avgRounds.toFixed(2)}`);
  lines.push(`- 平均总筹码: ${metrics.avgPot.toFixed(2)}`);
  lines.push(`- Fitness: ${metrics.fitness.toFixed(4)}`);

  lines.push('');
  lines.push('### 本轮最佳策略参数');
  lines.push('```json');
  lines.push(JSON.stringify(p, null, 2));
  lines.push('```');

  lines.push('');
  lines.push('### 最大输赢局明细（本轮）');
  lines.push(`- 局号: ${b.gameNum}`);
  lines.push(`- 原因: ${b.reason}`);
  lines.push(`- 回合: ${b.rounds}`);
  lines.push(`- 总筹码: ${b.totalPot}`);
  lines.push(`- 百搭: ${b.wildTile}${b.wildGroup ? ` (组: ${b.wildGroup.join('/')})` : ''}`);
  lines.push(`- 回合倍数信息:`);
  lines.push(`  - 骰子点数: ${b.dice1} + ${b.dice2}`);
  lines.push(`  - 本局回合倍数: x${b.roundMultiplier}`);
  lines.push(`  - 本局开始全局倍数: x${b.globalMultiplierAtStart}`);
  lines.push(`  - 上一局是否流局: ${b.prevRoundWasDraw ? '是' : '否'}`);
  lines.push(`  - 上一局是否造反: ${b.prevRoundHadRebel ? '是' : '否'}`);

  lines.push('');
  lines.push('- 输出该局所有胡牌玩家明细');
  if (b.winners.length === 0) {
    lines.push('  - (无胡牌玩家)');
  } else {
    for (const w of b.winners) {
      lines.push(`  - 玩家: ${w.name}`);
      lines.push(`    - 胡牌方式: ${w.winMode}${w.from ? ` (来自 ${w.from})` : ''}`);
      lines.push(`    - 牌型/基础番/最终点: ${w.handType} / ${w.baseFan} / ${w.finalPoints}`);
      lines.push(`    - 手牌牌面: ${w.handTiles.join(' ')}`);
      lines.push(`    - 门口牌（吃/碰/杠）: ${w.melds.length ? w.melds.join(' ; ') : '(无)'}`);
      lines.push(`    - 花牌: ${w.flowers.length ? w.flowers.join(' ') : '(无)'}`);
    }
  }

  lines.push('');
  lines.push('- 三口/四口关系');
  if (b.relations.length === 0) {
    lines.push('  - (无)');
  } else {
    for (const r of b.relations) {
      lines.push(`  - ${r.player1} <-> ${r.player2}: ${r.type} (A->B:${r.aToB}, B->A:${r.bToA})`);
    }
  }

  lines.push('');
  lines.push('- 结算逐笔明细（谁付给谁、倍率和金额）');
  if (b.settlementDetails.length === 0) {
    lines.push('  - (无)');
  } else {
    for (const d of b.settlementDetails) lines.push(`  - ${d}`);
  }

  fs.appendFileSync(OUT_FILE, lines.join('\n') + '\n', 'utf8');
}

function savePolicySnapshot(round: number, policy: Policy, metrics?: RoundMetrics) {
  fs.mkdirSync(POLICY_DIR, { recursive: true });

  const payload = {
    savedAt: new Date().toISOString(),
    round,
    metrics: metrics
      ? {
          fitness: metrics.fitness,
          huRate: metrics.huRate,
          drawRate: metrics.drawRate,
          lastPlayerRate: metrics.lastPlayerRate,
          avgRounds: metrics.avgRounds,
          avgPot: metrics.avgPot
        }
      : null,
    policy
  };

  fs.writeFileSync(BEST_POLICY_FILE, JSON.stringify(payload, null, 2), 'utf8');

  const roundFile = path.join(POLICY_DIR, `round-${String(round).padStart(3, '0')}.json`);
  fs.writeFileSync(roundFile, JSON.stringify(payload, null, 2), 'utf8');
}

function ensureDoc() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(POLICY_DIR, { recursive: true });
  if (!fs.existsSync(OUT_FILE)) {
    const header = [
      '# 长清阁麻将 AI 训练日志',
      '',
      `- 创建时间: ${new Date().toISOString()}`,
      `- 训练脚本: train-ai.ts`,
      '',
      '> 每轮记录最大输赢局完整明细（所有胡牌玩家、百搭、三口/四口关系、结算逐笔）',
      ''
    ].join('\n');
    fs.writeFileSync(OUT_FILE, header, 'utf8');
  }
}

async function main() {
  ensureDoc();

  console.log(`🧠 开始AI训练: rounds=${ROUNDS}, games/round=${GAMES_PER_ROUND}`);
  console.log(`📝 训练日志输出: ${OUT_FILE}`);
  console.log(`🧩 参数输出: ${BEST_POLICY_FILE}`);

  let champion = makePolicy('champion-r0');

  for (let round = 1; round <= ROUNDS; round++) {
    const candidates: Policy[] = [
      { ...champion, id: `champion-r${round}` },
      ...Array.from({ length: 5 }).map((_, i) => mutate(champion, i + 1))
    ];

    const quickGames = Math.max(200, Math.floor(GAMES_PER_ROUND / 5));
    let bestCandidate = candidates[0]!;
    let bestFitness = -Infinity;

    for (const c of candidates) {
      const m = evaluate(c, quickGames, round);
      if (m.fitness > bestFitness) {
        bestFitness = m.fitness;
        bestCandidate = c;
      }
    }

    const full = evaluate(bestCandidate, GAMES_PER_ROUND, round);
    appendRoundDoc(full);

    champion = { ...bestCandidate, id: `champion-r${round}` };
    savePolicySnapshot(round, champion, full);

    console.log(
      `Round ${round}/${ROUNDS} | hu=${(full.huRate * 100).toFixed(1)}% | draw=${(full.drawRate * 100).toFixed(1)}% | last=${(full.lastPlayerRate * 100).toFixed(1)}% | fit=${full.fitness.toFixed(2)}`
    );
  }

  console.log('✅ 训练完成');
  console.log(`📄 文档已写入: ${OUT_FILE}`);
  console.log(`🧩 当前最优参数: ${BEST_POLICY_FILE}`);
  console.log(`🗂️ 每轮参数快照目录: ${POLICY_DIR}`);
}

main().catch((e) => {
  console.error('训练失败:', e?.message || e);
  process.exit(1);
});
