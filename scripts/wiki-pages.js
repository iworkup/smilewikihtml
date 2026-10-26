import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { navigationPages } from '../smilewikihtml/navigation.js';

const pages = navigationPages.flatMap(function flatten(page) {
  return [page, ...(page.children ?? []).flatMap(flatten)];
}).filter((page) => page.href.endsWith('.html'));
const escape = (text) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

function render(template, page) {
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

export default function wikiPages() {
  let outputDirectory;
  return {
    name: 'wiki-pages',
    configResolved(config) { outputDirectory = resolve(config.root, config.build.outDir); },
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const path = new URL(request.url, 'http://localhost').pathname;
        const page = pages.find((page) => page.href === path || page.href.replace('/smilewikihtml', '') === path);
        if (!page) return next();
        try {
          const template = await readFile(resolve(server.config.root, 'index.html'), 'utf8');
          const html = await server.transformIndexHtml(page.href, render(template, page));
          response.setHeader('Content-Type', 'text/html; charset=utf-8');
          response.end(html);
        } catch (error) { next(error); }
      });
    },
    async writeBundle() {
      const template = await readFile(resolve(outputDirectory, 'index.html'), 'utf8');
      await Promise.all(pages.map((page) => writeFile(resolve(outputDirectory, page.href.split('/').at(-1)), render(template, page))));
    },
  };
}
