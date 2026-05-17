import { defineComponent, computed, mergeProps, useSSRContext } from 'vue';
import { ssrRenderAttrs } from 'vue/server-renderer';
import { _ as _export_sfc } from './server.mjs';

const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "PlayerAvatar",
  __ssrInlineRender: true,
  props: {
    name: {},
    mood: {},
    isActive: { type: Boolean },
    size: {}
  },
  setup(__props) {
    const props = __props;
    function nameHash(name) {
      let h = 0;
      for (let i = 0; i < name.length; i++) {
        h = (h << 5) - h + name.charCodeAt(i) | 0;
      }
      return Math.abs(h);
    }
    const skinIndex = computed(() => nameHash(props.name) % SKIN_COLORS.length);
    const hairIndex = computed(() => nameHash(props.name + "hair") % HAIR_COLORS.length);
    const hairStyle = computed(() => nameHash(props.name + "style") % 6);
    const SKIN_COLORS = [
      ["#FFE0BD", "#D4A373"],
      // 暖白
      ["#F5D0A9", "#C4956A"],
      // 小麦色
      ["#FFDCB1", "#D0A87C"],
      // 蜜桃
      ["#E8C4A0", "#B89470"],
      // 蜜色
      ["#F0D5BE", "#C8A48C"]
      // 浅蜜
    ];
    const HAIR_COLORS = [
      "#2C1810",
      // 黑发
      "#4A3728",
      // 棕发
      "#8B4513",
      // 深棕
      "#D4A017",
      // 金发
      "#B22222",
      // 红发
      "#4169E1",
      // 蓝发（彩）
      "#9B59B6",
      // 紫发（彩）
      "#27AE60"
      // 绿发（彩）
    ];
    const colorScheme = computed(() => ({
      "--skin-color": SKIN_COLORS[skinIndex.value][0],
      "--skin-shadow": SKIN_COLORS[skinIndex.value][1],
      "--hair-color": HAIR_COLORS[hairIndex.value],
      "--pupil-color": "#2C3E50",
      "--mouth-color": "#E74C3C"
    }));
    return (_ctx, _push, _parent, _attrs) => {
      const _cssVars = { style: {
        ":--v27abccf8": __props.size || 44
      } };
      _push(`<div${ssrRenderAttrs(mergeProps({
        class: ["player-avatar", [`avatar--${__props.mood}`, { "avatar--active": __props.isActive }]],
        style: colorScheme.value
      }, _attrs, _cssVars))} data-v-9d7646ef><svg viewBox="0 0 100 100" class="avatar-svg" data-v-9d7646ef><circle cx="50" cy="52" r="38" class="face" data-v-9d7646ef></circle><ellipse cx="28" cy="60" rx="8" ry="5" class="blush" data-v-9d7646ef></ellipse><ellipse cx="72" cy="60" rx="8" ry="5" class="blush" data-v-9d7646ef></ellipse><g class="hair" data-v-9d7646ef>`);
      if (hairStyle.value === 0) {
        _push(`<path d="M12 42 Q20 18 50 14 Q80 18 88 42 Q84 30 50 22 Q16 30 12 42Z" fill="var(--hair-color)" data-v-9d7646ef></path>`);
      } else if (hairStyle.value === 1) {
        _push(`<!--[--><path d="M12 42 Q20 18 50 14 Q80 18 88 42 Q84 30 50 22 Q16 30 12 42Z" fill="var(--hair-color)" data-v-9d7646ef></path><path d="M50 14 Q48 22 52 28" stroke="var(--skin-shadow)" stroke-width="2" fill="none" data-v-9d7646ef></path><!--]-->`);
      } else if (hairStyle.value === 2) {
        _push(`<path d="M14 40 Q18 14 30 18 Q28 8 42 14 Q44 4 50 12 Q56 4 58 14 Q72 8 70 18 Q82 14 86 40 Q82 28 50 22 Q18 28 14 40Z" fill="var(--hair-color)" data-v-9d7646ef></path>`);
      } else if (hairStyle.value === 3) {
        _push(`<!--[--><path d="M12 42 Q20 18 50 14 Q80 18 88 42 Q84 30 50 22 Q16 30 12 42Z" fill="var(--hair-color)" data-v-9d7646ef></path><path d="M12 42 Q8 52 14 68 Q18 62 16 42Z" fill="var(--hair-color)" data-v-9d7646ef></path><path d="M88 42 Q92 52 86 68 Q82 62 84 42Z" fill="var(--hair-color)" data-v-9d7646ef></path><!--]-->`);
      } else {
        _push(`<!--[--><path d="M14 42 Q22 18 50 14 Q78 18 86 42 Q82 30 50 22 Q18 30 14 42Z" fill="var(--hair-color)" data-v-9d7646ef></path><path d="M55 14 Q58 4 62 6 Q60 12 58 18Z" fill="var(--hair-color)" data-v-9d7646ef></path><!--]-->`);
      }
      _push(`</g><g class="eyebrows" data-v-9d7646ef>`);
      if (__props.mood === "angry") {
        _push(`<!--[--><line x1="30" y1="38" x2="40" y2="40" stroke="var(--hair-color)" stroke-width="2.5" stroke-linecap="round" data-v-9d7646ef></line><line x1="60" y1="40" x2="70" y2="38" stroke="var(--hair-color)" stroke-width="2.5" stroke-linecap="round" data-v-9d7646ef></line><!--]-->`);
      } else if (__props.mood === "thinking") {
        _push(`<!--[--><line x1="30" y1="40" x2="40" y2="38" stroke="var(--hair-color)" stroke-width="2" stroke-linecap="round" data-v-9d7646ef></line><line x1="60" y1="38" x2="70" y2="40" stroke="var(--hair-color)" stroke-width="2" stroke-linecap="round" data-v-9d7646ef></line><!--]-->`);
      } else {
        _push(`<!--[--><line x1="30" y1="40" x2="40" y2="40" stroke="var(--hair-color)" stroke-width="2" stroke-linecap="round" data-v-9d7646ef></line><line x1="60" y1="40" x2="70" y2="40" stroke="var(--hair-color)" stroke-width="2" stroke-linecap="round" data-v-9d7646ef></line><!--]-->`);
      }
      _push(`</g><g class="eyes" data-v-9d7646ef>`);
      if (__props.mood === "normal" || __props.mood === "thinking") {
        _push(`<!--[--><ellipse cx="35" cy="48" rx="6" ry="7" class="eye-white" data-v-9d7646ef></ellipse><circle cx="35" cy="49" r="4" class="pupil" data-v-9d7646ef></circle><circle cx="37" cy="47" r="1.5" class="eye-shine" data-v-9d7646ef></circle><ellipse cx="65" cy="48" rx="6" ry="7" class="eye-white" data-v-9d7646ef></ellipse><circle cx="65" cy="49" r="4" class="pupil" data-v-9d7646ef></circle><circle cx="67" cy="47" r="1.5" class="eye-shine" data-v-9d7646ef></circle><!--]-->`);
      } else if (__props.mood === "happy" || __props.mood === "winning") {
        _push(`<!--[--><path d="M28 48 Q35 42 42 48" stroke="var(--pupil-color)" stroke-width="3" fill="none" stroke-linecap="round" data-v-9d7646ef></path><path d="M58 48 Q65 42 72 48" stroke="var(--pupil-color)" stroke-width="3" fill="none" stroke-linecap="round" data-v-9d7646ef></path><!--]-->`);
      } else if (__props.mood === "angry") {
        _push(`<!--[--><ellipse cx="35" cy="48" rx="6" ry="7" class="eye-white" data-v-9d7646ef></ellipse><circle cx="35" cy="50" r="4" class="pupil" data-v-9d7646ef></circle><ellipse cx="65" cy="48" rx="6" ry="7" class="eye-white" data-v-9d7646ef></ellipse><circle cx="65" cy="50" r="4" class="pupil" data-v-9d7646ef></circle><!--]-->`);
      } else if (__props.mood === "impatient") {
        _push(`<!--[--><ellipse cx="35" cy="48" rx="5" ry="3" class="eye-white" data-v-9d7646ef></ellipse><circle cx="35" cy="48" r="3" class="pupil" data-v-9d7646ef></circle><ellipse cx="65" cy="48" rx="5" ry="3" class="eye-white" data-v-9d7646ef></ellipse><circle cx="65" cy="48" r="3" class="pupil" data-v-9d7646ef></circle><!--]-->`);
      } else {
        _push(`<!--[--><ellipse cx="35" cy="48" rx="6" ry="7" class="eye-white" data-v-9d7646ef></ellipse><circle cx="35" cy="49" r="4" class="pupil" data-v-9d7646ef></circle><circle cx="37" cy="47" r="1.5" class="eye-shine" data-v-9d7646ef></circle><ellipse cx="65" cy="48" rx="6" ry="7" class="eye-white" data-v-9d7646ef></ellipse><circle cx="65" cy="49" r="4" class="pupil" data-v-9d7646ef></circle><circle cx="67" cy="47" r="1.5" class="eye-shine" data-v-9d7646ef></circle><!--]-->`);
      }
      _push(`</g><g class="mouth" data-v-9d7646ef>`);
      if (__props.mood === "normal") {
        _push(`<path d="M40 66 Q50 74 60 66" stroke="var(--mouth-color)" stroke-width="2.5" fill="none" stroke-linecap="round" data-v-9d7646ef></path>`);
      } else if (__props.mood === "happy") {
        _push(`<!--[--><path d="M36 64 Q50 78 64 64" stroke="var(--mouth-color)" stroke-width="2.5" fill="#fff" stroke-linecap="round" data-v-9d7646ef></path><path d="M42 68 Q50 73 58 68" fill="#f48fb1" data-v-9d7646ef></path><!--]-->`);
      } else if (__props.mood === "angry") {
        _push(`<!--[--><ellipse cx="50" cy="68" rx="6" ry="5" fill="var(--mouth-color)" data-v-9d7646ef></ellipse><circle cx="50" cy="66" r="3" fill="#fff" data-v-9d7646ef></circle><!--]-->`);
      } else if (__props.mood === "thinking") {
        _push(`<path d="M42 68 Q52 66 58 70" stroke="var(--mouth-color)" stroke-width="2.5" fill="none" stroke-linecap="round" data-v-9d7646ef></path>`);
      } else if (__props.mood === "impatient") {
        _push(`<line x1="40" y1="68" x2="60" y2="68" stroke="var(--mouth-color)" stroke-width="2.5" stroke-linecap="round" data-v-9d7646ef></line>`);
      } else if (__props.mood === "winning") {
        _push(`<!--[--><path d="M34 64 Q50 80 66 64" stroke="var(--mouth-color)" stroke-width="2.5" fill="#fff" stroke-linecap="round" data-v-9d7646ef></path><path d="M40 70 Q50 77 60 70" fill="#f48fb1" data-v-9d7646ef></path><!--]-->`);
      } else {
        _push(`<path d="M40 66 Q50 74 60 66" stroke="var(--mouth-color)" stroke-width="2.5" fill="none" stroke-linecap="round" data-v-9d7646ef></path>`);
      }
      _push(`</g>`);
      if (__props.mood === "winning") {
        _push(`<g class="winning-stars" data-v-9d7646ef><polygon points="20,20 22,26 28,26 23,30 25,36 20,32 15,36 17,30 12,26 18,26" fill="#FFD700" class="star star--1" data-v-9d7646ef></polygon><polygon points="80,18 82,24 88,24 83,28 85,34 80,30 75,34 77,28 72,24 78,24" fill="#FFD700" class="star star--2" data-v-9d7646ef></polygon><polygon points="50,8 51,12 55,12 52,15 53,19 50,17 47,19 48,15 45,12 49,12" fill="#FFD700" class="star star--3" data-v-9d7646ef></polygon></g>`);
      } else {
        _push(`<!---->`);
      }
      if (__props.mood === "thinking") {
        _push(`<g class="thinking-bubbles" data-v-9d7646ef><circle cx="82" cy="22" r="4" fill="rgba(255,255,255,0.6)" data-v-9d7646ef></circle><circle cx="88" cy="14" r="3" fill="rgba(255,255,255,0.5)" data-v-9d7646ef></circle><circle cx="91" cy="7" r="2" fill="rgba(255,255,255,0.4)" data-v-9d7646ef></circle></g>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</svg></div>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/PlayerAvatar.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const PlayerAvatar = /* @__PURE__ */ Object.assign(_export_sfc(_sfc_main, [["__scopeId", "data-v-9d7646ef"]]), { __name: "PlayerAvatar" });

export { PlayerAvatar as P };
//# sourceMappingURL=PlayerAvatar-BQI5EGaR.mjs.map
