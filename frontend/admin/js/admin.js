/* =========================================================
   RAINBOW COLORS - ADMIN DASHBOARD
   Stable admin.js
   ========================================================= */

(function () {
  "use strict";

  // ---------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------

  function getToken() {
    return (
      localStorage.getItem("adminToken") ||
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      sessionStorage.getItem("adminToken") ||
      sessionStorage.getItem("token") ||
      ""
    );
  }

  function escapeHtml(value) {
    if (value === null || value === undefined) return "";
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatMoney(value) {
    const number = Number(value || 0);
    return number.toFixed(2) + " TND";
  }

  function formatDate(value) {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
  }

  function getValue(obj, keys, fallback = "") {
    for (const key of keys) {
      if (
        obj &&
        Object.prototype.hasOwnProperty.call(obj, key) &&
        obj[key] !== null &&
        obj[key] !== undefined
      ) {
        return obj[key];
      }
    }

    return fallback;
  }

  function findElement(ids) {
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) return el;
    }

    return null;
  }

  // ---------------------------------------------------------
  // Notifications
  // ---------------------------------------------------------

  function showNotification(message, type = "info") {
    let box = document.getElementById("adminNotification");

    if (!box) {
      box = document.createElement("div");
      box.id = "adminNotification";

      box.style.position = "fixed";
      box.style.top = "20px";
      box.style.right = "20px";
      box.style.zIndex = "99999";
      box.style.padding = "14px 18px";
      box.style.borderRadius = "10px";
      box.style.fontWeight = "600";
      box.style.maxWidth = "420px";
      box.style.boxShadow = "0 8px 30px rgba(0,0,0,.18)";
      box.style.fontFamily = "Arial, sans-serif";

      document.body.appendChild(box);
    }

    if (type === "success") {
      box.style.background = "#e8f7ee";
      box.style.color = "#157347";
      box.style.border = "1px solid #b7e4c7";
    } else if (type === "error") {
      box.style.background = "#fdecec";
      box.style.color = "#b42318";
      box.style.border = "1px solid #f5c2c7";
    } else {
      box.style.background = "#eef4ff";
      box.style.color = "#1d4ed8";
      box.style.border = "1px solid #c7d7fe";
    }

    box.textContent = message;
    box.style.display = "block";

    clearTimeout(box._timer);

    box._timer = setTimeout(function () {
      box.style.display = "none";
    }, 4000);
  }

  // ---------------------------------------------------------
  // API
  // ---------------------------------------------------------

  async function api(url, options = {}) {
    const headers = Object.assign(
      {
        "Content-Type": "application/json"
      },
      options.headers || {}
    );

    const token = getToken();

    if (token) {
      headers.Authorization = "Bearer " + token;
    }

    const response = await fetch(url, {
      ...options,
      headers
    });

    const text = await response.text();

    let data = {};

    if (text) {
      try {
        data = JSON.parse(text);
      } catch (e) {
        data = { raw: text };
      }
    }

    if (!response.ok) {
      const message =
        data?.error ||
        data?.message ||
        data?.raw ||
        `HTTP ${response.status}`;

      throw new Error(message);
    }

    return data;
  }

  // ---------------------------------------------------------
  // Sections
  // ---------------------------------------------------------

  function getSections() {
    return [
      {
        name: "dashboard",
        ids: ["dashboardSection", "dashboard", "section-dashboard"]
      },
      {
        name: "products",
        ids: ["productsSection", "products", "section-products"]
      },
      {
        name: "orders",
        ids: ["ordersSection", "orders", "section-orders"]
      },
      {
        name: "customers",
        ids: ["customersSection", "customers", "section-customers"]
      },
      {
        name: "categories",
        ids: ["categoriesSection", "categories", "section-categories"]
      }
    ];
  }

  function getSection(name) {
    const entry = getSections().find(function (item) {
      return item.name === name;
    });

    if (!entry) return null;

    return findElement(entry.ids);
  }

  function showSection(name) {
    const sections = getSections();

    sections.forEach(function (item) {
      const section = findElement(item.ids);

      if (!section) return;

      section.style.display = item.name === name ? "" : "none";
    });

    document.querySelectorAll(
      ".sidebar a, .sidebar button, .nav-item, .menu-item"
    ).forEach(function (el) {
      el.classList.remove("active");
    });

    document.querySelectorAll(
      `[data-section="${name}"], [data-page="${name}"]`
    ).forEach(function (el) {
      el.classList.add("active");
    });

    try {
      localStorage.setItem("adminCurrentSection", name);
    } catch (e) {}

    if (name === "dashboard") {
      loadDashboard();
    }

    if (name === "products") {
      loadProducts();
    }

    if (name === "orders") {
      loadOrders();
    }

    if (name === "customers") {
      loadCustomers();
    }

    if (name === "categories") {
      loadCategories();
    }
  }

  window.showSection = showSection;
  window.openSection = showSection;

  // Compatibility with older HTML
  window.showDashboard = function () {
    showSection("dashboard");
  };

  window.showProducts = function () {
    showSection("products");
  };

  window.showOrders = function () {
    showSection("orders");
  };

  window.showCustomers = function () {
    showSection("customers");
  };

  window.showCategories = function () {
    showSection("categories");
  };

  // ---------------------------------------------------------
  // Dashboard
  // ---------------------------------------------------------

  async function loadDashboard() {
    try {
      const data = await api("/admin/dashboard");

      renderDashboard(data);
    } catch (error) {
      console.error("Dashboard error:", error);

      // Don't break the page if the API fails.
      showNotification(
        "Impossible de charger certaines données du dashboard.",
        "error"
      );
    }
  }

  function renderDashboard(data) {
    const dashboard = data?.dashboard || data || {};

    const stats = {
      products: getValue(
        dashboard,
        ["totalProducts", "productsCount", "products"],
        0
      ),
      orders: getValue(
        dashboard,
        ["totalOrders", "ordersCount", "orders"],
        0
      ),
      users: getValue(
        dashboard,
        ["totalUsers", "usersCount", "customersCount", "customers"],
        0
      ),
      revenue: getValue(
        dashboard,
        ["totalRevenue", "revenue", "sales", "totalSales"],
        0
      )
    };

    const productElements = [
      document.getElementById("totalProducts"),
      document.getElementById("productsCount"),
      document.getElementById("statProducts")
    ];

    const orderElements = [
      document.getElementById("totalOrders"),
      document.getElementById("ordersCount"),
      document.getElementById("statOrders")
    ];

    const userElements = [
      document.getElementById("totalUsers"),
      document.getElementById("usersCount"),
      document.getElementById("totalCustomers"),
      document.getElementById("customersCount"),
      document.getElementById("statCustomers")
    ];

    const revenueElements = [
      document.getElementById("totalRevenue"),
      document.getElementById("revenue"),
      document.getElementById("statRevenue")
    ];

    productElements.forEach(function (el) {
      if (el) el.textContent = stats.products;
    });

    orderElements.forEach(function (el) {
      if (el) el.textContent = stats.orders;
    });

    userElements.forEach(function (el) {
      if (el) el.textContent = stats.users;
    });

    revenueElements.forEach(function (el) {
      if (el) el.textContent = formatMoney(stats.revenue);
    });

    const recentOrders =
      dashboard.recentOrders ||
      dashboard.orders ||
      data?.recentOrders ||
      [];

    const lowStock =
      dashboard.lowStock ||
      dashboard.lowStockProducts ||
      data?.lowStock ||
      [];

    renderRecentOrders(recentOrders);
    renderLowStock(lowStock);
  }

  function renderRecentOrders(orders) {
    const container = findElement([
      "recentOrders",
      "recentOrdersTable",
      "dashboardOrders"
    ]);

    if (!container) return;

    if (!Array.isArray(orders) || orders.length === 0) {
      container.innerHTML =
        '<div style="padding:20px;text-align:center;">Aucune commande récente.</div>';
      return;
    }

    const rows = orders
      .slice(0, 10)
      .map(function (order) {
        const reference = getValue(
          order,
          ["orderNumber", "reference", "code", "orderCode"],
          "#" + (order.id || "")
        );

        const customer =
          order.user?.name ||
          order.user?.firstName ||
          order.customer?.name ||
          order.customerName ||
          "Client";

        const total = getValue(
          order,
          ["total", "totalAmount", "amount"],
          0
        );

        const status = getValue(
          order,
          ["status", "orderStatus"],
          "PENDING"
        );

        return `
          <tr>
            <td>${escapeHtml(reference)}</td>
            <td>${escapeHtml(customer)}</td>
            <td>${formatMoney(total)}</td>
            <td>${escapeHtml(status)}</td>
            <td>${formatDate(order.createdAt)}</td>
          </tr>
        `;
      })
      .join("");

    const table =
      container.tagName === "TABLE"
        ? container
        : container.querySelector("table");

    if (table) {
      const tbody = table.querySelector("tbody");

      if (tbody) {
        tbody.innerHTML = rows;
      }
    } else {
      container.innerHTML = `
        <div style="overflow:auto;">
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr>
                <th>Commande</th>
                <th>Client</th>
                <th>Total</th>
                <th>Statut</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `;
    }
  }

  function renderLowStock(products) {
    const container = findElement([
      "lowStock",
      "lowStockProducts",
      "dashboardLowStock"
    ]);

    if (!container) return;

    if (!Array.isArray(products) || products.length === 0) {
      container.innerHTML =
        '<div style="padding:20px;text-align:center;">Aucun produit en stock faible.</div>';
      return;
    }

    const rows = products
      .slice(0, 10)
      .map(function (product) {
        const name = getValue(product, ["name", "title"], "Produit");
        const stock = getValue(
          product,
          ["stock", "quantity", "inventory"],
          0
        );

        return `
          <tr>
            <td>${escapeHtml(name)}</td>
            <td>${escapeHtml(stock)}</td>
          </tr>
        `;
      })
      .join("");

    container.innerHTML = `
      <div style="overflow:auto;">
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr>
              <th>Produit</th>
              <th>Stock</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }

  // ---------------------------------------------------------
  // Orders
  // ---------------------------------------------------------

  async function loadOrders() {
    try {
      const data = await api("/admin/orders");

      const orders = Array.isArray(data)
        ? data
        : data.orders || data.data || [];

      renderOrders(orders);
    } catch (error) {
      console.error("Orders error:", error);

      showNotification(
        "Impossible de charger les commandes.",
        "error"
      );
    }
  }

  function renderOrders(orders) {
    const container = findElement([
      "ordersTable",
      "ordersList",
      "ordersContainer",
      "adminOrders"
    ]);

    if (!container) return;

    const html = `
      <div style="overflow:auto;">
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr>
              <th>ID</th>
              <th>Commande</th>
              <th>Client</th>
              <th>Total</th>
              <th>Paiement</th>
              <th>Statut</th>
              <th>Date</th>
            </tr>
          </thead>

          <tbody>
            ${
              orders.length
                ? orders.map(function (order) {
                    return orderRow(order);
                  }).join("")
                : `
                  <tr>
                    <td colspan="7" style="text-align:center;padding:20px;">
                      Aucune commande.
                    </td>
                  </tr>
                `
            }
          </tbody>
        </table>
      </div>
    `;

    container.innerHTML = html;
  }

  function orderRow(order) {
    const id = order.id;

    const reference = getValue(
      order,
      ["orderNumber", "reference", "code"],
      "#" + id
    );

    const customer =
      order.user?.name ||
      order.user?.email ||
      order.customer?.name ||
      order.customerName ||
      "-";

    const total = getValue(
      order,
      ["total", "totalAmount", "amount"],
      0
    );

    const paymentStatus = getValue(
      order,
      ["paymentStatus"],
      "PENDING"
    );

    const status = getValue(
      order,
      ["status", "orderStatus"],
      "PENDING"
    );

    return `
      <tr>
        <td>${escapeHtml(id)}</td>

        <td>
          <strong>${escapeHtml(reference)}</strong>
        </td>

        <td>${escapeHtml(customer)}</td>

        <td>${formatMoney(total)}</td>

        <td>${escapeHtml(paymentStatus)}</td>

        <td>
          <select
            onchange="updateOrderStatusFromSelect(${Number(id)}, this)"
            style="padding:7px;border-radius:6px;"
          >
            ${statusOption("PENDING", status)}
            ${statusOption("CONFIRMED", status)}
            ${statusOption("PROCESSING", status)}
            ${statusOption("SHIPPED", status)}
            ${statusOption("DELIVERED", status)}
            ${statusOption("CANCELLED", status)}
          </select>
        </td>

        <td>${formatDate(order.createdAt)}</td>
      </tr>
    `;
  }

  function statusOption(value, current) {
    return `
      <option value="${value}" ${
        String(value) === String(current) ? "selected" : ""
      }>
        ${value}
      </option>
    `;
  }

  // ---------------------------------------------------------
  // UPDATE ORDER STATUS
  // ---------------------------------------------------------

  async function updateOrderStatusFromSelect(id, selectElement) {
    if (!id || !selectElement) return;

    const newStatus = selectElement.value;
    const oldStatus = selectElement.dataset.previous || newStatus;

    selectElement.disabled = true;

    try {
      await api("/admin/orders/" + id, {
        method: "PATCH",
        body: JSON.stringify({
          status: newStatus
        })
      });

      selectElement.dataset.previous = newStatus;

      showNotification(
        "Statut de la commande mis à jour.",
        "success"
      );

      loadDashboard();
    } catch (error) {
      console.error("Update order status error:", error);

      selectElement.value = oldStatus;

      showNotification(
        "Erreur : " + error.message,
        "error"
      );
    } finally {
      selectElement.disabled = false;
    }
  }

  window.updateOrderStatusFromSelect =
    updateOrderStatusFromSelect;

  async function updateOrderStatus(id, status, selectElement) {
    if (!id) return;

    const previous =
      selectElement?.dataset?.previous ||
      selectElement?.value ||
      "";

    if (selectElement) {
      selectElement.disabled = true;
    }

    try {
      await api("/admin/orders/" + id, {
        method: "PATCH",
        body: JSON.stringify({
          status: status
        })
      });

      if (selectElement) {
        selectElement.dataset.previous = status;
        selectElement.value = status;
      }

      showNotification(
        "Statut de la commande mis à jour.",
        "success"
      );

      loadDashboard();
    } catch (error) {
      console.error("Update order error:", error);

      if (selectElement && previous) {
        selectElement.value = previous;
      }

      showNotification(
        "Erreur : " + error.message,
        "error"
      );
    } finally {
      if (selectElement) {
        selectElement.disabled = false;
      }
    }
  }

  window.updateOrderStatus = updateOrderStatus;

  // ---------------------------------------------------------
  // Customers
  // ---------------------------------------------------------

  async function loadCustomers() {
    try {
      const data = await api("/admin/users");

      const users = Array.isArray(data)
        ? data
        : data.users || data.data || [];

      renderCustomers(users);
    } catch (error) {
      console.error("Customers error:", error);

      showNotification(
        "Impossible de charger les clients.",
        "error"
      );
    }
  }

  function renderCustomers(users) {
    const container = findElement([
      "customersTable",
      "customersList",
      "customersContainer",
      "adminCustomers",
      "usersTable"
    ]);

    if (!container) return;

    const rows = users
      .map(function (user) {
        const name =
          user.name ||
          [user.firstName, user.lastName]
            .filter(Boolean)
            .join(" ") ||
          "-";

        const role = user.role || "CUSTOMER";

        return `
          <tr>
            <td>${escapeHtml(user.id)}</td>
            <td>${escapeHtml(name)}</td>
            <td>${escapeHtml(user.email || "-")}</td>
            <td>${escapeHtml(user.phone || "-")}</td>
            <td>${escapeHtml(role)}</td>
            <td>${formatDate(user.createdAt)}</td>
            <td>
              <button
                type="button"
                onclick="editUser(${Number(user.id)})"
              >
                ✏️
              </button>

              <button
                type="button"
                onclick="deleteUser(${Number(user.id)})"
              >
                🗑️
              </button>
            </td>
          </tr>
        `;
      })
      .join("");

    container.innerHTML = `
      <div style="overflow:auto;">
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nom</th>
              <th>Email</th>
              <th>Téléphone</th>
              <th>Rôle</th>
              <th>Inscription</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            ${
              rows ||
              `
              <tr>
                <td colspan="7" style="text-align:center;padding:20px;">
                  Aucun client.
                </td>
              </tr>
              `
            }
          </tbody>
        </table>
      </div>
    `;
  }

  // ---------------------------------------------------------
  // Edit user
  // ---------------------------------------------------------

  async function editUser(id) {
    try {
      const name = prompt("Nom du client :");

      if (name === null) return;

      await api("/admin/users/" + id, {
        method: "PATCH",
        body: JSON.stringify({
          name: name
        })
      });

      showNotification(
        "Client modifié avec succès.",
        "success"
      );

      loadCustomers();
    } catch (error) {
      console.error(error);

      showNotification(
        "Erreur : " + error.message,
        "error"
      );
    }
  }

  window.editUser = editUser;

  // ---------------------------------------------------------
  // Delete user
  // ---------------------------------------------------------

  async function deleteUser(id) {
    if (!id) return;

    const confirmed = confirm(
      "Voulez-vous vraiment supprimer ce client ?"
    );

    if (!confirmed) return;

    try {
      await api("/admin/users/" + id, {
        method: "DELETE"
      });

      showNotification(
        "Client supprimé.",
        "success"
      );

      loadCustomers();
    } catch (error) {
      console.error(error);

      showNotification(
        "Erreur : " + error.message,
        "error"
      );
    }
  }

  window.deleteUser = deleteUser;

  // ---------------------------------------------------------
  // Products
  // ---------------------------------------------------------

  async function loadProducts() {
    try {
      const data = await api("/admin/products/all");

      const products = Array.isArray(data)
        ? data
        : data.products || data.data || [];

      renderProducts(products);
    } catch (error) {
      console.error("Products error:", error);

      showNotification(
        "Impossible de charger les produits.",
        "error"
      );
    }
  }

  function renderProducts(products) {
    const container = findElement([
      "productsTable",
      "productsList",
      "productsContainer",
      "adminProducts"
    ]);

    if (!container) return;

    const rows = products
      .map(function (product) {
        const name =
          product.name ||
          product.title ||
          "Produit";

        const price = getValue(
          product,
          ["price", "salePrice"],
          0
        );

        const stock = getValue(
          product,
          ["stock", "quantity", "inventory"],
          0
        );

        return `
          <tr>
            <td>${escapeHtml(product.id || "-")}</td>
            <td>${escapeHtml(name)}</td>
            <td>${formatMoney(price)}</td>
            <td>${escapeHtml(stock)}</td>
            <td>
              ${product.category?.name
                ? escapeHtml(product.category.name)
                : "-"
              }
            </td>
          </tr>
        `;
      })
      .join("");

    container.innerHTML = `
      <div style="overflow:auto;">
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr>
              <th>ID</th>
              <th>Produit</th>
              <th>Prix</th>
              <th>Stock</th>
              <th>Catégorie</th>
            </tr>
          </thead>

          <tbody>
            ${
              rows ||
              `
              <tr>
                <td colspan="5" style="text-align:center;padding:20px;">
                  Aucun produit.
                </td>
              </tr>
              `
            }
          </tbody>
        </table>
      </div>
    `;
  }

  // ---------------------------------------------------------
  // Categories
  // ---------------------------------------------------------

  async function loadCategories() {
    try {
      const data = await api("/admin/categories");

      const categories = Array.isArray(data)
        ? data
        : data.categories || data.data || [];

      renderCategories(categories);
    } catch (error) {
      console.error("Categories error:", error);

      showNotification(
        "Impossible de charger les catégories.",
        "error"
      );
    }
  }

  function renderCategories(categories) {
    const container = findElement([
      "categoriesTable",
      "categoriesList",
      "categoriesContainer",
      "adminCategories"
    ]);

    if (!container) return;

    const rows = categories
      .map(function (category) {
        return `
          <tr>
            <td>${escapeHtml(category.id)}</td>
            <td>${escapeHtml(category.name || "-")}</td>
            <td>${escapeHtml(category.slug || "-")}</td>
            <td>
              ${
                category._count?.products ??
                category.products?.length ??
                0
              }
            </td>
            <td>
              <button
                type="button"
                onclick="editCategory(${Number(category.id)})"
              >
                ✏️
              </button>

              <button
                type="button"
                onclick="deleteCategory(${Number(category.id)})"
              >
                🗑️
              </button>
            </td>
          </tr>
        `;
      })
      .join("");

    container.innerHTML = `
      <div style="overflow:auto;">
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nom</th>
              <th>Slug</th>
              <th>Produits</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            ${
              rows ||
              `
              <tr>
                <td colspan="5" style="text-align:center;padding:20px;">
                  Aucune catégorie.
                </td>
              </tr>
              `
            }
          </tbody>
        </table>
      </div>
    `;
  }

  async function editCategory(id) {
    const name = prompt("Nouveau nom de catégorie :");

    if (name === null || !name.trim()) return;

    try {
      await api("/admin/categories/" + id, {
        method: "PATCH",
        body: JSON.stringify({
          name: name.trim()
        })
      });

      showNotification(
        "Catégorie modifiée.",
        "success"
      );

      loadCategories();
    } catch (error) {
      console.error(error);

      showNotification(
        "Erreur : " + error.message,
        "error"
      );
    }
  }

  window.editCategory = editCategory;

  async function deleteCategory(id) {
    if (!id) return;

    const confirmed = confirm(
      "Voulez-vous supprimer cette catégorie ?"
    );

    if (!confirmed) return;

    try {
      await api("/admin/categories/" + id, {
        method: "DELETE"
      });

      showNotification(
        "Catégorie supprimée.",
        "success"
      );

      loadCategories();
    } catch (error) {
      console.error(error);

      showNotification(
        "Erreur : " + error.message,
        "error"
      );
    }
  }

  window.deleteCategory = deleteCategory;

  // ---------------------------------------------------------
  // Add category
  // ---------------------------------------------------------

  async function createCategory() {
    const name = prompt("Nom de la nouvelle catégorie :");

    if (name === null || !name.trim()) return;

    try {
      await api("/admin/categories", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim()
        })
      });

      showNotification(
        "Catégorie créée.",
        "success"
      );

      loadCategories();
    } catch (error) {
      console.error(error);

      showNotification(
        "Erreur : " + error.message,
        "error"
      );
    }
  }

  window.createCategory = createCategory;

  // ---------------------------------------------------------
  // Modal helpers
  // ---------------------------------------------------------

  function openModal(id) {
    const modal = document.getElementById(id);

    if (modal) {
      modal.classList.add("open");
      modal.style.display = "flex";
    }
  }

  function closeModal(id) {
    const modal = document.getElementById(id);

    if (modal) {
      modal.classList.remove("open");
      modal.style.display = "none";
    }
  }

  window.openModal = openModal;
  window.closeModal = closeModal;

  // ---------------------------------------------------------
  // Navigation click support
  // ---------------------------------------------------------

  document.addEventListener("click", function (event) {
    const target = event.target.closest(
      "[data-section], [data-page]"
    );

    if (!target) return;

    const section =
      target.getAttribute("data-section") ||
      target.getAttribute("data-page");

    if (!section) return;

    event.preventDefault();

    showSection(section);
  });

  // ---------------------------------------------------------
  // Initialize
  // ---------------------------------------------------------

  document.addEventListener("DOMContentLoaded", function () {
    console.log("Rainbow Colors Admin JS loaded successfully.");

    // Make sure modals are hidden
    document.querySelectorAll(".modal-overlay").forEach(function (modal) {
      if (!modal.classList.contains("open")) {
        modal.style.display = "none";
      }
    });

    // Restore previous section or dashboard
    let startSection = "dashboard";

    try {
      const saved = localStorage.getItem("adminCurrentSection");

      if (
        saved &&
        ["dashboard", "products", "orders", "customers", "categories"].includes(
          saved
        )
      ) {
        startSection = saved;
      }
    } catch (e) {}

    showSection(startSection);

    // Keep dashboard refreshed
    setInterval(function () {
      if (document.hidden) return;

      const dashboard = getSection("dashboard");

      if (
        dashboard &&
        dashboard.style.display !== "none"
      ) {
        loadDashboard();
      }
    }, 60000);
  });

  // ---------------------------------------------------------
  // Global functions
  // ---------------------------------------------------------

  window.loadDashboard = loadDashboard;
  window.loadOrders = loadOrders;
  window.loadCustomers = loadCustomers;
  window.loadProducts = loadProducts;
  window.loadCategories = loadCategories;

})();
