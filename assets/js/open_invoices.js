/* ================================================================
   open_invoices.js — الفواتير المفتوحة والمعلقة — alfaprosys
   ================================================================ */

const DATA    = window.DEMO_DATA;
let invoices  = DATA.invoices || [];

/* أول فاتورة مفتوحة أو معلقة */
let selectedInvoiceId = (invoices.find(i => i.status === 'open' || i.status === 'pending') || {}).id || '';
let addMode           = false;
let activeCategoryId  = null;
let activeFamily      = null;
let pendingItemId     = null;
let editLogs          = [];

/* ── أدوات ── */
function goPOS(){ location.href='pos.html'; }
function bySort(a,b){ return (a.sort_order||0)-(b.sort_order||0); }
function uniq(arr){ return [...new Set(arr.filter(Boolean))]; }
function selectedInvoice(){ return invoices.find(i => i.id === selectedInvoiceId); }
function nowTime(){ return new Date().toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'}); }

/* ── الفواتير المفتوحة والمعلقة ── */
function activeInvoices(){
  return invoices.filter(i => i.status === 'open' || i.status === 'pending');
}

/* ── القائمة ── */
function catItems(){ if(!activeCategoryId) return []; return DATA.items.filter(i => i.category_id===activeCategoryId && i.is_available!==false).sort(bySort); }
function families(){ return uniq(catItems().map(i=>i.family)); }
function finalItems(){ if(!activeCategoryId||!activeFamily) return []; return catItems().filter(i=>i.family===activeFamily).sort(bySort); }
function itemTitle(item){
  const variant = item.variant_clean || String(item.variant||'').replace(/ - |-/g,' ').trim();
  if(item.option_name && item.option_name!==item.family) return `${item.option_name} ${variant}`.trim();
  return variant || item.name;
}
function recalc(inv){ inv.total=(inv.items||[]).reduce((s,x)=>s+Number(x.total||0),0)+(Number(inv.service_table)||0)+(Number(inv.service_delivery)||0); }

/* ── شارة الحالة ── */
function statusBadge(status){
  if(status === 'open')    return `<span class="oi-badge oi-badge-open">🟢 مفتوحة</span>`;
  if(status === 'pending') return `<span class="oi-badge oi-badge-pending">⏸️ معلقة</span>`;
  return '';
}

/* ================================================================
   الرسم الرئيسي
   ================================================================ */
function render(){
  const list = activeInvoices();
  const inv  = selectedInvoice();

  document.getElementById('openInvoicesApp').innerHTML = `
    <div class="simple-shell open-workspace">
      <header class="simple-topbar">
        <div>
          <div class="pos-brand">alfaprosys</div>
          <div class="pos-subtitle">الفواتير المفتوحة والمعلقة</div>
        </div>
        <button class="back-to-pos-btn" onclick="goPOS()">رجوع للبيع</button>
      </header>

      <main class="open-invoices-workarea">

        <!-- قائمة الفواتير -->
        <section class="simple-card open-list-panel ${selectedInvoiceId ? 'oi-collapsed' : ''}">

          ${selectedInvoiceId ? `
            <!-- رأس مضغوط عند تحديد فاتورة -->
            <div class="oi-list-mini-head">
              <div class="oi-list-mini-count">
                📂 ${list.length} فاتورة نشطة
              </div>
              <button class="oi-change-btn" onclick="clearSelection()">
                تغيير الفاتورة ↓
              </button>
            </div>
            <!-- الفاتورة المختارة فقط كزر -->
            ${inv ? `
              <div class="oi-selected-pill">
                <div class="oi-sel-info">
                  <strong>${e(invNoLabel(inv))}</strong>
                  <span>${e(inv.hall || inv.customer_name || inv.type || '—')}</span>
                </div>
                ${statusBadge(inv.status)}
                <span class="oi-sel-total">${fmtNum(inv.total)} ل.س</span>
              </div>` : ''}
          ` : `
            <!-- قائمة كاملة عند لا يوجد تحديد -->
            <div class="simple-card-head">
              <h1>📂 الفواتير المفتوحة والمعلقة</h1>
              <p>${list.length} فاتورة نشطة — اختر فاتورة للتعديل</p>
            </div>

            ${renderInvoiceGroups(list)}
          `}
        </section>

        <!-- لوحة التفاصيل — تظهر فقط عند التحديد -->
        ${selectedInvoiceId && inv ? `
          <section class="simple-card open-detail-panel">
            ${renderInvoiceDetail(inv)}
          </section>
        ` : ''}

      </main>

      ${renderQtyModal()}
    </div>`;
}

/* ── تجميع الفواتير بالحالة ── */
function renderInvoiceGroups(list){
  const open    = list.filter(i => i.status === 'open');
  const pending = list.filter(i => i.status === 'pending');

  if(!list.length) return `<div class="empty-customers">لا توجد فواتير مفتوحة أو معلقة</div>`;

  let html = '';

  if(open.length){
    html += `<div class="oi-group-label">🟢 مفتوحة (${open.length})</div>`;
    html += `<div class="open-invoice-list">
      ${open.map(x => renderInvoiceRow(x)).join('')}
    </div>`;
  }

  if(pending.length){
    html += `<div class="oi-group-label">⏸️ معلقة (${pending.length})</div>`;
    html += `<div class="open-invoice-list">
      ${pending.map(x => renderInvoiceRow(x)).join('')}
    </div>`;
  }

  return html;
}

function renderInvoiceRow(x){
  return `
    <button class="open-list-row oi-list-row" onclick="selectInvoice('${e(x.id)}')">
      <div class="oi-row-main">
        <strong>${e(x.id)}</strong>
        <span>${e(x.hall || x.customer_name || x.type || '—')} · ${e(x.time||'')}</span>
      </div>
      ${statusBadge(x.status)}
      <b>${fmtNum(x.total)} ل.س</b>
    </button>`;
}

/* ================================================================
   تفاصيل الفاتورة
   ================================================================ */
function renderInvoiceDetail(inv){
  recalc(inv);
  const isPending = inv.status === 'pending';

  return `
    <div class="open-detail-head">
      <div>
        <h1>🧾 فاتورة ${e(invNoLabel(inv))}</h1>
        <p>${e(inv.hall || inv.customer_name || inv.type || '—')} — ${e(inv.time||'')}</p>
        ${isPending && inv.pending_reason ? `<div class="oi-pending-note">⏸️ ${e(inv.pending_reason)}</div>` : ''}
      </div>
      <div class="open-detail-actions">
        <button class="add-to-open-btn" onclick="toggleAddMode()">
          ${addMode ? '✖ إغلاق' : '➕ إضافة'}
        </button>
        <button class="kitchen-plus-btn" onclick="printAddition('${e(invNoLabel(inv))}')">🖨️ طباعة</button>
        ${isPending
          ? `<button class="inv-act-btn inv-act-reopen" onclick="reopenInvoice()">🟢 فتح</button>`
          : `<button class="inv-act-btn inv-act-pending" onclick="pendingInvoice()">⏸️ تعليق</button>`}
        <button class="cancel-invoice-btn" onclick="cancelInvoice()">🔴 إلغاء</button>
      </div>
    </div>

    <div class="open-items-list">
      ${(inv.items||[]).map((it,idx)=>`
        <div class="open-item-card">
          <div class="open-item-main enhanced">
            <strong>${e(it.name)} <span>${fmtNum(it.qty)}</span></strong>
            <b>${fmtNum(it.total)}</b>
          </div>
          <div class="open-item-actions">
            <button class="edit-mini-btn" onclick="decreaseInvoiceItem(${idx})">− 1</button>
            <button class="edit-mini-btn" onclick="openReplaceItem(${idx})">استبدال</button>
            <button class="edit-mini-btn danger" onclick="removeInvoiceItem(${idx})">حذف</button>
          </div>
          ${it.note ? `<div class="open-item-note">${e(it.note)}</div>` : ''}
        </div>`).join('') || `<div class="empty-customers">لا توجد أصناف</div>`}
    </div>

    ${((Number(inv.service_table) || 0) + (Number(inv.service_delivery) || 0) > 0) ? `<div class="inv-svc-lines">${(Number(inv.service_table) || 0) ? `<div class="inv-svc-row"><span>🍽️ خدمة طاولة</span><strong>${fmtNum(inv.service_table)} ل.س</strong></div>` : ''}${(Number(inv.service_delivery) || 0) ? `<div class="inv-svc-row"><span>🛵 خدمة توصيل</span><strong>${fmtNum(inv.service_delivery)} ل.س</strong></div>` : ''}</div>` : ''}
    <div class="bill-total-box">
      <span>إجمالي الفاتورة</span>
      <strong>${fmtNum(inv.total)} ل.س</strong>
    </div>

    ${addMode ? renderAddPanel() : ''}

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
   لوحة إضافة الأصناف
   ================================================================ */
function renderAddPanel(){
  const cats = sellableCategories();
  const fams = activeCategoryId ? families() : [];
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
        ${fams.map(f=>`<button onclick="selectFamily('${e(f)}')">${e(f==='شاورما'&&activeCategoryId==='cat_shawarma'?'وجبات وسندويشات':f)}</button>`).join('')}
      </div>
    </div>`;
  }
  return `<div class="open-add-panel">
    <div class="open-add-nav"><button onclick="activeFamily=null; render()">‹ رجوع</button></div>
    <div class="open-add-grid items">
      ${items.map(i=>`<button onclick="openQty('${e(i.id)}')"><strong>${e(itemTitle(i))}</strong><span>${fmtNum(i.price)}</span></button>`).join('')}
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
   منطق التحديد والتعديل
   ================================================================ */
function selectInvoice(id){
  selectedInvoiceId = id;
  addMode = false; activeCategoryId = null; activeFamily = null;
  render();
}
function clearSelection(){
  selectedInvoiceId = '';
  addMode = false; activeCategoryId = null; activeFamily = null;
  render();
}
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
  editLogs.push({ invoice_id:inv.id, text:`➕ إضافة ${qty}× ${title}`, time:nowTime() });
  if (window.InvoiceSync) InvoiceSync.pushSoon(inv);
  pendingItemId = null;
  render();
}

function decreaseInvoiceItem(idx){
  const inv=selectedInvoice(); if(!inv) return;
  const item=inv.items[idx]; if(!item) return;
  const oldQty=Number(item.qty||0);
  if(oldQty<=1) return removeInvoiceItem(idx);
  const unit=Number(item.total||0)/oldQty;
  item.qty=oldQty-1; item.total=Math.round(unit*item.qty);
  recalc(inv);
  if (inv.stock_applied && window.Stock) Stock.delta(item, -1);
  editLogs.push({ invoice_id:inv.id, text:`➖ إنقاص 1 من ${item.name}`, time:nowTime() });
  if (window.InvoiceSync) InvoiceSync.pushSoon(inv);
  render();
}

function removeInvoiceItem(idx){
  const inv=selectedInvoice(); if(!inv) return;
  const item=inv.items[idx];
  if(!confirm(`حذف الصنف من الفاتورة؟\n${item?.name||''}`)) return;
  if (inv.stock_applied && window.Stock) Stock.restore([item]);
  inv.items.splice(idx,1); recalc(inv);
  editLogs.push({ invoice_id:inv.id, text:`🗑️ حذف ${item?.name||'صنف'}`, time:nowTime() });
  if (window.InvoiceSync) InvoiceSync.pushSoon(inv);
  render();
}

function openReplaceItem(idx){
  const inv=selectedInvoice(); if(!inv) return;
  const item=inv.items[idx]; if(!item) return;
  if(!confirm(`استبدال الصنف؟\nسيتم حذف: ${item.name}\nثم اختر البديل.`)) return;
  if (inv.stock_applied && window.Stock) Stock.restore([item]);
  inv.items.splice(idx,1); recalc(inv);
  editLogs.push({ invoice_id:inv.id, text:`↔️ استبدال ${item.name}`, time:nowTime() });
  addMode=true; activeCategoryId=null; activeFamily=null; render();
}

function pendingInvoice(){
  const inv=selectedInvoice(); if(!inv) return;
  const reason = prompt('سبب التعليق؟ (اختياري)', 'العميل يفكر في الطلب');
  if(reason===null) return;
  inv.status='pending'; inv.pending_reason=reason||'تعليق';
  if (window.InvoiceSync) InvoiceSync.pushSoon(inv);
  editLogs.push({ invoice_id:inv.id, text:`⏸️ تعليق: ${inv.pending_reason}`, time:nowTime() });
  render();
}

function reopenInvoice(){
  const inv=selectedInvoice(); if(!inv) return;
  inv.status='open'; inv.pending_reason='';
  if (window.InvoiceSync) InvoiceSync.pushSoon(inv);
  editLogs.push({ invoice_id:inv.id, text:'🟢 إعادة فتح', time:nowTime() });
  render();
}

function cancelInvoice(){
  const inv=selectedInvoice(); if(!inv) return;
  const reason=prompt('سبب إلغاء الفاتورة؟','طلب العميل الإلغاء');
  if(reason===null) return;
  inv.status='cancelled'; inv.cancel_reason=reason;
  if (window.InvoiceSync) InvoiceSync.pushSoon(inv);
  if (inv.stock_applied && window.Stock) { Stock.restore(inv.items); inv.stock_applied = false; }
  editLogs.push({ invoice_id:inv.id, text:`🔴 إلغاء: ${reason}`, time:nowTime() });
  const next=activeInvoices()[0];
  selectedInvoiceId=next?next.id:'';
  addMode=false; render();
}

function printAddition(label){
  if (window.ThermalPrint) {
    const inv = (DATA.invoices || []).find(i => window.invNoLabel && invNoLabel(i) === label);
    if (inv) { try { ThermalPrint.print(inv, { kitchen: true }); return; } catch (e) {} }
  }
  alert('طباعة إشعار المطبخ تتطلب فتح شاشة الفواتير المفتوحة.');
}

(window.alfaStart||function(fn){fn();})(function () {
  invoices = DATA.invoices || [];
  selectedInvoiceId = (invoices.find(i => i.status === 'open' || i.status === 'pending') || {}).id || selectedInvoiceId;
  render();
  if (window.AlfaLive) AlfaLive.start(10000, function () {
    invoices = DATA.invoices || invoices;
    render();
  });
});

