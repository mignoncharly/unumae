import { CANONICAL_LOCALE, SUPPORTED_LOCALES } from '@/constants/constitution';

import { resources } from '..';

type Translations = Record<string, unknown>;

function flatten(value: Translations, prefix = ''): string[] {
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return child !== null && typeof child === 'object'
      ? flatten(child as Translations, path)
      : [path];
  });
}

function placeholders(value: string): string[] {
  return [...value.matchAll(/{{\s*(\w+)\s*}}/g)]
    .map((match) => match[1]!)
    .sort();
}

function valueAt(source: Translations, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>(
      (node, key) => (node as Translations | undefined)?.[key],
      source
    );
}

const canonicalKeys = flatten(
  resources[CANONICAL_LOCALE].translation as Translations
).sort();

/**
 * Article 9.6 — English is canonical. A missing key in another locale is a
 * silent fallback to English in production, which is exactly the kind of thing
 * nobody notices until a German user files a bug.
 */
describe('locale files', () => {
  it('ships the three MVP languages', () => {
    expect(Object.keys(resources).sort()).toEqual(
      [...SUPPORTED_LOCALES].sort()
    );
  });

  it.each(SUPPORTED_LOCALES.filter((code) => code !== CANONICAL_LOCALE))(
    '%s has exactly the same keys as English',
    (locale) => {
      const keys = flatten(
        resources[locale].translation as Translations
      ).sort();
      expect(keys).toEqual(canonicalKeys);
    }
  );

  it.each(SUPPORTED_LOCALES)('%s uses the same placeholders', (locale) => {
    const translation = resources[locale].translation as Translations;
    const canonical = resources[CANONICAL_LOCALE].translation as Translations;

    for (const key of canonicalKeys) {
      const source = valueAt(canonical, key);
      const target = valueAt(translation, key);
      if (typeof source === 'string' && typeof target === 'string') {
        expect({ key, placeholders: placeholders(target) }).toEqual({
          key,
          placeholders: placeholders(source),
        });
      }
    }
  });

  it.each(SUPPORTED_LOCALES)('%s has no empty strings', (locale) => {
    const translation = resources[locale].translation as Translations;
    for (const key of canonicalKeys) {
      expect(String(valueAt(translation, key)).trim()).not.toBe('');
    }
  });

  it('never translates the product name', () => {
    for (const locale of SUPPORTED_LOCALES) {
      const translation = resources[locale].translation as Translations;
      expect(valueAt(translation, 'common.appName')).toBe('ONE HUMAN');
    }
  });
});
