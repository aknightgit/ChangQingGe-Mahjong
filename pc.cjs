const { MongoClient } = require("mongodb");
const URL = "mongodb://admin:%24%249myHome@192.168.3.241:27017/changqingge?authSource=admin";
(async()=>{
  const c = new MongoClient(URL);
  await c.connect();
  const g = await c.db("changqingge").collection("mahjongGames").findOne({roomNumber:"3475"});
  
  // Full player object
  console.log("=== FULL PLAYER OBJECTS ===");
  g.players.forEach((p,i) => console.log("p["+i+"]:", JSON.stringify(p, null, 2)));
  
  // Check pendingAction timeouts
  console.log("\n=== TIMERS INFO ===");
  console.log("thinkFreezeUntil:", g.thinkFreezeUntil, "| now:", Date.now(), "| diff:", g.thinkFreezeUntil ? g.thinkFreezeUntil - Date.now() : "N/A");
  
  // Check game structure keys
  console.log("\n=== GAME KEYS ===");
  console.log(Object.keys(g).join(", "));
  
  await c.close();
})().catch(e=>console.log("Error:", e.message));
