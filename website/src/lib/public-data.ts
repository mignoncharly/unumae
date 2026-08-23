import type { PortraitKey } from '../content/public';

export interface PublicHuman {
  draw_id: string;
  portrait_id: string;
  selection_date: string;
  human_number: number | null;
  display_name: string;
  country_code: string;
  city: string | null;
  photo_path: string | null;
  published_at: string | null;
  /**
   * Joined during Year Zero. Derived from the join date in the database,
   * never stored and never an advantage in the draw — a Founding Human is
   * selected on exactly the same terms as anybody else.
   */
  founding: boolean | null;
}

export interface PortraitElement {
  element_key: PortraitKey;
  answer: string;
}

export interface PublicQuestion {
  id: string;
  body: string;
  answer: string | null;
  answered_at: string | null;
  votes: number;
  has_voted: boolean | null;
}

export interface ArchiveEntry {
  draw_id: string;
  selection_date: string;
  human_number: number;
  display_name: string | null;
  country_code: string | null;
  city: string | null;
  photo_path: string | null;
  is_removed: boolean;
}

export interface ArchiveCountry {
  country_code: string;
  humans: number;
}

export interface ArchiveYear {
  year: number;
  humans: number;
}

type PublicRpc =
  | 'get_todays_human'
  | 'get_portrait_elements'
  | 'get_questions'
  | 'get_archive'
  | 'get_random_human'
  | 'get_archive_countries'
  | 'get_archive_years';

interface PublicDataConfig {
  url: string;
  anonKey: string;
}

/**
 * Browser-only reader for the database's explicit anonymous RPC allowlist.
 *
 * The anon key is public by design. This client cannot name a table and cannot
 * invoke a function outside PublicRpc. Postgres grants remain the final
 * boundary, but keeping the same allowlist here makes accidental expansion
 * visible in review.
 */
export class PublicDataClient {
  private readonly baseUrl: string;
  private readonly headers: HeadersInit;

  constructor({ url, anonKey }: PublicDataConfig) {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost') {
      throw new Error('Public data URL must use HTTPS.');
    }

    this.baseUrl = parsed.toString().replace(/\/$/, '');
    this.headers = {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
    };
  }

  private async rpc<T>(
    name: PublicRpc,
    args: Record<string, unknown> = {}
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(args),
    });

    if (!response.ok) {
      throw new Error(`Public reader failed with status ${response.status}.`);
    }

    return (await response.json()) as T;
  }

  async getToday(): Promise<PublicHuman | null> {
    const rows = await this.rpc<PublicHuman[]>('get_todays_human');
    return rows[0] ?? null;
  }

  getPortrait(drawId: string): Promise<PortraitElement[]> {
    return this.rpc('get_portrait_elements', { target_draw: drawId });
  }

  getQuestions(drawId: string): Promise<PublicQuestion[]> {
    return this.rpc('get_questions', { target_draw: drawId });
  }

  getArchive(
    country: string | null,
    year: number | null,
    limit: number,
    offset: number
  ): Promise<ArchiveEntry[]> {
    return this.rpc('get_archive', {
      filter_country: country,
      filter_year: year,
      page_limit: limit,
      page_offset: offset,
    });
  }

  async getRandomHuman(): Promise<ArchiveEntry | null> {
    const rows = await this.rpc<ArchiveEntry[]>('get_random_human', {
      filter_country: null,
    });
    return rows[0] ?? null;
  }

  getCountries(): Promise<ArchiveCountry[]> {
    return this.rpc('get_archive_countries');
  }

  getYears(): Promise<ArchiveYear[]> {
    return this.rpc('get_archive_years');
  }

  async signPhoto(path: string | null): Promise<string | null> {
    if (!path) {
      return null;
    }

    const safePath = path
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/');
    const response = await fetch(
      `${this.baseUrl}/storage/v1/object/sign/portraits/${safePath}`,
      {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({ expiresIn: 3600 }),
      }
    );

    if (!response.ok) {
      return null;
    }

    const result = (await response.json()) as {
      signedURL?: string;
      signedUrl?: string;
    };
    const signedPath = result.signedURL ?? result.signedUrl;
    if (!signedPath) {
      return null;
    }

    return new URL(signedPath, `${this.baseUrl}/storage/v1/`).toString();
  }
}
