import 'dart:convert';
import 'dart:io';

class DatabaseService {
  static final DatabaseService _instance = DatabaseService._internal();
  factory DatabaseService() => _instance;
  DatabaseService._internal();

  final String _baseDir = 'ai_logs';

  // TODO: 连接到 Python REST API 或直接连接 MariaDB
  // 示例连接信息:
  // host: 192.168.3.241
  // port: 33061
  // user: openclaw
  // password: 0penC1aw
  // database: changqingge

  Future<void> _appendJsonLine(String fileName, Map<String, dynamic> data) async {
    try {
      final dir = Directory(_baseDir);
      if (!await dir.exists()) {
        await dir.create(recursive: true);
      }
      final file = File('${dir.path}/$fileName');
      await file.writeAsString('${jsonEncode(data)}\n', mode: FileMode.append);
    } catch (_) {
      // 忽略写入失败
    }
  }

  // 保存AI策略参数
  Future<void> saveAIStrategy(Map<String, dynamic> payload) async {
    await _appendJsonLine('ai_strategy.jsonl', payload);
  }

  // 保存AI决策日志
  Future<void> saveAIDecision(Map<String, dynamic> payload) async {
    await _appendJsonLine('ai_decisions.jsonl', payload);
  }

  // 保存AI对局统计
  Future<void> saveAIGameStats(Map<String, dynamic> payload) async {
    await _appendJsonLine('ai_game_stats.jsonl', payload);
  }

  // 保存AI首次胡牌明细
  Future<void> saveAIFirstWin(Map<String, dynamic> payload) async {
    await _appendJsonLine('ai_first_win.jsonl', payload);
  }

  // 保存游戏结果
  Future<void> saveGameResult({
    required String gameId,
    required List<Map<String, dynamic>> players,
    required int winnerIndex,
    required int fan,
    required int baseScore,
    required int multiplier,
  }) async {
    // TODO: 实现数据库保存
    // 可用方案:
    // 1. Python Flask/FastAPI 后端 + REST API
    // 2. Dart mysql2 (需要 native 库)
    // 3. HTTP + JSON 存储服务
    print('Saving game result: $gameId');
    for (var p in players) {
      print('  ${p['name']}: ${p['score']}');
    }
  }

  // 获取排行榜
  Future<List<Map<String, dynamic>>> getLeaderboard({int limit = 10}) async {
    // TODO: 实现数据库查询
    return [
      {'player_id': 0, 'player_name': '东家', 'total_games': 0, 'total_wins': 0, 'total_score': 0},
      {'player_id': 1, 'player_name': '南家', 'total_games': 0, 'total_wins': 0, 'total_score': 0},
      {'player_id': 2, 'player_name': '西家', 'total_games': 0, 'total_wins': 0, 'total_score': 0},
      {'player_id': 3, 'player_name': '北家', 'total_games': 0, 'total_wins': 0, 'total_score': 0},
    ];
  }
}
