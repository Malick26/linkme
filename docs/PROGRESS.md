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
