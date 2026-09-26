/* ================================================================
   online_orders.js — شاشة الطلبات الأونلاين الواردة — alfaprosys
   - تعرض الطلبات الواردة (محليًا الآن، ومن Google Sheet / DB لاحقًا).
   - عند القبول: تتحول لفاتورة مرقّمة ضمن تسلسل فواتير شاشة البيع.
   ================================================================ */

const DATA = window.DEMO_DATA;

const orders = () => DATA.online_orders || [];

/* ── الترقيم المشترك مع فواتير شاشة البيع (print_no مستمر بلا أصفار بادئة) ── */
function nextInvoiceRef(){
  const today = window.businessDay ? businessDay() : '';
  const no    = 0; // يُحجز مرة واحدة داخل acceptOrder، من قاعدة البيانات عند الاتصال أو محليًا عند انقطاعه
  const pad   = window.padNo        ? padNo(no)     : String(no);
  return { id: today + '-' + pad, no, date: today, label: pad };
}
function invoiceLabelOf(o){
  /* الرقم الظاهر = print_no المستمر بلا أصفار — نفس تسلسل فواتير الكاشير */
  if (o && window.displayInvoiceNo) {
    if (o.print_no != null && Number(o.print_no) > 0) return displayInvoiceNo(o.print_no, o);
    if (o.no != null) return displayInvoiceNo(o.no, o);
  }
  if (o && o.invoice_id && window.invoiceNo) return invoiceNo({ id: o.invoice_id, print_no: o.print_no, no: o.no });
  return (o && o.invoice_id) || '';
}

let tab = 'new';

function counts(){
  const o = orders();
  return {
    new:      o.filter(x=>x.status==='new').length,
    done:     o.filter(x=>x.status==='done').length,
    rejected: o.filter(x=>x.status==='rejected').length,
  };
}

function renderTabs(){
  const c = counts();
  document.getElementById('onlineTabs').innerHTML = `
    <button class="online-tab ${tab==='new'?'active':''}"      onclick="setOnlineTab('new')">🆕 جديدة <span class="cnt">${c.new}</span></button>
    <button class="online-tab ${tab==='done'?'active':''}"     onclick="setOnlineTab('done')">✅ منجزة <span class="cnt">${c.done}</span></button>
    <button class="online-tab ${tab==='rejected'?'active':''}" onclick="setOnlineTab('rejected')">🚫 مرفوضة <span class="cnt">${c.rejected}</span></button>
  `;
}

function renderCards(){
  const list = orders().filter(o=>o.status===tab);
  const box = document.getElementById('onlineCards');
  if(!list.length){
    box.innerHTML = `<div class="online-empty">${tab==='new' ? 'لا طلبات جديدة الآن 🔕' : 'لا عناصر هنا.'}</div>`;
    return;
  }
  box.innerHTML = list.map(o=>`
    <div class="online-card">
      <div class="online-card-head">
        <span class="online-oid">#${e(o.id)}</span>
        <span class="online-time">${e((o.created_at||'').slice(11,16) || '')}</span>
        ${o.invoice_id?`<span class="online-time">فاتورة: <b>${e(invoiceLabelOf(o))}</b></span>`:''}
        <span class="online-status ${o.status}">${o.status==='new'?'جديد':o.status==='done'?'منجز':'مرفوض'}</span>
      </div>
      <div class="online-cust">
        <b>👤 ${e(o.customer.name)}</b> · 📞 ${e(o.customer.phone)}<br>📍 ${e(o.customer.address)}
      </div>
      <div class="online-items">
        ${o.items.map(it=>`
          <div class="online-item">
            <span>${e(it.name)} × ${it.qty}${it.note?`<span class="online-item-note">📝 ${e(it.note)}</span>`:''}</span>
            <b>${fmtNum(it.price*it.qty)}</b>
          </div>`).join('')}
      </div>
      <div class="online-totals">
        <div class="online-tline"><span>المجموع</span><span>${fmtNum(o.subtotal)}</span></div>
        <div class="online-tline"><span>توصيل</span><span>${fmtNum(o.delivery_fee)}</span></div>
        ${o.discount?`<div class="online-tline"><span>خصم</span><span>-${fmtNum(o.discount)}</span></div>`:''}
        <div class="online-tline final"><span>الإجمالي (${o.payment==='cash'?'نقدي':'ذمة'})</span><span>${fmtNum(o.total)} ل.س</span></div>
      </div>
      ${o.status==='new' ? `
      <div class="online-actions">
        <button class="online-act accept" onclick="acceptOrder('${e(o.id)}','${e(o.date||'')}')">🖨️ قبول وطباعة فاتورة</button>
        <button class="online-act reject" onclick="rejectOrder('${e(o.id)}','${e(o.date||'')}')">رفض</button>
      </div>` : ''}
    </div>`).join('');
}

