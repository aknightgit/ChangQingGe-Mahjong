# 长清阁麻将 全员基线收敛训练日志

- 创建时间: 2026-03-31T13:24:25.630Z
- 训练脚本: train-baseline.ts
- Config: 1 rounds × 3 games = 3 total
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
| 胡牌率 | 100.0% | ≥90% |
| 流局率 | 0.0% | <10% |
| 自摸率 | 66.7% | 40-60% |
| 捉冲率 | 33.3% | 40-60% |
| 血战率 | 66.7% | >80% |
| 大牌率 | 0.0% | 3-8% |
| 门清率 | 33.3% | 7-12% |
| Fitness | -170.3 | ↑ |

### 第1轮 (强度=1.0, 停滞=0)
  C1: fitness=-64 hu=100% self=60% disc=40% draws=0
  C2: fitness=-17 hu=100% self=50% disc=50% draws=0
  C3: fitness=-537 hu=67% self=67% disc=33% draws=1
  C4: fitness=-550 hu=100% self=80% disc=20% draws=0
  C5: fitness=-480 hu=67% self=67% disc=33% draws=1
  ★ NEW BEST! fitness=-17
  指标: hu=100% self=50% disc=50% big=0% mq=25%

## Round 1 (2026-03-31T13:24:26.683Z)

### 训练指标
- Games: 3
- 胡牌局: 8 (266.67%)
- 流局: -5 (-166.67%)
- 血战到最后一人: 3 (37.50%)
- 自摸率(胡牌中): 50.00%
- 捉冲率(胡牌中): 50.00%
- 大牌率(胡牌中): 0.00%
- 门清胡牌率(胡牌中): 25.00%
- Fitness: -2500.0000

