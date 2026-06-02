<template>
  <div class="mahjong-page" :class="[
    { 'layout-debug': showDebugPanel, 'mobile-portrait': shouldRotateView },
    { 'layout--mobile-landscape': isMobileLandscapeMode || shouldRotateView },
    { 'layout--desktop': !isMobileViewport }
  ]" :style="mobileLayoutStyle">
    <div class="room-viewport" :class="{ 'room-viewport--rotated': shouldRotateView }">
      <div class="room-container" :class="{ 'room-container--rotated': shouldRotateView, 'room-container--mobile-landscape': isMobileLandscapeMode }">
      <header class="room-header" :class="{ 'room-header--collapsed': isTopBarCollapsed }">
        <button
          class="room-header-toggle"
          :class="{ 'room-header-toggle--collapsed': isTopBarCollapsed }"
          @click="toggleTopBar"
          :aria-expanded="String(!isTopBarCollapsed)"
          :title="isTopBarCollapsed ? '展开顶部栏' : '收起顶部栏'"
        >
          <span class="room-header-toggle__icon">{{ isTopBarCollapsed ? '▼' : '▲' }}</span>
          <span class="room-header-toggle__label">{{ isTopBarCollapsed ? '展开菜单' : '收起菜单' }}</span>
        </button>

        <div v-show="!isTopBarCollapsed" class="room-header-content">
          <div class="room-info">
            <div class="room-title-line">
              <h1 class="mahjong-title">长清阁麻将</h1>
              <span class="round-info-header" v-if="currentRound > 0">{{ roundDisplay }}</span>
            </div>
          </div>

          <div class="header-actions">
            <button ref="settingsBtnEl" class="mahjong-button small secondary" @click="toggleSettingsPanel">
              ⚙️ 设置
            </button>
            <button class="mahjong-button small secondary" @click="navigateTo('/rules')">
              📖 规则
            </button>
            <button class="mahjong-button small" @click="backToLobby">
              返回大厅
            </button>
          </div>
        </div>
      </header>

      <main class="room-main">
        <!-- 加载遮罩：游戏状态未就绪时隐藏牌桌 -->
        <div v-if="!gameState" class="loading-overlay">
          <div class="loading-spinner"></div>
          <p class="loading-text">正在进入牌桌...</p>
        </div>
        <!-- 梁山聚义成功弹窗 -->
        <div v-if="showLiangShanOverlay" class="liang-shan-overlay">
          <div class="liang-shan-card">
            <div class="liang-shan-icon">🔥🔥🔥</div>
            <p class="liang-shan-title">聚义成功，共上梁山！</p>
            <p class="liang-shan-sub">本局结束 · 下把翻倍</p>
          </div>
        </div>

        <!-- 造反亮手牌弹窗 -->
        <div v-if="rebelEvent" class="rebel-overlay">
          <div class="rebel-card">
            <div class="rebel-icon">⚔️🀄</div>
            <p class="rebel-title">{{ rebelEvent.playerName }} 造反了！！</p>
            <p class="rebel-hand-label">手牌：</p>
            <div class="rebel-hand-tiles">
              <span v-for="t in rebelEvent.hand" :key="t.id" class="rebel-tile" :class="'tile-' + t.suit + '-' + t.value">
                {{ t.suit === 'wan' ? '万' : t.suit === 'dots' ? '筒' : t.suit === 'tiao' ? '条' : t.suit === 'feng' ? ['东','南','西','北'][t.value-1] : ['中','发','白'][t.value-1] }}{{ t.suit === 'wan' || t.suit === 'dots' || t.suit === 'tiao' ? t.value : '' }}
              </span>
            </div>
            <div class="rebel-multiplier">即将下一局，翻倍！</div>
            <div class="rebel-countdown-wrap">
              <div class="rebel-countdown-bar" :style="{ width: rebelCountdownPercent + '%' }"></div>
              <span class="rebel-countdown-text">{{ rebelCountdownSec }}s</span>
            </div>
          </div>
        </div>

        <!-- 谢谢带头大哥弹窗 -->
        <div v-if="leadingBrotherEvent" class="leading-brother-overlay">
          <div class="leading-brother-card">
            <div class="lb-icon">🙏💰</div>
            <p class="lb-title">谢谢带头大哥！</p>
            <p class="lb-sub">{{ leadingBrotherEvent.firstPlayerName }} 连打同张，赔付三家各10分</p>
          </div>
        </div>

        <!-- 通用审批流程弹窗（给被审批的高优先级玩家） -->
        <div v-if="showApprovalOverlay && actionApprovalEvent && actionApprovalEvent.candidatePlayerId === currentPlayer?.id" class="approval-overlay">
          <div class="approval-card">
            <div class="approval-icon">⚡🀄</div>
            <p class="approval-title">{{ actionApprovalEvent.requesterAction === '吃' ? '吃碰/胡冲突' : actionApprovalEvent.requesterAction === '碰' ? '碰胡冲突' : '杠胡冲突' }}！</p>
            <p class="approval-sub">{{ actionApprovalEvent.requesterName }} 要{{ actionApprovalEvent.requesterAction }}这张牌</p>
            <p class="approval-question">你要用{{ actionApprovalEvent.availableActions.map(a => a === 'hu' ? '胡' : a === 'peng' ? '碰' : '杠').join('/') }}吗？</p>
            <!-- 3秒倒计时 -->
            <div class="approval-countdown" :class="{ 'approval-countdown--urgent': approvalCountdownRatio < 0.3 }">
              <div class="approval-countdown-bar" :style="{ width: `${approvalCountdownRatio * 100}%` }"></div>
              <span class="approval-countdown-text">{{ approvalCountdownSec }}s</span>
            </div>
            <div class="approval-buttons">
              <button
                v-if="actionApprovalEvent.availableActions.includes('hu')"
                class="approval-btn approval-btn--hu"
                @click="onApprovalChoice('hu')"
              >胡！</button>
              <button
                v-if="actionApprovalEvent.availableActions.includes('kong')"
                class="approval-btn approval-btn--kong"
                @click="onApprovalChoice('kong')"
              >杠！</button>
              <button
                v-if="actionApprovalEvent.availableActions.includes('peng')"
                class="approval-btn approval-btn--peng"
                @click="onApprovalChoice('peng')"
              >碰！</button>
              <button class="approval-btn approval-btn--pass" @click="onApprovalChoice('pass')">算了，给他{{ actionApprovalEvent.requesterAction }}</button>
            </div>
          </div>
        </div>

        <!-- 审批等待提示（给低优先级玩家） -->
        <div v-if="showApprovalOverlay && actionApprovalEvent && actionApprovalEvent.candidatePlayerId !== currentPlayer?.id && isMyApprovalWaiting" class="approval-waiting-overlay">
          <div class="approval-waiting-card">
            <div class="approval-waiting-icon">⏳</div>
            <p class="approval-waiting-text">等待其他家做决定...</p>
            <p class="approval-waiting-sub">你{{ actionApprovalEvent.requesterAction }}了这张牌，等待{{ actionApprovalEvent.availableActions.map(a => a === 'hu' ? '胡' : a === 'peng' ? '碰' : '杠').join('/') }}</p>
          </div>
        </div>

        <!-- 容我想一想弹窗 -->
        <div v-if="spectatorApprovalRequest" class="approval-overlay">
          <div class="approval-card">
            <div class="approval-icon">👁️</div>
            <p class="approval-title">观赛申请</p>
            <p class="approval-sub">{{ spectatorApprovalRequest.requesterName }} 想查看你的手牌</p>
            <p class="approval-question">是否同意本局向 TA 开放你的观赛视角？</p>
            <div class="approval-buttons">
              <button class="approval-btn approval-btn--peng" @click="onSpectatorApprovalChoice('approve')">同意</button>
              <button class="approval-btn approval-btn--pass" @click="onSpectatorApprovalChoice('reject')">拒绝</button>
            </div>
          </div>
        </div>

        <div v-if="showThinkOptions" class="think-overlay">
          <div class="think-card">
            <div class="think-icon">🧠</div>
            <p class="think-title">容我想一想</p>
            <p class="think-sub">选择你的操作：</p>
            <div class="think-options">
              <button
                v-for="opt in thinkOptions"
                :key="opt.action"
                class="think-opt"
                :class="opt.cssClass"
                @click="onThinkOption(opt.action)"
              >{{ opt.label }}</button>
            </div>
          </div>
        </div>

        <div v-if="showChowPicker" class="chow-picker-overlay" @click.self="onCancelChowPicker">
          <div class="chow-picker-card">
            <h3 class="chow-picker-title">选择吃牌组合</h3>
            <p class="chow-picker-sub">这张牌有多种吃法，请先选择组合。</p>
            <div class="chow-picker-options">
              <button
                v-for="(option, index) in chowOptions"
                :key="option.tileIds.join('-')"
                class="chow-picker-option"
                :class="{ 'chow-picker-option--selected': selectedChowOption === index }"
                @click="selectedChowOption = index"
              >
                <div class="chow-picker-tiles">
                  <MahjongTile v-for="tile in option.previewTiles" :key="tile.id" :tile="tile" :size="26" />
                </div>
                <span class="chow-picker-label">{{ option.label }}</span>
              </button>
            </div>
            <div class="chow-picker-actions">
              <button class="mahjong-button small secondary" @click="onCancelChowPicker">取消</button>
              <button class="mahjong-button small" :disabled="selectedChowOption === null" @click="onConfirmChowPicker">确认吃牌</button>
            </div>
          </div>
        </div>

        <!-- 胡牌选择面板 -->
        <div v-if="showHuPanel" class="hu-panel-overlay" @click.self="onCancelHu">
          <div class="hu-panel">
            <h3 class="hu-panel-title">🀄 选择胡牌牌型</h3>
            <div class="hu-combos">
              <div
                v-for="(opt, idx) in activeHuOptions"
                :key="idx"
                class="hu-combo"
                :class="{ 'hu-combo--selected': selectedHuCombo === idx }"
                @click="selectedHuCombo = idx"
              >
                <div class="hu-combo-header">
                  <span class="hu-combo-rank">TOP {{ idx + 1 }}</span>
                  <span class="hu-combo-label">{{ opt.label.replace(/·自摸|·捉冲|\\\\(无百搭×2\\\\)/g, '') }}</span>
                  <span class="hu-combo-method">{{ opt.type === 'self_draw' ? '自摸' : '捉冲' }}</span>
                  <span class="hu-combo-score">总赢 {{ getHuOptionTotalWin(opt) }}</span>
                </div>
                <div class="hu-combo-formula">{{ getHuOptionFormula(opt) }}</div>
                <div v-if="formatHuOptionGroups(opt)" class="hu-group-list">
                  <div class="hu-group">
                    <span class="hu-group-tiles-text">{{ formatHuOptionGroups(opt) }}</span>
                  </div>
                </div>
                <div class="hu-summary-grid">
                  <div class="hu-summary-item">
                    <span class="hu-summary-key">基础番数/固定点数</span>
                    <span class="hu-summary-value">{{ getHuOptionDisplaySummary(opt).base }}</span>
                  </div>
                  <div class="hu-summary-item">
                    <span class="hu-summary-key">额外倍数</span>
                    <span class="hu-summary-value">×{{ getHuOptionDisplaySummary(opt).extra }}</span>
                  </div>
                  <div class="hu-summary-item">
                    <span class="hu-summary-key">全局倍数</span>
                    <span class="hu-summary-value">×{{ getHuOptionDisplaySummary(opt).global }}</span>
                  </div>
                  <div class="hu-summary-item">
                    <span class="hu-summary-key">房间结算倍数</span>
                    <span class="hu-summary-value">×{{ getHuOptionDisplaySummary(opt).settlement }}</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="hu-panel-actions">
              <button v-if="!isHuReviewMode" class="hu-confirm-btn" @click="onConfirmHu(selectedHuCombo ?? 0)" :disabled="selectedHuCombo === null">
                🀄 确认胡牌
              </button>
              <button class="hu-cancel-btn" @click="onCancelHu">取消</button>
            </div>
          </div>
        </div>

        <div v-if="isOverlayVisible" class="game-over-overlay">
          <div class="game-over-card" :class="{ 'game-over-card--draw': isDrawOverlay }">
            <p class="overlay-title">{{ isDrawOverlay ? '流局！下把翻倍！' : overlayTitle }}</p>
            <p class="overlay-message">{{ overlayMessage }}</p>
            <!-- 非流局时显示玩家结算列表 -->
            <ul v-if="!isDrawOverlay && playerResults.length" class="overlay-results">
              <li v-for="player in playerResults" :key="player.id" class="overlay-result-item">
                <div>
                  <span class="result-rank" :class="{ 'rank-winner': player.isWinner }">{{ player.rankLabel }}</span>
                  <span class="result-name">{{ player.name }}</span>
                </div>
                <div class="result-meta">
                  <span class="result-score" :class="player.scoreClass">{{ player.scoreLabel }}</span>
                  <span class="result-status">{{ player.statusLabel }}</span>
                  <span v-if="player.winRoundLabel" class="result-round">{{ player.winRoundLabel }}</span>
                </div>
              </li>
            </ul>
            <p v-else-if="!isDrawOverlay" class="overlay-empty">游戏结果将在服务端结算后显示。</p>
            <!-- 自动进入下一局，无需手动点击 -->
            <div class="overlay-auto-next-hint">
              <span class="auto-next-spinner"></span>
              <span>即将进入下一局...</span>
            </div>
          </div>
        </div>


        <!-- 结算面板 -->
        <div v-if="drawBlockedNoticeVisible" class="draw-blocked-notice">
          {{ drawBlockedNoticeText }}
        </div>

        <!-- [2026-05-29] 验牌亮牌阶段 -->
        <div v-if="showWinnerReveal" class="reveal-phase-overlay">
          <div class="reveal-phase-text">亮牌验牌</div>
          <div class="reveal-phase-countdown">{{ revealCountdown }}s</div>
        </div>

        <div v-if="showSettlement" class="settle-overlay">
  <div class="settle-panel">
    <template v-if="!settleFinalMode">
    <h2 class="settle-title-center">{{ isWallExhaustedSettlement ? '💨 流局了，下把翻倍！！' : '本局输赢' }}</h2>

    <div class="settle-rounds settle-rounds--single">
      <div class="settle-round-card">
        <div v-if="currentSettlementRound" class="settle-round-header">
          <span>第 {{ settlementRoundIndex }} 局</span>
          <span>全局倍数 ×{{ currentSettlementRound.effectiveMultiplier }} / 结算倍数 ×{{ currentSettlementRound.settlementMultiplier }}</span>
        </div>
        <div class="settle-round-block">
          <div class="settle-table-wrap">
            <table class="settle-round-table settle-round-table--compact">
              <thead>
                <tr>
                  <th>玩家</th>
                  <th>胡序</th>
                  <th>牌型</th>
                  <th>花</th>
                  <th>番数</th>
                  <th>门清</th>
                  <th>百搭</th>
                  <th>自摸/捉冲</th>
                  <th>总输赢</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in currentSettlementRows"
                  :key="'current-settle-row-' + row.playerId"
                  :class="{ 'settle-round-table-row--winner': row.isWinner }"
                >
                  <td>{{ row.playerName }}</td>
                  <td>{{ row.winSequence }}</td>
                  <td>{{ row.handType }}</td>
                  <td>{{ row.flowerCount }}</td>
                  <td>{{ row.baseFan }}</td>
                  <td>{{ row.menQing }}</td>
                  <td>{{ row.wild }}</td>
                  <td>{{ row.winMode }}</td>
                  <td :class="{ 'settle-round-positive': row.score > 0, 'settle-round-negative': row.score < 0 }">
                    {{ row.scoreLabel }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
    </template>



    <div class="settle-actions">
      <!-- 第一阶段：本局输赢（独面板） -->
      <div v-if="!settleFinalMode">
        <div style="display:flex;align-items:center;justify-content:space-between;width:100%;margin-bottom:8px">
          <div class="auto-next-countdown" style="display:flex;align-items:center;gap:8px;font-size:0.85rem;opacity:0.8">
            <span class="auto-next-spinner"></span>
            <span>倒计时 {{ wallExhaustedCountdown }}s 后{{ isSettleRequested ? '显示最终结算' : '自动下一局' }}</span>
          </div>
          <div style="display:flex;gap:8px">
            <button v-if="canReviewHuSelection" class="settle-save-btn settle-save-btn--secondary" @click="openHuReviewPanel">
              回看胡牌选择
            </button>
            <button class="settle-save-btn" @click="isSettleRequested ? finishSettleToFinal() : startNextRound()">
              {{ isSettleRequested ? '查看最终结算' : '下一局' }}{{ wallExhaustedCountdown > 0 ? ' (' + wallExhaustedCountdown + 's)' : '' }}
            </button>
          </div>
        </div>
      </div>
      <!-- 第二阶段：最终结算（独面板，表格化列对齐） -->
      <div v-if="settleFinalMode" class="final-settle-panel">
        <h3 class="settle-title-center" style="font-size:1.1rem;margin-bottom:14px;color:#ffd700">🎯 最终结算</h3>
        <div class="settle-table-wrap">
          <table class="settle-round-table settle-round-table--compact settle-round-table--final">
            <thead>
              <tr>
                <th>玩家</th>
                <th style="color:#ffd700;font-weight:800">总输赢</th>
                <th style="color:#ffd700;font-weight:800">有效输赢</th>
                <th>🤖 vs AI</th>
                <th>🀄 自摸</th>
                <th>🎯 捉冲</th>
                <th class="settle-detail-stat--win">最大赢</th>
                <th class="settle-detail-stat--loss">最大输</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="stat in sortedSettleStats" :key="stat.id">
                <td>{{ stat.name }}</td>
                <td :style="{ color: (stat.totalScore ?? 0) > 0 ? '#4caf50' : (stat.totalScore ?? 0) < 0 ? '#ff6b6b' : '#fff' }">{{ (stat.totalScore ?? 0) > 0 ? '+' : '' }}{{ stat.totalScore ?? 0 }}</td>
                <td :style="{ color: (stat.effectiveScore ?? 0) > 0 ? '#ffd700' : (stat.effectiveScore ?? 0) < 0 ? '#ff6b6b' : '#fff', fontWeight: 800 }">{{ (stat.effectiveScore ?? stat.totalScore ?? 0) > 0 ? '+' : '' }}{{ stat.effectiveScore ?? stat.totalScore ?? 0 }}</td>
                <td>{{ stat.vsAiScore ?? 0 }}</td>
                <td>{{ stat.selfDraws ?? 0 }}</td>
                <td>{{ stat.discards ?? 0 }}</td>
                <td style="color:#4caf50">+{{ stat.maxWin ?? 0 }}</td>
                <td style="color:#ff6b6b">{{ stat.maxLoss ?? 0 }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p style="text-align:center;font-size:0.72rem;opacity:0.5;margin-top:10px">有效输赢 = 仅统计纯真人局的输赢，排除与AI对战的部分</p>
        <div style="display:flex;gap:8px;justify-content:center;margin-top:14px">
          <button class="settle-save-btn" @click="onExitSettle">退出</button>
        </div>
      </div>
    </div>
  </div>
</div>

        <!-- 胡牌玩家手牌展示已移除，直接进本局输赢 -->

        <!-- 设置面板（悬浮玻璃态，定位在设置按钮下方） -->
        <Teleport to="body">
          <div v-if="showSettings" class="glass-settings-overlay" @click="showSettings = false" @touchstart="showSettings = false"></div>
          <Transition name="settings-panel" @after-leave="onSettingsClosed">
            <div
              v-if="showSettings"
              ref="settingsPanelEl"
              class="glass-settings-panel"
              :style="settingsPanelStyle"
              @click.stop
              @wheel.stop
              @touchmove.stop
            >
              <!-- 三角指示箭头 -->
              <div class="glass-settings-arrow"></div>
                            <div class="glass-settings-body" @wheel.stop @touchmove.stop>
                <div class="glass-settings-section">
                  <div class="glass-settings-section-header">
                    <div class="glass-settings-section-title">对局操作</div>
                    <div class="glass-settings-section-subtitle">只保留正在生效的出牌与音效控制</div>
                  </div>
                  <div class="glass-settings-stack">
                    <div class="glass-settings-row glass-settings-row--panel" @click="toggleSound">
                      <div class="glass-settings-row-main">
                        <span class="glass-settings-icon">{{ soundEnabled ? '🔊' : '🔇' }}</span>
                        <div class="glass-settings-copy">
                          <span class="glass-settings-label">总音效</span>
                          <span class="glass-settings-help">控制摸牌、碰杠胡、广播提示等音效播放</span>
                        </div>
                      </div>
                      <div class="glass-toggle" :class="{ 'glass-toggle--on': soundEnabled }">
                        <div class="glass-toggle-knob"></div>
                      </div>
                    </div>
                    <div class="glass-settings-row glass-settings-row--panel" @click="autoDraw = !autoDraw">
                      <div class="glass-settings-row-main">
                        <span class="glass-settings-icon">{{ autoDraw ? '🤖' : '👆' }}</span>
                        <div class="glass-settings-copy">
                          <span class="glass-settings-label">自动摸牌</span>
                          <span class="glass-settings-help">无其他可选操作时，自动摸牌（减少点击）</span>
                        </div>
                      </div>
                      <div class="glass-toggle" :class="{ 'glass-toggle--on': autoDraw }">
                        <div class="glass-toggle-knob"></div>
                      </div>
                    </div>
                    <div class="glass-settings-card">
                      <div class="glass-settings-card-title">出牌方式</div>
                      <div class="glass-settings-card-subtitle">移动端支持双击、点选确认、拖拽出牌</div>
                      <div class="glass-theme-options">
                        <button class="glass-theme-chip" :class="{ 'glass-theme-chip--active': discardMode === 'double_tap' }" @click="setDiscardMode('double_tap')">双击</button>
                        <button class="glass-theme-chip" :class="{ 'glass-theme-chip--active': discardMode === 'tap_confirm' }" @click="setDiscardMode('tap_confirm')">点选确认</button>
                        <button class="glass-theme-chip" :class="{ 'glass-theme-chip--active': discardMode === 'drag' }" @click="setDiscardMode('drag')">拖拽出牌</button>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="glass-settings-section">
                  <div class="glass-settings-section-header">
                    <div class="glass-settings-section-title">语音与音乐</div>
                    <div class="glass-settings-section-subtitle">语音音量和背景音乐在同一区块内集中管理</div>
                  </div>
                  <div class="glass-settings-stack">
                    <div class="glass-settings-card">
                      <div class="glass-settings-card-title">出牌语音</div>
                      <div class="glass-settings-select-wrap glass-settings-select-wrap--compact">
                        <div class="glass-settings-select-label">语音音色</div>
                        <select class="glass-settings-select" :value="currentScheme" @change="onChangeVoiceScheme">
                          <option value="bingtang">冰糖</option>
                          <option value="baihua">白桦</option>
                        </select>
                      </div>
                      <div class="glass-settings-select-wrap glass-settings-select-wrap--compact">
                        <div class="glass-settings-select-label">语音音量 {{ voiceVolumePercent }}%</div>
                        <input class="glass-settings-range" type="range" min="0" max="100" step="1" :value="voiceVolumePercent" @input="onChangeVoiceVolume" />
                      </div>
                    </div>
                    <div class="glass-settings-card">
                      <div class="glass-settings-card-title">背景音乐</div>
                      <div class="glass-settings-row glass-settings-row--panel" @click="setBackgroundMusicEnabled(!bgmEnabled)">
                        <div class="glass-settings-row-main">
                          <span class="glass-settings-icon">{{ bgmEnabled ? '🎶' : '🔇' }}</span>
                          <div class="glass-settings-copy">
                            <span class="glass-settings-label">背景音乐开关</span>
                            <span class="glass-settings-help">控制牌桌内循环播放的曲目</span>
                          </div>
                        </div>
                        <div class="glass-toggle" :class="{ 'glass-toggle--on': bgmEnabled }">
                          <div class="glass-toggle-knob"></div>
                        </div>
                      </div>
                      <div class="glass-settings-select-wrap glass-settings-select-wrap--compact">
                        <div class="glass-settings-select-label">曲目</div>
                        <select class="glass-settings-select" :value="bgmCurrentTrackId || ''" @change="onChangeBgmTrack">
                          <option value="" disabled>选择背景音乐</option>
                          <option v-for="track in bgmTracks" :key="track.id" :value="track.id">{{ track.label }}</option>
                        </select>
                      </div>
                      <div class="glass-settings-select-wrap glass-settings-select-wrap--compact">
                        <div class="glass-settings-select-label">循环方式</div>
                        <select class="glass-settings-select" :value="bgmLoopMode" @change="onChangeBgmLoopMode">
                          <option value="single">单曲循环</option>
                          <option value="all">列表循环</option>
                          <option value="shuffle">随机循环</option>
                        </select>
                      </div>
                      <div class="glass-settings-select-wrap glass-settings-select-wrap--compact">
                        <div class="glass-settings-select-label">音乐音量 {{ bgmVolumePercent }}%</div>
                        <input class="glass-settings-range" type="range" min="0" max="100" step="1" :value="bgmVolumePercent" @input="onChangeBgmVolume" />
                      </div>
                      <div class="glass-settings-music-actions">
                        <button class="glass-theme-chip" type="button" @click="toggleBgmPlayback">{{ bgmIsPlaying ? '暂停' : '播放' }}</button>
                        <button class="glass-theme-chip" type="button" @click="playNextBackgroundTrack">下一首</button>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="glass-settings-section">
                  <div class="glass-settings-section-header">
                    <div class="glass-settings-section-title">牌桌外观</div>
                    <div class="glass-settings-section-subtitle">桌布与牌背分开归类，层次更清楚</div>
                  </div>
                  <div class="glass-settings-stack">
                    <div class="glass-settings-card">
                      <div class="glass-settings-card-title">桌布方案</div>
                      <div class="glass-theme-options">
                        <button class="glass-theme-chip" :class="{ 'glass-theme-chip--active': tableTheme === 'classic-green' }" @click="setTableTheme('classic-green')">经典绿</button>
                        <button class="glass-theme-chip" :class="{ 'glass-theme-chip--active': tableTheme === 'jade-green' }" @click="setTableTheme('jade-green')">翡翠青</button>
                        <button class="glass-theme-chip" :class="{ 'glass-theme-chip--active': tableTheme === 'royal-red' }" @click="setTableTheme('royal-red')">赤金红</button>
                      </div>
                    </div>
                    <div class="glass-settings-card">
                      <div class="glass-settings-card-title">牌背颜色</div>
                      <div class="glass-theme-options">
                        <button class="glass-theme-chip" :class="{ 'glass-theme-chip--active': tileBackScheme === 0 }" @click="setTileBackScheme(0)">原版绿</button>
                        <button class="glass-theme-chip" :class="{ 'glass-theme-chip--active': tileBackScheme === 1 }" @click="setTileBackScheme(1)">象牙白</button>
                        <button class="glass-theme-chip" :class="{ 'glass-theme-chip--active': tileBackScheme === 2 }" @click="setTileBackScheme(2)">卡布里蓝</button>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="glass-settings-footer">
                  <span>长青阁麻将 v2.2</span>
                </div>
              </div>
            </div>
          </Transition>
        </Teleport>

        <!-- Big responsive table -->
        <div class="table-wrapper">
          <div class="mahjong-table">
            <!-- 绿色桌布内层 -->
            <div class="table-felt" :class="`table-felt--${tableTheme}`">
            <!-- 左上角: 轮次信息 -->
            <!-- 十字定位标志 -->
            <div class="cross-marker">
              <div class="cross-h"></div>
              <div class="cross-v"></div>
            </div>
            <!-- 中心金色圆环 -->
            <div class="center-glow"></div>
          <!-- 状态消息（桌面中心，已迁移到扩展区） -->

            <!-- 玩家名称标注（固定位置，不挤其他容器） -->
            <div class="player-name-label player-name-label--top" v-if="topPlayer" @click="onPlayerNameClick(topPlayer)">
              {{ topPlayer.name }}
              <span v-if="northIsWinner" class="winner-tag">胡</span>
            </div>
            <div class="player-name-label player-name-label--left" v-if="leftPlayer" @click="onPlayerNameClick(leftPlayer)">
              {{ leftPlayer.name }}
              <span v-if="westIsWinner" class="winner-tag">胡</span>
            </div>
            <div class="player-name-label player-name-label--right" v-if="rightPlayer" @click="onPlayerNameClick(rightPlayer)">
              {{ rightPlayer.name }}
              <span v-if="eastIsWinner" class="winner-tag">胡</span>
            </div>
            <!-- 桌面中心: 弃牌池 + 牌墙 + 倍数 -->
            <TableCenter
              :remaining-tiles="remainingTileCount"
              :status-message="turnMessage"
              hint-message="点击选牌，再次点击出牌。操作按钮将根据规则自动显示。"
              :is-winner="isWinner"
              :round-multiplier="roundMultiplier"
              :global-multiplier="globalMultiplier"
              :wild-tile="wildTile"
            />

            <!-- 牌墙（四面）：对家和自家的牌墙需要 TileWall -->
            <TileWall :remaining="remainingTileCount" :tile-back-scheme="tileBackScheme" />

            <!-- 弃牌区（4个独立位置） -->
            <DiscardZone
              position="bottom"
              :tiles="playerDiscards"
              :is-winner="isWinner"
              :latest-tile-id="selfLatestDiscardId"
            />
            <DiscardZone
              position="top"
              :tiles="northDiscards"
              :is-winner="northIsWinner"
              :latest-tile-id="northLatestDiscardId"
            />
            <DiscardZone
              position="left"
              :tiles="westDiscards"
              :is-winner="westIsWinner"
              :latest-tile-id="westLatestDiscardId"
            />
            <DiscardZone
              position="right"
              :tiles="eastDiscards"
              :is-winner="eastIsWinner"
              :latest-tile-id="eastLatestDiscardId"
            />

            </div>

            <!-- Top player -->
            <div class="seat seat-top" :class="{ 'seat-active': activePosition !== null && topPlayer?.position === activePosition }">
              <PlayerOtherArea
                v-memo="[northAreaMemoKey, northJustDrawnTileId, northIsWinner, tileBackScheme]"
                position="top"
                :hand="northHand"
                :melds="northMelds"
                :tile-back-scheme="tileBackScheme"
                :show-hand="isOpponentHandRevealed(topPlayer)"
                :is-winner="northIsWinner"
                :just-drawn-tile-id="northJustDrawnTileId"
                :player-colors="claimSourceColors"
                :viewer-position="currentPlayer?.position"
                :owner-position="topPlayer?.position"
              />
            </div>

            <!-- Left player -->
            <div class="seat seat-left" :class="{ 'seat-active': activePosition !== null && leftPlayer?.position === activePosition }">
              <PlayerOtherArea
                v-memo="[westAreaMemoKey, westJustDrawnTileId, westIsWinner, tileBackScheme]"
                position="left"
                :hand="westHand"
                :melds="westMelds"
                :tile-back-scheme="tileBackScheme"
                :show-hand="isOpponentHandRevealed(leftPlayer)"
                :is-winner="westIsWinner"
                :just-drawn-tile-id="westJustDrawnTileId"
                :player-colors="claimSourceColors"
                :viewer-position="currentPlayer?.position"
                :owner-position="leftPlayer?.position"
              />
            </div>

            <!-- Right player -->
            <div class="seat seat-right" :class="{ 'seat-active': activePosition !== null && rightPlayer?.position === activePosition }">
              <PlayerOtherArea
                v-memo="[eastAreaMemoKey, eastJustDrawnTileId, eastIsWinner, tileBackScheme]"
                position="right"
                :hand="eastHand"
                :melds="eastMelds"
                :tile-back-scheme="tileBackScheme"
                :show-hand="isOpponentHandRevealed(rightPlayer)"
                :is-winner="eastIsWinner"
                :just-drawn-tile-id="eastJustDrawnTileId"
                :player-colors="claimSourceColors"
                :viewer-position="currentPlayer?.position"
                :owner-position="rightPlayer?.position"
              />
            </div>

            <!-- Bottom (self) player -->
            <div class="seat seat-bottom">
              <div class="self-area-with-actions">
                <PlayerSelfArea v-if="!isSpectator"
                  name=""
                  :hand="playerHand"
                  :melds="playerMelds"
                  :tile-back-scheme="tileBackScheme"
                  :player-colors="claimSourceColors"
                  :just-drawn-tile-id="selfJustDrawnTileId"
                  :viewer-position="currentPlayer?.position"
                  :owner-position="currentPlayer?.position"
                  :selected-tile-id="selectedTileId"
                  :discard-mode="discardMode"
                  :drag-discard-threshold-px="dragDiscardThresholdPx"
                  :show-discard-confirm="discardMode === 'tap_confirm' && !!selectedTileId"
                  :is-winner="isWinner"
                  @tileClick="handleTileClick"
                  @tileDblclick="handleTileDblclick"
                  @tileDiscard="handleTileDiscard"
                />
                <!-- Spectator hint -->
                <div v-if="isSpectator" class="spectating-hint">
                  <span class="spectating-hint-icon">📺</span>
                  <span class="spectating-hint-text">正在观看 <strong>{{ watchingPlayerName }}</strong> 的手牌</span>
                  <button class="mahjong-button small" @click="backToLobby">退出观赛</button>
                </div>
                <!-- 动作按钮放在手牌右侧 -->
                <!-- 观赛模式不显示任何操作按钮 -->
                <div v-if="isSpectator" class="inline-action-buttons inline-action-buttons--spectator">
                  <div class="spectator-badge">📺 观赛中</div>
                </div>
                <div v-else-if="canReviewLatestHuSelection && !isAIControlled" class="inline-action-buttons inline-action-buttons--review">
                  <button
                    class="inline-action-btn inline-action-btn--review"
                    @click="openHuReviewPanel"
                  >回看胡牌选项</button>
                </div>
                <div v-if="isAIControlled" class="comeback-floating-bar">
                  <span class="comeback-label">🤖 AI托管中</span>
                  <button
                    class="inline-action-btn inline-action-btn--comeback"
                    @click="onPlayerBack"
                  >我回来了</button>
                </div>
                <div class="inline-action-buttons" v-else-if="isConnected && !isInteractionLocked" style="display:none">
                  <div v-if="actionWindowText" class="inline-action-timer">{{ actionWindowText }}</div>
                  <button
                    v-if="showChow"
                    class="inline-action-btn inline-action-btn--chow inline-action-btn--claim-pulse"
                    :disabled="isInteractionLocked"
                    @click="onChow"
                  >吃</button>
                  <button
                    v-if="showPeng"
                    class="inline-action-btn inline-action-btn--peng inline-action-btn--claim-pulse"
                    :disabled="isInteractionLocked"
                    @click="onPeng"
                  >碰</button>
                  <button
                    v-if="showKong || showConcealedKong || showExtendedKong"
                    class="inline-action-btn inline-action-btn--kong inline-action-btn--claim-pulse"
                    :disabled="isInteractionLocked"
                    @click="handleCircularAction('kong')"
                  >杠</button>
                  <!-- [Moved] Hu button is now in extra-actions-bar -->
                  <button
                    v-if="showRebel"
                    class="inline-action-btn inline-action-btn--rebel"
                    :class="{ 'inline-action-btn--frozen': thinkFreezeActive }"
                    :disabled="isInteractionLocked || thinkFreezeActive"
                    @click="onRebel"
                  >🚨造反</button>
                  <button
                    v-if="!isSpectator && !isAIControlled"
                    class="inline-action-btn inline-action-btn--bot-mode"
                    @click="onBotModeDirect"
                  >🤖托管</button>
                  <button
                    v-if="showLiangShanButton"
                    class="inline-action-btn inline-action-btn--liangshan"
                    :class="{ 'inline-action-btn--liangshan-voted': hasVotedLiangShan, 'inline-action-btn--frozen': thinkFreezeActive }"
                    :disabled="!canLiangShan || isInteractionLocked || hasVotedLiangShan || thinkFreezeActive"
                    @click="onLiangShan"
                  >🔥{{ hasVotedLiangShan ? '已聚义' : '梁山聚义' }}</button>
                  <div v-if="!showDraw && !showChow && !showPeng && !showKong && !showHu && !showConcealedKong && !showExtendedKong && !showRebel && !showLiangShanButton" class="inline-action-waiting">
                    等待中…
                  </div>
                </div>
                <div v-else-if="!isConnected" class="inline-action-buttons">
                  <div class="inline-action-waiting">连接中...</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 扩展信息区（右侧，高度=牌桌，宽度≈牌桌1/4） -->
        <aside class="extended-info-panel">

          <!-- 房间号 + 退房结算 -->
          <div v-if="gameState" class="room-header-row panel-room-header-row">
            <button
              class="room-header-toggle room-header-toggle--inline"
              :class="{ 'room-header-toggle--collapsed': isTopBarCollapsed }"
              @click="toggleTopBar"
              :aria-expanded="String(!isTopBarCollapsed)"
              :title="isTopBarCollapsed ? '展开菜单' : '收起菜单'"
            >
              <span class="room-header-toggle__icon">{{ isTopBarCollapsed ? '▼' : '▲' }}</span>
            </button>
            <p class="mahjong-subtitle panel-room-number">
              房间 #{{ gameState?.roomNumber || '????' }}
            </p>
            <button
              v-if="gameState?.phase === 'playing' && !isAIControlled && !isSpectator"
              class="settle-btn-header ai-takeover-btn"
              @click="onBotModeDirect"
            >🤖 AI托管</button>
            <button
              v-if="gameState?.phase === GamePhase.WAITING
                ? canManualStartWaitingGame
                : (gameState?.phase === 'playing' && !isAIControlled) || gameState?.phase === 'ended'"
              class="settle-btn-header"
              :class="{ 'start-game-glow': canManualStartWaitingGame, 'settle-btn--grayed': isSettleRequested }"
              :disabled="isGameStarting && gameState?.phase === GamePhase.WAITING"
              @click="gameState?.phase === GamePhase.WAITING ? onStartGame() : onRequestSettle()"
            >
              {{ gameState?.phase === GamePhase.WAITING
                ? (isGameStarting ? '⏳ 正在开始...' : '🀄 开始牌局')
                : '📊 退房结算' }}
            </button>
          </div>

          <div
            v-if="isMobileLandscapeMode && !isTopBarCollapsed"
            class="ext-section mobile-inline-menu"
          >
            <div class="mobile-inline-menu__actions">
              <button ref="settingsBtnEl" class="mahjong-button small secondary" @click="toggleSettingsPanel">
                ⚙️ 设置
              </button>
              <button class="mahjong-button small secondary" @click="navigateTo('/rules')">
                📖 规则
              </button>
              <button class="mahjong-button small" @click="backToLobby">
                返回大厅
              </button>
            </div>
          </div>

          <!-- 战绩统计 -->
          <RoomStats
            v-if="!isPreGameTransition"
            :players="statsPlayers"
            :current-round="currentRound"
            @name-click="onPlayerNameClick"
          />

          <!-- 牌局快讯 -->
          <GameBroadcast :messages="displayBroadcastMessages" />

          <div class="ext-section" v-if="isAdminUser">
            <h3 class="ext-title">调试</h3>
            <p class="ext-meta">阶段: {{ gameState?.phase }} · {{ gameState?.players.length }}人</p>
            <div v-if="gameState?.phase === 'waiting' && (gameState?.players.length || 0) < 4" style="margin-bottom:6px">
              <button class="mahjong-button panel-button small" @click="setupTestGame" :disabled="isInteractionLocked">
                添加机器人 → 掷骰子
              </button>
            </div>
            <button class="mahjong-button panel-button small" @click="refreshState" :disabled="isInteractionLocked">刷新</button>
            <button class="mahjong-button panel-button small" @click="toggleShowAllCards" :disabled="isInteractionLocked">
              {{ shouldRevealOpponents ? '隐藏手牌' : '显示手牌' }}
            </button>
            <div v-if="gameState?.phase === 'playing'" style="margin-top:8px">
              <p class="ext-meta" v-for="p in otherPlayers" :key="p.id">
                {{ p.name }}
                <button class="mahjong-button panel-button small" style="display:inline;padding:2px 8px;font-size:0.7rem;margin-left:4px"
                  @click="forceDiscard(p)"
                  :disabled="isInteractionLocked || gameState?.currentPlayerIndex !== p.position">
                  出牌
                </button>
              </p>
            </div>
          </div>

          <div class="ext-section" v-if="isAdminUser && canCheatHu">
            <button class="mahjong-button panel-button" @click="onCheatHu" :disabled="isInteractionLocked">
              测试胡牌
            </button>
          </div>

          <!-- 操作按钮区：等待态隐藏，避免空壳感；观赛模式隐藏 -->
          <div v-if="!isPreGameTransition && !isSpectator" class="action-buttons-panel">

              <!-- 听牌提示（左对齐紧贴操作按钮上方） -->
              <div class="ting-preview-section">
                <div class="ting-preview-label" role="button" tabindex="0" @click="onToggleTingPreview" @keydown.enter="onToggleTingPreview">
                  <span class="ting-preview-label__text">听牌</span>
                  <span class="ting-preview-label__toggle">{{ tingPreviewEnabled ? '✕' : '☰' }}</span>
                  <template v-if="tingPreviewEnabled">
                    <span class="ting-preview-label__colon">：</span>
                    <template v-if="tingPreviewItems.length">
                      <span
                        v-for="item in tingPreviewItems"
                        :key="item.key"
                        class="ting-preview-tile"
                        :class="{ 'ting-preview-tile--exhausted': item.isExhausted, 'ting-preview-tile--wild': item.key === 'wild' }"
                      >{{ item.label }}</span>
                    </template>
                    <span v-else class="ting-preview-label__hint">未听牌</span>
                  </template>
                </div>
              </div>

              <!-- 状态提示 -->
              <div v-if="thinkFreezeActive" class="turn-status-text">
                <template v-if="thinkFreezeActive">
                  🧠 {{ thinkFreezePlayerName }} 在思考中... {{ thinkFreezeCountdown }}s
                </template>
                </div>
              <CircularActionButtons
                :available-actions="filteredCircularAvailableActions"
                :is-connected="isConnected"
                :is-interaction-locked="isInteractionLocked"
                :is-paused="thinkFreezeActive && !isMyThinkFreezeOwner"
                :last-state-change-at="lastStateChangeAt"
                :now-ts="nowTs"
                :highlight-delay-ms="hesitationWindow"
                :freeze-until="actionVisualFreezeUntil"
                :hesitation-window="hesitationWindow"
                :think-remaining="thinkRemaining"
                :can-use-think="canUseThink"
                :has-voted-liangshan="hasVotedLiangShan"
                @action="handleCircularAction"
              />
              <!-- 更多特殊操作：常驻显示聚义/造反/倒计时 -->
              <div class="extra-actions-bar">
                <div class="extra-actions-group">
                  <button
                    class="extra-action-btn extra-action-btn--liangshan"
                    :disabled="canLiangShan === false || isInteractionLocked || !isConnected || hasVotedLiangShan || thinkFreezeActive"
                    @click="onLiangShan"
                  >🔥 {{ hasVotedLiangShan ? '已聚义' : '聚义' }}</button>
                  <button
                    class="extra-action-btn extra-action-btn--rebel"
                    :disabled="showRebel === false || isInteractionLocked || !isConnected || thinkFreezeActive"
                    @click="onRebel"
                  >🚨 造反</button>
                  <!-- 胡按钮已整合到 CircularActionButtons -->
                  <!--🏆 胡</button>-->
                  <span v-if="turnTimerActive && !isWinner && !isAIControlled" class="turn-timer-inline" :class="{ 'turn-timer--urgent': turnTimer <= 10 }">
                    ⏱ {{ turnTimer }}s
                  </span>
                </div>
              </div>
          </div>
        </aside>
      </main>


      <Teleport to="body">
        <DiceAnimation
          v-if="showDiceOverlay"
          :dice1="diceValues[0]"
          :dice2="diceValues[1]"
          :prev-dice1="prevDiceValues[0]"
          :prev-dice2="prevDiceValues[1]"
          :dealer-name="dealerName"
          :max-rolls="effectiveMaxRolls"
          :is-dealer="isDealer"
          :roll-trigger-key="diceRollTriggerKey"
          :reset-trigger="diceResetTrigger"
          @deal="onDealTiles"
          @roll="onRollDice"
        />
      </Teleport>

      <!-- 翻倍局骰子提醒 -->
      <Teleport to="body">
        <Transition name="fade-fast">
          <div v-if="showDoubleReminder" class="double-reminder-overlay">
            <div class="double-reminder-msg">{{ doubleReminderText }}</div>
          </div>
        </Transition>
      </Teleport>

      <!-- 玩家操作卡片（AI + 自己） -->
      <Teleport to="body">
        <Transition name="fade-fast">
          <div v-if="flowerReplacementNotice" class="flower-replace-overlay">
            <div class="flower-replace-chip">
              <span class="flower-replace-text">补花补上</span>
              <MahjongTile :tile="flowerReplacementNotice" />
            </div>
          </div>
        </Transition>
        <div v-if="showPlayerCard" class="ai-card-overlay" @click.self="showPlayerCard = false">
          <div class="ai-card">
            <div class="ai-card-header">
              <span class="ai-card-avatar">{{ isBotPlayer(playerCardPlayer) ? '🤖' : '🀄' }}</span>
              <span class="ai-card-name">{{ playerCardPlayer?.name }}</span>
            </div>
            <div class="ai-card-body">
              <!-- 自己的操作 -->
              <template v-if="playerCardPlayer?.id === currentPlayer?.id">
                <button class="ai-card-btn ai-card-btn--leave" @click="onTempLeave">
                  🪑 暂时离席
                  <span class="ai-card-hint">下把起身，位置空出</span>
                </button>
                <button class="ai-card-btn ai-card-btn--replace" @click="onBotMode">
                  🤖 托管
                  <span class="ai-card-hint">AI接管，继续游戏</span>
                </button>
              </template>
              <!-- AI的操作（任何人可点） -->
              <template v-else-if="isBotPlayer(playerCardPlayer)">
                <button
                  v-if="!isSpectator"
                  class="ai-card-btn ai-card-btn--spectate"
                  :disabled="!canUseSpectatorView"
                  @click="onSpectateFromCard"
                >
                  👁️ {{ spectatingId === playerCardPlayer?.id ? '取消观赛' : '观赛TA' }}
                  <span class="ai-card-hint">{{ canUseSpectatorView ? '查看对方手牌' : '当前条件下不可观赛' }}</span>
                </button>
                <button
                  v-if="isSpectator"
                  class="ai-card-btn ai-card-btn--replace"
                  :disabled="isReplacingBot"
                  @click="onRequestBotReplace(playerCardPlayer)"
                >
                  🙋 下局替换TA
                  <span class="ai-card-hint">此AI下局退出，你上位</span>
                </button>
                <button class="ai-card-btn ai-card-btn--leave" @click="onAILeave">
                  🚪 出局
                  <span class="ai-card-hint">下局移除该AI</span>
                </button>
                <button v-if="isSpectatorGamePlayer" class="ai-card-btn ai-card-btn--replace" @click="onAIReplace">
                  🙋 换我上
                  <span class="ai-card-hint">下局由你接替</span>
                </button>
              </template>
              <!-- 其他真人玩家的操作 -->
              <template v-else-if="playerCardPlayer?.id !== currentPlayer?.id">
                <button
                  v-if="!isSpectator"
                  class="ai-card-btn ai-card-btn--spectate"
                  :disabled="!canUseSpectatorView"
                  @click="onSpectateFromCard"
                >
                  👁️ {{ spectatingId === playerCardPlayer?.id ? '取消观赛' : '观赛TA' }}
                  <span class="ai-card-hint">{{ canUseSpectatorView ? '查看对方手牌' : '当前条件下不可观赛' }}</span>
                </button>
                <button v-if="canSwap" class="ai-card-btn ai-card-btn--swap" @click="onSwapPosition">
                  🔄 跟TA换位置
                  <span class="ai-card-hint">剩余 {{ mySwapInfo.remaining }} 次机会</span>
                </button>
              </template>
            </div>
            <button class="ai-card-close" @click="showPlayerCard = false">✕</button>
          </div>
        </div>
      </Teleport>
      </div>
    </div>
  </div>
  <!-- 布局热调面板 -->
  <LayoutDebugPanel v-if="showDebugPanel" @close="showDebugPanel = false" />
  <div v-if="showDebugPanel" style="position:fixed;top:4px;left:4px;z-index:99999;background:rgba(0,0,0,0.85);color:#0f0;font-size:10px;font-family:monospace;padding:3px 6px;border-radius:4px;pointer-events:none;white-space:pre;">
    {{ debugViewport }}
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch, provide } from 'vue'
import { App as CapacitorApp, type PluginListenerHandle } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { ScreenOrientation } from '@capacitor/screen-orientation'
import PlayerSelfArea from '~/components/PlayerSelfArea.vue'
import PlayerOtherArea from '~/components/PlayerOtherArea.vue'
import MahjongTile from '~/components/MahjongTile.vue'
import CircularActionButtons from '~/components/CircularActionButtons.vue'
import TableCenter from '~/components/TableCenter.vue'
import TileWall from '~/components/TileWall.vue'
import DiceAnimation from '~/components/DiceAnimation.vue'
import PlayerInfo from '~/components/PlayerInfo.vue'
import RoomStats from '~/components/RoomStats.vue'
import GameBroadcast from '~/components/GameBroadcast.vue'
import DiscardZone from '~/components/DiscardZone.vue'
import LayoutDebugPanel from '~/components/LayoutDebugPanel.vue'
import { useGame } from '~/composables/useGame'
import { useSound } from '~/composables/useSound'
import { primeSoundSynthAudio } from '~/composables/useSoundSynth'
import { useBackgroundMusic } from '~/composables/useBackgroundMusic'
import { useVoiceTile } from '~/composables/useVoiceTile'
import { buildDiscardGuardSnapshot, shouldReleasePendingDiscardGuard, type DiscardGuardSnapshot } from '~/utils/discardGuard'
import { collectClaimedDiscardIds, filterVisibleDiscards } from '~/utils/discardVisibility'
import { formatBeijingTime } from '~/utils/beijingTime'
import { ActionType, GamePhase, GameEndReason, type Tile, type Meld, type Player } from '~/types/game'

definePageMeta({ ssr: false })

const PENDING_ROOM_STORAGE_KEY = 'mahjong.pendingRoomTarget'
const clearPendingRoomTarget = () => {
  if (!process.client) return
  try {
    sessionStorage.removeItem(PENDING_ROOM_STORAGE_KEY)
  } catch {}
}
const getPendingRoomTarget = () => {
  if (!process.client) return null
  try {
    const raw = sessionStorage.getItem(PENDING_ROOM_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { targetUrl?: string; createdAt?: number }
    return typeof parsed?.targetUrl === 'string' ? parsed.targetUrl : null
  } catch {
    return null
  }
}
const getPendingPlayerIdForRoom = (room: string) => {
  const targetUrl = getPendingRoomTarget()
  if (!targetUrl || !process.client) return ''
  try {
    const parsed = new URL(targetUrl, window.location.origin)
    const targetRoomId = parsed.pathname.split('/').filter(Boolean).pop() || ''
    if (targetRoomId !== room) return ''
    return parsed.searchParams.get('playerId') || ''
  } catch {
    return ''
  }
}

const route = useRoute()
const router = useRouter()
const roomId = computed(() => String(route.params.roomId || ''))
const playerId = computed(() => {
  const routePlayerId = String(route.query.playerId || '')
  if (routePlayerId) return routePlayerId
  return getPendingPlayerIdForRoom(roomId.value)
})
const userName = useCookie<string | null>('user_name')
const isAdmin = useCookie<string | boolean | null>('is_admin')
const isAdminUser = computed(() => isAdmin.value === 'true' || isAdmin.value === true)

/** 观赛模式：URL带spectator=1 */
const isSpectator = computed(() => {
  return route.query.spectator === '1' || route.query.spectator === 'true'
})

/** 听牌提示功能：默认关闭，点击后启用 */
const tingPreviewEnabled = ref(false)
const tingPreviewText = computed(() => {
  if (!tingPreviewEnabled.value) return '未启用'
  if (!tingPreview.value) return '...'
  const winningTiles = tingPreview.value.winningTiles || []
  if (winningTiles.length > 0) return '已听牌'
  return '未听牌'
})
const onToggleTingPreview = async () => {
  if (!tingPreviewEnabled.value) {
    // 开启：请求听牌数据
    tingPreviewEnabled.value = true
    await refreshTingPreview()
  } else {
    // 关闭：清除听牌数据，后续刷新不再请求
    tingPreviewEnabled.value = false
    tingPreview.value = { isTing: false, winningTiles: [] }
  }
}

const {
    gameState,
    currentPlayer,
    currentRound,
    tingPreview,
    availableActions,
    isConnected,
    error,
    connect,
    disconnect,
    executeAction,
    beginGame,
    rollFirstDice,
    rollSecondDice,
    dealGame,
    refreshState,
    forceRefreshState,
    refreshTingPreview,
    replacePendingAction,
    isActionPending,
    roomDismissedReason,
    lastStateChangeAt,
    leadingBrotherEvent,
    actionApprovalEvent,
    rebelEvent
  } = useGame()

const backToLobby = () => {
  clearPendingRoomTarget()
  return navigateTo('/')
}

const { play: playSound, isEnabled: soundEnabled, setEnabled: setSoundEnabled } = useSound()
const {
  tracks: bgmTracks,
  enabled: bgmEnabled,
  loopMode: bgmLoopMode,
  currentTrackId: bgmCurrentTrackId,
  volume: bgmVolume,
  isPlaying: bgmIsPlaying,
  ensureInitialized: ensureBackgroundMusicInitialized,
  setEnabled: setBackgroundMusicEnabled,
  setLoopMode: setBackgroundMusicLoopMode,
  setTrack: setBackgroundMusicTrack,
  setVolume: setBackgroundMusicVolume,
  play: playBackgroundMusic,
  pause: pauseBackgroundMusic,
  next: playNextBackgroundTrack
} = useBackgroundMusic()

const toggleSound = () => {
  setSoundEnabled(!soundEnabled.value)
}
const bgmVolumePercent = computed(() => Math.round((bgmVolume.value ?? 0.5) * 100))
const voiceVolumePercent = computed(() => Math.round((currentVoiceVolume.value ?? 0.85) * 100))
const onChangeBgmTrack = (event: Event) => {
  setBackgroundMusicTrack((event.target as HTMLSelectElement).value)
}
const onChangeBgmLoopMode = (event: Event) => {
  setBackgroundMusicLoopMode((event.target as HTMLSelectElement).value as 'single' | 'all' | 'shuffle')
}
const onChangeBgmVolume = (event: Event) => {
  setBackgroundMusicVolume(Number((event.target as HTMLInputElement).value || 50) / 100)
}
const onChangeVoiceVolume = (event: Event) => {
  setVoiceVolume(Number((event.target as HTMLInputElement).value || 85) / 100)
}
const onChangeVoiceScheme = (event: Event) => {
  loadVoiceScheme((event.target as HTMLSelectElement).value as 'bingtang' | 'baihua')
}
const toggleBgmPlayback = () => {
  if (bgmIsPlaying.value) pauseBackgroundMusic()
  else playBackgroundMusic()
}
const {
  currentScheme,
  currentVoiceVolume,
  loadVoiceScheme,
  preloadAllTiles,
  playVoiceTile,
  playVoiceAction,
  primeVoiceAudio,
  setVoiceVolume
} = useVoiceTile()

const showAllCards = ref(false)
// 观赛者默认只看到牌背，除非点了显示手牌开关
const shouldRevealOpponents = computed(() => showAllCards.value)
const initialViewport = process.client
  ? { width: window.innerWidth, height: window.innerHeight }
  : { width: 1024, height: 768 }
const viewportWidth = ref(initialViewport.width)
const viewportHeight = ref(initialViewport.height)
const isPortrait = ref(initialViewport.height >= initialViewport.width)

// 缩放因子：以17Ultra(短边1200px)为基准1.0，其他设备按比例缩放
// 公式: Math.min(1, 1200 / shortSide)，避免比1200大的设备放大
// shortSide小于1200意味着设备CSS像素更少，元素自然更小，不需要缩
// shortSide大于1200意味着设备更"宽"，需缩小保持物理一致
// 限制最小值0.65，保护小屏设备
const shortSide = computed(() => Math.min(viewportWidth.value, viewportHeight.value))
const mobileScale = computed(() => {
  if (shortSide.value <= 0) return 1
  // 设计基准宽度1200px，scale = 设计短边 / 实际短边，只缩小不放大
  const ratio = 1200 / shortSide.value
  return Math.min(1, ratio)
})

// 手机模式判定：短边 <= 1600px 覆盖所有手机
const isMobileViewport = computed(() => shortSide.value <= 1600)

// 布局模式：竖屏旋转 / 横屏手机 / 平板桌面
const shouldRotateView = computed(() => isPortrait.value && isMobileViewport.value && shortSide.value <= 768)
const isMobileLandscapeMode = computed(() => !isPortrait.value && isMobileViewport.value)

// 横屏手机竖屏旋转模式下的 CSS 缩放变量
// 其他家手牌/门口牌/花牌：以1200px短边为基准，shortSide越小牌越小
// 直接用比例因子，CSS 里 var(--other-tile-scale) * 基准尺寸
const mobileLayoutStyle = computed(() => {
  if (!isMobileViewport) return {}
  const s = mobileScale.value
  const ratio = shortSide.value / 1200
  const clamped = Math.max(0.75, Math.min(1, ratio))
  return {
    '--mobile-scale': s.toFixed(3),
    '--other-tile-scale': clamped.toFixed(3),
  }
})
// 调试:在页面显示当前CSS参数（仅debug模式）
const debugViewport = computed(() => {
  return `W:${viewportWidth.value} H:${viewportHeight.value} short:${shortSide.value} scale:${mobileScale.value.toFixed(4)} mobile:${isMobileViewport.value} mode:${isMobileLandscapeMode.value ? 'landscape' : shouldRotateView.value ? 'rotate' : 'desktop'} dpr:${typeof window !== 'undefined' ? window.devicePixelRatio.toFixed(2) : '?'}`
})
const nowTs = ref(Date.now())
let actionWindowTimer: ReturnType<typeof setInterval> | null = null

const actionButtonsVisibleUntil = ref(0)
const isGameStarting = ref(false)
const showDiceOverlay = ref(false)
// DEBUG: trace all showDiceOverlay changes
watch(showDiceOverlay, (val, oldVal) => {
  console.log('[DICE-DEBUG] showDiceOverlay:', oldVal, '->', val, 'stack:', new Error().stack?.split('\n').slice(1, 4).map(s => s.trim()).join(' | '))
})
const diceValues = ref<[number, number]>([1, 1])
const prevDiceValues = ref<[number, number]>([0, 0])  // 第一次掷骰子值，用于两次比较
const diceExtra = ref<[number, number] | undefined>(undefined)
const hasDicePreview = ref(false)
const diceFromWebSocket = ref(false)
/** 服务器广播骰子结果时递增，触发DiceAnimation自动播放动画 */
const diceRollTriggerKey = ref(0)
const diceResetTrigger = ref(0)  // API失败时递增，重置骰子组件到idle
const showDoubleReminder = ref(false)
const flowerReplacementNotice = ref<Tile | null>(null)
const showLiangShanOverlay = ref(false)
let doubleReminderTimer: ReturnType<typeof setTimeout> | null = null
const getActionWindowMs = (state: any) => {
  const hw = state?.hesitationWindow
  return typeof hw === 'number' && hw > 0 ? hw : 5000
}

const TURN_TIMEOUT_SEC = 60
const CONSECUTIVE_AUTO_THRESHOLD = 2
const turnTimer = ref(TURN_TIMEOUT_SEC)
const turnTimerActive = ref(false)
let turnTimerInterval: ReturnType<typeof setInterval> | null = null
let lastWarnAt = 0
let consecutiveAutoCount = 0
const isAIControlled = ref(false)
const isTopBarCollapsed = ref(true)
const showSettings = ref(false)
const settingsBtnEl = ref<HTMLElement | null>(null)
const settingsPanelEl = ref<HTMLElement | null>(null)
const settingsPanelTop = ref(0)
const settingsPanelLeft = ref(0)
const showDebugPanel = ref(false)
const tableTheme = ref<'classic-green' | 'jade-green' | 'royal-red'>('classic-green')
const tileBackScheme = ref(0)
type DiscardMode = 'double_tap' | 'tap_confirm' | 'drag'
const discardMode = ref<DiscardMode>('double_tap')
const autoDraw = ref(false)
const dragDiscardThresholdPx = 56

const playWhoosh = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()
    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(880, ctx.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.18)
    gainNode.gain.setValueAtTime(0.12, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18)
    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.18)
    setTimeout(() => ctx.close(), 250)
  } catch {}
}

