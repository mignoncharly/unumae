import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const responsiveViewports = [
  { width: 320, height: 700 },
  { width: 375, height: 812 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
];

test('homepage holds its composition at target viewports', async ({ page }) => {
  test.skip(test.info().project.name !== 'chrome');

  for (const viewport of responsiveViewports) {
    await page.setViewportSize(viewport);
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Enter the journey' })
    ).toBeVisible();

    const bounds = await page.evaluate(() => ({
      viewport: window.innerWidth,
      page: document.documentElement.scrollWidth,
      body: document.body.scrollWidth,
    }));
    expect(bounds.page, JSON.stringify(viewport)).toBeLessThanOrEqual(
      bounds.viewport + 1
    );
    expect(bounds.body, JSON.stringify(viewport)).toBeLessThanOrEqual(
      bounds.viewport + 1
    );
  }
});

test('journey preview is usable with pointer and keyboard', async ({
  page,
}) => {
  test.skip(test.info().project.name !== 'chrome');
  await page.goto('/');

  const video = page.getByRole('tab', { name: 'Video' });
  const photo = page.getByRole('tab', { name: 'Photo' });
  const text = page.getByRole('tab', { name: 'Text' });

  await expect(video).toHaveAttribute('aria-selected', 'true');
  await photo.click();
  await expect(photo).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tabpanel', { name: 'Photo' })).toBeVisible();

  await photo.focus();
  await page.keyboard.press('ArrowRight');
  await expect(text).toBeFocused();
  await expect(text).toHaveAttribute('aria-selected', 'true');
});

test('redesigned homepage has no WCAG AA violations', async ({ page }) => {
  test.skip(test.info().project.name !== 'chrome');
  await page.goto('/');
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(results.violations).toEqual([]);
});

test('localized journeys retain translated content and working CTAs', async ({
  page,
}) => {
  test.skip(test.info().project.name !== 'chrome');

  for (const [route, heading] of [
    ['/fr', 'Le voyage'],
    ['/de', 'Die Reise'],
  ] as const) {
    await page.goto(route);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      heading
    );
    const todayHref = route === '/fr' ? '/fr/today' : '/de/today';
    await expect(page.locator(`a[href="${todayHref}"]`).last()).toBeVisible();
  }
});
