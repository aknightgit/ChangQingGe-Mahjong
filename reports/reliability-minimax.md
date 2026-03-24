# 长清阁麻将 - 可靠性测试报告

**测试时间**: 2026-03-24  
**测试范围**: 核心规则逻辑、场景覆盖、潜在Bug挖掘  
**测试方法**: 静态代码分析 + 逻辑路径测试

---

## A. 执行概览

### 基础健康检查

| 命令 | 状态 | 详情 |
|------|------|------|
| `npx tsc --noEmit` | ✅ 通过 | 无编译错误 |
| `npx tsx test-core.ts` | ✅ 通过 | 90项核心测试全部通过 |
| `npx tsx reliability-test.ts` | ⚠️ 部分失败 | 31通过/5失败，发现2个P0 Bug |

### 场景覆盖矩阵

| 场景 | 覆盖状态 | 备注 |
|------|----------|------|
| 吃/碰/杠/胡/过 动作链路 | ✅ 覆盖 | ActionType完整，动作处理函数齐全 |
| CHOW(吃牌)可用性与优先级 | ✅ 覆盖 | 只给下家发CHOW，优先级最低 |
| 一炮多响 | ⚠️ 部分覆盖 | **发现P0级Bug** |
| 抢杠（补杠可抢/暗杠不可抢）| ✅ 覆盖 | handleExtendedKong有robbers检查 |
| 百搭逻辑（含花牌百搭组） | ✅ 覆盖 | 花牌分组逻辑正确 |
| 冷冻圈 | ⚠️ 部分覆盖 | round-based freeze有效，但freezeDurationMs未实现 |
| 混碰新牌型（固定10） | ✅ 覆盖 | FIXED_FAN['混碰']=10，HUN_PENG检测存在 |
| 倍数规则 | ⚠️ 部分覆盖 | 计算公式正确，但roundMultiplier/globalMultiplier硬编码为1 |
| 流局继承链与封顶8 | ⚠️ 部分覆盖 | 流局时winnerFan=0处理正确，但继承链未完整实现 |
| 前端动作按钮适配 | ✅ 覆盖 | CHOW仅在无其他人响应时检查 |
| API/Socket重复执行风险 | ⚠️ 部分覆盖 | pendingActions过滤逻辑存在，但isSelfDrawn未定义Bug |

---

## B. 缺陷列表（按严重级别）

### P0 - 严重（必须修复）

#### Bug #1: `handleDiscard`引用未定义变量`isSelfDrawn`

**文件**: `server/utils/gameManager.ts:614`

**严重级别**: P0

**复现步骤**:
1. 创建游戏并开始对局
2. 任意玩家执行弃牌动作（DISCARD）
3. 观察`handleDiscard`执行

**预期行为**:
- `isSelfDrawn`在`handleDiscard`中应有明确定义（或使用其他逻辑）
- 由于handleDiscard处理的是弃牌（非自摸），`isSelfDrawn`应为`false`

**实际行为**:
- `isSelfDrawn`在`handleDiscard`函数作用域内**未声明**
- JavaScript中访问未声明变量会抛出`ReferenceError`
- 由于TSX编译/运行时处理方式，可能被评估为`undefined`，导致`!isSelfDrawn === true`

**影响范围**:
- 所有弃牌操作受影响
- `multiHuStarterIndex`设置逻辑异常
- 一炮多响流程可能断裂

**代码位置**:
```typescript
// Line 584: 函数签名
private handleDiscard(game: GameState, player: Player, tileId: string): void {

  // Line 614: isSelfDrawn未定义！
  if (!isSelfDrawn && game.multiHuStarterIndex === undefined) {
    const winnerIndex = game.players.findIndex(p => p.id === player.id);
    game.multiHuStarterIndex = winnerIndex;
  }

  game.multiHuStarterIndex = undefined;  // Line 619: 无条件重置
}
```

**建议修复点**:
- `server/utils/gameManager.ts` - `handleDiscard`函数
- 删除`!isSelfDrawn`条件，或将`isSelfDrawn`定义为`false`（因为handleDiscard永远处理的是弃牌，不是自摸）

---

#### Bug #2: `handleDiscard`中`multiHuStarterIndex`被无条件重置

**文件**: `server/utils/gameManager.ts:619`

**严重级别**: P0

