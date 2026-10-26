import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { codeToHtml } from 'shiki';
import { restoreNavigation } from './navigation-state.js';
import { navigationPages } from '../smilewikihtml/navigation.js';

const allPages = navigationPages.flatMap(function flatten(page) {
  return [page, ...(page.children ?? []).flatMap(flatten)];
}).filter((page) => page.href && page.href.endsWith('.html'));
const escape = (text) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

function buildNavigationHtml(pages, currentPath, navIndex, path = []) {
  return `<ul class="nav d-block list-unstyled mb-0${path.length ? ' border-start ms-1 ps-1' : ''}" data-depth="${path.length + 1}">${pages.map((page, index) => {
    const childPath = [...path, index].join('-');
    const branchClass = `navigation-branch-${childPath}`;
    const id = `navigation-${navIndex}-${childPath}`;
    // Section node (collapsible group, no page link)
    if (page.type === 'section') {
      const containsCurrent = (items) => items.some((item) => item.href === currentPath || (item.children && containsCurrent(item.children)));
      const open = containsCurrent(page.children || []);
      const sectionKey = `section:${page.id}`;
      return `<li><div class="d-flex align-items-center"><button type="button" class="btn-text btn-xs border-0 rounded-0 py-1 px-2 lh-sm fs-sm text-wrap text-break w-100 text-start d-flex align-items-center justify-content-start gap-1" data-bs-toggle="collapse" data-bs-target=".${branchClass}" aria-controls="${id}" data-navigation-toggle="${escape(sectionKey)}" aria-expanded="${open}" aria-label="${open ? 'Свернуть' : 'Развернуть'} «${escape(page.title)}»"><span data-navigation-indicator class="flex-shrink-0">${open ? '−' : '+'}</span><span data-navigation-title>${escape(page.title)}</span></button></div><div id="${id}" class="collapse ${branchClass}${open ? ' show' : ''}" data-navigation-href="${escape(sectionKey)}">${buildNavigationHtml(page.children, currentPath, navIndex, [...path, index])}</div></li>`;
    }
    // Regular page node
    const isActive = page.href === currentPath;
    const containsCurrent = (items) => items.some((item) => item.href === currentPath || (item.children && containsCurrent(item.children)));
    const open = isActive || containsCurrent(page.children || []);
    const toggle = page.children?.length ? `<button type="button" class="btn-icon btn-text btn-xs border-0 rounded-0 py-1 px-1 lh-sm fs-sm flex-shrink-0" data-bs-toggle="collapse" data-bs-target=".${branchClass}" aria-controls="${id}" data-navigation-toggle="${escape(page.href)}" data-navigation-title="${escape(page.title)}" aria-expanded="${open}" aria-label="${open ? 'Свернуть' : 'Развернуть'} «${escape(page.title)}»">${open ? '−' : '+'}</button>` : '';
    const children = page.children?.length ? `<div id="${id}" class="collapse ${branchClass}${open ? ' show' : ''}" data-navigation-href="${escape(page.href)}">${buildNavigationHtml(page.children, currentPath, navIndex, [...path, index])}</div>` : '';
    return `<li><div class="d-flex align-items-start"><a class="nav-link d-block border-0 rounded-0 py-1 px-2 lh-sm fs-sm text-wrap text-break flex-grow-1 min-w-0${isActive ? ' active' : ''}"${isActive ? ' aria-current="page"' : ''} href="${escape(page.href)}">${escape(page.title)}</a>${toggle}</div>${children}</li>`;
  }).join('')}</ul>`;
}

function navHrefPath(path) {
  return new URL(path, 'http://localhost').pathname.replace(/index\.html$/, '').replace(/^\/$/, '/smilewikihtml/');
}

