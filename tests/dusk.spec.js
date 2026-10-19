import { test, expect } from '@playwright/test';

const luminance = (rgb) => {
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const ratio = (a, b) => {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};

const parse = (value) => value.match(/\d+/g).slice(0, 3).map(Number);

test('senza JS il velo crepuscolo resta a zero', async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto('/');
  await expect(page.locator('[data-testid=dusk-overlay]')).toHaveCSS('opacity', '0');
  await ctx.close();
});

test('a fine pagina il footer resta sopra il velo e leggibile', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(400);

  const style = await page.evaluate(() => {
    const footer = document.querySelector('footer');
    const c = getComputedStyle(footer);
    const paper = getComputedStyle(document.documentElement).getPropertyValue('--c-paper').trim();
    const probe = document.createElement('span');
    probe.style.color = paper;
    document.body.appendChild(probe);
    const paperRgb = getComputedStyle(probe).color;
    probe.remove();
    return { position: c.position, color: c.color, paperRgb };
  });

  expect(style.position).toBe('relative');
  expect(ratio(parse(style.color), parse(style.paperRgb))).toBeGreaterThan(6);
});

test('lo scroll aggiorna la progressione senza superare 1', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => window.scrollTo(0, 10 ** 6));
  await page.waitForTimeout(400);
  const progress = await page.evaluate(() =>
    Number(getComputedStyle(document.documentElement).getPropertyValue('--progress')),
  );
  expect(progress).toBeGreaterThan(0.9);
  expect(progress).toBeLessThanOrEqual(1);
});
