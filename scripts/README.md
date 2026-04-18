# 训练脚本目录 (ChangQingGe-Mahjong)

> ⚠️ 2026-04-18 更新：训练输出已迁移到 `/data/mahjong-training/training-output/`  
> 核心训练脚本已更新 OUT_DIR 指向新路径。

## 目录说明

| 目录 | 内容 |
|------|------|
| `core/` | **正式训练脚本**（OUT_DIR 已指向 `/data/mahjong-training/training-output/`） |
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

所有训练输出 → `/data/mahjong-training/training-output/`

包含：训练报告(.md)、最佳策略(.json)、轮次详情(.md)、索引(index.md)

## 修改记录

- 2026-04-18：`train-ai-ak.ts` / `train-baseline.ts` / `run-training.ts` 的 OUT_DIR 从 `training-output/` 改为 `/data/mahjong-training/training-output/`