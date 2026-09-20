#!/usr/bin/env bash
# Déploiement / mise à jour de LinkMe sur un VPS (Hetzner). Usage : ./deploy.sh [branche]
set -euo pipefail
BRANCH="${1:-main}"
cd "$(dirname "$0")/.."            # infra/
[ -f .env ] || { echo "infra/.env manquant (cp .env.example .env)"; exit 1; }

echo "→ Sauvegarde avant mise à jour"
./scripts/backup.sh || echo "  (sauvegarde ignorée : premier déploiement ?)"

echo "→ Récupération de la branche $BRANCH"
git -C .. fetch --all --prune
git -C .. checkout "$BRANCH"
git -C .. pull --ff-only

echo "→ Build et redémarrage"
docker compose up -d --build --wait

echo "→ État des services"
docker compose ps
echo "✔ Déploiement terminé — https://$(grep -E '^SITE_DOMAIN=' .env | cut -d= -f2)"
