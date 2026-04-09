import { canWin, findBestHandTypes } from '../server/utils/handValidator.js';

const hand = [
  { suit: 'wan', value: 1, id: 'w1-1' }, { suit: 'wan', value: 1, id: 'w1-2' }, { suit: 'wan', value: 1, id: 'w1-3' },
  { suit: 'wan', value: 3, id: 'w3-1' }, { suit: 'wan', value: 3, id: 'w3-2' }, { suit: 'wan', value: 3, id: 'w3-3' },
  { suit: 'wan', value: 5, id: 'w5-1' }, { suit: 'wan', value: 5, id: 'w5-2' }, { suit: 'wan', value: 5, id: 'w5-3' },
  { suit: 'wan', value: 7, id: 'w7-1' }, { suit: 'wan', value: 7, id: 'w7-2' }, { suit: 'wan', value: 7, id: 'w7-3' },
  { suit: 'wan', value: 9, id: 'w9-1' }, { suit: 'wan', value: 9, id: 'w9-2' },
];
const exposed: any[] = [];
const wildTileId: string | null = null;

console.log(`Calling canWin with wildTileId=${wildTileId} typeof=${typeof wildTileId}`);
const cw = canWin(hand, exposed, wildTileId);
console.log('canWin result:', JSON.stringify(cw));

console.log(`Calling findBestHandTypes with wildTileId=${wildTileId}`);
const fbht = findBestHandTypes(hand, exposed, wildTileId);
console.log('fbht result:', JSON.stringify(fbht));
