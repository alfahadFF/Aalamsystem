const DATA = window.DEMO_DATA;

let activeCategoryId = null;
let activeFamily = null;
const POS_MODES = [
  { id: 'buttons',  label: 'أزرر' },
  { id: 'direct',   label: 'مباشر' },
  { id: 'dropdown', label: 'منسدل' },
];
let displayMode = 'direct';
try {
  const savedMode = localStorage.getItem('alfaprosys_pos_mode');
  if (savedMode === 'buttons' || savedMode === 'direct' || savedMode === 'dropdown') displayMode = savedMode;
} catch (e) {}
let searchOpen = false;
let searchTerm = '';
let orderType = 'dinein';
function onlinePendingCount(){ return (DATA.online_orders||[]).filter(o=>o.status==='new').length; }
let selectedTable = DATA.tables[0] || 'طاولة 1';
let selectedHall = 'صالة داخلية';
let deliveryInfo = { name: '', phone: '', address: '' };
let calcOpen = false;
let calcPaid = '';
let directAuxModal = null;
let posEmbed = null;
let pendingItemId = null;

/* ── العقود ── */
let selectedContractId = null;

/* 📌 سقف الذمة: معلومات ائتمان عميل العقد */
function contractCreditInfo(conId){
  const c = (window.DEMO_DATA.contracts||[]).find(x => x.id === conId);
  if (!c) return null;
  const cust = ((window.DEMO_DATA.customers)||[]).find(u => u.id === c.customer_id);
  const unpaid = (c.installments||[]).filter(i=>!i.paid).reduce((s,i)=>s+(i.amount||0),0);
  const limit = (cust && cust.credit_limit) || 0;
  const balance = cust && cust.credit_balance != null ? cust.credit_balance : unpaid;
  const nextDue = (cust && cust.next_due_date)
    || ((c.installments||[]).find(i=>!i.paid)||{}).due_date || '';
  return { con: c, cust, limit, balance, avail: limit - balance, nextDue, unpaid };
}
function creditState(info, orderTotal){
  if (!info || !info.limit) return null;
  const after = info.balance + orderTotal;
  return { after, over: after > info.limit, near: after >= info.limit * 0.8 && after <= info.limit };
}
let contractSearchTerm = '';

/* ── طريقة الدفع ── */
let payMethod     = 'cash';          // cash | wallet | partial | deferred
let walletRef     = '';              // رقم عملية المحفظة
let partialAmount = '';              // المبلغ المدفوع جزئياً
let deferredMode  = 'manual';        // manual | contract  (عند اختيار آجل)
let deferredName  = '';
let deferredPhone = '';
let deferredAddr  = '';

/* ── الإدخال الصوتي ── */
let voiceActive   = false;
let voiceRecog    = null;
let pendingNoteItemId = null;
const NOTE_SUGGESTIONS = ['ملح خفيف','بدون ملح','حار زيادة','بدون حار','ثوم زيادة','بدون ثوم','بدون خس','خس زيادة','بدون مخلل','مخلل زيادة','بدون فطر','بطاطا زيادة','صوص زيادة','مايونيز زيادة','بدون مايونيز'];
let cart = [];
/* الخصم تلقائي بالكامل من إعدادات المدير — لا تدخل للكاشير */

/* ── بطاقات القسم الأيمن: الأكثر طلباً / العروض / الخصومات ── */
let cardsVisible = true;
let cardsModalTab = null; // null = مغلقة | 'top' = الأكثر طلباً | 'offers' = العروض (نمط مباشر فقط)
try { cardsVisible = localStorage.getItem('alfaprosys_cards') !== 'hidden'; } catch (e) {}
function todayStr() { const d = new Date(); const p = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); }
function menuIsLive() {
  const id = String((DATA.items && DATA.items[0] && DATA.items[0].id) || '');
  return /^[0-9a-f]{8}-/i.test(id);
}
function activeOffers() {
  const live = menuIsLive();
  return (DATA.offers || []).filter(o => {
    if (live && /^ofr_/.test(String(o.id || ''))) return false;
    return o.active !== false && (!o.expires_at || o.expires_at >= todayStr());
  });
}
function topSoldItems(n = 3) {
  const score = {};
  (DATA.items || []).forEach(i => { score[i.id] = { item: i, n: (i.order_count || 0) + (i.is_pinned_popular ? 50 : 0) }; });
  (DATA.invoices || []).forEach(inv => (inv.items || []).forEach(it => {
    if (score[it.id]) score[it.id].n += (it.qty || 0) * 10;   // كل بيع فعلي أثقل من العدّاد
  }));
  return Object.values(score).sort((a, b) => b.n - a.n).slice(0, n).map(x => x.item).filter(i => i.is_available !== false);
}
function itemNet(itemOrCartRow) {
  const gross = Number(itemOrCartRow.price) || 0;
  const id = itemOrCartRow.id;
  const r = itemDiscRule(id);
  return r ? Math.round(gross * (1 - r.pct / 100)) : gross;
}
let heldOrders = [];
let heldSeq = 1;

/* ── النمط المباشر (تنسيق مطوّر بأسلوب برامج المحاسبة) ── */
let directSelectedId = null;   // الصف المحدد في جدول الفاتورة
let padMode = 'qty';           // qty | note
let padBuf = '';

/* ── عرض العملة: الزر يبدّل العرض فقط (÷100) — البيانات تبقى بالعملة القديمة ── */
let currencyNew = false;
try { currencyNew = localStorage.getItem('alfaprosys_currency') === 'new'; } catch (e) {}
function fmtCur(n) { return fmtNum(currencyNew ? (Number(n || 0) / 100) : n); }
function toggleCurrency() {
  currencyNew = !currencyNew;
  try { localStorage.setItem('alfaprosys_currency', currencyNew ? 'new' : 'old'); } catch (e) {}
  closeCashierNav();
  showToast(currencyNew ? 'العرض بالعملة الجديدة (بدون صفرين)' : 'العرض بالعملة القديمة', '💱');
  renderPOS();
}
/* ── مسودة الفاتورة: حفظ تلقائي + استعادة بعد أي انقطاع + حارس الخروج ── */
const DRAFT_KEY = 'alfaprosys_pos_draft';
let leaveModalOpen = false;
let leaveTargetUrl = null;
function saveDraft() {
  try {
    if (!cart.length && !heldOrders.length) { localStorage.removeItem(DRAFT_KEY); return; }
    localStorage.setItem(DRAFT_KEY, JSON.stringify({
      cart, heldOrders, orderType, selectedHall, selectedTable, deliveryInfo, payMethod, savedAt: Date.now(),
    }));
  } catch (e) {}
}
function restoreDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return false;
    const d = JSON.parse(raw);
    if (!d || (!(d.cart || []).length && !(d.heldOrders || []).length)) { localStorage.removeItem(DRAFT_KEY); return false; }
    cart = d.cart || [];
    heldOrders = d.heldOrders || [];
    if (d.orderType) orderType = d.orderType;
    if (d.selectedHall) selectedHall = d.selectedHall;
    if (d.selectedTable) selectedTable = d.selectedTable;
    if (d.deliveryInfo) deliveryInfo = d.deliveryInfo;
    if (d.payMethod) payMethod = d.payMethod;
    return true;
  } catch (e) { return false; }
}
function posDirty() { return !!(cart.length || heldOrders.length); }
function openPosScreen(url, title) {
  if (displayMode === 'direct') {
    posEmbed = { url, title: title || url };
    return renderPOS();
  }
  return guardLeave(url);
}
function closePosEmbed() { posEmbed = null; renderPOS(); }
function renderPosEmbed() {
  if (!posEmbed) return '';
  return `
    <div class="d-embed-scrim" data-action="close-pos-embed"></div>
    <div class="d-embed-modal" role="dialog" aria-label="${escapeHtml(posEmbed.title)}">
      <div class="d-embed-head"><strong>${escapeHtml(posEmbed.title)}</strong><button type="button" data-action="close-pos-embed">✕</button></div>
      <iframe class="d-embed-frame" src="${escapeHtml(posEmbed.url)}" title="${escapeHtml(posEmbed.title)}"></iframe>
    </div>`;
}
function guardLeave(url) {
  if (!posDirty()) { window.location.href = url; return; }
  leaveTargetUrl = url;
  leaveModalOpen = true;
  renderPOS();
}
function closeLeaveModal() { leaveModalOpen = false; leaveTargetUrl = null; renderPOS(); }
function confirmLeave() {
  const u = leaveTargetUrl;
  leaveModalOpen = false;
  leaveTargetUrl = null;
  if (u) window.location.href = u;
}
function renderLeaveModal() {
  if (!leaveModalOpen) return '';
  const total = cart.reduce((s, x) => s + x.price * x.qty, 0) - discountParts().total;
  const held = heldOrders.length;
  return `
    <div class="leave-scrim show" data-action="close-leave"></div>
    <div class="leave-modal open" role="alertdialog" aria-label="تحذير خروج">
      <div class="leave-icon">⚠️</div>
      <div class="leave-title">توجد فاتورة غير مكتملة</div>
      <div class="leave-info">
        ${cart.length ? `${fmtNum(cart.reduce((s, x) => s + x.qty, 0))} صنف · الإجمالي ${fmtCur(Math.max(0, total))} ل.س` : ''}
        ${cart.length && held ? '<br>' : ''}
        ${held ? `📌 و${fmtNum(held)} طلب معلّق لم يُحفظ` : ''}
      </div>
      <div class="leave-note">المسودة محفوظة تلقائياً وستُستعاد عند العودة — لكن الخروج الآن يوقف الطلب الجاري</div>
      <div class="leave-actions">
        <button class="leave-stay" type="button" data-action="close-leave">البقاء ومتابعة الطلب</button>
        <button class="leave-go" type="button" data-action="confirm-leave">متابعة الخروج</button>
      </div>
    </div>`;
}
/* حارس الروابط داخل الشاشة (خريطة الطاولات، الأونلاين...) */
document.addEventListener('click', function (e) {
  const a = e.target.closest && e.target.closest('a[href]');
  if (!a || !posDirty()) return;
  const href = a.getAttribute('href') || '';
  if (!/\.html(\?|$)/.test(href) || href.startsWith('http')) return;
  e.preventDefault();
  leaveTargetUrl = href;
  leaveModalOpen = true;
  renderPOS();
});
/* حوار المتصفح الأصلي عند التحديث أو الإغلاق */
window.addEventListener('beforeunload', function (e) {
  saveDraft();
  if (posDirty()) { e.preventDefault(); e.returnValue = ''; }
});
window.addEventListener('pagehide', saveDraft);

/* ── الخصم التلقائي من إعدادات المدير ──
   - خصم صنف: يُطبق تلقائياً متى وُجد الصنف في الفاتورة (ونسبته تظهر بجانبه)
   - خصم الفاتورة: نسبة واحدة من الإدارة تُطبق تلقائياً على كل فاتورة */
function discSettings(){
  const d = DATA.discount_settings = DATA.discount_settings || {};
  if (d.invoice_pct == null) d.invoice_pct = (d.invoice && d.invoice.percents && d.invoice.percents.length) ? 0 : 0;
  d.items = d.items || [];
  if (menuIsLive()) d.items = d.items.filter(r => !/^item_/.test(String(r.item_id || '')));
  return d;
}
function invDiscPct(){ return Number(discSettings().invoice_pct) || 0; }
function itemDiscRule(id){ return (discSettings().items||[]).find(r => r.item_id === id) || null; }
function discountParts(){
  const sub = cart.reduce((s, x) => s + x.price * x.qty, 0);   // يشمل سطر خصم العرض (سالب)
  let offerNet = 0, itemPart = 0;
  cart.forEach(c => {
    if (c.offer_id) { offerNet += c.price * c.qty; return; }   // العروض بسعر نهائي — لا خصومات فوقها
    const r = itemDiscRule(c.id);
    if (r) itemPart += Math.round(c.price * c.qty * r.pct / 100);
  });
  const base = Math.max(0, sub - offerNet - itemPart);          // نسبة الفاتورة على غير العروض فقط
  const invPart = Math.round(base * invDiscPct() / 100);
  return { sub, offerNet, itemPart, invPart, total: itemPart + invPart };
}
function cartDiscountLines(){ return cart.filter(c => !c.locked && itemDiscRule(c.id)); }
function uniq(arr) { return [...new Set(arr.filter(Boolean))]; }
function bySort(a,b){ return (a.sort_order || 0) - (b.sort_order || 0); }
function backToLogin() { sessionStorage.removeItem('alfaprosys_role'); guardLeave('index.html'); }

/* ── الباركود: الماسح يتصرف كلوحة مفاتيح (أرقام ثم Enter) ── */
let barcodeBuf = '';
let barcodeTimer = null;
function lookupBarcode(code) {
  const code_ = String(code || '').trim();
  if (!code_) return;
  const item = DATA.items.find(i => i.barcode === code_ && i.is_available !== false);
  if (item) { addToCart(item.id, 1); showToast(`أُضيف: ${item.name}`, '📷'); }
  else showToast('باركود غير معروف: ' + code_, '⚠️');
}
document.addEventListener('keydown', function (e) {
  // حقل الباركود: Enter = بحث وإضافة مباشرة
  const bInput = e.target && e.target.id === 'barcodeInput';
  if (bInput && e.key === 'Enter') {
    e.preventDefault();
    lookupBarcode(e.target.value);
    e.target.value = '';
    return;
  }
  const t = e.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
  if (/^\d$/.test(e.key)) {
    barcodeBuf += e.key;
    clearTimeout(barcodeTimer);
    barcodeTimer = setTimeout(function () { barcodeBuf = ''; }, 220);
  } else if (e.key === 'Enter' && barcodeBuf.length >= 4) {
    lookupBarcode(barcodeBuf);
    barcodeBuf = '';
  } else if (e.key.length === 1) {
    barcodeBuf = '';
  }
});

