import { AngularNodeAppEngine, createNodeRequestHandler, isMainModule, writeResponseToNodeResponse } from '@angular/ssr/node';
import compression from 'compression';
import express from 'express';
import { join } from 'node:path';

/**
 * Serveur SSR (conteneur `web`). Variables d'environnement :
 * - API_INTERNAL_URL  : URL de l'API vue depuis ce conteneur (ex. http://api:8080)
 * - PUBLIC_BASE_URL   : URL publique du site (OG, canonical, partage)
 * - USE_FIXTURES      : "true" → page /malick rendue depuis les fixtures (tests visuels, Phase 1)
 * - ALLOWED_HOSTS     : hôtes autorisés (protection SSRF d'Angular), séparés par des virgules
 * - API_PROXY         : "true" → proxifie /api vers API_INTERNAL_URL (dev sans reverse proxy)
 */
const browserDistFolder = join(import.meta.dirname, '../browser');
const app = express();
app.disable('x-powered-by');
// gzip/brotli aussi assuré par Caddy en production ; utile en accès direct et pour Lighthouse CI
app.use(compression());
// Protection SSRF d'Angular : hôtes acceptés (ALLOWED_HOSTS="linkme.sn,www.linkme.sn")
const allowedHosts = (process.env['ALLOWED_HOSTS'] ?? 'localhost,127.0.0.1,web')
  .split(',')
  .map((h) => h.trim())
  .filter(Boolean);
const angularApp = new AngularNodeAppEngine({ allowedHosts });

const runtime = {
  apiInternalUrl: process.env['API_INTERNAL_URL'] ?? 'http://localhost:8080',
  publicBaseUrl: process.env['PUBLIC_BASE_URL'] ?? 'http://localhost:4000',
  useFixtures: process.env['USE_FIXTURES'] === 'true',
};

app.get('/healthz', (_req, res) => {
  res.json({ status: 'ok' });
});

// Proxy /api minimal pour le développement local sans Caddy (en production, Caddy route /api vers l'API).
if (process.env['API_PROXY'] === 'true') {
  app.use('/api', async (req, res) => {
    try {
      const url = runtime.apiInternalUrl.replace(/\/$/, '') + req.originalUrl;
      const chunks: Buffer[] = [];
      for await (const c of req) chunks.push(c as Buffer);
      const headers = new Headers();
      for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string' && k !== 'host') headers.set(k, v);
      const r = await fetch(url, { method: req.method, headers, body: chunks.length ? Buffer.concat(chunks) : undefined, redirect: 'manual' });
      res.status(r.status);
      r.headers.forEach((v, k) => {
        if (k !== 'content-encoding' && k !== 'transfer-encoding' && k !== 'set-cookie') res.setHeader(k, v);
      });
      const cookies = r.headers.getSetCookie?.() ?? [];
      if (cookies.length) res.setHeader('set-cookie', cookies);
      res.send(Buffer.from(await r.arrayBuffer()));
    } catch {
      res.status(502).json({ title: 'API indisponible', status: 502 });
    }
  });
}

app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
    setHeaders(res, path) {
      // fichiers non hachés (polices, seed) : cache plus court
      if (/\/(fonts|seed)\//.test(path)) res.setHeader('Cache-Control', 'public, max-age=2592000');
    },
  }),
);

app.use((req, res, next) => {
  angularApp
    .handle(req, runtime)
    .then((response) => (response ? writeResponseToNodeResponse(response, res) : next()))
    .catch(next);
});

if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) throw error;
    console.log(`SSR prêt sur http://localhost:${port}`);
  });
}

export const reqHandler = createNodeRequestHandler(app);
