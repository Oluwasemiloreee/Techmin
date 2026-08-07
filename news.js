'use strict';

(() => {
  const state = {
    articles: [],
    filter: 'All',
    sort: 'latest',
    query: '',
    visible: 9,
    endpoints: ['/api/news']
  };

  const elements = {};

  const escapeHtml = (value = '') => value.replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));

  const formatDate = (dateString) => new Intl.DateTimeFormat('en', {
    day: 'numeric', month: 'short', year: 'numeric'
  }).format(new Date(dateString));

  const relativeTime = (dateString) => {
    const seconds = Math.round((new Date(dateString).getTime() - Date.now()) / 1000);
    const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    const units = [
      ['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]
    ];
    for (const [unit, amount] of units) {
      if (Math.abs(seconds) >= amount || unit === 'minute') return formatter.format(Math.round(seconds / amount), unit);
    }
    return 'just now';
  };

  const placeholder = (category) => `
    <div class="news-image-placeholder" aria-hidden="true">
      <i class="bi ${category === 'AI' ? 'bi-cpu' : category === 'Cybersecurity' ? 'bi-shield-lock' : category === 'Startups' ? 'bi-rocket-takeoff' : 'bi-globe2'}"></i>
    </div>`;

  const imageMarkup = (article, featured = false) => article.image
    ? `<img src="${escapeHtml(article.image)}" alt="" loading="${featured ? 'eager' : 'lazy'}" referrerpolicy="no-referrer" onerror="this.parentElement.innerHTML='${placeholder(article.category).replace(/'/g, "\\'").replace(/\n/g, '')}'">`
    : placeholder(article.category);

  const articleCard = (article) => `
    <div class="col-lg-4 col-md-6 news-card-wrap">
      <article class="news-card" data-aos="fade-up">
        <a class="news-card-image" href="${escapeHtml(article.url)}" target="_blank" rel="noopener noreferrer" aria-label="Read ${escapeHtml(article.title)} on ${escapeHtml(article.source)}">
          ${imageMarkup(article)}
          <span class="news-card-category">${escapeHtml(article.category)}</span>
        </a>
        <div class="news-card-body">
          <div class="news-meta"><span>${escapeHtml(article.source)}</span><time datetime="${escapeHtml(article.publishedAt)}">${relativeTime(article.publishedAt)}</time></div>
          <h3><a href="${escapeHtml(article.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(article.title)}</a></h3>
          <p>${escapeHtml(article.description)}</p>
          <a class="news-read-link" href="${escapeHtml(article.url)}" target="_blank" rel="noopener noreferrer">Read full story <i class="bi bi-arrow-up-right"></i></a>
        </div>
      </article>
    </div>`;

  const featuredMarkup = (article) => `
    <article class="featured-news" data-aos="fade-up">
      <a class="featured-news-image" href="${escapeHtml(article.url)}" target="_blank" rel="noopener noreferrer">
        ${imageMarkup(article, true)}
      </a>
      <div class="featured-news-copy">
        <div class="d-flex flex-wrap gap-2 mb-3"><span class="feature-label">TOP STORY</span><span class="region-label">${escapeHtml(article.region)}</span></div>
        <div class="news-meta"><span>${escapeHtml(article.source)}</span><time datetime="${escapeHtml(article.publishedAt)}">${formatDate(article.publishedAt)}</time></div>
        <h2><a href="${escapeHtml(article.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(article.title)}</a></h2>
        <p>${escapeHtml(article.description)}</p>
        <a class="btn btn-danger px-4 py-3" href="${escapeHtml(article.url)}" target="_blank" rel="noopener noreferrer">Read original report <i class="bi bi-arrow-up-right ms-2"></i></a>
      </div>
    </article>`;

  const getFiltered = () => {
    const query = state.query.toLowerCase();
    const filtered = state.articles.filter((article) => {
      const matchesFilter = state.filter === 'All'
        || (state.filter === 'Africa' && article.region === 'Africa')
        || article.category === state.filter;
      const haystack = `${article.title} ${article.description} ${article.source} ${article.category} ${article.region}`.toLowerCase();
      return matchesFilter && (!query || haystack.includes(query));
    });
    return filtered.sort((a, b) => state.sort === 'trending'
      ? b.trendingScore - a.trendingScore
      : new Date(b.publishedAt) - new Date(a.publishedAt));
  };

  const render = () => {
    const articles = getFiltered();
    const featured = articles[0];
    const gridItems = articles.slice(1, state.visible + 1);

    elements.featured.innerHTML = featured ? featuredMarkup(featured) : '';
    elements.grid.innerHTML = gridItems.map(articleCard).join('');
    elements.count.textContent = `${articles.length} ${articles.length === 1 ? 'story' : 'stories'}`;
    elements.title.textContent = state.sort === 'trending' ? 'Trending technology news' : 'Latest technology news';
    elements.loadMore.classList.toggle('d-none', articles.length <= state.visible + 1);

    if (!articles.length) {
      elements.featured.innerHTML = '<div class="news-empty"><i class="bi bi-search"></i><h2>No matching stories</h2><p>Try another keyword or category.</p></div>';
    }
    if (window.AOS) setTimeout(() => window.AOS.refreshHard(), 50);
  };

  const loadNews = async () => {
    elements.loading.classList.remove('d-none');
    elements.error.classList.add('d-none');
    elements.results.classList.add('d-none');

    let payload;
    for (const endpoint of state.endpoints) {
      try {
        const response = await fetch(endpoint, { headers: { Accept: 'application/json' } });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        payload = await response.json();
        if (Array.isArray(payload.articles) && payload.articles.length) break;
      } catch (error) {
        console.warn(`News endpoint unavailable: ${endpoint}`, error.message);
      }
    }

    elements.loading.classList.add('d-none');
    if (!payload?.articles?.length) {
      elements.error.classList.remove('d-none');
      return;
    }

    state.articles = payload.articles;
    elements.updated.textContent = `Updated ${relativeTime(payload.updatedAt)}${payload.unavailableSources ? ` · ${payload.unavailableSources} source${payload.unavailableSources === 1 ? '' : 's'} delayed` : ''}`;
    elements.results.classList.remove('d-none');
    render();
  };

  document.addEventListener('DOMContentLoaded', () => {
    Object.assign(elements, {
      loading: document.querySelector('#news-loading'),
      error: document.querySelector('#news-error'),
      results: document.querySelector('#news-results'),
      featured: document.querySelector('#featured-news'),
      grid: document.querySelector('#news-grid'),
      count: document.querySelector('#news-count'),
      title: document.querySelector('#news-section-title'),
      loadMore: document.querySelector('#news-load-more'),
      updated: document.querySelector('#news-updated'),
      search: document.querySelector('#news-search')
    });

    let searchTimer;
    elements.search?.addEventListener('input', (event) => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        state.query = event.target.value.trim();
        state.visible = 9;
        render();
      }, 220);
    });

    document.querySelectorAll('.news-filter').forEach((button) => button.addEventListener('click', () => {
      state.filter = button.dataset.filter;
      state.visible = 9;
      document.querySelectorAll('.news-filter').forEach((item) => item.classList.toggle('active', item === button));
      render();
    }));

    document.querySelectorAll('.news-sort').forEach((button) => button.addEventListener('click', () => {
      state.sort = button.dataset.sort;
      state.visible = 9;
      document.querySelectorAll('.news-sort').forEach((item) => item.classList.toggle('active', item === button));
      render();
    }));

    elements.loadMore?.addEventListener('click', () => { state.visible += 9; render(); });
    document.querySelector('#news-retry')?.addEventListener('click', loadNews);
    loadNews();
  });
})();
