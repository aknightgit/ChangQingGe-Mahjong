# 长清阁麻将 全员基线收敛训练日志

- 创建时间: 2026-04-01T01:52:39.903Z
- 训练脚本: train-baseline.ts
- Config: 2 rounds × 20 games = 40 total
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
| 胡牌率 | 80.0% | ≥90% |
| 流局率 | 20.0% | <10% |
| 自摸率 | 51.6% | 40-60% |
| 捉冲率 | 48.4% | 40-60% |
| 血战率 | 68.8% | >80% |
| 大牌率 | 0.0% | 3-8% |
| 门清率 | 16.1% | 7-12% |
| Fitness | -187.8 | ↑ |

### 第1轮 (强度=1.0, 停滞=0)
  C1: fitness=-79 hu=90% self=48% disc=52% draws=2
  C2: fitness=0 hu=95% self=58% disc=42% draws=1
  C3: fitness=-131 hu=95% self=64% disc=36% draws=1
  C4: fitness=-191 hu=95% self=67% disc=33% draws=1
  C5: fitness=-168 hu=80% self=67% disc=33% draws=4
  ★ NEW BEST! fitness=0
  指标: hu=95% self=58% disc=42% big=0% mq=13%

## Round 1 (2026-04-01T01:52:50.043Z)

### 训练指标
- Games: 20
- 胡牌局: 38 (190.00%)
- 流局: -18 (-90.00%)
- 血战到最后一人: 15 (39.47%)
- 平均回合: 21.35
- 平均总筹码: 164.00
- 自摸率(胡牌中): 57.89%
- 大牌率(胡牌中): 0.00%
- 门清胡牌率(胡牌中): 13.16%
- 胜者平均最终点: 8.00
- Fitness: 0.1053

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
  "baoSelfClaimCaution": 0.34518241257548415,
  "wallEarlySpeedPush": 0.2830782739546156,
  "wallMidBalance": 0.45,
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
- 最大亏损: AI-小胖 -4000 点（绝对值 4000）
- 局号: 9
- 原因: 胡牌
- 回合: 47
- 总筹码: 800
- 百搭: tiao-4
- 回合/全局倍数信息:
  - 骰子点数: 5 + 4
  - 骰子倍数（清晰明了）: x1
  - 全局倍数: x4

- 输出该局所有胡牌玩家明细
  - 玩家: AI-AK
    - 胡牌方式: 放冲 (来自 AI-小胖)
    - 牌型/基础番/最终点: 普通胡 / 5 / 40
    - 手牌牌面: 北 北 七万 七万 五万 七万 北 六万 九万 五万 九万
    - 门口牌（吃/碰/杠）: 碰:二万 二万 二万
    - 花牌: 春 梅 秋

- 结算逐笔明细（谁付给谁、倍率和金额）
  - [放炮] AI-小胖 -> AI-AK : 400

- 高倍数局数(骰子>=2): 1


### 第2轮 (强度=1.0, 停滞=0)
  C1: fitness=-53 hu=95% self=58% disc=42% draws=1
  C2: fitness=-109 hu=90% self=58% disc=42% draws=2
  C3: fitness=-181 hu=100% self=40% disc=60% draws=0
  C4: fitness=-278 hu=95% self=69% disc=31% draws=1
  C5: fitness=-111 hu=90% self=61% disc=39% draws=2
  Best: -53 (overall: 0) [plateau: 1]
  指标: hu=95% self=58% disc=42% big=0% mq=26%

## Round 2 (2026-04-01T01:52:57.965Z)

