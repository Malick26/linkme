import { InjectionToken } from '@angular/core';

/** Configuration d'exécution (lue côté serveur dans les variables d'environnement, transmise au navigateur via TransferState). */
export interface RuntimeConfig {
  /** Base de l'API vue par le navigateur (même origine derrière le proxy) */
  apiBaseUrl: string;
  /** Base de l'API vue par le serveur SSR (réseau Docker interne) */
  apiInternalUrl: string;
  /** URL publique du site (liens de partage, OG) */
  publicBaseUrl: string;
  /** Rendre la page publique depuis les fixtures (Phase 1 / tests visuels) */
  useFixtures: boolean;
}

export const RUNTIME_CONFIG = new InjectionToken<RuntimeConfig>('RUNTIME_CONFIG', {
  providedIn: 'root',
  factory: () => ({ apiBaseUrl: '', apiInternalUrl: '', publicBaseUrl: '', useFixtures: false }),
});
