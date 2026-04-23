# 麻将训练 & 报告改进计划

> 建立时间：2026-04-23
> 状态说明：[TODO] 待修 ｜ [IN_PROGRESS] 进行中 ｜ [DONE] 已修 ｜ [WONT_FIX] 已知不改

---

## 一、训练报告层 Bug（5项）

### [TODO] Bug-001：骰子信息显示 "?"
**文件**：`server/utils/scoring.ts`
**现象**：最大赢局明细里骰子点数和骰子倍数永远显示 `?`
```
骰子点数: ?
骰子倍数: ×?
```
**根因**：`roundMultiplier` 已在 `scoring.ts` 中计算，但输出模板（`details.push`）没有引用该字段。
**修复方向**：在 `settlementSseLog.details` 的 `globalMultiplier` 分支中输出 `roundMultiplier` 的实际值。

---

### [TODO] Bug-002：平均回合/平均总筹码 显示 "—"
**文件**：`scripts/training-reporter.ts`（或对应报告生成处）
**现象**：`平均回合` 和 `平均总筹码` 两项直接显示 `"—"` 未计算。
**修复方向**：在报告生成阶段，对所有非流局计算 `roundCount` 总和和 `totalChips` 总和并取均值。

---

### [TODO] Bug-003：detail-round 文件标题永远是"第1局"
**文件**：`scripts/training-reporter.ts` 或 `scripts/train-ai-ak.ts`（写文件处）
**现象**：`detail-round-003-2026-04-23T16-06-41.md` 内含游戏编号 55，但标题写的是"第1局完整明细"。
**修复方向**：把 `"第1局完整明细"` 改为实际游戏编号（如 `"第55局完整明细"`）。

---

### [TODO] Bug-004：胡牌牌型分布只统计 AI-AK，不含其他三个玩家
**文件**：`scripts/training-reporter.ts`
**现象**：四个人对战，但 `胡牌牌型分布` 表只输出 AI-AK 的数据，`AI-小胖 / AI-阿水 / AI-老赵` 的统计缺失。
**修复方向**：在报告聚合阶段，收集所有四个玩家的 `detectHandTypes` 结果，汇总到同一张牌型分布表。

---

### [TODO] Bug-005：多人胡牌率显示 0%，准确性未知
**文件**：`scripts/training-reporter.ts`
**现象**：`多人胡牌率` 始终为 0%，但未验证过计算逻辑是否正确。
**修复方向**：对照 `settlementLog` 实际数据验证多人胡牌（2人+同时胡）的计数逻辑。

---

## 二、游戏逻辑 Bug（3项）

### [TODO] Bug-006：手牌数 + 门口牌数 少于14张
**文件**：`server/services/botService.ts` 及相关手牌/副露渲染逻辑
**现象**：训练日志中大量出现"手牌13张 + 门口牌0张 = 13张"的情况，不符合麻将14张标准。
**修复方向**：在 `aiDiscard()` 和 `botService.ts` 中加入校验，确认每次出牌前后手牌数符合 `3n+2` 规则（14/11/8/5/2 张）。

---

### [TODO] Bug-007：放冲牌与实际手牌不一致
**文件**：`server/utils/scoring.ts` 的 `discarderId` 传值逻辑
**现象**：赢局55明细中，标注"放冲牌: 四条"，但实际手牌里根本没有四条。
```
放冲牌: 四条
手牌: 六筒* 六筒* 二条 四条 五条 六条 中 中 （手牌里无四条）
```
**修复方向**：验证 `settlementSseLog` 里 `discarderId` 是否正确传入了放冲玩家的索引，以及渲染时 `winnerHand` 和 `discardedTile` 的对应关系。

---

### [TODO] Bug-008：maxWinAmount / settlementLog.fan 显示异常
**文件**：`scripts/training-reporter.ts` 的 `recordWinner()` 函数
**现象**：赢局50中，maxWinAmount 显示与实际结算不符。
**修复方向**：检查 `recordWinner` 中 `fullHandTiles` 是否正确使用 `手牌+副露` 而非仅手牌。

---

## 三、策略层问题（高优先级，影响训练收敛）

### [TODO] Strategy-001：AI-AK 从不主动做牌，500局全靠捉冲胡
**文件**：`server/services/botService.ts` 的 `aiDiscard()`
**现象**：
- 500局训练中 3次胡牌，全是捉冲，0次自摸
- 诊断：`AI-AK 从未出现可胡机会的局数: 100/100`
- Fitness 每轮几乎相同（-5093 到 -5143），遗传算法未在学习

**根因初步判断**：
- `aiDiscard()` 的拆牌惩罚（`nearWeight` / `tripletKeepBonus` 相关）过重
- 前期强拆门导致正常成型路径被拆烂
- `canWin` 检查虽然可用，但 `aiDiscard()` 策略没给做牌留空间

**修复方向**：
1. 在 `aiDiscard()` 中，当手牌数 ≤ 5 时，大幅降低拆门惩罚，优先保成型
2. 引入"做牌信号"：若某门牌数 ≥ 9 张，压制该门的单张拆出
3. 在 `evaluateChowValue` 中门清惩罚目前只有 15%，需提升至 ≥50%

---

### [TODO] Strategy-002：98%流局率，AI完全不会自摸
**文件**：`server/services/botService.ts`
**现象**：即使 `canWin` 函数已知可用，AI 也从不触发自摸。
**修复方向**：检查 `botService.ts` 的自摸判定逻辑，确认 `selfDrawCheck()` 在 AI 回合有被触发。

---

## 四、报告输出规范

### [TODO] Report-001：训练日志输出目录确认
**说明**：`train-ai-ak.ts` 的 `OUT_DIR` 指向 workspace 下：
```
/home/node/.openclaw/workspace/ChangQingGe-Mahjong/training-output/
```
需同步更新文档，避免与 `/data/mahjong-training/training-output/` 混淆。

---

### [TODO] Report-002：模型名归一化（MyIsland 用量看板）
**文件**：`MyIsland/server/api/model-usage.get.ts`
**状态**：仅 `MiniMax M2.7` 修好，仍有以下待处理：
```
lmstudio:qwen/qwen3.5-35b-a3b
lmstudio:qwen/qwen3.5-9b
openrouter:z-ai/glm-4.5-air:free
siliconflow:deepseek-ai/DeepSeek-V3.2
quan2go:gpt-5.4
quan2go:gpt-5.3-codex
wincodex:gpt-5.4
wincodex:gpt-5.3-codex
wingpt:gpt-5.4
```
**修复方向**：在 `normalizeModel()` 函数中添加以上所有前缀的映射。

---

## 五、已知高优先级系统问题

### [WONT_FIX] Cron-Voyage：embedding 监控 cron 持续超时
**文件**：`/home/node/.openclaw/workspace/scripts/voyage-check.sh`
**状态**：2026-04-23 已改为纯 shell 脚本，不再走 agent 层，理论上已解决，需观察。

---

## 更新记录

| 日期 | 更新内容 |
|------|---------|
| 2026-04-23 | 初始化文档，整理 5 项报告 Bug、3 项游戏逻辑 Bug、2 项策略问题、2 项报告规范 |
