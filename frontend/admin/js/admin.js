
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

  const url = API_URL + endpoint;

  try {
    const res = await fetch(url, fetchOptions);

    const text = await res.text();

    let data = {};

    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = {
        raw: text
      };
    }

    if (!res.ok) {
      const message =
        data?.error ||
        data?.message ||
        data?.raw ||
        `HTTP ${res.status} ${res.statusText}`;

      throw new Error(message);
    }

    return data;

  } catch (error) {
    console.error('API ERROR:', {
      url,
      method: fetchOptions.method || 'GET',
      error
    });

    throw error;
  }
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
    loadAdminOrders(false);
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

  document.body.appendChild(notification);

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
          `${Number(order.total || 0).toFixed(2)} TND`
      }
    );
  }
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


// =========================
// DASHBOARD
// =========================
async function loadDashboard() {
  try {
    const data =
      await api('/admin/dashboard');

    document.getElementById(
      'statProducts'
    ).textContent =
      data.stats.totalProducts;

    document.getElementById(
      'statOrders'
    ).textContent =
      data.stats.totalOrders;

    document.getElementById(
      'statUsers'
    ).textContent =
      data.stats.totalUsers;

    document.getElementById(
      'statRevenue'
    ).textContent =
      Number(
        data.stats.totalRevenue || 0
      ).toFixed(2);


    document.getElementById(
      'recentOrders'
    ).innerHTML =
      data.recentOrders.length
        ? data.recentOrders.map(o => `
          <div style="
            display:flex;
            justify-content:space-between;
            padding:10px 0;
            border-bottom:1px solid var(--gray-100)
          ">

            <div>
              <strong>
                ${escapeHtml(o.orderNumber)}
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

            <div style="text-align:right">

              <div style="font-weight:700">
                ${Number(
                  o.total || 0
                ).toFixed(2)} TND
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
          <p style="
            color:var(--gray-400);
            font-size:14px
          ">
            Aucune commande
          </p>
        `;


    document.getElementById(
      'lowStock'
    ).innerHTML =
      data.lowStock.length
        ? data.lowStock.map(p => `
          <div style="
            display:flex;
            justify-content:space-between;
            padding:10px 0;
            border-bottom:1px solid var(--gray-100)
          ">

            <span>
              ${escapeHtml(p.name)}
            </span>

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
          <p style="
            color:var(--gray-400);
            font-size:14px
          ">
            Tout est en ordre
          </p>
        `;

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

async function loadAdminProducts() {
  try {
    const data =
      await api('/admin/products/all');

    const tbody =
      document.querySelector(
        '#productsTable tbody'
      );

    if (!tbody) return;

    tbody.innerHTML =
      data.map(p => `
        <tr>

          <td>
            <img
              src="${escapeHtml(
                p.image || ''
              )}"
              alt="${escapeHtml(p.name)}"
              onerror="
                this.src='../store/images/logo ranbow colors.jpeg'
              "
            >
          </td>

          <td>
            <strong>
              ${escapeHtml(p.name)}
            </strong>
          </td>

          <td>
            ${escapeHtml(
              p.category?.name || ''
            )}
          </td>

          <td>
            ${Number(
              p.price || 0
            ).toFixed(2)} TND
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
                String(
                  p.stockStatus || ''
                ).replace('_', ' ')
              )}
            </span>
          </td>

          <td>

            <button
              class="btn-sm btn-edit"
              onclick='editProduct(
                ${JSON.stringify(p)
                  .replace(/'/g, '&#39;')}
              )'
            >
              ✏️
            </button>

            <button
              class="btn-sm btn-delete"
              onclick="
                deleteProduct(${p.id})
              "
            >
              🗑️
            </button>

          </td>

        </tr>
      `).join('');

  } catch (error) {
    console.error(
      'Products error:',
      error
    );
  }
}


async function loadCategoriesSelect() {
  try {
    const cats =
      await api('/products/categories');

    const select =
      document.getElementById(
        'prodCategory'
      );

    if (!select) return;

    select.innerHTML =
      cats.map(c => `
        <option value="${c.id}">
          ${escapeHtml(c.name)}
        </option>
      `).join('');

  } catch (error) {
    console.error(
      'Category select error:',
      error
    );
  }
}


function openProductModal() {
  editingProductId = null;

  document.getElementById(
    'productModalTitle'
  ).textContent =
    'Ajouter un produit';

  document.getElementById(
    'productForm'
  ).reset();

  document.getElementById(
    'prodId'
  ).value = '';

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
  ).value =
    p.description || '';

  document.getElementById(
    'prodPrice'
  ).value = p.price;

  document.getElementById(
    'prodOldPrice'
  ).value =
    p.oldPrice || '';

  document.getElementById(
    'prodStock'
  ).value = p.stock;

  document.getElementById(
    'prodStockStatus'
  ).value =
    p.stockStatus;

  document.getElementById(
    'prodBadge'
  ).value =
    p.badge || '';

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

  document
    .getElementById('productModal')
    .classList.add('open');

  loadCategoriesSelect().then(() => {
    document.getElementById(
      'prodCategory'
    ).value =
      p.categoryId;
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

    const text =
      await response.text();

    let data = {};

    try {
      data =
        text
          ? JSON.parse(text)
          : {};
    } catch {
      data = {
        raw: text
      };
    }

    if (!response.ok) {
      throw new Error(
        data.error ||
        data.message ||
        data.raw ||
        `HTTP ${response.status}`
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
    console.error(
      'Save product error:',
      error
    );

    alert(
      'Erreur : ' +
      error.message
    );
  }
}


async function deleteProduct(id) {
  if (!confirm(
    'Supprimer ce produit ?'
  )) {
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
    alert(
      'Erreur : ' +
      error.message
    );
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
            !knownOrderIds.has(order.id)
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
      orders.map(o => {

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

        const status =
          o.status || 'PENDING';

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
                style="color:var(--gray-400)"
              >
                ${escapeHtml(email)}
              </small>

              <br>

              <small
                style="color:var(--gray-400)"
              >
                ${escapeHtml(phone)}
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
                ).toFixed(2)} TND
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
                class="badge status-${String(
                  status
                ).toLowerCase()}"
              >
                ${escapeHtml(status)}
              </span>
            </td>

            <td>

              <select
                data-order-id="${o.id}"
                data-current-status="${escapeHtml(
                  status
                )}"
                onchange="
                  updateOrderStatusFromSelect(
                    this
                  )
                "
                style="
                  padding:7px 10px;
                  border-radius:8px;
                  border:1px solid var(--gray-300);
                  font-size:13px;
                  min-width:145px;
                  background:white;
                "
              >

                <option
                  value="PENDING"
                  ${status === 'PENDING'
                    ? 'selected'
                    : ''}
                >
                  En attente
                </option>

                <option
                  value="CONFIRMED"
                  ${status === 'CONFIRMED'
                    ? 'selected'
                    : ''}
                >
                  Confirmée
                </option>

                <option
                  value="PROCESSING"
                  ${status === 'PROCESSING'
                    ? 'selected'
                    : ''}
                >
                  En traitement
                </option>

                <option
                  value="SHIPPED"
                  ${status === 'SHIPPED'
                    ? 'selected'
                    : ''}
                >
                  Expédiée
                </option>

                <option
                  value="DELIVERED"
                  ${status === 'DELIVERED'
                    ? 'selected'
                    : ''}
                >
                  Livrée
                </option>

                <option
                  value="CANCELLED"
                  ${status === 'CANCELLED'
                    ? 'selected'
                    : ''}
                >
                  Annulée
                </option>

              </select>

            </td>

          </tr>
        `;
      }).join('');

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
async function updateOrderStatusFromSelect(
  selectElement
) {
  const id =
    Number(
      selectElement.dataset.orderId
    );

  const previousStatus =
    selectElement.dataset.currentStatus;

  const newStatus =
    selectElement.value;

  if (!id) {
    alert(
      'ID de commande invalide.'
    );

    return;
  }

  if (!newStatus) {
    alert(
      'Statut invalide.'
    );

    return;
  }

  if (
    newStatus ===
    previousStatus
  ) {
    return;
  }

  selectElement.disabled = true;

  try {
    const result =
      await api(
        `/admin/orders/${id}`,
        {
          method: 'PATCH',

          body: {
            status: newStatus
          }
        }
      );

    console.log(
      'Order updated successfully:',
      result
    );

    selectElement.dataset.currentStatus =
      newStatus;

    await loadAdminOrders(false);
    await loadDashboard();

  } catch (error) {

    console.error(
      'Update order status error:',
      error
    );

    selectElement.value =
      previousStatus;

    alert(
      'Impossible de modifier la commande.\n\n' +
      'Erreur : ' +
      error.message
    );

  } finally {
    selectElement.disabled = false;
  }
}


// Keep old function name compatible
async function updateOrderStatus(
  id,
  status,
  selectElement = null
) {
  try {

    const result =
      await api(
        `/admin/orders/${id}`,
        {
          method: 'PATCH',
          body: {
            status
          }
        }
      );

    console.log(
      'Order updated successfully:',
      result
    );

    if (selectElement) {
      selectElement.dataset.currentStatus =
        status;
    }

    await loadAdminOrders(false);
    await loadDashboard();

  } catch (error) {

    console.error(
      'Update order status error:',
      error
    );

    if (selectElement) {
      selectElement.value =
        selectElement.dataset.currentStatus;
    }

    alert(
      'Impossible de modifier la commande.\n\n' +
      'Erreur : ' +
      error.message
    );
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
      table?.querySelector('tbody');

    if (!tbody) return;

    tbody.innerHTML =
      users.map(u => `
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
              class="badge ${
                u.role === 'ADMIN'
                  ? 'badge-premium'
                  : 'badge-new'
              }"
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

            <button
              class="btn-sm btn-edit"
              onclick="editUser(${u.id})"
              title="Modifier"
            >
              ✏️
            </button>

            <button
              class="btn-sm btn-delete"
              onclick="deleteUser(${u.id})"
              title="Supprimer"
            >
              🗑️
            </button>

          </td>

        </tr>
      `).join('');

  } catch (error) {
    console.error(
      'Customers error:',
      error
    );
  }
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

    if (firstName === null) return;

    const lastName =
      prompt(
        'Nom :',
        user.lastName || ''
      );

    if (lastName === null) return;

    const email =
      prompt(
        'Email :',
        user.email || ''
      );

    if (email === null) return;

    const phone =
      prompt(
        'Téléphone :',
        user.phone || ''
      );

    if (phone === null) return;

    const address =
      prompt(
        'Adresse :',
        user.address || ''
      );

    if (address === null) return;

    const city =
      prompt(
        'Ville :',
        user.city || ''
      );

    if (city === null) return;

    const role =
      prompt(
        'Rôle (CUSTOMER ou ADMIN) :',
        user.role || 'CUSTOMER'
      );

    if (role === null) return;

    const normalizedRole =
      role.trim().toUpperCase();

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
    alert(
      'Erreur : ' +
      error.message
    );
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
    alert(
      'Erreur : ' +
      error.message
    );
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

    if (!container) return;

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
            Ajouter, modifier ou supprimer une catégorie.
          </p>

        </div>

        <button
          class="btn btn-primary"
          onclick="createCategory()"
        >
          + Ajouter
        </button>

      </div>

      ${
        cats.length
          ? cats.map(c => `
            <div style="
              display:flex;
              justify-content:space-between;
              align-items:center;
              gap:15px;
              padding:16px;
              border-bottom:
                1px solid var(--gray-100);
              flex-wrap:wrap;
            ">

              <div style="
                display:flex;
                align-items:center;
                gap:12px;
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
                  font-size:22px;
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
                        ?.products || 0
                    }
                    produit(s)
                  </p>

                  <p style="
                    margin:3px 0 0;
                    font-size:12px;
                    color:var(--gray-400)
                  ">
                    Slug:
                    ${escapeHtml(
                      c.slug || ''
                    )}
                  </p>

                </div>

              </div>

              <div style="
                display:flex;
                align-items:center;
                gap:8px;
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
                  display:inline-block;
                "></span>

                <button
                  class="btn-sm btn-edit"
                  onclick="
                    editCategory(${c.id})
                  "
                  title="Modifier"
                >
                  ✏️
                </button>

                <button
                  class="btn-sm btn-delete"
                  onclick="
                    deleteCategory(${c.id})
                  "
                  title="Supprimer"
                >
                  🗑️
                </button>

              </div>

            </div>
          `).join('')
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

  if (name === null) return;

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

  if (slug === null) return;

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

  if (icon === null) return;

  const color =
    prompt(
      'Couleur hexadécimale :',
      '#2563eb'
    );

  if (color === null) return;

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
    alert(
      'Erreur : ' +
      error.message
    );
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

    if (name === null) return;

    const slug =
      prompt(
        'Slug :',
        category.slug || ''
      );

    if (slug === null) return;

    const description =
      prompt(
        'Description :',
        category.description || ''
      );

    if (description === null) {
      return;
    }

    const icon =
      prompt(
        'Icône / emoji :',
        category.icon || '📁'
      );

    if (icon === null) return;

    const color =
      prompt(
        'Couleur hexadécimale :',
        category.color ||
        '#2563eb'
      );

    if (color === null) return;

    await api(
      '/admin/categories/' + id,
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
    alert(
      'Erreur : ' +
      error.message
    );
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
      '/admin/categories/' + id,
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
    alert(
      'Erreur : ' +
      error.message
    );
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
```

