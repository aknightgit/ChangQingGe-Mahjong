import { canWin, findBestHandTypes } from '../server/utils/handValidator.js';

const tests = [
  {
    name: 'ALL_TRIPLETS: 14 tiles, all triplets',
    hand: [
      { suit: 'wan', value: 1, id: 'w1-1' }, { suit: 'wan', value: 1, id: 'w1-2' }, { suit: 'wan', value: 1, id: 'w1-3' },
      { suit: 'wan', value: 3, id: 'w3-1' }, { suit: 'wan', value: 3, id: 'w3-2' }, { suit: 'wan', value: 3, id: 'w3-3' },
      { suit: 'wan', value: 5, id: 'w5-1' }, { suit: 'wan', value: 5, id: 'w5-2' }, { suit: 'wan', value: 5, id: 'w5-3' },
      { suit: 'wan', value: 7, id: 'w7-1' }, { suit: 'wan', value: 7, id: 'w7-2' }, { suit: 'wan', value: 7, id: 'w7-3' },
      { suit: 'wan', value: 9, id: 'w9-1' }, { suit: 'wan', value: 9, id: 'w9-2' },
    ],
    exposed: [] as any[],
    wildTileId: null as string | null
  },
];

for (const test of tests) {
  console.log(`\n=== TEST: ${test.name} ===`);
  console.log(`hand.length=${test.hand.length}, wildTileId=${test.wildTileId}`);
  
  const r1 = canWin(test.hand, test.exposed, test.wildTileId);
  console.log(`canWin => ${JSON.stringify(r1)}`);
  
  const r2 = findBestHandTypes(test.hand, test.exposed, test.wildTileId);
  console.log(`fbht => ${JSON.stringify(r2)}`);
}
