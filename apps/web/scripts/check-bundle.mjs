// Vérifie le poids JS initial (gzip) de la page publique — brief §10 : ≤ ~150 Ko.
import { readFileSync, readdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

const limitKb = Number(process.argv[2] ?? 150);
const dir = new URL('../dist/web/browser/', import.meta.url).pathname;
const html = readFileSync(join(dir, 'index.csr.html'), 'utf8');
const initial = [...html.matchAll(/(?:src|href)="([^"]+\.js)"/g)].map((m) => m[1]);
const files = new Set(initial);
// + les chunks importés statiquement par main (modulepreload)
for (const f of [...files]) {
  const src = readFileSync(join(dir, f), 'utf8');
  for (const m of src.matchAll(/from"\.\/(chunk-[\w-]+\.js)"/g)) files.add(m[1]);
}
let total = 0;
for (const f of files) total += gzipSync(readFileSync(join(dir, f))).length;
const kb = total / 1024;
console.log(`JS initial : ${[...files].join(', ')} → ${kb.toFixed(1)} Ko gzip (limite ${limitKb})`);
if (kb > limitKb) process.exit(1);
