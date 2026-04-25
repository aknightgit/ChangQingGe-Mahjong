import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { HandType, canWin } from '../server/utils/handValidator'
import { MeldType, TileSuit, type Meld, type Tile } from '../server/types/game'

type TileSuitKey = 'dots' | 'wan' | 'tiao' | 'feng' | 'jian'
type MeldTypeKey = 'sequence' | 'triplet'
type TileKey = `${TileSuitKey}-${number}`

interface DocMeld {
  type: MeldTypeKey
  tiles: TileKey[]
  isConcealed: boolean
}

interface GeneratedBase {
  concealed: TileKey[]
  exposedMelds: DocMeld[]
  notes: string[]
}

interface HuCaseRecord {
  id: string
  group: string
  label: string
  description: string
  wildTileId: TileKey | null
  wildCount: number
  concealed: TileKey[]
  exposedMelds: DocMeld[]
  expectedCanWin: true
  expectedPrimaryType: HandType
  expectedTypes: HandType[]
  notes: string[]
}

interface Archive {
  generatedAt: string
  seed: number
  wildCount: number
  summary: {
    total: number
    archetypes: Record<string, number>
    primaryTypes: Record<string, number>
  }
  cases: HuCaseRecord[]
}

interface GroupProfile {
  key: string
  label: string
  description: string
  expectedPrimaryType: HandType
  targetCount: number
  build: (rng: Lcg) => GeneratedBase
}

const ROOT = resolve(process.cwd())
const OUTPUT_DIR = resolve(ROOT, 'tests', 'hu-cases')
const RNG_SEED = 20260425
const WILD_COUNTS = [0, 1, 2, 3] as const

const NUMERIC_SUITS: TileSuitKey[] = ['dots', 'wan', 'tiao']
const HONOR_SUITS: TileSuitKey[] = ['feng', 'jian']
const ALL_TILE_KEYS: TileKey[] = [
  ...NUMERIC_SUITS.flatMap((suit) => Array.from({ length: 9 }, (_, index) => `${suit}-${index + 1}` as TileKey)),
  ...Array.from({ length: 4 }, (_, index) => `feng-${index + 1}` as TileKey),
  ...Array.from({ length: 3 }, (_, index) => `jian-${index + 1}` as TileKey),
]

class Lcg {
  private state: number

  constructor(seed: number) {
    this.state = seed >>> 0
  }

  next() {
    this.state = (1664525 * this.state + 1013904223) >>> 0
    return this.state / 0x100000000
  }

  int(min: number, max: number) {
    return Math.floor(this.next() * (max - min + 1)) + min
  }

  pick<T>(items: T[]): T {
    return items[this.int(0, items.length - 1)]
  }

  shuffle<T>(items: T[]): T[] {
    const arr = [...items]
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.int(0, i)
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
  }
}

function tileSuit(tileKey: TileKey): TileSuitKey {
  return tileKey.split('-')[0] as TileSuitKey
}

function tileValue(tileKey: TileKey): number {
  return Number(tileKey.split('-')[1])
}

function makePool(): Map<TileKey, number> {
  return new Map(ALL_TILE_KEYS.map((tileKey) => [tileKey, 4]))
}

function consume(pool: Map<TileKey, number>, tiles: TileKey[]) {
  if (!tiles.every((tileKey) => (pool.get(tileKey) || 0) > 0)) return false
  for (const tileKey of tiles) {
    pool.set(tileKey, (pool.get(tileKey) || 0) - 1)
  }
  return true
}

function toTriplet(tileKey: TileKey): TileKey[] {
  return [tileKey, tileKey, tileKey]
}

function toPair(tileKey: TileKey): TileKey[] {
  return [tileKey, tileKey]
}

function toSequence(suit: TileSuitKey, start: number): TileKey[] {
  return [`${suit}-${start}`, `${suit}-${start + 1}`, `${suit}-${start + 2}`] as TileKey[]
}

