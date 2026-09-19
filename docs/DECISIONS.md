# Journal des décisions et hypothèses

Format : `Dxx — décision` · justification · réversibilité. D1–D9 viennent du brief (section 3).

## Actées par le brief

| # | Décision | Justification |
|---|---|---|
| D1 | Angular (dernière stable = **22.1**) avec SSR + hydratation pour tout le front, y compris la page publique | Un seul système de composants → aperçu live WYSIWYG. SSR = vitesse + aperçus de partage. Réversible. |
| D2 | Back-end Spring Boot 3.x (**3.5.6**), Java 21, monolithe modulaire, PostgreSQL 16, Flyway | CDC. |
| D3 | Contrat OpenAPI-first ; client TypeScript généré (`openapi-typescript` → `schema.d.ts`) | Une seule source de vérité. |
| D4 | Mobile : cartes de liens pleine largeur (marge 16 px), proportions internes conservées | La maquette est un poster. |
| D5 | Commission plateforme 8 % par défaut (`PLATFORM_COMMISSION_PERCENT`) | CDC laisse 5–10 %. |
| D6 | Boutique V1 = produits simples ; livraison hors application | CDC. |
| D7 | Auth email + mot de passe (BCrypt coût 12 via `DelegatingPasswordEncoder`, Argon2 possible), session cookie httpOnly + CSRF | Sécurité par défaut. |
| D8 | Images Cloudinary (upload signé, `f_auto,q_auto`) | CDC. |
| D9 | `PaymentProvider`/`PayoutProvider` + adaptateur Mock + squelettes PayDunya/CinetPay activés seulement si clés présentes | Pas d'accès au code existant. |

## Prises pendant la construction

| # | Décision | Justification / réversibilité |
|---|---|---|
| D10 | **Valeurs de la maquette** : la maquette (940×1672) est un poster où les tailles de texte/cartes sont déjà en « px réels » (carte ≈ 104 px de haut, titre 16 px, stats ≈ 30 px). On garde ces tailles physiques (cf. brief 5.1) et on adapte la **composition** à 390 px (cartes pleine largeur, nom réduit à ~52 px, rail social à droite de la colonne héros). La régression visuelle compare la page à **sa propre capture de référence validée** (seuil `maxDiffPixelRatio 0.01`) ; la conformité à la maquette est validée par la checklist 5.6 (design-reviewer) + capture côte à côte `docs/design/compare-390.png`. | Une superposition pixel à pixel 390 px ↔ poster 940 px est impossible sans rendre le texte illisible (≈ 7 px). |
| D11 | **Zoneless** (défaut Angular 22) + `withEventReplay()` + `withIncrementalHydration()` | Moins de JS sur la page publique. |
| D12 | i18n : service maison à base de **signals** + dictionnaires TS typés (`fr.ts` par défaut, `en.ts`) plutôt que `@angular/localize` | Un seul build, changement de langue à chaud, zéro dépendance ; la clé manquante casse la compilation (type `Dict`). Réversible vers Transloco. |
| D13 | Presets de thème : source de vérité `services/api/src/main/resources/theme/presets.json`, copiée dans le front par `npm run gen:api` | Contract-first sans dépendance de build croisée dans Docker. |
| D14 | Images du seed : **placeholders générés** (Python/PIL, `infra/scripts/gen_seed_images.py`) servis en local sous `/seed/*`. Un `imageId` `seed:<nom>` est résolu en local, sinon en URL Cloudinary | Aucune image protégée ; démo fonctionnelle sans compte Cloudinary. |
| D15 | Polices auto-hébergées depuis les paquets `@fontsource/*` (sous-ensembles `latin` + `latin-ext` woff2) copiées dans `public/fonts` ; police du nom choisie après test : **Kaushan Script** (plus proche du tracé pinceau de la maquette, bon rendu des majuscules « M » et « W »). Alternatives proposées dans l'éditeur : Yellowtail, Marck Script, Caveat Brush. Manuscrit : **Caveat** | Brief 5.3. |
| D16 | Couronne et swash dessinés en SVG sur mesure (`currentColor`) | Brief annexe B. |
| D17 | Icônes : chemins SVG de **Lucide** (ISC) et **Simple Icons** (CC0) inlinés dans un registre `lm-icon` (pas de dépendance runtime) | Poids minimal, couleur pilotée par tokens. |
| D18 | Contrat back ↔ OpenAPI vérifié par `OpenApiContractTest` (chaque `operationId` du YAML doit être mappé par un handler Spring) ; springdoc expose en plus `/v3/api-docs` pour inspection | Le brief veut à la fois OpenAPI-first et records Java ; le YAML reste maître. |
| D19 | Sessions : Spring Session JDBC (table `SPRING_SESSION`), cookie `LM_SESSION` httpOnly, `SameSite=Lax`, `Secure` en prod ; CSRF cookie `XSRF-TOKEN` lu par l'intercepteur Angular | Scalable horizontalement sans Redis. |
| D20 | Mot de passe oublié : jeton aléatoire 32 octets, stocké **haché** (SHA-256), validité 1 h, usage unique ; emails via `MailSender` (SMTP) avec repli log en dev | Standard. |
| D21 | Rate limiting : Bucket4j en mémoire (clé = IP + route) ; remplaçable par Redis si multi-instances | Simple, suffisant en V1 (1 instance). |
| D22 | Analytics : `navigator.sendBeacon` vers `POST /api/public/{handle}/events`, IP **non stockée** (hachée + sel journalier pour dédoublonnage) | Pas de cookie tiers, conformité loi 2008-12. |
| D23 | Mode fixtures du front (`USE_FIXTURES=true` ou API injoignable en dev) : la page publique peut être rendue depuis `core/fixtures/malick.ts` | Phase 1 en parallèle du back, tests visuels déterministes. |
| D24 | Webhooks : vérification de signature HMAC-SHA256 (Mock), **re-vérification serveur-à-serveur** du statut auprès du fournisseur (PayDunya `confirm`, CinetPay `payment/check`) avant de passer `PAID`, contrôle du montant et de la devise, idempotence par `(provider, provider_event_id)` unique | Sécurité paiement > tout. |
| D25 | Reversements (payouts) : V1 = statut `PENDING_PAYOUT` dans le grand livre + interface `PayoutProvider` (Mock) ; le déclenchement réel est manuel/admin | Irréversible et payant → hors automatisation V1. |
| D26 | Environnement de construction : Maven Central et Docker Hub **bloqués** par la politique réseau de la session de construction initiale → voir PROGRESS.md pour ce qui a pu être exécuté ; le `Dockerfile` API compile avec Maven dans l'image | Contrainte d'environnement, pas de design. |
