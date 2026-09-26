/* ================================================================
   online_orders.js — شاشة فواتير الأونلاين الواردة — alfaprosys
   - المصدر التشغيلي هنا هو جدول الفواتير: invoices حيث is_online = true.
   - التريغر في قاعدة البيانات هو الذي ينشئ الفاتورة ويربطها بطلب الأونلاين.
   - هذه الشاشة لا تحجز رقماً ولا تنشئ فاتورة؛ تطبع الفاتورة الجاهزة فقط.
   ================================================================ */

const DATA = window.DEMO_DATA;

const orders = () => DATA.online_orders || [];
const invoices = () => DATA.invoices || [];

let tab = 'new';

function todayStr(){
  return window.businessDay ? businessDay() : new Date().toISOString().slice(0, 10);
}

function invNoLabel(inv){
  if (!inv) return '';
  if (window.invoiceNo) return invoiceNo(inv);
  if (window.displayInvoiceNo && Number(inv.print_no || inv.no) > 0) return displayInvoiceNo(inv.print_no || inv.no, inv);
  return String(inv.no || inv.id || '');
}

function isOnlineInvoice(inv){
  return !!(inv && (inv.is_online || inv.online_order_id || inv.source === 'online'));
}

function linkedOrder(inv){
  const list = orders();
  const oid = String((inv && (inv.online_order_id || inv.source_order_id)) || '');
  return list.find(o => String(o.invoice_id || '') === String(inv.id || '')) ||
         list.find(o => oid && String(o.id) === oid && (!inv.date || !o.date || String(o.date).slice(0,10) === String(inv.date).slice(0,10))) ||
         null;
}

function onlineRows(){
  const day = todayStr();
  return invoices()
    .filter(isOnlineInvoice)
    .filter(inv => String(inv.date || '').slice(0,10) === day)
    .map(inv => {
      const ord = linkedOrder(inv);
      const st = ord && ord.status === 'done' ? 'done' : 'new';
      return { inv, order: ord, status: st };
    })
    .sort((a,b) => String(b.inv.created_at || b.inv.id || '').localeCompare(String(a.inv.created_at || a.inv.id || '')));
}

function counts(){
  const rows = onlineRows();
  return {
    new: rows.filter(r => r.status === 'new').length,
    done: rows.filter(r => r.status === 'done').length,
  };
}

function renderTabs(){
  const c = counts();
  document.getElementById('onlineTabs').innerHTML = `
    <button class="online-tab ${tab==='new'?'active':''}" onclick="setOnlineTab('new')">🆕 جديدة <span class="cnt">${c.new}</span></button>
    <button class="online-tab ${tab==='done'?'active':''}" onclick="setOnlineTab('done')">🖨️ مطبوعة <span class="cnt">${c.done}</span></button>
  `;
}

function itemRows(inv){
  const items = inv.items || [];
  if (!items.length) return '<div class="online-item"><span>الأصناف لم تصل بعد — اضغط تحديث</span><b>—</b></div>';
  return items.map(it => `
    <div class="online-item">
      <span>${e(it.name)} × ${it.qty}${it.note?`<span class="online-item-note">📝 ${e(it.note)}</span>`:''}</span>
      <b>${fmtNum((Number(it.total) || (Number(it.price)||0) * (Number(it.qty)||0)))}</b>
    </div>`).join('');
}

function renderCards(){
  const list = onlineRows().filter(r => r.status === tab);
  const box = document.getElementById('onlineCards');
  if(!list.length){
    box.innerHTML = `<div class="online-empty">${tab==='new' ? 'لا فواتير أونلاين جديدة الآن 🔕' : 'لا عناصر هنا.'}</div>`;
    return;
  }
  box.innerHTML = list.map(r => {
    const inv = r.inv;
    const ord = r.order;
    const addr = inv.customer_address || inv.address || (ord && ord.customer && ord.customer.address) || '';
    const deliveryFee = Number(inv.service_delivery || (inv.discount_detail && inv.discount_detail.service_delivery) || 0);
    return `
    <div class="online-card">
      <div class="online-card-head">
        <span class="online-oid">فاتورة #${e(invNoLabel(inv))}</span>
        ${inv.online_order_id?`<span class="online-time">طلب: <b>${e(inv.online_order_id)}</b></span>`:''}
        <span class="online-time">${e(inv.time || '')}</span>
        <span class="online-status ${r.status}">${r.status==='new'?'جديد':'مطبوع'}</span>
      </div>
      <div class="online-cust">
        <b>👤 ${e(inv.customer_name || '')}</b> · 📞 ${e(inv.phone || '')}<br>📍 ${e(addr)}
      </div>
      <div class="online-items">${itemRows(inv)}</div>
      <div class="online-totals">
        ${deliveryFee?`<div class="online-tline"><span>توصيل</span><span>${fmtNum(deliveryFee)}</span></div>`:''}
        <div class="online-tline final"><span>الإجمالي (${inv.pay_type==='deferred'?'ذمة':'نقدي'})</span><span>${fmtNum(inv.total)} ل.س</span></div>
      </div>
      ${r.status==='new' ? `
      <div class="online-actions">
        <button class="online-act accept" onclick="printOnlineInvoice('${e(inv.id)}')">🖨️ طباعة الفاتورة</button>
      </div>` : ''}
    </div>`;
  }).join('');
}

function renderAll(){ renderTabs(); renderCards(); updateSoundBtn(); }
function setOnlineTab(t){ tab=t; renderAll(); }

