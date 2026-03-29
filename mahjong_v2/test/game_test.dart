import 'package:flutter_test/flutter_test.dart';
import 'package:mahjong_v2/game_logic/mahjong_game.dart';

void main() {
  group('牌堆测试', () {
    test('初始化144张牌', () {
      final game = MahjongGame();
      expect(game.wall.length, 144);
      expect(game.remainingTiles, 144);
      expect(game.players.length, 4);
    });

    test('发牌后庄家14张', () {
      final game = MahjongGame();
      game.deal();
      expect(game.players[0].handTiles.length, 14);
      expect(game.players[1].handTiles.length, 13);
    });

    test('逆时针轮转', () {
      final game = MahjongGame();
      game.currentPlayerIndex = 0;
      game.nextPlayer();
      expect(game.currentPlayerIndex, 3); // 0 -> 3 (逆时针)
    });

    test('五毒散检测-基础测试', () {
      final game = MahjongGame();
      // 添加一个玩家用于测试
      final player = game.players[0];
      // 不满足五毒散（有重复牌）
      player.handTiles = [
        Tile(id: 1, type: TileType.wan, number: 1, suit: TileSuit.wan),
        Tile(id: 2, type: TileType.wan, number: 1, suit: TileSuit.wan),
        Tile(id: 3, type: TileType.tiao, number: 1, suit: TileSuit.tiao),
        Tile(id: 4, type: TileType.tiao, number: 2, suit: TileSuit.tiao),
        Tile(id: 5, type: TileType.tong, number: 1, suit: TileSuit.tong),
        Tile(id: 6, type: TileType.tong, number: 2, suit: TileSuit.tong),
        Tile(id: 7, type: TileType.wind, number: 1, suit: TileSuit.hua),
        Tile(id: 8, type: TileType.wind, number: 2, suit: TileSuit.hua),
        Tile(id: 9, type: TileType.dragon, number: 1, suit: TileSuit.hua),
        Tile(id: 10, type: TileType.dragon, number: 2, suit: TileSuit.hua),
        Tile(id: 11, type: TileType.wan, number: 3, suit: TileSuit.wan),
        Tile(id: 12, type: TileType.tiao, number: 3, suit: TileSuit.tiao),
        Tile(id: 13, type: TileType.tong, number: 3, suit: TileSuit.tong),
      ];
      // 有重复牌(1万重复)，不满足五毒散
      expect(player.isWuDuSan, false);
    });
  });

  group('游戏流程测试', () {
    test('掷骰子', () {
      final game = MahjongGame();
      game.rollDice();
      expect(game.diceRolled, true);
      expect(game.diceValues[0], inInclusiveRange(1, 6));
      expect(game.diceValues[1], inInclusiveRange(1, 6));
    });

    test('摸牌减少牌墙', () {
      final game = MahjongGame();
      final before = game.remainingTiles;
      game.drawTile(game.players[0]);
      expect(game.remainingTiles, before - 1);
    });
  });
}
