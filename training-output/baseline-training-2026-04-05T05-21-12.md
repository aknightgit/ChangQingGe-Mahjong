# 长清阁麻将 全员基线收敛训练日志

- 创建时间: 2026-04-05T05:21:12.361Z
- 训练脚本: train-baseline.ts
- Config: 10 rounds × 600 games = 6000 total
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
| 胡牌率 | 2.8% | ≥90% |
| 流局率 | 97.2% | <10% |
| 自摸率 | 44.4% | 40-60% |
| 捉冲率 | 55.6% | 40-60% |
| 血战率 | 5.9% | >80% |
| 大牌率 | 5.6% | 3-8% |
| 门清率 | 0.0% | 7-12% |
| Fitness | -2116.9 | ↑ |

### 第1轮 (强度=1.0, 停滞=0)
  C1: fitness=-2341 hu=5% self=10% disc=90% draws=569
  C2: fitness=-2237 hu=3% self=33% disc=67% draws=585
  C3: fitness=-2347 hu=3% self=11% disc=89% draws=582
  C4: fitness=-2217 hu=4% self=24% disc=76% draws=576
  C5: fitness=-2415 hu=4% self=9% disc=91% draws=578
  Best: -2217 (overall: -2117) [plateau: 1]
  指标: hu=4% self=24% disc=76% big=0% mq=12%

## Round 1 (2026-04-05T05:54:13.368Z)

### 📊 训练指标 Summary

| 指标 | 值 | K哥目标 | 达标 |
|------|-----|---------|------|
| 胡牌率 | 4.0% | ≥90% | ❌ |
| 流局率 | 96.0% | <10% | ❌ |
| 自摸率 | 24.0% | 40-60% | ❌ |
| 捉冲率 | 76.0% | 40-60% | ❌ |
| 血战率 | 4.2% | >80% | ❌ |
| 大牌率 | 0.0% | 3-8% | ❌ |
| 门清率 | 12.0% | 7-12% | ✅ |
| Fitness | -2217.2 | ↑ | — |

### 🀄 胡牌牌型分布

| 牌型 | 局数 | 占比 | K哥目标 |
|------|------|------|---------|
| 混一色 | 0 | 0.0% | ≥40% |
| 碰碰胡 | 9 | 36.0% | >25% |
| 清一色 | 0 | 0.0% | >20% |
| 清碰 | 0 | 0.0% | ~5% |
| 风一色 | 0 | 0.0% | ~5% |
| 风碰 | 0 | 0.0% | ~1% |
| 混碰 | 0 | 0.0% | — |
| 八花 | 0 | 0.0% | — |
| 四百搭 | 0 | 0.0% | — |

### 训练明细
- Games: 600
- 胡牌局: 24 (4.0%)
- 流局: 576 (96.0%)
- 血战到最后一人: 1 (4.17%)
- 平均回合: 0.00
- 平均总筹码: 0.00
- 自摸率(胡牌中): 24.00%
- 大牌率(胡牌中): 0.00%
- 门清胡牌率(胡牌中): 12.00%
- 胜者平均最终点: 0.00
- Fitness: -2217.1667

