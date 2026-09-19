import { DOCUMENT, Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class ShareService {
  private readonly doc = inject(DOCUMENT);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  async share(title: string, url: string): Promise<void> {
    if (!this.browser) return;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        /* annulé */
      }
    }
    await this.copy(url);
  }

  async copy(text: string): Promise<boolean> {
    if (!this.browser) return false;
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const ta = this.doc.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      this.doc.body.appendChild(ta);
      ta.select();
      const ok = this.doc.execCommand('copy');
      ta.remove();
      return ok;
    }
  }
}
