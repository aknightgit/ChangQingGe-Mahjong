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
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "mahjong-page" }, _attrs))} data-v-fbc159b5><div class="mahjong-card join-card" data-v-fbc159b5><header class="join-header" data-v-fbc159b5><div data-v-fbc159b5><h1 class="mahjong-title" data-v-fbc159b5>加入牌局</h1><p class="mahjong-subtitle" data-v-fbc159b5>输入房间号加入，或从下方列表选择。</p></div><button class="mahjong-button secondary" data-v-fbc159b5>返回大厅</button></header>`);
      if (myGames.value.length > 0) {
        _push(`<section class="my-games-section" data-v-fbc159b5><div class="available-header" data-v-fbc159b5><h2 data-v-fbc159b5>🪑 我的牌局</h2><button class="mahjong-button small"${ssrIncludeBooleanAttr(isLoadingMy.value) ? " disabled" : ""} data-v-fbc159b5>${ssrInterpolate(isLoadingMy.value ? "加载中…" : "刷新")}</button></div><ul class="available-list" data-v-fbc159b5><!--[-->`);
        ssrRenderList(myGames.value, (game) => {
          _push(`<li class="available-item my-game-item" data-v-fbc159b5><div class="available-details" data-v-fbc159b5><span class="available-id" data-v-fbc159b5> #${ssrInterpolate(game.roomNumber)} `);
          if (game.isBotMode) {
            _push(`<span class="bot-badge" data-v-fbc159b5>AI托管中</span>`);
          } else {
            _push(`<!---->`);
          }
          if (game.phase === "waiting") {
            _push(`<span class="phase-badge waiting" data-v-fbc159b5>等待中</span>`);
          } else {
            _push(`<!---->`);
          }
          if (game.phase === "playing") {
            _push(`<span class="phase-badge playing" data-v-fbc159b5>进行中</span>`);
          } else {
            _push(`<!---->`);
          }
          _push(`</span><span class="available-meta" data-v-fbc159b5>${ssrInterpolate(game.playerCount)}/4人 `);
          if (game.isMyTurn) {
            _push(`<span data-v-fbc159b5> · 轮到你了！</span>`);
          } else {
            _push(`<!---->`);
          }
          _push(`</span></div><div class="my-game-actions" data-v-fbc159b5>`);
          if (game.isBotMode) {
            _push(`<button class="mahjong-button comeback"${ssrIncludeBooleanAttr(isComingBack.value) ? " disabled" : ""} data-v-fbc159b5> 我要回来 </button>`);
          } else {
            _push(`<!---->`);
          }
          _push(`<button class="mahjong-button primary" data-v-fbc159b5> 进入 </button></div></li>`);
        });
        _push(`<!--]--></ul></section>`);
      } else {
        _push(`<!---->`);
      }
      _push(`<section class="manual-join" data-v-fbc159b5><label for="manual-id" data-v-fbc159b5>输入4位房间号</label><div class="manual-controls" data-v-fbc159b5><input id="manual-id"${ssrRenderAttr("value", manualGameId.value)} type="text" placeholder="例如：7392" maxlength="4" pattern="[0-9]{4}" inputmode="numeric" data-v-fbc159b5><button class="mahjong-button primary"${ssrIncludeBooleanAttr(isJoining.value || !manualGameId.value.trim()) ? " disabled" : ""} data-v-fbc159b5>${ssrInterpolate(isJoining.value ? "加入中…" : "加入")}</button></div>`);
      if (joinError.value) {
        _push(`<p class="available-error" data-v-fbc159b5>${ssrInterpolate(joinError.value)}</p>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</section><section class="mahjong-available" data-v-fbc159b5><div class="available-header" data-v-fbc159b5><h2 data-v-fbc159b5>空闲牌桌</h2><button class="mahjong-button small"${ssrIncludeBooleanAttr(isWaitingLoading.value) ? " disabled" : ""} data-v-fbc159b5>${ssrInterpolate(isWaitingLoading.value ? "加载中…" : "刷新")}</button></div>`);
      if (waitingGamesError.value) {
        _push(`<p class="available-error" data-v-fbc159b5>${ssrInterpolate(waitingGamesError.value)}</p>`);
      } else if (!isWaitingLoading.value && waitingGames.value.length === 0) {
        _push(`<p class="available-empty" data-v-fbc159b5> 暂无空闲牌桌，去大厅创建一个吧！ </p>`);
      } else {
        _push(`<ul class="available-list" data-v-fbc159b5><!--[-->`);
        ssrRenderList(waitingGames.value, (game) => {
          _push(`<li class="available-item" data-v-fbc159b5><div class="available-details" data-v-fbc159b5><span class="available-id" data-v-fbc159b5>${ssrInterpolate(game.roomNumber || game.gameId.slice(0, 8))}</span><span class="available-meta" data-v-fbc159b5>${ssrInterpolate(game.playerCount)}/4 人 · 庄家: ${ssrInterpolate(game.dealerName || "待定")}</span></div><button class="mahjong-button secondary join" data-v-fbc159b5> 加入 </button></li>`);
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
const joinGame = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-fbc159b5"]]);

export { joinGame as default };
//# sourceMappingURL=join-game-DQu6uJMo.mjs.map
