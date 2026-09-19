import { Routes } from '@angular/router';
import { authGuard, guestGuard, onboardingDoneGuard } from '../core/auth/guards';

/** Back-office — chargé en différé (jamais dans le bundle de la page publique). */
export const EDITOR_ROUTES: Routes = [
  { path: 'login', canActivate: [guestGuard], loadComponent: () => import('./auth/login.component').then((m) => m.LoginComponent) },
  { path: 'register', canActivate: [guestGuard], loadComponent: () => import('./auth/register.component').then((m) => m.RegisterComponent) },
  { path: 'forgot', loadComponent: () => import('./auth/password.components').then((m) => m.ForgotComponent) },
  { path: 'reset', loadComponent: () => import('./auth/password.components').then((m) => m.ResetComponent) },
  {
    path: 'app',
    canActivate: [authGuard],
    loadComponent: () => import('./shell/editor-shell.component').then((m) => m.EditorShellComponent),
    children: [
      { path: 'onboarding', loadComponent: () => import('./onboarding/onboarding.component').then((m) => m.OnboardingComponent) },
      { path: '', pathMatch: 'full', canActivate: [onboardingDoneGuard], loadComponent: () => import('./dashboard/dashboard.component').then((m) => m.DashboardComponent) },
      { path: 'profile', loadComponent: () => import('./profile/profile-page.component').then((m) => m.ProfilePageComponent) },
      { path: 'blocks', loadComponent: () => import('./blocks/blocks-page.component').then((m) => m.BlocksPageComponent) },
      { path: 'design', loadComponent: () => import('./theme/theme-editor.component').then((m) => m.ThemeEditorComponent) },
      { path: 'shop', loadComponent: () => import('./shop/shop-page.component').then((m) => m.ShopPageComponent) },
      { path: 'sales', loadComponent: () => import('./sales/sales-page.component').then((m) => m.SalesPageComponent) },
      { path: 'messages', loadComponent: () => import('./messages/messages-page.component').then((m) => m.MessagesPageComponent) },
      { path: 'analytics', loadComponent: () => import('./analytics/analytics-page.component').then((m) => m.AnalyticsPageComponent) },
      { path: 'settings', loadComponent: () => import('./settings/settings-page.component').then((m) => m.SettingsPageComponent) },
    ],
  },
];
