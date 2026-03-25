import fs from 'fs';
import path from 'path';

import { createDeck, shuffleTiles, sortTiles, isFlower, tilesEqual, getTileDisplayName } from './server/utils/tiles';
import { canWin, detectHandTypes, buildWildTileChecker } from './server/utils/handValidator';
import { calculateScore, calculateRoundMultiplier } from './server/utils/scoring';
import { Tile, TileSuit, Meld, MeldType } from './server/types/game';

const ROUNDS = parseInt(process.argv[2] || '20', 10);
const GAMES_PER_ROUND = parseInt(process.argv[3] || '1000', 10);
const PROJECT_TRAINING_DIR = path.join(process.cwd(), 'training-output');
const OUT_DIR = PROJECT_TRAINING_DIR;
const RUN_TAG = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_FILE = path.join(OUT_DIR, `ai-training-log-${RUN_TAG}.md`);
const POLICY_DIR = path.join(OUT_DIR, 'policies', RUN_TAG);
const BEST_POLICY_FILE = path.join(OUT_DIR, `best-policy-${RUN_TAG}.json`);
const BEST_POLICY_LATEST = path.join(OUT_DIR, 'best-policy.json');

// 同步保存到项目目录 training-output（用于审核）
const PROJECT_BEST_POLICY_FILE = path.join(PROJECT_TRAINING_DIR, `best-policy-${RUN_TAG}.json`);
const PROJECT_BEST_POLICY_LATEST = path.join(PROJECT_TRAINING_DIR, 'best-policy.json');

const PLAYER_NAMES = ['K哥', '小胖', '老赵', '阿水'];

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

  // 百搭多时更积极建立三口/四口（偏向吃碰，不急着胡）
  bailoutBuildWildBoost: number;
  bailoutHuPenaltyPerMeld: number;

  // 起手风箭多时倾向做风一色
  honorRushThreshold: number;
  honorRushBoost: number;

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
  isMenQing: boolean;
}

interface PlayerState {
  index: number;
  name: string;
  hand: Tile[];
  melds: Meld[];
  flowers: Tile[];
  status: PlayerStatus;
  score: number;
  initialHonorCount: number; // 起手风向箭牌数
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
  diceMultiplier: number;
  flowMultiplier: number;      // 流局倍数（造反也算）
  inheritMultiplier: number;   // 继承倍数（上把全局倍数，含封顶后台继承因子）
  globalRawCarryAtStart: number;
  globalMultiplierAtStart: number;
  prevRoundWasDraw: boolean;
  prevRoundHadRebel: boolean;
  winners: WinDetail[];
  losers: Array<{ name: string; score: number }>;
  relations: Relation[];
  settlementDetails: string[];
  totalPot: number;
  worstLoser: { name: string; score: number } | null;
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
  selfDrawRate: number;
  bigHandRate: number;
  avgWinnerPoints: number;
  menQingRate: number;
  fitness: number;
  worstGame: GameRecord;
}

interface TrainingContext {
  prevRoundWasDraw: boolean;
  prevRoundHadRebel: boolean;
  globalMultiplierRawCarry: number; // 不封顶原始继承倍数，用于“8倍封顶但翻倍因子继续传递”
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
    selfWinChance: 0.96,
    selfWinWildBoost: 0.06,

    // 降低放冲胡惩罚幅度，避免“该胡不胡”导致高流局
    discardHuChance: 0.9,
    discardHuWildPenalty: 0.08,
    discardHuMenQingPenalty: 0.02,

    pengChance: 0.5,
    kongChance: 0.24,
    chowChance: 0.3,
    pengWildBoost: 0.2,
    kongWildBoost: 0.24,
    chowWildPenalty: 0.08,

    bailoutBuildWildBoost: 0.12,
    bailoutHuPenaltyPerMeld: 0.02,

    honorRushThreshold: 5,
    honorRushBoost: 0.2,

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

    bailoutBuildWildBoost: clamp(base.bailoutBuildWildBoost + rnd(-0.08, 0.08), 0, 0.45),
    bailoutHuPenaltyPerMeld: clamp(base.bailoutHuPenaltyPerMeld + rnd(-0.05, 0.05), 0, 0.3),

