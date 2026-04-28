# 长清阁麻将 AI 策略引擎分析报告

> 基于 AI-Policy-guide.md 对照游戏引擎代码逐层审查
> 审查时间：2026-04-28

---

## 一、Guide vs 代码对照表

### 1.1 阶段层（Phase）

| Guide 要求 | 代码实现 | 状态 |
|-----------|---------|------|
| 开局观察期（前1-5巡） | `detectDecisionPhase()` → `phase=OBSERVE`（estimatedRound<6） | ✅ 已实现 |
| 中盘定向期（6-10巡） | `detectDecisionPhase()` → `phase=COMMIT`（estimatedRound≥6） | ✅ 已实现 |
| 冲刺期（进听前后） | `detectDecisionPhase()` → `phase=RUSH`（shanten≤1 或 estimatedRound≥11） | ✅ 已实现 |
| 防守/止损期（条件触发） | `detectDecisionPhase()` → `phase=DEFENSE`（tableThreat≥0.9或wall≤18） | ✅ 已实现 |
| 防守期可跨越任意巡次 | 触发条件内嵌在 `detectDecisionPhase()` 中，与其他 phase 互斥 | ⚠️ 部分实现（条件正确，但 DEFENSE 优先级仅在极端时触发）|

**代码位置**：`server/ai/route/phaseDetector.ts` — `detectDecisionPhase()`

---

### 1.2 路线评分层（Route Scoring）

| Guide 要求 | 代码实现 | 状态 |
|-----------|---------|------|
| 五条固定路线 | `ROUTES = [MENQING_SPEED, OPEN_SPEED, HALF_FLUSH, ALL_PUNGS, HONOR_HEAVY]` | ✅ 已实现 |
| 路线评分输入（14项因子） | `buildFeatureSummary()` 计算其中约10项 | ⚠️ 部分实现 |
| 路线锁定机制（lockStrength） | `routeState.lockLevel` ∈ {0,1,2}，按 phase+gap 阈值计算 | ✅ 已实现 |
| lockLevel 按阶段递进 | OBSERVE→弱锁，COMMIT/RUSH→中/强锁 | ✅ 已实现 |

**⚠️ 严重 Gap — 路线评分使用硬编码权重，与 policy 参数完全脱钩：**

`server/ai/route/routeEvaluator.ts` 中 `evaluateSingleRoute()` 的每条路线使用**写死的常数权重**：

```ts
// HONOR_HEAVY 示例（硬编码）
score += features.honorCount * 4           // 写死 4
score += features.honorPairCount * 3.5       // 写死 3.5
score += features.wildCount * 2.6            // 写死 2.6
score -= (features.longestSuitCount...) * 0.7
if (features.honorCount < 6) score -= 11   // 写死 -11

// 对比 AI-AK.json 中对应参数存在但未被引用：
// "honorPairBonus": 0, "wild0Aggression": 0.336...
```

这意味着训练时无论怎么调参，路线评分层的权重完全不变，**训练对路线评分零影响**。

**⚠️ 路线评分缺少关键输入因子：**
- Guide 要求：外部三家"已吃碰2次以上"→ `tableThreat` 有使用
- Guide 要求：外部"已明显做一门并开始打风向"→ **未实现**
- Guide 要求："我方只有约3张废牌"→ **未实现**
- Guide 要求："某一门+百搭+风箭≥7张/≥9张"→ 未作为独立条件

---

### 1.3 动作约束层（Action Constraints）

