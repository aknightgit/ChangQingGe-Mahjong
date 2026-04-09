# 长清阁麻将 全员基线收敛训练日志

- 创建时间: 2026-04-07T18:16:06.166Z
- 训练脚本: train-baseline.ts
- Config: 100 rounds × 10 games = 1000 total
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
| 胡牌率 | 10.0% | ≥90% |
| 流局率 | 90.0% | <10% |
| 自摸率 | 0.0% | 40-60% |
| 捉冲率 | 100.0% | 40-60% |
| 血战率 | 0.0% | >80% |
| 大牌率 | 0.0% | 3-8% |
| 门清率 | 100.0% | 7-12% |
| Fitness | -78616.0 | ↑ |

### 第1轮 (强度=1.0, 停滞=0)
  C1: fitness=-88454 hu=0% self=0% disc=0% draws=10
  C2: fitness=-88454 hu=0% self=0% disc=0% draws=10
  C3: fitness=-88454 hu=0% self=0% disc=0% draws=10
  C4: fitness=-88454 hu=0% self=0% disc=0% draws=10
  C5: fitness=-88454 hu=0% self=0% disc=0% draws=10
  Best: -88454 (overall: -78616) [plateau: 1]
  指标: hu=0% self=0% disc=0% big=0% mq=0%

## Round 1 (2026-04-07T18:16:18.406Z)

### 📊 训练指标 Summary

| 指标 | 值 | K哥目标 | 达标 |
|------|-----|---------|------|
| 胡牌率 | 0.0% | ≥90% | ❌ |
| 流局率 | 100.0% | <10% | ❌ |
| 自摸率 | 0.0% | 40-60% | ❌ |
| 捉冲率 | 0.0% | 40-60% | ❌ |
| 血战率 | 0.0% | >80% | ❌ |
| 大牌率 | 0.0% | 3-8% | ❌ |
| 门清率 | 0.0% | 7-12% | ❌ |
| Fitness | -88454.0 | ↑ | — |

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
- Games: 10
- 胡牌局: 0 (0.0%)
- 流局: 10 (100.0%)
- 血战到最后一人: 0 (0.00%)
- 平均回合: 0.00
- 平均总筹码: 0.00
- 自摸率(胡牌中): 0.00%
- 大牌率(胡牌中): 0.00%
- 门清胡牌率(胡牌中): 0.00%
- 胜者平均最终点: 0.00
- Fitness: -88454.0000