const updateSettingsPosition = () => {
  if (!settingsBtnEl.value) return
  const rect = settingsBtnEl.value.getBoundingClientRect()
  settingsPanelTop.value = rect.bottom + 8
  settingsPanelLeft.value = rect.right - 300
}

const lockLandscapeForGameRoom = async () => {
  if (!process.client || !Capacitor.isNativePlatform()) return
  try {
    await ScreenOrientation.lock({ orientation: 'landscape' })
  } catch (error) {
    console.warn('[Orientation] failed to lock landscape:', error)
  }
}

const unlockOrientationAfterGameRoom = async () => {
  if (!process.client || !Capacitor.isNativePlatform()) return
  try {
    await ScreenOrientation.unlock()
  } catch (error) {
    console.warn('[Orientation] failed to unlock orientation:', error)
  }
}

const setTableTheme = (theme: 'classic-green' | 'jade-green' | 'royal-red') => {
  tableTheme.value = theme
}

const toggleTopBar = () => {
  isTopBarCollapsed.value = !isTopBarCollapsed.value
  if (isTopBarCollapsed.value) {
    showSettings.value = false
  }
}

const setTileBackScheme = (scheme: number) => {
  tileBackScheme.value = scheme
}

const setDiscardMode = (mode: DiscardMode) => {
  discardMode.value = mode
  selectedTileId.value = null
}

const resetAutoCount = () => {
  consecutiveAutoCount = 0
  lastWarnAt = 0
}

const stopTurnTimer = () => {
  turnTimerActive.value = false
  turnTimer.value = TURN_TIMEOUT_SEC
  if (turnTimerInterval) {
    clearInterval(turnTimerInterval)
    turnTimerInterval = null
  }
}

const startTurnTimer = () => {
  stopTurnTimer()
  turnTimer.value = TURN_TIMEOUT_SEC
  turnTimerActive.value = true
  turnTimerInterval = setInterval(() => {
    if (turnTimer.value <= 0) {
      stopTurnTimer()
      return
    }
    turnTimer.value -= 1
  }, 1000)
}

const toggleSettingsPanel = () => {
  if (!showSettings.value) {
    updateSettingsPosition()
  }
  showSettings.value = !showSettings.value
}

const settingsPanelStyle = computed(() => ({
  top: `${settingsPanelTop.value}px`,
  left: `${settingsPanelLeft.value}px`
}))

const onSettingsClosed = () => {}

watch(isAdminUser, (next) => {
  if (!next && showAllCards.value) {
    showAllCards.value = false
  }
})

const toggleShowAllCards = () => {
  if (!isAdminUser.value) return
  showAllCards.value = !showAllCards.value
}

const evaluateViewport = () => {
  if (!process.client) return
  const { innerWidth: width, innerHeight: height } = window
  viewportWidth.value = width
  viewportHeight.value = height
  const smallestSide = Math.min(width, height)
  const isPortrait = height >= width
  isMobilePortrait.value = isPortrait && smallestSide <= 768
  isMobileLandscape.value = !isPortrait && isCompactMobileViewport(width, height)
}

const isHiddenTile = (tile: any) => String(tile?.id || '').startsWith('hidden-') || tile?.value === 0
const isOpponentHandRevealed = (player?: Player | null) => {
  if (!player || player.id === currentPlayer.value?.id) return false
  // REVEAL 阶段：所有玩家手牌翻开
  if (gameState.value?.phase === GamePhase.REVEAL) return true
  const hand = player.hand?.concealedTiles || []
  return hand.length > 0 && hand.some(tile => !isHiddenTile(tile))
}

const hiddenHandCache = new Map<string, Tile[]>()
const hiddenHandLengthCache = new Map<string, number>()
const stableArrayCache = new Map<string, { signature: string; value: any[] }>()

const reuseStableArray = <T>(cacheKey: string, signature: string, createValue: () => T[]): T[] => {
  const cached = stableArrayCache.get(cacheKey)
  if (cached && cached.signature === signature) return cached.value as T[]
  const nextValue = createValue()
  stableArrayCache.set(cacheKey, { signature, value: nextValue as any[] })
  return nextValue
}

const tileIdSignature = (tiles: Tile[] | undefined | null): string => (tiles || []).map(tile => tile?.id || '').join('|')
const meldSignature = (melds: Meld[] | undefined | null): string => (melds || [])
  .map(meld => [
    meld?.type || '',
    meld?.sourceTileId || '',
    meld?.sourcePosition ?? '',
    (meld as any)?.replacementDone ? '1' : '0',
    (meld as any)?.isConcealed ? '1' : '0',
    tileIdSignature(meld?.tiles as Tile[] | undefined)
  ].join(':'))
  .join('|')

const getStableOpponentHand = (player?: Player | null): Tile[] => {
  if (!player) return []
  const hand = player.hand?.concealedTiles || []
  const cachedLength = hiddenHandLengthCache.get(player.id) ?? 0
  if (isOpponentHandRevealed(player)) {
    hiddenHandLengthCache.set(player.id, hand.length)
    return reuseStableArray(`revealed-hand:${player.id}`, tileIdSignature(hand), () => hand)
  }
  const effectiveLength = hand.length > 0 ? hand.length : cachedLength
  if (effectiveLength > 0) {
    hiddenHandLengthCache.set(player.id, effectiveLength)
  }
  const cacheKey = `${player.id}:${effectiveLength}`
  const cached = hiddenHandCache.get(cacheKey)
  if (cached) return cached
  const stableHiddenHand = Array.from({ length: effectiveLength }, (_, index) => ({
    id: `stable-hidden-${player.id}-${index}`,
    suit: 'wan' as Tile['suit'],
    value: 0
  }))
  hiddenHandCache.set(cacheKey, stableHiddenHand)
  return stableHiddenHand
}

const handleGlobalPointerDown = (event: MouseEvent) => {
  primeSoundSynthAudio()
  primeVoiceAudio()
  if (!showSettings.value) return
  const target = event.target as Node | null
  if (settingsPanelEl.value?.contains(target)) return
  if (settingsBtnEl.value?.contains(target)) return
  showSettings.value = false
}

watch(showSettings, (open) => {
  if (open) nextTick(updateSettingsPosition)
  else playWhoosh()
})

watch(discardMode, (mode) => {
  if (!process.client) return
  try {
    localStorage.setItem('mahjong.discardMode', mode)
  } catch {}
})

// 临时: 收集 onMounted 内的关键状态，辅助排查B跳首页问题
const mountDebugLog = ref<string[]>([])
const connectRetryTimer = ref<ReturnType<typeof setTimeout> | null>(null)
let appStateListener: PluginListenerHandle | null = null
let pauseListener: PluginListenerHandle | null = null
let resumeListener: PluginListenerHandle | null = null
const addMountLog = (msg: string) => {
  mountDebugLog.value.push(`[${new Date().toISOString().slice(11,19)}] ${msg}`)
  if (mountDebugLog.value.length > 50) mountDebugLog.value.shift()
  console.log('[MountDebug]', msg)
}

const handleWindowError = (evt: ErrorEvent) => {
  addMountLog(`GLOBAL ERROR: ${evt.message} at ${evt.filename}:${evt.lineno}`)
}

const handleUnhandledRejection = (evt: PromiseRejectionEvent) => {
  addMountLog(`UNHANDLED REJECTION: ${evt.reason?.message || evt.reason}`)
}

const handleVisibilityChange = () => {
  addMountLog(`visibilitychange: state=${document.visibilityState}`)
  if (document.visibilityState === 'visible') {
    void refreshState()
  }
}

const handleWindowFocus = () => {
  addMountLog('window focus')
  void refreshState()
}

const handleWindowBlur = () => {
  addMountLog('window blur')
}

const handleWindowOnline = () => {
  addMountLog('network online')
  void refreshState()
}

const handleWindowOffline = () => {
  addMountLog('network offline')
}

