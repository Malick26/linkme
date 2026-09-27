# Avancement par phase

Légende : ✅ validé (commande exécutée et résultat regardé) · ⚠️ fait mais non exécutable dans l'environnement de construction · ❌ à faire

Environnement de construction (session du 19/09/2026) : Node 24, JDK 21, PostgreSQL 16 local, Chromium (Playwright).
**Maven Central et Docker Hub bloqués par la politique réseau** (403 du proxy, confirmé à plusieurs reprises) → le back-end
Spring Boot et `docker compose up` n'ont pas pu être compilés/exécutés ici (voir D26). Tout ce qui est marqué ✅ a été exécuté.

---

## Phase 0 — Fondations & contrats

| Élément | État | Preuve |
|---|---|---|
| Monorepo (`apps/web`, `services/api`, `infra`, `docs`, `.claude/agents`) | ✅ | arborescence |
| `CLAUDE.md`, `docs/DECISIONS.md`, `docs/PROGRESS.md`, ADR 0001–0005 | ✅ | `docs/` |
| Contrat **OpenAPI 3.1** (`services/api/src/main/resources/openapi/openapi.yaml`, 49 opérations) | ✅ | `npx @redocly/cli lint` → « Your API description is valid » |
| Client TS **généré** (`npm run gen:api` → `schema.d.ts`) + presets copiés | ✅ | 2 461 lignes générées, compilées en mode strict |
| Schéma `ThemeConfig` (OpenAPI) + presets (5) | ✅ | `presets.json` |
| `docs/design/tokens.md` (mesures relevées sur la maquette) | ✅ | |
| Sous-agents `.claude/agents/*.md` (10) | ✅ | |
| Squelette front Angular 22 SSR | ✅ | `ng build` OK |
| Squelette back Spring Boot + Flyway | ⚠️ | écrit ; compilation impossible ici (Maven bloqué) |
| `docker-compose.yml` (Caddy HTTPS, web, api, postgres), Dockerfiles, `.env.example` | ⚠️ | écrits ; `docker compose up` impossible ici (Docker Hub bloqué) |
| CI GitHub Actions (contrat, front, API, images, e2e fullstack, Lighthouse CI) | ✅ écrite | `.github/workflows/ci.yml` |

**Gate 0** : OpenAPI valide ✅ · client TS généré ✅ · tokens documentés ✅ · `docker compose up` ⚠️ (bloqué par le réseau, à exécuter chez vous ou en CI).

---

## Phase 1 — Design system & page publique fidèles

| Élément | État | Preuve |
|---|---|---|
| Primitives : `GlassCard`, `LinkCard`, `SocialRail`, `StatsRow`, `ScriptName`, `Swash`, `Crown`, `IconButton`, `Sheet`, `Icon`, `BrandLogo`, `PoweredBy` | ✅ | `apps/web/src/design-system/` |
| Thème → CSS vars (`themeToCssVars`, pur) + garde-fou contraste WCAG + correction en 1 clic | ✅ | tests unitaires |
| Page publique SSR `/malick` depuis fixtures (textes de la maquette), 3 paliers responsive | ✅ | captures ci-dessous |
| Pages bloc `/{handle}/{slug}`, fiche produit, confirmation de commande, « My Links » (partage / copie / QR), menu « ··· », 404 propre (statut HTTP 404) | ✅ | e2e |
| Polices auto-hébergées (Kaushan Script retenue pour le nom, D15) | ✅ | |
| Garde-fou « aucune couleur codée en dur » (`npm run check:tokens`) | ✅ | 77 fichiers, 0 violation |
| Tests unitaires (Vitest) : format compact, tokens par preset (snapshots), contraste, **chaque champ du `ThemeConfig` a un effet visible** (38 champs) | ✅ | `ng test` → **61/61** |
| E2E Playwright (fixtures) : régression visuelle 390/430/768/1280/1440, SSR+OG, 404, débordement & cibles ≥ 44 px, axe, My Links, navigation bloc, fiche produit, clavier | ✅ | **13/13** |
| JS initial page publique | ✅ | **118 Ko gzip** (budget 150) — `scripts/check-bundle.mjs` |
| Lighthouse mobile `/malick` (serveur chaud, compression) | ✅ | **Perf 92 · A11y 100 · Best practices 100 · SEO 100** — LCP 2,2 s · CLS 0,001 · TBT 270 ms |