function renderAll(){ renderTabs(); renderCards(); updateSoundBtn(); }
function setOnlineTab(t){ tab=t; renderAll(); }

/* ── زر كتم/تشغيل الصوت ── */
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

/* ── حفظ التعديلات عبر Proxy (إسناد علوي) ── */
function commit(){ DATA.online_orders = orders().slice(); }

/* ── قبول طلب: يتحول لفاتورة ضمن التسلسل ── */
/* البحث عن الطلب: بالرقم + التاريخ — لأن الرقم يتكرر بين الأيام */
function findOrder(id, date){
  const list = orders();
  if (date) {
    const hit = list.find(x => String(x.id) === String(id) && String(x.date || '') === String(date));
    if (hit) return hit;
  }
  return list.find(x => String(x.id) === String(id));
}

async function acceptOrder(id, date){
  const o = findOrder(id, date); if(!o) return;
  if (o.status !== 'new') { showToast('هذا الطلب مُعالج مسبقاً', 'ℹ️'); renderAll(); return; }
  const ref = nextInvoiceRef();
  /* ══════════════════════════════════════════════════════════════
     الحجز أولاً — وقاعدة صارمة: لا رقم ⇒ لا فاتورة ولا قبول
     ──────────────────────────────────────────────────────────────
     كان القبول يكمل حتى لو فشل الحجز: يبقى ref.no فارغاً، فيبني
     nextInvoiceId رقماً من عدّاد هذا الجهاز وحده (١، ٢، ٣…) ويُصدر
     فاتورة برقم مُختلق — رقم سبق أن صدر اليوم على جهاز آخر، فيصطدم
     معرّف الفاتورة بالسحابة (409/400) فلا تُرفع، ويظهر الطلب كأنه
     «لم يتم». وشاشة البيع لا تفعل ذلك: ترفض البيع بلا رقم حقيقي.
     الآن الشاشتان تتصرّفان تصرّفاً واحداً: بلا رقم لا يُقبل الطلب.
     ══════════════════════════════════════════════════════════════ */
  const reserved = window.reserveInvoiceNo ? await window.reserveInvoiceNo() : null;
  const reservedNo = Number(reserved) || 0;
  if (!reservedNo) {
    try { showToast('تعذّر ترقيم الفاتورة — لا اتصال بالخادم ولا بخدمة الترقيم', '🚫'); } catch (e) {}
    return;   /* الطلب يبقى «جديد» — لا فاتورة برقم مُختلق */
  }
  ref.no = reservedNo;
  ref.id = window.nextInvoiceId ? window.nextInvoiceId(ref.no) : ref.date + '-' + (window.padNo ? window.padNo(ref.no) : String(ref.no).padStart(3, '0'));
  /* ترحيل الحالة فوراً محلياً — قبل أي سحب قد يعيد new */
  o.status = 'done';
  o.invoice_id = ref.id;
  o.no = ref.no;
  o.date = ref.date;
  o.print_no = ref.no;   /* نفس الرقم الموحد — لا حساب محلي */
  ref.label = window.displayInvoiceNo
    ? window.displayInvoiceNo(o.print_no, o)
    : String(Number(o.print_no || ref.no) || 0);
  commit();
  renderAll(); /* أخفِ الطلب من «جديدة» فوراً */
  if (window.Notify) try { Notify.check(true); } catch (e) {}

  const menu = DATA.items || [];
  const items = o.items.map(it => {
    const m = menu.find(x => x.name === it.name) || menu.find(x => x.id === it.id);
    return { id: (m && m.id) || it.id || '', name: it.name, qty: it.qty, price: it.price, total: it.price * it.qty, note: it.note || '' };
  });
  const now = new Date();
  const hh = String(now.getHours()).padStart(2,'0');
  const mm = String(now.getMinutes()).padStart(2,'0');
  const invoice = {
    id: ref.id,
    no: ref.no,
    print_no: o.print_no || ref.no,
    date: ref.date,
    queue_no: o.print_no || ref.no, /* الدور = رقم الطباعة الظاهر */
    type: 'delivery',
    customer_name: (o.customer && o.customer.name) || '',
    phone: (o.customer && o.customer.phone) || '',
    customer_address: (o.customer && o.customer.address) || '',
    cashier: 'أونلاين',
    status: 'printed',
    kitchen_status: 'new',
    stock_applied: true,
    pay_type: o.payment,
    total: o.total,
    time: hh + ':' + mm,
    is_online: true,
    source_order_id: o.id,
    online_order_id: o.id,
    items: items,
  };
  DATA.invoices = [invoice, ...(DATA.invoices||[])];
  if (window.Stock) try { Stock.deduct(items); } catch (e) {}
  if (window.InvoiceSync) try { InvoiceSync.pushSoon(invoice); } catch (e) {}

  try { if (window.alfaPersist) window.alfaPersist(); } catch (e) {}

  /* ══════════════════════════════════════════════════════════════
     الطباعة أولاً — قبل أي انتظار للشبكة
     ──────────────────────────────────────────────────────────────
     كان ترتيب المعالج: (١) انتظار رفع الطلب للسحابة، (٢) الطباعة.
     فإن تعطّل الرفع أو تأخّر (شبكة بطيئة/ردّ معلّق) لا تصل الطباعة
     أبداً — فيبدو طلب الأونلاين «لم يُطبع» بينما كل فاتورة من شاشة
     البيع تطبع فوراً لأنها لا تنتظر الشبكة إطلاقاً.
     الآن المساران واحد: ابدأ الطباعة فوراً، ثم ارفع الطلب بالتوازي.
     ══════════════════════════════════════════════════════════════ */
  const _inv = (DATA.invoices || []).find(i => i.id === ref.id) || (DATA.invoices || [])[0];
  showToast(`تم قبول الطلب وتحويله للفاتورة ${ref.label}`, '🧾');
  console.info('[قبول أونلاين] الفاتورة:', _inv && _inv.id,
               '· ملف الطباعة:', !!window.ThermalPrint,
               '· الطابعات:', window.ThermalPrint ? JSON.stringify(ThermalPrint.printers().resolved) : '—');
  const _printP = (window.ThermalPrint && _inv)
    ? Promise.resolve().then(() => ThermalPrint.afterSale(_inv)).catch(e => { console.error('[قبول أونلاين] فشل أمر الطباعة:', e); })
    : Promise.resolve().then(() => printReceipt(o, ref.label)).catch(() => {});

  /* ترحيل الحالة للسحابة — يجري بالتوازي ولا يحجب الطباعة */
  try {
    if (window.OnlineOrderSync) {
      if (OnlineOrderSync.pushSoon) await OnlineOrderSync.pushSoon(o);
      else if (OnlineOrderSync.pushOne) await OnlineOrderSync.pushOne(o);
    }
  } catch (e) {
    try { showToast('حُفظ القبول محلياً — سيُرفع عند عودة الاتصال', '⚠️'); } catch (err) {}
  }

  renderAll();
  if (window.Notify) try { Notify.check(true); } catch (e) {}
  try { await _printP; } catch (e) {}
}

