# 长清阁麻将 全员基线收敛训练日志

- 创建时间: 2026-04-01T05:31:54.984Z
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
| 胡牌率 | 87.3% | ≥90% |
| 流局率 | 12.7% | <10% |
| 自摸率 | 50.1% | 40-60% |
| 捉冲率 | 49.9% | 40-60% |
| 血战率 | 52.9% | >80% |
| 大牌率 | 0.3% | 3-8% |
| 门清率 | 14.8% | 7-12% |
| Fitness | -187.1 | ↑ |

### 第1轮 (强度=1.0, 停滞=0)
  C1: fitness=-261 hu=83% self=51% disc=49% draws=169
  C2: fitness=-225 hu=84% self=53% disc=47% draws=157
  C3: fitness=-229 hu=84% self=54% disc=46% draws=162
  C4: fitness=-250 hu=82% self=52% disc=48% draws=181
  C5: fitness=-240 hu=84% self=50% disc=50% draws=159
  Best: -225 (overall: -187) [plateau: 1]
  指标: hu=84% self=53% disc=47% big=0% mq=17%

## Round 1 (2026-04-01T05:37:15.273Z)

### 训练指标
- Games: 1000
- 胡牌局: 843 (84.30%)
- 流局: 157 (15.70%)
- 血战到最后一人: 448 (53.14%)
- 平均回合: 16.54
- 平均总筹码: 112.08
- 自摸率(胡牌中): 53.14%
- 大牌率(胡牌中): 0.14%
- 门清胡牌率(胡牌中): 16.94%
- 胜者平均最终点: 6.79
- Fitness: -225.3335

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
  "dragonWhiteKeep": 3.352152775351061,
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
  "wild3PlusAggression": 0.9629154425440799,
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
  "wild2BaoPush": 0.4338665317955609,
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
  "wildDiaoFlushBoost": 1.273380613960407,
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
#### 最大赢局
- 最大赢利: AI-小胖 12000 点（绝对值 12000）
- 局号: 150
- 回合: 71
- 总筹码: 2400
- 百搭: wan-1
- 回合/全局倍数信息:
  - 骰子点数: 1 + 6
  - 骰子倍数（清晰明了）: x1
  - 全局倍数: x2

- 输出该局所有胡牌玩家明细
  - 玩家: AI-小胖
    - 胡牌方式: 自摸
    - 牌型/基础番/最终点: 清一色 / 10 / 40
    - 手牌牌面: 五条 四条 一万 七条 一万 三条 三条 二条 六条 二条 八条 四条
    - 门口牌（吃/碰/杠）: 碰:八条 八条 八条
    - 花牌: 春 菊

- 三口/四口关系
  - AI-阿水 <-> AI-AK: 三口 (A->B:3, B->A:0)

- 结算逐笔明细（谁付给谁、倍率和金额）
  - (无)

---

#### 最大输局
- 最大亏损: AI-AK -4000 点（绝对值 4000）
- 局号: 150
- 回合: 71
- 总筹码: 2400
- 百搭: wan-1
- 回合/全局倍数信息:
  - 骰子点数: 1 + 6
  - 骰子倍数（清晰明了）: x1
  - 全局倍数: x2

- 输出该局所有胡牌玩家明细
  - 玩家: AI-小胖
    - 胡牌方式: 自摸
    - 牌型/基础番/最终点: 清一色 / 10 / 40
    - 手牌牌面: 五条 四条 一万 七条 一万 三条 三条 二条 六条 二条 八条 四条
    - 门口牌（吃/碰/杠）: 碰:八条 八条 八条
    - 花牌: 春 菊

- 三口/四口关系
  - AI-阿水 <-> AI-AK: 三口 (A->B:3, B->A:0)

- 结算逐笔明细（谁付给谁、倍率和金额）
  - (无)

- 高倍数局数(骰子>=2): 76


### 第2轮 (强度=1.0, 停滞=1)
  C1: fitness=-252 hu=83% self=51% disc=49% draws=168
  C2: fitness=-236 hu=85% self=52% disc=48% draws=153
  C3: fitness=-214 hu=85% self=53% disc=47% draws=150
  C4: fitness=-271 hu=82% self=52% disc=48% draws=180
  C5: fitness=-224 hu=86% self=53% disc=47% draws=141
  Best: -214 (overall: -187) [plateau: 2]
  指标: hu=85% self=53% disc=47% big=0% mq=16%

