import policyWrap from './AI_policies/characters/AI-AK.json' assert { type: 'json' }

const p:any = (policyWrap as any).policy || policyWrap
const discardHuChance = Number(p.discardHuChance ?? 1)
const discardHuMenQingPenalty = Number(p.discardHuMenQingPenalty ?? 0)
const huProb = (1 - discardHuMenQingPenalty) * discardHuChance
const passProb = 1 - huProb
const missTwoProb = passProb * passProb

console.log(JSON.stringify({
  discardHuChance,
  discardHuMenQingPenalty,
  huProb,
  passProb,
  missTwoProb
}, null, 2))
