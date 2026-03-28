# 🀄 长清阁麻将 — 需求文档 v3.0

> 更新：2026-03-28 01:20 UTC  
> 格式：x.x.x 编号，每项可独立验收 ✅/❌

---

## 0. 参考图（你想要的界面长这样）

### 图1：桌面全景（整体布局标杆）
![桌面全景](/home/node/.openclaw/media/inbound/79ab9390-c310-4c88-8e4f-db46c5286a7b.jpg)

**核心要素：**
- 四方牌桌，绿色桌面，十字定位标志
- 四个方位标注：东南西北
- 每个方位有：牌墙 + 手牌 + 弃牌区
- 弃牌区在桌面中央，不是分散在各自玩家身旁
- 手牌牌背朝各自的玩家

### 图2：出牌与计分（中观细节）
![出牌计分](/home/node/.openclaw/media/inbound/06cd8ccb-7fb1-4e12-b0a0-0ef286005b93.jpg)

**核心要素：**
- 弃牌区每行6张，整齐网格
- 每张弃牌有分数标注（6x, 1x, 1x, 2x...）
- 露牌区（碰/杠）有分数标注（x4）
- 操作按钮：可以杠、过
- 弃牌河最近打出的牌有红框标记

### 图3：上家视角（另一个玩家的角度）
![上家视角](/home/node/.openclaw/media/inbound/3896a967-a28d-4403-a556-c901f9ec64f8.jpg)

**核心要素：**
- 上家手牌牌背朝下
- 上家弃牌牌面朝上，头部朝下
- 庄家标记（龙标志）
- 连续舍牌有特殊显示

---

## 1. AI Bot 自动对战（核心功能）

### 1.1 botService 服务
- 1.1.1 新建 `server/services/botService.ts`
- 1.1.2 加载 `training/best-policy.json` 策略参数
- 1.1.3 实现 `isBotPlayer(player)` — 判断是否电脑玩家（名字以"电脑"开头）
- 1.1.4 实现 `selectDiscardTile(player, gameState)` — 用策略评分选最佳出牌
- 1.1.5 实现 `shouldClaimPendingAction(player, availableActions, gameState)` — 自动决定碰杠胡过

### 1.2 游戏引擎集成
- 1.2.1 `gameManager.ts` import botService ✅ 已做
- 1.2.2 `moveToNextPlayer()` 末尾判断 bot，调度延迟出牌 ✅ 已做
- 1.2.3 `checkPendingActions()` 末尾调度 bot 自动响应碰杠胡 ✅ 已做
- 1.2.4 `schedulePendingActionTimeout()` 跳过已响应的 bot ✅ 已做
- 1.2.5 bot 出牌延迟 800ms（让客户端看到摸牌动画）
- 1.2.6 bot 响应碰杠胡随机延迟 300-700ms

### 1.3 端到端验证
- 1.3.1 启动 Nuxt dev server，无报错
- 1.3.2 创建房间，添加3个电脑玩家
- 1.3.3 点"掷骰子开局"，发牌成功
- 1.3.4 庄家摸牌后自动出牌
- 1.3.5 每个电脑玩家轮流摸牌+出牌不卡住
- 1.3.6 电脑玩家有人打出可碰牌 → AI 自动碰
- 1.3.7 电脑玩家有人打出可胡牌 → AI 自动胡
- 1.3.8 人类玩家也能正常出牌（不影响人类操作）
- 1.3.9 一局跑完（有人胡或流局），不卡死

---

## 2. 弃牌区（桌面中央独立区域）

### 2.1 弃牌区独立组件
- 2.1.1 新建 `app/components/DiscardZone.vue`
- 2.1.2 props: `position: 'top'|'bottom'|'left'|'right'`, `tiles: Tile[]`
- 2.1.3 props: `isWinner: boolean`, `latestTileId: string`
- 2.1.4 props: `scores: number[]`（每张弃牌的分数标注，可选）

