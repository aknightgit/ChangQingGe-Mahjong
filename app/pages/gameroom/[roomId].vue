<template>
  <div class="mahjong-page" :class="{ 'mobile-portrait': shouldRotateView }">
    <div class="room-viewport" :class="{ 'room-viewport--rotated': shouldRotateView }">
      <div class="room-container" :class="{ 'room-container--rotated': shouldRotateView }">
      <header class="room-header">
        <div class="room-info">
          <div class="room-title-line">
            <h1 class="mahjong-title">长清阁麻将</h1>
            <span class="round-info-header" v-if="gameState?.phase === 'playing'">{{ roundDisplay }}</span>
          </div>
        </div>

        <div class="header-actions">
          <button
            class="mahjong-button small secondary"
            :class="{ 'sound-off': !soundEnabled }"
            @click="toggleSound"
            :title="soundEnabled ? '🔊 音效开' : '🔇 音效关'"
          >
            {{ soundEnabled ? '🔊' : '🔇' }}
          </button>
          <button class="mahjong-button small secondary" @click="showSettings = true">
            ⚙️ 设置
          </button>
          <button class="mahjong-button small secondary" @click="navigateTo('/rules')">
            📖 规则
          </button>
          <button class="mahjong-button small" @click="backToLobby">
            返回大厅
          </button>
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
        <div v-if="actionApprovalEvent && actionApprovalEvent.candidatePlayerId === currentPlayer?.id" class="approval-overlay">
          <div class="approval-card">
            <div class="approval-icon">⚡🀄</div>
            <p class="approval-title">{{ actionApprovalEvent.requesterAction === '吃' ? '吃碰/胡冲突' : actionApprovalEvent.requesterAction === '碰' ? '碰胡冲突' : '杠胡冲突' }}！</p>
            <p class="approval-sub">{{ actionApprovalEvent.requesterName }} 要{{ actionApprovalEvent.requesterAction }}这张牌</p>
            <p class="approval-question">你要用{{ actionApprovalEvent.availableActions.map(a => a === 'hu' ? '胡' : a === 'peng' ? '碰' : '杠').join('/') }}吗？</p>
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
        <div v-if="actionApprovalEvent && actionApprovalEvent.candidatePlayerId !== currentPlayer?.id && isMyApprovalWaiting" class="approval-waiting-overlay">
          <div class="approval-waiting-card">
            <div class="approval-waiting-icon">⏳</div>
            <p class="approval-waiting-text">等待其他家做决定...</p>
            <p class="approval-waiting-sub">你{{ actionApprovalEvent.requesterAction }}了这张牌，等待{{ actionApprovalEvent.availableActions.map(a => a === 'hu' ? '胡' : a === 'peng' ? '碰' : '杠').join('/') }}</p>
          </div>
        </div>

        <!-- 容我想一想弹窗 -->
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

        <!-- 胡牌选择面板 -->
        <div v-if="showHuPanel" class="hu-panel-overlay" @click.self="onCancelHu">
          <div class="hu-panel">
            <h3 class="hu-panel-title">🀄 选择胡牌牌型</h3>
            <div class="hu-combos">
              <div
                v-for="(opt, idx) in winOptions"
                :key="idx"
                class="hu-combo"
                :class="{ 'hu-combo--selected': selectedHuCombo === idx }"
                @click="selectedHuCombo = idx"
              >
                <div class="hu-combo-header">
                  <span class="hu-combo-label">{{ opt.label.replace(/·自摸|·捉冲/, '') }}</span>
                  <span class="hu-combo-score">{{ opt.score > 0 ? '+' : '' }}{{ opt.score }}分</span>
                </div>
                <div class="hu-combo-tiles" v-if="opt.tileGroups">
                  <div v-for="(group, gi) in opt.tileGroups" :key="gi" class="hu-tile-group">
                    <div v-for="(tile, ti) in group.tiles" :key="ti" class="hu-tile-item">
                      <MahjongTile :tile="tile" :size="22" />
                      <span v-if="tile.isWild" class="hu-wild-label">百搭</span>
                    </div>
                    <span class="hu-group-type">{{ group.type === 'sequence' ? '顺' : group.type === 'triplet' ? '刻' : group.type === 'pair' ? '对' : '' }}</span>
                  </div>
                </div>
                <div class="hu-combo-details" v-if="opt.details && opt.details.length">
                  <span v-for="(d, di) in opt.details" :key="di" class="hu-detail">{{ d }}</span>
                </div>
              </div>
            </div>
            <div class="hu-panel-actions">
              <button class="hu-confirm-btn" @click="onConfirmHu(selectedHuCombo ?? 0)" :disabled="selectedHuCombo === null">
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
            <button v-if="isDrawOverlay" class="mahjong-button primary overlay-button" @click="startNextRound">
              下一局
            </button>
            <button v-else class="mahjong-button primary overlay-button" @click="backToLobby">
              退出到大厅
            </button>
          </div>
        </div>

        <!-- 等待房间 -->
        <div v-if="isWaitingRoom" class="waiting-overlay">
          <div class="waiting-card">
            <h2 class="waiting-title">🀄 长清阁麻将</h2>
            <p class="waiting-subtitle">房间 #{{ roomId }}</p>

            <div class="waiting-players">
              <div
                v-for="slot in 4"
                :key="slot"
                class="waiting-slot"
                :class="{ 'waiting-slot--filled': waitingPlayers[slot - 1], 'waiting-slot--dealer': waitingPlayers[slot - 1]?.isDealer }"
              >
                <template v-if="waitingPlayers[slot - 1]">
                  <span class="waiting-avatar">{{ waitingPlayers[slot - 1].isBot ? '🤖' : '🀄' }}</span>
                  <span class="waiting-name">{{ waitingPlayers[slot - 1].name }}</span>
                  <span v-if="waitingPlayers[slot - 1].isDealer" class="waiting-dealer-badge">庄</span>
                </template>
                <template v-else>
                  <span class="waiting-avatar waiting-avatar--empty">👤</span>
                  <span class="waiting-name waiting-name--empty">虚位以待</span>
                </template>
              </div>
            </div>

            <div class="waiting-status">
              <div class="waiting-spinner"></div>
              <p>等待 <strong>{{ 4 - waitingPlayers.length }}</strong> 名玩家加入</p>
            </div>

            <div v-if="isDealerUser && waitingPlayers.length >= 2" class="waiting-actions">
              <button class="mahjong-button primary waiting-start-btn" @click="onStartGame">
                🎲 开始游戏（{{ waitingPlayers.length }}/4 人）
              </button>
              <p class="waiting-hint">人数不足时可带电脑玩家开局</p>
            </div>
            <div v-else-if="!isDealerUser" class="waiting-actions">
              <p class="waiting-hint">等待庄家 {{ dealerName }} 开始游戏...</p>
            </div>

            <button class="mahjong-button secondary waiting-leave-btn" @click="backToLobby">
              退出房间
            </button>
          </div>
        </div>

        <!-- 结算面板 -->
        <div v-if="showSettlement" class="settle-overlay">
          <div class="settle-panel">
            <h2 class="settle-title-center">最终战绩</h2>

            <div class="settle-details">
              <!-- 列名表头 -->
              <div class="settle-detail-header">
                <span class="settle-detail-name"></span>
                <span class="settle-detail-stat">总输赢</span>
                <span class="settle-detail-stat settle-detail-stat--record">有效输赢</span>
                <span class="settle-detail-stat">🤖 vs AI</span>
                <span class="settle-detail-stat">🀄 自摸</span>
                <span class="settle-detail-stat">🎯 捉冲</span>
                <span class="settle-detail-stat settle-detail-stat--win">最大赢</span>
                <span class="settle-detail-stat settle-detail-stat--loss">最大输</span>
              </div>
              <div class="settle-detail-grid">
                <template v-for="p in (settlementData?.playerStats || [])" :key="p.id + '-detail'">
                  <div class="settle-detail-row">
                    <span class="settle-detail-name">{{ p.name }}</span>
                    <span class="settle-detail-stat" title="总输赢">
                      {{ (p.totalScore ?? 0) > 0 ? '+' : '' }}{{ p.totalScore ?? 0 }}
                    </span>
                    <span class="settle-detail-stat settle-detail-stat--record" title="有效输赢">{{ p.effectiveScore ?? p.totalScore ?? 0 }}</span>
                    <span class="settle-detail-stat" title="与AI战绩">{{ p.vsAiScore ?? 0 }}</span>
                    <span class="settle-detail-stat">{{ p.selfDraws ?? 0 }}</span>
                    <span class="settle-detail-stat">{{ p.discards ?? 0 }}</span>
                    <span class="settle-detail-stat settle-detail-stat--win">+{{ p.maxWin ?? 0 }}</span>
                    <span class="settle-detail-stat settle-detail-stat--loss">{{ p.maxLoss ?? 0 }}</span>
                  </div>
                </template>
              </div>
            </div>

            <div class="settle-actions">
              <button class="settle-back-btn" @click="showSettlement = false">
                ← 返回牌桌
              </button>
              <button class="settle-save-btn" @click="onSaveSettle">
                💾 结算保存，下回再战
              </button>
            </div>
          </div>
        </div>

        <!-- 设置面板 -->
        <Transition name="settings-slide">
          <div v-if="showSettings" class="settings-overlay" @click.self="showSettings = false">
            <div class="settings-panel">
              <div class="settings-header">
                <h2 class="settings-title">⚙️ 游戏设置</h2>
                <button class="settings-close" @click="showSettings = false">✕</button>
              </div>
              <div class="settings-body">
                <!-- 音效开关 -->
                <div class="settings-item">
                  <div class="settings-item-label">
                    <span class="settings-icon">🔊</span>
                    <span>音效</span>
                  </div>
                  <label class="toggle-switch">
                    <input type="checkbox" :checked="soundEnabled" @change="toggleSound" />
                    <span class="toggle-slider"></span>
                  </label>
                </div>
                <!-- 出牌提示 -->
                <div class="settings-item">
                  <div class="settings-item-label">
                    <span class="settings-icon">💡</span>
                    <span>出牌提示</span>
                  </div>
                  <label class="toggle-switch">
                    <input type="checkbox" v-model="showHintEnabled" />
                    <span class="toggle-slider"></span>
                  </label>
                </div>
                <!-- 牌面动画 -->
                <div class="settings-item">
                  <div class="settings-item-label">
                    <span class="settings-icon">✨</span>
                    <span>牌面动画</span>
                  </div>
                  <label class="toggle-switch">
                    <input type="checkbox" v-model="tileAnimationEnabled" />
                    <span class="toggle-slider"></span>
                  </label>
                </div>
                <!-- 操作音效 -->
                <div class="settings-item">
                  <div class="settings-item-label">
                    <span class="settings-icon">🎵</span>
                    <span>操作音效</span>
                  </div>
                  <label class="toggle-switch">
                    <input type="checkbox" v-model="actionSoundEnabled" />
                    <span class="toggle-slider"></span>
                  </label>
                </div>
                <!-- 倒计时警告 -->
                <div class="settings-item">
                  <div class="settings-item-label">
                    <span class="settings-icon">⏱</span>
                    <span>倒计时警告</span>
                  </div>
                  <label class="toggle-switch">
                    <input type="checkbox" v-model="timerWarningEnabled" />
                    <span class="toggle-slider"></span>
                  </label>
                </div>
                <div class="settings-divider"></div>
                <div class="settings-item settings-item--info">
                  <span class="settings-icon">ℹ️</span>
                  <span>长清阁麻将 v2.2</span>
                </div>
              </div>
            </div>
          </div>
        </Transition>

        <!-- Big responsive table -->
        <div class="table-wrapper">
          <div class="mahjong-table">
            <!-- 绿色桌布内层 -->
            <div class="table-felt">
            <!-- 左上角: 轮次信息 -->
            <!-- 十字定位标志 -->
            <div class="cross-marker">
              <div class="cross-h"></div>
              <div class="cross-v"></div>
            </div>
            <!-- 中心金色圆环 -->
            <div class="center-glow"></div>
            <!-- 四方位标注 -->
            <span class="compass compass--n">北</span>
            <span class="compass compass--s">南</span>
            <span class="compass compass--w">西</span>
            <span class="compass compass--e">东</span>
            <!-- 状态消息（非中心显示） -->
            <div class="turn-indicator">
              <span v-if="thinkFreezeActive" class="think-freeze-indicator">
                🧠 {{ thinkFreezePlayerName }} 在思考中... {{ thinkFreezeCountdown }}s
              </span>
              <span v-else-if="isWinner" class="turn-win">🎉 你赢了！</span>
              <span v-if="isWinner && gameState?.phase === 'playing'" class="spectator-bar">
                <span class="spectator-label">👁 观战：</span>
                <button
                  v-for="p in spectatablePlayers"
                  :key="p.id"
                  class="spectator-chip"
                  :class="{ 'spectator-chip--active': viewingPlayerId === p.id }"
                  @click="setSpectateTarget(p.id)"
                >{{ p.name }}</button>
              </span>
              <span v-else-if="isAIControlled" class="turn-ai">🤖 AI托管中</span>
              <span v-else-if="showMobileActionNotice" class="turn-action">有可用操作</span>
              <span v-else>{{ turnMessage }}</span>
              <span v-if="turnTimerActive && !isWinner && !isAIControlled" class="turn-timer" :class="{ 'turn-timer--urgent': turnTimer <= 10 }">
                ⏱ {{ turnTimer }}s
              </span>
            </div>

            <!-- 桌面中心: 弃牌池 + 牌墙 + 倍数 -->
            <TableCenter
              :remaining-tiles="remainingTileCount"
              :status-message="showMobileActionNotice ? '有可用操作 — 请向下滚动查看按钮' : turnMessage"
              hint-message="点击选牌，再次点击出牌。操作按钮将根据规则自动显示。"
              :is-winner="isWinner"
              :round-multiplier="roundMultiplier"
              :global-multiplier="globalMultiplier"
              :wild-tile="wildTile"
            />

            <!-- 牌墙（四面）：对家和自家的牌墙需要 TileWall -->
            <TileWall :remaining="remainingTileCount" />

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
                :name="topPlayer?.name || '北家'"
                position="top"
                :hand="northHand"
                :melds="northMelds"
                :is-winner="northIsWinner"
                :reveal-hand="shouldRevealOpponents"
                :is-bot="isBotPlayer(topPlayer)"
                :seat-position="topPlayer?.position"
                @name-click="onPlayerNameClick(topPlayer)"
              />
            </div>

            <!-- Left player -->
            <div class="seat seat-left" :class="{ 'seat-active': activePosition !== null && leftPlayer?.position === activePosition }">
              <PlayerOtherArea
                :name="leftPlayer?.name || '西家'"
                position="left"
                :hand="westHand"
                :melds="westMelds"
                :is-winner="westIsWinner"
                :reveal-hand="shouldRevealOpponents"
                :is-bot="isBotPlayer(leftPlayer)"
                :seat-position="leftPlayer?.position"
                @name-click="onPlayerNameClick(leftPlayer)"
              />
            </div>

            <!-- Right player -->
            <div class="seat seat-right" :class="{ 'seat-active': activePosition !== null && rightPlayer?.position === activePosition }">
              <PlayerOtherArea
                :name="rightPlayer?.name || '东家'"
                position="right"
                :hand="eastHand"
                :melds="eastMelds"
                :is-winner="eastIsWinner"
                :reveal-hand="shouldRevealOpponents"
                :is-bot="isBotPlayer(rightPlayer)"
                :seat-position="rightPlayer?.position"
                @name-click="onPlayerNameClick(rightPlayer)"
              />
            </div>

            <!-- Bottom (self) player -->
            <div class="seat seat-bottom" :class="{ 'seat-active': activePosition !== null && currentPlayer?.position === activePosition }">
              <div class="self-area-with-actions">
                <PlayerSelfArea
                  name="我"
                  :hand="playerHand"
                  :melds="playerMelds"
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
                    class="inline-action-btn inline-action-btn--chow"
                    :disabled="isInteractionLocked"
                    @click="onChow"
                  >吃</button>
                  <button
                    v-if="showPeng"
                    class="inline-action-btn inline-action-btn--peng"
                    :disabled="isInteractionLocked"
                    @click="onPeng"
                  >碰</button>
                  <button
                    v-if="showKong || showConcealedKong || showExtendedKong"
                    class="inline-action-btn inline-action-btn--kong"
                    :disabled="isInteractionLocked"
                    @click="handleCircularAction('kong')"
                  >杠</button>
                  <button
                    v-if="showHu"
                    class="inline-action-btn inline-action-btn--hu"
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
                    v-if="showThink"
                    class="inline-action-btn inline-action-btn--think"
                    :class="{ 'inline-action-btn--think-depleted': !canUseThink, 'inline-action-btn--frozen': thinkFreezeActive }"
                    :disabled="isInteractionLocked || !canUseThink || thinkFreezeActive"
                    @click="onThinkPopup"
                  >慢{{ thinkRemaining > 0 ? thinkRemaining : '' }}</button>
                  <button
                    v-if="canLiangShan"
                    class="inline-action-btn inline-action-btn--liangshan"
                    :class="{ 'inline-action-btn--liangshan-voted': hasVotedLiangShan, 'inline-action-btn--frozen': thinkFreezeActive }"
                    :disabled="!canLiangShan || isInteractionLocked || hasVotedLiangShan || thinkFreezeActive"
                    @click="onLiangShan"
                  >🔥{{ hasVotedLiangShan ? '已聚义' : '梁山聚义' }}</button>
                  <div v-if="!showDraw && !showChow && !showPeng && !showKong && !showHu && !showConcealedKong && !showExtendedKong && !showRebel && !showThink && !canLiangShan" class="inline-action-waiting">
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
          <div class="room-header-row panel-room-header-row">
            <p class="mahjong-subtitle panel-room-number">
              房间 #{{ gameState?.roomNumber || roomId }}
            </p>
            <button
              v-if="gameState?.phase === 'playing' || gameState?.phase === 'ended'"
              class="settle-btn-header"
              @click="onRequestSettle"
            >
              📊 退房结算
            </button>
          </div>

          <!-- 战绩统计 -->
          <RoomStats
            :players="statsPlayers"
            :current-round="currentRound"
            :spectating-id="spectatingId"
            @spectate="handleSpectate"
          />

          <!-- 牌局快讯 -->
          <GameBroadcast :messages="broadcastMessages" />



          <!-- 房间控制 / 管理面板 -->
          <div class="ext-section" v-if="canStartGame">
            <h3 class="ext-title">房间控制</h3>
            <button class="mahjong-button panel-button" @click="onStartGame" :disabled="isInteractionLocked">
              🎲 掷骰子开局 ({{ gameState?.players.length }}/4)
            </button>
          </div>

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

          <!-- 操作按钮区：与战绩榜同宽，底部对齐牌桌 -->
          <div class="action-buttons-panel">
              <CircularActionButtons
                :available-actions="availableActions"
                :is-connected="isConnected"
                :is-interaction-locked="isInteractionLocked"
                :last-state-change-at="lastStateChangeAt"
                :now-ts="nowTs"
                :highlight-delay-ms="ACTION_HIGHLIGHT_DELAY_MS"
                :freeze-until="currentFreezeUntil"
                :freeze-duration-ms="freezeDurationMs"
                @action="handleCircularAction"
              />
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
            <div class="double-reminder-msg">本局已经翻倍了！</div>
          </div>
        </Transition>
      </Teleport>

      <!-- 玩家操作卡片（AI + 自己） -->
      <Teleport to="body">
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
                <button class="ai-card-btn ai-card-btn--leave" @click="onAILeave">
                  🚪 出局
                  <span class="ai-card-hint">下局移除该AI</span>
                </button>
                <button v-if="isSpectator" class="ai-card-btn ai-card-btn--replace" @click="onAIReplace">
                  🙋 换我上
                  <span class="ai-card-hint">下局由你接替</span>
                </button>
              </template>
              <!-- 其他真人玩家的操作（输家换位置） -->
              <template v-else-if="canSwap && playerCardPlayer?.id !== currentPlayer?.id">
                <button class="ai-card-btn ai-card-btn--swap" @click="onSwapPosition">
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
</div></template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch, provide } from 'vue'

