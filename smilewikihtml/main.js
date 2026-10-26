import { navigationPages } from './navigation.js';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Collapse } from 'bootstrap';
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

// Shared hierarchy: open ancestors and the current page's immediate children.
const currentPath = location.pathname.replace(/index\.html$/, '');
const initiallyOpenBranches = new Set();
function markActiveBranch(pages) {
  let containsCurrent = false;
  for (const page of pages) {
    const childIsActive = markActiveBranch(page.children || []);
    const isActive = new URL(page.href, location.origin).pathname === currentPath;
    if (page.children?.length && (isActive || childIsActive)) initiallyOpenBranches.add(page.href);
    containsCurrent ||= isActive || childIsActive;
  }
  return containsCurrent;
}
markActiveBranch(navigationPages);

function renderNavigation(pages, navIndex, path = []) {
  const list = document.createElement('ul');
  list.className = 'nav d-block list-unstyled mb-0';
  list.dataset.depth = path.length + 1;
  if (path.length) list.classList.add('border-start', 'ms-1', 'ps-1');
  pages.forEach((page, index) => {
    const item = document.createElement('li');
    const row = document.createElement('div');
    row.className = 'd-flex align-items-start';
    const link = document.createElement('a');
    link.className = 'nav-link d-block border-0 rounded-0 py-1 px-2 lh-sm fs-sm text-wrap text-break flex-grow-1 min-w-0';
    link.textContent = page.title;
    link.href = page.href;
    if (new URL(page.href, location.origin).pathname === currentPath) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    }
    row.append(link);
    item.append(row);
    if (page.children?.length) {
      const childPath = [...path, index];
      const branchClass = `navigation-branch-${childPath.join('-')}`;
      const branch = document.createElement('div');
      branch.id = `navigation-${navIndex}-${childPath.join('-')}`;
      branch.className = `collapse transition-none ${branchClass}`;
      branch.classList.toggle('show', initiallyOpenBranches.has(page.href));
      branch.dataset.navigationHref = page.href;
      branch.append(renderNavigation(page.children, navIndex, childPath));
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'btn-icon btn-xs border-0 rounded-0 py-1 px-1 lh-sm fs-sm flex-shrink-0';
      toggle.dataset.bsToggle = 'collapse';
      toggle.dataset.bsTarget = `.${branchClass}`;
      toggle.setAttribute('aria-controls', branch.id);
      toggle.dataset.navigationToggle = page.href;
      row.append(toggle);
      updateBranchToggle(toggle, initiallyOpenBranches.has(page.href));
      item.append(branch);
    }
    list.append(item);
  });
  return list;
}
function updateBranchToggle(button, expanded) {
  button.textContent = expanded ? '−' : '+';
  button.setAttribute('aria-expanded', String(expanded));
  const pageTitle = button.previousElementSibling.textContent;
  button.setAttribute('aria-label', `${expanded ? 'Свернуть' : 'Развернуть'} «${pageTitle}»`);
}
document.querySelectorAll('[data-site-navigation]').forEach((nav, index) => {
  nav.replaceChildren(renderNavigation(navigationPages, index));
  for (const [eventName, expanded] of [['show.bs.collapse', true], ['hide.bs.collapse', false]]) {
    nav.addEventListener(eventName, (event) => {
      const href = event.target.dataset.navigationHref;
      if (!href) return;
      document.querySelectorAll('[data-navigation-toggle]').forEach((button) => {
        if (button.dataset.navigationToggle === href) updateBranchToggle(button, expanded);
      });
    });
  }
});
// Reset manual expansion when Back/Forward restores a cached document.
window.addEventListener('pageshow', (event) => {
  if (!event.persisted) return;
  document.querySelectorAll('[data-navigation-href]').forEach((branch) => {
    const instance = Collapse.getOrCreateInstance(branch);
    if (initiallyOpenBranches.has(branch.dataset.navigationHref)) instance.show();
    else instance.hide();
  });
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

// Build both versions of the contents from article headings in document order.
const pageContent = document.querySelector('#pageContent');
const headings = [...pageContent.querySelectorAll('h2, h3')];
const usedIds = new Set([...document.querySelectorAll('[id]')].map((element) => element.id));
headings.forEach((heading) => {
  if (heading.id) return;
  const slug = heading.textContent.trim().toLocaleLowerCase('ru')
    .replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '') || 'section';
  let id = slug;
  for (let suffix = 2; usedIds.has(id); suffix++) id = `${slug}-${suffix}`;
  heading.id = id;
  usedIds.add(id);
});
document.querySelectorAll('[data-page-toc]').forEach((nav) => {
  nav.replaceChildren(...headings.map((heading) => {
    const link = document.createElement('a');
    link.className = 'nav-link justify-content-start py-1 px-2 lh-sm fs-sm text-wrap rounded-0';
    if (heading.tagName === 'H3') {
      link.classList.add('ms-3', 'border-start', 'border-2', 'border-top-0', 'border-end-0', 'border-bottom-0');
    } else {
      link.classList.add('border-0');
    }
    link.href = `#${encodeURIComponent(heading.id)}`;
    link.textContent = heading.textContent.trim();
    return link;
  }));
});

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