function randomTriplet(pool: Map<TileKey, number>, rng: Lcg, allowed: TileKey[]) {
  const candidates = allowed.filter((tileKey) => (pool.get(tileKey) || 0) >= 3)
  if (candidates.length === 0) return null
  const tileKey = rng.pick(candidates)
  const tiles = toTriplet(tileKey)
  return consume(pool, tiles) ? tiles : null
}

function randomPair(pool: Map<TileKey, number>, rng: Lcg, allowed: TileKey[]) {
  const candidates = allowed.filter((tileKey) => (pool.get(tileKey) || 0) >= 2)
  if (candidates.length === 0) return null
  const tileKey = rng.pick(candidates)
  const tiles = toPair(tileKey)
  return consume(pool, tiles) ? tiles : null
}

function randomSequence(pool: Map<TileKey, number>, rng: Lcg, suits: TileSuitKey[]) {
  const candidates: TileKey[][] = []
  for (const suit of suits) {
    for (let start = 1; start <= 7; start++) {
      const sequence = toSequence(suit, start)
      if (sequence.every((tileKey) => (pool.get(tileKey) || 0) >= 1)) {
        candidates.push(sequence)
      }
    }
  }
  if (candidates.length === 0) return null
  const sequence = rng.pick(candidates)
  return consume(pool, sequence) ? sequence : null
}

function flattenMelds(melds: TileKey[][]) {
  return melds.flatMap((tiles) => tiles)
}

function countsWithinLimit(tileKeys: TileKey[]) {
  const counts = new Map<TileKey, number>()
  for (const tileKey of tileKeys) {
    counts.set(tileKey, (counts.get(tileKey) || 0) + 1)
    if ((counts.get(tileKey) || 0) > 4) return false
  }
  return true
}

function engineTile(tileKey: TileKey, id: string): Tile {
  return {
    id,
    suit: tileSuit(tileKey) as TileSuit,
    value: tileValue(tileKey),
    isFlower: false,
  }
}

function engineMeld(meld: DocMeld, caseId: string, meldIndex: number): Meld {
  return {
    type: meld.type === 'sequence' ? MeldType.SEQUENCE : MeldType.TRIPLET,
    tiles: meld.tiles.map((tileKey, tileIndex) => engineTile(tileKey, `${caseId}-m${meldIndex}-t${tileIndex}`)),
    isConcealed: meld.isConcealed,
    sourcePosition: 1,
  }
}

function signatureOfCase(wildTileId: TileKey | null, concealed: TileKey[], exposedMelds: DocMeld[]) {
  const concealedSig = [...concealed].sort().join(',')
  const meldSig = exposedMelds
    .map((meld) => `${meld.type}:${[...meld.tiles].sort().join(',')}:${meld.isConcealed ? 'c' : 'o'}`)
    .sort()
    .join('|')
  return `${wildTileId || 'none'}::${concealedSig}::${meldSig}`
}

function availableWildCandidates(base: GeneratedBase): TileKey[] {
  const occupied = new Set([...base.concealed, ...base.exposedMelds.flatMap((meld) => meld.tiles)])
  return ALL_TILE_KEYS.filter((tileKey) => !occupied.has(tileKey))
}

function pickDifferentNumericSuit(rng: Lcg, suit: TileSuitKey) {
  return rng.pick(NUMERIC_SUITS.filter((item) => item !== suit))
}

function pickTwoDifferentNumericSuits(rng: Lcg, excluded: TileSuitKey) {
  const suits = rng.shuffle(NUMERIC_SUITS.filter((item) => item !== excluded))
  return [suits[0], suits[1]] as [TileSuitKey, TileSuitKey]
}

