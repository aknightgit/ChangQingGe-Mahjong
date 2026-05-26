<template>
  <div class="mahjong-page">
    <div class="mahjong-card">
      <div class="login-shell">
        <section class="login-main">
          <h1 class="mahjong-title">长清阁麻将</h1>
          <p class="mahjong-subtitle">上海麻将 × 四川麻将</p>

          <!-- Auto-login status -->
          <div v-if="autoLoggingIn" class="auto-login-status">
            <div class="spinner"></div>
            <span>自动登录中...</span>
          </div>

          <template v-else>
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
              <div class="form-fields">
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
                <label class="remember-checkbox">
                  <input type="checkbox" v-model="loginForm.rememberMe" />
                  <span>记住密码，下次自动登录</span>
                </label>
                <p v-if="loginError" class="status-text error">{{ loginError }}</p>
              </div>
            </div>

            <div v-else class="form-section">
              <div class="form-fields">
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
            </div>
          </template>
        </section>

        <aside class="login-side">
          <div class="submit-section">
            <button
              v-if="activeTab === 'login'"
              class="mahjong-button primary-btn"
              @click="handlePhoneLogin"
              :disabled="isSubmitting"
            >
              {{ isSubmitting ? "登录中..." : "登录" }}
            </button>
            <button
              v-else
              class="mahjong-button primary-btn"
              @click="handleRegister"
              :disabled="isSubmitting"
            >
              {{ isSubmitting ? "注册中..." : "注册" }}
            </button>
          </div>

          <div class="divider">
            <span>或选择已有账号</span>
          </div>

          <div class="quick-login">
            <div v-if="deviceUsers.length === 0" class="status-text">暂无保存的账号，请先登录</div>
            <div v-else class="player-chips">
              <button
                v-for="user in deviceUsers"
                :key="user.userId"
                class="player-chip"
                :class="{ 'player-chip--avatar': !!user.avatar }"
                @click="handleQuickLogin(user)"
                :disabled="isSubmitting"
              >
                <span v-if="user.avatar" class="chip-avatar">{{ displayAvatar(user.avatar) }}</span>
                <span class="chip-name">{{ user.name }}</span>
              </button>
            </div>
          </div>

          <div v-if="storedCredentials.length > 1" class="cred-mgmt">
            <button class="cred-mgmt-btn" @click="showCredMgmt = !showCredMgmt">
              {{ showCredMgmt ? "收起" : "管理已记住的账号 (" + storedCredentials.length + ")" }}
            </button>
            <div v-if="showCredMgmt" class="cred-mgmt-list">
              <div v-for="cred in storedCredentials" :key="cred.userId" class="cred-mgmt-item">
                <span class="cred-mgmt-name">{{ cred.name || cred.phone }}</span>
                <button class="cred-forget-btn" @click="forgetCredential(cred.userId)">忘记</button>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from "vue"

// ============ Stored Credentials ============
const CRED_KEY = "mj_credentials"

function loadStoredCredentials() {
  try {
    const raw = localStorage.getItem(CRED_KEY)
    if (!raw) return []
    return JSON.parse(raw)
  } catch {
    return []
  }
}

function saveStoredCredentials(list) {
  try {
    localStorage.setItem(CRED_KEY, JSON.stringify(list))
  } catch {}
}

function addCredential(phone, password, userId, name, avatar) {
  const list = loadStoredCredentials().filter((c) => c.userId !== userId)
  list.push({ phone, password, userId, name, avatar })
  saveStoredCredentials(list)
}

function removeCredential(userId) {
  saveStoredCredentials(loadStoredCredentials().filter((c) => c.userId !== userId))
}

function isAIBot(name) {
  return /^AI-/i.test(name)
}

const storedCredentials = ref([])
const showCredMgmt = ref(false)
const autoLoggingIn = ref(false)

