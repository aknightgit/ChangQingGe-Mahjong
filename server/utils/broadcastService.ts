/**
 * broadcastService.ts — 广播/消息服务（从 gameManager 拆分）
 * 负责所有 WebSocket 广播和消息去重
 */
import { GameState, Player } from '../types/game';
import { formatBeijingTime } from './beijingTime';

export interface WsManager {
  broadcast(gameId: string, event: string, data: any): void;
}

export interface BroadcastMessage {
  id: number;
  text: string;
  actionKind?: string;
  type: 'info' | 'warn' | 'special';
  timestamp: number;
  timeLabel: string;
}

export class BroadcastService {
  private wsManager: WsManager | null = null;
  private recentBroadcasts: Map<string, BroadcastMessage[]> = new Map();

  setWsManager(manager: WsManager): void {
    this.wsManager = manager;
  }

  getWsManager(): WsManager | null {
    return this.wsManager;
  }

  /** 获取最近广播消息（HTTP API 兜底用） */
  getRecentBroadcasts(gameId: string): BroadcastMessage[] {
    return this.recentBroadcasts.get(gameId) || [];
  }

  /** 游戏广播缓存 */
  setBroadcasts(gameId: string, list: BroadcastMessage[]): void {
    this.recentBroadcasts.set(gameId, list);
  }

  /** 清除游戏广播缓存 */
  clearBroadcasts(gameId: string): void {
    this.recentBroadcasts.delete(gameId);
  }

  /** 通用广播消息（带去重） */
  broadcastQuickMessage(
    gameId: string,
    text: string,
    type: 'info' | 'warn' | 'special' = 'info',
    actionKind?: string
  ): void {
    const existing = this.recentBroadcasts.get(gameId);
    if (existing && existing.length > 0) {
      const now = Date.now();
      for (let i = existing.length - 1; i >= Math.max(0, existing.length - 10); i--) {
        const msg = existing[i];
        if (msg.text === text && (now - msg.timestamp) < 3000) {
          return;
        }
      }
    }
    const msg: BroadcastMessage = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      text,
      actionKind,
      type,
      timestamp: Date.now(),
      timeLabel: formatBeijingTime()
    };
    if (this.wsManager) {
      this.wsManager.broadcast(gameId, 'broadcastMessage', msg);
    }
    let list = this.recentBroadcasts.get(gameId);
    if (!list) {
      list = [];
      this.recentBroadcasts.set(gameId, list);
    }
    list.push({ id: msg.id, text: msg.text, type: msg.type, timestamp: msg.timestamp, timeLabel: msg.timeLabel });
    if (list.length > 20) list.splice(0, list.length - 20);
  }

  /** 补花广播 */
  broadcastFlowerReplacement(game: GameState, player: Player): void {
    if (!this.wsManager) return;
    this.broadcastQuickMessage(game.gameId, `🌸 ${player.name}补花`, 'special', 'flowerReplace');
  }

  /** 杠后补牌广播 */
  broadcastKongSupplement(game: GameState, player: Player, kind: 'ming' | 'an' | 'jia'): void {
    if (!this.wsManager) return;
    const label = kind === 'an' ? '暗杠' : kind === 'jia' ? '补杠' : '明杠';
    this.wsManager.broadcast(game.gameId, 'broadcastMessage', {
      id: Date.now() + Math.floor(Math.random() * 1000),
      text: `🀄 ${player.name}${label}后补牌`,
      actionKind: 'kongSupplement',
      type: 'info',
      timestamp: Date.now(),
      timeLabel: formatBeijingTime()
    });
  }

  /** 加入房间广播（已移至 socket.ts，此方法保留兼容） */
  broadcastRoomJoin(_game: GameState, _player: Player): void {
    // 已移至 socket.ts room:join 处理
  }

  /** 连包领先者广播 */
  broadcastLeadingBrother(gameId: string, playerId: string, playerName: string, totalAmount: number, amountPerPlayer: number): void {
    if (!this.wsManager) return;
    this.wsManager.broadcast(gameId, 'leadingBrother', {
      playerId,
      playerName,
      totalAmount,
      amountPerPlayer
    });
  }
}
