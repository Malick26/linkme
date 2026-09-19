import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { MeApi } from '../../core/api/me-api.service';
import type { Order } from '../../core/api/types';
import { formatXof } from '../../core/format/compact-number';
import type { I18nKey } from '../../core/i18n/fr';
import { TPipe } from '../../core/i18n/i18n.service';

/** Ventes & gains : totaux du grand livre (brut, commission, net, à reverser) et liste des commandes (brief §7.4). */
@Component({
  selector: 'app-sales-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TPipe],
  template: `
    <div class="ed-page ed-stack">
      <h1>{{ 'sales.title' | t }}</h1>
      @if (earnings.value(); as e) {
        <div class="kpis">
          <div class="ed-card kpi"><span class="ed-muted">{{ 'sales.gross' | t }}</span><strong>{{ fmt(e.grossXof) }}</strong></div>
          <div class="ed-card kpi"><span class="ed-muted">{{ 'sales.commission' | t: { pct: e.commissionPercent } }}</span><strong>{{ fmt(e.commissionXof) }}</strong></div>
          <div class="ed-card kpi kpi--main"><span class="ed-muted">{{ 'sales.net' | t }}</span><strong>{{ fmt(e.netXof) }}</strong></div>
          <div class="ed-card kpi"><span class="ed-muted">{{ 'sales.pending' | t }}</span><strong>{{ fmt(e.pendingPayoutXof) }}</strong></div>
        </div>
      }
      <section class="ed-card">
        <h2>{{ 'sales.orders' | t }}</h2>
        @if (orders.value()?.items; as items) {
          @if (!items.length) {
            <p class="ed-muted">{{ 'sales.none' | t }}</p>
          } @else {
            <div class="tbl" role="region" tabindex="0" [attr.aria-label]="'sales.orders' | t">
              <table>
                <thead><tr><th scope="col">Réf.</th><th scope="col">Produit</th><th scope="col">{{ 'sales.buyer' | t }}</th><th scope="col">Montant</th><th scope="col">Net</th><th scope="col">Statut</th></tr></thead>
                <tbody>
                  @for (o of items; track o.id) {
                    <tr>
                      <td class="mono">{{ o.reference }}</td>
                      <td>{{ o.productTitle }} × {{ o.quantity }}</td>
                      <td>{{ o.buyerName }}<br /><span class="ed-muted">{{ o.buyerPhone }}</span></td>
                      <td>{{ fmt(o.amountXof) }}</td>
                      <td>{{ fmt(o.netXof) }}</td>
                      <td>
                        <span class="ed-chip" [class.ed-chip--ok]="o.status === 'PAID'" [class.ed-chip--bad]="o.status === 'FAILED' || o.status === 'CANCELED'">{{ statusKey(o) | t }}</span>
                        @if (o.needsAttention) {
                          <span class="ed-chip ed-chip--warn">{{ 'sales.attention' | t }}</span>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        }
      </section>
    </div>
  `,
  styles: `
    @use 'editor' as ed;
    @include ed.base;
    .kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; }
    .kpi { display: flex; flex-direction: column; gap: 6px; }
    .kpi strong { font-size: 22px; font-variant-numeric: tabular-nums; }
    .kpi--main strong { color: var(--ed-accent); }
    .tbl { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th, td { text-align: left; padding: 10px 8px; border-bottom: 1px solid var(--ed-border); vertical-align: top; }
    th { color: var(--ed-muted); font-weight: 600; font-size: 12px; }
    .mono { font-family: ui-monospace, monospace; font-size: 12px; }
  `,
})
export class SalesPageComponent {
  private readonly api = inject(MeApi);
  protected readonly earnings = rxResource({ stream: () => this.api.earnings() });
  protected readonly orders = rxResource({ stream: () => this.api.orders() });
  protected readonly fmt = formatXof;
  protected statusKey(o: Order): I18nKey {
    return `sales.status.${o.status}` as I18nKey;
  }
}
