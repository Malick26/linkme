# Design tokens — thème « Sunset » (= maquette)

Source : `mockup-linkme.png` (940 × 1672, portrait ≈ 9:16). Mesures relevées sur la maquette (px maquette) puis
converties pour un écran de référence de **390 × 844** (px CSS). La maquette est un poster : les tailles de texte et
de cartes y sont déjà « réelles » ; on garde les tailles, on adapte la composition (D4, D10).

## 1. Tokens thémables (pilotés par `ThemeConfig`, posés en CSS custom properties sur `.lm-page`)

| Token | Sunset | Mesure / origine | Champ `ThemeConfig` |
|---|---|---|---|
| `--lm-text` | `#FFFFFF` | textes blancs purs | `colors.text` |
| `--lm-text-muted` | `rgba(255,255,255,.62)` | sous-titres cartes ≈ `#9E9E9E` sur fond ≈ `#08090C` | `colors.textMuted` (+ alpha) |
| `--lm-accent` | `#FFB067` | teinte du soleil couchant | `colors.accent` |
| `--lm-overlay` | `#03050A` | pixels bas de page `(3,5,10)`→`(9,9,9)` | `colors.overlay` |
| `--lm-overlay-strength` | `.9` | | `colors.overlayStrength` |
| `--lm-card-bg` | `rgba(10,12,18,.62)` | intérieur carte `(5,7,10)` sur photo sombre | `colors.cardBg` + `cardBgOpacity` |
| `--lm-card-border` | `rgba(255,255,255,.14)` | liseré 1 px clair | `colors.cardBorder` + `cardBorderOpacity` |
| `--lm-card-blur` | `20px` | | `cards.blur` |
| `--lm-card-radius` | `28px` | rayon mesuré ≈ 26–28 px | `cards.radius` |
| `--lm-stat-glow` | `rgba(60,110,255,.18)` | halo `(5,10,20)` derrière « 245K » | `colors.statGlow` |
| `--lm-font-display` | `'Kaushan Script'` | nom | `typography.display` |
| `--lm-font-hand` | `'Caveat'` | punchline, « Let's connect » | `typography.hand` |
| `--lm-font-body` | `'Inter', system-ui` | reste | `typography.body` |
| `--lm-name-scale` | `1` | | `typography.nameScale` |
| `--lm-bg-focal` | `60% 30%` | sujet centre-droit | `background.focal` |
| `--lm-bg-blur` | `0px` | | `background.blur` |
| `--lm-social-radius` | `50%` | boutons ronds | `social.shape` |

## 2. Tokens structurels (fixes, `src/design-system/tokens/_structure.scss`)

| Élément | Maquette (px) | 390 px (CSS) | 1024 px + |
|---|---|---|---|
| Marge latérale | 67 (texte), 148 (cartes) | **16** | 48 → 64 |
| Barre du haut : hauteur / pilule | pilule 138×48, rond 48 | pilule 40 h, rond 40 (zone tactile 44) | 48 |
| Logo script | ≈ 115×60 | 88 px de large | 120 |
| Punchline | 3 lignes, ~22 px, rotation ≈ −8° | 20 px, −8° | 24 px |
| Nom | cap ≈ 80 px, largeur 390 | `clamp(44px, 13.5vw, 88px)` × `--lm-name-scale` | 88 px |
| Catégories | 13 px, `letter-spacing .3em`, gris clair | 11 px, `.3em` | 13 px |
| Bio | 17 px, 2 lignes, interligne 1.5 | 15 px | 17 px |
| Stats : chiffre / libellé | ≈ 30 / 14 px, séparateurs 1 px (α .25) hauteur 48 | 26 / 12 px | 30 / 14 |
| Rail social | bouton Ø 56, pas 73, compteur 15 px à droite | Ø 44, pas 56, compteur 12 px | Ø 56 |
| Carte : hauteur | 104 | **92** (`comfortable`), 76 (`compact`) | 104 |
| Carte : vignette | 135 × 104 (≈ 1.3 : 1) | 112 × 92 | 136 |
| Carte : gap | 12 | 12 | 14 |
| Carte : titre / sous-titre | 16 / 12.5 px | 16 / 12.5 px | 17 / 13 |
| Bouton flèche | Ø 44, contour α .35 | Ø 40 (zone 44) | 44 |
| Icône outline carte | 22 px, trait 1.75 | 22 | 24 |
| Pied : « Let's connect » | 30 px, rotation −12°, cœur 18 px | 26 px | 30 |
| Chevron ↓ | Ø 48, bas-gauche | Ø 44 | 48 |
| « Powered by » | 12 px + logo 18 px, bas-droite | 11 / 16 | 12 / 18 |

## 3. Overlay (dégradé vertical, fixe sur le viewport)

`linear-gradient(to bottom, overlay α0 0%, α.05 20%, α.35 45%, α.8 70%, α.96 85%, α1 100%)`, chaque α multiplié par
`--lm-overlay-strength`. Mesures maquette : ciel intact à 6 % (`(143,154,161)`), noir quasi total à partir de 80 %.
Un second voile radial léger à gauche (`statGlow`) assure la lisibilité du texte sur photo claire.

## 4. Motion
- Entrée des cartes : fondu + `translateY(12px)` → 0, 420 ms `cubic-bezier(.2,.7,.2,1)`, décalage 60 ms par carte.
- Appui : `scale(.98)` ; survol : flèche `translateX(3px)`.
- Tout est désactivé si `prefers-reduced-motion: reduce` ou `motion.enabled = false`.

## 5. Repli `backdrop-filter`
`@supports not (backdrop-filter: blur(1px))` → `--lm-card-bg` recalculé à α `min(1, a + .25)`.

## 6. Presets
Sunset (défaut), Midnight Blue, Emerald Night, Rose Gold, Clean Light — valeurs dans `services/api/src/main/resources/theme/presets.json`.
