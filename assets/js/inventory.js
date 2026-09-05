
window.parseLocalNum = function(val) {
  if (!val && val !== 0) return NaN;
  const str = String(val).replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d)).replace(/,/g, '').replace(/\s/g, '');
  return parseFloat(str);
};

/* ================================================================
   inventory.js — المخزون — alfaprosys
   ================================================================ */

const DATA      = window.DEMO_DATA;
let inventory   = JSON.parse(JSON.stringify(DATA.inventory   || []));
let menuItems   = DATA.items    || [];
let invoices    = DATA.invoices || [];

/* ── أدوات ── */
function fmtQty(n) {
  const x = Number(n || 0);
  return x % 1 === 0 ? x.toString() : x.toFixed(2);
}
/* ================================================================
   حساب الاستهلاك التلقائي من الفواتير
   ================================================================ */
/* calcAutoConsumption — للعرض الإحصائي فقط (لا تُستخدم في معادلة الرصيد)
   تحسب استهلاك يوم إداري واحد محدد (افتراضياً: اليوم الحالي)
   ملاحظة: الرصيد الفعلي يُحسب عبر effectiveQty() المعتمدة على inv.qty */
function calcAutoConsumption(inv, day) {
  if (!inv.trackable || !inv.recipe?.length) return 0;
  const today = day || (window.businessDay ? businessDay() : new Date().toISOString().slice(0, 10));
  let total = 0;
  // نعتمد على سجلات auto:true المكتوبة بنفس اليوم — أدق وأسرع من مسح كل الفواتير
  const autoLogs = (inv.log || []).filter(l => l.auto && l.type === 'out' && l.date === today);
  autoLogs.forEach(l => { total += (l.qty || 0); });
  return total;
}

/* 🛒 كمية الشراء المقترحة: تعيد المخزون إلى ضعف الحد الأدنى (أو كمية مخصصة reorder_qty) */
function suggestBuyQty(inv, qty){
  if (!(inv.min_qty > 0)) return 0;
  if (inv.reorder_qty > 0) return inv.reorder_qty;
  return Math.max(inv.min_qty * 2 - qty, inv.min_qty);
}

/* حساب الكمية الفعلية = inv.qty (محدَّث لحظياً بكل بيع عبر deductStockForSale)
   - نطرح فقط المخرجات اليدوية غير المسجَّلة في inv.qty بعد
   ملاحظة: الاستهلاك التلقائي (auto:true) مطروح أصلاً من inv.qty لحظة البيع
   بواسطة deductStockForSale() — لا نطرحه مرة ثانية هنا لتجنب الازدواجية */
function effectiveQty(inv) {
  const manualOut = (inv.log || [])
    .filter(l => (l.type === 'out' && !l.auto) || l.type === 'waste')
    .reduce((s, l) => s + (l.qty || 0), 0);
  return inv.qty - manualOut;
}
const wasteTotal = inv => (inv.log || []).filter(l => l.type === 'waste').reduce((s, l) => s + (l.qty || 0), 0);

/* ================================================================
   التنقل
   ================================================================ */
const MGR_NAV = window.AlfaNav.MGR_NAV;
const CURRENT = 'inventory';
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
let filterCat  = 'all';
let searchTerm = '';
let openItemId = null;
let openTab    = {};   // { id: 'info' | 'log' }
let editingId  = null;

/* ================================================================
   البناء الرئيسي
   ================================================================ */
function renderApp() {
  document.getElementById('invApp').innerHTML = `
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
        <div id="invContent"></div>
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

    <!-- مودال -->
    <div class="inv-modal-scrim" id="invModalScrim" onclick="closeInvModal()"></div>
    <div class="inv-modal" id="invModal" role="dialog">
      <div class="inv-modal-head">
        <span id="invModalTitle">مادة جديدة</span>
        <button onclick="closeInvModal()">✕</button>
      </div>
      <div class="inv-modal-body" id="invModalBody"></div>
    </div>
  `;
  renderContent();
}

/* ================================================================
   المحتوى
   ================================================================ */
