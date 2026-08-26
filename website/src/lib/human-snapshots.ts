import {
  PublicDataClient,
  type PortraitElement,
  type PublicHuman,
  type PublicQuestion,
} from './public-data';

export interface HumanSnapshot {
  human: PublicHuman;
  portrait: PortraitElement[];
  questions: PublicQuestion[];
}

const QUALITY_FIXTURE_ID = '00000000-0000-4000-8000-000000000001';

const qualityFixture: HumanSnapshot = {
  human: {
    draw_id: QUALITY_FIXTURE_ID,
    portrait_id: '00000000-0000-4000-8000-000000000002',
    selection_date: '2026-01-01',
    human_number: 1,
    display_name: 'Amina',
    country_code: 'DE',
    city: 'Berlin',
    photo_path: null,
    published_at: '2026-01-01T00:00:00Z',
    founding: true,
    is_removed: false,
  },
  portrait: [
    {
      element_key: 'introduction',
      answer: 'I make room for quiet conversations and long walks.',
    },
    {
      element_key: 'ordinary_moment',
      answer: 'The first cup of tea before the city wakes up.',
    },
  ],
  questions: [],
};

async function loadLiveSnapshots(): Promise<HumanSnapshot[]> {
  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  const anonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      'PUBLIC_DATA_MODE=live requires public data credentials for Human snapshots.'
    );
  }

  const client = new PublicDataClient({ url, anonKey });
  const snapshots: HumanSnapshot[] = [];
  let cursor: { selectionDate: string; drawId: string } | null = null;

  for (;;) {
    const entries = await client.getArchive(null, null, 50, cursor);
    const visible = entries.filter(
      (entry) => !entry.is_removed && Boolean(entry.display_name)
    );
    const page = await Promise.all(
      visible.map(async (entry): Promise<HumanSnapshot | null> => {
        const human = await client.getHuman(entry.draw_id);
        if (!human || human.is_removed || !human.display_name) return null;
        const [portrait, questions] = await Promise.all([
          client.getPortrait(entry.draw_id),
          client.getQuestions(entry.draw_id),
        ]);
        return { human, portrait, questions };
      })
    );
    snapshots.push(
      ...page.filter((snapshot): snapshot is HumanSnapshot => !!snapshot)
    );

    const last = entries.at(-1);
    if (!last || entries.length < 50) break;
    cursor = { selectionDate: last.selection_date, drawId: last.draw_id };
  }

  return snapshots;
}

let snapshotPromise: Promise<HumanSnapshot[]> | undefined;

/**
 * Static Human pages are generated only from the anonymous, publication-gated
 * reader. The explicit fixture mode exists solely for deterministic quality
 * builds and can never be enabled by the default production command.
 */
export function getHumanSnapshots(): Promise<HumanSnapshot[]> {
  snapshotPromise ??=
    import.meta.env.PUBLIC_SNAPSHOT_FIXTURES === 'on'
      ? Promise.resolve([qualityFixture])
      : import.meta.env.PUBLIC_DATA_MODE === 'live'
        ? loadLiveSnapshots()
        : Promise.resolve([]);
  return snapshotPromise;
}
