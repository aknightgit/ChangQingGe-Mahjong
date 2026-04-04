# 长清阁麻将 全员基线收敛训练日志

- 创建时间: 2026-04-03T15:22:38.417Z
- 训练脚本: train-baseline.ts
- Config: 3 rounds × 600 games = 1800 total
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
| 胡牌率 | 1.2% | ≥90% |
| 流局率 | 98.8% | <10% |
| 自摸率 | 85.7% | 40-60% |
| 捉冲率 | 14.3% | 40-60% |
| 血战率 | 0.0% | >80% |
| 大牌率 | 0.0% | 3-8% |
| 门清率 | 71.4% | 7-12% |
| Fitness | -2635.1 | ↑ |

### 第1轮 (强度=1.0, 停滞=0)
  C1: fitness=-2727 hu=3% self=100% disc=0% draws=581
  C2: fitness=-2635 hu=2% self=89% disc=11% draws=591
  C3: fitness=-2610 hu=1% self=75% disc=25% draws=592
  C4: fitness=-2719 hu=2% self=91% disc=9% draws=589
  C5: fitness=-2679 hu=2% self=89% disc=11% draws=591
  ★ NEW BEST! fitness=-2610
  指标: hu=1% self=75% disc=25% big=0% mq=88%

## Round 1 (2026-04-03T15:42:51.846Z)

### 📊 训练指标 Summary

| 指标 | 值 | K哥目标 | 达标 |
|------|-----|---------|------|
| 胡牌率 | 1.3% | ≥90% | ❌ |
| 流局率 | 98.7% | <10% | ❌ |
| 自摸率 | 75.0% | 40-60% | ❌ |
| 捉冲率 | 25.0% | 40-60% | ❌ |
| 血战率 | 0.0% | >80% | ❌ |
| 大牌率 | 0.0% | 3-8% | ❌ |
| 门清率 | 87.5% | 7-12% | ❌ |
| Fitness | -2610.3 | ↑ | — |

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
- Games: 600
- 胡牌局: 8 (1.3%)
- 流局: 592 (98.7%)
- 血战到最后一人: 0 (0.00%)
- 平均回合: 0.00
- 平均总筹码: 0.00
- 自摸率(胡牌中): 75.00%
- 大牌率(胡牌中): 0.00%
- 门清胡牌率(胡牌中): 87.50%
- 胜者平均最终点: 0.00
- Fitness: -2610.3333

### 本轮最佳策略参数
```json
{
  "id": "AI-AK",
  "selfWinChance": 0.7232482820618522,
  "discardHuChance": 0.7328640415363099,
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
  "wild0Aggression": 0.3025044286984318,
  "wild1Aggression": 0.45116098936330645,
  "wild2Aggression": 0.6378481052620164,
  "wild3PlusAggression": 0.9597009683914007,
  "wild1RouteMeldPush": 0.2878493654986665,
  "wild2RouteMeldPush": 0.6,
  "wild3RouteMeldPush": 0.8,
  "wild1RouteFlushBoost": 0.33459464431743774,
  "wild2RouteFlushBoost": 0.3,
  "wild3RouteFlushBoost": 0.47751980846352926,
  "wild1RouteHonorsBoost": 0,
  "wild2RouteHonorsBoost": 0.2,
  "wild3RouteHonorsBoost": 0.4,
  "wild1RouteAllPungsBoost": 0.15,
  "wild2RouteAllPungsBoost": 0.35,
  "wild3RouteAllPungsBoost": 0.5011231296290346,
  "wildMultLowAggression": 0.531984642444706,
  "wildMultMidAggression": 0.5401444962618412,
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
  "noWildDoubleAwareness": 0.5049358119106367,
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
