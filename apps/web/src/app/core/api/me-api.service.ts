import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  AdminAnnouncement, AdminCollab, AdminPromoCode, AdminReferrer, AnnouncementInput, AdminWithdrawal, CrmContact, CrmContactKind, CrmEmailRequest, CrmEmailResult, CrmSegment, PromoCodeInput, PromoQuote,
  ProspectInput, AnalyticsSummary, AssetKind, CollabRequest, ReferralCodeInfo, ReferralOverview, Wallet, Withdrawal,
  WithdrawalDecision, WithdrawalRequest, WithdrawalStatus, Audio, Block, BlockInput, BlockItem, BlockItemInput, ContactMessagePage, Earnings, Image, LoginRequest, Me,
  OrderPage, Plan, PlanCatalogEntry, Product, ProductInput, Profile, ProfileStats, ProfileStatsInput, ProfileUpdate, PublicPage, RegisterRequest,
  SocialAccount, SocialAccountInput, SubscriptionCheckoutRequest, SubscriptionCheckoutResponse, SubscriptionPaymentView, SubscriptionStatus,
  ThemeConfig, ThemePreset, ThemeState, UploadSignature,
} from './types';

/** Client typé des endpoints authentifiés (contrat : tags auth, profile, blocks, theme, uploads, shop, subscriptions, analytics, account). */
@Injectable({ providedIn: 'root' })
export class MeApi {
  private readonly http = inject(HttpClient);

  // auth
  csrf(): Observable<void> { return this.http.get<void>('/api/auth/csrf'); }
  register(body: RegisterRequest): Observable<Me> { return this.http.post<Me>('/api/auth/register', body); }
  login(body: LoginRequest): Observable<Me> { return this.http.post<Me>('/api/auth/login', body); }
  logout(): Observable<void> { return this.http.post<void>('/api/auth/logout', {}); }
  forgot(email: string): Observable<void> { return this.http.post<void>('/api/auth/forgot', { email }); }
  reset(token: string, password: string): Observable<void> { return this.http.post<void>('/api/auth/reset', { token, password }); }
  handleAvailability(handle: string) {
    return this.http.get<{ handle: string; available: boolean; reason?: 'taken' | 'reserved' | 'invalid' }>('/api/auth/handle-availability', { params: { handle } });
  }
  me(): Observable<Me> { return this.http.get<Me>('/api/me'); }
  deleteAccount(password: string): Observable<void> { return this.http.delete<void>('/api/me', { body: { password } }); }

  // profil
  profile(): Observable<Profile> { return this.http.get<Profile>('/api/me/profile'); }
  updateProfile(body: ProfileUpdate): Observable<Profile> { return this.http.put<Profile>('/api/me/profile', body); }
  socials(): Observable<SocialAccount[]> { return this.http.get<SocialAccount[]>('/api/me/socials'); }
  updateSocials(items: SocialAccountInput[]): Observable<SocialAccount[]> { return this.http.put<SocialAccount[]>('/api/me/socials', { items }); }
  stats(): Observable<ProfileStats> { return this.http.get<ProfileStats>('/api/me/stats'); }
  updateStats(body: ProfileStatsInput): Observable<ProfileStats> { return this.http.put<ProfileStats>('/api/me/stats', body); }
  preview(): Observable<PublicPage> { return this.http.get<PublicPage>('/api/me/preview'); }

  // blocs
  blocks(): Observable<Block[]> { return this.http.get<Block[]>('/api/me/blocks'); }
  createBlock(body: BlockInput): Observable<Block> { return this.http.post<Block>('/api/me/blocks', body); }
  updateBlock(id: string, body: BlockInput): Observable<Block> { return this.http.put<Block>(`/api/me/blocks/${id}`, body); }
  deleteBlock(id: string): Observable<void> { return this.http.delete<void>(`/api/me/blocks/${id}`); }
  reorderBlocks(ids: string[]): Observable<Block[]> { return this.http.put<Block[]>('/api/me/blocks/order', { ids }); }
  items(blockId: string): Observable<BlockItem[]> { return this.http.get<BlockItem[]>(`/api/me/blocks/${blockId}/items`); }
  createItem(blockId: string, body: BlockItemInput): Observable<BlockItem> { return this.http.post<BlockItem>(`/api/me/blocks/${blockId}/items`, body); }
  updateItem(blockId: string, id: string, body: BlockItemInput): Observable<BlockItem> { return this.http.put<BlockItem>(`/api/me/blocks/${blockId}/items/${id}`, body); }
  deleteItem(blockId: string, id: string): Observable<void> { return this.http.delete<void>(`/api/me/blocks/${blockId}/items/${id}`); }
  reorderItems(blockId: string, ids: string[]): Observable<BlockItem[]> { return this.http.put<BlockItem[]>(`/api/me/blocks/${blockId}/items/order`, { ids }); }

