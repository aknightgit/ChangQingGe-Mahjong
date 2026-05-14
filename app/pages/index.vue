<!-- app/pages/index.vue -->
<template>
  <div class="mahjong-page">
    <div class="mahjong-card">
      <h1 class="mahjong-title">长清阁麻将</h1>
      <p class="mahjong-subtitle">
        欢迎回来，{{ userName || '牌友' }}。
        <span v-if="isAdminUser" class="admin-badge">(管理员模式)</span>
      </p>

      <div class="mahjong-actions">
        <button
          type="button"
          class="mahjong-button primary"
          @click="navigateTo('/create-room')"
        >
          创建新局
        </button>

        <button
          v-if="isAdminUser"
          class="mahjong-button secondary"
          @click="goToAdminSandbox"
        >
          管理员沙盒
        </button>

        <button class="mahjong-button secondary" @click="onJoinGame">
          加入牌局
        </button>

        <button class="mahjong-button secondary" @click="onMatchHistory">
          对局记录
        </button>

        <button class="mahjong-button secondary" @click="navigateTo('/rules')">
          📖 规则说明
        </button>

        <button class="mahjong-button danger" @click="exitGame">
          退出游戏
        </button>
      </div>

      <p class="mahjong-hint">
        创建新局后，等待其他玩家加入即可开始。
      </p>
    </div>

    <!-- Proper Nuxt UI v4 modal usage -->
    <UModal
      v-model:open="isProfileModalOpen"
      title="个人资料"
      description="编辑你的个人信息，让牌友们认识你。"
      :close="{
        color: 'neutral',
        variant: 'ghost',
        class: 'profile-close-btn'
      }"
    >
      <template #body>
        <div class="profile-modal-shell">
          <div v-if="profileError">
            <UAlert color="red" variant="soft" icon="i-heroicons-exclamation-triangle">
              {{ profileError?.data?.message || profileError?.message || '无法加载个人资料，请重试。' }}
            </UAlert>
            <div class="profile-actions">
              <UButton color="emerald" variant="solid" @click="refreshProfile">
                重试
              </UButton>
            </div>
          </div>
          <div v-else>
            <div v-if="profilePending && !profileHasLoaded" class="profile-skeletons">
              <USkeleton
                class="skeleton-row"
                v-for="i in 3"
                :key="i"
                height="48px"
                :ui="{ rounded: 'rounded-lg' }"
              />
            </div>

            <UForm
              v-else
              :state="profileForm"
              class="profile-form"
              @submit.prevent="saveProfile"
            >
              <div class="profile-grid">
                <UFormField label="姓名" name="name" required>
                  <UInput
                    v-model="profileForm.name"
                    :disabled="!isEditingProfile || profileSaving"
                    placeholder="请输入姓名"
                  />
                </UFormField>

                <UFormField label="出生日期" name="dateOfBirth">
                  <UInput
                    v-model="profileForm.dateOfBirth"
                    type="date"
                    :disabled="!isEditingProfile || profileSaving"
                  />
                </UFormField>

                <UFormField label="性别" name="gender">
                  <UInput
                    v-model="profileForm.gender"
                    :disabled="!isEditingProfile || profileSaving"
                    placeholder="请输入性别"
                  />
                </UFormField>

                <UFormField label="地址" name="address" class="profile-full-row">
                  <UTextarea
                    v-model="profileForm.address"
                    :disabled="!isEditingProfile || profileSaving"
                    placeholder="城市, 国家"
                    :rows="3"
                  />
                </UFormField>
              </div>

              <UAlert
                v-if="profileStatus.message"
                :color="profileStatus.type === 'error' ? 'red' : 'emerald'"
                :variant="profileStatus.type === 'error' ? 'soft' : 'subtle'"
                icon="i-heroicons-information-circle"
              >
                {{ profileStatus.message }}
              </UAlert>

              <div class="profile-actions">
                <UButton
                  v-if="!isEditingProfile"
                  color="emerald"
                  icon="i-heroicons-pencil-square"
                  @click="startEditingProfile"
                  :disabled="profilePending || !profileHasLoaded"
                >
                  编辑资料
                </UButton>

                <template v-else>
                  <UButton
                    type="submit"
                    color="emerald"
                    icon="i-heroicons-check"
                    :loading="profileSaving"
                  >
                    保存
                  </UButton>
                  <UButton
                    type="button"
                    color="gray"
                    variant="ghost"
                    icon="i-heroicons-x-mark"
                    @click="cancelEditingProfile"
                    :disabled="profileSaving"
                  >
                    取消
                  </UButton>
                </template>
              </div>
            </UForm>
          </div>
        </div>
      </template>
    </UModal>


  </div>
