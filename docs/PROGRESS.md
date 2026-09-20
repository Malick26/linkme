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