### 本轮最佳策略参数
```json
{
  "id": "AI-AK",
  "selfWinChance": 0.7665253481186775,
  "discardHuChance": 0.7,
  "selfWinWildBoost": 0.1266871952479135,
  "discardHuWildPenalty": 0.3484112283088031,
  "discardHuMenQingPenalty": 0.11443176185539769,
  "pengChance": 1,
  "kongChance": 0.5149119649159877,
  "chowChance": 0.35,
  "anKongChance": 0.9898296447948148,
  "pengWildBoost": 0.06282849518815241,
  "kongWildBoost": 0.17074969758870698,
  "chowWildPenalty": 0.22,
  "menqingKeepBonus": 2.8,
  "meldPenalty": 0.025679867261555692,
  "allPungsPursuit": 0.52,
  "pureFlushPursuit": 0.39155902112680335,
  "halfFlushWeight": 0.6,
  "sevenPairsPursuit": 0.15,
  "allHonorsPursuit": 0.14083222760517888,
  "allHonorsPungsPursuit": 0.08389067735611558,
  "qingPengPursuit": 0.49316917551025014,
  "hunPengPursuit": 0.5442411827354836,
  "windEastKeep": 1.7663111765725783,
  "windSouthKeep": 2.575719909145446,
  "windWestKeep": 1.1156865715889224,
  "windNorthKeep": 0.7255064576387434,
  "windGeneralKeep": 1.5,
  "dragonRedKeep": 3.2916529588266354,
  "dragonGreenKeep": 2.8583551204828295,
  "dragonWhiteKeep": 3.139412587580636,
  "dragonGeneralKeep": 1.6708964747800108,
  "pairWeight": 4.461113126078833,
  "nearWeight": 3.8258140895090156,
  "tripletKeepBonus": 4.157096354944348,
  "terminalPenalty": 0.6575230927938015,
  "wildKeepPenalty": 1741.4116998542363,
  "wildBailoutThreshold": 3,
  "wild0Aggression": 0.3360843092809285,
  "wild1Aggression": 0.40102709671115255,
  "wild2Aggression": 0.5978617869144395,
  "wild3PlusAggression": 0.9220505526317807,
  "wild1RouteMeldPush": 0.3320246566940525,
  "wild2RouteMeldPush": 0.6596439869769003,
  "wild3RouteMeldPush": 0.8154039015690847,
  "wild1RouteFlushBoost": 0.3094928789894137,
  "wild2RouteFlushBoost": 0.3,
  "wild3RouteFlushBoost": 0.47751980846352926,
  "wild1RouteHonorsBoost": 0,
  "wild2RouteHonorsBoost": 0.2,
  "wild3RouteHonorsBoost": 0.4,
  "wild1RouteAllPungsBoost": 0.13351151940938097,
  "wild2RouteAllPungsBoost": 0.35,
  "wild3RouteAllPungsBoost": 0.4148522800563274,
  "wildMultLowAggression": 0.5620867346505063,
  "wildMultMidAggression": 0.5292362851551664,
  "wildMultHighAggression": 0.7227574234587231,
  "wild0MenqingKeep": 3.0702741060597987,
  "wild1MenqingKeep": 2.005138539192227,
  "wild2MenqingKeep": 1,
  "wild1BaoPush": 0.08669062614139302,
  "wild2BaoPush": 0.29290913092768045,
  "wild3BaoPush": 0.8,
  "multLowSpeedBias": 0.5,
  "multHighValueBias": 0.7829166927551453,
  "discardObsFlushBoost": 0.3110395469495198,
  "discardObsWeight": 0.3169784141834593,
  "bao2ClaimPenalty": 0.5863659036046336,
  "bao3AvoidThreshold": 0.7145038520760525,
  "baoSelfClaimCaution": 0.34518241257548415,
  "wallEarlySpeedPush": 0.3131723772394867,
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
  "hand5RouteBias": 0.3123080868982012,
  "hand6RouteBias": 0.6,
  "hand7RouteBias": 0.9,
  "multLowHand5AllPungs": 0.4575758444068891,
  "multLowHand5HalfFlush": 0.43372616503943406,
  "multHighHand5AllPungs": 0.337344946620979,
  "multHighHand5HalfFlush": 0.31666786981618555,
  "multLowHand6AllPungs": 0.25,
  "multLowHand6HalfFlush": 0.286611677554435,
  "multLowHand6PureFlush": 0.25,
  "multHighHand6AllPungs": 0.25,
  "multHighHand6HalfFlush": 0.55,
  "multHighHand6PureFlush": 0.45,
  "multLowHand7AllPungs": 0.14838515905537536,
  "multLowHand7HalfFlush": 0.4,
  "multLowHand7PureFlush": 0.2793345675720549,
  "multHighHand7AllPungs": 0.002174926716114786,
  "multHighHand7HalfFlush": 0.4,
  "multHighHand7PureFlush": 0.6667608204361419,
  "multHighHonorStart": 0.6353334176611241,
  "speedVsValueBalance": 0.4761389105754947,
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
  "honorVsSuitedBalance": -0.06499699959801614,
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

### 最大输赢局明细（本轮）
- 本轮无有效对局数据


### 第2轮 (强度=1.0, 停滞=1)
  C1: fitness=-78616 hu=10% self=0% disc=100% draws=9
  C2: fitness=-88454 hu=0% self=0% disc=0% draws=10
  C3: fitness=-88454 hu=0% self=0% disc=0% draws=10
  C4: fitness=-78616 hu=10% self=100% disc=0% draws=9
  C5: fitness=-88454 hu=0% self=0% disc=0% draws=10
  Best: -78616 (overall: -78616) [plateau: 2]
  指标: hu=10% self=0% disc=100% big=0% mq=100%

## Round 2 (2026-04-07T18:16:30.514Z)

### 📊 训练指标 Summary

| 指标 | 值 | K哥目标 | 达标 |
|------|-----|---------|------|
| 胡牌率 | 10.0% | ≥90% | ❌ |
| 流局率 | 90.0% | <10% | ❌ |
| 自摸率 | 0.0% | 40-60% | ❌ |
| 捉冲率 | 100.0% | 40-60% | ❌ |
| 血战率 | 0.0% | >80% | ❌ |
| 大牌率 | 0.0% | 3-8% | ❌ |
| 门清率 | 100.0% | 7-12% | ❌ |
| Fitness | -78616.0 | ↑ | — |

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
- Games: 10
- 胡牌局: 1 (10.0%)
- 流局: 9 (90.0%)
- 血战到最后一人: 0 (0.00%)
- 平均回合: 0.00
- 平均总筹码: 0.00
- 自摸率(胡牌中): 0.00%
- 大牌率(胡牌中): 0.00%
- 门清胡牌率(胡牌中): 100.00%
- 胜者平均最终点: 0.00
- Fitness: -78616.0000

### 本轮最佳策略参数
```json
{
  "id": "AI-AK",
  "selfWinChance": 0.7665253481186775,
  "discardHuChance": 0.8,
  "selfWinWildBoost": 0.1266871952479135,
  "discardHuWildPenalty": 0.3484112283088031,
  "discardHuMenQingPenalty": 0.11443176185539769,
  "pengChance": 1,
  "kongChance": 0.5149119649159877,
  "chowChance": 0.35,
  "anKongChance": 0.9898296447948148,
  "pengWildBoost": 0.06282849518815241,
  "kongWildBoost": 0.17074969758870698,
  "chowWildPenalty": 0.22,
  "menqingKeepBonus": 2.8,
  "meldPenalty": 0.025679867261555692,
  "allPungsPursuit": 0.52,
  "pureFlushPursuit": 0.39155902112680335,
  "halfFlushWeight": 0.6,
  "sevenPairsPursuit": 0.15,
  "allHonorsPursuit": 0.14083222760517888,
  "allHonorsPungsPursuit": 0.20187742136785458,
  "qingPengPursuit": 0.49316917551025014,
  "hunPengPursuit": 0.5442411827354836,
  "windEastKeep": 1.7663111765725783,
  "windSouthKeep": 2.575719909145446,
  "windWestKeep": 1.1156865715889224,
  "windNorthKeep": 0.7490640009392583,
  "windGeneralKeep": 1.5,
  "dragonRedKeep": 3.2916529588266354,
  "dragonGreenKeep": 2.8583551204828295,
  "dragonWhiteKeep": 3.139412587580636,
  "dragonGeneralKeep": 1.6708964747800108,
  "pairWeight": 4.461113126078833,
  "nearWeight": 3.8258140895090156,
  "tripletKeepBonus": 4.157096354944348,
  "terminalPenalty": 0.6575230927938015,
  "wildKeepPenalty": 1741.4116998542363,
  "wildBailoutThreshold": 3,
  "wild0Aggression": 0.3360843092809285,
  "wild1Aggression": 0.40102709671115255,
  "wild2Aggression": 0.5978617869144395,
  "wild3PlusAggression": 0.9220505526317807,
  "wild1RouteMeldPush": 0.3320246566940525,
  "wild2RouteMeldPush": 0.6596439869769003,
  "wild3RouteMeldPush": 0.8154039015690847,
  "wild1RouteFlushBoost": 0.3094928789894137,
  "wild2RouteFlushBoost": 0.3,
  "wild3RouteFlushBoost": 0.47751980846352926,
  "wild1RouteHonorsBoost": 0,
  "wild2RouteHonorsBoost": 0.2,
  "wild3RouteHonorsBoost": 0.4,
  "wild1RouteAllPungsBoost": 0.13351151940938097,
  "wild2RouteAllPungsBoost": 0.35,
  "wild3RouteAllPungsBoost": 0.4148522800563274,
  "wildMultLowAggression": 0.5620867346505063,
  "wildMultMidAggression": 0.5292362851551664,
  "wildMultHighAggression": 0.7227574234587231,
  "wild0MenqingKeep": 3.0702741060597987,
  "wild1MenqingKeep": 2.005138539192227,
  "wild2MenqingKeep": 1,
  "wild1BaoPush": 0.08669062614139302,
  "wild2BaoPush": 0.29290913092768045,
  "wild3BaoPush": 0.8,
  "multLowSpeedBias": 0.5,
  "multHighValueBias": 0.7829166927551453,
  "discardObsFlushBoost": 0.3110395469495198,
  "discardObsWeight": 0.3169784141834593,
  "bao2ClaimPenalty": 0.5863659036046336,
  "bao3AvoidThreshold": 0.7145038520760525,
  "baoSelfClaimCaution": 0.34518241257548415,
  "wallEarlySpeedPush": 0.3131723772394867,
  "wallMidBalance": 0.4640720045293399,
  "wallLateDefense": 0.8369243910519695,
  "oppTingDetection": 0.5,
  "safeTilePriority": 0.6225983733417838,
  "terminalDiscardTingSignal": 0.2917110471347582,
  "wildDiaoKeepBonus": 2.908297060009122,
  "wildDiaoFlushBoost": 1.0928343303249333,
  "wildDiaoPungBoost": 2.4861437507327993,
  "scoreBehindRiskBoost": 1.0064560779164102,
  "scoreLeadDefenseBoost": 1,
  "hand5RouteBias": 0.3123080868982012,
  "hand6RouteBias": 0.6,
  "hand7RouteBias": 0.9,
  "multLowHand5AllPungs": 0.4575758444068891,
  "multLowHand5HalfFlush": 0.43372616503943406,
  "multHighHand5AllPungs": 0.337344946620979,
  "multHighHand5HalfFlush": 0.2850975128971883,
  "multLowHand6AllPungs": 0.25,
  "multLowHand6HalfFlush": 0.286611677554435,
  "multLowHand6PureFlush": 0.25,
  "multHighHand6AllPungs": 0.25,
  "multHighHand6HalfFlush": 0.55,
  "multHighHand6PureFlush": 0.45,
  "multLowHand7AllPungs": 0.2,
  "multLowHand7HalfFlush": 0.4,
  "multLowHand7PureFlush": 0.2793345675720549,
  "multHighHand7AllPungs": 0.016475966765284886,
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
  "honorVsSuitedBalance": -0.06499699959801614,
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

### 最大输赢局明细（本轮）
- 本轮无有效对局数据


### 第3轮 (强度=1.8, 停滞=2)
  C1: fitness=-88454 hu=0% self=0% disc=0% draws=10
  C2: fitness=-88454 hu=0% self=0% disc=0% draws=10
  C3: fitness=-88454 hu=0% self=0% disc=0% draws=10
  C4: fitness=-88454 hu=0% self=0% disc=0% draws=10
  C5: fitness=-88454 hu=0% self=0% disc=0% draws=10
  Best: -88454 (overall: -78616) [plateau: 3]
  指标: hu=0% self=0% disc=0% big=0% mq=0%

## Round 3 (2026-04-07T18:16:45.996Z)

### 📊 训练指标 Summary

| 指标 | 值 | K哥目标 | 达标 |
|------|-----|---------|------|
| 胡牌率 | 0.0% | ≥90% | ❌ |
| 流局率 | 100.0% | <10% | ❌ |
| 自摸率 | 0.0% | 40-60% | ❌ |
| 捉冲率 | 0.0% | 40-60% | ❌ |
| 血战率 | 0.0% | >80% | ❌ |
| 大牌率 | 0.0% | 3-8% | ❌ |
| 门清率 | 0.0% | 7-12% | ❌ |
| Fitness | -88454.0 | ↑ | — |

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
- Games: 10
- 胡牌局: 0 (0.0%)
- 流局: 10 (100.0%)
- 血战到最后一人: 0 (0.00%)
- 平均回合: 0.00
- 平均总筹码: 0.00
- 自摸率(胡牌中): 0.00%
- 大牌率(胡牌中): 0.00%
- 门清胡牌率(胡牌中): 0.00%
- 胜者平均最终点: 0.00
- Fitness: -88454.0000

### 本轮最佳策略参数
```json
{
  "id": "AI-AK",
  "selfWinChance": 0.7665253481186775,
  "discardHuChance": 0.8,
  "selfWinWildBoost": 0.1266871952479135,
  "discardHuWildPenalty": 0.3484112283088031,
  "discardHuMenQingPenalty": 0.11443176185539769,
  "pengChance": 1,
  "kongChance": 0.5149119649159877,
  "chowChance": 0.35,
  "anKongChance": 0.9898296447948148,
  "pengWildBoost": 0.06282849518815241,
  "kongWildBoost": 0.17074969758870698,
  "chowWildPenalty": 0.22,
  "menqingKeepBonus": 2.8,
  "meldPenalty": 0,
  "allPungsPursuit": 0.52,
  "pureFlushPursuit": 0.39155902112680335,
  "halfFlushWeight": 0.6,
  "sevenPairsPursuit": 0.15,
  "allHonorsPursuit": 0.14083222760517888,
  "allHonorsPungsPursuit": 0.08389067735611558,
  "qingPengPursuit": 0.49316917551025014,
  "hunPengPursuit": 0.5442411827354836,
  "windEastKeep": 1.7663111765725783,
  "windSouthKeep": 2.575719909145446,
  "windWestKeep": 1.1156865715889224,
  "windNorthKeep": 0.7255064576387434,
  "windGeneralKeep": 1.5,
  "dragonRedKeep": 3.2916529588266354,
  "dragonGreenKeep": 2.8583551204828295,
  "dragonWhiteKeep": 3.139412587580636,
  "dragonGeneralKeep": 1.6708964747800108,
  "pairWeight": 4.461113126078833,
  "nearWeight": 3.8258140895090156,
  "tripletKeepBonus": 4.157096354944348,
  "terminalPenalty": 0.6575230927938015,
  "wildKeepPenalty": 1741.4116998542363,
  "wildBailoutThreshold": 3,
  "wild0Aggression": 0.41554660571447266,
  "wild1Aggression": 0.40102709671115255,
  "wild2Aggression": 0.5978617869144395,
  "wild3PlusAggression": 0.9220505526317807,
  "wild1RouteMeldPush": 0.43128000150643764,
  "wild2RouteMeldPush": 0.6596439869769003,
  "wild3RouteMeldPush": 0.8154039015690847,
  "wild1RouteFlushBoost": 0.3094928789894137,
  "wild2RouteFlushBoost": 0.3,
  "wild3RouteFlushBoost": 0.47751980846352926,
  "wild1RouteHonorsBoost": 0,
  "wild2RouteHonorsBoost": 0.2,
  "wild3RouteHonorsBoost": 0.4,
  "wild1RouteAllPungsBoost": 0.13351151940938097,
  "wild2RouteAllPungsBoost": 0.35,
  "wild3RouteAllPungsBoost": 0.4148522800563274,
  "wildMultLowAggression": 0.5620867346505063,
  "wildMultMidAggression": 0.5292362851551664,
  "wildMultHighAggression": 0.7227574234587231,
  "wild0MenqingKeep": 3.0702741060597987,
  "wild1MenqingKeep": 2.005138539192227,
  "wild2MenqingKeep": 1,
  "wild1BaoPush": 0.08669062614139302,
  "wild2BaoPush": 0.29290913092768045,
  "wild3BaoPush": 0.8,
  "multLowSpeedBias": 0.5,
  "multHighValueBias": 0.7829166927551453,
  "discardObsFlushBoost": 0.3110395469495198,
  "discardObsWeight": 0.3169784141834593,
  "bao2ClaimPenalty": 0.5863659036046336,
  "bao3AvoidThreshold": 0.7145038520760525,
  "baoSelfClaimCaution": 0.34518241257548415,
  "wallEarlySpeedPush": 0.3131723772394867,
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
  "hand5RouteBias": 0.3123080868982012,
  "hand6RouteBias": 0.6,
  "hand7RouteBias": 0.9,
  "multLowHand5AllPungs": 0.4575758444068891,
  "multLowHand5HalfFlush": 0.43372616503943406,
  "multHighHand5AllPungs": 0.337344946620979,
  "multHighHand5HalfFlush": 0.2850975128971883,
  "multLowHand6AllPungs": 0.25,
  "multLowHand6HalfFlush": 0.286611677554435,
  "multLowHand6PureFlush": 0.25,
  "multHighHand6AllPungs": 0.25,
  "multHighHand6HalfFlush": 0.47132025897237806,
  "multHighHand6PureFlush": 0.45,
  "multLowHand7AllPungs": 0.2,
  "multLowHand7HalfFlush": 0.4,
  "multLowHand7PureFlush": 0.2793345675720549,
  "multHighHand7AllPungs": 0.016475966765284886,
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
  "honorVsSuitedBalance": -0.06499699959801614,
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

### 最大输赢局明细（本轮）
- 本轮无有效对局数据


### 第4轮 (强度=1.8, 停滞=3)
  C1: fitness=-78616 hu=10% self=0% disc=100% draws=9
  C2: fitness=-88454 hu=0% self=0% disc=0% draws=10
  C3: fitness=-88454 hu=0% self=0% disc=0% draws=10
  C4: fitness=-78616 hu=10% self=0% disc=100% draws=9
  C5: fitness=-78454 hu=10% self=0% disc=100% draws=9
  ★ NEW BEST! fitness=-78454
  指标: hu=10% self=0% disc=100% big=0% mq=0%

## Round 4 (2026-04-07T18:16:59.834Z)

### 📊 训练指标 Summary

| 指标 | 值 | K哥目标 | 达标 |
|------|-----|---------|------|
| 胡牌率 | 10.0% | ≥90% | ❌ |
| 流局率 | 90.0% | <10% | ❌ |
| 自摸率 | 0.0% | 40-60% | ❌ |
| 捉冲率 | 100.0% | 40-60% | ❌ |
| 血战率 | 0.0% | >80% | ❌ |
| 大牌率 | 0.0% | 3-8% | ❌ |
| 门清率 | 0.0% | 7-12% | ❌ |
| Fitness | -78454.0 | ↑ | — |

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
- Games: 10
- 胡牌局: 1 (10.0%)
- 流局: 9 (90.0%)
- 血战到最后一人: 0 (0.00%)
- 平均回合: 0.00
- 平均总筹码: 0.00
- 自摸率(胡牌中): 0.00%
- 大牌率(胡牌中): 0.00%
- 门清胡牌率(胡牌中): 0.00%
- 胜者平均最终点: 0.00
- Fitness: -78454.0000

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
  "chowChance": 0.35,
  "anKongChance": 0.9898296447948148,
  "pengWildBoost": 0.06282849518815241,
  "kongWildBoost": 0.17074969758870698,
  "chowWildPenalty": 0.22,
  "menqingKeepBonus": 2.8,
  "meldPenalty": 0.025679867261555692,
  "allPungsPursuit": 0.52,
  "pureFlushPursuit": 0.39155902112680335,
  "halfFlushWeight": 0.6,
  "sevenPairsPursuit": 0.15,
  "allHonorsPursuit": 0.14083222760517888,
  "allHonorsPungsPursuit": 0.08389067735611558,
  "qingPengPursuit": 0.49316917551025014,
  "hunPengPursuit": 0.5442411827354836,
  "windEastKeep": 1.7663111765725783,
  "windSouthKeep": 2.575719909145446,
  "windWestKeep": 1.1156865715889224,
  "windNorthKeep": 0.7255064576387434,
  "windGeneralKeep": 1.5,
  "dragonRedKeep": 3.2916529588266354,
  "dragonGreenKeep": 2.8583551204828295,
  "dragonWhiteKeep": 3.139412587580636,
  "dragonGeneralKeep": 1.6708964747800108,
  "pairWeight": 4.461113126078833,
  "nearWeight": 3.8258140895090156,
  "tripletKeepBonus": 4.157096354944348,
  "terminalPenalty": 0.6575230927938015,
  "wildKeepPenalty": 1741.4116998542363,
  "wildBailoutThreshold": 3,
  "wild0Aggression": 0.3360843092809285,
  "wild1Aggression": 0.40102709671115255,
  "wild2Aggression": 0.5978617869144395,
  "wild3PlusAggression": 0.9220505526317807,
  "wild1RouteMeldPush": 0.3320246566940525,
  "wild2RouteMeldPush": 0.6596439869769003,
  "wild3RouteMeldPush": 0.8154039015690847,
  "wild1RouteFlushBoost": 0.3094928789894137,
  "wild2RouteFlushBoost": 0.3,
  "wild3RouteFlushBoost": 0.47751980846352926,
  "wild1RouteHonorsBoost": 0,
  "wild2RouteHonorsBoost": 0.2,
  "wild3RouteHonorsBoost": 0.4,
  "wild1RouteAllPungsBoost": 0.13351151940938097,
  "wild2RouteAllPungsBoost": 0.35,
  "wild3RouteAllPungsBoost": 0.4148522800563274,
  "wildMultLowAggression": 0.5620867346505063,
  "wildMultMidAggression": 0.5292362851551664,
  "wildMultHighAggression": 0.7227574234587231,
  "wild0MenqingKeep": 3.0702741060597987,
  "wild1MenqingKeep": 2.005138539192227,
  "wild2MenqingKeep": 1.0417063383558394,
  "wild1BaoPush": 0.08669062614139302,
  "wild2BaoPush": 0.29290913092768045,
  "wild3BaoPush": 0.8,
  "multLowSpeedBias": 0.5,
  "multHighValueBias": 0.7829166927551453,
  "discardObsFlushBoost": 0.3110395469495198,
  "discardObsWeight": 0.3169784141834593,
  "bao2ClaimPenalty": 0.5863659036046336,
  "bao3AvoidThreshold": 0.7145038520760525,
  "baoSelfClaimCaution": 0.34518241257548415,
  "wallEarlySpeedPush": 0.3131723772394867,
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
  "hand5RouteBias": 0.3123080868982012,
  "hand6RouteBias": 0.6,
  "hand7RouteBias": 0.9,
  "multLowHand5AllPungs": 0.4575758444068891,
  "multLowHand5HalfFlush": 0.43372616503943406,
  "multHighHand5AllPungs": 0.337344946620979,
  "multHighHand5HalfFlush": 0.2850975128971883,
  "multLowHand6AllPungs": 0.25,
  "multLowHand6HalfFlush": 0.286611677554435,
  "multLowHand6PureFlush": 0.25,
  "multHighHand6AllPungs": 0.25,
  "multHighHand6HalfFlush": 0.55,
  "multHighHand6PureFlush": 0.45,
  "multLowHand7AllPungs": 0.2,
  "multLowHand7HalfFlush": 0.4,
  "multLowHand7PureFlush": 0.2793345675720549,
  "multHighHand7AllPungs": 0.016475966765284886,
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
  "honorVsSuitedBalance": -0.06499699959801614,
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

### 最大输赢局明细（本轮）
- 本轮无有效对局数据


### 第5轮 (强度=1.0, 停滞=0)
  C1: fitness=-88454 hu=0% self=0% disc=0% draws=10
  C2: fitness=-88454 hu=0% self=0% disc=0% draws=10
  C3: fitness=-78616 hu=10% self=100% disc=0% draws=9
  C4: fitness=-78616 hu=10% self=100% disc=0% draws=9
  C5: fitness=-88454 hu=0% self=0% disc=0% draws=10
  Best: -78616 (overall: -78454) [plateau: 1]
  指标: hu=10% self=100% disc=0% big=0% mq=100%

## Round 5 (2026-04-07T18:17:12.972Z)

### 📊 训练指标 Summary

| 指标 | 值 | K哥目标 | 达标 |
|------|-----|---------|------|
| 胡牌率 | 10.0% | ≥90% | ❌ |
| 流局率 | 90.0% | <10% | ❌ |
| 自摸率 | 100.0% | 40-60% | ❌ |
| 捉冲率 | 0.0% | 40-60% | ❌ |
| 血战率 | 0.0% | >80% | ❌ |
| 大牌率 | 0.0% | 3-8% | ❌ |
| 门清率 | 100.0% | 7-12% | ❌ |
| Fitness | -78616.0 | ↑ | — |

### 🀄 胡牌牌型分布

| 牌型 | 局数 | 占比 | K哥目标 |
|------|------|------|---------|
| 混一色 | 0 | 0.0% | ≥40% |
| 碰碰胡 | 1 | 100.0% | >25% |
| 清一色 | 0 | 0.0% | >20% |
| 清碰 | 0 | 0.0% | ~5% |
| 风一色 | 0 | 0.0% | ~5% |
| 风碰 | 0 | 0.0% | ~1% |
| 混碰 | 0 | 0.0% | — |
| 八花 | 0 | 0.0% | — |
| 四百搭 | 0 | 0.0% | — |

### 训练明细
- Games: 10
- 胡牌局: 1 (10.0%)
- 流局: 9 (90.0%)
- 血战到最后一人: 0 (0.00%)
- 平均回合: 0.00
- 平均总筹码: 0.00
- 自摸率(胡牌中): 100.00%
- 大牌率(胡牌中): 0.00%
- 门清胡牌率(胡牌中): 100.00%
- 胜者平均最终点: 0.00
- Fitness: -78616.0000

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
  "kongChance": 0.5775410209086521,
  "chowChance": 0.35,
  "anKongChance": 0.9898296447948148,
  "pengWildBoost": 0.06282849518815241,
  "kongWildBoost": 0.17074969758870698,
  "chowWildPenalty": 0.22,
  "menqingKeepBonus": 2.8,
  "meldPenalty": 0.025679867261555692,
  "allPungsPursuit": 0.52,
  "pureFlushPursuit": 0.39155902112680335,
  "halfFlushWeight": 0.6,
  "sevenPairsPursuit": 0.15,
  "allHonorsPursuit": 0.14083222760517888,
  "allHonorsPungsPursuit": 0.08389067735611558,
  "qingPengPursuit": 0.39187003368068907,
  "hunPengPursuit": 0.5442411827354836,
  "windEastKeep": 1.7663111765725783,
  "windSouthKeep": 2.575719909145446,
  "windWestKeep": 1.1156865715889224,
  "windNorthKeep": 0.7255064576387434,
  "windGeneralKeep": 1.5,
  "dragonRedKeep": 3.2916529588266354,
  "dragonGreenKeep": 2.8583551204828295,
  "dragonWhiteKeep": 3.139412587580636,
  "dragonGeneralKeep": 1.6708964747800108,
  "pairWeight": 4.461113126078833,
  "nearWeight": 3.8258140895090156,
  "tripletKeepBonus": 4.157096354944348,
  "terminalPenalty": 0.6575230927938015,
  "wildKeepPenalty": 1741.4116998542363,
  "wildBailoutThreshold": 3,
  "wild0Aggression": 0.3360843092809285,
  "wild1Aggression": 0.40102709671115255,
  "wild2Aggression": 0.5978617869144395,
  "wild3PlusAggression": 0.9220505526317807,
  "wild1RouteMeldPush": 0.3320246566940525,
  "wild2RouteMeldPush": 0.6596439869769003,
  "wild3RouteMeldPush": 0.8154039015690847,
  "wild1RouteFlushBoost": 0.3094928789894137,
  "wild2RouteFlushBoost": 0.3,
  "wild3RouteFlushBoost": 0.47751980846352926,
  "wild1RouteHonorsBoost": 0,
  "wild2RouteHonorsBoost": 0.2,
  "wild3RouteHonorsBoost": 0.4,
  "wild1RouteAllPungsBoost": 0.13351151940938097,
  "wild2RouteAllPungsBoost": 0.35,
  "wild3RouteAllPungsBoost": 0.4148522800563274,
  "wildMultLowAggression": 0.5620867346505063,
  "wildMultMidAggression": 0.5292362851551664,
  "wildMultHighAggression": 0.7227574234587231,
  "wild0MenqingKeep": 3.0702741060597987,
  "wild1MenqingKeep": 2.005138539192227,
  "wild2MenqingKeep": 1.0417063383558394,
  "wild1BaoPush": 0.08669062614139302,
  "wild2BaoPush": 0.29290913092768045,
  "wild3BaoPush": 0.8,
  "multLowSpeedBias": 0.5,
  "multHighValueBias": 0.7829166927551453,
  "discardObsFlushBoost": 0.3110395469495198,
  "discardObsWeight": 0.3169784141834593,
  "bao2ClaimPenalty": 0.5863659036046336,
  "bao3AvoidThreshold": 0.7145038520760525,
  "baoSelfClaimCaution": 0.34518241257548415,
  "wallEarlySpeedPush": 0.3131723772394867,
  "wallMidBalance": 0.4405118254914803,
  "wallLateDefense": 0.8293461896013391,
  "oppTingDetection": 0.5,
  "safeTilePriority": 0.6225983733417838,
  "terminalDiscardTingSignal": 0.2917110471347582,
  "wildDiaoKeepBonus": 2.908297060009122,
  "wildDiaoFlushBoost": 1.0928343303249333,
  "wildDiaoPungBoost": 2.4861437507327993,
  "scoreBehindRiskBoost": 0.836700163429583,
  "scoreLeadDefenseBoost": 1,
  "hand5RouteBias": 0.3123080868982012,
  "hand6RouteBias": 0.6,
  "hand7RouteBias": 0.9,
  "multLowHand5AllPungs": 0.4575758444068891,
  "multLowHand5HalfFlush": 0.43372616503943406,
  "multHighHand5AllPungs": 0.337344946620979,
  "multHighHand5HalfFlush": 0.2850975128971883,
  "multLowHand6AllPungs": 0.25,
  "multLowHand6HalfFlush": 0.286611677554435,
  "multLowHand6PureFlush": 0.25,
  "multHighHand6AllPungs": 0.25,
  "multHighHand6HalfFlush": 0.55,
  "multHighHand6PureFlush": 0.45,
  "multLowHand7AllPungs": 0.2,
  "multLowHand7HalfFlush": 0.4,
  "multLowHand7PureFlush": 0.2793345675720549,
  "multHighHand7AllPungs": 0.016475966765284886,
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
  "honorVsSuitedBalance": -0.06499699959801614,
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

### 最大输赢局明细（本轮）
- 本轮无有效对局数据


### 第6轮 (强度=1.0, 停滞=1)
  C1: fitness=-88454 hu=0% self=0% disc=0% draws=10
  C2: fitness=-88454 hu=0% self=0% disc=0% draws=10
  C3: fitness=-88454 hu=0% self=0% disc=0% draws=10
  C4: fitness=-88454 hu=0% self=0% disc=0% draws=10
  C5: fitness=-88454 hu=0% self=0% disc=0% draws=10
  Best: -88454 (overall: -78454) [plateau: 2]
  指标: hu=0% self=0% disc=0% big=0% mq=0%

## Round 6 (2026-04-07T18:17:26.689Z)

### 📊 训练指标 Summary

| 指标 | 值 | K哥目标 | 达标 |
|------|-----|---------|------|
| 胡牌率 | 0.0% | ≥90% | ❌ |
| 流局率 | 100.0% | <10% | ❌ |
| 自摸率 | 0.0% | 40-60% | ❌ |
| 捉冲率 | 0.0% | 40-60% | ❌ |
| 血战率 | 0.0% | >80% | ❌ |
| 大牌率 | 0.0% | 3-8% | ❌ |
| 门清率 | 0.0% | 7-12% | ❌ |
| Fitness | -88454.0 | ↑ | — |

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
- Games: 10
- 胡牌局: 0 (0.0%)
- 流局: 10 (100.0%)
- 血战到最后一人: 0 (0.00%)
- 平均回合: 0.00
- 平均总筹码: 0.00
- 自摸率(胡牌中): 0.00%
- 大牌率(胡牌中): 0.00%
- 门清胡牌率(胡牌中): 0.00%
- 胜者平均最终点: 0.00
- Fitness: -88454.0000

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
  "chowChance": 0.35,
  "anKongChance": 0.9898296447948148,
  "pengWildBoost": 0.06282849518815241,
  "kongWildBoost": 0.17074969758870698,
  "chowWildPenalty": 0.22,
  "menqingKeepBonus": 3.0126906172763435,
  "meldPenalty": 0.025679867261555692,
  "allPungsPursuit": 0.52,
  "pureFlushPursuit": 0.39155902112680335,
  "halfFlushWeight": 0.6,
  "sevenPairsPursuit": 0.15,
  "allHonorsPursuit": 0.22411639442029796,
  "allHonorsPungsPursuit": 0.08389067735611558,
  "qingPengPursuit": 0.49316917551025014,
  "hunPengPursuit": 0.5442411827354836,
  "windEastKeep": 1.7663111765725783,
  "windSouthKeep": 2.575719909145446,
  "windWestKeep": 1.1156865715889224,
  "windNorthKeep": 0.7255064576387434,
  "windGeneralKeep": 1.5,
  "dragonRedKeep": 3.2916529588266354,
  "dragonGreenKeep": 2.8583551204828295,
  "dragonWhiteKeep": 2.856808210017579,
  "dragonGeneralKeep": 1.6708964747800108,
  "pairWeight": 4.461113126078833,
  "nearWeight": 3.8258140895090156,
  "tripletKeepBonus": 4.157096354944348,
  "terminalPenalty": 0.6575230927938015,
  "wildKeepPenalty": 1829.4857031855672,
  "wildBailoutThreshold": 3,
  "wild0Aggression": 0.3360843092809285,
  "wild1Aggression": 0.40102709671115255,
  "wild2Aggression": 0.5978617869144395,
  "wild3PlusAggression": 0.9220505526317807,
  "wild1RouteMeldPush": 0.32110427000545316,
  "wild2RouteMeldPush": 0.6596439869769003,
  "wild3RouteMeldPush": 0.8154039015690847,
  "wild1RouteFlushBoost": 0.3094928789894137,
  "wild2RouteFlushBoost": 0.3,
  "wild3RouteFlushBoost": 0.47751980846352926,
  "wild1RouteHonorsBoost": 0,
  "wild2RouteHonorsBoost": 0.2,
  "wild3RouteHonorsBoost": 0.4,
  "wild1RouteAllPungsBoost": 0.13351151940938097,
  "wild2RouteAllPungsBoost": 0.35,
  "wild3RouteAllPungsBoost": 0.4148522800563274,
  "wildMultLowAggression": 0.5620867346505063,
  "wildMultMidAggression": 0.5292362851551664,
  "wildMultHighAggression": 0.7227574234587231,
  "wild0MenqingKeep": 3.0702741060597987,
  "wild1MenqingKeep": 2.005138539192227,
  "wild2MenqingKeep": 1.0417063383558394,
  "wild1BaoPush": 0.08669062614139302,
  "wild2BaoPush": 0.29290913092768045,
  "wild3BaoPush": 0.8,
  "multLowSpeedBias": 0.5,
  "multHighValueBias": 0.7829166927551453,
  "discardObsFlushBoost": 0.3110395469495198,
  "discardObsWeight": 0.3169784141834593,
  "bao2ClaimPenalty": 0.5863659036046336,
  "bao3AvoidThreshold": 0.7145038520760525,
  "baoSelfClaimCaution": 0.34518241257548415,
  "wallEarlySpeedPush": 0.3131723772394867,
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
  "hand5RouteBias": 0.3123080868982012,
  "hand6RouteBias": 0.6,
  "hand7RouteBias": 0.9,
  "multLowHand5AllPungs": 0.4575758444068891,
  "multLowHand5HalfFlush": 0.43372616503943406,
  "multHighHand5AllPungs": 0.337344946620979,
  "multHighHand5HalfFlush": 0.2850975128971883,
  "multLowHand6AllPungs": 0.25,
  "multLowHand6HalfFlush": 0.286611677554435,
  "multLowHand6PureFlush": 0.25,
  "multHighHand6AllPungs": 0.25,
  "multHighHand6HalfFlush": 0.55,
  "multHighHand6PureFlush": 0.45,
  "multLowHand7AllPungs": 0.2,
  "multLowHand7HalfFlush": 0.4,
  "multLowHand7PureFlush": 0.2793345675720549,
  "multHighHand7AllPungs": 0.016475966765284886,
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
  "honorVsSuitedBalance": -0.06499699959801614,
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

### 最大输赢局明细（本轮）
- 本轮无有效对局数据


### 第7轮 (强度=1.8, 停滞=2)
  C1: fitness=-88454 hu=0% self=0% disc=0% draws=10
  C2: fitness=-88454 hu=0% self=0% disc=0% draws=10
  C3: fitness=-88454 hu=0% self=0% disc=0% draws=10
  C4: fitness=-88454 hu=0% self=0% disc=0% draws=10
  C5: fitness=-88454 hu=0% self=0% disc=0% draws=10
  Best: -88454 (overall: -78454) [plateau: 3]
  指标: hu=0% self=0% disc=0% big=0% mq=0%

## Round 7 (2026-04-07T18:17:39.793Z)

### 📊 训练指标 Summary

| 指标 | 值 | K哥目标 | 达标 |
|------|-----|---------|------|
| 胡牌率 | 0.0% | ≥90% | ❌ |
| 流局率 | 100.0% | <10% | ❌ |
| 自摸率 | 0.0% | 40-60% | ❌ |
| 捉冲率 | 0.0% | 40-60% | ❌ |
| 血战率 | 0.0% | >80% | ❌ |
| 大牌率 | 0.0% | 3-8% | ❌ |
| 门清率 | 0.0% | 7-12% | ❌ |
| Fitness | -88454.0 | ↑ | — |

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
- Games: 10
- 胡牌局: 0 (0.0%)
- 流局: 10 (100.0%)
- 血战到最后一人: 0 (0.00%)
- 平均回合: 0.00
- 平均总筹码: 0.00
- 自摸率(胡牌中): 0.00%
- 大牌率(胡牌中): 0.00%
- 门清胡牌率(胡牌中): 0.00%
- 胜者平均最终点: 0.00
- Fitness: -88454.0000

### 本轮最佳策略参数
```json
{
  "id": "AI-AK",
  "selfWinChance": 0.8570234918322802,
  "discardHuChance": 0.8,
  "selfWinWildBoost": 0.1266871952479135,
  "discardHuWildPenalty": 0.3484112283088031,
  "discardHuMenQingPenalty": 0.11443176185539769,
  "pengChance": 1,
  "kongChance": 0.631045593772053,
  "chowChance": 0.35,
  "anKongChance": 0.9898296447948148,
  "pengWildBoost": 0.06282849518815241,
  "kongWildBoost": 0.17074969758870698,
  "chowWildPenalty": 0.22,
  "menqingKeepBonus": 2.8,
  "meldPenalty": 0.025679867261555692,
  "allPungsPursuit": 0.52,
  "pureFlushPursuit": 0.39155902112680335,
  "halfFlushWeight": 0.6,
  "sevenPairsPursuit": 0.15,
  "allHonorsPursuit": 0.14083222760517888,
  "allHonorsPungsPursuit": 0.08389067735611558,
  "qingPengPursuit": 0.49316917551025014,
  "hunPengPursuit": 0.5442411827354836,
  "windEastKeep": 1.7663111765725783,
  "windSouthKeep": 2.575719909145446,
  "windWestKeep": 1.1156865715889224,
  "windNorthKeep": 0.7255064576387434,
  "windGeneralKeep": 1.4407294614562216,
  "dragonRedKeep": 3.2916529588266354,
  "dragonGreenKeep": 2.8583551204828295,
  "dragonWhiteKeep": 3.139412587580636,
  "dragonGeneralKeep": 1.6708964747800108,
  "pairWeight": 4.461113126078833,
  "nearWeight": 3.8258140895090156,
  "tripletKeepBonus": 4.157096354944348,
  "terminalPenalty": 0.6575230927938015,
  "wildKeepPenalty": 1741.4116998542363,
  "wildBailoutThreshold": 3,
  "wild0Aggression": 0.3360843092809285,
  "wild1Aggression": 0.40102709671115255,
  "wild2Aggression": 0.5978617869144395,
  "wild3PlusAggression": 0.9220505526317807,
  "wild1RouteMeldPush": 0.3320246566940525,
  "wild2RouteMeldPush": 0.6596439869769003,
  "wild3RouteMeldPush": 0.8154039015690847,
  "wild1RouteFlushBoost": 0.3094928789894137,
  "wild2RouteFlushBoost": 0.3,
  "wild3RouteFlushBoost": 0.47751980846352926,
  "wild1RouteHonorsBoost": 0,
  "wild2RouteHonorsBoost": 0.2,
  "wild3RouteHonorsBoost": 0.4,
  "wild1RouteAllPungsBoost": 0.13351151940938097,
  "wild2RouteAllPungsBoost": 0.35,
  "wild3RouteAllPungsBoost": 0.4148522800563274,
  "wildMultLowAggression": 0.5620867346505063,
  "wildMultMidAggression": 0.5292362851551664,
  "wildMultHighAggression": 0.7227574234587231,
  "wild0MenqingKeep": 3.0702741060597987,
  "wild1MenqingKeep": 2.005138539192227,
  "wild2MenqingKeep": 1.0417063383558394,
  "wild1BaoPush": 0.08669062614139302,
  "wild2BaoPush": 0.29290913092768045,
  "wild3BaoPush": 0.8,
  "multLowSpeedBias": 0.5,
  "multHighValueBias": 0.7829166927551453,
  "discardObsFlushBoost": 0.3110395469495198,
  "discardObsWeight": 0.3169784141834593,
  "bao2ClaimPenalty": 0.5863659036046336,
  "bao3AvoidThreshold": 0.7145038520760525,
  "baoSelfClaimCaution": 0.34518241257548415,
  "wallEarlySpeedPush": 0.3131723772394867,
  "wallMidBalance": 0.4405118254914803,
  "wallLateDefense": 0.8293461896013391,
  "oppTingDetection": 0.4805935775149719,
  "safeTilePriority": 0.6225983733417838,
  "terminalDiscardTingSignal": 0.2917110471347582,
  "wildDiaoKeepBonus": 2.908297060009122,
  "wildDiaoFlushBoost": 1.0928343303249333,
  "wildDiaoPungBoost": 2.4861437507327993,
  "scoreBehindRiskBoost": 1.0064560779164102,
  "scoreLeadDefenseBoost": 1,
  "hand5RouteBias": 0.3123080868982012,
  "hand6RouteBias": 0.6,
  "hand7RouteBias": 0.9,
  "multLowHand5AllPungs": 0.4575758444068891,
  "multLowHand5HalfFlush": 0.43372616503943406,
  "multHighHand5AllPungs": 0.337344946620979,
  "multHighHand5HalfFlush": 0.2850975128971883,
  "multLowHand6AllPungs": 0.25,
  "multLowHand6HalfFlush": 0.286611677554435,
  "multLowHand6PureFlush": 0.25,
  "multHighHand6AllPungs": 0.25,
  "multHighHand6HalfFlush": 0.55,
  "multHighHand6PureFlush": 0.45,
  "multLowHand7AllPungs": 0.2,
  "multLowHand7HalfFlush": 0.4,
  "multLowHand7PureFlush": 0.2793345675720549,
  "multHighHand7AllPungs": 0.016475966765284886,
  "multHighHand7HalfFlush": 0.4,
  "multHighHand7PureFlush": 0.6667608204361419,
  "multHighHonorStart": 0.6353334176611241,
  "speedVsValueBalance": 0.5,
  "defenseRiskAversion": 0.42466527676568333,
  "wallTilesImpact": 0.2,
  "baoRiskAversion": 0.6174292204162568,
  "baoThreshold": 4,
  "anKongAggression": 1,
  "minkanAggression": 0.3782679008281927,
  "kakanAggression": 0.4092564618311265,
  "robKongAwareness": 0.4548909085267129,
  "noWildDoubleAwareness": 0.44641326791251484,
  "menqingDoubleAwareness": 0.5325238795068113,
  "flushVsPungsBalance": 0.1,
  "honorVsSuitedBalance": -0.06499699959801614,
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

### 最大输赢局明细（本轮）
- 本轮无有效对局数据


### 第8轮 (强度=1.8, 停滞=3)
  C1: fitness=-88454 hu=0% self=0% disc=0% draws=10
  C2: fitness=-88454 hu=0% self=0% disc=0% draws=10
  C3: fitness=-78454 hu=10% self=0% disc=100% draws=9
  C4: fitness=-88454 hu=0% self=0% disc=0% draws=10
  C5: fitness=-78616 hu=10% self=0% disc=100% draws=9
  Best: -78454 (overall: -78454) [plateau: 4]
  指标: hu=10% self=0% disc=100% big=0% mq=0%

## Round 8 (2026-04-07T18:17:52.946Z)

### 📊 训练指标 Summary

| 指标 | 值 | K哥目标 | 达标 |
|------|-----|---------|------|
| 胡牌率 | 10.0% | ≥90% | ❌ |
| 流局率 | 90.0% | <10% | ❌ |
| 自摸率 | 0.0% | 40-60% | ❌ |
| 捉冲率 | 100.0% | 40-60% | ❌ |
| 血战率 | 0.0% | >80% | ❌ |
| 大牌率 | 0.0% | 3-8% | ❌ |
| 门清率 | 0.0% | 7-12% | ❌ |
| Fitness | -78454.0 | ↑ | — |

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
- Games: 10
- 胡牌局: 1 (10.0%)
- 流局: 9 (90.0%)
- 血战到最后一人: 0 (0.00%)
- 平均回合: 0.00
- 平均总筹码: 0.00
- 自摸率(胡牌中): 0.00%
- 大牌率(胡牌中): 0.00%
- 门清胡牌率(胡牌中): 0.00%
- 胜者平均最终点: 0.00
- Fitness: -78454.0000

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
  "kongChance": 0.5056713100852482,
  "chowChance": 0.35,
  "anKongChance": 0.9898296447948148,
  "pengWildBoost": 0.06282849518815241,
  "kongWildBoost": 0.17074969758870698,
  "chowWildPenalty": 0.22,
  "menqingKeepBonus": 2.8,
  "meldPenalty": 0.025679867261555692,
  "allPungsPursuit": 0.52,
  "pureFlushPursuit": 0.39155902112680335,
  "halfFlushWeight": 0.6,
  "sevenPairsPursuit": 0.15,
  "allHonorsPursuit": 0.14083222760517888,
  "allHonorsPungsPursuit": 0.08389067735611558,
  "qingPengPursuit": 0.49316917551025014,
  "hunPengPursuit": 0.5442411827354836,
  "windEastKeep": 1.7663111765725783,
  "windSouthKeep": 2.575719909145446,
  "windWestKeep": 1.1156865715889224,
  "windNorthKeep": 0.7255064576387434,
  "windGeneralKeep": 1.5,
  "dragonRedKeep": 2.785842085943963,
  "dragonGreenKeep": 2.8583551204828295,
  "dragonWhiteKeep": 3.139412587580636,
  "dragonGeneralKeep": 1.6708964747800108,
  "pairWeight": 4.461113126078833,
  "nearWeight": 3.8258140895090156,
  "tripletKeepBonus": 4.157096354944348,
  "terminalPenalty": 0.6575230927938015,
  "wildKeepPenalty": 1741.4116998542363,
  "wildBailoutThreshold": 3,
  "wild0Aggression": 0.3360843092809285,
  "wild1Aggression": 0.40102709671115255,
  "wild2Aggression": 0.5978617869144395,
  "wild3PlusAggression": 0.9220505526317807,
  "wild1RouteMeldPush": 0.3320246566940525,
  "wild2RouteMeldPush": 0.6596439869769003,
  "wild3RouteMeldPush": 0.8154039015690847,
  "wild1RouteFlushBoost": 0.3094928789894137,
  "wild2RouteFlushBoost": 0.3,
  "wild3RouteFlushBoost": 0.47751980846352926,
  "wild1RouteHonorsBoost": 0,
  "wild2RouteHonorsBoost": 0.2,
  "wild3RouteHonorsBoost": 0.4,
  "wild1RouteAllPungsBoost": 0.13351151940938097,
  "wild2RouteAllPungsBoost": 0.35,
  "wild3RouteAllPungsBoost": 0.34862965058239076,
  "wildMultLowAggression": 0.5620867346505063,
  "wildMultMidAggression": 0.5292362851551664,
  "wildMultHighAggression": 0.7227574234587231,
  "wild0MenqingKeep": 3.0702741060597987,
  "wild1MenqingKeep": 2.005138539192227,
  "wild2MenqingKeep": 1.0417063383558394,
  "wild1BaoPush": 0.08669062614139302,
  "wild2BaoPush": 0.29290913092768045,
  "wild3BaoPush": 0.8,
  "multLowSpeedBias": 0.5,
  "multHighValueBias": 0.7829166927551453,
  "discardObsFlushBoost": 0.3110395469495198,
  "discardObsWeight": 0.3169784141834593,
  "bao2ClaimPenalty": 0.4872014040996259,
  "bao3AvoidThreshold": 0.7145038520760525,
  "baoSelfClaimCaution": 0.34518241257548415,
  "wallEarlySpeedPush": 0.3131723772394867,
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
  "hand5RouteBias": 0.3123080868982012,
  "hand6RouteBias": 0.6,
  "hand7RouteBias": 0.9,
  "multLowHand5AllPungs": 0.4575758444068891,
  "multLowHand5HalfFlush": 0.43372616503943406,
  "multHighHand5AllPungs": 0.337344946620979,
  "multHighHand5HalfFlush": 0.2850975128971883,
  "multLowHand6AllPungs": 0.25,
  "multLowHand6HalfFlush": 0.286611677554435,
  "multLowHand6PureFlush": 0.25,
  "multHighHand6AllPungs": 0.25,
  "multHighHand6HalfFlush": 0.55,
  "multHighHand6PureFlush": 0.45,
  "multLowHand7AllPungs": 0.2,
  "multLowHand7HalfFlush": 0.4,
  "multLowHand7PureFlush": 0.2793345675720549,
  "multHighHand7AllPungs": 0.016475966765284886,
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
  "honorVsSuitedBalance": -0.06499699959801614,
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

### 最大输赢局明细（本轮）
- 本轮无有效对局数据


### 第9轮 (强度=2.5, 停滞=4)
  C1: fitness=-78616 hu=10% self=100% disc=0% draws=9
  C2: fitness=-88454 hu=0% self=0% disc=0% draws=10
  C3: fitness=-88454 hu=0% self=0% disc=0% draws=10
  C4: fitness=-88454 hu=0% self=0% disc=0% draws=10
  C5: fitness=-88454 hu=0% self=0% disc=0% draws=10
  Best: -78616 (overall: -78454) [plateau: 5]
  指标: hu=10% self=100% disc=0% big=0% mq=100%

## Round 9 (2026-04-07T18:18:06.148Z)

### 📊 训练指标 Summary

| 指标 | 值 | K哥目标 | 达标 |
|------|-----|---------|------|
| 胡牌率 | 10.0% | ≥90% | ❌ |
| 流局率 | 90.0% | <10% | ❌ |
| 自摸率 | 100.0% | 40-60% | ❌ |
| 捉冲率 | 0.0% | 40-60% | ❌ |
| 血战率 | 0.0% | >80% | ❌ |
| 大牌率 | 0.0% | 3-8% | ❌ |
| 门清率 | 100.0% | 7-12% | ❌ |
| Fitness | -78616.0 | ↑ | — |

### 🀄 胡牌牌型分布

| 牌型 | 局数 | 占比 | K哥目标 |
|------|------|------|---------|
| 混一色 | 0 | 0.0% | ≥40% |
| 碰碰胡 | 1 | 100.0% | >25% |
| 清一色 | 0 | 0.0% | >20% |
| 清碰 | 0 | 0.0% | ~5% |
| 风一色 | 0 | 0.0% | ~5% |
| 风碰 | 0 | 0.0% | ~1% |
| 混碰 | 0 | 0.0% | — |
| 八花 | 0 | 0.0% | — |
| 四百搭 | 0 | 0.0% | — |

### 训练明细
- Games: 10
- 胡牌局: 1 (10.0%)
- 流局: 9 (90.0%)
- 血战到最后一人: 0 (0.00%)
- 平均回合: 0.00
- 平均总筹码: 0.00
- 自摸率(胡牌中): 100.00%
- 大牌率(胡牌中): 0.00%
- 门清胡牌率(胡牌中): 100.00%
- 胜者平均最终点: 0.00
- Fitness: -78616.0000

### 本轮最佳策略参数
```json
{
  "id": "AI-AK",
  "selfWinChance": 0.8,
  "discardHuChance": 0.8923799278588606,
  "selfWinWildBoost": 0.1266871952479135,
  "discardHuWildPenalty": 0.3484112283088031,
  "discardHuMenQingPenalty": 0.11443176185539769,
  "pengChance": 1,
  "kongChance": 0.5149119649159877,
  "chowChance": 0.35,
  "anKongChance": 0.9898296447948148,
  "pengWildBoost": 0.06282849518815241,
  "kongWildBoost": 0.17074969758870698,
  "chowWildPenalty": 0.22,
  "menqingKeepBonus": 2.8,
  "meldPenalty": 0.025679867261555692,
  "allPungsPursuit": 0.52,
  "pureFlushPursuit": 0.39155902112680335,
  "halfFlushWeight": 0.6,
  "sevenPairsPursuit": 0.15,
  "allHonorsPursuit": 0.14083222760517888,
  "allHonorsPungsPursuit": 0.08389067735611558,
  "qingPengPursuit": 0.49316917551025014,
  "hunPengPursuit": 0.5442411827354836,
  "windEastKeep": 1.7663111765725783,
  "windSouthKeep": 2.575719909145446,
  "windWestKeep": 1.1156865715889224,
  "windNorthKeep": 0.7255064576387434,
  "windGeneralKeep": 1.5,
  "dragonRedKeep": 3.2916529588266354,
  "dragonGreenKeep": 2.8583551204828295,
  "dragonWhiteKeep": 3.139412587580636,
  "dragonGeneralKeep": 1.6708964747800108,
  "pairWeight": 4.461113126078833,
  "nearWeight": 3.8258140895090156,
  "tripletKeepBonus": 4.157096354944348,
  "terminalPenalty": 0.6575230927938015,
  "wildKeepPenalty": 1741.4116998542363,
  "wildBailoutThreshold": 3,
  "wild0Aggression": 0.3360843092809285,
  "wild1Aggression": 0.40102709671115255,
  "wild2Aggression": 0.5978617869144395,
  "wild3PlusAggression": 0.8909279370406946,
  "wild1RouteMeldPush": 0.3320246566940525,
  "wild2RouteMeldPush": 0.6596439869769003,
  "wild3RouteMeldPush": 0.8154039015690847,
  "wild1RouteFlushBoost": 0.3094928789894137,
  "wild2RouteFlushBoost": 0.3,
  "wild3RouteFlushBoost": 0.47751980846352926,
  "wild1RouteHonorsBoost": 0,
  "wild2RouteHonorsBoost": 0.2,
  "wild3RouteHonorsBoost": 0.4,
  "wild1RouteAllPungsBoost": 0.13351151940938097,
  "wild2RouteAllPungsBoost": 0.35,
  "wild3RouteAllPungsBoost": 0.5240810592470927,
  "wildMultLowAggression": 0.5620867346505063,
  "wildMultMidAggression": 0.5292362851551664,
  "wildMultHighAggression": 0.7227574234587231,
  "wild0MenqingKeep": 3.0702741060597987,
  "wild1MenqingKeep": 2.005138539192227,
  "wild2MenqingKeep": 1.0417063383558394,
  "wild1BaoPush": 0.08669062614139302,
  "wild2BaoPush": 0.29290913092768045,
  "wild3BaoPush": 0.8,
  "multLowSpeedBias": 0.5,
  "multHighValueBias": 0.7829166927551453,
  "discardObsFlushBoost": 0.3110395469495198,
  "discardObsWeight": 0.3169784141834593,
  "bao2ClaimPenalty": 0.5863659036046336,
  "bao3AvoidThreshold": 0.7522859279404077,
  "baoSelfClaimCaution": 0.34518241257548415,
  "wallEarlySpeedPush": 0.3131723772394867,
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
  "hand5RouteBias": 0.3123080868982012,
  "hand6RouteBias": 0.6,
  "hand7RouteBias": 0.9,
  "multLowHand5AllPungs": 0.4575758444068891,
  "multLowHand5HalfFlush": 0.43372616503943406,
  "multHighHand5AllPungs": 0.337344946620979,
  "multHighHand5HalfFlush": 0.2850975128971883,
  "multLowHand6AllPungs": 0.25,
  "multLowHand6HalfFlush": 0.286611677554435,
  "multLowHand6PureFlush": 0.25,
  "multHighHand6AllPungs": 0.25,
  "multHighHand6HalfFlush": 0.55,
  "multHighHand6PureFlush": 0.45,
  "multLowHand7AllPungs": 0.2,
  "multLowHand7HalfFlush": 0.4,
  "multLowHand7PureFlush": 0.2793345675720549,
  "multHighHand7AllPungs": 0.016475966765284886,
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
  "honorVsSuitedBalance": -0.06499699959801614,
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

### 最大输赢局明细（本轮）
- 本轮无有效对局数据


### 第10轮 (强度=2.5, 停滞=5)
  C1: fitness=-88454 hu=0% self=0% disc=0% draws=10
  C2: fitness=-88454 hu=0% self=0% disc=0% draws=10
  C3: fitness=-78616 hu=10% self=0% disc=100% draws=9
  C4: fitness=-88454 hu=0% self=0% disc=0% draws=10
  C5: fitness=-88454 hu=0% self=0% disc=0% draws=10
  Best: -78616 (overall: -78454) [plateau: 6]
  指标: hu=10% self=0% disc=100% big=0% mq=100%

## Round 10 (2026-04-07T18:18:19.385Z)

### 📊 训练指标 Summary

| 指标 | 值 | K哥目标 | 达标 |
|------|-----|---------|------|
| 胡牌率 | 10.0% | ≥90% | ❌ |
| 流局率 | 90.0% | <10% | ❌ |
| 自摸率 | 0.0% | 40-60% | ❌ |
| 捉冲率 | 100.0% | 40-60% | ❌ |
| 血战率 | 0.0% | >80% | ❌ |
| 大牌率 | 0.0% | 3-8% | ❌ |
| 门清率 | 100.0% | 7-12% | ❌ |
| Fitness | -78616.0 | ↑ | — |

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
- Games: 10
- 胡牌局: 1 (10.0%)
- 流局: 9 (90.0%)
- 血战到最后一人: 0 (0.00%)
- 平均回合: 0.00
- 平均总筹码: 0.00
- 自摸率(胡牌中): 0.00%
- 大牌率(胡牌中): 0.00%
- 门清胡牌率(胡牌中): 100.00%
- 胜者平均最终点: 0.00
- Fitness: -78616.0000

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
  "kongChance": 0.5,
  "chowChance": 0.35,
  "anKongChance": 0.9898296447948148,
  "pengWildBoost": 0.06282849518815241,
  "kongWildBoost": 0.17074969758870698,
  "chowWildPenalty": 0.22,
  "menqingKeepBonus": 2.8,
  "meldPenalty": 0.025679867261555692,
  "allPungsPursuit": 0.52,
  "pureFlushPursuit": 0.39155902112680335,
  "halfFlushWeight": 0.6,
  "sevenPairsPursuit": 0.15,
  "allHonorsPursuit": 0.14083222760517888,
  "allHonorsPungsPursuit": 0.08389067735611558,
  "qingPengPursuit": 0.49316917551025014,
  "hunPengPursuit": 0.6193309475425757,
  "windEastKeep": 1.7663111765725783,
  "windSouthKeep": 2.575719909145446,
  "windWestKeep": 1.1156865715889224,
  "windNorthKeep": 0.7255064576387434,
  "windGeneralKeep": 1.5,
  "dragonRedKeep": 3.2916529588266354,
  "dragonGreenKeep": 2.8583551204828295,
  "dragonWhiteKeep": 3.139412587580636,
  "dragonGeneralKeep": 1.6708964747800108,
  "pairWeight": 4.461113126078833,
  "nearWeight": 3.8258140895090156,
  "tripletKeepBonus": 4.157096354944348,
  "terminalPenalty": 0.6575230927938015,
  "wildKeepPenalty": 1741.4116998542363,
  "wildBailoutThreshold": 3,
  "wild0Aggression": 0.3360843092809285,
  "wild1Aggression": 0.40102709671115255,
  "wild2Aggression": 0.5978617869144395,
  "wild3PlusAggression": 0.9220505526317807,
  "wild1RouteMeldPush": 0.3320246566940525,
  "wild2RouteMeldPush": 0.6596439869769003,
  "wild3RouteMeldPush": 0.8154039015690847,
  "wild1RouteFlushBoost": 0.3094928789894137,
  "wild2RouteFlushBoost": 0.33595958427212047,
  "wild3RouteFlushBoost": 0.47751980846352926,
  "wild1RouteHonorsBoost": 0,
  "wild2RouteHonorsBoost": 0.2,
  "wild3RouteHonorsBoost": 0.4,
  "wild1RouteAllPungsBoost": 0.13351151940938097,
  "wild2RouteAllPungsBoost": 0.35,
  "wild3RouteAllPungsBoost": 0.4148522800563274,
  "wildMultLowAggression": 0.5620867346505063,
  "wildMultMidAggression": 0.5292362851551664,
  "wildMultHighAggression": 0.7227574234587231,
  "wild0MenqingKeep": 3.0702741060597987,
  "wild1MenqingKeep": 2.005138539192227,
  "wild2MenqingKeep": 1.0417063383558394,
  "wild1BaoPush": 0.08669062614139302,
  "wild2BaoPush": 0.29290913092768045,
  "wild3BaoPush": 0.8,
  "multLowSpeedBias": 0.5,
  "multHighValueBias": 0.7829166927551453,
  "discardObsFlushBoost": 0.3110395469495198,
  "discardObsWeight": 0.3169784141834593,
  "bao2ClaimPenalty": 0.5863659036046336,
  "bao3AvoidThreshold": 0.7145038520760525,
  "baoSelfClaimCaution": 0.34518241257548415,
  "wallEarlySpeedPush": 0.3131723772394867,
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
  "hand5RouteBias": 0.3123080868982012,
  "hand6RouteBias": 0.6,
  "hand7RouteBias": 0.9,
  "multLowHand5AllPungs": 0.4575758444068891,
  "multLowHand5HalfFlush": 0.43372616503943406,
  "multHighHand5AllPungs": 0.337344946620979,
  "multHighHand5HalfFlush": 0.2850975128971883,
  "multLowHand6AllPungs": 0.25,
  "multLowHand6HalfFlush": 0.286611677554435,
  "multLowHand6PureFlush": 0.25,
  "multHighHand6AllPungs": 0.25,
  "multHighHand6HalfFlush": 0.55,
  "multHighHand6PureFlush": 0.45,
  "multLowHand7AllPungs": 0.2,
  "multLowHand7HalfFlush": 0.33075847049992446,
  "multLowHand7PureFlush": 0.2793345675720549,
  "multHighHand7AllPungs": 0.016475966765284886,
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
  "honorVsSuitedBalance": -0.06499699959801614,
  "sequenceVsTripletBias": 0.32181396791014066,
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


### 第11轮 (强度=2.5, 停滞=6)
  C1: fitness=-88454 hu=0% self=0% disc=0% draws=10
  C2: fitness=-88454 hu=0% self=0% disc=0% draws=10
  C3: fitness=-68416 hu=20% self=50% disc=50% draws=8
  C4: fitness=-88454 hu=0% self=0% disc=0% draws=10
  C5: fitness=-88454 hu=0% self=0% disc=0% draws=10
  ★ NEW BEST! fitness=-68416
  指标: hu=20% self=50% disc=50% big=0% mq=100%

## Round 11 (2026-04-07T18:18:33.378Z)

### 📊 训练指标 Summary

| 指标 | 值 | K哥目标 | 达标 |
|------|-----|---------|------|
| 胡牌率 | 20.0% | ≥90% | ❌ |
| 流局率 | 80.0% | <10% | ❌ |
| 自摸率 | 50.0% | 40-60% | ✅ |
| 捉冲率 | 50.0% | 40-60% | ✅ |
| 血战率 | 0.0% | >80% | ❌ |
| 大牌率 | 0.0% | 3-8% | ❌ |
| 门清率 | 100.0% | 7-12% | ❌ |
| Fitness | -68416.0 | ↑ | — |

### 🀄 胡牌牌型分布

| 牌型 | 局数 | 占比 | K哥目标 |
|------|------|------|---------|
| 混一色 | 0 | 0.0% | ≥40% |
| 碰碰胡 | 1 | 50.0% | >25% |
| 清一色 | 0 | 0.0% | >20% |
| 清碰 | 0 | 0.0% | ~5% |
| 风一色 | 0 | 0.0% | ~5% |
| 风碰 | 0 | 0.0% | ~1% |
| 混碰 | 0 | 0.0% | — |
| 八花 | 0 | 0.0% | — |
| 四百搭 | 0 | 0.0% | — |

### 训练明细
- Games: 10
- 胡牌局: 2 (20.0%)
- 流局: 8 (80.0%)
- 血战到最后一人: 0 (0.00%)
- 平均回合: 0.00
- 平均总筹码: 0.00
- 自摸率(胡牌中): 50.00%
- 大牌率(胡牌中): 0.00%
- 门清胡牌率(胡牌中): 100.00%
- 胜者平均最终点: 0.00
- Fitness: -68416.0000

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
  "chowChance": 0.4,
  "anKongChance": 0.9898296447948148,
  "pengWildBoost": 0.06282849518815241,
  "kongWildBoost": 0.17074969758870698,
  "chowWildPenalty": 0.22,
  "menqingKeepBonus": 2.8,
  "meldPenalty": 0.025679867261555692,
  "allPungsPursuit": 0.52,
  "pureFlushPursuit": 0.39155902112680335,
  "halfFlushWeight": 0.6,
  "sevenPairsPursuit": 0.15,
  "allHonorsPursuit": 0.14083222760517888,
  "allHonorsPungsPursuit": 0.08389067735611558,
  "qingPengPursuit": 0.49316917551025014,
  "hunPengPursuit": 0.5442411827354836,
  "windEastKeep": 1.7663111765725783,
  "windSouthKeep": 2.575719909145446,
  "windWestKeep": 1.1156865715889224,
  "windNorthKeep": 0.7255064576387434,
  "windGeneralKeep": 1.5,
  "dragonRedKeep": 3.2916529588266354,
  "dragonGreenKeep": 2.8583551204828295,
  "dragonWhiteKeep": 3.139412587580636,
  "dragonGeneralKeep": 1.6708964747800108,
  "pairWeight": 4.461113126078833,
  "nearWeight": 3.8258140895090156,
  "tripletKeepBonus": 4.157096354944348,
  "terminalPenalty": 0.6575230927938015,
  "wildKeepPenalty": 1741.4116998542363,
  "wildBailoutThreshold": 3,
  "wild0Aggression": 0.3360843092809285,
  "wild1Aggression": 0.40102709671115255,
  "wild2Aggression": 0.5978617869144395,
  "wild3PlusAggression": 0.9220505526317807,
  "wild1RouteMeldPush": 0.3320246566940525,
  "wild2RouteMeldPush": 0.6596439869769003,
  "wild3RouteMeldPush": 0.8154039015690847,
  "wild1RouteFlushBoost": 0.3094928789894137,
  "wild2RouteFlushBoost": 0.3,
  "wild3RouteFlushBoost": 0.47751980846352926,
  "wild1RouteHonorsBoost": 0,
  "wild2RouteHonorsBoost": 0.29972126353490036,
  "wild3RouteHonorsBoost": 0.4,
  "wild1RouteAllPungsBoost": 0.13351151940938097,
  "wild2RouteAllPungsBoost": 0.35,
  "wild3RouteAllPungsBoost": 0.4148522800563274,
  "wildMultLowAggression": 0.5728818119542574,
  "wildMultMidAggression": 0.5292362851551664,
  "wildMultHighAggression": 0.7227574234587231,
  "wild0MenqingKeep": 3.0702741060597987,
  "wild1MenqingKeep": 2.005138539192227,
  "wild2MenqingKeep": 1.0417063383558394,
  "wild1BaoPush": 0.08669062614139302,
  "wild2BaoPush": 0.29290913092768045,
  "wild3BaoPush": 0.8,
  "multLowSpeedBias": 0.5,
  "multHighValueBias": 0.7829166927551453,
  "discardObsFlushBoost": 0.5664893156722501,
  "discardObsWeight": 0.3169784141834593,
  "bao2ClaimPenalty": 0.5863659036046336,
  "bao3AvoidThreshold": 0.7145038520760525,
  "baoSelfClaimCaution": 0.34518241257548415,
  "wallEarlySpeedPush": 0.3131723772394867,
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
  "hand5RouteBias": 0.3123080868982012,
  "hand6RouteBias": 0.6,
  "hand7RouteBias": 0.9,
  "multLowHand5AllPungs": 0.4575758444068891,
  "multLowHand5HalfFlush": 0.43372616503943406,
  "multHighHand5AllPungs": 0.337344946620979,
  "multHighHand5HalfFlush": 0.2850975128971883,
  "multLowHand6AllPungs": 0.25,
  "multLowHand6HalfFlush": 0.286611677554435,
  "multLowHand6PureFlush": 0.25,
  "multHighHand6AllPungs": 0.25,
  "multHighHand6HalfFlush": 0.55,
  "multHighHand6PureFlush": 0.45,
  "multLowHand7AllPungs": 0.2,
  "multLowHand7HalfFlush": 0.4,
  "multLowHand7PureFlush": 0.2793345675720549,
  "multHighHand7AllPungs": 0.016475966765284886,
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
  "honorVsSuitedBalance": -0.06499699959801614,
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

### 最大输赢局明细（本轮）
- 本轮无有效对局数据


### 第12轮 (强度=1.0, 停滞=0)
  C1: fitness=-88454 hu=0% self=0% disc=0% draws=10
  C2: fitness=-88454 hu=0% self=0% disc=0% draws=10
  C3: fitness=-88454 hu=0% self=0% disc=0% draws=10
  C4: fitness=-88454 hu=0% self=0% disc=0% draws=10
  C5: fitness=-78616 hu=10% self=0% disc=100% draws=9
  Best: -78616 (overall: -68416) [plateau: 1]
  指标: hu=10% self=0% disc=100% big=0% mq=100%

## Round 12 (2026-04-07T18:18:46.563Z)

### 📊 训练指标 Summary

| 指标 | 值 | K哥目标 | 达标 |
|------|-----|---------|------|
| 胡牌率 | 10.0% | ≥90% | ❌ |
| 流局率 | 90.0% | <10% | ❌ |
| 自摸率 | 0.0% | 40-60% | ❌ |
| 捉冲率 | 100.0% | 40-60% | ❌ |
| 血战率 | 0.0% | >80% | ❌ |
| 大牌率 | 0.0% | 3-8% | ❌ |
| 门清率 | 100.0% | 7-12% | ❌ |
| Fitness | -78616.0 | ↑ | — |

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
- Games: 10
- 胡牌局: 1 (10.0%)
- 流局: 9 (90.0%)
- 血战到最后一人: 0 (0.00%)
- 平均回合: 0.00
- 平均总筹码: 0.00
- 自摸率(胡牌中): 0.00%
- 大牌率(胡牌中): 0.00%
- 门清胡牌率(胡牌中): 100.00%
- 胜者平均最终点: 0.00
- Fitness: -78616.0000

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
  "chowChance": 0.40317995781102445,
  "anKongChance": 0.9898296447948148,
  "pengWildBoost": 0.06282849518815241,
  "kongWildBoost": 0.17074969758870698,
  "chowWildPenalty": 0.22,
  "menqingKeepBonus": 2.8,
  "meldPenalty": 0.025679867261555692,
  "allPungsPursuit": 0.52,
  "pureFlushPursuit": 0.39155902112680335,
  "halfFlushWeight": 0.6,
  "sevenPairsPursuit": 0.15,
  "allHonorsPursuit": 0.14083222760517888,
  "allHonorsPungsPursuit": 0.08389067735611558,
  "qingPengPursuit": 0.49316917551025014,
  "hunPengPursuit": 0.5442411827354836,
  "windEastKeep": 1.7663111765725783,
  "windSouthKeep": 2.575719909145446,
  "windWestKeep": 1.1156865715889224,
  "windNorthKeep": 0.7255064576387434,
  "windGeneralKeep": 1.5,
  "dragonRedKeep": 3.2916529588266354,
  "dragonGreenKeep": 2.8583551204828295,
  "dragonWhiteKeep": 3.139412587580636,
  "dragonGeneralKeep": 1.6708964747800108,
  "pairWeight": 4.461113126078833,
  "nearWeight": 3.8258140895090156,
  "tripletKeepBonus": 4.157096354944348,
  "terminalPenalty": 0.6970431757346283,
  "wildKeepPenalty": 1741.4116998542363,
  "wildBailoutThreshold": 3,
  "wild0Aggression": 0.3360843092809285,
  "wild1Aggression": 0.40102709671115255,
  "wild2Aggression": 0.5978617869144395,
  "wild3PlusAggression": 0.927866335816678,
  "wild1RouteMeldPush": 0.3320246566940525,
  "wild2RouteMeldPush": 0.6596439869769003,
  "wild3RouteMeldPush": 0.8154039015690847,
  "wild1RouteFlushBoost": 0.3094928789894137,
  "wild2RouteFlushBoost": 0.3,
  "wild3RouteFlushBoost": 0.47751980846352926,
  "wild1RouteHonorsBoost": 0,
  "wild2RouteHonorsBoost": 0.29972126353490036,
  "wild3RouteHonorsBoost": 0.4,
  "wild1RouteAllPungsBoost": 0.13351151940938097,
  "wild2RouteAllPungsBoost": 0.35,
  "wild3RouteAllPungsBoost": 0.4148522800563274,
  "wildMultLowAggression": 0.5728818119542574,
  "wildMultMidAggression": 0.5292362851551664,
  "wildMultHighAggression": 0.7227574234587231,
  "wild0MenqingKeep": 3.0702741060597987,
  "wild1MenqingKeep": 2.005138539192227,
  "wild2MenqingKeep": 1.0417063383558394,
  "wild1BaoPush": 0.08669062614139302,
  "wild2BaoPush": 0.29290913092768045,
  "wild3BaoPush": 0.8,
  "multLowSpeedBias": 0.5,
  "multHighValueBias": 0.7829166927551453,
  "discardObsFlushBoost": 0.5664893156722501,
  "discardObsWeight": 0.3169784141834593,
  "bao2ClaimPenalty": 0.5863659036046336,
  "bao3AvoidThreshold": 0.7145038520760525,
  "baoSelfClaimCaution": 0.34518241257548415,
  "wallEarlySpeedPush": 0.3131723772394867,
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
  "hand5RouteBias": 0.3123080868982012,
  "hand6RouteBias": 0.6,
  "hand7RouteBias": 0.9,
  "multLowHand5AllPungs": 0.4575758444068891,
  "multLowHand5HalfFlush": 0.43372616503943406,
  "multHighHand5AllPungs": 0.337344946620979,
  "multHighHand5HalfFlush": 0.2850975128971883,
  "multLowHand6AllPungs": 0.25,
  "multLowHand6HalfFlush": 0.286611677554435,
  "multLowHand6PureFlush": 0.25,
  "multHighHand6AllPungs": 0.25,
  "multHighHand6HalfFlush": 0.55,
  "multHighHand6PureFlush": 0.45,
  "multLowHand7AllPungs": 0.2,
  "multLowHand7HalfFlush": 0.4,
  "multLowHand7PureFlush": 0.2793345675720549,
  "multHighHand7AllPungs": 0.016475966765284886,
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
  "menqingDoubleAwareness": 0.5352448635970968,
  "flushVsPungsBalance": 0.1,
  "honorVsSuitedBalance": -0.06499699959801614,
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

### 最大输赢局明细（本轮）
- 本轮无有效对局数据


### 第13轮 (强度=1.0, 停滞=1)
  C1: fitness=-88454 hu=0% self=0% disc=0% draws=10
  C2: fitness=-88454 hu=0% self=0% disc=0% draws=10
  C3: fitness=-88454 hu=0% self=0% disc=0% draws=10
  C4: fitness=-88454 hu=0% self=0% disc=0% draws=10
  C5: fitness=-88454 hu=0% self=0% disc=0% draws=10
  Best: -88454 (overall: -68416) [plateau: 2]
  指标: hu=0% self=0% disc=0% big=0% mq=0%

## Round 13 (2026-04-07T18:19:02.613Z)

### 📊 训练指标 Summary

| 指标 | 值 | K哥目标 | 达标 |
|------|-----|---------|------|
| 胡牌率 | 0.0% | ≥90% | ❌ |
| 流局率 | 100.0% | <10% | ❌ |
| 自摸率 | 0.0% | 40-60% | ❌ |
| 捉冲率 | 0.0% | 40-60% | ❌ |
| 血战率 | 0.0% | >80% | ❌ |
| 大牌率 | 0.0% | 3-8% | ❌ |
| 门清率 | 0.0% | 7-12% | ❌ |
| Fitness | -88454.0 | ↑ | — |

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
- Games: 10
- 胡牌局: 0 (0.0%)
- 流局: 10 (100.0%)
- 血战到最后一人: 0 (0.00%)
- 平均回合: 0.00
- 平均总筹码: 0.00
- 自摸率(胡牌中): 0.00%
- 大牌率(胡牌中): 0.00%
- 门清胡牌率(胡牌中): 0.00%
- 胜者平均最终点: 0.00
- Fitness: -88454.0000

### 本轮最佳策略参数
```json
{
  "id": "AI-AK",
  "selfWinChance": 0.8,
  "discardHuChance": 0.8,
  "selfWinWildBoost": 0.1266871952479135,
  "discardHuWildPenalty": 0.33633663846889866,
  "discardHuMenQingPenalty": 0.11443176185539769,
  "pengChance": 1,
  "kongChance": 0.5149119649159877,
  "chowChance": 0.4,
  "anKongChance": 0.9898296447948148,
  "pengWildBoost": 0.06282849518815241,
  "kongWildBoost": 0.17074969758870698,
  "chowWildPenalty": 0.22,
  "menqingKeepBonus": 2.8,
  "meldPenalty": 0.025679867261555692,
  "allPungsPursuit": 0.52,
  "pureFlushPursuit": 0.39155902112680335,
  "halfFlushWeight": 0.6,
  "sevenPairsPursuit": 0.16446788805978257,
  "allHonorsPursuit": 0.14083222760517888,
  "allHonorsPungsPursuit": 0.08389067735611558,
  "qingPengPursuit": 0.49316917551025014,
  "hunPengPursuit": 0.5442411827354836,
  "windEastKeep": 1.7663111765725783,
  "windSouthKeep": 2.575719909145446,
  "windWestKeep": 1.1156865715889224,
  "windNorthKeep": 0.7255064576387434,
  "windGeneralKeep": 1.5,
  "dragonRedKeep": 3.2916529588266354,
  "dragonGreenKeep": 2.8583551204828295,
  "dragonWhiteKeep": 3.139412587580636,
  "dragonGeneralKeep": 1.6708964747800108,
  "pairWeight": 4.461113126078833,
  "nearWeight": 3.8258140895090156,
  "tripletKeepBonus": 4.157096354944348,
  "terminalPenalty": 0.6575230927938015,
  "wildKeepPenalty": 1741.4116998542363,
  "wildBailoutThreshold": 3,
  "wild0Aggression": 0.3360843092809285,
  "wild1Aggression": 0.40102709671115255,
  "wild2Aggression": 0.5978617869144395,
  "wild3PlusAggression": 0.9220505526317807,
  "wild1RouteMeldPush": 0.3320246566940525,
  "wild2RouteMeldPush": 0.6596439869769003,
  "wild3RouteMeldPush": 0.8154039015690847,
  "wild1RouteFlushBoost": 0.3094928789894137,
  "wild2RouteFlushBoost": 0.3,
  "wild3RouteFlushBoost": 0.47751980846352926,
  "wild1RouteHonorsBoost": 0,
  "wild2RouteHonorsBoost": 0.29972126353490036,
  "wild3RouteHonorsBoost": 0.4,
  "wild1RouteAllPungsBoost": 0.13351151940938097,
  "wild2RouteAllPungsBoost": 0.35,
  "wild3RouteAllPungsBoost": 0.4148522800563274,
  "wildMultLowAggression": 0.5728818119542574,
  "wildMultMidAggression": 0.5292362851551664,
  "wildMultHighAggression": 0.7227574234587231,
  "wild0MenqingKeep": 2.7846124139520856,
  "wild1MenqingKeep": 2.005138539192227,
  "wild2MenqingKeep": 1.0417063383558394,
  "wild1BaoPush": 0.08669062614139302,
  "wild2BaoPush": 0.29290913092768045,
  "wild3BaoPush": 0.8,
  "multLowSpeedBias": 0.5,
  "multHighValueBias": 0.7829166927551453,
  "discardObsFlushBoost": 0.5664893156722501,
  "discardObsWeight": 0.3169784141834593,
  "bao2ClaimPenalty": 0.5863659036046336,
  "bao3AvoidThreshold": 0.7145038520760525,
  "baoSelfClaimCaution": 0.34518241257548415,
  "wallEarlySpeedPush": 0.3131723772394867,
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
  "hand5RouteBias": 0.3123080868982012,
  "hand6RouteBias": 0.6,
  "hand7RouteBias": 0.9,
  "multLowHand5AllPungs": 0.4575758444068891,
  "multLowHand5HalfFlush": 0.43372616503943406,
  "multHighHand5AllPungs": 0.337344946620979,
  "multHighHand5HalfFlush": 0.2850975128971883,
  "multLowHand6AllPungs": 0.25,
  "multLowHand6HalfFlush": 0.286611677554435,
  "multLowHand6PureFlush": 0.25,
  "multHighHand6AllPungs": 0.25,
  "multHighHand6HalfFlush": 0.55,
  "multHighHand6PureFlush": 0.45,
  "multLowHand7AllPungs": 0.2,
  "multLowHand7HalfFlush": 0.4,
  "multLowHand7PureFlush": 0.2793345675720549,
  "multHighHand7AllPungs": 0.016475966765284886,
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
  "honorVsSuitedBalance": -0.06499699959801614,
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

### 最大输赢局明细（本轮）
- 本轮无有效对局数据


### 第14轮 (强度=1.8, 停滞=2)
  C1: fitness=-78616 hu=10% self=0% disc=100% draws=9
  C2: fitness=-78616 hu=10% self=0% disc=100% draws=9
  C3: fitness=-88454 hu=0% self=0% disc=0% draws=10
  C4: fitness=-88454 hu=0% self=0% disc=0% draws=10
  C5: fitness=-78616 hu=10% self=0% disc=100% draws=9
  Best: -78616 (overall: -68416) [plateau: 3]
  指标: hu=10% self=0% disc=100% big=0% mq=100%

## Round 14 (2026-04-07T18:19:15.552Z)

### 📊 训练指标 Summary

| 指标 | 值 | K哥目标 | 达标 |
|------|-----|---------|------|
| 胡牌率 | 10.0% | ≥90% | ❌ |
| 流局率 | 90.0% | <10% | ❌ |
| 自摸率 | 0.0% | 40-60% | ❌ |
| 捉冲率 | 100.0% | 40-60% | ❌ |
| 血战率 | 0.0% | >80% | ❌ |
| 大牌率 | 0.0% | 3-8% | ❌ |
| 门清率 | 100.0% | 7-12% | ❌ |
| Fitness | -78616.0 | ↑ | — |

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
- Games: 10
- 胡牌局: 1 (10.0%)
- 流局: 9 (90.0%)
- 血战到最后一人: 0 (0.00%)
- 平均回合: 0.00
- 平均总筹码: 0.00
- 自摸率(胡牌中): 0.00%
- 大牌率(胡牌中): 0.00%
- 门清胡牌率(胡牌中): 100.00%
- 胜者平均最终点: 0.00
- Fitness: -78616.0000

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
  "chowChance": 0.4,
  "anKongChance": 0.9898296447948148,
  "pengWildBoost": 0.06282849518815241,
  "kongWildBoost": 0.17074969758870698,
  "chowWildPenalty": 0.22,
  "menqingKeepBonus": 2.8,
  "meldPenalty": 0.025679867261555692,
  "allPungsPursuit": 0.52,
  "pureFlushPursuit": 0.39155902112680335,
  "halfFlushWeight": 0.6,
  "sevenPairsPursuit": 0.15,
  "allHonorsPursuit": 0.14083222760517888,
  "allHonorsPungsPursuit": 0.08389067735611558,
  "qingPengPursuit": 0.49316917551025014,
  "hunPengPursuit": 0.5442411827354836,
  "windEastKeep": 1.7663111765725783,
  "windSouthKeep": 2.575719909145446,
  "windWestKeep": 1.1156865715889224,
  "windNorthKeep": 0.7255064576387434,
  "windGeneralKeep": 1.5,
  "dragonRedKeep": 3.2916529588266354,
  "dragonGreenKeep": 2.8583551204828295,
  "dragonWhiteKeep": 3.139412587580636,
  "dragonGeneralKeep": 1.6708964747800108,
  "pairWeight": 4.461113126078833,
  "nearWeight": 3.8258140895090156,
  "tripletKeepBonus": 4.157096354944348,
  "terminalPenalty": 0.6575230927938015,
  "wildKeepPenalty": 1741.4116998542363,
  "wildBailoutThreshold": 3,
  "wild0Aggression": 0.3360843092809285,
  "wild1Aggression": 0.40102709671115255,
  "wild2Aggression": 0.5978617869144395,
  "wild3PlusAggression": 0.9220505526317807,
  "wild1RouteMeldPush": 0.3320246566940525,
  "wild2RouteMeldPush": 0.6596439869769003,
  "wild3RouteMeldPush": 0.8154039015690847,
  "wild1RouteFlushBoost": 0.3094928789894137,
  "wild2RouteFlushBoost": 0.3,
  "wild3RouteFlushBoost": 0.47751980846352926,
  "wild1RouteHonorsBoost": 0,
  "wild2RouteHonorsBoost": 0.29972126353490036,
  "wild3RouteHonorsBoost": 0.4,
  "wild1RouteAllPungsBoost": 0.13351151940938097,
  "wild2RouteAllPungsBoost": 0.35,
  "wild3RouteAllPungsBoost": 0.4148522800563274,
  "wildMultLowAggression": 0.5728818119542574,
  "wildMultMidAggression": 0.5292362851551664,
  "wildMultHighAggression": 0.7227574234587231,
  "wild0MenqingKeep": 3.0702741060597987,
  "wild1MenqingKeep": 2.4965918808193788,
  "wild2MenqingKeep": 1.0417063383558394,
  "wild1BaoPush": 0.08669062614139302,
  "wild2BaoPush": 0.29290913092768045,
  "wild3BaoPush": 0.8,
  "multLowSpeedBias": 0.5,
  "multHighValueBias": 0.7829166927551453,
  "discardObsFlushBoost": 0.5664893156722501,
  "discardObsWeight": 0.3169784141834593,
  "bao2ClaimPenalty": 0.5863659036046336,
  "bao3AvoidThreshold": 0.6346195279987785,
  "baoSelfClaimCaution": 0.34518241257548415,
  "wallEarlySpeedPush": 0.3131723772394867,
  "wallMidBalance": 0.4405118254914803,
  "wallLateDefense": 0.8293461896013391,
  "oppTingDetection": 0.5,
  "safeTilePriority": 0.6225983733417838,
  "terminalDiscardTingSignal": 0.2917110471347582,
  "wildDiaoKeepBonus": 2.908297060009122,
  "wildDiaoFlushBoost": 1.0928343303249333,
  "wildDiaoPungBoost": 2.4861437507327993,
  "scoreBehindRiskBoost": 1.002999954656805,
  "scoreLeadDefenseBoost": 1,
  "hand5RouteBias": 0.3123080868982012,
  "hand6RouteBias": 0.6,
  "hand7RouteBias": 0.9,
  "multLowHand5AllPungs": 0.4575758444068891,
  "multLowHand5HalfFlush": 0.43372616503943406,
  "multHighHand5AllPungs": 0.337344946620979,
  "multHighHand5HalfFlush": 0.2850975128971883,
  "multLowHand6AllPungs": 0.25,
  "multLowHand6HalfFlush": 0.286611677554435,
  "multLowHand6PureFlush": 0.25,
  "multHighHand6AllPungs": 0.25,
  "multHighHand6HalfFlush": 0.55,
  "multHighHand6PureFlush": 0.45,
  "multLowHand7AllPungs": 0.2,
  "multLowHand7HalfFlush": 0.4,
  "multLowHand7PureFlush": 0.2793345675720549,
  "multHighHand7AllPungs": 0.016475966765284886,
  "multHighHand7HalfFlush": 0.4,
  "multHighHand7PureFlush": 0.6667608204361419,
  "multHighHonorStart": 0.6353334176611241,
  "speedVsValueBalance": 0.5,
  "defenseRiskAversion": 0.42466527676568333,
  "wallTilesImpact": 0.03666788294093121,
  "baoRiskAversion": 0.6174292204162568,
  "baoThreshold": 4,
  "anKongAggression": 0.9564908137617628,
  "minkanAggression": 0.3782679008281927,
  "kakanAggression": 0.4092564618311265,
  "robKongAwareness": 0.4548909085267129,
  "noWildDoubleAwareness": 0.44641326791251484,
  "menqingDoubleAwareness": 0.5325238795068113,
  "flushVsPungsBalance": 0.1,
  "honorVsSuitedBalance": -0.06499699959801614,
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

### 最大输赢局明细（本轮）
- 本轮无有效对局数据


### 第15轮 (强度=1.8, 停滞=3)
  C1: fitness=-88454 hu=0% self=0% disc=0% draws=10
  C2: fitness=-88454 hu=0% self=0% disc=0% draws=10
  C3: fitness=-68616 hu=20% self=0% disc=100% draws=8
  C4: fitness=-88454 hu=0% self=0% disc=0% draws=10
  C5: fitness=-78616 hu=10% self=0% disc=100% draws=9
  Best: -68616 (overall: -68416) [plateau: 4]
  指标: hu=20% self=0% disc=100% big=0% mq=100%

## Round 15 (2026-04-07T18:19:28.556Z)

### 📊 训练指标 Summary

| 指标 | 值 | K哥目标 | 达标 |
|------|-----|---------|------|
| 胡牌率 | 20.0% | ≥90% | ❌ |
| 流局率 | 80.0% | <10% | ❌ |
| 自摸率 | 0.0% | 40-60% | ❌ |
| 捉冲率 | 100.0% | 40-60% | ❌ |
| 血战率 | 0.0% | >80% | ❌ |
| 大牌率 | 0.0% | 3-8% | ❌ |
| 门清率 | 100.0% | 7-12% | ❌ |
| Fitness | -68616.0 | ↑ | — |

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
- Games: 10
- 胡牌局: 2 (20.0%)
- 流局: 8 (80.0%)
- 血战到最后一人: 0 (0.00%)
- 平均回合: 0.00
- 平均总筹码: 0.00
- 自摸率(胡牌中): 0.00%
- 大牌率(胡牌中): 0.00%
- 门清胡牌率(胡牌中): 100.00%
- 胜者平均最终点: 0.00
- Fitness: -68616.0000

### 本轮最佳策略参数
```json
{
  "id": "AI-AK",
  "selfWinChance": 0.8,
  "discardHuChance": 0.8,
  "selfWinWildBoost": 0.1266871952479135,
  "discardHuWildPenalty": 0.3484112283088031,
  "discardHuMenQingPenalty": 0.1656306851529489,
  "pengChance": 1,
  "kongChance": 0.5149119649159877,
  "chowChance": 0.4,
  "anKongChance": 0.9898296447948148,
  "pengWildBoost": 0.06282849518815241,
  "kongWildBoost": 0.17074969758870698,
  "chowWildPenalty": 0.22,
  "menqingKeepBonus": 2.8,
  "meldPenalty": 0.025679867261555692,
  "allPungsPursuit": 0.52,
  "pureFlushPursuit": 0.39155902112680335,
  "halfFlushWeight": 0.6,
  "sevenPairsPursuit": 0.15,
  "allHonorsPursuit": 0.14083222760517888,
  "allHonorsPungsPursuit": 0.08389067735611558,
  "qingPengPursuit": 0.49316917551025014,
  "hunPengPursuit": 0.5442411827354836,
  "windEastKeep": 1.7663111765725783,
  "windSouthKeep": 2.575719909145446,
  "windWestKeep": 1.1156865715889224,
  "windNorthKeep": 0.7255064576387434,
  "windGeneralKeep": 1.5,
  "dragonRedKeep": 3.2916529588266354,
  "dragonGreenKeep": 2.8583551204828295,
  "dragonWhiteKeep": 3.139412587580636,
  "dragonGeneralKeep": 1.6708964747800108,
  "pairWeight": 4.461113126078833,
  "nearWeight": 3.8258140895090156,
  "tripletKeepBonus": 4.157096354944348,
  "terminalPenalty": 0.6575230927938015,
  "wildKeepPenalty": 1741.4116998542363,
  "wildBailoutThreshold": 3,
  "wild0Aggression": 0.3360843092809285,
  "wild1Aggression": 0.40102709671115255,
  "wild2Aggression": 0.5978617869144395,
  "wild3PlusAggression": 0.9220505526317807,
  "wild1RouteMeldPush": 0.3320246566940525,
  "wild2RouteMeldPush": 0.6596439869769003,
  "wild3RouteMeldPush": 0.8154039015690847,
  "wild1RouteFlushBoost": 0.3094928789894137,
  "wild2RouteFlushBoost": 0.3,
  "wild3RouteFlushBoost": 0.47751980846352926,
  "wild1RouteHonorsBoost": 0,
  "wild2RouteHonorsBoost": 0.29662630819642344,
  "wild3RouteHonorsBoost": 0.4,
  "wild1RouteAllPungsBoost": 0.13351151940938097,
  "wild2RouteAllPungsBoost": 0.35,
  "wild3RouteAllPungsBoost": 0.4148522800563274,
  "wildMultLowAggression": 0.5728818119542574,
  "wildMultMidAggression": 0.5292362851551664,
  "wildMultHighAggression": 0.7227574234587231,
  "wild0MenqingKeep": 3.0702741060597987,
  "wild1MenqingKeep": 1.9759127835603996,
  "wild2MenqingKeep": 1.0417063383558394,
  "wild1BaoPush": 0.08669062614139302,
  "wild2BaoPush": 0.29290913092768045,
  "wild3BaoPush": 0.8,
  "multLowSpeedBias": 0.5,
  "multHighValueBias": 0.7829166927551453,
  "discardObsFlushBoost": 0.5664893156722501,
  "discardObsWeight": 0.3169784141834593,
  "bao2ClaimPenalty": 0.577095515661863,
  "bao3AvoidThreshold": 0.7145038520760525,
  "baoSelfClaimCaution": 0.34518241257548415,
  "wallEarlySpeedPush": 0.184259162446538,
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
  "hand5RouteBias": 0.3123080868982012,
  "hand6RouteBias": 0.6,
  "hand7RouteBias": 0.9,
  "multLowHand5AllPungs": 0.4575758444068891,
  "multLowHand5HalfFlush": 0.43372616503943406,
  "multHighHand5AllPungs": 0.337344946620979,
  "multHighHand5HalfFlush": 0.2850975128971883,
  "multLowHand6AllPungs": 0.25,
  "multLowHand6HalfFlush": 0.286611677554435,
  "multLowHand6PureFlush": 0.25,
  "multHighHand6AllPungs": 0.25,
  "multHighHand6HalfFlush": 0.55,
  "multHighHand6PureFlush": 0.45,
  "multLowHand7AllPungs": 0.2,
  "multLowHand7HalfFlush": 0.4,
  "multLowHand7PureFlush": 0.2793345675720549,
  "multHighHand7AllPungs": 0.016475966765284886,
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
  "honorVsSuitedBalance": -0.06499699959801614,
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

### 最大输赢局明细（本轮）
- 本轮无有效对局数据


### 第16轮 (强度=2.5, 停滞=4)
  C1: fitness=-88454 hu=0% self=0% disc=0% draws=10
  C2: fitness=-88454 hu=0% self=0% disc=0% draws=10
  C3: fitness=-78454 hu=10% self=0% disc=100% draws=9
  C4: fitness=-88454 hu=0% self=0% disc=0% draws=10
  C5: fitness=-88454 hu=0% self=0% disc=0% draws=10
  Best: -78454 (overall: -68416) [plateau: 5]
  指标: hu=10% self=0% disc=100% big=0% mq=0%

## Round 16 (2026-04-07T18:19:41.352Z)

### 📊 训练指标 Summary

| 指标 | 值 | K哥目标 | 达标 |
|------|-----|---------|------|
| 胡牌率 | 10.0% | ≥90% | ❌ |
| 流局率 | 90.0% | <10% | ❌ |
| 自摸率 | 0.0% | 40-60% | ❌ |
| 捉冲率 | 100.0% | 40-60% | ❌ |
| 血战率 | 0.0% | >80% | ❌ |
| 大牌率 | 0.0% | 3-8% | ❌ |
| 门清率 | 0.0% | 7-12% | ❌ |
| Fitness | -78454.0 | ↑ | — |

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
- Games: 10
- 胡牌局: 1 (10.0%)
- 流局: 9 (90.0%)
- 血战到最后一人: 0 (0.00%)
- 平均回合: 0.00
- 平均总筹码: 0.00
- 自摸率(胡牌中): 0.00%
- 大牌率(胡牌中): 0.00%
- 门清胡牌率(胡牌中): 0.00%
- 胜者平均最终点: 0.00
- Fitness: -78454.0000

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
  "chowChance": 0.4,
  "anKongChance": 0.9898296447948148,
  "pengWildBoost": 0.06282849518815241,
  "kongWildBoost": 0.17074969758870698,
  "chowWildPenalty": 0.22,
  "menqingKeepBonus": 2.8,
  "meldPenalty": 0.025679867261555692,
  "allPungsPursuit": 0.52,
  "pureFlushPursuit": 0.39155902112680335,
  "halfFlushWeight": 0.6,
  "sevenPairsPursuit": 0.15,
  "allHonorsPursuit": 0.14083222760517888,
  "allHonorsPungsPursuit": 0.08389067735611558,
  "qingPengPursuit": 0.6604711878485072,
  "hunPengPursuit": 0.5442411827354836,
  "windEastKeep": 1.7663111765725783,
  "windSouthKeep": 2.575719909145446,
  "windWestKeep": 1.1156865715889224,
  "windNorthKeep": 0.7255064576387434,
  "windGeneralKeep": 1.5,
  "dragonRedKeep": 2.306836914330357,
  "dragonGreenKeep": 2.8583551204828295,
  "dragonWhiteKeep": 3.139412587580636,
  "dragonGeneralKeep": 1.6708964747800108,
  "pairWeight": 4.461113126078833,
  "nearWeight": 3.8258140895090156,
  "tripletKeepBonus": 4.157096354944348,
  "terminalPenalty": 0.6575230927938015,
  "wildKeepPenalty": 1741.4116998542363,
  "wildBailoutThreshold": 3,
  "wild0Aggression": 0.3360843092809285,
  "wild1Aggression": 0.40102709671115255,
  "wild2Aggression": 0.5978617869144395,
  "wild3PlusAggression": 0.9220505526317807,
  "wild1RouteMeldPush": 0.3320246566940525,
  "wild2RouteMeldPush": 0.6596439869769003,
  "wild3RouteMeldPush": 0.8154039015690847,
  "wild1RouteFlushBoost": 0.3094928789894137,
  "wild2RouteFlushBoost": 0.3,
  "wild3RouteFlushBoost": 0.47751980846352926,
  "wild1RouteHonorsBoost": 0,
  "wild2RouteHonorsBoost": 0.29972126353490036,
  "wild3RouteHonorsBoost": 0.4,
  "wild1RouteAllPungsBoost": 0.13351151940938097,
  "wild2RouteAllPungsBoost": 0.35,
  "wild3RouteAllPungsBoost": 0.4148522800563274,
  "wildMultLowAggression": 0.5728818119542574,
  "wildMultMidAggression": 0.5292362851551664,
  "wildMultHighAggression": 0.7227574234587231,
  "wild0MenqingKeep": 3.0702741060597987,
  "wild1MenqingKeep": 2.005138539192227,
  "wild2MenqingKeep": 1.0417063383558394,
  "wild1BaoPush": 0.08669062614139302,
  "wild2BaoPush": 0.29290913092768045,
  "wild3BaoPush": 0.8,
  "multLowSpeedBias": 0.5,
  "multHighValueBias": 0.7829166927551453,
  "discardObsFlushBoost": 0.5664893156722501,
  "discardObsWeight": 0.3169784141834593,
  "bao2ClaimPenalty": 0.5863659036046336,
  "bao3AvoidThreshold": 0.7145038520760525,
  "baoSelfClaimCaution": 0.34518241257548415,
  "wallEarlySpeedPush": 0.3131723772394867,
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
  "hand5RouteBias": 0.3123080868982012,
  "hand6RouteBias": 0.6,
  "hand7RouteBias": 0.9,
  "multLowHand5AllPungs": 0.4575758444068891,
  "multLowHand5HalfFlush": 0.43372616503943406,
  "multHighHand5AllPungs": 0.337344946620979,
  "multHighHand5HalfFlush": 0.2850975128971883,
  "multLowHand6AllPungs": 0.25,
  "multLowHand6HalfFlush": 0.286611677554435,
  "multLowHand6PureFlush": 0.25,
  "multHighHand6AllPungs": 0.25,
  "multHighHand6HalfFlush": 0.55,
  "multHighHand6PureFlush": 0.45,
  "multLowHand7AllPungs": 0.2,
  "multLowHand7HalfFlush": 0.4,
  "multLowHand7PureFlush": 0.2793345675720549,
  "multHighHand7AllPungs": 0.016475966765284886,
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
  "menqingDoubleAwareness": 0.7451583193245346,
  "flushVsPungsBalance": 0.1,
  "honorVsSuitedBalance": -0.06499699959801614,
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

### 最大输赢局明细（本轮）
- 本轮无有效对局数据


### 第17轮 (强度=2.5, 停滞=5)
  C1: fitness=-88454 hu=0% self=0% disc=0% draws=10
  C2: fitness=-88454 hu=0% self=0% disc=0% draws=10
  C3: fitness=-88454 hu=0% self=0% disc=0% draws=10
  C4: fitness=-88454 hu=0% self=0% disc=0% draws=10
  C5: fitness=-88454 hu=0% self=0% disc=0% draws=10
  Best: -88454 (overall: -68416) [plateau: 6]
  指标: hu=0% self=0% disc=0% big=0% mq=0%

## Round 17 (2026-04-07T18:19:57.268Z)

### 📊 训练指标 Summary

| 指标 | 值 | K哥目标 | 达标 |
|------|-----|---------|------|
| 胡牌率 | 0.0% | ≥90% | ❌ |
| 流局率 | 100.0% | <10% | ❌ |
| 自摸率 | 0.0% | 40-60% | ❌ |
| 捉冲率 | 0.0% | 40-60% | ❌ |
| 血战率 | 0.0% | >80% | ❌ |
| 大牌率 | 0.0% | 3-8% | ❌ |
| 门清率 | 0.0% | 7-12% | ❌ |
| Fitness | -88454.0 | ↑ | — |

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
- Games: 10
- 胡牌局: 0 (0.0%)
- 流局: 10 (100.0%)
- 血战到最后一人: 0 (0.00%)
- 平均回合: 0.00
- 平均总筹码: 0.00
- 自摸率(胡牌中): 0.00%
- 大牌率(胡牌中): 0.00%
- 门清胡牌率(胡牌中): 0.00%
- 胜者平均最终点: 0.00
- Fitness: -88454.0000

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
  "chowChance": 0.4,
  "anKongChance": 0.9898296447948148,
  "pengWildBoost": 0.06282849518815241,
  "kongWildBoost": 0.17074969758870698,
  "chowWildPenalty": 0.22,
  "menqingKeepBonus": 2.8,
  "meldPenalty": 0.025679867261555692,
  "allPungsPursuit": 0.52,
  "pureFlushPursuit": 0.39155902112680335,
  "halfFlushWeight": 0.6,
  "sevenPairsPursuit": 0.15,
  "allHonorsPursuit": 0.14083222760517888,
  "allHonorsPungsPursuit": 0.06317832982297825,
  "qingPengPursuit": 0.49316917551025014,
  "hunPengPursuit": 0.5442411827354836,
  "windEastKeep": 1.7663111765725783,
  "windSouthKeep": 2.575719909145446,
  "windWestKeep": 1.1156865715889224,
  "windNorthKeep": 0.7255064576387434,
  "windGeneralKeep": 1.5,
  "dragonRedKeep": 3.2916529588266354,
  "dragonGreenKeep": 2.8583551204828295,
  "dragonWhiteKeep": 3.139412587580636,
  "dragonGeneralKeep": 1.6708964747800108,
  "pairWeight": 4.461113126078833,
  "nearWeight": 3.8258140895090156,
  "tripletKeepBonus": 4.157096354944348,
  "terminalPenalty": 0.6575230927938015,
  "wildKeepPenalty": 1741.4116998542363,
  "wildBailoutThreshold": 3,
  "wild0Aggression": 0.3360843092809285,
  "wild1Aggression": 0.40102709671115255,
  "wild2Aggression": 0.5978617869144395,
  "wild3PlusAggression": 0.9220505526317807,
  "wild1RouteMeldPush": 0.24301479790482491,
  "wild2RouteMeldPush": 0.6596439869769003,
  "wild3RouteMeldPush": 0.8154039015690847,
  "wild1RouteFlushBoost": 0.3094928789894137,
  "wild2RouteFlushBoost": 0.3,
  "wild3RouteFlushBoost": 0.47751980846352926,
  "wild1RouteHonorsBoost": 0,
  "wild2RouteHonorsBoost": 0.29972126353490036,
  "wild3RouteHonorsBoost": 0.4,
  "wild1RouteAllPungsBoost": 0.13351151940938097,
  "wild2RouteAllPungsBoost": 0.35,
  "wild3RouteAllPungsBoost": 0.4148522800563274,
  "wildMultLowAggression": 0.5728818119542574,
  "wildMultMidAggression": 0.5292362851551664,
  "wildMultHighAggression": 0.7227574234587231,
  "wild0MenqingKeep": 3.0702741060597987,
  "wild1MenqingKeep": 2.005138539192227,
  "wild2MenqingKeep": 1.8219619841800885,
  "wild1BaoPush": 0.08669062614139302,
  "wild2BaoPush": 0.29290913092768045,
  "wild3BaoPush": 0.8,
  "multLowSpeedBias": 0.5,
  "multHighValueBias": 0.7829166927551453,
  "discardObsFlushBoost": 0.5664893156722501,
  "discardObsWeight": 0.3169784141834593,
  "bao2ClaimPenalty": 0.5863659036046336,
  "bao3AvoidThreshold": 0.7145038520760525,
  "baoSelfClaimCaution": 0.34518241257548415,
  "wallEarlySpeedPush": 0.3131723772394867,
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
  "hand5RouteBias": 0.3123080868982012,
  "hand6RouteBias": 0.49741029902711353,
  "hand7RouteBias": 0.9,
  "multLowHand5AllPungs": 0.4575758444068891,
  "multLowHand5HalfFlush": 0.43372616503943406,
  "multHighHand5AllPungs": 0.337344946620979,
  "multHighHand5HalfFlush": 0.2850975128971883,
  "multLowHand6AllPungs": 0.25,
  "multLowHand6HalfFlush": 0.286611677554435,
  "multLowHand6PureFlush": 0.25,
  "multHighHand6AllPungs": 0.25,
  "multHighHand6HalfFlush": 0.55,
  "multHighHand6PureFlush": 0.45,
  "multLowHand7AllPungs": 0.2,
  "multLowHand7HalfFlush": 0.4,
  "multLowHand7PureFlush": 0.2793345675720549,
  "multHighHand7AllPungs": 0.016475966765284886,
  "multHighHand7HalfFlush": 0.4,
  "multHighHand7PureFlush": 0.6667608204361419,
  "multHighHonorStart": 0.6353334176611241,
  "speedVsValueBalance": 0.5,
  "defenseRiskAversion": 0.42466527676568333,
  "wallTilesImpact": 0.2,
  "baoRiskAversion": 0.6174292204162568,
  "baoThreshold": 4,
  "anKongAggression": 0.7315452938959615,
  "minkanAggression": 0.3782679008281927,
  "kakanAggression": 0.4092564618311265,
  "robKongAwareness": 0.4548909085267129,
  "noWildDoubleAwareness": 0.44641326791251484,
  "menqingDoubleAwareness": 0.5325238795068113,
  "flushVsPungsBalance": -0.06628392871117669,
  "honorVsSuitedBalance": -0.06499699959801614,
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

### 最大输赢局明细（本轮）
- 本轮无有效对局数据


### 第18轮 (强度=2.5, 停滞=6)
  C1: fitness=-78616 hu=10% self=0% disc=100% draws=9
  C2: fitness=-88454 hu=0% self=0% disc=0% draws=10
  C3: fitness=-88454 hu=0% self=0% disc=0% draws=10
  C4: fitness=-88454 hu=0% self=0% disc=0% draws=10
  C5: fitness=-88454 hu=0% self=0% disc=0% draws=10
  Best: -78616 (overall: -68416) [plateau: 7]
  指标: hu=10% self=0% disc=100% big=0% mq=100%

## Round 18 (2026-04-07T18:20:10.266Z)

### 📊 训练指标 Summary

| 指标 | 值 | K哥目标 | 达标 |
|------|-----|---------|------|
| 胡牌率 | 10.0% | ≥90% | ❌ |
| 流局率 | 90.0% | <10% | ❌ |
| 自摸率 | 0.0% | 40-60% | ❌ |
| 捉冲率 | 100.0% | 40-60% | ❌ |
| 血战率 | 0.0% | >80% | ❌ |
| 大牌率 | 0.0% | 3-8% | ❌ |
| 门清率 | 100.0% | 7-12% | ❌ |
| Fitness | -78616.0 | ↑ | — |

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
- Games: 10
- 胡牌局: 1 (10.0%)
- 流局: 9 (90.0%)
- 血战到最后一人: 0 (0.00%)
- 平均回合: 0.00
- 平均总筹码: 0.00
- 自摸率(胡牌中): 0.00%
- 大牌率(胡牌中): 0.00%
- 门清胡牌率(胡牌中): 100.00%
- 胜者平均最终点: 0.00
- Fitness: -78616.0000

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
  "chowChance": 0.4,
  "anKongChance": 0.9898296447948148,
  "pengWildBoost": 0.06282849518815241,
  "kongWildBoost": 0.17074969758870698,
  "chowWildPenalty": 0.22,
  "menqingKeepBonus": 2.8,
  "meldPenalty": 0.025679867261555692,
  "allPungsPursuit": 0.52,
  "pureFlushPursuit": 0.39155902112680335,
  "halfFlushWeight": 0.6,
  "sevenPairsPursuit": 0.15,
  "allHonorsPursuit": 0.14083222760517888,
  "allHonorsPungsPursuit": 0.08389067735611558,
  "qingPengPursuit": 0.49316917551025014,
  "hunPengPursuit": 0.5442411827354836,
  "windEastKeep": 1.7663111765725783,
  "windSouthKeep": 2.575719909145446,
  "windWestKeep": 1.1156865715889224,
  "windNorthKeep": 0.7255064576387434,
  "windGeneralKeep": 1.5,
  "dragonRedKeep": 3.2916529588266354,
  "dragonGreenKeep": 2.8758223528597764,
  "dragonWhiteKeep": 2.238735031362433,
  "dragonGeneralKeep": 1.6708964747800108,
  "pairWeight": 4.461113126078833,
  "nearWeight": 3.8258140895090156,
  "tripletKeepBonus": 4.157096354944348,
  "terminalPenalty": 0.6575230927938015,
  "wildKeepPenalty": 1741.4116998542363,
  "wildBailoutThreshold": 3,
  "wild0Aggression": 0.3360843092809285,
  "wild1Aggression": 0.40102709671115255,
  "wild2Aggression": 0.5978617869144395,
  "wild3PlusAggression": 0.9220505526317807,
  "wild1RouteMeldPush": 0.3320246566940525,
  "wild2RouteMeldPush": 0.6596439869769003,
  "wild3RouteMeldPush": 0.8154039015690847,
  "wild1RouteFlushBoost": 0.3094928789894137,
  "wild2RouteFlushBoost": 0.1517206378121886,
  "wild3RouteFlushBoost": 0.47751980846352926,
  "wild1RouteHonorsBoost": 0,
  "wild2RouteHonorsBoost": 0.29972126353490036,
  "wild3RouteHonorsBoost": 0.4,
  "wild1RouteAllPungsBoost": 0.13351151940938097,
  "wild2RouteAllPungsBoost": 0.35,
  "wild3RouteAllPungsBoost": 0.4148522800563274,
  "wildMultLowAggression": 0.5728818119542574,
  "wildMultMidAggression": 0.5292362851551664,
  "wildMultHighAggression": 0.7227574234587231,
  "wild0MenqingKeep": 3.0702741060597987,
  "wild1MenqingKeep": 2.005138539192227,
  "wild2MenqingKeep": 1.0417063383558394,
  "wild1BaoPush": 0.08669062614139302,
  "wild2BaoPush": 0.29290913092768045,
  "wild3BaoPush": 0.8,
  "multLowSpeedBias": 0.5,
  "multHighValueBias": 0.7829166927551453,
  "discardObsFlushBoost": 0.5664893156722501,
  "discardObsWeight": 0.3169784141834593,
  "bao2ClaimPenalty": 0.5863659036046336,
  "bao3AvoidThreshold": 0.7145038520760525,
  "baoSelfClaimCaution": 0.34518241257548415,
  "wallEarlySpeedPush": 0.3131723772394867,
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
  "hand5RouteBias": 0.3123080868982012,
  "hand6RouteBias": 0.6,
  "hand7RouteBias": 0.9,
  "multLowHand5AllPungs": 0.4575758444068891,
  "multLowHand5HalfFlush": 0.571385297922595,
  "multHighHand5AllPungs": 0.337344946620979,
  "multHighHand5HalfFlush": 0.2850975128971883,
  "multLowHand6AllPungs": 0.25,
  "multLowHand6HalfFlush": 0.286611677554435,
  "multLowHand6PureFlush": 0.25,
  "multHighHand6AllPungs": 0.25,
  "multHighHand6HalfFlush": 0.55,
  "multHighHand6PureFlush": 0.397143079781234,
  "multLowHand7AllPungs": 0.05730737077754827,
  "multLowHand7HalfFlush": 0.4,
  "multLowHand7PureFlush": 0.2793345675720549,
  "multHighHand7AllPungs": 0.016475966765284886,
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
  "honorVsSuitedBalance": -0.06499699959801614,
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

### 最大输赢局明细（本轮）
- 本轮无有效对局数据


### 第19轮 (强度=2.5, 停滞=7)
  C1: fitness=-88454 hu=0% self=0% disc=0% draws=10
  C2: fitness=-88454 hu=0% self=0% disc=0% draws=10
  C3: fitness=-88454 hu=0% self=0% disc=0% draws=10
  C4: fitness=-88454 hu=0% self=0% disc=0% draws=10
  C5: fitness=-78454 hu=10% self=0% disc=100% draws=9
  Best: -78454 (overall: -68416) [plateau: 8]
  指标: hu=10% self=0% disc=100% big=0% mq=0%

## Round 19 (2026-04-07T18:20:23.181Z)

### 📊 训练指标 Summary

| 指标 | 值 | K哥目标 | 达标 |
|------|-----|---------|------|
| 胡牌率 | 10.0% | ≥90% | ❌ |
| 流局率 | 90.0% | <10% | ❌ |
| 自摸率 | 0.0% | 40-60% | ❌ |
| 捉冲率 | 100.0% | 40-60% | ❌ |
| 血战率 | 0.0% | >80% | ❌ |
| 大牌率 | 0.0% | 3-8% | ❌ |
| 门清率 | 0.0% | 7-12% | ❌ |
| Fitness | -78454.0 | ↑ | — |

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
- Games: 10
- 胡牌局: 1 (10.0%)
- 流局: 9 (90.0%)
- 血战到最后一人: 0 (0.00%)
- 平均回合: 0.00
- 平均总筹码: 0.00
- 自摸率(胡牌中): 0.00%
- 大牌率(胡牌中): 0.00%
- 门清胡牌率(胡牌中): 0.00%
- 胜者平均最终点: 0.00
- Fitness: -78454.0000

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
  "chowChance": 0.4,
  "anKongChance": 0.9898296447948148,
  "pengWildBoost": 0.06282849518815241,
  "kongWildBoost": 0.17074969758870698,
  "chowWildPenalty": 0.22,
  "menqingKeepBonus": 2.8,
  "meldPenalty": 0.025679867261555692,
  "allPungsPursuit": 0.52,
  "pureFlushPursuit": 0.47592116260481665,
  "halfFlushWeight": 0.6,
  "sevenPairsPursuit": 0.15,
  "allHonorsPursuit": 0.14083222760517888,
  "allHonorsPungsPursuit": 0.08389067735611558,
  "qingPengPursuit": 0.49316917551025014,
  "hunPengPursuit": 0.5442411827354836,
  "windEastKeep": 1.7663111765725783,
  "windSouthKeep": 2.575719909145446,
  "windWestKeep": 1.1156865715889224,
  "windNorthKeep": 0.7255064576387434,
  "windGeneralKeep": 1.3302147484312492,
  "dragonRedKeep": 3.2916529588266354,
  "dragonGreenKeep": 2.8583551204828295,
  "dragonWhiteKeep": 3.139412587580636,
  "dragonGeneralKeep": 1.6708964747800108,
  "pairWeight": 4.461113126078833,
  "nearWeight": 3.8258140895090156,
  "tripletKeepBonus": 4.157096354944348,
  "terminalPenalty": 0.6575230927938015,
  "wildKeepPenalty": 1741.4116998542363,
  "wildBailoutThreshold": 3,
  "wild0Aggression": 0.3360843092809285,
  "wild1Aggression": 0.40102709671115255,
  "wild2Aggression": 0.5978617869144395,
  "wild3PlusAggression": 0.9220505526317807,
  "wild1RouteMeldPush": 0.3320246566940525,
  "wild2RouteMeldPush": 0.6596439869769003,
  "wild3RouteMeldPush": 0.8154039015690847,
  "wild1RouteFlushBoost": 0.3094928789894137,
  "wild2RouteFlushBoost": 0.3,
  "wild3RouteFlushBoost": 0.47751980846352926,
  "wild1RouteHonorsBoost": 0,
  "wild2RouteHonorsBoost": 0.29972126353490036,
  "wild3RouteHonorsBoost": 0.4,
  "wild1RouteAllPungsBoost": 0.13351151940938097,
  "wild2RouteAllPungsBoost": 0.35,
  "wild3RouteAllPungsBoost": 0.4148522800563274,
  "wildMultLowAggression": 0.5728818119542574,
  "wildMultMidAggression": 0.5292362851551664,
  "wildMultHighAggression": 0.7227574234587231,
  "wild0MenqingKeep": 3.0702741060597987,
  "wild1MenqingKeep": 2.005138539192227,
  "wild2MenqingKeep": 1.0417063383558394,
  "wild1BaoPush": 0.08669062614139302,
  "wild2BaoPush": 0.29290913092768045,
  "wild3BaoPush": 0.8,
  "multLowSpeedBias": 0.5,
  "multHighValueBias": 0.7829166927551453,
  "discardObsFlushBoost": 0.5664893156722501,
  "discardObsWeight": 0.3169784141834593,
  "bao2ClaimPenalty": 0.5863659036046336,
  "bao3AvoidThreshold": 0.7145038520760525,
  "baoSelfClaimCaution": 0.34518241257548415,
  "wallEarlySpeedPush": 0.28553690274895965,
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
  "hand5RouteBias": 0.3123080868982012,
  "hand6RouteBias": 0.6,
  "hand7RouteBias": 0.9,
  "multLowHand5AllPungs": 0.4575758444068891,
  "multLowHand5HalfFlush": 0.43372616503943406,
  "multHighHand5AllPungs": 0.337344946620979,
  "multHighHand5HalfFlush": 0.2850975128971883,
  "multLowHand6AllPungs": 0.25,
  "multLowHand6HalfFlush": 0.286611677554435,
  "multLowHand6PureFlush": 0.25,
  "multHighHand6AllPungs": 0.25,
  "multHighHand6HalfFlush": 0.55,
  "multHighHand6PureFlush": 0.45,
  "multLowHand7AllPungs": 0.2,
  "multLowHand7HalfFlush": 0.4,
  "multLowHand7PureFlush": 0.2793345675720549,
  "multHighHand7AllPungs": 0.016475966765284886,
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
  "honorVsSuitedBalance": -0.06499699959801614,
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

### 最大输赢局明细（本轮）
- 本轮无有效对局数据


### 第20轮 (强度=2.5, 停滞=8)
  C1: fitness=-78616 hu=10% self=100% disc=0% draws=9
  C2: fitness=-88454 hu=0% self=0% disc=0% draws=10
  C3: fitness=-88454 hu=0% self=0% disc=0% draws=10
  C4: fitness=-78616 hu=10% self=0% disc=100% draws=9
  C5: fitness=-78454 hu=10% self=0% disc=100% draws=9
  Best: -78454 (overall: -68416) [plateau: 9]
  指标: hu=10% self=0% disc=100% big=0% mq=0%

## Round 20 (2026-04-07T18:20:37.053Z)

### 📊 训练指标 Summary

| 指标 | 值 | K哥目标 | 达标 |
|------|-----|---------|------|
| 胡牌率 | 10.0% | ≥90% | ❌ |
| 流局率 | 90.0% | <10% | ❌ |
| 自摸率 | 0.0% | 40-60% | ❌ |
| 捉冲率 | 100.0% | 40-60% | ❌ |
| 血战率 | 0.0% | >80% | ❌ |
| 大牌率 | 0.0% | 3-8% | ❌ |
| 门清率 | 0.0% | 7-12% | ❌ |
| Fitness | -78454.0 | ↑ | — |

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
- Games: 10
- 胡牌局: 1 (10.0%)
- 流局: 9 (90.0%)
- 血战到最后一人: 0 (0.00%)
- 平均回合: 0.00
- 平均总筹码: 0.00
- 自摸率(胡牌中): 0.00%
- 大牌率(胡牌中): 0.00%
- 门清胡牌率(胡牌中): 0.00%
- 胜者平均最终点: 0.00
- Fitness: -78454.0000

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
  "chowChance": 0.4,
  "anKongChance": 0.9898296447948148,
  "pengWildBoost": 0.06282849518815241,
  "kongWildBoost": 0.17074969758870698,
  "chowWildPenalty": 0.22,
  "menqingKeepBonus": 2.8,
  "meldPenalty": 0.025679867261555692,
  "allPungsPursuit": 0.52,
  "pureFlushPursuit": 0.39155902112680335,
  "halfFlushWeight": 0.6,
  "sevenPairsPursuit": 0.15,
  "allHonorsPursuit": 0.14083222760517888,
  "allHonorsPungsPursuit": 0.08389067735611558,
  "qingPengPursuit": 0.49316917551025014,
  "hunPengPursuit": 0.5442411827354836,
  "windEastKeep": 1.7663111765725783,
  "windSouthKeep": 2.575719909145446,
  "windWestKeep": 1.1156865715889224,
  "windNorthKeep": 0.7255064576387434,
  "windGeneralKeep": 1.5,
  "dragonRedKeep": 3.2916529588266354,
  "dragonGreenKeep": 2.8583551204828295,
  "dragonWhiteKeep": 3.139412587580636,
  "dragonGeneralKeep": 1.6708964747800108,
  "pairWeight": 4.461113126078833,
  "nearWeight": 3.8258140895090156,
  "tripletKeepBonus": 4.157096354944348,
  "terminalPenalty": 0.6575230927938015,
  "wildKeepPenalty": 1741.4116998542363,
  "wildBailoutThreshold": 3,
  "wild0Aggression": 0.3360843092809285,
  "wild1Aggression": 0.40102709671115255,
  "wild2Aggression": 0.5978617869144395,
  "wild3PlusAggression": 0.9220505526317807,
  "wild1RouteMeldPush": 0.3320246566940525,
  "wild2RouteMeldPush": 0.6596439869769003,
  "wild3RouteMeldPush": 0.8154039015690847,
  "wild1RouteFlushBoost": 0.3094928789894137,
  "wild2RouteFlushBoost": 0.3,
  "wild3RouteFlushBoost": 0.47751980846352926,
  "wild1RouteHonorsBoost": 0,
  "wild2RouteHonorsBoost": 0.29972126353490036,
  "wild3RouteHonorsBoost": 0.4,
  "wild1RouteAllPungsBoost": 0.13351151940938097,
  "wild2RouteAllPungsBoost": 0.35,
  "wild3RouteAllPungsBoost": 0.4148522800563274,
  "wildMultLowAggression": 0.5386814826959121,
  "wildMultMidAggression": 0.5292362851551664,
  "wildMultHighAggression": 0.7227574234587231,
  "wild0MenqingKeep": 3.0702741060597987,
  "wild1MenqingKeep": 2.005138539192227,
  "wild2MenqingKeep": 1.0417063383558394,
  "wild1BaoPush": 0.08669062614139302,
  "wild2BaoPush": 0.29290913092768045,
  "wild3BaoPush": 0.8,
  "multLowSpeedBias": 0.5,
  "multHighValueBias": 0.7829166927551453,
  "discardObsFlushBoost": 0.5664893156722501,
  "discardObsWeight": 0.3169784141834593,
  "bao2ClaimPenalty": 0.5863659036046336,
  "bao3AvoidThreshold": 0.7145038520760525,
  "baoSelfClaimCaution": 0.301544605953621,
  "wallEarlySpeedPush": 0.3131723772394867,
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
  "hand5RouteBias": 0.3123080868982012,
  "hand6RouteBias": 0.6,
  "hand7RouteBias": 0.9,
  "multLowHand5AllPungs": 0.4575758444068891,
  "multLowHand5HalfFlush": 0.43372616503943406,
  "multHighHand5AllPungs": 0.337344946620979,
  "multHighHand5HalfFlush": 0.2850975128971883,
  "multLowHand6AllPungs": 0.25,
  "multLowHand6HalfFlush": 0.286611677554435,
  "multLowHand6PureFlush": 0.25,
  "multHighHand6AllPungs": 0.25,
  "multHighHand6HalfFlush": 0.55,
  "multHighHand6PureFlush": 0.45,
  "multLowHand7AllPungs": 0.2,
  "multLowHand7HalfFlush": 0.4,
  "multLowHand7PureFlush": 0.2793345675720549,
  "multHighHand7AllPungs": 0.016475966765284886,
  "multHighHand7HalfFlush": 0.4,
  "multHighHand7PureFlush": 0.6667608204361419,
  "multHighHonorStart": 0.6353334176611241,
  "speedVsValueBalance": 0.5,
  "defenseRiskAversion": 0.42466527676568333,
  "wallTilesImpact": 0.2,
  "baoRiskAversion": 0.6174292204162568,
  "baoThreshold": 4,
  "anKongAggression": 0.9564908137617628,
  "minkanAggression": 0.43028546084155855,
  "kakanAggression": 0.4092564618311265,
  "robKongAwareness": 0.4548909085267129,
  "noWildDoubleAwareness": 0.44641326791251484,
  "menqingDoubleAwareness": 0.5325238795068113,
  "flushVsPungsBalance": 0.1,
  "honorVsSuitedBalance": -0.06499699959801614,
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

### 最大输赢局明细（本轮）
- 本轮无有效对局数据


### 第21轮 (强度=2.5, 停滞=9)
  C1: fitness=-78454 hu=10% self=0% disc=100% draws=9
  C2: fitness=-78616 hu=10% self=0% disc=100% draws=9
  C3: fitness=-78616 hu=10% self=0% disc=100% draws=9
  C4: fitness=-88454 hu=0% self=0% disc=0% draws=10
  C5: fitness=-88454 hu=0% self=0% disc=0% draws=10
  Best: -78454 (overall: -68416) [plateau: 10]
  指标: hu=10% self=0% disc=100% big=0% mq=0%

## Round 21 (2026-04-07T18:20:49.762Z)

### 📊 训练指标 Summary

| 指标 | 值 | K哥目标 | 达标 |
|------|-----|---------|------|
| 胡牌率 | 10.0% | ≥90% | ❌ |
| 流局率 | 90.0% | <10% | ❌ |
| 自摸率 | 0.0% | 40-60% | ❌ |
| 捉冲率 | 100.0% | 40-60% | ❌ |
| 血战率 | 0.0% | >80% | ❌ |
| 大牌率 | 0.0% | 3-8% | ❌ |
| 门清率 | 0.0% | 7-12% | ❌ |
| Fitness | -78454.0 | ↑ | — |

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
- Games: 10
- 胡牌局: 1 (10.0%)
- 流局: 9 (90.0%)
- 血战到最后一人: 0 (0.00%)
- 平均回合: 0.00
- 平均总筹码: 0.00
- 自摸率(胡牌中): 0.00%
- 大牌率(胡牌中): 0.00%
- 门清胡牌率(胡牌中): 0.00%
- 胜者平均最终点: 0.00
- Fitness: -78454.0000

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
  "chowChance": 0.4,
  "anKongChance": 0.9898296447948148,
  "pengWildBoost": 0.06282849518815241,
  "kongWildBoost": 0.17074969758870698,
  "chowWildPenalty": 0.22,
  "menqingKeepBonus": 2.8,
  "meldPenalty": 0.025679867261555692,
  "allPungsPursuit": 0.52,
  "pureFlushPursuit": 0.39155902112680335,
  "halfFlushWeight": 0.6,
  "sevenPairsPursuit": 0.15,
  "allHonorsPursuit": 0.14083222760517888,
  "allHonorsPungsPursuit": 0.08389067735611558,
  "qingPengPursuit": 0.49316917551025014,
  "hunPengPursuit": 0.5442411827354836,
  "windEastKeep": 1.7663111765725783,
  "windSouthKeep": 2.575719909145446,
  "windWestKeep": 1.1156865715889224,
  "windNorthKeep": 0.7255064576387434,
  "windGeneralKeep": 1.5,
  "dragonRedKeep": 3.2916529588266354,
  "dragonGreenKeep": 2.8583551204828295,
  "dragonWhiteKeep": 3.139412587580636,
  "dragonGeneralKeep": 1.6708964747800108,
  "pairWeight": 4.461113126078833,
  "nearWeight": 3.8258140895090156,
  "tripletKeepBonus": 4.157096354944348,
  "terminalPenalty": 0.6575230927938015,
  "wildKeepPenalty": 1741.4116998542363,
  "wildBailoutThreshold": 3,
  "wild0Aggression": 0.3360843092809285,
  "wild1Aggression": 0.40102709671115255,
  "wild2Aggression": 0.5978617869144395,
  "wild3PlusAggression": 0.9220505526317807,
  "wild1RouteMeldPush": 0.3320246566940525,
  "wild2RouteMeldPush": 0.6596439869769003,
  "wild3RouteMeldPush": 0.8154039015690847,
  "wild1RouteFlushBoost": 0.3094928789894137,
  "wild2RouteFlushBoost": 0.3,
  "wild3RouteFlushBoost": 0.47751980846352926,
  "wild1RouteHonorsBoost": 0,
  "wild2RouteHonorsBoost": 0.29972126353490036,
  "wild3RouteHonorsBoost": 0.4,
  "wild1RouteAllPungsBoost": 0.13351151940938097,
  "wild2RouteAllPungsBoost": 0.35,
  "wild3RouteAllPungsBoost": 0.4148522800563274,
  "wildMultLowAggression": 0.5728818119542574,
  "wildMultMidAggression": 0.5292362851551664,
  "wildMultHighAggression": 0.7227574234587231,
  "wild0MenqingKeep": 3.0702741060597987,
  "wild1MenqingKeep": 2.005138539192227,
  "wild2MenqingKeep": 1.570341124794103,
  "wild1BaoPush": 0.08669062614139302,
  "wild2BaoPush": 0.29290913092768045,
  "wild3BaoPush": 0.8,
  "multLowSpeedBias": 0.5,
  "multHighValueBias": 0.7829166927551453,
  "discardObsFlushBoost": 0.5664893156722501,
  "discardObsWeight": 0.3169784141834593,
  "bao2ClaimPenalty": 0.5863659036046336,
  "bao3AvoidThreshold": 0.7145038520760525,
  "baoSelfClaimCaution": 0.34518241257548415,
  "wallEarlySpeedPush": 0.3131723772394867,
  "wallMidBalance": 0.4405118254914803,
  "wallLateDefense": 0.8293461896013391,
  "oppTingDetection": 0.5,
  "safeTilePriority": 0.6225983733417838,
  "terminalDiscardTingSignal": 0.2917110471347582,
  "wildDiaoKeepBonus": 1.5074598002604451,
  "wildDiaoFlushBoost": 1.0928343303249333,
  "wildDiaoPungBoost": 2.4861437507327993,
  "scoreBehindRiskBoost": 1.0064560779164102,
  "scoreLeadDefenseBoost": 1,
  "hand5RouteBias": 0.3123080868982012,
  "hand6RouteBias": 0.6,
  "hand7RouteBias": 0.9107374035863077,
  "multLowHand5AllPungs": 0.4575758444068891,
  "multLowHand5HalfFlush": 0.43372616503943406,
  "multHighHand5AllPungs": 0.337344946620979,
  "multHighHand5HalfFlush": 0.2850975128971883,
  "multLowHand6AllPungs": 0.25,
  "multLowHand6HalfFlush": 0.286611677554435,
  "multLowHand6PureFlush": 0.25,
  "multHighHand6AllPungs": 0.25,
  "multHighHand6HalfFlush": 0.55,
  "multHighHand6PureFlush": 0.45,
  "multLowHand7AllPungs": 0.2,
  "multLowHand7HalfFlush": 0.4,
  "multLowHand7PureFlush": 0.2793345675720549,
  "multHighHand7AllPungs": 0.016475966765284886,
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
  "honorVsSuitedBalance": -0.06499699959801614,
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

### 最大输赢局明细（本轮）
- 本轮无有效对局数据


### 第22轮 (强度=2.5, 停滞=10)
  C1: fitness=-88454 hu=0% self=0% disc=0% draws=10
  C2: fitness=-88454 hu=0% self=0% disc=0% draws=10
  C3: fitness=-78454 hu=10% self=0% disc=100% draws=9
  C4: fitness=-88454 hu=0% self=0% disc=0% draws=10
  C5: fitness=-88454 hu=0% self=0% disc=0% draws=10
  Best: -78454 (overall: -68416) [plateau: 11]
  指标: hu=10% self=0% disc=100% big=0% mq=0%

## Round 22 (2026-04-07T18:21:02.734Z)

### 📊 训练指标 Summary

| 指标 | 值 | K哥目标 | 达标 |
|------|-----|---------|------|
| 胡牌率 | 10.0% | ≥90% | ❌ |
| 流局率 | 90.0% | <10% | ❌ |
| 自摸率 | 0.0% | 40-60% | ❌ |
| 捉冲率 | 100.0% | 40-60% | ❌ |
| 血战率 | 0.0% | >80% | ❌ |
| 大牌率 | 0.0% | 3-8% | ❌ |
| 门清率 | 0.0% | 7-12% | ❌ |
| Fitness | -78454.0 | ↑ | — |

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
- Games: 10
- 胡牌局: 1 (10.0%)
- 流局: 9 (90.0%)
- 血战到最后一人: 0 (0.00%)
- 平均回合: 0.00
- 平均总筹码: 0.00
- 自摸率(胡牌中): 0.00%
- 大牌率(胡牌中): 0.00%
- 门清胡牌率(胡牌中): 0.00%
- 胜者平均最终点: 0.00
- Fitness: -78454.0000

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
  "chowChance": 0.4,
  "anKongChance": 0.9898296447948148,
  "pengWildBoost": 0.06282849518815241,
  "kongWildBoost": 0.17074969758870698,
  "chowWildPenalty": 0.22,
  "menqingKeepBonus": 2.8,
  "meldPenalty": 0.025679867261555692,
  "allPungsPursuit": 0.52,
  "pureFlushPursuit": 0.39155902112680335,
  "halfFlushWeight": 0.6,
  "sevenPairsPursuit": 0.15,
  "allHonorsPursuit": 0.14083222760517888,
  "allHonorsPungsPursuit": 0.08389067735611558,
  "qingPengPursuit": 0.49316917551025014,
  "hunPengPursuit": 0.5442411827354836,
  "windEastKeep": 1.7663111765725783,
  "windSouthKeep": 2.575719909145446,
  "windWestKeep": 1.1156865715889224,
  "windNorthKeep": 0.7255064576387434,
  "windGeneralKeep": 1.5,
  "dragonRedKeep": 3.2916529588266354,
  "dragonGreenKeep": 2.8583551204828295,
  "dragonWhiteKeep": 3.139412587580636,
  "dragonGeneralKeep": 1.6708964747800108,
  "pairWeight": 4.461113126078833,
  "nearWeight": 3.8258140895090156,
  "tripletKeepBonus": 4.464054750509257,
  "terminalPenalty": 0.6575230927938015,
  "wildKeepPenalty": 1741.4116998542363,
  "wildBailoutThreshold": 3,
  "wild0Aggression": 0.3360843092809285,
  "wild1Aggression": 0.40102709671115255,
  "wild2Aggression": 0.5978617869144395,
  "wild3PlusAggression": 0.9220505526317807,
  "wild1RouteMeldPush": 0.3320246566940525,
  "wild2RouteMeldPush": 0.6596439869769003,
  "wild3RouteMeldPush": 0.8154039015690847,
  "wild1RouteFlushBoost": 0.3094928789894137,
  "wild2RouteFlushBoost": 0.3,
  "wild3RouteFlushBoost": 0.47751980846352926,
  "wild1RouteHonorsBoost": 0,
  "wild2RouteHonorsBoost": 0.29972126353490036,
  "wild3RouteHonorsBoost": 0.4,
  "wild1RouteAllPungsBoost": 0.13351151940938097,
  "wild2RouteAllPungsBoost": 0.35,
  "wild3RouteAllPungsBoost": 0.4148522800563274,
  "wildMultLowAggression": 0.5728818119542574,
  "wildMultMidAggression": 0.5292362851551664,
  "wildMultHighAggression": 0.7227574234587231,
  "wild0MenqingKeep": 3.0702741060597987,
  "wild1MenqingKeep": 2.005138539192227,
  "wild2MenqingKeep": 1.0417063383558394,
  "wild1BaoPush": 0.08669062614139302,
  "wild2BaoPush": 0.29290913092768045,
  "wild3BaoPush": 0.4192148182148463,
  "multLowSpeedBias": 0.5,
  "multHighValueBias": 0.7829166927551453,
  "discardObsFlushBoost": 0.5664893156722501,
  "discardObsWeight": 0.36512466636888635,
  "bao2ClaimPenalty": 0.5863659036046336,
  "bao3AvoidThreshold": 0.7145038520760525,
  "baoSelfClaimCaution": 0.34518241257548415,
  "wallEarlySpeedPush": 0.3131723772394867,
  "wallMidBalance": 0.4405118254914803,
  "wallLateDefense": 0.8293461896013391,
  "oppTingDetection": 0.5,
  "safeTilePriority": 0.6225983733417838,
  "terminalDiscardTingSignal": 0.2917110471347582,
  "wildDiaoKeepBonus": 2.908297060009122,
  "wildDiaoFlushBoost": 1.0928343303249333,
  "wildDiaoPungBoost": 2.4861437507327993,
  "scoreBehindRiskBoost": 1.1995043113492772,
  "scoreLeadDefenseBoost": 1,
  "hand5RouteBias": 0.3123080868982012,
  "hand6RouteBias": 0.6,
  "hand7RouteBias": 0.9,
  "multLowHand5AllPungs": 0.4575758444068891,
  "multLowHand5HalfFlush": 0.43372616503943406,
  "multHighHand5AllPungs": 0.28993421800348046,
  "multHighHand5HalfFlush": 0.2850975128971883,
  "multLowHand6AllPungs": 0.0562001177920238,
  "multLowHand6HalfFlush": 0.286611677554435,
  "multLowHand6PureFlush": 0.25,
  "multHighHand6AllPungs": 0.25,
  "multHighHand6HalfFlush": 0.55,
  "multHighHand6PureFlush": 0.45,
  "multLowHand7AllPungs": 0.2,
  "multLowHand7HalfFlush": 0.4,
  "multLowHand7PureFlush": 0.2793345675720549,
  "multHighHand7AllPungs": 0.016475966765284886,
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
  "honorVsSuitedBalance": -0.06499699959801614,
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

### 最大输赢局明细（本轮）
- 本轮无有效对局数据


### 第23轮 (强度=2.5, 停滞=11)
  C1: fitness=-88454 hu=0% self=0% disc=0% draws=10
  C2: fitness=-88454 hu=0% self=0% disc=0% draws=10
  C3: fitness=-88454 hu=0% self=0% disc=0% draws=10
  C4: fitness=-88454 hu=0% self=0% disc=0% draws=10
  C5: fitness=-88454 hu=0% self=0% disc=0% draws=10
  Best: -88454 (overall: -68416) [plateau: 12]
  指标: hu=0% self=0% disc=0% big=0% mq=0%

## Round 23 (2026-04-07T18:21:15.494Z)

### 📊 训练指标 Summary

| 指标 | 值 | K哥目标 | 达标 |
|------|-----|---------|------|
| 胡牌率 | 0.0% | ≥90% | ❌ |
| 流局率 | 100.0% | <10% | ❌ |
| 自摸率 | 0.0% | 40-60% | ❌ |
| 捉冲率 | 0.0% | 40-60% | ❌ |
| 血战率 | 0.0% | >80% | ❌ |
| 大牌率 | 0.0% | 3-8% | ❌ |
| 门清率 | 0.0% | 7-12% | ❌ |
| Fitness | -88454.0 | ↑ | — |

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
- Games: 10
- 胡牌局: 0 (0.0%)
- 流局: 10 (100.0%)
- 血战到最后一人: 0 (0.00%)
- 平均回合: 0.00
- 平均总筹码: 0.00
- 自摸率(胡牌中): 0.00%
- 大牌率(胡牌中): 0.00%
- 门清胡牌率(胡牌中): 0.00%
- 胜者平均最终点: 0.00
- Fitness: -88454.0000

### 本轮最佳策略参数
```json
{
  "id": "AI-AK",
  "selfWinChance": 0.8,
  "discardHuChance": 0.8,
  "selfWinWildBoost": 0.1266871952479135,
  "discardHuWildPenalty": 0.3484112283088031,
  "discardHuMenQingPenalty": 0.1464675958819554,
  "pengChance": 0.9086566182568097,
  "kongChance": 0.5149119649159877,
  "chowChance": 0.4,
  "anKongChance": 0.9898296447948148,
  "pengWildBoost": 0.06282849518815241,
  "kongWildBoost": 0.17074969758870698,
  "chowWildPenalty": 0.22,
  "menqingKeepBonus": 2.8,
  "meldPenalty": 0.025679867261555692,
  "allPungsPursuit": 0.52,
  "pureFlushPursuit": 0.39155902112680335,
  "halfFlushWeight": 0.6,
  "sevenPairsPursuit": 0.15,
  "allHonorsPursuit": 0.14083222760517888,
  "allHonorsPungsPursuit": 0.08389067735611558,
  "qingPengPursuit": 0.49316917551025014,
  "hunPengPursuit": 0.5442411827354836,
  "windEastKeep": 1.7663111765725783,
  "windSouthKeep": 2.575719909145446,
  "windWestKeep": 1.1156865715889224,
  "windNorthKeep": 0.7255064576387434,
  "windGeneralKeep": 1.5,
  "dragonRedKeep": 3.2916529588266354,
  "dragonGreenKeep": 2.8583551204828295,
  "dragonWhiteKeep": 3.139412587580636,
  "dragonGeneralKeep": 1.6708964747800108,
  "pairWeight": 4.461113126078833,
  "nearWeight": 3.8258140895090156,
  "tripletKeepBonus": 4.157096354944348,
  "terminalPenalty": 0.6774006776502599,
  "wildKeepPenalty": 1741.4116998542363,
  "wildBailoutThreshold": 3,
  "wild0Aggression": 0.3360843092809285,
  "wild1Aggression": 0.40102709671115255,
  "wild2Aggression": 0.5978617869144395,
  "wild3PlusAggression": 0.9220505526317807,
  "wild1RouteMeldPush": 0.3320246566940525,
  "wild2RouteMeldPush": 0.6596439869769003,
  "wild3RouteMeldPush": 0.8154039015690847,
  "wild1RouteFlushBoost": 0.3094928789894137,
  "wild2RouteFlushBoost": 0.3,
  "wild3RouteFlushBoost": 0.47751980846352926,
  "wild1RouteHonorsBoost": 0,
  "wild2RouteHonorsBoost": 0.29972126353490036,
  "wild3RouteHonorsBoost": 0.4,
  "wild1RouteAllPungsBoost": 0.13351151940938097,
  "wild2RouteAllPungsBoost": 0.35,
  "wild3RouteAllPungsBoost": 0.4148522800563274,
  "wildMultLowAggression": 0.5728818119542574,
  "wildMultMidAggression": 0.5292362851551664,
  "wildMultHighAggression": 0.7227574234587231,
  "wild0MenqingKeep": 3.0702741060597987,
  "wild1MenqingKeep": 2.005138539192227,
  "wild2MenqingKeep": 1.0417063383558394,
  "wild1BaoPush": 0.08669062614139302,
  "wild2BaoPush": 0.29290913092768045,
  "wild3BaoPush": 0.8,
  "multLowSpeedBias": 0.5,
  "multHighValueBias": 0.7829166927551453,
  "discardObsFlushBoost": 0.8732711166919813,
  "discardObsWeight": 0.3169784141834593,
  "bao2ClaimPenalty": 0.5863659036046336,
  "bao3AvoidThreshold": 0.7145038520760525,
  "baoSelfClaimCaution": 0.34518241257548415,
  "wallEarlySpeedPush": 0.3131723772394867,
  "wallMidBalance": 0.4405118254914803,
  "wallLateDefense": 0.8293461896013391,
  "oppTingDetection": 0.5,
  "safeTilePriority": 0.6225983733417838,
  "terminalDiscardTingSignal": 0.2917110471347582,
  "wildDiaoKeepBonus": 2.908297060009122,
  "wildDiaoFlushBoost": 1.0928343303249333,
  "wildDiaoPungBoost": 2.4861437507327993,
  "scoreBehindRiskBoost": 0.8551380737956297,
  "scoreLeadDefenseBoost": 1,
  "hand5RouteBias": 0.3123080868982012,
  "hand6RouteBias": 0.6,
  "hand7RouteBias": 0.9,
  "multLowHand5AllPungs": 0.4575758444068891,
  "multLowHand5HalfFlush": 0.43372616503943406,
  "multHighHand5AllPungs": 0.337344946620979,
  "multHighHand5HalfFlush": 0.2850975128971883,
  "multLowHand6AllPungs": 0.25,
  "multLowHand6HalfFlush": 0.286611677554435,
  "multLowHand6PureFlush": 0.25,
  "multHighHand6AllPungs": 0.25,
  "multHighHand6HalfFlush": 0.55,
  "multHighHand6PureFlush": 0.45,
  "multLowHand7AllPungs": 0.2,
  "multLowHand7HalfFlush": 0.4,
  "multLowHand7PureFlush": 0.2793345675720549,
  "multHighHand7AllPungs": 0.016475966765284886,
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
  "flushVsPungsBalance": 0.25292415153978837,
  "honorVsSuitedBalance": -0.06499699959801614,
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

### 最大输赢局明细（本轮）
- 本轮无有效对局数据