async function rejectOrder(id, date){
  const o = findOrder(id, date); if(!o) return;
  if (o.status !== 'new') { showToast('هذا الطلب مُعالج مسبقاً', 'ℹ️'); renderAll(); return; }
  o.status = 'rejected';
  commit();
  renderAll();
  if (window.Notify) try { Notify.check(true); } catch (e) {}
  try {
    if (window.OnlineOrderSync) {
      if (OnlineOrderSync.pushSoon) await OnlineOrderSync.pushSoon(o);
      else if (OnlineOrderSync.pushOne) await OnlineOrderSync.pushOne(o);
    }
  } catch (e) {
    try { showToast('حُفظ الرفض محلياً — سيُرفع عند عودة الاتصال', '⚠️'); } catch (err) {}
  }
  try { if (window.alfaPersist) window.alfaPersist(); } catch (e) {}
  showToast('تم رفض الطلب', '🚫');
  renderAll();
  if (window.Notify) try { Notify.check(true); } catch (e) {}
}

/* ── إيصال حراري 72mm ── */
function printReceipt(o, invId){
  if (window.ThermalPrint) {
    const inv = (DATA.invoices || []).find(i => i.source_order_id === o.id) || (DATA.invoices || [])[0];
    if (inv) { try { ThermalPrint.print(inv); return; } catch (e) {} }
  }
  const box = document.getElementById('printable');
  box.innerHTML = `
    <h3>alfaprosys</h3>
    <div class="p-row"><span>فاتورة</span><b>${e(invId)}</b></div>
    <div class="p-row"><span>طلب</span><b>${e(o.id)}</b></div>
    <div>${e(o.customer.name)} · ${e(o.customer.phone)}</div>
    <div>${e(o.customer.address)}</div>
    <hr>
    ${o.items.map(it=>`<div class="p-row"><span>${it.qty}× ${e(it.name)}</span><span>${fmtNum(it.price*it.qty)}</span></div>`).join('')}
    <hr>
    <div class="p-row"><b>الإجمالي</b><b>${fmtNum(o.total)} ل.س</b></div>
  `;
  setTimeout(()=>window.print(), 100);
}