function updateSoundBtn(){
  const b = document.getElementById('soundToggle');
  if(b) b.textContent = (window.Notify && Notify.isMuted()) ? '🔕 صامت' : '🔔 الصوت';
}
function toggleSound(){
  if(!window.Notify) return;
  Notify.setMuted(!Notify.isMuted());
  if(!Notify.isMuted()) Notify.ping();
  showToast(Notify.isMuted() ? 'تم كتم الصوت' : 'تم تشغيل الصوت', Notify.isMuted() ? '🔕' : '🔔');
  updateSoundBtn();
}

function commit(){ DATA.online_orders = orders().slice(); }

let onlinePrintBusy = false;

async function ensureOnlineDirectPrinter(){
  if (!window.ThermalPrint || !ThermalPrint.afterSale) return false;
  try {
    /* نفس فكرة شاشة البيع: تجهيز QZ قبل أمر الطباعة حتى لا يدخل مسار معاينة المتصفح. */
    if (ThermalPrint.isActive && ThermalPrint.isActive()) return true;
    if (ThermalPrint.warmup) await ThermalPrint.warmup();
    if (ThermalPrint.isActive && ThermalPrint.isActive()) return true;
    if (ThermalPrint.connect) await ThermalPrint.connect();
    return !!(ThermalPrint.isActive && ThermalPrint.isActive());
  } catch (e) {
    return !!(ThermalPrint.isActive && ThermalPrint.isActive());
  }
}

async function printOnlineInvoice(invId){
  if (onlinePrintBusy) return;
  const inv = invoices().find(i => String(i.id) === String(invId));
  if (!inv || !isOnlineInvoice(inv)) {
    showToast('لم تصل الفاتورة بعد — اضغط تحديث', '⚠️');
    return;
  }
  if (!window.ThermalPrint || !ThermalPrint.afterSale) {
    showToast('ملف الطباعة غير متاح', '⚠️');
    return;
  }

  onlinePrintBusy = true;
  try {
    const ord = linkedOrder(inv);

    /* نفس آلية البيع العادي حرفياً: استدعاء afterSale فقط، وهي تتولى الاتصال والطباعة. */
    try {
      const _th = window.ALFA_CONFIG && window.ALFA_CONFIG.thermal || {};
      if (window.ThermalPrint && _th.autoAfterSale !== false) ThermalPrint.afterSale(inv);
    } catch (e) { console.error('[طباعة أونلاين] فشل بدء أمر الطباعة:', e); }

    if (ord) {
      ord.status = 'done';
      ord.invoice_id = inv.id;
      ord.no = inv.no;
      ord.date = inv.date || ord.date;
      commit();
      renderAll();
      if (window.Notify) try { Notify.check(true); } catch (e) {}
      try {
        if (window.OnlineOrderSync) {
          if (OnlineOrderSync.pushSoon) await OnlineOrderSync.pushSoon(ord);
          else if (OnlineOrderSync.pushOne) await OnlineOrderSync.pushOne(ord);
        }
      } catch (e) {
        try { showToast('أُرسل أمر الطباعة — وستُحفظ الحالة عند عودة الاتصال', '⚠️'); } catch (err) {}
        return;
      }
    }

    showToast(`أُرسل أمر طباعة فاتورة الأونلاين ${invNoLabel(inv)}`, '🧾');
    renderAll();
  } finally {
    onlinePrintBusy = false;
  }
}

async function refreshOrders(){
  let ok = false;
  if (window.AlfaSB && AlfaSB.enabled && AlfaSB.enabled()) {
    try {
      if (window.InvoiceSync && InvoiceSync.pull) await InvoiceSync.pull();
      if (window.OnlineOrderSync && OnlineOrderSync.pull) await OnlineOrderSync.pull();
      try { if (window.alfaPersist) window.alfaPersist(); } catch (e) {}
      ok = true;
      showToast('تم تحديث فواتير الأونلاين', '☁️');
    } catch (err) {
      showToast('تعذّر جلب فواتير الأونلاين من قاعدة البيانات', '⚠️');
    }
  } else {
    showToast('لا يوجد اتصال بمصدر الطلبات', '⚠️');
  }
  renderAll();
  if (window.Notify) Notify.check(false);
  return ok;
}

function applyCloudPrintDesign(){
  try {
    const ip = (window.DEMO_DATA && DEMO_DATA.invoice_print_settings) || null;
    if (ip && window.alfaApplyInvoicePrint) window.alfaApplyInvoicePrint(ip);
  } catch (e) {}
}
if (typeof window !== 'undefined' && window.addEventListener) {
  window.addEventListener('alfa:cloud-ready', function () {
    applyCloudPrintDesign();
    try { renderAll(); } catch (e) {}
  });
}

(window.alfaStart||function(fn){fn();})(function () {
  applyCloudPrintDesign();
  renderAll();
  window.__ooRender = renderAll;
  if (window.Notify) Notify.init({ markSeenOnLoad: true });
  /* نفس شاشة البيع: تسخين الطباعة مبكراً حتى تكون الطباعة مباشرة وسريعة. */
  if (window.ThermalPrint && ThermalPrint.warmup) {
    setTimeout(function () { ThermalPrint.warmup().catch(function () {}); }, 1200);
  }

  function quietPull() {
    if (navigator.onLine === false) return Promise.resolve();
    const jobs = [];
    if (window.InvoiceSync && InvoiceSync.pull) jobs.push(InvoiceSync.pull().catch(function () { return null; }));
    if (window.OnlineOrderSync && OnlineOrderSync.pull) jobs.push(OnlineOrderSync.pull().catch(function () { return null; }));
    if (!jobs.length) return Promise.resolve();
    return Promise.all(jobs).then(function () {
      renderAll();
      if (window.Notify) Notify.check(false);
      try { if (window.alfaPersist) window.alfaPersist(); } catch (e) {}
    }).catch(function () {});
  }

  quietPull();
  setInterval(quietPull, 30000);
});
