'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Load shared components. Keep the case identical for Linux-based hosting.
  const loadComponent = async (selector, path) => {
    const container = document.querySelector(selector);
    if (!container) return;

    try {
      const response = await fetch(path);
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      container.innerHTML = await response.text();
    } catch (error) {
      console.error(`Could not load ${path}:`, error);
      container.innerHTML = '<div class="container py-3 text-center text-muted">Content unavailable.</div>';
    }
  };

  Promise.all([
    loadComponent('#navbar-container', 'Components/navbar.html'),
    loadComponent('#footer-container', 'Components/footer.html')
  ]).then(() => {
    const year = document.querySelector('#current-year');
    if (year) year.textContent = new Date().getFullYear();

    const currentPage = document.body.dataset.page || 'home';
    document.querySelectorAll('.nav-link').forEach((link) => {
      const linkedPage = link.dataset.pageLink;
      if (linkedPage && linkedPage === currentPage) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      }
    });
  });

  if (window.Typed && document.querySelector('#typed') && !reducedMotion) {
    new Typed('#typed', {
      strings: [
        'Built for tech enthusiasts.',
        'Made for creators.',
        'Helping Africa build.',
        'Explaining technology simply.'
      ],
      typeSpeed: 48,
      backSpeed: 24,
      backDelay: 1800,
      loop: true
    });
  } else if (document.querySelector('#typed')) {
    document.querySelector('#typed').textContent = 'Explaining technology simply.';
  }

  if (window.AOS) {
    document.querySelectorAll('.featured-card, .latest-card, .topic-pill, .metric-card, .article-card, .newsletter-copy, .email-card')
      .forEach((element, index) => {
        element.dataset.aos = index % 2 ? 'fade-up' : 'zoom-in-up';
        element.dataset.aosDelay = String(Math.min((index % 3) * 80, 160));
      });
    AOS.init({ duration: 650, once: true, offset: 70, disable: reducedMotion });
  }

  // Count-up metrics when visible.
  const counters = document.querySelectorAll('.counter');
  const statsSection = document.querySelector('.social-proof');
  let hasCounted = false;

  const runCounters = () => counters.forEach((counter) => {
    const target = Number(counter.dataset.target || 0);
    if (reducedMotion) {
      counter.textContent = target.toLocaleString();
      return;
    }
    const start = performance.now();
    const duration = 1700;
    const update = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      counter.textContent = Math.floor(target * eased).toLocaleString();
      if (progress < 1) requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  });

  if (statsSection && 'IntersectionObserver' in window) {
    new IntersectionObserver((entries, observer) => {
      if (entries[0].isIntersecting && !hasCounted) {
        hasCounted = true;
        runCounters();
        observer.disconnect();
      }
    }, { threshold: 0.35 }).observe(statsSection);
  } else if (counters.length) {
    runCounters();
  }

  // Newsletter form → Vercel Function → Brevo.
  const newsletterForm = document.querySelector('#newsletter-form');
  const newsletterStatus = document.querySelector('#newsletter-status');
  newsletterForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!newsletterForm.checkValidity()) { newsletterForm.reportValidity(); return; }

    const button = newsletterForm.querySelector('button[type="submit"]');
    const originalText = button?.textContent;
    if (button) { button.disabled = true; button.textContent = 'Subscribing…'; }
    newsletterStatus.textContent = '';

    try {
      const payload = Object.fromEntries(new FormData(newsletterForm).entries());
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Subscription failed.');
      newsletterStatus.textContent = result.message || 'You are subscribed. Welcome to Techmin!';
      newsletterStatus.className = 'form-status is-success';
      newsletterForm.reset();
    } catch (error) {
      newsletterStatus.textContent = error.message || 'Unable to subscribe right now.';
      newsletterStatus.className = 'form-status is-error';
    } finally {
      if (button) { button.disabled = false; button.textContent = originalText; }
    }
  });

  // NOTE: Article filtering and pagination for articles.html now lives in an
  // inline <script> right after the article grid in that file. That way it
  // runs immediately as the browser parses the page, instead of waiting for
  // this file to load (which itself waits behind the Bootstrap/Typed.js CDN
  // scripts above it) — see articles.html for details.

  // Close mobile menu after clicking a navigation link.
  document.addEventListener('click', (event) => {
    const link = event.target.closest('.navbar-collapse .nav-link');
    const menu = document.querySelector('.navbar-collapse.show');
    if (link && menu && window.bootstrap) bootstrap.Collapse.getOrCreateInstance(menu).hide();
  });
});

// Shared interactions for completed inner pages.
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.tip-toggle').forEach((button) => {
    button.addEventListener('click', () => {
      const detail = button.nextElementSibling;
      const open = detail?.classList.toggle('open');
      button.innerHTML = `${open ? 'Hide' : 'Show'} tip <i class="bi bi-chevron-${open ? 'up' : 'down'}"></i>`;
    });
  });

  document.querySelectorAll('[data-href]').forEach((card) => {
    const go = () => { window.location.href = card.dataset.href; };
    card.addEventListener('click', go);
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); go(); }
    });
  });

  document.querySelectorAll('form[data-form-type="contact"]').forEach((form) => {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const status = form.querySelector('.form-status');
      if (!form.checkValidity()) { form.reportValidity(); return; }

      const button = form.querySelector('button[type="submit"]');
      const originalText = button?.textContent;
      if (button) { button.disabled = true; button.textContent = 'Sending…'; }
      if (status) status.textContent = '';

      try {
        const payload = Object.fromEntries(new FormData(form).entries());
        const response = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(payload)
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Message could not be sent.');
        if (status) {
          status.textContent = result.message || 'Your message has been sent.';
          status.className = 'form-status is-success';
        }
        form.reset();
      } catch (error) {
        if (status) {
          status.textContent = error.message || 'Unable to send your message right now.';
          status.className = 'form-status is-error';
        }
      } finally {
        if (button) { button.disabled = false; button.textContent = originalText; }
      }
    });
  });

  document.querySelector('.copy-link')?.addEventListener('click', async (event) => {
    try {
      await navigator.clipboard.writeText(location.href);
      event.currentTarget.innerHTML = '<i class="bi bi-check2"></i>';
    } catch { /* Clipboard may be unavailable on local files. */ }
  });
});
