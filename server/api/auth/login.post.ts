import { UserService } from '../../services/userService';
import { AuthService } from '../../services/authService';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { phone, password } = body;

  if (!phone || !password) {
    throw createError({
      statusCode: 400,
      message: '手机号和密码都是必填项'
    });
  }

  try {
    const user = await UserService.loginByPhone(phone, password);
    const session = await AuthService.createSession(user.userId);

    setCookie(event, 'mahjong_session', session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
      path: '/'
    });

    return {
      success: true,
      data: {
        userId: user.userId,
        name: user.name,
        phone: user.phone,
        token: session.token
      }
    };
  } catch (error: any) {
    throw createError({
      statusCode: 400,
      message: error.message || '登录失败'
    });
  }
});
