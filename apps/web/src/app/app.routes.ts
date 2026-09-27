import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { PUBLIC_ROUTES } from './public/public.routes';

export const routes: Routes = [
  { path: '', pathMatch: 'full', loadComponent: () => import('./site/landing.component').then((m) => m.LandingComponent) },
  // Lien de parrainage court (D53) : /r/CODE → inscription avec le code pré-rempli
  { path: 'r/:code', redirectTo: ({ params }) => inject(Router).createUrlTree(['/register'], { queryParams: { ref: params['code'] } }) },
  { path: 'legal', loadChildren: () => import('./site/legal.routes').then((m) => m.LEGAL_ROUTES) },
  // Back-office (chargé en différé : jamais dans le bundle de la page publique)
  { path: '', loadChildren: () => import('./editor/editor.routes').then((m) => m.EDITOR_ROUTES) },
  ...PUBLIC_ROUTES,
];
