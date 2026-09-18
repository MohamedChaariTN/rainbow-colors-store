const API_URL = window.location.origin + '/api';

let authToken = localStorage.getItem('rc_token');
let currentUser = null;

let knownOrderIds = new Set();
let firstOrdersLoad = true;
let autoRefreshTimer = null;

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
    throw new Error(
      data.error ||
      data.message ||
      `HTTP ${res.status}`
    );
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
async function checkAdmin() {
  authToken = localStorage.getItem('rc_token');

  if (!authToken) {
    location.href = '../store/index.html';
    return false;
  }

  try {
    const data = await api('/auth/me');

    currentUser = data.user;

    if (!currentUser || currentUser.role !== 'ADMIN') {
      alert('Accès réservé aux administrateurs');
      location.href = '../store/index.html';
      return false;
    }

    const adminName =
      document.getElementById('adminName');

    const avatar =
      document.querySelector('.admin-avatar');

    if (adminName) {
      adminName.textContent =
        (currentUser.firstName || '') +
        ' ' +
        (currentUser.lastName || '');
    }

    if (avatar) {
      avatar.textContent = (
        (currentUser.firstName?.[0] || 'A') +
        (currentUser.lastName?.[0] || '')
      ).toUpperCase();
    }

    return true;

  } catch (error) {
    console.error('Admin auth error:', error);

    localStorage.removeItem('rc_token');

    location.href = '../store/index.html';

    return false;
  }
}

function logoutAdmin() {
  localStorage.removeItem('rc_token');
  location.href = '../store/index.html';
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
    orders: 'Gestion des commandes',
    customers: 'Gestion des clients',
    categories: 'Catégories'
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

  if (id === 'orders') {
    loadAdminOrders();
  }

  if (id === 'customers') {
    loadAdminCustomers();
  }

  if (id === 'categories') {
    loadAdminCategories();
  }
}

// =========================
// NEW ORDER NOTIFICATION
// =========================
function showNewOrderNotification(order) {
  const old =
    document.getElementById(
      'newOrderNotification'
    );

  if (old) {
    old.remove();
  }

  const notification =
    document.createElement('div');

  notification.id =
    'newOrderNotification';

  notification.style.cssText = `
    position:fixed;
    top:20px;
    right:20px;
    z-index:99999;
    width:350px;
    background:#fff;
    border-radius:14px;
    padding:18px;
    box-shadow:0 10px 40px rgba(0,0,0,.18);
    border:2px solid #2563eb;
  `;

  const firstName =
    order.user?.firstName ||
    order.firstName ||
    '';

  const lastName =
    order.user?.lastName ||
    order.lastName ||
    '';

  notification.innerHTML = `
    <div style="
      display:flex;
      justify-content:space-between;
      gap:12px
    ">
      <div>

        <div style="
          font-size:18px;
          font-weight:800;
          color:#2563eb
        ">
          🔔 Nouvelle commande
        </div>

        <div style="
          margin-top:8px;
          font-weight:700
        ">
          ${escapeHtml(order.orderNumber)}
        </div>

        <div style="
          margin-top:5px;
          color:#666
        ">
          ${escapeHtml(firstName)}
          ${escapeHtml(lastName)}
        </div>

        <div style="
          margin-top:5px;
          font-weight:700
        ">
          ${Number(order.total || 0).toFixed(2)} TND
        </div>

      </div>

      <button
        id="closeNewOrderNotification"
        style="
          border:none;
          background:transparent;
          font-size:20px;
          cursor:pointer
        "
      >
        ✕
      </button>

    </div>

    <button
      id="viewNewOrderButton"
      style="
        margin-top:14px;
        width:100%;
        padding:10px;
        border:none;
        border-radius:9px;
        background:#2563eb;
        color:#fff;
        font-weight:700;
        cursor:pointer
      "
    >
      Voir les commandes
    </button>
  `;

  document.body.appendChild(
    notification
  );

  document
    .getElementById(
      'closeNewOrderNotification'
    )
    ?.addEventListener(
      'click',
      () => {
        notification.remove();
      }
    );

  document
    .getElementById(
      'viewNewOrderButton'
    )
    ?.addEventListener(
      'click',
      () => {
        notification.remove();
        showSection('orders');
      }
    );

  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 10000);

  if (
    'Notification' in window &&
    Notification.permission === 'granted'
  ) {
    new Notification(
      'Nouvelle commande Rainbow Colors',
      {
        body:
          `${order.orderNumber} - ` +
          `${Number(
            order.total || 0
          ).toFixed(2)} TND`
      }
    );
  }
}

