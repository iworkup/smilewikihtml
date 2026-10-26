// Serialized into each navigation placeholder; runs while HTML is being parsed,
// before the module entry point or the first rendering of the finished menu.
export function restoreNavigation() {
  const nav = document.currentScript.parentElement;
  let state = {};
  try { state = JSON.parse(sessionStorage.getItem('smilewiki-navigation') || '{}') || {}; } catch {}
  nav.querySelectorAll('[data-navigation-href]').forEach((branch) => {
    const href = branch.dataset.navigationHref;
    const expanded = branch.classList.contains('show') || state[href] === true;
    branch.classList.toggle('show', expanded);
    state[href] = expanded;
  });
  nav.querySelectorAll('[data-navigation-toggle]').forEach((button) => {
    const expanded = state[button.dataset.navigationToggle] === true;
    button.textContent = expanded ? '−' : '+';
    button.setAttribute('aria-expanded', String(expanded));
    button.setAttribute('aria-label', `${expanded ? 'Свернуть' : 'Развернуть'} «${button.previousElementSibling.textContent}»`);
  });
  try { sessionStorage.setItem('smilewiki-navigation', JSON.stringify(state)); } catch {}
}
