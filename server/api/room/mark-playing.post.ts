import { roomManager } from '../../services/roomManager'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { roomNumber } = body
  if (!roomNumber) throw createError({ statusCode: 400, message: 'roomNumber required' })
  
  try {
    roomManager.markPlaying(String(roomNumber))
    return { success: true }
  } catch (error: any) {
    throw createError({ statusCode: 400, message: error.message })
  }
})
