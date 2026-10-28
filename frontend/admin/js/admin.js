// Shared API configuration: same-origin /api by default, with an optional
// external API base supplied through window.RAINBOW_COLORS_API_URL.
const API_URL = (
  window.RAINBOW_COLORS_API_URL ||
  (window.location.origin + '/api')
).replace(/\/$/, '');

const ADMIN_TOKEN_KEY = 'rc_admin_token';
const LEGACY_TOKEN_KEY = 'rc_token';

let authToken = localStorage.getItem(ADMIN_TOKEN_KEY);
let currentUser = null;
let loginRequestInFlight = false;

// =========================
// API
// =========================
async function api(endpoint, options = {}) {
  const headers = {
    ...(options.body instanceof FormData
      ? {}
      : { 'Content-Type': 'application/json' }),

    ...(authToken
      ? { Authorization: 'Bearer ' + authToken }
      : {}),

    ...(options.headers || {})
  };

  const fetchOptions = {
    ...options,
    headers
  };

  if (
    options.body &&
    typeof options.body === 'object' &&
    !(options.body instanceof FormData)
  ) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  const res = await fetch(API_URL + endpoint, fetchOptions);

  const text = await res.text();

  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch (error) {
    data = {
      error: text || 'Réponse invalide du serveur'
    };
  }

  if (!res.ok) {
    const error = new Error(
      data.error ||
      data.message ||
      `HTTP ${res.status}`
    );

    error.status = res.status;
    error.data = data;

    // A protected request can expire while the dashboard is open. Do not
    // leave the admin interface visible once the server rejects the session.
    if (
      (res.status === 401 || res.status === 403) &&
      endpoint !== '/auth/login' &&
      endpoint !== '/auth/me'
    ) {
      clearAdminSession();
      showAdminLogin(
        'Votre session a expiré ou n’est plus autorisée. Veuillez vous reconnecter.',
        { clearPassword: true }
      );
    }

    throw error;
  }

  return data;
}

// =========================
// HELPERS
// =========================
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// =========================
// ADMIN AUTH
// =========================
function clearAdminSession() {
  try {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
  } catch (_) {}

  authToken = null;
  currentUser = null;
}

function setAdminIdentity() {
  const adminName =
    document.getElementById('adminName');

  const avatar =
    document.querySelector('.admin-avatar');

  if (adminName) {
    adminName.textContent =
      (
        (currentUser?.firstName || '') +
        ' ' +
        (currentUser?.lastName || '')
      ).trim() || 'Admin';
  }

  if (avatar) {
    avatar.textContent = (
      (currentUser?.firstName?.[0] || 'A') +
      (currentUser?.lastName?.[0] || '')
    ).toUpperCase();
  }
}

function setLoginBusy(isBusy, label) {
  const form =
    document.getElementById('adminLoginForm');

  const button =
    document.getElementById('adminLoginSubmit');

  if (form) {
    form.querySelectorAll('input').forEach(input => {
      input.disabled = Boolean(isBusy);
    });
  }

  if (button) {
    button.disabled = Boolean(isBusy);
    button.textContent =
      isBusy
        ? (label || 'Connexion…')
        : 'Se connecter';
    button.setAttribute(
      'aria-busy',
      isBusy ? 'true' : 'false'
    );
  }
}

function showAdminLogin(message = '', options = {}) {
  const app =
    document.getElementById('adminApp');

  const login =
    document.getElementById('adminLoginScreen');

  const errorBox =
    document.getElementById('adminLoginError');

  const retry =
    document.getElementById('adminRetrySession');

  const emailInput =
    document.getElementById('adminLoginEmail');

  const passwordInput =
    document.getElementById('adminLoginPassword');

  if (app) app.hidden = true;
  if (login) login.hidden = false;

  if (errorBox) {
    errorBox.textContent = message;
    errorBox.classList.toggle(
      'is-visible',
      Boolean(message)
    );
  }

  if (retry) {
    retry.hidden = !options.allowRetry;
  }

  setLoginBusy(false);

  if (passwordInput && options.clearPassword) {
    passwordInput.value = '';
  }

  if (
    options.focusPassword &&
    passwordInput &&
    emailInput?.value.trim()
  ) {
    passwordInput.focus();
  } else if (emailInput && !options.focusPassword) {
    emailInput.focus();
  }
}

