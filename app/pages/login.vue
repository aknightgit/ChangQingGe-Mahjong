<template>
  <div class="mahjong-page">
    <div class="mahjong-card">
      <div class="login-shell">
        <section class="login-main">
          <h1 class="mahjong-title">长清阁麻将</h1>
          <p class="mahjong-subtitle">上海麻将 × 四川麻将</p>

          <div class="tab-bar">
            <button
              class="tab-btn"
              :class="{ 'tab-btn--active': activeTab === 'login' }"
              @click="activeTab = 'login'"
            >登录</button>
            <button
              class="tab-btn"
              :class="{ 'tab-btn--active': activeTab === 'register' }"
              @click="activeTab = 'register'"
            >注册</button>
          </div>

          <div v-if="activeTab === 'login'" class="form-section">
            <div class="form-field">
              <label>手机号</label>
              <input
                v-model="loginForm.phone"
                type="tel"
                placeholder="输入11位手机号"
                maxlength="11"
                autocomplete="tel"
              />
            </div>
            <div class="form-field">
              <label>密码</label>
              <input
                v-model="loginForm.password"
                type="password"
                placeholder="输入密码"
                autocomplete="current-password"
                @keyup.enter="handlePhoneLogin"
              />
            </div>
            <p v-if="loginError" class="status-text error">{{ loginError }}</p>
          </div>

          <div v-else class="form-section">
            <div class="form-field">
              <label>玩家名 <span class="required">*</span></label>
              <input
                v-model="registerForm.name"
                type="text"
                placeholder="输入你的昵称"
                maxlength="20"
              />
            </div>
            <div class="form-field">
              <label>手机号 <span class="required">*</span></label>
              <input
                v-model="registerForm.phone"
                type="tel"
                placeholder="输入11位国内手机号"
                maxlength="11"
                autocomplete="tel"
              />
            </div>
            <div class="form-field">
              <label>密码 <span class="required">*</span></label>
              <input
                v-model="registerForm.password"
                type="password"
                placeholder="至少4位密码"
                autocomplete="new-password"
                @keyup.enter="handleRegister"
              />
            </div>
            <p v-if="registerError" class="status-text error">{{ registerError }}</p>
          </div>
        </section>

        <aside class="login-side">
          <div class="submit-section">
            <button
              v-if="activeTab === 'login'"
              class="mahjong-button primary-btn"
              @click="handlePhoneLogin"
              :disabled="isSubmitting"
            >
              {{ isSubmitting ? '登录中...' : '登录' }}
            </button>
            <button
              v-else
              class="mahjong-button primary-btn"
              @click="handleRegister"
              :disabled="isSubmitting"
            >
              {{ isSubmitting ? '注册中...' : '注册' }}
            </button>
          </div>

          <div class="divider">
            <span>或选择已有玩家</span>
          </div>

          <div class="quick-login">
            <div v-if="usersPending" class="status-text">加载中...</div>
            <div v-else-if="playerUsers.length === 0" class="status-text">暂无已有玩家</div>
            <div v-else class="player-chips">
              <button
                v-for="user in playerUsers"
                :key="user.userId"
                class="player-chip"
                @click="handleQuickLogin(user)"
                :disabled="isSubmitting"
              >
                {{ user.name }}
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  </div>
</template>

<script setup>
const { data: usersData, pending: usersPending } = await useFetch('/mahjong/api/auth/users')
const playerUsers = computed(() => (usersData.value?.users || []).filter((u) => !u.isAdmin))

const activeTab = ref('login')
const isSubmitting = ref(false)
const loginError = ref('')
const registerError = ref('')

const loginForm = reactive({ phone: '', password: '' })
const registerForm = reactive({ name: '', phone: '', password: '' })

onMounted(() => {
  const cached = localStorage.getItem('mj_phone')
  if (cached) {
    loginForm.phone = cached
    activeTab.value = 'login'
  }
})

const saveSession = (data) => {
  const token = useCookie('auth_token', { maxAge: 60 * 60 * 24 * 30 })
  token.value = data.token

  const userName = useCookie('user_name')
  userName.value = data.name

  const userId = useCookie('user_id')
  userId.value = data.userId

  localStorage.setItem('mj_phone', data.phone)
}

const handlePhoneLogin = async () => {
  if (isSubmitting.value) return
  loginError.value = ''

  if (!loginForm.phone || !loginForm.password) {
    loginError.value = '请输入手机号和密码'
    return
  }

  isSubmitting.value = true
  try {
    const res = await $fetch('/mahjong/api/auth/login', {
      method: 'POST',
      body: { phone: loginForm.phone, password: loginForm.password }
    })
    saveSession(res.data)
    await navigateTo('/')
  } catch (err) {
    loginError.value = err?.data?.message || err?.message || '登录失败'
  } finally {
    isSubmitting.value = false
  }
}

