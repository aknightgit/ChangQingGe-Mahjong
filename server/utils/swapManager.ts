/**
 * swapManager.ts — 换位/观战替换（从 gameManager 拆分）
 * 管理换位置请求、观赛者替换AI请求
 */
import { randomUUID } from 'crypto';
import { GameState, GamePhase, Player, PlayerStatus } from '../types/game';

export interface SwapRequest {
  playerId: string;
  targetId: string;
  requestedAt: number;
}

export interface BotReplacementRequest {
  spectatorId: string;
  spectatorName: string;
  targetBotId: string;
  userId?: string;
  requestedAt: number;
}

export class SwapManager {
  constructor(
    private getGame: (gameId: string) => GameState | undefined,
    private getPlayerCumulativeScore: (gameId: string, playerId: string) => number,
    private isPlayerBotControlled: (player: Player) => boolean
  ) {}

  computeSwapChances(game: GameState, playerId: string): number {
    const threshold = game.liangShanThreshold ?? 4000;
    const cumulativeScore = this.getPlayerCumulativeScore(game.gameId, playerId);
    if (cumulativeScore >= 0) return 0;
    const absScore = Math.abs(cumulativeScore);
    return Math.min(Math.floor(absScore / threshold), 10);
  }

  requestSwapPosition(gameId: string, playerId: string, targetId: string): { success: boolean; message: string } {
    const game = this.getGame(gameId);
    if (!game) throw new Error('Game not found');
    if (game.phase !== GamePhase.PLAYING && game.phase !== GamePhase.ENDED) {
      throw new Error('Can only swap during or after a round');
    }

    const player = game.players.find(p => p.id === playerId);
    const target = game.players.find(p => p.id === targetId);
    if (!player || !target) throw new Error('Player not found');
    if (this.isPlayerBotControlled(player)) throw new Error('AI players cannot swap positions');

    const totalChances = this.computeSwapChances(game, playerId);
    const usedChances = ((game as any).swapRequests || []).filter((r: SwapRequest) => r.playerId === playerId).length;
    const remainingChances = totalChances - usedChances;

    if (remainingChances <= 0) {
      throw new Error('没有换位置机会了(积分未达标或已用完)');
    }

    if (!(game as any).swapRequests) (game as any).swapRequests = [];
    const existing = (game as any).swapRequests.find((r: SwapRequest) => r.playerId === playerId && r.targetId === targetId);
    if (existing) throw new Error('已提交过换位请求,等待生效中');

    (game as any).swapRequests.push({
      playerId,
      targetId,
      requestedAt: Date.now()
    });

    console.log(`[Swap] ${player.name} 请求与 ${target.name} 换位置 (剩余${remainingChances - 1}次)`);
    return { success: true, message: `${player.name} 下一局开始将与 ${target.name} 互换位置` };
  }

  applySwapRequests(game: GameState): void {
    const requests: SwapRequest[] = (game as any).swapRequests;
    if (!requests || requests.length === 0) return;

    for (const req of requests) {
      const p1Idx = game.players.findIndex(p => p.id === req.playerId);
      const p2Idx = game.players.findIndex(p => p.id === req.targetId);
      if (p1Idx < 0 || p2Idx < 0) continue;

      const p1 = game.players[p1Idx];
      const p2 = game.players[p2Idx];

      const tmpPos = p1.position;
      p1.position = p2.position;
      p2.position = tmpPos;

      game.players[p1Idx] = p2;
      game.players[p2Idx] = p1;
      console.log(`[Swap] ${p1.name} ↔ ${p2.name} 位置已互换`);
    }

    (game as any).swapRequests = [];
  }

  requestBotReplacement(gameId: string, spectatorId: string, targetBotId: string, playerName: string, userId?: string): void {
    const game = this.getGame(gameId);
    if (!game) throw new Error('Game not found');

    const spectator = game.players.find(p => p.id === spectatorId && p.status === PlayerStatus.SPECTATING);
    if (!spectator) throw new Error('Spectator not found');

    const bot = game.players.find(p => p.id === targetBotId && (p.name.startsWith('AI-') || p.name.startsWith('电脑')));
    if (!bot) throw new Error('Target bot not found');

    if (!(game as any).botReplacementQueue) (game as any).botReplacementQueue = [];
    (game as any).botReplacementQueue = ((game as any).botReplacementQueue as BotReplacementRequest[])
      .filter((r: BotReplacementRequest) => r.spectatorId !== spectatorId);
    (game as any).botReplacementQueue.push({
      spectatorId,
      spectatorName: playerName,
      targetBotId,
      userId,
      requestedAt: Date.now()
    });

    console.log(`[BotReplace] ${playerName}(观赛) 请求下局替换 ${bot.name}`);
  }

  applyBotReplacement(game: GameState): void {
    const queue: BotReplacementRequest[] = (game as any).botReplacementQueue;
    if (!queue || queue.length === 0) return;

    for (const req of queue) {
      const botIdx = game.players.findIndex(p => p.id === req.targetBotId);
      if (botIdx < 0) {
        console.warn(`[BotReplace] 目标AI ${req.targetBotId} 已不在房间,跳过`);
        continue;
      }

      const spectatorIdx = game.players.findIndex(p => p.id === req.spectatorId);
      if (spectatorIdx < 0) {
        console.warn(`[BotReplace] 观赛者 ${req.spectatorId} 已不在房间,跳过`);
        continue;
      }

      const bot = game.players[botIdx];
      const oldSpectator = game.players[spectatorIdx];

      const newPlayerId = randomUUID();
      const newPlayer: Player = {
        id: newPlayerId,
        userId: req.userId,
        name: req.spectatorName,
        position: bot.position,
        hand: { concealedTiles: [], exposedMelds: [], discardedTiles: [] },
        status: PlayerStatus.WAITING,
        isDealer: false,
        isTing: false,
        missingSuit: null,
        windScore: 0,
        rainScore: 0,
        wonFan: 0,
      };

      game.players[botIdx] = newPlayer;
      game.players.splice(spectatorIdx, 1);

      if ((game as any).spectatorViews) {
        delete (game as any).spectatorViews[req.spectatorId];
      }

      console.log(`[BotReplace] ${oldSpectator.name} → 替换 ${bot.name} 成功, 新玩家ID: ${newPlayerId}`);
    }

    (game as any).botReplacementQueue = [];
  }

  getSwapInfo(gameId: string, playerId: string): { totalChances: number; usedChances: number; remaining: number } {
    const game = this.getGame(gameId);
    if (!game) return { totalChances: 0, usedChances: 0, remaining: 0 };

    const totalChances = this.computeSwapChances(game, playerId);
    const usedChances = ((game as any).swapRequests || []).filter((r: SwapRequest) => r.playerId === playerId).length;
    return { totalChances, usedChances, remaining: Math.max(0, totalChances - usedChances) };
  }
}