| Guide 要求 | 代码实现 | 状态 |
|-----------|---------|------|
| 二段式判断（路线+收益） | `evaluateRouteClaim()` 先 `allowed` 再 `tuneDelta` | ✅ 已实现 |
| MENQING_SPEED：默认不吃不碰 | `evaluateRouteClaim()` 返回 `{allowed: false, tuneDelta: -1.5}` | ✅ 已实现 |
| ALL_PUNGS：压低吃牌意愿 | `evaluateRouteClaim()` 返回 `tuneDelta: -2`（block chow） | ✅ 已实现 |
| HONOR_HEAVY：压低数字牌吃 | `evaluateRouteClaim()` 返回 `{allowed: false}` | ✅ 已实现 |
| HALF_FLUSH：只吃目标门 | `evaluateRouteClaim()` 检查 `!isTargetSuit` | ✅ 已实现 |
| 碰后不能摸/不能胡（长清阁规则） | 游戏层 `gameService.ts` 逻辑约束，非 botService | ✅ 规则层已实现 |
| **吃碰互斥原则（碰后只能同门吃）** | 仅对 HALF_FLUSH 有 `committedOpenSuit` 限制；**其他路线无通用互斥** | ❌ 未完整实现 |
| **吃第一口门力门槛（主门≥6张+最优门）** | 有 `openingBreakNeeds` 检查，但不完全对应"主门≥6+最优门"条件 | ⚠️ 部分实现 |
| **"碰后跨门吃"→ 强制压制** | 通用互斥规则缺失 | ❌ 未实现 |

**代码位置**：`server/ai/route/claimPlanner.ts` — `evaluateRouteClaim()`

**关键问题**：`evaluateRouteClaim()` 的 tuneDelta 全部是硬编码常数（0.15, -1.5, -2, 0.35 等），与 policy 参数完全无关。

---

### 1.4 弃牌精排层（Discard Ranking）

| Guide 要求 | 代码实现 | 状态 |
|-----------|---------|------|
| 四维综合排序（成型/路线/安全/回报） | `scoreTileForDiscard()` 有 composite 分：-shanten×100 + effective×2.5 + score | ✅ 框架已实现 |
| 路线驱动弃牌 | `scoreRouteDiscardCandidate()` 调用 `routeState` | ✅ AI-AK 已接入 |
| A. 上家方向×我方弱门优先弃 | `routeEvaluator.buildFeatureSummary()` 有 `upstreamVoidSuit`，但 **botService 未使用** | ❌ 未实现 |
| B. 最短门外面已出现孤张 | `countVisibleCopies()` 存在于弃牌评分，但**未作为 A~E 优先级** | ⚠️ 分散实现 |
| C. 最短门孤张 | 同上 | ⚠️ 分散实现 |
| D. 做不了风一色时弃风向牌 | `honorFocus` + `allHonorsPungsPursuit` 在 legacy 系统有，route 系统**未接入** | ⚠️ 部分实现 |
| E. 次短门废张 | `numberSuitCounts` 排序存在，但**无优先级顺序约束** | ⚠️ 无顺序约束 |
| **弃牌必须能回答"强化哪条路线"** | `routeState.routeScores` 存在，但**无显式弃牌理由日志** | ❌ 未实现 |

**代码位置**：`server/services/botService.ts` — `scoreTileForDiscard()` + `selectDiscardTile()`

---

### 1.5 听牌与收益风险比

| Guide 要求 | 代码实现 | 状态 |
|-----------|---------|------|
| 听口数 / 剩余张数 / 预期番数 比较 | `countWinningTilesForHand()` → tingCount；`effective` → 进张估算 | ✅ 部分实现 |
| 放铳风险 / 他家压力 | `getDiscardDangerScore()` + `estimateTableThreat()` | ✅ 已实现 |
| **听牌三档（高/中/低回报）分类** | **不存在** — 只有统一的 tingCount，没有三档分类逻辑 | ❌ 未实现 |
| **"听牌≥12张优先等自摸"** | `evaluateChowValue()` 中无此判断 | ❌ 未实现 |
| 无花自摸作为独立高收益项 | **不存在专项判断** | ❌ 未实现 |
| "能胡也不胡"止损逻辑 | 训练层 `fitness` 有惩罚，但**运行时无此决策** | ❌ 未实现 |

---

## 二、参数支持度矩阵

### 2.1 已使用且有效的参数

以下参数在代码中被实际调用，影响决策：

