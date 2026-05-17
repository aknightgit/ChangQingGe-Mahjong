import { defineComponent, mergeProps, computed, unref, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrRenderList, ssrRenderComponent, ssrInterpolate, ssrRenderClass } from 'vue/server-renderer';
import { P as PlayerAvatar } from './PlayerAvatar-BQI5EGaR.mjs';
import { _ as _export_sfc } from './server.mjs';
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

const _sfc_main$1 = /* @__PURE__ */ defineComponent({
  __name: "PlayerInfo",
  __ssrInlineRender: true,
  props: {
    name: {},
    score: {},
    position: {},
    isActive: { type: Boolean },
    isWinner: { type: Boolean },
    isDealer: { type: Boolean },
    avatar: {},
    avatarMood: {},
    showAvatar: { type: Boolean }
  },
  setup(__props) {
    const props = __props;
    const formattedScore = computed(() => {
      if (props.score === void 0 || props.score === null) return "";
      const sign = props.score > 0 ? "+" : "";
      return `${sign}${props.score}`;
    });
    const scoreClass = computed(() => {
      if (props.score === void 0 || props.score === null) return "";
      if (props.score > 0) return "score--positive";
      if (props.score < 0) return "score--negative";
      return "";
    });
    const positionColor = computed(() => {
      const colors = { top: "north", bottom: "south", left: "west", right: "east" };
      return colors[props.position || ""] || "south";
    });
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({
        class: ["player-info", [{ "player-info--active": __props.isActive, "player-info--winner": __props.isWinner }, `player-info--${__props.position}`]]
      }, _attrs))} data-v-3210d32e><span class="${ssrRenderClass([`dot--${unref(positionColor)}`, "position-dot"])}" data-v-3210d32e></span>`);
      if (__props.showAvatar) {
        _push(ssrRenderComponent(PlayerAvatar, {
          name: __props.name,
          mood: __props.avatarMood,
          size: 28
        }, null, _parent));
      } else if (__props.avatar) {
        _push(`<span class="avatar" data-v-3210d32e>${ssrInterpolate(__props.avatar)}</span>`);
      } else {
        _push(`<!---->`);
      }
      _push(`<span class="player-name" data-v-3210d32e>${ssrInterpolate(__props.name)}</span>`);
      if (__props.isDealer) {
        _push(`<span class="dealer-badge" data-v-3210d32e>庄</span>`);
      } else {
        _push(`<!---->`);
      }
      if (__props.isWinner) {
        _push(`<span class="win-badge" data-v-3210d32e>胡</span>`);
      } else {
        _push(`<!---->`);
      }
      _push(`<span class="${ssrRenderClass([unref(scoreClass), "player-score"])}" data-v-3210d32e>${ssrInterpolate(unref(formattedScore))}</span></div>`);
    };
  }
});
const _sfc_setup$1 = _sfc_main$1.setup;
_sfc_main$1.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/PlayerInfo.vue");
  return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
const PlayerInfo = /* @__PURE__ */ Object.assign(_export_sfc(_sfc_main$1, [["__scopeId", "data-v-3210d32e"]]), { __name: "PlayerInfo" });
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "avatar-demo",
  __ssrInlineRender: true,
  setup(__props) {
    const moods = ["normal", "happy", "angry", "thinking", "impatient", "winning"];
    const moodLabels = {
      normal: "正常",
      happy: "开心",
      angry: "生气",
      thinking: "思考中",
      impatient: "不耐烦",
      winning: "赢了！"
    };
    const playerNames = ["AI-AK", "AI-小胖", "AI-阿水", "AI-老赵"];
    const players = [
      { name: "AK", score: 120, position: "bottom", active: true, dealer: true, mood: "normal" },
      { name: "AI-小胖", score: -40, position: "right", active: false, dealer: false, mood: "thinking" },
      { name: "AI-阿水", score: 220, position: "top", active: false, dealer: false, mood: "winning" },
      { name: "AI-老赵", score: -60, position: "left", active: false, dealer: false, mood: "impatient" }
    ];
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "demo-page" }, _attrs))} data-v-2bd87ae1><h1 data-v-2bd87ae1>🀄 Q版头像系统</h1><section data-v-2bd87ae1><h2 data-v-2bd87ae1>表情状态</h2><div class="demo-row" data-v-2bd87ae1><!--[-->`);
      ssrRenderList(moods, (m) => {
        _push(`<div class="demo-cell" data-v-2bd87ae1>`);
        _push(ssrRenderComponent(PlayerAvatar, {
          name: "AK",
          mood: m,
          size: 80
        }, null, _parent));
        _push(`<span class="label" data-v-2bd87ae1>${ssrInterpolate(moodLabels[m])}</span></div>`);
      });
      _push(`<!--]--></div></section><section data-v-2bd87ae1><h2 data-v-2bd87ae1>随机头像（4人对局）</h2><div class="demo-row" data-v-2bd87ae1><!--[-->`);
      ssrRenderList(playerNames, (name) => {
        _push(`<div class="demo-cell" data-v-2bd87ae1>`);
        _push(ssrRenderComponent(PlayerAvatar, {
          name,
          size: 80
        }, null, _parent));
        _push(`<span class="label" data-v-2bd87ae1>${ssrInterpolate(name)}</span></div>`);
      });
      _push(`<!--]--></div></section><section data-v-2bd87ae1><h2 data-v-2bd87ae1>集成效果 (PlayerInfo)</h2><div class="demo-row" data-v-2bd87ae1><!--[-->`);
      ssrRenderList(players, (p, i) => {
        _push(`<div class="demo-cell" data-v-2bd87ae1>`);
        _push(ssrRenderComponent(PlayerInfo, {
          name: p.name,
          score: p.score,
          position: p.position,
          "is-active": p.active,
          "is-dealer": p.dealer
        }, null, _parent));
        _push(ssrRenderComponent(PlayerAvatar, {
          name: p.name,
          mood: p.mood,
          size: 60,
          class: "demo-avatar"
        }, null, _parent));
        _push(`</div>`);
      });
      _push(`<!--]--></div></section><section data-v-2bd87ae1><h2 data-v-2bd87ae1>对局状态</h2><div class="demo-row" data-v-2bd87ae1><div class="demo-cell" data-v-2bd87ae1>`);
      _push(ssrRenderComponent(PlayerAvatar, {
        name: "AI-AK",
        mood: "normal",
        size: 60,
        "is-active": true
      }, null, _parent));
      _push(`<span class="label" data-v-2bd87ae1>轮到我</span></div><div class="demo-cell" data-v-2bd87ae1>`);
      _push(ssrRenderComponent(PlayerAvatar, {
        name: "AI-小胖",
        mood: "thinking",
        size: 60
      }, null, _parent));
      _push(`<span class="label" data-v-2bd87ae1>思考中</span></div><div class="demo-cell" data-v-2bd87ae1>`);
      _push(ssrRenderComponent(PlayerAvatar, {
        name: "AI-阿水",
        mood: "impatient",
        size: 60
      }, null, _parent));
      _push(`<span class="label" data-v-2bd87ae1>不耐烦</span></div><div class="demo-cell" data-v-2bd87ae1>`);
      _push(ssrRenderComponent(PlayerAvatar, {
        name: "AI-老赵",
        mood: "angry",
        size: 60
      }, null, _parent));
      _push(`<span class="label" data-v-2bd87ae1>被截胡</span></div><div class="demo-cell" data-v-2bd87ae1>`);
      _push(ssrRenderComponent(PlayerAvatar, {
        name: "AKnight",
        mood: "winning",
        size: 60
      }, null, _parent));
      _push(`<span class="label" data-v-2bd87ae1>我胡了！</span></div></div></section></div>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/avatar-demo.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const avatarDemo = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-2bd87ae1"]]);

export { avatarDemo as default };
//# sourceMappingURL=avatar-demo-BU4uoRBe.mjs.map