</template>

<script setup lang="ts">
// 首页不需要SSR，避免水合期间按钮点击失效
definePageMeta({ ssr: false })

const PENDING_ROOM_STORAGE_KEY = 'mahjong.pendingRoomTarget'
const PENDING_ROOM_TTL_MS = 8000

const normalizePendingRoomTarget = (targetUrl: string): string | null => {
  const normalizePath = (path: string, search = '') => {
    const trimmedPath = path.replace(/^\/mahjong(?=\/|$)/, '') || '/'
    if (!trimmedPath.startsWith('/gameroom/')) return null
    return `${trimmedPath}${search}`
  }

  if (!targetUrl) return null
  if (targetUrl.startsWith('/')) {
    const [path, search = ''] = targetUrl.split('?')
    return normalizePath(path, search ? `?${search}` : '')
  }

  if (!process.client) return null

  try {
    const parsed = new URL(targetUrl, window.location.origin)
    return normalizePath(parsed.pathname, parsed.search)
  } catch {
    return null
  }
}

const savePendingRoomTarget = (targetUrl: string) => {
  if (!process.client) return
  const normalizedTarget = normalizePendingRoomTarget(targetUrl)
  if (!normalizedTarget) return
  try {
    sessionStorage.setItem(PENDING_ROOM_STORAGE_KEY, JSON.stringify({
      targetUrl: normalizedTarget,
      createdAt: Date.now()
    }))
  } catch {}
}

