import { ChangeDetectionStrategy, Component, ViewContainerRef, afterNextRender, computed, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BrandLogoComponent, IconComponent } from '../../design-system';
import type { IconName } from '../../design-system';
import { BRAND_NAME, DEMO_HANDLE, PUBLIC_BASE_URL_FALLBACK } from '../core/config/brand';
import type { I18nKey } from '../core/i18n/fr';
import { I18n, TPipe } from '../core/i18n/i18n.service';
import { SeoService } from '../core/seo/seo.service';
import { LANDING_PALETTES, type LandingPalette } from '../core/theme/landing-palettes';

/** Page d'accueil publique : ce que fait le produit, pour qui, et comment commencer. */
@Component({
  selector: 'app-landing',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, BrandLogoComponent, IconComponent, TPipe],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
})
export class LandingComponent {
  protected readonly brand = BRAND_NAME;
  protected readonly demoHandle = DEMO_HANDLE;
  /** « linkme.sn » — le domaine tel qu'il apparaîtra dans le lien du créateur. */
  protected readonly domain = PUBLIC_BASE_URL_FALLBACK.replace(/^https?:\/\//, '').replace(/\/$/, '');
  protected readonly palettes = LANDING_PALETTES;
  protected readonly palette = signal<LandingPalette>(LANDING_PALETTES[0]);

  protected readonly mockCards: { title: I18nKey; sub: I18nKey }[] = [
    { title: 'site.mock.card1', sub: 'site.mock.card1s' },
    { title: 'site.mock.card2', sub: 'site.mock.card2s' },
    { title: 'site.mock.card3', sub: 'site.mock.card3s' },
    { title: 'site.mock.card4', sub: 'site.mock.card4s' },
  ];

  protected readonly steps: { n: number; title: I18nKey; text: I18nKey }[] = [
    { n: 1, title: 'site.step1.title', text: 'site.step1.text' },
    { n: 2, title: 'site.step2.title', text: 'site.step2.text' },
    { n: 3, title: 'site.step3.title', text: 'site.step3.text' },
  ];

  protected readonly features: { icon: IconName; title: I18nKey; text: I18nKey }[] = [
    { icon: 'palette', title: 'site.f1.title', text: 'site.f1.text' },
    { icon: 'store', title: 'site.f2.title', text: 'site.f2.text' },
    { icon: 'sparkles', title: 'site.f3.title', text: 'site.f3.text' },
    { icon: 'chart-column', title: 'site.f4.title', text: 'site.f4.text' },
    { icon: 'inbox', title: 'site.f5.title', text: 'site.f5.text' },
    { icon: 'share-2', title: 'site.f6.title', text: 'site.f6.text' },
  ];

  protected readonly shopBullets: I18nKey[] = ['site.shop.b1', 'site.shop.b2', 'site.shop.b3'];

  protected readonly faq: { q: I18nKey; a: I18nKey }[] = [
    { q: 'site.faq.q1', a: 'site.faq.a1' },
    { q: 'site.faq.q2', a: 'site.faq.a2' },
    { q: 'site.faq.q3', a: 'site.faq.a3' },
    { q: 'site.faq.q4', a: 'site.faq.a4' },
    { q: 'site.faq.q5', a: 'site.faq.a5' },
  ];

  /** Les couleurs de l'aperçu sont posées en variables CSS : même principe que les thèmes réels. */
  protected readonly mockVars = computed(() => {
    const p = this.palette();
    return `--mk-from:${p.from};--mk-to:${p.to};--mk-accent:${p.accent};--mk-text:${p.text};--mk-muted:${p.muted};--mk-card:${p.card};--mk-border:${p.border}`;
  });

  private readonly announcementSlot = viewChild('announcement', { read: ViewContainerRef });

  constructor() {
    // annonce admin (D66) : import dynamique après le premier rendu, dans le navigateur seulement — ni rendu
    // serveur, ni poids dans le bundle initial (un @defer ajouterait son moteur au bundle commun, D67)
    afterNextRender(() => {
      void import('../shared/announcement-popup.component').then(({ AnnouncementPopupComponent }) => {
        const ref = this.announcementSlot()?.createComponent(AnnouncementPopupComponent);
        ref?.setInput('audience', 'landing');
      });
    });
    const i18n = inject(I18n);
    inject(SeoService).set({
      title: `${BRAND_NAME} — ${i18n.t('site.hero.title2')}`,
      description: i18n.t('site.hero.text2'),
      path: '/',
    });
  }

  protected pick(p: LandingPalette): void {
    this.palette.set(p);
  }
}