  // thème
  theme(): Observable<ThemeState> { return this.http.get<ThemeState>('/api/me/theme'); }
  saveTheme(body: ThemeConfig): Observable<ThemeState> { return this.http.put<ThemeState>('/api/me/theme', body); }
  publishTheme(): Observable<ThemeState> { return this.http.post<ThemeState>('/api/me/theme/publish', {}); }
  presets(): Observable<ThemePreset[]> { return this.http.get<ThemePreset[]>('/api/theme/presets'); }

  // uploads
  signUpload(kind: AssetKind): Observable<UploadSignature> { return this.http.post<UploadSignature>('/api/me/uploads/sign', { kind }); }
  completeUpload(body: { kind: AssetKind; publicId: string; version: number; signature: string; width: number; height: number; format: string; bytes: number }): Observable<Image> {
    return this.http.post<Image>('/api/me/uploads/complete', body);
  }
  uploadLocal(file: File, kind: AssetKind): Observable<Image> {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('kind', kind);
    return this.http.post<Image>('/api/me/uploads/local', fd);
  }
  signAudioUpload(): Observable<UploadSignature> { return this.http.post<UploadSignature>('/api/me/uploads/sign-audio', {}); }
  completeAudioUpload(body: { publicId: string; version: number; signature: string; format: string; bytes: number }): Observable<Audio> {
    return this.http.post<Audio>('/api/me/uploads/complete-audio', body);
  }
  uploadLocalAudio(file: File): Observable<Audio> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<Audio>('/api/me/uploads/local-audio', fd);
  }

  // boutique
  products(): Observable<Product[]> { return this.http.get<Product[]>('/api/me/products'); }
  createProduct(body: ProductInput): Observable<Product> { return this.http.post<Product>('/api/me/products', body); }
  updateProduct(id: string, body: ProductInput): Observable<Product> { return this.http.put<Product>(`/api/me/products/${id}`, body); }
  deleteProduct(id: string): Observable<void> { return this.http.delete<void>(`/api/me/products/${id}`); }
  orders(status?: string): Observable<OrderPage> { return this.http.get<OrderPage>('/api/me/orders', { params: status ? { status, size: 100 } : { size: 100 } }); }
  earnings(): Observable<Earnings> { return this.http.get<Earnings>('/api/me/earnings'); }
  messages(): Observable<ContactMessagePage> { return this.http.get<ContactMessagePage>('/api/me/messages', { params: { size: 100 } }); }
  analytics(days: 7 | 30): Observable<AnalyticsSummary> { return this.http.get<AnalyticsSummary>('/api/me/analytics', { params: { days } }); }

  // abonnement (D44/D45/D46)
  plans(): Observable<PlanCatalogEntry[]> { return this.http.get<PlanCatalogEntry[]>('/api/subscriptions/plans'); }
  subscription(): Observable<SubscriptionStatus> { return this.http.get<SubscriptionStatus>('/api/me/subscription'); }
  checkoutSubscription(body: SubscriptionCheckoutRequest): Observable<SubscriptionCheckoutResponse> {
    return this.http.post<SubscriptionCheckoutResponse>('/api/me/subscription/checkout', body);
  }
  subscriptionPayment(reference: string): Observable<SubscriptionPaymentView> {
    return this.http.get<SubscriptionPaymentView>(`/api/me/subscription/payments/${reference}`);
  }

  // parrainage & portefeuille (D51–D56)
  referralCode(code: string): Observable<ReferralCodeInfo> { return this.http.get<ReferralCodeInfo>(`/api/auth/referral-codes/${encodeURIComponent(code)}`); }
  referrals(): Observable<ReferralOverview> { return this.http.get<ReferralOverview>('/api/me/referrals'); }
  wallet(): Observable<Wallet> { return this.http.get<Wallet>('/api/me/wallet'); }
  requestWithdrawal(body: WithdrawalRequest): Observable<Withdrawal> { return this.http.post<Withdrawal>('/api/me/wallet/withdrawals', body); }

  // admin (D56)
  adminWithdrawals(status?: WithdrawalStatus): Observable<AdminWithdrawal[]> {
    return this.http.get<AdminWithdrawal[]>('/api/admin/withdrawals', { params: status ? { status } : {} });
  }
  adminPayWithdrawal(id: string, body: WithdrawalDecision): Observable<AdminWithdrawal> { return this.http.post<AdminWithdrawal>(`/api/admin/withdrawals/${id}/pay`, body); }
  adminRejectWithdrawal(id: string, body: WithdrawalDecision): Observable<AdminWithdrawal> { return this.http.post<AdminWithdrawal>(`/api/admin/withdrawals/${id}/reject`, body); }
  adminReferrer(handle: string): Observable<AdminReferrer> { return this.http.get<AdminReferrer>(`/api/admin/referrers/${encodeURIComponent(handle)}`); }
  adminSetCollab(handle: string, body: CollabRequest): Observable<AdminReferrer> { return this.http.put<AdminReferrer>(`/api/admin/referrers/${encodeURIComponent(handle)}/collab`, body); }
  adminEndCollab(handle: string): Observable<AdminReferrer> { return this.http.delete<AdminReferrer>(`/api/admin/referrers/${encodeURIComponent(handle)}/collab`); }

  // codes promo (D59)
  quotePromo(code: string, plan: Plan): Observable<PromoQuote> { return this.http.get<PromoQuote>('/api/me/subscription/promo', { params: { code, plan } }); }
  adminPromoCodes(): Observable<AdminPromoCode[]> { return this.http.get<AdminPromoCode[]>('/api/admin/promo-codes'); }
  adminCreatePromoCode(body: PromoCodeInput): Observable<AdminPromoCode> { return this.http.post<AdminPromoCode>('/api/admin/promo-codes', body); }
  adminDeactivatePromoCode(id: string): Observable<AdminPromoCode> { return this.http.post<AdminPromoCode>(`/api/admin/promo-codes/${id}/deactivate`, {}); }

  // prospects & CRM (D60–D63)
  joinProspects(body: ProspectInput): Observable<void> { return this.http.post<void>('/api/public/prospects', body); }
  unsubscribe(token: string): Observable<void> { return this.http.post<void>('/api/public/unsubscribe', { token }); }
  adminCrmContacts(segment: CrmSegment): Observable<CrmContact[]> { return this.http.get<CrmContact[]>('/api/admin/crm/contacts', { params: { segment } }); }
  adminCrmEmail(body: CrmEmailRequest): Observable<CrmEmailResult> { return this.http.post<CrmEmailResult>('/api/admin/crm/emails', body); }
  adminCrmLog(kind: CrmContactKind, id: string, channel: 'whatsapp' | 'email'): Observable<void> {
    return this.http.post<void>(`/api/admin/crm/contacts/${kind}/${id}/log`, { channel });
  }

  // collabs en liste & annonces (D64–D66)
  adminCollabs(): Observable<AdminCollab[]> { return this.http.get<AdminCollab[]>('/api/admin/collabs'); }
  adminAnnouncements(): Observable<AdminAnnouncement[]> { return this.http.get<AdminAnnouncement[]>('/api/admin/announcements'); }
  adminCreateAnnouncement(body: AnnouncementInput): Observable<AdminAnnouncement> { return this.http.post<AdminAnnouncement>('/api/admin/announcements', body); }
  adminUpdateAnnouncement(id: string, body: AnnouncementInput): Observable<AdminAnnouncement> { return this.http.put<AdminAnnouncement>(`/api/admin/announcements/${id}`, body); }
}
