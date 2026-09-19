import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, firstValueFrom, map, of, tap } from 'rxjs';
import { MeApi } from '../api/me-api.service';
import type { LoginRequest, Me, RegisterRequest } from '../api/types';

/** Session du créateur (cookie httpOnly côté serveur ; ici on ne garde que le profil courant). */
@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly api = inject(MeApi);
  private readonly router = inject(Router);
  readonly me = signal<Me | null>(null);
  private loaded = false;
  private csrfReady: Promise<unknown> | null = null;

  /** Pose le cookie XSRF-TOKEN une fois par session d'onglet. */
  ensureCsrf(): Promise<unknown> {
    return (this.csrfReady ??= firstValueFrom(this.api.csrf()).catch(() => undefined));
  }

  load(force = false): Observable<Me | null> {
    if (this.loaded && !force) return of(this.me());
    return this.api.me().pipe(
      tap((m) => {
        this.me.set(m);
        this.loaded = true;
      }),
      catchError(() => {
        this.me.set(null);
        this.loaded = true;
        return of(null);
      }),
    );
  }

  async login(body: LoginRequest): Promise<Me> {
    await this.ensureCsrf();
    const m = await firstValueFrom(this.api.login(body));
    this.me.set(m);
    this.loaded = true;
    this.csrfReady = null; // nouvelle session → nouveau jeton
    return m;
  }

  async register(body: RegisterRequest): Promise<Me> {
    await this.ensureCsrf();
    const m = await firstValueFrom(this.api.register(body));
    this.me.set(m);
    this.loaded = true;
    this.csrfReady = null;
    return m;
  }

  async logout(): Promise<void> {
    await this.ensureCsrf();
    await firstValueFrom(this.api.logout()).catch(() => undefined);
    this.me.set(null);
    this.csrfReady = null;
    await this.router.navigateByUrl('/login');
  }

  patch(p: Partial<Me>): void {
    const m = this.me();
    if (m) this.me.set({ ...m, ...p });
  }

  isLoggedIn(): Observable<boolean> {
    return this.load().pipe(map((m) => !!m));
  }
}
