// ===== RAINBOW COLORS PUBLIC CATALOGUE =====
// Use same-origin /api by default, while allowing the storefront to target
// another API through window.RAINBOW_COLORS_API_URL.
const API_URL = (
  window.RAINBOW_COLORS_API_URL ||
  (window.location.origin + '/api')
).replace(/\/$/, '');
const API_TIMEOUT_MS = 40000;
const API_MAX_ATTEMPTS = 3;
const API_RETRYABLE_STATUS = new Set([502, 503, 504]);
const API_RETRYABLE_METHODS = new Set(['GET', 'HEAD']);

// Public read-only catalogue: no customer account, cart, wishlist, checkout or order workflow.
// Clear only the legacy customer session. The independent admin session
// (rc_admin_token) must remain available to the admin interface.
try {
  localStorage.removeItem('rc_token');
  sessionStorage.removeItem('rc_token');
} catch (_) {}

function apiDelay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableApiError(error) {
  if (!error) return false;
  if (error.retryable) return true;
  if (error.name === 'AbortError') return true;
  return error instanceof TypeError || /ECONNRESET|network|fetch|socket|connection/i.test(String(error.message || ''));
}

function friendlyApiError(error) {
  if (error && error.name === 'AbortError') {
    error.message = 'Le serveur met trop de temps à répondre. Veuillez réessayer.';
  } else if (error instanceof TypeError) {
    error.message = 'Connexion interrompue. Vérifiez votre connexion et réessayez.';
  }
  return error;
}

async function api(endpoint, options = {}) {
  const method = String(options.method || 'GET').toUpperCase();
  // Never retry POST/PATCH/DELETE: a retried order or payment could be duplicated.
  const canRetry = API_RETRYABLE_METHODS.has(method);
  const maxAttempts = canRetry ? API_MAX_ATTEMPTS : 1;
  const url = API_URL + endpoint;
  const opts = {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  };
  if (opts.body && typeof opts.body === 'object' && !(opts.body instanceof FormData)) {
    opts.body = JSON.stringify(opts.body);
  }

  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
    try {
      const res = await fetch(url, { ...opts, signal: opts.signal || controller.signal });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const error = new Error(data.error || 'Request failed');
        error.status = res.status;
        error.retryable = API_RETRYABLE_STATUS.has(res.status);
        throw error;
      }
      return data;
    } catch (error) {
      lastError = friendlyApiError(error);
      const shouldRetry = canRetry && attempt < maxAttempts && isRetryableApiError(error);
      if (!shouldRetry) throw lastError;
      // Bounded exponential backoff: 400 ms, then 800 ms.
      await apiDelay(400 * (2 ** (attempt - 1)));
    } finally {
      clearTimeout(timeoutId);
    }
  }
  throw lastError;
}

// Defensive no-op compatibility for any stale template or browser cache.
async function addToCart() { return false; }
async function loadCart() {
  document.querySelectorAll('.cart-count, .cart-button, .cart-link, [data-cart]').forEach(el => el.remove());
  return { items: [] };
}
async function toggleWishlist() { return false; }

// Mobile navigation
let mobileMenuTrigger = null;
function toggleMobileMenu(forceOpen) {
  const menu = document.querySelector('.mobile-menu');
  const overlay = document.querySelector('.mobile-menu-overlay');
  const isOpen = typeof forceOpen === 'boolean'
    ? forceOpen
    : !document.body.classList.contains('mobile-menu-open');

  if (isOpen && !document.body.classList.contains('mobile-menu-open')) {
    mobileMenuTrigger = document.activeElement;
  }

  document.body.classList.toggle('mobile-menu-open', isOpen);
  menu?.classList.toggle('open', isOpen);
  overlay?.classList.toggle('open', isOpen);
  menu?.setAttribute('aria-hidden', String(!isOpen));
  document.querySelectorAll('.mobile-menu-btn').forEach((button) => {
    button.setAttribute('aria-expanded', String(isOpen));
    if (menu) button.setAttribute('aria-controls', menu.id || 'rcMobileMenu');
  });

  if (menu) {
    if (!menu.id) menu.id = 'rcMobileMenu';
    if ('inert' in menu) menu.inert = !isOpen;
  }

  if (isOpen) {
    window.setTimeout(() => {
      menu?.querySelector('button, a')?.focus({ preventScroll: true });
    }, 80);
  } else {
    mobileMenuTrigger?.focus?.({ preventScroll: true });
    mobileMenuTrigger = null;
  }
}

// ===== PRODUCTS =====
// The public catalogue is a static JSON file deployed with the storefront.
// It intentionally contains no prices, stock quantities, account or admin data.
const CATALOGUE_URL = 'data/catalogue.json';
let cataloguePromise = null;

function rcEscapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[character]));
}

function rcNormalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function prepareCatalogue(data) {
  if (!data || !Array.isArray(data.categories) || !Array.isArray(data.products)) {
    throw new Error('Catalogue public invalide.');
  }

  const categories = data.categories.map((category) => ({ ...category }));
  const categoriesBySlug = new Map(categories.map((category) => [category.slug, category]));

  const products = data.products.map((product) => {
    const category = categoriesBySlug.get(product.category) || null;
    if (!product.slug || !product.name || !category) {
      throw new Error('Produit ou catégorie invalide dans le catalogue public.');
    }
    return {
      ...product,
      category,
      features: Array.isArray(product.features) ? product.features.slice() : []
    };
  });

  return { ...data, categories, products };
}

async function loadCatalogue() {
  if (!cataloguePromise) {
    cataloguePromise = fetch(CATALOGUE_URL, { cache: 'no-cache', credentials: 'same-origin' })
      .then((response) => {
        if (!response.ok) throw new Error('Impossible de charger le catalogue.');
        return response.json();
      })
      .then(prepareCatalogue)
      .catch((error) => {
        cataloguePromise = null;
        throw error;
      });
  }
  return cataloguePromise;
}

async function fetchProducts(params = {}) {
  const catalogue = await loadCatalogue();
  const categorySlug = String(params.category || '').trim();
  const searchTerm = rcNormalizeText(params.search);

  let products = catalogue.products;
  if (categorySlug) {
    products = products.filter((product) => product.category.slug === categorySlug);
  }
  if (searchTerm) {
    products = products.filter((product) => {
      const searchableText = [
        product.name,
        product.slug,
        product.description,
        product.category.name,
        product.category.slug,
        ...(product.features || [])
      ].join(' ');
      return rcNormalizeText(searchableText).includes(searchTerm);
    });
  }

  const total = products.length;
  const page = Math.max(1, Number.parseInt(params.page, 10) || 1);
  const requestedLimit = Number.parseInt(params.limit, 10);
  const limit = Number.isFinite(requestedLimit) && requestedLimit > 0 ? requestedLimit : Math.max(total, 1);
  const start = (page - 1) * limit;

  return {
    products: products.slice(start, start + limit),
    total,
    page,
    pages: Math.ceil(total / limit),
    limit
  };
}

async function fetchProduct(slug) {
  const catalogue = await loadCatalogue();
  const product = catalogue.products.find((item) => item.slug === slug);
  if (!product) {
    const error = new Error('Produit introuvable.');
    error.status = 404;
    throw error;
  }
  return product;
}

async function fetchCategories() {
  const catalogue = await loadCatalogue();
  return catalogue.categories
    .map((category) => ({
      ...category,
      _count: {
        products: catalogue.products.filter((product) => product.category.slug === category.slug).length
      }
    }))
    .filter((category) => category._count.products > 0);
}

function renderProductCard(product) {
  const name = rcEscapeHtml(product.name);
  const image = rcEscapeHtml(product.image || '');
  const categoryName = rcEscapeHtml(product.category?.name || '');
  const description = rcEscapeHtml(product.description || '');
  const descriptionMarkup = description ? `<p class="product-desc">${description}</p>` : '';
  const slug = encodeURIComponent(product.slug);
  const imageMarkup = image
    ? `<img src="${image}" alt="${name}" loading="lazy" onerror="var container=this.parentElement;this.remove();if(container)container.classList.add('product-image-missing')">`
    : '';

  return `
    <article class="product-card catalogue-product-card">
      <a class="catalogue-product-link" href="product.html?slug=${slug}" aria-label="Voir ${name}">
        <div class="product-image${image ? '' : ' product-image-missing'}">
          ${imageMarkup}
          <span class="product-image-fallback" aria-hidden="true">${name}</span>
        </div>
      </a>
      <div class="product-info">
        <span class="product-category">${categoryName}</span>
        <h3 class="product-name"><a href="product.html?slug=${slug}">${name}</a></h3>
        ${descriptionMarkup}
        <a href="product.html?slug=${slug}" class="catalogue-details">Voir la fiche produit <span aria-hidden="true">→</span></a>
      </div>
    </article>
  `;
}

