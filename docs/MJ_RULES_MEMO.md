# 麻将规则备忘录（2026-04-12 更新）

---

## 一、核心铁律（K哥铁律，2026-04-09 确立，2026-04-11/12 再次确认）

### 胡/碰/出牌优先级
**胡 > 碰 > 出牌**，三者互斥，不可混淆：

```
A出牌
  → B能胡 → 直接胡（不做碰）
  → B不能胡，但能碰 → 选择碰 → 碰后立即出牌（不能再摸牌！）
  → B不能碰 → 出牌
```

### 碰后规则
- **碰后不能摸牌！** 碰完直接出一张牌
- **碰后不能胡！** 碰了就不能再选择胡牌
- anKong（暗杠/加杠）在碰后可以检查胡牌，但碰本身没有摸牌

### 杠后规则
- **暗杠**：必须补摸一张牌，然后检查自摸
- **加杠**：必须补摸一张牌，然后检查自摸
- **杠他人第四张牌**：必须补摸一张（特殊杠，与普通碰不同）

### 自摸检查时机
- 每次正常摸牌后检查自摸
- 杠后补摸检查自摸
- **碰后不检查自摸**（碰不补摸）

### 无花自摸（门前清一色）
- 条件：`isSelfDrawn=true` + 门前（exposedMelds）无：花、风刻、**箭刻**、**杠牌**
- 适用牌型：碰碰胡、混一色
- **注**：门前暗杠同样破坏无花自摸资格
- 普通花算花；百搭花（春夏秋冬、梅兰竹菊）按百搭逻辑处理，不按普通花拦截

### 手牌数约束
- 摸牌后：14/11/8/5/2 张
- 碰后：11/8/5/2 张（净减3张，不补摸）
- 杠后：10/7/4/1 张（暗杠4张，补1摸=净3+1=4已出）

---

## 二、弃牌策略铁律（2026-04-12 更新）

### 弃牌优先级
1. 最短门单张（已现≥1张）→ 最优先弃
2. 最短门单张
3. 风箭（已现≥2张）
4. 最短门对子

### 拆门决策
- 次短门孤立张惩罚：~~-40~~ → **-20**（commit `6f237a9`）
- 次短门判断 bug：`secondSuit = sortedSuits[sortedSuits.length-2]`（commit `8fb4fb4`）
- ⚠️ **待优化**：次短门惩罚 -20 可能仍过重，需参考对手做牌意图调整策略（待K哥确认）

---

## 三、碰吃参数（2026-04-12 更新）

### AI-AK（主力 bot）
- `pengChance=0.7`，`chowChance=0.5`（chow 搜索范围 0.2~0.8）
- commit `d188fd7`

### 其他 Bots（AI-小胖 / AI-阿水 / AI-老赵）
- `pengChance: 1.0 → 0.7`
- `chowChance: 1.0 → 0.6`（配合 DEFAULT_POLICY）
- commit `cdd3e5e`

---

## 四、已修复 Bug（按 commit 排列）

### 4.1 Bug1: 碰牌后弃牌区残留
- **文件**: `server/utils/gameManager.ts:1864-1865`
- **原因**: 只删了 `discardPile`，没删 `discarder.hand.discardedTiles`
- **修复**: 同时从弃牌者个人弃牌列表中移除
- **Commit**: `92bb149`

### 4.2 Bug2: 摸牌按钮提前亮（犹豫期未结束就亮）
- **文件**: `CircularActionButtons.vue:127`
- **原因**: `highlightDelayMs` 硬编码 2000ms，实际犹豫期 5000ms
- **修复**: 绑定 `hesitationWindow`（后端传入），删除硬编码
- **Commit**: `a053352`

### 4.3 Bug3: 吃碰来源箭头错误
- **文件**: `PlayerSelfArea.vue:100-104`
- **原因**: `sourcePosition` 传玩家序号而非相对位置
- **修复**: `getRelativeSourcePosition()` 换算相对位置
- **Commit**: `92bb149`

### 4.4 Bug4: 自摸胡牌按钮不亮
- **文件**: `gameManager.ts:1180` + `gameroom:[roomId].vue:1692`
- **原因**: A. `isSelfDrawnHu` 参数错位传 `true` 而非 `isWildTile`；B. watcher 不监听 `availableActions`
- **修复**: 参数修正 + watcher 监听 `availableActions`
- **Commit**: `92bb149`

