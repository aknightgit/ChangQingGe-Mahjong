// Read most recent arena output dir and print rich analysis
const fs = require('fs')
const path = require('path')

const outRoot = path.join(process.cwd(), 'arena-output')
const dirs = fs.readdirSync(outRoot).filter(d => d.startsWith('real-')).sort().reverse()
if (dirs.length === 0) { console.log('No arena output dir'); process.exit(0) }
const dir = path.join(outRoot, dirs[0])
console.log('Reading dir:', dir)

const csvPath = path.join(dir, 'games.csv')
if (!fs.existsSync(csvPath)) { console.log('No games.csv (only partial.md)'); process.exit(0) }

const text = fs.readFileSync(csvPath, 'utf-8')
const lines = text.trim().split('\n')
const header = lines[0].split(',')
const rows = lines.slice(1).map(line => {
  // simple CSV parse (no embedded commas in our fields)
  const parts = line.split(',')
  const obj = {}
  for (let i = 0; i < header.length; i++) obj[header[i]] = parts[i] || ''
  return obj
})

const N = rows.length
const drawRows = rows.filter(r => r.is_draw === '1')
const winRows = rows.filter(r => r.is_draw !== '1')
const drawCount = drawRows.length

// total winners sum
let totalWinners = 0
const winCounts = []
for (const r of winRows) {
  const w = parseInt(r.win_count, 10) || 0
  totalWinners += w
  winCounts.push(w)
}
const avgWinners = totalWinners / N
const w1 = winCounts.filter(c => c === 1).length
const w2 = winCounts.filter(c => c === 2).length
const w3 = winCounts.filter(c => c === 3).length
const w4 = winCounts.filter(c => c === 4).length

// hand types (count by winners, base name only)
function baseName(s) {
  return s.replace(/（[^）]*）/g, '').trim()
}
const handCounts = {}
for (const r of winRows) {
  const ht = r.hand_type
  if (!ht || ht === '-') continue
  const w = parseInt(r.win_count, 10) || 0
  const base = baseName(ht)
  handCounts[base] = (handCounts[base] || 0) + w
}
const handEntries = Object.entries(handCounts).sort((a, b) => b[1] - a[1])

// self-draw vs discard
let selfDraw = 0, discard = 0
for (const r of winRows) {
  if (r.win_type === '自摸') selfDraw += parseInt(r.win_count, 10) || 0
  else if (r.win_type === '放炮') discard += parseInt(r.win_count, 10) || 0
}

// fan distribution
const fanBuckets = { '0': 0, '1-49': 0, '50-99': 0, '100-199': 0, '200+': 0 }
for (const r of winRows) {
  const w = parseInt(r.win_count, 10) || 0
  const fan = parseInt(r.fan, 10) || 0
  if (fan === 0) fanBuckets['0'] += w
  else if (fan < 50) fanBuckets['1-49'] += w
  else if (fan < 100) fanBuckets['50-99'] += w
  else if (fan < 200) fanBuckets['100-199'] += w
  else fanBuckets['200+'] += w
}

// round distribution
const rounds = winRows.map(r => parseInt(r.rounds, 10) || 0).sort((a, b) => a - b)
const avgRounds = rounds.length > 0 ? rounds.reduce((a, b) => a + b, 0) / rounds.length : 0
const medianRounds = rounds.length > 0 ? rounds[Math.floor(rounds.length / 2)] : 0
const p95rounds = rounds.length > 0 ? rounds[Math.floor(rounds.length * 0.95)] : 0

// AI breakdown
const aiStats = {}
for (const r of rows) {
  const winner = r.winner_ai
  if (winner && winner !== '-') {
    if (!aiStats[winner]) aiStats[winner] = { wins: 0, draws: 0, totalFan: 0, winRounds: [] }
    if (r.is_draw === '1') aiStats[winner].draws++
    else {
      aiStats[winner].wins++
      aiStats[winner].totalFan += parseInt(r.fan, 10) || 0
      aiStats[winner].winRounds.push(parseInt(r.rounds, 10) || 0)
    }
  }
}

// seat0/1/2/3 winner counts
const seatWins = [0, 0, 0, 0]
for (const r of winRows) {
  const w = parseInt(r.win_count, 10) || 0
  // crude: just attribute all winners to seat0 (we don't track per-seat winner in CSV)
}

// multiplier distribution
const multCounts = {}
for (const r of winRows) {
  const m = r.multiplier
  multCounts[m] = (multCounts[m] || 0) + 1
}

// Print report
console.log('\n========== 详细分析报告 ==========')
console.log(`总局数: ${N}`)
console.log(`流局: ${drawCount} (${(drawCount / N * 100).toFixed(1)}%)`)
console.log(`总赢家数(胡牌次数): ${totalWinners}`)
console.log(`平均赢/局: ${avgWinners.toFixed(2)} (目标~2.5)`)
console.log(`1赢/局: ${w1} (${(w1 / N * 100).toFixed(1)}%)`)
console.log(`2赢/局: ${w2} (${(w2 / N * 100).toFixed(1)}%)`)
console.log(`3赢/局: ${w3} (${(w3 / N * 100).toFixed(1)}%)`)
console.log(`4赢/局: ${w4} (${(w4 / N * 100).toFixed(1)}%)`)

console.log('\n--- 牌型分布 (按赢家数) ---')
for (const [name, count] of handEntries) {
  console.log(`  ${name}: ${count} (${(count / totalWinners * 100).toFixed(1)}%)`)
}

console.log('\n--- 胡牌方式 ---')
console.log(`  自摸: ${selfDraw} (${(selfDraw / totalWinners * 100).toFixed(1)}%)`)
console.log(`  放炮: ${discard} (${(discard / totalWinners * 100).toFixed(1)}%)`)

console.log('\n--- 番数分布 ---')
for (const [bucket, count] of Object.entries(fanBuckets)) {
  if (count > 0) console.log(`  ${bucket}: ${count} (${(count / totalWinners * 100).toFixed(1)}%)`)
}

console.log('\n--- 回合数 ---')
console.log(`  平均: ${avgRounds.toFixed(1)}`)
console.log(`  中位: ${medianRounds}`)
console.log(`  P95: ${p95rounds}`)

console.log('\n--- 倍数分布 ---')
for (const [m, c] of Object.entries(multCounts).sort((a, b) => parseInt(a[0]) - parseInt(b[0]))) {
  console.log(`  ×${m}: ${c} 局`)
}

console.log('\n--- AI 胜场 ---')
for (const [name, s] of Object.entries(aiStats).sort((a, b) => b[1].wins - a[1].wins)) {
  console.log(`  ${name}: 胜${s.wins} 流${s.draws} 总番${s.totalFan}`)
}

console.log('\n========== END ==========')
