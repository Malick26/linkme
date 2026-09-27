import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent, PoweredByComponent } from '../../../design-system';
import type { Image, PublicPage } from '../../core/api/types';
import { TPipe } from '../../core/i18n/i18n.service';
import { themeToCssVars } from '../../core/theme/theme-to-css-vars';
import { PageBackgroundComponent } from './page-background.component';

/** Habillage des pages de détail (blocs, produit, commande) : même fond, en-tête réduit (brief §5.5). */
@Component({
  selector: 'lm-block-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageBackgroundComponent, IconComponent, RouterLink, TPipe, PoweredByComponent],
  template: `
    @let p = page();
    <div class="lm-page {{ render().classes.join(' ') }}" [style]="render().vars">
      <div class="lm-scope">
        <lm-page-background [theme]="p.theme" [image]="bg()" [forceImage]="!!backgroundImage()" />
        <header class="bs__top">
          <a class="bs__back" [routerLink]="backLink() ?? ['/', p.profile.handle]" [attr.aria-label]="'public.backToProfile' | t: { name: p.profile.displayName }">
            <lm-icon name="arrow-left" [size]="20" />
          </a>
          <a class="bs__name" [routerLink]="['/', p.profile.handle]">{{ p.profile.displayName }}</a>
        </header>
        <main class="bs__main">
          @if (heading()) {
            <h1 class="bs__title">{{ heading() }}</h1>
          }
          @if (subheading()) {
            <p class="bs__sub">{{ subheading() }}</p>
          }
          <ng-content />
        </main>
        @if (p.showBranding) {
          <footer class="bs__foot"><lm-powered-by /></footer>
        }
      </div>
    </div>
  `,
  styles: `
    .lm-page { position: relative; min-height: 100svh; color: var(--lm-text); font-family: var(--lm-font-body); background: var(--lm-bg); }
    .lm-scope { position: relative; min-height: inherit; display: flex; flex-direction: column; }
    .bs__top { position: relative; z-index: 1; display: flex; align-items: center; gap: 12px; padding: calc(14px + env(safe-area-inset-top)) var(--lm-gutter) 0; max-width: calc(var(--lm-content-max) + 2 * var(--lm-gutter)); width: 100%; margin: 0 auto; }
    .bs__back {
      display: grid; place-items: center; width: var(--lm-touch); height: var(--lm-touch); border-radius: 50%; color: var(--lm-text);
      background: var(--lm-control-bg); border: 1px solid var(--lm-card-border); -webkit-backdrop-filter: blur(14px); backdrop-filter: blur(14px);
    }
    .bs__back:focus-visible, .bs__name:focus-visible { outline: none; box-shadow: var(--lm-focus-ring); }
    .bs__name { font-family: var(--lm-font-display); font-size: 28px; line-height: 1; color: var(--lm-text); text-decoration: none; transform: rotate(-3deg); }
    .bs__main { position: relative; z-index: 1; flex: 1; width: 100%; max-width: calc(var(--lm-content-max) + 2 * var(--lm-gutter)); margin: 0 auto; padding: 28px var(--lm-gutter) 24px; }
    .bs__title { margin: 0; font-size: 28px; font-weight: 600; letter-spacing: -.01em; }
    .bs__sub { margin: 6px 0 0; color: var(--lm-text-muted); font-size: 15px; }
    .bs__foot { position: relative; z-index: 1; display: flex; justify-content: center; padding: 12px var(--lm-gutter) calc(18px + env(safe-area-inset-bottom)); }
  `,
})
export class BlockShellComponent {
  readonly page = input.required<PublicPage>();
  readonly heading = input<string>();
  readonly subheading = input<string | null>();
  readonly backLink = input<string[] | null>(null);
  /** Image de fond propre au bloc affiché (D50) : prime sur le fond du thème du profil. */
  readonly backgroundImage = input<Image | null>(null);
  protected readonly render = computed(() => themeToCssVars(this.page().theme));
  protected readonly bg = computed(() => {
    if (this.backgroundImage()) return this.backgroundImage();
    const id = this.page().theme.background.imageId;
    return id ? (this.page().images[id] ?? null) : null;
  });
}
