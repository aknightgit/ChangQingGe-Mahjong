import { PlayerStatus, type GameState, type Player, type SpectatorViewState } from '../types/game';
import { isBotPlayer } from '../services/botService';

export function getSpectatorView(game: GameState, viewerId: string): SpectatorViewState {
  if (!game.spectatorViews) game.spectatorViews = {};
  const existing = game.spectatorViews[viewerId];
  if (existing && existing.roundNumber === game.roundNumber) {
    return existing;
  }

  const view: SpectatorViewState = {
    viewingPlayerId: null,
    approvedHumanPlayerId: null,
    pendingHumanPlayerId: null,
    roundNumber: game.roundNumber,
    updatedAt: Date.now()
  };
  game.spectatorViews[viewerId] = view;
  return view;
}

export function clearPendingSpectatorRequests(game: GameState, requesterId: string, targetId?: string) {
  const now = Date.now();
  for (const request of game.spectatorApprovalRequests || []) {
    if (
      request.status === 'pending' &&
      request.requesterId === requesterId &&
      request.roundNumber === game.roundNumber &&
      (!targetId || request.targetId === targetId)
    ) {
      request.status = 'cancelled';
      request.resolvedAt = now;
    }
  }
}

export function isSpectatorTargetWatchable(target: Player): boolean {
  return target.status === PlayerStatus.PLAYING || target.status === PlayerStatus.WON;
}

export function canRevealSpectatorTarget(game: GameState, viewerId: string, target: Player): boolean {
  const viewer = game.players.find((entry) => entry.id === viewerId);
  if (!viewer || viewer.status !== PlayerStatus.WON) return false;

  const view = game.spectatorViews?.[viewerId];
  if (!view || view.roundNumber !== game.roundNumber || view.viewingPlayerId !== target.id) {
    return false;
  }

  if (isBotPlayer(target)) return true;
  return view.approvedHumanPlayerId === target.id;
}
