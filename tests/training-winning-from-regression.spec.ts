interface WinnerInfoLite {
  name: string
  isSelfDraw: boolean
  winningTile?: string
  winningFrom?: string
}

interface WinningGameLite {
  winnerName: string
  isSelfDraw: boolean
  winningTile?: string
  winningFrom?: string
}

let passed = 0
let failed = 0

function test(name: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`PASS ${name}`)
    passed++
  } else {
    console.log(`FAIL ${name}${detail ? ` - ${detail}` : ''}`)
    failed++
  }
}

function toWinningGame(winner: WinnerInfoLite): WinningGameLite {
  return {
    winnerName: winner.name,
    isSelfDraw: winner.isSelfDraw,
    winningTile: winner.winningTile,
    winningFrom: winner.winningFrom
  }
}

console.log('\n=== Regression: training winningFrom propagation ===\n')

const discardWin = toWinningGame({
  name: 'AI-AK',
  isSelfDraw: false,
  winningTile: '四条',
  winningFrom: 'AI-小胖'
})

test('discard win keeps winning tile', discardWin.winningTile === '四条', `actual=${discardWin.winningTile}`)
test('discard win keeps winningFrom player name', discardWin.winningFrom === 'AI-小胖', `actual=${discardWin.winningFrom}`)

const selfDrawWin = toWinningGame({
  name: 'AI-AK',
  isSelfDraw: true
})

test('self draw does not require winningFrom', selfDrawWin.winningFrom === undefined, `actual=${selfDrawWin.winningFrom}`)

console.log(`\nResult: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