/* رقم الفاتورة القادم (نظام الترقيم اليومي: يبدأ 001 ويتجدد 8 صباحاً) */
function nextInvoiceLabel() {
  if (window.nextDailyNo && window.padNo) return window.padNo(window.nextDailyNo());
  return '001';
}
function posModeLabel() {
  const m = POS_MODES.find(x => x.id === displayMode);
  return m ? m.label : 'أزرر';
}

function catItems(catId = activeCategoryId) {
  if (!catId) return [];
  return DATA.items.filter(i => i.category_id === catId && i.is_available !== false).sort(bySort);
}
function families() {
  return uniq(catItems().map(i => i.family));
}
function finalItems() {
  let list = DATA.items.filter(i => i.is_available !== false);
  if (searchTerm.trim()) {
    const q = searchTerm.trim().toLowerCase();
    return list.filter(i => `${i.category_name} ${i.family} ${i.option_name} ${i.variant} ${i.name}`.toLowerCase().includes(q)).sort(bySort);
  }
  if (displayMode === 'direct' && activeCategoryId) return catItems();
  if (!activeCategoryId || !activeFamily) return [];
  return catItems().filter(i => i.family === activeFamily).sort(bySort);
}
function getActiveCategory() {
  return DATA.categories.find(c => c.id === activeCategoryId);
}
function familyLabel(family) {
  // طلب المستخدم: ضمن الشاورما، زر "شاورما" يظهر باسم أوضح
  if (activeCategoryId === 'cat_shawarma' && family === 'شاورما') return 'وجبات وسندويشات';
  return family;
}
function itemButtonParts(item) {
  const variant = (item.variant_clean || String(item.variant || '').replace(/ - |-/g, ' ')).trim();
  const base = String(item.base_name || '').trim();
  const family = String(item.family || '').trim();
  const option = String(item.option_name || '').trim();
  /* إصلاح: الأولوية لاسم الصنف نفسه (base_name) لا لاسم «الصنف الأب».
     سابقاً كان الأب يتصدر التسمية فيظهر «برغر» بدل «كريسبي برغر».
     لا أثر على بقية الأصناف لأن base_name == family عندها. */
  let head = base || family || option;
  if (!base && option && family && option !== family) head = `${family} ${option}`.trim();
  if (!head) head = String(item.category_name || '').trim();
  const sub = (variant && variant !== head && variant !== base && variant !== family && variant !== option) ? variant : '';
  const title = [head, sub].filter(Boolean).join(' ') || item.name || '';
  return { head: head || title, sub, title };
}
function itemButtonTitle(item) {
  return itemButtonParts(item).title;
}

function renderPOS() {
  /* إن أصبح التصنيف المختار بلا أصناف متاحة (أو أُوقف) نعود لعرض الكل،
     وإلا بقي الكاشير عالقاً على تصنيف فارغ */
  if (activeCategoryId && !sellableCategories().some(c => c.id === activeCategoryId)) {
    activeCategoryId = null;
    activeFamily = null;
  }

  const total = cart.reduce((s, x) => s + x.price * x.qty, 0);
  const count = cart.reduce((s, x) => s + x.qty, 0);
  const items = finalItems();

  if (displayMode === 'direct') return renderDirectPOS(total, count);

  document.getElementById('posApp').innerHTML = `
    <div class="pos-shell">
      ${shiftBanner()}
      ${window.AlfaCloud && AlfaCloud.html ? AlfaCloud.html() : ''}
      <div class="cashier-layout clean-pos-layout">
        <nav class="cashier-sidebar" id="cashierSidebar" aria-label="قائمة الكاشير">
          <button class="side-toggle" type="button" data-action="toggle-nav">☰</button>
          <div class="side-logo"><strong>α</strong><span>alfaprosys</span></div>
          ${renderCashierSideLinks()}
        </nav>

        ${renderCardsRail()}

        <section class="pos-menu-panel clean-menu-panel">
          <header class="pos-work-header">
            <div>
              <div class="pos-brand">alfaprosys</div>
              <div class="pos-subtitle">فاتورة جديدة — شاشة البيع</div>
            </div>
            <div class="pos-head-tools">
              ${window.NetBadge ? NetBadge.html('netBadgePos') : ''}
              ${currencyNew ? '<span class="cur-new-chip" title="العرض بالعملة الجديدة">ل.س جديدة</span>' : ''}
              <input id="barcodeInput" class="barcode-input" type="text" inputmode="numeric" autocomplete="off"
                     placeholder="📷 باركود / كود" title="امسح الباركود أو اكتب الكود ثم Enter" data-action="barcode-enter">
              <div class="invoice-mini-badge">${nextInvoiceLabel()}</div>
            </div>
          </header>

          <div class="order-type-bar">
            ${DATA.orderTypes.map(t => `
              <button class="ot-btn ${orderType===t.id?'active':''}" type="button" data-action="order-type" data-value="${escapeHtml(t.id)}">
                ${t.icon} ${t.label}
              </button>
            `).join('')}
            <a class="ot-btn" href="tables.html" title="خريطة الطاولات — الشاغرة والمشغولة">🗺️ الطاولات</a>
            <a class="ot-btn online-ot-btn" href="online_orders.html" title="الطلبات الأونلاين الواردة">
              🛵 أونلاين${onlinePendingCount() ? ` <span class="online-pending-badge">${onlinePendingCount()}</span>` : ''}
            </a>
          </div>
          ${orderType === 'dinein' ? `<div class="hall-strip">${['صالة خارجية','صالة داخلية','صالة العائلات'].map(h => `<button class="hall-chip ${selectedHall===h?'selected':''}" type="button" data-action="hall" data-value="${escapeHtml(h)}">${escapeHtml(h)}</button>`).join('')}</div>` : ''}
          ${orderType === 'delivery' ? renderDeliveryFields() : ''}
          ${orderType === 'contract' ? renderContractPanel() : ''}

          ${orderType !== 'contract' ? (searchTerm.trim() || searchOpen ? renderSearchArea(items) : (displayMode === 'buttons' ? renderButtonFlow(items) : displayMode === 'direct' ? renderDirectFlow(items) : renderDropdownFlow(items))) : ''}
        </section>

        <aside class="bill-panel clean-bill-panel">
          <div class="bill-head">
            <div><h2>🧾 فاتورة ${nextInvoiceLabel()}</h2><p>${orderType==='dinein' ? escapeHtml(selectedHall) : orderType==='takeaway' ? 'سفري' : 'توصيل'}</p></div>
            
          </div>
          <div class="bill-list">
            ${cart.length === 0 ? `<div class="empty-cart">الفاتورة فارغة<br>اختر الأصناف من القائمة</div>` : cart.map(c => `
              <div class="bill-item-card">
                <div class="bill-item-top">
                  <div class="bill-info"><strong><span class="bill-item-title ${c.offer_id ? 'dinv-offer-row' : ''}">${c.offer_id ? '🎟️ ' : ''}${escapeHtml(c.name)}</span>${!c.locked && itemDiscRule(c.id) ? `<span class="item-disc-badge" title="خصم إداري تلقائي">−${fmtNum(itemDiscRule(c.id).pct)}%</span>` : ''}</strong></div>
                  <div class="bill-qty-badge">${c.locked ? '🔒' : fmtNum(c.qty)}</div>
                  <div class="bill-line-total">${c.locked ? fmtCur(c.price) : (itemDiscRule(c.id) ? `<s>${fmtCur(c.price * c.qty)}</s> <b>${fmtCur(itemNet(c) * c.qty)}</b>` : fmtCur(c.price * c.qty))}</div>
                  <button class="remove-item-btn" type="button" data-action="remove-item" data-id="${c.id}" aria-label="إزالة الصنف">x</button>
                </div>
                <textarea class="item-note-input" readonly data-action="note-open" data-id="${c.id}" placeholder="ملاحظات: ثوم زيادة، بدون حار، بطاطا زيادة...">${escapeHtml(c.note || '')}</textarea>
              </div>`).join('')}
          </div>
          <div class="bill-total-box"><span>المجموع (${count})</span><strong>${fmtCur(total)}</strong></div>
          ${(function(){ const dp = discountParts(); return dp.total ? `<div class="bill-discount-line">💸 خصم تلقائي${dp.itemPart && dp.invPart ? ' (أصناف + فاتورة ' + fmtNum(invDiscPct()) + '%)' : dp.itemPart ? ' أصناف' : ' فاتورة ' + fmtNum(invDiscPct()) + '%'}: -${fmtCur(dp.total)} → الإجمالي ${fmtCur(Math.max(0,total-dp.total))}</div>` : ''; })()}
          <div class="bill-actions">
            <button class="calc-btn" type="button" data-action="hold-order">⏸️ تعليق</button>
          </div>
          ${renderHeldPanel()}
          ${renderPaySection()}
          <div class="bill-actions"><button class="calc-btn" type="button" data-action="open-calc" ${cart.length===0?'disabled':''}>🧮 الحاسبة</button><button class="print-btn" type="button" data-action="submit-order" ${cart.length===0?'disabled':''}>🖨️ طباعة الفاتورة</button></div>
        </aside>
      </div>
      <div class="mobile-nav-scrim" id="mobileNavScrim" data-action="close-nav"></div>
      <button class="mobile-fab" id="mobileNavFab" type="button" data-action="toggle-nav">☰</button>
      <nav class="mobile-cashier-nav" id="mobileCashierNav"><div class="mobile-nav-head"><strong>قائمة الكاشير</strong><button type="button" data-action="close-nav">✕</button></div><div class="mobile-nav-grid">${renderMobileCashierLinks()}</div></nav>
      ${renderQtyModal()}
      ${renderNoteModal()}
      ${renderCalcModal(total - discountParts().total)}
      ${renderLeaveModal()}
    </div>`;

  bindPOSActions();
  saveDraft();
  if (window.NetBadge) NetBadge.bind();
  if (searchOpen && !pendingItemId && !pendingNoteItemId && !calcOpen) setTimeout(() => document.getElementById('posSearchInput')?.focus(), 0);
  if (calcOpen) setTimeout(() => document.getElementById('calcPaidInput')?.focus(), 0);
}

/* ================================================================
   النمط المباشر — تنسيق مطوّر بأسلوب برامج المحاسبة:
   شريط عمليات ضيق مكدس على الجانب + جدول فاتورة (حقول فارغة)
   واختيار الأصناف تحته + عمود أيمن: التصنيفات ولوحة إدخال كالحاسبة
   ================================================================ */
function renderDirectPOS(total, count) {
  const cats = sellableCategories();
  const items = finalItems();
  document.getElementById('posApp').innerHTML = `
    <div class="pos-shell">
      ${shiftBanner()}
      <div class="direct-pos">

        <header class="d-topbar">
          <button class="d-burger" type="button" data-action="toggle-nav" title="قائمة الكاشير">☰</button>
          <div class="d-brand"><strong>alfaprosys</strong></div>
          <input id="barcodeInput" class="barcode-input" type="text" inputmode="numeric" autocomplete="off"
                 placeholder="📷 باركود" title="امسح أو اكتب الكود ثم Enter" data-action="barcode-enter">
          ${window.NetBadge ? NetBadge.html('netBadgePos') : ''}
          ${currencyNew ? '<span class="cur-new-chip" title="العرض بالعملة الجديدة">ل.س جديدة</span>' : ''}
          <div class="invoice-mini-badge">فاتورة ${nextInvoiceLabel()}</div>
        </header>

        <div class="d-body">
          <section class="d-main" aria-label="الفاتورة والأصناف">
            <div class="d-invwrap">${renderDirectInvoice(total, count)}</div>
            <div class="d-items">${renderDirectItemsArea(items)}</div>
            <div class="d-paybar">${renderPaySection()}<button class="d-print-btn" type="button" data-action="submit-order" ${cart.length===0?'disabled':''}>🖨️ طباعة</button></div>
          </section>

          <aside class="d-mid" aria-label="نوع الطلب والتصنيفات">
            <div class="d-otbar">
              ${DATA.orderTypes.map(t => `<button class="ot-btn ${orderType===t.id?'active':''}" type="button" data-action="order-type" data-value="${escapeHtml(t.id)}">${t.icon} ${t.label}</button>`).join('')}
              <button class="ot-btn" type="button" data-action="tables">🗺️ الطاولات</button>
              <button class="ot-btn online-ot-btn" type="button" data-action="online-orders">🛵 أونلاين${onlinePendingCount() ? ` <span class="online-pending-badge">${onlinePendingCount()}</span>` : ''}</button>
            </div>
            <div class="d-cats" aria-label="التصنيفات الرئيسية">
              ${cats.map(c => `<button class="d-cat ${activeCategoryId===c.id?'active':''}" type="button" data-action="category" data-value="${escapeHtml(c.id)}"><span>${c.icon}</span>${escapeHtml(c.name)}</button>`).join('')}
            </div>
          </aside>

          <aside class="d-ops" aria-label="العمليات">
            ${renderDirectOps()}
          </aside>
        </div>

        ${renderCardsModal()}
      ${renderDirectAuxModal()}
      ${renderPosEmbed()}

      <div class="mobile-nav-scrim" id="mobileNavScrim" data-action="close-nav"></div>
      <button class="mobile-fab" id="mobileNavFab" type="button" data-action="toggle-nav">☰</button>
      <nav class="mobile-cashier-nav" id="mobileCashierNav"><div class="mobile-nav-head"><strong>قائمة الكاشير</strong><button type="button" data-action="close-nav">✕</button></div><div class="mobile-nav-grid">${renderMobileCashierLinks()}</div></nav>

      </div>

      ${renderQtyModal()}
      ${renderNoteModal()}
      ${renderCalcModal(total - discountParts().total)}
      ${renderLeaveModal()}
    </div>`;

  bindPOSActions();
  saveDraft();
  if (window.NetBadge) NetBadge.bind();
}


