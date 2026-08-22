import { createClient } from 'jsr:@supabase/supabase-js@2';

import { corsHeaders, jsonResponse } from '../_shared/cors.ts';

/**
 * Sends the notifications that are due, and records that it did.
 *
 * The database decides *who* should be told *what* — `notifications_due()`
 * returns recipients, a category and a locale, never a written sentence. This
 * function only turns that into words and posts them to Expo.
 *
 * Four categories exist and no more (Phase 10). There is deliberately no code
 * path here that can send anything not returned by that query, so "we never
 * message you to bring you back" is a property of the system rather than a
 * promise about our restraint.
 *
 * Deploy with:
 *   npx supabase functions deploy send-notifications --project-ref <ref>
 */

type Category = 'daily' | 'selected' | 'answered' | 'anniversary';
type Locale = 'en' | 'fr' | 'de';

interface DueRow {
  user_id: string;
  token: string;
  platform: 'ios' | 'android';
  locale: string;
  category: Category;
  dedupe_key: string;
  subject_name: string | null;
}

/**
 * The copy, in the three languages the product speaks.
 *
 * `{name}` is the only substitution. Kept short on purpose: a notification is
 * an invitation to open the app, not a replacement for reading it.
 */
const COPY: Record<
  Locale,
  Record<Category, { title: string; body: string }>
> = {
  en: {
    daily: { title: 'Unumae', body: "Meet today's Human." },
    selected: { title: 'Unumae', body: 'You were selected.' },
    answered: { title: 'Unumae', body: '{name} answered your question.' },
    anniversary: {
      title: 'Unumae',
      body: 'One year ago today, the world met {name}.',
    },
  },
  fr: {
    daily: { title: 'Unumae', body: 'Rencontrez le Human du jour.' },
    selected: { title: 'Unumae', body: 'Vous avez été sélectionné.' },
    answered: { title: 'Unumae', body: '{name} a répondu à votre question.' },
    anniversary: {
      title: 'Unumae',
      body: "Il y a un an aujourd'hui, le monde rencontrait {name}.",
    },
  },
  de: {
    daily: { title: 'Unumae', body: 'Lerne den Human von heute kennen.' },
    selected: { title: 'Unumae', body: 'Du wurdest ausgewählt.' },
    answered: { title: 'Unumae', body: '{name} hat deine Frage beantwortet.' },
    anniversary: {
      title: 'Unumae',
      body: 'Heute vor einem Jahr lernte die Welt {name} kennen.',
    },
  },
};

function compose(row: DueRow): { title: string; body: string } {
  const locale: Locale = (['en', 'fr', 'de'] as const).includes(
    row.locale as Locale
  )
    ? (row.locale as Locale)
    : 'en';

  const copy = COPY[locale][row.category];

  return {
    title: copy.title,
    body: copy.body.replace('{name}', row.subject_name ?? ''),
  };
}

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const secret = Deno.env.get('NOTIFICATIONS_SECRET');

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('send-notifications: function environment is incomplete');
    return jsonResponse({ error: 'server_misconfigured' }, 500);
  }

  // A shared secret, because this endpoint is called by a scheduler rather
  // than by a signed-in person. Without it, anyone could make the product
  // send its whole queue early.
  if (secret && request.headers.get('x-notifications-secret') !== secret) {
    return jsonResponse({ error: 'unauthorized' }, 401);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: due, error } = await admin.rpc('notifications_due');

  if (error) {
    console.error('send-notifications: could not read the queue', error);
    return jsonResponse({ error: 'queue_unavailable' }, 500);
  }

  const rows = (due ?? []) as DueRow[];
  if (rows.length === 0) {
    return jsonResponse({ sent: 0 });
  }

  const messages = rows.map((row) => ({
    to: row.token,
    sound: 'default',
    ...compose(row),
    data: { category: row.category },
  }));

  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(messages),
  });

  if (!response.ok) {
    console.error(
      'send-notifications: Expo rejected the batch',
      response.status
    );
    return jsonResponse({ error: 'push_failed' }, 502);
  }

  // Recorded one by one so a partial failure leaves an accurate log rather
  // than claiming everything was sent.
  let recorded = 0;
  for (const row of rows) {
    const { error: logError } = await admin.rpc('record_notification_sent', {
      target_user: row.user_id,
      sent_category: row.category,
      key: row.dedupe_key,
    });

    if (!logError) {
      recorded += 1;
    }
  }

  return jsonResponse({ sent: rows.length, recorded });
});