### 2.2 弃牌区布局
- 2.2.1 4个 DiscardZone 放在 `[roomId].vue` 的 `.table-felt` 内
- 2.2.2 绝对定位：top 在桌面上方中央，bottom 在下方中央
- 2.2.3 绝对定位：left 在桌面左侧中央，right 在右侧中央
- 2.2.4 CSS grid 6列：`grid-template-columns: repeat(6, max-content)`
- 2.2.5 gap: 2px（比当前 1px 更清晰）

### 2.3 弃牌区朝向（从参考图推断）
- 2.3.1 上家：`transform: rotate(180deg)` — 头部朝下
- 2.3.2 下家：`transform: rotate(0deg)` — 头部朝上
- 2.3.3 左家：`transform: rotate(90deg)` — 头部朝右
- 2.3.4 右家：`transform: rotate(270deg)` — 头部朝左

### 2.4 弃牌区分数标注（图2要求）
- 2.4.1 每张弃牌右侧显示该牌打出时的得失分倍率
- 2.4.2 得分用绿色，失分用红色
- 2.4.3 没有分数的牌不显示标注

### 2.5 移除旧弃牌区
- 2.5.1 移除 `PlayerSelfArea.vue` 中的弃牌区渲染代码
- 2.5.2 移除 `PlayerOtherArea.vue` 中的弃牌区渲染代码
- 2.5.3 移除相关 CSS（弃牌 grid、弃牌旋转等）

---

## 3. 露牌区（相对左手边）

### 3.1 露牌区位置规则（从参考图推断）
- 3.1.1 本家：露牌在手牌**右侧**（本家左手边=牌桌右边）
- 3.1.2 上家：露牌在手牌**左侧**（上家左手边=牌桌左边）
- 3.1.3 左家：露牌在手牌**上方**（左家左手边=牌桌上方）
- 3.1.4 右家：露牌在手牌**下方**（右家左手边=牌桌下方）

### 3.2 实现
- 3.2.1 `PlayerOtherArea.vue` 根据 position prop 动态调整 flex 方向
- 3.2.2 `PlayerSelfArea.vue` 同样调整（本家的露牌在手牌右侧）
- 3.2.3 每个露牌组合（碰/杠/花）有分数标注（x2, x4 等）
- 3.2.4 来源玩家标注保留（颜色圆点）

---

## 4. 牌尺寸统一

### 4.1 MahjongTile.vue
- 4.1.1 normal 牌：28×40px ✅ 已改
- 4.1.2 small 牌：28×40px（与 normal 统一）✅ 已改
- 4.1.3 响应式 1300px：25×34px，small 同尺寸
- 4.1.4 响应式 900px：20×27px，small 同尺寸
- 4.1.5 移除 `tile--small` 差异化尺寸

### 4.2 TileWall.vue
- 4.2.1 墙牌：28×40px ✅ 已确认
- 4.2.2 OVERLAP=28（连续无空隙）✅ 已确认
- 4.2.3 牌墙到桌面边缘约 1/6 桌面宽度

---

## 5. 双击/拖拽出牌

### 5.1 双击出牌
- 5.1.1 第一次点击：选中手牌（selectedTileId = tile.id）
- 5.1.2 第二次点击同一张牌：执行 DISCARD ✅ 逻辑已存在
- 5.1.3 确保 availableActions 包含 DISCARD 时才生效
- 5.1.4 验证：轮到自己时，双击能成功出牌

### 5.2 拖拽出牌
- 5.2.1 `PlayerSelfArea.vue` 的手牌加 HTML5 drag 事件
- 5.2.2 dragstart → 拿到 tile.id
- 5.2.3 drop 到弃牌区 → 执行 DISCARD
- 5.2.4 移动端兼容：touch events 作为 fallback
- 5.2.5 验证：拖拽手牌到桌面松手，成功出牌

---