### 4.5 Bug5: applyChow 手牌多1张（铁律违规）
- **文件**: `gameManager.ts`（`applyChow` 函数）
- **原因**: `splice` 后索引错位，`_usedForChow.add` 用了错误 tile id
  ```typescript
  const idx = p.hand.findIndex(...)
  p.hand.splice(idx, 1)        // splice 后 p.hand[idx] 已变成下一张！
  p._usedForChow?.add(p.hand[idx]?.id)  // add 了错的 id！
  ```
- **修复**: 应 add `combo[0].id` 或在 splice 前保存
- **状态**: ⚠️ **待修复**（根因已确认，2026-04-11 由 qwencode 定位）

### 4.6 Bug6: 无花自摸缺失箭刻和杠牌检查
- **文件**: `scoring.ts hasWindMelds()`
- **原因**: 只检查了花，未检查箭刻/明杠/暗杠/加杠
- **修复**: 扩展 `hasWindMelds` 检查全部门清拦路项；`applyAnKong` 推 `CONCEALED_KONG`
- **Commit**: `9d84ab6` / `726348d`

### 4.7 Bug7: 弃牌区布局随弃牌数量变动重叠
- **文件**: `DiscardZone.vue`
- **原因**: 容器无固定尺寸，弃牌数量变化时撑开父元素
- **修复**: 固定 `width: 232px; height: 70px`（8列 × 2行），`overflow: visible`
- **Commit**: `92bb149`

---

## 五、训练日志格式（2026-04-12 修复）

### 约定结构
- **主文件**（`ai-ak-training-*.md`）：Header + **每轮** formatRoundReport + 最终评估
- **Round 文件**（`round-XXX-*.md`）：每圈明细（`--detail` 开关）
- formatRoundReport 输出内容：训练指标 Summary + **胡牌牌型分布表格** + 策略参数 + 最大赢输局明细 + 所有胡牌局明细

### 常见问题（2026-04-12 新增）
| 问题 | 根因 | 修复 |
|-----|------|------|
| Config 显示 NaN | `parseInt` 失败无 fallback | 加 `\|\| 10` / `\|\| 1000` |
| 胡牌牌型分布全缺 | Baseline Round 0 / 最终评估跳过了 formatRoundReport | 全部走 formatRoundReport |
| 最终评估是老格式 | 直接 push console.log，未调用 reporter | 替换为 formatRoundReport |

- **Commit**: `09cd680`

---

## 六、训练目标（2026-04-12 状态）

### 核心指标
| 指标 | 目标 |
|-----|------|
| 胡牌率 | ≥90% |
| 流局率 | <10% |
| 门清率 | 7-12% |
| 血战到最后一人 | >80% |
| 自摸率（胡牌中） | 40-60% |
| 捉冲率（胡牌中） | 40-60% |
| 大牌率（胡牌中） | 3-8% |

### 牌型分布目标
| 牌型 | 目标 |
|-----|------|
| 混一色 | ≥40% |
| 碰碰胡 | >25% |
| 清一色 | >20% |
| 清碰 | ~5% |
| 风一色 | ~5% |
| 风碰 | ~1% |

### 当前困境（2026-04-11 结论）
- menqingKeepBonus=0 和 =2.8 结果一样：都是 0% 胜率、100% 流局
- **根因不是单一参数**，是整体决策逻辑底子差
- 需从整体策略而非单一参数入手优化

---

## 七、待确认事项（⚠️ 未解决）

| 事项 | 状态 | 备注 |
|-----|------|------|
| applyChow 手牌多1张 bug | ⚠️ 待修复 | 根因已确认，代码待改 |
| 次短门惩罚策略优化 | ⚠️ 待K哥确认 | 可参考对手做牌意图调整 |
| menqingKeepBonus=0 10×1000局 | ⏸ 暂缓 | K哥指示先不跑 |
| 整体策略底子差 | 🔍 待排查 | 非单一参数问题，需系统 review |

---

## 八、Recent Commits（关键）

| Commit | 内容 |
|--------|------|
| `d188fd7` | AI-AK pengChance=0.7, chowChance=0.5，角色文件同步 |
| `cdd3e5e` | 其他 bots pengChance 1.0→0.7, chowChance 1.0→0.6 |
| `6f237a9` | 次短门孤立张惩罚 -40→-20 |
| `8fb4fb4` | 拆门 secondSuit 判断修正 |
| `92bb149` | 修复4个UI/逻辑bug（弃牌区/Bug1-4/弃牌区布局） |
| `a053352` | Bug2 摸牌按钮提前亮修复（hesitationWindow） |
| `09cd680` | 训练日志格式修复（NaN/胡牌牌型分布/最终评估） |
| `3394d88` | 麻将手牌布局修复（其他三家） |
| `e885fe7` | 拆门有用牌漏算对子+纯色门槛7张 |
