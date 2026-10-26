import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { restoreNavigation } from './navigation-state.js';
import { navigationPages } from '../smilewikihtml/navigation.js';

const allPages = navigationPages.flatMap(function flatten(page) {
  return [page, ...(page.children ?? []).flatMap(flatten)];
}).filter((page) => page.href.endsWith('.html'));
const escape = (text) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

function buildNavigationHtml(pages, currentPath, navIndex, path = []) {
  return `<ul class="nav d-block list-unstyled mb-0${path.length ? ' border-start ms-1 ps-1' : ''}" data-depth="${path.length + 1}">${pages.map((page, index) => {
    const isActive = page.href === currentPath;
    const containsCurrent = (items) => items.some((item) => item.href === currentPath || containsCurrent(item.children || []));
    const open = isActive || containsCurrent(page.children || []);
    const childPath = [...path, index].join('-');
    const branchClass = `navigation-branch-${childPath}`;
    const id = `navigation-${navIndex}-${childPath}`;
    const toggle = page.children?.length ? `<button type="button" class="btn-icon btn-text btn-xs border-0 rounded-0 py-1 px-1 lh-sm fs-sm flex-shrink-0" data-bs-toggle="collapse" data-bs-target=".${branchClass}" aria-controls="${id}" data-navigation-toggle="${escape(page.href)}" aria-expanded="${open}" aria-label="${open ? 'Свернуть' : 'Развернуть'} «${escape(page.title)}»">${open ? '−' : '+'}</button>` : '';
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

function renderArticleContent(template, page) {
  const title = escape(page.title);
  return template.replace(/<title>.*?<\/title>/s, `<title>${title} — Smile Wiki HTML</title>`)
    .replace(/(<div[^>]+id="pageContent">)[\s\S]*?(\n      <\/div>)/, `$1
        <button class="btn-outline theme-secondary lg:d-none mb-3" type="button" data-bs-toggle="drawer" data-bs-target="#tocDrawer" aria-controls="tocDrawer">На этой странице</button>
        <h1 class="fs-3xl fw-bold text-break">${title}</h1>
        <section class="mb-3" id="overview">
          <h2 class="fs-xl">Об этой странице</h2>
          <p class="text-break">Демонстрационная отдельная страница wiki: ${title}. Замените этот текст содержимым статьи.</p>
          <p><a href="/smilewikihtml/">Главная страница</a></p>
        </section>$2`);
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
          const articleHtml = renderArticleContent(template, page);
          const html = await server.transformIndexHtml(page.href, articleHtml);
          response.setHeader('Content-Type', 'text/html; charset=utf-8');
          response.end(html);
        } catch (error) { next(error); }
      });
    },
    async writeBundle() {
      const template = await readFile(resolve(outputDirectory, 'index.html'), 'utf8');
      await Promise.all(allPages.map(async (page) => {
        const articleHtml = renderArticleContent(template, page);
        const pagePath = navHrefPath(page.href);
        const fullHtml = injectNavigationAndToc(articleHtml, pagePath);
        await writeFile(resolve(outputDirectory, page.href.split('/').at(-1)), fullHtml);
      }));
    },
  };
}