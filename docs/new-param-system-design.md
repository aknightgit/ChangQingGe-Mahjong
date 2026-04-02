# 长清阁麻将 AI 新参数系统 — 详细设计 v2

> 设计者：小虾米 | 日期：2026-04-02
> 状态：设计完成，待实现

---

## 架构总览

```
┌─────────────────────────────────────────────────────┐
│                    决策引擎                           │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │ 路线评分  │×│ 阶段调制  │×│    态势修正       │   │
│  │ RouteEval│  │PhaseMod  │  │SituationMod      │   │
│  └──────────┘  └──────────┘  └──────────────────┘   │
│       ↓              ↓               ↓              │
│  ┌──────────────────────────────────────────────┐   │
│  │           决策输出层                          │   │
│  │  出牌选择 │ 吃碰判断 │ 百搭部署 │ 攻守切换   │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

---

## 模块一：路线评分系统

### 1.1 六条路线定义

```typescript
enum Route {
  PURE_FLUSH    = 'pure_flush',     // 清一色 (番×10)
  ALL_PUNGS     = 'all_pungs',      // 碰碰胡 (番×4)
  HALF_FLUSH    = 'half_flush',     // 混一色 (番×2)
  ALL_WIND      = 'all_wind',       // 风一色 (番×20)
  QING_PENG     = 'qing_peng',      // 清碰 (番×40)
  FENG_PENG     = 'feng_peng',      // 风碰 (番×80)
}
```

### 1.2 路线评分公式

```typescript
function routeScore(route: Route, state: GameState): number {
  return handMatch(route, state.hand)
    * phaseMod(route, state.phase)
    * wildBoost(route, state.wildCount)
    * situationMod(route, state.situation)
}
```

### 1.3 手牌匹配度（handMatch）

每条路线有 4 个评分维度：

```typescript
function handMatch(route: Route, hand: Hand): number {
  return suitScore(route, hand)       // 花色集中 (0-30)
    + structScore(route, hand)        // 结构匹配 (0-30)
    + wildScore(route, hand)          // 百搭利用 (0-20)
    + progressScore(route, hand)      // 成型进度 (0-20)
}
```

#### 1.3.1 花色集中度（suitScore）

**参数：**
```typescript
// 花色集中度参数 (每条路线 × 每个集中率区间 = 36 个参数)
suitConcentration: {
  [Route.PURE_FLUSH]: {
    ratio_08_plus: 30,    // 集中率≥80% → 30分
    ratio_06_08:  22,     // 60-80% → 22分
    ratio_04_06:  12,     // 40-60% → 12分
    ratio_below:  3,      // <40% → 3分
  },
  [Route.ALL_PUNGS]: {
    ratio_08_plus: 10,    // 碰碰胡不太关心花色
    ratio_06_08:  8,
    ratio_04_06:  6,
    ratio_below:  4,
  },
  // ... 其他路线类似
}
```

**计算：**
```typescript
function suitScore(route: Route, hand: Hand): number {
  const suits = countBySuit(hand)  // {wan: 5, tiao: 7, bing: 2}
  const maxSuit = Math.max(...Object.values(suits))
  const ratio = maxSuit / hand.totalTiles
  const params = SUIT_CONCENTRATION[route]
  
  if (route === Route.ALL_WIND || route === Route.FENG_PENG) {
    // 风一色看风箭集中度
    const honorRatio = countHonor(hand) / hand.totalTiles
    return honorRatio >= 0.8 ? 30 : honorRatio >= 0.6 ? 22 : honorRatio >= 0.4 ? 12 : 3
  }
  
  if (ratio >= 0.8) return params.ratio_08_plus
  if (ratio >= 0.6) return params.ratio_06_08
  if (ratio >= 0.4) return params.ratio_04_06
  return params.ratio_below
}
```

#### 1.3.2 结构匹配度（structScore）

**参数：**
```typescript
// 结构匹配参数 (每条路线 × 每种结构特征 = ~48 个参数)
structWeights: {
  [Route.ALL_PUNGS]: {
    triplet_count: 10,     // 每个已有刻子 → +10
    pair_count: 5,         // 每个已有对子 → +5 (可碰成刻子)
    sequence_penalty: -3,  // 每个顺子 → -3 (碰碰胡不要顺子)
    honor_pair_bonus: 3,   // 风箭对子额外 +3
  },
  [Route.PURE_FLUSH]: {
    sequence_count: 8,     // 每个同色顺子 → +8
    triplet_count: 8,      // 每个同色刻子 → +8
    pair_count: 4,         // 同色对子 → +4
    mixed_penalty: -6,     // 异色牌每张 → -2
  },
  // ... 其他路线
}
```

#### 1.3.3 百搭利用率（wildScore）

**参数：**
```typescript
// 百搭利用率参数
wildUtilization: {
  [Route.ALL_PUNGS]: {
    per_wild_triplet: 10,   // 每张百搭补成刻子 → +10
    per_wild_pair: 5,       // 每张百搭补成对子 → +5
    excess_penalty: -3,     // 超过需要的百搭 → -3/张
  },
  [Route.PURE_FLUSH]: {
    per_wild_suit: 8,       // 每张百搭补同花色 → +8
    per_wild_triplet: 6,
    per_wild_pair: 3,
  },
  // ... 其他路线
}
```

#### 1.3.4 成型进度（progressScore）

```typescript
// 成型进度 = 已完成的必要结构数 / 总需要数
// 例：碰碰胡需要 4刻子+1对 = 5个结构
// 如果已有 2刻子+2对 → 进度 = (2 + 2×0.5) / 5 = 60%
// 分数 = 进度 × 20

