import { createClient } from 'jsr:@supabase/supabase-js@2';

import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { isServiceRoleRequest } from '../_shared/serviceRole.ts';
import {
  classifyExpoTickets,
  type ExpoTicket,
} from '../_shared/notificationDelivery.ts';
import { fetchWithTimeout } from '../_shared/providerFetch.ts';
import {
  finishWorkerRun,
  startWorkerRun,
  type WorkerInvocation,
} from '../_shared/workerRun.ts';

type Category = 'daily' | 'selected' | 'answered' | 'anniversary';
type Locale = 'en' | 'fr' | 'de';

interface DueRow {
  user_id: string;
  tokens: string[];
  email: string | null;
  locale: string;
  category: Category;
  dedupe_key: string;
  subject_name: string | null;
  route_data: Record<string, unknown>;
}

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

const EMAIL_COPY: Record<
  Locale,
  {
    subject: string;
    heading: string;
    body: string;
    action: string;
    note: string;
  }
> = {
  en: {
    subject: 'You were selected by Unumae',
    heading: 'You were selected.',
    body: 'The draw chose you for an upcoming Human day. Nothing is published unless you say yes.',
    action: 'Open your invitation',
    note: 'If you would rather not take part, you can decline with no penalty.',
  },
  fr: {
    subject: 'Vous avez été sélectionné par Unumae',
    heading: 'Vous avez été sélectionné.',
    body: 'La Sélection vous a choisi pour une prochaine journée Human. Rien ne sera publié sans votre accord.',
    action: "Ouvrir l'invitation",
    note: 'Si vous préférez ne pas participer, vous pouvez refuser sans aucune pénalité.',
  },
  de: {
    subject: 'Du wurdest von Unumae ausgewählt',
    heading: 'Du wurdest ausgewählt.',
    body: 'Die Auswahl hat dich für einen kommenden Human-Tag gezogen. Ohne dein Ja wird nichts veröffentlicht.',
    action: 'Einladung öffnen',
    note: 'Wenn du nicht teilnehmen möchtest, kannst du ohne Nachteil ablehnen.',
  },
};

function localeFor(value: string): Locale {
  return (['en', 'fr', 'de'] as const).includes(value as Locale)
    ? (value as Locale)
    : 'en';
}

function compose(row: DueRow): { title: string; body: string } {
  const copy = COPY[localeFor(row.locale)][row.category];
  return {
    title: copy.title,
    body: copy.body.replace('{name}', row.subject_name ?? ''),
  };
}

function eventKey(row: DueRow): string {
  return `${row.user_id}:${row.category}:${row.dedupe_key}`;
}

