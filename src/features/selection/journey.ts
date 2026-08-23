import type { Href } from 'expo-router';

import type {
  HumanJourneyRow,
  PortraitStatus,
  SelectionStatus,
} from '@/lib/supabase/types';

export type JourneyAction =
  | 'respond'
  | 'write-portrait'
  | 'await-review'
  | 'await-live'
  | 'answer-questions'
  | 'archived'
  | 'rejected';

export interface HumanJourney {
  drawId: string;
  selectionDate: string;
  selectionStatus: SelectionStatus;
  invitationId: string;
  notifiedAt: string;
  acceptanceDeadline: string;
  invitationResponse: HumanJourneyRow['invitation_response'];
  portraitId: string | null;
  portraitStatus: PortraitStatus | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  humanNumber: number | null;
  action: JourneyAction;
}

/** Maps server-owned state to the one next action the interface should offer. */
export function getJourneyAction(
  row: HumanJourneyRow,
  now: Date = new Date()
): JourneyAction {
  if (
    row.invitation_response === null &&
    row.selection_status === 'awaiting_acceptance' &&
    new Date(row.acceptance_deadline).getTime() > now.getTime()
  ) {
    return 'respond';
  }

  if (
    row.portrait_status === 'rejected' ||
    row.selection_status === 'replacement_required' ||
    row.selection_status === 'cancelled'
  ) {
    return 'rejected';
  }

  if (
    row.invitation_response === 'accepted' &&
    (row.portrait_status === null || row.portrait_status === 'draft')
  ) {
    return 'write-portrait';
  }

  if (
    row.portrait_status === 'submitted' ||
    row.portrait_status === 'in_review' ||
    row.selection_status === 'content_review'
  ) {
    return 'await-review';
  }

  if (row.selection_status === 'live') {
    return 'answer-questions';
  }

  if (row.selection_status === 'completed') {
    return 'archived';
  }

  if (row.selection_status === 'ready' || row.portrait_status === 'approved') {
    return 'await-live';
  }

  // An expired invitation can exist briefly before the scheduled sweep moves
  // the cycle on. There is intentionally no action that could accept it late.
  return 'rejected';
}

export function toHumanJourney(row: HumanJourneyRow): HumanJourney {
  return {
    drawId: row.draw_id,
    selectionDate: row.selection_date,
    selectionStatus: row.selection_status,
    invitationId: row.invitation_id,
    notifiedAt: row.notified_at,
    acceptanceDeadline: row.acceptance_deadline,
    invitationResponse: row.invitation_response,
    portraitId: row.portrait_id,
    portraitStatus: row.portrait_status,
    submittedAt: row.portrait_submitted_at,
    reviewedAt: row.portrait_reviewed_at,
    humanNumber: row.human_number,
    action: getJourneyAction(row),
  };
}

export function journeyRoute(action: JourneyAction, drawId?: string): Href {
  switch (action) {
    case 'respond':
      return '/(selection)/invitation';
    case 'write-portrait':
      return '/(selection)/portrait';
    case 'answer-questions':
      return '/(selection)/questions';
    case 'archived':
      return drawId
        ? ({ pathname: '/human/[id]', params: { id: drawId } } as const)
        : '/(selection)/status';
    default:
      return '/(selection)/status';
  }
}
