const { MongoClient } = require('mongodb');
const url = 'mongodb://admin:$$9myHome@192.168.3.241:27017/changqingge?authSource=admin';
(async () => {
  const client = new MongoClient(url);
  await client.connect();
  const db = client.db('changqingge');
  const col = db.collection('mahjongGames');
  const game = await col.findOne({ roomNumber: '2288' });
  if (!game) { console.log('NOT FOUND'); await client.close(); return; }
  console.log('phase=', game.phase);
  console.log('roundNumber=', game.roundNumber);
  console.log('roundStats.length=', (game.roundStats||[]).length);
  console.log('currentPlayerIndex=', game.currentPlayerIndex);
  console.log('winnersCount=', game.winnersCount);
  console.log('drawnThisTurn=', game.drawnThisTurn);
  console.log('players=', (game.players||[]).map(p => ({ name: p.name, status: p.status, score: p.score })));
  console.log('pendingActions=', JSON.stringify(game.pendingActions?.map(pa => ({ playerId: pa.playerId?.substring(0,8), actions: pa.availableActions }))));
  console.log('endedAt=', game.endedAt);
  await client.close();
})();
