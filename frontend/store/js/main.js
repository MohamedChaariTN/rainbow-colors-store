// ===== RAINBOW COLORS PUBLIC CATALOGUE =====
const API_URL = (window.RAINBOW_COLORS_API_URL || (window.location.origin + '/api')).replace(/\/$/, '');

// Public read-only catalogue: no customer account, cart, wishlist, checkout or order workflow.
// Clear any legacy customer session left in this browser.
try {
  localStorage.removeItem('rc_token');
  sessionStorage.removeItem('rc_token');
} catch (_) {}

async function api(endpoint, options = {}) {
  const url = API_URL + endpoint;
  const opts = {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  };
  if (opts.body && typeof opts.body === 'object' && !(opts.body instanceof FormData)) {
    opts.body = JSON.stringify(opts.body);
  }
  const res = await fetch(url, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// Defensive no-op compatibility for any stale template or browser cache.
async function addToCart() { return false; }
async function loadCart() {
  document.querySelectorAll('.cart-count, .cart-button, .cart-link, [data-cart]').forEach(el => el.remove());
  return { items: [] };
}
async function toggleWishlist() { return false; }

// Mobile navigation
function toggleMobileMenu() {
  document.body.classList.toggle('mobile-menu-open');
  document.querySelector('.mobile-menu')?.classList.toggle('open');
  document.querySelector('.mobile-menu-overlay')?.classList.toggle('open');
}

// ===== PRODUCTS =====
async function fetchProducts(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const data = await api('/products?' + qs);
  return data;
}

async function fetchProduct(slug) {
  return api('/products/' + slug);
}

async function fetchCategories() {
  return api('/products/categories');
}

function renderProductCard(product) {
  const badgeClass = product.badge === 'new' ? 'badge-new' : product.badge === 'eco' ? 'badge-eco' : 'badge-premium';
  const badgeText = product.badge === 'new' ? 'Nouveau' : product.badge === 'eco' ? 'Éco' : 'Rainbow Colors';

  return `
    <article class="product-card animate-fadeInUp catalogue-product-card">
      <a class="catalogue-product-link" href="product.html?slug=${encodeURIComponent(product.slug)}" aria-label="Voir ${product.name}">
        <div class="product-image">
          <img src="${product.image}" alt="${product.name}" loading="lazy" onerror="this.src='images/logo ranbow colors.jpeg'">
          ${product.badge && product.badge !== 'sale' ? `<span class="product-badge ${badgeClass}">${badgeText}</span>` : ''}
        </div>
      </a>
      <div class="product-info">
        <span class="product-category">${product.category?.name || product.category || ''}</span>
        <h3 class="product-name"><a href="product.html?slug=${encodeURIComponent(product.slug)}">${product.name}</a></h3>
        <p class="product-desc">${product.description || ''}</p>
        <a href="product.html?slug=${encodeURIComponent(product.slug)}" class="catalogue-details">Voir la fiche produit <span aria-hidden="true">→</span></a>
      </div>
    </article>
  `;
}

const CATEGORY_VISUALS = {
    "peintures-sols": { title: "Solutions pour Sols", desc: "Revêtements résistants pour sols, ateliers et espaces professionnels.", image: "images/produit 3.jpg" },
    "peintures-bois": { title: "Finitions Bois", desc: "Laques et peintures pour sublimer et protéger vos surfaces en bois.", image: "images/batou.jpg" },
    "enduits": { title: "Préparation & Enduits", desc: "Enduits et solutions de préparation pour une surface prête à la finition.", image: "images/megma 1.jpg" },
    "enduits-traditionnels": { title: "Enduits Traditionnels", desc: "Des finitions authentiques inspirées des techniques traditionnelles.", image: "images/megma 2.jpg" },
    "vernis": { title: "Vernis & Protection", desc: "Protection et finition durable pour des surfaces soignées.", image: "images/produit 4.jpg" },
    "traitements-metal": { title: "Protection Métal", desc: "Solutions anticorrosion et traitements pour métaux et structures.", image: "images/produit 5.jpg" },
    "etancheite": { title: "Étanchéité & Protection", desc: "Solutions professionnelles contre l'humidité et les infiltrations.", image: "images/megma 3.jpg" },
    "enduits-finition": { title: "Finition & Lissage", desc: "Préparez vos murs pour obtenir une finition régulière et élégante.", image: "images/megma 4.jpg" },
    "colles": { title: "Colles & Pose", desc: "Colles et solutions fiables pour vos travaux de pose et de rénovation.", image: "images/produit 6.jpg" },
    "enduits-facade": { title: "Façades & Extérieur", desc: "Solutions de finition et de protection pour façades durables.", image: "images/megma 5.jpg" },
    "peintures-murales": { title: "Peintures Murales", desc: "Des peintures pour transformer vos murs avec une finition professionnelle.", image: "images/djur 1.jpg" }
};

function renderCategoryCard(cat) {
  const count = cat._count?.products || 0;
  const visual = CATEGORY_VISUALS[cat.slug] || {
    title: cat.name,
    desc: cat.description || "Solutions professionnelles Rainbow Colors.",
    image: "images/rainbow-colors-social-preview.jpg"
  };

  return `
    <a href="products.html?category=${cat.slug}" class="category-card premium-category-card animate-fadeInUp" style="--category-color:${cat.color}">
      <div class="category-media">
        <img src="${visual.image}" alt="${visual.title}" loading="lazy" onerror="this.src='images/rainbow-colors-social-preview.jpg'">
        <div class="category-media-overlay"></div>
        <span class="category-number">${String(count).padStart(2, '0')}</span>
      </div>
      <div class="category-card-body">
        <div class="category-eyebrow">RAINBOW COLORS</div>
        <h3>${visual.title}</h3>
        <p>${visual.desc}</p>
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


/* ===== RAINBOW COLORS MOTION ENGINE ===== */
(function initRainbowMotion() {
  try {
    const logoSrc = '/images/rainbow-colors-app-icon.jpg';

    const loader = document.createElement('div');
    loader.id = 'rcPageLoader';
    loader.innerHTML = `
      <div class="rc-loader-inner">
        <div class="rc-loader-logo"><img src="${logoSrc}" alt="Rainbow Colors"></div>
        <div class="rc-loader-title">Rainbow Colors</div>
        <div class="rc-loader-subtitle">PEINTURES &amp; REVÊTEMENTS</div>
        <div class="rc-loader-bar"><span></span></div>
      </div>
    `;
    document.body.prepend(loader);

    const revealTargets = [
      '.section-header',
      '.category-card',
      '.product-card',
      '.promo-card',
      '.feature-item',
      '.review-card',
      '.contact-info-card',
      '.app-download-copy',
      '.app-device-showcase',
      '.checkout-form',
      '.cart-summary',
      '.account-sidebar',
      '.account-content',
      '.page-header',
      '.pd-grid'
    ];

    let revealIndex = 0;
    const elements = document.querySelectorAll(revealTargets.join(','));
    elements.forEach((el) => {
      if (el.classList.contains('rc-reveal')) return;
      el.classList.add('rc-reveal');
      el.style.setProperty('--rc-delay', Math.min((revealIndex % 6) * 55, 275) + 'ms');
      revealIndex += 1;
    });

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('rc-visible');
            obs.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -30px 0px' });
      elements.forEach((el) => observer.observe(el));
    } else {
      elements.forEach((el) => el.classList.add('rc-visible'));
    }

    const hideLoader = () => {
      setTimeout(() => loader.classList.add('is-hidden'), 260);
      setTimeout(() => loader.remove(), 950);
      document.documentElement.classList.add('rc-ready');
    };

    if (document.readyState === 'complete') {
      hideLoader();
    } else {
      window.addEventListener('load', hideLoader, { once: true });
    }
  } catch (error) {
    console.warn('Rainbow motion init skipped:', error);
  }
})();
