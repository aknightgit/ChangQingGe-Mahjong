import { roomManager } from '../../services/roomManager'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const roomNumber = query.roomNumber

  if (!roomNumber) {
    throw createError({ statusCode: 400, message: 'roomNumber required' })
  }

  const room = roomManager.getRoomState(String(roomNumber))
  if (!room) {
    throw createError({ statusCode: 404, message: '房间不存在' })
  }

  return { success: true, room }
})
