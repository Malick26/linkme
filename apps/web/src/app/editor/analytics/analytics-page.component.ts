import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { MeApi } from '../../core/api/me-api.service';
import { compactNumber } from '../../core/format/compact-number';
import { TPipe } from '../../core/i18n/i18n.service';

/** Trafic (P1) : visites / clics sur 7 ou 30 jours. Une seule série par graphique (pas de double axe), table des liens. */
@Component({
  selector: 'app-analytics-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TPipe],
  template: `
    <div class="ed-page ed-stack">
      <div class="ed-row" style="justify-content: space-between">
        <h1>{{ 'analytics.title' | t }}</h1>
        <div class="ed-seg" role="group">
          @for (d of [7, 30]; track d) {
            <button type="button" [attr.aria-pressed]="days() === d" (click)="days.set($any(d))">{{ 'analytics.days' | t: { n: d } }}</button>
          }
        </div>
      </div>
      @if (data.value(); as a) {
        <div class="kpis">
          <div class="ed-card kpi"><span class="ed-muted">{{ 'analytics.views' | t }}</span><strong>{{ n(a.pageViews) }}</strong></div>
          <div class="ed-card kpi"><span class="ed-muted">{{ 'analytics.visitors' | t }}</span><strong>{{ n(a.uniqueVisitors ?? 0) }}</strong></div>
          <div class="ed-card kpi"><span class="ed-muted">{{ 'analytics.clicks' | t }}</span><strong>{{ n(a.clicks) }}</strong></div>
        </div>
        <section class="ed-card">
          <h2>{{ 'analytics.views' | t }}</h2>
          <div class="bars" role="img" [attr.aria-label]="'analytics.views' | t">
            @for (d of a.byDay; track d.date) {
              <div class="bars__col" [title]="d.date + ' : ' + d.pageViews">
                <i [style.height.%]="max() ? (d.pageViews / max()) * 100 : 0"></i>
              </div>
            }
          </div>
          <div class="bars__axis"><span>{{ a.byDay[0]?.date }}</span><span>{{ a.byDay[a.byDay.length - 1]?.date }}</span></div>
        </section>
        <section class="ed-card">
          <h2>{{ 'analytics.byBlock' | t }}</h2>
          <table>
            <tbody>
              @for (b of a.byBlock; track b.target) {
                <tr><th scope="row">{{ b.title || b.target }}</th><td>{{ b.clicks }}</td></tr>
              } @empty {
                <tr><td class="ed-muted">{{ 'ed.empty' | t }}</td></tr>
              }
            </tbody>
          </table>
        </section>
      }
    </div>
  `,
  styles: `
    @use 'editor' as ed;
    @include ed.base;
    .kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; }
    .kpi { display: flex; flex-direction: column; gap: 6px; }
    .kpi strong { font-size: 24px; font-variant-numeric: tabular-nums; }
    .bars { display: flex; align-items: flex-end; gap: 2px; height: 140px; border-bottom: 1px solid var(--ed-border); }
    .bars__col { flex: 1; height: 100%; display: flex; align-items: flex-end; }
    .bars__col i { display: block; width: 100%; min-height: 1px; background: var(--ed-accent); border-radius: 4px 4px 0 0; }
    .bars__col:hover i { opacity: .8; }
    .bars__axis { display: flex; justify-content: space-between; font-size: 12px; color: var(--ed-muted); margin-top: 6px; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th, td { text-align: left; padding: 8px; border-bottom: 1px solid var(--ed-border); font-weight: 400; }
    td { text-align: right; font-variant-numeric: tabular-nums; }
  `,
})
export class AnalyticsPageComponent {
  private readonly api = inject(MeApi);
  protected readonly days = signal<7 | 30>(7);
  protected readonly data = rxResource({ params: () => this.days(), stream: ({ params }) => this.api.analytics(params) });
  protected readonly max = computed(() => Math.max(0, ...(this.data.value()?.byDay.map((d) => d.pageViews) ?? [0])));
  protected readonly n = compactNumber;
}
