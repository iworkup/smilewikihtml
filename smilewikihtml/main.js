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

const searchInput = document.querySelector('#searchInput');
const searchable = [...document.querySelectorAll('#about, #start, #articles')].map((element) => ({
  id: element.id,
  title: (element.querySelector('h2')?.textContent ?? element.textContent).trim(),
  text: element.textContent,
}));
document.querySelectorAll('#articles .list-group > li').forEach((element, index) => {
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
    li.className = 'list-group-item';
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
  const target = link && document.getElementById(link.hash.slice(1));
  if (!target) return;
  const overlay = event.currentTarget;
  event.preventDefault();
  const navigate = () => {
    if (target.id === 'start' && !document.querySelector('#quickStart').classList.contains('show')) {
      document.querySelector('[data-bs-target="#quickStart"]').click();
    }
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