const getPendingRoomTarget = (): string | null => {
  if (!process.client) return null
  try {
    const raw = sessionStorage.getItem(PENDING_ROOM_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { targetUrl?: string; createdAt?: number }
    if (!parsed?.targetUrl || typeof parsed.createdAt !== 'number') return null
    if (Date.now() - parsed.createdAt > PENDING_ROOM_TTL_MS) {
      sessionStorage.removeItem(PENDING_ROOM_STORAGE_KEY)
      return null
    }
    const normalizedTarget = normalizePendingRoomTarget(parsed.targetUrl)
    if (!normalizedTarget) {
      sessionStorage.removeItem(PENDING_ROOM_STORAGE_KEY)
      return null
    }
    return normalizedTarget
  } catch {
    return null
  }
}

const clearPendingRoomTarget = () => {
  if (!process.client) return
  try {
    sessionStorage.removeItem(PENDING_ROOM_STORAGE_KEY)
  } catch {}
}

const buildGameRoomPath = (gameId: string, playerId: string, dice?: number) => {
  const params = new URLSearchParams({ playerId })
  if (typeof dice === 'number') params.set('dice', String(dice))
  return `/mahjong/gameroom/${gameId}?${params.toString()}`
}

const navigateToCreatedRoom = async (targetUrl: string) => {
  const normalizedTarget = normalizePendingRoomTarget(targetUrl)
  if (!normalizedTarget) {
    clearPendingRoomTarget()
    return
  }
  savePendingRoomTarget(normalizedTarget)

  try {
    await navigateTo(normalizedTarget, { external: false })
  } catch (error) {
    console.warn('[Create] navigateTo failed:', error)
  }

  // 导航无论成功与否都不做硬跳转，避免全量刷新破坏SPA认证状态
  clearPendingRoomTarget()
}

const userName = useCookie('user_name')
const isAdmin = useCookie('is_admin')
const router = useRouter()
const route = useRoute()

const isAdminUser = computed(() => isAdmin.value === 'true' || isAdmin.value === true)
const isCreatingGame = ref(false)

// 创建房间参数弹窗
const showCreateModal = ref(false)
const activeHelp = ref<string | null>(null)
const toggleHelp = (key: string) => {
  activeHelp.value = activeHelp.value === key ? null : key
}
const createParams = reactive({
  maxDiceRolls: 2,
  hesitationSeconds: 5, // 决策犹豫期（秒），默认5秒
  firstRoundDouble: true,
  liangShanThreshold: 4000,
  thinkChances: 3,
  settlementMultiplier: 10,
  maxBots: 3
})

// AI玩家选择
const showAISelection = ref(false)
const allAIBots = [
  { id: 'AI-小胖', name: 'AI-小胖', desc: '稳健型' },
  { id: 'AI-老赵', name: 'AI-老赵', desc: '进攻型' },
  { id: 'AI-阿水', name: 'AI-阿水', desc: '做大做强型' },
  { id: 'AI-AK', name: 'AI-AK', desc: '默认策略' },
  { id: 'AI-老蒋', name: 'AI-老蒋', desc: '均衡型' },
  { id: 'AI-小猪', name: 'AI-小猪', desc: '风险规避型' },
]
const selectedBots = ref<string[]>([])

// maxBots变更时自动裁剪多余的AI选择
watch(() => createParams.maxBots, (newMax) => {
  if (selectedBots.value.length > newMax) {
    selectedBots.value = selectedBots.value.slice(0, newMax)
  }
})

const openCreateModal = (aiCount: number) => {
  // 人机大战默认选满（不超过maxBots）
  const effectiveCount = Math.min(aiCount, createParams.maxBots)
  selectedBots.value = effectiveCount > 0 ? allAIBots.slice(0, effectiveCount).map(b => b.id) : []
  showCreateModal.value = true
}

const confirmCreateGame = async () => {
  if (isCreatingGame.value) return
  isCreatingGame.value = true
  try {
    const response = await $fetch('/mahjong/api/game/create', {
      method: 'POST',
      body: {
        playerName: userName.value || 'Player 1',
        diceRollCount: createParams.maxDiceRolls,
        firstRoundDouble: createParams.firstRoundDouble,
        liangShanThreshold: createParams.liangShanThreshold,
        thinkChances: createParams.thinkChances,
        settlementMultiplier: createParams.settlementMultiplier,
        maxBots: createParams.maxBots,
        minPlayers: createParams.minPlayers ?? 4,
        hesitationWindow: Math.round(createParams.hesitationSeconds * 1000) // 秒→毫秒
      },
      headers: { 'Cache-Control': 'no-cache' }
    })

    if (!response || !response.success) {
      console.error('[Create] Unexpected response:', response)
      alert('创建失败，请重试')
      return
    }

    const gameId = response.data?.gameId
    const playerId = response.data?.playerId
    if (!gameId || !playerId) {
      console.error('[Create] Missing gameId/playerId:', response)
      alert('创建失败：服务端未返回有效数据')
      return
    }

    console.log('[Create] Game created:', gameId, 'playerId:', playerId)

    // 先进入房间，避免用户等待机器人加入导致“点击后很慢”

    // 后台并行加入选中的AI（不阻塞首屏响应）
    const botsToJoin = selectedBots.value.slice(0, createParams.maxBots)
    if (botsToJoin.length) {
      const results = await Promise.allSettled(
        botsToJoin.map(botId =>
          $fetch('/mahjong/api/game/join', {
            method: 'POST',
            body: { gameId, playerName: botId, ownerPlayerId: playerId },
            headers: { 'Cache-Control': 'no-cache' }
          })
        )
      )
      results.forEach((result, idx) => {
        const botId = botsToJoin[idx]
        if (result.status === 'fulfilled') {
          console.log('[Create] Bot joined:', botId)
        } else {
          console.error('[Create] Bot join failed:', botId, result.reason)
        }
      })
    }

    const targetUrl = buildGameRoomPath(gameId, playerId, createParams.maxDiceRolls)
    console.log('[Create] Navigating to:', targetUrl)
    showCreateModal.value = false
    await navigateToCreatedRoom(targetUrl)
  } catch (e) {
    console.error('[Create] Error:', e)
    if (e?.status === 401 || e?.statusCode === 401 || e?.data?.statusCode === 401) {
      useCookie('auth_token').value = null
      useCookie('user_id').value = null
      useCookie('user_name').value = null
      await navigateTo('/login')
      return
    }
    alert('创建房间失败：' + (e?.message || '未知错误'))
  } finally {
    isCreatingGame.value = false
  }
}

onMounted(async () => {
  // 优先从pendingRoomTarget尝试恢复导航
  const pendingTarget = getPendingRoomTarget()
  if (pendingTarget) {
    if (router.currentRoute.value.path !== '/') {
      clearPendingRoomTarget()
      return
    }
    await navigateToCreatedRoom(pendingTarget)
    return
  }

  // 如果URL有playerId和roomId参数（来自深度链接/硬刷新），直接导航过去
  const urlRoomId = route.query.roomId as string
  const urlPlayerId = route.query.playerId as string
  if (urlRoomId && urlPlayerId) {
    const targetUrl = buildGameRoomPath(urlRoomId, urlPlayerId)
    await navigateToCreatedRoom(targetUrl)
    return
  }

  // 静默完成
})

const { data: profileResponse, pending: profilePending, error: profileError, refresh: refreshProfile } =
  useFetch('/mahjong/api/profile', {
    method: 'GET',
    cache: 'no-cache'
  })

const profileForm = reactive({
  name: '',
  address: '',
  dateOfBirth: '',
  gender: ''
})

const isEditingProfile = ref(false)
const profileSaving = ref(false)
const profileStatus = ref({ type: '', message: '' })
const isProfileModalOpen = ref(false)

const profileHasLoaded = computed(() => Boolean(profileResponse.value?.data))

const hydrateProfileForm = (payload) => {
  if (!payload) return
  profileForm.name = payload.name || ''
  profileForm.address = payload.address || ''
  profileForm.dateOfBirth = payload.dateOfBirth || ''
  profileForm.gender = payload.gender || ''
}

watch(
  () => profileResponse.value?.data,
  (data) => {
    if (data) {
      hydrateProfileForm(data)
    }
  },
  { immediate: true }
)

const setProfileStatus = (type, message) => {
  profileStatus.value = { type, message }
}

const ensureProfileLoaded = async () => {
  const isLoaded = profileHasLoaded.value
  const isLoading = profilePending.value

  if (!isLoaded && !isLoading) {
    await refreshProfile()
  }
}

const openProfileModal = async () => {
  setProfileStatus('', '')
  await ensureProfileLoaded()
  isProfileModalOpen.value = true
}

const startEditingProfile = () => {
  if (!profileHasLoaded.value) return
  isEditingProfile.value = true
  setProfileStatus('', '')
}

const cancelEditingProfile = () => {
  hydrateProfileForm(profileResponse.value?.data)
  isEditingProfile.value = false
  setProfileStatus('', '')
}

watch(isProfileModalOpen, (isOpen, wasOpen) => {
  if (!isOpen && wasOpen) {
    // when modal closes, reset form + editing state
    cancelEditingProfile()
  }
})

const saveProfile = async () => {
  if (!isEditingProfile.value || profileSaving.value) return

  if (!profileForm.name.trim()) {
    setProfileStatus('error', '姓名不能为空。')
    return
  }

  profileSaving.value = true
  setProfileStatus('', '')

  try {
    const response = await $fetch('/mahjong/api/profile', {
      method: 'PUT',
      body: {
        name: profileForm.name.trim(),
        address: profileForm.address,
        dateOfBirth: profileForm.dateOfBirth,
        gender: profileForm.gender
      },
      headers: { 'Cache-Control': 'no-cache' }
    })

    if (response?.data) {
      profileResponse.value = response
    } else {
      await refreshProfile()
    }

    setProfileStatus('success', '资料更新成功。')
    isEditingProfile.value = false
  } catch (error) {
    setProfileStatus('error', error?.data?.message || error?.message || '更新失败，请重试。')
  } finally {
    profileSaving.value = false
  }
}

// old startNewGame and startPvEGame removed - replaced by openCreateModal + confirmCreateGame

const onJoinGame = () => navigateTo('/join-game')
const onMatchHistory = () => router.push('/history')
const goToAdminSandbox = () => navigateTo('/admin-test')

const exitGame = async () => {
  try {
    // 先通知服务端断开所有连接+清理
    await $fetch('/mahjong/api/auth/logout', {
      method: 'POST',
      headers: { 'Cache-Control': 'no-cache' }
    })
  } catch (e) {
    console.error('[Exit] logout API error:', e)
  }

  // 清理cookies
  useCookie('auth_token').value = null
  useCookie('user_id').value = null
  useCookie('user_name').value = null
  useCookie('is_admin').value = null
  useCookie('mahjong_session').value = null

  // 通过 Capacitor 退出APP
  if (process.client && typeof window !== 'undefined') {
    try {
      const { App } = await import('@capacitor/app')
      await App.exitApp()
    } catch {
      // 非Capacitor环境（浏览器调试）则跳转登录页
      await navigateTo('/login')
    }
  }
}
</script>

<style scoped>
.mahjong-page {
  min-height: 100dvh;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  background: radial-gradient(circle at top, #153b2f, #07130e);
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: #f5f5f5;
  width: 100%;
  padding: 0 10px 10px;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.mahjong-card {
  background: rgba(7, 19, 14, 0.9);
  border-radius: 18px;
  padding: 32px 40px;
  width: min(92vw, 520px);
  max-width: 520px;
  text-align: center;
  box-shadow: 0 18px 45px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.08);
  margin: 4px auto 0;
}

.admin-badge {
  color: #ff6b6b;
  font-size: 0.8em;
}

.mahjong-title {
  font-size: 2rem;
  margin-bottom: 4px;
  letter-spacing: 0.06em;
}

.mahjong-subtitle {
  font-size: 0.95rem;
  opacity: 0.9;
  margin-bottom: 24px;
}

.mahjong-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.mahjong-button {
  padding: 12px 24px;
  border-radius: 999px;
  border: none;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  font-weight: 600;
  font-size: 0.95rem;
  transition: transform 0.12s ease, box-shadow 0.12s ease, filter 0.12s ease;
}

.mahjong-button.primary {
  background: linear-gradient(135deg, #1f8a52, #46c574);
  color: #03100a;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.35);
}

.mahjong-button.primary:hover {
  transform: translateY(-1px);
  filter: brightness(1.05);
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.45);
}

.mahjong-button.secondary {
  background: rgba(22, 51, 40, 0.95);
  color: #e0f2e9;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.mahjong-button.secondary:hover {
  transform: translateY(-1px);
  filter: brightness(1.04);
}

.mahjong-button.danger {
  background: rgba(123, 26, 26, 0.9);
  color: #ffdada;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.mahjong-button.danger:hover {
  background: rgba(160, 38, 38, 1);
  transform: translateY(-1px);
}

.mahjong-hint {
  font-size: 0.85rem;
  opacity: 0.85;
}

.profile-modal-shell {
  width: min(560px, 100%);
  margin: 0 auto;
  padding: 0 8px 8px;
  box-sizing: border-box;
}

.profile-close-btn {
  border-radius: 999px;
}

.profile-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.profile-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.profile-full-row {
  width: 100%;
}

.profile-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 12px;
}

.profile-skeletons {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.skeleton-row {
  width: 100%;
}

@media (max-width: 600px) and (orientation: portrait) {
  .mahjong-card {
    padding: 24px 20px;
  }

  .mahjong-title {
    font-size: 1.6rem;
  }

  .mahjong-button {
    font-size: 0.85rem;
    padding: 10px 18px;
  }
}

@media (max-width: 400px) {
  .mahjong-card {
    padding: 20px 16px;
  }

  .mahjong-button {
    font-size: 0.8rem;
    padding: 8px 14px;
  }
}

@media (orientation: landscape) {
  .mahjong-page {
    min-height: 100dvh;
    padding: 0 8px 8px;
    align-items: stretch;
  }

  .mahjong-card {
    width: min(920px, 100%);
    max-width: 920px;
    min-height: calc(100dvh - 8px);
    padding: 22px 28px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    overflow: hidden;
    gap: 14px;
  }

  .mahjong-title {
    margin: 0;
    font-size: 2rem;
    text-align: center;
  }

  .mahjong-subtitle {
    margin: 0;
    text-align: center;
    font-size: 1rem;
  }

  .mahjong-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(220px, 280px));
    gap: 14px 18px;
    margin: 6px 0 0;
    justify-content: center;
    width: 100%;
    max-width: 620px;
  }

  .mahjong-button {
    width: 100%;
    min-height: 56px;
    font-size: 1rem;
  }

  .mahjong-hint {
    margin: 4px 0 0;
    text-align: center;
    max-width: 560px;
  }
}

