<template>
  <div class="rules-page">
    <div class="rules-shell">
      <header class="rules-header">
        <button class="ghost-button" @click="goBack">← 返回</button>
        <div>
          <h1>🀄 长清阁麻将规则</h1>
          <p class="subtitle">完整规则速查手册</p>
        </div>
      </header>

      <!-- 快速导航 -->
      <nav class="toc">
        <button v-for="section in sections" :key="section.id"
          class="toc-item"
          :class="{ active: activeSection === section.id }"
          @click="scrollTo(section.id)">
          {{ section.icon }} {{ section.title }}
        </button>
      </nav>

      <div class="rules-content">
        <!-- 一、基础 -->
        <section :id="'basic'" class="rule-section">
          <h2>📋 基础规则</h2>
          <div class="rule-grid">
            <div class="rule-card">
              <h3>牌具</h3>
              <ul>
                <li><strong>144张牌</strong>（含8张花牌）</li>
                <li>万子 × 筒子 × 条子 各36张</li>
                <li>风牌 16张（东南西北）</li>
                <li>箭牌 12张（中发白）</li>
                <li>花牌 8张（梅兰竹菊春夏秋冬）</li>
              </ul>
            </div>
            <div class="rule-card">
              <h3>对局</h3>
              <ul>
                <li><strong>4人</strong>对局</li>
                <li>庄家 <strong>14张</strong>，闲家 <strong>13张</strong></li>
                <li>两颗骰子决定摸牌位置</li>
                <li>可重复掷骰（默认2次）</li>
              </ul>
            </div>
          </div>
        </section>

        <!-- 二、操作 -->
        <section :id="'actions'" class="rule-section">
          <h2>🎮 操作与优先级</h2>
          <div class="priority-list">
            <div class="priority-item" v-for="action in actions" :key="action.name"
              :style="{ borderLeftColor: action.color }">
              <div class="priority-badge" :style="{ background: action.color }">{{ action.priority }}</div>
              <div>
                <strong>{{ action.name }}</strong>
                <p>{{ action.desc }}</p>
              </div>
            </div>
          </div>
          <div class="rule-note">
            <strong>⚡ 优先级</strong>：胡 &gt; 杠 &gt; 碰 &gt; 吃
          </div>
        </section>

        <!-- 三、胡牌牌型 -->
        <section :id="'patterns'" class="rule-section">
          <h2>🏆 胡牌牌型</h2>
          <div class="pattern-table">
            <div class="pattern-row header">
              <span>牌型</span><span>固定点数</span><span>说明</span>
            </div>
            <div class="pattern-row" v-for="p in handPatterns" :key="p.name"
              :class="{ 'is-highlight': p.points >= 20 }">
              <span class="pattern-name">{{ p.name }}</span>
              <span class="pattern-points">{{ p.points }}点</span>
              <span class="pattern-desc">{{ p.desc }}</span>
            </div>
          </div>
          <div class="rule-note">
            <strong>优先级</strong>：风碰(40) → 风一色(20) → 清碰(20) → 八花(10) → 清一色(10) → 混一色 → 碰碰胡 → 四百搭(10)
          </div>
        </section>

        <!-- 四、公式计算 -->
        <section :id="'formula'" class="rule-section">
          <h2>🔢 公式计算（碰碰胡/混一色）</h2>
          <div class="formula-box">
            <code>基础点数 = 2 + 花牌数 + 组合牌点数</code>
            <span class="formula-cap">上限 10 点</span>
          </div>
          <div class="rule-grid">
            <div class="rule-card">
              <h3>组合牌点数</h3>
              <ul>
                <li>风牌刻子 = <strong>1点</strong></li>
                <li>箭牌刻子 = <strong>2点</strong></li>
                <li>风牌杠 = <strong>2点</strong></li>
                <li>箭牌杠 = <strong>3点</strong></li>
                <li>其他牌杠 = <strong>1点</strong></li>
                <li>暗杠在上述基础上 <strong>+1点</strong></li>
              </ul>
            </div>
            <div class="rule-card">
              <h3>额外翻倍</h3>
              <ul>
                <li>无百搭 → <strong>×2</strong></li>
                <li>门清 → <strong>×2</strong></li>
                <li>可叠加！（最高 ×4）</li>
              </ul>
              <h3 style="margin-top: 10px">最终公式</h3>
              <code class="formula-final">最终 = 牌型点 × 回合倍 × 全局倍 × 额外翻倍</code>
            </div>
          </div>
        </section>

        <!-- 五、特殊规则 -->
        <section :id="'special'" class="rule-section">
          <h2>⚡ 特殊规则</h2>
          <div class="rule-grid">
            <div class="rule-card special-card rebel-card">
              <h3>🚨 造反（五毒散）</h3>
              <p>首轮摸牌后，手牌<strong>同时满足</strong>：</p>
              <ul>
                <li>万筒条三门都有</li>
                <li>有风牌 + 有箭牌</li>
                <li>无花牌 + 无百搭</li>
                <li>无对子或刻子</li>
              </ul>
              <p class="special-effect">✨ 效果：本局结束，<strong>下局翻倍</strong>，造反者当庄</p>
            </div>
            <div class="rule-card special-card">
              <h3>🔄 血战到底</h3>
              <ul>
                <li>胡牌玩家<strong>离场</strong></li>
                <li>剩一人或牌墙摸完才结束</li>
                <li>支持<strong>一炮多响</strong></li>
              </ul>
            </div>
            <div class="rule-card special-card">
              <h3>📦 包三家/包四家</h3>
              <ul>
                <li>吃/碰/杠同一人 <strong>3口 → ×3</strong></li>
                <li>吃/碰/杠同一人 <strong>4口 → ×5</strong></li>
                <li>互包放冲 → 统一 <strong>×2</strong></li>
                <li>四口自摸 → 互包方付 <strong>×5</strong>，其余不付</li>
              </ul>
            </div>
            <div class="rule-card special-card">
              <h3>🃏 百搭规则</h3>
              <ul>
                <li>随机选一张（不移除牌墙）</li>
                <li>可替代任意牌</li>
                <li>打出百搭 → 不可吃碰杠</li>
                <li>打出百搭 → 仅允许自摸</li>
              </ul>
            </div>
          </div>
        </section>

        <!-- 六、杠与抢杠 -->
        <section :id="'kong'" class="rule-section">
          <h2>🎯 杠与抢杠</h2>
          <div class="rule-grid">
            <div class="rule-card">
              <h3>杠的类型</h3>
              <ul>
                <li><strong>暗杠</strong>：手里4张，不公开，不破门清</li>
                <li><strong>明杠</strong>：别人打出第4张</li>
                <li><strong>补杠</strong>：碰后自摸第4张</li>
                <li><strong>杠花</strong>：花牌自动补牌</li>
              </ul>
            </div>
            <div class="rule-card">
              <h3>抢杠</h3>
              <ul>
                <li>仅<strong>自摸补杠</strong>可被抢</li>
                <li>手牌暗杠不可抢</li>
                <li>碰碰胡/混一色抢杠需<strong>门口有花</strong></li>
                <li>抢杠结算：<strong>×3</strong></li>
                <li>杠开：固定 <strong>10点</strong></li>
              </ul>
            </div>
          </div>
        </section>

        <!-- 七、翻倍系统 -->
        <section :id="'multiplier'" class="rule-section">
          <h2>✖️ 翻倍系统</h2>
          <div class="rule-grid">
            <div class="rule-card">
              <h3>回合倍数（骰子）</h3>
              <ul>
                <li>1+1 或 4+4 → <strong>×4</strong></li>
                <li>其他对子 → <strong>×2</strong></li>
                <li>1+4 → <strong>×2</strong></li>
                <li>其他组合 → <strong>×1</strong></li>
              </ul>
            </div>
            <div class="rule-card">
              <h3>全局倍数（跨局累积）</h3>
              <ul>
                <li>流局 → 下局 <strong>×2</strong></li>
                <li>造反 → 下局 <strong>×2</strong></li>
                <li>可叠加，<strong>上限 ×8</strong></li>
              </ul>
            </div>
          </div>
        </section>

        <!-- 八、门清与无花自摸 -->
        <section :id="'bonus'" class="rule-section">
          <h2>🌟 加成牌型</h2>
          <div class="rule-grid">
            <div class="rule-card">
              <h3>门清</h3>
              <ul>
                <li>没有吃/碰/明杠</li>
                <li>暗杠和杠花<strong>不破</strong>门清</li>
                <li>胡牌时<strong>额外 ×2</strong></li>
              </ul>
            </div>
            <div class="rule-card">
              <h3>无花自摸（10点）</h3>
              <ul>
                <li>碰碰胡或混一色</li>
                <li><strong>自摸</strong>胡牌</li>
                <li>门口无花牌</li>
                <li>手牌无风向刻/杠</li>
              </ul>
            </div>
          </div>
        </section>
      </div>

      <footer class="rules-footer">
        <p>长清阁麻将 · 需求文档 v2.3</p>
        <button class="ghost-button" @click="goBack">返回</button>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
