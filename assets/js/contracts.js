/* ================================================================
   contracts.js — العقود — alfaprosys
   ================================================================ */

const DATA      = window.DEMO_DATA;
function todayBD() { return window.businessDay ? businessDay() : new Date().toISOString().slice(0,10); }
let contracts   = JSON.parse(JSON.stringify(DATA.contracts || []));
let menuItems   = DATA.items || [];

/* ================================================================
   ثوابت
   ================================================================ */
const CONTRACT_TYPES = {
  daily:   { label: 'يومي',    icon: '📅' },
  weekly:  { label: 'أسبوعي',  icon: '📆' },
  monthly: { label: 'شهري',    icon: '🗓️' },
  custom:  { label: 'مخصص',    icon: '✏️' },
};
const STATUS_MAP = {
  active:    { label: 'نشط',      color: 'green' },
  paused:    { label: 'موقوف',    color: 'gold'  },
  expired:   { label: 'منتهي',   color: 'muted' },
  cancelled: { label: 'ملغى',    color: 'red'   },
};

/* ================================================================
   التنقل
   ================================================================ */
const MGR_NAV = window.AlfaNav.MGR_NAV;
const CURRENT = 'contracts';
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

/* ================================================================
   الحالة
   ================================================================ */
let filterStatus = 'all';
let openConId    = null;
let openConTab   = {};
let editingConId = null;
// حالة النموذج
let formItems    = [];

/* ================================================================
   البناء الرئيسي
   ================================================================ */
function renderApp() {
  document.getElementById('conApp').innerHTML = `
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
        <div id="conContent"></div>
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
    </nav>

    <!-- مودال العقد -->
    <div class="con-modal-scrim" id="conModalScrim" onclick="closeConModal()"></div>
    <div class="con-modal" id="conModal" role="dialog">
      <div class="con-modal-head">
        <span id="conModalTitle">عقد جديد</span>
        <button onclick="closeConModal()">✕</button>
      </div>
      <div class="con-modal-body" id="conModalBody"></div>
    </div>
  `;
  renderContent();
}

/* ================================================================
   المحتوى
   ================================================================ */
function renderContent() {
  const active   = contracts.filter(c => c.status === 'active').length;
  const totalVal = contracts.filter(c => c.status === 'active')
    .reduce((s, c) => s + (c.total_value || 0), 0);
  const pending  = contracts.flatMap(c => c.installments || [])
    .filter(i => !i.paid).reduce((s, i) => s + (i.amount || 0), 0);
  const overdue  = contracts.flatMap(c => c.installments || [])
    .filter(i => !i.paid && i.due_date < todayBD()).length;

  const statusTotals = {
    all:       contracts.length,
    active:    contracts.filter(c=>c.status==='active').length,
    paused:    contracts.filter(c=>c.status==='paused').length,
    expired:   contracts.filter(c=>c.status==='expired').length,
    cancelled: contracts.filter(c=>c.status==='cancelled').length,
  };

  document.getElementById('conContent').innerHTML = `

    <div class="mgr-page-header">
      <div>
        <div class="mgr-page-brand">alfaprosys</div>
        <div class="mgr-page-title">📋 العقود</div>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="mgr-btn sm ${conView==='debt'?'navy':''}" onclick="setConView('${conView==='debt'?'list':'debt'}')">
          ${conView==='debt' ? '↩ رجوع للعقود' : '📊 تقرير الذمم'}
        </button>
        ${conView==='list' ? '<button class="mgr-btn navy sm" onclick="openAddContract()">+ عقد جديد</button>' : ''}
      </div>
    </div>

    <!-- إحصائيات -->
    <div class="mgr-stats-grid" style="margin-bottom:12px;">
      <div class="mgr-stat-card blue">
        <div class="mgr-stat-lbl">عقود نشطة</div>
        <div class="mgr-stat-val">${active}</div>
        <div class="mgr-stat-sub">من ${contracts.length} إجمالي</div>
      </div>
      <div class="mgr-stat-card gold">
        <div class="mgr-stat-lbl">قيمة العقود النشطة</div>
        <div class="mgr-stat-val">${fmtNum(Math.round(totalVal/1000))}K</div>
        <div class="mgr-stat-sub">ل.س</div>
      </div>
      <div class="mgr-stat-card ${overdue > 0 ? 'red' : ''}">
        <div class="mgr-stat-lbl">دفعات متأخرة</div>
        <div class="mgr-stat-val">${overdue}</div>
        <div class="mgr-stat-sub">${overdue > 0 ? '⚠️ تحتاج متابعة' : '✅ لا تأخير'}</div>
      </div>
      <div class="mgr-stat-card">
        <div class="mgr-stat-lbl">دفعات قادمة</div>
        <div class="mgr-stat-val">${fmtNum(Math.round(pending/1000))}K</div>
        <div class="mgr-stat-sub">ل.س غير مدفوعة</div>
      </div>
    </div>

    <!-- فلتر الحالة -->
    <div class="inv-cat-strip" style="margin-bottom:12px;">
      ${Object.entries({all:'الكل', ...STATUS_MAP}).map(([k,v]) => `
        <button class="inv-cat-chip ${filterStatus===k?'active':''}"
          onclick="setStatusFilter('${k}')">
          ${k==='all' ? '📋 الكل' : `${e(typeof v==='string'?v:v.label)}`}
          <span>${statusTotals[k] || 0}</span>
        </button>`).join('')}
    </div>

    <!-- قائمة العقود / تقرير الذمم -->
    <div id="conListWrap">${conView==='debt' ? renderDebtReport() : renderContractList()}</div>
  `;
}

