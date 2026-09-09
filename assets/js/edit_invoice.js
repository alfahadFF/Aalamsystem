/* ================================================================
   edit_invoice.js — تعديل الفاتورة — alfaprosys
   ================================================================ */

const DATA    = window.DEMO_DATA;
let invoices  = DATA.invoices || [];
let query     = new URLSearchParams(location.search).get('id') || '';
let selectedId     = query;
let addMode        = false;
let activeCategoryId = null;
let activeFamily   = null;
let pendingItemId  = null;
let editLogs       = [];

/* ── نافذة الإلغاء ── */
let cancelModalOpen = false;
let cancelReason    = '';
let cancelReasonCustom = '';

/* ── نافذة التعليق ── */
let pendingModalOpen = false;
let pendingReason    = '';

/* ── أدوات ── */
function goPOS(){ location.href='pos.html'; }
function bySort(a,b){ return (a.sort_order||0)-(b.sort_order||0); }
function uniq(arr){ return [...new Set(arr.filter(Boolean))]; }
function selectedInvoice(){ return invoices.find(i => i.id === selectedId); }
function isOnlineInv(inv){
  if (!inv) return false;
  if (inv.source === 'online' || inv.online_order_id) return true;
  return ((window.DEMO_DATA && DEMO_DATA.online_orders) || []).some(o => o.invoice_id === inv.id);
}
function recalc(inv){ inv.total = (inv.items||[]).reduce((s,x)=>s+Number(x.total||0),0)+(Number(inv.service_table)||0)+(Number(inv.service_delivery)||0); }
function commitInv(inv){
  if (!inv) return;
  if (window.AlfaDB && AlfaDB.upsert) {
    AlfaDB.upsert('invoices', inv);
    invoices = DATA.invoices || invoices;
  } else {
    DATA.invoices = invoices.slice();
  }
  if (window.InvoiceSync) InvoiceSync.pushSoon(inv);
}
function nowTime(){ return new Date().toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'}); }

/* ── بحث ── */
function findInvoices(){
  const q = query.trim().toLowerCase();
  if(!q) return invoices;
  return invoices.filter(i =>
    `${invNoLabel(i)} ${i.customer_name||''} ${i.phone||''} ${i.hall||''} ${i.status||''}`
    .toLowerCase().includes(q));
}

/* ── القائمة ── */
function catItems(){ if(!activeCategoryId) return []; return DATA.items.filter(i => i.category_id===activeCategoryId && i.is_available!==false).sort(bySort); }
function families(){ return uniq(catItems().map(i=>i.family)); }
function finalItems(){ if(!activeCategoryId||!activeFamily) return []; return catItems().filter(i=>i.family===activeFamily).sort(bySort); }
function familyLabel(f){ return f==='شاورما' && activeCategoryId==='cat_shawarma' ? 'وجبات وسندويشات' : f; }
function itemTitle(item){
  const variant = item.variant_clean || String(item.variant||'').replace(/ - |-/g,' ').trim();
  if(item.option_name && item.option_name!==item.family) return `${item.option_name} ${variant}`.trim();
  return variant || item.name;
}

/* ================================================================
   حالة الفاتورة
   ================================================================ */
const STATUS_MAP = {
  open:      { label:'مفتوحة',  icon:'🟢', cls:'status-open'      },
  printed:   { label:'منتهية',  icon:'✅', cls:'status-printed'   },
  cancelled: { label:'ملغية',   icon:'🔴', cls:'status-cancelled' },
  pending:   { label:'معلقة',   icon:'⏸️', cls:'status-pending'   },
};
function statusLabel(status){
  return STATUS_MAP[status]?.label || status || 'غير محدد';
}
function statusInfo(status){
  return STATUS_MAP[status] || { label: status||'—', icon:'⚪', cls:'status-unknown' };
}
function statusBadge(status){
  const s = statusInfo(status);
  return `<span class="inv-status-badge ${s.cls}">${s.icon} ${s.label}</span>`;
}

/* ================================================================
   الرسم الرئيسي
   ================================================================ */
function render(){
  const results = findInvoices();
  if(!selectedId && results[0]) selectedId = results[0].id;
  const inv = selectedInvoice();

  document.getElementById('editInvoiceApp').innerHTML = `
    <div class="simple-shell edit-invoice-workspace">
      <header class="simple-topbar">
        <div>
          <div class="pos-brand">alfaprosys</div>
          <div class="pos-subtitle">تعديل فاتورة</div>
        </div>
        <button class="back-to-pos-btn" onclick="goPOS()">رجوع للبيع</button>
      </header>

      <main class="simple-content edit-layout enhanced-edit-layout">

        <!-- لوحة البحث: مضغوطة عند التحديد، كاملة بدونه -->
        <section class="simple-card edit-search-panel ${selectedId ? 'edit-search-collapsed' : ''}">

          ${selectedId ? `
            <!-- رأس مضغوط -->
            <div class="edit-search-mini">
              <span class="edit-search-mini-label">✏️ تعديل فاتورة</span>
              <button class="edit-change-btn" onclick="clearSelection()">تغيير ↓</button>
            </div>
            <!-- معلومة الفاتورة المختارة -->
            ${inv ? `<div class="edit-sel-pill">
              <strong>${e(invNoLabel(inv))}</strong>
              <span>${e(inv.customer_name||inv.hall||inv.type||'—')}</span>
              ${statusBadge(inv.status)}
            </div>` : ''}
          ` : `
            <!-- القائمة الكاملة -->
            <div class="simple-card-head">
              <h1>✏️ البحث عن فاتورة</h1>
              <p>ابحث برقم الفاتورة أو اسم العميل أو الحالة.</p>
            </div>
            <input class="invoice-search-input"
              value="${e(query)}"
              placeholder="رقم الفاتورة / الاسم / الحالة"
              oninput="query=this.value; selectedId=''; addMode=false; render()">

            <div class="inv-status-filter" id="statusFilter">
              ${['','open','pending','printed','cancelled'].map(s => `
                <button class="inv-sf-btn ${filterStatus===s?'active':''}"
                  onclick="setStatusFilter('${s}')">
                  ${s ? (STATUS_MAP[s]?.icon+' '+STATUS_MAP[s]?.label) : '🗂️ الكل'}
                </button>`).join('')}
            </div>

            <div class="invoice-results">
              ${filteredResults(results).map(r => `
                <button class="invoice-result"
                  onclick="selectInvoice('${e(r.id)}')">
                  <div class="inv-res-top">
                    <strong>${e(r.id)}</strong>
                    ${statusBadge(r.status)}
                  </div>
                  <span>${e(r.customer_name||r.hall||r.type||'—')} • ${e(r.time||'')}</span>
                  <b>${fmtNum(r.total)} ل.س</b>
                </button>`).join('') || '<div class="empty-customers">لا توجد نتائج</div>'}
            </div>
          `}
        </section>

        <!-- لوحة التعديل: تظهر فقط عند التحديد -->
        ${selectedId ? `
          <section class="simple-card edit-detail-panel">
            ${inv ? renderInvoiceEditor(inv) : `<div class="empty-customers">الفاتورة غير موجودة</div>`}
          </section>
        ` : ''}

      </main>

      ${renderQtyModal()}
      ${cancelModalOpen ? renderCancelModal() : ''}
      ${pendingModalOpen ? renderPendingModal() : ''}
    </div>`;
}

/* ── فلتر الحالة ── */
let filterStatus = '';
function setStatusFilter(s){ filterStatus = s; render(); }
function filteredResults(list){
  if(!filterStatus) return list;
  return list.filter(r => r.status === filterStatus);
}

/* ================================================================
   محرر الفاتورة
   ================================================================ */
function renderInvoiceEditor(inv){
  recalc(inv);
  const locked = inv.status === 'cancelled' || inv.status === 'printed' || isOnlineInv(inv);
  const isPending = inv.status === 'pending';
  const isOpen    = inv.status === 'open';
  const si = statusInfo(inv.status);

  return `
    <!-- رأس الفاتورة مع شريط الحالة -->
    <div class="inv-editor-head">
      <div class="inv-head-main">
        <div class="inv-head-id">🧾 فاتورة ${e(invNoLabel(inv))} ${isOnlineInv(inv) ? '<span class="inv-online-badge">🛵 أونلاين</span>' : ''}</div>
        <div class="inv-head-meta">
          ${e(inv.customer_name||inv.hall||inv.type||'—')} — ${e(inv.time||'')}
        </div>
      </div>
      ${statusBadge(inv.status)}
    </div>

    <!-- شريط الإجراءات حسب الحالة -->
    <div class="inv-action-bar">
      ${isOpen || isPending ? `
        <button class="inv-act-btn inv-act-add"
          onclick="toggleAddMode()" ${addMode?'style="opacity:.6"':''}>
          ${addMode ? '✖ إغلاق' : '➕ إضافة صنف'}
        </button>` : ''}

      ${isOpen || isPending ? `
        <button class="inv-act-btn inv-act-print"
          onclick="printEditNotice('${e(invNoLabel(inv))}')">
          🖨️ طباعة تعديل
        </button>` : ''}

      ${isOpen ? `
        <button class="inv-act-btn inv-act-pending"
          onclick="openPendingModal()">
          ⏸️ تعليق
        </button>` : ''}

      ${isPending ? `
        <button class="inv-act-btn inv-act-reopen"
          onclick="reopenInvoice()">
          🟢 إعادة فتح
        </button>` : ''}

      ${isOpen || isPending ? `
        <button class="inv-act-btn inv-act-cancel"
          onclick="openCancelModal()">
          🔴 إلغاء
        </button>` : ''}
    </div>

    <!-- ملاحظة حالة خاصة -->
    ${inv.status === 'pending' && inv.pending_reason ? `
      <div class="inv-status-note inv-note-pending">
        ⏸️ <strong>معلقة:</strong> ${e(inv.pending_reason)}
      </div>` : ''}
    ${inv.status === 'cancelled' && inv.cancel_reason ? `
      <div class="inv-status-note inv-note-cancelled">
        🔴 <strong>سبب الإلغاء:</strong> ${e(inv.cancel_reason)}
      </div>` : ''}
    ${isOnlineInv(inv) ? `
      <div class="inv-status-note inv-note-online">
        🛵 <strong>فاتورة من طلب أونلاين</strong> — قراءة فقط · التعديل ممنوع والحذف من شاشة الفواتير
      </div>` : ''}

    <!-- قائمة الأصناف -->
    <div class="open-items-list">
      ${(inv.items||[]).map((it,idx)=>`
        <div class="open-item-card ${locked?'locked':''}">
          <div class="open-item-main enhanced">
            <strong>${e(it.name)} <span>${fmtNum(it.qty)}</span></strong>
            <b>${fmtNum(it.total)}</b>
          </div>
          ${!locked ? `
            <div class="open-item-actions">
              <button class="edit-mini-btn" onclick="decreaseInvoiceItem(${idx})">− 1</button>
              <button class="edit-mini-btn" onclick="openReplaceItem(${idx})">استبدال</button>
              <button class="edit-mini-btn danger" onclick="removeInvoiceItem(${idx})">حذف</button>
            </div>` : ''}
          ${it.note ? `<div class="open-item-note">${e(it.note)}</div>` : ''}
        </div>`).join('') || `<div class="empty-customers">لا توجد أصناف</div>`}
    </div>

    ${((Number(inv.service_table) || 0) + (Number(inv.service_delivery) || 0) > 0) ? `<div class="inv-svc-lines">${(Number(inv.service_table) || 0) ? `<div class="inv-svc-row"><span>🍽️ خدمة طاولة</span><strong>${fmtNum(inv.service_table)} ل.س</strong></div>` : ''}${(Number(inv.service_delivery) || 0) ? `<div class="inv-svc-row"><span>🛵 خدمة توصيل</span><strong>${fmtNum(inv.service_delivery)} ل.س</strong></div>` : ''}</div>` : ''}
    <div class="bill-total-box">
      <span>إجمالي الفاتورة</span>
      <strong>${fmtNum(inv.total)} ل.س</strong>
    </div>

    ${addMode && !locked ? renderAddPanel() : ''}

    <!-- سجل التعديلات -->
    ${editLogs.filter(l=>l.invoice_id===inv.id).length ? `
      <div class="edit-log-box">
        <h3>📋 سجل التعديلات</h3>
        ${editLogs.filter(l=>l.invoice_id===inv.id).slice().reverse()
          .map(l=>`<div class="edit-log-row">
            <span class="log-text">${e(l.text)}</span>
            <span class="log-time">${e(l.time)}</span>
          </div>`).join('')}
      </div>` : ''}
  `;
}

/* ================================================================
   نافذة الإلغاء
   ================================================================ */
const CANCEL_REASONS = [
  'طلب العميل الإلغاء',
  'خطأ في الطلب',
  'انتهى المخزون',
  'تأخر في التحضير',
  'مشكلة في الدفع',
];

function openCancelModal()  { cancelModalOpen = true; cancelReason = ''; cancelReasonCustom = ''; render(); }
function closeCancelModal() { cancelModalOpen = false; render(); }

function renderCancelModal(){
  return `
    <div class="inv-modal-scrim" onclick="closeCancelModal()"></div>
    <div class="inv-modal" role="dialog">
      <div class="inv-modal-head">
        <strong>🔴 إلغاء الفاتورة</strong>
        <button onclick="closeCancelModal()">✕</button>
      </div>
      <div class="inv-modal-body">
        <p class="inv-modal-sub">اختر سبب الإلغاء أو أدخله يدوياً</p>
        <div class="cancel-reasons-grid">
          ${CANCEL_REASONS.map(r => `
            <button class="cancel-reason-btn ${cancelReason===r?'selected':''}"
              onclick="selectCancelReason('${e(r)}')">
              ${e(r)}
            </button>`).join('')}
        </div>
        <input type="text"
          class="cancel-custom-input"
          placeholder="أو اكتب سبباً آخر..."
          value="${e(cancelReasonCustom)}"
          oninput="cancelReasonCustom=this.value; cancelReason=this.value;">
      </div>
      <div class="inv-modal-foot">
        <button class="inv-modal-cancel-btn" onclick="closeCancelModal()">تراجع</button>
        <button class="inv-modal-confirm-btn danger"
          onclick="confirmCancel()"
          ${(!cancelReason&&!cancelReasonCustom)?'disabled':''}>
          تأكيد الإلغاء
        </button>
      </div>
    </div>`;
}

function selectCancelReason(r){
  cancelReason = r;
  cancelReasonCustom = '';
  render();
  /* أبقِ الحقل فارغاً لأن السبب مختار */
  document.querySelector('.cancel-custom-input')?.focus?.();
}

function confirmCancel(){
  const inv = selectedInvoice(); if(!inv) return;
  const reason = cancelReasonCustom.trim() || cancelReason;
  if(!reason) return;
  inv.status = 'cancelled';
  inv.cancel_reason = reason;
  if (inv.stock_applied && window.Stock) { Stock.restore(inv.items); inv.stock_applied = false; }
  commitInv(inv);
  editLogs.push({ invoice_id:inv.id, text:`🔴 إلغاء: ${reason}`, time:nowTime() });
  cancelModalOpen = false;
  render();
}

/* ================================================================
   نافذة التعليق
   ================================================================ */
const PENDING_REASONS = [
  'العميل يفكر في الطلب',
  'انتظار موافقة',
  'العميل خرج مؤقتاً',
  'طلب تأجيل التحضير',
];

function openPendingModal()  { pendingModalOpen = true; pendingReason = ''; render(); }
function closePendingModal() { pendingModalOpen = false; render(); }

function renderPendingModal(){
  return `
    <div class="inv-modal-scrim" onclick="closePendingModal()"></div>
    <div class="inv-modal" role="dialog">
      <div class="inv-modal-head">
        <strong>⏸️ تعليق الفاتورة</strong>
        <button onclick="closePendingModal()">✕</button>
      </div>
      <div class="inv-modal-body">
        <p class="inv-modal-sub">ما سبب التعليق؟ (اختياري)</p>
        <div class="cancel-reasons-grid">
          ${PENDING_REASONS.map(r => `
            <button class="cancel-reason-btn ${pendingReason===r?'selected':''}"
              onclick="pendingReason='${e(r)}'; renderPendingBody()">
              ${e(r)}
            </button>`).join('')}
        </div>
        <input type="text"
          class="cancel-custom-input"
          placeholder="أو اكتب سبباً..."
          value="${e(pendingReason)}"
          oninput="pendingReason=this.value;">
      </div>
      <div class="inv-modal-foot">
        <button class="inv-modal-cancel-btn" onclick="closePendingModal()">تراجع</button>
        <button class="inv-modal-confirm-btn pending"
          onclick="confirmPending()">
          ⏸️ تعليق الفاتورة
        </button>
      </div>
    </div>`;
}

function renderPendingBody(){
  /* تحديث الأزرار بدون إعادة رسم كاملة */
  document.querySelectorAll('.cancel-reason-btn').forEach(btn => {
    btn.classList.toggle('selected', btn.textContent.trim() === pendingReason);
  });
}

function confirmPending(){
  const inv = selectedInvoice(); if(!inv) return;
  inv.status = 'pending';
  inv.pending_reason = pendingReason || 'تعليق بدون سبب';
  commitInv(inv);
  editLogs.push({ invoice_id:inv.id, text:`⏸️ تعليق: ${inv.pending_reason}`, time:nowTime() });
  pendingModalOpen = false;
  render();
}

function reopenInvoice(){
  const inv = selectedInvoice(); if(!inv) return;
  inv.status = 'open';
  inv.pending_reason = '';
  commitInv(inv);
  editLogs.push({ invoice_id:inv.id, text:'🟢 إعادة فتح الفاتورة', time:nowTime() });
  render();
}

/* ================================================================
   لوحة إضافة الأصناف
   ================================================================ */
function renderAddPanel(){
  const cats  = sellableCategories();
  const fams  = activeCategoryId ? families() : [];
  const items = finalItems();

  if(!activeCategoryId){
    return `<div class="open-add-panel">
      <div class="open-add-title">➕ اختر التصنيف</div>
      <div class="open-add-grid cats">
        ${cats.map(c=>`<button onclick="selectCategory('${e(c.id)}')"><span>${c.icon}</span>${e(c.name)}</button>`).join('')}
      </div>
    </div>`;
  }
  if(!activeFamily){
    return `<div class="open-add-panel">
      <div class="open-add-nav"><button onclick="resetAddPicker()">‹ التصنيفات</button></div>
      <div class="open-add-grid fams">
        ${fams.map(f=>`<button onclick="selectFamily('${e(f)}')">${e(familyLabel(f))}</button>`).join('')}
      </div>
    </div>`;
  }
  return `<div class="open-add-panel">
    <div class="open-add-nav"><button onclick="activeFamily=null; render()">‹ رجوع</button></div>
    <div class="open-add-grid items">
      ${items.map(i=>`<button onclick="openQty('${e(i.id)}')">
        <strong>${e(itemTitle(i))}</strong>
        <span>${fmtNum(i.price)} ل.س</span>
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
    <div class="qty-modal-scrim" onclick="closeQty()"></div>
    <div class="qty-modal">
      <div class="qty-modal-head">
        <div><strong>${e(itemTitle(item))}</strong><span>${fmtNum(item.price)} ل.س</span></div>
        <button onclick="closeQty()">✕</button>
      </div>
      <div class="qty-number-grid">
        ${Array.from({length:20},(_,i)=>i+1).map(n=>`<button onclick="addItemToInvoice(${n})">${n}</button>`).join('')}
      </div>
      <div class="qty-custom-row">
        <input id="customQtyInput" type="number" inputmode="numeric" placeholder="كمية أخرى">
        <button onclick="addCustomQty()">إضافة</button>
      </div>
    </div>`;
}

/* ================================================================
   منطق التعديلات (كما كان)
   ================================================================ */
function selectInvoice(id){ selectedId=id; addMode=false; activeCategoryId=null; activeFamily=null; render(); }
function clearSelection(){ selectedId=''; addMode=false; activeCategoryId=null; activeFamily=null; render(); }
function toggleAddMode(){ addMode=!addMode; activeCategoryId=null; activeFamily=null; render(); }
function selectCategory(id){ activeCategoryId=id; activeFamily=null; const fs=families(); if(fs.length===1) activeFamily=fs[0]; render(); }
function selectFamily(f){ activeFamily=f; render(); }
function resetAddPicker(){ activeCategoryId=null; activeFamily=null; render(); }
function openQty(id){ pendingItemId=id; render(); }
function closeQty(){ pendingItemId=null; render(); }
function addCustomQty(){ const q=Number(document.getElementById('customQtyInput')?.value||0); if(q>0) addItemToInvoice(q); }

function addItemToInvoice(qty){
  const inv  = selectedInvoice();
  const item = DATA.items.find(i=>i.id===pendingItemId);
  if(!inv||!item) return;
  const title = itemTitle(item);
  const line = { id:item.id, name: item.option_name&&item.option_name!==item.family ? title : `${item.family} ${title}`.trim(), qty, price:item.price, total:item.price*qty, note:'', added_now:true };
  inv.items.push(line);
  recalc(inv);
  if (inv.stock_applied && window.Stock) Stock.deduct([line]);
  commitInv(inv);
  editLogs.push({ invoice_id:inv.id, text:`➕ إضافة ${qty}× ${title}`, time:nowTime() });
  pendingItemId=null;
  render();
}

function decreaseInvoiceItem(idx){
  const inv=selectedInvoice(); if(!inv) return;
  const item=inv.items[idx]; if(!item) return;
  const oldQty=Number(item.qty||0);
  if(oldQty<=1) return removeInvoiceItem(idx);
  const unit=Number(item.total||0)/oldQty;
  item.qty=oldQty-1;
  item.total=Math.round(unit*item.qty);
  recalc(inv);
  if (inv.stock_applied && window.Stock) Stock.delta(item, -1);
  commitInv(inv);
  editLogs.push({ invoice_id:inv.id, text:`➖ إنقاص 1 من ${item.name}`, time:nowTime() });
  render();
}

function removeInvoiceItem(idx){
  const inv=selectedInvoice(); if(!inv) return;
  const item=inv.items[idx];
  if(!confirm(`حذف كامل الصنف من الفاتورة؟\n${item?.name||''}`)) return;
  if (inv.stock_applied && window.Stock) Stock.restore([item]);
  inv.items.splice(idx,1); recalc(inv);
  commitInv(inv);
  editLogs.push({ invoice_id:inv.id, text:`🗑️ حذف ${item?.name||'صنف'}`, time:nowTime() });
  render();
}

function openReplaceItem(idx){
  const inv=selectedInvoice(); if(!inv) return;
  const item=inv.items[idx]; if(!item) return;
  if(!confirm(`استبدال الصنف؟\nسيتم حذف: ${item.name}\nثم اختر البديل من قائمة الإضافة.`)) return;
  if (inv.stock_applied && window.Stock) Stock.restore([item]);
  inv.items.splice(idx,1); recalc(inv);
  editLogs.push({ invoice_id:inv.id, text:`↔️ استبدال ${item.name}`, time:nowTime() });
  addMode=true; activeCategoryId=null; activeFamily=null; render();
}

function printEditNotice(id){
  alert(`طباعة إشعار تعديل للفاتورة: ${id}\nيطبع الفرق فقط (إضافات/إلغاءات).`);
}

(window.alfaStart||function(fn){fn();})(function () {
  invoices = DATA.invoices || [];
  render();
  if (window.AlfaLive) AlfaLive.start(10000, function () {
    invoices = DATA.invoices || invoices;
    render();
  });
});

