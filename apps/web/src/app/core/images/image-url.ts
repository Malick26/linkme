import type { Image } from '../api/types';

/** Résout une URL pour une largeur donnée (Cloudinary `{w}`, seed à largeurs fixes, local sans variantes). */
export function imageUrl(img: Image | null | undefined, width: number): string | null {
  if (!img) return null;
  if (!img.urlTemplate.includes('{w}')) return img.urlTemplate;
  const w = pickWidth(img, width);
  return img.urlTemplate.replace('{w}', String(w));
}

function pickWidth(img: Image, width: number): number {
  const ws = img.widths?.length ? [...img.widths].sort((a, b) => a - b) : null;
  if (!ws) return Math.min(Math.max(Math.round(width), 64), 2400);
  return ws.find((w) => w >= width) ?? ws[ws.length - 1];
}

/** `srcset` responsive. */
export function imageSrcset(img: Image | null | undefined, widths: number[]): string | null {
  if (!img || !img.urlTemplate.includes('{w}')) return null;
  const ws = img.widths?.length ? img.widths : widths;
  return [...new Set(ws.map((w) => pickWidth(img, w)))]
    .sort((a, b) => a - b)
    .map((w) => `${img.urlTemplate.replace('{w}', String(w))} ${w}w`)
    .join(', ');
}