const handleRegister = async () => {
  if (isSubmitting.value) return
  registerError.value = ''

  if (!registerForm.name.trim()) {
    registerError.value = '请输入玩家名'
    return
  }
  if (!/^1[3-9]\d{9}$/.test(registerForm.phone)) {
    registerError.value = '手机号格式不正确（需11位国内手机号）'
    return
  }
  if (!registerForm.password || registerForm.password.length < 4) {
    registerError.value = '密码至少4位'
    return
  }

  isSubmitting.value = true
  try {
    const res = await $fetch('/mahjong/api/auth/register', {
      method: 'POST',
      body: {
        name: registerForm.name.trim(),
        phone: registerForm.phone,
        password: registerForm.password
      }
    })
    saveSession(res.data)
    await navigateTo('/')
  } catch (err) {
    registerError.value = err?.data?.message || err?.message || '注册失败'
  } finally {
    isSubmitting.value = false
  }
}

const handleQuickLogin = async (user) => {
  if (isSubmitting.value) return
  isSubmitting.value = true
  try {
    const res = await $fetch('/mahjong/api/auth/debug-login', {
      method: 'POST',
      body: { userId: user.userId }
    })
    saveSession({
      token: res.token || `session-${res.user.userId}`,
      name: res.user.name,
      userId: res.user.userId,
      phone: ''
    })
    await navigateTo('/')
  } catch (err) {
    console.error('Quick login failed:', err)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
.mahjong-page {
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at top, #153b2f, #07130e);
  font-family: system-ui, -apple-system, sans-serif;
  color: #f5f5f5;
  width: 100%;
  padding: 12px;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.mahjong-card {
  background: rgba(7, 19, 14, 0.9);
  border-radius: 18px;
  padding: 28px 30px;
  width: min(92vw, 960px);
  box-shadow: 0 18px 45px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.login-shell {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.login-main {
  display: flex;
  flex-direction: column;
}

.mahjong-title {
  font-size: 2rem;
  margin: 0 0 4px;
  letter-spacing: 0.08em;
  text-align: center;
}

.mahjong-subtitle {
  font-size: 0.9rem;
  opacity: 0.7;
  margin: 0 0 20px;
  text-align: center;
}

.tab-bar {
  display: flex;
  gap: 0;
  margin-bottom: 20px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 4px;
}

.tab-btn {
  flex: 1;
  padding: 10px;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.6);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  border-radius: 10px;
  transition: all 0.2s;
}

.tab-btn--active {
  background: rgba(70, 197, 116, 0.25);
  color: #5fffb0;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 14px;
  text-align: left;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-field label {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 600;
}

.required {
  color: #ff6b6b;
}

.form-field input {
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(0, 0, 0, 0.3);
  color: #f5f5f5;
  font-size: 1rem;
  outline: none;
  transition: border-color 0.2s;
}

.form-field input:focus {
  border-color: rgba(70, 197, 116, 0.5);
}

.form-field input::placeholder {
  color: rgba(255, 255, 255, 0.3);
}

.login-side {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.submit-section {
  display: flex;
  justify-content: center;
}

.primary-btn {
  width: 100%;
  padding: 14px;
  border-radius: 12px;
  border: none;
  background: linear-gradient(135deg, #1f8a52, #46c574);
  color: #fff;
  font-size: 1.1rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}

.primary-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(70, 197, 116, 0.3);
}

.primary-btn:disabled,
.player-chip:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.status-text {
  font-size: 0.85rem;
  opacity: 0.8;
  text-align: center;
}

.status-text.error {
  color: #ff9f9f;
  text-align: left;
}

.divider {
  display: flex;
  align-items: center;
  gap: 12px;
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.8rem;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: rgba(255, 255, 255, 0.1);
}

.quick-login {
  text-align: center;
}

.player-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}

.player-chip {
  padding: 8px 16px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.05);
  color: #f5f5f5;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.player-chip:hover {
  background: rgba(70, 197, 116, 0.15);
  border-color: rgba(70, 197, 116, 0.3);
}

@media (orientation: landscape) {
  .mahjong-page {
    padding: 8px;
  }

  .mahjong-card {
    min-height: calc(100dvh - 16px);
    padding: 18px 20px;
  }

  .login-shell {
    height: 100%;
    display: grid;
    grid-template-columns: minmax(320px, 1.25fr) minmax(180px, 0.75fr);
    gap: 20px;
    align-items: stretch;
  }

  .login-main {
    min-width: 0;
  }

  .login-side {
    min-width: 0;
    justify-content: center;
    border-left: 1px solid rgba(255, 255, 255, 0.08);
    padding-left: 20px;
  }

  .mahjong-title,
  .mahjong-subtitle {
    text-align: left;
  }

  .mahjong-title {
    font-size: 1.7rem;
  }

  .mahjong-subtitle {
    margin-bottom: 14px;
  }

  .submit-section {
    justify-content: stretch;
  }

  .primary-btn {
    min-height: 56px;
  }

  .quick-login {
    text-align: left;
  }

  .player-chips {
    justify-content: flex-start;
    align-content: flex-start;
    max-height: 36dvh;
    overflow-y: auto;
  }
}

@media (max-width: 600px) and (orientation: portrait) {
  .mahjong-card {
    padding: 22px 18px;
  }

  .mahjong-title {
    font-size: 1.7rem;
  }

  .mahjong-subtitle {
    margin-bottom: 16px;
  }
}
</style>