progressWeights: {
  [Route.ALL_PUNGS]:   { total_structures: 5, pair_half_credit: true },
  [Route.PURE_FLUSH]:  { total_structures: 5, pair_half_credit: true },
  [Route.HALF_FLUSH]:  { total_structures: 5, pair_half_credit: true },
  [Route.ALL_WIND]:    { total_structures: 5, pair_half_credit: true },
  [Route.QING_PENG]:   { total_structures: 5, pair_half_credit: true },
  [Route.FENG_PENG]:   { total_structures: 5, pair_half_credit: true },
}
```

---

## 模块二：阶段调制系统

### 2.1 阶段判定

```typescript
function determinePhase(state: GameState): Phase {
  const concealed = state.hand.concealedTiles.length
  const melds = state.hand.exposedMelds.length
  const wall = state.wallRemaining
  
  // 取最"靠后"的判定
  if (concealed <= 7 || melds >= 3 || wall <= 40) return Phase.LATE
  if (concealed <= 9 || melds >= 2 || wall <= 60) return Phase.MID
  return Phase.EARLY
}
```

### 2.2 阶段调制系数

```typescript
// 每条路线 × 每个阶段 = 18 个参数
phaseModifiers: {
  [Route.PURE_FLUSH]:  { early: 0.8, mid: 1.2, late: 1.0 },
  [Route.ALL_PUNGS]:   { early: 1.0, mid: 1.0, late: 1.3 },  // 碰碰胡收官期更快
  [Route.HALF_FLUSH]:  { early: 1.0, mid: 1.0, late: 1.1 },
  [Route.ALL_WIND]:    { early: 1.3, mid: 0.8, late: 0.5 },  // 风一色要早期定
  [Route.QING_PENG]:   { early: 0.6, mid: 1.3, late: 1.0 },
  [Route.FENG_PENG]:   { early: 1.2, mid: 0.7, late: 0.4 },
}
```

### 2.3 阶段专属行为参数

```typescript
phaseBehavior: {
  early: {
    meldCaution: 0.7,            // 吃碰谨慎度（高=少吃碰）
    pairPreservation: 2.0,        // 对子保留权重
    honorRetention: 1.5,          // 风箭保留权重
    wildAccumulate: 0.9,          // 百搭囤积意愿
    opponentObservation: 1.0,     // 观察对手花色
    routeExplorationWidth: 3,     // 同时探索几条路线
    terminalKeepBonus: 1.0,       // 幺九保留加成
  },
  mid: {
    meldCaution: 0.3,             // 验证期可以适度吃碰
    pairPreservation: 1.0,         // 不再无条件保留对子
    honorRetention: 1.0,
    wildAccumulate: 0.5,           // 开始使用百搭
    opponentObservation: 0.8,
    routeExplorationWidth: 2,      // 收窄到2条路线
    terminalKeepBonus: 0.5,
    routeCommitThreshold: 40,      // 评分>40才确认路线
    routeSwitchPenalty: 0.7,       // 切换路线的代价
  },
  late: {
    meldCaution: 0.1,              // 收官期积极吃碰
    pairPreservation: 0.5,
    honorRetention: 0.5,
    wildAccumulate: 0.1,           // 全力投入百搭
    opponentObservation: 0.5,
    routeExplorationWidth: 1,      // 只走一条路线
    terminalKeepBonus: 0.2,
    rushThreshold: 30,             // 牌墙<30开始冲
    defenseThreshold: 20,          // 牌墙<20转防守
    safeTilePriority: 0.8,         // 安全牌优先
    intentionalDraw: 0.4,          // 主动求流局
  },
}
```

**合计：选路期7 + 验证期10 + 收官期12 = 29个阶段行为参数**

---

## 模块三：态势修正系统

### 3.1 百搭修正

```typescript
// 百搭数 × 路线类型 = 12 个参数
wildSituationMod: {
  aggressive_route: {  // 清一色/风一色/清碰/风碰
    wild_0: 0.5,
    wild_1: 1.0,
    wild_2: 1.5,
    wild_3: 2.0,
    wild_4: 2.5,
  },
  balanced_route: {    // 混一色
    wild_0: 1.0,
    wild_1: 1.0,
    wild_2: 1.0,
    wild_3: 0.8,
    wild_4: 0.6,
  },
  fast_route: {        // 碰碰胡（无百搭也能做）
    wild_0: 1.2,
    wild_1: 1.0,
    wild_2: 0.8,
    wild_3: 0.6,
    wild_4: 0.5,
  },
}
```

### 3.2 积分修正

```typescript
// 积分位置 × 路线倾向 = 6 个参数
scoreSituationMod: {
  leading: {
    aggressive: 0.7,   // 领先时少冲大牌
    defensive: 1.3,    // 领先时多防守
    balanced: 1.0,
  },
  mid: {
    aggressive: 1.0,
    defensive: 1.0,
    balanced: 1.0,
  },
  trailing: {
    aggressive: 1.5,   // 落后时冲大牌翻盘
    defensive: 0.6,
    balanced: 0.9,
  },
}
```

### 3.3 牌墙修正

```typescript
// 牌墙阶段 × 路线倾向 = 6 个参数
wallSituationMod: {
  early: {   // >60张
    aggressive: 1.2,
    fast: 0.9,
  },
  mid: {     // 30-60张
    aggressive: 1.0,
    fast: 1.0,
  },
  late: {    // <30张
    aggressive: 0.7,
    fast: 1.3,
  },
}
```

### 3.4 对手修正

```typescript
// 对手状态 × 策略响应 = 8 个参数
opponentMod: {
  opp_likely_ting: {
    offense_reduce: 0.6,      // 对手听牌时减少进攻
    safe_tile_boost: 2.0,     // 安全牌权重翻倍
  },
  opp_many_melds: {
    rush_aggression: 1.3,     // 对手很多面子→自己也要快
    defense_boost: 0.8,
  },
  opp_menqing: {
    offense_boost: 1.1,       // 对手门清→可能在做大牌
    safe_tile_boost: 1.2,
  },
  opp_discard_pattern: {
    same_suit_boost: 1.2,     // 对手打同一花色→他不要这门
    honor_discard_boost: 1.1, // 对手打风箭→风一色更容易
  },
}
```

---

## 模块四：决策输出

### 4.1 出牌决策

```typescript
function selectDiscard(hand: Tile[], routes: RouteScore[], phase: Phase): Tile {
  // 每张候选牌的"路线价值"= Σ(路线评分 × 该牌对该路线的重要性)
  const candidates = hand.map(tile => {
    const value = routes.reduce((sum, r) => {
      return sum + r.score * tileRouteValue(tile, r.route, hand)
    }, 0)
    return { tile, value }
  })
  
  // 价值最低的牌 → 打出
  return candidates.sort((a, b) => a.value - b.value)[0].tile
}