const router = useRouter()

const goBack = () => {
  // 返回上一页，如果没有历史则回首页
  if (window.history.length > 1) {
    router.back()
  } else {
    navigateTo('/')
  }
}

const activeSection = ref('basic')

const sections = [
  { id: 'basic', title: '基础', icon: '📋' },
  { id: 'actions', title: '操作', icon: '🎮' },
  { id: 'patterns', title: '牌型', icon: '🏆' },
  { id: 'formula', title: '公式', icon: '🔢' },
  { id: 'special', title: '特殊', icon: '⚡' },
  { id: 'kong', title: '杠', icon: '🎯' },
  { id: 'multiplier', title: '翻倍', icon: '✖️' },
  { id: 'bonus', title: '加成', icon: '🌟' },
]

const scrollTo = (id: string) => {
  activeSection.value = id
  const el = document.getElementById(id)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

const actions = [
  { name: '胡', priority: 1, desc: '自摸/捉冲/抢杠', color: '#ef5350' },
  { name: '杠', priority: 2, desc: '明杠/暗杠/补杠', color: '#ab47bc' },
  { name: '碰', priority: 3, desc: '任意家打出第3张', color: '#ff9800' },
  { name: '吃', priority: 4, desc: '仅上家打出的牌', color: '#42a5f5' },
]

const handPatterns = [
  { name: '风碰', points: 40, desc: '全风牌 + 碰碰胡' },
  { name: '风一色', points: 20, desc: '全部是风牌' },
  { name: '清碰', points: 20, desc: '清一色 + 碰碰胡' },
  { name: '八花自摸', points: 10, desc: '手牌+副露共8朵花' },
  { name: '清一色', points: 10, desc: '同一种花色' },
  { name: '杠开', points: 10, desc: '杠牌/杠花后补牌自摸' },
  { name: '无花自摸', points: 10, desc: '碰碰胡/混一色+无花+自摸' },
  { name: '四百搭', points: 10, desc: '手牌有4张百搭' },
  { name: '大吊', points: 10, desc: '手牌仅剩单张听牌' },
  { name: '混碰', points: 10, desc: '混一色 + 碰碰胡' },
  { name: '混一色', points: '-', desc: '一门花色 + 风/箭（公式计算）' },
  { name: '碰碰胡', points: '-', desc: '全是刻子/对子（公式计算）' },
]
</script>

<style scoped>
.rules-page {
  min-height: 100vh;
  background: radial-gradient(circle at top, #153b2f, #07130e);
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: #f5f5f5;
  padding: 16px;
}

.rules-shell {
  max-width: 900px;
  margin: 0 auto;
}

.rules-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.rules-header h1 {
  font-size: 1.5rem;
  margin: 0;
}

.subtitle {
  opacity: 0.7;
  font-size: 0.85rem;
  margin: 2px 0 0;
}

.ghost-button {
  padding: 8px 16px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: transparent;
  color: #f5f5f5;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.15s ease;
}

.ghost-button:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.3);
}

