import { defineComponent, ref, mergeProps, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrIncludeBooleanAttr, ssrInterpolate, ssrRenderList, ssrRenderAttr } from 'vue/server-renderer';
import { _ as _export_sfc, a as useCookie } from './server.mjs';
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
  __name: "join-game",
  __ssrInlineRender: true,
  setup(__props) {
    useCookie("user_name");
    useCookie("user_id");
    const waitingGames = ref([]);
    const waitingGamesError = ref(null);
    const isWaitingLoading = ref(false);
    const manualGameId = ref("");
    const joinError = ref(null);
    const isJoining = ref(false);
    const myGames = ref([]);
    const isLoadingMy = ref(false);
    const isComingBack = ref(false);
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "mahjong-page" }, _attrs))} data-v-ce53288a><div class="mahjong-card join-card" data-v-ce53288a><header class="join-header" data-v-ce53288a><div data-v-ce53288a><h1 class="mahjong-title" data-v-ce53288a>加入牌局</h1><p class="mahjong-subtitle" data-v-ce53288a>输入房间号加入，或从下方列表选择。</p></div><button class="mahjong-button secondary" data-v-ce53288a>返回大厅</button></header>`);
      if (myGames.value.length > 0) {
        _push(`<section class="my-games-section" data-v-ce53288a><div class="available-header" data-v-ce53288a><h2 data-v-ce53288a>🪑 我的牌局</h2><button class="mahjong-button small"${ssrIncludeBooleanAttr(isLoadingMy.value) ? " disabled" : ""} data-v-ce53288a>${ssrInterpolate(isLoadingMy.value ? "加载中…" : "刷新")}</button></div><ul class="available-list" data-v-ce53288a><!--[-->`);
        ssrRenderList(myGames.value, (game) => {
          _push(`<li class="available-item my-game-item" data-v-ce53288a><div class="available-details" data-v-ce53288a><span class="available-id" data-v-ce53288a> #${ssrInterpolate(game.roomNumber)} `);
          if (game.isBotMode) {
            _push(`<span class="bot-badge" data-v-ce53288a>AI托管中</span>`);
          } else {
            _push(`<!---->`);
          }
          if (game.phase === "waiting") {
            _push(`<span class="phase-badge waiting" data-v-ce53288a>等待中</span>`);
          } else {
            _push(`<!---->`);
          }
          if (game.phase === "playing") {
            _push(`<span class="phase-badge playing" data-v-ce53288a>进行中</span>`);
          } else {
            _push(`<!---->`);
          }
          _push(`</span><span class="available-meta" data-v-ce53288a>${ssrInterpolate(game.playerCount)}/4人 `);
          if (game.isMyTurn) {
            _push(`<span data-v-ce53288a> · 轮到你了！</span>`);
          } else {
            _push(`<!---->`);
          }
          _push(`</span></div><div class="my-game-actions" data-v-ce53288a>`);
          if (game.isBotMode) {
            _push(`<button class="mahjong-button comeback"${ssrIncludeBooleanAttr(isComingBack.value) ? " disabled" : ""} data-v-ce53288a> 我要回来 </button>`);
          } else {
            _push(`<!---->`);
          }
          _push(`<button class="mahjong-button primary" data-v-ce53288a> 进入 </button></div></li>`);
        });
        _push(`<!--]--></ul></section>`);
      } else {
        _push(`<!---->`);
      }
      _push(`<section class="manual-join" data-v-ce53288a><label for="manual-id" data-v-ce53288a>输入4位房间号</label><div class="manual-controls" data-v-ce53288a><input id="manual-id"${ssrRenderAttr("value", manualGameId.value)} type="text" placeholder="例如：7392" maxlength="4" pattern="[0-9]{4}" inputmode="numeric" data-v-ce53288a><button class="mahjong-button primary"${ssrIncludeBooleanAttr(isJoining.value || !manualGameId.value.trim()) ? " disabled" : ""} data-v-ce53288a>${ssrInterpolate(isJoining.value ? "加入中…" : "加入")}</button></div>`);
      if (joinError.value) {
        _push(`<p class="available-error" data-v-ce53288a>${ssrInterpolate(joinError.value)}</p>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</section><section class="mahjong-available" data-v-ce53288a><div class="available-header" data-v-ce53288a><h2 data-v-ce53288a>空闲牌桌</h2><button class="mahjong-button small"${ssrIncludeBooleanAttr(isWaitingLoading.value) ? " disabled" : ""} data-v-ce53288a>${ssrInterpolate(isWaitingLoading.value ? "加载中…" : "刷新")}</button></div>`);
      if (waitingGamesError.value) {
        _push(`<p class="available-error" data-v-ce53288a>${ssrInterpolate(waitingGamesError.value)}</p>`);
      } else if (!isWaitingLoading.value && waitingGames.value.length === 0) {
        _push(`<p class="available-empty" data-v-ce53288a> 暂无空闲牌桌，去大厅创建一个吧！ </p>`);
      } else {
        _push(`<ul class="available-list" data-v-ce53288a><!--[-->`);
        ssrRenderList(waitingGames.value, (game) => {
          _push(`<li class="available-item" data-v-ce53288a><div class="available-details" data-v-ce53288a><span class="available-id" data-v-ce53288a>${ssrInterpolate(game.roomNumber || game.gameId.slice(0, 8))}</span><span class="available-meta" data-v-ce53288a>${ssrInterpolate(game.playerCount)}/4 人 · 庄家: ${ssrInterpolate(game.dealerName || "待定")}</span></div><button class="mahjong-button secondary join" data-v-ce53288a> 加入 </button></li>`);
        });
        _push(`<!--]--></ul>`);
      }
      _push(`</section></div></div>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/join-game.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const joinGame = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-ce53288a"]]);

export { joinGame as default };
//# sourceMappingURL=join-game-C_yj7NOI.mjs.map