function renderDirectAuxModal() {
  if (displayMode !== 'direct' || !directAuxModal) return '';
  const title = directAuxModal === 'hall' ? 'اختيار الصالة'
    : directAuxModal === 'delivery' ? 'بيانات التوصيل'
    : directAuxModal === 'contract' ? 'اختيار العقد'
    : 'حسم الفاتورة';
  let body = '';
  if (directAuxModal === 'hall') {
    body = `<div class="d-aux-halls">${['صالة خارجية','صالة داخلية','صالة العائلات'].map(h =>
      `<button class="hall-chip ${selectedHall===h?'selected':''}" type="button" data-action="hall" data-value="${escapeHtml(h)}">${escapeHtml(h)}</button>`
    ).join('')}</div>
    <div class="d-aux-hint">الصالة الحالية: <b>${escapeHtml(selectedHall || '—')}</b></div>`;
  } else if (directAuxModal === 'delivery') {
    body = renderDeliveryFields() + `<button class="d-aux-done" type="button" data-action="close-direct-aux">تم</button>`;
  } else if (directAuxModal === 'contract') {
    const contracts = (window.DEMO_DATA.contracts || []).filter(c => c.status === 'active');
    body = contracts.length
      ? `<div class="d-aux-list">${contracts.map(c => `<button type="button" class="d-aux-item ${selectedContractId===c.id?'on':''}" data-action="contract-pick" data-id="${escapeHtml(c.id)}"><strong>${escapeHtml(c.client_name)}</strong>${c.company ? `<small>${escapeHtml(c.company)}</small>` : ''}</button>`).join('')}</div>`
      : '<div class="d-aux-hint">لا توجد عقود نشطة</div>';
  } else if (directAuxModal === 'discount') {
    const dp = discountParts();
    const pct = invDiscPct();
    body = `<div class="d-aux-hint">خصم الأصناف: <b>${fmtCur(dp.itemPart)}</b> — خصم الفاتورة: <b>${fmtNum(pct)}%</b> (${fmtCur(dp.invPart)})</div>
      <div class="d-aux-disc-grid">${[0,5,10,15,20].map(n => `<button type="button" class="d-aux-pct ${pct===n?'on':''}" data-action="set-inv-disc" data-value="${n}">${n}%</button>`).join('')}</div>
      <div class="d-aux-custom"><input id="dAuxDisc" type="number" min="0" max="100" inputmode="numeric" value="${pct}" placeholder="%"><button type="button" data-action="set-inv-disc" data-value="">تطبيق</button></div>`;
  }
  return `
    <div class="d-aux-scrim" data-action="close-direct-aux"></div>
    <div class="d-aux-modal" role="dialog" aria-label="${title}">
      <div class="d-aux-head"><strong>${title}</strong><button type="button" data-action="close-direct-aux">✕</button></div>
      ${body}
    </div>`;
}

function renderDirectOps() {
  const B = (a, ic, lb, extra = '') =>
    `<button class="dop-btn ${extra}" type="button" data-action="${a}" title="${lb}"><span>${ic}</span><small>${lb}</small></button>`;
  return `
    ${B('open-popular-modal', '⭐', 'الأكثر')}
    ${B('open-offers-modal', '🎟️', 'العروض')}
    ${B('open-direct-disc', '💸', 'الحسم')}
    ${B('toggle-search', '🔍', 'بحث')}
    ${B('hold-order', '📌', 'تعليق')}
    ${B('d-del-row', '🗑️', 'حذف')}
    ${B('clear-cart', '♻️', 'تفريغ')}
    ${B('delivery-screen', '🛵', 'توصيل')}
    ${B('invoices', '🧾', 'فواتير')}
    ${B('kitchen', '🍳', 'مطبخ')}
    ${B('tables', '🗺️', 'طاولات')}
    ${B('toggle-mode', '🔁', 'النمط')}
    ${B('toggle-currency', '💱', currencyNew ? 'قديم' : 'جديد', currencyNew ? 'dop-on' : '')}`;
}

function renderDirectInvoice(total, count) {
  const dp0 = discountParts();
  const disc = dp0.total;
  /* الأصناف المخفوضة تُعرض صافية في صفوفها، وخصم الفاتورة يظهر في التذييل */
  const rows = cart.map((c, idx) => `
    <div class="dinv-row ${directSelectedId===c.id?'selected':''}" data-action="d-select-row" data-id="${escapeHtml(c.id)}">
      <span class="dinv-c dinv-n">${idx + 1}</span>
      <span class="dinv-c dinv-name ${c.offer_id ? 'dinv-offer-row' : ''}" title="${escapeHtml(c.name)}">${c.offer_id && !c.offer_disc ? '🎟️ ' : ''}${escapeHtml(c.name)}${!c.locked && itemDiscRule(c.id) ? ` <span class="item-disc-badge">−${fmtNum(itemDiscRule(c.id).pct)}%</span>` : ''}</span>
      <span class="dinv-c dinv-price">${itemDiscRule(c.id) ? `<s>${fmtCur(c.price)}</s>` : fmtCur(c.price)}</span>
      <span class="dinv-c dinv-qty">${c.locked ? '🔒' : fmtNum(c.qty)}</span>
      <span class="dinv-c dinv-disc">${c.offer_disc ? 'خصم عرض' : c.is_free ? '🎁 مجاني' : (c.locked ? 'عرض' : (itemDiscRule(c.id) ? `−${fmtNum(itemDiscRule(c.id).pct)}%` : '—'))}</span>
      <span class="dinv-c dinv-total">${c.locked ? fmtCur(c.price) : fmtCur(itemNet(c) * c.qty)}</span>
      <span class="dinv-c dinv-note ${c.note ? '' : 'muted'}" data-action="note-open" data-id="${escapeHtml(c.id)}" title="اضغط لتعديل الملاحظة">${c.note ? escapeHtml(c.note) : '—'}</span>
      <button class="dinv-del" type="button" data-action="remove-item" data-id="${escapeHtml(c.id)}" title="حذف الصنف">✕</button>
    </div>`).join('');

  const TOTAL_ROWS = 7;
  const extra = [];
  for (let i = cart.length; i < TOTAL_ROWS; i++) {
    extra.push(`<div class="dinv-row empty"><span class="dinv-c dinv-n">${i + 1}</span><span class="dinv-c dinv-name"></span><span class="dinv-c dinv-price"></span><span class="dinv-c dinv-qty"></span><span class="dinv-c dinv-disc"></span><span class="dinv-c dinv-total"></span><span class="dinv-c dinv-note"></span><span class="dinv-c"></span></div>`);
  }
  const net = Math.max(0, total - disc);

  return `
    <div class="dinv-banner">
      <div class="dinv-banner-lbl">الإجمالي</div>
      <div class="dinv-banner-amt">${fmtCur(net)}<small>${fmtNum(count)} صنف</small></div>
    </div>
    <div class="dinv-head">
      <span class="dinv-n">#</span><span>اسم المادة</span><span class="dinv-price">السعر</span><span class="dinv-qty">الكمية</span><span class="dinv-disc">الحسم</span><span class="dinv-total">الإجمالي</span><span class="dinv-note">ملاحظة</span><span></span>
    </div>
    <div class="dinv-rows">${rows}${extra.join('')}</div>`;
}

function renderDirectItemsArea(items) {
  if (orderType === 'contract' && !selectedContractId) {
    return '<div class="d-items-hint">اختر عقداً من زر «عقود» لتظهر الأصناف</div>';
  }
  if (searchTerm.trim() || searchOpen) return renderSearchArea(items);
  const list = activeCategoryId
    ? catItems()
    : (DATA.items || []).filter(i => i.is_available !== false);
  if (!list.length) return '<div class="d-items-hint">لا أصناف في هذا التصنيف</div>';
  return `<div class="d-menu-grid">${renderItemButtons(list)}</div>`;
}

function renderDirectPad() {
  const sel = cart.find(c => c.id === directSelectedId);
  const keys = ['1','2','3','4','5','6','7','8','9','.','0','⌫'];
  return `
    <div class="dpad">
      <div class="dpad-head">${sel ? `الهدف: <b>${escapeHtml(sel.name)}</b>` : 'اختر صنفاً من جدول الفاتورة'}</div>
      <div class="dpad-modes">
        <button class="dpad-mode ${padMode==='qty'?'on':''}" type="button" data-action="d-pad-mode" data-value="qty">الكمية</button>
        <button class="dpad-mode ${padMode==='note'?'on':''}" type="button" data-action="d-pad-mode" data-value="note">ملاحظة</button>
      </div>
      ${padMode === 'note'
        ? `<div class="dpad-note-row">${voiceMicBtn('pad-note', true)}<input id="dPadInput" class="dpad-input" type="text" dir="rtl" lang="ar" autocomplete="off" placeholder="اكتب أو انطق الملاحظة" value="${escapeHtml(padBuf)}"></div>`
        : `<div class="dpad-display">${padBuf || (sel ? fmtNum(sel.qty) : '0')}</div>`}
      <div class="dpad-keys">${keys.map(k => `<button class="dpad-key" type="button" data-action="d-pad-key" data-value="${k}">${k}</button>`).join('')}</div>
      <div class="dpad-note-chips">${NOTE_SUGGESTIONS.slice(0, 8).map(n => `<button class="dpad-chip" type="button" data-action="d-note-chip" data-value="${escapeHtml(n)}">${escapeHtml(n)}</button>`).join('')}</div>
      <div class="dpad-actions">
        <button class="dpad-apply" type="button" data-action="d-pad-apply">تطبيق ${padMode==='qty'?'الكمية':'الملاحظة'}</button>
        <button class="dpad-clear" type="button" data-action="d-pad-key" data-value="C">مسح</button>
      </div>
    </div>`;
}

/* إضافة مباشرة بلا نافذة كمية في هذا النمط */
function directItemAdd(id) {
  const item = DATA.items.find(i => i.id === id);
  if (!item) return;
  const ex = cart.find(c => c.id === id && !c.locked);
  if (ex) ex.qty += 1; else cart.push({ id: item.id, name: item.name, price: item.price, qty: 1, note: '' });
  directSelectedId = id;
  renderPOS();
}
function dPadKey(k) {
  if (k === 'C') { padBuf = ''; return renderPOS(); }
  if (k === '⌫') { padBuf = padBuf.slice(0, -1); return renderPOS(); }
  padBuf += k;
  renderPOS();
}
function dPadApply() {
  const row = cart.find(c => c.id === directSelectedId);
  if (!row) return showToast('اختر صنفاً من جدول الفاتورة أولاً', '⚠️');
  if (row.locked) return showToast('🔒 العرض ثابت — يمكن الإضافة عليه فقط', '⚠️');
  if (padMode === 'qty') {
    const q = Math.round(Number(padBuf));
    if (!q || q <= 0) {
      if (padBuf.trim() === '' ) return showToast('أدخل الكمية من اللوحة', '⚠️');
      removeFromCart(row.id); padBuf = ''; return;
    }
    row.qty = q; pad(0, -1); return renderPOS(); }
  padBuf += k;
  renderPOS();
}
function dPadApply() {
  const row = cart.find(c => c.id === directSelectedId);
  if (!row) return showToast('اختر صنفاً من جدول الفاتورة أولاً', '⚠️');
  if (row.locked) return showToast('🔒 العرض ثابت — يمكن الإضافة عليه فقط', '⚠️');
  if (padMode === 'qty') {
    const q = Math.round(Number(padBuf));
    if (!q || q <= 0) {
      if (padBuf.trim() === '' ) return showToast('أدخل الكمية من اللوحة', '⚠️');
      removeFromCart(row.id); padBuf = ''; return;
    }
    row.qty = q; padBuf = ''; renderPOS();
    return showToast(`${row.name} × ${fmtNum(q)}`, '✅');
  }
  const t = padBuf.trim();
  if (!t) return showToast('اكتب الملاحظة أولاً', '⚠️');
  row.note = row.note ? row.note + '، ' + t : t;
  padBuf = ''; renderPOS();
  showToast('أُضيفت الملاحظة', '📝');
}
function dNoteChip(txt) {
  const row = cart.find(c => c.id === directSelectedId);
  if (!row) return showToast('اختر صنفاً من جدول الفاتورة أولاً', '⚠️');
  row.note = row.note ? row.note + '، ' + txt : txt;
  renderPOS();
  showToast(`ملاحظة: ${txt}`, '📝');
}

/* ================================================================
   بطاقات القسم الأيمن — الأكثر طلباً / العروض / الخصومات
   (تبويب جانبي على الجوال، وإظهار/إخفاء من قائمة الكاشير)
   ================================================================ */
