#!/usr/bin/env node
/**
 * Assignment 3 – Mutation Testing Runner
 * =======================================
 * This script performs manual mutation testing on three high-risk modules:
 *   1. lib/auth.ts        – extractToken, requireAuth, requireAdmin
 *   2. lib/errors.ts      – handleError, sendSuccess, methodNotAllowed
 *   3. api/cart/index.ts  – Cart handler (POST validation)
 *
 * For each module it:
 *   1. Backs up the original file
 *   2. Applies each mutant (a targeted code change)
 *   3. Runs the full Vitest suite
 *   4. Records Killed (test fails) or Survived (test passes)
 *   5. Restores the original file
 *   6. Prints a final mutation score report
 *
 * Usage:
 *   node tests/mutation/mutation-runner.mjs
 *   (or: npm run mutation from root)
 *
 * Requirements: vitest must be runnable via `npx vitest run`
 */

import { execSync }         from 'child_process';
import { readFileSync, writeFileSync, copyFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath }    from 'url';

const __dirname   = dirname(fileURLToPath(import.meta.url));
const SERVER_ROOT = resolve(__dirname, '../../apps/server');

// ── Colour helpers ───────────────────────────────────────────────────────────
const green  = (s) => `\x1b[32m${s}\x1b[0m`;
const red    = (s) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const bold   = (s) => `\x1b[1m${s}\x1b[0m`;
const cyan   = (s) => `\x1b[36m${s}\x1b[0m`;

// ── Mutant definitions ───────────────────────────────────────────────────────
/**
 * Each mutant = { id, module, description, type, file, search, replace }
 *   search  – exact string to replace (must be unique in the file)
 *   replace – the mutated string
 */
