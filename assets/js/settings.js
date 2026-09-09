/* ================================================================
   settings.js — إعدادات الإدارة — alfaprosys
   1) الخصم: نسب الفاتورة + خصومات الأصناف (ما يراه الكاشير)
   2) الأسعار والعملة: تحديث جماعي بنسبة تلقائية من سعر الدولار
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
function ps(){ return DATA.price_settings = DATA.price_settings || { usd_rate: null, updated_at: null, last_change: null }; }
function commitPs(){ DATA.price_settings = JSON.parse(JSON.stringify(ps())); if (window.SettingsSync) SettingsSync.pushSoon(); }

let pendingChange = null; // { rate, pct, direction, manual }

/* 🎯 خطوة التقريب السعري للتغيير الجماعي */
const ROUND_KEY = 'alfaprosys_price_round';
function roundStepVal(){ return Number(document.getElementById('priceRoundStep')?.value || 0); }
function saveRoundStep(){ try { localStorage.setItem(ROUND_KEY, String(roundStepVal())); } catch (e) {} }
function loadRoundStep(){
  const el = document.getElementById('priceRoundStep');
  if (el) el.value = String(Number(localStorage.getItem(ROUND_KEY) || 0) || 0);
}
function roundPrice(v){
  const st = roundStepVal();
  if (!st) return Math.max(0, Math.round(v));
  let r = Math.round(v / st) * st;
  if (v > 0 && r === 0) r = st;   /* لا نجعل صنفاً مدفوعاً مجانياً بسبب التقريب */
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

/* معاينة + تأكيد (موافق / إلغاء) */
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
    /* رفع مباشر فوري (كان pushSoon المؤجَّل يضيع عند التنقل السريع) */
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
  commitPs();
  pendingChange = null;
  document.getElementById('newUsdRate').value = '';
  document.getElementById('manualPctVal').value = '';
  document.getElementById('manualPct').checked = false;
  document.getElementById('manualRow').style.display = 'none';
  document.getElementById('autoPctBox').style.display = 'none';
  closePricePreview();
  renderRateBox();
  renderDiscountSection(); /* تحديث أسعار الأصناف في قسم الخصم */
  updatePreviewBtn();
}

/* ================================================================
   3) العروض — إنشاء وإيقاف وحذف (المدير فقط)
   ================================================================ */
let offerDraft = [];   // [{item_id, qty, free}]
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

/* ── تشغيل: بعد IndexedDB عبر alfaStart في نهاية الملف ── */

/* ================================================================
   5) إشعارات الهاتف — إذن + اشتراك Push (يُفعَّل خادمُه عند النشر) + تجربة
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
  if (hint) hint.textContent = 'الإشعار المحلي يعمل فور التفعيل (والتطبيق مضاف للشاشة الرئيسية على آيفون). الدفع الخادمي (وصول الإشعار والتطبيق مغلق تماماً) يُفعَّل تلقائياً عند ربط قاعدة البيانات ونشر الخادم — لا خطوة إضافية عليك.';
}
async function enablePhoneNotify(){
  if (!pushSupported()) return showToast('هذا المتصفح لا يدعم الإشعارات — كروم/سفاري حديث', '⚠️');
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') { renderPhoneNotify();
renderPhoneNotify(); return showToast('لم يُمنح إذن الإشعارات', '⚠️'); }
  /* اشتراك Push: يحتاج HTTPS (أو localhost) ومفتاح الخادم العام — قبل النشر يبقى محلياً */
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

/* ⚙️ منع البيع قبل فتح الوردية */
function saveRequireShift(on){
  try { localStorage.setItem('alfaprosys_require_shift', on ? '1' : '0'); } catch (e) {}
  showToast(on ? 'مفعّل: لا بيع قبل فتح الوردية' : 'أُلغي المنع — البيع حر في كل الأوقات', on ? '🔒' : '🔓');
}
function loadRequireShift(){
  const el = document.getElementById('requireShiftToggle');
  if (el) el.checked = localStorage.getItem('alfaprosys_require_shift') === '1';
}

/* 🏪 هوية المطعم */
function loadBranding(){
  let b = {};
  try { b = JSON.parse(localStorage.getItem('alfaprosys_branding') || '{}'); } catch (e) {}
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
  set('brandName', b.name); set('brandAddress', b.address);
  set('brandPhone', b.phone); set('brandFooter', b.footer);
}
function saveBranding(){
  const b = {
    name: document.getElementById('brandName').value.trim(),
    address: document.getElementById('brandAddress').value.trim(),
    phone: document.getElementById('brandPhone').value.trim(),
    footer: document.getElementById('brandFooter').value.trim(),
  };
  if (!b.name) return showToast('اسم المطعم إلزامي', '⚠️');
  localStorage.setItem('alfaprosys_branding', JSON.stringify(b));
  window.ALFA_CONFIG.restaurantName = b.name;
  window.ALFA_CONFIG.thermal.restaurantName = b.name;
  window.ALFA_CONFIG.branding = b;
  window.AlfaAudit.log('settings', 'تعديل هوية المطعم', b.name, 'المدير');
  showToast('حُفظت الهوية — ستظهر على الإيصالات والطباعة', '🏪');
}

(window.alfaStart||function(fn){fn();})(function () {
  buildNav();
  renderRateBox();
  renderDiscountSection();
  renderOffersAdmin();
  renderPhoneNotify();
  loadRoundStep();
  loadRequireShift();
  loadBranding();
});