function offerIncludes(o) {
  return (o.items || []).map(line => {
    const it = (DATA.items || []).find(i => i.id === line.item_id);
    if (!it) return '';
    return `${line.free ? '🎁 ' : ''}${it.name}${line.qty > 1 ? ' ×' + fmtNum(line.qty) : ''}`;
  }).filter(Boolean).join(' + ');
}
function orderOffer(ofrId) {
  /* التفكيك الفوري: كل مكون بصف مستقل (المجاني بسعر 0) + سطر خصم العرض
     → المخزون والتقارير والتكاليف تقرأ أصنافاً عادية، والعرض سعرُه محفوظ */
  const o = activeOffers().find(x => x.id === ofrId);
  if (!o) return;
  if (cart.find(c => c.offer_id === o.id)) return showToast('العرض موجود في الفاتورة أصلاً', 'ℹ️');
  const lines = (o.items || []).map(l => {
    const it = (DATA.items || []).find(i => i.id === l.item_id);
    if (!it) return null;
    return {
      id: it.id, offer_id: o.id, name: it.name,
      price: l.free ? 0 : (it.price || 0),   // المقدَّم مجاناً = 0 إيراد
      qty: l.qty, note: '', locked: true, is_free: !!l.free,
    };
  }).filter(Boolean);
  if (!lines.length) return;
  const gross = lines.reduce((t, l) => t + l.price * l.qty, 0);
  const target = Math.max(0, Number(o.price) || 0);
  const diff = Math.round(gross - target);
  cart.push(...lines);
  if (diff > 0) {
    cart.push({ id: 'offerdisc_' + o.id, offer_id: o.id, offer_disc: true,
      name: 'خصم العرض: ' + o.title, price: -diff, qty: 1, note: '', locked: true });
  }
  directSelectedId = lines[0].id;
  showToast('أُضيف العرض للفاتورة — يمكن الإضافة عليه', '🎟️');
  renderPOS();
}
function renderCardsRail() {
  if (!cardsVisible) return '';
  const top = topSoldItems(3);
  const offers = activeOffers();
  const rules = (discSettings().items || [])
    .map(r => ({ rule: r, item: (DATA.items || []).find(i => i.id === r.item_id) }))
    .filter(x => x.item && x.item.is_available !== false);

  const topHtml = top.length ? top.map(i => `
    <button class="cr-item" type="button" data-action="open-qty" data-id="${escapeHtml(i.id)}" title="إضافة للفاتورة">
      <span class="cr-item-name">${escapeHtml(itemButtonTitle(i))}</span>
      <span class="cr-item-price">${itemDiscRule(i.id) ? `<s>${fmtCur(i.price)}</s> <b>${fmtCur(itemNet(i))}</b>` : fmtCur(i.price)}</span>
    </button>`).join('') : '<div class="cr-empty">لا مبيعات بعد</div>';

  const offersHtml = offers.length ? offers.map(o => `
    <div class="cr-offer">
      <div class="cr-offer-title">🎟️ ${escapeHtml(o.title)}</div>
      <div class="cr-offer-inc">${escapeHtml(offerIncludes(o))}</div>
      <div class="cr-offer-foot">
        <span class="cr-offer-price">${fmtCur(o.price)} ل.س</span>
        <button class="cr-offer-btn" type="button" data-action="order-offer" data-value="${escapeHtml(o.id)}">اطلب العرض</button>
      </div>
    </div>`).join('') : '<div class="cr-empty">لا توجد عروض حالياً</div>';

  const discHtml = rules.length ? rules.map(({ rule, item }) => `
    <button class="cr-item" type="button" data-action="open-qty" data-id="${escapeHtml(item.id)}" title="إضافة للفاتورة">
      <span class="cr-item-name">${escapeHtml(itemButtonTitle(item))}</span>
      <span class="cr-item-price"><s>${fmtCur(item.price)}</s> <b>${fmtCur(itemNet(item))}</b> <i class="cr-pct">−${fmtNum(rule.pct)}%</i></span>
    </button>`).join('') : '<div class="cr-empty">لا خصومات على أصناف حالياً</div>';

  return `
    <button class="cards-tab" type="button" data-action="toggle-cards-drawer" title="البطاقات">🎟️</button>
    <aside class="cards-rail" id="cardsRail" aria-label="البطاقات">
      <div class="cr-card">
        <div class="cr-card-title">⭐ الأكثر طلباً</div>
        ${topHtml}
      </div>
      <div class="cr-card">
        <div class="cr-card-title">🎟️ العروض</div>
        ${offersHtml}
      </div>
      <div class="cr-card">
        <div class="cr-card-title">💸 خصومات حالية</div>
        ${discHtml}
      </div>
    </aside>`;
}
/* ── نافذة الأكثر طلباً / العروض — النمط المباشر فقط (تظهر كنافذة فوق الشاشة نفسها) ── */
function renderCardsModal() {
  if (displayMode !== 'direct' || !cardsModalTab) return '';
  const isTop = cardsModalTab === 'top';
  return `
    <div class="cards-modal-scrim" data-action="close-cards-modal"></div>
    <div class="cards-modal" role="dialog" aria-label="${isTop ? 'الأكثر طلباً' : 'العروض'}">
      <div class="cards-modal-head">
        <div class="cm-tabs">
          <button type="button" class="cm-tab ${isTop ? 'active' : ''}" data-action="cards-modal-tab" data-value="top">⭐ الأكثر طلباً</button>
          <button type="button" class="cm-tab ${!isTop ? 'active' : ''}" data-action="cards-modal-tab" data-value="offers">🎟️ العروض</button>
        </div>
        <button type="button" class="cm-close" data-action="close-cards-modal">✕</button>
      </div>
      <div class="cards-modal-body">
        ${isTop ? renderCardsModalTop() : renderCardsModalOffers()}
      </div>
    </div>`;
}
function cardImgOrIcon(url, icon) {
  return url ? `<img src="${escapeHtml(url)}" alt="" loading="lazy">` : `<span>${icon}</span>`;
}
function renderCardsModalTop() {
  const items = topSoldItems(16);
  if (!items.length) return '<div class="cr-empty">لا مبيعات بعد</div>';
  return `<div class="cm-grid">${items.map(i => `
    <button type="button" class="cm-card" data-action="open-qty" data-id="${escapeHtml(i.id)}">
      <div class="cm-card-img">${cardImgOrIcon(i.image_url, '🍽️')}</div>
      <div class="cm-card-name">${escapeHtml(itemButtonTitle(i))}</div>
      <div class="cm-card-price">${itemDiscRule(i.id) ? `<s>${fmtCur(i.price)}</s> ${fmtCur(itemNet(i))}` : fmtCur(i.price)} ل.س</div>
    </button>`).join('')}</div>`;
}
function renderCardsModalOffers() {
  const offers = activeOffers();
  if (!offers.length) return '<div class="cr-empty">لا توجد عروض حالياً</div>';
  return `<div class="cm-grid">${offers.map(o => `
    <button type="button" class="cm-card cm-card-offer" data-action="order-offer-modal" data-value="${escapeHtml(o.id)}">
      <div class="cm-card-img">${cardImgOrIcon(o.image_url, '🎟️')}</div>
      <div class="cm-card-name">${escapeHtml(o.title)}</div>
      <div class="cm-card-sub">${escapeHtml(offerIncludes(o))}</div>
      <div class="cm-card-price">${fmtCur(o.price)} ل.س</div>
    </button>`).join('')}</div>`;
}
function openPopularModal() { cardsModalTab = 'top'; renderPOS(); }
function openOffersModal() { cardsModalTab = 'offers'; renderPOS(); }
function closeCardsModal() { cardsModalTab = null; renderPOS(); }

function toggleCardsVisible() {
  cardsVisible = !cardsVisible;
  try { localStorage.setItem('alfaprosys_cards', cardsVisible ? 'visible' : 'hidden'); } catch (e) {}
  closeCashierNav();
  showToast(cardsVisible ? 'البطاقات ظاهرة' : 'البطاقات مخفية', cardsVisible ? '🎁' : '🙈');
  renderPOS();
}
function toggleCardsDrawer() {
  document.getElementById('cardsRail')?.classList.toggle('open');
}

function renderDeliveryFields() {
  return `
    <div class="delivery-card">
      <div class="delivery-card-title">🛵 بيانات التوصيل</div>
      <div class="delivery-fields">
        <div class="delivery-field-row">
          <input type="text" data-action="delivery-field" data-field="name"
            value="${escapeHtml(deliveryInfo.name)}" placeholder="اسم العميل">
          ${voiceMicBtn('delivery-name')}
        </div>
        <div class="delivery-field-row">
          <input type="tel" inputmode="tel" data-action="delivery-field" data-field="phone"
            value="${escapeHtml(deliveryInfo.phone)}" placeholder="رقم الهاتف">
          ${voiceMicBtn('delivery-phone')}
        </div>
        <div class="delivery-field-row">
          <input class="delivery-address" type="text" data-action="delivery-field" data-field="address"
            value="${escapeHtml(deliveryInfo.address)}" placeholder="العنوان الكامل">
          ${voiceMicBtn('delivery-address')}
        </div>
      </div>
    </div>
  `;
}

/* ================================================================
   🔖 لوحة العقود (إضافة جديدة)
   ================================================================ */
function renderContractPanel() {
  const contracts = (window.DEMO_DATA.contracts || []).filter(c => c.status === 'active');

  /* بحث داخل العقود */
  const filtered = contractSearchTerm.trim()
    ? contracts.filter(c =>
        `${c.client_name} ${c.company}`.toLowerCase().includes(contractSearchTerm.toLowerCase()))
    : contracts;

  const selected = contracts.find(c => c.id === selectedContractId);

  /* بطاقة العقد المختار */
  const selectedCard = selected ? `
    <div class="con-selected-card">
      <div class="con-sel-head">
        <div>
          <strong>${escapeHtml(selected.client_name)}</strong>
          ${selected.company ? `<span class="con-sel-company">${escapeHtml(selected.company)}</span>` : ''}
        </div>
        <button type="button" class="con-sel-clear" data-action="contract-clear">✕</button>
      </div>
      <div class="con-sel-meta">
        <span>📅 ${escapeHtml(selected.start_date)} ← ${escapeHtml(selected.end_date)}</span>
        <span>🕐 ${escapeHtml(selected.delivery_time || '—')}</span>
        <span>${selected.payment_method === 'installments' ? '💳 دفعات' : '💵 نقدي'}</span>
      </div>
      ${selected.notes ? `<div class="con-sel-note">📝 ${escapeHtml(selected.notes)}</div>` : ''}
    </div>` : '';

  /* قائمة العقود للاختيار */
  const listItems = filtered.map(c => `
    <button type="button"
      class="con-list-item ${c.id === selectedContractId ? 'selected' : ''}"
      data-action="contract-pick" data-id="${escapeHtml(c.id)}">
      <span class="con-list-icon">📋</span>
      <span class="con-list-info">
        <strong>${escapeHtml(c.client_name)}</strong>
        ${c.company ? `<small>${escapeHtml(c.company)}</small>` : ''}
      </span>
      <span class="con-list-type">${{ daily:'يومي', weekly:'أسبوعي', monthly:'شهري', custom:'مخصص' }[c.contract_type] || ''}</span>
    </button>`).join('');

  /* أصناف العقد المختار */
  const contractItems = selected ? `
    <div class="con-items-section">
      <div class="con-items-title">📦 أصناف العقد</div>
      <div class="con-items-grid">
        ${(selected.items || []).map(it => {
          const inCart = cart.find(c => c.id === it.item_id);
          return `<button type="button"
            class="con-item-btn ${inCart ? 'in-cart' : ''}"
            data-action="contract-add-item"
            data-item-id="${escapeHtml(it.item_id)}"
            data-name="${escapeHtml(it.name)}"
            data-price="${it.price}"
            data-qty="${it.qty}">
            ${inCart ? `<span class="item-qty-badge">${inCart.qty}</span>` : ''}
            <div class="item-name">${escapeHtml(it.name)}</div>
            <div class="con-item-meta">
              <span>الكمية: ${it.qty}</span>
              <span>${fmtCur(it.price)} ل.س</span>
            </div>
          </button>`;
        }).join('')}
      </div>
    </div>` : '';

  return `
    <div class="contract-panel">
      <div class="contract-panel-title">📋 اختر عقد العميل</div>

      <div class="con-search-row">
        <input type="search" dir="rtl"
          class="con-search-input"
          id="conSearchInput"
          placeholder="ابحث باسم العميل أو الشركة..."
          value="${escapeHtml(contractSearchTerm)}"
          data-action="contract-search"
          autocomplete="off">
        ${contractSearchTerm ? `<button type="button" class="con-search-clear" data-action="contract-search-clear">×</button>` : ''}
      </div>

      ${!contracts.length ? `<div class="con-empty">لا توجد عقود نشطة</div>` : ''}

      <div class="con-list">
        ${listItems || `<div class="con-empty">لا نتائج</div>`}
      </div>

      ${selectedCard}
      ${contractItems}
    </div>`;
}

/* ================================================================
   🎤 زر الإدخال الصوتي (إضافة جديدة)
   ================================================================ */
/* لوحة سقف الذمة الحية (آجل ← عقد) */
function deferredCreditPanel(){
  if (!selectedContractId) return '';
  const info = contractCreditInfo(selectedContractId);
  if (!info) return '';
  const t = Math.max(0, cart.reduce((s,x)=>s+x.price*x.qty,0) - discountParts().total);
  const st = creditState(info, t);
  if (!st) return '';
  const cls = st.over ? 'cr-over' : st.near ? 'cr-near' : 'cr-ok';
  const msg = st.over
    ? '🔴 تحذير: هذه الفاتورة تتجاوز سقف الذمة — أبلغ الإدارة قبل إتمام البيع'
    : st.near ? '🟡 الذمة تقترب من السقف' : '🟢 ضمن السقف';
  return `
    <div class="credit-panel ${cls}">
      <div class="credit-row"><span>الذمة الحالية</span><b>${fmtCur(info.balance)} ل.س</b></div>
      <div class="credit-row"><span>سقف العقد</span><b>${fmtCur(info.limit)} ل.س</b></div>
      <div class="credit-row"><span>بعد هذه الفاتورة (${fmtCur(t)})</span><b>${fmtCur(st.after)} ل.س</b></div>
      ${info.nextDue ? `<div class="credit-row"><span>أقرب استحقاق</span><b>${info.nextDue}</b></div>` : ''}
      <div class="credit-msg">${msg}</div>
    </div>`;
}