// 每张牌对每条路线的价值评分
function tileRouteValue(tile: Tile, route: Route, hand: Hand): number {
  // 通用规则：
  // - 对子中的牌 → 价值高（+10）
  // - 顺子搭子 → 价值中（+5-8）
  // - 孤张 → 价值低（+1-3）
  // - 百搭 → 价值最高（+20，除非路线不需百搭）
  
  // 路线特化：
  // - 清一色路线：同色牌 ×2，异色牌 ×0.3
  // - 碰碰胡路线：对子 ×2，顺子搭子 ×0.5
  // - 风一色路线：风箭 ×3，数牌 ×0.2
}
```

### 4.2 吃碰决策

```typescript
function shouldClaim(action: 'chow'|'peng'|'kong', tile: Tile, state: GameState): boolean {
  const routeScores = evaluateAllRoutes(state)
  const bestRoute = routeScores.sort((a,b) => b.score - a.score)[0]
  
  // 模拟吃碰后的路线评分
  const afterClaim = simulateClaim(action, tile, state)
  const afterBest = afterClaim.sort((a,b) => b.score - a.score)[0]
  
  // 收益 = 路线提升 + 速度收益 - 门清损失 - 互包风险
  const routeGain = afterBest.score - bestRoute.score
  const speedGain = state.phase === Phase.LATE ? 5 : 0
  const menqingLoss = state.isMenqing ? getMeldCost(action, state.phase) : 0
  const baoRisk = getBaoRisk(state)
  
  const netGain = routeGain + speedGain - menqingLoss - baoRisk
  const threshold = getClaimThreshold(action, state.phase)
  
  return netGain > threshold
}

