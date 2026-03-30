/**
 * 长清阁麻将 - 完整场景测试用例（破坏性测试）
 * 覆盖：胡牌检测、牌型识别、算番、特殊规则、极端场景
 * 用法: npx tsx scripts/test-scenarios.ts
 */
import { canWin, canWinStandard, canWinSevenPairs, detectHandTypes, HandType, buildWildTileChecker, isTing, getListeningTiles } from '../server/utils/handValidator'
import { calculateScore, generateWinOptions } from '../server/utils/scoring'
import { Tile, TileSuit, MeldType, type Meld } from '../server/types/game'

let passed = 0, failed = 0, bugs: string[] = []

function assert(condition: boolean, label: string) {
  if (condition) { passed++ }
  else { failed++; const msg = `❌ FAIL: ${label}`; console.log(msg); bugs.push(msg) }
}

function T(suit: TileSuit, value: number, id?: string): Tile {
  return { suit, value, id: id || `${suit}-${value}-${Math.random()}`, isFlower: false }
}

function tile(suit: string, value: number): Tile {
  const suitMap: Record<string, TileSuit> = { '筒': TileSuit.DOTS, '万': TileSuit.CHARACTERS, '条': TileSuit.BAMBOOS, '风': TileSuit.WIND, '箭': TileSuit.DRAGON }
  return T(suitMap[suit] || TileSuit.DOTS, value)
}

function meld(type: 'triplet' | 'sequence' | 'kong', suit: string, value: number): Meld {
  const s = { '筒': TileSuit.DOTS, '万': TileSuit.CHARACTERS, '条': TileSuit.BAMBOOS }[suit] || TileSuit.DOTS
  if (type === 'triplet') return { type: MeldType.TRIPLET, tiles: [T(s,value), T(s,value), T(s,value)], isConcealed: false }
  if (type === 'kong') return { type: MeldType.KONG, tiles: [T(s,value), T(s,value), T(s,value), T(s,value)], isConcealed: false }
  return { type: MeldType.SEQUENCE, tiles: [T(s,value), T(s,value+1), T(s,value+2)], isConcealed: false }
}

// ========== 模块1: 胡牌检测 ==========
console.log('\n🔍 模块1: 胡牌检测 (canWin)')

// 1.1 标准胡: 万1万1万1 万2万3万4 万5万6万7 万8万8万8 万9万9
{
  const hand = [
    tile('万',1), tile('万',1), tile('万',1),
    tile('万',2), tile('万',3), tile('万',4),
    tile('万',5), tile('万',6), tile('万',7),
    tile('万',8), tile('万',8), tile('万',8),
    tile('万',9), tile('万',9)
  ]
  assert(canWin(hand).canWin, '1.1 标准胡 3刻1顺1对')
}

// 1.2 七对
{
  const hand = [
    tile('筒',1), tile('筒',1), tile('筒',2), tile('筒',2),
    tile('条',3), tile('条',3), tile('万',4), tile('万',4),
    tile('万',5), tile('万',5), tile('万',6), tile('万',6),
    tile('万',7), tile('万',7)
  ]
  assert(canWin(hand).canWin, '1.2 七对')
}

// 1.3 不能胡: 万1×3 + 万2-7连续 + 万8×3 + 万9×2 + 万3（万3变成4张，多余）
{
  const hand = [
    tile('万',1), tile('万',1), tile('万',1),
    tile('万',2), tile('万',3), tile('万',3),  // 万3×2
    tile('万',4), tile('万',5), tile('万',6),
    tile('万',7), tile('万',8), tile('万',8),
    tile('万',8), tile('万',9)
  ]
  assert(!canWin(hand).canWin, '1.3 万3多余张，顺子被打断不能胡')
}

// 1.4 全刻子胡
{
  const hand = [
    tile('筒',1), tile('筒',1), tile('筒',1),
    tile('筒',2), tile('筒',2), tile('筒',2),
    tile('筒',3), tile('筒',3), tile('筒',3),
    tile('筒',4), tile('筒',4), tile('筒',4),
    tile('筒',5), tile('筒',5)
  ]
  assert(canWin(hand).canWin, '1.4 全刻子胡')
}

// 1.5 极端: 14张全一样（应不能胡 - 需要1对+4面子）
{
  const hand = Array(14).fill(null).map(() => tile('筒',1))
  // 14张筒1: 4个刻子(12张) + 1对(2张) = 可以胡！
  assert(canWin(hand).canWin, '1.5 14张同牌 → 4刻1对，可胡')
}

