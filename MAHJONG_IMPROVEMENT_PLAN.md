# 长清阁麻将 AI 策略引擎分析报告

## 一、Guide vs 代码对照表

### 1. 阶段层

| Guide要求 | 当前实现 | 结论 |
|---|---|---|
| 开局观察期 1-5 巡，中盘定向期 6-10 巡，冲刺期为进听前后，防守期可随时触发（Guide 51-107, 342-386） | `detectDecisionPhase()` 仅按 `estimatedRound/shanten/tableThreat/wallRemaining/meldCount` 五个信号切分为 `OBSERVE/COMMIT/RUSH/DEFENSE`，其中 `estimatedRound >= 6` 直接进 `COMMIT`，`shanten <= 1 or estimatedRound >= 11 or wallRemaining <= 30 or meldCount >= 2` 直接进 `RUSH`，`tableThreat >= 0.9` 或 `wallRemaining <= 18` 才进 `DEFENSE`（`server/ai/route/phaseDetector.ts:11-33`） | **部分实现**。有阶段框架，但判定过粗，缺少 Guide 要求的“他家吃碰 2 次以上、下家持续压制、牌型显著做大、我方路线回报低”等高危条件输入。 |
| 阶段判定必须观察上家不要什么门、其他两家是否已有明显做牌方向、兼顾防守下家（Guide 61-64, 73-77, 348-350, 367-370） | 路线特征只统计 `upstreamVoidSuit` 与 `allOpponentsAvoidSuit`，来自别人弃牌花色计数（`routeEvaluator.ts:68-82`）；阶段层本身完全不使用这些信息（`phaseDetector.ts:3-33`） | **实现不完整**。观察信息只用于路线评分，未进入阶段主脑。 |
| 防守/止损期是任意时刻的抢占态（Guide 90-107） | `DEFENSE` 仅在 `tableThreat >= 0.9 && shanten > 1` 或 `wallRemaining <= 18 && shanten > 0` 时触发（`phaseDetector.ts:20-21`） | **实现不完整**。没有“他家吃碰过快、下家连续吃碰压制、他家明显做大、我方回报比极低”等止损入口。 |
| 阶段系统应作为后续动作和弃牌的统一主脑（Guide 25-37, 563-568） | `selectDiscardTile()` 与 `shouldClaimPendingAction()` 都会调用 `evaluateRouteState()`，说明实战已把阶段/路线结果接进吃碰与弃牌（`botService.ts:949-961`, `1466-1566`） | **已实现骨架**。但训练脚本仍有单独一套 `inferTrainingRouteSignal()` / `shouldAkTakeClaim()` 体系，实战与训练并未完全统一。 |

**阶段层关键判断**

1. **已落地的部分**
   - 已有显式阶段枚举，不再是纯散点 heuristic，这一点符合 Guide 的第一步要求。
   - 阶段结果确实影响弃牌与吃碰，说明“主脑入口”已经搭起来。

2. **缺失点**
   - 没有把“上家不要哪门、下家是否压制、他家副露次数、他家是否明显做一门”作为阶段输入，Guide 的观察期和定向期要求没有完整落地。
   - `RUSH` 的定义被写成“向听<=1 或 round>=11 或 wall<=30 或副露>=2”，这比 Guide 的“进听前后/接近成型时”更粗糙，容易把大量普通中后盘局面提前归入冲刺期。

3. **错误/冲突点**
   - Guide 说防守期可在任意时刻被高危条件抢占，当前实现却把防守触发条件硬编码为极少数数值阈值，属于**把防守缩窄成 late-game 数值分支**，与 Guide 的“动态止损”概念不一致。

---

### 2. 路线评分层

