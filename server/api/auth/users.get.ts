import { UserService } from '../../services/userService'

export default defineEventHandler(async () => {
  if (process.env.NODE_ENV === 'production') {
    throw createError({ statusCode: 404, message: 'Not found' })
  }

  const users = await UserService.getUsersByProvider('local')

  return {
    success: true,
    users: users.map(user => ({
      userId: user.userId,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin ?? false,
      createdAt: user.createdAt
    }))
  }
})
