import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  { path: 'legal/**', renderMode: RenderMode.Prerender },
  { path: 'rejoindre', renderMode: RenderMode.Prerender },
  { path: 'desinscription', renderMode: RenderMode.Client },
  // back-office : rendu client (données privées, pas de SEO)
  { path: 'app/**', renderMode: RenderMode.Client },
  { path: 'login', renderMode: RenderMode.Client },
  { path: 'register', renderMode: RenderMode.Client },
  { path: 'r/**', renderMode: RenderMode.Client },
  { path: 'forgot', renderMode: RenderMode.Client },
  { path: 'reset', renderMode: RenderMode.Client },
  // pages créateurs : rendu serveur à la demande (données dynamiques, aperçus de partage)
  { path: '**', renderMode: RenderMode.Server },
];
