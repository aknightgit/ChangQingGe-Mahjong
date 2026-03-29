# 🀄 长清阁麻将 — 完整改造方案 v1.0

> 生成时间：2026-03-27 20:40 UTC  
> 状态：初稿，待自检完善

---

## 一、目标（K哥要什么）

### 1.1 功能目标
- [ ] **AI Bot 自动对战**：电脑玩家能自动摸牌、出牌，使用训练好的 `training/best-policy.json` 策略
- [ ] **双击/拖拽出牌**：人类玩家用手牌时，双击或拖拽到弃牌区即出牌
- [ ] **弃牌区集中布局**：四个玩家的弃牌区各自独立位于桌面固定位置（不是嵌套在各玩家组件内）
- [ ] **露牌区位置规范**：每个玩家的露牌区（补花/碰杠牌）位于该玩家手牌的"相对左手边"（面向该玩家时的左手侧）
- [ ] **牌尺寸统一**：所有牌（墙牌、手牌、弃牌、露牌）统一为 28×40 px
- [ ] **弃牌区 6×n 网格**：每行6张，整齐排列
- [ ] **弃牌区朝向规范**：
  - 上家：牌面朝上，头部朝下（旋转180°）
  - 下家（本家）：牌面朝上，头部朝上
  - 左家：牌面朝上，头部朝右（旋转90°）
  - 右家：牌面朝上，头部朝左（旋转270°）
- [ ] **自定素材**：用 `/data/mahjong-tiles/ak_jpg/` 的42张实体牌照片替换 pomax_hq 素材

### 1.2 技术目标
- 核心功能（AI对战）优先于 UI 美化
- 不再零散修补，系统性重构
- push 之前本地验证功能正常

---

## 二、现状（现在是什么）

### 2.1 文件结构

```
app/
├── components/
│   ├── MahjongTile.vue          # 牌渲染组件（28×40px → 36×50px）
│   ├── TileWall.vue             # 牌墙（OVERLAP=28）
│   ├── PlayerSelfArea.vue       # 本家：手牌+露牌+弃牌
│   ├── PlayerOtherArea.vue      # 其他玩家：手牌+露牌+弃牌
│   ├── CircularActionButtons.vue # 动作按钮（已从桌面中心移除）
│   ├── TableCenter.vue          # 桌面中心（弃牌池+牌墙数+倍数）
│   ├── DiceAnimation.vue        # 骰子动画
│   ├── PlayerInfo.vue
│   └── RoomStats.vue
├── pages/gameroom/[roomId].vue  # 主游戏页（1478行）
└── composables/useGame.ts        # 游戏状态管理（Socket+API）
server/
├── utils/gameManager.ts          # 游戏逻辑核心（~1500行）
├── api/game/action.post.ts       # 执行动作API
└── services/botService.ts       # ❌ 不存在
training/
└── best-policy.json             # ✅ 训练好的AI策略（95.9%胡率）
```

### 2.2 当前弃牌区布局（问题）

**当前结构**：
```
[roomId].vue
├── .seat.seat-top    (PlayerOtherArea → 含 .player-other-discards)
├── .seat.seat-left   (PlayerOtherArea → 含 .player-other-discards)
├── .seat.seat-right  (PlayerOtherArea → 含 .player-other-discards)
├── .seat.seat-bottom (PlayerSelfArea  → 含 .player-discards)
```

**问题**：
- 弃牌区是各玩家组件的一部分，不是桌面独立区域
- 上家/下家的弃牌区是垂直条形（rotation 180°），牌会变扁
- 左家/右家的弃牌区嵌在手牌列里，z-index/定位有问题
- 每个玩家只能看到自己的弃牌区，无法看到其他玩家的弃牌区

### 2.3 当前露牌区布局（问题）

**当前结构**：
```
PlayerOtherArea: melds(左) + hand(右)  ← 位置是固定的"物理左"
PlayerSelfArea:  melds(左) + hand(右)  ← 同样固定"物理左"
```

**K哥要求**：
- "所有玩家的露牌区，位于他的手牌的相对的左手边"
- 翻译：站在玩家**自己视角**的左边（面对牌桌时的左手侧）
  - 本家（下）：露牌区在手牌**右边**（左手边=右边）
  - 上家：露牌区在手牌**左边**（从上家角度看，左手=牌桌右边）
  - 左家：露牌区在手牌**下边**（从左家角度看，左手=桌子下方）
  - 右家：露牌区在手牌**上边**

当前是"物理左边"，不是"玩家相对左边"。

### 2.4 牌尺寸现状

| 组件 | 尺寸 |
|------|------|
| MahjongTile (normal) | 36×50px |
| MahjongTile (small) | 31×45px |
| TileWall | 28×40px |
| 响应式 @1300px | 25×34px / 22×31px |
| 响应式 @900px | 20×27px / 18×25px |

**问题**：墙牌28×40，手牌36×50，small牌31×45，不统一。

### 2.5 AI Bot 现状

