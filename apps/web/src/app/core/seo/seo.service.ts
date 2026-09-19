import { DOCUMENT, Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { BRAND_NAME } from '../config/brand';
import { RUNTIME_CONFIG } from '../config/runtime-config';

export interface SeoData {
  title: string;
  description: string;
  image?: string | null;
  path: string;
  noindex?: boolean;
}

/** Balises title/description, Open Graph, Twitter Card et canonical (rendues au SSR). */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly doc = inject(DOCUMENT);
  private readonly cfg = inject(RUNTIME_CONFIG);
  private readonly preloaded = new Set<string>();

  set(d: SeoData): void {
    const base = this.cfg.publicBaseUrl.replace(/\/$/, '');
    const url = `${base}${d.path}`;
    const img = d.image ? (d.image.startsWith('http') ? d.image : `${base}${d.image}`) : null;
    this.title.setTitle(d.title);
    const tags: Array<[string, string, 'name' | 'property']> = [
      ['description', d.description, 'name'],
      ['robots', d.noindex ? 'noindex, nofollow' : 'index, follow', 'name'],
      ['og:type', 'profile', 'property'],
      ['og:site_name', BRAND_NAME, 'property'],
      ['og:title', d.title, 'property'],
      ['og:description', d.description, 'property'],
      ['og:url', url, 'property'],
      ['og:locale', 'fr_FR', 'property'],
      ['twitter:card', img ? 'summary_large_image' : 'summary', 'name'],
      ['twitter:title', d.title, 'name'],
      ['twitter:description', d.description, 'name'],
    ];
    if (img) {
      tags.push(['og:image', img, 'property'], ['og:image:width', '1200', 'property'], ['og:image:height', '630', 'property'], ['twitter:image', img, 'name']);
    }
    for (const [key, content, attr] of tags) {
      this.meta.updateTag({ [attr]: key, content }, `${attr}="${key}"`);
    }
    let link = this.doc.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.doc.createElement('link');
      link.rel = 'canonical';
      this.doc.head.appendChild(link);
    }
    link.href = url;
  }

  /** Précharge une ressource critique (image LCP, police du nom) — dédupliqué. */
  preload(attrs: Record<string, string>): void {
    const key = attrs['href'] ?? attrs['imagesrcset'];
    if (!key || this.preloaded.has(key)) return;
    this.preloaded.add(key);
    const l = this.doc.createElement('link');
    l.rel = 'preload';
    for (const [k, v] of Object.entries(attrs)) l.setAttribute(k, v);
    this.doc.head.appendChild(l);
  }
}
