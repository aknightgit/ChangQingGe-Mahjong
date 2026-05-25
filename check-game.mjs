import { MongoClient } from 'mongodb';
const uri = 'mongodb://admin:***@192.168.3.241:27017/changqingge?authSource=admin';
const c = await MongoClient.connect(uri);
const db = c.db('changqingge');
const g = await db.collection('mahjongGames').findOne({roomId: '2222'});
if (!g) { console.log('NOT_FOUND'); process.exit(0); }
console.log('status:', g.gameStatus);
console.log('currentPlayer:', g.currentPlayerIndex);
g.players.forEach((p,i) => console.log('p'+i+':', JSON.stringify({id:p.id, uid:p.userId, name:p.nickname||p.id, discon:p.disconnected, handLen:p.hand?.length, melds:p.melds?.length})));
console.log('wall:', g.tileWall?.length);
console.log('drawnThisTurn:', g.drawnThisTurn);
console.log('pending:', JSON.stringify(g.pendingAction));
console.log('last3actions:', JSON.stringify(g.actionHistory?.slice(-3)?.map(a=>({t:a.type, pi:a.playerIndex, tiles:a.tiles}))));
await c.close();
