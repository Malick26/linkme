import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, filter, switchMap } from 'rxjs';
import { BrandLogoComponent } from '../../../design-system';
import { MeApi } from '../../core/api/me-api.service';
import { AuthStore } from '../../core/auth/auth.store';
import { toProblem } from '../../core/http/problem';
import type { I18nKey } from '../../core/i18n/fr';
import { I18n, TPipe } from '../../core/i18n/i18n.service';

@Component({
  selector: 'app-register',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, TPipe, BrandLogoComponent],
  template: `
    <main class="au">
      <div class="au__card ed-card">
        <div class="au__logo"><lm-brand-logo /></div>
        <h1 class="au__title">{{ 'auth.register.title' | t }}</h1>
        <p class="ed-muted au__sub">{{ 'auth.register.subtitle' | t }}</p>
        <form class="au__form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <label class="ed-field"><span>{{ 'auth.field.displayName' | t }}</span><input formControlName="displayName" autocomplete="name" maxlength="60" required /></label>
          <label class="ed-field">
            <span>{{ 'auth.field.handle' | t }} @if (handleState(); as s) { <b [class.ed-success]="s === 'available'" [class.ed-error]="s !== 'available'">{{ stateKey(s) | t }}</b> }</span>
            <div class="au__prefix"><span>{{ host }}/</span><input formControlName="handle" autocapitalize="none" autocomplete="off" spellcheck="false" maxlength="30" required /></div>
          </label>
          <label class="ed-field"><span>{{ 'auth.field.email' | t }}</span><input formControlName="email" type="email" autocomplete="email" required /></label>
          <label class="ed-field"><span>{{ 'auth.field.password' | t }} <small>{{ 'auth.field.passwordHint' | t }}</small></span><input formControlName="password" type="password" autocomplete="new-password" minlength="10" required /></label>
          <label class="ed-switch"><input type="checkbox" formControlName="acceptTerms" /> <span>{{ 'auth.register.terms' | t }} (<a routerLink="/legal/cgu" target="_blank">CGU</a>)</span></label>
          @if (error()) {
            <p class="ed-error" role="alert">{{ error() }}</p>
          }
          <button class="ed-btn ed-btn--primary" type="submit" [disabled]="busy()">{{ 'auth.register.submit' | t }}</button>
        </form>
        <div class="au__links"><a routerLink="/login">{{ 'auth.register.hasAccount' | t }} {{ 'auth.login.submit' | t }}</a></div>
      </div>
    </main>
  `,
  styleUrl: './auth-layout.scss',
})
export class RegisterComponent {
  private readonly auth = inject(AuthStore);
  private readonly api = inject(MeApi);
  private readonly router = inject(Router);
  private readonly i18n = inject(I18n);
  protected readonly host = typeof location !== 'undefined' ? location.host : 'linkme.sn';
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly handleState = signal<'available' | 'taken' | 'reserved' | 'invalid' | null>(null);
  protected readonly form = inject(FormBuilder).nonNullable.group({
    displayName: ['', [Validators.required, Validators.maxLength(60)]],
    handle: ['', [Validators.required, Validators.pattern(/^[a-z0-9._-]{3,30}$/)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(10)]],
    acceptTerms: [false, [Validators.requiredTrue]],
  });

  constructor() {
    const c = this.form.controls;
    // suggestion du handle depuis le nom
    c.displayName.valueChanges.pipe(takeUntilDestroyed()).subscribe((v) => {
      if (!c.handle.dirty) c.handle.setValue(v.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/[^a-z0-9]+/g, '').slice(0, 30));
    });
    c.handle.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        filter((h) => {
          const ok = /^[a-z0-9._-]{3,30}$/.test(h);
          if (!ok) this.handleState.set(h ? 'invalid' : null);
          return ok;
        }),
        switchMap((h) => this.api.handleAvailability(h)),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe((r) => this.handleState.set(r.available ? 'available' : (r.reason ?? 'taken')));
  }

  protected stateKey(s: 'available' | 'taken' | 'reserved' | 'invalid'): I18nKey {
    return `auth.handle.${s}` as I18nKey;
  }

  protected async submit(): Promise<void> {
    this.form.controls.handle.setValue(this.form.controls.handle.value.toLowerCase().trim());
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return this.error.set(this.i18n.t(this.form.controls.handle.invalid ? 'auth.handle.invalid' : 'error.VALIDATION'));
    }
    this.busy.set(true);
    this.error.set('');
    try {
      const v = this.form.getRawValue();
      await this.auth.register({ ...v, acceptTerms: true });
      await this.router.navigateByUrl('/app/onboarding');
    } catch (e) {
      this.error.set(this.i18n.error(toProblem(e).code));
    } finally {
      this.busy.set(false);
    }
  }
}
