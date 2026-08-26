const fs = require('fs');
const path = require('path');
const ARTICLES = require('../articles-data.js');

const NAVBAR = fs.readFileSync(path.join(__dirname, '..', 'Components', 'navbar.html'), 'utf8');
const FOOTER = fs.readFileSync(path.join(__dirname, '..', 'Components', 'footer.html'), 'utf8');

// Minimal HTML-escaping for values we inject into attributes/text nodes.
function escapeHTML(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderNotFound(res) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <title>Article not found — Techmin</title>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.7/dist/css/bootstrap.min.css" rel="stylesheet">
  <link rel="stylesheet" href="/style.css">
</head>
<body data-page="article">
  <div id="navbar-container">${NAVBAR}</div>
  <main>
    <div class="container narrow" style="padding:120px 0;text-align:center;">
      <h1 style="font-size:40px;color:var(--primary);">Article not found</h1>
      <p class="text-muted">We couldn't find that one — it may have moved.</p>
      <a href="/articles" class="btn btn-primary mt-3">Browse all articles</a>
    </div>
  </main>
  <div id="footer-container">${FOOTER}</div>
</body>
</html>`;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(404).send(html);
}

module.exports = async function handler(req, res) {
  const slug = (req.query && req.query.slug) || '';
  const article = ARTICLES.find((a) => a.slug === slug);

  if (!article) {
    return renderNotFound(res);
  }

  const canonicalUrl = `https://www.techminhq.com/article?slug=${encodeURIComponent(article.slug)}`;

  const byNewest = (a, b) => new Date(b.date) - new Date(a.date);
  const others = ARTICLES.filter((a) => a.slug !== article.slug);
  const sameCategory = others.filter((a) => a.category === article.category).sort(byNewest);
  const rest = others.filter((a) => a.category !== article.category).sort(byNewest);
  const readNext = [...sameCategory, ...rest].slice(0, 3);

  const readNextHTML = readNext.length
    ? `
        <div class="read-next">
          <h3>Read next</h3>
          <div class="row g-4">
            ${readNext
              .map(
                (a) => `
              <div class="col-md-4">
                <a class="read-next-card" href="/article?slug=${encodeURIComponent(a.slug)}">
                  <span class="category-pill">${escapeHTML(a.categoryLabel)}</span>
                  <h4>${escapeHTML(a.title)}</h4>
                  <small>${escapeHTML(a.readTime)}</small>
                </a>
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      `
    : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <title>${escapeHTML(article.title)} — Techmin</title>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#A0103C">
  <meta name="description" content="${escapeHTML(article.dek)}">
  <link rel="canonical" href="${canonicalUrl}">

  <meta property="og:type" content="article">
  <meta property="og:title" content="${escapeHTML(article.title)}">
  <meta property="og:description" content="${escapeHTML(article.dek)}">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:image" content="https://www.techminhq.com/${escapeHTML(article.image)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHTML(article.title)}">
  <meta name="twitter:description" content="${escapeHTML(article.dek)}">
  <meta name="twitter:image" content="https://www.techminhq.com/${escapeHTML(article.image)}">

  <link rel="shortcut icon" href="/Img/TechminIcon.png" type="image/x-icon">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.7/dist/css/bootstrap.min.css" rel="stylesheet">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,200..800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.13.1/font/bootstrap-icons.min.css">
  <link href="https://unpkg.com/aos@2.3.4/dist/aos.css" rel="stylesheet">
  <link rel="stylesheet" href="/style.css">
  <style>
    .prose code { background: #f0faff; color: var(--other); padding: 2px 8px; border-radius: 6px; font-size: .9em; }
  </style>
</head>
<body data-page="article">
  <div id="navbar-container">${NAVBAR}</div>
  <main>
    <div id="article-root">
      <header class="article-detail-hero">
        <div class="container narrow">
          <span class="category-pill">${escapeHTML(article.categoryLabel)}</span>
          <h1>${escapeHTML(article.title)}</h1>
          <p>${escapeHTML(article.dek)}</p>
          <div class="article-author">
            <div class="author-avatar">${escapeHTML(article.authorInitials)}</div>
            <span><b>${escapeHTML(article.author)} · ${escapeHTML(article.readTime)}</b></span>
          </div>
        </div>
      </header>
      <section class="article-reading">
        <div class="container narrow">
          <img class="article-cover" src="/${article.image}" alt="${escapeHTML(article.title)}">
          <div class="prose">${article.bodyHTML}</div>
          <div class="article-share">
            <b>Share this article</b>
            <div>
              <button aria-label="Share on LinkedIn"><i class="bi bi-linkedin"></i></button>
              <button aria-label="Share on X"><i class="bi bi-twitter-x"></i></button>
              <button class="copy-link" aria-label="Copy article link"><i class="bi bi-link-45deg"></i></button>
            </div>
          </div>
          ${readNextHTML}
        </div>
      </section>
    </div>
  </main>
  <div id="footer-container">${FOOTER}</div>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.7/dist/js/bootstrap.bundle.min.js"></script>
  <script src="https://unpkg.com/typed.js@2.1.0/dist/typed.umd.js"></script>
  <script src="https://unpkg.com/aos@2.3.4/dist/aos.js"></script>
  <script src="/script.js"></script>
  <script>
    // Content is already server-rendered above — this just re-binds the
    // share/copy-link button, same as the old client-rendered version did.
    document.querySelector('#article-root .copy-link')?.addEventListener('click', async (event) => {
      try {
        await navigator.clipboard.writeText(location.href);
        event.currentTarget.innerHTML = '<i class="bi bi-check2"></i>';
      } catch (_) { /* Clipboard may be unavailable on local files. */ }
    });
  </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
  res.status(200).send(html);
};
