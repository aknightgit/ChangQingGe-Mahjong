/**
 * RoomGameBridge — 房间与 GameManager 的桥梁
 * 纯搬运自 gameManager.ts，不改逻辑
 * 处理：房间号生成/查询、空房间结束、房间加入广播
 */

import type { GameState, Player } from '../types/game';
import { GamePhase, PlayerStatus } from '../types/game';
import { GameEndReason } from '../types/game';

export class RoomGameBridge {
  /**
   * 生成4位随机房间号，确保不重复（跳过已存在的活跃游戏）
   */
  static generateRoomNumber(activeGames: Map<string, GameState>): string {
    const maxAttempts = 100;
    for (let i = 0; i < maxAttempts; i++) {
      const num = String(Math.floor(1000 + Math.random() * 9000));
      let exists = false;
      for (const game of activeGames.values()) {
        if (game.roomNumber === num && game.phase !== GamePhase.ENDED) {
          exists = true;
          break;
        }
      }
      if (!exists) return num;
    }
    return String(Date.now()).slice(-4);
  }

  /**
   * 通过4位房间号查找游戏
   */
  static async findGameByRoomNumber(
    hydrate: () => Promise<void>,
    activeGames: Map<string, GameState>,
    roomNumber: string
  ): Promise<string | null> {
    await hydrate();
    for (const [gameId, game] of activeGames) {
      if (game.roomNumber === roomNumber && game.phase !== GamePhase.ENDED) {
        return gameId;
      }
    }
    return null;
  }

  /**
   * 广播玩家加入房间消息
   */
  static broadcastRoomJoin(
    broadcastFn: (gameId: string, event: string, data: any) => void,
    game: GameState,
    player: Player
  ): void {
    broadcastFn(game.gameId, 'broadcastMessage', {
      id: Date.now() + Math.floor(Math.random() * 1000),
      text: `👤 ${player.name}进入到了房间`,
      actionKind: 'roomJoin',
      type: 'info',
      timestamp: Date.now(),
      timeLabel: RoomGameBridge.formatBeijingTime()
    });
  }

  private static formatBeijingTime(): string {
    const now = new Date();
    return now.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
  }

  /**
   * 空房间时结束游戏
   */
  static async endGameForEmptyRoom(
    hydrate: () => Promise<void>,
    ensureLoaded: (gameId: string) => Promise<GameState | undefined>,
    persistGame: (game: GameState) => Promise<void>,
    endRound: (game: GameState, reason: GameEndReason) => void,
    broadcastGameState: (gameId: string) => void,
    gameId: string,
    reason: GameEndReason = GameEndReason.EMPTY_ROOM
  ): Promise<void> {
    await hydrate();
    const game = await ensureLoaded(gameId);
    if (!game) return;

    if (game.phase === GamePhase.ENDED) {
      game.endReason = reason;
      await persistGame(game);
      return;
    }

    for (const player of game.players) {
      if (player.status !== PlayerStatus.WON) {
        player.status = PlayerStatus.LOST;
      }
      player.isTing = false;
    }

    game.pendingActions = [];
    endRound(game, reason);

    await persistGame(game);
    broadcastGameState(gameId);
  }
}
