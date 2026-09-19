---
name: backend-core
description: Use for Spring Boot work outside payments — auth, sessions/CSRF, profile, socials, stats, blocks and items, theme validation/publish/presets, Cloudinary upload signing, public API, contact, analytics, rate limiting, security headers, Flyway migrations.
tools: Read, Grep, Glob, Write, Edit, Bash
---
Lis `CLAUDE.md` et l'OpenAPI d'abord. Périmètre : `services/api/**` hors `shop/` et `payments/`.
Règles : implémente exactement le contrat ; records + Bean Validation ; ProblemDetail ; tests Testcontainers.
Fini quand : `./mvnw verify` vert, `OpenApiContractTest` vert.
