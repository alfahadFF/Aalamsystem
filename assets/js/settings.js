/* ================================================================
   settings.js — إعدادات الإدارة — alfaprosys
   1) الخصم: نسب الفاتورة + خصومات الأصناف
   2) الأسعار والعملة: تحديث جماعي من سعر الدولار
   3) تصميم الفاتورة: مودال معاينة فورية — سحابة فقط (لا تكرار هوية/طباعة)
   4) قواعد البيع + إشعارات — السحابة أولاً
   ================================================================ */

const DATA = window.DEMO_DATA;

/* ── التنقل ── */
const MGR_NAV = window.AlfaNav.MGR_NAV;
const CURRENT = 'settings';
const navLink = window.AlfaNav.linker(CURRENT);
let navOpen = false;
function toggleNav(){
  navOpen = !navOpen;
  document.getElementById('mgrMobileNav')?.classList.toggle('expanded', navOpen);
  document.getElementById('mgrNavScrim')?.classList.toggle('show', navOpen);
}
function closeNav(){
  navOpen = false;
  document.getElementById('mgrMobileNav')?.classList.remove('expanded');
  document.getElementById('mgrNavScrim')?.classList.remove('show');
}
function buildNav(){
  document.getElementById('sideNav').innerHTML = MGR_NAV.map(n=>navLink(n,false)).join('');
  document.getElementById('mobileNavGrid').innerHTML = MGR_NAV.map(n=>navLink(n,true)).join('');
}

/* ================================================================
   1) الخصم
   ================================================================ */
function disc(){
  const d = DATA.discount_settings = DATA.discount_settings || {};
  if (d.invoice_pct == null) d.invoice_pct = 0;
  d.items = d.items || [];
  return d;
}
function commitDisc(){ DATA.discount_settings = JSON.parse(JSON.stringify(disc())); if (window.SettingsSync) SettingsSync.pushSoon(); }

function resetInvoiceSequenceAdmin(){
  if (document.getElementById('invoiceCycleModal')) return;
  const wrap=document.createElement('div'); wrap.id='invoiceCycleModal'; wrap.innerHTML=`<div class="set-modal-scrim show" style="z-index:1000"></div><div class="set-modal open" style="z-index:1001"><div class="set-modal-head"><strong>🔢 بدء دورة ترقيم جديدة</strong><button type="button" id="invoiceCycleClose">×</button></div><div class="set-modal-body"><p>سيبدأ الرقم الظاهر للفاتورة التالية من <b>1</b> (بلا أصفار بادئة).</p><p>لن تتغير الفواتير القديمة ولن تُحذف أي بيانات.</p><p style="color:#b45309;font-weight:800">يُطبَّق التسلسل المستمر على الكاشير والطلبات الأونلاين معاً.</p><div class="set-modal-actions"><button class="set-btn" id="invoiceCycleCancel">إلغاء</button><button class="set-btn primary" id="invoiceCycleConfirm">بدء الدورة</button></div></div></div>`; document.body.appendChild(wrap);
  const close=()=>wrap.remove();
  wrap.querySelector('#invoiceCycleClose').onclick=close; wrap.querySelector('#invoiceCycleCancel').onclick=close;
  wrap.querySelector('#invoiceCycleConfirm').onclick=async function(){ this.disabled=true; this.textContent='جارٍ البدء...'; try { await (window.resetInvoiceNumbering ? resetInvoiceNumbering() : Promise.reject(new Error('الدالة غير متاحة'))); close(); showToast('بدأت دورة ترقيم جديدة — الرقم التالي 1','✅'); } catch(e){ this.disabled=false; this.textContent='بدء الدورة'; showToast('تعذر بدء دورة الترقيم في قاعدة البيانات','⚠️'); } };
}
function renderDiscountSection(){
  const d = disc();
  const pct = Number(d.invoice_pct) || 0;
  document.getElementById('invPctInput').value = pct || '';
  document.getElementById('invPctHint').textContent = pct
    ? `سيُخصم ${fmtNum(pct)}% تلقائياً من كل فاتورة يصدرها الكاشير — دون أي تدخل منه`
    : 'لا خصم على الفواتير حالياً — أدخل نسبة واعتمدها لتُطبق على كل فاتورة تلقائياً';

  const pick = document.getElementById('discItemPick');
  pick.innerHTML = (DATA.items||[]).map(i => `<option value="${e(i.id)}">${e(i.name)} — ${fmtNum(i.price)} ل.س</option>`).join('');

  const rows = (d.items||[]).map(r => {
    const it = (DATA.items||[]).find(i => i.id === r.item_id);
    if (!it) return '';
    return `<div class="set-row"><strong>${e(it.name)}</strong><span class="set-row-pct">${fmtNum(r.pct)}%</span><button class="set-del" onclick="removeItemDiscount('${e(r.item_id)}')" title="حذف">🗑️</button></div>`;
  }).join('');
  document.getElementById('itemDiscountRows').innerHTML = rows || `<span class="set-empty">لا خصومات على أصناف بعد</span>`;
}

function saveInvPct(){
  const raw = document.getElementById('invPctInput').value;
  const v = raw === '' ? 0 : Number(raw);
  if (isNaN(v) || v < 0 || v > 99) return showToast('أدخل نسبة صحيحة بين 0 و 99', '⚠️');
  disc().invoice_pct = v;
  commitDisc();
  renderDiscountSection();
  showToast(v ? `سيُخصم ${fmtNum(v)}% تلقائياً من كل فاتورة` : 'أُلغي خصم الفواتير', v ? '💸' : '✅');
}
function addItemDiscount(){
  const id  = document.getElementById('discItemPick').value;
  const pct = Number(document.getElementById('discItemPct').value);
  if (!id)  return showToast('اختر صنفاً', '⚠️');
  if (!pct || pct < 1 || pct > 99) return showToast('أدخل نسبة صحيحة بين 1 و 99', '⚠️');
  const d = disc();
  d.items = (d.items||[]).filter(r => r.item_id !== id);
  d.items.push({ item_id: id, pct });
  commitDisc();
  document.getElementById('discItemPct').value = '';
  renderDiscountSection();
  const it = (DATA.items||[]).find(i => i.id === id);
  showToast(`خصم ${fmtNum(pct)}% على: ${it ? it.name : ''}`, '💸');
}
function removeItemDiscount(id){
  disc().items = (disc().items||[]).filter(r => r.item_id !== id);
  commitDisc(); renderDiscountSection();
  showToast('حُذف خصم الصنف', '🗑️');
}

/* ================================================================
   2) الأسعار والعملة — تحديث جماعي بنسبة تلقائية من سعر الدولار
   ================================================================ */
