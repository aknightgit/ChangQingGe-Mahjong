/**
 * 纯净碰碰胡测试 - 完全独立，不依赖 train-ai-ak.ts
 */
import { canWin, detectHandTypes } from './server/utils/handValidator'
import { normalizeHand, createDeck, shuffleTiles, isFlower } from './server/utils/tiles'
import { Tile, TileSuit, Meld } from './server/types/game'

function t(suit: TileSuit, value: number, id?: string): Tile {
  return { id: id ?? `${suit}-${value}-${Math.random().toString(36).slice(2,6)}`, suit, value, isWild: false, isFlower: false }
}

// 强制AK固定14张碰碰胡（4刻+1对），其他玩家随机
function runFullGame(): { hu: boolean; self: boolean; disc: boolean; handSize: number } {
  const deck = shuffleTiles(createDeck())

  const nonFlower = deck.filter(t => !isFlower(t))
  const wildCard = nonFlower[Math.floor(Math.random() * nonFlower.length)]
  const wildKey = `${wildCard.suit}-${wildCard.value}`

  const players: { hand: Tile[]; exposedMelds: Meld[]; flowerTiles: Tile[] }[] =
    Array.from({ length: 4 }, () => ({ hand: [], exposedMelds: [], flowerTiles: [] }))

  let wallIdx = 0
  // 发牌13轮（每人13张）
  for (let round = 0; round < 13; round++) {
    for (let p = 0; p < 4; p++) {
      while (wallIdx < deck.length && isFlower(deck[wallIdx])) {
        players[p].flowerTiles.push(deck[wallIdx])
        wallIdx++
      }
      if (wallIdx < deck.length) players[p].hand.push(deck[wallIdx++])
    }
  }

  // === 强制AK碰碰胡手牌 ===
  const pp: Tile[] = []
  for (const v of [1, 2, 3, 5]) for (let i = 0; i < 3; i++) pp.push(t(TileSuit.CHARACTERS, v, `pp${v}${i}`))
  for (let i = 0; i < 2; i++) pp.push(t(TileSuit.CHARACTERS, 7, `pp7${i}`))
  players[0].hand = pp  // 强制14张

  const akNorm = normalizeHand(players[0].hand)
  const result = canWin(akNorm, [], wildKey)

  console.log(`  [DEBUG] AK手牌=${akNorm.length} canWin=${result.canWin} types=${result.types.join(',') || 'none'}`)

  return { hu: result.canWin, self: true, disc: false, handSize: akNorm.length }
}

function testPongBotAggression(): void {
  console.log('=== 碰碰胡强制发牌10局测试 ===')
  console.log('AK固定4刻+1对=14张，验证canWin能否正确判胡\n')

  let totalHu = 0
  const results: string[] = []

  for (let i = 1; i <= 10; i++) {
    const r = runFullGame()
    const mark = r.hu ? '✅' : '❌'
    results.push(`第${i}局: ${mark} hu=${r.hu} 手牌=${r.handSize}张`)
    if (r.hu) totalHu++
  }

  results.forEach(s => console.log(s))
  console.log(`\n汇总: hu=${totalHu}/10`)
  if (totalHu < 5) console.log('⚠️ canWin检测异常！')
  else console.log('✅ canWin检测正常')
}

testPongBotAggression()
