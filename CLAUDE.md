# CLAUDE.md — LinkMe (hub créateur)

> Lu par l'orchestrateur **et** par chaque sous-agent (`.claude/agents/*.md`) avant toute action.
> Brief de référence : `docs/BRIEF-PROJET-LINKME.md`. Maquette : `docs/design/mockup-linkme.png` (**la maquette prime**).

## Structure

```
apps/web                 Angular 22 (standalone, signals, zoneless) + @angular/ssr
  src/design-system/     tokens, polices, primitives (GlassCard, LinkCard, SocialRail, StatsRow, ScriptName, Swash, Crown, IconButton, Sheet, Icon)
  src/app/core/          config (BRAND_*), client API généré, i18n, thème → CSS vars, images
  src/app/public/        page publique SSR /{handle}, pages de bloc /{handle}/{slug}, shop public
  src/app/editor/        back-office (chargé en différé) : auth, onboarding, profil, blocs, thème, boutique, ventes
  e2e/                   Playwright (e2e, visuel, axe)
services/api             Spring Boot 3.5 / Java 21 — monolithe modulaire (package = module)
  src/main/resources/openapi/openapi.yaml   ← CONTRAT (source de vérité)
  src/main/resources/db/migration          ← Flyway
  src/main/resources/theme/presets.json    ← presets de thème (source de vérité, copiée côté front)
infra/                   docker-compose*.yml, Caddyfile, scripts, .env.example
docs/                    DECISIONS.md, PROGRESS.md, API.md, adr/, design/tokens.md
```

## Commandes

| But | Commande |
|---|---|
| Tout lancer (prod-like) | `cd infra && cp .env.example .env && docker compose up --build` → https://localhost |
| Front dev | `cd apps/web && npm ci && npm start` (http://localhost:4200, `/api` proxifié vers :8080) |
| Front build SSR | `npm run build` puis `npm run serve:ssr` (port 4000) |
| Régénérer client TS + presets | `npm run gen:api` (depuis `apps/web`) |
| Tests front unitaires | `npm test` |
| E2E / visuel / axe | `npm run e2e` (Playwright ; `E2E_BASE_URL` pour cibler un serveur) |
| Mettre à jour les captures de référence | `npm run e2e:update-snapshots` |
| Lint | `npm run lint` (front) · `./mvnw verify` inclut Spotless/Checkstyle léger (back) |
| Back dev | `cd services/api && ./mvnw spring-boot:run` (profil `dev` : Postgres local, paiements Mock) |
| Tests back | `./mvnw verify` (Testcontainers → Docker requis) |
| Garde-fou tokens | `npm run check:tokens` (aucune couleur hex codée en dur dans les composants) |

## Règles (non négociables)

1. **Contract-first.** Aucun endpoint/champ inventé. On modifie `openapi.yaml` → `npm run gen:api` → on implémente. Un test back (`OpenApiContractTest`) vérifie que chaque opération du contrat est mappée.
2. **Tokens partout.** Aucune couleur, police, rayon, ombre codé en dur dans un composant : uniquement `var(--lm-*)`. Les seules valeurs littérales autorisées sont dans `src/design-system/tokens/` et `core/theme/`. `npm run check:tokens` échoue sinon.
3. **La page publique reste légère** : pas d'import de `editor/**`, pas de lib lourde, JS initial ≤ 150 Ko gzip. L'éditeur est en `loadChildren`.
4. **Un seul rendu** : l'aperçu live de l'éditeur réutilise `PublicPageView` (même composant que la page publique).
5. **Sécurité** : toute entrée utilisateur validée côté serveur (Bean Validation) ; URLs limitées à `https:`, `mailto:`, `tel:`, `https://wa.me/` ; jamais de `innerHTML` avec des données utilisateur ; aucun secret dans le dépôt.
6. **Argent** : montants en `long` FCFA (XOF, entiers). Jamais de `double`. Commission figée à la commande. Journal `payment_event` immuable (append-only).
7. **i18n** : aucune chaîne UI en dur dans les templates → `core/i18n/fr.ts` (+ `en.ts`). Erreurs utilisateur en français.
8. **Accessibilité** : cartes = vrais `<a>`, focus visibles, cibles ≥ 44 px, `alt`, `prefers-reduced-motion`.
9. **Nom de marque** : uniquement via `BRAND_NAME` / `BRAND_LOGO` (`core/config/brand.ts`).
10. **Petits commits conventionnels** (`feat(web): …`, `fix(api): …`), tests inclus. Ne jamais déclarer « terminé » sans avoir exécuté build + tests et regardé les captures.
11. Toute hypothèse → `docs/DECISIONS.md`. Avancement → `docs/PROGRESS.md` à chaque gate.

## Conventions

- Front : composants standalone `OnPush`, `input()`/`output()`/`signal()`/`computed()`, `inject()`. Préfixe sélecteurs : `lm-` (design system), `app-` (features). SCSS par composant, variables CSS uniquement.
- Back : package par module (`auth`, `profile`, `blocks`, `theme`, `uploads`, `publicpage`, `analytics`, `contact`, `shop`, `payments`, `common`). DTO = `record` + Bean Validation. Erreurs = RFC 7807 (`ProblemDetail`). UUID, `Instant` UTC.
- Tests : back JUnit 5 + Testcontainers (Postgres) ; front Vitest ; e2e Playwright.