function showAdminApp() {
  const app =
    document.getElementById('adminApp');

  const login =
    document.getElementById('adminLoginScreen');

  if (login) login.hidden = true;
  if (app) app.hidden = false;

  setAdminIdentity();
}

async function checkAdmin() {
  authToken = localStorage.getItem(ADMIN_TOKEN_KEY);

  if (!authToken) {
    showAdminLogin();
    return false;
  }

  setLoginBusy(true, 'Vérification…');

  try {
    const data = await api('/auth/me');

    currentUser = data.user;

    if (!currentUser || currentUser.role !== 'ADMIN') {
      clearAdminSession();
      showAdminLogin(
        'Accès réservé aux administrateurs.',
        { clearPassword: true }
      );
      return false;
    }

    showAdminApp();
    return true;

  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      clearAdminSession();
      showAdminLogin(
        'Votre session a expiré ou n’est plus valide. Veuillez vous reconnecter.',
        { clearPassword: true }
      );
    } else {
      showAdminLogin(
        'Impossible de vérifier la session. Vérifiez votre connexion puis réessayez.',
        { allowRetry: true }
      );
    }

    return false;
  }
}

async function loginAdmin(event) {
  event.preventDefault();

  if (loginRequestInFlight) {
    return;
  }

  const emailInput =
    document.getElementById('adminLoginEmail');

  const passwordInput =
    document.getElementById('adminLoginPassword');

  if (!emailInput || !passwordInput) {
    return;
  }

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    showAdminLogin(
      'Veuillez saisir votre email et votre mot de passe.'
    );
    return;
  }

  loginRequestInFlight = true;
  setLoginBusy(true, 'Connexion…');

  try {
    const data = await api('/auth/login', {
      method: 'POST',
      body: { email, password }
    });

    if (
      !data?.token ||
      !data?.user ||
      data.user.role !== 'ADMIN'
    ) {
      const error = new Error(
        'Accès réservé aux administrateurs.'
      );
      error.status = 403;
      throw error;
    }

    authToken = data.token;
    currentUser = data.user;

    localStorage.setItem(ADMIN_TOKEN_KEY, authToken);

    // The admin session is independent from the legacy customer token.
    try {
      localStorage.removeItem(LEGACY_TOKEN_KEY);
    } catch (_) {}

    passwordInput.value = '';
    showAdminApp();

    await loadDashboard();
    await loadContactMessages();

  } catch (error) {
    passwordInput.value = '';

    const isAuthError =
      error.status === 401 || error.status === 403;

    const isNetworkError =
      error instanceof TypeError ||
      !navigator.onLine ||
      error.status >= 500;

    const message =
      isAuthError
        ? 'Email ou mot de passe incorrect, ou accès administrateur non autorisé.'
        : isNetworkError
          ? 'Impossible de contacter le serveur. Vérifiez votre connexion puis réessayez.'
          : (error.message || 'Connexion impossible.');

    showAdminLogin(message, { focusPassword: true });

  } finally {
    loginRequestInFlight = false;
    setLoginBusy(false);
  }
}

async function retryAdminSession() {
  if (loginRequestInFlight) {
    return;
  }

  const adminOk = await checkAdmin();

  if (!adminOk) {
    return;
  }

  await loadDashboard();
  await loadContactMessages();
}

function logoutAdmin() {
  clearAdminSession();

  const form =
    document.getElementById('adminLoginForm');

  if (form) {
    form.reset();
  }

  showAdminLogin('Vous êtes déconnecté.');
  setLoginBusy(false);
}