### 本轮最佳策略参数
```json
{
  "id": "AI-AK",
  "selfWinChance": 0.8308825464645896,
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
  "meldPenalty": 0.04,
  "allPungsPursuit": 0.5616911598388367,
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
  "wild1RouteHonorsBoost": 0.05489619165591391,
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
  "bao2ClaimPenalty": 0.5,
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
- 最大亏损: AI-AK -1600 点（绝对值 1600）
- 局号: 0
- 回合: 31
- 总筹码: 1600
- 百搭: 见手牌
- 回合/全局倍数信息:
  - 全局倍数: xundefined

- 输出该局所有胡牌玩家明细
  - 玩家: AI-小胖
    - 胡牌方式: 放冲
    - 手牌牌面: 三筒 一筒 八条 六筒 七筒 六筒 五筒 二筒 九条 七条 九筒 八筒 七筒
    - 门口牌（吃/碰/杠）: (无)
    - 花牌: 秋 春

- 结算逐笔明细（谁付给谁、倍率和金额）
  - [放炮] AI-AK -> AI-小胖 : 160


--- 最终评估 ---
| 指标 | 值 | 目标 | 达标 |
|------|-----|------|------|
| 胡牌率 | 92.7% | ≥90% | ✅ |
| 流局率 | 7.3% | <10% | ✅ |
| 自摸率 | 65.3% | 40-60% | ❌ |
| 捉冲率 | 34.7% | 40-60% | ❌ |
| 血战率 | 66.1% | >80% | ❌ |
| 大牌率 | 0.1% | 3-8% | ❌ |
| 门清率 | 18.7% | 7-12% | ❌ |

Fitness: -140

  最佳策略参数 (关键):
    selfWinChance: 0.8309
    discardHuChance: 0.7000
    pengChance: 0.9500
    chowChance: 0.1500
    anKongChance: 0.9898
    allPungsPursuit: 0.5617
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
    wild1MenqingKeep: 2
    wild2MenqingKeep: 1
    multHighValueBias: 0.7829
    wallLateDefense: 0.8000
    safeTilePriority: 0.6226

  【最大赢局】+12000 (倍×4)
    AI-AK 发牌: 七条 北 一筒 西 八条 二筒 四筒 四条 白 九筒 二万 七条 八万
    AI-小胖 发牌: 六筒 白 三条 南 三筒 二条 白 二筒 一条 七条 七万 九万 八万
    AI-阿水 发牌: 九万 东 二筒 中 七筒 南 一条 三万 九条 九筒 九条 三条 中
    AI-老赵 发牌: 六筒 五万 八筒 八万 二条 一条 西 六万 七万 六筒 六筒 七筒 发
    AI-AK 摸牌: 五万
    AI-AK 出牌: 西 [手牌: 七条 北 一筒 八条 二筒 四筒 四条 白 九筒 二万 七条 八万 五万]
    AI-小胖 摸牌: 二万
    AI-小胖 出牌: 六筒 [手牌: 白 三条 南 三筒 二条 白 二筒 一条 七条 七万 九万 八万 二万]
    AI-老赵 摸牌: 九筒
    AI-老赵 出牌: 西 [手牌: 五万 八筒 八万 二条 一条 六万 七万 六筒 七筒 四条 九筒]
    AI-AK 摸牌: 南
    AI-AK 出牌: 南 [手牌: 七条 北 一筒 八条 二筒 四筒 四条 白 九筒 二万 七条 八万 五万]
    AI-小胖 摸牌: 三万
    AI-小胖 出牌: 七条 [手牌: 白 三条 南 三筒 二条 白 二筒 一条 七万 九万 八万 二万 三万]
    AI-AK 摸牌: 八条
    AI-AK 出牌: 四条 [手牌: 北 一筒 二筒 四筒 白 九筒 二万 八万 五万 五筒 八条]
    AI-小胖 摸牌: 东
    AI-小胖 出牌: 南 [手牌: 白 三条 三筒 二条 白 二筒 一条 七万 九万 八万 二万 三万 东]
    AI-阿水 摸牌: 三筒
    AI-阿水 出牌: 南 [手牌: 九万 东 二筒 中 七筒 一条 三万 九条 九筒 九条 三条 中 三筒]
    AI-老赵 摸牌: 一万
    AI-老赵 出牌: 一万 [手牌: 五万 八筒 八万 二条 一条 六万 七万 六筒 七筒 四条 九筒]
    AI-AK 摸牌: 四万
    AI-AK 出牌: 八万 [手牌: 北 一筒 二筒 四筒 白 九筒 二万 五万 五筒 八条 四万]
    AI-小胖 摸牌: 白
    AI-小胖 自摸: 白 三条 三筒 二条 白 二筒 一条 七万 九万 八万 二万 三万 东 白 [400×3=1200] [手牌14张+副露0]

  【最大输局】-6400 (倍×4)
    AI-AK 发牌: 一筒 九条 发 北 六条 九筒 一万 五筒 中 八筒 西 九条 七筒
    AI-小胖 发牌: 东 六筒 四条 七万 五条 三筒 三条 五万 一条 四万 九万 九万 七万
    AI-阿水 发牌: 西 一条 北 六筒 八条 二筒 三筒 九万 白 白 东 六万 三万
    AI-老赵 发牌: 八筒 九筒 五万 二条 发 五条 一万 六条 六条 二万 七万 西 六万
    AI-AK 摸牌: 二条
    AI-AK 出牌: 中 [手牌: 一筒 九条 发 北 六条 九筒 一万 五筒 八筒 西 九条 七筒 二条]
    AI-小胖 摸牌: 东
    AI-小胖 出牌: 六筒 [手牌: 东 四条 七万 五条 三筒 三条 五万 一条 四万 九万 九万 七万 东]
    AI-阿水 摸牌: 南
    AI-阿水 出牌: 九万 [手牌: 西 一条 北 六筒 八条 二筒 三筒 白 白 东 六万 三万 南]
    AI-老赵 摸牌: 九条
    AI-老赵 出牌: 发 [手牌: 八筒 九筒 五万 二条 五条 一万 六条 六条 二万 七万 西 六万 九条]
    AI-AK 摸牌: 八万
    AI-AK 出牌: 发 [手牌: 一筒 九条 北 六条 九筒 一万 五筒 八筒 西 九条 七筒 二条 八万]
    AI-小胖 摸牌: 二条
    AI-小胖 出牌: 三筒 [手牌: 东 四条 七万 五条 三条 五万 一条 四万 九万 九万 七万 东 二条]
    AI-阿水 摸牌: 一万
    AI-阿水 出牌: 八条 [手牌: 西 一条 北 六筒 二筒 三筒 白 白 东 六万 三万 南 一万]
    AI-老赵 摸牌: 二筒
    AI-老赵 出牌: 西 [手牌: 八筒 九筒 五万 二条 五条 一万 六条 六条 二万 七万 六万 九条 二筒]
    AI-AK 摸牌: 一筒
    AI-AK 出牌: 一万 [手牌: 一筒 九条 北 六条 九筒 五筒 八筒 西 九条 七筒 二条 八万 一筒]
    AI-小胖 摸牌: 五筒
    AI-小胖 出牌: 五筒 [手牌: 东 四条 七万 五条 三条 五万 一条 四万 九万 九万 七万 东 二条]
    AI-阿水 摸牌: 一条
    AI-阿水 出牌: 六万 [手牌: 西 一条 北 六筒 二筒 三筒 白 白 东 三万 南 一万 一条]
    AI-老赵 摸牌: 二条
    AI-老赵 出牌: 二筒 [手牌: 八筒 九筒 五万 二条 五条 一万 六条 六条 二万 七万 六万 九条 二条]
    AI-AK 摸牌: 五条
    AI-AK 出牌: 二条 [手牌: 一筒 九条 北 六条 九筒 五筒 八筒 西 九条 七筒 八万 一筒 五条]
    AI-老赵 摸牌: 五筒
    AI-老赵 出牌: 五筒 [手牌: 八筒 九筒 五万 五条 一万 六条 六条 二万 七万 六万 三万]
    AI-AK 摸牌: 一筒
    AI-AK 出牌: 八万 [手牌: 一筒 九条 北 六条 九筒 五筒 八筒 西 九条 七筒 一筒 五条 一筒]
    AI-小胖 摸牌: 七条
    AI-小胖 出牌: 七条 [手牌: 东 四条 七万 五条 三条 五万 一条 四万 九万 九万 七万 东 二条]
    AI-阿水 摸牌: 八筒
    AI-阿水 出牌: 南 [手牌: 西 一条 北 六筒 二筒 三筒 白 白 东 三万 一万 一条 八筒]
    AI-老赵 摸牌: 二万
    AI-老赵 出牌: 八筒 [手牌: 九筒 五万 五条 一万 六条 六条 二万 七万 六万 三万 二万]
    AI-AK 摸牌: 二万
    AI-AK 出牌: 二万 [手牌: 一筒 九条 北 六条 九筒 五筒 八筒 西 九条 七筒 一筒 五条 一筒]
    AI-老赵 摸牌: 七筒
    AI-老赵 出牌: 九筒 [手牌: 五万 五条 一万 六条 六条 七万 六万 三万 七筒]
    AI-AK 摸牌: 六筒
    AI-AK 出牌: 西 [手牌: 一筒 九条 北 六条 九筒 五筒 八筒 九条 七筒 一筒 五条 一筒 六筒]
    AI-小胖 摸牌: 四筒
    AI-小胖 出牌: 四筒 [手牌: 东 四条 七万 五条 三条 五万 一条 四万 九万 九万 七万 东 二条]
    AI-阿水 摸牌: 白
    AI-阿水 出牌: 东 [手牌: 西 一条 北 六筒 二筒 三筒 白 白 三万 一万 一条 八筒 白]
    AI-小胖 摸牌: 八万
    AI-小胖 出牌: 五条 [手牌: 四条 七万 三条 五万 一条 四万 九万 九万 七万 二条 八万]
    AI-阿水 摸牌: 四筒
    AI-阿水 出牌: 西 [手牌: 一条 北 六筒 二筒 三筒 白 白 三万 一万 一条 八筒 白 四筒]
    AI-老赵 摸牌: 七筒
    AI-老赵 出牌: 五条 [手牌: 五万 一万 六条 六条 七万 六万 三万 七筒 七筒]
    AI-AK 摸牌: 四条
    AI-AK 出牌: 北 [手牌: 一筒 九条 六条 九筒 五筒 八筒 九条 七筒 一筒 五条 一筒 六筒 四条]
    AI-小胖 摸牌: 四筒
    AI-小胖 出牌: 四筒 [手牌: 四条 七万 三条 五万 一条 四万 九万 九万 七万 二条 八万]
    AI-AK 放炮胡: AI-小胖出四筒→一筒 九条 六条 九筒 五筒 八筒 九条 七筒 一筒 五条 一筒 六筒 四条 [640]