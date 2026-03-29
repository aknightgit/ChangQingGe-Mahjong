import 'dart:io';
import 'package:mahjong_v2/game_logic/mahjong_game.dart';

void main() {
  print('=== 麻将游戏流程测试 ===\n');
  
  final game = MahjongGame();
  game.simulationMode = true;
  game.useMonteCarloAI = true;
  game.monteCarloBudget = Duration.zero;
  game.monteCarloTrials = 0;
  game.aiAggression = 1.0;
  game.aiRespondDelay = Duration.zero;
  game.aiDiscardDelay = Duration.zero;
  game.responseWindowDuration = Duration.zero;
  
  // 1. 掷骰子
  print('1. 掷骰子...');
  game.rollDice();
  print('   骰子: ${game.diceValues}, 庄家: ${game.players[game.dealerIndex].name}');
  
  // 2. 发牌
  print('2. 发牌...');
  game.deal();
  for (int i = 0; i < 4; i++) {
    print('   ${game.players[i].name}: ${game.players[i].handTiles.length}张');
  }
  
  // 3. 检查五毒散
  print('\n3. 检查五毒散(造反)...');
  for (int i = 0; i < 4; i++) {
    final canRebel = game.canRebel(i);
    print('   ${game.players[i].name}: ${canRebel ? "可造反" : "不可造反"}');
    if (canRebel) {
      // 测试造反
      game.decideRebel(i, true);
      print('     → 玩家选择造反！游戏结束');
      break;
    }
  }
  
  if (!game.gameEnded) {
    // 4. 模拟几轮
    print('\n4. 模拟游戏进行(前10步)...');
    int steps = 0;
    while (!game.gameEnded && steps < 10) {
      steps++;
      final idx = game.currentPlayerIndex;
      final p = game.players[idx];
      
      // 摸牌
      if (!(steps == 1 && idx == game.dealerIndex)) {
        game.drawTile(p);
      }
      
      // 检查胡
      if (game.canHu(p)) {
        print('   步骤$steps: ${p.name} 自摸胡牌!');
        game.playerWins(idx);
        break;
      }
      
      // 打牌
      if (p.handTiles.isNotEmpty) {
        final discard = p.handTiles.first;
        game.aiDiscard(idx);
        print('   步骤$steps: ${p.name} 打 ${discard.displayName}');
      }
    }
    
    if (game.gameEnded) {
      print('\n5. 游戏结束!');
    }
  }
  
  print('\n=== 测试完成 ===');
}
