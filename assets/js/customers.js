/* ================================================================
   customers.js — إدارة العملاء — alfaprosys
   شاشة مشتركة: تتكيف مع دور الكاشير والمدير
   أنواع: regular | contract | vip | delivery
   ================================================================ */

const DATA = window.DEMO_DATA;
let customers = JSON.parse(JSON.stringify(DATA.customers || []));

/* ── الدور ── */
const ROLE = (function () {
  const stored = sessionStorage.getItem('alfaprosys_role');
  if (stored) return stored;
  const ref = document.referrer || '';
  if (ref.includes('pos.html') || ref.includes('cashier')) return 'cashier';
  return 'manager';
})();

/* ── أدوات ── */
/* ── تصنيفات العملاء ── */
const CUST_TYPES = {
  regular:  { label: 'مباشر',   icon: '👤', color: 'muted'  },
  vip:      { label: 'VIP',     icon: '⭐', color: 'blue'   },
  delivery: { label: 'توصيل',   icon: '🛵', color: 'green'  },
};
function typeInfo(t) { return CUST_TYPES[t] || CUST_TYPES.regular; }

/* ================================================================
   قائمة التنقل — حسب الدور
   ================================================================ */
const MGR_NAV = window.AlfaNav.MGR_NAV;
const CURRENT = 'customers';
const navLink = window.AlfaNav.linker(CURRENT);

let navOpen = false;
function toggleNav() {
  navOpen = !navOpen;
  document.getElementById('mgrMobileNav')?.classList.toggle('expanded', navOpen);
  document.getElementById('mgrNavScrim')?.classList.toggle('show', navOpen);
}
function closeNav() {
  navOpen = false;
  document.getElementById('mgrMobileNav')?.classList.remove('expanded');
  document.getElementById('mgrNavScrim')?.classList.remove('show');
}

/* ── شاشة الكاشير: topbar بسيط ── */
function renderCashierShell(body) {
  return `
    <div class="customers-shell">
      <header class="customers-topbar">
        <div>
          <div class="pos-brand">alfaprosys</div>
          <div class="pos-subtitle">إدارة العملاء</div>
        </div>
        <a class="back-to-pos-btn" href="pos.html">← رجوع للبيع</a>
      </header>
      <main class="customers-content">${body}</main>
    </div>`;
}

/* ── شاشة المدير: sidebar كامل ── */
function renderManagerShell(body) {
  return `
    <div class="mgr-layout">
      <nav class="mgr-sidebar" id="mgrSidebar">
        <button class="mgr-side-toggle"
          onclick="document.getElementById('mgrSidebar').classList.toggle('expanded')">☰</button>
        <div class="mgr-side-logo"><strong>α</strong><span>alfaprosys</span></div>
        <div class="mgr-side-nav">${MGR_NAV.map(n => navLink(n)).join('')}</div>
        <div class="mgr-side-spacer"></div>
        <a class="mgr-side-link danger" href="index.html" onclick="sessionStorage.removeItem('alfaprosys_role')" title="خروج">
          <span class="mgr-side-ic">🚪</span><span class="mgr-side-lb">خروج</span>
        </a>
      </nav>
      <div class="mgr-content-panel">
        <div id="customersInner">${body}</div>
      </div>
    </div>
    <div class="mgr-nav-scrim" id="mgrNavScrim" onclick="closeNav()"></div>
    <button class="mgr-fab" onclick="toggleNav()">☰</button>
    <nav class="mgr-mobile-nav" id="mgrMobileNav">
      <div class="mgr-mobile-nav-head">
        <strong>قائمة الإدارة</strong>
        <button onclick="closeNav()">✕</button>
      </div>
      <div class="mgr-mobile-nav-grid">
        ${MGR_NAV.map(n => navLink(n, true)).join('')}
        <a class="mgr-mobile-nav-link danger" href="index.html" onclick="sessionStorage.removeItem('alfaprosys_role')">
          <span>🚪</span><small>خروج</small>
        </a>
      </div>
    </nav>`;
}

/* ================================================================
   حالة الفلاتر
   ================================================================ */
let searchTerm   = '';
let filterType   = 'all';  // all | regular | contract | vip | delivery
let detailOpenId = null;   // العميل المفتوح تفاصيله على الجوال

/* ================================================================
   بناء المحتوى
   ================================================================ */
let loyaltyView = false;
function setLoyaltyView(v){ loyaltyView = v; rebuildBody(); }

