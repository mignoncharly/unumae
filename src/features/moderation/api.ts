import type { GrowthGateCheck } from '@/constants/retention';
import { GATE_WINDOW_DAYS } from '@/constants/retention';
import { AppError } from '@/lib/errors';
import { getSupabase } from '@/lib/supabase';
import type {
  AccountStatus,
  Json,
  ModerationDecision,
  PortraitQueueRow,
  QuestionQueueRow,
  ReportQueueRow,
  ReportReason,
  ReportTarget,
} from '@/lib/supabase/types';

/**
 * Trust & safety.
 *
 * Every moderator function refuses inside the database unless the caller is in
 * `public.moderators`. The client never decides who may moderate — it only
 * decides what to show, and being wrong about that leaks a button, not a
 * capability.
 */

// --- what anyone signed in can do -------------------------------------------

export async function reportContent(
  targetType: ReportTarget,
  targetId: string,
  reason: ReportReason,
  note?: string
): Promise<void> {
  const { error } = await getSupabase().rpc('report_content', {
    report_target_type: targetType,
    report_target_id: targetId,
    report_reason: reason,
    report_note: note ?? null,
  });

  if (error) {
    throw new AppError('unknown', 'report.failed', { cause: error });
  }
}

export async function setBlocked(
  userId: string,
  blocked: boolean
): Promise<void> {
  const { error } = await getSupabase().rpc(
    blocked ? 'block_user' : 'unblock_user',
    { target_user: userId }
  );

  if (error) {
    throw new AppError('unknown', 'report.blockFailed', { cause: error });
  }
}

/** Article 8.2 — the data itself, not a report about it. */
export async function exportMyData(): Promise<Json> {
  const { data, error } = await getSupabase().rpc('export_my_data');

  if (error) {
    throw new AppError('unknown', 'privacy.exportFailed', { cause: error });
  }
  return data;
}

// --- moderators --------------------------------------------------------------

export async function amIModerator(): Promise<boolean> {
  const { data, error } = await getSupabase().rpc('is_moderator');
  // Not being able to tell is the same as "no" for display purposes; the
  // database refuses the actual action either way.
  return error ? false : (data ?? false);
}

export async function getPortraitQueue(): Promise<PortraitQueueRow[]> {
  const { data, error } = await getSupabase().rpc('moderation_portrait_queue');
  if (error) {
    throw new AppError('permission', 'common.error', { cause: error });
  }
  return data ?? [];
}

export async function getQuestionQueue(): Promise<QuestionQueueRow[]> {
  const { data, error } = await getSupabase().rpc('moderation_question_queue');
  if (error) {
    throw new AppError('permission', 'common.error', { cause: error });
  }
  return data ?? [];
}

export async function getReportQueue(): Promise<ReportQueueRow[]> {
  const { data, error } = await getSupabase().rpc('moderation_report_queue');
  if (error) {
    throw new AppError('permission', 'common.error', { cause: error });
  }
  return data ?? [];
}

export async function reviewPortrait(
  portraitId: string,
  decision: ModerationDecision,
  reason?: string
): Promise<void> {
  const { error } = await getSupabase().rpc('review_portrait', {
    target_portrait: portraitId,
    decision,
    review_reason: reason ?? null,
  });

  if (error) {
    throw new AppError('permission', 'moderation.actionFailed', {
      cause: error,
    });
  }
}

export async function reviewQuestion(
  questionId: string,
  decision: ModerationDecision,
  reason?: string
): Promise<void> {
  const { error } = await getSupabase().rpc('review_question', {
    target_question: questionId,
    decision,
    review_reason: reason ?? null,
  });

  if (error) {
    throw new AppError('permission', 'moderation.actionFailed', {
      cause: error,
    });
  }
}

export async function resolveReport(
  reportId: string,
  actioned: boolean,
  note?: string
): Promise<void> {
  const { error } = await getSupabase().rpc('resolve_report', {
    target_report: reportId,
    actioned,
    resolution_note: note ?? null,
  });

  if (error) {
    throw new AppError('permission', 'moderation.actionFailed', {
      cause: error,
    });
  }
}

export async function setAccountStatus(
  userId: string,
  status: AccountStatus,
  reason?: string
): Promise<void> {
  const { error } = await getSupabase().rpc('set_account_status', {
    target_user: userId,
    new_status: status,
    status_reason: reason ?? null,
  });

  if (error) {
    throw new AppError('permission', 'moderation.actionFailed', {
      cause: error,
    });
  }
}

// --- signals -----------------------------------------------------------------
//
// Retention, participation and the growth gate. Every one of these refuses in
// the database unless the caller is a moderator, so what follows is a reader,
// not a permission.

export interface RetentionCohort {
  cohortDate: string;
  installs: number;
  returnedD1: number;
  /** Null while the cohort is too young to have reached that day — not zero. */
  d1Percent: number | null;
  returnedD7: number;
  d7Percent: number | null;
}

export async function getRetentionCohorts(
  windowDays = GATE_WINDOW_DAYS
): Promise<RetentionCohort[]> {
  const { data, error } = await getSupabase().rpc('retention_cohorts', {
    window_days: windowDays,
  });

  if (error) {
    throw new AppError('permission', 'common.error', { cause: error });
  }

  return (data ?? []).map((row) => ({
    cohortDate: row.cohort_date,
    installs: row.installs,
    returnedD1: row.returned_d1,
    d1Percent: row.d1_percent,
    returnedD7: row.returned_d7,
    d7Percent: row.d7_percent,
  }));
}

