const { MongoClient } = require("mongodb");
const URL = "mongodb://admin:%24%249myHome@192.168.3.241:27017/changqingge?authSource=admin";
(async () => {
  const client = new MongoClient(URL);
  await client.connect();
  const db = client.db("changqingge");

  // Search by roomNumber
  let found = await db.collection("mahjongGames").findOne({ roomNumber: "3475" });
  if (found) {
    console.log("Found by roomNumber in mahjongGames");
    printGame(found);
    await client.close();
    return;
  }
  
  // Search roomStates for roomNumber
  found = await db.collection("roomStates").findOne({ roomNumber: "3475" });
  if (found) {
    console.log("Found by roomNumber in roomStates");
    console.log(JSON.stringify(found, null, 2));
    await client.close();
    return;
  }
  
  // Try numeric query
  found = await db.collection("mahjongGames").findOne({ roomNumber: 3475 });
  if (found) {
    console.log("Found by roomNumber (numeric) in mahjongGames");
    printGame(found);
    await client.close();
    return;
  }
  
  // Check if roomNumber is nested
  const sample = await db.collection("mahjongGames").findOne({}, { sort: { createdAt: -1 } });
  console.log("Sample game fields:", Object.keys(sample).join(", "));
  console.log("Sample roomNumber field value:", JSON.stringify(sample.roomNumber));
  console.log("Sample gameId:", sample.gameId || sample._id);
  
  // Search all games and print room numbers
  const allGames = await db.collection("mahjongGames").find({}, { projection: { roomId: 1, roomNumber: 1, gameId: 1, phase: 1 } }).toArray();
  console.log("All games room info:");
  allGames.forEach(g => console.log("  roomId:", g.roomId, "roomNumber:", g.roomNumber, "phase:", g.phase));
  
  await client.close();
  
  function printGame(game) {
    console.log("phase:", game.phase);
    console.log("currentPlayer:", game.currentPlayer);
    console.log("currentPlayerIndex:", game.currentPlayerIndex);
    console.log("roundIndex:", game.roundIndex);
    const last5 = game.actionHistory?.slice(-5) || [];
    last5.forEach((a, i) => console.log("  last[" + i + "]:", JSON.stringify(a).slice(0,200)));
    if (game.pendingActions) console.log("pendingActions:", JSON.stringify(game.pendingActions.map(pa => ({pid: pa.playerId, acts: pa.availableActions, tile: pa.tile?.suit+pa.tile?.value}))));
    if (game.wall) console.log("wall:", game.wall.length);
    console.log("drawnThisTurn:", game.drawnThisTurn);
    if (game.players) game.players.forEach(p => console.log("  player:", p.name, "hand:", p.hand?.concealedTiles?.length, "status:", p.status));
    if (game.discardPile) console.log("lastDiscard:", game.discardPile.slice(-1).map(t => t.suit+t.value));
  }
})().catch(e => console.log("Error:", e.message));
