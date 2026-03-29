import 'dart:math';
import 'package:mahjong_v2/services/database_service.dart';
// 牌定义
class Tile {
  final int id;
  final TileType type;
  final int number;
  final TileSuit suit;
  final bool isFlower;
  final bool isWild;

  Tile({required this.id, required this.type, required this.number, required this.suit, this.isFlower = false, this.isWild = false});

  // 素材路径
  String get imagePath {
    const dir = 'assets/tilesets/pomax_hq';
    // 花牌用背面
    if (isFlower || suit == TileSuit.hua) {
      return '$dir/Back.png';
    }

    // 根据suit和number返回对应素材
    String prefix = '';
    if (suit == TileSuit.wan) prefix = 'Man';
    else if (suit == TileSuit.tong) prefix = 'Pin';
    else if (suit == TileSuit.tiao) prefix = 'Sou';
    else if (suit == TileSuit.feng) {
      if (number == 1) return '$dir/Ton.png';
      if (number == 2) return '$dir/Nan.png';
      if (number == 3) return '$dir/Shaa.png';
      if (number == 4) return '$dir/Pei.png';
    }
    else if (suit == TileSuit.dragon) {
      if (number == 1) return '$dir/Haku.png';
      if (number == 2) return '$dir/Hatsu.png';
      if (number == 3) return '$dir/Chun.png';
    }

    if (prefix.isEmpty) return '$dir/Blank.png';
    return '$dir/${prefix}$number.png';
  }

  String get displayName {
    if (suit == TileSuit.hua) return '花';
    final nums = ['一','二','三','四','五','六','七','八','九'];
    final suits = ['万','筒','条','风','中','发','白'];
    if (number >=1 && number <=9 && type.index < 3) {
      return '${nums[number-1]}${suits[type.index]}';
    }
    return suits[3 + (number > 4 ? number - 1 : number - 1)];
  }
}

enum TileType { wan, tong, tiao, wind, dragon, flower, blank }
enum TileSuit { wan, tong, tiao, feng, dragon, hua }

// 玩家
class Player {
  final int index;
  String name;
  List<Tile> handTiles = [];
  List<List<Tile>> melds = []; // 吃/碰/杠牌组
  List<bool> meldHidden = []; // 对应是否暗杠/暗刻
  Map<int, int> meldSourceCounts = {}; // 吃/碰/杠来源计数
  List<Tile> flowerTiles = [];
  List<Tile> playedTiles = [];
  int score = 0;
  bool isDealer = false;
  int totalScore = 0;

  Player({required this.index, required this.name});

  int get handCount => handTiles.length;
  int get meldCount => melds.length;

  // 是否满足五毒散（造反牌型）
  bool get isWuDuSan {
    final hand = handTiles.where((t) => !t.isFlower && !t.isWild).toList();
    if (hand.length < 13) return false;

    bool hasWan = hand.any((t) => t.suit == TileSuit.wan);
    bool hasTong = hand.any((t) => t.suit == TileSuit.tong);
    bool hasTiao = hand.any((t) => t.suit == TileSuit.tiao);
    bool hasWind = hand.any((t) => t.type == TileType.wind);
    bool hasDragon = hand.any((t) => t.type == TileType.dragon);
    bool hasFlower = hand.any((t) => t.suit == TileSuit.hua);
    bool hasWild = hand.any((t) => t.isWild);

    if (!hasWan || !hasTong || !hasTiao || !hasWind || !hasDragon || hasFlower || hasWild) return false;

    // 检查是否有对子或刻子（按具体牌面）
    final counts = <String, int>{};
    for (final t in hand) {
      final key = '${t.type.index}_${t.number}';
      counts[key] = (counts[key] ?? 0) + 1;
      if (counts[key]! >= 2) return false;
    }
    return true;
  }

  void sortHand() {
    handTiles.sort((a, b) {
      final suitOrder = a.suit.index.compareTo(b.suit.index);
      if (suitOrder != 0) return suitOrder;
      return a.number.compareTo(b.number);
    });
  }
}

// 牌组类型
enum MeldType { chow, pong, kong }

// 游戏状态
enum GamePhase { waiting, diceRolling, dealing, playing, scoring }

// 结算结果
class SettlementResult {
  final bool isDraw;
  final int? winnerIndex;
  final int basePoints;
  final int roundMultiplier;
  final int extraMultiplier;
  final int totalPoints;
  final Map<int, int> deltas; // 每个玩家的输赢
  final String reason;
  final List<String> details;

  SettlementResult({
    required this.isDraw,
    required this.winnerIndex,
    required this.basePoints,
    required this.roundMultiplier,
    required this.extraMultiplier,
    required this.totalPoints,
    required this.deltas,
    required this.reason,
    this.details = const [],
  });
}

class FixedScore {
  final int points;
  final String reason;
  FixedScore(this.points, this.reason);
}

// 游戏逻辑核心
class MahjongGame {
  List<Tile> wall = []; // 牌墙
  List<Tile> deadWall = [];
  List<Player> players = [];
  int currentPlayerIndex = 0;
  int dealerIndex = 0;
  int roundMultiplier = 1;
  int globalMultiplier = 1;
  int get finalMultiplier => (roundMultiplier * globalMultiplier).clamp(1, 8);
  Tile? wildTile;
  bool diceRolled = false;
  List<int> diceValues = [1, 1];
  int maxDiceRolls = 2;
  int diceRollCount = 0;
  GamePhase phase = GamePhase.waiting;
  Tile? lastPlayedTile;
  Tile? pendingTile; // 等待响应的牌
  bool gameEnded = false;
  bool mustDiscard = false; // 当前玩家是否必须打牌
  bool awaitingPlayerResponse = false; // 等待玩家响应（吃碰杠胡/过）
  bool freezeActive = false; // 冻结：暂停其他玩家响应
  bool responseWindowOpen = false; // 出牌后的1秒响应窗口
  bool allowNextPlayerAction = false; // 响应窗口结束，允许下家摸/吃
  bool responseTimerActive = false;
  int? nextPlayerIndex;
  Duration responseWindowDuration = const Duration(seconds: 1);
  Duration aiRespondDelay = const Duration(milliseconds: 300);
  Duration aiDiscardDelay = const Duration(milliseconds: 500);
  bool useMonteCarloAI = true;
  int monteCarloTrials = 100;
  int monteCarloMaxSteps = 80;
  Duration monteCarloBudget = const Duration(milliseconds: 300);
  bool simulationMode = false;
  double aiAggression = 1.0; // 1.0 = normal, >1.0 = more aggressive
  bool aiPersistStatsEnabled = true;
  bool aiPersistStrategyEnabled = false;
  bool aiPersistDecisionEnabled = false;
  String currentGameId = '';
  int aiDecisionSeq = 0;
  int _lastMcTrials = 0;
  int turnCounter = 0;
  bool robbingKong = false;
  int? robKongOwnerIndex;
  Tile? robKongTile;
  int? robKongMeldIndex;
  List<int> freezeChances = [3, 3, 3, 3];
  List<bool> rebelDecided = [false, false, false, false];
  Set<int> huClaimers = {};
  int? firstHuClaimer;
  void Function()? onStateChanged;
  int? lastDiscarderIndex;
  bool lastKongDraw = false; // 是否为杠/补花后的补牌
  int? lastWinnerIndex;
  bool lastWinFromDiscard = false;
  SettlementResult? lastSettlement;

  // 包关系: baoRelations[fromPlayer][toPlayer] = count
  // 表示 fromPlayer 吃了/碰了 toPlayer 多少口
  Map<int, Map<int, int>> baoRelations = {};
  Map<String, int> hotTiles = {}; // 被吃/碰/杠过的热牌类型
  Map<String, int> deadTiles = {}; // 被打出的安全牌

  // 血战到底：记录已胡牌的玩家
  List<int> eliminatedPlayers = [];
  // 当前剩余玩家数
  int get activePlayerCount => 4 - eliminatedPlayers.length;

  MahjongGame({this.maxDiceRolls = 2}) {
    players = [
      Player(index: 0, name: '东家'),
      Player(index: 1, name: '南家'),
      Player(index: 2, name: '西家'),
      Player(index: 3, name: '北家'),
    ];
    currentGameId = DateTime.now().millisecondsSinceEpoch.toString();
    initWall();
  }

  // 初始化牌墙
  void initWall() {
    wall.clear();
    int id = 0;
    // 万子 1-9 x4
    for (int n = 1; n <= 9; n++) {
      for (int i = 0; i < 4; i++) {
        wall.add(Tile(id: id++, type: TileType.wan, number: n, suit: TileSuit.wan));
      }
    }
    // 筒子 1-9 x4
    for (int n = 1; n <= 9; n++) {
      for (int i = 0; i < 4; i++) {
        wall.add(Tile(id: id++, type: TileType.tong, number: n, suit: TileSuit.tong));
      }
    }
    // 条子 1-9 x4
    for (int n = 1; n <= 9; n++) {
      for (int i = 0; i < 4; i++) {
        wall.add(Tile(id: id++, type: TileType.tiao, number: n, suit: TileSuit.tiao));
      }
    }
    // 风牌 东南西北 x4
    for (int n = 1; n <= 4; n++) {
      for (int i = 0; i < 4; i++) {
        wall.add(Tile(id: id++, type: TileType.wind, number: n, suit: TileSuit.feng));
      }
    }
    // 箭牌 中发白 x4
    for (int n = 1; n <= 3; n++) {
      for (int i = 0; i < 4; i++) {
        wall.add(Tile(id: id++, type: TileType.dragon, number: n, suit: TileSuit.dragon));
      }
    }
    // 花牌 春夏秋冬梅兰菊竹 x8
    for (int n = 1; n <= 8; n++) {
      wall.add(Tile(id: id++, type: TileType.flower, number: n, suit: TileSuit.hua, isFlower: true));
    }
    // 洗牌
    wall.shuffle(Random());
  }

  int get remainingTiles => wall.length;

  bool get canRollDice => diceRollCount < maxDiceRolls;

  // 掷骰子
  // 生成百搭（在掷骰子前，从完整牌堆中随机选）
  void generateWildTile() {
    // 创建完整牌堆
    final allTiles = <Tile>[];
    int id = 0;
    // 万子 1-9 x 4
    for (int n = 1; n <= 9; n++) {
      for (int i = 0; i < 4; i++) {
        allTiles.add(Tile(id: id++, type: TileType.wan, number: n, suit: TileSuit.wan));
      }
    }
    // 筒子 1-9 x 4
    for (int n = 1; n <= 9; n++) {
      for (int i = 0; i < 4; i++) {
        allTiles.add(Tile(id: id++, type: TileType.tong, number: n, suit: TileSuit.tong));
      }
    }
    // 条子 1-9 x 4
    for (int n = 1; n <= 9; n++) {
      for (int i = 0; i < 4; i++) {
        allTiles.add(Tile(id: id++, type: TileType.tiao, number: n, suit: TileSuit.tiao));
      }
    }
    // 风牌 x 4
    for (int n = 0; n < 4; n++) {
      for (int i = 0; i < 4; i++) {
        allTiles.add(Tile(id: id++, type: TileType.wind, number: n, suit: TileSuit.feng));
      }
    }
    // 箭牌 x 4
    for (int n = 0; n < 3; n++) {
      for (int i = 0; i < 4; i++) {
        allTiles.add(Tile(id: id++, type: TileType.dragon, number: n, suit: TileSuit.dragon));
      }
    }
    // 花牌 x 8
    for (int n = 1; n <= 8; n++) {
      allTiles.add(Tile(id: id++, type: TileType.flower, number: n, suit: TileSuit.hua, isFlower: true));
    }
    // 从完整牌堆中随机选一张作为百搭
    wildTile = allTiles[Random().nextInt(allTiles.length)];
  }