function renderContent() {
  const cats    = ['all', ...new Set(inventory.map(i => i.category).filter(Boolean))];
  const lowStock = inventory.filter(i => effectiveQty(i) <= (i.min_qty || 0));
  const totalVal = inventory.reduce((s, i) => s + effectiveQty(i) * (i.cost_per_unit || 0), 0);
  const trackable = inventory.filter(i => i.trackable).length;
  const wasteVal = inventory.reduce((s, i) => s + wasteTotal(i) * (i.cost_per_unit || 0), 0);

  document.getElementById('invContent').innerHTML = `

    <div class="mgr-page-header">
      <div>
        <div class="mgr-page-brand">alfaprosys</div>
        <div class="mgr-page-title">📦 المخزون</div>
      </div>
      <button class="mgr-btn gold sm" onclick="openPrepModal()" style="margin-right:8px;">🔪 تجهيز سيخ شاورما</button>
       <button class="mgr-btn navy sm" onclick="openAddItem()">+ مادة جديدة</button>
    </div>

    <!-- إحصائيات -->
    <div class="mgr-stats-grid" style="margin-bottom:12px;">
      <div class="mgr-stat-card blue">
        <div class="mgr-stat-lbl">إجمالي المواد</div>
        <div class="mgr-stat-val">${inventory.length}</div>
        <div class="mgr-stat-sub">${trackable} مرتبطة بالمبيعات</div>
      </div>
      <div class="mgr-stat-card ${wasteVal > 0 ? 'gold' : ''}">
        <div class="mgr-stat-lbl">قيمة الهدر المسجل</div>
        <div class="mgr-stat-val">${fmtNum(Math.round(wasteVal))}</div>
        <div class="mgr-stat-sub">ل.س</div>
      </div>
      <div class="mgr-stat-card ${lowStock.length > 0 ? 'red' : 'green'}">
        <div class="mgr-stat-lbl">تحت الحد الأدنى</div>
        <div class="mgr-stat-val">${lowStock.length}</div>
        <div class="mgr-stat-sub">${lowStock.length > 0 ? '⚠️ تحتاج إعادة طلب' : '✅ المخزون كافٍ'}</div>
      </div>
      <div class="mgr-stat-card gold">
        <div class="mgr-stat-lbl">قيمة المخزون</div>
        <div class="mgr-stat-val">${fmtNum(Math.round(totalVal / 1000))}K</div>
        <div class="mgr-stat-sub">ل.س تقريباً</div>
      </div>
    </div>

    <!-- تنبيهات المخزون المنخفض -->
    ${lowStock.length ? `
    <div class="inv-alert-strip">
      <span>⚠️ مواد تحت الحد الأدنى:</span>
      ${lowStock.map(i => `<span class="inv-alert-chip">${e(i.name)}</span>`).join('')}
    </div>` : ''}

    <!-- فلتر التصنيف -->
    <div class="inv-cat-strip">
      ${cats.map(c => `
        <button class="inv-cat-chip ${filterCat === c ? 'active' : ''}"
          onclick="setCatFilter('${e(c)}')">
          ${c === 'all' ? '📦 الكل' : e(c)}
          <span>${c === 'all' ? inventory.length : inventory.filter(i=>i.category===c).length}</span>
        </button>`).join('')}
    </div>

    <!-- بحث -->
    <div class="cust-search-bar" style="margin-bottom:12px;">
      <span>🔍</span>
      <input type="text" inputmode="search" placeholder="ابحث باسم المادة..."
        value="${e(searchTerm)}" oninput="onInvSearch(this.value)" />
      <button onclick="clearInvSearch()"
        style="display:${searchTerm ? '' : 'none'};">✕</button>
    </div>

    <!-- القائمة -->
    ${renderBuyList(lowStock)}

    <div id="invListWrap">${renderInvList()}</div>
  `;
}

/* ================================================================
   قائمة المواد
   ================================================================ */
function filteredList() {
  let list = inventory;
  if (filterCat !== 'all') list = list.filter(i => i.category === filterCat);
  if (searchTerm) list = list.filter(i => i.name?.toLowerCase().includes(searchTerm));
  return list;
}

function renderInvList() {
  const list = filteredList();
  if (!list.length) return `<div class="inv-empty">لا توجد مواد مطابقة</div>`;
  return `<div class="mgr-card" style="padding:0;overflow:hidden;">
    ${list.map(inv => renderInvRow(inv)).join('')}
  </div>`;
}

/* 🛒 قائمة الشراء المقترحة — المواد التي بلغت حد الطلب */
function renderBuyList(lowItems){
  if (!lowItems.length) return '';
  const rows = lowItems.map(inv => {
    const qty = effectiveQty(inv);
    const sug = suggestBuyQty(inv, qty);
    const cost = sug * (inv.cost_per_unit || 0);
    return { inv, qty, sug, cost };
  }).sort((a,b) => b.cost - a.cost);
  const total = rows.reduce((s,r) => s + r.cost, 0);
  const out = rows.filter(r => r.qty <= 0);
  return `
  <div class="mgr-card buy-list ${out.length ? 'buy-list-critical' : ''}">
    <div class="mgr-card-head">
      <div class="mgr-card-title">🛒 قائمة الشراء المقترحة — ${rows.length} مادة بلغت حد الطلب</div>
      <button class="mgr-btn sm" onclick="copyBuyList()">📋 نسخ للمورد</button>
    </div>
    <div class="buy-table-wrap">
      <table class="buy-table">
        <thead><tr><th>المادة</th><th>الموجود</th><th>حد الطلب</th><th>مقترح شراء</th><th>الكلفة التقديرية</th></tr></thead>
        <tbody>
          ${rows.map(r => `
          <tr class="${r.qty <= 0 ? 'buy-row-out' : ''}">
            <td class="buy-name">${r.qty <= 0 ? '🔴 ' : '🟠 '}${e(r.inv.name)}<small>${e(r.inv.unit)}</small></td>
            <td class="buy-num ${r.qty <= 0 ? 'red' : ''}">${fmtQty(r.qty)}</td>
            <td class="buy-num">${fmtQty(r.inv.min_qty)}</td>
            <td class="buy-num buy-sug">${fmtQty(r.sug)}</td>
            <td class="buy-num">${fmtNum(Math.round(r.cost))}</td>
          </tr>`).join('')}
          <tr class="buy-total"><td>الإجمالي التقديري</td><td colspan="3"></td><td>${fmtNum(Math.round(total))} ل.س</td></tr>
        </tbody>
      </table>
    </div>
    ${out.length ? `<div class="buy-alert">🔴 ${out.length} مادة نافدة تماماً: ${out.map(r => e(r.inv.name)).join('، ')} — اطلبها اليوم</div>` : ''}
  </div>`;
}
function copyBuyList(){
  const low = inventory.filter(i => effectiveQty(i) <= (i.min_qty || 0));
  const lines = ['🛒 قائمة شراء — alfaprosys ' + new Date().toLocaleDateString('ar-EG'), ''];
  low.forEach(inv => {
    const qty = effectiveQty(inv);
    lines.push(`• ${inv.name}: اطلب ${fmtQty(suggestBuyQty(inv, qty))} ${inv.unit} (الموجود ${fmtQty(qty)})`);
  });
  const txt = lines.join('\n');
  const done = () => showToast('نُسخت القائمة — ألصقها برسالة المورد', '📋');
  if (navigator.clipboard && navigator.clipboard.writeText)
    navigator.clipboard.writeText(txt).then(done).catch(() => fallbackCopyBuy(txt, done));
  else fallbackCopyBuy(txt, done);
}
function fallbackCopyBuy(txt, done){
  try {
    const ta = document.createElement('textarea');
    ta.value = txt; document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); ta.remove(); done();
  } catch (e) { showToast('تعذر النسخ — انسخ يدوياً', '⚠️'); }
}