| Guide要求 | 当前实现 | 结论 |
|---|---|---|
| 固定候选路线：`MENQING_SPEED / OPEN_SPEED / HALF_FLUSH / ALL_PUNGS / HONOR_HEAVY`（Guide 112-119） | `ROUTES` 常量完整包含五条路线（`routeEvaluator.ts:13`） | **已实现** |
| 路线评分输入至少要考虑最长门、次长门、最短门废牌、对子、刻子、搭子质量、百搭、风箭密度、上家不要哪门、其他两家是否不要哪门、下家压力、他家副露、他家做一门、我方废牌数（Guide 120-141） | `buildFeatureSummary()` 只计算 `longestSuit/secondSuit/shortestSuit/pairCount/tripletCount/sequenceLikeCount/isolatedCount/honorCount/honorPairCount/wildCount/upstreamVoidSuit/allOpponentsAvoidSuit/liveHonorCount`（`routeEvaluator.ts:25-113`） | **实现不完整**。覆盖了门数、对子、刻子、风箭、百搭、上家/他家弃门信号，但没有“最短门废牌数量”“下家吃碰压力”“他家副露2次以上”“他家明显做某一门”“我方仅3张废牌”等关键特征。 |
| `MENQING_SPEED` 只在手牌本身强时才应高分，不应默认美化门清（Guide 144-153） | `MENQING_SPEED` 固定基线 `+24`，再按向听、有效牌、对子、搭子加分（`routeEvaluator.ts:122-134`） | **存在偏置错误**。高额固定底分会天然抬高门清线，违背 Guide “除非手牌本身强，否则不要美化门清”。 |
| `OPEN_SPEED` 在他家更快、守门清失速时才应明显上升（Guide 155-161） | `OPEN_SPEED` 只靠 `tableThreat * 7`、副露数、对子刻子等加分（`routeEvaluator.ts:136-145`） | **部分实现**。有速度压力概念，但没有验证“吃碰后是否真的改善听牌质量”。 |
| `HALF_FLUSH` 达到 7 张应倾向，9 张应积极转向（Guide 162-169, 358-359） | `HALF_FLUSH` 依赖 `longestSuitCount * 3.4 + honor/wild - secondSuitCount *1.9`（`routeEvaluator.ts:147-162`） | **实现不完整**。没有 7/9 张明确阈值，只是线性加减分。 |
| `ALL_PUNGS` 对子 4 对以上且有百搭时应非常积极（Guide 170-176, 357） | `ALL_PUNGS` 只按对子、刻子、风对子、百搭、顺子倾向打分（`routeEvaluator.ts:164-171`） | **部分实现**。方向正确，但没有“4 对 + 百搭”的强推阈值。 |
| `HONOR_HEAVY` 需看风箭 9-10 张、外面剩余量、数字牌结构差（Guide 177-183, 359） | `HONOR_HEAVY` 依赖 `honorCount/honorPairCount/wildCount/liveHonorCount`，`honorCount < 6` 直接重罚，`longestSuitCount >= 4` 等条件扣分（`routeEvaluator.ts:173-191`） | **部分实现**。有 honor 密度和 live honor，但没有 9-10 张强推阈值，也没有“外面剩余少则及时降权”的连续动态。 |
| 必须引入 `routeState + lockStrength`，开局弱锁、中盘中锁、除非连续数巡证据反转否则不能频繁换线（Guide 184-195） | `evaluateRouteState()` 只根据当前局面瞬时 `gap` 生成 `lockLevel 0/1/2`，没有历史 routeState 输入，也不保留前几巡证据（`routeEvaluator.ts:218-235`） | **关键缺失**。这是当前主脑最大缺口之一。所谓锁定是“瞬时 gap 锁”，不是 Guide 要求的“跨巡稳定锁线”。 |
| `routeFlipCount` 必须是关键负面指标（Guide 194, 479-503） | 训练脚本统计 `akRouteFlipCount` 并计入 fitness（`train-ai-ak.ts:3588-3608`, `3916-3918`） | **训练侧已实现，实战侧未闭环**。实战没有真实 routeState persistence，flip 统计更多是观测值，不是锁线器本身。 |

**路线评分层关键判断**

1. **已实现**
   - 五路线齐全。
   - 有基础特征抽取和 route score 排序。
   - 已有 `lockLevel` 概念雏形。

2. **未实现 / 不完整**
   - 大量 Guide 指定输入没有进入评分器，尤其是他家副露速度、下家压制、显著做一门、废牌数阈值。
   - 所有路线几乎都是线性打分，没有关键阈值规则，导致 Guide 里的“7 张转混一色、9 张积极转向、4 对+百搭强推碰碰胡”等无法被稳定表达。

3. **错误实现**
   - `MENQING_SPEED` 固定高基线是明显与 Guide 冲突的设计，会把门清当默认美德。
   - `lockLevel` 不是历史锁，而是瞬时锁，名义上有锁，实质上仍能每巡翻线。

---

### 3. 动作约束层

| Guide要求 | 当前实现 | 结论 |
|---|---|---|
| 吃碰决策必须改为二段式：先看是否符合当前路线，再看是否比 `PASS` 明显更好（Guide 399-406） | 实战 `shouldClaimPendingAction()` 先构造 `PASS` 基线，再对 PENG/KONG/CHOW 计算候选手牌，并调用 `evaluateRouteClaim()` 做路线约束（`botService.ts:1541-1566`, `1610-1845`）；训练 `shouldAkTakeClaim()` 也先比较 `passEval` 与 `claimEval`（`train-ai-ak.ts:899-960`） | **已实现核心框架** |
| `MENQING_SPEED` 默认不吃不碰，只有明显缩短成牌时间且他家明显更快时才允许破门清（Guide 202-208） | `evaluateRouteClaim()` 中 `MENQING_SPEED` 对首副露设置了更严门槛，要求降向听、增有效牌或 routeGain/speedGain 足够（`claimPlanner.ts:78-103`）；训练 `shouldAkTakeClaim()` 也限制早巡破门清（`train-ai-ak.ts:929-947`） | **部分实现**。有门清保护，但缺少“他家明显更快”的明确敌情验证，更多是基于自己 shape gain。 |
| `OPEN_SPEED` 允许积极吃碰，但不能假提速（Guide 209-214） | `OPEN_SPEED` 在 `evaluateRouteClaim()` 中统一放行并给正向 `tuneDelta`（`claimPlanner.ts:105-114`） | **实现不完整**。虽然候选手牌是和 `PASS` 比的，但 OPEN_SPEED 分支几乎默认通过，缺少“破坏听口/番型则拒绝”的硬约束。 |
| `HALF_FLUSH` 吃碰只服务目标门，非目标门高优先清理（Guide 215-222） | `evaluateRouteClaim()` 对 `HALF_FLUSH` 非目标门数牌直接禁吃碰，荣牌可保留为支持牌（`claimPlanner.ts:116-126`） | **已实现核心约束** |
| `ALL_PUNGS` 吃通常视为路线破坏行为（Guide 223-230） | `evaluateRouteClaim()` 与训练 `shouldAkTakeClaim()` 都对 `ALL_PUNGS + CHOW` 直接拒绝（`claimPlanner.ts:128-137`, `train-ai-ak.ts:949`） | **已实现** |
| `HONOR_HEAVY` 数字牌吃通常拒绝，风箭碰牌意愿提高，外部风箭少时应降权（Guide 231-237） | 当前对 `HONOR_HEAVY` 直接禁止 `CHOW`，且非字牌碰/杠也拒绝（`claimPlanner.ts:139-149`, `train-ai-ak.ts:950-953`） | **部分实现**。约束方向对，但“外部风箭少时及时降权”只在路线评分里弱化，没有进入动作层动态退让。 |
| 吃碰互斥原则：碰/杠后只能同门吃，不允许跨门吃（Guide 408-417） | `claimPlanner.ts:72-76` 通过 `getCommittedOpenNumberSuit()` 阻止已明副露后跨门吃；训练引擎也用 `checkChowPongExclusion()` 维护“碰后跨门禁吃”（`handValidator.ts:1572-1575`, `train-ai-ak.ts:3123-3211`） | **已实现** |
| 吃第一口前必须满足：主门数牌≥6、claimTile 为最优门、吃后不破坏对子刻子（Guide 421-427） | 当前没有看到这三个条件的硬判定。`evaluateRouteClaim()` 只做 `openingMenqing` 的 speed/routeGain 判断，未验证“主门>=6”“必须最优门”“不破坏对子刻子”（`claimPlanner.ts:78-103`） | **未实现** |
| 严禁坏吃碰，训练中必须重罚（Guide 429-440） | 训练只把“开门前路线是 `MENQING_SPEED` 或 confidence < 2.5”计为 `badOpen`（`train-ai-ak.ts:3124-3127`, `3201-3203`） | **实现过粗**。坏吃碰定义明显窄于 Guide。 |
| 极端危险时允许“有胡不接”或放弃低收益捉冲（Guide 103-107, 338-339, 459-463） | `shouldClaimPendingAction()` 对胡牌仍是概率式决策，主要看 `selfWinChance / discardHuChance / discardHuWildPenalty / discardHuMenQingPenalty / bao`，没有依据对手高压、收益风险比显式拒胡（`botService.ts:1496-1539`） | **未实现**。Guide 要的是收益风险模型，当前是概率门控。 |

