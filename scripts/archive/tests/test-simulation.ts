/**
 * 长清阁麻将 - AI模拟训练（增强版）
 *
 * 目标：
 * 1) 批量模拟对局（默认100局，可传1000）
 * 2) 找到输赢最大的一局
 * 3) 输出完整明细：所有胡牌玩家、牌面、百搭、三口关系、逐笔结算
 *
 * 用法：
 *   npx tsx test-simulation.ts 100
 *   npx tsx test-simulation.ts 1000
 */

import { createDeck, shuffleTiles, sortTiles, isFlower, tilesEqual, getTileDisplayName } from './server/utils/tiles';
import { canWin, detectHandTypes, buildWildTileChecker } from './server/utils/handValidator';
import { calculateScore } from './server/utils/scoring';
import { Tile, TileSuit, Meld, MeldType } from './server/types/game';

const TOTAL = parseInt(process.argv[2] || '100', 10);
const PLAYER_NAMES = ['K哥', 'AI东', 'AI西', 'AI北'];

type PlayerStatus = 'playing' | 'won';
type WinMode = '自摸' | '放冲' | '抢杠';
type RelationType = '三口' | '四口';

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
  winners: WinDetail[];
  losers: Array<{ name: string; score: number }>;
  relations: Relation[];
  settlementDetails: string[];
  totalPot: number;
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

function keepScore(hand: Tile[], tile: Tile, isWild: (t: Tile) => boolean): number {
  if (isWild(tile)) return 999;

  let score = 0;
  const same = hand.filter(t => t.suit === tile.suit && t.value === tile.value).length;
  score += same * 4;

  const isNum = [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS].includes(tile.suit);
  if (isNum) {
    const near = hand.filter(t =>
      t.suit === tile.suit && Math.abs(t.value - tile.value) <= 2 && t.id !== tile.id
    ).length;
    score += near * 2;
  } else {
    // 字牌偏向留对子
    if (same >= 2) score += 2;
  }

  return score;
}

function pickDiscard(hand: Tile[], isWild: (t: Tile) => boolean): Tile {
  let best = hand[0]!;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const t of hand) {
    const s = keepScore(hand, t, isWild);
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
        player.hand.push(tile); // 百搭花牌进手牌
        player.hand = sortTiles(player.hand);
        return true;
      }
      player.flowers.push(tile); // 普通花牌进门口并继续补
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
  from?: string
): { detail: WinDetail; points: number } {
  const handTypes = detectHandTypes(
    handForCalc,
    player.melds,
    winMode === '自摸',
    player.flowers.length,
    wildTileId,
    wildGroup || undefined
  );

  const score = calculateScore({
    handTiles: handForCalc,
    exposedMelds: player.melds,
    flowerTiles: player.flowers,
    handTypes,
    isSelfDrawn: winMode === '自摸',
    isKongFlower: false,
    isRobbingKong: winMode === '抢杠',
    isMenQing: player.melds.every(m => m.type !== MeldType.SEQUENCE && m.type !== MeldType.TRIPLET),
    wildTileSuit: wildSuit,
    wildTileValue: wildValue,
    wildTileGroup: wildGroup || undefined,
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
      melds: player.melds.map(toMeldText),
      flowers: player.flowers.map(getTileDisplayName),
      from
    },
    points: score.finalPoints
  };
}

