// Training runner - outputs to training-output/
import { runGame, loadCharacter, saveCharacter } from './train-ai-ak';
import * as fs from 'fs';
import * as path from 'path';
import { prepareTrainingOutputDir } from './training-reporter';

const ROUNDS = parseInt(process.argv[2] || '1');
const GAMES = parseInt(process.argv[3] || '100');
const OUT_DIR = path.resolve(process.cwd(), 'training-output');

prepareTrainingOutputDir(OUT_DIR);

console.error(`[TRAIN] Starting ${ROUNDS}x${GAMES} training`);

// Load policies
const policyXiaoPang = loadCharacter('AI-小胖');
const policyAShui = loadCharacter('AI-阿水');
const policyLaoZhao = loadCharacter('AI-老赵');
const otherPolicies = [policyXiaoPang, policyAShui, policyLaoZhao];

// Metrics
let totalWins = 0;
let totalGames = 0;
const startTime = Date.now();

// Round results
const roundResults: { round: number; wins: number; games: number }[] = [];

for (let round = 1; round <= ROUNDS; round++) {
  console.error(`[TRAIN] Round ${round}/${ROUNDS}`);
  let roundWins = 0;
  
  for (let game = 0; game < GAMES; game++) {
    const policyAK = loadCharacter('AI-AK');
    const result = runGame(policyAK, otherPolicies, game);
    totalGames++;
    
    if (result && result.winner !== undefined && result.winner === 0) {
      roundWins++;
      totalWins++;
    }
    
    if ((game + 1) % 50 === 0) {
      console.error(`[TRAIN]   Game ${game + 1}/${GAMES} done`);
    }
  }
  
  roundResults.push({ round, wins: roundWins, games: GAMES });
  console.error(`[TRAIN] Round ${round} complete: ${roundWins}/${GAMES} wins (${(roundWins/GAMES*100).toFixed(1)}%)`);
}

const elapsed = (Date.now() - startTime) / 1000;

// Summary
const summary = `
[TRAIN] Training Complete!
[TRAIN] ===================
[TRAIN] Total: ${totalWins}/${totalGames} wins (${(totalWins/totalGames*100).toFixed(1)}%)
[TRAIN] Time: ${elapsed.toFixed(1)}s
[TRAIN] Rate: ${(totalGames/elapsed).toFixed(1)} games/sec
`;
console.error(summary);

// Write to file
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const reportFile = path.join(OUT_DIR, `run-training-${timestamp}.txt`);
const report = [
  `# Training Report - ${timestamp}`,
  `# Config: ${ROUNDS}x${GAMES}`,
  ``,
  ...roundResults.map(r => `# Round ${r.round}: ${r.wins}/${r.games} wins (${(r.wins/r.games*100).toFixed(1)}%)`),
  ``,
  `# Summary`,
  `Total: ${totalWins}/${totalGames} wins (${(totalWins/totalGames*100).toFixed(1)}%)`,
  `Time: ${elapsed.toFixed(1)}s`,
  `Rate: ${(totalGames/elapsed).toFixed(1)} games/sec`,
].join('\n');

fs.writeFileSync(reportFile, report, 'utf-8');
console.error(`[TRAIN] Report saved: ${reportFile}`);
