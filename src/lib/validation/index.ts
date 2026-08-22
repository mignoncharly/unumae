import { z } from 'zod';

import {
  MIN_ACCOUNT_AGE,
  QUESTION_MAX_LENGTH,
  SUPPORTED_LOCALES,
} from '@/constants/constitution';

/**
 * Shared schemas. Constitution limits live in one place (constants) and are
 * referenced here, so a limit can never drift between the form, the client and
 * the database.
 */

export const localeSchema = z.enum(SUPPORTED_LOCALES);

/** ISO 3166-1 alpha-2. Article 8.2: country is sufficient, city never required. */
export const countryCodeSchema = z
  .string()
  .length(2)
  .regex(/^[A-Z]{2}$/, 'Country must be an ISO 3166-1 alpha-2 code');

/** Article 9.2 — 180 characters. */
export const questionSchema = z
  .string()
  .trim()
  .min(10)
  .max(QUESTION_MAX_LENGTH);

/** Article 8.4 — 16 is a hard gate, not a warning. */
export const birthYearSchema = z
  .number()
  .int()
  .refine(
    (year) => new Date().getUTCFullYear() - year >= MIN_ACCOUNT_AGE,
    `You must be at least ${MIN_ACCOUNT_AGE} to hold an account`
  );

export const cycleDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Cycle dates are UTC calendar dates');
