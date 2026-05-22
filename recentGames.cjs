const { MongoClient } = require("mongodb");
const URL = "mongodb://admin:%24%249myHome@192.168.3.241:27017/changqingge?authSource=admin";
(async () => {
  const client = new MongoClient(URL);
  await client.connect();
  const db = client.db("changqingge");
  
  // Check recent games
  const recent = await db.collection("mahjongGames").find().sort({createdAt: -1}).limit(5).toArray();
  console.log("Recent games:");
  recent.forEach(g => console.log("  roomId:", g.roomId, "phase:", g.phase, "players:", g.players?.map(p=>p.name).join(",")));
  
  // Check server logs for errors
  console.log("\nDone.");
  await client.close();
})().catch(e => console.log("Error:", e.message));
