import { test, expect } from '@playwright/test';

const WAVE_LAYER_SELECTOR = '[data-testid^="wave-layer"]';

test.describe('prefers-reduced-motion', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-1440', 'solo project desktop-1440');
    await page.emulateMedia({ reducedMotion: 'reduce' });
  });

  test('non ci sono animazioni attive', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);

    const animations = await page.evaluate(() => document.getAnimations().length);

    expect(animations).toBe(0);
  });

  test('lo scroll non modifica il transform dei layer', async ({ page }) => {
    await page.goto('/');

    const readTransforms = () =>
      page.evaluate((selector) => {
        return Array.from(document.querySelectorAll(selector)).map((element) => {
          return getComputedStyle(element).transform;
        });
      }, WAVE_LAYER_SELECTOR);

    const initial = await readTransforms();

    expect(initial).toHaveLength(4);

    await page.evaluate(() => {
      window.scrollTo(0, (document.documentElement.scrollHeight - window.innerHeight) / 2);
    });

    await page.waitForFunction(() => window.scrollY > 0);

    const afterScroll = await readTransforms();

    expect(afterScroll).toEqual(initial);
  });

  test('il layer di drift è assente o nascosto', async ({ page }) => {
    await page.goto('/');

    const drift = page.getByTestId('drift-layer');
    const count = await drift.count();

    if (count === 0) {
      expect(count).toBe(0);
    } else {
      await expect(drift).toBeHidden();
    }
  });
});
