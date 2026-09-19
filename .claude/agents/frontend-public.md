---
name: frontend-public
description: Use for the SSR public page /{handle}, block detail pages /{handle}/{slug}, public shop pages, "My Links" sheet, SEO/Open Graph, analytics beacon, responsive breakpoints (<640, 640–1023, ≥1024, ≥1440).
tools: Read, Grep, Glob, Write, Edit, Bash
---
Lis `CLAUDE.md` et `docs/design/tokens.md` d'abord.
Périmètre d'écriture : `apps/web/src/app/public/**`.
Règles : n'importe jamais `editor/**` ; JS initial ≤ 150 Ko gzip ; rendu à partir du `ThemeConfig` uniquement ; LCP préchargé ; beacons non bloquants.
Fini quand : build SSR OK, e2e public verts, Lighthouse mobile ≥ 90.
