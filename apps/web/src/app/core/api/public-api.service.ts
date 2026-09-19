import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { RUNTIME_CONFIG } from '../config/runtime-config';
import { MALICK_BLOCKS, MALICK_PAGE } from '../fixtures/malick';
import type {
  CheckoutRequest, CheckoutResponse, ContactMessageInput, OrderStatusView, PublicBlockDetail, PublicPage, PublicProduct,
} from './types';

const notFound = () => throwError(() => ({ status: 404, code: 'NOT_FOUND' }));

/** Client des endpoints publics (contrat : tag `public` / `shop`). Mode fixtures pour la Phase 1 et les tests visuels. */
@Injectable({ providedIn: 'root' })
export class PublicApi {
  private readonly http = inject(HttpClient);
  private readonly cfg = inject(RUNTIME_CONFIG);

  page(handle: string): Observable<PublicPage> {
    if (this.cfg.useFixtures) return handle === 'malick' ? of(MALICK_PAGE) : notFound();
    return this.http.get<PublicPage>(`/api/public/${encodeURIComponent(handle)}`);
  }

  block(handle: string, slug: string): Observable<PublicBlockDetail> {
    if (this.cfg.useFixtures) return handle === 'malick' && MALICK_BLOCKS[slug] ? of(MALICK_BLOCKS[slug]) : notFound();
    return this.http.get<PublicBlockDetail>(`/api/public/${encodeURIComponent(handle)}/blocks/${encodeURIComponent(slug)}`);
  }

  product(handle: string, id: string): Observable<PublicProduct> {
    if (this.cfg.useFixtures) {
      const p = MALICK_BLOCKS['shop'].products.find((x) => x.id === id);
      return p ? of(p) : notFound();
    }
    return this.http.get<PublicProduct>(`/api/public/${encodeURIComponent(handle)}/products/${encodeURIComponent(id)}`);
  }

  contact(handle: string, body: ContactMessageInput): Observable<unknown> {
    return this.http.post(`/api/public/${encodeURIComponent(handle)}/contact`, body);
  }

  checkout(handle: string, body: CheckoutRequest): Observable<CheckoutResponse> {
    return this.http.post<CheckoutResponse>(`/api/public/${encodeURIComponent(handle)}/checkout`, body);
  }

  order(reference: string): Observable<OrderStatusView> {
    return this.http.get<OrderStatusView>(`/api/public/orders/${encodeURIComponent(reference)}`);
  }
}