// 吃碰对门清的代价（随阶段变化）
function getMeldCost(action: string, phase: Phase): number {
  if (phase === Phase.EARLY) return action === 'chow' ? 15 : 10  // 早期吃代价高
  if (phase === Phase.MID)  return action === 'chow' ? 8 : 5
  return action === 'chow' ? 3 : 2  // 收官期无所谓
}
```

### 4.3 百搭部署决策

```typescript
function deployWild(wildTile: Tile, state: GameState): DeployTarget | null {
  const routes = evaluateAllRoutes(state)
  const phase = state.phase
  
  // 每个可选部署位置的收益
  const targets = findDeployTargets(wildTile, state).map(target => {
    const simulated = simulateDeploy(wildTile, target, state)
    const gain = bestScore(simulated) - bestScore(routes)
    const urgency = phase === Phase.LATE ? 1.5 : phase === Phase.MID ? 1.0 : 0.5
    return { target, gain: gain * urgency }
  })
  
  const best = targets.sort((a,b) => b.gain - a.gain)[0]
  const threshold = WILD_DEPLOY_THRESHOLD[phase]  // 选路期: 30, 验证期: 15, 收官期: 5
  
  return best && best.gain > threshold ? best.target : null
}
```

---

## 参数汇总

| 模块 | 子模块 | 参数数 |
|------|--------|--------|
| 路线评分 | 花色集中度 | 24 |
| 路线评分 | 结构匹配度 | 48 |
| 路线评分 | 百搭利用率 | 18 |
| 路线评分 | 成型进度 | 6 |
| 阶段调制 | 阶段系数 | 18 |
| 阶段调制 | 阶段行为 | 29 |
| 态势修正 | 百搭修正 | 12 |
| 态势修正 | 积分修正 | 6 |
| 态势修正 | 牌墙修正 | 6 |
| 态势修正 | 对手修正 | 8 |
| 决策输出 | 出牌/吃碰/百搭 | 15 |
| 特殊规则 | 互包/大吊/八花 | 10 |
| **总计** | | **~200** |

---

## 实现计划

1. 创建 `RouteEvaluator` 类（路线评分）
2. 创建 `PhaseModifier` 类（阶段调制）
3. 创建 `SituationEvaluator` 类（态势修正）
4. 重构 `aiDiscard` 函数使用新系统
5. 重构 `shouldClaimPendingAction` 使用新系统
6. 更新训练脚本适配新参数
7. 运行 10×200 测试验证

---

*文档版本：v2 | 2026-04-02*
