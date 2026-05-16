import { GamePhase, PlayerStatus, type GameState, type Player, type SpectatorViewState } from '../types/game';
import { isBotPlayer } from '../services/botService';

const TEMP_DEBUG_SPECTATE_BOT_NAMES = new Set(['AI-AK', 'AI-小猪']);

function getSpectatorScope(game: GameState): number {
  const completedHands = Array.isArray(game.roundStats) ? game.roundStats.length : 0;
  return game.phase === GamePhase.ENDED ? completedHands : completedHands + 1;
}

export function getSpectatorView(game: GameState, viewerId: string): SpectatorViewState {
  if (!game.spectatorViews) game.spectatorViews = {};
  const existing = game.spectatorViews[viewerId];
  const scope = getSpectatorScope(game);
  if (existing && existing.roundNumber === scope) {
    return existing;
  }

  const view: SpectatorViewState = {
    viewingPlayerId: null,
    approvedHumanPlayerId: null,
    pendingHumanPlayerId: null,
    roundNumber: scope,
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
      request.roundNumber === getSpectatorScope(game) &&
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

export function canUseDebugBotSpectator(viewer: Player | null | undefined, target: Player | null | undefined): boolean {
  return !!viewer &&
    !!target &&
    viewer.id !== target.id &&
    isBotPlayer(target) &&
    TEMP_DEBUG_SPECTATE_BOT_NAMES.has(target.name);
}

export function canRevealSpectatorTarget(game: GameState, viewerId: string, target: Player): boolean {
  const viewer = game.players.find((entry) => entry.id === viewerId);
  const view = game.spectatorViews?.[viewerId];
  if (!view || view.roundNumber !== getSpectatorScope(game) || view.viewingPlayerId !== target.id) {
    return false;
  }

  if (viewer?.status === PlayerStatus.WON && isBotPlayer(target)) return true;
  if (viewer?.status === PlayerStatus.SPECTATING && isBotPlayer(target)) return true;
  if (canUseDebugBotSpectator(viewer, target)) return true;
  if (!viewer) return false;
  if (viewer.status === PlayerStatus.SPECTATING) {
    return view.approvedHumanPlayerId === target.id;
  }
  if (viewer.status !== PlayerStatus.WON) return false;
  if (isBotPlayer(target)) return true;
  return view.approvedHumanPlayerId === target.id;
}
