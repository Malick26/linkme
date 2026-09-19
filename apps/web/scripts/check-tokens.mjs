// Garde-fou « thème piloté par tokens » (brief §12) : aucune couleur littérale dans les composants.
// Autorisé uniquement dans design-system/tokens/, core/theme/ (mapping ThemeConfig) et les fichiers générés.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = new URL('../src/', import.meta.url).pathname;
const ALLOW = [/^index\.html$/, /^design-system\/tokens\//, /^app\/core\/theme\//, /^app\/core\/fixtures\//, /^app\/core\/api\/schema\.d\.ts$/, /^design-system\/icons\/icon-registry\.ts$/, /\.spec\.ts$/];
const COLOR = /#[0-9a-fA-F]{3,8}\b(?![-\w])|\b(?:rgba?|hsla?)\(\s*\d/g;
const files = [];
(function walk(d) {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(ts|scss|css|html)$/.test(f)) files.push(p);
  }
})(root);

let bad = 0;
for (const f of files) {
  const rel = relative(root, f).replaceAll('\\', '/');
  if (rel === 'styles.scss' || ALLOW.some((r) => r.test(rel))) continue;
  const lines = readFileSync(f, 'utf8').split('\n');
  lines.forEach((line, i) => {
    if (/check-tokens:\s*ignore/.test(line)) return;
    // ignore les ancres d'URL / entités HTML courantes
    const cleaned = line.replace(/&#\d+;/g, '').replace(/href="#[^"]*"/g, '');
    const m = cleaned.match(COLOR);
    if (m) {
      bad++;
      console.error(`✘ ${rel}:${i + 1}  ${m.join(', ')}  →  utiliser un token var(--lm-*) / var(--ed-*)`);
    }
  });
}
if (bad) {
  console.error(`\n${bad} couleur(s) codée(s) en dur trouvée(s).`);
  process.exit(1);
}
console.log(`✔ check:tokens — ${files.length} fichiers, aucune couleur codée en dur hors tokens.`);