function renderInvRow(inv) {
  const isOpen  = openItemId === inv.id;
  const tab     = openTab[inv.id] || 'info';
  const qty     = effectiveQty(inv);
  const auto    = inv.trackable ? calcAutoConsumption(inv) : 0;
  const isLow   = qty <= (inv.min_qty || 0);
  const pct     = inv.min_qty ? Math.min(100, Math.round(qty / (inv.min_qty * 3) * 100)) : 100;

  return `
    <div class="inv-row ${isOpen ? 'open' : ''}" id="irow_${e(inv.id)}">
      <div class="inv-row-main" onclick="toggleInvRow('${e(inv.id)}')">
        <div class="inv-row-icon">${getCatIcon(inv.category)}</div>
        <div class="inv-row-info">
          <div class="inv-row-name">
            ${e(inv.name)}
            ${inv.trackable ? '<span class="inv-badge auto">🔄 تلقائي</span>' : ''}
            ${isLow ? '<span class="inv-badge low">⚠️ منخفض</span>' : ''}
          </div>
          <div class="inv-row-sub">${e(inv.category)}</div>
          <!-- شريط المخزون -->
          <div class="inv-bar-wrap">
            <div class="inv-bar">
              <div class="inv-bar-fill ${isLow ? 'low' : pct < 50 ? 'warn' : ''}"
                style="width:${pct}%"></div>
            </div>
          </div>
        </div>
        <div class="inv-row-qty">
          <div class="inv-qty-val ${isLow ? 'red' : ''}">${fmtQty(qty)}</div>
          <div class="inv-qty-unit">${e(inv.unit)}</div>
        </div>
        <div class="inv-row-chevron ${isOpen ? 'open' : ''}">›</div>
      </div>

      <div class="inv-row-detail ${isOpen ? 'open' : ''}">
        <div class="inv-detail-inner">

          <!-- تابز -->
          <div class="emp-tabs">
            <button class="emp-tab ${tab==='info'?'active':''}"
              onclick="setInvTab('${e(inv.id)}','info')">📋 تفاصيل</button>
            <button class="emp-tab ${tab==='log'?'active':''}"
              onclick="setInvTab('${e(inv.id)}','log')">📜 السجل</button>
            ${inv.trackable ? `
            <button class="emp-tab ${tab==='recipe'?'active':''}"
              onclick="setInvTab('${e(inv.id)}','recipe')">🔗 المعادلة</button>` : ''}
          </div>

          ${tab === 'info' ? renderInvInfo(inv, qty, auto) : ''}
          ${tab === 'log'  ? renderInvLog(inv) : ''}
          ${tab === 'recipe' && inv.trackable ? renderInvRecipe(inv) : ''}

        </div>
      </div>
    </div>`;
}

function renderInvInfo(inv, qty, auto) {
  const manualOut = (inv.log||[]).filter(l=>(l.type==='out'&&!l.auto)||l.type==='waste').reduce((s,l)=>s+(l.qty||0),0);
  return `
    <div class="inv-info-grid">
      <div class="inv-info-cell">
        <div class="inv-info-val">${fmtQty(qty)}</div>
        <div class="inv-info-lbl">الكمية المتاحة</div>
      </div>
      <div class="inv-info-cell">
        <div class="inv-info-val">${fmtQty(inv.qty)}</div>
        <div class="inv-info-lbl">الكمية المدخلة</div>
      </div>
      <div class="inv-info-cell red">
        <div class="inv-info-val">${fmtQty(auto)}</div>
        <div class="inv-info-lbl">استهلاك اليوم</div>
      </div>
      <div class="inv-info-cell">
        <div class="inv-info-val">${fmtNum(inv.cost_per_unit || 0)}</div>
        <div class="inv-info-lbl">سعر الوحدة (ل.س)</div>
      </div>
      <div class="inv-info-cell">
        <div class="inv-info-val">${inv.min_qty || 0}</div>
        <div class="inv-info-lbl">الحد الأدنى</div>
      </div>
      ${inv.min_qty > 0 ? `
      <div class="inv-info-cell ${qty <= inv.min_qty ? 'low-cell' : ''}">
        <div class="inv-info-val">${fmtQty(suggestBuyQty(inv, qty))}</div>
        <div class="inv-info-lbl">اقتراح شراء</div>
      </div>` : ''}
      <div class="inv-info-cell gold">
        <div class="inv-info-val">${fmtNum(Math.round(qty * (inv.cost_per_unit||0)))}</div>
        <div class="inv-info-lbl">القيمة (ل.س)</div>
      </div>
    </div>
    ${inv.loaves_per_bundle ? `
    <div class="inv-bread-note">
      🍞 ${e(inv.loaves_per_bundle)} رغيف / ربطة ·
      متاح: ${fmtQty(qty * inv.loaves_per_bundle)} رغيف
    </div>` : ''}
    <div class="inv-action-row">
      <button class="inv-action-btn green" onclick="openAddStock('${e(inv.id)}')">+ إضافة للمخزون</button>
      <button class="inv-action-btn red"   onclick="openRemoveStock('${e(inv.id)}')">− خصم يدوي</button>
      <button class="inv-action-btn red"   onclick="openWasteStock('${e(inv.id)}')">🗑️ هدر</button>
      <button class="inv-action-btn"       onclick="openStocktake('${e(inv.id)}')">🧮 جرد فعلي</button>
      <button class="inv-action-btn"       onclick="openEditItem('${e(inv.id)}')">✏️ تعديل</button>
      <button class="inv-action-btn danger" onclick="deleteItem('${e(inv.id)}')">🗑</button>
    </div>`;
}