**动作约束层关键判断**

1. **强项**
   - 二段式 `PASS vs CLAIM` 已经进入实战和训练两侧。
   - `ALL_PUNGS` 禁吃、`HONOR_HEAVY` 禁数字吃、`HALF_FLUSH` 限目标门，这些路线型约束已经比较清晰。
   - 吃碰互斥原则已落地。

2. **硬缺口**
   - 第一口吃的门槛没有按 Guide 落地。
   - OPEN_SPEED 过于宽松，仍有“假提速”空间。
   - 胡牌决策没有进入 Guide 要求的风险收益比层，只是随机概率和少量惩罚参数。

3. **错误/矛盾点**
   - Guide 反对“仅因为能动就动”，但 `shouldClaimPendingAction()` 中 `pengTune/chowTune` 仍保留 `policy.pengChance/chowChance` 这类概率主导项（`botService.ts:1578-1609` 及后续 CHOW 分支），说明动作是否执行仍带明显随机性，不是纯约束式决策。

---

### 4. 弃牌精排层

| Guide要求 | 当前实现 | 结论 |
|---|---|---|
| 弃牌必须在当前路线约束下，综合“成型收益 + 路线一致性 + 安全性 + 回报比”总分排序（Guide 239-249, 567） | `selectDiscardTile()` 先算 `shanten/effective/legacyScore/discardDanger/winningTiles`，再叠加 `scoreRouteDiscardCandidate()`，形成 `composite` 总分（`botService.ts:929-1071`）；`scoreRouteDiscardCandidate()` 包含 routeBias、preservePrimary、targetSuitBonus、dangerAdjustment、tingBonus（`discardPlanner.ts:67-89`） | **已实现骨架** |
| 开局观察期 A→E 弃牌顺序：优先清上家明显选择而我方较弱的一门、最短门外面已见孤张、最短门孤张、无风一色条件下多见风牌、次短门废张（Guide 250-289） | `scoreTileForDiscard()` 和 `scoreRouteDiscardCandidate()` 只用“最短门、邻近张、对子、字牌、外部风险”等局部加减分（`botService.ts:492-760`, `discardPlanner.ts:20-65`） | **未实现**。没有 A→E 顺序器，也没有“上家明显选择方向且我方弱门”的特判。 |
| 开局不应习惯性先打单张风箭，风箭在不足做风一色时才按普通废张处理（Guide 269-289, 554） | `scoreRouteDiscardCandidate()` 在 `MENQING_SPEED` 下对单张字牌给 `+1.8`，但 AI-AK 开局改成 `-1.2`，即开局更保单张字牌（`discardPlanner.ts:24-31`）；`scoreTileForDiscard()` 对风箭对子、刻子也有大量保护（`botService.ts:565-588`） | **部分实现**。至少做到了“AI-AK 开局不无脑先打单张风箭”。但“风箭密度不足时外面已出现 3 张该风应优先弃”没有实现。 |
| `HALF_FLUSH` 必须持续清非目标门，`ALL_PUNGS` 必须主动打低价值顺子型，`HONOR_HEAVY` 必须清非风箭废牌（Guide 291-320） | `discardPlanner.ts` 对 `HALF_FLUSH / ALL_PUNGS / HONOR_HEAVY` 都有明确 routeBias：非目标门强烈正分、对子刻子强保留、字牌在 `HONOR_HEAVY` 下强保护（`discardPlanner.ts:40-65`） | **已实现方向性约束** |
| 冲刺期要精细比较听口数、剩余张数、预期番数、门清、自摸/捉冲、放铳风险（Guide 321-339, 442-463） | `selectDiscardTile()` 只在 `shanten===0` 时加入 `winningTiles - discardDanger * safetyWeight`，没有番型收益、自摸收益、捉冲收益的显式估值（`botService.ts:986-1052`） | **实现不完整**。听牌优化只做了“张数 vs 危险度”的简化版。 |
| 弃牌必须能解释“强化哪条路线、放弃哪条路线”（Guide 37, 252） | `scoreRouteDiscardCandidate()` 确实对“保留主路线/保留 targetSuit/routeStrengthDelta”评分（`discardPlanner.ts:67-89`） | **已实现一部分** |

