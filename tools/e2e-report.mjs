// CI helper: plain-text summary of the Playwright run (failures with messages) -> e2e-report.txt
import fs from 'node:fs';
const out = [];
try {
  const r = JSON.parse(fs.readFileSync('e2e-results.json', 'utf8'));
  const walk = (suite, path) => {
    for (const s of suite.suites || []) walk(s, [...path, s.title]);
    for (const spec of suite.specs || []) for (const t of spec.tests) {
      const last = t.results[t.results.length - 1] || {};
      const st = t.status === 'expected' ? 'PASS' : t.status === 'skipped' ? 'SKIP' : t.status === 'flaky' ? 'FLAKY' : 'FAIL';
      out.push(`${st} [${t.projectName}] ${[...path, spec.title].filter(Boolean).join(' > ')} (${last.duration ?? 0}ms)`);
      if (st === 'FAIL' || st === 'FLAKY') for (const e of last.errors || []) out.push('   ' + String(e.message || '').replace(/\x1b\[[0-9;]*m/g, '').split('\n').slice(0, 10).join('\n   '));
    }
  };
  walk(r, []);
  out.unshift(`E2E: ${r.stats.expected} passed, ${r.stats.unexpected} failed, ${r.stats.flaky} flaky, ${r.stats.skipped} skipped, ${Math.round(r.stats.duration / 1000)}s`);
} catch (e) { out.push('no e2e-results.json: ' + e.message); }
fs.writeFileSync('e2e-report.txt', out.join('\n') + '\n'); console.log(out.join('\n'));
