# 长清阁麻将 全员基线收敛训练日志

- 创建时间: 2026-04-01T05:30:40.950Z
- 训练脚本: train-baseline.ts
- Config: 1 rounds × 10 games = 10 total
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
| 自摸率 | 27.3% | 40-60% |
| 捉冲率 | 72.7% | 40-60% |
| 血战率 | 37.5% | >80% |
| 大牌率 | 0.0% | 3-8% |
| 门清率 | 54.5% | 7-12% |
| Fitness | -599.5 | ↑ |

### 第1轮 (强度=1.0, 停滞=0)
  C1: fitness=-169 hu=90% self=60% disc=40% draws=1
  C2: fitness=-166 hu=90% self=71% disc=29% draws=1
  C3: fitness=-352 hu=80% self=31% disc=69% draws=2
  C4: fitness=-274 hu=80% self=50% disc=50% draws=2
  C5: fitness=-137 hu=100% self=67% disc=33% draws=0
  ★ NEW BEST! fitness=-137
  指标: hu=100% self=67% disc=33% big=0% mq=17%

## Round 1 (2026-04-01T05:30:44.020Z)

### 训练指标
- Games: 10
- 胡牌局: 10 (100.00%)
- 流局: 0 (0.00%)
- 血战到最后一人: 6 (60.00%)
- 平均回合: 20.70
- 平均总筹码: 104.00
- 自摸率(胡牌中): 66.67%
- 大牌率(胡牌中): 0.00%
- 门清胡牌率(胡牌中): 16.67%
- 胜者平均最终点: 4.40
- Fitness: -137.0000

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
- 最大赢利: AI-小胖 1800 点（绝对值 1800）
- 局号: 1
- 回合: 17
- 总筹码: 360
- 百搭: dots-1
- 回合/全局倍数信息:
  - 骰子点数: 5 + 2
  - 骰子倍数（清晰明了）: x1
  - 全局倍数: x1

- 输出该局所有胡牌玩家明细
  - 玩家: AI-小胖
    - 胡牌方式: 自摸
    - 牌型/基础番/最终点: 普通胡 / 6 / 6
    - 手牌牌面: 一筒 二筒 一筒 三筒 四条 五条 八万 七万 九万 八万 四筒 七万
    - 门口牌（吃/碰/杠）: 碰:中 中 中
    - 花牌: 春 菊

- 结算逐笔明细（谁付给谁、倍率和金额）
  - [自摸] AI-AK -> AI-小胖 : 60
  - [自摸] AI-阿水 -> AI-小胖 : 60
  - [自摸] AI-老赵 -> AI-小胖 : 60

---

#### 最大输局
- 最大亏损: AI-AK -600 点（绝对值 600）
- 局号: 1
- 回合: 17
- 总筹码: 360
- 百搭: dots-1
- 回合/全局倍数信息:
  - 骰子点数: 5 + 2
  - 骰子倍数（清晰明了）: x1
  - 全局倍数: x1

- 输出该局所有胡牌玩家明细
  - 玩家: AI-小胖
    - 胡牌方式: 自摸
    - 牌型/基础番/最终点: 普通胡 / 6 / 6
    - 手牌牌面: 一筒 二筒 一筒 三筒 四条 五条 八万 七万 九万 八万 四筒 七万
    - 门口牌（吃/碰/杠）: 碰:中 中 中
    - 花牌: 春 菊

- 结算逐笔明细（谁付给谁、倍率和金额）
  - [自摸] AI-AK -> AI-小胖 : 60
  - [自摸] AI-阿水 -> AI-小胖 : 60
  - [自摸] AI-老赵 -> AI-小胖 : 60

- 高倍数局数(骰子>=2): 0


--- 最终评估 ---
| 指标 | 值 | 目标 | 达标 |
|------|-----|------|------|
| 胡牌率 | 84.6% | ≥90% | ❌ |
| 流局率 | 15.4% | <10% | ❌ |
| 自摸率 | 51.3% | 40-60% | ✅ |
| 捉冲率 | 48.7% | 40-60% | ✅ |
| 血战率 | 53.0% | >80% | ❌ |
| 大牌率 | 0.0% | 3-8% | ❌ |
| 门清率 | 18.4% | 7-12% | ❌ |

Fitness: -230

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

  【最大赢局】+19200 (倍×4)
    AI-小胖 自摸: 五筒 二万 七筒 一万 发 二万 发 六筒 三万 四万 一万 发 [640×3=1920] [手牌12张+副露1]

  【最大输局】-6400 (倍×4)
    AI-小胖 自摸: 五筒 二万 七筒 一万 发 二万 发 六筒 三万 四万 一万 发 [640×3=1920] [手牌12张+副露1]