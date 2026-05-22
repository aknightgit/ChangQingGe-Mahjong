const { MongoClient } = require("mongodb");
const URL = "mongodb://admin:%24%249myHome@192.168.3.241:27017/changqingge?authSource=admin";
(async () => {
  const client = new MongoClient(URL);
  await client.connect();
  const db = client.db("changqingge");
  const game = await db.collection("mahjongGames").findOne({ roomNumber: "3475" });
  
  console.log("=== FULL GAME STATE ===");
  console.log("gameId:", game.gameId);
  console.log("phase:", game.phase);
  console.log("currentPlayerIndex:", game.currentPlayerIndex);
  console.log("dealer:", game.dealer);
  console.log("roundIndex:", game.roundIndex);
  console.log("drawnThisTurn:", game.drawnThisTurn);
  
  // Map player IDs to names
  const nameById = {};
  game.players?.forEach(p => { nameById[p.id] = p.name; });
  console.log("\n=== PLAYERS ===");
  game.players?.forEach(p => {
    console.log("  id:", p.id.slice(0,8), "name:", p.name, "seat:", p.seat, "status:", p.status, 
      "hand:", p.hand?.concealedTiles?.length, 
      "handTiles:", p.hand?.concealedTiles?.map(t=>t.suit+t.value).join(","));
  });
  
  // Map player names to seats
  const playerAtIdx = {};
  game.players?.forEach(p => { playerAtIdx[p.seat] = p.name; });
  
  console.log("\n=== ACTION HISTORY (last 10) ===");
  const last10 = game.actionHistory?.slice(-10) || [];
  last10.forEach((a, i) => {
    const name = nameById[a.playerId] || a.playerId.slice(0,8);
    const tileStr = a.tile ? a.tile.suit + a.tile.value : "";
    console.log("  [" + i + "]", name, a.type, tileStr);
  });
  
  console.log("\n=== PENDING ===");
  if (game.pendingActions?.length) {
    game.pendingActions.forEach(pa => {
      const name = nameById[pa.playerId] || pa.playerId.slice(0,8);
      console.log("  " + name, "actions:", pa.availableActions, "tile:", pa.tile?.suit+pa.tile?.value);
    });
  } else {
    console.log("  (empty)");
  }
  
  console.log("\n=== DISCARD PILE ===");
  console.log("  total:", game.discardPile?.length);
  const discards = game.discardPile?.map(t => t.suit + t.value).join(",") || "";
  console.log("  all:", discards);
  // Find 7万
  const wan7Discards = game.discardPile?.filter(t => t.suit==="wan" && t.value===7) || [];
  console.log("  wan7 count:", wan7Discards.length);
  
  console.log("\n=== LAST DISCARD ===");
  const last = game.discardPile?.[game.discardPile.length-1];
  if (last) console.log("  ", last.suit, last.value, "id:", last.id);
  
  console.log("\n=== THINK FREEZE ===");
  console.log("  thinkFreezeUntil:", game.thinkFreezeUntil);
  console.log("  now:", Date.now());
  if (game.thinkFreezeUntil) console.log("  freeze remaining:", game.thinkFreezeUntil - Date.now(), "ms");
  
  // Check what 小猪 could eat
  const xiaozhu = game.players?.find(p => p.name === "AI-小猪");
  if (xiaozhu) {
    console.log("\n=== AI-小猪 CAN CHOW 7万? ===");
    const tiles = xiaozhu.hand.concealedTiles;
    // Check for 5-6, 6-8, 8-9 combinations with wan7
    const wanTiles = tiles.filter(t => t.suit === "wan").map(t => t.value).sort((a,b)=>a-b);
    console.log("  wan tiles:", wanTiles);
    if (wanTiles.includes(5) && wanTiles.includes(6)) console.log("  CAN CHOW: 5-6万 + 7万");
    if (wanTiles.includes(6) && wanTiles.includes(8)) console.log("  CAN CHOW: 6-8万 + 7万");
    if (wanTiles.includes(8) && wanTiles.includes(9)) console.log("  CAN CHOW: 8-9万 + 7万");
  }
  
  await client.close();
})().catch(e => console.log("Error:", e.message));
