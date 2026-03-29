import 'dart:io';
import 'package:mahjong_v2/game_logic/mahjong_game.dart';

String tileName(Tile t) => t.displayName;

void main() {
  print('=== 详细游戏流程测试 ===\n');
  
  final game = MahjongGame();
  game.simulationMode = true;
  game.useMonteCarloAI = true;
  game.monteCarloBudget = Duration.zero;
  game.monteCarloTrials = 0;
  game.aiAggression = 1.0;
  game.aiRespondDelay = Duration.zero;
  game.aiDiscardDelay = Duration.zero;
  game.responseWindowDuration = Duration.zero;
  
  game.rollDice();
  print('骰子: ${game.diceValues}, 庄家: ${game.players[game.dealerIndex].name}');
  
  game.deal();
  for (int i = 0; i < 4; i++) {
    print('${game.players[i].name}: ${game.players[i].handTiles.length}张');
  }
  
  print('\n--- 开始游戏 (20步) ---');
  bool dealerFirst = true;
  
  for (int step = 1; step <= 20; step++) {
    final idx = game.currentPlayerIndex;
    final p = game.players[idx];
    
    if (game.eliminatedPlayers.contains(idx)) {
      print('步骤$step: ${p.name} 已胡，跳过');
      game.currentPlayerIndex = (idx + 1) % 4;
      continue;
    }
    
    // 有待响应的牌 - 只让下家响应
    if (game.pendingTile != null) {
      // 检查这个玩家是否是打牌者的下家
      final shooterIdx = game.lastDiscarderIndex ?? game.currentPlayerIndex;
      final nextIdx = (shooterIdx + 1) % 4;
      
      if (idx != nextIdx) {
        // 不是下家，跳过
        game.nextPlayer();
        continue;
      }
      
      print('步骤$step: ${p.name} 响应 ${game.pendingTile!.displayName}');
      
      // 检查能否胡
      if (game.canHu(p)) {
        print('    → 胡牌! 结束');
        game.playerWins(idx);
        break;
      }
      // 检查能否碰/杠/吃
      if (game.canPong(p) || game.canKong(p) || game.canChow(p)) {
        print('    → 可以碰/杠/吃');
      }
      
      // 不响应 → 轮转到下一个玩家
      game.playerPass();
      game.nextPlayer();
      continue;
    }
    
    print('步骤$step: ${p.name} 回合 (手牌${p.handTiles.length}张)');
    
    // 摸牌
    if (!(dealerFirst && idx == game.dealerIndex)) {
      final drawn = game.drawTile(p);
      if (drawn != null) {
        print('    摸牌: ${drawn.displayName}');
      }
    }
    dealerFirst = false;
    
    // 检查自摸
    if (game.canHu(p)) {
      print('    → 自摸胡! 结束');
      game.playerWins(idx);
      break;
    }
    
    // 打牌
    if (p.handTiles.isNotEmpty) {
      game.aiDiscard(idx);
      print('    打牌: ${game.lastPlayedTile?.displayName}');
    }
  }
  
  print('\n--- 游戏状态 ---');
  print('gameEnded: ${game.gameEnded}');
  print('lastWinner: ${game.lastWinnerIndex != null ? game.players[game.lastWinnerIndex!].name : "无"}');
  print('currentPlayer: ${game.players[game.currentPlayerIndex].name}');
}