// =========================
// NAVIGATION
// =========================
function showSection(id) {
  document
    .querySelectorAll('.admin-section')
    .forEach(section => {
      section.classList.remove('active');
    });

  document
    .querySelectorAll('.admin-nav a')
    .forEach(link => {
      link.classList.remove('active');
    });

  const section =
    document.getElementById(id);

  if (section) {
    section.classList.add('active');
  }

  const navLink =
    Array.from(
      document.querySelectorAll('.admin-nav a')
    ).find(link =>
      (link.getAttribute('onclick') || '')
        .includes(`showSection('${id}')`)
    );

  if (navLink) {
    navLink.classList.add('active');
  }

  const titles = {
    dashboard: 'Tableau de bord',
    products: 'Gestion des produits',
    categories: 'Catégories',
    contactMessages: 'Messages reçus'
  };

  const pageTitle =
    document.getElementById('pageTitle');

  if (pageTitle) {
    pageTitle.textContent =
      titles[id] || 'Admin';
  }

  if (id === 'dashboard') {
    loadDashboard();
  }

  if (id === 'products') {
    loadAdminProducts();
  }

  if (id === 'categories') {
    loadAdminCategories();
  }
}

// =========================
// DASHBOARD
// =========================
async function loadDashboard() {
  try {
    const data =
      await api('/admin/dashboard');

    const setStat = (id, value) => {
      const element = document.getElementById(id);
      if (element) element.textContent = value;
    };

    setStat(
      'statProducts',
      data.stats?.totalProducts ?? 0
    );
    setStat(
      'statCategories',
      data.stats?.totalCategories ?? 0
    );
    setStat(
      'statMessages',
      data.stats?.unreadMessages ?? 0
    );
    setStat(
      'statLowStock',
      data.stats?.lowStockCount ?? 0
    );

    const recentProducts =
      document.getElementById(
        'recentProducts'
      );

    if (recentProducts) {
      const products = Array.isArray(data.recentProducts)
        ? data.recentProducts
        : [];

      recentProducts.innerHTML =
        products.length
          ? products
              .map(
                p => `
                  <div style="
                    display:flex;
                    justify-content:space-between;
                    gap:12px;
                    padding:10px 0;
                    border-bottom:
                      1px solid var(--admin-border)
                  ">

                    <div>
                      <strong>
                        ${escapeHtml(p.name)}
                      </strong>

                      <div style="
                        font-size:12px;
                        color:var(--admin-muted)
                      ">
                        ${escapeHtml(
                          p.category?.name ||
                          'Sans catégorie'
                        )}
                      </div>
                    </div>

                    <span style="
                      font-size:12px;
                      color:var(--admin-muted);
                      white-space:nowrap
                    ">
                      ${new Date(
                        p.createdAt
                      ).toLocaleDateString(
                        'fr-FR'
                      )}
                    </span>
                  </div>
                `
              )
              .join('')
          : `
            <p style="
              color:var(--admin-muted);
              font-size:14px
            ">
              Aucun produit
            </p>
          `;
    }

    const lowStock =
      document.getElementById(
        'lowStock'
      );

    if (lowStock) {
      const products = Array.isArray(data.lowStock)
        ? data.lowStock
        : [];

      lowStock.innerHTML =
        products.length
          ? products
              .map(
                p => `
                  <div style="
                    display:flex;
                    justify-content:space-between;
                    gap:12px;
                    padding:10px 0;
                    border-bottom:
                      1px solid var(--admin-border)
                  ">

                    <span>
                      ${escapeHtml(p.name)}
                    </span>

                    <span style="
                      color:#d96c62;
                      font-weight:700;
                      font-size:13px
                    ">
                      ${p.stock}
                      restant(s)
                    </span>

                  </div>
                `
              )
              .join('')
          : `
            <p style="
              color:var(--admin-muted);
              font-size:14px
            ">
              Tout est en ordre
            </p>
          `;
    }

  } catch (error) {
    console.error(
      'Dashboard error:',
      error
    );
  }
}

// =========================
// PRODUCTS
// =========================
let editingProductId = null;

let adminProductsCache = [];
let adminProductsPage = 1;
let adminProductsSearch = '';
const ADMIN_PRODUCTS_PER_PAGE = 12;

