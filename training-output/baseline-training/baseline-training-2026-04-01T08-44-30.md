# 长清阁麻将 全员基线收敛训练日志

- 创建时间: 2026-04-01T08:44:30.719Z
- 训练脚本: train-baseline.ts
- Config: 2 rounds × 50 games = 100 total
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
| 胡牌率 | 6.0% | ≥90% |
| 流局率 | 94.0% | <10% |
| 自摸率 | 0.0% | 40-60% |
| 捉冲率 | 100.0% | 40-60% |
| 血战率 | 0.0% | >80% |
| 大牌率 | 0.0% | 3-8% |
| 门清率 | 0.0% | 7-12% |
| Fitness | -1603.0 | ↑ |

### 第1轮 (强度=1.0, 停滞=0)
  C1: fitness=-1643 hu=2% self=0% disc=100% draws=49
  C2: fitness=-923 hu=2% self=50% disc=50% draws=49
  C3: fitness=-1623 hu=4% self=100% disc=0% draws=48
  C4: fitness=-1298 hu=8% self=20% disc=80% draws=46
  C5: fitness=-1623 hu=4% self=0% disc=100% draws=48
  ★ NEW BEST! fitness=-923
  指标: hu=2% self=50% disc=50% big=0% mq=0%

## Round 1 (2026-04-01T08:44:43.453Z)

### 训练指标
- Games: 50
- 胡牌局: 1 (2.00%)
- 流局: 49 (98.00%)
- 血战到最后一人: 1 (100.00%)
- 平均回合: 0.00
- 平均总筹码: 0.00
- 自摸率(胡牌中): 50.00%
- 大牌率(胡牌中): 0.00%
- 门清胡牌率(胡牌中): 0.00%
- 胜者平均最终点: 0.00
- Fitness: -923.0000