function ps(){ return DATA.price_settings = DATA.price_settings || { usd_rate: null, updated_at: null, last_change: null, round_step: 0 }; }
function commitPs(){ DATA.price_settings = JSON.parse(JSON.stringify(ps())); if (window.SettingsSync) SettingsSync.pushSoon(); }

let pendingChange = null; // { rate, pct, direction, manual }

/* 🎯 خطوة التقريب — داخل price_settings في السحابة (لا localStorage) */
function roundStepVal(){ return Number(document.getElementById('priceRoundStep')?.value || 0); }
function saveRoundStep(){
  const p = ps();
  p.round_step = roundStepVal();
  commitPs();
  showToast('حُفظ تقريب الأسعار في السحابة', '🎯');
}
function loadRoundStep(){
  const el = document.getElementById('priceRoundStep');
  if (!el) return;
  const cloud = Number((ps().round_step != null ? ps().round_step : 0)) || 0;
  el.value = String(cloud);
}
function roundPrice(v){
  const st = roundStepVal();
  if (!st) return Math.max(0, Math.round(v));
  let r = Math.round(v / st) * st;
  if (v > 0 && r === 0) r = st;
  return r;
}
function roundStepLabel(){ const st = roundStepVal(); return st ? `أقرب ${fmtNum(st)} ل.س` : 'بلا تقريب (ليرة صحيحة)'; }

function renderRateBox(){
  const p = ps();
  document.getElementById('rateNow').innerHTML = p.usd_rate
    ? `سعر الدولار المعتمد حالياً: <b>${fmtNum(p.usd_rate)} ل.س</b>${p.updated_at ? ` · آخر تحديث ${e(p.updated_at)}` : ''}${p.last_change ? ` · آخر تغيير جماعي: ${p.last_change.direction === 'up' ? 'رفع' : 'خفض'} ${fmtNum(p.last_change.pct)}%${p.last_change.step ? ` بتقريب أقرب ${fmtNum(p.last_change.step)}` : ''}` : ''}`
    : 'لم يُعتمد سعر دولار بعد — أدخل السعر الأول لتصبح قاعدة الحساب';
}

function onRateInput(){
  const box = document.getElementById('autoPctBox');
  const manual = document.getElementById('manualPct').checked;
  if (manual) { box.style.display = 'none'; return updatePreviewBtn(); }
  const oldRate = Number(ps().usd_rate) || 0;
  const newRate = Number(document.getElementById('newUsdRate').value) || 0;
  if (!newRate || newRate <= 0) { box.style.display = 'none'; pendingChange = null; return updatePreviewBtn(); }
  if (!oldRate) {
    pendingChange = { rate: newRate, pct: 0, direction: 'up', base: true };
    box.style.display = 'block';
    box.innerHTML = `<span class="tag tag-gold">أول سعر</span> سيُعتمد كقاعدة للحساب دون تغيير الأسعار الآن`;
    return updatePreviewBtn();
  }
  const pct = Math.abs(newRate - oldRate) / oldRate * 100;
  const direction = newRate >= oldRate ? 'up' : 'down';
  pendingChange = { rate: newRate, pct, direction };
  box.style.display = 'block';
  box.innerHTML = direction === 'up'
    ? `<span class="tag tag-clay">رفع تلقائي</span> ارتفاع الدولار من ${fmtNum(oldRate)} إلى ${fmtNum(newRate)} ← سيُرفع كل الأسعار <b>${pct.toFixed(1)}%</b>`
    : `<span class="tag tag-sage">خفض تلقائي</span> انخفاض الدولار من ${fmtNum(oldRate)} إلى ${fmtNum(newRate)} ← سيُخفَّض كل الأسعار <b>${pct.toFixed(1)}%</b>`;
  updatePreviewBtn();
}

function onManualToggle(){
  const manual = document.getElementById('manualPct').checked;
  document.getElementById('manualRow').style.display = manual ? 'flex' : 'none';
  if (manual) pendingChange = null;
  document.getElementById('autoPctBox').style.display = manual ? 'none' : 'block';
  updatePreviewBtn();
}

function manualVal(){
  const dir = document.getElementById('manualDir').value;
  const pct = Number(document.getElementById('manualPctVal').value);
  const rate = Number(document.getElementById('newUsdRate').value);
  if (!pct || pct <= 0) return null;
  return { rate: rate || Number(ps().usd_rate) || 0, pct, direction: dir };
}

function updatePreviewBtn(){
  const eff = document.getElementById('manualPct').checked ? manualVal() : pendingChange;
  document.getElementById('previewBtn').disabled = !(eff && (eff.base || eff.pct > 0));
}

function effectiveChange(){
  return document.getElementById('manualPct').checked ? manualVal() : pendingChange;
}

function openPricePreview(){
  const ch = effectiveChange();
  if (!ch) return showToast('أدخل سعر الدولار أو النسبة أولاً', '⚠️');
  if (!ch.base && (!ch.pct || ch.pct <= 0)) return showToast('النسبة صفر — لا تغيير', '⚠️');
  const factor = ch.base ? 1 : (1 + (ch.direction === 'up' ? ch.pct : -ch.pct) / 100);
  const sample = (DATA.items || []).slice(0, 6).map(it => ({
    name: it.name,
    before: it.price,
    after: roundPrice((it.price || 0) * factor),
  }));
  const count = (DATA.items || []).length;

  document.getElementById('priceModal').innerHTML = `
    <div class="set-modal-head">
      <strong>⚠️ تنبيه: الأسعار ستصبح بهذا الشكل</strong>
      <button onclick="closePricePreview()">✕</button>
    </div>
    <div class="set-modal-body">
      ${ch.base
        ? `<p>سيُعتمد سعر الدولار <b>${fmtNum(ch.rate)} ل.س</b> كقاعدة — <b>دون تغيير الأسعار الآن</b>.</p>`
        : `<p>${ch.direction === 'up' ? 'رفع' : 'خفض'} كل أسعار المنيو بنسبة <b>${Number(ch.pct).toFixed(1)}%</b>${ch.rate ? ` (سعر الدولار المعتمد الجديد: ${fmtNum(ch.rate)} ل.س)` : ''} — يشمل <b>${fmtNum(count)}</b> صنفاً.</p>
           <p class="set-round-note">🎯 التقريب: <b>${roundStepLabel()}</b></p>`}
      ${ch.base ? '' : `
      <table class="set-preview-table">
        <thead><tr><th>الصنف</th><th>السعر الحالي</th><th>السعر الجديد</th></tr></thead>
        <tbody>
          ${sample.map(s => `<tr><td>${e(s.name)}</td><td>${fmtNum(s.before)}</td><td class="new-price">${fmtNum(s.after)}</td></tr>`).join('')}
          ${count > 6 ? `<tr><td colspan="3" class="more">… و${fmtNum(count - 6)} صنفاً آخر بنفس النسبة</td></tr>` : ''}
        </tbody>
      </table>`}
    </div>
    <div class="set-modal-actions">
      <button class="set-btn danger" onclick="closePricePreview()">إلغاء</button>
      <button class="set-btn primary" onclick="applyPriceChange()">موافق</button>
    </div>`;
  document.getElementById('priceModal').classList.add('open');
  document.getElementById('priceModalScrim').classList.add('show');
}
function closePricePreview(){
  document.getElementById('priceModal').classList.remove('open');
  document.getElementById('priceModalScrim').classList.remove('show');
}