const CATEGORY_VISUALS = {
  "peintures-sols": { title: "Solutions pour Sols", desc: "Revêtements résistants pour sols, ateliers et espaces professionnels." },
  "peintures-bois": { title: "Finitions Bois", desc: "Laques et peintures pour sublimer et protéger vos surfaces en bois." },
  "enduits": { title: "Préparation & Enduits", desc: "Enduits et solutions de préparation pour une surface prête à la finition." },
  "enduits-traditionnels": { title: "Enduits Traditionnels", desc: "Des finitions authentiques inspirées des techniques traditionnelles." },
  "vernis": { title: "Vernis & Protection", desc: "Protection et finition durable pour des surfaces soignées." },
  "traitements-metal": { title: "Protection Métal", desc: "Solutions anticorrosion et traitements pour métaux et structures." },
  "etancheite": { title: "Étanchéité & Protection", desc: "Solutions professionnelles contre l'humidité et les infiltrations." },
  "enduits-finition": { title: "Finition & Lissage", desc: "Préparez vos murs pour obtenir une finition régulière et élégante." },
  "colles": { title: "Colles & Pose", desc: "Colles et solutions fiables pour vos travaux de pose et de rénovation." },
  "enduits-facade": { title: "Façades & Extérieur", desc: "Solutions de finition et de protection pour façades durables." },
  "peintures-murales": { title: "Peintures Murales", desc: "Des peintures pour transformer vos murs avec une finition professionnelle." },
  "resines": { title: "Résines", desc: "" },
  "diluants": { title: "Diluants", desc: "" },
  "peintures-toitures": { title: "Peintures Toitures", desc: "" }
};

function renderCategoryCard(cat) {
  const count = cat._count?.products || 0;
  const visual = CATEGORY_VISUALS[cat.slug] || {
    title: cat.name,
    desc: cat.description || ""
  };
  const descMarkup = visual.desc ? `<p>${rcEscapeHtml(visual.desc)}</p>` : '';

  return `
    <a href="products.html?category=${encodeURIComponent(cat.slug)}" class="category-card premium-category-card" style="--category-color:${rcEscapeHtml(cat.color)}">
      <div class="category-media category-media-placeholder" aria-hidden="true">
        <span class="category-number">${String(count).padStart(2, '0')}</span>
      </div>
      <div class="category-card-body">
        <div class="category-eyebrow">RAINBOW COLORS</div>
        <h3>${rcEscapeHtml(visual.title)}</h3>
        ${descMarkup}
        <span class="category-cta">Découvrir la collection <span aria-hidden="true">→</span></span>
      </div>
    </a>
  `;
}

// ===== TOAST =====
function showToast(message, type = 'success') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = 'toast ' + type;
  toast.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  // Public storefront initializes as a read-only product catalogue.
});


