# AI-AK 路线决策与动态弃牌执行方案

> 更新日期：2026-04-25
> 目标：把“吃碰为方向服务、弃牌也为方向服务”落到当前 `botService + train-ai-ak` 实现中
> 原则：保留现有向听、进张、风险评估、回归体系，不做推倒重来

---

## 1. 问题重述

当前 AI-AK 的问题不是完全没有规则，而是规则分散：

- 有静态保留分，但缺少统一的主方向。
- 有吃碰评分，但缺少“为什么要吃碰”的路线前提。
- 有弃牌危险度，但缺少“为了什么弃这张”的方向约束。
- 有训练参数，但缺少和真实决策结构一一对应的中间指标。

结果就是：

- 开局会拆门、拆搭子、拆对子。
- 中盘会在多条路线之间反复摇摆。
- 吃碰更像局部概率动作，而不是为了收束牌型。
- 即使修掉胡牌判断 bug，也难形成“收敛 -> 进听 -> 胡牌”的稳定链路。

这份方案的核心就是给 AI-AK 增加一个稳定的“路线主脑”。

---

## 2. 总体架构

将当前 bot 决策拆成 5 层：

1. `PhaseDetector`
2. `RouteEvaluator`
3. `RouteStateManager`
4. `ClaimGate`
5. `DiscardPlanner`

决策顺序：

1. 先判定当前阶段
2. 再计算所有候选路线分
3. 再结合历史路线状态决定是否锁定/旋转
4. 吃碰时先过路线门槛
5. 弃牌时在路线约束下做收益/风险精排

---

## 3. 路线集合

先不要上太多路线，先压缩成 5 类，确保行为稳定：

1. `MENQING_SPEED`
   - 默认基础路线
   - 目标是少拆搭子、少破门清、尽快自然进听

2. `OPEN_SPEED`
   - 他家明显快，或己方门清收益很低时启用
   - 目标是快速做成可胡牌型

3. `HALF_FLUSH`
   - 某一门 + 风箭/百搭明显集中
   - 包含你总结里的“混清一路”

4. `ALL_PUNGS`
   - 对子密度高、百搭可补刻、外部局势要求提速时启用

5. `HONOR_HEAVY`
   - 风箭密度高且外部风箭还活时启用
   - 包含风一色/风碰倾向

说明：

- `PURE_FLUSH`、`QING_PENG`、`FENG_PENG` 这些更激进的路线先不作为一级路线。
- 它们先作为二级奖励挂在 `HALF_FLUSH / ALL_PUNGS / HONOR_HEAVY` 上。
- 这样可以避免 AI 过早冲大牌，先恢复基础胡牌能力。

---

## 4. 阶段划分

阶段不要再用单纯“手里剩几张牌”判断。应改成“巡目 + 副露 + 墙剩 + 听牌状态”的组合判断。

### 4.1 阶段定义

1. `OBSERVE`
   - 1-5 巡
   - 目标：看长门、对子、百搭、上家不要的门、他家弃牌方向

2. `COMMIT`
   - 6-10 巡
   - 目标：开始确定路线，减少摇摆

3. `RUSH`
   - 11 巡后，或自己一向听/听牌，或他家明显很快
   - 目标：优先收口，优化听牌质量

4. `DEFENSE`
   - 他家高威胁、己方收益差、或剩墙很少
   - 目标：优先安全和止损

### 4.2 阶段切换条件

- `OBSERVE -> COMMIT`
  - 巡目 >= 6

- `COMMIT -> RUSH`
  - 己方 `shanten <= 1`
  - 或任一对手威胁 >= 阈值
  - 或剩墙 <= 阈值

- 任意阶段 -> `DEFENSE`
  - 对手听牌概率高
  - 且己方当前路线收益不够高
  - 且剩墙不足支撑继续贪进攻

---

## 5. 路线评分

路线评分要分成“静态牌型分”和“局势修正分”。

### 5.1 静态牌型分

每条路线至少看这些特征：

- `longestSuitCount`
- `secondSuitCount`
- `pairCount`
- `tripletLikeCount`
- `sequenceLikeCount`
- `honorCount`
- `honorPairCount`
- `wildCount`
- `isolatedCount`
- `deadTileCount`

### 5.2 外部局势分

结合你总结里的规则，外部信息至少看：

- 上家持续打哪一门
- 其余两家都不做哪一门
- 下家是否已经吃碰自己 2 口以上
- 是否有人 2 副露以上
- 是否有人明显做一门且开始丢风箭
- 风箭在外面还活多少

### 5.3 路线评分公式

建议先用可解释的线性打分，不要一开始上乘法模型：

