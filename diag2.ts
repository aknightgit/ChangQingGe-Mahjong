import { runGame } from './scripts/train-ai-ak'
import { loadPolicy } from './scripts/training-reporter'

const ak = loadPolicy()
const others = [loadPolicy(), loadPolicy(), loadPolicy()]
const r = runGame(ak, others, 0)

const snaps = r.turnSnapshots!
console.log(`Total: ${snaps.length}`)
for (let i = 0; i < Math.min(6, snaps.length); i++) {
  const s = snaps[i]
  const ak = s.players?.[0]
  console.log(`\n[${i}] turn=${s.turn} curr=${s.currentPlayer} drawn=${s.drawnTile} disc=${s.discardedTile} wild=${s.wildTile}`)
  if (ak) {
    console.log(`  AK handCnt=${ak.handCount} exposed=${JSON.stringify(ak.exposed)}`)
    console.log(`  AK hand: ${ak.hand.join(' ')}`)
  } else {
    console.log(`  players empty, len=${s.players?.length}`)
  }
}
