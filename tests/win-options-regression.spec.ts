import { generateWinOptions } from '../server/utils/scoring';
import { gameManager } from '../server/utils/gameManager';
import { GameEndReason, GamePhase, PlayerStatus } from '../server/types/game';
import { HandType } from '../server/utils/handValidator';
import { TileSuit } from '../server/types/game';

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
  return { id, suit, value };
}

function player(id: string, tiles: ReturnType<typeof tile>[]) {
  return {
    id,
    userId: id,
    name: id,
    position: 0,
    score: 0,
    isDealer: false,
    status: PlayerStatus.PLAYING,
    isReady: true,
    isConnected: true,
    isBot: false,
    hand: {
      concealedTiles: [...tiles],
      exposedMelds: [],
      discardedTiles: []
    },
    actions: [],
    isTing: false,
    missingSuit: null,
    windScore: 0,
    rainScore: 0,
    wonFan: 0,
    winOrder: null,
    winRound: null,
    winTimestamp: null
  } as any
}

function game(players: any[]) {
  return {
    gameId: 'win-options-regression',
    players,
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
    drawnThisTurn: true,
    roomOwner: players[0]?.id,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    botTakeoverPlayers: []
  } as any
}

console.log('\n=== 回归测试: 胡牌选项/百搭算分 ===\n');

// 用例1：复合牌型应拆出多个候选，供前端按分数显示 TOP3
{
  const handTiles = [
    tile('1', TileSuit.DOTS, 1), tile('2', TileSuit.DOTS, 1), tile('3', TileSuit.DOTS, 1),
    tile('4', TileSuit.DOTS, 2), tile('5', TileSuit.DOTS, 2), tile('6', TileSuit.DOTS, 2),
    tile('7', TileSuit.DOTS, 3), tile('8', TileSuit.DOTS, 3), tile('9', TileSuit.DOTS, 3),
    tile('10', TileSuit.DOTS, 4), tile('11', TileSuit.DOTS, 4), tile('12', TileSuit.DOTS, 4),
    tile('13', TileSuit.DOTS, 5), tile('14', TileSuit.DOTS, 5)
  ];

  const options = generateWinOptions({
    handTiles,
    exposedMelds: [],
    flowerTiles: [],
    handTypes: [HandType.QING_PENG, HandType.FULL_FLUSH, HandType.ALL_TRIPLETS],
    isKongFlower: false,
    isRobbingKong: false,
    isMenQing: true,
    rawRoundMultiplier: 1,
    rawInheritMultiplier: 1,
    settlementMultiplier: 1
  }).filter(option => option.type === 'self_draw');

  test('复合牌型至少拆出 3 个胡牌候选', options.length >= 3, `actual=${options.length}`);
  test('候选包含清碰', options.some(option => option.handTypeName === '清碰' || option.label.includes('清碰')));
  test('候选包含清一色', options.some(option => option.handTypeName === '清一色' || option.label.includes('清一色')));
  test('候选包含碰碰胡', options.some(option => option.handTypeName === '碰碰胡' || option.label.includes('碰碰胡')));
}

// 用例2：有百搭但“百搭归位”仍可胡时，应生成无百搭翻倍选项
{
  const handTiles = [
    tile('1', TileSuit.DOTS, 1), tile('2', TileSuit.DOTS, 1), tile('3', TileSuit.DOTS, 1),
    tile('4', TileSuit.DOTS, 2), tile('5', TileSuit.DOTS, 2), tile('6', TileSuit.DOTS, 2),
    tile('7', TileSuit.DOTS, 3), tile('8', TileSuit.DOTS, 3), tile('9', TileSuit.DOTS, 3),
    tile('10', TileSuit.DOTS, 4), tile('11', TileSuit.DOTS, 4), tile('12', TileSuit.DOTS, 4),
    tile('13', TileSuit.DOTS, 5), tile('14', TileSuit.DOTS, 5)
  ];

  const options = generateWinOptions({
    handTiles,
    exposedMelds: [],
    flowerTiles: [],
    handTypes: [HandType.QING_PENG, HandType.FULL_FLUSH, HandType.ALL_TRIPLETS],
    isKongFlower: false,
    isRobbingKong: false,
    isMenQing: true,
    wildTileSuit: TileSuit.DOTS,
    wildTileValue: 1,
    rawRoundMultiplier: 1,
    rawInheritMultiplier: 1,
    settlementMultiplier: 1
  });

  test('百搭归位时生成无百搭翻倍候选', options.some(option => option.label.includes('无百搭')));
}

