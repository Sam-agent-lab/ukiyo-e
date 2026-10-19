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

// Solo rgb()/rgba(): un colore in oklch() o color() verrebbe letto male dalla regex.
const parse = (value, label) => {
  expect(value, `${label} deve essere in formato rgb/rgba, trovato: ${value}`).toMatch(/^rgba?\(/);
  return value.match(/[\d.]+/g).slice(0, 3).map(Number);
};

const alphaOf = (value) => {
  const parts = value.match(/[\d.]+/g);
  return parts.length === 4 ? Number(parts[3]) : 1;
};

test('senza JS il velo crepuscolo resta a zero', async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto('/');
  await expect(page.locator('[data-testid=dusk-overlay]')).toHaveCSS('opacity', '0');
  await ctx.close();
});

test('a fine pagina il footer sta sopra il velo e ha un fondo opaco', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));

  // Attesa sullo stato reale, non su un timeout.
  await page.waitForFunction(() => {
    const dusk = document.querySelector('[data-testid=dusk-overlay]');
    return Number(getComputedStyle(dusk).opacity) > 0.4;
  });

  const style = await page.evaluate(() => {
    const footer = document.querySelector('footer');
    const dusk = document.querySelector('[data-testid=dusk-overlay]');
    const c = getComputedStyle(footer);
    return {
      position: c.position,
      zIndex: Number(c.zIndex),
      color: c.color,
      background: c.backgroundColor,
      duskZIndex: Number(getComputedStyle(dusk).zIndex),
      duskOpacity: Number(getComputedStyle(dusk).opacity),
    };
  });

  expect(style.position).toBe('relative');
  expect(Number.isFinite(style.zIndex)).toBe(true);
  expect(style.zIndex).toBeGreaterThan(style.duskZIndex);
  expect(style.duskOpacity).toBeGreaterThan(0.4);

  // Il fondo deve essere opaco: un rgba con alpha < 1 lascerebbe passare il velo.
  expect(alphaOf(style.background)).toBe(1);
  expect(ratio(parse(style.color, 'colore footer'), parse(style.background, 'fondo footer'))).toBeGreaterThan(6);
});

test('lo scroll aggiorna la progressione senza superare 1', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => window.scrollTo(0, 10 ** 6));

  await page.waitForFunction(
    () => Number(getComputedStyle(document.documentElement).getPropertyValue('--progress')) > 0.9,
  );

  const progress = await page.evaluate(() =>
    Number(getComputedStyle(document.documentElement).getPropertyValue('--progress').trim()),
  );

  expect(progress).toBeGreaterThan(0.9);
  expect(progress).toBeLessThanOrEqual(1);
});