/* voiceMicBtn(target) — زر مايك لأي حقل (يكشف الهيدفون ويخفت بلا إنترنت) */
let voiceMicName = '';   // اسم جهاز الإدخال (هيدفون إن وُجد)
async function detectMicDevice() {
  try {
    const devs = await (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices());
    if (!devs) return;
    const ins = devs.filter(d => d.kind === 'audioinput');
    const external = ins.find(d => d.label && !/default|internal|array|built[- ]?in/i.test(d.label));
    voiceMicName = external ? external.label.slice(0, 24)
      : (ins.length > 1 ? 'مايك خارجي 🎧' : 'مايك الجهاز 🎤');
  } catch (e) { voiceMicName = ''; }
  updateVoiceUI();
}
function micIcon() { return /هيدفون|head|USB|خارجي/i.test(voiceMicName) ? '🎧' : '🎤'; }
function voiceOffline() { return navigator.onLine === false; }
const VOICE_TARGET_LABELS = {
  'search': 'البحث عن صنف', 'delivery-name': 'اسم العميل', 'delivery-phone': 'هاتف العميل',
  'delivery-address': 'عنوان العميل', 'note-modal': 'ملاحظة الصنف', 'pad-note': 'ملاحظة',
  'def-name': 'اسم العميل', 'def-phone': 'هاتف العميل', 'def-addr': 'العنوان',
};
function voiceMicBtn(target, big = false) {
  if (!(window.SpeechRecognition || window.webkitSpeechRecognition)) return '';
  const active = voiceActive && voiceTarget === target;
  const off = voiceOffline();
  return `<button type="button"
    class="voice-mic-btn ${active ? 'voice-active' : ''} ${big ? 'voice-big' : ''} ${off ? 'voice-net-off' : ''}"
    data-action="voice-start"
    data-voice-target="${target}"
    title="${off ? 'الإدخال الصوتي يحتاج إنترنت مؤقتاً' : (active ? 'إيقاف الاستماع' : 'إدخال صوتي' + (voiceMicName ? ' · ' + voiceMicName : ''))}">
    ${active ? '<span class="mic-live"></span>' : micIcon()}
  </button>`;
}
/* شارة «أستمع…» أثناء التسجيل */
function voiceStatusChip() {
  if (!voiceActive) return '';
  const lbl = VOICE_TARGET_LABELS[voiceTarget] || 'إدخال';
  return `<div class="voice-chip"><span class="voice-chip-dot"></span> أستمع… <b>${escapeHtml(lbl)}</b> ${micIcon()}</div>`;
}

/* للتوافق مع استخدام renderVoiceBtn في شريط البحث */
function renderVoiceBtn() { return voiceMicBtn('search'); }

/* target: 'search' | 'delivery-name' | 'delivery-phone' | 'delivery-address' */
let voiceTarget = 'search';

function startVoice(target = 'search') {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return showToast('المتصفح لا يدعم الإدخال الصوتي', '⚠️');
  if (voiceOffline()) return showToast('الإدخال الصوتي يحتاج إنترنت مؤقتاً — كل شيء آخر يعمل دون اتصال', '📴');
  if (!voiceMicName) detectMicDevice();
  if (voiceRecog) { try { voiceRecog.stop(); } catch(e){} }

  voiceTarget = target;
  voiceRecog  = new SR();
  voiceRecog.lang            = 'ar';   /* فصحى قريبة — الأسماء والأرقام والمناطق */
  voiceRecog.interimResults  = true;
  voiceRecog.continuous      = false;

  voiceRecog.onstart = () => { voiceActive = true; updateVoiceBtnState(); };
  voiceRecog.onend   = () => { voiceActive = false; updateVoiceBtnState(); };
  voiceRecog.onerror = (ev) => {
    voiceActive = false;
    updateVoiceBtnState();
    if (ev.error !== 'no-speech') showToast('خطأ في الإدخال الصوتي: ' + ev.error, '⚠️');
  };
  voiceRecog.onresult = (ev) => {
    let transcript = '';
    for (let i = ev.resultIndex; i < ev.results.length; i++) {
      transcript += ev.results[i][0].transcript;
    }
    applyVoiceTranscript(transcript);
  };

  voiceRecog.start();
}

function stopVoice() {
  try { voiceRecog?.stop(); } catch(e){}
  voiceActive = false;
  updateVoiceBtnState();
}

/* ── معالجة صوتية ذكية: أرقام منطوقة + مطابقة عملاء التوصيل ── */
const AR_DIGIT_WORDS = { 'صفر':0,'واحد':1,'اثنين':2,'اثنان':2,'تلاتة':3,'ثلاثة':3,'اربعة':4,'أربعة':4,'خمسة':5,'ستة':6,'سنة':6,'سبعة':7,'سبع':7,'ثمانية':8,'ثمنية':8,'تسعة':9,'تسع':9 };
function cleanPhoneVoice(text) {
  let out = '';
  String(text).split(/[\s،,.\-]+/).forEach(p => {
    const en = p.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
    if (/^\d+$/.test(en)) out += en;
    else if (AR_DIGIT_WORDS[p] != null) out += String(AR_DIGIT_WORDS[p]);
    else {
      const key = p.replace(/^و/, '');
      if (AR_DIGIT_WORDS[key] != null) out += String(AR_DIGIT_WORDS[key]);
    }
  });
  return out.replace(/\D/g, '');
}
function normAr(t) { return String(t || '').replace(/[أإآ]/g, 'ا'); }
function matchDeliveryCustomerByAddress(text) {
  const t = normAr(text);
  let best = null;
  (DATA.customers || []).forEach(c => {
    const words = normAr(c.address).split(/[\s،\-]+/).filter(w => w.replace(/[^\u0600-\u06FF]/g, '').length >= 4);
    if (words.some(w => t.includes(w))) best = c;
  });
  return best;
}
function matchDeliveryCustomerByPhone(digits) {
  if (!digits || digits.length < 7) return null;
  const tail = digits.slice(-7);
  return (DATA.customers || []).find(c => String(c.phone || '').endsWith(tail)) || null;
}

/* تطبيق النص الصوتي على الحقل المستهدف */
function applyVoiceTranscript(text) {
  if (voiceTarget === 'search') {
    searchTerm       = text;
    searchOpen       = true;
    activeCategoryId = null;
    activeFamily     = null;
    updateSearchResultsOnly();
    const inp = document.getElementById('posSearchInput');
    if (inp) inp.value = text;

  } else if (voiceTarget === 'delivery-name') {
    deliveryInfo.name = text;
    const el = document.querySelector('[data-field="name"]');
    if (el) el.value = text;

  } else if (voiceTarget === 'delivery-phone') {
    /* أرقام منطوقة أو مكتوبة + مطابقة عميل موجود */
    const digits = cleanPhoneVoice(text);
    deliveryInfo.phone = digits;
    const el = document.querySelector('[data-field="phone"]');
    if (el) el.value = digits;
    const pm = matchDeliveryCustomerByPhone(digits);
    if (pm) {
      if (!deliveryInfo.name) { deliveryInfo.name = pm.name; const ne = document.querySelector('[data-field="name"]'); if (ne) ne.value = pm.name; }
      if (!deliveryInfo.address) { deliveryInfo.address = pm.address; const ae = document.querySelector('[data-field="address"]'); if (ae) ae.value = pm.address || ''; }
      showToast(`عميل معروف: ${pm.name} — مُلئت بياناته تلقائياً`, '🎧');
    }

  } else if (voiceTarget === 'delivery-address') {
    const cm = matchDeliveryCustomerByAddress(text);
    if (cm) {
      deliveryInfo.address = cm.address;
      if (!deliveryInfo.name) { deliveryInfo.name = cm.name; const ne = document.querySelector('[data-field="name"]'); if (ne) ne.value = cm.name; }
      if (!deliveryInfo.phone) { deliveryInfo.phone = cm.phone; const pe = document.querySelector('[data-field="phone"]'); if (pe) pe.value = cm.phone || ''; }
      showToast(`طابقنا العنوان مع العميل: ${cm.name}`, '🎧');
      renderPOS();
    } else {
      deliveryInfo.address = text;
      const el = document.querySelector('[data-field="address"]');
      if (el) el.value = text;
    }

  } else if (voiceTarget === 'note-modal') {
    const ta = document.getElementById('noteModalText');
    if (ta) {
      const cur = ta.value.trim();
      ta.value = cur ? cur + '، ' + text.trim() : text.trim();
      ta.focus();
    }
  } else if (voiceTarget === 'pad-note') {
    padBuf = (padBuf ? padBuf + ' ' : '') + text.trim();
    const pi = document.getElementById('dPadInput');
    if (pi) pi.value = padBuf;
  } else if (voiceTarget === 'def-name') {
    deferredName = text;
    const el = document.querySelector('[data-action="pay-def-name"]');
    if (el) el.value = text;

  } else if (voiceTarget === 'def-phone') {
    const digits = text.replace(/[^\d٠-٩]/g,'')
      .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
    deferredPhone = digits;
    const el = document.querySelector('[data-action="pay-def-phone"]');
    if (el) el.value = digits;

  } else if (voiceTarget === 'def-addr') {
    deferredAddr = text;
    const el = document.querySelector('[data-action="pay-def-addr"]');
    if (el) el.value = text;
  }
}

/* تحديث حالة أزرار المايك بدون إعادة رسم كاملة */
function updateVoiceBtnState() { updateVoiceUI(); }
function updateVoiceUI() {
  document.querySelectorAll('.voice-mic-btn').forEach(btn => {
    const t = btn.dataset.voiceTarget;
    const active = voiceActive && voiceTarget === t;
    const off = voiceOffline();
    btn.classList.toggle('voice-active', active);
    btn.classList.toggle('voice-net-off', off);
    btn.innerHTML = active ? '<span class="mic-live"></span>' : micIcon();
    btn.title = off ? 'الإدخال الصوتي يحتاج إنترنت مؤقتاً'
      : (active ? 'إيقاف الاستماع' : 'إدخال صوتي' + (voiceMicName ? ' · ' + voiceMicName : ''));
  });
  document.querySelectorAll('.voice-chip').forEach(c => c.remove());
  if (voiceActive) {
    const hosts = document.querySelector('.d-topbar') || document.querySelector('.pos-work-header');
    if (hosts) hosts.insertAdjacentHTML('beforeend', voiceStatusChip());
  }
}
window.addEventListener('online', updateVoiceUI);
window.addEventListener('offline', updateVoiceUI);
if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
  try { navigator.mediaDevices.addEventListener('devicechange', detectMicDevice); } catch (e) {}
}

/* ================================================================
   💳 قسم طريقة الدفع (فوق زر الطباعة)
   ================================================================ */
function renderPaySection() {
  const methods = [
    { id:'cash',     icon:'💵', label:'كاش'    },
    { id:'wallet',   icon:'📲', label:'محفظة'  },
    { id:'partial',  icon:'🔀', label:'جزئي'   },
    { id:'deferred', icon:'📒', label:'آجل'    },
  ];

  const btns = methods.map(m => `
    <button type="button"
      class="pay-method-btn ${payMethod===m.id?'pay-active':''}"
      data-action="pay-method" data-value="${m.id}">
      <span class="pay-icon">${m.icon}</span>
      <span class="pay-label">${m.label}</span>
    </button>`).join('');

  /* الحقول الإضافية حسب النوع */
  let extra = '';

  if (payMethod === 'wallet') {
    extra = `
      <div class="pay-extra">
        <label class="pay-extra-label">رقم عملية التحويل</label>
        <input type="text" inputmode="numeric"
          class="pay-extra-input"
          data-action="pay-wallet-ref"
          value="${escapeHtml(walletRef)}"
          placeholder="أدخل رقم العملية...">
      </div>`;

  } else if (payMethod === 'partial') {
    const total = cart.reduce((s,x)=>s+x.price*x.qty, 0);
    const paid  = Number(partialAmount) || 0;
    const rem   = total - paid;
    extra = `
      <div class="pay-extra">
        <label class="pay-extra-label">المبلغ المدفوع الآن</label>
        <input type="number" inputmode="numeric"
          class="pay-extra-input"
          data-action="pay-partial-amount"
          value="${escapeHtml(partialAmount)}"
          placeholder="أدخل المبلغ...">
        ${paid > 0 ? `<div class="pay-partial-rem ${rem>0?'rem-due':'rem-ok'}">
          ${rem>0 ? `المتبقي: ${fmtCur(rem)} ل.س` : `✅ المبلغ كافٍ`}
        </div>` : ''}
      </div>`;

  } else if (payMethod === 'deferred') {
    /* اختيار: عقد أو إدخال يدوي */
    const contracts = (window.DEMO_DATA.contracts||[]).filter(c=>c.status==='active');
    const modeBtns = `
      <div class="pay-deferred-modes">
        <button type="button"
          class="pay-def-mode-btn ${deferredMode==='contract'?'pay-def-active':''}"
          data-action="pay-deferred-mode" data-value="contract">📋 عقد</button>
        <button type="button"
          class="pay-def-mode-btn ${deferredMode==='manual'?'pay-def-active':''}"
          data-action="pay-deferred-mode" data-value="manual">✏️ بيانات يدوية</button>
      </div>`;

    if (deferredMode === 'contract') {
      const opts = contracts.map(c =>
        `<option value="${escapeHtml(c.id)}" ${selectedContractId===c.id?'selected':''}>
          ${escapeHtml(c.client_name)}${c.company?' — '+escapeHtml(c.company):''}
        </option>`).join('');
      extra = `<div class="pay-extra">
        ${modeBtns}
        <label class="pay-extra-label">اختر العقد</label>
        <select class="pay-extra-select" data-action="pay-deferred-contract">
          <option value="">— اختر عقداً —</option>${opts}
        </select>
        ${deferredCreditPanel()}
      </div>`;
    } else {
      extra = `<div class="pay-extra">
        ${modeBtns}
        <label class="pay-extra-label">بيانات العميل</label>
        <div class="pay-def-fields">
          <div class="delivery-field-row">
            <input type="text" class="pay-extra-input" data-action="pay-def-name"
              value="${escapeHtml(deferredName)}" placeholder="اسم العميل">
            ${voiceMicBtn('def-name')}
          </div>
          <div class="delivery-field-row">
            <input type="tel" inputmode="tel" class="pay-extra-input" data-action="pay-def-phone"
              value="${escapeHtml(deferredPhone)}" placeholder="رقم الهاتف">
            ${voiceMicBtn('def-phone')}
          </div>
          <div class="delivery-field-row">
            <input type="text" class="pay-extra-input" data-action="pay-def-addr"
              value="${escapeHtml(deferredAddr)}" placeholder="العنوان (اختياري)">
            ${voiceMicBtn('def-addr')}
          </div>
        </div>
      </div>`;
    }
  }

  return `
    <div class="pay-section">
      <div class="pay-section-title">💳 طريقة الدفع</div>
      <div class="pay-methods-row">${btns}</div>
      ${extra}
    </div>`;
}