onMounted(async () => {
  try {
    addMountLog(`onMounted start: roomId=${roomId.value} playerId=${playerId.value}`)

    await lockLandscapeForGameRoom()
    addMountLog('lockLandscape done')

    if (process.client) {
      try {
        const savedDiscardMode = localStorage.getItem('mahjong.discardMode')
        if (savedDiscardMode === 'double_tap' || savedDiscardMode === 'tap_confirm' || savedDiscardMode === 'drag') {
          discardMode.value = savedDiscardMode
        }
      } catch {}
    }

    if (roomId.value && playerId.value) {
      addMountLog('calling connect...')
      await connect(roomId.value, playerId.value)
      addMountLog('connect done')
      // 连接成功后才清除pendingRoomTarget，确保万一连失败还能回退重试
      if (gameState.value) {
        clearPendingRoomTarget()
        addMountLog('connect successful, cleared pending target')

        // [新增]进入房间时检查是否满员，显示满员消息
        const players = gameState.value.players || []
        const activePlayers = players.filter((p: any) => p.status !== 'spectating' && p.status !== 'left')
        const minPlayers = (gameState.value as any).minPlayers ?? 4
        if (activePlayers.length >= minPlayers) {
          addBroadcast('🀄 房间满员了，正式开干！', 'special')
        }

        // 保存最近房间到 localStorage（gameState 已加载，roomNumber 准确）
        try {
          const QUICK_JOIN_KEY = 'mahjong_recent_rooms'
          const raw = localStorage.getItem(QUICK_JOIN_KEY) || '[]'
          const list = JSON.parse(raw)
          const roomNumber = gameState.value!.roomNumber || roomId.value
          const filtered = list.filter((g: any) => g.gameId !== roomId.value)
          filtered.unshift({ roomNumber, playerId: playerId.value, gameId: roomId.value })
          localStorage.setItem(QUICK_JOIN_KEY, JSON.stringify(filtered.slice(0, 5)))
        } catch { /* ignore */ }
      }
    } else {
      addMountLog(`SKIP connect: roomId=${roomId.value} playerId=${playerId.value}`)
    }
    await loadVoiceScheme('bingtang')
    addMountLog('loadVoiceScheme done')
    ensureBackgroundMusicInitialized()
    // 首次进入自动播放BGM（需要用户已开启）
    playBackgroundMusic()
    addMountLog('playBackgroundMusic done')

    // 监听全局错误
    window.addEventListener('error', handleWindowError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    if (Capacitor.isNativePlatform()) {
      appStateListener = await CapacitorApp.addListener('appStateChange', ({ isActive }) => {
        addMountLog(`appStateChange: isActive=${isActive}`)
        if (isActive) void refreshState()
      })
      pauseListener = await CapacitorApp.addListener('pause', () => {
        addMountLog('capacitor pause')
      })
      resumeListener = await CapacitorApp.addListener('resume', () => {
        addMountLog('capacitor resume')
        void refreshState()
      })
    }
  } catch (err: any) {
    addMountLog(`MOUNT FATAL ERROR: ${err?.message || err}, will retry connect`)
    console.error('[MountDebug] Fatal onMounted error:', err)
      // 不reload，已经有polling在connect里启动，2秒后主动重试connect
      if (connectRetryTimer.value) clearTimeout(connectRetryTimer.value)
      connectRetryTimer.value = setTimeout(() => {
      addMountLog('automatic connect retry...')
      if (!isSpectator.value && roomId.value && playerId.value) {
        void connect(roomId.value, playerId.value)
      } else if (isSpectator.value) {
        void fetchSpectatorState(roomId.value)
      }
    }, 2000)

    // 如果10秒后还没连上，用location.href硬刷新（避免SPA死循环）
    setTimeout(() => {
      if (!gameState.value && roomId.value && playerId.value && process.client) {
        addMountLog('connect retry timeout, hard reloading...')
        const currentUrl = window.location.href
        window.location.href = currentUrl
      }
    }, 12000)
  }

  // 监听广播消息播放对应音效
  // 监听服务器广播的骰子结果 - 非庄家玩家同步看到骰子动画
  window.addEventListener('mahjong-dice-roll', ((event: CustomEvent) => {
    const detail = event.detail
    if (!detail) return
    diceValues.value = [detail.dice1, detail.dice2]
    diceExtra.value = detail.dice3 !== undefined ? [detail.dice3, detail.dice4] : undefined
    // ★ 保存第一次骰子值，用于两次比较显示倍数提示
    if (detail.dice3 !== undefined && detail.dice4 !== undefined) {
      prevDiceValues.value = [detail.dice3, detail.dice4]
    }
    // overlay已显示时不重新触发滚动画，防server端diceRoll二次渲染
    if (!showDiceOverlay.value) {
      // WebSocket 事件先于 HTTP 响应到达 - 立即显示 overlay
      diceRollTriggerKey.value++
      showDiceOverlay.value = true
      playVoiceAction('diceRoll')
    }
    playSound('dice-roll')
  }) as EventListener)

  window.addEventListener('mahjong-broadcast', ((event: CustomEvent) => {
    const detail = event.detail
    addBroadcast(detail.text, detail.type as BroadcastMsg['type'], {
      dedupeKey: detail?.id ? `broadcast:${detail.id}` : undefined
    })
    // 根据广播内容播放音效和语音
    const text = detail.text || ''
    const actionKind = detail.actionKind || ''
    // 吃碰杠胡：所有玩家都播放语音（包括操作者）
    if (actionKind === 'chow') { playVoiceAction('chow') }
    else if (actionKind === 'pong') { playVoiceAction('pong') }
    else if (actionKind === 'kong') { playVoiceAction('kong') }
    else if (actionKind === 'hu') { playVoiceAction('hu') }
    else if (actionKind === 'selfHu') { /* 由 game state watcher 统一播放 */ }
    else if (actionKind === 'flowerReplace') { playVoiceAction('flowerReplace') }
  }) as EventListener)

  if (process.client) {
    void preloadAllTiles()
    evaluateViewport()
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    window.addEventListener('resize', evaluateViewport)
    window.addEventListener('orientationchange', evaluateViewport)
    window.addEventListener('pointerdown', handleGlobalPointerDown as EventListener)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleWindowFocus)
    window.addEventListener('blur', handleWindowBlur)
    window.addEventListener('online', handleWindowOnline)
    window.addEventListener('offline', handleWindowOffline)
    // mahjong-broadcast listener 已移至外层
    actionWindowTimer = setInterval(() => {
      nowTs.value = Date.now()
    }, 250)
  }
})

onUnmounted(() => {
  disconnect()
  void unlockOrientationAfterGameRoom()

  if (process.client) {
    document.body.style.overflow = ''
    document.documentElement.style.overflow = ''
    window.removeEventListener('resize', evaluateViewport)
    window.removeEventListener('orientationchange', evaluateViewport)
    window.removeEventListener('pointerdown', handleGlobalPointerDown as EventListener)
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    window.removeEventListener('focus', handleWindowFocus)
    window.removeEventListener('blur', handleWindowBlur)
    window.removeEventListener('online', handleWindowOnline)
    window.removeEventListener('offline', handleWindowOffline)
    window.removeEventListener('error', handleWindowError)
    window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    if (actionWindowTimer) {
      clearInterval(actionWindowTimer)
      actionWindowTimer = null
    }
    if (drawBlockedNoticeTimer) {
      clearTimeout(drawBlockedNoticeTimer)
      drawBlockedNoticeTimer = null
    }
    stopTurnTimer()
  }
  appStateListener?.remove()
  pauseListener?.remove()
  resumeListener?.remove()
  appStateListener = null
  pauseListener = null
  resumeListener = null
})

const hesitationWindow = computed(() => { const v = Number(gameState.value?.hesitationWindow); return Number.isFinite(v) && v > 0 ? v : 5000 })
const currentFreezeUntil = computed(() => Number((gameState.value as any)?._freezeUntil ?? 0))
const playerHand = computed(() => currentPlayer.value?.hand?.concealedTiles || [])
const playerMelds = computed(() => currentPlayer.value?.hand?.exposedMelds || [])
const topPlayer = computed(() => {
  if (!gameState.value || currentPlayer.value?.position === undefined) return null
  return gameState.value.players.find(player => player.position === (currentPlayer.value!.position + 2) % 4) || null
})
const leftPlayer = computed(() => {
  if (!gameState.value || currentPlayer.value?.position === undefined) return null
  return gameState.value.players.find(player => player.position === (currentPlayer.value!.position + 3) % 4) || null
})
const rightPlayer = computed(() => {
  if (!gameState.value || currentPlayer.value?.position === undefined) return null
  return gameState.value.players.find(player => player.position === (currentPlayer.value!.position + 1) % 4) || null
})
const remainingTileCount = computed(() => gameState.value?.wall?.length || 0)
const claimedDiscardIds = computed(() => collectClaimedDiscardIds(gameState.value?.players))
const getStablePlayerMelds = (player?: Player | null): Meld[] => {
  if (!player) return []
  const melds = player.hand?.exposedMelds || []
  return reuseStableArray(`melds:${player.id}`, meldSignature(melds), () => melds)
}
const getOpponentAreaMemoKey = (player?: Player | null): string => {
  if (!player) return 'none'
  const hand = player.hand?.concealedTiles || []
  const cachedLength = hiddenHandLengthCache.get(player.id) ?? 0
  const handKey = isOpponentHandRevealed(player)
    ? `revealed:${tileIdSignature(hand)}`
    : `hidden:${hand.length > 0 ? hand.length : cachedLength}`
  return [
    player.id,
    handKey,
    meldSignature(player.hand?.exposedMelds || [])
  ].join('|')
}
const getVisiblePlayerDiscards = (player?: Player | null) => {
  if (!player) return []
  const visible = filterVisibleDiscards(player.hand?.discardedTiles, claimedDiscardIds.value)
  return reuseStableArray(`discards:${player.id}`, tileIdSignature(visible), () => visible)
}
const globalLatestVisibleDiscardId = computed(() => {
  const pile = filterVisibleDiscards(gameState.value?.discardPile, claimedDiscardIds.value)
  return pile.length > 0 ? pile[pile.length - 1]?.id || null : null
})
const getPlayerLatestHighlightedDiscardId = (player?: Player | null) => {
  const latestId = globalLatestVisibleDiscardId.value
  if (!player || !latestId) return null
  const visible = getVisiblePlayerDiscards(player)
  return visible.some(tile => tile.id === latestId) ? latestId : null
}
const selfLatestDiscardId = computed(() => getPlayerLatestHighlightedDiscardId(currentPlayer.value))
const northLatestDiscardId = computed(() => getPlayerLatestHighlightedDiscardId(topPlayer.value))
const westLatestDiscardId = computed(() => getPlayerLatestHighlightedDiscardId(leftPlayer.value))
const eastLatestDiscardId = computed(() => getPlayerLatestHighlightedDiscardId(rightPlayer.value))
// 观赛者：显示被观看玩家的弃牌
const playerDiscards = computed(() => {
  if (isSpectator.value && spectatingId.value) {
    const targetPlayer = gameState.value?.players?.find(p => p.id === spectatingId.value)
    if (targetPlayer) return getVisiblePlayerDiscards(targetPlayer)
  }
  return getVisiblePlayerDiscards(currentPlayer.value)
})
const roundDisplay = computed(() => `第${currentRound.value}局`)
const getDiceRoundMultiplier = (dice1: number, dice2: number, dice3?: number, dice4?: number) => {
  const isDouble = dice1 === dice2
  const isOneFourCombo = (dice1 === 1 && dice2 === 4) || (dice1 === 4 && dice2 === 1)

  let singleMultiplier = 1
  if (isDouble) {
    singleMultiplier = (dice1 === 1 || dice1 === 4) ? 4 : 2
  } else if (isOneFourCombo) {
    singleMultiplier = 2
  }

  // 两次掷骰子：比较两次结果
  if (dice3 !== undefined && dice4 !== undefined) {
    const sum1 = dice1 + dice2
    const sum2 = dice3 + dice4
    const combo1 = [Math.min(dice1, dice2), Math.max(dice1, dice2)]
    const combo2 = [Math.min(dice3, dice4), Math.max(dice3, dice4)]

    // 完全相同组合（顺序无关）→ ×4
    if (combo1[0] === combo2[0] && combo1[1] === combo2[1]) {
      return Math.max(singleMultiplier, 4)
    }
    // 点数之和相同 → ×2
    if (sum1 === sum2) {
      return Math.max(singleMultiplier, 2)
    }
  }

  return singleMultiplier
}
const effectiveMaxRolls = computed(() => {
  const raw = Number(gameState.value?.diceRollCount ?? route.query.dice ?? 2)
  return Number.isFinite(raw) && raw > 0 ? Math.max(1, Math.floor(raw)) : 2
})
const roundMultiplier = computed(() => {
  const actualRound = Number(gameState.value?.roundMultiplier ?? 0)
  if (actualRound > 0) return actualRound
  if (showDiceOverlay.value && hasDicePreview.value) {
    return getDiceRoundMultiplier(diceValues.value[0], diceValues.value[1], diceExtra.value?.[0], diceExtra.value?.[1])
  }
  return 1
})
const globalMultiplier = computed(() => {
  const game = gameState.value
  if (!game) return 1

  const inherit = (game as any).inheritMultiplier ?? (game as any).inheritedGlobalMultiplier ?? 1
  const actualRound = game.roundMultiplier
  if (typeof actualRound === 'number' && actualRound > 0) {
    return game.globalMultiplier ?? Math.min(inherit * actualRound, 8)
  }

  if (showDiceOverlay.value && hasDicePreview.value) {
    return Math.min(inherit * getDiceRoundMultiplier(diceValues.value[0], diceValues.value[1], diceExtra.value?.[0], diceExtra.value?.[1]), 8)
  }

  return game.globalMultiplier ?? inherit
})
const dealerName = computed(() => {
  if (!gameState.value?.players?.length) return ''
  return gameState.value.players.find(player => player.isDealer)?.name || ''
})
const wildTile = computed(() => {
  const raw = gameState.value?.customScoringMode
  if (!raw || raw === 'cheat') return null

  // 解析 "suit-value" 格式（如 "dots-3", "hua-5"）
  const parts = raw.split('-')
  if (parts.length < 2) return null
  const suit = parts[0]
  const value = parseInt(parts[1], 10)

  // 花牌百搭: 整组为百搭（春夏秋冬 或 梅兰竹菊）
  const isFlower = suit === 'hua'
  const group = gameState.value?.wildTileGroup

  return {
    suit,
    value,
    id: 'center-wild',
    isWild: true,
    isFlower,
    flowerGroup: isFlower ? group : undefined
  } as any
})

// ---- Room Stats ----
const positionColors = ['east', 'south', 'west', 'north']
// 按 position 顺序：0(东)=红, 1(南)=绿, 2(西)=蓝, 3(北)=黄
// 与 PlayerInfo.vue 的 dot--east/south/west/north 颜色保持一致
const claimSourceColors = ['#f44336', '#4caf50', '#2196f3', '#ffc107']
const botAvatars = ['😎', '🤖', '🧠']

// Track today's best hand (max wonFan) per room
const todayBestFan = ref(0)

watch(() => gameState.value?.players, (players) => {
  if (!players) return
  for (const p of players) {
    if (p.status === 'won' && p.wonFan > todayBestFan.value) {
      todayBestFan.value = p.wonFan
    }
  }
}, { deep: true })

const todayBestHandName = computed(() => {
  const fan = todayBestFan.value
  if (fan <= 0) return null
  if (fan >= 8) return `${fan}番 · 满贯`
  if (fan >= 5) return `${fan}番 · 高番`
  if (fan >= 3) return `${fan}番 · 中番`
  return `${fan}番 · 基础`
})

const todayBestHand = computed(() => {
  if (todayBestHandName.value) {
    return { name: todayBestHandName.value, tiles: [] as Tile[] }
  }
  return null
})

// Track cumulative wins/losses per player within this room session
const roomCumulative = ref<Record<string, { wins: number; losses: number; lastStatus: 'won' | 'lost' | 'none' }>>({})

watch(() => gameState.value?.players, (players) => {
  if (!players) return
  for (const p of players) {
    if (!roomCumulative.value[p.id]) {
      roomCumulative.value[p.id] = { wins: 0, losses: 0, lastStatus: 'none' }
    }
    if (p.status === 'won') {
      if (roomCumulative.value[p.id].lastStatus !== 'won') {
        roomCumulative.value[p.id].wins++
        roomCumulative.value[p.id].lastStatus = 'won'
      }
    } else if (p.status === 'lost') {
      if (roomCumulative.value[p.id].lastStatus !== 'lost') {
        roomCumulative.value[p.id].losses++
        roomCumulative.value[p.id].lastStatus = 'lost'
      }
    }
  }
}, { deep: true })

const statsPlayers = computed(() => {
  if (!gameState.value) return []
  const qjAlertIds = new Set((gameState.value as any).qjAlerts?.map((a: any) => a.playerId) || [])
  const qjThreshold = (gameState.value as any).liangShanThreshold ?? 4000
  const roundStats = Array.isArray((gameState.value as any).roundStats) ? (gameState.value as any).roundStats : []
  return gameState.value.players.map((p, i) => {
    const alert = (gameState.value as any).qjAlerts?.find((a: any) => a.playerId === p.id)
    const qjScore = alert?.score || 0
    const cumulative = roomCumulative.value[p.id] || { wins: 0, losses: 0, lastStatus: 'none' }
    const winCount = roundStats.filter((round: any) => Array.isArray(round?.winners) && round.winners.includes(p.id)).length
    const selfDrawCount = roundStats.filter((round: any) => Array.isArray(round?.selfDraws) && round.selfDraws.includes(p.id)).length
    const discardCount = Math.max(0, winCount - selfDrawCount)
    const bestRound = roundStats.reduce((best: number | null, round: any) => {
      const score = Number(round?.scores?.[p.id] ?? 0)
      return best === null ? score : Math.max(best, score)
    }, null)
    return {
      id: p.id,
      name: p.name,
      score: p.score || 0,
      isBotControlled: !!(p as any).isBotControlled,
      wins: p.status === 'won' ? 1 : 0,
      losses: p.status === 'lost' ? 1 : 0,
      color: positionColors[p.position] || 'south',
      isMe: p.id === currentPlayer.value?.id,
      isBot: isBotPlayer(p),
      isQJCrossed: qjAlertIds.has(p.id),
      qjScore,
      qjGlow: qjScore > qjThreshold * 3,
      winCount,
      discardCount,
      selfDrawCount,
      bestRound,
      totalWins: cumulative.wins,
      totalLosses: cumulative.losses,
      lastRoundStatus: cumulative.lastStatus,
      _raw: p, // 供战绩榜点击菜单使用
    }
  })
})

const spectatorViewState = computed(() => {
  if (!gameState.value || !currentPlayer.value) return null
  return gameState.value.spectatorViews?.[currentPlayer.value.id] || null
})
const spectatingId = computed(() => spectatorViewState.value?.viewingPlayerId || null)
/** 被观赛玩家的名称 */
const watchingPlayerName = computed(() => {
  if (!spectatingId.value || !gameState.value?.players) return '未知'
  const p = gameState.value.players.find(p => p.id === spectatingId.value)
  return p?.name || '未知'
})
const pendingSpectateId = computed(() => spectatorViewState.value?.pendingHumanPlayerId || null)
const approvedHumanSpectateId = computed(() => spectatorViewState.value?.approvedHumanPlayerId || null)
const hasDebugSpectateBot = computed(() => {
  return !!gameState.value?.players?.some((player: any) => player?.name === 'AI-AK')
})
const spectatorApprovalRequest = computed(() => {
  if (!gameState.value || !currentPlayer.value) return null
  return (gameState.value.spectatorApprovalRequests || []).find((request: any) =>
    request.status === 'pending' && request.targetId === currentPlayer.value?.id
  ) || null
})
const canUseSpectatorView = computed(() => {
  if (!currentPlayer.value || !gameState.value) return false
  if (gameState.value.phase !== GamePhase.PLAYING && gameState.value.phase !== GamePhase.ENDED) return false
  return currentPlayer.value.status === 'won' || currentPlayer.value.status === 'spectating' || hasDebugSpectateBot.value
})

const handleSpectate = async (id: string) => {
  if (!gameState.value || !currentPlayer.value || !canUseSpectatorView.value) return
  const nextTargetId = spectatingId.value === id ? null : id
  try {
    const resp = await $fetch('/mahjong/api/game/spectate', {
      method: 'POST',
      body: {
        gameId: gameState.value.gameId,
        playerId: currentPlayer.value.id,
        viewingPlayerId: nextTargetId
      }
    }) as any
    if (resp?.status === 'pending') {
      addBroadcast('已发送观赛申请，等待对方同意', 'info')
    }
    await refreshState()
  } catch (e: any) {
    console.error('[Spectate] Failed:', e)
    addBroadcast(e?.data?.message || e?.message || '观赛视角切换失败', 'warn')
  }
}
const onSpectateFromCard = () => {
  if (!playerCardPlayer.value) return
  showPlayerCard.value = false
  handleSpectate(playerCardPlayer.value.id)
}
const onSpectatorApprovalChoice = async (choice: 'approve' | 'reject') => {
  if (!gameState.value || !currentPlayer.value || !spectatorApprovalRequest.value) return
  try {
    await $fetch('/mahjong/api/game/spectate-approval', {
      method: 'POST',
      body: {
        gameId: gameState.value.gameId,
        playerId: currentPlayer.value.id,
        requestId: spectatorApprovalRequest.value.id,
        choice
      }
    })
    await refreshState()
  } catch (e: any) {
    console.error('[SpectateApproval] Failed:', e)
    addBroadcast(e?.data?.message || e?.message || '观赛审批失败', 'warn')
  }
}
const isDealer = computed(() => currentPlayer.value?.isDealer)
const isDealerUser = computed(() => isDealer.value)
const isGameEnded = computed(() => gameState.value?.phase === GamePhase.ENDED)
const hasDealtCards = computed(() => {
  if (!gameState.value?.players?.length) return false
  // 观赛者自己没有手牌，但其他玩家可能有——检查非观赛玩家
  const activePlayers = gameState.value.players.filter((p: any) => p.status !== 'spectating' && p.status !== 'left')
  if (activePlayers.length === 0) return false
  return activePlayers.some((p: any) => (p.hand?.concealedTiles?.length || 0) > 0)
})

const isPreGameTransition = computed(() => {
  if (isMobileLandscapeMode.value || shouldRotateView.value) return false
  if (!gameState.value) return true
  if (hasDealtCards.value) return false

  const phase = gameState.value.phase
  return phase === GamePhase.WAITING || phase === GamePhase.STARTING
})

const preGameStatusText = computed(() => {
  if (!gameState.value) {
    return isConnected.value ? '正在同步房间状态' : '正在连接牌桌'
  }
  if (showDiceOverlay.value || gameState.value?.phase === GamePhase.STARTING) {
    return '正在掷骰子，马上发牌'
  }
  if (!isConnected.value) {
    return '正在连接牌桌'
  }
  return waitingPlayers.value.length >= 4 ? '人齐了，牌桌就绪' : '正式牌桌准备中'
})

const preGameStatusHint = computed(() => {
  if (!gameState.value) {
    return '连接成功后将直接进入正式牌桌，不再显示独立等待页'
  }
  if (showDiceOverlay.value || gameState.value?.phase === GamePhase.STARTING) {
    return `庄家 ${dealerName.value} 正在开局，牌局即将开始`
  }
  if (!isConnected.value) {
    return '正在重新连接服务器，牌桌布局保持不变'
  }
  if (waitingPlayers.value.length < 4) {
    return `当前 ${waitingPlayers.value.length}/4 人，继续在正式牌桌上等人`
  }
  return '已隐藏独立等待布局，开局前保持正式牌桌画面'
})

const waitingPlayers = computed(() => {
  if (!gameState.value?.players) return []
  return gameState.value.players.map((p: any) => ({
    id: p.id,
    name: p.name?.replace(/^AI-/, '🤖 ') || '???',
    isBot: p.name?.startsWith('AI-') || false,
    isDealer: p.isDealer
  }))
})
const canManualStartWaitingGame = computed(() =>
  gameState.value?.phase === GamePhase.WAITING &&
  waitingPlayers.value.length >= (gameState.value?.minPlayers ?? 4) &&
  !!currentPlayer.value?.isDealer &&
  !currentPlayer.value?.isSpectator &&
  isConnected.value
)
const overlayReason = computed(() => roomDismissedReason.value || gameState.value?.endReason || null)
const isOverlayVisible = computed(() => {
  if (roomDismissedReason.value) return true
  if (phase === GamePhase.REVEAL) {
    return false; // 亮牌阶段禁止出牌
  }
  if (isWallExhaustedSettlement.value) return false
  return overlayReason.value !== GameEndReason.LAST_PLAYER
})
const canStartNextRoundOverlay = computed(() => ![
  GameEndReason.OWNER_LEFT,
  GameEndReason.EMPTY_ROOM
].includes(overlayReason.value as GameEndReason))
const overlayTitle = computed(() => {
  if (roomDismissedReason.value === GameEndReason.OWNER_LEFT) {
    return '房间已关闭'
  }
  if (overlayReason.value === GameEndReason.WALL_EXHAUSTED) {
    return '🀄 流局'
  }
  return overlayReason.value === GameEndReason.LAST_PLAYER ? '本局结束' : '游戏结束'
})

const tileLabel = (tile: Partial<Tile> | null | undefined): string => {
  if (!tile) return ''
  const suit = String(tile.suit || '').toLowerCase()
  if (suit === 'hua' || suit === 'flower') return ['春', '夏', '秋', '冬', '梅', '兰', '竹', '菊'][Number(tile.value) - 1] || `花${tile.value}`
  if (suit === 'feng' || suit === 'wind') return ['东', '南', '西', '北'][Number(tile.value) - 1] || `风${tile.value}`
  if (suit === 'jian' || suit === 'dragon') return ['中', '发', '白'][Number(tile.value) - 1] || `箭${tile.value}`
  const suitLabel = suit === 'wan' ? '万' : suit === 'dots' ? '筒' : suit === 'tiao' ? '条' : ''
  return `${tile.value}${suitLabel}`
}

const tileSuitOrder: Record<string, number> = { wan: 0, tiao: 1, dots: 2, feng: 3, jian: 4, hua: 5 }
const compareTilesForDisplay = (a: Partial<Tile>, b: Partial<Tile>): number => {
  const suitDelta = (tileSuitOrder[a.suit || ''] ?? 99) - (tileSuitOrder[b.suit || ''] ?? 99)
  if (suitDelta !== 0) return suitDelta
  return Number(a.value ?? 0) - Number(b.value ?? 0)
}
const tileCountKey = (tile: Partial<Tile> | null | undefined) => {
  if (!tile?.suit) return ''
  return `${tile.suit}-${Number(tile.value ?? 0)}`
}
const isWildPreviewTile = (tile: Partial<Tile> | null | undefined): boolean => {
  if (!tile || !wildTile.value) return false
  if (wildTile.value.suit === 'hua') {
    return tile.suit === 'hua' && (wildTile.value.flowerGroup || []).includes(String(tile.value))
  }
  return tile.suit === wildTile.value.suit && Number(tile.value) === Number(wildTile.value.value)
}

const knownVisibleTileCounts = computed(() => {
  const counts = new Map<string, number>()
  const pushTile = (tile: Partial<Tile> | null | undefined) => {
    if (!tile || !tile.suit || isWildPreviewTile(tile)) return
    const key = tileCountKey(tile)
    if (!key) return
    counts.set(key, (counts.get(key) || 0) + 1)
  }

  for (const tile of currentPlayer.value?.hand?.concealedTiles || []) pushTile(tile)
  for (const player of gameState.value?.players || []) {
    for (const meld of player.hand?.exposedMelds || []) {
      for (const tile of meld.tiles || []) pushTile(tile)
    }
  }
  for (const tile of gameState.value?.discardPile || []) pushTile(tile)

  return counts
})

const tingPreviewItems = computed(() => {
  const winningTiles = tingPreview.value?.winningTiles || []
  const isTing = !!currentPlayer.value?.isTing || !!tingPreview.value?.isTing || winningTiles.length > 0
  if (!isTing) return []

  const deduped = new Map<string, { key: string; label: string; tile: Tile; isExhausted: boolean }>()
  for (const entry of winningTiles) {
    const tile = entry?.tile as Tile | undefined
    if (!tile || isWildPreviewTile(tile)) continue
    const key = tileCountKey(tile)
    if (!key || deduped.has(key)) continue
    const knownCount = knownVisibleTileCounts.value.get(key) || 0
    deduped.set(key, {
      key,
      label: tileLabel(tile),
      tile,
      isExhausted: knownCount >= 4
    })
  }

  // ★ 追加百搭牌名到听牌提示末尾（花牌百搭显示“百搭花”，其他只显示牌名）
  if (wildTile.value) {
    const wt = wildTile.value
    const isFlowerWild = wt.suit === 'hua' || wt.suit === 'flower'
    const wildLabel = isFlowerWild ? '百搭花' : tileLabel(wt)
    deduped.set('wild', {
      key: 'wild',
      label: wildLabel,
      tile: wt as Tile,
      isExhausted: false
    })
  }

  return Array.from(deduped.values()).sort((a, b) => {
    // 百搭始终排最后
    if (a.key === 'wild') return 1
    if (b.key === 'wild') return -1
    return compareTilesForDisplay(a.tile, b.tile)
  })
})
const getHuOptionBasePoints = (opt: any) => Number(opt?.summary?.finalPoints ?? opt?.score ?? 0)
// finalPoints = 自摸时单个输家应付的点数，或捉冲时放冲者独自应付的点数
const getHuOptionPayerCount = (opt: any) => {
  if (opt?._cachedPayerCount != null) return opt._cachedPayerCount
  if (opt?.type !== 'self_draw') return 1
  const players = Array.isArray(gameState.value?.players) ? gameState.value.players : []
  const losers = players.filter(player => player.id !== playerId.value && player.status !== 'won')
  return Math.max(1, losers.length)
}
const getHuOptionTotalWin = (opt: any) => getHuOptionBasePoints(opt) * getHuOptionPayerCount(opt)
const getHuOptionDisplaySummary = (opt: any) => {
  const summary = opt?.summary || {}
  return {
    base: Number(summary.baseFan ?? 0),
    extra: Number(summary.extraMultipliers ?? 1),
    global: Number(summary.globalMultiplier ?? 1),
    settlement: Number(summary.settlementMultiplier ?? 1),
    finalPoints: getHuOptionBasePoints(opt),
    payerCount: getHuOptionPayerCount(opt),
    totalWin: getHuOptionTotalWin(opt)
  }
}
const getHuOptionFormula = (opt: any) => {
  const display = getHuOptionDisplaySummary(opt)
  const baseFormula = `基础/固定${display.base} × 额外${display.extra} × 全局${display.global} × 结算${display.settlement} = 单家${display.finalPoints}`
  if (opt?.type === 'self_draw') {
    return `${baseFormula}；自摸 ${display.finalPoints} × ${display.payerCount}家 = ${display.totalWin}`
  }
  return `${baseFormula}；捉冲总赢 = ${display.totalWin}`
}
const getHuGroupKind = (type: string) => {
  // type 是 HandType 字符串，如 ALL_TRIPLETS / HALF_FLUSH / FULL_FLUSH 等
  return HAND_TYPE_DISPLAY[type] || '组'
}
// 用 scoring.ts 枚举的真实牌型分解（handTypes），而非 arrangeWinningHand 的随意排列
const HAND_TYPE_DISPLAY: Record<string, string> = {
  STANDARD: '',
  FENG_PENG: '风碰',
  ALL_WIND: '风一色',
  QING_PENG: '清碰',
  HUN_PENG: '混碰',
  EIGHT_FLOWERS: '八花自摸',
  FULL_FLUSH: '清一色',
  FOUR_WILD: '四百搭',
  DA_DIAO: '大吊',
  HALF_FLUSH: '混一色',
  ALL_TRIPLETS: '碰碰胡'
}

const getHuOptionGroups = (opt: any) => {
  const handTypes: string[] = Array.isArray(opt?.handTypes) ? opt.handTypes : []
  if (!handTypes.length) return []
  // handTypes 来自 scoring.ts HandType 枚举，如 ['ALL_TRIPLETS'] / ['HALF_FLUSH'] / ['FULL_FLUSH']
  return handTypes.map((type: string) => ({
    type,
    label: HAND_TYPE_DISPLAY[type] || type, // 显示中文牌型名
    tiles: [] // 牌面已在上方 hu-combo-label 展示，这里不重复显示
  }))
}

/** 格式化胡牌选项的组牌明细为斜杠分隔文本，复用结算面板的 arrangeWinningHand */
const formatHuOptionGroups = (opt: any): string => {
  const handTiles = Array.isArray(opt?.tiles) ? opt.tiles : []
  const melds = Array.isArray(opt?.melds) ? opt.melds : []
  if (!handTiles.length && !melds.length) return ''
  const allHandTiles = handTiles.filter((t: any) => t?.suit !== 'hua' && t?.suit !== 'flower')
  const allExposedMelds = melds
    .map((group: any) => Array.isArray(group)
      ? group.filter((t: any) => t?.suit !== 'hua' && t?.suit !== 'flower')
      : group?.tiles?.filter?.((t: any) => t?.suit !== 'hua' && t?.suit !== 'flower') || [])
    .filter((g: any[]) => g.length > 0)
  const concealedCombos = arrangeWinningHand(allHandTiles, [])
  const concealedGroups = Array.isArray(concealedCombos?.[0]?.groups) ? concealedCombos[0].groups : []
  const concealedMelds = concealedGroups
    .map((group: any) => Array.isArray(group?.tiles) ? formatMeldTiles(group.tiles) : '')
    .filter(Boolean)
  const exposedMelds = allExposedMelds.map((group: any) => formatMeldTiles(group)).filter(Boolean)
  const allParts = [...concealedMelds, ...exposedMelds]
  return allParts.length ? allParts.join(' / ') : ''
}
const overlayMessage = computed(() => {
  const reason = overlayReason.value
  switch (reason) {
    case GameEndReason.WALL_EXHAUSTED: {
      const nextMul = (gameState.value as any)?.inheritedGlobalMultiplier ?? gameState.value?.globalMultiplier ?? 1
      return `下局倍数 ×${nextMul}`
    }
    case GameEndReason.LAST_PLAYER:
      return '本局已结算，可以继续下一局。'
    case GameEndReason.OWNER_LEFT:
      return '房主已离开房间，游戏已解散。'
    case GameEndReason.EMPTY_ROOM:
      return '所有玩家已离开，游戏结束。'
    default:
      return '本轮已结束，可以继续下一局。'
  }
})

const isDrawOverlay = computed(() => overlayReason.value === GameEndReason.WALL_EXHAUSTED)
const showApprovalOverlay = computed(() => false)
const dealerPlayer = computed(() => {
  const players = gameState.value?.players || []
  return players.find(player => player.isDealer) || null
})

/** 新开局流程 - 点击"开始牌局"：调用 beginGame，服务端原子完成洗牌+发牌+第一次掷骰子 */
const enterStartingPhaseWithDiceOverlay = async () => {
  try {
    // 不预显示 overlay，等 API 返回后再显示（防止默认 dice 值触发动画）
    diceFromWebSocket.value = false
    hasDicePreview.value = false
    diceRollTriggerKey.value = 0  // 重置，确保后续 ++ 能触发 watch
    // 调用 beginGame API（服务端原子完成洗牌+发牌+骰子）
    const response = await beginGame({ hesitationWindow: hesitationWindow.value })
    const res = response as any
    if (res?.success) {
      if (res.humanRollPending) {
        // 人类庄家：显示 idle 状态，等玩家自己点击掷骰子
        diceValues.value = [0, 0]  // 清除默认值，防止 DiceAnimation 误判为已掷
        showDiceOverlay.value = true
      } else {
        // AI 庄家：先设骰子值 → 再显示 overlay → 再触发动画（防止默认值触发错误倍数）
        if (res.dice && Array.isArray(res.dice) && res.dice.length >= 2) {
          diceValues.value = [res.dice[0], res.dice[1]]
        }
        // 立即更新倍数，不等 polling
        if (typeof res.roundMultiplier === 'number' && gameState.value) {
          (gameState.value as any).roundMultiplier = res.roundMultiplier
        }
        hasDicePreview.value = true
        showDiceOverlay.value = true  // DiceAnimation 挂载时读到正确的 diceValues
        diceRollTriggerKey.value++
        playSound('dice-roll')
        playVoiceAction('diceRoll')
        setTimeout(() => {
          console.log('[autoDeal] Timer fired, phase:', gameState.value?.phase)
          if (gameState.value?.phase !== GamePhase.STARTING) return
          // 翻倍了 → 直接发牌；未翻倍且次数上限<2 → 直接发牌
          const isDoubled = (gameState.value?.roundMultiplier ?? 1) > 1
          if (isDoubled || (gameState.value?.diceRollCount ?? 2) < 2) {
            void onDealTiles()
          } else {
            // AI庄家未翻倍且允许重掷：自动第二次掷骰，然后发牌
            console.log('[autoDeal] AI dealer needs re-roll, calling rollSecondDice...')
            prevDiceValues.value = [diceValues.value[0], diceValues.value[1]]  // 保存第一次骰子
            void rollSecondDice().then(() => {
              setTimeout(() => {
                if (gameState.value?.phase === GamePhase.STARTING) {
                  void onDealTiles()
                }
              }, 2500)
            })
          }
        }, 2500)
      }
    } else {
      hasDicePreview.value = false
      showDiceOverlay.value = false
      diceFromWebSocket.value = false
    }
  } catch (e: any) {
    console.error('[enterStartingPhaseWithDiceOverlay] Failed:', e)
    addBroadcast(e?.data?.message || e?.message || '进入下一局失败', 'warn')
    hasDicePreview.value = false
    showDiceOverlay.value = false
    diceFromWebSocket.value = false
  }
}