function buildStandardOneExposed(rng: Lcg): GeneratedBase {
  for (let attempt = 0; attempt < 200; attempt++) {
    const mainSuit = rng.pick(NUMERIC_SUITS)
    const exposedSuit = pickDifferentNumericSuit(rng, mainSuit)
    const pool = makePool()
    const concealedMelds: TileKey[][] = []
    const exposedSequence = randomSequence(pool, rng, [exposedSuit])
    if (!exposedSequence) continue
    const sequenceA = randomSequence(pool, rng, [mainSuit])
    const sequenceB = randomSequence(pool, rng, [mainSuit])
    const triplet = randomTriplet(pool, rng, Array.from({ length: 9 }, (_, index) => `${mainSuit}-${index + 1}` as TileKey))
    const pair = randomPair(pool, rng, Array.from({ length: 9 }, (_, index) => `${mainSuit}-${index + 1}` as TileKey))
    if (!sequenceA || !sequenceB || !triplet || !pair) continue
    concealedMelds.push(sequenceA, sequenceB, triplet)
    const concealed = rng.shuffle([...flattenMelds(concealedMelds), ...pair])
    if (!countsWithinLimit([...concealed, ...exposedSequence])) continue
    return {
      concealed,
      exposedMelds: [{ type: 'sequence', tiles: exposedSequence, isConcealed: false }],
      notes: ['single-suit concealed core + off-suit exposed sequence', `main=${mainSuit}`, `exposed=${exposedSuit}`],
    }
  }
  throw new Error('Failed to build standard_one_exposed')
}

function buildStandardTwoExposed(rng: Lcg): GeneratedBase {
  for (let attempt = 0; attempt < 200; attempt++) {
    const mainSuit = rng.pick(NUMERIC_SUITS)
    const [exposedA, exposedB] = pickTwoDifferentNumericSuits(rng, mainSuit)
    const pool = makePool()
    const exposedSequenceA = randomSequence(pool, rng, [exposedA])
    const exposedSequenceB = randomSequence(pool, rng, [exposedB])
    const concealedSequence = randomSequence(pool, rng, [mainSuit])
    const concealedTriplet = randomTriplet(pool, rng, Array.from({ length: 9 }, (_, index) => `${mainSuit}-${index + 1}` as TileKey))
    const concealedPair = randomPair(pool, rng, Array.from({ length: 9 }, (_, index) => `${mainSuit}-${index + 1}` as TileKey))
    if (!exposedSequenceA || !exposedSequenceB || !concealedSequence || !concealedTriplet || !concealedPair) continue
    const concealed = rng.shuffle([...concealedSequence, ...concealedTriplet, ...concealedPair])
    if (!countsWithinLimit([...concealed, ...exposedSequenceA, ...exposedSequenceB])) continue
    return {
      concealed,
      exposedMelds: [
        { type: 'sequence', tiles: exposedSequenceA, isConcealed: false },
        { type: 'sequence', tiles: exposedSequenceB, isConcealed: false },
      ],
      notes: ['single-suit concealed core + two off-suit exposed sequences', `main=${mainSuit}`, `exposed=${exposedA}/${exposedB}`],
    }
  }
  throw new Error('Failed to build standard_two_exposed')
}

function buildAllTripletsConcealed(rng: Lcg): GeneratedBase {
  for (let attempt = 0; attempt < 200; attempt++) {
    const pool = makePool()
    const allowed = rng.shuffle([
      ...Array.from({ length: 9 }, (_, index) => `dots-${index + 1}` as TileKey),
      ...Array.from({ length: 9 }, (_, index) => `wan-${index + 1}` as TileKey),
      ...Array.from({ length: 9 }, (_, index) => `tiao-${index + 1}` as TileKey),
      ...Array.from({ length: 4 }, (_, index) => `feng-${index + 1}` as TileKey),
      ...Array.from({ length: 3 }, (_, index) => `jian-${index + 1}` as TileKey),
    ])
    const triplets: TileKey[][] = []
    for (let i = 0; i < 4; i++) {
      const triplet = randomTriplet(pool, rng, allowed)
      if (!triplet) break
      triplets.push(triplet)
    }
    const pair = randomPair(pool, rng, allowed)
    if (triplets.length !== 4 || !pair) continue
    const allTiles = [...flattenMelds(triplets), ...pair]
    const suits = new Set(allTiles.map(tileSuit))
    if (suits.size < 3) continue
    return {
      concealed: rng.shuffle(allTiles),
      exposedMelds: [],
      notes: ['all concealed all-triplets'],
    }
  }
  throw new Error('Failed to build all_triplets_concealed')
}

