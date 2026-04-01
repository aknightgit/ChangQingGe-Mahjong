# 长清阁麻将 全员基线收敛训练日志

- 创建时间: 2026-04-01T00:47:34.012Z
- 训练脚本: train-baseline.ts
- Config: 5 rounds × 1000 games = 5000 total
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
| 胡牌率 | 93.2% | ≥90% |
| 流局率 | 6.8% | <10% |
| 自摸率 | 65.5% | 40-60% |
| 捉冲率 | 34.5% | 40-60% |
| 血战率 | 65.5% | >80% |
| 大牌率 | 0.1% | 3-8% |
| 门清率 | 20.1% | 7-12% |
| Fitness | -147.8 | ↑ |

### 第1轮 (强度=1.0, 停滞=0)
  C1: fitness=-115 hu=94% self=62% disc=38% draws=61
  C2: fitness=-170 hu=93% self=69% disc=31% draws=69
  C3: fitness=-148 hu=92% self=66% disc=34% draws=83
  C4: fitness=-126 hu=94% self=65% disc=35% draws=65
  C5: fitness=-118 hu=93% self=62% disc=38% draws=74
  ★ NEW BEST! fitness=-115
  指标: hu=94% self=62% disc=38% big=0% mq=19%

## Round 1 (2026-04-01T00:52:55.613Z)

### 训练指标
- Games: 1000
- 胡牌局: 1750 (175.00%)
- 流局: -750 (-75.00%)
- 血战到最后一人: 612 (34.97%)
- 自摸率(胡牌中): 62.34%
- 捉冲率(胡牌中): 37.66%
- 大牌率(胡牌中): 0.11%
- 门清胡牌率(胡牌中): 18.91%
- Fitness: 36400.0000

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
  "kongWildBoost": 0.16,
  "chowWildPenalty": 0.22,
  "menqingKeepBonus": 4,
  "meldPenalty": 0.020598493221004818,
  "allPungsPursuit": 0.6735385493357315,
  "pureFlushPursuit": 0.5,
  "halfFlushWeight": 0.6,
  "sevenPairsPursuit": 0.15,
  "allHonorsPursuit": 0.08,
  "allHonorsPungsPursuit": 0.04,
  "qingPengPursuit": 0.2,
  "hunPengPursuit": 0.3442714757536987,
  "windEastKeep": 2,
  "windSouthKeep": 2.4258378922864416,
  "windWestKeep": 1,
  "windNorthKeep": 0.7255064576387434,
  "windGeneralKeep": 1.5,
  "dragonRedKeep": 3.2916529588266354,
  "dragonGreenKeep": 3,
  "dragonWhiteKeep": 2.8925294008197984,
  "dragonGeneralKeep": 2.5,
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
  "wild1RouteMeldPush": 0.3,
  "wild2RouteMeldPush": 0.6,
  "wild3RouteMeldPush": 0.8,
  "wild1RouteFlushBoost": 0.1543674352573403,
  "wild2RouteFlushBoost": 0.3,
  "wild3RouteFlushBoost": 0.47751980846352926,
  "wild1RouteHonorsBoost": 0.06436678819466914,
  "wild2RouteHonorsBoost": 0.2,
  "wild3RouteHonorsBoost": 0.4,
  "wild1RouteAllPungsBoost": 0.15,
  "wild2RouteAllPungsBoost": 0.35,
  "wild3RouteAllPungsBoost": 0.5011231296290346,
  "wildMultLowAggression": 0.522153193256182,
  "wildMultMidAggression": 0.5,
  "wildMultHighAggression": 0.8,
  "wild0MenqingKeep": 3,
  "wild1MenqingKeep": 2,
  "wild2MenqingKeep": 1,
  "wild1BaoPush": 0.08669062614139302,
  "wild2BaoPush": 0.5317480946070161,
  "wild3BaoPush": 0.8,
  "multLowSpeedBias": 0.5,
  "multHighValueBias": 0.7829166927551453,
  "discardObsFlushBoost": 0.4794246495925073,
  "discardObsWeight": 0.3155416216084052,
  "bao2ClaimPenalty": 0.5522921350775664,
  "bao3AvoidThreshold": 0.7403525491739775,
  "baoSelfClaimCaution": 0.3,
  "wallEarlySpeedPush": 0.2830782739546156,
  "wallMidBalance": 0.45,
  "wallLateDefense": 0.8,
  "oppTingDetection": 0.5,
  "safeTilePriority": 0.6225983733417838,
  "terminalDiscardTingSignal": 0.2917110471347582,
  "wildDiaoKeepBonus": 2.908297060009122,
  "wildDiaoFlushBoost": 1.5004508765207643,
  "wildDiaoPungBoost": 2.5,
  "scoreBehindRiskBoost": 1.0064560779164102,
  "scoreLeadDefenseBoost": 1,
  "hand5RouteBias": 0.2590273941175259,
  "hand6RouteBias": 0.6,
  "hand7RouteBias": 0.9,
  "multLowHand5AllPungs": 0.4575758444068891,
  "multLowHand5HalfFlush": 0.3126169667438694,
  "multHighHand5AllPungs": 0.35,
  "multHighHand5HalfFlush": 0.32439061063983177,
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
  "anKongAggression": 0.95,
  "minkanAggression": 0.3,
  "kakanAggression": 0.5,
  "robKongAwareness": 0.4936205071870478,
  "noWildDoubleAwareness": 0.5,
  "menqingDoubleAwareness": 0.5325238795068113,
  "flushVsPungsBalance": 0.1,
  "honorVsSuitedBalance": -0.1,
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

### 最大单人亏损局明细（本轮）
- 最大亏损: AI-小胖 -6400 点（绝对值 6400）
- 局号: 224
- 回合: 21
- 总筹码: 6400
- 百搭: 见手牌
- 回合/全局倍数信息:
  - 全局倍数: xundefined

- 输出该局所有胡牌玩家明细
  - 玩家: AI-AK
    - 胡牌方式: 放冲
    - 手牌牌面: 六条 北 五条 四万 三筒 六条 八条 五筒 四条 五万 北 四筒 六万
    - 门口牌（吃/碰/杠）: (无)
    - 花牌: 兰 春