    honorRushThreshold: Math.round(clamp(base.honorRushThreshold + rnd(-1, 1), 2, 8)),
    honorRushBoost: clamp(base.honorRushBoost + rnd(-0.08, 0.08), 0, 0.45),

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

function keepScore(hand: Tile[], tile: Tile, isWild: (t: Tile) => boolean, policy: Policy, honorRush = false): number {
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

  // 起手风箭多时，倾向做风一色：强留风箭，弱留数牌
  const isHonor = tile.suit === TileSuit.WIND || tile.suit === TileSuit.DRAGON;
  if (honorRush) {
    if (isHonor) {
      score += policy.honorRushBoost * 10;
    } else {
      score -= policy.honorRushBoost * 6;
    }
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

function pickDiscard(hand: Tile[], isWild: (t: Tile) => boolean, policy: Policy, honorRush = false): Tile {
  let best = hand[0]!;
  let bestScore = Number.POSITIVE_INFINITY;
  for (const t of hand) {
    const s = keepScore(hand, t, isWild, policy, honorRush);
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

function mapDisplayHandType(rawName: string, handTypes: string[]): string {
  if (rawName === '普通胡') {
    // 仅内部验证牌型，不显示“普通胡”文案
    if (handTypes.length > 0) {
      return handTypes[0];
    }
    return '基础胡(内部验证)';
  }
  return rawName;
}

function buildWinDetail(
  player: PlayerState,
  winMode: WinMode,
  handForCalc: Tile[],
  wildTileId: string,
  wildGroup: string[] | null,
  wildSuit: TileSuit,
  wildValue: number,
  diceMultiplier: number,
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

  // 规则约束：普通胡/七对属于内部验证，不再以“普通胡”文案展示

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
    roundMultiplier: diceMultiplier,
    globalMultiplier
  });

  const displayHandType = mapDisplayHandType(score.handTypeName, handTypes as unknown as string[]);

  const isMenQing = player.melds.every(m => m.type !== MeldType.SEQUENCE && m.type !== MeldType.TRIPLET);

  return {
    detail: {
      name: player.name,
      winMode,
      handType: displayHandType,
      baseFan: score.baseFan,
      finalPoints: score.finalPoints,
      handTiles: sortTiles([...handForCalc]).map(getTileDisplayName),
      melds: player.melds.map(toMeldText),
      flowers: player.flowers.map(getTileDisplayName),
      from,
      isMenQing
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
    score: 0,
    initialHonorCount: 0
  }));

  const { wildTileId, wildGroup, wildSuit, wildValue } = pickWild();
  const isWild = buildWildTileChecker(wildTileId, wildGroup || undefined);

  // 本局倍数上下文
  const dice1 = Math.floor(Math.random() * 6) + 1;
  const dice2 = Math.floor(Math.random() * 6) + 1;
  const diceMultiplier = calculateRoundMultiplier(dice1, dice2);

  // 命名统一：
  // 全局倍数 = min(8, 骰子倍数 × 流局倍数(造反也算) × 继承倍数)
  const flowMultiplier = (ctx.prevRoundWasDraw || ctx.prevRoundHadRebel) ? 2 : 1;
  const globalRawCarryAtStart = Math.max(1, ctx.globalMultiplierRawCarry);
  const inheritMultiplier = Math.max(1, Math.floor(globalRawCarryAtStart / flowMultiplier));
  const globalMultiplierAtStart = Math.min(8, diceMultiplier * flowMultiplier * inheritMultiplier);

  // 传给计分器：回合=骰子倍数；全局=流局倍数*继承倍数
  const globalBaseForScore = flowMultiplier * inheritMultiplier;

  const bailout = new Map<string, Map<string, number>>();
  const settlementDetails: string[] = [];

  for (let r = 0; r < 13; r++) {
    for (let p = 0; p < 4; p++) drawTile(players[p]!, wall, isWild);
  }
  drawTile(players[0]!, wall, isWild);

  // 记录起手风/箭数量
  for (const p of players) {
    p.initialHonorCount = p.hand.filter(t => t.suit === TileSuit.WIND || t.suit === TileSuit.DRAGON).length;
  }

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
    const honorRush = player.initialHonorCount >= policy.honorRushThreshold;
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
        diceMultiplier,
        globalBaseForScore
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

    const discard = pickDiscard(player.hand, isWild, policy, honorRush);
    removeTile(player.hand, discard);

    const huCandidates: Array<{ idx: number; points: number; detail: WinDetail }> = [];
    for (let step = 1; step <= 3; step++) {
      const i = (player.index + step) % 4;
      const other = players[i]!;
      if (other.status !== 'playing') continue;

      const testHand = sortTiles([...other.hand, discard]);
      const can = canWin(testHand, other.melds.length, isWild);
      if (!can.canWin) continue;

      // 策略：偏向自摸不捉冲；百搭越多越贪大牌；为三口/四口构建让路
      const otherWildCount = other.hand.filter(t => isWild(t)).length;
      const hasOpenMeld = other.melds.some(m => m.type === MeldType.SEQUENCE || m.type === MeldType.TRIPLET);
      let huOnDiscardChance = policy.discardHuChance;
      huOnDiscardChance -= otherWildCount * policy.discardHuWildPenalty;
      if (!hasOpenMeld) huOnDiscardChance -= policy.discardHuMenQingPenalty;

      // 已有副露越多，越倾向继续做三口/四口，不急着捉冲
      const bailoutBuildPressure = other.melds.length * policy.bailoutHuPenaltyPerMeld;
      huOnDiscardChance -= bailoutBuildPressure;

      // 起手风箭多：更倾向风一色，自摸优先，降低捉冲
      const honorRushOther = other.initialHonorCount >= policy.honorRushThreshold;
      if (honorRushOther) {
        huOnDiscardChance -= policy.honorRushBoost * 0.6;
      }

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
          diceMultiplier,
          globalBaseForScore,
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
      const honorRushOther = other.initialHonorCount >= policy.honorRushThreshold;

      // 百搭越多，越积极吃碰杠建立三口/四口关系
      const bailoutBoost = otherWildCount * policy.bailoutBuildWildBoost;
      let kongChanceNow = clamp(policy.kongChance + otherWildCount * policy.kongWildBoost + bailoutBoost, 0.02, 0.97);
      let pengChanceNow = clamp(policy.pengChance + otherWildCount * policy.pengWildBoost + bailoutBoost, 0.02, 0.97);

      // 风箭开局时减少吃，强化碰杠（冲风一色）
      if (honorRushOther) {
        kongChanceNow = clamp(kongChanceNow + policy.honorRushBoost * 0.4, 0.02, 0.97);
        pengChanceNow = clamp(pengChanceNow + policy.honorRushBoost * 0.6, 0.02, 0.97);
      }

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
      const honorRushDown = downPlayer.initialHonorCount >= policy.honorRushThreshold;
      let chowChanceNow = clamp(policy.chowChance - downWildCount * policy.chowWildPenalty, 0.01, 0.9);
      if (honorRushDown) {
        chowChanceNow = clamp(chowChanceNow - policy.honorRushBoost * 0.8, 0.01, 0.9);
      }
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

  // Find the worst loser (most negative score) across all players
  const worstLoser = players.reduce((worst, p) => {
    if (!worst || p.score < worst.score) return { name: p.name, score: p.score };
    return worst;
  }, null as { name: string; score: number } | null);

  return {
    gameNum,
    wildTile: wildTileId,
    wildGroup,
    rounds,
    reason,
    dice1,
    dice2,
    diceMultiplier,
    flowMultiplier,
    inheritMultiplier,
    globalRawCarryAtStart,
    globalMultiplierAtStart,
    prevRoundWasDraw: ctx.prevRoundWasDraw,
    prevRoundHadRebel: ctx.prevRoundHadRebel,
    winners,
    losers,
    relations: getRelations(bailout),
    settlementDetails,
    totalPot,
    worstLoser
  };
}

function evaluate(policy: Policy, games: number, round: number): RoundMetrics {
  const all: GameRecord[] = [];
  let ctx: TrainingContext = {
    prevRoundWasDraw: false,
    prevRoundHadRebel: false,
    globalMultiplierRawCarry: 1
  };

  for (let i = 1; i <= games; i++) {
    const g = simulateOne(i, policy, ctx);
    all.push(g);

    const isDraw = g.reason.includes('流局');
    const hadRebel = false; // 当前训练器未启用造反动作

    let nextGlobalRaw = ctx.globalMultiplierRawCarry;
    if (isDraw) {
      nextGlobalRaw *= 2;
    } else if (hadRebel) {
      nextGlobalRaw *= 2;
    } else {
      nextGlobalRaw = 1;
    }

    ctx = {
      prevRoundWasDraw: isDraw,
      prevRoundHadRebel: hadRebel,
      globalMultiplierRawCarry: nextGlobalRaw
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

  const winners = all.flatMap(g => g.winners);
  const selfDrawCount = winners.filter(w => w.winMode === '自摸').length;
  const selfDrawRate = winners.length ? selfDrawCount / winners.length : 0;

  const bigHandNames = new Set(['风碰', '风一色', '清碰']);
  const bigHandCount = winners.filter(w => bigHandNames.has(w.handType)).length;
  const bigHandRate = winners.length ? bigHandCount / winners.length : 0;

  // 门清胡牌率
  const menQingCount = winners.filter(w => w.isMenQing).length;
  const menQingRate = winners.length ? menQingCount / winners.length : 0;

  const avgWinnerPoints = winners.length
    ? winners.reduce((s, w) => s + w.finalPoints, 0) / winners.length
    : 0;

  // 目标: 流局率 <=10%（硬约束倾向）
  const drawOverTarget = Math.max(0, drawRate - 0.1);
  const drawUnderTarget = Math.max(0, 0.1 - drawRate);

  // 自摸率惩罚: 目标 0.6-0.7，偏离则惩罚
  const selfDrawTarget = 0.65;
  const selfDrawPenalty = -Math.abs(selfDrawRate - selfDrawTarget) * 500;

  // 大牌率（风碰+风一色+清碰）目标 4-8%，偏离惩罚
  const bigHandTarget = 0.06;
  const bigHandPenalty = -Math.abs(bigHandRate - bigHandTarget) * 400;

  // 门清胡牌率目标 6-10%，偏离惩罚
  const menQingTarget = 0.08;
  const menQingPenalty = -Math.abs(menQingRate - menQingTarget) * 300;

  // 目标: 胡牌率↑, 流局率↓, 最后一人↑, 自摸率0.65, 大牌率6%, 门清8%, 赢家点数↑
  const fitness =
    huRate * 110 -
    drawRate * 180 -
    drawOverTarget * 1200 +
    drawUnderTarget * 160 +
    lastPlayerRate * 150 +
    selfDrawPenalty +
    bigHandPenalty +
    menQingPenalty +
    avgWinnerPoints * 1.0 +
    avgPot / 120;

  // 找最大单人亏损局：每局中找score最低的玩家，然后找所有局中最负的那个
  const worstGame = all.reduce((worst, g) => {
    const gameWorstLoser = g.worstLoser;
    if (!gameWorstLoser) return worst;
    if (!worst || gameWorstLoser.score < worst.score) {
      // Return the whole game record that has the worst loser
      return g;
    }
    return worst;
  }, null as GameRecord | null) || all[0];

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
    selfDrawRate,
    bigHandRate,
    menQingRate,
    avgWinnerPoints,
    fitness,
    worstGame: worstGame!
  };
}

function appendRoundDoc(metrics: RoundMetrics) {
  const now = new Date().toISOString();
  const p = metrics.policy;
  const b = metrics.worstGame;

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
  lines.push(`- 自摸率(胡牌中): ${(metrics.selfDrawRate * 100).toFixed(2)}%`);
  lines.push(`- 大牌率(胡牌中): ${(metrics.bigHandRate * 100).toFixed(2)}%`);
  lines.push(`- 门清胡牌率(胡牌中): ${(metrics.menQingRate * 100).toFixed(2)}%`);
  lines.push(`- 胜者平均最终点: ${metrics.avgWinnerPoints.toFixed(2)}`);
  lines.push(`- Fitness: ${metrics.fitness.toFixed(4)}`);

  lines.push('');
  lines.push('### 本轮最佳策略参数');
  lines.push(`- 参数快照: ${path.join(POLICY_DIR, `round-${String(metrics.round).padStart(3, '0')}.json`)}`);
  lines.push(`- 最新参数: ${BEST_POLICY_LATEST}`);
  lines.push('```json');
  lines.push(JSON.stringify(p, null, 2));
  lines.push('```');

  lines.push('');
  lines.push('### 最大单人亏损局明细（本轮）');
  lines.push(`- 局号: ${b.gameNum}`);
  lines.push(`- 原因: ${b.reason}`);
  lines.push(`- 回合: ${b.rounds}`);
  lines.push(`- 总筹码: ${b.totalPot}`);
  if (b.worstLoser) {
    lines.push(`- 最大亏损玩家: ${b.worstLoser.name} (${b.worstLoser.score})`);
  }
  lines.push(`- 百搭: ${b.wildTile}${b.wildGroup ? ` (组: ${b.wildGroup.join('/')})` : ''}`);
  const combinedGlobal = Math.min(8, b.diceMultiplier * b.flowMultiplier * b.inheritMultiplier);
  lines.push(`- 回合/全局倍数信息:`);
  lines.push(`  - 骰子点数: ${b.dice1} + ${b.dice2}`);
  lines.push(`  - 骰子倍数（清晰明了）: x${b.diceMultiplier}`);
  lines.push(`  - 流局倍数（造反也算）: x${b.flowMultiplier}`);
  lines.push(`  - 继承倍数（上把的全局倍数）: x${b.inheritMultiplier}`);
  lines.push(`  - 全局倍数 = min(8, 骰子倍数（清晰明了） × 流局倍数（造反也算） × 继承倍数（上把的全局倍数）) = x${combinedGlobal}`);
  lines.push(`  - 本局开始全局原始继承倍数(未封顶): x${b.globalRawCarryAtStart}`);
  lines.push(`  - 本局开始全局显示倍数(封顶): x${b.globalMultiplierAtStart}`);
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
  fs.mkdirSync(PROJECT_TRAINING_DIR, { recursive: true });

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
          avgPot: metrics.avgPot,
          selfDrawRate: metrics.selfDrawRate,
          bigHandRate: metrics.bigHandRate,
          menQingRate: metrics.menQingRate,
          avgWinnerPoints: metrics.avgWinnerPoints
        }
      : null,
    policy
  };

  // /data/training
  fs.writeFileSync(BEST_POLICY_FILE, JSON.stringify(payload, null, 2), 'utf8');
  fs.writeFileSync(BEST_POLICY_LATEST, JSON.stringify(payload, null, 2), 'utf8');
  const roundFile = path.join(POLICY_DIR, `round-${String(round).padStart(3, '0')}.json`);
  fs.writeFileSync(roundFile, JSON.stringify(payload, null, 2), 'utf8');

  // 项目目录（真实策略读取）
  fs.writeFileSync(PROJECT_BEST_POLICY_FILE, JSON.stringify(payload, null, 2), 'utf8');
  fs.writeFileSync(PROJECT_BEST_POLICY_LATEST, JSON.stringify(payload, null, 2), 'utf8');
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

function loadSeedPolicy(): Policy | null {
  const candidates = [PROJECT_BEST_POLICY_LATEST, BEST_POLICY_LATEST];

  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    try {
      const raw = fs.readFileSync(file, 'utf8');
      const parsed = JSON.parse(raw);
      const p = parsed?.policy;
      if (!p || typeof p !== 'object') continue;
      return {
        ...makePolicy('seed-from-latest'),
        ...p,
        id: `seed-from-${path.basename(file)}`
      } as Policy;
    } catch {
      // try next
    }
  }

  return null;
}

async function main() {
  ensureDoc();

  console.log(`🧠 开始AI训练: rounds=${ROUNDS}, games/round=${GAMES_PER_ROUND}`);
  console.log(`📝 训练日志输出: ${OUT_FILE}`);
  console.log(`🧩 参数输出(/data): ${BEST_POLICY_FILE}`);
  console.log(`🧩 参数输出(项目): ${PROJECT_BEST_POLICY_FILE}`);

  let champion = loadSeedPolicy() || makePolicy('champion-r0');
  console.log(`🌱 初始策略来源: ${champion.id}`);

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
  console.log(`🧩 当前最优参数(/data): ${BEST_POLICY_FILE}`);
  console.log(`🧩 当前最优参数(项目): ${PROJECT_BEST_POLICY_FILE}`);
  console.log(`🗂️ 每轮参数快照目录: ${POLICY_DIR}`);
}

main().catch((e) => {
  console.error('训练失败:', e?.message || e);
  process.exit(1);
});
