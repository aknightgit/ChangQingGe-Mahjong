import { roomManager } from '../../services/roomManager'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { roomNumber, playerId } = body

  if (!roomNumber || !playerId) {
    throw createError({ statusCode: 400, message: 'roomNumber and playerId required' })
  }

  try {
    roomManager.leaveRoom(String(roomNumber), playerId)
    return { success: true }
  } catch (error: any) {
    throw createError({ statusCode: 400, message: error.message })
  }
})
