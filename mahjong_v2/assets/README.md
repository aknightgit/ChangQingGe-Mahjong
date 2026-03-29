# 麻将素材目录

## 素材状态

### ✅ 已生成 (代码生成)

| 组件 | 路径 | 说明 |
|------|------|------|
| 牌面组件 | `lib/widgets/tile_widget.dart` | Flutter代码绘制 |
| 骰子组件 | `lib/widgets/dice_widget.dart` | Flutter代码绘制 |
| 玩家头像 | `lib/widgets/player_widget.dart` | Flutter代码绘制 |
| 牌桌背景 | `lib/widgets/table_widget.dart` | Flutter代码绘制 |

**优势**: 无需外部图片资源，代码生成，适配性强

---

### ⏳ 待获取 (需要外部素材)

如需更精美素材，可后续添加：

```
assets/
├── images/
│   ├── tiles/           # 牌面图片 (34种x4张)
│   │   ├── wan_1.png ~ wan_9.png
│   │   ├── tong_1.png ~ tong_9.png
│   │   ├── tiao_1.png ~ tiao_9.png
│   │   ├── dong.png, nan.png, xi.png, bei.png
│   │   ├── zhong.png, fa.png, bai.png
│   │   └── hua_*.png
│   ├── backgrounds/     # 背景
│   │   └── table_bg.png
│   └── avatars/        # 玩家头像
│       └── default.png
└── sounds/             # 音效
    ├── draw.mp3
    ├── play.mp3
    ├── peng.mp3
    ├── gang.mp3
    └── hu.mp3
```

---

### 🎨 素材获取方式

1. **AI生成** (需要配置API KEY)
2. **开源素材** (GitHub麻将素材项目)
3. **自己绘制** (如需要特定风格)

---

> 当前使用Flutter代码绘制的占位符素材，足以进行开发测试