  bool rollDice() {
    if (!canRollDice) return false;
    
    // 首次掷骰子时，生成百搭
    if (diceRollCount == 0 && wildTile == null) {
      generateWildTile();
    }
    
    diceValues[0] = Random().nextInt(6) + 1;
    diceValues[1] = Random().nextInt(6) + 1;
    diceRolled = true;
    diceRollCount += 1;

    // 计算回合倍数（按最新规则）
    final d1 = diceValues[0];
    final d2 = diceValues[1];
    if (d1 == d2) {
      // 对子：1+1 和 4+4 为4倍，其他对子2倍
      roundMultiplier = (d1 == 1 || d1 == 4) ? 4 : 2;
    } else if ((d1 == 1 && d2 == 4) || (d1 == 4 && d2 == 1)) {
      // 1-4 组合两倍
      roundMultiplier = 2;
    } else {
      roundMultiplier = 1;
    }
    return true;
  }

  // 发牌 - 庄家14张，闲家13张
  // 发一张牌，自动处理花牌
  void dealOneTile(Player player) {
    if (wall.isEmpty) return;
    final tile = wall.removeLast();
    final isFlowerTile = tile.isFlower || tile.suit == TileSuit.hua;
    if (isFlowerTile) {
      player.flowerTiles.add(tile);
    } else {
      player.handTiles.add(tile);
    }
  }

  void deal() {
    // 清空上一局
    for (final p in players) {
      p.handTiles.clear();
      p.melds.clear();
      p.meldHidden.clear();
      p.meldSourceCounts.clear();
      p.playedTiles.clear();
      p.flowerTiles.clear();
    }
    // 本局百搭（从144张中随机选一张，不移除）
    if (wall.isNotEmpty) {
      wildTile = wall[Random().nextInt(wall.length)];
    }
    rebelDecided = [false, false, false, false];
    // 发牌时自动处理花牌
    for (int i = 0; i < 3; i++) {
      for (int p = 0; p < 4; p++) {
        final idx = (dealerIndex + p) % 4;
        for (int j = 0; j < 4; j++) {
          dealOneTile(players[idx]);
        }
      }
    }
    // 每人再摸1张（13张）
    for (int p = 0; p < 4; p++) {
      final idx = (dealerIndex + p) % 4;
      dealOneTile(players[idx]);
    }
    // 庄家额外1张（14张）
    dealOneTile(players[dealerIndex]);
    // 整理手牌
    for (final p in players) {
      p.sortHand();
    }
    // 庄家先出牌
    currentPlayerIndex = dealerIndex;
    mustDiscard = currentPlayerIndex == 0;
    phase = GamePhase.playing;

    currentGameId = DateTime.now().millisecondsSinceEpoch.toString();
    aiDecisionSeq = 0;
    turnCounter = 0;
    _persistAIStrategy();
  }

  // 摸牌
  Tile? drawTile(Player player, {bool isKongDraw = false}) {
    if (wall.isEmpty) {
      // 流局
      resolveDraw();
      return null;
    }
    // 玩家已摸过牌则不可再次摸牌（杠/补花补牌不受此限制）
    if (player.index == 0 && mustDiscard && !isKongDraw) return null;

    final tile = wall.removeLast();
    // 如果是花牌，移到花区
    if (tile.isFlower || tile.suit == TileSuit.hua) {
      player.flowerTiles.add(tile);
    } else {
      player.handTiles.add(tile);
      player.sortHand(); // 只对手牌排序
    }
    if (player.index == 0) {
      mustDiscard = true; // 玩家必须打牌
    }
    lastKongDraw = isKongDraw;
    return tile;
  }

  // 打牌
  void playTile(Player player, Tile tile) {
    player.handTiles.remove(tile);
    player.playedTiles.add(tile);
    pendingTile = tile;
    lastPlayedTile = tile;
    lastDiscarderIndex = player.index;
    awaitingPlayerResponse = false;
    lastKongDraw = false;
    responseWindowOpen = true;
    allowNextPlayerAction = false;
    responseTimerActive = false;
    nextPlayerIndex = _peekNextPlayerIndex();
    turnCounter += 1;
    rebelDecided[player.index] = true;
    _resetHuClaims();
    _recordDeadTile(tile);
    if (player.index == 0) {
      mustDiscard = false; // 打牌后可进入下一轮
    }

    // 检查是否有玩家响应（吃/碰/杠/胡）
    processTurn();
  }

  // 逆时针下一家（跳过已胡玩家）
  void nextPlayer() {
    for (int i = 0; i < 4; i++) {
      currentPlayerIndex = (currentPlayerIndex + 3) % 4;
      if (!eliminatedPlayers.contains(currentPlayerIndex)) {
        return;
      }
    }
  }

  int _peekNextPlayerIndex() {
    int idx = currentPlayerIndex;
    for (int i = 0; i < 4; i++) {
      idx = (idx + 3) % 4;
      if (!eliminatedPlayers.contains(idx)) return idx;
    }
    return currentPlayerIndex;
  }

  void _clearResponseWindowFlags() {
    responseWindowOpen = false;
    allowNextPlayerAction = false;
    responseTimerActive = false;
    nextPlayerIndex = null;
    awaitingPlayerResponse = false;
  }

  void _resetHuClaims() {
    huClaimers.clear();
    firstHuClaimer = null;
  }

  bool canUseFreeze(int playerIndex) => freezeChances[playerIndex] > 0;

  void useFreeze(int playerIndex) {
    if (freezeChances[playerIndex] > 0) {
      freezeChances[playerIndex] -= 1;
    }
  }

  // 检查是否可以吃（上家动态）
  bool canChow(Player player) {
    if (robbingKong) return false;
    if (pendingTile == null) return false;
    final t = pendingTile!;
    if (_isWildTile(t)) return false; // 百搭牌不可吃碰杠
    // 只能吃上家（逆时针方向）
    // 当前是 playerIndex，上家是 (playerIndex + 1) % 4
    final fromPlayer = (currentPlayerIndex + 1) % 4;
    // 只有当前玩家是下家时才能吃上家的牌
    if (player.index != fromPlayer) return false;

    // 只能吃顺子，不能吃字牌
    if (t.suit == TileSuit.hua) return false;

    // 找能组成顺子的三张牌
    for (int n = 1; n <= 9; n++) {
      final need1 = Tile(id: -1, type: t.type, number: n, suit: t.suit);
      final need2 = Tile(id: -1, type: t.type, number: n + 1, suit: t.suit);
      final need3 = Tile(id: -1, type: t.type, number: n + 2, suit: t.suit);

      if (n + 2 > 9) continue; // 超出范围

      if (_playerHasTiles(player, [need1, need2, need3])) {
        return true;
      }
    }
    return false;
  }

  // 获取可以吃的组合
  List<List<Tile>> getChowCombos(Player player) {
    if (pendingTile == null || currentPlayerIndex == 0) return [];

    final fromPlayer = (currentPlayerIndex + 1) % 4;
    if (player.index != fromPlayer) return [];

    final t = pendingTile!;
    if (t.suit == TileSuit.hua) return [];

    final combos = <List<Tile>>[];
    for (int n = 1; n <= 9; n++) {
      if (n + 2 > 9) continue;
      final need1 = Tile(id: -1, type: t.type, number: n, suit: t.suit);
      final need2 = Tile(id: -1, type: t.type, number: n + 1, suit: t.suit);
      final need3 = Tile(id: -1, type: t.type, number: n + 2, suit: t.suit);

      if (_playerHasTiles(player, [need1, need2, need3])) {
        // 返回的组合包含 pendingTile 在中间位置
        // 例如吃 5万，手里有 34万/46万 两种组合
        combos.add([need1, need2, need3]);
      }
    }
    return combos;
  }

  // 执行吃牌（单组合自动吃）
  bool doChow(Player player, List<Tile>? selectedTiles) {
    if (pendingTile == null) return false;
    final combos = getChowCombos(player);
    if (combos.isEmpty) return false;

    List<Tile> combo;

    if (combos.length == 1) {
      // 只有一种组合，自动吃
      combo = combos.first;
    } else if (selectedTiles != null && selectedTiles.length == 2) {
      // 多种组合，玩家已选择2张
      // 找到匹配的组合
      combo = combos.firstWhere(
        (c) => _containsTiles(c.sublist(0, 2), selectedTiles),
        orElse: () => combos.first,
      );
    } else {
      // 多种组合但玩家未选择
      return false;
    }

    // 移除手牌中的两张牌
    final toRemove = combo.sublist(0, 2);
    for (final t in toRemove) {
      final idx = player.handTiles.indexWhere(
        (x) => x.type == t.type && x.number == t.number,
      );
      if (idx >= 0) {
        player.handTiles.removeAt(idx);
      }
    }

    // 添加吃牌组合到 melds（pendingTile 放中间）
    player.melds.add(combo);
    player.meldHidden.add(false);

    // 记录包关系（上家是被吃的一方）
    final fromPlayer = player.index; // 吃牌者
    final toPlayer = (currentPlayerIndex + 1) % 4; // 上家
    recordBao(fromPlayer, toPlayer);
    player.meldSourceCounts[toPlayer] = (player.meldSourceCounts[toPlayer] ?? 0) + 1;

    if (pendingTile != null) _recordHotTile(pendingTile!);

    // 吃牌后轮到该玩家出牌
    pendingTile = null;
    _clearResponseWindowFlags();
    currentPlayerIndex = player.index;
    if (player.index == 0) {
      mustDiscard = true;
    }
    return true;
  }

  bool _containsTiles(List<Tile> a, List<Tile> b) {
    if (a.length != b.length) return false;
    for (int i = 0; i < a.length; i++) {
      if (a[i].type != b[i].type || a[i].number != b[i].number) {
        return false;
      }
    }
    return true;
  }

  // 执行碰牌
  bool doPong(Player player) {
    if (pendingTile == null) return false;
    final t = pendingTile!;

    // 找到手里的两张相同牌
    final indices = <int>[];
    for (int i = 0; i < player.handTiles.length; i++) {
      if (player.handTiles[i].type == t.type && player.handTiles[i].number == t.number) {
        indices.add(i);
        if (indices.length == 2) break;
      }
    }

    if (indices.length < 2) return false;

    // 移除两张牌
    for (int i = indices.length - 1; i >= 0; i--) {
      player.handTiles.removeAt(indices[i]);
    }

    // 添加刻子到 melds
    player.melds.add([t, t, t]);
    player.meldHidden.add(false);

    // 记录包关系（打牌者是被碰的一方）
    final fromPlayer = player.index; // 碰牌者
    final toPlayer = currentPlayerIndex; // 打牌者
    recordBao(fromPlayer, toPlayer);
    player.meldSourceCounts[toPlayer] = (player.meldSourceCounts[toPlayer] ?? 0) + 1;

    if (pendingTile != null) _recordHotTile(pendingTile!);

    // 碰牌后轮到该玩家出牌
    pendingTile = null;
    _clearResponseWindowFlags();
    currentPlayerIndex = player.index;
    if (player.index == 0) {
      mustDiscard = true;
    }
    return true;
  }

  bool _playerHasTiles(Player player, List<Tile> need) {
    final hand = List<Tile>.from(player.handTiles);
    for (final n in need) {
      final idx = hand.indexWhere((t) => t.type == n.type && t.number == n.number);
      if (idx < 0) return false;
      hand.removeAt(idx);
    }
    return true;
  }

  // 记录包关系（吃牌/碰牌/杠牌后调用）
  // 三口/四口条件是单向的，但结算时是双向的
  void recordBao(int fromPlayer, int toPlayer) {
    // 记录单向关系
    baoRelations[fromPlayer] ??= {};
    baoRelations[fromPlayer]![toPlayer] = (baoRelations[fromPlayer]![toPlayer] ?? 0) + 1;

    // 结算时是双向的，所以也记录反向关系
    baoRelations[toPlayer] ??= {};
    baoRelations[toPlayer]![fromPlayer] = (baoRelations[toPlayer]![fromPlayer] ?? 0) + 1;
  }

  // 获取包倍数（0=无, 3=包三家, 5=包四家）
  int getBaoMultiplier(int fromPlayer, int toPlayer) {
    final count = baoRelations[fromPlayer]?[toPlayer] ?? 0;
    if (count >= 4) return 5; // 包四家
    if (count >= 3) return 3; // 包三家
    return 0;
  }

