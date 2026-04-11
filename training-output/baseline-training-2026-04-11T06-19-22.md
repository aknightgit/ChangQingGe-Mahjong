# 长清阁麻将 全员基线收敛训练日志

- 创建时间: 2026-04-11T06:19:46.084Z
- 训练脚本: train-baseline.ts
- Config: 1 rounds × 1 games = 1 total
- 模式: 4人共用同一策略，血战到最后一人
- 目标: 胡牌率≥90% 流局率<10% 血战率>80%
## 基线成绩（第0轮）
胡牌率=0.0%  流局率=100.0%  Fitness=-178454.00
---
创建时间: 2026-04-11T06:19:46.079Z
训练脚本: train-baseline.ts
Config: 1 rounds × 1 games = 1 total
---

## Round 1 (2026-04-11 06:19:46)

### 📊 训练指标 Summary

| 指标 | 值 | K哥目标 | 达标 |
|------|-----|---------|------|
| Games | 1 | — | — |
| 胡牌局 | 1 (100%) | ≥90% | ✅ |
| 流局 | 0 (0%) | <10% | ✅ |
| 血战到最后一人 | 1 (100%) | >80% | ✅ |
| 平均回合 | 83.0 | — | — |
| 平均总筹码 | 0.0 | — | — |
| 胡牌实例 | 2 | — | — |
| 自摸率(胡牌中) | 50% | 40-60% | ✅ |
| 捉冲率(胡牌中) | 50% | 40-60% | ✅ |
| 大牌率(胡牌中) | 0% | 3-8% | ❌ |
| 门清胡牌率(胡牌中) | 100% | 7-12% | ✅ |
| 高倍数局数(骰子>=2) | 0 | — | — |
| Fitness | 26315.0 | ↑ | — |

**每局获胜人数分布**（本轮所有胡牌局）

| 类型 | 局数 | 占比 |
|------|------|------|
| 单人胡牌 | 0 | 0.0% |
| 双人胡牌 | 1 | 100.0% |
| 三人胡牌 | 0 | 0.0% |
| 四人胡牌 | 0 | 0.0% |
| 多人胡牌率 | 100.0% | 目标>80% |

### 🀄 胡牌牌型分布

| 牌型 | 局数 | 占比 | K哥目标 |
|------|------|------|---------|
| 普通 | 0 | 0.0% | — |
| 混一色 | 0 | 0.0% | ≥40% |
| 碰碰胡 | 2 | 100.0% | >25% |
| 清一色 | 0 | 0.0% | >20% |
| 清碰 | 0 | 0.0% | ~5% |
| 风一色 | 0 | 0.0% | ~5% |
| 风碰 | 0 | 0.0% | ~1% |
| 混碰 | 0 | 0.0% | — |
| 八花 | 0 | 0.0% | — |
| 四百搭 | 0 | 0.0% | — |

### 最大输赢局明细（本轮）

#### 最大赢局
- 赢家: AI-老赵 | 得分: +2400 | 局号: 0
- 牌型: 碰碰胡 | 自摸: 是 | 番数: 8
- 底数: 1 | 倍数: ×1

#### 最大输局
- 无亏损局（AI-AK本轮无负收益局）

### 所有胡牌局明细（所有玩家）

**局次0**（自摸 · ×1）
  - AI-老赵: 碰碰胡 · 二万 五万 九条 五万 二条 二条 二万 八条 九条 二条 四筒* 八条 八条 五万 · (无副露) → 8点
  - AI-AK: 碰碰胡 · 六筒* 三条 三条 六条 一筒 二筒 一筒 三条 六条 二筒 一筒 二筒 九筒 九筒 · (无副露) → 10点

### 本轮最佳策略参数

