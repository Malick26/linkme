import { Routes } from '@angular/router';
import { PUBLIC_ROUTES } from './public/public.routes';

export const routes: Routes = [
  { path: '', pathMatch: 'full', loadComponent: () => import('./site/landing.component').then((m) => m.LandingComponent) },
  { path: 'legal', loadChildren: () => import('./site/legal.routes').then((m) => m.LEGAL_ROUTES) },
  // Back-office (chargé en différé : jamais dans le bundle de la page publique)
  { path: '', loadChildren: () => import('./editor/editor.routes').then((m) => m.EDITOR_ROUTES) },
  ...PUBLIC_ROUTES,
];
