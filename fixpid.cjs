const { MongoClient } = require("mongodb");
const URL = "mongodb://admin:%24%249myHome@192.168.3.241:27017/changqingge?authSource=admin";
(async () => {
  const c = new MongoClient(URL);
  await c.connect();
  const db = c.db("changqingge");
  
  // Fix room 3475 - set proper player IDs from userId
  const game = await db.collection("mahjongGames").findOne({ roomNumber: "3475" });
  if (!game) { console.log("Game not found"); return; }
  
  let fixed = false;
  game.players.forEach(p => {
    if (!p.id && p.userId) {
      p.id = p.userId;
      console.log("Fixed player:", p.name, "id:", p.id.slice(0,12));
      fixed = true;
    }
  });
  
  if (fixed) {
    await db.collection("mahjongGames").updateOne(
      { roomNumber: "3475" },
      { $set: { players: game.players } }
    );
    console.log("Updated game in DB");
  } else {
    console.log("No fixes needed");
  }
  
  // Also check all active games for same issue
  const games = await db.collection("mahjongGames").find({ phase: "playing" }).toArray();
  console.log("\nAll playing games:");
  let fixedCount = 0;
  for (const g of games) {
    let gFixed = false;
    g.players.forEach(p => {
      if (!p.id && p.userId) { p.id = p.userId; gFixed = true; }
    });
    if (gFixed) {
      await db.collection("mahjongGames").updateOne(
        { _id: g._id },
        { $set: { players: g.players } }
      );
      console.log("  Fixed:", g.roomNumber || g.roomId, "players:", g.players.map(p=>p.name).join(","));
      fixedCount++;
    } else {
      console.log("  OK:", g.roomNumber || g.roomId, "ids:", g.players.map(p => p.id ? "✓" : "✗").join(","));
    }
  }
  console.log("\nTotal fixed:", fixedCount);
  
  await c.close();
})().catch(e => console.log("Error:", e.message));