/** 新开局流程 - 第二次掷骰子（仅当 diceRollCount>=2 且第一次未翻倍时） */
const onRollDice = async () => {
  try {
    // 先触发动画+音效
    diceRollTriggerKey.value++
    playSound('dice-roll')
    playVoiceAction('diceRoll')
    // 判断是第一次掷还是第二次掷：_humanRollPending 表示第一次
    const needsFirstRoll = (gameState.value as any)?._humanRollPending
    if (needsFirstRoll) {
      const res = await rollFirstDice() as any
      if (res?.success && res.dice1 && res.dice2) {
        diceValues.value = [res.dice1, res.dice2]
      }
    } else {
      // ★ 保存第一次骰子值，用于两次比较
      prevDiceValues.value = [diceValues.value[0], diceValues.value[1]]
      const res = await rollSecondDice() as any
      // ★ 修复：从响应中提取第二次骰子值，更新 diceValues 触发动画
      if (res?.success && res.diceRolls && res.diceRolls.length >= 2) {
        const secondRoll = res.diceRolls[1]  // [d3, d4]
        if (secondRoll && secondRoll.length >= 2) {
          diceValues.value = [secondRoll[0], secondRoll[1]]
        }
      }
    }
  } catch (e: any) {
    console.error('[onRollDice] Failed:', e)
    addBroadcast(e?.data?.message || e?.message || '掷骰子失败', 'warn')
    // API失败，重置骰子动画到idle
    diceResetTrigger.value++
  }
}

const startNextRound = async () => {
  cancelWallExhaustedCountdown()
  if (isSettleRequested.value) {
    // 退房结算已申请 → 保留结算面板（不进入下一局）
    return
  }
  showSettlement.value = false
  showLiangShanOverlay.value = false
  settlementData.value = null
  isHuReviewMode.value = false
  // 主动刷新一次状态，确保拿到服务端 STARTING 阶段
  try { await refreshState('startNextRound') } catch {}
}
const isInteractionLocked = computed(() => isOverlayVisible.value)

const formatOrdinal = (value: number | null | undefined) => {
  if (!value) return null
  return `第${value}名`
}

