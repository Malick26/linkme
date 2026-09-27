// ─────────────────────────────────────────────────────────────────────────────
// Mock de l'API LinkMe (en mémoire) — implémente le contrat OpenAPI pour le développement front et les e2e
// quand le back Spring Boot n'est pas disponible. NE PAS utiliser en production.
//   node scripts/mock-api.mjs            → http://localhost:8080
// Fidèle au contrat : mêmes chemins, mêmes schémas, erreurs RFC 7807 (codes stables), cookie de session httpOnly,
// CSRF double cookie (XSRF-TOKEN → X-XSRF-TOKEN), paiement simulé avec webhook signé, commission 8 %.
// ─────────────────────────────────────────────────────────────────────────────
import express from 'express';
import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const PRESETS = JSON.parse(readFileSync(resolve(here, '../src/app/core/theme/presets.generated.json'), 'utf8'));
const SEED = JSON.parse(readFileSync(resolve(here, '../public/seed/seed-images.json'), 'utf8'));
const PORT = Number(process.env.PORT ?? 8080);
const BASE = process.env.PUBLIC_BASE_URL ?? 'http://localhost:4000';
const COMMISSION = 8;
const MOCK_SECRET = 'mock-secret';
const RESERVED = new Set(['admin', 'api', 'app', 'login', 'register', 'forgot', 'reset', 'settings', 'shop', 'help', 'legal', 'media', 'seed', 'fonts', 'commande', 'linkme']);
const HEX = /^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/;

// ───────────── état
const db = { users: new Map(), sessions: new Map(), assets: new Map(), orders: new Map(), events: new Set(), messages: [], analytics: [],
  subPayments: new Map(), referralCodes: new Map(), earnings: [], wallet: [], withdrawals: new Map() };
// Abonnements & parrainage (D44–D56) — mêmes règles que le back : 20 % de chaque paiement d'abonnement du filleul
// (ou collab ≤ 60 %), gel de REFERRAL_HOLD_DAYS jours, retrait dès 1 500 FCFA, admins = MOCK_ADMIN_EMAILS.
// Écart assumé : le mock n'applique pas le masquage de la page publique sans abonnement (D44), pour garder les
// parcours e2e historiques (publication → page visible) indépendants du paiement.
const PRICES = { standard: 1100, boutique: 2700 };
const PERIOD_DAYS = 30;
const BASE_RATE_BPS = 2000;
const HOLD_DAYS = Number(process.env.MOCK_REFERRAL_HOLD_DAYS ?? 7);
const MIN_WITHDRAWAL = 1500;
const ADMIN_EMAILS = new Set((process.env.MOCK_ADMIN_EMAILS ?? 'admin@demo.linkme.sn').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean));
const ALNUM = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const randomCode = (n) => Array.from(randomBytes(n), (x) => ALNUM[x % 32]).join('');
const clone = (o) => structuredClone(o);
const now = () => new Date().toISOString();
const preset = (id) => clone(PRESETS.find((p) => p.id === id)?.config ?? PRESETS[0].config);

function problem(res, status, code, detail, errors) {
  res.status(status).type('application/problem+json').json({ type: `https://linkme.sn/problems/${code.toLowerCase()}`, title: code, status, detail, code, ...(errors ? { errors } : {}) });
}
const bad = (res, field, message) => problem(res, 400, 'VALIDATION', 'Certains champs sont invalides.', [{ field, message }]);
const safeUrl = (u) => typeof u === 'string' && u.length <= 2048 && (/^https:\/\/[^\s/@]+\.[^\s]+/.test(u) || /^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/.test(u) || /^tel:\+?[0-9 ]{6,20}$/.test(u));

function seedAsset(owner, name, kind) {
  const id = randomUUID();
  const m = SEED[name];
  db.assets.set(id, { id, owner, kind, image: { id, urlTemplate: `/seed/${name}-{w}.webp`, widths: m.widths, width: m.width, height: m.height, placeholder: m.placeholder } });
  return id;
}

function newCreator({ email, password, handle, displayName }) {
  const id = randomUUID();
  const u = {
    id, email, password, handle, plan: 'standard', published: false, onboardingCompleted: false,
    phone: null, subscriptionStatus: 'inactive', subscriptionExpiresAt: null, referralCode: null, referrerId: null, collab: null, createdAt: now(),
    profile: { displayName, taglineLines: [], categories: [], bio: '', backgroundImageId: null },
    stats: { followers: 0, likes: 0, views30d: 0, updatedAt: null },
    socials: [],
    blocks: [
      ['travel', 'voyages', 'Mes voyages', 'Découvre mes dernières aventures', 'plane'],
      ['shop', 'shop', 'Mon shop', 'Mes outfits & mes coups de cœur', 'shopping-bag'],
      ['music', 'sons', 'Mes sons', 'Playlists, recommandations, vibes', 'music'],
      ['content', 'contenus', 'Mes contenus', 'Vlogs, behind the scenes, projets', 'clapperboard'],
      ['contact', 'contact', 'Me contacter', 'Projets, collabs, opportunités', 'mail'],
    ].map(([type, slug, title, subtitle, icon], position) => ({ id: randomUUID(), type, slug, title, subtitle, icon, thumbnailImageId: null, url: null, position, visible: true, config: {}, items: [] })),
    theme: { draft: preset('sunset'), published: null, version: 0, updatedAt: now(), publishedAt: null },
    products: [],
  };
  db.users.set(id, u);
  return u;
}

