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

**运行方式**（从项目根目录运行）：
```bash
cd /home/node/.openclaw/workspace/ChangQingGe-Mahjong

# AI-AK 训练
npx tsx scripts/train-ai-ak.ts 3 1000

# 基线训练
npx tsx scripts/train-baseline.ts 1 1000 --baseline

# 简单运行
npx tsx scripts/run-training.ts 1 100
```

## 输出路径

所有训练输出 → `training-output/`

- 每次训练启动前，会自动清空 `training-output/` 下旧日志
- `training-output/save/` 永久保留，供手动存档

包含：训练报告(.md)、最佳策略(.json)、轮次详情(.md)、索引(index.md)

## 修改记录

- 2026-04-23：`train-ai-ak.ts` / `train-baseline.ts` / `run-training.ts` 的 OUT_DIR 统一改回项目内 `training-output/`，并增加自动清理旧日志但保留 `save/`