/* ===== 创建房间弹窗 ===== */
.create-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(4px);
  padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-y;
}

.create-modal {
  background: linear-gradient(145deg, #1a2f25, #0d1f17);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 20px;
  padding: 32px;
  width: 640px;
  max-width: 95vw;
  max-height: 90vh;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-y;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
}

.create-title {
  color: #ffd700;
  font-size: 1.4rem;
  font-weight: 700;
  margin: 0 0 20px;
  text-align: center;
}

/* 左右两栏布局 */
.create-modal-body {
  display: flex;
  gap: 20px;
  flex: 1 1 auto;
  min-height: 0;
  overflow: visible;
}

.create-modal-left,
.create-modal-right {
  flex: 1;
  min-width: 0;
  padding-bottom: 4px;
}

@media (max-width: 600px) {
  .create-overlay {
    align-items: flex-start;
    justify-content: center;
    padding:
      max(12px, env(safe-area-inset-top))
      12px
      max(12px, env(safe-area-inset-bottom))
      12px;
  }

  .create-modal {
    width: 100%;
    max-width: 100%;
    max-height: none;
    margin: 0;
    padding: 18px 18px 96px;
    overflow: visible;
  }

  .create-modal-body {
    flex-direction: column;
    min-height: auto;
    overflow: visible;
  }
}

/* Sticky confirm button — stays visible at bottom on small screens */
@media (max-width: 600px) {
  .create-actions {
    position: sticky;
    bottom: calc(env(safe-area-inset-bottom) * -1);
    left: 0;
    right: 0;
    background: linear-gradient(to top, rgba(13, 31, 23, 0.98) 78%, rgba(13, 31, 23, 0));
    padding: 16px 18px calc(16px + env(safe-area-inset-bottom));
    margin: 0 -18px -96px;
    border-top: 1px solid rgba(255,255,255,0.06);
    display: flex;
    gap: 12px;
    z-index: 10;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }
}

/* 参数分组 */
.param-group {
  margin-bottom: 18px;
  padding-bottom: 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.param-group:last-of-type {
  border-bottom: none;
  margin-bottom: 12px;
}

.param-group-title {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.6);
  margin: 0 0 12px;
  font-weight: 600;
  letter-spacing: 0.05em;
}

/* 字段 */
.create-field {
  margin-bottom: 14px;
}

.field-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.field-header label {
  color: #e0e0e0;
  font-size: 0.9rem;
  font-weight: 600;
}

/* 帮助按钮 */
.help-btn {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.7rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  flex-shrink: 0;
}

.help-btn:hover {
  background: rgba(100, 200, 255, 0.15);
  border-color: rgba(100, 200, 255, 0.3);
  color: #64c8ff;
}

.help-btn--inline {
  margin-left: 6px;
}

/* 帮助气泡 */
.help-bubble {
  display: block;
  margin-top: 6px;
  padding: 8px 12px;
  background: rgba(100, 200, 255, 0.08);
  border: 1px solid rgba(100, 200, 255, 0.15);
  border-radius: 8px;
  font-size: 0.78rem;
  color: rgba(255, 255, 255, 0.75);
  line-height: 1.5;
  animation: helpFadeIn 0.15s ease-out;
}

@keyframes helpFadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

.create-field input {
  width: 100%;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(0, 0, 0, 0.3);
  color: #fff;
  font-size: 1rem;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.create-field input:focus {
  border-color: rgba(70, 197, 116, 0.6);
}

.create-field--checkbox {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.checkbox-label {
  display: flex !important;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-weight: 600 !important;
  margin-bottom: 0 !important;
}

.checkbox-label input[type="checkbox"] {
  width: 18px !important;
  height: 18px;
  accent-color: #46c574;
  cursor: pointer;
  flex-shrink: 0;
}

.create-field--checkbox .create-hint {
  flex-basis: 100%;
  margin-top: -8px;
}

.create-hint {
  display: block;
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.75rem;
  margin-top: 4px;
}

.create-actions {
  display: flex;
  gap: 12px;
  margin-top: 28px;
}

.create-btn {
  flex: 1;
  padding: 12px;
  border-radius: 12px;
  border: none;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}

.create-btn--cancel {
  background: rgba(255, 255, 255, 0.08);
  color: #ccc;
}

.create-btn--cancel:hover {
  background: rgba(255, 255, 255, 0.15);
}

.create-btn--start {
  background: linear-gradient(135deg, #1f8a52, #2eaa6a);
  color: #fff;
  box-shadow: 0 4px 16px rgba(70, 197, 116, 0.3);
}

.create-btn--start:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(70, 197, 116, 0.4);
}

.create-btn--start:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

/* AI玩家选择列表 */
/* AI选择展开按钮 */
.ai-toggle-btn {
  width: 100%;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.2);
  color: #e0e0e0;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
}
.ai-toggle-btn:hover {
  border-color: rgba(70, 197, 116, 0.3);
  background: rgba(70, 197, 116, 0.05);
}
.ai-count-badge {
  color: #46c574;
  font-weight: 700;
}

.ai-select-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 4px;
}

.ai-select-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.2);
  cursor: pointer;
  transition: all 0.2s;
}

.ai-select-item:hover {
  border-color: rgba(70, 197, 116, 0.3);
  background: rgba(70, 197, 116, 0.05);
}

.ai-select-item--active {
  border-color: rgba(70, 197, 116, 0.5);
  background: rgba(70, 197, 116, 0.1);
}

.ai-select-item input[type="checkbox"] {
  accent-color: #46c574;
  width: 16px;
  height: 16px;
}

.ai-select-name {
  color: #e0e0e0;
  font-weight: 600;
  font-size: 0.9rem;
}

.ai-select-desc {
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.75rem;
  margin-left: auto;
}
</style>
