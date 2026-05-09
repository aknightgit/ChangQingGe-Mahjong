<template>
  <div class="mahjong-page" :class="[
    { 'layout-debug': showDebugPanel, 'mobile-portrait': shouldRotateView },
    `layout--${layoutMode}`
  ]">
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
        <!-- 梁山聚义成功弹窗 -->
        <div v-if="showLiangShanOverlay" class="liang-shan-overlay">
          <div class="liang-shan-card">
            <div class="liang-shan-icon">🔥🔥🔥</div>
            <p class="liang-shan-title">聚义成功，共上梁山！</p>
            <p class="liang-shan-sub">本局结束 · 下把翻倍</p>
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
                  <span class="hu-combo-score">总赢 {{ getHuOptionTotalWin(opt) }}</span>
                </div>
                <div class="hu-combo-main">
                  <span class="hu-combo-label">{{ opt.label.replace(/·自摸|·捉冲|\(无百搭×2\)/g, '') }}</span>
                  <span class="hu-combo-method">{{ opt.type === 'self_draw' ? '自摸' : '捉冲' }}</span>
                </div>
                <div class="hu-combo-formula">{{ getHuOptionFormula(opt) }}</div>
                <div v-if="getHuOptionGroups(opt).length" class="hu-group-list">
                  <div
                    v-for="(group, groupIndex) in getHuOptionGroups(opt)"
                    :key="`group-${idx}-${groupIndex}`"
                    class="hu-group"
                  >
                    <span class="hu-group-kind">{{ getHuGroupKind(group.type) }}</span>
                    <div class="hu-group-tiles">
                      <MahjongTile
                        v-for="tile in group.tiles"
                        :key="tile.id"
                        :tile="tile"
                        :size="28"
                        :small="true"
                      />
                    </div>
                  </div>
                </div>
                <div class="hu-summary-grid">
                  <div class="hu-summary-item">
                    <span class="hu-summary-key">基础番数</span>
                    <span class="hu-summary-value">{{ opt.summary?.baseFan ?? '--' }}</span>
                  </div>
                  <div class="hu-summary-item">
                    <span class="hu-summary-key">额外倍数</span>
                    <span class="hu-summary-value">×{{ opt.summary?.extraMultipliers ?? 1 }}</span>
                  </div>
                  <div class="hu-summary-item">
                    <span class="hu-summary-key">全局倍数</span>
                    <span class="hu-summary-value">×{{ opt.summary?.globalMultiplier ?? 1 }}</span>
                  </div>
                  <div class="hu-summary-item">
                    <span class="hu-summary-key">房间结算倍数</span>
                    <span class="hu-summary-value">×{{ opt.summary?.settlementMultiplier ?? 1 }}</span>
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
            <!-- 流局时：任意点击进入下一局；非流局时：退出大厅 -->
            <button v-if="canStartNextRoundOverlay" class="mahjong-button primary overlay-button" @click="startNextRound">
              下一局
            </button>
            <button v-else class="mahjong-button primary overlay-button" @click="backToLobby">
              退出到大厅
            </button>
          </div>
        </div>


        <!-- 结算面板 -->
        <div v-if="showSettlement" class="settle-overlay">
  <div class="settle-panel">
    <h2 class="settle-title-center">本局输赢</h2>

    <div class="settle-rounds settle-rounds--single">
      <div class="settle-round-card">
        <div v-if="currentSettlementRound" class="settle-round-header">
          <span>第 {{ currentSettlementRound.roundNumber }} 局</span>
          <span>全局倍数 ×{{ currentSettlementRound.effectiveMultiplier }} / 结算倍数 ×{{ currentSettlementRound.settlementMultiplier }}</span>
        </div>
        <div class="settle-round-block">
          <div class="settle-table-wrap">
            <table class="settle-round-table settle-round-table--compact">
              <thead>
                <tr>
                  <th>玩家</th>
                  <th>胡序</th>
                  <th>胡牌牌面</th>
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
                  <td class="settle-round-tiles">{{ row.tiles }}</td>
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

    <div class="settle-actions">
      <button v-if="canReviewHuSelection" class="settle-save-btn settle-save-btn--secondary" @click="openHuReviewPanel">
        回看胡牌选择
      </button>
      <button class="settle-save-btn" @click="startNextRound">
        下一局
      </button>
    </div>
  </div>