// seed /malick
{
  const u = newCreator({ email: 'malick@demo.linkme.sn', password: 'demo-malick-2026', handle: 'malick', displayName: 'Malick Wane' });
  const bg = seedAsset(u.id, 'bg-sunset', 'background');
  const th = Object.fromEntries(['travel', 'shop', 'music', 'content', 'contact'].map((k) => [k, seedAsset(u.id, `thumb-${k}`, 'thumbnail')]));
  Object.assign(u.profile, { taglineLines: ['Big dreams', 'Good energy', 'Real progress.'], categories: ['Travel', 'Lifestyle', 'Creator'], bio: 'Des villes, des gens, des histoires.\nEt encore tellement à vivre…', backgroundImageId: bg });
  u.stats = { followers: 245000, likes: 8400000, views30d: 12000000, updatedAt: now() };
  u.socials = [['tiktok', 245000], ['instagram', 180000], ['youtube', 94000], ['snapchat', 52000], ['x', 32000]].map(([platform, followersCount], position) => ({ id: randomUUID(), platform, url: `https://example.com/${platform}/malick`, followersCount, position, updatedAt: now() }));
  u.blocks.forEach((b) => (b.thumbnailImageId = th[b.type]));
  u.blocks[0].items = [{ id: randomUUID(), title: 'Saint-Louis, la ville aux mille couleurs', description: 'Balade sur le pont Faidherbe.', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', imageId: th.travel, position: 0 }];
  u.blocks[4].config = { whatsapp: '+221770000000', email: 'contact@example.com' };
  u.products = [
    { id: randomUUID(), title: 'Hoodie « Real progress »', priceXof: 15000, description: 'Coton épais, brodé.', stock: 25, active: true, imageIds: [th.shop], createdAt: now(), deleted: false },
    { id: randomUUID(), title: 'Preset photo « Sunset »', priceXof: 5000, description: 'Mes réglages Lightroom.', stock: null, active: true, imageIds: [th.content], createdAt: now(), deleted: false },
  ];
  u.theme.draft.background.imageId = bg;
  u.theme.published = clone(u.theme.draft);
  u.theme.version = 1;
  u.published = true;
  u.onboardingCompleted = true;
}

// ───────────── utilitaires
const findByHandle = (h) => [...db.users.values()].find((u) => u.handle === h);
const image = (id) => (id ? db.assets.get(id)?.image ?? null : null);
const embed = (url) => {
  const yt = url?.match(/^https:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{6,20})/);
  if (yt) return { provider: 'youtube', src: `https://www.youtube-nocookie.com/embed/${yt[1]}` };
  const sp = url?.match(/^https:\/\/open\.spotify\.com\/(playlist|track|album|episode|show|artist)\/([A-Za-z0-9]{10,40})/);
  return sp ? { provider: 'spotify', src: `https://open.spotify.com/embed/${sp[1]}/${sp[2]}` } : null;
};
const blockDto = (b) => ({ id: b.id, type: b.type, slug: b.slug, title: b.title, subtitle: b.subtitle, icon: b.icon, thumbnailImageId: b.thumbnailImageId, thumbnail: image(b.thumbnailImageId), url: b.url, position: b.position, visible: b.visible, config: b.config, itemCount: b.items.length });
const itemDto = (i) => ({ ...i, image: image(i.imageId), embed: embed(i.url) });
const productDto = (p) => ({ id: p.id, title: p.title, priceXof: p.priceXof, description: p.description, stock: p.stock, active: p.active, imageIds: p.imageIds, images: p.imageIds.map(image).filter(Boolean), createdAt: p.createdAt });
const publicProduct = (p) => ({ id: p.id, title: p.title, priceXof: p.priceXof, description: p.description, images: p.imageIds.map(image).filter(Boolean), available: p.active && (p.stock == null || p.stock > 0) });
const me = (u) => ({ id: u.id, email: u.email, handle: u.handle, displayName: u.profile.displayName, plan: u.plan, published: u.published, onboardingCompleted: u.onboardingCompleted,
  subscriptionStatus: u.subscriptionStatus, ...(u.subscriptionExpiresAt ? { subscriptionExpiresAt: u.subscriptionExpiresAt } : {}), admin: ADMIN_EMAILS.has(u.email) });
const profileDto = (u) => ({ handle: u.handle, ...u.profile, backgroundImage: image(u.profile.backgroundImageId), published: u.published, plan: u.plan, onboardingCompleted: u.onboardingCompleted });
const themeState = (u) => ({ draft: u.theme.draft, published: u.theme.published, version: u.theme.version, hasUnpublishedChanges: JSON.stringify(u.theme.draft) !== JSON.stringify(u.theme.published), updatedAt: u.theme.updatedAt, publishedAt: u.theme.publishedAt });

function buildPage(u, preview) {
  const theme = clone(preview ? u.theme.draft : u.theme.published ?? u.theme.draft);
  if (!theme.background.imageId && u.profile.backgroundImageId) theme.background.imageId = u.profile.backgroundImageId;
  const blocks = u.blocks.filter((b) => preview || b.visible).sort((a, b) => a.position - b.position).map(blockDto);
  const images = {};
  for (const id of [theme.background.imageId, ...blocks.map((b) => b.thumbnailImageId)]) if (id && image(id)) images[id] = image(id);
  const cats = u.profile.categories.join(' • ');
  return {
    profile: { handle: u.handle, displayName: u.profile.displayName, taglineLines: u.profile.taglineLines, categories: u.profile.categories, bio: u.profile.bio },
    stats: u.stats, socials: u.socials.map(({ platform, url, followersCount }) => ({ platform, url, followersCount })), blocks, theme, images,
    showBranding: u.plan !== 'boutique', preview,
    seo: { title: cats ? `${u.profile.displayName} — ${cats}` : u.profile.displayName, description: u.profile.bio || u.profile.displayName, ogImage: theme.background.imageId ? image(theme.background.imageId)?.urlTemplate.replace('{w}', '1080') : undefined },
  };
}

function validTheme(t) {
  const c = t?.colors, bg = t?.background, ty = t?.typography, ca = t?.cards, so = t?.social, la = t?.layout;
  if (!t || t.version !== 1 || !c || !bg || !ty || !ca || !so || !la || !t.motion) return 'structure';
  for (const k of ['accent', 'text', 'textMuted', 'cardBg', 'cardBorder', 'overlay', 'statGlow']) if (!HEX.test(c[k] ?? '')) return `colors.${k}`;
  for (const k of ['cardBgOpacity', 'cardBorderOpacity', 'overlayStrength']) if (!(c[k] >= 0 && c[k] <= 1)) return `colors.${k}`;
  if (!['image', 'gradient', 'solid'].includes(bg.type)) return 'background.type';
  if (!['kaushan-script', 'yellowtail', 'marck-script', 'caveat-brush'].includes(ty.display)) return 'typography.display';
  if (!['caveat', 'reenie-beanie'].includes(ty.hand)) return 'typography.hand';
  if (!(ty.nameScale >= 0.7 && ty.nameScale <= 1.3)) return 'typography.nameScale';
  if (!['glass', 'solid', 'outline'].includes(ca.style) || !(ca.radius >= 0 && ca.radius <= 36)) return 'cards';
  if (!['right', 'left', 'below-stats'].includes(so.position) || !['circle', 'rounded', 'square'].includes(so.shape)) return 'social';
  if (typeof la.footerText !== 'string' || la.footerText.length > 40) return 'layout.footerText';
  return null;
}

// ───────────── app
const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.text({ type: 'text/plain', limit: '4kb' }));
app.use(express.urlencoded({ extended: false }));
const cookies = (req) => Object.fromEntries((req.headers.cookie ?? '').split(/;\s*/).filter(Boolean).map((c) => c.split('=').map(decodeURIComponent)));

app.use((req, res, next) => {
  const c = cookies(req);
  req.user = c.LM_SESSION ? db.users.get(db.sessions.get(c.LM_SESSION)) : undefined;
  const mutating = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
  const exempt = /^\/api\/(public|webhooks|payments\/mock)\//.test(req.path);
  if (mutating && !exempt && (!c['XSRF-TOKEN'] || req.get('X-XSRF-TOKEN') !== c['XSRF-TOKEN'])) return problem(res, 403, 'FORBIDDEN', 'Jeton CSRF invalide.');
  next();
});
const auth = (req, res, next) => (req.user ? next() : problem(res, 401, 'UNAUTHORIZED', 'Ta session a expiré. Reconnecte-toi.'));
const login = (res, u) => {
  const sid = randomBytes(24).toString('hex');
  db.sessions.set(sid, u.id);
  res.cookie('LM_SESSION', sid, { httpOnly: true, sameSite: 'lax', path: '/' });
};

