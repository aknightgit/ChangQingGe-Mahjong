/**
 * 长清阁麻将 - AI模拟训练（简化版）
 * 跑N局，找最大输赢家
 */

import { createDeck, shuffleTiles, sortTiles, isFlower, tilesEqual, groupTiles, getTileDisplayName } from './server/utils/tiles';
import { canWin, detectHandTypes, HandType } from './server/utils/handValidator';
import { calculateScore } from './server/utils/scoring';
import { Tile, TileSuit, MeldType } from './server/types/game';

const TOTAL = parseInt(process.argv[2]) || 50;
const NAMES = ['K哥', 'AI东', 'AI西', 'AI北'];

function simOne(n: number) {
  const wall = shuffleTiles(createDeck());
  const hands: Tile[][] = [[], [], [], []];
  const melds: any[][] = [[], [], [], []];
  const flowers: Tile[][] = [[], [], [], []];
  const scores = [0, 0, 0, 0];
  const alive = [true, true, true, true];
  let cur = 0;
  let rounds = 0;
  let winners = 0;
  let reason = '流局';

  // 百搭
  const wildSuit = TileSuit.DOTS;
  const wildVal = Math.floor(Math.random() * 9) + 1;

  function draw(p: number) {
    if (!wall.length) return false;
    const t = wall.pop()!;
    if (isFlower(t)) { flowers[p].push(t); return draw(p); }
    hands[p].push(t);
    return true;
  }

  // 发牌
  for (let r = 0; r < 13; r++) for (let p = 0; p < 4; p++) draw(p);
  draw(0);
  for (let p = 0; p < 4; p++) hands[p] = sortTiles(hands[p]);

  // 模拟
  while (rounds < 300 && wall.length > 0 && winners < 3) {
    if (!alive[cur]) { cur = (cur + 1) % 4; rounds++; continue; }

    if (hands[cur].length === 13) { draw(cur); hands[cur] = sortTiles(hands[cur]); }
    if (!hands[cur].length) { cur = (cur + 1) % 4; rounds++; continue; }

    // 检查自摸
    const mc = melds[cur].length;
    const wc = canWin(hands[cur], mc);
    if (wc.canWin && Math.random() < 0.85) {
      const ht = detectHandTypes(hands[cur], melds[cur].map((m: any) => ({type: MeldType.TRIPLET, tiles: m.tiles, isConcealed: false})), true, flowers[cur].length, null);
      const sr = calculateScore({
        handTiles: hands[cur],
        exposedMelds: melds[cur].map((m: any) => ({type: MeldType.TRIPLET, tiles: m.tiles, isConcealed: false})),
        flowerTiles: flowers[cur], handTypes: ht, isSelfDrawn: true, isKongFlower: false, isRobbingKong: false, isMenQing: !melds[cur].length,
        wildTileSuit: wildSuit, wildTileValue: wildVal, roundMultiplier: 1, globalMultiplier: 1
      });
      scores[cur] += sr.finalPoints * 3;
      for (let i = 0; i < 4; i++) if (i !== cur) scores[i] -= sr.finalPoints;
      alive[cur] = false; winners++;
      reason = '自摸(' + sr.handTypeName + ')';
      if (winners >= 3) break;
      cur = (cur + 1) % 4; rounds++; continue;
    }

    // 打牌
    const di = hands[cur].length - 1;
    const disc = hands[cur][di];
    hands[cur].splice(di, 1);

    // 检查放冲
    let claimed = false;
    for (let o = 1; o <= 3 && !claimed; o++) {
      const oi = (cur + o) % 4;
      if (!alive[oi]) continue;
      const testH = [...hands[oi], disc];
      const ow = canWin(testH, melds[oi].length);
      if (ow.canWin && Math.random() < 0.6) {
        const ht = detectHandTypes(testH, melds[oi].map((m: any) => ({type: MeldType.TRIPLET, tiles: m.tiles, isConcealed: false})), false, flowers[oi].length, null);
        const sr = calculateScore({
          handTiles: testH, exposedMelds: melds[oi].map((m: any) => ({type: MeldType.TRIPLET, tiles: m.tiles, isConcealed: false})),
          flowerTiles: flowers[oi], handTypes: ht, isSelfDrawn: false, isKongFlower: false, isRobbingKong: false, isMenQing: !melds[oi].length,
          wildTileSuit: wildSuit, wildTileValue: wildVal, roundMultiplier: 1, globalMultiplier: 1
        });
        scores[oi] += sr.finalPoints;
        scores[cur] -= sr.finalPoints;
        alive[oi] = false; winners++;
        reason = '放冲(' + sr.handTypeName + ')';
        claimed = true;
        if (winners >= 3) break;
      }
    }

    cur = (cur + 1) % 4;
    rounds++;
  }

  if (!winners) reason = wall.length ? '超时' : '牌完';

  const result = { n, winners: [] as any[], pot: 0, rounds, reason };
  for (let i = 0; i < 4; i++) {
    if (!alive[i]) {
      result.winners.push({ name: NAMES[i], pts: scores[i], tiles: [...hands[i], ...melds[i].flatMap((m: any) => m.tiles)].map(t => getTileDisplayName(t)) });
    }
    result.pot += Math.abs(scores[i]);
  }
  return result;
}

// 跑N局
console.log(`🀄 模拟 ${TOTAL} 局...\n`);
const start = Date.now();
const all: any[] = [];
for (let i = 0; i < TOTAL; i++) {
  try { all.push(simOne(i + 1)); } catch(e: any) { console.error(`局${i+1}出错: ${e.message}`); }
}
const sec = ((Date.now() - start) / 1000).toFixed(1);

console.log(`\n✅ 完成 ${all.length}/${TOTAL} 局，${sec}s\n`);

// 统计
const w = all.flatMap(r => r.winners);
const types: Record<string, number> = {};
w.forEach(x => {
  const m = x.tiles.length > 0 ? '有牌' : '无牌';
  types[m] = (types[m] || 0) + 1;
});

console.log('📊 统计:');
console.log(`  胡牌: ${all.filter(r => r.winners.length > 0).length}`);
console.log(`  流局: ${all.filter(r => !r.winners.length).length}`);
console.log(`  平均回合: ${(all.reduce((s, r) => s + r.rounds, 0) / all.length).toFixed(0)}`);

// 最大输赢
const best = [...all].sort((a, b) => b.pot - a.pot)[0];
if (best) {
  console.log(`\n💰 最大输赢局 #${best.n}:`);
  console.log(`  ${best.reason} | 筹码${best.pot} | ${best.rounds}回合`);
  best.winners.forEach((w: any) => console.log(`  🏅 ${w.name} +${w.pts}: ${w.tiles.join(' ')}`));
}