export interface ParticipationSegment {
  segment: 'participants' | 'watchers';
  installs: number;
  percent: number;
}

export async function getParticipationMix(
  windowDays = GATE_WINDOW_DAYS
): Promise<ParticipationSegment[]> {
  const { data, error } = await getSupabase().rpc('participation_mix', {
    window_days: windowDays,
  });

  if (error) {
    throw new AppError('permission', 'common.error', { cause: error });
  }

  return (data ?? []).map((row) => ({
    segment: row.segment as ParticipationSegment['segment'],
    installs: row.installs,
    percent: row.percent,
  }));
}

export interface GateCheck {
  check: GrowthGateCheck;
  actual: number;
  threshold: number;
  passed: boolean;
}

/**
 * The four pre-committed thresholds.
 *
 * The thresholds come back from the database rather than being read from
 * src/constants/retention.ts, so this screen shows what the gate actually
 * enforced. If the two ever drift, tests/retention-schema.test.ts fails the
 * build before anyone sees a comforting number here.
 */
export async function getGrowthGate(
  windowDays = GATE_WINDOW_DAYS
): Promise<GateCheck[]> {
  const { data, error } = await getSupabase().rpc('growth_gate', {
    window_days: windowDays,
  });

  if (error) {
    throw new AppError('permission', 'common.error', { cause: error });
  }

  return (data ?? []).map((row) => ({
    check: row.check_name as GrowthGateCheck,
    actual: row.actual,
    threshold: row.threshold,
    passed: row.passed,
  }));
}

// --- Phase 16 instruments ----------------------------------------------------
//
// Monitors, all three. None of them is an input to anything: the draw takes
// eligibility and chance (Article 5.2), declining costs nothing (Article 5.5),
// and there are four notification categories and no more. A moderator reads
// these and decides what to do as a person.

export interface CountryBalanceRow {
  countryCode: string;
  waiting: number;
  poolShare: number;
  published: number;
  archiveShare: number;
  /** Archive share minus pool share. Negative is under-represented so far. */
  drift: number;
}

export async function getCountryBalance(): Promise<CountryBalanceRow[]> {
  const { data, error } = await getSupabase().rpc('country_balance');
  if (error) {
    throw new AppError('permission', 'common.error', { cause: error });
  }

  return (data ?? []).map((row) => ({
    countryCode: row.country_code,
    waiting: row.waiting,
    poolShare: row.pool_share,
    published: row.published,
    archiveShare: row.archive_share,
    drift: row.drift,
  }));
}

export interface IntegritySignal {
  signal: string;
  count: number;
  detail: string;
}

export async function getIntegritySignals(): Promise<IntegritySignal[]> {
  const { data, error } = await getSupabase().rpc('integrity_signals');
  if (error) {
    throw new AppError('permission', 'common.error', { cause: error });
  }
  return data ?? [];
}

export interface HealthMeasure {
  measure: string;
  value: number;
  detail: string;
}

export async function getModerationHealth(): Promise<HealthMeasure[]> {
  const { data, error } = await getSupabase().rpc('moderation_health');
  if (error) {
    throw new AppError('permission', 'common.error', { cause: error });
  }
  return data ?? [];
}

export interface JobRun {
  job: string;
  ranAt: string;
  ok: boolean;
  status: 'queued' | 'succeeded' | 'failed';
  detail: string | null;
}

export interface OperationalAlert {
  id: number;
  code: string;
  severity: 'warning' | 'critical';
  message: string;
  detectedAt: string;
  drawId: string | null;
  jobRunId: number | null;
}

/**
 * What the nightly jobs did.
 *
 * A scheduled job nobody can see the result of is indistinguishable from a
 * scheduled job that is not running — which is exactly how the daily draw
 * managed to be broken from Phase 4 to Phase 14 without anybody noticing.
 */
export async function getJobHistory(): Promise<JobRun[]> {
  const { data, error } = await getSupabase().rpc('job_history', {
    limit_rows: 20,
  });

  if (error) {
    throw new AppError('permission', 'common.error', { cause: error });
  }

  return (data ?? []).map((row) => ({
    job: row.job,
    ranAt: row.ran_at,
    ok: row.ok,
    status: row.job_status,
    detail: row.detail,
  }));
}

export async function getOperationalAlerts(): Promise<OperationalAlert[]> {
  const { data, error } = await getSupabase().rpc('operational_alerts');
  if (error) {
    throw new AppError('permission', 'common.error', { cause: error });
  }

  return (data ?? []).map((row) => ({
    id: row.alert_id,
    code: row.code,
    severity: row.severity,
    message: row.message,
    detectedAt: row.detected_at,
    drawId: row.draw_id,
    jobRunId: row.job_run_id,
  }));
}

export async function resolveOperationalAlert(id: number): Promise<boolean> {
  const { data, error } = await getSupabase().rpc('resolve_operational_alert', {
    target_alert: id,
  });
  if (error) {
    throw new AppError('permission', 'common.error', { cause: error });
  }
  return data;
}
