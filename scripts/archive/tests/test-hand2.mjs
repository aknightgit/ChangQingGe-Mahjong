import { canWin, buildWildTileChecker } from './server/utils/handValidator.ts';

function makeTile(suit, value) { return { suit, value, id: `${suit}-${value}` }; }

// Standard 14-tile winning hand: 4 pongs + 1 pair
const std14 = [
  makeTile('DOTS',1),makeTile('DOTS',1),makeTile('DOTS',1),
  makeTile('DOTS',2),makeTile('DOTS',2),makeTile('DOTS',2),
  makeTile('DOTS',3),makeTile('DOTS',3),makeTile('DOTS',3),
  makeTile('DOTS',4),makeTile('DOTS',4),makeTile('DOTS',4),
  makeTile('CHARACTERS',1),makeTile('CHARACTERS',1)
];
console.log('Standard 14 (4pongs+pair):', JSON.stringify(canWin(std14, 0, null)));

// 14-tile winning: 3 pongs + 1 sequence + 1 pair
const std14b = [
  makeTile('DOTS',1),makeTile('DOTS',1),makeTile('DOTS',1),
  makeTile('DOTS',2),makeTile('DOTS',2),makeTile('DOTS',2),
  makeTile('DOTS',3),makeTile('DOTS',3),makeTile('DOTS',3),
  makeTile('DOTS',4),makeTile('DOTS',5),makeTile('DOTS',6),
  makeTile('CHARACTERS',1),makeTile('CHARACTERS',1)
];
console.log('14 (3pongs+seq+pair):', JSON.stringify(canWin(std14b, 0, null)));

// Test: 13 tiles (before draw)
const std13 = std14.slice(0, 13);
console.log('Standard 13 (before draw):', JSON.stringify(canWin(std13, 0, null)));

// Test with wild tile
const wildId = 'CHARACTERS-5';
const wild = makeTile('CHARACTERS', 5);
const wildHand = [wild,
  makeTile('DOTS',1),makeTile('DOTS',1),makeTile('DOTS',1),
  makeTile('DOTS',2),makeTile('DOTS',3),makeTile('DOTS',4),
  makeTile('DOTS',5),makeTile('DOTS',6),makeTile('DOTS',7),
  makeTile('CHARACTERS',1),makeTile('CHARACTERS',1),makeTile('CHARACTERS',3),makeTile('CHARACTERS',4)
];
console.log('14 with 1 wild (wild completes seq+pair):', JSON.stringify(canWin(wildHand, 0, wildId)));