/* ===== RAINBOW COLORS PREMIUM MOTION ENGINE ===== */
(function initRainbowPremiumMotion() {
  if (window.__rcPremiumMotionReady) return;
  window.__rcPremiumMotionReady = true;

  const root = document.documentElement;
  const motionQuery = typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null;
  let reducedMotion = !!(motionQuery && motionQuery.matches);
  const revealSelector = [
    '.section-header > *',
    '.category-card',
    '.product-card',
    '.promo-card',
    '.feature-item',
    '.review-card',
    '.contact-info-card',
    '.search-wrapper',
    '.about-story-grid > *',
    '.footer-grid > *',
    '[data-rc-reveal]'
  ].join(',');
  const prepared = new WeakSet();
  let revealObserver = null;

  function revealNow(element) {
    if (element && element.classList) element.classList.add('rc-visible');
  }

  function revealAll() {
    document.querySelectorAll(revealSelector + ', .rc-reveal').forEach(revealNow);
  }

  function startPageEntrance() {
    root.classList.add('rc-page-ready');
  }

  function installLoader() {
    if (reducedMotion) {
      startPageEntrance();
      return;
    }

    let loader = null;
    try {
      const logoSrc = 'images/rainbow-colors-logo-header.svg';
      loader = document.createElement('div');
      loader.id = 'rcPageLoader';
      loader.setAttribute('aria-hidden', 'true');
      loader.innerHTML = `
        <div class="rc-loader-inner">
          <div class="rc-loader-logo"><img src="${logoSrc}" alt=""></div>
          <div class="rc-loader-title">Rainbow Colors</div>
          <div class="rc-loader-subtitle">PEINTURES &amp; REVÊTEMENTS</div>
          <div class="rc-loader-bar"><span></span></div>
        </div>
      `;
      document.body.prepend(loader);
    } catch (error) {
      startPageEntrance();
      return;
    }

    let finished = false;
    let fallbackTimer = 0;
    const finishLoading = () => {
      if (finished) return;
      finished = true;
      window.clearTimeout(fallbackTimer);
      window.setTimeout(() => loader.classList.add('is-hidden'), 120);
      window.setTimeout(() => {
        loader.remove();
        startPageEntrance();
      }, 900);
    };

    // Never let a slow image or iframe keep the whole storefront covered.
    fallbackTimer = window.setTimeout(finishLoading, 3500);
    if (document.readyState === 'complete') {
      finishLoading();
    } else {
      window.addEventListener('load', finishLoading, { once: true });
    }
  }

  function installReveals() {
    if (!reducedMotion && 'IntersectionObserver' in window) {
      try {
        revealObserver = new IntersectionObserver((entries, observer) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            revealNow(entry.target);
            observer.unobserve(entry.target);
          });
        }, {
          threshold: 0.08,
          rootMargin: '0px 0px -36px 0px'
        });
      } catch (error) {
        revealObserver = null;
      }
    }

    const prepare = (element) => {
      if (!(element instanceof Element) || !element.matches(revealSelector) || prepared.has(element)) return;
      prepared.add(element);
      if (element.classList.contains('rc-visible')) return;

      if (reducedMotion || !revealObserver) {
        revealNow(element);
        return;
      }

      try {
        element.classList.add('rc-reveal');
        const parent = element.parentElement;
        let index = 0;
        if (parent) {
          const siblings = Array.from(parent.children).filter(
            (child) => child.matches && child.matches(revealSelector)
          );
          index = Math.max(0, siblings.indexOf(element));
        }
        element.style.setProperty('--rc-delay', `${Math.min(index, 8) * 60}ms`);
        revealObserver.observe(element);
      } catch (error) {
        revealNow(element);
      }
    };

    const scan = (node) => {
      if (!node || node.nodeType !== 1) return;
      if (node.matches(revealSelector)) prepare(node);
      node.querySelectorAll(revealSelector).forEach(prepare);
    };

    scan(document.body);

    if ('MutationObserver' in window) {
      const mutationObserver = new MutationObserver((records) => {
        records.forEach((record) => {
          record.addedNodes.forEach((node) => {
            if (node.nodeType === 1) scan(node);
          });
        });
      });
      mutationObserver.observe(document.body, { childList: true, subtree: true });
    }

    window.rcRefreshMotion = () => scan(document.body);
  }

  function installMobileMenuAccessibility() {
    const menu = document.querySelector('.mobile-menu');
    const overlay = document.querySelector('.mobile-menu-overlay');
    if (!menu) return;
    if (!menu.id) menu.id = 'rcMobileMenu';
    menu.setAttribute('aria-hidden', 'true');
    if ('inert' in menu) menu.inert = true;

    document.querySelectorAll('.mobile-menu-btn').forEach((button) => {
      button.setAttribute('aria-expanded', 'false');
      button.setAttribute('aria-controls', menu.id);
      if (!button.getAttribute('aria-label')) button.setAttribute('aria-label', 'Ouvrir le menu');
    });
    menu.querySelectorAll('button').forEach((button) => {
      if (!button.getAttribute('aria-label')) button.setAttribute('aria-label', 'Fermer le menu');
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && document.body.classList.contains('mobile-menu-open')) {
        toggleMobileMenu(false);
      }
    });
    if (overlay) overlay.setAttribute('aria-hidden', 'true');
  }

  function installProductDetailMotion() {
    window.rcAnimateProductDetails = function () {
      const grid = document.querySelector('.pd-grid');
      if (!grid || reducedMotion) return;
      grid.classList.remove('rc-detail-enter');
      void grid.offsetWidth;
      grid.classList.add('rc-detail-enter');
    };
  }

  function installPageRestore() {
    window.addEventListener('pageshow', (event) => {
      if (!event.persisted) return;
      // Restored bfcache documents must never stay in a transitional state.
      root.classList.remove('rc-page-exit');
      root.classList.add('rc-page-ready');
      revealAll();
    });
  }

  function watchMotionPreference() {
    if (!motionQuery) return;
    const handleChange = (event) => {
      reducedMotion = event.matches;
      if (reducedMotion) {
        root.classList.remove('rc-motion-ready');
        revealAll();
        startPageEntrance();
      } else {
        root.classList.add('rc-motion-ready');
      }
    };
    if (motionQuery.addEventListener) motionQuery.addEventListener('change', handleChange);
    else if (motionQuery.addListener) motionQuery.addListener(handleChange);
  }

  function start() {
    try {
      installReveals();
      // CSS only hides reveal targets after this flag is set by working JS.
      root.classList.add('rc-motion-ready');
    } catch (error) {
      root.classList.remove('rc-motion-ready');
      revealAll();
    }

    try { installLoader(); } catch (error) { startPageEntrance(); }
    installMobileMenuAccessibility();
    installProductDetailMotion();
    installPageRestore();
    watchMotionPreference();
  }

  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