**弃牌层关键判断**

1. **已实现**
   - 已进入“综合排序”模式，不再只按单一 heuristic 出牌。
   - 路线型弃牌偏好已经存在，尤其在 `HALF_FLUSH / ALL_PUNGS / HONOR_HEAVY` 三条线上可见。

2. **缺失点**
   - Guide 最强调的开局 A→E 顺序没有落地，这是当前弃牌解释性不足的主要来源。
   - 冲刺期缺少番型收益、自摸收益、捉冲收益建模。

3. **冲突点**
   - `scoreTileForDiscard()` 仍保留大量散参数和局部 heuristic，说明弃牌层尚未完全重构成 Guide 要求的“路线约束下的总分器”，而是“legacy heuristic + routeBias 叠加”。

---

### 5. 实战逻辑与训练逻辑一致性

Guide 要求“live bot 的路线约束与训练器评分要一致”（Guide 540-549）。当前并未做到：

- **实战侧**用 `evaluateRouteState() + evaluateRouteClaim() + scoreRouteDiscardCandidate()`（`botService.ts:949-1052`, `1466-1845`）。
- **训练侧**关键动作判断仍主要走 `inferTrainingRouteSignal() + shouldAkTakeClaim() + evaluateAkDiscardChoice()`（`train-ai-ak.ts:899-1045`, `1629-2165`, `2300-2625`）。

这意味着：
1. 训练奖励的并不一定是实战真实执行的策略。
2. 训练里“好开门/坏开门”的定义，也不等于实战 route planner 的真实准则。
3. Guide 明确要求的一致性，目前是**结构性不满足**。

## 二、参数支持度矩阵

### 1. Guide 策略维度 vs 参数映射

| Guide维度 | 参数支持情况 | 结论 |
|---|---|---|
| 基础吃碰概率、胡牌概率 | `selfWinChance/discardHuChance/pengChance/kongChance/chowChance` | **已支持** |
| 门清保护与破门清代价 | `menqingKeepBonus/discardHuMenQingPenalty/wild0MenqingKeep~wild2MenqingKeep` | **部分支持**，但并未完整映射到 route planner。 |
| 百搭策略 | `wild0Aggression~wild3PlusAggression`, `wildKeepPenalty`, 多组 `wild*Route*Boost` | **参数很多，但使用率失衡**。 |
| 清混一色 / 碰碰胡 / 风牌路线倾向 | `pureFlushPursuit/halfFlushWeight/allPungsPursuit/allHonorsPursuit/allHonorsPungsPursuit/qingPengPursuit/hunPengPursuit` | **名称覆盖多，但代码只使用其中一部分**。 |
| 对手速度、桌面风险、倍数、包牌压力 | `oppTingDetection/safeTilePriority/scoreBehindRiskBoost/scoreLeadDefenseBoost/bao* / wall* / mult*` | **部分支持** |
| 路线锁定、翻线、观察期强弱锁 | 没有直接参数，只有训练指标 `routeCommitRate/routeFlipPerGame` 存于 metrics，不在 policy | **缺少参数层支持** |
| 第一口吃门槛（主门>=6、最优门、不破坏对子刻子） | **无对应参数或规则开关** | **缺失** |
| 五毒散/造反专项评估 | **无参数，无逻辑入口** | **缺失** |
| 听牌收益风险比（平均番数、自摸收益、捉冲收益） | **无专门参数体系**，仅有 `speedVsValueBalance` 等粗参数 | **缺失** |
| 防守/止损高危条件（下家压制、他家做大、回报比极低） | **无直接参数** | **缺失** |
| 开局 A→E 弃牌优先序 | **无显式参数族** | **缺失** |
| 训练指标 `menqingHoldTurns/forcedOpenRate/deadHandRate/tingQuality` | policy 无参数，metrics 也未完整落地 | **缺失** |

### 2. 参数使用情况

根据对 `botService.ts + routeEvaluator.ts + handValidator.ts + train-ai-ak.ts` 的全局扫描，`AI-AK.json` 中 **124 个 policy 参数里仅 119 个在代码文本中出现，5 个完全未被引用**。完全未使用参数如下：

1. `sevenPairsPursuit`
2. `wildOffenseStrategy`
3. `wildBailoutMeldBoost`
4. `flowerChaseBonus`
5. `bailoutBuildWildBoost`

这 5 个属于**确定 dead code**，当前既不影响实战，也不影响训练。

此外，仅在 `botService.ts` 实战侧扫描时，未使用参数更多，说明存在大量“训练里提过、实战里没接”的参数。典型包括：

- `anKongChance`
- `meldPenalty`
- `allHonorsPursuit`
- `qingPengPursuit`
- `hunPengPursuit`
- `wildBailoutThreshold`
- 大量 `wild1Route* / wild2Route* / wild3Route*`
- 大量 `multLowHand* / multHighHand*`
- `wallTilesImpact`
- `robKongAwareness`
- `menqingDoubleAwareness`
- `flushVsPungsBalance`
- `honorVsSuitedBalance`
- `sequenceVsTripletBias`

这些参数虽然可能被训练脚本文本触达，但**没有形成统一的 live bot 主脑输入**，本质上仍是“参数堆积”。

### 3. 参数体系的主要缺口

