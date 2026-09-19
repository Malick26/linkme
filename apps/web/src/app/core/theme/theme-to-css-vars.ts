import type { ThemeConfig } from '../api/types';
import { parseHex, rgba, round } from './color';
import { fontStack } from './fonts';

/** Arrêts du dégradé d'overlay (position %, opacité relative) — docs/design/tokens.md §3. */
export const OVERLAY_STOPS: ReadonlyArray<readonly [number, number]> = [
  [0, 0.1],
  [25, 0.22],
  [45, 0.55],
  [70, 0.86],
  [85, 0.96],
  [100, 1],
];
/** Voile radial additionnel derrière la colonne héros (lisibilité sur photo claire). */
export const HERO_SCRIM_ALPHA = 0.35;
/** Opacité relative effective sous le texte héros (dégradé ≈ .42 à 38 % + voile .35 → 1-(1-.42)(1-.35)). */
export const HERO_OVERLAY_ALPHA = 0.62;
/** Opacité relative de l'overlay sous les cartes. */
export const CARDS_OVERLAY_ALPHA = 0.9;

export interface ThemeRender {
  /** Custom properties à poser sur le conteneur `.lm-page` */
  vars: Record<string, string>;
  /** Classes de variante (layout, style de cartes…) */
  classes: string[];
}

export function overlayGradient(color: string, strength: number): string {
  const stops = OVERLAY_STOPS.map(([pos, a]) => `${rgba(color, round(a * strength))} ${pos}%`);
  return `linear-gradient(180deg, ${stops.join(', ')})`;
}

/**
 * Convertit un ThemeConfig en variables CSS. Fonction **pure** : même entrée → même sortie
 * (utilisée au SSR, dans l'aperçu live et dans les tests de snapshot par preset).
 */
export function themeToCssVars(t: ThemeConfig): ThemeRender {
  const c = t.colors;
  const style = t.cards.style;
  const cardAlpha = style === 'outline' ? 0 : style === 'solid' ? Math.max(c.cardBgOpacity, 0.94) : c.cardBgOpacity;
  const borderAlpha = style === 'outline' ? Math.max(c.cardBorderOpacity, 0.45) : c.cardBorderOpacity;
  const blur = style === 'glass' ? t.cards.blur : 0;
  const muted = parseHex(c.textMuted);

  const vars: Record<string, string> = {
    '--lm-text': rgba(c.text, 1),
    '--lm-text-muted': rgba(c.textMuted, muted.a),
    '--lm-accent': rgba(c.accent, 1),
    '--lm-overlay': rgba(c.overlay, 1),
    '--lm-overlay-strength': String(c.overlayStrength),
    '--lm-overlay-gradient': overlayGradient(c.overlay, c.overlayStrength),
    '--lm-hero-scrim': `radial-gradient(ellipse 85% 55% at 22% 48%, ${rgba(c.overlay, round(HERO_SCRIM_ALPHA * c.overlayStrength))}, ${rgba(c.overlay, 0)} 70%)`,
    '--lm-card-bg': rgba(c.cardBg, cardAlpha),
    '--lm-card-bg-fallback': rgba(c.cardBg, Math.min(1, cardAlpha + 0.25)),
    '--lm-card-border': rgba(c.cardBorder, borderAlpha),
    '--lm-card-blur': `${blur}px`,
    '--lm-card-radius': `${t.cards.radius}px`,
    '--lm-card-height': t.cards.density === 'compact' ? '76px' : '92px',
    '--lm-stat-glow': rgba(c.statGlow, 0.18),
    '--lm-surface': rgba(c.cardBg, Math.max(c.cardBgOpacity, 0.7)),
    '--lm-surface-strong': rgba(c.cardBg, 0.94),
    '--lm-hairline': rgba(c.text, 0.22),
    '--lm-control-bg': rgba(c.cardBg, Math.min(1, c.cardBgOpacity + 0.08)),
    '--lm-control-border': rgba(c.text, 0.35),
    '--lm-shadow-text': rgba(c.overlay, 0.55),
    '--lm-font-display': fontStack('display', t.typography.display),
    '--lm-font-hand': fontStack('hand', t.typography.hand),
    '--lm-font-body': fontStack('body', t.typography.body),
    '--lm-name-scale': String(t.typography.nameScale),
    '--lm-bg-focal': `${round(t.background.focal.x * 100, 1)}% ${round(t.background.focal.y * 100, 1)}%`,
    '--lm-bg-blur': `${t.background.blur}px`,
    '--lm-social-radius': t.social.shape === 'circle' ? '50%' : t.social.shape === 'rounded' ? '14px' : '4px',
  };

  if (t.background.type === 'solid') {
    vars['--lm-bg'] = rgba(t.background.color ?? c.overlay, 1);
  } else if (t.background.type === 'gradient') {
    const from = t.background.gradientFrom ?? c.overlay;
    const to = t.background.gradientTo ?? c.accent;
    vars['--lm-bg'] = `linear-gradient(${t.background.gradientAngle ?? 180}deg, ${rgba(from, 1)}, ${rgba(to, 1)})`;
  } else {
    vars['--lm-bg'] = rgba(c.overlay, 1);
  }

  const classes = [
    `lm-cards-${style}`,
    `lm-thumb-${t.cards.showThumbnail ? t.cards.thumbnailSide : 'none'}`,
    `lm-density-${t.cards.density}`,
    `lm-social-${t.social.position}`,
    `lm-bg-${t.background.type}`,
  ];
  if (!t.motion.enabled) classes.push('lm-no-motion');
  if (!t.social.showCounts) classes.push('lm-social-no-counts');
  return { vars, classes };
}

/** Sérialise les variables pour un attribut `style` (SSR). */
export function varsToStyle(vars: Record<string, string>): string {
  return Object.entries(vars)
    .map(([k, v]) => `${k}: ${v}`)
    .join('; ');
}
