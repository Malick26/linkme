# ADR 0002 — Monolithe modulaire Spring Boot

- Statut : accepté
- Décision : un seul déployable `services/api`, un package par module (`auth`, `profile`, `blocks`, `theme`, `uploads`, `publicpage`, `analytics`, `contact`, `shop`, `payments`, `common`). Un module n'accède aux tables d'un autre qu'à travers son service public (pas de repository croisé), ce qui permettra un découpage ultérieur.
- Données : PostgreSQL 16, Flyway, UUID v4, `timestamptz` UTC, montants `BIGINT` XOF.
