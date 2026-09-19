import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { MeApi } from '../../core/api/me-api.service';
import { TPipe } from '../../core/i18n/i18n.service';

@Component({
  selector: 'app-messages-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TPipe],
  template: `
    <div class="ed-page ed-stack">
      <h1>{{ 'messages.title' | t }}</h1>
      @if (messages.value()?.items; as items) {
        @for (m of items; track m.id) {
          <article class="ed-card msg">
            <header><strong>{{ m.name }}</strong> <span class="ed-muted">{{ date(m.createdAt) }}</span></header>
            <p>{{ m.message }}</p>
            <div class="ed-row">
              @if (m.email) { <a class="ed-btn" [href]="'mailto:' + m.email">{{ m.email }}</a> }
              @if (m.phone) { <a class="ed-btn" [href]="'tel:' + m.phone">{{ m.phone }}</a> }
            </div>
          </article>
        } @empty {
          <p class="ed-muted">{{ 'messages.none' | t }}</p>
        }
      }
    </div>
  `,
  styles: `
    @use 'editor' as ed;
    @include ed.base;
    .msg p { white-space: pre-line; margin: 8px 0 12px; }
    .msg header { display: flex; gap: 8px; flex-wrap: wrap; align-items: baseline; }
  `,
})
export class MessagesPageComponent {
  private readonly api = inject(MeApi);
  protected readonly messages = rxResource({ stream: () => this.api.messages() });
  protected date(d: string): string {
    return new Date(d).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
  }
}
