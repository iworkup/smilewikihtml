import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
const themeSwitch = document.querySelector('#themeSwitch');
themeSwitch.checked = document.documentElement.dataset.bsTheme === 'dark';
themeSwitch.addEventListener('change', () => {
  const theme = themeSwitch.checked ? 'dark' : 'light';
  document.documentElement.dataset.bsTheme = theme;
  try { localStorage.setItem('smilewiki-theme', theme); } catch {}
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
const searchable = [...document.querySelectorAll('#about, #quickStart, #articles')].map((element) => ({
  id: element.id,
  title: element.id === 'quickStart' ? 'Быстрый старт' : (element.querySelector('h2')?.textContent ?? element.textContent).trim(),
  text: element.textContent,
}));
document.querySelectorAll('#articles + .list-group > li').forEach((element, index) => {
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
    if (item.id === 'quickStart') {
      link.dataset.bsToggle = 'collapse';
    }
    li.append(link);
    list.append(li);
  });
}
document.querySelector('#siteSearch').addEventListener('submit', (event) => {
  event.preventDefault();
  search();
});
searchInput.addEventListener('input', search);