// 游戏室高度交互，不需要SSR（避免TileSuit等enum在SSR时解析失败）
definePageMeta({ ssr: false })
import PlayerSelfArea from '~/components/PlayerSelfArea.vue'
import PlayerOtherArea from '~/components/PlayerOtherArea.vue'
import CircularActionButtons from '~/components/CircularActionButtons.vue'
import TableCenter from '~/components/TableCenter.vue'
import TileWall from '~/components/TileWall.vue'
import DiceAnimation from '~/components/DiceAnimation.vue'
import PlayerInfo from '~/components/PlayerInfo.vue'
import RoomStats from '~/components/RoomStats.vue'
import GameBroadcast from '~/components/GameBroadcast.vue'
import DiscardZone from '~/components/DiscardZone.vue'
import { useGame, ACTION_HIGHLIGHT_DELAY_MS } from '~/composables/useGame'
import { useSound } from '~/composables/useSound'
import { ActionType, GamePhase, GameEndReason, type Tile, type Meld, type Player } from '~/types/game'

const route = useRoute()
const userName = useCookie('user_name')
const roomId = computed(() => String(route.params.roomId || ''))
const playerId = computed(() => String(route.query.playerId || ''))

const { 
  gameState, 
  currentPlayer, 
  availableActions, 
  isConnected, 
  error, 
  connect, 
  disconnect, 
  executeAction,
  startGame,
  refreshState,
  forceRefreshState,
  roomDismissedReason,
  lastStateChangeAt,
  leadingBrotherEvent,
  actionApprovalEvent
} = useGame()