```json
{
  "id": "AI-AK",
  "selfWinChance": 0.8,
  "discardHuChance": 0.8,
  "selfWinWildBoost": 0.1266871952479135,
  "discardHuWildPenalty": 0.3484112283088031,
  "discardHuMenQingPenalty": 0.11443176185539769,
  "pengChance": 1,
  "kongChance": 0.5149119649159877,
  "chowChance": 0.421327750962496,
  "anKongChance": 0.9898296447948148,
  "pengWildBoost": 0.06282849518815241,
  "kongWildBoost": 0.17074969758870698,
  "chowWildPenalty": 0.21874243251208386,
  "menqingKeepBonus": 2.6365031464327866,
  "meldPenalty": 0.025679867261555692,
  "allPungsPursuit": 0.52,
  "pureFlushPursuit": 0.39155902112680335,
  "halfFlushWeight": 0.6,
  "sevenPairsPursuit": 0.15,
  "allHonorsPursuit": 0.14083222760517888,
  "allHonorsPungsPursuit": 0.08389067735611558,
  "qingPengPursuit": 0.49316917551025014,
  "hunPengPursuit": 0.6649721376296864,
  "windEastKeep": 1.7663111765725783,
  "windSouthKeep": 2.575719909145446,
  "windWestKeep": 1.1156865715889224,
  "windNorthKeep": 0.7255064576387434,
  "windGeneralKeep": 1.5,
  "dragonRedKeep": 3.2916529588266354,
  "dragonGreenKeep": 3.0875539128574196,
  "dragonWhiteKeep": 3.2525793562282486,
  "dragonGeneralKeep": 1.6708964747800108,
  "pairWeight": 4.461113126078833,
  "nearWeight": 3.8258140895090156,
  "tripletKeepBonus": 4.157096354944348,
  "terminalPenalty": 0.6575230927938015,
  "wildKeepPenalty": 1865.7110969848993,
  "wildBailoutThreshold": 3,
  "wild0Aggression": 0.31970352051344575,
  "wild1Aggression": 0.40102709671115255,
  "wild2Aggression": 0.5978617869144395,
  "wild3PlusAggression": 0.9220505526317807,
  "wild1RouteMeldPush": 0.33893143130993125,
  "wild2RouteMeldPush": 0.6596439869769003,
  "wild3RouteMeldPush": 0.8295151961905072,
  "wild1RouteFlushBoost": 0.3094928789894137,
  "wild2RouteFlushBoost": 0.3,
  "wild3RouteFlushBoost": 0.47751980846352926,
  "wild1RouteHonorsBoost": 0,
  "wild2RouteHonorsBoost": 0.2,
  "wild3RouteHonorsBoost": 0.4,
  "wild1RouteAllPungsBoost": 0.11570717868764842,
  "wild2RouteAllPungsBoost": 0.3639007544087316,
  "wild3RouteAllPungsBoost": 0.4148522800563274,
  "wildMultLowAggression": 0.5746282795182444,
  "wildMultMidAggression": 0.5292362851551664,
  "wildMultHighAggression": 0.7466883457837815,
  "wild0MenqingKeep": 3.0702741060597987,
  "wild1MenqingKeep": 2.005138539192227,
  "wild2MenqingKeep": 1,
  "wild1BaoPush": 0.012622753400564402,
  "wild2BaoPush": 0.39006988837550205,
  "wild3BaoPush": 0.8475862350409603,
  "multLowSpeedBias": 0.5,
  "multHighValueBias": 0.7829166927551453,
  "discardObsFlushBoost": 0.3110395469495198,
  "discardObsWeight": 0.3169784141834593,
  "bao2ClaimPenalty": 0.5863659036046336,
  "bao3AvoidThreshold": 0.7624674990297111,
  "baoSelfClaimCaution": 0.34518241257548415,
  "wallEarlySpeedPush": 0.4746384248710131,
  "wallMidBalance": 0.4405118254914803,
  "wallLateDefense": 0.8293461896013391,
  "oppTingDetection": 0.5662947290114005,
  "safeTilePriority": 0.6225983733417838,
  "terminalDiscardTingSignal": 0.2917110471347582,
  "wildDiaoKeepBonus": 2.908297060009122,
  "wildDiaoFlushBoost": 1.0928343303249333,
  "wildDiaoPungBoost": 2.4861437507327993,
  "scoreBehindRiskBoost": 1.0064560779164102,
  "scoreLeadDefenseBoost": 1,
  "hand5RouteBias": 0.24656405037850915,
  "hand6RouteBias": 0.6,
  "hand7RouteBias": 0.9,
  "multLowHand5AllPungs": 0.37748726456818715,
  "multLowHand5HalfFlush": 0.43372616503943406,
  "multHighHand5AllPungs": 0.337344946620979,
  "multHighHand5HalfFlush": 0.2850975128971883,
  "multLowHand6AllPungs": 0.25,
  "multLowHand6HalfFlush": 0.2893591937147486,
  "multLowHand6PureFlush": 0.25,
  "multHighHand6AllPungs": 0.25,
  "multHighHand6HalfFlush": 0.5382505011271081,
  "multHighHand6PureFlush": 0.45,
  "multLowHand7AllPungs": 0.2,
  "multLowHand7HalfFlush": 0.33987409423574744,
  "multLowHand7PureFlush": 0.2793345675720549,
  "multHighHand7AllPungs": 0.03967369388094319,
  "multHighHand7HalfFlush": 0.4,
  "multHighHand7PureFlush": 0.6667608204361419,
  "multHighHonorStart": 0.6353334176611241,
  "speedVsValueBalance": 0.5,
  "defenseRiskAversion": 0.42466527676568333,
  "wallTilesImpact": 0.2,
  "baoRiskAversion": 0.6174292204162568,
  "baoThreshold": 4,
  "anKongAggression": 0.9564908137617628,
  "minkanAggression": 0.3782679008281927,
  "kakanAggression": 0.4092564618311265,
  "robKongAwareness": 0.4548909085267129,
  "noWildDoubleAwareness": 0.44641326791251484,
  "menqingDoubleAwareness": 0.5325238795068113,
  "flushVsPungsBalance": 0.1,
  "honorVsSuitedBalance": 0.04900714970210504,
  "sequenceVsTripletBias": 0.15,
  "wildOffenseStrategy": 0.5,
  "wildBailoutMeldBoost": 0.0635363073051163,
  "wildDefenseKeep": 0.3,
  "flowerChaseBonus": 0.5,
  "bailoutBuildWildBoost": 0.23414001285839295,
  "bailoutHuPenaltyPerMeld": 0,
  "honorRushThreshold": 3.938432939142619,
  "honorRushBoost": 0.47248580736293005,
  "honorPairBonus": 1.343825374066855,
  "dominantSuitBonus": 0,
  "honorTripletKeepBonus": 8.936635474603115,
  "windDragonPairKeepBonus": 11.836265385481415,
  "tripletComboBonus": 1.3808875380252752,
  "flushChaseBonus": 1.9372010313649672
}
```

---