### 本轮最佳策略参数
```json
{
  "id": "AI-AK",
  "selfWinChance": 0.7665253481186775,
  "discardHuChance": 0.7,
  "selfWinWildBoost": 0.1,
  "discardHuWildPenalty": 0.35,
  "discardHuMenQingPenalty": 0.12,
  "pengChance": 0.95,
  "kongChance": 0.4889073961745143,
  "chowChance": 0.15,
  "anKongChance": 0.9898296447948148,
  "pengWildBoost": 0.06282849518815241,
  "kongWildBoost": 0.1769151208934808,
  "chowWildPenalty": 0.22,
  "menqingKeepBonus": 4,
  "meldPenalty": 0.026829650548748255,
  "allPungsPursuit": 0.6735385493357315,
  "pureFlushPursuit": 0.5,
  "halfFlushWeight": 0.6,
  "sevenPairsPursuit": 0.15,
  "allHonorsPursuit": 0.08,
  "allHonorsPungsPursuit": 0.08389067735611558,
  "qingPengPursuit": 0.2,
  "hunPengPursuit": 0.3442714757536987,
  "windEastKeep": 2,
  "windSouthKeep": 2.4258378922864416,
  "windWestKeep": 1,
  "windNorthKeep": 0.7255064576387434,
  "windGeneralKeep": 1.5,
  "dragonRedKeep": 3.2916529588266354,
  "dragonGreenKeep": 3,
  "dragonWhiteKeep": 2.9818362851231037,
  "dragonGeneralKeep": 2.140906048083425,
  "pairWeight": 3.9940318537360784,
  "nearWeight": 4.0357824313562745,
  "tripletKeepBonus": 3.899815387646074,
  "terminalPenalty": 1,
  "wildKeepPenalty": 1356.3139207495105,
  "wildBailoutThreshold": 3,
  "wild0Aggression": 0.3360843092809285,
  "wild1Aggression": 0.5,
  "wild2Aggression": 0.6378481052620164,
  "wild3PlusAggression": 0.9,
  "wild1RouteMeldPush": 0.3105316931817443,
  "wild2RouteMeldPush": 0.6,
  "wild3RouteMeldPush": 0.8,
  "wild1RouteFlushBoost": 0.2846093688454401,
  "wild2RouteFlushBoost": 0.3,
  "wild3RouteFlushBoost": 0.47751980846352926,
  "wild1RouteHonorsBoost": 0,
  "wild2RouteHonorsBoost": 0.2,
  "wild3RouteHonorsBoost": 0.4,
  "wild1RouteAllPungsBoost": 0.15,
  "wild2RouteAllPungsBoost": 0.35,
  "wild3RouteAllPungsBoost": 0.5011231296290346,
  "wildMultLowAggression": 0.522153193256182,
  "wildMultMidAggression": 0.5,
  "wildMultHighAggression": 0.8,
  "wild0MenqingKeep": 3,
  "wild1MenqingKeep": 2.005138539192227,
  "wild2MenqingKeep": 1,
  "wild1BaoPush": 0.08669062614139302,
  "wild2BaoPush": 0.5317480946070161,
  "wild3BaoPush": 0.8,
  "multLowSpeedBias": 0.5,
  "multHighValueBias": 0.7829166927551453,
  "discardObsFlushBoost": 0.4794246495925073,
  "discardObsWeight": 0.3169784141834593,
  "bao2ClaimPenalty": 0.5522921350775664,
  "bao3AvoidThreshold": 0.7403525491739775,
  "baoSelfClaimCaution": 0.34518241257548415,
  "wallEarlySpeedPush": 0.2830782739546156,
  "wallMidBalance": 0.4405118254914803,
  "wallLateDefense": 0.8,
  "oppTingDetection": 0.5,
  "safeTilePriority": 0.6225983733417838,
  "terminalDiscardTingSignal": 0.2917110471347582,
  "wildDiaoKeepBonus": 2.908297060009122,
  "wildDiaoFlushBoost": 1.0928343303249333,
  "wildDiaoPungBoost": 2.5,
  "scoreBehindRiskBoost": 1.0064560779164102,
  "scoreLeadDefenseBoost": 1,
  "hand5RouteBias": 0.2590273941175259,
  "hand6RouteBias": 0.6,
  "hand7RouteBias": 0.9,
  "multLowHand5AllPungs": 0.4575758444068891,
  "multLowHand5HalfFlush": 0.3126169667438694,
  "multHighHand5AllPungs": 0.35,
  "multHighHand5HalfFlush": 0.2850975128971883,
  "multLowHand6AllPungs": 0.25,
  "multLowHand6HalfFlush": 0.27483378013194093,
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
  "minkanAggression": 0.3,
  "kakanAggression": 0.5,
  "robKongAwareness": 0.4936205071870478,
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


### 第2轮 (强度=1.0, 停滞=0)
  C1: fitness=-1623 hu=4% self=0% disc=100% draws=48
  C2: fitness=-1373 hu=4% self=0% disc=100% draws=48
  C3: fitness=-1260 hu=6% self=25% disc=75% draws=47
  C4: fitness=-1643 hu=2% self=0% disc=100% draws=49
  C5: fitness=-1643 hu=2% self=0% disc=100% draws=49
  Best: -1260 (overall: -923) [plateau: 1]
  指标: hu=6% self=25% disc=75% big=0% mq=25%

## Round 2 (2026-04-01T08:44:54.023Z)

### 训练指标
- Games: 50
- 胡牌局: 3 (6.00%)
- 流局: 47 (94.00%)
- 血战到最后一人: 1 (33.33%)
- 平均回合: 0.00
- 平均总筹码: 0.00
- 自摸率(胡牌中): 25.00%
- 大牌率(胡牌中): 0.00%
- 门清胡牌率(胡牌中): 25.00%
- 胜者平均最终点: 0.00
- Fitness: -1260.3333

### 本轮最佳策略参数
```json
{
  "id": "AI-AK",
  "selfWinChance": 0.7665253481186775,
  "discardHuChance": 0.6984456910188752,
  "selfWinWildBoost": 0.1,
  "discardHuWildPenalty": 0.35,
  "discardHuMenQingPenalty": 0.12,
  "pengChance": 0.95,
  "kongChance": 0.4889073961745143,
  "chowChance": 0.15,
  "anKongChance": 0.9898296447948148,
  "pengWildBoost": 0.06282849518815241,
  "kongWildBoost": 0.1769151208934808,
  "chowWildPenalty": 0.22,
  "menqingKeepBonus": 4,
  "meldPenalty": 0.026829650548748255,
  "allPungsPursuit": 0.6735385493357315,
  "pureFlushPursuit": 0.5,
  "halfFlushWeight": 0.6,
  "sevenPairsPursuit": 0.15,
  "allHonorsPursuit": 0.08,
  "allHonorsPungsPursuit": 0.08389067735611558,
  "qingPengPursuit": 0.2,
  "hunPengPursuit": 0.3442714757536987,
  "windEastKeep": 2,
  "windSouthKeep": 2.4258378922864416,
  "windWestKeep": 1,
  "windNorthKeep": 0.7255064576387434,
  "windGeneralKeep": 1.5330677349381687,
  "dragonRedKeep": 3.2916529588266354,
  "dragonGreenKeep": 3,
  "dragonWhiteKeep": 2.9818362851231037,
  "dragonGeneralKeep": 2.140906048083425,
  "pairWeight": 3.9940318537360784,
  "nearWeight": 4.0357824313562745,
  "tripletKeepBonus": 3.899815387646074,
  "terminalPenalty": 1,
  "wildKeepPenalty": 1356.3139207495105,
  "wildBailoutThreshold": 3,
  "wild0Aggression": 0.3360843092809285,
  "wild1Aggression": 0.5,
  "wild2Aggression": 0.6378481052620164,
  "wild3PlusAggression": 0.9,
  "wild1RouteMeldPush": 0.3105316931817443,
  "wild2RouteMeldPush": 0.6,
  "wild3RouteMeldPush": 0.8,
  "wild1RouteFlushBoost": 0.2846093688454401,
  "wild2RouteFlushBoost": 0.3,
  "wild3RouteFlushBoost": 0.47751980846352926,
  "wild1RouteHonorsBoost": 0,
  "wild2RouteHonorsBoost": 0.2,
  "wild3RouteHonorsBoost": 0.4,
  "wild1RouteAllPungsBoost": 0.15,
  "wild2RouteAllPungsBoost": 0.35,
  "wild3RouteAllPungsBoost": 0.5011231296290346,
  "wildMultLowAggression": 0.522153193256182,
  "wildMultMidAggression": 0.5,
  "wildMultHighAggression": 0.8,
  "wild0MenqingKeep": 3,
  "wild1MenqingKeep": 2.005138539192227,
  "wild2MenqingKeep": 1,
  "wild1BaoPush": 0.08669062614139302,
  "wild2BaoPush": 0.5317480946070161,
  "wild3BaoPush": 0.8,
  "multLowSpeedBias": 0.5,
  "multHighValueBias": 0.7829166927551453,
  "discardObsFlushBoost": 0.4794246495925073,
  "discardObsWeight": 0.3169784141834593,
  "bao2ClaimPenalty": 0.5522921350775664,
  "bao3AvoidThreshold": 0.7403525491739775,
  "baoSelfClaimCaution": 0.34518241257548415,
  "wallEarlySpeedPush": 0.352771994706465,
  "wallMidBalance": 0.4405118254914803,
  "wallLateDefense": 0.8,
  "oppTingDetection": 0.5,
  "safeTilePriority": 0.6225983733417838,
  "terminalDiscardTingSignal": 0.2917110471347582,
  "wildDiaoKeepBonus": 2.908297060009122,
  "wildDiaoFlushBoost": 1.0928343303249333,
  "wildDiaoPungBoost": 2.5,
  "scoreBehindRiskBoost": 1.0064560779164102,
  "scoreLeadDefenseBoost": 1,
  "hand5RouteBias": 0.2590273941175259,
  "hand6RouteBias": 0.6,
  "hand7RouteBias": 0.9,
  "multLowHand5AllPungs": 0.4575758444068891,
  "multLowHand5HalfFlush": 0.3126169667438694,
  "multHighHand5AllPungs": 0.35,
  "multHighHand5HalfFlush": 0.2850975128971883,
  "multLowHand6AllPungs": 0.25,
  "multLowHand6HalfFlush": 0.27483378013194093,
  "multLowHand6PureFlush": 0.25,
  "multHighHand6AllPungs": 0.25,
  "multHighHand6HalfFlush": 0.5479159505700529,
  "multHighHand6PureFlush": 0.45,
  "multLowHand7AllPungs": 0.2,
  "multLowHand7HalfFlush": 0.4,
  "multLowHand7PureFlush": 0.309818294975893,
  "multHighHand7AllPungs": 0.07987827314178728,
  "multHighHand7HalfFlush": 0.4,
  "multHighHand7PureFlush": 0.7087456738946541,
  "multHighHonorStart": 0.6353334176611241,
  "speedVsValueBalance": 0.5,
  "defenseRiskAversion": 0.42466527676568333,
  "wallTilesImpact": 0.2,
  "baoRiskAversion": 0.4666330346059575,
  "baoThreshold": 2.001366078229792,
  "anKongAggression": 0.9564908137617628,
  "minkanAggression": 0.3,
  "kakanAggression": 0.5,
  "robKongAwareness": 0.4936205071870478,
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


--- 最终评估 ---
| 指标 | 值 | 目标 | 达标 |
|------|-----|------|------|
| 胡牌率 | 3.0% | ≥90% | ❌ |
| 流局率 | 97.0% | <10% | ❌ |
| 自摸率 | 23.3% | 40-60% | ❌ |
| 捉冲率 | 76.7% | 40-60% | ❌ |
| 血战率 | 0.0% | >80% | ❌ |
| 大牌率 | 0.0% | 3-8% | ❌ |
| 门清率 | 10.0% | 7-12% | ✅ |

Fitness: -1418

  最佳策略参数 (关键):
    selfWinChance: 0.7665
    discardHuChance: 0.7000
    pengChance: 0.9500
    chowChance: 0.1500
    anKongChance: 0.9898
    allPungsPursuit: 0.6735
    pureFlushPursuit: 0.5000
    halfFlushWeight: 0.6000
    sevenPairsPursuit: 0.1500
    menqingKeepBonus: 4
    noWildDoubleAwareness: 0.5000
    wild0Aggression: 0.3361
    wild1Aggression: 0.5000
    wild2Aggression: 0.6378
    wild3PlusAggression: 0.9000
    wild0MenqingKeep: 3
    wild1MenqingKeep: 2.0051
    wild2MenqingKeep: 1
    multHighValueBias: 0.7829
    wallLateDefense: 0.8000
    safeTilePriority: 0.6226