const backToLobby = () => navigateTo('/')
const { play: playSound, isEnabled: soundEnabled, setEnabled: setSoundEnabled } = useSound()

const toggleSound = () => {
  setSoundEnabled(!soundEnabled.value)
}
// Admin/Debug — 目前禁用 (isAdminUser=false)
const isAdminUser = computed(() => false)
const showAllCards = ref(false)
const shouldRevealOpponents = computed(() => false)
const isMobilePortrait = ref(false)
const shouldRotateView = computed(() => isMobilePortrait.value)
const nowTs = ref(Date.now())
let actionWindowTimer: ReturnType<typeof setInterval> | null = null

// ===== 出牌倒计时 & AI托管 =====
const TURN_TIMEOUT_SEC = 60
const CONSECUTIVE_AUTO_THRESHOLD = 2 // 连续自动操作N次后AI接管
const turnTimer = ref(TURN_TIMEOUT_SEC)
const turnTimerActive = ref(false)
let turnTimerInterval: ReturnType<typeof setInterval> | null = null
let lastWarnAt = 0
let consecutiveAutoCount = 0   // 连续自动操作次数
const isAIControlled = ref(false) // 是否被AI接管
const showSettings = ref(false) // 显示设置面板

// 游戏设置
const showHintEnabled = ref(true)       // 出牌提示
const tileAnimationEnabled = ref(true)   // 牌面动画
const actionSoundEnabled = ref(true)    // 操作音效
const timerWarningEnabled = ref(true)   // 倒计时警告音

