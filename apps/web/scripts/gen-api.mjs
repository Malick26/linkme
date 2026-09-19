// Régénère le client TS depuis le contrat OpenAPI + copie les presets (source : services/api). Voir ADR 0003, D13.
import { execSync } from 'node:child_process';
import { copyFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const api = resolve(here, '../../../services/api/src/main/resources');
const spec = resolve(api, 'openapi/openapi.yaml');
if (!existsSync(spec)) {
  console.error('Contrat introuvable :', spec);
  process.exit(1);
}
execSync(`npx -y openapi-typescript@7 "${spec}" -o src/app/core/api/schema.d.ts`, { stdio: 'inherit', cwd: resolve(here, '..') });
copyFileSync(resolve(api, 'theme/presets.json'), resolve(here, '../src/app/core/theme/presets.generated.json'));
console.log('✔ schema.d.ts + presets.generated.json à jour');
