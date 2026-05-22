const { MongoClient } = require("mongodb");
const URL = "mongodb://admin:%24%249myHome@192.168.3.241:27017/changqingge?authSource=admin";
(async()=>{
  const c = new MongoClient(URL);
  await c.connect();
  const g = await c.db("changqingge").collection("mahjongGames").findOne({roomNumber:"3475"});
  console.log("players:", JSON.stringify(g.players?.map(p => ({n:p.name, s:p.seat_index||p.seat, st:p.status, hl: p.hand?.concealedTiles?.length, h: p.hand?.concealedTiles?.map(t=>t.suit+t.value).join(",")}))));
  console.log("currentPlayerIndex:", g.currentPlayerIndex);
  console.log("currentPlayer:", g.currentPlayer);
  console.log("pendingActions:", JSON.stringify(g.pendingActions));
  console.log("drawnThisTurn:", g.drawnThisTurn);
  const last = g.actionHistory?.[g.actionHistory.length-1];
  if (last) {
    const pid = last.playerId?.slice(0,8);
    const pname = g.players?.find(p => p.id === last.playerId)?.name || pid;
    console.log("lastAction:", pname, last.type, last.tile?.suit+last.tile?.value);
  }
  const discards = g.discardPile?.slice(-3) || [];
  console.log("lastDiscards:", discards.map(t => t.suit+t.value).join(", "));
  console.log("wallSize:", g.wall?.length);
  console.log("actionHistoryLen:", g.actionHistory?.length);
  await c.close();
})().catch(e=>console.log("Error:", e.message));
