import { createClient } from 'jsr:@supabase/supabase-js@2';

import { mapWithConcurrency } from '../_shared/boundedConcurrency.ts';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { fetchWithTimeout } from '../_shared/providerFetch.ts';
import { isServiceRoleRequest } from '../_shared/serviceRole.ts';
import {
  finishWorkerRun,
  startWorkerRun,
  type WorkerInvocation,
} from '../_shared/workerRun.ts';

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

interface PendingQuestionRow {
  question_id: string;
  field: 'body' | 'answer';
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

type ProviderCategory =
  | 'accepted'
  | 'timeout'
  | 'network'
  | 'rate_limited'
  | 'auth'
  | 'invalid_request'
  | 'provider_error'
  | 'malformed_response'
  | 'internal';

interface TranslationResult {
  translation: DeeplTranslation | null;
  category: ProviderCategory;
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
): Promise<TranslationResult> {
  // The free tier lives on a different host, distinguished by the key suffix.
  const host = key.endsWith(':fx')
    ? 'https://api-free.deepl.com'
    : 'https://api.deepl.com';

  const transport = await fetchWithTimeout(`${host}/v2/translate`, {
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

  if (!transport.response)
    return {
      translation: null,
      category: transport.category === 'ok' ? 'network' : transport.category,
    };
  if (!transport.response.ok) {
    const status = transport.response.status;
    return {
      translation: null,
      category:
        status === 401 || status === 403
          ? 'auth'
          : status === 429
            ? 'rate_limited'
            : status >= 400 && status < 500
              ? 'invalid_request'
              : 'provider_error',
    };
  }
  try {
    const body = (await transport.response.json()) as {
      translations?: DeeplTranslation[];
    };
    const translation = body.translations?.[0];
    return translation
      ? { translation, category: 'accepted' }
      : { translation: null, category: 'malformed_response' };
  } catch {
    return { translation: null, category: 'malformed_response' };
  }
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

  if (!(await isServiceRoleRequest(request, url, serviceKey))) {
    return jsonResponse({ error: 'unauthorized' }, 401);
  }

  const payload = (await request.json().catch(() => ({}))) as WorkerInvocation;
  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const workerRun = await startWorkerRun(
    supabase,
    payload,
    'translate-portraits'
  );
  if (!workerRun) return jsonResponse({ error: 'job_run_unavailable' }, 409);

  if (!deeplKey) {
    // Not an error. The product works without translations — the original is
    // always there, and it is the version that governs.
    await finishWorkerRun(supabase, workerRun, {
      succeeded: true,
      detail: 'Translation is disabled; originals remain available',
      providerCategory: 'not_configured',
    });
    return jsonResponse({ configured: false, translated: 0 }, 200);
  }

  const { data, error } = await supabase.rpc('pending_translations', {
    batch_size: 50,
  });

  if (error) {
    await finishWorkerRun(supabase, workerRun, {
      succeeded: false,
      retryable: true,
      detail: 'Translation queue could not be read',
      providerCategory: 'internal',
    });
    return jsonResponse({ error: error.message }, 500);
  }

  const pending = (data ?? []) as PendingRow[];
  const { data: questionData, error: questionError } = await supabase.rpc(
    'pending_question_translations',
    { batch_size: 50 }
  );

  if (questionError) {
    await finishWorkerRun(supabase, workerRun, {
      succeeded: false,
      retryable: true,
      detail: 'Question translation queue could not be read',
      providerCategory: 'internal',
    });
    return jsonResponse({ error: questionError.message }, 500);
  }

  const pendingQuestions = (questionData ?? []) as PendingQuestionRow[];
  type WorkItem =
    | ({ kind: 'portrait' } & PendingRow)
    | ({ kind: 'question' } & PendingQuestionRow);
  type ItemOutcome = {
    state: 'translated' | 'skipped' | 'failed';
    category: ProviderCategory;
  };
  const work: WorkItem[] = [
    ...pending.map((row) => ({ kind: 'portrait' as const, ...row })),
    ...pendingQuestions.map((row) => ({ kind: 'question' as const, ...row })),
  ];

  const outcomes = await mapWithConcurrency<WorkItem, ItemOutcome>(
    work,
    5,
    async (row) => {
      const targetId =
        row.kind === 'portrait' ? row.portrait_id : row.question_id;
      const targetField = row.kind === 'portrait' ? row.element_key : row.field;
      const attempt = async (succeeded: boolean, category: ProviderCategory) =>
        supabase.rpc('record_translation_attempt', {
          target_kind: row.kind,
          target_id: targetId,
          target_field: targetField,
          target_locale: row.target_locale,
          succeeded,
          provider_category: succeeded ? null : category,
        });

      const result = await translate(
        deeplKey,
        row.original_text,
        row.target_locale
      );
      if (!result.translation) {
        await attempt(false, result.category);
        return { state: 'failed', category: result.category };
      }

      const sameLanguage =
        result.translation.detected_source_language
          .slice(0, 2)
          .toLowerCase() === row.target_locale;
      const write =
        row.kind === 'portrait'
          ? await supabase.rpc(
              sameLanguage ? 'record_same_language' : 'record_translation',
              sameLanguage
                ? {
                    target_portrait: row.portrait_id,
                    target_element: row.element_key,
                    target_locale: row.target_locale,
                  }
                : {
                    target_portrait: row.portrait_id,
                    target_element: row.element_key,
                    target_locale: row.target_locale,
                    text_value: result.translation.text,
                    translation_engine: ENGINE,
                  }
            )
          : await supabase.rpc(
              sameLanguage
                ? 'record_same_question_language'
                : 'record_question_translation',
              sameLanguage
                ? {
                    target_question: row.question_id,
                    target_field: row.field,
                    target_locale: row.target_locale,
                  }
                : {
                    target_question: row.question_id,
                    target_field: row.field,
                    target_locale: row.target_locale,
                    text_value: result.translation.text,
                    translation_engine: ENGINE,
                  }
            );
      if (write.error || write.data !== true) {
        await attempt(false, 'internal');
        return { state: 'failed', category: 'internal' };
      }
      await attempt(true, 'accepted');
      return {
        state: sameLanguage ? 'skipped' : 'translated',
        category: 'accepted',
      };
    }
  );

  const translated = outcomes.filter(
    (item) => item.state === 'translated'
  ).length;
  const skipped = outcomes.filter((item) => item.state === 'skipped').length;
  const failures = outcomes.filter((item) => item.state === 'failed');
  const failed = failures.length;

  const succeeded = failed === 0;
  const queued = pending.length + pendingQuestions.length;
  const detail = `${translated} translated, ${skipped} already in target language, ${failed} failed, ${queued} queued`;
  const providerCategory =
    failures.find((item) => item.category === 'auth')?.category ??
    failures[0]?.category ??
    'accepted';
  await finishWorkerRun(supabase, workerRun, {
    succeeded,
    retryable: failed > 0 && providerCategory !== 'auth',
    detail,
    providerCategory,
  });

  return jsonResponse(
    { configured: true, pending: queued, translated, skipped, failed },
    succeeded ? 200 : 502
  );
});
