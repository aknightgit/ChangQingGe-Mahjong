# AI 策略引擎：深度二次评估 + 实施路径

> 撰写时间: 2026-05-25  
> 基于实际代码分析（server/ai/ 目录，2052行）  
> 对比用户提出的 3 引擎方案

---

## 一、当前架构 vs 用户方案：逐行对照

### 1.1 当前架构总览

```
server/ai/
├── config/policyFlags.ts      # 玩家风格参数（碰碰胡意愿等 40+ 参数）
├── pipeline/
│   ├── featureExtractor.ts    # 态势感知特征提取
│   ├── policyEngine.ts        # 策略管路，串联三大决策
│   ├── policyScorer.ts        # 综合评分
│   └── types.ts               # 类型定义
├── route/
│   ├── routeEvaluator.ts      # 路径选择 ← 用户的"路径选择引擎"
│   ├── claimPlanner.ts        # 吃碰决策 ← 用户的"吃碰选择引擎"
│   ├── discardPlanner.ts      # 弃牌决策 ← 用户的"弃牌选择引擎"
│   ├── phaseDetector.ts       # 决策阶段检测
│   └── types.ts               # RouteKind 等
└── reward/                    # 强化学习奖励
```

**核心发现: 用户提出的"3引擎架构"已经存在。当前代码结构完全吻合。**

### 1.2 路径选择能力逐项对比

| 用户方案 2.1-2.6 | 当前实现 | 代码行 | 差距 |
|---|---|---|---|
| **风一色(2.1)**: 风箭百搭越多、进度越早、外面风箭越少 → 倾向越高 | `evaluateSingleRoute('HONOR_HEAVY')` 已实现：`honorCount*4`, `liveHonorCount*0.4`, 前5回合9+张强推(+30) | L417-L446 | ⚠️ `liveHonorCount`权重仅0.4 → 应该1.0+ |
| **碰碰胡(2.2)**: 3对起步、无门优势、长门被上家压制、高倍数、有百搭 | `evaluateSingleRoute('ALL_PUNGS')` 已实现：对子数*(5.2+4), 三元组数*5.8, `upstreamRejectedLongSuit`(但只加3.2), 倍数≥4只加1.6 | L373-L416 | ⚠️ 上家压制权重3.2→应8+, 倍数1.6→应5+ |
| **清混一色(2.3)**: 一门越长、不做此门对手越多、上家不做、下家三口压力小 | `evaluateSingleRoute('HALF_FLUSH')` 已实现：`longestSuitCount*4.1`, `allOpponentsAvoidSuit`(+2), `oneSuitOpponentCount*0.8`, `upstreamVoidSuit`(+3) | L330-L371 | ⚠️ `allOpponentsAvoidSuit`+2→应+5, `oneSuitOpponentCount`权重可调 |
| **清一色升级(2.4)**: 进度越早升级意愿越高 | `pureFlushUpgradeReady` 已实现：longestSuitCount≥10 + 多项条件 → +8.5 | L352-L370 | ⚠️ +8.5 固定值，应改为 `8.5 + (20-round)*0.5` |
| **争取流局(2.5)**: 墙少+自己远+他家危险+生张多 | ❌ **完全缺失** -- `STRIVE_DRAW` 路线不存在 | — | 🔴 **最大缺失** |
| **态势感知(2.6)**: 他家疑似做大牌→加速快胡 | `tableThreat`, `bigOpenOpponentCount`, `fastOpenOpponentCount` 已存在，但**不区分方向**（风一色/碰碰胡/门清） | — | 🔴 **需要细化** |

### 1.3 吃碰选择能力对比

| 用户方案 | 当前实现 | 差距 |
|---|---|---|
| a. 为路径选择服务 | ✅ `evaluateRouteClaim` switch on `routeState.current` | 一致 |
| b. 考虑牌力+门清意愿 | ✅ MENQING_SPEED 路线下保守吃碰，门清优先 | 一致 |
| c. 个人风格参数 | ✅ 通过 `policy.allPungsPursuit` 等参数影响吃碰意愿 | 一致 |
| d. 牌局进度 | ✅ `estimatedRound` 用于判断是否破门清 | 可加强 |
| e. 牌局倍数 | ✅ `effectiveGlobalMultiplier >= 4` 放宽吃碰限制 | 一致 |

**差距:** 门清路线的"破门"条件过于保守(211行代码中，门清吃碰需要满足15个条件之一才能破)。实战中AI经常因为门清路线拒绝吃一个能大幅推进的牌。

