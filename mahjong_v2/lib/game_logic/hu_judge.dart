import 'mahjong_game.dart';

// 胡牌检测与点数计算
class HuJudge {
  // 检测是否胡牌
  static bool checkHu(List<Tile> tiles, {Tile? lastTile}) {
    var hand = List<Tile>.from(tiles);
    if (lastTile != null) {
      hand.add(lastTile);
    }
    
    // 必须是2,5,8,11,14张
    if (hand.length % 3 != 2) return false;
    if (hand.length < 2 || hand.length > 14) return false;
    
    // 排序
    hand.sort((a, b) {
      final suitComp = a.suit.index.compareTo(b.suit.index);
      if (suitComp != 0) return suitComp;
      return a.number.compareTo(b.number);
    });
    
    // 检测有对子
    final pairs = _findPairs(hand);
    for (final pair in pairs) {
      final remain = _removeTiles(hand, [pair]);
      if (_checkMelds(remain)) return true;
    }
    
    return false;
  }
  
  // 找所有可能的對子
  static List<Tile> _findPairs(List<Tile> hand) {
    final counts = <int, int>{};
    for (final t in hand) {
      counts[t.id] = (counts[t.id] ?? 0) + 1;
    }
    return hand.where((t) => counts[t.id]! >= 2).toList();
  }
  
  // 移除指定牌
  static List<Tile> _removeTiles(List<Tile> hand, List<Tile> toRemove) {
    final result = List<Tile>.from(hand);
    for (final t in toRemove) {
      final idx = result.indexWhere((x) => x.id == t.id);
      if (idx >= 0) result.removeAt(idx);
    }
    return result;
  }
  
  // 检测是否能组成顺子或刻子
  static bool _checkMelds(List<Tile> tiles) {
    if (tiles.isEmpty) return true;
    
    final first = tiles.first;
    
    // 尝试组成刻子 (AAA)
    final trips = tiles.where((t) => t.type == first.type && t.number == first.number).toList();
    if (trips.length >= 3) {
      final remain = _removeTiles(tiles, trips.sublist(0, 3));
      if (_checkMelds(remain)) return true;
    }
    
    // 尝试组成顺子 (ABC) - 只能对数牌
    if (first.suit != TileSuit.hua && first.type != TileType.wind && first.type != TileType.dragon) {
      for (int n = 1; n <= 7; n++) {
        final a = Tile(id: -1, type: first.type, number: n, suit: first.suit);
        final b = Tile(id: -1, type: first.type, number: n + 1, suit: first.suit);
        final c = Tile(id: -1, type: first.type, number: n + 2, suit: first.suit);
        
        if (_hasTiles(tiles, [b, c])) {
          final remain = _removeTiles(tiles, [a, b, c]);
          if (_checkMelds(remain)) return true;
        }
      }
    }
    
    return false;
  }
  
  static bool _hasTiles(List<Tile> tiles, List<Tile> need) {
    final remaining = List<Tile>.from(tiles);
    for (final n in need) {
      final idx = remaining.indexWhere((t) => t.type == n.type && t.number == n.number);
      if (idx < 0) return false;
      remaining.removeAt(idx);
    }
    return true;
  }
}