function renderCalcModal(total) {
  if (!calcOpen) return '';
  const res = calcResult(total, calcPaid);
  return `
    <div class="calc-modal-scrim" data-action="close-calc"></div>
    <div class="calc-modal" role="dialog" aria-label="حاسبة الباقي">
      <div class="calc-modal-head">
        <strong>🧮 حاسبة الباقي</strong>
        <button type="button" data-action="close-calc">✕</button>
      </div>
      <div class="calc-total-row"><span>قيمة الفاتورة</span><strong>${fmt(total)}</strong></div>
      <input id="calcPaidInput" class="calc-paid-input" type="number" inputmode="numeric" value="${escapeHtml(calcPaid)}" placeholder="المبلغ المدفوع">
      <div id="calcResultBox" class="calc-result ${res.className}">${escapeHtml(res.text)}</div>
      <button class="calc-print-btn" type="button" data-action="calc-print">🖨️ طباعة الفاتورة</button>
    </div>
  `;
}

function calcResult(total, paidValue) {
  if (!paidValue) return { className: 'neutral', text: '0 ل.س' };
  const paid = Number(paidValue || 0) * (currencyNew ? 100 : 1); // الإدخال بعملة العرض الحالية
  const diff = paid - total;
  if (diff >= 0) return { className: 'change', text: `الباقي: ${fmt(diff)}` };
  return { className: 'due', text: `المتبقي: -${fmt(Math.abs(diff))}` };
}
function updateCalcResult() {
  const total = cart.reduce((s, x) => s + x.price * x.qty, 0) - discountParts().total;
  const res = calcResult(total, calcPaid);
  const box = document.getElementById('calcResultBox');
  if (!box) return;
  box.className = `calc-result ${res.className}`;
  box.textContent = res.text;
}

function renderSelectionBar() {
  const cat = getActiveCategory();
  if (!cat && !activeFamily) return '';
  const parts = [];
  if (cat) parts.push(`<button type="button" data-action="go-level" data-level="category">${cat.icon} ${escapeHtml(cat.name)}</button>`);
  if (activeFamily) parts.push(`<button type="button" data-action="go-level" data-level="family">${escapeHtml(familyLabel(activeFamily))}</button>`);
  return `<div class="selection-bar"><button class="back-step-btn" type="button" data-action="back-step">‹ الرئيسية</button><div class="selection-pills">${parts.join('')}</div></div>`;
}

function renderMainCategoryGrid() {
  const cats = sellableCategories();
  return `<div class="single-stage"><div class="main-category-grid primary-only-grid">${cats.map(c => `<button class="main-category-card" type="button" data-action="category" data-value="${escapeHtml(c.id)}"><span>${c.icon}</span><strong>${escapeHtml(c.name)}</strong></button>`).join('')}<button class="main-category-card search-category-card" type="button" data-action="toggle-search"><span>🔎</span><strong>بحث</strong></button></div></div>`;
}

function renderButtonFlow(items) {
  const fams = activeCategoryId ? families() : [];

  // المطلوب: تصنيف رئيسي -> تصنيف فرعي -> الأصناف مباشرة
  if (!activeCategoryId) return renderMainCategoryGrid();
  if (!activeFamily) {
    return `${renderSelectionBar()}<div class="single-stage"><div class="family-grid no-horizontal-scroll">${fams.map(f => `<button class="family-card" type="button" data-action="family" data-value="${escapeHtml(f)}">${escapeHtml(familyLabel(f))}</button>`).join('')}</div></div>`;
  }
  return `${renderSelectionBar()}<div class="item-grid final-items-grid">${renderItemButtons(items)}</div>`;
}

/* ── النمط الثالث: «مباشر» ──
   التصنيفات الرئيسية كأزرار كما في النمط الرئيسي،
   وعند اختيار تصنيف تظهر كل أصنافه مباشرة مقسّمة بعناوين فرعية — دون خطوة اختيار فرعي. */
function renderDirectFlow() {
  if (!activeCategoryId) return renderMainCategoryGrid();
  const all = catItems();
  const fams = uniq(all.map(i => i.family));
  return `${renderSelectionBar()}<div class="direct-flow">${fams.map(f => `
    <section class="direct-family">
      <h3 class="direct-family-title">${escapeHtml(familyLabel(f))}</h3>
      <div class="item-grid final-items-grid direct-items-grid">${renderItemButtons(all.filter(i => i.family === f))}</div>
    </section>`).join('')}
  </div>`;
}

function renderDropdownFlow(items) {
  const cats = sellableCategories();
  const fams = activeCategoryId ? families() : [];
  return `
    <div class="dynamic-picker-card compact-picker">
      <div class="dynamic-grid two-level-grid">
        <label><span>الرئيسي</span><select data-action="select-category"><option value="">اختر...</option>${cats.map(c => `<option value="${escapeHtml(c.id)}" ${activeCategoryId===c.id?'selected':''}>${escapeHtml(c.icon+' '+c.name)}</option>`).join('')}</select></label>
        <label><span>الفرعي</span><select data-action="select-family" ${!activeCategoryId?'disabled':''}><option value="">اختر...</option>${fams.map(f => `<option value="${escapeHtml(f)}" ${activeFamily===f?'selected':''}>${escapeHtml(familyLabel(f))}</option>`).join('')}</select></label>
      </div>
    </div>
    ${activeFamily ? `<div class="item-grid final-items-grid">${renderItemButtons(items)}</div>` : `<div class="guide-box">اختر التصنيف ثم الفرعي لإظهار الأصناف.</div>`}
  `;
}

function renderSearchArea(items) {
  return `<div class="search-area"><div class="selection-bar search-selection-bar"><button class="back-step-btn" type="button" data-action="clear-search">‹ الرئيسية</button><input class="pos-search-input always-search" id="posSearchInput" type="search" dir="rtl" lang="ar" autocomplete="off" value="${escapeHtml(searchTerm)}" placeholder="ابحث عن صنف...">${renderVoiceBtn()}<button class="clear-search-btn inline-clear" type="button" data-action="clear-search-text">×</button></div><div id="searchResultsBox">${renderSearchResultsContent(items)}</div></div>`;
}

function renderSearchResultsContent(items) {
  return searchTerm.trim()
    ? `<div class="item-grid final-items-grid">${renderItemButtons(items)}</div>`
    : `<div class="guide-box search-guide">اكتب اسم الصنف للبحث السريع</div>`;
}
function renderSearchResults(items) { return renderSearchArea(items); }
function renderItemButtons(items) {
  if (!items.length) return `<div class="empty-items">لا توجد أصناف ضمن هذا الاختيار</div>`;
  return items.map(item => {
    const inCart = cart.find(c => c.id === item.id);
    const drule = itemDiscRule(item.id);
    const priceHtml = drule ? `<div class="item-price"><s>${fmtCur(item.price)}</s> <b>${fmtCur(itemNet(item))}</b></div>` : `<div class="item-price">${fmtCur(item.price)}</div>`;
    const parts = itemButtonParts(item);
    const nameHtml = parts.sub
      ? `<span class="item-name-main">${escapeHtml(parts.head)}</span><span class="item-name-sub">${escapeHtml(parts.sub)}</span>`
      : `<span class="item-name-main">${escapeHtml(parts.head)}</span>`;
    return `<button class="item-btn" type="button" data-action="open-qty" data-id="${item.id}">${inCart ? `<span class="item-qty-badge">${inCart.qty}</span>` : ''}${drule ? `<span class="item-disc-badge" title="خصم ${fmtNum(drule.pct)}%">−${fmtNum(drule.pct)}%</span>` : ''}<div class="item-name">${nameHtml}</div>${priceHtml}</button>`;
  }).join('');
}

function renderQtyModal() {
  if (!pendingItemId) return '';
  const item = DATA.items.find(i => i.id === pendingItemId);
  if (!item) return '';
  const nums = Array.from({length:25}, (_,i)=>i+1);
  return `
    <div class="qty-modal-scrim" data-action="close-qty"></div>
    <div class="qty-modal" role="dialog" aria-label="تحديد الكمية">
      <div class="qty-modal-head">
        <div>
          <strong>${escapeHtml(itemButtonTitle(item))}</strong>
          <span>${fmtCur(item.price)} ل.س للواحدة</span>
        </div>
        <button type="button" data-action="close-qty">✕</button>
      </div>
      <div class="qty-number-grid">
        ${nums.map(n => `<button type="button" data-action="qty-pick" data-value="${n}">${n}</button>`).join('')}
      </div>
      <div class="qty-custom-row">
        <input id="customQtyInput" type="number" inputmode="numeric" min="26" placeholder="كمية أكبر من 25">
        <button type="button" data-action="qty-custom">إضافة</button>
      </div>
    </div>
  `;
}

function openQtyModal(id) {
  const lockedRow = cart.find(c => c.id === id && c.locked);
  if (lockedRow) return showToast('🔒 العرض ثابت — يمكن الإضافة عليه فقط','⚠️');
  document.activeElement?.blur?.();
  pendingItemId = id;
  renderPOS();
}
function closeQtyModal() {
  pendingItemId = null;
  renderPOS();
}
function confirmQty(qty) {
  if (!pendingItemId || !qty || qty <= 0) return;
  addToCart(pendingItemId, qty);
  pendingItemId = null;
  renderPOS();
}
function confirmCustomQty() {
  const input = document.getElementById('customQtyInput');
  const qty = Number(input?.value || 0);
  if (!qty || qty <= 0) return showToast('أدخل كمية صحيحة', '⚠️');
  confirmQty(qty);
}

function renderNoteModal() {
  if (!pendingNoteItemId) return '';
  const row = cart.find(c => c.id === pendingNoteItemId);
  if (!row) return '';
  const current = String(row.note || '');
  return `
    <div class="note-modal-scrim" data-action="close-note"></div>
    <div class="note-modal" role="dialog" aria-label="ملاحظات الصنف">
      <div class="note-modal-head">
        <div>
          <strong>${escapeHtml(row.name)}</strong>
          <span>اختر ملاحظة أو أكثر — أو قلها بصوتك</span>
        </div>
        <div class="note-head-tools">
          ${voiceMicBtn('note-modal', true)}
          <button type="button" data-action="close-note">✕</button>
        </div>
      </div>
      <div class="note-suggestions-grid">
        ${NOTE_SUGGESTIONS.map(n => `<button type="button" class="note-suggestion ${noteHas(current,n) ? 'selected' : ''}" data-action="note-toggle" data-value="${escapeHtml(n)}">${escapeHtml(n)}</button>`).join('')}
      </div>
      <textarea id="noteModalText" class="note-modal-text" placeholder="أو اكتب ملاحظة خاصة...">${escapeHtml(current)}</textarea>
      <button class="note-save-btn" type="button" data-action="note-save">حفظ الملاحظات</button>
    </div>
  `;
}
function noteParts(text) {
  return String(text || '').split('،').map(x => x.trim()).filter(Boolean);
}
function noteHas(text, note) {
  return noteParts(text).includes(note);
}
function openNoteModal(id) {
  const lr = cart.find(c => c.id === id && c.locked);
  if (lr) return showToast('🔒 لا ملاحظات على العرض — أضف أصنافاً عادية إن أردت','⚠️');
  pendingNoteItemId = id;
  renderPOS();
}
function closeNoteModal() {
  pendingNoteItemId = null;
  renderPOS();
}
function toggleNoteSuggestion(note) {
  const row = cart.find(c => c.id === pendingNoteItemId);
  if (!row) return;
  let parts = noteParts(row.note);
  if (parts.includes(note)) parts = parts.filter(x => x !== note);
  else parts.push(note);
  row.note = parts.join('، ');
  renderPOS();
}
function saveNoteModal() {
  const row = cart.find(c => c.id === pendingNoteItemId);
  if (row) row.note = document.getElementById('noteModalText')?.value.trim() || '';
  pendingNoteItemId = null;
  renderPOS();
}

