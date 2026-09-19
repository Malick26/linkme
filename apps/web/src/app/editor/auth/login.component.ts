import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BrandLogoComponent } from '../../../design-system';
import { AuthStore } from '../../core/auth/auth.store';
import { toProblem } from '../../core/http/problem';
import { I18n, TPipe } from '../../core/i18n/i18n.service';

@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, TPipe, BrandLogoComponent],
  template: `
    <main class="au">
      <div class="au__card ed-card">
        <div class="au__logo"><lm-brand-logo /></div>
        <h1 class="au__title">{{ 'auth.login.title' | t }}</h1>
        <p class="ed-muted au__sub">{{ 'auth.login.subtitle' | t }}</p>
        <form class="au__form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <label class="ed-field"><span>{{ 'auth.field.email' | t }}</span><input formControlName="email" type="email" autocomplete="email" required /></label>
          <label class="ed-field"><span>{{ 'auth.field.password' | t }}</span><input formControlName="password" type="password" autocomplete="current-password" required /></label>
          @if (error()) {
            <p class="ed-error" role="alert">{{ error() }}</p>
          }
          <button class="ed-btn ed-btn--primary" type="submit" [disabled]="busy()">{{ 'auth.login.submit' | t }}</button>
        </form>
        <div class="au__links">
          <a routerLink="/forgot">{{ 'auth.login.forgot' | t }}</a>
          <a routerLink="/register">{{ 'auth.login.noAccount' | t }} {{ 'site.hero.cta' | t }}</a>
        </div>
      </div>
    </main>
  `,
  styleUrl: './auth-layout.scss',
})
export class LoginComponent {
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly i18n = inject(I18n);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  protected async submit(): Promise<void> {
    if (this.form.invalid) return this.error.set(this.i18n.t('error.VALIDATION'));
    this.busy.set(true);
    this.error.set('');
    try {
      const me = await this.auth.login(this.form.getRawValue());
      const next = this.route.snapshot.queryParamMap.get('next');
      await this.router.navigateByUrl(next?.startsWith('/app') ? next : me.onboardingCompleted ? '/app' : '/app/onboarding');
    } catch (e) {
      this.error.set(this.i18n.error(toProblem(e).code));
    } finally {
      this.busy.set(false);
    }
  }
}