// Auth
app.get('/api/auth/csrf', (req, res) => {
  if (!cookies(req)['XSRF-TOKEN']) res.cookie('XSRF-TOKEN', randomBytes(16).toString('hex'), { sameSite: 'lax', path: '/' });
  res.status(204).end();
});
app.get('/api/auth/handle-availability', (req, res) => {
  const h = String(req.query.handle ?? '').toLowerCase();
  if (!/^[a-z0-9._-]{3,30}$/.test(h)) return res.json({ handle: h, available: false, reason: 'invalid' });
  if (RESERVED.has(h)) return res.json({ handle: h, available: false, reason: 'reserved' });
  res.json({ handle: h, available: !findByHandle(h), ...(findByHandle(h) ? { reason: 'taken' } : {}) });
});
app.post('/api/auth/register', (req, res) => {
  const { email, password, handle, displayName, acceptTerms } = req.body ?? {};
  const h = String(handle ?? '').toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email ?? '')) return bad(res, 'email', 'Email invalide.');
  if ((password ?? '').length < 10) return bad(res, 'password', '10 caractères minimum.');
  if (!displayName?.trim()) return bad(res, 'displayName', 'Obligatoire.');
  if (acceptTerms !== true) return bad(res, 'acceptTerms', 'Obligatoire.');
  if (!/^[a-z0-9._-]{3,30}$/.test(h)) return bad(res, 'handle', 'Format invalide.');
  if (RESERVED.has(h)) return problem(res, 409, 'HANDLE_RESERVED', 'Ce nom d’utilisateur est réservé.');
  if (findByHandle(h)) return problem(res, 409, 'HANDLE_TAKEN', 'Ce nom d’utilisateur est déjà pris.');
  if ([...db.users.values()].some((u) => u.email.toLowerCase() === email.toLowerCase())) return problem(res, 409, 'EMAIL_TAKEN', 'Un compte existe déjà avec cet email.');
  const u = newCreator({ email: email.toLowerCase(), password, handle: h, displayName: displayName.trim() });
  const referrer = db.users.get(db.referralCodes.get(String(req.body?.referralCode ?? '').trim().toUpperCase()));
  if (referrer && referrer.id !== u.id) u.referrerId = referrer.id; // code inconnu : ignoré (D53)
  login(res, u);
  res.status(201).json(me(u));
});
app.post('/api/auth/login', (req, res) => {
  const u = [...db.users.values()].find((x) => x.email === String(req.body?.email ?? '').toLowerCase() && x.password === req.body?.password);
  if (!u) return problem(res, 401, 'BAD_CREDENTIALS', 'Email ou mot de passe incorrect.');
  login(res, u);
  res.json(me(u));
});
app.post('/api/auth/logout', (req, res) => {
  db.sessions.delete(cookies(req).LM_SESSION);
  res.clearCookie('LM_SESSION', { path: '/' }).status(204).end();
});
app.post('/api/auth/forgot', (_req, res) => res.status(202).end());
app.post('/api/auth/reset', (_req, res) => problem(res, 400, 'TOKEN_INVALID', 'Ce lien a expiré ou a déjà été utilisé.'));
app.get('/api/me', auth, (req, res) => res.json(me(req.user)));
app.delete('/api/me', auth, (req, res) => {
  if (req.body?.password !== req.user.password) return problem(res, 401, 'BAD_CREDENTIALS', 'Mot de passe incorrect.');
  db.users.delete(req.user.id);
  res.clearCookie('LM_SESSION', { path: '/' }).status(204).end();
});

// Profil
app.get('/api/me/profile', auth, (req, res) => res.json(profileDto(req.user)));
app.put('/api/me/profile', auth, (req, res) => {
  const b = req.body ?? {};
  if (!b.displayName?.trim() || b.displayName.length > 60) return bad(res, 'displayName', 'Obligatoire (60 max).');
  if ((b.bio ?? '').length > 160) return bad(res, 'bio', '160 caractères maximum.');
  if ((b.taglineLines ?? []).length > 3 || (b.categories ?? []).length > 3) return bad(res, 'taglineLines', '3 maximum.');
  if (b.backgroundImageId && db.assets.get(b.backgroundImageId)?.owner !== req.user.id) return bad(res, 'backgroundImageId', 'Image inconnue.');
  Object.assign(req.user.profile, { displayName: b.displayName.trim(), taglineLines: (b.taglineLines ?? []).map((s) => s.trim()).filter(Boolean), categories: (b.categories ?? []).map((s) => s.trim()).filter(Boolean), bio: (b.bio ?? '').trim(), backgroundImageId: b.backgroundImageId ?? null });
  if (typeof b.published === 'boolean') req.user.published = b.published;
  if (typeof b.onboardingCompleted === 'boolean') req.user.onboardingCompleted = b.onboardingCompleted;
  res.json(profileDto(req.user));
});
app.get('/api/me/socials', auth, (req, res) => res.json(req.user.socials));
app.put('/api/me/socials', auth, (req, res) => {
  const items = req.body?.items ?? [];
  for (const [i, s] of items.entries()) if (!safeUrl(s.url)) return bad(res, `items[${i}].url`, 'URL non autorisée.');
  req.user.socials = items.map((s, position) => ({ id: randomUUID(), platform: s.platform, url: s.url, followersCount: Number(s.followersCount) || 0, position, updatedAt: now() }));
  res.json(req.user.socials);
});
app.get('/api/me/stats', auth, (req, res) => res.json(req.user.stats));
app.put('/api/me/stats', auth, (req, res) => {
  const { followers, likes, views30d } = req.body ?? {};
  if ([followers, likes, views30d].some((n) => !(Number.isInteger(n) && n >= 0))) return bad(res, 'followers', 'Nombre entier positif.');
  req.user.stats = { followers, likes, views30d, updatedAt: now() };
  res.json(req.user.stats);
});
app.get('/api/me/preview', auth, (req, res) => res.json(buildPage(req.user, true)));

