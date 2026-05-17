import { defineComponent, mergeProps, unref, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrRenderList, ssrRenderClass, ssrRenderAttr, ssrInterpolate } from 'vue/server-renderer';
import { _ as _export_sfc, b as useRouter } from './server.mjs';
import '../nitro/nitro.mjs';
import 'mongodb';
import 'node:http';
import 'node:https';
import 'node:crypto';
import 'stream';
import 'events';
import 'http';
import 'crypto';
import 'buffer';
import 'zlib';
import 'https';
import 'net';
import 'tls';
import 'url';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'socket.io';
import '@socket.io/redis-adapter';
import 'redis';
import 'fs';
import 'path';
import 'node:url';
import '@iconify/utils';
import 'consola';
import 'vue-router';
import 'tailwindcss/colors';
import '@iconify/vue';
import '../routes/renderer.mjs';
import 'vue-bundle-renderer/runtime';
import 'unhead/server';
import 'devalue';
import 'unhead/utils';

const rulesMarkdownSource = "# 长青阁麻将规则导读\n\n> 版本：v2.0  \n> 更新时间：2026-04-19  \n> 本文整合并重组了原 `RULES.md`、`REQUIREMENTS_PVP.md`、`MJ_RULES_MEMO.md`，用于产品说明和游戏内规则展示。\n\n---\n\n## 1. 基本介绍\n\n长青阁麻将是一个 **4 人对战、带百搭、血战到底** 的麻将玩法。\n\n- 使用 144 张牌。\n- 庄家起手 14 张，闲家起手 13 张。\n- 支持真人对战，也支持 AI 补位或托管。\n- 牌局不是“一人胡牌即结束”，而是会继续进行，直到只剩 1 名未输家，或者牌墙摸完流局。\n\n---\n\n## 2. 核心概念\n\n### 2.1 血战到底\n\n- 有玩家胡牌后，该玩家离场，剩余玩家继续。\n- 一炮多响允许发生。\n- 若同一张牌被多人同时胡，牌局在这些胡牌结算后，从 **首胡玩家的右手** 继续。\n\n### 2.2 上家是动态概念\n\n- “只能吃上家”始终成立。\n- 但血战到底中，已经胡牌或出局的玩家会被跳过。\n- 因此“上家”不是固定座位，而是 **当前仍在局内、并且位于你前一位的活跃玩家**。\n\n### 2.3 百搭\n\n- 每局会随机指定一张百搭牌。\n- 百搭可以替代任意牌参与胡牌判断。\n- 如果百搭是花牌组中的一张，则该组四张花牌全部视为百搭。\n- 普通花牌不计入手牌张数；**花牌若被定义为百搭，则计入手牌张数并参与组牌**。\n\n### 2.4 大吊\n\n- 大吊不是一个独立胡牌牌型。\n- 它是一种 **听牌 / 胡牌形式**：手牌只剩 1 张暗手单吊待胡。\n- 大吊有托底作用，**基础分按至少 10 点处理**。\n- 若大吊同时满足更高牌型，则仍按更优牌型或更优组合结算。\n\n### 2.5 三口 / 四口（互包）\n\n- 玩家通过吃、碰、杠从同一来源累计形成来源关系。\n- 同一来源累计达到 3 口，形成三口互包。\n- 同一来源累计达到 4 口，形成四口互包。\n- 该关系会影响自摸、放冲和第三方放冲时的赔付结构。\n\n---\n\n## 3. 基础玩法\n\n### 3.1 开局\n\n- 系统掷骰决定庄家与本局骰子倍数。\n- 支持配置掷骰次数。\n- 每局同时确定百搭牌。\n\n### 3.2 回合流程\n\n每个正常回合按下列顺序进行：\n\n1. 当前玩家摸牌。\n2. 检查是否可暗杠、补杠、自摸胡等。\n3. 当前玩家打出一张牌。\n4. 其他玩家进入抢牌窗口。\n5. 若无人接牌，则轮到下一名活跃玩家摸牌。\n\n### 3.3 动作优先级\n\n在同一张牌上，可响应动作的优先级为：\n\n```text\n胡 > 碰 / 杠 > 吃\n```\n\n补充说明：\n\n- 碰和杠不会在同一玩家同一机会下同时成立为两个独立优先级层。\n- 吃只能发生在动态上家的弃牌上。\n- 一旦出现可胡，低优先级动作不会抢跑。\n\n### 3.4 吃、碰、杠\n\n- 吃：只能吃动态上家。\n- 碰：任意其他活跃玩家的弃牌都可碰。\n- 明杠：他人打出第 4 张时形成。\n- 暗杠：自己手里 4 张相同。\n- 补杠：门口碰牌后，自摸到第 4 张补成杠。\n\n吃牌组合规则：\n\n- 若只有一种可吃组合，系统可直接执行。\n- 若存在多种可吃组合，玩家需要在弹窗中 **自行选择组合并确认**。\n\n### 3.5 胡牌\n\n支持三种胡法：\n\n- 自摸胡\n- 捉冲胡\n- 抢杠胡\n\n胡牌后：\n\n- 胡牌玩家离开本局继续出牌流程。\n- 仍在局内的玩家继续完成该局，直到终局。\n\n---\n\n### 3.6 九大胡牌牌型\n\n本项目需要明确支持并展示以下 `9` 种核心胡牌牌型，它们也是训练、结算和规则说明里的统一口径：\n\n1. `碰碰胡`\n   - 以刻子/杠子为主的胡牌结构，属于公式计分牌型。\n2. `清一色`\n   - 全部为同一门数牌，不含字牌，固定 `10` 点。\n3. `混一色`\n   - 同一门数牌加字牌组成，属于公式计分牌型。\n4. `混碰`\n   - `混一色 + 碰碰胡`，固定 `10` 点。\n5. `清碰`\n   - `清一色 + 碰碰胡`，固定 `20` 点。\n6. `风一色`\n   - 全部由风牌组成，固定 `20` 点。\n7. `风碰`\n   - `风一色 + 碰碰胡`，固定 `40` 点。\n8. `八花自摸`\n   - 独家集齐 `8` 张花牌并自摸，固定 `10` 点。\n9. `四百搭`\n   - 胡牌时手中形成 `4` 张百搭，固定 `10` 点。\n\n补充说明：\n- `大吊` 不是九大胡牌牌型之一，它是特殊听胡形态，至少按 `10` 点托底结算。\n- `无花自摸`、`杠开`、`无百搭`、`门清` 属于额外结算条件或额外倍数，不计入“九大胡牌牌型”。\n\n## 4. 特殊规则介绍\n\n### 4.1 百搭打出后的冷冻\n\n- 百搭被打出后，触发一整圈冷冻。\n- 冷冻期间不能吃、碰、捉冲。\n- 自摸不受影响。\n\n### 4.2 捉冲 / 抢杠限制\n\n碰碰胡、混一色在捉冲或抢杠时，通常要求门口至少有以下其一：\n\n- 花牌\n- 风牌 / 箭牌刻子\n- 任意杠牌\n\n但以下情况可直接豁免：\n\n- 大吊\n- 基础分达到 10 点及以上的牌型或听牌形式\n\n### 4.3 无百搭翻倍\n\n- 若胡牌方案中可以把百搭“归位”为普通牌，并且仍然成立，则可触发无百搭翻倍。\n- 系统会在可胡方案中同时考虑：\n  - 百搭作为万能牌使用\n  - 百搭按普通牌归位使用\n\n### 4.4 门清\n\n满足以下条件可算门清：\n\n- 没有吃\n- 没有碰\n- 没有明杠\n- 暗杠不破门清\n\n### 4.5 无花自摸\n\n仅在特定牌型下成立：\n\n- 碰碰胡或混一色\n- 自摸\n- 门口无花\n- 无风向刻或风向杠\n\n### 4.6 杠开\n\n- 杠后补牌立即自摸，算杠开。\n\n### 4.7 八花自摸\n\n- 独家集齐 8 朵花并自摸，可按固定 10 点处理。\n\n### 4.8 造反\n\n首轮摸满后，若满足“五毒散”等触发条件，可选择造反：\n\n- 当前局直接结束\n- 下局继承倍数翻倍\n- 造反者成为下局庄家\n\n### 4.9 梁山聚义\n\n- 仅限满足条件的真人局。\n- 符合资格的玩家可发起或参与。\n- 全员通过后，本局结束，并把翻倍链带入下局。\n\n### 4.10 谢谢带头大哥\n\n若某玩家打出一张牌后，随后同一串连续跟打中，其余三名不同玩家依次都打出相同牌，则触发该事件。\n\n- 带头玩家向其他三家分别赔付固定分。\n- 该条目会写入结算明细。\n\n### 4.11 换座\n\n- 达到有效输分阈值后可获得换座机会。\n- 换座在下一局开始前生效。\n\n---\n\n## 5. 决策犹豫期规则\n\n### 5.1 设计目标\n\n决策犹豫期不是单纯“停住等人”，而是一个 **抢牌与隐藏信息并存的窗口**。\n\n系统需要同时满足两件事：\n\n- 有资格抢牌的人，按钮应第一时间亮起且可点击。\n- 不能因为额外的显式 `pass` 交互，让其他玩家过度暴露“有人能碰 / 能胡”。\n\n### 5.2 基本流程\n\n当一名玩家打牌后：\n\n1. 系统立刻审查其他玩家是否有胡、碰、杠、吃资格。\n2. 对应按钮第一时间亮起。\n3. 除“摸牌”外，其它可抢动作在犹豫期内应 **亮即可点**。\n4. 若无人响应，系统在窗口结束后继续推进下一步。\n\n### 5.3 冻结与摸牌\n\n- 决策犹豫期内，真正被冻结的是“下一家摸牌”。\n- 吃、碰、杠、胡按钮不应被无故延迟禁用。\n- 冻结结束后，AI 可自动推进；真人按现设计进入等待手动摸牌状态。\n\n### 5.4 多人抢同一张牌\n\n- 先按优先级分层。\n- 同优先级内，允许多人同时保留资格。\n- 一炮多响、抢杠多响都属于这条链上的极端情况。\n\n### 5.5 隐藏信息原则\n\n- 不依赖常驻 `pass` 按钮去完成流程。\n- 只有具备资格的玩家看到对应动作。\n- 未操作则在窗口结束后按放弃处理。\n\n---\n\n## 6. 计分与结算\n\n### 6.1 基础分来源\n\n胡牌分有两种来源：\n\n- 固定点数牌型\n- 公式计算牌型\n\n公式牌型核心形式：\n\n```text\n基础点数 = 2 + 花牌数 + 组合牌点数\n```\n\n上限按 10 点封顶。\n\n### 6.2 额外翻倍\n\n常见额外翻倍包括：\n\n- 无百搭 ×2\n- 门清 ×2\n\n### 6.3 倍数体系\n\n结算中需要区分以下概念：\n\n- 骰子倍数：本局骰子结果带来的倍数\n- 继承倍数：来自流局、造反、梁山聚义、超帽继承等链路\n- 有效倍率：骰子倍数与继承倍数组合后，按上限规则得到的本局生效倍率\n- 结算膨胀倍数：建房参数，直接作用于最终结算\n\n### 6.4 最终点数\n\n可以按下面理解：\n\n```text\n最终点数\n= （基础番或固定点）\n× 额外翻倍\n× 有效倍率\n× 结算膨胀倍数\n```\n\n其中：\n\n- 有效倍率来自“骰子倍数 × 继承倍数”的封顶结果。\n- 若上一局出现超帽，多出的部分会以继承链形式带入下一局。\n\n### 6.5 互包赔付\n\n关键规则如下：\n\n- 互包双方互相放冲：统一按 ×2\n- 第三方放冲：放冲者赔 1 倍，互包输家再补 1 倍\n- 三口自摸：互包输家赔 ×3，其余玩家赔 ×1\n- 四口自摸：互包输家赔 ×5，其余玩家不赔\n\n### 6.6 结算明细\n\n每局结算应展示并记录：\n\n- 总输赢\n- 有效输赢\n- 自摸 / 捉冲 / 抢杠信息\n- 放冲对象\n- 三口 / 四口关系\n- 赔付流向\n- 基础分、额外翻倍、骰子倍数、继承倍数、有效倍率、结算膨胀倍数\n- 下局继承信息\n\n---\n\n## 7. 游戏内功能介绍\n\n### 7.1 建房参数\n\n当前建房核心参数包括：\n\n- 掷骰次数\n- 结算膨胀倍数\n- 梁山聚义阈值\n- 决策犹豫期时长\n- AI 数量上限\n- “等我想一想”次数\n\n### 7.2 托管与回归\n\n- 玩家超时后可进入 AI 托管。\n- 点击“我回来了”可恢复控制。\n- 托管影响本局收益结算。\n\n### 7.3 规则页\n\n- 游戏内 `/rules` 页面应直接展示本文件内容。\n- 后续规则维护以本文件为准。\n\n### 7.4 结算页\n\n- 结算页不仅展示汇总，还会展示逐局明细。\n- 便于回看倍率来源、赔付关系和特殊事件。\n\n---\n\n## 8. 术语速查\n\n- 血战到底：胡牌离场，牌局继续\n- 百搭：可替代任意牌参与胡牌的牌\n- 大吊：仅剩 1 张暗手单吊待胡的形式\n- 门清：没有吃、碰、明杠\n- 杠开：杠后补牌自摸\n- 捉冲：吃别人的弃牌胡\n- 抢杠：在别人补杠时胡那张牌\n- 三口 / 四口：同一来源累计形成的互包关系\n\n---\n\n如需完整实现细节、历史设计过程或旧版本规则差异，请查看 `docs/archive/` 中的归档文档。\n";
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "rules",
  __ssrInlineRender: true,
  setup(__props) {
    useRouter();
    function slugify(value) {
      return value.toLowerCase().replace(/[`*_~]/g, "").replace(/[^\p{L}\p{N}\s-]/gu, "").trim().replace(/\s+/g, "-");
    }
    function escapeHtml(value) {
      return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }
    function renderInline(value) {
      return escapeHtml(value).replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/\*([^*]+)\*/g, "<em>$1</em>");
    }
    function parseMarkdown(markdown) {
      const lines = markdown.replace(/\r\n/g, "\n").split("\n");
      const headings2 = [];
      const html = [];
      let paragraphBuffer = [];
      let listBuffer = [];
      let listTag = null;
      let codeFence = false;
      let codeBuffer = [];
      const flushParagraph = () => {
        if (!paragraphBuffer.length) return;
        html.push(`<p>${renderInline(paragraphBuffer.join(" "))}</p>`);
        paragraphBuffer = [];
      };
      const flushList = () => {
        if (!listTag || !listBuffer.length) return;
        html.push(`<${listTag}>${listBuffer.join("")}</${listTag}>`);
        listBuffer = [];
        listTag = null;
      };
      const flushCode = () => {
        if (!codeFence) return;
        html.push(`<pre><code>${escapeHtml(codeBuffer.join("\n"))}</code></pre>`);
        codeBuffer = [];
        codeFence = false;
      };
      for (const rawLine of lines) {
        const line = rawLine.trimEnd();
        const trimmed = line.trim();
        if (trimmed.startsWith("```")) {
          flushParagraph();
          flushList();
          if (codeFence) {
            flushCode();
          } else {
            codeFence = true;
            codeBuffer = [];
          }
          continue;
        }
        if (codeFence) {
          codeBuffer.push(rawLine);
          continue;
        }
        if (!trimmed) {
          flushParagraph();
          flushList();
          continue;
        }
        if (trimmed === "---") {
          flushParagraph();
          flushList();
          html.push("<hr>");
          continue;
        }
        const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
        if (headingMatch) {
          flushParagraph();
          flushList();
          const level = headingMatch[1].length;
          const text = headingMatch[2].trim();
          const id = slugify(text);
          headings2.push({ id, text, level });
          html.push(`<h${level} id="${id}">${renderInline(text)}</h${level}>`);
          continue;
        }
        if (trimmed.startsWith("> ")) {
          flushParagraph();
          flushList();
          html.push(`<blockquote>${renderInline(trimmed.slice(2).trim())}</blockquote>`);
          continue;
        }
        const unorderedMatch = trimmed.match(/^[-*]\s+(.*)$/);
        if (unorderedMatch) {
          flushParagraph();
          if (listTag && listTag !== "ul") flushList();
          listTag = "ul";
          listBuffer.push(`<li>${renderInline(unorderedMatch[1])}</li>`);
          continue;
        }
        const orderedMatch = trimmed.match(/^\d+\.\s+(.*)$/);
        if (orderedMatch) {
          flushParagraph();
          if (listTag && listTag !== "ol") flushList();
          listTag = "ol";
          listBuffer.push(`<li>${renderInline(orderedMatch[1])}</li>`);
          continue;
        }
        paragraphBuffer.push(trimmed);
      }
      flushParagraph();
      flushList();
      if (codeFence) flushCode();
      return {
        headings: headings2,
        html: html.join("\n")
      };
    }
    const parsedRules = parseMarkdown(rulesMarkdownSource);
    const headings = parsedRules.headings.filter((heading) => heading.level <= 2);
    const renderedRulesHtml = parsedRules.html;
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "rules-page" }, _attrs))} data-v-7882ecc7><div class="rules-shell" data-v-7882ecc7><header class="rules-header" data-v-7882ecc7><button class="ghost-button" data-v-7882ecc7>返回</button><div data-v-7882ecc7><h1 data-v-7882ecc7>长青阁麻将规则</h1><p class="subtitle" data-v-7882ecc7>当前展示内容直接来自 \`docs/rules_intro.md\`</p></div></header>`);
      if (unref(headings).length) {
        _push(`<nav class="toc" data-v-7882ecc7><!--[-->`);
        ssrRenderList(unref(headings), (heading) => {
          _push(`<a class="${ssrRenderClass([`level-${heading.level}`, "toc-item"])}"${ssrRenderAttr("href", `#${heading.id}`)} data-v-7882ecc7>${ssrInterpolate(heading.text)}</a>`);
        });
        _push(`<!--]--></nav>`);
      } else {
        _push(`<!---->`);
      }
      _push(`<article class="rules-content markdown-body" data-v-7882ecc7>${unref(renderedRulesHtml) ?? ""}</article><footer class="rules-footer" data-v-7882ecc7><p data-v-7882ecc7>规则源文件：\`docs/rules_intro.md\`</p><button class="ghost-button" data-v-7882ecc7>返回</button></footer></div></div>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/rules.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const rules = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-7882ecc7"]]);

export { rules as default };
//# sourceMappingURL=rules-08qnQQcu.mjs.map