// 1.6 大吊: 4门口（12张）+ 1对（2张）= 14张手牌
{
  // 注意: 4个exposed melds = 12 tiles, hand = 2 tiles (pair) = 14 total
  // isDaDiao: exposedMelds.length >= 1 && handTiles.length === 2
  const exposed = [meld('triplet', '筒', 1), meld('triplet', '筒', 2), meld('triplet', '筒', 3), meld('triplet', '筒', 4)]
  const hand = [tile('筒', 9), tile('筒', 9)]  // 一对
  assert(canWin(hand, 4).canWin, '1.6 大吊(4门口+1对)手牌为2张对子 → 能胡')
  const types = detectHandTypes(hand, exposed, true, 0, null)
  assert(types.includes(HandType.DA_DIAO), '1.6 大吊牌型检测')
}

// 1.7 百搭代替雀头
{
  const isWild = (t: Tile) => t.suit === TileSuit.DOTS && t.value === 1
  const hand = [
    tile('万',1), tile('万',1), tile('万',1),  // 刻子
    tile('万',2), tile('万',3), tile('万',4),  // 顺子
    tile('万',5), tile('万',6), tile('万',7),  // 顺子
    tile('万',8), tile('万',8), tile('万',8),  // 刻子
    tile('万',9), tile('筒',1)  // 万9 + 百搭(筒1) → 对子
  ]
  assert(canWin(hand, 0, isWild).canWin, '1.7 百搭代替雀头(万9+百搭)')
}

// 1.8 百搭代替顺子中间
{
  const isWild = (t: Tile) => t.suit === TileSuit.DOTS && t.value === 1
  const hand = [
    tile('万',1), tile('万',1), tile('万',1),
    tile('万',2), tile('筒',1), tile('万',4),  // 百搭代替万3
    tile('万',5), tile('万',6), tile('万',7),
    tile('万',8), tile('万',8), tile('万',8),
    tile('万',9), tile('万',9)
  ]
  assert(canWin(hand, 0, isWild).canWin, '1.8 百搭代替顺子中间(万2_万4)')
}

// 1.9 13张牌不能胡
{
  const hand = Array(13).fill(null).map((_, i) => tile('筒', (i % 9) + 1))
  assert(!canWin(hand).canWin, '1.9 13张散牌不能胡')
}

// 1.10 花牌不影响胡牌检测（花牌被过滤）
{
  const flower: Tile = { suit: TileSuit.FLOWER, value: 1, id: 'f1', isFlower: true }
  // 有花的胡牌（15张→过滤成14张）
  const winningHand = [
    tile('万',1), tile('万',1), tile('万',1),
    tile('万',2), tile('万',3), tile('万',4),
    tile('万',5), tile('万',6), tile('万',7),
    tile('万',8), tile('万',8), tile('万',8),
    tile('万',9), tile('万',9)
  ]
  assert(canWin([...winningHand, flower]).canWin, '1.10a 有花胡牌仍能胡（花过滤）')
  assert(canWin(winningHand).canWin, '1.10b 无花胡牌也能胡')
  assert(canWin(winningHand).canWin === canWin([...winningHand, flower]).canWin, '1.10c 有花无花结果一致')
}

// ========== 模块2: 牌型识别 ==========
console.log('\n🔍 模块2: 牌型识别 (detectHandTypes)')

// 2.1 碰碰胡检测
{
  const hand = [
    tile('筒',1), tile('筒',1), tile('筒',1),
    tile('筒',2), tile('筒',2), tile('筒',2),
    tile('筒',3), tile('筒',3), tile('筒',3),
    tile('筒',4), tile('筒',4), tile('筒',4),
    tile('筒',5), tile('筒',5)
  ]
  const types = detectHandTypes(hand, [], true, 0, null)
  assert(types.includes(HandType.ALL_TRIPLETS), '2.1 碰碰胡')
}

// 2.2 清一色
{
  const hand = [
    tile('筒',1), tile('筒',2), tile('筒',3),
    tile('筒',4), tile('筒',5), tile('筒',6),
    tile('筒',7), tile('筒',7), tile('筒',7),
    tile('筒',8), tile('筒',8), tile('筒',8),
    tile('筒',9), tile('筒',9)
  ]
  const types = detectHandTypes(hand, [], true, 0, null)
  assert(types.includes(HandType.FULL_FLUSH), '2.2 清一色')
}