function buildBody() {
  if (ROLE === 'manager' && loyaltyView) return renderLoyaltyPage();
  const totals = {
    all: customers.length,
    regular:  customers.filter(c => c.type === 'regular').length,
    vip:      customers.filter(c => c.type === 'vip').length,
    delivery: customers.filter(c => c.type === 'delivery').length,
  };

  // إجمالي الذمم — يشمل كل العملاء
  const totalCredit  = customers.reduce((s, c) => s + (c.credit_balance || 0), 0);
  const debtorsCount = customers.filter(c => (c.credit_balance || 0) > 0).length;

  return `
    <!-- رأس الصفحة -->
    <div class="${ROLE === 'manager' ? 'mgr-page-header' : 'cust-inner-header'}">
      <div>
        ${ROLE === 'manager'
          ? `<div class="mgr-page-brand">alfaprosys</div>
             <div class="mgr-page-title">👥 العملاء</div>`
          : `<div class="cust-page-title">👥 العملاء</div>`}
      </div>
      <div style="display:flex;gap:8px;">
        ${ROLE === 'manager' ? `
        <button class="mgr-btn sm ${loyaltyView ? 'navy' : ''}" type="button" onclick="setLoyaltyView(${loyaltyView ? 'false' : 'true'})">
          ${loyaltyView ? '↩ رجوع للعملاء' : '🎁 الولاء'}
        </button>` : ''}
        <button class="${ROLE === 'manager' ? 'mgr-btn navy sm' : 'add-customer-btn'}"
          type="button" onclick="openAddModal()">+ زبون جديد</button>
      </div>
    </div>

    <!-- ملخص الذمم (للمدير فقط) -->
    ${ROLE === 'manager' ? `
    <div class="mgr-stats-grid" style="margin-bottom:12px;">
      <div class="mgr-stat-card">
        <div class="mgr-stat-lbl">إجمالي العملاء</div>
        <div class="mgr-stat-val">${totals.all}</div>
        <div class="mgr-stat-sub">زبون مسجل</div>
      </div>
      <div class="mgr-stat-card gold">
        <div class="mgr-stat-lbl">عملاء عليهم ذمم</div>
        <div class="mgr-stat-val">${debtorsCount}</div>
        <div class="mgr-stat-sub">عميل عليه ذمة</div>
      </div>
      <div class="mgr-stat-card red">
        <div class="mgr-stat-lbl">إجمالي الذمم</div>
        <div class="mgr-stat-val">${fmtNum(totalCredit)}</div>
        <div class="mgr-stat-sub">ل.س مستحقة</div>
      </div>
      ${totalCredit > 0 ? `
      <div class="mgr-stat-card red">
        <div class="mgr-stat-lbl">حالة الذمم</div>
        <div class="mgr-stat-val">${debtorsCount}</div>
        <div class="mgr-stat-sub">عميل بانتظار التسديد</div>
      </div>` : `
      <div class="mgr-stat-card green">
        <div class="mgr-stat-lbl">حالة الذمم</div>
        <div class="mgr-stat-val">✅</div>
        <div class="mgr-stat-sub">لا ذمم مستحقة</div>
      </div>`}
    </div>` : ''}

    <!-- فلتر النوع -->
    <div class="cust-type-strip">
      ${[
        { key: 'all',      label: 'الكل',    icon: '👥', count: totals.all      },
        { key: 'regular',  label: 'مباشر',   icon: '👤', count: totals.regular  },
        { key: 'vip',      label: 'VIP',     icon: '⭐', count: totals.vip      },
        { key: 'delivery', label: 'توصيل',   icon: '🛵', count: totals.delivery },
      ].map(f => `
        <button class="cust-type-chip ${filterType === f.key ? 'active' : ''}"
          onclick="setFilter('${f.key}')">
          ${f.icon} ${f.label} <span>${f.count}</span>
        </button>`).join('')}
    </div>

    <!-- بحث -->
    <div class="cust-search-bar">
      <span>🔍</span>
      <input id="custSearch" type="text" inputmode="search"
        placeholder="ابحث باسم الزبون أو رقم الهاتف…"
        oninput="onCustSearch(this.value)" value="${e(searchTerm)}" />
      <button id="custSearchClear" onclick="clearCustSearch()"
        style="display:${searchTerm ? '' : 'none'};">✕</button>
    </div>

    <!-- القائمة -->
    <div id="custListWrap">${renderList(filteredList())}</div>
  `;
}

/* ─── الفلتر والبحث ─── */
function filteredList() {
  let list = customers;
  if (filterType !== 'all') list = list.filter(c => c.type === filterType);
  if (searchTerm) {
    const q = searchTerm.toLowerCase();
    list = list.filter(c =>
      c.name?.toLowerCase().includes(q) ||
      c.phone?.includes(q) ||
      c.whatsapp?.includes(q) ||
      c.address?.toLowerCase().includes(q)
    );
  }
  return list;
}

function setFilter(t) {
  filterType = t;
  rebuildBody();
}
function onCustSearch(val) {
  searchTerm = val.trim().toLowerCase();
  document.getElementById('custSearchClear').style.display = searchTerm ? '' : 'none';
  document.getElementById('custListWrap').innerHTML = renderList(filteredList());
}
function clearCustSearch() {
  searchTerm = '';
  const inp = document.getElementById('custSearch');
  if (inp) inp.value = '';
  document.getElementById('custSearchClear').style.display = 'none';
  document.getElementById('custListWrap').innerHTML = renderList(filteredList());
}

/* ── القائمة الرئيسية ── */
function renderList(list) {
  if (!list.length) return `
    <div class="cust-empty">لا يوجد عملاء مطابقون</div>`;

  return `
    <div class="${ROLE === 'manager' ? 'mgr-card' : 'customers-card'}" style="padding:0;overflow:hidden;">
      ${list.map(c => renderCustomerRow(c)).join('')}
    </div>`;
}

function customerSource(c){
  if (c.source) return c.source;
  if (c.type === 'contract') return '📋 عقد';
  const ph = String(c.phone || '');
  const online = ((window.DEMO_DATA.online_orders) || []).some(o => o.customer && o.customer.phone === ph);
  return online ? '🛵 أونلاين' : '🖥️ POS';
}
function renderCustomerRow(c) {
  const ti = typeInfo(c.type);
  const balance = c.credit_balance || 0;
  const hasDebt = balance > 0;
  const isOpen = detailOpenId === c.id;

  return `
    <div class="cust-row ${isOpen ? 'open' : ''}" id="crow_${e(c.id)}">
      <!-- الصف الرئيسي -->
      <div class="cust-row-main" onclick="toggleDetail('${e(c.id)}')">
        <div class="cust-row-avatar ${c.type}">${ti.icon}</div>
        <div class="cust-row-info">
          <div class="cust-row-name">
            ${e(c.name)}
            <span class="cust-badge ${ti.color}">${ti.label}</span>
            ${hasDebt ? `<span class="cust-badge red">ذمة ${fmtNum(balance)}</span>` : ''}
          </div>
          <div class="cust-row-sub">
            <span dir="ltr">${e(c.phone || '—')}</span>
            <span class="cust-badge muted">${customerSource(c)}</span>
          </div>
        </div>
        <div class="cust-row-chevron ${isOpen ? 'open' : ''}">›</div>
      </div>

      <!-- تفاصيل قابلة للطي -->
      <div class="cust-row-detail ${isOpen ? 'open' : ''}">
        ${renderCustomerDetail(c)}
      </div>
    </div>`;
}

