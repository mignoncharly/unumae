import { createClient } from 'jsr:@supabase/supabase-js@2';

import { corsHeaders, jsonResponse } from '../_shared/cors.ts';

/**
 * Fills in the translations of published portraits.
 *
 * Article 9.6 — a translation is added, never substituted. That is enforced by
 * the schema rather than by this function: translations live in their own
 * table, the reader fetches the original from a different function, and there
 * is no code path anywhere that can return a translation *instead of* somebody
 * else's words. This job only fills the additional table.
 *
 * It never touches an unapproved portrait. Sending a person's answers to a
 * translation vendor before a moderator has looked at them would be a leak with
 * a queue in front of it.
 *
 * Deploy with:
 *   npx supabase functions deploy translate-portraits --project-ref <ref>
 *
 * Needs DEEPL_API_KEY set as a function secret. Without it the function reports
 * that it is not configured and changes nothing — it does not fail loudly every
 * night, and it does not silently pretend to have worked.
 */

type Locale = 'en' | 'fr' | 'de';

interface PendingRow {
  portrait_id: string;
  element_key: string;
  original_text: string;
  target_locale: Locale;
}

const ENGINE = 'deepl';

/** DeepL's target codes differ from ours for English. */
const DEEPL_TARGET: Record<Locale, string> = {
  en: 'EN-GB',
  fr: 'FR',
  de: 'DE',
};

interface DeeplTranslation {
  detected_source_language: string;
  text: string;
}

/**
 * One call per string.
 *
 * DeepL accepts batches, but a batch shares one detected source language, and
 * portraits from different people are exactly the case where that assumption
 * breaks. Correctness over request count: this runs once a night against a
 * queue of tens, not thousands.
 */
async function translate(
  key: string,
  text: string,
  target: Locale
): Promise<DeeplTranslation | null> {
  // The free tier lives on a different host, distinguished by the key suffix.
  const host = key.endsWith(':fx')
    ? 'https://api-free.deepl.com'
    : 'https://api.deepl.com';

  let response: Response;
  try {
    response = await fetch(`${host}/v2/translate`, {
      method: 'POST',
      headers: {
        Authorization: `DeepL-Auth-Key ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: [text],
        target_lang: DEEPL_TARGET[target],
      }),
    });
  } catch {
    return null;
  }

  if (!response.ok) {
    return null;
  }

  const body = (await response.json()) as { translations?: DeeplTranslation[] };
  return body.translations?.[0] ?? null;
}

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405);
  }

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const deeplKey = Deno.env.get('DEEPL_API_KEY');

  if (!url || !serviceKey) {
    return jsonResponse({ error: 'Not configured' }, 500);
  }

  if (request.headers.get('Authorization') !== `Bearer ${serviceKey}`) {
    return jsonResponse({ error: 'unauthorized' }, 401);
  }

  const payload = (await request.json().catch(() => ({}))) as {
    jobRunId?: number;
  };
  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const finish = async (succeeded: boolean, detail: string) => {
    if (typeof payload.jobRunId === 'number') {
      await supabase.rpc('complete_job_run', {
        target_run: payload.jobRunId,
        succeeded,
        result_detail: detail,
      });
    }
  };

  if (!deeplKey) {
    // Not an error. The product works without translations — the original is
    // always there, and it is the version that governs.
    await finish(true, 'Translation is disabled; originals remain available');
    return jsonResponse({ configured: false, translated: 0 }, 200);
  }

  const { data, error } = await supabase.rpc('pending_translations', {
    batch_size: 50,
  });

  if (error) {
    await finish(false, 'Translation queue could not be read');
    return jsonResponse({ error: error.message }, 500);
  }

  const pending = (data ?? []) as PendingRow[];
  let translated = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of pending) {
    const result = await translate(
      deeplKey,
      row.original_text,
      row.target_locale
    );

    if (!result) {
      failed += 1;
      continue;
    }

    // Already in this language. Recorded as its own translation so the queue
    // does not offer it again every night for the rest of the product's life.
    if (
      result.detected_source_language.slice(0, 2).toLowerCase() ===
      row.target_locale
    ) {
      await supabase.rpc('record_same_language', {
        target_portrait: row.portrait_id,
        target_element: row.element_key,
        target_locale: row.target_locale,
      });
      skipped += 1;
      continue;
    }

    const { error: writeError } = await supabase.rpc('record_translation', {
      target_portrait: row.portrait_id,
      target_element: row.element_key,
      target_locale: row.target_locale,
      text_value: result.text,
      translation_engine: ENGINE,
    });

    if (writeError) {
      failed += 1;
      continue;
    }

    translated += 1;
  }

  const succeeded = failed === 0;
  const detail = `${translated} translated, ${skipped} already in target language, ${failed} failed, ${pending.length} queued`;
  await finish(succeeded, detail);

  return jsonResponse(
    { configured: true, pending: pending.length, translated, skipped, failed },
    succeeded ? 200 : 502
  );
});
