import 'bootstrap';
const themeLabels = { light: 'светлая', dark: 'тёмная', auto: 'системная' };
let selectedTheme = 'auto';
try { selectedTheme = localStorage.getItem('smilewiki-theme') || 'auto'; } catch {}
function applyTheme(theme) {
  selectedTheme = Object.hasOwn(themeLabels, theme) ? theme : 'auto';
  if (selectedTheme === 'auto') delete document.documentElement.dataset.bsTheme;
  else document.documentElement.dataset.bsTheme = selectedTheme;
  document.querySelector('#themeMenuToggle').setAttribute('aria-label', `Цветовая тема: ${themeLabels[selectedTheme]}`);
  document.querySelectorAll('[data-theme]').forEach((button) => {
    const active = button.dataset.theme === selectedTheme;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}
applyTheme(selectedTheme);
document.querySelector('#themeMenu').addEventListener('click', (event) => {
  const button = event.target.closest('[data-theme]');
  if (!button) return;
  applyTheme(button.dataset.theme);
  try { localStorage.setItem('smilewiki-theme', selectedTheme); } catch {}
});

// Local template preview: switch between guest and user states without a server.
export function setCurrentUser(user) {
  const signedIn = typeof user?.name === 'string' && user.name.trim().length > 0;
  document.querySelector('#userName').textContent = signedIn ? user.name : 'Авторизация';
  document.querySelector('#loginIcon').classList.toggle('d-none', signedIn);
  document.querySelector('#userIcon').classList.toggle('d-none', !signedIn);
  document.querySelector('#userMenuDivider').classList.toggle('d-none', !signedIn);
  document.querySelectorAll('[data-auth-action]').forEach((item) => {
    const guestItem = ['login', 'register'].includes(item.dataset.authAction);
    item.classList.toggle('d-none', signedIn === guestItem);
  });
}
setCurrentUser(null);
document.querySelector('#userMenu').addEventListener('click', (event) => {
  const item = event.target.closest('[data-auth-action]');
  if (!item) return;
  const action = item.dataset.authAction;
  const status = document.querySelector('#topbarStatus');
  status.classList.add('d-none');
  if (action === 'login') setCurrentUser({ name: 'Пользователь' });
  else if (action === 'logout') setCurrentUser(null);
  else {
    status.textContent = action === 'profile'
      ? 'Профиль пользователя: демонстрационное состояние шаблона.'
      : 'Регистрация: демонстрационный пункт шаблона. Для просмотра состояния пользователя нажмите «Войти».';
    status.classList.remove('d-none');
  }
});

// Update collapse toggle buttons (+/−) when Bootstrap opens/closes a branch.
function updateBranchToggle(button, expanded) {
  button.textContent = expanded ? '−' : '+';
  button.setAttribute('aria-expanded', String(expanded));
  const pageTitle = button.previousElementSibling?.textContent ?? '';
  button.setAttribute('aria-label', `${expanded ? 'Свернуть' : 'Развернуть'} «${pageTitle}»`);
}
document.querySelectorAll('[data-site-navigation]').forEach((nav) => {
  for (const [eventName, expanded] of [['show.bs.collapse', true], ['hide.bs.collapse', false]]) {
    nav.addEventListener(eventName, (event) => {
      const href = event.target.dataset.navigationHref;
      if (!href) return;
      // Remember the intended state even while Collapse is still transitioning.
      try {
        const state = JSON.parse(sessionStorage.getItem('smilewiki-navigation') || '{}') || {};
        state[href] = expanded;
        sessionStorage.setItem('smilewiki-navigation', JSON.stringify(state));
      } catch {}
      document.querySelectorAll('[data-navigation-toggle]').forEach((button) => {
        if (button.dataset.navigationToggle === href) updateBranchToggle(button, expanded);
      });
    });
  }
});
// Scroll only the menu, leaving the article position and keyboard focus intact.
function centerActiveLink(menu) {
  const active = menu.querySelector('.nav-link.active');
  if (!active || !menu.clientHeight) return;
  const menuRect = menu.getBoundingClientRect();
  const linkRect = active.getBoundingClientRect();
  menu.scrollTop += linkRect.top + linkRect.height / 2
    - menuRect.top - menu.clientTop - menu.clientHeight / 2;
}

// Keep each desktop menu inside the visible viewport, including above the fold.
const desktopMenus = [...document.querySelectorAll('aside > nav.sticky-top')];
function fitDesktopMenus() {
  const viewport = window.visualViewport;
  const bottom = viewport ? viewport.offsetTop + viewport.height : window.innerHeight;
  const heights = desktopMenus.map((menu) => Math.max(0, bottom - Math.max(0, menu.getBoundingClientRect().top)));
  desktopMenus.forEach((menu, index) => {
    menu.style.maxHeight = `${heights[index]}px`;
    centerActiveLink(menu);
  });
}
let menuResizeFrame;
function scheduleMenuResize() {
  if (menuResizeFrame) return;
  menuResizeFrame = requestAnimationFrame(() => {
    menuResizeFrame = undefined;
    fitDesktopMenus();
  });
}
window.addEventListener('scroll', scheduleMenuResize, { passive: true });
window.addEventListener('resize', scheduleMenuResize);
window.visualViewport?.addEventListener('resize', scheduleMenuResize);
window.visualViewport?.addEventListener('scroll', scheduleMenuResize);
const menuSizeObserver = new ResizeObserver(scheduleMenuResize);
menuSizeObserver.observe(document.querySelector('body'));
document.querySelectorAll('[data-site-navigation]').forEach((nav) => menuSizeObserver.observe(nav));
window.addEventListener('pageshow', scheduleMenuResize);
fitDesktopMenus();

// Search in sections and article list items.
const searchInput = document.querySelector('#searchInput');
const searchable = [...document.querySelectorAll('#main-content section[id]')].map((element) => ({
  id: element.id,
  title: (element.querySelector('h2')?.textContent ?? element.textContent).trim(),
  text: element.textContent,
}));
document.querySelectorAll('#articles > ul > li').forEach((element, index) => {
  element.id = `article-${index + 1}`;
  searchable.push({ id: element.id, title: element.textContent, text: element.textContent });
});
function search() {
  const query = searchInput.value.trim().toLocaleLowerCase('ru');
  document.querySelector('#searchResults').classList.toggle('d-none', !query);
  const list = document.querySelector('#searchResultList');
  list.replaceChildren();
  if (!query) return;
  const matches = searchable.filter((item) => item.text.toLocaleLowerCase('ru').includes(query));
  document.querySelector('#searchSummary').textContent = matches.length ? `Найдено: ${matches.length}` : 'Ничего не найдено. Попробуйте другой запрос.';
  matches.forEach((item) => {
    const li = document.createElement('li');
    const link = document.createElement('a');
    link.href = `#${item.id}`;
    link.textContent = item.title;
    li.append(link);
    list.append(li);
  });
}
document.querySelector('#siteSearch').addEventListener('submit', (event) => {
  event.preventDefault();
  search();
});
searchInput.addEventListener('input', search);

// Let Bootstrap finish closing an overlay before moving focus to its target.
function followSectionLink(event) {
  const link = event.target.closest('a[href^="#"]');
  const target = link && document.getElementById(decodeURIComponent(link.hash.slice(1)));
  if (!target) return;
  const overlay = event.currentTarget;
  event.preventDefault();
  const navigate = () => {
    history.replaceState(null, '', link.hash);
    target.scrollIntoView();
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  };
  overlay.addEventListener(overlay.classList.contains('drawer') ? 'hidden.bs.drawer' : 'hidden.bs.dialog', navigate, { once: true });
  overlay.querySelector('[data-bs-dismiss]').click();
}
for (const id of ['searchDialog', 'sidebarDrawer', 'tocDrawer']) {
  document.getElementById(id).addEventListener('click', followSectionLink);
}

// ScrollSpy changes the active section as the article scrolls.
const pageNav = document.querySelector('#pageNav');
new MutationObserver(scheduleMenuResize).observe(pageNav, {
  subtree: true, attributes: true, attributeFilter: ['class'],
});
for (const id of ['sidebarDrawer', 'tocDrawer']) {
  document.getElementById(id).addEventListener('shown.bs.drawer', (event) => {
    if (id === 'tocDrawer') {
      const activeHref = pageNav.querySelector('.nav-link.active')?.getAttribute('href');
      event.currentTarget.querySelectorAll('.nav-link').forEach((link) => {
        link.classList.toggle('active', link.getAttribute('href') === activeHref);
      });
    }
    centerActiveLink(event.currentTarget.querySelector('.drawer-body'));
  });
}