#### 缺口 A，Guide 有要求但没有参数/规则载体

1. **Route lock persistence**
   - 没有 `lockDecay`、`lockPromoteThreshold`、`flipEvidenceWindow` 之类参数。
   - 结果是 `lockLevel` 只能做瞬时判断，无法调出“连续数巡证据反转才换线”。

2. **第一口吃门槛**
   - 没有参数控制 `targetSuitMinTilesBeforeFirstChow`、`firstChowMustBeBestSuit`、`firstChowPairBreakPenalty`。

3. **止损/防守高危模型**
   - 没有参数表达“下家连续吃碰压制”“他家显著做大”“我方回报比极低时的弃和/弃冲阈值”。

4. **开局弃牌 A→E 排序器**
   - 没有参数表达“上家弃门强度”“最短门见张权重”“外面 3 张风牌后加速清理”等序列策略。

5. **听牌收益风险比**
   - 没有参数控制“听口 vs 番数 vs 自摸收益 vs 捉冲收益”的真实权衡函数。

#### 缺口 B，参数过多但缺少结构化归属

当前 policy 里明显存在**堆参数替代主脑**的问题：

- 大量 `wild*Route*Boost`、`mult*Hand*`、`flushVsPungsBalance`、`honorVsSuitedBalance`、`sequenceVsTripletBias` 等参数在 Guide 中没有一一对应的规则位置。
- 这些参数多数是局部倾向调节，但 Guide 想要的是“阶段 -> 路线 -> 动作 -> 弃牌”的分层决策，不是把所有倾向都塞进 policy 标量。

**结论**：现有参数体系不但**不足以支撑 Guide 的全部策略描述**，还已经出现**冗余膨胀**。问题不是“参数不够多”，而是“缺少真正控制主脑的结构化参数，而有太多散点偏置参数”。

## 三、训练引擎性能制约分析

### 1. 当前训练流程的严重卡点

#### 卡点 1，单次动作评估存在多重嵌套枚举

训练脚本里最重的链路是：

- `evaluateAkPostDiscardState()` 遍历每一种可弃牌（`train-ai-ak.ts:1006-1045`）
- 每个候选弃牌都会调用 `evaluateAkDiscardChoice()`（`770-988`）
- `evaluateAkDiscardChoice()` 内部又调用 `listWinningTilesForReadyHand()` 和 `estimateAkFutureDrawStats()`（`770-798`）
- `estimateAkFutureDrawStats()` 会遍历全部 34 种逻辑摸牌候选（`724-762`）
- 对每一种摸牌候选，再调用 `canWin()` 或 `listReadyDiscardsForHand()`
- `listReadyDiscardsForHand()` 又会再次遍历所有可弃牌，并调用 `listWinningTilesForReadyHand()`（`483-503`）
- `listWinningTilesForReadyHand()` 每次又对 34 种逻辑牌逐个调用 `canWin()`（`478-481`）

这条链路的复杂度接近：

- **每次“评估一张弃牌” = 34 次未来摸牌模拟**
- 其中大量分支又包含 **13 次候选弃牌 × 34 次候选胡牌检测**
- 底层每次胡牌检测进入 `canWin()` 的 DFS / 牌型识别链路（`handValidator.ts:1275-1392`）

这就是训练慢的第一大原因，属于**枚举套枚举套 `canWin()`**。

#### 卡点 2，`canWin()` / `isTing()` 虽有缓存，但仍是热点

- `canWin()` 有 `canWinResultCache`，上限 100000（`handValidator.ts:1307-1316`, `1433-1453`）
- `isTing()` 有 `isTingCache`，上限 50000（`1455-1569`）
- 训练每局开始都会 `clearIsTingCache()` 和 `clearCanWinCache()`（`train-ai-ak.ts:2488-2491`）

这意味着缓存只能在**单局内部**复用，无法跨局积累。对于大规模训练，重复牌型会在下一局重新计算，热点仍然巨大。

#### 卡点 3，训练脚本与实战侧双套评估逻辑并存

训练脚本没有直接复用实战 route/discard/claim planner，而是自带一整套：

- `shouldAkTakeClaim()`（`899-960`）
- `evaluateAkDiscardDecision()`（`972-988`）
- `evaluateAkPostDiscardState()`（`1006-1045`）
- `aiDiscard()`（`1629+`）
- `inferTrainingRouteSignal()`（`2300+`）

结果：
1. 训练速度被这套重逻辑拖慢。
2. 就算慢，优化的也未必是线上同一套决策器。
3. 任何策略改动要维护两份逻辑，回归成本高，易漂移。

#### 卡点 4，单线程串行跑局，没有并发训练框架

`runGame()` 是单局同步执行入口（`2487+`），整体训练脚本通过循环累计结果，没有 worker pool、没有分片并行、没有局级隔离并发。

这会直接导致：
- CPU 只能吃单核或弱并行。
- 一旦 `canWin()` 热点很重，整体吞吐上不去。
- 想把 20 局扩到 1000 局时，时间线性放大。

#### 卡点 5，日志和诊断开销偏大

训练关键路径里有大量 `console.error()` 调试输出，比如 `AK_PENG_DECISION / AK_SKIP_CHOW / INV_TRACE / PENG_SUCCESS` 等（`train-ai-ak.ts:3108-3215` 一带）。即使不是每局都全开，这种 I/O 在批量训练时也会明显拖慢速度，并放大日志内存占用。

### 2. 训练一次 N 局游戏的耗时分布

当前脚本虽然在 `runGame()` 里记录了 `performance.now()`（`2488`, `2492`），但没有把**各阶段耗时分布**真正输出成 profiling 结果，所以无法直接得到精确百分比。