### 训练指标
- Games: 20
- 胡牌局: 38 (190.00%)
- 流局: -18 (-90.00%)
- 血战到最后一人: 15 (39.47%)
- 平均回合: 29.60
- 平均总筹码: 216.00
- 自摸率(胡牌中): 57.89%
- 大牌率(胡牌中): 0.00%
- 门清胡牌率(胡牌中): 26.32%
- 胜者平均最终点: 7.85
- Fitness: -52.5263

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
  "dragonWhiteKeep": 2.8925294008197984,
  "dragonGeneralKeep": 2.231251119006499,
  "pairWeight": 3.9940318537360784,
  "nearWeight": 4.0357824313562745,
  "tripletKeepBonus": 3.899815387646074,
  "terminalPenalty": 1,
  "wildKeepPenalty": 1184.7152586283885,
  "wildBailoutThreshold": 3,
  "wild0Aggression": 0.3360843092809285,
  "wild1Aggression": 0.5,
  "wild2Aggression": 0.6378481052620164,
  "wild3PlusAggression": 0.9,
  "wild1RouteMeldPush": 0.3,
  "wild2RouteMeldPush": 0.6,
  "wild3RouteMeldPush": 0.7703573414057017,
  "wild1RouteFlushBoost": 0.2846093688454401,
  "wild2RouteFlushBoost": 0.3,
  "wild3RouteFlushBoost": 0.47751980846352926,
  "wild1RouteHonorsBoost": 0.039815781362136766,
  "wild2RouteHonorsBoost": 0.2399409943495108,
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
  "wild2BaoPush": 0.6126198638699716,
  "wild3BaoPush": 0.8,
  "multLowSpeedBias": 0.5,
  "multHighValueBias": 0.7829166927551453,
  "discardObsFlushBoost": 0.4794246495925073,
  "discardObsWeight": 0.3155416216084052,
  "bao2ClaimPenalty": 0.5522921350775664,
  "bao3AvoidThreshold": 0.7403525491739775,
  "baoSelfClaimCaution": 0.34518241257548415,
  "wallEarlySpeedPush": 0.2830782739546156,
  "wallMidBalance": 0.45,
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
- 最大亏损: AI-AK -1600 点（绝对值 1600）
- 局号: 19
- 原因: 胡牌
- 回合: 36
- 总筹码: 960
- 百搭: tiao-5
- 回合/全局倍数信息:
  - 骰子点数: 2 + 1
  - 骰子倍数（清晰明了）: x1
  - 全局倍数: x2

- 输出该局所有胡牌玩家明细
  - 玩家: AI-阿水
    - 胡牌方式: 自摸
    - 牌型/基础番/最终点: 普通胡 / 4 / 16
    - 手牌牌面: 五条 七万 六条 七条 五条 九万 八万 七万 四条 四条 一条 二条 五万 六万
    - 门口牌（吃/碰/杠）: (无)
    - 花牌: 春 冬

- 结算逐笔明细（谁付给谁、倍率和金额）
  - [自摸] AI-AK -> AI-阿水 : 160
  - [自摸] AI-小胖 -> AI-阿水 : 160
  - [自摸] AI-老赵 -> AI-阿水 : 160

- 高倍数局数(骰子>=2): 1


--- 最终评估 ---
| 指标 | 值 | 目标 | 达标 |
|------|-----|------|------|
| 胡牌率 | 92.8% | ≥90% | ✅ |
| 流局率 | 7.2% | <10% | ✅ |
| 自摸率 | 55.6% | 40-60% | ✅ |
| 捉冲率 | 44.4% | 40-60% | ✅ |
| 血战率 | 66.8% | >80% | ❌ |
| 大牌率 | 0.1% | 3-8% | ❌ |
| 门清率 | 17.9% | 7-12% | ❌ |