  // 检查是否有包关系
  bool hasBaoRelation(int fromPlayer, int toPlayer) {
    return getBaoMultiplier(fromPlayer, toPlayer) > 0;
  }

  // 造反成功（算作流局的一种）
  // 下局翻倍 + 换庄
  void resolveRebelAsDraw(int rebelPlayerIndex) {
    // 翻倍（最高8倍）
    globalMultiplier = (globalMultiplier * 2).clamp(1, 8);

    // 换庄：造反者成为新庄家
    dealerIndex = rebelPlayerIndex;

    // 标记为流局
    _applySettlement(_settleDraw('造反流局'));
  }

  // 流局处理：翻倍 + 换庄
  void resolveDraw() {
    // 翻倍（最高8倍）
    globalMultiplier = (globalMultiplier * 2).clamp(1, 8);

    // 换庄
    dealerIndex = (dealerIndex + 1) % 4;

    // 标记为流局
    _applySettlement(_settleDraw('流局'));
  }

  // ===== 结算模块 =====
  SettlementResult _settleDraw(String reason) {
    final deltas = <int, int>{};
    for (int i = 0; i < 4; i++) {
      deltas[i] = 0;
    }
    return SettlementResult(
      isDraw: true,
      winnerIndex: null,
      basePoints: 0,
      roundMultiplier: finalMultiplier,
      extraMultiplier: 1,
      totalPoints: 0,
      deltas: deltas,
      reason: reason,
      details: const [],
    );
  }

  SettlementResult _settleWin(int winnerIndex, {String reason = '胡牌'}) {
    final winner = players[winnerIndex];
    final isSelfDraw = !lastWinFromDiscard;
    final extraTile = lastWinFromDiscard ? lastPlayedTile : null;
    final fixed = _calcFixedScore(winner, isSelfDraw, extra: extraTile);
    final huType = _calcHuType(winner, extra: extraTile);
    final useFormula = huType == '混一色' || huType == '碰碰胡';
    final basePoints = fixed.points > 0 ? fixed.points : (useFormula ? min(10, _calcBasePoints(winner, extra: extraTile)) : 0);
    final finalReason = fixed.points > 0 ? fixed.reason : (huType ?? reason);
    final extraMultiplier = _calcExtraMultiplier(winner, extraTile: extraTile);
    final total = basePoints * finalMultiplier * extraMultiplier;

    final active = <int>[];
    for (int i = 0; i < 4; i++) {
      if (!eliminatedPlayers.contains(i)) active.add(i);
    }
    final payers = active.where((i) => i != winnerIndex).toList();
    final deltas = <int, int>{};
    for (int i = 0; i < 4; i++) {
      deltas[i] = 0;
    }

    // 找互包对象（取最高倍）
    int? baoPartner;
    int baoMult = 0;
    for (final p in payers) {
      final m = getBaoMultiplier(winnerIndex, p);
      if (m > baoMult) { baoMult = m; baoPartner = p; }
    }

    final details = <String>[];

    if (!isSelfDraw) {
      final shooter = lastDiscarderIndex;
      if (shooter != null) {
        if (baoPartner != null && shooter == baoPartner) {
          // 互包互相放冲：2倍
          deltas[winnerIndex] = total * 2;
          deltas[shooter] = -total * 2;
          details.add('互包互相放冲：${players[shooter].name} ×2');
        } else if (baoPartner != null && shooter != baoPartner) {
          // 第三方放冲：放冲者×1，互包方×1
          deltas[winnerIndex] = total * 2;
          deltas[shooter] = -total;
          deltas[baoPartner] = -total;
          details.add('第三方放冲：${players[shooter].name} ×1 + ${players[baoPartner].name} ×1');
        } else {
          deltas[winnerIndex] = total;
          deltas[shooter] = -total;
          details.add('放冲：${players[shooter].name} ×1');
        }
      } else {
        // 兜底：按自摸×1
        deltas[winnerIndex] = total * payers.length;
        for (final p in payers) {
          deltas[p] = -total;
        }
        details.add('放冲未知，按自摸×1');
      }
    } else {
      if (baoPartner != null && baoMult >= 5) {
        // 四口自摸：互包方×5，其他0
        deltas[winnerIndex] = total * 5;
        deltas[baoPartner] = -total * 5;
        details.add('互包四口自摸：${players[baoPartner].name} ×5，其余0');
      } else if (baoPartner != null && baoMult >= 3) {
        // 三口自摸：互包方×3，其余×1
        deltas[winnerIndex] = total * (payers.length + 2);
        deltas[baoPartner] = -total * 3;
        for (final p in payers) {
          if (p == baoPartner) continue;
          deltas[p] = -total;
        }
        details.add('互包三口自摸：${players[baoPartner].name} ×3，其余×1');
      } else {
        // 普通自摸：全员×1
        deltas[winnerIndex] = total * payers.length;
        for (final p in payers) {
          deltas[p] = -total;
        }
        details.add('自摸：其余玩家×1');
      }
    }

    return SettlementResult(
      isDraw: false,
      winnerIndex: winnerIndex,
      basePoints: basePoints,
      roundMultiplier: finalMultiplier,
      extraMultiplier: extraMultiplier,
      totalPoints: total,
      deltas: deltas,
      reason: finalReason,
      details: details,
    );
  }

  // 预览单次胡牌结算（不改动分数，仅计算）
  SettlementResult previewSettlement(int winnerIndex, {String reason = '胡牌'}) {
    return _settleWin(winnerIndex, reason: reason);
  }

  FixedScore _calcFixedScore(Player winner, bool isSelfDraw, {Tile? extra}) {
    final huType = _calcHuType(winner, extra: extra);
    if (huType == '风碰') return FixedScore(40, '风碰');
    if (huType == '风一色') return FixedScore(20, '风一色');
    if (huType == '清碰') return FixedScore(20, '清碰');
    if (huType == '清一色') return FixedScore(10, '清一色');
    if (_isWuHuaZiMo(winner, isSelfDraw)) return FixedScore(10, '无花自摸');
    if (_isGangKai(winner, isSelfDraw)) return FixedScore(10, '杠开');
    if (_isBaHuaZiMo(winner, isSelfDraw)) return FixedScore(10, '八花自摸');
    if (_isSiBaiDa(winner, isSelfDraw)) return FixedScore(10, '四百搭');
    return FixedScore(0, '');
  }

  int _calcBasePoints(Player winner, {Tile? extra}) {
    final flowerCount = _countFlowers(winner);
    final meldPoints = _calcMeldPoints(winner, extra: extra);
    return 2 + flowerCount + meldPoints;
  }

  int _countFlowers(Player winner) {
    final inHand = winner.handTiles.where((t) => t.isFlower || t.suit == TileSuit.hua).length;
    return winner.flowerTiles.length + inHand;
  }

  int _calcMeldPoints(Player winner, {Tile? extra}) {
    int points = 0;
    final tiles = _allNonFlowerTilesWithExtra(winner, extra);
    final counts = <String, int>{};
    for (final t in tiles) {
      final key = '${t.type.index}_${t.number}';
      counts[key] = (counts[key] ?? 0) + 1;
    }
    for (final entry in counts.entries) {
      final parts = entry.key.split('_');
      final typeIdx = int.parse(parts[0]);
      final cnt = entry.value;
      if (cnt >= 3) {
        final isKong = cnt == 4;
        if (typeIdx == TileType.wind.index) {
          points += isKong ? 2 : 1;
        } else if (typeIdx == TileType.dragon.index) {
          points += isKong ? 3 : 2;
        } else if (isKong) {
          points += 1;
        }
      }
    }
    return points;
  }

  int _calcExtraMultiplier(Player winner, {Tile? extraTile}) {
    int extra = 1;
    // 无百搭：胡牌牌面中不包含百搭
    if (!_hasWildInWinningTiles(winner, extra: extraTile)) extra *= 2;
    // 门清：没有吃/碰/明杠（暗杠不破门清）
    bool hasExposed = false;
    for (int i = 0; i < winner.melds.length; i++) {
      final hidden = (i < winner.meldHidden.length) ? winner.meldHidden[i] : false;
      if (!hidden) { hasExposed = true; break; }
    }
    if (!hasExposed) extra *= 2;
    return extra;
  }

  bool _hasWildInWinningTiles(Player winner, {Tile? extra}) {
    for (final t in winner.handTiles) {
      if (_isWildTile(t)) return true;
    }
    if (extra != null && _isWildTile(extra)) return true;
    for (final m in winner.melds) {
      for (final t in m) {
        if (_isWildTile(t)) return true;
      }
    }
    return false;
  }

  List<Tile> _allNonFlowerTiles(Player winner) {
    final tiles = <Tile>[];
    tiles.addAll(winner.handTiles);
    for (final m in winner.melds) {
      tiles.addAll(m);
    }
    return tiles.where((t) => !t.isFlower && t.suit != TileSuit.hua && !_isWildTile(t)).toList();
  }

  bool _isFengYiSe(Player winner) {
    return _isFengYiSeWithExtra(winner, null);
  }

  bool _isFengYiSeWithExtra(Player winner, Tile? extra) {
    final tiles = _allNonFlowerTilesWithExtra(winner, extra);
    if (tiles.isEmpty) return false;
    return tiles.every((t) => t.type == TileType.wind);
  }

  bool _isFengPeng(Player winner) {
    return _isFengPengWithExtra(winner, null);
  }

  bool _isFengPengWithExtra(Player winner, Tile? extra) {
    final tiles = _allNonFlowerTilesWithExtra(winner, extra);
    if (tiles.isEmpty) return false;
    if (!tiles.every((t) => t.type == TileType.wind)) return false;
    final counts = <String, int>{};
    for (final t in tiles) {
      final key = '${t.type.index}_${t.number}';
      counts[key] = (counts[key] ?? 0) + 1;
    }
    // 风碰：所有牌应成刻子/对子
    return counts.values.every((c) => c == 2 || c == 3 || c == 4);
  }

  bool _isQingYiSe(Player winner) {
    return _isQingYiSeWithExtra(winner, null);
  }

  bool _isQingYiSeWithExtra(Player winner, Tile? extra) {
    final tiles = _allNonFlowerTilesWithExtra(winner, extra);
    if (tiles.isEmpty) return false;
    // 不能包含风/箭
    if (tiles.any((t) => t.type == TileType.wind || t.type == TileType.dragon)) return false;
    TileSuit? suit;
    for (final t in tiles) {
      if (t.suit == TileSuit.wan || t.suit == TileSuit.tong || t.suit == TileSuit.tiao) {
        suit ??= t.suit;
        if (t.suit != suit) return false;
      }
    }
    return suit != null;
  }

  List<Tile> _allNonFlowerTilesWithExtra(Player winner, Tile? extra) {
    final tiles = <Tile>[];
    tiles.addAll(winner.handTiles);
    if (extra != null) tiles.add(extra);
    for (final m in winner.melds) {
      tiles.addAll(m);
    }
    return tiles.where((t) => !t.isFlower && t.suit != TileSuit.hua && !_isWildTile(t)).toList();
  }

  bool _isHunYiSe(Player winner) {
    final tiles = _allNonFlowerTiles(winner);
    if (tiles.isEmpty) return false;
    bool hasHonor = false;
    TileSuit? suit;
    for (final t in tiles) {
      if (t.type == TileType.wind || t.type == TileType.dragon) {
        hasHonor = true;
        continue;
      }
      if (t.suit == TileSuit.wan || t.suit == TileSuit.tong || t.suit == TileSuit.tiao) {
        suit ??= t.suit;
        if (t.suit != suit) return false;
      }
    }
    return suit != null && hasHonor;
  }

  bool _isHunYiSeWithExtra(Player winner, Tile? extra) {
    final tiles = _allNonFlowerTilesWithExtra(winner, extra);
    if (tiles.isEmpty) return false;
    bool hasHonor = false;
    TileSuit? suit;
    for (final t in tiles) {
      if (t.type == TileType.wind || t.type == TileType.dragon) {
        hasHonor = true;
        continue;
      }
      if (t.suit == TileSuit.wan || t.suit == TileSuit.tong || t.suit == TileSuit.tiao) {
        suit ??= t.suit;
        if (t.suit != suit) return false;
      }
    }
    return suit != null && hasHonor;
  }

