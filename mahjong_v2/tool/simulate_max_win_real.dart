import 'dart:convert';
import 'dart:io';
import 'package:mahjong_v2/game_logic/mahjong_game.dart';

void main() {
  final sim = MaxWinSimulator(games: 50, maxSteps: 1000);
  final best = sim.run();
  if (best == null) {
    print('No wins found.');
    return;
  }
  final out = File('ai_logs/max_win_simulation_real.json');
  out.createSync(recursive: true);
  out.writeAsStringSync(_pretty(best));
  print('Saved: ${out.path}');
  print(_pretty(best));
}

class MaxWinSimulator {
  final int games;
  final int maxSteps;

  MaxWinSimulator({required this.games, required this.maxSteps});

  Map<String, dynamic>? run() {
    Map<String, dynamic>? best;
    int bestDelta = -999999;
    int wins = 0;
    int draws = 0;
    int bloodBattleMultiWins = 0;
    final allWinsAll = <Map<String, dynamic>>[];

    final jsonl = File('ai_logs/train_results.jsonl');
    jsonl.writeAsStringSync('');

    for (int g = 1; g <= games; g++) {
      final res = _runOne(g);
      if (res == null) {
        draws++;
        continue;
      }
      wins++;
      final allWins = res['all_wins'] as List;
      if (allWins.length > 1) bloodBattleMultiWins++;
      allWinsAll.add({'game': g, 'wins': allWins});

      // 写入 JSONL
      for (int i = 0; i < allWins.length; i++) {
        final w = Map<String, dynamic>.from(allWins[i]);
        w['game_index'] = g;
        w['win_order'] = i + 1;
        w['is_blood_battle'] = allWins.length > 1;
        jsonl.writeAsStringSync(jsonEncode(w) + '\n', mode: FileMode.append);
      }

      final win = res['max_win'] as Map<String, dynamic>;
      final delta = win['winner_delta'] as int;
      if (delta > bestDelta) {
        bestDelta = delta;
        best = res;
        best['all_wins'] = allWins;
      }
    }
    if (best != null) {
      best['total_games'] = games;
      best['wins'] = wins;
      best['draws'] = draws;
      best['blood_battle_multi_wins'] = bloodBattleMultiWins;
      best['all_wins_all'] = allWinsAll;

      // 记录血战多局的具体游戏
      final bloodBattleGames = <Map<String, dynamic>>[];
      for (final g in allWinsAll) {
        final gw = g['wins'] as List;
        if (gw.length > 1) {
          bloodBattleGames.add({'game_index': g['game'], 'wins': gw});
        }
      }
      best['blood_battle_games'] = bloodBattleGames;

    }
    return best;
  }

