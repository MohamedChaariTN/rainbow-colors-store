// ===== RAINBOW COLORS STORE - API CLIENT =====
const API_URL = 'https://rainbow-colors-store.onrender.com/api';

// ===== AUTH =====
let currentUser = null;
let authToken = localStorage.getItem('rc_token');

async function api(endpoint, options = {}) {
  const url = API_URL + endpoint;
  const opts = {
    headers: {
      'Content-Type': 'application/json',
      ...(authToken && { 'Authorization': 'Bearer ' + authToken }),
      ...options.headers
    },
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

function setAuth(token, user) {
  authToken = token;
  currentUser = user;
  localStorage.setItem('rc_token', token);
  updateAuthUI();
}

function logout() {
  authToken = null;
  currentUser = null;
  localStorage.removeItem('rc_token');
  updateAuthUI();
  location.reload();
}

async function checkAuth() {
  if (!authToken) return;
  try {
    const data = await api('/auth/me');
    currentUser = data.user;
    updateAuthUI();
  } catch {
    logout();
  }
}

function updateAuthUI() {
  const authBtn = document.querySelector('.auth-btn');
  const userMenu = document.querySelector('.user-menu');
  if (!authBtn) return;

  if (currentUser) {
    const initials = (currentUser.firstName[0] + currentUser.lastName[0]).toUpperCase();
    const avatarContent = currentUser.profileImage ? '<img src="' + currentUser.profileImage + '" alt="Photo" style="width:100%;height:100%;object-fit:cover;border-radius:50%">' : initials;
    const isAdmin = currentUser.role === 'ADMIN';
    const adminLink = isAdmin ? '<a href="/admin">Dashboard Admin</a>' : '';
    authBtn.innerHTML = `
      <div class="user-menu" style="position:relative">
        <button class="icon-btn" style="background:linear-gradient(135deg,var(--rc-blue),var(--rc-purple));color:white;font-weight:700;font-size:13px;overflow:hidden;padding:0" onclick="toggleUserMenu()">${avatarContent}</button>
        <div class="user-dropdown" id="userDropdown">
          <div style="padding:10px 14px;border-bottom:1px solid var(--rc-gray-100);margin-bottom:4px">
            <div style="font-weight:700;font-size:14px">${currentUser.firstName} ${currentUser.lastName}</div>
            <div style="font-size:12px;color:var(--rc-gray-400)">${currentUser.email}</div>
          </div>
          <a href="account.html">Mon Compte</a>
          <a href="orders.html">Mes Commandes</a>
          <a href="wishlist.html">Favoris</a>
          ${adminLink}
          <a href="#" onclick="logout();return false" style="color:var(--rc-red)">Déconnexion</a>
        </div>
      </div>
    `;
  } else {
    authBtn.innerHTML = `<button class="icon-btn" onclick="openAuthModal()" title="Connexion">👤</button>`;
  }
}

function toggleUserMenu() {
  document.getElementById('userDropdown').classList.toggle('open');
}

document.addEventListener('click', (e) => {
  const dropdown = document.getElementById('userDropdown');
  if (dropdown && !e.target.closest('.user-menu')) dropdown.classList.remove('open');
});

// ===== AUTH MODAL =====
function openAuthModal(mode = 'login') {
  const overlay = document.getElementById('authModal');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const verificationForm = document.getElementById('verificationForm');
  const forgotPasswordForm = document.getElementById('forgotPasswordForm');

  if (!overlay || !loginForm || !registerForm) return;

  const hide = (el) => { if (el) el.style.display = 'none'; };
  const show = (el) => { if (el) el.style.display = 'block'; };

  hide(loginForm);
  hide(registerForm);
  hide(verificationForm);
  hide(forgotPasswordForm);

  if (mode === 'register') {
    show(registerForm);
  } else if (mode === 'verify') {
    show(verificationForm);
  } else if (mode === 'forgot') {
    show(forgotPasswordForm);
  } else {
    show(loginForm);
  }

  overlay.classList.add('open');
}

function closeAuthModal() {
  document.getElementById('authModal').classList.remove('open');
}

async function handleForgotPasswordRequest(e) {
  e.preventDefault();
  try {
    const email = document.getElementById('forgotEmail').value.trim().toLowerCase();
    await api('/auth/forgot-password', { method: 'POST', body: { email } });
    document.getElementById('forgotRequestStep').style.display = 'none';
    document.getElementById('forgotResetStep').style.display = 'block';
    showToast('Si ce compte existe, un code a été envoyé à votre email !');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleResetPassword(e) {
  e.preventDefault();
  try {
    const email = document.getElementById('forgotEmail').value.trim().toLowerCase();
    const code = document.getElementById('resetCode').value.trim();
    const password = document.getElementById('resetPassword').value;
    const data = await api('/auth/reset-password', {
      method: 'POST',
      body: { email, code, password }
    });
    setAuth(data.token, data.user);
    closeAuthModal();
    showToast('Mot de passe modifié avec succès !');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleLogin(e) {
  e.preventDefault();
  try {
    const data = await api('/auth/login', {
      method: 'POST',
      body: {
        email: document.getElementById('loginEmail').value,
        password: document.getElementById('loginPassword').value
      }
    });
    setAuth(data.token, data.user);
    closeAuthModal();
    showToast('Connexion réussie !');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleRegister(e) {
  e.preventDefault();
  try {
    const data = await api('/auth/register', {
      method: 'POST',
      body: {
        email: document.getElementById('regEmail').value,
        password: document.getElementById('regPassword').value,
        firstName: document.getElementById('regFirstName').value,
        lastName: document.getElementById('regLastName').value,
        phone: document.getElementById('regPhone').value,
        profileImage: await readProfileImage()
      }
    });
    if (data.token && data.user) {
      setAuth(data.token, data.user);
      closeAuthModal();
      showToast('Compte créé avec succès !');
    } else {
      pendingVerificationEmail = data.email;
      document.getElementById('verificationEmail').textContent = data.email;
      openAuthModal('verify');
      showToast('Code de vérification envoyé à votre email !');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

let pendingVerificationEmail = null;
async function readProfileImage() {
  const file = document.getElementById('regProfileImage')?.files?.[0];
  if (!file) return undefined;
  if (file.size > 2000000) throw new Error('La photo doit faire 2 Mo maximum.');
  return new Promise((resolve, reject) => { const reader=new FileReader(); reader.onload=()=>resolve(reader.result); reader.onerror=()=>reject(new Error('Impossible de lire la photo.')); reader.readAsDataURL(file); });
}

async function handleVerifyEmail(e) {
  e.preventDefault();
  try { const data=await api('/auth/verify-email',{method:'POST',body:{email:pendingVerificationEmail,code:document.getElementById('verificationCode').value.trim()}}); setAuth(data.token,data.user); closeAuthModal(); showToast('Email vérifié et compte activé !'); }
  catch(err){ showToast(err.message,'error'); }
}
async function resendVerificationCode() {
  try { await api('/auth/resend-verification',{method:'POST',body:{email:pendingVerificationEmail}}); showToast('Nouveau code envoyé !'); }
  catch(err){ showToast(err.message,'error'); }
}

function ensureAuthVerificationUI() {
  const registerForm = document.getElementById('registerForm');
  if (registerForm && !document.getElementById('regProfileImage')) {
    const passwordGroup = document.getElementById('regPassword')?.closest('.form-group');
    if (passwordGroup) {
      const group = document.createElement('div');
      group.className = 'form-group';
      group.innerHTML = '<label>Photo de profil <span style="color:var(--rc-gray-400)">(optionnelle)</span></label><input type="file" id="regProfileImage" accept="image/jpeg,image/png,image/webp">';
      passwordGroup.insertAdjacentElement('afterend', group);
    }
  }
  if (!document.getElementById('forgotPasswordForm') && document.getElementById('authModal')) {
    const modal = document.querySelector('#authModal .modal');
    const form = document.createElement('div');
    form.id = 'forgotPasswordForm';
    form.style.display = 'none';
    form.innerHTML = '<div id="forgotRequestStep"><h2>Mot de passe oublié ?</h2><p>Entrez votre email. Nous vous enverrons un code pour choisir un nouveau mot de passe.</p><form onsubmit="handleForgotPasswordRequest(event)"><div class="form-group"><label>Email</label><input type="email" id="forgotEmail" placeholder="votre@email.com" required></div><button type="submit" class="btn btn-primary">Envoyer le code</button></form></div><div id="forgotResetStep" style="display:none"><h2>Nouveau mot de passe</h2><p>Entrez le code reçu par email puis votre nouveau mot de passe.</p><form onsubmit="handleResetPassword(event)"><div class="form-group"><label>Code</label><input type="text" id="resetCode" inputmode="numeric" maxlength="6" placeholder="000000" required></div><div class="form-group"><label>Nouveau mot de passe</label><input type="password" id="resetPassword" minlength="6" placeholder="Au moins 6 caractères" required></div><button type="submit" class="btn btn-primary">Changer mon mot de passe</button></form></div><div class="switch" style="margin-top:16px"><a href="#" onclick="openAuthModal(&#39;login&#39;);return false>Retour à la connexion</a></div>';
    const closeBtn = modal?.querySelector('.close-btn');
    if (modal) closeBtn ? closeBtn.insertAdjacentElement('afterend', form) : modal.appendChild(form);
  }

  if (!document.getElementById('verificationForm') && document.getElementById('authModal')) {
    const modal = document.querySelector('#authModal .modal');
    const form = document.createElement('div');
    form.id = 'verificationForm';
    form.style.display = 'none';
    form.innerHTML = '<h2>Vérifiez votre email</h2><p>Nous avons envoyé un code à <strong id="verificationEmail"></strong></p><form onsubmit="handleVerifyEmail(event)"><div class="form-group"><label>Code de vérification</label><input type="text" id="verificationCode" inputmode="numeric" maxlength="6" placeholder="000000" required></div><button type="submit" class="btn btn-primary">Vérifier mon email</button></form><button type="button" class="btn btn-secondary" style="margin-top:10px;width:100%" onclick="resendVerificationCode()">Renvoyer le code</button>';
    const closeBtn = modal?.querySelector('.close-btn');
    if (modal) closeBtn ? closeBtn.insertAdjacentElement('afterend', form) : modal.appendChild(form);
  }
}

// ===== CART =====
async function addToCart(productId, qty = 1) {
  if (!authToken) { openAuthModal(); return; }
  try {
    await api('/cart', { method: 'POST', body: { productId, quantity: qty } });
    await loadCart();
    showToast('Produit ajouté au panier !');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function loadCart() {
  if (!authToken) return;
  try {
    const cart = await api('/cart');
    const count = cart.items?.reduce((s, i) => s + i.quantity, 0) || 0;
    document.querySelectorAll('.cart-count').forEach(el => {
      el.textContent = count;
      el.style.display = count > 0 ? 'flex' : 'none';
    });
    return cart;
  } catch { return { items: [] }; }
}

// ===== WISHLIST =====
async function toggleWishlist(productId) {
  if (!authToken) { openAuthModal(); return; }
  try {
    const data = await api('/wishlist/' + productId, { method: 'POST' });
    showToast(data.added ? 'Ajouté aux favoris !' : 'Retiré des favoris');
    const btn = document.querySelector(`[data-wishlist="${productId}"]`);
    if (btn) {
      btn.style.color = data.added ? '#dc2626' : '';
      btn.querySelector('svg')?.setAttribute('fill', data.added ? 'currentColor' : 'none');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
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

function renderProductCard(product, inWishlist = false) {
  const oldPrice = product.oldPrice ? `<span class="old-price">${product.oldPrice.toFixed(2)} TND</span>` : '';
  const stockClass = product.stockStatus === 'IN_STOCK' ? 'stock-in' : product.stockStatus === 'LOW_STOCK' ? 'stock-low' : 'stock-out';
  const stockText = product.stockStatus === 'IN_STOCK' ? 'En stock' : product.stockStatus === 'LOW_STOCK' ? 'Stock limité' : 'Rupture';
  const badgeClass = product.badge === 'new' ? 'badge-new' : product.badge === 'sale' ? 'badge-sale' : product.badge === 'eco' ? 'badge-eco' : 'badge-premium';
  const badgeText = product.badge === 'new' ? 'Nouveau' : product.badge === 'sale' ? 'Promo' : product.badge === 'eco' ? 'Éco' : 'Premium';
  const fill = inWishlist ? 'currentColor' : 'none';
  const color = inWishlist ? '#dc2626' : '';

  return `
    <div class="product-card animate-fadeInUp">
      <div class="product-image">
        <img src="${product.image}" alt="${product.name}" loading="lazy" onerror="this.src='images/logo ranbow colors.jpeg'">
        ${product.badge ? `<span class="product-badge ${badgeClass}">${badgeText}</span>` : ''}
        <div class="product-actions-overlay">
          <button class="action-btn" data-wishlist="${product.id}" onclick="event.stopPropagation(); toggleWishlist(${product.id})" title="Favoris" style="color:${color}">
            <svg viewBox="0 0 24 24" fill="${fill}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
          </button>
        </div>
      </div>
      <div class="product-info">
        <span class="product-category">${product.category?.name || product.category}</span>
        <h3 class="product-name">${product.name}</h3>
        <p class="product-desc">${product.description}</p>
        <div class="product-meta">
          <span class="product-price">${product.price.toFixed(2)} TND ${oldPrice}</span>
          <span class="stock-status ${stockClass}">${stockText}</span>
        </div>
        <div class="product-btns">
          <button class="btn btn-cart" onclick="addToCart(${product.id})">🛒 Panier</button>
          <a href="product.html?slug=${product.slug}" class="btn btn-buy">Acheter</a>
        </div>
      </div>
    </div>
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
  ensureAuthVerificationUI();
  checkAuth();
  loadCart();
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