function buildAllTripletsExposed(rng: Lcg): GeneratedBase {
  for (let attempt = 0; attempt < 200; attempt++) {
    const pool = makePool()
    const allowed = rng.shuffle([
      ...Array.from({ length: 9 }, (_, index) => `dots-${index + 1}` as TileKey),
      ...Array.from({ length: 9 }, (_, index) => `wan-${index + 1}` as TileKey),
      ...Array.from({ length: 9 }, (_, index) => `tiao-${index + 1}` as TileKey),
      ...Array.from({ length: 4 }, (_, index) => `feng-${index + 1}` as TileKey),
      ...Array.from({ length: 3 }, (_, index) => `jian-${index + 1}` as TileKey),
    ])
    const exposedA = randomTriplet(pool, rng, allowed)
    const exposedB = randomTriplet(pool, rng, allowed)
    const concealedA = randomTriplet(pool, rng, allowed)
    const concealedB = randomTriplet(pool, rng, allowed)
    const pair = randomPair(pool, rng, allowed)
    if (!exposedA || !exposedB || !concealedA || !concealedB || !pair) continue
    const allTiles = [...exposedA, ...exposedB, ...concealedA, ...concealedB, ...pair]
    const suits = new Set(allTiles.map(tileSuit))
    if (suits.size < 3) continue
    return {
      concealed: rng.shuffle([...concealedA, ...concealedB, ...pair]),
      exposedMelds: [
        { type: 'triplet', tiles: exposedA, isConcealed: false },
        { type: 'triplet', tiles: exposedB, isConcealed: false },
      ],
      notes: ['mixed all-triplets with exposed pungs'],
    }
  }
  throw new Error('Failed to build all_triplets_exposed')
}

function buildFullFlush(rng: Lcg): GeneratedBase {
  for (let attempt = 0; attempt < 200; attempt++) {
    const suit = rng.pick(NUMERIC_SUITS)
    const pool = makePool()
    const sequenceA = randomSequence(pool, rng, [suit])
    const sequenceB = randomSequence(pool, rng, [suit])
    const triplet = randomTriplet(pool, rng, Array.from({ length: 9 }, (_, index) => `${suit}-${index + 1}` as TileKey))
    const sequenceC = randomSequence(pool, rng, [suit])
    const pair = randomPair(pool, rng, Array.from({ length: 9 }, (_, index) => `${suit}-${index + 1}` as TileKey))
    if (!sequenceA || !sequenceB || !sequenceC || !triplet || !pair) continue
    const concealed = rng.shuffle([...sequenceA, ...sequenceB, ...sequenceC, ...triplet, ...pair])
    if (!countsWithinLimit(concealed)) continue
    return {
      concealed,
      exposedMelds: [],
      notes: ['single-suit sequence-heavy full flush', `suit=${suit}`],
    }
  }
  throw new Error('Failed to build full_flush')
}

function buildHalfFlush(rng: Lcg): GeneratedBase {
  for (let attempt = 0; attempt < 200; attempt++) {
    const suit = rng.pick(NUMERIC_SUITS)
    const pool = makePool()
    const sequenceA = randomSequence(pool, rng, [suit])
    const sequenceB = randomSequence(pool, rng, [suit])
    const honorTriplet = randomTriplet(pool, rng, [
      ...Array.from({ length: 4 }, (_, index) => `feng-${index + 1}` as TileKey),
      ...Array.from({ length: 3 }, (_, index) => `jian-${index + 1}` as TileKey),
    ])
    const numericTriplet = randomTriplet(pool, rng, Array.from({ length: 9 }, (_, index) => `${suit}-${index + 1}` as TileKey))
    const pair = randomPair(pool, rng, Array.from({ length: 9 }, (_, index) => `${suit}-${index + 1}` as TileKey))
    if (!sequenceA || !sequenceB || !honorTriplet || !numericTriplet || !pair) continue
    const concealed = rng.shuffle([...sequenceA, ...sequenceB, ...honorTriplet, ...numericTriplet, ...pair])
    if (!countsWithinLimit(concealed)) continue
    return {
      concealed,
      exposedMelds: [],
      notes: ['single numeric suit plus honors', `suit=${suit}`],
    }
  }
  throw new Error('Failed to build half_flush')
}