// 2.3 混一色
{
  const hand = [
    tile('筒',1), tile('筒',2), tile('筒',3),
    tile('筒',4), tile('筒',5), tile('筒',6),
    tile('风',1), tile('风',1), tile('风',1),  // 东风刻子
    tile('筒',7), tile('筒',8), tile('筒',9),
    tile('筒',1), tile('筒',1)
  ]
  const types = detectHandTypes(hand, [], true, 0, null)
  assert(types.includes(HandType.HALF_FLUSH), '2.3 混一色（筒+风）')
}

// 2.4 大吊: 4门口（12张）+ 1对（2张）
{
  const exposed = [meld('triplet', '筒', 1), meld('triplet', '筒', 2), meld('triplet', '筒', 3), meld('triplet', '筒', 4)]
  const hand = [tile('筒', 9), tile('筒', 9)]
  const types = detectHandTypes(hand, exposed, true, 0, null)
  assert(types.includes(HandType.DA_DIAO), '2.4 大吊（4门口+1对）')
}

// 2.5 不是大吊: 手牌有顺子
{
  const exposed = [meld('sequence', '筒', 1), meld('sequence', '筒', 4)]
  const hand = [tile('筒',7), tile('筒',8), tile('筒',9), tile('筒',3), tile('筒',3)]
  const types = detectHandTypes(hand, exposed, true, 0, null)
  assert(!types.includes(HandType.DA_DIAO), '2.5 非大吊（手里有顺子）')
}

// 2.6 风一色
{
  const hand = [
    tile('风',1), tile('风',1), tile('风',1),  // 东风
    tile('风',2), tile('风',2), tile('风',2),  // 南风
    tile('风',3), tile('风',3), tile('风',3),  // 西风
    tile('风',4), tile('风',4), tile('风',4),  // 北风
    tile('箭',1), tile('箭',1)  // 中
  ]
  const types = detectHandTypes(hand, [], true, 0, null)
  assert(types.includes(HandType.ALL_WIND), '2.6 风一色（风+箭）')
}

// 2.7 风碰 = 风一色 + 碰碰胡
{
  const hand = [
    tile('风',1), tile('风',1), tile('风',1),
    tile('风',2), tile('风',2), tile('风',2),
    tile('风',3), tile('风',3), tile('风',3),
    tile('风',4), tile('风',4), tile('风',4),
    tile('箭',1), tile('箭',1)
  ]
  const types = detectHandTypes(hand, [], true, 0, null)
  assert(types.includes(HandType.FENG_PENG), '2.7 风碰（风一色+碰碰胡）')
}

// ========== 模块3: 算番 ==========
console.log('\n🔍 模块3: 算番 (calculateScore)')

// 3.1 普通胡 = 1番
{
  const hand = [
    tile('筒',1), tile('筒',2), tile('筒',3),
    tile('万',4), tile('万',5), tile('万',6),
    tile('条',7), tile('条',8), tile('条',9),
    tile('筒',1), tile('筒',2), tile('筒',3),
    tile('风',1), tile('风',1)
  ]
  const result = calculateScore({
    handTiles: hand, exposedMelds: [], flowerTiles: [],
    handTypes: [], isSelfDrawn: false, isKongFlower: false,
    isRobbingKong: false, isMenQing: true,
    roundMultiplier: 1, globalMultiplier: 1, globalIncludesRound: true
  })
  assert(result.baseFan >= 1, `3.1 普通胡 baseFan >= 1 (${result.baseFan})`)
  assert(result.extraMultipliers >= 2, `3.1 门清翻倍 ×2 (${result.extraMultipliers})`)
}

// 3.2 碰碰胡自摸 + 门清
{
  const hand = [
    tile('筒',1), tile('筒',1), tile('筒',1),
    tile('筒',2), tile('筒',2), tile('筒',2),
    tile('筒',3), tile('筒',3), tile('筒',3),
    tile('筒',4), tile('筒',4), tile('筒',4),
    tile('筒',5), tile('筒',5)
  ]
  const result = calculateScore({
    handTiles: hand, exposedMelds: [], flowerTiles: [],
    handTypes: [HandType.ALL_TRIPLETS], isSelfDrawn: true, isKongFlower: false,
    isRobbingKong: false, isMenQing: true,
    roundMultiplier: 1, globalMultiplier: 1, globalIncludesRound: true
  })
  // 碰碰胡公式自摸(×2) + 门清(×2) = baseFan * 4
  assert(result.baseFan >= 2, `3.2 碰碰胡 baseFan >= 2 (${result.baseFan})`)
}