function renderInvLog(inv) {
  const log = [...(inv.log || [])].reverse();
  if (!log.length) return `<div class="inv-empty-log">لا توجد حركات مسجلة</div>`;
  return `
    <div class="inv-log-list">
      ${log.map((l, i) => `
        <div class="inv-log-row ${l.type}">
          <div class="inv-log-icon">${l.type === 'in' ? '⬆️' : l.type === 'waste' ? '🗑️' : l.type === 'adjust' ? '🧮' : l.auto ? '🔄' : '⬇️'}</div>
          <div class="inv-log-info">
            <div class="inv-log-note">${e(l.note || (l.type === 'in' ? 'إضافة' : 'خصم'))}</div>
            <div class="inv-log-date">${e(l.date)}${l.supplier_name ? ' · من ' + e(l.supplier_name) : ''}${l.by ? ' · سجّلها ' + e(l.by) : ''} ${l.auto ? '· تلقائي من المبيعات' : ''}</div>
          </div>
          <div class="inv-log-qty ${l.type === 'in' || (l.type === 'adjust' && l.qty >= 0) ? 'green' : 'red'}">
            ${l.type === 'in' || (l.type === 'adjust' && l.qty >= 0) ? '+' : '−'}${fmtQty(Math.abs(l.qty))} ${e(inv.unit)}
          </div>
          ${!l.auto ? `
          <button class="emp-del-log-btn"
            onclick="deleteInvLog('${e(inv.id)}',${log.length - 1 - i})">✕</button>` : ''}
        </div>`).join('')}
    </div>`;
}

function renderInvRecipe(inv) {
  return `
    <div class="inv-recipe-title">🔗 هذه المادة تُستهلك تلقائياً عند بيع:</div>
    <div class="inv-recipe-list">
      ${(inv.recipe || []).map(r => {
        const item = menuItems.find(i => i.id === r.item_id);
        return `
          <div class="inv-recipe-row">
            <div class="inv-recipe-name">${e(item?.name || r.item_id)}</div>
            <div class="inv-recipe-qty">${fmtQty(r.qty)} ${e(inv.unit)} / وحدة</div>
          </div>`;
      }).join('')}
    </div>
    <div class="inv-recipe-note">
      استهلاك اليوم الإداري (${window.businessDay ? businessDay() : ''}): <strong>${fmtQty(calcAutoConsumption(inv))} ${e(inv.unit)}</strong>
    </div>`;
}

function getCatIcon(cat) {
  const icons = { 'دواجن':'🍗', 'مخبوزات':'🥖', 'زيوت وتوابل':'🫙', 'حبوب':'🌾', 'مشروبات':'🥤', 'خضار':'🥬', 'لحوم':'🥩' };
  return icons[cat] || '📦';
}

/* ================================================================
   تحكم accordion وفلاتر
   ================================================================ */
function toggleInvRow(id) {
  openItemId = openItemId === id ? null : id;
  if (!openTab[id]) openTab[id] = 'info';
  document.getElementById('invListWrap').innerHTML = renderInvList();
}
function setInvTab(id, tab) {
  openItemId = id;
  openTab[id] = tab;
  document.getElementById('invListWrap').innerHTML = renderInvList();
}
function setCatFilter(c) { filterCat = c; rebuildContent(); }
function onInvSearch(v) { searchTerm = v.toLowerCase(); document.getElementById('invListWrap').innerHTML = renderInvList(); }
function clearInvSearch() { searchTerm = ''; document.getElementById('invListWrap').innerHTML = renderInvList(); }

/* ================================================================
   مودالات الإضافة / الخصم / التعديل
   ================================================================ */