  Map<String, dynamic>? _runOne(int gameIndex) {
    final game = MahjongGame();
    game.simulationMode = true;
    game.useMonteCarloAI = true;
    game.monteCarloBudget = const Duration(milliseconds: 2);
    game.monteCarloTrials = 30;
    game.aiAggression = 5.0; // 极致贪婪的AI
    game.aiRespondDelay = Duration.zero;
    game.aiDiscardDelay = Duration.zero;
    game.responseWindowDuration = Duration.zero;

    game.rollDice();
    game.deal();

    final dealerIndex = game.dealerIndex;
    bool dealerFirst = true;
    int turns = 0;
    int steps = 0;

    final winRecords = <Map<String, dynamic>>[];

    final alreadyWon = <int>{}; // 防止同一玩家重复胡牌

    while (!game.gameEnded && steps < maxSteps) {
      steps++;

      // 有弃牌等待响应 → 处理响应（从下家开始，轮流检查）
      if (game.pendingTile != null) {
        // 检查是否有玩家可以胡
        final huPlayers = _collectHuPlayers(game);
        if (huPlayers.isNotEmpty) {
          final shooter = game.currentPlayerIndex;
          for (final w in huPlayers) {
            if (alreadyWon.contains(w)) continue;
            final rec = _buildWinRecord(game, w, isSelfDraw: false, fromIndex: shooter);
            winRecords.add(rec);
            alreadyWon.add(w);
          }
          game.resolveMultiHuFromPlayer();
          if (game.gameEnded) break;
          continue;
        }

        // 检查下家是否可以碰/杠/吃
        final responder = _findResponder(game);
        if (responder != null) {
          if (responder == 0) {
            _manualRespond(game, responder);
          } else {
            game.aiPlay(responder);
          }
          continue;
        }

        // 3家都不响应 → 无人响应，打牌者下家摸牌
        game.pendingTile = null;
        game.nextPlayer();
        // 如果新玩家已被淘汰，继续找下一个
        while (game.eliminatedPlayers.contains(game.currentPlayerIndex)) {
          game.nextPlayer();
        }
        continue;
      }

      // 当前玩家摸牌打牌
      final idx = game.currentPlayerIndex;
      if (game.eliminatedPlayers.contains(idx)) {
        game.nextPlayer();
        continue;
      }
      final p = game.players[idx];

      // 庄家首轮不摸牌，直接打
      if (!(dealerFirst && idx == dealerIndex)) {
        game.drawTile(p);
      }
      dealerFirst = false;

      if (game.canHu(p)) {
        // 完整记录胡牌状态（包括花牌）
        final handBefore = p.handTiles.map((t) => '${_tileName(t)}').toList();
        final flowerBefore = p.flowerTiles.map((t) => '${_tileName(t)}').toList();
        final meldsBefore = <String>[];
        final meldDetails = <String>[];
        for (final meld in p.melds) {
          final tiles = meld.map((t) => '${_tileName(t)}').toList();
          meldsBefore.addAll(tiles);
          meldDetails.add(tiles.join(' '));
        }
        // 完整牌面 = 手牌 + 花牌 + 副露
        final fullHandList = <String>[];
        fullHandList.addAll(handBefore);
        fullHandList.addAll(flowerBefore);
        fullHandList.addAll(meldsBefore);
        // DEBUG：打印详细信息
        print('>>> Game ${gameIndex} Hu: ${p.name} hand=${handBefore.length} flower=${flowerBefore.length} melds=${meldDetails.length} total=${fullHandList.length}');
        // playerWins 会自动处理血战到底：只剩一家时结算，否则继续
        game.playerWins(idx);
        // 防止重复记录
        if (alreadyWon.contains(idx)) continue;
        alreadyWon.add(idx);
        // 胡牌后，手牌已清空，但副露还在；合并得到完整牌面
        final fullHand = <String>[];
        fullHand.addAll(handBefore);
        fullHand.addAll(flowerBefore);
        fullHand.addAll(meldsBefore);
        final rec = _buildWinRecord(game, idx, isSelfDraw: true, handTilesOverride: fullHand);
        winRecords.add(rec);
        // 检查游戏是否真正结束（只剩一家或流局）
        if (game.gameEnded) break;
        // 血战继续：跳到下一个活跃玩家
        if (game.currentPlayerIndex == idx || game.eliminatedPlayers.contains(game.currentPlayerIndex)) {
          game.currentPlayerIndex = _nextActive(game, idx);
        }
        continue;
      }

      // 打牌
      game.aiDiscard(idx);
    }

    if (winRecords.isEmpty) return null;

    winRecords.sort((a, b) => (b['winner_delta'] as int).compareTo(a['winner_delta'] as int));
    return {
      'game_index': gameIndex,
      'steps': steps,
      'max_win': winRecords.first,
      'all_wins': winRecords,
    };
  }

  Map<String, dynamic> _buildWinRecord(MahjongGame game, int winnerIndex,
      {required bool isSelfDraw, int? fromIndex, List<String>? handTilesOverride}) {
    if (isSelfDraw) {
      game.lastWinFromDiscard = false;
      game.lastPlayedTile = null;
      game.lastDiscarderIndex = null;
    } else {
      game.lastWinFromDiscard = true;
      game.lastPlayedTile = game.pendingTile;
      game.lastDiscarderIndex = fromIndex;
    }

    final summary = game.buildWinSummary(winnerIndex, isSelfDraw: isSelfDraw);
    final settlement = game.previewSettlement(winnerIndex);
    final delta = settlement.deltas[winnerIndex] ?? 0;

    // 检查门清：没有吃/碰/明杠
    bool hasExposed = false;
    final player = game.players[winnerIndex];
    for (int i = 0; i < player.melds.length; i++) {
      final hidden = (i < player.meldHidden.length) ? player.meldHidden[i] : false;
      if (!hidden) { hasExposed = true; break; }
    }
    final isMenqing = !hasExposed;

    // 检查三口关系（包）
    final baoMultipliers = <int, int>{};
    for (int i = 0; i < 4; i++) {
      if (i == winnerIndex) continue;
      final mult = game.getBaoMultiplier(winnerIndex, i);
      if (mult > 0) baoMultipliers[i] = mult;
    }
    final baoRelationsStr = <String, int>{
      for (final e in baoMultipliers.entries) e.key.toString(): e.value,
    };
    final deltasStr = <String, int>{
      for (final e in settlement.deltas.entries) e.key.toString(): e.value,
    };

    // 手牌详情 - 使用override或当前手牌
    List<String> handTiles;
    if (handTilesOverride != null) {
      handTiles = handTilesOverride;
    } else {
      handTiles = player.handTiles.map((t) => '${_tileName(t)}').toList();
      // 点炮时加上放炮的牌
      if (!isSelfDraw && game.pendingTile != null) {
        handTiles.add('${_tileName(game.pendingTile!)}');
      }
    }
    // 副露详情
    final meldDetails = <String>[];
    final meldTiles = <String>[];
    for (int i = 0; i < player.melds.length; i++) {
      final meld = player.melds[i];
      final hidden = i < player.meldHidden.length && player.meldHidden[i];
      final tiles = meld.map((t) => '${_tileName(t)}').toList();
      meldTiles.addAll(tiles);
      meldDetails.add('${hidden ? "[暗]" : ""}${tiles.join(' ')}');
    }

    // 全部牌面：如果传入了handTilesOverride(已含副露)，就直接用它；否则合并手牌+副露
    List<String> allTiles;
    if (handTilesOverride != null) {
      allTiles = handTilesOverride; // override已经包含了手牌+副露
    } else {
      allTiles = <String>[];
      allTiles.addAll(handTiles);
      allTiles.addAll(meldTiles);
    }

    // 百搭信息
    final wildTileName = game.wildTile != null ? _tileName(game.wildTile!) : null;

    return {
      'winner_index': winnerIndex,
      'winner_name': game.players[winnerIndex].name,
      'win_type': isSelfDraw ? '自摸' : '点炮',
      'from_index': fromIndex,
      'from_name': fromIndex != null ? game.players[fromIndex].name : null,
      'hu_type': summary['hu_type'],
      'reason': summary['reason'],
      'base_points': summary['base_points'],
      'round_multiplier': summary['round_multiplier'],
      'extra_multiplier': summary['extra_multiplier'],
      'total_points': summary['total_points'],
      'melds': summary['melds'],
      'meld_details': meldDetails,
      'hand_tiles': handTiles,
      'all_tiles': allTiles,
      'meld_sources': summary['meld_sources'],
      'details': settlement.details,
      'deltas': deltasStr,
      'wild_tile': wildTileName,
      'winner_delta': delta,
      'is_menqing': isMenqing,
      'bao_relations': baoRelationsStr,
      'dice_values': game.diceValues,
    };
  }

