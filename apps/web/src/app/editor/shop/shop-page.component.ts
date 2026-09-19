import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { IconComponent } from '../../../design-system';
import { MeApi } from '../../core/api/me-api.service';
import type { Image, Product, ProductInput } from '../../core/api/types';
import { AuthStore } from '../../core/auth/auth.store';
import { formatXof } from '../../core/format/compact-number';
import { toProblem } from '../../core/http/problem';
import { imageUrl } from '../../core/images/image-url';
import { I18n, TPipe } from '../../core/i18n/i18n.service';
import { ImageUploadComponent } from '../shared/image-upload.component';

interface Draft extends ProductInput { id?: string; images: Image[] }

/** Boutique : produits simples (titre, prix FCFA entier, 1–5 photos, description, stock optionnel, actif) — D6. */
@Component({
  selector: 'app-shop-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TPipe, IconComponent, ImageUploadComponent],
  template: `
    <div class="ed-page ed-stack">
      <div class="ed-row" style="justify-content: space-between">
        <h1>{{ 'shop.products' | t }}</h1>
        <button type="button" class="ed-btn ed-btn--primary" (click)="edit()"><lm-icon name="plus" [size]="18" />{{ 'shop.addProduct' | t }}</button>
      </div>
      @if (draft(); as d) {
        <section class="ed-card ed-stack" aria-labelledby="pf-title">
          <h2 id="pf-title">{{ (d.id ? 'shop.editProduct' : 'shop.addProduct') | t }}</h2>
          <div class="ed-grid2">
            <label class="ed-field"><span>{{ 'shop.field.title' | t }}</span><input [value]="d.title" maxlength="80" (input)="patch({ title: $any($event.target).value })" data-testid="product-title" /></label>
            <label class="ed-field"><span>{{ 'shop.field.price' | t }}</span><input type="number" min="100" step="100" inputmode="numeric" [value]="d.priceXof" (input)="patch({ priceXof: int($any($event.target).value) })" data-testid="product-price" /></label>
            <label class="ed-field"><span>{{ 'shop.field.stock' | t }}</span><input type="number" min="0" inputmode="numeric" [value]="d.stock ?? ''" (input)="patch({ stock: $any($event.target).value === '' ? null : int($any($event.target).value) })" /></label>
          </div>
          <label class="ed-field"><span>{{ 'shop.field.description' | t }}</span><textarea rows="3" maxlength="2000" [value]="d.description ?? ''" (input)="patch({ description: $any($event.target).value })"></textarea></label>
          <label class="ed-switch"><input type="checkbox" [checked]="d.active" (change)="patch({ active: $any($event.target).checked })" />{{ 'shop.field.active' | t }}</label>
          <div class="ed-field">
            <span>{{ 'shop.field.images' | t }}</span>
            <div class="imgs">
              @for (img of d.images; track img.id; let i = $index) {
                <div class="imgs__it"><img [src]="url(img)" alt="" /><button type="button" class="ed-btn ed-btn--icon ed-btn--ghost" (click)="removeImg(i)" [attr.aria-label]="'ed.remove' | t"><lm-icon name="x" [size]="16" /></button></div>
              }
            </div>
            @if (d.images.length < 5) {
              <ed-image-upload kind="product" [label]="'shop.field.images' | t" [removable]="false" (uploaded)="addImg($event)" />
            }
          </div>
          @if (error()) {
            <p class="ed-error" role="alert">{{ error() }}</p>
          }
          <div class="ed-row">
            <button type="button" class="ed-btn ed-btn--primary" (click)="save()" [disabled]="busy()" data-testid="product-save">{{ (busy() ? 'common.saving' : 'common.save') | t }}</button>
            <button type="button" class="ed-btn" (click)="draft.set(null)">{{ 'common.cancel' | t }}</button>
          </div>
        </section>
      }
      @if (products.value(); as list) {
        @if (list.length === 0 && !draft()) {
          <p class="ed-muted">{{ 'shop.noProducts' | t }}</p>
        }
        <ul class="pl" role="list">
          @for (p of list; track p.id) {
            <li class="ed-card pl__it">
              @if (p.images[0]) {
                <img [src]="url(p.images[0])" alt="" width="64" height="64" />
              }
              <div class="pl__txt">
                <strong>{{ p.title }}</strong>
                <span class="ed-muted">{{ fmt(p.priceXof) }} · {{ p.stock == null ? ('shop.unlimited' | t) : ('shop.stockLeft' | t: { n: p.stock }) }}</span>
                @if (!p.active) {
                  <span class="ed-chip ed-chip--warn">{{ 'shop.inactive' | t }}</span>
                }
              </div>
              <button type="button" class="ed-btn ed-btn--icon" (click)="edit(p)" [attr.aria-label]="('common.edit' | t) + ' ' + p.title"><lm-icon name="pencil" [size]="18" /></button>
              <button type="button" class="ed-btn ed-btn--icon ed-btn--ghost" (click)="remove(p)" [attr.aria-label]="('common.delete' | t) + ' ' + p.title"><lm-icon name="trash-2" [size]="18" /></button>
            </li>
          }
        </ul>
      }
    </div>
  `,
  styles: `
    @use 'editor' as ed;
    @include ed.base;
    .pl { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
    .pl__it { display: flex; align-items: center; gap: 12px; padding: 12px; }
    .pl__it img { width: 64px; height: 64px; border-radius: 10px; object-fit: cover; }
    .pl__txt { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
    .imgs { display: flex; flex-wrap: wrap; gap: 8px; }
    .imgs__it { position: relative; }
    .imgs__it img { width: 88px; height: 88px; border-radius: 10px; object-fit: cover; }
    .imgs__it button { position: absolute; top: -6px; right: -6px; width: 32px; min-height: 32px; background: var(--ed-panel); }
  `,
})
export class ShopPageComponent {
  private readonly api = inject(MeApi);
  private readonly auth = inject(AuthStore);
  private readonly i18n = inject(I18n);
  protected readonly products = rxResource({ stream: () => this.api.products() });
  protected readonly draft = signal<Draft | null>(null);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly fmt = formatXof;

