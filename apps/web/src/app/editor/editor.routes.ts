import { Routes } from '@angular/router';

/** Back-office — implémenté en Phase 2. */
export const EDITOR_ROUTES: Routes = [
  { path: 'login', loadComponent: () => import('./placeholder.component').then((m) => m.PlaceholderComponent) },
  { path: 'register', loadComponent: () => import('./placeholder.component').then((m) => m.PlaceholderComponent) },
  { path: 'forgot', loadComponent: () => import('./placeholder.component').then((m) => m.PlaceholderComponent) },
  { path: 'reset', loadComponent: () => import('./placeholder.component').then((m) => m.PlaceholderComponent) },
  { path: 'app', loadComponent: () => import('./placeholder.component').then((m) => m.PlaceholderComponent) },
];
