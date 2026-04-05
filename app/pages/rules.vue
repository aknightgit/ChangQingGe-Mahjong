<template>
  <div class="rules-page">
    <div class="rules-shell">
      <header class="rules-header">
        <button class="ghost-button" @click="goBack">← 返回</button>
        <div>
          <h1>🀄 长清阁麻将规则</h1>
          <p class="subtitle">人人对战规则 v1.0 · 2026-04-05</p>
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
        <!-- 一、基础配置 -->
        <section :id="'basic'" class="rule-section">
          <h2>📋 基础配置</h2>
          <div class="rule-grid">
            <div class="rule-card">
              <h3>牌具</h3>
              <ul>
                <li><strong>144张牌</strong>（含8张花牌）</li>
                <li>万子 × 筒子 × 条子 各36张</li>
                <li>风牌 16张（东南西北）</li>
                <li>箭牌 12张（中发白）</li>
                <li>花牌 8张（春夏秋冬梅兰竹菊）</li>
              </ul>
            </div>
            <div class="rule-card">
              <h3>对局</h3>
              <ul>
                <li><strong>4人</strong>对局</li>
                <li>庄家 <strong>14张</strong>，闲家 <strong>13张</strong></li>
                <li>骰子决定庄家</li>
                <li><strong>血战到底</strong>：胡牌离场，剩1人或牌墙摸完结束</li>
              </ul>
            </div>
          </div>
        </section>

        <!-- 二、回合流程 -->
        <section :id="'actions'" class="rule-section">
          <h2>🎮 回合流程</h2>
          <div class="flow-box">
            <code>摸牌 → 可杠/可胡 → 打牌 → 他人抢牌窗口 → 下家摸牌</code>
          </div>
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

        <!-- 三、决策犹豫期（抢牌窗口） -->
        <section :id="'freeze'" class="rule-section">
          <h2>⏰ 决策犹豫期（抢牌窗口）</h2>
          <div class="freeze-flow">
            <div class="freeze-step">
              <div class="freeze-icon">🀄</div>
              <div>
                <strong>上家出牌</strong>
                <p>系统立即广播，碰/杠/胡按钮高亮</p>
              </div>
            </div>
            <div class="freeze-arrow">→</div>
            <div class="freeze-step freeze-parallel">
              <div class="freeze-icon">⚡</div>
              <div>
                <strong>两个并行流程</strong>
                <p>① 抢牌窗口：其他人可碰/杠/胡<br>② 下家冻结等待，时间到自动摸牌</p>
              </div>
            </div>
            <div class="freeze-arrow">→</div>
            <div class="freeze-step">
              <div class="freeze-icon">🏁</div>
              <div>
                <strong>谁先完成谁赢</strong>
                <p>有人抢 → 立即执行，接管回合<br>没人抢 → 下家自动摸牌</p>
              </div>
            </div>
          </div>
          <div class="rule-note">
            <strong>💡 核心</strong>：碰/杠/胡是<strong>抢的机会</strong>，不是必须等待的环节。没有"过"按钮，不响应 = 放弃。
          </div>
        </section>

        <!-- 四、百搭系统 -->
        <section :id="'wild'" class="rule-section">
          <h2>🃏 百搭系统</h2>
          <div class="rule-grid">
            <div class="rule-card">
              <h3>百搭确定</h3>
              <ul>
                <li>每局<strong>随机指定一张</strong>为百搭（不从牌墙移除）</li>
                <li>百搭可替代任意牌参与胡牌</li>
                <li>百搭打出后<strong>不可被吃/碰/杠</strong></li>
                <li>百搭打出触发<strong>一圈冷冻</strong>（4人各出一张后解冻），期间不可吃/碰/捉冲</li>
              </ul>
            </div>
            <div class="rule-card">
              <h3>花牌百搭</h3>
              <ul>
                <li>百搭为春夏秋冬 → <strong>四张花牌全部为百搭</strong></li>
                <li>百搭为梅兰竹菊 → <strong>四张花牌全部为百搭</strong></li>
                <li>百搭花牌摸到后<strong>进入手牌</strong>（不放门口，不补花）</li>
                <li>普通花牌摸到后放门口，等回合补花</li>
              </ul>
            </div>
          </div>
        </section>

        <!-- 五、胡牌牌型 -->
        <section :id="'patterns'" class="rule-section">
          <h2>🏆 胡牌牌型</h2>
          <div class="pattern-table">
            <div class="pattern-row header">
              <span>牌型</span><span>点数</span><span>说明</span>
            </div>
            <div class="pattern-row" v-for="p in handPatterns" :key="p.name"
              :class="{ 'is-highlight': p.points >= 20 }">
              <span class="pattern-name">{{ p.name }}</span>
              <span class="pattern-points">{{ p.points }}</span>
              <span class="pattern-desc">{{ p.desc }}</span>
            </div>
          </div>
          <div class="rule-note">
            <strong>优先级</strong>：风碰(40) → 风一色(20) → 清碰(20) → 大吊(10) → 杠开(10) → 八花自摸(10) → 无花自摸(10) → 清一色(10) → 混碰(10) → 四百搭(10) → 混一色(公式) → 碰碰胡(公式)
          </div>
        </section>

        <!-- 六、公式计算 -->
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
                <li>门清（无吃/碰/明杠，暗杠不破）→ <strong>×2</strong></li>
                <li>可叠加！（最高 ×4）</li>
              </ul>
              <h3 style="margin-top: 10px">最终公式</h3>
              <code class="formula-final">最终点数 = 牌型点数 × 额外翻倍 × 全局倍数</code>
            </div>
          </div>
        </section>

        <!-- 七、捉冲/抢杠限制 -->
        <section :id="'restriction'" class="rule-section">
          <h2>🚧 捉冲/抢杠限制</h2>
          <div class="rule-card special-card rebel-card">
            <h3>有效番数要求</h3>
            <p>碰碰胡/混一色捉冲或抢杠时，门口必须有<strong>有效番数</strong>之一：</p>
            <ul>
              <li>🌸 <strong>花牌</strong>（门口有花）</li>
              <li>🌬️ <strong>风箭刻</strong>（风牌/箭牌的刻子或杠）</li>
              <li>🎯 <strong>任意杠牌</strong>（明杠/暗杠/补杠均可）</li>
            </ul>
            <p class="special-effect">✅ 例外：大吊不受此限，可随时捉冲</p>
            <p class="special-effect">✅ 例外：固定点数≥10的牌型不受此限</p>
          </div>
        </section>

        <!-- 八、杠与抢杠 -->
        <section :id="'kong'" class="rule-section">
          <h2>🎯 杠与抢杠</h2>
          <div class="rule-grid">
            <div class="rule-card">
              <h3>杠的类型</h3>
              <ul>
                <li><strong>暗杠</strong>：手里4张，不露牌面，不破门清</li>
                <li><strong>明杠</strong>：他人打出第4张</li>
                <li><strong>补杠</strong>：门口刻子 + 自摸第4张</li>
              </ul>
            </div>
            <div class="rule-card">
              <h3>抢杠</h3>
              <ul>
                <li>仅<strong>补杠</strong>可被抢杠</li>
                <li>暗杠/明杠<strong>不可抢</strong></li>
                <li>抢杠结算：<strong>牌型点数 × 3</strong>，仅杠家赔付</li>
                <li>杠开（杠后补牌自摸）：固定 <strong>10点</strong></li>
              </ul>
            </div>
          </div>
        </section>

        <!-- 九、互包规则 -->
        <section :id="'bao'" class="rule-section">
          <h2>📦 互包规则（包三/包四）</h2>
          <div class="rule-grid">
            <div class="rule-card">
              <h3>触发条件</h3>
              <ul>
                <li>吃/碰/杠同一人 <strong>3口 → ×3</strong></li>
                <li>吃/碰/杠同一人 <strong>4口 → ×5</strong></li>
              </ul>
            </div>
            <div class="rule-card">
              <h3>结算规则</h3>
              <ul>
                <li>互包双方互相放冲 → 统一 <strong>×2</strong></li>
                <li>第三方放冲 → 放冲者×1，互包输家向胜者×1</li>
                <li>自摸（三口）→ 互包输家×3，其他玩家×1</li>
                <li>自摸（四口）→ 互包输家×5，其他玩家<strong>不赔付</strong></li>
              </ul>
            </div>
          </div>
        </section>

        <!-- 十、点数结算 -->
        <section :id="'multiplier'" class="rule-section">
          <h2>✖️ 点数结算</h2>
          <div class="formula-box">
            <code>全局倍数 = min(8, 骰子倍数 × 流局倍数 × 继承倍数)</code>
          </div>
          <div class="rule-grid">
            <div class="rule-card">
              <h3>骰子倍数</h3>
              <ul>
                <li>1+1 或 4+4 → <strong>×4</strong></li>
                <li>其他对子 → <strong>×2</strong></li>
                <li>其他 → <strong>×1</strong></li>
              </ul>
            </div>
            <div class="rule-card">
              <h3>流局与继承</h3>
              <ul>
                <li>流局 → 下局 <strong>×2</strong></li>
                <li>造反 → 下局 <strong>×2</strong></li>
                <li>封顶×8后，翻倍因子继续后台继承到下局</li>
                <li>非流局/非造反结局时，流局倍数和继承倍数恢复×1</li>
              </ul>
            </div>
          </div>
        </section>

        <!-- 十一、特色玩法 -->
        <section :id="'special'" class="rule-section">
          <h2>⚡ 特色玩法</h2>
          <div class="rule-grid">
            <div class="rule-card special-card rebel-card">
              <h3>🚨 造反（五毒散）</h3>
              <p>首轮摸满手牌，<strong>同时满足</strong>：</p>
              <ul>
                <li>筒/万/条三门都有</li>
                <li>有风牌 + 有箭牌</li>
                <li>无花牌、无百搭、无对子/刻子</li>
              </ul>
              <p class="special-effect">✨ 效果：本局结束 → 下局全局倍数 ×2 → 造反者成庄家</p>
            </div>
            <div class="rule-card special-card">
              <h3>🔥 梁山聚义</h3>
              <ul>
                <li>仅<strong>4人全真人</strong>局，前3回合可发起</li>
                <li>累积赢分超过 QJ线（默认4000）的玩家<strong>无否决权</strong></li>
                <li>全员通过 → 本局结束，下局翻倍</li>
              </ul>
            </div>
            <div class="rule-card special-card">
              <h3>🙏 谢谢带头大哥</h3>
              <ul>
                <li>某玩家打出某张牌</li>
                <li>随后<strong>同回合内其他3玩家全部打出同样牌</strong></li>
                <li>该玩家赔付其余三家每家 <strong>10分</strong>（胡牌结算时一起扣除，带备注）</li>
              </ul>
            </div>
            <div class="rule-card special-card">
              <h3>🪑 换座</h3>
              <ul>
                <li>有效输分达到 QJ线（默认4000）可发起</li>
                <li>输4000=1次，输8000=2次，输12000=3次（最多10次）</li>
                <li>下一局开始前生效</li>
              </ul>
            </div>
          </div>
        </section>

        <!-- 十二、花牌规则 -->
        <section :id="'flower'" class="rule-section">
          <h2>🌸 花牌规则</h2>
          <div class="rule-card">
            <ul>
              <li>摸到花牌 → 放入副露区 → 从牌墙<strong>尾部</strong>补牌</li>
              <li>补到花牌 → 继续补，直到非花牌</li>
              <li>花牌不参与胡牌牌型判断</li>
              <li><strong>八花自摸</strong>：独家摸齐8朵花 + 自摸 = 固定10点</li>
            </ul>
          </div>
        </section>

        <!-- 十三、流局 -->
        <section :id="'draw'" class="rule-section">
          <h2>🔄 流局</h2>
          <div class="rule-card">
            <ul>
              <li>牌墙摸完无人胡牌 → <strong>流局</strong></li>
              <li>流局 → 下局全局倍数 <strong>×2</strong></li>
            </ul>
          </div>
        </section>

        <!-- 十四、AI与超时规则 -->
        <section :id="'ai'" class="rule-section">
          <h2>🤖 AI与超时规则</h2>
          <div class="rule-grid">
            <div class="rule-card special-card">
              <h3>⏱️ 超时规则</h3>
              <ul>
                <li>摸牌后 <strong>60秒</strong> 未出牌 → 自动打出摸到的牌</li>
                <li>连续 <strong>2次</strong> 超时 → AI 接管该玩家</li>
                <li>点击「我回来了」恢复控制</li>
              </ul>
            </div>
            <div class="rule-card special-card rebel-card">
              <h3>⚠️ AI接管惩罚</h3>
              <ul>
                <li>本局被AI接管的玩家</li>
                <li>赢牌时得分 <strong>÷2</strong>（少收一半）</li>
                <li>下局恢复正常</li>
              </ul>
            </div>
          </div>
        </section>
      </div>

      <footer class="rules-footer">
        <p>长清阁麻将 · 人人对战规则 v1.0</p>
        <button class="ghost-button" @click="goBack">返回</button>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
