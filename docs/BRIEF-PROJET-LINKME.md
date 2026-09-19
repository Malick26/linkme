# BRIEF DE CONSTRUCTION — Application web « hub créateur » (LinkMe)

> **Ce fichier est destiné à Claude Code.** Lis-le en entier avant d'écrire la moindre ligne.
> Tu es le **Lead Engineer / orchestrateur**. Tu peux et tu dois déléguer à des sous-agents spécialisés (section 11).
> Objectif : livrer une application **prête pour la production**, fidèle à la maquette, configurable par l'utilisateur, testée.

---

## 0. Avant de commencer (obligatoire)

1. La **maquette de référence** doit se trouver dans `docs/design/mockup-linkme.png`. Si le fichier est absent → **STOP** et demande-le. Regarde-la (outil de lecture d'image) avant toute décision de design. Toute la section 5 en est extraite ; en cas de doute, **la maquette prime sur ce texte**.
2. Crée à la racine un `CLAUDE.md` (conventions, commandes, structure, règles de la section 12) — il sera relu par tous les sous-agents.
3. Crée `docs/DECISIONS.md` (journal des décisions/hypothèses) et `docs/PROGRESS.md` (avancement par phase).
4. Suis les phases de la section 11, dans l'ordre, avec leurs *gates*.

**Règle d'autonomie.** Ne pose pas de question pour des choix courants : prends le défaut raisonnable, consigne-le dans `docs/DECISIONS.md`, avance. Tu ne t'arrêtes que pour : (a) des secrets/identifiants que tu ne peux pas inventer, (b) une action irréversible ou payante, (c) une contradiction réelle dans ce brief.

---

## 1. Le produit en 30 secondes

Une **application web responsive** (mobile → tablette → desktop ; **pas** une app native) où un créateur de contenu sénégalais publie en moins de 15 min une **page personnelle premium** (type bio-link) qui affiche :
- sa **preuve sociale** (followers, likes, vues sur 30 jours, compteurs par réseau) ;
- ses **blocs** : Mes voyages, Mon shop (paiement mobile money), Mes sons, Mes contenus, Me contacter ;
- un **design 100 % configurable** par lui-même (couleurs, fond, polices, cartes, mise en page…) avec **aperçu en direct**.

Public : créateurs micro/mid-tier (5K–80K abonnés), Sénégal d'abord. Devise : **FCFA (XOF, entiers, sans décimales)**. Paiements : PayDunya / CinetPay (Wave, Orange Money). Langue de l'UI : **français** (i18n prête pour EN).

Le nom « LinkMe » est un **placeholder** : le nom de marque doit être une constante de configuration (`BRAND_NAME`, `BRAND_LOGO`) modifiable sans toucher au code des composants.

---

## 2. Périmètre

**V1 — inclus (P0)** : comptes créateurs, profil, stats déclaratives, blocs de contenu, boutique + paiement, page publique rendue côté serveur (SSR) avec aperçu de partage, back-office responsive, **thème configurable + aperçu live**.

**P1 (à faire si les P0 sont terminés et validés)** : statistiques de trafic (visites, clics), palier Pro (retrait du branding « Powered by », export media kit), image OG dynamique, presets de thème supplémentaires.

**Hors périmètre V1 (ne pas construire)** : API live TikTok/Instagram, app mobile native, marketplace marques, notifications push, multi-pays. **Mais** garde l'architecture ouverte pour ces évolutions (interfaces, pas d'implémentation).

---

## 3. Décisions actées et hypothèses (à consigner dans DECISIONS.md)

