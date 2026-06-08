/**
 * bug:9588 — 万子混一色 + 捉冲 6 条
 *
 * 现象: AK 手牌原本是万+风(混一色),剩一张 9 万等待; 对方弃 6 条,AK 捉冲 6 条后系统误判可以胡
 *
 * 根因: canWinByProjectRuleNoWild 在 concealedNonFlower.length === 2(捉冲状态 1张原牌+1张捉冲牌)
 *       且完整手牌多门(numSuitCount >= 2)时,走到末尾的 isGarbageMultiSuitsWithSequenceProjectRule
 *       兜底检查,但该函数对 2 张 concealed 计算 m=0, canFormOnlyTripletsFrom(2,0) 返回 true
 *       (0 面子 = 1 对子),误判非垃圾胡,最终 canWin 返回 true → 错误允许胡牌
 *
 * 修复: canWinByProjectRuleNoWild 末尾:
 *       1) concealed=2 且 numSuitCount >= 2 → 直接 return false(完整牌不是任何目标牌型)
 *       2) 兜底检查改用完整 hand(concealed+exposed)而非只 concealedNonFlower
 */
import { canWin } from '../server/utils/handValidator'
import {
  Meld,
  MeldType,
  Tile,
  TileSuit,
} from '../server/types/game'

let passed = 0
let failed = 0

function ok(name: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`PASS ${name}`)
    passed++
  } else {
    console.log(`FAIL ${name}${detail ? ` :: ${detail}` : ''}`)
    failed++
  }
}

function tile(suit: TileSuit, value: number, id: string): Tile {
  return { suit, value, id, isFlower: suit === TileSuit.FLOWER }
}

function seq(suit: TileSuit, start: number, prefix: string): Tile[] {
  return [
    tile(suit, start, `${prefix}-${start}`),
    tile(suit, start + 1, `${prefix}-${start + 1}`),
    tile(suit, start + 2, `${prefix}-${start + 2}`),
  ]
}

// 模拟 AK 混一色手牌:
//   exposed: 万1-2-3 + 万4-5-6 + 万7-8-9 + 风东刻 + 风南刻(4组面子,模拟前4组)
//   concealed (捉冲前): 9万
//   捉冲牌: 6条
//   完整手牌 = 9万+6条+exposed(万+东南) = {万, 条, 东南} 三门 → 不应该是任何胡牌牌型
function buildHand() {
  const exposed: Meld[] = [
    { type: MeldType.SEQUENCE, tiles: seq(TileSuit.CHARACTERS, 1, 'm1'), isConcealed: false, fromPlayerId: 'p1' },
    { type: MeldType.SEQUENCE, tiles: seq(TileSuit.CHARACTERS, 4, 'm2'), isConcealed: false, fromPlayerId: 'p1' },
    { type: MeldType.SEQUENCE, tiles: seq(TileSuit.CHARACTERS, 7, 'm3'), isConcealed: false, fromPlayerId: 'p1' },
    { type: MeldType.TRIPLET, tiles: [
        tile(TileSuit.WIND, 1, 'east1'),
        tile(TileSuit.WIND, 1, 'east2'),
        tile(TileSuit.WIND, 1, 'east3'),
      ], isConcealed: false, fromPlayerId: 'p1' },
  ]
  const concealed: Tile[] = [
    tile(TileSuit.CHARACTERS, 9, 'c9w'),
    tile(TileSuit.BAMBOOS, 6, 'c6t'), // 捉冲 6 条
  ]
  return { concealed, exposed }
}

console.log('=== bug:9588 混一色捉冲误判 ===')

// 1. 万+风 exposed + concealed [9万, 6条] → 不应胡
{
  const { concealed, exposed } = buildHand()
  const result = canWin(concealed, exposed, null)
  ok(
    '万+风 exposed + concealed [9万, 6条] 不可胡',
    result.canWin === false,
    `canWin=${result.canWin} types=[${result.types.join(',')}]`
  )
}

