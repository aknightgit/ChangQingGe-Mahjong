import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { canWin, HandType } from '../server/utils/handValidator'
import { MeldType, TileSuit, type Meld, type Tile } from '../server/types/game'

type TileSuitKey = 'dots' | 'wan' | 'tiao' | 'feng' | 'jian'
type MeldTypeKey = 'sequence' | 'triplet'
type TileKey = `${TileSuitKey}-${number}`

interface DocMeld {
  type: MeldTypeKey
  tiles: TileKey[]
  isConcealed: boolean
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

const ARCHIVE_NAMES = [
  'testHuCase-wild0.json',
  'testHuCase-wild1.json',
  'testHuCase-wild2.json',
  'testHuCase-wild3.json',
]

const REQUIRED_PRIMARY_TYPES: HandType[] = [
  HandType.STANDARD,
  HandType.ALL_TRIPLETS,
  HandType.FULL_FLUSH,
  HandType.HALF_FLUSH,
  HandType.QING_PENG,
  HandType.HUN_PENG,
  HandType.ALL_WIND,
]

let passed = 0
let failed = 0

function test(name: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  PASS ${name}`)
    passed++
  } else {
    console.log(`  FAIL ${name}${detail ? ` - ${detail}` : ''}`)
    failed++
  }
}

function parseTileKey(tileKey: TileKey, uniqueId: string): Tile {
  const [suit, valueText] = tileKey.split('-')
  return {
    id: uniqueId,
    suit: suit as TileSuit,
    value: Number(valueText),
    isFlower: false,
  }
}

function toMeld(meld: DocMeld, caseId: string, meldIndex: number): Meld {
  return {
    type: meld.type === 'sequence' ? MeldType.SEQUENCE : MeldType.TRIPLET,
    tiles: meld.tiles.map((tileKey, tileIndex) => parseTileKey(tileKey, `${caseId}-m${meldIndex}-t${tileIndex}`)),
    isConcealed: meld.isConcealed,
    sourcePosition: 1,
  }
}

console.log('\n=== Regression: terminal Hu archives against production canWin ===\n')

for (const archiveName of ARCHIVE_NAMES) {
  const archivePath = resolve(process.cwd(), 'tests', 'hu-cases', archiveName)
  const archive = JSON.parse(readFileSync(archivePath, 'utf8')) as Archive

  test(`${archiveName} total=1000`, archive.summary.total === 1000, `actual=${archive.summary.total}`)
  test(`${archiveName} wildCount`, [0, 1, 2, 3].includes(archive.wildCount), `actual=${archive.wildCount}`)

  for (const handType of REQUIRED_PRIMARY_TYPES) {
    test(
      `${archiveName} covers ${handType}`,
      (archive.summary.primaryTypes[handType] || 0) > 0,
      `count=${archive.summary.primaryTypes[handType] || 0}`
    )
  }

  for (const caseItem of archive.cases) {
    const concealedTiles = caseItem.concealed.map((tileKey, index) => parseTileKey(tileKey, `${caseItem.id}-c${index}`))
    const exposedMelds = caseItem.exposedMelds.map((meld, index) => toMeld(meld, caseItem.id, index))
    const result = canWin(concealedTiles, exposedMelds, caseItem.wildTileId)
    const actualWildCount = caseItem.wildTileId
      ? caseItem.concealed.filter((tileKey) => tileKey === caseItem.wildTileId).length
      : 0

    test(
      `${caseItem.id} canWin`,
      result.canWin === true,
      `expected=true actual=${result.canWin}`
    )
    test(
      `${caseItem.id} primaryType`,
      result.types[0] === caseItem.expectedPrimaryType,
      `expected=${caseItem.expectedPrimaryType} actual=${result.types[0] ?? 'none'}`
    )
    test(
      `${caseItem.id} wildCount`,
      actualWildCount === caseItem.wildCount && caseItem.wildCount === archive.wildCount,
      `expected=${caseItem.wildCount}/${archive.wildCount} actual=${actualWildCount}`
    )
  }
}

console.log('\n==================================================')
console.log(`Result: ${passed} passed, ${failed} failed`)
if (failed > 0) {
  process.exit(1)
}
console.log('terminal Hu archive regression passed')
