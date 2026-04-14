import { canWin } from '../server/utils/handValidator.ts'
import { TileSuit } from '../server/types/game.ts'
const m=(s,v,i)=>({suit:s,value:v,id:String(i),isFlower:false})
const hand=[
 m(TileSuit.CHARACTERS,1,1),m(TileSuit.CHARACTERS,1,2),m(TileSuit.CHARACTERS,1,3),
 m(TileSuit.CHARACTERS,2,4),m(TileSuit.CHARACTERS,2,5),m(TileSuit.CHARACTERS,2,6),
 m(TileSuit.CHARACTERS,3,7),m(TileSuit.CHARACTERS,3,8),m(TileSuit.CHARACTERS,3,9),
 m(TileSuit.BAMBOOS,1,10),m(TileSuit.BAMBOOS,1,11),m(TileSuit.BAMBOOS,1,12),
 m(TileSuit.CHARACTERS,7,13),m(TileSuit.CHARACTERS,7,14),
]
console.log('no wild', canWin(hand,0,null))
console.log('wild wan-7', canWin(hand,0,'wan-7'))