const MUTANTS = [
  // ────────────────────────────────────────────────────────────────────────
  // Module 1: lib/auth.ts
  // ────────────────────────────────────────────────────────────────────────
  {
    id: 'MUT-AUTH-01',
    module: 'lib/auth.ts',
    description: 'Negate Bearer prefix check (startsWith)',
    type: 'Logical Operator',
    file: 'lib/auth.ts',
    search: `if (!auth?.startsWith('Bearer ')) return null;`,
    replace: `if (auth?.startsWith('Bearer ')) return null;`,
  },
  {
    id: 'MUT-AUTH-02',
    module: 'lib/auth.ts',
    description: 'Remove token slice (return full auth header)',
    type: 'Return Value Modification',
    file: 'lib/auth.ts',
    search: `return auth.slice(7);`,
    replace: `return auth;`,
  },
  {
    id: 'MUT-AUTH-03',
    module: 'lib/auth.ts',
    description: 'Return null instead of user from getAuthUser',
    type: 'Return Value Modification',
    file: 'lib/auth.ts',
    search: `  if (error || !data.user) return null;\n  return data.user;`,
    replace: `  if (error || !data.user) return null;\n  return null;`,
  },
  {
    id: 'MUT-AUTH-04',
    module: 'lib/auth.ts',
    description: 'Remove null guard on token (skip early return)',
    type: 'Function Call Removal',
    file: 'lib/auth.ts',
    search: `  const token = extractToken(req);\n  if (!token) return null;`,
    replace: `  const token = extractToken(req);`,
  },
  {
    id: 'MUT-AUTH-05',
    module: 'lib/auth.ts',
    description: 'Change 401 status code to 200 in requireAuth',
    type: 'Constant Alteration',
    file: 'lib/auth.ts',
    search: `res.status(401).json({ data: null, error: 'Unauthorized' });`,
    replace: `res.status(200).json({ data: null, error: 'Unauthorized' });`,
  },
  {
    id: 'MUT-AUTH-06',
    module: 'lib/auth.ts',
    description: 'Change admin role check from "admin" to "user"',
    type: 'Constant Alteration',
    file: 'lib/auth.ts',
    search: `  if (profile?.role !== 'admin') {`,
    replace: `  if (profile?.role !== 'user') {`,
  },

  // ────────────────────────────────────────────────────────────────────────
  // Module 2: lib/errors.ts
  // ────────────────────────────────────────────────────────────────────────
  {
    id: 'MUT-ERR-01',
    module: 'lib/errors.ts',
    description: 'Negate AppError instanceof check in handleError',
    type: 'Logical Operator',
    file: 'lib/errors.ts',
    search: `  if (error instanceof AppError) {`,
    replace: `  if (!(error instanceof AppError)) {`,
  },
  {
    id: 'MUT-ERR-02',
    module: 'lib/errors.ts',
    description: 'Change 500 status to 200 in handleError fallback',
    type: 'Constant Alteration',
    file: 'lib/errors.ts',
    search: `  return res.status(500).json({`,
    replace: `  return res.status(200).json({`,
  },
  {
    id: 'MUT-ERR-03',
    module: 'lib/errors.ts',
    description: 'Change sendSuccess default status from 200 to 500',
    type: 'Constant Alteration',
    file: 'lib/errors.ts',
    search: `export function sendSuccess<T>(res: VercelResponse, data: T, status = 200) {`,
    replace: `export function sendSuccess<T>(res: VercelResponse, data: T, status = 500) {`,
  },
  {
    id: 'MUT-ERR-04',
    module: 'lib/errors.ts',
    description: 'Return error key instead of data key in sendSuccess',
    type: 'Return Value Modification',
    file: 'lib/errors.ts',
    search: `  return res.status(status).json({ data, error: null });`,
    replace: `  return res.status(status).json({ data: null, error: 'mutated' });`,
  },
  {
    id: 'MUT-ERR-05',
    module: 'lib/errors.ts',
    description: 'Change 405 status to 200 in methodNotAllowed',
    type: 'Constant Alteration',
    file: 'lib/errors.ts',
    search: `  return res.status(405).json({ data: null, error: 'Method not allowed' });`,
    replace: `  return res.status(200).json({ data: null, error: 'Method not allowed' });`,
  },

  // ────────────────────────────────────────────────────────────────────────
  // Module 3: api/cart/index.ts
  // ────────────────────────────────────────────────────────────────────────
  {
    id: 'MUT-CART-01',
    module: 'api/cart/index.ts',
    description: 'Remove validation: allow quantity = 0',
    type: 'Logical Operator',
    file: 'api/cart/index.ts',
    search: `        if (!product_id || !quantity || quantity < 1) {`,
    replace: `        if (!product_id) {`,
  },
  {
    id: 'MUT-CART-02',
    module: 'api/cart/index.ts',
    description: 'Return 200 instead of 201 on cart POST',
    type: 'Constant Alteration',
    file: 'api/cart/index.ts',
    search: `        return sendSuccess(res, result, 201);`,
    replace: `        return sendSuccess(res, result, 200);`,
  },
  {
    id: 'MUT-CART-03',
    module: 'api/cart/index.ts',
    description: 'Remove user_id filter on GET /cart (returns all users carts)',
    type: 'Function Call Removal',
    file: 'api/cart/index.ts',
    search: `          .eq('user_id', user.id);`,
    replace: `          ;`,
  },
  {
    id: 'MUT-CART-04',
    module: 'api/cart/index.ts',
    description: 'Negate existing-item check (always insert, never update)',
    type: 'Logical Operator',
    file: 'api/cart/index.ts',
    search: `        if (existing) {`,
    replace: `        if (!existing) {`,
  },
  {
    id: 'MUT-CART-05',
    module: 'api/cart/index.ts',
    description: 'Remove user_id filter on DELETE /cart (deletes all carts)',
    type: 'Function Call Removal',
    file: 'api/cart/index.ts',
    search: `          .delete()\n          .eq('user_id', user.id);`,
    replace: `          .delete()\n          .eq('user_id', '');`,
  },
];

// ── Runner ───────────────────────────────────────────────────────────────────

function runTests() {
  try {
    execSync('npm test', {
      cwd: SERVER_ROOT,
      stdio: 'pipe',
      timeout: 60_000,
    });
    return { killed: false };
  } catch {
    return { killed: true };
  }
}

function applyMutant(filePath, search, replace) {
  const content = readFileSync(filePath, 'utf8');
  if (!content.includes(search)) {
    throw new Error(`Search string not found in ${filePath}:\n  "${search}"`);
  }
  const mutated = content.replace(search, replace);
  writeFileSync(filePath, mutated, 'utf8');
}

function restoreFile(filePath, backup) {
  writeFileSync(filePath, backup, 'utf8');
}

// ── Main ─────────────────────────────────────────────────────────────────────

console.log(bold(cyan('\n╔═══════════════════════════════════════════════╗')));
console.log(bold(cyan('║   Assignment 3 – Mutation Testing Runner      ║')));
console.log(bold(cyan('╚═══════════════════════════════════════════════╝')));
console.log(`\nTotal mutants: ${MUTANTS.length}`);
console.log(`Server root:   ${SERVER_ROOT}\n`);

