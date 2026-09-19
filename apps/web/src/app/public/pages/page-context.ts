import { RESPONSE_INIT, inject } from '@angular/core';
import { RUNTIME_CONFIG } from '../../core/config/runtime-config';
import { PUBLIC_BASE_URL_FALLBACK } from '../../core/config/brand';

/** Pose le code HTTP de la réponse SSR (404 propre pour handle inexistant / page non publiée — brief §7.5). */
export function useResponseStatus() {
  const init = inject(RESPONSE_INIT, { optional: true });
  return (status: number) => {
    if (init) init.status = status;
  };
}

export function usePublicUrl() {
  const cfg = inject(RUNTIME_CONFIG);
  return (path: string) => `${(cfg.publicBaseUrl || PUBLIC_BASE_URL_FALLBACK).replace(/\/$/, '')}${path}`;
}