async function destinationHash(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value)
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
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
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: 'server_misconfigured' }, 500);
  }
  if (!(await isServiceRoleRequest(request, supabaseUrl, serviceRoleKey))) {
    return jsonResponse({ error: 'unauthorized' }, 401);
  }

  const payload = (await request.json().catch(() => ({}))) as WorkerInvocation;
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const workerRun = await startWorkerRun(admin, payload, 'send-notifications');
  if (!workerRun) return jsonResponse({ error: 'job_run_unavailable' }, 409);

  const { data: due, error } = await admin.rpc('notifications_due');
  if (error) {
    await finishWorkerRun(admin, workerRun, {
      succeeded: false,
      retryable: true,
      detail: 'Notification queue could not be read',
      providerCategory: 'internal',
    });
    return jsonResponse({ error: 'queue_unavailable' }, 500);
  }

  const rows = (due ?? []) as DueRow[];
  if (rows.length === 0) {
    await finishWorkerRun(admin, workerRun, {
      succeeded: true,
      detail: 'No notifications due',
      providerCategory: 'accepted',
    });
    return jsonResponse({ events: 0, delivered: 0 });
  }

  const delivered = new Set<string>();
  let attempts = 0;
  let failures = 0;
  const providerCategories = new Set<string>();

  const record = async (
    row: DueRow,
    channel: 'push' | 'email',
    destination: string,
    succeeded: boolean,
    providerReference?: string,
    failureCode?: string
  ) => {
    attempts += 1;
    const { error: recordError } = await admin.rpc(
      'record_notification_delivery',
      {
        target_user: row.user_id,
        sent_category: row.category,
        key: row.dedupe_key,
        delivery_channel: channel,
        target_hash: await destinationHash(destination.toLowerCase()),
        delivery_succeeded: succeeded,
        provider_reference: providerReference ?? null,
        failure_code: failureCode ?? null,
      }
    );

    if (succeeded && !recordError) {
      delivered.add(eventKey(row));
    } else {
      failures += 1;
    }
  };

  const pushTargets = rows.flatMap((row) =>
    row.tokens.map((token) => ({ row, token }))
  );

  for (let start = 0; start < pushTargets.length; start += 100) {
    const batch = pushTargets.slice(start, start + 100);
    const transport = await fetchWithTimeout(
      'https://exp.host/--/api/v2/push/send',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(
          batch.map(({ row, token }) => ({
            to: token,
            sound: 'default',
            ...compose(row),
            ...(row.category === 'selected'
              ? {
                  categoryId: 'selection_invitation',
                  channelId: 'selection',
                }
              : { channelId: 'general' }),
            data: row.route_data,
          }))
        ),
      }
    );
    const response = transport.response;
    if (!response) {
      providerCategories.add(transport.category);
      for (const { row, token } of batch) {
        await record(row, 'push', token, false, undefined, transport.category);
      }
      continue;
    }

    if (!response.ok) {
      const category =
        response.status === 401 || response.status === 403
          ? 'auth'
          : response.status === 429
            ? 'rate_limited'
            : response.status >= 400 && response.status < 500
              ? 'invalid_request'
              : 'provider_error';
      providerCategories.add(category);
      for (const { row, token } of batch) {
        await record(row, 'push', token, false, undefined, category);
      }
      continue;
    }

    const result = (await response.json().catch(() => ({}))) as {
      data?: ExpoTicket[];
    };
    const deliveries = classifyExpoTickets(batch.length, result.data ?? []);
    for (const [index, target] of batch.entries()) {
      const delivery = deliveries[index];
      await record(
        target.row,
        'push',
        target.token,
        delivery.succeeded,
        delivery.providerReference,
        delivery.failureCode
      );
      if (delivery.succeeded && delivery.providerReference) {
        await admin.rpc('enqueue_expo_push_receipt', {
          target_ticket: delivery.providerReference,
          target_token: target.token,
          target_user: target.row.user_id,
        });
      } else if (delivery.failureCode) {
        providerCategories.add(delivery.failureCode);
        if (delivery.failureCode === 'permanent_destination') {
          await admin.rpc('disable_push_token', { failed_token: target.token });
        }
      }
    }
  }

  // Selection is transactional: if no device accepted the push, email the
  // verified account address. Other categories remain push-only by design.
  const resendKey = Deno.env.get('RESEND_API_KEY');
  const fromEmail = Deno.env.get('NOTIFICATION_FROM_EMAIL');

  for (const row of rows) {
    if (
      row.category !== 'selected' ||
      delivered.has(eventKey(row)) ||
      !row.email
    ) {
      continue;
    }

    if (!resendKey || !fromEmail) {
      providerCategories.add('not_configured');
      await record(
        row,
        'email',
        row.email,
        false,
        undefined,
        'email_not_configured'
      );
      continue;
    }

    const copy = EMAIL_COPY[localeFor(row.locale)];
    const emailTransport = await fetchWithTimeout(
      'https://api.resend.com/emails',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [row.email],
          subject: copy.subject,
          text: `${copy.heading}\n\n${copy.body}\n\n${copy.action}: onehuman://invitation\n\n${copy.note}`,
          html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:auto;padding:32px;color:#11121A"><p style="color:#315CF5;font-weight:700">UNUMAE</p><h1>${copy.heading}</h1><p>${copy.body}</p><p><a href="onehuman://invitation" style="display:inline-block;background:#315CF5;color:white;text-decoration:none;padding:14px 22px;border-radius:999px;font-weight:600">${copy.action}</a></p><p style="color:#777E91">${copy.note}</p></div>`,
        }),
      }
    );
    const emailResponse = emailTransport.response;
    if (!emailResponse) {
      providerCategories.add(emailTransport.category);
      await record(
        row,
        'email',
        row.email,
        false,
        undefined,
        emailTransport.category
      );
      continue;
    }

    const emailResult = (await emailResponse.json().catch(() => ({}))) as {
      id?: string;
    };
    const emailCategory = emailResponse.ok
      ? undefined
      : emailResponse.status === 401 || emailResponse.status === 403
        ? 'auth'
        : emailResponse.status === 429
          ? 'rate_limited'
          : emailResponse.status >= 400 && emailResponse.status < 500
            ? 'invalid_request'
            : 'provider_error';
    if (emailCategory) providerCategories.add(emailCategory);
    await record(
      row,
      'email',
      row.email,
      emailResponse.ok,
      emailResult.id,
      emailCategory
    );
  }

  const undelivered = rows.filter(
    (row) => !delivered.has(eventKey(row))
  ).length;
  const succeeded = undelivered === 0;
  const detail = `${delivered.size}/${rows.length} event(s) delivered; ${attempts} attempt(s); ${failures} failed attempt(s)`;
  const providerCategory = providerCategories.has('auth')
    ? 'auth'
    : (providerCategories.values().next().value ?? 'accepted');
  await finishWorkerRun(admin, workerRun, {
    succeeded,
    retryable:
      !succeeded &&
      providerCategory !== 'auth' &&
      providerCategory !== 'not_configured',
    detail,
    providerCategory,
  });

  return jsonResponse(
    { events: rows.length, delivered: delivered.size, undelivered, attempts },
    succeeded ? 200 : 502
  );
});
