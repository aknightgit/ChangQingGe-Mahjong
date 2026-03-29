import 'dart:io';
import 'package:mahjong_v2/game_logic/mahjong_game.dart';

// 辅助函数
String tileName(Tile t) => t.displayName;

void main() {
  print('=== 麻将完整流程测试 ===\n');
  
  final game = MahjongGame();
  game.simulationMode = true;
  game.useMonteCarloAI = false; // 关闭AI，用手动模拟
  game.monteCarloBudget = Duration.zero;
  game.monteCarloTrials = 0;
  game.aiAggression = 1.0;
  game.aiRespondDelay = Duration.zero;
  game.aiDiscardDelay = Duration.zero;
  game.responseWindowDuration = Duration.zero;
  
  // 1. 掷骰子
  print('【第1步】掷骰子');
  game.rollDice();
  print('  骰子: ${game.diceValues}, 庄家: ${game.players[game.dealerIndex].name}');
  
  // 2. 发牌
  print('\n【第2步】发牌');
  game.deal();
  for (int i = 0; i < 4; i++) {
    final p = game.players[i];
    print('  ${p.name}: ${p.handTiles.length}张 ${p.handTiles.map(tileName).join(", ")}');
  }
  
  // 3. 检查五毒散(造反)
  print('\n【第3步】检查五毒散');
  for (int i = 0; i < 4; i++) {
    if (game.canRebel(i)) {
      print('  ${game.players[i].name}: 可造反!');
      game.decideRebel(i, true);
      print('  → 选择了造反! 游戏流局');
      break;
    }
  }
  
  if (game.gameEnded) {
    print('\n=== 测试完成(流局) ===');
    return;
  }
  
  // 4. 模拟完整游戏
  print('\n【第4步】开始游戏(最多30步)');
  int step = 0;
  while (!game.gameEnded && step < 30) {
    step++;
    final idx = game.currentPlayerIndex;
    final p = game.players[idx];
    
    // 检查是否有待响应的牌
    if (game.pendingTile != null) {
      print('  步骤$step: ${p.name} 需要响应 ${game.pendingTile!.displayName}');
      
      // 检查能否胡
      if (game.canHu(p)) {
        print('    → 可以胡! 但暂时跳过(测试)');
      }
      // 检查能否碰
      if (game.canPong(p)) {
        print('    → 可以碰!');
      }
      // 检查能否杠
      if (game.canKong(p)) {
        print('    → 可以杠!');
      }
      // 检查能否吃
      if (game.canChow(p)) {
        print('    → 可以吃!');
      }
      
      // 无人响应，过
      game.playerPass();
    }
    
    // 轮到自己摸牌打牌
    print('  步骤$step: ${p.name} 回合');
    
    // 庄家首轮不摸牌
    if (!(step == 1 && idx == game.dealerIndex)) {
      final drawn = game.drawTile(p);
      if (drawn != null) {
        print('    摸牌: ${drawn.displayName}');
      }
    }
    
    // 检查自摸
    if (game.canHu(p)) {
      print('    → 自摸胡牌! 游戏结束');
      game.playerWins(idx);
      break;
    }
    
    // 打牌
    if (p.handTiles.isNotEmpty) {
      final discard = p.handTiles.first;
      game.aiDiscard(idx);
      print('    打牌: ${discard.displayName}');
    }
  }
  
  // 5. 检查游戏状态
  print('\n【第5步】游戏状态');
  print('  gameEnded: ${game.gameEnded}');
  print('  lastWinnerIndex: ${game.lastWinnerIndex}');
  if (game.lastWinnerIndex != null) {
    final winner = game.players[game.lastWinnerIndex!];
    print('  赢家: ${winner.name}');
    print('  获胜手牌: ${winner.handTiles.map(tileName).join(", ")}');
    print('  副露: ${winner.melds}');
  }
  
  print('\n=== 测试完成 ===');
}