// 用例3：玩家确认某个胡牌选项后，服务端应按该选项结算，不应在 handleHu 内引用未定义变量
{
  const p1 = player('p1', [
    tile('1', TileSuit.DOTS, 1), tile('2', TileSuit.DOTS, 1), tile('3', TileSuit.DOTS, 1),
    tile('4', TileSuit.DOTS, 2), tile('5', TileSuit.DOTS, 2), tile('6', TileSuit.DOTS, 2),
    tile('7', TileSuit.DOTS, 3), tile('8', TileSuit.DOTS, 3), tile('9', TileSuit.DOTS, 3),
    tile('10', TileSuit.DOTS, 4), tile('11', TileSuit.DOTS, 4), tile('12', TileSuit.DOTS, 4),
    tile('13', TileSuit.DOTS, 5), tile('14', TileSuit.DOTS, 5)
  ])
  p1.isDealer = true

  const currentGame = game([p1])
  const options = generateWinOptions({
    handTiles: p1.hand.concealedTiles,
    exposedMelds: [],
    flowerTiles: [],
    handTypes: [],
    isKongFlower: false,
    isRobbingKong: false,
    isMenQing: true,
    rawRoundMultiplier: 1,
    rawInheritMultiplier: 1,
    settlementMultiplier: 1
  }).filter(option => option.type === 'self_draw')

  const selected = options.find(option => option.handTypeName === '碰碰胡' || option.label.includes('碰碰胡'))
  let threw = false
  try {
    await (gameManager as any).handleHu(currentGame, p1, selected?.label)
  } catch (error) {
    threw = true
    console.error(error)
  }

  test('handleHu 选择胡牌方案时不抛异常', !threw)
  test('handleHu 按选中方案记录牌型', p1.winHandType === selected?.handTypeName, `actual=${p1.winHandType}, expected=${selected?.handTypeName}`)
  test('handleHu 按选中方案记录点数', p1.wonFan === selected?.score, `actual=${p1.wonFan}, expected=${selected?.score}`)
  test('handleHu 正常结束单人测试局', currentGame.phase === GamePhase.ENDED || currentGame.endReason === GameEndReason.LAST_PLAYER)
}

// 鐢ㄤ緥4锛歞iscard 鍦烘櫙鐨?win-options 鍙互鎶婂緟鑳＄墝骞跺叆璁＄畻锛屼笖鍙繑鍥?op 3
{
  const p1 = player('p1-discard', [
    tile('1', TileSuit.DOTS, 1), tile('2', TileSuit.DOTS, 1),
    tile('3', TileSuit.DOTS, 2), tile('4', TileSuit.DOTS, 2), tile('5', TileSuit.DOTS, 2),
    tile('6', TileSuit.DOTS, 3), tile('7', TileSuit.DOTS, 3), tile('8', TileSuit.DOTS, 3),
    tile('9', TileSuit.DOTS, 4), tile('10', TileSuit.DOTS, 4), tile('11', TileSuit.DOTS, 4),
    tile('12', TileSuit.DOTS, 5), tile('13', TileSuit.DOTS, 5)
  ])
  const p2 = player('p2-discard', [])
  p2.position = 1

  const currentGame = game([p1, p2])
  const winningTile = tile('win', TileSuit.DOTS, 1)
  currentGame.pendingActions = [{
    playerId: p1.id,
    availableActions: ['hu', 'pass'],
    tile: winningTile,
    expiresAt: Date.now() + 5000
  }]

  ;(gameManager as any).games.set(currentGame.gameId, currentGame)
  const options = await gameManager.getWinOptionsForPlayer(currentGame.gameId, p1.id)

  test('discard 场景返回胡牌候选', options.length > 0, `actual=${options.length}`)
  test('discard 场景 win-options 限制为 Top 3', options.length <= 3, `actual=${options.length}`)
  test('discard 场景候选类型正确', options.every(option => option.type === 'discard'))
}

console.log('\n==================================================');
console.log(`测试结果: ${passed} 通过, ${failed} 失败`);
if (failed > 0) {
  process.exit(1);
}
console.log('胡牌选项专项回归通过');
