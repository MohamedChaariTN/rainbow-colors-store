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
    'Content-Type': 'application/json',
    ...(authToken
      ? { 'Authorization': 'Bearer ' + authToken }
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

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}


// =========================
// ADMIN AUTH
// =========================
async function checkAdmin() {
  if (!authToken) {
    location.href = '../store/index.html';
    return;
  }

  try {
    const data = await api('/auth/me');

    currentUser = data.user;

    if (currentUser.role !== 'ADMIN') {
      alert('Accès réservé aux administrateurs');
      location.href = '../store/index.html';
      return;
    }

    const adminName = document.getElementById('adminName');
    const avatar = document.querySelector('.admin-avatar');

    if (adminName) {
      adminName.textContent =
        currentUser.firstName + ' ' + currentUser.lastName;
    }

    if (avatar) {
      avatar.textContent = (
        (currentUser.firstName?.[0] || 'A') +
        (currentUser.lastName?.[0] || '')
      ).toUpperCase();
    }

  } catch (error) {
    console.error(error);
    localStorage.removeItem('rc_token');
    location.href = '../store/index.html';
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
    .forEach(section => section.classList.remove('active'));

  document
    .querySelectorAll('.admin-nav a')
    .forEach(link => link.classList.remove('active'));

  const section = document.getElementById(id);

  if (section) {
    section.classList.add('active');
  }

  const navLink = Array.from(
    document.querySelectorAll('.admin-nav a')
  ).find(link =>
    (link.getAttribute('onclick') || '').includes(
      `showSection('${id}')`
    )
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

  const pageTitle = document.getElementById('pageTitle');

  if (pageTitle) {
    pageTitle.textContent = titles[id] || 'Admin';
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
// NOTIFICATION UI
// =========================
function showNewOrderNotification(order) {
  const old = document.getElementById('newOrderNotification');

  if (old) {
    old.remove();
  }

  const notification = document.createElement('div');

  notification.id = 'newOrderNotification';

  notification.style.position = 'fixed';
  notification.style.top = '20px';
  notification.style.right = '20px';
  notification.style.zIndex = '99999';
  notification.style.width = '350px';
  notification.style.background = '#ffffff';
  notification.style.borderRadius = '14px';
  notification.style.padding = '18px';
  notification.style.boxShadow =
    '0 10px 40px rgba(0,0,0,0.18)';
  notification.style.border =
    '2px solid #2563eb';

  notification.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
      <div>
        <div style="font-size:18px;font-weight:800;color:#2563eb">
          🔔 Nouvelle commande
        </div>

        <div style="margin-top:8px;font-weight:700">
          ${escapeHtml(order.orderNumber || '')}
        </div>

        <div style="margin-top:5px;color:#666">
          ${escapeHtml(order.firstName || '')}
          ${escapeHtml(order.lastName || '')}
        </div>

        <div style="margin-top:5px;font-weight:700">
          ${Number(order.total || 0).toFixed(2)} TND
        </div>
      </div>

      <button
        id="closeNewOrderNotification"
        style="
          border:none;
          background:transparent;
          font-size:20px;
          cursor:pointer;
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
        color:white;
        font-weight:700;
        cursor:pointer;
      "
    >
      Voir les commandes
    </button>
  `;

  document.body.appendChild(notification);

  document
    .getElementById('closeNewOrderNotification')
    ?.addEventListener('click', () => {
      notification.remove();
    });

  document
    .getElementById('viewNewOrderButton')
    ?.addEventListener('click', () => {
      notification.remove();
      showSection('orders');
    });

  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 10000);

  // Browser notification
  if ('Notification' in window) {
    if (Notification.permission === 'granted') {
      new Notification('Nouvelle commande Rainbow Colors', {
        body:
          `${order.orderNumber} - ` +
          `${Number(order.total || 0).toFixed(2)} TND`
      });
    }
  }

  // Change page title
  document.title = '🔔 Nouvelle commande | Rainbow Colors';

  setTimeout(() => {
    document.title = 'Admin Dashboard | Rainbow Colors';
  }, 8000);
}


async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    return;
  }

  if (Notification.permission === 'default') {
    try {
      await Notification.requestPermission();
    } catch (error) {
      console.error(error);
    }
  }
}


function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}


// =========================
// DASHBOARD
// =========================
async function loadDashboard() {
  try {
    const data = await api('/admin/dashboard');

    document.getElementById('statProducts').textContent =
      data.stats.totalProducts;

    document.getElementById('statOrders').textContent =
      data.stats.totalOrders;

    document.getElementById('statUsers').textContent =
      data.stats.totalUsers;

    document.getElementById('statRevenue').textContent =
      Number(data.stats.totalRevenue || 0).toFixed(0);


    document.getElementById('recentOrders').innerHTML =
      data.recentOrders.length
        ? data.recentOrders.map(o => `
          <div style="
            display:flex;
            justify-content:space-between;
            padding:10px 0;
            border-bottom:1px solid var(--gray-100)
          ">
            <div>
              <strong>${escapeHtml(o.orderNumber)}</strong>

              <div style="
                font-size:12px;
                color:var(--gray-400)
              ">
                ${escapeHtml(o.user?.firstName || '')}
                ${escapeHtml(o.user?.lastName || '')}
              </div>
            </div>

            <div style="text-align:right">
              <div style="font-weight:700">
                ${Number(o.total || 0).toFixed(2)} TND
              </div>

              <span class="badge status-${String(
                o.status
              ).toLowerCase()}">
                ${escapeHtml(o.status)}
              </span>
            </div>
          </div>
        `).join('')
        : `
          <p style="color:var(--gray-400);font-size:14px">
            Aucune commande
          </p>
        `;


    document.getElementById('lowStock').innerHTML =
      data.lowStock.length
        ? data.lowStock.map(p => `
          <div style="
            display:flex;
            justify-content:space-between;
            padding:10px 0;
            border-bottom:1px solid var(--gray-100)
          ">
            <span>${escapeHtml(p.name)}</span>

            <span style="
              color:var(--danger);
              font-weight:700;
              font-size:13px
            ">
              ${p.stock} restant(s)
            </span>
          </div>
        `).join('')
        : `
          <p style="color:var(--gray-400);font-size:14px">
            Tout est en ordre
          </p>
        `;

  } catch (error) {
    console.error('Dashboard error:', error);
  }
}


// =========================
// PRODUCTS
// =========================
let editingProductId = null;

async function loadAdminProducts() {
  try {
    const data = await api('/admin/products/all');

    const tbody = document.querySelector(
      '#productsTable tbody'
    );

    tbody.innerHTML = data.map(p => `
      <tr>
        <td>
          <img
            src="${escapeHtml(p.image || '')}"
            alt="${escapeHtml(p.name)}"
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
          ${Number(p.price || 0).toFixed(2)} TND
        </td>

        <td>
          ${p.stock}
        </td>

        <td>
          <span class="badge badge-${
            p.stockStatus === 'IN_STOCK'
              ? 'new'
              : p.stockStatus === 'LOW_STOCK'
              ? 'sale'
              : 'eco'
          }">
            ${escapeHtml(
              String(p.stockStatus || '').replace('_', ' ')
            )}
          </span>
        </td>

        <td>
          <button
            class="btn-sm btn-edit"
            onclick='editProduct(${JSON.stringify(p)
              .replace(/'/g, "&#39;")})'
          >
            ✏️
          </button>

          <button
            class="btn-sm btn-delete"
            onclick="deleteProduct(${p.id})"
          >
            🗑️
          </button>
        </td>
      </tr>
    `).join('');

  } catch (error) {
    console.error('Products error:', error);
  }
}


async function loadCategoriesSelect() {
  try {
    const cats = await api('/products/categories');

    document.getElementById('prodCategory').innerHTML =
      cats.map(c => `
        <option value="${c.id}">
          ${escapeHtml(c.name)}
        </option>
      `).join('');

  } catch (error) {
    console.error(error);
  }
}


function openProductModal() {
  editingProductId = null;

  document.getElementById(
    'productModalTitle'
  ).textContent = 'Ajouter un produit';

  document.getElementById('productForm').reset();

  document.getElementById('prodId').value = '';

  document
    .getElementById('productModal')
    .classList.add('open');

  loadCategoriesSelect();
}


function closeProductModal() {
  document
    .getElementById('productModal')
    .classList.remove('open');
}


function editProduct(p) {
  editingProductId = p.id;

  document.getElementById(
    'productModalTitle'
  ).textContent = 'Modifier le produit';

  document.getElementById('prodId').value = p.id;
  document.getElementById('prodName').value = p.name;
  document.getElementById('prodSlug').value = p.slug;
  document.getElementById('prodDesc').value =
    p.description || '';
  document.getElementById('prodPrice').value = p.price;
  document.getElementById('prodOldPrice').value =
    p.oldPrice || '';
  document.getElementById('prodStock').value = p.stock;
  document.getElementById('prodStockStatus').value =
    p.stockStatus;
  document.getElementById('prodBadge').value =
    p.badge || '';

  let features = [];

  try {
    features = JSON.parse(p.features || '[]');
  } catch {
    features = [];
  }

  document.getElementById('prodFeatures').value =
    features.join('\n');

  document
    .getElementById('productModal')
    .classList.add('open');

  loadCategoriesSelect().then(() => {
    document.getElementById('prodCategory').value =
      p.categoryId;
  });
}


async function saveProduct(event) {
  event.preventDefault();

  const formData = new FormData();

  formData.append(
    'name',
    document.getElementById('prodName').value
  );

  formData.append(
    'slug',
    document.getElementById('prodSlug').value
  );

  formData.append(
    'description',
    document.getElementById('prodDesc').value
  );

  formData.append(
    'price',
    document.getElementById('prodPrice').value
  );

  const oldPrice =
    document.getElementById('prodOldPrice').value;

  if (oldPrice) {
    formData.append('oldPrice', oldPrice);
  }

  formData.append(
    'stock',
    document.getElementById('prodStock').value
  );

  formData.append(
    'stockStatus',
    document.getElementById('prodStockStatus').value
  );

  formData.append(
    'badge',
    document.getElementById('prodBadge').value
  );

  formData.append(
    'categoryId',
    document.getElementById('prodCategory').value
  );

  formData.append(
    'features',
    JSON.stringify(
      document
        .getElementById('prodFeatures')
        .value
        .split('\n')
        .filter(f => f.trim())
    )
  );

  const file =
    document.getElementById('prodImage').files[0];

  if (file) {
    formData.append('image', file);
  }

  try {
    const url = editingProductId
      ? `/admin/products/${editingProductId}`
      : '/admin/products';

    const method = editingProductId
      ? 'PATCH'
      : 'POST';

    const response = await fetch(
      API_URL + url,
      {
        method,
        headers: {
          ...(authToken
            ? {
                'Authorization':
                  'Bearer ' + authToken
              }
            : {})
        },
        body: formData
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.error || 'Erreur lors de l’enregistrement'
      );
    }

    closeProductModal();

    await loadAdminProducts();
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
  if (!confirm('Supprimer ce produit ?')) {
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
async function loadAdminOrders(showNotification = true) {
  try {
    const orders = await api('/admin/orders');

    if (!Array.isArray(orders)) {
      return;
    }

    // Detect new orders
    if (!firstOrdersLoad && showNotification) {
      const newOrders = orders.filter(
        order => !knownOrderIds.has(order.id)
      );

      if (newOrders.length > 0) {
        newOrders
          .slice(0, 3)
          .forEach(order => {
            showNewOrderNotification(order);
          });
      }
    }

    knownOrderIds = new Set(
      orders.map(order => order.id)
    );

    firstOrdersLoad = false;

    const tbody = document.querySelector(
      '#ordersTable tbody'
    );

    if (!tbody) {
      return;
    }

    if (!orders.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center;padding:30px;color:#999">
            Aucune commande
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = orders.map(o => {

      const paymentLabel =
        o.paymentMethod === 'cod'
          ? '💵 COD'
          : o.paymentMethod === 'card'
          ? '💳 Carte'
          : '📮 E-Dinar';

      return `
        <tr>

          <td>
            <strong>
              ${escapeHtml(o.orderNumber)}
            </strong>
          </td>

          <td>
            <strong>
              ${escapeHtml(o.firstName || '')}
              ${escapeHtml(o.lastName || '')}
            </strong>

            <br>

            <small style="color:var(--gray-400)">
              ${escapeHtml(o.email || '')}
            </small>

            <br>

            <small style="color:var(--gray-400)">
              ${escapeHtml(o.phone || '-')}
            </small>
          </td>

          <td>
            ${new Date(
              o.createdAt
            ).toLocaleString('fr-FR')}
          </td>

          <td>
            <strong>
              ${Number(o.total || 0).toFixed(2)} TND
            </strong>
          </td>

          <td>
            ${paymentLabel}
            <br>
            <small>
              ${escapeHtml(o.paymentStatus || 'PENDING')}
            </small>
          </td>

          <td>
            <span class="badge status-${String(
              o.status
            ).toLowerCase()}">
              ${escapeHtml(o.status)}
            </span>
          </td>

          <td>

            <select
              onchange="updateOrderStatus(${o.id}, this.value)"
              style="
                padding:6px 10px;
                border-radius:8px;
                border:1px solid var(--gray-300);
                font-size:13px
              "
            >

              <option
                value="PENDING"
                ${o.status === 'PENDING' ? 'selected' : ''}
              >
                En attente
              </option>

              <option
                value="CONFIRMED"
                ${o.status === 'CONFIRMED' ? 'selected' : ''}
              >
                Confirmée
              </option>

              <option
                value="PROCESSING"
                ${o.status === 'PROCESSING' ? 'selected' : ''}
              >
                En traitement
              </option>

              <option
                value="SHIPPED"
                ${o.status === 'SHIPPED' ? 'selected' : ''}
              >
                Expédiée
              </option>

              <option
                value="DELIVERED"
                ${o.status === 'DELIVERED' ? 'selected' : ''}
              >
                Livrée
              </option>

              <option
                value="CANCELLED"
                ${o.status === 'CANCELLED' ? 'selected' : ''}
              >
                Annulée
              </option>

            </select>

          </td>

        </tr>
      `;
    }).join('');

  } catch (error) {
    console.error('Orders error:', error);
  }
}


async function updateOrderStatus(id, status) {
  try {
    await api(
      '/admin/orders/' + id,
      {
        method: 'PATCH',
        body: {
          status
        }
      }
    );

    await loadAdminOrders(false);
    await loadDashboard();

  } catch (error) {
    alert(error.message);
  }
}


// =========================
// CUSTOMERS
// =========================
async function loadAdminCustomers() {
  try {
    const users = await api('/admin/users');

    const tbody = document.querySelector(
      '#customersTable tbody'
    );

    tbody.innerHTML = users.map(u => `
      <tr>

        <td>#${u.id}</td>

        <td>
          ${escapeHtml(u.firstName || '')}
          ${escapeHtml(u.lastName || '')}
        </td>

        <td>
          ${escapeHtml(u.email || '')}
        </td>

        <td>
          ${escapeHtml(u.phone || '-')}
        </td>

        <td>
          <span class="badge ${
            u.role === 'ADMIN'
              ? 'badge-premium'
              : 'badge-new'
          }">
            ${escapeHtml(u.role)}
          </span>
        </td>

        <td>
          ${new Date(
            u.createdAt
          ).toLocaleDateString('fr-FR')}
        </td>

      </tr>
    `).join('');

  } catch (error) {
    console.error('Customers error:', error);
  }
}


// =========================
// CATEGORIES
// =========================
async function loadAdminCategories() {
  try {
    const cats = await api('/products/categories');

    document.getElementById('categoriesList').innerHTML =
      cats.map(c => `
        <div style="
          display:flex;
          justify-content:space-between;
          align-items:center;
          padding:16px;
          border-bottom:1px solid var(--gray-100)
        ">

          <div style="
            display:flex;
            align-items:center;
            gap:12px
          ">

            <span style="font-size:24px">
              ${escapeHtml(c.icon || '📁')}
            </span>

            <div>
              <strong>
                ${escapeHtml(c.name)}
              </strong>

              <p style="
                margin:0;
                font-size:13px;
                color:var(--gray-500)
              ">
                ${escapeHtml(c.description || '')}
                ·
                ${c._count?.products || 0}
                produits
              </p>
            </div>

          </div>

          <span style="
            width:16px;
            height:16px;
            border-radius:50%;
            background:${escapeHtml(c.color || '#ccc')}
          "></span>

        </div>
      `).join('');

  } catch (error) {
    console.error('Categories error:', error);
  }
}


// =========================
// AUTO REFRESH
// =========================
function startAutoRefresh() {
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer);
  }

  autoRefreshTimer = setInterval(async () => {

    try {
      await loadAdminOrders(true);

      const dashboard = document.getElementById('dashboard');

      if (
        dashboard &&
        dashboard.classList.contains('active')
      ) {
        await loadDashboard();
      }

    } catch (error) {
      console.error(
        'Auto refresh error:',
        error
      );
    }

  }, 15000);
}


// =========================
// INIT
// =========================
document.addEventListener(
  'DOMContentLoaded',
  async () => {

    await checkAdmin();

    await requestNotificationPermission();

    await loadDashboard();

    // First load without notification
    await loadAdminOrders(false);

    startAutoRefresh();
  }
);
