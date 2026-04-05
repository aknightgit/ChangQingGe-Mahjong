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