- `setupTestGame` 在房间加"电脑1/2/3"玩家（普通 Player，无 AI 标记）
- **服务器完全没有 AI 逻辑**：没有定时器、没有决策服务、没有使用 best-policy.json
- 当轮到电脑玩家时：游戏卡住，等待人类操作
- `forceDiscard` 是手动测试按钮，只在前端可用

### 2.6 双击出牌现状

**存在逻辑**：
```js
// [roomId].vue handleTileClick()
if (selectedTileId.value === tile.id) {
  if (canDiscard) {
    executeAction(ActionType.DISCARD, tile.id)
    selectedTileId.value = null
  }
} else {
  selectedTileId.value = tile.id
}
```
- 双击（选同一张牌第二次）理论上可以出牌
- 但 `canDiscard = availableActions.value.includes(ActionType.DISCARD)`
- 如果 `availableActions` 没有 DISCARD（因为 pendingActions 占用等），双击无效

### 2.7 素材现状

- 当前使用 `public/assets/tileset/pomax_hq/` 的 PNG 文件（pomax_hq 风格）
- `/data/mahjong-tiles/ak_jpg/` 有42张实体牌照片（未使用）
- 照片命名：`IMG_20260327_180857.jpg` 等原始文件名，未映射到牌名

---

## 三、改造方案（要改什么）

### 3.1 AI Bot 服务（优先级 P0）

**新建**：`server/services/botService.ts`

**职责**：
1. 加载 `training/best-policy.json` 策略参数
2. 判断当前玩家是否为电脑玩家（`player.name.startsWith('电脑')`）
3. 电脑玩家回合时：自动计算最佳出牌 → 执行 `DISCARD`
4. 使用策略参数评估每张可出的牌的得分

**策略使用方式**（简化为 MVP）：
```ts
// 基于 best-policy.json 的启发式评估
score = 
  - discardHuChance（避免打危险牌）
  - pengChance（保留碰面子）
  - kongChance（保留杠面子）
  - dominantSuitBonus（保留一色）
  - honorPairBonus（保留字对）
  - wildKeepPenalty（避免打百搭）
```

**集成点**：`gameManager.ts` 的 `moveToNextPlayer()` 完成 `handleDraw` 后：
```ts
if (isBotPlayer(nextPlayer)) {
  // 延迟 500ms 让客户端看到摸牌动画
  setTimeout(() => botService.executeBotTurn(gameId), 500)
}
```

### 3.2 弃牌区集中布局（优先级 P1）

**方案**：在 `[roomId].vue` 的 `.table-felt` 内新增4个绝对定位的独立弃牌区组件：

```
.table-felt
├── TableCenter（中央显示）
├── DiscardZoneTop    ← 新增，绝对定位在上方中央
├── DiscardZoneBottom  ← 新增，绝对定位在下方中央
├── DiscardZoneLeft    ← 新增，绝对定位在左侧中央
├── DiscardZoneRight   ← 新增，绝对定位在右侧中央
├── TileWall
└── .seat.seat-*     （保留，只含手牌+露牌）
```

**组件**：`app/components/DiscardZone.vue`
- props: `position: 'top' | 'bottom' | 'left' | 'right'`, `tiles: Tile[]`
- 每个 zone 独立渲染该位置玩家的弃牌
- CSS: 4个位置各自旋转角度达到正确朝向
- 6×n grid，`gap: 2px`

**废弃**：`PlayerOtherArea` 和 `PlayerSelfArea` 内的弃牌相关代码 → 移除

### 3.3 露牌区"相对左手边"改造（优先级 P1）

**改动**：`PlayerOtherArea.vue` 和 `PlayerSelfArea.vue` 的布局方向

当前：`melds(左) + hand(右)` — 固定"物理左"

目标：
```
本家（下）：hand + melds（melds在右=左手边）
上家：      hand + melds（melds在右=左手边）← 同上家视角
左家：      melds在上 + hand在下（melds在下=左手边）
右家：      hand在上 + melds在下（melds在上=左手边）
```

**实现**：根据 `position` prop 动态调整 flex 方向：
```vue
<!-- 本家和上家：melds在右手边 -->
<div class="player-area" :class="position === 'bottom' || position === 'top' ? 'area--melds-right' : 'area--melds-bottom'">
  <div v-if="meldsPosition !== 'left'" class="player-hand">...</div>
  <div class="player-melds" v-if="melds.length">...</div>
  <div v-if="meldsPosition === 'left'" class="player-hand">...</div>
</div>
```

### 3.4 牌尺寸统一（优先级 P2）

**改动 MahjongTile.vue**：
- normal: 28×40px（已完成初步修改）
- small: 28×40px（与 normal 相同，不再区分）
- 移除 `tile--small` 的差异化尺寸

### 3.5 双击/拖拽出牌（优先级 P2）

**双击**：
- 已在 `handleTileClick` 实现
- 需要确保 `availableActions` 包含 DISCARD 时才生效
- 当前问题：`pendingActions` 非空时，DISCARD 不在 availableActions 里

