# Blood-On-Mahjong 可行性分析报告
**日期**: 2026-03-23
**项目**: https://github.com/quiet98k/Blood-On-Mahjong
**规则**: 四川血战到底

---

## 1. 项目概览

### 技术栈
| 层级 | 技术 | 版本 |
|------|------|------|
| 前端框架 | Nuxt 4 (Vue 3) | ^4.1.1 |
| UI库 | Nuxt UI 3 | ^3.3.3 |
| 后端框架 | Nitro (Nuxt Server) | 内置 |
| 实时通信 | Socket.IO | ^4.8.1 |
| 数据库 | MongoDB | ^6.21.0 |
| 缓存/扩展 | Redis + socket.io/redis-adapter | ^5.10.0 / ^8.3.0 |
| 认证 | Google OAuth 2.0 | google-auth-library ^10.5.0 |
| 测试 | Playwright E2E | 1.48.2 |
| 部署 | Docker + Kubernetes (Helm) | werf.yaml |
| 语言 | TypeScript | ^5.9.2 |

### 代码量
- **总行数**: 10,310 行
- **文件数**: 72 个 (.ts/.vue/.css)
- **核心游戏逻辑**: ~2,130 行
- **前端 UI**: ~1,500 行
- **后端服务**: ~3,000 行

---

## 2. 已实现功能清单

### ✅ 完整实现
- [x] 四人血战到底基本流程
- [x] 发牌（每人13张，庄家14张）
- [x] 摸牌/打牌循环
- [x] 碰牌检测与执行
- [x] 明杠/暗杠/续杠
- [x] 胡牌判断（标准胡 4面子1雀头 + 七对）
- [x] 缺门检测（必须缺一门才能胡）
- [x] 番数计算（根/杠花/抢杠/杠上炮）
- [x] 多人实时 WebSocket 对战
- [x] 房间创建/加入
- [x] Google OAuth 登录
- [x] MongoDB 游戏状态持久化
- [x] Redis 适配器（多服务器水平扩展）
- [x] Docker 容器化部署
- [x] Kubernetes Helm Chart
- [x] Playwright E2E 测试
- [x] 响应式 UI（桌面/平板/手机）
- [x] 游戏历史记录

### ⚠️ 部分实现
- [~] 一炮多响（框架支持，需验证边界情况）
- [~] 查叫（Cha Jiao）检测（有字段但逻辑不完整）

### ❌ 未实现（需要添加）
- [ ] 互包（包三/包四）规则
- [ ] 百搭牌（癞子）
- [ ] 花牌系统
- [ ] 造反功能
- [ ] 五毒散检测
- [ ] 清碰/混一色独立番型
- [ ] 冻结/等待机制

---

## 3. 核心模块分析

### 3.1 游戏状态管理 (gameManager.ts - 829行)

**职责**:
- 游戏生命周期（创建/开始/进行/结束）
- 玩家操作处理（摸牌/打牌/碰/杠/胡）
- WebSocket 广播
- MongoDB 持久化
- 房间管理

**关键类**: `GameManager` (单例)
- `games: Map<string, GameState>` — 内存中的游戏状态
- `playerToGame: Map<string, string>` — 玩家→游戏映射
- `wsManager` — WebSocket 管理器

**操作处理流程**:
```
玩家操作 → validateAction() → executeAction() → persistGame() → broadcastGameState()
```

**可扩展性**: ⭐⭐⭐⭐ 良好
- 操作类型用枚举定义，新增操作只需扩展 ActionType
- 游戏状态用接口定义，新增字段不影响现有逻辑
- WebSocket 广播是解耦的

### 3.2 胡牌判断 (handValidator.ts - 292行)

**核心算法**: 递归回溯法
```
canWin(tiles):
  1. 检查七对
  2. 尝试每个可能的对子作为雀头
  3. 剩余牌递归检查能否组成顺子/坎子
```

**支持的牌型**:
- 标准胡 (4面子 + 1雀头)
- 七对 (7个对子)

**可扩展性**: ⭐⭐⭐ 中等
- 添加新牌型需要修改 `canWin()` 函数
- 百搭牌需要重写判断逻辑（复杂度高）
- 缺门检查是独立函数，容易修改

### 3.3 番数计算 (scoring.ts - 318行)

**番型**:
- 基础番: 1番（缺门）
- 有根: +1番/根
- 杠上花: +1番
- 抢杠: +1番
- 杠上炮: +1番
- 清一色: 额外番
- 七对: 额外番

**可扩展性**: ⭐⭐⭐⭐⭐ 优秀
- 番型检查是独立函数
- 新增番型只需添加 if 分支
- 不影响核心游戏逻辑

### 3.4 WebSocket 通信 (socket.ts - 504行)

**事件类型**:
- `joinGame` — 加入游戏
- `gameAction` — 游戏操作
- `gameStateUpdate` — 状态更新广播
- `gameOver` — 游戏结束

**可扩展性**: ⭐⭐⭐⭐ 良好
- 事件驱动架构，新增事件类型简单
- Redis adapter 支持多服务器扩展

### 3.5 前端 UI