/* ── تحديث: من مصدر خارجي إن ضُبط، وإلا محلي ── */
async function refreshOrders(){
  /* الإعداد المحفوظ في قاعدة البيانات أولاً، ثم config.js كاحتياط
     — حتى لا يبقى الرابط مقفولاً داخل ملف الكود. */
  const cfg = (window.DATA && window.DATA.online_orders_cfg) || (window.ALFA_CONFIG||{}).onlineOrders || {};
  if(cfg.endpoint){
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const t = ctrl ? setTimeout(function () { try { ctrl.abort(); } catch (e) {} }, 15000) : null;
    try{
      const res = await fetch(cfg.endpoint, { headers:{ 'x-cashier-pin': cfg.pin||'' }, signal: ctrl ? ctrl.signal : undefined });
      const data = await res.json();
      if(Array.isArray(data.orders)){ DATA.online_orders = data.orders; }
      showToast('تم التحديث من المصدر الخارجي', '🔄');
    }catch(err){ showToast('تعذّر الاتصال بالمصدر الخارجي', '⚠️'); }finally{ if (t) clearTimeout(t); }
  } else if (window.AlfaSB && AlfaSB.enabled && AlfaSB.enabled()) {
    try {
      if (window.OnlineOrderSync && OnlineOrderSync.pull) {
        await OnlineOrderSync.pull();
        if (window.alfaPersist) window.alfaPersist();
        showToast('تم التحديث من قاعدة البيانات', '☁️');
      }
    } catch (err) { showToast('تعذّر جلب الطلبات من قاعدة البيانات', '⚠️'); }
  } else {
    showToast('لا يوجد اتصال بمصدر الطلبات', '⚠️');
  }
  renderAll();
  if (window.Notify) Notify.check(false);
}

/* ── طلب تجريبي وارد (للعرض في النسخة التجريبية) ── */
function demoIncoming(){
  const n = orders().length + 104;
  DATA.online_orders = [{
    id:'ON-'+n, created_at:new Date().toISOString().slice(0,19),
    customer:{name:'عميل تجريبي', phone:'09XXXXXXXX', address:'عنوان تجريبي'},
    items:[{name:'كوكتيل فواكه كبير', qty:1, price:15000, note:'بدون ثلج'}],
    subtotal:15000, delivery_fee:5000, discount:0, total:20000,
    payment:'cash', status:'new', source:'online',
  }, ...orders()];
  showToast('وصل طلب جديد (تجريبي)', '🔔');
  tab='new'; renderAll();
  if (window.Notify) Notify.check(false);
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
  /* تُتيح للنافذة الأم (نقطة البيع) حقن الطلبات الجاهزة وإعادة
     الرسم، لأن الإطار يعيد السحب من الصفر فيعرض صفراً لثوانٍ. */
  window.__ooRender = renderAll;
  if (window.Notify) Notify.init({ markSeenOnLoad: true });
  if (window.OnlineOrderSync && OnlineOrderSync.pull) {
    /* سحب فوري عند الفتح + كل نصف دقيقة (٣٠ ثانية) صامتاً.
       الجلب يدمج الحالات: المقبول/المرفوض لا يعود «جديداً». */
    function quietPull() {
      if (navigator.onLine === false) return Promise.resolve();
      return OnlineOrderSync.pull()
        .then(function () {
          renderAll();
          if (window.Notify) Notify.check(false);
          try { if (window.alfaPersist) window.alfaPersist(); } catch (e) {}
        })
        .catch(function () {});
    }
    quietPull();
    setInterval(quietPull, 30000);
  }
});
