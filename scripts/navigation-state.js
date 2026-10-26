// Runs during parsing, before the new menu can paint in its destination state.
export function restoreNavigation() {
  const nav = document.currentScript.parentElement;
  let previous;
  try {
    previous = JSON.parse(sessionStorage.getItem('smilewiki-navigation-transfer'));
  } catch {}
  const finishInitialAnimations = () => {
    nav.getAnimations({ subtree: true }).forEach((animation) => animation.finish());
  };
  if (!previous || !Array.isArray(previous.open) || previous.destination !== location.pathname || Date.now() - previous.time > 30000) {
    finishInitialAnimations();
    return;
  }
  nav.dataset.navigationTransfer = 'true';
  nav.dataset.navigationScroll = previous.scroll;
  if (nav.matches('aside > nav.sticky-top')) {
    nav.style.maxHeight = `${Math.max(0, innerHeight - Math.max(0, nav.getBoundingClientRect().top))}px`;
  }
  nav.querySelectorAll('[data-navigation-href]').forEach((branch) => {
    branch.dataset.navigationDesired = String(branch.classList.contains('show'));
    branch.classList.toggle('show', previous.open.includes(branch.dataset.navigationHref));
  });
  finishInitialAnimations();
  (nav.closest('.drawer-body') || nav).scrollTop = Number(previous.scroll) || 0;
  nav.querySelectorAll('[data-navigation-toggle]').forEach((button) => {
    const expanded = previous.open.includes(button.dataset.navigationToggle);
    const indicator = button.querySelector('[data-navigation-indicator]');
    if (indicator) {
      indicator.textContent = expanded ? '−' : '+';
    } else {
      button.textContent = expanded ? '−' : '+';
    }
    button.setAttribute('aria-expanded', String(expanded));
    const titleEl = button.querySelector('[data-navigation-title]');
    const pageTitle = titleEl ? titleEl.textContent : (button.dataset.navigationTitle || '');
    button.setAttribute('aria-label', `${expanded ? 'Свернуть' : 'Развернуть'} «${pageTitle}»`);
  });
}