从代码结构看，耗时主要分布应为：

1. **弃牌评估**，最高
   - `aiDiscard()` 会多次评估每个候选弃牌（`1629+`）
   - AI-AK 专用评估又套 `evaluateAkDiscardDecision()` / `evaluateAkDiscardChoice()` / `estimateAkFutureDrawStats()`

2. **胡牌与听牌判定**，第二高
   - `canWin()` / `isTing()` 在每回合、每摸牌、每吃碰判断中被高频调用（`handValidator.ts:1275-1569`）

3. **吃碰后 PASS 对比评估**，第三高
   - `evaluateAkPostDiscardState()` + `shouldAkTakeClaim()` 会在每个可碰/可吃节点上重复运行（`train-ai-ak.ts:3090`, `3171`）

4. **日志 / 诊断统计**，第四高
   - 大量 trace 输出和 route 观测统计。

**结论**：当前没有真正的耗时剖面工具，只有起止时间点，没有阶段 profile。因此“训练一次 N 局耗时分布”目前只能靠静态推断，不能靠脚本直接产出，这是一个**诊断能力缺口**。

### 3. 训练指标采集的实现障碍

#### 已实现的指标

训练脚本当前明确采集了：
- `drawRate`（`3582`, `3915`）
- `selfDrawRate`（`3583`）
- `discardWinRate`（`3584`）
- `bigHandRate`（`3586`）
- `menqingWinRate`（`3587`）
- `routeCommitRate`（`3588`, `3916`）
- `routeFlipPerGame`（`3589`, `3917`）
- `badOpenRate`（`3590`, `3918`）

#### 未实现或实现障碍大的指标

1. **`menqingHoldTurns` 缺失**
   - Guide 要求衡量门清被莫名破坏的时长（Guide 505-508）。
   - 当前训练脚本没有持续记录“从起手到首次开门前保持了多少巡”，也没有区分“合理开门 vs 被迫开门”。

2. **`forcedOpenRate` 缺失**
   - Guide 需要区分“高压下主动破门清”的合理开门比例（Guide 509-513）。
   - 当前只有 `akOpenCount` 和 `akBadOpenCount`（`2225-2245`, `3124-3127`, `3201-3203`），没有“为什么开门”的因果标签，因此不能识别 forced open。

3. **`deadHandRate` 缺失**
   - Guide 要看“中盘锁线后无法收口”的比例（Guide 519-522）。
   - 当前没有持久 routeState，也没有“锁线失败”状态机，所以很难定义 dead hand。

4. **`tingQuality` 缺失**
   - Guide 要求平均听口数、剩余张数、预期番数（Guide 486-492）。
   - 当前只在局部函数里能算 `readyWaits/winDraws`，没有形成全局汇总；更没有“预期番数”模型。

5. **`badOpenRate` 定义失真**
   - 现在的坏开门条件是“开门前路线是 `MENQING_SPEED` 或 route confidence < 2.5”（`3124-3127`, `3201-3203`）。
   - 这和 Guide 的“无显著收益的破门清、破坏主路线、降低听牌质量、第一口门力不足、跨门吃”等定义相差很大。

6. **`routeCommitRate` 有统计，但不等于真正锁线率**
   - 因为当前 routeState 没有跨巡历史，所谓 commit sample 更像“这一巡分差够大”，不是“已经稳定锁线”。

### 4. 架构性限制，对训练效率和收敛速度的影响

#### 限制 1，实战和训练两套逻辑导致目标函数漂移

这会让训练收敛到“训练器最优”，而不是“线上 bot 最优”。属于比速度更严重的架构问题。

#### 限制 2，policy 参数空间过大，且很多参数没有清晰语义边界

当前 policy 超过百个参数，其中不少是局部偏置或 dead code。参数空间过大但主脑结构不稳定，会导致：
- 搜索维度过高
- 有效梯度稀薄
- 调参结果噪声大
- 训练收敛慢且不可解释

#### 限制 3，缺少 route persistence，导致训练指标本身不稳定

`routeCommitRate`、`routeFlipCount` 依赖路线稳定识别，但当前实战/训练都没有真正的跨巡 route memory，所以这些指标本身就有噪声，进一步削弱 fitness 的可信度。

#### 限制 4，缺少 profiling 与 benchmark 基线

Guide 要求固定对照组（Guide 524-539），但当前脚本没有系统化输出每版耗时、每模块耗时、每组对照的 profile。训练效果和性能无法被一起回归。

#### 限制 5，缓存策略过于局部

按局清空缓存虽然安全，但会放弃大量跨局重复牌型收益，导致大规模训练吞吐不佳。若未来跑 1000 局以上，这会成为明显瓶颈。

## 四、关键发现汇总

1. **路线系统已搭骨架，但还没有真正“锁线主脑”**。
   - 五路线、阶段、claim/discard planner 都有了。
   - 但 `lockLevel` 是瞬时值，不是跨巡持久 routeState。

2. **当前实现最明显违背 Guide 的地方，是仍在“美化门清”**。
   - `MENQING_SPEED` 固定高底分（`routeEvaluator.ts:122-134`）是直接证据。

3. **动作约束层比弃牌层完成度更高**。
   - 二段式 PASS 比较、互斥规则、路线型禁吃已落地。
   - 第一口吃门槛、收益风险型拒胡仍未落地。

4. **弃牌层仍是“legacy heuristic + route bias”混合体**。
   - 不是纯 Guide 型的路线服务排序器。
   - 开局 A→E 优先序基本未实现。

