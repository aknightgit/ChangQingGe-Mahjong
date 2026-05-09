import { getCollection } from '../utils/mongo';
import type { GameEndReason, GameState, RoundStat } from '../types/game';

const COLLECTION_NAME = 'mahjongTrainingRounds';

type TrainingRoundSnapshot = {
  capturedAt: Date;
  label: 'round_start' | 'round_end' | 'round_start_missing';
  handNumber: number;
  turnRoundNumber: number;
  phase: string;
  customScoringMode?: string | null;
  wildTileGroup?: string[];
  dice?: [number, number];
  roundMultiplier?: number;
  inheritMultiplier?: number;
  inheritedGlobalMultiplier?: number;
  currentPlayerIndex: number;
  dealerIndex: number;
  wallCount: number;
  wall: unknown[];
  discardPile: unknown[];
  pendingActions: unknown[];
  actionHistory: unknown[];
  players: unknown[];
};

type TrainingRoundRecord = {
  gameId: string;
  roomId: string;
  roomNumber?: string;
  roundNumber: number;
  turnRoundNumber: number;
  recordedAt: Date;
  endReason: GameEndReason | string | null;
  dice?: [number, number];
  roundMultiplier?: number;
  inheritMultiplier?: number;
  inheritedGlobalMultiplier?: number;
  finalScores?: Record<string, number>;
  initialSnapshot: TrainingRoundSnapshot;
  finalSnapshot: TrainingRoundSnapshot;
  roundStat?: RoundStat;
  actionStats: {
    total: number;
    byType: Record<string, number>;
    byPlayer: Record<string, Record<string, number>>;
  };
};

const clonePlain = <T>(value: T): T => JSON.parse(JSON.stringify(value ?? null));

export class TrainingRecordService {
  static captureRoundStart(game: GameState): void {
    (game as any).trainingRoundStartSnapshot = this.captureSnapshot(game, 'round_start');
  }

  static captureSnapshot(
    game: GameState,
    label: TrainingRoundSnapshot['label']
  ): TrainingRoundSnapshot {
    const completedHands = game.roundStats?.length || 0;
    const handNumber = label === 'round_start'
      ? completedHands + 1
      : Math.max(1, completedHands || 1);

    return {
      capturedAt: new Date(),
      label,
      handNumber,
      turnRoundNumber: game.roundNumber,
      phase: game.phase,
      customScoringMode: game.customScoringMode ?? null,
      wildTileGroup: game.wildTileGroup ? clonePlain(game.wildTileGroup) : undefined,
      dice: game.dice ? clonePlain(game.dice) : undefined,
      roundMultiplier: game.roundMultiplier,
      inheritMultiplier: game.inheritMultiplier,
      inheritedGlobalMultiplier: game.inheritedGlobalMultiplier,
      currentPlayerIndex: game.currentPlayerIndex,
      dealerIndex: game.dealerIndex,
      wallCount: game.wall.length,
      wall: clonePlain(game.wall),
      discardPile: clonePlain(game.discardPile),
      pendingActions: clonePlain(game.pendingActions),
      actionHistory: clonePlain(game.actionHistory),
      players: clonePlain(game.players.map(player => ({
        id: player.id,
        userId: player.userId,
        name: player.name,
        position: player.position,
        status: player.status,
        isDealer: player.isDealer,
        isTing: player.isTing,
        missingSuit: player.missingSuit,
        score: player.score,
        windScore: player.windScore,
        rainScore: player.rainScore,
        wonFan: player.wonFan,
        winHandType: player.winHandType,
        winOrder: player.winOrder,
        winRound: player.winRound,
        winTimestamp: player.winTimestamp,
        isSelfDrawn: player.isSelfDrawn,
        discarderId: player.discarderId,
        winningScoreBreakdown: player.winningScoreBreakdown,
        hand: player.hand
      })))
    };
  }

  static async recordRound(
    game: GameState,
    endReason: GameEndReason | string | null,
    finalScores: Record<string, number>,
    roundStat?: RoundStat
  ): Promise<void> {
    const actions = game.actionHistory || [];
    const byType: Record<string, number> = {};
    const byPlayer: Record<string, Record<string, number>> = {};

    for (const action of actions) {
      byType[action.type] = (byType[action.type] || 0) + 1;
      if (!byPlayer[action.playerId]) byPlayer[action.playerId] = {};
      byPlayer[action.playerId][action.type] = (byPlayer[action.playerId][action.type] || 0) + 1;
    }

    const initialSnapshot =
      (game as any).trainingRoundStartSnapshot ||
      this.captureSnapshot(game, 'round_start_missing');

    const handNumber = initialSnapshot.handNumber || Math.max(1, game.roundStats?.length || game.roundNumber);

    const record: TrainingRoundRecord = {
      gameId: game.gameId,
      roomId: game.roomNumber || game.gameId,
      roomNumber: game.roomNumber,
      roundNumber: handNumber,
      turnRoundNumber: game.roundNumber,
      recordedAt: new Date(),
      endReason,
      dice: game.dice,
      roundMultiplier: game.roundMultiplier,
      inheritMultiplier: game.inheritMultiplier,
      inheritedGlobalMultiplier: game.inheritedGlobalMultiplier,
      finalScores: clonePlain(finalScores),
      initialSnapshot,
      finalSnapshot: this.captureSnapshot(game, 'round_end'),
      roundStat: roundStat ? clonePlain(roundStat) : undefined,
      actionStats: {
        total: actions.length,
        byType,
        byPlayer
      }
    };

    const collection = await getCollection<TrainingRoundRecord>(COLLECTION_NAME);
    await collection.updateOne(
      { gameId: game.gameId, roundNumber: handNumber },
      { $set: record },
      { upsert: true }
    );
  }
}