function renderCustomerDetail(c) {
  const ti = typeInfo(c.type);
  const balance = c.credit_balance || 0;
  const hasDebt = balance > 0;
  const payments = c.payments || [];
  const totalPaid = payments.reduce((s, p) => s + (p.amount || 0), 0);

  /* ── جلب الفواتير المرتبطة بهذا العميل ── */
  const ph = String(c.phone || '').trim();
  const custInvoices = (DATA.invoices || []).filter(inv =>
    (ph && String(inv.phone || '').trim() === ph) ||
    (c.name && inv.customer_name === c.name)
  );

  /* ── قسم الذمم والفواتير ── */
  let debtSection = '';
  if (hasDebt || custInvoices.length > 0) {
    debtSection = `
      <div class="cust-contract-block">
        <div class="cust-contract-title">📒 الذمم والفواتير</div>

        ${hasDebt ? `
        <div class="cust-credit-grid">
          <div class="cust-credit-cell">
            <div class="cust-credit-val red">${fmtNum(balance)}</div>
            <div class="cust-credit-lbl">الذمة الحالية (ل.س)</div>
          </div>
          <div class="cust-credit-cell">
            <div class="cust-credit-val green">${fmtNum(totalPaid)}</div>
            <div class="cust-credit-lbl">إجمالي المدفوع</div>
          </div>
          <div class="cust-credit-cell">
            <div class="cust-credit-val">${custInvoices.length}</div>
            <div class="cust-credit-lbl">عدد الفواتير</div>
          </div>
          ${c.next_due_date ? `
          <div class="cust-credit-cell">
            <div class="cust-credit-val">${e(c.next_due_date)}</div>
            <div class="cust-credit-lbl">📅 الاستحقاق</div>
          </div>` : ''}
        </div>

        <!-- زر تسديد + كشف حساب -->
        <div style="display:flex;gap:8px;margin:10px 0;">
          <button class="cust-detail-btn primary" style="flex:1;"
            onclick="event.stopPropagation();openAddPayment('${e(c.id)}')">
            💳 تسديد دفعة
          </button>
          <button class="cust-detail-btn" style="flex:1;background:#1e40af;color:#fff;"
            onclick="event.stopPropagation();showStatement('${e(c.id)}')">
            📊 كشف حساب
          </button>
        </div>` : ''}

        <!-- ── الفواتير المرتبطة ── -->
        ${custInvoices.length ? `
        <div class="cust-contract-title" style="margin-top:12px;">🧾 الفواتير (${custInvoices.length})</div>
        <div class="cust-payments-list">
          ${custInvoices.map(inv => {
            const statusMap = { open: '🔵 مفتوحة', printed: '✅ مطبوعة', pending: '⏳ معلقة', modified: '✏️ معدّلة', cancelled: '❌ ملغاة' };
            return `
            <div class="cust-payment-row" style="flex-direction:column;align-items:stretch;gap:4px;">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <div class="cust-payment-info">
                  <span class="cust-payment-date">📅 ${e(inv.date)} · ${e(inv.time || '')}</span>
                  <span class="cust-badge ${inv.status==='printed'?'green':inv.status==='cancelled'?'red':'blue'}">${statusMap[inv.status] || inv.status}</span>
                  <span class="cust-badge muted">${inv.type === 'dinein' ? '🍽️ طاولة' : inv.type === 'takeaway' ? '🥡 سفري' : inv.type === 'delivery' ? '🛵 توصيل' : inv.type}</span>
                </div>
                <div class="cust-payment-amount">${fmtNum(inv.total)} ل.س</div>
              </div>
              ${(inv.items || []).length ? `
              <div style="padding:4px 8px;background:var(--card-subtle,#f8f9fa);border-radius:8px;font-size:12px;">
                ${(inv.items || []).map(it => `
                  <div style="display:flex;justify-content:space-between;padding:2px 0;">
                    <span>${e(it.name)} × ${it.qty}</span>
                    <span>${fmtNum(it.total)}</span>
                  </div>
                `).join('')}
              </div>` : ''}
            </div>`;
          }).join('')}
        </div>` : ''}

        <!-- ── سجل الدفعات ── -->
        <div class="cust-payments-head" style="margin-top:12px;">
          <div class="cust-contract-title" style="margin:0;">💳 سجل الدفعات</div>
        </div>
        ${payments.length ? `
        <div class="cust-payments-list">
          ${payments.map(p => `
            <div class="cust-payment-row">
              <div class="cust-payment-info">
                <span class="cust-payment-date">📅 ${e(p.date)}</span>
                ${p.note ? `<span class="cust-payment-note">${e(p.note)}</span>` : ''}
                ${p.type ? `<span class="cust-badge ${p.type==='deferred'?'red':'blue'}">${p.type==='deferred'?'آجل':'جزئي'}</span>` : ''}
              </div>
              <div class="cust-payment-amount ${p.amount > 0 ? '' : 'red'}">${p.amount > 0 ? '+ ' : ''}${fmtNum(p.amount)} ل.س</div>
              ${ROLE === 'manager' ? `
                <button class="cust-action-btn danger sm"
                  onclick="event.stopPropagation();deletePayment('${e(c.id)}','${e(p.id)}')">🗑</button>
              ` : ''}
            </div>`).join('')}
        </div>` : `
        <div class="cust-no-payments">لا توجد دفعات مسجلة</div>`}
      </div>`;
  }

  return `
    <div class="cust-detail-inner">
      <!-- معلومات أساسية -->
      <div class="cust-detail-fields">
        <div class="cust-detail-field">
          <span>النوع</span>
          <strong><span class="cust-badge ${typeInfo(c.type).color}">${ti.icon} ${ti.label}</span></strong>
        </div>
        <div class="cust-detail-field">
          <span>رقم الهاتف</span>
          <strong dir="ltr">${e(c.phone || '—')}</strong>
        </div>
        ${c.whatsapp ? `<div class="cust-detail-field">
          <span>واتساب</span>
          <strong dir="ltr">${e(c.whatsapp)}</strong>
        </div>` : ''}
        ${c.address ? `<div class="cust-detail-field">
          <span>العنوان</span>
          <strong>${e(c.address)}</strong>
        </div>` : ''}
        ${c.notes ? `<div class="cust-detail-field full">
          <span>ملاحظات</span>
          <strong>${e(c.notes)}</strong>
        </div>` : ''}
      </div>

      ${debtSection}

      <!-- أزرار الإجراءات -->
      <div class="cust-detail-actions">
        <button class="cust-detail-btn primary" onclick="event.stopPropagation();openEditModal('${e(c.id)}')">
          ✏️ تعديل
        </button>
        ${ROLE === 'manager' ? `
        <button class="cust-detail-btn danger" onclick="event.stopPropagation();deleteCustomer('${e(c.id)}')">
          🗑 حذف
        </button>` : ''}
      </div>
    </div>`;
}

