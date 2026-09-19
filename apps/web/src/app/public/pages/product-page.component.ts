import { ChangeDetectionStrategy, Component, DOCUMENT, computed, effect, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { GlassCardComponent } from '../../../design-system';
import { PublicApi } from '../../core/api/public-api.service';
import { formatXof } from '../../core/format/compact-number';
import { toProblem } from '../../core/http/problem';
import { imageUrl } from '../../core/images/image-url';
import { I18n, TPipe } from '../../core/i18n/i18n.service';
import { SeoService } from '../../core/seo/seo.service';
import { BlockShellComponent } from '../view/block-shell.component';
import { NotFoundComponent } from './not-found.component';
import { useResponseStatus } from './page-context';

/** Route `/{handle}/shop/{productId}` — fiche produit + checkout mobile money. */
@Component({
  selector: 'app-product-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BlockShellComponent, GlassCardComponent, ReactiveFormsModule, TPipe, NotFoundComponent],
  template: `
    @if (failed()) {
      <app-not-found />
    } @else if (page.hasValue() && product.hasValue()) {
      @let p = page.value()!;
      @let prod = product.value()!;
      <lm-block-shell [page]="p" [backLink]="['/', p.profile.handle, 'shop']">
        <article class="pp">
          <div class="pp__gallery" tabindex="0" [attr.aria-label]="prod.title">
            @for (img of prod.images; track img.id) {
              <img [src]="imageUrl(img, 900)" [alt]="prod.title" width="600" height="600" [attr.loading]="$first ? 'eager' : 'lazy'" />
            }
          </div>
          <h1 class="pp__title">{{ prod.title }}</h1>
          <p class="pp__price">{{ fmt(prod.priceXof) }}</p>
          @if (prod.description) {
            <p class="pp__desc">{{ prod.description }}</p>
          }

          @if (prod.available) {
            <form lmGlassCard class="co" [formGroup]="form" (ngSubmit)="pay(p.profile.handle, prod.id)" novalidate>
              <h2 class="co__title">{{ 'shop.checkout.title' | t }}</h2>
              <label class="f"><span>{{ 'shop.quantity' | t }}</span>
                <select formControlName="quantity">
                  @for (q of quantities; track q) {
                    <option [value]="q">{{ q }}</option>
                  }
                </select>
              </label>
              <label class="f"><span>{{ 'shop.checkout.name' | t }}</span><input formControlName="buyerName" autocomplete="name" required maxlength="80" /></label>
              <label class="f"><span>{{ 'shop.checkout.phone' | t }}</span><input formControlName="buyerPhone" type="tel" inputmode="tel" autocomplete="tel" required placeholder="+221 77 000 00 00" /></label>
              <label class="f"><span>{{ 'shop.checkout.email' | t }} ({{ 'common.optional' | t }})</span><input formControlName="buyerEmail" type="email" autocomplete="email" /></label>
              <p class="co__total"><span>{{ 'shop.checkout.total' | t }}</span><strong>{{ fmt(total(prod.priceXof)) }}</strong></p>
              @if (error()) {
                <p class="co__err" role="alert">{{ error() }}</p>
              }
              <button class="co__pay" type="submit" [disabled]="busy()">
                {{ busy() ? ('shop.checkout.redirecting' | t) : ('shop.checkout.pay' | t: { amount: fmt(total(prod.priceXof)) }) }}
              </button>
              <p class="co__note">{{ 'shop.checkout.secure' | t }}</p>
            </form>
          } @else {
            <p class="pp__soldout">{{ 'shop.soldOut' | t }}</p>
          }
        </article>
      </lm-block-shell>
    }
  `,
  styles: `
    .pp__gallery { display: flex; gap: 10px; overflow-x: auto; scroll-snap-type: x mandatory; border-radius: var(--lm-card-radius); }
    .pp__gallery img { flex: 0 0 100%; aspect-ratio: 1; object-fit: cover; scroll-snap-align: start; border-radius: var(--lm-card-radius); background: var(--lm-surface); }
    .pp__gallery:focus-visible { outline: none; box-shadow: var(--lm-focus-ring); }
    .pp__title { margin: 18px 0 0; font-size: 24px; font-weight: 600; }
    .pp__price { margin: 6px 0 0; color: var(--lm-accent); font-size: 20px; font-weight: 600; }
    .pp__desc { margin: 12px 0 0; color: var(--lm-text-muted); line-height: 1.55; white-space: pre-line; }
    .pp__soldout { margin-top: 20px; font-weight: 600; }
    .co { margin-top: 22px; padding: 20px; display: flex; flex-direction: column; gap: 14px; }
    .co__title { margin: 0; font-size: 18px; font-weight: 600; }
    .f { display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: var(--lm-text-muted); }
    input, select { width: 100%; min-height: 48px; padding: 12px 14px; border-radius: 14px; font-size: 16px; color: var(--lm-text); background: var(--lm-control-bg); border: 1px solid var(--lm-control-border); }
    input:focus-visible, select:focus-visible, .co__pay:focus-visible { outline: none; box-shadow: var(--lm-focus-ring); }
    .co__total { display: flex; justify-content: space-between; margin: 4px 0 0; font-size: 16px; }
    .co__pay { min-height: 54px; border: 0; border-radius: 999px; font-weight: 700; font-size: 16px; cursor: pointer; background: var(--lm-accent); color: var(--lm-overlay); }
    .co__pay[disabled] { opacity: .6; cursor: progress; }
    .co__err { margin: 0; color: var(--lm-accent); }
    .co__note { margin: 0; font-size: 12px; color: var(--lm-text-muted); line-height: 1.5; }
  `,
})
export class ProductPageComponent {
  readonly handle = input.required<string>();
  readonly productId = input.required<string>();
  private readonly api = inject(PublicApi);
  private readonly i18n = inject(I18n);
  private readonly seo = inject(SeoService);
  private readonly doc = inject(DOCUMENT);
  private readonly setStatus = useResponseStatus();
  private readonly idempotencyKey = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

  protected readonly page = rxResource({ params: () => this.handle().toLowerCase(), stream: ({ params }) => this.api.page(params) });
  protected readonly product = rxResource({
    params: () => ({ h: this.handle().toLowerCase(), id: this.productId() }),
    stream: ({ params }) => this.api.product(params.h, params.id),
  });
  protected readonly failed = computed(() => !!this.page.error() || !!this.product.error());
  protected readonly quantities = [1, 2, 3, 4, 5];
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly fmt = formatXof;
  protected readonly imageUrl = imageUrl;
  protected readonly form = inject(FormBuilder).nonNullable.group({
    quantity: [1, [Validators.required, Validators.min(1), Validators.max(10)]],
    buyerName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
    buyerPhone: ['', [Validators.required, Validators.pattern(/^\+?[0-9 ]{8,20}$/)]],
    buyerEmail: ['', [Validators.email]],
  });

  constructor() {
    effect(() => {
      if (this.failed()) return this.setStatus(404);
      const p = this.page.hasValue() ? this.page.value() : null;
      const prod = this.product.hasValue() ? this.product.value() : null;
      if (p && prod) {
        this.seo.set({ title: `${prod.title} — ${p.profile.displayName}`, description: prod.description?.slice(0, 160) || prod.title, image: imageUrl(prod.images[0], 1200), path: `/${p.profile.handle}/shop/${prod.id}` });
      }
    });
  }

  protected total(price: number): number {
    return price * Number(this.form.controls.quantity.value || 1);
  }

  protected pay(handle: string, productId: string): void {
    this.error.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return this.error.set(this.i18n.t('error.VALIDATION'));
    }
    const v = this.form.getRawValue();
    this.busy.set(true);
    this.api
      .checkout(handle, {
        productId,
        quantity: Number(v.quantity),
        buyerName: v.buyerName.trim(),
        buyerPhone: v.buyerPhone.trim(),
        buyerEmail: v.buyerEmail || undefined,
        idempotencyKey: this.idempotencyKey,
      })
      .subscribe({
        next: (r) => {
          const url = r.paymentUrl;
          // redirection uniquement vers une URL https ou relative (page mock)
          if (/^(https:\/\/|\/api\/payments\/mock\/)/.test(url)) this.doc.location.assign(url);
          else this.busy.set(false);
        },
        error: (e) => {
          this.busy.set(false);
          this.error.set(this.i18n.error(toProblem(e).code));
        },
      });
  }
}
