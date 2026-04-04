/**
 * createStore — 40行极简状态管理
 * 
 * 来源: Claude Code src/state/store.ts (从1968条 TS/TSX 文件中提炼)
 * 
 * 核心原理:
 * - Object.is 引用相等短路 → immutably更新才通知
 * - updater 函数模式 → 与 React setState API 一致
 * 
 * 用法:
 *   const gameStore = createStore({ phase: 'waiting', round: 0 })
 *   gameStore.subscribe(() => console.log(gameStore.getState()))
 *   gameStore.setState(p => ({ ...p, round: p.round + 1 }))
 * 
 * 约束:
 *   ✅ setState 必须返回新对象: setState(p => ({ ...p, field: val }))
 *   ❌ 禁止直接 state.field = val (不触发通知)
 */

type Listener = () => void
type OnChange<T> = (update: { oldState: T; newState: T }) => void

export type Store<T> = {
  getState: () => T
  setState: (updater: (prev: T) => T) => void
  subscribe: (listener: Listener) => () => void
}

/**
 * Create a reactive store with immutable update semantics.
 * 
 * @param initialState - Initial state object
 * @param onChange - Optional callback fired on state changes (for logging/persistence)
 */
export function createStore<T>(initialState: T, onChange?: OnChange<T>): Store<T> {
  let state = initialState
  const listeners = new Set<Listener>()

  return {
    getState: () => state,
    setState: (updater: (prev: T) => T) => {
      const prev = state
      const next = updater(prev)
      // 核心优化: 引用相等 → 无变更 → 跳过通知
      if (Object.is(next, prev)) return
      state = next
      onChange?.({ newState: next, oldState: prev })
      for (const listener of listeners) listener()
    },
    subscribe: (listener: Listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}