</div>

        <!-- 设置面板（悬浮玻璃态，定位在设置按钮下方） -->
        <Teleport to="body">
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
                <div class="glass-settings-row" @click="toggleSound">
                  <span class="glass-settings-icon">{{ soundEnabled ? '🔊' : '🔇' }}</span>
                  <span class="glass-settings-label">音效</span>
                  <div class="glass-toggle" :class="{ 'glass-toggle--on': soundEnabled }">
                    <div class="glass-toggle-knob"></div>
                  </div>
                </div>
                <div class="glass-settings-row" @click="showHintEnabled = !showHintEnabled">
                  <span class="glass-settings-icon">💡</span>
                  <span class="glass-settings-label">出牌提示</span>
                  <div class="glass-toggle" :class="{ 'glass-toggle--on': showHintEnabled }">
                    <div class="glass-toggle-knob"></div>
                  </div>
                </div>
                <div class="glass-settings-row" @click="tileAnimationEnabled = !tileAnimationEnabled">
                  <span class="glass-settings-icon">✨</span>
                  <span class="glass-settings-label">牌面动画</span>
                  <div class="glass-toggle" :class="{ 'glass-toggle--on': tileAnimationEnabled }">
                    <div class="glass-toggle-knob"></div>
                  </div>
                </div>
                <div class="glass-settings-row" @click="actionSoundEnabled = !actionSoundEnabled">
                  <span class="glass-settings-icon">🎵</span>
                  <span class="glass-settings-label">操作音效</span>
                  <div class="glass-toggle" :class="{ 'glass-toggle--on': actionSoundEnabled }">
                    <div class="glass-toggle-knob"></div>
                  </div>
                </div>
                <div class="glass-settings-row" @click="timerWarningEnabled = !timerWarningEnabled">
                  <span class="glass-settings-icon">⏱</span>
                  <span class="glass-settings-label">倒计时警告</span>
                  <div class="glass-toggle" :class="{ 'glass-toggle--on': timerWarningEnabled }">
                    <div class="glass-toggle-knob"></div>
                  </div>
                </div>
                <div class="glass-settings-row" @click="cycleVoiceScheme">
                  <span class="glass-settings-icon">🗣️</span>
                  <span class="glass-settings-label">出牌音色</span>
                  <span class="glass-voice-name">{{ currentVoiceName }}</span>
                </div>
                <div class="glass-settings-select-wrap">
                  <div class="glass-settings-select-label">出牌音量 {{ voiceVolumePercent }}%</div>
                  <input class="glass-settings-range" type="range" min="0" max="100" step="1" :value="voiceVolumePercent" @input="onChangeVoiceVolume" />
                </div>
                <div class="glass-settings-theme-block">
                  <div class="glass-settings-theme-title">🎵 背景音乐</div>
                  <div class="glass-settings-row" @click="setBackgroundMusicEnabled(!bgmEnabled)">
                    <span class="glass-settings-icon">{{ bgmEnabled ? '🎶' : '🔇' }}</span>
                    <span class="glass-settings-label">背景音乐</span>
                    <div class="glass-toggle" :class="{ 'glass-toggle--on': bgmEnabled }">
                      <div class="glass-toggle-knob"></div>
                    </div>
                  </div>
                  <div class="glass-settings-select-wrap">
                    <div class="glass-settings-select-label">曲目</div>
                    <select class="glass-settings-select" :value="bgmCurrentTrackId || ''" @change="onChangeBgmTrack">
                      <option value="" disabled>选择背景音乐</option>
                      <option v-for="track in bgmTracks" :key="track.id" :value="track.id">{{ track.label }}</option>
                    </select>
                  </div>
                  <div class="glass-settings-select-wrap">
                    <div class="glass-settings-select-label">循环方式</div>
                    <select class="glass-settings-select" :value="bgmLoopMode" @change="onChangeBgmLoopMode">
                      <option value="single">单曲循环</option>
                      <option value="all">列表循环</option>
                      <option value="shuffle">随机循环</option>
                    </select>
                  </div>
                  <div class="glass-settings-select-wrap">
                    <div class="glass-settings-select-label">音量 {{ bgmVolumePercent }}%</div>
                    <input class="glass-settings-range" type="range" min="0" max="100" step="1" :value="bgmVolumePercent" @input="onChangeBgmVolume" />
                  </div>
                  <div class="glass-settings-music-actions">
                    <button class="glass-theme-chip" type="button" @click="toggleBgmPlayback">{{ bgmIsPlaying ? '暂停' : '播放' }}</button>
                    <button class="glass-theme-chip" type="button" @click="playNextBackgroundTrack">下一首</button>
                  </div>
                </div>
                <div class="glass-settings-theme-block">
                  <div class="glass-settings-theme-title">🎨 桌布方案</div>
                  <div class="glass-theme-options">
                    <button class="glass-theme-chip" :class="{ 'glass-theme-chip--active': tableTheme === 'classic-green' }" @click="setTableTheme('classic-green')">经典绿</button>
                    <button class="glass-theme-chip" :class="{ 'glass-theme-chip--active': tableTheme === 'jade-green' }" @click="setTableTheme('jade-green')">翡翠青</button>
                    <button class="glass-theme-chip" :class="{ 'glass-theme-chip--active': tableTheme === 'royal-red' }" @click="setTableTheme('royal-red')">赤金红</button>
                  </div>
                </div>
                <div class="glass-settings-theme-block">
                  <div class="glass-settings-theme-title">🀄 牌背颜色</div>
                  <div class="glass-theme-options">
                    <button class="glass-theme-chip" :class="{ 'glass-theme-chip--active': tileBackScheme === 0 }" @click="setTileBackScheme(0)">原版绿</button>
                    <button class="glass-theme-chip" :class="{ 'glass-theme-chip--active': tileBackScheme === 1 }" @click="setTileBackScheme(1)">象牙白</button>
                    <button class="glass-theme-chip" :class="{ 'glass-theme-chip--active': tileBackScheme === 2 }" @click="setTileBackScheme(2)">卡布里蓝</button>
                  </div>
                </div>
                <div class="glass-settings-footer">
                  <span>长清阁麻将 v2.2</span>
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
              :status-message="showMobileActionNotice ? mobileActionNoticeText : turnMessage"
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
                <div v-if="myTingText" class="self-ting-banner">{{ myTingText }}</div>
                <PlayerSelfArea
                  name=""
                  :hand="playerHand"
                  :melds="playerMelds"
                  :tile-back-scheme="tileBackScheme"
                  :player-colors="claimSourceColors"
                  :just-drawn-tile-id="selfJustDrawnTileId"
                  :viewer-position="currentPlayer?.position"
                  :owner-position="currentPlayer?.position"
                  :selected-tile-id="selectedTileId"
                  :is-winner="isWinner"
                  @tileClick="handleTileClick"
                  @tileDblclick="handleTileDblclick"
                  @tileDiscard="handleTileDiscard"
                />
                <!-- 动作按钮放在手牌右侧 -->
                <div v-if="isAIControlled" class="inline-action-buttons">
                  <div class="ai-controlled-notice">
                    🤖 已由AI自动出牌
                  </div>
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
                  <button
                    v-if="showHu"
                    class="inline-action-btn inline-action-btn--hu inline-action-btn--claim-pulse"
                    :disabled="isInteractionLocked"
                    @click="onHu"
                  >胡</button>
                  <button
                    v-if="showRebel"
                    class="inline-action-btn inline-action-btn--rebel"
                    :class="{ 'inline-action-btn--frozen': thinkFreezeActive }"
                    :disabled="isInteractionLocked || thinkFreezeActive"
                    @click="onRebel"
                  >🚨造反</button>
                  <button
                    v-if="canLiangShan"
                    class="inline-action-btn inline-action-btn--liangshan"
                    :class="{ 'inline-action-btn--liangshan-voted': hasVotedLiangShan, 'inline-action-btn--frozen': thinkFreezeActive }"
                    :disabled="!canLiangShan || isInteractionLocked || hasVotedLiangShan || thinkFreezeActive"
                    @click="onLiangShan"
                  >🔥{{ hasVotedLiangShan ? '已聚义' : '梁山聚义' }}</button>
                  <div v-if="!showDraw && !showChow && !showPeng && !showKong && !showHu && !showConcealedKong && !showExtendedKong && !showRebel && !canLiangShan" class="inline-action-waiting">
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
              v-if="gameState?.phase === 'playing' || gameState?.phase === 'ended'"
              class="settle-btn-header"
              @click="onRequestSettle"
            >
              📊 退房结算
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

          <!-- 操作按钮区：等待态隐藏，避免空壳感 -->
          <div v-if="!isPreGameTransition" class="action-buttons-panel">
              <!-- 状态提示 -->
              <div class="turn-status-text">
                <template v-if="thinkFreezeActive">
                  🧠 {{ thinkFreezePlayerName }} 在思考中... {{ thinkFreezeCountdown }}s
                </template>
                <template v-else-if="isWinner">
                  🎉 你赢了！
                </template>
                <template v-else-if="isAIControlled">
                  🤖 AI托管中
                </template>
                <template v-else-if="showMobileActionNotice">{{ mobileActionNoticeText }}</template>
                <span v-if="turnTimerActive && !isWinner && !isAIControlled" class="turn-timer-inline" :class="{ 'turn-timer--urgent': turnTimer <= 10 }">
                  ⏱ {{ turnTimer }}s
                </span>
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
              <!-- 更多特殊操作：常驻显示聚义/造反 -->
              <div class="extra-actions-bar">
                <span class="extra-actions-label">更多操作</span>
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
              </div>
          </div>
        </aside>
      </main>


      <Teleport to="body">
        <DiceAnimation
          v-if="showDiceOverlay"
          :dice1="diceValues[0]"
          :dice2="diceValues[1]"
          :dealer-name="dealerName"
          :max-rolls="effectiveMaxRolls"
          :is-dealer="isDealer"
          @deal="onDealTiles"
          @roll="onRerollDice"
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
                  class="ai-card-btn ai-card-btn--spectate"
                  :disabled="!canUseSpectatorView"
                  @click="onSpectateFromCard"
                >
                  👁️ {{ spectatingId === playerCardPlayer?.id ? '取消观赛' : '观赛TA' }}
                  <span class="ai-card-hint">{{ canUseSpectatorView ? '查看对方手牌' : '当前条件下不可观赛' }}</span>
                </button>
                <button class="ai-card-btn ai-card-btn--leave" @click="onAILeave">
                  🚪 出局
                  <span class="ai-card-hint">下局移除该AI</span>
                </button>
                <button v-if="isSpectator" class="ai-card-btn ai-card-btn--replace" @click="onAIReplace">
                  🙋 换我上
                  <span class="ai-card-hint">下局由你接替</span>
                </button>
              </template>
              <!-- 其他真人玩家的操作 -->
              <template v-else-if="playerCardPlayer?.id !== currentPlayer?.id">
                <button
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
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch, provide } from 'vue'
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
  startGame,
  refreshState,
  forceRefreshState,
  replacePendingAction,
  isActionPending,
  roomDismissedReason,
  lastStateChangeAt,
  leadingBrotherEvent,
  actionApprovalEvent
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
const toggleBgmPlayback = () => {
  if (bgmIsPlaying.value) pauseBackgroundMusic()
  else playBackgroundMusic()
}
const {
  currentVoiceName,
  currentVoiceVolume,
  loadVoiceScheme,
  preloadAllTiles,
  playVoiceTile,
  playVoiceAction,
  primeVoiceAudio,
  setVoiceVolume
} = useVoiceTile()

const showAllCards = ref(false)
const shouldRevealOpponents = computed(() => showAllCards.value || !!currentPlayer.value?.isSpectator)
const initialViewport = process.client
  ? { width: window.innerWidth, height: window.innerHeight }
  : { width: 1024, height: 768 }
const initialSmallestSide = Math.min(initialViewport.width, initialViewport.height)
const initialIsPortrait = initialViewport.height >= initialViewport.width
const isCompactMobileViewport = (width: number, height: number) => {
  const smallestSide = Math.min(width, height)
  const isPortrait = height >= width
  return isPortrait ? smallestSide <= 768 : smallestSide <= 768 || height <= 768
}
const isMobilePortrait = ref(initialIsPortrait && initialSmallestSide <= 768)
const isMobileLandscape = ref(!initialIsPortrait && isCompactMobileViewport(initialViewport.width, initialViewport.height))
const shouldRotateView = computed(() => isMobilePortrait.value)
const isMobileLandscapeMode = computed(() => isMobileLandscape.value && !shouldRotateView.value)
const layoutMode = computed<'desktop' | 'mobile-landscape' | 'mobile-portrait'>(() => {
  if (shouldRotateView.value) return 'mobile-portrait'
  if (isMobileLandscapeMode.value) return 'mobile-landscape'
  return 'desktop'
})
const nowTs = ref(Date.now())
let actionWindowTimer: ReturnType<typeof setInterval> | null = null