// 3.3 极端: 门清 + 无百搭 = 4倍翻倍
{
  const result = calculateScore({
    handTiles: [tile('筒',1), tile('筒',1)], exposedMelds: [],
    flowerTiles: [], handTypes: [HandType.ALL_TRIPLETS],
    isSelfDrawn: true, isKongFlower: false, isRobbingKong: false,
    isMenQing: true, wildTileSuit: TileSuit.DOTS, wildTileValue: 9,
    roundMultiplier: 1, globalMultiplier: 1, globalIncludesRound: true
  })
  // 无百搭×2 + 门清×2 = 4倍
  assert(result.extraMultipliers >= 4, `3.3 门清+无百搭 = ×4 (${result.extraMultipliers})`)
}

// 3.4 大吊固定10番
{
  const result = calculateScore({
    handTiles: [tile('筒',9), tile('筒',9)],
    exposedMelds: [meld('sequence', '筒', 1), meld('sequence', '筒', 4), meld('sequence', '筒', 7)],
    flowerTiles: [], handTypes: [HandType.DA_DIAO],
    isSelfDrawn: false, isKongFlower: false, isRobbingKong: false,
    isMenQing: false, roundMultiplier: 1, globalMultiplier: 1, globalIncludesRound: true
  })
  assert(result.baseFan === 10, `3.4 大吊 = 10番 (${result.baseFan})`)
}

// 3.5 杠开固定10番
{
  const result = calculateScore({
    handTiles: [tile('筒',1), tile('筒',1)], exposedMelds: [],
    flowerTiles: [], handTypes: [],
    isSelfDrawn: true, isKongFlower: true, isRobbingKong: false,
    isMenQing: false, roundMultiplier: 1, globalMultiplier: 1, globalIncludesRound: true
  })
  assert(result.baseFan === 10, `3.5 杠开 = 10番 (${result.baseFan})`)
}

// 3.6 八花自摸固定10番
{
  const result = calculateScore({
    handTiles: [tile('筒',1), tile('筒',1)], exposedMelds: [],
    flowerTiles: Array(8).fill(null).map((_, i) => ({ suit: TileSuit.FLOWER, value: i+1, id: `f${i}`, isFlower: true })),
    handTypes: [HandType.EIGHT_FLOWERS],
    isSelfDrawn: true, isKongFlower: false, isRobbingKong: false,
    isMenQing: false, roundMultiplier: 1, globalMultiplier: 1, globalIncludesRound: true
  })
  assert(result.baseFan === 10, `3.6 八花自摸 = 10番 (${result.baseFan})`)
}

// 3.7 清碰固定20番
{
  const result = calculateScore({
    handTiles: [tile('筒',5), tile('筒',5)],
    exposedMelds: [meld('triplet', '筒', 1), meld('triplet', '筒', 2), meld('triplet', '筒', 3)],
    flowerTiles: [], handTypes: [HandType.QING_PENG],
    isSelfDrawn: false, isKongFlower: false, isRobbingKong: false,
    isMenQing: false, roundMultiplier: 1, globalMultiplier: 1, globalIncludesRound: true
  })
  assert(result.baseFan === 20, `3.7 清碰 = 20番 (${result.baseFan})`)
}

// 3.8 风碰固定40番
{
  const result = calculateScore({
    handTiles: [tile('箭',1), tile('箭',1)],
    exposedMelds: [meld('triplet', '风', 1), meld('triplet', '风', 2), meld('triplet', '风', 3)],
    flowerTiles: [], handTypes: [HandType.FENG_PENG],
    isSelfDrawn: false, isKongFlower: false, isRobbingKong: false,
    isMenQing: false, roundMultiplier: 1, globalMultiplier: 1, globalIncludesRound: true
  })
  assert(result.baseFan === 40, `3.8 风碰 = 40番 (${result.baseFan})`)
}

// 3.9 极端: 全局倍数封顶8
{
  const result = calculateScore({
    handTiles: [tile('筒',5), tile('筒',5)], exposedMelds: [],
    flowerTiles: [], handTypes: [HandType.ALL_TRIPLETS],
    isSelfDrawn: true, isKongFlower: false, isRobbingKong: false,
    isMenQing: false, roundMultiplier: 4, globalMultiplier: 8,
    globalIncludesRound: true
  })
  // 全局倍数应该封顶8
  assert(result.globalMultiplier <= 8, `3.9 全局倍数封顶8 (${result.globalMultiplier})`)
}

