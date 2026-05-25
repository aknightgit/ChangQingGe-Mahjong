import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
if (!uri) { console.log('MONGODB_URI not set'); process.exit(1); }

const c = await MongoClient.connect(uri);
const db = c.db(process.env.MONGODB_DB || 'changqingge');

// Try both collections
for (const col of ['mahjongGames', 'games']) {
  try {
    const g = await db.collection(col).findOne({ $or: [{ roomNumber: 1816 }, { roomId: '1816' }, { roomNumber: '1816' }] });
    if (g) {
      console.log('Found in collection:', col);
      console.log('phase:', g.phase || g.gameStatus);
      console.log('customScoringMode:', g.customScoringMode);
      console.log('wildTileGroup:', JSON.stringify(g.wildTileGroup));
      
      const ak = g.players.find(p => p.name === 'ak' || p.name?.includes('ak'));
      if (ak) {
        console.log('\n=== ak ===');
        console.log('isTing:', ak.isTing);
        console.log('status:', ak.status);
        const hand = ak.hand?.concealedTiles || [];
        console.log('hand tiles (' + hand.length + '):', hand.map(t => t.suit + '-' + t.value + (t.isWild ? '(wild)' : '')).join(', '));
        const melds = ak.hand?.exposedMelds || [];
        console.log('exposed melds:', melds.length);
        melds.forEach((m, i) => {
          console.log('  meld' + i + ':', m.type, m.tiles?.map(t => t.suit + '-' + t.value).join(', '));
        });
      } else {
        console.log('ak not found. players:', g.players.map(p => p.name || p.nickname || p.id));
      }
      break;
    }
  } catch (e) {
    // Collection might not exist
  }
}

await c.close();
