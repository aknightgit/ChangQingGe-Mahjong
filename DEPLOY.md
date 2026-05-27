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

### 当前生产端口拓扑（2026-05-05已核实）

#### 应用实际监听
- **Mahjong 服务本体**：`127.0.0.1:8899`
  - 进程：`node /home/.output/server/index.mjs`
- **MyIsland 服务本体**：`127.0.0.1:3100`

#### Nginx 入口
- **HTTP**：`0.0.0.0:8080`
- **HTTPS**：`0.0.0.0:8888`

#### Nginx 路由规则（修复后）
```nginx
upstream myisland {
    server 127.0.0.1:3100;
}

upstream mahjong {
    server 127.0.0.1:8899;
}

location / {
    proxy_pass http://myisland/;
}

location /mahjong/ {
    proxy_pass http://mahjong;
}
```

#### 外网访问现状
- **当前实际外网入口**：`443 -> 8080`
- **8888 仍在 Ubuntu 内部 nginx 监听，但花生壳 8888 映射已取消，不作为当前外网入口**
- **8899 不需要直接映射到 NAS host**，因为它是 nginx 的后端服务端口，仅供同机反代访问
- **当前可访问地址**：`https://cv388xr9771.vicp.fun/mahjong/`

#### 2026-05-05 子路径部署问题总结
**现象**
- 访问 `/mahjong/` 会跳到 MyIsland
- 登录页打开后又报 `MONGODB_URI is not set`

**根因 1：Nuxt 子路径部署未配置完整**
- 应用最初未设置 `app.baseURL`
- 多处重定向/错误页返回根路径 `/`
- PM2 进程未注入 `NUXT_APP_BASE_URL=/mahjong/`
- nginx 原配置 `proxy_pass http://mahjong/;` 会剥掉 `/mahjong/` 前缀

**修复 1：子路径部署**
- `nuxt.config.ts` 新增：
  - `app.baseURL = process.env.NUXT_APP_BASE_URL || '/'`
- 新增插件：`app/plugins/api-base.ts`
  - 把 `'/api/...'` 请求自动补成带 baseURL 的路径
- 修复重定向点：
  - `app/error.vue`
  - `server/api/auth/google/callback.get.ts`
- 生产 PM2：
  - `PORT=8899`
  - `NUXT_APP_BASE_URL=/mahjong/`
- nginx：
  - `proxy_pass http://mahjong/;` → `proxy_pass http://mahjong;`

**修复后验证**
- `https://cv388xr9771.vicp.fun/mahjong/` → `302 /mahjong/login`
- `https://cv388xr9771.vicp.fun/mahjong/login` → `200 OK`

**根因 2：生产环境缺 Mongo 连接变量**
- 麻将进程 PM2 环境里没有 `MONGODB_URI`
- 登录页因此直接显示：`MONGODB_URI is not set`

**修复 2：PM2 注入 Mongo 环境变量**
- `MONGODB_URI=mongodb://admin:%24%249myHome@192.168.3.241:27017/changqingge?authSource=admin`
- `MONGODB_DB=changqingge`

**修复后结果**
- 注册、登录恢复正常
- 线上地址可直接使用

### 2026-05-05 Android APK（远程 WebView）封装记录
**目标方案**
- Capacitor APP 不内嵌本地站点
- 直接打开线上地址：`https://cv388xr9771.vicp.fun/mahjong/`

**配置**
- `capacitor.config.ts`
  - `appId: 'com.changqingge.mahjong'`
  - `appName: '长清阁麻将'`
  - `webDir: '.output/public'`
  - `server.url: 'https://cv388xr9771.vicp.fun/mahjong/'`
  - `server.cleartext: false`

**构建过程遇到的问题**
1. `npm install` 被历史遗留脚本阻塞：
   - `postinstall = nuxt prepare && node scripts/patch-fonts.mjs`
   - 实际缺失文件：`scripts/patch-fonts.mjs`
   - 这不影响远程 WebView APK，可绕过，不必为此阻塞打包
2. 当前沙盒无系统级 JDK / Android SDK：
   - 采用本地临时工具链：`/data/android-build/`
3. Gradle 拉取 `build-tools;35.0.0` 时命中 Google `429`：
   - 改为手工下载补齐后继续构建