function buildQingPeng(rng: Lcg): GeneratedBase {
  for (let attempt = 0; attempt < 200; attempt++) {
    const suit = rng.pick(NUMERIC_SUITS)
    const pool = makePool()
    const allowed = Array.from({ length: 9 }, (_, index) => `${suit}-${index + 1}` as TileKey)
    const triplets: TileKey[][] = []
    for (let i = 0; i < 4; i++) {
      const triplet = randomTriplet(pool, rng, allowed)
      if (!triplet) break
      triplets.push(triplet)
    }
    const pair = randomPair(pool, rng, allowed)
    if (triplets.length !== 4 || !pair) continue
    return {
      concealed: rng.shuffle([...flattenMelds(triplets), ...pair]),
      exposedMelds: [],
      notes: ['single-suit all-triplets', `suit=${suit}`],
    }
  }
  throw new Error('Failed to build qing_peng')
}

function buildHunPeng(rng: Lcg): GeneratedBase {
  for (let attempt = 0; attempt < 200; attempt++) {
    const suit = rng.pick(NUMERIC_SUITS)
    const pool = makePool()
    const numericAllowed = Array.from({ length: 9 }, (_, index) => `${suit}-${index + 1}` as TileKey)
    const honorAllowed = [
      ...Array.from({ length: 4 }, (_, index) => `feng-${index + 1}` as TileKey),
      ...Array.from({ length: 3 }, (_, index) => `jian-${index + 1}` as TileKey),
    ]
    const tripletA = randomTriplet(pool, rng, numericAllowed)
    const tripletB = randomTriplet(pool, rng, numericAllowed)
    const tripletC = randomTriplet(pool, rng, honorAllowed)
    const tripletD = randomTriplet(pool, rng, honorAllowed)
    const pair = randomPair(pool, rng, numericAllowed)
    if (!tripletA || !tripletB || !tripletC || !tripletD || !pair) continue
    const concealed = rng.shuffle([...tripletA, ...tripletB, ...tripletC, ...tripletD, ...pair])
    if (!countsWithinLimit(concealed)) continue
    return {
      concealed,
      exposedMelds: [],
      notes: ['single numeric suit plus honors all-triplets', `suit=${suit}`],
    }
  }
  throw new Error('Failed to build hun_peng')
}

function buildAllWind(rng: Lcg): GeneratedBase {
  for (let attempt = 0; attempt < 200; attempt++) {
    const pool = makePool()
    const allowed = [
      ...Array.from({ length: 4 }, (_, index) => `feng-${index + 1}` as TileKey),
      ...Array.from({ length: 3 }, (_, index) => `jian-${index + 1}` as TileKey),
    ]
    const exposedCount = rng.int(0, 2)
    const exposedTriplets: TileKey[][] = []
    const concealedTriplets: TileKey[][] = []

    for (let i = 0; i < exposedCount; i++) {
      const triplet = randomTriplet(pool, rng, allowed)
      if (!triplet) break
      exposedTriplets.push(triplet)
    }

    for (let i = exposedTriplets.length; i < 4; i++) {
      const triplet = randomTriplet(pool, rng, allowed)
      if (!triplet) break
      concealedTriplets.push(triplet)
    }

    const pair = randomPair(pool, rng, allowed)
    if (exposedTriplets.length + concealedTriplets.length !== 4 || !pair) continue
    return {
      concealed: rng.shuffle([...flattenMelds(concealedTriplets), ...pair]),
      exposedMelds: exposedTriplets.map((tiles) => ({ type: 'triplet' as const, tiles, isConcealed: false })),
      notes: ['all honor tiles', `exposedTriplets=${exposedTriplets.length}`],
    }
  }
  throw new Error('Failed to build all_wind')
}

