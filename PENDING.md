# 待跟进事项 (Pending Items)

## 老高 Review 待改进项 (2026-04-14)

| 序号 | 问题 | 来源 | 优先级 | 状态 |
|------|------|------|--------|------|
| P2-5 | A/B 验证 pipeline scorer 效果 | 老高 review | P1 | 待跟进 |
| P2-6 | 出牌 tile ID 类型错误，需完整接入 ActionType | 老高 review | P1 | 待跟进 |
| - | calculateShanten 是占位符实现 | 老高 review | P2 | 待跟进 |
| - | dangerToOthers/opponentTingCount 硬编码返回固定值 | 老高 review | P2 | 待跟进 |
| - | CJS/ESM 混用问题（require vs import） | 老高 review | P2 | 待跟进 |

## 备注

- P2-5: pipeline scorer 只接管吃/碰决策，出牌仍走 legacy 逻辑
- 等 P2-6 扩展 ActionType 支持具体 tile 再完整接入