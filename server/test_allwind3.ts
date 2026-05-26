import { Tile, Meld, MeldType, TileSuit } from "../types/game";
import { canWin } from "./utils/handValidator";

// 测试1: 13张风/箭手牌 + 门口牌也是风/箭
console.log("=== 测试1: 有门口牌(吃碰)的风/箭手牌 ===");
const hand1: Tile[] = [
  { suit: "feng", value: 1 }, { suit: "feng", value: 1 },
  { suit: "feng", value: 4 }, { suit: "feng", value: 4 }, { suit: "feng", value: 4 },
  { suit: "jian", value: 1 }, { suit: "jian", value: 1 }, { suit: "jian", value: 1 },
];
console.log("手牌(8张):", hand1.map(t => t.suit+":"+t.value).join(" "));
const exposed1: Meld[] = [
  { type: MeldType.PUNG, tiles: [{ suit: "feng", value: 2 } as Tile, { suit: "feng", value: 2 } as Tile, { suit: "feng", value: 2 } as Tile] },
  { type: MeldType.PUNG, tiles: [{ suit: "feng", value: 3 } as Tile, { suit: "feng", value: 3 } as Tile, { suit: "feng", value: 3 } as Tile] },
];
console.log("门口牌(6张):", exposed1.flatMap(m => m.tiles as Tile[]).map(t => t.suit+":"+t.value).join(" "));
console.log("总计: 8+6=14张 - 可打8张手牌");

const testTiles: Tile[] = [
  { suit: "feng", value: 1 }, { suit: "feng", value: 4 },
  { suit: "jian", value: 1 }, { suit: "dot", value: 5 },
];
for (const tile of testTiles) {
  const result = canWin([...hand1, tile], exposed1, null);
  console.log(`加 ${tile.suit}:${tile.value} -> canWin=${result.canWin} types=${JSON.stringify(result.types)}`);
}

// 检查isListeningPreviewState逻辑
console.log("\n=== 检查可玩牌数量 ===");
// 8张手牌（不含花牌）
console.log("手牌8张(全风/箭), count=8");
console.log("8 ∈ [1,4,7,10,13]?", [1,4,7,10,13].includes(8));
console.log("所以isListeningPreviewState返回:", [1,4,7,10,13].includes(8));