function openAddStock(id) {
  const inv = inventory.find(x => x.id === id);
  document.getElementById('invModalTitle').textContent = `⬆️ إضافة مخزون — ${inv?.name}`;
  document.getElementById('invModalBody').innerHTML = `
    <label class="inv-modal-label">الكمية المضافة (${e(inv?.unit)})
      <input id="stockQty" class="inv-modal-input" type="text" inputmode="decimal" placeholder="0" />
    </label>
    <label class="inv-modal-label">سعر الوحدة (ل.س)
      <input id="stockCost" class="inv-modal-input" type="text" inputmode="numeric"
        placeholder="${inv?.cost_per_unit || 0}" value="${inv?.cost_per_unit || ''}" />
    </label>
    <label class="inv-modal-label">المورد
      <select id="stockSupplier" class="inv-modal-input">
        <option value="">— بدون مورد —</option>
        ${((window.DEMO_DATA.suppliers)||[]).map(sp => `<option value="${e(sp.id)}">${e(sp.name)}</option>`).join('')}
      </select>
    </label>
    <label class="inv-modal-label">ملاحظة (اختياري)
      <input id="stockNote" class="inv-modal-input" type="text" placeholder="مصدر التوريد..." />
    </label>
    <button class="inv-modal-confirm green" onclick="saveAddStock('${e(id)}')">⬆️ إضافة للمخزون</button>`;
  openInvModal();
  setTimeout(() => document.getElementById('stockQty')?.focus(), 60);
}
function saveAddStock(id) {
  const qty  = Number(document.getElementById('stockQty').value);
  const cost = Number(document.getElementById('stockCost').value);
  const note = document.getElementById('stockNote').value.trim();
  if (!qty) { showToast('أدخل الكمية', '⚠️'); return; }
  const idx = inventory.findIndex(x => x.id === id);
  if (idx < 0) return;
  inventory[idx].qty += qty;
  if (cost) inventory[idx].cost_per_unit = cost;
  if (!inventory[idx].log) inventory[idx].log = [];
  const supSel = document.getElementById('stockSupplier');
  const supId = supSel ? supSel.value : '';
  const supName = supId ? ((window.DEMO_DATA.suppliers||[]).find(x => x.id === supId)||{}).name || '' : '';
  inventory[idx].log.push({
    id: 'il_' + Date.now(), date: (window.businessDay ? businessDay() : new Date().toISOString().slice(0,10)),
    type: 'in', qty, note: note || 'إضافة مخزون', cost,
    supplier_id: supId || null, supplier_name: supName || '',
    by: ((window.DEMO_DATA.cashierSession)||{}).cashier_name || 'المدير',
  });
  window.AlfaAudit.log('inventory', 'شراء/إضافة مخزون',
    `${inventory[idx].name}: +${fmtQty(qty)} ${inventory[idx].unit}${cost ? ` بسعر ${fmtNum(cost)} ل.س` : ''}${supName ? ` من ${supName}` : ''}`,
    ((window.DEMO_DATA.cashierSession)||{}).cashier_name || 'المدير');
  DATA.inventory = inventory;
  if (window.InventorySync) InventorySync.push();
  closeInvModal();
  openItemId = id; openTab[id] = 'log';
  showToast(`تمت إضافة ${fmtQty(qty)} ${inventory[idx].unit}`, '⬆️');
  rebuildContent();
}

function openRemoveStock(id) {
  const inv = inventory.find(x => x.id === id);
  document.getElementById('invModalTitle').textContent = `⬇️ خصم يدوي — ${inv?.name}`;
  document.getElementById('invModalBody').innerHTML = `
    <label class="inv-modal-label">الكمية المخصومة (${e(inv?.unit)})
      <input id="rmQty" class="inv-modal-input" type="text" inputmode="decimal" placeholder="0" />
    </label>
    <label class="inv-modal-label">سبب الخصم
      <input id="rmNote" class="inv-modal-input" type="text" placeholder="تلف / صرف مطبخ..." />
    </label>
    <button class="inv-modal-confirm red" onclick="saveRemoveStock('${e(id)}')">⬇️ تأكيد الخصم</button>`;
  openInvModal();
  setTimeout(() => document.getElementById('rmQty')?.focus(), 60);
}
function saveRemoveStock(id) {
  const qty  = Number(document.getElementById('rmQty').value);
  const note = document.getElementById('rmNote').value.trim();
  if (!qty) { showToast('أدخل الكمية', '⚠️'); return; }
  const idx = inventory.findIndex(x => x.id === id);
  if (idx < 0) return;
  if (!inventory[idx].log) inventory[idx].log = [];
  inventory[idx].log.push({
    id: 'il_' + Date.now(), date: (window.businessDay ? businessDay() : new Date().toISOString().slice(0,10)),
    type: 'out', qty, note: note || 'خصم يدوي', auto: false
  });
  DATA.inventory = inventory;
  if (window.InventorySync) InventorySync.push();
  window.AlfaAudit.log('inventory', 'خصم يدوي', `${inventory[idx].name}: −${fmtQty(qty)} ${inventory[idx].unit} — ${note || 'بلا سبب'}`, 'المدير');
  closeInvModal();
  openItemId = id; openTab[id] = 'log';
  showToast(`تم خصم ${fmtQty(qty)} ${inventory[idx].unit}`, '⬇️');
  rebuildContent();
}