/* ================================================================
   toggle التفاصيل (accordion)
   ================================================================ */
function toggleDetail(id) {
  detailOpenId = detailOpenId === id ? null : id;
  document.getElementById('custListWrap').innerHTML = renderList(filteredList());
}

/* ================================================================
   مودال إضافة / تعديل العميل
   ================================================================ */
let editingId = null;

function openAddModal() {
  editingId = null;
  fillModal(null);
  showModal();
}
function openEditModal(id) {
  const c = customers.find(x => x.id === id);
  if (!c) return;
  editingId = id;
  fillModal(c);
  showModal();
}
function showModal() {
  document.getElementById('custModalScrim')?.classList.add('show');
  document.getElementById('custModal')?.classList.add('show');
  setTimeout(() => document.getElementById('custModalName')?.focus(), 60);
}
function closeCustomerModal() {
  document.getElementById('custModalScrim')?.classList.remove('show');
  document.getElementById('custModal')?.classList.remove('show');
}
function fillModal(c) {
  const isEdit = !!c;
  document.getElementById('custModalTitle').textContent = isEdit
    ? 'تعديل بيانات الزبون' : '+ إضافة زبون جديد';
  document.getElementById('custModalName').value       = c?.name     || '';
  document.getElementById('custModalPhone').value      = c?.phone    || '';
  document.getElementById('custModalWhatsapp').value   = c?.whatsapp || '';
  document.getElementById('custModalAddress').value    = c?.address  || '';
  document.getElementById('custModalNotes').value      = c?.notes    || '';
  document.getElementById('custModalType').value       = c?.type     || 'regular';
  onTypeChange(c?.type || 'regular', c);
}
function onTypeChange(type, c = null) {
  /* لا حقول إضافية — نوع العميل مباشر / VIP / توصيل فقط */
}
function saveCustomer() {
  const name     = document.getElementById('custModalName').value.trim();
  const phone    = document.getElementById('custModalPhone').value.trim();
  const whatsapp = document.getElementById('custModalWhatsapp').value.trim();
  const address  = document.getElementById('custModalAddress').value.trim();
  const notes    = document.getElementById('custModalNotes').value.trim();
  const type     = document.getElementById('custModalType').value;

  if (!name || !phone) { showToast('الاسم ورقم الهاتف مطلوبان', '⚠️'); return; }

  const base = { name, phone, whatsapp, address, notes, type };

  if (editingId) {
    const idx = customers.findIndex(c => c.id === editingId);
    if (idx > -1) {
      const old = customers[idx];
      customers[idx] = {
        ...old, ...base,
        payments: old.payments || [],
        contract_price_list: old.contract_price_list || '',
      };
    }
    showToast('تم تحديث بيانات الزبون', '✏️');
  } else {
    customers.unshift({ id: 'cus_' + Date.now(), ...base, payments: [] });
    showToast('تمت إضافة الزبون', '👥');
  }
  DATA.customers = customers;
  closeCustomerModal();
  rebuildBody();
  if (window.CustomerSync) CustomerSync.pushSoon();
}
function deleteCustomer(id) {
  if (!confirm('حذف هذا الزبون نهائياً؟')) return;
  customers = customers.filter(c => c.id !== id);
  DATA.customers = customers;
  detailOpenId = null;
  showToast('تم حذف الزبون', '🗑');
  rebuildBody();
  if (window.CustomerSync) { CustomerSync.remove(id); CustomerSync.pushSoon(); }
}

/* ================================================================
   مودال إضافة دفعة
   ================================================================ */