- 结算逐笔明细（谁付给谁、倍率和金额）
  - [放炮] AI-小胖 -> AI-AK : 640


### 第2轮 (强度=1.0, 停滞=0)
  C1: fitness=-135 hu=93% self=65% disc=35% draws=71
  C2: fitness=-138 hu=93% self=65% disc=35% draws=70
  C3: fitness=-125 hu=92% self=63% disc=37% draws=83
  C4: fitness=-131 hu=93% self=64% disc=36% draws=73
  C5: fitness=-121 hu=94% self=63% disc=37% draws=65
  Best: -121 (overall: -115) [plateau: 1]
  指标: hu=94% self=63% disc=37% big=0% mq=20%

## Round 2 (2026-04-01T00:57:23.148Z)

### 训练指标
- Games: 1000
- 胡牌局: 1753 (175.30%)
- 流局: -753 (-75.30%)
- 血战到最后一人: 616 (35.14%)
- 自摸率(胡牌中): 62.75%
- 捉冲率(胡牌中): 37.25%
- 大牌率(胡牌中): 0.00%
- 门清胡牌率(胡牌中): 19.79%
- Fitness: 46500.0000

### 本轮最佳策略参数
```json
{
  "id": "AI-AK",
  "selfWinChance": 0.7665253481186775,
  "discardHuChance": 0.686125408646332,
  "selfWinWildBoost": 0.1,
  "discardHuWildPenalty": 0.35,
  "discardHuMenQingPenalty": 0.12,
  "pengChance": 0.95,
  "kongChance": 0.4889073961745143,
  "chowChance": 0.15,
  "anKongChance": 0.9898296447948148,
  "pengWildBoost": 0.05811327588322549,
  "kongWildBoost": 0.16,
  "chowWildPenalty": 0.22,
  "menqingKeepBonus": 4,
  "meldPenalty": 0.020598493221004818,
  "allPungsPursuit": 0.6735385493357315,
  "pureFlushPursuit": 0.5,
  "halfFlushWeight": 0.6,
  "sevenPairsPursuit": 0.15,
  "allHonorsPursuit": 0.08,
  "allHonorsPungsPursuit": 0.04,
  "qingPengPursuit": 0.2,
  "hunPengPursuit": 0.3442714757536987,
  "windEastKeep": 2.034501296973661,
  "windSouthKeep": 2.459543207860074,
  "windWestKeep": 1,
  "windNorthKeep": 0.7255064576387434,
  "windGeneralKeep": 1.5,
  "dragonRedKeep": 3.2916529588266354,
  "dragonGreenKeep": 3,
  "dragonWhiteKeep": 2.8925294008197984,
  "dragonGeneralKeep": 2.5,
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
  "wild1RouteMeldPush": 0.3,
  "wild2RouteMeldPush": 0.6,
  "wild3RouteMeldPush": 0.8,
  "wild1RouteFlushBoost": 0.1543674352573403,
  "wild2RouteFlushBoost": 0.3,
  "wild3RouteFlushBoost": 0.47751980846352926,
  "wild1RouteHonorsBoost": 0.06436678819466914,
  "wild2RouteHonorsBoost": 0.2,
  "wild3RouteHonorsBoost": 0.4,
  "wild1RouteAllPungsBoost": 0.15,
  "wild2RouteAllPungsBoost": 0.35,
  "wild3RouteAllPungsBoost": 0.5011231296290346,
  "wildMultLowAggression": 0.522153193256182,
  "wildMultMidAggression": 0.5,
  "wildMultHighAggression": 0.8,
  "wild0MenqingKeep": 3,
  "wild1MenqingKeep": 2,
  "wild2MenqingKeep": 1,
  "wild1BaoPush": 0.08669062614139302,
  "wild2BaoPush": 0.5317480946070161,
  "wild3BaoPush": 0.8,
  "multLowSpeedBias": 0.5,
  "multHighValueBias": 0.7829166927551453,
  "discardObsFlushBoost": 0.4794246495925073,
  "discardObsWeight": 0.3155416216084052,
  "bao2ClaimPenalty": 0.5522921350775664,
  "bao3AvoidThreshold": 0.7403525491739775,
  "baoSelfClaimCaution": 0.3,
  "wallEarlySpeedPush": 0.2830782739546156,
  "wallMidBalance": 0.47479836167953143,
  "wallLateDefense": 0.8,
  "oppTingDetection": 0.5,
  "safeTilePriority": 0.6225983733417838,
  "terminalDiscardTingSignal": 0.2917110471347582,
  "wildDiaoKeepBonus": 2.908297060009122,
  "wildDiaoFlushBoost": 1.5004508765207643,
  "wildDiaoPungBoost": 2.5,
  "scoreBehindRiskBoost": 1.0064560779164102,
  "scoreLeadDefenseBoost": 1,
  "hand5RouteBias": 0.2590273941175259,
  "hand6RouteBias": 0.6,
  "hand7RouteBias": 0.9,
  "multLowHand5AllPungs": 0.4575758444068891,
  "multLowHand5HalfFlush": 0.3126169667438694,
  "multHighHand5AllPungs": 0.35,
  "multHighHand5HalfFlush": 0.32439061063983177,
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
  "anKongAggression": 0.95,
  "minkanAggression": 0.3,
  "kakanAggression": 0.5,
  "robKongAwareness": 0.4936205071870478,
  "noWildDoubleAwareness": 0.5,
  "menqingDoubleAwareness": 0.5325238795068113,
  "flushVsPungsBalance": 0.1,
  "honorVsSuitedBalance": -0.1,
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

### 最大单人亏损局明细（本轮）
- 最大亏损: AI-小胖 -4800 点（绝对值 4800）
- 局号: 64
- 回合: 49
- 总筹码: 4800
- 百搭: 见手牌
- 回合/全局倍数信息:
  - 全局倍数: xundefined

- 输出该局所有胡牌玩家明细
  - 玩家: AI-AK
    - 胡牌方式: 自摸
    - 手牌牌面: 八条 六万 七万 四万 六万 八条 六万 四万 八万 七万 八条 八条
    - 门口牌（吃/碰/杠）: 吃:一万 二万 三万
    - 花牌: 秋 梅

- 结算逐笔明细（谁付给谁、倍率和金额）
  - [自摸] AI-小胖 -> AI-AK : 480
  - [自摸] AI-阿水 -> AI-AK : 480
  - [自摸] AI-老赵 -> AI-AK : 480


### 第3轮 (强度=1.0, 停滞=1)
  C1: fitness=-132 hu=93% self=64% disc=36% draws=66
  C2: fitness=-122 hu=92% self=62% disc=38% draws=76
  C3: fitness=-136 hu=92% self=64% disc=36% draws=83
  C4: fitness=-140 hu=92% self=65% disc=35% draws=77
  C5: fitness=-147 hu=94% self=66% disc=34% draws=59
  Best: -122 (overall: -115) [plateau: 2]
  指标: hu=92% self=62% disc=38% big=0% mq=20%

## Round 3 (2026-04-01T01:01:52.265Z)

### 训练指标
- Games: 1000
- 胡牌局: 1730 (173.00%)
- 流局: -730 (-73.00%)
- 血战到最后一人: 600 (34.68%)
- 自摸率(胡牌中): 61.50%
- 捉冲率(胡牌中): 38.50%
- 大牌率(胡牌中): 0.06%
- 门清胡牌率(胡牌中): 20.06%
- Fitness: 63100.0000

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
  "kongWildBoost": 0.16,
  "chowWildPenalty": 0.22,
  "menqingKeepBonus": 4,
  "meldPenalty": 0.020598493221004818,
  "allPungsPursuit": 0.6735385493357315,
  "pureFlushPursuit": 0.5,
  "halfFlushWeight": 0.6,
  "sevenPairsPursuit": 0.15,
  "allHonorsPursuit": 0.08,
  "allHonorsPungsPursuit": 0.04,
  "qingPengPursuit": 0.2,
  "hunPengPursuit": 0.3442714757536987,
  "windEastKeep": 2,
  "windSouthKeep": 2.4258378922864416,
  "windWestKeep": 1,
  "windNorthKeep": 0.7255064576387434,
  "windGeneralKeep": 1.5,
  "dragonRedKeep": 3.2916529588266354,
  "dragonGreenKeep": 3,
  "dragonWhiteKeep": 2.8925294008197984,
  "dragonGeneralKeep": 2.5,
  "pairWeight": 3.9496070439505067,
  "nearWeight": 4.0357824313562745,
  "tripletKeepBonus": 3.899815387646074,
  "terminalPenalty": 1,
  "wildKeepPenalty": 1356.3139207495105,
  "wildBailoutThreshold": 3,
  "wild0Aggression": 0.3360843092809285,
  "wild1Aggression": 0.5,
  "wild2Aggression": 0.6378481052620164,
  "wild3PlusAggression": 0.9,
  "wild1RouteMeldPush": 0.3,
  "wild2RouteMeldPush": 0.6,
  "wild3RouteMeldPush": 0.8,
  "wild1RouteFlushBoost": 0.1543674352573403,
  "wild2RouteFlushBoost": 0.3,
  "wild3RouteFlushBoost": 0.47751980846352926,
  "wild1RouteHonorsBoost": 0.06436678819466914,
  "wild2RouteHonorsBoost": 0.2,
  "wild3RouteHonorsBoost": 0.4,
  "wild1RouteAllPungsBoost": 0.15808344882046418,
  "wild2RouteAllPungsBoost": 0.35,
  "wild3RouteAllPungsBoost": 0.5011231296290346,
  "wildMultLowAggression": 0.522153193256182,
  "wildMultMidAggression": 0.5,
  "wildMultHighAggression": 0.8,
  "wild0MenqingKeep": 3,
  "wild1MenqingKeep": 2,
  "wild2MenqingKeep": 1,
  "wild1BaoPush": 0.08669062614139302,
  "wild2BaoPush": 0.5317480946070161,
  "wild3BaoPush": 0.8,
  "multLowSpeedBias": 0.5,
  "multHighValueBias": 0.7273297505243282,
  "discardObsFlushBoost": 0.4794246495925073,
  "discardObsWeight": 0.3155416216084052,
  "bao2ClaimPenalty": 0.5522921350775664,
  "bao3AvoidThreshold": 0.7403525491739775,
  "baoSelfClaimCaution": 0.3,
  "wallEarlySpeedPush": 0.2830782739546156,
  "wallMidBalance": 0.45,
  "wallLateDefense": 0.8,
  "oppTingDetection": 0.5,
  "safeTilePriority": 0.6225983733417838,
  "terminalDiscardTingSignal": 0.2917110471347582,
  "wildDiaoKeepBonus": 2.571832934436741,
  "wildDiaoFlushBoost": 1.5004508765207643,
  "wildDiaoPungBoost": 2.5,
  "scoreBehindRiskBoost": 1.0064560779164102,
  "scoreLeadDefenseBoost": 1,
  "hand5RouteBias": 0.2590273941175259,
  "hand6RouteBias": 0.6,
  "hand7RouteBias": 0.9,
  "multLowHand5AllPungs": 0.4575758444068891,
  "multLowHand5HalfFlush": 0.2586351871576936,
  "multHighHand5AllPungs": 0.35,
  "multHighHand5HalfFlush": 0.32418840106379354,
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
  "anKongAggression": 0.95,
  "minkanAggression": 0.3,
  "kakanAggression": 0.5,
  "robKongAwareness": 0.4936205071870478,
  "noWildDoubleAwareness": 0.5,
  "menqingDoubleAwareness": 0.5325238795068113,
  "flushVsPungsBalance": 0.1,
  "honorVsSuitedBalance": -0.1,
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

### 最大单人亏损局明细（本轮）
- 最大亏损: AI-AK -4000 点（绝对值 4000）
- 局号: 771
- 回合: 66
- 总筹码: 4000
- 百搭: 见手牌
- 回合/全局倍数信息:
  - 全局倍数: xundefined

- 输出该局所有胡牌玩家明细
  - 玩家: AI-小胖
    - 胡牌方式: 自摸
    - 手牌牌面: 七万 九万 北 九万 一万 六万 北 一万 八万 六万 九万 北
    - 门口牌（吃/碰/杠）: 碰:四万 四万 四万
    - 花牌: 竹 梅 菊

- 结算逐笔明细（谁付给谁、倍率和金额）
  - [自摸] AI-AK -> AI-小胖 : 400
  - [自摸] AI-阿水 -> AI-小胖 : 400
  - [自摸] AI-老赵 -> AI-小胖 : 400


### 第4轮 (强度=1.8, 停滞=2)
  C1: fitness=-151 hu=93% self=66% disc=34% draws=69
  C2: fitness=-89 hu=93% self=61% disc=39% draws=68
  C3: fitness=-133 hu=91% self=63% disc=37% draws=94
  C4: fitness=-103 hu=94% self=63% disc=37% draws=63
  C5: fitness=-125 hu=93% self=63% disc=37% draws=74
  ★ NEW BEST! fitness=-89
  指标: hu=93% self=61% disc=39% big=0% mq=18%

## Round 4 (2026-04-01T01:06:17.935Z)

### 训练指标
- Games: 1000
- 胡牌局: 1760 (176.00%)
- 流局: -760 (-76.00%)
- 血战到最后一人: 627 (35.63%)
- 自摸率(胡牌中): 60.51%
- 捉冲率(胡牌中): 39.49%
- 大牌率(胡牌中): 0.06%
- 门清胡牌率(胡牌中): 17.73%
- Fitness: 40200.0000

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
  "meldPenalty": 0.020598493221004818,
  "allPungsPursuit": 0.6735385493357315,
  "pureFlushPursuit": 0.5,
  "halfFlushWeight": 0.6,
  "sevenPairsPursuit": 0.15,
  "allHonorsPursuit": 0.08,
  "allHonorsPungsPursuit": 0.04,
  "qingPengPursuit": 0.2,
  "hunPengPursuit": 0.3442714757536987,
  "windEastKeep": 2,
  "windSouthKeep": 2.4258378922864416,
  "windWestKeep": 1,
  "windNorthKeep": 0.7255064576387434,
  "windGeneralKeep": 1.5,
  "dragonRedKeep": 3.2916529588266354,
  "dragonGreenKeep": 3,
  "dragonWhiteKeep": 2.8925294008197984,
  "dragonGeneralKeep": 2.5,
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
  "wild1RouteMeldPush": 0.3,
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
  "discardObsWeight": 0.3155416216084052,
  "bao2ClaimPenalty": 0.5522921350775664,
  "bao3AvoidThreshold": 0.7403525491739775,
  "baoSelfClaimCaution": 0.3,
  "wallEarlySpeedPush": 0.2830782739546156,
  "wallMidBalance": 0.45,
  "wallLateDefense": 0.8,
  "oppTingDetection": 0.5,
  "safeTilePriority": 0.6225983733417838,
  "terminalDiscardTingSignal": 0.2917110471347582,
  "wildDiaoKeepBonus": 2.908297060009122,
  "wildDiaoFlushBoost": 1.5004508765207643,
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
  "anKongAggression": 0.95,
  "minkanAggression": 0.3,
  "kakanAggression": 0.5,
  "robKongAwareness": 0.4936205071870478,
  "noWildDoubleAwareness": 0.5,
  "menqingDoubleAwareness": 0.5325238795068113,
  "flushVsPungsBalance": 0.1,
  "honorVsSuitedBalance": -0.1,
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

### 最大单人亏损局明细（本轮）
- 最大亏损: AI-AK -6400 点（绝对值 6400）
- 局号: 213
- 回合: 30
- 总筹码: 6400
- 百搭: 见手牌
- 回合/全局倍数信息:
  - 全局倍数: xundefined

- 输出该局所有胡牌玩家明细
  - 玩家: AI-小胖
    - 胡牌方式: 自摸
    - 手牌牌面: 九条 七万 二万 六万 二万 八条 七筒 七条 五筒 四筒 七筒 六筒 七筒 五万
    - 门口牌（吃/碰/杠）: (无)
    - 花牌: 秋 兰

- 结算逐笔明细（谁付给谁、倍率和金额）
  - [自摸] AI-AK -> AI-小胖 : 640
  - [自摸] AI-阿水 -> AI-小胖 : 640
  - [自摸] AI-老赵 -> AI-小胖 : 640


### 第5轮 (强度=1.0, 停滞=0)
  C1: fitness=-139 hu=92% self=65% disc=35% draws=79
  C2: fitness=-127 hu=93% self=64% disc=36% draws=67
  C3: fitness=-134 hu=94% self=66% disc=34% draws=65
  C4: fitness=-116 hu=92% self=64% disc=36% draws=77
  C5: fitness=-128 hu=93% self=64% disc=36% draws=67
  Best: -116 (overall: -89) [plateau: 1]
  指标: hu=92% self=64% disc=36% big=0% mq=20%

## Round 5 (2026-04-01T01:10:45.184Z)

### 训练指标
- Games: 1000
- 胡牌局: 1780 (178.00%)
- 流局: -780 (-78.00%)
- 血战到最后一人: 647 (36.35%)
- 自摸率(胡牌中): 63.76%
- 捉冲率(胡牌中): 36.24%
- 大牌率(胡牌中): 0.17%
- 门清胡牌率(胡牌中): 20.34%
- Fitness: 12800.0000

### 本轮最佳策略参数
```json
{
  "id": "AI-AK",
  "selfWinChance": 0.7665253481186775,
  "discardHuChance": 0.7,
  "selfWinWildBoost": 0.1,
  "discardHuWildPenalty": 0.35,
  "discardHuMenQingPenalty": 0.12629953519697795,
  "pengChance": 0.95,
  "kongChance": 0.4889073961745143,
  "chowChance": 0.15,
  "anKongChance": 0.9898296447948148,
  "pengWildBoost": 0.06282849518815241,
  "kongWildBoost": 0.1769151208934808,
  "chowWildPenalty": 0.23829782686592177,
  "menqingKeepBonus": 4,
  "meldPenalty": 0.020598493221004818,
  "allPungsPursuit": 0.6735385493357315,
  "pureFlushPursuit": 0.5,
  "halfFlushWeight": 0.6,
  "sevenPairsPursuit": 0.15,
  "allHonorsPursuit": 0.08,
  "allHonorsPungsPursuit": 0.04,
  "qingPengPursuit": 0.2,
  "hunPengPursuit": 0.3442714757536987,
  "windEastKeep": 2,
  "windSouthKeep": 2.4258378922864416,
  "windWestKeep": 1,
  "windNorthKeep": 0.7255064576387434,
  "windGeneralKeep": 1.5,
  "dragonRedKeep": 2.9906644574489887,
  "dragonGreenKeep": 3,
  "dragonWhiteKeep": 2.8925294008197984,
  "dragonGeneralKeep": 2.5,
  "pairWeight": 4.044453129182346,
  "nearWeight": 4.0357824313562745,
  "tripletKeepBonus": 3.899815387646074,
  "terminalPenalty": 1,
  "wildKeepPenalty": 1356.3139207495105,
  "wildBailoutThreshold": 3,
  "wild0Aggression": 0.3360843092809285,
  "wild1Aggression": 0.5,
  "wild2Aggression": 0.6378481052620164,
  "wild3PlusAggression": 0.9,
  "wild1RouteMeldPush": 0.3,
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
  "discardObsWeight": 0.3155416216084052,
  "bao2ClaimPenalty": 0.5522921350775664,
  "bao3AvoidThreshold": 0.7403525491739775,
  "baoSelfClaimCaution": 0.3,
  "wallEarlySpeedPush": 0.2830782739546156,
  "wallMidBalance": 0.45,
  "wallLateDefense": 0.8,
  "oppTingDetection": 0.5,
  "safeTilePriority": 0.6225983733417838,
  "terminalDiscardTingSignal": 0.2917110471347582,
  "wildDiaoKeepBonus": 2.908297060009122,
  "wildDiaoFlushBoost": 1.5004508765207643,
  "wildDiaoPungBoost": 2.5,
  "scoreBehindRiskBoost": 0.9514438541838433,
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
  "anKongAggression": 0.95,
  "minkanAggression": 0.3,
  "kakanAggression": 0.5,
  "robKongAwareness": 0.4936205071870478,
  "noWildDoubleAwareness": 0.5,
  "menqingDoubleAwareness": 0.5325238795068113,
  "flushVsPungsBalance": 0.1,
  "honorVsSuitedBalance": -0.1,
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

### 最大单人亏损局明细（本轮）
- 最大亏损: AI-AK -8000 点（绝对值 8000）
- 局号: 371
- 回合: 26
- 总筹码: 8000
- 百搭: 见手牌
- 回合/全局倍数信息:
  - 全局倍数: xundefined

- 输出该局所有胡牌玩家明细
  - 玩家: AI-老赵
    - 胡牌方式: 自摸
    - 手牌牌面: 发 三条 二条 发 白 四条 发 三条 五条 白 白 一条 四条 一条
    - 门口牌（吃/碰/杠）: (无)
    - 花牌: (无)

- 结算逐笔明细（谁付给谁、倍率和金额）
  - [自摸] AI-AK -> AI-老赵 : 800
  - [自摸] AI-小胖 -> AI-老赵 : 800
  - [自摸] AI-阿水 -> AI-老赵 : 800


--- 最终评估 ---
| 指标 | 值 | 目标 | 达标 |
|------|-----|------|------|
| 胡牌率 | 92.8% | ≥90% | ✅ |
| 流局率 | 7.2% | <10% | ✅ |
| 自摸率 | 62.1% | 40-60% | ❌ |
| 捉冲率 | 37.9% | 40-60% | ❌ |
| 血战率 | 66.6% | >80% | ❌ |
| 大牌率 | 0.2% | 3-8% | ❌ |
| 门清率 | 19.2% | 7-12% | ❌ |

Fitness: -113

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

  【最大赢局】+24000 (倍×4)
    AI-AK 发牌: 七万 一筒 四条 南 三筒 七条 白 四万 发 西 白 四万 七万
    AI-小胖 发牌: 南 八条 一万 七筒 九万 东 九条 北 八万 五万 九条 二万 三筒
    AI-阿水 发牌: 八条 八条 三条 七条 四筒 发 八条 九筒 二筒 九万 七万 七筒 六万
    AI-老赵 发牌: 西 五筒 一筒 六万 二条 东 八万 西 八筒 二万 七筒 一筒 四万
    AI-AK 摸牌: 七条
    AI-AK 出牌: 四条 [手牌: 七万 一筒 南 三筒 七条 白 四万 发 西 白 四万 七万 七条]
    AI-小胖 摸牌: 白
    AI-小胖 出牌: 七筒 [手牌: 南 八条 一万 九万 东 九条 北 八万 五万 九条 二万 三筒 白]
    AI-阿水 摸牌: 九万
    AI-阿水 出牌: 发 [手牌: 八条 八条 三条 七条 四筒 八条 九筒 二筒 九万 七万 七筒 六万 九万]
    AI-老赵 摸牌: 二条
    AI-老赵 出牌: 东 [手牌: 西 五筒 一筒 六万 二条 八万 西 八筒 二万 七筒 一筒 四万 二条]
    AI-AK 摸牌: 北
    AI-AK 出牌: 南 [手牌: 七万 一筒 三筒 七条 白 四万 发 西 白 四万 七万 七条 北]
    AI-小胖 摸牌: 五条
    AI-小胖 出牌: 三筒 [手牌: 南 八条 一万 九万 东 九条 北 八万 五万 九条 二万 白 五条]
    AI-阿水 摸牌: 八万
    AI-阿水 出牌: 三条 [手牌: 八条 八条 七条 四筒 八条 九筒 二筒 九万 七万 七筒 六万 九万 八万]
    AI-老赵 摸牌: 六条
    AI-老赵 出牌: 六条 [手牌: 西 五筒 一筒 六万 二条 八万 西 八筒 二万 七筒 一筒 四万 二条]
    AI-AK 摸牌: 四条
    AI-AK 出牌: 四条 [手牌: 七万 一筒 三筒 七条 白 四万 发 西 白 四万 七万 七条 北]
    AI-小胖 摸牌: 六万
    AI-小胖 出牌: 五条 [手牌: 南 八条 一万 九万 东 九条 北 八万 五万 九条 二万 白 六万]
    AI-阿水 摸牌: 二万
    AI-阿水 出牌: 四筒 [手牌: 八条 八条 七条 八条 九筒 二筒 九万 七万 七筒 六万 九万 八万 二万]
    AI-老赵 摸牌: 三万
    AI-老赵 出牌: 八万 [手牌: 西 五筒 一筒 六万 二条 西 八筒 二万 七筒 一筒 四万 二条 三万]
    AI-AK 摸牌: 五筒
    AI-AK 出牌: 发 [手牌: 七万 一筒 三筒 七条 白 四万 西 白 四万 七万 七条 北 五筒]
    AI-小胖 摸牌: 九筒
    AI-小胖 出牌: 九筒 [手牌: 南 八条 一万 九万 东 九条 北 八万 五万 九条 二万 白 六万]
    AI-阿水 摸牌: 二条
    AI-阿水 出牌: 二筒 [手牌: 八条 八条 七条 八条 九筒 九万 七万 七筒 六万 九万 八万 二万 二条]
    AI-老赵 摸牌: 八筒
    AI-老赵 出牌: 六万 [手牌: 西 五筒 一筒 二条 西 八筒 二万 七筒 一筒 四万 二条 三万 八筒]
    AI-AK 摸牌: 一筒
    AI-AK 出牌: 西 [手牌: 七万 一筒 三筒 七条 白 四万 白 四万 七万 七条 北 五筒 一筒]
    AI-老赵 摸牌: 六条
    AI-老赵 出牌: 六条 [手牌: 五筒 一筒 二条 八筒 七筒 一筒 四万 二条 三万 八筒 四万]
    AI-AK 摸牌: 东
    AI-AK 出牌: 东 [手牌: 七万 一筒 三筒 七条 白 四万 白 四万 七万 七条 北 五筒 一筒]
    AI-小胖 摸牌: 二筒
    AI-小胖 出牌: 二筒 [手牌: 南 八条 一万 九万 东 九条 北 八万 五万 九条 二万 白 六万]
    AI-阿水 摸牌: 北
    AI-阿水 出牌: 二条 [手牌: 八条 八条 七条 八条 九筒 九万 七万 七筒 六万 九万 八万 二万 北]
    AI-老赵 摸牌: 九条
    AI-老赵 出牌: 四万 [手牌: 五筒 一筒 八筒 七筒 一筒 八筒 四万 八筒 九条]
    AI-AK 摸牌: 六条
    AI-AK 出牌: 北 [手牌: 七万 一筒 三筒 七条 白 白 七万 七条 五筒 一筒 六条]
    AI-小胖 摸牌: 五条
    AI-小胖 出牌: 五条 [手牌: 南 八条 一万 九万 东 九条 北 八万 五万 九条 二万 白 六万]
    AI-阿水 摸牌: 三筒
    AI-阿水 出牌: 三筒 [手牌: 八条 八条 七条 八条 九筒 九万 七万 七筒 六万 九万 八万 二万 北]
    AI-老赵 摸牌: 四条
    AI-老赵 出牌: 四条 [手牌: 五筒 一筒 八筒 七筒 一筒 八筒 四万 八筒 九条]
    AI-AK 摸牌: 三万
    AI-AK 出牌: 三万 [手牌: 七万 一筒 三筒 七条 白 白 七万 七条 五筒 一筒 六条]
    AI-小胖 摸牌: 一条
    AI-小胖 出牌: 一条 [手牌: 南 八条 一万 九万 东 九条 北 八万 五万 九条 二万 白 六万]
    AI-阿水 摸牌: 南
    AI-阿水 出牌: 南 [手牌: 八条 八条 七条 八条 九筒 九万 七万 七筒 六万 九万 八万 二万 北]
    AI-老赵 摸牌: 五筒
    AI-老赵 出牌: 四万 [手牌: 五筒 一筒 八筒 七筒 一筒 八筒 八筒 九条 五筒]
    AI-AK 摸牌: 四筒
    AI-AK 出牌: 六条 [手牌: 七万 一筒 三筒 七条 白 白 七万 七条 五筒 一筒 四筒]
    AI-小胖 摸牌: 七万
    AI-小胖 出牌: 南 [手牌: 八条 一万 九万 东 九条 北 八万 五万 九条 二万 白 六万 七万]
    AI-阿水 摸牌: 北
    AI-阿水 出牌: 九筒 [手牌: 八条 八条 七条 八条 九万 七万 七筒 六万 九万 八万 二万 北 北]
    AI-老赵 摸牌: 六筒
    AI-老赵 出牌: 七筒 [手牌: 五筒 一筒 八筒 一筒 八筒 八筒 九条 五筒 六筒]
    AI-AK 摸牌: 七筒
    AI-AK 出牌: 七万 [手牌: 一筒 三筒 七条 白 白 七万 七条 五筒 一筒 四筒 七筒]
    AI-小胖 摸牌: 九万
    AI-小胖 出牌: 东 [手牌: 八条 一万 九万 九条 北 八万 五万 九条 二万 白 六万 七万 九万]
    AI-阿水 摸牌: 六筒
    AI-阿水 出牌: 七筒 [手牌: 八条 八条 七条 八条 九万 七万 六万 九万 八万 二万 北 北 六筒]
    AI-老赵 摸牌: 九筒
    AI-老赵 出牌: 九筒 [手牌: 五筒 一筒 八筒 一筒 八筒 八筒 九条 五筒 六筒]
    AI-AK 摸牌: 三条
    AI-AK 出牌: 三条 [手牌: 一筒 三筒 七条 白 白 七万 七条 五筒 一筒 四筒 七筒]
    AI-小胖 摸牌: 九条
    AI-小胖 出牌: 八条 [手牌: 一万 九万 九条 北 八万 五万 九条 二万 白 六万 七万 九万 九条]
    AI-阿水 摸牌: 一条
    AI-阿水 出牌: 一条 [手牌: 七条 九万 七万 六万 九万 八万 二万 北 北 五万 四筒]
    AI-老赵 摸牌: 八万
    AI-老赵 出牌: 八万 [手牌: 五筒 一筒 八筒 一筒 八筒 八筒 九条 五筒 六筒]
    AI-AK 摸牌: 六筒
    AI-AK 出牌: 七万 [手牌: 一筒 三筒 七条 白 白 七条 五筒 一筒 四筒 七筒 六筒]
    AI-小胖 摸牌: 一万
    AI-小胖 出牌: 白 [手牌: 一万 九万 九条 北 八万 五万 九条 二万 六万 七万 九万 九条 一万]
    AI-AK 摸牌: 中
    AI-AK 出牌: 中 [手牌: 一筒 三筒 七条 七条 五筒 一筒 四筒 七筒 六筒]
    AI-小胖 摸牌: 三筒
    AI-小胖 出牌: 三筒 [手牌: 一万 九万 九条 北 八万 五万 九条 二万 六万 七万 九万 九条 一万]
    AI-阿水 摸牌: 一万
    AI-阿水 出牌: 七条 [手牌: 九万 七万 六万 九万 八万 二万 北 北 五万 四筒 一万]
    AI-AK 摸牌: 二条
    AI-AK 出牌: 二条 [手牌: 一筒 三筒 五筒 一筒 四筒 六筒 四筒]
    AI-小胖 摸牌: 三万
    AI-小胖 出牌: 北 [手牌: 一万 九万 九条 八万 五万 九条 二万 六万 七万 九万 九条 一万 三万]
    AI-阿水 摸牌: 三条
    AI-阿水 出牌: 四筒 [手牌: 九万 七万 六万 九万 八万 二万 五万 一万 三条]
    AI-AK 摸牌: 发
    AI-AK 出牌: 发 [手牌: 一筒 三筒 五筒 一筒 六筒]
    AI-小胖 摸牌: 五万
    AI-小胖 自摸: 一万 九万 九条 八万 五万 九条 二万 六万 七万 九万 九条 一万 三万 五万 [800×3=2400] [手牌14张+副露0]

  【最大输局】-8000 (倍×4)
    AI-AK 发牌: 七万 一筒 四条 南 三筒 七条 白 四万 发 西 白 四万 七万
    AI-小胖 发牌: 南 八条 一万 七筒 九万 东 九条 北 八万 五万 九条 二万 三筒
    AI-阿水 发牌: 八条 八条 三条 七条 四筒 发 八条 九筒 二筒 九万 七万 七筒 六万
    AI-老赵 发牌: 西 五筒 一筒 六万 二条 东 八万 西 八筒 二万 七筒 一筒 四万
    AI-AK 摸牌: 七条
    AI-AK 出牌: 四条 [手牌: 七万 一筒 南 三筒 七条 白 四万 发 西 白 四万 七万 七条]
    AI-小胖 摸牌: 白
    AI-小胖 出牌: 七筒 [手牌: 南 八条 一万 九万 东 九条 北 八万 五万 九条 二万 三筒 白]
    AI-阿水 摸牌: 九万
    AI-阿水 出牌: 发 [手牌: 八条 八条 三条 七条 四筒 八条 九筒 二筒 九万 七万 七筒 六万 九万]
    AI-老赵 摸牌: 二条
    AI-老赵 出牌: 东 [手牌: 西 五筒 一筒 六万 二条 八万 西 八筒 二万 七筒 一筒 四万 二条]
    AI-AK 摸牌: 北
    AI-AK 出牌: 南 [手牌: 七万 一筒 三筒 七条 白 四万 发 西 白 四万 七万 七条 北]
    AI-小胖 摸牌: 五条
    AI-小胖 出牌: 三筒 [手牌: 南 八条 一万 九万 东 九条 北 八万 五万 九条 二万 白 五条]
    AI-阿水 摸牌: 八万
    AI-阿水 出牌: 三条 [手牌: 八条 八条 七条 四筒 八条 九筒 二筒 九万 七万 七筒 六万 九万 八万]
    AI-老赵 摸牌: 六条
    AI-老赵 出牌: 六条 [手牌: 西 五筒 一筒 六万 二条 八万 西 八筒 二万 七筒 一筒 四万 二条]
    AI-AK 摸牌: 四条
    AI-AK 出牌: 四条 [手牌: 七万 一筒 三筒 七条 白 四万 发 西 白 四万 七万 七条 北]
    AI-小胖 摸牌: 六万
    AI-小胖 出牌: 五条 [手牌: 南 八条 一万 九万 东 九条 北 八万 五万 九条 二万 白 六万]
    AI-阿水 摸牌: 二万
    AI-阿水 出牌: 四筒 [手牌: 八条 八条 七条 八条 九筒 二筒 九万 七万 七筒 六万 九万 八万 二万]
    AI-老赵 摸牌: 三万
    AI-老赵 出牌: 八万 [手牌: 西 五筒 一筒 六万 二条 西 八筒 二万 七筒 一筒 四万 二条 三万]
    AI-AK 摸牌: 五筒
    AI-AK 出牌: 发 [手牌: 七万 一筒 三筒 七条 白 四万 西 白 四万 七万 七条 北 五筒]
    AI-小胖 摸牌: 九筒
    AI-小胖 出牌: 九筒 [手牌: 南 八条 一万 九万 东 九条 北 八万 五万 九条 二万 白 六万]
    AI-阿水 摸牌: 二条
    AI-阿水 出牌: 二筒 [手牌: 八条 八条 七条 八条 九筒 九万 七万 七筒 六万 九万 八万 二万 二条]
    AI-老赵 摸牌: 八筒
    AI-老赵 出牌: 六万 [手牌: 西 五筒 一筒 二条 西 八筒 二万 七筒 一筒 四万 二条 三万 八筒]
    AI-AK 摸牌: 一筒
    AI-AK 出牌: 西 [手牌: 七万 一筒 三筒 七条 白 四万 白 四万 七万 七条 北 五筒 一筒]
    AI-老赵 摸牌: 六条
    AI-老赵 出牌: 六条 [手牌: 五筒 一筒 二条 八筒 七筒 一筒 四万 二条 三万 八筒 四万]
    AI-AK 摸牌: 东
    AI-AK 出牌: 东 [手牌: 七万 一筒 三筒 七条 白 四万 白 四万 七万 七条 北 五筒 一筒]
    AI-小胖 摸牌: 二筒
    AI-小胖 出牌: 二筒 [手牌: 南 八条 一万 九万 东 九条 北 八万 五万 九条 二万 白 六万]
    AI-阿水 摸牌: 北
    AI-阿水 出牌: 二条 [手牌: 八条 八条 七条 八条 九筒 九万 七万 七筒 六万 九万 八万 二万 北]
    AI-老赵 摸牌: 九条
    AI-老赵 出牌: 四万 [手牌: 五筒 一筒 八筒 七筒 一筒 八筒 四万 八筒 九条]
    AI-AK 摸牌: 六条
    AI-AK 出牌: 北 [手牌: 七万 一筒 三筒 七条 白 白 七万 七条 五筒 一筒 六条]
    AI-小胖 摸牌: 五条
    AI-小胖 出牌: 五条 [手牌: 南 八条 一万 九万 东 九条 北 八万 五万 九条 二万 白 六万]
    AI-阿水 摸牌: 三筒
    AI-阿水 出牌: 三筒 [手牌: 八条 八条 七条 八条 九筒 九万 七万 七筒 六万 九万 八万 二万 北]
    AI-老赵 摸牌: 四条
    AI-老赵 出牌: 四条 [手牌: 五筒 一筒 八筒 七筒 一筒 八筒 四万 八筒 九条]
    AI-AK 摸牌: 三万
    AI-AK 出牌: 三万 [手牌: 七万 一筒 三筒 七条 白 白 七万 七条 五筒 一筒 六条]
    AI-小胖 摸牌: 一条
    AI-小胖 出牌: 一条 [手牌: 南 八条 一万 九万 东 九条 北 八万 五万 九条 二万 白 六万]
    AI-阿水 摸牌: 南
    AI-阿水 出牌: 南 [手牌: 八条 八条 七条 八条 九筒 九万 七万 七筒 六万 九万 八万 二万 北]
    AI-老赵 摸牌: 五筒
    AI-老赵 出牌: 四万 [手牌: 五筒 一筒 八筒 七筒 一筒 八筒 八筒 九条 五筒]
    AI-AK 摸牌: 四筒
    AI-AK 出牌: 六条 [手牌: 七万 一筒 三筒 七条 白 白 七万 七条 五筒 一筒 四筒]
    AI-小胖 摸牌: 七万
    AI-小胖 出牌: 南 [手牌: 八条 一万 九万 东 九条 北 八万 五万 九条 二万 白 六万 七万]
    AI-阿水 摸牌: 北
    AI-阿水 出牌: 九筒 [手牌: 八条 八条 七条 八条 九万 七万 七筒 六万 九万 八万 二万 北 北]
    AI-老赵 摸牌: 六筒
    AI-老赵 出牌: 七筒 [手牌: 五筒 一筒 八筒 一筒 八筒 八筒 九条 五筒 六筒]
    AI-AK 摸牌: 七筒
    AI-AK 出牌: 七万 [手牌: 一筒 三筒 七条 白 白 七万 七条 五筒 一筒 四筒 七筒]
    AI-小胖 摸牌: 九万
    AI-小胖 出牌: 东 [手牌: 八条 一万 九万 九条 北 八万 五万 九条 二万 白 六万 七万 九万]
    AI-阿水 摸牌: 六筒
    AI-阿水 出牌: 七筒 [手牌: 八条 八条 七条 八条 九万 七万 六万 九万 八万 二万 北 北 六筒]
    AI-老赵 摸牌: 九筒
    AI-老赵 出牌: 九筒 [手牌: 五筒 一筒 八筒 一筒 八筒 八筒 九条 五筒 六筒]
    AI-AK 摸牌: 三条
    AI-AK 出牌: 三条 [手牌: 一筒 三筒 七条 白 白 七万 七条 五筒 一筒 四筒 七筒]
    AI-小胖 摸牌: 九条
    AI-小胖 出牌: 八条 [手牌: 一万 九万 九条 北 八万 五万 九条 二万 白 六万 七万 九万 九条]
    AI-阿水 摸牌: 一条
    AI-阿水 出牌: 一条 [手牌: 七条 九万 七万 六万 九万 八万 二万 北 北 五万 四筒]
    AI-老赵 摸牌: 八万
    AI-老赵 出牌: 八万 [手牌: 五筒 一筒 八筒 一筒 八筒 八筒 九条 五筒 六筒]
    AI-AK 摸牌: 六筒
    AI-AK 出牌: 七万 [手牌: 一筒 三筒 七条 白 白 七条 五筒 一筒 四筒 七筒 六筒]
    AI-小胖 摸牌: 一万
    AI-小胖 出牌: 白 [手牌: 一万 九万 九条 北 八万 五万 九条 二万 六万 七万 九万 九条 一万]
    AI-AK 摸牌: 中
    AI-AK 出牌: 中 [手牌: 一筒 三筒 七条 七条 五筒 一筒 四筒 七筒 六筒]
    AI-小胖 摸牌: 三筒
    AI-小胖 出牌: 三筒 [手牌: 一万 九万 九条 北 八万 五万 九条 二万 六万 七万 九万 九条 一万]
    AI-阿水 摸牌: 一万
    AI-阿水 出牌: 七条 [手牌: 九万 七万 六万 九万 八万 二万 北 北 五万 四筒 一万]
    AI-AK 摸牌: 二条
    AI-AK 出牌: 二条 [手牌: 一筒 三筒 五筒 一筒 四筒 六筒 四筒]
    AI-小胖 摸牌: 三万
    AI-小胖 出牌: 北 [手牌: 一万 九万 九条 八万 五万 九条 二万 六万 七万 九万 九条 一万 三万]
    AI-阿水 摸牌: 三条
    AI-阿水 出牌: 四筒 [手牌: 九万 七万 六万 九万 八万 二万 五万 一万 三条]
    AI-AK 摸牌: 发
    AI-AK 出牌: 发 [手牌: 一筒 三筒 五筒 一筒 六筒]
    AI-小胖 摸牌: 五万
    AI-小胖 自摸: 一万 九万 九条 八万 五万 九条 二万 六万 七万 九万 九条 一万 三万 五万 [800×3=2400] [手牌14张+副露0]