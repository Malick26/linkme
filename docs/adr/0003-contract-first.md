# ADR 0003 — Contrat OpenAPI-first

- Statut : accepté
- Décision : `services/api/src/main/resources/openapi/openapi.yaml` est la source de vérité. Le front génère `apps/web/src/app/core/api/schema.d.ts` (`openapi-typescript`) et utilise un client typé minimal (`ApiClient`, basé sur `HttpClient`). Côté back, les DTO sont des `record` validés ; `OpenApiContractTest` garantit que chaque `operationId` est implémenté et `SchemaParityTest` que `ThemeConfig` accepte l'exemple du contrat.
- Processus : modifier le YAML → `npm run gen:api` → implémenter → tests.