const actionButtonsVisibleUntil = ref(0)
const isGameStarting = ref(false)
const showDiceOverlay = ref(false)
const diceValues = ref<[number, number]>([1, 1])
const hasDicePreview = ref(false)
const showDoubleReminder = ref(false)
const flowerReplacementNotice = ref<Tile | null>(null)
const autoStartRequested = ref(false)
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
const showHintEnabled = ref(true)
const tileAnimationEnabled = ref(true)
const actionSoundEnabled = ref(true)
const timerWarningEnabled = ref(true)

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

const cycleVoiceScheme = async () => {
  await loadVoiceScheme('bingtang')
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
  const smallestSide = Math.min(width, height)
  const isPortrait = height >= width
  isMobilePortrait.value = isPortrait && smallestSide <= 768
  isMobileLandscape.value = !isPortrait && isCompactMobileViewport(width, height)
}

const isHiddenTile = (tile: any) => String(tile?.id || '').startsWith('hidden-') || tile?.value === 0
const isOpponentHandRevealed = (player?: Player | null) => {
  if (!player || player.id === currentPlayer.value?.id) return false
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
  if (process.client) {
    document.body.style.overflow = open ? 'hidden' : ''
    document.documentElement.style.overflow = open ? 'hidden' : ''
  }

  if (open) nextTick(updateSettingsPosition)
  else playWhoosh()
})

onMounted(async () => {
  await lockLandscapeForGameRoom()

  if (roomId.value && playerId.value) {
    await connect(roomId.value, playerId.value)
    clearPendingRoomTarget()
  }
  await loadVoiceScheme('bingtang')
  ensureBackgroundMusicInitialized()
  // 首次进入自动播放BGM（需要用户已开启）
  playBackgroundMusic()

  // 监听广播消息播放对应音效
  window.addEventListener('mahjong-broadcast', ((event: CustomEvent) => {
    const detail = event.detail
    addBroadcast(detail.text, detail.type as BroadcastMsg['type'])
    // 根据广播内容播放音效和语音
    const text = detail.text || ''
    if (text.includes('补花')) { playSound('tile-draw'); playVoiceAction('flowerReplace') }
    else if (text.includes('自摸')) playVoiceAction('selfHu')
    else if (text.includes('胡')) playVoiceAction('hu')
  }) as EventListener)

  if (process.client) {
    void preloadAllTiles()
    evaluateViewport()
    window.addEventListener('resize', evaluateViewport)
    window.addEventListener('orientationchange', evaluateViewport)
    window.addEventListener('pointerdown', handleGlobalPointerDown as EventListener)
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
    if (actionWindowTimer) {
      clearInterval(actionWindowTimer)
      actionWindowTimer = null
    }
    stopTurnTimer()
  }
})