## Round 2 (2026-04-01T05:41:49.717Z)

### 训练指标
- Games: 1000
- 胡牌局: 850 (85.00%)
- 流局: 150 (15.00%)
- 血战到最后一人: 452 (53.18%)
- 平均回合: 16.40
- 平均总筹码: 114.76
- 自摸率(胡牌中): 53.36%
- 大牌率(胡牌中): 0.07%
- 门清胡牌率(胡牌中): 15.74%
- 胜者平均最终点: 7.05
- Fitness: -213.7071

### 本轮最佳策略参数
```json
{
  "id": "AI-AK",
  "selfWinChance": 0.7665253481186775,
  "discardHuChance": 0.7,
  "selfWinWildBoost": 0.1,
  "discardHuWildPenalty": 0.35,
  "discardHuMenQingPenalty": 0.13423119574685036,
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
  "hunPengPursuit": 0.28871395354191826,
  "windEastKeep": 2,
  "windSouthKeep": 2.4258378922864416,
  "windWestKeep": 1,
  "windNorthKeep": 0.7255064576387434,
  "windGeneralKeep": 1.5,
  "dragonRedKeep": 3.2916529588266354,
  "dragonGreenKeep": 3,
  "dragonWhiteKeep": 2.9818362851231037,
  "dragonGeneralKeep": 2.370265661575299,
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
  "wildDiaoFlushBoost": 1.273380613960407,
  "wildDiaoPungBoost": 2.3912208122320036,
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
  "anKongAggression": 0.8860576636993159,
  "minkanAggression": 0.3,
  "kakanAggression": 0.5,
  "robKongAwareness": 0.4936205071870478,
  "noWildDoubleAwareness": 0.5,
  "menqingDoubleAwareness": 0.5325238795068113,
  "flushVsPungsBalance": 0.1732826368669536,
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
#### 最大赢局
- 最大赢利: AI-阿水 12000 点（绝对值 12000）
- 局号: 622
- 回合: 12
- 总筹码: 2400
- 百搭: dots-4
- 回合/全局倍数信息:
  - 骰子点数: 2 + 4
  - 骰子倍数（清晰明了）: x1
  - 全局倍数: x4

- 输出该局所有胡牌玩家明细
  - 玩家: AI-阿水
    - 胡牌方式: 自摸
    - 牌型/基础番/最终点: 普通胡 / 5 / 40
    - 手牌牌面: 三万 六万 四万 四万 二万 二万 九筒 八筒 七筒 六筒 五万 六筒
    - 门口牌（吃/碰/杠）: 碰:中 中 中
    - 花牌: 梅

- 结算逐笔明细（谁付给谁、倍率和金额）
  - [自摸] AI-AK -> AI-阿水 : 400
  - [自摸] AI-小胖 -> AI-阿水 : 400
  - [自摸] AI-老赵 -> AI-阿水 : 400

---

#### 最大输局
- 最大亏损: AI-阿水 -4800 点（绝对值 4800）
- 局号: 783
- 回合: 6
- 总筹码: 960
- 百搭: wan-2
- 回合/全局倍数信息:
  - 骰子点数: 4 + 1
  - 骰子倍数（清晰明了）: x1
  - 全局倍数: x4

- 输出该局所有胡牌玩家明细
  - 玩家: AI-小胖
    - 胡牌方式: 放冲 (来自 AI-阿水)
    - 牌型/基础番/最终点: 普通胡 / 3 / 48
    - 手牌牌面: 四条 六条 三条 八万 三筒 六万 五万 二条 二筒 七万 四筒 九万 七万
    - 门口牌（吃/碰/杠）: (无)
    - 花牌: 兰

- 结算逐笔明细（谁付给谁、倍率和金额）
  - [放炮] AI-阿水 -> AI-小胖 : 480

- 高倍数局数(骰子>=2): 57


### 第3轮 (强度=1.8, 停滞=2)
  C1: fitness=-263 hu=82% self=52% disc=48% draws=180
  C2: fitness=-245 hu=83% self=50% disc=50% draws=171
  C3: fitness=-245 hu=84% self=53% disc=47% draws=165
  C4: fitness=-246 hu=84% self=51% disc=49% draws=158
  C5: fitness=-265 hu=82% self=52% disc=48% draws=182
  Best: -245 (overall: -187) [plateau: 3]
  指标: hu=83% self=50% disc=50% big=0% mq=17%

## Round 3 (2026-04-01T05:46:21.370Z)

### 训练指标
- Games: 1000
- 胡牌局: 829 (82.90%)
- 流局: 171 (17.10%)
- 血战到最后一人: 432 (52.11%)
- 平均回合: 15.22
- 平均总筹码: 106.60
- 自摸率(胡牌中): 49.85%
- 大牌率(胡牌中): 0.22%
- 门清胡牌率(胡牌中): 17.13%
- 胜者平均最终点: 6.95
- Fitness: -244.8649

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
  "chowChance": 0.14236405609300032,
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
  "qingPengPursuit": 0.06679945117146574,
  "hunPengPursuit": 0.3442714757536987,
  "windEastKeep": 2,
  "windSouthKeep": 2.4258378922864416,
  "windWestKeep": 1,
  "windNorthKeep": 0.7255064576387434,
  "windGeneralKeep": 1.5,
  "dragonRedKeep": 3.2916529588266354,
  "dragonGreenKeep": 3,
  "dragonWhiteKeep": 2.9818362851231037,
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
  "wild1MenqingKeep": 2.612596443233291,
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
  "wildDiaoFlushBoost": 1.273380613960407,
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
  "multHighHand6AllPungs": 0.12459815890403991,
  "multHighHand6HalfFlush": 0.55,
  "multHighHand6PureFlush": 0.45,
  "multLowHand7AllPungs": 0.24041390726832135,
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
#### 最大赢局
- 最大赢利: AI-老赵 12000 点（绝对值 12000）
- 局号: 875
- 回合: 60
- 总筹码: 2400
- 百搭: dots-9
- 回合/全局倍数信息:
  - 骰子点数: 6 + 5
  - 骰子倍数（清晰明了）: x1
  - 全局倍数: x1

- 输出该局所有胡牌玩家明细
  - 玩家: AI-老赵
    - 胡牌方式: 自摸
    - 牌型/基础番/最终点: 清一色 / 10 / 40
    - 手牌牌面: 八条 九条 六条 二条 九条 七条 五条 二条 六条 九条 六条 二条 七条 六条
    - 门口牌（吃/碰/杠）: (无)
    - 花牌: (无)

- 三口/四口关系
  - AI-AK <-> AI-小胖: 三口 (A->B:3, B->A:2)

- 结算逐笔明细（谁付给谁、倍率和金额）
  - [自摸] AI-AK -> AI-老赵 : 400
  - [自摸] AI-小胖 -> AI-老赵 : 400
  - [自摸] AI-阿水 -> AI-老赵 : 400

---

#### 最大输局
- 最大亏损: AI-AK -4800 点（绝对值 4800）
- 局号: 698
- 回合: 18
- 总筹码: 960
- 百搭: tiao-3
- 回合/全局倍数信息:
  - 骰子点数: 2 + 4
  - 骰子倍数（清晰明了）: x1
  - 全局倍数: x4

- 输出该局所有胡牌玩家明细
  - 玩家: AI-小胖
    - 胡牌方式: 放冲 (来自 AI-AK)
    - 牌型/基础番/最终点: 普通胡 / 3 / 48
    - 手牌牌面: 五筒 三筒 二筒 六筒 七万 八万 二万 二万 五万 七筒 四筒 六万 九万
    - 门口牌（吃/碰/杠）: (无)
    - 花牌: 夏

- 结算逐笔明细（谁付给谁、倍率和金额）
  - [放炮] AI-AK -> AI-小胖 : 480

- 高倍数局数(骰子>=2): 59


### 第4轮 (强度=1.8, 停滞=3)
  C1: fitness=-233 hu=85% self=51% disc=49% draws=152
  C2: fitness=-267 hu=83% self=53% disc=47% draws=172
  C3: fitness=-229 hu=85% self=52% disc=48% draws=153
  C4: fitness=-231 hu=84% self=52% disc=48% draws=159
  C5: fitness=-223 hu=85% self=52% disc=48% draws=152
  Best: -223 (overall: -187) [plateau: 4]
  指标: hu=85% self=52% disc=48% big=0% mq=19%

## Round 4 (2026-04-01T05:50:57.272Z)

### 训练指标
- Games: 1000
- 胡牌局: 848 (84.80%)
- 流局: 152 (15.20%)
- 血战到最后一人: 461 (54.36%)
- 平均回合: 17.65
- 平均总筹码: 123.02
- 自摸率(胡牌中): 52.44%
- 大牌率(胡牌中): 0.07%
- 门清胡牌率(胡牌中): 18.97%
- 胜者平均最终点: 6.97
- Fitness: -222.6868

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
  "pureFlushPursuit": 0.4500310034540002,
  "halfFlushWeight": 0.6,
  "sevenPairsPursuit": 0.15,
  "allHonorsPursuit": 0.020743140089814698,
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
  "wild2MenqingKeep": 0.7798863810402722,
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
  "safeTilePriority": 0.6113747797875341,
  "terminalDiscardTingSignal": 0.2917110471347582,
  "wildDiaoKeepBonus": 2.908297060009122,
  "wildDiaoFlushBoost": 1.273380613960407,
  "wildDiaoPungBoost": 2.5,
  "scoreBehindRiskBoost": 1.0064560779164102,
  "scoreLeadDefenseBoost": 0.826932401215011,
  "hand5RouteBias": 0.2590273941175259,
  "hand6RouteBias": 0.6,
  "hand7RouteBias": 0.9,
  "multLowHand5AllPungs": 0.4756186421163208,
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
#### 最大赢局
- 最大赢利: AI-AK 9600 点（绝对值 9600）
- 局号: 219
- 回合: 40
- 总筹码: 1920
- 百搭: wan-7
- 回合/全局倍数信息:
  - 骰子点数: 6 + 5
  - 骰子倍数（清晰明了）: x1
  - 全局倍数: x4

- 输出该局所有胡牌玩家明细
  - 玩家: AI-AK
    - 胡牌方式: 自摸
    - 牌型/基础番/最终点: 普通胡 / 4 / 32
    - 手牌牌面: 九条 四筒 六条 七万 七条 四筒 九条 四条 三条 二条 七万 一筒 一筒 八条
    - 门口牌（吃/碰/杠）: (无)
    - 花牌: 冬 春

- 结算逐笔明细（谁付给谁、倍率和金额）
  - [自摸] AI-小胖 -> AI-AK : 320
  - [自摸] AI-阿水 -> AI-AK : 320
  - [自摸] AI-老赵 -> AI-AK : 320

---

#### 最大输局
- 最大亏损: AI-老赵 -9600 点（绝对值 9600）
- 局号: 752
- 回合: 59
- 总筹码: 1920
- 百搭: tiao-5
- 回合/全局倍数信息:
  - 骰子点数: 2 + 2
  - 骰子倍数（清晰明了）: x2
  - 全局倍数: x4

- 输出该局所有胡牌玩家明细
  - 玩家: AI-AK
    - 胡牌方式: 放冲 (来自 AI-老赵)
    - 牌型/基础番/最终点: 普通胡 / 6 / 96
    - 手牌牌面: 二万 四万 九条 三万 四条 三条 二条 一万 九条 二万 二万 四万 四万
    - 门口牌（吃/碰/杠）: (无)
    - 花牌: 春 兰 菊 竹

- 结算逐笔明细（谁付给谁、倍率和金额）
  - [放炮] AI-老赵 -> AI-AK : 960

- 高倍数局数(骰子>=2): 72


### 第5轮 (强度=2.5, 停滞=4)
  C1: fitness=-235 hu=85% self=53% disc=47% draws=151
  C2: fitness=-263 hu=82% self=52% disc=48% draws=181
  C3: fitness=-221 hu=85% self=51% disc=49% draws=147
  C4: fitness=-237 hu=85% self=53% disc=47% draws=154
  C5: fitness=-240 hu=85% self=53% disc=47% draws=155
  Best: -221 (overall: -187) [plateau: 5]
  指标: hu=85% self=51% disc=49% big=0% mq=16%

## Round 5 (2026-04-01T05:55:31.119Z)

### 训练指标
- Games: 1000
- 胡牌局: 853 (85.30%)
- 流局: 147 (14.70%)
- 血战到最后一人: 437 (51.23%)
- 平均回合: 16.48
- 平均总筹码: 109.00
- 自摸率(胡牌中): 51.35%
- 大牌率(胡牌中): 0.21%
- 门清胡牌率(胡牌中): 15.95%
- 胜者平均最终点: 6.65
- Fitness: -220.5945

### 本轮最佳策略参数
```json
{
  "id": "AI-AK",
  "selfWinChance": 0.7665253481186775,
  "discardHuChance": 0.7,
  "selfWinWildBoost": 0.1,
  "discardHuWildPenalty": 0.32844181252024035,
  "discardHuMenQingPenalty": 0.12,
  "pengChance": 0.95,
  "kongChance": 0.4889073961745143,
  "chowChance": 0.15,
  "anKongChance": 0.9325725485503338,
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
  "wildDiaoFlushBoost": 1.273380613960407,
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
  "multHighHand7AllPungs": 0.0755891094260002,
  "multHighHand7HalfFlush": 0.4,
  "multHighHand7PureFlush": 0.7,
  "multHighHonorStart": 0.32360921746775334,
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
#### 最大赢局
- 最大赢利: AI-AK 12000 点（绝对值 12000）
- 局号: 594
- 回合: 29
- 总筹码: 2400
- 百搭: tiao-7
- 回合/全局倍数信息:
  - 骰子点数: 4 + 6
  - 骰子倍数（清晰明了）: x1
  - 全局倍数: x2

- 输出该局所有胡牌玩家明细
  - 玩家: AI-AK
    - 胡牌方式: 自摸
    - 牌型/基础番/最终点: 普通胡 / 5 / 40
    - 手牌牌面: 六万 六万 四条 三万 四筒 四筒 四条 八万 九万 四万 四条 二万 七万 四条
    - 门口牌（吃/碰/杠）: (无)
    - 花牌: 梅

- 结算逐笔明细（谁付给谁、倍率和金额）
  - [自摸] AI-小胖 -> AI-AK : 400
  - [自摸] AI-阿水 -> AI-AK : 400
  - [自摸] AI-老赵 -> AI-AK : 400

---

#### 最大输局
- 最大亏损: AI-阿水 -5600 点（绝对值 5600）
- 局号: 407
- 回合: 24
- 总筹码: 1120
- 百搭: dots-7
- 回合/全局倍数信息:
  - 骰子点数: 2 + 3
  - 骰子倍数（清晰明了）: x1
  - 全局倍数: x4

- 输出该局所有胡牌玩家明细
  - 玩家: AI-小胖
    - 胡牌方式: 放冲 (来自 AI-阿水)
    - 牌型/基础番/最终点: 普通胡 / 7 / 56
    - 手牌牌面: 六万 五万 六万 三万 六万 三万 五万 七万 四万
    - 门口牌（吃/碰/杠）: 碰:白 白 白 ; 碰:北 北 北
    - 花牌: 夏 菊

- 结算逐笔明细（谁付给谁、倍率和金额）
  - [放炮] AI-阿水 -> AI-小胖 : 560

- 高倍数局数(骰子>=2): 72


--- 最终评估 ---
| 指标 | 值 | 目标 | 达标 |
|------|-----|------|------|
| 胡牌率 | 84.9% | ≥90% | ❌ |
| 流局率 | 15.1% | <10% | ❌ |
| 自摸率 | 49.0% | 40-60% | ✅ |
| 捉冲率 | 51.0% | 40-60% | ✅ |
| 血战率 | 54.7% | >80% | ❌ |
| 大牌率 | 0.4% | 3-8% | ❌ |
| 门清率 | 16.9% | 7-12% | ❌ |

Fitness: -211

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

  【最大赢局】+14400 (倍×4)
    AI-AK 自摸: 二条 五筒 四条 一条 七条 三条 六条 五筒 二条 六条 西 西 七条 西 [480×3=1440] [手牌14张+副露0]

  【最大输局】-4800 (倍×4)
    AI-AK 自摸: 二条 五筒 四条 一条 七条 三条 六条 五筒 二条 六条 西 西 七条 西 [480×3=1440] [手牌14张+副露0]