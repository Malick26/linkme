import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { IconComponent } from '../../../design-system';
import { MeApi } from '../../core/api/me-api.service';
import type { AssetKind, Image } from '../../core/api/types';
import { AuthStore } from '../../core/auth/auth.store';
import { toProblem } from '../../core/http/problem';
import { imageUrl } from '../../core/images/image-url';
import { I18n, TPipe } from '../../core/i18n/i18n.service';

const MAX_BYTES = 8 * 1024 * 1024;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Import d'image : upload signé direct vers Cloudinary (D8) si configuré, sinon upload local (dev).
 * Contrôles côté client (type, poids) doublés côté serveur.
 */
@Component({
  selector: 'ed-image-upload',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, TPipe],
  template: `
    <div class="up" [class.up--wide]="wide()">
      @if (src()) {
        <img class="up__img" [src]="src()" [alt]="label()" />
      } @else {
        <div class="up__empty"><lm-icon name="image" [size]="28" /></div>
      }
      <div class="up__actions">
        <label class="up__btn">
          <input type="file" accept="image/jpeg,image/png,image/webp" (change)="pick($event)" [disabled]="busy()" [attr.aria-label]="label()" />
          <lm-icon name="upload" [size]="18" />
          {{ (busy() ? 'ed.uploading' : value() ? 'ed.replace' : 'ed.upload') | t }}
        </label>
        @if (value() && removable()) {
          <button type="button" class="up__btn up__btn--ghost" (click)="changed.emit(null)">{{ 'ed.remove' | t }}</button>
        }
      </div>
      @if (error()) {
        <p class="up__err" role="alert">{{ error() }}</p>
      }
    </div>
  `,
  styles: `
    .up { display: grid; grid-template-columns: 96px 1fr; gap: 12px; align-items: center; }
    .up--wide { grid-template-columns: 1fr; }
    .up__img, .up__empty { width: 96px; height: 96px; border-radius: 12px; object-fit: cover; background: var(--ed-bg); border: 1px solid var(--ed-border); }
    .up--wide .up__img, .up--wide .up__empty { width: 100%; height: 180px; }
    .up__empty { display: grid; place-items: center; color: var(--ed-muted); }
    .up__actions { display: flex; gap: 8px; flex-wrap: wrap; }
    .up__btn { position: relative; display: inline-flex; align-items: center; gap: 8px; min-height: 44px; padding: 0 14px; border-radius: 999px; border: 1px solid var(--ed-border); background: var(--ed-panel-2); color: var(--ed-text); font-size: 14px; font-weight: 600; cursor: pointer; }
    .up__btn--ghost { background: transparent; }
    .up__btn input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
    .up__btn:focus-within { outline: 2px solid var(--ed-accent); outline-offset: 2px; }
    .up__err { grid-column: 1 / -1; margin: 0; color: var(--ed-danger); font-size: 13px; }
  `,
})
export class ImageUploadComponent {
  readonly kind = input.required<AssetKind>();
  readonly value = input<string | null | undefined>(null);
  readonly image = input<Image | null | undefined>(null);
  readonly label = input('');
  readonly wide = input(false);
  readonly removable = input(true);
  readonly changed = output<string | null>();
  readonly uploaded = output<Image>();
  private readonly api = inject(MeApi);
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthStore);
  private readonly i18n = inject(I18n);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  private readonly localPreview = signal<string | null>(null);
  protected readonly src = computed(() => this.localPreview() ?? imageUrl(this.image(), 480));

  protected async pick(e: Event): Promise<void> {
    const inputEl = e.target as HTMLInputElement;
    const file = inputEl.files?.[0];
    inputEl.value = '';
    if (!file) return;
    this.error.set('');
    if (!TYPES.includes(file.type)) return this.error.set(this.i18n.t('error.UPLOAD_TYPE'));
    if (file.size > MAX_BYTES) return this.error.set(this.i18n.t('error.UPLOAD_TOO_LARGE'));
    this.busy.set(true);
    this.localPreview.set(URL.createObjectURL(file));
    try {
      await this.auth.ensureCsrf();
      const img = await this.upload(file);
      this.uploaded.emit(img);
      this.changed.emit(img.id);
    } catch (err) {
      this.error.set(this.i18n.error(toProblem(err).code));
      this.localPreview.set(null);
    } finally {
      this.busy.set(false);
    }
  }

  private async upload(file: File): Promise<Image> {
    let sig;
    try {
      sig = await firstValueFrom(this.api.signUpload(this.kind()));
    } catch (e) {
      if (toProblem(e).status === 503) return firstValueFrom(this.api.uploadLocal(file, this.kind()));
      throw e;
    }
    // upload direct navigateur → Cloudinary (le secret ne quitte jamais le serveur)
    const fd = new FormData();
    fd.append('file', file);
    fd.append('api_key', sig.apiKey);
    fd.append('timestamp', String(sig.timestamp));
    fd.append('signature', sig.signature);
    fd.append('folder', sig.folder);
    fd.append('allowed_formats', sig.allowedFormats);
    const r = await firstValueFrom(
      this.http.post<{ public_id: string; version: number; signature: string; width: number; height: number; format: string; bytes: number }>(sig.uploadUrl, fd, { withCredentials: false }),
    );
    return firstValueFrom(
      this.api.completeUpload({ kind: this.kind(), publicId: r.public_id, version: r.version, signature: r.signature, width: r.width, height: r.height, format: r.format, bytes: r.bytes }),
    );
  }
}