  protected url(img: Image): string | null {
    return imageUrl(img, 240);
  }

  protected int(v: string): number {
    return Math.max(0, Math.trunc(Number(v) || 0));
  }

  protected edit(p?: Product): void {
    this.error.set('');
    this.draft.set(p
      ? { id: p.id, title: p.title, priceXof: p.priceXof, description: p.description ?? '', stock: p.stock ?? null, active: p.active, imageIds: p.imageIds, images: p.images }
      : { title: '', priceXof: 5000, description: '', stock: null, active: true, imageIds: [], images: [] });
  }

  protected patch(p: Partial<Draft>): void {
    this.draft.update((d) => (d ? { ...d, ...p } : d));
  }

  protected addImg(img: Image): void {
    this.draft.update((d) => (d ? { ...d, images: [...d.images, img], imageIds: [...d.imageIds, img.id] } : d));
  }

  protected removeImg(i: number): void {
    this.draft.update((d) => (d ? { ...d, images: d.images.filter((_, k) => k !== i), imageIds: d.imageIds.filter((_, k) => k !== i) } : d));
  }

  protected async save(): Promise<void> {
    const d = this.draft();
    if (!d) return;
    this.busy.set(true);
    this.error.set('');
    try {
      await this.auth.ensureCsrf();
      const body: ProductInput = { title: d.title, priceXof: d.priceXof, description: d.description, stock: d.stock, active: d.active, imageIds: d.imageIds };
      await firstValueFrom(d.id ? this.api.updateProduct(d.id, body) : this.api.createProduct(body));
      this.draft.set(null);
      this.products.reload();
    } catch (e) {
      this.error.set(this.i18n.error(toProblem(e).code));
    } finally {
      this.busy.set(false);
    }
  }

  protected async remove(p: Product): Promise<void> {
    await this.auth.ensureCsrf();
    await firstValueFrom(this.api.deleteProduct(p.id));
    this.products.reload();
  }
}
