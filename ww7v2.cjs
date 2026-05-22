const { MongoClient } = require("mongodb");
const URL = "mongodb://admin:%24%249myHome@192.168.3.241:27017/changqingge?authSource=admin";
(async()=>{
  const c = new MongoClient(URL);
  await c.connect();
  const g = await c.db("changqingge").collection("mahjongGames").findOne({roomNumber:"3475"});
  console.log("ID mapping:");
  g.players.forEach((p,i) => console.log("  ["+i+"] id:", (p.id||"null").slice(0,12), "name:", p.name||"null", "seat:", p.seat));
  const pidToName = {};
  g.players.forEach(p => { if(p.id) pidToName[p.id] = p.name; });
  console.log("\nLast 5 actions:");
  const last5 = g.actionHistory.slice(-5);
  last5.forEach(a => {
    const name = pidToName[a.playerId] || (a.playerId||"???").slice(0,8);
    console.log("  " + name, a.type, a.tile ? a.tile.suit + a.tile.value : "");
  });
  const lastPlayer = pidToName[last5[last5.length-1].playerId] || "???";
  console.log("\nLast discard by:", lastPlayer, "- wan7");
  console.log("pendingActions:", g.pendingActions.length);
  console.log("currentPlayerIndex:", g.currentPlayerIndex);
  
  const xiaozhu = g.players.find(p => p.name === "AI-小猪");
  if(xiaozhu){
    const tiles = xiaozhu.hand.concealedTiles;
    const wans = tiles.filter(t => t.suit === "wan").map(t => t.value).sort((a,b)=>a-b);
    console.log("AI-小猪 wan:", wans);
    console.log("Can chow 7wan?", ((wans.includes(5)&&wans.includes(6))||(wans.includes(6)&&wans.includes(8))||(wans.includes(8)&&wans.includes(9))));
    console.log("Full hand:", tiles.map(t=>t.suit+t.value).join(","));
  }
  await c.close();
})().catch(e=>console.log("Error:", e.message));
