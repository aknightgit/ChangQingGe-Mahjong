import type { H3Event } from 'h3'
import { createError, getCookie, getQuery } from 'h3'
import { AuthService } from '../services/authService'
import { UserService } from '../services/userService'
import type { GameState, Player } from '../types/game'

async function validateSessionToken(token?: string): Promise<string | null> {
  if (!token) return null
  return AuthService.validateSession(token)
}

export async function resolveUserIdFromEvent(event: H3Event): Promise<string> {
  const sessionUserId =
    await validateSessionToken(getCookie(event, 'mahjong_session')) ||
    await validateSessionToken(getCookie(event, 'auth_token'))

  if (sessionUserId) {
    return sessionUserId
  }

  throw createError({
    statusCode: 401,
    message: 'Not authenticated'
  })
}

export async function resolveUserFromEvent(event: H3Event) {
  const userId = await resolveUserIdFromEvent(event)
  const user = await UserService.getUserById(userId)

  if (!user) {
    throw createError({
      statusCode: 404,
      message: 'User not found'
    })
  }

  return user
}

export async function requireAdminUser(event: H3Event) {
  const user = await resolveUserFromEvent(event)

  if (!user.isAdmin) {
    throw createError({
      statusCode: 403,
      message: 'Admin privileges required'
    })
  }

  return user
}

export async function isAdminFromEvent(event: H3Event): Promise<boolean> {
  try {
    const user = await resolveUserFromEvent(event)
    return !!user.isAdmin
  } catch (error) {
    return false
  }
}

export async function requireGamePlayerAccess(
  event: H3Event,
  game: GameState,
  playerId: string,
  options?: { allowAdmin?: boolean }
): Promise<{ user: Awaited<ReturnType<typeof resolveUserFromEvent>>; player: Player; isAdmin: boolean }> {
  const user = await resolveUserFromEvent(event)
  const player = game.players.find((entry) => entry.id === playerId)

  if (!player) {
    throw createError({
      statusCode: 404,
      message: 'Player not found'
    })
  }

  if (options?.allowAdmin && user.isAdmin) {
    return { user, player, isAdmin: true }
  }

  if (!player.userId || player.userId !== user.userId) {
    throw createError({
      statusCode: 403,
      message: 'Forbidden'
    })
  }

  return { user, player, isAdmin: false }
}
