# 长清阁麻将 全员基线收敛训练日志

- 创建时间: 2026-04-03T07:07:59.520Z
- 训练脚本: train-baseline.ts
- Config: 20 rounds × 500 games = 10000 total
- 模式: 4人共用同一策略，血战到最后一人
- 目标指标:
  - 胡牌率 ≥90% (流局 <10%)
  - 血战率 >80%
  - 自摸率 40-60%
  - 捉冲率 40-60%
  - 大牌率 3-8%
  - 门清胡牌率 7-12%

> 每轮记录训练指标 + 策略参数 + 最大输赢局明细 + 结算逐笔

## 基线成绩（第0轮）
| 指标 | 值 | 目标 |
|------|-----|------|
| 胡牌率 | 1.6% | ≥90% |
| 流局率 | 98.4% | <10% |
| 自摸率 | 87.5% | 40-60% |
| 捉冲率 | 12.5% | 40-60% |
| 血战率 | 0.0% | >80% |
| 大牌率 | 0.0% | 3-8% |
| 门清率 | 75.0% | 7-12% |
| Fitness | -2655.0 | ↑ |

### 第1轮 (强度=1.0, 停滞=0)
  C1: fitness=-2755 hu=2% self=88% disc=13% draws=492
  C2: fitness=-2732 hu=3% self=100% disc=0% draws=487
  C3: fitness=-2796 hu=1% self=100% disc=0% draws=494
  C4: fitness=-2805 hu=2% self=100% disc=0% draws=492
  C5: fitness=-2796 hu=1% self=100% disc=0% draws=494
  Best: -2732 (overall: -2655) [plateau: 1]
  指标: hu=3% self=100% disc=0% big=0% mq=71%

## Round 1 (2026-04-03T07:29:28.877Z)

### 📊 训练指标 Summary

| 指标 | 值 | K哥目标 | 达标 |
|------|-----|---------|------|
| 胡牌率 | 2.6% | ≥90% | ❌ |
| 流局率 | 97.4% | <10% | ❌ |
| 自摸率 | 100.0% | 40-60% | ❌ |
| 捉冲率 | 0.0% | 40-60% | ❌ |
| 血战率 | 7.7% | >80% | ❌ |
| 大牌率 | 0.0% | 3-8% | ❌ |
| 门清率 | 71.4% | 7-12% | ❌ |
| Fitness | -2732.3 | ↑ | — |

### 🀄 胡牌牌型分布

| 牌型 | 局数 | 占比 | K哥目标 |
|------|------|------|---------|
| 混一色 | 0 | 0.0% | ≥40% |
| 碰碰胡 | 0 | 0.0% | >25% |
| 清一色 | 0 | 0.0% | >20% |
| 清碰 | 0 | 0.0% | ~5% |
| 风一色 | 0 | 0.0% | ~5% |
| 风碰 | 0 | 0.0% | ~1% |
| 混碰 | 0 | 0.0% | — |
| 八花 | 0 | 0.0% | — |
| 四百搭 | 0 | 0.0% | — |

### 训练明细
- Games: 500
- 胡牌局: 13 (2.6%)
- 流局: 487 (97.4%)
- 血战到最后一人: 1 (7.69%)
- 平均回合: 0.00
- 平均总筹码: 0.00
- 自摸率(胡牌中): 100.00%
- 大牌率(胡牌中): 0.00%
- 门清胡牌率(胡牌中): 71.43%
- 胜者平均最终点: 0.00
- Fitness: -2732.2527

