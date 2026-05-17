import { defineComponent, computed, ref, watch, nextTick, unref, mergeProps, h, reactive, useSSRContext } from 'vue';
import { ssrRenderClass, ssrRenderStyle, ssrRenderAttr, ssrInterpolate, ssrRenderList, ssrRenderComponent, ssrIncludeBooleanAttr, ssrRenderTeleport, ssrRenderAttrs } from 'vue/server-renderer';
import { G as GamePhase, a as GameEndReason, A as ActionType, M as MahjongTile, P as PlayerOtherArea, b as PlayerSelfArea, T as TileSuit } from './game-B1wD8yRG.mjs';
import { _ as _export_sfc, u as useRoute, b as useRouter, a as useCookie } from './server.mjs';
import { io } from 'socket.io-client';
import { f as formatBeijingTime } from './beijingTime-Dq_bzXix.mjs';
import './PlayerAvatar-BQI5EGaR.mjs';
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

const _sfc_main$9 = /* @__PURE__ */ defineComponent({
  __name: "CircularActionButtons",
  __ssrInlineRender: true,
  props: {
    availableActions: {},
    isConnected: { type: Boolean },
    isInteractionLocked: { type: Boolean },
    isPaused: { type: Boolean },
    lastStateChangeAt: {},
    nowTs: {},
    highlightDelayMs: { default: 5e3 },
    compact: { type: Boolean, default: false },
    freezeUntil: {},
    hesitationWindow: {},
    thinkRemaining: {},
    canUseThink: { type: Boolean },
    hasVotedLiangshan: { type: Boolean }
  },
  emits: ["action"],
  setup(__props) {
    const props = __props;
    const canDraw = computed(() => props.availableActions.includes(ActionType.DRAW));
    const hasChow = computed(() => props.availableActions.includes(ActionType.CHOW));
    const hasPeng = computed(() => props.availableActions.includes(ActionType.PENG));
    const hasKong = computed(
      () => props.availableActions.includes(ActionType.KONG) || props.availableActions.includes(ActionType.CONCEALED_KONG) || props.availableActions.includes(ActionType.EXTENDED_KONG)
    );
    const hasHu = computed(() => props.availableActions.includes(ActionType.HU));
    const hasThink = computed(() => props.availableActions.includes(ActionType.THINK));
    const hasLiangShan = computed(() => props.availableActions.includes(ActionType.LIANG_SHAN));
    const hasSecondaryActionRow = computed(() => hasLiangShan.value);
    const effectiveCanUseThink = computed(() => props.canUseThink ?? true);
    const effectiveThinkRemaining = computed(() => props.thinkRemaining ?? 0);
    const effectiveHasVotedLiangShan = computed(() => props.hasVotedLiangshan ?? false);
    const hasAnyPriorityAction = computed(() => hasChow.value || hasPeng.value || hasKong.value || hasHu.value);
    computed(() => hasAnyPriorityAction.value || canDraw.value);
    const claimPromptText = computed(() => {
      const labels = [];
      if (hasHu.value) labels.push("胡");
      if (hasKong.value) labels.push("杠");
      if (hasPeng.value) labels.push("碰");
      if (hasChow.value) labels.push("吃");
      return labels.join(" / ");
    });
    const claimPromptTone = computed(() => {
      if (hasHu.value) return "hu";
      if (hasKong.value) return "kong";
      if (hasPeng.value) return "peng";
      if (hasChow.value) return "chow";
      return "neutral";
    });
    const isDelaying = computed(() => {
      if (props.lastStateChangeAt === 0) return false;
      if (isFreezing.value) return true;
      const priorityActions = [ActionType.CHOW, ActionType.PENG, ActionType.KONG, ActionType.CONCEALED_KONG, ActionType.EXTENDED_KONG, ActionType.HU];
      if (canDraw.value && !props.availableActions.some((a) => priorityActions.includes(a))) return false;
      return props.nowTs - props.lastStateChangeAt < props.highlightDelayMs;
    });
    const isFreezing = computed(() => {
      return !!props.freezeUntil && props.nowTs < props.freezeUntil;
    });
    const safeFreezeDurationMs = computed(() => {
      const v = Number(props.hesitationWindow);
      return Number.isFinite(v) && v > 0 ? v : 1e3;
    });
    const freezeProgress = ref("0");
    let freezeRafId = null;
    const animateFreeze = () => {
      if (!props.freezeUntil) {
        freezeProgress.value = "0";
        freezeRafId = null;
        return;
      }
      const now = Date.now();
      const remaining = props.freezeUntil - now;
      if (remaining <= 0) {
        freezeProgress.value = "1";
        freezeRafId = null;
        return;
      }
      const total = safeFreezeDurationMs.value;
      const elapsed = total - remaining;
      freezeProgress.value = String(Math.min(1, Math.max(0, elapsed / total)));
      freezeRafId = requestAnimationFrame(animateFreeze);
    };
    watch(
      () => props.freezeUntil,
      (newUntil) => {
        if (freezeRafId) {
          cancelAnimationFrame(freezeRafId);
          freezeRafId = null;
        }
        if (newUntil && newUntil > Date.now()) {
          freezeRafId = requestAnimationFrame(animateFreeze);
        } else {
          freezeProgress.value = "0";
        }
      },
      { immediate: true }
    );
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({
        class: ["action-panel", { "action-panel--compact": __props.compact, "action-panel--offline": !__props.isConnected }]
      }, _attrs))} data-v-8e04cb2c><button class="${ssrRenderClass([{
        "action-btn--active": hasThink.value,
        "action-btn--highlight": hasThink.value && hasAnyPriorityAction.value,
        "action-btn--highlight-pulse": hasThink.value && hasAnyPriorityAction.value,
        "action-btn--disabled": !hasThink.value || !effectiveCanUseThink.value
      }, "action-btn action-btn--draw action-btn--think action-btn--think-large"])}"${ssrIncludeBooleanAttr(!hasThink.value || !effectiveCanUseThink.value || __props.isInteractionLocked || !!__props.isPaused || !__props.isConnected) ? " disabled" : ""} data-v-8e04cb2c>慢${ssrInterpolate(effectiveThinkRemaining.value > 0 ? effectiveThinkRemaining.value : "")}</button><div class="${ssrRenderClass([{ "priority-action-group--active": hasAnyPriorityAction.value }, "priority-action-group"])}" data-v-8e04cb2c>`);
      if (claimPromptText.value) {
        _push(`<div class="${ssrRenderClass([`priority-action-badge--${claimPromptTone.value}`, "priority-action-badge"])}" data-v-8e04cb2c><span class="priority-action-badge__dot" data-v-8e04cb2c></span><span class="priority-action-badge__label" data-v-8e04cb2c>立即响应</span><strong data-v-8e04cb2c>${ssrInterpolate(claimPromptText.value)}</strong></div>`);
      } else {
        _push(`<!---->`);
      }
      _push(`<div class="action-grid" data-v-8e04cb2c><button class="${ssrRenderClass([{
        "action-btn--active": hasChow.value,
        "action-btn--chow": hasChow.value,
        "action-btn--highlight": hasChow.value,
        "action-btn--highlight-pulse": hasChow.value
      }, "action-btn action-btn--small"])}"${ssrIncludeBooleanAttr(!hasChow.value || __props.isInteractionLocked || !!__props.isPaused || !__props.isConnected) ? " disabled" : ""} data-v-8e04cb2c>吃</button><button class="${ssrRenderClass([{
        "action-btn--active": hasPeng.value,
        "action-btn--peng": hasPeng.value,
        "action-btn--highlight": hasPeng.value,
        "action-btn--highlight-pulse": hasPeng.value
      }, "action-btn action-btn--small"])}"${ssrIncludeBooleanAttr(!hasPeng.value || __props.isInteractionLocked || !!__props.isPaused || !__props.isConnected) ? " disabled" : ""} data-v-8e04cb2c>碰</button><button class="${ssrRenderClass([{
        "action-btn--active": hasHu.value,
        "action-btn--hu": hasHu.value,
        "action-btn--highlight": hasHu.value,
        "action-btn--highlight-pulse": hasHu.value
      }, "action-btn action-btn--small"])}"${ssrIncludeBooleanAttr(!hasHu.value || __props.isInteractionLocked || !!__props.isPaused || !__props.isConnected) ? " disabled" : ""} data-v-8e04cb2c>胡</button><button class="${ssrRenderClass([{
        "action-btn--active": hasKong.value,
        "action-btn--kong": hasKong.value,
        "action-btn--highlight": hasKong.value,
        "action-btn--highlight-pulse": hasKong.value
      }, "action-btn action-btn--small"])}"${ssrIncludeBooleanAttr(!hasKong.value || __props.isInteractionLocked || !!__props.isPaused || !__props.isConnected) ? " disabled" : ""} data-v-8e04cb2c>杠</button></div></div><div class="draw-action-group" data-v-8e04cb2c><button class="${ssrRenderClass([{
        "action-btn--active": canDraw.value,
        "action-btn--highlight": canDraw.value && !isDelaying.value,
        "action-btn--freezing": isFreezing.value
      }, "action-btn action-btn--draw"])}" style="${ssrRenderStyle(isFreezing.value ? { "--freeze-progress": freezeProgress.value, "--freeze-duration-ms": `${safeFreezeDurationMs.value}ms` } : {})}"${ssrIncludeBooleanAttr(!canDraw.value || isFreezing.value || __props.isInteractionLocked || !!__props.isPaused || !__props.isConnected) ? " disabled" : ""} data-v-8e04cb2c>`);
      if (isFreezing.value) {
        _push(`<span class="freeze-progress-ring" data-v-8e04cb2c></span>`);
      } else {
        _push(`<!---->`);
      }
      _push(`<span class="draw-label" data-v-8e04cb2c>摸</span></button><button class="${ssrRenderClass([{
        "action-btn--active": hasThink.value,
        "action-btn--highlight": hasThink.value && hasAnyPriorityAction.value,
        "action-btn--highlight-pulse": hasThink.value && hasAnyPriorityAction.value,
        "action-btn--disabled": !hasThink.value || !effectiveCanUseThink.value
      }, "action-btn action-btn--small action-btn--think action-btn--think-inline"])}"${ssrIncludeBooleanAttr(!hasThink.value || !effectiveCanUseThink.value || __props.isInteractionLocked || !!__props.isPaused || !__props.isConnected) ? " disabled" : ""} data-v-8e04cb2c>慢${ssrInterpolate(effectiveThinkRemaining.value > 0 ? effectiveThinkRemaining.value : "")}</button></div>`);
      if (hasSecondaryActionRow.value) {
        _push(`<div class="action-grid-secondary" data-v-8e04cb2c>`);
        if (hasLiangShan.value) {
          _push(`<button class="${ssrRenderClass([{
            "action-btn--active": hasLiangShan.value,
            "action-btn--highlight": hasLiangShan.value && !isDelaying.value,
            "action-btn--voted": _ctx.hasVotedLiangShan
          }, "action-btn action-btn--small action-btn--liangshan"])}"${ssrIncludeBooleanAttr(!hasLiangShan.value || __props.isInteractionLocked || !!__props.isPaused || !__props.isConnected || effectiveHasVotedLiangShan.value) ? " disabled" : ""} data-v-8e04cb2c>义</button>`);
        } else {
          _push(`<!---->`);
        }
        _push(`</div>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div>`);
    };
  }
});
const _sfc_setup$9 = _sfc_main$9.setup;
_sfc_main$9.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/CircularActionButtons.vue");
  return _sfc_setup$9 ? _sfc_setup$9(props, ctx) : void 0;
};
const CircularActionButtons = /* @__PURE__ */ Object.assign(_export_sfc(_sfc_main$9, [["__scopeId", "data-v-8e04cb2c"]]), { __name: "CircularActionButtons" });
const _sfc_main$8 = /* @__PURE__ */ defineComponent({
  __name: "TableCenter",
  __ssrInlineRender: true,
  props: {
    remainingTiles: {},
    statusMessage: {},
    hintMessage: {},
    isWinner: { type: Boolean },
    roundMultiplier: {},
    globalMultiplier: {},
    wildTile: {}
  },
  setup(__props) {
    const props = __props;
    const FLOWER_NAMES = {
      1: "春",
      2: "夏",
      3: "秋",
      4: "冬",
      5: "梅",
      6: "兰",
      7: "竹",
      8: "菊"
    };
    const WIND_NAMES = {
      1: "东",
      2: "南",
      3: "西",
      4: "北"
    };
    const DRAGON_NAMES = {
      1: "中",
      2: "发",
      3: "白"
    };
    const NUM_NAMES = ["一", "二", "三", "四", "五", "六", "七", "八", "九"];
    const SUIT_NAMES = {
      [TileSuit.DOTS]: "筒",
      [TileSuit.CHARACTERS]: "万",
      [TileSuit.BAMBOOS]: "条"
    };
    function getTileDisplayName(tile) {
      if (tile.suit === TileSuit.WIND) return WIND_NAMES[tile.value] || `风${tile.value}`;
      if (tile.suit === TileSuit.DRAGON) return DRAGON_NAMES[tile.value] || `箭${tile.value}`;
      if (tile.suit === TileSuit.FLOWER) return FLOWER_NAMES[tile.value] || `花${tile.value}`;
      return `${NUM_NAMES[tile.value - 1]}${SUIT_NAMES[tile.suit]}`;
    }
    computed(() => {
      if (!props.wildTile) return "";
      if (props.wildTile.suit === TileSuit.FLOWER) {
        return FLOWER_NAMES[props.wildTile.value] || `花${props.wildTile.value}`;
      }
      return getTileDisplayName(props.wildTile);
    });
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "table-center-zone" }, _attrs))} data-v-4704839d><div class="center-info" data-v-4704839d><div class="info-item multiplier-badge" data-v-4704839d><span class="badge-icon" data-v-4704839d>🎲</span><span class="badge-label" data-v-4704839d>总倍</span><span class="badge-value" data-v-4704839d>×${ssrInterpolate(__props.globalMultiplier || 1)}</span></div><div class="info-item remaining-badge" data-v-4704839d><span class="badge-icon" data-v-4704839d>🀄</span><span class="badge-label" data-v-4704839d>剩余</span><span class="badge-value" data-v-4704839d>${ssrInterpolate(__props.remainingTiles)}</span></div>`);
      if (__props.wildTile) {
        _push(`<div class="info-item wild-tile-row" data-v-4704839d>`);
        _push(ssrRenderComponent(MahjongTile, {
          tile: __props.wildTile,
          size: 7
        }, null, _parent));
        _push(`</div>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div></div>`);
    };
  }
});
const _sfc_setup$8 = _sfc_main$8.setup;
_sfc_main$8.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/TableCenter.vue");
  return _sfc_setup$8 ? _sfc_setup$8(props, ctx) : void 0;
};
const TableCenter = /* @__PURE__ */ Object.assign(_export_sfc(_sfc_main$8, [["__scopeId", "data-v-4704839d"]]), { __name: "TableCenter" });
const TILES_PER_SIDE = 18;
const _sfc_main$7 = /* @__PURE__ */ defineComponent({
  __name: "TileWall",
  __ssrInlineRender: true,
  props: {
    remaining: {},
    tileBackScheme: { default: 0 }
  },
  setup(__props) {
    const props = __props;
    const effectiveBackScheme = computed(() => {
      const scheme = Number(props.tileBackScheme);
      return scheme === 1 || scheme === 2 ? scheme : 0;
    });
    const BackTile = defineComponent({
      name: "WallBackTile",
      props: {
        scheme: { type: Number, default: 0 },
        outer: { type: Boolean, default: false }
      },
      setup(tileProps) {
        return () => h("div", {
          class: [
            "wall-back",
            "wall-back--css",
            tileProps.outer ? "wall-back--outer" : "",
            tileProps.scheme === 1 ? "wall-back--ivory" : tileProps.scheme === 2 ? "wall-back--capri" : "wall-back--jade"
          ]
        });
      }
    });
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({
        class: ["tile-wall", `tile-wall--back-${effectiveBackScheme.value}`]
      }, _attrs))} data-v-153caa76><div class="wall-side wall-side--top" data-v-153caa76><div class="wall-track wall-track--horizontal wall-track--inner" data-v-153caa76><!--[-->`);
      ssrRenderList(TILES_PER_SIDE, (i) => {
        _push(`<div class="tile-slot" data-v-153caa76>`);
        _push(ssrRenderComponent(unref(BackTile), { scheme: effectiveBackScheme.value }, null, _parent));
        _push(`</div>`);
      });
      _push(`<!--]--></div><div class="wall-track wall-track--horizontal wall-track--outer" data-v-153caa76><!--[-->`);
      ssrRenderList(TILES_PER_SIDE, (i) => {
        _push(`<div class="tile-slot" data-v-153caa76>`);
        _push(ssrRenderComponent(unref(BackTile), {
          scheme: effectiveBackScheme.value,
          outer: ""
        }, null, _parent));
        _push(`<div class="tile-side tile-side--bottom" data-v-153caa76></div></div>`);
      });
      _push(`<!--]--></div></div><div class="wall-side wall-side--bottom" data-v-153caa76><div class="wall-track wall-track--horizontal wall-track--inner" data-v-153caa76><!--[-->`);
      ssrRenderList(TILES_PER_SIDE, (i) => {
        _push(`<div class="tile-slot" data-v-153caa76>`);
        _push(ssrRenderComponent(unref(BackTile), { scheme: effectiveBackScheme.value }, null, _parent));
        _push(`</div>`);
      });
      _push(`<!--]--></div><div class="wall-track wall-track--horizontal wall-track--outer" data-v-153caa76><!--[-->`);
      ssrRenderList(TILES_PER_SIDE, (i) => {
        _push(`<div class="tile-slot" data-v-153caa76>`);
        _push(ssrRenderComponent(unref(BackTile), {
          scheme: effectiveBackScheme.value,
          outer: ""
        }, null, _parent));
        _push(`<div class="tile-side tile-side--bottom" data-v-153caa76></div></div>`);
      });
      _push(`<!--]--></div></div><div class="wall-side wall-side--left" data-v-153caa76><div class="wall-track wall-track--vertical wall-track--inner" data-v-153caa76><!--[-->`);
      ssrRenderList(TILES_PER_SIDE, (i) => {
        _push(`<div class="tile-slot tile-slot--vertical" data-v-153caa76>`);
        _push(ssrRenderComponent(unref(BackTile), { scheme: effectiveBackScheme.value }, null, _parent));
        _push(`</div>`);
      });
      _push(`<!--]--></div><div class="wall-track wall-track--vertical wall-track--outer" data-v-153caa76><!--[-->`);
      ssrRenderList(TILES_PER_SIDE, (i) => {
        _push(`<div class="tile-slot tile-slot--vertical" data-v-153caa76>`);
        _push(ssrRenderComponent(unref(BackTile), {
          scheme: effectiveBackScheme.value,
          outer: ""
        }, null, _parent));
        _push(`<div class="tile-side tile-side--bottom" data-v-153caa76></div></div>`);
      });
      _push(`<!--]--></div></div><div class="wall-side wall-side--right" data-v-153caa76><div class="wall-track wall-track--vertical wall-track--inner" data-v-153caa76><!--[-->`);
      ssrRenderList(TILES_PER_SIDE, (i) => {
        _push(`<div class="tile-slot tile-slot--vertical" data-v-153caa76>`);
        _push(ssrRenderComponent(unref(BackTile), { scheme: effectiveBackScheme.value }, null, _parent));
        _push(`</div>`);
      });
      _push(`<!--]--></div><div class="wall-track wall-track--vertical wall-track--outer" data-v-153caa76><!--[-->`);
      ssrRenderList(TILES_PER_SIDE, (i) => {
        _push(`<div class="tile-slot tile-slot--vertical" data-v-153caa76>`);
        _push(ssrRenderComponent(unref(BackTile), {
          scheme: effectiveBackScheme.value,
          outer: ""
        }, null, _parent));
        _push(`<div class="tile-side tile-side--bottom" data-v-153caa76></div></div>`);
      });
      _push(`<!--]--></div></div></div>`);
    };
  }
});
const _sfc_setup$7 = _sfc_main$7.setup;
_sfc_main$7.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/TileWall.vue");
  return _sfc_setup$7 ? _sfc_setup$7(props, ctx) : void 0;
};
const TileWall = /* @__PURE__ */ Object.assign(_export_sfc(_sfc_main$7, [["__scopeId", "data-v-153caa76"]]), { __name: "TileWall" });
const _sfc_main$6 = /* @__PURE__ */ defineComponent({
  __name: "Dice3D",
  __ssrInlineRender: true,
  props: {
    value: {},
    state: {},
    delay: {},
    rollSeed: {}
  },
  setup(__props) {
    const props = __props;
    const rootEl = ref(null);
    ref(null);
    const delayStyle = computed(() => ({
      ...props.delay ? { animationDelay: `${props.delay}s` } : {}
    }));
    watch(
      () => [props.state, props.value, props.rollSeed],
      () => {
        return;
      }
    );
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({
        ref_key: "rootEl",
        ref: rootEl,
        class: "dice-scene",
        style: delayStyle.value
      }, _attrs))} data-v-f8f24f89><canvas class="dice-canvas" data-v-f8f24f89></canvas><div class="${ssrRenderClass([`dice-shadow--${__props.state}`, "dice-shadow"])}" data-v-f8f24f89></div></div>`);
    };
  }
});
const _sfc_setup$6 = _sfc_main$6.setup;
_sfc_main$6.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/Dice3D.vue");
  return _sfc_setup$6 ? _sfc_setup$6(props, ctx) : void 0;
};
const Dice3D = /* @__PURE__ */ Object.assign(_export_sfc(_sfc_main$6, [["__scopeId", "data-v-f8f24f89"]]), { __name: "Dice3D" });
const RESULT_HOLD_MS = 500;
const _sfc_main$5 = /* @__PURE__ */ defineComponent({
  __name: "DiceAnimation",
  __ssrInlineRender: true,
  props: {
    dice1: {},
    dice2: {},
    dealerName: {},
    maxRolls: {},
    isDealer: { type: Boolean },
    rollTriggerKey: {}
  },
  emits: ["deal", "roll"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const visible = ref(true);
    const phase = ref("idle");
    const rollingSeed = ref(Date.now() % 997);
    const currentRoll = ref(0);
    const showResultBurst = ref(false);
    const maxRollsLimit = computed(() => props.maxRolls || 1);
    const canReroll = computed(() => currentRoll.value < maxRollsLimit.value && phase.value === "result");
    const isQuadCombo = computed(() => {
      return props.dice1 === 1 && props.dice2 === 1 || props.dice1 === 4 && props.dice2 === 4;
    });
    const isOneFourCombo = computed(() => {
      return props.dice1 === 1 && props.dice2 === 4 || props.dice1 === 4 && props.dice2 === 1;
    });
    const isDoubleCombo = computed(() => props.dice1 === props.dice2);
    const resultBurstLabel = computed(() => {
      if (isQuadCombo.value) return "四倍！";
      if (isOneFourCombo.value) return "两倍！";
      if (isDoubleCombo.value) return "双倍！";
      return "";
    });
    computed(() => {
      if (isQuadCombo.value) return "四倍！";
      if (isDoubleCombo.value) return "双倍！";
      return "";
    });
    let burstTimer = null;
    const particleStyle = (_n) => {
      const hue = 120 + Math.random() * 60;
      return {
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 3}s`,
        animationDuration: `${2 + Math.random() * 3}s`,
        background: `hsla(${hue}, 80%, 60%, 0.6)`,
        width: `${3 + Math.random() * 5}px`,
        height: `${3 + Math.random() * 5}px`
      };
    };
    const clearBurstTimer = () => {
      if (burstTimer) {
        clearTimeout(burstTimer);
        burstTimer = null;
      }
    };
    const flashResultBurst = () => {
      clearBurstTimer();
      if (!resultBurstLabel.value) return;
      showResultBurst.value = true;
      burstTimer = setTimeout(() => {
        showResultBurst.value = false;
        burstTimer = null;
      }, RESULT_HOLD_MS);
    };
    watch(() => props.rollTriggerKey, (key) => {
      if (!key || key === 0) return;
      currentRoll.value++;
      rollingSeed.value = Date.now() % 1e5;
      phase.value = "rolling";
      showResultBurst.value = false;
      clearBurstTimer();
      setTimeout(() => {
        phase.value = "result";
        flashResultBurst();
      }, 850);
    });
    return (_ctx, _push, _parent, _attrs) => {
      if (unref(visible)) {
        _push(`<div${ssrRenderAttrs(mergeProps({ class: "dice-overlay" }, _attrs))} data-v-07ab174b><div class="particles" data-v-07ab174b><!--[-->`);
        ssrRenderList(30, (n) => {
          _push(`<span class="particle" style="${ssrRenderStyle(particleStyle())}" data-v-07ab174b></span>`);
        });
        _push(`<!--]--></div><div class="dice-container" data-v-07ab174b>`);
        if (unref(showResultBurst)) {
          _push(`<div class="quad-burst" data-v-07ab174b><span class="quad-text" data-v-07ab174b>${ssrInterpolate(unref(resultBurstLabel))}</span></div>`);
        } else {
          _push(`<!---->`);
        }
        if (unref(phase) === "idle") {
          _push(`<div class="dice-idle-phase" data-v-07ab174b><p class="dice-hint dice-hint--lead" data-v-07ab174b>${ssrInterpolate(__props.dealerName ? `${__props.dealerName} 掷骰子` : "等待掷骰子...")}</p><div class="${ssrRenderClass([{ "dice-row--clickable": __props.isDealer }, "dice-row"])}" data-v-07ab174b>`);
          _push(ssrRenderComponent(Dice3D, {
            value: 1,
            state: "idle"
          }, null, _parent));
          _push(ssrRenderComponent(Dice3D, {
            value: 1,
            state: "idle"
          }, null, _parent));
          _push(`</div>`);
          if (unref(maxRollsLimit) > 1) {
            _push(`<p class="dice-hint dice-hint--sub" data-v-07ab174b>${ssrInterpolate(unref(currentRoll))}/${ssrInterpolate(unref(maxRollsLimit))}</p>`);
          } else {
            _push(`<!---->`);
          }
          if (__props.isDealer && unref(maxRollsLimit) <= 1) {
            _push(`<button class="deal-button" data-v-07ab174b><span class="deal-icon" data-v-07ab174b>🎲🀫</span> 掷骰子+发牌 </button>`);
          } else {
            _push(`<!---->`);
          }
          if (__props.isDealer && unref(maxRollsLimit) > 1) {
            _push(`<button class="deal-button" data-v-07ab174b><span class="deal-icon" data-v-07ab174b>🎲</span> 掷骰子 (${ssrInterpolate(unref(currentRoll))}/${ssrInterpolate(unref(maxRollsLimit))}) </button>`);
          } else {
            _push(`<!---->`);
          }
          if (!__props.isDealer) {
            _push(`<p class="dice-hint dice-hint--sub" data-v-07ab174b>等待庄家掷骰子...</p>`);
          } else {
            _push(`<!---->`);
          }
          _push(`</div>`);
        } else if (unref(phase) === "rolling") {
          _push(`<!--[--><div class="dice-row" data-v-07ab174b>`);
          _push(ssrRenderComponent(Dice3D, {
            value: __props.dice1,
            state: "rolling",
            delay: 0,
            "roll-seed": unref(rollingSeed)
          }, null, _parent));
          _push(ssrRenderComponent(Dice3D, {
            value: __props.dice2,
            state: "rolling",
            delay: 0.1,
            "roll-seed": unref(rollingSeed) + 97
          }, null, _parent));
          _push(`</div><p class="dice-rolling-label" data-v-07ab174b>🎲 掷骰子...</p><!--]-->`);
        } else {
          _push(`<div class="dice-result-phase" data-v-07ab174b><div class="${ssrRenderClass([{ "dice-row--clickable": unref(canReroll) && __props.isDealer }, "dice-row"])}" data-v-07ab174b>`);
          _push(ssrRenderComponent(Dice3D, {
            value: __props.dice1,
            state: "landed"
          }, null, _parent));
          _push(ssrRenderComponent(Dice3D, {
            value: __props.dice2,
            state: "landed"
          }, null, _parent));
          _push(`</div><p class="dice-total" data-v-07ab174b><span class="dice-total-num" data-v-07ab174b>${ssrInterpolate(__props.dice1)}</span><span class="dice-total-sep" data-v-07ab174b>&amp;</span><span class="dice-total-num" data-v-07ab174b>${ssrInterpolate(__props.dice2)}</span></p><p class="dice-hint" data-v-07ab174b>${ssrInterpolate(__props.dealerName ? `庄家: ${__props.dealerName}` : "")}</p>`);
          if (unref(canReroll) && __props.isDealer) {
            _push(`<p class="dice-hint dice-hint--sub" data-v-07ab174b> 点击骰子可重掷（${ssrInterpolate(unref(currentRoll))}/${ssrInterpolate(unref(maxRollsLimit))}） </p>`);
          } else {
            _push(`<!---->`);
          }
          if (__props.isDealer) {
            _push(`<button class="deal-button deal-button--result" data-v-07ab174b><span class="deal-icon" data-v-07ab174b>🀫</span> 发牌 </button>`);
          } else {
            _push(`<!---->`);
          }
          if (!__props.isDealer) {
            _push(`<p class="dice-hint dice-hint--sub" data-v-07ab174b>等待庄家发牌...</p>`);
          } else {
            _push(`<!---->`);
          }
          _push(`</div>`);
        }
        _push(`</div></div>`);
      } else {
        _push(`<!---->`);
      }
    };
  }
});
const _sfc_setup$5 = _sfc_main$5.setup;
_sfc_main$5.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/DiceAnimation.vue");
  return _sfc_setup$5 ? _sfc_setup$5(props, ctx) : void 0;
};
const DiceAnimation = /* @__PURE__ */ Object.assign(_export_sfc(_sfc_main$5, [["__scopeId", "data-v-07ab174b"]]), { __name: "DiceAnimation" });
const _sfc_main$4 = /* @__PURE__ */ defineComponent({
  __name: "RoomStats",
  __ssrInlineRender: true,
  props: {
    players: {},
    currentRound: {}
  },
  emits: ["nameClick"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const rankedPlayers = computed(
      () => [...props.players].sort((a, b) => b.score - a.score)
    );
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "room-stats" }, _attrs))} data-v-b2f37339><div class="stats-header" data-v-b2f37339><span class="stats-title" data-v-b2f37339>🏆 战绩榜</span><span class="stats-round" data-v-b2f37339>第 ${ssrInterpolate(__props.currentRound)} 局</span></div><div class="stats-table-wrap" data-v-b2f37339><table class="stats-table" data-v-b2f37339><thead data-v-b2f37339><tr data-v-b2f37339><th data-v-b2f37339>玩家名</th><th data-v-b2f37339>胡牌</th><th data-v-b2f37339>捉冲</th><th data-v-b2f37339>自摸</th><th data-v-b2f37339>单局最高</th><th data-v-b2f37339>总分</th></tr></thead><tbody data-v-b2f37339><!--[-->`);
      ssrRenderList(unref(rankedPlayers), (player) => {
        _push(`<tr class="${ssrRenderClass({ "row-me": player.isMe })}" data-v-b2f37339><td class="${ssrRenderClass([{ "name-clickable": true }, "td-name"])}" data-v-b2f37339><span class="td-name-inner" data-v-b2f37339><span class="${ssrRenderClass([`dot--${player.color}`, "rank-dot"])}" data-v-b2f37339></span><span class="${ssrRenderClass({ "name-me": player.isMe })}" data-v-b2f37339>${ssrInterpolate(player.name)}</span>`);
        if (player.isQJCrossed) {
          _push(`<span class="${ssrRenderClass([{ "rank-qj-icon--glow": player.qjGlow }, "rank-qj-icon"])}" title="已突破被聚义QJ线" data-v-b2f37339>🤑</span>`);
        } else {
          _push(`<!---->`);
        }
        _push(`</span></td><td data-v-b2f37339>${ssrInterpolate(player.winCount ?? player.wins ?? 0)}</td><td data-v-b2f37339>${ssrInterpolate(player.discardCount ?? player.losses ?? 0)}</td><td data-v-b2f37339>${ssrInterpolate(player.selfDrawCount ?? 0)}</td><td data-v-b2f37339>${ssrInterpolate(player.bestRound ?? "-")}</td><td class="${ssrRenderClass([player.score > 0 ? "sc-pos" : player.score < 0 ? "sc-neg" : "", "td-score"])}" data-v-b2f37339>${ssrInterpolate(player.score > 0 ? "+" : "")}${ssrInterpolate(player.score)}</td></tr>`);
      });
      _push(`<!--]--></tbody></table></div></div>`);
    };
  }
});
const _sfc_setup$4 = _sfc_main$4.setup;
_sfc_main$4.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/RoomStats.vue");
  return _sfc_setup$4 ? _sfc_setup$4(props, ctx) : void 0;
};
const RoomStats = /* @__PURE__ */ Object.assign(_export_sfc(_sfc_main$4, [["__scopeId", "data-v-b2f37339"]]), { __name: "RoomStats" });
const _sfc_main$3 = /* @__PURE__ */ defineComponent({
  __name: "GameBroadcast",
  __ssrInlineRender: true,
  props: {
    messages: {}
  },
  setup(__props) {
    const props = __props;
    const visibleMessages = computed(() => {
      return props.messages.slice(-5);
    });
    const scrollContainer = ref(null);
    watch(() => props.messages.length, () => {
      nextTick(() => {
        if (scrollContainer.value) {
          scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight;
        }
      });
    });
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "broadcast-panel" }, _attrs))} data-v-3fcb8ae2><div class="broadcast-header" data-v-3fcb8ae2><span class="broadcast-icon" data-v-3fcb8ae2>📢</span><span class="broadcast-title" data-v-3fcb8ae2>牌局快讯</span></div><div class="broadcast-scroll" data-v-3fcb8ae2>`);
      if (__props.messages.length === 0) {
        _push(`<div class="broadcast-empty" data-v-3fcb8ae2>暂无消息</div>`);
      } else {
        _push(`<!---->`);
      }
      _push(`<!--[-->`);
      ssrRenderList(unref(visibleMessages), (msg) => {
        _push(`<div class="${ssrRenderClass([`broadcast-msg--${msg.type}`, "broadcast-msg"])}" data-v-3fcb8ae2><span class="broadcast-time" data-v-3fcb8ae2>${ssrInterpolate(msg.timeLabel)}</span><span class="broadcast-text" data-v-3fcb8ae2>${ssrInterpolate(msg.text)}</span></div>`);
      });
      _push(`<!--]--></div></div>`);
    };
  }
});
const _sfc_setup$3 = _sfc_main$3.setup;
_sfc_main$3.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/GameBroadcast.vue");
  return _sfc_setup$3 ? _sfc_setup$3(props, ctx) : void 0;
};
const GameBroadcast = /* @__PURE__ */ Object.assign(_export_sfc(_sfc_main$3, [["__scopeId", "data-v-3fcb8ae2"]]), { __name: "GameBroadcast" });
const _sfc_main$2 = /* @__PURE__ */ defineComponent({
  __name: "DiscardZone",
  __ssrInlineRender: true,
  props: {
    position: {},
    tiles: {},
    isWinner: { type: Boolean },
    latestTileId: {}
  },
  setup(__props) {
    const props = __props;
    const layout = computed(() => {
      if (props.position === "left" || props.position === "right") {
        return { cols: 3, rows: 8 };
      }
      return { cols: 10, rows: 3 };
    });
    const maxTiles = computed(() => layout.value.cols * layout.value.rows);
    const visibleTiles = computed(() => props.tiles.slice(0, maxTiles.value));
    const isSideZone = computed(() => props.position === "left" || props.position === "right");
    const zoneStyle = computed(() => {
      const { cols, rows } = layout.value;
      if (isSideZone.value) {
        return {
          width: `calc(var(--discard-step-y) * ${cols - 1} + var(--discard-tile-h))`,
          height: `calc(var(--discard-step-x) * ${rows - 1} + var(--discard-tile-w))`
        };
      }
      return {
        width: `calc(var(--discard-step-x) * ${cols - 1} + var(--discard-tile-w))`,
        height: `calc(var(--discard-step-y) * ${rows - 1} + var(--discard-tile-h))`
      };
    });
    function slotStyle(index) {
      const { cols, rows } = layout.value;
      const stepX = isSideZone.value ? "var(--discard-step-y)" : "var(--discard-step-x)";
      const stepY = isSideZone.value ? "var(--discard-step-x)" : "var(--discard-step-y)";
      let col = 0;
      let row = 0;
      if (props.position === "bottom") {
        col = index % cols;
        row = Math.floor(index / cols);
      } else if (props.position === "top") {
        col = cols - 1 - index % cols;
        row = rows - 1 - Math.floor(index / cols);
      } else if (props.position === "left") {
        col = cols - 1 - Math.floor(index / rows);
        row = index % rows;
      } else {
        col = Math.floor(index / rows);
        row = rows - 1 - index % rows;
      }
      return {
        left: `calc(${stepX} * ${col})`,
        top: `calc(${stepY} * ${row})`,
        width: "var(--discard-tile-w)",
        height: "var(--discard-tile-h)"
      };
    }
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({
        class: ["discard-zone", [`discard-zone--${__props.position}`, { "discard-zone--empty": !__props.tiles.length }]],
        style: zoneStyle.value
      }, _attrs))} data-v-78d7a01b><!--[-->`);
      ssrRenderList(visibleTiles.value, (tile, index) => {
        _push(`<div class="${ssrRenderClass([`discard-item--${__props.position}`, "discard-item"])}" style="${ssrRenderStyle(slotStyle(index))}" data-v-78d7a01b><div class="${ssrRenderClass([`discard-tile-shell--${__props.position}`, "discard-tile-shell"])}" data-v-78d7a01b>`);
        _push(ssrRenderComponent(MahjongTile, {
          tile,
          small: true,
          dimmed: __props.isWinner && tile.id !== __props.latestTileId,
          class: { "latest-tile": tile.id === __props.latestTileId && !__props.isWinner }
        }, null, _parent));
        _push(`</div></div>`);
      });
      _push(`<!--]--></div>`);
    };
  }
});
const _sfc_setup$2 = _sfc_main$2.setup;
_sfc_main$2.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/DiscardZone.vue");
  return _sfc_setup$2 ? _sfc_setup$2(props, ctx) : void 0;
};
const DiscardZone = /* @__PURE__ */ Object.assign(_export_sfc(_sfc_main$2, [["__scopeId", "data-v-78d7a01b"]]), { __name: "DiscardZone" });
const _sfc_main$1 = /* @__PURE__ */ defineComponent({
  __name: "LayoutDebugPanel",
  __ssrInlineRender: true,
  emits: ["close"],
  setup(__props) {
    const px = ref(10);
    const py = ref(80);
    const collapsed = ref(false);
    const search = ref("");
    const openGroups = ref(/* @__PURE__ */ new Set([
      "🃏 牌桌",
      "🫵 自家·手牌",
      "🫵 自家·门口牌",
      "🫵 自家·弃牌区",
      "👆 对家·手牌",
      "👆 对家·门口牌",
      "👆 对家·弃牌区",
      "👈 上家·手牌",
      "👈 上家·门口牌",
      "👈 上家·弃牌区",
      "👉 下家·手牌",
      "👉 下家·门口牌",
      "👉 下家·弃牌区",
      "🪑 座位容器",
      "🧱 牌墙",
      "🌑 2.5D 阴影",
      "🎮 操作按钮",
      "📛 名字",
      "🎮 游戏配置"
    ]));
    const D = {
      // ===== 牌桌 =====
      "--tbl-maxw": 1200,
      "--tbl-aspect": 1.333,
      "--tbl-border": 12,
      "--tbl-frame": "#3a2006",
      "--felt-pad": 0,
      "--felt-inner": "rgba(40,90,50,0.95)",
      // ===== 自家·手牌 =====
      "--self-hand-gap": 2,
      "--self-hand-maxw": 440,
      "--self-hand-rows": 1,
      "--self-tile-w": 32,
      "--self-tile-h": 45,
      "--self-tile-scale": 100,
      "--self-tile-rotate": 0,
      "--self-hand-dir": 0,
      "--self-hand-reverse": 0,
      "--self-hand-bottom": 0,
      "--self-hand-scale": 120,
      "--self-hand-align": 1,
      // 0=左, 1=居中, 2=右
      "--self-hand-justify": 1,
      // 0=flex-start, 1=center, 2=flex-end
      // ===== 自家·门口牌 =====
      "--self-meld-gap": 8,
      "--self-meld-mgap": 3,
      "--self-meld-tile-w": 26,
      "--self-meld-tile-h": 36,
      "--self-meld-dir": 0,
      "--self-meld-rotate": 0,
      "--self-meld-order": 0,
      // 0=手牌左, 1=手牌右
      "--self-meld-align": 1,
      // 0=top, 1=center, 2=bottom
      // ===== 自家·弃牌区 =====
      "--self-dl-top": 31,
      "--self-dl-cols": 8,
      "--self-dl-tile-w": 22,
      "--self-dl-tile-h": 31,
      "--self-dl-gap": 1,
      "--self-dl-rowgap": 1,
      "--self-dl-rotate": 0,
      "--self-dl-shadow": 0,
      // ===== 座位容器 =====
      "--seat-bottom-bottom": 0,
      // 离底偏移%
      "--seat-bottom-scale": 120,
      // 整体缩放
      "--seat-top-top": 10,
      // 离顶偏移%
      "--seat-top-width": 66,
      // 宽度%
      "--seat-top-scale": 100,
      "--seat-top-rotate": 180,
      // 旋转°
      "--seat-left-left": 7,
      // 离左偏移%
      "--seat-left-width": 85,
      // 宽度px
      "--seat-left-scale": 100,
      "--seat-left-rotate": 0,
      "--seat-right-right": 7,
      // 离右偏移%
      "--seat-right-width": 85,
      // 宽度px
      "--seat-right-scale": 100,
      "--seat-right-rotate": 0,
      // ===== 对家·手牌 =====
      "--opp-hand-w": 26,
      "--opp-hand-h": 36,
      "--opp-hand-gap": 2,
      "--opp-hand-rotate": 180,
      "--opp-hand-width": 90,
      "--opp-hand-top": 10,
      "--opp-hand-scale": 100,
      "--opp-hand-align": 1,
      // 0=左, 1=居中, 2=右
      "--opp-hand-dir": 0,
      // 0=row, 1=column
      "--opp-hand-reverse": 0,
      // 0=normal, 1=reversed
      // ===== 对家·门口牌 =====
      "--opp-meld-gap": 8,
      "--opp-meld-mgap": 3,
      "--opp-meld-tile-w": 26,
      "--opp-meld-tile-h": 36,
      "--opp-meld-rotate": 180,
      "--opp-meld-order": 0,
      "--opp-meld-align": 1,
      // ===== 对家·弃牌区 =====
      "--opp-dl-top": 31,
      "--opp-dl-cols": 8,
      "--opp-dl-tile-w": 22,
      "--opp-dl-tile-h": 31,
      "--opp-dl-gap": 1,
      "--opp-dl-rowgap": 1,
      "--opp-dl-rotate": 180,
      "--opp-dl-shadow": 0,
      // ===== 上家·手牌 =====
      "--left-hand-w": 26,
      "--left-hand-h": 36,
      "--left-hand-gap": 2,
      "--left-hand-rotate": 90,
      "--left-hand-left": 7,
      "--left-hand-scale": 100,
      "--left-hand-align": 1,
      "--left-hand-dir": 0,
      // 0=column, 1=row
      "--left-hand-reverse": 0,
      // 0=normal, 1=reversed
      // ===== 上家·门口牌 =====
      "--left-meld-gap": 8,
      "--left-meld-mgap": 3,
      "--left-meld-tile-w": 26,
      "--left-meld-tile-h": 36,
      "--left-meld-rotate": 90,
      "--left-meld-order": 0,
      "--left-meld-align": 1,
      // ===== 上家·弃牌区 =====
      "--left-dl-left": 21.6,
      "--left-dl-cols": 8,
      "--left-dl-tile-w": 22,
      "--left-dl-tile-h": 31,
      "--left-dl-gap": 1,
      "--left-dl-rowgap": 1,
      "--left-dl-rotate": 90,
      "--left-dl-shadow": 0,
      // ===== 下家·手牌 =====
      "--right-hand-w": 26,
      "--right-hand-h": 36,
      "--right-hand-gap": 2,
      "--right-hand-rotate": -90,
      "--right-hand-right": 7,
      "--right-hand-scale": 100,
      "--right-hand-align": 1,
      "--right-hand-dir": 0,
      // 0=column, 1=row
      "--right-hand-reverse": 0,
      // 0=normal, 1=reversed
      // ===== 下家·门口牌 =====
      "--right-meld-gap": 8,
      "--right-meld-mgap": 3,
      "--right-meld-tile-w": 26,
      "--right-meld-tile-h": 36,
      "--right-meld-rotate": -90,
      "--right-meld-order": 0,
      "--right-meld-align": 1,
      // ===== 下家·弃牌区 =====
      "--right-dl-right": 21.6,
      "--right-dl-cols": 8,
      "--right-dl-tile-w": 22,
      "--right-dl-tile-h": 31,
      "--right-dl-gap": 1,
      "--right-dl-rowgap": 1,
      "--right-dl-rotate": -90,
      "--right-dl-shadow": 0,
      // ===== 牌墙 =====
      "--wall-tile-w": 28,
      "--wall-tile-h": 40,
      "--wall-overlap": 30,
      "--wall-voverlap": 30,
      "--wall-layer-offset": 1,
      "--wall-top-pct": 16,
      "--wall-bottom-pct": 16,
      "--wall-left-pct": 16,
      "--wall-right-pct": 16,
      "--wall-opacity": 100,
      // ===== 2.5D 阴影 =====
      "--shadow-depth": 4,
      "--shadow-color": "rgba(0,0,0,0.3)",
      "--shadow-side-color": "#8a7a5a",
      "--shadow-side-color2": "#6a5a3a",
      "--shadow-self-dir": 0,
      "--shadow-opp-dir": 0,
      "--shadow-left-dir": 0,
      "--shadow-right-dir": 0,
      "--shadow-highlight": 0,
      // ===== 操作按钮 =====
      "--act-panel-w": 100,
      "--act-panel-pad": 12,
      "--act-btn-sz": 44,
      "--act-draw-sz": 72,
      "--act-gap": 6,
      "--act-panel-mt": 0,
      // ===== 名字 =====
      "--lbl-sz": 0.75,
      // ===== 游戏配置 =====
      "--font-scale": 100,
      "--ui-opacity": 100,
      "--tile-gap": 0,
      "--animation-speed": 1,
      "--shadow-intensity": 50
    };
    const vals = reactive({ ...D });
    const S = (label, v, min, max, step, unit) => ({ label, var: v, min, max, step, unit });
    const groups = [
      { name: "🃏 牌桌", sliders: [
        S("最大宽度", "--tbl-maxw", 600, 1600, 20, "px"),
        S("宽高比", "--tbl-aspect", 1, 2, 0.05, ""),
        S("外框粗细", "--tbl-border", 4, 24, 1, "px"),
        S("桌布内边距", "--felt-pad", 0, 60, 2, "px")
      ] },
      // ===== 自家 =====
      { name: "🫵 自家·手牌", sliders: [
        S("牌宽", "--self-tile-w", 24, 48, 1, "px"),
        S("牌高", "--self-tile-h", 34, 64, 1, "px"),
        S("缩放", "--self-tile-scale", 50, 150, 1, "%"),
        S("旋转", "--self-tile-rotate", -180, 180, 5, "°"),
        S("牌间距", "--self-hand-gap", 0, 8, 0.5, "px"),
        S("最大宽度", "--self-hand-maxw", 200, 900, 10, "px"),
        S("行数", "--self-hand-rows", 1, 3, 1, ""),
        S("排列", "--self-hand-dir", 0, 1, 1, ""),
        S("反向", "--self-hand-reverse", 0, 1, 1, ""),
        S("整体缩放", "--self-hand-scale", 80, 150, 1, "%"),
        S("离底距离", "--self-hand-bottom", 0, 15, 1, "%"),
        S("水平对齐", "--self-hand-align", 0, 2, 1, "0左1中2右"),
        S("垂直对齐", "--self-hand-justify", 0, 2, 1, "0上1中2下")
      ] },
      { name: "🫵 自家·门口牌", sliders: [
        S("牌宽", "--self-meld-tile-w", 20, 40, 1, "px"),
        S("牌高", "--self-meld-tile-h", 28, 52, 1, "px"),
        S("组间距", "--self-meld-gap", 2, 20, 1, "px"),
        S("门间距", "--self-meld-mgap", 0, 12, 1, "px"),
        S("排列", "--self-meld-dir", 0, 1, 1, ""),
        S("旋转", "--self-meld-rotate", -180, 180, 5, "°"),
        S("相对位置", "--self-meld-order", 0, 1, 1, "0手牌左1手牌右"),
        S("垂直对齐", "--self-meld-align", 0, 2, 1, "0上1中2下")
      ] },
      { name: "🫵 自家·弃牌区", sliders: [
        S("距底%", "--self-dl-top", 0, 50, 0.5, "%"),
        S("列数", "--self-dl-cols", 4, 12, 1, ""),
        S("牌宽", "--self-dl-tile-w", 16, 36, 1, "px"),
        S("牌高", "--self-dl-tile-h", 22, 50, 1, "px"),
        S("牌间距", "--self-dl-gap", -2, 6, 0.5, "px"),
        S("行间距", "--self-dl-rowgap", -2, 6, 0.5, "px"),
        S("区旋转", "--self-dl-rotate", -180, 180, 5, "°"),
        S("阴影方向", "--self-dl-shadow", 0, 3, 1, "")
      ] },
      // ===== 对家 =====
      { name: "👆 对家·手牌", sliders: [
        S("牌宽", "--opp-hand-w", 20, 40, 1, "px"),
        S("牌高", "--opp-hand-h", 28, 52, 1, "px"),
        S("牌间距", "--opp-hand-gap", 0, 8, 0.5, "px"),
        S("旋转", "--opp-hand-rotate", -180, 180, 5, "°"),
        S("座位宽度%", "--opp-hand-width", 50, 100, 1, "%"),
        S("距顶%", "--opp-hand-top", 0, 30, 0.5, "%"),
        S("整体缩放", "--opp-hand-scale", 50, 150, 1, "%"),
        S("水平对齐", "--opp-hand-align", 0, 2, 1, "0左1中2右"),
        S("排列方向", "--opp-hand-dir", 0, 1, 1, "0横1竖"),
        S("反转", "--opp-hand-reverse", 0, 1, 1, "")
      ] },
      { name: "👆 对家·门口牌", sliders: [
        S("牌宽", "--opp-meld-tile-w", 20, 40, 1, "px"),
        S("牌高", "--opp-meld-tile-h", 28, 52, 1, "px"),
        S("组间距", "--opp-meld-gap", 2, 20, 1, "px"),
        S("门间距", "--opp-meld-mgap", 0, 12, 1, "px"),
        S("旋转", "--opp-meld-rotate", -180, 180, 5, "°"),
        S("相对位置", "--opp-meld-order", 0, 1, 1, "0手牌左1手牌右"),
        S("垂直对齐", "--opp-meld-align", 0, 2, 1, "0上1中2下")
      ] },
      { name: "👆 对家·弃牌区", sliders: [
        S("距顶%", "--opp-dl-top", 0, 50, 0.5, "%"),
        S("列数", "--opp-dl-cols", 4, 12, 1, ""),
        S("牌宽", "--opp-dl-tile-w", 16, 36, 1, "px"),
        S("牌高", "--opp-dl-tile-h", 22, 50, 1, "px"),
        S("牌间距", "--opp-dl-gap", -2, 6, 0.5, "px"),
        S("行间距", "--opp-dl-rowgap", -2, 6, 0.5, "px"),
        S("区旋转", "--opp-dl-rotate", -180, 180, 5, "°"),
        S("阴影方向", "--opp-dl-shadow", 0, 3, 1, "")
      ] },
      // ===== 上家 =====
      { name: "👈 上家·手牌", sliders: [
        S("牌宽", "--left-hand-w", 20, 40, 1, "px"),
        S("牌高", "--left-hand-h", 28, 52, 1, "px"),
        S("牌间距", "--left-hand-gap", 0, 8, 0.5, "px"),
        S("旋转", "--left-hand-rotate", -180, 180, 5, "°"),
        S("距左%", "--left-hand-left", 0, 30, 0.5, "%"),
        S("整体缩放", "--left-hand-scale", 50, 150, 1, "%"),
        S("水平对齐", "--left-hand-align", 0, 2, 1, "0左1中2右"),
        S("排列方向", "--left-hand-dir", 0, 1, 1, "0竖1横"),
        S("反转", "--left-hand-reverse", 0, 1, 1, "")
      ] },
      { name: "👈 上家·门口牌", sliders: [
        S("牌宽", "--left-meld-tile-w", 20, 40, 1, "px"),
        S("牌高", "--left-meld-tile-h", 28, 52, 1, "px"),
        S("组间距", "--left-meld-gap", 2, 20, 1, "px"),
        S("门间距", "--left-meld-mgap", 0, 12, 1, "px"),
        S("旋转", "--left-meld-rotate", -180, 180, 5, "°"),
        S("相对位置", "--left-meld-order", 0, 1, 1, "0手牌左1手牌右"),
        S("垂直对齐", "--left-meld-align", 0, 2, 1, "0上1中2下")
      ] },
      { name: "👈 上家·弃牌区", sliders: [
        S("距左%", "--left-dl-left", 0, 50, 0.5, "%"),
        S("列数", "--left-dl-cols", 4, 12, 1, ""),
        S("牌宽", "--left-dl-tile-w", 16, 36, 1, "px"),
        S("牌高", "--left-dl-tile-h", 22, 50, 1, "px"),
        S("牌间距", "--left-dl-gap", -2, 6, 0.5, "px"),
        S("行间距", "--left-dl-rowgap", -2, 6, 0.5, "px"),
        S("区旋转", "--left-dl-rotate", -180, 180, 5, "°"),
        S("阴影方向", "--left-dl-shadow", 0, 3, 1, "")
      ] },
      // ===== 下家 =====
      { name: "👉 下家·手牌", sliders: [
        S("牌宽", "--right-hand-w", 20, 40, 1, "px"),
        S("牌高", "--right-hand-h", 28, 52, 1, "px"),
        S("牌间距", "--right-hand-gap", 0, 8, 0.5, "px"),
        S("旋转", "--right-hand-rotate", -180, 180, 5, "°"),
        S("距右%", "--right-hand-right", 0, 30, 0.5, "%"),
        S("整体缩放", "--right-hand-scale", 50, 150, 1, "%"),
        S("水平对齐", "--right-hand-align", 0, 2, 1, "0左1中2右"),
        S("排列方向", "--right-hand-dir", 0, 1, 1, "0竖1横"),
        S("反转", "--right-hand-reverse", 0, 1, 1, "")
      ] },
      { name: "👉 下家·门口牌", sliders: [
        S("牌宽", "--right-meld-tile-w", 20, 40, 1, "px"),
        S("牌高", "--right-meld-tile-h", 28, 52, 1, "px"),
        S("组间距", "--right-meld-gap", 2, 20, 1, "px"),
        S("门间距", "--right-meld-mgap", 0, 12, 1, "px"),
        S("旋转", "--right-meld-rotate", -180, 180, 5, "°"),
        S("相对位置", "--right-meld-order", 0, 1, 1, "0手牌左1手牌右"),
        S("垂直对齐", "--right-meld-align", 0, 2, 1, "0上1中2下")
      ] },
      { name: "👉 下家·弃牌区", sliders: [
        S("距右%", "--right-dl-right", 0, 50, 0.5, "%"),
        S("列数", "--right-dl-cols", 4, 12, 1, ""),
        S("牌宽", "--right-dl-tile-w", 16, 36, 1, "px"),
        S("牌高", "--right-dl-tile-h", 22, 50, 1, "px"),
        S("牌间距", "--right-dl-gap", -2, 6, 0.5, "px"),
        S("行间距", "--right-dl-rowgap", -2, 6, 0.5, "px"),
        S("区旋转", "--right-dl-rotate", -180, 180, 5, "°"),
        S("阴影方向", "--right-dl-shadow", 0, 3, 1, "")
      ] },
      // ===== 座位容器 =====
      { name: "🪑 座位容器", sliders: [
        // 自家（底部）
        S("自家离底%", "--seat-bottom-bottom", -10, 20, 0.5, "%"),
        S("自家整体缩放", "--seat-bottom-scale", 80, 200, 1, "%"),
        // 对家（顶部）
        S("对家离顶%", "--seat-top-top", 0, 30, 0.5, "%"),
        S("对家宽度%", "--seat-top-width", 40, 100, 1, "%"),
        S("对家缩放", "--seat-top-scale", 50, 200, 1, "%"),
        S("对家旋转°", "--seat-top-rotate", 160, 200, 5, "°"),
        // 上家（左侧）
        S("上家离左%", "--seat-left-left", 0, 30, 0.5, "%"),
        S("上家宽度px", "--seat-left-width", 50, 150, 5, "px"),
        S("上家缩放", "--seat-left-scale", 50, 200, 1, "%"),
        S("上家旋转°", "--seat-left-rotate", -30, 30, 5, "°"),
        // 下家（右侧）
        S("下家离右%", "--seat-right-right", 0, 30, 0.5, "%"),
        S("下家宽度px", "--seat-right-width", 50, 150, 5, "px"),
        S("下家缩放", "--seat-right-scale", 50, 200, 1, "%"),
        S("下家旋转°", "--seat-right-rotate", -30, 30, 5, "°")
      ] },
      // ===== 牌墙 =====
      { name: "🧱 牌墙", sliders: [
        S("牌宽", "--wall-tile-w", 16, 40, 1, "px"),
        S("牌高", "--wall-tile-h", 24, 56, 1, "px"),
        S("水平重叠", "--wall-overlap", 16, 40, 1, "px"),
        S("垂直重叠", "--wall-voverlap", 16, 40, 1, "px"),
        S("层偏移", "--wall-layer-offset", 0, 4, 0.5, "px"),
        S("上墙距顶%", "--wall-top-pct", 5, 30, 0.5, "%"),
        S("下墙距底%", "--wall-bottom-pct", 5, 30, 0.5, "%"),
        S("左墙距左%", "--wall-left-pct", 5, 30, 0.5, "%"),
        S("右墙距右%", "--wall-right-pct", 5, 30, 0.5, "%"),
        S("透明度", "--wall-opacity", 0, 100, 5, "%")
      ] },
      // ===== 2.5D 阴影 =====
      { name: "🌑 2.5D 阴影", sliders: [
        S("阴影深度", "--shadow-depth", 0, 10, 0.5, "px"),
        S("侧面颜色1", "--shadow-side-color", 0, 360, 5, "hue"),
        S("侧面颜色2", "--shadow-side-color2", 0, 360, 5, "hue"),
        S("自家阴影方向", "--shadow-self-dir", 0, 3, 1, ""),
        S("对家阴影方向", "--shadow-opp-dir", 0, 3, 1, ""),
        S("上家阴影方向", "--shadow-left-dir", 0, 3, 1, ""),
        S("下家阴影方向", "--shadow-right-dir", 0, 3, 1, ""),
        S("高光强度", "--shadow-highlight", 0, 100, 5, "%")
      ] },
      // ===== 操作按钮 =====
      { name: "🎮 操作按钮", sliders: [
        S("面板宽%", "--act-panel-w", 50, 100, 1, "%"),
        S("内边距", "--act-panel-pad", 4, 24, 1, "px"),
        S("小按钮", "--act-btn-sz", 28, 64, 1, "px"),
        S("摸牌钮", "--act-draw-sz", 40, 100, 1, "px"),
        S("按钮间距", "--act-gap", 2, 16, 1, "px"),
        S("上边距", "--act-panel-mt", 0, 32, 1, "px")
      ] },
      // ===== 名字 =====
      { name: "📛 名字", sliders: [
        S("字号", "--lbl-sz", 0.5, 1.5, 0.05, "rem")
      ] },
      // ===== 游戏配置 =====
      { name: "🎮 游戏配置", sliders: [
        S("字号缩放", "--font-scale", 50, 150, 1, "%"),
        S("UI透明度", "--ui-opacity", 50, 100, 1, "%"),
        S("全局牌间距", "--tile-gap", 0, 10, 0.5, "px"),
        S("动画速度", "--animation-speed", 0.1, 2, 0.1, "x"),
        S("阴影强度", "--shadow-intensity", 0, 100, 5, "%")
      ] }
    ];
    const filteredGroups = computed(() => {
      if (!search.value) return groups;
      const q = search.value.toLowerCase();
      return groups.map((g) => ({
        ...g,
        sliders: g.sliders.filter(
          (s) => s.label.toLowerCase().includes(q) || s.var.toLowerCase().includes(q)
        )
      })).filter((g) => g.sliders.length > 0 || g.name.toLowerCase().includes(q));
    });
    const sliders = {};
    for (const g of groups) for (const s of g.sliders) sliders[s.var] = s;
    function fmt(v, n) {
      return n + (sliders[v]?.unit ?? "");
    }
    return (_ctx, _push, _parent, _attrs) => {
      ssrRenderTeleport(_push, (_push2) => {
        _push2(`<div class="${ssrRenderClass(["layout-debug-panel", { collapsed: unref(collapsed) }])}" style="${ssrRenderStyle({ left: `${unref(px)}px`, top: `${unref(py)}px` })}" data-v-8517f9d3><div class="hdr" data-v-8517f9d3><span data-v-8517f9d3>🔧 布局调试 v2</span><button class="close" data-v-8517f9d3>✕</button></div>`);
        if (!unref(collapsed)) {
          _push2(`<div class="body" data-v-8517f9d3><div class="search-row" data-v-8517f9d3><input${ssrRenderAttr("value", unref(search))} placeholder="搜索参数..." class="search-input" data-v-8517f9d3>`);
          if (unref(search)) {
            _push2(`<button class="search-clear" data-v-8517f9d3>✕</button>`);
          } else {
            _push2(`<!---->`);
          }
          _push2(`</div><!--[-->`);
          ssrRenderList(unref(filteredGroups), (g) => {
            _push2(`<div class="grp" data-v-8517f9d3><div class="grp-title" data-v-8517f9d3><span class="grp-arrow" data-v-8517f9d3>${ssrInterpolate(unref(openGroups).has(g.name) ? "▼" : "▶")}</span> ${ssrInterpolate(g.name)}</div>`);
            if (unref(openGroups).has(g.name)) {
              _push2(`<div class="grp-body" data-v-8517f9d3><!--[-->`);
              ssrRenderList(g.sliders, (s) => {
                _push2(`<div class="row" data-v-8517f9d3><label${ssrRenderAttr("title", s.var)} data-v-8517f9d3>${ssrInterpolate(s.label)}</label><input type="range"${ssrRenderAttr("min", s.min)}${ssrRenderAttr("max", s.max)}${ssrRenderAttr("step", s.step)}${ssrRenderAttr("value", unref(vals)[s.var])} data-v-8517f9d3><span class="v" data-v-8517f9d3>${ssrInterpolate(fmt(s.var, unref(vals)[s.var]))}</span></div>`);
              });
              _push2(`<!--]--></div>`);
            } else {
              _push2(`<!---->`);
            }
            _push2(`</div>`);
          });
          _push2(`<!--]--><div class="btns" data-v-8517f9d3><button data-v-8517f9d3>重置全部</button><button data-v-8517f9d3>📋 复制CSS</button></div></div>`);
        } else {
          _push2(`<!---->`);
        }
        _push2(`</div>`);
      }, "body", false, _parent);
    };
  }
});
const _sfc_setup$1 = _sfc_main$1.setup;
_sfc_main$1.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/LayoutDebugPanel.vue");
  return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
const LayoutDebugPanel = /* @__PURE__ */ Object.assign(_export_sfc(_sfc_main$1, [["__scopeId", "data-v-8517f9d3"]]), { __name: "LayoutDebugPanel" });
const intervalError = "[nuxt] `setInterval` should not be used on the server. Consider wrapping it with an `onNuxtReady`, `onBeforeMount` or `onMounted` lifecycle hook, or ensure you only call it in the browser by checking `false`.";
const setInterval = (() => {
  console.error(intervalError);
});
const useGame = () => {
  const route = useRoute();
  const isLocalDevHost = false;
  const debugAccessToken = typeof route.query.debugAccessToken === "string" ? route.query.debugAccessToken : void 0;
  const gameState = ref(null);
  const playerView = ref(null);
  const tingPreview = ref({
    isTing: false,
    winningTiles: []
  });
  const availableActions = ref([]);
  const socket = ref(null);
  const isConnected = ref(false);
  const error = ref(null);
  const leadingBrotherEvent = ref(null);
  const actionApprovalEvent = ref(null);
  const isActionPending = ref(false);
  const roomDismissedReason = ref(null);
  const lastStateChangeAt = ref(0);
  let lastRefreshTriggerAt = 0;
  let pollingTimer = null;
  const startPolling = () => {
    if (pollingTimer) return;
    pollingTimer = setInterval();
  };
  const stopPolling = () => {
    if (pollingTimer) {
      clearInterval(pollingTimer);
      pollingTimer = null;
    }
  };
  const playerId = ref(null);
  const gameId = ref(null);
  const currentPlayer = computed(() => {
    if (!gameState.value || !playerId.value) return null;
    return gameState.value.players.find((p) => p.id === playerId.value);
  });
  const currentRound = computed(() => {
    const raw = Number(gameState.value?.currentRound ?? gameState.value?.roundNumber ?? 1);
    return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 1;
  });
  const fetchGameState = async (gId, pId) => {
    try {
      const response = await $fetch("/mahjong/api/game/state", {
        query: {
          gameId: gId,
          playerId: pId,
          debugAccessToken: typeof route.query.debugAccessToken === "string" ? route.query.debugAccessToken : void 0
        },
        cache: "no-cache"
      });
      if (response?.success) {
        updateState(response.data);
        isConnected.value = true;
        error.value = null;
        const stateData = response.data;
        if (stateData?.game?.phase && stateData.game.phase !== "starting") {
          if (false) ;
        }
      }
    } catch (e) {
      if (e?.statusCode === 404 || e?.status === 404) {
        console.warn("[fetchGameState] 404, retrying in 800ms...");
        await new Promise((r) => setTimeout(r, 800));
        return fetchGameState(gId, pId);
      }
      if (e?.statusCode === 403 || e?.status === 403) {
        console.warn("[fetchGameState] 403, retrying in 800ms...");
        await new Promise((r) => setTimeout(r, 800));
        return fetchGameState(gId, pId);
      }
      console.error("Failed to fetch game state:", e);
    }
  };
  const requestRefreshState = () => {
    const now = Date.now();
    if (now - lastRefreshTriggerAt < 180) return;
    lastRefreshTriggerAt = now;
    void refreshState();
  };
  const connect = async (gId, pId) => {
    gameId.value = gId;
    playerId.value = pId;
    roomDismissedReason.value = null;
    const userName = useCookie("user_name").value || "Player";
    try {
      await fetchGameState(gId, pId);
      startPolling();
      if (debugAccessToken) {
        isConnected.value = true;
        error.value = null;
        return;
      }
      const wsUrl = (void 0).location.origin;
      const transports = isLocalDevHost ? ["polling"] : ["websocket", "polling"];
      socket.value = io(wsUrl, {
        path: "/mahjong/socket.io",
        auth: {
          debugAccessToken,
          roomId: gId,
          playerId: pId
        },
        withCredentials: true,
        transports,
        timeout: 1e4,
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1e3,
        reconnectionDelayMax: 5e3
      });
      socket.value.on("connect", () => {
        console.log("Socket.IO connected:", socket.value?.id, "transport=", socket.value?.io.engine.transport.name);
        isConnected.value = true;
        error.value = null;
        socket.value?.emit("auth:login", {
          userId: pId,
          userName,
          debugAccessToken,
          roomId: gId
        });
        socket.value?.emit("room:join", {
          roomId: gId,
          userId: pId,
          userName,
          debugAccessToken
        });
      });
      socket.value.on("connect_error", (err) => {
        if (err.message?.includes("websocket") && !isConnected.value) return;
        console.warn("Socket connect_error:", err.message, "transport=", socket.value?.io.engine.transport.name);
        if (!gameState.value) {
          isConnected.value = false;
        }
      });
      socket.value.on("disconnect", () => {
        console.log("Socket disconnected", "transport=", socket.value?.io.engine.transport.name);
        if (!gameState.value) {
          isConnected.value = false;
        }
      });
      socket.value.on("room:user-joined", async (data) => {
        console.log("User joined:", data);
        requestRefreshState();
      });
      socket.value.on("room:user-left", async (data) => {
        console.log("User left:", data);
        requestRefreshState();
      });
      socket.value.on("room:error", (data) => {
        console.error("Room error:", data);
        error.value = data.message;
      });
      socket.value.on("room:dismissed", async (payload) => {
        console.warn("Room dismissed:", payload);
        roomDismissedReason.value = payload?.reason || "owner_left";
        error.value = payload?.message || "Room dismissed by host";
        await refreshState();
      });
      socket.value.on("room:owner-disconnected", (data) => {
        console.warn("Owner disconnected, waiting for reconnect...", data);
        error.value = `房主暂时离线，等待重连中（${data?.graceSeconds || 15}秒）...`;
      });
      socket.value.on("room:owner-reconnected", async (data) => {
        console.log("Owner reconnected:", data);
        error.value = null;
        requestRefreshState();
      });
      socket.value.on("game:state-changed", async (data) => {
        console.log("Game state update:", data);
        if (false) ;
        requestRefreshState();
      });
      socket.value.on("gameStateUpdate", async (data) => {
        console.log("GameStateUpdate from server:", data);
        if (false) ;
        requestRefreshState();
      });
      socket.value.on("game:action-received", async (data) => {
        console.log("Action received:", data);
        requestRefreshState();
      });
      socket.value.on("broadcastMessage", (data) => {
        console.log("📢 广播消息:", data);
        (void 0).dispatchEvent(new CustomEvent("mahjong-broadcast", { detail: data }));
      });
      socket.value.on("diceRoll", (data) => {
        console.log("🎲 骰子广播:", data);
        (void 0).dispatchEvent(new CustomEvent("mahjong-dice-roll", { detail: data }));
      });
      socket.value.on("leadingBrother", (data) => {
        console.log("🔥 谢谢带头大哥！", data);
        leadingBrotherEvent.value = data;
        setTimeout(() => {
          leadingBrotherEvent.value = null;
        }, 100);
      });
      socket.value.on("actionApproval", (data) => {
        console.log("⚡ 审批流程:", data);
        actionApprovalEvent.value = data;
      });
    } catch (e) {
      error.value = e.message || "Failed to connect";
    }
  };
  const disconnect = () => {
    stopPolling();
    if (socket.value) {
      socket.value.disconnect();
      socket.value = null;
    }
    isConnected.value = false;
  };
  let isRefreshing = false;
  let refreshQueued = false;
  let lastRefreshAt = 0;
  const DEBOUNCE_MS = 100;
  const refreshState = async () => {
    if (!gameId.value || !playerId.value) return;
    const now = Date.now();
    if (isRefreshing) {
      refreshQueued = true;
      return;
    }
    if (now - lastRefreshAt < DEBOUNCE_MS) {
      refreshQueued = true;
      setTimeout(() => {
        if (refreshQueued) {
          refreshQueued = false;
          refreshState();
        }
      }, DEBOUNCE_MS);
      return;
    }
    isRefreshing = true;
    lastRefreshAt = now;
    try {
      await fetchGameState(gameId.value, playerId.value);
    } catch (e) {
      console.warn("refreshState failed:", e);
    } finally {
      isRefreshing = false;
      if (refreshQueued) {
        refreshQueued = false;
        lastRefreshAt = 0;
        await refreshState();
      }
    }
  };
  const updateState = (data) => {
    gameState.value = data.game;
    playerView.value = data.playerView;
    if (data.tingPreview !== void 0) {
      tingPreview.value = data.tingPreview;
    }
    const oldActions = availableActions.value;
    const newActions = data.availableActions || [];
    availableActions.value = newActions;
    if (JSON.stringify(oldActions.sort()) !== JSON.stringify(newActions.sort())) {
      lastStateChangeAt.value = Date.now();
    }
  };
  const replacePendingAction = (action, extras = {}) => {
    if (!gameState.value || !playerId.value) return;
    const nextPending = (gameState.value.pendingActions || []).filter((pa) => pa.playerId !== playerId.value);
    nextPending.push({
      playerId: playerId.value,
      availableActions: [action],
      expiresAt: Date.now() + 5e3,
      ...extras
    });
    gameState.value = {
      ...gameState.value,
      pendingActions: nextPending
    };
    availableActions.value = [action];
    lastStateChangeAt.value = Date.now();
  };
  const executeAction = async (action, tileId, tileIds, winOptionLabel) => {
    if (!gameId.value || !playerId.value) return false;
    if (gameState.value?.phase === GamePhase.ENDED) return false;
    if (isActionPending.value) return false;
    if (action === "discard" && !availableActions.value.includes(action)) return false;
    isActionPending.value = true;
    try {
      const response = await $fetch("/mahjong/api/game/action", {
        method: "POST",
        body: {
          gameId: gameId.value,
          playerId: playerId.value,
          action,
          type: action,
          tileId,
          tileIds,
          winOptionLabel
        }
      });
      if (response?.success) {
        updateState(response.data);
        return true;
      } else {
        console.error("Action failed:", response);
        return false;
      }
    } catch (e) {
      console.error("Error executing action:", e);
      return false;
    } finally {
      isActionPending.value = false;
    }
  };
  const startGame = async (options) => {
    if (!gameId.value || !playerId.value) return;
    console.log("[startGame] Starting game:", gameId.value);
    try {
      const response = await $fetch("/mahjong/api/game/start", {
        method: "POST",
        body: {
          gameId: gameId.value,
          playerId: playerId.value,
          hesitationWindow: Math.max(1e3, options?.hesitationWindow ?? 5e3),
          dice: options?.fixedDice
        }
      });
      if (response?.success) {
        console.log("[startGame] API success, refreshing state...");
        roomDismissedReason.value = null;
        await refreshState();
        socket.value?.emit("game:state-update", { gameId: gameId.value });
        console.log("[startGame] Done, phase:", gameState.value?.phase);
      } else {
        console.warn("[startGame] API returned non-success:", response);
      }
    } catch (e) {
      console.error("[startGame] Failed:", e);
    }
  };
  const forceRefreshState = async () => {
    if (!gameId.value || !playerId.value) return;
    lastRefreshAt = 0;
    isRefreshing = false;
    await refreshState();
    if (gameState.value?.phase && gameState.value.phase !== "starting" && false) ;
  };
  const refreshTingPreview = async () => {
    if (!gameId.value || !playerId.value) return;
    try {
      const response = await $fetch("/mahjong/api/game/state", {
        query: {
          gameId: gameId.value,
          playerId: playerId.value,
          tingPreview: "true",
          debugAccessToken: typeof route.query.debugAccessToken === "string" ? route.query.debugAccessToken : void 0
        },
        cache: "no-cache"
      });
      if (response?.success) {
        updateState(response.data);
      }
    } catch (e) {
      console.warn("refreshTingPreview failed:", e?.message || e);
    }
  };
  return {
    gameState,
    currentRound,
    currentPlayer,
    tingPreview,
    availableActions,
    isConnected,
    error,
    connect,
    disconnect,
    executeAction,
    startGame,
    refreshState,
    forceRefreshState,
    refreshTingPreview,
    replacePendingAction,
    isActionPending,
    roomDismissedReason,
    lastStateChangeAt,
    leadingBrotherEvent,
    actionApprovalEvent
  };
};
const _isEnabled = ref(true);
const useSound = () => {
  const play = (name) => {
    if (!_isEnabled.value || true) return;
  };
  const setEnabled2 = (enabled) => {
    _isEnabled.value = enabled;
  };
  return {
    play,
    isEnabled: _isEnabled,
    setEnabled: setEnabled2
  };
};
const __vite_glob_1_0 = "" + __buildAssetsURL("yumantang.mJZTBE9s.mp3");
const rootTrackModules = /* @__PURE__ */ Object.assign({});
const bgmTrackModules = /* @__PURE__ */ Object.assign({
  "../../assets/bgm/yumantang.mp3": __vite_glob_1_0
});
const normalizeTrackTitle = (filePath) => {
  const rawName = filePath.split("/").pop() || filePath;
  return rawName.replace(/\.[^.]+$/, "");
};
const buildTrackList = () => {
  const seen = /* @__PURE__ */ new Set();
  return [...Object.entries(rootTrackModules), ...Object.entries(bgmTrackModules)].map(([path, url]) => {
    const fileName = path.split("/").pop() || path;
    return {
      id: path,
      label: normalizeTrackTitle(path),
      title: normalizeTrackTitle(path),
      fileName,
      url,
      path
    };
  }).filter((track) => {
    if (seen.has(track.id)) return false;
    seen.add(track.id);
    return true;
  }).sort((a, b) => a.title.localeCompare(b.title, "zh-Hans-CN"));
};
const _tracks = buildTrackList();
const _enabled = ref(true);
const _loopMode = ref("single");
const _currentTrackId = ref(_tracks[0]?.id || null);
const _volume$1 = ref(0.35);
const _isPlaying = ref(false);
const pickNextTrack = (direction = 1) => {
  if (_tracks.length === 0) return null;
  const currentIndex = Math.max(0, _tracks.findIndex((track) => track.id === _currentTrackId.value));
  const nextIndex = (currentIndex + direction + _tracks.length) % _tracks.length;
  return _tracks[nextIndex];
};
const pickShuffleTrack = () => {
  if (_tracks.length === 0) return null;
  if (_tracks.length === 1) return _tracks[0];
  const pool = _tracks.filter((track) => track.id !== _currentTrackId.value);
  return pool[Math.floor(Math.random() * pool.length)] || _tracks[0];
};
const playCurrentTrack = async () => {
  return;
};
const pauseCurrentTrack = () => {
  return;
};
const setCurrentTrack = async (trackId) => {
  _currentTrackId.value = trackId;
  if (_enabled.value) {
    await playCurrentTrack();
  }
};
const setEnabled = async (enabled) => {
  _enabled.value = enabled;
  if (!_enabled.value) {
    return;
  }
  await playCurrentTrack();
};
const setLoopMode = (mode) => {
  _loopMode.value = mode;
};
const setVolume = (volume) => {
  _volume$1.value = Math.min(1, Math.max(0, volume));
};
const playNextTrack = async () => {
  const nextTrack = _loopMode.value === "shuffle" ? pickShuffleTrack() : pickNextTrack(1);
  if (!nextTrack) return;
  await setCurrentTrack(nextTrack.id);
};
const ensureInitialized = () => {
  return;
};
const useBackgroundMusic = () => {
  const currentTrack = computed(() => _tracks.find((track) => track.id === _currentTrackId.value) || null);
  return {
    tracks: _tracks,
    enabled: _enabled,
    loopMode: _loopMode,
    currentTrackId: _currentTrackId,
    currentTrack,
    volume: _volume$1,
    isPlaying: _isPlaying,
    ensureInitialized,
    setEnabled,
    setTrack: setCurrentTrack,
    setLoopMode,
    setCurrentTrack,
    setVolume,
    play: playCurrentTrack,
    playCurrentTrack,
    pause: pauseCurrentTrack,
    pauseCurrentTrack,
    next: playNextTrack,
    playNextTrack
  };
};
const __vite_glob_0_0 = "" + __buildAssetsURL("feng_east.uZqisK2q.opus");
const __vite_glob_0_1 = "" + __buildAssetsURL("feng_north.AxiNVsdy.opus");
const __vite_glob_0_2 = "" + __buildAssetsURL("feng_south.Ri9b_vQs.opus");
const __vite_glob_0_3 = "" + __buildAssetsURL("feng_west.DgQpKW01.opus");
const __vite_glob_0_4 = "" + __buildAssetsURL("hua_plum.CFaoPjQm.opus");
const __vite_glob_0_5 = "" + __buildAssetsURL("hua_plum.CFaoPjQm.opus");
const __vite_glob_0_6 = "" + __buildAssetsURL("hua_plum.CFaoPjQm.opus");
const __vite_glob_0_7 = "" + __buildAssetsURL("hua_plum.CFaoPjQm.opus");
const __vite_glob_0_8 = "" + __buildAssetsURL("hua_plum.CFaoPjQm.opus");
const __vite_glob_0_9 = "" + __buildAssetsURL("hua_plum.CFaoPjQm.opus");
const __vite_glob_0_10 = "" + __buildAssetsURL("hua_plum.CFaoPjQm.opus");
const __vite_glob_0_11 = "" + __buildAssetsURL("hua_plum.CFaoPjQm.opus");
const __vite_glob_0_12 = "" + __buildAssetsURL("jian_bai.Iab5y6OY.opus");
const __vite_glob_0_13 = "" + __buildAssetsURL("jian_fa.B1-gKhn1.opus");
const __vite_glob_0_14 = "" + __buildAssetsURL("jian_zhong.DvY138rR.opus");
const __vite_glob_0_15 = "" + __buildAssetsURL("tiao_1.DDEJZhTH.opus");
const __vite_glob_0_16 = "" + __buildAssetsURL("tiao_2.DSPcbrf5.opus");
const __vite_glob_0_17 = "" + __buildAssetsURL("tiao_3.7J-eAo-q.opus");
const __vite_glob_0_18 = "" + __buildAssetsURL("tiao_4.Dq8-gKOr.opus");
const __vite_glob_0_19 = "" + __buildAssetsURL("tiao_5.BOmYE6PR.opus");
const __vite_glob_0_20 = "" + __buildAssetsURL("tiao_6.CHpbvBnv.opus");
const __vite_glob_0_21 = "" + __buildAssetsURL("tiao_7.DPGqyZYz.opus");
const __vite_glob_0_22 = "" + __buildAssetsURL("tiao_8.C2wiiFHT.opus");
const __vite_glob_0_23 = "" + __buildAssetsURL("tiao_9.CEok6zfc.opus");
const __vite_glob_0_24 = "" + __buildAssetsURL("tong_1.CZPYQrgF.opus");
const __vite_glob_0_25 = "" + __buildAssetsURL("tong_2.B_O7vUpO.opus");
const __vite_glob_0_26 = "" + __buildAssetsURL("tong_3.CcRoCotK.opus");
const __vite_glob_0_27 = "" + __buildAssetsURL("tong_4.C3YVGwQW.opus");
const __vite_glob_0_28 = "" + __buildAssetsURL("tong_5.K0rUkZNE.opus");
const __vite_glob_0_29 = "" + __buildAssetsURL("tong_6.2_Vj6mnN.opus");
const __vite_glob_0_30 = "" + __buildAssetsURL("tong_7.1x946VFk.opus");
const __vite_glob_0_31 = "" + __buildAssetsURL("tong_8.BJCne9ib.opus");
const __vite_glob_0_32 = "" + __buildAssetsURL("tong_9.Cs28q-m7.opus");
const __vite_glob_0_33 = "" + __buildAssetsURL("wan_1.1nAFOImy.opus");
const __vite_glob_0_34 = "" + __buildAssetsURL("wan_2.DW8q-9Lo.opus");
const __vite_glob_0_35 = "" + __buildAssetsURL("wan_3.BxTfxw_i.opus");
const __vite_glob_0_36 = "" + __buildAssetsURL("wan_4.TODj7-_n.opus");
const __vite_glob_0_37 = "" + __buildAssetsURL("wan_5.YT--6khl.opus");
const __vite_glob_0_38 = "" + __buildAssetsURL("wan_6.BRX2LprN.opus");
const __vite_glob_0_39 = "" + __buildAssetsURL("wan_7.C0Gh1T1U.opus");
const __vite_glob_0_40 = "" + __buildAssetsURL("wan_8.DiNg626P.opus");
const __vite_glob_0_41 = "" + __buildAssetsURL("wan_9.BfN4j14G.opus");
const __vite_glob_0_42 = "" + __buildAssetsURL("buhua.CGHj8oJl.opus");
const __vite_glob_0_43 = "" + __buildAssetsURL("feng_east.CzRzIhe9.mp3");
const __vite_glob_0_44 = "" + __buildAssetsURL("feng_east.CRIuFlcO.opus");
const __vite_glob_0_45 = "" + __buildAssetsURL("feng_north.DZc-8dwB.mp3");
const __vite_glob_0_46 = "" + __buildAssetsURL("feng_north.wkELUyGl.opus");
const __vite_glob_0_47 = "" + __buildAssetsURL("feng_south.7EGSIva3.mp3");
const __vite_glob_0_48 = "" + __buildAssetsURL("feng_south.DGEdF6V5.opus");
const __vite_glob_0_49 = "" + __buildAssetsURL("feng_west.C1ZX8A9u.mp3");
const __vite_glob_0_50 = "" + __buildAssetsURL("feng_west.BCdW5ZET.opus");
const __vite_glob_0_51 = "" + __buildAssetsURL("gang.BklBu3jJ.opus");
const __vite_glob_0_52 = "" + __buildAssetsURL("hua_plum.CO3DCUN4.mp3");
const __vite_glob_0_53 = "" + __buildAssetsURL("hua_plum.sC-hxPB5.opus");
const __vite_glob_0_54 = "" + __buildAssetsURL("hule.B4BElX1s.opus");
const __vite_glob_0_55 = "" + __buildAssetsURL("jian_bai.BHegukVZ.mp3");
const __vite_glob_0_56 = "" + __buildAssetsURL("jian_bai.CD6nKM-d.opus");
const __vite_glob_0_57 = "" + __buildAssetsURL("jian_fa.DTdwqlVX.mp3");
const __vite_glob_0_58 = "" + __buildAssetsURL("jian_fa.755d4JyA.opus");
const __vite_glob_0_59 = "" + __buildAssetsURL("jian_zhong.Cb46TrrA.mp3");
const __vite_glob_0_60 = "" + __buildAssetsURL("jian_zhong.DaTpXEns.opus");
const __vite_glob_0_61 = "" + __buildAssetsURL("juyi.CSxMOkgl.opus");
const __vite_glob_0_62 = "" + __buildAssetsURL("peng.xEpL-68t.opus");
const __vite_glob_0_63 = "" + __buildAssetsURL("tiao_1.BLo_3hMf.mp3");
const __vite_glob_0_64 = "" + __buildAssetsURL("tiao_1.c4f4id4C.opus");
const __vite_glob_0_65 = "" + __buildAssetsURL("tiao_2.CQtT_KUa.mp3");
const __vite_glob_0_66 = "" + __buildAssetsURL("tiao_2.CgFpgDzh.opus");
const __vite_glob_0_67 = "" + __buildAssetsURL("tiao_3.BLQWEzT6.mp3");
const __vite_glob_0_68 = "" + __buildAssetsURL("tiao_3.8pwnzyg2.opus");
const __vite_glob_0_69 = "" + __buildAssetsURL("tiao_4.DJzOz35C.mp3");
const __vite_glob_0_70 = "" + __buildAssetsURL("tiao_4.BbJGzL04.opus");
const __vite_glob_0_71 = "" + __buildAssetsURL("tiao_5.Cc8R8yO3.mp3");
const __vite_glob_0_72 = "" + __buildAssetsURL("tiao_5.CGV3FC6O.opus");
const __vite_glob_0_73 = "" + __buildAssetsURL("tiao_6.BpcYGKke.mp3");
const __vite_glob_0_74 = "" + __buildAssetsURL("tiao_6.D9VN1aSB.opus");
const __vite_glob_0_75 = "" + __buildAssetsURL("tiao_7.DTjSBKeC.mp3");
const __vite_glob_0_76 = "" + __buildAssetsURL("tiao_7.XRdJB9BM.opus");
const __vite_glob_0_77 = "" + __buildAssetsURL("tiao_8.Bc6ytb-W.mp3");
const __vite_glob_0_78 = "" + __buildAssetsURL("tiao_8.CrO8gyFY.opus");
const __vite_glob_0_79 = "" + __buildAssetsURL("tiao_9.24y5B9YB.mp3");
const __vite_glob_0_80 = "" + __buildAssetsURL("tiao_9.BAy0cLdi.opus");
const __vite_glob_0_81 = "" + __buildAssetsURL("tong_1.BrSaCRfy.mp3");
const __vite_glob_0_82 = "" + __buildAssetsURL("tong_1.ASLyqSt9.opus");
const __vite_glob_0_83 = "" + __buildAssetsURL("tong_2.5-6V8nbk.mp3");
const __vite_glob_0_84 = "" + __buildAssetsURL("tong_2.CvDa6Xy-.opus");
const __vite_glob_0_85 = "" + __buildAssetsURL("tong_3.DEKrXwIH.mp3");
const __vite_glob_0_86 = "" + __buildAssetsURL("tong_3.7dWHJco1.opus");
const __vite_glob_0_87 = "" + __buildAssetsURL("tong_4.BA-09TSc.mp3");
const __vite_glob_0_88 = "" + __buildAssetsURL("tong_4.BBNfpoqv.opus");
const __vite_glob_0_89 = "" + __buildAssetsURL("tong_5.CCBG8Jzr.mp3");
const __vite_glob_0_90 = "" + __buildAssetsURL("tong_5.DjIHYWRN.opus");
const __vite_glob_0_91 = "" + __buildAssetsURL("tong_6.CsFDWZ-C.mp3");
const __vite_glob_0_92 = "" + __buildAssetsURL("tong_6.h-3Ur0DZ.opus");
const __vite_glob_0_93 = "" + __buildAssetsURL("tong_7.CFAtk4L8.mp3");
const __vite_glob_0_94 = "" + __buildAssetsURL("tong_7.D6zOYqa-.opus");
const __vite_glob_0_95 = "" + __buildAssetsURL("tong_8.CyV30bgV.mp3");
const __vite_glob_0_96 = "" + __buildAssetsURL("tong_8.DI4P-TYv.opus");
const __vite_glob_0_97 = "" + __buildAssetsURL("tong_9.CSEeg-y2.mp3");
const __vite_glob_0_98 = "" + __buildAssetsURL("tong_9.BjK4bqrK.opus");
const __vite_glob_0_99 = "" + __buildAssetsURL("wan_1.DPjPxgRG.mp3");
const __vite_glob_0_100 = "" + __buildAssetsURL("wan_1.Bvg8q0rV.opus");
const __vite_glob_0_101 = "" + __buildAssetsURL("wan_2.BcPMsyaK.mp3");
const __vite_glob_0_102 = "" + __buildAssetsURL("wan_2.Cyne5nH2.opus");
const __vite_glob_0_103 = "" + __buildAssetsURL("wan_3.89_kAwQg.mp3");
const __vite_glob_0_104 = "" + __buildAssetsURL("wan_3.hVZJRN_c.opus");
const __vite_glob_0_105 = "" + __buildAssetsURL("wan_4.BiE_eVsr.mp3");
const __vite_glob_0_106 = "" + __buildAssetsURL("wan_4.C3vslbpq.opus");
const __vite_glob_0_107 = "" + __buildAssetsURL("wan_5.hXGrZyJz.mp3");
const __vite_glob_0_108 = "" + __buildAssetsURL("wan_5.CprO9R5U.opus");
const __vite_glob_0_109 = "" + __buildAssetsURL("wan_6.BD43pl79.mp3");
const __vite_glob_0_110 = "" + __buildAssetsURL("wan_6.C1QgcIYa.opus");
const __vite_glob_0_111 = "" + __buildAssetsURL("wan_7.BgEKrvdE.mp3");
const __vite_glob_0_112 = "" + __buildAssetsURL("wan_7.JkD_ixn-.opus");
const __vite_glob_0_113 = "" + __buildAssetsURL("wan_8.CY7LlOce.mp3");
const __vite_glob_0_114 = "" + __buildAssetsURL("wan_8.ez5OIcZ4.opus");
const __vite_glob_0_115 = "" + __buildAssetsURL("wan_9.ClSn2Z44.mp3");
const __vite_glob_0_116 = "" + __buildAssetsURL("wan_9.CvmQaiCC.opus");
const __vite_glob_0_117 = "" + __buildAssetsURL("wochi.DDkp4oY9.opus");
const __vite_glob_0_118 = "" + __buildAssetsURL("zaofan.DbQ3TqLB.opus");
const __vite_glob_0_119 = "" + __buildAssetsURL("zimo.OMoUfJn_.opus");
const VOICE_TEXT_MAP = {
  feng_east: "东",
  feng_south: "南",
  feng_west: "西",
  feng_north: "北",
  jian_zhong: "中",
  jian_fa: "发",
  jian_bai: "白板",
  hua_plum: "花",
  wan_1: "一万",
  wan_2: "二万",
  wan_3: "三万",
  wan_4: "四万",
  wan_5: "五万",
  wan_6: "六万",
  wan_7: "七万",
  wan_8: "八万",
  wan_9: "九万",
  tong_1: "一筒",
  tong_2: "二筒",
  tong_3: "三筒",
  tong_4: "四筒",
  tong_5: "五筒",
  tong_6: "六筒",
  tong_7: "七筒",
  tong_8: "八筒",
  tong_9: "九筒",
  tiao_1: "一条",
  tiao_2: "二条",
  tiao_3: "三条",
  tiao_4: "四条",
  tiao_5: "五条",
  tiao_6: "六条",
  tiao_7: "七条",
  tiao_8: "八条",
  tiao_9: "九条"
};
const audioModules = /* @__PURE__ */ Object.assign({
  "../../assets/voice/baihua/feng_east.opus": __vite_glob_0_0,
  "../../assets/voice/baihua/feng_north.opus": __vite_glob_0_1,
  "../../assets/voice/baihua/feng_south.opus": __vite_glob_0_2,
  "../../assets/voice/baihua/feng_west.opus": __vite_glob_0_3,
  "../../assets/voice/baihua/hua_autumn.opus": __vite_glob_0_4,
  "../../assets/voice/baihua/hua_bamboo.opus": __vite_glob_0_5,
  "../../assets/voice/baihua/hua_chrysanthemum.opus": __vite_glob_0_6,
  "../../assets/voice/baihua/hua_orchid.opus": __vite_glob_0_7,
  "../../assets/voice/baihua/hua_plum.opus": __vite_glob_0_8,
  "../../assets/voice/baihua/hua_spring.opus": __vite_glob_0_9,
  "../../assets/voice/baihua/hua_summer.opus": __vite_glob_0_10,
  "../../assets/voice/baihua/hua_winter.opus": __vite_glob_0_11,
  "../../assets/voice/baihua/jian_bai.opus": __vite_glob_0_12,
  "../../assets/voice/baihua/jian_fa.opus": __vite_glob_0_13,
  "../../assets/voice/baihua/jian_zhong.opus": __vite_glob_0_14,
  "../../assets/voice/baihua/tiao_1.opus": __vite_glob_0_15,
  "../../assets/voice/baihua/tiao_2.opus": __vite_glob_0_16,
  "../../assets/voice/baihua/tiao_3.opus": __vite_glob_0_17,
  "../../assets/voice/baihua/tiao_4.opus": __vite_glob_0_18,
  "../../assets/voice/baihua/tiao_5.opus": __vite_glob_0_19,
  "../../assets/voice/baihua/tiao_6.opus": __vite_glob_0_20,
  "../../assets/voice/baihua/tiao_7.opus": __vite_glob_0_21,
  "../../assets/voice/baihua/tiao_8.opus": __vite_glob_0_22,
  "../../assets/voice/baihua/tiao_9.opus": __vite_glob_0_23,
  "../../assets/voice/baihua/tong_1.opus": __vite_glob_0_24,
  "../../assets/voice/baihua/tong_2.opus": __vite_glob_0_25,
  "../../assets/voice/baihua/tong_3.opus": __vite_glob_0_26,
  "../../assets/voice/baihua/tong_4.opus": __vite_glob_0_27,
  "../../assets/voice/baihua/tong_5.opus": __vite_glob_0_28,
  "../../assets/voice/baihua/tong_6.opus": __vite_glob_0_29,
  "../../assets/voice/baihua/tong_7.opus": __vite_glob_0_30,
  "../../assets/voice/baihua/tong_8.opus": __vite_glob_0_31,
  "../../assets/voice/baihua/tong_9.opus": __vite_glob_0_32,
  "../../assets/voice/baihua/wan_1.opus": __vite_glob_0_33,
  "../../assets/voice/baihua/wan_2.opus": __vite_glob_0_34,
  "../../assets/voice/baihua/wan_3.opus": __vite_glob_0_35,
  "../../assets/voice/baihua/wan_4.opus": __vite_glob_0_36,
  "../../assets/voice/baihua/wan_5.opus": __vite_glob_0_37,
  "../../assets/voice/baihua/wan_6.opus": __vite_glob_0_38,
  "../../assets/voice/baihua/wan_7.opus": __vite_glob_0_39,
  "../../assets/voice/baihua/wan_8.opus": __vite_glob_0_40,
  "../../assets/voice/baihua/wan_9.opus": __vite_glob_0_41,
  "../../assets/voice/bingtang/buhua.opus": __vite_glob_0_42,
  "../../assets/voice/bingtang/feng_east.mp3": __vite_glob_0_43,
  "../../assets/voice/bingtang/feng_east.opus": __vite_glob_0_44,
  "../../assets/voice/bingtang/feng_north.mp3": __vite_glob_0_45,
  "../../assets/voice/bingtang/feng_north.opus": __vite_glob_0_46,
  "../../assets/voice/bingtang/feng_south.mp3": __vite_glob_0_47,
  "../../assets/voice/bingtang/feng_south.opus": __vite_glob_0_48,
  "../../assets/voice/bingtang/feng_west.mp3": __vite_glob_0_49,
  "../../assets/voice/bingtang/feng_west.opus": __vite_glob_0_50,
  "../../assets/voice/bingtang/gang.opus": __vite_glob_0_51,
  "../../assets/voice/bingtang/hua_plum.mp3": __vite_glob_0_52,
  "../../assets/voice/bingtang/hua_plum.opus": __vite_glob_0_53,
  "../../assets/voice/bingtang/hule.opus": __vite_glob_0_54,
  "../../assets/voice/bingtang/jian_bai.mp3": __vite_glob_0_55,
  "../../assets/voice/bingtang/jian_bai.opus": __vite_glob_0_56,
  "../../assets/voice/bingtang/jian_fa.mp3": __vite_glob_0_57,
  "../../assets/voice/bingtang/jian_fa.opus": __vite_glob_0_58,
  "../../assets/voice/bingtang/jian_zhong.mp3": __vite_glob_0_59,
  "../../assets/voice/bingtang/jian_zhong.opus": __vite_glob_0_60,
  "../../assets/voice/bingtang/juyi.opus": __vite_glob_0_61,
  "../../assets/voice/bingtang/peng.opus": __vite_glob_0_62,
  "../../assets/voice/bingtang/tiao_1.mp3": __vite_glob_0_63,
  "../../assets/voice/bingtang/tiao_1.opus": __vite_glob_0_64,
  "../../assets/voice/bingtang/tiao_2.mp3": __vite_glob_0_65,
  "../../assets/voice/bingtang/tiao_2.opus": __vite_glob_0_66,
  "../../assets/voice/bingtang/tiao_3.mp3": __vite_glob_0_67,
  "../../assets/voice/bingtang/tiao_3.opus": __vite_glob_0_68,
  "../../assets/voice/bingtang/tiao_4.mp3": __vite_glob_0_69,
  "../../assets/voice/bingtang/tiao_4.opus": __vite_glob_0_70,
  "../../assets/voice/bingtang/tiao_5.mp3": __vite_glob_0_71,
  "../../assets/voice/bingtang/tiao_5.opus": __vite_glob_0_72,
  "../../assets/voice/bingtang/tiao_6.mp3": __vite_glob_0_73,
  "../../assets/voice/bingtang/tiao_6.opus": __vite_glob_0_74,
  "../../assets/voice/bingtang/tiao_7.mp3": __vite_glob_0_75,
  "../../assets/voice/bingtang/tiao_7.opus": __vite_glob_0_76,
  "../../assets/voice/bingtang/tiao_8.mp3": __vite_glob_0_77,
  "../../assets/voice/bingtang/tiao_8.opus": __vite_glob_0_78,
  "../../assets/voice/bingtang/tiao_9.mp3": __vite_glob_0_79,
  "../../assets/voice/bingtang/tiao_9.opus": __vite_glob_0_80,
  "../../assets/voice/bingtang/tong_1.mp3": __vite_glob_0_81,
  "../../assets/voice/bingtang/tong_1.opus": __vite_glob_0_82,
  "../../assets/voice/bingtang/tong_2.mp3": __vite_glob_0_83,
  "../../assets/voice/bingtang/tong_2.opus": __vite_glob_0_84,
  "../../assets/voice/bingtang/tong_3.mp3": __vite_glob_0_85,
  "../../assets/voice/bingtang/tong_3.opus": __vite_glob_0_86,
  "../../assets/voice/bingtang/tong_4.mp3": __vite_glob_0_87,
  "../../assets/voice/bingtang/tong_4.opus": __vite_glob_0_88,
  "../../assets/voice/bingtang/tong_5.mp3": __vite_glob_0_89,
  "../../assets/voice/bingtang/tong_5.opus": __vite_glob_0_90,
  "../../assets/voice/bingtang/tong_6.mp3": __vite_glob_0_91,
  "../../assets/voice/bingtang/tong_6.opus": __vite_glob_0_92,
  "../../assets/voice/bingtang/tong_7.mp3": __vite_glob_0_93,
  "../../assets/voice/bingtang/tong_7.opus": __vite_glob_0_94,
  "../../assets/voice/bingtang/tong_8.mp3": __vite_glob_0_95,
  "../../assets/voice/bingtang/tong_8.opus": __vite_glob_0_96,
  "../../assets/voice/bingtang/tong_9.mp3": __vite_glob_0_97,
  "../../assets/voice/bingtang/tong_9.opus": __vite_glob_0_98,
  "../../assets/voice/bingtang/wan_1.mp3": __vite_glob_0_99,
  "../../assets/voice/bingtang/wan_1.opus": __vite_glob_0_100,
  "../../assets/voice/bingtang/wan_2.mp3": __vite_glob_0_101,
  "../../assets/voice/bingtang/wan_2.opus": __vite_glob_0_102,
  "../../assets/voice/bingtang/wan_3.mp3": __vite_glob_0_103,
  "../../assets/voice/bingtang/wan_3.opus": __vite_glob_0_104,
  "../../assets/voice/bingtang/wan_4.mp3": __vite_glob_0_105,
  "../../assets/voice/bingtang/wan_4.opus": __vite_glob_0_106,
  "../../assets/voice/bingtang/wan_5.mp3": __vite_glob_0_107,
  "../../assets/voice/bingtang/wan_5.opus": __vite_glob_0_108,
  "../../assets/voice/bingtang/wan_6.mp3": __vite_glob_0_109,
  "../../assets/voice/bingtang/wan_6.opus": __vite_glob_0_110,
  "../../assets/voice/bingtang/wan_7.mp3": __vite_glob_0_111,
  "../../assets/voice/bingtang/wan_7.opus": __vite_glob_0_112,
  "../../assets/voice/bingtang/wan_8.mp3": __vite_glob_0_113,
  "../../assets/voice/bingtang/wan_8.opus": __vite_glob_0_114,
  "../../assets/voice/bingtang/wan_9.mp3": __vite_glob_0_115,
  "../../assets/voice/bingtang/wan_9.opus": __vite_glob_0_116,
  "../../assets/voice/bingtang/wochi.opus": __vite_glob_0_117,
  "../../assets/voice/bingtang/zaofan.opus": __vite_glob_0_118,
  "../../assets/voice/bingtang/zimo.opus": __vite_glob_0_119
});
const schemeEntries = Object.entries(audioModules).map(([path, url]) => {
  const match = path.match(/\.\.\/\.\.\/assets\/voice\/([^/]+)\/([^/.]+)\.(mp3|opus)$/);
  if (!match) return null;
  const [, scheme, key, ext] = match;
  return { scheme, key, ext, url };
}).filter(Boolean);
const buildManifest = (scheme) => {
  const grouped = /* @__PURE__ */ new Map();
  for (const entry of schemeEntries) {
    if (entry.scheme !== scheme) continue;
    const current = grouped.get(entry.key) || { key: entry.key, text: VOICE_TEXT_MAP[entry.key] || entry.key };
    if (entry.ext === "mp3") current.mp3 = entry.url;
    if (entry.ext === "opus") current.opus = entry.url;
    grouped.set(entry.key, current);
  }
  const tiles = [...grouped.values()].filter((item) => !!(item.mp3 || item.opus)).sort((a, b) => a.key.localeCompare(b.key, "zh-CN"));
  return {
    voice: scheme === "baihua" ? "白桦" : "冰糖",
    tiles
  };
};
const _currentScheme = ref("bingtang");
const _manifest = ref(null);
const _audioMap = ref(/* @__PURE__ */ new Map());
const _volume = ref(0.5);
Promise.resolve();
const primeVoiceAudio = () => {
  return;
};
const setVoiceVolume = (volume) => {
  const normalized = Number.isFinite(volume) ? Math.min(1, Math.max(0, volume)) : 0.85;
  _volume.value = normalized;
};
const loadVoiceScheme = async (scheme) => {
  try {
    const manifest = buildManifest(scheme);
    _manifest.value = manifest;
    _currentScheme.value = scheme;
    const map = /* @__PURE__ */ new Map();
    for (const tile of manifest.tiles) {
      if (tile.mp3) map.set(tile.key, tile.mp3);
      else if (tile.opus) map.set(tile.key, tile.opus);
    }
    _audioMap.value = map;
    console.info(`[VoiceTile] Loaded scheme="${scheme}" voice="${manifest.voice}" tiles=${manifest.tiles.length}`);
  } catch (e) {
    console.error(`[VoiceTile] Failed to load scheme ${scheme}:`, e);
  }
};
const playVoiceAction = (action) => {
  return;
};
const playVoiceTile = (suit, value) => {
  return;
};
const preloadAllTiles = async () => {
  const urls = [..._audioMap.value.values()];
  urls.forEach((url) => {
    const link = (void 0).createElement("link");
    link.rel = "preload";
    link.as = "audio";
    link.href = url;
    (void 0).head.appendChild(link);
  });
};
const useVoiceTile = () => {
  return {
    currentScheme: _currentScheme,
    currentVoiceName: computed(() => _manifest.value?.voice ?? _currentScheme.value),
    currentVoiceVolume: computed(() => _volume.value),
    loadVoiceScheme,
    playVoiceTile,
    playVoiceAction,
    preloadAllTiles,
    primeVoiceAudio,
    setVoiceVolume
  };
};
function buildDiscardGuardSnapshot(input) {
  return {
    activePosition: input.activePosition,
    currentPlayerId: input.currentPlayerId,
    concealedCount: input.concealedCount,
    discardPileLength: input.discardPileLength,
    pendingActionsCount: input.pendingActionsCount,
    availableActionsKey: [...input.availableActions].sort().join(",")
  };
}
function shouldReleasePendingDiscardGuard(previous, next, isMyTurn) {
  if (!previous) return true;
  const discardStillAvailable = next.availableActionsKey.split(",").includes(ActionType.DISCARD);
  if (!isMyTurn || !discardStillAvailable) return true;
  return previous.activePosition !== next.activePosition || previous.currentPlayerId !== next.currentPlayerId || previous.concealedCount !== next.concealedCount || previous.discardPileLength !== next.discardPileLength || previous.pendingActionsCount !== next.pendingActionsCount || previous.availableActionsKey !== next.availableActionsKey;
}
function collectClaimedDiscardIds(players) {
  const ids = /* @__PURE__ */ new Set();
  for (const player of players || []) {
    for (const meld of player.hand?.exposedMelds || []) {
      if (meld?.sourceTileId) ids.add(meld.sourceTileId);
    }
  }
  return ids;
}
function filterVisibleDiscards(discardedTiles, claimedDiscardIds) {
  return (discardedTiles || []).filter((tile) => !claimedDiscardIds.has(tile.id));
}
const TURN_TIMEOUT_SEC = 60;
const dragDiscardThresholdPx = 56;
const DISCARD_VOICE_DEDUP_MS = 4e3;
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "[roomId]",
  __ssrInlineRender: true,
  setup(__props) {
    const getPendingPlayerIdForRoom = (room) => {
      return "";
    };
    const route = useRoute();
    useRouter();
    const roomId = computed(() => String(route.params.roomId || ""));
    const playerId = computed(() => {
      const routePlayerId = String(route.query.playerId || "");
      if (routePlayerId) return routePlayerId;
      return getPendingPlayerIdForRoom(roomId.value);
    });
    useCookie("user_name");
    const isAdmin = useCookie("is_admin");
    const isAdminUser = computed(() => isAdmin.value === "true" || isAdmin.value === true);
    const isSpectator = computed(() => {
      return route.query.spectator === "1" || route.query.spectator === "true";
    });
    const tingPreviewEnabled = ref(false);
    computed(() => {
      if (!tingPreviewEnabled.value) return "未启用";
      if (!tingPreview.value) return "...";
      const winningTiles = tingPreview.value.winningTiles || [];
      if (winningTiles.length > 0) return "已听牌";
      return "未听牌";
    });
    const {
      gameState,
      currentPlayer,
      currentRound,
      tingPreview,
      availableActions,
      isConnected,
      executeAction,
      startGame,
      refreshState,
      forceRefreshState,
      isActionPending,
      roomDismissedReason,
      lastStateChangeAt,
      leadingBrotherEvent,
      actionApprovalEvent
    } = useGame();
    const { play: playSound, isEnabled: soundEnabled } = useSound();
    const {
      tracks: bgmTracks,
      enabled: bgmEnabled,
      loopMode: bgmLoopMode,
      currentTrackId: bgmCurrentTrackId,
      volume: bgmVolume,
      isPlaying: bgmIsPlaying
    } = useBackgroundMusic();
    const bgmVolumePercent = computed(() => Math.round((bgmVolume.value ?? 0.5) * 100));
    const voiceVolumePercent = computed(() => Math.round((currentVoiceVolume.value ?? 0.85) * 100));
    const {
      currentScheme,
      currentVoiceVolume,
      playVoiceTile: playVoiceTile2,
      playVoiceAction: playVoiceAction2
    } = useVoiceTile();
    const showAllCards = ref(false);
    const shouldRevealOpponents = computed(() => showAllCards.value);
    const initialViewport = { width: 1024, height: 768 };
    const viewportWidth = ref(initialViewport.width);
    const viewportHeight = ref(initialViewport.height);
    const isPortrait = ref(initialViewport.height >= initialViewport.width);
    const shortSide = computed(() => Math.min(viewportWidth.value, viewportHeight.value));
    const mobileScale = computed(() => {
      if (shortSide.value <= 0) return 1;
      const ratio = 1200 / shortSide.value;
      return Math.min(1, ratio);
    });
    const isMobileViewport = computed(() => shortSide.value <= 1600);
    const shouldRotateView = computed(() => isPortrait.value && isMobileViewport.value && shortSide.value <= 768);
    const isMobileLandscapeMode = computed(() => !isPortrait.value && isMobileViewport.value);
    const mobileLayoutStyle = computed(() => {
      if (!isMobileViewport) return {};
      const s = mobileScale.value;
      const ratio = shortSide.value / 1200;
      const clamped = Math.max(0.75, Math.min(1, ratio));
      return {
        "--mobile-scale": s.toFixed(3),
        "--other-tile-scale": clamped.toFixed(3)
      };
    });
    const debugViewport = computed(() => {
      return `W:${viewportWidth.value} H:${viewportHeight.value} short:${shortSide.value} scale:${mobileScale.value.toFixed(4)} mobile:${isMobileViewport.value} mode:${isMobileLandscapeMode.value ? "landscape" : shouldRotateView.value ? "rotate" : "desktop"} dpr:${"?"}`;
    });
    const nowTs = ref(Date.now());
    const actionButtonsVisibleUntil = ref(0);
    const isGameStarting = ref(false);
    const showDiceOverlay = ref(false);
    const diceValues = ref([1, 1]);
    const hasDicePreview = ref(false);
    const diceRollTriggerKey = ref(0);
    const showDoubleReminder = ref(false);
    const flowerReplacementNotice = ref(null);
    const showLiangShanOverlay = ref(false);
    const getActionWindowMs = (state) => {
      const hw = state?.hesitationWindow;
      return typeof hw === "number" && hw > 0 ? hw : 5e3;
    };
    const turnTimer = ref(TURN_TIMEOUT_SEC);
    const turnTimerActive = ref(false);
    let turnTimerInterval = null;
    const isAIControlled = ref(false);
    const isTopBarCollapsed = ref(true);
    const showSettings = ref(false);
    const settingsBtnEl = ref(null);
    ref(null);
    const settingsPanelTop = ref(0);
    const settingsPanelLeft = ref(0);
    const showDebugPanel = ref(false);
    const tableTheme = ref("classic-green");
    const tileBackScheme = ref(0);
    const discardMode = ref("double_tap");
    const playWhoosh = () => {
      try {
        const ctx = new ((void 0).AudioContext || (void 0).webkitAudioContext)();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(880, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.18);
        gainNode.gain.setValueAtTime(0.12, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(1e-3, ctx.currentTime + 0.18);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.18);
        setTimeout(() => ctx.close(), 250);
      } catch {
      }
    };
    const updateSettingsPosition = () => {
      if (!settingsBtnEl.value) return;
      const rect = settingsBtnEl.value.getBoundingClientRect();
      settingsPanelTop.value = rect.bottom + 8;
      settingsPanelLeft.value = rect.right - 300;
    };
    const stopTurnTimer = () => {
      turnTimerActive.value = false;
      turnTimer.value = TURN_TIMEOUT_SEC;
      if (turnTimerInterval) {
        clearInterval(turnTimerInterval);
        turnTimerInterval = null;
      }
    };
    const startTurnTimer = () => {
      stopTurnTimer();
      turnTimer.value = TURN_TIMEOUT_SEC;
      turnTimerActive.value = true;
      turnTimerInterval = setInterval();
    };
    const settingsPanelStyle = computed(() => ({
      top: `${settingsPanelTop.value}px`,
      left: `${settingsPanelLeft.value}px`
    }));
    watch(isAdminUser, (next) => {
      if (!next && showAllCards.value) {
        showAllCards.value = false;
      }
    });
    const isHiddenTile = (tile) => String(tile?.id || "").startsWith("hidden-") || tile?.value === 0;
    const isOpponentHandRevealed = (player) => {
      if (!player || player.id === currentPlayer.value?.id) return false;
      const hand = player.hand?.concealedTiles || [];
      return hand.length > 0 && hand.some((tile) => !isHiddenTile(tile));
    };
    const hiddenHandCache = /* @__PURE__ */ new Map();
    const hiddenHandLengthCache = /* @__PURE__ */ new Map();
    const stableArrayCache = /* @__PURE__ */ new Map();
    const reuseStableArray = (cacheKey, signature, createValue) => {
      const cached = stableArrayCache.get(cacheKey);
      if (cached && cached.signature === signature) return cached.value;
      const nextValue = createValue();
      stableArrayCache.set(cacheKey, { signature, value: nextValue });
      return nextValue;
    };
    const tileIdSignature = (tiles) => (tiles || []).map((tile) => tile?.id || "").join("|");
    const meldSignature = (melds) => (melds || []).map((meld) => [
      meld?.type || "",
      meld?.sourceTileId || "",
      meld?.sourcePosition ?? "",
      meld?.replacementDone ? "1" : "0",
      meld?.isConcealed ? "1" : "0",
      tileIdSignature(meld?.tiles)
    ].join(":")).join("|");
    const getStableOpponentHand = (player) => {
      if (!player) return [];
      const hand = player.hand?.concealedTiles || [];
      const cachedLength = hiddenHandLengthCache.get(player.id) ?? 0;
      if (isOpponentHandRevealed(player)) {
        hiddenHandLengthCache.set(player.id, hand.length);
        return reuseStableArray(`revealed-hand:${player.id}`, tileIdSignature(hand), () => hand);
      }
      const effectiveLength = hand.length > 0 ? hand.length : cachedLength;
      if (effectiveLength > 0) {
        hiddenHandLengthCache.set(player.id, effectiveLength);
      }
      const cacheKey = `${player.id}:${effectiveLength}`;
      const cached = hiddenHandCache.get(cacheKey);
      if (cached) return cached;
      const stableHiddenHand = Array.from({ length: effectiveLength }, (_, index) => ({
        id: `stable-hidden-${player.id}-${index}`,
        suit: "wan",
        value: 0
      }));
      hiddenHandCache.set(cacheKey, stableHiddenHand);
      return stableHiddenHand;
    };
    watch(showSettings, (open) => {
      if (open) nextTick(updateSettingsPosition);
      else playWhoosh();
    });
    watch(discardMode, (mode) => {
      return;
    });
    ref([]);
    ref(null);
    const hesitationWindow = computed(() => Math.max(1e3, Number(gameState.value?.hesitationWindow ?? 5e3)));
    const currentFreezeUntil = computed(() => Number(gameState.value?._freezeUntil ?? 0));
    const playerHand = computed(() => currentPlayer.value?.hand?.concealedTiles || []);
    const playerMelds = computed(() => currentPlayer.value?.hand?.exposedMelds || []);
    const topPlayer = computed(() => {
      if (!gameState.value || currentPlayer.value?.position === void 0) return null;
      return gameState.value.players.find((player) => player.position === (currentPlayer.value.position + 2) % 4) || null;
    });
    const leftPlayer = computed(() => {
      if (!gameState.value || currentPlayer.value?.position === void 0) return null;
      return gameState.value.players.find((player) => player.position === (currentPlayer.value.position + 3) % 4) || null;
    });
    const rightPlayer = computed(() => {
      if (!gameState.value || currentPlayer.value?.position === void 0) return null;
      return gameState.value.players.find((player) => player.position === (currentPlayer.value.position + 1) % 4) || null;
    });
    const remainingTileCount = computed(() => gameState.value?.wall?.length || 0);
    const claimedDiscardIds = computed(() => collectClaimedDiscardIds(gameState.value?.players));
    const getStablePlayerMelds = (player) => {
      if (!player) return [];
      const melds = player.hand?.exposedMelds || [];
      return reuseStableArray(`melds:${player.id}`, meldSignature(melds), () => melds);
    };
    const getOpponentAreaMemoKey = (player) => {
      if (!player) return "none";
      const hand = player.hand?.concealedTiles || [];
      const cachedLength = hiddenHandLengthCache.get(player.id) ?? 0;
      const handKey = isOpponentHandRevealed(player) ? `revealed:${tileIdSignature(hand)}` : `hidden:${hand.length > 0 ? hand.length : cachedLength}`;
      return [
        player.id,
        handKey,
        meldSignature(player.hand?.exposedMelds || [])
      ].join("|");
    };
    const getVisiblePlayerDiscards = (player) => {
      if (!player) return [];
      const visible = filterVisibleDiscards(player.hand?.discardedTiles, claimedDiscardIds.value);
      return reuseStableArray(`discards:${player.id}`, tileIdSignature(visible), () => visible);
    };
    const globalLatestVisibleDiscardId = computed(() => {
      const pile = filterVisibleDiscards(gameState.value?.discardPile, claimedDiscardIds.value);
      return pile.length > 0 ? pile[pile.length - 1]?.id || null : null;
    });
    const getPlayerLatestHighlightedDiscardId = (player) => {
      const latestId = globalLatestVisibleDiscardId.value;
      if (!player || !latestId) return null;
      const visible = getVisiblePlayerDiscards(player);
      return visible.some((tile) => tile.id === latestId) ? latestId : null;
    };
    const selfLatestDiscardId = computed(() => getPlayerLatestHighlightedDiscardId(currentPlayer.value));
    const northLatestDiscardId = computed(() => getPlayerLatestHighlightedDiscardId(topPlayer.value));
    const westLatestDiscardId = computed(() => getPlayerLatestHighlightedDiscardId(leftPlayer.value));
    const eastLatestDiscardId = computed(() => getPlayerLatestHighlightedDiscardId(rightPlayer.value));
    const playerDiscards = computed(() => {
      if (isSpectator.value && spectatingId.value) {
        const targetPlayer = gameState.value?.players?.find((p) => p.id === spectatingId.value);
        if (targetPlayer) return getVisiblePlayerDiscards(targetPlayer);
      }
      return getVisiblePlayerDiscards(currentPlayer.value);
    });
    const roundDisplay = computed(() => `第${currentRound.value}局`);
    const getDiceRoundMultiplier = (dice1, dice2) => {
      const isDouble = dice1 === dice2;
      const isOneFourCombo = dice1 === 1 && dice2 === 4 || dice1 === 4 && dice2 === 1;
      if (isDouble) {
        if (dice1 === 1 || dice1 === 4) return 4;
        return 2;
      }
      if (isOneFourCombo) return 2;
      return 1;
    };
    const effectiveMaxRolls = computed(() => {
      const raw = Number(gameState.value?.diceRollCount ?? route.query.dice ?? 2);
      return Number.isFinite(raw) && raw > 0 ? Math.max(1, Math.floor(raw)) : 2;
    });
    const roundMultiplier = computed(() => {
      const actualRound = Number(gameState.value?.roundMultiplier ?? 0);
      if (actualRound > 0) return actualRound;
      if (showDiceOverlay.value && hasDicePreview.value) {
        return getDiceRoundMultiplier(diceValues.value[0], diceValues.value[1]);
      }
      return 1;
    });
    const globalMultiplier = computed(() => {
      const game = gameState.value;
      if (!game) return 1;
      const inherit = game.inheritMultiplier ?? game.inheritedGlobalMultiplier ?? 1;
      const actualRound = game.roundMultiplier;
      if (typeof actualRound === "number" && actualRound > 0) {
        return game.globalMultiplier ?? Math.min(inherit * actualRound, 8);
      }
      if (showDiceOverlay.value && hasDicePreview.value) {
        return Math.min(inherit * getDiceRoundMultiplier(diceValues.value[0], diceValues.value[1]), 8);
      }
      return game.globalMultiplier ?? inherit;
    });
    const dealerName = computed(() => {
      if (!gameState.value?.players?.length) return "";
      return gameState.value.players.find((player) => player.isDealer)?.name || "";
    });
    const wildTile = computed(() => {
      const raw = gameState.value?.customScoringMode;
      if (!raw || raw === "cheat") return null;
      const parts = raw.split("-");
      if (parts.length < 2) return null;
      const suit = parts[0];
      const value = parseInt(parts[1], 10);
      const isFlower = suit === "hua";
      const group = gameState.value?.wildTileGroup;
      return {
        suit,
        value,
        id: "center-wild",
        isWild: true,
        isFlower,
        flowerGroup: isFlower ? group : void 0
      };
    });
    const positionColors = ["east", "south", "west", "north"];
    const claimSourceColors = ["#f44336", "#4caf50", "#2196f3", "#ffc107"];
    const todayBestFan = ref(0);
    watch(() => gameState.value?.players, (players) => {
      if (!players) return;
      for (const p of players) {
        if (p.status === "won" && p.wonFan > todayBestFan.value) {
          todayBestFan.value = p.wonFan;
        }
      }
    }, { deep: true });
    const todayBestHandName = computed(() => {
      const fan = todayBestFan.value;
      if (fan <= 0) return null;
      if (fan >= 8) return `${fan}番 · 满贯`;
      if (fan >= 5) return `${fan}番 · 高番`;
      if (fan >= 3) return `${fan}番 · 中番`;
      return `${fan}番 · 基础`;
    });
    computed(() => {
      if (todayBestHandName.value) {
        return { name: todayBestHandName.value, tiles: [] };
      }
      return null;
    });
    const roomCumulative = ref({});
    watch(() => gameState.value?.players, (players) => {
      if (!players) return;
      for (const p of players) {
        if (!roomCumulative.value[p.id]) {
          roomCumulative.value[p.id] = { wins: 0, losses: 0, lastStatus: "none" };
        }
        if (p.status === "won") {
          if (roomCumulative.value[p.id].lastStatus !== "won") {
            roomCumulative.value[p.id].wins++;
            roomCumulative.value[p.id].lastStatus = "won";
          }
        } else if (p.status === "lost") {
          if (roomCumulative.value[p.id].lastStatus !== "lost") {
            roomCumulative.value[p.id].losses++;
            roomCumulative.value[p.id].lastStatus = "lost";
          }
        }
      }
    }, { deep: true });
    const statsPlayers = computed(() => {
      if (!gameState.value) return [];
      const qjAlertIds = new Set(gameState.value.qjAlerts?.map((a) => a.playerId) || []);
      const qjThreshold = gameState.value.liangShanThreshold ?? 4e3;
      const roundStats = Array.isArray(gameState.value.roundStats) ? gameState.value.roundStats : [];
      return gameState.value.players.map((p, i) => {
        const alert = gameState.value.qjAlerts?.find((a) => a.playerId === p.id);
        const qjScore = alert?.score || 0;
        const cumulative = roomCumulative.value[p.id] || { wins: 0, losses: 0, lastStatus: "none" };
        const winCount = roundStats.filter((round) => Array.isArray(round?.winners) && round.winners.includes(p.id)).length;
        const selfDrawCount = roundStats.filter((round) => Array.isArray(round?.selfDraws) && round.selfDraws.includes(p.id)).length;
        const discardCount = Math.max(0, winCount - selfDrawCount);
        const bestRound = roundStats.reduce((best, round) => {
          const score = Number(round?.scores?.[p.id] ?? 0);
          return best === null ? score : Math.max(best, score);
        }, null);
        return {
          id: p.id,
          name: p.name,
          score: p.score || 0,
          wins: p.status === "won" ? 1 : 0,
          losses: p.status === "lost" ? 1 : 0,
          color: positionColors[p.position] || "south",
          isMe: p.id === currentPlayer.value?.id,
          isBot: isBotPlayer(p),
          isQJCrossed: qjAlertIds.has(p.id),
          qjScore,
          qjGlow: qjScore > qjThreshold * 3,
          winCount,
          discardCount,
          selfDrawCount,
          bestRound,
          totalWins: cumulative.wins,
          totalLosses: cumulative.losses,
          lastRoundStatus: cumulative.lastStatus,
          _raw: p
          // 供战绩榜点击菜单使用
        };
      });
    });
    const spectatorViewState = computed(() => {
      if (!gameState.value || !currentPlayer.value) return null;
      return gameState.value.spectatorViews?.[currentPlayer.value.id] || null;
    });
    const spectatingId = computed(() => spectatorViewState.value?.viewingPlayerId || null);
    const watchingPlayerName = computed(() => {
      if (!spectatingId.value || !gameState.value?.players) return "未知";
      const p = gameState.value.players.find((p2) => p2.id === spectatingId.value);
      return p?.name || "未知";
    });
    computed(() => spectatorViewState.value?.pendingHumanPlayerId || null);
    computed(() => spectatorViewState.value?.approvedHumanPlayerId || null);
    const hasDebugSpectateBot = computed(() => {
      return !!gameState.value?.players?.some((player) => player?.name === "AI-AK");
    });
    const spectatorApprovalRequest = computed(() => {
      if (!gameState.value || !currentPlayer.value) return null;
      return (gameState.value.spectatorApprovalRequests || []).find(
        (request) => request.status === "pending" && request.targetId === currentPlayer.value?.id
      ) || null;
    });
    const canUseSpectatorView = computed(() => {
      if (!currentPlayer.value || !gameState.value) return false;
      if (gameState.value.phase !== GamePhase.PLAYING && gameState.value.phase !== GamePhase.ENDED) return false;
      return currentPlayer.value.status === "won" || currentPlayer.value.status === "spectating" || hasDebugSpectateBot.value;
    });
    const isDealer = computed(() => currentPlayer.value?.isDealer);
    const isDealerUser = computed(() => isDealer.value);
    const isGameEnded = computed(() => gameState.value?.phase === GamePhase.ENDED);
    const hasDealtCards = computed(() => {
      if (!gameState.value?.players?.length) return false;
      const activePlayers = gameState.value.players.filter((p) => p.status !== "spectating" && p.status !== "left");
      if (activePlayers.length === 0) return false;
      return activePlayers.some((p) => (p.hand?.concealedTiles?.length || 0) > 0);
    });
    const isPreGameTransition = computed(() => {
      if (isMobileLandscapeMode.value || shouldRotateView.value) return false;
      if (!gameState.value) return true;
      if (hasDealtCards.value) return false;
      const phase = gameState.value.phase;
      return phase === GamePhase.WAITING || phase === GamePhase.STARTING;
    });
    computed(() => {
      if (!gameState.value) {
        return isConnected.value ? "正在同步房间状态" : "正在连接牌桌";
      }
      if (showDiceOverlay.value || gameState.value?.phase === GamePhase.STARTING) {
        return "正在掷骰子，马上发牌";
      }
      if (!isConnected.value) {
        return "正在连接牌桌";
      }
      return waitingPlayers.value.length >= 4 ? "人齐了，牌桌就绪" : "正式牌桌准备中";
    });
    computed(() => {
      if (!gameState.value) {
        return "连接成功后将直接进入正式牌桌，不再显示独立等待页";
      }
      if (showDiceOverlay.value || gameState.value?.phase === GamePhase.STARTING) {
        return `庄家 ${dealerName.value} 正在开局，牌局即将开始`;
      }
      if (!isConnected.value) {
        return "正在重新连接服务器，牌桌布局保持不变";
      }
      if (waitingPlayers.value.length < 4) {
        return `当前 ${waitingPlayers.value.length}/4 人，继续在正式牌桌上等人`;
      }
      return "已隐藏独立等待布局，开局前保持正式牌桌画面";
    });
    const waitingPlayers = computed(() => {
      if (!gameState.value?.players) return [];
      return gameState.value.players.map((p) => ({
        id: p.id,
        name: p.name?.replace(/^AI-/, "🤖 ") || "???",
        isBot: p.name?.startsWith("AI-") || false,
        isDealer: p.isDealer
      }));
    });
    const canManualStartWaitingGame = computed(
      () => gameState.value?.phase === GamePhase.WAITING && waitingPlayers.value.length >= (gameState.value?.minPlayers ?? 4) && !!currentPlayer.value?.isDealer && !currentPlayer.value?.isSpectator && isConnected.value
    );
    const overlayReason = computed(() => roomDismissedReason.value || gameState.value?.endReason || null);
    const isOverlayVisible = computed(() => {
      if (roomDismissedReason.value) return true;
      if (!isGameEnded.value) return false;
      if (isWallExhaustedSettlement.value) return false;
      return overlayReason.value !== GameEndReason.LAST_PLAYER;
    });
    computed(() => ![
      GameEndReason.OWNER_LEFT,
      GameEndReason.EMPTY_ROOM
    ].includes(overlayReason.value));
    const overlayTitle = computed(() => {
      if (roomDismissedReason.value === GameEndReason.OWNER_LEFT) {
        return "房间已关闭";
      }
      if (overlayReason.value === GameEndReason.WALL_EXHAUSTED) {
        return "🀄 流局";
      }
      return overlayReason.value === GameEndReason.LAST_PLAYER ? "本局结束" : "游戏结束";
    });
    const tileLabel = (tile) => {
      if (!tile) return "";
      const suit = String(tile.suit || "").toLowerCase();
      if (suit === "hua" || suit === "flower") return ["春", "夏", "秋", "冬", "梅", "兰", "竹", "菊"][Number(tile.value) - 1] || `花${tile.value}`;
      if (suit === "feng" || suit === "wind") return ["东", "南", "西", "北"][Number(tile.value) - 1] || `风${tile.value}`;
      if (suit === "jian" || suit === "dragon") return ["中", "发", "白"][Number(tile.value) - 1] || `箭${tile.value}`;
      const suitLabel = suit === "wan" ? "万" : suit === "dots" ? "筒" : suit === "tiao" ? "条" : "";
      return `${tile.value}${suitLabel}`;
    };
    const tileSuitOrder = { wan: 0, tiao: 1, dots: 2, feng: 3, jian: 4, hua: 5 };
    const compareTilesForDisplay = (a, b) => {
      const suitDelta = (tileSuitOrder[a.suit || ""] ?? 99) - (tileSuitOrder[b.suit || ""] ?? 99);
      if (suitDelta !== 0) return suitDelta;
      return Number(a.value ?? 0) - Number(b.value ?? 0);
    };
    const tileCountKey = (tile) => {
      if (!tile?.suit) return "";
      return `${tile.suit}-${Number(tile.value ?? 0)}`;
    };
    const isWildPreviewTile = (tile) => {
      if (!tile || !wildTile.value) return false;
      if (wildTile.value.suit === "hua") {
        return tile.suit === "hua" && (wildTile.value.flowerGroup || []).includes(String(tile.value));
      }
      return tile.suit === wildTile.value.suit && Number(tile.value) === Number(wildTile.value.value);
    };
    const knownVisibleTileCounts = computed(() => {
      const counts = /* @__PURE__ */ new Map();
      const pushTile = (tile) => {
        if (!tile || !tile.suit || isWildPreviewTile(tile)) return;
        const key = tileCountKey(tile);
        if (!key) return;
        counts.set(key, (counts.get(key) || 0) + 1);
      };
      for (const tile of currentPlayer.value?.hand?.concealedTiles || []) pushTile(tile);
      for (const player of gameState.value?.players || []) {
        for (const meld of player.hand?.exposedMelds || []) {
          for (const tile of meld.tiles || []) pushTile(tile);
        }
      }
      for (const tile of gameState.value?.discardPile || []) pushTile(tile);
      return counts;
    });
    const tingPreviewItems = computed(() => {
      const winningTiles = tingPreview.value?.winningTiles || [];
      const isTing = !!currentPlayer.value?.isTing || !!tingPreview.value?.isTing || winningTiles.length > 0;
      if (!isTing) return [];
      const deduped = /* @__PURE__ */ new Map();
      for (const entry of winningTiles) {
        const tile = entry?.tile;
        if (!tile || isWildPreviewTile(tile)) continue;
        const key = tileCountKey(tile);
        if (!key || deduped.has(key)) continue;
        const knownCount = knownVisibleTileCounts.value.get(key) || 0;
        deduped.set(key, {
          key,
          label: tileLabel(tile),
          tile,
          isExhausted: knownCount >= 4
        });
      }
      return Array.from(deduped.values()).sort((a, b) => compareTilesForDisplay(a.tile, b.tile));
    });
    const getHuOptionBasePoints = (opt) => Number(opt?.summary?.finalPoints ?? opt?.score ?? 0);
    const getHuOptionPayerCount = (opt) => {
      if (opt?.type !== "self_draw") return 1;
      const players = Array.isArray(gameState.value?.players) ? gameState.value.players : [];
      const losers = players.filter((player) => player.id !== playerId.value && player.status !== "won");
      return Math.max(1, losers.length);
    };
    const getHuOptionTotalWin = (opt) => getHuOptionBasePoints(opt) * getHuOptionPayerCount(opt);
    const getHuOptionDisplaySummary = (opt) => {
      const summary = opt?.summary || {};
      return {
        base: Number(summary.baseFan ?? 0),
        extra: Number(summary.extraMultipliers ?? 1),
        global: Number(summary.globalMultiplier ?? 1),
        settlement: Number(summary.settlementMultiplier ?? 1),
        finalPoints: getHuOptionBasePoints(opt),
        payerCount: getHuOptionPayerCount(opt),
        totalWin: getHuOptionTotalWin(opt)
      };
    };
    const getHuOptionFormula = (opt) => {
      const display = getHuOptionDisplaySummary(opt);
      const baseFormula = `基础/固定${display.base} × 额外${display.extra} × 全局${display.global} × 结算${display.settlement} = 单家${display.finalPoints}`;
      if (opt?.type === "self_draw") {
        return `${baseFormula}；自摸 ${display.finalPoints} × ${display.payerCount}家 = ${display.totalWin}`;
      }
      return `${baseFormula}；捉冲总赢 = ${display.totalWin}`;
    };
    const formatHuOptionGroups = (opt) => {
      const handTiles = Array.isArray(opt?.tiles) ? opt.tiles : [];
      const melds = Array.isArray(opt?.melds) ? opt.melds : [];
      if (!handTiles.length && !melds.length) return "";
      const allHandTiles = handTiles.filter((t) => t?.suit !== "hua" && t?.suit !== "flower");
      const allExposedMelds = melds.map((group) => Array.isArray(group) ? group.filter((t) => t?.suit !== "hua" && t?.suit !== "flower") : group?.tiles?.filter?.((t) => t?.suit !== "hua" && t?.suit !== "flower") || []).filter((g) => g.length > 0);
      const concealedCombos = arrangeWinningHand(allHandTiles, []);
      const concealedGroups = Array.isArray(concealedCombos?.[0]?.groups) ? concealedCombos[0].groups : [];
      const concealedMelds = concealedGroups.map((group) => Array.isArray(group?.tiles) ? formatMeldTiles(group.tiles) : "").filter(Boolean);
      const exposedMelds = allExposedMelds.map((group) => formatMeldTiles(group)).filter(Boolean);
      const allParts = [...concealedMelds, ...exposedMelds];
      return allParts.length ? allParts.join(" / ") : "";
    };
    const overlayMessage = computed(() => {
      const reason = overlayReason.value;
      switch (reason) {
        case GameEndReason.WALL_EXHAUSTED: {
          const nextMul = gameState.value?.inheritedGlobalMultiplier ?? gameState.value?.globalMultiplier ?? 1;
          return `下局倍数 ×${nextMul}`;
        }
        case GameEndReason.LAST_PLAYER:
          return "本局已结算，可以继续下一局。";
        case GameEndReason.OWNER_LEFT:
          return "房主已离开房间，游戏已解散。";
        case GameEndReason.EMPTY_ROOM:
          return "所有玩家已离开，游戏结束。";
        default:
          return "本轮已结束，可以继续下一局。";
      }
    });
    const isDrawOverlay = computed(() => overlayReason.value === GameEndReason.WALL_EXHAUSTED);
    const showApprovalOverlay = computed(() => false);
    const dealerPlayer = computed(() => {
      const players = gameState.value?.players || [];
      return players.find((player) => player.isDealer) || null;
    });
    const enterStartingPhaseWithDiceOverlay = async () => {
      try {
        await $fetch("/mahjong/api/game/start", {
          method: "POST",
          body: {
            gameId: roomId.value,
            playerId: playerId.value,
            phaseOnly: true
          }
        });
        diceValues.value = [
          Math.floor(Math.random() * 6) + 1,
          Math.floor(Math.random() * 6) + 1
        ];
        hasDicePreview.value = true;
        playSound("dice-roll");
        playVoiceAction2("diceRoll");
        showDiceOverlay.value = true;
      } catch (e) {
        console.error("[enterStartingPhaseWithDiceOverlay] Failed:", e);
        addBroadcast(e?.data?.message || e?.message || "进入下一局失败", "warn");
      }
    };
    const autoRollAndDeal = () => {
      onRerollDice();
      (void 0).setTimeout(() => {
        void onDealTiles();
      }, 1800);
    };
    const autoRollOnly = () => {
      onRerollDice();
    };
    const startNextRound = async () => {
      cancelWallExhaustedCountdown();
      if (isSettleRequested.value) {
        showSettlement.value = true;
        return;
      }
      showSettlement.value = false;
      settlementData.value = null;
      isHuReviewMode.value = false;
      await enterStartingPhaseWithDiceOverlay();
      await forceRefreshState();
      (void 0).setTimeout(() => {
        if (gameState.value?.phase === GamePhase.STARTING && showDiceOverlay.value) {
          void onDealTiles();
        }
      }, 1700);
    };
    const isInteractionLocked = computed(() => isOverlayVisible.value);
    const formatOrdinal = (value) => {
      if (!value) return null;
      return `第${value}名`;
    };
    const formatScore = (value) => {
      if (value === null || value === void 0) return "--";
      const sign = value > 0 ? "+" : "";
      return `${sign}${value}`;
    };
    const getScoreClass = (value) => {
      if (value === null || value === void 0) return "score-neutral";
      if (value > 0) return "score-positive";
      if (value < 0) return "score-negative";
      return "score-neutral";
    };
    const playerResults = computed(() => {
      if (!gameState.value) return [];
      return [...gameState.value.players].map((player) => {
        const isWinner2 = player.status === "won";
        const finalScore = player.score ?? gameState.value?.finalScores?.[player.id] ?? null;
        return {
          id: player.id,
          name: player.name,
          isWinner: isWinner2,
          winOrder: player.winOrder,
          rankLabel: isWinner2 && player.winOrder ? formatOrdinal(player.winOrder) : "未胡牌",
          statusLabel: isWinner2 ? "赢家" : player.status === "lost" ? "输了" : "未胡牌",
          winRoundLabel: isWinner2 && player.winRound ? `第${player.winRound}轮` : null,
          scoreLabel: formatScore(finalScore),
          scoreClass: getScoreClass(finalScore)
        };
      }).sort((a, b) => {
        if (a.isWinner && !b.isWinner) return -1;
        if (!a.isWinner && b.isWinner) return 1;
        if (a.isWinner && b.isWinner) {
          const orderA = a.winOrder ?? Number.MAX_SAFE_INTEGER;
          const orderB = b.winOrder ?? Number.MAX_SAFE_INTEGER;
          return orderA - orderB;
        }
        return a.name.localeCompare(b.name);
      });
    });
    const northHand = computed(() => getStableOpponentHand(topPlayer.value));
    const northMelds = computed(() => getStablePlayerMelds(topPlayer.value));
    computed(() => getOpponentAreaMemoKey(topPlayer.value));
    const northDiscards = computed(() => getVisiblePlayerDiscards(topPlayer.value));
    const northIsWinner = computed(() => topPlayer.value?.status === "won");
    const activePosition = computed(() => gameState.value?.currentPlayerIndex ?? null);
    const currentTurnPlayer = computed(() => {
      if (!gameState.value || activePosition.value === null) return null;
      return gameState.value.players[activePosition.value] || null;
    });
    const isMyTurn = computed(() => currentTurnPlayer.value?.id === currentPlayer.value?.id);
    let myTurnRefreshTimer = null;
    let pendingExpiryRefreshTimer = null;
    watch([isMyTurn, currentFreezeUntil], ([myTurn, freezeUntil]) => {
      if (myTurnRefreshTimer) {
        clearTimeout(myTurnRefreshTimer);
        myTurnRefreshTimer = null;
      }
      if (!myTurn) return;
      const delay = freezeUntil > Date.now() ? freezeUntil - Date.now() + 120 : 120;
      myTurnRefreshTimer = setTimeout(() => {
        if (!availableActions.value.includes(ActionType.DRAW) && !availableActions.value.includes(ActionType.DISCARD)) {
          refreshState();
        }
      }, Math.max(delay, 0));
    });
    const turnMessage = computed(() => {
      if (!gameState.value) {
        return "正在加载房间…";
      }
      const phase = gameState.value.phase;
      if (phase === "waiting" && !hasDealtCards.value) {
        return "等待玩家加入开始";
      }
      if (phase === "waiting" && hasDealtCards.value) {
        return "准备发牌…";
      }
      const player = currentTurnPlayer.value;
      if (player) {
        if (player.id === currentPlayer.value?.id) {
          return "轮到你了";
        }
        return `${player.name} 的回合`;
      }
      return "等待其他玩家出牌";
    });
    const westHand = computed(() => getStableOpponentHand(leftPlayer.value));
    const westMelds = computed(() => getStablePlayerMelds(leftPlayer.value));
    computed(() => getOpponentAreaMemoKey(leftPlayer.value));
    const westDiscards = computed(() => getVisiblePlayerDiscards(leftPlayer.value));
    const westIsWinner = computed(() => leftPlayer.value?.status === "won");
    const eastHand = computed(() => getStableOpponentHand(rightPlayer.value));
    const eastMelds = computed(() => getStablePlayerMelds(rightPlayer.value));
    computed(() => getOpponentAreaMemoKey(rightPlayer.value));
    const eastDiscards = computed(() => getVisiblePlayerDiscards(rightPlayer.value));
    const eastIsWinner = computed(() => rightPlayer.value?.status === "won");
    const isWinner = computed(() => currentPlayer.value?.status === "won");
    const northJustDrawnTileId = ref(null);
    const westJustDrawnTileId = ref(null);
    const eastJustDrawnTileId = ref(null);
    const selfJustDrawnTileId = ref(null);
    const selfPendingSupplementHighlight = ref(false);
    let selfDrawnTimer = null;
    function trackDrawnTile(hand, prevLen, prevIds, drawIdRef, timerRef, options) {
      const previousIds = new Set(prevIds.value);
      const newTile = hand.find((tile) => tile?.id && !previousIds.has(tile.id));
      const shouldHighlightNormalDraw = hand.length === prevLen.value + 1;
      const shouldHighlightSupplement = !!options?.forceNextNewTile?.value && !!newTile;
      if ((shouldHighlightNormalDraw || shouldHighlightSupplement) && newTile?.id && newTile?.suit !== "hua" && !newTile?.isFlower) {
        drawIdRef.value = newTile.id;
        if (timerRef.get()) clearTimeout(timerRef.get());
        timerRef.set(setTimeout(() => {
          drawIdRef.value = null;
        }, 3e3));
        if (options?.forceNextNewTile) options.forceNextNewTile.value = false;
      }
      prevLen.value = hand.length;
      prevIds.value = hand.map((tile) => tile?.id).filter(Boolean);
    }
    ({ value: northHand.value.length });
    ({ value: westHand.value.length });
    ({ value: eastHand.value.length });
    const selfPrevHandLen = { value: playerHand.value.length };
    ({ value: northHand.value.map((tile) => tile.id) });
    ({ value: westHand.value.map((tile) => tile.id) });
    ({ value: eastHand.value.map((tile) => tile.id) });
    const selfPrevHandIds = { value: playerHand.value.map((tile) => tile.id) };
    watch(northHand, (h2) => {
      h2.length;
      h2.map((tile) => tile?.id).filter(Boolean);
      northJustDrawnTileId.value = null;
    });
    watch(westHand, (h2) => {
      h2.length;
      h2.map((tile) => tile?.id).filter(Boolean);
      westJustDrawnTileId.value = null;
    });
    watch(eastHand, (h2) => {
      h2.length;
      h2.map((tile) => tile?.id).filter(Boolean);
      eastJustDrawnTileId.value = null;
    });
    watch(playerHand, (h2) => trackDrawnTile(
      h2,
      selfPrevHandLen,
      selfPrevHandIds,
      selfJustDrawnTileId,
      { get: () => selfDrawnTimer, set: (v) => {
        selfDrawnTimer = v;
      } },
      { forceNextNewTile: selfPendingSupplementHighlight }
    ));
    const selectedTileId = ref(null);
    ref(null);
    const pendingDiscardTileId = ref(null);
    const pendingDiscardSnapshot = ref(null);
    const canSubmitDiscard = (tile) => {
      if (isWinner.value || isInteractionLocked.value || isActionPending.value) return false;
      if (!isMyTurn.value) return false;
      if (pendingDiscardTileId.value === tile.id) return false;
      const concealedCount = currentPlayer.value?.hand?.concealedTiles?.length || 0;
      if (concealedCount < 2 || concealedCount % 3 !== 2) return false;
      return availableActions.value.includes(ActionType.DISCARD);
    };
    const commitDiscard = (tile) => {
      if (!canSubmitDiscard(tile)) return;
      pendingDiscardTileId.value = tile.id;
      pendingDiscardSnapshot.value = buildDiscardGuardSnapshot({
        activePosition: activePosition.value,
        currentPlayerId: currentPlayer.value?.id || null,
        concealedCount: currentPlayer.value?.hand?.concealedTiles?.length || 0,
        discardPileLength: gameState.value?.discardPile?.length || 0,
        pendingActionsCount: gameState.value?.pendingActions?.length || 0,
        availableActions: [...availableActions.value]
      });
      selectedTileId.value = null;
      playSound("tile-discard");
      if (tile.suit) playVoiceTile2(tile.suit, tile.value);
      markDiscardAudioPlayed(tile);
      void executeAction(ActionType.DISCARD, tile.id).then((success) => {
        if (success) return;
        pendingDiscardTileId.value = null;
        pendingDiscardSnapshot.value = null;
      });
    };
    const handleTileDiscard = (tile) => {
      if (!canSubmitDiscard(tile)) return;
      if (discardMode.value !== "drag" && discardMode.value !== "tap_confirm") return;
      commitDiscard(tile);
    };
    const handleTileDblclick = (tile) => {
      if (!canSubmitDiscard(tile)) return;
      if (discardMode.value !== "double_tap") return;
      commitDiscard(tile);
    };
    const handleTileClick = (tile) => {
      if (isWinner.value || isInteractionLocked.value || isActionPending.value) return;
      if (pendingDiscardTileId.value) return;
      if (showDraw.value) {
        return;
      }
      const canDiscard = availableActions.value.includes(ActionType.DISCARD);
      if (!canDiscard) return;
      if (selectedTileId.value === tile.id) {
        selectedTileId.value = null;
      } else {
        selectedTileId.value = tile.id;
      }
    };
    computed(() => {
      const mine = myPendingAction.value;
      if (!mine) return false;
      return mine.availableActions.some(
        (action) => action === ActionType.CHOW || action === ActionType.PENG || action === ActionType.KONG || action === ActionType.HU || action === ActionType.CONCEALED_KONG || action === ActionType.EXTENDED_KONG
      );
    });
    computed(() => {
      const mine = myPendingAction.value;
      if (!mine) return false;
      return mine.availableActions.some(
        (action) => action === ActionType.PENG || action === ActionType.KONG || action === ActionType.HU || action === ActionType.CONCEALED_KONG || action === ActionType.EXTENDED_KONG
      );
    });
    const showDraw = computed(
      () => availableActions.value.includes(ActionType.DRAW) || shouldExposeSharedDraw.value || shouldPreviewDeferredDraw.value
    );
    const filteredCircularAvailableActions = computed(() => {
      if ((shouldExposeSharedDraw.value || shouldPreviewDeferredDraw.value) && !availableActions.value.includes(ActionType.DRAW)) {
        return [...availableActions.value, ActionType.DRAW];
      }
      return availableActions.value;
    });
    const showChowPicker = ref(false);
    const selectedChowOption = ref(null);
    const shouldShowActionButton = (type) => {
      if (!availableActions.value.includes(type)) return false;
      if (type === ActionType.CHOW && showChowPicker.value) return true;
      return nowTs.value <= actionButtonsVisibleUntil.value;
    };
    const showChow = computed(() => shouldShowActionButton(ActionType.CHOW));
    const showPeng = computed(() => shouldShowActionButton(ActionType.PENG));
    const showKong = computed(() => shouldShowActionButton(ActionType.KONG));
    const showHu = computed(() => shouldShowActionButton(ActionType.HU));
    const showRebel = computed(() => availableActions.value.includes(ActionType.REBEL));
    computed(() => availableActions.value.includes(ActionType.THINK));
    const thinkRemaining = computed(() => {
      if (!gameState.value || !currentPlayer.value) return 0;
      const maxChances = gameState.value.thinkChances ?? 3;
      const used = gameState.value.thinkUsage?.[currentPlayer.value.id] ?? 0;
      return maxChances - used;
    });
    const canUseThink = computed(() => thinkRemaining.value > 0);
    const thinkFreezeActive = computed(() => {
      const until = gameState.value?.thinkFreezeUntil;
      return until && until > Date.now();
    });
    const thinkFreezePlayerName = computed(() => {
      const pid = gameState.value?.thinkFreezePlayerId;
      if (!pid || !gameState.value) return "";
      return gameState.value.players.find((p) => p.id === pid)?.name || "";
    });
    const hasOtherPlayerThinkLock = computed(() => thinkFreezeActive.value && !isMyThinkFreezeOwner.value);
    const hasOtherPlayerHuSelectionLock = computed(() => {
      const locks = gameState.value?.huSelectionLocks || {};
      return Object.keys(locks).some((playerId2) => playerId2 !== currentPlayer.value?.id);
    });
    const isDrawBlockedByDecisionLock = computed(() => hasOtherPlayerThinkLock.value || hasOtherPlayerHuSelectionLock.value);
    const drawBlockedNoticeVisible = ref(false);
    const drawBlockedNoticeText = ref("等其他玩家决策");
    let drawBlockedNoticeTimer = null;
    const showDrawBlockedNotice = (text = "等其他玩家决策") => {
      drawBlockedNoticeText.value = text;
      drawBlockedNoticeVisible.value = true;
      if (drawBlockedNoticeTimer) clearTimeout(drawBlockedNoticeTimer);
      drawBlockedNoticeTimer = setTimeout(() => {
        drawBlockedNoticeVisible.value = false;
        drawBlockedNoticeTimer = null;
      }, 1400);
    };
    const isMyThinkFreezeOwner = computed(() => {
      const pid = gameState.value?.thinkFreezePlayerId;
      return !!pid && pid === currentPlayer.value?.id;
    });
    const thinkFreezeCountdown = ref(0);
    let thinkCountdownTimer = null;
    watch(thinkFreezeActive, (active) => {
      if (thinkCountdownTimer) clearInterval(thinkCountdownTimer);
      if (active) {
        const update = () => {
          const until = gameState.value?.thinkFreezeUntil || 0;
          thinkFreezeCountdown.value = Math.max(0, Math.ceil((until - Date.now()) / 1e3));
        };
        update();
        thinkCountdownTimer = setInterval();
      } else {
        thinkFreezeCountdown.value = 0;
      }
    });
    const showHuPanel = ref(false);
    computed(() => {
      if (!showHu.value || !playerHand.value) return [];
      const hand = [...playerHand.value];
      const melds = playerMelds.value || [];
      const combos = arrangeWinningHand(hand, melds);
      combos.forEach((c) => {
        c.groups.sort((a, b) => {
          const minA = Math.min(...a.tiles.map((t) => t.value));
          const minB = Math.min(...b.tiles.map((t) => t.value));
          if (a.type === "pair" && b.type !== "pair") return 1;
          if (a.type !== "pair" && b.type === "pair") return -1;
          return minA - minB;
        });
      });
      return combos;
    });
    function arrangeWinningHand(hand, existingMelds) {
      if (hand.length === 0 && existingMelds.length > 0) return [{ groups: [] }];
      const sorted = [...hand].sort((a, b) => {
        const suitOrder = { wan: 0, tiao: 1, dots: 2, feng: 3, jian: 4, hua: 5 };
        const sA = suitOrder[a.suit] ?? 9;
        const sB = suitOrder[b.suit] ?? 9;
        if (sA !== sB) return sA - sB;
        return a.value - b.value;
      });
      const results = [];
      function findCombinations(tiles, groups) {
        if (tiles.length === 0) {
          results.push({ groups: [...groups] });
          return;
        }
        if (tiles.length >= 2 && tiles.length % 3 === 2) {
          for (let i = 0; i < tiles.length - 1; i++) {
            if (tilesEqual(tiles[i], tiles[i + 1])) {
              const remaining = tiles.filter((_, idx) => idx !== i && idx !== i + 1);
              const pair = { type: "pair", tiles: [tiles[i], tiles[i + 1]] };
              findMelds(remaining, [...groups, pair]);
              break;
            }
          }
        } else {
          findMelds(tiles, groups);
        }
      }
      function findMelds(tiles, groups) {
        if (tiles.length === 0) {
          results.push({ groups: [...groups] });
          return;
        }
        if (tiles.length % 3 !== 0) return;
        if (tiles.length >= 3 && tilesEqual(tiles[0], tiles[1]) && tilesEqual(tiles[1], tiles[2])) {
          findCombinations(tiles.slice(3), [...groups, { type: "triplet", tiles: tiles.slice(0, 3) }]);
        }
        const first = tiles[0];
        if (["wan", "tiao", "dots"].includes(first.suit)) {
          const second = tiles.find((t) => t.suit === first.suit && t.value === first.value + 1 && t.id !== first.id);
          if (second) {
            const third = tiles.find((t) => t.suit === first.suit && t.value === first.value + 2 && t.id !== first.id && t.id !== second.id);
            if (third) {
              const remaining = tiles.filter((t) => t.id !== first.id && t.id !== second.id && t.id !== third.id);
              findCombinations(remaining, [...groups, { type: "sequence", tiles: [first, second, third] }]);
            }
          }
        }
      }
      function tilesEqual(a, b) {
        return a.suit === b.suit && a.value === b.value;
      }
      findCombinations(sorted, []);
      const seen = /* @__PURE__ */ new Set();
      return results.filter((r) => {
        const key = r.groups.map((g) => `${g.type}:${g.tiles.map((t) => `${t.suit}${t.value}`).join(",")}`).sort().join("|");
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }).slice(0, 5);
    }
    const winOptions = ref([]);
    const lastHuReviewOptions = ref([]);
    ref(null);
    const isHuReviewMode = ref(false);
    const displayWinOptions = computed(() => [...winOptions.value].sort((a, b) => (b.summary?.finalPoints ?? b.score ?? 0) - (a.summary?.finalPoints ?? a.score ?? 0)).slice(0, 3));
    const activeHuOptions = computed(() => isHuReviewMode.value ? lastHuReviewOptions.value : displayWinOptions.value);
    const canReviewLatestHuSelection = computed(() => {
      return currentPlayer.value?.status === "won" && lastHuReviewOptions.value.length > 0;
    });
    const canReviewHuSelection = computed(() => {
      if (!showSettlement.value || !currentPlayer.value?.id) return false;
      const winners = Array.isArray(currentSettlementRound.value?.winnerDetails) ? currentSettlementRound.value.winnerDetails : [];
      return winners.some((winner) => winner.playerId === currentPlayer.value?.id) && lastHuReviewOptions.value.length > 0;
    });
    const fetchWinOptions = async () => {
      try {
        const res = await $fetch("/api/game/win-options", {
          query: { gameId: roomId.value, playerId: currentPlayer.value?.id }
        });
        winOptions.value = (res.winOptions || []).slice(0, 3);
      } catch (err) {
        console.error("Failed to fetch win options:", err);
        winOptions.value = [];
      }
    };
    const syncHuSelectionLock = async (locked) => {
      if (!roomId.value || !currentPlayer.value?.id) return;
      try {
        await $fetch("/mahjong/api/game/hu-selection", {
          method: "POST",
          body: {
            gameId: roomId.value,
            playerId: currentPlayer.value.id,
            locked
          }
        });
      } catch (error2) {
        console.error("[hu-selection] Failed to sync lock:", error2);
      }
    };
    let autoHuShown = false;
    watch(() => [showHu.value, isMyTurn.value], ([canHu, myTurn]) => {
      if (canHu && myTurn && !showHuPanel.value && !autoHuShown) {
        autoHuShown = true;
        onHu();
      }
      if (!canHu) autoHuShown = false;
    });
    const selectedHuCombo = ref(null);
    const onHu = async () => {
      await executeAction(ActionType.THINK);
      isHuReviewMode.value = false;
      await fetchWinOptions();
      await syncHuSelectionLock(true);
      showHuPanel.value = true;
      selectedHuCombo.value = 0;
    };
    const myPendingAction = computed(() => {
      if (!gameState.value || !currentPlayer.value) return null;
      return gameState.value.pendingActions.find((pa) => pa.playerId === currentPlayer.value.id) || null;
    });
    const myPendingExpiresAt = computed(() => Number(myPendingAction.value?.expiresAt ?? 0));
    const isSharedDrawClaimWindow = computed(() => {
      if (!isMyTurn.value || !currentPlayer.value || !gameState.value) return false;
      const pending = gameState.value.pendingActions || [];
      if (!pending.length) return false;
      if (pending.some((pa) => pa.playerId !== currentPlayer.value.id)) return false;
      return pending.every(
        (pa) => Array.isArray(pa.availableActions) && pa.availableActions.length > 0 && pa.availableActions.every((action) => action === ActionType.CHOW || action === ActionType.PASS)
      );
    });
    const shouldExposeSharedDraw = computed(() => {
      if (!isSharedDrawClaimWindow.value) return false;
      const pending = myPendingAction.value;
      if (!pending || myPendingExpiresAt.value <= nowTs.value) return false;
      return true;
    });
    const shouldPreviewDeferredDraw = computed(() => {
      if (!isMyTurn.value) return false;
      const pending = myPendingAction.value;
      if (!pending || myPendingExpiresAt.value <= nowTs.value) return false;
      const actions = Array.isArray(pending?.availableActions) ? pending.availableActions : [];
      return actions.some(
        (action) => action === ActionType.CHOW || action === ActionType.PENG || action === ActionType.KONG || action === ActionType.HU || action === ActionType.CONCEALED_KONG || action === ActionType.EXTENDED_KONG
      );
    });
    computed(() => {
      return shouldPreviewDeferredDraw.value && !isSharedDrawClaimWindow.value;
    });
    const hasSharedDrawWindow = computed(() => {
      return (availableActions.value.includes(ActionType.DRAW) || shouldExposeSharedDraw.value) && myPendingExpiresAt.value > nowTs.value;
    });
    const actionVisualFreezeUntil = computed(() => {
      if (!isMyTurn.value) return 0;
      const freezeFromPending = currentFreezeUntil.value;
      if (freezeFromPending > nowTs.value) return freezeFromPending;
      return 0;
    });
    const chowOptions = computed(() => {
      const pending = myPendingAction.value;
      const discardTile = pending?.tile;
      if (!discardTile || !pending?.chowOptions?.length) return [];
      return pending.chowOptions.map((tileIds) => {
        const handTiles = tileIds.map((tileId) => playerHand.value.find((tile) => tile.id === tileId)).filter((tile) => !!tile);
        if (handTiles.length !== tileIds.length) return null;
        const previewTiles = [...handTiles, discardTile].sort((a, b) => a.value - b.value);
        return {
          tileIds,
          previewTiles,
          label: previewTiles.map((tile) => `${tile.value}`).join("-")
        };
      }).filter((option) => !!option);
    });
    const isMyApprovalWaiting = computed(() => {
      if (!actionApprovalEvent.value) return false;
      const myPending = myPendingAction.value;
      if (!myPending) return false;
      return actionApprovalEvent.value.candidatePlayerId !== currentPlayer.value?.id;
    });
    const approvalCountdownRatio = computed(() => {
      const expiresAt = actionApprovalEvent.value?.expiresAt;
      if (!expiresAt) return 1;
      const totalMs = Math.max(getActionWindowMs(gameState.value), 1);
      const leftMs = Math.max(0, expiresAt - nowTs.value);
      return Math.max(0, Math.min(1, leftMs / totalMs));
    });
    const approvalCountdownSec = computed(() => {
      const expiresAt = actionApprovalEvent.value?.expiresAt;
      if (!expiresAt) return 0;
      return Math.max(0, Math.ceil((expiresAt - nowTs.value) / 1e3));
    });
    watch(
      [() => isMyTurn.value, () => myPendingExpiresAt.value, () => availableActions.value.join(",")],
      ([myTurn, expiresAt, actions]) => {
        if (pendingExpiryRefreshTimer) {
          clearTimeout(pendingExpiryRefreshTimer);
          pendingExpiryRefreshTimer = null;
        }
        if (!myTurn || !expiresAt || expiresAt <= Date.now()) return;
        const actionList = actions ? actions.split(",").filter(Boolean) : [];
        const stillWaitingForWindowToEnd = !actionList.includes(ActionType.DRAW) && !actionList.includes(ActionType.DISCARD);
        if (!stillWaitingForWindowToEnd) return;
        pendingExpiryRefreshTimer = setTimeout(() => {
          refreshState();
        }, Math.max(expiresAt - Date.now() + 150, 0));
      },
      { immediate: true }
    );
    watch(
      [
        () => gameState.value?.pendingActions,
        () => gameState.value?.availableActions,
        () => gameState.value?.hesitationWindow,
        () => currentPlayer.value?.id,
        () => isMyTurn.value
      ],
      () => {
        const myId = currentPlayer.value?.id;
        const pending = gameState.value?.pendingActions || [];
        const mine = myId ? pending.find((pa) => pa.playerId === myId) : null;
        const selfAvailableActions = availableActions.value || [];
        if (mine || selfAvailableActions.includes(ActionType.HU) || hasSharedDrawWindow.value) {
          const newUntil = mine?.expiresAt || Date.now() + getActionWindowMs(gameState.value);
          if (newUntil > actionButtonsVisibleUntil.value) {
            actionButtonsVisibleUntil.value = newUntil;
          }
        } else {
          actionButtonsVisibleUntil.value = 0;
        }
      },
      { deep: true, immediate: true }
    );
    watch(
      [
        () => availableActions.value.join(","),
        () => currentPlayer.value?.id,
        () => isActionPending.value,
        () => activePosition.value,
        () => currentPlayer.value?.hand?.concealedTiles?.length,
        () => gameState.value?.discardPile?.length,
        () => gameState.value?.pendingActions?.length
      ],
      () => {
        const nextSnapshot = buildDiscardGuardSnapshot({
          activePosition: activePosition.value,
          currentPlayerId: currentPlayer.value?.id || null,
          concealedCount: currentPlayer.value?.hand?.concealedTiles?.length || 0,
          discardPileLength: gameState.value?.discardPile?.length || 0,
          pendingActionsCount: gameState.value?.pendingActions?.length || 0,
          availableActions: [...availableActions.value]
        });
        if (pendingDiscardTileId.value && shouldReleasePendingDiscardGuard(pendingDiscardSnapshot.value, nextSnapshot, isMyTurn.value)) {
          pendingDiscardTileId.value = null;
          pendingDiscardSnapshot.value = null;
        }
        if (!availableActions.value.includes(ActionType.DISCARD) || pendingDiscardTileId.value) {
          selectedTileId.value = null;
        }
      },
      { immediate: true }
    );
    watch(
      () => gameState.value?.discardPile,
      (next, prev) => {
        const previous = Array.isArray(prev) ? prev : [];
        const current = Array.isArray(next) ? next : [];
        if (current.length >= previous.length) return;
        hideActionButtonsNow();
      },
      { deep: true }
    );
    watch(
      () => [showChow.value, chowOptions.value.length],
      ([canChow, optionCount]) => {
        if (!canChow || optionCount <= 1) {
          showChowPicker.value = false;
          selectedChowOption.value = null;
        }
      }
    );
    watch(
      [() => actionApprovalEvent.value?.candidatePlayerId, () => gameState.value?.pendingActions],
      () => {
        const event = actionApprovalEvent.value;
        if (!event) return;
        const pending = gameState.value?.pendingActions || [];
        const stillPending = pending.some((pa) => pa.playerId === event.candidatePlayerId);
        if (!stillPending || event.expiresAt && event.expiresAt <= Date.now()) {
          actionApprovalEvent.value = null;
        }
      },
      { deep: true }
    );
    const showThinkOptions = ref(false);
    const thinkOptions = computed(() => {
      const opts = [];
      if (showHu.value) opts.push({ action: "hu", label: "胡", cssClass: "think-opt--hu" });
      if (showKong.value || showConcealedKong.value || showExtendedKong.value)
        opts.push({ action: "kong", label: "杠", cssClass: "think-opt--kong" });
      if (showPeng.value) opts.push({ action: "peng", label: "碰", cssClass: "think-opt--peng" });
      opts.push({ action: "cancel", label: "算了", cssClass: "think-opt--cancel" });
      return opts;
    });
    computed(() => {
      const pending = myPendingAction.value;
      if (!pending?.expiresAt) return 1;
      const totalMs = hesitationWindow.value;
      const leftMs = Math.max(0, pending.expiresAt - nowTs.value);
      return Math.max(0, Math.min(1, leftMs / totalMs));
    });
    const canCheatHu = computed(
      () => isAdminUser.value && isMyTurn.value && gameState.value?.phase === GamePhase.PLAYING
    );
    const onDraw = async () => {
      if (isDrawBlockedByDecisionLock.value) {
        showDrawBlockedNotice();
        return;
      }
      playSound("tile-draw");
      const success = await executeAction(ActionType.DRAW);
      if (!success && isDrawBlockedByDecisionLock.value) {
        showDrawBlockedNotice();
      }
    };
    const hideActionButtonsNow = () => {
      actionButtonsVisibleUntil.value = 0;
    };
    const submitChow = (tileIds) => {
      hideActionButtonsNow();
      playSound("tile-chow");
      showChowPicker.value = false;
      selectedChowOption.value = null;
      executeAction(ActionType.CHOW, void 0, tileIds);
    };
    const onChow = () => {
      if (chowOptions.value.length > 1) {
        showChowPicker.value = true;
        selectedChowOption.value = 0;
        return;
      }
      submitChow(chowOptions.value[0]?.tileIds);
    };
    const onPeng = () => {
      hideActionButtonsNow();
      playSound("tile-pong");
      executeAction(ActionType.PENG);
    };
    const onKong = () => {
      hideActionButtonsNow();
      selfPendingSupplementHighlight.value = true;
      playSound("tile-kong");
      executeAction(ActionType.KONG);
    };
    const onRebel = () => {
      playSound("tile-rebel");
      executeAction(ActionType.REBEL);
    };
    const onThink = () => {
      executeAction(ActionType.THINK);
    };
    const showSettlement = ref(false);
    const settlementData = ref(null);
    const lastAutoSettlementKey = ref("");
    const wallExhaustedCountdown = ref(5);
    const wallExhaustedTimer = ref(null);
    const isWallExhaustedSettlement = computed(() => wallExhaustedTimer.value !== null);
    const cancelWallExhaustedCountdown = () => {
      if (wallExhaustedTimer.value !== null) {
        clearInterval(wallExhaustedTimer.value);
        wallExhaustedTimer.value = null;
      }
      wallExhaustedCountdown.value = 0;
    };
    const startWallExhaustedCountdown = () => {
      wallExhaustedCountdown.value = 5;
      wallExhaustedTimer.value = (void 0).setInterval(() => {
        wallExhaustedCountdown.value--;
        if (wallExhaustedCountdown.value <= 0) {
          cancelWallExhaustedCountdown();
          void startNextRound();
        }
      }, 1e3);
    };
    const formatSignedScore = (score) => {
      const n = Number(score ?? 0);
      return n > 0 ? `+${n}` : String(n);
    };
    const FIXED_SETTLEMENT_FAN = {
      "风碰": 40,
      "风一色": 20,
      "清碰": 20,
      "混碰": 10,
      "大吊碰碰胡": 10,
      "大吊混一色": 10,
      "大吊清一色": 10,
      "大吊清碰": 20,
      "大吊风一色": 20,
      "大吊风碰": 40,
      "大吊": 10,
      "清一色": 10,
      "无花自摸": 10,
      "杠开": 10,
      "八花自摸": 20,
      "四百搭": 10
    };
    const parseFixedFanFromDetails = (details) => {
      if (!Array.isArray(details)) return null;
      for (const entry of details) {
        if (typeof entry !== "string") continue;
        const match = entry.match(/=\s*(\d+)番$/);
        if (match) return Number(match[1]);
      }
      return null;
    };
    const getSettlementBaseFanDisplay = (winner) => {
      if (!winner) return "-";
      const parsedFixedFan = parseFixedFanFromDetails(winner.details);
      if (parsedFixedFan != null) return parsedFixedFan;
      const fixedFan = FIXED_SETTLEMENT_FAN[winner.handTypeName || ""];
      if (typeof fixedFan === "number") return fixedFan;
      return winner.baseFan ?? "-";
    };
    const formatMeldTiles = (tiles) => {
      const sorted = [...tiles].sort((a, b) => {
        const suitOrder = { wan: 0, tiao: 1, dots: 2, feng: 3, jian: 4 };
        const sa = suitOrder[a.suit] ?? 99;
        const sb = suitOrder[b.suit] ?? 99;
        if (sa !== sb) return sa - sb;
        return (Number(a.value) || 0) - (Number(b.value) || 0);
      });
      return sorted.map((tile) => tileLabel(tile)).filter(Boolean).join("");
    };
    const formatWinnerTiles = (winner) => {
      const handTiles = Array.isArray(winner?.handTiles) ? winner.handTiles.filter((tile) => tile?.suit !== "hua" && tile?.suit !== "flower") : [];
      const exposedMeldGroups = Array.isArray(winner?.exposedMeldGroups) ? winner.exposedMeldGroups.map((group) => Array.isArray(group) ? group.filter((tile) => tile?.suit !== "hua" && tile?.suit !== "flower") : []).filter((group) => group.length > 0) : [];
      const concealedCombos = arrangeWinningHand(handTiles, []);
      const concealedGroups = Array.isArray(concealedCombos?.[0]?.groups) ? concealedCombos[0].groups : [];
      const concealedMelds = concealedGroups.map((group) => Array.isArray(group?.tiles) ? formatMeldTiles(group.tiles) : "").filter(Boolean);
      const exposedMelds = exposedMeldGroups.map((group) => formatMeldTiles(group)).filter(Boolean);
      const allMelds = [...concealedMelds, ...exposedMelds];
      if (allMelds.length) return allMelds.join("/");
      const exposedTiles = Array.isArray(winner?.exposedTiles) ? winner.exposedTiles : [];
      const tiles = [...handTiles, ...exposedTiles].filter((tile) => tile?.suit !== "hua" && tile?.suit !== "flower");
      if (tiles.length) return tiles.map(tileLabel).filter(Boolean).join("");
      return "-";
    };
    const getSettlementWinnerSequence = (round, playerId2) => {
      const winners = Array.isArray(round?.winners) ? round.winners : [];
      const index = winners.findIndex((winnerId) => winnerId === playerId2);
      return index >= 0 ? String(index + 1) : "";
    };
    const getSettlementPayerCount = (round, winner) => {
      const transfers = Array.isArray(round?.transfers) ? round.transfers : [];
      const payers = new Set(
        transfers.filter((transfer) => transfer?.toPlayerId === winner?.playerId && transfer?.fromPlayerId).map((transfer) => transfer.fromPlayerId)
      );
      return Math.max(1, payers.size);
    };
    const getRoundSettlementRows = (round) => {
      const winners = Array.isArray(round?.winnerDetails) ? round.winnerDetails : [];
      const winnerByPlayer = new Map(winners.map((winner) => [winner.playerId, winner]));
      const rows = (settlementData.value?.playerStats || []).map((player) => {
        const winner = winnerByPlayer.get(player.id);
        const score = Number(round?.scores?.[player.id] ?? 0);
        return {
          playerId: player.id,
          playerName: player.name,
          isWinner: !!winner,
          winSequence: winner ? getSettlementWinnerSequence(round, player.id) : "",
          handType: winner?.handTypeName || "-",
          tiles: winner ? formatWinnerTiles(winner) : "-",
          flowerCount: winner?.flowerCount ?? 0,
          menQing: winner ? typeof winner.isMenQing === "boolean" ? winner.isMenQing ? "门清" : "非门清" : "-" : "-",
          wild: winner ? typeof winner.hasWild === "boolean" ? winner.hasWild ? "有" : "无" : "-" : "-",
          baseFan: getSettlementBaseFanDisplay(winner),
          finalPoints: winner?.finalPoints ?? "-",
          winMode: winner ? winner.discarderId ? winner.discarderName || "未知" : `自摸 ${getSettlementPayerCount(round, winner)}家` : "-",
          score,
          scoreLabel: formatSignedScore(score)
        };
      });
      return rows.sort((a, b) => {
        if (a.isWinner && b.isWinner) {
          const seqA = Number(a.winSequence || Number.MAX_SAFE_INTEGER);
          const seqB = Number(b.winSequence || Number.MAX_SAFE_INTEGER);
          return seqA - seqB;
        }
        if (a.isWinner) return -1;
        if (b.isWinner) return 1;
        return 0;
      });
    };
    const currentSettlementRound = computed(() => {
      const rounds = Array.isArray(settlementData.value?.roundDetails) ? settlementData.value.roundDetails : [];
      return rounds.length > 0 ? rounds[rounds.length - 1] : null;
    });
    const settlementRoundIndex = computed(() => {
      if (gameState.value?.roundStats && Array.isArray(gameState.value.roundStats)) {
        return gameState.value.roundStats.length;
      }
      if (currentSettlementRound.value?.roundNumber) {
        return currentSettlementRound.value.roundNumber;
      }
      return 1;
    });
    const currentSettlementRows = computed(() => {
      return currentSettlementRound.value ? getRoundSettlementRows(currentSettlementRound.value) : [];
    });
    const isSettleRequested = ref(false);
    const sortedSettleStats = computed(() => {
      const stats = settlementData.value?.playerStats || [];
      return [...stats].sort((a, b) => (b.totalScore ?? 0) - (a.totalScore ?? 0));
    });
    const onRequestSettle = async () => {
      try {
        const res = await $fetch("/mahjong/api/game/settle", {
          method: "POST",
          body: {
            gameId: roomId.value,
            playerId: currentPlayer.value?.id,
            action: "request",
            debugAccessToken: typeof route.query.debugAccessToken === "string" ? route.query.debugAccessToken : void 0
          }
        });
        if (res?.success) {
          settlementData.value = res.data;
          isSettleRequested.value = true;
          addBroadcast("🏠 房主已申请本局结束后退房，本局结束将自动结算", "warn");
        }
      } catch (e) {
        console.error("[Settle] Failed:", e);
      }
    };
    const showPlayerCard = ref(false);
    const playerCardPlayer = ref(null);
    const isBotPlayer = (p) => p?.name?.startsWith("AI-") || p?.name?.startsWith("电脑") || false;
    const isSpectatorGamePlayer = computed(() => {
      if (!gameState.value?.players || !currentPlayer.value) return true;
      return !gameState.value.players.some((p) => p.id === currentPlayer.value?.id);
    });
    const mySwapInfo = ref({ totalChances: 0, usedChances: 0, remaining: 0 });
    const canSwap = computed(() => mySwapInfo.value.remaining > 0);
    const canOpenPlayerCardFor = (player) => {
      if (!player) return false;
      if (player.id === currentPlayer.value?.id) return true;
      if (isBotPlayer(player)) return true;
      if (canUseSpectatorView.value) return true;
      if (canSwap.value) return true;
      return false;
    };
    const onPlayerNameClick = (player) => {
      if (!player) return;
      if (!canOpenPlayerCardFor(player)) return;
      playerCardPlayer.value = player;
      showPlayerCard.value = true;
    };
    const isReplacingBot = ref(false);
    const updateSwapInfo = async () => {
      if (!currentPlayer.value || !gameState.value) return;
      const threshold = gameState.value.liangShanThreshold ?? 4e3;
      const sm = gameState.value.settlementMultiplier ?? 1;
      const alerts = gameState.value.qjAlerts || [];
      alerts.find((a) => a.playerId === currentPlayer.value?.id);
      const roundStats = gameState.value.roundStats || [];
      let myCumulative = 0;
      for (const rs of roundStats) {
        const s = rs.scores?.[currentPlayer.value.id] ?? 0;
        if (s > 0) myCumulative += s;
      }
      const myEffective = myCumulative * sm;
      if (myEffective < 0) {
        const absScore = Math.abs(myEffective);
        const totalChances = Math.min(Math.floor(absScore / threshold), 10);
        const used = (gameState.value.swapRequests || []).filter((r) => r.playerId === currentPlayer.value?.id).length;
        mySwapInfo.value = { totalChances, usedChances: used, remaining: totalChances - used };
      } else {
        mySwapInfo.value = { totalChances: 0, usedChances: 0, remaining: 0 };
      }
    };
    const showLiangShanButton = computed(() => gameState.value?.phase === "playing");
    const dealerDiscardCount = computed(() => {
      const history = Array.isArray(gameState.value?.actionHistory) ? gameState.value.actionHistory : [];
      const dealerIndex = Number(gameState.value?.dealerIndex ?? -1);
      const dealerId = dealerIndex >= 0 ? gameState.value?.players?.[dealerIndex]?.id : "";
      if (!dealerId) return 0;
      return history.filter((action) => action?.type === ActionType.DISCARD && action?.playerId === dealerId).length;
    });
    const canLiangShan = computed(() => {
      return gameState.value?.phase === "playing" && dealerDiscardCount.value < 3;
    });
    const hasVotedLiangShan = computed(() => {
      const votes = gameState.value?.liangShanVotes || [];
      return votes.includes(currentPlayer.value?.id);
    });
    const onLiangShan = () => {
      if (dealerDiscardCount.value >= 3) {
        addBroadcast("⚠️ 已过三巡，不允许聚义", "warn");
        return;
      }
      const myName = currentPlayer.value?.name || "玩家";
      const votes = gameState.value?.liangShanVotes || [];
      if (votes.length === 0) {
        addBroadcast(`🔥 ${myName} 发起了梁山聚义！`, "special");
      } else {
        addBroadcast(`🔥 ${myName} 响应了梁山聚义！`, "special");
      }
      playSound("tile-rebel");
      executeAction(ActionType.LIANG_SHAN);
    };
    const handleCircularAction = (type) => {
      switch (type) {
        case "draw":
          void onDraw();
          break;
        case "chow":
          onChow();
          break;
        case "peng":
          onPeng();
          break;
        case "kong":
          if (showKong.value) {
            onKong();
          } else if (showExtendedKong.value) {
            onExtendedKong();
          } else if (showConcealedKong.value) {
            onConcealedKong();
          }
          break;
        case "hu":
          onHu();
          break;
        case "think":
          onThink();
          break;
        case "rebel":
          onRebel();
          break;
        case "liangshan":
          onLiangShan();
          break;
      }
    };
    const showConcealedKong = computed(() => availableActions.value.includes(ActionType.CONCEALED_KONG));
    const showExtendedKong = computed(() => availableActions.value.includes(ActionType.EXTENDED_KONG));
    const hasPriorityActions = computed(
      () => hasSharedDrawWindow.value || showChow.value || showPeng.value || showKong.value || showHu.value || showConcealedKong.value || showExtendedKong.value
    );
    watch([isMyTurn, hasPriorityActions], ([myTurn, hasActions]) => {
      if (isAIControlled.value) return;
      if (myTurn || hasActions) {
        startTurnTimer();
      } else {
        stopTurnTimer();
      }
    });
    const actionWindowText = computed(() => {
      if (!hasPriorityActions.value && !isMyTurn.value) return "";
      const pending = myPendingAction.value;
      const expiresAt = Number(pending?.expiresAt ?? 0);
      if (!expiresAt) return "";
      const leftMs = Math.max(0, expiresAt - nowTs.value);
      return `响应窗口：${(leftMs / 1e3).toFixed(1)}s（超时自动过）`;
    });
    const showMobileActionNotice = computed(
      () => shouldRotateView.value && (hasPriorityActions.value || showDraw.value || availableActions.value.includes(ActionType.DISCARD))
    );
    const mobileActionNoticeText = computed(() => {
      const labels = [];
      if (showDraw.value) labels.push("摸");
      if (availableActions.value.includes(ActionType.DISCARD)) labels.push("出");
      if (showHu.value) labels.push("胡");
      if (showKong.value || showConcealedKong.value || showExtendedKong.value) labels.push("杠");
      if (showPeng.value) labels.push("碰");
      if (showChow.value) labels.push("吃");
      if (!labels.length) return "有可用操作，请向下查看按钮";
      return `可操作：${labels.join(" / ")}`;
    });
    const onConcealedKong = () => {
      if (!currentPlayer.value) return;
      const counts = {};
      for (const t of currentPlayer.value.hand.concealedTiles) {
        const key = `${t.suit}-${t.value}`;
        if (!counts[key]) counts[key] = [];
        counts[key].push(t);
      }
      for (const key in counts) {
        const group = counts[key];
        if (group && group.length === 4) {
          playSound("kong-draw");
          selfPendingSupplementHighlight.value = true;
          executeAction(ActionType.CONCEALED_KONG, void 0, group.map((t) => t.id));
          return;
        }
      }
    };
    const onExtendedKong = () => {
      if (!currentPlayer.value) return;
      for (const meld of currentPlayer.value.hand.exposedMelds) {
        if (meld.type === "triplet" && meld.tiles.length) {
          const baseTile = meld.tiles[0];
          const match = currentPlayer.value.hand.concealedTiles.find(
            (t) => t.suit === baseTile.suit && t.value === baseTile.value
          );
          if (match) {
            playSound("kong-draw");
            selfPendingSupplementHighlight.value = true;
            executeAction(ActionType.EXTENDED_KONG, match.id);
            return;
          }
        }
      }
    };
    const onRerollDice = () => {
      diceValues.value = [
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1
      ];
      hasDicePreview.value = true;
      playSound("dice-roll");
    };
    const onDealTiles = async () => {
      if (!showDiceOverlay.value || isGameStarting.value) return;
      isGameStarting.value = true;
      hasDicePreview.value = false;
      showDiceOverlay.value = false;
      showDoubleReminder.value = false;
      await new Promise((resolve) => setTimeout(resolve, 350));
      console.log("[onDealTiles] Calling startGame API...");
      try {
        await startGame({ hesitationWindow: hesitationWindow.value, fixedDice: diceValues.value });
        console.log("[onDealTiles] startGame done, forcing fresh state...");
        await forceRefreshState();
        console.log("[onDealTiles] Done, phase:", gameState.value?.phase);
      } finally {
        isGameStarting.value = false;
      }
    };
    const broadcastMessages = ref([]);
    const displayBroadcastMessages = computed(() => {
      if (!isPreGameTransition.value) return broadcastMessages.value;
      const msgs = [];
      if (!gameState.value) {
        msgs.push({ id: -1, text: "⏳ 正在连接牌桌…", type: "info", timestamp: Date.now(), timeLabel: "NOW" });
      } else {
        const room = gameState.value.roomNumber || "----";
        const count = waitingPlayers.value.length;
        msgs.push({
          id: -2,
          text: `🏠 房间号 #${room} · ${count}/4 人`,
          type: "info",
          timestamp: Date.now(),
          timeLabel: "NOW"
        });
        if (count >= 4 && isDealerUser.value) {
          msgs.push({
            id: -3,
            text: "✅ 四人已到齐，点击下方按钮开始牌局",
            type: "info",
            timestamp: Date.now(),
            timeLabel: "NOW"
          });
        } else {
          msgs.push({
            id: -3,
            text: count >= 4 ? "✅ 四人已到齐，等待房主开始牌局" : "💬 等待其他玩家加入",
            type: "info",
            timestamp: Date.now(),
            timeLabel: "NOW"
          });
        }
        waitingPlayers.value.forEach((p, i) => {
          const isDealer2 = p.isDealer ? " · 房主" : "";
          const isBot = p.isBot ? " 🤖" : "";
          msgs.push({
            id: -4 - i,
            text: `👤 ${p.name}${isDealer2}${isBot} 已就位`,
            type: "info",
            timestamp: Date.now(),
            timeLabel: "NOW"
          });
        });
      }
      const realMsgs = broadcastMessages.value.slice(-3);
      return [...msgs, ...realMsgs].slice(0, 8);
    });
    let broadcastId = 0;
    const recentBroadcastTexts = /* @__PURE__ */ new Map();
    const addBroadcast = (text, type = "info", options) => {
      const now = Date.now();
      const timeLabel = formatBeijingTime(now);
      const sanitizedText = type === "win" ? text.replace(/(胡牌)\s*[·•･][^·•･()（）\s]+/u, "$1") : text;
      const dedupeKey = sanitizedText;
      const lastAt = recentBroadcastTexts.get(dedupeKey) ?? 0;
      if (now - lastAt < 1500) {
        return;
      }
      recentBroadcastTexts.set(dedupeKey, now);
      for (const [key, ts] of recentBroadcastTexts) {
        if (now - ts > 1e4) recentBroadcastTexts.delete(key);
      }
      broadcastMessages.value.push({ id: ++broadcastId, text: sanitizedText, type, timestamp: now, timeLabel });
      if (broadcastMessages.value.length > 20) {
        broadcastMessages.value = broadcastMessages.value.slice(-20);
      }
    };
    watch(
      () => [gameState.value?.phase, gameState.value?.roundStats?.length ?? 0, gameState.value?.gameId, gameState.value?.endReason],
      async ([phase, roundCount, gameId, endReason]) => {
        if (phase !== GamePhase.ENDED || !gameId || !currentPlayer.value?.id) return;
        if (endReason === GameEndReason.WALL_EXHAUSTED) {
          const lastRound = gameState.value?.roundStats?.[gameState.value.roundStats.length - 1];
          if (lastRound) {
            settlementData.value = {
              roundDetails: [{
                ...lastRound,
                winnerDetails: []
              }],
              playerStats: (gameState.value?.players || []).map((p) => ({
                id: p.id,
                name: p.name,
                totalScore: p.score ?? 0
              }))
            };
            showSettlement.value = true;
            startWallExhaustedCountdown();
          }
          return;
        }
        const settlementKey = `${gameId}-${roundCount}`;
        if (lastAutoSettlementKey.value === settlementKey) return;
        lastAutoSettlementKey.value = settlementKey;
        await onRequestSettle();
      }
    );
    const prevWinnersCount = ref(0);
    const prevPhase = ref("");
    ref("");
    ref(/* @__PURE__ */ new Set());
    ref(null);
    const prevLiangShanVoteCount = ref(0);
    const prevLiangShanVoteIds = ref([]);
    const prevQjAlertIds = ref(/* @__PURE__ */ new Set());
    const prevSwapRequestIds = ref(/* @__PURE__ */ new Set());
    const prevIsMyTurn = ref(false);
    const lastFastDiscardAt = ref(0);
    ref(0);
    const voicedDiscardTiles = /* @__PURE__ */ new Map();
    const voicedDiscardFingerprints = /* @__PURE__ */ new Map();
    const getDiscardVoiceFingerprint = (tile) => {
      if (!tile?.suit) return "";
      return `${tile.suit}-${tile.value}`;
    };
    const markDiscardAudioPlayed = (tileOrId) => {
      const now = Date.now();
      const tileId = typeof tileOrId === "string" ? tileOrId : tileOrId?.id;
      const fingerprint = typeof tileOrId === "string" ? "" : getDiscardVoiceFingerprint(tileOrId);
      if (tileId) voicedDiscardTiles.set(tileId, now);
      if (fingerprint) voicedDiscardFingerprints.set(fingerprint, now);
      for (const [id, ts] of voicedDiscardTiles) {
        if (now - ts > DISCARD_VOICE_DEDUP_MS) voicedDiscardTiles.delete(id);
      }
      for (const [fingerprintKey, ts] of voicedDiscardFingerprints) {
        if (now - ts > DISCARD_VOICE_DEDUP_MS) voicedDiscardFingerprints.delete(fingerprintKey);
      }
    };
    const recentlyPlayedDiscardAudio = (tile) => {
      if (!tile) return false;
      const now = Date.now();
      const lastById = tile.id ? voicedDiscardTiles.get(tile.id) : void 0;
      const fingerprint = getDiscardVoiceFingerprint(tile);
      const lastByFingerprint = fingerprint ? voicedDiscardFingerprints.get(fingerprint) : void 0;
      return !!(lastById && now - lastById < DISCARD_VOICE_DEDUP_MS || lastByFingerprint && now - lastByFingerprint < DISCARD_VOICE_DEDUP_MS);
    };
    watch(isMyTurn, (isMe) => {
      if (isMe && !prevIsMyTurn.value) {
        playSound("turn-notify");
      }
      prevIsMyTurn.value = isMe;
    });
    const prevOtherPlayerState = /* @__PURE__ */ new Map();
    const getOtherMeldCount = (player) => player?.hand?.exposedMelds?.length ?? 0;
    const getOtherDiscardCount = (player) => player?.hand?.discardedTiles?.length ?? 0;
    const getReplacedFlowerMelds = (player) => (player?.hand?.exposedMelds || []).filter((meld) => {
      const tile = meld?.tiles?.[0];
      return meld?.tiles?.length === 1 && tile?.suit === "hua" && !!meld?.replacementDone;
    });
    const checkOtherPlayerSounds = (newState) => {
      if (!newState?.players) return;
      const pendingMeldVoices = [];
      for (const player of newState.players) {
        const prev = prevOtherPlayerState.get(player.id);
        const meldCount = getOtherMeldCount(player);
        const discardCount = getOtherDiscardCount(player);
        const replacedFlowerMelds = getReplacedFlowerMelds(player);
        const replacedFlowerCount = replacedFlowerMelds.length;
        if (prev) {
          const isSelf = player.id === playerId.value;
          if (replacedFlowerCount > prev.replacedFlowerCount) {
            if (!isSelf) {
              playSound("tile-draw");
            }
            addBroadcast(`🌸 ${player.name}补花`, "special");
          }
          if (!isSelf && discardCount > prev.discardCount && Date.now() - lastFastDiscardAt.value > 250) {
            const newDiscards = (player.hand?.discardedTiles || []).slice(prev.discardCount);
            const lastNew = newDiscards[newDiscards.length - 1];
            if (!recentlyPlayedDiscardAudio(lastNew)) {
              playSound("tile-discard");
              if (lastNew?.suit) playVoiceTile2(lastNew.suit, lastNew.value);
              markDiscardAudioPlayed(lastNew);
            }
          }
          if (meldCount > prev.meldCount) {
            const newMelds = (player.hand?.exposedMelds || []).slice(prev.meldCount);
            for (const m of newMelds) {
              const firstTile = m.tiles?.[0];
              const isFlowerReplacementMeld = m.tiles?.length === 1 && firstTile?.suit === "hua";
              if (isFlowerReplacementMeld) continue;
              if (m.type === "kong" || m.tiles?.length === 4) {
                if (!isSelf) pendingMeldVoices.push("kong");
                addBroadcast(`🀄 ${player.name}杠牌`, "info");
              } else if (m.type === "triplet") {
                if (!isSelf) pendingMeldVoices.push("pong");
                addBroadcast(`👊 ${player.name}碰牌`, "info");
              } else {
                if (!isSelf) pendingMeldVoices.push("chow");
                addBroadcast(`🍜 ${player.name}吃牌`, "info");
              }
            }
          }
        }
        prevOtherPlayerState.set(player.id, { meldCount, discardCount, replacedFlowerCount });
      }
      const currentIds = new Set(newState.players.map((p) => p.id));
      for (const id of prevOtherPlayerState.keys()) {
        if (!currentIds.has(id)) prevOtherPlayerState.delete(id);
      }
      for (const action of pendingMeldVoices) {
        if (action === "kong") {
          playSound("tile-kong");
        } else if (action === "pong") {
          playSound("tile-pong");
        } else {
          playSound("tile-chow");
        }
      }
    };
    const activePlayerCount = (state) => (state?.players || []).filter((p) => p.status === "playing").length;
    watch(() => gameState.value, (newState, oldState) => {
      if (!newState) return;
      if (newState.phase === "playing" && prevPhase.value === "waiting") {
        addBroadcast("🎉 房间满员，正式开干啦！", "info");
        playSound("game-start");
      }
      if (newState.phase === "playing" && prevPhase.value !== "playing") {
        const existingAlerts = newState.qjAlerts || [];
        for (const alert of existingAlerts) {
          addBroadcast(`📢 ${alert.playerName} 已达被聚义QJ线，特此广而告之！`, "special");
        }
        prevQjAlertIds.value = new Set(existingAlerts.map((a) => a.playerId));
      }
      if (newState.winnersCount > prevWinnersCount.value && prevPhase.value === "playing") {
        const newWinners = (newState.players || []).filter(
          (p) => p.status === "won" && p.winOrder === newState.winnersCount
        );
        const bailoutRels = newState.bailoutRelations || [];
        for (const w of newWinners) {
          const method = w.winRound ? `第${w.winRound}轮` : "";
          const handType = w.winHandType ? `·${w.winHandType}` : "";
          const rel = bailoutRels.find((r) => r.player1 === w.id || r.player2 === w.id);
          const partnerId = rel ? rel.player1 === w.id ? rel.player2 : rel.player1 : null;
          const partner = partnerId ? (newState.players || []).find((p) => p.id === partnerId) : null;
          const bailInfo = rel && partner ? ` · ${rel.type}包${partner.name}` : "";
          addBroadcast(`🏆 ${w.name} ${method}胡牌${handType}${bailInfo}`, "win");
        }
        playSound("round-end");
      }
      if (newState.phase === "ended" && oldState?.phase === "playing") {
        const reason = newState.endReason;
        if (reason === "wall_exhausted") {
          addBroadcast("💨 牌墙摸完，流局！倍数翻倍！", "warn");
        }
        playSound("round-draw");
      }
      checkOtherPlayerSounds(newState);
      const history = newState.actionHistory || [];
      if (history.length > 0) {
        const lastAction = history[history.length - 1];
        const lastTs = lastAction?.timestamp || 0;
        const now = Date.now();
        if (now - lastTs < 3e3) {
          if (lastAction.type === "rebel") {
            const player = newState.players?.find((p) => p.id === lastAction.playerId);
            if (player) addBroadcast(`⚔️ ${player.name} 提议梁山聚义！造反！`, "special");
          }
        }
      }
      const currentVoteIds = newState.liangShanVotes || [];
      const currentVotes = currentVoteIds.length;
      if (currentVotes > prevLiangShanVoteCount.value) {
        if (currentVotes === 1) {
          const voter = newState.players?.find((p) => p.id === currentVoteIds[0]);
          addBroadcast(`🔥 ${voter?.name || "某玩家"} 发起了梁山聚义！`, "special");
        } else if (currentVotes >= activePlayerCount(newState)) {
          addBroadcast(`🔥🔥🔥 全员响应梁山聚义！本局结束，下把翻倍！`, "special");
          showLiangShanOverlay.value = true;
          setTimeout(() => {
            showLiangShanOverlay.value = false;
          }, 200);
        } else {
          const newResponderIds = currentVoteIds.filter((id) => !prevLiangShanVoteIds.value.includes(id));
          const initiatorId = currentVoteIds[0];
          const initiator = newState.players?.find((p) => p.id === initiatorId);
          const responderNames = newResponderIds.filter((id) => id !== initiatorId).map((id) => newState.players?.find((p) => p.id === id)?.name).filter(Boolean);
          for (const responderName of responderNames) {
            addBroadcast(`🔥 ${responderName} 响应了${initiator?.name || "发起者"}的梁山聚义！`, "special");
          }
          addBroadcast(`🔥 有${currentVotes}名玩家响应了梁山聚义！`, "special");
        }
      }
      prevLiangShanVoteCount.value = currentVotes;
      prevLiangShanVoteIds.value = [...currentVoteIds];
      const currentAlerts = newState.qjAlerts || [];
      const currentAlertIds = new Set(currentAlerts.map((a) => a.playerId));
      for (const alert of currentAlerts) {
        if (!prevQjAlertIds.value.has(alert.playerId)) {
          addBroadcast(`📢 ${alert.playerName} 已达被聚义QJ线，特此广而告之！`, "special");
        }
      }
      prevQjAlertIds.value = currentAlertIds;
      const currentSwapRequests = newState.swapRequests || [];
      const currentSwapIds = new Set(currentSwapRequests.map((r) => `${r.playerId}-${r.targetId}`));
      for (const req of currentSwapRequests) {
        const key = `${req.playerId}-${req.targetId}`;
        if (!prevSwapRequestIds.value.has(key)) {
          const from = (newState.players || []).find((p) => p.id === req.playerId);
          const to = (newState.players || []).find((p) => p.id === req.targetId);
          if (from && to) addBroadcast(`🔄 ${from.name} 下一局开始将与 ${to.name} 互换位置`, "special");
        }
      }
      prevSwapRequestIds.value = currentSwapIds;
      updateSwapInfo();
      prevPhase.value = newState.phase;
      prevWinnersCount.value = newState.winnersCount || 0;
    }, { deep: true });
    watch(
      () => gameState.value?.phase,
      (newPhase, oldPhase) => {
        console.log("[DiceOverlay] phase changed:", oldPhase, "->", newPhase, "showDiceOverlay was:", showDiceOverlay.value);
        if (newPhase === GamePhase.STARTING) {
          const prevPhase2 = oldPhase || gameState.value?.phase;
          showSettlement.value = false;
          settlementData.value = null;
          isHuReviewMode.value = false;
          showHuPanel.value = false;
          if (!hasDicePreview.value) {
            const serverDice = gameState.value?.dice;
            if (serverDice && Array.isArray(serverDice) && serverDice.length >= 2) {
              diceValues.value = [serverDice[0], serverDice[1]];
              hasDicePreview.value = true;
            } else {
              diceValues.value = [1, 1];
            }
          }
          showDiceOverlay.value = true;
          console.log("[DiceOverlay] SET to true (STARTING)");
          if (prevPhase2 === GamePhase.ENDED) {
            if (isSettleRequested.value) {
              showDiceOverlay.value = false;
              showSettlement.value = true;
              return;
            }
            (void 0).setTimeout(() => {
              const dealer = dealerPlayer.value;
              if (dealer && isBotPlayer(dealer)) {
                autoRollAndDeal();
              } else if (dealer && !isBotPlayer(dealer)) {
                autoRollOnly();
              } else ;
            }, 500);
          }
          return;
        }
        if (newPhase !== GamePhase.STARTING) {
          showDiceOverlay.value = false;
          hasDicePreview.value = false;
          console.log("[DiceOverlay] SET to false (phase=", newPhase, ")");
        }
      },
      { immediate: true }
    );
    watch(gameState, (newVal) => {
      if (newVal && newVal.phase !== GamePhase.STARTING && showDiceOverlay.value) {
        console.log("[DiceOverlay] FALLBACK: closing dice overlay (phase=", newVal.phase, ")");
        showDiceOverlay.value = false;
        hasDicePreview.value = false;
      }
    }, { deep: false });
    watch(showDiceOverlay, (val) => {
      if (!val) return;
      setTimeout(() => {
        if (showDiceOverlay.value && gameState.value?.phase !== GamePhase.STARTING) {
          console.log("[DiceOverlay] TIMEOUT: forced close after 8s");
          showDiceOverlay.value = false;
          hasDicePreview.value = false;
        }
      }, 8e3);
    });
    const otherPlayers = computed(() => {
      if (!gameState.value || !currentPlayer.value) return [];
      return gameState.value.players.filter((p) => p.id !== currentPlayer.value.id);
    });
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<!--[--><div class="${ssrRenderClass([[
        { "layout-debug": showDebugPanel.value, "mobile-portrait": shouldRotateView.value },
        { "layout--mobile-landscape": isMobileLandscapeMode.value || shouldRotateView.value },
        { "layout--desktop": !isMobileViewport.value }
      ], "mahjong-page"])}" style="${ssrRenderStyle(mobileLayoutStyle.value)}" data-v-dcbaa364><div class="${ssrRenderClass([{ "room-viewport--rotated": shouldRotateView.value }, "room-viewport"])}" data-v-dcbaa364><div class="${ssrRenderClass([{ "room-container--rotated": shouldRotateView.value, "room-container--mobile-landscape": isMobileLandscapeMode.value }, "room-container"])}" data-v-dcbaa364><header class="${ssrRenderClass([{ "room-header--collapsed": isTopBarCollapsed.value }, "room-header"])}" data-v-dcbaa364><button class="${ssrRenderClass([{ "room-header-toggle--collapsed": isTopBarCollapsed.value }, "room-header-toggle"])}"${ssrRenderAttr("aria-expanded", String(!isTopBarCollapsed.value))}${ssrRenderAttr("title", isTopBarCollapsed.value ? "展开顶部栏" : "收起顶部栏")} data-v-dcbaa364><span class="room-header-toggle__icon" data-v-dcbaa364>${ssrInterpolate(isTopBarCollapsed.value ? "▼" : "▲")}</span><span class="room-header-toggle__label" data-v-dcbaa364>${ssrInterpolate(isTopBarCollapsed.value ? "展开菜单" : "收起菜单")}</span></button><div class="room-header-content" style="${ssrRenderStyle(!isTopBarCollapsed.value ? null : { display: "none" })}" data-v-dcbaa364><div class="room-info" data-v-dcbaa364><div class="room-title-line" data-v-dcbaa364><h1 class="mahjong-title" data-v-dcbaa364>长清阁麻将</h1>`);
      if (unref(currentRound) > 0) {
        _push(`<span class="round-info-header" data-v-dcbaa364>${ssrInterpolate(roundDisplay.value)}</span>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div></div><div class="header-actions" data-v-dcbaa364><button class="mahjong-button small secondary" data-v-dcbaa364> ⚙️ 设置 </button><button class="mahjong-button small secondary" data-v-dcbaa364> 📖 规则 </button><button class="mahjong-button small" data-v-dcbaa364> 返回大厅 </button></div></div></header><main class="room-main" data-v-dcbaa364>`);
      if (!unref(gameState)) {
        _push(`<div class="loading-overlay" data-v-dcbaa364><div class="loading-spinner" data-v-dcbaa364></div><p class="loading-text" data-v-dcbaa364>正在进入牌桌...</p></div>`);
      } else {
        _push(`<!---->`);
      }
      if (showLiangShanOverlay.value) {
        _push(`<div class="liang-shan-overlay" data-v-dcbaa364><div class="liang-shan-card" data-v-dcbaa364><div class="liang-shan-icon" data-v-dcbaa364>🔥🔥🔥</div><p class="liang-shan-title" data-v-dcbaa364>聚义成功，共上梁山！</p><p class="liang-shan-sub" data-v-dcbaa364>本局结束 · 下把翻倍</p></div></div>`);
      } else {
        _push(`<!---->`);
      }
      if (unref(leadingBrotherEvent)) {
        _push(`<div class="leading-brother-overlay" data-v-dcbaa364><div class="leading-brother-card" data-v-dcbaa364><div class="lb-icon" data-v-dcbaa364>🙏💰</div><p class="lb-title" data-v-dcbaa364>谢谢带头大哥！</p><p class="lb-sub" data-v-dcbaa364>${ssrInterpolate(unref(leadingBrotherEvent).firstPlayerName)} 连打同张，赔付三家各10分</p></div></div>`);
      } else {
        _push(`<!---->`);
      }
      if (showApprovalOverlay.value && unref(actionApprovalEvent) && unref(actionApprovalEvent).candidatePlayerId === unref(currentPlayer)?.id) {
        _push(`<div class="approval-overlay" data-v-dcbaa364><div class="approval-card" data-v-dcbaa364><div class="approval-icon" data-v-dcbaa364>⚡🀄</div><p class="approval-title" data-v-dcbaa364>${ssrInterpolate(unref(actionApprovalEvent).requesterAction === "吃" ? "吃碰/胡冲突" : unref(actionApprovalEvent).requesterAction === "碰" ? "碰胡冲突" : "杠胡冲突")}！</p><p class="approval-sub" data-v-dcbaa364>${ssrInterpolate(unref(actionApprovalEvent).requesterName)} 要${ssrInterpolate(unref(actionApprovalEvent).requesterAction)}这张牌</p><p class="approval-question" data-v-dcbaa364>你要用${ssrInterpolate(unref(actionApprovalEvent).availableActions.map((a) => a === "hu" ? "胡" : a === "peng" ? "碰" : "杠").join("/"))}吗？</p><div class="${ssrRenderClass([{ "approval-countdown--urgent": approvalCountdownRatio.value < 0.3 }, "approval-countdown"])}" data-v-dcbaa364><div class="approval-countdown-bar" style="${ssrRenderStyle({ width: `${approvalCountdownRatio.value * 100}%` })}" data-v-dcbaa364></div><span class="approval-countdown-text" data-v-dcbaa364>${ssrInterpolate(approvalCountdownSec.value)}s</span></div><div class="approval-buttons" data-v-dcbaa364>`);
        if (unref(actionApprovalEvent).availableActions.includes("hu")) {
          _push(`<button class="approval-btn approval-btn--hu" data-v-dcbaa364>胡！</button>`);
        } else {
          _push(`<!---->`);
        }
        if (unref(actionApprovalEvent).availableActions.includes("kong")) {
          _push(`<button class="approval-btn approval-btn--kong" data-v-dcbaa364>杠！</button>`);
        } else {
          _push(`<!---->`);
        }
        if (unref(actionApprovalEvent).availableActions.includes("peng")) {
          _push(`<button class="approval-btn approval-btn--peng" data-v-dcbaa364>碰！</button>`);
        } else {
          _push(`<!---->`);
        }
        _push(`<button class="approval-btn approval-btn--pass" data-v-dcbaa364>算了，给他${ssrInterpolate(unref(actionApprovalEvent).requesterAction)}</button></div></div></div>`);
      } else {
        _push(`<!---->`);
      }
      if (showApprovalOverlay.value && unref(actionApprovalEvent) && unref(actionApprovalEvent).candidatePlayerId !== unref(currentPlayer)?.id && isMyApprovalWaiting.value) {
        _push(`<div class="approval-waiting-overlay" data-v-dcbaa364><div class="approval-waiting-card" data-v-dcbaa364><div class="approval-waiting-icon" data-v-dcbaa364>⏳</div><p class="approval-waiting-text" data-v-dcbaa364>等待其他家做决定...</p><p class="approval-waiting-sub" data-v-dcbaa364>你${ssrInterpolate(unref(actionApprovalEvent).requesterAction)}了这张牌，等待${ssrInterpolate(unref(actionApprovalEvent).availableActions.map((a) => a === "hu" ? "胡" : a === "peng" ? "碰" : "杠").join("/"))}</p></div></div>`);
      } else {
        _push(`<!---->`);
      }
      if (spectatorApprovalRequest.value) {
        _push(`<div class="approval-overlay" data-v-dcbaa364><div class="approval-card" data-v-dcbaa364><div class="approval-icon" data-v-dcbaa364>👁️</div><p class="approval-title" data-v-dcbaa364>观赛申请</p><p class="approval-sub" data-v-dcbaa364>${ssrInterpolate(spectatorApprovalRequest.value.requesterName)} 想查看你的手牌</p><p class="approval-question" data-v-dcbaa364>是否同意本局向 TA 开放你的观赛视角？</p><div class="approval-buttons" data-v-dcbaa364><button class="approval-btn approval-btn--peng" data-v-dcbaa364>同意</button><button class="approval-btn approval-btn--pass" data-v-dcbaa364>拒绝</button></div></div></div>`);
      } else {
        _push(`<!---->`);
      }
      if (showThinkOptions.value) {
        _push(`<div class="think-overlay" data-v-dcbaa364><div class="think-card" data-v-dcbaa364><div class="think-icon" data-v-dcbaa364>🧠</div><p class="think-title" data-v-dcbaa364>容我想一想</p><p class="think-sub" data-v-dcbaa364>选择你的操作：</p><div class="think-options" data-v-dcbaa364><!--[-->`);
        ssrRenderList(thinkOptions.value, (opt) => {
          _push(`<button class="${ssrRenderClass([opt.cssClass, "think-opt"])}" data-v-dcbaa364>${ssrInterpolate(opt.label)}</button>`);
        });
        _push(`<!--]--></div></div></div>`);
      } else {
        _push(`<!---->`);
      }
      if (showChowPicker.value) {
        _push(`<div class="chow-picker-overlay" data-v-dcbaa364><div class="chow-picker-card" data-v-dcbaa364><h3 class="chow-picker-title" data-v-dcbaa364>选择吃牌组合</h3><p class="chow-picker-sub" data-v-dcbaa364>这张牌有多种吃法，请先选择组合。</p><div class="chow-picker-options" data-v-dcbaa364><!--[-->`);
        ssrRenderList(chowOptions.value, (option, index) => {
          _push(`<button class="${ssrRenderClass([{ "chow-picker-option--selected": selectedChowOption.value === index }, "chow-picker-option"])}" data-v-dcbaa364><div class="chow-picker-tiles" data-v-dcbaa364><!--[-->`);
          ssrRenderList(option.previewTiles, (tile) => {
            _push(ssrRenderComponent(MahjongTile, {
              key: tile.id,
              tile,
              size: 26
            }, null, _parent));
          });
          _push(`<!--]--></div><span class="chow-picker-label" data-v-dcbaa364>${ssrInterpolate(option.label)}</span></button>`);
        });
        _push(`<!--]--></div><div class="chow-picker-actions" data-v-dcbaa364><button class="mahjong-button small secondary" data-v-dcbaa364>取消</button><button class="mahjong-button small"${ssrIncludeBooleanAttr(selectedChowOption.value === null) ? " disabled" : ""} data-v-dcbaa364>确认吃牌</button></div></div></div>`);
      } else {
        _push(`<!---->`);
      }
      if (showHuPanel.value) {
        _push(`<div class="hu-panel-overlay" data-v-dcbaa364><div class="hu-panel" data-v-dcbaa364><h3 class="hu-panel-title" data-v-dcbaa364>🀄 选择胡牌牌型</h3><div class="hu-combos" data-v-dcbaa364><!--[-->`);
        ssrRenderList(activeHuOptions.value, (opt, idx) => {
          _push(`<div class="${ssrRenderClass([{ "hu-combo--selected": selectedHuCombo.value === idx }, "hu-combo"])}" data-v-dcbaa364><div class="hu-combo-header" data-v-dcbaa364><span class="hu-combo-rank" data-v-dcbaa364>TOP ${ssrInterpolate(idx + 1)}</span><span class="hu-combo-label" data-v-dcbaa364>${ssrInterpolate(opt.label.replace(/·自摸|·捉冲|\\\\(无百搭×2\\\\)/g, ""))}</span><span class="hu-combo-method" data-v-dcbaa364>${ssrInterpolate(opt.type === "self_draw" ? "自摸" : "捉冲")}</span><span class="hu-combo-score" data-v-dcbaa364>总赢 ${ssrInterpolate(getHuOptionTotalWin(opt))}</span></div><div class="hu-combo-formula" data-v-dcbaa364>${ssrInterpolate(getHuOptionFormula(opt))}</div>`);
          if (formatHuOptionGroups(opt)) {
            _push(`<div class="hu-group-list" data-v-dcbaa364><div class="hu-group" data-v-dcbaa364><span class="hu-group-tiles-text" data-v-dcbaa364>${ssrInterpolate(formatHuOptionGroups(opt))}</span></div></div>`);
          } else {
            _push(`<!---->`);
          }
          _push(`<div class="hu-summary-grid" data-v-dcbaa364><div class="hu-summary-item" data-v-dcbaa364><span class="hu-summary-key" data-v-dcbaa364>基础番数/固定点数</span><span class="hu-summary-value" data-v-dcbaa364>${ssrInterpolate(getHuOptionDisplaySummary(opt).base)}</span></div><div class="hu-summary-item" data-v-dcbaa364><span class="hu-summary-key" data-v-dcbaa364>额外倍数</span><span class="hu-summary-value" data-v-dcbaa364>×${ssrInterpolate(getHuOptionDisplaySummary(opt).extra)}</span></div><div class="hu-summary-item" data-v-dcbaa364><span class="hu-summary-key" data-v-dcbaa364>全局倍数</span><span class="hu-summary-value" data-v-dcbaa364>×${ssrInterpolate(getHuOptionDisplaySummary(opt).global)}</span></div><div class="hu-summary-item" data-v-dcbaa364><span class="hu-summary-key" data-v-dcbaa364>房间结算倍数</span><span class="hu-summary-value" data-v-dcbaa364>×${ssrInterpolate(getHuOptionDisplaySummary(opt).settlement)}</span></div></div></div>`);
        });
        _push(`<!--]--></div><div class="hu-panel-actions" data-v-dcbaa364>`);
        if (!isHuReviewMode.value) {
          _push(`<button class="hu-confirm-btn"${ssrIncludeBooleanAttr(selectedHuCombo.value === null) ? " disabled" : ""} data-v-dcbaa364> 🀄 确认胡牌 </button>`);
        } else {
          _push(`<!---->`);
        }
        _push(`<button class="hu-cancel-btn" data-v-dcbaa364>取消</button></div></div></div>`);
      } else {
        _push(`<!---->`);
      }
      if (isOverlayVisible.value) {
        _push(`<div class="game-over-overlay" data-v-dcbaa364><div class="${ssrRenderClass([{ "game-over-card--draw": isDrawOverlay.value }, "game-over-card"])}" data-v-dcbaa364><p class="overlay-title" data-v-dcbaa364>${ssrInterpolate(isDrawOverlay.value ? "流局！下把翻倍！" : overlayTitle.value)}</p><p class="overlay-message" data-v-dcbaa364>${ssrInterpolate(overlayMessage.value)}</p>`);
        if (!isDrawOverlay.value && playerResults.value.length) {
          _push(`<ul class="overlay-results" data-v-dcbaa364><!--[-->`);
          ssrRenderList(playerResults.value, (player) => {
            _push(`<li class="overlay-result-item" data-v-dcbaa364><div data-v-dcbaa364><span class="${ssrRenderClass([{ "rank-winner": player.isWinner }, "result-rank"])}" data-v-dcbaa364>${ssrInterpolate(player.rankLabel)}</span><span class="result-name" data-v-dcbaa364>${ssrInterpolate(player.name)}</span></div><div class="result-meta" data-v-dcbaa364><span class="${ssrRenderClass([player.scoreClass, "result-score"])}" data-v-dcbaa364>${ssrInterpolate(player.scoreLabel)}</span><span class="result-status" data-v-dcbaa364>${ssrInterpolate(player.statusLabel)}</span>`);
            if (player.winRoundLabel) {
              _push(`<span class="result-round" data-v-dcbaa364>${ssrInterpolate(player.winRoundLabel)}</span>`);
            } else {
              _push(`<!---->`);
            }
            _push(`</div></li>`);
          });
          _push(`<!--]--></ul>`);
        } else if (!isDrawOverlay.value) {
          _push(`<p class="overlay-empty" data-v-dcbaa364>游戏结果将在服务端结算后显示。</p>`);
        } else {
          _push(`<!---->`);
        }
        _push(`<div class="overlay-auto-next-hint" data-v-dcbaa364><span class="auto-next-spinner" data-v-dcbaa364></span><span data-v-dcbaa364>即将进入下一局...</span></div></div></div>`);
      } else {
        _push(`<!---->`);
      }
      if (drawBlockedNoticeVisible.value) {
        _push(`<div class="draw-blocked-notice" data-v-dcbaa364>${ssrInterpolate(drawBlockedNoticeText.value)}</div>`);
      } else {
        _push(`<!---->`);
      }
      if (showSettlement.value) {
        _push(`<div class="settle-overlay" data-v-dcbaa364><div class="settle-panel" data-v-dcbaa364><h2 class="settle-title-center" data-v-dcbaa364>${ssrInterpolate(isWallExhaustedSettlement.value ? "💨 流局了，下把翻倍！！" : "本局输赢")}</h2><div class="settle-rounds settle-rounds--single" data-v-dcbaa364><div class="settle-round-card" data-v-dcbaa364>`);
        if (currentSettlementRound.value) {
          _push(`<div class="settle-round-header" data-v-dcbaa364><span data-v-dcbaa364>第 ${ssrInterpolate(settlementRoundIndex.value)} 局</span><span data-v-dcbaa364>全局倍数 ×${ssrInterpolate(currentSettlementRound.value.effectiveMultiplier)} / 结算倍数 ×${ssrInterpolate(currentSettlementRound.value.settlementMultiplier)}</span></div>`);
        } else {
          _push(`<!---->`);
        }
        _push(`<div class="settle-round-block" data-v-dcbaa364><div class="settle-table-wrap" data-v-dcbaa364><table class="settle-round-table settle-round-table--compact" data-v-dcbaa364><thead data-v-dcbaa364><tr data-v-dcbaa364><th data-v-dcbaa364>玩家</th><th data-v-dcbaa364>胡序</th><th data-v-dcbaa364>胡牌牌面</th><th data-v-dcbaa364>花</th><th data-v-dcbaa364>番数</th><th data-v-dcbaa364>门清</th><th data-v-dcbaa364>百搭</th><th data-v-dcbaa364>自摸/捉冲</th><th data-v-dcbaa364>总输赢</th></tr></thead><tbody data-v-dcbaa364><!--[-->`);
        ssrRenderList(currentSettlementRows.value, (row) => {
          _push(`<tr class="${ssrRenderClass({ "settle-round-table-row--winner": row.isWinner })}" data-v-dcbaa364><td data-v-dcbaa364>${ssrInterpolate(row.playerName)}</td><td data-v-dcbaa364>${ssrInterpolate(row.winSequence)}</td><td class="settle-round-tiles" data-v-dcbaa364>${ssrInterpolate(row.tiles)}</td><td data-v-dcbaa364>${ssrInterpolate(row.flowerCount)}</td><td data-v-dcbaa364>${ssrInterpolate(row.baseFan)}</td><td data-v-dcbaa364>${ssrInterpolate(row.menQing)}</td><td data-v-dcbaa364>${ssrInterpolate(row.wild)}</td><td data-v-dcbaa364>${ssrInterpolate(row.winMode)}</td><td class="${ssrRenderClass({ "settle-round-positive": row.score > 0, "settle-round-negative": row.score < 0 })}" data-v-dcbaa364>${ssrInterpolate(row.scoreLabel)}</td></tr>`);
        });
        _push(`<!--]--></tbody></table></div></div></div></div>`);
        if (isSettleRequested.value && settlementData.value?.playerStats) {
          _push(`<div class="settle-details" style="${ssrRenderStyle({ "border-top": "1px solid rgba(255,215,0,0.15)", "padding-top": "16px", "margin-top": "10px" })}" data-v-dcbaa364><h3 class="settle-title-center" style="${ssrRenderStyle({ "font-size": "1.1rem", "margin-bottom": "14px" })}" data-v-dcbaa364>📊 总成绩单</h3><div class="settle-detail-header" data-v-dcbaa364><span class="settle-detail-name" data-v-dcbaa364></span><span class="settle-detail-stat settle-detail-stat--record" data-v-dcbaa364>总输赢</span><span class="settle-detail-stat settle-detail-stat--record" data-v-dcbaa364>有效输赢</span><span class="settle-detail-stat" data-v-dcbaa364>🤖 vs AI</span><span class="settle-detail-stat" data-v-dcbaa364>🀄 自摸</span><span class="settle-detail-stat" data-v-dcbaa364>🎯 捉冲</span><span class="settle-detail-stat settle-detail-stat--win" data-v-dcbaa364>最大赢</span><span class="settle-detail-stat settle-detail-stat--loss" data-v-dcbaa364>最大输</span></div><div class="settle-detail-grid" data-v-dcbaa364><!--[-->`);
          ssrRenderList(sortedSettleStats.value, (stat) => {
            _push(`<div class="settle-detail-row" data-v-dcbaa364><span class="settle-detail-name" data-v-dcbaa364>${ssrInterpolate(stat.name)}</span><span class="settle-detail-stat settle-detail-stat--record" data-v-dcbaa364>${ssrInterpolate((stat.totalScore ?? 0) > 0 ? "+" : "")}${ssrInterpolate(stat.totalScore ?? 0)}</span><span class="settle-detail-stat settle-detail-stat--record" data-v-dcbaa364>${ssrInterpolate(stat.effectiveScore ?? stat.totalScore ?? 0)}</span><span class="settle-detail-stat" data-v-dcbaa364>${ssrInterpolate(stat.vsAiScore ?? 0)}</span><span class="settle-detail-stat" data-v-dcbaa364>${ssrInterpolate(stat.selfDraws ?? 0)}</span><span class="settle-detail-stat" data-v-dcbaa364>${ssrInterpolate(stat.discards ?? 0)}</span><span class="settle-detail-stat settle-detail-stat--win" data-v-dcbaa364>+${ssrInterpolate(stat.maxWin ?? 0)}</span><span class="settle-detail-stat settle-detail-stat--loss" data-v-dcbaa364>${ssrInterpolate(stat.maxLoss ?? 0)}</span></div>`);
          });
          _push(`<!--]--></div><p style="${ssrRenderStyle({ "text-align": "center", "font-size": "0.72rem", "opacity": "0.5", "margin-top": "10px" })}" data-v-dcbaa364>有效输赢 = 仅统计纯真人局的输赢，排除与AI对战的部分</p></div>`);
        } else {
          _push(`<!---->`);
        }
        _push(`<div class="settle-actions" data-v-dcbaa364>`);
        if (isWallExhaustedSettlement.value) {
          _push(`<div class="auto-next-countdown" style="${ssrRenderStyle({ "display": "flex", "align-items": "center", "gap": "8px", "margin-bottom": "8px", "justify-content": "center", "font-size": "0.85rem", "opacity": "0.8" })}" data-v-dcbaa364><span class="auto-next-spinner" data-v-dcbaa364></span><span data-v-dcbaa364>倒计时 ${ssrInterpolate(wallExhaustedCountdown.value)}s 后自动下一局</span></div>`);
        } else {
          _push(`<!---->`);
        }
        _push(`<div style="${ssrRenderStyle({ "display": "flex", "gap": "8px", "justify-content": "center" })}" data-v-dcbaa364>`);
        if (canReviewHuSelection.value) {
          _push(`<button class="settle-save-btn settle-save-btn--secondary" data-v-dcbaa364> 回看胡牌选择 </button>`);
        } else {
          _push(`<!---->`);
        }
        _push(`<button class="settle-save-btn" data-v-dcbaa364> 下一局${ssrInterpolate(isWallExhaustedSettlement.value && wallExhaustedCountdown.value > 0 ? " (" + wallExhaustedCountdown.value + "s)" : "")}</button></div></div></div></div>`);
      } else {
        _push(`<!---->`);
      }
      ssrRenderTeleport(_push, (_push2) => {
        if (showSettings.value) {
          _push2(`<div class="glass-settings-panel" style="${ssrRenderStyle(settingsPanelStyle.value)}" data-v-dcbaa364><div class="glass-settings-arrow" data-v-dcbaa364></div><div class="glass-settings-body" data-v-dcbaa364><div class="glass-settings-section" data-v-dcbaa364><div class="glass-settings-section-header" data-v-dcbaa364><div class="glass-settings-section-title" data-v-dcbaa364>对局操作</div><div class="glass-settings-section-subtitle" data-v-dcbaa364>只保留正在生效的出牌与音效控制</div></div><div class="glass-settings-stack" data-v-dcbaa364><div class="glass-settings-row glass-settings-row--panel" data-v-dcbaa364><div class="glass-settings-row-main" data-v-dcbaa364><span class="glass-settings-icon" data-v-dcbaa364>${ssrInterpolate(unref(soundEnabled) ? "🔊" : "🔇")}</span><div class="glass-settings-copy" data-v-dcbaa364><span class="glass-settings-label" data-v-dcbaa364>总音效</span><span class="glass-settings-help" data-v-dcbaa364>控制摸牌、碰杠胡、广播提示等音效播放</span></div></div><div class="${ssrRenderClass([{ "glass-toggle--on": unref(soundEnabled) }, "glass-toggle"])}" data-v-dcbaa364><div class="glass-toggle-knob" data-v-dcbaa364></div></div></div><div class="glass-settings-card" data-v-dcbaa364><div class="glass-settings-card-title" data-v-dcbaa364>出牌方式</div><div class="glass-settings-card-subtitle" data-v-dcbaa364>移动端支持双击、点选确认、拖拽出牌</div><div class="glass-theme-options" data-v-dcbaa364><button class="${ssrRenderClass([{ "glass-theme-chip--active": discardMode.value === "double_tap" }, "glass-theme-chip"])}" data-v-dcbaa364>双击</button><button class="${ssrRenderClass([{ "glass-theme-chip--active": discardMode.value === "tap_confirm" }, "glass-theme-chip"])}" data-v-dcbaa364>点选确认</button><button class="${ssrRenderClass([{ "glass-theme-chip--active": discardMode.value === "drag" }, "glass-theme-chip"])}" data-v-dcbaa364>拖拽出牌</button></div></div></div></div><div class="glass-settings-section" data-v-dcbaa364><div class="glass-settings-section-header" data-v-dcbaa364><div class="glass-settings-section-title" data-v-dcbaa364>语音与音乐</div><div class="glass-settings-section-subtitle" data-v-dcbaa364>语音音量和背景音乐在同一区块内集中管理</div></div><div class="glass-settings-stack" data-v-dcbaa364><div class="glass-settings-card" data-v-dcbaa364><div class="glass-settings-card-title" data-v-dcbaa364>出牌语音</div><div class="glass-settings-select-wrap glass-settings-select-wrap--compact" data-v-dcbaa364><div class="glass-settings-select-label" data-v-dcbaa364>语音音色</div><select class="glass-settings-select"${ssrRenderAttr("value", unref(currentScheme))} data-v-dcbaa364><option value="bingtang" data-v-dcbaa364>冰糖</option><option value="baihua" data-v-dcbaa364>白桦</option></select></div><div class="glass-settings-select-wrap glass-settings-select-wrap--compact" data-v-dcbaa364><div class="glass-settings-select-label" data-v-dcbaa364>语音音量 ${ssrInterpolate(voiceVolumePercent.value)}%</div><input class="glass-settings-range" type="range" min="0" max="100" step="1"${ssrRenderAttr("value", voiceVolumePercent.value)} data-v-dcbaa364></div></div><div class="glass-settings-card" data-v-dcbaa364><div class="glass-settings-card-title" data-v-dcbaa364>背景音乐</div><div class="glass-settings-row glass-settings-row--panel" data-v-dcbaa364><div class="glass-settings-row-main" data-v-dcbaa364><span class="glass-settings-icon" data-v-dcbaa364>${ssrInterpolate(unref(bgmEnabled) ? "🎶" : "🔇")}</span><div class="glass-settings-copy" data-v-dcbaa364><span class="glass-settings-label" data-v-dcbaa364>背景音乐开关</span><span class="glass-settings-help" data-v-dcbaa364>控制牌桌内循环播放的曲目</span></div></div><div class="${ssrRenderClass([{ "glass-toggle--on": unref(bgmEnabled) }, "glass-toggle"])}" data-v-dcbaa364><div class="glass-toggle-knob" data-v-dcbaa364></div></div></div><div class="glass-settings-select-wrap glass-settings-select-wrap--compact" data-v-dcbaa364><div class="glass-settings-select-label" data-v-dcbaa364>曲目</div><select class="glass-settings-select"${ssrRenderAttr("value", unref(bgmCurrentTrackId) || "")} data-v-dcbaa364><option value="" disabled data-v-dcbaa364>选择背景音乐</option><!--[-->`);
          ssrRenderList(unref(bgmTracks), (track) => {
            _push2(`<option${ssrRenderAttr("value", track.id)} data-v-dcbaa364>${ssrInterpolate(track.label)}</option>`);
          });
          _push2(`<!--]--></select></div><div class="glass-settings-select-wrap glass-settings-select-wrap--compact" data-v-dcbaa364><div class="glass-settings-select-label" data-v-dcbaa364>循环方式</div><select class="glass-settings-select"${ssrRenderAttr("value", unref(bgmLoopMode))} data-v-dcbaa364><option value="single" data-v-dcbaa364>单曲循环</option><option value="all" data-v-dcbaa364>列表循环</option><option value="shuffle" data-v-dcbaa364>随机循环</option></select></div><div class="glass-settings-select-wrap glass-settings-select-wrap--compact" data-v-dcbaa364><div class="glass-settings-select-label" data-v-dcbaa364>音乐音量 ${ssrInterpolate(bgmVolumePercent.value)}%</div><input class="glass-settings-range" type="range" min="0" max="100" step="1"${ssrRenderAttr("value", bgmVolumePercent.value)} data-v-dcbaa364></div><div class="glass-settings-music-actions" data-v-dcbaa364><button class="glass-theme-chip" type="button" data-v-dcbaa364>${ssrInterpolate(unref(bgmIsPlaying) ? "暂停" : "播放")}</button><button class="glass-theme-chip" type="button" data-v-dcbaa364>下一首</button></div></div></div></div><div class="glass-settings-section" data-v-dcbaa364><div class="glass-settings-section-header" data-v-dcbaa364><div class="glass-settings-section-title" data-v-dcbaa364>牌桌外观</div><div class="glass-settings-section-subtitle" data-v-dcbaa364>桌布与牌背分开归类，层次更清楚</div></div><div class="glass-settings-stack" data-v-dcbaa364><div class="glass-settings-card" data-v-dcbaa364><div class="glass-settings-card-title" data-v-dcbaa364>桌布方案</div><div class="glass-theme-options" data-v-dcbaa364><button class="${ssrRenderClass([{ "glass-theme-chip--active": tableTheme.value === "classic-green" }, "glass-theme-chip"])}" data-v-dcbaa364>经典绿</button><button class="${ssrRenderClass([{ "glass-theme-chip--active": tableTheme.value === "jade-green" }, "glass-theme-chip"])}" data-v-dcbaa364>翡翠青</button><button class="${ssrRenderClass([{ "glass-theme-chip--active": tableTheme.value === "royal-red" }, "glass-theme-chip"])}" data-v-dcbaa364>赤金红</button></div></div><div class="glass-settings-card" data-v-dcbaa364><div class="glass-settings-card-title" data-v-dcbaa364>牌背颜色</div><div class="glass-theme-options" data-v-dcbaa364><button class="${ssrRenderClass([{ "glass-theme-chip--active": tileBackScheme.value === 0 }, "glass-theme-chip"])}" data-v-dcbaa364>原版绿</button><button class="${ssrRenderClass([{ "glass-theme-chip--active": tileBackScheme.value === 1 }, "glass-theme-chip"])}" data-v-dcbaa364>象牙白</button><button class="${ssrRenderClass([{ "glass-theme-chip--active": tileBackScheme.value === 2 }, "glass-theme-chip"])}" data-v-dcbaa364>卡布里蓝</button></div></div></div></div><div class="glass-settings-footer" data-v-dcbaa364><span data-v-dcbaa364>长青阁麻将 v2.2</span></div></div></div>`);
        } else {
          _push2(`<!---->`);
        }
      }, "body", false, _parent);
      _push(`<div class="table-wrapper" data-v-dcbaa364><div class="mahjong-table" data-v-dcbaa364><div class="${ssrRenderClass([`table-felt--${tableTheme.value}`, "table-felt"])}" data-v-dcbaa364><div class="cross-marker" data-v-dcbaa364><div class="cross-h" data-v-dcbaa364></div><div class="cross-v" data-v-dcbaa364></div></div><div class="center-glow" data-v-dcbaa364></div>`);
      if (topPlayer.value) {
        _push(`<div class="player-name-label player-name-label--top" data-v-dcbaa364>${ssrInterpolate(topPlayer.value.name)} `);
        if (northIsWinner.value) {
          _push(`<span class="winner-tag" data-v-dcbaa364>胡</span>`);
        } else {
          _push(`<!---->`);
        }
        _push(`</div>`);
      } else {
        _push(`<!---->`);
      }
      if (leftPlayer.value) {
        _push(`<div class="player-name-label player-name-label--left" data-v-dcbaa364>${ssrInterpolate(leftPlayer.value.name)} `);
        if (westIsWinner.value) {
          _push(`<span class="winner-tag" data-v-dcbaa364>胡</span>`);
        } else {
          _push(`<!---->`);
        }
        _push(`</div>`);
      } else {
        _push(`<!---->`);
      }
      if (rightPlayer.value) {
        _push(`<div class="player-name-label player-name-label--right" data-v-dcbaa364>${ssrInterpolate(rightPlayer.value.name)} `);
        if (eastIsWinner.value) {
          _push(`<span class="winner-tag" data-v-dcbaa364>胡</span>`);
        } else {
          _push(`<!---->`);
        }
        _push(`</div>`);
      } else {
        _push(`<!---->`);
      }
      _push(ssrRenderComponent(TableCenter, {
        "remaining-tiles": remainingTileCount.value,
        "status-message": showMobileActionNotice.value ? mobileActionNoticeText.value : turnMessage.value,
        "hint-message": "点击选牌，再次点击出牌。操作按钮将根据规则自动显示。",
        "is-winner": isWinner.value,
        "round-multiplier": roundMultiplier.value,
        "global-multiplier": globalMultiplier.value,
        "wild-tile": wildTile.value
      }, null, _parent));
      _push(ssrRenderComponent(TileWall, {
        remaining: remainingTileCount.value,
        "tile-back-scheme": tileBackScheme.value
      }, null, _parent));
      _push(ssrRenderComponent(DiscardZone, {
        position: "bottom",
        tiles: playerDiscards.value,
        "is-winner": isWinner.value,
        "latest-tile-id": selfLatestDiscardId.value
      }, null, _parent));
      _push(ssrRenderComponent(DiscardZone, {
        position: "top",
        tiles: northDiscards.value,
        "is-winner": northIsWinner.value,
        "latest-tile-id": northLatestDiscardId.value
      }, null, _parent));
      _push(ssrRenderComponent(DiscardZone, {
        position: "left",
        tiles: westDiscards.value,
        "is-winner": westIsWinner.value,
        "latest-tile-id": westLatestDiscardId.value
      }, null, _parent));
      _push(ssrRenderComponent(DiscardZone, {
        position: "right",
        tiles: eastDiscards.value,
        "is-winner": eastIsWinner.value,
        "latest-tile-id": eastLatestDiscardId.value
      }, null, _parent));
      _push(`</div><div class="${ssrRenderClass([{ "seat-active": activePosition.value !== null && topPlayer.value?.position === activePosition.value }, "seat seat-top"])}" data-v-dcbaa364>`);
      _push(ssrRenderComponent(PlayerOtherArea, {
        position: "top",
        hand: northHand.value,
        melds: northMelds.value,
        "tile-back-scheme": tileBackScheme.value,
        "show-hand": isOpponentHandRevealed(topPlayer.value),
        "is-winner": northIsWinner.value,
        "just-drawn-tile-id": northJustDrawnTileId.value,
        "player-colors": claimSourceColors,
        "viewer-position": unref(currentPlayer)?.position,
        "owner-position": topPlayer.value?.position
      }, null, _parent));
      _push(`</div><div class="${ssrRenderClass([{ "seat-active": activePosition.value !== null && leftPlayer.value?.position === activePosition.value }, "seat seat-left"])}" data-v-dcbaa364>`);
      _push(ssrRenderComponent(PlayerOtherArea, {
        position: "left",
        hand: westHand.value,
        melds: westMelds.value,
        "tile-back-scheme": tileBackScheme.value,
        "show-hand": isOpponentHandRevealed(leftPlayer.value),
        "is-winner": westIsWinner.value,
        "just-drawn-tile-id": westJustDrawnTileId.value,
        "player-colors": claimSourceColors,
        "viewer-position": unref(currentPlayer)?.position,
        "owner-position": leftPlayer.value?.position
      }, null, _parent));
      _push(`</div><div class="${ssrRenderClass([{ "seat-active": activePosition.value !== null && rightPlayer.value?.position === activePosition.value }, "seat seat-right"])}" data-v-dcbaa364>`);
      _push(ssrRenderComponent(PlayerOtherArea, {
        position: "right",
        hand: eastHand.value,
        melds: eastMelds.value,
        "tile-back-scheme": tileBackScheme.value,
        "show-hand": isOpponentHandRevealed(rightPlayer.value),
        "is-winner": eastIsWinner.value,
        "just-drawn-tile-id": eastJustDrawnTileId.value,
        "player-colors": claimSourceColors,
        "viewer-position": unref(currentPlayer)?.position,
        "owner-position": rightPlayer.value?.position
      }, null, _parent));
      _push(`</div><div class="seat seat-bottom" data-v-dcbaa364><div class="self-area-with-actions" data-v-dcbaa364>`);
      if (!isSpectator.value) {
        _push(ssrRenderComponent(PlayerSelfArea, {
          name: "",
          hand: playerHand.value,
          melds: playerMelds.value,
          "tile-back-scheme": tileBackScheme.value,
          "player-colors": claimSourceColors,
          "just-drawn-tile-id": selfJustDrawnTileId.value,
          "viewer-position": unref(currentPlayer)?.position,
          "owner-position": unref(currentPlayer)?.position,
          "selected-tile-id": selectedTileId.value,
          "discard-mode": discardMode.value,
          "drag-discard-threshold-px": dragDiscardThresholdPx,
          "show-discard-confirm": discardMode.value === "tap_confirm" && !!selectedTileId.value,
          "is-winner": isWinner.value,
          onTileClick: handleTileClick,
          onTileDblclick: handleTileDblclick,
          onTileDiscard: handleTileDiscard
        }, null, _parent));
      } else {
        _push(`<!---->`);
      }
      if (isSpectator.value) {
        _push(`<div class="spectating-hint" data-v-dcbaa364><span class="spectating-hint-icon" data-v-dcbaa364>📺</span><span class="spectating-hint-text" data-v-dcbaa364>正在观看 <strong data-v-dcbaa364>${ssrInterpolate(watchingPlayerName.value)}</strong> 的手牌</span><button class="mahjong-button small" data-v-dcbaa364>退出观赛</button></div>`);
      } else {
        _push(`<!---->`);
      }
      if (isSpectator.value) {
        _push(`<div class="inline-action-buttons inline-action-buttons--spectator" data-v-dcbaa364><div class="spectator-badge" data-v-dcbaa364>📺 观赛中</div></div>`);
      } else if (canReviewLatestHuSelection.value && !isAIControlled.value) {
        _push(`<div class="inline-action-buttons inline-action-buttons--review" data-v-dcbaa364><button class="inline-action-btn inline-action-btn--review" data-v-dcbaa364>回看胡牌选项</button></div>`);
      } else if (isAIControlled.value) {
        _push(`<div class="inline-action-buttons" data-v-dcbaa364><div class="ai-controlled-notice" data-v-dcbaa364> 🤖 已由AI自动出牌 </div><button class="inline-action-btn inline-action-btn--comeback" data-v-dcbaa364>我回来了</button></div>`);
      } else if (unref(isConnected) && !isInteractionLocked.value) {
        _push(`<div class="inline-action-buttons" style="${ssrRenderStyle({ "display": "none" })}" data-v-dcbaa364>`);
        if (actionWindowText.value) {
          _push(`<div class="inline-action-timer" data-v-dcbaa364>${ssrInterpolate(actionWindowText.value)}</div>`);
        } else {
          _push(`<!---->`);
        }
        if (showChow.value) {
          _push(`<button class="inline-action-btn inline-action-btn--chow inline-action-btn--claim-pulse"${ssrIncludeBooleanAttr(isInteractionLocked.value) ? " disabled" : ""} data-v-dcbaa364>吃</button>`);
        } else {
          _push(`<!---->`);
        }
        if (showPeng.value) {
          _push(`<button class="inline-action-btn inline-action-btn--peng inline-action-btn--claim-pulse"${ssrIncludeBooleanAttr(isInteractionLocked.value) ? " disabled" : ""} data-v-dcbaa364>碰</button>`);
        } else {
          _push(`<!---->`);
        }
        if (showKong.value || showConcealedKong.value || showExtendedKong.value) {
          _push(`<button class="inline-action-btn inline-action-btn--kong inline-action-btn--claim-pulse"${ssrIncludeBooleanAttr(isInteractionLocked.value) ? " disabled" : ""} data-v-dcbaa364>杠</button>`);
        } else {
          _push(`<!---->`);
        }
        if (showRebel.value) {
          _push(`<button class="${ssrRenderClass([{ "inline-action-btn--frozen": thinkFreezeActive.value }, "inline-action-btn inline-action-btn--rebel"])}"${ssrIncludeBooleanAttr(isInteractionLocked.value || thinkFreezeActive.value) ? " disabled" : ""} data-v-dcbaa364>🚨造反</button>`);
        } else {
          _push(`<!---->`);
        }
        if (showLiangShanButton.value) {
          _push(`<button class="${ssrRenderClass([{ "inline-action-btn--liangshan-voted": hasVotedLiangShan.value, "inline-action-btn--frozen": thinkFreezeActive.value }, "inline-action-btn inline-action-btn--liangshan"])}"${ssrIncludeBooleanAttr(!canLiangShan.value || isInteractionLocked.value || hasVotedLiangShan.value || thinkFreezeActive.value) ? " disabled" : ""} data-v-dcbaa364>🔥${ssrInterpolate(hasVotedLiangShan.value ? "已聚义" : "梁山聚义")}</button>`);
        } else {
          _push(`<!---->`);
        }
        if (!showDraw.value && !showChow.value && !showPeng.value && !showKong.value && !showHu.value && !showConcealedKong.value && !showExtendedKong.value && !showRebel.value && !showLiangShanButton.value) {
          _push(`<div class="inline-action-waiting" data-v-dcbaa364> 等待中… </div>`);
        } else {
          _push(`<!---->`);
        }
        _push(`</div>`);
      } else if (!unref(isConnected)) {
        _push(`<div class="inline-action-buttons" data-v-dcbaa364><div class="inline-action-waiting" data-v-dcbaa364>连接中...</div></div>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div></div></div></div><aside class="extended-info-panel" data-v-dcbaa364>`);
      if (unref(gameState)) {
        _push(`<div class="room-header-row panel-room-header-row" data-v-dcbaa364><button class="${ssrRenderClass([{ "room-header-toggle--collapsed": isTopBarCollapsed.value }, "room-header-toggle room-header-toggle--inline"])}"${ssrRenderAttr("aria-expanded", String(!isTopBarCollapsed.value))}${ssrRenderAttr("title", isTopBarCollapsed.value ? "展开菜单" : "收起菜单")} data-v-dcbaa364><span class="room-header-toggle__icon" data-v-dcbaa364>${ssrInterpolate(isTopBarCollapsed.value ? "▼" : "▲")}</span></button><p class="mahjong-subtitle panel-room-number" data-v-dcbaa364> 房间 #${ssrInterpolate(unref(gameState)?.roomNumber || "????")}</p>`);
        if (unref(gameState)?.phase === unref(GamePhase).WAITING ? canManualStartWaitingGame.value : unref(gameState)?.phase === "playing" && !!unref(currentPlayer)?.isDealer || unref(gameState)?.phase === "ended") {
          _push(`<button class="${ssrRenderClass([{ "start-game-glow": canManualStartWaitingGame.value }, "settle-btn-header"])}"${ssrIncludeBooleanAttr(isGameStarting.value && unref(gameState)?.phase === unref(GamePhase).WAITING) ? " disabled" : ""} data-v-dcbaa364>${ssrInterpolate(unref(gameState)?.phase === unref(GamePhase).WAITING ? isGameStarting.value ? "⏳ 正在开始..." : "🀄 开始牌局" : "📊 退房结算")}</button>`);
        } else {
          _push(`<!---->`);
        }
        _push(`</div>`);
      } else {
        _push(`<!---->`);
      }
      if (isMobileLandscapeMode.value && !isTopBarCollapsed.value) {
        _push(`<div class="ext-section mobile-inline-menu" data-v-dcbaa364><div class="mobile-inline-menu__actions" data-v-dcbaa364><button class="mahjong-button small secondary" data-v-dcbaa364> ⚙️ 设置 </button><button class="mahjong-button small secondary" data-v-dcbaa364> 📖 规则 </button><button class="mahjong-button small" data-v-dcbaa364> 返回大厅 </button></div></div>`);
      } else {
        _push(`<!---->`);
      }
      if (!isPreGameTransition.value) {
        _push(ssrRenderComponent(RoomStats, {
          players: statsPlayers.value,
          "current-round": unref(currentRound),
          onNameClick: onPlayerNameClick
        }, null, _parent));
      } else {
        _push(`<!---->`);
      }
      _push(ssrRenderComponent(GameBroadcast, { messages: displayBroadcastMessages.value }, null, _parent));
      if (isAdminUser.value) {
        _push(`<div class="ext-section" data-v-dcbaa364><h3 class="ext-title" data-v-dcbaa364>调试</h3><p class="ext-meta" data-v-dcbaa364>阶段: ${ssrInterpolate(unref(gameState)?.phase)} · ${ssrInterpolate(unref(gameState)?.players.length)}人</p>`);
        if (unref(gameState)?.phase === "waiting" && (unref(gameState)?.players.length || 0) < 4) {
          _push(`<div style="${ssrRenderStyle({ "margin-bottom": "6px" })}" data-v-dcbaa364><button class="mahjong-button panel-button small"${ssrIncludeBooleanAttr(isInteractionLocked.value) ? " disabled" : ""} data-v-dcbaa364> 添加机器人 → 掷骰子 </button></div>`);
        } else {
          _push(`<!---->`);
        }
        _push(`<button class="mahjong-button panel-button small"${ssrIncludeBooleanAttr(isInteractionLocked.value) ? " disabled" : ""} data-v-dcbaa364>刷新</button><button class="mahjong-button panel-button small"${ssrIncludeBooleanAttr(isInteractionLocked.value) ? " disabled" : ""} data-v-dcbaa364>${ssrInterpolate(shouldRevealOpponents.value ? "隐藏手牌" : "显示手牌")}</button>`);
        if (unref(gameState)?.phase === "playing") {
          _push(`<div style="${ssrRenderStyle({ "margin-top": "8px" })}" data-v-dcbaa364><!--[-->`);
          ssrRenderList(otherPlayers.value, (p) => {
            _push(`<p class="ext-meta" data-v-dcbaa364>${ssrInterpolate(p.name)} <button class="mahjong-button panel-button small" style="${ssrRenderStyle({ "display": "inline", "padding": "2px 8px", "font-size": "0.7rem", "margin-left": "4px" })}"${ssrIncludeBooleanAttr(isInteractionLocked.value || unref(gameState)?.currentPlayerIndex !== p.position) ? " disabled" : ""} data-v-dcbaa364> 出牌 </button></p>`);
          });
          _push(`<!--]--></div>`);
        } else {
          _push(`<!---->`);
        }
        _push(`</div>`);
      } else {
        _push(`<!---->`);
      }
      if (isAdminUser.value && canCheatHu.value) {
        _push(`<div class="ext-section" data-v-dcbaa364><button class="mahjong-button panel-button"${ssrIncludeBooleanAttr(isInteractionLocked.value) ? " disabled" : ""} data-v-dcbaa364> 测试胡牌 </button></div>`);
      } else {
        _push(`<!---->`);
      }
      if (!isPreGameTransition.value && !isSpectator.value) {
        _push(`<div class="action-buttons-panel" data-v-dcbaa364><div class="ting-preview-section" data-v-dcbaa364><div class="ting-preview-label" role="button" tabindex="0" data-v-dcbaa364><span class="ting-preview-label__text" data-v-dcbaa364>听牌</span><span class="ting-preview-label__toggle" data-v-dcbaa364>${ssrInterpolate(tingPreviewEnabled.value ? "✕" : "☰")}</span>`);
        if (tingPreviewEnabled.value) {
          _push(`<!--[--><span class="ting-preview-label__colon" data-v-dcbaa364>：</span>`);
          if (tingPreviewItems.value.length) {
            _push(`<!--[-->`);
            ssrRenderList(tingPreviewItems.value, (item) => {
              _push(`<span class="${ssrRenderClass([{ "ting-preview-tile--exhausted": item.isExhausted }, "ting-preview-tile"])}" data-v-dcbaa364>${ssrInterpolate(item.label)}</span>`);
            });
            _push(`<!--]-->`);
          } else {
            _push(`<span class="ting-preview-label__hint" data-v-dcbaa364>未听牌</span>`);
          }
          _push(`<!--]-->`);
        } else {
          _push(`<!---->`);
        }
        _push(`</div></div>`);
        if (thinkFreezeActive.value || isAIControlled.value || showMobileActionNotice.value) {
          _push(`<div class="turn-status-text" data-v-dcbaa364>`);
          if (thinkFreezeActive.value) {
            _push(`<!--[--> 🧠 ${ssrInterpolate(thinkFreezePlayerName.value)} 在思考中... ${ssrInterpolate(thinkFreezeCountdown.value)}s <!--]-->`);
          } else if (isAIControlled.value) {
            _push(`<!--[--> 🤖 AI托管中 <!--]-->`);
          } else if (showMobileActionNotice.value) {
            _push(`<!--[-->${ssrInterpolate(mobileActionNoticeText.value)}<!--]-->`);
          } else {
            _push(`<!---->`);
          }
          _push(`</div>`);
        } else {
          _push(`<!---->`);
        }
        _push(ssrRenderComponent(CircularActionButtons, {
          "available-actions": filteredCircularAvailableActions.value,
          "is-connected": unref(isConnected),
          "is-interaction-locked": isInteractionLocked.value,
          "is-paused": thinkFreezeActive.value && !isMyThinkFreezeOwner.value,
          "last-state-change-at": unref(lastStateChangeAt),
          "now-ts": nowTs.value,
          "highlight-delay-ms": hesitationWindow.value,
          "freeze-until": actionVisualFreezeUntil.value,
          "hesitation-window": hesitationWindow.value,
          "think-remaining": thinkRemaining.value,
          "can-use-think": canUseThink.value,
          "has-voted-liangshan": hasVotedLiangShan.value,
          onAction: handleCircularAction
        }, null, _parent));
        _push(`<div class="extra-actions-bar" data-v-dcbaa364><span class="extra-actions-label" data-v-dcbaa364>更多操作</span><button class="extra-action-btn extra-action-btn--liangshan"${ssrIncludeBooleanAttr(canLiangShan.value === false || isInteractionLocked.value || !unref(isConnected) || hasVotedLiangShan.value || thinkFreezeActive.value) ? " disabled" : ""} data-v-dcbaa364>🔥 ${ssrInterpolate(hasVotedLiangShan.value ? "已聚义" : "聚义")}</button><button class="extra-action-btn extra-action-btn--rebel"${ssrIncludeBooleanAttr(showRebel.value === false || isInteractionLocked.value || !unref(isConnected) || thinkFreezeActive.value) ? " disabled" : ""} data-v-dcbaa364>🚨 造反</button>`);
        if (showHu.value) {
          _push(`<button class="extra-action-btn extra-action-btn--hu"${ssrIncludeBooleanAttr(isInteractionLocked.value || isAIControlled.value) ? " disabled" : ""} data-v-dcbaa364>🏆 您胡了</button>`);
        } else {
          _push(`<!---->`);
        }
        if (isWinner.value) {
          _push(`<span class="turn-timer-inline turn-timer--winner" data-v-dcbaa364>🎉 你赢了！</span>`);
        } else {
          _push(`<!---->`);
        }
        if (turnTimerActive.value && !isWinner.value && !isAIControlled.value) {
          _push(`<span class="${ssrRenderClass([{ "turn-timer--urgent": turnTimer.value <= 10 }, "turn-timer-inline"])}" data-v-dcbaa364> ⏱ ${ssrInterpolate(turnTimer.value)}s </span>`);
        } else {
          _push(`<!---->`);
        }
        _push(`</div></div>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</aside></main>`);
      ssrRenderTeleport(_push, (_push2) => {
        if (showDiceOverlay.value) {
          _push2(ssrRenderComponent(DiceAnimation, {
            dice1: diceValues.value[0],
            dice2: diceValues.value[1],
            "dealer-name": dealerName.value,
            "max-rolls": effectiveMaxRolls.value,
            "is-dealer": isDealer.value,
            "roll-trigger-key": diceRollTriggerKey.value,
            onDeal: onDealTiles,
            onRoll: onRerollDice
          }, null, _parent));
        } else {
          _push2(`<!---->`);
        }
      }, "body", false, _parent);
      ssrRenderTeleport(_push, (_push2) => {
        if (showDoubleReminder.value) {
          _push2(`<div class="double-reminder-overlay" data-v-dcbaa364><div class="double-reminder-msg" data-v-dcbaa364>${ssrInterpolate(_ctx.doubleReminderText)}</div></div>`);
        } else {
          _push2(`<!---->`);
        }
      }, "body", false, _parent);
      ssrRenderTeleport(_push, (_push2) => {
        if (flowerReplacementNotice.value) {
          _push2(`<div class="flower-replace-overlay" data-v-dcbaa364><div class="flower-replace-chip" data-v-dcbaa364><span class="flower-replace-text" data-v-dcbaa364>补花补上</span>`);
          _push2(ssrRenderComponent(MahjongTile, { tile: flowerReplacementNotice.value }, null, _parent));
          _push2(`</div></div>`);
        } else {
          _push2(`<!---->`);
        }
        if (showPlayerCard.value) {
          _push2(`<div class="ai-card-overlay" data-v-dcbaa364><div class="ai-card" data-v-dcbaa364><div class="ai-card-header" data-v-dcbaa364><span class="ai-card-avatar" data-v-dcbaa364>${ssrInterpolate(isBotPlayer(playerCardPlayer.value) ? "🤖" : "🀄")}</span><span class="ai-card-name" data-v-dcbaa364>${ssrInterpolate(playerCardPlayer.value?.name)}</span></div><div class="ai-card-body" data-v-dcbaa364>`);
          if (playerCardPlayer.value?.id === unref(currentPlayer)?.id) {
            _push2(`<!--[--><button class="ai-card-btn ai-card-btn--leave" data-v-dcbaa364> 🪑 暂时离席 <span class="ai-card-hint" data-v-dcbaa364>下把起身，位置空出</span></button><button class="ai-card-btn ai-card-btn--replace" data-v-dcbaa364> 🤖 托管 <span class="ai-card-hint" data-v-dcbaa364>AI接管，继续游戏</span></button><!--]-->`);
          } else if (isBotPlayer(playerCardPlayer.value)) {
            _push2(`<!--[-->`);
            if (!isSpectator.value) {
              _push2(`<button class="ai-card-btn ai-card-btn--spectate"${ssrIncludeBooleanAttr(!canUseSpectatorView.value) ? " disabled" : ""} data-v-dcbaa364> 👁️ ${ssrInterpolate(spectatingId.value === playerCardPlayer.value?.id ? "取消观赛" : "观赛TA")} <span class="ai-card-hint" data-v-dcbaa364>${ssrInterpolate(canUseSpectatorView.value ? "查看对方手牌" : "当前条件下不可观赛")}</span></button>`);
            } else {
              _push2(`<!---->`);
            }
            if (isSpectator.value) {
              _push2(`<button class="ai-card-btn ai-card-btn--replace"${ssrIncludeBooleanAttr(isReplacingBot.value) ? " disabled" : ""} data-v-dcbaa364> 🙋 下局替换TA <span class="ai-card-hint" data-v-dcbaa364>此AI下局退出，你上位</span></button>`);
            } else {
              _push2(`<!---->`);
            }
            _push2(`<button class="ai-card-btn ai-card-btn--leave" data-v-dcbaa364> 🚪 出局 <span class="ai-card-hint" data-v-dcbaa364>下局移除该AI</span></button>`);
            if (isSpectatorGamePlayer.value) {
              _push2(`<button class="ai-card-btn ai-card-btn--replace" data-v-dcbaa364> 🙋 换我上 <span class="ai-card-hint" data-v-dcbaa364>下局由你接替</span></button>`);
            } else {
              _push2(`<!---->`);
            }
            _push2(`<!--]-->`);
          } else if (playerCardPlayer.value?.id !== unref(currentPlayer)?.id) {
            _push2(`<!--[-->`);
            if (!isSpectator.value) {
              _push2(`<button class="ai-card-btn ai-card-btn--spectate"${ssrIncludeBooleanAttr(!canUseSpectatorView.value) ? " disabled" : ""} data-v-dcbaa364> 👁️ ${ssrInterpolate(spectatingId.value === playerCardPlayer.value?.id ? "取消观赛" : "观赛TA")} <span class="ai-card-hint" data-v-dcbaa364>${ssrInterpolate(canUseSpectatorView.value ? "查看对方手牌" : "当前条件下不可观赛")}</span></button>`);
            } else {
              _push2(`<!---->`);
            }
            if (canSwap.value) {
              _push2(`<button class="ai-card-btn ai-card-btn--swap" data-v-dcbaa364> 🔄 跟TA换位置 <span class="ai-card-hint" data-v-dcbaa364>剩余 ${ssrInterpolate(mySwapInfo.value.remaining)} 次机会</span></button>`);
            } else {
              _push2(`<!---->`);
            }
            _push2(`<!--]-->`);
          } else {
            _push2(`<!---->`);
          }
          _push2(`</div><button class="ai-card-close" data-v-dcbaa364>✕</button></div></div>`);
        } else {
          _push2(`<!---->`);
        }
      }, "body", false, _parent);
      _push(`</div></div></div>`);
      if (showDebugPanel.value) {
        _push(ssrRenderComponent(LayoutDebugPanel, {
          onClose: ($event) => showDebugPanel.value = false
        }, null, _parent));
      } else {
        _push(`<!---->`);
      }
      if (showDebugPanel.value) {
        _push(`<div style="${ssrRenderStyle({ "position": "fixed", "top": "4px", "left": "4px", "z-index": "99999", "background": "rgba(0,0,0,0.85)", "color": "#0f0", "font-size": "10px", "font-family": "monospace", "padding": "3px 6px", "border-radius": "4px", "pointer-events": "none", "white-space": "pre" })}" data-v-dcbaa364>${ssrInterpolate(debugViewport.value)}</div>`);
      } else {
        _push(`<!---->`);
      }
      _push(`<!--]-->`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/gameroom/[roomId].vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const _roomId_ = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-dcbaa364"]]);

export { _roomId_ as default };
//# sourceMappingURL=_roomId_-jtNvCeHf.mjs.map
