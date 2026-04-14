import { createDeck, shuffleTiles, isFlower, groupTiles } from '../server/utils/tiles';
import { Tile, TileSuit, MeldType, type Meld, ActionType, type Player, type GameState } from '../server/types/game';
import { canWin, checkChowPongExclusion, updateChowPongExclusion } from '../server/utils/handValidator';
import { selectDiscardTile, shouldClaimPendingAction } from '../server/services/botService';

function tilesEqual(a: Tile, b: Tile): boolean { return a.suit === b.suit && a.value === b.value; }
function isHonor(t: Tile): boolean { return t.suit === TileSuit.WIND || t.suit === TileSuit.DRAGON; }

function canChow(hand: Tile[], discarded: Tile): boolean {
  if (isHonor(discarded)) return false;
  const v = discarded.value;
  const suit = discarded.suit;
  const groups = groupTiles(hand);
  const hasLeftLeft = groups.has(`${suit}-${v - 2}`) && groups.has(`${suit}-${v - 1}`);
  const hasLeftRight = groups.has(`${suit}-${v - 1}`) && groups.has(`${suit}-${v + 1}`);
  const hasRightRight = groups.has(`${suit}-${v + 1}`) && groups.has(`${suit}-${v + 2}`);
  return hasLeftLeft || hasLeftRight || hasRightRight;
}

// 模拟一局，打印 chowValue
function testOneGame() {
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
  
  let hand = [...hands[0]];
  let wallIdx = 0;
  let chowOpportunities = 0;
  
  for (let turn = 0; turn < 30; turn++) {
    if (wallIdx < wall.length) {
      hand.push(wall[wallIdx++]);
    } else break;
    
    const winResult = canWin(hand, [], null);
    if (winResult.canWin) {
      console.log(`Turn ${turn+1}: WIN!`);
      return;
    }
    
    const botPlayer = {
      id: 'bot-0', name: 'AI-AK', position: 0,
      hand: { concealedTiles: hand, exposedMelds: [], flowerTiles: [] },
      score: 0, isTing: false, isAI: true,
    };
    const botGame = {
      id: 'sim', players: [botPlayer],
      wall: [], discardPile: [], currentTurn: 0,
      dealerIndex: 0, roundStats: [], chowPongExclusion: {}, pendingActions: [],
    } as any;
    
    const discardId = selectDiscardTile(botPlayer, botGame);
    if (!discardId) break;
    
    const discardIdx = hand.findIndex(t => t.id === discardId);
    let discarded: Tile;
    if (discardIdx >= 0) {
      discarded = hand.splice(discardIdx, 1)[0];
    } else {
      const parts = discardId.split('-');
      const suit = parts.slice(0, -1).join('-');
      const value = parseInt(parts[parts.length - 1]);
      const fi = hand.findIndex(t => t.suit === suit && t.value === value);
      if (fi >= 0) discarded = hand.splice(fi, 1)[0];
      else break;
    }
    
    // 检查 Player 1 能否吃
    const p1Hand = [...hands[1]];
    const canChowResult = canChow(p1Hand, discarded);
    if (canChowResult) {
      chowOpportunities++;
      
      const p1Bot = {
        id: 'bot-1', name: 'AI-小胖', position: 1,
        hand: { concealedTiles: p1Hand, exposedMelds: [], flowerTiles: [] },
        score: 0, isTing: false, isAI: true,
      };
      const p1Game = {
        id: 'sim', players: [botPlayer, p1Bot],
        wall: [], discardPile: [], currentTurn: 1,
        dealerIndex: 0, roundStats: [], 
        chowPongExclusion: { 'bot-1': { firstActionSuit: null, firstActionType: null } },
        pendingActions: [{ playerId: 'bot-1', tile: discarded, availableActions: ['chow'] }],
      } as any;
      
      const action = shouldClaimPendingAction(p1Bot, [ActionType.CHOW, ActionType.PASS], p1Game);
      console.log(`Turn ${turn+1}: CHOW opportunity ${discarded.suit}-${discarded.value}, action=${action}, p1Hand=${p1Hand.map(t => `${t.suit}-${t.value}`).join(' ')}`);
    }
  }
  
  console.log(`吃牌机会: ${chowOpportunities}`);
}

testOneGame();
