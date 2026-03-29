import 'package:flutter/material.dart';
import 'dart:math';
import 'dart:async';
import 'package:mahjong_v2/game_logic/mahjong_game.dart';

class GameScreen extends StatefulWidget {
  final int maxDiceRolls;
  const GameScreen({super.key, this.maxDiceRolls = 2});

  @override
  State<GameScreen> createState() => _GameScreenState();
}

class _GameScreenState extends State<GameScreen> with TickerProviderStateMixin {
  late final MahjongGame _game;
  bool isRolling = false;
  bool canPong = false, canKong = false, canHu = false, canChow = false;
  int? selectedTileIndex;
  final List<Color> _playerColors = [Colors.red, Colors.green, Colors.blue, Colors.orange];
  final List<String> _directionLabels = ['东', '南', '西', '北'];
  bool _freezeActive = false;
  int _freezeCountdown = 0;
  Timer? _freezeTimer;

  late AnimationController _diceAnimController;
  late Animation<double> _diceRotateAnimation;
  List<int> _displayDice = [1, 1];

  late AnimationController _rebelAnimController;
  late Animation<double> _rebelPulse;

  @override
  void initState() {
    super.initState();
    _game = MahjongGame(maxDiceRolls: widget.maxDiceRolls);
    _game.onStateChanged = () {
      if (mounted) setState(() {});
    };
    _diceAnimController = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    );
    _diceRotateAnimation = Tween<double>(begin: 0, end: 2 * pi).animate(
      CurvedAnimation(parent: _diceAnimController, curve: Curves.easeOut),
    );
    _diceAnimController.addStatusListener((status) {
      if (status == AnimationStatus.completed) {
        setState(() {
          isRolling = false;
          _displayDice = _game.diceValues;
        });
      }
    });

