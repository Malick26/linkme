import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  AnalyticsSummary, AssetKind, Block, BlockInput, BlockItem, BlockItemInput, ContactMessagePage, Earnings, Image, LoginRequest, Me,
  OrderPage, Product, ProductInput, Profile, ProfileStats, ProfileStatsInput, ProfileUpdate, PublicPage, RegisterRequest,
  SocialAccount, SocialAccountInput, ThemeConfig, ThemePreset, ThemeState, UploadSignature,
} from './types';

/** Client typé des endpoints authentifiés (contrat : tags auth, profile, blocks, theme, uploads, shop, analytics, account). */
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

  // boutique
  products(): Observable<Product[]> { return this.http.get<Product[]>('/api/me/products'); }
  createProduct(body: ProductInput): Observable<Product> { return this.http.post<Product>('/api/me/products', body); }
  updateProduct(id: string, body: ProductInput): Observable<Product> { return this.http.put<Product>(`/api/me/products/${id}`, body); }
  deleteProduct(id: string): Observable<void> { return this.http.delete<void>(`/api/me/products/${id}`); }
  orders(status?: string): Observable<OrderPage> { return this.http.get<OrderPage>('/api/me/orders', { params: status ? { status, size: 100 } : { size: 100 } }); }
  earnings(): Observable<Earnings> { return this.http.get<Earnings>('/api/me/earnings'); }
  messages(): Observable<ContactMessagePage> { return this.http.get<ContactMessagePage>('/api/me/messages', { params: { size: 100 } }); }
  analytics(days: 7 | 30): Observable<AnalyticsSummary> { return this.http.get<AnalyticsSummary>('/api/me/analytics', { params: { days } }); }
}
