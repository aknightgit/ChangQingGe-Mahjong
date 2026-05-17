import { defineComponent, ref, computed, watch, mergeProps, unref, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrIncludeBooleanAttr, ssrRenderClass, ssrLooseContain, ssrInterpolate, ssrRenderList, ssrLooseEqual, ssrRenderAttr } from 'vue/server-renderer';
import { a as formatBeijingDateTime } from './beijingTime-Dq_bzXix.mjs';
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
  __name: "history",
  __ssrInlineRender: true,
  setup(__props) {
    const histories = ref([]);
    const roundReviews = ref([]);
    const playerStats = ref([]);
    const isLoading = ref(false);
    const roundsLoading = ref(false);
    const statsLoading = ref(false);
    const errorMessage = ref(null);
    const roundsError = ref(null);
    const viewMode = ref("rounds");
    const selectedPlayerId = ref("");
    const showOnlyMineRounds = ref(false);
    const userIdCookie = useCookie("user_id");
    const queryPlayerId = computed(() => selectedPlayerId.value || void 0);
    const roundQueryPlayerId = computed(() => {
      if (!showOnlyMineRounds.value) return void 0;
      return userIdCookie.value || void 0;
    });
    const loadHistory = async () => {
      isLoading.value = true;
      errorMessage.value = null;
      try {
        const response = await $fetch("/api/history/list", {
          query: {
            limit: 40,
            ...queryPlayerId.value ? { playerId: queryPlayerId.value } : {}
          },
          cache: "no-cache"
        });
        histories.value = response?.success ? response.data || [] : [];
      } catch (err) {
        errorMessage.value = err?.message || "加载对局记录失败";
      } finally {
        isLoading.value = false;
      }
    };
    const loadRoundReviews = async () => {
      roundsLoading.value = true;
      roundsError.value = null;
      try {
        const response = await $fetch("/api/history/rounds", {
          query: {
            limit: 80,
            ...roundQueryPlayerId.value ? { playerId: roundQueryPlayerId.value } : {}
          },
          cache: "no-cache"
        });
        roundReviews.value = response?.success ? response.data || [] : [];
      } catch (err) {
        roundsError.value = err?.message || "加载局次记录失败";
      } finally {
        roundsLoading.value = false;
      }
    };
    watch(queryPlayerId, () => {
      if (viewMode.value === "players") loadHistory();
    });
    watch(roundQueryPlayerId, () => {
      if (viewMode.value === "rounds") loadRoundReviews();
    });
    watch(viewMode, (mode) => {
      if (mode === "players" && !histories.value.length && !isLoading.value) {
        loadHistory();
      }
      if (mode === "rounds" && !roundReviews.value.length && !roundsLoading.value) {
        loadRoundReviews();
      }
    });
    const formatDate = (value) => formatBeijingDateTime(value);
    const formatSigned = (value) => {
      if (value === 0) return "0";
      return `${value > 0 ? "+" : ""}${value}`;
    };
    const scoreClass = (value) => {
      if (value > 0) return "score-positive";
      if (value < 0) return "score-negative";
      return "score-neutral";
    };
    const formatEndReason = (reason) => {
      if (reason === "wall_exhausted") return "流局";
      if (reason === "last_player") return "正常结算";
      return reason || "结束";
    };
    const formatPlayerStatus = (status) => {
      if (status === "lost") return "未胡牌";
      if (status === "won") return "胡牌";
      return status;
    };
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "history-page" }, _attrs))} data-v-e28d0332><div class="history-shell" data-v-e28d0332><header class="history-header" data-v-e28d0332><button class="ghost-button" data-v-e28d0332>返回大厅</button><div data-v-e28d0332><h1 data-v-e28d0332>对局记录</h1><p class="subtitle" data-v-e28d0332>支持按局次回顾，也支持按玩家查看战绩与对局</p></div><button class="ghost-button"${ssrIncludeBooleanAttr(isLoading.value || statsLoading.value || roundsLoading.value) ? " disabled" : ""} data-v-e28d0332> 刷新 </button></header><section class="view-tabs" data-v-e28d0332><button class="${ssrRenderClass([{ "tab-chip--active": viewMode.value === "rounds" }, "tab-chip"])}" data-v-e28d0332>按局次回顾</button><button class="${ssrRenderClass([{ "tab-chip--active": viewMode.value === "players" }, "tab-chip"])}" data-v-e28d0332>按玩家查看</button></section>`);
      if (viewMode.value === "rounds") {
        _push(`<!--[--><section class="filter-bar" data-v-e28d0332><label class="toggle" data-v-e28d0332><input type="checkbox"${ssrIncludeBooleanAttr(Array.isArray(showOnlyMineRounds.value) ? ssrLooseContain(showOnlyMineRounds.value, null) : showOnlyMineRounds.value) ? " checked" : ""}${ssrIncludeBooleanAttr(!unref(userIdCookie)) ? " disabled" : ""} data-v-e28d0332><span data-v-e28d0332>只看我参与的局次</span></label>`);
        if (!unref(userIdCookie)) {
          _push(`<span class="filter-hint" data-v-e28d0332>当前未识别登录玩家，无法按本人过滤。</span>`);
        } else {
          _push(`<!---->`);
        }
        _push(`</section><section class="history-content" data-v-e28d0332>`);
        if (roundsError.value) {
          _push(`<p class="error" data-v-e28d0332>${ssrInterpolate(roundsError.value)}</p>`);
        } else if (roundsLoading.value) {
          _push(`<p class="loading" data-v-e28d0332>加载局次回顾中…</p>`);
        } else if (!roundReviews.value.length) {
          _push(`<p class="empty" data-v-e28d0332>暂无局次记录。</p>`);
        } else {
          _push(`<div class="round-list" data-v-e28d0332><!--[-->`);
          ssrRenderList(roundReviews.value, (round) => {
            _push(`<article class="round-card" data-v-e28d0332><div class="card-header" data-v-e28d0332><div data-v-e28d0332><p class="room-label" data-v-e28d0332>${ssrInterpolate(formatDate(round.recordedAt))}</p><h2 data-v-e28d0332>房间 ${ssrInterpolate(round.roomNumber)} · 第 ${ssrInterpolate(round.roundNumber)} 局</h2></div><div class="meta" data-v-e28d0332><span class="badge" data-v-e28d0332>${ssrInterpolate(round.winnerNames.length ? round.winnerNames.join(" / ") : "流局")}</span><span class="badge subtle" data-v-e28d0332>${ssrInterpolate(formatEndReason(round.endReason))}</span></div></div><div class="round-table-wrap" data-v-e28d0332><table class="round-table" data-v-e28d0332><thead data-v-e28d0332><tr data-v-e28d0332><th data-v-e28d0332>玩家</th><th data-v-e28d0332>结果</th><th data-v-e28d0332>分数</th></tr></thead><tbody data-v-e28d0332><!--[-->`);
            ssrRenderList(round.players, (player) => {
              _push(`<tr class="${ssrRenderClass({ "winner-row": player.isWinner, "me-row": player.playerId === unref(userIdCookie) })}" data-v-e28d0332><td data-v-e28d0332>${ssrInterpolate(player.name)}</td><td data-v-e28d0332>${ssrInterpolate(player.isWinner ? "胡牌" : formatPlayerStatus(player.status))}</td><td class="${ssrRenderClass(scoreClass(player.score))}" data-v-e28d0332>${ssrInterpolate(formatSigned(player.score))}</td></tr>`);
            });
            _push(`<!--]--></tbody></table></div></article>`);
          });
          _push(`<!--]--></div>`);
        }
        _push(`</section><!--]-->`);
      } else {
        _push(`<!--[--><section class="stats-section" data-v-e28d0332><div class="stats-section-header" data-v-e28d0332><h2 class="section-title" data-v-e28d0332>玩家战绩</h2><div class="player-picker" data-v-e28d0332><label for="player-record-filter" data-v-e28d0332>查看玩家</label><select id="player-record-filter" data-v-e28d0332><option value="" data-v-e28d0332${ssrIncludeBooleanAttr(Array.isArray(selectedPlayerId.value) ? ssrLooseContain(selectedPlayerId.value, "") : ssrLooseEqual(selectedPlayerId.value, "")) ? " selected" : ""}>全部玩家</option><!--[-->`);
        ssrRenderList(playerStats.value, (stat) => {
          _push(`<option${ssrRenderAttr("value", stat.playerId)} data-v-e28d0332${ssrIncludeBooleanAttr(Array.isArray(selectedPlayerId.value) ? ssrLooseContain(selectedPlayerId.value, stat.playerId) : ssrLooseEqual(selectedPlayerId.value, stat.playerId)) ? " selected" : ""}>${ssrInterpolate(stat.name)}</option>`);
        });
        _push(`<!--]--></select></div></div>`);
        if (statsLoading.value) {
          _push(`<p class="loading" data-v-e28d0332>加载玩家战绩中…</p>`);
        } else if (!playerStats.value.length) {
          _push(`<p class="empty" data-v-e28d0332>暂无玩家战绩。</p>`);
        } else {
          _push(`<div class="stats-table-wrap" data-v-e28d0332><table class="stats-table" data-v-e28d0332><thead data-v-e28d0332><tr data-v-e28d0332><th data-v-e28d0332>玩家</th><th data-v-e28d0332>总局数</th><th data-v-e28d0332>总分</th><th class="highlight-col" data-v-e28d0332>有效分</th><th data-v-e28d0332>自摸</th><th data-v-e28d0332>接炮</th><th data-v-e28d0332>单局最高</th><th data-v-e28d0332>单局最低</th></tr></thead><tbody data-v-e28d0332><!--[-->`);
          ssrRenderList(playerStats.value, (stat) => {
            _push(`<tr class="${ssrRenderClass({
              "ai-row": stat.isAI,
              "me-row": stat.playerId === unref(userIdCookie),
              "selected-row": stat.playerId === selectedPlayerId.value
            })}" data-v-e28d0332><td class="player-cell" data-v-e28d0332>`);
            if (stat.isAI) {
              _push(`<span class="ai-badge" data-v-e28d0332>AI</span>`);
            } else {
              _push(`<!---->`);
            }
            _push(`<span class="name" data-v-e28d0332>${ssrInterpolate(stat.name)}</span></td><td data-v-e28d0332>${ssrInterpolate(stat.totalGames)}</td><td class="${ssrRenderClass(scoreClass(stat.totalScore))}" data-v-e28d0332>${ssrInterpolate(formatSigned(stat.totalScore))}</td><td class="${ssrRenderClass([scoreClass(stat.effectiveScore), "highlight-col"])}" data-v-e28d0332>${ssrInterpolate(formatSigned(stat.effectiveScore))}</td><td data-v-e28d0332>${ssrInterpolate(stat.selfDrawCount)}</td><td data-v-e28d0332>${ssrInterpolate(stat.catchDiscardCount)}</td><td class="score-positive" data-v-e28d0332>${ssrInterpolate(stat.maxWin > 0 ? `+${stat.maxWin}` : "-")}</td><td class="score-negative" data-v-e28d0332>${ssrInterpolate(stat.maxLoss < 0 ? stat.maxLoss : "-")}</td></tr>`);
          });
          _push(`<!--]--></tbody></table></div>`);
        }
        _push(`</section><section class="history-content" data-v-e28d0332>`);
        if (errorMessage.value) {
          _push(`<p class="error" data-v-e28d0332>${ssrInterpolate(errorMessage.value)}</p>`);
        } else if (isLoading.value) {
          _push(`<p class="loading" data-v-e28d0332>加载玩家对局中…</p>`);
        } else if (!histories.value.length) {
          _push(`<p class="empty" data-v-e28d0332>暂无该玩家的对局记录。</p>`);
        } else {
          _push(`<div class="history-list" data-v-e28d0332><!--[-->`);
          ssrRenderList(histories.value, (match) => {
            _push(`<article class="history-card" data-v-e28d0332><div class="card-header" data-v-e28d0332><div data-v-e28d0332><p class="room-label" data-v-e28d0332>房间 ${ssrInterpolate(match.roomNumber || match.roomId)}</p><h2 data-v-e28d0332>${ssrInterpolate(formatDate(match.completedAt))}</h2></div><div class="meta" data-v-e28d0332><span class="badge" data-v-e28d0332>${ssrInterpolate(match.winnersCount)} 人胡牌</span><span class="badge subtle" data-v-e28d0332>第 ${ssrInterpolate(match.roundNumber)} 巡结束</span></div></div><ul class="player-list" data-v-e28d0332><!--[-->`);
            ssrRenderList(match.results, (player) => {
              _push(`<li class="${ssrRenderClass(["player-row", { winner: player.status === "won", me: player.playerId === unref(userIdCookie), focus: player.playerId === selectedPlayerId.value }])}" data-v-e28d0332><div data-v-e28d0332><p class="player-name" data-v-e28d0332>${ssrInterpolate(player.name)} `);
              if (player.winType === "self_draw") {
                _push(`<span class="win-tag self-draw" data-v-e28d0332>自摸</span>`);
              } else if (player.winType === "catch_discard") {
                _push(`<span class="win-tag catch" data-v-e28d0332>接炮</span>`);
              } else if (player.winType === "rob_kong") {
                _push(`<span class="win-tag rob" data-v-e28d0332>抢杠</span>`);
              } else {
                _push(`<!---->`);
              }
              _push(`</p><p class="player-meta" data-v-e28d0332>${ssrInterpolate(player.status === "won" ? "胡牌" : "未胡牌")} · 座位 ${ssrInterpolate(player.position + 1)}</p></div><div class="${ssrRenderClass([scoreClass(player.finalScore ?? match.finalScores?.[player.playerId] ?? 0), "player-score"])}" data-v-e28d0332>${ssrInterpolate(formatSigned(player.finalScore ?? match.finalScores?.[player.playerId] ?? 0))}</div></li>`);
            });
            _push(`<!--]--></ul></article>`);
          });
          _push(`<!--]--></div>`);
        }
        _push(`</section><!--]-->`);
      }
      _push(`</div></div>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/history.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const history = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-e28d0332"]]);

export { history as default };
//# sourceMappingURL=history-BT8l0EgJ.mjs.map
