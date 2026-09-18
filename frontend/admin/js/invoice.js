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

    const rows = items.map(item => {
      const qty = Number(item.quantity || 0);
      const price = Number(item.price || 0);
      return '<tr>' +
        '<td>' + escapeHtml(item.name || '') + '</td>' +
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
            <div>
              <div class="invoice-brand">Rainbow <span>Colors</span></div>
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
              <span>CLIENT</span>
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
                <th>Produit</th>
                <th>Qté</th>
                <th>Prix unitaire</th>
                <th>Total</th>
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

          <div class="invoice-footer">
            Merci pour votre confiance — Rainbow Colors
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
      padding: 24px;
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
      padding: 42px;
      color:#172033;
      background:#fff;
    }

    .invoice-head {
      display:flex;
      justify-content:space-between;
      gap:25px;
      border-bottom:3px solid #2563eb;
      padding-bottom:18px;
    }

    .invoice-brand {
      font-size:28px;
      font-weight:900;
      color:#2563eb;
    }

    .invoice-brand span { color:#7c3aed; }
    .invoice-muted { color:#64748b; font-size:12px; margin-top:5px; }

    .invoice-number { text-align:right; }
    .invoice-number div { font-size:21px; font-weight:900; }
    .invoice-number strong { display:block; margin-top:5px; }
    .invoice-number small { color:#64748b; }

    .invoice-info-grid {
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:18px;
      margin:24px 0;
    }

    .invoice-info-grid > div {
      background:#f8fafc;
      border:1px solid #e2e8f0;
      border-radius:10px;
      padding:15px;
      line-height:1.7;
    }

    .invoice-info-grid span {
      display:block;
      color:#64748b;
      font-size:11px;
      font-weight:800;
      letter-spacing:.08em;
      margin-bottom:5px;
    }

    .invoice-table { width:100%; border-collapse:collapse; }
    .invoice-table th {
      background:#f1f5f9;
      text-align:left;
      padding:11px;
      font-size:12px;
    }
    .invoice-table td {
      padding:11px;
      border-bottom:1px solid #e2e8f0;
      font-size:13px;
    }

    .invoice-totals {
      width:340px;
      max-width:100%;
      margin:24px 0 0 auto;
    }

    .invoice-totals > div {
      display:flex;
      justify-content:space-between;
      padding:6px 0;
    }

    .invoice-grand-total {
      border-top:2px solid #172033;
      margin-top:6px;
      padding-top:11px !important;
      font-size:19px;
      font-weight:900;
    }

    .invoice-footer {
      margin-top:45px;
      padding-top:15px;
      border-top:1px solid #e2e8f0;
      text-align:center;
      color:#64748b;
      font-size:11px;
    }

    @media (max-width: 700px) {
      #rainbowInvoiceModal { padding:8px; }
      .invoice-print-area { padding:20px; }
      .invoice-head { flex-direction:column; }
      .invoice-number { text-align:left; }
      .invoice-info-grid { grid-template-columns:1fr; }
      .rainbow-invoice-toolbar { align-items:flex-start; flex-direction:column; }
    }

    @media print {
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
        box-shadow:none !important;
        border-radius:0 !important;
      }
      .invoice-print-area { padding:0 !important; }
      @page { size:A4; margin:14mm; }
    }
  `;
  document.head.appendChild(style);

  window.generateAdminInvoice = generateAdminInvoice;

  waitForOrders();
})();