import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
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

// Shared page hierarchy for desktop and mobile, including a ten-level example.
const navigationPages = [
  { title: 'Главная', href: '/smilewikihtml/', current: true },
  { title: 'Категории', href: '#articles', children: [
    { title: 'База знаний', href: '#wiki-intro', children: [
      { title: 'Работа с wiki', href: '#start', children: [
        { title: 'Редактирование', href: '#editing', children: [
          { title: 'Оформление статей', href: '#editing', children: [
            { title: 'Источники', href: '#sources', children: [
              { title: 'Проверка ссылок', href: '#sources', children: [
                { title: 'Обсуждение', href: '#community', children: [
                  { title: 'Вопросы', href: '#faq', children: [
                    { title: 'Ответы · уровень 10', href: '#faq' },
                  ] },
                ] },
              ] },
            ] },
          ] },
        ] },
      ] },
    ] },
  ] },
  { title: 'О проекте', href: '#about' },
];
function renderNavigation(pages, depth = 1) {
  const list = document.createElement('ul');
  list.className = 'list-unstyled mb-0';
  list.dataset.depth = depth;
  if (depth > 1) list.classList.add('border-start', 'ms-1', 'ps-1');
  pages.forEach((page) => {
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.className = 'nav-link d-block border-0 rounded-0 py-1 px-1 lh-sm fs-sm text-wrap text-break';
    link.textContent = page.title;
    link.href = page.href;
    if (page.current) {
      link.classList.add('active', 'fw-semibold');
      link.setAttribute('aria-current', 'page');
    }
    item.append(link);
    if (page.children?.length) item.append(renderNavigation(page.children, depth + 1));
    list.append(item);
  });
  return list;
}
document.querySelectorAll('[data-site-navigation]').forEach((nav) => {
  nav.replaceChildren(renderNavigation(navigationPages));
});

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