```ts
routeScore =
  handBaseScore
  + outsideSignalScore
  + phaseAdjustment
  + scoreSituationAdjustment
  + wallAdjustment
```

### 5.4 各路线重点

`MENQING_SPEED`
- 搭子、两面、对子、低孤张惩罚最重要
- 对混色、大牌路线只给弱惩罚，不要过度抢方向

`OPEN_SPEED`
- 在 `MENQING_SPEED` 基础上降低门清损失
- 他家快、自己落后时加分

`HALF_FLUSH`
- 最长门 + 风箭 + 百搭联合评分
- 非目标门孤张和对子都要有明显负分

`ALL_PUNGS`
- 对子数、刻子数、百搭补刻能力加分
- 顺子搭子价值下调

`HONOR_HEAVY`
- 风箭数量、风箭对子、百搭、外部风箭存活量加分
- 数牌整体价值显著下降

---

## 6. 路线状态管理

这是整个方案能否稳定的关键。

### 6.1 新增状态

建议在 bot 决策上下文中引入：

```ts
interface RouteState {
  current: RouteKind
  secondary: RouteKind | null
  phase: DecisionPhase
  confidence: number
  lockLevel: 0 | 1 | 2
  switchCount: number
  lastUpdatedTurn: number
  commitTurn: number | null
}
```

### 6.2 锁定规则

- `OBSERVE`：允许探索，不锁死
- `COMMIT`：若第一路线领先第二路线超过阈值，则进入 `lockLevel=1`
- `RUSH`：若路线已成型，进入 `lockLevel=2`
- `DEFENSE`：不改主路线，但允许行为切到防守模式

### 6.3 旋转规则

只允许“有限旋转”：

- 新路线连续 2 巡显著领先旧路线才允许切换
- 每局切换次数限制为 1-2 次
- 已进入 `RUSH` 且 `shanten <= 1` 后，默认不再主动换主路线

这一步就是防止“今天想做混一色，下一巡又拆回门清平推”。

---

## 7. 吃碰决策改造

吃碰不再是单独概率事件，而是路线门控后的收益判断。

### 7.1 统一门槛

任何 `CHOW/PENG/KONG` 先回答两个问题：

1. 这次吃碰是否服务当前主路线或次路线？
2. 吃碰后的手牌质量是否显著优于 `PASS`？

只有两个都成立，才允许进入随机概率层。

### 7.2 路线约束

`MENQING_SPEED`
- 默认不吃不碰
- 例外：
  - 吃碰后直接进入一向听/听牌
  - 他家明显很快
  - 门清回报比已经很低

`OPEN_SPEED`
- 允许积极吃碰
- 但仍要求吃碰后有效进张不下降太多

`HALF_FLUSH`
- 只允许有利于目标门聚拢的吃碰
- 用目标门外对子去吃碰时要有高惩罚

`ALL_PUNGS`
- `PENG/KONG` 有天然加分
- `CHOW` 基本禁用，除非是极少数保命型操作

`HONOR_HEAVY`
- 风箭 `PENG` 加分
- 数牌 `CHOW` 一般应直接抑制

### 7.3 吃碰收益公式

```ts
claimNetGain =
  routeFitGain
  + shantenGain
  + effectiveGain
  + rushBonus
  - menqingLoss
  - baoRisk
  - switchPenalty
```

若 `claimNetGain < threshold`，直接 `PASS`。

---

## 8. 弃牌决策改造

弃牌从“静态坏牌排序”改成“路线一致性 + 进张收益 + 风险控制”的联合评分。

### 8.1 候选弃牌评分维度

每张候选弃牌打 4 类分：

1. `shapeScore`
   - 弃后向听
   - 弃后有效进张
   - 弃后是否进听
   - 听口数

2. `routeScore`
   - 是否保住主路线核心
   - 是否清掉非目标门废牌
   - 是否保住对子/风箭/百搭/目标门搭子

3. `timingScore`
   - 当前阶段是否该收口
   - 领先/落后时是否该保守或提速
   - 剩墙是否支持做大

4. `riskScore`
   - 熟张/半熟张/生张
   - 是否撞他家明显做的门
   - 是否是风箭活牌
   - 是否会抬高放铳风险

### 8.2 弃牌总分

```ts
discardTotal =
  shapeScore
  + routeConsistencyScore
  + timingAdjustment
  - dangerPenalty
```

### 8.3 不同路线的弃牌优先级

`MENQING_SPEED`
- 先打最短门孤张
- 再打无搭子边张
- 尽量留对子和两面

`HALF_FLUSH`
- 坚决清掉非目标门
- 非目标门对子如果会拖节奏，也要及时拆

`ALL_PUNGS`
- 优先保留所有对子
- 中张单牌若不成对、不成刻，可先弃

