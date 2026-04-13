import { shuffleTiles } from './server/utils/tiles.js'

const TileSuit = { DOTS: 'wan', CHARACTERS: 'tong', BAMBOOS: 'tiao', WIND: 'feng', DRAGON: 'jian', FLOWER: 'hua' }

function tileEq(a, b) { return a && b && a.suit === b.suit && a.value === b.value }
function isFlower(t) { return t.suit === TileSuit.FLOWER }
function normalizeHand(hand) { return hand.filter(t => t && !isFlower(t)) }
function canPeng(p, tile) {
  if (!tile) return false
  return normalizeHand(p.hand).filter(t => tileEq(t, tile)).length >= 2
}

function makeDeck() {
  const deck = []
  const suits = [TileSuit.DOTS, TileSuit.CHARACTERS, TileSuit.BAMBOOS]
  for (const suit of suits)
    for (let v = 1; v <= 9; v++)
      for (let i = 0; i < 4; i++)
        deck.push({ suit, value: v, id: `${suit}-${v}-${i}`, isFlower: false })
  for (let v = 1; v <= 4; v++) deck.push({ suit: TileSuit.WIND, value: v, id: `wind-${v}`, isFlower: false })
  for (let v = 1; v <= 3; v++) deck.push({ suit: TileSuit.DRAGON, value: v, id: `dragon-${v}`, isFlower: false })
  for (let v = 1; v <= 8; v++) deck.push({ suit: TileSuit.FLOWER, value: v, id: `flower-${v}`, isFlower: true })
  return deck
}

const deck = makeDeck()
shuffleTiles(deck)

const hands = Array.from({length: 4}, () => deck.splice(0, 13))
let totalPengChecks = 0, totalCanPeng = 0, totalDiscards = 0

for (let r = 0; r < 36; r++) {
  for (let p = 0; p < 4; p++) {
    const discard = deck.shift()
    if (!discard || isFlower(discard)) { deck.push(discard); continue }
    totalDiscards++
    for (let o = 0; o < 4; o++) {
      if (o === p) continue
      const canP = canPeng({ hand: hands[o] }, discard)
      if (canP) totalCanPeng++
      totalPengChecks++
    }
    hands[p].push(discard)
  }
}

console.log(`Total discards: ${totalDiscards}`)
console.log(`Total canPeng checks: ${totalPengChecks}`)
console.log(`canPeng=TRUE: ${totalCanPeng} (${(totalCanPeng/totalPengChecks*100).toFixed(1)}%)`)
console.log(`Expected pongs in 1 game: ~${(totalCanPeng * 0.7 / totalPengChecks * totalDiscards).toFixed(1)}`)
