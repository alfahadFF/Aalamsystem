/* ================================================================
   invoices.js — شاشة الفواتير الموحّدة — alfaprosys
   تجمع: الفواتير المفتوحة + المعلقة + المنتهية + الملغية
   مع إمكانية التعديل الكاملة من نفس الشاشة
   ================================================================ */

const DATA    = window.DEMO_DATA;
let invoices  = DATA.invoices || [];

/* ── حالة الشاشة ── */
let selectedId       = '';        // الفاتورة المختارة
let filterStatus     = 'active';  // active | open | pending | printed | cancelled | ''
let searchQuery      = '';
let addMode          = false;
let activeCategoryId = null;
let activeFamily     = null;
let pendingItemId    = null;
let editLogs         = [];

/* ── نافذة الإلغاء ── */
let cancelModalOpen   = false;
let cancelReason      = '';
let cancelReasonCustom= '';
let cancelPrepared    = true;
let cancelItemsState  = {};

/* ── نافذة تأكيد مخصصة (بديل confirm المتصفح) ── */
let confirmModal = { open: false, title: '', msg: '', onConfirm: null, danger: false };
function showConfirm(msg, callback, opts) {
  confirmModal = {
    open: true,
    title: (opts && opts.title) || 'تأكيد',
    msg: msg,
    onConfirm: callback,
    danger: !!(opts && opts.danger),
  };
  render();
}
function closeConfirm() { confirmModal.open = false; confirmModal.onConfirm = null; render(); }
function doConfirm() {
  var cb = confirmModal.onConfirm;
  confirmModal.open = false; confirmModal.onConfirm = null;
  render();
  if (cb) cb();
}

/* ── نافذة التعليق ── */
let pendingModalOpen  = false;
let pendingReason     = '';

