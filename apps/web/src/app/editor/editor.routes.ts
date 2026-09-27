import { Routes } from '@angular/router';
import { registerEditorIcons } from '../../design-system/icons/icon-registry-editor';
import { adminGuard, authGuard, guestGuard, onboardingDoneGuard } from '../core/auth/guards';
import { frEditor } from '../core/i18n/fr-editor';
import { registerDictionary } from '../core/i18n/i18n.service';

// textes du back-office : chargés avec ce chunk, jamais dans le bundle initial de la page publique (règle 3)
registerDictionary(frEditor);
registerEditorIcons();

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
      { path: 'abonnement', loadComponent: () => import('./subscription/subscription-page.component').then((m) => m.SubscriptionPageComponent) },
      { path: 'abonnement/:reference', loadComponent: () => import('./subscription/subscription-page.component').then((m) => m.SubscriptionPageComponent) },
      { path: 'design', loadComponent: () => import('./theme/theme-editor.component').then((m) => m.ThemeEditorComponent) },
      { path: 'shop', loadComponent: () => import('./shop/shop-page.component').then((m) => m.ShopPageComponent) },
      { path: 'sales', loadComponent: () => import('./sales/sales-page.component').then((m) => m.SalesPageComponent) },
      { path: 'messages', loadComponent: () => import('./messages/messages-page.component').then((m) => m.MessagesPageComponent) },
      { path: 'analytics', loadComponent: () => import('./analytics/analytics-page.component').then((m) => m.AnalyticsPageComponent) },
      { path: 'parrainage', loadComponent: () => import('./referral/referral-page.component').then((m) => m.ReferralPageComponent) },
      { path: 'portefeuille', loadComponent: () => import('./wallet/wallet-page.component').then((m) => m.WalletPageComponent) },
      { path: 'admin', pathMatch: 'full', redirectTo: 'admin/retraits' },
      { path: 'admin/retraits', canActivate: [adminGuard], loadComponent: () => import('./admin/admin-withdrawals.component').then((m) => m.AdminWithdrawalsComponent) },
      { path: 'admin/promos', canActivate: [adminGuard], loadComponent: () => import('./admin/admin-promos.component').then((m) => m.AdminPromosComponent) },
      { path: 'admin/collabs', canActivate: [adminGuard], loadComponent: () => import('./admin/admin-collabs.component').then((m) => m.AdminCollabsComponent) },
      { path: 'admin/annonces', canActivate: [adminGuard], loadComponent: () => import('./admin/admin-announcements.component').then((m) => m.AdminAnnouncementsComponent) },
      { path: 'admin/crm', canActivate: [adminGuard], loadComponent: () => import('./admin/admin-crm.component').then((m) => m.AdminCrmComponent) },
      { path: 'settings', loadComponent: () => import('./settings/settings-page.component').then((m) => m.SettingsPageComponent) },
    ],
  },
];
