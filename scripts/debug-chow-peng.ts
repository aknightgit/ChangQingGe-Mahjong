import { createDeck, shuffleTiles, isFlower, groupTiles } from '../server/utils/tiles';
import { Tile, TileSuit, MeldType, type Meld, ActionType } from '../server/types/game';
import { canWin, checkChowPongExclusion, updateChowPongExclusion } from '../server/utils/handValidator';
import { selectDiscardTile, shouldClaimPendingAction } from '../server/services/botService';

function tilesEqual(a: Tile, b: Tile): boolean { return a.suit === b.suit && a.value === b.value; }
function isHonor(t: Tile): boolean { return t.suit === TileSuit.WIND || t.suit === TileSuit.DRAGON; }

// 测试 canChow
function canChow(hand: Tile[], discarded: Tile): boolean {
  if (isHonor(discarded)) return false;
  const v = discarded.value;
  const suit = discarded.suit;
  const groups = groupTiles(hand);
  
  // 三种合法吃法
  const hasLeftLeft = groups.has(`${suit}-${v - 2}`) && groups.has(`${suit}-${v - 1}`);
  const hasLeftRight = groups.has(`${suit}-${v - 1}`) && groups.has(`${suit}-${v + 1}`);
  const hasRightRight = groups.has(`${suit}-${v + 1}`) && groups.has(`${suit}-${v + 2}`);
  
  return hasLeftLeft || hasLeftRight || hasRightRight;
}

// 模拟一局，打印吃碰决策
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
  
  console.log(`\n=== 测试局 ===`);
  console.log(`Player 0 hand: ${hands[0].map(t => `${t.suit}-${t.value}`).join(' ')}`);
  console.log(`Wall: ${wall.length} tiles`);
  
  // 模拟 Player 0 打牌，检查 Player 1 能否吃
  let hand = [...hands[0]];
  let wallIdx = 0;
  let chowOpportunities = 0;
  let chowTaken = 0;
  let pengOpportunities = 0;
  let pengTaken = 0;
  
  for (let turn = 0; turn < 50; turn++) {
    if (wallIdx < wall.length) {
      hand.push(wall[wallIdx++]);
    } else break;
    
    const winResult = canWin(hand, [], null);
    if (winResult.canWin) {
      console.log(`Turn ${turn+1}: WIN! types: ${winResult.types.join(', ')}`);
      return;
    }
    
    // 模拟打牌
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
      
      // 测试 shouldClaimPendingAction
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
      if (action === ActionType.CHOW) {
        chowTaken++;
        console.log(`Turn ${turn+1}: P1 CHOW ${discarded.suit}-${discarded.value}!`);
      }
    }
    
    // 检查 Player 1 能否碰
    let pengCount = 0;
    for (const t of p1Hand) { if (tilesEqual(t, discarded)) pengCount++; }
    if (pengCount >= 2) {
      pengOpportunities++;
      
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
        pendingActions: [{ playerId: 'bot-1', tile: discarded, availableActions: ['peng'] }],
      } as any;
      
      const action = shouldClaimPendingAction(p1Bot, [ActionType.PENG, ActionType.PASS], p1Game);
      if (action === ActionType.PENG) {
        pengTaken++;
        console.log(`Turn ${turn+1}: P1 PENG ${discarded.suit}-${discarded.value}!`);
      }
    }
  }
  
  console.log(`\n=== 统计 ===`);
  console.log(`吃牌机会: ${chowOpportunities}, 实际吃: ${chowTaken}`);
  console.log(`碰牌机会: ${pengOpportunities}, 实际碰: ${pengTaken}`);
}

// 跑 5 局
for (let i = 0; i < 5; i++) {
  testOneGame();
}
