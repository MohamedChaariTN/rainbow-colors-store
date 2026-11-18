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

// Presentation-layer collections displayed by the public storefront.
// The catalogue records stay untouched: products outside these collections
// remain available in the complete products listing, without a public label.
const PUBLIC_CATEGORY_GROUPS = [
  {
    name: 'ÉTANCHÉITÉ',
    slug: 'etancheite',
    description: 'Protection durable contre l’humidité et les infiltrations.',
    color: '#06b6d4',
    image: 'images/categories/etancheite.jpg',
    imageAlt: 'Application d’une protection d’étanchéité sur une toiture',
    productSlugs: [
      'magma-durajir',
      'magma-durajir-etanche',
      'rainbow-colors-etanche-eco',
      'rainbow-colors-revetement-impermeabilisation-etanche'
    ]
  },
  {
    name: 'BOIS / WOOD',
    slug: 'bois-wood',
    description: 'Protection, finition et mise en valeur du bois.',
    color: '#f97316',
    image: 'images/categories/bois-wood.jpg',
    imageAlt: 'Application d’une finition protectrice sur une surface en bois',
    productSlugs: [
      'rainbow-colors-laque-interieure-exterieure-mat',
      'rainbow-colors-vernis-marin-polyvalent'
    ]
  },
  {
    name: 'ANTI-BRUIT',
    slug: 'anti-bruit',
    description: 'Confort acoustique et solutions d’isolation sonore.',
    color: '#8b5cf6',
    image: 'images/categories/anti-bruit.jpg',
    imageAlt: 'Ambiance intérieure illustrative pour la collection anti-bruit',
    productSlugs: []
  }
];

const PUBLIC_CATEGORY_BY_PRODUCT = new Map(
  PUBLIC_CATEGORY_GROUPS.flatMap((category) => (
    category.productSlugs.map((productSlug) => [productSlug, category])
  ))
);

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
      publicCategory: PUBLIC_CATEGORY_BY_PRODUCT.get(product.slug) || null,
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
    const publicCategory = PUBLIC_CATEGORY_GROUPS.find((category) => category.slug === categorySlug);
    products = publicCategory
      ? products.filter((product) => product.publicCategory?.slug === publicCategory.slug)
      : [];
  }
  if (searchTerm) {
    products = products.filter((product) => {
      const searchableText = [
        product.name,
        product.slug,
        product.description,
        product.publicCategory?.name,
        product.publicCategory?.slug,
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
  return PUBLIC_CATEGORY_GROUPS.map((category) => ({
    ...category,
    productSlugs: category.productSlugs.slice(),
    _count: {
      products: catalogue.products.filter(
        (product) => product.publicCategory?.slug === category.slug
      ).length
    }
  }));
}

function isUpcomingPublicCategory(categorySlug) {
  const publicCategory = PUBLIC_CATEGORY_GROUPS.find(
    (category) => category.slug === String(categorySlug || '').trim()
  );
  return Boolean(publicCategory && publicCategory.productSlugs.length === 0);
}

function renderUpcomingCollectionState() {
  return '<div class="collection-empty-state" role="status" style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--rc-gray-500)"><h3>Collection bientôt disponible</h3></div>';
}

function renderTechnicalSheetActions(product) {
  const name = rcEscapeHtml(product.name);
  const href = `documents/fiches-techniques/${encodeURIComponent(product.slug)}.pdf`;
  const downloadName = rcEscapeHtml(`fiche-technique-${product.slug}.pdf`);
  const noteId = `tech-sheet-note-${product.slug}`;

  return `
    <div class="tech-sheet-actions" data-tech-sheet="${rcEscapeHtml(product.slug)}">
      <a class="tech-sheet-download" href="${href}" download="${downloadName}" aria-label="Télécharger la fiche technique PDF de ${name}" aria-describedby="${noteId}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M12 3v12"></path><path d="m7 10 5 5 5-5"></path><path d="M5 21h14"></path>
        </svg>
        <span>Télécharger la fiche technique (PDF)</span>
      </a>
      <a class="tech-sheet-open" href="${href}" target="_blank" rel="noopener noreferrer" aria-label="Ouvrir le PDF de ${name} dans un nouvel onglet">
        <span>Ouvrir le PDF</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M14 3h7v7"></path><path d="M10 14 21 3"></path><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"></path>
        </svg>
      </a>
      <span class="tech-sheet-note" id="${noteId}">Fiche produit provisoire basée sur les informations disponibles — document non officiel.</span>
    </div>
  `;
}

function renderProductCard(product) {
  const name = rcEscapeHtml(product.name);
  const image = rcEscapeHtml(product.image || '');
  const categoryName = rcEscapeHtml(product.publicCategory?.name || '');
  const categoryMarkup = categoryName
    ? `<span class="product-category">${categoryName}</span>`
    : '';
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
        ${categoryMarkup}
        <h3 class="product-name"><a href="product.html?slug=${slug}">${name}</a></h3>
        ${descriptionMarkup}
        <a href="product.html?slug=${slug}" class="catalogue-details">Voir la fiche produit <span aria-hidden="true">→</span></a>
        ${renderTechnicalSheetActions(product)}
      </div>
    </article>
  `;
}

function renderCategoryCard(cat) {
  const count = cat._count?.products || 0;
  const name = rcEscapeHtml(cat.name);
  const image = rcEscapeHtml(cat.image || '');
  const imageAlt = rcEscapeHtml(cat.imageAlt || cat.name);
  const description = rcEscapeHtml(cat.description || '');
  const badge = count > 0 ? String(count).padStart(2, '0') : 'Bientôt';
  const mediaMarkup = image
    ? `<div class="category-media">
        <img src="${image}" alt="${imageAlt}" width="1200" height="800" loading="lazy" decoding="async" onerror="var media=this.closest('.category-media');this.remove();if(media)media.classList.add('category-media-placeholder')">
        <span class="category-media-overlay" aria-hidden="true"></span>
        <span class="category-number" aria-hidden="true">${badge}</span>
      </div>`
    : `<div class="category-media category-media-placeholder" aria-hidden="true">
        <span class="category-number">${badge}</span>
      </div>`;

  return `
    <a href="products.html?category=${encodeURIComponent(cat.slug)}" class="category-card premium-category-card" style="--category-color:${rcEscapeHtml(cat.color)}">
      ${mediaMarkup}
      <div class="category-card-body">
        <div class="category-eyebrow">RAINBOW COLORS</div>
        <h3>${name}</h3>
        ${description ? `<p>${description}</p>` : ''}
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