async function loadAdminProducts(force = false) {
  const tbody = document.querySelector('#productsTable tbody');

  if (!tbody) {
    return;
  }

  if (!force && adminProductsCache.length) {
    renderAdminProductsPage();
    return;
  }

  tbody.innerHTML = `
    <tr>
      <td colspan="7" style="text-align:center;padding:45px;">
        <div class="admin-loading-inline">
          <span class="admin-loading-spinner"></span>
          <span>Chargement du catalogue…</span>
        </div>
      </td>
    </tr>
  `;

  try {
    const data = await api('/admin/products/all');

    adminProductsCache = Array.isArray(data) ? data : [];
    adminProductsPage = 1;

    renderAdminProductsPage();

  } catch (error) {
    console.error('Products error:', error);

    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center;padding:40px;">
          <div style="color:#dc2626;font-weight:700;">
            Impossible de charger les produits.
          </div>
          <button
            class="btn-sm btn-edit"
            style="margin-top:12px;"
            onclick="loadAdminProducts(true)"
          >
            Réessayer
          </button>
        </td>
      </tr>
    `;
  }
}

function getFilteredAdminProducts() {
  const query = adminProductsSearch.trim().toLowerCase();

  if (!query) {
    return adminProductsCache;
  }

  return adminProductsCache.filter(product => {
    const name = String(product.name || '').toLowerCase();
    const category = String(product.category?.name || '').toLowerCase();
    const slug = String(product.slug || '').toLowerCase();

    return (
      name.includes(query) ||
      category.includes(query) ||
      slug.includes(query)
    );
  });
}

function renderAdminProductsPage() {
  const tbody = document.querySelector('#productsTable tbody');

  if (!tbody) {
    return;
  }

  const filtered = getFilteredAdminProducts();
  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / ADMIN_PRODUCTS_PER_PAGE)
  );

  if (adminProductsPage > totalPages) {
    adminProductsPage = totalPages;
  }

  const startIndex =
    (adminProductsPage - 1) * ADMIN_PRODUCTS_PER_PAGE;

  const pageProducts =
    filtered.slice(
      startIndex,
      startIndex + ADMIN_PRODUCTS_PER_PAGE
    );

  const countEl =
    document.getElementById('adminProductsCount');

  if (countEl) {
    countEl.textContent =
      adminProductsSearch.trim()
        ? `${filtered.length} / ${adminProductsCache.length} produits`
        : `${adminProductsCache.length} produits`;
  }

  const pageInfo =
    document.getElementById('productsPageInfo');

  if (pageInfo) {
    pageInfo.textContent =
      `${adminProductsPage} / ${totalPages}`;
  }

  const prev =
    document.getElementById('productsPrev');

  const next =
    document.getElementById('productsNext');

  if (prev) {
    prev.disabled = adminProductsPage <= 1;
  }

  if (next) {
    next.disabled = adminProductsPage >= totalPages;
  }

  if (!pageProducts.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center;padding:45px;">
          <div style="font-size:28px;margin-bottom:8px;">⌕</div>
          <strong>Aucun produit trouvé</strong>
          <div style="margin-top:5px;color:var(--admin-muted);">
            Modifiez votre recherche puis réessayez.
          </div>
        </td>
      </tr>
    `;

    return;
  }

  tbody.innerHTML = pageProducts
    .map(p => `
      <tr>
        <td>
          <img
            src="${escapeHtml(p.image || '')}"
            alt="${escapeHtml(p.name)}"
            loading="lazy"
            decoding="async"
            onerror="this.src='../images/logo ranbow colors.jpeg'"
          >
        </td>

        <td>
          <strong>${escapeHtml(p.name)}</strong>
        </td>

        <td>
          ${escapeHtml(p.category?.name || '')}
        </td>

        <td>
          <strong>${Number(p.price || 0).toFixed(2)} TND</strong>
        </td>

        <td>
          ${p.stock}
        </td>

        <td>
          <span class="badge ${
            p.stockStatus === 'IN_STOCK'
              ? 'badge-new'
              : p.stockStatus === 'LOW_STOCK'
              ? 'badge-sale'
              : 'badge-eco'
          }">
            ${escapeHtml(
              String(p.stockStatus || '').replace('_', ' ')
            )}
          </span>
        </td>

        <td style="white-space:nowrap;">
          <button
            class="btn-sm btn-edit"
            onclick='editProduct(${JSON.stringify(p).replace(/'/g, '&#39;')})'
            title="Modifier"
          >
            ✏️
          </button>

          <button
            class="btn-sm btn-delete"
            onclick="deleteProduct(${p.id})"
            title="Supprimer"
          >
            🗑️
          </button>
        </td>
      </tr>
    `)
    .join('');
}