// Blocs
const ownedBlock = (req, res) => req.user.blocks.find((b) => b.id === req.params.blockId) ?? (problem(res, 404, 'NOT_FOUND', 'Élément introuvable.'), null);
app.get('/api/me/blocks', auth, (req, res) => res.json([...req.user.blocks].sort((a, b) => a.position - b.position).map(blockDto)));
function applyBlock(req, res, b) {
  const x = req.body ?? {};
  if (!x.title?.trim() || x.title.length > 40) return bad(res, 'title', 'Obligatoire (40 max).');
  if (x.url && !safeUrl(x.url)) return bad(res, 'url', 'URL non autorisée.');
  if (x.type === 'link' && !x.url) return bad(res, 'url', 'Un lien simple doit avoir une URL.');
  if (x.thumbnailImageId && db.assets.get(x.thumbnailImageId)?.owner !== req.user.id) return bad(res, 'thumbnailImageId', 'Image inconnue.');
  Object.assign(b, { title: x.title.trim(), subtitle: (x.subtitle ?? '').trim(), icon: x.icon ?? b.icon, thumbnailImageId: x.thumbnailImageId ?? null, url: x.url ?? null, visible: x.visible ?? true, config: x.config ?? {} });
  return b;
}
app.post('/api/me/blocks', auth, (req, res) => {
  const base = req.body?.type === 'link' ? String(req.body.title ?? 'lien').toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'lien' : ({ travel: 'voyages', shop: 'shop', music: 'sons', content: 'contenus', contact: 'contact' })[req.body?.type] ?? 'bloc';
  let slug = base;
  for (let n = 2; req.user.blocks.some((b) => b.slug === slug); n++) slug = `${base}-${n}`;
  const b = { id: randomUUID(), type: req.body?.type, slug, position: req.user.blocks.length, items: [] };
  if (!applyBlock(req, res, b)) return;
  req.user.blocks.push(b);
  res.status(201).json(blockDto(b));
});
app.put('/api/me/blocks/order', auth, (req, res) => {
  const ids = req.body?.ids ?? [];
  if (ids.length !== req.user.blocks.length || !req.user.blocks.every((b) => ids.includes(b.id))) return bad(res, 'ids', 'La liste doit contenir exactement tous les blocs.');
  ids.forEach((id, i) => (req.user.blocks.find((b) => b.id === id).position = i));
  res.json([...req.user.blocks].sort((a, b) => a.position - b.position).map(blockDto));
});
app.put('/api/me/blocks/:blockId', auth, (req, res) => {
  const b = ownedBlock(req, res);
  if (b && applyBlock(req, res, b)) res.json(blockDto(b));
});
app.delete('/api/me/blocks/:blockId', auth, (req, res) => {
  const b = ownedBlock(req, res);
  if (!b) return;
  req.user.blocks = req.user.blocks.filter((x) => x !== b).sort((a, c) => a.position - c.position);
  req.user.blocks.forEach((x, i) => (x.position = i));
  res.status(204).end();
});
app.get('/api/me/blocks/:blockId/items', auth, (req, res) => {
  const b = ownedBlock(req, res);
  if (b) res.json(b.items.map(itemDto));
});
app.post('/api/me/blocks/:blockId/items', auth, (req, res) => {
  const b = ownedBlock(req, res);
  if (!b) return;
  const x = req.body ?? {};
  if (!x.title?.trim()) return bad(res, 'title', 'Obligatoire.');
  if (x.url && !safeUrl(x.url)) return bad(res, 'url', 'URL non autorisée.');
  const i = { id: randomUUID(), title: x.title.trim(), description: x.description ?? '', url: x.url ?? null, imageId: x.imageId ?? null, position: b.items.length };
  b.items.push(i);
  res.status(201).json(itemDto(i));
});
app.put('/api/me/blocks/:blockId/items/order', auth, (req, res) => {
  const b = ownedBlock(req, res);
  if (!b) return;
  (req.body?.ids ?? []).forEach((id, k) => { const it = b.items.find((i) => i.id === id); if (it) it.position = k; });
  b.items.sort((x, y) => x.position - y.position);
  res.json(b.items.map(itemDto));
});
app.put('/api/me/blocks/:blockId/items/:itemId', auth, (req, res) => {
  const b = ownedBlock(req, res);
  const i = b?.items.find((x) => x.id === req.params.itemId);
  if (!i) return b && problem(res, 404, 'NOT_FOUND', 'Élément introuvable.');
  if (req.body?.url && !safeUrl(req.body.url)) return bad(res, 'url', 'URL non autorisée.');
  Object.assign(i, { title: req.body.title, description: req.body.description ?? '', url: req.body.url ?? null, imageId: req.body.imageId ?? null });
  res.json(itemDto(i));
});
app.delete('/api/me/blocks/:blockId/items/:itemId', auth, (req, res) => {
  const b = ownedBlock(req, res);
  if (!b) return;
  b.items = b.items.filter((i) => i.id !== req.params.itemId);
  b.items.forEach((i, k) => (i.position = k));
  res.status(204).end();
});

// Thème
app.get('/api/me/theme', auth, (req, res) => res.json(themeState(req.user)));
app.put('/api/me/theme', auth, (req, res) => {
  const err = validTheme(req.body);
  if (err) return bad(res, err, 'Valeur invalide.');
  if (req.body.background.imageId && db.assets.get(req.body.background.imageId)?.owner !== req.user.id) return bad(res, 'background.imageId', 'Image inconnue.');
  req.user.theme.draft = clone(req.body);
  req.user.theme.updatedAt = now();
  res.json(themeState(req.user));
});
app.post('/api/me/theme/publish', auth, (req, res) => {
  const t = req.user.theme;
  Object.assign(t, { published: clone(t.draft), version: t.version + 1, publishedAt: now(), updatedAt: now() });
  req.user.published = true;
  res.json(themeState(req.user));
});
app.get('/api/theme/presets', (_req, res) => res.json(PRESETS));

// Uploads : pas de Cloudinary dans le mock → 503 sur /sign, upload local accepté (image générée par le seed)
app.post('/api/me/uploads/sign', auth, (_req, res) => problem(res, 503, 'UPLOAD_UNAVAILABLE', 'Cloudinary n’est pas configuré.'));
app.post('/api/me/uploads/complete', auth, (_req, res) => problem(res, 503, 'UPLOAD_UNAVAILABLE', 'Cloudinary n’est pas configuré.'));
app.post('/api/me/uploads/local', auth, express.raw({ type: 'multipart/form-data', limit: '9mb' }), (req, res) => {
  const kind = /name="kind"\r\n\r\n(\w+)/.exec(req.body?.toString('latin1') ?? '')?.[1] ?? 'thumbnail';
  // le mock ne stocke pas le fichier : il renvoie une image du seed (suffisant pour l'e2e)
  const id = seedAsset(req.user.id, kind === 'background' ? 'bg-sunset' : 'thumb-travel', kind);
  res.status(201).json(image(id));
});

