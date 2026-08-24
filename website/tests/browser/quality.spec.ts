import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const locales = ['', '/fr', '/de'];
const pages = [
  '',
  '/today',
  '/about',
  '/how-selection-works',
  '/archive',
  '/community-guidelines',
  '/privacy',
  '/terms',
];
const publicRoutes = locales.flatMap((locale) =>
  pages.map((page) => locale + page || '/')
);
const sharedHuman = '/human/00000000-0000-4000-8000-000000000001';
publicRoutes.push(...locales.map((locale) => `${locale}${sharedHuman}`));
const representativeRoutes = [
  '/',
  '/today',
  '/archive',
  sharedHuman,
  '/how-selection-works',
  '/privacy',
];

test('all public routes keep their core semantics and responsive bounds', async ({
  page,
}) => {
  for (const route of publicRoutes) {
    const response = await page.goto(route);
    expect(response?.ok(), route).toBeTruthy();
    await expect(page.locator('main')).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(page.getByRole('banner')).toBeVisible();
    await expect(page.getByRole('contentinfo')).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    );
    expect(overflow, `${route} overflows horizontally`).toBeLessThanOrEqual(1);
  }
});

test('representative routes have no WCAG 2.2 AA axe violations', async ({
  page,
}) => {
  for (const route of representativeRoutes) {
    await page.goto(route);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(results.violations, route).toEqual([]);
  }
});

test('skip link is first and moves keyboard focus to main content', async ({
  page,
}) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  const skipLink = page.locator('.skip-link');
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main-content')).toBeFocused();
});

test('landmarks expose distinct accessible names', async ({ page }) => {
  await page.goto('/');
  const navigations = page.getByRole('navigation');
  await expect(navigations).toHaveCount(3);
  const names = await navigations.evaluateAll((elements) =>
    elements.map((element) => element.getAttribute('aria-label'))
  );
  expect(new Set(names).size).toBe(names.length);
});

test('reduced motion removes animation and smooth scrolling', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const motion = await page.evaluate(() => ({
    longestAnimation: Math.max(
      0,
      ...document.getAnimations().map((animation) => {
        const duration = animation.effect?.getComputedTiming().duration ?? 0;
        return typeof duration === 'number' ? duration : 0;
      })
    ),
    scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
    longestTransition: Math.max(
      ...Array.from(document.querySelectorAll('*')).flatMap((element) =>
        getComputedStyle(element)
          .transitionDuration.split(',')
          .map((duration) =>
            duration.trim().endsWith('ms')
              ? Number.parseFloat(duration) / 1000
              : Number.parseFloat(duration)
          )
      )
    ),
  }));
  expect(motion.longestAnimation).toBeLessThanOrEqual(10);
  expect(motion.scrollBehavior).toBe('auto');
  expect(motion.longestTransition).toBeLessThanOrEqual(0.01);
});

test('200 percent layout equivalent stays readable without page overflow', async ({
  page,
}) => {
  test.skip(test.info().project.name === 'ios-safari');
  await page.setViewportSize({ width: 640, height: 800 });
  for (const route of representativeRoutes) {
    await page.goto(route);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    );
    expect(overflow, route).toBeLessThanOrEqual(1);
  }
});

test('mobile interactive targets meet the 44 CSS pixel minimum', async ({
  page,
}) => {
  test.skip(test.info().project.name !== 'ios-safari');
  for (const route of publicRoutes) {
    await page.goto(route);
    const undersized = await page
      .locator('a[href], button, select')
      .evaluateAll((elements) =>
        elements
          .filter((element) => {
            const style = getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            return (
              style.display !== 'none' &&
              style.visibility !== 'hidden' &&
              rect.width > 0 &&
              rect.height > 0
            );
          })
          .map((element) => {
            const rect = element.getBoundingClientRect();
            return {
              label:
                element.getAttribute('aria-label') ||
                element.textContent?.trim() ||
                element.tagName,
              width: rect.width,
              height: rect.height,
            };
          })
          .filter(({ width, height }) => width < 44 || height < 44)
      );
    expect(undersized, route).toEqual([]);
  }
});

test('low bandwidth still delivers complete core content', async ({ page }) => {
  test.skip(test.info().project.name !== 'chrome');
  await page.route('**/*', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 120));
    await route.continue();
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('contentinfo')).toBeVisible();
});

test('the allowlisted event contains no identifier and respects privacy signals', async ({
  page,
  context,
}) => {
  test.skip(test.info().project.name !== 'chrome');
  let body: unknown;
  await page.route('**/api/marketing-events', async (route) => {
    body = route.request().postDataJSON();
    await route.fulfill({ status: 204 });
  });
  await page.goto('/');
  await page
    .locator('[data-analytics-event]')
    .first()
    .evaluate((element) => {
      element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
  await expect
    .poll(() => body)
    .toEqual({
      event: 'selection_explainer_opened',
      locale: 'en',
      source: 'home',
    });
  expect(Object.keys(body as object).sort()).toEqual([
    'event',
    'locale',
    'source',
  ]);
  expect(await context.cookies()).toEqual([]);
  expect(
    await page.evaluate(() => ({
      local: localStorage.length,
      session: sessionStorage.length,
    }))
  ).toEqual({ local: 0, session: 0 });
});

test('Global Privacy Control suppresses measurement', async ({
  page,
  context,
}) => {
  test.skip(test.info().project.name !== 'chrome');
  await context.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'globalPrivacyControl', {
      configurable: true,
      get: () => true,
    });
  });
  let requests = 0;
  await page.route('**/api/marketing-events', async (route) => {
    requests += 1;
    await route.fulfill({ status: 204 });
  });
  await page.goto('/');
  await page
    .locator('[data-analytics-event]')
    .first()
    .evaluate((element) => {
      element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
  await page.waitForTimeout(250);
  expect(requests).toBe(0);
});

test('Do Not Track suppresses measurement', async ({ page, context }) => {
  test.skip(test.info().project.name !== 'chrome');
  await context.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'doNotTrack', {
      configurable: true,
      get: () => '1',
    });
  });
  let requests = 0;
  await page.route('**/api/marketing-events', async (route) => {
    requests += 1;
    await route.fulfill({ status: 204 });
  });
  await page.goto('/');
  await page
    .locator('[data-analytics-event]')
    .first()
    .evaluate((element) => {
      element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
  await page.waitForTimeout(250);
  expect(requests).toBe(0);
});
