import { PublicDataClient, type ArchiveEntry } from '../lib/public-data';
import {
  publicContent,
  type PortraitKey,
  type PublicPageKey,
} from '../content/public';
import type { Locale } from '../content/site';

const archiveEditorialFallbacks = [
  '/editorial/archive-folios.webp',
  '/editorial/archive-threshold.webp',
] as const;

const root = document.querySelector<HTMLElement>('[data-public-page]');

if (root) {
  const locale = (
    ['en', 'fr', 'de'].includes(document.documentElement.lang)
      ? document.documentElement.lang
      : 'en'
  ) as Locale;
  const page = root.dataset.publicPage as PublicPageKey;
  const copy = publicContent[locale];
  const mode = root.dataset.dataMode;
  const url = root.dataset.supabaseUrl;
  const anonKey = root.dataset.supabaseAnonKey;

  const query = <T extends Element>(
    selector: string,
    scope: ParentNode = root
  ) => {
    const element = scope.querySelector<T>(selector);
    if (!element) {
      throw new Error(`Missing public-page element: ${selector}`);
    }
    return element;
  };

  const showState = (name: string) => {
    root.querySelectorAll<HTMLElement>('[data-state]').forEach((element) => {
      element.hidden = element.dataset.state !== name;
    });
  };

  const createClient = () => {
    if (!url || !anonKey) {
      throw new Error(
        'Public data is enabled without its public configuration.'
      );
    }
    return new PublicDataClient({ url, anonKey });
  };

  const formatHumanNumber = (value: number | null) =>
    value === null ? '—' : `#${String(value).padStart(4, '0')}`;

  const dateFormatter = new Intl.DateTimeFormat(locale, {
    dateStyle: 'long',
    timeZone: 'UTC',
  });

  const formatDate = (value: string) =>
    dateFormatter.format(new Date(`${value}T00:00:00Z`));

  const regionNames =
    typeof Intl.DisplayNames === 'function'
      ? new Intl.DisplayNames([locale], { type: 'region' })
      : null;

  const formatCountry = (code: string | null) =>
    code ? (regionNames?.of(code) ?? code) : '';

  const setText = (selector: string, value: string, scope?: ParentNode) => {
    query<HTMLElement>(selector, scope).textContent = value;
  };

  const startCountdown = () => {
    const countdown = query<HTMLElement>('[data-countdown]');
    const update = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setUTCHours(24, 0, 0, 0);
      const seconds = Math.max(
        0,
        Math.floor((tomorrow.getTime() - now.getTime()) / 1000)
      );
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const remainder = seconds % 60;
      countdown.textContent = [hours, minutes, remainder]
        .map((part) => String(part).padStart(2, '0'))
        .join(':');
    };

    update();
    window.setInterval(update, 1000);
  };

  const loadToday = async () => {
    showState('loading');

    try {
      const client = createClient();
      const human = await client.getToday();
      if (!human || human.is_removed || !human.display_name) {
        showState('quiet');
        return;
      }

      const [
        portrait,
        questions,
        photoUrl,
        portraitTranslations,
        questionTranslations,
      ] = await Promise.all([
        client.getPortrait(human.draw_id),
        client.getQuestions(human.draw_id),
        client.signPhoto(human.photo_path),
        client.getPortraitTranslations(human.draw_id, locale),
        client.getQuestionTranslations(human.draw_id, locale),
      ]);

      setText('[data-human-number]', formatHumanNumber(human.human_number));
      setText('[data-human-date]', formatDate(human.selection_date));
      setText('[data-human-name]', human.display_name);

      const location = [human.city, formatCountry(human.country_code)]
        .filter(Boolean)
        .join(' · ');
      setText('[data-human-location]', location);

      /*
       * Founding Human — 'Joined during Year Zero'.
       *
       * Derived in the database from the join date and the Archive's first day,
       * so there is no field to award and nothing here can grant it. It carries
       * no advantage in the draw. Hidden rather than emptied when false, so the
       * nameplate does not keep a blank line for most people.
       */
      const founding = query<HTMLElement>('[data-human-founding]');
      founding.textContent = copy.today.live.foundingLabel;
      founding.hidden = human.founding !== true;

      const image = query<HTMLImageElement>('[data-today-photo]');
      const placeholder = query<HTMLElement>('[data-photo-placeholder]');
      image.hidden = true;
      placeholder.hidden = false;

      if (photoUrl) {
        image.alt = `${copy.archive.entry.photoAlt} ${human.display_name}`;
        image.onload = () => {
          image.hidden = false;
          placeholder.hidden = true;
        };
        image.onerror = () => {
          image.hidden = true;
          placeholder.hidden = false;
        };
        image.src = photoUrl;
      }

      const portraitList = query<HTMLDListElement>('[data-portrait-list]');
      const questionList = query<HTMLOListElement>('[data-question-list]');
      const noQuestions = query<HTMLElement>('[data-no-questions]');
      noQuestions.hidden = questions.length > 0;
      const translationToggle = query<HTMLButtonElement>(
        '[data-translation-toggle]'
      );
      let translatedMode = false;
      translationToggle.hidden = !(
        Object.keys(portraitTranslations).length > 0 ||
        Object.keys(questionTranslations).length > 0
      );

      const renderStories = () => {
        portraitList.replaceChildren();
        portrait.forEach((element) => {
          const group = document.createElement('div');
          const term = document.createElement('dt');
          const answer = document.createElement('dd');
          term.textContent =
            copy.today.live.prompts[element.element_key as PortraitKey];
          answer.textContent =
            (translatedMode
              ? portraitTranslations[element.element_key]
              : null) ?? element.answer;
          group.append(term, answer);
          portraitList.append(group);
        });

        questionList.replaceChildren();
        questions.forEach((question) => {
          const translated = questionTranslations[question.id];
          const item = document.createElement('li');
          const body = document.createElement('p');
          const answer = document.createElement('p');
          body.className = 'public-question__body';
          answer.className = 'public-question__answer';
          body.textContent =
            (translatedMode ? translated?.translated_body : null) ??
            question.body;
          answer.textContent =
            (translatedMode ? translated?.translated_answer : null) ??
            question.answer ??
            copy.today.live.unanswered;
          if (!question.answer) {
            answer.classList.add('public-question__answer--pending');
          }
          item.append(body, answer);
          questionList.append(item);
        });
        translationToggle.textContent = translatedMode
          ? copy.today.live.showOriginal
          : copy.today.live.showTranslated;
        translationToggle.setAttribute('aria-pressed', String(translatedMode));
      };
      translationToggle.addEventListener('click', () => {
        translatedMode = !translatedMode;
        renderStories();
      });
      renderStories();

      showState('live');
      startCountdown();
    } catch {
      showState('error');
    }
  };

  const createArchiveEntry = (
    entry: ArchiveEntry,
    client: PublicDataClient,
    photoUrl?: string | null
  ): HTMLElement => {
    const item = document.createElement('li');
    item.className = 'archive-entry';

    const meta = document.createElement('p');
    meta.className = 'archive-entry__meta';
    meta.textContent = `${copy.archive.entry.humanLabel} ${formatHumanNumber(entry.human_number)} · ${formatDate(entry.selection_date)}`;

    if (entry.is_removed) {
      item.classList.add('archive-entry--removed');
      const title = document.createElement('h3');
      const body = document.createElement('p');
      title.textContent = copy.archive.entry.removed;
      body.textContent = copy.archive.entry.removedBody;
      item.append(meta, title, body);
      return item;
    }

    const media = document.createElement('div');
    media.className = 'archive-entry__media';
    media.setAttribute('aria-hidden', 'true');

    const fallbackIndex =
      Math.abs(entry.human_number ?? 0) % archiveEditorialFallbacks.length;
    const fallbackImage = document.createElement('img');
    fallbackImage.src =
      archiveEditorialFallbacks[fallbackIndex] ?? archiveEditorialFallbacks[0];
    fallbackImage.alt = '';
    fallbackImage.width = 640;
    fallbackImage.height = 800;
    fallbackImage.loading = 'lazy';
    fallbackImage.decoding = 'async';

    const fallbackLabel = document.createElement('span');
    fallbackLabel.className = 'editorial-fallback-label';
    fallbackLabel.textContent = copy.archive.entry.editorialFallback;
    media.append(fallbackImage, fallbackLabel);

    if (photoUrl) {
      const image = document.createElement('img');
      image.src = photoUrl;
      image.alt = '';
      image.width = 320;
      image.height = 400;
      image.loading = 'lazy';
      image.decoding = 'async';
      image.onload = () => {
        if (media.isConnected) media.replaceChildren(image);
      };
    } else if (entry.photo_path) {
      void client.signPhoto(entry.photo_path).then((photoUrl) => {
        if (!photoUrl || !media.isConnected) {
          return;
        }
        const image = document.createElement('img');
        image.src = photoUrl;
        image.alt = '';
        image.width = 320;
        image.height = 400;
        image.loading = 'lazy';
        image.decoding = 'async';
        image.onload = () => {
          if (media.isConnected) {
            media.replaceChildren(image);
          }
        };
        image.src = photoUrl;
      });
    }

    const details = document.createElement('div');
    details.className = 'archive-entry__details';
    const title = document.createElement('h3');
    title.textContent = entry.display_name ?? '';
    const location = document.createElement('p');
    location.textContent = [entry.city, formatCountry(entry.country_code)]
      .filter(Boolean)
      .join(' · ');
    details.append(meta, title, location);
    const link = document.createElement('a');
    const prefix = locale === 'en' ? '' : `/${locale}`;
    link.className = 'archive-entry__link';
    link.href = `${prefix}/human/${entry.draw_id}`;
    link.append(media, details);
    item.append(link);
    return item;
  };

  const loadArchive = async () => {
    showState('loading');

    try {
      const client = createClient();
      const limit = 12;
      let cursor: { selectionDate: string; drawId: string } | null = null;
      let country: string | null = null;
      let year: number | null = null;
      let generation = 0;

      const explorer = query<HTMLElement>('[data-archive-explorer]');
      const countrySelect = query<HTMLSelectElement>('[data-country-filter]');
      const yearSelect = query<HTMLSelectElement>('[data-year-filter]');
      const list = query<HTMLOListElement>('[data-archive-list]');
      const loadMore = query<HTMLButtonElement>('[data-load-more]');
      const end = query<HTMLElement>('[data-archive-end]');
      const randomResult = query<HTMLElement>('[data-random-result]');

      const renderEntries = async (
        entries: ArchiveEntry[],
        append: boolean
      ) => {
        if (!append) {
          list.replaceChildren();
        }
        const photos = await client.signPhotos(
          entries.map((entry) => entry.photo_path)
        );
        entries.forEach((entry) => {
          const photoUrl = entry.photo_path
            ? (photos.get(entry.photo_path) ?? null)
            : null;
          list.append(createArchiveEntry(entry, client, photoUrl));
        });
        loadMore.hidden = entries.length < limit;
        end.hidden = entries.length === limit || list.children.length === 0;
      };

      const fetchPage = async (append = false) => {
        const requestGeneration = ++generation;
        if (!append) {
          cursor = null;
          showState('loading');
        }

        try {
          const entries = await client.getArchive(country, year, limit, cursor);
          if (requestGeneration !== generation) {
            return;
          }

          if (!append && entries.length === 0) {
            showState(country || year ? 'no-match' : 'empty');
            return;
          }

          await renderEntries(entries, append);
          const last = entries.at(-1);
          cursor = last
            ? { selectionDate: last.selection_date, drawId: last.draw_id }
            : cursor;
          showState('ready');
        } catch {
          showState('error');
        }
      };

      const [countries, years] = await Promise.all([
        client.getCountries(),
        client.getYears(),
      ]);

      countries.forEach((item) => {
        const option = document.createElement('option');
        option.value = item.country_code;
        option.textContent = formatCountry(item.country_code);
        countrySelect.append(option);
      });
      years.forEach((item) => {
        const option = document.createElement('option');
        option.value = String(item.year);
        option.textContent = String(item.year);
        yearSelect.append(option);
      });

      explorer.hidden = false;
      await fetchPage();

      countrySelect.addEventListener('change', () => {
        country = countrySelect.value || null;
        randomResult.hidden = true;
        void fetchPage();
      });

      yearSelect.addEventListener('change', () => {
        year = yearSelect.value ? Number(yearSelect.value) : null;
        randomResult.hidden = true;
        void fetchPage();
      });

      loadMore.addEventListener('click', () => {
        void fetchPage(true);
      });

      query<HTMLButtonElement>('[data-random]').addEventListener(
        'click',
        async () => {
          const button = query<HTMLButtonElement>('[data-random]');
          button.disabled = true;
          try {
            const entry = await client.getRandomHuman();
            randomResult.replaceChildren();
            if (entry) {
              const label = document.createElement('p');
              label.className = 'eyebrow';
              label.textContent = copy.archive.controls.randomResult;
              randomResult.append(label, createArchiveEntry(entry, client));
              randomResult.hidden = false;
            }
          } catch {
            showState('error');
          } finally {
            button.disabled = false;
          }
        }
      );
    } catch {
      showState('error');
    }
  };

  root.querySelectorAll<HTMLButtonElement>('[data-retry]').forEach((button) => {
    button.addEventListener('click', () => {
      if (page === 'today') {
        void loadToday();
      } else {
        window.location.reload();
      }
    });
  });

  if (mode === 'live') {
    if (page === 'today') {
      void loadToday();
    } else {
      void loadArchive();
    }
  }
}