function applyPriceChange(){
  const ch = effectiveChange();
  if (!ch) return closePricePreview();
  const p = ps();
  if (!ch.base) {
    const factor = 1 + (ch.direction === 'up' ? ch.pct : -ch.pct) / 100;
    const step = roundStepVal();
    DATA.items = (DATA.items || []).map(it => Object.assign({}, it, { price: roundPrice((it.price || 0) * factor) }));
    if (window.commitMenuNow) commitMenuNow(DATA.items, DATA.categories);
    else if (window.MenuSync) MenuSync.pushSoon();
    if (window.SettingsSync) SettingsSync.pushSoon();
    p.last_change = { rate: ch.rate || p.usd_rate, pct: Number(ch.pct), direction: ch.direction, step, at: new Date().toISOString().slice(0, 10) };
    window.AlfaAudit && AlfaAudit.log('settings', 'تغيير أسعار جماعي',
    `${ch.direction === 'up' ? 'رفع' : 'خفض'} ${Number(ch.pct).toFixed(1)}% على ${fmtNum((DATA.items||[]).length)} صنف${step ? ` بتقريب أقرب ${fmtNum(step)} ل.س` : ''}`, 'المدير');
  showToast(`${ch.direction === 'up' ? 'رُفعت' : 'خُفّضت'} أسعار ${fmtNum((DATA.items||[]).length)} صنفاً بنسبة ${Number(ch.pct).toFixed(1)}%${step ? ` بتقريب أقرب ${fmtNum(step)} ل.س` : ''}`, '💱');
  } else {
    showToast(`اعتمد سعر الدولار ${fmtNum(ch.rate)} ل.س كقاعدة`, '✅');
  }
  p.usd_rate = ch.rate || p.usd_rate;
  p.updated_at = new Date().toISOString().slice(0, 10);
  p.round_step = roundStepVal();
  commitPs();
  pendingChange = null;
  document.getElementById('newUsdRate').value = '';
  document.getElementById('manualPctVal').value = '';
  document.getElementById('manualPct').checked = false;
  document.getElementById('manualRow').style.display = 'none';
  document.getElementById('autoPctBox').style.display = 'none';
  closePricePreview();
  renderRateBox();
  renderDiscountSection();
  updatePreviewBtn();
}

/* ================================================================
   3) العروض
   ================================================================ */
let offerDraft = [];
function todayStrS(){ const d=new Date(), p=n=>String(n).padStart(2,'0'); return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate()); }

function renderOffersAdmin(){
  const rows = (DATA.offers || []).map(o => {
    const expired = o.expires_at && o.expires_at < todayStrS();
    const active = o.active !== false && !expired;
    const names = (o.items||[]).map(l => {
      const it = (DATA.items||[]).find(i => i.id === l.item_id);
      return (l.free ? '🎁' : '') + (it ? it.name : '؟') + (l.qty > 1 ? ' ×' + l.qty : '');
    }).join(' + ');
    return `<div class="set-row offer-admin-row ${active ? '' : 'off'}">
      <div class="offer-admin-info">
        <strong>${e(o.title)}</strong>
        <small>${e(names)} · ${fmtNum(o.price)} ل.س${o.expires_at ? ` · حتى ${e(o.expires_at)}` : ' · بلا مدة'}</small>
      </div>
      <span class="tag ${active ? 'tag-sage' : 'tag-clay'}">${active ? 'ظاهر للكاشير' : (expired ? 'منتهٍ' : 'موقوف')}</span>
      <button class="set-btn" onclick="toggleOffer('${e(o.id)}')">${active ? 'إيقاف' : 'تفعيل'}</button>
      <button class="set-del" onclick="deleteOffer('${e(o.id)}')" title="حذف">🗑️</button>
    </div>`;
  }).join('');
  document.getElementById('offersAdminRows').innerHTML = rows || '<span class="set-empty">لا عروض — أي عرض تنشئه يظهر للكاشير فوراً</span>';

  document.getElementById('offerItemPick').innerHTML = (DATA.items||[])
    .map(i => `<option value="${e(i.id)}">${e(i.name)} — ${fmtNum(i.price)} ل.س</option>`).join('');
  renderOfferDraft();
}
function renderOfferDraft(){
  document.getElementById('offerLines').innerHTML = offerDraft.length
    ? offerDraft.map((l, idx) => {
        const it = (DATA.items||[]).find(i => i.id === l.item_id);
        return `<div class="set-row"><strong>${l.free ? '🎁 ' : ''}${e(it ? it.name : '؟')} ×${fmtNum(l.qty)}</strong><button class="set-del" onclick="removeOfferLine(${idx})">✕</button></div>`;
      }).join('')
    : '<span class="set-empty">أضف أصناف العرض أولاً</span>';
}
function addOfferLine(){
  const id  = document.getElementById('offerItemPick').value;
  const qty = Math.max(1, Number(document.getElementById('offerItemQty').value) || 1);
  const free = document.getElementById('offerLastFree').checked;
  if (!id) return showToast('اختر صنفاً', '⚠️');
  offerDraft.push({ item_id: id, qty, free });
  document.getElementById('offerItemQty').value = 1;
  document.getElementById('offerLastFree').checked = false;
  renderOfferDraft();
}
function removeOfferLine(idx){ offerDraft.splice(idx, 1); renderOfferDraft(); }
function saveOffer(){
  const title = document.getElementById('newOfferTitle').value.trim();
  const price = Number(document.getElementById('newOfferPrice').value);
  const expiry = document.getElementById('newOfferExpiry').value || null;
  if (!title) return showToast('أدخل اسم العرض', '⚠️');
  if (!(price >= 0)) return showToast('أدخل سعر العرض', '⚠️');
  if (!offerDraft.length) return showToast('أضف صنفاً واحداً على الأقل للعرض', '⚠️');
  DATA.offers = [
    { id: 'ofr_' + Date.now(), title, price, active: true, expires_at: expiry, items: offerDraft.slice() },
    ...(DATA.offers || []),
  ];
  offerDraft = [];
  document.getElementById('newOfferTitle').value = '';
  document.getElementById('newOfferPrice').value = '';
  document.getElementById('newOfferExpiry').value = '';
  renderOffersAdmin();
  window.AlfaAudit && AlfaAudit.log('settings', 'إنشاء عرض', `${title} بـ ${fmtNum(price)} ل.س`, 'المدير');
  showToast('حُفظ العرض — ظاهر الآن للكاشير', '🎟️');
  if (window.SettingsSync) SettingsSync.pushSoon();
}
function toggleOffer(id){
  const o = (DATA.offers||[]).find(x => x.id === id);
  if (!o) return;
  o.active = o.active === false;
  DATA.offers = (DATA.offers||[]).slice();
  if (window.SettingsSync) SettingsSync.pushSoon();
  renderOffersAdmin();
  window.AlfaAudit && AlfaAudit.log('settings', o.active ? 'تفعيل عرض' : 'إيقاف عرض', o.title, 'المدير');
  showToast(o.active ? 'فُعّل العرض — ظاهر للكاشير' : 'أُوقف العرض — اختفى من الكاشير', o.active ? '✅' : '⏸️');
}
function deleteOffer(id){
  const o = (DATA.offers||[]).find(x => x.id === id);
  DATA.offers = (DATA.offers||[]).filter(x => x.id !== id);
  if (window.SettingsSync && SettingsSync.removeOffer) SettingsSync.removeOffer(id);
  else if (window.AlfaOutbox) AlfaOutbox.commitDelete('offers', id);
  if (window.SettingsSync) SettingsSync.pushSoon();
  renderOffersAdmin();
  window.AlfaAudit && AlfaAudit.log('settings', 'حذف عرض', (o && o.title) || id, 'المدير');
  showToast('حُذف العرض', '🗑️');
}

