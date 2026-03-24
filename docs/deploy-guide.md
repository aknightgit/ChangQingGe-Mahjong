# 长清阁麻将 - 外网部署规划

> K哥家的极空间 NAS，电信桥接，相对固定公网 IP

---

## 一、简单模式（最快跑通）

目标：今天就能用手机在外网打麻将。

### 1.1 路由器端口转发

在路由器后台设置：

| 协议 | 公网端口 | 内网IP | 内网端口 | 说明 |
|------|---------|--------|---------|------|
| TCP | 3000 | 192.168.3.241 | 3000 | Nuxt 前端+后端 |

> ⚠️ MongoDB (27017) 和 Redis (6379) **不要转发到公网**，仅内网访问即可。

### 1.2 NAS 上启动生产模式

在极空间 NAS 上（SSH 或 Docker）：

```bash
# 1. 克隆代码
git clone git@github.com:aknightgit/ChangQingGe-Mahjong.git
cd ChangQingGe-Mahjong

# 2. 创建 .env
cat > .env << 'EOF'
MONGODB_URI=mongodb://admin:%24%249myHome@192.168.3.241:27017/changqingge?authSource=admin
MONGODB_DB=changqingge
REDIS_URL=redis://192.168.3.241:6379
EOF

# 3. 安装依赖 + 构建
npm install
npm run build

# 4. 用 pm2 守护进程（保证挂了自动重启）
npm install -g pm2
pm2 start .output/server/index.mjs --name changqingge -- --host 0.0.0.0 --port 3000

# 5. 开机自启
pm2 save
pm2 startup
```

### 1.3 访问

- 外网：`http://你的公网IP:3000`
- 手机同上，浏览器打开即可

### 简单模式的缺点

| 问题 | 说明 |
|------|------|
| ❌ 没有 HTTPS | 浏览器显示"不安全"，数据明文传输 |
| ❌ 公网 IP 可能变 | 域名访问不可用，必须记 IP |
| ❌ 没有域名 | 只能用 IP+端口，不方便分享 |
| ❌ 没有防护 | 任何人扫到 3000 端口都能访问 |
| ⚠️ 电信封 80/443 | 家宽默认封 HTTP/HTTPS 端口，必须用非标端口 |

---

## 二、中期方案（推荐，一周内搞定）

目标：有域名、有 HTTPS、能分享给朋友玩。

### 2.1 买个域名

推荐：
- 阿里云/腾讯云买个便宜域名（.cn / .xyz / .top 一年几块钱）
- 比如：`mahjong.kge.com` 或 `cqg.kge.cn`

### 2.2 Cloudflare 免费代理（最推荐）

**为什么选 Cloudflare：**
- 免费 CDN + HTTPS
- 隐藏你的真实公网 IP
- 不需要管 DDNS
- 自带防 DDoS
- 不需要在 NAS 上装 nginx

**步骤：**

```
① 域名 DNS 解析迁到 Cloudflare（注册后有引导）
② 添加 A 记录：
   mahjong.kge.com → 你的公网IP（或随便填个 1.1.1.1，后面会改）
③ 开启 Cloudflare 代理（橙色云朵 ☁️）
④ Cloudflare → DNS → 设置为你的实际公网 IP
⑤ Cloudflare → SSL/TLS → 选 "Flexible"（或 Full）
```

**路由器端口转发改为：**

| 协议 | 公网端口 | 内网IP | 内网端口 |
|------|---------|--------|---------|
| TCP | 3000 | 192.168.3.241 | 3000 |

> Cloudflare 代理模式下，访问 HTTPS 会自动终止在 Cloudflare，然后用 HTTP 转发到你的 3000 端口。

**最终效果：**
- 访问 `https://mahjong.kge.com:3000` → 自动 HTTPS
- 分享给朋友：发链接就行
- 不暴露真实 IP

### 2.3 DDNS 备选（不用 Cloudflare 时）

如果不用 Cloudflare，需要 DDNS 解决 IP 变化问题：

| 方案 | 说明 |
|------|------|
| 花生壳 | 极空间可能自带，免费版有限速 |
| No-IP | 免费，每 30 天确认一次 |
| DuckDNS | 免费，简单好用 |
| 路由器自带 DDNS | 看你的路由器型号 |

---

## 三、长期设计（生产级部署）

目标：稳定、安全、可扩展，能承载多人同时在线。