function filterAdminProducts(value) {
  adminProductsSearch = String(value || '');
  adminProductsPage = 1;
  renderAdminProductsPage();
}

function changeAdminProductsPage(direction) {
  const filtered = getFilteredAdminProducts();
  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / ADMIN_PRODUCTS_PER_PAGE)
  );

  adminProductsPage = Math.min(
    totalPages,
    Math.max(1, adminProductsPage + direction)
  );

  renderAdminProductsPage();
}
async function loadCategoriesSelect() {
  try {
    const cats =
      await api('/products/categories');

    const select =
      document.getElementById(
        'prodCategory'
      );

    if (!select) {
      return;
    }

    select.innerHTML =
      cats
        .map(
          c => `
            <option value="${c.id}">
              ${escapeHtml(c.name)}
            </option>
          `
        )
        .join('');

  } catch (error) {
    console.error(error);
  }
}

function openProductModal() {
  editingProductId = null;

  const title =
    document.getElementById(
      'productModalTitle'
    );

  if (title) {
    title.textContent =
      'Ajouter un produit';
  }

  const form =
    document.getElementById(
      'productForm'
    );

  if (form) {
    form.reset();
  }

  const prodId =
    document.getElementById(
      'prodId'
    );

  if (prodId) {
    prodId.value = '';
  }

  const modal =
    document.getElementById(
      'productModal'
    );

  if (modal) {
    modal.classList.add('open');
  }

  loadCategoriesSelect();
}

function closeProductModal() {
  const modal =
    document.getElementById(
      'productModal'
    );

  if (modal) {
    modal.classList.remove('open');
  }
}

function editProduct(p) {
  editingProductId = p.id;

  document.getElementById(
    'productModalTitle'
  ).textContent =
    'Modifier le produit';

  document.getElementById(
    'prodId'
  ).value = p.id;

  document.getElementById(
    'prodName'
  ).value = p.name;

  document.getElementById(
    'prodSlug'
  ).value = p.slug;

  document.getElementById(
    'prodDesc'
  ).value = p.description || '';

  document.getElementById(
    'prodPrice'
  ).value = p.price;

  document.getElementById(
    'prodOldPrice'
  ).value = p.oldPrice || '';

  document.getElementById(
    'prodStock'
  ).value = p.stock;

  document.getElementById(
    'prodStockStatus'
  ).value = p.stockStatus;

  document.getElementById(
    'prodBadge'
  ).value = p.badge || '';

  let features = [];

  try {
    features =
      JSON.parse(
        p.features || '[]'
      );
  } catch {
    features = [];
  }

  document.getElementById(
    'prodFeatures'
  ).value =
    features.join('\n');

  document.getElementById(
    'productModal'
  ).classList.add('open');

  loadCategoriesSelect()
    .then(() => {
      const category =
        document.getElementById(
          'prodCategory'
        );

      if (category) {
        category.value =
          p.categoryId;
      }
    });
}