/* 🗑️ هدر المادة */
function openWasteStock(id) {
  const inv = inventory.find(x => x.id === id);
  document.getElementById('invModalTitle').textContent = `🗑️ تسجيل هدر — ${inv?.name}`;
  document.getElementById('invModalBody').innerHTML = `
    <label class="inv-modal-label">الكمية المهدرجة (${e(inv?.unit)})
      <input id="wstQty" class="inv-modal-input" type="text" inputmode="decimal" placeholder="0" />
    </label>
    <label class="inv-modal-label">سبب الهدر
      <input id="wstNote" class="inv-modal-input" type="text" placeholder="تلف / انتهاء صلاحية / حرق..." />
    </label>
    <button class="inv-modal-confirm red" onclick="saveWasteStock('${e(id)}')">🗑️ تسجيل الهدر</button>`;
  openInvModal();
  setTimeout(() => document.getElementById('wstQty')?.focus(), 60);
}
function saveWasteStock(id) {
  const qty = Number(document.getElementById('wstQty').value);
  const note = document.getElementById('wstNote').value.trim();
  if (!qty) { showToast('أدخل الكمية', '⚠️'); return; }
  const idx = inventory.findIndex(x => x.id === id);
  if (idx < 0) return;
  if (!inventory[idx].log) inventory[idx].log = [];
  inventory[idx].log.push({
    id: 'il_' + Date.now(), date: (window.businessDay ? businessDay() : new Date().toISOString().slice(0,10)),
    type: 'waste', qty, note: note || 'هدر',
  });
  DATA.inventory = inventory;
  if (window.InventorySync) InventorySync.push();
  window.AlfaAudit.log('inventory', 'تسجيل هدر',
    `${inventory[idx].name}: ${fmtQty(qty)} ${inventory[idx].unit} — ${note || 'بلا سبب'} (${fmtNum(Math.round(qty * (inventory[idx].cost_per_unit||0)))} ل.س)`, 'المدير');
  closeInvModal();
  openItemId = id; openTab[id] = 'log';
  showToast(`سُجّل هدر ${fmtQty(qty)} ${inventory[idx].unit}`, '🗑️');
  rebuildContent();
}

/* 🧮 جرد فعلي: يطابق الرصيد مع الموجود على الأرض */
function openStocktake(id) {
  const inv = inventory.find(x => x.id === id);
  document.getElementById('invModalTitle').textContent = `🧮 جرد فعلي — ${inv?.name}`;
  document.getElementById('invModalBody').innerHTML = `
    <div style="background:var(--bg-main,#f4f6f9);border-radius:10px;padding:10px;margin-bottom:10px;font-size:12px;font-weight:800;">
      الرصيد الدفتري الحالي: ${fmtQty(effectiveQty(inv))} ${e(inv?.unit)} — أدخل ما وجدتَه فعلاً وسيُعدَّل الفرق تلقائياً
    </div>
    <label class="inv-modal-label">الموجود فعلياً (${e(inv?.unit)})
      <input id="stQty" class="inv-modal-input" type="text" inputmode="decimal" placeholder="0" />
    </label>
    <label class="inv-modal-label">ملاحظة (اختياري)
      <input id="stNote" class="inv-modal-input" type="text" placeholder="جرد دوري..." />
    </label>
    <button class="inv-modal-confirm" onclick="saveStocktake('${e(id)}')">🧮 اعتماد الجرد</button>`;
  openInvModal();
  setTimeout(() => document.getElementById('stQty')?.focus(), 60);
}
function saveStocktake(id) {
  const counted = document.getElementById('stQty').value;
  if (!counted.trim()) { showToast('أدخل الموجود فعلياً', '⚠️'); return; }
  const cnt = Number(counted);
  const idx = inventory.findIndex(x => x.id === id);
  if (idx < 0) return;
  const inv = inventory[idx];
  const book = effectiveQty(inv);
  const diff = cnt - book;
  inv.qty = Math.max(0, cnt + (inv.qty - book));   /* نحافظ على أثر الحركات ونضبط الرصيد الفعلي */
  if (!inv.log) inv.log = [];
  inv.log.push({
    id: 'il_' + Date.now(), date: (window.businessDay ? businessDay() : new Date().toISOString().slice(0,10)),
    type: 'adjust', qty: diff, note: `جرد فعلي: الموجود ${fmtQty(cnt)}` + (document.getElementById('stNote').value.trim() ? ` — ${document.getElementById('stNote').value.trim()}` : ''),
  });
  DATA.inventory = inventory;
  if (window.InventorySync) InventorySync.push();
  window.AlfaAudit.log('inventory', 'جرد فعلي',
    `${inv.name}: الدفتري ${fmtQty(book)} → الفعلي ${fmtQty(cnt)} (فرق ${diff >= 0 ? '+' : '−'}${fmtQty(Math.abs(diff))} ${inv.unit})`, 'المدير');
  closeInvModal();
  openItemId = id; openTab[id] = 'log';
  showToast(`اعتمد الجرد — الفرق ${diff >= 0 ? '+' : '−'}${fmtQty(Math.abs(diff))} ${inv.unit}`, '🧮');
  rebuildContent();
}

function openAddItem() {
  editingId = null;
  document.getElementById('invModalTitle').textContent = '+ مادة جديدة';
  document.getElementById('invModalBody').innerHTML = buildItemForm(null);
  openInvModal();
}
function openEditItem(id) {
  editingId = id;
  const inv = inventory.find(x => x.id === id);
  document.getElementById('invModalTitle').textContent = `تعديل — ${inv?.name}`;
  document.getElementById('invModalBody').innerHTML = buildItemForm(inv);
  openInvModal();
}

