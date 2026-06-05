import { Player, Tile, TileSuit } from '../types/game'

/**
 * 检查玩家是否处于可出牌的手牌数目状态
 * 手牌数必须是 3n+2 结构（2, 5, 8, 11, 14）
 */
export function isConcealedDiscardState(player: Player): boolean {
  const concealedCount = player.hand.concealedTiles.length
  const exposedMeldCount = player.hand.exposedMelds.length
  // 正常状态: 2/5/8/11/14张(已摸牌未出牌)
  // 补花后: 可能15/16张(花牌补入后手牌数异常), 只要>=14张也可出牌
  // 吃/碰后: 12张暗牌+1个副露 → 12%3=0, 但有副露所以是合法出牌状态
  if (concealedCount >= 2 && exposedMeldCount > 0 && concealedCount % 3 === 0) return true
  // 加杠后补牌可能让手牌变成 %3===1（如3张→加杠→补牌→4张），也应允许出牌
  if (concealedCount >= 2 && exposedMeldCount > 0 && concealedCount % 3 === 1) return true
  return concealedCount >= 2 && (concealedCount % 3 === 2 || concealedCount >= 14)
}

/**
 * 将 Tile 牌面转可读中文标签
 */
export function tileLabel(tile: Tile | undefined): string {
  if (!tile) return '未知牌'
  if (tile.suit === TileSuit.FLOWER) {
    const names = ['春', '夏', '秋', '冬', '梅', '兰', '竹', '菊']
    return names[tile.value - 1] || `花${tile.value}`
  }
  if (tile.suit === TileSuit.WIND) {
    const names = ['东', '南', '西', '北']
    return names[tile.value - 1] || `风${tile.value}`
  }
  if (tile.suit === TileSuit.DRAGON) {
    const names = ['中', '发', '白']
    return names[tile.value - 1] || `箭${tile.value}`
  }
  const suitLabel =
    tile.suit === TileSuit.CHARACTERS ? '万' :
    tile.suit === TileSuit.DOTS ? '筒' :
    tile.suit === TileSuit.BAMBOOS ? '条' :
    ''
  const digit = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'][tile.value] || String(tile.value)
  return `${digit}${suitLabel}`
}
