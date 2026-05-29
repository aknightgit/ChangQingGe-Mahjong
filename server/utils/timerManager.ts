/**
 * timerManager.ts — 定时器状态管理（从 gameManager 拆分）
 * 管理所有定时器 Map/Set 和清理工具，调度逻辑仍在 gameManager
 */
import { GameState, GamePhase, ActionType, PendingAction, Player } from '../types/game';

export class TimerManager {
  // Pending action 定时器
  pendingActionTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  // 原子锁：防止并发消费 pending actions
  actionResolutionLocks: Set<string> = new Set();
  // 冻结定时器
  freezeTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  // Bot 定时器
  botTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  // 自动托管定时器
  autoTakeoverTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  autoTakeoverWarnings: Map<string, ReturnType<typeof setTimeout>> = new Map();
  consecutiveTimeouts: Map<string, number> = new Map();

  /** 将定时器标记为 unref（不阻止进程退出） */
  detachTimer<T extends ReturnType<typeof setTimeout>>(timer: T): T {
    (timer as any)?.unref?.();
    return timer;
  }

  /** 清除 pending action 定时器 */
  clearPendingActionTimer(gameId: string): void {
    const timer = this.pendingActionTimers.get(gameId);
    if (timer) {
      clearTimeout(timer);
      this.pendingActionTimers.delete(gameId);
    }
  }

  /** 清除冻结定时器 */
  clearFreezeTimers(gameId: string): void {
    const timer = this.freezeTimers.get(gameId);
    if (timer) {
      clearTimeout(timer);
      this.freezeTimers.delete(gameId);
    }
  }

  /** 清除 bot 定时器 */
  clearBotTimer(gameId: string): void {
    const timer = this.botTimers.get(gameId);
    if (timer) {
      clearTimeout(timer);
      this.botTimers.delete(gameId);
    }
  }

  /** 清除自动托管定时器 */
  clearAutoTakeover(gameId: string, playerId: string): void {
    const key = `${gameId}:${playerId}`;
    const timer = this.autoTakeoverTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.autoTakeoverTimers.delete(key);
    }
    const warn = this.autoTakeoverWarnings.get(key);
    if (warn) {
      clearTimeout(warn);
      this.autoTakeoverWarnings.delete(key);
    }
  }

  /** 清除游戏所有定时器 */
  clearAllGameTimers(gameId: string): void {
    this.clearPendingActionTimer(gameId);
    this.clearFreezeTimers(gameId);
    this.clearBotTimer(gameId);
    // 清除该游戏所有自动托管定时器
    for (const key of this.autoTakeoverTimers.keys()) {
      if (key.startsWith(gameId + ':')) {
        const playerId = key.split(':')[1];
        this.clearAutoTakeover(gameId, playerId);
      }
    }
    this.actionResolutionLocks.delete(gameId);
  }

  // ==================== 超时计算工具 ====================

  getBotDrawFreezeMs(game: GameState): number {
    return game.thinkFreezeActive ? (game.thinkFreezeDuration ?? 1500) : 800;
  }

  getBotDiscardDelayMs(game: GameState): number {
    return game.botDelay ?? 800;
  }

  getAutoTakeoverTimeoutMs(): number {
    return 15000; // 15秒自动托管
  }

  getPendingActionExpiresAt(game: GameState, actions: ActionType[]): number {
    return Date.now() + this.getHumanClaimDecisionTimeoutMs(game, undefined as any, actions);
  }

  getHumanClaimDecisionTimeoutMs(game: GameState, player: Player, actions: ActionType[]): number {
    // 有胡/碰/杠时给更多时间
    const hasPriority = actions.some(a =>
      a === ActionType.HU || a === ActionType.PENG || a === ActionType.KONG ||
      a === ActionType.CONCEALED_KONG || a === ActionType.EXTENDED_KONG
    );
    return hasPriority ? (game.claimDecisionTimeout ?? 5000) : (game.normalDecisionTimeout ?? 3000);
  }

  getPendingActionWaitMs(gameId: string): number {
    // 简单实现：返回最小等待时间
    return 1000;
  }

  getHesitationWindow(game: GameState): number {
    return game.hesitationWindow ?? 5000;
  }

  /** 刷新 pending action 过期时间 */
  refreshPendingActionExpirations(
    game: GameState,
    now = Date.now(),
    predicate?: (pendingAction: PendingAction) => boolean
  ): void {
    const nextExpiresAt = now + this.getHesitationWindow(game);
    for (const pendingAction of game.pendingActions) {
      if (predicate && !predicate(pendingAction)) continue;
      pendingAction.expiresAt = Math.max(
        typeof pendingAction.expiresAt === 'number' ? pendingAction.expiresAt : 0,
        nextExpiresAt
      );
    }
  }
}