5. **训练指标里 `routeCommitRate`、`badOpenRate` 已有名字，但定义不够真**。
   - `badOpenRate` 过窄，`routeCommitRate` 过虚。

6. **训练与实战两套决策器并存，是当前最严重的架构问题**。
   - 这会同时拖慢训练、降低收敛质量、增加维护成本。

7. **参数体系已经出现“该缺的没缺、该少的太多”**。
   - 缺少 route lock、防守止损、第一口吃、听牌收益风险等结构化参数。
   - 反而堆了大量野生偏置参数和 5 个确定 dead code 参数。

## 五、优先修复建议（按 P0/P1/P2 排序）

### P0

1. **统一实战与训练决策内核**
   - 目标：训练直接调用 `evaluateRouteState() / evaluateRouteClaim() / scoreRouteDiscardCandidate()`。
   - 原因：这是解决“训练目标漂移”的第一优先级。

2. **补齐真正的 `routeState` 持久化与锁线机制**
   - 为玩家状态增加：`currentRoute`, `lockStrength`, `routeHistory`, `evidenceWindow`。
   - 只有连续数巡证据反转才允许翻线。
   - 同步把 `routeFlipCount` 改成基于持久 routeState 的真实统计。

3. **下调或移除 `MENQING_SPEED` 固定高基线**
   - 把“门清强”改成依赖废牌数、对子数、长门强度、他家速度等条件触发。
   - 否则 Guide 的核心纠偏目标不会实现。

4. **把第一口吃门槛做成硬规则**
   - 至少实现：主门>=6、claimTile 属于最优门、吃后不破坏核心对子刻子。
   - 同步接入 `badOpenRate` 诊断。

5. **重写 `badOpenRate` 定义**
   - 把以下都计入坏开门：
     - 无明显降向听/增听口
     - 破坏主路线
     - 降低听牌质量或番型上限
     - 违反第一口吃门槛
     - 违反跨门吃约束

### P1

1. **重构路线评分输入**
   - 在 `buildFeatureSummary()` 新增：
     - 他家副露次数
     - 下家压制强度
     - 他家单门倾向
     - 我方废牌数
     - 7/9 张混清一色阈值信号
     - 4 对+百搭碰碰胡强推信号

2. **重构开局弃牌 A→E 规则层**
   - 不要只靠线性打分。
   - 建议先按 A→E 分类，再在类别内做 route-aware 排序。

3. **补齐 `forcedOpenRate / menqingHoldTurns / deadHandRate / tingQuality`**
   - 这些是 Guide 明确要求的训练验收指标，当前无法验收真正策略质量。

4. **给训练脚本加 profiling**
   - 输出：弃牌评估耗时、吃碰评估耗时、`canWin()` 调用次数与命中率、单局总耗时。
   - 当前已有 `performance.now()` 但没有分段统计。

5. **清理 dead code 参数**
   - 至少先冻结或删除 5 个完全未使用参数，避免训练浪费维度。

### P2


2. **把听牌收益风险比显式化**
   - 为冲刺期增加 `expectedFan`, `tsumoValue`, `ronValue`, `riskCost` 估值器。

3. **优化缓存策略**
   - 研究跨局复用安全缓存，或至少在训练批次内保留只读 memo。

4. **压缩参数空间**
   - 将大量 `wild*Route*Boost` / `mult*Hand*` 参数归并成更少、更有语义的结构化参数，提升训练收敛稳定性。
# 2026-04-28 落地更新

## 已完成

- [x] AI-AK 最新 live policy 与做牌路径已共享到 `AI-阿水 / AI-小胖 / AI-老赵 / AI-小猪`
- [x] 路线规划入口已从仅 `AI-AK` 扩展为共享策略 bot 共用
- [x] 第一口吃牌硬门槛已落地
- [x] 规则包括：主门数牌至少 6 张、claim tile 必须属于当前最优门、吃后不能拆核心对子/刻子
- [x] 训练脚本产出的最优策略会同步保存到上述 5 个角色文件
- [x] 最小可用 route persistence 已落地，当前会基于上一次 routeState 做弱持久化锁线，降低每巡随意翻线
- [x] `MENQING_SPEED` 固定高基线已下调，不再默认美化门清
- [x] 路线评估新增敌情输入：全桌副露速度、下家压制、对手单门外显压力
- [x] `HALF_FLUSH / ALL_PUNGS / HONOR_HEAVY` 已补入更强阈值信号，避免只靠线性打分
- [x] 训练侧 `badOpenRate` 已部分收紧：第一口吃闸门违规会计入坏开门判定
- [x] 训练诊断已新增 `forcedOpenRate` 近似指标（被压开门率）
- [x] 训练诊断已新增 `tingQuality` 第一阶段落地：`AI-AK` 平均听口
- [x] 观察期开局弃牌器已补一层顺序规则：短门单张优先、顺上家弃门优先、长门对子回避

## 暂不在本次直接落地

- [ ] 训练器与实战决策内核彻底统一
- [ ] 开局 A-H 弃牌顺序器完整重构
- [ ] 更完整的 route history / evidence window / forcedOpenRate / tingQuality 指标体系
- [ ] 训练侧“拆核心对子/刻子”的坏开门判定还未完全镜像到 live claim planner
- [ ] `tingQuality` 仍缺“剩余张数 / 预期番型”层
- [ ] `forcedOpenRate` 目前还是近似高压判定，尚未细化到更严格的因果标签

## 2026-04-28 第二轮落地更新

### 新完成

