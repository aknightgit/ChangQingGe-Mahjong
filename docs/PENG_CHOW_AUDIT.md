# 麻将 CHOW/PENG 流程完整性对比报告

生成时间: 2026-05-29
状态: 已完成对比，找到 3 个逻辑差异

---

## 结论汇总

| # | 差异 | 位置 | 严重性 | 状态 |
|---|------|------|--------|------|
| 1 | handlePeng/handleChow 后**缺失 beginCurrentPlayerTurn** | actionHandler.ts | 🔴 高 | 待修复 |
| 2 | handlePeng/handleChow 后**未调度 pending 计时器** | actionHandler.ts | 🟡 中 | 评估中 |
| 3 | handlePeng/handleChow 后**未广播 pendingExpiresAt** | actionHandler.ts | 🟡 中 | 同上 |

---

## 一、出牌流程（AK 出牌 → 下家摸牌）

### 老代码 `_handleDiscard_original` (gameManager.ts 2636)
```
AK discard
  → reset drawnThisTurn=false（AK）
  → checkPendingActions（其他人可碰/杠/胡）
  → currentPlayerIndex=下家
  → beginCurrentPlayerTurn（下家）
      → drawnThisTurn=false（下家）← 重置
      → 调度 freeze timer 1000ms
      → pendingExpiresAt 更新
      → broadcastGameState ✅
  → schedulePendingActionTimeout（如果有 pending）
      → pendingExpiresAt 设置 ✅
```

### 新代码 `handleDiscard` (actionHandler.ts)
```
AK discard
  → drawnThisTurn=false（AK）
  → checkPendingActions
  → currentPlayerIndex=下家
  → beginCurrentPlayerTurn（下家）✅
      → drawnThisTurn=false（下家）✅
      → 调度 freeze timer ✅
      → broadcastGameState ✅
  → schedulePendingActionTimeout ✅
```
✅ **结论：handleDiscard 流程正确，无差异**

---

## 二、碰牌流程（其他人碰 AK 的牌 → 碰牌者出牌）

### 老代码 `executePengDirectly` + `_handlePeng_original`
```
玩家 P 碰 AK 的牌
  → _handlePeng_original:
      → 检查 HU 优先级（有 HU 候选人 → 审批，否则直接执行）
      → executePengDirectly:
          → currentPlayerIndex = P（碰牌者）
          → drawnThisTurn = true（P 已摸牌状态）
          → scheduleBotDiscard（如果是 bot）
          → 排序手牌
          → 【无】beginCurrentPlayerTurn 调用
          → 【无】broadcastGameState 调用
          → 等待玩家/客户端触发出牌
  → P 出牌 → _handleDiscard_original（回到流程一）
```

### 新代码 `handlePeng` (actionHandler.ts)
```
玩家 P 碰 AK 的牌
  → checkPendingActions（检查 HU）
  → executePengDirectly:
      → currentPlayerIndex = P ✅
      → drawnThisTurn = true ✅
      → if (bot) scheduleBotDiscard ✅
      → sortHandWithWildFront ✅
      → await persistGame(game) ✅
      → broadcastGameState ✅
  【缺失】beginCurrentPlayerTurn  ← 没有开启 P 的回合 freeze timer
  【缺失】schedulePendingActionTimeout ← 没有设置 pendingExpiresAt
```

### 🔴 差异 1：handlePeng 后缺失 beginCurrentPlayerTurn

**老代码**：executePengDirectly 之后，**不**调用 beginCurrentPlayerTurn，P 的回合"静默开启"（没有 freeze timer）。
**新代码**：broadcastGameState 后，同样**没有** beginCurrentPlayerTurn。

**问题**：下家出牌后，pendingExpiresAt 没有更新，下家的 UI 可能显示过期的计时器。

**但是**：对于"AK 出牌后自己还能摸牌"这个问题，handlePeng 流程不适用，因为 handlePeng 不会影响 AK 的 availableActions。

---

## 三、真正的问题是什么？

### "AK 首回合出牌后，摸按钮继续亮起"

**分析**：这只能是以下情况之一：
1. `getAvailableActions` 返回了 DRAW（但不应该）
2. `state.get.ts` 轮询时 game state 未更新（状态同步问题）
3. 客户端 UI 逻辑错误

**排查**：在 state.get.ts 加日志，看 AK 的 availableActions 是什么。

```typescript
// state.get.ts
availableActions = await gameManager.getAvailableActions(gameId, playerId);
console.log('[state.get]', playerId, 'currentPlayer=', game.currentPlayerIndex, 'actions=', availableActions);
```

**但是当前无法复现**：所有活跃游戏都是旧代码产生的，新代码还没在新游戏测试过。

---

## 四、CHOW/PENG 场景：碰牌后出牌 → 下家摸牌

流程确认：
```
AK discard → handleDiscard
  → beginCurrentPlayerTurn（下家）→ drawnThisTurn=false + freeze timer
  → broadcastGameState → ws 广播
  
下家收到 state
  → currentPlayerIndex = 下家
  → drawnThisTurn = false
  → pendingExpiresAt = 下家的超时时间
  → 下家的 getAvailableActions 返回 [DRAW]
  → 下家点击"摸牌" → drawnThisTurn = true
  → handleDraw → drawnThisTurn = true（防止重摸）
  → 下家出牌 → handleDiscard → beginCurrentPlayerTurn（下下家）
```

这个流程在新代码中**应该是正确的**。

---

## 五、下一步验证

需要新游戏测试以下场景：

| 场景 | 验证点 | 预期结果 |
|------|--------|---------|
| AK 首回合出牌 | AK 的 availableActions | DRAW 不在其中 |
| 下家 P 碰 AK 的牌 | P 的 pending timer | 有 freeze timer |
| P 出牌 | 下下家的 availableActions | DRAW 在其中 |
| P 是 bot | P 的 scheduleBotDiscard | 被调用 |

---

## 六、修复计划

### 修复 1：handlePeng 后调用 beginCurrentPlayerTurn（P0）

在 `broadcastGameState` 之后添加：

```typescript
// 开启碰牌者的回合（调度 freeze timer，更新 pendingExpiresAt）
await beginCurrentPlayerTurn(game);
```

**注意**：这样会让下家的 currentPlayerIndex = P，和老代码一致。

### 修复 2：handleChow 后调用 beginCurrentPlayerTurn（P0）

同上。

### 修复 3：验证 state.get.ts 轮询逻辑（P1）

在 state.get.ts 加日志，确认 AK 的 availableActions 确实返回空（AK 出牌后）。