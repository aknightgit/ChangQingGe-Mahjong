import { withAsyncContext, computed, ref, reactive, mergeProps, unref, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrRenderClass, ssrRenderAttr, ssrInterpolate, ssrIncludeBooleanAttr, ssrRenderList } from 'vue/server-renderer';
import { u as useFetch } from './fetch-CBTH2abM.mjs';
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
import '@vue/shared';
import './asyncData-1qhn2CUx.mjs';
import 'perfect-debounce';
import 'vue-router';
import 'tailwindcss/colors';
import '@iconify/vue';
import '../routes/renderer.mjs';
import 'vue-bundle-renderer/runtime';
import 'unhead/server';
import 'devalue';
import 'unhead/utils';

const _sfc_main = {
  __name: "login",
  __ssrInlineRender: true,
  async setup(__props) {
    let __temp, __restore;
    const { data: usersData, pending: usersPending } = ([__temp, __restore] = withAsyncContext(() => useFetch(
      "/mahjong/api/auth/users",
      "$OmPb63Pfrd"
      /* nuxt-injected */
    )), __temp = await __temp, __restore(), __temp);
    const playerUsers = computed(() => (usersData.value?.users || []).filter((u) => !u.isAdmin));
    const activeTab = ref("login");
    const isSubmitting = ref(false);
    const loginError = ref("");
    const registerError = ref("");
    const loginForm = reactive({ phone: "", password: "" });
    const registerForm = reactive({ name: "", phone: "", password: "" });
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "mahjong-page" }, _attrs))} data-v-d9e37a7b><div class="mahjong-card" data-v-d9e37a7b><div class="login-shell" data-v-d9e37a7b><section class="login-main" data-v-d9e37a7b><h1 class="mahjong-title" data-v-d9e37a7b>长清阁麻将</h1><p class="mahjong-subtitle" data-v-d9e37a7b>上海麻将 × 四川麻将</p><div class="tab-bar" data-v-d9e37a7b><button class="${ssrRenderClass([{ "tab-btn--active": unref(activeTab) === "login" }, "tab-btn"])}" data-v-d9e37a7b>登录</button><button class="${ssrRenderClass([{ "tab-btn--active": unref(activeTab) === "register" }, "tab-btn"])}" data-v-d9e37a7b>注册</button></div>`);
      if (unref(activeTab) === "login") {
        _push(`<div class="form-section" data-v-d9e37a7b><div class="form-field" data-v-d9e37a7b><label data-v-d9e37a7b>手机号</label><input${ssrRenderAttr("value", unref(loginForm).phone)} type="tel" placeholder="输入11位手机号" maxlength="11" autocomplete="tel" data-v-d9e37a7b></div><div class="form-field" data-v-d9e37a7b><label data-v-d9e37a7b>密码</label><input${ssrRenderAttr("value", unref(loginForm).password)} type="password" placeholder="输入密码" autocomplete="current-password" data-v-d9e37a7b></div>`);
        if (unref(loginError)) {
          _push(`<p class="status-text error" data-v-d9e37a7b>${ssrInterpolate(unref(loginError))}</p>`);
        } else {
          _push(`<!---->`);
        }
        _push(`</div>`);
      } else {
        _push(`<div class="form-section" data-v-d9e37a7b><div class="form-field" data-v-d9e37a7b><label data-v-d9e37a7b>玩家名 <span class="required" data-v-d9e37a7b>*</span></label><input${ssrRenderAttr("value", unref(registerForm).name)} type="text" placeholder="输入你的昵称" maxlength="20" data-v-d9e37a7b></div><div class="form-field" data-v-d9e37a7b><label data-v-d9e37a7b>手机号 <span class="required" data-v-d9e37a7b>*</span></label><input${ssrRenderAttr("value", unref(registerForm).phone)} type="tel" placeholder="输入11位国内手机号" maxlength="11" autocomplete="tel" data-v-d9e37a7b></div><div class="form-field" data-v-d9e37a7b><label data-v-d9e37a7b>密码 <span class="required" data-v-d9e37a7b>*</span></label><input${ssrRenderAttr("value", unref(registerForm).password)} type="password" placeholder="至少4位密码" autocomplete="new-password" data-v-d9e37a7b></div>`);
        if (unref(registerError)) {
          _push(`<p class="status-text error" data-v-d9e37a7b>${ssrInterpolate(unref(registerError))}</p>`);
        } else {
          _push(`<!---->`);
        }
        _push(`</div>`);
      }
      _push(`</section><aside class="login-side" data-v-d9e37a7b><div class="submit-section" data-v-d9e37a7b>`);
      if (unref(activeTab) === "login") {
        _push(`<button class="mahjong-button primary-btn"${ssrIncludeBooleanAttr(unref(isSubmitting)) ? " disabled" : ""} data-v-d9e37a7b>${ssrInterpolate(unref(isSubmitting) ? "登录中..." : "登录")}</button>`);
      } else {
        _push(`<button class="mahjong-button primary-btn"${ssrIncludeBooleanAttr(unref(isSubmitting)) ? " disabled" : ""} data-v-d9e37a7b>${ssrInterpolate(unref(isSubmitting) ? "注册中..." : "注册")}</button>`);
      }
      _push(`</div><div class="divider" data-v-d9e37a7b><span data-v-d9e37a7b>或选择已有玩家</span></div><div class="quick-login" data-v-d9e37a7b>`);
      if (unref(usersPending)) {
        _push(`<div class="status-text" data-v-d9e37a7b>加载中...</div>`);
      } else if (unref(playerUsers).length === 0) {
        _push(`<div class="status-text" data-v-d9e37a7b>暂无已有玩家</div>`);
      } else {
        _push(`<div class="player-chips" data-v-d9e37a7b><!--[-->`);
        ssrRenderList(unref(playerUsers), (user) => {
          _push(`<button class="player-chip"${ssrIncludeBooleanAttr(unref(isSubmitting)) ? " disabled" : ""} data-v-d9e37a7b>${ssrInterpolate(user.name)}</button>`);
        });
        _push(`<!--]--></div>`);
      }
      _push(`</div></aside></div></div></div>`);
    };
  }
};
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/login.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const login = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-d9e37a7b"]]);

export { login as default };
//# sourceMappingURL=login-B-Ftf5IW.mjs.map
