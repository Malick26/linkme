/**
 * Marque de la plateforme — « LinkMe » est un placeholder (brief §1).
 * Modifier ici suffit : aucun composant ne contient le nom en dur.
 */
export const BRAND_NAME = 'LinkMe';
/** Logo : rendu en police manuscrite + swash SVG (`lm-brand-logo`). Remplaçable par une URL d'image. */
export const BRAND_LOGO: { kind: 'script'; text: string } | { kind: 'image'; src: string; alt: string } = {
  kind: 'script',
  text: 'LinkMe',
};
/**
 * Page d'exemple montrée depuis l'accueil (« Voir une page en exemple »).
 * Chaîne vide → le bouton disparaît. À vider sur une installation sans seed de démonstration.
 */
export const DEMO_HANDLE = 'malick';
export const PUBLIC_BASE_URL_FALLBACK = 'https://linkme.sn';
export const REPORT_EMAIL = 'signalement@linkme.sn';
