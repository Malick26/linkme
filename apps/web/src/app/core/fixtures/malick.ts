import type { Block, PublicBlockDetail, PublicPage } from '../api/types';
import { DEFAULT_THEME } from '../theme/presets';
import { SEED_IMAGES } from './seed-images';

/** Seed de démonstration « Malick Wane » (brief annexe A) — textes de la maquette. */
const blocks: Block[] = [
  { id: '00000000-0000-4000-8000-000000000b01', type: 'travel', slug: 'voyages', title: 'Mes voyages', subtitle: 'Découvre mes dernières aventures', icon: 'plane', thumbnailImageId: 'seed-thumb-travel', position: 0, visible: true, itemCount: 3 },
  { id: '00000000-0000-4000-8000-000000000b02', type: 'shop', slug: 'shop', title: 'Mon shop', subtitle: 'Mes outfits & mes coups de cœur', icon: 'shopping-bag', thumbnailImageId: 'seed-thumb-shop', position: 1, visible: true, itemCount: 2 },
  { id: '00000000-0000-4000-8000-000000000b03', type: 'music', slug: 'sons', title: 'Mes sons', subtitle: 'Playlists, recommandations, vibes', icon: 'music', thumbnailImageId: 'seed-thumb-music', position: 2, visible: true, itemCount: 2 },
  { id: '00000000-0000-4000-8000-000000000b04', type: 'content', slug: 'contenus', title: 'Mes contenus', subtitle: 'Vlogs, behind the scenes, projets', icon: 'clapperboard', thumbnailImageId: 'seed-thumb-content', position: 3, visible: true, itemCount: 2 },
  { id: '00000000-0000-4000-8000-000000000b05', type: 'contact', slug: 'contact', title: 'Me contacter', subtitle: 'Projets, collabs, opportunités', icon: 'mail', thumbnailImageId: 'seed-thumb-contact', position: 4, visible: true, itemCount: 0, config: { whatsapp: '+221770000000', email: 'contact@example.com', phone: '+221770000000' } },
];

export const MALICK_PAGE: PublicPage = {
  profile: {
    handle: 'malick',
    displayName: 'Malick Wane',
    taglineLines: ['Big dreams', 'Good energy', 'Real progress.'],
    categories: ['Travel', 'Lifestyle', 'Creator'],
    bio: 'Des villes, des gens, des histoires.\nEt encore tellement à vivre…',
  },
  stats: { followers: 245000, likes: 8400000, views30d: 12000000, updatedAt: '2026-09-15T10:00:00Z' },
  socials: [
    { platform: 'tiktok', url: 'https://www.tiktok.com/@malick', followersCount: 245000 },
    { platform: 'instagram', url: 'https://www.instagram.com/malick', followersCount: 180000 },
    { platform: 'youtube', url: 'https://www.youtube.com/@malick', followersCount: 94000 },
    { platform: 'snapchat', url: 'https://www.snapchat.com/add/malick', followersCount: 52000 },
    { platform: 'x', url: 'https://x.com/malick', followersCount: 32000 },
  ],
  blocks: blocks.map((b) => ({ ...b, thumbnail: SEED_IMAGES[b.thumbnailImageId!] })),
  theme: { ...DEFAULT_THEME, background: { ...DEFAULT_THEME.background, imageId: 'seed-bg-sunset' } },
  images: SEED_IMAGES,
  showBranding: true,
  preview: false,
  seo: {
    title: 'Malick Wane — Travel • Lifestyle • Creator',
    description: 'Des villes, des gens, des histoires. Et encore tellement à vivre…',
    ogImage: '/seed/bg-sunset-1080.webp',
  },
};

export const MALICK_BLOCKS: Record<string, PublicBlockDetail> = {
  voyages: {
    block: MALICK_PAGE.blocks[0],
    items: [
      { id: 'i1', position: 0, title: 'Saint-Louis, la ville aux mille couleurs', description: 'Balade sur le pont Faidherbe et coucher de soleil sur le fleuve.', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', image: SEED_IMAGES['seed-thumb-travel'], embed: null },
      { id: 'i2', position: 1, title: 'Road trip au Sine-Saloum', description: 'Trois jours entre bolongs, mangroves et pirogues.', url: 'https://example.com/saloum', image: SEED_IMAGES['seed-thumb-travel'], embed: null },
      { id: 'i3', position: 2, title: 'Dakar by night', description: 'Mes spots préférés de la corniche.', url: 'https://example.com/dakar', image: null, embed: null },
    ],
    products: [],
  },
  shop: {
    block: MALICK_PAGE.blocks[1],
    items: [],
    products: [
      { id: '00000000-0000-4000-8000-0000000000a1', title: 'Hoodie « Real progress »', priceXof: 15000, description: 'Coton épais, brodé. Tailles S à XL.', images: [SEED_IMAGES['seed-thumb-shop']], available: true },
      { id: '00000000-0000-4000-8000-0000000000a2', title: 'Preset photo « Sunset »', priceXof: 5000, description: 'Mes réglages Lightroom pour des couchers de soleil dorés.', images: [SEED_IMAGES['seed-thumb-content']], available: true },
    ],
  },
  sons: {
    block: MALICK_PAGE.blocks[2],
    items: [
      { id: 's1', position: 0, title: 'Ma playlist road trip', description: 'Afrobeats, mbalax et un peu d’amapiano.', url: 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M', image: SEED_IMAGES['seed-thumb-music'], embed: { provider: 'spotify', src: 'https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M' } },
      { id: 's2', position: 1, title: 'Son du moment', description: 'En boucle cette semaine.', url: 'https://example.com/son', image: null, embed: null },
    ],
    products: [],
  },
  contenus: {
    block: MALICK_PAGE.blocks[3],
    items: [
      { id: 'c1', position: 0, title: 'Vlog — une journée à Dakar', description: 'Behind the scenes de mon dernier tournage.', url: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ', image: SEED_IMAGES['seed-thumb-content'], embed: { provider: 'youtube', src: 'https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ' } },
      { id: 'c2', position: 1, title: 'Projet photo « Golden hour »', description: 'Série de portraits au coucher du soleil.', url: 'https://example.com/golden', image: null, embed: null },
    ],
    products: [],
  },
  contact: { block: MALICK_PAGE.blocks[4], items: [], products: [] },
};
