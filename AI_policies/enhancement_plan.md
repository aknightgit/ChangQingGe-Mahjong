# AI策略增强计划

## P1 — 争取流局路线 (STRIVE_DRAW)

### 触发条件
- 牌墙剩余 < 20 张
- 自己听牌距离 > 2（即离听牌还很远）
- tableThreat > 0.7（他家威胁大）
- 手牌生张（未在弃牌区出现过的牌）≥ 3 张

### 行为
- **弃牌**: 优先打场上已出现的熟张，不打生张，不打风箭（除非场上已出完）
- **吃碰**: 除非听牌，否则不吃不碰（减少副露，降低点炮风险）
- **目标**: 尽量让牌局流局（无人胡牌），保分

### 修改文件
- `routeEvaluator.ts` — 新增 `STRIVE_DRAW` 路线
- `types.ts` — `RouteKind` 添加 `'STRIVE_DRAW'`
- `discardPlanner.ts` — 新增防守模式打法
- `claimPlanner.ts` — 防守模式下不吃碰
- `featureExtractor.ts` — 新增生张计数、安全牌统计

---

## P1 — 他家路径感知细化

### 当前能力
- `bigOpenOpponentCount` — 识别可能在做大牌的对手
- `oneSuitOpponentCount` — 识别可能在做清一色的对手

### 改进方案
区分3种对手手牌方向：

| 方向 | 识别信号 | 应对 |
|---|---|---|
| 风一色候选 | 副露全是风箭牌/手牌打出数字牌多 | 风牌视为危险牌，弃牌回避 |
| 门清候选 | 没有副露+不吃碰+出牌规律 | 打熟张为主，减少生张 |
| 碰碰胡候选 | 副露全是碰牌（3张一组） | 少打出对子可能碰到的牌 |

### 修改文件
- `featureExtractor.ts` — 新增对手方向检测函数
- `routeEvaluator.ts` — 引入对手方向到路线评分
- `discardPlanner.ts` — 根据对手方向调整弃牌优先级

---

## P2 — 关键权重调整

### 预调参数表

| 路线 | 参数 | 当前值 | 建议值 | 理由 |
|---|---|---|---|---|
| ALL_PUNGS | upstreamRejectedLongSuit加分 | +3.2 | +8 | 上家压制自己长门时，碰碰胡是正确出路 |
| ALL_PUNGS | 全局倍数≥4加分 | +1.6 | +5 | 高倍数时做碰碰胡价值更大 |
| ALL_PUNGS | 3对起的基准评分 | 对手数≥3扣5分 | 对手数=3时0分 | 降低碰碰胡门槛 |
| HONOR_HEAVY | liveHonorCount每张加分 | +0.4 | +1.0 | 活着的风箭越多，做风一色的确定性越高 |
| HONOR_HEAVY | 风箭≥6但<7的加分 | +4 | +8 | 中间态支持不足 |
| HALF_FLUSH | allOpponentsAvoidSuit加分 | +2 | +5 | 大家都不要这门花色时是重大利好 |
| PURE_FLUSH | pureFlushUpgradeReady加分 | +8.5 (固定) | `8.5 + (20 - round)*0.5` | 早期升级溢价更高 |

### 修改文件
- `routeEvaluator.ts` — 调整上述硬编码权重
- `policyFlags.ts` — 将上述权重纳入可调参数体系

---

## P3 — 清一色升级动态评分

### 当前
`pureFlushUpgradeReady` 固定 +8.5 分

### 改进
```typescript
// 牌局越早，升级价值越高
const roundBonus = Math.max(0, (20 - estimatedRound) * 0.5)
score += 8.5 + roundBonus
```

---

## 测试验证方案

### 回归测试
1. 现有训练脚本跑200局，统计胜率/胡牌率/平均得分变化
2. 对比吞吐（每秒决策数）无显著下降

### 新功能测试
1. 争取流局：手动构造牌墙<20+手牌差+他家强的情况，验证AI主动打熟张
2. 他家路径感知：构造对手做风一色的场景，验证AI不打风牌
