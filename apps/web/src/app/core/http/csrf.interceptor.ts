import { HttpInterceptorFn } from '@angular/common/http';
import { DOCUMENT, inject } from '@angular/core';

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Ajoute X-XSRF-TOKEN (cookie XSRF-TOKEN posé par Spring Security) aux requêtes mutantes de même origine. */
export const csrfInterceptor: HttpInterceptorFn = (req, next) => {
  if (SAFE.has(req.method) || !req.url.startsWith('/api/')) return next(req);
  const cookie = inject(DOCUMENT).cookie ?? '';
  const m = cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
  return next(m ? req.clone({ setHeaders: { 'X-XSRF-TOKEN': decodeURIComponent(m[1]) }, withCredentials: true }) : req.clone({ withCredentials: true }));
};
