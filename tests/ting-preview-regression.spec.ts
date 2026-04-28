import { gameManager } from '../server/utils/gameManager';
import { GamePhase, PlayerStatus, TileSuit } from '../server/types/game';

let passed = 0;
let failed = 0;

function test(name: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  PASS ${name}`);
    passed++;
  } else {
    console.log(`  FAIL ${name}${detail ? ` - ${detail}` : ''}`);
    failed++;
  }
}

function tile(id: string, suit: TileSuit, value: number) {
  return { id, suit, value, isFlower: false };
}

console.log('\n=== 回归测试: 听牌预计算缓存 ===\n');

const player = {
  id: 'ting-player',
  userId: 'ting-player',
  name: 'ting-player',
  position: 0,
  score: 0,
  isDealer: true,
  status: PlayerStatus.PLAYING,
  isReady: true,
  isConnected: true,
  isBot: false,
  hand: {
    concealedTiles: [
      tile('s1', TileSuit.WIND, 2),
      tile('s2', TileSuit.WIND, 2),
      tile('s3', TileSuit.WIND, 2),
      tile('d1', TileSuit.DOTS, 2),
      tile('d2', TileSuit.DOTS, 2),
      tile('d3', TileSuit.DOTS, 2),
      tile('d4', TileSuit.DOTS, 3),
      tile('d5', TileSuit.DOTS, 4),
      tile('d6', TileSuit.DOTS, 6),
      tile('d7', TileSuit.DOTS, 7),
      tile('d8', TileSuit.DOTS, 9),
      tile('j1', TileSuit.DRAGON, 2),
      tile('j2', TileSuit.DRAGON, 2),
    ],
    exposedMelds: [],
    discardedTiles: []
  },
  actions: [],
  isTing: true,
  missingSuit: null,
  windScore: 0,
  rainScore: 0,
  wonFan: 0,
  winOrder: null,
  winRound: null,
  winTimestamp: null
} as any;

const currentGame = {
  gameId: 'ting-preview-regression',
  players: [player],
  spectators: [],
  phase: GamePhase.PLAYING,
  wall: [],
  discardPile: [],
  currentPlayerIndex: 0,
  dealerIndex: 0,
  currentRound: 1,
  roundNumber: 1,
  pendingActions: [],
  actionHistory: [],
  dice: [1, 1],
  roundMultiplier: 1,
  inheritMultiplier: 1,
  settlementMultiplier: 1,
  hesitationWindow: 5000,
  winnersCount: 0,
  drawnThisTurn: false,
  roomOwner: player.id,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  botTakeoverPlayers: [],
  customScoringMode: 'feng-2'
} as any;

(gameManager as any).games.set(currentGame.gameId, currentGame);

const preview = await gameManager.getTingPreviewForPlayer(currentGame.gameId, player.id);
test('听牌预计算识别为听牌', preview.isTing === true);
test('听牌预计算返回至少一个可胡牌', preview.winningTiles.length > 0, `actual=${preview.winningTiles.length}`);
test(
  '听牌预计算包含最优解',
  preview.winningTiles.some(item => item.bestOverallOption && item.bestOverallOption.score > 0)
);
test(
  '三百搭场景包含关键待胡张',
  preview.winningTiles.some(item => item.tile.suit === TileSuit.DOTS && (item.tile.value === 5 || item.tile.value === 8 || item.tile.value === 9))
);

player.isTing = false;
(gameManager as any).invalidateWinEvaluationCache(currentGame.gameId, [player.id]);
const staleFlagPreview = await gameManager.getTingPreviewForPlayer(currentGame.gameId, player.id);
test('听牌标记延迟时仍返回听牌预览', staleFlagPreview.isTing === true && staleFlagPreview.winningTiles.length > 0);
player.status = PlayerStatus.LOST;
(gameManager as any).invalidateWinEvaluationCache(currentGame.gameId, [player.id]);
const clearedPreview = await gameManager.getTingPreviewForPlayer(currentGame.gameId, player.id);
test('失去听牌状态后预计算返回空', clearedPreview.isTing === false && clearedPreview.winningTiles.length === 0);

const flowerWildPlayer = {
  ...player,
  id: 'flower-wild-player',
  userId: 'flower-wild-player',
  name: 'flower-wild-player',
  status: PlayerStatus.PLAYING,
  isTing: false,
  hand: {
    concealedTiles: [
      tile('fw1', TileSuit.WIND, 1),
      tile('fw2', TileSuit.WIND, 1),
      tile('fw3', TileSuit.WIND, 1),
      tile('fw4', TileSuit.DOTS, 2),
      tile('fw5', TileSuit.DOTS, 3),
      tile('fw6', TileSuit.DOTS, 4),
      tile('fw7', TileSuit.DOTS, 5),
      tile('fw8', TileSuit.DOTS, 6),
      tile('fw9', TileSuit.DOTS, 7),
      tile('fw10', TileSuit.DRAGON, 2),
      tile('fw11', TileSuit.DRAGON, 2),
      tile('fw12', TileSuit.DOTS, 9),
      tile('fw13', TileSuit.FLOWER, 1),
    ],
    exposedMelds: [],
    discardedTiles: []
  }
} as any;
const flowerWildGame = {
  ...currentGame,
  gameId: 'ting-preview-flower-wild',
  players: [flowerWildPlayer],
  customScoringMode: 'hua-1',
  wildTileGroup: ['1', '2', '3', '4'],
  discardPile: [],
  actionHistory: []
} as any;
(gameManager as any).games.set(flowerWildGame.gameId, flowerWildGame);
(gameManager as any).invalidateWinEvaluationCache(flowerWildGame.gameId, [flowerWildPlayer.id]);
const flowerPreview = await gameManager.getTingPreviewForPlayer(flowerWildGame.gameId, flowerWildPlayer.id);
test(
  'èŠ±ç™¾æ­è§„åˆ™ä¸‹å¬ç‰Œé¢„è§ˆä»èƒ½å±•å¼€å¤šå€™é€‰',
  flowerPreview.winningTiles.length >= 3,
  `tiles=${flowerPreview.winningTiles.map(item => `${item.tile.suit}-${item.tile.value}`).join(',')}`
);

console.log('\n==================================================');
console.log(`测试结果: ${passed} 通过, ${failed} 失败`);
if (failed > 0) {
  process.exit(1);
}
console.log('听牌预计算缓存回归通过');