| 参数 | 使用位置 | 用途 |
|------|---------|------|
| `pengChance` | `shouldClaimPendingAction` | 碰牌基础概率 |
| `kongChance` / `minkanAggression` | `shouldClaimPendingAction` | 杠牌概率 |
| `chowChance` | `evaluateChowValue` | 吃牌基础分 |
| `menqingKeepBonus` | `evaluateChowValue` | 门清吃牌惩罚 |
| `allPungsPursuit` | `evaluateChowValue` + `shouldClaimPendingAction` | 碰碰胡路线→压吃 |
| `pureFlushPursuit` | `evaluateChowValue` | 清一色→异花吃惩罚 |
| `pairWeight` | `scoreTileForDiscard` | 对子保留 |
| `nearWeight` | `scoreTileForDiscard` | 相邻搭子保留 |
| `tripletKeepBonus` | `scoreTileForDiscard` | 刻子保留 |
| `dominantSuitBonus` | `scoreTileForDiscard` | 主门加分 |
| `selfWinChance` | `shouldClaimPendingAction` | 自摸意愿 |
| `discardHuChance` | `shouldClaimPendingAction` | 捉冲意愿 |
| `wallEarlySpeedPush` | `scoreTileForDiscard` | 初期加速 |
| `wallMidBalance` | `scoreTileForDiscard` | 中盘均衡 |
| `wallLateDefense` | `scoreTileForDiscard` | 后期防守 |
| `safeTilePriority` | `scoreTileForDiscard` | 安全牌优先 |
| `defenseRiskAversion` | `scoreTileForDiscard` | 防守风险厌恶 |
| `oppTingDetection` | `scoreTileForDiscard` | 听牌检测 |
| `bao2ClaimPenalty` | `shouldClaimPendingAction` | 二宝捉冲惩罚 |
| `bao3AvoidThreshold` | `shouldClaimPendingAction` | 三宝避免 |
| `baoRiskAversion` | `shouldClaimPendingAction` | 宝风险厌恶 |
| `discardHuWildPenalty` | `shouldClaimPendingAction` | 放冲百搭惩罚 |
| `discardHuMenQingPenalty` | `shouldClaimPendingAction` | 放进门清惩罚 |
| `wild0/1/2/3Aggression` | `scoreTileForDiscard` | 百搭保留倾向 |
| `speedVsValueBalance` | `scoreTileForDiscard` | 速度vs牌力平衡 |
| `discardObsFlushBoost` | `scoreTileForDiscard` | 弃牌池追花 |

**约 28 个参数**被实际使用。

### 2.2 存在但从未被代码使用的参数（Dead Parameters）

以下参数在 AI-AK.json 中定义，但在 `botService.ts`、`routeEvaluator.ts`、`claimPlanner.ts` 中**没有任何引用**：

