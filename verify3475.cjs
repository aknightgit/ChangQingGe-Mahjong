const { MongoClient } = require("mongodb");
const URL = "mongodb://admin:%24%249myHome@192.168.3.241:27017/changqingge?authSource=admin";
(async()=>{
  const c = new MongoClient(URL);
  await c.connect();
  const g = await c.db("changqingge").collection("mahjongGames").findOne({roomNumber:"3475"});
  console.log("=== RAW DB PLAYERS ===");
  g.players.forEach((p,i) => {
    console.log("["+i+"] id:", JSON.stringify(p.id), "userId:", JSON.stringify(p.userId), "name:", p.name);
  });
  
  // Simulate storedToPlayer
  console.log("\n=== AFTER storedToPlayer (= in-memory)===");
  g.players.forEach((p,i) => {
    const restoredId = p.userId || null; // storedToPlayer does: id: player.userId
    console.log("["+i+"] id:", JSON.stringify(restoredId), "userId:", JSON.stringify(p.userId), "name:", p.name);
  });
  
  // Now check if game was recovered properly by examining game state
  // The game is in memory on the server, not DB
  console.log("\n=== IS GAME IN PLAYING PHASE? ===");
  console.log("phase:", g.phase);
  console.log("currentPlayerIndex:", g.currentPlayerIndex);
  console.log("pendingActions length:", g.pendingActions?.length || 0);
  
  // The key: after ensureGameLoaded, the freeze timer is NOT recreated
  // So the game is loaded but no timer drives it forward
  console.log("\n=== STUCK ANALYSIS ===");
  console.log("Game loaded with correct IDs:", g.players.every(p => p.userId));
  const restoredPlayer = {id: g.players[0].userId || null, userId: g.players[0].userId};
  console.log("checkPendingActions skip check:", 
    "null===null=" + (null===null), // old bug
    "restored===restored=" + (restoredPlayer.id === g.players[0].userId)); // correct after storedToPlayer
  
  await c.close();
})().catch(e=>console.log("Error:", e.message));