**复现步骤**:
1. 创建4人游戏并开始对局
2. P0弃牌，P1可以胡但选择等待
3. 观察`multiHuStarterIndex`的值

**预期行为**:
- 如果多人可胡（后续会胡），`multiHuStarterIndex`应被设置为首个胡家位置
- 该值应被保留到`handlePass`或`handleHu`中使用

**实际行为**:
```typescript
// Line 614-617: 条件设置
if (!isSelfDrawn && game.multiHuStarterIndex === undefined) {
  const winnerIndex = game.players.findIndex(p => p.id === player.id);
  game.multiHuStarterIndex = winnerIndex;
}

// Line 619: 无条件重置 - 撤销了上面的设置！
game.multiHuStarterIndex = undefined;
```
- 无论条件是否满足，Line 619都执行，导致`multiHuStarterIndex`永远为`undefined`
- 一炮多响场景下"从首个胡家右手继续"的逻辑无法工作

**影响范围**:
- 一炮多响（多个玩家同时胡同一张牌）场景失效
- 放冲结算时`multiHuStarterIndex`未被正确设置

**建议修复点**:
- `server/utils/gameManager.ts:619`
- 删除该行，或将其移入正确的条件分支

---

### P1 - 重要

#### Bug #3: `roundMultiplier`硬编码为1

**文件**: `server/utils/gameManager.ts:1012`

**严重级别**: P1

**复现步骤**:
1. 创建游戏并开始
2. 设置骰子（diceRollCount可配置，但骰子点数未实际生成）
3. 玩家胡牌，检查番数计算

**预期行为**:
- 骰子点数应决定`roundMultiplier`（1+1=×4, 4+4=×4, 2+2=×2, 其他=×1）
- 胡牌番数应乘以骰子倍数

**实际行为**:
```typescript
roundMultiplier: 1, // TODO: 从骰子获取
```
- `roundMultiplier`固定为1，骰子逻辑未实现

**影响范围**:
- 所有胡牌结算，番数计算不反映骰子结果
- 倍数规则中的"全局倍数=min(8,骰子倍数*流局倍数*继承倍数)"无法生效

**建议修复点**:
- `server/utils/gameManager.ts` - `handleHu`函数
- 实现骰子点数生成逻辑，并在胡牌时传入真实值

---

#### Bug #4: `globalMultiplier`硬编码为1

**文件**: `server/utils/gameManager.ts:1013`

**严重级别**: P1

**复现步骤**:
1. 创建游戏并开始对局
2. 触发流局（wall exhausted）
3. 下一局继续流局
4. 玩家胡牌，检查结算

**预期行为**:
- 首次流局后`globalMultiplier`应变为2
- 连续流局/造反时`globalMultiplier`应累乘（上限8）
- 胡牌结算应乘以全局倍数

**实际行为**:
```typescript
globalMultiplier: 1,  // TODO: 从游戏状态获取
```
- 固定为1，流局/造反继承逻辑未实现

**影响范围**:
- 连续流局/造反场景下倍数不累积
- 玩家结算分数不反映历史事件

**建议修复点**:
- `server/utils/gameManager.ts` - `handleHu`函数
- 从`game`对象获取`globalMultiplier`（需先实现流局/造反时的累乘逻辑）

---

### P2 - 提示

#### Bug #5: `freezeDurationMs`存储但未使用

**文件**: `server/utils/gameManager.ts:237`（存储）vs 冻结逻辑（未使用）

**严重级别**: P2

**问题描述**:
- `freezeDurationMs`在`createGame`时被存储到`GameState`中（默认1000ms）
- 但冻结逻辑使用`round-based`（基于圈数），不使用`freezeDurationMs`
- 设置的冻结时长被忽略

**影响范围**:
- 前端显示冻结倒计时可能不准确
- 若未来要改为time-based freeze，需重写逻辑

**建议修复点**:
- `server/utils/gameManager.ts` - 冻结逻辑
- 如需保留time-based freeze，改为使用`freezeEndTime = Date.now() + freezeDurationMs`

---

#### Bug #6: 花牌百搭组使用字符串值比较

**文件**: `server/utils/scoring.ts:331-339`

**严重级别**: P2