### 3.1 架构图

```
用户 (手机/PC)
    │
    ▼
Cloudflare (CDN + HTTPS + DDoS防护)
    │
    ▼
你的公网IP:3000
    │
    ▼ (路由器端口转发)
    │
┌─────────────────────────────────┐
│  极空间 NAS (192.168.3.241)    │
│                                 │
│  ┌──────────┐  ┌─────────────┐ │
│  │ Nginx    │  │ MongoDB     │ │
│  │ :443     │  │ :27017      │ │
│  │ (反向代理)│  │ (内网 only) │ │
│  └────┬─────┘  └─────────────┘ │
│       │                         │
│  ┌────▼─────┐  ┌─────────────┐ │
│  │ Nuxt App │  │ Redis       │ │
│  │ :3000    │  │ :6379       │ │
│  │ (pm2)    │  │ (内网 only) │ │
│  └──────────┘  └─────────────┘ │
└─────────────────────────────────┘
```

### 3.2 Nginx 反向代理配置

```nginx
# /etc/nginx/conf.d/changqingge.conf

upstream changqingge {
    server 127.0.0.1:3000;
}

server {
    listen 3000 ssl;
    server_name mahjong.kge.com;

    # HTTPS 证书（Cloudflare 模式下可用自签名，Cloudflare 终止外部 SSL）
    # 或用 Let's Encrypt:
    # ssl_certificate /etc/letsencrypt/live/mahjong.kge.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/mahjong.kge.com/privkey.pem;

    location / {
        proxy_pass http://changqingge;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";  # WebSocket 支持
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

> 关键：`Connection "upgrade"` 是为了支持 Socket.IO WebSocket。

### 3.3 pm2 进程管理

```bash
# 启动
pm2 start .output/server/index.mjs --name changqingge -- -H 0.0.0.0 -p 3000

# 常用命令
pm2 list              # 查看状态
pm2 logs changqingge  # 看日志
pm2 restart changqingge
pm2 stop changqingge

# 内存超 512MB 自动重启
pm2 start .output/server/index.mjs --name changqingge --max-memory-restart 512M

# 日志轮转（防止日志撑爆硬盘）
pm2 install pm2-logrotate
```

### 3.4 安全加固

| 项目 | 措施 |
|------|------|
| 数据库密码 | 定期更换，不要用简单密码 |
| MongoDB 绑定 | `bind_ip: 127.0.0.1`（只接受本地连接） |
| Redis 绑定 | 开启 `requirepass`，绑定 127.0.0.1 |
| 防火墙 | 只开放 3000，其他端口全部关闭 |
| Cloudflare | 开启 "Under Attack Mode"（被攻击时一键启用） |
| 速率限制 | Nginx 加 `limit_req_zone` 防刷 |

### 3.5 监控（可选）

```bash
# pm2 自带基础监控
pm2 monit

# 如果想要图形化：
pm2 install pm2-server-monit
```

---

## 四、实施顺序建议

| 阶段 | 内容 | 预计时间 |
|------|------|---------|
| ① 今天 | 简单模式：端口转发 + pm2 跑起来 | 30 分钟 |
| ② 本周 | 买域名 + Cloudflare 代理 | 1 小时 |
| ③ 下周 | Nginx 反代 + pm2 守护 + 安全加固 | 2 小时 |
| ④ 后续 | 监控 + 日志 + 备份策略 | 按需 |

---

## 五、极空间 NAS 注意事项

1. **Node.js 安装**：极空间支持 Docker，用 `node:20` 镜像跑 Nuxt
2. **Docker 方式（推荐）**：可以写一个 Dockerfile 或 docker-compose，环境隔离更干净
3. **SSH 访问**：极空间可能需要开启 SSH 功能（设置 → 安全 → SSH）
4. **存储**：MongoDB 数据建议挂载到 NAS 硬盘上（Docker volume）

---

## 六、速查命令

```bash
# 查看公网 IP
curl ifconfig.me

# 查看端口是否开放
# Windows: telnet 你的公网IP 3000
# Linux:   nc -zv 你的公网IP 3000

# pm2 日志
pm2 logs --lines 100

# 重启服务
pm2 restart changqingge
```

---

*文档版本: v1.0*
*创建日期: 2026-03-24*
*适用项目: ChangQingGe-Mahjong (Nuxt 4 + Nitro)*
