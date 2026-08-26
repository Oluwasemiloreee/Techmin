'use strict';

// Populates the Featured + Latest sections on index.html straight from
// articles-data.js, so publishing a new article (adding one object to the
// bottom of that file) is enough — no more manually editing index.html.
document.addEventListener('DOMContentLoaded', () => {
  const featuredRoot = document.querySelector('#featured-root');
  const latestRoot = document.querySelector('#latest-root');
  if (!featuredRoot || !latestRoot) return; // Not on the homepage.

  const ARTICLES = window.ARTICLES || [];
  if (!ARTICLES.length) return;

  // Sort by the real "date" field on each article (now active in
  // articles-data.js) rather than guessing from array position.
  const newestFirst = [...ARTICLES].sort((a, b) => new Date(b.date) - new Date(a.date));
  const featured = newestFirst[0];
  const latestThree = newestFirst.slice(1, 4);

  const escapeHTML = (str = '') =>
    String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  featuredRoot.innerHTML = `
    <div class="featured-card row align-items-center g-4">
      <div class="col-lg-6">
        <div class="featured-image">
          <img src="${escapeHTML(featured.image)}" alt="${escapeHTML(featured.title)}">
        </div>
      </div>
      <div class="col-lg-6">
        <p class="article-category">${escapeHTML(featured.categoryLabel)}</p>
        <h2 class="featured-title">${escapeHTML(featured.title)}</h2>
        <p class="featured-text">${escapeHTML(featured.dek)}</p>
        <div class="featured-meta d-flex align-items-center justify-content-between flex-wrap gap-3">
          <div class="author d-flex align-items-center gap-3">
            <div class="author-avatar">${escapeHTML(featured.authorInitials)}</div>
            <div>
              <h6 class="mb-0">${escapeHTML(featured.author)}</h6>
              <small>${escapeHTML(featured.readTime)}</small>
            </div>
          </div>
          <a href="article.html?slug=${encodeURIComponent(featured.slug)}" class="read-link">
            Read article <i class="bi bi-arrow-right"></i>
          </a>
        </div>
      </div>
    </div>
  `;

  latestRoot.innerHTML = latestThree
    .map(
      (article) => `
    <div class="col-lg-4">
      <article class="latest-card" data-href="article.html?slug=${encodeURIComponent(article.slug)}" tabindex="0" data-aos="fade-up">
        <span class="category-pill">${escapeHTML(article.categoryLabel)}</span>
        <h3>${escapeHTML(article.title)}</h3>
        <p>${escapeHTML(article.dek)}</p>
        <div class="article-meta">
          <span class="avatar-sm">${escapeHTML(article.authorInitials)}</span>
          <span>${escapeHTML(article.author)}</span>
          <span>•</span>
          <span>${escapeHTML(article.readTime.toUpperCase())}</span>
        </div>
      </article>
    </div>
  `
    )
    .join('');

  // script.js (loaded before this file) already ran its own DOMContentLoaded
  // handlers — including the [data-href] click binding and the AOS attribute
  // pass — before these cards existed. Re-do just that part for them here.
  latestRoot.querySelectorAll('[data-href]').forEach((card) => {
    const go = () => {
      window.location.href = card.dataset.href;
    };
    card.addEventListener('click', go);
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        go();
      }
    });
  });

  if (window.AOS) AOS.refreshHard();
});