async function saveProduct(event) {
  event.preventDefault();

  const formData =
    new FormData();

  formData.append(
    'name',
    document.getElementById(
      'prodName'
    ).value
  );

  formData.append(
    'slug',
    document.getElementById(
      'prodSlug'
    ).value
  );

  formData.append(
    'description',
    document.getElementById(
      'prodDesc'
    ).value
  );

  formData.append(
    'price',
    document.getElementById(
      'prodPrice'
    ).value
  );

  const oldPrice =
    document.getElementById(
      'prodOldPrice'
    ).value;

  if (oldPrice) {
    formData.append(
      'oldPrice',
      oldPrice
    );
  }

  formData.append(
    'stock',
    document.getElementById(
      'prodStock'
    ).value
  );

  formData.append(
    'stockStatus',
    document.getElementById(
      'prodStockStatus'
    ).value
  );

  formData.append(
    'badge',
    document.getElementById(
      'prodBadge'
    ).value
  );

  formData.append(
    'categoryId',
    document.getElementById(
      'prodCategory'
    ).value
  );

  formData.append(
    'features',
    JSON.stringify(
      document
        .getElementById(
          'prodFeatures'
        )
        .value
        .split('\n')
        .filter(
          f => f.trim()
        )
    )
  );

  const file =
    document.getElementById(
      'prodImage'
    ).files[0];

  if (file) {
    formData.append(
      'image',
      file
    );
  }

  try {
    const url =
      editingProductId
        ? `/admin/products/${editingProductId}`
        : '/admin/products';

    const method =
      editingProductId
        ? 'PATCH'
        : 'POST';

    const response =
      await fetch(
        API_URL + url,
        {
          method,
          headers: {
            ...(authToken
              ? {
                  Authorization:
                    'Bearer ' +
                    authToken
                }
              : {})
          },
          body: formData
        }
      );

    const data =
      await response
        .json()
        .catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.error ||
        data.message ||
        'Erreur lors de l’enregistrement'
      );
    }

    closeProductModal();

    await loadAdminProducts(true);

    await loadDashboard();

    alert(
      editingProductId
        ? 'Produit modifié !'
        : 'Produit créé !'
    );

  } catch (error) {
    alert(error.message);
  }
}

async function deleteProduct(id) {
  if (
    !confirm(
      'Supprimer ce produit ?'
    )
  ) {
    return;
  }

  try {
    await api(
      '/admin/products/' + id,
      {
        method: 'DELETE'
      }
    );

    await loadAdminProducts(true);

    await loadDashboard();

  } catch (error) {
    alert(error.message);
  }
}

// =========================
// CATEGORIES
// =========================
async function loadAdminCategories() {
  try {
    const cats =
      await api('/admin/categories');

    const container =
      document.getElementById(
        'categoriesList'
      );

    if (!container) {
      return;
    }

    container.innerHTML = `
      <div style="
        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:12px;
        padding:18px;
        border-bottom:
          1px solid var(--gray-100)
      ">

        <div>

          <h3 style="
            margin:0 0 5px
          ">
            Gestion des catégories
          </h3>

          <p style="
            margin:0;
            color:var(--gray-500);
            font-size:13px
          ">
            Ajouter, modifier ou
            supprimer une catégorie.
          </p>

        </div>

        <button
          class="btn btn-primary"
          onclick="
            createCategory()
          "
        >
          + Ajouter
        </button>

      </div>

      ${
        cats.length
          ? cats
              .map(
                c => `
                  <div style="
                    display:flex;
                    justify-content:space-between;
                    align-items:center;
                    gap:15px;
                    padding:16px;
                    border-bottom:
                      1px solid
                      var(--gray-100);
                    flex-wrap:wrap
                  ">

                    <div style="
                      display:flex;
                      align-items:center;
                      gap:12px
                    ">

                      <span style="
                        width:42px;
                        height:42px;
                        border-radius:10px;
                        display:flex;
                        align-items:center;
                        justify-content:center;
                        background:${
                          escapeHtml(
                            c.color ||
                            '#2563eb'
                          )
                        }22;
                        font-size:22px
                      ">
                        ${escapeHtml(
                          c.icon ||
                          '📁'
                        )}
                      </span>

                      <div>

                        <strong>
                          ${escapeHtml(
                            c.name
                          )}
                        </strong>

                        <p style="
                          margin:3px 0 0;
                          font-size:13px;
                          color:var(--gray-500)
                        ">
                          ${escapeHtml(
                            c.description ||
                            ''
                          )}
                          ·
                          ${
                            c._count
                              ?.products ||
                            0
                          }
                          produits
                        </p>

                        <p style="
                          margin:3px 0 0;
                          font-size:12px;
                          color:var(--gray-400)
                        ">
                          Slug:
                          ${escapeHtml(
                            c.slug ||
                            ''
                          )}
                        </p>

                      </div>

                    </div>

                    <div style="
                      display:flex;
                      align-items:center;
                      gap:8px
                    ">

                      <span style="
                        width:16px;
                        height:16px;
                        border-radius:50%;
                        background:${
                          escapeHtml(
                            c.color ||
                            '#ccc'
                          )
                        };
                        display:inline-block
                      "></span>

                      <button
                        class="
                          btn-sm
                          btn-edit
                        "
                        onclick="
                          editCategory(
                            ${c.id}
                          )
                        "
                        title="Modifier"
                      >
                        ✏️
                      </button>

                      <button
                        class="
                          btn-sm
                          btn-delete
                        "
                        onclick="
                          deleteCategory(
                            ${c.id}
                          )
                        "
                        title="Supprimer"
                      >
                        🗑️
                      </button>

                    </div>

                  </div>
                `
              )
              .join('')
          : `
              <div style="
                padding:30px;
                text-align:center;
                color:var(--gray-400)
              ">
                Aucune catégorie.
              </div>
            `
      }
    `;

  } catch (error) {
    console.error(
      'Categories error:',
      error
    );
  }
}

