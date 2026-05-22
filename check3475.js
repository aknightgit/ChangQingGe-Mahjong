const { MongoClient } = require("mongodb");
const URL = "mongodb://admin:%24%249myHome@192.168.3.241:27017/changqingge?authSource=admin";
(async () => {
  const client = new MongoClient(URL);
  await client.connect();
  const db = client.db("changqingge");
  const roomId = "3475";
  const game = await db.collection("mahjongGames").findOne({ roomId });
  if (game) {
    console.log("=== GAME FOUND ===");
    console.log("phase:", game.phase);
    console.log("roundIndex:", game.roundIndex);
    console.log("currentPlayer:", game.currentPlayer);
    console.log("currentPlayerIndex:", game.currentPlayerIndex);
    console.log("actionHistory length:", game.actionHistory?.length || 0);
    const last = game.actionHistory?.slice(-10) || [];
    last.forEach((a, i) => console.log("  last[" + i + "]:", JSON.stringify(a)));
    console.log("players:");
    game.players?.forEach(p => {
      console.log("  " + p.name + ": seat=" + p.seat + " status=" + p.status + " hand=" + p.hand?.concealedTiles?.length + " melds=" + (p.hand?.exposedMelds?.length||0) + " tiles:" + p.hand?.concealedTiles?.map(t=>t.suit+t.value).join(","));
      if (p.hand?.exposedMelds?.length) {
        p.hand.exposedMelds.forEach((m,i) => console.log("    meld" + i + ":", m.tiles?.map(t=>t.suit+t.value).join(",")));
      }
    });
    console.log("pendingActions:", JSON.stringify(game.pendingActions?.map(pa => ({playerId: pa.playerId, actions: pa.availableActions, tile: pa.tile?.suit+pa.tile?.value, chowOptions: pa.chowOptions}))));
    console.log("drawnThisTurn:", game.drawnThisTurn);
    console.log("discardPile last 5:", game.discardPile?.slice(-5).map(t => t.suit+t.value));
    console.log("wallSize:", game.wall?.length);
  } else {
    console.log("GAME NOT FOUND in mahjongGames");
    const active = await db.collection("activeRooms").findOne({ roomId });
    if (active) console.log("Active room:", JSON.stringify(active, null, 2));
    else console.log("Not in activeRooms either");
  }
  await client.close();
})().catch(e => console.log("Error:", e.message));
