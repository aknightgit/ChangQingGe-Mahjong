import { MongoClient } from 'mongodb';
const uri = process.env.MONGODB_URI;
const c = await MongoClient.connect(uri);
const db = c.db(process.env.MONGODB_DB || 'changqingge');
const g = await db.collection('mahjongGames').findOne({roomId: '2222'});
if (!g) { console.log('NO GAME 2222'); process.exit(0); }
for (let i = 0; i < g.players.length; i++) {
  const p = g.players[i];
  const hand = p.hand?.concealedTiles || [];
  const melds = p.hand?.exposedMelds || [];
  const meldTiles = melds.flatMap(m => m.tiles || []);
  console.log(`P${i} ${p.nickname||p.id}: hand=${hand.length} melds=${melds.length} meldTiles=${meldTiles.length} total=${hand.length+meldTiles.length}`);
}
console.log('wall:', g.tileWall?.length);
console.log('status:', g.gameStatus, 'round:', g.roundNumber);
console.log('drawnThisTurn:', g.drawnThisTurn);
console.log('currentPlayerIdx:', g.currentPlayerIndex);
console.log('dealerIndex:', g.dealerIndex);
await c.close();