const GROUPS: GroupProfile[] = [
  {
    key: 'standard',
    label: '普通胡',
    description: 'single-suit concealed core with off-suit exposed sequences',
    expectedPrimaryType: HandType.STANDARD,
    targetCount: 142,
    build: (rng) => (rng.next() < 0.5 ? buildStandardOneExposed(rng) : buildStandardTwoExposed(rng)),
  },
  {
    key: 'all_triplets',
    label: '碰碰胡',
    description: 'mixed all-triplets with concealed or exposed pungs',
    expectedPrimaryType: HandType.ALL_TRIPLETS,
    targetCount: 143,
    build: (rng) => (rng.next() < 0.5 ? buildAllTripletsConcealed(rng) : buildAllTripletsExposed(rng)),
  },
  {
    key: 'full_flush',
    label: '清一色',
    description: 'single-suit sequence-heavy full flush',
    expectedPrimaryType: HandType.FULL_FLUSH,
    targetCount: 143,
    build: buildFullFlush,
  },
  {
    key: 'half_flush',
    label: '混一色',
    description: 'single numeric suit plus honors with sequences',
    expectedPrimaryType: HandType.HALF_FLUSH,
    targetCount: 143,
    build: buildHalfFlush,
  },
  {
    key: 'qing_peng',
    label: '清碰',
    description: 'single-suit all-triplets',
    expectedPrimaryType: HandType.QING_PENG,
    targetCount: 143,
    build: buildQingPeng,
  },
  {
    key: 'hun_peng',
    label: '混碰',
    description: 'single numeric suit plus honors all-triplets',
    expectedPrimaryType: HandType.HUN_PENG,
    targetCount: 143,
    build: buildHunPeng,
  },
  {
    key: 'all_wind',
    label: '风一色',
    description: 'all honor tiles',
    expectedPrimaryType: HandType.ALL_WIND,
    targetCount: 143,
    build: buildAllWind,
  },
]

function withWilds(base: GeneratedBase, group: GroupProfile, wildCount: number, rng: Lcg, caseId: string): HuCaseRecord | null {
  const concealed = [...base.concealed]
  let wildTileId: TileKey | null = null

  if (wildCount > 0) {
    if (concealed.length < wildCount) return null
    const wildCandidates = availableWildCandidates(base)
    if (wildCandidates.length === 0) return null
    wildTileId = rng.pick(wildCandidates)
    const positions = rng.shuffle(Array.from({ length: concealed.length }, (_, index) => index)).slice(0, wildCount)
    for (const index of positions) {
      concealed[index] = wildTileId
    }
  }

  const concealedTiles = concealed.map((tileKey, index) => engineTile(tileKey, `${caseId}-c${index}`))
  const exposedMelds = base.exposedMelds.map((meld, index) => engineMeld(meld, caseId, index))
  const result = canWin(concealedTiles, exposedMelds, wildTileId)
  if (!result.canWin) return null
  if (result.types[0] !== group.expectedPrimaryType) return null

  const actualWildCount = wildTileId ? concealed.filter((tileKey) => tileKey === wildTileId).length : 0
  if (actualWildCount !== wildCount) return null

  return {
    id: caseId,
    group: group.key,
    label: group.label,
    description: group.description,
    wildTileId,
    wildCount,
    concealed,
    exposedMelds: base.exposedMelds,
    expectedCanWin: true,
    expectedPrimaryType: group.expectedPrimaryType,
    expectedTypes: result.types,
    notes: [...base.notes, `validated=${result.types.join('/')}`],
  }
}