function injectNavigationAndToc(html, currentPath) {
  // Markers let build output be rendered again for each article without stale menus.
  html = html.replace(/<!-- generated:(navigation|toc):start -->[\s\S]*?<!-- generated:\1:end -->/g, '');
  const usedIds = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]));
  const headings = [];
  html = html.replace(/(<div[^>]+id="pageContent">)([\s\S]*?)(\n      <\/div>)/, (_, start, content, end) => {
    content = content.replace(/<(h[23])(\b[^>]*?)>([\s\S]*?)<\/\1>/gi, (match, tag, attrs, body) => {
      if (currentPath === '/smilewikihtml/text.html' && /\bdata-typography-example\b/.test(attrs)) return match;
      const text = body.replace(/<[^>]*>/g, '').trim();
      let id = attrs.match(/\bid="([^"]+)"/)?.[1];
      if (!id) {
        const slug = text.toLocaleLowerCase('ru').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '') || 'section';
        id = slug;
        for (let suffix = 2; usedIds.has(id); suffix++) id = `${slug}-${suffix}`;
        usedIds.add(id);
        attrs += ` id="${id}"`;
      }
      headings.push({ tag: tag.toLowerCase(), id, text });
      return `<${tag}${attrs}>${body}</${tag}>`;
    });
    return start + content + end;
  });
  let navIndex = 0;
  html = html.replace(/(<(nav|div)\b[^>]*data-site-navigation[^>]*>)\s*<\/\2>/g, (_, start, tag) => `${start}<!-- generated:navigation:start -->${buildNavigationHtml(navigationPages, currentPath, navIndex++)}<script>(${restoreNavigation.toString()})();</script><!-- generated:navigation:end --></${tag}>`);
  const toc = headings.map(({ tag, id, text }) => `<a class="nav-link justify-content-start py-1 px-2 lh-sm fs-sm text-wrap rounded-0 ${tag === 'h3' ? 'ms-3 border-start border-2 border-top-0 border-end-0 border-bottom-0' : 'border-0'}" href="#${encodeURIComponent(id)}">${text}</a>`).join('');
  return html.replace(/(<(nav|div)\b[^>]*data-page-toc[^>]*>)\s*<\/\2>/g, (_, start, tag) => `${start}<!-- generated:toc:start -->${toc}<!-- generated:toc:end --></${tag}>`);
}

// ── Page content replacement for article pages ──────────────────────────────

async function renderCodeCard(preview, code, label) {
  const highlighted = await codeToHtml(code, {
    lang: 'html',
    theme: 'material-theme-palenight',
    transformers: [{ pre(node) {
      node.properties.class += ' m-0 p-3 overflow-auto';
      node.properties.tabindex = 0;
      node.properties['aria-label'] = `HTML-код: ${label}`;
    } }],
  });
  return `<div class="card overflow-hidden" data-code-block>
    <div class="card-body">${preview}</div>
    <div class="d-flex align-items-center justify-content-between gap-2 p-2 bg-2 border-top border-bottom">
      <span class="font-monospace fs-sm">HTML</span>
              <button type="button" class="btn btn-sm btn-icon btn-outline theme-secondary" data-copy-code aria-label="Скопировать HTML-код: ${escape(label)}" title="Копировать код"><svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true"><path d="M10 1.5v1H6v-1A.5.5 0 0 1 6.5 1h3a.5.5 0 0 1 .5.5m-5 0A1.5 1.5 0 0 1 6.5 0h3A1.5 1.5 0 0 1 11 1.5h1A2 2 0 0 1 14 3.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V3.5a2 2 0 0 1 2-2zm0 1H4a1 1 0 0 0-1 1V14a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V3.5a1 1 0 0 0-1-1h-1v1H5z"/></svg></button>
    </div>
    ${highlighted}
    <div class="px-2 fs-sm" role="status" aria-live="polite" data-copy-status></div>
  </div>`;
}

