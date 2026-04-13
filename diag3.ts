// Diagnostic: print first 6 turnSnapshots
import { runGame } from './scripts/train-ai-ak'
import * as fs from 'fs'
import * as path from 'path'

const policyPath = path.join(process.cwd(), 'AI_policies', 'characters', 'AI-AK.json')
const ak = JSON.parse(fs.readFileSync(policyPath, 'utf-8'))
const others = [ak, ak, ak]
const r = runGame(ak, others, 0)

const snaps = r.turnSnapshots!
console.log(`Total snaps: ${snaps.length}`)
for (let i = 0; i < Math.min(6, snaps.length); i++) {
  const s = snaps[i]
  const akP = s.players?.[0]
  console.log(`\n[${i}] turn=${s.turn} curr=${s.currentPlayer} drawn=${s.drawnTile} disc=${s.discardedTile}`)
  if (akP) {
    console.log(`  AK handCnt=${akP.handCount} exposed=${JSON.stringify(akP.exposed)}`)
    console.log(`  AK hand: ${akP.hand.join(' ')}`)
  } else {
    console.log(`  players: ${s.players?.length ?? 'empty'}`)
  }
}
