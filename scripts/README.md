# 训练脚本目录 (ChangQingGe-Mahjong)

> ⚠️ 2026-04-23 更新：训练输出统一回到项目目录 `training-output/`  
> 每次训练前会清空旧结果，只保留最后一次；`training-output/save/` 会被保留，不参与清理。

## 目录说明

| 目录 | 内容 |
|------|------|
| `core/` | **正式训练脚本**（OUT_DIR 指向项目内 `training-output/`） |
| `utils/` | 工具/辅助模块 |
| `archive/` | 历史/废弃脚本 |

## 核心脚本 (core/)

| 脚本 | 用途 |
|------|------|
| `train-ai-ak.ts` | AI-AK 迭代训练，4人，1人被优化 |
| `train-baseline.ts` | 4人同策略基线训练 |
| `run-training.ts` | 简单训练运行器 |
| `ai-arena.ts` | 6个候选AI随机抽4+随机座位的大规模竞技对战，输出统计报告 |

**运行方式**（从项目根目录运行）：
```bash
cd /home/node/.openclaw/workspace/ChangQingGe-Mahjong

# AI-AK 训练
npx tsx scripts/train-ai-ak.ts 3 1000

# 基线训练
npx tsx scripts/train-baseline.ts 1 1000 --baseline

# 简单运行
npx tsx scripts/run-training.ts 1 100

# AI 竞技对战（6选4 + 随机座位）
npx tsx scripts/ai-arena.ts --games 500
npx tsx scripts/ai-arena.ts --games 1000 --no-detail    # 关闭逐局MD
npx tsx scripts/ai-arena.ts --games 50 --seed 12345     # 固定种子复现
```

## 输出路径

- **训练输出** → `training-output/`（自动清理旧日志，保留 `save/`）
- **AI 竞技对战输出** → `arena-output/<时间戳>/`
  - `summary.md` 总览榜 + 排名 + 番种分布 + 速度统计
  - `games.csv` 每局一行（座位/赢家/番数/事件数/耗时）
  - `games.jsonl` 全量 JSON 备份
  - `detailed/<id>.md` 逐局明细（默认前 30 局）
  - `meta.json` 运行参数

包含：训练报告(.md)、最佳策略(.json)、轮次详情(.md)、索引(index.md)

## 修改记录

- 2026-04-23：`train-ai-ak.ts` / `train-baseline.ts` / `run-training.ts` 的 OUT_DIR 统一改回项目内 `training-output/`，并增加自动清理旧日志但保留 `save/`
