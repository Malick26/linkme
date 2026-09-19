import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../../design-system';
import { MeApi } from '../../core/api/me-api.service';
import { AuthStore } from '../../core/auth/auth.store';
import { formatXof } from '../../core/format/compact-number';
import type { I18nKey } from '../../core/i18n/fr';
import { TPipe } from '../../core/i18n/i18n.service';
import { ShareService } from '../../public/view/share.service';
import { EditorStore } from '../state/editor.store';

@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TPipe, IconComponent, RouterLink],
  template: `
    <div class="ed-page ed-stack">
      <h1>{{ 'dash.hello' | t: { name: auth.me()?.displayName ?? '' } }}</h1>
      <section class="ed-card st" [class.st--live]="auth.me()?.published">
        <div>
          <p class="st__title">{{ (auth.me()?.published ? 'dash.pageLive' : 'dash.pageDraft') | t }}</p>
          <p class="ed-muted st__url">{{ url() }}</p>
        </div>
        <div class="ed-row">
          @if (auth.me()?.published) {
            <a class="ed-btn ed-btn--primary" [href]="'/' + auth.me()?.handle" target="_blank" rel="noopener"><lm-icon name="external-link" [size]="18" />{{ 'dash.open' | t }}</a>
            <button type="button" class="ed-btn" (click)="copy()"><lm-icon [name]="copied() ? 'check' : 'copy'" [size]="18" />{{ (copied() ? 'common.copied' : 'ed.copyLink') | t }}</button>
          } @else {
            <a class="ed-btn ed-btn--primary" routerLink="/app/design">{{ 'ed.publish' | t }}</a>
          }
        </div>
      </section>

      <section class="ed-card">
        <h2>{{ 'dash.checklist' | t }}</h2>
        <ul class="ck" role="list">
          @for (c of checklist(); track c.key) {
            <li [class.ck--done]="c.done">
              <lm-icon [name]="c.done ? 'circle-check' : 'circle-x'" [size]="20" />
              <a [routerLink]="c.link">{{ c.key | t }}</a>
            </li>
          }
        </ul>
      </section>

      @if (earnings.value(); as e) {
        <section class="ed-card">
          <h2>{{ 'sales.title' | t }}</h2>
          <div class="ed-grid2">
            <div class="kpi"><span class="ed-muted">{{ 'sales.net' | t }}</span><strong>{{ fmt(e.netXof) }}</strong></div>
            <div class="kpi"><span class="ed-muted">{{ 'sales.orders' | t }}</span><strong>{{ e.paidOrders }}</strong></div>
          </div>
        </section>
      }
    </div>
  `,
  styles: `
    @use 'editor' as ed;
    @include ed.base;
    .st { display: flex; flex-wrap: wrap; gap: 14px; align-items: center; justify-content: space-between; border-left: 4px solid var(--ed-warning); }
    .st--live { border-left-color: var(--ed-success); }
    .st__title { margin: 0; font-weight: 650; font-size: 17px; }
    .st__url { word-break: break-all; }
    .ck { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; }
    .ck li { display: flex; align-items: center; gap: 10px; color: var(--ed-muted); }
    .ck li a { color: var(--ed-text); min-height: 44px; display: inline-flex; align-items: center; }
    .ck--done { opacity: .6; }
    .ck--done lm-icon { color: var(--ed-success); }
    .kpi { display: flex; flex-direction: column; gap: 4px; }
    .kpi strong { font-size: 24px; }
  `,
})
export class DashboardComponent {
  protected readonly auth = inject(AuthStore);
  private readonly store = inject(EditorStore);
  private readonly share = inject(ShareService);
  private readonly api = inject(MeApi);
  protected readonly copied = signal(false);
  protected readonly fmt = formatXof;
  protected readonly earnings = rxResource({ stream: () => this.api.earnings() });
  protected readonly url = computed(() => `${typeof location !== 'undefined' ? location.origin : ''}/${this.auth.me()?.handle ?? ''}`);
  protected readonly checklist = computed(() => {
    const p = this.store.profile();
    const items: Array<{ key: I18nKey; done: boolean; link: string }> = [
      { key: 'dash.check.background', done: !!p?.backgroundImageId || !!this.store.theme().background.imageId, link: '/app/profile' },
      { key: 'dash.check.socials', done: this.store.socials().length > 0, link: '/app/profile' },
      { key: 'dash.check.stats', done: !!this.store.stats()?.updatedAt, link: '/app/profile' },
      { key: 'dash.check.product', done: (this.earnings.value()?.paidOrders ?? 0) > 0, link: '/app/shop' },
      { key: 'dash.check.publish', done: !!this.auth.me()?.published, link: '/app/design' },
    ];
    return items;
  });

  protected async copy(): Promise<void> {
    if (await this.share.copy(this.url())) {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    }
  }
}
