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
          class="mahjong-button primary"
          :disabled="isCreatingGame"
          @click="openCreateModal(0)"
        >
          创建新局
        </button>

        <button
          class="mahjong-button primary"
          :disabled="isCreatingGame"
          @click="openCreateModal(3)"
        >
          人机大战
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

        <button class="mahjong-button secondary" @click="openProfileModal">
          个人资料
        </button>

        <button class="mahjong-button danger" @click="logout">
          退出登录
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

    <!-- 创建房间参数配置弹窗 -->
    <Teleport to="body">
      <div v-if="showCreateModal" class="create-overlay" @click.self="showCreateModal = false">
        <div class="create-modal">
          <h2 class="create-title">创建牌局</h2>

          <div class="create-field">
            <label>掷骰子次数上限</label>
            <input type="number" v-model.number="createParams.maxDiceRolls" min="1" max="10" />
            <span class="create-hint">默认2次，决定发牌起始位置</span>
          </div>

          <div class="create-field">
            <label>AI玩家</label>
            <div class="ai-select-list">
              <label
                v-for="bot in allAIBots"
                :key="bot.id"
                class="ai-select-item"
                :class="{ 'ai-select-item--active': selectedBots.includes(bot.id) }"
              >
                <input
                  type="checkbox"
                  :value="bot.id"
                  v-model="selectedBots"
                  :disabled="!selectedBots.includes(bot.id) && selectedBots.length >= 3"
                />
                <span class="ai-select-name">{{ bot.name }}</span>
                <span class="ai-select-desc">{{ bot.desc }}</span>
              </label>
            </div>
            <span class="create-hint">最多选择3个AI（{{ selectedBots.length }}/3）</span>
          </div>

          <div class="create-field">
            <label>冻结下家摸牌秒数</label>
            <input type="number" v-model.number="createParams.freezeSeconds" min="0" max="10" step="0.5" />
            <span class="create-hint">上家打牌后，下家等待时间（默认1秒）</span>
          </div>

          <div class="create-actions">
            <button class="create-btn create-btn--cancel" @click="showCreateModal = false">取消</button>
            <button class="create-btn create-btn--start" @click="confirmCreateGame" :disabled="isCreatingGame">
              {{ isCreatingGame ? '创建中...' : '开始' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
// 首页不需要SSR，避免水合期间按钮点击失效
definePageMeta({ ssr: false })

const userName = useCookie('user_name')
const isAdmin = useCookie('is_admin')
const router = useRouter()

const isAdminUser = computed(() => isAdmin.value === 'true' || isAdmin.value === true)
const isCreatingGame = ref(false)

// 创建房间参数弹窗
const showCreateModal = ref(false)
const createParams = reactive({
  maxDiceRolls: 2,
  freezeSeconds: 1
})

// AI玩家选择
const allAIBots = [
  { id: 'AI-小胖', name: 'AI-小胖', desc: '稳健型' },
  { id: 'AI-老赵', name: 'AI-老赵', desc: '进攻型' },
  { id: 'AI-阿水', name: 'AI-阿水', desc: '做大做强型' },
  { id: 'AI-AK', name: 'AI-AK', desc: '默认策略' },
  { id: 'AI-老蒋', name: 'AI-老蒋', desc: '均衡型' },
  { id: 'AI-小猪', name: 'AI-小猪', desc: '风险规避型' },
]
const selectedBots = ref<string[]>([])

const openCreateModal = (aiCount: number) => {
  // 人机大战默认选满3个
  selectedBots.value = aiCount > 0 ? allAIBots.slice(0, aiCount).map(b => b.id) : []
  showCreateModal.value = true
}

const confirmCreateGame = async () => {
  if (isCreatingGame.value) return
  isCreatingGame.value = true
  showCreateModal.value = false
  try {
    const response = await $fetch('/api/game/create', {
      method: 'POST',
      body: { playerName: userName.value || 'Player 1' },
      headers: { 'Cache-Control': 'no-cache' }
    })

    if (!response || !response.success) {
      console.error('[Create] Unexpected response:', response)
      return
    }

    const gameId = response.data?.gameId
    const playerId = response.data?.playerId
    if (!gameId) return

    // 加入选中的AI玩家
    for (const botId of selectedBots.value) {
      try {
        await $fetch('/api/game/join', {
          method: 'POST',
          body: { gameId, playerName: botId },
          headers: { 'Cache-Control': 'no-cache' }
        })
      } catch (e) {
        console.error('[Create] Bot join failed:', botId, e)
      }
    }

    navigateTo(`/gameroom/${gameId}?playerId=${playerId}&dice=${createParams.maxDiceRolls}&freeze=${createParams.freezeSeconds}`)
  } catch (e) {
    console.error('[Create] Error:', e)
  } finally {
    isCreatingGame.value = false
  }
}

const { data: profileResponse, pending: profilePending, error: profileError, refresh: refreshProfile } =
  useFetch('/api/profile', {
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
    const response = await $fetch('/api/profile', {
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

const logout = () => {
  const token = useCookie('auth_token')
  token.value = null
  return navigateTo('/login')
}
</script>

<style scoped>
.mahjong-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at top, #153b2f, #07130e);
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: #f5f5f5;
}

.mahjong-card {
  background: rgba(7, 19, 14, 0.9);
  border-radius: 18px;
  padding: 32px 40px;
  width: 90%;
  max-width: 520px;
  text-align: center;
  box-shadow: 0 18px 45px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.08);
  margin: 0 auto;
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

@media (max-width: 600px) {
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

/* ===== 创建房间弹窗 ===== */
.create-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.create-modal {
  background: linear-gradient(145deg, #1a2f25, #0d1f17);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 20px;
  padding: 32px;
  width: 360px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.create-title {
  color: #ffd700;
  font-size: 1.4rem;
  font-weight: 700;
  margin: 0 0 24px;
  text-align: center;
}

.create-field {
  margin-bottom: 20px;
}

.create-field label {
  display: block;
  color: #e0e0e0;
  font-size: 0.9rem;
  font-weight: 600;
  margin-bottom: 6px;
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