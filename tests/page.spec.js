import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:4173';
const WAVE_LAYER_SELECTOR = '[data-testid^="wave-layer"]';
const TITLE_IDS = ['nami', 'yama', 'tsuki'];

async function openPage(page) {
  const consoleErrors = [];
  const badResponses = [];
  const responses = [];

  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });

  page.on('pageerror', (error) => {
    consoleErrors.push(error.message);
  });

  page.on('response', (response) => {
    responses.push(response);

    if (response.status() >= 400) {
      badResponses.push(`${response.status()} ${response.url()}`);
    }
  });

  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);

  return { consoleErrors, badResponses, responses };
}

test('carica senza errori console e senza risposte HTTP >= 400', async ({ page }) => {
  const { consoleErrors, badResponses } = await openPage(page);

  expect(badResponses).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test('i layer, la montagna, l’hanko e i titoli sono visibili', async ({ page }) => {
  await page.goto('/');

  for (const id of [
    'hero',
    'wave-layer-1',
    'wave-layer-2',
    'wave-layer-3',
    'wave-layer-4',
    'mountain',
    'hanko',
    'title-nami',
    'title-yama',
    'title-tsuki',
  ]) {
    await expect(page.getByTestId(id)).toBeVisible();
  }
});

test('i titoli sono scritti in verticale con orientamento upright', async ({ page }) => {
  await page.goto('/');

  const styles = await page.evaluate((ids) => {
    return ids.map((id) => {
      const style = getComputedStyle(document.querySelector(`[data-testid="title-${id}"]`));

      return {
        writingMode: style.writingMode,
        textOrientation: style.textOrientation,
      };
    });
  }, TITLE_IDS);

  for (const style of styles) {
    expect(style.writingMode).toBe('vertical-rl');
    expect(style.textOrientation).toBe('upright');
  }
});

test('mobile: nessun overflow orizzontale e titoli dentro il viewport', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-390', 'solo mobile-390');

  await page.goto('/');

  const { scrollWidth, clientWidth, rects } = await page.evaluate((ids) => {
    return {
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      rects: ids.map((id) => {
        const rect = document.querySelector(`[data-testid="title-${id}"]`).getBoundingClientRect();

        return { left: rect.left, right: rect.right };
      }),
    };
  }, TITLE_IDS);

  expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);

  for (const rect of rects) {
    expect(rect.left).toBeGreaterThanOrEqual(0);
    expect(rect.right).toBeLessThanOrEqual(390);
  }
});

test('le onde si spostano con lo scroll e ogni layer ha un valore diverso', async ({ page }) => {
  await page.goto('/');

  const readTransforms = () =>
    page.evaluate((selector) => {
      return Array.from(document.querySelectorAll(selector)).map((element) => element.style.transform);
    }, WAVE_LAYER_SELECTOR);

  await page.waitForFunction(
    (selector) => {
      const layers = Array.from(document.querySelectorAll(selector));

      return layers.length === 4 && layers.every((layer) => layer.style.transform !== '');
    },
    WAVE_LAYER_SELECTOR,
  );

  const initial = await readTransforms();

  await page.evaluate(() => {
    window.scrollTo(0, (document.documentElement.scrollHeight - window.innerHeight) / 2);
  });

  await page.waitForFunction(
    ({ selector, before }) => {
      const current = Array.from(document.querySelectorAll(selector)).map(
        (element) => element.style.transform,
      );

      return (
        current.length === before.length &&
        current.every((value, index) => value !== before[index]) &&
        new Set(current).size === current.length
      );
    },
    { selector: WAVE_LAYER_SELECTOR, before: initial },
  );

  const moved = await readTransforms();

  expect(moved).toHaveLength(4);

  for (const [index, value] of moved.entries()) {
    expect(value).not.toBe(initial[index]);
  }

  expect(new Set(moved).size).toBe(4);
});

test('--progress resta basso in cima e sale oltre 0.9 in fondo', async ({ page }) => {
  await page.goto('/');

  const readProgress = () =>
    page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--progress').trim();
    });

  const topRaw = await readProgress();

  expect(topRaw).not.toBe('');
  expect(Number(topRaw)).toBeLessThan(0.05);

  await page.evaluate(() => {
    window.scrollTo(0, document.documentElement.scrollHeight);
  });

  await page.waitForFunction(() => {
    const progress = Number(
      getComputedStyle(document.documentElement).getPropertyValue('--progress'),
    );

    return progress > 0.9;
  });

  const bottomRaw = await readProgress();

  expect(bottomRaw).not.toBe('');
  expect(Number(bottomRaw)).toBeGreaterThan(0.9);
});

test('i font sono serviti solo dal dominio locale', async ({ page }) => {
  const { responses } = await openPage(page);
  const fontUrls = responses
    .filter((response) => response.request().resourceType() === 'font')
    .map((response) => response.url());

  expect(fontUrls.length).toBeGreaterThan(0);

  for (const url of fontUrls) {
    expect(url.startsWith(BASE_URL)).toBe(true);
  }
});

test('i due font sono disponibili', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);

  const checks = await page.evaluate(() => {
    return {
      shippori: document.fonts.check('1em "Shippori Mincho"'),
      garamond: document.fonts.check('1em "EB Garamond"'),
    };
  });

  expect(checks.shippori).toBe(true);
  expect(checks.garamond).toBe(true);
});

test('il peso totale delle risposte resta dentro il budget reale', async ({ page }) => {
  // Budget del progetto 1,5 MB; la pagina pesa ~49 KB, quindi la soglia stretta
  // e' 200 KB: cattura una regressione prima che il budget vero venga intaccato.
  const { responses } = await openPage(page);

  const sizes = await Promise.all(
    responses.map(async (response) => {
      try {
        const body = await response.body();

        return body.length;
      } catch {
        return 0;
      }
    }),
  );

  const total = sizes.reduce((sum, size) => sum + size, 0);

  expect(total).toBeLessThan(200_000);
});

test('non vengono richieste immagini raster', async ({ page }) => {
  const { responses } = await openPage(page);

  const rasterUrls = responses
    .map((response) => new URL(response.url()).pathname)
    .filter((pathname) => /\.(png|jpe?g|webp|avif|gif)$/i.test(pathname));

  expect(rasterUrls).toEqual([]);
});
