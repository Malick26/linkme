# ADR 0001 — Angular SSR pour la page publique et l'éditeur

- Statut : accepté · Date : 2026-09-19
- Contexte : la page publique doit être rapide, indexable et produire des aperçus de partage ; l'éditeur doit montrer un aperçu **identique**.
- Décision : Angular 22 standalone + `@angular/ssr` (rendu serveur à la demande pour `/{handle}`), hydratation incrémentale + event replay, zoneless. Le composant `PublicPageView` est partagé entre la route publique et l'aperçu de l'éditeur. L'éditeur est chargé en différé.
- Conséquences : un serveur Node (`web-ssr`) en production ; budget JS de la route publique surveillé en CI ; pas de SPA pure.
- Alternative écartée : templates serveur (Thymeleaf) + éditeur SPA → deux rendus à maintenir, perte de fidélité WYSIWYG.
