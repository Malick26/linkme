import { Routes } from '@angular/router';
import { ProfilePageComponent } from './pages/profile-page.component';

/**
 * Routes publiques. La page profil (route critique LCP) est chargée d'emblée ; les pages secondaires
 * (bloc, produit, commande — formulaires inclus) sont en chargement différé.
 */
export const PUBLIC_ROUTES: Routes = [
  { path: ':handle', component: ProfilePageComponent },
  { path: ':handle/shop/:productId', loadComponent: () => import('./pages/product-page.component').then((m) => m.ProductPageComponent) },
  { path: ':handle/commande/:reference', loadComponent: () => import('./pages/order-page.component').then((m) => m.OrderPageComponent) },
  { path: ':handle/:slug', loadComponent: () => import('./pages/block-page.component').then((m) => m.BlockPageComponent) },
];
