import type { Player, Tile } from '~/types/game'

export function collectClaimedDiscardIds(players: Player[] | undefined | null): Set<string> {
  const ids = new Set<string>()

  for (const player of players || []) {
    for (const meld of player.hand?.exposedMelds || []) {
      if (meld?.sourceTileId) ids.add(meld.sourceTileId)
    }
  }

  return ids
}

export function filterVisibleDiscards(
  discardedTiles: Tile[] | undefined | null,
  claimedDiscardIds: Set<string>
): Tile[] {
  return (discardedTiles || []).filter(tile => !claimedDiscardIds.has(tile.id))
}
