import { createDeck, shuffleTiles, isFlower } from '../server/utils/tiles';
import { Tile, TileSuit, MeldType, type Meld } from '../server/types/game';
import { canWin, HandType } from '../server/utils/handValidator';
import { selectDiscardTile } from '../server/services/botService';

function tilesEqual(a: Tile, b: Tile): boolean { return a.suit === b.suit && a.value === b.value; }
function isHonor(t: Tile): boolean { return t.suit === TileSuit.WIND || t.suit === TileSuit.DRAGON; }

interface SimPlayer {
  name: string;
  hand: Tile[];
  exposed: Meld[];
  flowers: Tile[];
  isTing: boolean;
}

const AI_NAMES = ['AI-AK', 'AI-小胖', 'AI-阿水', 'AI-老赵'];

function dealTiles(): { hands: Tile[][]; wall: Tile[]; flowers: Tile[][] } {
  const deck = createDeck();
  const shuffled = shuffleTiles(deck);
  const hands: Tile[][] = [[], [], [], []];
  const flowers: Tile[][] = [[], [], [], []];
  let idx = 0;
  for (let p = 0; p < 4; p++) {
    while (hands[p].length < 13 && idx < shuffled.length) {
      const tile = shuffled[idx++];
      if (isFlower(tile)) { flowers[p].push(tile); }
      else { hands[p].push(tile); }
    }
  }
  return { hands, wall: shuffled.slice(idx), flowers };
}

function checkTing(hand: Tile[], exposed: Meld[]): boolean {
  for (let i = 0; i < hand.length; i++) {
    const remaining = [...hand.slice(0, i), ...hand.slice(i + 1)];
    if (canWin(remaining, exposed, null).canWin) return true;
  }
  return false;
}

function playOneGame(): { winner: string | null; winTypes: HandType[] } {
  const { hands, wall, flowers } = dealTiles();
  const players: SimPlayer[] = AI_NAMES.map((name, i) => ({
    name, hand: hands[i], exposed: [], flowers: flowers[i], isTing: false,
  }));
  
  let wallIdx = 0;
  let currentPlayer = 0;
  let lastDiscard: Tile | null = null;
  
  for (let turn = 0; turn < 300; turn++) {
    const player = players[currentPlayer];
    
    // Draw
    if (wallIdx < wall.length) {
      const drawn = wall[wallIdx++];
      if (isFlower(drawn)) {
        player.flowers.push(drawn);
        if (wallIdx < wall.length) {
          player.hand.push(wall[wallIdx++]);
          const fw = canWin(player.hand, player.exposed, null);
          if (fw.canWin) return { winner: player.name, winTypes: fw.types };
        } else break;
      } else {
        player.hand.push(drawn);
      }
    } else break;
    
    // Check win
    const winResult = canWin(player.hand, player.exposed, null);
    if (winResult.canWin) {
      return { winner: player.name, winTypes: winResult.types };
    }
    
    // Discard
    const botPlayer = {
      id: `bot-${currentPlayer}`, name: player.name, position: currentPlayer,
      hand: { concealedTiles: player.hand, exposedMelds: player.exposed, flowerTiles: player.flowers },
      score: 0, isTing: player.isTing, isAI: true,
    };
    const botGame = {
      id: 'sim', players: players.map((p, i) => ({
        id: `bot-${i}`, name: p.name, position: i,
        hand: { concealedTiles: p.hand, exposedMelds: p.exposed, flowerTiles: p.flowers },
        score: 0, isTing: p.isTing, isAI: true,
      })),
      wall: [], discardPile: [], currentTurn: currentPlayer,
      dealerIndex: 0, roundStats: [], chowPongExclusion: {}, pendingActions: [],
    } as any;
    
    const discardId = selectDiscardTile(botPlayer, botGame);
    if (!discardId) { console.log(`No discard at turn ${turn+1}`); break; }
    
    const discardIdx = player.hand.findIndex(t => t.id === discardId);
    if (discardIdx >= 0) {
      lastDiscard = player.hand.splice(discardIdx, 1)[0];
    } else {
      const parts = discardId.split('-');
      const suit = parts.slice(0, -1).join('-');
      const value = parseInt(parts[parts.length - 1]);
      const fi = player.hand.findIndex(t => t.suit === suit && t.value === value);
      if (fi >= 0) lastDiscard = player.hand.splice(fi, 1)[0];
      else { console.log(`Tile not found: ${discardId}`); break; }
    }
    
    // Check win on discard (all players, priority order)
    for (let offset = 1; offset <= 3; offset++) {
      const p = (currentPlayer + offset) % 4;
      const pPlayer = players[p];
      const tempHand = [...pPlayer.hand, lastDiscard!];
      const dw = canWin(tempHand, pPlayer.exposed, null);
      if (dw.canWin) {
        return { winner: pPlayer.name, winTypes: dw.types };
      }
    }
    
    // Update ting
    for (let p = 0; p < 4; p++) {
      players[p].isTing = checkTing(players[p].hand, players[p].exposed);
    }
    
    currentPlayer = (currentPlayer + 1) % 4;
  }
  
  return { winner: null, winTypes: [] };
}

for (let i = 0; i < 20; i++) {
  const result = playOneGame();
  if (result.winner) {
    console.log(`Game ${i+1}: ${result.winner} wins with ${result.winTypes.join(', ')}`);
  } else {
    console.log(`Game ${i+1}: DRAW`);
  }
}
