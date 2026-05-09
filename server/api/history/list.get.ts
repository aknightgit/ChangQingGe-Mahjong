import { MatchHistoryService } from '../../services/matchHistoryService';

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const userId = typeof query.userId === 'string' ? query.userId : undefined;
  const playerId = typeof query.playerId === 'string' ? query.playerId : undefined;
  const limitParam = typeof query.limit === 'string' ? parseInt(query.limit, 10) : undefined;
  const limit = Number.isFinite(limitParam) && limitParam! > 0 ? limitParam : 20;

  const histories = await MatchHistoryService.listMatches({ userId, playerId, limit });

  return {
    success: true,
    data: histories
  };
});
