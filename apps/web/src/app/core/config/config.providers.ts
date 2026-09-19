import { PLATFORM_ID, REQUEST_CONTEXT, TransferState, inject, makeStateKey } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { RUNTIME_CONFIG, RuntimeConfig } from './runtime-config';

const KEY = makeStateKey<RuntimeConfig>('lm-runtime-config');

/**
 * Serveur : la config vient du contexte de requête (server.ts → variables d'environnement).
 * Navigateur : relue depuis TransferState (sérialisée dans le HTML).
 */
export function provideRuntimeConfig() {
  return {
    provide: RUNTIME_CONFIG,
    useFactory: (): RuntimeConfig => {
      const ts = inject(TransferState);
      if (isPlatformServer(inject(PLATFORM_ID))) {
        const ctx = (inject(REQUEST_CONTEXT, { optional: true }) as Partial<RuntimeConfig> | null) ?? {};
        const cfg: RuntimeConfig = {
          apiBaseUrl: '',
          apiInternalUrl: ctx.apiInternalUrl ?? '',
          publicBaseUrl: ctx.publicBaseUrl ?? '',
          useFixtures: !!ctx.useFixtures,
        };
        ts.set(KEY, { ...cfg, apiInternalUrl: '' });
        return cfg;
      }
      return ts.get(KEY, { apiBaseUrl: '', apiInternalUrl: '', publicBaseUrl: '', useFixtures: false });
    },
  };
}