**问题描述**:
```typescript
function countWildTiles(tiles: Tile[], wildSuit: TileSuit, wildValue: number, wildGroup?: string[]): number {
  return tiles.filter(t => {
    if (t.suit === wildSuit && t.value === wildValue) return true;
    // 花牌百搭组
    if (wildSuit === TileSuit.FLOWER && t.suit === TileSuit.FLOWER && wildGroup) {
      return wildGroup.includes(String(t.value));  // t.value是number，wildGroup是string[]
    }
    return false;
  }).length;
}
```

**潜在风险**:
- `tile.value`是`number`类型（如`1`），`wildGroup`是`string[]`（如`['1', '2', '3', '4']`）
- `String(t.value)`转换是正确的，但缺乏类型安全

**影响范围**:
- 花牌百搭计数功能正常，但类型不够安全

**建议修复点**:
- `server/utils/scoring.ts` - `countWildTiles`函数
- 可改用`wildGroup.includes(t.value as number)`并调整类型定义

---

## C. 场景覆盖详细分析

### 1. 吃/碰/杠/胡/过 动作链路

| 动作 | 实现函数 | 状态 |
|------|----------|------|
| DISCARD | `handleDiscard` | ⚠️ 有P0 Bug |
| DRAW | `handleDraw` | ✅ 正常 |
| CHOW | `handleChow` | ✅ 正常 |
| PENG | `handlePeng` | ✅ 正常 |
| KONG | `handleKong` | ✅ 正常 |
| HU | `handleHu` | ✅ 正常 |
| PASS | `handlePass` | ✅ 正常 |
| CONCEALED_KONG | `handleConcealedKong` | ✅ 正常 |
| EXTENDED_KONG | `handleExtendedKong` | ✅ 正常 |

### 2. CHOW优先级

**规则**: CHOW只能下家执行，且优先级最低（吃/碰/杠/胡都优先于吃）

**代码验证**:
```typescript
// checkPendingActions中：
// 先检查PENG/KONG/HU（给所有有响应权的玩家）
// CHOW只在 pendingActions.length === 0 时才检查
if (game.pendingActions.length === 0) {
  const chowPlayer = this.getNextActivePlayer(game, game.currentPlayerIndex);
  // ...
}
```

**结论**: ✅ 正确实现

### 3. 一炮多响

**规则**: 同一张牌可被多人胡时，从首个胡家"右手"继续

**问题**:
1. `handleDiscard`中`isSelfDrawn`未定义
2. `multiHuStarterIndex`被Line 619无条件重置

**结论**: ⚠️ 逻辑存在但有P0 Bug导致无法正常工作

### 4. 抢杠

**规则**:
- 补杠（续杠/extended kong）可被抢
- 暗杠不可被抢

**代码验证**:
```typescript
// handleExtendedKong: 有抢杠检查
if (robbers.length > 0) {
  game.pendingKongClaim = { playerId: player.id, tile };
  game.pendingActions = robbers;
  return;
}

// handleConcealedKong: 无抢杠检查，直接完成
```

**结论**: ✅ 正确实现

### 5. 百搭逻辑

**规则**:
- 普通百搭：指定花色+数值
- 花牌百搭：一组花牌（春夏秋冬或梅兰竹菊）全部为百搭

**代码验证**:
```typescript
// startGame中：
if (wildType.suit === TileSuit.FLOWER) {
  if (wildType.value <= 4) {
    game.wildTileGroup = ['1', '2', '3', '4']; // 春夏秋冬
  } else {
    game.wildTileGroup = ['5', '6', '7', '8']; // 梅兰竹菊
  }
}
```

**结论**: ✅ 花牌分组正确

### 6. 冷冻圈

**规则**: 百搭打出后，一圈内不能吃/碰/捉冲（但自摸不受影响）

**实现**:
```typescript
// handleDiscard中：
if (this.isWildTile(game, tile)) {
  game.freezeRound = game.roundNumber;
  game.pendingActions = [];
  this.moveToNextPlayer(game);
  return;
}

// getAvailableActions中：
if (game.freezeRound && game.roundNumber <= game.freezeRound) {
  return [];  // 冻结期间pendingActions返回空
}
```

**结论**: ⚠️ round-based freeze正确，但`freezeDurationMs`未实现（可能不需要）

### 7. 混碰新牌型

**规则**: 混碰（混一色+碰碰胡）固定10番

**代码验证**:
```typescript
// scoring.ts:
const FIXED_FAN = {
  '混碰': 10,
  // ...
};
```