| 死参数列表 | 说明 |
|-----------|------|
| `windEastKeep` | 风牌保留参数，未接入 |
| `windSouthKeep` | 同上 |
| `windWestKeep` | 同上 |
| `windNorthKeep` | 同上 |
| `windGeneralKeep` | 同上 |
| `dragonRedKeep` | 箭牌保留参数，未接入 |
| `dragonGreenKeep` | 同上 |
| `dragonWhiteKeep` | 同上 |
| `dragonGeneralKeep` | 同上 |
| `windDragonPairKeepBonus` | 风龙对子奖励，未接入 |
| `honorTripletKeepBonus` | 役牌刻子奖励，未接入 |
| `flushChaseBonus` | 追花奖励，未接入 |
| `tripletComboBonus` | 刻子组合奖励，未接入 |
| `hand5RouteBias` | 5张主门路线偏向，从未使用 |
| `hand6RouteBias` | 6张主门路线偏向，从未使用 |
| `hand7RouteBias` | 7张主门路线偏向，从未使用 |
| `hand8RouteBias` | 8张主门路线偏向，从未使用 |
| `hand9RouteBias` | 9张主门路线偏向，从未使用 |
| `routeCommitThreshold` | 路线锁定阈值，从未使用 |
| `routeFlipPenalty` | 换线惩罚，从未使用 |
| `allHonorsPungsPursuit` | 全役碰碰胡追求，定义但未在 route 系统接入 |
| `qingPengPursuit` | 清碰追求，未接入 |
| `hunPengPursuit` | 混碰追求，未接入 |
| `wildBailoutThreshold` | 百搭 bailout 阈值，未接入 |
| `wild1RouteMeldPush` | 百搭路线面子推进，未接入 |
| `wild2RouteMeldPush` | 同上 |
| `wild3RouteMeldPush` | 同上 |
| `wild1RouteFlushBoost` | 百搭路线清一色加成，未接入 |
| `wild2RouteFlushBoost` | 同上 |
| `wild3RouteFlushBoost` | 同上 |
| `wild1RouteHonorsBoost` | 百搭路线役牌加成，未接入 |
| `wild2RouteHonorsBoost` | 同上 |
| `wild3RouteHonorsBoost` | 同上 |
| `wild1RouteAllPungsBoost` | 百搭路线碰碰胡加成，未接入 |
| `wild2RouteAllPungsBoost` | 同上 |
| `wild3RouteAllPungsBoost` | 同上 |
| `wildMultLowAggression` | 低倍数百搭激进度，未接入 |
| `wildMultMidAggression` | 中倍数百搭激进度，未接入 |
| `wildMultHighAggression` | 高倍数百搭激进度，未接入 |
| `wild0MenqingKeep` | 无百搭时门清保留，未接入 |
| `wild1MenqingKeep` | 1百搭时门清保留，未接入 |
| `wild2MenqingKeep` | 2百搭时门清保留，未接入 |
| `wild1BaoPush` | 百搭1时bao推进，未接入 |
| `wild2BaoPush` | 百搭2时bao推进，未接入 |
| `wild3BaoPush` | 百搭3时bao推进，未接入 |
| `multHighSpeedBias` | 高倍数速度偏向，未接入 |
| `multLowSpeedBias` | 低倍数速度偏向，未接入 |
| `multHighValueBias` | 高倍数价值偏向，未接入 |
| `multMidSpeedBias` | 中倍数速度偏向，未接入 |
| `scoreBehindRiskBoost` | 落后风险加成，在 `scoreTileForDiscard` 中**已使用** | ✅ |
| `scoreLeadDefenseBoost` | 领先防守加成，在 `scoreTileForDiscard` 中**已使用** | ✅ |
| `terminalPenalty` | 幺九惩罚，在 `scoreTileForDiscard` 中**已使用** | ✅ |
| `anKongChance` | 暗杠概率，在 `tuneLiveClaimPolicy` 中**已使用** | ✅ |
| `pengWildBoost` | 百搭碰奖励，在 `shouldClaimPendingAction` 中**已使用** | ✅ |
| `kongWildBoost` | 百搭杠奖励，在 `shouldClaimPendingAction` 中**已使用** | ✅ |
| `kakanAggression` | 加杠激进，在 `shouldClaimPendingAction` 中**已使用** | ✅ |
| `anKongAggression` | 暗杠激进，在 `shouldClaimPendingAction` 中**已使用** | ✅ |
| `selfWinWildBoost` | 百搭自摸奖励，在 `shouldClaimPendingAction` 中**已使用** | ✅ |
| `baoThreshold` | 宝阈值，在 `shouldClaimPendingPending` 中**已使用** | ✅ |
| `meldPenalty` | 面子惩罚，未接入 | ❌ |
| `baoSelfClaimCaution` | 宝自摸谨慎，未接入 | ❌ |

**约 57 个参数**是死参数（未在任何代码中被引用）。

### 2.3 策略缺口（Guide 要求但无参数支撑）