### 本轮最佳策略参数
```json
{
  "id": "AI-AK",
  "selfWinChance": 0.7665253481186775,
  "discardHuChance": 0.7,
  "selfWinWildBoost": 0.13672169994856734,
  "discardHuWildPenalty": 0.35,
  "discardHuMenQingPenalty": 0.12,
  "pengChance": 0.938789252678985,
  "kongChance": 0.4889073961745143,
  "chowChance": 0.14827368164610186,
  "anKongChance": 0.9898296447948148,
  "pengWildBoost": 0.06282849518815241,
  "kongWildBoost": 0.17074969758870698,
  "chowWildPenalty": 0.22,
  "menqingKeepBonus": 3.688699513668223,
  "meldPenalty": 0.026829650548748255,
  "allPungsPursuit": 0.6548094746937847,
  "pureFlushPursuit": 0.5,
  "halfFlushWeight": 0.6,
  "sevenPairsPursuit": 0.15,
  "allHonorsPursuit": 0.14083222760517888,
  "allHonorsPungsPursuit": 0.08389067735611558,
  "qingPengPursuit": 0.2,
  "hunPengPursuit": 0.5442411827354836,
  "windEastKeep": 2,
  "windSouthKeep": 2.4258378922864416,
  "windWestKeep": 1,
  "windNorthKeep": 0.7255064576387434,
  "windGeneralKeep": 1.5,
  "dragonRedKeep": 3.2916529588266354,
  "dragonGreenKeep": 3,
  "dragonWhiteKeep": 2.9818362851231037,
  "dragonGeneralKeep": 2.2527203988726976,
  "pairWeight": 3.992699453749083,
  "nearWeight": 4.0357824313562745,
  "tripletKeepBonus": 4.157096354944348,
  "terminalPenalty": 1,
  "wildKeepPenalty": 1682.511573348901,
  "wildBailoutThreshold": 3,
  "wild0Aggression": 0.3360843092809285,
  "wild1Aggression": 0.45116098936330645,
  "wild2Aggression": 0.6437095100532275,
  "wild3PlusAggression": 0.9,
  "wild1RouteMeldPush": 0.2878493654986665,
  "wild2RouteMeldPush": 0.6,
  "wild3RouteMeldPush": 0.8,
  "wild1RouteFlushBoost": 0.33459464431743774,
  "wild2RouteFlushBoost": 0.3,
  "wild3RouteFlushBoost": 0.47751980846352926,
  "wild1RouteHonorsBoost": 0,
  "wild2RouteHonorsBoost": 0.2479866123149819,
  "wild3RouteHonorsBoost": 0.4,
  "wild1RouteAllPungsBoost": 0.15,
  "wild2RouteAllPungsBoost": 0.35,
  "wild3RouteAllPungsBoost": 0.5011231296290346,
  "wildMultLowAggression": 0.531984642444706,
  "wildMultMidAggression": 0.5,
  "wildMultHighAggression": 0.8,
  "wild0MenqingKeep": 3,
  "wild1MenqingKeep": 2.005138539192227,
  "wild2MenqingKeep": 1,
  "wild1BaoPush": 0.08669062614139302,
  "wild2BaoPush": 0.43380633786682715,
  "wild3BaoPush": 0.8,
  "multLowSpeedBias": 0.5,
  "multHighValueBias": 0.7829166927551453,
  "discardObsFlushBoost": 0.36307896298061015,
  "discardObsWeight": 0.3169784141834593,
  "bao2ClaimPenalty": 0.5522921350775664,
  "bao3AvoidThreshold": 0.7145038520760525,
  "baoSelfClaimCaution": 0.34518241257548415,
  "wallEarlySpeedPush": 0.24192205524317123,
  "wallMidBalance": 0.4405118254914803,
  "wallLateDefense": 0.8293461896013391,
  "oppTingDetection": 0.5,
  "safeTilePriority": 0.6225983733417838,
  "terminalDiscardTingSignal": 0.2917110471347582,
  "wildDiaoKeepBonus": 2.908297060009122,
  "wildDiaoFlushBoost": 1.0928343303249333,
  "wildDiaoPungBoost": 2.4861437507327993,
  "scoreBehindRiskBoost": 1.0064560779164102,
  "scoreLeadDefenseBoost": 1,
  "hand5RouteBias": 0.2590273941175259,
  "hand6RouteBias": 0.6,
  "hand7RouteBias": 0.9,
  "multLowHand5AllPungs": 0.4575758444068891,
  "multLowHand5HalfFlush": 0.3668131156862125,
  "multHighHand5AllPungs": 0.35,
  "multHighHand5HalfFlush": 0.2850975128971883,
  "multLowHand6AllPungs": 0.25,
  "multLowHand6HalfFlush": 0.286611677554435,
  "multLowHand6PureFlush": 0.25,
  "multHighHand6AllPungs": 0.25,
  "multHighHand6HalfFlush": 0.55,
  "multHighHand6PureFlush": 0.45,
  "multLowHand7AllPungs": 0.2,
  "multLowHand7HalfFlush": 0.4,
  "multLowHand7PureFlush": 0.309818294975893,
  "multHighHand7AllPungs": 0.07987827314178728,
  "multHighHand7HalfFlush": 0.4,
  "multHighHand7PureFlush": 0.7,
  "multHighHonorStart": 0.6353334176611241,
  "speedVsValueBalance": 0.5,
  "defenseRiskAversion": 0.42466527676568333,
  "wallTilesImpact": 0.2,
  "baoRiskAversion": 0.4666330346059575,
  "baoThreshold": 2.001366078229792,
  "anKongAggression": 0.9564908137617628,
  "minkanAggression": 0.3782679008281927,
  "kakanAggression": 0.4092564618311265,
  "robKongAwareness": 0.4548909085267129,
  "noWildDoubleAwareness": 0.5,
  "menqingDoubleAwareness": 0.5325238795068113,
  "flushVsPungsBalance": 0.1,
  "honorVsSuitedBalance": 0.013107776967033927,
  "sequenceVsTripletBias": -0.2,
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

### 最大输赢局明细（本轮）
- 本轮无有效对局数据


### 第2轮 (强度=1.0, 停滞=1)
  C1: fitness=-2727 hu=2% self=90% disc=10% draws=490
  C2: fitness=-2859 hu=1% self=100% disc=0% draws=493
  C3: fitness=-2688 hu=1% self=100% disc=0% draws=493
  C4: fitness=-2871 hu=1% self=100% disc=0% draws=496
  C5: fitness=-2539 hu=1% self=57% disc=43% draws=493
  ★ NEW BEST! fitness=-2539
  指标: hu=1% self=57% disc=43% big=0% mq=100%

## Round 2 (2026-04-03T07:47:09.166Z)

### 📊 训练指标 Summary

| 指标 | 值 | K哥目标 | 达标 |
|------|-----|---------|------|
| 胡牌率 | 1.4% | ≥90% | ❌ |
| 流局率 | 98.6% | <10% | ❌ |
| 自摸率 | 57.1% | 40-60% | ✅ |
| 捉冲率 | 42.9% | 40-60% | ✅ |
| 血战率 | 0.0% | >80% | ❌ |
| 大牌率 | 0.0% | 3-8% | ❌ |
| 门清率 | 100.0% | 7-12% | ❌ |
| Fitness | -2539.0 | ↑ | — |

### 🀄 胡牌牌型分布

| 牌型 | 局数 | 占比 | K哥目标 |
|------|------|------|---------|
| 混一色 | 0 | 0.0% | ≥40% |
| 碰碰胡 | 0 | 0.0% | >25% |
| 清一色 | 0 | 0.0% | >20% |
| 清碰 | 0 | 0.0% | ~5% |
| 风一色 | 0 | 0.0% | ~5% |
| 风碰 | 0 | 0.0% | ~1% |
| 混碰 | 0 | 0.0% | — |
| 八花 | 0 | 0.0% | — |
| 四百搭 | 0 | 0.0% | — |

### 训练明细
- Games: 500
- 胡牌局: 7 (1.4%)
- 流局: 493 (98.6%)
- 血战到最后一人: 0 (0.00%)
- 平均回合: 0.00
- 平均总筹码: 0.00
- 自摸率(胡牌中): 57.14%
- 大牌率(胡牌中): 0.00%
- 门清胡牌率(胡牌中): 100.00%
- 胜者平均最终点: 0.00
- Fitness: -2539.0000

### 本轮最佳策略参数
```json
{
  "id": "AI-AK",
  "selfWinChance": 0.7665253481186775,
  "discardHuChance": 0.7,
  "selfWinWildBoost": 0.13672169994856734,
  "discardHuWildPenalty": 0.35,
  "discardHuMenQingPenalty": 0.12,
  "pengChance": 0.938789252678985,
  "kongChance": 0.4889073961745143,
  "chowChance": 0.14827368164610186,
  "anKongChance": 0.9898296447948148,
  "pengWildBoost": 0.06282849518815241,
  "kongWildBoost": 0.17074969758870698,
  "chowWildPenalty": 0.22587145833707756,
  "menqingKeepBonus": 3.688699513668223,
  "meldPenalty": 0.026829650548748255,
  "allPungsPursuit": 0.7356301930693369,
  "pureFlushPursuit": 0.5,
  "halfFlushWeight": 0.6,
  "sevenPairsPursuit": 0.15,
  "allHonorsPursuit": 0.14083222760517888,
  "allHonorsPungsPursuit": 0.08389067735611558,
  "qingPengPursuit": 0.2,
  "hunPengPursuit": 0.5442411827354836,
  "windEastKeep": 2,
  "windSouthKeep": 2.4258378922864416,
  "windWestKeep": 1,
  "windNorthKeep": 0.7255064576387434,
  "windGeneralKeep": 1.5,
  "dragonRedKeep": 3.2916529588266354,
  "dragonGreenKeep": 3,
  "dragonWhiteKeep": 2.9818362851231037,
  "dragonGeneralKeep": 2.2527203988726976,
  "pairWeight": 3.992699453749083,
  "nearWeight": 4.0357824313562745,
  "tripletKeepBonus": 4.157096354944348,
  "terminalPenalty": 1,
  "wildKeepPenalty": 1682.511573348901,
  "wildBailoutThreshold": 3,
  "wild0Aggression": 0.3360843092809285,
  "wild1Aggression": 0.45116098936330645,
  "wild2Aggression": 0.6378481052620164,
  "wild3PlusAggression": 0.9,
  "wild1RouteMeldPush": 0.2878493654986665,
  "wild2RouteMeldPush": 0.5937240373422189,
  "wild3RouteMeldPush": 0.8,
  "wild1RouteFlushBoost": 0.33459464431743774,
  "wild2RouteFlushBoost": 0.3,
  "wild3RouteFlushBoost": 0.47751980846352926,
  "wild1RouteHonorsBoost": 0,
  "wild2RouteHonorsBoost": 0.18985727702389926,
  "wild3RouteHonorsBoost": 0.4,
  "wild1RouteAllPungsBoost": 0.15,
  "wild2RouteAllPungsBoost": 0.35,
  "wild3RouteAllPungsBoost": 0.516074766687997,
  "wildMultLowAggression": 0.531984642444706,
  "wildMultMidAggression": 0.5,
  "wildMultHighAggression": 0.8,
  "wild0MenqingKeep": 2.945608954702667,
  "wild1MenqingKeep": 2.005138539192227,
  "wild2MenqingKeep": 1,
  "wild1BaoPush": 0.08669062614139302,
  "wild2BaoPush": 0.43380633786682715,
  "wild3BaoPush": 0.8,
  "multLowSpeedBias": 0.5,
  "multHighValueBias": 0.7829166927551453,
  "discardObsFlushBoost": 0.36307896298061015,
  "discardObsWeight": 0.3169784141834593,
  "bao2ClaimPenalty": 0.5522921350775664,
  "bao3AvoidThreshold": 0.7145038520760525,
  "baoSelfClaimCaution": 0.34518241257548415,
  "wallEarlySpeedPush": 0.20686863622758161,
  "wallMidBalance": 0.4405118254914803,
  "wallLateDefense": 0.8293461896013391,
  "oppTingDetection": 0.5,
  "safeTilePriority": 0.6225983733417838,
  "terminalDiscardTingSignal": 0.2917110471347582,
  "wildDiaoKeepBonus": 2.908297060009122,
  "wildDiaoFlushBoost": 1.0928343303249333,
  "wildDiaoPungBoost": 2.4861437507327993,
  "scoreBehindRiskBoost": 1.0064560779164102,
  "scoreLeadDefenseBoost": 1,
  "hand5RouteBias": 0.2590273941175259,
  "hand6RouteBias": 0.6,
  "hand7RouteBias": 0.9,
  "multLowHand5AllPungs": 0.4575758444068891,
  "multLowHand5HalfFlush": 0.3668131156862125,
  "multHighHand5AllPungs": 0.35,
  "multHighHand5HalfFlush": 0.2850975128971883,
  "multLowHand6AllPungs": 0.25,
  "multLowHand6HalfFlush": 0.286611677554435,
  "multLowHand6PureFlush": 0.25,
  "multHighHand6AllPungs": 0.25,
  "multHighHand6HalfFlush": 0.55,
  "multHighHand6PureFlush": 0.45,
  "multLowHand7AllPungs": 0.2,
  "multLowHand7HalfFlush": 0.4,
  "multLowHand7PureFlush": 0.309818294975893,
  "multHighHand7AllPungs": 0.07987827314178728,
  "multHighHand7HalfFlush": 0.4,
  "multHighHand7PureFlush": 0.7,
  "multHighHonorStart": 0.6353334176611241,
  "speedVsValueBalance": 0.5,
  "defenseRiskAversion": 0.42466527676568333,
  "wallTilesImpact": 0.2,
  "baoRiskAversion": 0.4666330346059575,
  "baoThreshold": 2.001366078229792,
  "anKongAggression": 0.9564908137617628,
  "minkanAggression": 0.3782679008281927,
  "kakanAggression": 0.4092564618311265,
  "robKongAwareness": 0.4548909085267129,
  "noWildDoubleAwareness": 0.5,
  "menqingDoubleAwareness": 0.5325238795068113,
  "flushVsPungsBalance": 0.1,
  "honorVsSuitedBalance": -0.06499699959801614,
  "sequenceVsTripletBias": -0.2,
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

### 最大输赢局明细（本轮）
- 本轮无有效对局数据


### 第3轮 (强度=1.0, 停滞=0)
  C1: fitness=-2700 hu=3% self=92% disc=8% draws=487
  C2: fitness=-2596 hu=1% self=83% disc=17% draws=494
  C3: fitness=-2784 hu=2% self=100% disc=0% draws=489
  C4: fitness=-2555 hu=2% self=75% disc=25% draws=492
  C5: fitness=-2687 hu=2% self=90% disc=10% draws=490
  Best: -2555 (overall: -2539) [plateau: 1]
  指标: hu=2% self=75% disc=25% big=0% mq=75%

## Round 3 (2026-04-03T08:04:40.934Z)

### 📊 训练指标 Summary

| 指标 | 值 | K哥目标 | 达标 |
|------|-----|---------|------|
| 胡牌率 | 1.6% | ≥90% | ❌ |
| 流局率 | 98.4% | <10% | ❌ |
| 自摸率 | 75.0% | 40-60% | ❌ |
| 捉冲率 | 25.0% | 40-60% | ❌ |
| 血战率 | 0.0% | >80% | ❌ |
| 大牌率 | 0.0% | 3-8% | ❌ |
| 门清率 | 75.0% | 7-12% | ❌ |
| Fitness | -2555.0 | ↑ | — |

### 🀄 胡牌牌型分布

| 牌型 | 局数 | 占比 | K哥目标 |
|------|------|------|---------|
| 混一色 | 0 | 0.0% | ≥40% |
| 碰碰胡 | 0 | 0.0% | >25% |
| 清一色 | 0 | 0.0% | >20% |
| 清碰 | 0 | 0.0% | ~5% |
| 风一色 | 0 | 0.0% | ~5% |
| 风碰 | 0 | 0.0% | ~1% |
| 混碰 | 0 | 0.0% | — |
| 八花 | 0 | 0.0% | — |
| 四百搭 | 0 | 0.0% | — |

### 训练明细
- Games: 500
- 胡牌局: 8 (1.6%)
- 流局: 492 (98.4%)
- 血战到最后一人: 0 (0.00%)
- 平均回合: 0.00
- 平均总筹码: 0.00
- 自摸率(胡牌中): 75.00%
- 大牌率(胡牌中): 0.00%
- 门清胡牌率(胡牌中): 75.00%
- 胜者平均最终点: 0.00
- Fitness: -2555.0000

### 本轮最佳策略参数
```json
{
  "id": "AI-AK",
  "selfWinChance": 0.7665253481186775,
  "discardHuChance": 0.7,
  "selfWinWildBoost": 0.13672169994856734,
  "discardHuWildPenalty": 0.35,
  "discardHuMenQingPenalty": 0.12,
  "pengChance": 0.938789252678985,
  "kongChance": 0.4889073961745143,
  "chowChance": 0.14827368164610186,
  "anKongChance": 0.9898296447948148,
  "pengWildBoost": 0.06282849518815241,
  "kongWildBoost": 0.17074969758870698,
  "chowWildPenalty": 0.22587145833707756,
  "menqingKeepBonus": 3.688699513668223,
  "meldPenalty": 0.026829650548748255,
  "allPungsPursuit": 0.7356301930693369,
  "pureFlushPursuit": 0.5,
  "halfFlushWeight": 0.6,
  "sevenPairsPursuit": 0.15,
  "allHonorsPursuit": 0.14083222760517888,
  "allHonorsPungsPursuit": 0.08389067735611558,
  "qingPengPursuit": 0.2,
  "hunPengPursuit": 0.5442411827354836,
  "windEastKeep": 2,
  "windSouthKeep": 2.4258378922864416,
  "windWestKeep": 1,
  "windNorthKeep": 0.7255064576387434,
  "windGeneralKeep": 1.5,
  "dragonRedKeep": 3.2916529588266354,
  "dragonGreenKeep": 3,
  "dragonWhiteKeep": 2.9818362851231037,
  "dragonGeneralKeep": 2.2527203988726976,
  "pairWeight": 3.992699453749083,
  "nearWeight": 4.0357824313562745,
  "tripletKeepBonus": 4.157096354944348,
  "terminalPenalty": 1,
  "wildKeepPenalty": 1682.511573348901,
  "wildBailoutThreshold": 3,
  "wild0Aggression": 0.3360843092809285,
  "wild1Aggression": 0.45116098936330645,
  "wild2Aggression": 0.6378481052620164,
  "wild3PlusAggression": 0.9,
  "wild1RouteMeldPush": 0.2878493654986665,
  "wild2RouteMeldPush": 0.5937240373422189,
  "wild3RouteMeldPush": 0.8,
  "wild1RouteFlushBoost": 0.33459464431743774,
  "wild2RouteFlushBoost": 0.3,
  "wild3RouteFlushBoost": 0.47751980846352926,
  "wild1RouteHonorsBoost": 0,
  "wild2RouteHonorsBoost": 0.18985727702389926,
  "wild3RouteHonorsBoost": 0.4,
  "wild1RouteAllPungsBoost": 0.15,
  "wild2RouteAllPungsBoost": 0.35,
  "wild3RouteAllPungsBoost": 0.516074766687997,
  "wildMultLowAggression": 0.531984642444706,
  "wildMultMidAggression": 0.5,
  "wildMultHighAggression": 0.8,
  "wild0MenqingKeep": 2.945608954702667,
  "wild1MenqingKeep": 2.005138539192227,
  "wild2MenqingKeep": 1,
  "wild1BaoPush": 0.08669062614139302,
  "wild2BaoPush": 0.3857515030292985,
  "wild3BaoPush": 0.8,
  "multLowSpeedBias": 0.5,
  "multHighValueBias": 0.7829166927551453,
  "discardObsFlushBoost": 0.36307896298061015,
  "discardObsWeight": 0.3169784141834593,
  "bao2ClaimPenalty": 0.5522921350775664,
  "bao3AvoidThreshold": 0.7145038520760525,
  "baoSelfClaimCaution": 0.3679133513510227,
  "wallEarlySpeedPush": 0.20686863622758161,
  "wallMidBalance": 0.4405118254914803,
  "wallLateDefense": 0.8293461896013391,
  "oppTingDetection": 0.5,
  "safeTilePriority": 0.6225983733417838,
  "terminalDiscardTingSignal": 0.2917110471347582,
  "wildDiaoKeepBonus": 2.908297060009122,
  "wildDiaoFlushBoost": 1.0928343303249333,
  "wildDiaoPungBoost": 2.4861437507327993,
  "scoreBehindRiskBoost": 1.0064560779164102,
  "scoreLeadDefenseBoost": 1,
  "hand5RouteBias": 0.2590273941175259,
  "hand6RouteBias": 0.6204940223288138,
  "hand7RouteBias": 0.9,
  "multLowHand5AllPungs": 0.4575758444068891,
  "multLowHand5HalfFlush": 0.3668131156862125,
  "multHighHand5AllPungs": 0.35,
  "multHighHand5HalfFlush": 0.2850975128971883,
  "multLowHand6AllPungs": 0.25,
  "multLowHand6HalfFlush": 0.286611677554435,
  "multLowHand6PureFlush": 0.25,
  "multHighHand6AllPungs": 0.25,
  "multHighHand6HalfFlush": 0.55,
  "multHighHand6PureFlush": 0.45,
  "multLowHand7AllPungs": 0.2,
  "multLowHand7HalfFlush": 0.4,
  "multLowHand7PureFlush": 0.309818294975893,
  "multHighHand7AllPungs": 0.07987827314178728,
  "multHighHand7HalfFlush": 0.34256137827347316,
  "multHighHand7PureFlush": 0.7,
  "multHighHonorStart": 0.6353334176611241,
  "speedVsValueBalance": 0.5,
  "defenseRiskAversion": 0.42466527676568333,
  "wallTilesImpact": 0.2,
  "baoRiskAversion": 0.4666330346059575,
  "baoThreshold": 2.001366078229792,
  "anKongAggression": 0.9564908137617628,
  "minkanAggression": 0.3782679008281927,
  "kakanAggression": 0.4092564618311265,
  "robKongAwareness": 0.4548909085267129,
  "noWildDoubleAwareness": 0.5,
  "menqingDoubleAwareness": 0.5325238795068113,
  "flushVsPungsBalance": 0.1,
  "honorVsSuitedBalance": -0.06499699959801614,
  "sequenceVsTripletBias": -0.2,
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

### 最大输赢局明细（本轮）
- 本轮无有效对局数据


### 第4轮 (强度=1.0, 停滞=1)
  C1: fitness=-2859 hu=1% self=100% disc=0% draws=493
  C2: fitness=-2577 hu=3% self=77% disc=23% draws=487
  C3: fitness=-2608 hu=3% self=85% disc=15% draws=487
  C4: fitness=-2584 hu=2% self=78% disc=22% draws=491
  C5: fitness=-2705 hu=2% self=100% disc=0% draws=492
  Best: -2577 (overall: -2539) [plateau: 2]
  指标: hu=3% self=77% disc=23% big=0% mq=69%

## Round 4 (2026-04-03T08:22:15.054Z)

### 📊 训练指标 Summary

| 指标 | 值 | K哥目标 | 达标 |
|------|-----|---------|------|
| 胡牌率 | 2.6% | ≥90% | ❌ |
| 流局率 | 97.4% | <10% | ❌ |
| 自摸率 | 76.9% | 40-60% | ❌ |
| 捉冲率 | 23.1% | 40-60% | ❌ |
| 血战率 | 0.0% | >80% | ❌ |
| 大牌率 | 0.0% | 3-8% | ❌ |
| 门清率 | 69.2% | 7-12% | ❌ |
| Fitness | -2577.3 | ↑ | — |

### 🀄 胡牌牌型分布

| 牌型 | 局数 | 占比 | K哥目标 |
|------|------|------|---------|
| 混一色 | 0 | 0.0% | ≥40% |
| 碰碰胡 | 0 | 0.0% | >25% |
| 清一色 | 0 | 0.0% | >20% |
| 清碰 | 0 | 0.0% | ~5% |
| 风一色 | 0 | 0.0% | ~5% |
| 风碰 | 0 | 0.0% | ~1% |
| 混碰 | 0 | 0.0% | — |
| 八花 | 0 | 0.0% | — |
| 四百搭 | 0 | 0.0% | — |

### 训练明细
- Games: 500
- 胡牌局: 13 (2.6%)
- 流局: 487 (97.4%)
- 血战到最后一人: 0 (0.00%)
- 平均回合: 0.00
- 平均总筹码: 0.00
- 自摸率(胡牌中): 76.92%
- 大牌率(胡牌中): 0.00%
- 门清胡牌率(胡牌中): 69.23%
- 胜者平均最终点: 0.00
- Fitness: -2577.3077

### 本轮最佳策略参数
```json
{
  "id": "AI-AK",
  "selfWinChance": 0.7665253481186775,
  "discardHuChance": 0.7,
  "selfWinWildBoost": 0.13672169994856734,
  "discardHuWildPenalty": 0.35,
  "discardHuMenQingPenalty": 0.12,
  "pengChance": 0.938789252678985,
  "kongChance": 0.4889073961745143,
  "chowChance": 0.14827368164610186,
  "anKongChance": 0.9898296447948148,
  "pengWildBoost": 0.06282849518815241,
  "kongWildBoost": 0.17074969758870698,
  "chowWildPenalty": 0.22587145833707756,
  "menqingKeepBonus": 3.688699513668223,
  "meldPenalty": 0.026829650548748255,
  "allPungsPursuit": 0.7356301930693369,
  "pureFlushPursuit": 0.5,
  "halfFlushWeight": 0.6,
  "sevenPairsPursuit": 0.15,
  "allHonorsPursuit": 0.14083222760517888,
  "allHonorsPungsPursuit": 0.08389067735611558,
  "qingPengPursuit": 0.2,
  "hunPengPursuit": 0.5442411827354836,
  "windEastKeep": 2,
  "windSouthKeep": 2.4258378922864416,
  "windWestKeep": 1,
  "windNorthKeep": 0.7255064576387434,
  "windGeneralKeep": 1.5,
  "dragonRedKeep": 3.168667839175655,
  "dragonGreenKeep": 3,
  "dragonWhiteKeep": 2.9818362851231037,
  "dragonGeneralKeep": 2.2527203988726976,
  "pairWeight": 3.992699453749083,
  "nearWeight": 4.0357824313562745,
  "tripletKeepBonus": 4.157096354944348,
  "terminalPenalty": 1,
  "wildKeepPenalty": 1682.511573348901,
  "wildBailoutThreshold": 3,
  "wild0Aggression": 0.3360843092809285,
  "wild1Aggression": 0.45116098936330645,
  "wild2Aggression": 0.6378481052620164,
  "wild3PlusAggression": 0.9,
  "wild1RouteMeldPush": 0.2878493654986665,
  "wild2RouteMeldPush": 0.5937240373422189,
  "wild3RouteMeldPush": 0.8,
  "wild1RouteFlushBoost": 0.33459464431743774,
  "wild2RouteFlushBoost": 0.3,
  "wild3RouteFlushBoost": 0.47751980846352926,
  "wild1RouteHonorsBoost": 0,
  "wild2RouteHonorsBoost": 0.18985727702389926,
  "wild3RouteHonorsBoost": 0.4,
  "wild1RouteAllPungsBoost": 0.15,
  "wild2RouteAllPungsBoost": 0.35,
  "wild3RouteAllPungsBoost": 0.516074766687997,
  "wildMultLowAggression": 0.531984642444706,
  "wildMultMidAggression": 0.5,
  "wildMultHighAggression": 0.8,
  "wild0MenqingKeep": 2.945608954702667,
  "wild1MenqingKeep": 2.005138539192227,
  "wild2MenqingKeep": 1,
  "wild1BaoPush": 0.08669062614139302,
  "wild2BaoPush": 0.43380633786682715,
  "wild3BaoPush": 0.8,
  "multLowSpeedBias": 0.5,
  "multHighValueBias": 0.7829166927551453,
  "discardObsFlushBoost": 0.36307896298061015,
  "discardObsWeight": 0.3169784141834593,
  "bao2ClaimPenalty": 0.5522921350775664,
  "bao3AvoidThreshold": 0.7145038520760525,
  "baoSelfClaimCaution": 0.34518241257548415,
  "wallEarlySpeedPush": 0.20686863622758161,
  "wallMidBalance": 0.4405118254914803,
  "wallLateDefense": 0.8293461896013391,
  "oppTingDetection": 0.5,
  "safeTilePriority": 0.6225983733417838,
  "terminalDiscardTingSignal": 0.2917110471347582,
  "wildDiaoKeepBonus": 2.908297060009122,
  "wildDiaoFlushBoost": 1.0928343303249333,
  "wildDiaoPungBoost": 2.4861437507327993,
  "scoreBehindRiskBoost": 1.0064560779164102,
  "scoreLeadDefenseBoost": 1,
  "hand5RouteBias": 0.2590273941175259,
  "hand6RouteBias": 0.6,
  "hand7RouteBias": 0.9,
  "multLowHand5AllPungs": 0.41985917495972963,
  "multLowHand5HalfFlush": 0.3668131156862125,
  "multHighHand5AllPungs": 0.35,
  "multHighHand5HalfFlush": 0.2850975128971883,
  "multLowHand6AllPungs": 0.25,
  "multLowHand6HalfFlush": 0.286611677554435,
  "multLowHand6PureFlush": 0.25,
  "multHighHand6AllPungs": 0.25,
  "multHighHand6HalfFlush": 0.55,
  "multHighHand6PureFlush": 0.45,
  "multLowHand7AllPungs": 0.2,
  "multLowHand7HalfFlush": 0.4,
  "multLowHand7PureFlush": 0.2815170320462026,
  "multHighHand7AllPungs": 0.07987827314178728,
  "multHighHand7HalfFlush": 0.4,
  "multHighHand7PureFlush": 0.7,
  "multHighHonorStart": 0.6353334176611241,
  "speedVsValueBalance": 0.5,
  "defenseRiskAversion": 0.42466527676568333,
  "wallTilesImpact": 0.15438324649681612,
  "baoRiskAversion": 0.4666330346059575,
  "baoThreshold": 2.001366078229792,
  "anKongAggression": 0.9564908137617628,
  "minkanAggression": 0.31389874155332015,
  "kakanAggression": 0.4092564618311265,
  "robKongAwareness": 0.4548909085267129,
  "noWildDoubleAwareness": 0.5,
  "menqingDoubleAwareness": 0.5325238795068113,
  "flushVsPungsBalance": 0.1,
  "honorVsSuitedBalance": -0.06499699959801614,
  "sequenceVsTripletBias": -0.2,
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

### 最大输赢局明细（本轮）
- 本轮无有效对局数据