### Revue design (design-reviewer, checklist 5.6)
Première passe : 3 écarts signalés (sous-titres des cartes, pied de page à 390 px, alignement à 1440 px) + chevron fixe
chevauchant les cartes à ≥ 1024 px. Corrigés : pied de page sur 2 rangées, chevron dans le flux du pied, alignement
gouttière unique à 1440, ombre portée sur les catégories, vignette à 22 %.
**Écart accepté** (D10) : à 390 px, les sous-titres longs tiennent sur 2 lignes (au lieu d'1 sur le poster) — à 12,5 px
lisibles, 1 ligne imposerait une coupure « … ».

Captures : `docs/design/screens/` (390, 430, 768, 1280, 1440, bloc, boutique) · comparaison `docs/design/compare-390.png`.

**Décision mesurée** : le préchargement de la police du nom (brief §5.3) **dégrade** le LCP simulé (2,2 s → 2,9 s, concurrence
de bande passante en 4G lente) → désactivé (`PRELOAD_DISPLAY_FONT = false`, D27). L'image de fond LCP reste préchargée.

**Gate 1** : checklist 5.6 ✅ (écart documenté) · captures 768/1280/1440 cohérentes ✅ · Lighthouse ≥ 90 ✅.

---

## Phase 2 — Back-end cœur + éditeur + thème

| Élément | État | Preuve |
|---|---|---|
| Auth : inscription, connexion, déconnexion, mot de passe oublié/réinitialisé, disponibilité du handle | ⚠️/✅ | back écrit + `AuthIT` (non exécutable ici) ; parcours vert contre le mock contractuel |
| Profil, blocs (CRUD + réordonnancement), uploads (Cloudinary signé ou local) | ⚠️/✅ | idem |
| Thème brouillon / publié, presets (5), réinitialisation, publication | ⚠️/✅ | idem |
| Éditeur : shell responsive, tableau de bord, profil, blocs en **glisser-déposer** (CDK), éditeur de thème avec **aperçu live**, onboarding 5 étapes, réglages | ✅ | captures `docs/design/screens/editor-*.png` (390/768/1280) |
| Aperçu = **même composant** que la page publique (`PublicPageView [embedded]`), paliers en container queries (D29) | ✅ | capture 390 de l'aperçu + règle 4 de CLAUDE.md |
| Undo/redo + enregistrement automatique du brouillon de thème | ✅ | e2e « parcours créateur complet » |
| Garde-fou de contraste (WCAG AA) + correction en un clic | ✅ | tests unitaires + e2e dédié |
| Page publique branchée sur l'API réelle (fixtures seulement si `USE_FIXTURES=true`) | ✅ | e2e fullstack contre le mock contractuel |
| **Mock d'API contractuel** (`apps/web/scripts/mock-api.mjs`, in-memory, sessions + CSRF + webhooks signés) | ✅ | permet d'exécuter les parcours bout-en-bout sans JVM |

**Gate 2** : e2e « inscription → onboarding → changement de thème → publication → page publique à jour » ✅ **vert**
(`npm run e2e:fullstack` → 4/4, dont le garde-fou de contraste et les onglets Édition/Aperçu en mobile).
Réserve : exécuté contre le **mock contractuel**, pas contre la JVM (Maven bloqué, D26) ; les mêmes parcours sont
couverts côté back par les tests d'intégration Testcontainers, à lancer chez vous par `./mvnw verify`.

---

## Phase 3 — Boutique & paiements

| Élément | État | Preuve |
|---|---|---|
| Produits (CRUD, images, stock, visibilité), boutique publique, fiche produit | ✅ | e2e `achat complet`, captures `shop-390.png` |
| Checkout : commande `PENDING`, commission figée, idempotence par clé + téléphone (D36) | ⚠️/✅ | `CheckoutService` + `CheckoutAndWebhookIT` ; parcours vert contre le mock |
| Webhooks : **signature vérifiée d'abord** (D32), idempotence `(provider, event_id)`, **re-vérification serveur-à-serveur** du statut, contrôle montant/devise avant `PAID` (D24) | ⚠️ | `PaymentService` + 3 tests d'intégration (rejeu, signature invalide, montant altéré, notification forgée) |
| Grand livre append-only (`payment_event`, `ledger_entry`) | ✅ | déclencheurs PostgreSQL vérifiés sur une base locale : `ERROR: table payment_event is append-only` |
| Adaptateurs : Mock complet, PayDunya et CinetPay écrits d'après leur documentation publique, **inactifs sans clés** | ⚠️ | `payments/*Provider.java` ; sans clés le checkout répond `PAYMENT_UNAVAILABLE` |
| Emails (vente, reçu acheteur, réinitialisation), jamais journalisés hors `dev` (D34) | ⚠️ | `MailService` |
| Tableau de ventes (filtres, totaux, export CSV) + reversements `PENDING_PAYOUT` (D25) | ✅ | `editor-sales-1280.png` |
| Revue sécurité (sous-agent `security-reviewer`) | ✅ | 0 bloquant ; 5 majeurs corrigés (D32–D34, D36), 1 risque accepté et documenté (D37) |

**Gate 3** : e2e « achat complet » avec le Mock ✅ · tests de webhooks écrits (rejeu / signature invalide / montant
altéré / notification forgée) ⚠️ *non exécutés ici* (Testcontainers exige Docker) · revue sécurité **sans point
bloquant** ✅.

---

## Phase 4 — Finitions, P1, production

| Élément | État | Preuve |
|---|---|---|
| Bloc contact + boîte « Messages » (anti-spam, nettoyage CR/LF) | ✅ | `editor-*`, e2e |
| Analytics sans cookie (`sendBeacon`, IP hachée + sel journalier, D22) + écran « Trafic » 7/30 j | ✅ | `editor-analytics-1280.png` |
| OG dynamique (titre, description, image) et `canonical` rendus au SSR | ✅ | e2e SSR/OG |
| i18n complet FR/EN (dictionnaires typés, EN chargé à la demande) | ✅ | `npm run lint` (clé manquante = erreur de compilation) |
| Mentions légales, confidentialité, CGV (`/legal/*`) | ✅ | routes `legal.routes.ts` |
| Durcissement : CSP (D28), en-têtes de sécurité, limitation de débit étendue aux webhooks et uploads (D33), `.env.example` sûr par défaut (D35) | ✅ | `SecurityConfig`, `RateLimitInterceptor`, `infra/.env.example` |
| `README.md` (installation, variables, commandes, Hetzner, sauvegarde/restauration, branchement PayDunya/CinetPay) | ✅ | `README.md` |
| `docs/API.md` généré depuis le contrat (51 opérations) | ✅ | `infra/scripts/gen_api_doc.py` |
| Scripts `infra/scripts/deploy.sh` et `backup.sh` | ✅ écrits | `bash -n` OK ; à exécuter sur le VPS |
| Rapport final | ✅ | `docs/FINAL-REPORT.md` |

### Vérifications exécutées le 20/09/2026 (dernier passage)

| Commande | Résultat |
|---|---|
| `npm run check:tokens` | ✅ 107 fichiers, 0 couleur codée en dur |
| `npm run lint` (typecheck strict) | ✅ 0 erreur |
| `npm test` (Vitest) | ✅ **61/61** |
| `npm run build` (SSR + prerender) | ✅ 438 Ko bruts / **136,5 Ko gzip** initial (budget 150) |
| `npm run e2e` (visuel + axe + comportements) | ✅ **13/13** |
| `npm run e2e:fullstack` (contre le mock contractuel) | ✅ **4/4** |
| Compilation du back (javac contre stubs, D26) | ✅ 0 erreur / 0 avertissement |
| Harnais logique back (commission, signatures, idempotence, contraste…) | ✅ **46/46** |
| Migrations Flyway sur PostgreSQL 16 local + déclencheurs append-only | ✅ |
| Lighthouse mobile `/malick` | ✅ Perf 92 · A11y 100 · BP 100 · SEO 100 |

**Gate 4** : Definition of Done (section 12) — tout est ✅ **sauf** les deux points qui exigent Docker/Maven :
`docker compose up` et `./mvnw verify` (couverture ≥ 80 %). Ils sont écrits, câblés dans la CI GitHub Actions, et
doivent être exécutés sur votre machine ou en CI (voir `docs/FINAL-REPORT.md`, § « À exécuter chez vous »).

---

## Revue utilisateur du 20/09/2026 — corrections

Retour de Malick après installation : page d'accueil trop pauvre, réglages « sans effet », formulaire de contact qui
refuse sans dire pourquoi, édition des blocs introuvable, et surtout : **le produit doit s'adresser à des milliers de
créateurs, pas montrer la page de Malick**. Ce qui a été trouvé et corrigé :

| Signalé | Cause réelle trouvée dans le code | Correction | Test qui empêche la rechute |
|---|---|---|---|
| « Je change mes contacts, ça ne fait pas effet » | Sur `<select>`, `[value]` est posé par Angular avant l'existence des options : **tous les réseaux s'affichaient en « TikTok »** | `[selected]` sur chaque `<option>` | e2e `profil : les réseaux gardent leur plateforme` |
| « Les réglages ne sont pas pris en compte » | Le profil n'avait pas d'enregistrement automatique (contrairement à Design) : quitter l'écran perdait la saisie | Enregistrement automatique 1,2 s après la dernière frappe + vidage à la sortie (D41) | même test e2e (rechargement de la page) |
| « La photo de fond ne fait rien depuis Profil, mais ça marche depuis Design » | Deux sources pour le fond : le thème l'emporte toujours (`PublicPageAssembler`) | Le profil affiche le fond rendu et renvoie vers `Design#fond` (D40) | e2e `la photo de fond renvoie vers Design` |
| « Le formulaire de contact dit qu'un champ est vide alors que non » | `77-123-45-67` échouait sur un motif trop strict, avec un message générique | Numéro normalisé (front + API), message **sous le champ concerné** | 12 tests unitaires + 3 e2e de contact |
| « Je ne vois pas où modifier les blocs voyages / sons / contenus » | L'édition était derrière une petite icône crayon parmi cinq | Ligne cliquable, bouton **Modifier** libellé, contenu du bloc résumé (« 3 éléments », « Aucun élément — ajoute le premier ») | capture `editor-blocks-1280.png` |
| « L'aperçu d'un bloc peut être bien meilleur » | Iframe YouTube chargée d'emblée → grand cadre noir ; liste à une colonne | Façade image + bouton lecture (D43), grille 2–3 colonnes, compteur, état vide soigné, retour au profil | e2e page publique |
| « Ce n'est pas un truc pour Malick » | L'accueil était un placeholder de 3 lignes | **Nouvelle page d'accueil** : promesse, aperçu interactif (4 ambiances cliquables), 3 étapes, 6 fonctionnalités, boutique, tarifs, FAQ, appels à l'action ; lien de démo optionnel (`DEMO_HANDLE`) (D39) | 6 e2e dont axe et cibles ≥ 44 px |

Trouvés en vérifiant, non signalés : la connexion était **invisible sur mobile** depuis l'accueil, les pastilles
d'ambiance et le logo faisaient moins de 44 px, et le canonical d'une route pré-rendue pointait sur le port du
pré-rendu (D42).

| Commande | Résultat après corrections |
|---|---|
| `npm run lint` | ✅ 112 fichiers, 0 couleur en dur, 0 erreur de type |
| `npm test` | ✅ **75/75** |
| `npm run e2e` | ✅ **19/19** (dont 5 régressions visuelles et 2 passages axe) |
| `npm run e2e:fullstack` | ✅ **9/9** |
| `node scripts/check-bundle.mjs` | ✅ 139,1 Ko gzip (limite 150) |
| Lighthouse mobile `/` (nouvelle page d'accueil) | ✅ **100 · 100 · 100 · 100** |
| Lighthouse mobile `/malick` | ✅ **98 · 100 · 100 · 100** |

---

## Phase 5 — Chantier « abonnement obligatoire » (demande du 26/09/2026), phase A

Malick a demandé un chantier large (sons/voyages avec upload+liens, parrainage à deux vitesses, portefeuille avec
décaissement manuel, codes promo admin, CRM WhatsApp/email, collabs négociées) en délégant l'ordre d'exécution.
Choix : commencer par le **socle payant obligatoire**, car le reste (parrainage sur abonnements, portefeuille,
promos) n'a de sens qu'une fois qu'un abonnement réel existe. Décisions détaillées : D44–D48.

| Élément | État | Preuve |
|---|---|---|
| Migration `V3__subscriptions.sql` (`users.phone`, `creator_profile.plan` → `standard`/`boutique`, `subscription_status/expires_at/started_at`, table `subscription_payment`) | ⚠️ | écrite ; non exécutée ici (Postgres/Testcontainers non lancés dans cette reprise, D26) |
| `Payable` (D47) : `ShopOrder` et `SubscriptionPayment` implémentent la même interface ; `PaymentService.handleWebhook` distingue les deux flux par préfixe de référence (`LM-`/`SB-`) | ⚠️ | écrit ; compilation Maven impossible ici (D26), relecture manuelle ligne à ligne des signatures existantes |
| `SubscriptionService`/`SubscriptionController` : catalogue des plans, statut, checkout (idempotent, clé liée au téléphone comme D36), page paiement mock, activation depuis le webhook, expiration planifiée quotidienne (D46) | ⚠️ | idem |
| Visibilité : `CreatorProfile.isVisible()` (D44) branché sur `PublicPageAssembler`, `PublicController`, `CheckoutService`, `ShopControllers` ; boutique bloquée hors plan Boutique côté création (`BlockService`, `PLAN_REQUIRED`) et côté lecture publique (défense en profondeur, D45) | ⚠️ | idem |
| Contrat OpenAPI : 4 nouvelles opérations (`/api/subscriptions/plans`, `/api/me/subscription`, `/checkout`, `/payments/{reference}`), `Plan` = `standard`/`boutique`, `Me`/`Profile` enrichis | ✅ | `npm run gen:api` exécuté avec succès (client TS régénéré, `schema.d.ts`) |
| Front : page « Abonnement » (choix de plan, téléphone, redirection paiement, suivi du retour), bannière éditeur + carte tableau de bord quand l'abonnement n'est pas actif, page d'accueil et tarifs mis à jour aux vrais prix (1 100 / 2 700 FCFA) | ✅ | `ng build` (SSR+prerender) exécuté avec succès, `tsc --noEmit` 0 erreur |
| Garde-fous front | ✅ | `npm run check:tokens` 0 violation · `node scripts/check-bundle.mjs` page publique inchangée (46,2 Ko gzip, le code d'abonnement est dans le bundle différé de l'éditeur) |
| Tests d'intégration back (`SubscriptionIT`) : catalogue public, page masquée sans abonnement même publiée, parcours checkout mock → webhook → page visible, échec de paiement ne débloque rien, idempotence du checkout, blocage/déblocage de la boutique par plan | ⚠️ écrits | `services/api/src/test/java/com/linkme/api/it/SubscriptionIT.java` ; non exécutés ici (Testcontainers/Docker indisponibles, D26) — à lancer via `./mvnw verify` |
| Correction de deux tests existants pour la nouvelle règle D44 (`ThemeAndPublicPageIT` : publier ne suffit plus, il faut aussi un abonnement actif) + nouvel helper `activateSubscription()` dans `AbstractIT` | ⚠️ écrit | non exécuté ici, même limite |

**Gate 5 (partiel)** : contrat ✅ exécuté · front ✅ exécuté (build, tests unitaires, tokens, budget JS, comme les
phases précédentes) · back **écrit avec tests inclus mais non compilé/exécuté ici** (Maven Central bloqué, D26,
confirmé à nouveau ce jour). À exécuter chez vous ou en CI avant de considérer cette phase définitivement close :
`./mvnw verify` (doit inclure `OpenApiContractTest` + `SubscriptionIT` + les tests existants, dont
`ThemeAndPublicPageIT` corrigé).

**Reste du chantier (non commencé)**, dans l'ordre proposé à Malick : (B) blocs sons/voyages — upload de son *ou*
lien Deezer/YouTube, lien YouTube/TikTok pour voyage, image de fond par bloc ; (C) parrainage à deux vitesses (20 %
self-service vs jusqu'à 60 % collab négociée avec expiration) + portefeuille (décaissement manuel dès 1 500 FCFA,
anti-fraude, trace gain potentiel/réel, noms/numéros masqués) ; (D) codes promo admin (%, nombre d'usages) + CRM
WhatsApp/email + page d'inscription aux messages ; (E) gestion admin des collabs + pop-up accueil/dashboard.

---

## Phase 5bis — `docker compose up --build` testé et corrigé pour de vrai (26/09/2026)

Malick a signalé que `docker compose up --build` échouait chez lui, avec la consigne explicite de tester et corriger
moi-même plutôt que de renvoyer des hypothèses. Deux échecs successifs, chacun reproduit/vérifié dans l'environnement
de construction (D26 : Docker Hub reste bloqué, donc le build Docker complet n'a **pas** pu être relancé de bout en
bout ici — seule la mécanique de chaque correction a été vérifiée séparément) :

| Échec signalé | Diagnostic | Correction | Vérifié comment |
|---|---|---|---|
| `npm ci` échoue avec `ETXTBSY` sur le binaire esbuild pendant le build de l'image `web` | Course connue de Docker Desktop (snapshotter containerd sur Windows) entre l'écriture du binaire natif et son exécution par le postinstall d'esbuild | `apps/web/Dockerfile` : `RUN npm ci --ignore-scripts` puis `RUN npm rebuild esbuild` (deux étapes au lieu d'une) (D49) | Démon Docker réel démarré dans le bac à sable (`sudo dockerd`), mais Docker Hub bloqué (403, politique réseau) → mécanique npm/esbuild vérifiée directement (exécution du binaire produit par les deux séquences), pas la course Docker elle-même |
| Le conteneur `api` ne démarre plus : Flyway échoue sur `V3__subscriptions.sql`, contrainte `creator_profile_plan_check` violée | L'`UPDATE ... SET plan = 'standard'` s'exécutait **avant** la suppression de l'ancienne contrainte (`free`/`pro` uniquement) | Réordonnancement : `DROP CONSTRAINT` puis `UPDATE` (D49) | PostgreSQL 16 installé pour de vrai via apt (Maven Central/Docker Hub bloqués, mais les dépôts Ubuntu le sont pas) ; migrations V1→V4 rejouées en séquence sur une base fraîche **et** sur une base seedée avec une ligne `plan='pro'` (le cas réel de Malick) — succès dans les deux cas |

**À faire chez Malick** pour clore cette phase : relancer `cd infra && docker compose up --build` en entier ; les deux
correctifs ci-dessus sont dans le dépôt, mais la course Docker et l'enchaînement complet des migrations sur son vrai
volume Postgres n'ont pu être rejoués que partiellement ici.

---

## Phase 6 — Chantier B : blocs « sons » et « voyages » enrichis (26/09/2026)

Suite de la Phase 5 (« passe à l'étape suivante ») : upload de son *ou* lien (Deezer/YouTube/Spotify) pour les
éléments d'un bloc « sons », lien YouTube/TikTok pour un bloc « voyages », et une image de fond par bloc. Détails
et justification : D50.

| Élément | État | Preuve |
|---|---|---|
| Contrat OpenAPI : `backgroundImageId`/`backgroundImage` sur `Block`, `soundId`/`sound` sur `BlockItem`, schémas `Audio`/`AudioCompleteRequest`, 3 opérations (`sign-audio`, `complete-audio`, `local-audio`), `Embed.provider` étendu à `deezer`/`tiktok` | ✅ | `npx @redocly/cli lint` (0 erreur, seulement les avertissements préexistants) + `npm run gen:api` exécuté avec succès |
| Migration `V4__block_media.sql` (`block.background_asset_id`, `block_item.sound_asset_id`, FK vers `asset`) | ✅ | rejouée pour de vrai sur PostgreSQL 16 réel (apt), après V1→V3, sur base fraîche |
| Back : `Block`/`BlockItem`/`BlockService` (image de fond, son par item, DTOs), pipeline audio parallèle à celui des images (`AudioDto`, `CloudinaryService.signAudio`/`audioUrl`, `LocalMediaService.storeAudio`/`sniffAudio`, `UploadController` — 3 nouveaux points d'entrée), `EmbedResolver` (Deezer, TikTok), `PublicController`/`DemoSeeder` mis à jour | ⚠️ écrit | relu ligne à ligne (chaque site d'appel de `Block.update()`/`BlockItem.update()` vérifié à la main après changement de signature) ; **compilation Maven toujours impossible ici** (Maven Central bloqué, D26, reconfirmé ce jour) |
| Test d'intégration `BlockMediaIT` (image de fond sur un bloc, upload local d'un son + rejet d'un format invalide, résolution Deezer/TikTok) | ⚠️ écrit | même limite — à exécuter via `./mvnw verify` |
| Front : types (`Audio`, `Embed`), `MeApi` (3 méthodes d'upload audio), `ed-audio-upload` (miroir de `ed-image-upload`, sans dimensions), éditeur de bloc (champ image de fond, upload de son pour les items « sons »), rendu public (`<audio controls preload="none">` natif, façades Deezer « audio »/TikTok « vertical », fond de page par bloc via `forceImage` sur `lm-page-background`) | ✅ | `npm run lint` (0 erreur `tsc`, 0 couleur en dur) · `npm test` **75/75** · `npm run build` (SSR + prérendu) · `node scripts/check-bundle.mjs` **139,9 Ko gzip** (limite 150, page publique inchangée : le nouveau code est dans les chunks différés `block-page-component`/éditeur) |
| i18n (`fr.ts`/`en.ts`) : nouvelles clés pour le champ fond, le son d'item, les erreurs d'upload audio | ✅ | compilation typée (`Dict`) exécutée sans erreur dans `npm run lint` |

**Gate 6 (partiel)**, comme la Phase 5 : front **exécuté et vert** (lint, tests unitaires, build, budget JS) ; back
**écrit, relu à la main, tests inclus, mais non compilé/exécuté ici** — Maven Central reste bloqué dans cet
environnement de construction (D26). À exécuter avant de considérer cette phase définitivement close :
`./mvnw verify` (doit inclure `OpenApiContractTest` + `BlockMediaIT` + tous les tests existants).

**Reste à faire sur ce chantier** : e2e Playwright dédiés (upload de son, image de fond, façades Deezer/TikTok) ;
vérifier le rendu réel d'un widget Deezer et d'un embed TikTok (jamais testés dans un vrai navigateur ici) ; suite du
chantier plus large (C, D, E ci-dessus, toujours non commencées).

---

## Phase 7 — Chantier C : parrainage à deux vitesses + portefeuille (27/09/2026)

Choix confirmés par Malick avant de coder : commission sur **tous** les abonnements du filleul, gel de **7 jours**,
**écran admin minimal** pour les retraits. Décisions : D51–D58.

| Élément | État | Preuve |
|---|---|---|
| Contrat OpenAPI : 10 opérations (`getReferralCode`, `getMyReferrals`, `getMyWallet`, `requestWithdrawal`, `adminListWithdrawals`, `adminMarkWithdrawalPaid`, `adminRejectWithdrawal`, `adminGetReferrer`, `adminSetCollab`, `adminEndCollab`), `Me.admin`, `RegisterRequest.referralCode` | ✅ | `redocly lint` valide (44 avertissements, tous préexistants) · `npm run gen:api` · `docs/API.md` régénéré (70 opérations) |
| Contrat ↔ handlers Spring | ✅ | vérification statique des annotations : **70/70**, 0 manquant, 0 hors contrat (équivalent de `OpenApiContractTest`, qui reste à exécuter via Maven) |
| Migration `V5__referrals.sql` (5 tables, contraintes, 2 déclencheurs append-only) | ✅ | V1→V5 rejouées sur **PostgreSQL 16 réel** ; 12 cas de contraintes vérifiés (auto-parrainage, collab > 60 %, collab sans échéance, gain en double, écriture de signe faux, retrait sans demande, 2ᵉ demande ouverte, moyen inconnu, UPDATE/DELETE interdits) ; solde calculé 1 620 − 1 500 = 120 |
| Back : module `referral` (entités, dépôts, `ReferralService`, `WalletService`, écouteur après commit, emails, 2 contrôleurs), `AdminAccess` + `ROLE_ADMIN`, `Masking`, rattachement à l'inscription, limitation de débit (retraits, codes) | ⚠️ écrit | règles pures compilées par `javac -Xlint:all` (0 avertissement) et exécutées sur la JVM : **33/33** (commission, taux collab/expiration, gel, réserve/recrédit, décision unique, masquage) ; le reste relu ligne à ligne — **compilation Maven toujours impossible ici** (D26, re-vérifié : Maven Central, Docker Hub et GitHub hors dépôts autorisés bloqués) |
| Tests back écrits : `ReferralIT` (7), `WalletIT` (3, gel ramené à 0 j), `ReferralRulesTest` (4) | ⚠️ écrits | à exécuter via `./mvnw verify` |
| Front : pages **Parrainage** (lien, copie, WhatsApp, taux/collab, gains réels/mensuels/potentiels, filleuls masqués, derniers gains), **Portefeuille** (solde, gel, retrait Wave/OM/Free, historique), **Admin → Retraits** (+ collabs), lien `/r/CODE` et bandeau « Invité·e par … » à l'inscription, garde `adminGuard` | ✅ | `npm run lint` 0 erreur / 0 couleur en dur · `npm test` **75/75** · `npm run build` sans avertissement · JS initial **139,8 Ko gzip** (D57) |
| E2E navigateur contre le mock contractuel (D58) | ✅ | `referral.spec.ts` **3/3** (gel 7 j) + **3/3** (gel 0 j : collab 60 % → 1 620 FCFA → retrait → refus motivé → recrédit → paiement admin) ; suite fullstack complète **10/10** + 1 ignoré par conception ; `contact.spec.ts` stabilisé (attente de l'hydratation) **15/15** en répétition |
| Captures regardées | ✅ | parrainage 1280/390, portefeuille 1280/390, admin 1280, inscription invitée 390 — pas de débordement horizontal à 390 px |
| Page publique inchangée | ✅ | e2e public 17/19 : les 2 écarts (390/430 px, 2 % de pixels, rendu des polices) sont **identiques au pixel près sur le code d'avant cette phase** → environnement, pas régression |

Correctifs trouvés en route : le test e2e « parcours créateur complet » était cassé depuis la phase 5 (D58) ; la
règle de limitation de débit des uploads ne couvrait pas les uploads audio de la phase 6 (`-audio` ajouté).

**Gate 7 (partiel)** : front, contrat, base de données et règles métier **exécutés et verts** ; intégration Spring
**écrite mais non compilée ici**. À faire chez toi : `./mvnw verify` (doit inclure `ReferralIT`, `WalletIT`,
`ReferralRulesTest`, `OpenApiContractTest`), puis mettre ton email dans `ADMIN_EMAILS`.

**Reste du chantier** : (D) — voir Phase 8 ; (E) gestion admin des collabs en liste + pop-up accueil/dashboard.

---

## Phase 8 — Chantier D : codes promo, prospects et CRM WhatsApp/email (27/09/2026)

Choix confirmés par Malick : codes promo sur les **abonnements**, WhatsApp par **liens wa.me pré-remplis** (emails
automatiques), page d'inscription pour les **prospects**. Décisions : D59–D63.

| Élément | État | Preuve |
|---|---|---|
| Contrat : 9 opérations (`quotePromoCode`, `adminListPromoCodes`, `adminCreatePromoCode`, `adminDeactivatePromoCode`, `joinProspectList`, `unsubscribe`, `adminListCrmContacts`, `adminSendCrmEmail`, `adminLogCrmContact`), `promoCode`/`discountXof` au checkout | ✅ | `redocly lint` valide (1 avertissement ajouté : tag `crm` sans description, comme les 14 autres) · `gen:api` · `docs/API.md` (79 opérations) · contrat ↔ handlers **79/79** |
| Migration `V6__promo_crm.sql` | ✅ | V1→V6 rejouées sur PostgreSQL 16 réel ; contraintes vérifiées : code en minuscules / 0 % / 0 usage refusés, un code par créateur tant qu'un paiement est en attente (libéré après échec), prospect sans moyen de contact refusé, email en double (casse ignorée), canal inconnu |
| Back : modules `promo` et `crm`, checkout avec code (y compris 100 % sans fournisseur), usage compté au paiement, emails groupés avec lien de désinscription, `MailService.available()` | ⚠️ écrit | règles pures compilées (`javac -Xlint:all`) et exécutées : **12/12** ; reste relu — Maven toujours bloqué ici (D26) |
| Tests back écrits : `PromoIT` (4), `CrmIT` (3), `PromoCrmRulesTest` (3) | ⚠️ écrits | à exécuter via `./mvnw verify` |
| Front : champ code promo à l'abonnement (aperçu du prix, recalcul si on change de plan, « Activer gratuitement » à 100 %), admin à onglets **Retraits / Codes promo / CRM**, pages publiques `/rejoindre` et `/desinscription`, lien au pied de l'accueil | ✅ | `npm run lint` 0 erreur / 0 couleur en dur · `npm test` **78/78** (+3 : numéros wa.me) · build sans avertissement, 6 routes pré-rendues · JS initial **139,9 Ko gzip** (textes de /rejoindre chargés avec la page, D57) |
| E2E navigateur (mock mis à niveau) | ✅ | `promo-crm.spec.ts` **12/12** sur 3 répétitions (−50 % Boutique + recalcul Standard + usage compté, code 100 % puis épuisé, prospect → CRM → WhatsApp pré-rempli → email groupé → désinscription, admin refusé aux créateurs) ; `referral.spec.ts` 3/3 (gel 0 j) ; suite fullstack 12/14 en parallèle — les 2 échecs repassent seuls (voir ci-dessous) |
| Captures regardées | ✅ | `/rejoindre` 390, abonnement avec code 390, admin codes promo 1280, CRM 1280/390 — pas de débordement horizontal |

Trouvé en route : le test « prospect » échouait au 2ᵉ passage parce qu'il réutilisait le même numéro — c'est le
dédoublonnage voulu (D61), le test utilise désormais un numéro propre à chaque passage. Le test « la photo de fond
renvoie vers Design » (phase de revue du 20/09) dépasse parfois son délai quand 2 navigateurs tournent en parallèle
dans cet environnement ; il passe seul.

**Gate 8 (partiel)** : front, contrat, base et règles exécutés et verts ; intégration Spring écrite, non compilée ici.
À faire chez toi : `./mvnw verify` ; configurer `SMTP_*` avant d'utiliser l'email groupé en production.

**Reste** : (E) gestion admin des collabs en liste + pop-up accueil/dashboard.