  bool _isPengPengHu(Player winner) {
    return _isPengPengHuWithExtra(winner, null);
  }

  bool _isPengPengHuWithExtra(Player winner, Tile? extra) {
    // 对对胡=碰碰胡（允许百搭补成刻子/对子）
    final tiles = <Tile>[];
    tiles.addAll(winner.handTiles);
    if (extra != null) tiles.add(extra);
    for (final m in winner.melds) {
      tiles.addAll(m);
    }
    final counts = <String, int>{};
    int wild = 0;
    for (final t in tiles) {
      if (t.isFlower || t.suit == TileSuit.hua) continue;
      if (_isWildTile(t)) { wild++; continue; }
      final key = '${t.type.index}_${t.number}';
      counts[key] = (counts[key] ?? 0) + 1;
    }

    int totalTiles = wild;
    for (final v in counts.values) { totalTiles += v; }
    if (totalTiles % 3 != 2) return false;

    bool canMelds(Map<String, int> c, int w) {
      String? firstKey;
      for (final k in c.keys) { if ((c[k] ?? 0) > 0) { firstKey = k; break; } }
      if (firstKey == null) return w % 3 == 0;
      final cnt = c[firstKey] ?? 0;
      final need = (3 - (cnt % 3)) % 3;
      if (need <= w) {
        c[firstKey] = 0; // 全部视作刻子组合
        if (canMelds(c, w - need)) return true;
        c[firstKey] = cnt;
      }
      return false;
    }

    // 选择对子
    for (final k in counts.keys) {
      if ((counts[k] ?? 0) >= 2) {
        counts[k] = (counts[k] ?? 0) - 2;
        if (canMelds(counts, wild)) return true;
        counts[k] = (counts[k] ?? 0) + 2;
      }
      if ((counts[k] ?? 0) >= 1 && wild >= 1) {
        counts[k] = (counts[k] ?? 0) - 1;
        if (canMelds(counts, wild - 1)) return true;
        counts[k] = (counts[k] ?? 0) + 1;
      }
    }
    if (wild >= 2) {
      if (canMelds(counts, wild - 2)) return true;
    }
    return false;
  }

  bool _isQingPeng(Player winner) {
    return _isQingPengWithExtra(winner, null);
  }

  bool _isQingPengWithExtra(Player winner, Tile? extra) {
    return _isQingYiSeWithExtra(winner, extra) && _isPengPengHuWithExtra(winner, extra);
  }

  String? _calcHuType(Player winner, {Tile? extra}) {
    // 按优先级（高→低）
    if (_isFengPengWithExtra(winner, extra)) return '风碰';
    if (_isFengYiSeWithExtra(winner, extra)) return '风一色';
    if (_isQingPengWithExtra(winner, extra)) return '清碰';
    // 八花自摸：优先于清一色
    if (_countFlowers(winner) >= 8) return '八花自摸';
    if (_isQingYiSeWithExtra(winner, extra)) return '清一色';
    if (_isHunYiSeWithExtra(winner, extra)) return '混一色';
    if (_isPengPengHuWithExtra(winner, extra)) return '碰碰胡';
    // 四百搭：最低优先级（门清翻倍后一般大于10点）
    final wildCount = winner.handTiles.where((t) => _isWildTile(t)).length;
    if (wildCount >= 4) return '四百搭';
    return null;
  }

  bool _isWuHuaZiMo(Player winner, bool isSelfDraw) {
    if (!isSelfDraw) return false;
    // 仅限：碰碰胡 或 混一色
    if (!(_isPengPengHu(winner) || _isHunYiSe(winner))) return false;
    if (_countFlowers(winner) > 0) return false;
    final tiles = _allNonFlowerTiles(winner);
    final counts = <String, int>{};
    for (final t in tiles) {
      final key = '${t.type.index}_${t.number}';
      counts[key] = (counts[key] ?? 0) + 1;
    }
    for (final entry in counts.entries) {
      final typeIdx = int.parse(entry.key.split('_')[0]);
      final cnt = entry.value;
      if ((typeIdx == TileType.wind.index || typeIdx == TileType.dragon.index) && cnt >= 3) {
        return false;
      }
    }
    return true;
  }

  bool _isGangKai(Player winner, bool isSelfDraw) {
    return isSelfDraw && lastKongDraw;
  }

  // 八花自摸：手牌+副露共有8朵花
  bool _isBaHuaZiMo(Player winner, bool isSelfDraw) {
    if (!isSelfDraw) return false;
    final flowerCount = _countFlowers(winner);
    return flowerCount >= 8;
  }

  // 四百搭：手牌有4张百搭
  bool _isSiBaiDa(Player winner, bool isSelfDraw) {
    final wildCount = winner.handTiles.where((t) => _isWildTile(t)).length;
    return wildCount >= 4;
  }

  void _applySettlement(SettlementResult result) {
    lastSettlement = result;
    for (int i = 0; i < 4; i++) {
      players[i].score += result.deltas[i] ?? 0;
      players[i].totalScore += result.deltas[i] ?? 0;
    }
    _persistGameStats(result);
    // 非流局则重置全局倍数
    if (!result.isDraw) {
      globalMultiplier = 1;
    }
    lastWinFromDiscard = false;
    phase = GamePhase.scoring;
    gameEnded = true;
  }

  void resetForNextRound() {
    initWall();
    diceRolled = false;
    diceValues = [1, 1];
    diceRollCount = 0;
    pendingTile = null;
    lastPlayedTile = null;
    lastDiscarderIndex = null;
    wildTile = null;
    lastKongDraw = false;
    rebelDecided = [false, false, false, false];
    lastWinnerIndex = null;
    lastWinFromDiscard = false;
    awaitingPlayerResponse = false;
    responseWindowOpen = false;
    allowNextPlayerAction = false;
    responseTimerActive = false;
    nextPlayerIndex = null;
    freezeActive = false;
    freezeChances = [3, 3, 3, 3];
    mustDiscard = false;
    phase = GamePhase.waiting;
    gameEnded = false;
    eliminatedPlayers.clear();
    baoRelations.clear();
    hotTiles.clear();
    deadTiles.clear();
    lastSettlement = null;
    turnCounter = 0;
    robbingKong = false;
    robKongOwnerIndex = null;
    robKongTile = null;
    robKongMeldIndex = null;
    for (final p in players) {
      p.handTiles.clear();
      p.melds.clear();
      p.meldHidden.clear();
      p.meldSourceCounts.clear();
      p.playedTiles.clear();
      p.flowerTiles.clear();
    }
  }

  // 血战到底：玩家胡牌
  // 返回 true 表示游戏结束，false 表示继续
  bool playerWins(int playerIndex) {
    if (eliminatedPlayers.contains(playerIndex)) return false;
    eliminatedPlayers.add(playerIndex);
    lastWinnerIndex = playerIndex;
    lastWinFromDiscard = pendingTile != null;
    pendingTile = null;
    _clearResponseWindowFlags();
    awaitingPlayerResponse = false;

    // 血战到底：重新计算上家关系
    _recalculatePositionsAfterElimination(playerIndex);

    // 检查是否只剩一家
    if (activePlayerCount <= 1) {
      // 游戏结束（用最后一次胡牌者结算）
      _applySettlement(_settleWin(lastWinnerIndex ?? playerIndex, reason: '血战到底'));
      return true;
    }

    // 牌墙已摸完
    if (wall.isEmpty) {
      resolveDraw();
      return true;
    }

    // 继续游戏（跳过已胡牌的玩家）
    _nextActivePlayer();
    return false;
  }

  bool claimHu(int playerIndex) {
    if (pendingTile == null) return false;
    if (eliminatedPlayers.contains(playerIndex)) return false;
    if (!canHu(players[playerIndex])) return false;
    huClaimers.add(playerIndex);
    firstHuClaimer ??= playerIndex;
    return true;
  }

  List<int> _collectHuClaimers({bool includeHuman = false}) {
    final result = <int>[];
    if (pendingTile == null) return result;
    for (int offset = 1; offset <= 3; offset++) {
      final idx = (currentPlayerIndex + offset) % 4;
      if (eliminatedPlayers.contains(idx)) continue;
      if (idx == 0 && !includeHuman) continue;
      if (canHu(players[idx])) result.add(idx);
    }
    return result;
  }

  bool resolveMultiHuFromPlayer() {
    final autoHu = _collectHuClaimers(includeHuman: false);
    return _resolveMultiHu(autoClaimers: autoHu);
  }

  bool _resolveMultiHu({List<int>? autoClaimers}) {
    if (pendingTile == null) return false;
    final winnersOrdered = <int>[];
    if (autoClaimers != null) {
      for (final idx in autoClaimers) {
        if (!winnersOrdered.contains(idx)) winnersOrdered.add(idx);
      }
    }
    for (final idx in huClaimers) {
      if (!winnersOrdered.contains(idx)) winnersOrdered.add(idx);
    }
    if (winnersOrdered.isEmpty) return false;

    final firstWinner = firstHuClaimer ?? winnersOrdered.first;

    for (final w in winnersOrdered) {
      if (!eliminatedPlayers.contains(w)) {
        eliminatedPlayers.add(w);
      }
    }

    lastWinnerIndex = firstWinner;
    lastWinFromDiscard = true;
    pendingTile = null;
    _clearResponseWindowFlags();
    awaitingPlayerResponse = false;
    _resetHuClaims();

    if (activePlayerCount <= 1) {
      _applySettlement(_settleWin(lastWinnerIndex ?? firstWinner, reason: '血战到底'));
      return true;
    }

    if (wall.isEmpty) {
      resolveDraw();
      return true;
    }

    // 回合流转到首个胡牌者的右手玩家
    currentPlayerIndex = _nextActiveIndexLocal(firstWinner);
    if (simulationMode) {
      // 模拟模式下由外部驱动摸/打，避免异步干扰
      return false;
    }
    drawTile(players[currentPlayerIndex]);
    if (currentPlayerIndex != 0) {
      Future.delayed(aiDiscardDelay, () {
        aiDiscard(currentPlayerIndex);
      });
    }
    return false;
  }

  // 血战到底：移除玩家后重新计算位置
  void _recalculatePositionsAfterElimination(int eliminatedIndex) {
    // 由于是血战到底，剩下三家继续
    // 上家/下家关系需要动态计算：
    // 原来的上家可能变成新的下家
    // 包关系也会重新计算

    // 例如：0胡 → 1,2,3继续
    // 1的上家变成2，下家变成0(已胡)
    // 2的上家变成0(已胡)，下家变成1
    // 3的上家变成1，下家变成0(已胡)

    // 实际上，逆时针顺序保持不变，只是跳过已胡玩家
    // currentPlayerIndex 不需要改变，会在 _nextActivePlayer 中处理
  }

  // 血战到底：移动到下一个活跃玩家
  void _nextActivePlayer() {
    for (int i = 0; i < 4; i++) {
      currentPlayerIndex = (currentPlayerIndex + 3) % 4; // 逆时针
      if (!eliminatedPlayers.contains(currentPlayerIndex)) {
        break;
      }
    }
  }

  // 检查指定玩家是否已胡牌
  bool isPlayerEliminated(int playerIndex) {
    return eliminatedPlayers.contains(playerIndex);
  }

  bool _isWildTile(Tile t) {
    if (wildTile == null) return false;
    return t.type == wildTile!.type && t.number == wildTile!.number;
  }

  // 检查是否可以碰
  bool canPong(Player player) {
    if (robbingKong) return false;
    if (pendingTile == null) return false;
    final t = pendingTile!;
    if (_isWildTile(t)) return false; // 百搭牌不可吃碰杠
    return player.handTiles.where((tile) => tile.type == t.type && tile.number == t.number).length >= 2;
  }