async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    return;
  }

  if (
    Notification.permission === 'default'
  ) {
    try {
      await Notification.requestPermission();
    } catch (error) {
      console.error(error);
    }
  }
}

// =========================
// DASHBOARD
// =========================
async function loadDashboard() {
  try {
    const data =
      await api('/admin/dashboard');

    const statProducts =
      document.getElementById(
        'statProducts'
      );

    const statOrders =
      document.getElementById(
        'statOrders'
      );

    const statUsers =
      document.getElementById(
        'statUsers'
      );

    const statRevenue =
      document.getElementById(
        'statRevenue'
      );

    if (statProducts) {
      statProducts.textContent =
        data.stats.totalProducts;
    }

    if (statOrders) {
      statOrders.textContent =
        data.stats.totalOrders;
    }

    if (statUsers) {
      statUsers.textContent =
        data.stats.totalUsers;
    }

    if (statRevenue) {
      statRevenue.textContent =
        Number(
          data.stats.totalRevenue || 0
        ).toFixed(2);
    }

    const recentOrders =
      document.getElementById(
        'recentOrders'
      );

    if (recentOrders) {
      recentOrders.innerHTML =
        data.recentOrders.length
          ? data.recentOrders
              .map(
                o => `
                  <div style="
                    display:flex;
                    justify-content:space-between;
                    padding:10px 0;
                    border-bottom:
                      1px solid var(--gray-100)
                  ">

                    <div>
                      <strong>
                        ${escapeHtml(
                          o.orderNumber
                        )}
                      </strong>

                      <div style="
                        font-size:12px;
                        color:var(--gray-400)
                      ">
                        ${escapeHtml(
                          o.user?.firstName || ''
                        )}
                        ${escapeHtml(
                          o.user?.lastName || ''
                        )}
                      </div>
                    </div>

                    <div style="
                      text-align:right
                    ">

                      <div style="
                        font-weight:700
                      ">
                        ${Number(
                          o.total || 0
                        ).toFixed(2)} TND
                      </div>

                      <span
                        class="badge status-${String(
                          o.status
                        ).toLowerCase()}"
                      >
                        ${escapeHtml(
                          o.status
                        )}
                      </span>

                    </div>
                  </div>
                `
              )
              .join('')
          : `
            <p style="
              color:var(--gray-400);
              font-size:14px
            ">
              Aucune commande
            </p>
          `;
    }

    const lowStock =
      document.getElementById(
        'lowStock'
      );

    if (lowStock) {
      lowStock.innerHTML =
        data.lowStock.length
          ? data.lowStock
              .map(
                p => `
                  <div style="
                    display:flex;
                    justify-content:space-between;
                    padding:10px 0;
                    border-bottom:
                      1px solid var(--gray-100)
                  ">

                    <span>
                      ${escapeHtml(p.name)}
                    </span>

                    <span style="
                      color:var(--danger);
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
              color:var(--gray-400);
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
            onerror="this.src='../store/images/logo ranbow colors.jpeg'"
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

    await loadAdminProducts();

    await loadDashboard();

  } catch (error) {
    alert(error.message);
  }
}

// =========================
// ORDERS
// =========================
async function loadAdminOrders(
  showNotification = true
) {
  try {
    const orders =
      await api('/admin/orders');

    if (!Array.isArray(orders)) {
      return;
    }

    if (
      !firstOrdersLoad &&
      showNotification
    ) {
      const newOrders =
        orders.filter(
          order =>
            !knownOrderIds.has(
              order.id
            )
        );

      newOrders
        .slice(0, 3)
        .forEach(order => {
          showNewOrderNotification(
            order
          );
        });
    }

    knownOrderIds =
      new Set(
        orders.map(
          order => order.id
        )
      );

    firstOrdersLoad = false;

    const tbody =
      document.querySelector(
        '#ordersTable tbody'
      );

    if (!tbody) {
      return;
    }

    if (!orders.length) {
      tbody.innerHTML = `
        <tr>
          <td
            colspan="7"
            style="
              text-align:center;
              padding:30px;
              color:#999
            "
          >
            Aucune commande
          </td>
        </tr>
      `;

      return;
    }

    tbody.innerHTML =
      orders
        .map(o => {
          const paymentLabel =
            o.paymentMethod === 'cod'
              ? '💵 COD'
              : o.paymentMethod === 'card'
              ? '💳 Carte'
              : '📮 E-Dinar';

          const firstName =
            o.user?.firstName ||
            o.firstName ||
            '';

          const lastName =
            o.user?.lastName ||
            o.lastName ||
            '';

          const email =
            o.user?.email ||
            o.email ||
            '';

          const phone =
            o.user?.phone ||
            o.phone ||
            '-';

          return `
            <tr>

              <td>
                <strong>
                  ${escapeHtml(
                    o.orderNumber
                  )}
                </strong>
              </td>

              <td>
                <strong>
                  ${escapeHtml(
                    firstName
                  )}
                  ${escapeHtml(
                    lastName
                  )}
                </strong>

                <br>

                <small
                  style="
                    color:var(--gray-400)
                  "
                >
                  ${escapeHtml(
                    email
                  )}
                </small>

                <br>

                <small
                  style="
                    color:var(--gray-400)
                  "
                >
                  ${escapeHtml(
                    phone
                  )}
                </small>
              </td>

              <td>
                ${new Date(
                  o.createdAt
                ).toLocaleString(
                  'fr-FR'
                )}
              </td>

              <td>
                <strong>
                  ${Number(
                    o.total || 0
                  ).toFixed(2)}
                  TND
                </strong>
              </td>

              <td>
                ${paymentLabel}

                <br>

                <small>
                  ${escapeHtml(
                    o.paymentStatus ||
                    'PENDING'
                  )}
                </small>
              </td>

              <td>
                <span
                  class="
                    badge
                    status-${String(
                      o.status
                    ).toLowerCase()}
                  "
                >
                  ${escapeHtml(
                    o.status
                  )}
                </span>
              </td>

              <td>

                <select
                  onchange="
                    updateOrderStatus(
                      ${o.id},
                      this.value,
                      this
                    )
                  "
                  style="
                    padding:6px 10px;
                    border-radius:8px;
                    border:
                      1px solid
                      var(--gray-300);
                    font-size:13px
                  "
                >

                  <option
                    value="PENDING"
                    ${
                      o.status ===
                      'PENDING'
                        ? 'selected'
                        : ''
                    }
                  >
                    En attente
                  </option>

                  <option
                    value="CONFIRMED"
                    ${
                      o.status ===
                      'CONFIRMED'
                        ? 'selected'
                        : ''
                    }
                  >
                    Confirmée
                  </option>

                  <option
                    value="PROCESSING"
                    ${
                      o.status ===
                      'PROCESSING'
                        ? 'selected'
                        : ''
                    }
                  >
                    En traitement
                  </option>

                  <option
                    value="SHIPPED"
                    ${
                      o.status ===
                      'SHIPPED'
                        ? 'selected'
                        : ''
                    }
                  >
                    Expédiée
                  </option>

                  <option
                    value="DELIVERED"
                    ${
                      o.status ===
                      'DELIVERED'
                        ? 'selected'
                        : ''
                    }
                  >
                    Livrée
                  </option>

                  <option
                    value="CANCELLED"
                    ${
                      o.status ===
                      'CANCELLED'
                        ? 'selected'
                        : ''
                    }
                  >
                    Annulée
                  </option>

                </select>

              </td>

            </tr>
          `;
        })
        .join('');

  } catch (error) {
    console.error(
      'Orders error:',
      error
    );
  }
}

// =========================
// UPDATE ORDER STATUS
// =========================
async function updateOrderStatus(
  id,
  status,
  selectElement = null
) {
  const oldValue =
    selectElement
      ? selectElement.value
      : status;

  if (selectElement) {
    selectElement.disabled = true;
  }

  try {
    await api(
      '/admin/orders/' + id,
      {
        method: 'PATCH',
        body: {
          status: status
        }
      }
    );

    await loadAdminOrders(false);

    await loadDashboard();

  } catch (error) {
    console.error(
      'Update order status error:',
      error
    );

    alert(
      'Erreur lors de la modification du statut :\n\n' +
      error.message
    );

    await loadAdminOrders(false);

  } finally {
    if (selectElement) {
      selectElement.disabled = false;

      if (
        selectElement.parentNode
      ) {
        selectElement.value =
          oldValue;
      }
    }
  }
}

// =========================
// CUSTOMERS
// =========================
async function loadAdminCustomers() {
  try {
    const users =
      await api('/admin/users');

    const table =
      document.getElementById(
        'customersTable'
      );

    const tbody =
      table?.querySelector(
        'tbody'
      );

    if (!tbody) {
      return;
    }

    tbody.innerHTML =
      users
        .map(
          u => `
            <tr>

              <td>
                #${u.id}
              </td>

              <td>
                <strong>
                  ${escapeHtml(
                    u.firstName || ''
                  )}

                  ${escapeHtml(
                    u.lastName || ''
                  )}
                </strong>
              </td>

              <td>
                ${escapeHtml(
                  u.email || ''
                )}
              </td>

              <td>
                ${escapeHtml(
                  u.phone || '-'
                )}
              </td>

              <td>
                <span
                  class="
                    badge ${
                      u.role === 'ADMIN'
                        ? 'badge-premium'
                        : 'badge-new'
                    }
                  "
                >
                  ${escapeHtml(
                    u.role
                  )}
                </span>
              </td>

              <td>
                ${new Date(
                  u.createdAt
                ).toLocaleDateString(
                  'fr-FR'
                )}
              </td>

              <td
                style="
                  white-space:nowrap
                "
              >

                <button class="btn-sm btn-edit" onclick="viewUserDetails(${u.id})" title="Historique des achats">👁️</button>

                <button class="btn-sm btn-edit" onclick="editUser(${u.id})" title="Modifier">✏️</button>

                <button
                  class="btn-sm btn-delete"
                  onclick="
                    deleteUser(${u.id})
                  "
                  title="Supprimer"
                >
                  🗑️
                </button>

              </td>

            </tr>
          `
        )
        .join('');

  } catch (error) {
    console.error(
      'Customers error:',
      error
    );
  }
}

async function viewUserDetails(id) {
  try {
    const data = await api('/admin/users/' + id);
    const u = data.user;
    const orders = Array.isArray(u.orders) ? u.orders : [];
    const old = document.getElementById('customerDetailsModal');
    if (old) old.remove();
    const ordersHtml = orders.length ? orders.map(o => {
      const items = (o.items || []).map(item => '<div class="customer-order-item"><span>' + escapeHtml(item.name) + '</span><strong>' + Number(item.quantity || 0) + ' × ' + Number(item.price || 0).toFixed(3) + ' TND</strong></div>').join('');
      return '<div class="customer-order-card"><div class="customer-order-head"><div><strong>' + escapeHtml(o.orderNumber) + '</strong><small>' + new Date(o.createdAt).toLocaleString('fr-FR') + '</small></div><strong>' + Number(o.total || 0).toFixed(2) + ' TND</strong></div><div class="customer-order-meta"><span>📦 ' + escapeHtml(o.status) + '</span><span>💳 ' + escapeHtml(o.paymentStatus) + '</span><span>💰 ' + escapeHtml(o.paymentMethod) + '</span></div><div class="customer-order-address">📍 ' + escapeHtml([o.address, o.city, o.governorate, o.postalCode].filter(Boolean).join(', ')) + '</div><div class="customer-order-items">' + items + '</div></div>';
    }).join('') : '<div class="customer-empty-history">Aucune commande pour ce client.</div>';
    const modal = document.createElement('div');
    modal.id = 'customerDetailsModal';
    modal.className = 'customer-details-modal';
    modal.innerHTML = '<div class="customer-details-backdrop" onclick="this.parentElement.remove()"></div><div class="customer-details-panel"><button class="customer-details-close" onclick="document.getElementById(\'customerDetailsModal\').remove()">×</button><div class="customer-details-header"><div><span class="customer-details-kicker">FICHE CLIENT</span><h2>' + escapeHtml((u.firstName || '') + ' ' + (u.lastName || '')) + '</h2><p>' + escapeHtml(u.email || '') + '</p></div><div class="customer-details-avatar">👤</div></div><div class="customer-details-grid"><div><span>Pays</span><strong>🇹🇳 ' + escapeHtml(data.country || 'Tunisie') + '</strong></div><div><span>Téléphone</span><strong>' + escapeHtml(u.phone || '—') + '</strong></div><div><span>Ville</span><strong>' + escapeHtml(u.city || '—') + '</strong></div><div><span>Adresse</span><strong>' + escapeHtml(u.address || '—') + '</strong></div><div><span>Client depuis</span><strong>' + new Date(u.createdAt).toLocaleDateString('fr-FR') + '</strong></div><div><span>Commandes</span><strong>' + orders.length + '</strong></div></div><div class="customer-history-title"><h3>Historique des achats</h3><span>' + orders.length + ' commande(s)</span></div><div class="customer-history-list">' + ordersHtml + '</div></div>';
    document.body.appendChild(modal);
  } catch (error) { alert(error.message); }
}

async function editUser(id) {
  try {
    const users =
      await api('/admin/users');

    const user =
      users.find(
        item =>
          Number(item.id) ===
          Number(id)
      );

    if (!user) {
      alert(
        'Client introuvable'
      );

      return;
    }

    const firstName =
      prompt(
        'Prénom :',
        user.firstName || ''
      );

    if (firstName === null) {
      return;
    }

    const lastName =
      prompt(
        'Nom :',
        user.lastName || ''
      );

    if (lastName === null) {
      return;
    }

    const email =
      prompt(
        'Email :',
        user.email || ''
      );

    if (email === null) {
      return;
    }

    const phone =
      prompt(
        'Téléphone :',
        user.phone || ''
      );

    if (phone === null) {
      return;
    }

    const address =
      prompt(
        'Adresse :',
        user.address || ''
      );

    if (address === null) {
      return;
    }

    const city =
      prompt(
        'Ville :',
        user.city || ''
      );

    if (city === null) {
      return;
    }

    const role =
      prompt(
        'Rôle (CUSTOMER ou ADMIN) :',
        user.role || 'CUSTOMER'
      );

    if (role === null) {
      return;
    }

    const normalizedRole =
      role
        .trim()
        .toUpperCase();

    if (
      normalizedRole !==
        'CUSTOMER' &&
      normalizedRole !==
        'ADMIN'
    ) {
      alert(
        'Le rôle doit être CUSTOMER ou ADMIN.'
      );

      return;
    }

    await api(
      '/admin/users/' + id,
      {
        method: 'PATCH',
        body: {
          firstName:
            firstName.trim(),

          lastName:
            lastName.trim(),

          email:
            email.trim(),

          phone:
            phone.trim() || null,

          address:
            address.trim() || null,

          city:
            city.trim() || null,

          role:
            normalizedRole
        }
      }
    );

    alert(
      'Client modifié avec succès !'
    );

    await loadAdminCustomers();

    await loadDashboard();

  } catch (error) {
    alert(error.message);
  }
}

async function deleteUser(id) {
  if (
    !confirm(
      'Voulez-vous vraiment supprimer ce client ?'
    )
  ) {
    return;
  }

  try {
    await api(
      '/admin/users/' + id,
      {
        method: 'DELETE'
      }
    );

    alert(
      'Client supprimé avec succès !'
    );

    await loadAdminCustomers();

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
// AUTO REFRESH
// =========================
function startAutoRefresh() {
  if (autoRefreshTimer) {
    clearInterval(
      autoRefreshTimer
    );
  }

  autoRefreshTimer =
    setInterval(
      async () => {
        try {
          await loadAdminOrders(
            true
          );

          const dashboard =
            document.getElementById(
              'dashboard'
            );

          if (
            dashboard &&
            dashboard.classList.contains(
              'active'
            )
          ) {
            await loadDashboard();
          }

        } catch (error) {
          console.error(
            'Auto refresh error:',
            error
          );
        }
      },
      15000
    );
}

// =========================
// INIT
// =========================
document.addEventListener(
  'DOMContentLoaded',
  async () => {

    const adminOk =
      await checkAdmin();

    if (!adminOk) {
      return;
    }

    await requestNotificationPermission();

    await loadDashboard();

    await loadAdminOrders(
      false
    );

    startAutoRefresh();
  }
);
