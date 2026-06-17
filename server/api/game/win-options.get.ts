import { gameManager } from '../../utils/gameManager';
import { requireGamePlayerAccess } from '../../utils/session';
import { getTileDisplayName } from '../../utils/tiles';

function buildDisplayLabel(option: any, winningTileName: string): string {
  const summary = option?.summary || {};
  const baseFan = Number(summary.baseFan ?? 0);
  const roundMultiplier = Number(summary.roundMultiplier ?? 1);
  const globalMultiplier = Number(summary.globalMultiplier ?? 1);
  const settlementMultiplier = Number(summary.settlementMultiplier ?? 1);
  const finalPoints = Number(summary.finalPoints ?? option?.score ?? 0);
  const details = Array.isArray(option?.details) ? option.details as string[] : [];
  const label = String(option?.label || '')
    .replace(/·自摸|·捉冲|\(无百搭×2\)/g, '')
    .trim();
  const method = option?.type === 'self_draw'
    ? `自摸${winningTileName}`
    : `捉冲${winningTileName}`;

  const factors: string[] = [`基础番${baseFan}`];
  if (details.some(detail => detail.includes('门清'))) {
    factors.push('门清2');
  }
  if (details.some(detail => detail.includes('无百搭'))) {
    factors.push('无百搭*2');
  }
  factors.push(`全局倍数${globalMultiplier}`);
  factors.push(`结算系数${settlementMultiplier}`);
  return `[${label}：${method}（${factors.join('*')}）=${finalPoints}]`;
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const { gameId, playerId } = query as { gameId?: string; playerId?: string };

  if (!gameId || !playerId) {
    throw createError({ statusCode: 400, message: 'Game ID and player ID are required' });
  }

  try {
    const game = await gameManager.getGame(gameId);
    if (!game) throw createError({ statusCode: 404, message: 'Game not found' });

    await requireGamePlayerAccess(event, game, playerId);

    const pendingAction = game.pendingActions.find((entry) => entry.playerId === playerId);
    const currentPlayer = game.players.find((entry) => entry.id === playerId);
    // 如果pending中找不到牌(碰/杠后pending被清),从actionHistory最后一条找弃牌
    const lastDiscardAction = [...(game.actionHistory || [])].reverse().find(
      a => a.type === 'discard' || a.type === 'peng' || a.type === 'kong'
    );
    const winningTile = pendingAction?.tile || (currentPlayer as any)?.lastDrawnTile || lastDiscardAction?.tile || null;
    const winningTileName = winningTile ? getTileDisplayName(winningTile) : '';
    const filteredWinOptions = await gameManager.getWinOptionsForPlayer(gameId, playerId);
    const decoratedWinOptions = filteredWinOptions.map((option: any) => ({
      ...option,
      internalLabel: option.label,
      label: buildDisplayLabel(option, winningTileName)
    }));

    console.log(`[DEBUG-winPanel] gameId=${gameId} playerId=${playerId} pendingAction=${pendingAction ? `{tile=${pendingAction.tile?.suit}-${pendingAction.tile?.value}, actions=${pendingAction.availableActions}}` : 'null'} context=${!!pendingAction?.tile ? 'discard' : 'self_draw'} handTiles=${currentPlayer?.hand?.concealedTiles?.length} exposed=${currentPlayer?.hand?.exposedMelds?.length} options=${filteredWinOptions.length} result=${decoratedWinOptions.length}`);

    return { success: true, winOptions: decoratedWinOptions };
  } catch (error: any) {
    throw createError({ statusCode: 400, message: error.message || 'Failed to get win options' });
  }
});