  // 检查是否可以杠
  bool canKong(Player player) {
    if (robbingKong) return false;
    // 明杠：手里有三张或已有刻子，碰哪家打出的牌
    if (pendingTile != null) {
      final t = pendingTile!;
      if (_isWildTile(t)) return false; // 百搭牌不可吃碰杠
      final handCount = player.handTiles.where((tile) => tile.type == t.type && tile.number == t.number).length;
      final hasPongMeld = player.melds.any((m) => m.length == 3 && m.every((x) => x.type == t.type && x.number == t.number));
      if (handCount >= 3 || hasPongMeld) return true;
      return false; // 有弃牌时，不允许暗杠
    }

    // 暗杠或补杠
    return canHiddenKong(player) || _canAddKong(player);
  }

  // 检查暗杠
  bool canHiddenKong(Player player) {
    final counts = <String, int>{};
    for (final t in player.handTiles) {
      final key = '${t.type}_${t.number}';
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts.values.any((c) => c == 4);
  }

  bool _canAddKong(Player player) {
    for (final m in player.melds) {
      if (m.length == 3 && m.every((x) => x.type == m.first.type && x.number == m.first.number)) {
        final same = player.handTiles.any((t) => t.type == m.first.type && t.number == m.first.number);
        if (same) return true;
      }
    }
    return false;
  }

  // 获取可以杠的牌
  List<Tile> getKongableTiles(Player player) {
    final result = <Tile>[];

    // 明杠
    if (pendingTile != null) {
      final t = pendingTile!;
      if (player.handTiles.where((tile) => tile.type == t.type && tile.number == t.number).length >= 3) {
        result.add(t);
      }
    }

    // 暗杠
    final counts = <String, List<Tile>>{};
    for (final t in player.handTiles) {
      final key = '${t.type}_${t.number}';
      counts[key] = [...(counts[key] ?? []), t];
    }
    for (final tiles in counts.values) {
      if (tiles.length == 4) {
        result.add(tiles.first);
      }
    }

    // 补杠（门口已有刻子 + 手里摸到第4张）
    if (pendingTile == null) {
      for (final m in player.melds) {
        if (m.length == 3 && m.every((x) => x.type == m.first.type && x.number == m.first.number)) {
          final same = player.handTiles.firstWhere(
            (t) => t.type == m.first.type && t.number == m.first.number,
            orElse: () => Tile(id: -999, type: TileType.blank, number: 0, suit: TileSuit.hua),
          );
          if (same.id != -999) {
            result.add(same);
          }
        }
      }
    }

    return result;
  }

  // 执行杠牌（明杠记录包关系，暗杠不记录）
  bool doKong(Player player, Tile kongTile, {bool isHidden = false}) {
    // 补杠（门口已有刻子 + 自摸第四张） -> 允许抢杠
    if (pendingTile == null) {
      final meldIndex = player.melds.indexWhere((m) => m.length == 3 && m.every((x) => x.type == kongTile.type && x.number == kongTile.number));
      if (meldIndex >= 0) {
        final hasTile = player.handTiles.any((t) => t.type == kongTile.type && t.number == kongTile.number);
        if (hasTile) {
          return _tryRobKong(player, kongTile, meldIndex);
        }
      }
    }

    // 明杠：记录包关系（杠别人打出的牌）
    if (!isHidden && pendingTile != null) {
      final fromPlayer = player.index; // 杠牌者
      final toPlayer = currentPlayerIndex; // 打牌者
      recordBao(fromPlayer, toPlayer);
      player.meldSourceCounts[toPlayer] = (player.meldSourceCounts[toPlayer] ?? 0) + 1;
      _recordHotTile(pendingTile!);
    }

    final meld = <Tile>[];
    if (!isHidden && pendingTile != null) {
      // 先检查是否为补杠（已有刻子）
      final meldIndex = player.melds.indexWhere((m) => m.length == 3 && m.every((x) => x.type == kongTile.type && x.number == kongTile.number));
      if (meldIndex >= 0) {
        player.melds[meldIndex] = [...player.melds[meldIndex], pendingTile!];
        pendingTile = null;
      } else {
        // 明杠：手里移除三张 + 吃入一张
        int removed = 0;
        for (int i = player.handTiles.length - 1; i >= 0; i--) {
          final t = player.handTiles[i];
          if (t.type == kongTile.type && t.number == kongTile.number) {
            player.handTiles.removeAt(i);
            meld.add(t);
            removed++;
            if (removed == 3) break;
          }
        }
        meld.add(pendingTile!);
        pendingTile = null;
        player.melds.add(meld);
        player.meldHidden.add(false);
      }
    } else {
      // 暗杠：手里移除四张
      int removed = 0;
      for (int i = player.handTiles.length - 1; i >= 0; i--) {
        final t = player.handTiles[i];
        if (t.type == kongTile.type && t.number == kongTile.number) {
          player.handTiles.removeAt(i);
          meld.add(t);
          removed++;
          if (removed == 4) break;
        }
      }
      if (removed < 4) return false;
      player.melds.add(meld);
      player.meldHidden.add(true);
    }

    _clearResponseWindowFlags();
    currentPlayerIndex = player.index;
    if (player.index == 0) {
      mustDiscard = true;
    }
    return true;
  }

  bool _tryRobKong(Player owner, Tile kongTile, int meldIndex) {
    robbingKong = true;
    robKongOwnerIndex = owner.index;
    robKongTile = kongTile;
    robKongMeldIndex = meldIndex;
    pendingTile = kongTile;
    lastDiscarderIndex = owner.index;
    awaitingPlayerResponse = false;
    responseWindowOpen = false;
    allowNextPlayerAction = false;
    responseTimerActive = false;

    final responder = _checkRobKongResponder();
    if (responder != null) {
      if (responder == 0) {
        awaitingPlayerResponse = true;
        onStateChanged?.call();
        Future.delayed(responseWindowDuration, () {
          if (robbingKong && awaitingPlayerResponse && robKongOwnerIndex == owner.index) {
            playerDeclineRobKong();
            onStateChanged?.call();
          }
        });
        return false; // 等待玩家是否抢杠
      } else {
        _robKongHu(responder);
        return false; // 已被抢杠，杠家流程终止
      }
    }

    _completeAddKong(owner, kongTile, meldIndex);
    return true;
  }

  int? _checkRobKongResponder() {
    if (!robbingKong || robKongOwnerIndex == null) return null;
    for (int offset = 1; offset <= 3; offset++) {
      final idx = (robKongOwnerIndex! + offset) % 4;
      if (eliminatedPlayers.contains(idx)) continue;
      if (canHu(players[idx])) return idx;
    }
    return null;
  }

  void _completeAddKong(Player owner, Tile kongTile, int meldIndex) {
    final idx = owner.handTiles.indexWhere((t) => t.type == kongTile.type && t.number == kongTile.number);
    if (idx >= 0) owner.handTiles.removeAt(idx);
    owner.melds[meldIndex] = [...owner.melds[meldIndex], kongTile];
    owner.meldHidden[meldIndex] = false;

    robbingKong = false;
    robKongOwnerIndex = null;
    robKongTile = null;
    robKongMeldIndex = null;
    pendingTile = null;

    _clearResponseWindowFlags();
    currentPlayerIndex = owner.index;
    if (owner.index == 0) {
      mustDiscard = true;
    }
  }

  void playerDeclineRobKong() {
    if (!robbingKong || robKongOwnerIndex == null || robKongTile == null || robKongMeldIndex == null) return;
    final owner = players[robKongOwnerIndex!];
    final tile = robKongTile!;
    final meldIndex = robKongMeldIndex!;

    _completeAddKong(owner, tile, meldIndex);

    // 杠后补牌（含补到花继续补）
    while (wall.isNotEmpty) {
      final newTile = drawTile(owner, isKongDraw: true);
      if (newTile == null) break;
      if (newTile.isFlower) {
        owner.handTiles.remove(newTile);
        owner.flowerTiles.add(newTile);
        continue;
      }
      break;
    }

    awaitingPlayerResponse = false;

    if (owner.index != 0) {
      if (canHu(owner)) {
        playerWins(owner.index);
        return;
      }
      if (aiDiscardDelay == Duration.zero) {
        aiDiscard(owner.index);
      } else {
        Future.delayed(aiDiscardDelay, () {
          aiDiscard(owner.index);
        });
      }
    }
  }

  bool playerRobKongHu() {
    if (!robbingKong) return false;
    return _robKongHu(0);
  }

  bool _robKongHu(int winnerIndex) {
    if (!robbingKong || robKongOwnerIndex == null) return playerWins(winnerIndex);
    final ownerIndex = robKongOwnerIndex!;
    final winner = players[winnerIndex];
    final isSelfDraw = false;
    final fixed = _calcFixedScore(winner, isSelfDraw, extra: robKongTile);
    final huType = _calcHuType(winner, extra: robKongTile);
    final useFormula = huType == '混一色' || huType == '碰碰胡';
    final basePoints = fixed.points > 0 ? fixed.points : (useFormula ? min(10, _calcBasePoints(winner, extra: robKongTile)) : 0);
    final extra = _calcExtraMultiplier(winner, extraTile: robKongTile);
    final total = basePoints * finalMultiplier * extra;
    final robTotal = total * 3;

    // 记录抢杠赔付
    players[winnerIndex].score += robTotal;
    players[winnerIndex].totalScore += robTotal;
    players[ownerIndex].score -= robTotal;
    players[ownerIndex].totalScore -= robTotal;

    // 从被抢杠者手里移除那张
    if (robKongTile != null) {
      final idx = players[ownerIndex].handTiles.indexWhere((t) => t.type == robKongTile!.type && t.number == robKongTile!.number);
      if (idx >= 0) players[ownerIndex].handTiles.removeAt(idx);
    }

    eliminatedPlayers.add(winnerIndex);
    lastWinnerIndex = winnerIndex;
    lastWinFromDiscard = true;

    robbingKong = false;
    robKongOwnerIndex = null;
    robKongTile = null;
    robKongMeldIndex = null;
    pendingTile = null;
    _clearResponseWindowFlags();

    // 继续游戏：赢家右手玩家摸牌
    if (activePlayerCount > 1 && wall.isNotEmpty) {
      currentPlayerIndex = _nextActiveIndexLocal(winnerIndex);
      drawTile(players[currentPlayerIndex]);
      if (currentPlayerIndex != 0) {
        Future.delayed(aiDiscardDelay, () {
          aiDiscard(currentPlayerIndex);
        });
      }
      return true;
    }

    // 若只剩一家或牌墙空，则结束
    if (activePlayerCount <= 1 || wall.isEmpty) {
      _applySettlement(_settleWin(lastWinnerIndex ?? winnerIndex, reason: '血战到底'));
    }
    return true;
  }

  // 检查是否可以胡
  bool canHu(Player player) {
    // 八花自摸：手牌+副露有8朵花，任意时刻可胡
    if (_countFlowers(player) >= 8) {
      return true;
    }
    
    // 四百搭：手牌有4张百搭，任意时刻可胡
    final wildCount = player.handTiles.where((t) => _isWildTile(t)).length;
    if (wildCount >= 4) {
      return true;
    }
    
    // 百搭打出时，仅允许自摸胡，不能捉冲
    if (pendingTile != null && _isWildTile(pendingTile!)) {
      return false;
    }
    final tiles = <Tile>[...player.handTiles];
    if (pendingTile != null) {
      tiles.add(pendingTile!); // 点炮胡
    }
    if (!checkHu(tiles)) return false;

    // 门口无花的碰碰胡/混一色不能捉冲（点炮/抢杠）
    if (pendingTile != null && player.flowerTiles.isEmpty) {
      if (_isPengPengHuWithExtra(player, pendingTile) || _isHunYiSeWithExtra(player, pendingTile)) {
        return false;
      }
    }
    return true;
  }

  // 核心胡牌检测（支持百搭）
  bool checkHu(List<Tile> tiles) {
    final counts = <String, int>{};
    int wildCount = 0;

    for (final t in tiles) {
      if (_isWildTile(t)) {
        wildCount++;
        continue;
      }
      if (t.isFlower || t.suit == TileSuit.hua) continue;
      final key = '${t.type.index}_${t.number}';
      counts[key] = (counts[key] ?? 0) + 1;
    }

    int totalTiles = wildCount;
    for (final v in counts.values) {
      totalTiles += v;
    }
    if (totalTiles % 3 != 2) return false;

    bool canMelds(Map<String, int> c, int wild) {
      String? firstKey;
      for (final k in c.keys) {
        if ((c[k] ?? 0) > 0) { firstKey = k; break; }
      }
      if (firstKey == null) {
        return wild % 3 == 0;
      }

      final parts = firstKey.split('_');
      final typeIdx = int.parse(parts[0]);
      final number = int.parse(parts[1]);
      final countFirst = c[firstKey] ?? 0;

      // 刻子（用百搭补）
      if (countFirst >= 3) {
        c[firstKey] = countFirst - 3;
        if (canMelds(c, wild)) return true;
        c[firstKey] = countFirst;
      }
      if (countFirst == 2 && wild >= 1) {
        c[firstKey] = 0;
        if (canMelds(c, wild - 1)) return true;
        c[firstKey] = 2;
      }
      if (countFirst == 1 && wild >= 2) {
        c[firstKey] = 0;
        if (canMelds(c, wild - 2)) return true;
        c[firstKey] = 1;
      }

      // 顺子（仅万/筒/条，百搭可补）
      if (typeIdx <= TileType.tiao.index && number <= 7) {
        final k1 = '${typeIdx}_${number + 1}';
        final k2 = '${typeIdx}_${number + 2}';
        final c1 = c[k1] ?? 0;
        final c2 = c[k2] ?? 0;
        int needWild = 0;
        if (c1 == 0) needWild++;
        if (c2 == 0) needWild++;
        if (wild >= needWild) {
          c[firstKey] = countFirst - 1;
          if (c1 > 0) c[k1] = c1 - 1;
          if (c2 > 0) c[k2] = c2 - 1;
          if (canMelds(c, wild - needWild)) return true;
          c[firstKey] = countFirst;
          if (c1 > 0) c[k1] = c1;
          if (c2 > 0) c[k2] = c2;
        }
      }

      return false;
    }

    bool canWinWithPair(Map<String, int> c, int wild) {
      // 1) 真实对子
      for (final k in c.keys) {
        if ((c[k] ?? 0) >= 2) {
          c[k] = (c[k] ?? 0) - 2;
          if (canMelds(c, wild)) return true;
          c[k] = (c[k] ?? 0) + 2;
        }
      }
      // 2) 1张+百搭
      if (wild >= 1) {
        for (final k in c.keys) {
          if ((c[k] ?? 0) >= 1) {
            c[k] = (c[k] ?? 0) - 1;
            if (canMelds(c, wild - 1)) return true;
            c[k] = (c[k] ?? 0) + 1;
          }
        }
      }
      // 3) 百搭对
      if (wild >= 2) {
        if (canMelds(c, wild - 2)) return true;
      }
      return false;
    }

    return canWinWithPair(counts, wildCount);
  }

  // 是否可造反（首轮、轮到自己、满足五毒散，且未作决定）
  bool canRebel(int playerIndex) {
    if (phase != GamePhase.playing) return false;
    if (gameEnded) return false;
    if (pendingTile != null) return false;
    if (currentPlayerIndex != playerIndex) return false;
    if (rebelDecided[playerIndex]) return false;
    return players[playerIndex].isWuDuSan;
  }

  // 玩家/AI选择造反或不造反
  bool decideRebel(int playerIndex, bool accept) {
    if (!canRebel(playerIndex)) return false;
    rebelDecided[playerIndex] = true;
    if (accept) {
      resolveRebelAsDraw(playerIndex);
      return true;
    }
    return false;
  }

  // 检查是否满足五毒散（兼容旧调用）
  bool checkWuDuSan() {
    return canRebel(currentPlayerIndex);
  }


  // AI执行一步（吃/碰/摸/打）
  void aiPlay(int playerIndex) {
    if (playerIndex == 0) return; // 玩家自己控制
    if (eliminatedPlayers.contains(playerIndex)) return;
    if (freezeActive) return;

    final player = players[playerIndex];

    // 0. 造反判断（首轮）
    if (canRebel(playerIndex)) {
      decideRebel(playerIndex, true);
      return;
    }

    // 1. 检查能否胡
    if (canHu(player)) {
      playerWins(playerIndex);
      return;
    }

    // 2. 检查能否杠 - 优先杠
    if (canKong(player)) {
      final kongTiles = getKongableTiles(player);
      if (kongTiles.isNotEmpty) {
        final isHidden = pendingTile == null;
        final ok = doKong(player, kongTiles.first, isHidden: isHidden);
        if (!ok) return; // 等待抢杠或被抢杠

        // 杠后补牌（若补到花，继续补）
        while (wall.isNotEmpty) {
          final newTile = drawTile(player, isKongDraw: true);
          if (newTile == null) break;
          if (newTile.isFlower) {
            player.handTiles.remove(newTile);
            player.flowerTiles.add(newTile);
            continue;
          }
          break;
        }
        if (canHu(player)) {
          playerWins(playerIndex);
          return;
        }
        aiDiscard(playerIndex);
        return;
      }
    }

    // 3. 检查能否碰 - 优先碰（增加概率）
    if (canPong(player) && pendingTile != null) {
      // 碰牌有副露，加分
      doPong(player);
      drawTile(player);
      // 碰后摸牌可能胡牌，再次检查
      if (canHu(player)) {
        playerWins(playerIndex);
        return;
      }
      aiDiscard(playerIndex);
      return;
    }

    // 4. 检查能否吃 - 优先吃
    if (canChow(player)) {
      doChow(player, null);
      drawTile(player);
      // 吃后摸牌可能胡牌，再次检查
      if (canHu(player)) {
        playerWins(playerIndex);
        return;
      }
      aiDiscard(playerIndex);
      return;
    }

    // 5. 正常摸牌
    if (pendingTile == null) {
      drawTile(player);
      aiDiscard(playerIndex);
    }
  }

  // AI打牌
  void aiDiscard(int playerIndex) {
    final player = players[playerIndex];
    if (player.handTiles.isEmpty) return;

    final discard = (useMonteCarloAI && playerIndex != 0)
        ? _chooseAIDiscard(playerIndex)
        : player.handTiles.first;
    player.handTiles.remove(discard);
    player.playedTiles.add(discard);
    pendingTile = discard;
    lastPlayedTile = discard;
    lastDiscarderIndex = playerIndex;
    awaitingPlayerResponse = false;
    lastKongDraw = false;
    turnCounter += 1;
    responseWindowOpen = true;
    allowNextPlayerAction = false;
    responseTimerActive = false;
    nextPlayerIndex = _peekNextPlayerIndex();
    _recordDeadTile(discard);

    // AI打牌后，检查响应
    if (!simulationMode) {
      processTurn();
    }
  }

  Tile _chooseAIDiscard(int playerIndex) {
    final player = players[playerIndex];
    if (player.handTiles.length <= 1) return player.handTiles.first;

    final start = DateTime.now();
    final candidates = <Tile>[];
    final seen = <String>{};
    for (final t in player.handTiles) {
      final key = '${t.type.index}_${t.number}_${t.isWild}';
      if (seen.add(key)) {
        candidates.add(t);
      }
    }
    if (candidates.isEmpty) return player.handTiles.first;

    // 控制候选数量，避免爆耗时
    if (candidates.length > 10) {
      candidates.shuffle();
      candidates.removeRange(10, candidates.length);
    }

    final rng = Random();
    Tile? best;
    double bestScore = -9999;
    double bestSafety = -9999;

    int bestOpp = -999999;
    for (int i = 0; i < 4; i++) {
      if (i == playerIndex) continue;
      bestOpp = max(bestOpp, players[i].totalScore);
    }
    int trialsLimit = monteCarloTrials;
    if (players[playerIndex].totalScore + 50 < bestOpp) {
      trialsLimit = max(20, (monteCarloTrials * 0.6).round());
    }

    final evals = <Map<String, dynamic>>[];

    for (final c in candidates) {
      if (DateTime.now().difference(start) > monteCarloBudget) break;
      final safety = _calcSafetyPenalty(playerIndex, c);
      if (safety > bestSafety) {
        bestSafety = safety;
        best ??= c;
      }
      if (safety <= -2.0) {
        evals.add({'tile': _tileKey(c), 'score': -9999, 'safety': safety});
        continue; // 强烈危险，跳过
      }
      final score = _simulateDiscardScore(playerIndex, c, rng, start, safety, trialsLimit);
      evals.add({'tile': _tileKey(c), 'score': score, 'safety': safety, 'trials': _lastMcTrials});
      if (score > bestScore) {
        bestScore = score;
        best = c;
      }
    }

    final chosen = best ?? player.handTiles.first;
    _logAIDecision(playerIndex, chosen, bestScore, evals);
    return chosen;
  }

  double _simulateDiscardScore(int playerIndex, Tile discard, Random rng, DateTime start, double safety, int trialsLimit) {
    int trials = 0;
    int win = 0;
    int lose = 0;

    for (int i = 0; i < trialsLimit; i++) {
      if (DateTime.now().difference(start) > monteCarloBudget) break;
      final r = _simulateOneTrial(playerIndex, discard, rng);
      if (r > 0) win++;
      if (r < 0) lose++;
      trials++;
    }
    _lastMcTrials = trials;
    if (trials == 0) return -9999;
    final mc = (win - lose * 0.5) / trials;
    final heuristic = _heuristicScore(playerIndex, discard, safety);
    return mc + heuristic;
  }

  double _heuristicScore(int playerIndex, Tile discard, double safety) {
    final player = players[playerIndex];

    // 统计百搭数量
    int wildCount = player.handTiles.where((t) => _isWildTile(t)).length;

    // 动态调整进攻系数：百搭多时更激进
    double dynamicAggression = aiAggression;
    if (wildCount >= 2) {
      dynamicAggression *= 2.5; // 双百搭以上，激进翻倍
    } else if (wildCount == 1) {
      dynamicAggression *= 1.5; // 单百搭，稍激进
    }

    // ========== 奖励机制：鼓励做大门牌 ==========
    // 分析当前手牌倾向
    final counts = _countTiles(player.handTiles);
    int suitCount = 0;
    int windCount = 0;
    int dragonCount = 0;
    int pairCount = 0;
    for (final t in player.handTiles) {
      if (t.suit == TileSuit.wan || t.suit == TileSuit.tong || t.suit == TileSuit.tiao) suitCount++;
      if (t.type == TileType.wind) windCount++;
      if (t.type == TileType.dragon) dragonCount++;
    }
    // 统计对子
    for (final v in counts.values) {
      if (v >= 2) pairCount++;
    }
    
    final hasOnlyOneSuit = (counts.keys.where((k) => 
      (k.startsWith('0') || k.startsWith('1') || k.startsWith('2'))).length <= 1);
    
    // 奖励：做大门牌（真实概率：清一色 > 混一色 > 碰碰胡 > 风碰 > 风一色）
    double bigHandReward = 0;
    // 清一色：最难但分数高，奖励稍高
    if (hasOnlyOneSuit && suitCount >= 6) {
      bigHandReward += 0.15; // 清一色
    }
    // 混一色：最容易，奖励基础分
    if (hasOnlyOneSuit && (windCount >= 1 || dragonCount >= 1)) {
      bigHandReward += 0.08; // 混一色
    }
    // 碰碰胡：有3对以上，奖励
    if (pairCount >= 3 || windCount + dragonCount >= 3) {
      bigHandReward += 0.06;
    }
    // 风碰/风一色：很难做成，大幅降低奖励（真实概率很低）
    if (windCount >= 4) {
      bigHandReward -= 0.10; // 风碰/风一色太难，惩罚
    }
    if (player.melds.isEmpty) bigHandReward += 0.08; // 门清奖励

    final oldShanten = _calcShantenProxy(player.handTiles);
    final oldUke = _countUkeUke(player.handTiles);
    final temp = List<Tile>.from(player.handTiles);
    _removeOne(temp, discard);
    final newShanten = _calcShantenProxy(temp);
    final newUke = _countUkeUke(temp);
    final shantenDelta = oldShanten - newShanten;
    final ukeDelta = newUke - oldUke;

    final key = '${discard.type.index}_${discard.number}';
    final cnt = counts[key] ?? 0;
    final connected = _hasNeighbor(counts, discard);
    final isolated = !_hasSameOrNeighbor(counts, discard);

    final riskWeight = _riskWeight(playerIndex);
    final attackWeight = _attackWeight(playerIndex) * (dynamicAggression / aiAggression);
    final patternBias = _patternBiasScore(playerIndex, discard, counts);

    double score = 0;
    
    // ========== 核心评分 ==========
    score += safety * riskWeight * 0.5; // 降低防守权重
    score += shantenDelta * 0.20 * attackWeight; // 提高进张权重
    score += ukeDelta * 0.08 * attackWeight;
    
    // 丢牌惩罚/奖励
    if (cnt >= 2) score -= 0.05; // 丢对子/刻子（降低惩罚，更激进）
    if (connected) score -= 0.03; // 丢连张（降低惩罚）
    if (isolated) score += 0.10; // 丢孤张（提高奖励）

    // 百搭惩罚：百搭越多，惩罚越重
    if (_isWildTile(discard)) {
      double wildPenalty = 0.40;
      if (wildCount >= 2) {
        wildPenalty *= 2.5;
      } else if (wildCount == 1) {
        wildPenalty *= 1.5;
      }
      score -= wildPenalty;
    }

    // 应用奖励机制
    score += bigHandReward * attackWeight;
    score += patternBias * attackWeight;
    
    return score;
  }

  double _calcSafetyPenalty(int playerIndex, Tile discard) {
    if (_isWildTile(discard)) return 0; // 百搭打出不可被吃碰杠/点炮
    double penalty = 0;
    int safeCount = 0;
    int activeOpp = 0;

    for (int i = 0; i < 4; i++) {
      if (i == playerIndex || eliminatedPlayers.contains(i)) continue;
      activeOpp++;
      final threat = _opponentThreat(i);

      if (_canHuWithExtra(players[i].handTiles, discard)) {
        penalty -= 2.0 * threat;
        penalty -= players[i].melds.length * 0.1 * threat;
      }
      final match = players[i].handTiles.where((t) => t.type == discard.type && t.number == discard.number).length;
      if (match >= 2) penalty -= 0.2 * threat; // 给对手碰机会

      // 包三/包四风险：对手已吃/碰我>=2口时，避免给可吃/碰/杠的牌
      final baoCount = baoRelations[i]?[playerIndex] ?? 0;
      if (baoCount >= 2 && _canClaimDiscard(i, playerIndex, discard)) {
        penalty -= (baoCount >= 3 ? 0.8 : 0.5) * threat;
      }

      // 一般风险：若下家可吃或对手可碰杠，略惩罚
      if (_canClaimDiscard(i, playerIndex, discard)) {
        penalty -= 0.12 * threat;
      }

      // 对手已副露该牌 → 更危险
      if (_opponentHasMeldTile(i, discard)) {
        penalty -= 0.25 * threat;
      }

      // 对手花色倾向：丢其优势花色更危险
      final dom = _opponentDominantSuit(i);
      if (dom != null && discard.suit == dom) {
        penalty -= 0.12 * threat;
      }

      // 热牌记忆：被吃/碰/杠过的牌更危险
      final hot = hotTiles[_tileKey(discard)] ?? 0;
      if (hot > 0) penalty -= min(0.4, hot * 0.1) * threat;

      // 危险牌记忆：对手已打出的牌更安全
      if (_hasDiscarded(players[i].playedTiles, discard)) {
        safeCount++;
      }
    }

    if (activeOpp > 0) {
      if (safeCount == activeOpp) penalty += 0.3; // 全员现物更安全
      else if (safeCount == 0) penalty -= 0.1; // 无现物更危险
      else penalty += 0.08 * safeCount;
    }

    final dead = deadTiles[_tileKey(discard)] ?? 0;
    if (dead > 0) penalty += min(0.4, dead * 0.1);

    return penalty;
  }

  int _simulateOneTrial(int playerIndex, Tile discard, Random rng) {
    // 复制墙与手牌（完全信息简化模拟）
    final wallCopy = List<Tile>.from(wall);
    if (wallCopy.isEmpty) return 0;
    wallCopy.shuffle(rng);

    final hands = List.generate(4, (i) => List<Tile>.from(players[i].handTiles));
    _removeOne(hands[playerIndex], discard);

    // 若弃牌直接放炮给他人 → 视为失败
    if (!_isWildTile(discard)) {
      for (int i = 0; i < 4; i++) {
        if (i == playerIndex) continue;
        if (eliminatedPlayers.contains(i)) continue;
        if (_canHuWithExtra(hands[i], discard)) return -1;
      }
    }

    int current = playerIndex;
    int steps = 0;
    while (wallCopy.isNotEmpty && steps < monteCarloMaxSteps) {
      steps++;
      current = _nextActiveIndexLocal(current);
      if (eliminatedPlayers.contains(current)) continue;

      final hand = hands[current];
      final draw = wallCopy.removeLast();
      hand.add(draw);

      if (_canHuWithExtra(hand, null)) {
        return current == playerIndex ? 1 : -1;
      }

      // 简化：启发式弃牌
      if (hand.isNotEmpty) {
        final discardTile = _smartRolloutDiscard(hand, rng);
        _removeOne(hand, discardTile);
      }
    }
    return 0;
  }

  Tile _smartRolloutDiscard(List<Tile> hand, Random rng) {
    if (hand.length <= 1) return hand.first;
    final counts = _countTiles(hand);
    Tile best = hand.first;
    double bestScore = 9999; // 选择"最差"的牌丢掉
    for (final t in hand) {
      final key = '${t.type.index}_${t.number}';
      final cnt = counts[key] ?? 0;
      final connected = _hasNeighbor(counts, t);
      final isolated = !_hasSameOrNeighbor(counts, t);
      double s = 0;
      if (_isWildTile(t)) s -= 3.0; // rollout里坚决保百搭
      if (cnt >= 2) s -= 0.6;
      if (connected) s -= 0.4;
      if (isolated) s += 0.5;
      if (s < bestScore) {
        bestScore = s;
        best = t;
      } else if (s == bestScore && rng.nextBool()) {
        best = t;
      }
    }
    return best;
  }

  int _calcShantenProxy(List<Tile> hand) {
    final counts = _countTiles(hand);
    int pairs = 0;
    int triplets = 0;
    for (final v in counts.values) {
      if (v >= 2) pairs++;
      if (v >= 3) triplets++;
    }
    int sequences = 0;
    sequences += _countSequences(hand, TileSuit.wan);
    sequences += _countSequences(hand, TileSuit.tong);
    sequences += _countSequences(hand, TileSuit.tiao);
    final melds = triplets + sequences;
    final groups = melds + pairs;
    final shanten = (6 - groups).clamp(0, 6);
    return shanten;
  }

  int _countSequences(List<Tile> hand, TileSuit suit) {
    final nums = List<int>.filled(10, 0);
    for (final t in hand) {
      if (t.suit == suit) nums[t.number]++;
    }
    int seq = 0;
    for (int n = 1; n <= 7; n++) {
      final m = min(nums[n], min(nums[n + 1], nums[n + 2]));
      if (m > 0) {
        seq += m;
        nums[n] -= m;
        nums[n + 1] -= m;
        nums[n + 2] -= m;
      }
    }
    return seq;
  }

  Map<String, int> _countTiles(List<Tile> hand) {
    final counts = <String, int>{};
    for (final t in hand) {
      if (t.isFlower || t.suit == TileSuit.hua) continue;
      final key = '${t.type.index}_${t.number}';
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }

  int _countUkeUke(List<Tile> hand) {
    final counts = _countTiles(hand);
    int n = 0;
    for (final t in hand) {
      if (_hasSameOrNeighbor(counts, t)) n++;
    }
    return n;
  }

  bool _hasNeighbor(Map<String, int> counts, Tile t) {
    if (t.suit != TileSuit.wan && t.suit != TileSuit.tong && t.suit != TileSuit.tiao) return false;
    final leftKey = '${t.type.index}_${t.number - 1}';
    final rightKey = '${t.type.index}_${t.number + 1}';
    return (counts[leftKey] ?? 0) > 0 || (counts[rightKey] ?? 0) > 0;
  }

  bool _hasSameOrNeighbor(Map<String, int> counts, Tile t) {
    final key = '${t.type.index}_${t.number}';
    if ((counts[key] ?? 0) >= 2) return true;
    return _hasNeighbor(counts, t);
  }

  void _removeOne(List<Tile> hand, Tile target) {
    final idx = hand.indexWhere((t) => t.id == target.id);
    if (idx >= 0) {
      hand.removeAt(idx);
      return;
    }
    final idx2 = hand.indexWhere((t) => t.type == target.type && t.number == target.number);
    if (idx2 >= 0) hand.removeAt(idx2);
  }

  double _riskWeight(int playerIndex) {
    double w = 1.0;
    final myScore = players[playerIndex].totalScore;
    int bestOpp = -999999;
    int maxMeld = 0;
    for (int i = 0; i < 4; i++) {
      if (i == playerIndex) continue;
      bestOpp = max(bestOpp, players[i].totalScore);
      maxMeld = max(maxMeld, players[i].melds.length);
    }
    if (myScore > bestOpp) w += 0.2; // 领先更保守
    if (myScore + 30 < bestOpp) w -= 0.1; // 落后更激进
    if (maxMeld >= 2) w += 0.2;
    if (maxMeld >= 3) w += 0.2;
    if (wall.length < 20) w += 0.15;
    if (wall.length > 100) w -= 0.10;
    return w.clamp(0.8, 1.6).toDouble();
  }

  double _attackWeight(int playerIndex) {
    double w = 1.0;
    final myScore = players[playerIndex].totalScore;
    int bestOpp = -999999;
    for (int i = 0; i < 4; i++) {
      if (i == playerIndex) continue;
      bestOpp = max(bestOpp, players[i].totalScore);
    }
    if (myScore + 30 < bestOpp) w += 0.15; // 落后更进攻
    if (myScore > bestOpp) w -= 0.10; // 领先稍保守
    if (wall.length < 20) w += 0.15; // 牌墙见底，略加速
    if (wall.length > 100) w -= 0.10; // 早期略保守
    w *= aiAggression; // 应用进攻系数
    return w.clamp(0.5, 2.0).toDouble();
  }

  double _patternBiasScore(int playerIndex, Tile discard, Map<String, int> counts) {
    final hand = players[playerIndex].handTiles;
    int wan = 0, tong = 0, tiao = 0, honor = 0;
    int pairs = 0, triplets = 0;
    for (final t in hand) {
      if (t.suit == TileSuit.wan) wan++;
      else if (t.suit == TileSuit.tong) tong++;
      else if (t.suit == TileSuit.tiao) tiao++;
      else if (t.type == TileType.wind || t.type == TileType.dragon) honor++;
    }
    for (final v in counts.values) {
      if (v >= 2) pairs++;
      if (v >= 3) triplets++;
    }

    final maxSuit = max(wan, max(tong, tiao));
    final suits = [wan, tong, tiao];
    suits.sort();
    final second = suits[1];

    TileSuit? dominant;
    if (maxSuit == wan) dominant = TileSuit.wan;
    if (maxSuit == tong) dominant = TileSuit.tong;
    if (maxSuit == tiao) dominant = TileSuit.tiao;

    final targetQing = honor == 0 && maxSuit >= 7 && (maxSuit - second) >= 2;
    final targetHun = honor > 0 && maxSuit >= 7 && (maxSuit - second) >= 2;
    final targetPeng = (pairs + triplets) >= 3;

    double score = 0;
    if (targetQing && dominant != null) {
      if (discard.suit == dominant) score -= 0.10;
      else score += 0.10;
      if (discard.type == TileType.wind || discard.type == TileType.dragon) score += 0.10;
    }
    if (targetHun && dominant != null) {
      if (discard.suit == dominant) score -= 0.08;
      else if (discard.type == TileType.wind || discard.type == TileType.dragon) score -= 0.05;
      else score += 0.08;
    }
    if (targetPeng) {
      final key = '${discard.type.index}_${discard.number}';
      final cnt = counts[key] ?? 0;
      if (cnt >= 2) score -= 0.08;
      if (_hasNeighbor(counts, discard)) score += 0.05;
    }
    return score;
  }

  double _opponentThreat(int oppIndex) {
    final melds = players[oppIndex].melds.length;
    int sh = _calcShantenProxy(players[oppIndex].handTiles);
    sh = max(0, sh - melds);
    double t = 1.0 + melds * 0.15;
    if (sh <= 1) t += 0.3;
    if (sh == 0) t += 0.2;
    if (sh <= 1 && players[oppIndex].handTiles.length <= 10 && melds >= 2) t += 0.4;
    return t.clamp(1.0, 1.8).toDouble();
  }

  bool _canClaimDiscard(int oppIndex, int discarderIndex, Tile discard) {
    final hand = players[oppIndex].handTiles;
    final same = hand.where((t) => t.type == discard.type && t.number == discard.number).length;
    if (same >= 2) return true; // 可碰
    if (same >= 3) return true; // 可杠
    // 可吃：只允许下家
    final next = _nextActiveIndexLocal(discarderIndex);
    if (oppIndex != next) return false;
    if (discard.suit != TileSuit.wan && discard.suit != TileSuit.tong && discard.suit != TileSuit.tiao) return false;
    final nums = <int>{};
    for (final t in hand) {
      if (t.suit == discard.suit) nums.add(t.number);
    }
    final n = discard.number;
    final canSeq = (nums.contains(n - 2) && nums.contains(n - 1)) ||
        (nums.contains(n - 1) && nums.contains(n + 1)) ||
        (nums.contains(n + 1) && nums.contains(n + 2));
    return canSeq;
  }

  void _recordHotTile(Tile t) {
    final key = _tileKey(t);
    hotTiles[key] = (hotTiles[key] ?? 0) + 1;
  }

  void _recordDeadTile(Tile t) {
    final key = _tileKey(t);
    deadTiles[key] = (deadTiles[key] ?? 0) + 1;
  }

  String _tileKey(Tile t) => '${t.type.index}_${t.number}';

  bool _opponentHasMeldTile(int oppIndex, Tile t) {
    for (final m in players[oppIndex].melds) {
      if (m.any((x) => x.type == t.type && x.number == t.number)) return true;
    }
    return false;
  }

  TileSuit? _opponentDominantSuit(int oppIndex) {
    int wan = 0, tong = 0, tiao = 0;
    for (final t in players[oppIndex].handTiles) {
      if (t.suit == TileSuit.wan) wan++;
      else if (t.suit == TileSuit.tong) tong++;
      else if (t.suit == TileSuit.tiao) tiao++;
    }
    for (final m in players[oppIndex].melds) {
      for (final t in m) {
        if (t.suit == TileSuit.wan) wan++;
        else if (t.suit == TileSuit.tong) tong++;
        else if (t.suit == TileSuit.tiao) tiao++;
      }
    }
    final maxSuit = max(wan, max(tong, tiao));
    if (maxSuit < 5) return null;
    if (maxSuit == wan) return TileSuit.wan;
    if (maxSuit == tong) return TileSuit.tong;
    if (maxSuit == tiao) return TileSuit.tiao;
    return null;
  }

  bool _hasDiscarded(List<Tile> list, Tile t) {
    return list.any((x) => x.type == t.type && x.number == t.number);
  }

  void _persistAIStrategy() {
    if (!aiPersistStrategyEnabled) return;
    DatabaseService().saveAIStrategy({
      'game_id': currentGameId,
      'timestamp': DateTime.now().toIso8601String(),
      'mc_trials': monteCarloTrials,
      'mc_steps': monteCarloMaxSteps,
      'mc_budget_ms': monteCarloBudget.inMilliseconds,
    });
  }

  void _logAIDecision(int playerIndex, Tile discard, double bestScore, List<Map<String, dynamic>> evals) {
    if (!aiPersistDecisionEnabled) return;
    evals.sort((a, b) => (b['score'] as num).compareTo(a['score'] as num));
    final top = evals.take(5).toList();
    DatabaseService().saveAIDecision({
      'game_id': currentGameId,
      'seq': aiDecisionSeq++,
      'player_index': playerIndex,
      'discard': _tileKey(discard),
      'score': bestScore,
      'top_candidates': top,
      'timestamp': DateTime.now().toIso8601String(),
    });
  }

  void _persistGameStats(SettlementResult result) {
    if (!aiPersistStatsEnabled) return;
    DatabaseService().saveAIGameStats({
      'game_id': currentGameId,
      'timestamp': DateTime.now().toIso8601String(),
      'is_draw': result.isDraw,
      'winner_index': result.winnerIndex,
      'reason': result.reason,
      'base_points': result.basePoints,
      'round_multiplier': result.roundMultiplier,
      'extra_multiplier': result.extraMultiplier,
      'total_points': result.totalPoints,
      'turns': turnCounter,
      'scores': players.map((p) => p.totalScore).toList(),
      'deltas': result.deltas,
    });
  }

  Map<String, dynamic> buildWinSummary(int winnerIndex, {required bool isSelfDraw}) {
    final winner = players[winnerIndex];
    final extraTile = isSelfDraw ? null : lastPlayedTile;
    final fixed = _calcFixedScore(winner, isSelfDraw, extra: extraTile);
    final huType = _calcHuType(winner, extra: extraTile);
    final useFormula = huType == '混一色' || huType == '碰碰胡';
    final basePoints = fixed.points > 0 ? fixed.points : (useFormula ? min(10, _calcBasePoints(winner, extra: extraTile)) : 0);
    final reason = fixed.points > 0 ? fixed.reason : (huType ?? '胡牌');
    final extra = _calcExtraMultiplier(winner, extraTile: extraTile);
    final total = basePoints * finalMultiplier * extra;

    final melds = <String>[];
    for (int i = 0; i < winner.melds.length; i++) {
      final m = winner.melds[i];
      final hidden = (i < winner.meldHidden.length) ? winner.meldHidden[i] : false;
      melds.add(_formatMeld(m, hidden));
    }

    final sources = <String>[];
    winner.meldSourceCounts.forEach((idx, cnt) {
      sources.add('${players[idx].name}×$cnt');
    });

    return {
      'winner_index': winnerIndex,
      'winner_name': winner.name,
      'win_type': isSelfDraw ? '自摸' : '点炮',
      'hu_type': huType ?? '',
      'reason': reason,
      'base_points': basePoints,
      'round_multiplier': finalMultiplier,
      'extra_multiplier': extra,
      'total_points': total,
      'melds': melds,
      'meld_sources': sources,
    };
  }

  String _formatMeld(List<Tile> meld, bool hidden) {
    final tiles = meld.map((t) => t.displayName).toList().join(' ');
    final type = _meldType(meld, hidden);
    return '$type: $tiles';
  }

  String _meldType(List<Tile> meld, bool hidden) {
    if (meld.length == 4) return hidden ? '暗杠' : '明杠';
    if (meld.length == 3) {
      final same = meld.every((t) => t.type == meld.first.type && t.number == meld.first.number);
      if (same) return '碰';
      final nums = meld.map((t) => t.number).toList()..sort();
      final isSeq = nums[0] + 1 == nums[1] && nums[1] + 1 == nums[2];
      if (isSeq) return '吃';
    }
    return '副露';
  }

  bool _canHuWithExtra(List<Tile> hand, Tile? extra) {
    final tiles = <Tile>[...hand];
    if (extra != null) tiles.add(extra);
    return checkHu(tiles);
  }

  int _nextActiveIndexLocal(int from) {
    int idx = from;
    for (int i = 0; i < 4; i++) {
      idx = (idx + 3) % 4;
      if (!eliminatedPlayers.contains(idx)) return idx;
    }
    return from;
  }

  // ===== 游戏状态机 =====

  // 检查所有玩家是否可响应（吃/碰/杠/胡）
  int? checkPlayerResponses({bool allowChow = true}) {
    if (pendingTile == null) return null;

    // 按逆时针顺序检查：下家→对家→上家
    for (int offset = 1; offset <= 3; offset++) {
      final playerIdx = (currentPlayerIndex + offset) % 4;
      if (playerIdx == 0) continue;
      if (eliminatedPlayers.contains(playerIdx)) continue;

      final player = players[playerIdx];
      if (canHu(player)) return playerIdx;
      if (canKong(player)) return playerIdx;
      if (canPong(player)) return playerIdx;
      if (allowChow && playerIdx == (currentPlayerIndex + 1) % 4 && canChow(player)) return playerIdx;
    }
    return null;
  }

  // 强制回合流转
  void processTurn({bool skipPlayerResponse = false}) {
    if (pendingTile == null) return;
    if (freezeActive) return;
    if (allowNextPlayerAction) return;

    // 响应窗口开启时，仅允许碰/杠/胡（1秒内决定）
    if (!skipPlayerResponse && currentPlayerIndex != 0) {
      final player = players[0];
      final canRespond = canHu(player) || canKong(player) || canPong(player);
      awaitingPlayerResponse = canRespond;
    } else {
      awaitingPlayerResponse = false;
    }
    onStateChanged?.call();

    // 启动1秒响应窗口计时（不强制卡住）
    if (!responseTimerActive) {
      responseTimerActive = true;
      Future.delayed(responseWindowDuration, () {
        responseTimerActive = false;
        if (freezeActive) return;
        if (pendingTile == null || !responseWindowOpen) return;

        // 窗口结束时，先判定是否有人胡（支持一炮多响）
        final autoHu = _collectHuClaimers(includeHuman: false);
        if (_resolveMultiHu(autoClaimers: autoHu)) {
          onStateChanged?.call();
          return;
        }

        // 再判定是否有人碰/杠
        final responder = checkPlayerResponses(allowChow: false);
        if (responder != null) {
          responseWindowOpen = false;
          allowNextPlayerAction = false;
          if (aiRespondDelay == Duration.zero) {
            aiPlay(responder);
            onStateChanged?.call();
          } else {
            Future.delayed(aiRespondDelay, () {
              aiPlay(responder);
              onStateChanged?.call();
            });
          }
          return;
        }

        responseWindowOpen = false;
        allowNextPlayerAction = true;
        awaitingPlayerResponse = false;
        nextPlayerIndex ??= _peekNextPlayerIndex();
        if (nextPlayerIndex != null && nextPlayerIndex != 0) {
          _aiAfterDelay(nextPlayerIndex!);
        }
        onStateChanged?.call();
      });
    }
  }

  void _aiAfterDelay(int playerIndex) {
    if (!allowNextPlayerAction || pendingTile == null) return;
    final player = players[playerIndex];
    // 下家只能吃或摸
    if (canChow(player)) {
      doChow(player, null);
      if (aiDiscardDelay == Duration.zero) {
        aiDiscard(playerIndex);
      } else {
        Future.delayed(aiDiscardDelay, () {
          aiDiscard(playerIndex);
        });
      }
    } else {
      _clearResponseWindowFlags();
      pendingTile = null;
      currentPlayerIndex = playerIndex;
      drawTile(player);
      if (aiDiscardDelay == Duration.zero) {
        aiDiscard(playerIndex);
      } else {
        Future.delayed(aiDiscardDelay, () {
          aiDiscard(playerIndex);
        });
      }
    }
  }

  bool playerDrawAfterDelay(int playerIndex) {
    if (!allowNextPlayerAction || pendingTile == null) return false;
    if (nextPlayerIndex != playerIndex) return false;
    _clearResponseWindowFlags();
    pendingTile = null;
    currentPlayerIndex = playerIndex;
    drawTile(players[playerIndex]);
    return true;
  }

  // 玩家选择"过"
  void playerPass() {
    awaitingPlayerResponse = false;
    processTurn(skipPlayerResponse: true);
  }

}