const startTurnTimer = () => {
  stopTurnTimer()
  // AI接管期间不启动人类计时器
  if (isAIControlled.value) return
  turnTimer.value = TURN_TIMEOUT_SEC
  turnTimerActive.value = true
  lastWarnAt = 0
  turnTimerInterval = setInterval(() => {
    turnTimer.value--
    // 10秒警告音效
    if (turnTimer.value === 10 && lastWarnAt !== 10) {
      playSound('timer-warn')
      lastWarnAt = 10
    }
    if (turnTimer.value <= 0) {
      stopTurnTimer()
      handleAutoAction()
    }
  }, 1000)
}

const stopTurnTimer = () => {
  turnTimerActive.value = false
  if (turnTimerInterval) {
    clearInterval(turnTimerInterval)
    turnTimerInterval = null
  }
}

// 玩家主动操作时重置连续计数
const resetAutoCount = () => {
  consecutiveAutoCount = 0
}

// 超时自动操作
const handleAutoAction = () => {
  consecutiveAutoCount++

  // 1. 轮到摸牌 → 自动摸
  if (showDraw.value) {
    playSound('tile-draw')
    executeAction(ActionType.DRAW)
  }
  // 2. 有优先操作（吃/碰/杠/胡）→ 自动过
  else if (showPass.value) {
    onPass()
  }
  // 3. 有摸到的牌但没出 → 自动打出摸到的牌
  else if (currentPlayer.value?.hand?.concealedTiles?.length) {
    const lastTile = currentPlayer.value.hand.concealedTiles.at(-1)
    if (lastTile) {
      playSound('tile-discard')
      executeAction(ActionType.DISCARD, lastTile.id)
    }
  }

  // 检查是否达到连续阈值 → AI托管
  if (consecutiveAutoCount >= CONSECUTIVE_AUTO_THRESHOLD) {
    isAIControlled.value = true
    consecutiveAutoCount = 0
    // 通知服务器开启AI托管
    useFetch('/api/game/bot-mode', {
      method: 'POST',
      body: { gameId: roomId.value, playerId: playerId.value, enabled: true }
    }).catch(console.error)
  }
}

// 玩家回来：点击"我回来了"恢复控制
const onPlayerBack = () => {
  isAIControlled.value = false
  consecutiveAutoCount = 0
  // 通知服务器关闭AI托管
  useFetch('/api/game/bot-mode', {
    method: 'POST',
    body: { gameId: roomId.value, playerId: playerId.value, enabled: false }
  }).catch(console.error)
  // 恢复后重新启动计时
  if (isMyTurn.value || hasPriorityActions.value) {
    startTurnTimer()
  }
}

const isMyTurn = computed(() => currentTurnPlayer.value?.id === currentPlayer.value?.id)

// 骰子动画状态
const showDiceOverlay = ref(false)

// 阶段变化时自动显示骰子动画（所有客户端）
// 庄家：STARTING 广播 → isWaitingRoom=false + showDice → 进入骰子动画
// 非庄家：STARTING 广播 → isWaitingRoom=false + showDice → 进入骰子动画
watch(() => gameState.value?.phase, (newPhase, oldPhase) => {
  if (newPhase === 'starting' && oldPhase === 'waiting') {
    console.log('[phase-watcher] Game starting, showing dice for all clients')
    showDiceOverlay.value = true
  }
})
const diceValues = ref<[number, number]>([1, 1])
const maxDiceRolls = computed(() => {
  if (!gameState.value) return 2
  return Number((gameState.value as any).diceRollCount) || Number((route.query as any).dice) || 2
})
// 如果本局已因造反/流局/聚义翻倍（inheritedGlobalMultiplier>=2），强制只掷一次骰子
const isDoubleRound = computed(() => {
  const igm = (gameState.value as any)?.inheritedGlobalMultiplier
  return typeof igm === 'number' && igm >= 2
})
const effectiveMaxRolls = computed(() => isDoubleRound.value ? 1 : maxDiceRolls.value)
const showDoubleReminder = ref(false)
// 决策犹豫期（毫秒），优先从游戏状态读取，兜底5秒
const freezeDurationMs = computed(() => {
  const hw = (gameState.value as any)?.hesitationWindow
  return typeof hw === 'number' && hw > 0 ? hw : 5000
})

// 当前决策犹豫期截止时间（从游戏状态读取）
const currentFreezeUntil = computed(() => {
  const fu = (gameState.value as any)?._freezeUntil
  return typeof fu === 'number' && fu > Date.now() ? fu : 0
})

// 决策犹豫期结束后主动刷新（避免debounce导致客户端错过auto-draw）
let freezeRefreshTimer: ReturnType<typeof setTimeout> | null = null
watch(currentFreezeUntil, (until) => {
  if (freezeRefreshTimer) { clearTimeout(freezeRefreshTimer); freezeRefreshTimer = null }
  if (until > 0) {
    const delay = until - Date.now() + 100 // 决策犹豫期结束后100ms刷新
    freezeRefreshTimer = setTimeout(() => {
      refreshState()
    }, Math.max(delay, 0))
  }
})

const onRerollDice = () => {
  // 翻倍局不允许重掷骰子
  if (isDoubleRound.value) {
    showDoubleReminder.value = true
    setTimeout(() => { showDoubleReminder.value = false }, 200)
    return
  }
  diceValues.value = [
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1
  ]
}
const dealerName = computed(() => {
  if (!gameState.value) return ''
  const dealer = gameState.value.players.find(p => p.isDealer)
  return dealer?.name || '庄家'
})

watch(isAdminUser, (next) => {
  if (!next && showAllCards.value) {
    showAllCards.value = false
  }
})