// Public
const published = (req, res) => {
  const u = findByHandle(String(req.params.handle).toLowerCase());
  if (!u || !u.published) return problem(res, 404, 'NOT_FOUND', 'Élément introuvable.'), null;
  return u;
};
app.get('/api/public/orders/:reference', (req, res) => {
  const o = db.orders.get(req.params.reference);
  if (!o) return problem(res, 404, 'NOT_FOUND', 'Élément introuvable.');
  const u = db.users.get(o.creatorId);
  res.json({ reference: o.reference, status: o.status, amountXof: o.amountXof, productTitle: o.productTitle, quantity: o.quantity, creatorHandle: u?.handle, creatorName: u?.profile.displayName, paidAt: o.paidAt ?? null });
});
app.get('/api/public/:handle', (req, res) => {
  const u = published(req, res);
  if (u) res.json(buildPage(u, false));
});
app.get('/api/public/:handle/blocks/:slug', (req, res) => {
  const u = published(req, res);
  if (!u) return;
  const b = u.blocks.find((x) => x.slug === req.params.slug && x.visible);
  if (!b) return problem(res, 404, 'NOT_FOUND', 'Élément introuvable.');
  res.json({ block: blockDto(b), items: b.type === 'shop' ? [] : b.items.map(itemDto), products: b.type === 'shop' ? u.products.filter((p) => !p.deleted && p.active).map(publicProduct) : [] });
});
app.get('/api/public/:handle/products/:productId', (req, res) => {
  const u = published(req, res);
  const p = u?.products.find((x) => x.id === req.params.productId && !x.deleted && x.active);
  if (!u) return;
  if (!p) return problem(res, 404, 'NOT_FOUND', 'Élément introuvable.');
  res.json(publicProduct(p));
});
app.post('/api/public/:handle/events', (req, res) => {
  const u = published(req, res);
  if (!u) return;
  const ev = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body;
  if (!['page_view', 'link_click'].includes(ev?.type)) return bad(res, 'type', 'Type invalide.');
  db.analytics.push({ creatorId: u.id, ...ev, at: now() });
  res.status(202).end();
});
app.post('/api/public/:handle/contact', (req, res) => {
  const u = published(req, res);
  if (!u) return;
  const b = req.body ?? {};
  if (b.website) return res.status(202).end();
  if (!b.name?.trim() || (b.message ?? '').trim().length < 5) return bad(res, 'message', 'Message trop court.');
  if (!b.email && !b.phone) return bad(res, 'email', 'Indique un email ou un numéro de téléphone.');
  db.messages.push({ id: randomUUID(), creatorId: u.id, name: b.name, email: b.email ?? null, phone: b.phone ?? null, message: b.message, createdAt: now() });
  res.status(202).end();
});
app.post('/api/public/:handle/checkout', (req, res) => {
  const u = published(req, res);
  if (!u) return;
  const b = req.body ?? {};
  if (b.idempotencyKey) {
    const ex = [...db.orders.values()].find((o) => o.creatorId === u.id && o.idempotencyKey === b.idempotencyKey);
    if (ex) return res.status(201).json({ reference: ex.reference, paymentUrl: ex.paymentUrl, status: ex.status, amountXof: ex.amountXof });
  }
  const p = u.products.find((x) => x.id === b.productId && !x.deleted && x.active);
  if (!p) return problem(res, 404, 'NOT_FOUND', 'Élément introuvable.');
  const qty = Number(b.quantity);
  if (!(qty >= 1 && qty <= 10)) return bad(res, 'quantity', '1 à 10.');
  if (!/^\+?[0-9 ]{8,20}$/.test(b.buyerPhone ?? '')) return bad(res, 'buyerPhone', 'Numéro invalide.');
  if (p.stock != null && p.stock < qty) return problem(res, 409, 'OUT_OF_STOCK', 'Ce produit n’est plus disponible.');
  const amountXof = p.priceXof * qty;
  const commissionXof = Math.floor((amountXof * COMMISSION) / 100);
  const reference = 'LM-' + Array.from(randomBytes(12), (x) => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[x % 32]).join('');
  const o = { reference, creatorId: u.id, productId: p.id, productTitle: p.title, quantity: qty, amountXof, commissionXof, netXof: amountXof - commissionXof, status: 'PENDING', provider: 'mock', buyerName: b.buyerName, buyerPhone: b.buyerPhone, buyerEmail: b.buyerEmail ?? null, idempotencyKey: b.idempotencyKey, createdAt: now(), paidAt: null, payoutStatus: 'NONE', needsAttention: false, paymentUrl: `/api/payments/mock/${reference}` };
  db.orders.set(reference, o);
  res.status(201).json({ reference, paymentUrl: o.paymentUrl, status: o.status, amountXof });
});

// Paiement simulé + webhook signé
app.get('/api/payments/mock/:reference', (req, res) => {
  const o = db.orders.get(req.params.reference);
  if (!o) return problem(res, 404, 'NOT_FOUND', 'Élément introuvable.');
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
  res.type('html').send(`<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Paiement simulé</title>
<body style="font-family:system-ui;background:#0e1016;color:#eef0f5;display:grid;place-items:center;min-height:100vh;margin:0"><main style="background:#161922;padding:28px;border-radius:16px;max-width:360px">
<h1 style="font-size:18px">Paiement simulé (mode test)</h1><p>${esc(o.productTitle)} × ${o.quantity} — ${o.amountXof} FCFA</p>
<form method="post" action="/api/payments/mock/${esc(o.reference)}/complete?outcome=success"><button style="width:100%;min-height:48px">Payer avec Wave (simulé)</button></form>
<form method="post" action="/api/payments/mock/${esc(o.reference)}/complete?outcome=failure"><button style="width:100%;min-height:48px;margin-top:8px">Simuler un échec</button></form></main></body></html>`);
});
function webhook(payload, signature) {
  const body = JSON.stringify(payload);
  if (createHmac('sha256', MOCK_SECRET).update(body).digest('hex') !== signature) return { status: 401, code: 'INVALID_SIGNATURE' };
  if (db.events.has(payload.event_id)) return { status: 200, outcome: 'DUPLICATE' };
  db.events.add(payload.event_id);
  const o = db.orders.get(payload.reference);
  if (!o) return { status: 400, code: 'UNKNOWN_ORDER' };
  if (o.status !== 'PENDING') return { status: 200, outcome: 'ALREADY_FINAL' };
  if (payload.amount !== o.amountXof) { o.needsAttention = true; return { status: 400, code: 'AMOUNT_MISMATCH' }; }
  o.status = payload.status;
  if (o.status === 'PAID') {
    o.paidAt = now();
    o.payoutStatus = 'PENDING_PAYOUT';
    const p = db.users.get(o.creatorId)?.products.find((x) => x.id === o.productId);
    if (p && p.stock != null) p.stock = Math.max(0, p.stock - o.quantity);
  }
  return { status: 200, outcome: 'PROCESSED' };
}
app.post('/api/payments/mock/:reference/complete', (req, res) => {
  const o = db.orders.get(req.params.reference);
  if (!o) return problem(res, 404, 'NOT_FOUND', 'Élément introuvable.');
  const status = { success: 'PAID', failure: 'FAILED', cancel: 'CANCELED' }[req.query.outcome];
  const payload = { event_id: `evt_${randomUUID()}`, reference: o.reference, status, amount: o.amountXof, currency: 'XOF' };
  webhook(payload, createHmac('sha256', MOCK_SECRET).update(JSON.stringify(payload)).digest('hex'));
  res.redirect(303, `${BASE}/${db.users.get(o.creatorId)?.handle}/commande/${o.reference}`);
});
app.post('/api/webhooks/:provider', (req, res) => {
  const r = webhook(req.body, req.get('X-Mock-Signature'));
  r.code ? problem(res, r.status, r.code, r.code) : res.json({ status: r.outcome });
});