    _rebelAnimController = AnimationController(
      duration: const Duration(milliseconds: 900),
      vsync: this,
    );
    _rebelPulse = Tween<double>(begin: 1.0, end: 1.08).animate(
      CurvedAnimation(parent: _rebelAnimController, curve: Curves.easeInOut),
    );
    _rebelAnimController.repeat(reverse: true);
  }

  @override
  void dispose() {
    _freezeTimer?.cancel();
    _game.onStateChanged = null;
    _diceAnimController.dispose();
    _rebelAnimController.dispose();
    super.dispose();
  }

  // ===== Helper: wall tile =====
  Widget _wallTile({required double w, required double h}) {
    return Container(
      width: w,
      height: h,
      margin: const EdgeInsets.all(0.4),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(2),
        boxShadow: const [
          BoxShadow(color: Colors.black38, blurRadius: 2, offset: Offset(1, 1)),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(2),
        child: Image.asset(
          'assets/tilesets/pomax_hq/Back.png',
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => Container(
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF1565C0), Color(0xFF0D47A1)],
              ),
              borderRadius: BorderRadius.circular(2),
              border: Border.all(color: const Color(0xFFD4AF37), width: 0.5),
            ),
          ),
        ),
      ),
    );
  }

  // ==================== BUILD ====================

  @override
  Widget build(BuildContext context) {
    final player = _game.players[0];
    final isMyTurn = _game.currentPlayerIndex == 0;
    final canRespond = _game.awaitingPlayerResponse;
    final canActAfterDelay = _game.allowNextPlayerAction && _game.nextPlayerIndex == 0;
    final hasFlowerInHand = player.handTiles.any((t) => t.isFlower);
    final canSelfAction = isMyTurn && _game.mustDiscard;
    canPong = canRespond && _game.pendingTile != null && _game.canPong(player);
    canKong = (canRespond && (_game.canKong(player) || hasFlowerInHand)) ||
        (canSelfAction && (_game.canKong(player) || hasFlowerInHand));
    canHu = (canRespond && _game.canHu(player)) || (canSelfAction && _game.canHu(player));
    canChow = canActAfterDelay && _game.pendingTile != null && _game.canChow(player);
    final canRebelNow = _game.canRebel(0);

    if (canRebelNow && !_rebelAnimController.isAnimating) {
      _rebelAnimController.repeat(reverse: true);
    } else if (!canRebelNow && _rebelAnimController.isAnimating) {
      _rebelAnimController.stop();
    }

    return Scaffold(
      body: LayoutBuilder(
        builder: (context, constraints) {
          final sw = constraints.maxWidth;
          final sh = constraints.maxHeight;

          // Table dimensions (simple rectangular)
          final tableW = sw * 0.90;
          final tableH = sh * 0.70;
          final tableLeft = (sw - tableW) / 2;
          final tableTop = sh * 0.08;

          // Tile sizes (brick shape: wide & short)
          final tileW = sw * 0.035;
          final tileH = tileW * 0.55;

          return Stack(
            children: [
              // ===== 1. Background =====
              Positioned.fill(
                child: Container(
                  decoration: const BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [Color(0xFF4E342E), Color(0xFF3E2723), Color(0xFF2C1B0E)],
                    ),
                  ),
                ),
              ),

              // ===== 2. Table =====
              Positioned(
                left: tableLeft,
                top: tableTop,
                width: tableW,
                height: tableH,
                child: Container(
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [Color(0xFF1B5E20), Color(0xFF2E7D32)],
                    ),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFD4AF37), width: 3),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.6),
                        blurRadius: 20,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                ),
              ),

              // ===== 3. Walls =====
              ..._buildWalls(tableLeft, tableTop, tableW, tableH, tileW, tileH),

              // ===== 4. River (discards) =====
              if (_game.phase == GamePhase.playing)
                _buildRiver(tableLeft, tableTop, tableW, tableH, tileW, tileH),

              // ===== 5. Avatars =====
              ..._buildAvatars(sw, sh, tableLeft, tableTop, tableW, tableH),

              // ===== 6. Turn hint =====
              if (_game.phase == GamePhase.playing)
                _buildTurnHint(sw, sh),

              // ===== 7. Multiplier =====
              if (_game.phase == GamePhase.playing && _game.finalMultiplier > 0)
                _buildMultiplier(sw, tableTop + 10),

              // ===== 8. Dice area =====
              if (_game.phase == GamePhase.waiting ||
                  _game.phase == GamePhase.diceRolling ||
                  _game.phase == GamePhase.dealing)
                _buildDiceArea(sw, sh),

              // ===== 9. Hand tiles =====
              if (_game.phase == GamePhase.playing)
                _buildHandArea(sw, sh, tileW * 0.95, tileW * 0.95 * 1.3),

              // ===== 10. Action buttons =====
              if (_game.phase == GamePhase.playing) _buildActionButtons(sw, sh),

              // ===== 11. Freeze overlay =====
              if (_freezeActive) _buildFreezeOverlay(),

              // ===== 12. Rebel =====
              if (canRebelNow) _buildRebelButtons(),

              // ===== 13. Settlement =====
              if (_game.phase == GamePhase.scoring && _game.lastSettlement != null)
                _buildSettlementOverlay(sw, sh),
            ],
          );
        },
      ),
    );
  }

  // ==================== WALLS ====================

  List<Widget> _buildWalls(
    double tableLeft, double tableTop, double tableW, double tableH,
    double tileW, double tileH,
  ) {
    const topCount = 18;
    const botCount = 18;
    const sideCount = 18;
    final gap = 0.8;

    // Horizontal wall: tiles side by side in a Row
    final hWallW = topCount * (tileW + gap);
    // Vertical wall: tiles stacked in a Column, each rotated 90°
    // After rotation, each tile's visual height = tileW (the long side)
    final vWallH = sideCount * (tileW + gap);

    return [
      // Top wall — centered
      Positioned(
        left: tableLeft + (tableW - hWallW) / 2,
        top: tableTop + tableH * 0.04,
        child: Row(
          children: List.generate(topCount, (_) => _wallTile(w: tileW, h: tileH)),
        ),
      ),
      // Bottom wall — centered
      Positioned(
        left: tableLeft + (tableW - hWallW) / 2,
        top: tableTop + tableH * 0.96 - tileH,
        child: Row(
          children: List.generate(botCount, (_) => _wallTile(w: tileW, h: tileH)),
        ),
      ),
      // Left wall — each tile rotated 90° clockwise so long edge faces table
      Positioned(
        left: tableLeft + tableW * 0.04,
        top: tableTop + (tableH - vWallH) / 2,
        child: Column(
          children: List.generate(sideCount, (_) =>
            Transform.rotate(
              angle: pi / 2,  // 90° clockwise
              child: _wallTile(w: tileW, h: tileH),
            ),
          ),
        ),
      ),
      // Right wall — each tile rotated 90° counter-clockwise
      Positioned(
        left: tableLeft + tableW * 0.96 - tileW,
        top: tableTop + (tableH - vWallH) / 2,
        child: Column(
          children: List.generate(sideCount, (_) =>
            Transform.rotate(
              angle: -pi / 2,  // 90° counter-clockwise
              child: _wallTile(w: tileW, h: tileH),
            ),
          ),
        ),
      ),
    ];
  }

  // ==================== RIVER (Discards) ====================

  Widget _buildRiver(
    double tableLeft, double tableTop, double tableW, double tableH,
    double tileW, double tileH,
  ) {
    final riverW = tableW * 0.55;
    final riverH = tableH * 0.45;
    final riverLeft = tableLeft + (tableW - riverW) / 2;
    final riverTop = tableTop + (tableH - riverH) / 2;

    final smallTileW = tileW * 0.45;
    final smallTileH = tileH * 0.45;

    return Positioned(
      left: riverLeft,
      top: riverTop,
      width: riverW,
      height: riverH,
      child: Stack(
        children: [
          // River background
          Container(
            decoration: BoxDecoration(
              color: const Color(0xFF1B5E20).withOpacity(0.4),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: const Color(0xFFD4AF37).withOpacity(0.3),
                width: 1,
              ),
            ),
          ),
          // Player 0 (bottom) discards
          _buildDiscardQuadrant(
            left: 4, top: riverH * 0.52,
            tiles: _game.players[0].playedTiles,
            tileW: smallTileW, tileH: smallTileH,
            perLine: 6, isVertical: false, reversed: false,
            maxWidth: riverW - 8,
          ),
          // Player 2 (top) discards
          _buildDiscardQuadrant(
            left: 4, top: 4,
            tiles: _game.players[2].playedTiles,
            tileW: smallTileW, tileH: smallTileH,
            perLine: 6, isVertical: false, reversed: true,
            maxWidth: riverW - 8,
          ),
          // Player 1 (right) discards
          _buildDiscardQuadrant(
            left: riverW * 0.52, top: 4,
            tiles: _game.players[1].playedTiles,
            tileW: smallTileW * 0.9, tileH: smallTileH * 0.9,
            perLine: 6, isVertical: true, reversed: false,
            maxWidth: riverW * 0.45,
          ),
          // Player 3 (left) discards
          _buildDiscardQuadrant(
            left: 4, top: 4,
            tiles: _game.players[3].playedTiles,
            tileW: smallTileW * 0.9, tileH: smallTileH * 0.9,
            perLine: 6, isVertical: true, reversed: true,
            maxWidth: riverW * 0.45,
          ),
        ],
      ),
    );
  }

  // ==================== DISCARD QUADRANT ====================

  Widget _buildDiscardQuadrant({
    required double left,
    required double top,
    required List<Tile> tiles,
    required double tileW,
    required double tileH,
    required int perLine,
    required bool isVertical,
    required bool reversed,
    double maxWidth = 300,
  }) {
    if (tiles.isEmpty) return const SizedBox.shrink();
    final displayTiles = reversed ? tiles.reversed.toList() : tiles;

    Widget tileWidget(Tile t) {
      return Container(
        width: tileW,
        height: tileH,
        margin: const EdgeInsets.all(0.5),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(2),
          boxShadow: const [
            BoxShadow(color: Colors.black26, blurRadius: 1, offset: Offset(0.5, 0.5)),
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(2),
          child: Image.asset(
            t.imagePath,
            fit: BoxFit.contain,
            errorBuilder: (_, __, ___) => Container(
              color: const Color(0xFFF5ECD7),
              child: Center(
                child: Text(
                  t.displayName,
                  style: TextStyle(fontSize: tileW * 0.28, fontWeight: FontWeight.bold),
                ),
              ),
            ),
          ),
        ),
      );
    }

    if (!isVertical) {
      return Positioned(
        left: left,
        top: top,
        child: SizedBox(
          width: maxWidth,
          child: Wrap(
            children: displayTiles.map(tileWidget).toList(),
          ),
        ),
      );
    } else {
      return Positioned(
        left: left,
        top: top,
        child: SizedBox(
          width: maxWidth,
          child: Wrap(
            children: displayTiles.map(tileWidget).toList(),
          ),
        ),
      );
    }
  }

  // ==================== AVATARS ====================

  List<Widget> _buildAvatars(
    double sw, double sh,
    double tableLeft, double tableTop, double tableW, double tableH,
  ) {
    return List.generate(4, (idx) {
      final p = _game.players[idx];
      final isActive = _game.currentPlayerIndex == idx;
      final color = _playerColors[idx];
      final direction = _directionLabels[idx];

      double cx, cy;
      switch (idx) {
        case 0: // bottom center
          cx = tableLeft + tableW / 2;
          cy = tableTop + tableH * 0.93;
          break;
        case 1: // right center
          cx = tableLeft + tableW * 0.95;
          cy = tableTop + tableH * 0.50;
          break;
        case 2: // top center
          cx = tableLeft + tableW / 2;
          cy = tableTop + tableH * 0.07;
          break;
        case 3: // left center
          cx = tableLeft + tableW * 0.05;
          cy = tableTop + tableH * 0.50;
          break;
        default:
          cx = tableLeft;
          cy = tableTop;
      }

      return Positioned(
        left: cx - 24,
        top: cy - 24,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: color,
                border: Border.all(
                  color: isActive ? Colors.yellow : Colors.white,
                  width: isActive ? 3 : 2,
                ),
                boxShadow: [
                  if (isActive)
                    BoxShadow(
                      color: color.withOpacity(0.7),
                      blurRadius: 12,
                      spreadRadius: 2,
                    ),
                  BoxShadow(
                    color: Colors.black.withOpacity(0.4),
                    blurRadius: 6,
                  ),
                ],
              ),
              child: Center(
                child: Text(
                  direction,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 2),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
              decoration: BoxDecoration(
                color: Colors.black54,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                '${p.totalScore > 0 ? "+" : ""}${p.totalScore}',
                style: TextStyle(
                  color: p.totalScore >= 0 ? Colors.greenAccent : Colors.redAccent,
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ],
        ),
      );
    });
  }

  // ==================== TURN HINT ====================

  Widget _buildTurnHint(double sw, double sh) {
    return Positioned(
      left: 0,
      right: 0,
      top: sh * 0.02,
      child: Center(
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
          decoration: BoxDecoration(
            color: Colors.black54,
            borderRadius: BorderRadius.circular(20),
          ),
          child: Text(
            _turnHintText(),
            style: const TextStyle(
              color: Colors.white,
              fontSize: 14,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
      ),
    );
  }

  // ==================== MULTIPLIER ====================

  Widget _buildMultiplier(double sw, double top) {
    return Positioned(
      left: 0,
      right: 0,
      top: top,
      child: Center(
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
          decoration: BoxDecoration(
            color: Colors.black54,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFFD4AF37), width: 1.5),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                '×${_game.finalMultiplier}',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: _multiplierColor(_game.finalMultiplier),
                ),
              ),
              if (_game.wildTile != null) ...[
                const SizedBox(width: 10),
                const Text('百搭', style: TextStyle(fontSize: 13, color: Colors.white70)),
                const SizedBox(width: 4),
                Container(
                  width: 28,
                  height: 36,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(3),
                    border: Border.all(color: const Color(0xFFD4AF37)),
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(3),
                    child: Image.asset(
                      _game.wildTile!.imagePath,
                      fit: BoxFit.contain,
                      errorBuilder: (_, __, ___) => Center(
                        child: Text(
                          _game.wildTile!.displayName,
                          style: const TextStyle(fontSize: 8),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  // ==================== DICE AREA ====================

  Widget _buildDiceArea(double sw, double sh) {
    return Positioned(
      left: sw * 0.3,
      right: sw * 0.3,
      top: sh * 0.35,
      child: Column(
        children: [
          _buildDiceWithAnimation(),
          const SizedBox(height: 10),
          Text(
            '掷骰次数：${_game.diceRollCount}/${_game.maxDiceRolls}',
            style: const TextStyle(color: Colors.white70, fontSize: 12),
          ),
          const SizedBox(height: 12),
          if (_game.diceRolled || _game.phase == GamePhase.diceRolling) _buildDealButton(),
        ],
      ),
    );
  }

  Widget _buildDiceWithAnimation() {
    return GestureDetector(
      onTap: isRolling ? null : _onDiceTap,
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Colors.black87,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: const Color(0xFFD4AF37), width: 3),
          boxShadow: const [
            BoxShadow(color: Colors.black54, blurRadius: 20, offset: Offset(0, 10)),
          ],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            _build3DDice(_displayDice[0]),
            const SizedBox(width: 24),
            _build3DDice(_displayDice[1]),
          ],
        ),
      ),
    );
  }

  Widget _build3DDice(int value) {
    return AnimatedBuilder(
      animation: _diceRotateAnimation,
      builder: (context, child) {
        final progress = isRolling ? _diceRotateAnimation.value : 0.0;
        final bounce = isRolling ? (1 - (progress * 2 - 1).abs()) * 1.5 : 0.0;
        final rotation = isRolling ? progress * 6.28 : 0.0;

        return Transform(
          transform: Matrix4.identity()
            ..translateByDouble(0.0, -bounce, 0.0, 1.0)
            ..rotateZ(rotation),
          alignment: Alignment.center,
          child: Container(
            width: 60,
            height: 60,
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [Colors.white, Color(0xFFEEEEEE)],
              ),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.black87, width: 2),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.4),
                  blurRadius: 8,
                  offset: const Offset(2, 4),
                ),
              ],
            ),
            child: Center(child: _buildDiceDots(value)),
          ),
        );
      },
    );
  }

  Widget _buildDiceDots(int value) {
    const positions = {
      1: [(0.5, 0.5)],
      2: [(0.2, 0.2), (0.8, 0.8)],
      3: [(0.2, 0.2), (0.5, 0.5), (0.8, 0.8)],
      4: [(0.2, 0.2), (0.2, 0.8), (0.8, 0.2), (0.8, 0.8)],
      5: [(0.2, 0.2), (0.2, 0.8), (0.5, 0.5), (0.8, 0.2), (0.8, 0.8)],
      6: [(0.2, 0.2), (0.2, 0.5), (0.2, 0.8), (0.8, 0.2), (0.8, 0.5), (0.8, 0.8)],
    };
    const dotSize = 12.0;
    return SizedBox(
      width: 50,
      height: 50,
      child: Stack(
        children: (positions[value] ?? []).map((pos) => Positioned(
          left: pos.$1 * 50 - dotSize / 2,
          top: pos.$2 * 50 - dotSize / 2,
          child: Container(
            width: dotSize,
            height: dotSize,
            decoration: const BoxDecoration(
              color: Colors.red,
              shape: BoxShape.circle,
              boxShadow: [BoxShadow(color: Colors.black26, blurRadius: 2)],
            ),
          ),
        )).toList(),
      ),
    );
  }

  Widget _buildDealButton() {
    return GestureDetector(
      onTap: _onDealTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 16),
        decoration: BoxDecoration(
          gradient: const LinearGradient(colors: [Color(0xFF4CAF50), Color(0xFF2E7D32)]),
          borderRadius: BorderRadius.circular(25),
          boxShadow: [
            BoxShadow(color: Colors.green.withOpacity(0.5), blurRadius: 10),
          ],
        ),
        child: const Text(
          '发牌',
          style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white),
        ),
      ),
    );
  }

  // ==================== HAND TILES ====================

  Widget _buildHandArea(double sw, double sh, double tileW, double tileH) {
    final player = _game.players[0];
    return Positioned(
      left: sw * 0.08,
      right: sw * 0.08,
      bottom: sh * 0.01,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          // Melds & flowers
          if (player.flowerTiles.isNotEmpty || player.melds.isNotEmpty)
            _buildMeldsAndFlowers(tileW * 0.6, tileH * 0.6),
          if (player.flowerTiles.isNotEmpty || player.melds.isNotEmpty)
            const SizedBox(width: 8),
          // Hand tiles
          Expanded(child: _buildMyHand(tileW, tileH)),
        ],
      ),
    );
  }

  Widget _buildMyHand(double w, double h) {
    final player = _game.players[0];
    return Container(
      height: h + 24,
      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.black.withOpacity(0.4),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.white24, width: 1),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          for (int i = 0; i < player.handTiles.length; i++)
            GestureDetector(
              onTap: () => _playTile(i),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 150),
                width: w,
                height: h,
                margin: const EdgeInsets.symmetric(horizontal: 1),
                transform: Matrix4.translationValues(
                  0,
                  selectedTileIndex == i ? -h * 0.3 : 0,
                  0,
                ),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(4),
                  border: Border.all(
                    color: selectedTileIndex == i
                        ? Colors.yellow
                        : const Color(0xFFD4AF37).withOpacity(0.5),
                    width: selectedTileIndex == i ? 2.5 : 1,
                  ),
                  boxShadow: selectedTileIndex == i
                      ? [
                          const BoxShadow(
                            color: Colors.yellowAccent,
                            blurRadius: 8,
                            spreadRadius: 1,
                          ),
                        ]
                      : [
                          const BoxShadow(
                            color: Colors.black26,
                            blurRadius: 2,
                            offset: Offset(1, 1),
                          ),
                        ],
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(3),
                  child: Image.asset(
                    player.handTiles[i].imagePath,
                    fit: BoxFit.contain,
                    errorBuilder: (_, __, ___) => Container(
                      color: const Color(0xFFF5ECD7),
                      child: Center(
                        child: Text(
                          player.handTiles[i].displayName,
                          style: TextStyle(fontSize: w * 0.3, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildMeldsAndFlowers(double w, double h) {
    final player = _game.players[0];
    if (player.melds.isEmpty && player.flowerTiles.isEmpty) {
      return const SizedBox.shrink();
    }

    final sourceWidgets = <Widget>[];
    player.meldSourceCounts.forEach((idx, count) {
      final name = _game.players[idx].name;
      final color = _playerColors[idx % _playerColors.length];
      sourceWidgets.add(
        Text(
          '$name×$count',
          style: TextStyle(fontSize: 10, color: color, fontWeight: FontWeight.bold),
        ),
      );
      sourceWidgets.add(const SizedBox(width: 4));
    });
    if (sourceWidgets.isNotEmpty) sourceWidgets.removeLast();

    return Container(
      constraints: BoxConstraints(maxWidth: w * 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          if (sourceWidgets.isNotEmpty)
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(children: sourceWidgets),
            ),
          if (sourceWidgets.isNotEmpty) const SizedBox(height: 2),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                // Flowers
                ...player.flowerTiles.map((t) => Container(
                      width: w,
                      height: h,
                      margin: const EdgeInsets.only(right: 1),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(2),
                        child: Image.asset(
                          t.imagePath,
                          fit: BoxFit.contain,
                          errorBuilder: (_, __, ___) => Container(
                            color: const Color(0xFFF5ECD7),
                            child: Center(
                              child: Text(t.displayName, style: const TextStyle(fontSize: 6)),
                            ),
                          ),
                        ),
                      ),
                    )),
                // Melds
                ...player.melds.asMap().entries.expand((entry) {
                  final mi = entry.key;
                  final meld = entry.value;
                  final hidden = (mi < player.meldHidden.length) ? player.meldHidden[mi] : false;
                  return meld.map((t) {
                    final imgPath = hidden
                        ? 'assets/images/tiles/Regular/Back.png'
                        : t.imagePath;
                    return Container(
                      width: w,
                      height: h,
                      margin: const EdgeInsets.only(right: 1),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(2),
                        child: Image.asset(
                          imgPath,
                          fit: BoxFit.contain,
                          errorBuilder: (_, __, ___) => Container(
                            color: hidden ? const Color(0xFF1565C0) : const Color(0xFFF5ECD7),
                            child: Center(
                              child: Text(
                                hidden ? '' : t.displayName,
                                style: const TextStyle(fontSize: 6),
                              ),
                            ),
                          ),
                        ),
                      ),
                    );
                  });
                }),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ==================== ACTION BUTTONS ====================

  Widget _buildActionButtons(double sw, double sh) {
    const btnSize = 56.0;
    const subBtnSize = 48.0;
    final showDraw = _game.allowNextPlayerAction &&
        _game.nextPlayerIndex == 0 &&
        _game.pendingTile != null;
    final showWait = _game.canUseFreeze(0);
    final canFreeze = showWait && !_freezeActive;
    final isRobbingKong = _game.robbingKong && _game.awaitingPlayerResponse;
    final canRobKong = isRobbingKong && canHu;

    return Positioned(
      right: 12,
      top: 0,
      bottom: 0,
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (showDraw) ...[
              _buildCircleBtn('摸', Colors.red, showDraw, btnSize, _drawTile),
              const SizedBox(height: 8),
            ],
            _buildCircleBtn('吃', Colors.orange, canChow, subBtnSize, _onChow),
            const SizedBox(height: 6),
            _buildCircleBtn('碰', Colors.cyan, canPong, subBtnSize, _onPong),
            const SizedBox(height: 6),
            _buildCircleBtn('杠', Colors.purple, canKong, subBtnSize, _onKong),
            const SizedBox(height: 6),
            if (canRobKong)
              _buildCircleBtn('抢杠', Colors.red, true, subBtnSize, _onHu)
            else
              _buildCircleBtn('胡', Colors.yellow[700]!, canHu, subBtnSize, _onHu),
            if (showWait) ...[
              const SizedBox(height: 6),
              _buildCircleBtn('等', Colors.indigo, canFreeze, subBtnSize * 0.9, _startFreeze),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildCircleBtn(
    String label,
    Color baseColor,
    bool enabled,
    double size,
    VoidCallback onTap,
  ) {
    final color = enabled ? baseColor : Colors.grey[600]!;
    return GestureDetector(
      onTap: enabled ? onTap : null,
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: color,
          border: Border.all(
            color: enabled ? Colors.white : Colors.grey[400]!,
            width: 2,
          ),
          boxShadow: enabled
              ? [
                  BoxShadow(
                    color: color.withOpacity(0.5),
                    blurRadius: 10,
                  ),
                ]
              : null,
        ),
        child: Center(
          child: Text(
            label,
            style: TextStyle(
              fontSize: size * 0.32,
              fontWeight: FontWeight.bold,
              color: enabled ? Colors.white : Colors.grey[400],
            ),
          ),
        ),
      ),
    );
  }

  // ==================== REBEL BUTTONS ====================

  Widget _buildRebelButtons() {
    return Positioned(
      top: 50,
      left: 0,
      right: 0,
      child: Center(
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            AnimatedBuilder(
              animation: _rebelPulse,
              builder: (context, child) {
                return Transform.scale(
                  scale: _rebelPulse.value,
                  child: Container(
                    decoration: BoxDecoration(
                      boxShadow: [
                        BoxShadow(
                          color: Colors.red.withOpacity(0.6),
                          blurRadius: 18,
                          spreadRadius: 2,
                        ),
                      ],
                      borderRadius: BorderRadius.circular(28),
                    ),
                    child: child,
                  ),
                );
              },
              child: GestureDetector(
                onTap: _rebelAccept,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 30, vertical: 14),
                  decoration: BoxDecoration(
                    color: Colors.red,
                    borderRadius: BorderRadius.circular(28),
                    border: Border.all(color: Colors.white, width: 2),
                  ),
                  child: const Text(
                    '我要造反',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            GestureDetector(
              onTap: _rebelDecline,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 26, vertical: 12),
                decoration: BoxDecoration(
                  color: Colors.grey[700],
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: Colors.white70, width: 1.5),
                ),
                child: const Text(
                  '不造反',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ==================== FREEZE OVERLAY ====================

  Widget _buildFreezeOverlay() {
    return Positioned.fill(
      child: Center(
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          decoration: BoxDecoration(
            color: Colors.black.withOpacity(0.6),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.white, width: 2),
          ),
          child: Text(
            '等待 $_freezeCountdown',
            style: const TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
        ),
      ),
    );
  }

  // ==================== SETTLEMENT OVERLAY ====================

  Widget _buildSettlementOverlay(double w, double h) {
    final s = _game.lastSettlement!;
    return Positioned.fill(
      child: Container(
        color: Colors.black54,
        child: Center(
          child: Container(
            width: w * 0.72,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: const Color(0xFFF5ECD7),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFD4AF37), width: 2),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  s.isDraw ? '流局结算' : '本局结算',
                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                if (!s.isDraw && s.winnerIndex != null)
                  Text(
                    '胜者：${_game.players[s.winnerIndex!].name}',
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                  ),
                const SizedBox(height: 8),
                Text('原因：${s.reason}', style: const TextStyle(fontSize: 14)),
                const SizedBox(height: 4),
                Text(
                  '底分 ${s.basePoints} × 回合${s.roundMultiplier} × 额外${s.extraMultiplier} = ${s.totalPoints}',
                  style: const TextStyle(fontSize: 14),
                ),
                if (s.details.isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: s.details
                        .map((d) => Text(d,
                            style: const TextStyle(fontSize: 12, color: Colors.black87)))
                        .toList(),
                  ),
                ],
                const SizedBox(height: 10),
                Column(
                  children: List.generate(4, (i) {
                    final delta = s.deltas[i] ?? 0;
                    final color = delta >= 0 ? Colors.green : Colors.red;
                    return Padding(
                      padding: const EdgeInsets.symmetric(vertical: 2),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(_game.players[i].name,
                              style: const TextStyle(fontSize: 14)),
                          Text(
                            delta >= 0 ? '+$delta' : '$delta',
                            style: TextStyle(
                              color: color,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    );
                  }),
                ),
                const SizedBox(height: 12),
                ElevatedButton(
                  onPressed: _onNextRound,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF2E7D32),
                  ),
                  child: const Text('下一局',
                      style: TextStyle(color: Colors.white)),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // ==================== HELPER METHODS ====================

  String _turnHintText() {
    if (_freezeActive) return '等待中…';
    if (_game.robbingKong && _game.awaitingPlayerResponse) return '可抢杠胡';
    if (_game.awaitingPlayerResponse) return '可碰/杠/胡';
    if (_game.allowNextPlayerAction && _game.nextPlayerIndex == 0) return '可摸牌/可吃牌';
    if (_game.currentPlayerIndex == 0) {
      return _game.mustDiscard ? '轮到你出牌' : '轮到你摸牌';
    }
    return '等待其他玩家...';
  }

  Color _multiplierColor(int m) {
    if (m >= 8) return Colors.red;
    if (m >= 4) return Colors.orange;
    if (m >= 2) return Colors.yellow;
    return Colors.green;
  }

  // ==================== GAME LOGIC METHODS ====================

  void _onNextRound() {
    _cancelFreeze();
    setState(() {
      _game.resetForNextRound();
    });
  }

  void _onDiceTap() {
    _cancelFreeze();
    if (!_game.canRollDice) return;
    setState(() {
      isRolling = true;
      _displayDice = [Random().nextInt(6) + 1, Random().nextInt(6) + 1];
    });
    _diceAnimController.forward(from: 0);
    _game.rollDice();
  }

  void _onDealTap() {
    _cancelFreeze();
    setState(() {
      _game.deal();
    });
    if (_game.currentPlayerIndex != 0) {
      Future.delayed(const Duration(milliseconds: 500), () {
        _game.aiDiscard(_game.currentPlayerIndex);
        setState(() {});
      });
    }
  }

  void _cancelFreeze({bool resume = false}) {
    if (!_freezeActive) return;
    _freezeTimer?.cancel();
    _freezeActive = false;
    _freezeCountdown = 0;
    _game.freezeActive = false;
    if (resume) {
      _game.processTurn();
    }
  }

  void _startFreeze() {
    if (_freezeActive || !_game.canUseFreeze(0)) return;
    _game.useFreeze(0);
    _freezeTimer?.cancel();
    _freezeActive = true;
    _freezeCountdown = 3;
    _game.freezeActive = true;
    setState(() {});
    _freezeTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_freezeCountdown <= 1) {
        timer.cancel();
        _freezeActive = false;
        _freezeCountdown = 0;
        _game.freezeActive = false;
        _game.processTurn();
        setState(() {});
      } else {
        _freezeCountdown -= 1;
        setState(() {});
      }
    });
  }

  void _drawTile() {
    if (!(_game.allowNextPlayerAction && _game.nextPlayerIndex == 0)) return;
    _cancelFreeze();
    _game.playerDrawAfterDelay(0);
    setState(() {});
  }

  void _onKong() {
    _cancelFreeze();
    final p = _game.players[0];
    if (_game.currentPlayerIndex != 0 && !_game.awaitingPlayerResponse) return;

    if (p.handTiles.any((t) => t.isFlower)) {
      while (_game.wall.isNotEmpty) {
        final flowerIndex = p.handTiles.indexWhere((t) => t.isFlower);
        if (flowerIndex == -1) break;
        final flower = p.handTiles.removeAt(flowerIndex);
        p.flowerTiles.add(flower);
        final newTile = _game.drawTile(p, isKongDraw: true);
        if (newTile == null) break;
        if (newTile.isFlower) {
          p.handTiles.remove(newTile);
          p.flowerTiles.add(newTile);
          continue;
        }
      }
      setState(() {});
      return;
    }

    if (_game.canKong(p)) {
      final kongTiles = _game.getKongableTiles(p);
      if (kongTiles.isNotEmpty) {
        final isHidden = _game.pendingTile == null;
        final ok = _game.doKong(p, kongTiles.first, isHidden: isHidden);
        if (!ok) {
          setState(() {});
          return;
        }
        _game.awaitingPlayerResponse = false;
        if (p.index == 0) {
          _game.mustDiscard = false;
        }
        while (_game.wall.isNotEmpty) {
          final newTile = _game.drawTile(p, isKongDraw: true);
          if (newTile == null) break;
          if (newTile.isFlower) {
            p.handTiles.remove(newTile);
            p.flowerTiles.add(newTile);
            continue;
          }
          break;
        }
      }
    }
    setState(() {});
  }

  void _onChow() {
    _cancelFreeze();
    final p = _game.players[0];
    if (!_game.doChow(p, null)) return;
    _game.awaitingPlayerResponse = false;
    setState(() {});
  }

  void _onPong() {
    _cancelFreeze();
    final p = _game.players[0];
    if (!_game.doPong(p)) return;
    _game.awaitingPlayerResponse = false;
    setState(() {});
  }

  void _onHu() {
    _cancelFreeze();
    _game.awaitingPlayerResponse = false;
    if (_game.robbingKong) {
      _game.playerRobKongHu();
    } else if (_game.pendingTile != null) {
      _game.claimHu(0);
      _game.resolveMultiHuFromPlayer();
    } else {
      _game.playerWins(0);
    }
    setState(() {});
  }

  void _playTile(int i) {
    if (_game.currentPlayerIndex != 0) return;
    if (!_game.mustDiscard) return;
    _cancelFreeze();
    final p = _game.players[0];
    final t = p.handTiles[i];
    _game.playTile(p, t);
    selectedTileIndex = null;
    setState(() {});
    _triggerAIAfterPlayer();
  }

  void _triggerAIAfterPlayer() {
    Future.delayed(const Duration(milliseconds: 300), () {
      if (_game.gameEnded) return;
      if (_game.pendingTile != null) return;

      _game.nextPlayer();
      while (_game.currentPlayerIndex != 0 && !_game.gameEnded) {
        final idx = _game.currentPlayerIndex;
        _game.drawTile(_game.players[idx]);

        if (_game.canHu(_game.players[idx])) {
          _game.playerWins(idx);
          break;
        }

        _game.aiDiscard(idx);

        if (_game.pendingTile != null) break;
        _game.nextPlayer();
      }
      setState(() {});
    });
  }

  void _rebelAccept() {
    _game.decideRebel(0, true);
    setState(() {});
  }

  void _rebelDecline() {
    _game.decideRebel(0, false);
    setState(() {});
  }
}

// ===== Trapezoid Painter (kept for potential future use) =====
class _TrapezoidPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {}

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

// ===== Perspective Table Painter (kept for potential future use) =====
class _PerspectiveTablePainter extends CustomPainter {
  final double centerX;
  final double topY;
  final double bottomY;
  final double topWidth;
  final double bottomWidth;

  _PerspectiveTablePainter({
    required this.centerX,
    required this.topY,
    required this.bottomY,
    required this.topWidth,
    required this.bottomWidth,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final path = Path()
      ..moveTo(centerX - topWidth / 2, topY)
      ..lineTo(centerX + topWidth / 2, topY)
      ..lineTo(centerX + bottomWidth / 2, bottomY)
      ..lineTo(centerX - bottomWidth / 2, bottomY)
      ..close();

    final fillPaint = Paint()
      ..shader = LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: const [
          Color(0xFF0D3B0D),
          Color(0xFF145214),
          Color(0xFF1B5E20),
          Color(0xFF2E7D32),
        ],
        stops: const [0.0, 0.25, 0.6, 1.0],
      ).createShader(Rect.fromLTWH(0, topY, size.width, bottomY - topY));
    canvas.drawPath(path, fillPaint);

    final linePaint = Paint()
      ..color = const Color(0xFFD4AF37).withOpacity(0.08)
      ..strokeWidth = 0.5;
    for (double y = topY + 20; y < bottomY; y += 30) {
      final t = ((y - topY) / (bottomY - topY)).clamp(0.0, 1.0);
      final w = topWidth + (bottomWidth - topWidth) * t;
      canvas.drawLine(
        Offset(centerX - w / 2 + 10, y),
        Offset(centerX + w / 2 - 10, y),
        linePaint,
      );
    }

    canvas.drawShadow(path, Colors.black87, 20, true);

    final borderPaint = Paint()
      ..color = const Color(0xFFD4AF37)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3.5;
    canvas.drawPath(path, borderPaint);

    final innerPath = Path()
      ..moveTo(centerX - topWidth / 2 + 6, topY + 4)
      ..lineTo(centerX + topWidth / 2 - 6, topY + 4)
      ..lineTo(centerX + bottomWidth / 2 - 4, bottomY - 4)
      ..lineTo(centerX - bottomWidth / 2 + 4, bottomY - 4)
      ..close();
    final innerBorderPaint = Paint()
      ..color = const Color(0xFFD4AF37).withOpacity(0.3)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1;
    canvas.drawPath(innerPath, innerBorderPaint);
  }

  @override
  bool shouldRepaint(_PerspectiveTablePainter old) =>
      centerX != old.centerX ||
      topY != old.topY ||
      bottomY != old.bottomY ||
      topWidth != old.topWidth ||
      bottomWidth != old.bottomWidth;
}
