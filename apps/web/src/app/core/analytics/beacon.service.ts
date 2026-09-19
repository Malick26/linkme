import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type { AnalyticsEventInput } from '../api/types';
import { RUNTIME_CONFIG } from '../config/runtime-config';

/**
 * Événements page_view / link_click envoyés par navigator.sendBeacon (non bloquant, sans cookie tiers).
 * Corps en text/plain → pas de pré-vol CORS ; le back accepte text/plain JSON (contrat trackEvent).
 */
@Injectable({ providedIn: 'root' })
export class BeaconService {
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly fixtures = inject(RUNTIME_CONFIG).useFixtures;

  send(handle: string, ev: AnalyticsEventInput): void {
    if (!this.browser || this.fixtures) return;
    const url = `/api/public/${encodeURIComponent(handle)}/events`;
    const body = JSON.stringify({ ...ev, referrer: ev.referrer ?? (document.referrer || undefined)?.slice(0, 512) });
    try {
      if (navigator.sendBeacon?.(url, new Blob([body], { type: 'text/plain' }))) return;
    } catch {
      /* ignore */
    }
    fetch(url, { method: 'POST', body, keepalive: true, headers: { 'content-type': 'text/plain' } }).catch(() => undefined);
  }
}