/* ================================================================
   5) إشعارات الهاتف
   ================================================================ */
const PUSH_SUB_KEY = 'alfaprosys_push_sub_v1';
function pushSupported(){ return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window; }
function permLabel(){
  if (!('Notification' in window)) return 'غير مدعوم';
  return { granted: 'مفعّلة ✅', denied: 'مرفوضة من إعدادات المتصفح ❌', default: 'لم يُطلب الإذن بعد ⏳' }[Notification.permission] || Notification.permission;
}
function renderPhoneNotify(){
  const host = document.getElementById('phoneNotifyRows');
  if (!host) return;
  let subState = 'لا اشتراك بعد';
  try {
    const sub = JSON.parse(localStorage.getItem(PUSH_SUB_KEY) || 'null');
    if (sub && sub.endpoint) subState = 'مشترك ✓ (' + sub.endpoint.split('/').pop().slice(0, 14) + '…)';
  } catch (e) {}
  host.innerHTML = `
    <div class="set-row">
      <div class="offer-admin-info">
        <strong>حالة الإشعارات على هذا الجهاز</strong>
        <small>الإذن: ${permLabel()} · الاشتراك الخادمي: ${subState}</small>
      </div>
      <span class="tag ${('Notification' in window && Notification.permission === 'granted') ? 'tag-sage' : 'tag-clay'}">${pushSupported() ? 'مدعوم' : 'المتصفح لا يدعم'}</span>
    </div>`;
  const hint = document.getElementById('phoneNotifyHint');
  if (hint) hint.textContent = 'الإشعار المحلي يعمل فور التفعيل (والتطبيق مضاف للشاشة الرئيسية على آيفون). الدفع الخادمي يُفعَّل عند ربط القاعدة ونشر الخادم.';
}
async function enablePhoneNotify(){
  if (!pushSupported()) return showToast('هذا المتصفح لا يدعم الإشعارات — كروم/سفاري حديث', '⚠️');
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') { renderPhoneNotify(); return showToast('لم يُمنح إذن الإشعارات', '⚠️'); }
  try {
    const reg = await navigator.serviceWorker.ready;
    if (reg.pushManager) {
      const existing = await reg.pushManager.getSubscription();
      const sub = existing || await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: (window.ALFA_PUSH_PUBLIC_KEY || ''),
      }).catch(() => null);
      if (sub) { localStorage.setItem(PUSH_SUB_KEY, JSON.stringify(sub.toJSON())); }
    }
  } catch (e) {}
  renderPhoneNotify();
  showToast('الإشعارات مفعّلة على هذا الجهاز', '🔔');
}
async function testPhoneNotify(){
  if (!('Notification' in window) || Notification.permission !== 'granted')
    return showToast('فعّل الإشعارات أولاً بالزر أعلاه', '⚠️');
  try {
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification('🔔 alfaprosys — إشعار تجريبي', {
      body: 'هكذا تصلك التنبيهات العاجلة على هاتفك',
      icon: 'assets/icon/logo.png', tag: 'alfa-test',
    });
    showToast('أُرسل الإشعار التجريبي — انظر شاشة الهاتف', '✅');
  } catch (e) { showToast('تعذر الإشعار: ' + e.message, '⚠️'); }
}

/* ⚙️ منع البيع قبل فتح الوردية — سحابة (pos_rules) */
function posRules(){
  const D = DATA;
  D.pos_rules = D.pos_rules || { require_shift: false };
  return D.pos_rules;
}
async function saveRequireShift(on){
  const r = posRules();
  r.require_shift = !!on;
  DATA.pos_rules = Object.assign({}, r);
  /* توافق مؤقت: pos.js يقرأ المفتاح — يُحدَّث أيضاً من السحابة عند السحب */
  try { localStorage.setItem('alfaprosys_require_shift', on ? '1' : '0'); } catch (e) {}
  try {
    if (navigator.onLine !== false && window.SettingsSync && window.SettingsSync.saveKV) {
      await window.SettingsSync.saveKV('pos_rules', DATA.pos_rules);
      return showToast(on ? 'مفعّل على كل الأجهزة: لا بيع قبل فتح الوردية' : 'أُلغي المنع على كل الأجهزة', on ? '🔒' : '🔓');
    }
  } catch (e) {}
  if (window.AlfaOutbox && AlfaOutbox.commitRows) {
    AlfaOutbox.commitRows('settings', [{ key: 'pos_rules', value: DATA.pos_rules }]);
  }
  showToast(on ? 'مفعّل — سيُزامن مع السحابة' : 'أُلغي المنع — سيُزامن مع السحابة', on ? '🔒' : '🔓');
}
function loadRequireShift(){
  const el = document.getElementById('requireShiftToggle');
  if (!el) return;
  const cloud = posRules().require_shift;
  if (cloud != null) {
    el.checked = !!cloud;
    try { localStorage.setItem('alfaprosys_require_shift', cloud ? '1' : '0'); } catch (e) {}
  } else {
    el.checked = localStorage.getItem('alfaprosys_require_shift') === '1';
  }
}

/* ================================================================
   تصميم الفاتورة — مصدر واحد (invoice_print) في السحابة
   يدمج الهوية + الترويسة + التذييل + الخطوط + إظهار/إخفاء
   بلا بطاقة هوية مكررة وبلا localStorage كمصدر حقيقة
   ================================================================ */