| Guide 策略要求 | 对应参数需求 | 当前状态 |
|---------------|-------------|---------|
| A~E 弃牌优先级 | 上家方向×我方弱门打分 | **无参数** |
| 吃碰互斥原则 | 碰后跨门吃惩罚 | **无参数** |
| 第一口门力门槛 | 主门≥6张判断 | **无参数** |
| 初期弃牌A→B→C→D→E顺序 | 各优先级的权重因子 | **无参数** |
| 冲刺期三档回报分类 | 高/中/低回报阈值 | **无参数** |
| "听牌≥12张优先等自摸" | 自摸等待倾向 | **无参数** |
| 无花自摸专项 | 无花自摸奖励 | **无参数** |
| 路线锁定强度（lockStrength） | 各阶段 lockLevel 递进规则 | **硬编码阈值**，无参数化 |
| 路线旋转成本 | 换线时的分数惩罚 | **无参数** |

---

## 三、训练引擎性能制约分析

### 3.1 当前训练流程耗时分布

基于 `scripts/train-ai-ak.ts` 分析：

```
单局训练耗时估算：
├── 发牌（洗牌+发牌）         ~5ms
├── 4家AI决策（每轮×13+回合）  ~200-400ms（瓶颈在 canWin + shanten 计算）
│   ├── computeShanten()       每张候选 × 重复计算（无缓存跨决策共享）
│   ├── countEffectiveTiles()  最耗：穷举34种牌型
│   └── canWin()              每轮调用多次（听牌判断/吃碰评估）
├── 结算计算                   ~10ms
└── 指标统计                   ~2ms

单局约 300-500ms（取决于 wallRemaining）
600局 × 400ms ≈ 240秒（4分钟）
```

### 3.2 严重卡点

**卡点1：Shanten 计算无缓存共享（最严重）**

`computeShanten()` 在 `selectDiscardTile` 循环内对**每张候选弃牌**都调用一次（~14次/决策），且每次调用内部穷举所有34种牌型。跨决策（如不同候选的下一 shanten）没有共享缓存。

**卡点2：`countEffectiveTiles()` 穷举法**

对每张候选弃牌后的手牌，都要穷举 34×4=136 种摸牌可能来计算有效进张。这是 O(n²) 复杂度，n=手牌张数。

**卡点3：canWin 每轮多次调用**

`canWin()` 在以下场景被反复调用：
- `selectBotChowTileIds`：每个候选手牌×每个候选组合
- `shouldClaimPendingAction`：peng/chow/kong 各候选
- `countWinningTilesForHand`：每张候选弃牌后都要跑一遍

`canWin` 内部有 `tryFormMelds` + `canWin` 双重计算，无 memoization。

**卡点4：`tuneLiveClaimPolicy()` 运行时篡改参数**

```ts
// botService.ts
function tuneLiveClaimPolicy(policy: any): any {
  raise('pengChance', 0.9)    // 0.6 → 0.9
  raise('chowChance', 0.92)   // 0.65 → 0.92
  raise('kongChance', 0.72)   // 0.5 → 0.72
  lower('menqingKeepBonus', 0.35)  // 1.2 → 0.35
  lower('defenseRiskAversion', 0.16)
  ...
}
```

**训练时**用的是原始 policy 参数，**实战时**被此函数强制拉向快吃快碰。一套参数无法同时服务训练和实战，造成训练-实战不一致。

**卡点5：600局串行执行**

`train-ai-ak.ts` 中 600 局按顺序执行，无并发（Promise.all 无并行化）。即使是 4 核 CPU，也只能用单核。

### 3.3 训练指标实现状态

| 指标 | 定义 | 实现状态 |
|------|------|---------|
| `huRate` | 胡牌率 | ✅ `wins / games` |
| `drawRate` | 流局率 | ✅ `draws / games` |
| `selfDrawRate` | 自摸率 | ✅ `selfDrawGames / winnerInstances` |
| `discardWinRate` | 捉冲率 | ✅ `discardWinGames / winnerInstances` |
| `menqingWinRate` | 门清胡率 | ✅ `menqingWinGames / winnerInstances` |
| `bigHandRate` | 大牌率 | ✅ `bigWinGames / winnerInstances` |
| `routeCommitRate` | 路线锁定率 | ✅ `akRouteCommitSamples / akRouteObservationCount` |
| `routeFlipPerGame` | 换线次数/局 | ✅ `akRouteFlipCount / games` |
| `badOpenRate` | 坏开门率 | ✅ `akBadOpenCount / akOpenCount` |
| `forcedOpenRate` | 被迫破门清率 | ❌ 未实现 |
| `menqingHoldTurns` | 门清维持巡数 | ❌ 未实现 |
| `deadHandRate` | 死手率 | ❌ 未实现 |
| `tingQuality` | 听牌质量 | ❌ 未实现 |

