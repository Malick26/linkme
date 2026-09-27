# ── build ─────────────────────────────────────────────────────────────────
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
# npm ci --ignore-scripts puis rebuild ciblé d'esbuild dans une couche séparée :
# évite une course connue (ETXTBSY) où le binaire natif d'esbuild est exécuté
# par son propre postinstall avant que la couche du système de fichiers ne soit stabilisée
# (observé avec Docker Desktop / le snapshotter containerd sous Windows).
RUN npm ci --no-audit --no-fund --ignore-scripts
RUN npm rebuild esbuild --no-audit --no-fund
COPY . .
RUN npm run build

# ── runtime (non-root) ────────────────────────────────────────────────────
FROM node:24-alpine
ENV NODE_ENV=production PORT=4000
WORKDIR /app
# le serveur SSR est entièrement bundlé par esbuild : aucune dépendance node_modules à l'exécution
COPY --from=build --chown=node:node /app/dist/web ./dist/web
USER node
EXPOSE 4000
HEALTHCHECK --interval=15s --timeout=5s CMD wget -qO- http://localhost:4000/healthz || exit 1
CMD ["node", "dist/web/server/server.mjs"]
