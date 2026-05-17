import { defineComponent, ref, mergeProps, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrInterpolate, ssrRenderComponent, ssrRenderStyle } from 'vue/server-renderer';
import { P as PlayerOtherArea, b as PlayerSelfArea, T as TileSuit } from './game-B1wD8yRG.mjs';
import { _ as _export_sfc } from './server.mjs';
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

const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "admin-test",
  __ssrInlineRender: true,
  setup(__props) {
    const statusMessage = ref("Admin Test Mode");
    const selectedTileId = ref(null);
    const claimableDiscardTileId = ref(null);
    const playerHand = ref([]);
    const playerMelds = ref([]);
    const playerDiscards = ref([]);
    const playerIsWinner = ref(false);
    const northHand = ref([]);
    const northMelds = ref([]);
    const northDiscards = ref([]);
    const northIsWinner = ref(false);
    const westHand = ref([]);
    const westMelds = ref([]);
    const westDiscards = ref([]);
    const westIsWinner = ref(false);
    const eastHand = ref([]);
    const eastMelds = ref([]);
    const eastDiscards = ref([]);
    const eastIsWinner = ref(false);
    const generateTile = (idPrefix, index) => {
      const suits = [TileSuit.DOTS, TileSuit.BAMBOOS, TileSuit.CHARACTERS];
      const suit = suits[Math.floor(Math.random() * suits.length)];
      const value = Math.floor(Math.random() * 9) + 1;
      return {
        suit,
        value,
        id: `${idPrefix}-${index}-${Date.now()}`
      };
    };
    const initGame = () => {
      statusMessage.value = "Game Started (Local)";
      playerHand.value = [];
      playerDiscards.value = [];
      playerMelds.value = [];
      playerIsWinner.value = false;
      northHand.value = [];
      northDiscards.value = [];
      northMelds.value = [];
      northIsWinner.value = false;
      westHand.value = [];
      westDiscards.value = [];
      westMelds.value = [];
      westIsWinner.value = false;
      eastHand.value = [];
      eastDiscards.value = [];
      eastMelds.value = [];
      eastIsWinner.value = false;
      for (let i = 0; i < 13; i++) {
        playerHand.value.push(generateTile("self", i));
        northHand.value.push(generateTile("north", i));
        westHand.value.push(generateTile("west", i));
        eastHand.value.push(generateTile("east", i));
      }
      autoSortHand();
    };
    const handleTileClick = (tile) => {
      if (playerIsWinner.value) return;
      if (selectedTileId.value === tile.id) {
        const index = playerHand.value.findIndex((t) => t.id === tile.id);
        if (index !== -1) {
          const discarded = playerHand.value.splice(index, 1)[0];
          playerDiscards.value.push(discarded);
          selectedTileId.value = null;
          statusMessage.value = `Discarded ${discarded.suit} ${discarded.value}`;
          autoSortHand();
        }
      } else {
        selectedTileId.value = tile.id;
      }
    };
    const autoSortHand = () => {
      playerHand.value.sort((a, b) => {
        if (a.suit !== b.suit) return a.suit.localeCompare(b.suit);
        return a.value - b.value;
      });
    };
    initGame();
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "mahjong-page" }, _attrs))} data-v-2cee1e08><div class="room-container" data-v-2cee1e08><header class="room-header" data-v-2cee1e08><div class="room-info" data-v-2cee1e08><h1 class="mahjong-title" data-v-2cee1e08>Admin Test Room</h1><p class="mahjong-subtitle" data-v-2cee1e08> Offline Mode · UI &amp; Logic Testing </p></div><button class="mahjong-button small" data-v-2cee1e08> Back to Lobby </button></header><main class="room-main" data-v-2cee1e08><div class="table-wrapper" data-v-2cee1e08><div class="mahjong-table" data-v-2cee1e08><div class="table-center" data-v-2cee1e08><p class="status" data-v-2cee1e08>${ssrInterpolate(statusMessage.value)}</p><p class="hint" data-v-2cee1e08> Admin Mode: Use the panel on the right to control the game state. </p></div><div class="seat seat-top" data-v-2cee1e08>`);
      _push(ssrRenderComponent(PlayerOtherArea, {
        name: "Player North",
        position: "top",
        hand: northHand.value,
        melds: northMelds.value,
        discards: northDiscards.value,
        "is-winner": northIsWinner.value
      }, null, _parent));
      _push(`</div><div class="seat seat-left" data-v-2cee1e08>`);
      _push(ssrRenderComponent(PlayerOtherArea, {
        name: "Player West",
        position: "left",
        hand: westHand.value,
        melds: westMelds.value,
        discards: westDiscards.value,
        "is-winner": westIsWinner.value
      }, null, _parent));
      _push(`</div><div class="seat seat-right" data-v-2cee1e08>`);
      _push(ssrRenderComponent(PlayerOtherArea, {
        name: "Player East",
        position: "right",
        hand: eastHand.value,
        melds: eastMelds.value,
        discards: eastDiscards.value,
        "is-winner": eastIsWinner.value,
        "claimable-discard-tile-id": claimableDiscardTileId.value
      }, null, _parent));
      _push(`</div><div class="seat seat-bottom" data-v-2cee1e08>`);
      _push(ssrRenderComponent(PlayerSelfArea, {
        name: "Admin (You)",
        hand: playerHand.value,
        melds: playerMelds.value,
        discards: playerDiscards.value,
        "selected-tile-id": selectedTileId.value,
        "is-winner": playerIsWinner.value,
        onTileClick: handleTileClick
      }, null, _parent));
      _push(`</div></div></div><div class="side-panel" data-v-2cee1e08><div class="test-controls" data-v-2cee1e08><h2 class="panel-title" data-v-2cee1e08>Admin Controls</h2><div class="control-group" data-v-2cee1e08><p class="panel-subtitle" data-v-2cee1e08>Game Flow</p><button class="mahjong-button panel-button" data-v-2cee1e08> Reset / Start New Game </button></div><div class="control-group" data-v-2cee1e08><p class="panel-subtitle" data-v-2cee1e08>My Actions</p><div class="button-grid" data-v-2cee1e08><button class="mahjong-button panel-button" data-v-2cee1e08>Draw</button><button class="mahjong-button panel-button" data-v-2cee1e08>Sort</button></div><div class="button-grid three-col" data-v-2cee1e08><button class="mahjong-button panel-button small" data-v-2cee1e08>Peng</button><button class="mahjong-button panel-button small" data-v-2cee1e08>Gang</button><button class="mahjong-button panel-button small" data-v-2cee1e08>Hu</button></div></div><div class="control-group" data-v-2cee1e08><p class="panel-subtitle" data-v-2cee1e08>East Actions</p><button class="mahjong-button panel-button small" data-v-2cee1e08>Play (Draw+Discard)</button><div class="button-grid three-col" data-v-2cee1e08><button class="mahjong-button panel-button small" data-v-2cee1e08>Peng</button><button class="mahjong-button panel-button small" data-v-2cee1e08>Gang</button><button class="mahjong-button panel-button small" data-v-2cee1e08>Hu</button></div></div><div class="control-group" data-v-2cee1e08><p class="panel-subtitle" data-v-2cee1e08>North Actions</p><button class="mahjong-button panel-button small" data-v-2cee1e08>Play (Draw+Discard)</button><div class="button-grid three-col" data-v-2cee1e08><button class="mahjong-button panel-button small" data-v-2cee1e08>Peng</button><button class="mahjong-button panel-button small" data-v-2cee1e08>Gang</button><button class="mahjong-button panel-button small" data-v-2cee1e08>Hu</button></div></div><div class="control-group" data-v-2cee1e08><p class="panel-subtitle" data-v-2cee1e08>West Actions</p><button class="mahjong-button panel-button small" data-v-2cee1e08>Play (Draw+Discard)</button><div class="button-grid three-col" data-v-2cee1e08><button class="mahjong-button panel-button small" data-v-2cee1e08>Peng</button><button class="mahjong-button panel-button small" data-v-2cee1e08>Gang</button><button class="mahjong-button panel-button small" data-v-2cee1e08>Hu</button></div></div><div class="control-group" data-v-2cee1e08><p class="panel-subtitle" data-v-2cee1e08>Debug Info</p><p style="${ssrRenderStyle({ "font-size": "0.8rem", "opacity": "0.7" })}" data-v-2cee1e08> Hand Size: ${ssrInterpolate(playerHand.value.length)}<br data-v-2cee1e08> Selected: ${ssrInterpolate(selectedTileId.value || "None")}</p></div></div></div></main></div></div>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/admin-test.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const adminTest = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-2cee1e08"]]);

export { adminTest as default };
//# sourceMappingURL=admin-test-BZz3Tip5.mjs.map
