import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE_URL || 'http://localhost:4173';
const OUT = 'shots';
mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { name: '390', width: 390, height: 844 },
  { name: '1440', width: 1440, height: 900 },
];

const browser = await chromium.launch();
for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(BASE, { waitUntil: 'networkidle' });
  const h = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
  const stops = [
    ['top', 0],
    ['mid', Math.round(h / 2)],
    ['bottom', h],
  ];
  for (const [label, y] of stops) {
    await page.evaluate((to) => window.scrollTo(0, to), y);
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${OUT}/${vp.name}-${label}.png`, fullPage: false });
  }
  if (errors.length) console.log(`[${vp.name}] console errors:`, errors.slice(0, 5));
  else console.log(`[${vp.name}] no console errors`);
  await ctx.close();
}
await browser.close();
console.log('shots done');
