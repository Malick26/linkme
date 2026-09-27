import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { BrandLogoComponent } from '../../design-system';
import { MeApi } from '../core/api/me-api.service';
import { BRAND_NAME } from '../core/config/brand';
import { frSite } from '../core/i18n/fr-site';
import { I18n, TPipe, registerDictionary } from '../core/i18n/i18n.service';
import { SeoService } from '../core/seo/seo.service';

registerDictionary(frSite);

/**
 * Désinscription en un clic depuis le lien de l'email (D62). L'appel part automatiquement à l'ouverture (rendu
 * client : un robot qui précharge le lien côté serveur ne désinscrit personne).
 */
@Component({
  selector: 'app-unsubscribe',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TPipe, BrandLogoComponent],
  template: `
    <main class="jn">
      <a routerLink="/" class="jn__brand" [attr.aria-label]="brand"><lm-brand-logo /></a>
      <section class="jn__card" aria-live="polite">
        <h1>{{ (state() === 'done' ? 'unsub.doneTitle' : 'unsub.title') | t }}</h1>
        @switch (state()) {
          @case ('working') { <p class="jn__lead" role="status">{{ 'unsub.working' | t }}</p> }
          @case ('done') { <p class="jn__lead" role="status" data-testid="unsub-done">{{ 'unsub.doneText' | t }}</p> }
          @case ('missing') { <p class="jn__error" role="alert">{{ 'unsub.missing' | t }}</p> }
          @case ('error') { <p class="jn__error" role="alert">{{ 'unsub.error' | t }}</p> }
        }
        <a routerLink="/" class="jn__link">{{ 'join.home' | t }}</a>
      </section>
    </main>
  `,
  styleUrl: './join.component.scss',
})
export class UnsubscribeComponent {
  protected readonly brand = BRAND_NAME;
  protected readonly state = signal<'working' | 'done' | 'missing' | 'error'>('working');

  constructor() {
    const api = inject(MeApi);
    inject(SeoService).set({ title: `${BRAND_NAME} — ${inject(I18n).t('unsub.title')}`, description: '', path: '/desinscription', noindex: true });
    const token = inject(ActivatedRoute).snapshot.queryParamMap.get('t')?.trim() ?? '';
    if (!/^[a-f0-9]{16,64}$/.test(token)) {
      this.state.set('missing');
      return;
    }
    firstValueFrom(api.unsubscribe(token)).then(
      () => this.state.set('done'),
      () => this.state.set('error'),
    );
  }
}
