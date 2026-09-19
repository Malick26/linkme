import type { ThemeConfig } from '../api/types';

type Typo = ThemeConfig['typography'];

/** Liste blanche des polices (miroir de l'enum OpenAPI) → famille CSS et fichier auto-hébergé. */
export const FONTS = {
  display: {
    'kaushan-script': { family: 'Kaushan Script', file: 'kaushan-script-latin-400-normal.woff2', label: 'Kaushan Script' },
    yellowtail: { family: 'Yellowtail', file: 'yellowtail-latin-400-normal.woff2', label: 'Yellowtail' },
    'marck-script': { family: 'Marck Script', file: 'marck-script-latin-400-normal.woff2', label: 'Marck Script' },
    'caveat-brush': { family: 'Caveat Brush', file: 'caveat-brush-latin-400-normal.woff2', label: 'Caveat Brush' },
  },
  hand: {
    caveat: { family: 'Caveat', file: 'caveat-latin-500-normal.woff2', label: 'Caveat' },
    'reenie-beanie': { family: 'Reenie Beanie', file: 'reenie-beanie-latin-400-normal.woff2', label: 'Reenie Beanie' },
  },
  body: {
    inter: { family: 'Inter', file: 'inter-latin-wght-normal.woff2', label: 'Inter' },
    system: { family: '', file: '', label: 'Système' },
  },
} as const;

const FALLBACK = {
  display: "'Brush Script MT', cursive",
  hand: "'Segoe Print', cursive",
  body: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
};

export function fontStack<K extends keyof typeof FONTS>(kind: K, id: Typo[K & keyof Typo]): string {
  const def = (FONTS[kind] as Record<string, { family: string }>)[id as string];
  const fam = def?.family ? `'${def.family}', ` : '';
  return `${fam}${FALLBACK[kind]}`;
}

/** Fichier de la police du nom à précharger (LCP textuel). */
export function displayFontFile(id: Typo['display']): string {
  return `/fonts/${FONTS.display[id].file}`;
}

/** Paires curatées proposées dans l'éditeur (nom / manuscrit / corps). */
export const FONT_PAIRS: ReadonlyArray<{ id: string; label: string; typography: Omit<Typo, 'nameScale'> }> = [
  { id: 'signature', label: 'Signature (maquette)', typography: { display: 'kaushan-script', hand: 'caveat', body: 'inter' } },
  { id: 'retro', label: 'Rétro', typography: { display: 'yellowtail', hand: 'caveat', body: 'inter' } },
  { id: 'journal', label: 'Carnet', typography: { display: 'marck-script', hand: 'reenie-beanie', body: 'inter' } },
  { id: 'street', label: 'Street', typography: { display: 'caveat-brush', hand: 'caveat', body: 'inter' } },
  { id: 'natif', label: 'Natif', typography: { display: 'kaushan-script', hand: 'caveat', body: 'system' } },
];