const PRINT_CLOUD_KEY = 'invoice_print';
const PRINT_DEFAULTS = {
  restaurant_name: 'عالم الفواكه',
  restaurant_name_font_size: 20,
  description_line: 'قسيم الحريري 0983831671',
  description_font_size: 14,
  address_line: '',
  address_font_size: 14,
  order_number_font_size: 26,
  order_date_font_size: 14,
  customer_data_font_size: 12.5,
  order_notes_font_size: 14,
  /* خطوط جدول الأصناف — مستقلة وحاسمة لوضوح الإيصال الحراري */
  items_header_font_size: 9.5,  /* رؤوس الأعمدة: اسم المادة / الكمية / … */
  items_name_font_size: 11,     /* اسم الصنف داخل الصف */
  items_font_size: 12,          /* خلايا الكمية والسعر والإجمالي */
  items_note_font_size: 11,     /* ملاحظات الصنف داخل الجدول */
  sum_font_size: 12.5,
  sum_value_font_size: 17,   /* أرقام جدول المجاميع (مجموع الطلب/الصافي) */
  show_logo: true,
  logo_url: '',
  logo_max_mm: 22,
  footer_title: '',
  footer_title_font_size: 14,
  thank_you: 'شكرا لزيارتكم',
  thank_you_font_size: 16,
  show_qr: true,
  qr_image_url: '',
  qr_size_mm: 25,
  show_draw_code: false,
  show_name: true,
  show_description: true,
  show_address: true,
  show_order_no: true,
  show_date: true,
  show_customer: true,
  show_order_notes: true,
  show_footer_title: true,
  show_thank_you: true,
  font_family: 'Tahoma, Arial, sans-serif',
  phone: '0983831671',
};

const PRINT_FONT_CHOICES = [
  { id: 'Tahoma, Arial, sans-serif', label: 'Tahoma (افتراضي حراري)' },
  { id: 'Arial, Helvetica, sans-serif', label: 'Arial' },
  { id: '"Segoe UI", Tahoma, sans-serif', label: 'Segoe UI' },
  { id: 'Georgia, "Times New Roman", serif', label: 'Georgia (serif)' },
  { id: '"Courier New", Courier, monospace', label: 'Courier (ثابت العرض)' },
  { id: 'system-ui, sans-serif', label: 'خط النظام' },
];

function invoicePrintSettings(){
  const cloud = (window.DEMO_DATA && window.DEMO_DATA.invoice_print_settings) || {};
  /* السحابة فقط — لا localStorage كمصدر. الافتراضيات تملأ النواقص. */
  return Object.assign({}, PRINT_DEFAULTS, cloud);
}

function applyPrintToRuntime(s){
  s = s || invoicePrintSettings();
  if (!window.ALFA_CONFIG) return;
  const t = ALFA_CONFIG.thermal = ALFA_CONFIG.thermal || {};
  t.restaurantName = s.restaurant_name || t.restaurantName;
  t.brandingDescription = s.description_line || '';
  t.addressLine = s.address_line || '';
  t.logoUrl = s.logo_url || '';
  t.qrImageUrl = s.qr_image_url || '';
  t.showLogo = s.show_logo !== false;
  t.showQr = s.show_qr !== false;
  t.showDrawCode = !!s.show_draw_code;
  t.footerTitle = s.footer_title || '';
  t.thankYou = s.thank_you || 'شكرا لزيارتكم';
  t.fontFamily = s.font_family || 'Tahoma, Arial, sans-serif';
  t.logoMaxMm = Number(s.logo_max_mm) || 22;
  t.qrSizeMm = Number(s.qr_size_mm) || 25;
  t.show = {
    name: s.show_name !== false,
    description: s.show_description !== false,
    address: s.show_address !== false,
    orderNo: s.show_order_no !== false,
    date: s.show_date !== false,
    customer: s.show_customer !== false,
    orderNotes: s.show_order_notes !== false,
    footerTitle: s.show_footer_title !== false,
    thankYou: s.show_thank_you !== false,
    logo: s.show_logo !== false,
    qr: s.show_qr !== false,
    drawCode: !!s.show_draw_code,
  };
  const it = Number(s.items_font_size) || 12;
  const thSz = s.items_header_font_size != null && s.items_header_font_size !== ''
    ? Number(s.items_header_font_size) : Math.max(7, it - 2.5);
  const nameSz = s.items_name_font_size != null && s.items_name_font_size !== ''
    ? Number(s.items_name_font_size) : Math.max(7, it - 1);
  const itemNoteSz = s.items_note_font_size != null && s.items_note_font_size !== ''
    ? Number(s.items_note_font_size) : Math.max(7, it - 1);
  t.fonts = Object.assign({}, t.fonts || {}, {
    title: Number(s.restaurant_name_font_size) || 20,
    sub: Number(s.description_font_size) || 14,
    address: Number(s.address_font_size) || 14,
    no: Number(s.order_number_font_size) || 26,
    noLabel: Number(s.order_number_font_size) || 26,
    date: Number(s.order_date_font_size) || 14,
    cust: Number(s.customer_data_font_size) || 12.5,
    note: Number(s.order_notes_font_size) || 14, /* ملاحظات الطلب (فوق الجدول) */
    thanks: Number(s.thank_you_font_size) || 16,
    footerTitle: Number(s.footer_title_font_size) || 14,
    sum: Number(s.sum_font_size) || 12.5,
    sumVal: Number(s.sum_value_font_size) || 17,  /* أرقام المجاميع — أكبر من التسميات */
    td: it,                 /* كمية / سعر / إجمالي */
    th: thSz || 9.5,        /* رؤوس الأعمدة */
    name: nameSz || 11,     /* اسم المادة */
    itemNote: itemNoteSz || 11, /* ملاحظة الصنف داخل الجدول */
  });
  ALFA_CONFIG.restaurantName = s.restaurant_name || ALFA_CONFIG.restaurantName;
  ALFA_CONFIG.branding = Object.assign({}, ALFA_CONFIG.branding || {}, {
    name: s.restaurant_name || '',
    address: s.address_line || s.description_line || '',
    phone: s.phone || (ALFA_CONFIG.branding && ALFA_CONFIG.branding.phone) || '',
    footer: s.thank_you || '',
  });
  if (window.DEMO_DATA) {
    DEMO_DATA.invoice_print_settings = s;
    DEMO_DATA.branding = Object.assign({}, DEMO_DATA.branding || {}, ALFA_CONFIG.branding);
  }
}