const inlineTextExample = `<p>Это обычный параграф текста.</p>
<p>Это следующий параграф — отдельная мысль.</p>
<p>Первая строка параграфа.<br>Вторая строка после принудительного переноса.</p>
<p>Можно <mark>выделить</mark> важный фрагмент текста.</p>
<p><del>Этот фрагмент удалён из документа.</del></p>
<p><s>Эти сведения больше не актуальны.</s></p>
<p><ins>Этот фрагмент добавлен в документ.</ins></p>
<p><u>Это слово с подчёркнутой аннотацией.</u></p>
<p><small>Это примечание мелким шрифтом.</small></p>
<p><strong>Это важный текст, выделенный полужирным.</strong></p>
<p><em>Это текст с логическим ударением, выделенный курсивом.</em></p>`;

async function renderArticleContent(template, page) {
  const title = escape(page.title);
  const pageActions = template.match(/<div\b[^>]*id="pageActions"[^>]*>[\s\S]*?<\/div>/)?.[0];
  if (!pageActions) throw new Error('В шаблоне отсутствуют кнопки страницы');
  const content = page.href === '/smilewikihtml/text.html'
    ? `<p>Примеры текстовых элементов, используемых в проекте.</p>
        <section class="mb-3" id="headings">
          <h2>Заголовки</h2>
          <p>Шесть уровней заголовков: от h1 до h6. HTML-код всех примеров приведён ниже.</p>
          ${await renderCodeCard(
            [1, 2, 3, 4, 5, 6].map((level) => `<h${level} data-typography-example>Заголовок ${level}-го уровня</h${level}>`).join('\n'),
            [1, 2, 3, 4, 5, 6].map((level) => `<h${level}>Заголовок ${level}-го уровня</h${level}>`).join('\n'),
            'Заголовки',
          )}
        </section>
        <section class="mb-3" id="inline-text-elements">
          <h2>Стандартное оформление текста</h2>
          <p>Параграфы, перенос строки и стандартные HTML-элементы оформления текста.</p>
          ${await renderCodeCard(inlineTextExample, inlineTextExample, 'Стандартное оформление текста')}
        </section>`
    : `<section class="mb-3" id="overview">
          <h2 class="fs-xl">Об этой странице</h2>
          <p class="text-break">Демонстрационная отдельная страница wiki: ${title}. Замените этот текст содержимым статьи.</p>
          <p><a href="/smilewikihtml/">Главная страница</a></p>
        </section>`;
  return template.replace(/<title>.*?<\/title>/s, `<title>${title} — Smile Wiki HTML</title>`)
    .replace(/(<div[^>]+id="pageContent">)[\s\S]*?(\n      <\/div>)/, `$1
        ${pageActions}
        <h1 class="fs-3xl fw-bold text-break">${title}</h1>
        ${content}$2`);
}

// ── Plugin ──────────────────────────────────────────────────────────────────

export default function wikiPages() {
  let outputDirectory;
  return {
    name: 'wiki-pages',
    configResolved(config) { outputDirectory = resolve(config.root, config.build.outDir); },
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const currentPath = navHrefPath(ctx.path);
        return injectNavigationAndToc(html, currentPath);
      },
    },
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const path = new URL(request.url, 'http://localhost').pathname;
        const page = allPages.find((p) => p.href === path || p.href.replace('/smilewikihtml', '') === path);
        if (!page) return next();
        try {
          const template = await readFile(resolve(server.config.root, 'index.html'), 'utf8');
          const articleHtml = await renderArticleContent(template, page);
          const html = await server.transformIndexHtml(page.href, articleHtml);
          response.setHeader('Content-Type', 'text/html; charset=utf-8');
          response.end(html);
        } catch (error) { next(error); }
      });
    },
    async writeBundle() {
      const template = await readFile(resolve(outputDirectory, 'index.html'), 'utf8');
      await Promise.all(allPages.map(async (page) => {
        const articleHtml = await renderArticleContent(template, page);
        const pagePath = navHrefPath(page.href);
        const fullHtml = injectNavigationAndToc(articleHtml, pagePath);
        await writeFile(resolve(outputDirectory, page.href.split('/').at(-1)), fullHtml);
      }));
    },
  };
}