/* ================================================================
   📊 تقرير الذمم (16) — عملاء العقود مرتبين حسب الدين
   ================================================================ */
let conView = 'list';
function setConView(v){ conView = v; renderContent(); }

function debtRowData(c){
  const cust = (window.DEMO_DATA.customers||[]).find(u => u.id === c.customer_id);
  const unpaid = (c.installments||[]).filter(i=>!i.paid).reduce((s,i)=>s+(i.amount||0),0);
  const limit = (cust && cust.credit_limit) || 0;
  const debt = cust && cust.credit_balance != null ? cust.credit_balance : unpaid;
  const nextDue = (cust && cust.next_due_date) || ((c.installments||[]).find(i=>!i.paid)||{}).due_date || '';
  return { cust, limit, debt, avail: limit - debt, nextDue };
}

function renderDebtReport(){
  const today = todayBD();
  const rows = contracts.map(c => ({ c, ...debtRowData(c) }))
    .sort((a,b) => b.debt - a.debt);
  const totalDebt = rows.reduce((s,r)=>s+r.debt,0);
  const overCount = rows.filter(r => r.limit && r.debt > r.limit).length;
  const overdueNext = rows.filter(r => r.nextDue && r.nextDue < today);

  const chip = (lbl, val, cls='') =>
    `<div class="mgr-stat-card ${cls}"><div class="mgr-stat-lbl">${lbl}</div><div class="mgr-stat-val">${val}</div></div>`;

  const stateChip = r => {
    if (r.limit && r.debt > r.limit) return '<span class="mgr-badge red">🔴 تجاوز السقف</span>';
    if (r.nextDue && r.nextDue < today) return '<span class="mgr-badge red">⚠️ دفعة متأخرة</span>';
    if (r.limit && r.debt >= r.limit * 0.8) return '<span class="mgr-badge gold">🟡 قارب السقف</span>';
    return '<span class="mgr-badge green">🟢 سليم</span>';
  };

  return `
  <div class="mgr-stats-grid" style="margin-bottom:12px;">
    ${chip('إجمالي الذمم', fmtNum(totalDebt), overCount ? 'red' : '')}
    ${chip('متجاوزون السقف', overCount, overCount ? 'red' : '')}
    ${chip('دفعة متأخرة', overdueNext.length, overdueNext.length ? 'gold' : '')}
    ${chip('عمليات العقود', rows.length)}
  </div>
  <div class="mgr-card" style="padding:0;overflow:hidden;">
    <div class="debt-table-wrap">
      <table class="debt-table">
        <thead><tr><th>#</th><th>العميل</th><th>الذمة</th><th>السقف</th><th>المتاح</th><th>أقرب استحقاق</th><th>الحالة</th><th></th></tr></thead>
        <tbody>
          ${rows.map((r,i) => `
            <tr class="${r.limit && r.debt > r.limit ? 'debt-row-over' : ''}">
              <td>${i+1}</td>
              <td class="debt-client">
                <strong>${e(r.c.client_name)}</strong>
                <small>${e(r.c.company || '')}</small>
              </td>
              <td class="debt-num">${fmtNum(r.debt)}</td>
              <td class="debt-num">${r.limit ? fmtNum(r.limit) : '—'}</td>
              <td class="debt-num ${r.avail < 0 ? 'debt-neg' : ''}">${r.limit ? fmtNum(r.avail) : '—'}</td>
              <td>${r.nextDue ? e(r.nextDue) : '—'}</td>
              <td>${stateChip(r)}</td>
              <td><button class="mgr-btn sm" onclick="printContractStatement('${e(r.c.id)}')">🧾 كشف حساب</button></td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div>`;
}

/* ================================================================
   🧾 كشف حساب عقد (25) — طباعة رسمية: الدفعات والذمة والباقي
   ================================================================ */
function printContractStatement(conId){
  const c = contracts.find(x => x.id === conId);
  if (!c) return;
  const d = debtRowData(c);
  const paid = (c.installments||[]).filter(i=>i.paid).reduce((s,i)=>s+(i.amount||0),0);
  const totalInst = (c.installments||[]).reduce((s,i)=>s+(i.amount||0),0);
  const pays = (d.cust && d.cust.payments) || [];
  const today = new Date().toLocaleDateString('ar-EG');

  document.getElementById('stmtSheetHost').innerHTML = `
    <div class="stmt-sheet">
      <div class="stmt-head">
        <div>
          <div class="stmt-brand">alfaprosys</div>
          <div class="stmt-title">كشف حساب عقد</div>
        </div>
        <div class="stmt-meta">
          <div>رقم العقد: <b>${e(c.id)}</b></div>
          <div>تاريخ الطباعة: <b>${today}</b></div>
        </div>
      </div>

      <div class="stmt-sec">
        <div class="stmt-sec-title">بيانات العقد</div>
        <div class="stmt-grid">
          <div><span>العميل</span><b>${e(c.client_name)}</b></div>
          <div><span>الشركة / الجهة</span><b>${e(c.company || '—')}</b></div>
          <div><span>مدة العقد</span><b>${e(c.start_date)} ← ${e(c.end_date)}</b></div>
          <div><span>قيمة العقد</span><b>${fmtNum(c.total_value || 0)} ل.س</b></div>
          <div><span>طريقة الدفع</span><b>${c.payment_method === 'cash' ? 'نقدي' : 'دفعات مجدولة'}</b></div>
          <div><span>الحالة</span><b>${e(c.status === 'active' ? 'نشط' : c.status)}</b></div>
        </div>
      </div>

      ${totalInst ? `
      <div class="stmt-sec">
        <div class="stmt-sec-title">الدفعات المجدولة</div>
        <table class="stmt-table">
          <thead><tr><th>تاريخ الاستحقاق</th><th>المبلغ (ل.س)</th><th>الحالة</th><th>تاريخ الدفع</th></tr></thead>
          <tbody>
            ${(c.installments||[]).map(i => `
              <tr class="${!i.paid && i.due_date < todayBD() ? 'stmt-overdue' : ''}">
                <td>${e(i.due_date)}</td><td>${fmtNum(i.amount)}</td>
                <td>${i.paid ? '✅ مدفوعة' : (i.due_date < todayBD() ? '🔴 متأخرة' : '⏳ مستحقة')}</td>
                <td>${e(i.paid_date || '—')}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>` : ''}

      ${pays.length ? `
      <div class="stmt-sec">
        <div class="stmt-sec-title">سجل الدفعات المسددة</div>
        <table class="stmt-table">
          <thead><tr><th>التاريخ</th><th>المبلغ (ل.س)</th><th>ملاحظة</th></tr></thead>
          <tbody>
            ${pays.map(p => `<tr><td>${e(p.date)}</td><td>${fmtNum(p.amount)}</td><td>${e(p.note || '—')}</td></tr>`).join('')}
            <tr class="stmt-sum"><td>الإجمالي المسدد</td><td>${fmtNum(pays.reduce((s,p)=>s+p.amount,0))}</td><td></td></tr>
          </tbody>
        </table>
      </div>` : ''}

      <div class="stmt-sec">
        <div class="stmt-sec-title">الذمة</div>
        <div class="stmt-grid">
          <div><span>الذمة الحالية</span><b>${fmtNum(d.debt)} ل.س</b></div>
          <div><span>سقف الذمة</span><b>${d.limit ? fmtNum(d.limit) + ' ل.س' : 'غير محدد'}</b></div>
          <div><span>المتاح للخصم</span><b>${d.limit ? fmtNum(d.avail) + ' ل.س' : '—'}</b></div>
          <div><span>أقرب استحقاق</span><b>${e(d.nextDue || '—')}</b></div>
          ${totalInst ? `<div><span>مسدد من الدفعات</span><b>${fmtNum(paid)} من ${fmtNum(totalInst)} ل.س</b></div>` : ''}
        </div>
      </div>

      <div class="stmt-sign">
        <div>توقيع العميل<span></span></div>
        <div>توقيع الإدارة<span></span></div>
      </div>
    </div>`;
  document.getElementById('conStatement').classList.add('open');
}
function closeContractStatement(){
  document.getElementById('conStatement').classList.remove('open');
}

/* ================================================================
   قائمة العقود
   ================================================================ */
function renderContractList() {
  let list = filterStatus === 'all'
    ? contracts
    : contracts.filter(c => c.status === filterStatus);
  if (!list.length) return `<div class="inv-empty">لا توجد عقود مطابقة</div>`;

  return `<div class="mgr-card" style="padding:0;overflow:hidden;">
    ${list.map(c => renderContractRow(c)).join('')}
  </div>`;
}

function renderContractRow(c) {
  const isOpen = openConId === c.id;
  const tab    = openConTab[c.id] || 'info';
  const ct     = CONTRACT_TYPES[c.contract_type] || CONTRACT_TYPES.custom;
  const st     = STATUS_MAP[c.status] || STATUS_MAP.active;
  const totalInstallments = (c.installments || []).reduce((s,i)=>s+(i.amount||0),0);
  const paidInstallments  = (c.installments || []).filter(i=>i.paid).reduce((s,i)=>s+(i.amount||0),0);
  const nextDue = (c.installments || []).find(i => !i.paid);
  const isOverdue = nextDue && nextDue.due_date < todayBD();

  return `
    <div class="con-row ${isOpen?'open':''}" id="crow_${e(c.id)}">
      <div class="con-row-main" onclick="toggleConRow('${e(c.id)}')">
        <div class="con-avatar">📋</div>
        <div class="con-row-info">
          <div class="con-row-name">
            ${e(c.client_name)}
            <span class="mgr-badge ${st.color}">${st.label}</span>
            ${isOverdue ? '<span class="mgr-badge red">⚠️ دفعة متأخرة</span>' : ''}
          </div>
          <div class="con-row-sub">
            ${e(c.company || '')}
            <span class="con-type-chip">${ct.icon} ${ct.label}</span>
          </div>
        </div>
        <div class="con-row-val">
          <div class="con-val-main">${fmtNum(c.total_value)}</div>
          <div class="con-val-sub">ل.س</div>
        </div>
        <div class="inv-row-chevron ${isOpen?'open':''}">›</div>
      </div>

      <div class="inv-row-detail ${isOpen?'open':''}">
        <div class="inv-detail-inner">

          <div class="emp-tabs">
            <button class="emp-tab ${tab==='info'?'active':''}"
              onclick="setConTab('${e(c.id)}','info')">📋 بيانات العقد</button>
            <button class="emp-tab ${tab==='items'?'active':''}"
              onclick="setConTab('${e(c.id)}','items')">🍽️ الوجبات</button>
            <button class="emp-tab ${tab==='payments'?'active':''}"
              onclick="setConTab('${e(c.id)}','payments')">💳 الدفعات</button>
          </div>

          ${tab === 'info'     ? renderConInfo(c, ct, st) : ''}
          ${tab === 'items'    ? renderConItems(c) : ''}
          ${tab === 'payments' ? renderConPayments(c, paidInstallments, totalInstallments) : ''}

        </div>
      </div>
    </div>`;
}

function renderConInfo(c, ct, st) {
  return `
    <div class="emp-fields-grid">
      <div class="emp-field"><span>اسم العميل</span><strong>${e(c.client_name)}</strong></div>
      <div class="emp-field"><span>الشركة / الجهة</span><strong>${e(c.company || '—')}</strong></div>
      <div class="emp-field"><span>نوع العقد</span><strong>${ct.icon} ${ct.label}</strong></div>
      <div class="emp-field"><span>تاريخ البداية</span><strong>${e(c.start_date)}</strong></div>
      <div class="emp-field"><span>تاريخ الانتهاء</span><strong>${e(c.end_date)}</strong></div>
      <div class="emp-field"><span>موعد التسليم اليومي</span><strong>${e(c.delivery_time || '—')}</strong></div>
      <div class="emp-field"><span>طريقة الدفع</span>
        <strong>${c.payment_method === 'cash' ? '💵 نقدي' : '📋 دفعات'}</strong>
      </div>
      <div class="emp-field"><span>الحالة</span>
        <strong><span class="mgr-badge ${st.color}">${st.label}</span></strong>
      </div>
      ${c.notes ? `<div class="emp-field full"><span>ملاحظات</span><strong>${e(c.notes)}</strong></div>` : ''}
    </div>
    <div class="emp-detail-actions">
      <button class="emp-action-btn primary" onclick="openEditContract('${e(c.id)}')">✏️ تعديل</button>
      <button class="con-status-btn" onclick="toggleConStatus('${e(c.id)}')">
        ${c.status === 'active' ? '⏸ إيقاف' : c.status === 'paused' ? '▶️ تفعيل' : '🔄 تفعيل'}
      </button>
      <button class="emp-action-btn danger" onclick="deleteContract('${e(c.id)}')">🗑 حذف</button>
    </div>`;
}

function renderConItems(c) {
  const items = c.items || [];
  const dailyTotal = items.reduce((s,i) => s + (i.qty||0)*(i.price||0), 0);
  return `
    <div class="con-items-list">
      ${items.map(it => `
        <div class="con-item-row">
          <div class="con-item-name">${e(it.name)}</div>
          <div class="con-item-qty">× ${it.qty}</div>
          <div class="con-item-price">${fmtNum(it.price)} ل.س</div>
          <div class="con-item-total">${fmtNum(it.qty * it.price)} ل.س</div>
        </div>`).join('')}
      <div class="con-items-total">
        <span>إجمالي ${CONTRACT_TYPES[c.contract_type]?.label || ''}</span>
        <strong>${fmtNum(dailyTotal)} ل.س</strong>
      </div>
    </div>`;
}

function renderConPayments(c, paid, total) {
  const installments = c.installments || [];
  if (!installments.length) {
    return `<div class="inv-empty">دفع نقدي — لا توجد دفعات مجدولة</div>`;
  }
  const remaining = total - paid;
  return `
    <div style="display:flex;justify-content:flex-end;margin-bottom:8px;">
      <button class="mgr-btn sm" onclick="printContractStatement('${e(c.id)}')">🧾 كشف حساب للطباعة</button>
    </div>
    <div class="con-pay-summary">
      <div class="cr-detail-cell green">
        <div class="cr-detail-val">${fmtNum(paid)}</div>
        <div class="cr-detail-lbl">مدفوع</div>
      </div>
      <div class="cr-detail-cell red">
        <div class="cr-detail-val">${fmtNum(remaining)}</div>
        <div class="cr-detail-lbl">متبقٍ</div>
      </div>
      <div class="cr-detail-cell blue">
        <div class="cr-detail-val">${fmtNum(total)}</div>
        <div class="cr-detail-lbl">الإجمالي</div>
      </div>
    </div>
    <div class="con-inst-list">
      ${installments.map((inst, i) => {
        const isOverdue = !inst.paid && inst.due_date < todayBD();
        return `
          <div class="con-inst-row ${inst.paid ? 'paid' : isOverdue ? 'overdue' : ''}">
            <div class="con-inst-status">${inst.paid ? '✅' : isOverdue ? '⚠️' : '🕐'}</div>
            <div class="con-inst-info">
              <div class="con-inst-date">استحقاق: ${e(inst.due_date)}</div>
              ${inst.paid ? `<div class="con-inst-paid-date">دُفعت: ${e(inst.paid_date)}</div>` : ''}
            </div>
            <div class="con-inst-amount">${fmtNum(inst.amount)} ل.س</div>
            ${!inst.paid ? `
            <button class="con-pay-btn" onclick="markInstallmentPaid('${e(c.id)}',${i})">
              ✅ سُدِّدت
            </button>` : ''}
          </div>`;
      }).join('')}
    </div>`;
}

/* ================================================================
   تحكم
   ================================================================ */
function setStatusFilter(s) { filterStatus = s; rebuildContent(); }
function toggleConRow(id) {
  openConId = openConId === id ? null : id;
  if (!openConTab[id]) openConTab[id] = 'info';
  document.getElementById('conListWrap').innerHTML = renderContractList();
}
function setConTab(id, tab) {
  openConId = id; openConTab[id] = tab;
  document.getElementById('conListWrap').innerHTML = renderContractList();
}
function toggleConStatus(id) {
  const idx = contracts.findIndex(c => c.id === id);
  if (idx < 0) return;
  const map = { active:'paused', paused:'active', expired:'active', cancelled:'active' };
  contracts[idx].status = map[contracts[idx].status] || 'active';
  DATA.contracts = contracts;
  if (window.ContractSync) ContractSync.pushSoon();
  openConId = id; openConTab[id] = 'info';
  showToast('تم تحديث حالة العقد', '🔄');
  rebuildContent();
}
function markInstallmentPaid(conId, instIdx) {
  const idx = contracts.findIndex(c => c.id === conId);
  if (idx < 0) return;
  contracts[idx].installments[instIdx].paid = true;
  contracts[idx].installments[instIdx].paid_date = new Date().toISOString().split('T')[0];
  DATA.contracts = contracts;
  if (window.ContractSync) ContractSync.pushSoon();
  openConId = conId; openConTab[conId] = 'payments';
  showToast('تم تسجيل الدفعة ✅', '💳');
  rebuildContent();
}
function deleteContract(id) {
  const c = contracts.find(x => x.id === id);
  if (!confirm(`حذف عقد ${c?.client_name}؟`)) return;
  contracts = contracts.filter(x => x.id !== id);
  DATA.contracts = contracts;
  if (window.ContractSync) { ContractSync.remove(id); ContractSync.pushSoon(); }
  openConId = null;
  showToast('تم حذف العقد', '🗑');
  rebuildContent();
}
function rebuildContent() { renderContent(); }

/* ================================================================
   حالة النموذج — كلها في JS بدون select/datalist
   ================================================================ */
let formContractType = 'monthly';
let formPayMethod    = 'cash';
let formDelivery     = false;
let formInstallments = [];   // [{ date, amount }]
let formItemSearch   = '';
let pickingItemIdx   = null; // الأصناف picker

/* ================================================================
   مودال إضافة / تعديل العقد
   ================================================================ */
function openAddContract() {
  editingConId     = null;
  formItems        = [];
  formContractType = 'monthly';
  formPayMethod    = 'cash';
  formDelivery     = false;
  formInstallments = [];
  document.getElementById('conModalTitle').textContent = '+ عقد جديد';
  document.getElementById('conModalBody').innerHTML = buildConForm(null);
  openConModal();
}
function openEditContract(id) {
  editingConId     = id;
  const c          = contracts.find(x => x.id === id);
  formItems        = JSON.parse(JSON.stringify(c?.items        || []));
  formContractType = c?.contract_type   || 'monthly';
  formPayMethod    = c?.payment_method  || 'cash';
  formDelivery     = c?.has_delivery    || false;
  formInstallments = (c?.installments   || []).map(i => ({ date: i.due_date, amount: i.amount }));
  document.getElementById('conModalTitle').textContent = 'تعديل العقد';
  document.getElementById('conModalBody').innerHTML = buildConForm(c);
  openConModal();
}

/* ================================================================
   بناء النموذج — بدون أي select/datalist
   ================================================================ */
function buildConForm(c) {
  return `
    <div class="con-form-section">👤 بيانات العميل</div>
    <label class="inv-modal-label">السيد / السيدة
      <input id="cfClientName" class="inv-modal-input" type="text"
        value="${e(c?.client_name || '')}" placeholder="اسم الشخص المسؤول" />
    </label>
    <label class="inv-modal-label">اسم الشركة / الجهة (اختياري)
      <input id="cfCompany" class="inv-modal-input" type="text"
        value="${e(c?.company || '')}" placeholder="شركة، مؤسسة، مطبخ..." />
    </label>

    <div class="con-form-section">📋 بيانات العقد</div>
    <div class="inv-modal-label">نوع العقد
      <div class="emp-pick-grid" style="margin-top:6px;" id="cfTypeGrid">
        ${Object.entries(CONTRACT_TYPES).map(([k,v]) => `
          <button type="button" class="emp-pick-btn ${formContractType===k?'active':''}"
            onclick="setFormVal('formContractType','cfTypeGrid',this,'${k}')">
            ${v.icon} ${v.label}</button>`).join('')}
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
      <label class="inv-modal-label">تاريخ البداية
        <input id="cfStart" class="inv-modal-input" type="date"
          value="${e(c?.start_date || new Date().toISOString().split('T')[0])}" />
      </label>
      <label class="inv-modal-label">تاريخ الانتهاء
        <input id="cfEnd" class="inv-modal-input" type="date" value="${e(c?.end_date || '')}" />
      </label>
    </div>
    <label class="inv-modal-label">موعد التسليم اليومي
      <input id="cfDeliveryTime" class="inv-modal-input" type="time"
        value="${e(c?.delivery_time || '')}" />
    </label>

    <div class="con-form-section">🚚 التوصيل</div>
    <div class="inv-modal-label">هل يشمل العقد التوصيل؟
      <div class="emp-pick-grid" style="margin-top:6px;" id="cfDelivGrid">
        <button type="button" class="emp-pick-btn ${!formDelivery?'active':''}"
          onclick="setFormVal('formDelivery','cfDelivGrid',this,false)">🏪 بدون توصيل</button>
        <button type="button" class="emp-pick-btn ${formDelivery?'active':''}"
          onclick="setFormVal('formDelivery','cfDelivGrid',this,true)">🛵 مع توصيل</button>
      </div>
    </div>

    <div class="con-form-section">🍽️ الأصناف المطلوبة</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:8px;">
      <label class="inv-modal-label">عدد الوجبات اليومي
        <input id="cfDailyMeals" class="inv-modal-input" type="number" inputmode="numeric"
          value="${e(c?.daily_meals || '')}" placeholder="مثال: 10" />
      </label>
      <label class="inv-modal-label">سقف السعر اليومي (ل.س)
        <input id="cfDailyCap" class="inv-modal-input" type="number" inputmode="numeric"
          value="${e(c?.daily_cap || '')}" placeholder="مثال: 500000" />
      </label>
    </div>
    <div id="cfItemsWrap">${renderFormItems()}</div>
    <button type="button" class="con-add-item-btn" onclick="openItemPicker()">+ إضافة صنف من المنيو</button>

    <div class="con-form-section">💳 طريقة الدفع</div>
    <div class="inv-modal-label">طريقة الدفع
      <div class="emp-pick-grid" style="margin-top:6px;" id="cfPayGrid">
        <button type="button" class="emp-pick-btn ${formPayMethod==='cash'?'active':''}"
          onclick="setFormVal('formPayMethod','cfPayGrid',this,'cash')">💵 نقدي</button>
        <button type="button" class="emp-pick-btn ${formPayMethod==='installments'?'active':''}"
          onclick="setFormVal('formPayMethod','cfPayGrid',this,'installments')">
          📋 دفعات</button>
      </div>
    </div>
    <div id="cfInstSection">${renderInstSection()}</div>

    <label class="inv-modal-label" style="margin-top:4px;">ملاحظات (اختياري)
      <input id="cfNotes" class="inv-modal-input" type="text"
        value="${e(c?.notes || '')}" placeholder="أي تفاصيل إضافية" />
    </label>
    <button class="inv-modal-confirm green" onclick="saveContract()" style="margin-top:14px;">
      💾 حفظ العقد
    </button>
  `;
}

/* ─── أزرار الاختيار بدون select ─── */
function setFormVal(varName, gridId, btn, val) {
  // let variables لا يمكن تعيينها عبر window[] — نستخدم map محلي
  const map = {
    formContractType: v => { formContractType = v; },
    formPayMethod:    v => { formPayMethod    = v; refreshInstSection(); },
    formDelivery:     v => { formDelivery     = v; },
  };
  if (map[varName]) map[varName](val);
  document.querySelectorAll(`#${gridId} .emp-pick-btn`)
    .forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

/* ================================================================
   قائمة الأصناف المختارة في النموذج
   ================================================================ */
function renderFormItems() {
  if (!formItems.length) return `
    <div class="con-no-items">اضغط "+ إضافة صنف" لاختيار أصناف من المنيو</div>`;
  return formItems.map((it, i) => `
    <div class="con-form-item">
      <div class="con-form-item-name">${e(it.name)}</div>
      <div class="con-form-item-row">
        <label class="con-form-item-label">الكمية
          <input class="inv-modal-input con-form-item-input" type="number"
            inputmode="numeric" value="${it.qty || 1}" min="1"
            onchange="formItems[${i}].qty=+this.value" />
        </label>
        <label class="con-form-item-label">السعر (ل.س)
          <input class="inv-modal-input con-form-item-input" type="number"
            inputmode="numeric" value="${it.price || ''}"
            placeholder="${it.default_price || 0}"
            onchange="formItems[${i}].price=+this.value" />
        </label>
        <button type="button" class="con-del-item-btn" onclick="removeFormItem(${i})">✕</button>
      </div>
    </div>`).join('');
}

function removeFormItem(i) {
  formItems.splice(i, 1);
  document.getElementById('cfItemsWrap').innerHTML = renderFormItems();
}

/* ================================================================
   picker الأصناف — مودال منفصل فوق كل شيء (نفس أسلوب qty-modal في POS)
   ================================================================ */
let itemPickerSearch = '';

function openItemPicker() {
  itemPickerSearch = '';
  // أنشئ picker كـ overlay فوق كل شيء
  let picker = document.getElementById('conItemPicker');
  if (!picker) {
    picker = document.createElement('div');
    picker.id = 'conItemPicker';
    document.body.appendChild(picker);
  }
  picker.innerHTML = renderItemPicker();
  picker.style.display = '';
  setTimeout(() => document.getElementById('itemPickerSearch')?.focus(), 80);
}

function renderItemPicker() {
  const q = itemPickerSearch.toLowerCase();
  /* الأصناف غير المتوفرة لا تُعرض في منتقي الأصناف،
     وبذلك تختفي تلقائياً التصنيفات التي لا تملك أصنافاً متاحة */
  const pool = menuItems.filter(m => m && m.is_available !== false);
  const cats = [...new Set(pool.map(m => m.category_name).filter(Boolean))];
  let list = pool.filter(m =>
    !q || m.name?.toLowerCase().includes(q) || m.category_name?.toLowerCase().includes(q)
  );
  return `
    <div class="con-picker-scrim" onclick="closeItemPicker()"></div>
    <div class="con-picker-sheet">
      <div class="con-picker-head">
        <span>🍽️ اختر صنفاً</span>
        <button onclick="closeItemPicker()">✕</button>
      </div>
      <div class="con-picker-search">
        <span>🔍</span>
        <input id="itemPickerSearch" type="text" inputmode="search"
          placeholder="ابحث عن صنف..."
          value="${e(itemPickerSearch)}"
          oninput="itemPickerSearch=this.value;document.getElementById('conItemPicker').innerHTML=renderItemPicker();document.getElementById('itemPickerSearch').focus()" />
      </div>
      <div class="con-picker-list">
        ${!list.length
          ? `<div class="con-picker-empty">لا توجد نتائج</div>`
          : list.slice(0, 60).map(m => `
            <button type="button" class="con-picker-item ${formItems.some(x=>x.item_id===m.id)?'selected':''}"
              onclick="pickMenuItem('${e(m.id)}','${e(m.name)}',${m.price||0})">
              <div class="con-picker-item-name">${e(m.name)}</div>
              <div class="con-picker-item-meta">
                ${e(m.category_name||'')}
                <span>${fmtNum(m.price)} ل.س</span>
              </div>
            </button>`).join('')}
      </div>
    </div>`;
}

function pickMenuItem(id, name, price) {
  const exists = formItems.findIndex(x => x.item_id === id);
  if (exists > -1) {
    // toggle: إذا موجود أزله
    formItems.splice(exists, 1);
  } else {
    formItems.push({ item_id: id, name, qty: 1, price, default_price: price });
  }
  // أعد رسم الpicker والأصناف
  document.getElementById('conItemPicker').innerHTML = renderItemPicker();
  document.getElementById('cfItemsWrap').innerHTML = renderFormItems();
  setTimeout(() => document.getElementById('itemPickerSearch')?.focus(), 30);
}

function closeItemPicker() {
  const p = document.getElementById('conItemPicker');
  if (p) p.style.display = 'none';
}

/* ================================================================
   قسم الدفعات — قائمة date pickers
   ================================================================ */
function renderInstSection() {
  if (formPayMethod !== 'installments') return '';
  return `
    <div class="con-inst-builder">
      <div class="con-inst-builder-title">📅 جدول الدفعات</div>
      ${formInstallments.map((inst, i) => `
        <div class="con-inst-builder-row">
          <input class="inv-modal-input" type="date" value="${e(inst.date)}"
            onchange="formInstallments[${i}].date=this.value" style="flex:1;" />
          <input class="inv-modal-input" type="number" inputmode="numeric"
            value="${inst.amount || ''}" placeholder="المبلغ (ل.س)"
            onchange="formInstallments[${i}].amount=+this.value" style="flex:1.2;" />
          <button type="button" class="con-del-item-btn"
            onclick="formInstallments.splice(${i},1);refreshInstSection()">✕</button>
        </div>`).join('')}
      <button type="button" class="con-add-inst-btn" onclick="addInstallment()">
        + إضافة موعد دفعة
      </button>
    </div>`;
}

function addInstallment() {
  // تاريخ مقترح: بعد آخر دفعة بشهر أو اليوم
  const lastDate = formInstallments.length
    ? formInstallments[formInstallments.length - 1].date
    : new Date().toISOString().split('T')[0];
  const nextDate = new Date(lastDate);
  nextDate.setMonth(nextDate.getMonth() + 1);
  formInstallments.push({ date: nextDate.toISOString().split('T')[0], amount: 0 });
  refreshInstSection();
}

function refreshInstSection() {
  document.getElementById('cfInstSection').innerHTML = renderInstSection();
}

/* ================================================================
   حفظ العقد
   ================================================================ */
function saveContract() {
  const clientName   = document.getElementById('cfClientName').value.trim();
  const company      = document.getElementById('cfCompany').value.trim();
  const startDate    = document.getElementById('cfStart').value;
  const endDate      = document.getElementById('cfEnd').value;
  const deliveryTime = document.getElementById('cfDeliveryTime').value;
  const dailyMeals   = Number(document.getElementById('cfDailyMeals').value) || 0;
  const dailyCap     = Number(document.getElementById('cfDailyCap').value)   || 0;
  const notes        = document.getElementById('cfNotes').value.trim();

  if (!clientName) { showToast('اسم العميل مطلوب', '⚠️'); return; }
  if (!startDate)  { showToast('تاريخ البداية مطلوب', '⚠️'); return; }
  if (!formItems.length) { showToast('أضف صنفاً واحداً على الأقل', '⚠️'); return; }

  const installments = formInstallments
    .filter(i => i.date && i.amount)
    .map((i, idx) => ({
      id: 'ci_' + Date.now() + idx,
      due_date: i.date, amount: i.amount, paid: false, paid_date: ''
    }));

  const totalValue = formInstallments.length
    ? formInstallments.reduce((s, i) => s + (i.amount || 0), 0)
    : formItems.reduce((s, i) => s + (i.qty||0)*(i.price||0), 0);

  const payload = {
    client_name: clientName, company,
    contract_type: formContractType,
    start_date: startDate, end_date: endDate,
    delivery_time: deliveryTime,
    has_delivery: formDelivery,
    daily_meals: dailyMeals, daily_cap: dailyCap,
    status: 'active',
    items: formItems,
    payment_method: formPayMethod,
    installments, notes, total_value: totalValue,
  };

  if (editingConId) {
    const idx = contracts.findIndex(x => x.id === editingConId);
    if (idx > -1) contracts[idx] = { ...contracts[idx], ...payload };
    showToast('تم تحديث العقد', '✏️');
  } else {
    contracts.unshift({ id: 'con_' + Date.now(), customer_id: '', ...payload });
    showToast('تمت إضافة العقد', '📋');
  }
  DATA.contracts = contracts;
  if (window.ContractSync) ContractSync.pushSoon();
  closeItemPicker();
  closeConModal();
  rebuildContent();
}

/* ── مودال العقد ── */
function openConModal() {
  document.getElementById('conModalScrim')?.classList.add('show');
  document.getElementById('conModal')?.classList.add('show');
}
function closeConModal() {
  closeItemPicker();
  document.getElementById('conModalScrim')?.classList.remove('show');
  document.getElementById('conModal')?.classList.remove('show');
}

/* ── تشغيل ── */
(window.alfaStart||function(fn){fn();})(function () {
  contracts = JSON.parse(JSON.stringify(DATA.contracts || []));
  menuItems = DATA.items || [];
  renderApp();
});