// Device-bound users: only accounts saved on this device, excluding AI bots
const deviceUsers = computed(() => {
  return storedCredentials.value.filter((c) => !isAIBot(c.name))
})

const activeTab = ref("login")
const isSubmitting = ref(false)
const loginError = ref("")
const registerError = ref("")

const loginForm = reactive({ phone: "", password: "", rememberMe: false })
const registerForm = reactive({ name: "", phone: "", password: "" })

// ============ Avatar Display ============
function displayAvatar(avatar) {
  if (!avatar) return "👤"
  if (/^[\u{1F000}-\u{1FFFF}]/u.test(avatar)) return avatar
  if (avatar.startsWith("http")) return "👤"
  return avatar
}

// ============ Session Management ============
const saveSession = (data) => {
  const token = useCookie("auth_token", { maxAge: 60 * 60 * 24 * 30, path: "/" })
  token.value = data.token
  const userName = useCookie("user_name", { path: "/" })
  userName.value = data.name
  const userId = useCookie("user_id", { path: "/" })
  userId.value = data.userId
  localStorage.setItem("mj_phone", data.phone || "")
  // 昵称持久化备份（cookie 可能丢失，localStorage 作 fallback）
  if (data.name) localStorage.setItem("mj_last_user_name", data.name)
}

// ============ Auto-login on mount ============
onMounted(async () => {
  storedCredentials.value = loadStoredCredentials()

  // 退出标记：用户主动退出过，跳过一切自动登录
  if (localStorage.getItem("mj_pending_logout")) {
    localStorage.removeItem("mj_pending_logout")
    // 彻底清理残留 session，确保退出干净
    useCookie("auth_token", { path: "/" }).value = null
    useCookie("user_id", { path: "/" }).value = null
    useCookie("user_name", { path: "/" }).value = null
    autoLoggingIn.value = false
    const cached = localStorage.getItem("mj_phone")
    if (cached) { loginForm.phone = cached; loginForm.rememberMe = true }
    return
  }

  // Check if user already has a valid session
  const existingToken = useCookie("auth_token", { path: "/" }).value
  if (existingToken) {
    try {
      const meRes = await $fetch("/mahjong/api/auth/me", { cache: "no-cache" })
      // 确保 user_name cookie 存在
      if (meRes?.data?.name && !useCookie("user_name", { path: "/" }).value) {
        useCookie("user_name", { path: "/" }).value = meRes.data.name
      }
      await navigateTo("/")
      return
    } catch {
      // Session expired, clear stale cookies
      useCookie("auth_token", { path: "/" }).value = null
    }
  }

  // Try auto-login with stored credentials
  if (storedCredentials.value.length > 0) {
    autoLoggingIn.value = true
    for (const cred of storedCredentials.value) {
      if (isAIBot(cred.name)) continue
      if (!cred.password) continue
      try {
        const res = await $fetch("/mahjong/api/auth/login", {
          method: "POST",
          body: { phone: cred.phone, password: cred.password },
        })
        saveSession(res.data)
        await navigateTo("/")
        return
      } catch {
        continue
      }
    }
    autoLoggingIn.value = false
  }

  const cached = localStorage.getItem("mj_phone")
  if (cached) {
    loginForm.phone = cached
    loginForm.rememberMe = true
  }
})

// ============ Quick Login ============
const handleQuickLogin = async (user) => {
  if (isSubmitting.value) return
  isSubmitting.value = true
  loginError.value = ""
  try {
    const res = await $fetch("/mahjong/api/auth/debug-login", {
      method: "POST",
      body: { userId: user.userId },
    })
    saveSession({
      token: res.token,
      name: res.user.name,
      userId: res.user.userId,
      phone: res.user.phone || "",
    })
    await navigateTo("/")
  } catch (err) {
    loginError.value = "快速登录失败，请尝试手动登录"
  } finally {
    isSubmitting.value = false
  }
}

