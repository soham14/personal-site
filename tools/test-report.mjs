// CI helper: writes a plain-text report of failing tests and uncovered lines (per file) to ci-report.txt.
import fs from 'node:fs';
const out = [];
try {
  const r = JSON.parse(fs.readFileSync('test-results.json', 'utf8'));
  out.push(`TESTS: ${r.numPassedTests} passed, ${r.numFailedTests} failed, ${r.numTotalTests} total`);
  for (const f of r.testResults) for (const t of f.assertionResults) if (t.status === 'failed')
    out.push(`FAIL ${f.name.replace(process.cwd() + '/', '')} :: ${t.fullName}\n  ${(t.failureMessages || []).join('\n').split('\n').slice(0, 12).join('\n  ')}`);
  for (const f of r.testResults) if (f.status === 'failed' && !f.assertionResults.length) out.push(`FILE FAILED ${f.name}: ${f.message}`);
} catch (e) { out.push('no test-results.json: ' + e.message); }
try {
  const cov = JSON.parse(fs.readFileSync('coverage/coverage-final.json', 'utf8'));
  out.push('\nCOVERAGE (uncovered lines/branches/functions per file):');
  for (const [file, d] of Object.entries(cov)) {
    const rel = file.replace(process.cwd() + '/', '');
    const lines = new Set();
    for (const [id, n] of Object.entries(d.s)) if (!n) { const l = d.statementMap[id].start.line; lines.add(l); }
    const fns = Object.entries(d.f).filter(([, n]) => !n).map(([id]) => `${d.fnMap[id].name}@${d.fnMap[id].loc.start.line}`);
    const br = [];
    for (const [id, arr] of Object.entries(d.b)) arr.forEach((n, i) => { if (!n) br.push(`${d.branchMap[id].loc.start.line}#${i}`); });
    const total = Object.keys(d.s).length, cov1 = Object.values(d.s).filter(Boolean).length;
    out.push(`${rel}: statements ${cov1}/${total}` + (lines.size ? `\n  uncovered lines: ${[...lines].sort((a, b) => a - b).join(',')}` : '') +
      (fns.length ? `\n  uncovered functions: ${fns.join(', ')}` : '') + (br.length ? `\n  uncovered branches (line#arm): ${br.join(',')}` : ''));
  }
} catch (e) { out.push('no coverage: ' + e.message); }
try { const t = fs.readFileSync('typecheck.txt', 'utf8').trim(); out.unshift('TYPECHECK:\n' + (t.includes('error TS') ? t.split('\n').filter((l) => l.includes('error TS')).slice(0, 80).join('\n') : 'ok')); } catch {}
fs.writeFileSync('ci-report.txt', out.join('\n') + '\n');
console.log(out.join('\n'));
