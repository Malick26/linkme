import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../../design-system';
import { MeApi } from '../../core/api/me-api.service';
import type { Referee, ReferralEarning } from '../../core/api/types';
import { BRAND_NAME } from '../../core/config/brand';
import { formatXof } from '../../core/format/compact-number';
import type { I18nKey } from '../../core/i18n/fr';
import { I18n, TPipe } from '../../core/i18n/i18n.service';
import { formatDate, formatRate, formatShortDate } from './rates';

/**
 * Parrainage à deux vitesses (D51–D54) : lien à partager, taux (20 % ou collab négociée), gains réels / mensuels /
 * potentiels, filleuls masqués et derniers gains (gelés 7 jours, bloqués si auto-parrainage).
 */
@Component({
  selector: 'app-referral-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TPipe, RouterLink, IconComponent],
  template: `
    <div class="ed-page ed-stack">
      <h1>{{ 'referral.title' | t }}</h1>
      @if (data.error()) {
        <p class="ed-error" role="alert">{{ 'common.error' | t }}</p>
      }
      @if (data.value(); as r) {
        <section class="ed-card ed-stack hero">
          <div class="hero__head">
            <span class="hero__icon" aria-hidden="true"><lm-icon name="gift" [size]="22" /></span>
            <h2>{{ 'referral.heroTitle' | t: { rate: rate(r.effectiveRateBps) } }}</h2>
          </div>
          <p class="ed-muted">{{ 'referral.heroText' | t: { rate: rate(r.effectiveRateBps) } }}</p>
          @if (r.collab; as c) {
            <p class="ed-chip ed-chip--ok collab">{{ 'referral.collabBadge' | t: { rate: rate(c.rateBps), date: date(c.expiresAt) } }}</p>
            <p class="ed-muted">{{ 'referral.collabText' | t: { date: date(c.expiresAt), base: rate(r.baseRateBps) } }}</p>
          }
          <label class="ed-field">
            <span>{{ 'referral.linkLabel' | t }}</span>
            <input class="link" readonly [value]="r.link" (focus)="$any($event.target).select()" data-testid="referral-link" />
          </label>
          <div class="ed-row">
            <button type="button" class="ed-btn ed-btn--primary" (click)="copy(r.link)">
              <lm-icon [name]="copied() ? 'check' : 'copy'" [size]="18" />{{ (copied() ? 'common.copied' : 'common.copy') | t }}
            </button>
            <a class="ed-btn" [href]="whatsappUrl()" target="_blank" rel="noopener"><lm-icon name="brand-whatsapp" [size]="18" />{{ 'referral.shareWhatsapp' | t }}</a>
            @if (canShare) {
              <button type="button" class="ed-btn" (click)="share(r.link)"><lm-icon name="share-2" [size]="18" />{{ 'common.share' | t }}</button>
            }
            <span class="ed-muted code">{{ 'referral.codeLabel' | t }} : <strong>{{ r.code }}</strong></span>
          </div>
        </section>

        <div class="kpis">
          <div class="ed-card kpi kpi--main"><span class="ed-muted">{{ 'referral.kpiReal' | t }}</span><strong data-testid="kpi-real">{{ fmt(r.stats.realEarnedXof) }}</strong><small class="ed-muted">{{ 'referral.kpiRealHint' | t }}</small></div>
          <div class="ed-card kpi"><span class="ed-muted">{{ 'referral.kpiCurrent' | t }}</span><strong>{{ fmt(r.stats.currentMonthlyXof) }}</strong><small class="ed-muted">{{ 'referral.kpiCurrentHint' | t }}</small></div>
          <div class="ed-card kpi"><span class="ed-muted">{{ 'referral.kpiPotential' | t }}</span><strong data-testid="kpi-potential">{{ fmt(r.stats.potentialMonthlyXof) }}</strong><small class="ed-muted">{{ 'referral.kpiPotentialHint' | t }}</small></div>
          <div class="ed-card kpi"><span class="ed-muted">{{ 'referral.kpiReferees' | t }}</span><strong>{{ r.stats.signups }}</strong><small class="ed-muted">{{ 'referral.kpiRefereesHint' | t: { active: r.stats.activeReferees } }}</small></div>
        </div>

        <section class="ed-card ed-stack">
          <h2>{{ 'referral.refereesTitle' | t }}</h2>
          @if (!r.referees.length) {
            <p class="ed-muted">{{ 'referral.refereesEmpty' | t }}</p>
          } @else {
            <p class="ed-muted"><lm-icon name="shield-check" [size]="16" /> {{ 'referral.refereesPrivacy' | t }}</p>
            <ul class="list" role="list">
              @for (f of r.referees; track $index) {
                <li class="row">
                  <span class="row__main"><strong>{{ f.maskedName }}</strong>@if (f.maskedPhone) {<span class="ed-muted mono">{{ f.maskedPhone }}</span>}</span>
                  <span class="ed-muted">{{ 'referral.col.joined' | t }} {{ short(f.joinedAt) }}</span>
                  <span class="ed-chip" [class.ed-chip--ok]="f.status === 'active'" [class.ed-chip--warn]="f.status === 'expired'">{{ refereeKey(f) | t }}</span>
                  <strong class="row__amount">{{ fmt(f.earnedXof) }}</strong>
                </li>
              }
            </ul>
          }
        </section>

        <section class="ed-card ed-stack">
          <h2>{{ 'referral.earningsTitle' | t }}</h2>
          @if (!r.recentEarnings.length) {
            <p class="ed-muted">{{ 'referral.earningsEmpty' | t }}</p>
          } @else {
            <ul class="list" role="list">
              @for (e of r.recentEarnings; track e.id) {
                <li class="row">
                  <span class="row__main"><strong>{{ e.refereeMaskedName }}</strong><span class="ed-muted">{{ short(e.createdAt) }}</span></span>
                  <span class="ed-muted mono">{{ fmt(e.baseAmountXof) }} × {{ rate(e.rateBps) }}</span>
                  <span class="ed-chip" [class.ed-chip--ok]="e.status === 'available'" [class.ed-chip--bad]="e.status === 'blocked'" [attr.title]="e.status === 'blocked' ? ('referral.earning.blockedSelf' | t) : null">
                    {{ earningLabel(e) }}
                  </span>
                  <strong class="row__amount" [class.struck]="e.status === 'blocked'">{{ fmt(e.amountXof) }}</strong>
                  @if (e.status === 'blocked') { <small class="ed-error row__full">{{ 'referral.earning.blockedSelf' | t }}</small> }
                </li>
              }
            </ul>
          }
        </section>

        <section class="ed-card ed-stack">
          <h2>{{ 'referral.rulesTitle' | t }}</h2>
          <ul class="rules">
            <li>{{ 'referral.rule1' | t: { days: wallet.value()?.holdDays ?? 7 } }}</li>
            <li>{{ 'referral.rule2' | t: { min: fmt(wallet.value()?.minWithdrawalXof ?? 1500) } }}</li>
            <li>{{ 'referral.rule3' | t }}</li>
          </ul>
          <a class="ed-btn" routerLink="/app/portefeuille"><lm-icon name="piggy-bank" [size]="18" />{{ 'referral.toWallet' | t }}</a>
        </section>
      } @else if (!data.error()) {
        <p class="ed-muted" role="status">{{ 'common.loading' | t }}</p>
      }
    </div>
  `,
  styles: `
    @use 'editor' as ed;
    @include ed.base;
    h2 { margin: 0; font-size: 18px; }
    .hero__head { display: flex; align-items: center; gap: 12px; }
    .hero__icon { display: grid; place-items: center; width: 44px; height: 44px; flex: none; border-radius: 12px; background: var(--ed-panel-2); color: var(--ed-accent); }
    .collab { align-self: flex-start; }
    .link { font-family: ui-monospace, monospace; }
    .code { margin-left: auto; }
    .kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px; }
    .kpi { display: flex; flex-direction: column; gap: 4px; }
    .kpi strong { font-size: 22px; font-variant-numeric: tabular-nums; }
    .kpi--main strong { color: var(--ed-accent); }
    .list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
    .row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 14px; padding: 12px 0; border-bottom: 1px solid var(--ed-border); }
    .row:last-child { border-bottom: 0; }
    .row__main { display: flex; flex-direction: column; gap: 2px; flex: 1 1 160px; min-width: 0; }
    .row__amount { margin-left: auto; font-variant-numeric: tabular-nums; }
    .row__full { flex-basis: 100%; }
    .struck { text-decoration: line-through; color: var(--ed-muted); }
    .mono { font-family: ui-monospace, monospace; font-size: 12px; }
    .rules { margin: 0; padding-left: 20px; display: flex; flex-direction: column; gap: 6px; color: var(--ed-muted); font-size: 14px; }
    .ed-row .ed-btn { display: inline-flex; align-items: center; gap: 8px; text-decoration: none; }
    a.ed-btn { align-self: flex-start; display: inline-flex; align-items: center; gap: 8px; text-decoration: none; }
  `,
})
export class ReferralPageComponent {
  private readonly api = inject(MeApi);
  private readonly i18n = inject(I18n);
  protected readonly data = rxResource({ stream: () => this.api.referrals() });
  /** Règles affichées (gel, minimum) : lues depuis le portefeuille pour ne jamais diverger de la configuration serveur. */
  protected readonly wallet = rxResource({ stream: () => this.api.wallet() });
  protected readonly copied = signal(false);
  protected readonly fmt = formatXof;
  protected readonly rate = formatRate;
  protected readonly date = formatDate;
  protected readonly short = formatShortDate;
  protected readonly canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  protected readonly whatsappUrl = computed(() => {
    const link = this.data.value()?.link ?? '';
    return 'https://wa.me/?text=' + encodeURIComponent(this.i18n.t('referral.shareText', { brand: BRAND_NAME, link }));
  });

  protected refereeKey(f: Referee): I18nKey {
    return `referral.status.${f.status}` as I18nKey;
  }

  protected earningLabel(e: ReferralEarning): string {
    if (e.status === 'held') return this.i18n.t('referral.earning.held', { date: formatShortDate(e.availableAt) });
    return this.i18n.t(e.status === 'blocked' ? 'referral.earning.blocked' : 'referral.earning.available');
  }

  protected async copy(link: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(link);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch {
      /* presse-papiers indisponible : le champ reste sélectionnable */
    }
  }

  protected share(link: string): void {
    void navigator.share({ title: BRAND_NAME, text: this.i18n.t('referral.shareText', { brand: BRAND_NAME, link }) }).catch(() => undefined);
  }
}
