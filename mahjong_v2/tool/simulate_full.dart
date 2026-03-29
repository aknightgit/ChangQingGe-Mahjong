import 'package:mahjong_v2/game_logic/mahjong_game.dart';

void main() {
  final runner = FullSimulator(games: 3, maxSteps: 8000, verbose: false);
  runner.run();
}

class FullSimulator {
  final int games;
  final int maxSteps;
  final bool verbose;

  FullSimulator({required this.games, required this.maxSteps, this.verbose = false});

  void run() {
    int totalEnds = 0;
    int totalSteps = 0;
    for (int i = 0; i < games; i++) {
      final result = _runOne(i + 1);
      if (result.ended) totalEnds++;
      totalSteps += result.steps;
    }
    print('Summary: games=$games, ended=$totalEnds, avgSteps=${(totalSteps / games).toStringAsFixed(1)}');
  }

  _SimResult _runOne(int index) {
    final game = MahjongGame();
    game.rollDice();
    game.deal();

    final dealerIndex = game.dealerIndex;
    bool dealerFirst = true;

    int steps = 0;
    while (!game.gameEnded && steps < maxSteps) {
      steps++;

      // 有弃牌等待响应
      if (game.pendingTile != null) {
        final responder = _findResponder(game);
        if (responder != null) {
          final acted = _autoRespond(game, responder);
          if (acted) {
            continue;
          }
        }
        // 无人响应 → 下家摸牌
        game.pendingTile = null;
        game.currentPlayerIndex = _nextActive(game, game.currentPlayerIndex);
      }

      // 轮到当前玩家
      final idx = game.currentPlayerIndex;
      if (game.eliminatedPlayers.contains(idx)) {
        game.currentPlayerIndex = _nextActive(game, idx);
        continue;
      }
      final p = game.players[idx];

      // 庄家首轮不摸牌，直接打
      if (!(dealerFirst && idx == dealerIndex)) {
        game.drawTile(p);
      }
      dealerFirst = false;

      if (game.canHu(p)) {
        game.playerWins(idx);
        continue;
      }

      _discardFirst(game, idx);
    }

    if (verbose) {
      print('Game $index -> ended=${game.gameEnded}, steps=$steps, wall=${game.wall.length}, active=${game.activePlayerCount}, reason=${game.lastSettlement?.reason ?? "-"}');
    } else {
      print('Game $index -> ended=${game.gameEnded}, steps=$steps, wall=${game.wall.length}, active=${game.activePlayerCount}');
    }

    return _SimResult(ended: game.gameEnded, steps: steps);
  }

  int _nextActive(MahjongGame game, int from) {
    int idx = from;
    for (int i = 0; i < 4; i++) {
      idx = (idx + 3) % 4; // 逆时针
      if (!game.eliminatedPlayers.contains(idx)) return idx;
    }
    return from;
  }

  int? _findResponder(MahjongGame game) {
    if (game.pendingTile == null) return null;
    for (int offset = 1; offset <= 3; offset++) {
      final idx = (game.currentPlayerIndex + offset) % 4;
      if (game.eliminatedPlayers.contains(idx)) continue;
      final p = game.players[idx];
      if (game.canHu(p)) return idx;
      if (game.getKongableTiles(p).isNotEmpty) return idx;
      if (game.canPong(p)) return idx;
      if (idx == (game.currentPlayerIndex + 1) % 4 && game.canChow(p)) return idx;
    }
    return null;
  }

  bool _autoRespond(MahjongGame game, int playerIndex) {
    final p = game.players[playerIndex];

    if (game.canHu(p)) {
      game.playerWins(playerIndex);
      return true;
    }

    final tiles = game.getKongableTiles(p);
    if (tiles.isNotEmpty) {
      game.doKong(p, tiles.first, isHidden: game.pendingTile == null);
      game.drawTile(p, isKongDraw: true);
      _discardFirst(game, playerIndex);
      return true;
    }

    if (game.canPong(p)) {
      game.doPong(p);
      game.drawTile(p);
      _discardFirst(game, playerIndex);
      return true;
    }

    if (playerIndex == (game.currentPlayerIndex + 1) % 4 && game.canChow(p)) {
      game.doChow(p, null);
      game.drawTile(p);
      _discardFirst(game, playerIndex);
      return true;
    }

    return false;
  }

  void _discardFirst(MahjongGame game, int playerIndex) {
    final p = game.players[playerIndex];
    if (p.handTiles.isEmpty) return;
    final discard = p.handTiles.removeAt(0);
    p.playedTiles.add(discard);
    game.pendingTile = discard;
    game.lastPlayedTile = discard;
    game.lastDiscarderIndex = playerIndex;
    game.lastKongDraw = false;
    game.responseWindowOpen = true;
    game.allowNextPlayerAction = false;
    game.responseTimerActive = false;
    game.nextPlayerIndex = null;
    if (playerIndex == 0) {
      game.mustDiscard = false;
    }
  }
}

class _SimResult {
  final bool ended;
  final int steps;
  _SimResult({required this.ended, required this.steps});
}