/* 快速导航 */
.toc {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 20px;
  padding: 10px 14px;
  background: rgba(5, 14, 10, 0.8);
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  position: sticky;
  top: 8px;
  z-index: 10;
  backdrop-filter: blur(8px);
}

.toc-item {
  padding: 5px 12px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: transparent;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.toc-item:hover,
.toc-item.active {
  background: rgba(31, 138, 82, 0.3);
  border-color: rgba(70, 197, 116, 0.5);
  color: #fff;
}

/* 内容区 */
.rules-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.rule-section {
  background: rgba(5, 14, 10, 0.85);
  border-radius: 16px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  scroll-margin-top: 70px;
}

.rule-section h2 {
  font-size: 1.2rem;
  margin: 0 0 14px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

/* 卡片网格 */
.rule-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 12px;
}

.rule-card {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  padding: 14px;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.rule-card h3 {
  font-size: 0.95rem;
  margin: 0 0 8px;
  color: #a8e6c8;
}

.rule-card ul {
  margin: 0;
  padding-left: 18px;
  line-height: 1.7;
  font-size: 0.85rem;
}

.rule-card code {
  display: block;
  background: rgba(0, 0, 0, 0.3);
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 0.85rem;
  margin-top: 8px;
  color: #ffd36a;
}

/* 操作优先级 */
.priority-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.priority-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 10px;
  border-left: 3px solid;
}

.priority-badge {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.85rem;
  flex-shrink: 0;
}

.priority-item p {
  margin: 2px 0 0;
  font-size: 0.8rem;
  opacity: 0.7;
}

.rule-note {
  background: rgba(255, 215, 0, 0.08);
  border: 1px solid rgba(255, 215, 0, 0.2);
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 0.85rem;
  margin-top: 10px;
}

/* 牌型表格 */
.pattern-table {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.pattern-row {
  display: grid;
  grid-template-columns: 120px 80px 1fr;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 0.85rem;
  align-items: center;
}

.pattern-row.header {
  background: rgba(255, 255, 255, 0.05);
  font-weight: 700;
  font-size: 0.8rem;
  opacity: 0.7;
}

.pattern-row:not(.header) {
  background: rgba(255, 255, 255, 0.02);
}

.pattern-row.is-highlight {
  background: rgba(255, 215, 0, 0.08);
  border: 1px solid rgba(255, 215, 0, 0.15);
}

.pattern-name {
  font-weight: 600;
}

.pattern-points {
  color: #ffd36a;
  font-weight: 700;
  text-align: center;
}

.pattern-desc {
  opacity: 0.8;
}

/* 公式 */
.formula-box {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  padding: 16px;
  text-align: center;
  margin-bottom: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
}

.formula-box code {
  font-size: 1.1rem;
  color: #ffd36a;
  font-weight: 600;
}

.formula-cap {
  background: rgba(255, 87, 34, 0.2);
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 0.8rem;
  color: #ff8a65;
  border: 1px solid rgba(255, 87, 34, 0.3);
}

.formula-final {
  color: #81c784 !important;
}

/* 特殊规则卡片 */
.special-card {
  border-left: 3px solid;
}

.rebel-card {
  border-left-color: #ef5350;
}

.special-effect {
  margin-top: 8px;
  padding: 6px 10px;
  background: rgba(255, 215, 0, 0.08);
  border-radius: 8px;
  font-size: 0.85rem;
}

/* 页脚 */
.rules-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 0;
  opacity: 0.6;
  font-size: 0.8rem;
}

/* 响应式 */
@media (max-width: 600px) {
  .rules-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .toc {
    top: 4px;
    padding: 8px 10px;
    gap: 4px;
  }

  .toc-item {
    font-size: 0.7rem;
    padding: 4px 8px;
  }

  .pattern-row {
    grid-template-columns: 90px 60px 1fr;
    font-size: 0.78rem;
    padding: 6px 8px;
  }

  .rule-section {
    padding: 14px;
  }

  .formula-box code {
    font-size: 0.9rem;
  }
}
</style>
