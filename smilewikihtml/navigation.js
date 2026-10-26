export const navigationPages = [
  { title: 'Главная', href: '/smilewikihtml/' },
  { type: 'section', id: 'knowledge-base', title: 'База знаний', children: [
    { title: 'Категории статей и подробные руководства по работе с базой знаний', href: '/smilewikihtml/articles.html', children: [
      { title: 'База знаний: организация материалов и навигация по разделам проекта', href: '/smilewikihtml/knowledge-base.html' },
      { title: 'Работа с wiki: пошаговые инструкции для новых участников сообщества', href: '/smilewikihtml/wiki-guide.html', children: [
        { title: 'Редактирование и совместная подготовка подробных энциклопедических статей', href: '/smilewikihtml/editing.html', children: [
          { title: 'Оформление статей с длинными заголовками, примерами и пояснениями', href: '/smilewikihtml/formatting.html' },
        ] },
      ] },
      { title: 'Источники информации: поиск, оценка достоверности и правила цитирования', href: '/smilewikihtml/sources.html', children: [
        { title: 'Проверка внешних ссылок и восстановление недоступных первоисточников', href: '/smilewikihtml/external-links.html' },
      ] },
    ] },
  ] },
  { type: 'section', id: 'community', title: 'Сообщество', children: [
    { title: 'Обсуждение спорных утверждений и согласование изменений с сообществом', href: '/smilewikihtml/discussions.html' },
    { title: 'Часто задаваемые вопросы о сложных случаях оформления материалов', href: '/smilewikihtml/faq.html', children: [
      { title: 'Ответы и рекомендации · вложенная страница · ПроверкаОченьДлинногоНазванияСтраницыБезПробеловДляГраничногоСлучая', href: '/smilewikihtml/answers.html' },
    ] },
  ] },
  { type: 'section', id: 'about-project', title: 'О проекте', children: [
    { title: 'О проекте SmileWiki, его участниках и принципах развития', href: '/smilewikihtml/about.html' },
  ] },
];
