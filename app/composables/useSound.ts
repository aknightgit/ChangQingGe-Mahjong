/**
 * 音效管理器
 *
 * 使用 Web Audio API 合成音效（无需外部音频文件）
 * 音效触发点：
 *   playSound('tile-draw')    - 摸牌
 *   playSound('tile-discard')  - 弃牌
 *   playSound('tile-chow')     - 吃牌
 *   playSound('tile-pong')     - 碰牌
 *   playSound('tile-kong')    - 杠牌
 *   playSound('tile-hu')      - 胡牌
 *   playSound('tile-rebel')   - 造反
 *   playSound('dice-roll')    - 掷骰子
 *   playSound('timer-warn')   - 定时器警告
 *   playSound('turn-notify')  - 回合通知
 *
 * 使用方式：
 *   const { play, isEnabled, setEnabled } = useSound()
 *   play('tile-draw')
 *   setEnabled(false) // 静音
 */

import {
  playTileDraw,
  playTileDiscard,
  playTileChow,
  playTilePong,
  playTileKong,
  playTileHu,
  playTileRebel,
  playDiceRoll,
  playTimerWarn,
  playTurnNotify,
} from './useSoundSynth'

// 音效名称 → 合成函数映射
const SOUND_PLAYERS: Record<string, () => void> = {
  'tile-draw': playTileDraw,
  'tile-discard': playTileDiscard,
  'tile-chow': playTileChow,
  'tile-pong': playTilePong,
  'tile-kong': playTileKong,
  'tile-hu': playTileHu,
  'tile-rebel': playTileRebel,
  'dice-roll': playDiceRoll,
  'timer-warn': playTimerWarn,
  'turn-notify': playTurnNotify,
}

// 全局状态（单例）
const _isEnabled = ref(true)

export const useSound = () => {
  const play = (name: string) => {
    if (!_isEnabled.value || !process.client) return
    const player = SOUND_PLAYERS[name]
    if (!player) return
    try {
      player()
    } catch {
      // silent fail
    }
  }

  const setEnabled = (enabled: boolean) => {
    _isEnabled.value = enabled
  }

  return {
    play,
    isEnabled: _isEnabled,
    setEnabled,
  }
}
