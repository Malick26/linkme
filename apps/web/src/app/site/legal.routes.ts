import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink, Routes } from '@angular/router';
import { SeoService } from '../core/seo/seo.service';
import { LEGAL } from './legal-content';

@Component({
  selector: 'app-legal-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    @let d = doc();
    <main class="lg">
      <a routerLink="/" class="lg__home">←</a>
      <h1>{{ d.title }}</h1>
      <p class="lg__upd">{{ d.updated }}</p>
      @for (s of d.sections; track s.h) {
        <h2>{{ s.h }}</h2>
        @for (para of s.p; track $index) {
          <p>{{ para }}</p>
        }
      }
    </main>
  `,
  styles: `
    .lg { max-width: 720px; margin: 0 auto; padding: 24px 20px 64px; color: var(--lm-text); line-height: 1.65; }
    .lg__home { display: inline-grid; place-items: center; width: 44px; height: 44px; color: var(--lm-text); text-decoration: none; font-size: 22px; }
    h1 { font-size: 30px; margin: 12px 0 4px; }
    .lg__upd { color: var(--lm-text-muted); margin: 0 0 24px; font-size: 14px; }
    h2 { font-size: 18px; margin: 28px 0 8px; }
    p { color: var(--lm-text-muted); margin: 0 0 10px; }
  `,
})
export class LegalPageComponent {
  readonly kind = input.required<keyof typeof LEGAL>();
  protected readonly doc = computed(() => LEGAL[this.kind()]);
  private readonly seo = inject(SeoService);
  constructor() {
    queueMicrotask(() => this.seo.set({ title: this.doc().title, description: this.doc().title, path: `/legal/${this.kind()}` }));
  }
}

export const LEGAL_ROUTES: Routes = [
  { path: 'mentions', component: LegalPageComponent, data: { kind: 'mentions' } },
  { path: 'confidentialite', component: LegalPageComponent, data: { kind: 'confidentialite' } },
  { path: 'cgu', component: LegalPageComponent, data: { kind: 'cgu' } },
];
