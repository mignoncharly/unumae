for (const switcher of document.querySelectorAll<HTMLElement>(
  '[data-moment-switcher]'
)) {
  const tabs = Array.from(
    switcher.querySelectorAll<HTMLButtonElement>('[data-moment-tab]')
  );
  const panels = Array.from(
    switcher.querySelectorAll<HTMLElement>('[data-moment-panel]')
  );
  const caption = switcher.querySelector<HTMLElement>('[data-moment-caption]');
  const detail = switcher.querySelector<HTMLElement>('[data-moment-detail]');
  const position = switcher.querySelector<HTMLElement>(
    '[data-moment-position]'
  );

  const selectMoment = (tab: HTMLButtonElement, focus = false) => {
    const moment = tab.dataset.momentTab;
    tabs.forEach((candidate) => {
      const active = candidate === tab;
      candidate.setAttribute('aria-selected', String(active));
      candidate.tabIndex = active ? 0 : -1;
    });
    panels.forEach((panel) => {
      panel.hidden = panel.dataset.momentPanel !== moment;
    });

    const panel = panels.find(
      (candidate) => candidate.dataset.momentPanel === moment
    );
    const panelCopy = panel?.querySelector('p')?.textContent;
    if (caption && panelCopy) caption.textContent = panelCopy;
    if (detail && panel?.dataset.momentDetail) {
      detail.textContent = panel.dataset.momentDetail;
    }
    if (position) {
      const panelIndex = panels.findIndex((candidate) => candidate === panel);
      position.textContent =
        panelIndex >= 0
          ? `${String(panelIndex + 1).padStart(2, '0')} / ${String(panels.length).padStart(2, '0')}`
          : '';
    }
    if (focus) tab.focus();
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectMoment(tab));
    tab.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
        return;
      }
      event.preventDefault();
      let next = index;
      if (event.key === 'ArrowLeft') {
        next = (index - 1 + tabs.length) % tabs.length;
      }
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      const nextTab = tabs[next];
      if (nextTab) selectMoment(nextTab, true);
    });
  });
}