// 3.10 极端: baseFan=0 应用公式兜底
{
  const result = calculateScore({
    handTiles: [tile('筒',5), tile('筒',5)], exposedMelds: [],
    flowerTiles: [], handTypes: [],
    isSelfDrawn: false, isKongFlower: false, isRobbingKong: false,
    isMenQing: false, roundMultiplier: 1, globalMultiplier: 1, globalIncludesRound: true
  })
  assert(result.baseFan > 0, `3.10 无牌型时公式兜底 baseFan > 0 (${result.baseFan})`)
}

// ========== 模块4: 听牌 ==========
console.log('\n🔍 模块4: 听牌检测 (isTing/getListeningTiles)')

// 4.1 标准听牌
{
  const hand = [
    tile('筒',1), tile('筒',1), tile('筒',1),
    tile('筒',2), tile('筒',3), tile('筒',4),
    tile('筒',5), tile('筒',6), tile('筒',7),
    tile('筒',8), tile('筒',8), tile('筒',8),
    tile('筒',9)  // 听筒9
  ]
  const listening = getListeningTiles(hand)
  assert(listening.some(t => t.suit === TileSuit.DOTS && t.value === 9), '4.1 听筒9')
}

// 4.2 七对听牌
{
  const hand = [
    tile('筒',1), tile('筒',1), tile('筒',2), tile('筒',2),
    tile('条',3), tile('条',3), tile('万',4), tile('万',4),
    tile('万',5), tile('万',5), tile('万',6), tile('万',6),
    tile('万',7)  // 听万7
  ]
  const listening = getListeningTiles(hand)
  assert(listening.some(t => t.suit === TileSuit.CHARACTERS && t.value === 7), '4.2 七对听万7')
}

// 4.3 极端: 11张散牌 → 不听
{
  const hand = Array(11).fill(null).map((_, i) => tile('筒', (i % 9) + 1))
  assert(!isTing(hand), '4.3 11张散牌不听')
}

// ========== 模块5: 极端场景 ==========
console.log('\n🔍 模块5: 极端场景')

// 5.1 百搭当花牌时不触发无花自摸
{
  const wildGroup = ['1', '2', '3', '4']
  const result = calculateScore({
    handTiles: [tile('筒',5), tile('筒',5)], exposedMelds: [],
    flowerTiles: [], handTypes: [HandType.ALL_TRIPLETS],
    isSelfDrawn: true, isKongFlower: false, isRobbingKong: false,
    isMenQing: false, wildTileGroup: wildGroup,
    roundMultiplier: 1, globalMultiplier: 1, globalIncludesRound: true
  })
  const hasNoFlowerSelfDraw = result.details.some(d => d.includes('无花自摸'))
  assert(!hasNoFlowerSelfDraw, '5.1 百搭为花牌时不触发无花自摸')
}

// 5.2 门口刻子+手里第4张 → 不杠时不计暗杠
{
  const hand = [
    tile('筒',1),  // 第4张筒1（门口有筒1刻子）
    tile('筒',5), tile('筒',5)
  ]
  const exposed = [meld('triplet', '筒', 1)]
  const result = calculateScore({
    handTiles: hand, exposedMelds: exposed, flowerTiles: [],
    handTypes: [], isSelfDrawn: false, isKongFlower: false,
    isRobbingKong: false, isMenQing: false,
    roundMultiplier: 1, globalMultiplier: 1, globalIncludesRound: true
  })
  // 不应有暗杠加分
  const has暗杠 = result.details.some(d => d.includes('暗杠'))
  assert(!has暗杠, '5.2 不杠时不计暗杠')
}

// 5.3 大吊: 4门口（12张）+ 1对（2张）= 14张手牌
{
  const hand = [tile('筒',9), tile('筒',9)]
  const exposed = [meld('triplet', '筒', 1), meld('triplet', '筒', 2), meld('triplet', '筒', 3), meld('triplet', '筒', 4)]
  const types = detectHandTypes(hand, exposed, true, 0, null)
  assert(types.includes(HandType.DA_DIAO), '5.3 大吊（4门口+1对）')
}

// 5.4 非大吊: 4门口+手里2张不同
{
  const hand = [tile('筒',8), tile('筒',9)]
  const exposed = [meld('triplet', '筒', 1), meld('triplet', '筒', 2), meld('triplet', '筒', 3), meld('triplet', '筒', 4)]
  const types = detectHandTypes(hand, exposed, true, 0, null)
  assert(!types.includes(HandType.DA_DIAO), '5.4 4门口+2张不同 → 非大吊')
}

