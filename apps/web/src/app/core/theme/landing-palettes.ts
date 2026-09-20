/**
 * Palettes de la démo de la page d'accueil (aperçu « change de thème en un clic »).
 * Elles reprennent les presets livrés (`presets.json`) — c'est le seul endroit du site
 * public, avec `design-system/tokens/`, où des couleurs littérales sont autorisées.
 */
export interface LandingPalette {
  readonly id: string;
  /** Nom propre du preset (non traduit, comme dans `presets.json`). */
  readonly label: string;
  readonly from: string;
  readonly to: string;
  readonly accent: string;
  readonly text: string;
  readonly muted: string;
  readonly card: string;
  readonly border: string;
}

export const LANDING_PALETTES: readonly LandingPalette[] = [
  {
    id: 'sunset',
    label: 'Sunset',
    from: '#F6A96B',
    to: '#1A1216',
    accent: '#FFB067',
    text: '#FFFFFF',
    muted: 'rgba(255, 255, 255, 0.72)',
    card: 'rgba(10, 12, 18, 0.62)',
    border: 'rgba(255, 255, 255, 0.14)',
  },
  {
    id: 'midnight-blue',
    label: 'Midnight Blue',
    from: '#3C6EFF',
    to: '#080B1A',
    accent: '#6C9BFF',
    text: '#FFFFFF',
    muted: 'rgba(255, 255, 255, 0.7)',
    card: 'rgba(8, 12, 30, 0.66)',
    border: 'rgba(255, 255, 255, 0.16)',
  },
  {
    id: 'emerald-night',
    label: 'Emerald Night',
    from: '#37C98B',
    to: '#04140E',
    accent: '#52DDA0',
    text: '#FFFFFF',
    muted: 'rgba(255, 255, 255, 0.7)',
    card: 'rgba(4, 22, 16, 0.64)',
    border: 'rgba(255, 255, 255, 0.14)',
  },
  {
    id: 'clean-light',
    label: 'Clean Light',
    from: '#F3EEE7',
    to: '#FFFFFF',
    accent: '#E2622B',
    text: '#16120F',
    muted: 'rgba(22, 18, 15, 0.64)',
    card: 'rgba(255, 255, 255, 0.78)',
    border: 'rgba(22, 18, 15, 0.12)',
  },
];
