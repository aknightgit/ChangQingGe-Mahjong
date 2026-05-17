import { defineComponent, mergeProps, useSSRContext } from 'vue';
import { ssrRenderAttrs } from 'vue/server-renderer';
import { _ as _export_sfc, u as useRoute } from './server.mjs';
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
  __name: "[roomId]",
  __ssrInlineRender: true,
  setup(__props) {
    const route = useRoute();
    route.params.roomId;
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "spectate-redirect" }, _attrs))} data-v-e8ce4e41><div class="loading-spinner" data-v-e8ce4e41></div><p class="loading-text" data-v-e8ce4e41>正在进入观赛模式...</p></div>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/spectate/[roomId].vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const _roomId_ = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-e8ce4e41"]]);

export { _roomId_ as default };
//# sourceMappingURL=_roomId_-DEBP4A4v.mjs.map
