import { createDeck, shuffleTiles, isFlower, groupTiles } from '../server/utils/tiles';
import { Tile, TileSuit, MeldType, type Meld } from '../server/types/game';
import { canWin, detectTypes, HandType } from '../server/utils/handValidator';
import { selectDiscardTile, shouldClaimPendingAction } from '../server/services/botService';
import type { Player, GameState } from '../server/types/game';

function tilesEqual(a: Tile, b: Tile): boolean { return a.suit === b.suit && a.value === b.value; }
function isHonor(t: Tile): boolean { return t.suit === TileSuit.WIND || t.suit === TileSuit.DRAGON; }

// Deal 13 tiles to each
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

console.log(`Wall size: ${wall.length}`);
console.log(`Hand sizes: ${hands.map(h => h.length).join(', ')}`);

// Simulate one player drawing and discarding
let hand = [...hands[0]];
let wallIdx = 0;
let exposed: Meld[] = [];

for (let turn = 0; turn < 20; turn++) {
  // Draw
  if (wallIdx < wall.length) {
    hand.push(wall[wallIdx++]);
  }
  
  console.log(`\nTurn ${turn + 1}: hand=${hand.length} tiles`);
  
  // Check win
  const winResult = canWin(hand, exposed, null);
  console.log(`  canWin: ${winResult.canWin}, types: ${winResult.types.join(',')}`);
  
  if (winResult.canWin) {
    console.log(`  WINNER at turn ${turn + 1}!`);
    break;
  }
  
  // Create bot player
  const botPlayer: Player = {
    id: 'bot-0',
    name: 'AI-AK',
    position: 0,
    hand: { concealedTiles: hand, exposedMelds: exposed, flowerTiles: [] },
    score: 0,
    isTing: false,
    isAI: true,
  };
  
  const botGame: GameState = {
    id: 'debug',
    players: [botPlayer],
    wall: wall.slice(wallIdx),
    discardPile: [],
    currentTurn: 0,
    dealerIndex: 0,
    roundStats: [],
    chowPongExclusion: {},
    pendingActions: [],
  } as GameState;
  
  const discard = selectDiscardTile(botPlayer, botGame);
  if (!discard) {
    console.log(`  No discard selected!`);
    break;
  }
  
  console.log(`  Discarding: ${discard}`);
  
  const discardIdx = hand.findIndex(t => t.suit === discard.split('-')[0] && t.value === parseInt(discard.split('-')[1]));
  if (discardIdx >= 0) {
    hand.splice(discardIdx, 1);
  } else {
    console.log(`  ERROR: Could not find tile ${discard} in hand!`);
    console.log(`  Hand: ${hand.map(t => `${t.suit}-${t.value}`).join(', ')}`);
    break;
  }
}

console.log(`\nFinal hand size: ${hand.length}`);
