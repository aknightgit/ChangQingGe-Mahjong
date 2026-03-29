import 'dart:io';
import 'package:mahjong_v2/game_logic/mahjong_game.dart';

String tileName(Tile t) => t.displayName;

void main() {
  print('=== 简化游戏流程测试 ===\n');
  
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
  
  for (int step = 1; step <= 20; step++) {
    int idx = game.currentPlayerIndex;
    
    // 跳过已淘汰玩家
    if (game.eliminatedPlayers.contains(idx)) {
      game.nextPlayer();
      continue;
    }
    
    final p = game.players[idx];
    
    // 有待响应的牌 → 响应阶段
    if (game.pendingTile != null) {
      // 找到应该响应的玩家（下家）
      final shooter = game.lastDiscarderIndex ?? idx;
      final nextPlayer = (shooter + 1) % 4;
      
      if (idx != nextPlayer || game.eliminatedPlayers.contains(nextPlayer)) {
        // 还没轮到下家响应，跳过
        game.nextPlayer();
        continue;
      }
      
      print('步骤$step: ${p.name} 响应 ${game.pendingTile!.displayName}');
      
      // 检查能否胡
      if (game.canHu(p)) {
        print('    → 自摸胡! 结束');
        game.playerWins(idx);
        break;
      }
      
      // 都不响应 → 进入摸牌阶段
      game.pendingTile = null;
      game.nextPlayer();
      continue;
    }
    
    // 摸牌阶段
    print('步骤$step: ${p.name} 回合 (手牌${p.handTiles.length}张)');
    
    // 庄家首轮不摸牌
    if (!(step == 1 && idx == game.dealerIndex)) {
      game.drawTile(p);
    }
    
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
      // 打牌后轮到下家响应
    }
  }
  
  print('\n--- 游戏状态 ---');
  print('gameEnded: ${game.gameEnded}');
  print('lastWinner: ${game.lastWinnerIndex != null ? game.players[game.lastWinnerIndex!].name : "无"}');
}
