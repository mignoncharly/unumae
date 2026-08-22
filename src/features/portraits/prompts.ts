import {
  PORTRAIT_ELEMENTS_MAX,
  PORTRAIT_ELEMENTS_MIN,
} from '@/constants/constitution';

/**
 * The guided prompts.
 *
 * The plan is blunt about why these exist: a blank textbox produces
 * "Hi guys, I'm John", and that kills the product. A prompt does not write
 * anyone's personality for them — it asks a specific enough question that an
 * ordinary answer becomes interesting.
 *
 * Order is deliberate. It opens with something easy and factual, moves inward,
 * and ends outward — which is roughly how a person warms up when a stranger
 * starts asking about their life.
 */
export const PORTRAIT_ELEMENT_KEYS = [
  'introduction',
  'where_im_from',
  'today_i_feel',
  'something_i_love',
  'something_misunderstood',
  'ordinary_moment',
  'something_id_tell_the_world',
] as const;

export type PortraitElementKey = (typeof PORTRAIT_ELEMENT_KEYS)[number];

export interface PortraitPrompt {
  key: PortraitElementKey;
  /** i18n key for the question shown above the field. */
  labelKey: string;
  /** i18n key for the quieter line under it. */
  hintKey: string;
  maxLength: number;
}

const DEFAULT_MAX = 600;

export const PORTRAIT_PROMPTS: PortraitPrompt[] = PORTRAIT_ELEMENT_KEYS.map(
  (key) => ({
    key,
    labelKey: `portrait.prompts.${key}.label`,
    hintKey: `portrait.prompts.${key}.hint`,
    // The introduction is tighter on purpose: it is the one people would
    // otherwise use to write a biography instead of a greeting.
    maxLength: key === 'introduction' ? 200 : DEFAULT_MAX,
  })
);

export const MIN_ANSWER_LENGTH = 10;

/** Article 9.1 — five of seven at MVP, and a photograph. */
export const REQUIRED_ANSWERS = PORTRAIT_ELEMENTS_MIN;
export const AVAILABLE_ANSWERS = PORTRAIT_ELEMENTS_MAX;

export interface PortraitCompleteness {
  answered: number;
  required: number;
  hasPhoto: boolean;
  canSubmit: boolean;
  /** How many more answers are needed. Zero once the minimum is met. */
  remaining: number;
}

/**
 * Whether a portrait may be submitted. Mirrors `submit_my_portrait()`, which
 * is what actually enforces it — this exists so the button can be disabled
 * with an explanation rather than failing on the server.
 */
export function assessCompleteness(
  answers: Partial<Record<PortraitElementKey, string>>,
  hasPhoto: boolean
): PortraitCompleteness {
  const answered = PORTRAIT_ELEMENT_KEYS.filter((key) => {
    const value = answers[key]?.trim() ?? '';
    return value.length >= MIN_ANSWER_LENGTH;
  }).length;

  return {
    answered,
    required: REQUIRED_ANSWERS,
    hasPhoto,
    canSubmit: answered >= REQUIRED_ANSWERS && hasPhoto,
    remaining: Math.max(0, REQUIRED_ANSWERS - answered),
  };
}