async function createCategory() {
  const name =
    prompt(
      'Nom de la catégorie :'
    );

  if (name === null) {
    return;
  }

  const cleanName =
    name.trim();

  if (!cleanName) {
    alert(
      'Le nom de la catégorie est obligatoire.'
    );

    return;
  }

  const slug =
    prompt(
      'Slug :',
      cleanName
        .toLowerCase()
        .normalize('NFD')
        .replace(
          /[\u0300-\u036f]/g,
          ''
        )
        .replace(
          /[^a-z0-9]+/g,
          '-'
        )
        .replace(
          /(^-|-$)/g,
          ''
        )
    );

  if (slug === null) {
    return;
  }

  const description =
    prompt(
      'Description :',
      ''
    );

  if (description === null) {
    return;
  }

  const icon =
    prompt(
      'Icône / emoji :',
      '📁'
    );

  if (icon === null) {
    return;
  }

  const color =
    prompt(
      'Couleur hexadécimale :',
      '#2563eb'
    );

  if (color === null) {
    return;
  }

  try {
    await api(
      '/admin/categories',
      {
        method: 'POST',
        body: {
          name: cleanName,

          slug:
            slug.trim(),

          description:
            description.trim() ||
            null,

          icon:
            icon.trim() ||
            '📁',

          color:
            color.trim() ||
            '#2563eb'
        }
      }
    );

    alert(
      'Catégorie créée avec succès !'
    );

    await loadAdminCategories();

    await loadCategoriesSelect();

  } catch (error) {
    alert(error.message);
  }
}

async function editCategory(id) {
  try {
    const cats =
      await api(
        '/admin/categories'
      );

    const category =
      cats.find(
        c =>
          Number(c.id) ===
          Number(id)
      );

    if (!category) {
      alert(
        'Catégorie introuvable.'
      );

      return;
    }

    const name =
      prompt(
        'Nom de la catégorie :',
        category.name || ''
      );

    if (name === null) {
      return;
    }

    const slug =
      prompt(
        'Slug :',
        category.slug || ''
      );

    if (slug === null) {
      return;
    }

    const description =
      prompt(
        'Description :',
        category.description ||
        ''
      );

    if (description === null) {
      return;
    }

    const icon =
      prompt(
        'Icône / emoji :',
        category.icon ||
        '📁'
      );

    if (icon === null) {
      return;
    }

    const color =
      prompt(
        'Couleur hexadécimale :',
        category.color ||
        '#2563eb'
      );

    if (color === null) {
      return;
    }

    await api(
      '/admin/categories/' +
        id,
      {
        method: 'PATCH',
        body: {
          name:
            name.trim(),

          slug:
            slug.trim(),

          description:
            description.trim() ||
            null,

          icon:
            icon.trim() ||
            '📁',

          color:
            color.trim() ||
            '#2563eb'
        }
      }
    );

    alert(
      'Catégorie modifiée avec succès !'
    );

    await loadAdminCategories();

    await loadCategoriesSelect();

    await loadDashboard();

  } catch (error) {
    alert(error.message);
  }
}

async function deleteCategory(id) {
  if (
    !confirm(
      'Voulez-vous vraiment supprimer cette catégorie ?'
    )
  ) {
    return;
  }

  try {
    await api(
      '/admin/categories/' +
        id,
      {
        method: 'DELETE'
      }
    );

    alert(
      'Catégorie supprimée avec succès !'
    );

    await loadAdminCategories();

    await loadCategoriesSelect();

  } catch (error) {
    alert(error.message);
  }
}

