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
| D21 | Rate limiting : seau à jetons en mémoire maison (`RateLimiter`, clé = règle + IP), sans dépendance ; remplaçable par Redis/Bucket4j si multi-instances | Simple, testable, suffisant en V1 (1 instance). |
| D22 | Analytics : `navigator.sendBeacon` vers `POST /api/public/{handle}/events`, IP **non stockée** (hachée + sel journalier pour dédoublonnage) | Pas de cookie tiers, conformité loi 2008-12. |
| D23 | Mode fixtures du front (`USE_FIXTURES=true` ou API injoignable en dev) : la page publique peut être rendue depuis `core/fixtures/malick.ts` | Phase 1 en parallèle du back, tests visuels déterministes. |
| D24 | Webhooks : vérification de signature HMAC-SHA256 (Mock), **re-vérification serveur-à-serveur** du statut auprès du fournisseur (PayDunya `confirm`, CinetPay `payment/check`) avant de passer `PAID`, contrôle du montant et de la devise, idempotence par `(provider, provider_event_id)` unique | Sécurité paiement > tout. |
| D25 | Reversements (payouts) : V1 = statut `PENDING_PAYOUT` dans le grand livre + interface `PayoutProvider` (Mock) ; le déclenchement réel est manuel/admin | Irréversible et payant → hors automatisation V1. |
| D26 | Environnement de construction : Maven Central et Docker Hub **bloqués** par la politique réseau de la session de construction initiale → voir PROGRESS.md pour ce qui a pu être exécuté ; le `Dockerfile` API compile avec Maven dans l'image | Contrainte d'environnement, pas de design. |
| D27 | Préchargement de la police du nom **désactivé** par défaut : mesuré, il fait passer le LCP simulé de 2,2 s à 2,9 s (bande passante 4G lente partagée avec l'image LCP). Réactivable via `PRELOAD_DISPLAY_FONT` | Performance > règle de moyens (brief §10 prime sur §5.3). |
| D28 | CSP : `script-src 'self' 'unsafe-inline'` (script d'event-replay Angular + chargement CSS non bloquant de Beasties) ; tout le reste strict (`object-src 'none'`, `frame-ancestors 'none'`, `base-uri 'self'`, `form-action` limité aux fournisseurs de paiement). Aucune donnée utilisateur injectée en HTML brut. Amélioration prévue : nonce par requête (`CSP_NONCE`) | Compromis perf/sécurité documenté. |
| D29 | Paliers responsive : media queries sur la page publique (fond et rail `position: fixed`), **container queries** dans l'aperçu de l'éditeur (`.lm-page--embedded`) via le mixin `bp()` — même mise en page à largeur égale | Aperçu mobile/tablette/desktop fidèle sans iframe. |
| D30 | Logo plateforme en police fixe (`--lm-font-brand`), indépendante du thème du créateur | La marque ne doit pas changer avec le thème. |
| D31 | Composition 390 px : nom sur une ligne dans la colonne gauche (≈ 46 px), rail social à droite couvrant nom → stats (comme la maquette), catégories/bio/stats dans la colonne gauche ; sous-titres de cartes sur 2 lignes max | Seule composition lisible reprenant la disposition du poster. |
| D32 | Webhooks : la **signature est vérifiée avant** toute utilisation de l'identifiant d'événement ; les notifications rejetées sont journalisées sous un identifiant distinct (`rejected:<hash du corps>`) | Sinon une notification forgée réserverait l'`event_id` de la vraie et la ferait passer pour un doublon (revue sécurité). |
| D33 | Limitation de débit ajoutée sur `/api/webhooks/**` (60/min/IP) et `/api/me/uploads/**` (30/min) | Le journal de paiement est append-only : un flux non authentifié pouvait le gonfler. |
| D34 | Les emails ne sont jamais journalisés en entier hors profil `dev` (seuls destinataire masqué + sujet) ; en `prod` sans SMTP, un log d'erreur au démarrage | Un lien de réinitialisation ou des coordonnées d'acheteur ne doivent pas atterrir dans les logs. |
| D35 | `.env.example` livre `SPRING_PROFILES_ACTIVE=prod`, `SEED_DEMO=false`, `PAYMENT_MOCK_ENABLED=false` ; la démo locale se fait en basculant explicitement en `dev` | Une installation « par défaut » ne doit pas exposer le paiement simulé. |
| D36 | Clé d'idempotence du checkout liée au téléphone de l'acheteur (`sha256(clé|téléphone)`) ; jetons de réinitialisation tous invalidés au changement de mot de passe ; nom du contact nettoyé des CR/LF avant l'objet d'email | Revue sécurité (mineurs). |
| D37 | **Risque accepté et documenté** : l'inscription répond `EMAIL_TAKEN` (409), ce qui permet de tester l'existence d'un email ; le compromis est assumé pour l'ergonomie (le « mot de passe oublié » reste muet). À revoir si l'abus est constaté. | Revue sécurité (mineur). |
| D38 | Le budget de poids qui fait foi est le **JS initial gzip ≤ 150 Ko** (`npm run check:bundle`, mesure réelle de transfert) ; le budget `initial` d'Angular (non compressé) est porté à 450 Ko pour ne pas produire un avertissement qui doublonne une règle plus faible | Le brief §10 parle de poids transféré ; deux garde-fous contradictoires masquent les vraies régressions. |

