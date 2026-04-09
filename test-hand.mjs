import { canWin, buildWildTileChecker } from './server/utils/handValidator.ts';
import { normalizeHand } from './server/utils/tiles.ts';

function makeTile(suit, value) { return { suit, value, id: `${suit}-${value}` }; }

const wildId = 'CHARACTERS-5';
const wild = makeTile('CHARACTERS', 5);

// 4 wilds + 10 tiles: 3 pongs + 1 pair
const hand4wild = [wild,wild,wild,wild,
  makeTile('DOTS',1),makeTile('DOTS',1),makeTile('DOTS',1),
  makeTile('DOTS',2),makeTile('DOTS',2),makeTile('DOTS',2),
  makeTile('DOTS',3),makeTile('DOTS',3)
];
console.log('4 wilds:', JSON.stringify(canWin(hand4wild, 0, wildId)));

// 3 wilds: need to see if 3 wilds can win
const hand3wild = [wild,wild,wild,
  makeTile('DOTS',1),makeTile('DOTS',1),makeTile('DOTS',1),
  makeTile('DOTS',2),makeTile('DOTS',2),makeTile('DOTS',2),
  makeTile('DOTS',3),makeTile('DOTS',3),makeTile('DOTS',4),makeTile('DOTS',5)
];
console.log('3 wilds:', JSON.stringify(canWin(hand3wild, 0, wildId)));

// 1 wild: full hand without wild
const hand0wild = [
  makeTile('DOTS',1),makeTile('DOTS',1),makeTile('DOTS',1),
  makeTile('DOTS',2),makeTile('DOTS',3),makeTile('DOTS',4),
  makeTile('DOTS',5),makeTile('DOTS',6),makeTile('DOTS',7),
  makeTile('CHARACTERS',1),makeTile('CHARACTERS',1),makeTile('CHARACTERS',2),makeTile('CHARACTERS',3),makeTile('CHARACTERS',4)
];
console.log('0 wilds (normal full hand):', JSON.stringify(canWin(hand0wild, 0, null)));
console.log('0 wilds (no wild tile in game):', JSON.stringify(canWin(hand0wild, 0, null)));

// 1 wild in hand with wildId='CHARACTERS-5'  
const hand1wild_1 = [wild,
  makeTile('DOTS',1),makeTile('DOTS',1),makeTile('DOTS',1),
  makeTile('DOTS',2),makeTile('DOTS',3),makeTile('DOTS',4),
  makeTile('DOTS',5),makeTile('DOTS',6),makeTile('DOTS',7),
  makeTile('CHARACTERS',1),makeTile('CHARACTERS',2),makeTile('CHARACTERS',3),makeTile('CHARACTERS',4)
];
console.log('1 wild (natural pair exists):', JSON.stringify(canWin(hand1wild_1, 0, wildId)));
