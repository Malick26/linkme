import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { MeApi } from '../../core/api/me-api.service';
import { AuthStore } from '../../core/auth/auth.store';
import { toProblem } from '../../core/http/problem';
import { I18n, TPipe } from '../../core/i18n/i18n.service';

/** Réglages : compte, déconnexion, suppression de compte (loi 2008-12), liens légaux. */
@Component({
  selector: 'app-settings-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TPipe, RouterLink],
  template: `
    <div class="ed-page ed-stack">
      <h1>{{ 'settings.title' | t }}</h1>
      <section class="ed-card ed-stack">
        <h2>{{ 'settings.account' | t }}</h2>
        <p class="ed-muted">{{ auth.me()?.email }} · /{{ auth.me()?.handle }}</p>
        <button type="button" class="ed-btn" (click)="auth.logout()">{{ 'nav.logout' | t }}</button>
      </section>
      <section class="ed-card ed-stack">
        <h2>{{ 'settings.legal' | t }}</h2>
        <div class="ed-row">
          <a class="ed-btn" routerLink="/legal/mentions">{{ 'site.footer.legal' | t }}</a>
          <a class="ed-btn" routerLink="/legal/confidentialite">{{ 'site.footer.privacy' | t }}</a>
          <a class="ed-btn" routerLink="/legal/cgu">{{ 'site.footer.terms' | t }}</a>
        </div>
      </section>
      <section class="ed-card ed-stack danger">
        <h2>{{ 'settings.delete' | t }}</h2>
        <p class="ed-muted">{{ 'settings.deleteText' | t }}</p>
        <label class="ed-field"><span>{{ 'settings.deleteConfirm' | t }}</span><input type="password" autocomplete="current-password" [value]="pwd()" (input)="pwd.set($any($event.target).value)" /></label>
        @if (error()) { <p class="ed-error" role="alert">{{ error() }}</p> }
        <button type="button" class="ed-btn ed-btn--danger" [disabled]="!pwd() || busy()" (click)="del()">{{ 'settings.delete' | t }}</button>
      </section>
    </div>
  `,
  styles: `
    @use 'editor' as ed;
    @include ed.base;
    .danger { border-color: var(--ed-danger); }
  `,
})
export class SettingsPageComponent {
  protected readonly auth = inject(AuthStore);
  private readonly api = inject(MeApi);
  private readonly router = inject(Router);
  private readonly i18n = inject(I18n);
  protected readonly pwd = signal('');
  protected readonly busy = signal(false);
  protected readonly error = signal('');

  protected async del(): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    try {
      await this.auth.ensureCsrf();
      await firstValueFrom(this.api.deleteAccount(this.pwd()));
      this.auth.me.set(null);
      await this.router.navigateByUrl('/');
    } catch (e) {
      this.error.set(this.i18n.error(toProblem(e).code));
    } finally {
      this.busy.set(false);
    }
  }
}