**组件结构**:
```
MahjongTile.vue        — 单个牌面组件（40×60px，CSS绘制）
PlayerOtherArea.vue    — 其他玩家区域（手牌背面 + 弃牌 + 副露）
PlayerSelfArea.vue     — 自己的区域（手牌正面 + 操作按钮）
[roomId].vue           — 游戏主页面（1121行，CSS Grid布局）
```

**布局**: CSS Grid
```css
grid-template-areas:
  ".    top    ."
  "left center right"
  ".    bottom  ."
```

**可扩展性**: ⭐⭐⭐⭐ 良好
- 牌面是纯 CSS 绘制（无图片依赖），容易换肤
- 响应式设计支持移动端
- 组件化程度高

---

## 4. 规则定制难度评估

### 你关心的规则改动

| 规则 | 当前状态 | 改动文件 | 难度 | 预计工时 |
|------|---------|---------|------|---------|
| **碰碰胡/混一色番型** | 番数计算中有基础 | scoring.ts | ⭐ | 2小时 |
| **清碰固定番** | 有清一色检测 | scoring.ts | ⭐ | 1小时 |
| **互包(包三/包四)** | 未实现 | gameManager.ts + scoring.ts | ⭐⭐ | 1-2天 |
| **百搭牌** | 未实现 | tiles.ts + handValidator.ts + gameManager.ts | ⭐⭐⭐ | 2-3天 |
| **花牌** | 未实现 | tiles.ts + gameManager.ts | ⭐⭐ | 1天 |
| **造反** | 未实现 | gameManager.ts + socket.ts | ⭐⭐ | 1天 |
| **五毒散** | 未实现 | handValidator.ts | ⭐⭐ | 半天 |
| **冻结/等待** | 未实现 | socket.ts + gameManager.ts | ⭐ | 半天 |
| **一炮多响完善** | 部分实现 | gameManager.ts | ⭐ | 半天 |

**总预计工时**: 7-10天

---

## 5. 移动端可行性

### 方案对比

| 方案 | 工作量 | 性能 | 体验 | 推荐 |
|------|--------|------|------|------|
| **Capacitor 套壳** | 1-2天 | ⭐⭐⭐ | ⭐⭐⭐ | 🏆 首选 |
| PWA | 半天 | ⭐⭐ | ⭐⭐ | 备选 |
| Tauri Mobile | 3-5天 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 进阶 |
| React Native 重写 | 2-4周 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 长期 |

### Capacitor 方案详情
```bash
# 步骤
1. npm install @capacitor/core @capacitor/cli
2. npx cap init
3. npx cap add android
4. npx cap add ios
4. npm run build
5. npx cap sync
6. npx cap open android / npx cap open ios
```

**优点**:
- 零代码改动，直接打包
- 支持原生插件（推送通知、支付等）
- iOS + Android 一次搞定

**缺点**:
- 性能不如原生（但麻将游戏够用）
- 包体积较大（WebView）

---

## 6. 部署架构

```
                    ┌─────────────┐
                    │   Nginx     │
                    │  (反向代理)  │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
        ┌─────┴─────┐┌─────┴─────┐┌─────┴─────┐
        │  Node 1   ││  Node 2   ││  Node 3   │
        │  (Nitro)  ││  (Nitro)  ││  (Nitro)  │
        └─────┬─────┘└─────┬─────┘└─────┬─────┘
              │            │            │
              └────────────┼────────────┘
                           │
                    ┌──────┴──────┐
                    │    Redis    │
                    │  (Pub/Sub)  │
                    └──────┬──────┘
                           │
                    ┌──────┴──────┐
                    │   MongoDB   │
                    │  (持久化)   │
                    └─────────────┘
```

**Kubernetes 部署**: 已有 Helm Chart (`.helm/` 目录)

---

## 7. 风险评估

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|---------|
| 规则差异大需大量重写 | 中 | 高 | 先做规则差异清单，分优先级 |
| 百搭牌逻辑复杂 | 高 | 中 | 可以先不做百搭，后期迭代 |
| 移动端兼容性问题 | 低 | 中 | Capacitor 成熟方案，风险低 |
| MongoDB 云端部署 | 低 | 低 | 用 MongoDB Atlas 免费层 |
| WebSocket 连接稳定性 | 中 | 中 | Redis adapter + 重连机制 |

---

## 8. 总结与建议

### 🟢 优势
1. **血战到底规则 90% 已实现** — 核心玩法开箱即用
2. **多人在线架构成熟** — WebSocket + Redis 水平扩展
3. **代码质量好** — TypeScript 强类型，结构清晰
4. **部署方案完整** — Docker + K8s 即用
5. **移动端成本低** — Capacitor 套壳即可

### 🟡 需要关注
1. **互包/百搭/花牌** 需要新增开发
2. **UI 需要定制** — 当前是通用样式
3. **测试覆盖** — 主要是 E2E，单元测试较少

### 📋 建议执行路径

```
第1周: Fork项目 + 环境搭建 + 规则差异清单
第2周: UI定制(牌面/配色/布局) + 基础规则调整
第3周: 互包/花牌/造反功能开发
第4周: Capacitor移动端打包 + 测试
第5周: 部署上线 + 内测
```

**结论: 推荐 fork 此项目作为基础，进行二次开发。**

---

*报告完成时间: 2026-03-23 20:12 UTC*
*分析人: MiMo*