- [x] 训练侧第一口吃牌闸门继续收紧：现在会额外拦截“为首口吃而拆核心对子/刻子”的场景
- [x] 训练侧 `badOpenRate` 口径已继续收紧：会把无明显降向听/增听口、伤害听牌质量、破坏目标路线的开门计入坏开门
- [x] 训练诊断已补入 `menqingHoldTurns`，并接入训练摘要与 metrics 输出
- [x] 训练诊断已把 `tingQuality` 从“平均听口”扩到“平均听口 + 进听成牌张数”组合指标，并接入 fitness
- [x] 已补回归：训练器首口吃拆核心对子时必须拒绝开门
- [x] 训练侧 route 信号已开始直接复用 live `evaluateRouteState()`，不再只走训练脚本内的独立 route heuristic
- [x] 训练侧 claim 判定已开始直接复用 live `evaluateRouteClaim()` 作为硬闸门
- [x] 训练侧 discard 排序已开始直接复用 live `scoreRouteDiscardCandidate()`，缩小训练/实战分叉
- [x] `tingQuality` 已继续扩到“剩余可摸胡张数 / 预期番型 / 风险成本”并接入训练摘要与 fitness

### 仍待继续推进

- [ ] 训练器直接复用 live `evaluateRouteState() / evaluateRouteClaim() / scoreRouteDiscardCandidate()`，彻底消除训练/实战双内核
- [ ] 把训练脚本中残留的 legacy discard heuristic 进一步下沉，避免 live route score 之外还有过重的旧结构分
- [ ] `forcedOpenRate` 从近似高压统计升级为更严格的因果标签
- [ ] 开局 A-H 弃牌顺序器完整重构
### 2026-04-28 è®­ç»ƒ/å®žæˆ˜å¹¶è½¨è¿½åŠ 

- [x] è®­ç»ƒ discard æŽ’åºå·²æ”¹æˆ live planner composite ä¸»å¯¼ï¼Œ`scoreRouteDiscardCandidate()` ä¸Ž shanten/effective/timing æˆä¸ºä¸»æŽ’åºä¾æ®ï¼Œæ—§ `evaluateAkDiscardChoice()` åˆ†æ•°é™ä¸ºå¼±æƒé‡
- [x] `AI-AK / AI-é˜¿æ°´ / AI-å°èƒ– / AI-è€èµµ` åœ¨è®­ç»ƒè„šæœ¬ä¸­å·²å…±ç”¨åŒä¸€å¥— route-aware claim/discard å…¥å£ï¼Œä¸å†åªæ˜¯åŒæ­¥ character policy æ–‡ä»¶
- [ ] legacy discard heuristic å·²é™æƒï¼Œä½† `evaluateAkDiscardChoice()` å†…éƒ¨ä»æœ‰å¤§é‡æ—§ç»“æž„åˆ†ï¼ŒåŽç»­è¦ç»§ç»­æ‹†é™¤æˆ–æ”¶ç¼©åˆ°çº¯ tie-break å±‚
### 2026-04-28 P0/P1 æŒç»­æŽ¨è¿›

- [x] è®­ç»ƒ discard æŽ’åºä¸­ legacy `evaluateAkDiscardChoice()` å¯¹ live composite çš„å¹²æ‰°å·²ç»§ç»­ä¸‹è°ƒï¼Œplanner ä¸­åªä¿ç•™å¾ˆå¼±çš„ structure tie-break æƒé‡
- [x] claim å†³ç­–å·²ä»Ž discard è¯„åˆ†ä¸­æ‹†å‡ºç‹¬ç«‹ shape evalï¼Œ`åƒ/ç¢°è¦ä¸è¦å¼€` ä¸å†ç›´æŽ¥å— discard route/composite æŽ’åºå™¨å½±å“
- [x] `evaluateAkDiscardChoice()` å·²ç»§ç»­ç˜¦èº«ï¼Œdiscard ä¾§åªä¿ç•™å±€éƒ¨ isolate/pair/nearby tie-break å’Œæžå¼± shape æ®‹ä½™ï¼Œä¸å†æ‰¿æ‹…å¤§å— shape ä¸»è¯„åˆ†
- [ ] `evaluateAkDiscardChoice()` æœ¬ä½“è¿˜æ˜¯å¤§å—æ—§ç»“æž„åˆ†å™¨ï¼ŒåŽç»­è¦ç»§ç»­æ‹†å†æˆâ€œclaim ç”¨ shape evalâ€ä¸Žâ€œdiscard ç”¨ tie-break evalâ€
- 
## 2026-04-28 Final Wrap-up

### Completed in this round

- [x] Training-side discard ranking now follows live planner composite first, with `scoreRouteDiscardCandidate()` + shanten/effective/timing as the primary ordering signal.
- [x] Legacy `evaluateAkDiscardChoice()` influence in training discard ordering was reduced again; the old structural score is no longer the main driver.
- [x] Claim evaluation and discard evaluation were split one layer further:
- claim-side post-open comparison now uses dedicated shape evaluation.
- discard-side keeps only local tie-break style signals.
- [x] Shared training route logic now applies to `AI-AK`, `AI-阿水`, `AI-小胖`, and `AI-老赵`; they temporarily share one strategy and route logic.
- [x] Shared policy output remains synchronized from training saves for the shared character set, and the save path still also updates `AI-小猪`.

### Current remaining P0/P1 follow-up

- [x] `evaluateAkDiscardChoice()` has now been finished as an explicit discard tie-break scorer (`evaluateAkDiscardTieBreak()`), with shape evaluation and live route scoring removed from that helper.
- [ ] Continue closing the `forcedOpenRate` loop so the metric is fully aligned with live open/route pressure and training penalties.
- [ ] Keep `MAHJONG_IMPROVEMENT_PLAN.md` as the single source of truth for these training/live route convergence steps.
