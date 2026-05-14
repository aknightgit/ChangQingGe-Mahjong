import { AuthService } from '../../services/authService';
import { forceDisconnectUser } from '../../utils/socket';

/**
 * Logout endpoint — 完整退出APP
 * 1. 强制断开用户的所有socket连接并清理房间资源
 * 2. 清理session
 * 3. 清理cookies
 */
export default defineEventHandler(async (event) => {
  const token = getCookie(event, 'mahjong_session');
  const userId = getCookie(event, 'user_id');

  // 1. 先清理session
  if (token) {
    await AuthService.deleteSession(token);
  }

  // 2. 强制断开所有socket连接 + 清理房间状态
  if (userId) {
    await forceDisconnectUser(userId);
  }

  // 3. 清理cookies
  deleteCookie(event, 'mahjong_session');
  deleteCookie(event, 'auth_token');
  deleteCookie(event, 'user_id');
  deleteCookie(event, 'user_name');
  deleteCookie(event, 'is_admin');

  return {
    success: true,
    message: 'Logged out successfully'
  };
});
