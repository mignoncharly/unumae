import type { PortraitKey } from '../content/public';

export interface PublicHuman {
  draw_id: string;
  portrait_id: string;
  selection_date: string;
  human_number: number | null;
  display_name: string | null;
  country_code: string | null;
  city: string | null;
  photo_path: string | null;
  published_at: string | null;
  /**
   * Joined during Year Zero. Derived from the join date in the database,
   * never stored and never an advantage in the draw — a Founding Human is
   * selected on exactly the same terms as anybody else.
   */
  founding: boolean | null;
  is_removed: boolean;
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

export interface QuestionTranslation {
  question_id: string;
  translated_body: string | null;
  translated_answer: string | null;
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
  | 'get_human'
  | 'get_portrait_elements'
  | 'get_questions'
  | 'get_archive_page'
  | 'get_random_human'
  | 'get_archive_countries'
  | 'get_archive_years'
  | 'get_portrait_translations'
  | 'get_question_translations';

interface PublicDataConfig {
  url: string;
  anonKey: string;
  requestTimeoutMs?: number;
  maxAttempts?: number;
}

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);
const DEFAULT_REQUEST_TIMEOUT_MS = 8_000;
const DEFAULT_MAX_ATTEMPTS = 3;

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
  private readonly requestTimeoutMs: number;
  private readonly maxAttempts: number;

  constructor({
    url,
    anonKey,
    requestTimeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
    maxAttempts = DEFAULT_MAX_ATTEMPTS,
  }: PublicDataConfig) {
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
    this.requestTimeoutMs = Math.max(1, Math.floor(requestTimeoutMs));
    this.maxAttempts = Math.max(1, Math.floor(maxAttempts));
  }

  private async request(input: string, init: RequestInit): Promise<Response> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(new Error('Public reader timed out.')),
        this.requestTimeoutMs
      );

      try {
        const response = await fetch(input, {
          ...init,
          signal: controller.signal,
        });
        if (
          response.ok ||
          !RETRYABLE_STATUS.has(response.status) ||
          attempt === this.maxAttempts
        ) {
          return response;
        }
      } catch (error) {
        lastError = error;
        if (attempt === this.maxAttempts) {
          throw error;
        }
      } finally {
        clearTimeout(timeout);
      }

      // Public RPCs are read-only, so a bounded retry cannot duplicate a
      // mutation. The short backoff keeps navigation responsive while giving
      // transient provider and mobile-network failures time to clear.
      await new Promise((resolve) => setTimeout(resolve, 200 * attempt));
    }

    throw lastError ?? new Error('Public reader request failed.');
  }

  private async rpc<T>(
    name: PublicRpc,
    args: Record<string, unknown> = {}
  ): Promise<T> {
    const response = await this.request(`${this.baseUrl}/rest/v1/rpc/${name}`, {
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

  async getHuman(drawId: string): Promise<PublicHuman | null> {
    const rows = await this.rpc<PublicHuman[]>('get_human', {
      target_draw: drawId,
    });
    return rows[0] ?? null;
  }

  getPortrait(drawId: string): Promise<PortraitElement[]> {
    return this.rpc('get_portrait_elements', { target_draw: drawId });
  }

  getQuestions(drawId: string): Promise<PublicQuestion[]> {
    return this.rpc('get_questions', { target_draw: drawId });
  }

  async getPortraitTranslations(
    drawId: string,
    locale: string
  ): Promise<Record<string, string>> {
    const rows = await this.rpc<
      { element_key: string; translated_text: string }[]
    >('get_portrait_translations', {
      target_draw: drawId,
      target_locale: locale,
    });
    return Object.fromEntries(
      rows.map((row) => [row.element_key, row.translated_text])
    );
  }

  async getQuestionTranslations(
    drawId: string,
    locale: string
  ): Promise<Record<string, QuestionTranslation>> {
    const rows = await this.rpc<QuestionTranslation[]>(
      'get_question_translations',
      { target_draw: drawId, target_locale: locale }
    );
    return Object.fromEntries(rows.map((row) => [row.question_id, row]));
  }

  getArchive(
    country: string | null,
    year: number | null,
    limit: number,
    cursor: { selectionDate: string; drawId: string } | null
  ): Promise<ArchiveEntry[]> {
    return this.rpc('get_archive_page', {
      filter_country: country,
      filter_year: year,
      page_limit: limit,
      before_date: cursor?.selectionDate ?? null,
      before_draw: cursor?.drawId ?? null,
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
    const response = await this.request(
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

  async signPhotos(paths: (string | null)[]): Promise<Map<string, string>> {
    const unique = [...new Set(paths.filter((path): path is string => !!path))];
    if (unique.length === 0) return new Map();
    const response = await this.request(
      `${this.baseUrl}/storage/v1/object/sign/portraits`,
      {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({ expiresIn: 3600, paths: unique }),
      }
    );
    if (!response.ok) return new Map();
    const rows = (await response.json()) as {
      path?: string;
      signedURL?: string;
      signedUrl?: string;
    }[];
    const urls = new Map<string, string>();
    rows.forEach((row) => {
      const signedPath = row.signedURL ?? row.signedUrl;
      if (row.path && signedPath) {
        urls.set(
          row.path,
          new URL(signedPath, `${this.baseUrl}/storage/v1/`).toString()
        );
      }
    });
    return urls;
  }
}
