import { z } from 'zod';

import { MIN_ACCOUNT_AGE, SUPPORTED_LOCALES } from '@/constants/constitution';

/**
 * The same rules the database enforces, expressed once for the form.
 *
 * Client validation is a convenience; the constraints, triggers and column
 * GRANTs in supabase/migrations are the real checks (docs/SECURITY.md). These
 * mirror them so a user is told before a round trip, never instead of one.
 */

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(20)
  .regex(/^[a-z0-9_]+$/, 'Only lowercase letters, numbers and underscores');

export const displayNameSchema = z.string().trim().min(1).max(40);

export const countryCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{2}$/, 'Country must be an ISO 3166-1 alpha-2 code');

export const citySchema = z.string().trim().min(1).max(80).nullable();

export const bioShortSchema = z.string().trim().max(160).nullable();

/**
 * Article 8.4 — 16 is a hard gate. Mirrors the profiles_enforce_min_age
 * trigger, which is what actually stops it.
 */
export const birthYearSchema = z
  .number()
  .int()
  .min(1900)
  .refine(
    (year) => new Date().getUTCFullYear() - year >= MIN_ACCOUNT_AGE,
    `You must be at least ${MIN_ACCOUNT_AGE}`
  );

/**
 * No `.default([])`: a Zod default makes the input and output types differ,
 * which react-hook-form's resolver cannot reconcile. The form supplies the
 * empty array instead.
 */
export const languagesSchema = z.array(z.string().min(2).max(8)).max(10);

/**
 * What onboarding collects: four required fields, three optional.
 *
 * Keeping the required set this small is the point — a long form would be the
 * first step towards a profile worth comparing to other profiles.
 */
export const createProfileSchema = z.object({
  username: usernameSchema,
  display_name: displayNameSchema,
  birth_year: birthYearSchema,
  country_code: countryCodeSchema,
  city: citySchema.optional(),
  languages: languagesSchema.optional(),
  bio_short: bioShortSchema.optional(),
});

/** birth_year is absent: the database refuses to update it (age gate). */
export const updateProfileSchema = createProfileSchema
  .omit({ birth_year: true })
  .partial()
  // Article 5.6 — leaving the draw is the user's decision, so this one
  // system-adjacent flag is user writable. selection_eligible is not.
  .extend({ wants_selection: z.boolean().optional() });

export type CreateProfileInput = z.infer<typeof createProfileSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const DEFAULT_LANGUAGES = [...SUPPORTED_LOCALES];
