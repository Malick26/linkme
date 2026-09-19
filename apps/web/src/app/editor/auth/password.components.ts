import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { BrandLogoComponent } from '../../../design-system';
import { MeApi } from '../../core/api/me-api.service';
import { AuthStore } from '../../core/auth/auth.store';
import { toProblem } from '../../core/http/problem';
import { I18n, TPipe } from '../../core/i18n/i18n.service';

@Component({
  selector: 'app-forgot',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, TPipe, BrandLogoComponent],
  template: `
    <main class="au">
      <div class="au__card ed-card">
        <div class="au__logo"><lm-brand-logo /></div>
        <h1 class="au__title">{{ 'auth.forgot.title' | t }}</h1>
        <p class="ed-muted au__sub">{{ 'auth.forgot.text' | t }}</p>
        @if (sent()) {
          <p class="ed-success" role="status">{{ 'auth.forgot.sent' | t }}</p>
        } @else {
          <form class="au__form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
            <label class="ed-field"><span>{{ 'auth.field.email' | t }}</span><input formControlName="email" type="email" autocomplete="email" required /></label>
            @if (error()) {
              <p class="ed-error" role="alert">{{ error() }}</p>
            }
            <button class="ed-btn ed-btn--primary" type="submit" [disabled]="busy()">{{ 'auth.forgot.submit' | t }}</button>
          </form>
        }
        <div class="au__links"><a routerLink="/login">{{ 'auth.backToLogin' | t }}</a></div>
      </div>
    </main>
  `,
  styleUrl: './auth-layout.scss',
})
export class ForgotComponent {
  private readonly api = inject(MeApi);
  private readonly auth = inject(AuthStore);
  private readonly i18n = inject(I18n);
  protected readonly busy = signal(false);
  protected readonly sent = signal(false);
  protected readonly error = signal('');
  protected readonly form = inject(FormBuilder).nonNullable.group({ email: ['', [Validators.required, Validators.email]] });

  protected async submit(): Promise<void> {
    if (this.form.invalid) return this.error.set(this.i18n.t('error.VALIDATION'));
    this.busy.set(true);
    try {
      await this.auth.ensureCsrf();
      await firstValueFrom(this.api.forgot(this.form.getRawValue().email));
      this.sent.set(true);
    } catch (e) {
      this.error.set(this.i18n.error(toProblem(e).code));
    } finally {
      this.busy.set(false);
    }
  }
}

@Component({
  selector: 'app-reset',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, TPipe, BrandLogoComponent],
  template: `
    <main class="au">
      <div class="au__card ed-card">
        <div class="au__logo"><lm-brand-logo /></div>
        <h1 class="au__title">{{ 'auth.reset.title' | t }}</h1>
        @if (done()) {
          <p class="ed-success" role="status">{{ 'auth.reset.done' | t }}</p>
        } @else {
          <form class="au__form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
            <label class="ed-field"><span>{{ 'auth.field.password' | t }} <small>{{ 'auth.field.passwordHint' | t }}</small></span><input formControlName="password" type="password" autocomplete="new-password" minlength="10" required /></label>
            @if (error()) {
              <p class="ed-error" role="alert">{{ error() }}</p>
            }
            <button class="ed-btn ed-btn--primary" type="submit" [disabled]="busy()">{{ 'auth.reset.submit' | t }}</button>
          </form>
        }
        <div class="au__links"><a routerLink="/login">{{ 'auth.backToLogin' | t }}</a></div>
      </div>
    </main>
  `,
  styleUrl: './auth-layout.scss',
})
export class ResetComponent {
  readonly token = input<string>('');
  private readonly api = inject(MeApi);
  private readonly auth = inject(AuthStore);
  private readonly i18n = inject(I18n);
  protected readonly busy = signal(false);
  protected readonly done = signal(false);
  protected readonly error = signal('');
  protected readonly form = inject(FormBuilder).nonNullable.group({ password: ['', [Validators.required, Validators.minLength(10)]] });

  protected async submit(): Promise<void> {
    if (this.form.invalid) return this.error.set(this.i18n.t('auth.field.passwordHint'));
    this.busy.set(true);
    try {
      await this.auth.ensureCsrf();
      await firstValueFrom(this.api.reset(this.token(), this.form.getRawValue().password));
      this.done.set(true);
    } catch (e) {
      this.error.set(this.i18n.error(toProblem(e).code));
    } finally {
      this.busy.set(false);
    }
  }
}
