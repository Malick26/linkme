# ADR 0004 — Thème = JSON versionné → CSS custom properties

- Statut : accepté
- Décision : l'apparence complète d'une page est un `ThemeConfig` (JSON, `version: 1`) stocké en `jsonb` (`theme.draft`, `theme.published`). Validé côté serveur (record Java + Bean Validation + liste blanche de polices + propriété de l'`imageId`). Côté front, `themeToCssVars()` est une fonction **pure** qui produit un dictionnaire `--lm-*` posé en `style` sur le conteneur racine de la page (SSR compris → pas de flash).
- Migrations de schéma : champ `version` ; `ThemeMigrator` côté back met à niveau à la lecture.
- Garde-fou contraste : `contrast.ts` (WCAG 2.2, luminance relative) calcule le pire contraste texte/fond effectif (couleur de carte composée sur overlay) et propose une correction.
