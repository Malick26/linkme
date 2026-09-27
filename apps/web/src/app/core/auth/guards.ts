import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthStore } from './auth.store';

export const authGuard: CanActivateFn = (_route, state) => {
  const router = inject(Router);
  return inject(AuthStore).load().pipe(map((m) => (m ? true : router.createUrlTree(['/login'], { queryParams: { next: state.url } }))));
};

export const guestGuard: CanActivateFn = () => {
  const router = inject(Router);
  return inject(AuthStore).load().pipe(map((m) => (m ? router.createUrlTree(['/app']) : true)));
};

/** Espace admin (D56) : seuls les comptes listés dans ADMIN_EMAILS (le serveur refuse de toute façon /api/admin/**). */
export const adminGuard: CanActivateFn = () => {
  const router = inject(Router);
  return inject(AuthStore).load().pipe(map((m) => (m?.admin ? true : router.createUrlTree(['/app']))));
};

/** Redirige vers l'assistant tant que l'onboarding n'est pas terminé. */
export const onboardingDoneGuard: CanActivateFn = () => {
  const router = inject(Router);
  return inject(AuthStore).load().pipe(map((m) => (m && !m.onboardingCompleted ? router.createUrlTree(['/app/onboarding']) : true)));
};
