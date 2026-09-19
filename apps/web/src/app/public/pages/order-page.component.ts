import { ChangeDetectionStrategy, Component, DestroyRef, PLATFORM_ID, afterNextRender, inject, input, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { GlassCardComponent, IconComponent } from '../../../design-system';
import type { OrderStatusView } from '../../core/api/types';
import { PublicApi } from '../../core/api/public-api.service';
import { formatXof } from '../../core/format/compact-number';
import type { I18nKey } from '../../core/i18n/fr';
import { TPipe } from '../../core/i18n/i18n.service';
import { BlockShellComponent } from '../view/block-shell.component';
import { NotFoundComponent } from './not-found.component';

/** Route `/{handle}/commande/{reference}` — confirmation (interroge le statut tant qu'il est PENDING). */
@Component({
  selector: 'app-order-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BlockShellComponent, GlassCardComponent, IconComponent, RouterLink, TPipe, NotFoundComponent],
  template: `
    @if (page.error()) {
      <app-not-found />
    } @else if (page.hasValue()) {
      @let p = page.value()!;
      <lm-block-shell [page]="p">
        <section lmGlassCard class="op" aria-live="polite">
          @if (order(); as o) {
            <lm-icon class="op__icon" [name]="icon(o)" [size]="44" [strokeWidth]="1.5" />
            <h1 class="op__title">{{ statusKey(o) | t }}</h1>
            <p class="op__line">{{ o.productTitle }} × {{ o.quantity ?? 1 }} — <strong>{{ fmt(o.amountXof) }}</strong></p>
            <p class="op__ref">{{ 'shop.order.reference' | t: { ref: o.reference } }}</p>
            @if (o.status === 'PAID') {
              <p class="op__line">{{ 'shop.order.next' | t: { name: o.creatorName } }}</p>
            }
          } @else if (loadError()) {
            <p>{{ 'common.error' | t }}</p>
          } @else {
            <p>{{ 'common.loading' | t }}</p>
          }
          <a class="op__back" [routerLink]="['/', p.profile.handle, 'shop']">{{ 'shop.order.backToShop' | t }}</a>
        </section>
      </lm-block-shell>
    }
  `,
  styles: `
    .op { padding: 28px 22px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 10px; }
    .op__icon { color: var(--lm-accent); }
    .op__title { margin: 6px 0 0; font-size: 20px; font-weight: 600; }
    .op__line { margin: 0; }
    .op__ref { margin: 0; color: var(--lm-text-muted); font-size: 13px; font-variant-numeric: tabular-nums; }
    .op__back { margin-top: 12px; display: inline-flex; align-items: center; min-height: 48px; padding: 0 20px; border-radius: 999px; border: 1px solid var(--lm-control-border); color: var(--lm-text); text-decoration: none; }
    .op__back:focus-visible { outline: none; box-shadow: var(--lm-focus-ring); }
  `,
})
export class OrderPageComponent {
  readonly handle = input.required<string>();
  readonly reference = input.required<string>();
  private readonly api = inject(PublicApi);
  protected readonly fmt = formatXof;
  protected readonly page = rxResource({ params: () => this.handle().toLowerCase(), stream: ({ params }) => this.api.page(params) });
  protected readonly order = signal<OrderStatusView | null>(null);
  protected readonly loadError = signal(false);

  constructor() {
    const destroyRef = inject(DestroyRef);
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;
    let tries = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = () => {
      this.api.order(this.reference()).subscribe({
        next: (o) => {
          this.order.set(o);
          if (o.status === 'PENDING' && ++tries < 40) timer = setTimeout(poll, 3000);
        },
        error: () => this.loadError.set(true),
      });
    };
    afterNextRender(() => poll());
    destroyRef.onDestroy(() => clearTimeout(timer));
  }

  protected statusKey(o: OrderStatusView): I18nKey {
    return ({ PAID: 'shop.order.paid', PENDING: 'shop.order.pending', FAILED: 'shop.order.failed', CANCELED: 'shop.order.canceled' } as const)[o.status];
  }

  protected icon(o: OrderStatusView): string {
    return o.status === 'PAID' ? 'circle-check' : o.status === 'PENDING' ? 'loader-circle' : 'circle-x';
  }
}