  String _tileName(Tile t) {
    if (t.type == TileType.wind) {
      switch (t.number) {
        case 1: return '东';
        case 2: return '南';
        case 3: return '西';
        case 4: return '北';
      }
    }
    if (t.type == TileType.dragon) {
      switch (t.number) {
        case 1: return '中';
        case 2: return '发';
        case 3: return '白';
      }
    }
    if (t.isFlower) return '花${t.number}';
    if (t.isWild) return '百搭';

    String suit = '';
    switch (t.suit) {
      case TileSuit.wan: suit = '万'; break;
      case TileSuit.tong: suit = '筒'; break;
      case TileSuit.tiao: suit = '条'; break;
      default: suit = '';
    }
    return '${t.number}$suit';
  }

  int _nextActive(MahjongGame game, int from) {
    int idx = from;
    for (int i = 0; i < 4; i++) {
      idx = (idx + 3) % 4;
      if (!game.eliminatedPlayers.contains(idx)) return idx;
    }
    return from;
  }

  List<int> _collectHuPlayers(MahjongGame game) {
    final res = <int>[];
    for (int offset = 1; offset <= 3; offset++) {
      final idx = (game.currentPlayerIndex + offset) % 4;
      if (game.eliminatedPlayers.contains(idx)) continue;
      if (game.canHu(game.players[idx])) res.add(idx);
    }
    return res;
  }

  int? _findResponder(MahjongGame game) {
    if (game.pendingTile == null) return null;
    for (int offset = 1; offset <= 3; offset++) {
      final idx = (game.currentPlayerIndex + offset) % 4;
      if (game.eliminatedPlayers.contains(idx)) continue;
      final p = game.players[idx];
      if (game.getKongableTiles(p).isNotEmpty) return idx;
      if (game.canPong(p)) return idx;
      if (idx == (game.currentPlayerIndex + 1) % 4 && game.canChow(p)) return idx;
    }
    return null;
  }

  void _manualRespond(MahjongGame game, int playerIndex) {
    final p = game.players[playerIndex];
    final tiles = game.getKongableTiles(p);
    if (tiles.isNotEmpty) {
      game.doKong(p, tiles.first, isHidden: game.pendingTile == null);
      game.drawTile(p, isKongDraw: true);
      game.aiDiscard(playerIndex);
      return;
    }
    if (game.canPong(p)) {
      game.doPong(p);
      game.drawTile(p);
      game.aiDiscard(playerIndex);
      return;
    }
    if (playerIndex == (game.currentPlayerIndex + 1) % 4 && game.canChow(p)) {
      game.doChow(p, null);
      game.drawTile(p);
      game.aiDiscard(playerIndex);
    }
  }
}