## 6. 操作按钮（交互增强）

### 6.1 按钮显示规则
- 6.1.1 自己的回合：显示摸牌按钮
- 6.1.2 有人打出可碰牌：显示碰按钮
- 6.1.3 有人打出可杠牌：显示杠按钮
- 6.1.4 有人打出可胡牌：显示胡按钮
- 6.1.5 有可用操作时：显示过按钮
- 6.1.6 造反：显示造反按钮（仅第一圈，五毒散）
- 6.1.7 没有可用操作时：显示"等待中..."

### 6.2 按钮交互
- 6.2.1 点击摸牌 → executeAction(DRAW)
- 6.2.2 点击碰 → executeAction(PENG)
- 6.2.3 点击杠 → executeAction(KONG) / CONCEALED_KONG / EXTENDED_KONG
- 6.2.4 点击胡 → executeAction(HU)
- 6.2.5 点击过 → executeAction(PASS)
- 6.2.6 响应窗口显示倒计时（actionWindowText）

---

## 7. 定制素材

### 7.1 素材识别
- 7.1.1 用 Ollama vision 识别 `/data/mahjong-tiles/ak_jpg/` 42张照片
- 7.1.2 重命名为标准牌图文件名（Man1.png, Pin5.png, Ton.png 等）
- 7.1.3 复制到 `public/assets/tileset/ak_jpg/`
- 7.1.4 建立 `ak_jpg/tile_mapping.json` — 原始文件名 → 牌名映射

### 7.2 素材切换
- 7.2.1 `MahjongTile.vue` 的 `tileImageSrc` 路径从 `pomax_hq` 切换到 `ak_jpg`
- 7.2.2 如果 ak_jpg 文件不存在，fallback 到 pomax_hq
- 7.2.3 验证：42张牌全部正确显示

---

## 8. 整体 UI 重构（[roomId].vue）

### 8.1 桌面结构改造
- 8.1.1 `.table-felt` 内新增 4 个 `<DiscardZone>` 组件
- 8.1.2 `.seat` 组件只保留手牌+露牌（移除弃牌区）
- 8.1.3 从 `gameState` 统一获取弃牌数据（而非各玩家组件内获取）
- 8.1.4 桌面中央保留 TableCenter（牌墙数+倍数+百搭）

### 8.2 响应式适配
- 8.2.1 桌面：4:3 比例，宽屏友好
- 8.2.2 平板：缩小牌尺寸
- 8.2.3 手机竖牌：旋转 + 操作按钮底部
- 8.2.4 所有断点验证正常

---

## 9. 验收清单

### 9.1 功能验收
- [ ] 9.1.1 1人+3电脑，能独立跑完一局不卡住
- [ ] 9.1.2 电脑自动摸牌+出牌（延迟可见动画）
- [ ] 9.1.3 电脑自动碰/杠/胡
- [ ] 9.1.4 人类双击出牌正常
- [ ] 9.1.5 人类拖拽出牌正常
- [ ] 9.1.6 操作按钮根据规则正确显示

### 9.2 UI 验收（参照参考图）
- [ ] 9.2.1 弃牌区在桌面中央4个象限
- [ ] 9.2.2 弃牌区每行6张，牌面朝上，朝向正确
- [ ] 9.2.3 每张弃牌有分数标注
- [ ] 9.2.4 露牌区在各玩家自己视角的左手边
- [ ] 9.2.5 每个露牌有分数标注
- [ ] 9.2.6 牌尺寸全部统一 28×40px
- [ ] 9.2.7 牌墙连续无空隙
- [ ] 9.2.8 中央有风位标注和房间信息

### 9.3 技术验收
- [ ] 9.3.1 TypeScript 编译无错误
- [ ] 9.3.2 MongoDB 连接正常
- [ ] 9.3.3 Socket.IO 连接正常
- [ ] 9.3.4 git push 成功后才让 K哥 pull