**routeCommitRate、routeFlipPerGame、badOpenRate 的实现质量存疑**：

```ts
// train-ai-ak.ts 中的采集
const routeCommitRate = diagnostics.akRouteCommitSamples / Math.max(1, diagnostics.akRouteObservationCount)
```

这些 diagnostics 是由运行时 bot 在 `selectDiscardTile` 中采集并汇总的。需要确认：
1. AI-AK 决策时是否真的在更新 `akRouteCommitSamples`？
2. `akRouteFlipCount` 是否在路线切换时正确触发？

从代码看，`routeEvaluator` 有 `lockLevel` 字段，但 botService 中**未将其作为决策依据**，意味着诊断指标的采集可能不反映真实路线行为。

---

## 四、关键发现汇总

### 4.1 最严重问题（需立即处理）

**🔴 问题A：路线评分层与 policy 参数完全脱钩**
- `routeEvaluator.ts` 的 5 条路线全部用硬编码权重
- 57 个策略参数从未被 route 系统引用
- 训练调参对路线评分零影响
- **修复**：将 `evaluateSingleRoute()` 中的权重改为从 policy 文件读取

**🔴 问题B：弃牌 A~E 优先级无显式顺序**
- A（上家方向×我方弱门）完全没有实现
- B/C/D/E 只有分散的加分/惩罚，没有优先级顺序约束
- **修复**：在 `scoreTileForDiscard` 初期弃牌分支中显式加入 A~E 优先级打分

**🔴 问题C：吃碰互斥原则仅针对 HALF_FLUSH**
- `committedOpenSuit` 只在 HALF_FLUSH 时检查
- MENQING_SPEED 碰后跨门吃没有任何限制
- **修复**：将互斥原则提升为通用约束

**🔴 问题D：tuneLiveClaimPolicy 实战篡改参数**
- 训练参数 vs 实战参数不一致
- 训练结果无法复现到实战
- **修复**：移除 `tuneLiveClaimPolicy()` 或将其影响降到最低

### 4.2 中等问题（下一迭代处理）

**🟡 问题E：训练指标缺口**
- `forcedOpenRate`、`menqingHoldTurns`、`deadHandRate`、`tingQuality` 完全未实现
- `routeCommitRate` 等指标的实现质量存疑

**🟡 问题F：听牌三档回报分类缺失**
- "听牌≥12张优先等自摸"无代码对应
- 无花自摸无专项判断
- 高/中/低回报听牌无分类

**🟡 问题G：claimPlanner 的 tuneDelta 全部硬编码**
- 0.35, 0.15, -1.5, -2 等常数与 policy 参数无关
- 训练无法影响 claim 决策的强度

### 4.3 性能问题（影响训练效率）

**🟡 问题H：Shanten 重复计算**
- 每张候选弃牌重算一次 shanten，无跨候选缓存
- `countEffectiveTiles()` 穷举法造成 O(n²)

**🟡 问题I：600局串行执行**
- 无法利用多核并行
- 建议改为分片并行（200局×3组 Promise.all）

---

## 五、优先修复建议（按 P0/P1/P2 排序）

### P0（立即修复，影响训练有效性）

**P0-1：将 routeEvaluator 权重接入 policy 参数**
- 将 `evaluateSingleRoute()` 中的硬编码常数（4, 3.5, 2.6, 11 等）替换为 policy 参数
- 建议新增参数：`routeHonorsWeight`、`routeWildBonus`、`routePairWeight` 等
- 目标：训练调参能影响路线评分