let paymentForId = null;
function openAddPayment(custId) {
  paymentForId = custId;
  const c = customers.find(x => x.id === custId);
  const balance = c ? (c.credit_balance || 0) : 0;
  document.getElementById('payModalDate').value   = new Date().toISOString().split('T')[0];
  document.getElementById('payModalAmount').value = '';
  document.getElementById('payModalNote').value   = '';
  /* عرض الذمة الحالية */
  const infoEl = document.getElementById('payModalDebtInfo');
  if (infoEl) {
    infoEl.innerHTML = c ? `
      <div style="display:flex;justify-content:space-between;padding:8px 12px;background:var(--card-subtle,#f1f5f9);border-radius:10px;margin-bottom:10px;">
        <span>الذمة الحالية: <strong class="red">${fmtNum(balance)} ل.س</strong></span>
        <span id="payModalRemaining"></span>
      </div>` : '';
  }
  document.getElementById('payModalScrim')?.classList.add('show');
  document.getElementById('payModal')?.classList.add('show');
  setTimeout(() => document.getElementById('payModalAmount')?.focus(), 60);
}
function updatePayModalRemaining() {
  const c = customers.find(x => x.id === paymentForId);
  if (!c) return;
  const balance = c.credit_balance || 0;
  const paid = Number(document.getElementById('payModalAmount')?.value) || 0;
  const rem = Math.max(0, balance - paid);
  const el = document.getElementById('payModalRemaining');
  if (el) {
    if (paid > 0) {
      el.innerHTML = rem > 0
        ? `المتبقي: <strong class="red">${fmtNum(rem)} ل.س</strong>`
        : `<strong class="green">✅ مسدّد بالكامل</strong>`;
    } else {
      el.innerHTML = '';
    }
  }
}
function closePayModal() {
  document.getElementById('payModalScrim')?.classList.remove('show');
  document.getElementById('payModal')?.classList.remove('show');
}
function savePayment() {
  const amount = Number(document.getElementById('payModalAmount').value);
  const date   = document.getElementById('payModalDate').value;
  const note   = document.getElementById('payModalNote').value.trim();
  if (!amount || !date) { showToast('المبلغ والتاريخ مطلوبان', '⚠️'); return; }

  const idx = customers.findIndex(c => c.id === paymentForId);
  if (idx < 0) return;
  if (!customers[idx].payments) customers[idx].payments = [];
  customers[idx].payments.unshift({
    id: 'pay_' + Date.now(), date, amount, note
  });
  // اخصم من الذمة
  customers[idx].credit_balance = Math.max(0,
    (customers[idx].credit_balance || 0) - amount);
  DATA.customers = customers;
  closePayModal();
  showToast('تمت إضافة الدفعة وتحديث الذمة', '💳');
  rebuildBody();
  if (window.CustomerSync) CustomerSync.pushSoon();
}
function deletePayment(custId, payId) {
  if (!confirm('حذف هذه الدفعة؟')) return;
  const idx = customers.findIndex(c => c.id === custId);
  if (idx < 0) return;
  const pay = (customers[idx].payments || []).find(p => p.id === payId);
  if (pay) {
    customers[idx].payments = customers[idx].payments.filter(p => p.id !== payId);
    // أعد الذمة
    customers[idx].credit_balance = (customers[idx].credit_balance || 0) + pay.amount;
  }
  DATA.customers = customers;
  showToast('تم حذف الدفعة', '🗑');
  rebuildBody();
}

/* ================================================================
   📊 كشف حساب العميل — كل الحركات مع رصيد متحرك
   ================================================================ */