// 5.5 百搭归位无百搭
{
  // 万1万1 + 百搭万1（原牌）→ 百搭当万1 → 3个万1刻子
  // handTiles里百搭的suit/value是万1
  const hand = [
    tile('万',1), tile('万',1), tile('万',1),  // 3张万1（含百搭）
    tile('万',2), tile('万',3), tile('万',4),
    tile('万',5), tile('万',6), tile('万',7),
    tile('万',8), tile('万',8), tile('万',8),
    tile('万',9), tile('万',9)
  ]
  // 假设百搭是万1：手里有3张万1，百搭当万1参与刻子
  // 不用百搭也能胡 → 无百搭
  const noWildCheck = canWin(hand, 0, () => false)
  assert(noWildCheck.canWin, '5.5 百搭归位不用百搭也能胡 → 无百搭')
}

// 5.6 四百搭
{
  const isWild = (t: Tile) => t.suit === TileSuit.DOTS && t.value === 1
  const hand = [
    tile('筒',1), tile('筒',1), tile('筒',1), tile('筒',1),  // 4张百搭
    tile('万',2), tile('万',3), tile('万',4),
    tile('万',5), tile('万',6), tile('万',7),
    tile('万',8), tile('万',9), tile('万',1), tile('万',1)
  ]
  const types = detectHandTypes(hand, [], true, 0, 'dots-1')
  assert(types.includes(HandType.FOUR_WILD), '5.6 4张百搭 → 四百搭')
}

// 5.7 空手牌（极端边界）
{
  const result = canWin([])
  assert(!result.canWin, '5.7 空手牌不能胡')
}

// 5.8 27张牌（极端超量）
{
  const hand = Array(27).fill(null).map((_, i) => tile('筒', (i % 9) + 1))
  assert(!canWin(hand).canWin, '5.8 27张牌不能胡（非标准数量）')
}

// ========== 模块6: generateWinOptions ==========
console.log('\n🔍 模块6: 胡牌可选方案 (generateWinOptions)')

// 6.1 基础胡牌方案生成
{
  const hand = [
    tile('筒',1), tile('筒',1), tile('筒',1),
    tile('筒',2), tile('筒',3), tile('筒',4),
    tile('筒',5), tile('筒',6), tile('筒',7),
    tile('筒',8), tile('筒',8), tile('筒',8),
    tile('筒',9), tile('筒',9)
  ]
  const options = generateWinOptions({
    handTiles: hand, exposedMelds: [], flowerTiles: [],
    handTypes: [HandType.FULL_FLUSH],
    isKongFlower: false, isRobbingKong: false, isMenQing: true,
    roundMultiplier: 1, globalMultiplier: 1
  })
  assert(options.length > 0, `6.1 至少1个方案 (${options.length})`)
  assert(options[0].score >= options[options.length - 1].score, '6.1 按分数倒序排列')
}

// 6.2 自摸方案分数 >= 捉冲方案分数
{
  const hand = [
    tile('筒',1), tile('筒',1), tile('筒',1),
    tile('筒',2), tile('筒',3), tile('筒',4),
    tile('筒',5), tile('筒',6), tile('筒',7),
    tile('筒',8), tile('筒',8), tile('筒',8),
    tile('筒',9), tile('筒',9)
  ]
  const options = generateWinOptions({
    handTiles: hand, exposedMelds: [], flowerTiles: [],
    handTypes: [HandType.ALL_TRIPLETS],
    isKongFlower: false, isRobbingKong: false, isMenQing: true,
    roundMultiplier: 1, globalMultiplier: 1
  })
  const selfDraw = options.find(o => o.type === 'self_draw')
  const discard = options.find(o => o.type === 'discard')
  if (selfDraw && discard) {
    assert(selfDraw.score >= discard.score, `6.2 自摸(${selfDraw.score}) >= 捉冲(${discard.score})`)
  }
}

// ========== 汇总 ==========
console.log(`\n${'='.repeat(50)}`)
console.log(`📊 测试结果: ✅ ${passed} 通过 / ❌ ${failed} 失败`)
if (bugs.length > 0) {
  console.log(`\n🐛 发现的 Bug:`)
  bugs.forEach((b, i) => console.log(`  ${i+1}. ${b}`))
}
console.log(`${'='.repeat(50)}`)

process.exit(failed > 0 ? 1 : 0)
