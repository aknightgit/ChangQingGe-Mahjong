import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const c = await MongoClient.connect(uri);
const db = c.db(process.env.MONGODB_DB || 'changqingge');

const g = await db.collection('mahjongGames').findOne({ roomId: '1816' });
if (!g) { console.log('not found'); process.exit(0); }

const ak = g.players.find(p => p.name?.toUpperCase() === 'AK');
if (!ak) { console.log('AK not found'); process.exit(0); }

console.log('=== AK ===');
console.log('isTing:', ak.isTing);
console.log('status:', ak.status);
const hand = ak.hand?.concealedTiles || [];
console.log('\nhand tiles (' + hand.length + '):');
hand.forEach(t => {
  const wildMark = t.suit === 'wan' && t.value === '4' ? ' ★WILD★' : '';
  console.log('  ' + t.suit + '-' + t.value + ' (id:' + t.id + ')' + wildMark);
});
const melds = ak.hand?.exposedMelds || [];
console.log('\nexposed melds (' + melds.length + '):');
melds.forEach((m, i) => {
  console.log('  ' + m.type + ': ' + m.tiles?.map(t => t.suit + '-' + t.value).join(', '));
});

console.log('\ngame customScoringMode:', g.customScoringMode);
console.log('wildTileGroup:', JSON.stringify(g.wildTileGroup));

await c.close();
