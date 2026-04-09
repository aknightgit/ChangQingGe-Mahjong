import { canWin, findBestHandTypes } from '../server/utils/handValidator.js';

const hand = [
  { suit: 'wan', value: 1, id: 'w1-1' }, { suit: 'wan', value: 1, id: 'w1-2' }, { suit: 'wan', value: 1, id: 'w1-3' },
  { suit: 'wan', value: 3, id: 'w3-1' }, { suit: 'wan', value: 3, id: 'w3-2' }, { suit: 'wan', value: 3, id: 'w3-3' },
  { suit: 'wan', value: 5, id: 'w5-1' }, { suit: 'wan', value: 5, id: 'w5-2' }, { suit: 'wan', value: 5, id: 'w5-3' },
  { suit: 'wan', value: 7, id: 'w7-1' }, { suit: 'wan', value: 7, id: 'w7-2' }, { suit: 'wan', value: 7, id: 'w7-3' },
  { suit: 'wan', value: 9, id: 'w9-1' }, { suit: 'wan', value: 9, id: 'w9-2' },
];
const exposed: any[] = [];

console.log('calling canWin...');
process.stderr.write(`DEBUG: about to call canWin\n`);
const r = canWin(hand, exposed, null);
process.stderr.write(`DEBUG: canWin returned ${JSON.stringify(r)}\n`);
console.log('Result:', JSON.stringify(r));

console.log('calling findBestHandTypes...');
process.stderr.write(`DEBUG: about to call fbht\n`);
const fbht = findBestHandTypes(hand, exposed, null);
process.stderr.write(`DEBUG: fbht returned ${JSON.stringify(fbht)}\n`);
console.log('fbht:', JSON.stringify(fbht));
