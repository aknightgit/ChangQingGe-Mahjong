import { resolveUserFromEvent } from '../../utils/session';

/**
 * Get current user from session
 */
export default defineEventHandler(async (event) => {
  try {
    const user = await resolveUserFromEvent(event)

    return {
      success: true,
      data: {
        userId: user.userId,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        stats: user.stats,
        isAdmin: user.isAdmin ?? false
      }
    };
  } catch (error: any) {
    if (error.statusCode) throw error

    throw createError({
      statusCode: 500,
      message: 'Failed to get user'
    })
  }
})
