const { MongoClient } = require('mongodb');
async function main() {
  try {
    const client = new MongoClient('mongodb://admin:426969myHome@192.168.3.241:27017/changqingge?authSource=admin');
    await client.connect();
    const db = client.db('changqingge');
    const r = await db.collection('roomStates').findOne({roomNumber:'8123'},{projection:{_id:1,gameId:1}});
    console.log('roomState:', JSON.stringify(r));
    await client.close();
  } catch(e) {
    console.error('ERR:', e.message);
  }
}
main();
