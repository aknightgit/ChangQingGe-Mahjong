import { roomManager } from '../../services/roomManager'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const playerName = body?.playerName || '玩家'
  
  try {
    const result = roomManager.createRoom(playerName)
    return { success: true, data: result }
  } catch (error: any) {
    throw createError({ statusCode: 400, message: error.message })
  }
})