`HONOR_HEAVY`
- 保留风箭对子/刻子/百搭
- 数牌仅作为辅助成型资源

### 8.4 听牌优化

进入 `RUSH` 后，若有多个可听选项，不只比较“能不能听”，要比较：

- 听口数
- 剩余张数
- 预期番型
- 门清价值
- 放铳风险

这部分直接对应你总结里的：

- 回报比高：保门清/争自摸
- 回报比一般：可破门清
- 回报比极低且危险高：允许偏安全处理

---

## 9. 与当前代码的对接方式

### 9.1 第一批新增模块

建议新增：

- `server/ai/route/types.ts`
- `server/ai/route/phaseDetector.ts`
- `server/ai/route/routeEvaluator.ts`
- `server/ai/route/routeState.ts`
- `server/ai/route/discardPlanner.ts`
- `server/ai/route/claimPlanner.ts`

### 9.2 当前 `botService.ts` 的改法

第一步只做“接入”，不一次性替换全部旧逻辑。

1. 保留现有 `computeShanten / countEffectiveTiles / danger score`
2. 在 `selectDiscardTile()` 前插入 `buildRouteContext()`
3. 新的 `DiscardPlanner` 先只影响 AI-AK
4. 旧 `scoreTileForDiscard()` 先作为 fallback
5. 吃碰判断中新增 `shouldClaimByRoute()`，先只覆盖 AI-AK

### 9.3 训练脚本 `train-ai-ak.ts` 的改法

训练侧不要继续只调 policy 数字，要补诊断：

- `routeCommitRate`
- `routeFlipCount`
- `menqingHoldTurns`
- `badOpenRate`
- `forcedOpenRate`
- `tingQualityAvg`
- `routeAlignedDiscardRate`
- `deadHandRate`

这些指标先只记录，不立刻全部进 fitness。

---

## 10. 实施顺序

### 第 1 步：先恢复稳定门清收口

目标：

- AI-AK 不再中盘乱拆
- 不再无意义吃碰
- 门清进听明显增加

改动：

- 上 `PhaseDetector`
- 上 `RouteEvaluator v1`
- 路线默认以 `MENQING_SPEED` 为底
- 吃碰走强门槛

### 第 2 步：再开放有限旋转

目标：

- 会在合适时候从门清平推转到混一色/碰碰胡
- 但不会来回抖动

改动：

- 上 `RouteStateManager`
- 引入 `lockLevel / switchPenalty / switchCount`

### 第 3 步：做听牌质量优化

目标：

- 多听优于单钓
- 高风险低收益听牌会被压制

改动：

- 扩展 `DiscardPlanner`
- 扩展 `countWinningTiles` 与番型估值

### 第 4 步：训练指标入模

目标：

- 训练结果真正对齐实战决策结构

改动：

- 扩展 `train-ai-ak.ts` 报告和 fitness

---

## 11. 最小可验证目标

这一轮不是追求“聪明”，而是追求“至少像会打牌”。

建议验收门槛：

1. `AI-AK` 在最小训练样本下，`tingEntryCount` 明显高于当前基线
2. `menqingWinGames` 不再长期接近 0
3. `badOpenRate` 显著下降
4. `routeFlipCount` 控制在低位
5. 1000 局基准测试中，门清胡次数达到“至少十几次”的最低合理线

---

## 12. 第一批测试清单

先补行为回归，不先跑大训练。

### 弃牌回归

- 开局长门 + 对子时，不拆长门对子
- 观察期优先打最短门孤张
- 混一色路线锁定后，优先清非目标门
- 碰碰胡路线下，不优先拆对子去保顺子
- 晚巡高威胁时，优先安全进听而不是危险大听

### 吃碰回归

- `MENQING_SPEED` 下无明显收益时不吃
- 他家明显快时允许破门清提速
- `ALL_PUNGS` 下碰优先于吃
- `HALF_FLUSH` 下非目标门吃碰被抑制
- `HONOR_HEAVY` 下风箭碰优先级明显提高

### 路线回归

- 开局不会立即锁到激进大牌路线
- 中盘路线领先明显时会锁定
- 已锁定路线不会一巡内随意切换
- 一向听/听牌后基本不主动换主路线

---

## 13. 直接下一步

下一步不建议再先调参数，而是直接做第 1 步的代码骨架：

1. 新建 `server/ai/route/*`
2. 实现 `PhaseDetector`
3. 实现 `RouteEvaluator v1`
4. 在 `botService.ts` 中让 `AI-AK` 的弃牌先接入路线上下文
5. 补 3-5 条最关键回归测试

这一步做完后，再决定是否继续把吃碰也切过去。