**P0-2：移除或禁用 tuneLiveClaimPolicy()**
- 根本解决方案：让训练和实战用同一套参数
- 或将其改为可选 flag（`USE_TUNED_LIVE_CLAIM`），默认关闭
- 至少要在 `AI-AK.json` 的注释里注明此函数的实际影响

**P0-3：实现 A~E 弃牌优先级（A 项缺失最严重）**
- 在 `scoreTileForDiscard()` 初期弃牌分支中：
  - A：检测上家 void suit × 我方该门张数，合并打分
  - B/C/D/E 显式优先级排序
- 这不需要新参数，在现有 composite score 框架内加分支即可

### P1（下个迭代，影响决策质量）

**P1-1：吃碰互斥原则通用化**
- 将 `committedOpenSuit` 从 HALF_FLUSH 专属提升为通用约束
- 碰/杠后任何 CHOW 都要检查 claimTile.suit 是否与已有面子花色一致
- 可加 `crossSuitChowPenalty` 参数控制惩罚力度

**P1-2：吃第一口门力门槛**
- 在 `evaluateRouteClaim()` 的 CHOW 决策中增加：
  - 条件1：主门数牌 < 6 张 → 惩罚
  - 条件2：claimTile 不是 targetSuit → 惩罚
- 新参数：`chowFirstDoorMinTiles = 6`，`chowFirstDoorPenalty = 0.4`

**P1-3：训练指标补全**
- 实现 `forcedOpenRate`（被迫破门清）：记录 tableThreat≥0.8 时的破门清次数
- 实现 `menqingHoldTurns`：累计门清维持巡数
- 验证 `routeCommitRate` 采集逻辑是否真实反映路线锁定

**P1-4：听牌优先自摸逻辑**
- 在 `evaluateChowValue()` 增加判断：
  - `tingCount >= 12 && tableThreat < 0.5` → score -= 0.5
- 新参数：`selfDrawWaitTingThreshold = 12`，`selfDrawWaitThreatCeiling = 0.5`

### P2（长期优化，不影响当前决策正确性）

**P2-1：Shanten memoization 优化**
- 跨弃牌候选共享 shanten 中间结果
- 将 `countEffectiveTiles` 从穷举改为估算公式

**P2-2：600局并行训练**
- 改为 `GAMES_PER_ROUND / 3` 分片，Promise.all 并行
- 预期耗时从 4 分钟降到 ~1.5 分钟

**P2-3：claimPlanner tuneDelta 参数化**
- 将 claimPlanner 中的硬编码常数替换为 policy 参数
- 新参数：`claimRouteGainWeight`、`claimSpeedGainWeight`、`claimBlockPenalty`

**P2-4：无花自摸专项判断**
- 在冲刺期决策中增加无花自摸路径比较
- 新参数：`noFlowerSelfDrawBonus`

---

## 附录：两套AI系统的关系

当前代码存在**两套并行的 AI 决策系统**：

**系统1：Legacy（`botService.ts`）**
- `scoreTileForDiscard()` — 弃牌评分（policy 参数驱动）
- `evaluateChowValue()` — 吃牌评估（policy 参数驱动）
- `shouldClaimPendingAction()` — 碰/杠/胡 决策（policy 参数驱动）
- 优点：约 28 个 policy 参数真实影响决策
- 缺点：路线约束分散，弃牌优先级的 A~E 不完整

**系统2：Route（`server/ai/route/`）**
- `evaluateRouteState()` — 路线评分（**硬编码权重，零 policy 参数**）
- `claimPlanner.ts` — 动作约束（**硬编码 tuneDelta，零 policy 参数**）
- 仅对 `player.name === 'AI-AK'` 生效
- 优点：五路线 + 锁线机制框架完整
- 缺点：路线评分和 claim 决策完全不受训练影响

**AI-AK 同时运行两套系统，但 route 系统绕过了 policy 参数层。**

建议：最终目标是将两套系统合一 — 保留 route 系统的框架 + 接入 legacy 系统的 policy 参数驱动。

---

*本报告由 AI 策略分析审查生成 · 2026-04-28*