| # | Décision | Justification |
|---|---|---|
| D1 | **Angular (dernière version stable) avec SSR + hydratation** pour le front, y compris la page publique | Un seul système de composants pour la page publique **et** l'aperçu live de l'éditeur → fidélité WYSIWYG garantie. SSR = vitesse + aperçus de partage. *(Le CDC initial parlait de rendu serveur via templates ; ce choix respecte l'objectif « pas de SPA pure » en gardant une seule base de code de rendu. Réversible.)* |
| D2 | Back-end **Spring Boot (Java 21), monolithe modulaire**, PostgreSQL, Flyway | Choix du CDC. |
| D3 | Contrat **OpenAPI-first** ; client TypeScript **généré** depuis l'OpenAPI | Une seule source de vérité front/back. |
| D4 | Sur mobile, les cartes de liens sont **pleine largeur** (marges ~16–20 px) | La maquette est un poster ; ses cartes sont trop étroites pour un vrai téléphone. Proportions internes conservées. |
| D5 | Commission plateforme **8 %** par défaut, configurable (`PLATFORM_COMMISSION_PERCENT`) | Le CDC laisse 5–10 % ouvert. |
| D6 | Boutique V1 = **produits simples** (titre, prix FCFA, photos, description, stock optionnel). Livraison hors application (le créateur contacte l'acheteur) | « Au moins un produit vendable » (CDC). |
| D7 | Authentification : email + mot de passe (Argon2/BCrypt), session par **cookie httpOnly** + CSRF | Sécurité par défaut. |
| D8 | Images : **Cloudinary** (upload signé côté client, transformations `f_auto,q_auto`, CDN) | CDC. |
| D9 | Paiements derrière une interface `PaymentProvider` / `PayoutProvider` avec **adaptateur Mock** (dev/tests) + squelettes PayDunya et CinetPay | Je n'ai pas accès au code existant (CampusPass/STOKAI) : l'utilisateur branchera ses clés/adaptateurs. |

---

## 4. Stack et structure

**Front** : Angular standalone components, **signals**, `@angular/ssr`, SCSS + **CSS custom properties** (aucun kit UI qui impose un style ; Angular CDK autorisé pour drag & drop/overlays). Icônes : **Lucide** (outline) + **Simple Icons** (logos TikTok, Instagram, YouTube, Snapchat, X — en SVG inline).
**Back** : Spring Boot 3.x, Spring Security, Spring Data JPA, Flyway, springdoc-openapi, Testcontainers.
**Infra** : Docker Compose (api, web-ssr, postgres, reverse proxy Caddy/Nginx avec HTTPS), déployable sur VPS Hetzner ; GitHub Actions (build, tests, lint, Lighthouse CI, e2e).

```
/apps/web                # Angular (SSR) : public + back-office
/services/api            # Spring Boot
/infra                   # docker-compose*.yml, proxy, scripts de déploiement, .env.example
/docs
  /design                # mockup-linkme.png, tokens.md, captures de référence
  /adr                   # décisions d'architecture
  DECISIONS.md  PROGRESS.md  API.md
/.claude/agents          # définitions des sous-agents (section 11)
CLAUDE.md
```

Aucun secret dans le dépôt ; `.env.example` complet et commenté.

---

## 5. Référence design — extraite de la maquette

> Composition = **portrait 9:16, plein cadre**, photo de fond immersive, contenu en verre sombre par-dessus. Ambiance : *premium, cinématographique, lifestyle/voyage, coucher de soleil*. Valeurs en px CSS pour une largeur de référence de **390 px** ; **calibre-les par superposition** avec la maquette (Playwright + diff), ne les prends pas comme absolues.

### 5.1 Structure de l'écran (de haut en bas)

1. **Fond** : photo pleine page (sujet centré/droite, ciel orange-bleu, palmiers), `object-fit: cover`, point focal configurable.
2. **Overlay** : dégradé vertical — quasi transparent en haut, s'assombrit à partir de ~45 %, presque noir (`#03050A`) vers 80–100 %. Lisibilité du texte > éclat de la photo.
3. **Barre du haut** : logo de la plateforme en **script manuscrit blanc + trait d'appui (swash)** à gauche ; à droite, un **bouton pilule « 🌐 My Links »** (verre sombre, flou) et un **bouton rond « ··· »**.
4. **Punchline manuscrite** (à gauche, ~30 % de hauteur) : 3 lignes en écriture manuscrite légèrement inclinée (« Big dreams / Good energy / Real progress. »), petite **icône couronne** au-dessus, trait d'appui en dessous.
5. **Nom** : « Malick Wane » en **script pinceau blanc, très grand**, **couronne** dessinée au-dessus du « W », **trait d'appui** sous le nom (SVG, pas une police).
6. **Ligne de catégories** : `TRAVEL • LIFESTYLE • CREATOR` — capitales, très espacées (`letter-spacing ≈ .3em`), gris clair, ~12–13 px.
7. **Bio** : 2 lignes, blanc, ~16–18 px (« Des villes, des gens, des histoires. / Et encore tellement à vivre… »).
8. **Bandeau de stats** : 3 colonnes séparées par de **fines lignes verticales** — `245K Followers`, `8.4M Likes`, `12M Vues (30j)`. Chiffre gros et semi-gras (~26–30 px), libellé petit gris. Un **léger halo bleu arrondi** derrière la 1re stat.
9. **Rail social vertical** (côté droit, à hauteur du nom/stats) : 5 **boutons ronds** en verre sombre (TikTok, Instagram, YouTube, Snapchat, X), chacun avec son **compteur** à droite (`245K`, `180K`, `94K`, `52K`, `32K`).
10. **Cartes de liens** (5, empilées, gap ~12 px, hauteur ~88–100 px, **rayon très arrondi ~28 px**, fond verre sombre, **bordure fine claire ~1 px à 15 % d'opacité**) — contenu de gauche à droite : **vignette photo** (pleine hauteur, coins gauches arrondis) → **icône outline** → **titre** (semi-gras ~16–17 px) + **sous-titre** gris (~12–13 px) → **bouton rond outline avec flèche →**.
    - ✈️ **Mes voyages** — *Découvre mes dernières aventures*
    - 🛍️ **Mon shop** — *Mes outfits & mes coups de cœur*
    - 🎵 **Mes sons** — *Playlists, recommandations, vibes*
    - 🎬 **Mes contenus** — *Vlogs, behind the scenes, projets*
    - ✉️ **Me contacter** — *Projets, collabs, opportunités*
11. **Pied** : « *Let's connect* » manuscrit + petit cœur, centré ; **« Powered by 🔗 LinkMe »** en bas à droite ; **bouton rond chevron ↓** en bas à gauche (défilement rapide).

### 5.2 Tokens par défaut (thème « Sunset » = maquette)

| Token CSS | Valeur par défaut | Rôle |
|---|---|---|
| `--lm-text` | `#FFFFFF` | Texte principal |
| `--lm-text-muted` | `rgba(255,255,255,.62)` | Sous-titres, libellés |
| `--lm-accent` | `#FFB067` | Focus, CTA boutique, liens, états actifs |
| `--lm-overlay` | `#03050A` | Couleur de fin du dégradé |
| `--lm-overlay-strength` | `.9` | Intensité du dégradé (0–1) |
| `--lm-card-bg` | `rgba(10,12,18,.62)` | Fond des cartes (verre) |
| `--lm-card-border` | `rgba(255,255,255,.14)` | Bordure des cartes |
| `--lm-card-blur` | `20px` | `backdrop-filter: blur()` |
| `--lm-card-radius` | `28px` | Rayon des cartes |
| `--lm-stat-glow` | `rgba(60,110,255,.18)` | Halo derrière la 1re stat |
| `--lm-font-display` | script pinceau (voir 5.3) | Nom |
| `--lm-font-hand` | manuscrit léger | Punchline, « Let's connect » |
| `--lm-font-body` | `Inter`, system-ui | Tout le reste |

### 5.3 Typographie
- **Nom** : script pinceau gras. Teste **Kaushan Script**, **Yellowtail**, **Marck Script**, **Caveat Brush** et **garde la plus proche de la maquette** ; propose les autres comme choix dans l'éditeur.
- **Manuscrit** (punchline, « Let's connect ») : **Caveat** ou **Reenie Beanie**.
- **UI/texte** : **Inter**.
- Polices **auto-hébergées** (pas de Google Fonts en runtime), sous-ensemble latin + accents français, `font-display: swap`, préchargement de la police du nom.

### 5.4 Comportement responsive (à concevoir dans le même langage visuel)

| Largeur | Rendu |
|---|---|
| **< 640 px** | **Exactement la maquette** : colonne unique, fond plein cadre fixe, contenu qui défile, rail social à droite. |
| **640–1023 px** | Colonne centrée (max ~620 px) sur le fond plein cadre ; mêmes composants, un peu plus aérés. |
| **≥ 1024 px** | Photo **plein écran** avec point focal respecté ; **colonne de contenu à gauche** (max ~560 px : nom, punchline, catégories, bio, stats, cartes) ; **rail social vertical à droite** de l'écran ; barre du haut sur toute la largeur. Le sujet de la photo reste visible à droite. |
| **≥ 1440 px** | Marges généreuses, largeur de contenu plafonnée ; pas de cartes étirées. |

Interactions (sobres, désactivées si `prefers-reduced-motion`) : apparition en fondu/montée **échelonnée** des cartes, léger `scale` à l'appui, la flèche glisse de quelques px au survol, transitions de thème fluides.

### 5.5 Comportements des éléments
- **« My Links »** : ouvre une feuille (bottom sheet mobile / popover desktop) listant tous les liens du créateur + bouton **Partager / Copier le lien / QR code**.
- **« ··· »** : menu (partager, copier le lien, signaler la page).
- **Carte de bloc** : navigue vers la **page de détail du bloc** `/{handle}/{slug}` (même habillage visuel que la page principale, fond conservé, en-tête réduit) :
  - *Voyages / Contenus / Sons* : liste d'éléments (image, titre, description, lien externe ; intégration lecteur si URL Spotify/YouTube reconnue, sinon lien) ;
  - *Shop* : grille de produits → fiche produit → paiement ;
  - *Contact* : formulaire (nom, email/téléphone, message) + boutons WhatsApp / Email / Appel.
- **Chevron ↓** : défile vers les cartes, puis devient « remonter ».

### 5.6 Checklist de fidélité (le `design-reviewer` la passe à 390×844 puis 430×932)
- [ ] Photo plein cadre + dégradé identique en intensité et position
- [ ] Logo script + swash en haut à gauche ; pilule « My Links » + bouton « ··· » alignés en haut à droite
- [ ] Punchline 3 lignes inclinée avec couronne ; nom en script + couronne + swash
- [ ] Catégories en capitales espacées ; bio sur 2 lignes
- [ ] Stats : 3 colonnes, séparateurs verticaux fins, halo bleu sous la 1re
- [ ] Rail social : 5 boutons ronds + compteurs alignés
- [ ] Cartes : vignette, icône outline, titre/sous-titre, bouton flèche rond ; rayon, bordure et flou corrects
- [ ] Pied : « Let's connect » + cœur ; « Powered by » ; chevron ↓
- [ ] Aucun débordement horizontal ; zones tactiles ≥ 44 px ; contraste texte/fond ≥ 4.5:1 (même sur photo claire)

---

## 6. Système de thème configurable (cœur de la demande)

**Principe** : tout l'apparence de la page est décrite par un **objet `ThemeConfig` versionné (JSON)**, validé côté serveur, converti côté front en **CSS custom properties** posées sur le conteneur de la page. **Aucune couleur/police/rayon codé en dur dans les composants** : tout passe par les tokens.

### 6.1 Schéma (extrait)

```json
{
  "version": 1,
  "preset": "sunset",
  "colors": {
    "accent": "#FFB067", "text": "#FFFFFF", "textMuted": "#FFFFFF9E",
    "cardBg": "#0A0C12", "cardBgOpacity": 0.62,
    "cardBorder": "#FFFFFF", "cardBorderOpacity": 0.14,
    "overlay": "#03050A", "overlayStrength": 0.9, "statGlow": "#3C6EFF"
  },
  "background": {
    "type": "image", "imageId": "cld_xxx",
    "focal": { "x": 0.6, "y": 0.3 }, "blur": 0
  },
  "typography": { "display": "kaushan-script", "hand": "caveat", "body": "inter", "nameScale": 1.0 },
  "cards": { "style": "glass", "radius": 28, "showThumbnail": true, "thumbnailSide": "left", "density": "comfortable", "blur": 20 },
  "social": { "position": "right", "showCounts": true, "shape": "circle" },
  "layout": { "showTagline": true, "showCrown": true, "showStats": true, "showCategories": true, "footerText": "Let's connect" },
  "motion": { "enabled": true }
}
```

Le schéma final est **défini côté back (records Java + Bean Validation) et exposé via OpenAPI** ; le front en génère les types.

### 6.2 Ce que l'utilisateur peut configurer
- **Couleurs** : accent, texte, fond/bordure/opacité des cartes, couleur et force du dégradé, halo des stats — via sélecteur de couleur + saisie hex + opacité.
- **Fond** : image (upload + **sélecteur de point focal** + prévisualisation recadrée mobile/desktop), dégradé, ou couleur unie ; flou et force de l'overlay.
- **Typographie** : choix parmi des **paires de polices** curatées (nom/manuscrit/corps) ; échelle de la taille du nom.
- **Cartes** : style (**verre / plein / contour**), rayon (0–36 px), vignette on/off et côté, densité (compacte/confortable), flou.
- **Rail social** : position (droite/gauche/sous les stats), compteurs on/off, forme (rond/arrondi/carré).
- **Sections** : afficher/masquer punchline, couronne, stats, catégories ; texte du pied de page.
- **Blocs** : activer/désactiver, **réordonner par glisser-déposer** (et au clavier), éditer titre/sous-titre/icône/vignette/URL.
- **Presets** (un clic, modifiables ensuite) : **Sunset** (défaut = maquette), **Midnight Blue**, **Emerald Night**, **Rose Gold**, **Clean Light** (thème clair : dégradé et texte adaptés).

### 6.3 Exigences de l'éditeur de thème
- **Aperçu live** fidèle (mêmes composants que la page publique, pas une copie) : split-screen sur desktop, **onglets Édition / Aperçu** sur mobile ; bascule d'aperçu mobile/tablette/desktop.
- **Brouillon vs publié** ; bouton « Publier » ; **annuler/rétablir** ; « Réinitialiser au preset ».
- **Garde-fou de contraste** (WCAG) : avertissement visible si le texte est illisible sur le fond/overlay choisi, avec **correction suggérée en un clic**.
- Valeurs validées côté serveur (couleurs hex, bornes numériques, polices dans la liste blanche, `imageId` appartenant au créateur).
- Tests : snapshot des tokens par preset ; test que **chaque champ du schéma a un effet visible** sur le rendu.

---

## 7. Fonctionnalités et critères d'acceptation

### 7.1 Comptes & onboarding
- [ ] Inscription/connexion/déconnexion/mot de passe oublié ; **handle unique** (`a-z0-9._-`, 3–30 car., liste de handles réservés : `admin`, `api`, `app`, `login`, `settings`, `shop`, `help`…)
- [ ] **Assistant d'onboarding en ≤ 5 étapes** (identité → photo/fond → réseaux & stats → blocs → thème/preset → publier) ; page publiée en < 15 min
- [ ] Page publique accessible sur `/{handle}` dès la publication

### 7.2 Profil, réseaux, stats (déclaratif)
- [ ] Nom d'affichage, punchline (jusqu'à 3 lignes), catégories (jusqu'à 3), bio (≤ 160 car.), photo de fond
- [ ] Réseaux : plateforme, URL/identifiant, **compteur saisi à la main** ; stats globales (followers, likes, vues 30 j) saisies à la main, formatage `245K` / `8.4M` (`Intl.NumberFormat` compact, locale `fr`)
- [ ] Date de dernière mise à jour des stats conservée (affichable)

### 7.3 Blocs
- [ ] 5 types de base (voyages, shop, sons, contenus, contact) + **bloc « lien simple »** ; créer/éditer/masquer/réordonner/supprimer
- [ ] Éléments d'un bloc : image, titre, description, URL (validée : `https`, `mailto`, `tel`, `wa.me`)
- [ ] Vignettes uploadées via Cloudinary (recadrage automatique)

### 7.4 Boutique & paiement
- [ ] Produit : titre, prix FCFA (entier), 1–5 photos, description, stock optionnel, actif/inactif
- [ ] Checkout : coordonnées acheteur (nom, téléphone, email) → paiement mobile money via le fournisseur (redirection/overlay) → page de confirmation
- [ ] **Webhook** fournisseur : vérification de signature, **idempotence**, statut de commande (`PENDING → PAID | FAILED | CANCELED`)
- [ ] Le créateur reçoit un **email de confirmation** de vente ; l'acheteur reçoit un reçu
- [ ] **Commission** calculée et figée à la commande ; **grand livre** (montant brut, commission, net créateur, statut de reversement) ; tableau de bord des ventes/gains
- [ ] Tout est **traçable** (journal d'événements de paiement immuable)

### 7.5 Page publique
- [ ] **SSR** ; balises `title`, `description`, **Open Graph/Twitter Card** (image de fond via Cloudinary 1200×630) → aperçu correct sur WhatsApp/Instagram
- [ ] 404 propre pour handle inexistant ; page non publiée = 404
- [ ] Événements `page_view` et `link_click` envoyés sans bloquer le rendu (beacon), sans cookie tiers

### 7.6 P1
- [ ] Tableau de bord de trafic (visites, clics par bloc, 7/30 jours)
- [ ] Palier Pro (drapeau de plan) : masque « Powered by » et logo plateforme, export media kit (PDF)
- [ ] Image OG dynamique (nom + stats + fond)

---

## 8. Modèle de données (résumé — Flyway, UUID, timestamps UTC)

`user` · `creator_profile` (handle, display_name, tagline_lines[], categories[], bio, background_asset_id, plan, published) · `social_account` (platform, url, followers_count, updated_at) · `profile_stats` (followers, likes, views_30d, updated_at) · `block` (type, slug, title, subtitle, icon, thumbnail_asset_id, position, visible, config jsonb) · `block_item` (block_id, title, description, url, image_asset_id, position) · `theme` (creator_id, draft jsonb, published jsonb, version, updated_at) · `asset` (cloudinary_public_id, owner, kind) · `product` · `product_image` · `order` (status, amount_xof, commission_xof, net_xof, provider, provider_ref, buyer_*) · `payment_event` (immuable) · `ledger_entry` · `contact_message` · `analytics_event`.

Montants : `BIGINT` en FCFA. Suppression logique là où c'est pertinent (commandes = jamais supprimées).

---

## 9. API (extrait — contrat complet dans l'OpenAPI, à produire en Phase 0)

- **Auth** : `POST /api/auth/register|login|logout|forgot|reset` · `GET /api/me`
- **Profil** : `GET|PUT /api/me/profile` · `PUT /api/me/socials` · `PUT /api/me/stats`
- **Blocs** : `GET|POST /api/me/blocks` · `PUT|DELETE /api/me/blocks/{id}` · `PUT /api/me/blocks/order` · `…/blocks/{id}/items`
- **Thème** : `GET|PUT /api/me/theme` (brouillon) · `POST /api/me/theme/publish` · `GET /api/theme/presets`
- **Uploads** : `POST /api/me/uploads/sign` (signature Cloudinary)
- **Public** : `GET /api/public/{handle}` · `GET /api/public/{handle}/blocks/{slug}` · `POST /api/public/{handle}/events` · `POST /api/public/{handle}/contact`
- **Shop** : `GET|POST|PUT|DELETE /api/me/products` · `POST /api/public/{handle}/checkout` · `POST /api/webhooks/{provider}` · `GET /api/me/orders` · `GET /api/me/earnings`

Erreurs au format **RFC 7807 (Problem Details)**. Pagination et limites de taille systématiques.

---

## 10. Exigences non fonctionnelles

**Performance (page publique, mobile 4G)** : LCP < 2,5 s ; CLS < 0,1 ; JS initial ≤ ~150 Ko gzip ; image de fond en `srcset` responsive + `f_auto,q_auto` + **préchargement du LCP** + placeholder flou ; pas de bibliothèque lourde sur la route publique (éditeur en **chargement différé**). **Lighthouse mobile ≥ 90** (perf, a11y, SEO, best practices) sur `/{handle}` en CI.
**Accessibilité** : WCAG 2.2 AA ; cartes = vrais `<a>` ; focus visibles ; navigation clavier complète (dont drag & drop alternatif) ; `alt` sur les images ; `prefers-reduced-motion` ; test **axe** en CI.
**Sécurité** : validation stricte côté serveur, échappement de toutes les entrées utilisateur (bio, titres), URLs limitées aux schémas autorisés, upload limité (type/poids), **rate limiting** (auth, contact, checkout, events), CSRF, en-têtes de sécurité (CSP, HSTS, X-Content-Type-Options, Referrer-Policy…), secrets via variables d'environnement, **signature des webhooks vérifiée**, journalisation sans données sensibles. Prévoir la conformité **données personnelles (loi sénégalaise 2008-12)** : mentions légales, politique de confidentialité, suppression de compte.
**Fiabilité** : migrations Flyway, healthchecks, logs structurés, sauvegardes PostgreSQL documentées.
**i18n** : toutes les chaînes UI dans des fichiers de traduction (FR par défaut, EN prêt).
**Navigateurs** : derniers Chrome/Safari (iOS inclus)/Firefox/Edge ; **repli propre** si `backdrop-filter` n'est pas supporté (fond plus opaque).

---

## 11. Équipe d'agents et orchestration

### 11.1 Sous-agents à créer dans `.claude/agents/*.md`
Chaque fichier : frontmatter (`name`, `description` claire pour le déclenchement automatique, `tools` minimaux nécessaires) + prompt système court (mission, périmètre, fichiers autorisés, définition de fini, « lis `CLAUDE.md` et `docs/design/tokens.md` d'abord »). Utilise le modèle le plus capable pour `architect`, `design-system` et `design-reviewer`.

| Agent | Mission | Périmètre d'écriture |
|---|---|---|
| **architect** | ADR, modèle de données, **OpenAPI**, schéma `ThemeConfig`, `docs/design/tokens.md` extrait de la maquette | `docs/`, `services/api/**/openapi*`, contrats |
| **design-system** | Tokens, polices, primitives (`GlassCard`, `LinkCard`, `SocialRail`, `StatsRow`, `ScriptName`, `Swash`, `Crown`, `IconButton`, `Sheet`), thème → CSS vars, **fidélité pixel** à la maquette | `apps/web/src/design-system/**` |
| **frontend-public** | Page publique SSR, pages de blocs, « My Links », SEO/OG, analytics beacon, responsive 3 paliers | `apps/web/src/app/public/**` |
| **frontend-editor** | Back-office : onboarding, profil, blocs (drag & drop), **éditeur de thème + aperçu live**, boutique, ventes | `apps/web/src/app/editor/**` |
| **backend-core** | Auth, profil, réseaux/stats, blocs, thème (validation), uploads Cloudinary, API publique, analytics | `services/api/**` (hors paiements) |
| **payments** | Produits, commandes, checkout, webhooks, commission, grand livre, `PaymentProvider`/`PayoutProvider`, adaptateurs Mock + PayDunya + CinetPay, emails | `services/api/**/shop*`, `payments*` |
| **qa** | Tests unitaires, intégration (Testcontainers), **e2e Playwright**, **régression visuelle**, axe, Lighthouse CI | `**/test/**`, `e2e/**`, CI |
| **design-reviewer** *(lecture seule + captures)* | Compare les captures Playwright à la maquette avec la checklist 5.6 ; **liste précise des écarts** ; valide ou renvoie | aucun (rapport) |
| **security-reviewer** *(lecture seule)* | Revue sécurité (section 10), paiement/webhooks, uploads, XSS, autorisations | aucun (rapport) |
| **devops** | Dockerfiles, Compose, proxy HTTPS, CI/CD, `.env.example`, scripts de déploiement Hetzner, doc de sauvegarde | `infra/`, `.github/` |

### 11.2 Phases et *gates* (dans cet ordre)

**Phase 0 — Fondations & contrats** *(architect, devops)*
Monorepo, `CLAUDE.md`, ADR, **OpenAPI**, schéma `ThemeConfig`, `docs/design/tokens.md` (extrait de la maquette), squelettes front/back qui démarrent via `docker compose up`, CI de base.
**Gate 0** : `docker compose up` OK ; OpenAPI valide ; client TS généré ; tokens documentés.

**Phase 1 — Design system & page publique fidèles** *(design-system, frontend-public, design-reviewer — en parallèle du backend, sur données de fixtures)*
Primitives + page publique rendue à partir d'un `ThemeConfig` + profil de fixtures (**seed « Malick Wane »** avec les textes de la maquette, cf. annexe). 3 paliers responsive. Tests visuels.
**Gate 1** : checklist 5.6 **100 % validée** par `design-reviewer` à 390 px ; captures 768/1280/1440 cohérentes ; Lighthouse ≥ 90.

**Phase 2 — Backend cœur + éditeur + thème** *(backend-core, frontend-editor, qa)*
Auth, profil, blocs, uploads, thème brouillon/publié, presets, **éditeur avec aperçu live**, onboarding, page publique branchée sur l'API réelle.
**Gate 2** : parcours e2e « inscription → onboarding → changement de thème → publication → page publique à jour » vert ; contraste garde-fou testé.

**Phase 3 — Boutique & paiements** *(payments, frontend-editor, frontend-public, security-reviewer, qa)*
Produits, checkout, webhooks (signature + idempotence), commission, grand livre, emails, tableau de ventes. Adaptateur **Mock** complet et testé ; adaptateurs PayDunya/CinetPay implémentés selon leur doc publique, **activés uniquement si les clés sont présentes**.
**Gate 3** : e2e « achat complet » avec le Mock ; tests de webhooks (rejeu, signature invalide, montant altéré) ; revue sécurité sans point bloquant.

**Phase 4 — Finitions, P1, production** *(tous)*
Contact, analytics, P1 (trafic, Pro, OG dynamique) si le temps le permet, i18n, mentions légales, durcissement, déploiement.
**Gate 4** : Definition of Done (section 12) complète ; README de déploiement testé sur un environnement propre.

### 11.3 Règles d'orchestration
- **Contract-first** : personne n'invente d'endpoint ni de champ ; on modifie d'abord l'OpenAPI/le schéma, puis on régénère.
- **Parallélisme** : lance les sous-agents indépendants **en parallèle** (idéalement une branche/worktree par agent) ; un seul agent écrit dans un périmètre donné.
- **Petits commits** conventionnels, une fonctionnalité = une branche, tests inclus.
- Le lead met à jour `docs/PROGRESS.md` à chaque gate et **relance l'agent concerné** si un reviewer signale des écarts (boucle jusqu'à validation).
- Ne jamais déclarer « terminé » sans avoir **exécuté** les commandes de vérification et **regardé** les captures.

---

## 12. Definition of Done (globale)

- [ ] `docker compose up` démarre l'ensemble ; migrations appliquées ; seed de démo `/malick`
- [ ] Build, lint, tests unitaires + intégration + e2e **verts** ; couverture backend logique métier/paiement ≥ 80 %
- [ ] Régression visuelle : page de démo conforme à la maquette (seuil de diff documenté) à 390 px
- [ ] Lighthouse mobile ≥ 90 partout sur la page publique ; axe : 0 violation critique
- [ ] Aucun secret dans le dépôt ; `.env.example` complet ; CSP active
- [ ] Toutes les chaînes UI externalisées ; erreurs utilisateur claires en français
- [ ] Le thème est **entièrement piloté par tokens** (`grep` : aucune couleur hex codée en dur dans les composants)
- [ ] `README.md` : installation, variables d'environnement, commandes, déploiement Hetzner, sauvegarde/restauration, branchement des clés PayDunya/CinetPay

---

## 13. Livrables finaux

1. Code complet dans le monorepo, exécutable localement et en production.
2. `docs/PROGRESS.md` : état de chaque phase/gate, avec **captures** (390, 768, 1280) de la page publique et de l'éditeur.
3. `docs/DECISIONS.md` : toutes les hypothèses prises.
4. **Rapport final** (en tête de `README.md` ou `docs/FINAL-REPORT.md`) : ce qui est fait, ce qui reste (P1/P2), **ce que l'utilisateur doit fournir** (clés Cloudinary, PayDunya, CinetPay, SMTP, domaine, VPS), risques connus.

---

## Annexes

### A. Seed de démonstration (`/malick`)
- Nom : **Malick Wane** · catégories : `Travel`, `Lifestyle`, `Creator` · punchline : *Big dreams / Good energy / Real progress.* · bio : *Des villes, des gens, des histoires. Et encore tellement à vivre…*
- Stats : 245K followers · 8.4M likes · 12M vues (30j)
- Réseaux : TikTok 245K · Instagram 180K · YouTube 94K · Snapchat 52K · X 32K
- Blocs (ordre, titres/sous-titres de la section 5.1)
- **Images du seed** : génère des **placeholders** (dégradés « coucher de soleil » + formes) ou utilise des images libres de droits fournies dans le repo. **Ne récupère aucune image protégée sur Internet.** Le remplacement par les vraies photos se fait via l'upload.

### B. Icônes
Lucide : `plane`, `shopping-bag`, `music`, `clapperboard`, `mail`, `arrow-right`, `globe`, `chevron-down`, `ellipsis`, `crown`. Logos réseaux : Simple Icons (SVG inline, couleur pilotée par `--lm-text`). Couronne et swash du nom : **SVG dessinés sur mesure** (couleur héritée des tokens).

### C. Ordre de priorité en cas de conflit
1. Sécurité et exactitude des paiements → 2. Fidélité à la maquette → 3. Configurabilité par tokens → 4. Performance → 5. Confort de développement.
