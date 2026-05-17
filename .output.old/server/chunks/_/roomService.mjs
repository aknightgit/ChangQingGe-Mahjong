import { a as getCollection } from '../nitro/nitro.mjs';
import { randomUUID } from 'crypto';

var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, key + "" , value);
class RoomService {
  /**
   * Create a new room
   */
  static async createRoom(data) {
    const collection = await getCollection(this.COLLECTION_NAME);
    const room = {
      roomId: randomUUID(),
      ownerId: data.ownerId,
      name: data.name,
      status: "waiting",
      maxPlayers: 4,
      currentPlayers: [data.ownerId],
      // Owner is first player
      settings: {
        isPrivate: data.isPrivate || false,
        password: data.password,
        allowSpectators: data.allowSpectators || true,
        hesitationWindow: 2e3
        // 决策犹豫期（毫秒），默认2秒
      },
      createdAt: /* @__PURE__ */ new Date()
    };
    await collection.insertOne(room);
    return room;
  }
  /**
   * Get room by ID
   */
  static async getRoomById(roomId) {
    const collection = await getCollection(this.COLLECTION_NAME);
    return await collection.findOne({ roomId });
  }
  /**
   * Join a room
   */
  static async joinRoom(roomId, userId, password) {
    const collection = await getCollection(this.COLLECTION_NAME);
    const room = await this.getRoomById(roomId);
    if (!room) {
      throw new Error("Room not found");
    }
    if (room.status !== "waiting") {
      throw new Error("Room has already started");
    }
    if (room.currentPlayers.length >= room.maxPlayers) {
      throw new Error("Room is full");
    }
    if (room.currentPlayers.includes(userId)) {
      throw new Error("Already in room");
    }
    if (room.settings.isPrivate && room.settings.password !== password) {
      throw new Error("Invalid password");
    }
    await collection.updateOne(
      { roomId },
      { $push: { currentPlayers: userId } }
    );
    return await this.getRoomById(roomId);
  }
  /**
   * Leave a room
   */
  static async leaveRoom(roomId, userId) {
    const collection = await getCollection(this.COLLECTION_NAME);
    const room = await this.getRoomById(roomId);
    if (!room) {
      throw new Error("Room not found");
    }
    if (!room.currentPlayers.includes(userId)) {
      throw new Error("Not in room");
    }
    if (room.ownerId === userId && room.status === "waiting") {
      await collection.deleteOne({ roomId });
      return;
    }
    await collection.updateOne(
      { roomId },
      { $pull: { currentPlayers: userId } }
    );
  }
  /**
   * Update room status
   */
  static async updateRoomStatus(roomId, status, additionalUpdates) {
    const collection = await getCollection(this.COLLECTION_NAME);
    const updates = { status };
    if (status === "playing" && !(additionalUpdates == null ? void 0 : additionalUpdates.startedAt)) {
      updates.startedAt = /* @__PURE__ */ new Date();
    }
    if (status === "finished" && !(additionalUpdates == null ? void 0 : additionalUpdates.finishedAt)) {
      updates.finishedAt = /* @__PURE__ */ new Date();
    }
    if (additionalUpdates) {
      Object.assign(updates, additionalUpdates);
    }
    await collection.updateOne(
      { roomId },
      { $set: updates }
    );
  }
  /**
   * List available rooms
   */
  static async listAvailableRooms(includePrivate = false) {
    const collection = await getCollection(this.COLLECTION_NAME);
    const query = { status: "waiting" };
    if (!includePrivate) {
      query["settings.isPrivate"] = false;
    }
    return await collection.find(query).sort({ createdAt: -1 }).limit(50).toArray();
  }
  /**
   * Get rooms by user (as player or owner)
   */
  static async getRoomsByUser(userId) {
    const collection = await getCollection(this.COLLECTION_NAME);
    return await collection.find({
      $or: [
        { ownerId: userId },
        { currentPlayers: userId }
      ]
    }).sort({ createdAt: -1 }).toArray();
  }
  /**
   * Delete room
   */
  static async deleteRoom(roomId) {
    const collection = await getCollection(this.COLLECTION_NAME);
    await collection.deleteOne({ roomId });
  }
}
__publicField(RoomService, "COLLECTION_NAME", "rooms");

export { RoomService as R };
//# sourceMappingURL=roomService.mjs.map