/* ── أدوات ── */
function goPOS(){ location.href = 'pos.html'; }
function bySort(a,b){ return (a.sort_order||0)-(b.sort_order||0); }
function uniq(arr){ return [...new Set(arr.filter(Boolean))]; }
function nowTime(){ return new Date().toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'}); }
function selectedInvoice(){ return invoices.find(i => i.id === selectedId); }
function recalc(inv){ inv.total=(inv.items||[]).reduce((s,x)=>s+Number(x.total||0),0); }

/* 🛵 فواتير الأونلاين: قراءة فقط + حذف فقط (الطلب 13) */
function isOnlineInv(inv){
  if (!inv) return false;
  if (inv.source === 'online' || inv.online_order_id) return true;
  return ((window.DEMO_DATA && DEMO_DATA.online_orders) || []).some(o => o.invoice_id === inv.id);
}
function invToast(msg){
  let t = document.getElementById('invToast');
  if (!t) { t = document.createElement('div'); t.id = 'invToast'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('show');
  clearTimeout(t._tm); t._tm = setTimeout(() => t.classList.remove('show'), 2300);
}
function deleteOnlineInvoice(){
  const inv = selectedInvoice();
  if (!inv || !isOnlineInv(inv)) return;
  showConfirm(`حذف فاتورة الأونلاين ${invNoLabel(inv)} نهائياً؟\nلا يمكن التراجع عن الحذف.`, function(){
    const ord = (DATA.online_orders || []).find(o => o.invoice_id === inv.id);
    if (ord) ord.invoice_id = null;
    if (inv.stock_applied && window.Stock) { Stock.restore(inv.items); inv.stock_applied = false; }
    invoices = invoices.filter(i => i.id !== inv.id);
    DATA.invoices = invoices;
    if (window.InvoiceSync) InvoiceSync.remove(inv.id);
    selectedId = ''; addMode = false;
    render();
    window.AlfaAudit && AlfaAudit.log('online', 'حذف فاتورة أونلاين نهائياً', `${inv.id} (${fmtNum(inv.total)} ل.س)`, 'مستخدم الفواتير');
    invToast('🗑️ حُذفت فاتورة الأونلاين نهائياً');
  }, { title: '🗑️ حذف نهائي', danger: true });
}

/* ── حالات الفاتورة ── */
const STATUS = {
  open:      { label:'مفتوحة',  icon:'🟢', cls:'st-open'      },
  pending:   { label:'معلقة',   icon:'⏸️', cls:'st-pending'   },
  printed:   { label:'منتهية',  icon:'✅', cls:'st-printed'   },
  modified:  { label:'معدّلة',  icon:'✏️', cls:'st-modified'  },
  cancelled: { label:'ملغية',   icon:'🔴', cls:'st-cancelled' },
};
function stInfo(s){ return STATUS[s] || { label:s||'—', icon:'⚪', cls:'st-unknown' }; }
function stBadge(s){
  const st = stInfo(s);
  return `<span class="inv-badge ${st.cls}">${st.icon} ${st.label}</span>`;
}

/* ── فلترة الفواتير ── */
function filteredInvoices(){
  let list = [...invoices];

  /* فلتر الحالة */
  if(filterStatus === 'active'){
    list = list.filter(i => i.status === 'open' || i.status === 'pending' || i.status === 'modified');
  } else if(filterStatus){
    list = list.filter(i => i.status === filterStatus);
  }

  /* فلتر البحث */
  if(searchQuery.trim()){
    const q = searchQuery.trim().toLowerCase();
    list = list.filter(i =>
      `${invNoLabel(i)} ${i.customer_name||''} ${i.phone||''} ${i.hall||''} ${i.type||''} ${i.status||''}`
      .toLowerCase().includes(q));
  }

  return list;
}

/* ── القائمة ── */
function catItems(){ if(!activeCategoryId) return []; return DATA.items.filter(i=>i.category_id===activeCategoryId&&i.is_available!==false).sort(bySort); }
function families(){ return uniq(catItems().map(i=>i.family)); }
function finalItems(){ if(!activeCategoryId||!activeFamily) return []; return catItems().filter(i=>i.family===activeFamily).sort(bySort); }
function itemTitle(item){
  const v = item.variant_clean || String(item.variant||'').replace(/ - |-/g,' ').trim();
  if(item.option_name && item.option_name!==item.family) return `${item.option_name} ${v}`.trim();
  return v || item.name;
}
function famLabel(f){ return f==='شاورما'&&activeCategoryId==='cat_shawarma'?'وجبات وسندويشات':f; }

/* ================================================================
   الرسم الرئيسي
   ================================================================ */
function render(){
  const list = filteredInvoices();
  const inv  = selectedInvoice();
  const counts = {
    active:    invoices.filter(i=>i.status==='open'||i.status==='pending'||i.status==='modified').length,
    open:      invoices.filter(i=>i.status==='open').length,
    pending:   invoices.filter(i=>i.status==='pending').length,
    printed:   invoices.filter(i=>i.status==='printed').length,
    modified:  invoices.filter(i=>i.status==='modified').length,
    cancelled: invoices.filter(i=>i.status==='cancelled').length,
  };

  document.getElementById('invoicesApp').innerHTML = `
    <div class="inv-shell">

      <!-- Topbar -->
      <header class="inv-topbar">
        <button class="inv-back-btn" onclick="goPOS()">‹ البيع</button>
        <div class="inv-topbar-title">
          <span>🧾</span>
          <span>الفواتير</span>
          ${selectedId && inv ? stBadge(inv.status) : ''}
        </div>
        ${selectedId ? `
          <button class="inv-topbar-list-btn" onclick="clearSelection()">📋 القائمة</button>
        ` : `<div></div>`}
      </header>

      <!-- محتوى -->
      <div class="inv-body ${selectedId ? 'inv-body-detail' : 'inv-body-list'}">

        <!-- ════ عرض القائمة ════ -->
        ${!selectedId ? `

          <!-- فلاتر الحالة -->
          <div class="inv-filters">
            ${[
              { key:'active',    label:`نشطة`,      icon:'⚡', count: counts.active    },
              { key:'open',      label:`مفتوحة`,    icon:'🟢', count: counts.open      },
              { key:'pending',   label:`معلقة`,     icon:'⏸️', count: counts.pending   },
              { key:'printed',   label:`منتهية`,    icon:'✅', count: counts.printed   },
              { key:'modified',  label:`معدّلة`,    icon:'✏️', count: counts.modified  },
              { key:'cancelled', label:`ملغية`,     icon:'🔴', count: counts.cancelled },
              { key:'',          label:`الكل`,      icon:'🗂️', count: invoices.length  },
            ].map(f => `
              <button class="inv-filter-btn ${filterStatus===f.key?'active':''}"
                onclick="setFilter('${f.key}')">
                ${f.icon} ${f.label}
                <span class="inv-filter-count">${f.count}</span>
              </button>`).join('')}
          </div>

          <!-- شريط البحث -->
          <div class="inv-search-bar">
            <input type="search" dir="rtl"
              class="inv-search-input"
              placeholder="رقم فاتورة / اسم عميل / صالة..."
              value="${e(searchQuery)}"
              oninput="searchQuery=this.value; render()">
            ${searchQuery ? `<button class="inv-search-clear" onclick="searchQuery=''; render()">×</button>` : ''}
          </div>

          <!-- قائمة الفواتير -->
          <div class="inv-list">
            ${list.length ? list.map(renderInvRow).join('') : `
              <div class="inv-empty">
                <span>📭</span>
                <p>لا توجد فواتير في هذه الفئة</p>
              </div>`}
          </div>

        ` : `

          <!-- ════ عرض التفاصيل ════ -->
          ${inv ? renderDetail(inv) : `<div class="inv-empty"><span>⚠️</span><p>الفاتورة غير موجودة</p></div>`}

        `}

      </div>

      <!-- مودالات -->
      ${renderQtyModal()}
      ${cancelModalOpen ? renderCancelModal() : ''}
      ${pendingModalOpen ? renderPendingModal() : ''}
      ${confirmModal.open ? renderConfirmModal() : ''}

    </div>`;
}

/* ── صف الفاتورة في القائمة ── */
function renderInvRow(inv){
  const typeLabel = { table:'طاولة', takeaway:'سفري', delivery:'توصيل', contract:'عقد' }[inv.type] || inv.type || '—';
  return `
    <button class="inv-row" onclick="selectInv('${e(inv.id)}')">
      <div class="inv-row-start">
        <div class="inv-row-id">${e(invNoLabel(inv))}</div>
        <div class="inv-row-sub">
          ${e(inv.hall || inv.customer_name || typeLabel)}
          ${inv.time ? `· ${e(inv.time)}` : ''}
        </div>
      </div>
      <div class="inv-row-end">
        ${isOnlineInv(inv) ? '<span class="inv-online-badge">🛵 أونلاين</span>' : ''}
        ${stBadge(inv.status)}
        <div class="inv-row-total">${fmtNum(inv.total)} <small>ل.س</small></div>
      </div>
    </button>`;
}

/* ================================================================
   صفحة تفاصيل الفاتورة
   ================================================================ */
function renderDetail(inv){
  recalc(inv);
  const online     = isOnlineInv(inv);
  const canEdit    = !online && (inv.status === 'open' || inv.status === 'pending');
  const canModify  = !online && (inv.status === 'open' || inv.status === 'pending' || inv.status === 'printed' || inv.status === 'modified');
  const isPending  = inv.status === 'pending';
  const isOpen     = inv.status === 'open';
  const isModified = inv.status === 'modified';
  const typeLabel  = { table:'طاولة', takeaway:'سفري', delivery:'توصيل', contract:'عقد' }[inv.type] || inv.type || '—';

  return `
    <!-- رأس التفاصيل -->
    <div class="inv-detail-head">
      <div class="inv-detail-meta">
        <div class="inv-detail-id">🧾 ${e(invNoLabel(inv))} ${online ? '<span class="inv-online-badge">🛵 أونلاين</span>' : ''}</div>
        <div class="inv-detail-info">
          ${e(inv.hall || inv.customer_name || typeLabel)}
          ${inv.time ? `· ${e(inv.time)}` : ''}
          ${inv.cashier ? `· ${e(inv.cashier)}` : ''}
        </div>
      </div>
      ${stBadge(inv.status)}
    </div>

    <!-- ملاحظة الحالة -->
    ${isPending && inv.pending_reason ? `
      <div class="inv-status-note inv-note-pending">⏸️ <strong>معلقة:</strong> ${e(inv.pending_reason)}</div>` : ''}
    ${inv.status==='cancelled' && inv.cancel_reason ? `
      <div class="inv-status-note inv-note-cancelled">🔴 <strong>سبب الإلغاء:</strong> ${e(inv.cancel_reason)}</div>` : ''}
    ${online ? `
      <div class="inv-status-note inv-note-online">🛵 <strong>فاتورة من طلب أونلاين</strong> — قراءة فقط: لا تعديل ولا إلغاء، ويمكن حذفها نهائياً فحسب</div>` : ''}

    <!-- شريط الإجراءات -->
    <div class="inv-act-bar">
      ${online ? `
        <button class="inv-act" onclick="printEditNotice('${e(invNoLabel(inv))}')">🖨️ طباعة</button>
        <button class="inv-act inv-act-del-btn" onclick="deleteOnlineInvoice()">🗑️ حذف نهائي</button>` : `
        ${canModify ? `
          <button class="inv-act ${addMode?'inv-act-active':''}" onclick="toggleAddMode()">
            ${addMode ? '✖ إغلاق' : '➕ إضافة'}
          </button>
          <button class="inv-act" onclick="printEditNotice('${e(invNoLabel(inv))}')">🖨️ طباعة</button>
        ` : ''}
        ${(inv.status === 'printed' || isModified) && !online ? `
          <button class="inv-act" style="background:#fef3c7;border-color:#f59e0b;color:#92400e;" onclick="printKitchenModification('${e(inv.id)}')">🍳 إشعار المطبخ</button>
        ` : ''}
        ${isOpen ? `
          <button class="inv-act inv-act-pending-btn" onclick="openPendingModal()">⏸️ تعليق</button>` : ''}
        ${isPending ? `
          <button class="inv-act inv-act-reopen-btn" onclick="reopenInvoice()">🟢 فتح</button>` : ''}
        ${canModify ? `
          <button class="inv-act inv-act-cancel-btn" onclick="openCancelModal()">🔴 إلغاء</button>` : ''}`}
    </div>

    <!-- أصناف الفاتورة -->
    <div class="inv-items-list">
      ${(inv.items||[]).map((it,idx) => `
        <div class="inv-item ${!canModify?'inv-item-locked':''}">
          <div class="inv-item-main">
            <div class="inv-item-name">${e(it.name)}</div>
            <div class="inv-item-qty">× ${fmtNum(it.qty)}</div>
            <div class="inv-item-total">${fmtNum(it.total)}</div>
          </div>
          ${canModify ? `
            <div class="inv-item-actions">
              <button onclick="decreaseItem(${idx})">− 1</button>
              <button onclick="replaceItem(${idx})">استبدال</button>
              <button class="danger" onclick="removeItem(${idx})">حذف</button>
            </div>` : ''}
          ${it.note ? `<div class="inv-item-note">📝 ${e(it.note)}</div>` : ''}
        </div>`).join('') || `<div class="inv-empty-items">لا توجد أصناف</div>`}
    </div>

    <!-- الإجمالي -->
    <div class="inv-total-bar">
      <span>إجمالي الفاتورة</span>
      <strong>${fmtNum(inv.total)} ل.س</strong>
    </div>

    <!-- لوحة الإضافة -->
    ${addMode && canModify ? renderAddPanel() : ''}

    <!-- سجل التعديلات -->
    ${editLogs.filter(l=>l.invoice_id===inv.id).length ? `
      <div class="inv-log">
        <div class="inv-log-title">📋 سجل التعديلات</div>
        ${editLogs.filter(l=>l.invoice_id===inv.id).slice().reverse().map(l => `
          <div class="inv-log-row">
            <span>${e(l.text)}</span>
            <small>${e(l.time)}</small>
          </div>`).join('')}
      </div>` : ''}
  `;
}

/* ================================================================
   لوحة إضافة الأصناف
   ================================================================ */
function renderAddPanel(){
  const cats  = sellableCategories();
  const fams  = activeCategoryId ? families() : [];
  const items = finalItems();

  if(!activeCategoryId) return `
    <div class="inv-add-panel">
      <div class="inv-add-title">➕ اختر التصنيف</div>
      <div class="inv-add-grid">
        ${cats.map(c=>`<button onclick="selCat('${e(c.id)}')"><span>${c.icon}</span>${e(c.name)}</button>`).join('')}
      </div>
    </div>`;

  if(!activeFamily) return `
    <div class="inv-add-panel">
      <div class="inv-add-nav"><button onclick="resetPicker()">‹ التصنيفات</button></div>
      <div class="inv-add-grid">
        ${fams.map(f=>`<button onclick="selFam('${e(f)}')">${e(famLabel(f))}</button>`).join('')}
      </div>
    </div>`;

  return `
    <div class="inv-add-panel">
      <div class="inv-add-nav"><button onclick="activeFamily=null; render()">‹ رجوع</button></div>
      <div class="inv-add-grid items">
        ${items.map(i=>`<button onclick="openQty('${e(i.id)}')">
          <span class="add-item-name">${e(itemTitle(i))}</span>
          <span class="add-item-price">${fmtNum(i.price)}</span>
        </button>`).join('')}
      </div>
    </div>`;
}

/* ================================================================
   نافذة الكمية
   ================================================================ */
function renderQtyModal(){
  if(!pendingItemId) return '';
  const item = DATA.items.find(i=>i.id===pendingItemId);
  if(!item) return '';
  return `
    <div class="inv-scrim" onclick="closeQty()"></div>
    <div class="inv-modal">
      <div class="inv-modal-head">
        <div><strong>${e(itemTitle(item))}</strong><span>${fmtNum(item.price)} ل.س</span></div>
        <button onclick="closeQty()">✕</button>
      </div>
      <div class="inv-qty-grid">
        ${Array.from({length:20},(_,i)=>i+1).map(n=>`<button onclick="addItem(${n})">${n}</button>`).join('')}
      </div>
      <div class="inv-qty-custom">
        <input id="qtyInput" type="number" inputmode="numeric" placeholder="كمية أخرى...">
        <button onclick="addCustomQty()">إضافة</button>
      </div>
    </div>`;
}

/* ================================================================
   نافذة الإلغاء
   ================================================================ */
const CANCEL_REASONS = [
  'طلب العميل الإلغاء','لم يرد على الهاتف','خطأ في الطلب',
  'انتهى المخزون','تأخر في التحضير','مشكلة في الدفع','زبون لم يحضر'
];

function renderCancelModal(){
  const inv = selectedInvoice();
  const hasDebt = inv && (inv.pay_type === 'deferred' || inv.pay_type === 'partial');
  const stats = getCancelStats();
  return `
    <div class="inv-scrim" onclick="closeCancelModal()"></div>
    <div class="inv-modal inv-modal-action" style="max-height:90vh;overflow-y:auto;">
      <div class="inv-modal-head danger-head">
        <strong>🔴 إلغاء الفاتورة ${inv ? invNoLabel(inv) : ''}</strong>
        <button onclick="closeCancelModal()">✕</button>
      </div>
      <div class="inv-modal-body">
        <!-- تصنيف الأصناف: محضّر vs قابل للإرجاع -->
        <div style="margin-bottom:14px;padding:12px;background:#fef2f2;border-radius:10px;border:1.5px solid #fca5a5;">
          <div style="font-weight:700;margin-bottom:10px;">📦 حالة المواد عند الإلغاء</div>
          <div style="display:flex;gap:6px;margin-bottom:10px;">
            <button class="inv-reason-btn" style="flex:1;font-size:11px;"
              onclick="setAllCancelItems('prepared')">🍳 الكل محضّر (خسارة)</button>
            <button class="inv-reason-btn" style="flex:1;font-size:11px;"
              onclick="setAllCancelItems('returnable')">✅ الكل يُرجع للمخزون</button>
          </div>
          <div style="display:flex;flex-direction:column;gap:6px;">
            ${(inv.items || []).map(it => {
              const key = it.id || it.name;
              const st = cancelItemsState[key] || 'prepared';
              const isRet = st === 'returnable';
              return `
                <div class="canc-item ${isRet ? 'returnable' : 'prepared'}" onclick="toggleCancelItem('${e(key)}')">
                  <div style="flex:1;">
                    <div style="font-weight:600;font-size:12px;">${e(it.name)}</div>
                    <div style="font-size:11px;opacity:0.8;">${it.qty}× — ${fmtNum(it.total)} ل.س</div>
                  </div>
                  <div class="canc-badge ${isRet ? 'ret' : 'prep'}">${isRet ? '✅ يُرجع' : '🍳 مستهلك'}</div>
                </div>`;
            }).join('')}
          </div>
          <div style="margin-top:10px;display:flex;gap:8px;font-size:11px;">
            <div style="flex:1;padding:6px;background:#fee2e2;border-radius:6px;text-align:center;">
              <div style="font-weight:700;color:#991b1b;">${stats.prepared.length} صنف</div>
              <div style="color:#7f1d1d;">مستهلك (خسارة ${fmtNum(stats.preparedTotal)})</div>
            </div>
            <div style="flex:1;padding:6px;background:#d1fae5;border-radius:6px;text-align:center;">
              <div style="font-weight:700;color:#065f46;">${stats.returnable.length} صنف</div>
              <div style="color:#064e3b;">يُرجع للمخزون (${fmtNum(stats.returnableTotal)})</div>
            </div>
          </div>
        </div>

        ${hasDebt ? `
        <div style="margin-bottom:12px;padding:10px;background:#eff6ff;border-radius:10px;border:1.5px solid #93c5fd;font-size:12px;">
          📒 <strong>هذه الفاتورة عليها ذمة</strong> — سيتم خصم المبلغ من ذمة العميل تلقائياً
        </div>` : ''}

        <p class="inv-modal-hint">اختر سبب الإلغاء أو أدخله يدوياً</p>
        <div class="inv-reasons-grid">
          ${CANCEL_REASONS.map(r=>`
            <button class="inv-reason-btn ${cancelReason===r?'selected':''}"
              onclick="selectCancelReason('${e(r)}')">${e(r)}</button>`).join('')}
        </div>
        <input type="text" class="inv-reason-input"
          placeholder="أو اكتب سبباً آخر..."
          value="${e(cancelReasonCustom)}"
          oninput="cancelReasonCustom=this.value; cancelReason=this.value;">
      </div>
      <div class="inv-modal-foot">
        <button class="inv-modal-btn secondary" onclick="closeCancelModal()">تراجع</button>
        <button class="inv-modal-btn danger" onclick="confirmCancel()"
          ${(!cancelReason&&!cancelReasonCustom)?'disabled':''}>🔴 تأكيد الإلغاء</button>
      </div>
    </div>`;
}

/* ================================================================
   نافذة التعليق
   ================================================================ */
const PENDING_REASONS = ['العميل يفكر في الطلب','انتظار موافقة','العميل خرج مؤقتاً','طلب تأجيل التحضير'];

function renderPendingModal(){
  return `
    <div class="inv-scrim" onclick="closePendingModal()"></div>
    <div class="inv-modal inv-modal-action">
      <div class="inv-modal-head pending-head">
        <strong>⏸️ تعليق الفاتورة</strong>
        <button onclick="closePendingModal()">✕</button>
      </div>
      <div class="inv-modal-body">
        <p class="inv-modal-hint">ما سبب التعليق؟ (اختياري)</p>
        <div class="inv-reasons-grid">
          ${PENDING_REASONS.map(r=>`
            <button class="inv-reason-btn ${pendingReason===r?'selected':''}"
              onclick="pendingReason='${e(r)}'; render()">${e(r)}</button>`).join('')}
        </div>
        <input type="text" class="inv-reason-input"
          placeholder="أو اكتب سبباً..."
          value="${e(pendingReason)}"
          oninput="pendingReason=this.value;">
      </div>
      <div class="inv-modal-foot">
        <button class="inv-modal-btn secondary" onclick="closePendingModal()">تراجع</button>
        <button class="inv-modal-btn pending" onclick="confirmPending()">⏸️ تعليق</button>
      </div>
    </div>`;
}

function renderConfirmModal(){
  return `
    <div class="inv-scrim" onclick="closeConfirm()"></div>
    <div class="inv-modal" style="width:min(360px,92vw);">
      <div class="inv-modal-head ${confirmModal.danger ? 'danger-head' : ''}">
        <strong>${e(confirmModal.title)}</strong>
        <button onclick="closeConfirm()">✕</button>
      </div>
      <div class="inv-modal-body" style="padding:18px 16px;">
        <p style="font-size:14px;line-height:1.7;color:var(--fahad-navy);white-space:pre-line;">${e(confirmModal.msg)}</p>
      </div>
      <div class="inv-modal-foot">
        <button class="inv-modal-btn secondary" onclick="closeConfirm()">تراجع</button>
        <button class="inv-modal-btn ${confirmModal.danger ? 'danger' : 'pending'}" onclick="doConfirm()">تأكيد</button>
      </div>
    </div>`;
}

/* ================================================================
   منطق الإجراءات
   ================================================================ */
function setFilter(s)    { filterStatus=s; searchQuery=''; render(); }
function selectInv(id)   { selectedId=id; addMode=false; activeCategoryId=null; activeFamily=null; render(); }
function clearSelection(){ selectedId=''; addMode=false; activeCategoryId=null; activeFamily=null; render(); }
function toggleAddMode() { addMode=!addMode; activeCategoryId=null; activeFamily=null; render(); }
function selCat(id)      { activeCategoryId=id; activeFamily=null; const fs=families(); if(fs.length===1) activeFamily=fs[0]; render(); }
function selFam(f)       { activeFamily=f; render(); }
function resetPicker()   { activeCategoryId=null; activeFamily=null; render(); }
function openQty(id)     { pendingItemId=id; render(); }
function closeQty()      { pendingItemId=null; render(); }
function addCustomQty()  { const q=Number(document.getElementById('qtyInput')?.value||0); if(q>0) addItem(q); }

/* ── تحويل الفاتورة المطبوعة إلى معدّلة ── */
function markAsModified(inv) {
  if (inv.status === 'printed') {
    inv.status = 'modified';
    inv.modified_at = new Date().toISOString();
    inv.modifications = [];
    editLogs.push({ invoice_id:inv.id, text:`✏️ بدء التعديل على الفاتورة المطبوعة`, time:nowTime() });
  }
  return inv;
}

function logModification(inv, type, detail) {
  if (!inv.modifications) inv.modifications = [];
  inv.modifications.push({ type, detail, time: new Date().toISOString() });
}

function addItem(qty){
  const inv  = selectedInvoice();
  const item = DATA.items.find(i=>i.id===pendingItemId);
  if(!inv||!item) return;
  const title = itemTitle(item);
  const name  = item.option_name&&item.option_name!==item.family ? title : `${item.family} ${title}`.trim();
  const line = { id:item.id, name, qty, price:item.price, total:item.price*qty, note:'', added_now:true };
  inv.items.push(line);
  recalc(inv);
  if (inv.stock_applied && window.Stock) Stock.deduct([line]);
  if (inv.status === 'printed') markAsModified(inv);
  if (inv.modifications) logModification(inv, 'add', `${qty}× ${title}`);
  editLogs.push({ invoice_id:inv.id, text:`➕ إضافة ${qty}× ${title}`, time:nowTime() });
  window.AlfaAudit && AlfaAudit.log('invoices', 'إضافة صنف لفاتورة', `${inv.id}: +${qty}× ${title}`, 'مستخدم الفواتير');
  pendingItemId=null;
  /* ── ترحيل: محلي + Supabase ── */
  if (window.AlfaDB && AlfaDB.upsert) AlfaDB.upsert('invoices', inv);
  if (window.InvoiceSync) InvoiceSync.pushSoon(inv);
  if (window.alfaPersist) window.alfaPersist();
  render();
}

function decreaseItem(idx){
  const inv=selectedInvoice(); if(!inv) return;
  const it=inv.items[idx]; if(!it) return;
  const oldQty=Number(it.qty||0);
  if(oldQty<=1) return removeItem(idx);
  const unit=Number(it.total||0)/oldQty;
  it.qty=oldQty-1; it.total=Math.round(unit*it.qty);
  recalc(inv);
  if (inv.stock_applied && window.Stock) Stock.delta(it, -1);
  if (inv.status === 'printed') markAsModified(inv);
  if (inv.modifications) logModification(inv, 'decrease', `−1 من ${it.name} (الكمية الجديدة: ${it.qty})`);
  editLogs.push({ invoice_id:inv.id, text:`➖ إنقاص 1 من ${it.name}`, time:nowTime() });
  window.AlfaAudit && AlfaAudit.log('invoices', 'إنقاص كمية', `${inv.id}: −1 من ${it.name}`, 'مستخدم الفواتير');
  /* ── ترحيل: محلي + Supabase ── */
  if (window.AlfaDB && AlfaDB.upsert) AlfaDB.upsert('invoices', inv);
  if (window.InvoiceSync) InvoiceSync.pushSoon(inv);
  if (window.alfaPersist) window.alfaPersist();
  render();
}

function removeItem(idx){
  const inv=selectedInvoice(); if(!inv) return;
  const it=inv.items[idx];
  showConfirm(`حذف الصنف من الفاتورة؟\n${it?.name||''}`, function(){
    if (inv.stock_applied && window.Stock) Stock.restore([it]);
    const removedName = it?.name || 'صنف';
    const removedQty  = it?.qty || 0;
    inv.items.splice(idx,1); recalc(inv);
    if (inv.status === 'printed') markAsModified(inv);
    if (inv.modifications) logModification(inv, 'remove', `${removedQty}× ${removedName}`);
    editLogs.push({ invoice_id:inv.id, text:`🗑️ حذف ${removedName}`, time:nowTime() });
    window.AlfaAudit && AlfaAudit.log('invoices', 'حذف صنف من فاتورة', `${inv.id}: ${removedName}`, 'مستخدم الفواتير');
    if (window.AlfaDB && AlfaDB.upsert) AlfaDB.upsert('invoices', inv);
    if (window.InvoiceSync) InvoiceSync.pushSoon(inv);
    if (window.alfaPersist) window.alfaPersist();
    render();
  }, { title: '🗑️ حذف صنف', danger: true });
}

function replaceItem(idx){
  const inv=selectedInvoice(); if(!inv) return;
  const it=inv.items[idx]; if(!it) return;
  showConfirm(`سيُحذف: ${it.name}\nثم اختر البديل من القائمة.`, function(){
    if (inv.stock_applied && window.Stock) Stock.restore([it]);
    const removedName = it.name;
    inv.items.splice(idx,1); recalc(inv);
    if (inv.status === 'printed') markAsModified(inv);
    if (inv.modifications) logModification(inv, 'replace', `حُذف: ${removedName} ← بانتظار البديل`);
    editLogs.push({ invoice_id:inv.id, text:`↔️ استبدال ${removedName}`, time:nowTime() });
    window.AlfaAudit && AlfaAudit.log('invoices', 'استبدال صنف', `${inv.id}: ${removedName}`, 'مستخدم الفواتير');
    if (window.AlfaDB && AlfaDB.upsert) AlfaDB.upsert('invoices', inv);
    if (window.InvoiceSync) InvoiceSync.pushSoon(inv);
    if (window.alfaPersist) window.alfaPersist();
    addMode=true; activeCategoryId=null; activeFamily=null; render();
  }, { title: '🔄 استبدال صنف' });
}

/* ── إلغاء ── */
function openCancelModal()  {
  cancelModalOpen=true; cancelReason=''; cancelReasonCustom='';
  cancelPrepared = true;
  initCancelItems();
  render();
}
function closeCancelModal() { cancelModalOpen=false; render(); }
function selectCancelReason(r){ cancelReason=r; cancelReasonCustom=''; render(); }

/* ── تصنيف تلقائي للأصناف: أيها قابل للإرجاع وأيها مستهلك ── */
const RETURNABLE_CATEGORIES = new Set([
  'cat_drinks',   // المشروبات الباردة — بيبسي، عيران، ماء → جاهزة للإرجاع
]);
const RETURNABLE_KEYWORDS = [
  'كتشب', 'كاتشب', 'مايونيز', 'مايونيز', 'ثوم', 'طحينة', 'حار', 'مستردة', 'خردل',
  'بيبسي', 'كولا', 'عيران', 'ماء', 'ميرندا', 'سفن', 'فانتا', 'ريد بول', 'شاي معلب',
  'عصير معلب', 'عصير طازج', 'لبن', 'حليب',
  'مناديل', 'كيس', 'كأس', 'صحن', 'ملعقة', 'شوكة',
  'خل', 'زيت', 'ملح', 'فلفل', 'ليمون',
];
function isItemReturnable(invItem) {
  /* 1) فحص بالفئة */
  const menuItem = (DATA.items || []).find(i => i.id === invItem.id);
  if (menuItem && RETURNABLE_CATEGORIES.has(menuItem.category_id)) return true;
  /* 2) فحص بالكلمات المفتاحية في الاسم */
  const name = (invItem.name || '').toLowerCase();
  return RETURNABLE_KEYWORDS.some(kw => name.includes(kw));
}
function initCancelItems() {
  const inv = selectedInvoice();
  cancelItemsState = {};
  if (!inv || !inv.items) return;
  inv.items.forEach(it => {
    cancelItemsState[it.id || it.name] = isItemReturnable(it) ? 'returnable' : 'prepared';
  });
}
function toggleCancelItem(key) {
  cancelItemsState[key] = cancelItemsState[key] === 'prepared' ? 'returnable' : 'prepared';
  render();
}
function setAllCancelItems(state) {
  Object.keys(cancelItemsState).forEach(k => { cancelItemsState[k] = state; });
  render();
}
function getCancelStats() {
  const inv = selectedInvoice();
  if (!inv || !inv.items) return { returnable: [], prepared: [], returnableTotal: 0, preparedTotal: 0 };
  const returnable = [], prepared = [];
  inv.items.forEach(it => {
    const key = it.id || it.name;
    const st = cancelItemsState[key] || 'prepared';
    if (st === 'returnable') returnable.push(it);
    else prepared.push(it);
  });
  const returnableTotal = returnable.reduce((s, it) => s + (it.total || 0), 0);
  const preparedTotal = prepared.reduce((s, it) => s + (it.total || 0), 0);
  return { returnable, prepared, returnableTotal, preparedTotal };
}
function confirmCancel(){
  const inv=selectedInvoice(); if(!inv) return;
  const reason=cancelReasonCustom.trim()||cancelReason;
  if(!reason) return;
  inv.status='cancelled';
  inv.cancelled_at = new Date().toISOString();

  /* ── تصنيف الأصناف: محضّر vs قابل للإرجاع ── */
  const stats = getCancelStats();
  const hasReturnable = stats.returnable.length > 0;
  const hasPrepared   = stats.prepared.length > 0;
  inv.cancel_items = {};
  (inv.items || []).forEach(it => {
    const key = it.id || it.name;
    inv.cancel_items[key] = cancelItemsState[key] || 'prepared';
  });
  const lossItems = stats.prepared.map(it => `${it.qty}× ${it.name}`).join(', ');
  const retItems  = stats.returnable.map(it => `${it.qty}× ${it.name}`).join(', ');
  inv.cancel_reason = reason
    + (hasPrepared   ? ` | مواد مستهلكة (خسارة): ${lossItems}` : '')
    + (hasReturnable ? ` | مواد مُرجعة للمخزون: ${retItems}` : '');

  /* ── المخزون: إرجاع الأصناف القابلة للإرجاع فقط ── */
  if (inv.stock_applied && window.Stock) {
    if (hasReturnable) {
      /* إرجاع الأصناف القابلة للإرجاع للمخزون */
      Stock.restore(stats.returnable);
    }
    if (!hasPrepared) {
      /* لا مواد مستهلكة → تم إرجاع الكل */
      inv.stock_applied = false;
    } else if (hasReturnable) {
      /* إرجاع جزئي → نحتفظ بالعلامة لأن بعضها ما زال مخصوماً */
    }
    /* المواد المحضرة تبقى مخصومة = خسارة — تُسجّل في سجل المخزون */
    if (hasPrepared && window.DEMO_DATA) {
      const day = window.businessDay ? businessDay() : new Date().toISOString().slice(0, 10);
      const inv_items = DEMO_DATA.inventory || [];
      const trackable = inv_items.filter(x => x.trackable && Array.isArray(x.recipe) && x.recipe.length);
      stats.prepared.forEach(it => {
        /* البحث في inventory items عن المواد التي تستهلك هذا الصنف */
        trackable.forEach(invItem => {
          invItem.recipe.forEach(rec => {
            if (rec.item_id === it.id) {
              invItem.log = invItem.log || [];
              invItem.log.unshift({
                id: 'il_' + Date.now() + '_' + Math.random().toString(36).slice(2,4),
                date: day, type: 'waste', qty: rec.qty * it.qty,
                note: `خسارة إلغاء فاتورة #${inv.id} — ${it.name} (${reason})`, auto: true,
              });
            }
          });
        });
      });
    }
  }

  /* ── الذمة: خصم قيمة الفاتورة من ذمة العميل ── */
  const invTotal = inv.total || 0;
  const ph = String(inv.phone || '').trim();
  if (invTotal > 0 && (inv.pay_type === 'deferred' || inv.pay_type === 'partial')) {
    const cust = ph
      ? (DATA.customers || []).find(c => String(c.phone || '').trim() === ph)
      : null;
    if (cust) {
      const cancelledDebt = inv.pay_type === 'deferred' ? invTotal : Math.max(0, invTotal - (inv.discount_detail && inv.discount_detail.partial_amount || 0));
      cust.credit_balance = Math.max(0, (cust.credit_balance || 0) - cancelledDebt);
      cust.payments = cust.payments || [];
      cust.payments.unshift({
        id: 'pay_' + String(Date.now()).slice(-6),
        date: inv.date || new Date().toISOString().slice(0, 10),
        amount: cancelledDebt,
        note: 'إلغاء فاتورة #' + inv.id + ' — ' + reason,
        invoice_id: inv.id,
        type: 'cancel_refund',
      });
      if (window.CustomerSync) CustomerSync.pushSoon();
    }
  }

  /* ── الترحيل والتدقيق ── */
  if (window.InvoiceSync) InvoiceSync.pushSoon(inv);
  const summary = `${inv.id} (${fmtNum(inv.total)} ل.س) — السبب: ${reason}`
    + (hasPrepared   ? ` — خسارة مواد: ${lossItems}` : '')
    + (hasReturnable ? ` — أُرجع للمخزون: ${retItems}` : '');
  window.AlfaAudit && AlfaAudit.log('invoices', 'إلغاء فاتورة', summary, 'مستخدم الفواتير');
  editLogs.push({ invoice_id:inv.id,
    text:`🔴 إلغاء: ${reason} — ${hasPrepared ? 'خسارة: '+lossItems : ''} ${hasReturnable ? 'استرجاع: '+retItems : ''}`.trim(),
    time:nowTime() });
  /* ── حفظ البيانات: محلي + Supabase ── */
  if (window.AlfaDB && AlfaDB.upsert) AlfaDB.upsert('invoices', inv);
  if (window.InvoiceSync) InvoiceSync.pushSoon(inv);
  if (window.alfaPersist) window.alfaPersist();
  cancelModalOpen=false; render();
}

/* ── تعليق ── */
function openPendingModal()  { pendingModalOpen=true; pendingReason=''; render(); }
function closePendingModal() { pendingModalOpen=false; render(); }
function confirmPending(){
  const inv=selectedInvoice(); if(!inv) return;
  inv.status='pending'; inv.pending_reason=pendingReason||'تعليق';
  if (window.InvoiceSync) InvoiceSync.pushSoon(inv);
  editLogs.push({ invoice_id:inv.id, text:`⏸️ تعليق: ${inv.pending_reason}`, time:nowTime() });
  pendingModalOpen=false; render();
}
function reopenInvoice(){
  const inv=selectedInvoice(); if(!inv) return;
  inv.status='open'; inv.pending_reason='';
  if (window.InvoiceSync) InvoiceSync.pushSoon(inv);
  editLogs.push({ invoice_id:inv.id, text:'🟢 إعادة فتح', time:nowTime() });
  window.AlfaAudit && AlfaAudit.log('invoices', 'إعادة فتح فاتورة', inv.id, 'مستخدم الفواتير');
  render();
}

function printEditNotice(id){ alert(`طباعة إشعار تعديل: ${id}`); }

/* ── طباعة إشعار التعديل للمطبخ ── */
function printKitchenModification(invId) {
  const inv = invoices.find(i => i.id === invId);
  if (!inv) return;
  const mods = inv.modifications || [];
  if (!mods.length) {
    showConfirm('لا توجد تعديلات جديدة بعد.\nهل تريد طباعة الفاتورة المحدّثة كاملة؟', function(){
      printEditNotice(invId);
    }, { title: '🖨️ طباعة' });
    return;
  }
  const typeIcons = { add: '🟢', decrease: '🔶', remove: '🔴', replace: '🔄' };
  const typeLabels = { add: 'أُضيف', decrease: 'نُقِص', remove: 'حُذف', replace: 'استبدال' };
  const now = new Date();
  const timeStr = now.toTimeString().slice(0,5);
  const dateStr = now.toISOString().slice(0,10);

  const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8">
<title>إشعار تعديل — ${inv.id}</title>
<style>
@page{size:80mm auto;margin:0;}
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'Courier New',monospace;width:72mm;margin:0 auto;padding:4mm;font-size:12px;color:#000;}
.hdr{text-align:center;border-bottom:2px dashed #000;padding-bottom:6px;margin-bottom:8px;}
.hdr h2{font-size:16px;letter-spacing:1px;}
.hdr .sub{font-size:11px;color:#333;margin-top:2px;}
.warn{background:#000;color:#fff;text-align:center;padding:4px;font-weight:bold;font-size:14px;margin:6px 0;}
.inv-info{display:flex;justify-content:space-between;font-size:11px;margin-bottom:8px;}
.mod-list{border-top:1px dashed #000;padding-top:6px;}
.mod-item{padding:4px 0;border-bottom:1px dotted #999;font-size:12px;display:flex;gap:4px;align-items:flex-start;}
.mod-icon{flex-shrink:0;width:20px;text-align:center;}
.mod-text{flex:1;}
.footer{margin-top:10px;border-top:2px dashed #000;padding-top:6px;text-align:center;font-size:10px;}
.total{font-weight:bold;font-size:13px;text-align:center;margin:8px 0;padding:4px;border:1px solid #000;}
.items-now{margin-top:8px;border-top:1px dashed #000;padding-top:6px;}
.items-now h3{font-size:12px;margin-bottom:4px;}
.item-row{display:flex;justify-content:space-between;font-size:11px;padding:2px 0;}
</style></head><body>
<div class="hdr">
  <h2>⚠️ إشعار تعديل</h2>
  <div class="sub">فاتورة #${inv.id} — ${dateStr} ${timeStr}</div>
</div>
<div class="warn">🔔 انتبه — تعديلات على طلب مطبوع</div>
<div class="inv-info">
  <span>${inv.hall || inv.customer_name || ''}</span>
  <span>${inv.type === 'dinein' ? '🍽️ طاولة' : inv.type === 'takeaway' ? '🥡 سفري' : inv.type === 'delivery' ? '🛵 توصيل' : ''}</span>
</div>
<div class="mod-list">
  ${mods.map(m => `
    <div class="mod-item">
      <span class="mod-icon">${typeIcons[m.type] || '•'}</span>
      <span class="mod-text"><strong>${typeLabels[m.type] || m.type}:</strong> ${m.detail}</span>
    </div>`).join('')}
</div>
<div class="items-now">
  <h3>📋 الأصناف الحالية:</h3>
  ${(inv.items||[]).map(it => `
    <div class="item-row">
      <span>${it.name}</span>
      <span>×${it.qty}</span>
    </div>`).join('') || '<div class="item-row"><span>لا أصناف</span></div>'}
</div>
<div class="total">الإجمالي: ${Number(inv.total||0).toLocaleString('ar-EG')} ل.س</div>
<div class="footer">
  ⏰ ${timeStr} — يرجى التعديل فوراً<br>
  ${mods.length} تعديل على هذه الفاتورة
</div>
</body></html>`;

  const win = window.open('', '_blank', 'width=320,height=600');
  win.document.write(html);
  win.document.close();
  setTimeout(() => { win.print(); }, 300);

  /* مسح التعديلات بعد الطباعة (ستُجمع تعديلات جديدة) */
  inv.modifications = [];
  inv.last_kitchen_print = new Date().toISOString();
  editLogs.push({ invoice_id:inv.id, text:`🍳 طُبِع إشعار تعديل للمطبخ (${mods.length} تعديل)`, time:nowTime() });
  window.AlfaAudit && AlfaAudit.log('invoices', 'طباعة إشعار تعديل للمطبخ', `${inv.id}: ${mods.length} تعديل`, 'مستخدم الفواتير');
  /* ── ترحيل: محلي + Supabase ── */
  if (window.AlfaDB && AlfaDB.upsert) AlfaDB.upsert('invoices', inv);
  if (window.InvoiceSync) InvoiceSync.pushSoon(inv);
  if (window.alfaPersist) window.alfaPersist();
  render();
}

(window.alfaStart||function(fn){fn();})(function () {
  invoices = DATA.invoices || [];
  render();
  if (window.AlfaLive) AlfaLive.start(10000, function () {
    invoices = DATA.invoices || invoices;
    render();
  });
});

