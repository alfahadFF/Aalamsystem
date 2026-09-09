/* ================================================================
   online_orders.js — شاشة الطلبات الأونلاين الواردة — alfaprosys
   - تعرض الطلبات الواردة (محليًا الآن، ومن Google Sheet / DB لاحقًا).
   - عند القبول: تتحول لفاتورة مرقّمة ضمن تسلسل فواتير شاشة البيع.
   ================================================================ */

const DATA = window.DEMO_DATA;

const orders = () => DATA.online_orders || [];

/* ── الترقيم المشترك مع فواتير شاشة البيع (نظام الترقيم اليومي: 001 وتجدد 8 صباحاً) ── */
function nextInvoiceRef(){
  const today = window.businessDay ? businessDay() : '';
  const no    = window.nextDailyNo  ? nextDailyNo() : 1;
  const pad   = window.padNo        ? padNo(no)     : String(no);
  return { id: today + '-' + pad, no, date: today, label: pad };
}
function invoiceLabelOf(o){
  if (o && o.no != null && window.padNo) return padNo(o.no);
  if (o && o.invoice_id && window.invoiceNo) return invoiceNo({ id: o.invoice_id });
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
        <button class="online-act accept" onclick="acceptOrder('${e(o.id)}')">🖨️ قبول وطباعة فاتورة</button>
        <button class="online-act reject" onclick="rejectOrder('${e(o.id)}')">رفض</button>
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
function acceptOrder(id){
  const o = orders().find(x=>x.id===id); if(!o) return;
  const ref = nextInvoiceRef();
  o.status = 'done';
  o.invoice_id = ref.id;
  o.no = ref.no;
  o.date = ref.date;

  const menu = DATA.items || [];
  const items = o.items.map(it => {
    const m = menu.find(x => x.name === it.name) || menu.find(x => x.id === it.id);
    return { id: (m && m.id) || it.id || '', name: it.name, qty: it.qty, price: it.price, total: it.price * it.qty, note: it.note || '' };
  });
  const invoice = {
    id: ref.id,
    no: ref.no,
    date: ref.date,
    queue_no: ref.no, /* الدور = رقم الفاتورة نفسه */
    type: 'delivery',
    customer_name: o.customer.name,
    phone: o.customer.phone,
    customer_address: o.customer.address,
    cashier: 'أونلاين',
    status: 'printed',
    kitchen_status: 'new',
    stock_applied: true,
    pay_type: o.payment,
    total: o.total,
    time: (o.created_at||'').slice(11,16) || '',
    is_online: true,
    source_order_id: o.id,
    online_order_id: o.id,
    items: items,
  };
  DATA.invoices = [invoice, ...(DATA.invoices||[])];
  if (window.InvoiceSync) InvoiceSync.pushSoon(invoice);
  if (window.OnlineOrderSync) OnlineOrderSync.pushSoon(o);
  if (window.Stock) Stock.deduct(items);
  commit();
  const _inv = (DATA.invoices || [])[0];
  showToast(`تم قبول الطلب وتحويله للفاتورة ${ref.label}`, '🧾');
  if (window.ThermalPrint && _inv) { try { ThermalPrint.afterSale(_inv); } catch (e) {} }
  else printReceipt(o, ref.label);
  renderAll();
}

function rejectOrder(id){
  const o = orders().find(x=>x.id===id); if(!o) return;
  o.status = 'rejected';
  commit();
  if (window.OnlineOrderSync) OnlineOrderSync.pushSoon(o);
  showToast('تم رفض الطلب', '🚫');
  renderAll();
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
  const cfg = (window.ALFA_CONFIG||{}).onlineOrders || {};
  if(cfg.endpoint){
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const t = ctrl ? setTimeout(function () { try { ctrl.abort(); } catch (e) {} }, 15000) : null;
    try{
      const res = await fetch(cfg.endpoint, { headers:{ 'x-cashier-pin': cfg.pin||'' }, signal: ctrl ? ctrl.signal : undefined });
      const data = await res.json();
      if(Array.isArray(data.orders)){ DATA.online_orders = data.orders; }
      showToast('تم التحديث من المصدر الخارجي', '🔄');
    }catch(err){ showToast('تعذّر الاتصال بالمصدر الخارجي', '⚠️'); }finally{ if (t) clearTimeout(t); }
  } else {
    showToast('وضع تجريبي: لا مصدر خارجي مضبوط', '🧪');
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

(window.alfaStart||function(fn){fn();})(function () {
  renderAll();
  if (window.Notify) Notify.init({ markSeenOnLoad: true });
  if (window.OnlineOrderSync && OnlineOrderSync.pull) {
    setInterval(function () {
      if (navigator.onLine === false) return;
      OnlineOrderSync.pull().then(function () { renderAll(); if (window.Notify) Notify.check(false); }).catch(function () {});
    }, 8000);
  }
});