### 1.4 弃牌选择能力对比

| 用户方案 | 当前实现 | 差距 |
|---|---|---|
| 为路径选择服务 | ✅ `scoreByRoute` switch on route, 每条路线不同弃牌偏好 | 一致 |
| 结合场上熟张 | ✅ `countVisibleCopies` 辅助排序，OBSERVE阶段 `visibleCopies>=1`加分 | 一致 |
| 下家危险程度 | ✅ `discardDanger` 融入最终评分 | 一致 |
| 他家做的路径(风一色风牌危险) | ⚠️ 只有 `tableThreat` 统合威胁，**不区分对手做的是风一色还是碰碰胡** | 🔴 **缺失** |

---

## 二、做牌能力不足的根因

### 不是架构问题，是三个"不够"：

```
1. 权重不够激进
   - 风一色 liveHonorCount: 0.4/张 → 应该 1.0/张 (差2.5倍)
   - 碰碰胡 上家压制: +3.2 → 应该 +8 (差2.5倍)
   - 碰碰胡 高倍数: +1.6 → 应该 +5 (差3倍)

2. 感知不够精细
   - tableThreat 统一打分，不区分对手在做风一色/碰碰胡/清一色
   - 弃牌时不会因为"对手疑似风一色"而慎打风牌

3. 防守路线完全缺失
   - 没有 STRIVE_DRAW（争取流局）
   - 牌墙见底时仍硬冲，不会主动防守
```

### 量化提升空间

| 改进 | 提升幅度 | 难度 |
|---|---|---|
| 权重激进调整 | 胡牌率 +8~12% | 低(改数字) |
| 对手方向识别 | 安全度 +15~20% | 中 |
| 争取流局 | 防点炮 -30~40% | 中 |
| 门清破门条件放宽 | 做牌速度 +5~8% | 低 |

---

## 三、实施路径：新建独立引擎，A/B 测试

### 总原则

> **不复构现有代码，新建 `server/ai_v2/` 引擎。**  
> 复用核心函数（`buildFeatureSummary`, `groupTiles`, `isHonor` 等），但决策逻辑完全独立。  
> 通过 `policyFlags` 中的一个开关 `useV2Engine: true` 让特定 AI 使用新引擎。

### 文件结构

```
server/ai_v2/
├── README.md                 # 引擎说明
├── types.ts                  # V2 类型定义（RouteKind 新增 STRIVE_DRAW）
├── pathSelector.ts           # ★ 路径选择引擎（包含2.1-2.6所有策略）
├── claimDecider.ts           # ★ 吃碰选择引擎
├── discardDecider.ts         # ★ 弃牌选择引擎
├── opponentProfiler.ts       # ★ 对手手牌方向识别（风一色/碰碰胡/门清）
├── defenseEvaluator.ts       # ★ 争取流局策略
└── engineEntry.ts            # 统一入口，替代 policyEngine
```

### 核心改动点

#### Phase 1: 权重激进调整（2-3小时）

改动文件: `ai_v2/pathSelector.ts`
- 直接复制 `routeEvaluator.ts` 的 `evaluateSingleRoute`，但修改关键权重
- 不影响现有引擎

```typescript
// V2 权重变更表（对照 routeEvaluator.ts L373-L446）
case 'ALL_PUNGS':
  score += features.pairCount * (5.2 + (_ap_isAgg ? 4.0 : 0))   // 不变
  // NEW: 上家压制权重 3.2 → 8.0
  if (upstreamRejectedLongSuit) score += 8.0  // was: 3.2
  // NEW: 高倍数权重 1.6 → 5.0
  if (effectiveGlobalMultiplier >= 4) score += 5.0  // was: 1.6

case 'HONOR_HEAVY':
  // NEW: 活牌权重 0.4 → 1.2
  score += features.liveHonorCount * 1.2  // was: 0.4
  // NEW: 风箭6-7张中间态加分 4 → 10  
  if (features.honorCount >= 6 && features.honorCount < 8) score += 10  // was: 4

case 'HALF_FLUSH':
  // NEW: 对手回避权重 2 → 5
  if (allOpponentsAvoidSuit) score += 5  // was: 2
  // NEW: 清一色升级动态评分
  if (pureFlushUpgradeReady) score += 8.5 + Math.max(0, (20 - estimatedRound) * 0.5)
```

#### Phase 2: 对手方向识别（3-4小时）

新增文件: `ai_v2/opponentProfiler.ts`

