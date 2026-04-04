// Standalone debug: simulate tryFormMelds
const countMap = new Map();
countMap.set('wan-1', 4);
countMap.set('wan-2', 1);
countMap.set('wan-3', 1);
countMap.set('wan-4', 1);
countMap.set('wan-5', 1);
countMap.set('wan-6', 1);
countMap.set('wan-7', 1);
countMap.set('wan-8', 1);
countMap.set('wan-9', 1);
countMap.set('tiao-2', 2);

// Remove pair tiao-2
countMap.set('tiao-2', 0);

function tryFormMelds(n, wildLeft, map) {
  if (n === 0) {
    for (const c of map.values()) if (c > 0) return false;
    return wildLeft === 0;
  }
  let firstKey = null;
  for (const k of map.keys()) {
    if ((map.get(k) || 0) > 0) { firstKey = k; break; }
  }
  if (!firstKey) return wildLeft >= n * 3;
  const [suit, valStr] = firstKey.split('-');
  const val = parseInt(valStr);
  const cnt = map.get(firstKey);
  // Triplet (FIXED)
  const needTriplet = Math.max(0, 3 - cnt);
  if (needTriplet <= wildLeft) {
    const saved = cnt;
    map.set(firstKey, Math.max(0, cnt - 3));
    if (tryFormMelds(n - 1, wildLeft - needTriplet, map)) { console.log('  Triplet path succeeded for', firstKey); return true; }
    map.set(firstKey, saved);
  }
  // Sequence
  const numSuits = ['dots', 'wan', 'tiao'];
  if (numSuits.includes(suit) && val <= 7) {
    const k2 = suit + '-' + (val + 1);
    const k3 = suit + '-' + (val + 2);
    const c2 = map.get(k2) || 0;
    const c3 = map.get(k3) || 0;
    const missing = (c2 > 0 ? 0 : 1) + (c3 > 0 ? 0 : 1);
    if (missing <= wildLeft) {
      const s2 = c2, s3 = c3;
      const saved = cnt;
      map.set(firstKey, 0);
      if (c2 > 0) map.set(k2, c2 - 1);
      if (c3 > 0) map.set(k3, c3 - 1);
      if (tryFormMelds(n - 1, wildLeft - missing, map)) { console.log('  Sequence path succeeded for', firstKey); return true; }
      map.set(firstKey, saved);
      if (s2 > 0) map.set(k2, s2);
      if (s3 > 0) map.set(k3, s3);
    }
  }
  return false;
}

console.log('Testing pair = tiao-2 (remaining 12 tiles, need 4 melds):');
console.log('tryFormMelds(4, 0):', tryFormMelds(4, 0, new Map(countMap)));
