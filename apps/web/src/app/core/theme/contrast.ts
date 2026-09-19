import type { ThemeConfig } from '../api/types';
import { BLACK, WHITE, Rgba, contrastRatio, over, parseHex, round, toHex } from './color';
import { CARDS_OVERLAY_ALPHA, HERO_OVERLAY_ALPHA } from './theme-to-css-vars';

export type ContrastArea = 'hero' | 'cards' | 'cardsMuted';

export interface ContrastIssue {
  area: ContrastArea;
  ratio: number;
  required: number;
}

export interface ContrastReport {
  ok: boolean;
  issues: ContrastIssue[];
  /** Pire ratio par zone */
  ratios: Record<ContrastArea, number>;
}

/**
 * Couleurs de fond possibles sous le texte (échantillons de la photo, ex. calculés dans l'éditeur à partir du
 * placeholder). Par défaut : pire cas — un fond photo peut être très clair ou très sombre.
 */
export interface BackdropSamples {
  hero: Rgba[];
  cards: Rgba[];
}

export function defaultSamples(t: ThemeConfig): BackdropSamples {
  if (t.background.type === 'solid') {
    const c = parseHex(t.background.color ?? t.colors.overlay);
    return { hero: [c], cards: [c] };
  }
  if (t.background.type === 'gradient') {
    const a = parseHex(t.background.gradientFrom ?? t.colors.overlay);
    const b = parseHex(t.background.gradientTo ?? t.colors.accent);
    return { hero: [a, b], cards: [a, b] };
  }
  // photo inconnue : clair et sombre (le blanc pur est trop pessimiste pour une photo réelle → gris très clair)
  const light: Rgba = { r: 225, g: 225, b: 225, a: 1 };
  return { hero: [light, BLACK], cards: [light, BLACK] };
}

function overlayAt(t: ThemeConfig, rel: number): Rgba {
  const o = parseHex(t.colors.overlay);
  return { ...o, a: Math.min(1, rel * t.colors.overlayStrength) };
}

function cardSurface(t: ThemeConfig, under: Rgba): Rgba {
  const style = t.cards.style;
  const a = style === 'outline' ? 0 : style === 'solid' ? Math.max(t.colors.cardBgOpacity, 0.94) : t.colors.cardBgOpacity;
  return over({ ...parseHex(t.colors.cardBg), a }, under);
}

/** Rapport de contraste WCAG 2.2 AA (4.5:1 texte normal, 3:1 grand texte). */
export function checkContrast(t: ThemeConfig, samples: BackdropSamples = defaultSamples(t)): ContrastReport {
  const text = parseHex(t.colors.text);
  const mutedRaw = parseHex(t.colors.textMuted);
  const heroBgs = samples.hero.map((s) => over(overlayAt(t, HERO_OVERLAY_ALPHA), s));
  const cardBgs = samples.cards.map((s) => cardSurface(t, over(overlayAt(t, CARDS_OVERLAY_ALPHA), s)));

  const worst = (fg: Rgba, bgs: Rgba[]) => Math.min(...bgs.map((bg) => contrastRatio(fg.a < 1 ? over(fg, bg) : fg, bg)));
  const ratios: Record<ContrastArea, number> = {
    hero: round(worst(text, heroBgs), 2),
    cards: round(worst(text, cardBgs), 2),
    cardsMuted: round(worst(mutedRaw, cardBgs), 2),
  };
  const required: Record<ContrastArea, number> = { hero: 4.5, cards: 4.5, cardsMuted: 4.5 };
  const issues = (Object.keys(ratios) as ContrastArea[])
    .filter((k) => ratios[k] < required[k])
    .map((k) => ({ area: k, ratio: ratios[k], required: required[k] }));
  return { ok: issues.length === 0, issues, ratios };
}

/**
 * Correction suggérée « en un clic » : renforce d'abord l'overlay et l'opacité des cartes (garde les couleurs
 * choisies), puis, si nécessaire, bascule le texte sur blanc/noir selon le fond et ajuste le texte secondaire.
 */
export function suggestContrastFix(t: ThemeConfig, samples?: BackdropSamples): ThemeConfig {
  const clone: ThemeConfig = structuredClone(t);
  const steps: Array<(c: ThemeConfig) => void> = [];
  for (let s = clone.colors.overlayStrength; s <= 1.0001; s += 0.05) {
    const v = round(Math.min(1, s), 2);
    steps.push((c) => (c.colors.overlayStrength = v));
  }
  for (let o = clone.colors.cardBgOpacity; o <= 0.9001; o += 0.05) {
    const v = round(Math.min(0.9, o), 2);
    steps.push((c) => (c.colors.cardBgOpacity = v));
  }
  for (const step of steps) {
    step(clone);
    if (checkContrast(clone, samples ?? defaultSamples(clone)).ok) return clone;
  }
  // bascule du texte : blanc sur fond sombre, encre sur fond clair
  const overlayLum = parseHex(clone.colors.overlay);
  const dark = contrastRatio(WHITE, overlayLum) >= contrastRatio(BLACK, overlayLum);
  clone.colors.text = dark ? '#FFFFFF' : '#111318';
  clone.colors.textMuted = dark ? '#FFFFFFB3' : '#111318CC';
  if (clone.cards.style === 'outline') clone.cards.style = 'glass';
  for (let o = clone.colors.cardBgOpacity; o <= 1.0001; o += 0.05) {
    clone.colors.cardBgOpacity = round(Math.min(1, o), 2);
    if (checkContrast(clone, samples ?? defaultSamples(clone)).ok) return clone;
  }
  return clone;
}

export { toHex };