function renderCashierSideLinks() {
  return `
    <button class="side-link active" type="button"><span class="side-ic">🧾</span><span class="side-lb">فاتورة جديدة</span></button>
    <button class="side-link" type="button" data-action="invoices"><span class="side-ic">🧾</span><span class="side-lb">الفواتير</span></button>
    <button class="side-link" type="button" data-action="session"><span class="side-ic">🕘</span><span class="side-lb">الوردية والصندوق</span></button>
    <button class="side-link" type="button" data-action="kitchen"><span class="side-ic">🍳</span><span class="side-lb">شاشة المطبخ</span></button>
    <button class="side-link" type="button" data-action="queue"><span class="side-ic">🔔</span><span class="side-lb">شاشة النداء</span></button>
    <button class="side-link" type="button" data-action="tables"><span class="side-ic">🗺️</span><span class="side-lb">خريطة الطاولات</span></button>

    <button class="side-link ${displayMode !== 'buttons' ? 'active-soft' : ''}" type="button" data-action="toggle-mode"><span class="side-ic">🔁</span><span class="side-lb">النمط: ${posModeLabel()}</span></button>
    <button class="side-link ${currencyNew ? 'active-soft' : ''}" type="button" data-action="toggle-currency"><span class="side-ic">💱</span><span class="side-lb">${currencyNew ? 'عرض العملة القديمة' : 'عرض العملة الجديدة'}</span></button>
    <button class="side-link ${cardsVisible ? '' : 'active-soft'}" type="button" data-action="toggle-cards"><span class="side-ic">🎁</span><span class="side-lb">${cardsVisible ? 'إخفاء البطاقات' : 'إظهار البطاقات'}</span></button>
    <button class="side-link" type="button" data-action="customers"><span class="side-ic">👥</span><span class="side-lb">العملاء</span></button>
    <div class="side-spacer"></div><button class="side-link danger" type="button" data-action="logout"><span class="side-ic">🚪</span><span class="side-lb">خروج</span></button>`;
}
function renderMobileCashierLinks() {
  return `
    <button class="mobile-nav-link active" type="button" data-action="close-nav"><span>🧾</span><small>فاتورة جديدة</small></button>
    <button class="mobile-nav-link" type="button" data-action="invoices"><span>🧾</span><small>الفواتير</small></button>
    <button class="mobile-nav-link" type="button" data-action="session"><span>🕘</span><small>الوردية والصندوق</small></button>
    <button class="mobile-nav-link" type="button" data-action="kitchen"><span>🍳</span><small>المطبخ</small></button>
    <button class="mobile-nav-link" type="button" data-action="queue"><span>🔔</span><small>النداء</small></button>
    <button class="mobile-nav-link" type="button" data-action="tables"><span>🗺️</span><small>الطاولات</small></button>

    <button class="mobile-nav-link ${displayMode !== 'buttons' ? 'active' : ''}" type="button" data-action="toggle-mode"><span>🔁</span><small>النمط: ${posModeLabel()}</small></button>
    <button class="mobile-nav-link ${currencyNew ? 'active' : ''}" type="button" data-action="toggle-currency"><span>💱</span><small>${currencyNew ? 'العملة القديمة' : 'العملة الجديدة'}</small></button>
    <button class="mobile-nav-link" type="button" data-action="toggle-cards"><span>🎁</span><small>${cardsVisible ? 'إخفاء البطاقات' : 'إظهار البطاقات'}</small></button>
    <button class="mobile-nav-link" type="button" data-action="customers"><span>👥</span><small>العملاء</small></button>
    <button class="mobile-nav-link danger" type="button" data-action="logout"><span>🚪</span><small>خروج</small></button>`;
}

function bindPOSActions() {
  document.querySelectorAll('[data-action]').forEach(el => {
    const action = el.dataset.action;
    if (el.tagName === 'SELECT') el.addEventListener('change', () => handleAction(action, el.value, el));
    else if (el.tagName === 'TEXTAREA') {
      if (action === 'note-open') el.addEventListener('click', () => handleAction(action, el.value, el));
      else el.addEventListener('change', () => handleAction(action, el.value, el));
    }
    else if (el.tagName === 'INPUT') {
      const liveActions = ['delivery-field','pay-wallet-ref','pay-partial-amount','pay-def-name','pay-def-phone','pay-def-addr'];
      if (liveActions.includes(action)) el.addEventListener('input', () => handleAction(action, el.value, el));
      else el.addEventListener('input', () => handleAction(action, el.value, el));
    }
    else el.addEventListener('click', () => handleAction(action, el.dataset.value, el));
  });
  document.getElementById('posSearchInput')?.addEventListener('input', e => { searchTerm = e.target.value; updateSearchResultsOnly(); });
  document.getElementById('conSearchInput')?.addEventListener('input', e => { contractSearchTerm = e.target.value; updateContractList(); });
  document.getElementById('calcPaidInput')?.addEventListener('input', e => { calcPaid = e.target.value; updateCalcResult(); });
}

function findCustomerByPhone(phone) {
  const ph = String(phone || '').replace(/\D/g, '');
  if (ph.length < 5) return null;
  return (DATA.customers || []).find(c => {
    const cp = String(c.phone || '').replace(/\D/g, '');
    return cp && (cp === ph || cp.endsWith(ph) || ph.endsWith(cp));
  }) || null;
}
function autoFillDeferred(phone) {
  const c = findCustomerByPhone(phone);
  if (!c) return;
  deferredName = c.name || '';
  deferredPhone = c.phone || phone;
  deferredAddr = c.address || '';
  const nameEl = document.querySelector('[data-action="pay-def-name"]');
  const addrEl = document.querySelector('[data-action="pay-def-addr"]');
  if (nameEl) nameEl.value = deferredName;
  if (addrEl) addrEl.value = deferredAddr;
}
function autoFillPartial(phone) {
  const c = findCustomerByPhone(phone);
  if (!c) return;
  partialName = c.name || '';
  partialPhone = c.phone || phone;
  const nameEl = document.querySelector('[data-action="pay-partial-name"]');
  if (nameEl) nameEl.value = partialName;
}

function handleAction(action, value, el) {
  switch(action) {
    case 'toggle-nav': return toggleCashierNav();
    case 'close-nav': return closeCashierNav();
    case 'toggle-search': return toggleSearch();
    case 'clear-search': return clearSearch();
    case 'clear-search-text': searchTerm=''; return updateSearchInputAndResults();
    case 'toggle-mode': return toggleDisplayMode();
    case 'toggle-currency': return toggleCurrency();
    case 'toggle-cards': return toggleCardsVisible();
    case 'close-leave':  return closeLeaveModal();
    case 'confirm-leave': return confirmLeave();
    case 'toggle-cards-drawer': return toggleCardsDrawer();
    case 'order-offer': return orderOffer(value);
    case 'order-offer-modal': orderOffer(value); return;
    case 'open-popular-modal': return openPopularModal();
    case 'open-offers-modal': return openOffersModal();
    case 'close-cards-modal': return closeCardsModal();
    case 'cards-modal-tab': cardsModalTab = value; return renderPOS();
    case 'order-type':
      orderType = value;
      if (value !== 'contract') { selectedContractId = null; contractSearchTerm = ''; }
      if (displayMode === 'direct') {
        if (value === 'dinein') directAuxModal = 'hall';
        else if (value === 'delivery') directAuxModal = 'delivery';
        else if (value === 'contract') directAuxModal = 'contract';
        else directAuxModal = null;
      }
      return renderPOS();
    case 'hall':
      selectedHall = value;
      if (displayMode === 'direct') directAuxModal = null;
      return renderPOS();
    case 'close-direct-aux':
      directAuxModal = null;
      return renderPOS();
    case 'open-direct-disc':
      directAuxModal = 'discount';
      return renderPOS();
    case 'set-inv-disc': {
      const raw = (value === '' || value == null)
        ? (document.getElementById('dAuxDisc') && document.getElementById('dAuxDisc').value)
        : value;
      const pct = Math.max(0, Math.min(100, Number(raw)));
      discSettings().invoice_pct = Number.isFinite(pct) ? pct : 0;
      if (displayMode === 'direct') directAuxModal = null;
      return renderPOS();
    }
    case 'delivery-field': deliveryInfo[el.dataset.field] = el.value; return;
    case 'open-calc': calcOpen = true; return renderPOS();
    case 'close-calc': calcOpen = false; calcPaid = ''; return renderPOS();
    case 'category': return selectMainCategory(value);
    case 'family': return selectFamily(value);
    case 'select-category': return selectMainCategory(value);
    case 'select-family': return selectFamily(value);
    case 'open-qty': return openQtyModal(el.dataset.id);
    case 'remove-item': return removeFromCart(el.dataset.id);
    case 'note-open': return openNoteModal(el.dataset.id);
    case 'note-toggle': return toggleNoteSuggestion(value);
    case 'note-save': return saveNoteModal();
    case 'close-note': return closeNoteModal();
    case 'note': return updateItemNote(el.dataset.id, el.value);
    case 'qty-pick': return confirmQty(Number(value));
    case 'qty-custom': return confirmCustomQty();
    case 'close-qty': return closeQtyModal();
    case 'qty': return changeQty(el.dataset.id, Number(el.dataset.delta));
    case 'clear-cart': return clearCart();
    case 'hold-order':   return holdCurrentOrder();
    case 'resume-held':  return resumeHeld(value);
    case 'submit-order': return submitOrder();
    case 'calc-print': return submitOrder();
    case 'logout': return backToLogin();
    case 'customers': return guardLeave('customers.html');
    case 'invoices':      return openPosScreen('invoices.html', 'الفواتير');
    case 'open-invoices': return openPosScreen('invoices.html', 'الفواتير');
    case 'edit-invoice':  return window.location.href = 'invoices.html';
    case 'session': return guardLeave('cashier_session.html');
    case 'kitchen': return openPosScreen('kitchen.html', 'شاشة المطبخ');
    case 'queue':   return openPosScreen('queue.html', 'شاشة النداء');
    case 'tables':  return openPosScreen('tables.html', 'خريطة الطاولات');
    case 'online-orders': return openPosScreen('online_orders.html', 'الطلبات الأونلاين');
    case 'delivery-screen': return openPosScreen('delivery.html', 'شاشة التوصيل');
    case 'close-pos-embed': return closePosEmbed();
    case 'placeholder': closeCashierNav(); return showToast(`سنضيف ${el.dataset.msg} لاحقًا`, el.dataset.icon || 'ℹ️');
    case 'back-step': return backStep();
    case 'd-select-row': directSelectedId = el.dataset.id; return openNoteModal(el.dataset.id);
    case 'd-del-row': {
      const row = cart.find(c => c.id === directSelectedId);
      if (!row) return showToast('اختر الصف المطلوب حذفه من الجدول', '⚠️');
      return removeFromCart(row.id);
    }
    case 'd-pad-mode': padMode = value; padBuf = ''; return renderPOS();
    case 'd-pad-key':  return dPadKey(value);
    case 'd-pad-apply': return dPadApply();
    case 'd-note-chip': return dNoteChip(value);
    case 'go-level': return goLevel(el.dataset.level);
    /* ── العقود ── */
    case 'contract-pick':    return pickContract(el.dataset.id);
    case 'contract-clear':   selectedContractId = null; contractSearchTerm = ''; return renderPOS();
    case 'contract-search':  contractSearchTerm = el.value; return updateContractList();
    case 'contract-search-clear': contractSearchTerm = ''; return renderPOS();
    case 'contract-add-item': return contractAddItem(el);
    /* ── طريقة الدفع ── */
    case 'pay-method':
      payMethod = value;
      if (value !== 'deferred') { deferredName=''; deferredPhone=''; deferredAddr=''; }
      return renderPOS();
    case 'pay-wallet-ref':       walletRef = el.value; return;
    case 'pay-partial-amount':   partialAmount = el.value; updatePayPartialDisplay(); return;
    case 'pay-deferred-mode':    deferredMode = value; return renderPOS();
    case 'pay-deferred-contract': selectedContractId = el.value; return renderPOS();
    case 'pay-def-name':         deferredName  = el.value; return;
    case 'pay-def-phone':        deferredPhone = el.value; autoFillDeferred(el.value); return;
    case 'pay-def-addr':         deferredAddr  = el.value; return;
    /* ── الإدخال الصوتي ── */
    case 'voice-toggle': return voiceActive ? stopVoice() : startVoice('search');
    case 'voice-start':
      if (voiceActive && voiceTarget === el.dataset.voiceTarget) return stopVoice();
      return startVoice(el.dataset.voiceTarget);
  }
}

function updateSearchResultsOnly() {
  const box = document.getElementById('searchResultsBox');
  if (!box) return;
  box.innerHTML = renderSearchResultsContent(finalItems());
  // نعيد ربط أزرار الأصناف الناتجة فقط بدون إعادة رسم حقل البحث، حتى لا تختفي لوحة المفاتيح
  box.querySelectorAll('[data-action]').forEach(el => {
    el.addEventListener('click', () => handleAction(el.dataset.action, el.dataset.value, el));
  });
}
function updateSearchInputAndResults() {
  const input = document.getElementById('posSearchInput');
  if (input) input.value = '';
  updateSearchResultsOnly();
  input?.focus();
}

