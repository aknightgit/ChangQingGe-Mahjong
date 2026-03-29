import 'package:mahjong_v2/game_logic/mahjong_game.dart';
import 'package:mahjong_v2/services/database_service.dart';

void main() {
  final sim = FirstAIWinSimulator(maxGames: 300, maxSteps: 12000, verbose: true);
  final summary = sim.run();
  if (summary == null) {
    print('No AI win found within limit.');
  } else {
    DatabaseService().saveAIFirstWin(summary);
    print('First AI win summary saved.');
  }
}

class FirstAIWinSimulator {
  final int maxGames;
  final int maxSteps;
  final bool verbose;

  FirstAIWinSimulator({required this.maxGames, required this.maxSteps, this.verbose = false});

  Map<String, dynamic>? run() {
    for (int g = 1; g <= maxGames; g++) {
      final res = _runOne(g);
      if (res != null) return res;
    }
    return null;
  }

  Map<String, dynamic>? _runOne(int gameIndex) {
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
          final isWin = game.canHu(game.players[responder]);
          if (isWin) {
            if (responder == 0) return null; // 只记录AI胡牌
            final summary = game.buildWinSummary(responder, isSelfDraw: false);
            summary['game_index'] = gameIndex;
            summary['steps'] = steps;
            summary['from_index'] = game.currentPlayerIndex;
            summary['from_name'] = game.players[game.currentPlayerIndex].name;
            _printSummary(summary);
            return summary;
          }
          final acted = _autoRespond(game, responder);
          if (acted) continue;
        }
        // 无人响应 → 下家摸牌
        game.pendingTile = null;
        game.currentPlayerIndex = _nextActive(game, game.currentPlayerIndex);
      }

      final idx = game.currentPlayerIndex;
      if (game.eliminatedPlayers.contains(idx)) {
        game.currentPlayerIndex = _nextActive(game, idx);
        continue;
      }
      final p = game.players[idx];

      if (!(dealerFirst && idx == dealerIndex)) {
        game.drawTile(p);
      }
      dealerFirst = false;

      if (game.canHu(p)) {
        if (idx == 0) return null; // 只记录AI胡牌
        final summary = game.buildWinSummary(idx, isSelfDraw: true);
        summary['game_index'] = gameIndex;
        summary['steps'] = steps;
        _printSummary(summary);
        return summary;
      }

      _discardFirst(game, idx);
    }
    return null;
  }

  int _nextActive(MahjongGame game, int from) {
    int idx = from;
    for (int i = 0; i < 4; i++) {
      idx = (idx + 3) % 4;
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

  void _printSummary(Map<String, dynamic> s) {
    if (!verbose) return;
    print('--- First AI Win ---');
    print('Winner: ${s['winner_name']} (${s['winner_index']})');
    print('Win type: ${s['win_type']}');
    if (s['from_name'] != null) {
      print('From: ${s['from_name']} (${s['from_index']})');
    }
    print('Hu type: ${s['hu_type']}');
    print('Reason: ${s['reason']}');
    print('Base: ${s['base_points']}  Round×${s['round_multiplier']}  Extra×${s['extra_multiplier']}  Total=${s['total_points']}');
    final melds = (s['melds'] as List).cast<String>();
    if (melds.isNotEmpty) {
      print('Melds:');
      for (final m in melds) { print('  - $m'); }
    }
    final src = (s['meld_sources'] as List).cast<String>();
    if (src.isNotEmpty) {
      print('Sources: ${src.join(', ')}');
    }
  }
}
