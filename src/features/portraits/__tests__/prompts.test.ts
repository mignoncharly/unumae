import {
  PORTRAIT_ELEMENTS_AVAILABLE,
  PORTRAIT_ELEMENTS_MAX,
  PORTRAIT_ELEMENTS_MIN,
} from '@/constants/constitution';
import de from '@/i18n/locales/de.json';
import en from '@/i18n/locales/en.json';
import fr from '@/i18n/locales/fr.json';

import {
  assessCompleteness,
  MIN_ANSWER_LENGTH,
  PORTRAIT_ELEMENT_KEYS,
  PORTRAIT_PROMPTS,
  type PortraitElementKey,
} from '../prompts';

const answer = (text = 'x'.repeat(MIN_ANSWER_LENGTH)) => text;

function answersFor(
  count: number
): Partial<Record<PortraitElementKey, string>> {
  return Object.fromEntries(
    PORTRAIT_ELEMENT_KEYS.slice(0, count).map((key) => [key, answer()])
  );
}

describe('the guided prompts', () => {
  it('offers seven written prompts, within the nine elements', () => {
    expect(PORTRAIT_PROMPTS).toHaveLength(7);
    // Seven written + a photograph + optional media = the nine of Article 9.1.
    expect(PORTRAIT_ELEMENTS_AVAILABLE).toBe(9);
    expect(PORTRAIT_ELEMENTS_MAX).toBe(7);
  });

  it('is a set of questions, never a blank textbox', () => {
    // The whole reason this phase exists: an empty box produces
    // "Hi guys, I'm John".
    for (const prompt of PORTRAIT_PROMPTS) {
      expect(prompt.labelKey).toMatch(/^portrait\.prompts\./);
      expect(prompt.hintKey).toMatch(/^portrait\.prompts\./);
    }
  });

  it('keeps the introduction tighter than the rest', () => {
    const introduction = PORTRAIT_PROMPTS.find(
      (prompt) => prompt.key === 'introduction'
    );
    const others = PORTRAIT_PROMPTS.filter(
      (prompt) => prompt.key !== 'introduction'
    );

    expect(introduction?.maxLength).toBe(200);
    for (const prompt of others) {
      expect(prompt.maxLength).toBeGreaterThan(introduction!.maxLength);
    }
  });

  it('opens with something easy and ends outward', () => {
    expect(PORTRAIT_ELEMENT_KEYS[0]).toBe('introduction');
    expect(PORTRAIT_ELEMENT_KEYS.at(-1)).toBe('something_id_tell_the_world');
  });
});

describe('when a portrait may be submitted', () => {
  it('needs five answers and a photograph (Article 9.1)', () => {
    expect(PORTRAIT_ELEMENTS_MIN).toBe(5);
    expect(assessCompleteness(answersFor(5), true).canSubmit).toBe(true);
  });

  it('refuses four answers', () => {
    const result = assessCompleteness(answersFor(4), true);
    expect(result.canSubmit).toBe(false);
    expect(result.remaining).toBe(1);
  });

  it('refuses a portrait with no photograph', () => {
    expect(assessCompleteness(answersFor(7), false).canSubmit).toBe(false);
  });

  it('does not count an answer that is only whitespace', () => {
    const answers = { ...answersFor(4), where_im_from: '     ' };
    expect(assessCompleteness(answers, true).canSubmit).toBe(false);
  });

  it('does not count an answer below the minimum length', () => {
    // Four supplied, one of them too short to say anything, so three count.
    const answers = { ...answersFor(4), today_i_feel: 'ok' };
    expect(assessCompleteness(answers, true).answered).toBe(3);
  });

  it('accepts more than the minimum without requiring it', () => {
    // Everything beyond five is the author's choice, and skipping one is never
    // displayed as an absence.
    expect(assessCompleteness(answersFor(7), true).canSubmit).toBe(true);
    expect(assessCompleteness(answersFor(7), true).remaining).toBe(0);
  });
});

describe('the prompts as a person reads them', () => {
  const locales = { en, fr, de } as const;

  it.each(Object.entries(locales))('%s translates every prompt', (_l, t) => {
    for (const key of PORTRAIT_ELEMENT_KEYS) {
      expect(t.portrait.prompts[key].label.length).toBeGreaterThan(3);
      expect(t.portrait.prompts[key].hint.length).toBeGreaterThan(10);
    }
  });

  it.each(Object.entries(locales))(
    '%s never tells the author what a good answer looks like',
    (_l, t) => {
      // Prompts elicit; they do not compose a personality (Article 9.1).
      const text = Object.values(t.portrait.prompts)
        .flatMap((prompt) => [prompt.label, prompt.hint])
        .join(' ')
        .toLowerCase();

      // Instructions to perform, not reassurances. "It does not have to be
      // interesting" is the opposite of the thing being guarded against, so
      // the patterns are imperative forms only.
      for (const forbidden of [
        'make it interesting',
        'make it engaging',
        'be memorable',
        'stand out',
        'rendez-le intéressant',
        'soyez intéressant',
        'mach es interessant',
        'sei interessant',
      ]) {
        expect(text).not.toContain(forbidden);
      }
    }
  );

  it.each(Object.entries(locales))(
    '%s says a person reviews the portrait before publication',
    (_l, t) => {
      expect(t.portrait.submitNote.length).toBeGreaterThan(30);
    }
  );
});
