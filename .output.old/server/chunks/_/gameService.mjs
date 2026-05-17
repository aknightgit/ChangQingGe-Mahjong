import { a as getCollection, F as createDeck, H as shuffleTiles } from '../nitro/nitro.mjs';
import { randomUUID } from 'crypto';

var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, key + "" , value);
class GameService {
  /**
   * Create a new game from a room
   */
  static async createGame(roomId, players, hesitationWindow) {
    const collection = await getCollection(this.COLLECTION_NAME);
    const deck = createDeck();
    const shuffledDeck = shuffleTiles(deck);
    const gamePlayers = players.map((player, index) => ({
      userId: player.userId,
      name: player.name,
      position: index,
      hand: {
        concealedTiles: shuffledDeck.splice(0, 13).map(this.tileToStored),
        exposedMelds: [],
        discardedTiles: []
      },
      status: "playing",
      isDealer: index === 0,
      isTing: false,
      missingSuit: null,
      windScore: 0,
      rainScore: 0,
      wonFan: 0,
      winOrder: null,
      winRound: null,
      winTimestamp: null,
      score: 0
    }));
    gamePlayers[0].hand.concealedTiles.push(this.tileToStored(shuffledDeck.shift()));
    const game = {
      gameId: randomUUID(),
      roomId,
      phase: "playing",
      players: gamePlayers,
      wall: shuffledDeck.map(this.tileToStored),
      currentPlayerIndex: 0,
      dealerIndex: 0,
      discardPile: [],
      actionHistory: [],
      winnersCount: 0,
      roundNumber: 1,
      createdAt: /* @__PURE__ */ new Date(),
      lastActionTime: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date(),
      hesitationWindow: hesitationWindow != null ? hesitationWindow : 2e3
      // 决策犹豫期，默认2秒
    };
    await collection.insertOne(game);
    return game;
  }
  /**
   * Get game by ID
   */
  static async getGameById(gameId) {
    const collection = await getCollection(this.COLLECTION_NAME);
    return await collection.findOne({ gameId });
  }
  /**
   * Get game by room ID
   */
  static async getGameByRoomId(roomId) {
    const collection = await getCollection(this.COLLECTION_NAME);
    return await collection.findOne({ roomId, phase: { $ne: "ended" } });
  }
  /**
   * Update game state
   */
  static async updateGame(gameId, updates) {
    const collection = await getCollection(this.COLLECTION_NAME);
    await collection.updateOne(
      { gameId },
      {
        $set: {
          ...updates,
          updatedAt: /* @__PURE__ */ new Date(),
          lastActionTime: /* @__PURE__ */ new Date()
        }
      }
    );
  }
  /**
   * Add action to history
   */
  static async addAction(gameId, action) {
    const collection = await getCollection(this.COLLECTION_NAME);
    await collection.updateOne(
      { gameId },
      {
        $push: { actionHistory: action },
        $set: {
          lastActionTime: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        }
      }
    );
  }
  /**
   * Update player in game
   */
  static async updatePlayer(gameId, userId, updates) {
    const collection = await getCollection(this.COLLECTION_NAME);
    const game = await this.getGameById(gameId);
    if (!game) throw new Error("Game not found");
    const playerIndex = game.players.findIndex((p) => p.userId === userId);
    if (playerIndex === -1) throw new Error("Player not found");
    const updatedPlayers = [...game.players];
    updatedPlayers[playerIndex] = { ...updatedPlayers[playerIndex], ...updates };
    await collection.updateOne(
      { gameId },
      {
        $set: {
          players: updatedPlayers,
          updatedAt: /* @__PURE__ */ new Date()
        }
      }
    );
  }
  /**
   * Get active games for a user
   */
  static async getActiveGamesForUser(userId) {
    const collection = await getCollection(this.COLLECTION_NAME);
    return await collection.find({
      "players.userId": userId,
      phase: { $in: ["playing", "starting"] }
    }).sort({ lastActionTime: -1 }).toArray();
  }
  /**
   * Draw tile from wall
   */
  static async drawTile(gameId) {
    const collection = await getCollection(this.COLLECTION_NAME);
    const game = await this.getGameById(gameId);
    if (!game || game.wall.length === 0) return null;
    const tile = game.wall[game.wall.length - 1];
    const newWall = game.wall.slice(0, -1);
    await collection.updateOne(
      { gameId },
      {
        $set: {
          wall: newWall,
          updatedAt: /* @__PURE__ */ new Date()
        }
      }
    );
    return tile;
  }
  /**
   * Add tile to discard pile
   */
  static async discardTile(gameId, tile) {
    const collection = await getCollection(this.COLLECTION_NAME);
    await collection.updateOne(
      { gameId },
      {
        $push: { discardPile: tile },
        $set: { updatedAt: /* @__PURE__ */ new Date() }
      }
    );
  }
  /**
   * Clean up old games (older than 7 days)
   */
  static async cleanupOldGames() {
    const collection = await getCollection(this.COLLECTION_NAME);
    const sevenDaysAgo = /* @__PURE__ */ new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const result = await collection.deleteMany({
      phase: "ended",
      updatedAt: { $lt: sevenDaysAgo }
    });
    return result.deletedCount;
  }
  /**
   * Convert Tile to StoredTile
   */
  static tileToStored(tile) {
    return {
      suit: tile.suit,
      value: tile.value,
      id: tile.id
    };
  }
  /**
   * Convert StoredTile to Tile
   */
  static storedToTile(stored) {
    return {
      suit: stored.suit,
      value: stored.value,
      id: stored.id
    };
  }
}
__publicField(GameService, "COLLECTION_NAME", "mahjongGames");

export { GameService as G };
//# sourceMappingURL=gameService.mjs.map
