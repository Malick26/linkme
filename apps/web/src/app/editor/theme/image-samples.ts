import type { Image } from '../../core/api/types';
import { imageUrl } from '../../core/images/image-url';
import type { Rgba } from '../../core/theme/color';
import { luminance } from '../../core/theme/color';
import type { BackdropSamples } from '../../core/theme/contrast';

/**
 * Échantillonne la photo de fond (placeholder data-URI si disponible, sinon miniature 640 px) pour le garde-fou de
 * contraste : pour la zone héros (25–60 % de hauteur) et la zone des cartes (55–100 %), on retient la couleur moyenne
 * et la moyenne des 15 % de pixels les plus clairs (pire cas pour un texte blanc).
 */
export async function sampleBackdrop(img: Image, focalX: number): Promise<BackdropSamples | null> {
  const src = img.placeholder?.startsWith('data:image/') ? img.placeholder : imageUrl(img, 640);
  if (!src) return null;
  const el = new window.Image();
  el.crossOrigin = 'anonymous';
  el.decoding = 'async';
  el.src = src;
  try {
    await el.decode();
  } catch {
    return null;
  }
  const W = 48;
  const H = 48;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  // recadrage « portrait » autour du point focal, comme sur mobile (object-fit: cover)
  const ratio = 9 / 16;
  const sw = Math.min(el.naturalWidth, el.naturalHeight * ratio);
  const sx = Math.max(0, Math.min(el.naturalWidth - sw, el.naturalWidth * focalX - sw / 2));
  ctx.drawImage(el, sx, 0, sw, el.naturalHeight, 0, 0, W, H);
  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, W, H).data;
  } catch {
    return null; // canvas « tainted » (CORS)
  }
  const region = (y0: number, y1: number): Rgba[] => {
    const px: Rgba[] = [];
    for (let y = Math.floor(y0 * H); y < Math.floor(y1 * H); y++) {
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        px.push({ r: data[i], g: data[i + 1], b: data[i + 2], a: 1 });
      }
    }
    const avg = (arr: Rgba[]) => {
      const n = Math.max(1, arr.length);
      return { r: arr.reduce((s, p) => s + p.r, 0) / n, g: arr.reduce((s, p) => s + p.g, 0) / n, b: arr.reduce((s, p) => s + p.b, 0) / n, a: 1 };
    };
    const sorted = [...px].sort((a, b) => luminance(b) - luminance(a));
    return [avg(px), avg(sorted.slice(0, Math.max(1, Math.floor(sorted.length * 0.15))))];
  };
  return { hero: region(0.25, 0.6), cards: region(0.55, 1) };
}
