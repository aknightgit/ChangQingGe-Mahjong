import { MongoClient } from 'mongodb';
const uri = process.env.MONGODB_URI;
const c = await MongoClient.connect(uri);
const db = c.db(process.env.MONGODB_DB || 'changqingge');
const cols = await db.listCollections().toArray();
console.log('collections:', cols.map(c=>c.name));
for (const col of cols) {
  try {
    const count = await db.collection(col.name).countDocuments({roomId: '2222'});
    if (count > 0) {
      console.log('FOUND in', col.name, 'count:', count);
      const doc = await db.collection(col.name).findOne({roomId: '2222'});
      const players = doc.players || [];
      for (let i = 0; i < players.length; i++) {
        const p = players[i];
        const hand = p.hand?.concealedTiles || [];
        const melds = p.hand?.exposedMelds || [];
        const meldTiles = melds.flatMap(m => m.tiles || []);
        console.log(`P${i} ${p.nickname||p.id}: hand=${hand.length} melds=${melds.length} meldTiles=${meldTiles.length} total=${hand.length+meldTiles.length}`);
      }
      console.log('wall:', doc.tileWall?.length);
      console.log('status:', doc.gameStatus, 'round:', doc.roundNumber);
      console.log('drawnThisTurn:', doc.drawnThisTurn);
      console.log('currentPlayerIdx:', doc.currentPlayerIndex);
      console.log('dealerIndex:', doc.dealerIndex);
    }
  } catch(e) { console.log('err scanning', col.name, e.message); }
}
await c.close();