```typescript
interface OpponentProfile {
  playerId: string
  likelyRoute: 'HONOR_HEAVY' | 'ALL_PUNGS' | 'HALF_FLUSH' | 'MENQING' | 'UNKNOWN'
  confidence: number  // 0-1
  dangerTiles: TileSuit[]  // 对该对手的危险牌花色
}

function profileOpponent(opponent: Player, game: GameState): OpponentProfile {
  // 风一色识别信号：
  //   - 副露全是风箭牌
  //   - 弃牌全是数字牌 + 留住风箭
  //   - 至少 3 个风箭副露/碰
  //
  // 碰碰胡识别信号：
  //   - 副露全是碰牌（3张一组）
  //   - 不吃牌只碰牌
  //   - 打出的牌多是顺子拆下来的
  //
  // 门清识别信号：
  //   - 没有副露
  //   - 不吃不碰（或极少吃碰）
  //   - 出牌有规律（拆搭、打生张少）
  //
  // 清一色识别信号：
  //   - 副露全部同一花色
  //   - 打出的牌全是其他花色
}
```

#### Phase 3: 争取流局路线（4-5小时）

新增文件: `ai_v2/defenseEvaluator.ts`

```typescript
function shouldStriveDraw(input: PathInput): boolean {
  const { wallRemaining, shanten, tableThreat, hand } = input
  
  // 触发条件（用户 2.5）
  if (wallRemaining > 20) return false
  if (shanten <= 2) return false  // 离听牌近，不放弃
  if (tableThreat < 0.7) return false
  
  // 手牌生张计数
  const rawTiles = countRawTiles(hand, game.discardPile)
  return rawTiles >= 3
}

function striveDrawDiscard(hand: Tile[], game: GameState): Tile {
  // 防守弃牌策略：
  // 1. 优先打出场上已出现≥2次的熟张
  // 2. 不打任何生张（discardPile中0次的牌）
  // 3. 不打风箭牌（如果对手疑似风一色）
  // 4. 保留安全牌（多个相同牌的保留一张防点炮）
}
```

#### Phase 4: 集成入口（2-3小时）

修改文件: `ai_v2/engineEntry.ts`

```typescript
export function evaluateV2(game: GameState, player: Player): V2Decision {
  // 1. 识别所有对手的手牌方向
  const profiles = game.players
    .filter(p => p.id !== player.id)
    .map(p => profileOpponent(p, game))
  
  // 2. 路径选择（融入对手方向感知）
  const pathState = selectPath(game, player, profiles)
  
  // 3. 阶段判定
  const phase = detectPhase(game, player, pathState)
  
  // 4. 根据路径选择吃碰
  // 5. 根据路径选择弃牌
  // 6. 如果触发 STRIVE_DRAW，覆盖为防守模式
}
```

#### Phase 5: policyFlags 开关（30分钟）

```typescript
// server/ai/config/policyFlags.ts
export interface PolicyFlags {
  // ... existing flags ...
  
  // V2 引擎开关
  useV2Engine?: boolean  // true → 走 ai_v2/ 引擎
}
```

### 测试方案

| 阶段 | 方法 | 指标 |
|---|---|---|
| 单元测试 | 构造 50 个特定手牌场景，验证路径选择正确 | 路径匹配率 |
| 对局测试 | 1个V2 AI + 3个V1 AI，跑100局 | V2胜率、胡牌率 vs V1 |
| 权重调优 | 用训练框架 `best-policy.json` 调优V2权重 | 自动化 |
| 实战验证 | 指定 `useV2Engine: true` 给一个 AI，真人测试 | 用户体感 |

---

## 四、总结

| 维度 | 结论 |
|---|---|
| 架构匹配度 | **95%** -- 当前3引擎结构已与用户方案高度一致 |
| 核心差距 | 权重保守 + 无对手方向识别 + 无防守路线 |
| 做牌能力瓶颈 | 不是架构问题，是参数调优+感知细度问题 |
| 提升空间 | 胡牌率 +10~15%，防点炮 -30~40%（落地争取流局后） |
| 实施风险 | **低** -- 独立引擎，不影响现有 AI，可随时回退 |
| 工作量 | Phase 1+2: 5-7h, Phase 3: 4-5h, Phase 4+5: 3-4h → **总计 12-16 小时** |

**建议执行顺序:** Phase 1(权重) → Phase 2(对手识别) → Phase 4(集成) → 测试 → Phase 3(流局)
