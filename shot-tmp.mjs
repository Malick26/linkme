import { chromium } from '@playwright/test';
const [,, url, out, w, h, full] = process.argv;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
await p.goto(url, { waitUntil: 'networkidle' });
await p.waitForTimeout(900);
await p.screenshot({ path: out, fullPage: full === 'full' });
await b.close();
