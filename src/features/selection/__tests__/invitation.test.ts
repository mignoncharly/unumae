import { ACCEPTANCE_WINDOW_HOURS } from '@/constants/constitution';
import de from '@/i18n/locales/de.json';
import en from '@/i18n/locales/en.json';
import fr from '@/i18n/locales/fr.json';

import {
  expectedDeadline,
  formatTimeLeft,
  timeLeftToAccept,
} from '../invitation';

const NOTIFIED = '2027-03-08T00:10:00.000Z';
const DEADLINE = '2027-03-08T12:10:00.000Z';

describe('the acceptance window', () => {
  it('is 12 hours from being asked (Article 5.5)', () => {
    expect(expectedDeadline(NOTIFIED).toISOString()).toBe(DEADLINE);
    expect(ACCEPTANCE_WINDOW_HOURS).toBe(12);
  });

  it('counts down in hours and minutes', () => {
    const left = timeLeftToAccept(DEADLINE, new Date('2027-03-08T00:27:00Z'));
    expect(left).toMatchObject({ hours: 11, minutes: 43, expired: false });
    expect(formatTimeLeft(left)).toBe('11h 43m');
  });

  it('pads the minutes so the number does not jump about', () => {
    const left = timeLeftToAccept(DEADLINE, new Date('2027-03-08T11:15:00Z'));
    expect(formatTimeLeft(left)).toBe('0h 55m');
  });

  it('never goes negative once the window closes', () => {
    const left = timeLeftToAccept(DEADLINE, new Date('2027-03-09T00:00:00Z'));
    expect(left.totalMs).toBe(0);
    expect(left.expired).toBe(true);
    expect(formatTimeLeft(left)).toBe('0h 00m');
  });

  it('flags the last two hours without changing the deadline', () => {
    const calm = timeLeftToAccept(DEADLINE, new Date('2027-03-08T09:00:00Z'));
    const urgent = timeLeftToAccept(DEADLINE, new Date('2027-03-08T11:00:00Z'));
    const gone = timeLeftToAccept(DEADLINE, new Date('2027-03-08T13:00:00Z'));

    expect(calm.urgent).toBe(false);
    expect(urgent.urgent).toBe(true);
    // Expired is not urgent: there is nothing left to hurry for.
    expect(gone.urgent).toBe(false);
  });
});

/**
 * The original plan is explicit: the notification says "You were selected."
 * and NOT "You are Today's Human", because the portrait has not been written
 * or reviewed. The second sentence would be a promise the product has not kept,
 * and would make declining feel like breaking something.
 */
describe('what the invitation says', () => {
  const locales = { en, fr, de } as const;

  it.each(Object.entries(locales))(
    '%s announces selection, not publication',
    (_locale, translation) => {
      const title = translation.invitation.title.toLowerCase();

      expect(title).not.toContain("today's human");
      expect(title).not.toContain('today’s human');
      expect(title).not.toContain('human du jour');
      expect(title).not.toContain('human des tages');
    }
  );

  it.each(Object.entries(locales))(
    '%s says declining costs nothing',
    (_locale, translation) => {
      expect(translation.invitation.declineNote.length).toBeGreaterThan(20);
      expect(translation.invitation.decline.length).toBeGreaterThan(0);
    }
  );

  it.each(Object.entries(locales))(
    '%s offers declining as plainly as accepting',
    (_locale, translation) => {
      // A decline button hidden behind small print would make the 12-hour
      // window a trap rather than a question.
      expect(translation.invitation.accept).toBeTruthy();
      expect(translation.invitation.decline).toBeTruthy();
    }
  );

  it.each(Object.entries(locales))(
    '%s never threatens a consequence for silence',
    (_locale, translation) => {
      const body = Object.values(translation.invitation)
        .join(' ')
        .toLowerCase();

      for (const threat of [
        'last chance',
        'you will lose',
        'never again',
        'penalt',
        'dernière chance',
        'vous perdrez',
        'letzte chance',
        'du verlierst',
      ]) {
        expect(body).not.toContain(threat);
      }
    }
  );
});

/**
 * Article 12 — the public explanation must name what is excluded, or the claim
 * is too vague to be worth making.
 */
describe('the How selection works page', () => {
  const locales = { en, fr, de } as const;

  it.each(Object.entries(locales))(
    '%s names every forbidden input',
    (_locale, translation) => {
      for (const key of [
        'neverPay',
        'neverFollowers',
        'neverBoost',
        'neverSponsor',
        'neverInfluencer',
        'neverAlgorithm',
      ] as const) {
        expect(translation.howSelection[key].length).toBeGreaterThan(10);
      }
    }
  );

  it.each(Object.entries(locales))(
    '%s explains how to check the result',
    (_locale, translation) => {
      expect(translation.howSelection.verifyBody.length).toBeGreaterThan(50);
    }
  );
});
