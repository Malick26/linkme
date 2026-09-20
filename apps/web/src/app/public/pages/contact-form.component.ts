import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { GlassCardComponent, IconComponent } from '../../../design-system';
import type { Block } from '../../core/api/types';
import { PublicApi } from '../../core/api/public-api.service';
import { toProblem } from '../../core/http/problem';
import { I18n, TPipe } from '../../core/i18n/i18n.service';
import { normalizePhone, phoneValidator } from './contact-phone';

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
        <label class="f">
          <span>{{ 'contact.name' | t }}</span>
          <input formControlName="name" autocomplete="name" maxlength="80" [attr.aria-invalid]="shows('name') || null" [attr.aria-describedby]="shows('name') ? 'cf-e-name' : null" />
          @if (shows('name')) {
            <small class="cf__fe" id="cf-e-name">{{ 'contact.err.name' | t }}</small>
          }
        </label>
        <p class="cf__hint">{{ 'contact.hintContact' | t }}</p>
        <div class="f2">
          <label class="f">
            <span>{{ 'contact.email' | t }}</span>
            <input formControlName="email" type="email" autocomplete="email" maxlength="254" [attr.aria-invalid]="shows('email') || null" [attr.aria-describedby]="shows('email') ? 'cf-e-email' : null" />
            @if (shows('email')) {
              <small class="cf__fe" id="cf-e-email">{{ 'contact.err.email' | t }}</small>
            }
          </label>
          <label class="f">
            <span>{{ 'contact.phone' | t }}</span>
            <input formControlName="phone" type="tel" autocomplete="tel" maxlength="24" inputmode="tel" [attr.aria-invalid]="shows('phone') || null" [attr.aria-describedby]="shows('phone') ? 'cf-e-phone' : null" />
            @if (shows('phone')) {
              <small class="cf__fe" id="cf-e-phone">{{ 'contact.err.phone' | t }}</small>
            }
          </label>
        </div>
        <label class="f">
          <span>{{ 'contact.message' | t }}</span>
          <textarea formControlName="message" rows="5" maxlength="2000" [attr.aria-invalid]="shows('message') || null" [attr.aria-describedby]="shows('message') ? 'cf-e-message' : null"></textarea>
          @if (shows('message')) {
            <small class="cf__fe" id="cf-e-message">{{ 'contact.err.message' | t }}</small>
          }
        </label>
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
    .cf__fe { color: var(--lm-accent); font-size: 13px; }
    .cf__hint { margin: -6px 0 0; font-size: 13px; color: var(--lm-text-muted); }
    input[aria-invalid='true'], textarea[aria-invalid='true'] { border-color: var(--lm-accent); }
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
  protected readonly submitted = signal(false);
  protected readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(80)]],
    email: ['', [Validators.email, Validators.maxLength(254)]],
    // on accepte la façon dont les gens écrivent vraiment un numéro (espaces, points, tirets, parenthèses)
    phone: ['', [phoneValidator]],
    message: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(2000)]],
    website: [''],
  });
  protected readonly digits = (s: string) => s.replace(/\D/g, '');

  /** Message d'erreur sous un champ : seulement après une tentative d'envoi ou une sortie du champ. */
  protected shows(name: 'name' | 'email' | 'phone' | 'message'): boolean {
    const c = this.form.controls[name];
    return c.invalid && (this.submitted() || c.touched);
  }

  protected submit(): void {
    this.error.set('');
    this.submitted.set(true);
    const v = this.form.getRawValue();
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      // l'erreur précise est affichée sous le champ concerné ; on ne répète pas un message générique
      return;
    }
    if (!v.email.trim() && !v.phone.trim()) return this.error.set(this.i18n.t('contact.emailOrPhone'));
    this.sending.set(true);
    this.api
      .contact(this.handle(), { name: v.name.trim(), email: v.email.trim() || undefined, phone: normalizePhone(v.phone) || undefined, message: v.message.trim(), website: v.website || undefined })
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
