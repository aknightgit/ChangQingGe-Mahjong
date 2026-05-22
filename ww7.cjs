const { MongoClient } = require("mongodb");
const URL = "mongodb://admin:%24%249myHome@192.168.3.241:27017/changqingge?authSource=admin";
(async()=>{
  const c = new MongoClient(URL);
  await c.connect();
  const g = await c.db("changqingge").collection("mahjongGames").findOne({roomNumber:"3475"});
  
  // Map IDs to names
  const pidToName = {};
  g.players.forEach(p => { pidToName[p.id] = p.name; });
  console.log("ID mapping:");
  g.players.forEach(p => console.log("  id:", p.id.slice(0,12), "name:", p.name, "seat:", p.seat));
  
  // Last 5 actions with names
  const last5 = g.actionHistory.slice(-5);
  last5.forEach(a => {
    const name = pidToName[a.playerId] || "???";
    console.log("  " + name, a.type, a.tile ? a.tile.suit + a.tile.value : "");
  });
  
  // Current player index
  const currSeat = g.currentPlayerIndex;
  const currPlayer = g.players.find(p => p.seat === currSeat || p.seat_index === currSeat);
  console.log("currentPlayerIndex:", currSeat, "→", currPlayer?.name || "unknown");
  
  // Check who could claim the wan7
  console.log("\nAfter", pidToName[last5[last5.length-1].playerId], "discarded wan7:");
  console.log("pendingActions:", g.pendingActions.length);
  
  // Check AI-小猪's hand for CHOW on wan7
  const xiaozhu = g.players.find(p => p.name === "AI-小猪");
  const tiles = xiaozhu.hand.concealedTiles;
  const wans = tiles.filter(t => t.suit === "wan").map(t => t.value).sort((a,b)=>a-b);
  console.log("\nAI-小猪's wan tiles:", wans);
  console.log("Can CHOW 7万?", 
    (wans.includes(5) && wans.includes(6)) || 
    (wans.includes(6) && wans.includes(8)) || 
    (wans.includes(8) && wans.includes(9)));
  
  await c.close();
})().catch(e=>console.log("Error:", e.message));
