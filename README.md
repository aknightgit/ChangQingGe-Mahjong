# 长清阁麻将 ChangQingGe-Mahjong

上海麻将 × 四川麻将 · 多人在线

## 项目来源

Forked from [Blood-On-Mahjong](https://github.com/quiet98k/Blood-On-Mahjong)

## 技术栈

- **前端**: Nuxt 4 (Vue 3) + Nuxt UI 3
- **后端**: Nitro (Nuxt Server)
- **实时通信**: Socket.IO + Redis Adapter
- **数据库**: MongoDB
- **认证**: Google OAuth 2.0
- **部署**: Docker + Kubernetes

## 已实现功能

- ✅ 四人长清阁基本流程
- ✅ WebSocket 实时多人对战
- ✅ 摸牌/打牌/碰/杠/胡
- ✅ 胡牌判断（标准胡+七对）
- ✅ 番数计算
- ✅ Google OAuth 登录
- ✅ MongoDB 持久化
- ✅ Docker 容器化部署

## 待开发功能（长清阁特有规则）

- [ ] 风牌/箭牌/花牌
- [ ] 百搭牌系统
- [ ] 碰碰胡/混一色/清碰
- [ ] 互包(包三/包四)规则
- [ ] 造反功能
- [ ] 五毒散检测
- [ ] 自定义番数计算

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

## 环境变量

```env
MONGODB_URI=mongodb://localhost:27017/changqingge-mahjong
REDIS_URL=redis://localhost:6379
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## 项目结构

```
├── app/                    # 前端代码
│   ├── components/         # Vue组件
│   ├── pages/              # 页面
│   └── composables/        # 组合式API
├── server/                 # 后端代码
│   ├── api/                # API端点
│   ├── services/           # 业务逻辑
│   ├── utils/              # 工具函数（核心游戏逻辑）
│   └── types/              # TypeScript类型定义
├── tests/                  # E2E测试
├── Dockerfile              # Docker配置
└── werf.yaml               # Kubernetes部署
```

## 许可证

MIT

## 开发进度

详见 [blood-mahjong-analysis.md](../blood-mahjong-analysis.md) 和 [blood-mahjong-rule-diff.md](../blood-mahjong-rule-diff.md)
