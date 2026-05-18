import { roomManager } from '../../services/roomManager'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { roomNumber, playerName } = body

  if (!roomNumber || !playerName) {
    throw createError({ statusCode: 400, message: 'roomNumber and playerName required' })
  }

  try {
    const result = roomManager.joinRoom(String(roomNumber), playerName)
    return { success: true, ...result }
  } catch (error: any) {
    throw createError({ statusCode: 400, message: error.message })
  }
})
