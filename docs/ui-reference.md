# 长青阁麻将 - UI 参考方案

> 整理时间: 2026-03-26
> 收集的开源项目、CSS 代码片段、布局坐标数据

---

## 目录

1. [开源项目参考](#1-开源项目参考)
2. [牌桌标准布局（俯视图）](#2-牌桌标准布局俯视图)
3. [麻将牌 CSS 实现](#3-麻将牌-css-实现)
4. [牌桌 CSS 样式](#4-牌桌-css-样式)
5. [风牌指示器](#5-风牌指示器)
6. [配色方案](#6-配色方案)
7. [SVG 牌面素材](#7-svg-牌面素材)

---

## 1. 开源项目参考

### 1.1 clysto/mahjong ⭐3 — 纯 HTML/CSS 界面（强烈推荐）
- **URL**: https://github.com/clysto/mahjong
- **在线 Demo**: https://clysto.github.io/mahjong
- **技术栈**: Go + Mithril.js (前端) + WASM
- **亮点**:
  - 纯 SVG 牌面（34 种牌，viewBox="0 0 19 26"）
  - 纯 CSS 牌桌布局，无图片依赖
  - 响应式设计，支持 PWA
  - 牌面颜色：黑色(#011833) + 红色(#881c21)

### 1.2 Pomax/mahjong ⭐105 — 完整 CSS 麻将游戏（强烈推荐）
- **URL**: https://github.com/Pomax/mahjong
- **技术栈**: 纯 HTML + CSS + JavaScript (Web Components)
- **亮点**:
  - 完整的四人麻将牌桌布局
  - 详细的 CSS 变量系统（颜色主题化）
  - 弃牌区、风牌指示器、玩家位置全部 CSS 实现
  - 有完整的教学教程

### 1.3 FluffyStuff/riichi-mahjong-tiles ⭐514 — SVG 牌面素材
- **URL**: https://github.com/FluffyStuff/riichi-mahjong-tiles
- **技术栈**: 纯 SVG 矢量图形
- **亮点**:
  - 包含 Black / Colorful / Red / White 多种风格
  - 每种牌都有独立 SVG 文件
  - 可直接用于 Web 项目

### 1.4 danbeck/green-mahjong ⭐99 — 多主题 CSS 麻将
- **URL**: https://github.com/danbeck/green-mahjong
- **技术栈**: HTML + CSS + JavaScript
- **亮点**:
  - 多种主题和布局
  - 响应式设计（大屏/小屏/超大屏 CSS 断点）
  - 配色方案参考

### 1.5 其他参考
- `ffalt/mah` ⭐119 — HTML5 连连看麻将
- `xiyoufang/mahjong` ⭐415 — Cocos2d-X 商业级麻将（C++，非 Web）
- `jynnie/majiang` ⭐8 — Web 麻将平台（React）

---

## 2. 牌桌标准布局（俯视图）

### 2.1 坐标体系（推荐用百分比坐标）
- 定义牌桌容器为 **100 × 100** 的正方形（0,0 为左上角）
- 关键区域：**玩家区 / 牌墙 / 弃牌区 / 露牌区 / 手牌区**

> 以下坐标可直接用于 CSS absolute / Canvas 计算：

| 区域 | 坐标范围（x1,y1 ~ x2,y2） | 说明 |
|---|---|---|
| 中央弃牌区 | (30,30) ~ (70,70) | 6×6 或 7×7 弃牌格子 |
| 北家手牌区 | (15,5) ~ (85,18) | 旋转 180° |
| 南家手牌区 | (15,82) ~ (85,95) | 自己手牌 |
| 西家手牌区 | (5,15) ~ (18,85) | 旋转 90° |
| 东家手牌区 | (82,15) ~ (95,85) | 旋转 -90° |
| 北家牌墙 | (23,22) ~ (77,28) | 17×2 暗牌堆 |
| 南家牌墙 | (23,72) ~ (77,78) | 17×2 暗牌堆 |
| 西家牌墙 | (22,23) ~ (28,77) | 17×2 暗牌堆 |
| 东家牌墙 | (72,23) ~ (78,77) | 17×2 暗牌堆 |
| 露牌区（吃/碰/杠） | 各玩家手牌左侧 | 一般跟随手牌排列 |

> 备注：如果以 **Pomax/mahjong** 的 CSS 为基准，则：
> - 牌桌宽高 `--w == --h`
> - 手牌区高度 `--ph`（约占桌面 9%）
> - 弃牌区：`top=--ph, left=--ph, size=--w-2*--ph`

#### Pomax 公式（可直接复用）
```css
:root { --w: 45em; --h: var(--w); --ph: 4em; }

.discards {
  --d: calc(var(--w) - calc(2 * var(--ph)));
  position: absolute;
  top: var(--ph);
  left: var(--ph);
  width: var(--d);
  height: var(--d);
}
```

---

## 3. 麻将牌 CSS 实现

### 3.1 纯 CSS 牌面模板（无图片）

#### 牌面容器（通用）
```html
<div class="tile pin pin-1"></div>
<div class="tile pin pin-5"></div>
<div class="tile sou sou-3"></div>
<div class="tile man man-1"></div>
<div class="tile wind wind-east"></div>
<div class="tile dragon dragon-red"></div>
<div class="tile flower flower-spring"></div>
```

```css
.tile {
  position: relative;
  width: 40px;
  aspect-ratio: 57 / 78; /* 类似 clysto/mahjong */
  border: 1px solid #93989c;
  border-radius: 6px;
  background: #f5f6f7;
  box-shadow: 0 2px 0 #bcbec2;
}

/* 3D 效果（可选） */
.tile.shadow {
  box-shadow: 0px -6px 0px #93989c, 0px -9px 0px #1d3954;
}
```

> 以上 shadow 样式来自 **clysto/mahjong**，纯 CSS 立体效果。

---

### 3.2 筒子（圆点排列）
用单个伪元素 + `box-shadow` 复制圆点：

```css
.pin::before {
  content: '';
  position: absolute;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #1b4ae8;
  left: 50%;
  top: 50%;
  transform: translate(-50%,-50%);
}

/* 1筒 */
.pin-1::before { box-shadow: none; }

/* 2筒 */
.pin-2::before {
  box-shadow:
    -10px -10px 0 #1b4ae8,
     10px  10px 0 #1b4ae8;
}

/* 5筒（四角 + 中心） */
.pin-5::before {
  box-shadow:
    -12px -12px 0 #1b4ae8,
     12px -12px 0 #1b4ae8,
    -12px  12px 0 #1b4ae8,
     12px  12px 0 #1b4ae8;
}
```

---

### 3.3 条子（竹节样式）
用 `linear-gradient` + 伪元素组合：

```css
.sou::before {
  content: '';
  position: absolute;
  inset: 10px 12px;
  background:
    repeating-linear-gradient(
      to bottom,
      #2e9f4b 0 6px,
      #1e6e35 6px 8px,
      transparent 8px 18px
    );
}

/* 3条 => 3根竹节 */
.sou-3::before {
  background-size: 100% 22px;
  background-position: center 0;
}
```

---

### 3.4 万子（中文字符）
直接使用中文字符（建议字体：KaiTi / SimSun / serif）：

```css
.man::before {
  content: '一';
  position: absolute;
  top: 18px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 20px;
  color: #111;
  font-family: 'KaiTi','SimSun',serif;
}

.man::after {
  content: '萬';
  position: absolute;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 16px;
  color: #b00000;
  font-family: 'KaiTi','SimSun',serif;
}
```

---

### 3.5 风牌 / 箭牌 / 花牌
```css
.wind-east::before { content: '東'; }
.wind-south::before { content: '南'; }
.wind-west::before { content: '西'; }
.wind-north::before { content: '北'; }

.dragon-red::before { content: '中'; color: #c00; }
.dragon-green::before { content: '發'; color: #0a8d3a; }
.dragon-white::before { content: '白'; color: #555; }

.flower-spring::before { content: '春'; color: #c33; }
.flower-summer::before { content: '夏'; color: #0a8d3a; }
.flower-autumn::before { content: '秋'; color: #d38b00; }
.flower-winter::before { content: '冬'; color: #2b5bd6; }

.wind::before, .dragon::before, .flower::before {
  position: absolute;
  left: 50%; top: 50%;
  transform: translate(-50%,-50%);
  font-size: 26px;
  font-family: 'KaiTi','SimSun',serif;
}
```

---

## 4. 牌桌 CSS 样式

### 4.1 Pomax 布局（四人牌桌标准参考）

**玩家位置布局**（旋转 + translate）
```css
.player:nth-child(1) {
  --xp: calc(var(--ph) - var(--w));
  transform: rotate(var(--p1)) translate(var(--xp), 0);
}
.player:nth-child(2) {
  --xp: calc(calc(2 * var(--ph)) - var(--w));
  --yp: calc(var(--w) - var(--ph));
  transform: rotate(var(--p2)) translate(var(--xp),var(--yp));
}
.player:nth-child(3) {
  --yp: calc(var(--w) - calc(3 * var(--ph)));
  transform: rotate(var(--p3)) translate(0, var(--yp));
}
.player:nth-child(4) {
  --xp: calc(0em - calc(3 * var(--ph)));
  transform: rotate(var(--p4)) translate(var(--xp), 0em);
}
```

**弃牌区**（中心正方形）
```css
.discards {
  --d: calc(var(--w) - calc(2 * var(--ph)));
  position: absolute;
  top: var(--ph);
  left: var(--ph);
  width: var(--d);
  height: var(--d);
  display: flex;
  flex-wrap: wrap; /* 丢牌格子 */
  justify-content: center;
  align-items: center;
}
```

> 上述代码来自 **Pomax/mahjong**。

---

### 4.2 牌桌“菱形/透视”效果（CSS Transform）

```css
.table {
  width: 800px;
  height: 800px;
  background: #1f422d;
  transform: perspective(900px) rotateX(55deg) rotateZ(45deg);
  box-shadow: 0 30px 60px rgba(0,0,0,.4);
  border-radius: 16px;
}

.table-inner {
  transform: rotate(-45deg) scale(0.9);
}
```

---

### 4.3 CSS 3D 麻将牌（立体效果）

```css
.tile-3d {
  width: 40px;
  height: 56px;
  background: #f5f6f7;
  border-radius: 6px;
  position: relative;
  transform: perspective(300px) rotateX(20deg);
  box-shadow:
    0 2px 0 #bcbec2,
    2px 6px 8px rgba(0,0,0,0.25);
}

.tile-3d::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -6px;
  height: 6px;
  background: #d0d4d7; /* 侧面 */
  border-radius: 0 0 6px 6px;
  transform: skewX(45deg);
}
```

---

## 5. 风牌指示器

**Pomax 的风牌指示器（中央菱形）**
```css
.windicator {
  --wotr-dim: 8em;
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%) rotate(45deg);
  width: var(--wotr-dim);
  height: var(--wotr-dim);
  border: 3px solid var(--windicator-border);
  background: var(--windicator-background);
}

.windicator .player-wind {
  width: 1.5em; height: 1.5em;
  border-radius: 50%;
  position: absolute;
  transform: rotate(-45deg);
}
```

---

## 6. 配色方案（绿色毛毡风格）

**Pomax 颜色变量（推荐）**
```css
:root {
  --green: rgb(50, 120, 50);
  --dark-green: darkgreen;
  --purple: rgb(70, 0, 70);
  --gold: gold;
  --cream: rgb(245, 240, 220);
  --tile-background: rgb(245, 245, 245);
  --tile-border: black;
}
```

完整颜色表见：
- https://github.com/Pomax/mahjong/blob/master/src/css/base-colors.css
- https://github.com/Pomax/mahjong/blob/master/src/css/colors.css

---

## 7. SVG 牌面素材

### 7.1 clysto/mahjong
- 牌面 SVG 路径：`web/src/components/tiles/*.svg`
- 示例：
  - 1筒: https://raw.githubusercontent.com/clysto/mahjong/main/web/src/components/tiles/1p.svg
  - 1条: https://raw.githubusercontent.com/clysto/mahjong/main/web/src/components/tiles/1s.svg
  - 1万: https://raw.githubusercontent.com/clysto/mahjong/main/web/src/components/tiles/1m.svg
  - 东风: https://raw.githubusercontent.com/clysto/mahjong/main/web/src/components/tiles/1z.svg

### 7.2 FluffyStuff/riichi-mahjong-tiles
- 提供完整 SVG/PNG 牌面（含黑白套）
- 目录：`Black/`, `Regular/`, `Red/`, `White/`
- GitHub: https://github.com/FluffyStuff/riichi-mahjong-tiles

---

## 8. 额外参考（3D/透视实现）

### nantas/MahjongView ⭐23（伪 3D 牌桌）
- URL: https://github.com/nantas/MahjongView
- 关键代码：`assets/scripts/PerspectiveController.js`
- 使用 WebGL 注入透视矩阵，模拟 3D 牌桌效果

---

> ✅ 上述方案涵盖：
> - 牌桌标准布局坐标
> - 牌墙 / 弃牌区 / 手牌区 的位置设计
> - CSS 牌面实现
> - 3D 立体麻将牌效果
> - 开源参考项目和素材