### 本轮最佳策略参数
```json
{
  "id": "AI-AK",
  "selfWinChance": 0.7665253481186775,
  "discardHuChance": 0.7,
  "selfWinWildBoost": 0.1266871952479135,
  "discardHuWildPenalty": 0.3446855442190276,
  "discardHuMenQingPenalty": 0.12,
  "pengChance": 0.938789252678985,
  "kongChance": 0.4889073961745143,
  "chowChance": 0.14827368164610186,
  "anKongChance": 0.9898296447948148,
  "pengWildBoost": 0.05010582684328214,
  "kongWildBoost": 0.17074969758870698,
  "chowWildPenalty": 0.22,
  "menqingKeepBonus": 3.964280380743445,
  "meldPenalty": 0.026829650548748255,
  "allPungsPursuit": 0.7356301930693369,
  "pureFlushPursuit": 0.5,
  "halfFlushWeight": 0.6,
  "sevenPairsPursuit": 0.15,
  "allHonorsPursuit": 0.14083222760517888,
  "allHonorsPungsPursuit": 0.08389067735611558,
  "qingPengPursuit": 0.2,
  "hunPengPursuit": 0.5442411827354836,
  "windEastKeep": 1.7663111765725783,
  "windSouthKeep": 2.575719909145446,
  "windWestKeep": 1.1156865715889224,
  "windNorthKeep": 0.7255064576387434,
  "windGeneralKeep": 1.5,
  "dragonRedKeep": 3.2916529588266354,
  "dragonGreenKeep": 2.8583551204828295,
  "dragonWhiteKeep": 2.9818362851231037,
  "dragonGeneralKeep": 2.2527203988726976,
  "pairWeight": 4.461113126078833,
  "nearWeight": 4.0357824313562745,
  "tripletKeepBonus": 4.157096354944348,
  "terminalPenalty": 1,
  "wildKeepPenalty": 1682.511573348901,
  "wildBailoutThreshold": 3,
  "wild0Aggression": 0.3360843092809285,
  "wild1Aggression": 0.45116098936330645,
  "wild2Aggression": 0.5978617869144395,
  "wild3PlusAggression": 0.9,
  "wild1RouteMeldPush": 0.3320246566940525,
  "wild2RouteMeldPush": 0.6,
  "wild3RouteMeldPush": 0.8,
  "wild1RouteFlushBoost": 0.3094928789894137,
  "wild2RouteFlushBoost": 0.3,
  "wild3RouteFlushBoost": 0.47751980846352926,
  "wild1RouteHonorsBoost": 0,
  "wild2RouteHonorsBoost": 0.2,
  "wild3RouteHonorsBoost": 0.4,
  "wild1RouteAllPungsBoost": 0.13351151940938097,
  "wild2RouteAllPungsBoost": 0.35,
  "wild3RouteAllPungsBoost": 0.5011231296290346,
  "wildMultLowAggression": 0.48754844061673325,
  "wildMultMidAggression": 0.5292362851551664,
  "wildMultHighAggression": 0.8,
  "wild0MenqingKeep": 3.0702741060597987,
  "wild1MenqingKeep": 2.005138539192227,
  "wild2MenqingKeep": 1,
  "wild1BaoPush": 0.08669062614139302,
  "wild2BaoPush": 0.29290913092768045,
  "wild3BaoPush": 0.8,
  "multLowSpeedBias": 0.5,
  "multHighValueBias": 0.7829166927551453,
  "discardObsFlushBoost": 0.35515484953868587,
  "discardObsWeight": 0.3169784141834593,
  "bao2ClaimPenalty": 0.5522921350775664,
  "bao3AvoidThreshold": 0.7145038520760525,
  "baoSelfClaimCaution": 0.34518241257548415,
  "wallEarlySpeedPush": 0.20686863622758161,
  "wallMidBalance": 0.41538452329948145,
  "wallLateDefense": 0.8293461896013391,
  "oppTingDetection": 0.5,
  "safeTilePriority": 0.6225983733417838,
  "terminalDiscardTingSignal": 0.2917110471347582,
  "wildDiaoKeepBonus": 2.908297060009122,
  "wildDiaoFlushBoost": 1.0928343303249333,
  "wildDiaoPungBoost": 2.4861437507327993,
  "scoreBehindRiskBoost": 1.0064560779164102,
  "scoreLeadDefenseBoost": 0.7071420981460379,
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
  "multHighHand7AllPungs": 0.016475966765284886,
  "multHighHand7HalfFlush": 0.4,
  "multHighHand7PureFlush": 0.7,
  "multHighHonorStart": 0.6142060241352797,
  "speedVsValueBalance": 0.5,
  "defenseRiskAversion": 0.42466527676568333,
  "wallTilesImpact": 0.2,
  "baoRiskAversion": 0.6174292204162568,
  "baoThreshold": 2.728796388102271,
  "anKongAggression": 0.9564908137617628,
  "minkanAggression": 0.3782679008281927,
  "kakanAggression": 0.4092564618311265,
  "robKongAwareness": 0.4548909085267129,
  "noWildDoubleAwareness": 0.5,
  "menqingDoubleAwareness": 0.5325238795068113,
  "flushVsPungsBalance": 0.11417852644977541,
  "honorVsSuitedBalance": -0.06499699959801614,
  "sequenceVsTripletBias": -0.1499834611379392,
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
  C1: fitness=-2389 hu=3% self=11% disc=89% draws=582
  C2: fitness=-2241 hu=3% self=28% disc=72% draws=582
  C3: fitness=-2329 hu=5% self=11% disc=89% draws=573
  C4: fitness=-2335 hu=3% self=19% disc=81% draws=584
  C5: fitness=-2279 hu=3% self=19% disc=81% draws=580
  Best: -2241 (overall: -2117) [plateau: 2]
  指标: hu=3% self=28% disc=72% big=6% mq=0%

## Round 2 (2026-04-05T06:18:46.022Z)

### 📊 训练指标 Summary

| 指标 | 值 | K哥目标 | 达标 |
|------|-----|---------|------|
| 胡牌率 | 3.0% | ≥90% | ❌ |
| 流局率 | 97.0% | <10% | ❌ |
| 自摸率 | 27.8% | 40-60% | ❌ |
| 捉冲率 | 72.2% | 40-60% | ❌ |
| 血战率 | 0.0% | >80% | ❌ |
| 大牌率 | 5.6% | 3-8% | ✅ |
| 门清率 | 0.0% | 7-12% | ❌ |
| Fitness | -2240.8 | ↑ | — |

### 🀄 胡牌牌型分布

| 牌型 | 局数 | 占比 | K哥目标 |
|------|------|------|---------|
| 混一色 | 0 | 0.0% | ≥40% |
| 碰碰胡 | 8 | 44.4% | >25% |
| 清一色 | 0 | 0.0% | >20% |
| 清碰 | 0 | 0.0% | ~5% |
| 风一色 | 0 | 0.0% | ~5% |
| 风碰 | 0 | 0.0% | ~1% |
| 混碰 | 0 | 0.0% | — |
| 八花 | 0 | 0.0% | — |
| 四百搭 | 0 | 0.0% | — |

### 训练明细
- Games: 600
- 胡牌局: 18 (3.0%)
- 流局: 582 (97.0%)
- 血战到最后一人: 0 (0.00%)
- 平均回合: 0.00
- 平均总筹码: 0.00
- 自摸率(胡牌中): 27.78%
- 大牌率(胡牌中): 5.56%
- 门清胡牌率(胡牌中): 0.00%
- 胜者平均最终点: 0.00
- Fitness: -2240.7778

### 本轮最佳策略参数
```json
{
  "id": "AI-AK",
  "selfWinChance": 0.7665253481186775,
  "discardHuChance": 0.7,
  "selfWinWildBoost": 0.1266871952479135,
  "discardHuWildPenalty": 0.3446855442190276,
  "discardHuMenQingPenalty": 0.12,
  "pengChance": 0.938789252678985,
  "kongChance": 0.4889073961745143,
  "chowChance": 0.14827368164610186,
  "anKongChance": 0.9898296447948148,
  "pengWildBoost": 0.06010952987665567,
  "kongWildBoost": 0.17074969758870698,
  "chowWildPenalty": 0.22,
  "menqingKeepBonus": 3.964280380743445,
  "meldPenalty": 0.026829650548748255,
  "allPungsPursuit": 0.7356301930693369,
  "pureFlushPursuit": 0.5,
  "halfFlushWeight": 0.6,
  "sevenPairsPursuit": 0.15,
  "allHonorsPursuit": 0.14083222760517888,
  "allHonorsPungsPursuit": 0.08389067735611558,
  "qingPengPursuit": 0.2,
  "hunPengPursuit": 0.5442411827354836,
  "windEastKeep": 1.7663111765725783,
  "windSouthKeep": 2.575719909145446,
  "windWestKeep": 1.1156865715889224,
  "windNorthKeep": 0.7255064576387434,
  "windGeneralKeep": 1.5,
  "dragonRedKeep": 3.2916529588266354,
  "dragonGreenKeep": 2.8583551204828295,
  "dragonWhiteKeep": 2.9818362851231037,
  "dragonGeneralKeep": 2.2527203988726976,
  "pairWeight": 4.461113126078833,
  "nearWeight": 4.0357824313562745,
  "tripletKeepBonus": 4.157096354944348,
  "terminalPenalty": 1,
  "wildKeepPenalty": 1682.511573348901,
  "wildBailoutThreshold": 3,
  "wild0Aggression": 0.3360843092809285,
  "wild1Aggression": 0.45116098936330645,
  "wild2Aggression": 0.5978617869144395,
  "wild3PlusAggression": 0.9,
  "wild1RouteMeldPush": 0.3320246566940525,
  "wild2RouteMeldPush": 0.6,
  "wild3RouteMeldPush": 0.8,
  "wild1RouteFlushBoost": 0.3094928789894137,
  "wild2RouteFlushBoost": 0.3,
  "wild3RouteFlushBoost": 0.47751980846352926,
  "wild1RouteHonorsBoost": 0,
  "wild2RouteHonorsBoost": 0.2,
  "wild3RouteHonorsBoost": 0.4,
  "wild1RouteAllPungsBoost": 0.13351151940938097,
  "wild2RouteAllPungsBoost": 0.35,
  "wild3RouteAllPungsBoost": 0.5011231296290346,
  "wildMultLowAggression": 0.48754844061673325,
  "wildMultMidAggression": 0.5292362851551664,
  "wildMultHighAggression": 0.8,
  "wild0MenqingKeep": 2.629151842779223,
  "wild1MenqingKeep": 2.005138539192227,
  "wild2MenqingKeep": 1.0574013615069,
  "wild1BaoPush": 0.08669062614139302,
  "wild2BaoPush": 0.29290913092768045,
  "wild3BaoPush": 0.8,
  "multLowSpeedBias": 0.5,
  "multHighValueBias": 0.7829166927551453,
  "discardObsFlushBoost": 0.35515484953868587,
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
  "hand7RouteBias": 0.8398996819347805,
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
  "multHighHand7AllPungs": 0.016475966765284886,
  "multHighHand7HalfFlush": 0.4,
  "multHighHand7PureFlush": 0.7,
  "multHighHonorStart": 0.6353334176611241,
  "speedVsValueBalance": 0.5,
  "defenseRiskAversion": 0.42466527676568333,
  "wallTilesImpact": 0.2,
  "baoRiskAversion": 0.6174292204162568,
  "baoThreshold": 2.728796388102271,
  "anKongAggression": 0.9564908137617628,
  "minkanAggression": 0.3782679008281927,
  "kakanAggression": 0.4092564618311265,
  "robKongAwareness": 0.4497254826126462,
  "noWildDoubleAwareness": 0.5,
  "menqingDoubleAwareness": 0.5325238795068113,
  "flushVsPungsBalance": 0.1,
  "honorVsSuitedBalance": -0.06499699959801614,
  "sequenceVsTripletBias": -0.1499834611379392,
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


### 第3轮 (强度=1.8, 停滞=2)
  C1: fitness=-2375 hu=5% self=7% disc=93% draws=573
  C2: fitness=-2332 hu=4% self=17% disc=83% draws=577
  C3: fitness=-2343 hu=4% self=13% disc=87% draws=577
  C4: fitness=-2365 hu=3% self=12% disc=88% draws=583
  C5: fitness=-2368 hu=2% self=17% disc=83% draws=588
  Best: -2332 (overall: -2117) [plateau: 3]
  指标: hu=4% self=17% disc=83% big=0% mq=0%

## Round 3 (2026-04-05T06:33:48.832Z)

### 📊 训练指标 Summary

| 指标 | 值 | K哥目标 | 达标 |
|------|-----|---------|------|
| 胡牌率 | 3.8% | ≥90% | ❌ |
| 流局率 | 96.2% | <10% | ❌ |
| 自摸率 | 17.4% | 40-60% | ❌ |
| 捉冲率 | 82.6% | 40-60% | ❌ |
| 血战率 | 0.0% | >80% | ❌ |
| 大牌率 | 0.0% | 3-8% | ❌ |
| 门清率 | 0.0% | 7-12% | ❌ |
| Fitness | -2332.0 | ↑ | — |

### 🀄 胡牌牌型分布

| 牌型 | 局数 | 占比 | K哥目标 |
|------|------|------|---------|
| 混一色 | 0 | 0.0% | ≥40% |
| 碰碰胡 | 6 | 26.1% | >25% |
| 清一色 | 0 | 0.0% | >20% |
| 清碰 | 0 | 0.0% | ~5% |
| 风一色 | 0 | 0.0% | ~5% |
| 风碰 | 0 | 0.0% | ~1% |
| 混碰 | 0 | 0.0% | — |
| 八花 | 0 | 0.0% | — |
| 四百搭 | 0 | 0.0% | — |

### 训练明细
- Games: 600
- 胡牌局: 23 (3.8%)
- 流局: 577 (96.2%)
- 血战到最后一人: 0 (0.00%)
- 平均回合: 0.00
- 平均总筹码: 0.00
- 自摸率(胡牌中): 17.39%
- 大牌率(胡牌中): 0.00%
- 门清胡牌率(胡牌中): 0.00%
- 胜者平均最终点: 0.00
- Fitness: -2331.9855

### 本轮最佳策略参数
```json
{
  "id": "AI-AK",
  "selfWinChance": 0.7665253481186775,
  "discardHuChance": 0.7,
  "selfWinWildBoost": 0.1266871952479135,
  "discardHuWildPenalty": 0.3446855442190276,
  "discardHuMenQingPenalty": 0.12,
  "pengChance": 0.938789252678985,
  "kongChance": 0.4889073961745143,
  "chowChance": 0.14827368164610186,
  "anKongChance": 0.9898296447948148,
  "pengWildBoost": 0.06282849518815241,
  "kongWildBoost": 0.17074969758870698,
  "chowWildPenalty": 0.22,
  "menqingKeepBonus": 3.964280380743445,
  "meldPenalty": 0.026829650548748255,
  "allPungsPursuit": 0.7356301930693369,
  "pureFlushPursuit": 0.5,
  "halfFlushWeight": 0.6,
  "sevenPairsPursuit": 0.15,
  "allHonorsPursuit": 0.14083222760517888,
  "allHonorsPungsPursuit": 0.08389067735611558,
  "qingPengPursuit": 0.2,
  "hunPengPursuit": 0.5442411827354836,
  "windEastKeep": 1.7663111765725783,
  "windSouthKeep": 2.575719909145446,
  "windWestKeep": 1.1156865715889224,
  "windNorthKeep": 0.7255064576387434,
  "windGeneralKeep": 1.5,
  "dragonRedKeep": 3.2916529588266354,
  "dragonGreenKeep": 2.8583551204828295,
  "dragonWhiteKeep": 2.9818362851231037,
  "dragonGeneralKeep": 1.9246582044443292,
  "pairWeight": 4.461113126078833,
  "nearWeight": 4.0357824313562745,
  "tripletKeepBonus": 4.157096354944348,
  "terminalPenalty": 1,
  "wildKeepPenalty": 1682.511573348901,
  "wildBailoutThreshold": 3,
  "wild0Aggression": 0.3360843092809285,
  "wild1Aggression": 0.45116098936330645,
  "wild2Aggression": 0.5978617869144395,
  "wild3PlusAggression": 0.9,
  "wild1RouteMeldPush": 0.3320246566940525,
  "wild2RouteMeldPush": 0.6,
  "wild3RouteMeldPush": 0.8,
  "wild1RouteFlushBoost": 0.3094928789894137,
  "wild2RouteFlushBoost": 0.3,
  "wild3RouteFlushBoost": 0.47751980846352926,
  "wild1RouteHonorsBoost": 0,
  "wild2RouteHonorsBoost": 0.2,
  "wild3RouteHonorsBoost": 0.4,
  "wild1RouteAllPungsBoost": 0.13351151940938097,
  "wild2RouteAllPungsBoost": 0.35,
  "wild3RouteAllPungsBoost": 0.4530348589274215,
  "wildMultLowAggression": 0.48754844061673325,
  "wildMultMidAggression": 0.5292362851551664,
  "wildMultHighAggression": 0.8,
  "wild0MenqingKeep": 3.0702741060597987,
  "wild1MenqingKeep": 2.005138539192227,
  "wild2MenqingKeep": 1,
  "wild1BaoPush": 0.08669062614139302,
  "wild2BaoPush": 0.29290913092768045,
  "wild3BaoPush": 0.8,
  "multLowSpeedBias": 0.5,
  "multHighValueBias": 0.7829166927551453,
  "discardObsFlushBoost": 0.35515484953868587,
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
  "multHighHand6AllPungs": 0.2923768264501499,
  "multHighHand6HalfFlush": 0.55,
  "multHighHand6PureFlush": 0.45,
  "multLowHand7AllPungs": 0.2,
  "multLowHand7HalfFlush": 0.4,
  "multLowHand7PureFlush": 0.309818294975893,
  "multHighHand7AllPungs": 0.016475966765284886,
  "multHighHand7HalfFlush": 0.4,
  "multHighHand7PureFlush": 0.7,
  "multHighHonorStart": 0.6353334176611241,
  "speedVsValueBalance": 0.5,
  "defenseRiskAversion": 0.42466527676568333,
  "wallTilesImpact": 0.2,
  "baoRiskAversion": 0.6174292204162568,
  "baoThreshold": 2.728796388102271,
  "anKongAggression": 0.9564908137617628,
  "minkanAggression": 0.3782679008281927,
  "kakanAggression": 0.4092564618311265,
  "robKongAwareness": 0.4548909085267129,
  "noWildDoubleAwareness": 0.5,
  "menqingDoubleAwareness": 0.5325238795068113,
  "flushVsPungsBalance": 0.1,
  "honorVsSuitedBalance": -0.06499699959801614,
  "sequenceVsTripletBias": -0.1499834611379392,
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


### 第4轮 (强度=1.8, 停滞=3)
  C1: fitness=-2364 hu=5% self=11% disc=89% draws=573
  C2: fitness=-2170 hu=3% self=35% disc=65% draws=580
  C3: fitness=-2275 hu=3% self=27% disc=73% draws=585
  C4: fitness=-2389 hu=3% self=11% disc=89% draws=582
  C5: fitness=-2388 hu=3% self=13% disc=88% draws=584
  Best: -2170 (overall: -2117) [plateau: 4]
  指标: hu=3% self=35% disc=65% big=0% mq=15%

## Round 4 (2026-04-05T06:48:36.779Z)

### 📊 训练指标 Summary

| 指标 | 值 | K哥目标 | 达标 |
|------|-----|---------|------|
| 胡牌率 | 3.3% | ≥90% | ❌ |
| 流局率 | 96.7% | <10% | ❌ |
| 自摸率 | 35.0% | 40-60% | ❌ |
| 捉冲率 | 65.0% | 40-60% | ❌ |
| 血战率 | 0.0% | >80% | ❌ |
| 大牌率 | 0.0% | 3-8% | ❌ |
| 门清率 | 15.0% | 7-12% | ❌ |
| Fitness | -2170.3 | ↑ | — |

### 🀄 胡牌牌型分布

| 牌型 | 局数 | 占比 | K哥目标 |
|------|------|------|---------|
| 混一色 | 0 | 0.0% | ≥40% |
| 碰碰胡 | 11 | 55.0% | >25% |
| 清一色 | 0 | 0.0% | >20% |
| 清碰 | 0 | 0.0% | ~5% |
| 风一色 | 1 | 5.0% | ~5% |
| 风碰 | 0 | 0.0% | ~1% |
| 混碰 | 1 | 5.0% | — |
| 八花 | 0 | 0.0% | — |
| 四百搭 | 0 | 0.0% | — |

### 训练明细
- Games: 600
- 胡牌局: 20 (3.3%)
- 流局: 580 (96.7%)
- 血战到最后一人: 0 (0.00%)
- 平均回合: 0.00
- 平均总筹码: 0.00
- 自摸率(胡牌中): 35.00%
- 大牌率(胡牌中): 0.00%
- 门清胡牌率(胡牌中): 15.00%
- 胜者平均最终点: 0.00
- Fitness: -2170.3333

### 本轮最佳策略参数
```json
{
  "id": "AI-AK",
  "selfWinChance": 0.7665253481186775,
  "discardHuChance": 0.7,
  "selfWinWildBoost": 0.17924862655271956,
  "discardHuWildPenalty": 0.37902535280022065,
  "discardHuMenQingPenalty": 0.12,
  "pengChance": 0.938789252678985,
  "kongChance": 0.4889073961745143,
  "chowChance": 0.14827368164610186,
  "anKongChance": 0.9898296447948148,
  "pengWildBoost": 0.06282849518815241,
  "kongWildBoost": 0.17074969758870698,
  "chowWildPenalty": 0.22,
  "menqingKeepBonus": 3.964280380743445,
  "meldPenalty": 0.026829650548748255,
  "allPungsPursuit": 0.7356301930693369,
  "pureFlushPursuit": 0.5,
  "halfFlushWeight": 0.6,
  "sevenPairsPursuit": 0.15,
  "allHonorsPursuit": 0.14083222760517888,
  "allHonorsPungsPursuit": 0.08389067735611558,
  "qingPengPursuit": 0.2,
  "hunPengPursuit": 0.5442411827354836,
  "windEastKeep": 1.7663111765725783,
  "windSouthKeep": 2.575719909145446,
  "windWestKeep": 1.1156865715889224,
  "windNorthKeep": 0.7255064576387434,
  "windGeneralKeep": 1.5,
  "dragonRedKeep": 3.2916529588266354,
  "dragonGreenKeep": 2.8583551204828295,
  "dragonWhiteKeep": 2.9818362851231037,
  "dragonGeneralKeep": 2.2527203988726976,
  "pairWeight": 4.461113126078833,
  "nearWeight": 4.0357824313562745,
  "tripletKeepBonus": 4.157096354944348,
  "terminalPenalty": 1.1383625506919692,
  "wildKeepPenalty": 1682.511573348901,
  "wildBailoutThreshold": 3,
  "wild0Aggression": 0.3360843092809285,
  "wild1Aggression": 0.45116098936330645,
  "wild2Aggression": 0.5978617869144395,
  "wild3PlusAggression": 0.9,
  "wild1RouteMeldPush": 0.3320246566940525,
  "wild2RouteMeldPush": 0.6,
  "wild3RouteMeldPush": 0.8,
  "wild1RouteFlushBoost": 0.3094928789894137,
  "wild2RouteFlushBoost": 0.3,
  "wild3RouteFlushBoost": 0.47751980846352926,
  "wild1RouteHonorsBoost": 0,
  "wild2RouteHonorsBoost": 0.2,
  "wild3RouteHonorsBoost": 0.4,
  "wild1RouteAllPungsBoost": 0.13351151940938097,
  "wild2RouteAllPungsBoost": 0.35,
  "wild3RouteAllPungsBoost": 0.5011231296290346,
  "wildMultLowAggression": 0.48754844061673325,
  "wildMultMidAggression": 0.5292362851551664,
  "wildMultHighAggression": 0.8,
  "wild0MenqingKeep": 3.0702741060597987,
  "wild1MenqingKeep": 2.005138539192227,
  "wild2MenqingKeep": 1,
  "wild1BaoPush": 0.08669062614139302,
  "wild2BaoPush": 0.29290913092768045,
  "wild3BaoPush": 0.8,
  "multLowSpeedBias": 0.5,
  "multHighValueBias": 0.7829166927551453,
  "discardObsFlushBoost": 0.35515484953868587,
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
  "wildDiaoFlushBoost": 0.6615608784394913,
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
  "multHighHand7AllPungs": 0.016475966765284886,
  "multHighHand7HalfFlush": 0.4,
  "multHighHand7PureFlush": 0.7,
  "multHighHonorStart": 0.6353334176611241,
  "speedVsValueBalance": 0.5,
  "defenseRiskAversion": 0.42466527676568333,
  "wallTilesImpact": 0.2,
  "baoRiskAversion": 0.6174292204162568,
  "baoThreshold": 2.728796388102271,
  "anKongAggression": 0.9564908137617628,
  "minkanAggression": 0.3782679008281927,
  "kakanAggression": 0.4092564618311265,
  "robKongAwareness": 0.4548909085267129,
  "noWildDoubleAwareness": 0.5,
  "menqingDoubleAwareness": 0.5325238795068113,
  "flushVsPungsBalance": 0.1,
  "honorVsSuitedBalance": -0.06499699959801614,
  "sequenceVsTripletBias": -0.406540573726288,
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


### 第5轮 (强度=2.5, 停滞=4)
  C1: fitness=-2367 hu=2% self=8% disc=92% draws=588
  C2: fitness=-2258 hu=4% self=24% disc=76% draws=579
  C3: fitness=-2182 hu=4% self=33% disc=67% draws=579
  C4: fitness=-2241 hu=3% self=27% disc=73% draws=585
  C5: fitness=-2264 hu=3% self=26% disc=74% draws=581
  Best: -2182 (overall: -2117) [plateau: 5]
  指标: hu=4% self=33% disc=67% big=0% mq=14%

## Round 5 (2026-04-05T07:03:33.316Z)

### 📊 训练指标 Summary

| 指标 | 值 | K哥目标 | 达标 |
|------|-----|---------|------|
| 胡牌率 | 3.5% | ≥90% | ❌ |
| 流局率 | 96.5% | <10% | ❌ |
| 自摸率 | 33.3% | 40-60% | ❌ |
| 捉冲率 | 66.7% | 40-60% | ❌ |
| 血战率 | 0.0% | >80% | ❌ |
| 大牌率 | 0.0% | 3-8% | ❌ |
| 门清率 | 14.3% | 7-12% | ❌ |
| Fitness | -2182.5 | ↑ | — |

### 🀄 胡牌牌型分布

| 牌型 | 局数 | 占比 | K哥目标 |
|------|------|------|---------|
| 混一色 | 0 | 0.0% | ≥40% |
| 碰碰胡 | 9 | 42.9% | >25% |
| 清一色 | 0 | 0.0% | >20% |
| 清碰 | 0 | 0.0% | ~5% |
| 风一色 | 0 | 0.0% | ~5% |
| 风碰 | 0 | 0.0% | ~1% |
| 混碰 | 0 | 0.0% | — |
| 八花 | 0 | 0.0% | — |
| 四百搭 | 0 | 0.0% | — |

### 训练明细
- Games: 600
- 胡牌局: 21 (3.5%)
- 流局: 579 (96.5%)
- 血战到最后一人: 0 (0.00%)
- 平均回合: 0.00
- 平均总筹码: 0.00
- 自摸率(胡牌中): 33.33%
- 大牌率(胡牌中): 0.00%
- 门清胡牌率(胡牌中): 14.29%
- 胜者平均最终点: 0.00
- Fitness: -2182.4762

### 本轮最佳策略参数
```json
{
  "id": "AI-AK",
  "selfWinChance": 0.7665253481186775,
  "discardHuChance": 0.7,
  "selfWinWildBoost": 0.1266871952479135,
  "discardHuWildPenalty": 0.3446855442190276,
  "discardHuMenQingPenalty": 0.12,
  "pengChance": 0.938789252678985,
  "kongChance": 0.4889073961745143,
  "chowChance": 0.4,
  "anKongChance": 0.9898296447948148,
  "pengWildBoost": 0.06282849518815241,
  "kongWildBoost": 0.17074969758870698,
  "chowWildPenalty": 0.22,
  "menqingKeepBonus": 3.964280380743445,
  "meldPenalty": 0.026829650548748255,
  "allPungsPursuit": 0.7356301930693369,
  "pureFlushPursuit": 0.5,
  "halfFlushWeight": 0.6,
  "sevenPairsPursuit": 0.15,
  "allHonorsPursuit": 0.14083222760517888,
  "allHonorsPungsPursuit": 0.08389067735611558,
  "qingPengPursuit": 0.2,
  "hunPengPursuit": 0.5442411827354836,
  "windEastKeep": 1.7663111765725783,
  "windSouthKeep": 2.575719909145446,
  "windWestKeep": 1.1156865715889224,
  "windNorthKeep": 0.7255064576387434,
  "windGeneralKeep": 1.5,
  "dragonRedKeep": 3.2916529588266354,
  "dragonGreenKeep": 2.8583551204828295,
  "dragonWhiteKeep": 2.9818362851231037,
  "dragonGeneralKeep": 2.2527203988726976,
  "pairWeight": 4.461113126078833,
  "nearWeight": 4.0357824313562745,
  "tripletKeepBonus": 4.157096354944348,
  "terminalPenalty": 1,
  "wildKeepPenalty": 1682.511573348901,
  "wildBailoutThreshold": 4.210852552871871,
  "wild0Aggression": 0.3360843092809285,
  "wild1Aggression": 0.45116098936330645,
  "wild2Aggression": 0.5978617869144395,
  "wild3PlusAggression": 0.9,
  "wild1RouteMeldPush": 0.3320246566940525,
  "wild2RouteMeldPush": 0.6,
  "wild3RouteMeldPush": 0.8,
  "wild1RouteFlushBoost": 0.3094928789894137,
  "wild2RouteFlushBoost": 0.3,
  "wild3RouteFlushBoost": 0.47751980846352926,
  "wild1RouteHonorsBoost": 0,
  "wild2RouteHonorsBoost": 0.2,
  "wild3RouteHonorsBoost": 0.4,
  "wild1RouteAllPungsBoost": 0.13351151940938097,
  "wild2RouteAllPungsBoost": 0.35,
  "wild3RouteAllPungsBoost": 0.5011231296290346,
  "wildMultLowAggression": 0.48754844061673325,
  "wildMultMidAggression": 0.5292362851551664,
  "wildMultHighAggression": 0.8,
  "wild0MenqingKeep": 3.0702741060597987,
  "wild1MenqingKeep": 1.6449926867690317,
  "wild2MenqingKeep": 1,
  "wild1BaoPush": 0.08669062614139302,
  "wild2BaoPush": 0.29290913092768045,
  "wild3BaoPush": 0.8,
  "multLowSpeedBias": 0.5,
  "multHighValueBias": 0.7829166927551453,
  "discardObsFlushBoost": 0.35515484953868587,
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
  "hand5RouteBias": 0.14509305483614698,
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
  "multHighHand7AllPungs": 0.016475966765284886,
  "multHighHand7HalfFlush": 0.4,
  "multHighHand7PureFlush": 0.7,
  "multHighHonorStart": 0.6353334176611241,
  "speedVsValueBalance": 0.5,
  "defenseRiskAversion": 0.42466527676568333,
  "wallTilesImpact": 0.33856361729882645,
  "baoRiskAversion": 0.6174292204162568,
  "baoThreshold": 2.728796388102271,
  "anKongAggression": 0.9564908137617628,
  "minkanAggression": 0.47616641595263387,
  "kakanAggression": 0.4092564618311265,
  "robKongAwareness": 0.4548909085267129,
  "noWildDoubleAwareness": 0.5,
  "menqingDoubleAwareness": 0.5325238795068113,
  "flushVsPungsBalance": 0.1,
  "honorVsSuitedBalance": -0.06499699959801614,
  "sequenceVsTripletBias": -0.1499834611379392,
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


### 第6轮 (强度=2.5, 停滞=5)
  C1: fitness=-2374 hu=4% self=14% disc=86% draws=578
  C2: fitness=-2380 hu=3% self=13% disc=87% draws=585
  C3: fitness=-2131 hu=4% self=36% disc=64% draws=578
  C4: fitness=-2291 hu=3% self=20% disc=80% draws=580
  C5: fitness=-2296 hu=3% self=16% disc=84% draws=582
  Best: -2131 (overall: -2117) [plateau: 6]
  指标: hu=4% self=36% disc=64% big=5% mq=9%

## Round 6 (2026-04-05T07:18:38.293Z)

### 📊 训练指标 Summary

| 指标 | 值 | K哥目标 | 达标 |
|------|-----|---------|------|
| 胡牌率 | 3.7% | ≥90% | ❌ |
| 流局率 | 96.3% | <10% | ❌ |
| 自摸率 | 36.4% | 40-60% | ❌ |
| 捉冲率 | 63.6% | 40-60% | ❌ |
| 血战率 | 0.0% | >80% | ❌ |
| 大牌率 | 4.5% | 3-8% | ✅ |
| 门清率 | 9.1% | 7-12% | ✅ |
| Fitness | -2130.8 | ↑ | — |

### 🀄 胡牌牌型分布

| 牌型 | 局数 | 占比 | K哥目标 |
|------|------|------|---------|
| 混一色 | 0 | 0.0% | ≥40% |
| 碰碰胡 | 10 | 45.5% | >25% |
| 清一色 | 0 | 0.0% | >20% |
| 清碰 | 0 | 0.0% | ~5% |
| 风一色 | 0 | 0.0% | ~5% |
| 风碰 | 0 | 0.0% | ~1% |
| 混碰 | 0 | 0.0% | — |
| 八花 | 0 | 0.0% | — |
| 四百搭 | 0 | 0.0% | — |

### 训练明细
- Games: 600
- 胡牌局: 22 (3.7%)
- 流局: 578 (96.3%)
- 血战到最后一人: 0 (0.00%)
- 平均回合: 0.12
- 平均总筹码: 0.33
- 自摸率(胡牌中): 36.36%
- 大牌率(胡牌中): 4.55%
- 门清胡牌率(胡牌中): 9.09%
- 胜者平均最终点: 10.00
- Fitness: -2130.7576

### 本轮最佳策略参数
```json
{
  "id": "AI-AK",
  "selfWinChance": 0.7665253481186775,
  "discardHuChance": 0.7,
  "selfWinWildBoost": 0.1266871952479135,
  "discardHuWildPenalty": 0.3446855442190276,
  "discardHuMenQingPenalty": 0.12,
  "pengChance": 0.938789252678985,
  "kongChance": 0.4889073961745143,
  "chowChance": 0.14827368164610186,
  "anKongChance": 0.9898296447948148,
  "pengWildBoost": 0.06282849518815241,
  "kongWildBoost": 0.17074969758870698,
  "chowWildPenalty": 0.22,
  "menqingKeepBonus": 3.964280380743445,
  "meldPenalty": 0.026829650548748255,
  "allPungsPursuit": 0.7356301930693369,
  "pureFlushPursuit": 0.5,
  "halfFlushWeight": 0.6,
  "sevenPairsPursuit": 0.15,
  "allHonorsPursuit": 0.14083222760517888,
  "allHonorsPungsPursuit": 0.08389067735611558,
  "qingPengPursuit": 0.2,
  "hunPengPursuit": 0.5442411827354836,
  "windEastKeep": 1.7663111765725783,
  "windSouthKeep": 2.63370826697264,
  "windWestKeep": 1.1156865715889224,
  "windNorthKeep": 0.7255064576387434,
  "windGeneralKeep": 1.5,
  "dragonRedKeep": 3.2916529588266354,
  "dragonGreenKeep": 2.8583551204828295,
  "dragonWhiteKeep": 3.111655926710087,
  "dragonGeneralKeep": 2.2527203988726976,
  "pairWeight": 4.461113126078833,
  "nearWeight": 4.0357824313562745,
  "tripletKeepBonus": 4.157096354944348,
  "terminalPenalty": 1,
  "wildKeepPenalty": 1682.511573348901,
  "wildBailoutThreshold": 3,
  "wild0Aggression": 0.3360843092809285,
  "wild1Aggression": 0.45116098936330645,
  "wild2Aggression": 0.5978617869144395,
  "wild3PlusAggression": 0.9,
  "wild1RouteMeldPush": 0.3320246566940525,
  "wild2RouteMeldPush": 0.6,
  "wild3RouteMeldPush": 0.8,
  "wild1RouteFlushBoost": 0.3094928789894137,
  "wild2RouteFlushBoost": 0.3,
  "wild3RouteFlushBoost": 0.47751980846352926,
  "wild1RouteHonorsBoost": 0,
  "wild2RouteHonorsBoost": 0.2,
  "wild3RouteHonorsBoost": 0.4,
  "wild1RouteAllPungsBoost": 0.13351151940938097,
  "wild2RouteAllPungsBoost": 0.35,
  "wild3RouteAllPungsBoost": 0.5011231296290346,
  "wildMultLowAggression": 0.48754844061673325,
  "wildMultMidAggression": 0.5292362851551664,
  "wildMultHighAggression": 0.8,
  "wild0MenqingKeep": 3.0702741060597987,
  "wild1MenqingKeep": 2.005138539192227,
  "wild2MenqingKeep": 1,
  "wild1BaoPush": 0.08669062614139302,
  "wild2BaoPush": 0.29290913092768045,
  "wild3BaoPush": 0.8,
  "multLowSpeedBias": 0.5,
  "multHighValueBias": 0.7829166927551453,
  "discardObsFlushBoost": 0.35515484953868587,
  "discardObsWeight": 0.3169784141834593,
  "bao2ClaimPenalty": 0.7588455780774529,
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
  "multHighHand7AllPungs": 0.016475966765284886,
  "multHighHand7HalfFlush": 0.4,
  "multHighHand7PureFlush": 0.7,
  "multHighHonorStart": 0.6353334176611241,
  "speedVsValueBalance": 0.5,
  "defenseRiskAversion": 0.42466527676568333,
  "wallTilesImpact": 0.2,
  "baoRiskAversion": 0.6174292204162568,
  "baoThreshold": 2.728796388102271,
  "anKongAggression": 0.9564908137617628,
  "minkanAggression": 0.3782679008281927,
  "kakanAggression": 0.4092564618311265,
  "robKongAwareness": 0.4548909085267129,
  "noWildDoubleAwareness": 0.5,
  "menqingDoubleAwareness": 0.5325238795068113,
  "flushVsPungsBalance": 0.1,
  "honorVsSuitedBalance": -0.06499699959801614,
  "sequenceVsTripletBias": -0.1499834611379392,
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
#### 最大赢局
- 最大赢利: AI-阿水 1000 点（绝对值 1000）
- 局号: 52
- 回合: 73
- 总筹码: 200
- 百搭: wan-2
- 回合/全局倍数信息:
  - 骰子点数: 4 + 2
  - 骰子倍数（清晰明了）: x1
  - 全局倍数: x1

- 输出该局所有胡牌玩家明细
  - 玩家: AI-阿水
    - 胡牌方式: 放冲 (来自 AI-老赵)
    - 牌型/基础番/最终点: 碰碰胡 / 5 / 10
    - 手牌牌面: 六条 六筒 六筒 六条 六条
    - 门口牌（吃/碰/杠）: 碰:九筒 九筒 九筒 ; 碰:五条 五条 五条 ; 碰:五万 五万 五万 ; 碰:一万 一万 一万
    - 花牌: 秋 春 梅

- 结算逐笔明细（谁付给谁、倍率和金额）
  - [碰后放炮] AI-老赵 -> AI-阿水 : 100

---

#### 最大输局
- 最大亏损: AI-老赵 -1000 点（绝对值 1000）
- 局号: 52
- 回合: 73
- 总筹码: 200
- 百搭: wan-2
- 回合/全局倍数信息:
  - 骰子点数: 4 + 2
  - 骰子倍数（清晰明了）: x1
  - 全局倍数: x1

- 输出该局所有胡牌玩家明细
  - 玩家: AI-阿水
    - 胡牌方式: 放冲 (来自 AI-老赵)
    - 牌型/基础番/最终点: 碰碰胡 / 5 / 10
    - 手牌牌面: 六条 六筒 六筒 六条 六条
    - 门口牌（吃/碰/杠）: 碰:九筒 九筒 九筒 ; 碰:五条 五条 五条 ; 碰:五万 五万 五万 ; 碰:一万 一万 一万
    - 花牌: 秋 春 梅

- 结算逐笔明细（谁付给谁、倍率和金额）
  - [碰后放炮] AI-老赵 -> AI-阿水 : 100

- 高倍数局数(骰子>=2): 0


### 第7轮 (强度=2.5, 停滞=6)
  C1: fitness=-2379 hu=3% self=11% disc=89% draws=581
  C2: fitness=-2310 hu=4% self=13% disc=87% draws=578
  C3: fitness=-2250 hu=3% self=24% disc=76% draws=584
  C4: fitness=-2228 hu=3% self=25% disc=75% draws=581
  C5: fitness=-2285 hu=3% self=21% disc=79% draws=581
  Best: -2228 (overall: -2117) [plateau: 7]
  指标: hu=3% self=25% disc=75% big=0% mq=5%

## Round 7 (2026-04-05T07:33:40.610Z)

### 📊 训练指标 Summary

| 指标 | 值 | K哥目标 | 达标 |
|------|-----|---------|------|
| 胡牌率 | 3.2% | ≥90% | ❌ |
| 流局率 | 96.8% | <10% | ❌ |
| 自摸率 | 25.0% | 40-60% | ❌ |
| 捉冲率 | 75.0% | 40-60% | ❌ |
| 血战率 | 5.3% | >80% | ❌ |
| 大牌率 | 0.0% | 3-8% | ❌ |
| 门清率 | 5.0% | 7-12% | ❌ |
| Fitness | -2228.4 | ↑ | — |

### 🀄 胡牌牌型分布

| 牌型 | 局数 | 占比 | K哥目标 |
|------|------|------|---------|
| 混一色 | 0 | 0.0% | ≥40% |
| 碰碰胡 | 9 | 45.0% | >25% |
| 清一色 | 0 | 0.0% | >20% |
| 清碰 | 0 | 0.0% | ~5% |
| 风一色 | 0 | 0.0% | ~5% |
| 风碰 | 0 | 0.0% | ~1% |
| 混碰 | 0 | 0.0% | — |
| 八花 | 0 | 0.0% | — |
| 四百搭 | 0 | 0.0% | — |

### 训练明细
- Games: 600
- 胡牌局: 19 (3.2%)
- 流局: 581 (96.8%)
- 血战到最后一人: 1 (5.26%)
- 平均回合: 0.00
- 平均总筹码: 0.00
- 自摸率(胡牌中): 25.00%
- 大牌率(胡牌中): 0.00%
- 门清胡牌率(胡牌中): 5.00%
- 胜者平均最终点: 0.00
- Fitness: -2228.3509

### 本轮最佳策略参数
```json
{
  "id": "AI-AK",
  "selfWinChance": 0.7665253481186775,
  "discardHuChance": 0.7,
  "selfWinWildBoost": 0.1266871952479135,
  "discardHuWildPenalty": 0.3446855442190276,
  "discardHuMenQingPenalty": 0.12,
  "pengChance": 0.938789252678985,
  "kongChance": 0.4889073961745143,
  "chowChance": 0.14827368164610186,
  "anKongChance": 0.9898296447948148,
  "pengWildBoost": 0.06282849518815241,
  "kongWildBoost": 0.17074969758870698,
  "chowWildPenalty": 0.22,
  "menqingKeepBonus": 3.964280380743445,
  "meldPenalty": 0.026829650548748255,
  "allPungsPursuit": 0.7356301930693369,
  "pureFlushPursuit": 0.5,
  "halfFlushWeight": 0.6,
  "sevenPairsPursuit": 0.15,
  "allHonorsPursuit": 0.14083222760517888,
  "allHonorsPungsPursuit": 0.08389067735611558,
  "qingPengPursuit": 0.2,
  "hunPengPursuit": 0.5442411827354836,
  "windEastKeep": 1.7663111765725783,
  "windSouthKeep": 2.575719909145446,
  "windWestKeep": 1.1156865715889224,
  "windNorthKeep": 0.7255064576387434,
  "windGeneralKeep": 1.5,
  "dragonRedKeep": 3.2916529588266354,
  "dragonGreenKeep": 2.8583551204828295,
  "dragonWhiteKeep": 2.9818362851231037,
  "dragonGeneralKeep": 2.2527203988726976,
  "pairWeight": 4.461113126078833,
  "nearWeight": 4.0357824313562745,
  "tripletKeepBonus": 4.157096354944348,
  "terminalPenalty": 1,
  "wildKeepPenalty": 1682.511573348901,
  "wildBailoutThreshold": 3,
  "wild0Aggression": 0.3360843092809285,
  "wild1Aggression": 0.45116098936330645,
  "wild2Aggression": 0.5978617869144395,
  "wild3PlusAggression": 0.9,
  "wild1RouteMeldPush": 0.3320246566940525,
  "wild2RouteMeldPush": 0.6,
  "wild3RouteMeldPush": 0.8,
  "wild1RouteFlushBoost": 0.2770139465464556,
  "wild2RouteFlushBoost": 0.3,
  "wild3RouteFlushBoost": 0.47751980846352926,
  "wild1RouteHonorsBoost": 0,
  "wild2RouteHonorsBoost": 0.2,
  "wild3RouteHonorsBoost": 0.4,
  "wild1RouteAllPungsBoost": 0.13351151940938097,
  "wild2RouteAllPungsBoost": 0.35,
  "wild3RouteAllPungsBoost": 0.5011231296290346,
  "wildMultLowAggression": 0.48754844061673325,
  "wildMultMidAggression": 0.5292362851551664,
  "wildMultHighAggression": 0.8,
  "wild0MenqingKeep": 3.0702741060597987,
  "wild1MenqingKeep": 2.005138539192227,
  "wild2MenqingKeep": 1,
  "wild1BaoPush": 0.08669062614139302,
  "wild2BaoPush": 0.29290913092768045,
  "wild3BaoPush": 0.8,
  "multLowSpeedBias": 0.5,
  "multHighValueBias": 0.7829166927551453,
  "discardObsFlushBoost": 0.35515484953868587,
  "discardObsWeight": 0.3169784141834593,
  "bao2ClaimPenalty": 0.5522921350775664,
  "bao3AvoidThreshold": 0.7145038520760525,
  "baoSelfClaimCaution": 0.34518241257548415,
  "wallEarlySpeedPush": 0.20686863622758161,
  "wallMidBalance": 0.4405118254914803,
  "wallLateDefense": 0.8293461896013391,
  "oppTingDetection": 0.5,
  "safeTilePriority": 0.6225983733417838,
  "terminalDiscardTingSignal": 0.12122144254119702,
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
  "multHighHand7AllPungs": 0.016475966765284886,
  "multHighHand7HalfFlush": 0.4,
  "multHighHand7PureFlush": 0.7,
  "multHighHonorStart": 0.6353334176611241,
  "speedVsValueBalance": 0.5,
  "defenseRiskAversion": 0.42466527676568333,
  "wallTilesImpact": 0.2,
  "baoRiskAversion": 0.820177421702846,
  "baoThreshold": 2.728796388102271,
  "anKongAggression": 0.9564908137617628,
  "minkanAggression": 0.3782679008281927,
  "kakanAggression": 0.4092564618311265,
  "robKongAwareness": 0.4548909085267129,
  "noWildDoubleAwareness": 0.5,
  "menqingDoubleAwareness": 0.5325238795068113,
  "flushVsPungsBalance": 0.1,
  "honorVsSuitedBalance": -0.06499699959801614,
  "sequenceVsTripletBias": -0.1499834611379392,
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


### 第8轮 (强度=2.5, 停滞=7)
  C1: fitness=-2377 hu=4% self=10% disc=90% draws=579
  C2: fitness=-2259 hu=4% self=22% disc=78% draws=577
  C3: fitness=-2301 hu=4% self=18% disc=82% draws=578
  C4: fitness=-2428 hu=2% self=7% disc=93% draws=587
  C5: fitness=-2327 hu=3% self=16% disc=84% draws=581
  Best: -2259 (overall: -2117) [plateau: 8]
  指标: hu=4% self=22% disc=78% big=0% mq=9%

## Round 8 (2026-04-05T07:48:32.356Z)

### 📊 训练指标 Summary

| 指标 | 值 | K哥目标 | 达标 |
|------|-----|---------|------|
| 胡牌率 | 3.8% | ≥90% | ❌ |
| 流局率 | 96.2% | <10% | ❌ |
| 自摸率 | 21.7% | 40-60% | ❌ |
| 捉冲率 | 78.3% | 40-60% | ❌ |
| 血战率 | 0.0% | >80% | ❌ |
| 大牌率 | 0.0% | 3-8% | ❌ |
| 门清率 | 8.7% | 7-12% | ✅ |
| Fitness | -2259.4 | ↑ | — |

### 🀄 胡牌牌型分布

| 牌型 | 局数 | 占比 | K哥目标 |
|------|------|------|---------|
| 混一色 | 0 | 0.0% | ≥40% |
| 碰碰胡 | 9 | 39.1% | >25% |
| 清一色 | 0 | 0.0% | >20% |
| 清碰 | 0 | 0.0% | ~5% |
| 风一色 | 0 | 0.0% | ~5% |
| 风碰 | 0 | 0.0% | ~1% |
| 混碰 | 0 | 0.0% | — |
| 八花 | 0 | 0.0% | — |
| 四百搭 | 0 | 0.0% | — |

### 训练明细
- Games: 600
- 胡牌局: 23 (3.8%)
- 流局: 577 (96.2%)
- 血战到最后一人: 0 (0.00%)
- 平均回合: 0.09
- 平均总筹码: 0.60
- 自摸率(胡牌中): 21.74%
- 大牌率(胡牌中): 0.00%
- 门清胡牌率(胡牌中): 8.70%
- 胜者平均最终点: 6.00
- Fitness: -2259.4203

### 本轮最佳策略参数
```json
{
  "id": "AI-AK",
  "selfWinChance": 0.7665253481186775,
  "discardHuChance": 0.7,
  "selfWinWildBoost": 0.07606447145633338,
  "discardHuWildPenalty": 0.3446855442190276,
  "discardHuMenQingPenalty": 0.12,
  "pengChance": 0.938789252678985,
  "kongChance": 0.4889073961745143,
  "chowChance": 0.14827368164610186,
  "anKongChance": 0.9898296447948148,
  "pengWildBoost": 0.06282849518815241,
  "kongWildBoost": 0.20126250840315205,
  "chowWildPenalty": 0.22,
  "menqingKeepBonus": 3.964280380743445,
  "meldPenalty": 0.026829650548748255,
  "allPungsPursuit": 0.7356301930693369,
  "pureFlushPursuit": 0.5,
  "halfFlushWeight": 0.6,
  "sevenPairsPursuit": 0.0923754231446311,
  "allHonorsPursuit": 0.14083222760517888,
  "allHonorsPungsPursuit": 0,
  "qingPengPursuit": 0.2,
  "hunPengPursuit": 0.5442411827354836,
  "windEastKeep": 1.7663111765725783,
  "windSouthKeep": 2.575719909145446,
  "windWestKeep": 1.1156865715889224,
  "windNorthKeep": 0.7255064576387434,
  "windGeneralKeep": 1.5,
  "dragonRedKeep": 3.2916529588266354,
  "dragonGreenKeep": 2.8583551204828295,
  "dragonWhiteKeep": 2.9818362851231037,
  "dragonGeneralKeep": 2.2527203988726976,
  "pairWeight": 4.461113126078833,
  "nearWeight": 4.0357824313562745,
  "tripletKeepBonus": 4.157096354944348,
  "terminalPenalty": 1,
  "wildKeepPenalty": 1682.511573348901,
  "wildBailoutThreshold": 3,
  "wild0Aggression": 0.3360843092809285,
  "wild1Aggression": 0.45116098936330645,
  "wild2Aggression": 0.5978617869144395,
  "wild3PlusAggression": 0.9666379729586058,
  "wild1RouteMeldPush": 0.3320246566940525,
  "wild2RouteMeldPush": 0.6,
  "wild3RouteMeldPush": 0.8,
  "wild1RouteFlushBoost": 0.3094928789894137,
  "wild2RouteFlushBoost": 0.3,
  "wild3RouteFlushBoost": 0.47751980846352926,
  "wild1RouteHonorsBoost": 0,
  "wild2RouteHonorsBoost": 0.2,
  "wild3RouteHonorsBoost": 0.4,
  "wild1RouteAllPungsBoost": 0.13351151940938097,
  "wild2RouteAllPungsBoost": 0.35,
  "wild3RouteAllPungsBoost": 0.5011231296290346,
  "wildMultLowAggression": 0.48754844061673325,
  "wildMultMidAggression": 0.5292362851551664,
  "wildMultHighAggression": 0.8,
  "wild0MenqingKeep": 3.0702741060597987,
  "wild1MenqingKeep": 2.005138539192227,
  "wild2MenqingKeep": 1,
  "wild1BaoPush": 0.08669062614139302,
  "wild2BaoPush": 0.29290913092768045,
  "wild3BaoPush": 0.8,
  "multLowSpeedBias": 0.5,
  "multHighValueBias": 0.7829166927551453,
  "discardObsFlushBoost": 0.35515484953868587,
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
  "wildDiaoFlushBoost": 0.7032335290963154,
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
  "multHighHand7AllPungs": 0.016475966765284886,
  "multHighHand7HalfFlush": 0.4,
  "multHighHand7PureFlush": 0.7,
  "multHighHonorStart": 0.6353334176611241,
  "speedVsValueBalance": 0.5,
  "defenseRiskAversion": 0.42466527676568333,
  "wallTilesImpact": 0.2,
  "baoRiskAversion": 0.6174292204162568,
  "baoThreshold": 2.728796388102271,
  "anKongAggression": 0.9564908137617628,
  "minkanAggression": 0.3782679008281927,
  "kakanAggression": 0.4092564618311265,
  "robKongAwareness": 0.4548909085267129,
  "noWildDoubleAwareness": 0.5,
  "menqingDoubleAwareness": 0.5325238795068113,
  "flushVsPungsBalance": 0.1,
  "honorVsSuitedBalance": -0.06499699959801614,
  "sequenceVsTripletBias": -0.1499834611379392,
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
#### 最大赢局
- 最大赢利: AI-老赵 1800 点（绝对值 1800）
- 局号: 515
- 回合: 55
- 总筹码: 360
- 百搭: wan-8
- 回合/全局倍数信息:
  - 骰子点数: 2 + 2
  - 骰子倍数（清晰明了）: x2
  - 全局倍数: x1

- 输出该局所有胡牌玩家明细
  - 玩家: AI-老赵
    - 胡牌方式: 自摸
    - 牌型/基础番/最终点: 碰碰胡 / 3 / 6
    - 手牌牌面: 三筒 三筒 九筒 九筒 九筒 三筒 七筒 七筒
    - 门口牌（吃/碰/杠）: 碰:一条 一条 一条 ; 碰:六筒 六筒 六筒 ; 碰:八筒 八筒 八筒
    - 花牌: 竹

- 结算逐笔明细（谁付给谁、倍率和金额）
  - [自摸] AI-AK -> AI-老赵 : 60
  - [自摸] AI-小胖 -> AI-老赵 : 60
  - [自摸] AI-阿水 -> AI-老赵 : 60

---

#### 最大输局
- 最大亏损: AI-AK -600 点（绝对值 600）
- 局号: 515
- 回合: 55
- 总筹码: 360
- 百搭: wan-8
- 回合/全局倍数信息:
  - 骰子点数: 2 + 2
  - 骰子倍数（清晰明了）: x2
  - 全局倍数: x1

- 输出该局所有胡牌玩家明细
  - 玩家: AI-老赵
    - 胡牌方式: 自摸
    - 牌型/基础番/最终点: 碰碰胡 / 3 / 6
    - 手牌牌面: 三筒 三筒 九筒 九筒 九筒 三筒 七筒 七筒
    - 门口牌（吃/碰/杠）: 碰:一条 一条 一条 ; 碰:六筒 六筒 六筒 ; 碰:八筒 八筒 八筒
    - 花牌: 竹

- 结算逐笔明细（谁付给谁、倍率和金额）
  - [自摸] AI-AK -> AI-老赵 : 60
  - [自摸] AI-小胖 -> AI-老赵 : 60
  - [自摸] AI-阿水 -> AI-老赵 : 60

- 高倍数局数(骰子>=2): 1


### 第9轮 (强度=2.5, 停滞=8)
  C1: fitness=-2322 hu=3% self=16% disc=84% draws=581
  C2: fitness=-2227 hu=5% self=25% disc=75% draws=572
  C3: fitness=-2395 hu=4% self=5% disc=95% draws=578
  C4: fitness=-2247 hu=4% self=24% disc=76% draws=575
  C5: fitness=-2265 hu=4% self=23% disc=77% draws=578
  Best: -2227 (overall: -2117) [plateau: 9]
  指标: hu=5% self=25% disc=75% big=0% mq=4%

## Round 9 (2026-04-05T08:03:15.201Z)

### 📊 训练指标 Summary

| 指标 | 值 | K哥目标 | 达标 |
|------|-----|---------|------|
| 胡牌率 | 4.7% | ≥90% | ❌ |
| 流局率 | 95.3% | <10% | ❌ |
| 自摸率 | 25.0% | 40-60% | ❌ |
| 捉冲率 | 75.0% | 40-60% | ❌ |
| 血战率 | 0.0% | >80% | ❌ |
| 大牌率 | 0.0% | 3-8% | ❌ |
| 门清率 | 3.6% | 7-12% | ❌ |
| Fitness | -2226.8 | ↑ | — |

### 🀄 胡牌牌型分布

| 牌型 | 局数 | 占比 | K哥目标 |
|------|------|------|---------|
| 混一色 | 0 | 0.0% | ≥40% |
| 碰碰胡 | 11 | 39.3% | >25% |
| 清一色 | 0 | 0.0% | >20% |
| 清碰 | 0 | 0.0% | ~5% |
| 风一色 | 1 | 3.6% | ~5% |
| 风碰 | 0 | 0.0% | ~1% |
| 混碰 | 1 | 3.6% | — |
| 八花 | 0 | 0.0% | — |
| 四百搭 | 0 | 0.0% | — |

### 训练明细
- Games: 600
- 胡牌局: 28 (4.7%)
- 流局: 572 (95.3%)
- 血战到最后一人: 0 (0.00%)
- 平均回合: 0.00
- 平均总筹码: 0.00
- 自摸率(胡牌中): 25.00%
- 大牌率(胡牌中): 0.00%
- 门清胡牌率(胡牌中): 3.57%
- 胜者平均最终点: 0.00
- Fitness: -2226.8095

### 本轮最佳策略参数
```json
{
  "id": "AI-AK",
  "selfWinChance": 0.7665253481186775,
  "discardHuChance": 0.7,
  "selfWinWildBoost": 0.1266871952479135,
  "discardHuWildPenalty": 0.3446855442190276,
  "discardHuMenQingPenalty": 0.12,
  "pengChance": 0.938789252678985,
  "kongChance": 0.4889073961745143,
  "chowChance": 0.14827368164610186,
  "anKongChance": 0.9898296447948148,
  "pengWildBoost": 0.06282849518815241,
  "kongWildBoost": 0.17074969758870698,
  "chowWildPenalty": 0.22,
  "menqingKeepBonus": 3.964280380743445,
  "meldPenalty": 0.012112891562805757,
  "allPungsPursuit": 0.7356301930693369,
  "pureFlushPursuit": 0.5,
  "halfFlushWeight": 0.6,
  "sevenPairsPursuit": 0.15,
  "allHonorsPursuit": 0.14083222760517888,
  "allHonorsPungsPursuit": 0.08389067735611558,
  "qingPengPursuit": 0.2,
  "hunPengPursuit": 0.5442411827354836,
  "windEastKeep": 1.7663111765725783,
  "windSouthKeep": 2.575719909145446,
  "windWestKeep": 0.28510925145847965,
  "windNorthKeep": 0.7255064576387434,
  "windGeneralKeep": 1.5,
  "dragonRedKeep": 3.2916529588266354,
  "dragonGreenKeep": 2.8583551204828295,
  "dragonWhiteKeep": 2.9818362851231037,
  "dragonGeneralKeep": 2.2527203988726976,
  "pairWeight": 4.461113126078833,
  "nearWeight": 4.0357824313562745,
  "tripletKeepBonus": 4.157096354944348,
  "terminalPenalty": 1,
  "wildKeepPenalty": 1682.511573348901,
  "wildBailoutThreshold": 3,
  "wild0Aggression": 0.3360843092809285,
  "wild1Aggression": 0.45116098936330645,
  "wild2Aggression": 0.5978617869144395,
  "wild3PlusAggression": 0.9,
  "wild1RouteMeldPush": 0.36632231527645576,
  "wild2RouteMeldPush": 0.6,
  "wild3RouteMeldPush": 0.8,
  "wild1RouteFlushBoost": 0.3094928789894137,
  "wild2RouteFlushBoost": 0.3,
  "wild3RouteFlushBoost": 0.47751980846352926,
  "wild1RouteHonorsBoost": 0,
  "wild2RouteHonorsBoost": 0.2,
  "wild3RouteHonorsBoost": 0.4,
  "wild1RouteAllPungsBoost": 0.13351151940938097,
  "wild2RouteAllPungsBoost": 0.35,
  "wild3RouteAllPungsBoost": 0.5011231296290346,
  "wildMultLowAggression": 0.4830088227185984,
  "wildMultMidAggression": 0.5292362851551664,
  "wildMultHighAggression": 0.8,
  "wild0MenqingKeep": 3.0702741060597987,
  "wild1MenqingKeep": 2.005138539192227,
  "wild2MenqingKeep": 1,
  "wild1BaoPush": 0.08669062614139302,
  "wild2BaoPush": 0.29290913092768045,
  "wild3BaoPush": 0.8,
  "multLowSpeedBias": 0.5,
  "multHighValueBias": 0.7829166927551453,
  "discardObsFlushBoost": 0.35515484953868587,
  "discardObsWeight": 0.3169784141834593,
  "bao2ClaimPenalty": 0.5522921350775664,
  "bao3AvoidThreshold": 0.7145038520760525,
  "baoSelfClaimCaution": 0.34518241257548415,
  "wallEarlySpeedPush": 0.20686863622758161,
  "wallMidBalance": 0.4405118254914803,
  "wallLateDefense": 0.8293461896013391,
  "oppTingDetection": 0.35641452397735185,
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
  "multHighHand7AllPungs": 0.016475966765284886,
  "multHighHand7HalfFlush": 0.4,
  "multHighHand7PureFlush": 0.7,
  "multHighHonorStart": 0.6353334176611241,
  "speedVsValueBalance": 0.5,
  "defenseRiskAversion": 0.42466527676568333,
  "wallTilesImpact": 0.25041997170358987,
  "baoRiskAversion": 0.6174292204162568,
  "baoThreshold": 2.728796388102271,
  "anKongAggression": 0.9564908137617628,
  "minkanAggression": 0.3782679008281927,
  "kakanAggression": 0.4092564618311265,
  "robKongAwareness": 0.4548909085267129,
  "noWildDoubleAwareness": 0.5,
  "menqingDoubleAwareness": 0.5325238795068113,
  "flushVsPungsBalance": 0.1,
  "honorVsSuitedBalance": -0.06499699959801614,
  "sequenceVsTripletBias": -0.1499834611379392,
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


### 第10轮 (强度=2.5, 停滞=9)
  C1: fitness=-2351 hu=3% self=15% disc=85% draws=580
  C2: fitness=-2272 hu=3% self=25% disc=75% draws=584
  C3: fitness=-2381 hu=3% self=13% disc=87% draws=585
  C4: fitness=-2211 hu=3% self=33% disc=67% draws=582
  C5: fitness=-2291 hu=4% self=18% disc=82% draws=578
  Best: -2211 (overall: -2117) [plateau: 10]
  指标: hu=3% self=33% disc=67% big=0% mq=0%

## Round 10 (2026-04-05T08:18:02.698Z)

### 📊 训练指标 Summary

| 指标 | 值 | K哥目标 | 达标 |
|------|-----|---------|------|
| 胡牌率 | 3.0% | ≥90% | ❌ |
| 流局率 | 97.0% | <10% | ❌ |
| 自摸率 | 33.3% | 40-60% | ❌ |
| 捉冲率 | 66.7% | 40-60% | ❌ |
| 血战率 | 0.0% | >80% | ❌ |
| 大牌率 | 0.0% | 3-8% | ❌ |
| 门清率 | 0.0% | 7-12% | ❌ |
| Fitness | -2211.3 | ↑ | — |

### 🀄 胡牌牌型分布

| 牌型 | 局数 | 占比 | K哥目标 |
|------|------|------|---------|
| 混一色 | 0 | 0.0% | ≥40% |
| 碰碰胡 | 9 | 50.0% | >25% |
| 清一色 | 0 | 0.0% | >20% |
| 清碰 | 0 | 0.0% | ~5% |
| 风一色 | 0 | 0.0% | ~5% |
| 风碰 | 0 | 0.0% | ~1% |
| 混碰 | 0 | 0.0% | — |
| 八花 | 0 | 0.0% | — |
| 四百搭 | 0 | 0.0% | — |

### 训练明细
- Games: 600
- 胡牌局: 18 (3.0%)
- 流局: 582 (97.0%)
- 血战到最后一人: 0 (0.00%)
- 平均回合: 0.00
- 平均总筹码: 0.00
- 自摸率(胡牌中): 33.33%
- 大牌率(胡牌中): 0.00%
- 门清胡牌率(胡牌中): 0.00%
- 胜者平均最终点: 0.00
- Fitness: -2211.3333

### 本轮最佳策略参数
```json
{
  "id": "AI-AK",
  "selfWinChance": 0.7665253481186775,
  "discardHuChance": 0.7,
  "selfWinWildBoost": 0.1266871952479135,
  "discardHuWildPenalty": 0.3446855442190276,
  "discardHuMenQingPenalty": 0.12,
  "pengChance": 0.938789252678985,
  "kongChance": 0.4889073961745143,
  "chowChance": 0.14827368164610186,
  "anKongChance": 0.9898296447948148,
  "pengWildBoost": 0.06282849518815241,
  "kongWildBoost": 0.17074969758870698,
  "chowWildPenalty": 0.22,
  "menqingKeepBonus": 3.964280380743445,
  "meldPenalty": 0.026829650548748255,
  "allPungsPursuit": 0.7356301930693369,
  "pureFlushPursuit": 0.5,
  "halfFlushWeight": 0.6,
  "sevenPairsPursuit": 0.15,
  "allHonorsPursuit": 0.14083222760517888,
  "allHonorsPungsPursuit": 0.038184552024418936,
  "qingPengPursuit": 0.2,
  "hunPengPursuit": 0.5442411827354836,
  "windEastKeep": 1.7663111765725783,
  "windSouthKeep": 2.3111053903479974,
  "windWestKeep": 1.1156865715889224,
  "windNorthKeep": 0.7255064576387434,
  "windGeneralKeep": 1.5,
  "dragonRedKeep": 3.2916529588266354,
  "dragonGreenKeep": 2.8583551204828295,
  "dragonWhiteKeep": 2.9818362851231037,
  "dragonGeneralKeep": 2.2527203988726976,
  "pairWeight": 4.643630659993289,
  "nearWeight": 4.0357824313562745,
  "tripletKeepBonus": 4.157096354944348,
  "terminalPenalty": 1,
  "wildKeepPenalty": 1682.511573348901,
  "wildBailoutThreshold": 3,
  "wild0Aggression": 0.3360843092809285,
  "wild1Aggression": 0.45116098936330645,
  "wild2Aggression": 0.5978617869144395,
  "wild3PlusAggression": 0.9,
  "wild1RouteMeldPush": 0.3320246566940525,
  "wild2RouteMeldPush": 0.6,
  "wild3RouteMeldPush": 0.8,
  "wild1RouteFlushBoost": 0.3094928789894137,
  "wild2RouteFlushBoost": 0.3,
  "wild3RouteFlushBoost": 0.47751980846352926,
  "wild1RouteHonorsBoost": 0,
  "wild2RouteHonorsBoost": 0.2,
  "wild3RouteHonorsBoost": 0.4,
  "wild1RouteAllPungsBoost": 0.13351151940938097,
  "wild2RouteAllPungsBoost": 0.35,
  "wild3RouteAllPungsBoost": 0.5011231296290346,
  "wildMultLowAggression": 0.48754844061673325,
  "wildMultMidAggression": 0.5292362851551664,
  "wildMultHighAggression": 1,
  "wild0MenqingKeep": 3.0702741060597987,
  "wild1MenqingKeep": 2.005138539192227,
  "wild2MenqingKeep": 1,
  "wild1BaoPush": 0.08669062614139302,
  "wild2BaoPush": 0.29290913092768045,
  "wild3BaoPush": 0.8,
  "multLowSpeedBias": 0.5,
  "multHighValueBias": 0.7829166927551453,
  "discardObsFlushBoost": 0.35515484953868587,
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
  "multHighHand7AllPungs": 0.016475966765284886,
  "multHighHand7HalfFlush": 0.4,
  "multHighHand7PureFlush": 0.7,
  "multHighHonorStart": 0.6353334176611241,
  "speedVsValueBalance": 0.5,
  "defenseRiskAversion": 0.42466527676568333,
  "wallTilesImpact": 0.2,
  "baoRiskAversion": 0.6174292204162568,
  "baoThreshold": 2.728796388102271,
  "anKongAggression": 0.904876293029069,
  "minkanAggression": 0.3782679008281927,
  "kakanAggression": 0.4092564618311265,
  "robKongAwareness": 0.4548909085267129,
  "noWildDoubleAwareness": 0.5,
  "menqingDoubleAwareness": 0.5325238795068113,
  "flushVsPungsBalance": 0.1,
  "honorVsSuitedBalance": -0.06499699959801614,
  "sequenceVsTripletBias": -0.1499834611379392,
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


--- 最终评估 ---
| 指标 | 值 | 目标 | 达标 |
|------|-----|------|------|
| 胡牌率 | 4.3% | ≥90% | ❌ |
| 流局率 | 95.7% | <10% | ❌ |
| 自摸率 | 7.0% | 40-60% | ❌ |
| 捉冲率 | 93.0% | 40-60% | ❌ |
| 血战率 | 0.0% | >80% | ❌ |
| 大牌率 | 4.7% | 3-8% | ✅ |
| 门清率 | 9.3% | 7-12% | ✅ |

Fitness: -2353

  最佳策略参数 (关键):
    selfWinChance: 0.7665
    discardHuChance: 0.7000
    pengChance: 0.9388
    chowChance: 0.1483
    anKongChance: 0.9898
    allPungsPursuit: 0.7356
    pureFlushPursuit: 0.5000
    halfFlushWeight: 0.6000
    sevenPairsPursuit: 0.1500
    menqingKeepBonus: 3.9643
    noWildDoubleAwareness: 0.5000
    wild0Aggression: 0.3361
    wild1Aggression: 0.4512
    wild2Aggression: 0.5979
    wild3PlusAggression: 0.9000
    wild0MenqingKeep: 3.0703
    wild1MenqingKeep: 2.0051
    wild2MenqingKeep: 1
    multHighValueBias: 0.7829
    wallLateDefense: 0.8293
    safeTilePriority: 0.6226