function renderPrintDesignSummary(){
  const el = document.getElementById('printDesignSummary');
  if (!el) return;
  const s = invoicePrintSettings();
  const bits = [];
  bits.push(`<b>${e(s.restaurant_name || '—')}</b>`);
  if (s.description_line) bits.push(e(s.description_line));
  const vis = [];
  if (s.show_logo !== false && s.logo_url) vis.push('لوغو');
  else if (s.show_logo === false) vis.push('لوغو مخفي');
  if (s.show_qr !== false && s.qr_image_url) vis.push('QR');
  else if (s.show_qr === false) vis.push('QR مخفي');
  if (s.show_draw_code) vis.push('رمز السحب');
  bits.push('الخط: ' + e((s.font_family || 'Tahoma').split(',')[0].replace(/"/g, '')));
  const th = Number(s.items_header_font_size != null ? s.items_header_font_size : 9.5);
  const nm = Number(s.items_name_font_size != null ? s.items_name_font_size : 11);
  const td = Number(s.items_font_size) || 12;
  const inote = Number(s.items_note_font_size != null ? s.items_note_font_size : 11);
  bits.push('جدول: رؤوس ' + th + ' · اسم ' + nm + ' · أرقام ' + td + ' · ملاحظة ' + inote);
  bits.push('عناصر ظاهرة: ' + (vis.length ? vis.join(' · ') : 'نص فقط'));
  el.innerHTML = bits.join(' <span class="set-sum-sep">·</span> ');
}

/* ── مسودة المودال + معاينة حية ── */
let printDraft = null;
let printDraftObjectUrls = [];

function revokePrintDraftUrls(){
  printDraftObjectUrls.forEach(function (u) { try { URL.revokeObjectURL(u); } catch (e) {} });
  printDraftObjectUrls = [];
}

function sampleInvoiceForPreview(){
  const today = window.businessDay ? businessDay() : new Date().toISOString().slice(0, 10);
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return {
    id: today + '-15',
    no: 15,
    print_no: 15,
    date: today,
    time: hh + ':' + mm,
    type: 'takeaway',
    customer_name: 'زبون تجريبي',
    phone: '09xxxxxxxx',
    customer_address: '',
    notes: 'بدون بصل — ملاحظة تجريبية',
    discount: 0,
    total: 45000,
    draw_code: '12345678',
    items: [
      { name: 'شاورما دجاج وسط', qty: 2, price: 15000, note: '' },
      { name: 'بطاطا مقلية', qty: 1, price: 10000, note: 'إضافي' },
      { name: 'مشروب غازي', qty: 2, price: 2500, note: '' },
    ],
  };
}

function openPrintDesignModal(){
  revokePrintDraftUrls();
  printDraft = Object.assign({}, invoicePrintSettings());
  buildPrintDesignControls();
  refreshPrintLivePreview();
  document.getElementById('printDesignModal')?.classList.add('open');
  document.getElementById('printDesignScrim')?.classList.add('show');
}
function closePrintDesignModal(){
  document.getElementById('printDesignModal')?.classList.remove('open');
  document.getElementById('printDesignScrim')?.classList.remove('show');
  revokePrintDraftUrls();
  printDraft = null;
}

function buildPrintDesignControls(){
  const host = document.getElementById('printDesignControls');
  if (!host || !printDraft) return;
  const s = printDraft;
  const fontOpts = PRINT_FONT_CHOICES.map(function (f) {
    return `<option value="${e(f.id)}" ${s.font_family === f.id ? 'selected' : ''}>${e(f.label)}</option>`;
  }).join('');
  const hasFont = PRINT_FONT_CHOICES.some(function (f) { return f.id === s.font_family; });
  const fontExtra = hasFont ? '' : `<option value="${e(s.font_family || '')}" selected>حالي: ${e((s.font_family || '').split(',')[0])}</option>`;

  host.innerHTML = `
    <div class="set-pd-section">
      <h3>🏪 الهوية (تظهر على الإيصال)</h3>
      <label class="set-pd-field">اسم المطعم
        <input type="text" data-k="restaurant_name" value="${e(s.restaurant_name || '')}">
      </label>
      <label class="set-pd-field">الوصف / الهاتف
        <input type="text" data-k="description_line" value="${e(s.description_line || '')}">
      </label>
      <label class="set-pd-field">العنوان
        <input type="text" data-k="address_line" value="${e(s.address_line || '')}">
      </label>
      <label class="set-pd-field">هاتف (للمراجع)
        <input type="text" data-k="phone" value="${e(s.phone || '')}">
      </label>
    </div>

    <div class="set-pd-section">
      <h3>🔤 نوع الخط والحجم العام</h3>
      <label class="set-pd-field">عائلة الخط
        <select data-k="font_family">${fontExtra}${fontOpts}</select>
      </label>
      <div class="set-pd-row">
        <label class="set-pd-field">اسم المطعم <input type="number" min="10" max="40" step="0.5" data-k="restaurant_name_font_size" value="${Number(s.restaurant_name_font_size)||20}"></label>
        <label class="set-pd-field">الوصف <input type="number" min="8" max="28" step="0.5" data-k="description_font_size" value="${Number(s.description_font_size)||14}"></label>
        <label class="set-pd-field">العنوان <input type="number" min="8" max="28" step="0.5" data-k="address_font_size" value="${Number(s.address_font_size)||14}"></label>
      </div>
      <div class="set-pd-row">
        <label class="set-pd-field">رقم الطلب <input type="number" min="12" max="40" step="0.5" data-k="order_number_font_size" value="${Number(s.order_number_font_size)||26}"></label>
        <label class="set-pd-field">التاريخ <input type="number" min="8" max="28" step="0.5" data-k="order_date_font_size" value="${Number(s.order_date_font_size)||14}"></label>
        <label class="set-pd-field">العميل <input type="number" min="8" max="28" step="0.5" data-k="customer_data_font_size" value="${Number(s.customer_data_font_size)||12.5}"></label>
      </div>
      <div class="set-pd-row">
        <label class="set-pd-field">ملاحظات الطلب <input type="number" min="8" max="28" step="0.5" data-k="order_notes_font_size" value="${Number(s.order_notes_font_size)||14}"></label>
        <label class="set-pd-field">المجاميع <input type="number" min="8" max="24" step="0.5" data-k="sum_font_size" value="${Number(s.sum_font_size)||12.5}"></label>
        <label class="set-pd-field">أرقام المجاميع <input type="number" min="8" max="32" step="0.5" data-k="sum_value_font_size" value="${Number(s.sum_value_font_size)||17}"></label>
        <label class="set-pd-field">عنوان التذييل <input type="number" min="8" max="28" step="0.5" data-k="footer_title_font_size" value="${Number(s.footer_title_font_size)||14}"></label>
      </div>
      <div class="set-pd-row">
        <label class="set-pd-field">رسالة الشكر <input type="number" min="8" max="32" step="0.5" data-k="thank_you_font_size" value="${Number(s.thank_you_font_size)||16}"></label>
      </div>
    </div>

    <div class="set-pd-section">
      <h3>📋 خطوط جدول الأصناف (مهم للوضوح على الورق الحراري)</h3>
      <p class="set-hint" style="margin:0 0 8px">هذه الأحجام تتحكم بجدول المواد مباشرة في الإيصال — المعاينة تتحدّث فوراً.</p>
      <div class="set-pd-row">
        <label class="set-pd-field">رؤوس الأعمدة
          <input type="number" min="7" max="20" step="0.5" data-k="items_header_font_size" value="${Number(s.items_header_font_size != null ? s.items_header_font_size : 9.5)}">
        </label>
        <label class="set-pd-field">اسم المادة
          <input type="number" min="7" max="22" step="0.5" data-k="items_name_font_size" value="${Number(s.items_name_font_size != null ? s.items_name_font_size : Math.max(7, (Number(s.items_font_size)||12) - 1))}">
        </label>
        <label class="set-pd-field">كمية / سعر / إجمالي
          <input type="number" min="7" max="22" step="0.5" data-k="items_font_size" value="${Number(s.items_font_size)||12}">
        </label>
      </div>
      <div class="set-pd-row">
        <label class="set-pd-field">ملاحظات الصنف (داخل الجدول)
          <input type="number" min="7" max="20" step="0.5" data-k="items_note_font_size" value="${Number(s.items_note_font_size != null ? s.items_note_font_size : 11)}">
        </label>
      </div>
    </div>

    <div class="set-pd-section">
      <h3>👁️ إظهار / إخفاء عناصر الترويسة والتذييل</h3>
      <div class="set-pd-toggles">
        ${toggleRow('show_logo', 'اللوغو', s.show_logo !== false)}
        ${toggleRow('show_name', 'اسم المطعم', s.show_name !== false)}
        ${toggleRow('show_description', 'الوصف / الهاتف', s.show_description !== false)}
        ${toggleRow('show_address', 'العنوان', s.show_address !== false)}
        ${toggleRow('show_order_no', 'رقم الطلب', s.show_order_no !== false)}
        ${toggleRow('show_date', 'التاريخ والوقت', s.show_date !== false)}
        ${toggleRow('show_customer', 'بيانات العميل', s.show_customer !== false)}
        ${toggleRow('show_order_notes', 'ملاحظات الطلب', s.show_order_notes !== false)}
        ${toggleRow('show_footer_title', 'عنوان التذييل', s.show_footer_title !== false)}
        ${toggleRow('show_thank_you', 'رسالة الشكر', s.show_thank_you !== false)}
        ${toggleRow('show_qr', 'صورة QR', s.show_qr !== false)}
        ${toggleRow('show_draw_code', 'رمز السحب', !!s.show_draw_code)}
      </div>
    </div>

    <div class="set-pd-section">
      <h3>🖼️ اللوغو و QR — الحجم</h3>
      <div class="set-pd-row">
        <label class="set-pd-field">أقصى ارتفاع لوغو (مم)
          <input type="number" min="8" max="40" step="1" data-k="logo_max_mm" value="${Number(s.logo_max_mm)||22}">
        </label>
        <label class="set-pd-field">حجم QR (مم)
          <input type="number" min="12" max="40" step="1" data-k="qr_size_mm" value="${Number(s.qr_size_mm)||25}">
        </label>
      </div>
      <label class="set-pd-field">رفع لوغو (PNG/JPG)
        <input type="file" id="pdLogoFile" accept="image/png,image/jpeg,image/webp">
      </label>
      <label class="set-pd-field">رفع QR جاهز (صورة)
        <input type="file" id="pdQrFile" accept="image/png,image/jpeg,image/webp">
      </label>
      <p class="set-hint" style="margin-top:6px">الصور تُرفع للسحابة عند الحفظ. المعاينة فورية من الملف قبل الرفع.</p>
    </div>

    <div class="set-pd-section">
      <h3>📎 التذييل</h3>
      <label class="set-pd-field">عنوان التذييل
        <input type="text" data-k="footer_title" value="${e(s.footer_title || '')}">
      </label>
      <label class="set-pd-field">رسالة الشكر
        <input type="text" data-k="thank_you" value="${e(s.thank_you || '')}">
      </label>
    </div>
  `;

  host.querySelectorAll('[data-k]').forEach(function (el) {
    const ev = el.tagName === 'SELECT' || el.type === 'checkbox' || el.type === 'number' ? 'change' : 'input';
    el.addEventListener(ev, onPrintDraftField);
    if (el.type === 'number') el.addEventListener('input', onPrintDraftField);
  });
  host.querySelectorAll('[data-toggle]').forEach(function (el) {
    el.addEventListener('change', onPrintDraftToggle);
  });
  const logoF = document.getElementById('pdLogoFile');
  const qrF = document.getElementById('pdQrFile');
  if (logoF) logoF.addEventListener('change', function () { onPrintAssetPick(logoF, 'logo_url'); });
  if (qrF) qrF.addEventListener('change', function () { onPrintAssetPick(qrF, 'qr_image_url'); });
}

function toggleRow(key, label, on){
  return `<label class="set-pd-toggle"><input type="checkbox" data-toggle="${key}" ${on ? 'checked' : ''}> ${e(label)}</label>`;
}

function onPrintDraftField(ev){
  if (!printDraft) return;
  const el = ev.target;
  const k = el.getAttribute('data-k');
  if (!k) return;
  if (el.type === 'number') {
    const n = Number(el.value);
    if (!isNaN(n)) printDraft[k] = n;
  } else {
    printDraft[k] = el.value;
  }
  refreshPrintLivePreview();
}
function onPrintDraftToggle(ev){
  if (!printDraft) return;
  const k = ev.target.getAttribute('data-toggle');
  if (!k) return;
  printDraft[k] = !!ev.target.checked;
  refreshPrintLivePreview();
}
function onPrintAssetPick(input, key){
  if (!printDraft || !input.files || !input.files[0]) return;
  const file = input.files[0];
  const url = URL.createObjectURL(file);
  printDraftObjectUrls.push(url);
  printDraft[key] = url;
  printDraft['_' + key + '_file'] = file;
  refreshPrintLivePreview();
}

function refreshPrintLivePreview(){
  const pane = document.getElementById('printLivePreview');
  if (!pane || !printDraft) return;
  /* طبّق المسودة مؤقتاً على runtime لـ receiptHtml */
  const backup = window.DEMO_DATA && DEMO_DATA.invoice_print_settings
    ? Object.assign({}, DEMO_DATA.invoice_print_settings) : null;
  applyPrintToRuntime(printDraft);
  let html = '';
  try {
    if (window.ThermalPrint && ThermalPrint.receiptHtml) {
      html = ThermalPrint.receiptHtml(sampleInvoiceForPreview(), {});
    } else {
      html = '<div style="padding:12px;font:14px Tahoma">تعذر تحميل محرّك الطباعة</div>';
    }
  } catch (err) {
    html = '<div style="padding:12px;color:#b91c1c">خطأ معاينة: ' + String(err && err.message || err) + '</div>';
  }
  pane.innerHTML = html;
  /* أعد السحابة المحفوظة — المسودة تبقى في printDraft فقط حتى الحفظ */
  if (backup) applyPrintToRuntime(backup);
  else if (window.DEMO_DATA && DEMO_DATA.invoice_print_settings) applyPrintToRuntime(DEMO_DATA.invoice_print_settings);
}

function resetPrintDesignDraft(){
  if (!confirm('استعادة القيم الافتراضية في المعاينة؟ (لا تُحفظ حتى تضغط حفظ)')) return;
  revokePrintDraftUrls();
  printDraft = Object.assign({}, PRINT_DEFAULTS);
  buildPrintDesignControls();
  refreshPrintLivePreview();
}

async function uploadInvoiceAsset(file, kind){
  if (!file) return null;
  const cfg = window.ALFA_CONFIG && ALFA_CONFIG.supabase;
  if (!cfg || !cfg.url || !cfg.anonKey) throw new Error('إعدادات التخزين غير متوفرة');
  const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
  /* مسار مرتبط بهوية هذا العميل (tenant) — ليس مساراً عاماً للنظام */
  const tenant = (cfg.url.match(/https?:\/\/([a-z0-9]+)\.supabase/) || [])[1] || 'tenant';
  const path = tenant + '/invoice/' + kind + '_' + Date.now() + '.' + ext;
  const r = await fetch(cfg.url + '/storage/v1/object/invoice-assets/' + path, {
    method: 'POST',
    headers: {
      apikey: cfg.anonKey,
      Authorization: 'Bearer ' + cfg.anonKey,
      'x-upsert': 'true',
      'Content-Type': file.type || 'image/png',
    },
    body: file,
  });
  if (!r.ok) throw new Error(await r.text());
  return cfg.url + '/storage/v1/object/public/invoice-assets/' + path;
}

async function savePrintDesignModal(){
  if (!printDraft) return;
  const btn = document.getElementById('printDesignSaveBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'جارٍ الحفظ…'; }
  const s = Object.assign({}, printDraft);
  try {
    if (s._logo_url_file) {
      const url = await uploadInvoiceAsset(s._logo_url_file, 'logo');
      if (url) s.logo_url = url;
    }
    if (s._qr_image_url_file) {
      const url = await uploadInvoiceAsset(s._qr_image_url_file, 'qr');
      if (url) s.qr_image_url = url;
    }
  } catch (err) {
    if (btn) { btn.disabled = false; btn.textContent = '💾 حفظ في السحابة'; }
    return showToast('تعذر رفع اللوغو أو QR: ' + (err && err.message || err), '⚠️');
  }
  delete s._logo_url_file;
  delete s._qr_image_url_file;
  /* لا تحفظ blob: في السحابة */
  if (String(s.logo_url || '').indexOf('blob:') === 0) {
    const prev = invoicePrintSettings();
    s.logo_url = prev.logo_url || '';
  }
  if (String(s.qr_image_url || '').indexOf('blob:') === 0) {
    const prev = invoicePrintSettings();
    s.qr_image_url = prev.qr_image_url || '';
  }

  applyPrintToRuntime(s);
  try {
    if (navigator.onLine !== false && window.SettingsSync && window.SettingsSync.saveKV) {
      await window.SettingsSync.saveKV(PRINT_CLOUD_KEY, s);
      /* branding مدمج في invoice_print — نحفظ نسخة مختصرة للتوافق */
      await window.SettingsSync.saveKV('branding', {
        name: s.restaurant_name || '',
        address: s.address_line || s.description_line || '',
        phone: s.phone || '',
        footer: s.thank_you || '',
      });
      if (btn) { btn.disabled = false; btn.textContent = '💾 حفظ في السحابة'; }
      closePrintDesignModal();
      renderPrintDesignSummary();
      window.AlfaAudit && AlfaAudit.log('settings', 'تحديث تصميم الفاتورة', s.restaurant_name || '', 'المدير');
      return showToast('حُفظ تصميم الفاتورة في السحابة — يعمّ كل الأجهزة', '✅');
    }
  } catch (err) {
    if (btn) { btn.disabled = false; btn.textContent = '💾 حفظ في السحابة'; }
    return showToast('تعذر الحفظ في السحابة: ' + (err && err.message || err), '⚠️');
  }
  if (window.AlfaOutbox && AlfaOutbox.commitRows) {
    AlfaOutbox.commitRows('settings', [
      { key: PRINT_CLOUD_KEY, value: s },
      { key: 'branding', value: { name: s.restaurant_name || '', address: s.address_line || '', phone: s.phone || '', footer: s.thank_you || '' } },
    ]);
  }
  if (btn) { btn.disabled = false; btn.textContent = '💾 حفظ في السحابة'; }
  closePrintDesignModal();
  renderPrintDesignSummary();
  showToast('حُفظت المسودة — ستُرفع للسحابة عند الاتصال', '⚠️');
}

/* ══════════════════════════════════════════════════════════════
   إعادة رسم الأقسام المرتبطة بالسحابة بعد اكتمال السحب
   ══════════════════════════════════════════════════════════════ */
function refreshCloudSections(){
  var ae = document.activeElement;
  if (ae && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName || '')) return;
  /* لا تعِد رسم عناصر المودال المفتوح أثناء التحرير */
  if (document.getElementById('printDesignModal')?.classList.contains('open')) return;
  try { renderRateBox(); } catch (e) {}
  try { renderDiscountSection(); } catch (e) {}
  try { renderOffersAdmin(); } catch (e) {}
  try { loadRequireShift(); } catch (e) {}
  try { loadRoundStep(); } catch (e) {}
  try {
    applyPrintToRuntime(invoicePrintSettings());
    renderPrintDesignSummary();
  } catch (e) {}
}

(window.alfaStart||function(fn){fn();})(function () {
  buildNav();
  renderRateBox();
  renderDiscountSection();
  renderOffersAdmin();
  renderPhoneNotify();
  loadRoundStep();
  loadRequireShift();
  applyPrintToRuntime(invoicePrintSettings());
  renderPrintDesignSummary();
  if (window.alfaAutoRefresh) window.alfaAutoRefresh(refreshCloudSections);
});

/* تصدير للواجهة */
window.openPrintDesignModal = openPrintDesignModal;
window.closePrintDesignModal = closePrintDesignModal;
window.savePrintDesignModal = savePrintDesignModal;
window.resetPrintDesignDraft = resetPrintDesignDraft;
window.saveRequireShift = saveRequireShift;
window.saveRoundStep = saveRoundStep;