function showStatement(custId) {
  const c = customers.find(x => x.id === custId);
  if (!c) return;
  const ph = String(c.phone || '').trim();

  /* 1) جمع الفواتير المرتبطة */
  const custInvoices = (DATA.invoices || []).filter(inv =>
    (ph && String(inv.phone || '').trim() === ph) ||
    (c.name && inv.customer_name === c.name)
  );

  /* 2) بناء حركات موحدة (فواتير + دفعات + إلغاءات) */
  const movements = [];
  custInvoices.forEach(inv => {
    const isDeferred = inv.pay_type === 'deferred';
    const isPartial  = inv.pay_type === 'partial';
    if (isDeferred || isPartial) {
      const invTotal = inv.total || 0;
      const paidAmt  = isPartial ? (inv.discount_detail && inv.discount_detail.partial_amount || 0) : 0;
      const debt     = isDeferred ? invTotal : Math.max(0, invTotal - paidAmt);
      const isCancelled = inv.status === 'cancelled';
      movements.push({
        date: inv.date || '', time: inv.time || '',
        type: 'invoice',
        desc: (isDeferred ? 'فاتورة آجل' : 'فاتورة جزئي') + ' #' + inv.id + (isCancelled ? ' ❌ ملغاة' : ''),
        invoice_id: inv.id, debit: isCancelled ? 0 : debt, credit: 0,
        items: inv.items || [], cancelled: isCancelled,
      });
      if (isPartial && paidAmt > 0 && !isCancelled) {
        movements.push({
          date: inv.date || '', time: inv.time || '',
          type: 'payment',
          desc: 'دفعة عند البيع — فاتورة #' + inv.id,
          invoice_id: inv.id, debit: 0, credit: paidAmt, items: [],
        });
      }
    }
  });
  (c.payments || []).forEach(p => {
    if (p.type === 'deferred') return;
    const isCancelRefund = p.type === 'cancel_refund';
    movements.push({
      date: p.date || '', time: '',
      type: isCancelRefund ? 'cancel' : 'payment',
      desc: p.note || (isCancelRefund ? 'إلغاء ذمة' : 'دفعة'),
      invoice_id: p.invoice_id || '',
      debit: 0, credit: Math.abs(p.amount || 0), items: [],
    });
  });

  /* 3) ترتيب زمني */
  movements.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  let running = 0;
  movements.forEach(m => { running += m.debit - m.credit; m.balance = running; });
  const totalDebit  = movements.reduce((s, m) => s + m.debit, 0);
  const totalCredit = movements.reduce((s, m) => s + m.credit, 0);
  const finalBalance = totalDebit - totalCredit;

  /* 4) ملء المودال الداخلي */
  const el = document.getElementById('statementBody');
  if (!el) return;
  document.getElementById('statementCustName').textContent = c.name || '';
  document.getElementById('statementCustPhone').textContent = c.phone || '—';
  document.getElementById('statementDate').textContent = new Date().toLocaleDateString('ar-EG');
  el.innerHTML = `
    <table class="stmt-table">
      <thead><tr><th>#</th><th>التاريخ</th><th>البيان</th><th>رقم الفاتورة</th><th>مدين (ذمة)</th><th>دائن (دفعة)</th><th>الرصيد</th></tr></thead>
      <tbody>
      ${movements.length ? movements.map((m, i) => `
        <tr class="${m.cancelled ? 'cancelled-row' : ''} ${m.type === 'cancel' ? 'cancel-row' : ''}">
          <td>${i + 1}</td>
          <td>${e(m.date)} ${m.time ? '· ' + e(m.time) : ''}</td>
          <td>${e(m.desc)}</td>
          <td>${m.invoice_id ? e(m.invoice_id) : '—'}</td>
          <td class="debit">${m.debit ? fmtNum(m.debit) : ''}</td>
          <td class="credit">${m.credit ? fmtNum(m.credit) : ''}</td>
          <td class="balance">${fmtNum(m.balance)}</td>
        </tr>`).join('') : '<tr><td colspan="7" style="text-align:center;padding:20px;">لا توجد حركات</td></tr>'}
      </tbody>
    </table>
    <div class="stmt-totals">
      <div><span>إجمالي الذمم</span><strong class="debit">${fmtNum(totalDebit)} ل.س</strong></div>
      <div><span>إجمالي الدفعات</span><strong class="credit">${fmtNum(totalCredit)} ل.س</strong></div>
      <div><span>الرصيد الحالي</span><strong class="balance">${fmtNum(finalBalance)} ل.س</strong></div>
    </div>`;
  document.getElementById('statementScrim')?.classList.add('show');
  document.getElementById('statementModal')?.classList.add('show');
}
function closeStatement() {
  document.getElementById('statementScrim')?.classList.remove('show');
  document.getElementById('statementModal')?.classList.remove('show');
}
function printStatement() {
  const content = document.getElementById('statementModal').innerHTML;
  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8">
<title>كشف حساب</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:Tahoma,sans-serif;padding:20px;color:#1e293b;font-size:13px;}
  .stmt-head{text-align:center;margin-bottom:16px;border-bottom:2px solid #1e40af;padding-bottom:10px;}
  .stmt-head h2{font-size:18px;color:#1e40af;}
  .stmt-info{display:flex;justify-content:space-between;margin-bottom:12px;font-size:12px;}
  .stmt-table{width:100%;border-collapse:collapse;}
  .stmt-table th{background:#1e40af;color:#fff;padding:6px;text-align:center;font-size:11px;}
  .stmt-table td{padding:5px 6px;border-bottom:1px solid #e2e8f0;font-size:11px;}
  .debit{color:#dc2626;font-weight:bold;}
  .credit{color:#16a34a;font-weight:bold;}
  .balance{font-weight:bold;color:#1e40af;}
  .stmt-totals{display:flex;justify-content:space-around;margin-top:12px;padding:10px;background:#1e40af;color:#fff;border-radius:8px;text-align:center;}
  .stmt-totals strong{display:block;font-size:14px;margin-top:4px;}
  .stmt-actions{display:none;}
</style></head><body>${content.replace(/stmt-modal/gi, '').replace(/stmt-actions[\s\S]*?<\/div>/g, '')}</body></html>`);
  win.document.close();
  win.print();
}

/* ================================================================
   إعادة البناء الكاملة
   ================================================================ */
function rebuildBody() {
  const body = buildBody();
  if (ROLE === 'manager') {
    document.getElementById('customersInner').innerHTML = body;
  } else {
    document.querySelector('.customers-content').innerHTML = body;
  }
}

/* ================================================================
   المودالات — HTML ثابت يُحقن مرة واحدة
   ================================================================ */
function modalsHTML() {
  return `
    <!-- مودال إضافة/تعديل العميل -->
    <div class="cust-modal-scrim" id="custModalScrim" onclick="closeCustomerModal()"></div>
    <div class="cust-modal" id="custModal" role="dialog">
      <div class="cust-modal-head">
        <span id="custModalTitle">إضافة زبون</span>
        <button onclick="closeCustomerModal()">✕</button>
      </div>
      <div class="cust-modal-body">
        <!-- النوع -->
        <label class="cust-field-label">نوع العميل
          <select id="custModalType" class="cust-field-input"
            onchange="onTypeChange(this.value)">
            <option value="regular">👤 مباشر</option>
            <option value="vip">⭐ VIP</option>
            <option value="delivery">🛵 توصيل</option>
          </select>
        </label>
        <!-- الحقول الأساسية -->
        <div class="cust-form-grid">
          <label class="cust-field-label">الاسم
            <input id="custModalName" class="cust-field-input" type="text"
              placeholder="اسم الزبون الكامل" />
          </label>
          <label class="cust-field-label">رقم الهاتف
            <input id="custModalPhone" class="cust-field-input" type="tel"
              inputmode="tel" placeholder="09xxxxxxxx" />
          </label>
          <label class="cust-field-label">رقم الواتساب (اختياري)
            <input id="custModalWhatsapp" class="cust-field-input" type="tel"
              inputmode="tel" placeholder="اختياري" />
          </label>
          <label class="cust-field-label">العنوان
            <input id="custModalAddress" class="cust-field-input" type="text"
              placeholder="العنوان الكامل" />
          </label>
          <label class="cust-field-label full">ملاحظات
            <input id="custModalNotes" class="cust-field-input" type="text"
              placeholder="ملاحظات إضافية (اختياري)" />
          </label>
        </div>

      </div>
      <div class="cust-modal-footer">
        <button class="mgr-btn navy" onclick="saveCustomer()">حفظ</button>
        <button class="mgr-btn outline" onclick="closeCustomerModal()">إلغاء</button>
      </div>
    </div>

    <!-- مودال تسجيل دفعة / تسديد -->
    <div class="cust-modal-scrim" id="payModalScrim" onclick="closePayModal()"></div>
    <div class="cust-modal" id="payModal" role="dialog">
      <div class="cust-modal-head">
        <span>💳 تسديد دفعة</span>
        <button onclick="closePayModal()">✕</button>
      </div>
      <div class="cust-modal-body">
        <div id="payModalDebtInfo"></div>
        <div class="cust-form-grid">
          <label class="cust-field-label full">المبلغ المدفوع (ل.س)
            <input id="payModalAmount" class="cust-field-input" type="number"
              inputmode="numeric" placeholder="أدخل المبلغ..."
              oninput="updatePayModalRemaining()" />
          </label>
          <label class="cust-field-label">التاريخ
            <input id="payModalDate" class="cust-field-input" type="date" />
          </label>
          <label class="cust-field-label">ملاحظة (اختياري)
            <input id="payModalNote" class="cust-field-input" type="text"
              placeholder="مثال: دفعة كاملة / دفعة جزئية" />
          </label>
        </div>
      </div>
      <div class="cust-modal-footer">
        <button class="mgr-btn navy" onclick="savePayment()">✅ تسجيل الدفعة</button>
        <button class="mgr-btn outline" onclick="closePayModal()">إلغاء</button>
      </div>
    </div>

    <!-- مودال كشف الحساب -->
    <div class="cust-modal-scrim" id="statementScrim" onclick="closeStatement()"></div>
    <div class="cust-modal" id="statementModal" role="dialog" style="max-width:720px;max-height:90vh;">
      <div class="cust-modal-head">
        <span>📊 كشف حساب — <span id="statementCustName"></span></span>
        <button onclick="closeStatement()">✕</button>
      </div>
      <div class="cust-modal-body" style="overflow-y:auto;max-height:calc(90vh - 140px);">
        <div style="text-align:center;margin-bottom:12px;">
          <strong style="color:#1e40af;font-size:15px;">كشف حساب عميل</strong>
          <div style="font-size:12px;color:#64748b;margin-top:4px;">
            📞 <span id="statementCustPhone"></span> · 📅 <span id="statementDate"></span>
          </div>
        </div>
        <div id="statementBody"></div>
      </div>
      <div class="cust-modal-footer" style="display:flex;gap:8px;justify-content:center;">
        <button class="mgr-btn navy" onclick="printStatement()">🖨️ طباعة</button>
        <button class="mgr-btn outline" onclick="closeStatement()">إغلاق</button>
      </div>
    </div>
  `;
}

/* ================================================================
   التهيئة
   ================================================================ */
function renderCustomers() {
  const body  = buildBody();
  const appEl = document.getElementById('customersApp');

  if (ROLE === 'manager') {
    appEl.classList.add('mgr-page-shell');
    appEl.innerHTML = renderManagerShell(body) + modalsHTML();
  } else {
    appEl.innerHTML = renderCashierShell(body) + modalsHTML();
  }
}

(window.alfaStart||function(fn){fn();})(function () {
  customers = JSON.parse(JSON.stringify(DATA.customers || []));
  renderCustomers();
  if (window.CustomerSync && CustomerSync.pull) {
    setInterval(function () {
      if (navigator.onLine === false) return;
      CustomerSync.pull().then(function () {
        customers = JSON.parse(JSON.stringify(DATA.customers || []));
        rebuildBody();
      }).catch(function () {});
    }, 15000);
  }
});

/* ================================================================
   🎁 الولاء — نقاط ومستويات ومكافآت (تبويب داخل شاشة العملاء)
   ================================================================ */
function renderLoyaltyPage(){
  const L = window.DEMO_DATA.loyalty;
  const rows = customers.map(cu => {
    const pts = Loyalty.points(cu);
    const earned = Loyalty.earned(cu);
    const lv = Loyalty.level(pts);
    return { cu, pts, earned, lv };
  }).sort((a, b) => b.pts - a.pts);
  const withPts = rows.filter(r => r.pts > 0);
  const totalPts = rows.reduce((s, r) => s + r.pts, 0);
  const redeems = (DEMO_DATA.loyalty_ledger || []).filter(l => l.type === 'redeem').length;

  const chip = (lbl, val, sub, cls='') =>
    `<div class="mgr-stat-card ${cls}"><div class="mgr-stat-lbl">${lbl}</div><div class="mgr-stat-val">${val}</div><div class="mgr-stat-sub">${sub}</div></div>`;

  return `
  <div class="mgr-stats-grid" style="margin-bottom:12px;">
    ${chip('عملاء بنقاط', withPts.length, `من ${customers.length} عميل`)}
    ${chip('إجمالي النقاط القائمة', fmtNum(totalPts), 'قابلة للاستبدال', 'gold')}
    ${chip('استبدالات', redeems, 'مكافآت مصروفة')}
    ${chip('أعلى عميل', withPts[0] ? withPts[0].cu.name.split(' ')[0] : '—', withPts[0] ? withPts[0].pts + ' نقطة · ' + withPts[0].lv.icon : 'لا نقاط بعد', '')}
  </div>

  <!-- إدارة المكافآت -->
  <div class="mgr-card" style="margin-bottom:12px;padding:14px;">
    <div class="mgr-card-title" style="margin-bottom:10px;">🎁 المكافآت وقاعدة النقاط</div>
    <div class="loy-settings-row">
      <label>كل <input id="loyRate" type="number" min="0.1" step="0.1" value="${L.pointsPer1000}" style="width:64px;"> نقطة لكل 1,000 ل.س مشتريات</label>
      <button class="set-btn" onclick="saveLoyRate()">حفظ القاعدة</button>
    </div>
    <div class="set-rows" id="loyRewards">
      ${(L.rewards || []).map(r => `
      <div class="set-row offer-admin-row">
        <div class="offer-admin-info">
          <strong>${r.kind === 'coupon' ? '🎟️' : '🍔'} ${e(r.title)}</strong>
          <small>${r.cost} نقطة${r.kind === 'coupon' ? ' · كوبون خصم ' + fmtNum(r.value) + ' ل.س' : r.value ? ' · ' + e(r.value) : ''}</small>
        </div>
        <button class="set-del" onclick="deleteReward('${e(r.id)}')" title="حذف">🗑️</button>
      </div>`).join('') || '<span class="set-empty">لا مكافآت — أضف أول مكافأة</span>'}
    </div>
    <div class="set-add-row" style="margin-top:8px;">
      <input id="newRwdTitle" placeholder="اسم المكافأة (مثال: عصير مجاني)">
      <input id="newRwdCost" type="number" placeholder="كلفتها بالنقاط" style="max-width:130px;">
      <select id="newRwdKind" style="max-width:170px;">
        <option value="item">🍔 صنف مجاني</option>
        <option value="coupon">🎟️ كوبون خصم (ل.س)</option>
      </select>
      <input id="newRwdValue" placeholder="التفصيل أو قيمة الكوبون" style="max-width:190px;">
      <button class="set-btn primary" onclick="addReward()">+ مكافأة</button>
    </div>
  </div>

  <!-- نقاط العملاء -->
  <div class="mgr-card" style="padding:0;overflow:hidden;">
    <div class="mgr-card-title" style="padding:14px 14px 8px;">🥇 نقاط العملاء — مرتبة تنازلياً</div>
    <div class="sh-table-wrap">
      <table class="sh-table">
        <thead><tr><th>العميل</th><th>المستوى</th><th>من المشتريات</th><th>الرصيد الحالي</th><th>إضافة / استبدال</th></tr></thead>
        <tbody>
          ${rows.map(r => `
          <tr>
            <td class="debt-client"><strong>${e(r.cu.name)}</strong><small>${e(r.cu.phone || '')}</small></td>
            <td><span class="loy-badge ${r.lv.cls}">${r.lv.icon} ${r.lv.label}</span></td>
            <td class="buy-num">${fmtNum(r.earned)}</td>
            <td class="buy-num buy-sug">${fmtNum(r.pts)}</td>
            <td>
              <div class="loy-actions">
                <input type="number" min="1" placeholder="نقاط" id="loyin_${e(r.cu.id)}" style="width:70px;">
                <button class="loy-mini" onclick="loyAddPoints('${e(r.cu.id)}')">＋</button>
                <select id="loyrwd_${e(r.cu.id)}" style="max-width:150px;">
                  ${(DEMO_DATA.loyalty.rewards || []).map(rw => `<option value="${e(rw.id)}">${e(rw.title)} (${rw.cost})</option>`).join('')}
                </select>
                <button class="loy-mini gold" onclick="loyRedeem('${e(r.cu.id)}')">🎁</button>
              </div>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div>

  <!-- آخر حركات النقاط -->
  ${(DEMO_DATA.loyalty_ledger || []).length ? `
  <div class="mgr-card" style="margin-top:12px;padding:14px;">
    <div class="mgr-card-title" style="margin-bottom:8px;">📜 آخر حركات النقاط</div>
    ${(DEMO_DATA.loyalty_ledger || []).slice(0, 8).map(l => {
      const cu = customers.find(x => x.id === l.customer_id);
      const t = { manual_add: '＋ إضافة يدوية', manual_sub: '− خصم يدوي', redeem: '🎁 استبدال' }[l.type] || l.type;
      return `<div class="loy-ledger-row"><span>${t} · ${e(cu ? cu.name : l.customer_id)}${l.note ? ' — ' + e(l.note) : ''}</span><small>${e(l.at.replace('T', ' · '))} · ${l.pts} نقطة</small></div>`;
    }).join('')}
  </div>` : ''}`;
}

function saveLoyRate(){
  const v = Number(document.getElementById('loyRate').value);
  if (!(v > 0)) return showToast('أدخل قاعدة صحيحة أكبر من صفر', '⚠️');
  DEMO_DATA.loyalty.pointsPer1000 = v;
  if (window.SettingsSync) SettingsSync.pushSoon();
  window.AlfaAudit && AlfaAudit.log('settings', 'تعديل قاعدة النقاط', `نقطة لكل 1,000 ل.س × ${v}`, 'المدير');
  showToast('حُفظت قاعدة النقاط — تُحسب فوراً على الجدول', '🎁');
  rebuildBody();
}
function addReward(){
  const title = document.getElementById('newRwdTitle').value.trim();
  const cost = Number(document.getElementById('newRwdCost').value);
  const kind = document.getElementById('newRwdKind').value;
  let value = document.getElementById('newRwdValue').value.trim();
  if (!title || !(cost > 0)) return showToast('أدخل اسم المكافأة وكلفتها بالنقاط', '⚠️');
  if (kind === 'coupon') value = Number(value) || 0;
  DEMO_DATA.loyalty.rewards.push({ id: 'rwd_' + Date.now(), title, cost, kind, value });
  if (window.SettingsSync) SettingsSync.pushSoon();
  window.AlfaAudit && AlfaAudit.log('settings', 'إضافة مكافأة ولاء', `${title} بـ ${cost} نقطة`, 'المدير');
  showToast('أُضيفت المكافأة', '🎁');
  rebuildBody();
}
function deleteReward(id){
  const r = (DEMO_DATA.loyalty.rewards || []).find(x => x.id === id);
  DEMO_DATA.loyalty.rewards = (DEMO_DATA.loyalty.rewards || []).filter(x => x.id !== id);
  if (window.SettingsSync) SettingsSync.pushSoon();
  window.AlfaAudit && AlfaAudit.log('settings', 'حذف مكافأة ولاء', r ? r.title : id, 'المدير');
  showToast('حُذفت المكافأة', '🗑️');
  rebuildBody();
}
function loyAddPoints(cid){
  const el = document.getElementById('loyin_' + cid);
  const pts = Number(el.value);
  if (!(pts > 0)) return showToast('أدخل عدد النقاط', '⚠️');
  Loyalty.add(cid, 'manual_add', pts, 'إضافة يدوية من الإدارة');
  const cu = customers.find(x => x.id === cid);
  window.AlfaAudit && AlfaAudit.log('customers', 'إضافة نقاط ولاء', `${cu ? cu.name : cid}: +${pts} نقطة`, 'المدير');
  showToast(`أُضيفت ${pts} نقطة`, '＋');
  rebuildBody();
}
function loyRedeem(cid){
  const sel = document.getElementById('loyrwd_' + cid);
  const rwd = (DEMO_DATA.loyalty.rewards || []).find(x => x.id === (sel && sel.value));
  if (!rwd) return showToast('لا مكافآت معرّفة — أضف واحدة أولاً', '⚠️');
  const cu = customers.find(x => x.id === cid);
  const pts = Loyalty.points(cu);
  if (pts < rwd.cost) return showToast(`نقاط ${cu.name} لا تكفي: ${pts} من ${rwd.cost} المطلوبة`, '⚠️');
  Loyalty.add(cid, 'redeem', rwd.cost, `استبدال: ${rwd.title}`);
  window.AlfaAudit && AlfaAudit.log('customers', 'استبدال مكافأة ولاء', `${cu.name}: ${rwd.title} بـ ${rwd.cost} نقطة`, 'المدير');
  showToast(`استُبدلت «${rwd.title}» — أُنقصت ${rwd.cost} نقطة`, '🎁');
  rebuildBody();
}
