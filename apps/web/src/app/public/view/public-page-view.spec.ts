import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { ThemeConfig } from '../../core/api/types';
import { MALICK_PAGE } from '../../core/fixtures/malick';
import { PublicPageViewComponent } from './public-page-view.component';

type Leaf = { path: string[]; value: unknown };

function leaves(obj: Record<string, unknown>, prefix: string[] = []): Leaf[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' && !Array.isArray(v) ? leaves(v as Record<string, unknown>, [...prefix, k]) : [{ path: [...prefix, k], value: v }],
  );
}

function setPath(o: Record<string, unknown>, path: string[], v: unknown) {
  let cur = o;
  for (const k of path.slice(0, -1)) cur = cur[k] as Record<string, unknown>;
  cur[path[path.length - 1]] = v;
}

const ENUMS: Record<string, unknown[]> = {
  'background.type': ['image', 'gradient', 'solid'],
  'typography.display': ['kaushan-script', 'yellowtail'],
  'typography.hand': ['caveat', 'reenie-beanie'],
  'typography.body': ['inter', 'system'],
  'cards.style': ['glass', 'solid', 'outline'],
  'cards.thumbnailSide': ['left', 'right'],
  'cards.density': ['comfortable', 'compact'],
  'social.position': ['right', 'left', 'below-stats'],
  'social.shape': ['circle', 'rounded'],
};

function mutate(path: string, v: unknown): unknown {
  if (ENUMS[path]) return ENUMS[path].find((x) => x !== v);
  if (typeof v === 'boolean') return !v;
  if (typeof v === 'number') return path.endsWith('nameScale') ? (v === 1 ? 1.2 : 1) : v >= 0.5 && v <= 1 ? Math.round((v - 0.3) * 100) / 100 : v + 3;
  if (typeof v === 'string' && /^#/.test(v)) return v.toUpperCase().startsWith('#12') ? '#345678' : '#123456';
  if (path === 'layout.footerText') return 'Merci !';
  if (path === 'background.imageId') return null;
  return v;
}

/** Contexte nécessaire pour qu'un champ soit visible (ex. couleur unie → type « solid »). */
function contextFor(path: string, t: ThemeConfig): ThemeConfig {
  const c = structuredClone(t);
  if (path === 'background.color') c.background.type = 'solid';
  if (path.startsWith('background.gradient')) c.background.type = 'gradient';
  if (path === 'cards.thumbnailSide') c.cards.showThumbnail = true;
  return c;
}

/** Champs sans effet visuel par conception. */
const NO_VISUAL = new Set(['version', 'preset']);

describe('PublicPageView — chaque champ du ThemeConfig a un effet visible (brief §6.3)', () => {
  function render(theme: ThemeConfig): string {
    const f = TestBed.createComponent(PublicPageViewComponent);
    f.componentRef.setInput('page', { ...MALICK_PAGE, theme });
    f.detectChanges();
    const html = (f.nativeElement as HTMLElement).innerHTML;
    f.destroy();
    return html;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [PublicPageViewComponent], providers: [provideRouter([])] });
  });

  const base = MALICK_PAGE.theme;
  for (const leaf of leaves(base as unknown as Record<string, unknown>)) {
    const path = leaf.path.join('.');
    if (NO_VISUAL.has(path)) continue;
    it(`${path}`, () => {
      const t0 = contextFor(path, base);
      const t1 = structuredClone(t0);
      const current = leaf.path.reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], t0);
      setPath(t1 as unknown as Record<string, unknown>, leaf.path, mutate(path, current));
      expect(render(t1)).not.toEqual(render(t0));
    });
  }

  it('rend les textes de la maquette', () => {
    const f = TestBed.createComponent(PublicPageViewComponent);
    f.componentRef.setInput('page', MALICK_PAGE);
    f.detectChanges();
    const text = (f.nativeElement as HTMLElement).textContent ?? '';
    for (const s of ['Malick Wane', 'Big dreams', 'Real progress.', 'Travel', '245K', '8.4M', '12M', 'Mes voyages', 'Me contacter', "Let's connect", 'My Links']) {
      expect(text).toContain(s);
    }
  });

  it('les cartes sont de vrais liens <a>', () => {
    const f = TestBed.createComponent(PublicPageViewComponent);
    f.componentRef.setInput('page', MALICK_PAGE);
    f.detectChanges();
    const links = (f.nativeElement as HTMLElement).querySelectorAll('nav.cards a');
    expect(links.length).toBe(5);
    expect(links[0].getAttribute('href')).toBe('/malick/voyages');
  });
});