const hesitationWindow = computed(() => Math.max(1000, Number(gameState.value?.hesitationWindow ?? 5000)))
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
const playerDiscards = computed(() => getVisiblePlayerDiscards(currentPlayer.value))
const roundDisplay = computed(() => `第${currentRound.value}局`)
const getDiceRoundMultiplier = (dice1: number, dice2: number) => {
  const isDouble = dice1 === dice2
  const isOneFourCombo = (dice1 === 1 && dice2 === 4) || (dice1 === 4 && dice2 === 1)

  if (isDouble) {
    if (dice1 === 1 || dice1 === 4) return 4
    return 2
  }
  if (isOneFourCombo) return 2
  return 1
}
const effectiveMaxRolls = computed(() => {
  const raw = Number(gameState.value?.diceRollCount ?? route.query.dice ?? 1)
  return Number.isFinite(raw) ? Math.max(1, Math.floor(raw)) : 1
})
const roundMultiplier = computed(() => {
  const actualRound = Number(gameState.value?.roundMultiplier ?? 0)
  if (actualRound > 0) return actualRound
  if (showDiceOverlay.value && hasDicePreview.value) {
    return getDiceRoundMultiplier(diceValues.value[0], diceValues.value[1])
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
    return Math.min(inherit * getDiceRoundMultiplier(diceValues.value[0], diceValues.value[1]), 8)
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
  return currentPlayer.value.status === 'won' || hasDebugSpectateBot.value
})

const handleSpectate = async (id: string) => {
  if (!gameState.value || !currentPlayer.value || !canUseSpectatorView.value) return
  const nextTargetId = spectatingId.value === id ? null : id
  try {
    const resp = await $fetch('/api/game/spectate', {
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
    await $fetch('/api/game/spectate-approval', {
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
  return gameState.value.players.some((p: any) => (p.hand?.concealedTiles?.length || 0) > 0)
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
const overlayReason = computed(() => roomDismissedReason.value || gameState.value?.endReason || null)
const isOverlayVisible = computed(() => {
  if (roomDismissedReason.value) return true
  if (!isGameEnded.value) return false
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
  const digit = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'][Number(tile.value)] || String(tile.value)
  return `${digit}${suitLabel}`
}

const tileSuitOrder: Record<string, number> = { wan: 0, tiao: 1, dots: 2, feng: 3, jian: 4, hua: 5 }
const compareTilesForDisplay = (a: Partial<Tile>, b: Partial<Tile>): number => {
  const suitDelta = (tileSuitOrder[a.suit || ''] ?? 99) - (tileSuitOrder[b.suit || ''] ?? 99)
  if (suitDelta !== 0) return suitDelta
  return Number(a.value ?? 0) - Number(b.value ?? 0)
}
const isWildPreviewTile = (tile: Partial<Tile> | null | undefined): boolean => {
  if (!tile || !wildTile.value) return false
  if (wildTile.value.suit === 'hua') {
    return tile.suit === 'hua' && (wildTile.value.flowerGroup || []).includes(String(tile.value))
  }
  return tile.suit === wildTile.value.suit && Number(tile.value) === Number(wildTile.value.value)
}

const myTingText = computed(() => {
  const winningTiles = tingPreview.value?.winningTiles || []
  const isTing = !!currentPlayer.value?.isTing || !!tingPreview.value?.isTing || winningTiles.length > 0
  if (!isTing) return ''
  const visibleWinningTiles = winningTiles
    .map((entry: any) => entry.tile)
    .filter((tile: Tile) => !!tile && !isWildPreviewTile(tile))
    .sort(compareTilesForDisplay)
    .map((tile: Tile) => tileLabel(tile))
    .filter(Boolean)
  const discardHuTiles = winningTiles
    .filter((entry: any) => !!entry?.bestDiscardOption)
    .map((entry: any) => entry.tile)
    .filter((tile: Tile) => !!tile && !isWildPreviewTile(tile))
    .sort(compareTilesForDisplay)
    .map((tile: Tile) => tileLabel(tile))
    .filter(Boolean)
  const selfDrawOnlyTiles = winningTiles
    .filter((entry: any) => !entry?.bestDiscardOption && !!entry?.bestSelfDrawOption)
    .map((entry: any) => entry.tile)
    .filter((tile: Tile) => !!tile && !isWildPreviewTile(tile))
    .sort(compareTilesForDisplay)
    .map((tile: Tile) => tileLabel(tile))
    .filter(Boolean)

  const uniqueDiscardHuTiles = Array.from(new Set(discardHuTiles))
  const uniqueSelfDrawOnlyTiles = Array.from(new Set(selfDrawOnlyTiles))
  const uniqueVisibleWinningTiles = Array.from(new Set(visibleWinningTiles))

  if (uniqueDiscardHuTiles.length && uniqueSelfDrawOnlyTiles.length) {
    return `您已听牌：${uniqueDiscardHuTiles.join(',')}；仅自摸：${uniqueSelfDrawOnlyTiles.join(',')}`
  }
  if (uniqueDiscardHuTiles.length) {
    return `您已听牌：${uniqueDiscardHuTiles.join(',')}`
  }
  if (uniqueSelfDrawOnlyTiles.length) {
    return `您已听牌（仅自摸）：${uniqueSelfDrawOnlyTiles.join(',')}`
  }
  if (uniqueVisibleWinningTiles.length) {
    return `您已听牌：${uniqueVisibleWinningTiles.join(',')}`
  }
  return '您已听牌'
})
const getHuOptionBasePoints = (opt: any) => Number(opt?.summary?.finalPoints ?? opt?.score ?? 0)
// finalPoints = 自摸时单个输家应付的点数，或捉冲时放冲者独自应付的点数
const getHuOptionPayerCount = (opt: any) => {
  if (opt?.type !== 'self_draw') return 1
  const players = Array.isArray(gameState.value?.players) ? gameState.value.players : []
  const losers = players.filter(player => player.id !== playerId.value && player.status !== 'won')
  return Math.max(1, losers.length)
}
const getHuOptionTotalWin = (opt: any) => getHuOptionBasePoints(opt) * getHuOptionPayerCount(opt)
const getHuOptionFormula = (opt: any) => {
  const summary = opt?.summary || {}
  const baseFan = Number(summary.baseFan ?? 0)
  const extraMultipliers = Number(summary.extraMultipliers ?? 1)
  const globalMultiplier = Number(summary.globalMultiplier ?? 1)
  const settlementMultiplier = Number(summary.settlementMultiplier ?? 1)
  const finalPoints = getHuOptionBasePoints(opt)
  const payerCount = getHuOptionPayerCount(opt)
  const totalWin = getHuOptionTotalWin(opt)
  const baseFormula = `基础${baseFan} × 额外${extraMultipliers} × 全局${globalMultiplier} × 结算${settlementMultiplier} = 单家${finalPoints}`
  if (opt?.type === 'self_draw') {
    return `${baseFormula}；自摸 ${finalPoints} × ${payerCount}家 = ${totalWin}`
  }
  return `${baseFormula}；捉冲总赢 = ${totalWin}`
}
const getHuGroupKind = (type: string) => {
  // type 是 HandType 字符串，如 ALL_TRIPLETS / HALF_FLUSH / FULL_FLUSH 等
  return HAND_TYPE_DISPLAY[type] || '组'
}
// 用 scoring.ts 枚举的真实牌型分解（handTypes），而非 arrangeWinningHand 的随意排列
const HAND_TYPE_DISPLAY: Record<string, string> = {
  STANDARD: '普通胡',
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

const enterStartingPhaseWithDiceOverlay = async () => {
  try {
    await $fetch('/api/game/start', {
      method: 'POST',
      body: {
        gameId: roomId.value,
        playerId: playerId.value,
        phaseOnly: true
      }
    })
    diceValues.value = [
      Math.floor(Math.random() * 6) + 1,
      Math.floor(Math.random() * 6) + 1
    ]
    hasDicePreview.value = true
    playSound('dice-roll')
    showDiceOverlay.value = true
  } catch (e: any) {
    console.error('[enterStartingPhaseWithDiceOverlay] Failed:', e)
    addBroadcast(e?.data?.message || e?.message || '进入下一局失败', 'warn')
  }
}

const maybeAutoDealForBotDealer = () => {
  const dealer = dealerPlayer.value
  if (!dealer || !isBotPlayer(dealer)) return
  onRerollDice()
  window.setTimeout(() => {
    void onDealTiles()
  }, 420)
}

const startNextRound = async () => {
  showSettlement.value = false
  await enterStartingPhaseWithDiceOverlay()
  await forceRefreshState()
  maybeAutoDealForBotDealer()
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
        winRoundLabel: isWinner && player.winRound ? `第${player.winRound}轮` : null,
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
  commitDiscard(tile)
}

// ===== 双击出牌 =====
const handleTileDblclick = (tile: Tile) => {
  if (!canSubmitDiscard(tile)) return
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
    commitDiscard(tile)
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
    winOptions.value = (res.winOptions || []).slice(0, 3)
  } catch (err) {
    console.error('Failed to fetch win options:', err)
    winOptions.value = []
  }
}

// 自摸时自动弹面板
let autoHuShown = false
watch(() => [showHu.value, isMyTurn.value], ([canHu, myTurn]) => {
  if (canHu && myTurn && !showHuPanel.value && !autoHuShown) {
    autoHuShown = true
    onHu()
  }
  if (!canHu) autoHuShown = false
})

// 选择胡牌组合
const selectedHuCombo = ref<number | null>(null)
const onHu = async () => {
  // 不管自摸还是捉冲，都弹面板
  isHuReviewMode.value = false
  await fetchWinOptions()
  showHuPanel.value = true
  selectedHuCombo.value = 0
}
const onConfirmHu = (index: number) => {
  hideActionButtonsNow()
  resetAutoCount()
  playSound('tile-hu')
  lastHuReviewOptions.value = displayWinOptions.value.map((option: any) => ({ ...option }))
  lastSelectedHuCombo.value = index
  isHuReviewMode.value = false
  showHuPanel.value = false
  executeAction(ActionType.HU, undefined, undefined, displayWinOptions.value[index]?.internalLabel || displayWinOptions.value[index]?.label)
}
const onCancelHu = () => {
  showHuPanel.value = false
  selectedHuCombo.value = isHuReviewMode.value ? lastSelectedHuCombo.value : null
  isHuReviewMode.value = false
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
  // 服务端显式 freeze 优先；若当前轮到自己且共享 claim 窗口里允许 DRAW，则直接跟 pending.expiresAt 对齐。
  const freezeFromPending = currentFreezeUntil.value
  if (freezeFromPending > nowTs.value) return freezeFromPending

  if (hasDeferredDrawWindow.value) {
    return Number((myPendingAction.value as any)?.expiresAt ?? 0)
  }

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
    await $fetch('/api/game/approval-choice', {
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

const onDraw = () => { resetAutoCount(); playSound('tile-draw'); executeAction(ActionType.DRAW) }
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
  executeAction(ActionType.KONG)
}
const onRebel = () => { resetAutoCount(); playSound('tile-rebel'); executeAction(ActionType.REBEL) }
const onThink = () => { resetAutoCount(); executeAction(ActionType.THINK) }
const onCheatHu = () => { resetAutoCount(); playSound('tile-hu'); executeAction(ActionType.CHEAT_HU) }

// 退房结算
const showSettlement = ref(false)
const settlementData = ref<any>(null)
const lastAutoSettlementKey = ref('')

const formatSignedScore = (score: any): string => {
  const n = Number(score ?? 0)
  return n > 0 ? `+${n}` : String(n)
}

const formatWinnerTiles = (winner: any): string => {
  const handTiles = Array.isArray(winner?.handTiles) ? winner.handTiles : []
  const exposedTiles = Array.isArray(winner?.exposedTiles) ? winner.exposedTiles : []
  const tiles = [...handTiles, ...exposedTiles].filter((tile: any) => tile?.suit !== 'hua' && tile?.suit !== 'flower')
  if (tiles.length) return tiles.map(tileLabel).filter(Boolean).join(' ')
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
  return (settlementData.value?.playerStats || []).map((player: any) => {
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
      baseFan: winner?.baseFan ?? '-',
      finalPoints: winner?.finalPoints ?? '-',
      winMode: winner
        ? (winner.discarderId
          ? (winner.discarderName || '未知')
          : `自摸 ${getSettlementPayerCount(round, winner)}家`)
        : '-',
      score,
      scoreLabel: formatSignedScore(score)
    }
  })
}

const currentSettlementRound = computed(() => {
  const rounds = Array.isArray(settlementData.value?.roundDetails) ? settlementData.value.roundDetails : []
  return rounds.length > 0 ? rounds[rounds.length - 1] : null
})

const currentSettlementRows = computed(() => {
  return currentSettlementRound.value ? getRoundSettlementRows(currentSettlementRound.value) : []
})

const onRequestSettle = async () => {
  try {
    const res = await $fetch('/api/game/settle', {
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
      showSettlement.value = true
    }
  } catch (e) {
    console.error('[Settle] Failed:', e)
  }
}
const onSaveSettle = async () => {
  try {
    await $fetch('/api/game/settle', {
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

// 玩家操作卡片
const showPlayerCard = ref(false)
const playerCardPlayer = ref<any>(null)
const isBotPlayer = (p: any) => p?.name?.startsWith('AI-') || p?.name?.startsWith('电脑') || false
const isSpectator = computed(() => {
  if (!gameState.value?.players || !currentPlayer.value) return true
  return !gameState.value.players.some((p: any) => p.id === currentPlayer.value?.id)
})
// 换位置相关
const mySwapInfo = ref<{ totalChances: number; usedChances: number; remaining: number }>({ totalChances: 0, usedChances: 0, remaining: 0 })
const canSwap = computed(() => mySwapInfo.value.remaining > 0)
const canOpenPlayerCardFor = (player: any) => {
  if (!player) return false
  if (player.id === currentPlayer.value?.id) return true
  if (isBotPlayer(player)) return true
  if (canUseSpectatorView.value) return true
  if (canSwap.value) return true
  return false
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
    await $fetch('/api/game/kick-player', {
      method: 'POST',
      body: {
        gameId: roomId.value,
        playerId: currentPlayer.value?.id,
        targetPlayerId: playerCardPlayer.value.id
      }
    })
    addBroadcast(`🚪 ${aiName} 下局将被移除！`, 'warn')
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
    await $fetch('/api/game/replace-player', {
      method: 'POST',
      body: {
        gameId: roomId.value,
        playerId: currentPlayer.value?.id,
        targetPlayerId: playerCardPlayer.value.id,
        spectatorName: myName
      }
    })
    addBroadcast(`🙋 ${myName} 下局将接替 ${aiName}！`, 'info')
    await refreshState()
  } catch (e) {
    console.error('[AI Replace] Failed:', e)
  }
}

// 暂时离席
const onTempLeave = async () => {
  if (!playerCardPlayer.value) return
  showPlayerCard.value = false
  try {
    await $fetch('/api/game/kick-player', {
      method: 'POST',
      body: {
        gameId: roomId.value,
        playerId: currentPlayer.value?.id,
        targetPlayerId: currentPlayer.value?.id
      }
    })
    addBroadcast(`🪑 ${currentPlayer.value?.name} 下局暂时离席`, 'info')
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
    await $fetch('/api/game/bot-mode', {
      method: 'POST',
      body: {
        gameId: roomId.value,
        playerId: currentPlayer.value?.id,
        enabled: true
      }
    })
    addBroadcast(`🤖 ${currentPlayer.value?.name} 已托管给AI！`, 'warn')
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
    const resp = await $fetch('/api/game/swap-position', {
      method: 'POST',
      body: {
        gameId: roomId.value,
        playerId: currentPlayer.value.id,
        targetId: playerCardPlayer.value.id
      }
    }) as any
    if (resp?.success) {
      addBroadcast(`🔄 ${myName} 下一局开始将与 ${targetName} 互换位置！`, 'special')
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

// 梁山聚义
const canLiangShan = computed(() => availableActions.value.includes(ActionType.LIANG_SHAN))
const hasVotedLiangShan = computed(() => {
  const votes = (gameState.value as any)?.liangShanVotes || []
  return votes.includes(currentPlayer.value?.id)
})
const onLiangShan = () => {
  resetAutoCount()
  playSound('tile-rebel')
  executeAction(ActionType.LIANG_SHAN)
}

// 圆形操作按钮事件处理
const handleCircularAction = (type: string) => {
  switch (type) {
    case 'draw':
      // 摸牌通常由服务端自动触发，这里尝试执行 draw action
      executeAction(ActionType.DRAW)
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
})

const actionWindowText = computed(() => {
  if (!hasPriorityActions.value && !isMyTurn.value) return ''
  const pending = myPendingAction.value
  const expiresAt = Number(pending?.expiresAt ?? 0)
  if (!expiresAt) return ''
  const leftMs = Math.max(0, expiresAt - nowTs.value)
  return `响应窗口：${(leftMs / 1000).toFixed(1)}s（超时自动过）`
})

const showMobileActionNotice = computed(() => shouldRotateView.value && hasPriorityActions.value)
const mobileActionNoticeText = computed(() => {
  const labels: string[] = []
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
    autoStartRequested.value = false
  } finally {
    isGameStarting.value = false
  }
}

const onRerollDice = () => {
  diceValues.value = [
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1
  ]
  hasDicePreview.value = true
  playSound('dice-roll')
}

const onDealTiles = async () => {
  // 防止重复调用：只有当 overlay 可见时才处理
  if (!showDiceOverlay.value || isGameStarting.value) return
  isGameStarting.value = true
  hasDicePreview.value = false
  showDiceOverlay.value = false
  showDoubleReminder.value = false
  if (doubleReminderTimer) {
    clearTimeout(doubleReminderTimer)
    doubleReminderTimer = null
  }
  // 等 DiceAnimation 的 Leave 动画完成（约 300ms）再正式开始
  await new Promise(resolve => setTimeout(resolve, 350))
  console.log('[onDealTiles] Calling startGame API...')
  try {
    await startGame({ hesitationWindow: hesitationWindow.value, fixedDice: diceValues.value })
    console.log('[onDealTiles] startGame done, forcing fresh state...')
    // 强制刷新（绕过debounce），确保开局后立刻看到正确的可用操作
    await forceRefreshState()
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
  const waitingText = !gameState.value
    ? '⏳ 正在连接牌桌…'
    : waitingPlayers.value.length >= 2 && isDealerUser.value
      ? '⏳ 人数已满足，等待系统自动开局'
      : `⏳ 当前 ${waitingPlayers.value.length}/4 人，牌桌准备中`
  return [{ id: -1, text: waitingText, type: 'info', timestamp: Date.now(), timeLabel: 'NOW' } as BroadcastMsg, ...broadcastMessages.value].slice(0, 5)
})
let broadcastId = 0
const addBroadcast = (text: string, type: BroadcastMsg['type'] = 'info') => {
  const now = Date.now()
  const timeLabel = formatBeijingTime(now)
  const sanitizedText = type === 'win'
    ? text.replace(/(胡牌)\s*[·•･][^·•･()（）\s]+/u, '$1')
    : text
  broadcastMessages.value.push({ id: ++broadcastId, text: sanitizedText, type, timestamp: now, timeLabel })
  // 最多保留 20 条
  if (broadcastMessages.value.length > 5) {
    broadcastMessages.value = broadcastMessages.value.slice(-5)
  }
}

watch(
  () => [gameState.value?.phase, (gameState.value as any)?.roundStats?.length ?? 0, gameState.value?.gameId, (gameState.value as any)?.endReason],
  async ([phase, roundCount, gameId, endReason]) => {
    if (phase !== GamePhase.ENDED || !gameId || !currentPlayer.value?.id) return
    if (endReason === GameEndReason.WALL_EXHAUSTED) {
      showSettlement.value = false
      settlementData.value = null
      return
    }
    const settlementKey = `${gameId}-${roundCount}`
    if (lastAutoSettlementKey.value === settlementKey) return
    lastAutoSettlementKey.value = settlementKey
    await onRequestSettle()
  }
)

// 追踪上一轮游戏状态，检测变化生成广播
const prevWinnersCount = ref(0)
const prevPhase = ref<string>('')
const prevBailoutRelations = ref<string>('')
const prevBotPlayers = ref<Set<string>>(new Set())
const prevRebelEvent = ref<any>(null)
const prevLiangShanVoteCount = ref(0)
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
    // 念其他玩家出的牌
    if (lastTile?.suit) playVoiceTile(lastTile.suit, lastTile.value)
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
const getOtherMeldCount = (player: any) => (player?.hand?.exposedMelds?.length ?? 0)
const getOtherDiscardCount = (player: any) => (player?.hand?.discardedTiles?.length ?? 0)
const getReplacedFlowerMelds = (player: any) =>
  (player?.hand?.exposedMelds || []).filter((meld: any) => {
    const tile = meld?.tiles?.[0]
    return meld?.tiles?.length === 1 && tile?.suit === 'hua' && !!meld?.replacementDone
  })
const checkOtherPlayerSounds = (newState: any) => {
  if (!newState?.players) return
  const pendingMeldVoices: Array<'kong' | 'pong' | 'chow'> = []
  for (const player of newState.players) {
    const prev = prevOtherPlayerState.get(player.id)
    const meldCount = getOtherMeldCount(player)
    const discardCount = getOtherDiscardCount(player)
    const replacedFlowerMelds = getReplacedFlowerMelds(player)
    const replacedFlowerCount = replacedFlowerMelds.length
    if (prev) {
      if (player.id !== playerId.value && replacedFlowerCount > prev.replacedFlowerCount) {
        playSound('tile-draw')
        playVoiceAction('flowerReplace')
      }
      if (player.id !== playerId.value && discardCount > prev.discardCount && Date.now() - lastFastDiscardAt.value > 250) {
        const newDiscards = (player.hand?.discardedTiles || []).slice(prev.discardCount)
        const lastNew = newDiscards[newDiscards.length - 1]
        if (!recentlyPlayedDiscardAudio(lastNew)) {
          playSound('tile-discard')
          if (lastNew?.suit) playVoiceTile(lastNew.suit, lastNew.value)
          markDiscardAudioPlayed(lastNew)
        }
      }
      if (player.id !== playerId.value && meldCount > prev.meldCount) {
        const newMelds = (player.hand?.exposedMelds || []).slice(prev.meldCount)
        for (const m of newMelds) {
          const firstTile = m.tiles?.[0]
          const isFlowerReplacementMeld = m.tiles?.length === 1 && firstTile?.suit === 'hua'
          if (isFlowerReplacementMeld) continue
          if (m.type === 'kong' || m.tiles?.length === 4) pendingMeldVoices.push('kong')
          else if (m.type === 'triplet') pendingMeldVoices.push('pong')
          else pendingMeldVoices.push('chow')
        }
      }
    }
    prevOtherPlayerState.set(player.id, { meldCount, discardCount, replacedFlowerCount })
  }
  const currentIds = new Set(newState.players.map((p: any) => p.id))
  for (const id of prevOtherPlayerState.keys()) {
    if (!currentIds.has(id)) prevOtherPlayerState.delete(id)
  }
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
}
const activePlayerCount = (state: any) => (state?.players || []).filter((p: any) => p.status === 'playing').length

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
      addBroadcast(`📢 ${alert.playerName} 已达被聚义QJ线，特此广而告之！`, 'special')
    }
    // 重置 prevQjAlertIds，确保后续结算时能再次检测新增
    prevQjAlertIds.value = new Set<string>(existingAlerts.map((a: any) => a.playerId))
  }

  // 有人胡牌
  if (newState.winnersCount > prevWinnersCount.value && prevPhase.value === 'playing') {
    const newWinners = (newState.players || []).filter(
      (p: any) => p.status === 'won' && p.winOrder === newState.winnersCount
    )
    const bailoutRels = (newState as any).bailoutRelations || []
    for (const w of newWinners) {
      const method = w.winRound ? `第${w.winRound}轮` : ''
      const handType = w.winHandType ? `·${w.winHandType}` : ''
      // 检查三口/四口关系
      const rel = bailoutRels.find((r: any) => r.player1 === w.id || r.player2 === w.id)
      const partnerId = rel ? (rel.player1 === w.id ? rel.player2 : rel.player1) : null
      const partner = partnerId ? (newState.players || []).find((p: any) => p.id === partnerId) : null
      const bailInfo = rel && partner ? ` · ${rel.type}包${partner.name}` : ''
      addBroadcast(`🏆 ${w.name} ${method}胡牌${handType}${bailInfo}`, 'win')
    }
    playSound('round-end')
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
        if (player) addBroadcast(`⚔️ ${player.name} 提议梁山聚义！造反！`, 'special')
      }
    }
  }

  // 梁山聚义投票进度（播报但不透露具体谁投了）
  const currentVotes = ((newState as any).liangShanVotes || []).length
  if (currentVotes > prevLiangShanVoteCount.value) {
    if (currentVotes === 1) {
      const voter = newState.players?.find((p: any) => p.id === (newState as any).liangShanVotes?.[0])
      addBroadcast(`🔥 ${voter?.name || '某玩家'} 发起了梁山聚义！`, 'special')
    } else if (currentVotes >= activePlayerCount(newState)) {
      addBroadcast(`🔥🔥🔥 全员响应梁山聚义！本局结束，下把翻倍！`, 'special')
      // 显示梁山聚义成功弹窗，0.2s 后消失
      showLiangShanOverlay.value = true
      setTimeout(() => {
        showLiangShanOverlay.value = false
      }, 200)
    } else {
      addBroadcast(`🔥 有${currentVotes}名玩家响应了梁山聚义！`, 'special')
    }
  }
  prevLiangShanVoteCount.value = currentVotes

  // 被聚义QJ线突破提醒（红色高亮）
  const currentAlerts = (newState as any).qjAlerts || []
  const currentAlertIds = new Set<string>(currentAlerts.map((a: any) => a.playerId))
  for (const alert of currentAlerts) {
    if (!prevQjAlertIds.value.has(alert.playerId)) {
      addBroadcast(`📢 ${alert.playerName} 已达被聚义QJ线，特此广而告之！`, 'special')
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
      if (from && to) addBroadcast(`🔄 ${from.name} 下一局开始将与 ${to.name} 互换位置`, 'special')
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
  (phase) => {
    if (phase === GamePhase.STARTING) {
      if (!hasDicePreview.value) {
        diceValues.value = [1, 1]
      }
      showDiceOverlay.value = true
      return
    }
    if (phase !== GamePhase.STARTING) {
      showDiceOverlay.value = false
      hasDicePreview.value = false
    }
  },
  { immediate: true }
)

watch(
  () => ({
    phase: gameState.value?.phase,
    playerCount: gameState.value?.players.length || 0,
    isDealer: !!currentPlayer.value?.isDealer,
    isSpectator: !!currentPlayer.value?.isSpectator
  }),
  (state) => {
    if (state.phase !== 'waiting') {
      autoStartRequested.value = false
      return
    }
    if (state.playerCount < 2 || !state.isDealer || state.isSpectator) return
    if (autoStartRequested.value || isGameStarting.value || showDiceOverlay.value) return

    autoStartRequested.value = true
    onStartGame()
  },
  { deep: true, immediate: true }
)

// AI 接管检测（通过轮询检查 botModePlayers）
const checkAITakeover = () => {
  if (!gameState.value?.players) return
  const currentBotPlayers = new Set<string>()
  // 检查是否有玩家进入 AI 托管（通过玩家状态推断）
  for (const p of gameState.value.players) {
    // 这里通过 isAIControlled 状态检测（如果有的话）
    // 暂时跳过，因为 bot 状态在客户端不易获取
  }
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
    await useFetch('/api/game/join', {
      method: 'POST',
      body: { gameId: roomId.value, playerName: `电脑${i}` }
    })
  }
  
  await refreshState()
  
  // 进入骰子流程
  onStartGame()
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
  
  await useFetch('/api/game/action', {
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
}

.room-container--rotated {
  max-width: none;
  display: flex;
  flex-direction: column;
}

.room-container {
  position: relative;
  background: rgba(7, 19, 14, 0.92);
  border-radius: 20px;
  padding: 16px 16px 20px;
  max-width: 1400px;
  width: 100%;
  box-shadow: 0 18px 45px rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  gap: 12px;
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
  gap: 12px;
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
  gap: 8px;
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
  font-size: 0.78rem;
  line-height: 1;
}

.room-header-toggle__label {
  line-height: 1;
}

.header-actions {
  display: flex;
  gap: 8px;
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
  gap: 12px;
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
  gap: 8px;
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
  color: #000;
  border: 1px solid rgba(255, 255, 255, 0.2);
  cursor: pointer;
  white-space: nowrap;
  min-width: 108px;
}
.settle-btn-header:hover { background: rgba(25, 118, 210, 0.8); color: #000; }

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
  gap: 12px;
  position: relative;
}

@media (min-width: 900px) {
  .room-main {
    flex-direction: row;
    align-items: stretch;
    gap: 12px;
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
  --tile-gap: 2px;
  border-radius: 20px;
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
  --seat-bottom-inset: 0.4%;
  --seat-top-width: 58%;
  --seat-bottom-width: 72%;
  --seat-side-width: 96px;
  --seat-side-height: 70%;
  --seat-side-player-offset: 1.4%;
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

:global(.glass-settings-theme-block) {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(255,255,255,0.08);
}

:global(.glass-settings-theme-title) {
  color: rgba(255,255,255,0.8);
  font-size: 12px;
  margin: 0 6px 8px;
}

:global(.glass-theme-options) {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  padding: 0 6px;
}

:global(.glass-theme-chip) {
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.88);
  border-radius: 999px;
  font-size: 12px;
  padding: 5px 10px;
  cursor: pointer;
}

:global(.glass-theme-chip--active) {
  background: rgba(56, 189, 248, 0.24);
  border-color: rgba(56, 189, 248, 0.55);
  color: #fff;
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
  top: calc(50% - var(--discard-center-rect-half-h));
  left: 50%;
  transform: translate(-50%, -100%);
}
:deep(.discard-zone--bottom) {
  top: calc(50% + var(--discard-center-rect-half-h));
  left: 50%;
  transform: translate(-50%, 0);
}
:deep(.discard-zone--left) {
  top: 50%;
  left: calc(50% - var(--discard-center-rect-half-w));
  transform: translate(-100%, -50%);
}
:deep(.discard-zone--right) {
  top: 50%;
  left: calc(50% + var(--discard-center-rect-half-w));
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
}

/* 操作按钮区：与战绩榜同宽，底部对齐牌桌 */
.action-buttons-panel {
  margin-top: auto;
  flex-shrink: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* 更多特殊操作横条 */
.extra-actions-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: rgba(10, 20, 15, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  flex-wrap: wrap;
}

.extra-actions-label {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.35);
  margin-right: 2px;
  flex-shrink: 0;
}

.extra-action-btn {
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(20, 40, 28, 0.8);
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.75rem;
  font-weight: 600;
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
  padding: 0;
  min-height: 100vh;
  height: 100vh;
  overflow: hidden;
}

.layout--mobile-landscape .room-viewport {
  width: 100%;
  height: 100%;
}

.layout--mobile-landscape .room-container {
  padding: 0;
  gap: 0;
  border-radius: 0;
  max-width: none;
  width: 100%;
  height: 100vh;
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
  flex: 0 0 70%;
  width: 70%;
  max-width: 70%;
  min-width: 0;
  min-height: 0;
  padding: 0;
  overflow: hidden;
  align-items: stretch;
  justify-content: flex-start;
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
  --seat-bottom-inset: 0.15%;
  --seat-top-width: 55%;
  --seat-bottom-width: 75%;
  --seat-side-width: 100px;
  --seat-side-height: 50%;
  --seat-side-player-offset: 0.9%;
  --discard-center-rect-half-w: 14.3%;
  --discard-center-rect-half-h: 11%;
}

.layout--mobile-landscape .extended-info-panel {
  flex: 0 0 30%;
  width: 30%;
  min-width: 0;
  max-width: 30%;
  max-height: 100%;
  font-size: 0.62rem;
  gap: 3px;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 3px;
  border-radius: 0;
  scrollbar-width: thin;
}

.layout--mobile-landscape .extended-info-panel * {
  max-width: 100%;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.layout--mobile-landscape .extended-info-panel .ext-section { padding: 3px 4px 4px; border-radius: 6px; margin: 0; }
.layout--mobile-landscape .extended-info-panel .ext-title { font-size: 0.62rem; margin-bottom: 1px; }
.layout--mobile-landscape .extended-info-panel .ext-meta { font-size: 0.54rem; margin-bottom: 1px; line-height: 1.25; }
.layout--mobile-landscape .extended-info-panel .panel-room-number { font-size: 0.6rem; }
.layout--mobile-landscape .extended-info-panel .extra-action-btn { padding: 2px 4px; font-size: 0.52rem; }
.layout--mobile-landscape .extended-info-panel .extra-actions-bar { padding: 2px 4px; gap: 3px; flex-wrap: wrap; }
.layout--mobile-landscape .extended-info-panel .extra-actions-label { font-size: 0.48rem; }
.layout--mobile-landscape .extended-info-panel .settle-btn-header { padding: 2px 4px; font-size: 0.52rem; min-width: auto; }
.layout--mobile-landscape .extended-info-panel .action-buttons-panel { gap: 3px; }
.layout--mobile-landscape .extended-info-panel .turn-status-text { font-size: 0.54rem; }
.layout--mobile-landscape .extended-info-panel .room-header-row { gap: 3px; margin: 0; }
.layout--mobile-landscape .extended-info-panel .room-stats { padding: 2px 3px; }
.layout--mobile-landscape .extended-info-panel .player-row { padding: 2px 3px; font-size: 0.52rem; gap: 3px; }
.layout--mobile-landscape .extended-info-panel .broadcast-container { max-height: 50px; padding: 2px 3px; }
.layout--mobile-landscape .extended-info-panel .broadcast-message { font-size: 0.48rem; padding: 1px 0; }
.layout--mobile-landscape .extended-info-panel .action-panel { padding: 4px; gap: 4px; }
.layout--mobile-landscape .extended-info-panel .action-btn--small { width: 28px; height: 28px; font-size: 0.6rem; }
.layout--mobile-landscape .extended-info-panel .action-btn--draw { width: 40px; height: 40px; font-size: 0.75rem; }
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
    gap: 8px;
  }
}

.ext-section {
  padding: 8px 10px 10px;
  border-radius: 14px;
  background: rgba(5, 14, 10, 0.9);
}

.ext-section--actions {
  margin-top: -6px;
}

.ext-title {
  font-size: 0.9rem;
  margin-bottom: 6px;
  opacity: 0.9;
  font-weight: 600;
}

.ext-meta {
  font-size: 0.8rem;
  margin-bottom: 4px;
  opacity: 0.85;
}

/* 梁山聚义按钮 */
.liang-shan-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  border-radius: 12px;
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
  z-index: 5; /* 在牌墙z-index=1之上 */
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
  --tile-w: 14px;
  --tile-h: 20px;
}

/* 对家名字反向旋转，保持正向可读 */
.seat-left {
  left: calc(var(--seat-side-inset) - var(--seat-side-player-offset) - var(--tile-w));
  top: 50%;
  transform: translateY(-50%);
  height: calc(var(--seat-side-height) + 4%);
  width: calc(var(--seat-side-width) + 30px);
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
  overflow: visible;
}

.seat-right {
  right: calc(var(--seat-side-inset) - var(--seat-side-player-offset) - var(--tile-w) - 0.35 * var(--tile-w));
  top: 50%;
  transform: translateY(-50%);
  height: calc(var(--seat-side-height) + 4%);
  width: calc(var(--seat-side-width) + 48px);
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
  gap: 14px;
  width: 100%;
  position: relative;
}

.self-ting-banner {
  position: absolute;
  left: 50%;
  bottom: calc(100% + 8px);
  transform: translateX(-50%);
  max-width: min(80vw, 520px);
  padding: 8px 14px;
  border-radius: 999px;
  background: rgba(6, 18, 12, 0.7);
  border: 1px solid rgba(255, 215, 0, 0.28);
  color: rgba(255, 247, 209, 0.96);
  font-size: 0.82rem;
  font-weight: 700;
  line-height: 1.35;
  text-align: center;
  backdrop-filter: blur(4px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.24);
  pointer-events: none;
  z-index: 6;
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

.inline-action-btn--comeback {
  background: linear-gradient(135deg, #0d6efd, #42a5f5);
  color: #fff;
  border-color: rgba(66, 165, 245, 0.6);
  font-size: 0.85rem;
  padding: 8px 16px;
  animation: comeback-glow 1.5s infinite;
}

@keyframes comeback-glow {
  0%, 100% { box-shadow: 0 0 8px rgba(66, 165, 245, 0.4); }
  50% { box-shadow: 0 0 20px rgba(66, 165, 245, 0.8); }
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
  justify-content: flex-start;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 12px;
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
  z-index: 5;
  font-size: 0.75rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.55);
  background: rgba(0, 0, 0, 0.3);
  padding: 3px 10px;
  border-radius: 4px;
  cursor: pointer;
  pointer-events: auto;
  white-space: nowrap;
  transition: color 0.2s, background 0.2s;
}
.player-name-label:hover {
  color: #fff;
  background: rgba(0, 0, 0, 0.55);
}
.player-name-label--top    { top: 0%; left: 50%; transform: translateX(-50%); }
.player-name-label--bottom { bottom: 0%; left: 50%; transform: translateX(-50%); }
.player-name-label--left   { left: 0.6%; top: 50%; transform: translateY(-50%); }
.player-name-label--right  { right: 0.6%; top: 50%; transform: translateY(-50%); }

.winner-tag {
  font-size: 0.65rem;
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
  font-size: 0.82rem;
  color: rgba(255, 255, 255, 0.85);
  padding: 8px 0 4px;
  font-weight: 600;
  white-space: nowrap;
}
.ting-action-reminder {
  max-width: 100%;
  padding: 6px 10px;
  border: 1px solid rgba(255, 214, 102, 0.34);
  border-radius: 10px;
  background: rgba(75, 54, 10, 0.62);
  color: #ffd666;
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1.25;
  text-align: center;
  overflow-wrap: anywhere;
}
.turn-timer-inline {
  margin-left: 6px;
  font-size: 0.78rem;
  font-weight: 700;
  color: #81c784;
  background: rgba(0, 0, 0, 0.3);
  padding: 1px 8px;
  border-radius: 999px;
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
  border-radius: 20px;
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
  border-radius: 20px;
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
  border-radius: 20px;
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
  border-radius: 12px;
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
  border-radius: 12px;
  margin: 8px 0;
  overflow: hidden;
}
.approval-countdown-bar {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: linear-gradient(90deg, #4CAF50, #8BC34A);
  border-radius: 12px;
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
  border-radius: 20px;
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
  border-radius: 20px;
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
  gap: 12px;
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
  width: min(520px, 92%);
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
}

.hu-panel-title {
  text-align: center;
  font-size: 1.3rem;
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
  border-radius: 12px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.15s;
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
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.hu-combo-rank {
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: rgba(255, 230, 150, 0.88);
}
.hu-combo-label {
  font-size: 1.06rem;
  font-weight: 800;
  color: #fff;
  white-space: normal;
  line-height: 1.45;
}
.hu-combo-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}
.hu-combo-method {
  font-size: 0.82rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.72);
  background: rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  padding: 4px 10px;
}
.hu-combo-method,
.hu-summary-grid {
  display: none;
}
.hu-combo-formula {
  margin-bottom: 10px;
  font-size: 0.83rem;
  line-height: 1.5;
  color: rgba(255, 240, 190, 0.88);
}
.hu-group-list {
  display: grid;
  gap: 8px;
}
.hu-group {
  display: flex;
  align-items: center;
  gap: 8px;
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
  gap: 8px;
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
  gap: 12px;
  justify-content: center;
}

.hu-confirm-btn {
  padding: 12px 32px;
  border-radius: 12px;
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
  border-radius: 12px;
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
    gap: 8px;
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
    gap: 8px;
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
  padding: 32px;
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
  margin-bottom: 20px;
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
  border-radius: 12px;
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
  border-radius: 20px;
  padding: 32px;
  width: fit-content;
  max-width: min(1100px, 96vw);
  max-height: 85vh;
  overflow: visible;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6);
  animation: settle-in 0.3s ease;
}

.settle-title-center {
  text-align: center;
  font-size: 1.3rem;
  font-weight: 700;
  color: #ffd700;
  margin: 0 0 20px;
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
  margin: 0 0 20px;
}

.settle-ranking {
  margin-bottom: 20px;
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
  margin-bottom: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  padding-top: 16px;
}

.settle-rounds {
  display: grid;
  gap: 14px;
  margin-bottom: 20px;
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
  padding: 14px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.settle-round-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  color: #f7e6a8;
  font-weight: 600;
  font-size: 0.86rem;
}

.settle-round-summary-line {
  color: rgba(255, 244, 191, 0.9);
  font-size: 0.82rem;
  font-weight: 700;
}

.settle-round-block {
  display: grid;
  gap: 6px;
}

.settle-round-subtitle {
  color: rgba(255, 255, 255, 0.72);
  font-size: 0.78rem;
}

.settle-table-wrap {
  width: fit-content;
  max-width: min(1040px, 92vw);
  overflow: auto;
}

.settle-round-table {
  width: 100%;
  min-width: 860px;
  border-collapse: collapse;
  font-size: 0.78rem;
  color: #f3f3f3;
}

.settle-round-table--compact {
  min-width: 900px;
  table-layout: fixed;
}

.settle-round-table--compact th,
.settle-round-table--compact td {
  text-align: center;
  vertical-align: middle;
}

.settle-round-table--compact th:nth-child(1),
.settle-round-table--compact td:nth-child(1) {
  width: 88px;
}

.settle-round-table--compact th:nth-child(2),
.settle-round-table--compact td:nth-child(2) {
  width: 56px;
}

.settle-round-table--compact th:nth-child(3),
.settle-round-table--compact td:nth-child(3) {
  width: 290px;
}

.settle-round-table--compact th:nth-child(4),
.settle-round-table--compact td:nth-child(4),
.settle-round-table--compact th:nth-child(5),
.settle-round-table--compact td:nth-child(5),
.settle-round-table--compact th:nth-child(6),
.settle-round-table--compact td:nth-child(6),
.settle-round-table--compact th:nth-child(7),
.settle-round-table--compact td:nth-child(7) {
  width: 64px;
}

.settle-round-table--compact th:nth-child(8),
.settle-round-table--compact td:nth-child(8) {
  width: 116px;
}

.settle-round-table--compact th:nth-child(9),
.settle-round-table--compact td:nth-child(9) {
  width: 88px;
}

.settle-round-table th,
.settle-round-table td {
  padding: 7px 8px;
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
  min-width: 180px;
  line-height: 1.5;
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
  font-size: 0.78rem;
  line-height: 1.5;
}

.settle-round-transfer {
  display: flex;
  justify-content: space-between;
  gap: 12px;
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
    width: min(96vw, 820px);
    padding: 14px 12px 12px;
    border-radius: 14px;
  }

  .settle-round-header {
    gap: 4px;
    font-size: 0.66rem;
  }

  .settle-table-wrap {
    max-width: calc(96vw - 24px);
  }

  .settle-round-table {
    font-size: 0.62rem;
    min-width: 700px;
  }

  .settle-round-table--compact {
    min-width: 700px;
  }

  .settle-round-table--compact th,
  .settle-round-table--compact td {
    padding: 5px 4px;
  }

  .settle-round-table--compact th:nth-child(1),
  .settle-round-table--compact td:nth-child(1) {
    width: 72px;
  }

  .settle-round-table--compact th:nth-child(2),
  .settle-round-table--compact td:nth-child(2) {
    width: 40px;
  }

  .settle-round-table--compact th:nth-child(3),
  .settle-round-table--compact td:nth-child(3) {
    width: 212px;
  }

  .settle-round-table--compact th:nth-child(4),
  .settle-round-table--compact td:nth-child(4),
  .settle-round-table--compact th:nth-child(5),
  .settle-round-table--compact td:nth-child(5),
  .settle-round-table--compact th:nth-child(6),
  .settle-round-table--compact td:nth-child(6),
  .settle-round-table--compact th:nth-child(7),
  .settle-round-table--compact td:nth-child(7) {
    width: 52px;
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
  gap: 8px;
  padding: 4px 10px;
  font-size: 0.7rem;
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
  gap: 8px;
}

.settle-detail-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.02);
  font-size: 0.75rem;
  flex-wrap: wrap;
}

.settle-detail-name {
  font-weight: 600;
  min-width: 60px;
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
  padding: 14px;
  border-radius: 12px;
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
  padding: 14px;
  border-radius: 12px;
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
  gap: 8px;
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
  gap: 8px;
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
  gap: 8px;
  margin: 0;
}

.waiting-slot {
  display: flex;
  align-items: center;
  gap: 8px;
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
  font-size: 1.3rem;
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
  gap: 12px;
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
  border-radius: 12px;
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
  margin-bottom: 20px;
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
    gap: 8px;
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
    padding: 6px 10px;
  }
}

/* 横屏手机：牌桌缩小，牌跟着缩 */
.layout--mobile-landscape .mahjong-table {
  --tile-w: 17px;
  --tile-h: 24px;
  --tile-gap: 0px;
  border-width: 3px;
  --seat-side-inset: 2%;
  --seat-top-inset: 0.5%;
  --seat-bottom-inset: 0.05%;
  --seat-top-width: 65%;
  --seat-bottom-width: 80%;
  --seat-side-width: 92px;
  --seat-side-height: 60%;
  --seat-side-player-offset: 0.6%;
}
.layout--mobile-landscape .seat-top { min-height: 42px; }
.layout--mobile-landscape .seat-bottom { min-height: 54px; width: min(78%, calc(100% - 92px)); }
.layout--mobile-landscape .seat-left { width: 114px; }
.layout--mobile-landscape .seat-right { width: 120px; }

@media (max-height: 450px) and (orientation: landscape) {
  .layout--mobile-landscape .mahjong-table {
    --tile-w: 14px;
    --tile-h: 20px;
    --tile-gap: 0px;
    border-width: 2px;
    --seat-side-width: 70px;
    --seat-side-height: 52%;
  }
  .layout--mobile-landscape .seat-top { min-height: 36px; }
  .layout--mobile-landscape .seat-bottom { min-height: 46px; width: min(82%, calc(100% - 72px)); }
  .layout--mobile-landscape .seat-left { width: 84px; }
  .layout--mobile-landscape .seat-right { width: 90px; }
}

/* 移动竖屏旋转模式 */
@media (max-width: 768px) and (orientation: portrait) {
  .mobile-portrait {
    min-height: 100vw;
  }

  .room-viewport--rotated {
    width: 100vh;
    height: 100vw;
    align-items: center;
    overflow: hidden;
  }

  .room-container--rotated {
    display: flex;
    flex-direction: row;
    gap: 10px;
    transform: rotate(90deg);
    transform-origin: center;
    width: min(900px, 90vh);
    max-height: calc(100vw - 24px);
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
  font-size: 0.78rem;
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
  font-size: 0.68rem;
}

.layout--mobile-landscape .action-buttons-panel {
  gap: 6px;
}

.layout--mobile-landscape .extra-actions-bar {
  gap: 6px;
  padding: 4px 8px;
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



/* 语音名称标签（设置面板） */
.glass-voice-name {
  font-size: 12px;
  color: #a8d8ea;
  margin-left: auto;
  font-weight: 500;
  padding: 2px 8px;
  background: rgba(168, 216, 234, 0.12);
  border-radius: 10px;
}

</style>
