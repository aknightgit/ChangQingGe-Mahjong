import { createDeck, shuffleTiles, isFlower, groupTiles } from '../server/utils/tiles';
import { Tile, TileSuit, MeldType, type Meld } from '../server/types/game';
import { canWin, HandType } from '../server/utils/handValidator';
import { selectDiscardTile, shouldClaimPendingAction } from '../server/services/botService';

function tilesEqual(a: Tile, b: Tile): boolean { return a.suit === b.suit && a.value === b.value; }
function isHonor(t: Tile): boolean { return t.suit === TileSuit.WIND || t.suit === TileSuit.DRAGON; }

interface SimPlayer {
  name: string;
  hand: Tile[];
  exposed: Meld[];
}

const AI_NAMES = ['AI-AK', 'AI-小胖', 'AI-阿水', 'AI-老赵'];

function dealTiles(): { hands: Tile[][]; wall: Tile[] } {
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
  return { hands, wall: nonFlowers.slice(idx) };
}

function playOneGame(): { winner: string | null; winTypes: HandType[] } {
  const { hands, wall } = dealTiles();
  const players: SimPlayer[] = AI_NAMES.map((name, i) => ({
    name, hand: hands[i], exposed: [],
  }));
  
  let wallIdx = 0;
  let currentPlayer = 0;
  let lastDiscard: Tile | null = null;
  
  for (let turn = 0; turn < 300; turn++) {
    const player = players[currentPlayer];
    
    // Draw
    if (wallIdx < wall.length) {
      player.hand.push(wall[wallIdx++]);
    } else {
      console.log(`Wall exhausted at turn ${turn + 1}`);
      break;
    }
    
    // Check win
    const winResult = canWin(player.hand, player.exposed, null);
    if (winResult.canWin) {
      return { winner: player.name, winTypes: winResult.types };
    }
    
    // Discard
    const botPlayer = {
      id: `bot-${currentPlayer}`, name: player.name, position: currentPlayer,
      hand: { concealedTiles: player.hand, exposedMelds: player.exposed, flowerTiles: [] },
      score: 0, isTing: false, isAI: true,
    };
    const botGame = {
      id: 'sim', players: players.map((p, i) => ({
        id: `bot-${i}`, name: p.name, position: i,
        hand: { concealedTiles: p.hand, exposedMelds: p.exposed, flowerTiles: [] },
        score: 0, isTing: false, isAI: true,
      })),
      wall: [], discardPile: [], currentTurn: currentPlayer,
      dealerIndex: 0, roundStats: [], chowPongExclusion: {}, pendingActions: [],
    } as any;
    
    const discardId = selectDiscardTile(botPlayer, botGame);
    if (!discardId) {
      console.log(`No discard at turn ${turn + 1}`);
      break;
    }
    
    const discardIdx = player.hand.findIndex(t => t.id === discardId);
    if (discardIdx >= 0) {
      lastDiscard = player.hand.splice(discardIdx, 1)[0];
    } else {
      console.log(`Tile not found: ${discardId}`);
      break;
    }
    
    // Check next player for win on discard
    const nextPlayer = (currentPlayer + 1) % 4;
    const nextP = players[nextPlayer];
    
    if (lastDiscard) {
      const tempHand = [...nextP.hand, lastDiscard];
      const discardWin = canWin(tempHand, nextP.exposed, null);
      if (discardWin.canWin) {
        return { winner: nextP.name, winTypes: discardWin.types };
      }
    }
    
    // Next turn
    currentPlayer = (currentPlayer + 1) % 4;
  }
  
  return { winner: null, winTypes: [] };
}

// Run 20 games
for (let i = 0; i < 20; i++) {
  const result = playOneGame();
  if (result.winner) {
    console.log(`Game ${i + 1}: ${result.winner} wins with ${result.winTypes.join(', ')}`);
  } else {
    console.log(`Game ${i + 1}: DRAW`);
  }
}