String _pretty(Map<String, dynamic> best) {
  final buf = StringBuffer();
  buf.writeln('=== 1000局模拟统计 ===');
  buf.writeln('总局数: ${best['total_games']}');
  buf.writeln('分胜负: ${best['wins']}');
  buf.writeln('流局: ${best['draws']}');
  buf.writeln('血战多局（>1次胡牌）: ${best['blood_battle_multi_wins']}');
  
  // 输出血战多局详情
  if (best['blood_battle_games'] != null) {
    buf.writeln('');
    buf.writeln('--- 血战多局详情 ---');
    final bbgames = best['blood_battle_games'] as List;
    for (final bg in bbgames) {
      buf.writeln('Game #${bg['game_index']}:');
      final wins = bg['wins'] as List;
      for (final w in wins) {
        final menqing = w['is_menqing'] == true ? '门清' : '';
        final bao = (w['bao_relations'] as Map?)?.isNotEmpty == true ? '包${w['bao_relations']}' : '';
        buf.writeln('  - ${w['winner_name']}(${w['winner_index']}) ${w['win_type']} ${w['hu_type']} $menqing $bao');
        buf.writeln('    手牌: ${(w['hand_tiles'] as List?)?.join(' ') ?? '-'}');
        if (w['from_name'] != null) {
          buf.writeln('    放冲: ${w['from_name']}(${w['from_index']})');
        }
      }
    }
  }
  buf.writeln('');
  
  // 每家胡牌牌型统计
  final huTypes = <String, int>{};
  final allWinsAll = best['all_wins_all'] as List? ?? [];
  for (final g in allWinsAll) {
    final wins = g['wins'] as List;
    for (final w in wins) {
      final ht = w['hu_type'] ?? '未知';
      huTypes[ht] = (huTypes[ht] ?? 0) + 1;
    }
  }
  buf.writeln('--- 胡牌牌型分布 ---');
  huTypes.forEach((k, v) => buf.writeln('  $k: $v'));
  buf.writeln('');
  
  final maxWin = best['max_win'] as Map<String, dynamic>;
  buf.writeln('Max win game: #${best['game_index']} steps=${best['steps']}');
  buf.writeln('Winner: ${maxWin['winner_name']}(${maxWin['winner_index']}) delta=${maxWin['winner_delta']}');
  buf.writeln('Win type: ${maxWin['win_type']}  From: ${maxWin['from_name'] ?? '-'}');
  buf.writeln('Hu type: ${maxWin['hu_type']}  Reason: ${maxWin['reason']}');
  buf.writeln('Base: ${maxWin['base_points']}  Round×${maxWin['round_multiplier']}  Extra×${maxWin['extra_multiplier']}  Total=${maxWin['total_points']}');
  buf.writeln('Deltas: ${maxWin['deltas']}');
  
  // 结算明细
  final details = (maxWin['details'] as List?) ?? [];
  if (details.isNotEmpty) {
    buf.writeln('Details: ${details.join(' | ')}');
  }
  
  // 百搭信息
  final wildTile = maxWin['wild_tile'];
  if (wildTile != null) {
    buf.writeln('百搭: $wildTile');
  }
  
  final allWins = best['all_wins'] as List;
  final maxWinAllWins = best['all_wins'] as List? ?? [];
  buf.writeln('All wins in game: ${maxWinAllWins.length}');
  for (final w in maxWinAllWins) {
    final menqing = w['is_menqing'] == true ? '门清' : '';
    final bao = (w['bao_relations'] as Map?)?.isNotEmpty == true ? '包${w['bao_relations']}' : '';
    final dice = w['dice_values'] ?? [];
    buf.writeln(' - ${w['winner_name']}(${w['winner_index']}) ${w['win_type']} ${w['hu_type']} ${menqing} ${bao}');
    buf.writeln('   Total=${w['total_points']} Delta=${w['winner_delta']} Dice=$dice');
    // 完整14张牌面 = 手牌 + 副露（副露的牌已不在手牌中）
    final handTiles = (w['hand_tiles'] as List?) ?? [];
    final meldDetails = (w['meld_details'] as List?) ?? [];
    buf.writeln('   手牌(${handTiles.length}张): ${handTiles.join(' ')}');
    buf.writeln('   副露(${meldDetails.length}组): ${meldDetails.join(', ')}');
    // 显示完整牌面（手牌+副露）
    final allTilesFull = (w['all_tiles'] as List?) ?? handTiles;
    buf.writeln('   完整牌面: ${allTilesFull.join(' ')}');
    // 三口关系
    if ((w['bao_relations'] as Map?)?.isNotEmpty == true) {
      buf.writeln('   三口关系: ${w['bao_relations']}');
    }
    if (w['from_name'] != null) {
      buf.writeln('   放冲: ${w['from_name']}(${w['from_index']})');
    }
  }
  return buf.toString();
}
