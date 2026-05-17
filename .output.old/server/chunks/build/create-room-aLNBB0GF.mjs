import { defineComponent, ref, reactive, watch, mergeProps, unref, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrRenderAttr, ssrIncludeBooleanAttr, ssrLooseContain, ssrLooseEqual, ssrInterpolate, ssrRenderList, ssrRenderClass } from 'vue/server-renderer';
import { _ as _export_sfc, a as useCookie, b as useRouter } from './server.mjs';
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

const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "create-room",
  __ssrInlineRender: true,
  setup(__props) {
    useCookie("user_name");
    useRouter();
    const isCreatingGame = ref(false);
    const activeHelp = ref(null);
    const showAISelection = ref(false);
    const createParams = reactive({
      maxDiceRolls: 2,
      hesitationSeconds: 4,
      firstRoundDouble: true,
      liangShanThreshold: 4e3,
      thinkChances: 4,
      settlementMultiplier: 10,
      maxBots: 3,
      minPlayers: 4
    });
    const allAIBots = [
      { id: "AI-小胖", name: "AI-小胖", desc: "稳健型" },
      { id: "AI-老赵", name: "AI-老赵", desc: "进攻型" },
      { id: "AI-阿水", name: "AI-阿水", desc: "做大做强型" },
      { id: "AI-AK", name: "AI-AK", desc: "默认策略" },
      { id: "AI-老蒋", name: "AI-老蒋", desc: "均衡型" },
      { id: "AI-小猪", name: "AI-小猪", desc: "风险规避型" }
    ];
    const selectedBots = ref([]);
    watch(() => createParams.maxBots, (newMax) => {
      if (selectedBots.value.length > newMax) selectedBots.value = selectedBots.value.slice(0, newMax);
    });
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "create-page" }, _attrs))} data-v-dfa61cce><div class="create-shell" data-v-dfa61cce><header class="create-header" data-v-dfa61cce><div data-v-dfa61cce><h1 class="create-title" data-v-dfa61cce>🀄 创建牌局</h1></div><button class="nav-btn" data-v-dfa61cce>返回大厅</button></header><div class="create-content" data-v-dfa61cce><section class="param-group" data-v-dfa61cce><h3 class="param-group-title" data-v-dfa61cce>⚙️ 基础设置</h3><div class="create-field" data-v-dfa61cce><div class="field-header" data-v-dfa61cce><label data-v-dfa61cce>结算膨胀倍数</label><button class="help-btn" data-v-dfa61cce>?</button></div><input type="number"${ssrRenderAttr("value", unref(createParams).settlementMultiplier)} min="1" max="10" data-v-dfa61cce>`);
      if (unref(activeHelp) === "settle") {
        _push(`<span class="help-bubble" data-v-dfa61cce>最终结算时，所有分数额外乘以此倍数。默认10倍。</span>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div><div class="create-field" data-v-dfa61cce><div class="field-header" data-v-dfa61cce><label data-v-dfa61cce>掷骰子次数</label><button class="help-btn" data-v-dfa61cce>?</button></div><input type="number"${ssrRenderAttr("value", unref(createParams).maxDiceRolls)} min="1" max="10" placeholder="2" data-v-dfa61cce>`);
      if (unref(activeHelp) === "dice") {
        _push(`<span class="help-bubble" data-v-dfa61cce>决定发牌起始位置。默认2次。</span>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div><div class="create-field" data-v-dfa61cce><div class="field-header" data-v-dfa61cce><label data-v-dfa61cce>等我想一想 次数</label><button class="help-btn" data-v-dfa61cce>?</button></div><input type="number"${ssrRenderAttr("value", unref(createParams).thinkChances)} min="0" max="10" data-v-dfa61cce>`);
      if (unref(activeHelp) === "think") {
        _push(`<span class="help-bubble" data-v-dfa61cce>每局限N次。默认3次。</span>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div></section><section class="param-group" data-v-dfa61cce><h3 class="param-group-title" data-v-dfa61cce>🔥 特殊玩法</h3><div class="create-field" data-v-dfa61cce><div class="field-header" data-v-dfa61cce><label data-v-dfa61cce>决策犹豫期（秒）</label><button class="help-btn" data-v-dfa61cce>?</button></div><input type="number"${ssrRenderAttr("value", unref(createParams).hesitationSeconds)} min="0.5" max="10" step="0.5" data-v-dfa61cce>`);
      if (unref(activeHelp) === "hesitation") {
        _push(`<span class="help-bubble" data-v-dfa61cce>上家打出牌后，所有玩家做吃/碰/杠/胡决策的时间窗口。默认5秒。</span>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div><div class="create-field" data-v-dfa61cce><div class="field-header" data-v-dfa61cce><label data-v-dfa61cce>被聚义QJ线</label><button class="help-btn" data-v-dfa61cce>?</button></div><input type="number"${ssrRenderAttr("value", unref(createParams).liangShanThreshold)} min="0" max="99999" step="100" data-v-dfa61cce>`);
      if (unref(activeHelp) === "qj") {
        _push(`<span class="help-bubble" data-v-dfa61cce>累积赢分超过此值的玩家，在梁山聚义投票时无否决权。默认4000。</span>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div><div class="create-field create-field--checkbox" data-v-dfa61cce><label class="checkbox-label" data-v-dfa61cce><input type="checkbox"${ssrIncludeBooleanAttr(Array.isArray(unref(createParams).firstRoundDouble) ? ssrLooseContain(unref(createParams).firstRoundDouble, null) : unref(createParams).firstRoundDouble) ? " checked" : ""} data-v-dfa61cce><span data-v-dfa61cce>首局翻倍</span><button class="help-btn help-btn--inline" data-v-dfa61cce>?</button></label>`);
      if (unref(activeHelp) === "double") {
        _push(`<span class="help-bubble" data-v-dfa61cce>今天第一局全局倍数 ×2。默认开启。</span>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div></section><section class="param-group" data-v-dfa61cce><h3 class="param-group-title" data-v-dfa61cce>👥 玩家设置</h3><div class="create-field" data-v-dfa61cce><div class="field-header" data-v-dfa61cce><label data-v-dfa61cce>最少开局人数</label><button class="help-btn" data-v-dfa61cce>?</button></div><select data-v-dfa61cce><option${ssrRenderAttr("value", 2)} data-v-dfa61cce${ssrIncludeBooleanAttr(Array.isArray(unref(createParams).minPlayers) ? ssrLooseContain(unref(createParams).minPlayers, 2) : ssrLooseEqual(unref(createParams).minPlayers, 2)) ? " selected" : ""}>2人</option><option${ssrRenderAttr("value", 3)} data-v-dfa61cce${ssrIncludeBooleanAttr(Array.isArray(unref(createParams).minPlayers) ? ssrLooseContain(unref(createParams).minPlayers, 3) : ssrLooseEqual(unref(createParams).minPlayers, 3)) ? " selected" : ""}>3人</option><option${ssrRenderAttr("value", 4)} data-v-dfa61cce${ssrIncludeBooleanAttr(Array.isArray(unref(createParams).minPlayers) ? ssrLooseContain(unref(createParams).minPlayers, 4) : ssrLooseEqual(unref(createParams).minPlayers, 4)) ? " selected" : ""}>4人（默认）</option></select>`);
      if (unref(activeHelp) === "minPlayers") {
        _push(`<span class="help-bubble" data-v-dfa61cce>房间人数达到此值后房主可点击&quot;开始牌局&quot;。默认4人。</span>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div><div class="create-field" data-v-dfa61cce><label data-v-dfa61cce>AI玩家上限</label><select data-v-dfa61cce><option${ssrRenderAttr("value", 0)} data-v-dfa61cce${ssrIncludeBooleanAttr(Array.isArray(unref(createParams).maxBots) ? ssrLooseContain(unref(createParams).maxBots, 0) : ssrLooseEqual(unref(createParams).maxBots, 0)) ? " selected" : ""}>0 - 禁止AI加入</option><option${ssrRenderAttr("value", 1)} data-v-dfa61cce${ssrIncludeBooleanAttr(Array.isArray(unref(createParams).maxBots) ? ssrLooseContain(unref(createParams).maxBots, 1) : ssrLooseEqual(unref(createParams).maxBots, 1)) ? " selected" : ""}>1个</option><option${ssrRenderAttr("value", 2)} data-v-dfa61cce${ssrIncludeBooleanAttr(Array.isArray(unref(createParams).maxBots) ? ssrLooseContain(unref(createParams).maxBots, 2) : ssrLooseEqual(unref(createParams).maxBots, 2)) ? " selected" : ""}>2个</option><option${ssrRenderAttr("value", 3)} data-v-dfa61cce${ssrIncludeBooleanAttr(Array.isArray(unref(createParams).maxBots) ? ssrLooseContain(unref(createParams).maxBots, 3) : ssrLooseEqual(unref(createParams).maxBots, 3)) ? " selected" : ""}>3个（默认）</option></select></div>`);
      if (unref(createParams).maxBots > 0) {
        _push(`<button class="ai-toggle-btn" data-v-dfa61cce>${ssrInterpolate(unref(showAISelection) ? "▼ 收起" : "▶ 选择AI玩家")} `);
        if (unref(selectedBots).length) {
          _push(`<span class="ai-count-badge" data-v-dfa61cce>${ssrInterpolate(unref(selectedBots).length)}/3</span>`);
        } else {
          _push(`<!---->`);
        }
        _push(`</button>`);
      } else {
        _push(`<!---->`);
      }
      if (unref(showAISelection)) {
        _push(`<div class="ai-select-list" data-v-dfa61cce><!--[-->`);
        ssrRenderList(allAIBots, (bot) => {
          _push(`<label class="${ssrRenderClass([{ "ai-select-item--active": unref(selectedBots).includes(bot.id) }, "ai-select-item"])}" data-v-dfa61cce><input type="checkbox"${ssrRenderAttr("value", bot.id)}${ssrIncludeBooleanAttr(Array.isArray(unref(selectedBots)) ? ssrLooseContain(unref(selectedBots), bot.id) : unref(selectedBots)) ? " checked" : ""}${ssrIncludeBooleanAttr(!unref(selectedBots).includes(bot.id) && unref(selectedBots).length >= unref(createParams).maxBots) ? " disabled" : ""} data-v-dfa61cce><span class="ai-select-name" data-v-dfa61cce>${ssrInterpolate(bot.name)}</span><span class="ai-select-desc" data-v-dfa61cce>${ssrInterpolate(bot.desc)}</span></label>`);
        });
        _push(`<!--]--></div>`);
      } else {
        _push(`<!---->`);
      }
      if (unref(selectedBots).length > 0) {
        _push(`<span class="create-hint" data-v-dfa61cce> 已选 ${ssrInterpolate(unref(selectedBots).length)} 个AI，还需 ${ssrInterpolate(4 - unref(selectedBots).length - 1)} 位真人 </span>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</section></div><div class="create-actions" data-v-dfa61cce><button class="create-btn create-btn--cancel" data-v-dfa61cce>取消</button><button type="button" class="create-btn create-btn--start"${ssrIncludeBooleanAttr(unref(isCreatingGame)) ? " disabled" : ""} data-v-dfa61cce>${ssrInterpolate(unref(isCreatingGame) ? "创建中..." : "创建新局")}</button></div></div></div>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/create-room.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const createRoom = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-dfa61cce"]]);

export { createRoom as default };
//# sourceMappingURL=create-room-aLNBB0GF.mjs.map