4. `mergeDebugAssets` 被中文 `.opus` 文件名卡住：
   - 远程 WebView 模式下，本地 `android/app/src/main/assets/public/` 不是必需
   - 构建前清空该目录，只保留：
     - `capacitor.config.json`
     - `capacitor.plugins.json`

**最终结果**
- 构建成功：`./gradlew assembleDebug`
- 输出 APK：`/data/download/changqingge-mahjong-remote-debug-20260505.apk`

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

> ⚠️ **关键约束**：麻将服务运行路径是 `/home/.output/`（不是 `/home/ak/`）
> ⚠️ **只允许一个部署实例**，不允许在多个目录部署多个进程

### 正确的 PM2 进程配置
```
进程名称：mahjong
运行路径：/home/.output/server/index.mjs
工作目录：/home
环境变量：
  - PORT=8899
  - NUXT_APP_BASE_URL=/mahjong/
  - MONGODB_URI=mongodb://admin:%24%249myHome@192.168.3.241:27017/changqingge?authSource=admin
  - MONGODB_DB=changqingge
```

### 部署步骤（手动上传模式）

**第一步：在沙盒内打包（排除 android、node_modules、.output 等）**
```bash
cd /home/node/.openclaw/workspace/ChangQingGe-Mahjong
tar \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='.nuxt' \
  --exclude='.output' \
  --exclude='android' \
  --exclude='artifacts' \
  --exclude='training-output' \
  -czvf /tmp/mahjong-deploy.tar.gz .
```

**第二步：上传到服务器用户目录**
```bash
sshpass -p 'ak' scp -o StrictHostKeyChecking=no -P 2222 \
  /tmp/mahjong-deploy.tar.gz \
  ak@192.168.3.241:/home/ak/
```

**第三步：在服务器解压、构建**
```bash
sshpass -p 'ak' ssh -o StrictHostKeyChecking=no -p 2222 ak@192.168.3.241

# 解压到用户目录（不是 /home/.output/）
cd /home/ak
tar -xzvf mahjong-deploy.tar.gz

# 安装依赖
npm install

# 构建
npm run build

# 第四步：把构建产物复制到运行目录 /home/.output/
# ⚠️ 必须先删后复制！cp -r 不会删除旧文件，旧的 hash 文件名会残留导致 500 错误
rm -rf /home/.output
cp -r /home/ak/.output /home/.output

# 第五步：重启 PM2
pm2 restart mahjong

# 验证
curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8899/mahjong/
# 期望输出：302

# 清理垃圾
rm -rf /home/ak/.output /home/ak/mahjong-deploy.tar.gz
```

### Git Pull 模式（服务器已有代码）
```bash
sshpass -p 'ak' ssh -o StrictHostKeyChecking=no -p 2222 ak@192.168.3.241

cd /home/ak
git pull origin master
npm install
npm run build

# ⚠️ 必须先删后复制！cp -r 不会删除旧文件
rm -rf /home/.output
cp -r /home/ak/.output /home/.output

pm2 restart mahjong
```

### ⚠️ 禁止事项
- ❌ 不要在 `/home/ak/` 下运行 PM2 进程
- ❌ 不要创建多个 mahjong PM2 进程
- ❌ 不要用 `mv` 备份旧 .output 再 `cp -r` 覆盖——cp -r 不删旧文件，旧的 hash 文件名会残留导致 500 错误
- ✅ 必须 `rm -rf /home/.output && cp -r /home/ak/.output /home/.output`
- ❌ 不要把 tar 包解压到 `/home/`（会导致目录结构混乱）
- ❌ 不要手动 `node /home/ak/.output/...` 启动

### ⚠️ 部署前必须 git stash（2026-05-28 确立）

**问题**：反复调试后服务器可能残留未提交的本地改动（冲突文件、临时修改等），导致 build 产物不一致、Nuxt 缓存混乱，表现为两台设备（如小米14Pro/17Ultra）加载速度差异巨大。

**标准部署流程**：
```bash
sshpass -p 'ak' ssh -p 2222 -o StrictHostKeyChecking=no ak@192.168.3.241

cd /home/ak/myworkspace/ChangQingGe-Mahjong
git stash          # 清除本地改动
git pull           # 拉取最新代码
npm run build      # 从干净源码构建
pm2 restart mahjong
```

**铁律**：部署时必须 `git stash && git pull`，不要直接 `git pull`，避免本地残留污染 build。

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
