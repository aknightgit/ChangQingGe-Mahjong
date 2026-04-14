# 待跟进事项 (Pending Items)

## P1 待跟进项

| 序号 | 问题 | 来源 | 优先级 | 状态 |
|------|------|------|--------|------|
| P2-5 | A/B 验证 pipeline scorer 效果 | 老高 review | P1 | 进行中 |
| P2-6 | 出牌 tile ID 类型错误，需完整接入 ActionType | 老高 review | P1 | ✅已完成（4cb3bb2） |

### P1 备注
- P2-5: pipeline scorer 只接管吃/碰决策，出牌仍走 legacy 逻辑
- P2-6 完成（4cb3bb2）：PENG/CHOW 改为 ['PENG','PASS'] 和 ['CHOW','PASS'] 分数比较，替代硬编码 0.5 阈值

---

## P2 老高建议方案

### P2-7: calculateShanten 占位符实现 ✅
**状态**: 已完成
**commit**: d080302
**改动**: `computeShanten` 从 botService.ts 导出，featureExtractor.ts 引用，消除占位符 `Math.abs(diff)`

### P2-8: dangerToOthers/opponentTingCount 硬编码 ✅
**状态**: 已完成
**commit**: d080302
**改动**:
- `assessDangerToOthers`: 基于已现张比例（周边牌已现越多=越安全）× baseDanger系数（字牌/幺九低，中张牌高）
- `estimateOpponentTingCount`: 基于副露数+巡目推断（≥3副露=0.85，2副露+晚巡=0.4，早期/0副露=0.1）

### P2-9: CJS/ESM 混用问题 ✅
**状态**: 已完成
**commit**: d080302
**改动**: `getPipelineEngine()` 改用 ESM `import()` 替代 `require()`，`shouldClaimPendingAction` 改为 `async`，所有调用方已更新

### P2-10: 造反/聚义闭环
**状态**: 常规优化
**工时**: 2天
**方案**: 待细化

### P2-11: AI 特征工程
**状态**: 常规优化
**工时**: 3天
**方案**: 待细化

---

## 更新记录
- 2026-04-14: 初始化，添加老高 review 待改进项
- 2026-04-14 19:35: P2-7/P2-8/P2-9 已完成（commit d080302）
- 2026-04-14 19:58: P2-6 已完成（commit 4cb3bb2）；P2-5 进行中
