import type { Server as HTTPServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import type { Socket } from 'socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import { createClient } from 'redis'
import { getMongoClient } from './mongo'
import type { SocketConnection, RoomState } from '../types/database'
import { gameManager } from './gameManager'
import { ActionType, GameEndReason } from '../types/game'
import { AuthService } from '../services/authService'
import { UserService } from '../services/userService'

let io: SocketIOServer | null = null

// 房主断连重连窗口：roomId → { timer, userId, userName }
const pendingOwnerDismissals = new Map<string, { timer: ReturnType<typeof setTimeout>, userId: string, userName: string }>()
const OWNER_RECONNECT_GRACE_MS = 15000 // 15秒重连窗口

export interface SocketUser {
  socketId: string
  userId: string
  userName: string
  roomId?: string
}

function parseCookies(header?: string) {
  const result: Record<string, string> = {}
  if (!header) return result

  for (const part of header.split(';')) {
    const [rawKey, ...rest] = part.trim().split('=')
    if (!rawKey) continue
    const key = decodeURIComponent(rawKey)
    const value = decodeURIComponent(rest.join('=') || '')
    result[key] = value
  }

  return result
}

async function socketIsAdmin(socket: Socket): Promise<boolean> {
  const user = await resolveSocketUser(socket)
  return !!user?.isAdmin
}

async function resolveSocketUser(socket: Socket): Promise<{ userId: string; userName: string; isAdmin: boolean } | null> {
  const handshakeAuth = socket.handshake.auth as {
    debugAccessToken?: string
    roomId?: string
    playerId?: string
  } | undefined
  const debugAccessToken =
    typeof handshakeAuth?.debugAccessToken === 'string' ? handshakeAuth.debugAccessToken : ''
  const debugRoomId =
    typeof handshakeAuth?.roomId === 'string' ? handshakeAuth.roomId : ''
  const debugPlayerId =
    typeof handshakeAuth?.playerId === 'string' ? handshakeAuth.playerId : ''

  if (
    process.env.ENABLE_DEBUG_ROUTES === 'true' &&
    debugAccessToken &&
    debugRoomId &&
    debugPlayerId
  ) {
    const game = await gameManager.getGame(debugRoomId)
    const debugPlayer = game?.players.find((player) => player.id === debugPlayerId)
    if ((game as any)?.debugAccessToken === debugAccessToken && debugPlayer) {
      return {
        userId: debugPlayer.id,
        userName: debugPlayer.name,
        isAdmin: true
      }
    }
  }

  const cookies = parseCookies(socket.handshake.headers.cookie)
  const token = cookies.mahjong_session || cookies.auth_token
  if (!token) return null

  const userId = await AuthService.validateSession(token)
  if (!userId) return null

  const user = await UserService.getUserById(userId)
  if (!user) return null

  return {
    userId: user.userId,
    userName: user.name,
    isAdmin: !!user.isAdmin
  }
}

// ✅ MongoDB Collections
async function getSocketConnectionsCollection() {
  const client = await getMongoClient()
  const db = client.db(process.env.MONGODB_DB || 'changqingge')
  return db.collection<SocketConnection>('socketConnections')
}

async function getRoomStatesCollection() {
  const client = await getMongoClient()
  const db = client.db(process.env.MONGODB_DB || 'changqingge')
  return db.collection<RoomState>('roomStates')
}

export async function initializeSocketIO(server: HTTPServer) {
  if (io) return io

  const transports =
    process.env.NODE_ENV !== 'production' &&
    !process.env.NUXT_PUBLIC_SOCKET_TRANSPORTS
      ? ['polling']
      : ['websocket', 'polling']

  io = new SocketIOServer(server, {
    path: '/mahjong/socket.io',
    cors: {
      origin: (origin, callback) => {
        // Allow all origins in development/testing
        callback(null, true)
      },
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports
  })

  // ✅ Configure Redis adapter for horizontal scaling
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
  
  try {
    const pubClient = createClient({ url: redisUrl })
    const subClient = pubClient.duplicate()

    await Promise.all([
      pubClient.connect(),
      subClient.connect()
    ])

    io.adapter(createAdapter(pubClient, subClient))
    console.log('✅ Socket.IO Redis adapter connected')
  } catch (error) {
    console.warn('⚠️  Redis not available, running in single-server mode')
    console.warn('   Set REDIS_URL environment variable to enable scaling')
  }

  io.on('connection', (socket: Socket) => {
    console.log(`[socket] transport=${socket.conn.transport.name} id=${socket.id}`)
    socket.conn.on('upgrade', () => {
      console.log(`[socket] upgraded transport=${socket.conn.transport.name} id=${socket.id}`)
    })
    console.log(`🔌 Client connected: ${socket.id}`)

    // Set up GameManager broadcasting
    gameManager.setWebSocketManager({
      broadcast: (gameId: string, event: string, data: any) => {
        // Map gameId to roomId (assuming they are the same for now, or we need a lookup)
        // In GameManager.createGame, gameId is randomUUID.
        // In GameService.createGame, gameId is randomUUID, roomId is passed.
        // But GameManager is in-memory and uses gameId as the key.
        // The frontend uses gameId as roomId in the URL usually.
        // Let's assume gameId == roomId for broadcasting purposes in this context
        emitToRoom(gameId, event, data)
      }
    })

    // Handle user authentication
    socket.on('auth:login', async (data: { userId: string; userName: string }) => {
      try {
        const authUser = await resolveSocketUser(socket)
        if (!authUser) {
          socket.emit('auth:error', { message: 'Authentication required' })
          return
        }

        const collection = await getSocketConnectionsCollection()
        
        // Store connection in MongoDB
        await collection.insertOne({
          socketId: socket.id,
          userId: authUser.userId,
          userName: authUser.userName,
          connectedAt: new Date(),
          lastSeenAt: new Date()
        })
        
        socket.emit('auth:success', { socketId: socket.id })
        console.log(`✅ User authenticated: ${data.userName} (${data.userId})`)
      } catch (error) {
        console.error('Error in auth:login:', error)
        socket.emit('auth:error', { message: 'Authentication failed' })
      }
    })

    // Join a game room
    socket.on('room:join', async (data: { roomId: string; userId: string; userName: string }) => {
      const { roomId } = data
      console.log(
        '[room:join]',
        'PID:', process.pid,
        'roomId:', roomId,
        'user:', data.userName,
        'socket:', socket.id
      )
      
      try {
        const authUser = await resolveSocketUser(socket)
        if (!authUser) {
          socket.emit('room:error', { message: 'Authentication required' })
          return
        }

        const userId = authUser.userId
        const userName = authUser.userName
        const roomStates = await getRoomStatesCollection()
        const connections = await getSocketConnectionsCollection()
        
        // Get or create room state
        let roomState = await roomStates.findOne({ roomId })
        
        if (!roomState) {
          // Create new room
          await roomStates.insertOne({
            roomId,
            playerIds: [],
            socketIds: [],
            ownerId: userId,
            maxPlayers: 4,
            createdAt: new Date(),
            updatedAt: new Date()
          })
          roomState = await roomStates.findOne({ roomId })
        } else if (!roomState.ownerId) {
          await roomStates.updateOne(
            { roomId },
            { $set: { ownerId: userId } }
          )
          roomState = await roomStates.findOne({ roomId })
        }
        
        // Check if room is full
        if (roomState!.socketIds.length >= 4) {
          socket.emit('room:error', { message: 'Room is full (max 4 players)' })
          return
        }

        // Join the Socket.IO room
        await socket.join(roomId)
        
        // Update room state in MongoDB
        await roomStates.updateOne(
          { roomId },
          {
            $addToSet: { 
              socketIds: socket.id,
              playerIds: userId 
            },
            $set: { updatedAt: new Date() }
          }
        )
        
        // Update user's room assignment
        await connections.updateOne(
          { socketId: socket.id },
          { 
            $set: { 
              roomId,
              lastSeenAt: new Date() 
            } 
          }
        )

        // Get updated room state
        const updatedRoom = await roomStates.findOne({ roomId })
        
        // Get all users in room
        const roomUsers = await connections.find({
          socketId: { $in: updatedRoom!.socketIds }
        }).toArray()

        const roomUsersList = roomUsers.map((u: any) => ({
          userId: u.userId,
          userName: u.userName,
          socketId: u.socketId
        }))

        // 检查是否是房主重连（取消 grace period 解散倒计时）
        const pending = pendingOwnerDismissals.get(roomId)
        if (pending && pending.userId === userId) {
          clearTimeout(pending.timer)
          pendingOwnerDismissals.delete(roomId)
          console.log(`✅ Owner ${userName} reconnected to room ${roomId}, grace period cancelled`)
          io!.to(roomId).emit('room:owner-reconnected', { userId, userName })
        }

        // Notify all users in room
        io!.to(roomId).emit('room:user-joined', {
          userId,
          userName,
          roomUsers: roomUsersList,
          playerCount: updatedRoom!.socketIds.length
        })

        console.log(`👥 ${userName} joined room ${roomId} (${updatedRoom!.socketIds.length}/4 players)`)
      } catch (error) {
        console.error('Error in room:join:', error)
        socket.emit('room:error', { message: 'Failed to join room' })
      }
    })

    // Leave room
    socket.on('room:leave', async (data: { roomId: string }) => {
      // 主动离开：取消可能存在的 grace period
      const pending = pendingOwnerDismissals.get(data.roomId)
      if (pending) {
        clearTimeout(pending.timer)
        pendingOwnerDismissals.delete(data.roomId)
      }
      await handleLeaveRoom(socket, data.roomId)
    })

    // Game state updates
    socket.on('game:action', async (data: any) => {
      try {
        const { gameId, playerId, type, tileId, tileIds } = data
        
        console.log(`🎮 Action received: ${type} from ${playerId} in game ${gameId}`)

        if (type === ActionType.CHEAT_HU) {
          const isAdmin = await socketIsAdmin(socket)
          if (!isAdmin) {
            socket.emit('game:error', { message: 'Admin privileges required' })
            return
          }
        }
        
        // Execute action in GameManager (the brain)
        // This will validate the move, update state, and trigger broadcast via setWebSocketManager
        await gameManager.executeAction(gameId, playerId, type, tileId, tileIds)
        
      } catch (error: any) {
        console.error('Error in game:action:', error.message)
        socket.emit('game:error', { message: error.message })
      }
    })

    // Game state sync (broadcast to all including sender)
    socket.on('game:state-update', async (data: any) => {
      try {
        const connections = await getSocketConnectionsCollection()
        const user = await connections.findOne({ socketId: socket.id })
        
        if (!user || !user.roomId) return

        io!.to(user.roomId).emit('game:state-changed', data)
      } catch (error) {
        console.error('Error in game:state-update:', error)
      }
    })

    // Chat messages
    socket.on('chat:message', async (data: { message: string }) => {
      try {
        const connections = await getSocketConnectionsCollection()
        const user = await connections.findOne({ socketId: socket.id })
        
        if (!user || !user.roomId) return

        io!.to(user.roomId).emit('chat:message-received', {
          userId: user.userId,
          userName: user.userName,
          message: data.message,
          timestamp: Date.now()
        })
      } catch (error) {
        console.error('Error in chat:message:', error)
      }
    })

    // Player ready status
    socket.on('player:ready', async (data: { isReady: boolean }) => {
      try {
        const connections = await getSocketConnectionsCollection()
        const user = await connections.findOne({ socketId: socket.id })
        
        if (!user || !user.roomId) return

        io!.to(user.roomId).emit('player:ready-changed', {
          userId: user.userId,
          userName: user.userName,
          isReady: data.isReady
        })
      } catch (error) {
        console.error('Error in player:ready:', error)
      }
    })

    // Disconnect
    socket.on('disconnect', async () => {
      try {
        const connections = await getSocketConnectionsCollection()
        const roomStates = await getRoomStatesCollection()
        const user = await connections.findOne({ socketId: socket.id })
        
        if (user && user.roomId) {
          const room = await roomStates.findOne({ roomId: user.roomId })
          const isOwner = room && room.ownerId === user.userId

          if (isOwner) {
            // 房主意外断连：启动重连窗口，不立即解散
            console.log(`⏳ Owner ${user.userName} disconnected from room ${user.roomId}, grace period started (${OWNER_RECONNECT_GRACE_MS / 1000}s)`)

            // 通知房间内其他人
            io!.to(user.roomId).emit('room:owner-disconnected', {
              graceSeconds: OWNER_RECONNECT_GRACE_MS / 1000
            })

            // 先从 room state 中移除 socketId（保持 playerIds 不变，方便重连）
            await roomStates.updateOne(
              { roomId: user.roomId },
              {
                $pull: { socketIds: socket.id },
                $set: { updatedAt: new Date() }
              }
            )

            // 清除用户房间标记
            await connections.updateOne(
              { socketId: socket.id },
              { $unset: { roomId: '' }, $set: { lastSeenAt: new Date() } }
            )

            // 启动超时解散 timer
            const existing = pendingOwnerDismissals.get(user.roomId)
            if (existing) clearTimeout(existing.timer)

            const timer = setTimeout(async () => {
              pendingOwnerDismissals.delete(user.roomId)
              console.log(`⏰ Owner grace period expired for room ${user.roomId}, dismissing`)
              // 房主未重连，正式解散
              const freshRoom = await roomStates.findOne({ roomId: user.roomId })
              if (freshRoom) {
                io!.to(user.roomId).emit('room:dismissed', {
                  reason: GameEndReason.OWNER_LEFT,
                  message: 'Room closed by host'
                })

                const remainingSocketIds = freshRoom.socketIds
                if (remainingSocketIds.length > 0) {
                  await connections.updateMany(
                    { socketId: { $in: remainingSocketIds } },
                    { $unset: { roomId: '' }, $set: { lastSeenAt: new Date() } }
                  )
                  for (const sid of remainingSocketIds) {
                    const peer = io!.sockets.sockets.get(sid)
                    peer?.leave(user.roomId)
                  }
                }

                try {
                  await gameManager.endGameForEmptyRoom(user.roomId, GameEndReason.OWNER_LEFT)
                } catch (err) {
                  console.error('Failed to end game after owner grace period:', err)
                }
                await roomStates.deleteOne({ roomId: user.roomId })
              }
            }, OWNER_RECONNECT_GRACE_MS)

            pendingOwnerDismissals.set(user.roomId, { timer, userId: user.userId, userName: user.userName })
          } else {
            // 非房主：正常离开
            await handleLeaveRoom(socket, user.roomId)
          }
        }

        // Remove connection from MongoDB
        await connections.deleteOne({ socketId: socket.id })
        console.log(`❌ Client disconnected: ${socket.id}`)
      } catch (error) {
        console.error('Error in disconnect:', error)
      }
    })
  })

  console.log('🚀 Socket.IO initialized with MongoDB state storage')
  return io
}

async function handleLeaveRoom(socket: Socket, roomId: string) {
  try {
    const connections = await getSocketConnectionsCollection()
    const roomStates = await getRoomStatesCollection()
    
    const user = await connections.findOne({ socketId: socket.id })
    
    // Remove from Socket.IO room
    socket.leave(roomId)
    
    // Update room state in MongoDB
    await roomStates.updateOne(
      { roomId },
      {
        $pull: { 
          socketIds: socket.id,
          playerIds: user?.userId 
        },
        $set: { updatedAt: new Date() }
      }
    )
    
    // Clear user's room assignment
    await connections.updateOne(
      { socketId: socket.id },
      { 
        $unset: { roomId: '' },
        $set: { lastSeenAt: new Date() }
      }
    )

    // Get updated room state
    const updatedRoom = await roomStates.findOne({ roomId })
    
        if (updatedRoom) {
          const ownerLeft = updatedRoom.ownerId && user?.userId === updatedRoom.ownerId

          if (ownerLeft) {
            const remainingSocketIds = updatedRoom.socketIds.filter((id: string) => id !== socket.id)

            io!.to(roomId).emit('room:dismissed', {
              reason: GameEndReason.OWNER_LEFT,
              message: 'Room closed by host'
            })

            if (remainingSocketIds.length > 0) {
              await connections.updateMany(
                { socketId: { $in: remainingSocketIds } },
                { $unset: { roomId: '' }, $set: { lastSeenAt: new Date() } }
              )

              for (const sid of remainingSocketIds) {
                const peer = io!.sockets.sockets.get(sid)
                peer?.leave(roomId)
              }
            }

            try {
              await gameManager.endGameForEmptyRoom(roomId, GameEndReason.OWNER_LEFT)
            } catch (error) {
              console.error('Failed to end game after owner left:', error)
            }

            await roomStates.deleteOne({ roomId })
            return
          }

      // Get remaining users
      const roomUsers = await connections.find({
        socketId: { $in: updatedRoom.socketIds }
      }).toArray()

      const roomUsersList = roomUsers.map((u: any) => ({
        userId: u.userId,
        userName: u.userName,
        socketId: u.socketId
      }))

      // Notify others
      if (user) {
        io!.to(roomId).emit('room:user-left', {
          userId: user.userId,
          userName: user.userName,
          roomUsers: roomUsersList,
          playerCount: updatedRoom.socketIds.length
        })

        console.log(`👋 ${user.userName} left room ${roomId} (${updatedRoom.socketIds.length}/4 players)`)
      }

      // Clean up empty room
      if (updatedRoom.socketIds.length === 0) {
        try {
          await gameManager.endGameForEmptyRoom(roomId)
        } catch (error) {
          console.error('Failed to mark game ended for empty room:', error)
        }
        console.log(`[room:cleanup] Room ${roomId} empty; deleting state document`)
        await roomStates.deleteOne({ roomId })
      }
    }
  } catch (error) {
    console.error('Error in handleLeaveRoom:', error)
  }
}

export function getIO(): SocketIOServer | null {
  return io
}

// Helper to emit to specific room
export function emitToRoom(roomId: string, event: string, data: any) {
  if (io) {
    io.to(roomId).emit(event, data)
  }
}

// Helper to get room users from MongoDB
export async function getRoomUsers(roomId: string): Promise<SocketUser[]> {
  try {
    const roomStates = await getRoomStatesCollection()
    const connections = await getSocketConnectionsCollection()
    
    const room = await roomStates.findOne({ roomId })
    if (!room) return []

    const users = await connections.find({
      socketId: { $in: room.socketIds }
    }).toArray()

    return users.map((u: any) => ({
      socketId: u.socketId,
      userId: u.userId,
      userName: u.userName,
      roomId: u.roomId
    }))
  } catch (error) {
    console.error('Error in getRoomUsers:', error)
    return []
  }
}

// Helper to get user count in room from MongoDB
export async function getRoomUserCount(roomId: string): Promise<number> {
  try {
    const roomStates = await getRoomStatesCollection()
    const room = await roomStates.findOne({ roomId })
    return room ? room.socketIds.length : 0
  } catch (error) {
    console.error('Error in getRoomUserCount:', error)
    return 0
  }
}
