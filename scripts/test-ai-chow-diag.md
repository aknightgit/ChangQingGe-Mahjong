# AI 吃牌诊断指南

## 问题定位

AI 不吃牌有 4 个可能的卡点：

```
弃牌 → ① checkPendingActions 创建 pendingAction (含 CHOW)
     → ② shouldClaimPendingAction 评估是否吃
     → ③ resolveBotChowNow 执行吃牌
     → ④ handleChow 实际操作
```

## 快速诊断方法

### 方法1：看服务器日志关键词

在服务器运行一局 4 bot 对战，搜索以下日志：

```bash
# 1. pendingAction 是否创建了 CHOW
grep "checkPendingActions\|availableActions" logs/*.log | grep -i "chow"

# 2. bot 是否进入决策流程
grep "\[BotService\]" logs/*.log

# 3. 吃牌是否被路由拒绝
grep "\[ClaimDecider\]" logs/*.log

# 4. 最终执行结果
grep "\[PendingResolve\]" logs/*.log | grep -i "chow"
```

### 方法2：临时加诊断日志

在 `actionHandler.ts` 的 `checkPendingActions` 末尾加：

```typescript
// ★ 诊断日志（测试完删除）
for (const pa of game.pendingActions) {
  const p = game.players.find(pl => pl.id === pa.playerId);
  console.log(`[CHOW_DIAG] ${p?.name} availableActions=[${pa.availableActions}] chowOptions=${pa.chowOptions?.length ?? 'undefined'} tile=${pa.tile?.suit}-${pa.tile?.value}`);
}
```

### 方法3：运行单元测试

```bash
node scripts/test-ai-chow.mjs
```

## 已修复的 Bug (commit e8a4cdb)

### Bug 1: resolveBotChowNow 双重评估（主因）
- **现象**：bot 决定吃牌后，resolvePendingAction 再次调用 shouldClaimPendingAction
- **根因**：shouldClaimPendingAction 使用 sigmoid + Math.random() 概率采样
- **后果**：第一次评估"应该吃"，第二次可能返回 PASS → 吃牌被推翻
- **修复**：resolveBotChowNow 直接调用 handleChow

### Bug 2: handleBotPendingActions PENG+CHOW 跳过
- **现象**：bot 有 PENG+CHOW 时，只评估 PENG，CHOW 被过滤
- **后果**：决定不碰后，CHOW 也被跳过
- **修复**：不碰时评估 CHOW

### Bug 3: freeze timer 回调同样双重评估
- **现象**：gameManager.ts 的 freeze timer 回调也通过 resolvePendingAction
- **修复**：直接调用 handleChow

## 验证步骤

1. 部署修复后代码
2. 开一局 4 bot 对战
3. 观察日志中是否出现 `[PendingResolve] xxx → CHOW`
4. 如果仍然没有吃牌，检查 `[CHOW_DIAG]` 日志看 pendingAction 是否包含 CHOW