// 2. 反例: 万+风 exposed + concealed [9万, 9万] → 万子混一色碰碰胡大吊 → 应该胡
{
  const exposed: Meld[] = [
    { type: MeldType.SEQUENCE, tiles: seq(TileSuit.CHARACTERS, 1, 'm1'), isConcealed: false, fromPlayerId: 'p1' },
    { type: MeldType.SEQUENCE, tiles: seq(TileSuit.CHARACTERS, 4, 'm2'), isConcealed: false, fromPlayerId: 'p1' },
    { type: MeldType.SEQUENCE, tiles: seq(TileSuit.CHARACTERS, 7, 'm3'), isConcealed: false, fromPlayerId: 'p1' },
    { type: MeldType.TRIPLET, tiles: [
        tile(TileSuit.WIND, 1, 'east1'),
        tile(TileSuit.WIND, 1, 'east2'),
        tile(TileSuit.WIND, 1, 'east3'),
      ], isConcealed: false, fromPlayerId: 'p1' },
  ]
  // 9万+9万 是大吊捉冲(等 9万来自他人,2张同张)→ 混碰 捉冲
  const concealed: Tile[] = [
    tile(TileSuit.CHARACTERS, 9, 'c9w1'),
    tile(TileSuit.CHARACTERS, 9, 'c9w2'),
  ]
  const result = canWin(concealed, exposed, null)
  ok(
    '万+风 exposed + concealed [9万, 9万] 混碰应可胡',
    result.canWin === true,
    `canWin=${result.canWin} types=[${result.types.join(',')}]`
  )
}

// 3. 反例: 万 exposed 3 顺子 + concealed [7,8,9,9,9] → 清一色 → 应胡
{
  // exposed 3 顺子 = 9 张万, concealed 5 张万 (78999) = 14 张
  // 完整牌 14 张万子: 3 顺子(exposed) + 1 顺子(789) + 1 刻(999) = 4 顺子+1 刻 → 清一色碰碰胡
  const exposed: Meld[] = [
    { type: MeldType.SEQUENCE, tiles: seq(TileSuit.CHARACTERS, 1, 'm1'), isConcealed: false, fromPlayerId: 'p1' },
    { type: MeldType.SEQUENCE, tiles: seq(TileSuit.CHARACTERS, 4, 'm2'), isConcealed: false, fromPlayerId: 'p1' },
    { type: MeldType.SEQUENCE, tiles: seq(TileSuit.CHARACTERS, 7, 'm3'), isConcealed: false, fromPlayerId: 'p1' },
  ]
  // 修正: concealed = 78999 -> 5 张 -> 1 顺子(789) + 1 刻(999) = 2 刻子+ 0 对
  // 但是胡牌型需要 3n+2 格式 (n=4 面子+1对) = 14 张 必须是 (12 + 2)
  // exposed 3 顺子 = 9 张 (3 面子), concealed 需 5 张 (1 面子 + 1 对) = 4 面子 + 1 对
  // 78999 -> 1 顺(789) + 1 刻(999)? 不对, 99 + 9 = 3张, 7+8+9 = 3张 = 1 顺子
  // -> 99 刻子(3) + 789 顺子(3) = 6 张 - 实际 5 张不可能凑成 1 刻子 + 1 顺子
  // 改: concealed 5 张 -> 1 顺(123) + 1 对(99) = 5 张
  const concealed: Tile[] = [
    tile(TileSuit.CHARACTERS, 1, 'c1w'),
    tile(TileSuit.CHARACTERS, 2, 'c2w'),
    tile(TileSuit.CHARACTERS, 3, 'c3w'),
    tile(TileSuit.CHARACTERS, 9, 'c9w1'),
    tile(TileSuit.CHARACTERS, 9, 'c9w2'),
  ]
  const result = canWin(concealed, exposed, null)
  ok(
    '万 exposed 3 顺 + concealed [12399] 清一色应可胡',
    result.canWin === true,
    `canWin=${result.canWin} types=[${result.types.join(',')}]`
  )
}

// 4. 反例: 捉冲状态 concealed=2 但单门多张 + exposed 同门 → 完整牌单门 → 应胡
{
  const exposed: Meld[] = [
    { type: MeldType.SEQUENCE, tiles: seq(TileSuit.CHARACTERS, 1, 'm1'), isConcealed: false, fromPlayerId: 'p1' },
    { type: MeldType.SEQUENCE, tiles: seq(TileSuit.CHARACTERS, 4, 'm2'), isConcealed: false, fromPlayerId: 'p1' },
    { type: MeldType.SEQUENCE, tiles: seq(TileSuit.CHARACTERS, 7, 'm3'), isConcealed: false, fromPlayerId: 'p1' },
  ]
  // concealed = [9万, 9万] (捉冲状态,原 9万 + 捉冲 9万) → 大吊,完整牌清一色 → 应胡
  const concealed: Tile[] = [
    tile(TileSuit.CHARACTERS, 9, 'c9w1'),
    tile(TileSuit.CHARACTERS, 9, 'c9w2'),
  ]
  const result = canWin(concealed, exposed, null)
  ok(
    '万 exposed + concealed [9万, 9万] 大吊清一色应可胡',
    result.canWin === true,
    `canWin=${result.canWin} types=[${result.types.join(',')}]`
  )
}

console.log(`\n=== Total: ${passed} passed, ${failed} failed ===`)
if (failed > 0) process.exit(1)
