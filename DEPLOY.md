# ChangQingGe-Mahjong 部署文档

## 环境说明

### 沙盒（sandbox / 本地）
- **位置**：本 OpenClaw 容器内（hostname: `0c60d96ddf25`）
- **代码目录**：`/home/node/.openclaw/workspace/ChangQingGe-Mahjong/`
- **用途**：日常开发、调试、训练、测试
- **连接资源**：
  - MariaDB（麻将数据）：`192.168.3.241:33061`
  - MongoDB（极空间NAS）：`192.168.3.241:27017`
  - Redis：`192.168.3.241:6379`

### 服务器（NAS Ubuntu 虚拟机）
- **Host**：192.168.3.241
- **SSH 端口**：2222
- **用户**：ak / ak
- **用途**：麻将生产服务（若已部署）

---

## 本地开发与测试

### 运行训练（本地）
```bash
cd /home/node/.openclaw/workspace/ChangQingGe-Mahjong

# 标准训练：2轮 × 200局（快速验证）
npx tsx scripts/train-ai-ak.ts 2 200

# 完整训练：10轮 × 1000局
npx tsx scripts/train-ai-ak.ts 10 1000

# 基线模式
npx tsx scripts/train-ai-ak.ts 2 200 --baseline
```

### 运行单局调试
```bash
# 单局模拟
npx tsx scripts/debug-sim.ts

# 极端测试 100 局
npx tsx scripts/extreme-test-100.ts
```

### 本地开发 Server
```bash
# Nuxt Dev（热更新）
npm run dev

# 构建生产包
npm run build

# 预览构建结果
node .output/server/index.mjs
```

---

## 部署到服务器

### 方式一：Git Pull（推荐）
```bash
# 在 NAS Ubuntu 虚拟机上
cd /path/to/ChangQingGe-Mahjong
git pull
npm install
npm run build
pm2 restart <app-name>
```

### 方式二：手动上传
```bash
# 在沙盒内打包
cd /home/node/.openclaw/workspace/ChangQingGe-Mahjong
tar --exclude='node_modules' --exclude='.git' -czvf /tmp/mahjong-deploy.tar.gz .

# 传到服务器
sshpass -p 'ak' scp -o StrictHostKeyChecking=no -P 2222 \
  /tmp/mahjong-deploy.tar.gz \
  ak@192.168.3.241:/home/ak/

# 在服务器解压部署
ssh -p 2222 ak@192.168.3.241
tar -xzvf mahjong-deploy.tar.gz
cd ChangQingGe-Mahjong
npm install && npm run build
pm2 restart <app-name>
```

---

## 数据库

### MariaDB（麻将数据）
- **Host**：192.168.3.241
- **Port**：33061
- **Database**：changqingge
- **用户**：openclaw
- **密码**：0penC1aw

### MongoDB（极空间NAS）
- **Host**：192.168.3.241
- **Port**：27017
- **Database**：changqingge
- **用户**：admin
- **密码**：$$9myHome

---

## 关键文件索引

| 文件 | 用途 |
|------|------|
| `server/utils/handValidator.ts` | 胡牌判定核心（canWin/canFormMelds/tryFormMelds） |
| `server/utils/scoring.ts` | 算分逻辑 |
| `server/utils/gameManager.ts` | 游戏状态机、回合逻辑 |
| `server/utils/tiles.ts` | 牌操作工具 |
| `scripts/train-ai-ak.ts` | AI策略迭代训练器 |
| `scripts/training-reporter.ts` | 训练报告生成 |
| `AI_policies/characters/AI-AK.json` | 当前AK策略参数 |

---

## 常见操作

### 查看训练输出
```bash
ls -la training-output/
cat training-output/index.md
```

### 重启 OpenClaw（不影响麻将服务）
```bash
openclaw gateway restart
```

### 查看服务器 PM2 状态
```bash
ssh -p 2222 ak@192.168.3.241 "pm2 list"
```

---

## 版本历史

| Commit | 日期 | 内容 |
|---------|------|------|
| e80c216 | 2026-04-14 | fix: canWin/isTing 过滤普通花牌 |
| 2146576 | 2026-04-14 | fix: P0-3/7/9 三个漏胡根因补丁 |