**结论**: ✅ 固定10番正确

### 8. 倍数规则

**规则**: 全局倍数 = min(8, 骰子倍数 × 流局倍数 × 继承倍数)

**代码验证**:
```typescript
// scoring.ts:
const effectiveGlobalMultiplier = globalIncludesRound
  ? Math.max(1, Math.min(baseGlobal * effectiveRoundMultiplier, 8))
  : Math.max(1, Math.min(baseGlobal, 8));
```

**结论**: ⚠️ 公式正确，但`roundMultiplier`和`globalMultiplier`硬编码为1

### 9. 流局继承

**规则**: 流局/造反后，下局倍数×2，上限8

**代码验证**:
- `calculateGameResult`正确处理无赢家情况
- `globalMultiplier`未实现累乘

**结论**: ⚠️ 部分实现

### 10. 前端按钮适配

**CHOW按钮**:
- 只在`pendingActions.length === 0`且下家有可吃序列时显示
- ✅ 正确

**PASS按钮**:
- 在`getAvailableActions`中对有`pendingAction`的玩家返回`availableActions`（包含PASS）
- ⚠️ 如果`freezeRound`生效，PASS也会被阻止（返回空数组）

**1秒窗口体验**:
- `freezeDurationMs`未实现，可能影响客户端倒计时显示

### 11. API/Socket重复执行

**风险点**:
- `executeAction`执行后直接broadcast，无幂等性检查
- 如果同一个action被重复发送，会被执行两次

**现有保护**:
- `pendingActions`在响应后会被清空或过滤
- 但无全局action ID去重机制

**结论**: ⚠️ 存在重复执行风险，建议增加action序列号

---

## D. 回归建议（下一轮必测项）

### 必须覆盖（防止P0 Bug逃逸）

1. **一炮多响场景**
   - 4人游戏，P0弃牌
   - P1、P2、P3都能胡同一张牌
   - P1先胡，P2/P3继续响应
   - P2选择PASS
   - 验证游戏从P1右手（不是P0）继续

2. **handleDiscard isSelfDrawn Bug验证**
   - 任意玩家弃牌
   - 验证不抛出`ReferenceError`
   - 验证`multiHuStarterIndex`行为符合预期

### 重要覆盖（P1 Bug修复后验证）

3. **骰子倍数生效**
   - 设置不同骰子点数
   - 验证胡牌番数乘以正确的倍数

4. **流局继承链**
   - 触发流局
   - 下一局验证`globalMultiplier`为2
   - 再流局，验证为4
   - 达到8后封顶

### 建议覆盖

5. **抢杠边界**
   - 补杠时有玩家可抢杠
   - 验证补杠被作废，骰子归胡家

6. **冷冻圈边界**
   - 百搭打出后
   - 验证下家不能吃/碰/捉冲
   - 验证自己回合仍可自摸

---

## E. 结论

### 是否可进入下一阶段

**结论**: ⚠️ **暂缓进入生产，需先修复P0 Bug**

### 原因

1. **P0 Bug #1 & #2**: 一炮多响核心逻辑被两个Bug阻断，会导致真实对局中多人胡牌时游戏状态异常
2. **P1 Bug #3 & #4**: 倍数系统未实现，导致番数计算不准确，影响游戏平衡性

### 修复优先级

| 优先级 | Bug | 修复工作量 |
|--------|-----|----------|
| P0 | Bug #1 (#614行isSelfDrawn) | <5分钟，删除条件或定义为false |
| P0 | Bug #2 (#619行multiHuStarterIndex重置) | <5分钟，删除该行 |
| P1 | Bug #3 (#roundMultiplier) | 需要实现骰子系统 |
| P1 | Bug #4 (#globalMultiplier) | 需要实现流局/造反累乘 |

### 正面评价

1. ✅ 核心牌型检测（碰碰胡/清一色/混一色/风一色）逻辑正确
2. ✅ 吃/碰/杠/胡/PASS基础动作链路完整
3. ✅ 抢杠逻辑正确（补杠可抢/暗杠不可抢）
4. ✅ 花牌百搭组逻辑正确
5. ✅ 冷冻圈round-based实现正确

---

**报告生成**: 可靠性测试工程师  
**测试文件**: `/home/node/.openclaw/workspace/ChangQingGe-Mahjong/reliability-test.ts`