// Boutique créateur
app.get('/api/me/products', auth, (req, res) => res.json(req.user.products.filter((p) => !p.deleted).map(productDto)));
function applyProduct(req, res, p) {
  const b = req.body ?? {};
  if (!b.title?.trim()) return bad(res, 'title', 'Obligatoire.');
  if (!Number.isInteger(b.priceXof) || b.priceXof < 100 || b.priceXof > 10_000_000) return bad(res, 'priceXof', 'Entre 100 et 10 000 000 FCFA.');
  if (!Array.isArray(b.imageIds) || b.imageIds.length < 1 || b.imageIds.length > 5) return bad(res, 'imageIds', '1 à 5 photos.');
  if (b.imageIds.some((id) => db.assets.get(id)?.owner !== req.user.id)) return bad(res, 'imageIds', 'Image inconnue.');
  Object.assign(p, { title: b.title.trim(), priceXof: b.priceXof, description: b.description ?? '', stock: b.stock ?? null, active: !!b.active, imageIds: b.imageIds });
  return p;
}
app.post('/api/me/products', auth, (req, res) => {
  const p = { id: randomUUID(), createdAt: now(), deleted: false };
  if (!applyProduct(req, res, p)) return;
  req.user.products.unshift(p);
  res.status(201).json(productDto(p));
});
app.put('/api/me/products/:productId', auth, (req, res) => {
  const p = req.user.products.find((x) => x.id === req.params.productId && !x.deleted);
  if (!p) return problem(res, 404, 'NOT_FOUND', 'Élément introuvable.');
  if (applyProduct(req, res, p)) res.json(productDto(p));
});
app.delete('/api/me/products/:productId', auth, (req, res) => {
  const p = req.user.products.find((x) => x.id === req.params.productId);
  if (p) p.deleted = true;
  res.status(204).end();
});
app.get('/api/me/orders', auth, (req, res) => {
  const items = [...db.orders.values()].filter((o) => o.creatorId === req.user.id && (!req.query.status || o.status === req.query.status)).reverse()
    .map((o) => ({ id: o.reference, reference: o.reference, status: o.status, amountXof: o.amountXof, commissionXof: o.commissionXof, netXof: o.netXof, provider: o.provider, productTitle: o.productTitle, quantity: o.quantity, buyerName: o.buyerName, buyerPhone: o.buyerPhone, buyerEmail: o.buyerEmail, payoutStatus: o.payoutStatus, needsAttention: o.needsAttention, createdAt: o.createdAt, paidAt: o.paidAt }));
  res.json({ items, page: { page: 0, size: 100, totalElements: items.length, totalPages: 1 } });
});
app.get('/api/me/earnings', auth, (req, res) => {
  const paid = [...db.orders.values()].filter((o) => o.creatorId === req.user.id && o.status === 'PAID');
  const sum = (f) => paid.reduce((a, o) => a + f(o), 0);
  const days = Array.from({ length: 30 }, (_, i) => new Date(Date.now() - (29 - i) * 86400000).toISOString().slice(0, 10));
  res.json({ grossXof: sum((o) => o.amountXof), commissionXof: sum((o) => o.commissionXof), netXof: sum((o) => o.netXof), pendingPayoutXof: sum((o) => (o.payoutStatus === 'PENDING_PAYOUT' ? o.netXof : 0)), paidOutXof: 0, paidOrders: paid.length, commissionPercent: COMMISSION,
    last30Days: days.map((date) => ({ date, netXof: paid.filter((o) => o.paidAt?.startsWith(date)).reduce((a, o) => a + o.netXof, 0), orders: paid.filter((o) => o.paidAt?.startsWith(date)).length })) });
});
app.get('/api/me/messages', auth, (req, res) => {
  const items = db.messages.filter((m) => m.creatorId === req.user.id).reverse();
  res.json({ items, page: { page: 0, size: 100, totalElements: items.length, totalPages: 1 } });
});
app.get('/api/me/analytics', auth, (req, res) => {
  const days = Number(req.query.days) === 30 ? 30 : 7;
  const ev = db.analytics.filter((e) => e.creatorId === req.user.id);
  const dates = Array.from({ length: days }, (_, i) => new Date(Date.now() - (days - 1 - i) * 86400000).toISOString().slice(0, 10));
  const byTarget = {};
  ev.filter((e) => e.type === 'link_click').forEach((e) => (byTarget[e.target ?? ''] = (byTarget[e.target ?? ''] ?? 0) + 1));
  res.json({ days, pageViews: ev.filter((e) => e.type === 'page_view').length, uniqueVisitors: ev.filter((e) => e.type === 'page_view').length, clicks: ev.filter((e) => e.type === 'link_click').length,
    byDay: dates.map((date) => ({ date, pageViews: ev.filter((e) => e.type === 'page_view' && e.at.startsWith(date)).length, clicks: ev.filter((e) => e.type === 'link_click' && e.at.startsWith(date)).length })),
    byBlock: Object.entries(byTarget).map(([target, clicks]) => ({ blockId: null, target, title: target, clicks })) });
});

// ───────────── Abonnements (D44–D47)
app.get('/api/subscriptions/plans', (_req, res) => res.json([
  { plan: 'standard', priceXof: PRICES.standard, periodDays: PERIOD_DAYS, hasShop: false },
  { plan: 'boutique', priceXof: PRICES.boutique, periodDays: PERIOD_DAYS, hasShop: true },
]));
app.get('/api/me/subscription', auth, (req, res) => {
  const u = req.user;
  const days = u.subscriptionExpiresAt ? Math.max(0, Math.floor((Date.parse(u.subscriptionExpiresAt) - Date.now()) / 86400000)) : null;
  res.json({ plan: u.plan, status: u.subscriptionStatus, canPublish: u.subscriptionStatus === 'active', ...(u.subscriptionExpiresAt ? { expiresAt: u.subscriptionExpiresAt, daysRemaining: days } : {}) });
});
const normPhone = (raw) => { const s = String(raw ?? '').trim(); return (s.startsWith('+') ? '+' : '') + s.replace(/\D/g, ''); };
const phoneOk = (raw) => { const n = normPhone(raw).replace(/\D/g, '').length; return n >= 8 && n <= 15; };
app.post('/api/me/subscription/checkout', auth, (req, res) => {
  const { plan, phone } = req.body ?? {};
  if (!['standard', 'boutique'].includes(plan)) return bad(res, 'plan', 'Plan inconnu.');
  if (!phoneOk(phone)) return bad(res, 'phone', 'Numéro de téléphone invalide.');
  req.user.phone ??= normPhone(phone);
  const reference = 'SB-' + randomCode(12);
  const p = { id: randomUUID(), reference, creatorId: req.user.id, plan, amountXof: PRICES[plan], status: 'PENDING', payerPhone: normPhone(phone), paidAt: null };
  db.subPayments.set(reference, p);
  res.json({ reference, paymentUrl: `/api/payments/mock/subscription/${reference}`, status: 'PENDING', amountXof: p.amountXof });
});
app.get('/api/me/subscription/payments/:reference', auth, (req, res) => {
  const p = db.subPayments.get(req.params.reference);
  if (!p || p.creatorId !== req.user.id) return problem(res, 404, 'NOT_FOUND', 'Élément introuvable.');
  res.json({ reference: p.reference, status: p.status, plan: p.plan, amountXof: p.amountXof, ...(p.paidAt ? { paidAt: p.paidAt } : {}) });
});
app.get('/api/payments/mock/subscription/:reference', (req, res) => {
  const p = db.subPayments.get(req.params.reference);
  if (!p) return problem(res, 404, 'NOT_FOUND', 'Élément introuvable.');
  res.type('html').send(`<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Paiement simulé</title>
<body style="font-family:system-ui;background:#0e1016;color:#eef0f5;display:grid;place-items:center;min-height:100vh;margin:0"><main style="background:#161922;padding:28px;border-radius:16px;max-width:360px">
<h1 style="font-size:18px">Abonnement (mode test)</h1><p>${p.plan} — ${p.amountXof} FCFA</p>
<form method="post" action="/api/payments/mock/subscription/${p.reference}/complete?outcome=success"><button style="width:100%;min-height:48px">Payer avec Wave (simulé)</button></form>
<form method="post" action="/api/payments/mock/subscription/${p.reference}/complete?outcome=failure"><button style="width:100%;min-height:48px;margin-top:8px">Simuler un échec</button></form></main></body></html>`);
});
function effectiveRate(u, at = Date.now()) {
  return u.collab && Date.parse(u.collab.expiresAt) > at ? Math.max(BASE_RATE_BPS, u.collab.rateBps) : BASE_RATE_BPS;
}
function creditReferrer(p) {
  const referee = db.users.get(p.creatorId);
  const referrer = referee?.referrerId && db.users.get(referee.referrerId);
  if (!referrer || db.earnings.some((e) => e.paymentId === p.id)) return;
  const rateBps = effectiveRate(referrer, Date.parse(p.paidAt));
  const knownPhones = new Set([referrer.phone, ...[...db.subPayments.values()].filter((x) => x.creatorId === referrer.id).map((x) => x.payerPhone),
    ...[...db.withdrawals.values()].filter((w) => w.userId === referrer.id).map((w) => w.phone)].filter(Boolean));
  const blocked = knownPhones.has(p.payerPhone) ? 'SELF_PAYMENT' : null;
  const e = { id: randomUUID(), referrerId: referrer.id, refereeId: referee.id, paymentId: p.id, baseAmountXof: p.amountXof, rateBps,
    amountXof: Math.floor((p.amountXof * rateBps) / 10000), blockedReason: blocked, availableAt: new Date(Date.parse(p.paidAt) + HOLD_DAYS * 86400000).toISOString(), createdAt: now() };
  db.earnings.push(e);
  if (!blocked && e.amountXof > 0) db.wallet.push({ userId: referrer.id, kind: 'REFERRAL_EARNING', amountXof: e.amountXof, availableAt: e.availableAt });
}
app.post('/api/payments/mock/subscription/:reference/complete', (req, res) => {
  const p = db.subPayments.get(req.params.reference);
  if (!p) return problem(res, 404, 'NOT_FOUND', 'Élément introuvable.');
  if (p.status === 'PENDING') {
    p.status = { success: 'PAID', failure: 'FAILED', cancel: 'CANCELED' }[req.query.outcome] ?? 'FAILED';
    if (p.status === 'PAID') {
      const u = db.users.get(p.creatorId);
      p.paidAt = now();
      const from = u.subscriptionStatus === 'active' && Date.parse(u.subscriptionExpiresAt) > Date.now() ? Date.parse(u.subscriptionExpiresAt) : Date.now();
      Object.assign(u, { plan: p.plan, subscriptionStatus: 'active', subscriptionExpiresAt: new Date(from + PERIOD_DAYS * 86400000).toISOString() });
      creditReferrer(p);
    }
  }
  res.redirect(303, `${BASE}/app/abonnement/${p.reference}`);
});