const evaluateViewport = () => {
  if (!process.client) {
    return
  }

  const { innerWidth: width, innerHeight: height } = window
  const smallestSide = Math.min(width, height)
  const isPortrait = height >= width
  isMobilePortrait.value = isPortrait && smallestSide <= 768
}

const toggleShowAllCards = () => {
  if (!isAdminUser.value) return
  showAllCards.value = !showAllCards.value
}

onMounted(async () => {
  if (roomId.value && playerId.value) {
    await connect(roomId.value, playerId.value)
    // 等待房间会自动显示（isWaitingRoom computed），不需要自动弹骰子
    // 庄家在等待房间点击"开始游戏"才会弹出骰子
  }

  if (process.client) {
    evaluateViewport()
    window.addEventListener('resize', evaluateViewport)
    window.addEventListener('orientationchange', evaluateViewport)
    // 接收服务端广播的牌局快讯
    window.addEventListener('mahjong-broadcast', ((e: CustomEvent) => {
      const d = e.detail
      addBroadcast(d.text, d.type as BroadcastMsg['type'])
    }) as EventListener)
    actionWindowTimer = setInterval(() => {
      nowTs.value = Date.now()
    }, 250)
  }
})

onUnmounted(() => {
  disconnect()

  if (process.client) {
    window.removeEventListener('resize', evaluateViewport)
    window.removeEventListener('orientationchange', evaluateViewport)
    if (actionWindowTimer) {
      clearInterval(actionWindowTimer)
      actionWindowTimer = null
    }
    stopTurnTimer()
  }
})

// ---- Computed Players ----
const getPlayerByRelativePos = (offset: number) => {
  if (!gameState.value || !currentPlayer.value) return null
  const selfPos = currentPlayer.value.position
  const targetPos = (selfPos + offset) % 4
  return gameState.value.players.find(p => p.position === targetPos)
}

const rightPlayer = computed(() => getPlayerByRelativePos(1))
const topPlayer = computed(() => getPlayerByRelativePos(2))
const leftPlayer = computed(() => getPlayerByRelativePos(3))

// ---- Latest Discard ID per Player ----
// 全局最后一张弃牌（所有玩家中打出的最新一张）
const globalLatestDiscardId = computed(() => {
  const allDiscards = gameState.value?.discardPile || []
  return allDiscards.length > 0 ? allDiscards[allDiscards.length - 1]?.id : null
})

const selfLatestDiscardId = computed(() => globalLatestDiscardId.value)
const northLatestDiscardId = computed(() => globalLatestDiscardId.value)
const westLatestDiscardId = computed(() => globalLatestDiscardId.value)
const eastLatestDiscardId = computed(() => globalLatestDiscardId.value)
const playerHand = computed(() => currentPlayer.value?.hand.concealedTiles || [])
const playerMelds = computed(() => currentPlayer.value?.hand.exposedMelds || [])
const playerDiscards = computed(() => currentPlayer.value?.hand.discardedTiles || [])
const isWinner = computed(() => currentPlayer.value?.status === 'won')

// 胜者观战模式
const viewingPlayerId = ref<string | null>(null)
const spectatablePlayers = computed(() => {
  if (!gameState.value || !isWinner.value) return []
  return gameState.value.players.filter(p =>
    p.id !== currentPlayer.value?.id &&
    (p.status === 'playing' || p.status === 'won')
  )
})
const setSpectateTarget = async (targetId: string) => {
  if (!gameState.value || !currentPlayer.value) return
  viewingPlayerId.value = targetId
  try {
    await $fetch('/api/game/spectate', {
      method: 'POST',
      body: {
        gameId: gameState.value.gameId,
        playerId: currentPlayer.value.id,
        viewingPlayerId: targetId
      }
    })
  } catch (err) {
    console.error('Spectate failed:', err)
  }
}



// ---- Table Center Data ----
const remainingTileCount = computed(() => {
  const g = gameState.value as any
  if (!g) return 0
  // 支持两种格式：wallRemaining（直接数字）或 wall（数组）
  if (typeof g.wallRemaining === 'number') return g.wallRemaining
  if (typeof g.wallCount === 'number') return g.wallCount
  if (Array.isArray(g.wall)) return g.wall.length
  return 0
})
const currentRound = computed(() => gameState.value?.currentRound ?? 1)
// Provide round number for MahjongTile to auto-select back scheme
provide('roundNumber', currentRound)
const roundMultiplier = computed(() => gameState.value?.roundMultiplier ?? 1)

// 圈方位 & 局数（用于显示"第1圈 东二局"格式）
const windNames = ['东', '南', '西', '北']
const roundCircle = computed(() => Math.floor((currentRound.value - 1) / 4) + 1)
const prevailingWind = computed(() => {
  // 每4局换一次方位：1-4局=东，5-8局=南，9-12局=西，13-16局=北
  return windNames[Math.floor((currentRound.value - 1) / 4) % 4]
})
const roundPosition = computed(() => ((currentRound.value - 1) % 4) + 1)
const roundDisplay = computed(() => `第${roundCircle.value}圈 ${prevailingWind.value}${roundPosition.value}局`)
const globalMultiplier = computed(() => gameState.value?.globalMultiplier ?? 1)
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
const spectatingId = ref<string | null>(null)
const positionColors = ['east', 'south', 'west', 'north']
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
  return gameState.value.players.map((p, i) => {
    const alert = (gameState.value as any).qjAlerts?.find((a: any) => a.playerId === p.id)
    const qjScore = alert?.score || 0
    const cumulative = roomCumulative.value[p.id] || { wins: 0, losses: 0, lastStatus: 'none' }
    return {
      id: p.id,
      name: p.name,
      score: p.score || 0,
      wins: p.status === 'won' ? 1 : 0,
      losses: p.status === 'lost' ? 1 : 0,
      color: positionColors[p.position] || 'south',
      isMe: p.id === currentPlayer.value?.id,
      isQJCrossed: qjAlertIds.has(p.id),
      qjScore,
      qjGlow: qjScore > qjThreshold * 3,
      bestRound: null as number | null,
      totalWins: cumulative.wins,
      totalLosses: cumulative.losses,
      lastRoundStatus: cumulative.lastStatus,
    }
  })
})

const handleSpectate = (id: string) => {
  spectatingId.value = spectatingId.value === id ? null : id
}
const isDealer = computed(() => currentPlayer.value?.isDealer)
const isDealerUser = computed(() => isDealer.value)
const isGameEnded = computed(() => gameState.value?.phase === GamePhase.ENDED)

