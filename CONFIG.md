# ChangQingGe-Mahjong 配置文档

## 项目时区
- 默认时区：UTC+8（北京时间）

## 运行方式
- 开发目录：`/home/node/.openclaw/workspace/ChangQingGe-Mahjong/`
- 训练输出目录：`/data/mahjong-training/training-output/`

## 主要脚本参数
### `scripts/train-ai-ak.ts`
- 基本用法：`npx tsx scripts/train-ai-ak.ts <rounds> <games>`
- 可选开关：
  - `--baseline`：基线训练模式（按指标 fitness 优化）
  - `--detail`：输出每圈详细日志快照
  - `--skip-wild`：胜负判断时跳过百搭分配
  - `--reward-mode`：启用 pipeline 吃碰决策模式

## 数据连接
### MariaDB
- Host: `192.168.3.241`
- Port: `33061`
- Database: `changqingge`
- User: `openclaw`
- Password: 见 `TOOLS.md`

### MongoDB
- Host: `192.168.3.241`
- Port: `27017`
- Database: `changqingge`
- Admin 凭据：见 `TOOLS.md`

### Redis
- Host: `192.168.3.241`
- Port: `6379`

## 环境变量
- `TRAINING_MARIADB_ENABLED=true`：训练结果写入 MariaDB

## 注意事项
- 密码/密钥不重复写入项目文档，统一以 `TOOLS.md` 或 `/data/LS_ENV/` 为准
- 部署前先读 `DEPLOY.md`，不要凭记忆操作