const formatScore = (value: number | null | undefined) => {
  if (value === null || value === undefined) return '--'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value}`
}

const getScoreClass = (value: number | null | undefined) => {
  if (value === null || value === undefined) return 'score-neutral'
  if (value > 0) return 'score-positive'
  if (value < 0) return 'score-negative'
  return 'score-neutral'
}

const playerResults = computed(() => {
  if (!gameState.value) return []

  return [...gameState.value.players]
    .map((player) => {
      const isWinner = player.status === 'won'
      const finalScore = player.score ?? gameState.value?.finalScores?.[player.id] ?? null
      return {
        id: player.id,
        name: player.name,
        isWinner,
        winOrder: player.winOrder,
        rankLabel: isWinner && player.winOrder ? formatOrdinal(player.winOrder) : '未胡牌',
        statusLabel: isWinner ? '赢家' : player.status === 'lost' ? '输了' : '未胡牌',
        winRoundLabel: isWinner ? (player.isSelfDrawn ? `自摸${player.winningTileName ? '-' + player.winningTileName : ''}` : (player.discarderName ? `捉冲${player.discarderName}${player.winningTileName ? '-' + player.winningTileName : ''}` : `捉冲${player.winningTileName ? '-' + player.winningTileName : ''}`)) : '' ,
        scoreLabel: formatScore(finalScore),
        scoreClass: getScoreClass(finalScore)
      }
    })
    .sort((a, b) => {
      if (a.isWinner && !b.isWinner) return -1
      if (!a.isWinner && b.isWinner) return 1
      if (a.isWinner && b.isWinner) {
        const orderA = a.winOrder ?? Number.MAX_SAFE_INTEGER
        const orderB = b.winOrder ?? Number.MAX_SAFE_INTEGER
        return orderA - orderB
      }
      return a.name.localeCompare(b.name)
    })
})
// ---- Other Players State ----
const northHand = computed(() => getStableOpponentHand(topPlayer.value))
const northMelds = computed(() => getStablePlayerMelds(topPlayer.value))
const northAreaMemoKey = computed(() => getOpponentAreaMemoKey(topPlayer.value))
const northDiscards = computed(() => getVisiblePlayerDiscards(topPlayer.value))
const northIsWinner = computed(() => topPlayer.value?.status === 'won')

const activePosition = computed(() => gameState.value?.currentPlayerIndex ?? null)
const currentTurnPlayer = computed(() => {
  if (!gameState.value || activePosition.value === null) return null
  return gameState.value.players[activePosition.value] || null
})
const isMyTurn = computed(() => currentTurnPlayer.value?.id === currentPlayer.value?.id)
let myTurnRefreshTimer: ReturnType<typeof setTimeout> | null = null
let pendingExpiryRefreshTimer: ReturnType<typeof setTimeout> | null = null
watch([isMyTurn, currentFreezeUntil], ([myTurn, freezeUntil]) => {
  if (myTurnRefreshTimer) { clearTimeout(myTurnRefreshTimer); myTurnRefreshTimer = null }
  if (!myTurn) return
  const delay = freezeUntil > Date.now() ? (freezeUntil - Date.now() + 120) : 120
  myTurnRefreshTimer = setTimeout(() => {
    if (!availableActions.value.includes(ActionType.DRAW) && !availableActions.value.includes(ActionType.DISCARD)) {
      refreshState()
    }
  }, Math.max(delay, 0))
})

const turnMessage = computed(() => {
  if (!gameState.value) {
    return '正在加载房间…'
  }

  const phase = gameState.value.phase
  // 如果牌已发（有人有手牌），即使 phase 还没更新也按 playing 处理
  if (phase === 'waiting' && !hasDealtCards.value) {
    return '等待玩家加入开始'
  }

  if (phase === 'waiting' && hasDealtCards.value) {
    return '准备发牌…'
  }

  const player = currentTurnPlayer.value
  if (player) {
    if (player.id === currentPlayer.value?.id) {
      return '轮到你了'
    }
    return `${player.name} 的回合`
  }

  return '等待其他玩家出牌'
})

const westHand = computed(() => getStableOpponentHand(leftPlayer.value))
const westMelds = computed(() => getStablePlayerMelds(leftPlayer.value))
const westAreaMemoKey = computed(() => getOpponentAreaMemoKey(leftPlayer.value))
const westDiscards = computed(() => getVisiblePlayerDiscards(leftPlayer.value))
const westIsWinner = computed(() => leftPlayer.value?.status === 'won')

const eastHand = computed(() => getStableOpponentHand(rightPlayer.value))
const eastMelds = computed(() => getStablePlayerMelds(rightPlayer.value))
const eastAreaMemoKey = computed(() => getOpponentAreaMemoKey(rightPlayer.value))
const eastDiscards = computed(() => getVisiblePlayerDiscards(rightPlayer.value))
const eastIsWinner = computed(() => rightPlayer.value?.status === 'won')
const isWinner = computed(() => currentPlayer.value?.status === 'won')

// ---- 各家摸牌标记（手牌数 +1 → 最后一张为新摸的牌，3s 后清除） ----
const northJustDrawnTileId = ref<string | null>(null)
const westJustDrawnTileId = ref<string | null>(null)
const eastJustDrawnTileId = ref<string | null>(null)
const selfJustDrawnTileId = ref<string | null>(null)
const selfPendingSupplementHighlight = ref(false)

let selfDrawnTimer: ReturnType<typeof setTimeout> | null = null

function trackDrawnTile(
  hand: any[],
  prevLen: { value: number },
  prevIds: { value: string[] },
  drawIdRef: { value: string | null },
  timerRef: { get: () => ReturnType<typeof setTimeout> | null; set: (v: ReturnType<typeof setTimeout> | null) => void },
  options?: { forceNextNewTile?: { value: boolean } }
) {
  const previousIds = new Set(prevIds.value)
  const newTile = hand.find(tile => tile?.id && !previousIds.has(tile.id))
  const shouldHighlightNormalDraw = hand.length === prevLen.value + 1
  const shouldHighlightSupplement = !!options?.forceNextNewTile?.value && !!newTile

  if ((shouldHighlightNormalDraw || shouldHighlightSupplement) && newTile?.id && newTile?.suit !== 'hua' && !newTile?.isFlower) {
    drawIdRef.value = newTile.id
    if (timerRef.get()) clearTimeout(timerRef.get()!)
    timerRef.set(setTimeout(() => { drawIdRef.value = null }, 3000))
    if (options?.forceNextNewTile) options.forceNextNewTile.value = false
  }
  prevLen.value = hand.length
  prevIds.value = hand.map(tile => tile?.id).filter(Boolean)
}

const northPrevHandLen = { value: northHand.value.length }
const westPrevHandLen = { value: westHand.value.length }
const eastPrevHandLen = { value: eastHand.value.length }
const selfPrevHandLen = { value: playerHand.value.length }
const northPrevHandIds = { value: northHand.value.map(tile => tile.id) }
const westPrevHandIds = { value: westHand.value.map(tile => tile.id) }
const eastPrevHandIds = { value: eastHand.value.map(tile => tile.id) }
const selfPrevHandIds = { value: playerHand.value.map(tile => tile.id) }

watch(northHand, (h) => {
  northPrevHandLen.value = h.length
  northPrevHandIds.value = h.map(tile => tile?.id).filter(Boolean)
  northJustDrawnTileId.value = null
})
watch(westHand, (h) => {
  westPrevHandLen.value = h.length
  westPrevHandIds.value = h.map(tile => tile?.id).filter(Boolean)
  westJustDrawnTileId.value = null
})
watch(eastHand, (h) => {
  eastPrevHandLen.value = h.length
  eastPrevHandIds.value = h.map(tile => tile?.id).filter(Boolean)
  eastJustDrawnTileId.value = null
})
watch(playerHand, (h) => trackDrawnTile(
  h,
  selfPrevHandLen,
  selfPrevHandIds,
  selfJustDrawnTileId,
  { get: () => selfDrawnTimer, set: (v) => { selfDrawnTimer = v } },
  { forceNextNewTile: selfPendingSupplementHighlight }
))

// ---- Interaction ----
const selectedTileId = ref<string | null>(null)
const claimableDiscardTileId = ref<string | null>(null)
const pendingDiscardTileId = ref<string | null>(null)
const pendingDiscardSnapshot = ref<DiscardGuardSnapshot | null>(null)

// ===== 出牌 =====
const canSubmitDiscard = (tile: Tile) => {
  if (isWinner.value || isInteractionLocked.value || isActionPending.value) return false
  if (!isMyTurn.value) return false
  if (pendingDiscardTileId.value === tile.id) return false
  const concealedCount = currentPlayer.value?.hand?.concealedTiles?.length || 0
  if (concealedCount < 2 || concealedCount % 3 !== 2) return false
  return availableActions.value.includes(ActionType.DISCARD)
}

const commitDiscard = (tile: Tile) => {
  if (!canSubmitDiscard(tile)) return
  pendingDiscardTileId.value = tile.id
  pendingDiscardSnapshot.value = buildDiscardGuardSnapshot({
    activePosition: activePosition.value,
    currentPlayerId: currentPlayer.value?.id || null,
    concealedCount: currentPlayer.value?.hand?.concealedTiles?.length || 0,
    discardPileLength: gameState.value?.discardPile?.length || 0,
    pendingActionsCount: gameState.value?.pendingActions?.length || 0,
    availableActions: [...availableActions.value]
  })
  selectedTileId.value = null
  resetAutoCount()
  playSound('tile-discard')
  // 出牌念牌
  if (tile.suit) playVoiceTile(tile.suit, tile.value)
  markDiscardAudioPlayed(tile)
  void executeAction(ActionType.DISCARD, tile.id).then((success) => {
    if (success) return
    pendingDiscardTileId.value = null
    pendingDiscardSnapshot.value = null
  })
}

// 拖拽超出阈值 → 直接出牌
const handleTileDiscard = (tile: Tile) => {
  if (!canSubmitDiscard(tile)) return
  if (discardMode.value !== 'drag' && discardMode.value !== 'tap_confirm') return
  commitDiscard(tile)
}

// ===== 双击出牌 =====
const handleTileDblclick = (tile: Tile) => {
  if (!canSubmitDiscard(tile)) return
  if (discardMode.value !== 'double_tap') return
  commitDiscard(tile)
}

const handleTileClick = (tile: Tile) => {
  if (isWinner.value || isInteractionLocked.value || isActionPending.value) return
  if (pendingDiscardTileId.value) return

  // 如果需要摸牌（showDraw为true），禁止点击手牌出牌
  if (showDraw.value) {
    return
  }

  const canDiscard = availableActions.value.includes(ActionType.DISCARD)
  if (!canDiscard) return

  if (selectedTileId.value === tile.id) {
    selectedTileId.value = null
  } else {
    selectedTileId.value = tile.id
  }
}

// ---- Claims ----
// Check if we have pending actions that require user input (like Pung/Kong/Hu)
// The backend sends availableActions. If we have PENG/KONG/HU, we show buttons.
// For PENG/KONG, we might need to select tiles if there are multiple options, 
// but usually PENG is unique for a given discard. KONG might be unique too.
// The backend `executeAction` for PENG doesn't require tileId if it's obvious, 
// but `gameManager.ts` implementation of `handlePeng` finds matching tiles automatically.

const showPendingClaim = computed(() => {
  const mine = myPendingAction.value
  if (!mine) return false
  return mine.availableActions.some(action =>
    action === ActionType.CHOW ||
    action === ActionType.PENG ||
    action === ActionType.KONG ||
    action === ActionType.HU ||
    action === ActionType.CONCEALED_KONG ||
    action === ActionType.EXTENDED_KONG
  )
})
const hasBlockingPendingClaim = computed(() => {
  const mine = myPendingAction.value
  if (!mine) return false
  return mine.availableActions.some(action =>
    action === ActionType.PENG ||
    action === ActionType.KONG ||
    action === ActionType.HU ||
    action === ActionType.CONCEALED_KONG ||
    action === ActionType.EXTENDED_KONG
  )
})
const showDraw = computed(() =>
  availableActions.value.includes(ActionType.DRAW) ||
  shouldExposeSharedDraw.value ||
  shouldPreviewDeferredDraw.value
)
// ★ 自动摸牌：无其他可选操作时自动摸牌
watch(showDraw, (val) => {
  if (!val || !autoDraw.value) return
  // 有其他优先操作时不自动摸
  const hasPriorityAction = showChow.value || showPeng.value || showKong.value || showHu.value
    || showRebel.value || showConcealedKong.value || showExtendedKong.value
  if (hasPriorityAction) return
  // 延迟 500ms 后自动摸牌（给动画和反应时间）
  setTimeout(() => {
    if (!showDraw.value || !autoDraw.value) return
    const hasPriorityNow = showChow.value || showPeng.value || showKong.value || showHu.value
      || showRebel.value || showConcealedKong.value || showExtendedKong.value
    if (hasPriorityNow) return
    void onDraw()
  }, 500)
})
const filteredCircularAvailableActions = computed(() => {
  if ((shouldExposeSharedDraw.value || shouldPreviewDeferredDraw.value) && !availableActions.value.includes(ActionType.DRAW)) {
    return [...availableActions.value, ActionType.DRAW]
  }
  return availableActions.value
})
const showChowPicker = ref(false)
const selectedChowOption = ref<number | null>(null)
const shouldShowActionButton = (type: ActionType) => {
  if (!availableActions.value.includes(type)) return false
  if (type === ActionType.CHOW && showChowPicker.value) return true
  return nowTs.value <= actionButtonsVisibleUntil.value
}

const showChow = computed(() => shouldShowActionButton(ActionType.CHOW))
const showPeng = computed(() => shouldShowActionButton(ActionType.PENG))
const showKong = computed(() => shouldShowActionButton(ActionType.KONG))
const showHu = computed(() => shouldShowActionButton(ActionType.HU))
const showRebel = computed(() => availableActions.value.includes(ActionType.REBEL))
const showThink = computed(() => availableActions.value.includes(ActionType.THINK))
const thinkRemaining = computed(() => {
  if (!gameState.value || !currentPlayer.value) return 0
  const maxChances = (gameState.value as any).thinkChances ?? 3
  const used = (gameState.value as any).thinkUsage?.[currentPlayer.value.id] ?? 0
  return maxChances - used
})
const canUseThink = computed(() => thinkRemaining.value > 0)
// 等我想一想决策犹豫期
const thinkFreezeActive = computed(() => {
  const until = (gameState.value as any)?.thinkFreezeUntil
  return until && until > Date.now()
})
const thinkFreezePlayerName = computed(() => {
  const pid = (gameState.value as any)?.thinkFreezePlayerId
  if (!pid || !gameState.value) return ''
  return gameState.value.players.find(p => p.id === pid)?.name || ''
})
const hasOtherPlayerThinkLock = computed(() => thinkFreezeActive.value && !isMyThinkFreezeOwner.value)
const hasOtherPlayerHuSelectionLock = computed(() => {
  const locks = ((gameState.value as any)?.huSelectionLocks || {}) as Record<string, number>
  return Object.keys(locks).some(playerId => playerId !== currentPlayer.value?.id)
})
const isDrawBlockedByDecisionLock = computed(() => hasOtherPlayerThinkLock.value || hasOtherPlayerHuSelectionLock.value)
const drawBlockedNoticeVisible = ref(false)
const drawBlockedNoticeText = ref('等其他玩家决策')
let drawBlockedNoticeTimer: ReturnType<typeof setTimeout> | null = null
const showDrawBlockedNotice = (text = '等其他玩家决策') => {
  drawBlockedNoticeText.value = text
  drawBlockedNoticeVisible.value = true
  if (drawBlockedNoticeTimer) clearTimeout(drawBlockedNoticeTimer)
  drawBlockedNoticeTimer = setTimeout(() => {
    drawBlockedNoticeVisible.value = false
    drawBlockedNoticeTimer = null
  }, 1400)
}
const isMyThinkFreezeOwner = computed(() => {
  const pid = (gameState.value as any)?.thinkFreezePlayerId
  return !!pid && pid === currentPlayer.value?.id
})
const thinkFreezeCountdown = ref(0)
let thinkCountdownTimer: any = null
watch(thinkFreezeActive, (active) => {
  if (thinkCountdownTimer) clearInterval(thinkCountdownTimer)
  if (active) {
    const update = () => {
      const until = (gameState.value as any)?.thinkFreezeUntil || 0
      thinkFreezeCountdown.value = Math.max(0, Math.ceil((until - Date.now()) / 1000))
    }
    update()
    thinkCountdownTimer = setInterval(update, 500)
  } else {
    thinkFreezeCountdown.value = 0
  }
})

// 胡牌面板状态
const showHuPanel = ref(false)
// 本地控制：仅胡牌确认后才显示"你赢了"标签
const confirmedWinner = ref(false)

// 计算胡牌组合：将手牌排列成 顺子/刻子 + 对子
const huCombinations = computed(() => {
  if (!showHu.value || !playerHand.value) return []
  const hand = [...playerHand.value]
  const melds = playerMelds.value || []
  const combos = arrangeWinningHand(hand, melds)
  // 按牌面大小排序
  combos.forEach(c => {
    c.groups.sort((a, b) => {
      const minA = Math.min(...a.tiles.map(t => t.value))
      const minB = Math.min(...b.tiles.map(t => t.value))
      if (a.type === 'pair' && b.type !== 'pair') return 1
      if (a.type !== 'pair' && b.type === 'pair') return -1
      return minA - minB
    })
  })
  return combos
})

// 排列手牌为顺子/刻子+对子的组合
function arrangeWinningHand(hand: any[], existingMelds: any[]): any[] {
  if (hand.length === 0 && existingMelds.length > 0) return [{ groups: [] }]

  const sorted = [...hand].sort((a, b) => {
    const suitOrder: Record<string, number> = { wan: 0, tiao: 1, dots: 2, feng: 3, jian: 4, hua: 5 }
    const sA = suitOrder[a.suit] ?? 9
    const sB = suitOrder[b.suit] ?? 9
    if (sA !== sB) return sA - sB
    return a.value - b.value
  })

  const results: any[] = []

  function findCombinations(tiles: any[], groups: any[]): void {
    if (tiles.length === 0) {
      results.push({ groups: [...groups] })
      return
    }

    // 尝试取对子（每种牌最多用一次作为对子）
    if (tiles.length >= 2 && tiles.length % 3 === 2) {
      for (let i = 0; i < tiles.length - 1; i++) {
        if (tilesEqual(tiles[i], tiles[i + 1])) {
          const remaining = tiles.filter((_, idx) => idx !== i && idx !== i + 1)
          const pair = { type: 'pair', tiles: [tiles[i], tiles[i + 1]] }
          findMelds(remaining, [...groups, pair])
          break
        }
      }
    } else {
      findMelds(tiles, groups)
    }
  }

  function findMelds(tiles: any[], groups: any[]): void {
    if (tiles.length === 0) {
      results.push({ groups: [...groups] })
      return
    }
    if (tiles.length % 3 !== 0) return

    // 尝试刻子
    if (tiles.length >= 3 && tilesEqual(tiles[0], tiles[1]) && tilesEqual(tiles[1], tiles[2])) {
      findCombinations(tiles.slice(3), [...groups, { type: 'triplet', tiles: tiles.slice(0, 3) }])
    }

    // 尝试顺子（仅数牌）
    const first = tiles[0]
    if (['wan', 'tiao', 'dots'].includes(first.suit)) {
      const second = tiles.find(t => t.suit === first.suit && t.value === first.value + 1 && t.id !== first.id)
      if (second) {
        const third = tiles.find(t => t.suit === first.suit && t.value === first.value + 2 && t.id !== first.id && t.id !== second.id)
        if (third) {
          const remaining = tiles.filter(t => t.id !== first.id && t.id !== second.id && t.id !== third.id)
          findCombinations(remaining, [...groups, { type: 'sequence', tiles: [first, second, third] }])
        }
      }
    }
  }

  function tilesEqual(a: any, b: any): boolean {
    return a.suit === b.suit && a.value === b.value
  }

  findCombinations(sorted, [])

  // 去重
  const seen = new Set<string>()
  return results.filter(r => {
    const key = r.groups.map((g: any) => `${g.type}:${g.tiles.map((t: any) => `${t.suit}${t.value}`).join(',')}`).sort().join('|')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  }).slice(0, 5) // 最多显示5种排列
}

// 胡牌选项（从后端获取，含分数和牌型）
const winOptions = ref<any[]>([])
const lastHuReviewOptions = ref<any[]>([])
const lastSelectedHuCombo = ref<number | null>(null)
const isHuReviewMode = ref(false)
const displayWinOptions = computed(() => [...winOptions.value].sort((a, b) => (b.summary?.finalPoints ?? b.score ?? 0) - (a.summary?.finalPoints ?? a.score ?? 0)).slice(0, 3))
const activeHuOptions = computed(() => (isHuReviewMode.value ? lastHuReviewOptions.value : displayWinOptions.value))
const canReviewLatestHuSelection = computed(() => {
  return currentPlayer.value?.status === 'won' && lastHuReviewOptions.value.length > 0
})
const canReviewHuSelection = computed(() => {
  if (!showSettlement.value || !currentPlayer.value?.id) return false
  const winners = Array.isArray(currentSettlementRound.value?.winnerDetails) ? currentSettlementRound.value.winnerDetails : []
  return winners.some((winner: any) => winner.playerId === currentPlayer.value?.id) && lastHuReviewOptions.value.length > 0
})
const fetchWinOptions = async () => {
  try {
    const res = await $fetch<any>('/api/game/win-options', {
      query: { gameId: roomId.value, playerId: currentPlayer.value?.id }
    })
    const options = (res.winOptions || []).slice(0, 3)
    // 快照当前输家人数，避免后续牌局进展导致总赢变动
    const players = Array.isArray(gameState.value?.players) ? gameState.value.players : []
    const loserCount = Math.max(1, players.filter(p => p.id !== playerId.value && p.status !== 'won').length)
    for (const opt of options) {
      opt._cachedPayerCount = opt.type === 'self_draw' ? loserCount : 1
    }
    winOptions.value = options
  } catch (err) {
    console.error('Failed to fetch win options:', err)
    winOptions.value = []
  }
}

const syncHuSelectionLock = async (locked: boolean) => {
  if (!roomId.value || !currentPlayer.value?.id) return
  try {
    await $fetch('/mahjong/api/game/hu-selection', {
      method: 'POST',
      body: {
        gameId: roomId.value,
        playerId: currentPlayer.value.id,
        locked
      }
    })
  } catch (error) {
    console.error('[hu-selection] Failed to sync lock:', error)
  }
}

// 选择胡牌组合
const selectedHuCombo = ref<number | null>(null)
const onHu = async () => {
  // 不管自摸还是捉冲，都弹面板
  isHuReviewMode.value = false
  await fetchWinOptions()
  await syncHuSelectionLock(true)
  showHuPanel.value = true
  selectedHuCombo.value = 0
}
const onConfirmHu = async (index: number) => {
  hideActionButtonsNow()
  resetAutoCount()
  playSound('tile-hu')
  const selectedOption: any = displayWinOptions.value[index]
  if (selectedOption?.type === 'self_draw') {
    // 由 game state watcher 统一播放 selfHu 语音
  } else {
    playVoiceAction('hu')
  }
  lastHuReviewOptions.value = displayWinOptions.value.map((option: any) => ({ ...option }))
  lastSelectedHuCombo.value = index
  isHuReviewMode.value = false
  showHuPanel.value = false; confirmedWinner.value = true
  const success = await executeAction(ActionType.HU, undefined, undefined, displayWinOptions.value[index]?.internalLabel || displayWinOptions.value[index]?.label)
  if (!success) {
    await syncHuSelectionLock(false)
  }
}
const onCancelHu = async () => {
  showHuPanel.value = false
  confirmedWinner.value = false
  selectedHuCombo.value = isHuReviewMode.value ? lastSelectedHuCombo.value : null
  isHuReviewMode.value = false
  await syncHuSelectionLock(false)
}
const openHuReviewPanel = () => {
  if (!lastHuReviewOptions.value.length) return
  isHuReviewMode.value = true
  showHuPanel.value = true
  selectedHuCombo.value = lastSelectedHuCombo.value ?? 0
}

// ===== 审批流程 =====
const myPendingAction = computed(() => {
  if (!gameState.value || !currentPlayer.value) return null
  return gameState.value.pendingActions.find(pa => pa.playerId === currentPlayer.value!.id) || null
})
const myPendingExpiresAt = computed(() => Number((myPendingAction.value as any)?.expiresAt ?? 0))
const isSharedDrawClaimWindow = computed(() => {
  if (!isMyTurn.value || !currentPlayer.value || !gameState.value) return false
  const pending = gameState.value.pendingActions || []
  if (!pending.length) return false
  if (pending.some(pa => pa.playerId !== currentPlayer.value!.id)) return false
  return pending.every(pa =>
    Array.isArray(pa.availableActions) &&
    pa.availableActions.length > 0 &&
    pa.availableActions.every(action => action === ActionType.CHOW || action === ActionType.PASS)
  )
})
const shouldExposeSharedDraw = computed(() => {
  if (!isSharedDrawClaimWindow.value) return false
  const pending = myPendingAction.value
  if (!pending || myPendingExpiresAt.value <= nowTs.value) return false
  return true
})

const shouldPreviewDeferredDraw = computed(() => {
  if (!isMyTurn.value) return false
  const pending = myPendingAction.value
  if (!pending || myPendingExpiresAt.value <= nowTs.value) return false
  const actions = Array.isArray((pending as any)?.availableActions) ? (pending as any).availableActions : []
  return actions.some((action: ActionType) =>
    action === ActionType.CHOW ||
    action === ActionType.PENG ||
    action === ActionType.KONG ||
    action === ActionType.HU ||
    action === ActionType.CONCEALED_KONG ||
    action === ActionType.EXTENDED_KONG
  )
})

const hasDeferredDrawWindow = computed(() => {
  return shouldPreviewDeferredDraw.value && !isSharedDrawClaimWindow.value
})

const hasSharedDrawWindow = computed(() => {
  return (availableActions.value.includes(ActionType.DRAW) || shouldExposeSharedDraw.value) && myPendingExpiresAt.value > nowTs.value
})

const actionVisualFreezeUntil = computed(() => {
  // [Fix] only show freeze countdown during own turn
  if (!isMyTurn.value) return 0
  const freezeFromPending = currentFreezeUntil.value
  if (freezeFromPending > nowTs.value) return freezeFromPending

  return 0
})

const chowOptions = computed(() => {
  const pending = myPendingAction.value as { tile?: Tile; chowOptions?: string[][] } | null
  const discardTile = pending?.tile
  if (!discardTile || !pending?.chowOptions?.length) return []
  return pending.chowOptions
    .map((tileIds) => {
      const handTiles = tileIds
        .map(tileId => playerHand.value.find(tile => tile.id === tileId))
        .filter((tile): tile is Tile => !!tile)
      if (handTiles.length !== tileIds.length) return null
      const previewTiles = [...handTiles, discardTile].sort((a, b) => a.value - b.value)
      return {
        tileIds,
        previewTiles,
        label: previewTiles.map(tile => `${tile.value}`).join('-')
      }
    })
    .filter((option): option is { tileIds: string[]; previewTiles: Tile[]; label: string } => !!option)
})

const isMyApprovalWaiting = computed(() => {
  if (!actionApprovalEvent.value) return false
  const myPending = myPendingAction.value
  if (!myPending) return false
  return actionApprovalEvent.value.candidatePlayerId !== currentPlayer.value?.id
})

// 审批弹窗倒计时（3秒）
let rebelTimer_ = null
const rebelCountdownSec = ref(5)
const rebelCountdownPercent = ref(100)
watch(rebelEvent, (event) => {
  if (rebelTimer_) { clearInterval(rebelTimer_); rebelTimer_ = null }
  if (!event) return
  rebelCountdownSec.value = 5
  rebelCountdownPercent.value = 100
  const end = event.rebelEndTime
  const tick = () => {
    const remaining = Math.max(0, end - Date.now())
    rebelCountdownSec.value = Math.ceil(remaining / 1000)
    rebelCountdownPercent.value = (remaining / 5000) * 100
    if (remaining <= 0 && rebelTimer_) {
      clearInterval(rebelTimer_)
      rebelTimer_ = null
    }
  }
  tick()
  rebelTimer_ = setInterval(tick, 100)
})
onUnmounted(() => { if (rebelTimer_) { clearInterval(rebelTimer_); rebelTimer_ = null } })

const approvalCountdownRatio = computed(() => {
  const expiresAt = actionApprovalEvent.value?.expiresAt
  if (!expiresAt) return 1
  const totalMs = Math.max(getActionWindowMs(gameState.value), 1)
  const leftMs = Math.max(0, expiresAt - nowTs.value)
  return Math.max(0, Math.min(1, leftMs / totalMs))
})
const approvalCountdownSec = computed(() => {
  const expiresAt = actionApprovalEvent.value?.expiresAt
  if (!expiresAt) return 0
  return Math.max(0, Math.ceil((expiresAt - nowTs.value) / 1000))
})
watch(
  [() => isMyTurn.value, () => myPendingExpiresAt.value, () => availableActions.value.join(',')],
  ([myTurn, expiresAt, actions]) => {
    if (pendingExpiryRefreshTimer) {
      clearTimeout(pendingExpiryRefreshTimer)
      pendingExpiryRefreshTimer = null
    }
    if (!myTurn || !expiresAt || expiresAt <= Date.now()) return
    const actionList = actions ? actions.split(',').filter(Boolean) : []
    const stillWaitingForWindowToEnd =
      !actionList.includes(ActionType.DRAW) &&
      !actionList.includes(ActionType.DISCARD)
    if (!stillWaitingForWindowToEnd) return
    pendingExpiryRefreshTimer = setTimeout(() => {
      refreshState()
    }, Math.max(expiresAt - Date.now() + 150, 0))
  },
  { immediate: true }
)
watch(
  [
    () => gameState.value?.pendingActions,
    () => gameState.value?.availableActions,
    () => gameState.value?.hesitationWindow,
    () => currentPlayer.value?.id,
    () => isMyTurn.value
  ],
  () => {
    const myId = currentPlayer.value?.id
    const pending = (gameState.value as any)?.pendingActions || []
    const mine = myId ? pending.find((pa: any) => pa.playerId === myId) : null
    const selfAvailableActions = availableActions.value || []
    if (mine || selfAvailableActions.includes(ActionType.HU) || hasSharedDrawWindow.value) {
      const newUntil = mine?.expiresAt || Date.now() + getActionWindowMs(gameState.value)
      // 只设置更大的值（不重启已有的倒计时）
      if (newUntil > actionButtonsVisibleUntil.value) {
        actionButtonsVisibleUntil.value = newUntil
      }
    } else {
      actionButtonsVisibleUntil.value = 0
    }
  },
  { deep: true, immediate: true }
)

watch(
  [
    () => availableActions.value.join(','),
    () => currentPlayer.value?.id,
    () => isActionPending.value,
    () => activePosition.value,
    () => currentPlayer.value?.hand?.concealedTiles?.length,
    () => gameState.value?.discardPile?.length,
    () => gameState.value?.pendingActions?.length
  ],
  () => {
    const nextSnapshot = buildDiscardGuardSnapshot({
      activePosition: activePosition.value,
      currentPlayerId: currentPlayer.value?.id || null,
      concealedCount: currentPlayer.value?.hand?.concealedTiles?.length || 0,
      discardPileLength: gameState.value?.discardPile?.length || 0,
      pendingActionsCount: gameState.value?.pendingActions?.length || 0,
      availableActions: [...availableActions.value]
    })
    if (pendingDiscardTileId.value && shouldReleasePendingDiscardGuard(pendingDiscardSnapshot.value, nextSnapshot, isMyTurn.value)) {
      pendingDiscardTileId.value = null
      pendingDiscardSnapshot.value = null
    }
    if (!availableActions.value.includes(ActionType.DISCARD) || pendingDiscardTileId.value) {
      selectedTileId.value = null
    }
  },
  { immediate: true }
)

watch(
  () => gameState.value?.discardPile,
  (next, prev) => {
    const previous = Array.isArray(prev) ? prev : []
    const current = Array.isArray(next) ? next : []
    if (current.length >= previous.length) return
    // 弃牌池减少通常意味着该牌被吃/碰/杠认领，立即隐藏响应按钮，避免残留亮起
    hideActionButtonsNow()
  },
  { deep: true }
)

watch(
  () => [showChow.value, chowOptions.value.length],
  ([canChow, optionCount]) => {
    if (!canChow || optionCount <= 1) {
      showChowPicker.value = false
      selectedChowOption.value = null
    }
  }
)

watch(
  [() => actionApprovalEvent.value?.candidatePlayerId, () => gameState.value?.pendingActions],
  () => {
    const event = actionApprovalEvent.value
    if (!event) return
    const pending = (gameState.value as any)?.pendingActions || []
    const stillPending = pending.some((pa: any) => pa.playerId === event.candidatePlayerId)
    if (!stillPending || (event.expiresAt && event.expiresAt <= Date.now())) {
      actionApprovalEvent.value = null
    }
  },
  { deep: true }
)

const onApprovalChoice = async (choice: string) => {
  try {
    await $fetch('/mahjong/api/game/approval-choice', {
      method: 'POST',
      body: {
        gameId: roomId.value,
        playerId: currentPlayer.value?.id,
        choice
      }
    })
    actionApprovalEvent.value = null
    replacePendingAction(choice === 'pass' ? ActionType.PASS : (choice as ActionType))
    await refreshState()
  } catch (err) {
    console.error('Approval choice failed:', err)
  }
}

// ===== 容我想一想 =====
const showThinkOptions = ref(false)
const thinkOptions = computed(() => {
  const opts: Array<{ action: string; label: string; cssClass: string }> = []
  if (showHu.value) opts.push({ action: 'hu', label: '胡', cssClass: 'think-opt--hu' })
  if (showKong.value || showConcealedKong.value || showExtendedKong.value)
    opts.push({ action: 'kong', label: '杠', cssClass: 'think-opt--kong' })
  if (showPeng.value) opts.push({ action: 'peng', label: '碰', cssClass: 'think-opt--peng' })
  opts.push({ action: 'cancel', label: '算了', cssClass: 'think-opt--cancel' })
  return opts
})
const onThinkPopup = () => {
  if (thinkOptions.value.length <= 1) return // 只有"算了"就不弹
  showThinkOptions.value = true
}
const onThinkOption = async (action: string) => {
  showThinkOptions.value = false
  if (action === 'cancel') return // 纯关闭，不执行任何操作
  // 执行对应的action
  if (action === 'hu') await onHu()
  else if (action === 'kong') handleCircularAction('kong')
  else if (action === 'peng') onPeng()
}

// ===== 决策犹豫期计时 =====
const actionCountdownRatio = computed(() => {
  const pending = myPendingAction.value
  if (!pending?.expiresAt) return 1
  const totalMs = hesitationWindow.value // 决策犹豫期
  const leftMs = Math.max(0, pending.expiresAt - nowTs.value)
  return Math.max(0, Math.min(1, leftMs / totalMs))
})

const canCheatHu = computed(
  () => isAdminUser.value && isMyTurn.value && gameState.value?.phase === GamePhase.PLAYING
)

const onDraw = async () => {
  if (isDrawBlockedByDecisionLock.value) {
    showDrawBlockedNotice()
    return
  }
  resetAutoCount()
  playSound('tile-draw')
  const success = await executeAction(ActionType.DRAW)
  if (!success && isDrawBlockedByDecisionLock.value) {
    showDrawBlockedNotice()
  }
}
const hideActionButtonsNow = () => {
  actionButtonsVisibleUntil.value = 0
}

const submitChow = (tileIds?: string[]) => {
  hideActionButtonsNow()
  resetAutoCount()
  playSound('tile-chow')
  playVoiceAction('chow')
  showChowPicker.value = false
  selectedChowOption.value = null
  executeAction(ActionType.CHOW, undefined, tileIds)
}
const onChow = () => {
  if (chowOptions.value.length > 1) {
    showChowPicker.value = true
    selectedChowOption.value = 0
    return
  }
  submitChow(chowOptions.value[0]?.tileIds)
}
const onConfirmChowPicker = () => {
  if (selectedChowOption.value === null) return
  submitChow(chowOptions.value[selectedChowOption.value]?.tileIds)
}
const onCancelChowPicker = () => {
  showChowPicker.value = false
  selectedChowOption.value = null
}
const onPeng = () => { hideActionButtonsNow(); resetAutoCount(); playSound('tile-pong'); playVoiceAction('pong'); executeAction(ActionType.PENG) }
const onKong = () => {
  hideActionButtonsNow()
  resetAutoCount()
  selfPendingSupplementHighlight.value = true
  playSound('tile-kong')
  playVoiceAction('kong')
  executeAction(ActionType.KONG)
}
const onRebel = () => { resetAutoCount(); playSound('tile-rebel'); playVoiceAction('rebel'); executeAction(ActionType.REBEL) }
const onThink = () => { resetAutoCount(); executeAction(ActionType.THINK) }
const onCheatHu = () => { resetAutoCount(); playSound('tile-hu'); playVoiceAction('hu'); executeAction(ActionType.CHEAT_HU) }

// 退房结算
const showSettlement = ref(false)
const showWinnerReveal = ref(false)
const winnerRevealData = ref<any[]>([])
const _revealPhaseStartedAt = ref(0)
const revealCountdown = computed(() => {
  if (!showWinnerReveal.value || !_revealPhaseStartedAt.value) return 5
  const elapsed = Math.floor((Date.now() - _revealPhaseStartedAt.value) / 1000)
  return Math.max(0, 5 - elapsed)
})

// 亮牌阶段：把 winnerRevealData 中的 handTiles/exposedMeldGroups 转为牌图分组
const getRevealGroups = (w: any): Tile[][] => {
  const handTiles = Array.isArray(w.handTiles)
    ? w.handTiles.filter((t: any) => t?.suit !== 'hua' && t?.suit !== 'flower')
    : []
  const exposedMeldGroups = Array.isArray(w.exposedMeldGroups)
    ? w.exposedMeldGroups.map((g: any) => Array.isArray(g) ? g.filter((t: any) => t?.suit !== 'hua' && t?.suit !== 'flower') : []).filter((g: any[]) => g.length > 0)
    : []
  // 尝试用 arrangeWinningHand 分解手牌
  const combos = arrangeWinningHand(handTiles, [])
  if (combos.length > 0 && combos[0].groups?.length) {
    const concealedGroups = combos[0].groups.map((g: any) => Array.isArray(g?.tiles) ? g.tiles : (Array.isArray(g) ? g : []))
    return [...concealedGroups, ...exposedMeldGroups]
  }
  // fallback: 全部手牌作为一组
  return [handTiles, ...exposedMeldGroups]
}

// 亮牌阶段：所有玩家手牌（明牌）
const revealAllPlayers = computed(() => {
  if (!showWinnerReveal.value || !gameState.value?.players?.length) return []
  const winnerNames = new Set(winnerRevealData.value.map((w: any) => w.playerName))
  return gameState.value.players
    .filter((p: any) => p.status === 'playing' || winnerNames.has(p.name))
    .map((p: any) => {
      const hand = p.hand?.concealedTiles || []
      const exposed = (p.hand?.exposedMelds || []).flatMap((m: any) => m.tiles || [])
      const allTiles = [...hand, ...exposed].filter((t: any) => t?.suit !== 'hua' && t?.suit !== 'flower')
      return {
        id: p.id,
        name: p.name,
        isWinner: winnerNames.has(p.name),
        tiles: allTiles
      }
    })
})

const settlementData = ref<any>(null)
const lastAutoSettlementKey = ref('')
const wallExhaustedCountdown = ref(10)
const wallExhaustedTimer = ref(null)

const settleFinalMode = ref(false)
const isRoundWallExhausted = ref(false)
const isWallExhaustedSettlement = computed(() => isRoundWallExhausted.value)

const cancelWallExhaustedCountdown = () => {
  if (wallExhaustedTimer.value !== null) {
    clearInterval(wallExhaustedTimer.value)
    wallExhaustedTimer.value = null
  }
  wallExhaustedCountdown.value = 0
}

const finishSettleToFinal = async () => {
  cancelWallExhaustedCountdown()
  settleFinalMode.value = true
  try {
    await $fetch('/mahjong/api/game/settle', {
      method: 'POST',
      body: {
        gameId: roomId.value,
        playerId: currentPlayer.value?.id,
        action: 'save',
        debugAccessToken: typeof route.query.debugAccessToken === 'string' ? route.query.debugAccessToken : undefined
      }
    })
  } catch (e) {
    console.error('[Auto Save] Failed:', e)
  }
}

const startWallExhaustedCountdown = () => {
  wallExhaustedCountdown.value = 10
  settleFinalMode.value = false
  wallExhaustedTimer.value = window.setInterval(() => {
    wallExhaustedCountdown.value--
    if (wallExhaustedCountdown.value <= 0) {
      cancelWallExhaustedCountdown()
      if (isSettleRequested.value) {
        // 退房申请中 → 切到最终结算视图
        settleFinalMode.value = true
      } else {
        // 倒计时结束 → 主动调API推进到STARTING，不被动等广播
        void startNextRound()
      }
    }
  }, 1000)
}

const formatSignedScore = (score: any): string => {
  const n = Number(score ?? 0)
  return n > 0 ? `+${n}` : String(n)
}

const FIXED_SETTLEMENT_FAN: Record<string, number> = {
  '风碰': 40,
  '风一色': 20,
  '清碰': 20,
  '混碰': 10,
  '大吊碰碰胡': 10,
  '大吊混一色': 10,
  '大吊清一色': 10,
  '大吊清碰': 20,
  '大吊风一色': 20,
  '大吊风碰': 40,
  '大吊': 10,
  '清一色': 10,
  '无花自摸': 10,
  '杠开': 10,
  '八花自摸': 20,
  '四百搭': 10
}

const parseFixedFanFromDetails = (details: any): number | null => {
  if (!Array.isArray(details)) return null
  for (const entry of details) {
    if (typeof entry !== 'string') continue
    const match = entry.match(/=\s*(\d+)番$/)
    if (match) return Number(match[1])
  }
  return null
}

const getSettlementBaseFanDisplay = (winner: any): string | number => {
  if (!winner) return '-'
  const parsedFixedFan = parseFixedFanFromDetails(winner.details)
  if (parsedFixedFan != null) return parsedFixedFan
  const fixedFan = FIXED_SETTLEMENT_FAN[winner.handTypeName || '']
  if (typeof fixedFan === 'number') return fixedFan
  return winner.baseFan ?? '-'
}

const formatMeldTiles = (tiles: any[]): string => {
  const sorted = [...tiles].sort((a, b) => {
    const suitOrder: Record<string, number> = { wan: 0, tiao: 1, dots: 2, feng: 3, jian: 4 }
    const sa = suitOrder[a.suit] ?? 99
    const sb = suitOrder[b.suit] ?? 99
    if (sa !== sb) return sa - sb
    return (Number(a.value) || 0) - (Number(b.value) || 0)
  })
  return sorted.map(tile => tileLabel(tile)).filter(Boolean).join('')
}

const formatWinnerTiles = (winner: any): string => {
  const handTiles = Array.isArray(winner?.handTiles)
    ? winner.handTiles.filter((tile: any) => tile?.suit !== 'hua' && tile?.suit !== 'flower')
    : []
  const exposedMeldGroups = Array.isArray(winner?.exposedMeldGroups)
    ? winner.exposedMeldGroups
      .map((group: any) => Array.isArray(group) ? group.filter((tile: any) => tile?.suit !== 'hua' && tile?.suit !== 'flower') : [])
      .filter((group: any[]) => group.length > 0)
    : []
  const concealedCombos = arrangeWinningHand(handTiles, [])
  const concealedGroups = Array.isArray(concealedCombos?.[0]?.groups) ? concealedCombos[0].groups : []
  const concealedMelds = concealedGroups
    .map((group: any) => Array.isArray(group?.tiles) ? formatMeldTiles(group.tiles) : '')
    .filter(Boolean)
  const exposedMelds = exposedMeldGroups.map(group => formatMeldTiles(group)).filter(Boolean)
  const allMelds = [...concealedMelds, ...exposedMelds]
  if (allMelds.length) return allMelds.join('/')
  const exposedTiles = Array.isArray(winner?.exposedTiles) ? winner.exposedTiles : []
  const tiles = [...handTiles, ...exposedTiles].filter((tile: any) => tile?.suit !== 'hua' && tile?.suit !== 'flower')
  if (tiles.length) return tiles.map(tileLabel).filter(Boolean).join('')
  return '-'
}

const getSettlementWinnerSequence = (round: any, playerId: string) => {
  const winners = Array.isArray(round?.winners) ? round.winners : []
  const index = winners.findIndex((winnerId: string) => winnerId === playerId)
  return index >= 0 ? String(index + 1) : ''
}

const getSettlementPayerCount = (round: any, winner: any) => {
  const transfers = Array.isArray(round?.transfers) ? round.transfers : []
  const payers = new Set(
    transfers
      .filter((transfer: any) => transfer?.toPlayerId === winner?.playerId && transfer?.fromPlayerId)
      .map((transfer: any) => transfer.fromPlayerId)
  )
  return Math.max(1, payers.size)
}

const getRoundSettlementRows = (round: any) => {
  const winners = Array.isArray(round?.winnerDetails) ? round.winnerDetails : []
  const winnerByPlayer = new Map(winners.map((winner: any) => [winner.playerId, winner]))
  const rows = (settlementData.value?.playerStats || []).map((player: any) => {
    const winner: any = winnerByPlayer.get(player.id)
    const score = Number(round?.scores?.[player.id] ?? 0)
    return {
      playerId: player.id,
      playerName: player.name,
      isWinner: !!winner,
      winSequence: winner ? getSettlementWinnerSequence(round, player.id) : '',
      handType: winner?.handTypeName || '-',
      tiles: winner ? formatWinnerTiles(winner) : '-',
      flowerCount: winner?.flowerCount ?? 0,
      menQing: winner ? (typeof winner.isMenQing === 'boolean' ? (winner.isMenQing ? '门清' : '非门清') : '-') : '-',
      wild: winner ? (typeof winner.hasWild === 'boolean' ? (winner.hasWild ? '有' : '无') : '-') : '-',
      baseFan: getSettlementBaseFanDisplay(winner),
      finalPoints: winner?.finalPoints ?? '-',
      winMode: winner
        ? (winner.discarderId
          ? `捉冲 ${winner.discarderName || '未知'}`
          : `自摸 ${getSettlementPayerCount(round, winner)}家`)
        : '-',
      score,
      scoreLabel: formatSignedScore(score)
    }
  })
  return rows.sort((a, b) => {
    if (a.isWinner && b.isWinner) {
      const seqA = Number(a.winSequence || Number.MAX_SAFE_INTEGER)
      const seqB = Number(b.winSequence || Number.MAX_SAFE_INTEGER)
      return seqA - seqB
    }
    if (a.isWinner) return -1
    if (b.isWinner) return 1
    return 0
  })
}

const currentSettlementRound = computed(() => {
  const rounds = Array.isArray(settlementData.value?.roundDetails) ? settlementData.value.roundDetails : []
  return rounds.length > 0 ? rounds[rounds.length - 1] : null
})

/** 计算真正第几局：用 gameState 的 roundStats 长度或 roundNumber */
const settlementRoundIndex = computed(() => {
  if (gameState.value?.roundStats && Array.isArray(gameState.value.roundStats)) {
    return gameState.value.roundStats.length
  }
  if (currentSettlementRound.value?.roundNumber) {
    return currentSettlementRound.value.roundNumber
  }
  return 1
})

const currentSettlementRows = computed(() => {
  return currentSettlementRound.value ? getRoundSettlementRows(currentSettlementRound.value) : []
})

const isSettleRequested = ref(false)

const sortedSettleStats = computed(() => {
  const stats = settlementData.value?.playerStats || []
  return [...stats].sort((a: any, b: any) => (b.totalScore ?? 0) - (a.totalScore ?? 0))
})

const formatScoreSigned = (score: number) => score > 0 ? `+${score}` : `${score}`

const onRequestSettle = async () => {
  try {
    if (isSettleRequested.value) {
      // 取消退房
      const res = await $fetch('/mahjong/api/game/settle', {
        method: 'POST',
        body: {
          gameId: roomId.value,
          playerId: currentPlayer.value?.id,
          action: 'cancel',
          debugAccessToken: typeof route.query.debugAccessToken === 'string' ? route.query.debugAccessToken : undefined
        }
      })
      if ((res as any)?.success) {
        isSettleRequested.value = false
        settlementData.value = null
      }
    } else {
      // 申请退房
      const res = await $fetch('/mahjong/api/game/settle', {
        method: 'POST',
        body: {
          gameId: roomId.value,
          playerId: currentPlayer.value?.id,
          action: 'request',
          debugAccessToken: typeof route.query.debugAccessToken === 'string' ? route.query.debugAccessToken : undefined
        }
      })
      if ((res as any)?.success) {
        settlementData.value = (res as any).data
        isSettleRequested.value = true
      }
    }
  } catch (e) {
    console.error('[Settle] Failed:', e)
  }
}
const onSaveSettle = async () => {
  try {
    await $fetch('/mahjong/api/game/settle', {
      method: 'POST',
      body: {
        gameId: roomId.value,
        playerId: currentPlayer.value?.id,
        action: 'save',
        debugAccessToken: typeof route.query.debugAccessToken === 'string' ? route.query.debugAccessToken : undefined
      }
    })
    showSettlement.value = false
    backToLobby()
  } catch (e) {
    console.error('[Settle Save] Failed:', e)
  }
}

const onExitSettle = () => {
  showSettlement.value = false
  backToLobby()
}

// 玩家操作卡片
const showPlayerCard = ref(false)
const playerCardPlayer = ref<any>(null)
const isBotPlayer = (p: any) => p?.name?.startsWith('AI-') || p?.name?.startsWith('电脑') || false
const isSpectatorGamePlayer = computed(() => {
  if (!gameState.value?.players || !currentPlayer.value) return true
  return !gameState.value.players.some((p: any) => p.id === currentPlayer.value?.id)
})
// 换位置相关
const mySwapInfo = ref<{ totalChances: number; usedChances: number; remaining: number }>({ totalChances: 0, usedChances: 0, remaining: 0 })
const canSwap = computed(() => mySwapInfo.value.remaining > 0)
const canOpenPlayerCardFor = (player: any) => {
  // 名牌点击始终可打开玩家卡片，查看信息或观赛
  return true
}
const onPlayerNameClick = (player: any) => {
  if (!player) return
  if (!canOpenPlayerCardFor(player)) return
  playerCardPlayer.value = player
  showPlayerCard.value = true
}
const onAILeave = async () => {
  if (!playerCardPlayer.value) return
  const aiName = playerCardPlayer.value.name
  showPlayerCard.value = false
  try {
    await $fetch('/mahjong/api/game/kick-player', {
      method: 'POST',
      body: {
        gameId: roomId.value,
        playerId: currentPlayer.value?.id,
        targetPlayerId: playerCardPlayer.value.id
      }
    })
    addBroadcast(`🚪 [${aiName}] 下局将被移除！`, 'warn')
    await refreshState()
  } catch (e) {
    console.error('[AI Leave] Failed:', e)
  }
}
const onAIReplace = async () => {
  if (!playerCardPlayer.value) return
  const aiName = playerCardPlayer.value.name
  const myName = userName.value || currentPlayer.value?.name || '某玩家'
  showPlayerCard.value = false
  try {
    await $fetch('/mahjong/api/game/replace-player', {
      method: 'POST',
      body: {
        gameId: roomId.value,
        playerId: currentPlayer.value?.id,
        targetPlayerId: playerCardPlayer.value.id,
        spectatorName: myName
      }
    })
    addBroadcast(`🙋 [${myName}] 下局将接替 [${aiName}]！`, 'info')
    await refreshState()
  } catch (e) {
    console.error('[AI Replace] Failed:', e)
  }
}
const isReplacingBot = ref(false)
const onRequestBotReplace = async (botPlayer: any) => {
  if (isReplacingBot.value) return
  isReplacingBot.value = true
  showPlayerCard.value = false
  const myName = userName.value || currentPlayer.value?.name || '观赛者'
  try {
    await $fetch('/mahjong/api/game/replace-bot', {
      method: 'POST',
      body: {
        gameId: roomId.value,
        spectatorId: currentPlayer.value?.id,
        targetBotId: botPlayer.id,
        playerName: myName
      }
    })
    addBroadcast(`🙋 [${myName}] 已申请下局替换 [${botPlayer.name}]，掷骰时生效！`, 'info')
    await refreshState()
  } catch (e: any) {
    addBroadcast(e?.data?.message || e?.message || '替换申请失败', 'warn')
    console.error('[BotReplace] Failed:', e)
  } finally {
    isReplacingBot.value = false
  }
}

// 暂时离席
const onTempLeave = async () => {
  if (!playerCardPlayer.value) return
  showPlayerCard.value = false
  try {
    await $fetch('/mahjong/api/game/kick-player', {
      method: 'POST',
      body: {
        gameId: roomId.value,
        playerId: currentPlayer.value?.id,
        targetPlayerId: currentPlayer.value?.id
      }
    })
    addBroadcast(`🪑 [${currentPlayer.value?.name}] 下局暂时离席`, 'info')
    await refreshState()
  } catch (e) {
    console.error('[TempLeave] Failed:', e)
  }
}

// 托管
const onBotMode = async () => {
  if (!playerCardPlayer.value) return
  showPlayerCard.value = false
  try {
    await $fetch('/mahjong/api/game/bot-mode', {
      method: 'POST',
      body: {
        gameId: roomId.value,
        playerId: currentPlayer.value?.id,
        enabled: true
      }
    })
    addBroadcast(`🤖 [${currentPlayer.value?.name}] 已托管给AI！`, 'warn')
    await refreshState()
  } catch (e) {
    console.error('[BotMode] Failed:', e)
  }
}

// 我回来了（取消AI托管）
const onPlayerBack = async () => {
  if (!currentPlayer.value) return
  try {
    await $fetch('/mahjong/api/game/comeback', {
      method: 'POST',
      body: {
        gameId: roomId.value,
        playerId: currentPlayer.value.id
      }
    })
    isAIControlled.value = false
    addBroadcast(`👋 [${currentPlayer.value.name}] 已回到牌桌！`, 'success')
    await refreshState()
  } catch (e) {
    console.error('[Comeback] Failed:', e)
  }
}

// 快捷托管（不需要长按玩家卡）
const onBotModeDirect = async () => {
  if (!currentPlayer.value) return
  try {
    await $fetch('/mahjong/api/game/bot-mode', {
      method: 'POST',
      body: {
        gameId: roomId.value,
        playerId: currentPlayer.value.id,
        enabled: true
      }
    })
    isAIControlled.value = true
    addBroadcast(`🤖 [${currentPlayer.value.name}] 已托管给AI！`, 'warn')
    await refreshState()
  } catch (e) {
    console.error('[BotMode] Failed:', e)
  }
}

// 换位置
const onSwapPosition = async () => {
  if (!playerCardPlayer.value || !currentPlayer.value) return
  const targetName = playerCardPlayer.value.name
  const myName = currentPlayer.value.name
  showPlayerCard.value = false
  try {
    const resp = await $fetch('/mahjong/api/game/swap-position', {
      method: 'POST',
      body: {
        gameId: roomId.value,
        playerId: currentPlayer.value.id,
        targetId: playerCardPlayer.value.id
      }
    }) as any
    if (resp?.success) {
      addBroadcast(`🔄 [${myName}] 下一局开始将与 [${targetName}] 互换位置！`, 'special')
      await refreshState()
      await updateSwapInfo()
    }
  } catch (e: any) {
    console.error('[Swap] Failed:', e)
  }
}

const updateSwapInfo = async () => {
  if (!currentPlayer.value || !gameState.value) return
  // 从 game state 计算换位信息
  const threshold = (gameState.value as any).liangShanThreshold ?? 4000
  const sm = (gameState.value as any).settlementMultiplier ?? 1
  const alerts = (gameState.value as any).qjAlerts || []
  const myAlert = alerts.find((a: any) => a.playerId === currentPlayer.value?.id)
  // 计算负向得分
  const roundStats = (gameState.value as any).roundStats || []
  let myCumulative = 0
  for (const rs of roundStats) {
    const s = rs.scores?.[currentPlayer.value.id] ?? 0
    if (s > 0) myCumulative += s
  }
  const myEffective = myCumulative * sm
  if (myEffective < 0) {
    const absScore = Math.abs(myEffective)
    const totalChances = Math.min(Math.floor(absScore / threshold), 10)
    const used = ((gameState.value as any).swapRequests || []).filter((r: any) => r.playerId === currentPlayer.value?.id).length
    mySwapInfo.value = { totalChances, usedChances: used, remaining: totalChances - used }
  } else {
    mySwapInfo.value = { totalChances: 0, usedChances: 0, remaining: 0 }
  }
}

const showLiangShanButton = computed(() => gameState.value?.phase === 'playing')

const dealerDiscardCount = computed(() => {
  const history = Array.isArray((gameState.value as any)?.actionHistory) ? (gameState.value as any).actionHistory : []
  const dealerIndex = Number((gameState.value as any)?.dealerIndex ?? -1)
  const dealerId = dealerIndex >= 0 ? gameState.value?.players?.[dealerIndex]?.id : ''
  if (!dealerId) return 0
  return history.filter((action: any) => action?.type === ActionType.DISCARD && action?.playerId === dealerId).length
})

// 梁山聚义：庄家前3张可点、全局倍数未满8倍、未投过票
const canLiangShan = computed(() => {
  if (gameState.value?.phase !== 'playing') return false
  if (dealerDiscardCount.value >= 3) return false
  const inherit = (gameState.value as any)?.inheritMultiplier ?? 1
  const round = (gameState.value as any)?.roundMultiplier ?? 1
  if (Math.min(inherit * round, 8) >= 8) return false
  return true
})
const hasVotedLiangShan = computed(() => {
  const votes = (gameState.value as any)?.liangShanVotes || []
  return votes.includes(currentPlayer.value?.id)
})
const onLiangShan = () => {
  if (dealerDiscardCount.value >= 3) {
    addBroadcast('⚠️ 已过三巡，不允许聚义', 'warn')
    return
  }
  // 广播由服务端 handleLiangShan 处理，客户端不重复广播
  resetAutoCount()
  playSound('tile-rebel')
  playVoiceAction('liangShan')
  executeAction(ActionType.LIANG_SHAN)
}

// 圆形操作按钮事件处理
const handleCircularAction = (type: string) => {
  switch (type) {
    case 'draw':
      // 摸牌通常由服务端自动触发，这里尝试执行 draw action
      void onDraw()
      break
    case 'chow':
      onChow()
      break
    case 'peng':
      onPeng()
      break
    case 'kong':
      // 杠牌优先级：明杠(弃牌) > 续杠 > 暗杠
      // 明杠是响应式操作（别人出的牌），优先级最高
      // 续杠和暗杠是自摸操作，续杠修改已有的副露，优先级高于暗杠
      if (showKong.value) {
        onKong()
      } else if (showExtendedKong.value) {
        onExtendedKong()
      } else if (showConcealedKong.value) {
        onConcealedKong()
      }
      break
    case 'hu':
      onHu()
      break
    case 'think':
      onThink()
      break
    case 'rebel':
      onRebel()
      break
    case 'liangshan':
      onLiangShan()
      break
  }
}

// For self-drawn Kong (Concealed or Extended)
const showConcealedKong = computed(() => availableActions.value.includes(ActionType.CONCEALED_KONG))
const showExtendedKong = computed(() => availableActions.value.includes(ActionType.EXTENDED_KONG))
const hasPriorityActions = computed(
  () =>
    hasSharedDrawWindow.value ||
    showChow.value ||
    showPeng.value ||
    showKong.value ||
    showHu.value ||
    showConcealedKong.value ||
    showExtendedKong.value
)

// 监听回合变化，启动/停止倒计时（移到 hasPriorityActions 定义之后，避免 TDZ）
watch([isMyTurn, hasPriorityActions], ([myTurn, hasActions]) => {
  if (isAIControlled.value) return
  if (myTurn || hasActions) {
    startTurnTimer()
  } else {
    stopTurnTimer()
  }
}, { immediate: true })

// 监听游戏进入PLAYING阶段，强制触发倒计时
watch(() => gameState.value?.phase, (phase, oldPhase) => {
  if (phase === GamePhase.PLAYING && isMyTurn.value && !isAIControlled.value) {
    startTurnTimer()
  }
  // [2026-05-29] 验牌阶段：显示"客官请验牌！"倒计时
  if (phase === GamePhase.REVEAL && oldPhase !== GamePhase.REVEAL) {
    if (!showWinnerReveal.value) {
      _revealPhaseStartedAt.value = Date.now()
      showWinnerReveal.value = true
    }
  }
  if (phase === GamePhase.ENDED && oldPhase === GamePhase.REVEAL) {
    showWinnerReveal.value = false
  }
  // 新局开始：重置所有弹窗，显示骰子界面
  if (phase === GamePhase.STARTING) {
    showSettlement.value = false
    showLiangShanOverlay.value = false
    showWinnerReveal.value = false
    showDiceOverlay.value = true
  }
  // 发牌完成：隐藏骰子界面
  if (phase === GamePhase.PLAYING && oldPhase === GamePhase.STARTING) {
    showDiceOverlay.value = false
  }
})

const actionWindowText = computed(() => {
  if (!hasPriorityActions.value && !isMyTurn.value) return ''
  const pending = myPendingAction.value
  const expiresAt = Number(pending?.expiresAt ?? 0)
  if (!expiresAt) return ''
  const leftMs = Math.max(0, expiresAt - nowTs.value)
  return `响应窗口：${(leftMs / 1000).toFixed(1)}s（超时自动过）`
})

const showMobileActionNotice = computed(() =>
  shouldRotateView.value && (
    hasPriorityActions.value ||
    showDraw.value ||
    availableActions.value.includes(ActionType.DISCARD)
  )
)
const mobileActionNoticeText = computed(() => {
  const labels: string[] = []
  if (showDraw.value) labels.push('摸')
  if (availableActions.value.includes(ActionType.DISCARD)) labels.push('出')
  if (showHu.value) labels.push('胡')
  if (showKong.value || showConcealedKong.value || showExtendedKong.value) labels.push('杠')
  if (showPeng.value) labels.push('碰')
  if (showChow.value) labels.push('吃')
  if (!labels.length) return '有可用操作，请向下查看按钮'
  return `可操作：${labels.join(' / ')}`
})

const onConcealedKong = () => {
  // We need to know which tiles to kong. 
  // If there's only one set of 4, we can auto-select.
  // For now, let's assume the backend handles it or we need UI for it.
  // The backend `handleConcealedKong` expects `tileIds`.
  // We can find the group of 4 in hand.
  if (!currentPlayer.value) return
  const counts: Record<string, Tile[]> = {}
  for (const t of currentPlayer.value.hand.concealedTiles) {
    const key = `${t.suit}-${t.value}`
    if (!counts[key]) counts[key] = []
    counts[key].push(t)
  }
  
  for (const key in counts) {
    const group = counts[key]
    if (group && group.length === 4) {
      playSound('kong-draw')
      selfPendingSupplementHighlight.value = true
      executeAction(ActionType.CONCEALED_KONG, undefined, group.map(t => t.id))
      return
    }
  }
}

const onExtendedKong = () => {
  // Find the tile in hand that matches an exposed triplet
  if (!currentPlayer.value) return
  for (const meld of currentPlayer.value.hand.exposedMelds) {
    if (meld.type === 'triplet' && meld.tiles.length) { // MeldType.TRIPLET
      const baseTile = meld.tiles[0]!
      const match = currentPlayer.value.hand.concealedTiles.find(t => 
        t.suit === baseTile.suit && t.value === baseTile.value
      )
      if (match) {
        playSound('kong-draw')
        selfPendingSupplementHighlight.value = true
        executeAction(ActionType.EXTENDED_KONG, match.id)
        return
      }
    }
  }
}

// ---- 开局流程：掷骰子 → 发牌 ----
// 防重复点击标志
const onStartGame = async () => {
  if (isGameStarting.value) return
  isGameStarting.value = true
  if (gameState.value?.phase === GamePhase.PLAYING) {
    console.warn('[onStartGame] Game already in PLAYING phase, skipping')
    return
  }
  console.log('[onStartGame] Setting STARTING phase on server...')

  try {
    await enterStartingPhaseWithDiceOverlay()
  } catch (err) {
    console.error('[onStartGame] Failed:', err)
  } finally {
    isGameStarting.value = false
  }
}

/** 新开局流程 - 点击"发牌"：调用 dealGame，切换到 PLAYING 阶段 */
const onDealTiles = async () => {
  if (isGameStarting.value) return
  isGameStarting.value = true
  hasDicePreview.value = false
  diceFromWebSocket.value = false
  showDoubleReminder.value = false
  if (doubleReminderTimer) {
    clearTimeout(doubleReminderTimer)
    doubleReminderTimer = null
  }
  console.log('[onDealTiles] Calling dealGame API...')
  try {
    await dealGame()
    showDiceOverlay.value = false
    console.log('[onDealTiles] Done, phase:', gameState.value?.phase)
  } finally {
    isGameStarting.value = false
  }
}

// ---- 牌局快讯（广播消息） ----
interface BroadcastMsg {
  id: number
  text: string
  type: 'info' | 'warn' | 'special' | 'win'
  timestamp: number
  timeLabel: string
}
const broadcastMessages = ref<BroadcastMsg[]>([])
const displayBroadcastMessages = computed(() => {
  if (!isPreGameTransition.value) return broadcastMessages.value

  const msgs: BroadcastMsg[] = []

  if (!gameState.value) {
    msgs.push({ id: -1, text: '⏳ 正在连接牌桌…', type: 'info', timestamp: Date.now(), timeLabel: 'NOW' })
  } else {
    const room = gameState.value.roomNumber || '----'
    const count = waitingPlayers.value.length

    // 房间号 + 人数
    msgs.push({
      id: -2,
      text: `🏠 房间号 #${room} · ${count}/4 人`,
      type: 'info',
      timestamp: Date.now(),
      timeLabel: 'NOW'
    })

    if (count >= 4 && isDealerUser.value) {
      msgs.push({
        id: -3,
        text: '✅ 四人已到齐，点击下方按钮开始牌局',
        type: 'info',
        timestamp: Date.now(),
        timeLabel: 'NOW'
      })
    } else {
      msgs.push({
        id: -3,
        text: count >= 4 ? '✅ 四人已到齐，等待房主开始牌局' : '💬 等待其他玩家加入',
        type: 'info',
        timestamp: Date.now(),
        timeLabel: 'NOW'
      })
    }

    // 每位玩家一条
    waitingPlayers.value.forEach((p, i) => {
      const isDealer = p.isDealer ? ' · 房主' : ''
      const isBot = p.isBot ? ' 🤖' : ''
      msgs.push({
        id: -4 - i,
        text: `👤 ${p.name}${isDealer}${isBot} 已就位`,
        type: 'info',
        timestamp: Date.now(),
        timeLabel: 'NOW'
      })
    })
  }

  // 合并真实广播消息（最多保留3条，让路）
  const realMsgs = broadcastMessages.value.slice(-3)
  return [...msgs, ...realMsgs].slice(0, 8)
})
let broadcastId = 0
const recentBroadcastTexts = new Map<string, number>()
const addBroadcast = (
  text: string,
  type: BroadcastMsg['type'] = 'info',
  options?: { dedupeKey?: string }
) => {
  const now = Date.now()
  const timeLabel = formatBeijingTime(now)
  const sanitizedText = type === 'win'
    ? text.replace(/(胡牌)\s*[·•･][^·•･()（）\s]+/u, '$1')
    : text
  const dedupeKey = options?.dedupeKey || sanitizedText
  const lastAt = recentBroadcastTexts.get(dedupeKey) ?? 0
  if (now - lastAt < 30000) {
    return
  }
  recentBroadcastTexts.set(dedupeKey, now)
  for (const [key, ts] of recentBroadcastTexts) {
    if (now - ts > 300000) recentBroadcastTexts.delete(key)
  }
  broadcastMessages.value.push({ id: ++broadcastId, text: sanitizedText, type, timestamp: now, timeLabel })
  if (broadcastMessages.value.length > 20) {
    broadcastMessages.value = broadcastMessages.value.slice(-20)
  }
}

watch(
  () => [gameState.value?.phase, (gameState.value as any)?.roundStats?.length ?? 0, gameState.value?.gameId, (gameState.value as any)?.endReason],
  async ([phase, roundCount, gameId, endReason]) => {
    if (phase !== GamePhase.ENDED || !gameId || !currentPlayer.value?.id) return
    // REVEAL phase: don't trigger settlement here, let 5s timer trigger ENDED
    if (phase === GamePhase.REVEAL) return

    const settlementKey = `${gameId}-${roundCount}`
    if (lastAutoSettlementKey.value === settlementKey) return
    lastAutoSettlementKey.value = settlementKey

    // 统一从 roundStats 取结算数据（服务端已精确计算，含赢家手牌/牌型/番数）
    const lastRound = gameState.value?.roundStats?.[gameState.value.roundStats.length - 1]
    if (!lastRound) return

    const isWallExhausted = endReason === GameEndReason.WALL_EXHAUSTED

    settlementData.value = {
      roundDetails: [{
        ...lastRound,
        winnerDetails: lastRound.winnerDetails || []
      }],
      playerStats: (gameState.value?.players || []).map(p => ({
        id: p.id,
        name: p.name,
        totalScore: p.score ?? 0
      }))
    }
    isRoundWallExhausted.value = isWallExhausted

    // 聚义成功：显示弹窗，不显示结算
    const isLiangShanSuccess = !!(gameState.value as any)?.liangShanSuccess
    if (isLiangShanSuccess) {
      // 聚义成功，不显示结算面板，弹窗已由 liangShanVotes 逻辑触发
      return
    }

    // 流局或胡牌：5秒后显示结算（REVEAL阶段由服务端控制，手牌自动翻开）
    window.setTimeout(() => {
      showSettlement.value = true
      startWallExhaustedCountdown()
    }, isWallExhausted ? 1000 : 5000)
  }
)