**拖拽**：
- 在 `PlayerSelfArea.vue` 的 `.player-hand` 加 `@dragstart/@dragover/@drop` 事件
- 拖拽某张牌到弃牌区松手 → 执行 DISCARD
- HTML5 Drag API（兼容移动端差，但作为双击的补充够用）

### 3.6 自定义素材映射（优先级 P3）

**需要做的**：
1. 用 Ollama vision 识别42张 ak_jpg 照片的牌名
2. 重命名为标准牌图文件名
3. 将 ak_jpg 目录内容复制到 `public/assets/tileset/ak_jpg/`
4. 修改 `MahjongTile.vue` 的 `tileImageSrc` 路径从 `pomax_hq` 切换到 `ak_jpg`

---

## 四、实施步骤

### 阶段一：AI Bot（核心，P0）

**Step 1.1** 新建 `server/services/botService.ts`
- 读取 `training/best-policy.json`
- 实现 `isBotPlayer(name: string): boolean`
- 实现 `scoreTile(tile, gameState, player): number` — 基于策略参数
- 实现 `selectBestDiscardTile(player, gameState): Tile` — 选最高分牌

**Step 1.2** 改造 `gameManager.ts`
- `moveToNextPlayer()` 末尾：判断是否 bot，是则调用 `botService.executeBotTurn()`
- `executeBotTurn()`：计算最佳出牌 → 调用 `handleDiscard` → `broadcastGameState`

**Step 1.3** 测试：启动游戏，加3个机器人，确认机器人能自动打牌

### 阶段二：弃牌区集中（UI 核心，P1）

**Step 2.1** 新建 `app/components/DiscardZone.vue`
- 接收 `position`, `tiles`, `isWinner`, `latestTileId`
- 内部用 grid 6列布局，旋转角度按朝向

**Step 2.2** 改造 `[roomId].vue`
- 在 `.table-felt` 内添加4个 `<DiscardZone>` 组件（绝对定位）
- 从各 `PlayerOtherArea` props 中移除 `discards`，改为统一从 gameState 获取

**Step 2.3** 移除 `PlayerOtherArea.vue` 和 `PlayerSelfArea.vue` 中的弃牌区渲染代码

### 阶段三：露牌区"相对左手边"（P1）

**Step 3.1** 分析各位置的"相对左手边"方向
**Step 3.2** 改造 `PlayerOtherArea.vue`：根据 position 动态切换 melds/hand 顺序
**Step 3.3** 改造 `PlayerSelfArea.vue`：同样调整

### 阶段四：牌尺寸统一（P2）

**Step 4.1** 确认 MahjongTile.vue 的 28×40px 生效
**Step 4.2** 移除 small 差异化
**Step 4.3** 验证各组件显示正常

### 阶段五：双击/拖拽（P2）

**Step 5.1** 验证双击逻辑，修复 `availableActions` 丢失 DISCARD 的问题
**Step 5.2** 在 `PlayerSelfArea.vue` 添加拖拽事件处理

### 阶段六：素材映射（P3）

**Step 6.1** Ollama vision 批量识别42张牌
**Step 6.2** 重命名为标准牌图文件名
**Step 6.3** 修改 MahjongTile.vue 路径，切换素材

---

## 五、文件改动清单

| 文件 | 改动类型 | 优先级 |
|------|---------|--------|
| `server/services/botService.ts` | 新建 | P0 |
| `server/utils/gameManager.ts` | 修改 | P0 |
| `app/components/DiscardZone.vue` | 新建 | P1 |
| `app/pages/gameroom/[roomId].vue` | 重构 | P1 |
| `app/components/PlayerOtherArea.vue` | 重构 | P1 |
| `app/components/PlayerSelfArea.vue` | 重构 | P1 |
| `app/components/MahjongTile.vue` | 修改 | P2 |
| `app/components/PlayerSelfArea.vue` | 添加拖拽 | P2 |
| `app/components/MahjongTile.vue` | 素材路径 | P3 |

---

## 六、自检清单（执行前确认）

- [ ] AI Bot 能独立打完一局（不卡住）
- [ ] 弃牌区在桌面4个独立位置，不在各玩家组件内
- [ ] 每个玩家看到自己的弃牌区在正确位置
- [ ] 露牌区在各玩家"相对左手边"
- [ ] 牌尺寸全部统一
- [ ] 双击能出牌（无 pendingActions 时）
- [ ] 素材照片正确显示
- [ ] `git push` 成功后才让 K哥 pull

---

## 七、已知风险

1. **弃牌区独立组件 vs 当前嵌套结构**：重构幅度大，可能影响其他功能
2. **露牌区方向计算**：左右家涉及90°旋转，CSS flex-direction 切换要仔细验证
3. **Bot 策略简化**：MVP 使用启发式评分，不是完整蒙特卡洛树搜索
4. **Ollama vision 速度**：识别42张图可能需要较长时间（每张~5-10秒）
