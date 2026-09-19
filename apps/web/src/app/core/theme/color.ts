/** Utilitaires couleur purs (sans dépendance) — partagés par le mapping de thème et le garde-fou de contraste. */
export interface Rgba { r: number; g: number; b: number; a: number }

export function parseHex(hex: string): Rgba {
  const h = hex.replace('#', '');
  const n = (i: number) => parseInt(h.slice(i, i + 2), 16);
  return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? n(6) / 255 : 1 };
}

export function toHex({ r, g, b }: Rgba): string {
  const c = (v: number) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`.toUpperCase();
}

export function rgba(hex: string, alpha?: number): string {
  const c = parseHex(hex);
  const a = alpha ?? c.a;
  return `rgba(${c.r}, ${c.g}, ${c.b}, ${round(a)})`;
}

export function round(v: number, p = 3): number {
  const f = 10 ** p;
  return Math.round(v * f) / f;
}

/** Composition « over » d'une couleur semi-transparente sur un fond opaque. */
export function over(top: Rgba, bottom: Rgba): Rgba {
  const a = top.a;
  return { r: top.r * a + bottom.r * (1 - a), g: top.g * a + bottom.g * (1 - a), b: top.b * a + bottom.b * (1 - a), a: 1 };
}

/** Luminance relative WCAG 2.x. */
export function luminance({ r, g, b }: Rgba): number {
  const ch = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
}

export function contrastRatio(a: Rgba, b: Rgba): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export const WHITE: Rgba = { r: 255, g: 255, b: 255, a: 1 };
export const BLACK: Rgba = { r: 0, g: 0, b: 0, a: 1 };
