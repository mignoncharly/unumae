import { publicContent, type PortraitKey } from '../content/public';
import { PublicDataClient } from '../lib/public-data';
import type { Locale } from '../content/site';

const root = document.querySelector<HTMLElement>('[data-public-human]');

if (root) {
  const locale = (
    ['en', 'fr', 'de'].includes(document.documentElement.lang)
      ? document.documentElement.lang
      : 'en'
  ) as Locale;
  const copy = publicContent[locale];
  const hasSnapshot = root.dataset.hasSnapshot === 'true';
  const drawId = location.pathname.split('/').filter(Boolean).at(-1) ?? '';
  const validDrawId =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      drawId
    );

  const query = <T extends Element>(selector: string) => {
    const element = root.querySelector<T>(selector);
    if (!element) throw new Error(`Missing Human page element: ${selector}`);
    return element;
  };

  const showState = (state: string) => {
    root.querySelectorAll<HTMLElement>('[data-state]').forEach((element) => {
      element.hidden = element.dataset.state !== state;
    });
  };

  const setText = (selector: string, value: string) => {
    query<HTMLElement>(selector).textContent = value;
  };

  const formatDate = (value: string) =>
    new Intl.DateTimeFormat(locale, {
      dateStyle: 'long',
      timeZone: 'UTC',
    }).format(new Date(`${value}T00:00:00Z`));

  const regionNames = new Intl.DisplayNames([locale], { type: 'region' });
  const formatHumanNumber = (value: number | null) =>
    value === null ? '—' : `#${String(value).padStart(4, '0')}`;

  const load = async () => {
    if (root.dataset.dataMode !== 'live') return;
    if (!validDrawId) {
      showState('not-found');
      return;
    }

    if (!hasSnapshot) showState('loading');
    try {
      const url = root.dataset.supabaseUrl;
      const anonKey = root.dataset.supabaseAnonKey;
      if (!url || !anonKey) throw new Error('Missing public data config.');
      const client = new PublicDataClient({ url, anonKey });
      const human = await client.getHuman(drawId);
      if (!human || human.is_removed || !human.display_name) {
        showState('not-found');
        return;
      }

      const [
        portrait,
        questions,
        photoUrl,
        portraitTranslations,
        questionTranslations,
      ] = await Promise.all([
        client.getPortrait(drawId),
        client.getQuestions(drawId),
        client.signPhoto(human.photo_path),
        client.getPortraitTranslations(drawId, locale),
        client.getQuestionTranslations(drawId, locale),
      ]);

      setText('[data-human-number]', formatHumanNumber(human.human_number));
      setText('[data-human-date]', formatDate(human.selection_date));
      setText('[data-human-name]', human.display_name);
      setText(
        '[data-human-location]',
        [
          human.city,
          human.country_code ? regionNames.of(human.country_code) : null,
        ]
          .filter(Boolean)
          .join(' · ')
      );
      document.title = `${human.display_name} · ${formatHumanNumber(human.human_number)} · Unumae`;

      const founding = query<HTMLElement>('[data-human-founding]');
      founding.textContent = copy.today.live.foundingLabel;
      founding.hidden = human.founding !== true;

      const image = query<HTMLImageElement>('[data-human-photo]');
      const placeholder = query<HTMLElement>('[data-photo-placeholder]');
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
      const toggle = query<HTMLButtonElement>('[data-translation-toggle]');
      let translatedMode = false;
      const translationsAvailable =
        Object.keys(portraitTranslations).length > 0 ||
        Object.keys(questionTranslations).length > 0;
      toggle.hidden = !translationsAvailable;

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
        toggle.textContent = translatedMode
          ? copy.today.live.showOriginal
          : copy.today.live.showTranslated;
        toggle.setAttribute('aria-pressed', String(translatedMode));
      };

      toggle.addEventListener('click', () => {
        translatedMode = !translatedMode;
        renderStories();
      });
      renderStories();
      query<HTMLElement>('[data-no-questions]').hidden = questions.length > 0;
      showState('live');
    } catch {
      // A generated snapshot is a complete no-JavaScript fallback. A failed
      // refresh must not replace already published content with an error.
      showState(hasSnapshot ? 'live' : 'error');
    }
  };

  root.querySelector('[data-retry]')?.addEventListener('click', () => {
    void load();
  });
  void load();
}
