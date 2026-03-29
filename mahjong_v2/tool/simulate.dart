import 'package:mahjong_v2/game_logic/mahjong_game.dart';

void main() {
  final game = MahjongGame();
  game.rollDice();
  game.deal();

  int steps = 0;
  int maxSteps = 8000;
  int huCount = 0;

  while (!game.gameEnded && steps < maxSteps) {
    steps++;

    // 忽略响应，强制无人吃碰杠
    if (game.pendingTile != null) {
      game.pendingTile = null;
      game.nextPlayer();
      continue;
    }

    final p = game.players[game.currentPlayerIndex];

    // 摸牌（玩家0如已摸过则直接打）
    if (!(game.currentPlayerIndex == 0 && game.mustDiscard)) {
      game.drawTile(p);
    }

    // 自摸检查
    if (game.canHu(p)) {
      game.playerWins(game.currentPlayerIndex);
      huCount++;
      continue;
    }

    // 打出一张牌（不触发响应）
    if (p.handTiles.isNotEmpty) {
      final tile = p.handTiles.removeAt(0);
      p.playedTiles.add(tile);
      game.pendingTile = tile;
      game.lastPlayedTile = tile;
      game.lastDiscarderIndex = p.index;
      if (p.index == 0) game.mustDiscard = false;
    }

    // 直接跳到下家
    if (game.pendingTile != null) {
      game.pendingTile = null;
      game.nextPlayer();
    }
  }

  print('Simulation finished. steps=$steps, huCount=$huCount, gameEnded=${game.gameEnded}, wallLeft=${game.wall.length}, active=${game.activePlayerCount}');
}
