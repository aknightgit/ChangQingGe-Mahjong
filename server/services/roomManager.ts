/**
 * RoomManager — 纯内存房间管理
 * 不依赖 MongoDB，重启后房间自然消失
 * 庄家只从真实玩家中选
 */

import { randomUUID } from 'node:crypto'

export interface RoomPlayer {
  id: string
  name: string
  seatIndex: number
  isOwner: boolean
  isReady: boolean
}

export interface RoomMessage {
  text: string
  time: number
}

export type RoomPhase = 'waiting' | 'ready' | 'playing' | 'ended'

export interface Room {
  roomNumber: string
  ownerId: string
  players: RoomPlayer[]
  phase: RoomPhase
  messages: RoomMessage[]
  createdAt: number
  maxPlayers: number
}

class RoomManager {
  private rooms = new Map<string, Room>()
  private playerToRoom = new Map<string, string>()
  private usedRoomNumbers = new Set<string>()

  private generateRoomNumber(): string {
    for (let i = 0; i < 100; i++) {
      const num = String(Math.floor(1000 + Math.random() * 9000))
      if (!this.usedRoomNumbers.has(num)) {
        this.usedRoomNumbers.add(num)
        return num
      }
    }
    return String(Date.now()).slice(-4)
  }

  createRoom(ownerName: string): { roomNumber: string; roomId: string; playerId: string } {
    const playerId = randomUUID()
    const roomNumber = this.generateRoomNumber()

    const room: Room = {
      roomNumber,
      ownerId: playerId,
      players: [{
        id: playerId,
        name: ownerName,
        seatIndex: 0,
        isOwner: true,
        isReady: false,
      }],
      phase: 'waiting',
      messages: [{ text: `📢 房间已创建，等待玩家加入...`, time: Date.now() }],
      createdAt: Date.now(),
      maxPlayers: 4,
    }

    this.rooms.set(roomNumber, room)
    this.playerToRoom.set(playerId, roomNumber)
    return { roomNumber, roomId: roomNumber, playerId }
  }

  joinRoom(roomNumber: string, playerName: string): { success: boolean; playerId: string; room: Room } {
    const room = this.rooms.get(roomNumber)
    if (!room) throw new Error('房间不存在')
    if (room.phase !== 'waiting' && room.phase !== 'ready') throw new Error('游戏已开始')
    if (room.players.length >= room.maxPlayers) throw new Error('房间已满')
    if (room.players.some(p => p.name === playerName)) throw new Error('昵称已存在')

    const playerId = randomUUID()
    room.players.push({ id: playerId, name: playerName, seatIndex: room.players.length, isOwner: false, isReady: false })
    room.messages.push({ text: `📢 ${playerName} 加入了房间`, time: Date.now() })

    if (room.players.length >= room.maxPlayers) {
      room.phase = 'ready'
      room.messages.push({ text: '🀄 人员已满，请房主点击「开始牌局」', time: Date.now() })
    }

    this.playerToRoom.set(playerId, roomNumber)
    return { success: true, playerId, room }
  }

  leaveRoom(roomNumber: string, playerId: string): Room | null {
    const room = this.rooms.get(roomNumber)
    if (!room) throw new Error('房间不存在')
    const player = room.players.find(p => p.id === playerId)
    if (!player) throw new Error('不在此房间')

    room.messages.push({ text: `📢 ${player.name} 离开了房间`, time: Date.now() })
    room.players = room.players.filter(p => p.id !== playerId)
    this.playerToRoom.delete(playerId)
    room.players.forEach((p, i) => { p.seatIndex = i })

    if (player.isOwner && room.players.length > 0) {
      room.players[0].isOwner = true
      room.ownerId = room.players[0].id
      room.messages.push({ text: `📢 ${room.players[0].name} 成为了新房主`, time: Date.now() })
    }

    if (room.players.length < room.maxPlayers && room.phase === 'ready') {
      room.phase = 'waiting'
    }

    if (room.players.length === 0) {
      this.rooms.delete(roomNumber)
      this.usedRoomNumbers.delete(roomNumber)
      return null
    }
    return room
  }

  getRoomState(roomNumber: string): Room | null {
    return this.rooms.get(roomNumber) || null
  }

  canStart(roomNumber: string, playerId: string): boolean {
    const room = this.rooms.get(roomNumber)
    return !!room && room.phase === 'ready' && room.ownerId === playerId
  }

  markPlaying(roomNumber: string): Room {
    const room = this.rooms.get(roomNumber)
    if (!room) throw new Error('房间不存在')
    room.phase = 'playing'
    return room
  }

  markEnded(roomNumber: string): void {
    const room = this.rooms.get(roomNumber)
    if (!room) return
    room.phase = 'ended'
  }

  addMessage(roomNumber: string, text: string): void {
    const room = this.rooms.get(roomNumber)
    if (room) room.messages.push({ text, time: Date.now() })
  }

  getPlayerRoom(playerId: string): string | null {
    return this.playerToRoom.get(playerId) || null
  }
}

const globalRM = globalThis as unknown as { __roomManager: RoomManager }
if (!globalRM.__roomManager) globalRM.__roomManager = new RoomManager()
export const roomManager = globalRM.__roomManager
