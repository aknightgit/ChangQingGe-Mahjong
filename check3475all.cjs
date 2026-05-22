const { MongoClient } = require("mongodb");
const URL = "mongodb://admin:%24%249myHome@192.168.3.241:27017/changqingge?authSource=admin";
(async () => {
  const client = new MongoClient(URL);
  await client.connect();
  const db = client.db("changqingge");
  
  const cols = await db.listCollections().toArray();
  console.log("Collections:", cols.map(c => c.name).join(", "));
  
  for (const colInfo of cols) {
    const name = colInfo.name;
    const count = await db.collection(name).countDocuments({ roomId: "3475" });
    if (count > 0) {
      console.log("\n=== FOUND in", name, "===");
      const doc = await db.collection(name).findOne({ roomId: "3475" });
      console.log("phase:", doc.phase);
      console.log("currentPlayer:", doc.currentPlayer);
      console.log("currentPlayerIndex:", doc.currentPlayerIndex);
      console.log("roundIndex:", doc.roundIndex);
      console.log("actionHistory:", doc.actionHistory?.length);
      const last5 = doc.actionHistory?.slice(-5) || [];
      last5.forEach((a, i) => console.log("  last[" + i + "]:", JSON.stringify(a).slice(0,200)));
      if (doc.pendingActions) console.log("pendingActions:", JSON.stringify(doc.pendingActions.map(pa => ({pid: pa.playerId, acts: pa.availableActions, tile: pa.tile?.suit+pa.tile?.value}))));
      if (doc.wall) console.log("wall:", doc.wall.length);
      console.log("drawnThisTurn:", doc.drawnThisTurn);
      if (doc.players) doc.players.forEach(p => console.log("  player:", p.name, "hand:", p.hand?.concealedTiles?.length, "status:", p.status));
      if (doc.discardPile) console.log("lastDiscard:", doc.discardPile.slice(-1).map(t => t.suit+t.value));
    }
  }
  
  await client.close();
})().catch(e => console.log("Error:", e.message));
