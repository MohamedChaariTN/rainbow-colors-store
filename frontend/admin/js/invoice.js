(() => {
  const waitForOrders = () => {
    const original = window.loadAdminOrders;

    if (typeof original !== 'function') {
      setTimeout(waitForOrders, 100);
      return;
    }

    if (original.__invoiceWrapped) return;

    async function wrappedLoadAdminOrders(...args) {
      const result = await original.apply(this, args);
      injectInvoiceButtons();
      return result;
    }

    wrappedLoadAdminOrders.__invoiceWrapped = true;
    window.loadAdminOrders = wrappedLoadAdminOrders;
  };

  function injectInvoiceButtons() {
    const rows = document.querySelectorAll('#ordersTable tbody tr');

    rows.forEach(row => {
      const select = row.querySelector('select[onchange*="updateOrderStatus"]');
      if (!select) return;

      const match = select.getAttribute('onchange').match(/updateOrderStatus\(\s*(\d+)/);
      if (!match) return;

      const id = match[1];
      const actionsCell = select.parentElement;

      if (actionsCell.querySelector('.invoice-action-btn')) return;

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn-sm btn-edit invoice-action-btn';
      button.style.marginLeft = '7px';
      button.title = 'Générer la facture';
      button.textContent = '🧾 Facture';
      button.addEventListener('click', () => generateAdminInvoice(id));

      actionsCell.appendChild(button);
    });
  }

  async function generateAdminInvoice(id) {
    try {
      const order = await api('/admin/orders/' + id);
      showInvoiceModal(order);
    } catch (error) {
      alert('Impossible de générer la facture :\n\n' + error.message);
      console.error('Invoice error:', error);
    }
  }

  function showInvoiceModal(order) {
    const old = document.getElementById('rainbowInvoiceModal');
    if (old) old.remove();

    const customer = [
      order.user?.firstName,
      order.user?.lastName
    ].filter(Boolean).join(' ') || 'Client';

    const payment =
      order.paymentMethod === 'card' ? 'Carte bancaire' :
      order.paymentMethod === 'cod' ? 'Paiement à la livraison' :
      'E-Dinar';

    const address = [
      order.address,
      order.city,
      order.governorate,
      order.postalCode
    ].filter(Boolean).join(', ') || '—';

    const items = Array.isArray(order.items) ? order.items : [];

    const rows = items.map((item, index) => {
      const qty = Number(item.quantity || 0);
      const price = Number(item.price || 0);
      const image = item.product?.image || '';
      const productImage = image
        ? '<img class="invoice-product-image" src="' + escapeHtml(image) + '" alt="" loading="eager" onerror="this.style.display=\'none\'">'
        : '';
      return '<tr>' +
        '<td class="invoice-index">' + (index + 1) + '</td>' +
        '<td><div class="invoice-product-cell">' + productImage + '<div><strong>' + escapeHtml(item.name || '') + '</strong></div></div></td>' +
        '<td>' + qty + '</td>' +
        '<td>' + price.toFixed(3) + ' TND</td>' +
        '<td>' + (qty * price).toFixed(3) + ' TND</td>' +
      '</tr>';
    }).join('');

    const modal = document.createElement('div');
    modal.id = 'rainbowInvoiceModal';
    modal.innerHTML = `
      <div class="rainbow-invoice-backdrop"></div>
      <div class="rainbow-invoice-shell">
        <div class="rainbow-invoice-toolbar">
          <strong>Facture ${escapeHtml(order.orderNumber || '')}</strong>
          <div>
            <button type="button" class="invoice-print-btn">🖨️ Imprimer / PDF</button>
            <button type="button" class="invoice-close-btn">✕ Fermer</button>
          </div>
        </div>

        <div class="invoice-print-area">
          <div class="invoice-head">
            <div class="invoice-company">
              <img class="invoice-logo" src="/images/logo%20ranbow%20colors.jpeg" alt="Rainbow Colors">
              <div class="invoice-muted">Peintures et matériaux de construction</div>
              <div class="invoice-muted">Sfax, Tunisie · +216 29 253 908</div>
            </div>
            <div class="invoice-number">
              <div>FACTURE</div>
              <strong>${escapeHtml(order.orderNumber || '')}</strong>
              <small>${new Date(order.createdAt).toLocaleDateString('fr-FR')}</small>
            </div>
          </div>

          <div class="invoice-info-grid">
            <div>
              <span>INFORMATIONS CLIENT</span>
              <strong>${escapeHtml(customer)}</strong>
              <div>${escapeHtml(order.user?.email || '')}</div>
              <div>${escapeHtml(order.user?.phone || '')}</div>
            </div>
            <div>
              <span>LIVRAISON & PAIEMENT</span>
              <strong>${escapeHtml(address)}</strong>
              <div>Paiement : ${escapeHtml(payment)}</div>
            </div>
          </div>

          <table class="invoice-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Produit</th>
                <th>Quantité</th>
                <th>Prix unitaire<br>(TND)</th>
                <th>Total<br>(TND)</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>

          <div class="invoice-totals">
            <div><span>Sous-total</span><strong>${Number(order.subtotal || 0).toFixed(3)} TND</strong></div>
            <div><span>Livraison</span><strong>${Number(order.shipping || 0).toFixed(3)} TND</strong></div>
            <div><span>TVA</span><strong>${Number(order.tax || 0).toFixed(3)} TND</strong></div>
            <div class="invoice-grand-total"><span>TOTAL</span><strong>${Number(order.total || 0).toFixed(3)} TND</strong></div>
          </div>

          <div class="invoice-bottom-message">
            <strong>Merci pour votre confiance !</strong>
            <span>Rainbow Colors</span>
          </div>
          <div class="invoice-color-footer" aria-hidden="true">
            <i></i><i></i><i></i><i></i><i></i>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('.rainbow-invoice-backdrop').onclick = () => modal.remove();
    modal.querySelector('.invoice-close-btn').onclick = () => modal.remove();
    modal.querySelector('.invoice-print-btn').onclick = () => {
      window.print();
    };
  }

  const style = document.createElement('style');
  style.textContent = `
    #rainbowInvoiceModal {
      position: fixed;
      inset: 0;
      z-index: 100000;
      background: rgba(8, 15, 30, .72);
      padding: 20px;
      overflow: auto;
    }

    .rainbow-invoice-backdrop {
      position: fixed;
      inset: 0;
    }

    .rainbow-invoice-shell {
      position: relative;
      width: min(980px, 100%);
      margin: 0 auto;
      background: #fff;
      border-radius: 18px;
      overflow: hidden;
      box-shadow: 0 30px 90px rgba(0,0,0,.3);
    }

    .rainbow-invoice-toolbar {
      display:flex;
      justify-content:space-between;
      align-items:center;
      gap:15px;
      padding:15px 18px;
      background:#101a33;
      color:#fff;
    }

    .rainbow-invoice-toolbar button {
      border:0;
      border-radius:9px;
      padding:9px 13px;
      margin-left:6px;
      cursor:pointer;
      font-weight:700;
    }

    .invoice-print-btn { background:#2563eb; color:#fff; }
    .invoice-close-btn { background:#fff; color:#172033; }

    .invoice-print-area {
      position: relative;
      min-height: 267mm;
      padding: 24px 28px 0;
      color:#172033;
      background:#fff;
      box-sizing:border-box;
      overflow:hidden;
    }

    .invoice-company { min-width:0; }
    .invoice-logo {
      display:block;
      width:225px;
      height:auto;
      max-height:92px;
      object-fit:contain;
      object-position:left center;
      margin-bottom:7px;
    }

    .invoice-muted {
      color:#64748b;
      font-size:11px;
      margin-top:4px;
    }

    .invoice-head {
      position:relative;
      z-index:2;
      display:flex;
      justify-content:space-between;
      align-items:flex-start;
      gap:25px;
      border-bottom:3px solid #1556a6;
      padding-bottom:14px;
    }

    .invoice-number {
      text-align:right;
      padding-top:8px;
      min-width:170px;
    }

    .invoice-number div {
      color:#1556a6;
      font-size:25px;
      font-weight:900;
      letter-spacing:.04em;
    }

    .invoice-number strong {
      display:block;
      margin-top:4px;
      font-size:14px;
    }

    .invoice-number small {
      display:block;
      margin-top:3px;
      color:#64748b;
    }

    .invoice-info-grid {
      position:relative;
      z-index:2;
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:16px;
      margin:17px 0;
    }

    .invoice-info-grid > div {
      background:linear-gradient(135deg,#f5f9ff,#edf5ff);
      border:1px solid #d9e7f7;
      border-radius:11px;
      padding:13px 15px;
      line-height:1.55;
      min-height:75px;
    }

    .invoice-info-grid span {
      display:block;
      color:#1556a6;
      font-size:10px;
      font-weight:900;
      letter-spacing:.08em;
      margin-bottom:5px;
    }

    .invoice-info-grid strong { display:block; font-size:14px; }
    .invoice-info-grid div div { font-size:11px; color:#334155; }

    .invoice-table {
      position:relative;
      z-index:2;
      width:100%;
      border-collapse:separate;
      border-spacing:0;
      overflow:hidden;
      border:1px solid #cbdced;
      border-radius:9px;
    }

    .invoice-table th {
      background:#1556a6;
      color:#fff;
      text-align:left;
      padding:9px 10px;
      font-size:10px;
      font-weight:800;
    }

    .invoice-table th:first-child { width:28px; text-align:center; }
    .invoice-table th:nth-child(3) { width:70px; text-align:center; }
    .invoice-table th:nth-child(4),
    .invoice-table th:nth-child(5) { width:105px; text-align:right; }

    .invoice-table td {
      padding:8px 10px;
      border-bottom:1px solid #e1eaf4;
      font-size:11px;
      vertical-align:middle;
      background:#fff;
    }

    .invoice-table tr:last-child td { border-bottom:0; }
    .invoice-table td:nth-child(3) { text-align:center; }
    .invoice-table td:nth-child(4),
    .invoice-table td:nth-child(5) { text-align:right; white-space:nowrap; }

    .invoice-index {
      text-align:center !important;
      font-weight:800;
      color:#1556a6;
    }

    .invoice-product-cell {
      display:flex;
      align-items:center;
      gap:9px;
      min-height:42px;
    }

    .invoice-product-image {
      width:42px;
      height:42px;
      object-fit:contain;
      flex:0 0 42px;
    }

    .invoice-product-cell strong { font-size:11px; }

    .invoice-bottom-grid {
      position:relative;
      z-index:2;
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:16px;
      margin-top:14px;
    }

    .invoice-side-card {
      background:#f5f9ff;
      border:1px solid #d9e7f7;
      border-radius:10px;
      padding:11px 13px;
      margin-bottom:9px;
      min-height:44px;
    }

    .invoice-side-card strong {
      display:block;
      color:#123f78;
      font-size:11px;
      margin-bottom:3px;
    }

    .invoice-side-card div {
      font-size:10px;
      color:#475569;
      line-height:1.45;
    }

    .invoice-totals {
      width:100%;
      max-width:390px;
      margin:0 0 0 auto;
    }

    .invoice-totals > div {
      display:flex;
      justify-content:space-between;
      padding:7px 4px;
      border-bottom:1px solid #dbe5ef;
      font-size:11px;
    }

    .invoice-grand-total {
      border:0 !important;
      border-radius:0 0 9px 9px;
      margin-top:3px;
      padding:12px 13px !important;
      background:linear-gradient(90deg,#ef176f,#ff9d00,#ffe600,#19b86b,#008fe8,#8a2be2);
      color:#fff;
      font-size:18px !important;
      font-weight:900;
    }

    .invoice-bottom-message {
      position:relative;
      z-index:2;
      margin:11px 0 8px;
      display:flex;
      justify-content:flex-end;
      align-items:center;
      gap:9px;
      color:#16457e;
      font-size:10px;
    }

    .invoice-bottom-message strong { font-size:12px; }

    .invoice-color-footer {
      position:absolute;
      left:-3%;
      right:-3%;
      bottom:-1px;
      height:30px;
      display:flex;
      align-items:flex-end;
      gap:0;
      transform:skewY(-2deg);
    }

    .invoice-color-footer i {
      display:block;
      height:18px;
      flex:1;
      border-radius:50% 50% 0 0;
    }

    .invoice-color-footer i:nth-child(1) { background:#ef176f; height:15px; }
    .invoice-color-footer i:nth-child(2) { background:#ff8a00; height:25px; }
    .invoice-color-footer i:nth-child(3) { background:#ffe000; height:18px; }
    .invoice-color-footer i:nth-child(4) { background:#20b86b; height:28px; }
    .invoice-color-footer i:nth-child(5) { background:#087fd1; height:21px; }

    @media (max-width: 700px) {
      #rainbowInvoiceModal { padding:8px; }
      .invoice-print-area { padding:18px 15px 0; }
      .invoice-logo { width:180px; }
      .invoice-head { flex-direction:column; }
      .invoice-number { text-align:left; padding-top:0; }
      .invoice-info-grid,
      .invoice-bottom-grid { grid-template-columns:1fr; }
      .rainbow-invoice-toolbar { align-items:flex-start; flex-direction:column; }
    }

    @media print {
      html, body { margin:0 !important; padding:0 !important; background:#fff !important; }
      body * { visibility:hidden !important; }
      #rainbowInvoiceModal,
      #rainbowInvoiceModal * { visibility:visible !important; }
      #rainbowInvoiceModal {
        position:static !important;
        background:#fff !important;
        padding:0 !important;
        overflow:visible !important;
      }
      .rainbow-invoice-backdrop,
      .rainbow-invoice-toolbar { display:none !important; }
      .rainbow-invoice-shell {
        width:100% !important;
        margin:0 !important;
        box-shadow:none !important;
        border-radius:0 !important;
        overflow:visible !important;
      }
      .invoice-print-area {
        width:100% !important;
        min-height:267mm !important;
        padding:0 !important;
        overflow:visible !important;
      }
      .invoice-color-footer { bottom:0 !important; }
      @page { size:A4; margin:10mm; }
    }
  `;
  document.head.appendChild(style);

  window.generateAdminInvoice = generateAdminInvoice;

  waitForOrders();
})();