function simulateOne(gameNum: number): GameRecord {
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

  // 互包计数：claimer -> source -> count
  const bailout = new Map<string, Map<string, number>>();
  const settlementDetails: string[] = [];

  // 发牌
  for (let r = 0; r < 13; r++) {
    for (let p = 0; p < 4; p++) drawTile(players[p]!, wall, isWild);
  }
  drawTile(players[0]!, wall, isWild); // 庄家14张

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

    // 确保当前玩家先摸后打（13摸到14）
    if (player.hand.length % 3 !== 2) {
      const ok = drawTile(player, wall, isWild);
      if (!ok) {
        reason = '牌墙摸完流局';
        break;
      }
    }

    // 自摸检测
    const selfWin = canWin(player.hand, player.melds.length, isWild);
    if (selfWin.canWin && Math.random() < 0.9) {
      const { detail, points } = buildWinDetail(player, '自摸', [...player.hand], wildTileId, wildGroup, wildSuit, wildValue);
      player.winDetail = detail;
      player.status = 'won';

      // 自摸结算（含三口/四口）
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

    // 打牌
    const discard = pickDiscard(player.hand, isWild);
    removeTile(player.hand, discard);

    // 放冲检测（一炮多响）
    const huCandidates: Array<{ idx: number; points: number; detail: WinDetail }> = [];
    for (let step = 1; step <= 3; step++) {
      const i = (player.index + step) % 4;
      const other = players[i]!;
      if (other.status !== 'playing') continue;

      const testHand = sortTiles([...other.hand, discard]);
      const can = canWin(testHand, other.melds.length, isWild);
      if (!can.canWin) continue;

      // AI决策：有机会就胡（高胜率导向）
      if (Math.random() < 0.92) {
        const built = buildWinDetail(other, '放冲', testHand, wildTileId, wildGroup, wildSuit, wildValue, player.name);
        huCandidates.push({ idx: i, points: built.points, detail: built.detail });
      }
    }

    if (huCandidates.length > 0) {
      // 一炮多响：全部结算
      for (const c of huCandidates) {
        const winner = players[c.idx]!;
        winner.status = 'won';
        winner.winDetail = c.detail;

        // 放冲者
        const rel = relationBetween(bailout, player.index, winner.index);
        const discarderMult = rel ? 2 : 1; // 互包双方互放冲 ×2
        const discarderPay = c.points * discarderMult;
        player.score -= discarderPay;
        winner.score += discarderPay;
        settlementDetails.push(`[放冲] ${player.name} -> ${winner.name} : ${discarderPay} (${c.points}x${discarderMult})`);

        // 第三方互包输家额外赔1倍
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

      // 从首个胡家右手继续
      const firstWinner = huCandidates
        .map(c => c.idx)
        .sort((a, b) => ((a - player.index + 4) % 4) - ((b - player.index + 4) % 4))[0]!;
      current = nextPlaying(players, firstWinner);
      rounds++;
      continue;
    }

    // 无人胡 -> 碰/杠（优先）
    let claimed = false;
    for (let step = 1; step <= 3 && !claimed; step++) {
      const i = (player.index + step) % 4;
      const other = players[i]!;
      if (other.status !== 'playing') continue;

      const same = other.hand.filter(t => tilesEqual(t, discard));

      // 明杠（优先于碰）
      if (same.length >= 3 && Math.random() < 0.18) {
        const use = same.slice(0, 3);
        for (const t of use) removeTile(other.hand, t);
        other.melds.push({ type: MeldType.KONG, tiles: [discard, ...use], isConcealed: false });
        addBailoutCount(bailout, other.index, player.index);

        // 明杠后补牌
        drawTile(other, wall, isWild);
        current = other.index;
        claimed = true;
        break;
      }

      // 碰
      if (same.length >= 2 && Math.random() < 0.42) {
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

    // 吃（仅下家）
    const down = nextPlaying(players, player.index);
    const downPlayer = players[down]!;
    if (downPlayer.status === 'playing') {
      const seqs = findChowSequences(downPlayer.hand, discard);
      if (seqs.length > 0 && Math.random() < 0.33) {
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

    // 正常过牌
    current = nextPlaying(players, player.index);
    rounds++;
  }

  if (rounds >= maxRounds) {
    reason = '超时流局';
  } else if (reason === '流局' && wall.length === 0) {
    reason = '牌墙摸完流局';
  }

  const winners = players.filter(p => p.status === 'won' && p.winDetail).map(p => p.winDetail!)
  const losers = players.filter(p => p.status !== 'won').map(p => ({ name: p.name, score: p.score }));
  const totalPot = players.reduce((s, p) => s + Math.abs(p.score), 0);

  return {
    gameNum,
    wildTile: wildTileId,
    wildGroup,
    rounds,
    reason,
    winners,
    losers,
    relations: getRelations(bailout),
    settlementDetails,
    totalPot
  };
}

function printBiggest(record: GameRecord) {
  console.log(`\n💥 输赢最大局：第 ${record.gameNum} 局`);
  console.log(`  原因: ${record.reason}`);
  console.log(`  回合: ${record.rounds}`);
  console.log(`  百搭: ${record.wildTile}${record.wildGroup ? ` (组:${record.wildGroup.join('/')})` : ''}`);
  console.log(`  总筹码: ${record.totalPot}`);

  console.log('\n🏆 所有胡牌玩家明细:');
  if (record.winners.length === 0) {
    console.log('  (本局无人胡牌)');
  } else {
    for (const w of record.winners) {
      console.log(`  - ${w.name} | ${w.winMode}${w.from ? ` <- ${w.from}` : ''} | ${w.handType}`);
      console.log(`    番数: base=${w.baseFan}, final=${w.finalPoints}`);
      console.log(`    手牌: ${w.handTiles.join(' ')}`);
      console.log(`    门口: ${w.melds.length ? w.melds.join(' ; ') : '(无)'}`);
      console.log(`    花牌: ${w.flowers.length ? w.flowers.join(' ') : '(无)'}`);
    }
  }

  console.log('\n🤝 三口/四口关系:');
  if (record.relations.length === 0) {
    console.log('  (无)');
  } else {
    for (const r of record.relations) {
      console.log(`  - ${r.player1} <-> ${r.player2} : ${r.type} (A->B:${r.aToB}, B->A:${r.bToA})`);
    }
  }

  console.log('\n🧾 结算明细:');
  if (record.settlementDetails.length === 0) {
    console.log('  (无)');
  } else {
    for (const d of record.settlementDetails) {
      console.log(`  - ${d}`);
    }
  }

  console.log('\n📉 未胡玩家分数:');
  if (record.losers.length === 0) {
    console.log('  (无)');
  } else {
    for (const l of record.losers) {
      console.log(`  - ${l.name}: ${l.score}`);
    }
  }
}

console.log(`🀄 开始模拟 ${TOTAL} 局（增强版）...\n`);

const all: GameRecord[] = [];
const start = Date.now();

for (let i = 1; i <= TOTAL; i++) {
  try {
    all.push(simulateOne(i));
  } catch (e: any) {
    console.error(`第${i}局异常: ${e?.message || e}`);
  }
  if (i % 100 === 0 || i === TOTAL) {
    process.stdout.write(`  完成 ${i}/${TOTAL} 局\r`);
  }
}

const sec = ((Date.now() - start) / 1000).toFixed(1);

const winGames = all.filter(g => g.winners.length > 0).length;
const drawGames = all.length - winGames;
const avgRounds = all.length ? (all.reduce((s, g) => s + g.rounds, 0) / all.length).toFixed(1) : '0';

console.log(`\n\n✅ 训练完成：${all.length}/${TOTAL} 局，耗时 ${sec}s`);
console.log(`📊 摘要：胡牌局 ${winGames}，流局 ${drawGames}，平均回合 ${avgRounds}`);

if (all.length > 0) {
  const biggest = [...all].sort((a, b) => b.totalPot - a.totalPot)[0]!;
  printBiggest(biggest);
}
