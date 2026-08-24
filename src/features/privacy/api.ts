import { AppError } from '@/lib/errors';
import { getSupabase } from '@/lib/supabase';
import type {
  AppealableDecisionRow,
  ArchiveRemovalOptionRow,
  BlockedUserRow,
  Json,
  ReportTarget,
} from '@/lib/supabase/types';

export async function exportMyData(): Promise<Json> {
  const { data, error } = await getSupabase().rpc('export_my_data');
  if (error) {
    throw new AppError('unknown', 'privacy.exportFailed', { cause: error });
  }
  return data;
}

export async function blockContentAuthor(
  targetType: ReportTarget,
  targetId: string
): Promise<void> {
  const { error } = await getSupabase().rpc('block_content_author', {
    target_type: targetType,
    target_id: targetId,
  });
  if (error) {
    throw new AppError('unknown', 'report.blockFailed', { cause: error });
  }
}

export async function getBlockedUsers(): Promise<BlockedUserRow[]> {
  const { data, error } = await getSupabase().rpc('my_blocked_users');
  if (error) {
    throw new AppError('network', 'common.error', { cause: error });
  }
  return data ?? [];
}

export async function unblockById(blockId: string): Promise<void> {
  const { error } = await getSupabase().rpc('unblock_by_id', {
    target_block: blockId,
  });
  if (error) {
    throw new AppError('unknown', 'report.blockFailed', { cause: error });
  }
}

export async function getAppealableDecisions(): Promise<
  AppealableDecisionRow[]
> {
  const { data, error } = await getSupabase().rpc('my_appealable_decisions');
  if (error) {
    throw new AppError('network', 'common.error', { cause: error });
  }
  return data ?? [];
}

export async function submitAppeal(
  eventId: string,
  statement: string
): Promise<void> {
  const { error } = await getSupabase().rpc('submit_moderation_appeal', {
    target_event: eventId,
    appeal_statement: statement.trim(),
  });
  if (error) {
    throw new AppError('unknown', 'privacy.appealFailed', { cause: error });
  }
}

export async function getArchiveRemovalOptions(): Promise<
  ArchiveRemovalOptionRow[]
> {
  const { data, error } = await getSupabase().rpc('my_archive_removal_options');
  if (error) {
    throw new AppError('network', 'common.error', { cause: error });
  }
  return data ?? [];
}

export async function requestArchiveRemoval(
  drawId: string,
  reason?: string
): Promise<void> {
  const { error } = await getSupabase().rpc('request_archive_removal', {
    target_draw: drawId,
    request_reason: reason?.trim() || null,
  });
  if (error) {
    throw new AppError('unknown', 'privacy.removalFailed', { cause: error });
  }
}
