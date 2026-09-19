import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BrandLogoComponent, IconComponent } from '../../design-system';
import { BRAND_NAME } from '../core/config/brand';
import { I18n, TPipe } from '../core/i18n/i18n.service';
import { SeoService } from '../core/seo/seo.service';

@Component({
  selector: 'app-landing',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, BrandLogoComponent, IconComponent, TPipe],
  template: `
    <div class="ld">
      <header class="ld__top">
        <lm-brand-logo />
        <a routerLink="/login" class="ld__login">{{ 'site.hero.login' | t }}</a>
      </header>
      <main class="ld__main">
        <h1>{{ 'site.hero.title' | t }}</h1>
        <p class="ld__text">{{ 'site.hero.text' | t }}</p>
        <div class="ld__ctas">
          <a routerLink="/register" class="ld__cta">{{ 'site.hero.cta' | t }}</a>
          <a routerLink="/malick" class="ld__demo">{{ 'site.hero.demo' | t }} <lm-icon name="arrow-right" [size]="18" /></a>
        </div>
        <ul class="ld__features" role="list">
          <li><lm-icon name="sparkles" [size]="20" />{{ 'site.feature.proof' | t }}</li>
          <li><lm-icon name="shopping-bag" [size]="20" />{{ 'site.feature.shop' | t }}</li>
          <li><lm-icon name="palette" [size]="20" />{{ 'site.feature.design' | t }}</li>
        </ul>
      </main>
      <footer class="ld__foot">
        <a routerLink="/legal/mentions">{{ 'site.footer.legal' | t }}</a>
        <a routerLink="/legal/confidentialite">{{ 'site.footer.privacy' | t }}</a>
        <a routerLink="/legal/cgu">{{ 'site.footer.terms' | t }}</a>
      </footer>
    </div>
  `,
  styles: `
    .ld { min-height: 100svh; display: flex; flex-direction: column; background: var(--lm-overlay-gradient, var(--lm-overlay)), var(--lm-overlay); color: var(--lm-text); padding: 20px 20px 28px; max-width: 1100px; margin: 0 auto; }
    .ld__top { display: flex; justify-content: space-between; align-items: center; }
    .ld__login { color: var(--lm-text); min-height: 44px; display: inline-flex; align-items: center; text-decoration: none; font-weight: 500; }
    .ld__main { flex: 1; display: flex; flex-direction: column; justify-content: center; max-width: 640px; padding: 48px 0; }
    h1 { margin: 0; font-size: clamp(34px, 7vw, 60px); line-height: 1.05; letter-spacing: -.02em; }
    .ld__text { margin: 18px 0 0; color: var(--lm-text-muted); font-size: 18px; line-height: 1.5; }
    .ld__ctas { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 28px; }
    .ld__cta, .ld__demo { display: inline-flex; align-items: center; gap: 8px; min-height: 52px; padding: 0 24px; border-radius: 999px; text-decoration: none; font-weight: 600; }
    .ld__cta { background: var(--lm-accent); color: var(--lm-overlay); }
    .ld__demo { border: 1px solid var(--lm-control-border); color: var(--lm-text); }
    .ld__features { list-style: none; padding: 0; margin: 36px 0 0; display: grid; gap: 12px; color: var(--lm-text-muted); }
    .ld__features li { display: flex; gap: 10px; align-items: center; }
    .ld__foot { display: flex; flex-wrap: wrap; gap: 8px 20px; font-size: 13px; }
    .ld__foot a { color: var(--lm-text-muted); min-height: 44px; display: inline-flex; align-items: center; }
  `,
})
export class LandingComponent {
  constructor() {
    const i18n = inject(I18n);
    inject(SeoService).set({ title: `${BRAND_NAME} — ${i18n.t('site.hero.title')}`, description: i18n.t('site.hero.text'), path: '/' });
  }
}
