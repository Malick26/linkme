import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { IconComponent } from '../../../design-system';
import { MeApi } from '../../core/api/me-api.service';
import type { Audio } from '../../core/api/types';
import { AuthStore } from '../../core/auth/auth.store';
import { toProblem } from '../../core/http/problem';
import { I18n, TPipe } from '../../core/i18n/i18n.service';

const MAX_BYTES = 15 * 1024 * 1024;
const TYPES = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/x-m4a', 'audio/ogg'];

/**
 * Import de son (item de bloc « sons », D50) : alternative à un lien Deezer/YouTube. Même schéma d'upload signé
 * que les images (`ed-image-upload`), mais sans dimensions et servi par le fournisseur « video » de Cloudinary.
 */
@Component({
  selector: 'ed-audio-upload',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, TPipe],
  template: `
    <div class="up">
      @if (sound()) {
        <audio class="up__player" controls preload="none" [src]="sound()!.url"></audio>
      }
      <div class="up__actions">
        <label class="up__btn">
          <input type="file" accept="audio/mpeg,audio/mp3,audio/wav,audio/mp4,audio/x-m4a,audio/ogg" (change)="pick($event)" [disabled]="busy()" [attr.aria-label]="label()" />
          <lm-icon name="upload" [size]="18" />
          {{ (busy() ? 'ed.uploading' : value() ? 'ed.replace' : 'ed.uploadSound') | t }}
        </label>
        @if (value()) {
          <button type="button" class="up__btn up__btn--ghost" (click)="changed.emit(null)">{{ 'ed.remove' | t }}</button>
        }
      </div>
      @if (error()) {
        <p class="up__err" role="alert">{{ error() }}</p>
      }
    </div>
  `,
  styles: `
    .up { display: flex; flex-direction: column; gap: 8px; }
    .up__player { width: 100%; height: 40px; }
    .up__actions { display: flex; gap: 8px; flex-wrap: wrap; }
    .up__btn { position: relative; display: inline-flex; align-items: center; gap: 8px; min-height: 44px; padding: 0 14px; border-radius: 999px; border: 1px solid var(--ed-border); background: var(--ed-panel-2); color: var(--ed-text); font-size: 14px; font-weight: 600; cursor: pointer; }
    .up__btn--ghost { background: transparent; }
    .up__btn input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
    .up__btn:focus-within { outline: 2px solid var(--ed-accent); outline-offset: 2px; }
    .up__err { margin: 0; color: var(--ed-danger); font-size: 13px; }
  `,
})
export class AudioUploadComponent {
  readonly value = input<string | null | undefined>(null);
  readonly sound = input<Audio | null | undefined>(null);
  readonly label = input('');
  readonly changed = output<string | null>();
  readonly uploaded = output<Audio>();
  private readonly api = inject(MeApi);
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthStore);
  private readonly i18n = inject(I18n);
  protected readonly busy = signal(false);
  protected readonly error = signal('');

  protected async pick(e: Event): Promise<void> {
    const inputEl = e.target as HTMLInputElement;
    const file = inputEl.files?.[0];
    inputEl.value = '';
    if (!file) return;
    this.error.set('');
    if (!TYPES.includes(file.type)) return this.error.set(this.i18n.t('error.UPLOAD_TYPE_AUDIO'));
    if (file.size > MAX_BYTES) return this.error.set(this.i18n.t('error.UPLOAD_TOO_LARGE_AUDIO'));
    this.busy.set(true);
    try {
      await this.auth.ensureCsrf();
      const a = await this.upload(file);
      this.uploaded.emit(a);
      this.changed.emit(a.id);
    } catch (err) {
      this.error.set(this.i18n.error(toProblem(err).code));
    } finally {
      this.busy.set(false);
    }
  }

  private async upload(file: File): Promise<Audio> {
    let sig;
    try {
      sig = await firstValueFrom(this.api.signAudioUpload());
    } catch (e) {
      if (toProblem(e).status === 503) return firstValueFrom(this.api.uploadLocalAudio(file));
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
      this.http.post<{ public_id: string; version: number; signature: string; format: string; bytes: number }>(sig.uploadUrl, fd, { withCredentials: false }),
    );
    return firstValueFrom(
      this.api.completeAudioUpload({ publicId: r.public_id, version: r.version, signature: r.signature, format: r.format, bytes: r.bytes }),
    );
  }
}
