import { HttpInterceptorFn } from '@angular/common/http';
import { PLATFORM_ID, inject } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { RUNTIME_CONFIG } from '../config/runtime-config';

/**
 * Les appels API sont écrits en relatif (`/api/...`) → même clé de cache de transfert SSR/navigateur.
 * Côté serveur, on les réécrit vers l'URL interne de l'API (réseau Docker).
 */
export const apiBaseInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.url.startsWith('/api/') && isPlatformServer(inject(PLATFORM_ID))) {
    const base = inject(RUNTIME_CONFIG).apiInternalUrl;
    if (base) return next(req.clone({ url: base.replace(/\/$/, '') + req.url }));
  }
  return next(req);
};