// ───────────── Parrainage & portefeuille (D51–D56)
const maskName = (raw) => {
  const w = String(raw ?? '').trim().split(/\s+/).filter(Boolean);
  if (!w.length) return '***';
  const first = [...w[0]];
  return first.slice(0, first.length >= 4 ? 2 : 1).join('') + '***' + (w.length > 1 ? ' ' + [...w[w.length - 1]][0].toUpperCase() + '.' : '');
};
const maskPhone = (raw) => {
  if (!raw) return null;
  const p = normPhone(raw);
  if (p.startsWith('+221') && p.length === 13) return `+221 ${p.slice(4, 6)} *** ** ${p.slice(11)}`;
  return p.length <= 6 ? '***' : p.slice(0, 4) + '*'.repeat(p.length - 6) + p.slice(-2);
};
function ensureCode(u) {
  if (!u.referralCode) { do u.referralCode = randomCode(8); while (db.referralCodes.has(u.referralCode)); db.referralCodes.set(u.referralCode, u.id); }
  return u.referralCode;
}
const collabDto = (u) => (u.collab && Date.parse(u.collab.expiresAt) > Date.now() ? { collab: u.collab } : {});
const sumCredited = (id) => db.earnings.filter((e) => e.referrerId === id && !e.blockedReason).reduce((a, e) => a + e.amountXof, 0);
app.get('/api/auth/referral-codes/:code', (req, res) => {
  const u = db.users.get(db.referralCodes.get(String(req.params.code).toUpperCase()));
  if (!u) return problem(res, 404, 'NOT_FOUND', 'Élément introuvable.');
  res.json({ code: u.referralCode, referrerName: u.profile.displayName });
});
app.get('/api/me/referrals', auth, (req, res) => {
  const u = req.user;
  const code = ensureCode(u);
  const rate = effectiveRate(u);
  const refs = [...db.users.values()].filter((x) => x.referrerId === u.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  let current = 0, potential = 0, active = 0;
  const referees = refs.map((r) => {
    const status = r.subscriptionStatus === 'active' ? 'active' : r.subscriptionStatus === 'expired' ? 'expired' : 'registered';
    const per = Math.floor((PRICES[r.plan] ?? PRICES.standard) * rate / 10000);
    if (status === 'active') { active++; current += per; } else potential += per;
    const earned = db.earnings.filter((e) => e.refereeId === r.id && e.referrerId === u.id && !e.blockedReason).reduce((a, e) => a + e.amountXof, 0);
    return { maskedName: maskName(r.profile.displayName), ...(r.phone ? { maskedPhone: maskPhone(r.phone) } : {}), joinedAt: r.createdAt, status, earnedXof: earned };
  });
  const recentEarnings = db.earnings.filter((e) => e.referrerId === u.id).slice(-20).reverse().map((e) => ({
    id: e.id, createdAt: e.createdAt, refereeMaskedName: maskName(db.users.get(e.refereeId)?.profile.displayName), baseAmountXof: e.baseAmountXof, rateBps: e.rateBps,
    amountXof: e.amountXof, status: e.blockedReason ? 'blocked' : Date.parse(e.availableAt) > Date.now() ? 'held' : 'available', availableAt: e.availableAt,
    ...(e.blockedReason ? { blockReason: e.blockedReason } : {}) }));
  res.json({ code, link: `${BASE}/r/${code}`, baseRateBps: BASE_RATE_BPS, effectiveRateBps: rate, ...collabDto(u),
    stats: { signups: refs.length, activeReferees: active, realEarnedXof: sumCredited(u.id), currentMonthlyXof: current, potentialMonthlyXof: potential }, referees, recentEarnings });
});
const withdrawalDto = (w) => ({ id: w.id, amountXof: w.amountXof, method: w.method, maskedPhone: maskPhone(w.phone), status: w.status, createdAt: w.createdAt,
  ...(w.processedAt ? { processedAt: w.processedAt } : {}), ...(w.status === 'REJECTED' && w.note ? { note: w.note } : {}) });
const available = (id) => db.wallet.filter((x) => x.userId === id && Date.parse(x.availableAt) <= Date.now()).reduce((a, x) => a + x.amountXof, 0);
app.get('/api/me/wallet', auth, (req, res) => {
  const id = req.user.id;
  const held = db.wallet.filter((x) => x.userId === id && x.kind === 'REFERRAL_EARNING' && Date.parse(x.availableAt) > Date.now());
  const mine = [...db.withdrawals.values()].filter((w) => w.userId === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const sum = (st) => mine.filter((w) => w.status === st).reduce((a, w) => a + w.amountXof, 0);
  const next = held.map((x) => x.availableAt).sort()[0];
  res.json({ availableXof: available(id), heldXof: held.reduce((a, x) => a + x.amountXof, 0), pendingWithdrawalXof: sum('REQUESTED'), totalEarnedXof: sumCredited(id),
    totalWithdrawnXof: sum('PAID'), minWithdrawalXof: MIN_WITHDRAWAL, holdDays: HOLD_DAYS, ...(next ? { nextReleaseAt: next } : {}), withdrawals: mine.slice(0, 20).map(withdrawalDto) });
});
app.post('/api/me/wallet/withdrawals', auth, (req, res) => {
  const { amountXof, method, phone, idempotencyKey } = req.body ?? {};
  if (!phoneOk(phone)) return bad(res, 'phone', 'Numéro de téléphone invalide.');
  if (!['wave', 'orange_money', 'free_money'].includes(method)) return bad(res, 'method', 'Moyen de retrait inconnu.');
  if (!Number.isInteger(amountXof) || amountXof < MIN_WITHDRAWAL) return bad(res, 'amountXof', 'Le retrait minimum est de 1 500 FCFA.');
  const mine = [...db.withdrawals.values()].filter((w) => w.userId === req.user.id);
  const same = idempotencyKey && mine.find((w) => w.idempotencyKey === idempotencyKey);
  if (same) return res.status(201).json(withdrawalDto(same));
  if (mine.some((w) => w.status === 'REQUESTED')) return problem(res, 409, 'WITHDRAWAL_PENDING', 'Une demande de retrait est déjà en cours de traitement.');
  if (amountXof > available(req.user.id)) return problem(res, 409, 'INSUFFICIENT_BALANCE', 'Solde retirable insuffisant.');
  const w = { id: randomUUID(), userId: req.user.id, amountXof, method, phone: normPhone(phone), status: 'REQUESTED', idempotencyKey, createdAt: now(), processedAt: null, note: null, providerRef: null };
  db.withdrawals.set(w.id, w);
  db.wallet.push({ userId: w.userId, kind: 'WITHDRAWAL', amountXof: -amountXof, availableAt: w.createdAt });
  res.status(201).json(withdrawalDto(w));
});

// ───────────── Admin (D56)
const admin = (req, res, next) => (!req.user ? problem(res, 401, 'UNAUTHORIZED', 'Ta session a expiré. Reconnecte-toi.') : ADMIN_EMAILS.has(req.user.email) ? next() : problem(res, 403, 'FORBIDDEN', 'Accès refusé.'));
const adminWithdrawal = (w) => {
  const u = db.users.get(w.userId);
  const refs = [...db.users.values()].filter((x) => x.referrerId === u.id);
  return { ...withdrawalDto(w), phone: w.phone, maskedPhone: undefined, ...(w.providerRef ? { providerRef: w.providerRef } : {}), ...(w.note ? { note: w.note } : {}),
    creator: { userId: u.id, handle: u.handle, displayName: u.profile.displayName, email: u.email },
    signals: { blockedSelfPayments: db.earnings.filter((e) => e.referrerId === u.id && e.blockedReason).length, sameDayIpReferrals: 0, referees: refs.length, activeReferees: refs.filter((r) => r.subscriptionStatus === 'active').length } };
};
app.get('/api/admin/withdrawals', admin, (req, res) => {
  const st = req.query.status;
  res.json([...db.withdrawals.values()].filter((w) => !st || w.status === st).sort((a, b) => (st ? a.createdAt.localeCompare(b.createdAt) : b.createdAt.localeCompare(a.createdAt))).map(adminWithdrawal));
});
function decideWithdrawal(action) {
  return (req, res) => {
    const w = db.withdrawals.get(req.params.id);
    if (!w) return problem(res, 404, 'NOT_FOUND', 'Élément introuvable.');
    const note = String(req.body?.note ?? '').trim();
    if (action === 'reject' && !note) return bad(res, 'note', 'Indique le motif du refus (il sera visible par le créateur).');
    if (w.status !== 'REQUESTED') return problem(res, 409, 'WITHDRAWAL_FINAL', 'Cette demande a déjà été traitée.');
    Object.assign(w, { status: action === 'pay' ? 'PAID' : 'REJECTED', processedAt: now(), note: note || null, providerRef: String(req.body?.providerRef ?? '').trim() || null });
    if (w.status === 'REJECTED') db.wallet.push({ userId: w.userId, kind: 'WITHDRAWAL_REVERSAL', amountXof: w.amountXof, availableAt: w.processedAt });
    res.json(adminWithdrawal(w));
  };
}
app.post('/api/admin/withdrawals/:id/pay', admin, decideWithdrawal('pay'));
app.post('/api/admin/withdrawals/:id/reject', admin, decideWithdrawal('reject'));
const adminReferrer = (u) => {
  const refs = [...db.users.values()].filter((x) => x.referrerId === u.id);
  return { userId: u.id, handle: u.handle, displayName: u.profile.displayName, code: ensureCode(u), baseRateBps: BASE_RATE_BPS, effectiveRateBps: effectiveRate(u), ...collabDto(u),
    referees: refs.length, activeReferees: refs.filter((r) => r.subscriptionStatus === 'active').length, totalEarnedXof: sumCredited(u.id) };
};
app.get('/api/admin/referrers/:handle', admin, (req, res) => {
  const u = findByHandle(String(req.params.handle).toLowerCase());
  u ? res.json(adminReferrer(u)) : problem(res, 404, 'NOT_FOUND', 'Élément introuvable.');
});
app.put('/api/admin/referrers/:handle/collab', admin, (req, res) => {
  const u = findByHandle(String(req.params.handle).toLowerCase());
  if (!u) return problem(res, 404, 'NOT_FOUND', 'Élément introuvable.');
  const { rateBps, expiresAt } = req.body ?? {};
  if (!Number.isInteger(rateBps) || rateBps < 2000 || rateBps > 6000) return bad(res, 'rateBps', 'Le taux collab doit être compris entre 20 % et 60 %.');
  if (!(Date.parse(expiresAt) > Date.now())) return bad(res, 'expiresAt', 'La date d’expiration doit être dans le futur.');
  u.collab = { rateBps, expiresAt: new Date(expiresAt).toISOString() };
  res.json(adminReferrer(u));
});
app.delete('/api/admin/referrers/:handle/collab', admin, (req, res) => {
  const u = findByHandle(String(req.params.handle).toLowerCase());
  if (!u) return problem(res, 404, 'NOT_FOUND', 'Élément introuvable.');
  u.collab = null;
  res.json(adminReferrer(u));
});

app.use((req, res) => problem(res, 404, 'NOT_FOUND', 'Élément introuvable.'));
app.listen(PORT, () => console.log(`Mock API LinkMe sur http://localhost:${PORT} (démo : malick@demo.linkme.sn / demo-malick-2026)`));