const results = [];

for (const mutant of MUTANTS) {
  const filePath = resolve(SERVER_ROOT, mutant.file);
  const backup   = readFileSync(filePath, 'utf8');

  process.stdout.write(`  ${mutant.id} [${mutant.module}] ${mutant.description} … `);

  try {
    applyMutant(filePath, mutant.search, mutant.replace);
  } catch (err) {
    restoreFile(filePath, backup);
    console.log(yellow('SKIP (pattern not found)'));
    results.push({ ...mutant, status: 'SKIPPED', error: err.message });
    continue;
  }

  const { killed } = runTests();
  restoreFile(filePath, backup);

  if (killed) {
    console.log(green('✓ KILLED'));
    results.push({ ...mutant, status: 'KILLED' });
  } else {
    console.log(red('✗ SURVIVED'));
    results.push({ ...mutant, status: 'SURVIVED' });
  }
}

// ── Summary ──────────────────────────────────────────────────────────────────

const byModule = {};
for (const r of results) {
  if (!byModule[r.module]) byModule[r.module] = [];
  byModule[r.module].push(r);
}

console.log(bold('\n\n═══════════════════════════════════════════════════════'));
console.log(bold('  MUTATION TESTING RESULTS'));
console.log(bold('═══════════════════════════════════════════════════════'));

let totalCreated = 0, totalKilled = 0;

for (const [mod, mutants] of Object.entries(byModule)) {
  const killed   = mutants.filter(m => m.status === 'KILLED').length;
  const survived = mutants.filter(m => m.status === 'SURVIVED').length;
  const skipped  = mutants.filter(m => m.status === 'SKIPPED').length;
  const created  = mutants.length - skipped;
  const score    = created > 0 ? ((killed / created) * 100).toFixed(1) : 'N/A';

  totalCreated += created;
  totalKilled  += killed;

  console.log(`\n  Module: ${bold(cyan(mod))}`);
  console.log(`    Mutants: ${created}  Killed: ${green(killed)}  Survived: ${survived > 0 ? red(survived) : survived}  Score: ${bold(score + '%')}`);

  mutants.forEach(m => {
    const icon = m.status === 'KILLED' ? green('✓') : m.status === 'SURVIVED' ? red('✗') : yellow('−');
    console.log(`      ${icon} ${m.id}: [${m.type}] ${m.description}`);
    if (m.status === 'SURVIVED') {
      console.log(`         ${red('→ GAP: Test suite did not detect this mutation')}`);
    }
  });
}

const overallScore = totalCreated > 0 ? ((totalKilled / totalCreated) * 100).toFixed(1) : '0';
console.log(bold('\n═══════════════════════════════════════════════════════'));
console.log(`  Overall: ${totalCreated} mutants  |  ${green(totalKilled + ' killed')}  |  ${red((totalCreated - totalKilled) + ' survived')}  |  Score: ${bold(overallScore + '%')}`);
console.log(bold('═══════════════════════════════════════════════════════\n'));

// ── Save JSON report ─────────────────────────────────────────────────────────
import { mkdirSync } from 'fs';
mkdirSync(resolve(__dirname, 'results'), { recursive: true });

const report = {
  timestamp:    new Date().toISOString(),
  totalMutants: totalCreated,
  killed:       totalKilled,
  survived:     totalCreated - totalKilled,
  score:        overallScore,
  byModule:     Object.fromEntries(
    Object.entries(byModule).map(([mod, mutants]) => {
      const killed   = mutants.filter(m => m.status === 'KILLED').length;
      const survived = mutants.filter(m => m.status === 'SURVIVED').length;
      const created  = mutants.length - mutants.filter(m => m.status === 'SKIPPED').length;
      return [mod, { created, killed, survived, score: created > 0 ? ((killed/created)*100).toFixed(1) : 'N/A', mutants }];
    })
  ),
};

writeFileSync(
  resolve(__dirname, 'results/mutation-report.json'),
  JSON.stringify(report, null, 2),
  'utf8'
);

console.log(`Full report saved → tests/mutation/results/mutation-report.json\n`);

if (parseFloat(overallScore) < 70) {
  console.log(red('⚠ Mutation score below 70% — test suite needs improvement\n'));
  process.exit(1);
}
