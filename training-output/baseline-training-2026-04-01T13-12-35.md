# 长清阁麻将 全员基线收敛训练日志

- 创建时间: 2026-04-01T13:12:35.126Z
- 训练脚本: train-baseline.ts
- Config: 1 rounds × 500 games = 500 total
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
| 胡牌率 | 67.6% | ≥90% |
| 流局率 | 32.4% | <10% |
| 自摸率 | 1.1% | 40-60% |
| 捉冲率 | 98.9% | 40-60% |
| 血战率 | 27.8% | >80% |
| 大牌率 | 0.0% | 3-8% |
| 门清率 | 13.5% | 7-12% |
| Fitness | -817.1 | ↑ |

### 第1轮 (强度=1.0, 停滞=0)
  C1: fitness=-801 hu=66% self=1% disc=99% draws=171
  C2: fitness=-812 hu=64% self=1% disc=99% draws=179
  C3: fitness=-875 hu=60% self=1% disc=99% draws=199
  C4: fitness=-835 hu=64% self=1% disc=99% draws=181
  C5: fitness=-784 hu=70% self=2% disc=98% draws=148
  ★ NEW BEST! fitness=-784
  指标: hu=70% self=2% disc=98% big=0% mq=13%

## Round 1 (2026-04-01T13:15:15.720Z)

### 训练指标
- Games: 500
- 胡牌局: 352 (70.40%)
- 流局: 148 (29.60%)
- 血战到最后一人: 96 (27.27%)
- 平均回合: 9.15
- 平均总筹码: 1.80
- 自摸率(胡牌中): 1.74%
- 大牌率(胡牌中): 0.22%
- 门清胡牌率(胡牌中): 13.02%
- 胜者平均最终点: 0.15
- Fitness: -783.7296

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
  "chowChance": 0.15627782708545107,
  "anKongChance": 0.9898296447948148,
  "pengWildBoost": 0.06282849518815241,
  "kongWildBoost": 0.1769151208934808,
  "chowWildPenalty": 0.22,
  "menqingKeepBonus": 4,
  "meldPenalty": 0.026829650548748255,
  "allPungsPursuit": 0.6525549030650394,
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
  "wildMultLowAggression": 0.531984642444706,
  "wildMultMidAggression": 0.5,
  "wildMultHighAggression": 0.8,
  "wild0MenqingKeep": 3,
  "wild1MenqingKeep": 2.005138539192227,
  "wild2MenqingKeep": 1,
  "wild1BaoPush": 0.08669062614139302,
  "wild2BaoPush": 0.4801519550795235,
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
  "wildDiaoPungBoost": 2.4861437507327993,
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
- 最大赢利: AI-小胖 3000 点（绝对值 3000）
- 局号: 490
- 回合: 65
- 总筹码: 600
- 百搭: tiao-4
- 回合/全局倍数信息:
  - 骰子点数: 1 + 4
  - 骰子倍数（清晰明了）: x1
  - 全局倍数: x1

- 输出该局所有胡牌玩家明细
  - 玩家: AI-小胖
    - 胡牌方式: 自摸
    - 牌型/基础番/最终点: 清一色 / 10 / 10
    - 手牌牌面: 六筒 四条 八筒 七筒 七筒 三筒 七筒 五筒 三筒 四筒
    - 门口牌（吃/碰/杠）: 碰:一筒 一筒 一筒 ; 碰:二筒 二筒 二筒
    - 花牌: 竹 春

- 结算逐笔明细（谁付给谁、倍率和金额）
  - (无)

---

#### 最大输局
- 最大亏损: AI-AK -1000 点（绝对值 1000）
- 局号: 490
- 回合: 65
- 总筹码: 600
- 百搭: tiao-4
- 回合/全局倍数信息:
  - 骰子点数: 1 + 4
  - 骰子倍数（清晰明了）: x1
  - 全局倍数: x1

- 输出该局所有胡牌玩家明细
  - 玩家: AI-小胖
    - 胡牌方式: 自摸
    - 牌型/基础番/最终点: 清一色 / 10 / 10
    - 手牌牌面: 六筒 四条 八筒 七筒 七筒 三筒 七筒 五筒 三筒 四筒
    - 门口牌（吃/碰/杠）: 碰:一筒 一筒 一筒 ; 碰:二筒 二筒 二筒
    - 花牌: 竹 春

- 结算逐笔明细（谁付给谁、倍率和金额）
  - (无)

- 高倍数局数(骰子>=2): 15


--- 最终评估 ---
| 指标 | 值 | 目标 | 达标 |
|------|-----|------|------|
| 胡牌率 | 65.5% | ≥90% | ❌ |
| 流局率 | 34.5% | <10% | ❌ |
| 自摸率 | 0.8% | 40-60% | ❌ |
| 捉冲率 | 99.2% | 40-60% | ❌ |
| 血战率 | 31.6% | >80% | ❌ |
| 大牌率 | 0.1% | 3-8% | ❌ |
| 门清率 | 11.9% | 7-12% | ✅ |

Fitness: -815

  最佳策略参数 (关键):
    selfWinChance: 0.7665
    discardHuChance: 0.7000
    pengChance: 0.9500
    chowChance: 0.1563
    anKongChance: 0.9898
    allPungsPursuit: 0.6526
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

  【最大赢局】+6000 (倍×1)
    AI-阿水 自摸: 二条 九条 一条 一条 一条 九条 六条 二条 四条 六条 三条 九条 [200×3=600] [手牌12张+副露1]

  【最大输局】-2000 (倍×1)
    AI-阿水 自摸: 二条 九条 一条 一条 一条 九条 六条 二条 四条 六条 三条 九条 [200×3=600] [手牌12张+副露1]