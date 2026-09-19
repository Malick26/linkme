import { HttpErrorResponse } from '@angular/common/http';
import type { Problem } from '../api/types';

/** Extrait un Problem RFC 7807 d'une erreur HTTP (repli sur un code générique). */
export function toProblem(err: unknown): Problem & { code: string } {
  if (err instanceof HttpErrorResponse) {
    const body = (typeof err.error === 'object' && err.error) || {};
    const code = (body as Problem).code ?? (err.status === 0 ? 'NETWORK' : err.status === 401 ? 'UNAUTHORIZED' : err.status === 404 ? 'NOT_FOUND' : err.status === 429 ? 'RATE_LIMITED' : 'UNKNOWN');
    return { status: err.status, ...(body as Problem), code };
  }
  return { status: 0, code: 'UNKNOWN' };
}