// 追踪上一轮游戏状态，检测变化生成广播
const prevWinnersCount = ref(0)
const prevPhase = ref<string>('')
const prevBailoutRelations = ref<string>('')
const prevBotPlayers = ref<Set<string>>(new Set())
const prevRebelEvent = ref<any>(null)
const prevLiangShanVoteCount = ref(0)
const prevLiangShanVoteIds = ref<string[]>([])
const prevQjAlertIds = ref<Set<string>>(new Set())
const prevSwapRequestIds = ref<Set<string>>(new Set())
const prevIsMyTurn = ref(false)
const lastFastDiscardAt = ref(0)
const prevRealtimeDiscardCount = ref(0)
const voicedDiscardTiles = new Map<string, number>()
const voicedDiscardFingerprints = new Map<string, number>()
const DISCARD_VOICE_DEDUP_MS = 4000
const getDiscardVoiceFingerprint = (tile?: Partial<Tile> | null) => {
  if (!tile?.suit) return ''
  return `${tile.suit}-${tile.value}`
}
const markDiscardAudioPlayed = (tileOrId?: Partial<Tile> | string | null) => {
  const now = Date.now()
  const tileId = typeof tileOrId === 'string' ? tileOrId : tileOrId?.id
  const fingerprint = typeof tileOrId === 'string' ? '' : getDiscardVoiceFingerprint(tileOrId)
  if (tileId) voicedDiscardTiles.set(tileId, now)
  if (fingerprint) voicedDiscardFingerprints.set(fingerprint, now)
  for (const [id, ts] of voicedDiscardTiles) {
    if (now - ts > DISCARD_VOICE_DEDUP_MS) voicedDiscardTiles.delete(id)
  }
  for (const [fingerprintKey, ts] of voicedDiscardFingerprints) {
    if (now - ts > DISCARD_VOICE_DEDUP_MS) voicedDiscardFingerprints.delete(fingerprintKey)
  }
}
const recentlyPlayedDiscardAudio = (tile?: Partial<Tile> | null) => {
  if (!tile) return false
  const now = Date.now()
  const lastById = tile.id ? voicedDiscardTiles.get(tile.id) : undefined
  const fingerprint = getDiscardVoiceFingerprint(tile)
  const lastByFingerprint = fingerprint ? voicedDiscardFingerprints.get(fingerprint) : undefined
  return !!((lastById && now - lastById < DISCARD_VOICE_DEDUP_MS) || (lastByFingerprint && now - lastByFingerprint < DISCARD_VOICE_DEDUP_MS))
}
const handleRealtimeState = (e: Event) => {
  const detail = (e as CustomEvent).detail as any
  const discardCount = Array.isArray(detail?.discardPile) ? detail.discardPile.length : 0
  if (discardCount > prevRealtimeDiscardCount.value) {
    const lastTile = detail?.discardPile?.[discardCount - 1]
    if (recentlyPlayedDiscardAudio(lastTile)) {
      prevRealtimeDiscardCount.value = discardCount
      return
    }
    lastFastDiscardAt.value = Date.now()
    playSound('tile-discard')
    // 语音由 state watcher 统一播放（避免重复）
    markDiscardAudioPlayed(lastTile)
  }
  prevRealtimeDiscardCount.value = discardCount
}
watch(isMyTurn, (isMe) => {
  if (isMe && !prevIsMyTurn.value) {
    playSound('turn-notify')
  }
  prevIsMyTurn.value = isMe
})
// ---- 追踪其他玩家动作（用于触发音效）----
const prevOtherPlayerState = new Map<string, { meldCount: number; discardCount: number; replacedFlowerCount: number }>()
const _flowerVoicePlayed = new Set<string>()
let _flowerVoicePlayedTurnKey = ''  // roundNumber-turnCounter
let _flowerVoiceTurnCounter = 0
let _flowerVoicePrevPlayerIndex = -1
const prevBailoutMap = new Map<string, Map<number, number>>()
const getOtherMeldCount = (player: any) => (player?.hand?.exposedMelds?.length ?? 0)
const getOtherDiscardCount = (player: any) => (player?.hand?.discardedTiles?.length ?? 0)
const getReplacedFlowerMelds = (player: any) =>
  (player?.hand?.exposedMelds || []).filter((meld: any) => {
    const tile = meld?.tiles?.[0]
    return meld?.tiles?.length === 1 && tile?.suit === 'hua' && !!meld?.replacementDone
  })
const checkOtherPlayerSounds = (newState: any) => {
  if (!gameState.value?.players) return
  const cpIdx = newState?.currentPlayerIndex ?? 0
  if (cpIdx !== _flowerVoicePrevPlayerIndex) {
    _flowerVoiceTurnCounter++
    _flowerVoicePrevPlayerIndex = cpIdx
  }
  const turnKey = String(newState?.roundNumber ?? 0) + "-" + String(_flowerVoiceTurnCounter)
  if (turnKey !== _flowerVoicePlayedTurnKey) {
    _flowerVoicePlayed.clear()
    _flowerVoicePlayedTurnKey = turnKey
  }
  const pendingMeldVoices: Array<'kong' | 'pong' | 'chow'> = []
  const pendingDiscards: Array<{ suit: string; value: number; sound: boolean }> = []
  for (const player of newState.players) {
    const prev = prevOtherPlayerState.get(player.id)
    const meldCount = getOtherMeldCount(player)
    const discardCount = getOtherDiscardCount(player)
    const replacedFlowerMelds = getReplacedFlowerMelds(player)
    const replacedFlowerCount = replacedFlowerMelds.length
    if (prev) {
      const isSelf = player.id === playerId.value
      const isBotCtrl = !!(player as any).isBotControlled || isBotPlayer(player)
      const shouldPlayVoice = !isSelf || isBotCtrl  // AI托管时自己的动作也要播放语音
      // 补花语音也排队，确保出牌语音先于补花语音
      if (replacedFlowerCount > prev.replacedFlowerCount) {
        if (!_flowerVoicePlayed.has(player.id)) {
          _flowerVoicePlayed.add(player.id)
          pendingDiscards.push({ suit: 'flower', value: 0, sound: false })  // 占位，稍后播放补花语音
        }
      }
      // 先收集出牌，稍后播放语音（确保吃碰杠语音先于出牌语音）
      if (shouldPlayVoice && discardCount > prev.discardCount && Date.now() - lastFastDiscardAt.value > 250) {
        const newDiscards = (player.hand?.discardedTiles || []).slice(prev.discardCount)
        const lastNew = newDiscards[newDiscards.length - 1]
        if (!recentlyPlayedDiscardAudio(lastNew)) {
          pendingDiscards.push({ suit: lastNew?.suit, value: lastNew?.value, sound: true })
          markDiscardAudioPlayed(lastNew)
        }
      }
      if (meldCount > prev.meldCount) {
        const newMelds = (player.hand?.exposedMelds || []).slice(prev.meldCount)
        for (const m of newMelds) {
          const firstTile = m.tiles?.[0]
          const isFlowerReplacementMeld = m.tiles?.length === 1 && firstTile?.suit === 'hua'
          if (isFlowerReplacementMeld) continue
          if (m.type === 'kong' || m.tiles?.length === 4) {
            if (shouldPlayVoice) pendingMeldVoices.push('kong')
          } else if (m.type === 'triplet') {
            if (shouldPlayVoice) pendingMeldVoices.push('pong')
          } else {
            if (shouldPlayVoice) pendingMeldVoices.push('chow')
          }
        }
      }
    }
    prevOtherPlayerState.set(player.id, { meldCount, discardCount, replacedFlowerCount })
  }
  const currentIds = new Set(newState.players.map((p: any) => p.id))
  for (const id of prevOtherPlayerState.keys()) {
    if (!currentIds.has(id)) prevOtherPlayerState.delete(id)
  }
  // ★ 先播吃碰杠语音，再播出牌语音（修复顺序bug）
  for (const action of pendingMeldVoices) {
    if (action === 'kong') {
      playSound('tile-kong')
      playVoiceAction('kong')
    } else if (action === 'pong') {
      playSound('tile-pong')
      playVoiceAction('pong')
    } else {
      playSound('tile-chow')
      playVoiceAction('chow')
    }
  }
  // 出牌语音放在吃碰杠之后，补花在最后
  for (const d of pendingDiscards) {
    if (d.suit === 'flower') {
      // 补花语音：在出牌之后播放
      playSound('tile-draw')
      playVoiceAction('flowerReplace')
    } else {
      playSound('tile-discard')
      if (d.suit) playVoiceTile(d.suit, d.value)
    }
  }
}
const activePlayerCount = (state: any) => (state?.players || []).filter((p: any) => p.status === 'playing' && !p.isBotControlled).length

watch(() => gameState.value, (newState, oldState) => {
  if (!newState) return

  // 游戏开始
  if (newState.phase === 'playing' && prevPhase.value === 'waiting') {
    addBroadcast('🎉 房间满员，正式开干啦！', 'info')
    playSound('game-start')
  }
  // 每把开局时重新播报 QJ 线突破提醒，确保所有人看到
  if (newState.phase === 'playing' && prevPhase.value !== 'playing') {
    const existingAlerts = (newState as any).qjAlerts || []
    for (const alert of existingAlerts) {
      addBroadcast(`📢 [${alert.playerName}] 已达被聚义QJ线，特此广而告之！`, 'special')
    }
    // 重置 prevQjAlertIds，确保后续结算时能再次检测新增
    prevQjAlertIds.value = new Set<string>(existingAlerts.map((a: any) => a.playerId))
  }

  // 有人胡牌 → 播放胡牌音效 + 语音
  if (newState.winnersCount > prevWinnersCount.value && prevPhase.value === 'playing') {
    playSound('round-end')
    // 检测最新胡牌玩家是自摸还是捉冲，播放对应语音
    const newWinners = (newState.players || []).filter((p: any) => p.status === 'won' && !(oldState?.players || []).find((op: any) => op.id === p.id && op.status === 'won'))
    for (const w of newWinners) {
      if (w.isSelfDrawn) { playVoiceAction('selfHu') }
      else { playVoiceAction('hu') }
    }
  }

  // 流局
  if (newState.phase === 'ended' && oldState?.phase === 'playing') {
    const reason = (newState as any).endReason
    if (reason === 'wall_exhausted') {
      addBroadcast('💨 牌墙摸完，流局！倍数翻倍！', 'warn')
    }
    playSound('round-draw')
  }

  // 检测其他玩家的动作音效
  checkOtherPlayerSounds(newState)

  // 互包检测（通过 discard pile 变化 + pending 推断）
  // 简化：检查 actionHistory 最近的动作（只保留造反）
  const history = (newState as any).actionHistory || []
  if (history.length > 0) {
    const lastAction = history[history.length - 1]
    const lastTs = lastAction?.timestamp || 0
    const now = Date.now()
    // 只处理最近 3 秒内的动作
    if (now - lastTs < 3000) {
      if (lastAction.type === 'rebel') {
        const player = newState.players?.find((p: any) => p.id === lastAction.playerId)
        if (player) addBroadcast(`⚔️ [${player.name}] 提议梁山聚义！造反！`, 'special')
      }
    }
  }

  // 梁山聚义投票进度（播报但不透露具体谁投了）
  const currentVoteIds = ((newState as any).liangShanVotes || []) as string[]
  const currentVotes = currentVoteIds.length
  if (currentVotes > prevLiangShanVoteCount.value) {
    const initiatorId = currentVoteIds[0]
    const initiator = newState.players?.find((p: any) => p.id === initiatorId)
    // 之前没有发起消息 → 先播报发起
    if (prevLiangShanVoteCount.value === 0) {
      addBroadcast(`🔥 [${initiator?.name || '某玩家'}] 发起了梁山聚义！`, 'special')
    }
    if ((newState as any).liangShanSuccess) {
      console.log('[LiangShan] Popup triggered:', { currentVotes, activeCount: activePlayerCount(newState), liangShanSuccess: (newState as any).liangShanSuccess })
      addBroadcast(`🔥🔥🔥 全员响应梁山聚义！本局结束，下把翻倍！`, 'special')
      // 显示梁山聚义成功弹窗，3s 后主动推进到下一局
      showLiangShanOverlay.value = true
      setTimeout(() => {
        showLiangShanOverlay.value = false
        void startNextRound()
      }, 3000)
    } else {
      const newResponderIds = currentVoteIds.filter(id => !prevLiangShanVoteIds.value.includes(id))
      const responderNames = newResponderIds
        .filter(id => id !== initiatorId)
        .map(id => newState.players?.find((p: any) => p.id === id)?.name)
        .filter(Boolean)
      for (const responderName of responderNames) {
        addBroadcast(`🔥 [${responderName}] 响应了${initiator?.name || '发起者'}的梁山聚义！`, 'special')
      }
      addBroadcast(`🔥 有${currentVotes}名玩家响应了梁山聚义！`, 'special')
    }
  }
  prevLiangShanVoteCount.value = currentVotes
  prevLiangShanVoteIds.value = [...currentVoteIds]

  // 被聚义QJ线突破提醒（红色高亮）
  const currentAlerts = (newState as any).qjAlerts || []
  const currentAlertIds = new Set<string>(currentAlerts.map((a: any) => a.playerId))
  for (const alert of currentAlerts) {
    if (!prevQjAlertIds.value.has(alert.playerId)) {
      addBroadcast(`📢 [${alert.playerName}] 已达被聚义QJ线，特此广而告之！`, 'special')
    }
  }
  prevQjAlertIds.value = currentAlertIds as Set<string>

  // 换位置请求广播
  const currentSwapRequests = (newState as any).swapRequests || []
  const currentSwapIds = new Set<string>(currentSwapRequests.map((r: any) => `${r.playerId}-${r.targetId}`))
  for (const req of currentSwapRequests) {
    const key = `${req.playerId}-${req.targetId}`
    if (!prevSwapRequestIds.value.has(key)) {
      const from = (newState.players || []).find((p: any) => p.id === req.playerId)
      const to = (newState.players || []).find((p: any) => p.id === req.targetId)
      if (from && to) addBroadcast(`🔄 [${from.name}] 下一局开始将与 [${to.name}] 互换位置`, 'special')
    }
  }
  prevSwapRequestIds.value = currentSwapIds as Set<string>

  // 更新换位置信息
  updateSwapInfo()

  prevPhase.value = newState.phase
  prevWinnersCount.value = newState.winnersCount || 0
}, { deep: true })

watch(
  () => gameState.value?.phase,
  (newPhase, oldPhase) => {
    console.log('[DiceOverlay] phase changed:', oldPhase, '->', newPhase, 'showDiceOverlay was:', showDiceOverlay.value)
    if (newPhase === GamePhase.STARTING) {
      // 如果本地已经触发了骰子动画（enterStartingPhaseWithDiceOverlay hasDicePreview提前设置了），跳过 watcher
      if (hasDicePreview.value) {
        console.log('[DiceOverlay] Already triggered locally (hasDicePreview), skipping watcher')
        return
      }
      const prevPhase = oldPhase || gameState.value?.phase;
      if (!isSettleRequested.value) {
        showSettlement.value = false
        settlementData.value = null
      } else {
        showSettlement.value = false
      }
      isHuReviewMode.value = false
      showHuPanel.value = false
      confirmedWinner.value = false
      if (!hasDicePreview.value) {
        const humanRollPending = (gameState.value as any)?._humanRollPending
        if (!humanRollPending && !diceFromWebSocket.value) {
          // AI 庄家：从 gameState 取骰子值
          const serverDice = gameState.value?.dice
          if (serverDice && Array.isArray(serverDice) && serverDice.length >= 2) {
            diceValues.value = [serverDice[0], serverDice[1]]
          }
        }
        // 人类庄家：dice=[0,0] 不覆盖，保持默认等玩家点击
        hasDicePreview.value = true
      }
      showDiceOverlay.value = true
      console.log('[DiceOverlay] SET to true (STARTING)')

      // 🔄 自动下一局：来自结算/流局后
      if (prevPhase === GamePhase.ENDED) {
        if (isSettleRequested.value) {
          showDiceOverlay.value = false
          showSettlement.value = true
          return
        }
        const aiDealer = dealerPlayer.value
        if (aiDealer && isBotPlayer(aiDealer)) {
          // AI 庄家：自动发牌
          setTimeout(() => {
            if (gameState.value?.phase !== GamePhase.STARTING) return
            const needsSecondRoll = (gameState.value?.roundMultiplier ?? 1) === 1 &&
              (gameState.value?.diceRollCount ?? 2) >= 2
            const doDeal = () => {
              if (gameState.value?.phase === GamePhase.STARTING) {
                void onDealTiles()
              }
            }
            if (needsSecondRoll) {
              void onRollSecondDice()
              setTimeout(doDeal, 1500)
            } else {
              doDeal()
            }
          }, 800)
        }
        // 人类庄家：显示 idle 状态，等玩家点击掷骰子
      }
      return
    }
    if (newPhase !== GamePhase.STARTING) {
      showDiceOverlay.value = false
      hasDicePreview.value = false
      diceFromWebSocket.value = false
      console.log('[DiceOverlay] SET to false (phase=', newPhase, ')')
    }
  },
  { immediate: true }
)

// 🔧 强力兜底：不管 phase watch 是否触发，每次 gameState 更新都检查
watch(gameState, (newVal) => {
  checkAITakeover()
  if (newVal && newVal.phase !== GamePhase.STARTING && showDiceOverlay.value) {
    console.log('[DiceOverlay] FALLBACK: closing dice overlay (phase=', newVal.phase, ')')
    showDiceOverlay.value = false
    hasDicePreview.value = false
    diceFromWebSocket.value = false
  }
}, { deep: false })

// 🔧 超时强制关闭：如果 showDiceOverlay 为 true 超过8秒（给足STARTING时间），强制关闭
watch(showDiceOverlay, (val) => {
  if (!val) return
  const timer = setTimeout(() => {
    if (showDiceOverlay.value && gameState.value?.phase !== GamePhase.STARTING) {
      console.log('[DiceOverlay] TIMEOUT: forced close after 8s')
      showDiceOverlay.value = false
      hasDicePreview.value = false
    }
  }, 8000)
})

// 🔧 最终保险：从useGame的fetchGameState接收phase-check事件（每次API刷新都检查）
if (typeof window !== 'undefined') {
  window.addEventListener('mahjong-phase-check', ((e: CustomEvent) => {
    const phase = e.detail?.phase
    if (phase && phase !== 'starting' && showDiceOverlay.value) {
      console.log('[DiceOverlay] PHASE-CHECK: closing (phase=', phase, ')')
      showDiceOverlay.value = false
      hasDicePreview.value = false
    }
  }) as EventListener)
}

// AI 接管检测（通过轮询检查 botModePlayers）
const checkAITakeover = () => {
  if (!gameState.value?.players || !currentPlayer.value) return
  // 检查当前玩家是否被AI托管（从 gameState 的 isBotControlled 字段检测）
  const me = gameState.value.players.find(p => p.id === currentPlayer.value!.id)
  isAIControlled.value = !!(me as any)?.isBotControlled
}

// ---- Admin / Debug Functions ----
const otherPlayers = computed(() => {
  if (!gameState.value || !currentPlayer.value) return []
  return gameState.value.players.filter(p => p.id !== currentPlayer.value!.id)
})

const setupTestGame = async () => {
  if (!roomId.value) return
  
  // Join 3 bots
  const currentCount = gameState.value?.players.length || 1
  
  for (let i = currentCount + 1; i <= 4; i++) {
    await useFetch('/mahjong/api/game/join', {
      method: 'POST',
      body: { gameId: roomId.value, playerName: `电脑${i}` }
    })
  }
  
  await refreshState()
  
}

const forceDiscard = async (p: Player) => {
  if (!roomId.value || !p.hand.concealedTiles.length) {
    console.warn('Cannot force discard: No tiles found for player', p.name)
    return
  }
  
  // Pick first tile
  const firstTile = p.hand.concealedTiles.at(0)
  if (!firstTile) {
    console.warn('Cannot force discard: player has empty hand now', p.name)
    return
  }
  
  await useFetch('/mahjong/api/game/action', {
    method: 'POST',
    body: {
      gameId: roomId.value,
      playerId: p.id,
      action: ActionType.DISCARD,
      tileId: firstTile.id
    }
  })
  
  await refreshState()
}
</script>

<style scoped>
.mahjong-page {
  min-height: 100vh;
  min-height: 100dvh;
  height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at top, #153b2f, #07130e);
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: #f5f5f5;
  padding: 16px;
}

.room-viewport {
  width: 100%;
  display: flex;
  justify-content: center;
  min-height: 100%;
}

.room-container--rotated {
  max-width: none;
  display: flex;
  flex-direction: column;
}

.room-container {
  position: relative;
  background: rgba(7, 19, 14, 0.92);
  border-radius: 14px;
  padding: 16px 16px 20px;
  max-width: 1400px;
  width: 100%;
  box-shadow: 0 18px 45px rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.room-header {
  position: fixed;
  top: max(6px, env(safe-area-inset-top));
  left: 50%;
  transform: translateX(-50%);
  z-index: 120;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: max-content;
  max-width: min(92%, 720px);
  pointer-events: none;
}

.room-header--collapsed {
  gap: 0;
}

.room-header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 5px;
  width: 100%;
  padding: 8px 12px;
  border-radius: 14px;
  background: rgba(7, 19, 14, 0.92);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.28);
  pointer-events: auto;
}

.room-header-toggle {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 24px;
  min-width: 44px;
  padding: 5px 12px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(8, 20, 14, 0.82);
  color: rgba(255, 255, 255, 0.78);
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  cursor: pointer;
  transition: all 0.2s ease;
  pointer-events: auto;
}

.room-header > .room-header-toggle {
  display: none;
}

.room-header-toggle--inline {
  gap: 0;
  min-width: 28px;
  width: 28px;
  min-height: 28px;
  padding: 0;
  justify-content: center;
  flex: 0 0 auto;
}

.room-header-toggle:hover {
  color: #fff;
  background: rgba(13, 31, 22, 0.92);
  border-color: rgba(255, 255, 255, 0.2);
}

.room-header-toggle--collapsed {
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.18);
}

.room-header-toggle__icon {
  font-size: 0.6rem;
  line-height: 1;
}

.room-header-toggle__label {
  line-height: 1;
}

.header-actions {
  display: flex;
  gap: 5px;
  align-items: center;
}

.mahjong-button.secondary {
  background: rgba(60, 60, 60, 0.85);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.15);
}

.sound-off {
  opacity: 0.5;
}

.room-title-line {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
}

.header-broadcast-wrap {
  flex: 1;
  min-width: 440px;
  max-width: 1120px;
}