const router = useRouter()

const goBack = () => {
  if (window.history.length > 1) {
    router.back()
  } else {
    navigateTo('/')
  }
}

const activeSection = ref('basic')

const sections = [
  { id: 'basic', title: '基础', icon: '📋' },
  { id: 'actions', title: '流程', icon: '🎮' },
  { id: 'freeze', title: '犹豫期', icon: '⏰' },
  { id: 'wild', title: '百搭', icon: '🃏' },
  { id: 'patterns', title: '牌型', icon: '🏆' },
  { id: 'formula', title: '公式', icon: '🔢' },
  { id: 'restriction', title: '捉冲限制', icon: '🚧' },
  { id: 'kong', title: '杠', icon: '🎯' },
  { id: 'bao', title: '互包', icon: '📦' },
  { id: 'multiplier', title: '结算', icon: '✖️' },
  { id: 'special', title: '特色', icon: '⚡' },
  { id: 'flower', title: '花牌', icon: '🌸' },
  { id: 'draw', title: '流局', icon: '🔄' },
  { id: 'ai', title: 'AI规则', icon: '🤖' },
]

const scrollTo = (id: string) => {
  activeSection.value = id
  const el = document.getElementById(id)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

const actions = [
  { name: '自摸', priority: 1, desc: '自己摸牌成胡', color: '#ef5350' },
  { name: '捉冲', priority: 1, desc: '他人打牌成胡', color: '#ef5350' },
  { name: '杠', priority: 2, desc: '明杠/暗杠/补杠', color: '#ab47bc' },
  { name: '碰', priority: 3, desc: '任意家打牌可碰', color: '#ff9800' },
  { name: '吃', priority: 4, desc: '仅上家打出的牌', color: '#42a5f5' },
]

const handPatterns = [
  { name: '风碰', points: '40', desc: '风一色 + 碰碰胡' },
  { name: '风一色', points: '20', desc: '全风牌/箭牌' },
  { name: '清碰', points: '20', desc: '清一色 + 碰碰胡' },
  { name: '大吊', points: '10', desc: '手牌仅剩1张单听' },
  { name: '杠开', points: '10', desc: '杠后补牌自摸' },
  { name: '八花自摸', points: '10', desc: '独家摸齐8朵花 + 自摸' },
  { name: '无花自摸', points: '10', desc: '碰碰胡/混一色 + 自摸 + 门口无花 + 无风向刻杠' },
  { name: '清一色', points: '10', desc: '仅一门花色' },
  { name: '混碰', points: '10', desc: '混一色 + 碰碰胡' },
  { name: '四百搭', points: '10', desc: '手牌有4张百搭' },
  { name: '混一色', points: '公式', desc: '一门花色 + 字牌' },
  { name: '碰碰胡', points: '公式', desc: '全刻子 + 对子' },
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

/* 流程框 */
.flow-box {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  padding: 16px;
  text-align: center;
  margin-bottom: 14px;
}

.flow-box code {
  font-size: 1rem;
  color: #ffd36a;
  font-weight: 600;
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

/* 决策犹豫期流程 */
.freeze-flow {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
  flex-wrap: wrap;
  justify-content: center;
}

.freeze-step {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 12px 16px;
  flex: 1;
  min-width: 200px;
}

.freeze-parallel {
  border-color: rgba(33, 150, 243, 0.3);
  background: rgba(33, 150, 243, 0.06);
}

.freeze-icon {
  font-size: 1.6rem;
  flex-shrink: 0;
}

.freeze-step p {
  margin: 4px 0 0;
  font-size: 0.8rem;
  opacity: 0.7;
  line-height: 1.5;
}

.freeze-arrow {
  font-size: 1.2rem;
  opacity: 0.4;
  font-weight: 700;
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
