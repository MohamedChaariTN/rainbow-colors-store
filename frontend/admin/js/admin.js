const API_URL = window.location.origin + '/api';
let authToken = localStorage.getItem('rc_token');
let currentUser = null;

async function api(endpoint, options = {}) {
  const res = await fetch(API_URL + endpoint, {
    headers: {
      'Content-Type': 'application/json',
      ...(authToken && { 'Authorization': 'Bearer ' + authToken }),
      ...options.headers
    },
    ...options,
    body: options.body && typeof options.body === 'object' && !(options.body instanceof FormData)
      ? JSON.stringify(options.body) : options.body
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

async function checkAdmin() {
  if (!authToken) return location.href = '../store/index.html';
  try {
    const data = await api('/auth/me');
    currentUser = data.user;
    if (currentUser.role !== 'ADMIN') {
      alert("Accès réservé aux administrateurs");
      return location.href = '../store/index.html';
    }
    document.getElementById('adminName').textContent = currentUser.firstName + ' ' + currentUser.lastName;
    document.querySelector('.admin-avatar').textContent = (currentUser.firstName[0] + currentUser.lastName[0]).toUpperCase();
  } catch {
    location.href = '../store/index.html';
  }
}

function logoutAdmin() {
  localStorage.removeItem('rc_token');
  location.href = '../store/index.html';
}

function showSection(id) {
  document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.admin-nav a').forEach(a => a.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  event.target.classList.add('active');
  document.getElementById('pageTitle').textContent = {
    dashboard: 'Tableau de bord',
    products: 'Gestion des produits',
    orders: 'Gestion des commandes',
    customers: 'Gestion des clients',
    categories: 'Catégories'
  }[id];
  if (id === 'products') loadAdminProducts();
  if (id === 'orders') loadAdminOrders();
  if (id === 'customers') loadAdminCustomers();
  if (id === 'categories') loadAdminCategories();
}

// ===== DASHBOARD =====
async function loadDashboard() {
  try {
    const data = await api('/admin/dashboard');
    document.getElementById('statProducts').textContent = data.stats.totalProducts;
    document.getElementById('statOrders').textContent = data.stats.totalOrders;
    document.getElementById('statUsers').textContent = data.stats.totalUsers;
    document.getElementById('statRevenue').textContent = data.stats.totalRevenue.toFixed(0);

    document.getElementById('recentOrders').innerHTML = data.recentOrders.length
      ? data.recentOrders.map(o => `
        <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--gray-100)">
          <div><strong>${o.orderNumber}</strong><div style="font-size:12px;color:var(--gray-400)">${o.user?.firstName||''} ${o.user?.lastName||''}</div></div>
          <div style="text-align:right"><div style="font-weight:700">${o.total.toFixed(2)} TND</div><span class="badge status-${o.status.toLowerCase()}">${o.status}</span></div>
        </div>`).join('')
      : '<p style="color:var(--gray-400);font-size:14px">Aucune commande</p>';

    document.getElementById('lowStock').innerHTML = data.lowStock.length
      ? data.lowStock.map(p => `
        <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--gray-100)">
          <span>${p.name}</span><span style="color:var(--danger);font-weight:700;font-size:13px">${p.stock} restant(s)</span>
        </div>`).join('')
      : '<p style="color:var(--gray-400);font-size:14px">Tout est en ordre</p>';
  } catch(e) { console.error(e); }
}

// ===== PRODUCTS =====
let editingProductId = null;

async function loadAdminProducts() {
  try {
    const data = await api('/admin/products/all');
    const tbody = document.querySelector('#productsTable tbody');
    tbody.innerHTML = data.map(p => `
      <tr>
        <td><img src="${p.image}" alt="${p.name}" onerror="this.src='../store/images/logo ranbow colors.jpeg'"></td>
        <td><strong>${p.name}</strong></td>
        <td>${p.category?.name || ''}</td>
        <td>${p.price.toFixed(2)} TND</td>
        <td>${p.stock}</td>
        <td><span class="badge badge-${p.stockStatus === 'IN_STOCK' ? 'new' : p.stockStatus === 'LOW_STOCK' ? 'sale' : 'eco'}">${p.stockStatus.replace('_',' ')}</span></td>
        <td>
          <button class="btn-sm btn-edit" onclick='editProduct(${JSON.stringify(p).replace(/'/g,"&#39;")})'>✏️</button>
          <button class="btn-sm btn-delete" onclick="deleteProduct(${p.id})">🗑️</button>
        </td>
      </tr>
    `).join('');
  } catch(e) { console.error(e); }
}

async function loadCategoriesSelect() {
  try {
    const cats = await api('/products/categories');
    document.getElementById('prodCategory').innerHTML = cats.map(c =>
      `<option value="${c.id}">${c.name}</option>`
    ).join('');
  } catch(e) {}
}

function openProductModal() {
  editingProductId = null;
  document.getElementById('productModalTitle').textContent = 'Ajouter un produit';
  document.getElementById('productForm').reset();
  document.getElementById('prodId').value = '';
  document.getElementById('productModal').classList.add('open');
  loadCategoriesSelect();
}

function closeProductModal() {
  document.getElementById('productModal').classList.remove('open');
}

function editProduct(p) {
  editingProductId = p.id;
  document.getElementById('productModalTitle').textContent = 'Modifier le produit';
  document.getElementById('prodId').value = p.id;
  document.getElementById('prodName').value = p.name;
  document.getElementById('prodSlug').value = p.slug;
  document.getElementById('prodDesc').value = p.description;
  document.getElementById('prodPrice').value = p.price;
  document.getElementById('prodOldPrice').value = p.oldPrice || '';
  document.getElementById('prodStock').value = p.stock;
  document.getElementById('prodStockStatus').value = p.stockStatus;
  document.getElementById('prodBadge').value = p.badge || '';
  const feats = JSON.parse(p.features || '[]');
  document.getElementById('prodFeatures').value = feats.join('\n');
  document.getElementById('productModal').classList.add('open');
  loadCategoriesSelect().then(() => {
    document.getElementById('prodCategory').value = p.categoryId;
  });
}

async function saveProduct(e) {
  e.preventDefault();
  const formData = new FormData();
  formData.append('name', document.getElementById('prodName').value);
  formData.append('slug', document.getElementById('prodSlug').value);
  formData.append('description', document.getElementById('prodDesc').value);
  formData.append('price', document.getElementById('prodPrice').value);
  const oldPrice = document.getElementById('prodOldPrice').value;
  if (oldPrice) formData.append('oldPrice', oldPrice);
  formData.append('stock', document.getElementById('prodStock').value);
  formData.append('stockStatus', document.getElementById('prodStockStatus').value);
  formData.append('badge', document.getElementById('prodBadge').value);
  formData.append('categoryId', document.getElementById('prodCategory').value);
  formData.append('features', JSON.stringify(document.getElementById('prodFeatures').value.split('\n').filter(f => f.trim())));
  const file = document.getElementById('prodImage').files[0];
  if (file) formData.append('image', file);

  try {
    const url = editingProductId ? `/admin/products/${editingProductId}` : '/admin/products';
    const method = editingProductId ? 'PATCH' : 'POST';
    await fetch(API_URL + url, {
      method,
      headers: { ...(authToken && { 'Authorization': 'Bearer ' + authToken }) },
      body: formData
    });
    closeProductModal();
    loadAdminProducts();
    loadDashboard();
    alert(editingProductId ? 'Produit modifié !' : 'Produit créé !');
  } catch(err) { alert(err.message); }
}

async function deleteProduct(id) {
  if (!confirm('Supprimer ce produit ?')) return;
  try {
    await api('/admin/products/' + id, { method: 'DELETE' });
    loadAdminProducts();
    loadDashboard();
  } catch(e) { alert(e.message); }
}

// ===== ORDERS =====
async function loadAdminOrders() {
  try {
    const orders = await api('/admin/orders');
    const tbody = document.querySelector('#ordersTable tbody');
    tbody.innerHTML = orders.map(o => `
      <tr>
        <td><strong>${o.orderNumber}</strong></td>
        <td>${o.firstName} ${o.lastName}<br><small style="color:var(--gray-400)">${o.email}</small></td>
        <td>${new Date(o.createdAt).toLocaleDateString('fr-FR')}</td>
        <td><strong>${o.total.toFixed(2)} TND</strong></td>
        <td>${o.paymentMethod === 'cod' ? '💵 COD' : o.paymentMethod === 'card' ? '💳 Carte' : '📮 E-Dinar'}<br><small>${o.paymentStatus}</small></td>
        <td><span class="badge status-${o.status.toLowerCase()}">${o.status}</span></td>
        <td>
          <select onchange="updateOrderStatus(${o.id}, this.value)" style="padding:6px 10px;border-radius:8px;border:1px solid var(--gray-300);font-size:13px">
            <option value="PENDING" ${o.status==='PENDING'?'selected':''}>En attente</option>
            <option value="CONFIRMED" ${o.status==='CONFIRMED'?'selected':''}>Confirmée</option>
            <option value="PROCESSING" ${o.status==='PROCESSING'?'selected':''}>En traitement</option>
            <option value="SHIPPED" ${o.status==='SHIPPED'?'selected':''}>Expédiée</option>
            <option value="DELIVERED" ${o.status==='DELIVERED'?'selected':''}>Livrée</option>
            <option value="CANCELLED" ${o.status==='CANCELLED'?'selected':''}>Annulée</option>
          </select>
        </td>
      </tr>
    `).join('');
  } catch(e) { console.error(e); }
}

async function updateOrderStatus(id, status) {
  try {
    await api('/admin/orders/' + id, { method: 'PATCH', body: { status } });
    loadAdminOrders();
  } catch(e) { alert(e.message); }
}

// ===== CUSTOMERS =====
async function loadAdminCustomers() {
  try {
    const users = await api('/admin/users');
    const tbody = document.querySelector('#customersTable tbody');
    tbody.innerHTML = users.map(u => `
      <tr>
        <td>#${u.id}</td>
        <td>${u.firstName} ${u.lastName}</td>
        <td>${u.email}</td>
        <td>${u.phone || '-'}</td>
        <td><span class="badge ${u.role === 'ADMIN' ? 'badge-premium' : 'badge-new'}">${u.role}</span></td>
        <td>${new Date(u.createdAt).toLocaleDateString('fr-FR')}</td>
      </tr>
    `).join('');
  } catch(e) { console.error(e); }
}

// ===== CATEGORIES =====
async function loadAdminCategories() {
  try {
    const cats = await api('/products/categories');
    document.getElementById('categoriesList').innerHTML = cats.map(c => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:16px;border-bottom:1px solid var(--gray-100)">
        <div style="display:flex;align-items:center;gap:12px">
          <span style="font-size:24px">${c.icon}</span>
          <div><strong>${c.name}</strong><p style="margin:0;font-size:13px;color:var(--gray-500)">${c.description || ''} · ${c._count?.products || 0} produits</p></div>
        </div>
        <span style="width:16px;height:16px;border-radius:50%;background:${c.color}"></span>
      </div>
    `).join('');
  } catch(e) { console.error(e); }
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  checkAdmin();
  loadDashboard();
});