function buildArchiveForWildCount(wildCount: number, rng: Lcg): Archive {
  const cases: HuCaseRecord[] = []
  const signatures = new Set<string>()
  let caseSeq = 1

  for (const group of GROUPS) {
    while (cases.filter((item) => item.group === group.key).length < group.targetCount) {
      let created: HuCaseRecord | null = null
      for (let attempt = 0; attempt < 500; attempt++) {
        const base = group.build(rng)
        const candidate = withWilds(base, group, wildCount, rng, `W${wildCount}-${String(caseSeq).padStart(4, '0')}`)
        if (!candidate) continue
        const signature = signatureOfCase(candidate.wildTileId, candidate.concealed, candidate.exposedMelds)
        if (signatures.has(signature)) continue
        signatures.add(signature)
        created = candidate
        break
      }
      if (!created) {
        throw new Error(`Failed to create case for group=${group.key} wildCount=${wildCount}`)
      }
      cases.push(created)
      caseSeq++
    }
  }

  const archetypes: Record<string, number> = {}
  const primaryTypes: Record<string, number> = {}
  for (const caseItem of cases) {
    archetypes[caseItem.group] = (archetypes[caseItem.group] || 0) + 1
    primaryTypes[caseItem.expectedPrimaryType] = (primaryTypes[caseItem.expectedPrimaryType] || 0) + 1
  }

  return {
    generatedAt: new Date().toISOString(),
    seed: RNG_SEED,
    wildCount,
    summary: {
      total: cases.length,
      archetypes,
      primaryTypes,
    },
    cases,
  }
}

function renderArchiveMarkdown(archive: Archive) {
  const lines: string[] = []
  lines.push(`# testHuCase wild=${archive.wildCount}`)
  lines.push('')
  lines.push(`- generatedAt: ${archive.generatedAt}`)
  lines.push(`- seed: ${archive.seed}`)
  lines.push(`- total: ${archive.summary.total}`)
  lines.push(`- wildCount: ${archive.wildCount}`)
  lines.push('')
  lines.push('## Archetype Summary')
  lines.push('')
  for (const group of GROUPS) {
    lines.push(`- ${group.key}: ${archive.summary.archetypes[group.key] || 0} (${group.label})`)
  }
  lines.push('')
  lines.push('## Primary Type Summary')
  lines.push('')
  for (const [type, count] of Object.entries(archive.summary.primaryTypes)) {
    lines.push(`- ${type}: ${count}`)
  }
  lines.push('')
  lines.push('## Cases')
  lines.push('')
  for (const caseItem of archive.cases) {
    lines.push(`### ${caseItem.id} ${caseItem.label}`)
    lines.push('')
    lines.push(`- group: ${caseItem.group}`)
    lines.push(`- description: ${caseItem.description}`)
    lines.push(`- wildTileId: ${caseItem.wildTileId ?? 'none'}`)
    lines.push(`- wildCount: ${caseItem.wildCount}`)
    lines.push(`- expectedPrimaryType: ${caseItem.expectedPrimaryType}`)
    lines.push(`- expectedTypes: ${caseItem.expectedTypes.join(', ')}`)
    lines.push(`- concealed: ${caseItem.concealed.join(' ')}`)
    if (caseItem.exposedMelds.length > 0) {
      for (const meld of caseItem.exposedMelds) {
        lines.push(`- exposed: ${meld.type}[${meld.tiles.join(' ')}]`)
      }
    } else {
      lines.push('- exposed: none')
    }
    lines.push(`- notes: ${caseItem.notes.join(' | ')}`)
    lines.push('')
  }
  return lines.join('\n')
}

function writeArchive(archive: Archive) {
  const baseName = `testHuCase-wild${archive.wildCount}`
  const jsonPath = resolve(OUTPUT_DIR, `${baseName}.json`)
  const mdPath = resolve(OUTPUT_DIR, `${baseName}.md`)
  writeFileSync(jsonPath, `${JSON.stringify(archive, null, 2)}\n`, 'utf8')
  writeFileSync(mdPath, `${renderArchiveMarkdown(archive)}\n`, 'utf8')
}

function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true })
  const rng = new Lcg(RNG_SEED)
  const requestedWildCount = process.argv[2] ? Number(process.argv[2]) : null
  const targets = requestedWildCount === null
    ? [...WILD_COUNTS]
    : WILD_COUNTS.filter((wildCount) => wildCount === requestedWildCount)

  if (targets.length === 0) {
    throw new Error(`Unsupported wildCount argument: ${process.argv[2] ?? 'none'}`)
  }

  for (const wildCount of targets) {
    const archive = buildArchiveForWildCount(wildCount, rng)
    writeArchive(archive)
    console.log(`[generate-test-hu-cases] wild=${wildCount} total=${archive.summary.total}`)
  }
}

main()
