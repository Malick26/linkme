import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { IconComponent } from '../../../design-system';
import type { ThemeConfig } from '../../core/api/types';
import { toProblem } from '../../core/http/problem';
import type { I18nKey } from '../../core/i18n/fr';
import { I18n, TPipe } from '../../core/i18n/i18n.service';
import { imageUrl } from '../../core/images/image-url';
import { BackdropSamples, checkContrast, suggestContrastFix } from '../../core/theme/contrast';
import { FONT_PAIRS, FONTS, fontStack } from '../../core/theme/fonts';
import { THEME_PRESETS } from '../../core/theme/presets';
import { ImageUploadComponent } from '../shared/image-upload.component';
import { PreviewFrameComponent } from '../shared/preview-frame.component';
import { EditorStore } from '../state/editor.store';
import { ColorFieldComponent } from './color-field.component';
import { sampleBackdrop } from './image-samples';

type C = ThemeConfig['colors'];

/**
 * Éditeur de thème (brief §6) : presets, couleurs, fond (point focal), typographie, cartes, réseaux, sections,
 * animations ; aperçu live (même composant que la page publique), brouillon auto-enregistré, annuler/rétablir,
 * garde-fou de contraste WCAG avec correction en un clic, publication.
 */
@Component({
  selector: 'app-theme-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TPipe, IconComponent, PreviewFrameComponent, ColorFieldComponent, ImageUploadComponent],
  templateUrl: './theme-editor.component.html',
  styleUrls: ['../shared/split-layout.scss', './theme-editor.component.scss'],
  host: { '(document:keydown)': 'shortcut($event)' },
})
export class ThemeEditorComponent {
  protected readonly store = inject(EditorStore);
  private readonly i18n = inject(I18n);
  protected readonly t = this.store.theme;
  protected readonly tab = signal<'edit' | 'preview'>('edit');
  protected readonly presets = THEME_PRESETS;
  protected readonly fontPairs = FONT_PAIRS;
  protected readonly displayFonts = Object.entries(FONTS.display).map(([id, f]) => ({ id, label: f.label }));
  protected readonly publishing = signal(false);
  protected readonly error = signal('');
  protected readonly samples = signal<BackdropSamples | null>(null);

  protected readonly bgImage = computed(() => {
    const id = this.t().background.imageId ?? this.store.profile()?.backgroundImageId;
    return id ? (this.store.images()[id] ?? null) : null;
  });
  protected readonly bgUrl = computed(() => imageUrl(this.bgImage(), 640));
  protected readonly contrast = computed(() => checkContrast(this.t(), this.samples() ?? undefined));
  protected readonly worst = computed(() => {
    const issues = this.contrast().issues;
    return issues.length ? issues.reduce((a, b) => (a.ratio < b.ratio ? a : b)) : null;
  });
  protected readonly currentPair = computed(() => {
    const ty = this.t().typography;
    return FONT_PAIRS.find((p) => p.typography.display === ty.display && p.typography.hand === ty.hand && p.typography.body === ty.body)?.id ?? '';
  });

  constructor() {
    // ré-échantillonne la photo quand elle change (garde-fou de contraste réaliste)
    effect(() => {
      const img = this.bgImage();
      const fx = this.t().background.focal.x;
      if (!img || this.t().background.type !== 'image') return this.samples.set(null);
      void sampleBackdrop(img, fx).then((s) => this.samples.set(s));
    });
  }

  protected up(mutate: (t: ThemeConfig) => void): void {
    this.store.updateTheme(mutate);
  }

  protected color(k: keyof C, v: string | number): void {
    this.up((t) => ((t.colors as Record<string, unknown>)[k] = v));
  }

  protected num(v: string | number): number {
    return Number(v);
  }

  protected readonly bgTypes = ['image', 'gradient', 'solid'] as const;
  protected readonly cardStyles = ['glass', 'solid', 'outline'] as const;
  protected readonly shapes = ['circle', 'rounded', 'square'] as const;
  protected readonly focalText = computed(() => `${Math.round(this.t().background.focal.x * 100)} %, ${Math.round(this.t().background.focal.y * 100)} %`);

  protected key(prefix: string, v: string): I18nKey {
    return `${prefix}${v}` as I18nKey;
  }

  protected fontFamily(id: string): string {
    return fontStack('display', id as ThemeConfig['typography']['display']);
  }

  // Fabriques de mutations (lisibles dans le gabarit, typées)
  protected fnBgType = (v: string) => (t: ThemeConfig) => (t.background.type = v as ThemeConfig['background']['type']);
  protected fnBlur = (v: number) => (t: ThemeConfig) => (t.background.blur = v);
  protected fnBg = (k: 'gradientFrom' | 'gradientTo' | 'gradientAngle' | 'color', v: string | number) => (t: ThemeConfig) =>
    ((t.background as Record<string, unknown>)[k] = v);
  protected fnTypo = (k: 'nameScale', v: number) => (t: ThemeConfig) => (t.typography[k] = v);
  protected fnCards = (k: keyof ThemeConfig['cards'], v: string | number | boolean) => (t: ThemeConfig) => ((t.cards as Record<string, unknown>)[k] = v);
  protected fnSocial = (k: keyof ThemeConfig['social'], v: string | boolean) => (t: ThemeConfig) => ((t.social as Record<string, unknown>)[k] = v);
  protected fnLayout = (k: keyof ThemeConfig['layout'], v: string | boolean) => (t: ThemeConfig) => ((t.layout as Record<string, unknown>)[k] = v);
  protected fnMotion = (v: boolean) => (t: ThemeConfig) => (t.motion.enabled = v);

  protected setPair(id: string): void {
    const p = FONT_PAIRS.find((x) => x.id === id);
    if (p) this.up((t) => (t.typography = { ...t.typography, ...p.typography }));
  }

  protected focal(e: MouseEvent): void {
    const el = e.currentTarget as HTMLElement;
    const r = el.getBoundingClientRect();
    const x = Math.round(((e.clientX - r.left) / r.width) * 100) / 100;
    const y = Math.round(((e.clientY - r.top) / r.height) * 100) / 100;
    this.up((t) => (t.background.focal = { x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)) }));
  }

  protected focalKey(e: KeyboardEvent): void {
    const step = 0.05;
    const d: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const m = d[e.key];
    if (!m) return;
    e.preventDefault();
    this.up((t) => {
      t.background.focal = {
        x: Math.round(Math.min(1, Math.max(0, t.background.focal.x + m[0])) * 100) / 100,
        y: Math.round(Math.min(1, Math.max(0, t.background.focal.y + m[1])) * 100) / 100,
      };
    });
  }

  protected setBgImage(id: string | null): void {
    this.up((t) => {
      t.background.imageId = id;
      if (id) t.background.type = 'image';
    });
  }

  protected fixContrast(): void {
    this.store.setTheme(suggestContrastFix(this.t(), this.samples() ?? undefined));
  }

  protected areaKey(a: string): I18nKey {
    return `theme.contrast.area.${a}` as I18nKey;
  }

  protected async publish(): Promise<void> {
    this.publishing.set(true);
    this.error.set('');
    try {
      await this.store.publish();
    } catch (e) {
      this.error.set(this.i18n.error(toProblem(e).code));
    } finally {
      this.publishing.set(false);
    }
  }

  protected shortcut(e: KeyboardEvent): void {
    const mod = e.metaKey || e.ctrlKey;
    if (!mod || (e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return;
    if (e.key.toLowerCase() === 'z' && !e.shiftKey) {
      e.preventDefault();
      this.store.undo();
    } else if (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey)) {
      e.preventDefault();
      this.store.redo();
    }
  }
}
