function t(suit: string, value: number) {
  return { suit, value, id: `${suit}-${value}-${Math.random().toString(36).slice(2)}`, isFlower: false };
}

const hand1 = [
  t('dots',1),t('dots',1),t('dots',1),
  t('dots',2),t('dots',2),t('dots',2),
  t('dots',3),t('dots',3),t('dots',3),
  t('dots',4),t('dots',4),t('dots',4),
  t('feng',1),t('feng',1)
];

const countMap = new Map<string, number>();
for (const tile of hand1) {
  const k = `${tile.suit}-${tile.value}`;
  countMap.set(k, (countMap.get(k) || 0) + 1);
}

let depth = 0;
let callCount = 0;

function backtrack(remaining: number, wildLeft: number, map: Map<string, number>): boolean {
  callCount++;
  depth++;
  const indent = '  '.repeat(depth);
  
  if (remaining === 0) {
    const vals = [...map.values()];
    const allZero = vals.every(v => v === 0);
    const wildOk = wildLeft === 0;
    const result = allZero && wildOk;
    console.log(`${indent}BASE: remaining=0 wildLeft=${wildLeft} allZero=${allZero} wildOk=${wildOk} → ${result}`);
    depth--;
    return result;
  }
  
  let firstKey: string | null = null;
  for (const k of map.keys()) {
    if ((map.get(k) || 0) > 0) { firstKey = k; break; }
  }
  
  if (!firstKey) {
    const result = wildLeft >= remaining * 3;
    console.log(`${indent}NO_FIRST: wildLeft=${wildLeft} need=${remaining*3} → ${result}`);
    depth--;
    return result;
  }
  
  const [suit, valStr] = firstKey.split('-');
  const val = parseInt(valStr);
  const cnt = map.get(firstKey)!;
  const needForTriplet = 3 - cnt;
  
  console.log(`${indent}first=${firstKey} cnt=${cnt} need=${needForTriplet} wildLeft=${wildLeft}`);
  
  if (needForTriplet <= wildLeft) {
    map.set(firstKey, 0);
    const r = backtrack(remaining - 1, wildLeft - needForTriplet, map);
    map.set(firstKey, cnt);
    if (r) { depth--; return true; }
  }
  
  const numSuits = ['dots', 'characters', 'bamboos'];
  if (numSuits.includes(suit) && val <= 7) {
    const k2 = `${suit}-${val + 1}`;
    const k3 = `${suit}-${val + 2}`;
    const c2 = map.get(k2) || 0;
    const c3 = map.get(k3) || 0;
    const missing = (c2 > 0 ? 0 : 1) + (c3 > 0 ? 0 : 1);
    if (missing <= wildLeft) {
      const orig2 = c2, orig3 = c3;
      map.set(firstKey, 0);
      if (c2 > 0) map.set(k2, c2 - 1);
      if (c3 > 0) map.set(k3, c3 - 1);
      const r = backtrack(remaining - 1, wildLeft - missing, map);
      map.set(firstKey, cnt);
      if (c2 > 0) map.set(k2, orig2);
      if (c3 > 0) map.set(k3, orig3);
      depth--;
      return r;
    }
  }
  
  depth--;
  return false;
}

const r = backtrack(4, 0, countMap);
console.log('RESULT:', r, 'calls:', callCount);
