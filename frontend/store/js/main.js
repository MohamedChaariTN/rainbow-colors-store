// ===== RAINBOW COLORS STORE - API CLIENT =====
const API_URL = window.location.origin + '/api';

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
    const isAdmin = currentUser.role === 'ADMIN';
    const adminLink = isAdmin ? '<a href="/admin">⚙️ Dashboard Admin</a>' : '';
    authBtn.innerHTML = `
      <div class="user-menu" style="position:relative">
        <button class="icon-btn" style="background:linear-gradient(135deg,var(--rc-blue),var(--rc-purple));color:white;font-weight:700;font-size:13px" onclick="toggleUserMenu()">${initials}</button>
        <div class="user-dropdown" id="userDropdown">
          <div style="padding:10px 14px;border-bottom:1px solid var(--rc-gray-100);margin-bottom:4px">
            <div style="font-weight:700;font-size:14px">${currentUser.firstName} ${currentUser.lastName}</div>
            <div style="font-size:12px;color:var(--rc-gray-400)">${currentUser.email}</div>
          </div>
          <a href="account.html">👤 Mon Compte</a>
          <a href="orders.html">📦 Mes Commandes</a>
          <a href="wishlist.html">❤️ Favoris</a>
          ${adminLink}
          <a href="#" onclick="logout();return false" style="color:var(--rc-red)">🚪 Déconnexion</a>
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
  if (mode === 'login') {
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
  } else {
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
  }
  overlay.classList.add('open');
}

function closeAuthModal() {
  document.getElementById('authModal').classList.remove('open');
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
        phone: document.getElementById('regPhone').value
      }
    });
    setAuth(data.token, data.user);
    closeAuthModal();
    showToast('Compte créé avec succès !');
  } catch (err) {
    showToast(err.message, 'error');
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

function renderCategoryCard(cat) {
  return `
    <a href="products.html?category=${cat.slug}" class="category-card animate-fadeInUp" style="border-top:4px solid ${cat.color}">
      <div class="category-icon" style="background:${cat.color}15;color:${cat.color}">${cat.icon}</div>
      <h3>${cat.name}</h3>
      <p>${cat._count?.products || 0} produits</p>
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
  checkAuth();
  loadCart();
});