/* 房间号+退房结算同行布局 */
.room-header-row {
  display: flex;
  align-items: center;
  gap: 5px;
}
.room-header-row .mahjong-subtitle {
  flex: 1;
  margin: 0;
}
.settle-btn-header {
  flex: 0 0 auto;
  padding: 2px 15px;
  font-size: 0.7rem;
  border-radius: 6px;
  background: rgba(33, 150, 243, 0.8);  /* 蓝色，20%透明度 */
  color: #fff;
  font-weight: 700;
  border: 1px solid rgba(255, 255, 255, 0.2);
  cursor: pointer;
  white-space: nowrap;
  min-width: 108px;
}
.settle-btn-header:hover { background: rgba(25, 118, 210, 0.8); color: #fff; }
.ai-takeover-btn {
  background: rgba(76, 175, 80, 0.8);
  border-color: rgba(255, 255, 255, 0.25);
  min-width: auto;
  padding: 2px 10px;
}
.ai-takeover-btn:hover {
  background: rgba(76, 175, 80, 1);
}
.settle-btn--grayed { background: rgba(120, 120, 120, 0.4) !important; color: #aaa !important; border-color: rgba(255, 255, 255, 0.1) !important; box-shadow: none !important; }

/* 开始牌局按钮金色呼吸光晕 — 4人到齐时亮起 */
.start-game-glow {
  animation: breatheGold 1.8s ease-in-out infinite;
  box-shadow: 0 0 12px rgba(255, 215, 0, 0.4), 0 0 24px rgba(255, 215, 0, 0.2);
  border-color: rgba(255, 215, 0, 0.6);
  background: linear-gradient(135deg, rgba(255, 193, 7, 0.85), rgba(255, 152, 0, 0.85)) !important;
  color: #fff !important;
  text-shadow: 0 1px 4px rgba(0,0,0,0.4);
}
.start-game-glow:hover {
  background: linear-gradient(135deg, rgba(255, 193, 7, 1), rgba(255, 152, 0, 1)) !important;
  box-shadow: 0 0 20px rgba(255, 215, 0, 0.6), 0 0 40px rgba(255, 215, 0, 0.3);
}

@keyframes breatheGold {
  0%, 100% {
    box-shadow: 0 0 12px rgba(255, 215, 0, 0.4), 0 0 24px rgba(255, 215, 0, 0.2);
    transform: scale(1);
  }
  50% {
    box-shadow: 0 0 24px rgba(255, 215, 0, 0.8), 0 0 48px rgba(255, 215, 0, 0.4), 0 0 72px rgba(255, 215, 0, 0.15);
    transform: scale(1.04);
  }
}

.mahjong-title {
  font-size: 1.4rem;
  margin-bottom: 2px;
  letter-spacing: 0.04em;
  flex-shrink: 0;
}

.mahjong-subtitle {
  font-size: 0.9rem;
  opacity: 0.85;
}

/* ===== 主布局：牌桌 + 扩展信息区 ===== */
.room-main {
  display: flex;
  flex-direction: column;
  gap: 5px;
  position: relative;
}

@media (min-width: 900px) {
  .room-main {
    flex-direction: row;
    align-items: stretch;
    gap: 5px;
  }

  .table-wrapper {
    flex: 0 1 70%;
  }
}

.table-wrapper {
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
}

.mahjong-table {
  position: relative;
  z-index: 1;
  width: min(100vw, calc(80vh * 4/3), 1200px);
  aspect-ratio: 4 / 3;
  --tile-w: 28px;
  --tile-h: 40px;
  --discard-scale: 0.95;
  --tile-gap: 2px;
  border-radius: 14px;
  /* 深木色外框 */
  background: #4a2c0a;
  border: 12px solid #3a2006;
  box-shadow:
    inset 0 0 0 3px rgba(90,60,20,0.5),
    inset 0 0 40px rgba(0,0,0,0.4),
    0 12px 30px rgba(0, 0, 0, 0.8);
  padding: 0;
  overflow: hidden;
  --seat-side-inset: 4.8%;
  --seat-top-inset: 2.8%;
  --seat-bottom-inset: 0.1%;
  --seat-top-width: 58%;
  --seat-bottom-width: 72%;
  --seat-side-width: 112px;
  --seat-side-height: 76%;
  --seat-side-player-offset: 2.8%;
  --discard-center-rect-half-w: 17%;
  --discard-center-rect-half-h: 13.4%;
}

/* 绿色麻将桌布内层 */
.table-felt {
  position: absolute;
  inset: 0;
  border-radius: 8px;
  overflow: hidden;
}

.table-felt--classic-green {
  background:
    radial-gradient(ellipse at 50% 50%, rgba(40,90,50,0.95) 0%, rgba(28,65,35,0.98) 45%, rgba(18,42,22,1) 100%);
}

.table-felt--jade-green {
  background:
    radial-gradient(ellipse at 50% 50%, rgba(54,117,103,0.96) 0%, rgba(33,83,74,0.98) 46%, rgba(18,48,44,1) 100%);
}

.table-felt--royal-red {
  background:
    radial-gradient(ellipse at 50% 50%, rgba(130,43,43,0.96) 0%, rgba(96,24,24,0.98) 45%, rgba(54,10,10,1) 100%);
}

:global(.glass-settings-section) {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 0;
}
:global(.glass-settings-section + .glass-settings-section) {
  border-top: 1px solid rgba(255,255,255,0.08);
}
:global(.glass-settings-section-header) {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 0 6px;
}
:global(.glass-settings-section-title) {
  color: rgba(255,255,255,0.96);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.04em;
}
:global(.glass-settings-section-subtitle) {
  color: rgba(255,255,255,0.58);
  font-size: 11px;
  line-height: 1.45;
}
:global(.glass-settings-stack) {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
:global(.glass-settings-card) {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin: 0 4px;
  padding: 10px 12px;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);
}
:global(.glass-settings-card-title) {
  color: rgba(255,255,255,0.9);
  font-size: 12px;
  font-weight: 700;
}
:global(.glass-settings-card-subtitle) {
  color: rgba(255,255,255,0.58);
  font-size: 11px;
  line-height: 1.45;
}
:global(.glass-settings-row--panel) {
  margin: 0 4px;
  padding: 10px 12px;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);
}
:global(.glass-settings-row-main) {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
:global(.glass-settings-copy) {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
:global(.glass-settings-help) {
  color: rgba(255,255,255,0.56);
  font-size: 11px;
  line-height: 1.4;
}
:global(.glass-theme-options) {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  padding: 0;
}
:global(.glass-theme-chip) {
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.88);
  border-radius: 999px;
  font-size: 12px;
  padding: 5px 10px;
  cursor: pointer;
  transition: background-color 0.18s ease, border-color 0.18s ease, color 0.18s ease, transform 0.18s ease;
}
:global(.glass-theme-chip:hover) {
  transform: translateY(-1px);
}
:global(.glass-theme-chip--active) {
  background: rgba(56, 189, 248, 0.24);
  border-color: rgba(56, 189, 248, 0.55);
  color: #fff;
}
:global(.glass-settings-select-wrap--compact) {
  padding: 0;
}

/* 操作按钮：固定在桌面正中央 */
.center-actions {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 20;
}

/* ===== 弃牌区定位 ===== */
/* 上家：靠近牌桌中心，旋转180° */
/* 四个弃牌区居中对齐牌桌十字 */
:deep(.discard-zone--top) {
  top: calc(50% - var(--discard-center-rect-half-h) + 8px);
  left: 50%;
  transform: translate(-50%, -50%);
}
:deep(.discard-zone--bottom) {
  top: calc(50% + var(--discard-center-rect-half-h));
  left: 50%;
  transform: translate(-50%, 0);
}
:deep(.discard-zone--left) {
  top: calc(50% - 12px);
  left: calc(50% - var(--discard-center-rect-half-w) - 10px);
  transform: translate(-100%, -50%);
}
:deep(.discard-zone--right) {
  top: calc(50% - 12px);
  left: calc(50% + var(--discard-center-rect-half-w) + 10px);
  transform: translate(0, -50%);
}

/* ===== 扩展信息区 ===== */
.extended-info-panel {
  flex: 0 0 30%;
  width: 30%;
  min-width: 280px;
  max-width: 420px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
  max-height: 80vh;
  /* 移动端按 --other-tile-scale 整体缩放扩展区 */
  font-size: calc(1rem * var(--other-tile-scale, 1));
}

/* 操作按钮区：与战绩榜同宽，底部对齐牌桌 */
.action-buttons-panel {
  margin-top: auto;
  flex-shrink: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

/* 更多特殊操作横条 */
.extra-actions-bar {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 7px;
  background: rgba(10, 20, 15, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  flex-wrap: nowrap;
}

.extra-actions-label {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.35);
  margin-right: 2px;
  flex-shrink: 0;
}

.extra-actions-group {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  justify-content: flex-start;
}

.loading-overlay {
  position: absolute;
  inset: 0;
  z-index: 100;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #07130e;
  gap: 5px;
}
.loading-spinner {
  width: 36px;
  height: 36px;
  border: 3px solid rgba(255, 255, 255, 0.15);
  border-top-color: rgba(255, 215, 0, 0.8);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
.loading-text {
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.8rem;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

.extra-action-btn {
  padding: 3px 12px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(20, 40, 28, 0.8);
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.extra-action-btn:hover:not(:disabled) {
  filter: brightness(1.2);
  transform: translateY(-1px);
}

.extra-action-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.extra-action-btn--liangshan:not(:disabled) {
  background: rgba(198, 40, 40, 0.3);
  border-color: rgba(239, 83, 80, 0.4);
  color: #ff8a80;
}

.extra-action-btn--rebel:not(:disabled) {
  background: rgba(220, 38, 38, 0.3);
  border-color: rgba(255, 215, 0, 0.4);
  color: #ffd6d6;
  animation: heartbeat 1.2s ease-in-out infinite;
}
.extra-action-btn--hu:not(:disabled) {
  background: rgba(239, 83, 80, 0.3);
  border-color: rgba(239, 83, 80, 0.5);
  color: #ffcdd2;
  animation: heartbeat 1.0s ease-in-out infinite;
}

/* 桌面端严格 1/4 宽 */
@media (min-width: 1101px) {
  .extended-info-panel {
    flex: 0 0 30%;
    width: 30%;
    max-width: 420px;
  }
}

/* 窄屏降级 */
@media (max-width: 1100px) {
  .extended-info-panel {
    flex: 0 0 30%;
    width: 30%;
    min-width: 240px;
    max-width: 340px;
  }
}

.layout--mobile-landscape {
  --ml-table-scale: 1;
  --ml-ui-scale: 1;
  --ml-panel-width: 30%;
  --ml-panel-font: 0.62rem;
  --ml-title-font: 0.8rem;
  --ml-meta-font: 0.68rem;
  --ml-room-font: 0.78rem;
  --ml-label-font: 0.5rem;
  --ml-broadcast-height: 52px;
  --ml-action-gap: 6px;
  --ml-side-shift: 6px;
  padding: 0;
  min-height: 100vh;
  height: 100vh;
  min-height: 100dvh;
  height: 100dvh;
  width: 100vw;
  max-width: 100vw;
  overflow: clip;
  overscroll-behavior: none;
}

.layout--mobile-landscape .room-viewport {
  width: 100%;
  height: 100%;
  min-height: 100dvh;
  zoom: var(--mobile-scale);
}

.layout--mobile-landscape .room-container {
  padding: 0;
  gap: 0;
  border-radius: 0;
  max-width: none;
  width: 100%;
  height: 100vh;
  height: 100dvh;
  border: none;
  background: transparent;
  box-shadow: none;
}

.layout--mobile-landscape .room-header {
  top: max(4px, env(safe-area-inset-top));
  gap: 2px;
  left: 0;
  right: 0;
  width: 100%;
  max-width: none;
  padding: 0 8px;
  align-items: flex-start;
}

.layout--mobile-landscape .room-header-content {
  position: absolute;
  top: calc(100% + 6px);
  left: 8px;
  right: 8px;
  padding: 4px 6px;
  gap: 3px;
  border-radius: 0 0 12px 12px;
  background: rgba(7, 19, 14, 0.78);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.24);
  backdrop-filter: blur(10px);
}

.layout--mobile-landscape .room-header-toggle {
  min-height: 18px;
  padding: 2px 8px;
  font-size: 0.58rem;
}

.layout--mobile-landscape .room-header > .room-header-toggle {
  display: inline-flex;
}

.layout--mobile-landscape .room-header-toggle--inline {
  display: inline-flex;
}

.layout--mobile-landscape .mahjong-title {
  font-size: 0.75rem;
  margin: 0;
}

.layout--mobile-landscape .mahjong-subtitle {
  font-size: 0.6rem;
}

.layout--mobile-landscape .header-actions {
  gap: 2px;
}

.layout--mobile-landscape .mahjong-button.small {
  padding: 2px 5px;
  font-size: 0.6rem;
}

.layout--mobile-landscape .room-main {
  flex-direction: row;
  gap: 0;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.layout--mobile-landscape .table-wrapper {
  flex: 0 0 calc(100% - min(320px, 28%));
  width: calc(100% - min(320px, 28%));
  max-width: calc(100% - min(320px, 28%));
  min-width: 0;
  min-height: 0;
  padding: 0;
  overflow: hidden;
  align-items: stretch;
  justify-content: center;
}

.layout--mobile-landscape .mahjong-table {
  width: 100%;
  height: auto;
  max-height: none;
  aspect-ratio: 16 / 9;
  border-width: 3px;
  border-radius: 0;
  margin: 0;
  --seat-side-inset: 3%;
  --seat-top-inset: 1%;
  --seat-bottom-inset: 0.02%;
  --seat-top-width: 55%;
  --seat-bottom-width: 75%;
  --seat-side-width: 116px;
  --seat-side-height: 56%;
  --seat-side-player-offset: 3.4%;
  --discard-center-rect-half-w: 14.3%;
  --discard-center-rect-half-h: 11%;
}

.layout--mobile-landscape .extended-info-panel {
  flex: 0 0 min(320px, 28%);
  width: min(320px, 28%);
  min-width: 0;
  max-width: min(320px, 28%);
  max-height: 100%;
  font-size: 0.62rem;
  gap: 2px;
  overflow-y: auto;
  overflow-x: visible;
  padding: 2px max(2px, env(safe-area-inset-right)) 2px 2px;
  border-radius: 0;
  scrollbar-width: none;
  -ms-overflow-style: none;
  display: flex;
  flex-direction: column;
  overscroll-behavior: contain;
}

.layout--mobile-landscape .extended-info-panel::-webkit-scrollbar {
  display: none;
}

/* 移动端横屏：结算弹窗表格缩小 */
.layout--mobile-landscape .settle-panel {
  max-width: min(1000px, 96vw);
  max-height: 90vh;
  padding: 16px 12px;
}

.layout--mobile-landscape .settle-title-center {
  font-size: 1rem;
  margin-bottom: 10px;
}

.layout--mobile-landscape .settle-table-wrap {
  max-width: calc(96vw - 24px);
}

.layout--mobile-landscape .settle-round-table {
  min-width: auto;
  font-size: 0.62rem;
}

.layout--mobile-landscape .settle-round-table th,
.layout--mobile-landscape .settle-round-table td {
  padding: 3px 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.layout--mobile-landscape .settle-round-table--compact th:nth-child(1),
.layout--mobile-landscape .settle-round-table--compact td:nth-child(1) {
  width: auto;
  max-width: 60px;
}

.layout--mobile-landscape .settle-round-table--compact th:nth-child(2) {
  width: auto;
  max-width: 36px;
}

.layout--mobile-landscape .settle-round-table--compact th:nth-child(3),
.layout--mobile-landscape .settle-round-table--compact td:nth-child(3) {
  width: auto;
  max-width: 180px;
  min-width: auto;
}

.layout--mobile-landscape .settle-round-table--compact th:nth-child(4),
.layout--mobile-landscape .settle-round-table--compact td:nth-child(4),
.layout--mobile-landscape .settle-round-table--compact th:nth-child(5),
.layout--mobile-landscape .settle-round-table--compact td:nth-child(5),
.layout--mobile-landscape .settle-round-table--compact th:nth-child(6),
.layout--mobile-landscape .settle-round-table--compact td:nth-child(6),
.layout--mobile-landscape .settle-round-table--compact th:nth-child(7),
.layout--mobile-landscape .settle-round-table--compact td:nth-child(7) {
  width: auto;
  max-width: 36px;
}

.layout--mobile-landscape .settle-round-table--compact th:nth-child(8),
.layout--mobile-landscape .settle-round-table--compact td:nth-child(8) {
  width: auto;
  max-width: 68px;
}

.layout--mobile-landscape .settle-round-table--compact th:nth-child(9),
.layout--mobile-landscape .settle-round-table--compact td:nth-child(9) {
  width: auto;
  max-width: 60px;
}

.layout--mobile-landscape .settle-round-tiles {
  min-width: auto;
  font-size: 0.55rem;
}

.layout--mobile-landscape .extended-info-panel * {
  max-width: 100%;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.layout--mobile-landscape .extended-info-panel .ext-section { padding: 4px 5px 5px; border-radius: 6px; margin: 0; }
.layout--mobile-landscape .extended-info-panel .ext-title { font-size: 0.8rem; margin-bottom: 1px; }
.layout--mobile-landscape .extended-info-panel .ext-meta { font-size: 0.54rem; margin-bottom: 1px; line-height: 1.25; }
.layout--mobile-landscape .extended-info-panel .panel-room-number { font-size: 0.78rem; }
.layout--mobile-landscape .extended-info-panel .extra-action-btn { padding: calc(4px * var(--mobile-scale, 1)) calc(8px * var(--mobile-scale, 1)); font-size: calc(0.72rem * var(--mobile-scale, 1)); }
.layout--mobile-landscape .extended-info-panel .extra-actions-bar { padding: calc(4px * var(--mobile-scale, 1)) calc(6px * var(--mobile-scale, 1)); gap: calc(5px * var(--mobile-scale, 1)); flex-wrap: wrap; }
.layout--mobile-landscape .extra-actions-group { justify-content: flex-start; }
.layout--mobile-landscape .extended-info-panel .extra-actions-label { font-size: 0.48rem; }
.layout--mobile-landscape .extended-info-panel .settle-btn-header { padding: 2px 4px; font-size: 0.52rem; min-width: auto; }
.layout--mobile-landscape .extended-info-panel .action-buttons-panel { gap: 6px; }
.layout--mobile-landscape .extended-info-panel .turn-status-text { font-size: 0.54rem; }
.layout--mobile-landscape .extended-info-panel .room-header-row { gap: 3px; margin: 0; }
.layout--mobile-landscape .extended-info-panel .room-stats { padding: 2px 3px; }
.layout--mobile-landscape .extended-info-panel .player-row { padding: 2px 3px; font-size: 0.52rem; gap: 3px; }
.layout--mobile-landscape .extended-info-panel .broadcast-container { max-height: 52px; padding: 2px 3px; }
.layout--mobile-landscape .extended-info-panel .broadcast-message { font-size: 0.5rem; padding: 1px 0; }

.layout--mobile-landscape .extended-info-panel .action-panel { padding: 4px; gap: 4px; }
.layout--mobile-landscape .extended-info-panel .action-btn--small { width: 28px; height: 28px; font-size: 0.6rem; }
.layout--mobile-landscape .extended-info-panel .action-btn--draw { width: 28px; height: 40px; font-size: 0.75rem; }
.layout--mobile-landscape .extended-info-panel .mobile-inline-menu { padding: 4px 6px; }
.layout--mobile-landscape .extended-info-panel .mobile-inline-menu__actions { display: flex; gap: 4px; flex-wrap: wrap; }

/* 竖屏手机：右侧栏变底部横排 */
@media (max-width: 900px) and (orientation: portrait) {
  .extended-info-panel {
    flex: 0 0 auto;
    max-width: 100%;
    max-height: none;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 5px;
  }
}

.ext-section {
  padding: 8px 10px 10px;
  border-radius: 14px;
  background: rgba(5, 14, 10, 0.9);
  /* 移动端按 --other-tile-scale 缩放 */
  font-size: calc(1rem * var(--other-tile-scale, 1));
}

.ext-section--actions {
  margin-top: -6px;
}

.ext-title {
  font-size: calc(0.8rem * var(--other-tile-scale, 1));
  margin-bottom: 6px;
  opacity: 0.8;
  font-weight: 700;
}

.ext-meta {
  font-size: calc(0.8rem * var(--other-tile-scale, 1));
  margin-bottom: 4px;
  opacity: 0.85;
}

/* 梁山聚义按钮 */
.liang-shan-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 12px 16px;
  border-radius: 8px;
  border: 2px solid rgba(239, 83, 80, 0.6);
  background: linear-gradient(135deg, rgba(198, 40, 40, 0.3), rgba(239, 83, 80, 0.2));
  color: #ff8a80;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}

.liang-shan-btn--active {
  border-color: rgba(239, 83, 80, 0.9);
  background: linear-gradient(135deg, rgba(198, 40, 40, 0.5), rgba(239, 83, 80, 0.35));
  color: #ff5252;
  animation: liang-shan-pulse 2s ease-in-out infinite;
}

.liang-shan-btn--active:hover {
  transform: scale(1.03);
  box-shadow: 0 0 20px rgba(239, 83, 80, 0.4);
}

.liang-shan-btn--active:active {
  transform: scale(0.97);
}

.liang-shan-btn--voted {
  border-color: rgba(255, 255, 255, 0.15);
  background: rgba(40, 40, 40, 0.5);
  color: rgba(255, 255, 255, 0.3);
  cursor: default;
  animation: none;
}

.liang-shan-btn:disabled {
  cursor: default;
}

.liang-shan-flame {
  font-size: 1.2rem;
}

@keyframes liang-shan-pulse {
  0%, 100% { box-shadow: 0 0 8px rgba(239, 83, 80, 0.2); }
  50% { box-shadow: 0 0 20px rgba(239, 83, 80, 0.5); }
}

/* ===== 座位定位 ===== */
.seat {
  position: absolute;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100; /* 在牌墙z-index=1之上 */
  transition: transform 0.15s ease, filter 0.15s ease;
  /* P0 FIX: 统一容器裁剪 — 每家手牌+门口牌共同受该容器裁剪，不再越界 */
  overflow: hidden;
}

.seat,
.seat-active {
  overflow: visible;
}

.seat-active {
  filter: drop-shadow(0 0 16px rgba(255, 220, 60, 0.9));
  animation: seat-glow 1.5s ease-in-out infinite;
}

@keyframes seat-glow {
  0%, 100% { filter: drop-shadow(0 0 14px rgba(255, 220, 60, 0.8)); }
  50% { filter: drop-shadow(0 0 24px rgba(255, 220, 60, 1.0)); }
}

.seat-top {
  top: var(--seat-top-inset);
  left: 50%;
  transform: translateX(-50%);
  width: var(--seat-top-width);
  min-height: 60px;
  height: auto;
}

.seat-bottom {
  bottom: var(--seat-bottom-inset);
  left: 50%;
  transform: translateX(-50%);
  transform-origin: bottom center;
  width: min(var(--seat-bottom-width), calc(100% - 120px));
  min-height: 100px;
  height: auto;
}
.seat-bottom :deep(.tile) {
  width: 29px !important;
  height: 41px !important;
}

/* 对家名字反向旋转，保持正向可读 */
.seat-left {
  left: calc(var(--seat-side-inset) - var(--seat-side-player-offset) - var(--tile-w));
  top: 50%;
  transform: translateY(-50%);
  height: calc(var(--seat-side-height) + 8%);
  width: calc(var(--seat-side-width) + 52px);
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
  overflow: visible;
}

.seat-right {
  right: calc(var(--seat-side-inset) - var(--seat-side-player-offset) - var(--tile-w) - 0.35 * var(--tile-w));
  top: 50%;
  transform: translateY(-50%);
  height: calc(var(--seat-side-height) + 8%);
  width: calc(var(--seat-side-width) + 56px);
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  overflow: visible;
}

/* ===== 本家：手牌 + 动作按钮横排 ===== */
.self-area-with-actions {
  display: flex;
  justify-content: center;
  align-items: flex-end;
  gap: 10px;
  width: 100%;
  position: relative;
}

.ting-preview-section {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 0;
  margin: 0;
  line-height: 1;
}

.ting-preview-label {
  display: inline-flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 1px;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
  overflow-x: auto;
  padding: 2px 6px;
  -webkit-overflow-scrolling: touch;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.05);
  transition: background 0.15s ease;
}
.ting-preview-label:hover {
  background: rgba(255, 255, 255, 0.10);
}
.ting-preview-label:active {
  background: rgba(255, 255, 255, 0.14);
}

.ting-preview-label__text {
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.68rem;
  font-weight: 600;
  flex-shrink: 0;
}

.ting-preview-label__colon {
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.68rem;
  flex-shrink: 0;
}

.ting-preview-label__hint {
  color: rgba(255, 255, 255, 0.35);
  font-size: 0.68rem;
  flex-shrink: 0;
}

.ting-preview-label__toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  margin-left: 3px;
  border-radius: 3px;
  font-size: 0.6rem;
  line-height: 1;
  color: rgba(255, 255, 255, 0.45);
  background: rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
}
.ting-preview-label:hover .ting-preview-label__toggle {
  background: rgba(255, 255, 255, 0.15);
}

.ting-preview-tile {
  color: #ff6b6b;
  font-size: 0.68rem;
  line-height: 1.2;
  flex-shrink: 0;
  margin: 0;
  padding: 0;
  border: none;
  background: none;
  pointer-events: none;
}

.ting-preview-tile--exhausted {
  color: rgba(255, 255, 255, 0.38);
}

.ting-preview-tile--wild {
  color: #ffd700;
  font-weight: bold;
}

/* 内联动作按钮组 — 放在手牌右侧 */
.inline-action-buttons {
  position: absolute;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex-shrink: 0;
  min-width: 56px;
}

.inline-action-buttons--review {
  right: 0;
  bottom: auto;
  top: -20px;
}

.inline-action-btn {
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.15);
  background: rgba(15, 35, 25, 0.88);
  color: #fff;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  text-align: center;
  transition: all 0.15s ease;
  backdrop-filter: blur(4px);
  box-shadow: 0 2px 6px rgba(0,0,0,0.3);
}

.inline-action-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  filter: brightness(1.15);
}

.inline-action-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.inline-action-btn--review {
  background: rgba(33, 58, 44, 0.92);
  border-color: rgba(255, 215, 0, 0.22);
}

.inline-action-btn--draw {
  background: linear-gradient(135deg, #1f8a52, #46c574);
  color: #fff;
  border-color: rgba(70,197,116,0.5);
}

.inline-action-btn--chow {
  background: linear-gradient(135deg, #1565c0, #42a5f5);
  color: #fff;
  border-color: rgba(66,165,245,0.5);
}

.inline-action-btn--peng {
  background: linear-gradient(135deg, #e65100, #ff9800);
  color: #fff;
  border-color: rgba(255,152,0,0.5);
}

.inline-action-btn--kong {
  background: linear-gradient(135deg, #6a1b9a, #ab47bc);
  color: #fff;
  border-color: rgba(171,71,188,0.5);
}

.inline-action-btn--hu {
  background: linear-gradient(135deg, #c62828, #ef5350);
  color: #fff;
  border-color: rgba(239,83,80,0.5);
  font-size: 0.9rem;
}

@keyframes hu-glow {
  0%, 100% { box-shadow: 0 0 8px rgba(239,83,80,0.4); }
  50% { box-shadow: 0 0 18px rgba(239,83,80,0.8); }
}

.inline-action-btn--claim-pulse {
  animation: inline-claim-breathe 0.86s ease-in-out infinite;
}

.inline-action-btn--chow.inline-action-btn--claim-pulse {
  animation: inline-claim-breathe-strong 0.84s ease-in-out infinite, inline-chow-glow 0.84s ease-in-out infinite;
}

.inline-action-btn--peng.inline-action-btn--claim-pulse {
  animation: inline-claim-breathe-strong 0.78s ease-in-out infinite, inline-peng-glow 0.78s ease-in-out infinite;
}

.inline-action-btn--kong.inline-action-btn--claim-pulse {
  animation: inline-claim-breathe-strong 0.8s ease-in-out infinite, inline-kong-glow 0.8s ease-in-out infinite;
}

.inline-action-btn--hu.inline-action-btn--claim-pulse {
  animation: inline-claim-breathe-strong 0.72s ease-in-out infinite, inline-hu-glow 0.72s ease-in-out infinite, heartbeat 1.2s ease-in-out infinite;
}

@keyframes inline-claim-breathe {
  0%, 100% { transform: scale(1); filter: brightness(1); }
  50% { transform: scale(1.09); filter: brightness(1.16); }
}

@keyframes inline-claim-breathe-strong {
  0%, 100% { transform: scale(1.02); filter: brightness(1.02); }
  50% { transform: scale(1.18); filter: brightness(1.24); }
}

@keyframes inline-chow-glow {
  0%, 100% { box-shadow: 0 0 10px rgba(66,165,245,0.45); }
  50% { box-shadow: 0 0 18px rgba(66,165,245,0.78); }
}

@keyframes inline-peng-glow {
  0%, 100% { box-shadow: 0 0 10px rgba(255,152,0,0.45); }
  50% { box-shadow: 0 0 18px rgba(255,196,77,0.82); }
}

@keyframes inline-kong-glow {
  0%, 100% { box-shadow: 0 0 10px rgba(171,71,188,0.45); }
  50% { box-shadow: 0 0 18px rgba(180,124,255,0.82); }
}

@keyframes inline-hu-glow {
  0%, 100% { box-shadow: 0 0 10px rgba(239,83,80,0.5); }
  50% { box-shadow: 0 0 20px rgba(255,107,107,0.88); }
}


.inline-action-btn--rebel {
  background: linear-gradient(135deg, #dc2626, #b91c1c);
  color: #fff;
  border-color: #ffd700;
  animation: heartbeat 1.2s ease-in-out infinite;
}

.inline-action-btn--think {
  background: rgba(124, 58, 237, 0.3);
  color: rgba(255, 255, 255, 0.7);
  border-color: rgba(139, 92, 246, 0.3);
  font-size: 0.85rem;
}

.inline-action-btn--liangshan {
  background: linear-gradient(135deg, rgba(198, 40, 40, 0.5), rgba(239, 83, 80, 0.35));
  color: #ff8a80;
  border-color: rgba(239, 83, 80, 0.6);
  font-size: 0.75rem;
  animation: liangshan-btn-pulse 2s ease-in-out infinite;
}
.inline-action-btn--liangshan:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 0 12px rgba(239, 83, 80, 0.4);
}
.inline-action-btn--liangshan-voted {
  background: rgba(40, 40, 40, 0.5);
  color: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.1);
  animation: none;
}

/* 决策犹豫期状态：按钮显示但变灰禁用 */
.inline-action-btn--frozen {
  opacity: 0.5;
  filter: grayscale(0.7);
  cursor: not-allowed;
  pointer-events: none;
}

/* 决策倒计时：按钮边框变为进度环 */
.inline-action-btn--countdown {
  position: relative;
  overflow: visible;
}
.inline-action-btn--countdown::before {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: 10px;
  background: conic-gradient(
    rgba(255, 215, 0, var(--countdown-progress, 1)) 0deg,
    transparent calc(var(--countdown-progress, 1) * 360deg)
  );
  opacity: 0.7;
  z-index: -1;
  animation: countdown-fade linear forwards;
}
@keyframes countdown-fade {
  from { opacity: 0.8; }
  to { opacity: 0.3; }
}

.inline-action-btn--countdown-brightness {
  animation: countdown-brightness 0.5s ease-in-out infinite alternate;
}
@keyframes countdown-brightness {
  from { filter: brightness(1); }
  to { filter: brightness(1.3); }
}
@keyframes liangshan-btn-pulse {
  0%, 100% { box-shadow: 0 0 6px rgba(239, 83, 80, 0.2); }
  50% { box-shadow: 0 0 16px rgba(239, 83, 80, 0.5); }
}

.think-freeze-indicator {
  color: #8b5cf6;
  font-weight: 700;
  animation: think-indicator-pulse 1s infinite;
}

@keyframes think-indicator-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.comeback-floating-bar {
  position: fixed;
  bottom: 180px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 99999;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 24px;
  border-radius: 16px;
  background: rgba(7, 19, 14, 0.92);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(66, 165, 245, 0.5);
  box-shadow: 0 6px 32px rgba(0, 0, 0, 0.7);
  animation: comeback-glow 1.5s infinite;
  pointer-events: auto;
}

.comeback-label {
  font-size: 0.8rem;
  color: #ffd36a;
  white-space: nowrap;
}

.inline-action-btn--comeback {
  background: linear-gradient(135deg, #0d6efd, #42a5f5);
  color: #fff;
  border-color: rgba(66, 165, 245, 0.6);
  font-size: 0.85rem;
  padding: 8px 16px;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 700;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.inline-action-btn--comeback:hover {
  transform: scale(1.05);
  box-shadow: 0 0 16px rgba(66, 165, 245, 0.6);
}

@keyframes comeback-glow {
  0%, 100% { box-shadow: 0 4px 24px rgba(66, 165, 245, 0.3); }
  50% { box-shadow: 0 4px 32px rgba(66, 165, 245, 0.7); }
}

.takeover-float-bar {
  display: flex;
  justify-content: center;
  margin-bottom: 8px;
}
.inline-action-btn--bot-mode {
  background: rgba(100, 100, 100, 0.5);
  color: #aaa;
  border: 1px solid rgba(255, 255, 255, 0.15);
  padding: 4px 14px;
  border-radius: 16px;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
}
.inline-action-btn--bot-mode:hover {
  background: rgba(150, 150, 150, 0.6);
  color: #fff;
}

.takeover-warning {
  color: #ff9800;
  font-size: 0.75rem;
  font-weight: bold;
  margin-left: 6px;
  animation: takeover-blink 1s infinite;
}
@keyframes takeover-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.ai-controlled-notice {
  font-size: 0.7rem;
  color: #ffd36a;
  text-align: center;
  padding: 4px;
  white-space: nowrap;
}

.turn-ai {
  color: #ffd36a;
  font-weight: 700;
}

.inline-action-timer {
  font-size: 0.65rem;
  color: #ffd36a;
  font-weight: 700;
  text-align: center;
  padding: 2px 0;
  white-space: nowrap;
}

.inline-action-waiting {
  font-size: 0.7rem;
  color: rgba(255,255,255,0.5);
  text-align: center;
  padding: 8px 4px;
}

/* ===== 左上角轮次 ===== */
/* 房间号 */
.room-number {
  position: absolute;
  top: 8px;
  left: 12px;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.6);
  font-weight: 700;
  z-index: 4;
  background: rgba(0, 0, 0, 0.4);
  padding: 2px 8px;
  border-radius: 999px;
  letter-spacing: 0.5px;
}

/* 侧边面板的房间号行（与战绩榜同宽） */
.panel-room-header-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 4px 7px;
  border-radius: 8px;
  background: rgba(5, 14, 10, 0.9);
}
.panel-room-number {
  font-size: 1rem;
  font-weight: 700;
  margin: 0;
  flex: 1 1 auto;
}

.round-info-header {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 600;
  background: rgba(0, 0, 0, 0.35);
  padding: 2px 10px;
  border-radius: 999px;
  margin-left: 12px;
  white-space: nowrap;
}

/* 十字定位标志 */
.cross-marker {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 22px;
  height: 22px;
  z-index: 2;
  pointer-events: none;
}

/* 中心金色圆环 */
.center-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 132px;
  height: 132px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 215, 0, 0.15) 0%, rgba(255, 180, 0, 0.08) 50%, transparent 70%);
  border: 1px solid rgba(255, 215, 0, 0.22);
  z-index: 1;
  pointer-events: none;
}
.cross-h, .cross-v {
  position: absolute;
  background: rgba(255, 255, 255, 0.12);
}
.cross-h {
  top: 50%; left: 0; width: 100%; height: 1px;
  transform: translateY(-0.5px);
}
.cross-v {
  left: 50%; top: 0; height: 100%; width: 1px;
  transform: translateX(-0.5px);
}

@media (max-width: 900px) {
  .cross-marker {
    width: 16px;
    height: 16px;
  }

  .center-glow {
    width: 94px;
    height: 94px;
    border-width: 0.8px;
  }
}

/* 玩家名称标注（固定在牌桌四边，不挤占其他容器） */
.player-name-label {
  position: absolute;
  z-index: 200;
  font-size: clamp(0.5rem, 1.4vw, 0.85rem);
  font-weight: 700;
  color: rgba(255, 255, 255, 0.55);
  background: rgba(0, 0, 0, 0.3);
  padding: 6px 14px;
  border-radius: 4px;
  cursor: pointer;
  pointer-events: auto;
  white-space: nowrap;
  transition: color 0.2s, background 0.2s;
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
}
.player-name-label:hover {
  color: #fff;
  background: rgba(0, 0, 0, 0.55);
}
.player-name-label--top    { top: 2.8px; left: 25%; transform: translateX(-50%); }
.player-name-label--bottom { bottom: 0%; left: 50%; transform: translateX(-50%); }
.player-name-label--left   { left: 0.6%; top: 2%; transform: translateY(0); }
.player-name-label--right  { right: 0.6%; top: 2%; transform: translateY(0); }

.winner-tag {
  font-size: clamp(0.45rem, 1.2vw, 0.7rem);
  background: #f5c518;
  color: #1a1a1a;
  border-radius: 3px;
  padding: 0 4px;
  margin-left: 4px;
  vertical-align: middle;
}

/* 操作区状态文字 */
.turn-status-text {
  text-align: center;
  font-size: 0.6rem;
  color: rgba(255, 255, 255, 0.85);
  padding: 4px 0;
  font-weight: 600;
  white-space: nowrap;
}
.ting-action-reminder {
  max-width: 100%;
  padding: 4px 7px;
  border: 1px solid rgba(255, 214, 102, 0.34);
  border-radius: 10px;
  background: rgba(75, 54, 10, 0.62);
  color: #ffd666;
  font-size: 0.6rem;
  font-weight: 700;
  line-height: 1.25;
  text-align: center;
  overflow-wrap: anywhere;
}
.turn-timer-inline {
  margin-left: 6px;
  font-size: 0.6rem;
  font-weight: 700;
  color: #81c784;
  background: rgba(0, 0, 0, 0.3);
  padding: 1px 8px;
  border-radius: 999px;
}
.turn-timer--winner {
  font-size: 0.6rem !important;
  white-space: nowrap;
  padding: 2px 10px !important;
  background: rgba(255, 215, 0, 0.15) !important;
  color: #ffd700 !important;
  margin-left: 4px;
  border-radius: 999px;
  white-space: nowrap;
  flex-shrink: 0;
  white-space: nowrap;
}
.turn-timer-inline.turn-timer--urgent {
  color: #ef5350;
  animation: timer-pulse 0.5s infinite;
}

/* 状态提示 */
.turn-indicator {
  display: none; /* 已迁移到操作面板 */
}

.turn-win {
  color: #ffd700;
  font-weight: 700;
  text-shadow: 0 0 8px rgba(255, 215, 0, 0.5);
}

/* 胜者观战栏 */
.spectator-bar {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: 8px;
  flex-wrap: wrap;
}

.spectator-label {
  font-size: 0.75rem;
  opacity: 0.8;
  white-space: nowrap;
}

.spectator-chip {
  padding: 3px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.05);
  color: #f5f5f5;
  font-size: 0.7rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.spectator-chip:hover {
  background: rgba(100, 200, 255, 0.15);
  border-color: rgba(100, 200, 255, 0.3);
}

.spectator-chip--active {
  background: rgba(100, 200, 255, 0.2);
  border-color: rgba(100, 200, 255, 0.5);
  color: #64c8ff;
}

.turn-action {
  color: #ffd36a;
  font-weight: 700;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

/* 出牌倒计时 */
.turn-timer {
  margin-left: 8px;
  font-size: 0.8rem;
  font-weight: 700;
  color: #81c784;
  background: rgba(0, 0, 0, 0.3);
  padding: 1px 8px;
  border-radius: 999px;
}

.turn-timer--urgent {
  color: #ef5350;
  animation: timer-pulse 0.5s infinite;
}

@keyframes timer-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.05); }
}

/* ===== 通用按钮 ===== */
.mahjong-button {
  padding: 10px 18px;
  border-radius: 999px;
  border: none;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
  background: linear-gradient(135deg, #1f8a52, #46c574);
  color: #03100a;
  transition: transform 0.12s ease, box-shadow 0.12s ease, filter 0.12s ease;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.35);
  white-space: nowrap;
}

.mahjong-button.small {
  padding: 8px 14px;
  font-size: 0.85rem;
}

.mahjong-button:hover {
  transform: translateY(-1px);
  filter: brightness(1.05);
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.45);
}

.mahjong-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
  transform: none;
}

.panel-button {
  display: block;
  width: 100%;
  text-align: center;
  margin-bottom: 6px;
}

.panel-button.danger {
  background: rgba(123, 26, 26, 0.9);
  color: #ffdada;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.panel-button.danger:hover {
  background: rgba(160, 38, 38, 1);
}

/* ===== 梁山聚义成功弹窗 ===== */
.liang-shan-overlay {
  position: absolute;
  inset: 0;
  background: rgba(3, 10, 8, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20;
  animation: liangShanFadeIn 0.1s ease-out;
}

.liang-shan-card {
  background: linear-gradient(135deg, rgba(180, 40, 10, 0.95), rgba(120, 20, 5, 0.95));
  border: 2px solid rgba(255, 180, 50, 0.6);
  border-radius: 14px;
  padding: 40px 48px;
  text-align: center;
  box-shadow: 0 0 60px rgba(255, 100, 20, 0.4), 0 12px 32px rgba(0, 0, 0, 0.6);
  animation: liangShanPop 0.12s ease-out;
}

.liang-shan-icon {
  font-size: 2.8rem;
  margin-bottom: 12px;
  filter: drop-shadow(0 0 8px rgba(255, 150, 50, 0.8));
}

.liang-shan-title {
  font-size: 1.8rem;
  font-weight: 800;
  color: #ffe27a;
  margin: 0 0 8px;
  text-shadow: 0 0 12px rgba(255, 200, 50, 0.6);
}

.liang-shan-sub {
  font-size: 1rem;
  color: rgba(255, 220, 160, 0.9);
  margin: 0;
  font-weight: 600;
}

@keyframes liangShanFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes liangShanPop {
  from { transform: scale(0.8); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

/* ===== 谢谢带头大哥弹窗 ===== */
.leading-brother-overlay {
  position: absolute;
  inset: 0;
  background: rgba(3, 10, 8, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 25;
  animation: lbFadeIn 0.03s ease-out;
}

.leading-brother-card {
  background: linear-gradient(135deg, rgba(200, 150, 30, 0.95), rgba(180, 100, 10, 0.95));
  border: 2px solid rgba(255, 220, 100, 0.7);
  border-radius: 14px;
  padding: 36px 44px;
  text-align: center;
  box-shadow: 0 0 50px rgba(255, 180, 50, 0.4), 0 12px 32px rgba(0, 0, 0, 0.5);
  animation: lbPop 0.04s ease-out;
}

.lb-icon {
  font-size: 2.4rem;
  margin-bottom: 8px;
}

.lb-title {
  font-size: 2rem;
  font-weight: 900;
  color: #fff;
  margin: 0 0 6px;
  text-shadow: 0 0 10px rgba(255, 200, 50, 0.6);
  letter-spacing: 0.1em;
}

.lb-sub {
  font-size: 0.95rem;
  color: rgba(255, 240, 200, 0.9);
  margin: 0;
  font-weight: 600;
}

@keyframes lbFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes lbPop {
  from { transform: scale(0.85); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

/* ===== 胡牌选择面板 ===== */
/* ===== 审批弹窗 ===== */
.approval-overlay {
  position: absolute;
  inset: 0;
  background: rgba(3, 10, 8, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 30;
}
.approval-card {
  background: rgba(10, 25, 18, 0.98);
  border: 2px solid rgba(255, 215, 0, 0.3);
  border-radius: 14px;
  padding: 28px 32px;
  text-align: center;
  max-width: 420px;
  width: 90%;
}
.approval-icon { font-size: 2rem; margin-bottom: 8px; }
.approval-title { font-size: 1.3rem; font-weight: 800; color: #FFD700; margin: 0 0 6px; }
.approval-sub { font-size: 0.95rem; color: rgba(255,255,255,0.8); margin: 0 0 4px; }
.approval-question { font-size: 1rem; color: #fff; margin: 0 0 16px; }
.approval-buttons { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; }
.approval-btn {
  padding: 12px 28px;
  border-radius: 8px;
  border: 2px solid transparent;
  font-size: 1.1rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
}
.approval-btn--hu { background: linear-gradient(135deg, #c62828, #ef5350); color: #fff; border-color: rgba(239,83,80,0.5); }
.approval-btn--kong { background: linear-gradient(135deg, #E65100, #FF9800); color: #fff; border-color: rgba(255,152,0,0.5); }
.approval-btn--peng { background: linear-gradient(135deg, #1565C0, #42A5F5); color: #fff; border-color: rgba(66,165,245,0.5); }
.approval-btn--pass { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.6); border-color: rgba(255,255,255,0.2); }

/* ===== 审批倒计时 ===== */
.approval-countdown {
  position: relative;
  width: 100%;
  height: 24px;
  background: rgba(255,255,255,0.1);
  border-radius: 8px;
  margin: 8px 0;
  overflow: hidden;
}
.approval-countdown-bar {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: linear-gradient(90deg, #4CAF50, #8BC34A);
  border-radius: 8px;
  transition: width 0.1s linear, background 0.3s;
}
.approval-countdown--urgent .approval-countdown-bar {
  background: linear-gradient(90deg, #f44336, #FF5722);
}
.approval-countdown-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 0.85rem;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 1px 2px rgba(0,0,0,0.5);
  z-index: 1;
}

/* ===== 审批等待提示 ===== */
.approval-waiting-overlay {
  position: absolute;
  bottom: 100px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 25;
  animation: fadeIn 0.2s ease-out;
}
.approval-waiting-card {
  background: rgba(0, 0, 0, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  padding: 16px 24px;
  text-align: center;
  backdrop-filter: blur(8px);
  animation: waitPulse 1.5s ease-in-out infinite;
}
.approval-waiting-icon { font-size: 1.5rem; margin-bottom: 6px; }
.approval-waiting-text { font-size: 1.1rem; font-weight: 700; color: #fff; margin: 0 0 4px; }
.approval-waiting-sub { font-size: 0.8rem; color: rgba(255,255,255,0.6); margin: 0; }
@keyframes waitPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }

/* ===== 容我想一想弹窗 ===== */
.think-overlay {
  position: absolute;
  inset: 0;
  background: rgba(3, 10, 8, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 30;
}
.think-card {
  background: rgba(10, 25, 18, 0.98);
  border: 1px solid rgba(255, 215, 0, 0.2);
  border-radius: 14px;
  padding: 24px 28px;
  text-align: center;
  max-width: 350px;
  width: 85%;
}
.think-icon { font-size: 2rem; margin-bottom: 6px; }
.think-title { font-size: 1.2rem; font-weight: 700; color: #FFD700; margin: 0 0 4px; }
.think-sub { font-size: 0.9rem; color: rgba(255,255,255,0.7); margin: 0 0 16px; }
.think-options { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; }
.think-opt {
  padding: 10px 24px;
  border-radius: 10px;
  border: 1px solid transparent;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}
.think-opt:active { transform: scale(0.95); }
.think-opt--hu { background: linear-gradient(135deg, #c62828, #ef5350); color: #fff; }
.think-opt--kong { background: linear-gradient(135deg, #E65100, #FF9800); color: #fff; }
.think-opt--peng { background: linear-gradient(135deg, #1565C0, #42A5F5); color: #fff; }
.think-opt--cancel { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.6); border-color: rgba(255,255,255,0.2); }

/* ===== 胡牌选择面板 ===== */
.chow-picker-overlay {
  position: absolute;
  inset: 0;
  background: rgba(3, 10, 8, 0.78);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 31;
}
.chow-picker-card {
  background: rgba(10, 25, 18, 0.98);
  border: 1px solid rgba(255, 215, 0, 0.2);
  border-radius: 14px;
  padding: 24px 28px;
  max-width: 420px;
  width: 88%;
}
.chow-picker-title { margin: 0 0 6px; font-size: 1.2rem; font-weight: 700; color: #FFD700; }
.chow-picker-sub { margin: 0 0 16px; color: rgba(255,255,255,0.75); font-size: 0.9rem; }
.chow-picker-options { display: grid; gap: 10px; }
.chow-picker-option {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 5px;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.05);
  color: #fff;
  cursor: pointer;
  transition: transform 0.15s ease, border-color 0.15s ease, background 0.15s ease;
}
.chow-picker-option:hover,
.chow-picker-option--selected {
  border-color: rgba(255, 215, 0, 0.5);
  background: rgba(255, 215, 0, 0.12);
  transform: translateY(-1px);
}
.chow-picker-tiles { display: flex; align-items: center; gap: 6px; }
.chow-picker-label { font-weight: 700; color: #fff; }
.chow-picker-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 16px; }

.hu-panel-overlay {
  position: absolute;
  inset: 0;
  background: rgba(3, 10, 8, 0.88);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 30;
  backdrop-filter: blur(4px);
}

.hu-panel {
  background: rgba(10, 25, 18, 0.98);
  border: 1px solid rgba(255, 215, 0, 0.25);
  border-radius: 18px;
  padding: 24px 28px;
  width: 95vw;
  max-width: 95vw;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
}

.hu-panel-title {
  text-align: center;
  font-size: 0.95rem;
  margin: 0 0 16px;
  color: #ffd700;
  text-shadow: 0 0 8px rgba(255, 215, 0, 0.3);
}

.hu-combos {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 18px;
}

.hu-combo {
  background: rgba(255, 255, 255, 0.03);
  border: 2px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 8px 12px;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: nowrap;
}

.hu-combo:hover {
  border-color: rgba(255, 215, 0, 0.3);
  background: rgba(255, 215, 0, 0.03);
}

.hu-combo--selected {
  border-color: rgba(255, 215, 0, 0.6);
  background: rgba(255, 215, 0, 0.06);
  box-shadow: 0 0 12px rgba(255, 215, 0, 0.15);
}

.hu-combo-header {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-wrap: nowrap;
  flex: 1;
  min-width: 0;
}
.hu-combo-rank {
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  color: rgba(255, 230, 150, 0.88);
  flex-shrink: 0;
}
.hu-combo-label {
  font-size: 0.85rem;
  font-weight: 700;
  color: #fff;
  white-space: normal;
  word-break: break-all;
  flex-shrink: 1;
  min-width: 28px;
}
.hu-combo-score {
  font-size: 0.6rem;
  font-weight: 700;
  color: #ffd700;
  flex-shrink: 0;
  margin-left: auto;
}
.hu-combo-method {
  display: inline-block;
  font-size: 0.7rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.72);
  background: rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  padding: 2px 8px;
  flex-shrink: 0;
}
.hu-combo-formula {
  display: none;  /* 公式浓缩到 header 里了 */
}
.hu-group-list {
  display: none;  /* 组牌明细折叠 */
}
.hu-group {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
}
.hu-group-kind {
  min-width: 28px;
  font-size: 0.76rem;
  font-weight: 800;
  color: rgba(255, 230, 150, 0.88);
}
.hu-group-tiles {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.hu-combo-score {
  font-size: 1.05rem;
  font-weight: 900;
  color: #FFD700;
  text-shadow: 0 0 8px rgba(255, 215, 0, 0.5);
}
.hu-summary-grid {
  display: none;
  flex-wrap: wrap;
  gap: 5px;
}
.hu-summary-item {
  min-width: 104px;
  flex: 1 1 104px;
  padding: 9px 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
}
.hu-summary-key {
  display: block;
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.58);
  margin-bottom: 4px;
}
.hu-summary-value {
  display: block;
  font-size: 0.96rem;
  font-weight: 800;
  color: #fff8da;
}

.hu-panel-actions {
  display: flex;
  gap: 5px;
  justify-content: center;
}

.hu-confirm-btn {
  padding: 12px 32px;
  border-radius: 8px;
  border: 2px solid rgba(255, 215, 0, 0.4);
  background: linear-gradient(135deg, #c62828, #ef5350);
  color: #fff;
  font-size: 1.1rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
}

.hu-confirm-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(239, 83, 80, 0.4);
}

.hu-confirm-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.hu-cancel-btn {
  padding: 12px 24px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.05);
  color: #f5f5f5;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.15s;
}

.hu-cancel-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

@media (max-width: 900px) and (orientation: landscape) {
  .hu-panel {
    width: min(92vw, 760px);
    max-height: 88vh;
    padding: 16px;
  }

  .hu-panel-title {
    font-size: 1.08rem;
    margin-bottom: 10px;
  }

  .hu-combos {
    gap: 5px;
    margin-bottom: 12px;
  }

  .hu-combo {
    padding: 10px 12px;
  }

  .hu-combo-header {
    gap: 10px;
  }

  .hu-combo-rank,
  .hu-combo-method,
  .hu-group-kind,
  .hu-summary-key {
    font-size: 0.68rem;
  }

  .hu-combo-score {
    font-size: 0.92rem;
  }

  .hu-combo-label,
  .hu-summary-value {
    font-size: 0.84rem;
  }

  .hu-combo-formula {
    font-size: 0.74rem;
    line-height: 1.4;
    margin-bottom: 8px;
  }

  .hu-group {
    padding: 6px 8px;
    gap: 6px;
  }

  .hu-panel-actions {
    gap: 5px;
  }

  .hu-confirm-btn,
  .hu-cancel-btn {
    padding: 10px 16px;
    font-size: 0.92rem;
  }
}

/* ===== 游戏结束浮层 ===== */
.game-over-overlay {
  position: absolute;
  inset: 0;
  background: rgba(3, 10, 8, 0.82);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
  z-index: 10;
}

.game-over-card {
  background: rgba(4, 16, 11, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;
  padding: 22px;
  width: min(360px, 90%);
  text-align: center;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.6);
}

/* 流局专用卡片：更简洁 */
.game-over-card--draw {
  padding: 48px 32px;
}
.game-over-card--draw .overlay-title {
  font-size: 2rem;
  color: #FFD700;
  text-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
  margin-bottom: 8px;
}
.game-over-card--draw .overlay-message {
  font-size: 1.2rem;
  color: rgba(255,255,255,0.8);
  margin-bottom: 24px;
}

.overlay-title {
  font-size: 1.6rem;
  margin-bottom: 12px;
}

.overlay-message {
  font-size: 1rem;
  opacity: 0.9;
  margin-bottom: 14px;
}

.draw-blocked-notice {
  position: fixed;
  left: 50%;
  top: 18%;
  transform: translateX(-50%);
  z-index: 2600;
  padding: 10px 18px;
  border-radius: 999px;
  background: rgba(12, 22, 18, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.14);
  color: #fff4cf;
  font-size: 0.88rem;
  line-height: 1;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.28);
  animation: draw-blocked-notice-pop 1.4s ease forwards;
  pointer-events: none;
}

@keyframes draw-blocked-notice-pop {
  0% { opacity: 0; transform: translate(-50%, -8px) scale(0.96); }
  16% { opacity: 1; transform: translate(-50%, 0) scale(1); }
  78% { opacity: 1; transform: translate(-50%, 0) scale(1); }
  100% { opacity: 0; transform: translate(-50%, -6px) scale(0.98); }
}

/* 翻倍局骰子提醒 */
.double-reminder-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  pointer-events: none;
}
.double-reminder-msg {
  background: rgba(239, 83, 80, 0.9);
  color: #fff;
  padding: 16px 32px;
  border-radius: 8px;
  font-size: 1.2rem;
  font-weight: 700;
  box-shadow: 0 4px 20px rgba(239, 83, 80, 0.5);
  animation: pulse-in 0.15s ease-out;
}
@keyframes pulse-in {
  0% { transform: scale(0.8); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}
.flower-replace-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 18vh;
  z-index: 9998;
  pointer-events: none;
}
.flower-replace-chip {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  border-radius: 14px;
  background: rgba(18, 54, 34, 0.92);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.28);
}
.flower-replace-text {
  color: #eaffd2;
  font-size: 0.95rem;
  font-weight: 800;
  letter-spacing: 0.04em;
}
.fade-fast-enter-active, .fade-fast-leave-active { transition: opacity 0.15s ease; }
.fade-fast-enter-from, .fade-fast-leave-to { opacity: 0; }

/* 退房结算房间号 */
.settle-room-id {
  font-size: 1.2rem;
  font-weight: 900;
  color: #fff;
  text-align: center;
  padding: 8px 0 6px;
  letter-spacing: 0.05em;
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
}

/* 退房结算按钮 */
.settle-btn {
  width: 100%;
  padding: 10px 16px;
  border-radius: 10px;
  border: 1px solid rgba(255, 152, 0, 0.3);
  background: rgba(255, 152, 0, 0.08);
  color: #ffb74d;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}
.settle-btn:hover {
  background: rgba(255, 152, 0, 0.15);
  border-color: rgba(255, 152, 0, 0.5);
}

/* 亮牌展示 */
.winner-reveal-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(6px);
  z-index: 10000;
  animation: fadeIn 0.3s ease;
}
.winner-reveal-card {
  background: linear-gradient(135deg, #1a2a1a, #0d1f0d);
  border: 2px solid #ffd700;
  border-radius: 16px;
  padding: 24px 32px;
  min-width: 320px;
  max-width: 96vw;
  width: min(900px, 96vw);
  text-align: center;
  box-shadow: 0 8px 40px rgba(255, 215, 0, 0.3);
  max-height: 90vh;
  overflow-y: auto;
}
.winner-reveal-title {
  font-size: 1.3rem;
  color: #ffd700;
  margin: 0 0 16px;
}
.winner-reveal-item {
  margin-bottom: 16px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
}
.winner-reveal-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 10px;
}
.winner-reveal-name {
  font-size: 1.1rem;
  font-weight: 700;
  color: #fff;
}
.winner-reveal-type {
  font-size: 1rem;
  color: #ffd700;
  font-weight: 600;
}
.winner-reveal-points {
  font-size: 1rem;
  color: #ff9800;
  font-weight: 600;
}
.winner-reveal-tiles-visual {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: flex-end;
  gap: 2px;
  margin-bottom: 8px;
}
.winner-reveal-meld-sep {
  display: inline-flex;
  align-items: center;
  font-size: 1.2rem;
  color: rgba(255,215,0,0.5);
  margin: 0 4px;
  font-weight: 700;
}
.winner-reveal-tile-wrap {
  --tile-w: 32px;
  --tile-h: 44px;
}
.winner-reveal-tile-wrap--small {
  --tile-w: 24px;
  --tile-h: 34px;
}
.winner-reveal-all-hands {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid rgba(255,215,0,0.15);
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.winner-reveal-player-hand {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: rgba(255,255,255,0.03);
  border-radius: 8px;
}
.winner-reveal-player-name {
  font-size: 0.85rem;
  font-weight: 700;
  color: rgba(255,255,255,0.7);
  min-width: 60px;
  text-align: right;
}
.winner-reveal-player-name--winner {
  color: #ffd700;
}
.winner-reveal-player-tiles {
  display: flex;
  flex-wrap: wrap;
  gap: 1px;
  align-items: flex-end;
}
.winner-reveal-method {
  font-size: 0.85rem;
  color: #aaa;
}
.winner-reveal-hint {
  font-size: 0.75rem;
  color: #666;
  margin-top: 8px;
}

/* 结算面板 */
.settle-overlay {
  position: absolute;
  inset: 0;
  z-index: 20;
  background: rgba(3, 10, 8, 0.92);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(6px);
}

.settle-panel {
  background: rgba(4, 16, 11, 0.97);
  border: 1px solid rgba(255, 215, 0, 0.15);
  border-radius: 14px;
  padding: 22px;
  width: fit-content;
  max-width: min(750px, 96vw);
  max-height: 85vh;
  overflow: visible;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6);
  animation: settle-in 0.3s ease;
}

.settle-title-center {
  text-align: center;
  font-size: 0.95rem;
  font-weight: 700;
  color: #ffd700;
  margin: 0 0 14px;
  letter-spacing: 0.15em;
}

@keyframes settle-in {
  from { opacity: 0; transform: scale(0.95) translateY(10px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

.settle-title {
  font-size: 1.4rem;
  margin: 0 0 4px;
  text-align: center;
}

.settle-meta {
  text-align: center;
  font-size: 0.8rem;
  opacity: 0.5;
  margin: 0 0 14px;
}

.settle-ranking {
  margin-bottom: 14px;
}

.settle-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 10px;
  margin-bottom: 6px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.settle-row--top {
  background: rgba(255, 215, 0, 0.06);
  border-color: rgba(255, 215, 0, 0.2);
}

.settle-rank {
  width: 28px;
  text-align: center;
  font-size: 1.1rem;
}

.settle-name {
  flex: 1;
  font-weight: 600;
  font-size: 0.9rem;
}

.settle-total {
  font-weight: 700;
  font-size: 1.1rem;
}

.sc-pos { color: #66bb6a; }
.sc-neg { color: #ef5350; }

.settle-details {
  margin-bottom: 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  padding-top: 16px;
}

.settle-rounds {
  display: grid;
  gap: 10px;
  margin-bottom: 14px;
}

.settle-rounds--single {
  justify-items: center;
}

.settle-rounds-title {
  margin: 0;
  color: #ffd700;
  font-size: 1rem;
}

.settle-round-card {
  display: grid;
  gap: 10px;
  padding: 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.settle-round-header {
  display: flex;
  justify-content: space-between;
  gap: 5px;
  flex-wrap: wrap;
  color: #f7e6a8;
  font-weight: 600;
  font-size: 0.65rem;
}

.settle-round-summary-line {
  color: rgba(255, 244, 191, 0.9);
  font-size: 0.6rem;
  font-weight: 700;
}

.settle-round-block {
  display: grid;
  gap: 6px;
}

.settle-round-subtitle {
  color: rgba(255, 255, 255, 0.72);
  font-size: 0.6rem;
}

.settle-table-wrap {
  width: fit-content;
  max-width: min(700px, 92vw);
  overflow: auto;
}

.settle-round-table {
  width: 100%;
  min-width: 600px;
  border-collapse: collapse;
  font-size: 0.6rem;
  color: #f3f3f3;
}

.settle-round-table--compact {
  min-width: 630px;
  table-layout: fixed;
}

.settle-round-table--compact th,
.settle-round-table--compact td {
  text-align: center;
  vertical-align: middle;
}

.settle-round-table--compact th:nth-child(1),
.settle-round-table--compact td:nth-child(1) {
  width: 32px;
}

.settle-round-table--compact th:nth-child(2),
.settle-round-table--compact td:nth-child(2) {
  width: 28px;
}

.settle-round-table--compact th:nth-child(3),
.settle-round-table--compact td:nth-child(3) {
  width: auto;
  min-width: 133px;
  max-width: 267px;
}

.settle-round-table--compact th:nth-child(4),
.settle-round-table--compact td:nth-child(4),
.settle-round-table--compact th:nth-child(5),
.settle-round-table--compact td:nth-child(5),
.settle-round-table--compact th:nth-child(6),
.settle-round-table--compact td:nth-child(6),
.settle-round-table--compact th:nth-child(7),
.settle-round-table--compact td:nth-child(7) {
  width: 32px;
}

.settle-round-table--compact th:nth-child(8),
.settle-round-table--compact td:nth-child(8) {
  width: 58px;
}

.settle-round-table--compact th:nth-child(9),
.settle-round-table--compact td:nth-child(9) {
  width: 35px;
}

.settle-round-table th,
.settle-round-table td {
  padding: 5px 5px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  text-align: left;
  vertical-align: top;
}

.settle-round-table th {
  color: rgba(255, 255, 255, 0.72);
  background: rgba(255, 255, 255, 0.06);
  font-weight: 600;
  white-space: nowrap;
}

.settle-round-table-row--winner {
  background: rgba(255, 215, 0, 0.07);
}

.settle-round-tiles {
  min-width: 120px;
  line-height: 1.5;
  word-break: break-all;
  white-space: normal;
}

.settle-round-winner {
  display: grid;
  gap: 4px;
}

.settle-round-winner-line {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  color: #fff;
  font-size: 0.84rem;
}

.settle-round-details,
.settle-round-note {
  color: rgba(255, 255, 255, 0.76);
  font-size: 0.6rem;
  line-height: 1.5;
}

.settle-round-transfer {
  display: flex;
  justify-content: space-between;
  gap: 5px;
  color: #f3f3f3;
  font-size: 0.8rem;
}

.settle-round-positive {
  color: #66bb6a;
}

.settle-round-negative {
  color: #ef5350;
}

@media (max-width: 768px) {
  .settle-panel {
    width: min(96vw, 550px);
    padding: 14px 12px 12px;
    border-radius: 14px;
  }

  .settle-round-header {
    gap: 4px;
    font-size: clamp(0.5rem, 1.8vw, 0.75rem);
  }

  .settle-table-wrap {
    max-width: calc(96vw - 24px);
  }

  .settle-round-table {
    font-size: clamp(0.5rem, 1.6vw, 0.7rem);
    min-width: 480px;
  }

  .settle-round-table--compact {
    min-width: 480px;
  }

  .settle-round-table--compact th,
  .settle-round-table--compact td {
    padding: 5px 4px;
  }

  .settle-round-table--compact th:nth-child(1),
  .settle-round-table--compact td:nth-child(1) {
    width: 32px;
  }

  .settle-round-table--compact th:nth-child(2),
  .settle-round-table--compact td:nth-child(2) {
    width: 28px;
  }

  .settle-round-table--compact th:nth-child(3),
  .settle-round-table--compact td:nth-child(3) {
    width: 140px;
  }

  .settle-round-table--compact th:nth-child(4),
  .settle-round-table--compact td:nth-child(4),
  .settle-round-table--compact th:nth-child(5),
  .settle-round-table--compact td:nth-child(5),
  .settle-round-table--compact th:nth-child(6),
  .settle-round-table--compact td:nth-child(6),
  .settle-round-table--compact th:nth-child(7),
  .settle-round-table--compact td:nth-child(7) {
    width: 35px;
  }

  .settle-round-table--compact th:nth-child(8),
  .settle-round-table--compact td:nth-child(8) {
    width: 86px;
  }

  .settle-round-table--compact th:nth-child(9),
  .settle-round-table--compact td:nth-child(9) {
    width: 70px;
  }
}

.settle-detail-header {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 3px 7px;
  font-size: clamp(0.5rem, 1.2vw, 0.75rem);
  opacity: 0.5;
  font-weight: 600;
  text-align: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  margin-bottom: 6px;
  flex-wrap: wrap;
}

.settle-detail-grid {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.settle-detail-row {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 7px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.02);
  font-size: clamp(0.55rem, 1.3vw, 0.8rem);
  flex-wrap: wrap;
}

.settle-detail-name {
  font-weight: 600;
  min-width: 40px;
}

.settle-detail-stat {
  opacity: 0.7;
}

.settle-detail-stat--win { color: #66bb6a; }
.settle-detail-stat--loss { color: #ef5350; }

/* 有效战绩：浅金黄色背景 */
.settle-detail-stat--record {
  background: rgba(255, 215, 0, 0.15);
  color: #ffd700;
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 700;
}

/* 结算操作按钮组 */
.settle-actions {
  display: flex;
  gap: 10px;
  margin-top: 16px;
}

.settle-back-btn {
  flex: 1;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.06);
  color: #ccc;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  min-height: 48px;
}
.settle-back-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
}

.settle-save-btn {
  flex: 1;
  padding: 10px;
  border-radius: 8px;
  border: none;
  background: linear-gradient(135deg, #1f8a52, #46c574);
  color: #03100a;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
  min-height: 48px;
}
.settle-save-btn:hover {
  transform: scale(1.02);
  box-shadow: 0 0 20px rgba(70, 197, 116, 0.4);
}

.settle-save-btn--secondary {
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.08));
  color: #f5f0df;
}

.settle-save-btn--secondary:hover {
  box-shadow: 0 0 18px rgba(255, 255, 255, 0.18);
}

/* AI 玩家操作卡片 */
.ai-card-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(2px);
}

.ai-card {
  background: rgba(8, 20, 15, 0.97);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 24px;
  width: min(280px, 90%);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.6);
  position: relative;
  animation: ai-card-in 0.2s ease;
}

@keyframes ai-card-in {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}

.ai-card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.ai-card-avatar {
  font-size: 2rem;
}

.ai-card-name {
  font-size: 1.1rem;
  font-weight: 700;
  color: #f5f5f5;
}

.ai-card-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ai-card-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 12px 16px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  color: #f5f5f5;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  width: 100%;
  text-align: left;
}

.ai-card-btn:hover {
  transform: translateX(4px);
}

.ai-card-btn--leave {
  border-color: rgba(239, 83, 80, 0.3);
}
.ai-card-btn--leave:hover {
  background: rgba(239, 83, 80, 0.15);
}

.ai-card-btn--replace {
  border-color: rgba(33, 150, 243, 0.3);
}
.ai-card-btn--replace:hover {
  background: rgba(33, 150, 243, 0.15);
}

.ai-card-btn--swap {
  border-color: rgba(239, 83, 80, 0.3);
  background: rgba(239, 83, 80, 0.08);
  color: #ef5350;
}
.ai-card-btn--swap:hover {
  background: rgba(239, 83, 80, 0.15);
}
.ai-card-btn--spectate {
  border-color: rgba(100, 180, 255, 0.3);
  background: rgba(100, 180, 255, 0.08);
  color: #9fd3ff;
}
.ai-card-btn--spectate:hover {
  background: rgba(100, 180, 255, 0.15);
}

.ai-card-hint {
  font-size: 0.7rem;
  font-weight: 400;
  opacity: 0.5;
  margin-left: auto;
}

.ai-card-close {
  position: absolute;
  top: 10px;
  right: 12px;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.4);
  font-size: 1rem;
  cursor: pointer;
  padding: 4px 8px;
}
.ai-card-close:hover {
  color: #fff;
}

/* 等待房间：信息塞进右侧面板 */
.waiting-panel-section {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.waiting-panel-status {
  display: flex;
  align-items: center;
  gap: 10px;
}

.waiting-panel-main {
  margin: 0;
  font-size: 0.88rem;
  font-weight: 700;
}

.waiting-panel-sub {
  margin: 2px 0 0;
  font-size: 0.74rem;
  opacity: 0.72;
}

.waiting-panel-tip {
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.72);
  font-size: 0.74rem;
  line-height: 1.45;
}

.waiting-players {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin: 0;
}

.waiting-slot {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.04);
  transition: all 0.3s ease;
}

.waiting-slot--filled {
  border-color: rgba(70, 197, 116, 0.25);
  background: rgba(31, 138, 82, 0.08);
}

.waiting-slot--dealer {
  border-color: rgba(255, 215, 0, 0.3);
  background: rgba(255, 215, 0, 0.06);
}

.waiting-avatar {
  font-size: 0.95rem;
  flex-shrink: 0;
}

.waiting-avatar--empty {
  opacity: 0.3;
}

.waiting-name {
  font-size: 0.85rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.waiting-name--empty {
  opacity: 0.35;
  font-weight: 400;
}

.waiting-dealer-badge {
  background: rgba(255, 215, 0, 0.2);
  color: #ffd700;
  font-size: 0.7rem;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 6px;
  flex-shrink: 0;
}

.waiting-status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 5px;
  font-size: 0.9rem;
}

.waiting-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.15);
  border-top-color: #46c574;
  border-radius: 50%;
  animation: waiting-spin 0.8s linear infinite;
}

@keyframes waiting-spin {
  to { transform: rotate(360deg); }
}

.waiting-actions {
  margin-top: 6px;
}

.waiting-hint {
  font-size: 0.8rem;
  opacity: 0.62;
  margin: 0;
}

.waiting-leave-btn {
  margin-top: 10px;
  width: 100%;
  padding: 10px 24px;
  font-size: 0.85rem;
  opacity: 0.82;
}

.waiting-players--panel .waiting-slot {
  max-width: 100%;
}

.overlay-button {
  width: 100%;
}

.overlay-results {
  list-style: none;
  padding: 0;
  margin: 0 0 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.overlay-result-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
}

.result-rank {
  font-weight: 600;
  margin-right: 8px;
  color: #d5d5d5;
}

.rank-winner {
  color: #ffe27a;
}

.result-name {
  font-weight: 500;
}

.result-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  text-align: right;
}

.result-score {
  font-weight: 600;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 0.85rem;
  background: rgba(255, 255, 255, 0.1);
}

.score-positive {
  color: #5fffb0;
  background: rgba(95, 255, 176, 0.12);
}

.score-negative {
  color: #ff9d9d;
  background: rgba(255, 157, 157, 0.12);
}

.score-neutral {
  color: #f5f5f5;
}

.result-status {
  font-size: 0.85rem;
  opacity: 0.85;
}

.result-round {
  font-size: 0.8rem;
  color: #9ed3b4;
}

.overlay-empty {
  font-size: 0.9rem;
  opacity: 0.8;
  margin-bottom: 14px;
}

/* ===== 造反按钮 ===== */
@keyframes heartbeat {
  0%, 100% { transform: scale(1); }
  15% { transform: scale(1.08); }
  30% { transform: scale(1); }
  45% { transform: scale(1.05); }
  60% { transform: scale(1); }
}

/* ===== 响应式降级 ===== */
@media (max-width: 768px) {
  .room-container {
    padding: 12px;
  }

  .room-header {
    top: max(4px, env(safe-area-inset-top));
    width: max-content;
    max-width: min(96%, 420px);
  }

  .room-header-content {
    flex-direction: column;
    align-items: flex-start;
    width: 100%;
    padding: 8px 10px;
  }

  .room-title-line {
    width: 100%;
    flex-wrap: wrap;
    gap: 5px;
  }

  .header-broadcast-wrap {
    min-width: 0;
    width: 100%;
    max-width: none;
  }

  .mahjong-title {
    font-size: 1.2rem;
  }

  .mahjong-subtitle {
    font-size: 0.8rem;
  }

  .mahjong-table {
    width: 100%;
    border-width: 3px;
    padding: 10px;
  }

  .self-area-with-actions {
    flex-direction: column;
    align-items: center;
    gap: 6px;
  }

  .inline-action-buttons {
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
  }

  .inline-action-btn {
    font-size: 0.75rem;
    padding: 5px 10px;
  }
}

@media (max-width: 600px) {
  .mahjong-table {
    border-width: 2px;
  }

  .mahjong-button {
    font-size: 0.75rem;
    padding: 4px 7px;
  }
}

/* 横屏手机：牌桌缩小，牌跟着缩 */
.layout--mobile-landscape .mahjong-table {
  --tile-w: 17px;
  --tile-h: 24px;
  --discard-scale: 1.1;
  --discard-gap-x-override: 0.35px;
  --discard-gap-y-override: 0.35px;
  --tile-gap: 0px;
  border-width: 3px;
  --seat-side-inset: 2%;
  --seat-top-inset: 0.5%;
  --seat-bottom-inset: 0;
  --seat-top-width: 65%;
  --seat-bottom-width: 80%;
  --seat-side-width: 118px;
  --seat-side-height: calc(58% + (8% * var(--mobile-scale)));
  --seat-side-player-offset: 3.4%;
}
.layout--mobile-landscape :deep(.discard-zone--top) {
  top: calc(50% - var(--discard-center-rect-half-h) + 8px);
  transform: translate(-50%, -100%) rotate(180deg) !important;
}
.layout--mobile-landscape :deep(.discard-zone--right) {
  transform: translate(6px, -50%);
}
.layout--mobile-landscape .seat-top { min-height: 42px; }
.layout--mobile-landscape .seat-bottom { min-height: 54px; width: min(78%, calc(100% - (92px * var(--mobile-scale)))); }
.layout--mobile-landscape .seat-left { width: 136px; }
.layout--mobile-landscape .seat-right { width: 144px; }

/* 移动竖屏旋转模式 */
@media (max-width: 768px) and (orientation: portrait) {
  .mobile-portrait {
    min-height: 100vw;
    width: 100vw;
    overflow: clip;
  }

  .room-viewport--rotated {
    width: 100vh;
    width: 100dvh;
    height: 100vw;
    align-items: center;
    overflow: clip;
  }

  .room-container--rotated {
    display: flex;
    flex-direction: row;
    gap: 5px;
    transform: rotate(90deg);
    transform-origin: center;
    width: 100vh;
    width: 100dvh;
    height: 100vw;
    max-height: none;
  }

  .room-container--rotated .room-header {
    order: 2;
    flex-shrink: 0;
    margin-top: 0;
    align-self: flex-start;
  }

  .room-container--rotated .room-main {
    order: 1;
    flex-direction: row;
    flex: 1 1 auto;
    min-width: 0;
  }

  .room-container--rotated .table-wrapper {
    order: 1;
    flex: 1 1 auto;
    min-width: 0;
  }

  .room-container--rotated .extended-info-panel {
    order: 2;
    flex: 0 0 min(354px, 30%);
    max-width: min(354px, 30%);
    max-height: none;
    overflow-y: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .room-container--rotated .extended-info-panel::-webkit-scrollbar {
    display: none;
  }
}

.layout--mobile-landscape .room-header {
  display: none;
}

.layout--mobile-landscape .panel-room-header-row {
  gap: 6px;
}

.layout--mobile-landscape .panel-room-number,
.layout--mobile-landscape .mahjong-subtitle {
  font-size: 0.6rem;
}

.layout--mobile-landscape .ext-section {
  padding: 6px 8px 8px;
  border-radius: 10px;
}

.layout--mobile-landscape .ext-title {
  font-size: 0.8rem;
  margin-bottom: 4px;
}

.layout--mobile-landscape .ext-meta,
.layout--mobile-landscape .turn-status-text,
.layout--mobile-landscape .extra-actions-label,
.layout--mobile-landscape .extra-action-btn,
.layout--mobile-landscape .mahjong-button.small,
.layout--mobile-landscape .panel-button.small {
  font-size: calc(0.78rem * var(--mobile-scale, 1));
}

.layout--mobile-landscape .action-buttons-panel {
  gap: 6px;
}

.layout--mobile-landscape .extra-actions-bar {
.layout--mobile-landscape .extra-actions-group { justify-content: flex-start; }
  gap: 6px;
  padding: calc(4px * var(--mobile-scale)) calc(8px * var(--mobile-scale));
}

.layout--mobile-landscape :deep(.center-info) {
  padding: 4px 7px;
  gap: 3px;
  min-width: 62px;
}

.layout--mobile-landscape :deep(.multiplier-badge),
.layout--mobile-landscape :deep(.remaining-badge) {
  padding: 2px 5px;
  font-size: 0.48rem;
}

.layout--mobile-landscape :deep(.multiplier-badge .badge-icon),
.layout--mobile-landscape :deep(.remaining-badge .badge-icon) {
  font-size: 0.5rem;
}

.layout--mobile-landscape :deep(.multiplier-badge .badge-value),
.layout--mobile-landscape :deep(.remaining-badge .badge-value) {
  font-size: 0.56rem;
}

.layout--mobile-landscape :deep(.wild-tile-row) {
  padding: 1px 4px;
}
/* ===== Layout debug borders ===== */
.layout-debug {
  /* viewport boundaries */
  --dbg-room-container: 2px dashed #ff0000;
  --dbg-seat: 2px solid #00ff00;
  --dbg-discard: 2px solid #00aaff;
  --dbg-player: 2px dotted #ff00ff;
  --dbg-self: 2px solid #ffff00;
  --dbg-main: 2px dashed #ffaa00;
  --dbg-melds: 2px dotted #ff8800;
  --dbg-center: 2px dashed #ffffff;
}

/* Room boundaries */
.layout-debug .room-viewport {
  outline: 3px solid #ff0000 !important;
  outline-offset: -3px;
}
.layout-debug .room-container {
  outline: 3px solid #ff6600 !important;
  outline-offset: -3px;
}
.layout-debug .room-main {
  outline: 3px solid #ffaa00 !important;
  outline-offset: -3px;
}

/* Center area */
.layout-debug .center-area {
  outline: 3px dashed #ffffff !important;
  outline-offset: -3px;
}

/* Seats */
.layout-debug .seat {
  outline: 2px solid #00ff88 !important;
  outline-offset: -2px;
}
.layout-debug .seat-top {
  outline-color: #00ccff !important;
}
.layout-debug .seat-left {
  outline-color: #ff8800 !important;
}
.layout-debug .seat-right {
  outline-color: #cc44ff !important;
}
.layout-debug .seat-bottom {
  outline-color: #88ff44 !important;
}

/* Player areas */
.layout-debug .player-other {
  outline: 2px solid #ff44ff !important;
  outline-offset: -1px;
}
.layout-debug .self-area {
  outline: 3px solid #ffff00 !important;
  outline-offset: -2px;
}

/* Discard zones */
.layout-debug .discard-zone {
  outline: 2px solid #00aaff !important;
  outline-offset: -2px;
}

/* Melds */
.layout-debug .player-other-melds,
.layout-debug .player-self-melds {
  outline: 2px dotted #ff8800 !important;
  outline-offset: -2px;
}

/* Discard grid */
.layout-debug .discards-grid {
  outline: 1px dashed rgba(255, 0, 255, 0.5) !important;
  outline-offset: 0;
}

/* Action buttons */
.layout-debug .action-buttons,
.layout-debug .inline-action-buttons {
  outline: 2px solid #ff0000 !important;
}

/* 观赛模式标识 */
.spectating-hint { display: flex; align-items: center; justify-content: center; gap: 5px; padding: 16px; min-height: 56px; background: rgba(0,0,0,0.3); }
.spectating-hint-icon { font-size: 1.4rem; }
.spectating-hint-text { font-size: 0.95rem; color: rgba(255,255,255,0.8); }

.inline-action-buttons--spectator {
  right: 0;
  bottom: auto;
  top: 0;
  min-width: auto;
}
.spectator-badge {
  font-size: 0.7rem;
  color: #4fc3f7;
  background: rgba(79,195,247,0.12);
  border: 1px solid rgba(79,195,247,0.25);
  border-radius: 6px;
  padding: 3px 7px;
  white-space: nowrap;
}




/* ===== Xiaomi 14 Pro / compact mobile styles ===== */
.layout--mobile-landscape .broadcast-header {
  padding: 2px 6px !important;
  gap: 3px !important;
}
.layout--mobile-landscape .broadcast-title {
  font-size: 0.5rem !important;
  line-height: 1 !important;
}
.layout--mobile-landscape .broadcast-icon {
  font-size: 0.5rem !important;
}
.layout--mobile-landscape .inline-action-buttons {
  gap: 2px !important;
}
.layout--mobile-landscape .inline-action-btn {
  font-size: 0.5rem !important;
  padding: 2px 5px !important;
  min-width: 28px !important;
}
@media (max-width: 900px) and (orientation: portrait) {
  .broadcast-header { padding: 3px 6px !important; gap: 3px !important; }
  .broadcast-title { font-size: 0.55rem !important; line-height: 1.2 !important; }
  .broadcast-icon { font-size: 0.55rem !important; }
  .inline-action-buttons { gap: 2px !important; }
  .inline-action-btn { font-size: 0.55rem !important; padding: 2px 6px !important; min-width: 32px !important; }
}
/* extra-action-btn--hu removed - Hu is in CircularActionButtons only */




/* ===== [2026-05-29] 验牌阶段 ===== */
.reveal-phase-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(4px);
  z-index: 9999;
  animation: fadeIn 0.4s ease;
}
.reveal-phase-text {
  font-size: 2rem;
  font-weight: 700;
  color: #ffd700;
  text-shadow: 0 0 20px rgba(255, 215, 0, 0.6), 0 2px 4px rgba(0,0,0,0.5);
  margin-bottom: 16px;
  letter-spacing: 4px;
}
.reveal-phase-countdown {
  font-size: 3rem;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 0 10px rgba(255,255,255,0.5);
}

</style>