// ============ Phone Login ============
const handlePhoneLogin = async () => {
  if (isSubmitting.value) return
  loginError.value = ""
  if (!loginForm.phone || !loginForm.password) {
    loginError.value = "请输入手机号和密码"
    return
  }
  isSubmitting.value = true
  try {
    const res = await $fetch("/mahjong/api/auth/login", {
      method: "POST",
      body: { phone: loginForm.phone, password: loginForm.password },
    })
    saveSession(res.data)

    // Always save for quick login display; only save password if "记住密码"
    const { userId, name } = res.data
    const savedPwd = loginForm.rememberMe ? loginForm.password : ""
    addCredential(loginForm.phone, savedPwd, userId, name, "")

    await navigateTo("/")
  } catch (err) {
    loginError.value = err?.data?.message || err?.message || "登录失败"
  } finally {
    isSubmitting.value = false
  }
}

// ============ Register ============
const handleRegister = async () => {
  if (isSubmitting.value) return
  registerError.value = ""
  if (!registerForm.name.trim()) {
    registerError.value = "请输入玩家名"
    return
  }
  if (!/^1[3-9]\d{9}$/.test(registerForm.phone)) {
    registerError.value = "手机号格式不正确（需11位国内手机号）"
    return
  }
  if (!registerForm.password || registerForm.password.length < 4) {
    registerError.value = "密码至少4位"
    return
  }
  isSubmitting.value = true
  try {
    const res = await $fetch("/mahjong/api/auth/register", {
      method: "POST",
      body: {
        name: registerForm.name.trim(),
        phone: registerForm.phone,
        password: registerForm.password,
      },
    })
    saveSession(res.data)
    addCredential(registerForm.phone, registerForm.password, res.data.userId, registerForm.name.trim(), "")
    storedCredentials.value = loadStoredCredentials()
    await navigateTo("/")
  } catch (err) {
    registerError.value = err?.data?.message || err?.message || "注册失败"
  } finally {
    isSubmitting.value = false
  }
}

// ============ Credential Management ============
const forgetCredential = (userId) => {
  removeCredential(userId)
  storedCredentials.value = loadStoredCredentials()
  loginError.value = ""
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

.auto-login-status {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 40px 0;
  color: rgba(255, 255, 255, 0.7);
  font-size: 1rem;
}

.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid rgba(70, 197, 116, 0.2);
  border-top: 3px solid #46c574;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
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

.form-fields {
  display: flex;
  flex-direction: column;
  gap: 14px;
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
  box-sizing: border-box;
  width: 100%;
}

.form-field input:focus {
  border-color: rgba(70, 197, 116, 0.5);
}

.form-field input::placeholder {
  color: rgba(255, 255, 255, 0.3);
}

.remember-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.65);
  cursor: pointer;
  user-select: none;
}

.remember-checkbox input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: #46c574;
  cursor: pointer;
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

.primary-btn:disabled {
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
  content: "";
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
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.05);
  color: #f5f5f5;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
}

.player-chip:hover {
  background: rgba(70, 197, 116, 0.15);
  border-color: rgba(70, 197, 116, 0.3);
  transform: translateY(-1px);
}

.player-chip:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.chip-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
}

.cred-mgmt {
  margin-top: 2px;
}

.cred-mgmt-btn {
  width: 100%;
  padding: 8px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.78rem;
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
}

.cred-mgmt-btn:hover {
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.7);
}

.cred-mgmt-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 8px;
}

.cred-mgmt-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  font-size: 0.82rem;
}

.cred-mgmt-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cred-forget-btn {
  padding: 4px 12px;
  border-radius: 6px;
  border: 1px solid rgba(255, 100, 100, 0.2);
  background: rgba(255, 100, 100, 0.08);
  color: #ff9d9d;
  font-size: 0.75rem;
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
  transition: all 0.15s;
}

.cred-forget-btn:hover {
  background: rgba(255, 100, 100, 0.18);
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
