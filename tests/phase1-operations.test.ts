import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..');
const migrations = readdirSync(join(ROOT, 'supabase', 'migrations'))
  .filter((file) => file.endsWith('.sql'))
  .map((file) =>
    readFileSync(join(ROOT, 'supabase', 'migrations', file), 'utf8')
  )
  .join('\n')
  .toLowerCase()
  .replace(/\s+/g, ' ');
const sender = readFileSync(
  join(ROOT, 'supabase', 'functions', 'send-notifications', 'index.ts'),
  'utf8'
);
const translator = readFileSync(
  join(ROOT, 'supabase', 'functions', 'translate-portraits', 'index.ts'),
  'utf8'
);

function lastFunction(name: string): string {
  const pattern = new RegExp(
    `create or replace function public\\.${name}\\([\\s\\S]*?as \\$\\$([\\s\\S]*?)\\$\\$;`,
    'g'
  );
  let body = '';
  for (const match of migrations.matchAll(pattern)) {
    body = match[1] ?? '';
  }
  return body;
}

describe('the Quiet Day is a hard cutoff', () => {
  it('defines 22:00 UTC on D-1 and refuses late promotion or acceptance', () => {
    expect(lastFunction('quiet_day_cutoff')).toContain("interval '2 hours'");
    expect(lastFunction('escalate_draw')).toContain(
      'now() >= public.quiet_day_cutoff(target_date)'
    );
    expect(lastFunction('accept_selection')).toContain(
      'invitation.acceptance_deadline <= now()'
    );
    expect(lastFunction('accept_selection')).toContain(
      'public.close_unfilled_cycle'
    );
  });

  it('never writes a candidate deadline beyond the cutoff', () => {
    expect(lastFunction('notify_selected_candidate')).toContain(
      "least(now() + interval '12 hours', public.quiet_day_cutoff(target_date))"
    );
  });

  it('closes every unfinished cycle even when no invitation remains pending', () => {
    const cutoff = lastFunction('enforce_quiet_day_cutoff');
    expect(cutoff).toContain("'accepted'");
    expect(cutoff).toContain("'content_review'");
    expect(cutoff).toContain('public.close_unfilled_cycle');
    expect(lastFunction('expire_invitations_job')).toContain(
      'public.enforce_quiet_day_cutoff()'
    );
  });
});

describe('a pre-publication Human can be replaced safely', () => {
  it('recovers opt-out, suspension, deletion, and portrait rejection', () => {
    expect(migrations).toContain('profiles_recover_selected_update');
    expect(migrations).toContain('profiles_recover_selected_delete');
    expect(lastFunction('review_portrait')).toContain(
      'public.recover_selected_draw'
    );
  });

  it('keeps rejected portraits as history while allowing a replacement draft', () => {
    expect(migrations).toContain(
      'create unique index portraits_one_current_per_draw'
    );
    expect(migrations).toContain("where status <> 'rejected'");
  });
});

describe('operations report completed work, not queued intent', () => {
  it('queues Edge work and waits for its completion callback', () => {
    expect(lastFunction('invoke_function')).toContain(
      'public.claim_worker_run'
    );
    expect(lastFunction('invoke_function')).toContain("'jobrunid'");
    expect(sender).toContain('finishWorkerRun');
    expect(translator).toContain('finishWorkerRun');
  });

  it('records synchronous draw and publish failures', () => {
    expect(lastFunction('run_daily_draw_job')).toContain(
      'exception when others'
    );
    expect(lastFunction('publish_due_cycles_job')).toContain(
      'exception when others'
    );
  });

  it('raises durable alerts for failed or stalled jobs and aging cycles', () => {
    for (const code of [
      'job_failed',
      'job_stalled',
      'portrait_queue_age',
      'cycle_at_risk',
    ]) {
      expect(migrations).toContain(`'${code}'`);
    }
    expect(migrations).toContain("'worker_dead_letter'");
    expect(migrations).toContain("'worker_stale_lease'");
  });
});

describe('selection delivery has two channels and native actions', () => {
  it('falls back to transactional email only for selection', () => {
    expect(sender).toContain("row.category !== 'selected'");
    expect(sender).toContain('https://api.resend.com/emails');
    expect(sender).toContain('RESEND_API_KEY');
  });

  it('labels selection pushes with the actionable iOS category', () => {
    expect(sender).toContain("categoryId: 'selection_invitation'");
  });
});