function buildItemForm(inv) {
  return `
    <div class="mgr-form-group">
      <label>اسم المادة</label>
      <input id="ifName" type="text" value="${e(inv?.name || '')}" placeholder="مثال: دجاج كامل للبروستد" />
    </div>

    <div class="mgr-form-group">
      <label>التصنيف الرئيسي</label>
      <input id="ifCat" type="text" list="ifCatList" value="${e(inv?.category || '')}" placeholder="دواجن / مخبوزات..." />
      <datalist id="ifCatList">
        ${[...new Set(inventory.map(i=>i.category).filter(Boolean))]
          .map(c=>`<option value="${e(c)}">`).join('')}
      </datalist>
    </div>

    <div class="mgr-form-row2">
      <div class="mgr-form-group">
        <label>وحدة القياس الأساسية</label>
        <select id="ifUnit">
          ${['بالكيلو', 'لتر', 'ربطة', 'قطعة', 'علبة', 'صندوق', 'كيس', 'شوال', 'عدد'].map(u => 
            `<option value="${u}" ${inv?.unit === u ? 'selected' : ''}>${u}</option>`).join('')}
        </select>
      </div>
      <div class="mgr-form-group">
        <label>سعر التكلفة التقديري (ل.س)</label>
        <input id="ifCost" type="text" inputmode="numeric" value="${e(inv?.cost_per_unit || 0)}" />
      </div>
    </div>

    <div class="mgr-form-row2">
      <div class="mgr-form-group">
        <label>الكمية الافتتاحية</label>
        <input id="ifQty" type="text" inputmode="decimal" value="${e(inv?.qty || 0)}" ${inv ? 'disabled title="أضف كميات جديدة عبر الحركات أو المشتريات"' : ''} style="${inv ? 'background:var(--bg);' : ''}"/>
      </div>
      <div class="mgr-form-group">
        <label>الحد الأدنى للتنبيه</label>
        <input id="ifMin" type="text" inputmode="decimal" value="${e(inv?.min_qty || 0)}" />
      </div>
    </div>

    <div class="mgr-form-group" style="background:var(--bg-color); padding:10px; border-radius:8px; margin-top:8px;">
      <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-weight:bold; color:var(--text-main);">
        <input id="ifTrack" type="checkbox" ${inv?.trackable !== false ? 'checked' : ''} style="width:18px;height:18px;" />
        <span>ربط بالمبيعات والمخزون التلقائي</span>
      </label>
      <div style="font-size:11px; color:var(--text-muted); margin-top:4px;">
        عند التفعيل، سيقوم النظام تلقائياً بخصم الكميات من هذه المادة عندما تُباع الأصناف المرتبطة بها (عبر المعادلات).
      </div>
    </div>

    <button class="mgr-btn navy block" onclick="saveItem()" style="width:100%; margin-top:16px;">
      💾 ${inv ? 'حفظ التعديلات' : 'إضافة المادة للمخزون'}
    </button>
  `;
}

function saveItem() {
  const name = document.getElementById('ifName').value.trim();
  const cat  = document.getElementById('ifCat').value.trim();
  const unit = document.getElementById('ifUnit').value.trim();
  const qty  = parseLocalNum(document.getElementById('ifQty').value) || 0;
  const min  = parseLocalNum(document.getElementById('ifMin').value) || 0;
  const cost = parseLocalNum(document.getElementById('ifCost').value) || 0;
  const track= document.getElementById('ifTrack').checked;
  if (!name || !unit) { showToast('الاسم والوحدة مطلوبان', '⚠️'); return; }
  if (editingId) {
    const idx = inventory.findIndex(x => x.id === editingId);
    if (idx > -1) Object.assign(inventory[idx], { name, category:cat, unit, qty, min_qty:min, cost_per_unit:cost, trackable:track });
    showToast('تم تحديث المادة', '✏️');
  } else {
    inventory.unshift({ id:'inv_'+Date.now(), name, category:cat, unit, qty, min_qty:min, cost_per_unit:cost, trackable:track, recipe:[], log:[] });
    showToast('تمت إضافة المادة', '📦');
  }
  DATA.inventory = inventory;
  if (window.InventorySync) InventorySync.push();
  closeInvModal();
  rebuildContent();
}
function deleteItem(id) {
  const inv = inventory.find(x => x.id === id);
  if (!confirm(`حذف "${inv?.name}" من المخزون؟`)) return;
  inventory = inventory.filter(x => x.id !== id);
  DATA.inventory = inventory;
  if (window.InventorySync) { InventorySync.remove(id); InventorySync.push(); }
  openItemId = null;
  showToast('تم الحذف', '🗑');
  rebuildContent();
}
function deleteInvLog(id, idx) {
  if (!confirm('حذف هذه الحركة؟')) return;
  const ii = inventory.findIndex(x => x.id === id);
  if (ii < 0) return;
  inventory[ii].log.splice(idx, 1);
  DATA.inventory = inventory;
  if (window.InventorySync) InventorySync.push();
  openItemId = id; openTab[id] = 'log';
  rebuildContent();
}

/* ── مودال ── */
function openInvModal() {
  document.getElementById('invModalScrim')?.classList.add('show');
  document.getElementById('invModal')?.classList.add('show');
}
function closeInvModal() {
  document.getElementById('invModalScrim')?.classList.remove('show');
  document.getElementById('invModal')?.classList.remove('show');
}
function rebuildContent() { renderContent(); }

