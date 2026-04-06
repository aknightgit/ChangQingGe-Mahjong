/**
 * seat-layout-config.ts — 统一方向/起点/反转控制
 *
 * 四大座位共用同一套参数系统，所有值从 CSS 变量读取（LayoutDebugPanel 注入），
 * 确保 yellow (top/left/right) 和 purple 容器走同一分支。
 *
 * 参数体系：
 *   direction:  0=默认顺序, 1=反向顺序（容器内子元素排列方向反转）
 *   start:      0=从常规端开始, 1=从远端开始（等价于 row/column-reverse）
 *   reverse:    0=normal, 1=reversed（覆盖 direction 的效果，调试面板用）
 *
 * CSS 变量名规范：
 *   --{seat}-{zone}-direction
 *   --{seat}-{zone}-start
 *   --{seat}-{zone}-reverse
 *
 * seat:  self | opp | left | right
 * zone:  hand | meld
 */

export interface SeatLayoutParams {
  direction: number
  start: number
  reverse: number
}

export const DEFAULT_LAYOUT: Record<string, SeatLayoutParams> = {
  // 自家（底部，黄色）
  'self-hand':  { direction: 0, start: 0, reverse: 0 },
  'self-meld':  { direction: 0, start: 0, reverse: 0 },
  // 对家（顶部，黄色）
  'opp-hand':   { direction: 0, start: 0, reverse: 0 },
  'opp-meld':   { direction: 0, start: 0, reverse: 0 },
  // 上家（左侧，紫色）
  'left-hand':  { direction: 0, start: 0, reverse: 0 },
  'left-meld':  { direction: 0, start: 0, reverse: 0 },
  // 下家（右侧，紫色）
  'right-hand': { direction: 0, start: 0, reverse: 0 },
  'right-meld': { direction: 0, start: 0, reverse: 0 },
}

/**
 * 读取 CSS 变量，返回 SeatLayoutParams
 * @param key 参数 key，如 'opp-hand', 'left-hand'
 */
export function readSeatParams(key: string): SeatLayoutParams {
  if (typeof document === 'undefined') return DEFAULT_LAYOUT[key] || { direction: 0, start: 0, reverse: 0 }
  const root = document.documentElement
  const gv = (v: string) => {
    const raw = root.style.getPropertyValue(`--${key}-${v}`).trim()
    return raw !== '' ? Number(raw) : (DEFAULT_LAYOUT[key]?.[v as keyof SeatLayoutParams] ?? 0)
  }
  return {
    direction: gv('direction'),
    start: gv('start'),
    reverse: gv('reverse'),
  }
}

/**
 * 根据 SeatLayoutParams 计算 CSS flex-direction
 * @param base 基础方向：'row' | 'column'
 */
export function computeFlexDirection(
  param: SeatLayoutParams,
  base: 'row' | 'column'
): string {
  // reverse 优先级最高（调试面板直接覆盖）
  const effectiveReverse = param.reverse === 1
    || (param.start === 1 && param.direction === 0)

  if (effectiveReverse) {
    return base === 'row' ? 'row-reverse' : 'column-reverse'
  }
  return base
}

/**
 * 将参数转为 CSS 变量设置对象
 */
export function toCssVars(seatKey: string, params: Partial<SeatLayoutParams>): Record<string, string> {
  const result: Record<string, string> = {}
  if (params.direction !== undefined) result[`--${seatKey}-direction`] = String(params.direction)
  if (params.start !== undefined) result[`--${seatKey}-start`] = String(params.start)
  if (params.reverse !== undefined) result[`--${seatKey}-reverse`] = String(params.reverse)
  return result
}