// =========================
// INIT
// =========================
document.addEventListener(
  'DOMContentLoaded',
  async () => {
    const loginForm =
      document.getElementById('adminLoginForm');

    const retryButton =
      document.getElementById('adminRetrySession');

    loginForm?.addEventListener(
      'submit',
      loginAdmin
    );

    retryButton?.addEventListener(
      'click',
      retryAdminSession
    );

    const adminOk =
      await checkAdmin();

    if (!adminOk) {
      return;
    }

    await loadDashboard();

    await loadContactMessages();
  }
);


async function loadContactMessages() {
  const container = document.getElementById('contactMessagesList');
  const count = document.getElementById('contactMessagesCount');
  if (!container) return;

  container.innerHTML = '<div style="padding:40px;text-align:center;color:#718096;">Chargement des messages...</div>';

  try {
    const messages = await api('/admin/contact-messages');
    const unread = messages.filter(m => !m.isRead).length;

    if (count) count.textContent = unread + ' non lu' + (unread > 1 ? 's' : '');

    if (!messages.length) {
      container.innerHTML = '<div style="padding:50px;text-align:center;color:#718096;">📭 Aucun message reçu.</div>';
      return;
    }

    container.innerHTML = messages.map(m => {
      const date = new Date(m.createdAt).toLocaleString('fr-FR');
      return '<div class="contact-message-card ' + (!m.isRead ? 'unread' : '') + '">' +
        '<div class="contact-message-head">' +
          '<div><div class="contact-message-name">' + escapeHtml(m.name) + '</div>' +
          '<div class="contact-message-email">' + escapeHtml(m.email) + (m.phone ? ' · ' + escapeHtml(m.phone) : '') + '</div></div>' +
          '<div class="contact-message-date">' + date + '</div>' +
        '</div>' +
        '<div class="contact-message-subject">' + escapeHtml(m.subject) + '</div>' +
        '<div class="contact-message-body">' + escapeHtml(m.message).replace(/\n/g, '<br>') + '</div>' +
        '<div class="contact-message-actions">' +
          (!m.isRead ? '<button type="button" class="btn-sm btn-edit" onclick="markContactMessageRead(' + m.id + ')">✓ Marquer comme lu</button>' : '<span class="contact-read-badge">✓ Lu</span>') +
          '<button type="button" class="btn-sm btn-delete" onclick="deleteContactMessage(' + m.id + ')">🗑 Supprimer</button>' +
          '<button type="button" class="btn-sm btn-edit" onclick="replyToContactMessage(' + m.id + ', ' + JSON.stringify(m.email).replace(/'/g, '&#039;') + ', ' + JSON.stringify(m.subject).replace(/'/g, '&#039;') + ')">✉ Répondre</button>' +
        '</div>' +
      '</div>';
    }).join('');
  } catch (error) {
    container.innerHTML = '<div style="padding:40px;text-align:center;color:#dc2626;">Impossible de charger les messages.<br><button type="button" class="btn-sm btn-edit" onclick="loadContactMessages()" style="margin-top:12px;">Réessayer</button></div>';
  }
}

async function markContactMessageRead(id) {
  try {
    await api('/admin/contact-messages/' + id + '/read', { method: 'PATCH' });
    loadContactMessages();
  } catch (error) {
    alert(error.message);
  }
}

async function deleteContactMessage(id) {
  if (!confirm('Supprimer ce message ?')) return;
  try {
    await api('/admin/contact-messages/' + id, { method: 'DELETE' });
    loadContactMessages();
  } catch (error) {
    alert(error.message);
  }
}


async function replyToContactMessage(id, email, subject) {
  const message = prompt('Réponse à ' + email + '\n\nÉcrivez votre réponse :');
  if (message === null || !message.trim()) return;
  try {
    await api('/admin/contact-messages/' + id + '/reply', { method: 'POST', body: { message: message.trim() } });
    alert('✓ Réponse envoyée avec succès au client.');
    loadContactMessages();
  } catch (error) { alert('✕ ' + error.message); }
}
