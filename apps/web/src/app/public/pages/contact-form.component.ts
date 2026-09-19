import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { GlassCardComponent, IconComponent } from '../../../design-system';
import type { Block } from '../../core/api/types';
import { PublicApi } from '../../core/api/public-api.service';
import { toProblem } from '../../core/http/problem';
import { I18n, TPipe } from '../../core/i18n/i18n.service';

/** Bloc Contact : formulaire (nom, email/téléphone, message) + boutons WhatsApp / Email / Appel (brief §5.5). */
@Component({
  selector: 'app-contact-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, GlassCardComponent, IconComponent, TPipe],
  template: `
    @let c = config();
    @if (c.whatsapp || c.email || c.phone) {
      <div class="quick">
        @if (c.whatsapp) {
          <a class="quick__btn" [href]="'https://wa.me/' + digits(c.whatsapp)" target="_blank" rel="noopener noreferrer"><lm-icon name="brand-whatsapp" [size]="20" />{{ 'contact.whatsapp' | t }}</a>
        }
        @if (c.email) {
          <a class="quick__btn" [href]="'mailto:' + c.email"><lm-icon name="mail" [size]="20" />{{ 'contact.mail' | t }}</a>
        }
        @if (c.phone) {
          <a class="quick__btn" [href]="'tel:' + c.phone"><lm-icon name="phone" [size]="20" />{{ 'contact.call' | t }}</a>
        }
      </div>
    }
    <form lmGlassCard class="cf" [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <h2 class="cf__title">{{ 'contact.title' | t }}</h2>
      @if (sent()) {
        <p class="cf__ok" role="status">{{ 'contact.sent' | t }}</p>
      } @else {
        <label class="f"><span>{{ 'contact.name' | t }}</span><input formControlName="name" autocomplete="name" maxlength="80" required /></label>
        <div class="f2">
          <label class="f"><span>{{ 'contact.email' | t }}</span><input formControlName="email" type="email" autocomplete="email" maxlength="254" /></label>
          <label class="f"><span>{{ 'contact.phone' | t }}</span><input formControlName="phone" type="tel" autocomplete="tel" maxlength="20" inputmode="tel" /></label>
        </div>
        <label class="f"><span>{{ 'contact.message' | t }}</span><textarea formControlName="message" rows="5" maxlength="2000" required></textarea></label>
        <input class="hp" formControlName="website" tabindex="-1" autocomplete="off" aria-hidden="true" />
        @if (error()) {
          <p class="cf__err" role="alert">{{ error() }}</p>
        }
        <button class="cf__submit" type="submit" [disabled]="sending()">{{ (sending() ? 'contact.sending' : 'contact.send') | t }}</button>
      }
    </form>
  `,
  styles: `
    .quick { display: grid; grid-template-columns: repeat(auto-fit, minmax(96px, 1fr)); gap: 10px; margin-top: 22px; }
    .quick__btn {
      display: flex; align-items: center; justify-content: center; gap: 8px; min-height: 52px; border-radius: 999px;
      color: var(--lm-text); text-decoration: none; font-weight: 500; background: var(--lm-control-bg); border: 1px solid var(--lm-card-border);
      -webkit-backdrop-filter: blur(14px); backdrop-filter: blur(14px);
    }
    .quick__btn:focus-visible, .cf__submit:focus-visible { outline: none; box-shadow: var(--lm-focus-ring); }
    .cf { margin-top: 16px; padding: 20px; display: flex; flex-direction: column; gap: 14px; }
    .cf__title { margin: 0; font-size: 18px; font-weight: 600; }
    .f { display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: var(--lm-text-muted); min-width: 0; }
    .f2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 14px; }
    input, textarea {
      width: 100%; min-height: 48px; padding: 12px 14px; border-radius: 14px; font-size: 16px; color: var(--lm-text);
      background: var(--lm-control-bg); border: 1px solid var(--lm-control-border);
    }
    input:focus-visible, textarea:focus-visible { outline: none; box-shadow: var(--lm-focus-ring); }
    textarea { resize: vertical; }
    .hp { position: absolute; left: -9999px; width: 1px; height: 1px; opacity: 0; }
    .cf__submit { min-height: 52px; border: 0; border-radius: 999px; font-weight: 600; font-size: 16px; cursor: pointer; background: var(--lm-accent); color: var(--lm-overlay); }
    .cf__submit[disabled] { opacity: .6; cursor: progress; }
    .cf__err { margin: 0; color: var(--lm-accent); font-size: 14px; }
    .cf__ok { margin: 0; font-size: 15px; }
  `,
})
export class ContactFormComponent {
  readonly handle = input.required<string>();
  readonly config = input.required<NonNullable<Block['config']>>();
  private readonly api = inject(PublicApi);
  private readonly i18n = inject(I18n);
  protected readonly sending = signal(false);
  protected readonly sent = signal(false);
  protected readonly error = signal('');
  protected readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(80)]],
    email: ['', [Validators.email, Validators.maxLength(254)]],
    phone: ['', [Validators.pattern(/^\+?[0-9 ]{8,20}$/)]],
    message: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(2000)]],
    website: [''],
  });
  protected readonly digits = (s: string) => s.replace(/\D/g, '');

  protected submit(): void {
    this.error.set('');
    const v = this.form.getRawValue();
    if (!v.email && !v.phone) return this.error.set(this.i18n.t('contact.emailOrPhone'));
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return this.error.set(this.i18n.t('error.VALIDATION'));
    }
    this.sending.set(true);
    this.api
      .contact(this.handle(), { name: v.name.trim(), email: v.email || undefined, phone: v.phone || undefined, message: v.message.trim(), website: v.website || undefined })
      .subscribe({
        next: () => {
          this.sending.set(false);
          this.sent.set(true);
        },
        error: (e) => {
          this.sending.set(false);
          this.error.set(this.i18n.error(toProblem(e).code));
        },
      });
  }
}
