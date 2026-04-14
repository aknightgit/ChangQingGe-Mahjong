/**
 * Extreme Test — 4 AI bots, 有吃必吃有胡必胡
 * Run: npx tsx server/utils/extremeTest100.ts
 */
import { GameManager } from "./utils/gameManager";
import { GameState, Player, Tile, PlayerStatus, ActionType } from "./types/game";
import { isBotPlayer, shouldClaimPendingAction } from "./services/botService";
import { selectDiscardTile } from "./services/botService";

// ═══ Patch botService policy for extreme mode ═══
// Force extreme policies by monkey-patching the policy cache
function enableExtremePolicy(): void {
  // Clear cache first
  const botService = await import("./services/botService");
  // @ts-ignore - accessing internal _policies cache
  if (typeof (botService as any).resetPolicyCache === 'function') {
    (botService as any).resetPolicyCache();
  }
  
  // Create extreme policy
  const extremePolicy = {
    id: 'extreme-test',
    selfWinChance: 1.0,       // 有胡必胡
    discardHuChance: 0.0,      // 不放胡（但selfWinChance=1已覆盖）
    discardHuMenQingPenalty: 0,
    discardHuWildPenalty: 0,
    pengChance: 1.0,          // 有碰必碰  
    kongChance: 1.0,          // 有杠必杠
    chowChance: 1.0,          // 有吃必吃
    chowWildPenalty: 0,       // 不惩罚百搭吃牌
    wildKeepPenalty: 0,       // 不保留百搭（打出去）
    dominantSuitBonus: 0,
    honorPairBonus: 0,
    honorRushThreshold: 0,
    tripletKeepBonus: 0,
    pairWeight: 0,
    nearWeight: 0,
  };
  
  // Override the loadCharacterPolicy function
  // We need to intercept at the module level
  console.log("⚠️ Extreme policy defined, but module-level patching needed");
}

// ═══ Direct simulation approach ═══
class ExtremeSimulator {
  private totalGames: number;
  private stats: {
    wins: number;
    draws: number;
    chows: number;
    pengs: number;
    kongs: number;
    selfDrawWins: number;
    winHandTypes: Record<string, number>;
  };

  constructor(totalGames: number = 100) {
    this.totalGames = totalGames;
    this.stats = {
      wins: 0, draws: 0, chows: 0, pengs: 0, kongs: 0,
      selfDrawWins: 0,
      winHandTypes: {}
    };
  }

  async run(): Promise<void> {
    const gm = new GameManager();

    console.log(`🀄️  极端测试启动：${this.totalGames} 局，4个AI，有吃必吃有胡必胡\n`);

    for (let i = 1; i <= this.totalGames; i++) {
      try {
        await this.runSingleGame(gm, i);
      } catch (e: any) {
        console.error(`  局 #${i} 异常: ${e.message}`);
        this.stats.draws++;
      }
    }

    this.printReport();
  }

  private async runSingleGame(gm: GameManager, gameNum: number): Promise<void> {
    // Create game with 4 AI bots
    const { gameId, playerId } = await gm.createGame("Human1", { maxBots: 3 });
    
    // Join 3 more bots as AI- prefixed players
    const botNames = ["AI-张三", "AI-李四", "AI-王五"];
    for (const name of botNames) {
      await gm.joinGame(gameId, name);
    }

    // Apply extreme policies - this is tricky since gameManager uses botService
    // We need to patch the policies before starting
    // Since we can't easily patch imported modules, we'll use the createGame options
    // that affect bot behavior
    
    // Start the game  
    await gm.startGame(gameId);

    console.log(`  局 #${gameNum} 启动`);

    // Now simulate the game by processing bot actions
    // We need to interact with the GameManager's internal state
    // This requires calling the internal processBotAction or similar methods
    
    // The GameManager broadcasts to WebSocket and processes player actions
    // For simulation, we can bypass WS and directly manipulate game state
    
    // Get game state
    const game = (gm as any).games.get(gameId) as GameState | undefined;
    if (!game) {
      console.error(`  局 #${gameNum}: 游戏状态未找到`);
      this.stats.draws++;
      return;
    }

    // Simulate rounds until game ends
    let maxRounds = 200; // Prevent infinite loops
    let rounds = 0;
    
    while (game.phase !== 'ENDED' && rounds < maxRounds) {
      rounds++;
      
      // Process each bot's turn
      const currentPlayer = game.players[game.currentPlayerIndex];
      
      if (isBotPlayer(currentPlayer)) {
        // Draw a tile for the bot
        // Process pending actions if any
        if (game.pendingActions.length > 0) {
          const action = await shouldClaimPendingAction(currentPlayer, [/* actionTypes */], game);
          // This needs more work to properly extract action types
        }
        
        // Auto-draw logic
        // ...
      }
    }
  }

  private printReport(): void {
    console.log("\n═══════════════════════════════════════");
    console.log("📊 极端测试报告");
    console.log("═══════════════════════════════════════");
    console.log(`总局数: ${this.totalGames}`);
    console.log(`胡牌: ${this.stats.wins}`);
    console.log(`流局: ${this.stats.draws}`);
    console.log(`吃牌: ${this.stats.chows}`);
    console.log(`碰牌: ${this.stats.pengs}`);
    console.log(`杠牌: ${this.stats.kongs}`);
    console.log(`自摸胡: ${this.stats.selfDrawWins}`);
    console.log("\n胡牌牌型分布:");
    for (const [type, count] of Object.entries(this.stats.winHandTypes)) {
      console.log(`  ${type}: ${count}`);
    }
  }
}

// Run test
const sim = new ExtremeSimulator(100);
sim.run().catch(console.error);