/* ── تشغيل ── */
(window.alfaStart||function(fn){fn();})(function () {
  inventory = JSON.parse(JSON.stringify(DATA.inventory || []));
  menuItems = DATA.items || [];
  invoices  = DATA.invoices || [];
  renderApp();
});
/* خصم/عكس المخزون: assets/js/stock.js (يُحمَّل قبل هذا الملف) */



/* ================================================================
   تجهيز سيخ الشاورما
   ================================================================ */
window.openPrepModal = function() {
  document.getElementById('invModalTitle').innerHTML = '🔪 تجهيز وإدخال سيخ شاورما جديد';
  
  // Find raw chicken breast in inventory if exists
  const rawChicken = inventory.find(i => i.name.includes('صدر دجاج') || i.name.includes('دجاج مسحب'));
  let maxRaw = rawChicken ? effectiveQty(rawChicken) : 0;
  
  document.getElementById('invModalBody').innerHTML = `
    <div class="mgr-form-group">
      <label>نوع الشاورما</label>
      <select id="prepType">
        <option value="دجاج">شاورما دجاج</option>
        <option value="لحم">شاورما لحم</option>
      </select>
    </div>
    
    <div class="mgr-form-group">
      <label>الوزن الصافي للسيخ (كغ)</label>
      <input type="text" id="prepWeight" placeholder="مثال: 30" oninput="calcPrepEst()">
    </div>
    
    <div class="mgr-form-group" style="background:var(--bg-color); padding:10px; border-radius:8px;">
      <label style="font-size:12px; color:var(--text-muted);">خصم الكمية من (المواد الخام):</label>
      <div style="display:flex; justify-content:space-between; margin-top:5px; font-weight:bold;">
        <span>الرصيد المتاح من صدر الدجاج:</span>
        <span style="color:${maxRaw > 0 ? 'var(--fahad-green)' : 'var(--fahad-red)'}">${maxRaw} كغ</span>
      </div>
      <label style="display:flex; align-items:center; gap:8px; margin-top:10px; cursor:pointer;">
        <input type="checkbox" id="prepDeduct" ${maxRaw > 0 ? 'checked' : ''}>
        <span>خصم وزن السيخ من المادة الخام تلقائياً؟</span>
      </label>
    </div>
    
    <div class="pur-unit-cost-box" style="margin-top:12px; background:var(--card-subtle); border:1px dashed var(--line); border-radius:10px; padding:12px;">
      <div style="font-size:11px; font-weight:800; color:var(--fahad-gold);">النتيجة المتوقعة</div>
      <div id="prepEstVal" style="font-family:'Changa', sans-serif; font-size:16px; font-weight:800; color:var(--fahad-navy); margin-top:4px;">—</div>
      <div style="font-size:11px; color:var(--text-muted); margin-top:4px;">بافتراض كل سندويشة تستهلك 80-100 غرام بعد الشوي</div>
    </div>
    
    <button class="mgr-btn gold block" onclick="submitPrep()" style="width:100%; margin-top:15px;">
      ✅ اعتماد وتخزين سيخ الشاورما
    </button>
  `;
  
  document.getElementById('invModalScrim').classList.add('show');
  document.getElementById('invModal').classList.add('show');
};

window.calcPrepEst = function() {
  const w = parseFloat(document.getElementById('prepWeight').value) || 0;
  const val = document.getElementById('prepEstVal');
  if (w > 0) {
    const minS = Math.round(w * (1000 / 100)); // 100g max per sandwich
    const maxS = Math.round(w * (1000 / 80));  // 80g min per sandwich
    val.innerHTML = `${minS} إلى ${maxS} وجبة/سندويشة`;
  } else {
    val.innerHTML = '—';
  }
};

window.submitPrep = function() {
  const type = document.getElementById('prepType').value;
  const weight = parseFloat(document.getElementById('prepWeight').value) || 0;
  const deduct = document.getElementById('prepDeduct').checked;
  
  if (weight <= 0) { showToast('يرجى إدخال وزن صالح', '⚠️'); return; }
  
  const targetItemName = type === 'دجاج' ? 'سيخ شاورما دجاج' : 'سيخ شاورما لحم';
  const rawItemName = type === 'دجاج' ? 'صدر دجاج' : 'لحم عجل';
  
  // 1. Add to the Skewer Item
  let skewer = inventory.find(i => i.name.includes(targetItemName));
  if (!skewer) {
    skewer = {
      id: 'inv_' + Date.now(),
      name: targetItemName,
      category: 'نصف مصنع',
      unit: 'كغ',
      qty: 0,
      min_qty: 10,
      trackable: true,
      log: []
    };
    inventory.push(skewer);
  }
  
  skewer.qty += weight;
  skewer.log.unshift({
    id: Date.now(), type: 'in', qty: weight, note: 'تجهيز داخلي للسيخ',
    date: todayDate(), time: nowTime()
  });
  
  // 2. Deduct from Raw Material if checked
  if (deduct) {
    let raw = inventory.find(i => i.name.includes(rawItemName));
    if (raw) {
      // account for potential marination increase? We assume 1:1 for simplicity here, or exactly what user inputs.
      raw.qty -= weight;
      raw.log.unshift({
        id: Date.now()+1, type: 'out', qty: weight, note: `صرف لتجهيز ${targetItemName}`,
        date: todayDate(), time: nowTime()
      });
    }
  }
  
  DATA.inventory = inventory;
  closeInvModal();
  renderContent();
  showToast(`تم إدخال ${targetItemName} بوزن ${weight} كغ`, '✅');
};
