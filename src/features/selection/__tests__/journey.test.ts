import type { HumanJourneyRow } from '@/lib/supabase/types';

import { getJourneyAction, journeyRoute } from '../journey';

const NOW = new Date('2027-03-08T10:00:00Z');

function row(overrides: Partial<HumanJourneyRow> = {}): HumanJourneyRow {
  return {
    draw_id: 'draw-1',
    selection_date: '2027-03-10',
    selection_status: 'awaiting_acceptance',
    invitation_id: 'invitation-1',
    notified_at: '2027-03-08T09:00:00Z',
    acceptance_deadline: '2027-03-08T21:00:00Z',
    invitation_response: null,
    portrait_id: null,
    portrait_status: null,
    portrait_submitted_at: null,
    portrait_reviewed_at: null,
    human_number: null,
    ...overrides,
  };
}

describe('the selected-Human journey coordinator', () => {
  it('routes a live invitation to the consent screen', () => {
    const action = getJourneyAction(row(), NOW);
    expect(action).toBe('respond');
    expect(journeyRoute(action)).toBe('/(selection)/invitation');
  });

  it('resumes an accepted draft instead of returning to Today', () => {
    const action = getJourneyAction(
      row({
        selection_status: 'accepted',
        invitation_response: 'accepted',
        portrait_status: 'draft',
      }),
      NOW
    );
    expect(action).toBe('write-portrait');
    expect(journeyRoute(action)).toBe('/(selection)/portrait');
  });

  it.each([
    ['submitted', 'content_review', 'await-review'],
    ['approved', 'ready', 'await-live'],
    ['approved', 'live', 'answer-questions'],
    ['approved', 'completed', 'archived'],
    ['rejected', 'replacement_required', 'rejected'],
  ] as const)(
    'maps portrait %s and cycle %s to %s',
    (portraitStatus, selectionStatus, expected) => {
      expect(
        getJourneyAction(
          row({
            invitation_response: 'accepted',
            portrait_status: portraitStatus,
            selection_status: selectionStatus,
          }),
          NOW
        )
      ).toBe(expected);
    }
  );

  it('never offers a late acceptance while the expiry sweep catches up', () => {
    expect(
      getJourneyAction(
        row({ acceptance_deadline: '2027-03-08T09:59:59Z' }),
        NOW
      )
    ).not.toBe('respond');
  });
});