// 等待房间状态
const isWaitingRoom = computed(() => {
  if (!gameState.value) return false
  const phase = gameState.value.phase
  // 只在 waiting 阶段显示等待房间
  if (phase !== 'waiting') return false
  // 如果正在启动游戏（点了创建新局），不显示等待房间
  if (isGameStarting.value) return false
  // 如果牌已发（有人有手牌），说明正在发牌中，不显示等待房间
  const hasDealtCards = (gameState.value.players || []).some(
    (p: any) => (p.hand?.concealedTiles?.length || 0) > 0
  )
  // 如果骰子overlay正在显示，也不要显示等待房间
  if (showDiceOverlay.value) return false
  return !hasDealtCards
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
const isOverlayVisible = computed(() => isGameEnded.value || !!roomDismissedReason.value)
const overlayTitle = computed(() => {
  if (roomDismissedReason.value === GameEndReason.OWNER_LEFT) {
    return '房间已关闭'
  }
  if (overlayReason.value === GameEndReason.WALL_EXHAUSTED) {
    return '🀄 流局'
  }
  return '游戏结束'
})
const overlayMessage = computed(() => {
  const reason = overlayReason.value
  switch (reason) {
    case GameEndReason.WALL_EXHAUSTED: {
      const nextMul = (gameState.value as any)?.inheritedGlobalMultiplier ?? gameState.value?.globalMultiplier ?? 1
      return `下局倍数 ×${nextMul}`
    }
    case GameEndReason.LAST_PLAYER:
      return '只剩一名玩家，本轮结束。'
    case GameEndReason.OWNER_LEFT:
      return '房主已离开房间，游戏已解散。'
    case GameEndReason.EMPTY_ROOM:
      return '所有玩家已离开，游戏结束。'
    default:
      return '本轮已结束，请退出到大厅。'
  }
})

const isDrawOverlay = computed(() => overlayReason.value === GameEndReason.WALL_EXHAUSTED)

const startNextRound = async () => { 
  showSettlement.value = false;
  try {
    await startGame({ freezeDurationMs: freezeDurationMs.value });
    await forceRefreshState();
    console.log('[startNextRound] Game restarted, phase:', gameState.value?.phase);
  } catch (e) {
    console.error('[startNextRound] Failed:', e);
  }
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
const canStartGame = computed(() => {
  // Debug log to see why button might not show
  console.log('canStartGame check:', {
    isDealer: isDealer.value,
    phase: gameState.value?.phase,
    playerCount: gameState.value?.players.length
  })
  
  return isDealer.value && 
         gameState.value?.phase === 'waiting' && 
         (gameState.value?.players.length || 0) >= 2
})

// ---- Other Players State ----
const northHand = computed(() => topPlayer.value?.hand.concealedTiles || []) // Will be empty/hidden by backend usually
const northMelds = computed(() => topPlayer.value?.hand.exposedMelds || [])
const northDiscards = computed(() => topPlayer.value?.hand.discardedTiles || [])
const northIsWinner = computed(() => topPlayer.value?.status === 'won')

const activePosition = computed(() => gameState.value?.currentPlayerIndex ?? null)
const currentTurnPlayer = computed(() => {
  if (!gameState.value || activePosition.value === null) return null
  return gameState.value.players[activePosition.value] || null
})

const turnMessage = computed(() => {
  if (!gameState.value) {
    return '正在加载房间…'
  }

  const phase = gameState.value.phase
  // 如果牌已发（有人有手牌），即使 phase 还没更新也按 playing 处理
  const hasDealtCards = (gameState.value.players || []).some(
    (p: any) => (p.hand?.concealedTiles?.length || 0) > 0
  )

  if (phase === 'waiting' && !hasDealtCards) {
    return '等待玩家加入开始'
  }

  if (phase === 'waiting' && hasDealtCards) {
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

const westHand = computed(() => leftPlayer.value?.hand.concealedTiles || [])
const westMelds = computed(() => leftPlayer.value?.hand.exposedMelds || [])
const westDiscards = computed(() => leftPlayer.value?.hand.discardedTiles || [])
const westIsWinner = computed(() => leftPlayer.value?.status === 'won')

const eastHand = computed(() => rightPlayer.value?.hand.concealedTiles || [])
const eastMelds = computed(() => rightPlayer.value?.hand.exposedMelds || [])
const eastDiscards = computed(() => rightPlayer.value?.hand.discardedTiles || [])
const eastIsWinner = computed(() => rightPlayer.value?.status === 'won')

// ---- Interaction ----
const selectedTileId = ref<string | null>(null)
const claimableDiscardTileId = ref<string | null>(null)

// ===== 出牌 =====
const commitDiscard = (tile: Tile) => {
  resetAutoCount()
  playSound('tile-discard')
  executeAction(ActionType.DISCARD, tile.id)
  selectedTileId.value = null
}

// 拖拽超出阈值 → 直接出牌
const handleTileDiscard = (tile: Tile) => {
  if (isWinner.value || isInteractionLocked.value) return
  const canDiscard = availableActions.value.includes(ActionType.DISCARD)
  if (!canDiscard) return
  commitDiscard(tile)
}

// ===== 双击出牌 =====
const handleTileDblclick = (tile: Tile) => {
  if (isWinner.value || isInteractionLocked.value) return
  const canDiscard = availableActions.value.includes(ActionType.DISCARD)
  if (!canDiscard) return
  commitDiscard(tile)
}

const handleTileClick = (tile: Tile) => {
  if (isWinner.value || isInteractionLocked.value) return
  
  // 如果需要摸牌（showDraw为true），禁止点击手牌出牌
  if (showDraw.value) {
    return
  }
  
  // If it's our turn and we can discard
  const canDiscard = availableActions.value.includes(ActionType.DISCARD)
  
  if (selectedTileId.value === tile.id) {
    if (canDiscard) {
      // 二次点击 → 直接出牌
      commitDiscard(tile)
    }
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

const showDraw = computed(() => availableActions.value.includes(ActionType.DRAW))
const showChow = computed(() => availableActions.value.includes(ActionType.CHOW))
const showPeng = computed(() => availableActions.value.includes(ActionType.PENG))
const showKong = computed(() => availableActions.value.includes(ActionType.KONG))
const showHu = computed(() => availableActions.value.includes(ActionType.HU))
const showPass = computed(() => availableActions.value.includes(ActionType.PASS))
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
const fetchWinOptions = async () => {
  try {
    const res = await $fetch<any>('/api/game/win-options', {
      query: { gameId: roomId.value, playerId: currentPlayer.value?.id }
    })
    // 合并后端分数和前端牌面排列
    const options = res.winOptions || []
    const hand = playerHand.value || []
    const melds = playerMelds.value || []
    const combos = arrangeWinningHand(hand, melds)
    // 给每个选项附加牌面组合
    for (let i = 0; i < options.length && i < combos.length; i++) {
      options[i].tileGroups = combos[i % combos.length]?.groups || []
    }
    // 如果选项多于组合，复用第一个组合
    for (let i = combos.length; i < options.length; i++) {
      options[i].tileGroups = combos[0]?.groups || []
    }
    winOptions.value = options
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
  await fetchWinOptions()
  showHuPanel.value = true
  selectedHuCombo.value = 0
}
const onConfirmHu = (index: number) => {
  resetAutoCount()
  playSound('tile-hu')
  showHuPanel.value = false
  executeAction(ActionType.HU)
}
const onCancelHu = () => {
  showHuPanel.value = false
  selectedHuCombo.value = null
}

// ===== 审批流程 =====
const isMyApprovalWaiting = computed(() => {
  if (!actionApprovalEvent.value) return false
  const myPending = myPendingAction.value
  if (!myPending) return false
  return actionApprovalEvent.value.candidatePlayerId !== currentPlayer.value?.id
})
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
  const totalMs = freezeDurationMs.value // 决策犹豫期
  const leftMs = Math.max(0, pending.expiresAt - Date.now())
  return Math.max(0, Math.min(1, leftMs / totalMs))
})

const canCheatHu = computed(
  () => isAdminUser.value && isMyTurn.value && gameState.value?.phase === GamePhase.PLAYING
)

const onDraw = () => { resetAutoCount(); playSound('tile-draw'); executeAction(ActionType.DRAW) }
const onChow = () => { resetAutoCount(); playSound('tile-chow'); executeAction(ActionType.CHOW) }
const onPeng = () => { resetAutoCount(); playSound('tile-pong'); executeAction(ActionType.PENG) }
const onKong = () => { resetAutoCount(); playSound('tile-kong'); executeAction(ActionType.KONG) }
const onPass = () => { resetAutoCount(); executeAction(ActionType.PASS) }
const onRebel = () => { resetAutoCount(); playSound('tile-rebel'); executeAction(ActionType.REBEL) }
const onThink = () => { resetAutoCount(); executeAction(ActionType.THINK) }
const onCheatHu = () => { resetAutoCount(); playSound('tile-hu'); executeAction(ActionType.CHEAT_HU) }

// 退房结算
const showSettlement = ref(false)
const settlementData = ref<any>(null)
const onRequestSettle = async () => {
  try {
    const res = await $fetch('/api/game/settle', {
      method: 'POST',
      body: {
        gameId: roomId.value,
        playerId: currentPlayer.value?.id,
        action: 'request'
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
        action: 'save'
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
const onPlayerNameClick = (player: any) => {
  if (!player) return
  // 允许点击自己、AI玩家、或（满足换位置条件时）其他真人玩家
  if (player.id !== currentPlayer.value?.id && !isBotPlayer(player) && !canSwap.value) return
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
  }
}

// For self-drawn Kong (Concealed or Extended)
const showConcealedKong = computed(() => availableActions.value.includes(ActionType.CONCEALED_KONG))
const showExtendedKong = computed(() => availableActions.value.includes(ActionType.EXTENDED_KONG))
const hasPriorityActions = computed(
  () =>
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

const myPendingAction = computed(() => {
  if (!gameState.value || !currentPlayer.value) return null
  return gameState.value.pendingActions.find(pa => pa.playerId === currentPlayer.value!.id) || null
})

const actionWindowText = computed(() => {
  if (!hasPriorityActions.value) return ''
  const pending = myPendingAction.value
  if (!pending?.expiresAt) return '响应窗口：1.0s（超时自动过）'
  const leftMs = Math.max(0, pending.expiresAt - nowTs.value)
  return `响应窗口：${(leftMs / 1000).toFixed(1)}s（超时自动过）`
})

const showMobileActionNotice = computed(() => shouldRotateView.value && hasPriorityActions.value)

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
      executeAction(ActionType.CONCEALED_KONG, undefined, group.map(t => t.id))
      return // Just do the first one for now
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
        executeAction(ActionType.EXTENDED_KONG, match.id)
        return
      }
    }
  }
}

// ---- 开局流程：掷骰子 → 发牌 ----
// 防重复点击标志
const isGameStarting = ref(false)

const onStartGame = async () => {
  if (isGameStarting.value) return
  isGameStarting.value = true
  if (gameState.value?.phase === GamePhase.PLAYING) {
    console.warn('[onStartGame] Game already in PLAYING phase, skipping')
    return
  }
  console.log('[onStartGame] Setting STARTING phase on server...')

  try {
    // 先通知服务器进入 STARTING 阶段（广播给所有客户端）
    await $fetch('/api/game/start', {
      method: 'POST',
      body: {
        gameId: roomId.value,
        playerId: playerId.value,
        phaseOnly: true
      }
    })
    // 服务器广播 STARTING 后，phase watcher 会自动显示骰子
    // 同时也立即显示（防止 watcher 延迟）
    diceValues.value = [
      Math.floor(Math.random() * 6) + 1,
      Math.floor(Math.random() * 6) + 1
    ]
    playSound('dice-roll')
    showDiceOverlay.value = false
    nextTick(() => {
      showDiceOverlay.value = true
    })
  } catch (err) {
    console.error('[onStartGame] Failed:', err)
  } finally {
    isGameStarting.value = false
  }
}

const onDealTiles = async () => {
  // 防止重复调用：只有当 overlay 可见时才处理
  if (!showDiceOverlay.value || isGameStarting.value) return
  isGameStarting.value = true
  showDiceOverlay.value = false
  // 等 DiceAnimation 的 Leave 动画完成（约 300ms）再正式开始
  await new Promise(resolve => setTimeout(resolve, 350))
  console.log('[onDealTiles] Calling startGame API...')
  try {
    await startGame({ freezeDurationMs: freezeDurationMs.value })
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
let broadcastId = 0
const addBroadcast = (text: string, type: BroadcastMsg['type'] = 'info') => {
  const now = Date.now()
  const d = new Date(now)
  const timeLabel = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  broadcastMessages.value.push({ id: ++broadcastId, text, type, timestamp: now, timeLabel })
  // 最多保留 20 条
  if (broadcastMessages.value.length > 20) {
    broadcastMessages.value = broadcastMessages.value.slice(-20)
  }
}

// 追踪上一轮游戏状态，检测变化生成广播
const prevWinnersCount = ref(0)
const prevPhase = ref<string>('')
const prevBailoutRelations = ref<string>('')
const prevBotPlayers = ref<Set<string>>(new Set())
const prevRebelEvent = ref<any>(null)
const prevLiangShanVoteCount = ref(0)
const prevQjAlertIds = ref<Set<string>>(new Set())
const prevSwapRequestIds = ref<Set<string>>(new Set())
const showLiangShanOverlay = ref(false)
const activePlayerCount = (state: any) => (state?.players || []).filter((p: any) => p.status === 'playing').length

watch(() => gameState.value, (newState, oldState) => {
  if (!newState) return

  // 游戏开始
  if (newState.phase === 'playing' && prevPhase.value === 'waiting') {
    addBroadcast('🎉 房间满员，正式开干啦！', 'info')
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
  }

  // 流局
  if (newState.phase === 'ended' && oldState?.phase === 'playing') {
    const reason = (newState as any).endReason
    if (reason === 'wall_exhausted') {
      addBroadcast('💨 牌墙摸完，流局！倍数翻倍！', 'warn')
    }
  }

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
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
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
  /* 4:3 比例，56em×42em ≈ 896×672px，保证零隐藏 */
  width: min(100vw, calc(80vh * 4/3), 1200px);
  aspect-ratio: 4 / 3;
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
}

/* 绿色麻将桌布内层 */
.table-felt {
  position: absolute;
  inset: 0;
  /* 绿色桌布 + 中央聚光 */
  background:
    radial-gradient(ellipse at 50% 50%, rgba(40,90,50,0.95) 0%, rgba(28,65,35,0.98) 45%, rgba(18,42,22,1) 100%);
  border-radius: 8px;
  overflow: hidden;
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
  top: 26%;
  left: 50%;
  transform: translateX(-50%);
}
:deep(.discard-zone--bottom) {
  bottom: 26%;
  left: 50%;
  transform: translateX(-50%);
}
:deep(.discard-zone--left) {
  top: 50%;
  left: calc(16.6% + 36px);
  transform: translateY(-50%) rotate(90deg);
}
:deep(.discard-zone--right) {
  top: 50%;
  right: calc(16.6% + 36px);
  transform: translateY(-50%) rotate(-90deg);
}

/* ===== 扩展信息区 ===== */
.extended-info-panel {
  flex: 0 0 354px;
  max-width: 354px;
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
}

/* 桌面端严格 1/4 宽 */
@media (min-width: 1101px) {
  .extended-info-panel {
    /* 牌桌宽度约 75vw (table-wrapper flex), 1/4 ≈ 25vw; 但受 max-width 约束 */
    flex: 0 0 25%;
    max-width: 370px;
  }
}

/* 窄屏降级 */
@media (max-width: 1100px) {
  .extended-info-panel {
    flex: 0 0 276px;
    max-width: 276px;
  }
}

@media (max-width: 900px) {
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
  top: 0;
  left: 50%;
  transform: translateX(-50%) rotate(180deg) translateY(3%);
  width: 62%;
  height: auto;
}

.seat-bottom {
  bottom: 0;
  left: 50%;
  transform: translateX(-50%) scale(1.2) translateY(-5%);
  transform-origin: bottom center;
  width: 62%;
  height: auto;
}

/* 对家名字反向旋转，保持正向可读 */
.seat-top :deep(.player-other-name) {
  display: inline-block;
  transform: rotate(180deg);
}

.seat-left {
  left: 7%;
  top: 0;
  height: 100%;
  width: 85px;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  overflow: visible;
}

.seat-right {
  right: 7%;
  top: 0;
  height: 100%;
  width: 85px;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
  overflow: visible;
}

/* ===== 本家：手牌 + 动作按钮横排 ===== */
.self-area-with-actions {
  display: flex;
  justify-content: center;
  align-items: flex-end;
  gap: 8px;
  width: 100%;
  position: relative;
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
  animation: hu-glow 1s infinite;
}

@keyframes hu-glow {
  0%, 100% { box-shadow: 0 0 8px rgba(239,83,80,0.4); }
  50% { box-shadow: 0 0 18px rgba(239,83,80,0.8); }
}

.inline-action-btn--pass {
  background: rgba(60, 60, 60, 0.85);
  color: #fff;
  border-color: rgba(255,255,255,0.1);
  font-size: 0.75rem;
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
  justify-content: space-between;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 12px;
  background: rgba(5, 14, 10, 0.9);
}
.panel-room-number {
  font-size: 1rem;
  font-weight: 700;
  margin: 0;
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
  width: 30px;
  height: 30px;
  z-index: 2;
  pointer-events: none;
}

/* 中心金色圆环 */
.center-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 173px;
  height: 173px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 215, 0, 0.15) 0%, rgba(255, 180, 0, 0.08) 50%, transparent 70%);
  border: 1.5px solid rgba(255, 215, 0, 0.25);
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

/* 四方位标注 */
.compass {
  position: absolute;
  font-size: 0.7rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.35);
  z-index: 2;
  pointer-events: none;
}
.compass--n { top: 2%; left: 50%; transform: translateX(-50%); }
.compass--s { bottom: 2%; left: 50%; transform: translateX(-50%); }
.compass--w { left: 2%; top: 50%; transform: translateY(-50%); }
.compass--e { right: 2%; top: 50%; transform: translateY(-50%); }

/* 状态提示 */
.turn-indicator {
  position: absolute;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.8);
  z-index: 4;
  background: rgba(0, 0, 0, 0.4);
  padding: 3px 14px;
  border-radius: 999px;
  white-space: nowrap;
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
  margin-bottom: 6px;
}
.hu-combo-label {
  font-size: 1rem;
  font-weight: 700;
  color: #fff;
}
.hu-combo-score {
  font-size: 1.2rem;
  font-weight: 900;
  color: #FFD700;
  text-shadow: 0 0 8px rgba(255, 215, 0, 0.5);
}
.hu-combo-tiles {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin: 6px 0;
  align-items: flex-end;
}
.hu-tile-group {
  display: flex;
  align-items: flex-end;
  gap: 1px;
  padding: 3px 5px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.25);
  position: relative;
}
.hu-tile-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.hu-wild-label {
  position: absolute;
  bottom: -1px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.5rem;
  color: #FFD700;
  font-weight: 900;
  background: rgba(0,0,0,0.7);
  padding: 0 2px;
  border-radius: 2px;
  white-space: nowrap;
  z-index: 2;
}
.hu-group-type {
  font-size: 0.55rem;
  color: rgba(255,255,255,0.45);
  position: absolute;
  bottom: -9px;
  right: 2px;
}
.hu-combo-details {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
}
.hu-detail {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.65);
  background: rgba(255, 255, 255, 0.1);
  padding: 1px 6px;
  border-radius: 4px;
}
.hu-combo-groups {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: flex-end;
}

.hu-group {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  padding: 6px 8px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.2);
  position: relative;
}

.hu-group--sequence {
  border-bottom: 2px solid rgba(100, 200, 255, 0.4);
}

.hu-group--triplet {
  border-bottom: 2px solid rgba(255, 150, 50, 0.4);
}

.hu-group--pair {
  border-bottom: 2px solid rgba(255, 215, 0, 0.5);
}

.hu-mini-tile {
  flex-shrink: 0;
}

.hu-group-label {
  position: absolute;
  top: -10px;
  right: 4px;
  font-size: 0.6rem;
  padding: 1px 4px;
  border-radius: 3px;
  font-weight: 700;
}

.hu-group--sequence .hu-group-label {
  background: rgba(100, 200, 255, 0.2);
  color: #64c8ff;
}

.hu-group--triplet .hu-group-label {
  background: rgba(255, 150, 50, 0.2);
  color: #ff9632;
}

.hu-group--pair .hu-group-label {
  background: rgba(255, 215, 0, 0.2);
  color: #ffd700;
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
  width: min(520px, 92%);
  max-height: 85vh;
  overflow-y: auto;
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

/* 等待房间 */
.waiting-overlay {
  position: absolute;
  inset: 0;
  background: rgba(3, 10, 8, 0.92);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(6px);
  z-index: 10;
}

.waiting-card {
  background: rgba(4, 16, 11, 0.97);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  padding: 36px;
  width: min(420px, 92%);
  text-align: center;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6);
}

.waiting-title {
  font-size: 1.5rem;
  margin: 0 0 4px;
}

.waiting-subtitle {
  font-size: 0.9rem;
  opacity: 0.6;
  margin: 0 0 24px;
}

.waiting-players {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 24px;
}

.waiting-slot {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.02);
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
  justify-content: center;
  gap: 10px;
  margin-bottom: 20px;
  font-size: 0.9rem;
  opacity: 0.8;
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
  margin-bottom: 16px;
}

.waiting-start-btn {
  width: 100%;
  padding: 14px 24px;
  font-size: 1.05rem;
}

.waiting-hint {
  font-size: 0.8rem;
  opacity: 0.5;
  margin: 8px 0 0;
}

.waiting-leave-btn {
  width: 100%;
  padding: 10px 24px;
  font-size: 0.85rem;
  opacity: 0.7;
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
    flex-direction: column;
    align-items: flex-start;
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
    transform: rotate(90deg);
    transform-origin: center;
    width: min(900px, 90vh);
    max-height: calc(100vw - 24px);
  }

  .room-container--rotated .room-header {
    order: 2;
    margin-top: 12px;
  }

  .room-container--rotated .room-main {
    order: 1;
    flex-direction: column;
  }

  .room-container--rotated .table-wrapper {
    order: 1;
  }

  .room-container--rotated .extended-info-panel {
    order: 2;
    width: 100%;
  }
}
</style>