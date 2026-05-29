# ActionHandler 拆分完整性审计报告

生成时间: 2026-05-29
目的: 对比 gameManager 原始方法 vs actionHandler 新方法，找出逻辑差异

---

## 一、executeAction switch-case（gameManager.ts 2480-2545）

老代码 `executeAction` 的 PENG/CHOW/KONG 分支：

```
case PENG:
    this.handlePeng(game, player)   // → actionHandler.handlePeng
    // 【无】drawnThisTurn 设置
    break;
case CHOW:
    this.handleChow(game, player, tileIds)  // → actionHandler.handleChow
    // 【无】drawnThisTurn 设置
    break;
case KONG:
    this.handleKong(game, player, tileId)  // → actionHandler.handleKong
    // 【无】drawnThisTurn 设置
    break;
```

**关键发现**：
- 老代码在 PENG/CHOW/KONG 分支，**不**在 switch-case 层设置 `drawnThisTurn`
- `drawnThisTurn = true` 由 actionHandler.handlePeng/handleChow 自己设置（已确认）
- 这意味着 gameManager.executeAction 的 switch-case 层，对 PENG/CHOW/KONG 来说，只是一个路由

---

## 二、getAvailableActions 的 availableActions 返回逻辑

```typescript
// gameManager.ts getAvailableActions()
if (currentTurnPlayer?.id === playerId && this.canPlayerDrawOnCurrentTurn(game, player)) {
    return [ActionType.DRAW];  // ← 唯一返回 DRAW 的路径
}
```

`canPlayerDrawOnCurrentTurn` = `当前是你 AND drawnThisTurn=false AND 手牌<14 AND 牌墙有牌`

**重要**：`getAvailableActions` 的 `currentPlayer` 判断：
```typescript
const currentPlayer = game.players[game.currentPlayerIndex];
```
这直接依赖 `game.currentPlayerIndex`。如果 `handleDiscard` 后 `currentPlayerIndex` 已更新为下家，则 AK 的 `currentPlayerIndex !== AK.id`，`canPlayerDrawOnCurrentTurn` 返回 false → 不返回 DRAW。

---

## 三、gameManager.ts 中的 beginCurrentPlayerTurn（4944-4990）

```typescript
private async beginCurrentPlayerTurn(game: GameState): Promise<void> {
    const nextPlayer = game.players[game.currentPlayerIndex];
    // 【关键修复】新回合:重置摸牌状态
    game.drawnThisTurn = false;
    game.huSelectionLocks = undefined;

    // ... freeze timer 调度（1000ms，人类AI通用）...
    if (game.freezePlayerId === nextPlayer.id) {
        // 冷冻解除逻辑
    }

    // 【广播】broadcastGameState 内部调用
    // wsManager?.to(roomId).emit('game:state-changed', {...})
}
```

**关键**：freeze timer 在 beginCurrentPlayerTurn 内部调度，时长 1000ms（hesitationWindow）。

actionHandler.handlePeng/handleChow 之后：
- drawnThisTurn = true
- bot: scheduleBotDiscard
- broadcastGameState
- **没有**调用 beginCurrentPlayerTurn

这意味着**下家的回合没有开启 freeze timer**！下家的 `pendingExpiresAt` 没有被更新！

---

## 四、broadcastGameState 是否发送 pendingExpiresAt？

```typescript
// broadcastGameState 发送的数据
{
    players: [...],
    currentPlayerIndex,
    pendingExpiresAt: game.pendingExpiresAt,  // ← 这个字段是否被设置？
    ...
}
```

`pendingExpiresAt` 在 `schedulePendingActionTimeout` 中设置：
```typescript
game.pendingExpiresAt = now + this.getHesitationWindow(game);
```

**handleDiscard** 调用：
1. beginCurrentPlayerTurn(game) → 重置 drawnThisTurn=false，调度 freeze timer
2. schedulePendingActionTimeout → 设置 pendingExpiresAt

**handlePeng** 执行后：
- 没有调用 beginCurrentPlayerTurn
- 没有调用 schedulePendingActionTimeout
- pendingExpiresAt 还保持着上一次（可能是上家出牌时设置的值）的旧值

---

## 五、待核实问题列表

| # | 问题 | 严重性 | 验证方法 |
|---|------|--------|---------|
| 1 | handlePeng/handleChow 后下家没有 freeze timer | 高 | 看 PM2 日志是否有下家的 "resetting drawnThisTurn" |
| 2 | AK 出牌后，getAvailableActions 返回的 availableActions 是否正确 | 高 | 在房间 7882 加断点 |
| 3 | pendingExpiresAt 在 handlePeng 后没有更新 | 中 | 看 broadcastGameState 数据 |
| 4 | 客户端 receive 'game:state-changed' 后是否正确刷新 | 高 | 检查 gameroom/[roomId].vue |
| 5 | beginCurrentPlayerTurn 内的 ws 广播是否在 actionHandler 中调用 | 高 | handleDiscard 调用 beginCurrentPlayerTurn → 内部有 ws 广播 |

---

## 六、actionHandler.handlePeng 完整流程（已确认）

```
1. checkPendingActions(game, tile)  ← 检查 HU 优先级
2. executePengDirectly:
   - game.currentPlayerIndex = player.index  ← 设置当前玩家
   - game.drawnThisTurn = true
   - if (bot) scheduleBotDiscard(gameId, playerId)
   - sortHandWithWildFront
3. await persistGame(game)
4. this.deps.broadcastGameState(game.gameId)  ← 广播
```

**缺失**：
- 没有调用 beginCurrentPlayerTurn（游戏状态停留在当前玩家）
- 没有调度新的 freeze timer
- 没有更新 pendingExpiresAt
- 下家的回合状态没有开启

---

## 七、根因假设

**AK 首回合出牌后，摸按钮继续亮起**的最可能原因：

```
AK discard → handleDiscard
  → beginCurrentPlayerTurn(下家) → drawnThisTurn=false, currentPlayerIndex=下家
  → broadcastGameState(新状态) → ws 广播到客户端
  
【问题】客户端收到 state-changed，但 getAvailableActions 的缓存没有刷新？
【问题】或者 state-changed 广播的 currentPlayerIndex 错误？
```

需要确认：客户端收到 `game:state-changed` 后，是否直接用服务器返回的 game state 更新 UI，还是单独调用 `getAvailableActions`？

---

## 八、行动项

1. [高] 在 actionHandler.handlePeng/handleChow 末尾添加 `beginCurrentPlayerTurn` 调用（下家回合开启）
2. [高] 确认客户端 `game:state-changed` 处理逻辑
3. [高] 对比 beginCurrentPlayerTurn 和 schedulePendingActionTimeout 在 handlePeng 后是否需要调用
4. [中] 确认 pendingExpiresAt 的更新逻辑
5. [中] 写一个测试脚验证：出牌后下家的 availableActions