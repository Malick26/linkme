import {
  ChangeDetectionStrategy, Component, DestroyRef, ElementRef, PLATFORM_ID, afterNextRender, computed, inject, input,
  output, signal, viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  BrandLogoComponent, CardLink, CrownComponent, IconButtonComponent, IconComponent, LinkCardComponent,
  PoweredByComponent, ScriptNameComponent, SocialRailComponent, StatsRowComponent, SwashComponent,
} from '../../../design-system';
import type { Block, PublicPage } from '../../core/api/types';
import { TPipe } from '../../core/i18n/i18n.service';
import { themeToCssVars } from '../../core/theme/theme-to-css-vars';
import { MyLinksSheetComponent } from './my-links-sheet.component';
import { MoreMenuComponent } from './more-menu.component';
import { PageBackgroundComponent } from './page-background.component';

export interface ViewClick {
  kind: 'block' | 'social' | 'mylinks';
  blockId?: string;
  target: string;
}

/**
 * Rendu de la page créateur — **composant unique** partagé par la route publique (SSR) et l'aperçu live de
 * l'éditeur (ADR 0001). Tout l'habillage vient de `page.theme` via des CSS custom properties.
 */
@Component({
  selector: 'lm-public-page-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BrandLogoComponent, CrownComponent, IconButtonComponent, IconComponent, LinkCardComponent, PoweredByComponent,
    ScriptNameComponent, SocialRailComponent, StatsRowComponent, SwashComponent, TPipe, PageBackgroundComponent,
    MyLinksSheetComponent, MoreMenuComponent,
  ],
  templateUrl: './public-page-view.component.html',
  styleUrl: './public-page-view.component.scss',
  host: { '(click)': 'onHostClick($event)' },
})
export class PublicPageViewComponent {
  readonly page = input.required<PublicPage>();
  /** Aperçu embarqué dans l'éditeur (fond sticky, liens inertes) */
  readonly embedded = input(false);
  readonly pageUrl = input<string>('');
  readonly linkClick = output<ViewClick>();

  protected readonly render = computed(() => themeToCssVars(this.page().theme));
  protected readonly style = computed(() => this.render().vars);
  protected readonly classes = computed(() => [...this.render().classes, this.embedded() ? 'lm-page--embedded' : ''].join(' '));
  protected readonly t = computed(() => this.page().theme);
  protected readonly profile = computed(() => this.page().profile);
  protected readonly bgImage = computed(() => {
    const id = this.page().theme.background.imageId;
    return id ? (this.page().images[id] ?? null) : null;
  });
  protected readonly blocks = computed(() => this.page().blocks.filter((b) => b.visible));
  protected readonly categories = computed(() => this.profile().categories.filter(Boolean));
  protected readonly socialRow = computed(() => this.t().social.position === 'below-stats');

  protected readonly sheetOpen = signal(false);
  protected readonly menuOpen = signal(false);
  protected readonly atLinks = signal(false);

  private readonly cardsEl = viewChild<ElementRef<HTMLElement>>('cards');
  private readonly topEl = viewChild<ElementRef<HTMLElement>>('top');
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      // chevron : « descendre » tant que la barre du haut est visible, puis « remonter »
      const el = this.topEl()?.nativeElement;
      if (!el || typeof IntersectionObserver === 'undefined') return;
      const io = new IntersectionObserver(([e]) => this.atLinks.set(!e.isIntersecting), { threshold: 0 });
      io.observe(el);
      destroyRef.onDestroy(() => io.disconnect());
    });
  }

  protected blockLink(b: Block): CardLink {
    if (b.type === 'link' && b.url) return { kind: 'url', href: b.url };
    return { kind: 'route', commands: ['/', this.profile().handle, b.slug] };
  }

  protected thumb(b: Block) {
    return b.thumbnail ?? (b.thumbnailImageId ? this.page().images[b.thumbnailImageId] : null);
  }

  protected scrollToggle(): void {
    if (!this.browser) return;
    const target = this.atLinks() ? this.topEl()?.nativeElement : this.cardsEl()?.nativeElement;
    const reduce = !this.t().motion.enabled || matchMedia('(prefers-reduced-motion: reduce)').matches;
    target?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }

  /** Dans l'aperçu éditeur, les liens ne naviguent pas. */
  protected onHostClick(e: MouseEvent): void {
    if (!this.embedded()) return;
    const a = (e.target as HTMLElement | null)?.closest?.('a');
    if (a) e.preventDefault();
  }
}
