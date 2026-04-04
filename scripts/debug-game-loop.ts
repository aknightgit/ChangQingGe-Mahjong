import { createDeck, shuffleTiles, isFlower, groupTiles } from '../server/utils/tiles';
import { Tile, TileSuit, MeldType, type Meld } from '../server/types/game';
import { canWin, findBestDiscardForTing, HandType } from '../server/utils/handValidator';
import { selectDiscardTile } from '../server/services/botService';

function T(suit: string, value: number): Tile {
  return { suit: suit as TileSuit, value, id: `${suit}-${value}-${Math.random()}`, isFlower: false };
}
function Ts(suit: string, vals: number[]): Tile[] {
  return vals.map(v => T(suit, v));
}

// Deal
const deck = createDeck();
const shuffled = shuffleTiles(deck);
const nonFlowers = shuffled.filter(t => !isFlower(t));

const hands: Tile[][] = [[], [], [], []];
let idx = 0;
for (let p = 0; p < 4; p++) {
  for (let i = 0; i < 13; i++) {
    hands[p].push(nonFlowers[idx++]);
  }
}
const wall = nonFlowers.slice(idx);

console.log(`Wall: ${wall.length} tiles`);
console.log(`Hand 0: ${hands[0].length} tiles`);

// Simulate one player
let hand = [...hands[0]];
let wallIdx = 0;
let exposed: Meld[] = [];

for (let turn = 0; turn < 50; turn++) {
  // Draw
  if (wallIdx < wall.length) {
    hand.push(wall[wallIdx++]);
  } else {
    console.log(`Wall exhausted at turn ${turn + 1}`);
    break;
  }
  
  console.log(`\nTurn ${turn + 1}: hand=${hand.length}`);
  
  // Check win
  const winResult = canWin(hand, exposed, null);
  if (winResult.canWin) {
    console.log(`  WIN! types: ${winResult.types.join(', ')}`);
    break;
  }
  
  // Discard
  const botPlayer = {
    id: 'bot-0',
    name: 'AI-AK',
    position: 0,
    hand: { concealedTiles: hand, exposedMelds: exposed, flowerTiles: [] },
    score: 0,
    isTing: false,
    isAI: true,
  };
  
  const botGame = {
    id: 'sim',
    players: [botPlayer],
    wall: [],
    discardPile: [],
    currentTurn: 0,
    dealerIndex: 0,
    roundStats: [],
    chowPongExclusion: {},
    pendingActions: [],
  } as any;
  
  const discardId = selectDiscardTile(botPlayer, botGame);
  if (!discardId) {
    console.log(`  No discard!`);
    break;
  }
  
  // Find tile
  const discardIdx = hand.findIndex(t => t.id === discardId);
  if (discardIdx >= 0) {
    const discarded = hand.splice(discardIdx, 1)[0];
    console.log(`  Discard: ${discarded.suit}-${discarded.value}`);
  } else {
    console.log(`  ERROR: tile ${discardId} not found!`);
    console.log(`  Hand: ${hand.map(t => `${t.suit}-${t.value}`).join(' ')}`);
    break;
  }
}

console.log(`\nFinal: hand=${hand.length}, wallIdx=${wallIdx}`);