function toggleCashierNav(){ document.getElementById('cashierSidebar')?.classList.toggle('expanded'); document.getElementById('mobileCashierNav')?.classList.toggle('expanded'); document.getElementById('mobileNavScrim')?.classList.toggle('show'); }
function closeCashierNav(){ document.getElementById('cashierSidebar')?.classList.remove('expanded'); document.getElementById('mobileCashierNav')?.classList.remove('expanded'); document.getElementById('mobileNavScrim')?.classList.remove('show'); }
function toggleDisplayMode(){
  const idx = POS_MODES.findIndex(m => m.id === displayMode);
  displayMode = POS_MODES[(idx + 1) % POS_MODES.length].id;
  try { localStorage.setItem('alfaprosys_pos_mode', displayMode); } catch (e) {}
  closeCashierNav(); renderPOS();
}
function toggleSearch(){ searchOpen = !searchOpen; if(!searchOpen) searchTerm=''; renderPOS(); }
function clearSearch(){ searchTerm=''; searchOpen=false; activeCategoryId=null; activeFamily=null; renderPOS(); }
function selectMainCategory(id){
  activeCategoryId=id||null;
  activeFamily=null;
  searchTerm='';
  if (activeCategoryId) {
    const fams = families();
    if (fams.length === 1) activeFamily = fams[0];
  }
  renderPOS();
}
function selectFamily(f){ activeFamily=f||null; renderPOS(); }
function backStep(){
  activeCategoryId = null;
  activeFamily = null;
  searchTerm = '';
  renderPOS();
}
function goLevel(level){
  if (level === 'category') activeFamily=null;
  renderPOS();
}
function addToCart(id, qty=1){ const item=DATA.items.find(i=>i.id===id); if(!item) return; const ex=cart.find(c=>c.id===id && !c.locked); if(ex) ex.qty += qty; else cart.push({id:item.id,name:item.name,price:item.price,qty,note:''}); renderPOS(); }
function removeFromCart(id){
  const row = cart.find(c=>c.id===id);
  if (row && row.locked) { cart = cart.filter(c => c.offer_id !== row.offer_id); showToast('أُلغي العرض كاملاً','🚫'); return renderPOS(); }
  cart=cart.filter(c=>c.id!==id); if(pendingNoteItemId===id) pendingNoteItemId=null; renderPOS();
}
function updateItemNote(id,note){ const row=cart.find(c=>c.id===id); if(row && !row.locked) row.note=note; }
function changeQty(id,d){ const row=cart.find(c=>c.id===id); if(!row) return; if(row.locked) return showToast('🔒 العرض ثابت — يمكن الإضافة عليه فقط','⚠️'); row.qty+=d; if(row.qty<=0) cart=cart.filter(c=>c.id!==id); renderPOS(); }
function clearCart(){ cart=[]; renderPOS(); }
function requireShiftOn(){ return localStorage.getItem('alfaprosys_require_shift') === '1'; }
function shiftClosedBlocked(){ return requireShiftOn() && !(DATA.cashierSession && DATA.cashierSession.shift_open); }
function shiftBanner(){
  if (!shiftClosedBlocked()) return '';
  return `<div class="shift-block-banner">🚫 <b>الوردية مغلقة — البيع موقوف</b> <a href="cashier_session.html">فتح الوردية الآن ↩</a></div>`;
}

function submitOrder(){
  if(!cart.length){ showToast('السلة فارغة','⚠️'); return; }
  if (shiftClosedBlocked()) { showToast('ممنوع البيع — افتح الوردية أولاً', '🚫'); return; }
  const total = cart.reduce((s,x)=>s+x.price*x.qty,0);
  const dp    = discountParts();
  const disc  = dp.total;

  /* 🔴 تحذير سقف الذمة: آجل بعقد، أو طلب بنوع «عقد» */
  const _creditConId = (payMethod==='deferred' && deferredMode==='contract' && selectedContractId)
    || (orderType==='contract' && selectedContractId) || null;
  if (_creditConId) {
    const _ci = contractCreditInfo(_creditConId);
    const _cs = creditState(_ci, Math.max(0, total - disc));
    if (_cs && _cs.over) {
      const _wmsg = `🔴 تحذير: تجاوز سقف ذمة ${_ci.con.client_name} — الذمة ستصبح ${fmtCur(_cs.after)} والسقف ${fmtCur(_ci.limit)} ل.س`;
      setTimeout(() => showToast(_wmsg, '⚠️'), 1900);   /* بعد توست الفاتورة ليراه الكاشير */
    }
  }
  const now   = new Date();
  const invNo   = window.nextDailyNo ? nextDailyNo() : 1;
  const invDate = window.businessDay ? businessDay() : '';
  const inv = {
    id: window.nextInvoiceId ? nextInvoiceId() : (invDate + '-' + String(invNo).padStart(3, '0')),
    no: invNo,
    date: invDate,
    type: orderType,
    hall: orderType==='dinein' ? selectedHall : '',
    table_label: orderType==='dinein' ? selectedTable : '',
    customer_name: orderType==='delivery' ? deliveryInfo.name : '',
    phone: orderType==='delivery' ? deliveryInfo.phone : '',
    customer_address: orderType==='delivery' ? deliveryInfo.address : '',
    cashier: (DATA.cashierSession && DATA.cashierSession.cashier_name) || 'الكاشير',
    status: orderType === 'dinein' ? 'open' : 'printed',
    kitchen_status: 'new',
    stock_applied: true,
    pay_type: payMethod,
    discount: disc,
    discount_detail: {
      invoice_pct: invDiscPct(),
      items: cartDiscountLines().map(c => { const r = itemDiscRule(c.id); return { id: c.id, name: c.name, pct: r.pct, amount: Math.round(c.price*c.qty*r.pct/100) }; }),
    },
    total: Math.max(0, total - disc),
    time: now.toTimeString().slice(0,5),
    created_at: now.toISOString(),
    is_online: false,
    items: cart.map(c=>({
      id:c.id, name:c.name, qty:c.qty, price:c.price, total:c.price*c.qty, note:c.note||'',
      offer_id: c.offer_id || null,      // ربط كل بند بعرضه (فارغ للأصناف العادية)
      is_free:  !!c.is_free,             // المقدَّم مجاناً: يخصم مخزوناً بلا إيراد
      offer_disc: !!c.offer_disc,        // سطر خصم العرض (مالي فقط — لا يظهر للمطبخ)
    })),
  };
  if(orderType==='takeaway' || orderType==='delivery') inv.queue_no = invNo; // الدور = رقم الفاتورة نفسه
  DATA.invoices = [inv, ...(DATA.invoices||[])];
  if (window.InvoiceSync) InvoiceSync.pushSoon(inv);
  // ── إنشاء/تحديث العميل تلقائياً + ترحيل الذمم والدفعات ──
  if (inv.customer_name || inv.phone) {
    const ph = String(inv.phone || '').trim();
    let cust = ph ? (DATA.customers || []).find(c => String(c.phone || '').trim() === ph) : null;
    const invTotal = inv.total || 0;
    if (!cust && (inv.customer_name || ph)) {
      cust = {
        id: 'cus_' + String(Date.now()).slice(-8),
        name: inv.customer_name || '',
        phone: ph,
        whatsapp: ph,
        address: orderType === 'delivery' ? (deliveryInfo.address || '') : (payMethod === 'deferred' ? (deferredAddr || '') : ''),
        type: orderType === 'delivery' ? 'delivery' : 'regular',
        notes: '',
        credit_limit: 0,
        credit_balance: 0,
        next_due_date: '',
        payments: [],
      };
      DATA.customers = [cust, ...(DATA.customers || [])];
      inv.is_new_customer = true;
    }
    if (cust) {
      const today = inv.date || new Date().toISOString().slice(0, 10);
      cust.payments = cust.payments || [];
      cust.credit_balance = Number(cust.credit_balance) || 0;
      if (payMethod === 'deferred' && invTotal > 0) {
        cust.credit_balance += invTotal;
        cust.payments.unshift({
          id: 'pay_' + String(Date.now()).slice(-6),
          date: today, amount: -invTotal, invoice_total: invTotal,
          note: 'فاتورة آجل #' + inv.id, invoice_id: inv.id, type: 'deferred',
        });
        if (!cust.next_due_date) {
          const due = new Date(); due.setDate(due.getDate() + 30);
          cust.next_due_date = due.toISOString().slice(0, 10);
        }
      }
      if (payMethod === 'partial' && invTotal > 0) {
        const paid = Number(partialAmount) || 0;
        const remaining = Math.max(0, invTotal - paid);
        if (paid > 0) {
          cust.payments.unshift({
            id: 'pay_' + String(Date.now()).slice(-6),
            date: today, amount: paid, invoice_total: invTotal,
            note: 'دفعة جزئية — فاتورة #' + inv.id, invoice_id: inv.id, type: 'partial',
          });
        }
        if (remaining > 0) {
          cust.credit_balance += remaining;
          if (!cust.next_due_date) {
            const due = new Date(); due.setDate(due.getDate() + 15);
            cust.next_due_date = due.toISOString().slice(0, 10);
          }
        }
      }
      if (window.AlfaDB && AlfaDB.upsert) AlfaDB.upsert('customers', cust);
      if (window.CustomerSync) CustomerSync.pushSoon();
    }
  }
  // ربط المخزون تلقائياً: خصم المكونات حسب الوصفة
  if (window.deductStockForSale) deductStockForSale(inv.items);
  const _lbl = window.padNo ? padNo(invNo) : String(invNo);
  showToast(orderType==='takeaway' || orderType==='delivery'
    ? `فاتورة ${_lbl} · دورك ${_lbl} → المطبخ`
    : `فاتورة ${_lbl} → المطبخ`,'🍳');
  cart=[]; renderPOS();
  // طباعة حرارية تلقائية (كاشير + مطبخ) — قابلة للإطفاء من config.js
  try {
    const _th = window.ALFA_CONFIG && window.ALFA_CONFIG.thermal || {};
    if (window.ThermalPrint && _th.autoAfterSale !== false) ThermalPrint.afterSale(inv);
  } catch (e) {}
}

/* ── تعليق / استئناف الطلبات ── */
function holdCurrentOrder(){
  if(!cart.length){ showToast('لا يوجد طلب لتعليقه','⚠️'); return; }
  heldOrders.push({ id:heldSeq++, at:new Date().toTimeString().slice(0,5), cart:cart.slice(), type:orderType });
  cart=[]; renderPOS();
  showToast('تم تعليق الطلب','⏸️');
}
function renderHeldPanel(){
  if(!heldOrders.length) return '';
  return `<div class="held-strip">${heldOrders.map(h=>`
    <button class="held-chip" type="button" data-action="resume-held" data-value="${h.id}">
      ⏸️ #${h.id} · ${h.cart.length} صنف · ${h.at}
    </button>`).join('')}</div>`;
}
function resumeHeld(id){
  const h = heldOrders.find(x=>x.id==id); if(!h) return;
  if(cart.length) holdCurrentOrder();   // علّق الحالي قبل الاستئناف
  cart = h.cart.slice();
  heldOrders = heldOrders.filter(x=>x.id!=id);
  renderPOS();
  showToast('تم استئناف الطلب','▶️');
}

/* ── الخصم ── */

/* ================================================================
   منطق العقود (إضافة جديدة)
   ================================================================ */
function pickContract(id) {
  selectedContractId = id;
  const con = (window.DEMO_DATA.contracts || []).find(c => c.id === id);
  if (!con) return renderPOS();
  /* أضف أصناف العقد إلى السلة تلقائياً بكمياتها */
  cart = [];
  (con.items || []).forEach(it => {
    cart.push({
      id:    it.item_id,
      name:  it.name,
      price: it.price,
      qty:   it.qty,
      note:  it.note || ''
    });
  });
  if (displayMode === 'direct') directAuxModal = null;
  renderPOS();
}

function contractAddItem(el) {
  const itemId = el.dataset.itemId;
  const name   = el.dataset.name;
  const price  = Number(el.dataset.price);
  const qty    = Number(el.dataset.qty) || 1;
  const ex = cart.find(c => c.id === itemId);
  if (ex) {
    ex.qty += qty;
  } else {
    cart.push({ id: itemId, name, price, qty, note: '' });
  }
  renderPOS();
}

function updatePayPartialDisplay() {
  const total = cart.reduce((s,x)=>s+x.price*x.qty,0);
  const paid  = (Number(partialAmount) || 0) * (currencyNew ? 100 : 1); // إدخال بعملة العرض
  const rem   = total - paid;
  let remEl = document.querySelector('.pay-partial-rem');
  if (!remEl && paid > 0) { renderPOS(); return; }
  if (!remEl) return;
  remEl.className = `pay-partial-rem ${rem>0?'rem-due':'rem-ok'}`;
  remEl.textContent = rem>0 ? `المتبقي: ${fmtCur(rem)} ل.س` : '✅ المبلغ كافٍ';
}

function updateContractList() {
  /* تحديث قائمة العقود فقط بدون إعادة رسم كاملة */
  const contracts = (window.DEMO_DATA.contracts || []).filter(c => c.status === 'active');
  const filtered  = contractSearchTerm.trim()
    ? contracts.filter(c =>
        `${c.client_name} ${c.company}`.toLowerCase().includes(contractSearchTerm.toLowerCase()))
    : contracts;

  const listEl = document.querySelector('.con-list');
  if (!listEl) return;

  listEl.innerHTML = filtered.map(c => `
    <button type="button"
      class="con-list-item ${c.id === selectedContractId ? 'selected' : ''}"
      data-action="contract-pick" data-id="${escapeHtml(c.id)}">
      <span class="con-list-icon">📋</span>
      <span class="con-list-info">
        <strong>${escapeHtml(c.client_name)}</strong>
        ${c.company ? `<small>${escapeHtml(c.company)}</small>` : ''}
      </span>
      <span class="con-list-type">${{ daily:'يومي', weekly:'أسبوعي', monthly:'شهري', custom:'مخصص' }[c.contract_type] || ''}</span>
    </button>`).join('') || `<div class="con-empty">لا نتائج</div>`;

  /* أعد ربط الأزرار */
  listEl.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => handleAction(btn.dataset.action, btn.dataset.value, btn));
  });
}

(window.alfaStart||function(fn){fn();})(function () {
  const _draftRestored = restoreDraft();
  try {
    const _p = new URLSearchParams(location.search);
    if (_p.get('table')) {
      orderType = 'dinein';
      if (_p.get('hall')) selectedHall = _p.get('hall');
      selectedTable = _p.get('table');
      setTimeout(() => showToast(`طلب جديد على ${selectedTable} — ${selectedHall}`, '🗺️'), 400);
    }
  } catch (err) {}
  if (_draftRestored) setTimeout(() => showToast('استُعيدت مسودة الفاتورة الأخيرة', '🔄'), 350);
  renderPOS();
  if (window.Notify) Notify.init();
  if (window.InvoiceSync && InvoiceSync.pull) {
    setInterval(function () {
      if (navigator.onLine === false) return;
      InvoiceSync.pull().catch(function () {});
      if (window.OnlineOrderSync && OnlineOrderSync.pull) OnlineOrderSync.pull().catch(function () {});
    }, 12000);
  }
});
