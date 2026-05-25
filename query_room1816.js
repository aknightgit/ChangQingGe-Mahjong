const { MongoClient } = require('mongodb');
(async () => {
  const c = await MongoClient.connect('mongodb://admin:' + encodeURIComponent('$$9myHome') + '@192.168.3.241:27017/?authSource=admin');
  const db = c.db('changqingge');
  const room = await db.collection('gamerooms').findOne({ roomId: 1816 });
  if (!room) { console.log('ROOM NOT FOUND'); process.exit(1); }
  console.log(JSON.stringify(room, null, 2));
  await c.close();
})();