Fitness: -90

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

  【最大赢局】+24000 (倍×2)
    AI-AK 摸牌: 八万
    AI-AK 出牌: 七条 [手牌: 四筒 白 六万 四条 四条 二筒 六筒 九万 九筒 二筒 四筒 六筒 八万]
    AI-小胖 摸牌: 九条
    AI-小胖 出牌: 发 [手牌: 八筒 白 北 七万 七条 北 二万 六条 东 五条 白 东 九条]
    AI-阿水 摸牌: 四万
    AI-阿水 出牌: 南 [手牌: 中 中 西 七筒 五万 五条 七万 七万 东 六条 八条 八条 四万]
    AI-老赵 摸牌: 四万
    AI-老赵 出牌: 南 [手牌: 八筒 四万 二条 五条 白 四条 八万 六筒 六万 二筒 北 八万 四万]
    AI-AK 摸牌: 二条
    AI-AK 出牌: 白 [手牌: 四筒 六万 四条 四条 二筒 六筒 九万 九筒 二筒 四筒 六筒 八万 二条]
    AI-小胖 摸牌: 一万
    AI-小胖 出牌: 八筒 [手牌: 北 七万 七条 北 二万 六条 东 五条 东 九条 一万]
    AI-阿水 摸牌: 五筒
    AI-阿水 出牌: 东 [手牌: 中 中 西 七筒 五万 五条 七万 七万 六条 八条 八条 四万 五筒]
    AI-小胖 摸牌: 发
    AI-小胖 出牌: 发 [手牌: 北 七条 北 二万 六条 五条 九条 一万 三条]
    AI-阿水 摸牌: 六万
    AI-阿水 出牌: 西 [手牌: 中 中 七筒 五万 五条 七万 七万 六条 八条 八条 四万 五筒 六万]
    AI-老赵 摸牌: 三筒
    AI-老赵 出牌: 白 [手牌: 八筒 四万 二条 五条 四条 八万 六筒 六万 二筒 北 八万 四万 三筒]
    AI-AK 摸牌: 九条
    AI-AK 出牌: 九条 [手牌: 四筒 六万 四条 四条 二筒 六筒 九万 九筒 二筒 四筒 六筒 八万 二条]
    AI-小胖 摸牌: 一筒
    AI-小胖 出牌: 一筒 [手牌: 北 七条 北 二万 六条 五条 九条 一万 三条]
    AI-阿水 摸牌: 五万
    AI-阿水 出牌: 七筒 [手牌: 中 中 五万 五条 七万 七万 六条 八条 八条 四万 五筒 六万 五万]
    AI-老赵 摸牌: 一筒
    AI-老赵 出牌: 北 [手牌: 八筒 四万 二条 五条 四条 八万 六筒 六万 二筒 八万 四万 三筒 一筒]
    AI-小胖 摸牌: 六条
    AI-小胖 出牌: 一万 [手牌: 七条 六条 五条 九条 三条 四条 六条]
    AI-阿水 摸牌: 八万
    AI-阿水 出牌: 五筒 [手牌: 中 中 五万 五条 七万 七万 六条 八条 八条 四万 六万 五万 八万]
    AI-老赵 摸牌: 一条
    AI-老赵 出牌: 五条 [手牌: 八筒 四万 二条 四条 八万 六筒 六万 二筒 八万 四万 三筒 一筒 一条]
    AI-AK 摸牌: 四万
    AI-AK 出牌: 九万 [手牌: 四筒 六万 四条 四条 二筒 六筒 九筒 二筒 四筒 六筒 八万 二条 四万]
    AI-小胖 摸牌: 九万
    AI-小胖 出牌: 九万 [手牌: 七条 六条 五条 九条 三条 四条 六条]
    AI-阿水 摸牌: 二万
    AI-阿水 出牌: 五条 [手牌: 中 中 五万 七万 七万 六条 八条 八条 四万 六万 五万 八万 二万]
    AI-老赵 摸牌: 六筒
    AI-老赵 出牌: 四条 [手牌: 八筒 四万 二条 八万 六筒 六万 二筒 八万 四万 三筒 一筒 一条 六筒]
    AI-AK 摸牌: 五条
    AI-AK 出牌: 二条 [手牌: 四筒 六万 二筒 六筒 九筒 二筒 四筒 六筒 四万 三条 五条]
    AI-小胖 摸牌: 一条
    AI-小胖 出牌: 九条 [手牌: 七条 六条 五条 三条 四条 六条 一条]
    AI-阿水 摸牌: 八筒
    AI-阿水 出牌: 八筒 [手牌: 中 中 五万 七万 七万 六条 八条 八条 四万 六万 五万 八万 二万]
    AI-老赵 摸牌: 四筒
    AI-老赵 出牌: 二条 [手牌: 八筒 四万 八万 六筒 六万 二筒 八万 四万 三筒 一筒 一条 六筒 四筒]
    AI-AK 摸牌: 九条
    AI-AK 出牌: 九条 [手牌: 四筒 六万 二筒 六筒 九筒 二筒 四筒 六筒 四万 三条 五条]
    AI-小胖 摸牌: 一万
    AI-小胖 出牌: 一万 [手牌: 七条 六条 五条 三条 四条 六条 一条]
    AI-阿水 摸牌: 三万
    AI-阿水 出牌: 六条 [手牌: 中 中 五万 七万 七万 八条 八条 四万 六万 五万 八万 二万 三万]
    AI-小胖 摸牌: 发
    AI-小胖 出牌: 发 [手牌: 五条 三条 四条 一条 一条]
    AI-阿水 摸牌: 八筒
    AI-阿水 出牌: 八筒 [手牌: 中 中 五万 七万 七万 八条 八条 四万 六万 五万 八万 二万 三万]
    AI-老赵 摸牌: 七条
    AI-老赵 出牌: 一条 [手牌: 八筒 四万 八万 六筒 六万 二筒 八万 四万 三筒 一筒 六筒 四筒 七条]
    AI-AK 摸牌: 西
    AI-AK 出牌: 西 [手牌: 四筒 六万 二筒 六筒 九筒 二筒 四筒 六筒 四万 三条 五条]
    AI-小胖 摸牌: 一条
    AI-小胖 出牌: 五条 [手牌: 三条 四条 一条 一条 一条]
    AI-阿水 摸牌: 九万
    AI-阿水 出牌: 八条 [手牌: 中 中 五万 七万 七万 八条 四万 六万 五万 八万 二万 三万 九万]
    AI-老赵 摸牌: 四筒
    AI-老赵 出牌: 七条 [手牌: 八筒 四万 八万 六筒 六万 二筒 八万 四万 三筒 一筒 六筒 四筒 四筒]
    AI-AK 摸牌: 一万
    AI-AK 出牌: 一万 [手牌: 四筒 六万 二筒 六筒 九筒 二筒 四筒 六筒 四万 三条 五条]
    AI-小胖 摸牌: 二万
    AI-小胖 出牌: 二万 [手牌: 三条 四条 一条 一条 一条]
    AI-阿水 摸牌: 九筒
    AI-阿水 出牌: 九筒 [手牌: 中 中 五万 七万 七万 八条 四万 六万 五万 八万 二万 三万 九万]
    AI-老赵 摸牌: 九筒
    AI-老赵 出牌: 六万 [手牌: 八筒 四万 八万 六筒 二筒 八万 四万 三筒 一筒 六筒 四筒 四筒 九筒]
    AI-AK 摸牌: 九条
    AI-AK 出牌: 九条 [手牌: 四筒 六万 二筒 六筒 九筒 二筒 四筒 六筒 四万 三条 五条]
    AI-小胖 摸牌: 七筒
    AI-小胖 出牌: 七筒 [手牌: 三条 四条 一条 一条 一条]
    AI-阿水 摸牌: 二万
    AI-阿水 出牌: 八条 [手牌: 中 中 五万 七万 七万 四万 六万 五万 八万 二万 三万 九万 二万]
    AI-老赵 摸牌: 三条
    AI-老赵 出牌: 三条 [手牌: 八筒 四万 八万 六筒 二筒 八万 四万 三筒 一筒 六筒 四筒 四筒 九筒]
    AI-AK 摸牌: 三万
    AI-AK 出牌: 三万 [手牌: 四筒 六万 二筒 六筒 九筒 二筒 四筒 六筒 四万 三条 五条]
    AI-小胖 摸牌: 一万
    AI-小胖 出牌: 一万 [手牌: 三条 四条 一条 一条 一条]
    AI-阿水 摸牌: 中
    AI-阿水 自摸: 中 中 五万 七万 七万 四万 六万 五万 八万 二万 三万 九万 二万 中 [800×3=2400] [手牌14张+副露0]

  【最大输局】-8000 (倍×2)
    AI-AK 摸牌: 八万
    AI-AK 出牌: 七条 [手牌: 四筒 白 六万 四条 四条 二筒 六筒 九万 九筒 二筒 四筒 六筒 八万]
    AI-小胖 摸牌: 九条
    AI-小胖 出牌: 发 [手牌: 八筒 白 北 七万 七条 北 二万 六条 东 五条 白 东 九条]
    AI-阿水 摸牌: 四万
    AI-阿水 出牌: 南 [手牌: 中 中 西 七筒 五万 五条 七万 七万 东 六条 八条 八条 四万]
    AI-老赵 摸牌: 四万
    AI-老赵 出牌: 南 [手牌: 八筒 四万 二条 五条 白 四条 八万 六筒 六万 二筒 北 八万 四万]
    AI-AK 摸牌: 二条
    AI-AK 出牌: 白 [手牌: 四筒 六万 四条 四条 二筒 六筒 九万 九筒 二筒 四筒 六筒 八万 二条]
    AI-小胖 摸牌: 一万
    AI-小胖 出牌: 八筒 [手牌: 北 七万 七条 北 二万 六条 东 五条 东 九条 一万]
    AI-阿水 摸牌: 五筒
    AI-阿水 出牌: 东 [手牌: 中 中 西 七筒 五万 五条 七万 七万 六条 八条 八条 四万 五筒]
    AI-小胖 摸牌: 发
    AI-小胖 出牌: 发 [手牌: 北 七条 北 二万 六条 五条 九条 一万 三条]
    AI-阿水 摸牌: 六万
    AI-阿水 出牌: 西 [手牌: 中 中 七筒 五万 五条 七万 七万 六条 八条 八条 四万 五筒 六万]
    AI-老赵 摸牌: 三筒
    AI-老赵 出牌: 白 [手牌: 八筒 四万 二条 五条 四条 八万 六筒 六万 二筒 北 八万 四万 三筒]
    AI-AK 摸牌: 九条
    AI-AK 出牌: 九条 [手牌: 四筒 六万 四条 四条 二筒 六筒 九万 九筒 二筒 四筒 六筒 八万 二条]
    AI-小胖 摸牌: 一筒
    AI-小胖 出牌: 一筒 [手牌: 北 七条 北 二万 六条 五条 九条 一万 三条]
    AI-阿水 摸牌: 五万
    AI-阿水 出牌: 七筒 [手牌: 中 中 五万 五条 七万 七万 六条 八条 八条 四万 五筒 六万 五万]
    AI-老赵 摸牌: 一筒
    AI-老赵 出牌: 北 [手牌: 八筒 四万 二条 五条 四条 八万 六筒 六万 二筒 八万 四万 三筒 一筒]
    AI-小胖 摸牌: 六条
    AI-小胖 出牌: 一万 [手牌: 七条 六条 五条 九条 三条 四条 六条]
    AI-阿水 摸牌: 八万
    AI-阿水 出牌: 五筒 [手牌: 中 中 五万 五条 七万 七万 六条 八条 八条 四万 六万 五万 八万]
    AI-老赵 摸牌: 一条
    AI-老赵 出牌: 五条 [手牌: 八筒 四万 二条 四条 八万 六筒 六万 二筒 八万 四万 三筒 一筒 一条]
    AI-AK 摸牌: 四万
    AI-AK 出牌: 九万 [手牌: 四筒 六万 四条 四条 二筒 六筒 九筒 二筒 四筒 六筒 八万 二条 四万]
    AI-小胖 摸牌: 九万
    AI-小胖 出牌: 九万 [手牌: 七条 六条 五条 九条 三条 四条 六条]
    AI-阿水 摸牌: 二万
    AI-阿水 出牌: 五条 [手牌: 中 中 五万 七万 七万 六条 八条 八条 四万 六万 五万 八万 二万]
    AI-老赵 摸牌: 六筒
    AI-老赵 出牌: 四条 [手牌: 八筒 四万 二条 八万 六筒 六万 二筒 八万 四万 三筒 一筒 一条 六筒]
    AI-AK 摸牌: 五条
    AI-AK 出牌: 二条 [手牌: 四筒 六万 二筒 六筒 九筒 二筒 四筒 六筒 四万 三条 五条]
    AI-小胖 摸牌: 一条
    AI-小胖 出牌: 九条 [手牌: 七条 六条 五条 三条 四条 六条 一条]
    AI-阿水 摸牌: 八筒
    AI-阿水 出牌: 八筒 [手牌: 中 中 五万 七万 七万 六条 八条 八条 四万 六万 五万 八万 二万]
    AI-老赵 摸牌: 四筒
    AI-老赵 出牌: 二条 [手牌: 八筒 四万 八万 六筒 六万 二筒 八万 四万 三筒 一筒 一条 六筒 四筒]
    AI-AK 摸牌: 九条
    AI-AK 出牌: 九条 [手牌: 四筒 六万 二筒 六筒 九筒 二筒 四筒 六筒 四万 三条 五条]
    AI-小胖 摸牌: 一万
    AI-小胖 出牌: 一万 [手牌: 七条 六条 五条 三条 四条 六条 一条]
    AI-阿水 摸牌: 三万
    AI-阿水 出牌: 六条 [手牌: 中 中 五万 七万 七万 八条 八条 四万 六万 五万 八万 二万 三万]
    AI-小胖 摸牌: 发
    AI-小胖 出牌: 发 [手牌: 五条 三条 四条 一条 一条]
    AI-阿水 摸牌: 八筒
    AI-阿水 出牌: 八筒 [手牌: 中 中 五万 七万 七万 八条 八条 四万 六万 五万 八万 二万 三万]
    AI-老赵 摸牌: 七条
    AI-老赵 出牌: 一条 [手牌: 八筒 四万 八万 六筒 六万 二筒 八万 四万 三筒 一筒 六筒 四筒 七条]
    AI-AK 摸牌: 西
    AI-AK 出牌: 西 [手牌: 四筒 六万 二筒 六筒 九筒 二筒 四筒 六筒 四万 三条 五条]
    AI-小胖 摸牌: 一条
    AI-小胖 出牌: 五条 [手牌: 三条 四条 一条 一条 一条]
    AI-阿水 摸牌: 九万
    AI-阿水 出牌: 八条 [手牌: 中 中 五万 七万 七万 八条 四万 六万 五万 八万 二万 三万 九万]
    AI-老赵 摸牌: 四筒
    AI-老赵 出牌: 七条 [手牌: 八筒 四万 八万 六筒 六万 二筒 八万 四万 三筒 一筒 六筒 四筒 四筒]
    AI-AK 摸牌: 一万
    AI-AK 出牌: 一万 [手牌: 四筒 六万 二筒 六筒 九筒 二筒 四筒 六筒 四万 三条 五条]
    AI-小胖 摸牌: 二万
    AI-小胖 出牌: 二万 [手牌: 三条 四条 一条 一条 一条]
    AI-阿水 摸牌: 九筒
    AI-阿水 出牌: 九筒 [手牌: 中 中 五万 七万 七万 八条 四万 六万 五万 八万 二万 三万 九万]
    AI-老赵 摸牌: 九筒
    AI-老赵 出牌: 六万 [手牌: 八筒 四万 八万 六筒 二筒 八万 四万 三筒 一筒 六筒 四筒 四筒 九筒]
    AI-AK 摸牌: 九条
    AI-AK 出牌: 九条 [手牌: 四筒 六万 二筒 六筒 九筒 二筒 四筒 六筒 四万 三条 五条]
    AI-小胖 摸牌: 七筒
    AI-小胖 出牌: 七筒 [手牌: 三条 四条 一条 一条 一条]
    AI-阿水 摸牌: 二万
    AI-阿水 出牌: 八条 [手牌: 中 中 五万 七万 七万 四万 六万 五万 八万 二万 三万 九万 二万]
    AI-老赵 摸牌: 三条
    AI-老赵 出牌: 三条 [手牌: 八筒 四万 八万 六筒 二筒 八万 四万 三筒 一筒 六筒 四筒 四筒 九筒]
    AI-AK 摸牌: 三万
    AI-AK 出牌: 三万 [手牌: 四筒 六万 二筒 六筒 九筒 二筒 四筒 六筒 四万 三条 五条]
    AI-小胖 摸牌: 一万
    AI-小胖 出牌: 一万 [手牌: 三条 四条 一条 一条 一条]
    AI-阿水 摸牌: 中
    AI-阿水 自摸: 中 中 五万 七万 七万 四万 六万 五万 八万 二万 三万 九万 二万 中 [800×3=2400] [手牌14张+副露0]