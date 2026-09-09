
function parseLocalNum(val) {
  if (!val && val !== 0) return NaN;
  const str = String(val).replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d)).replace(/,/g, '').replace(/\s/g, '');
  return parseFloat(str);
}


function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}


window.openAddCat = openAddCat;
window.saveNewCat = saveNewCat;
window.closeEditModal = closeEditModal;
window.onSearch = onSearch;
window.clearSearch = clearSearch;
window.selectCat = selectCat;
window.filterFamily = filterFamily;
window.toggleNav = toggleNav;
window.closeNav = closeNav;
window.openAddItem = openAddItem;
window.saveNewItem = saveNewItem;
window.openEditItem = openEditItem;
window.saveItem = saveItem;
window.openEditCat = openEditCat;
window.saveCat = saveCat;
window.toggleAvailability = toggleAvailability;
window.deleteItem = deleteItem;
window.deleteCat = deleteCat;

/* ================================================================
   menu_admin.js — المنيو والأسعار — alfaprosys
   ================================================================ */

const DATA = window.DEMO_DATA;

/* ── أدوات ── */
function bySort(a, b) { return (a.sort_order || 0) - (b.sort_order || 0); }
function uniq(arr) { return [...new Set(arr.filter(Boolean))]; }

/* ── التنقل المشترك ── */
const MGR_NAV = window.AlfaNav.MGR_NAV;
const CURRENT = 'menu_admin';
const navLink = window.AlfaNav.linker(CURRENT);

/* ================================================================
   البيانات — نسخة قابلة للتعديل في الذاكرة
   ================================================================ */
let categories = JSON.parse(JSON.stringify(DATA.categories || []));
let items      = JSON.parse(JSON.stringify(DATA.items      || []));

/* ── حفظ مباشر في قاعدة البيانات ──────────────────────────────
   كل حفظ صريح يُقيَّد فوراً في الصندوق الصادر ثم يُرفع مباشرة
   (pushNow) بدل التأجيل 700ms الذي كان يضيع عند التنقل السريع.
   أي فشل يُعاد تلقائياً: عند عودة الإنترنت وعند كل إقلاع. */
function commitMenu() {
  /* زامِن نسخة الصفحة مع DATA قبل الالتزام */
  try { DATA.items = items; DATA.categories = categories; } catch (e) {}
  if (window.commitMenuNow) return commitMenuNow(items, categories);
  if (window.MenuSync) MenuSync.pushSoon();
  return Promise.resolve({ legacy: true });
}
function commitDelete(kind, id, deletedItemIds) {
  try { DATA.items = items; DATA.categories = categories; } catch (e) {}
  if (window.commitMenuDelete) return commitMenuDelete(kind, id, items, categories, deletedItemIds);
  if (window.MenuSync) {
    if (kind === 'cat') MenuSync.removeCat(id); else MenuSync.removeItem(id);
    MenuSync.pushSoon();
  }
  return Promise.resolve({ legacy: true });
}

/* ── حالة UI ── */
let navOpen       = false;
let activeCatId   = null;   // null = عرض كل التصنيفات
let menuView      = 'cats'; // 'cats' | 'items'
let searchTerm    = '';

// مودال التعديل
let editModal     = null;   // null | 'item' | 'cat' | 'addItem' | 'addCat'
let editingItemId = null;
let editingCatId  = null;

/* ================================================================
   البناء الرئيسي
   ================================================================ */
function renderApp() {
  document.getElementById('menuApp').innerHTML = `
    <div class="mgr-layout">

      <!-- Sidebar ديسكتوب -->
      <nav class="mgr-sidebar" id="mgrSidebar">
        <button class="mgr-side-toggle" onclick="document.getElementById('mgrSidebar').classList.toggle('expanded')">☰</button>
        <div class="mgr-side-logo"><strong>α</strong><span>alfaprosys</span></div>
        <div class="mgr-side-nav">${MGR_NAV.map(n => navLink(n)).join('')}</div>
        <div class="mgr-side-spacer"></div>
        <a class="mgr-side-link danger" href="index.html" onclick="sessionStorage.removeItem('alfaprosys_role')" title="خروج">
          <span class="mgr-side-ic">🚪</span><span class="mgr-side-lb">خروج</span>
        </a>
      </nav>

      <!-- المحتوى -->
      <div class="mgr-content-panel">
        <div id="menuContent"></div>
      </div>
    </div>

    <!-- Scrim nav -->
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

    <!-- مودال التعديل/الإضافة -->
    <div class="menu-modal-scrim" id="menuModalScrim" onclick="closeEditModal()"></div>
    <div class="menu-modal" id="menuModal" role="dialog">
      <div class="menu-modal-head" id="menuModalHead"></div>
      <div class="menu-modal-body" id="menuModalBody"></div>
    </div>
  `;

  renderContent();
}

/* ================================================================
   المحتوى الرئيسي
   ================================================================ */
function renderContent() {
  const totalActive   = items.filter(i => i.is_available !== false).length;
  const totalInactive = items.filter(i => i.is_available === false).length;

  document.getElementById('menuContent').innerHTML = `

    <!-- رأس الصفحة -->
    <div class="mgr-page-header">
      <div>
        <div class="mgr-page-brand">alfaprosys</div>
        <div class="mgr-page-title">🍔 المنيو والأسعار</div>
      </div>
      <div class="menu-header-actions">
        <button class="mgr-btn outline sm" onclick="openAddCat()">+ تصنيف</button>
        <button class="mgr-btn navy sm"    onclick="openAddItem()">+ صنف</button>
      </div>
    </div>
    ${window.AlfaCloud && AlfaCloud.html ? AlfaCloud.html() : ''}

    <!-- إحصائيات سريعة -->
    <div class="mgr-stats-grid" style="margin-bottom:12px;">
      <div class="mgr-stat-card">
        <div class="mgr-stat-lbl">التصنيفات</div>
        <div class="mgr-stat-val">${categories.length}</div>
        <div class="mgr-stat-sub">تصنيف رئيسي</div>
      </div>
      <div class="mgr-stat-card">
        <div class="mgr-stat-lbl">إجمالي الأصناف</div>
        <div class="mgr-stat-val">${items.length}</div>
        <div class="mgr-stat-sub">صنف في المنيو</div>
      </div>
      <div class="mgr-stat-card green">
        <div class="mgr-stat-lbl">متوفر</div>
        <div class="mgr-stat-val">${totalActive}</div>
        <div class="mgr-stat-sub">صنف</div>
      </div>
      <div class="mgr-stat-card red">
        <div class="mgr-stat-lbl">غير متوفر</div>
        <div class="mgr-stat-val">${totalInactive}</div>
        <div class="mgr-stat-sub">صنف</div>
      </div>
    </div>

    <!-- شريط البحث -->
    <div class="menu-search-bar">
      <span class="menu-search-icon">🔍</span>
      <input type="text" id="menuSearch" placeholder="ابحث عن صنف أو تصنيف..."
        value="${e(searchTerm)}" oninput="onSearch(this.value)">
      ${searchTerm ? `<button class="menu-search-clear" onclick="clearSearch()">✕</button>` : ''}
    </div>

    ${searchTerm.trim()
      ? renderSearchResults()
      : renderCategoriesAndItems()}
  `;
}

/* ================================================================
   نتائج البحث
   ================================================================ */
function renderSearchResults() {
  const q = searchTerm.trim().toLowerCase();
  const found = items.filter(i =>
    i.name.toLowerCase().includes(q) ||
    i.category_name?.toLowerCase().includes(q) ||
    i.family?.toLowerCase().includes(q) ||
    i.variant?.toLowerCase().includes(q)
  ).sort(bySort);

  return `
    <div class="menu-search-count">${found.length} نتيجة لـ "${e(searchTerm)}"</div>
    <div class="mgr-card" style="padding:0;overflow:hidden;">
      ${found.length === 0
        ? `<div class="mgr-empty"><div class="mgr-empty-icon">🔍</div>لا توجد نتائج</div>`
        : found.map(item => renderItemRow(item)).join('')}
    </div>
  `;
}

/* ================================================================
   التصنيفات والأصناف
   ================================================================ */
function renderCategoriesAndItems() {
  return `
    <!-- شريط التصنيفات -->
    <div class="menu-cat-strip">
      <button class="menu-cat-chip ${activeCatId === null ? 'active' : ''}"
        onclick="selectCat(null)">
        الكل <span>${items.length}</span>
      </button>
      ${categories.sort(bySort).map(cat => {
        const cnt = items.filter(i => i.category_id === cat.id).length;
        return `
          <button class="menu-cat-chip ${activeCatId === cat.id ? 'active' : ''}"
            onclick="selectCat('${e(cat.id)}')">
            ${cat.icon || ''} ${e(cat.name)} <span>${cnt}</span>
          </button>`;
      }).join('')}
    </div>

    ${activeCatId === null ? renderAllCats() : renderCatItems(activeCatId)}
  `;
}

/* ── عرض كل التصنيفات مجمّعة ── */
function renderAllCats() {
  return categories.sort(bySort).map(cat => {
    const catItems = items.filter(i => i.category_id === cat.id).sort(bySort);
    const families = uniq(catItems.map(i => i.family));
    const activeCount   = catItems.filter(i => i.is_available !== false).length;
    const inactiveCount = catItems.filter(i => i.is_available === false).length;

    return `
      <div class="menu-cat-section">
        <div class="menu-cat-header">
          <div class="menu-cat-header-info">
            <span class="menu-cat-icon">${cat.icon || '📦'}</span>
            <div>
              <div class="menu-cat-name">${e(cat.name)}</div>
              <div class="menu-cat-meta">
                ${catItems.length} صنف
                ${activeCount ? `<span class="mgr-badge green">${activeCount} متوفر</span>` : ''}
                ${inactiveCount ? `<span class="mgr-badge red">${inactiveCount} غير متوفر</span>` : ''}
                <span class="mgr-badge blue">⠿ اسحب للترتيب</span>
              </div>
            </div>
          </div>
          <button class="menu-edit-cat-btn" onclick="openEditCat('${e(cat.id)}')">✏️ تعديل</button>
        </div>

        <div class="mgr-card" style="padding:0;overflow:hidden;margin-bottom:0;">
          ${catItems.length === 0
            ? `<div class="mgr-empty" style="padding:16px;">لا توجد أصناف في هذا التصنيف</div>`
            : catItems.map(item => renderItemRow(item, true)).join('')}
        </div>
      </div>
    `;
  }).join('');
}

/* ── عرض أصناف تصنيف محدد ── */
function renderCatItems(catId) {
  const cat      = categories.find(c => c.id === catId);
  const catItems = items.filter(i => i.category_id === catId).sort(bySort);
  const families = uniq(catItems.map(i => i.family));

  return `
    <div class="menu-cat-section">
      <div class="menu-cat-header">
        <div class="menu-cat-header-info">
          <span class="menu-cat-icon">${cat?.icon || '📦'}</span>
          <div>
            <div class="menu-cat-name">${e(cat?.name || '')}</div>
            <div class="menu-cat-meta">${catItems.length} صنف <span class="mgr-badge blue">⠿ اسحب للترتيب</span></div>
          </div>
        </div>
        <button class="menu-edit-cat-btn" onclick="openEditCat('${e(catId)}')">✏️ تعديل التصنيف</button>
      </div>

      <!-- تصفية بالعائلة -->
      ${families.length > 1 ? `
        <div class="menu-family-strip">
          ${families.map(f => `
            <button class="menu-family-chip" onclick="filterFamily('${e(f)}')">
              ${e(f)}
            </button>`).join('')}
        </div>` : ''}

      <div class="mgr-card" style="padding:0;overflow:hidden;">
        ${catItems.length === 0
          ? `<div class="mgr-empty">لا توجد أصناف</div>`
          : catItems.map(item => renderItemRow(item, true)).join('')}
      </div>
    </div>
  `;
}

/* ── صف الصنف الواحد (drag = سحب وإفلات مفعّل في عرض التصنيف فقط) ── */
function renderItemRow(item, drag) {
  const available = item.is_available !== false;
  const dnd = drag ? ` draggable="true" data-item-id="${e(item.id)}" data-cat-id="${e(item.category_id || '')}" ondragstart="menuDragStart(event)" ondragover="menuDragOver(event)" ondragleave="menuDragLeave(event)" ondrop="menuDrop(event)" ondragend="menuDragEnd(event)"` : '';
  return `
    <div class="menu-item-row ${available ? '' : 'unavailable'}"${dnd}>
      ${drag ? `<span class="drag-handle" title="اسحب لإعادة الترتيب">⠿</span>` : ''}
      <div class="menu-item-main">
        <div class="menu-item-name">${e(item.name)}</div>
        <div class="menu-item-meta">
          ${item.family ? `<span class="menu-item-family">${e(item.family)}</span>` : ''}
          ${item.variant_clean ? `<span class="menu-item-variant">${e(item.variant_clean)}</span>` : ''}
          ${item.contract_price ? `<span class="mgr-badge gold">عقد: ${fmtNum(item.contract_price)}</span>` : ''}
        </div>
      </div>
      <div class="menu-item-right">
        ${(() => {
          const r = ((window.DEMO_DATA.discount_settings || {}).items || []).find(x => x.item_id === item.id);
          if (!r) return `<div class="menu-item-price">${fmtNum(item.price)}<span>ل.س</span></div>`;
          const net = Math.round((item.price || 0) * (1 - r.pct / 100));
          return `<div class="menu-item-price"><s>${fmtNum(item.price)}</s> <b>${fmtNum(net)}</b><span>ل.س</span><i class="menu-disc-tag">−${fmtNum(r.pct)}%</i></div>`;
        })()}
        <button class="menu-avail-btn ${available ? 'avail' : 'unavail'}"
          onclick="toggleAvailability('${e(item.id)}')">
          ${available ? '✅' : '🚫'}
        </button>
        ${drag ? `<span class="move-btns"><button class="move-btn" onclick="moveItem('${e(item.id)}',-1)" title="تحريك لأعلى">↑</button><button class="move-btn" onclick="moveItem('${e(item.id)}',1)" title="تحريك لأسفل">↓</button></span>` : ''}
        <button class="menu-item-edit-btn" onclick="openEditItem('${e(item.id)}')">✏️</button>
      </div>
    </div>
  `;
}

/* ================================================================
   تبديل التوفر
   ================================================================ */
function toggleAvailability(id) {
  const item = items.find(i => i.id === id);
  if (!item) return;
  item.is_available = item.is_available === false ? true : false;
  // تحديث DATA أيضاً
  const orig = DATA.items.find(i => i.id === id);
  if (orig) orig.is_available = item.is_available;
  renderContent();
  showToast(
    `${item.name}: ${item.is_available ? 'أصبح متوفراً' : 'أصبح غير متوفر'}`,
    item.is_available ? '✅' : '🚫'
  );
  commitMenu();
}

/* ================================================================
   إعادة الترتيب بالسحب والإفلات — الترقيم آلي (1..ن داخل التصنيف)
   ================================================================ */
let dragItemId = null;
let dragCatId  = null;

function catOrderedIds(catId) {
  return items.filter(i => i.category_id === catId).sort(bySort).map(i => i.id);
}
function applyCatOrder(catId, orderedIds) {
  orderedIds.forEach((id, idx) => {
    const it = items.find(i => i.id === id);
    if (it) it.sort_order = idx + 1;
    const orig = DATA.items.find(i => i.id === id);
    if (orig) orig.sort_order = idx + 1;
  });
  renderContent();
  commitMenu();
}
/* أسهم ↑↓ — بديل اللمس والتحريك الدقيق */
function moveItem(id, dir) {
  const item = items.find(i => i.id === id);
  if (!item) return;
  const ids = catOrderedIds(item.category_id);
  const from = ids.indexOf(id);
  const to = from + dir;
  if (from < 0 || to < 0 || to >= ids.length) return;
  ids.splice(from, 1);
  ids.splice(to, 0, id);
  applyCatOrder(item.category_id, ids);
  showToast('تمت إعادة الترتيب', '✅');
}
function menuDragStart(ev) {
  const row = ev.target.closest('.menu-item-row');
  if (!row) return;
  dragItemId = row.dataset.itemId;
  dragCatId  = row.dataset.catId;
  ev.dataTransfer.effectAllowed = 'move';
  try { ev.dataTransfer.setData('text/plain', dragItemId); } catch (e) {}
  row.classList.add('dragging');
}
function menuDragOver(ev) {
  ev.preventDefault();
  const row = ev.target.closest('.menu-item-row');
  if (!row || row.dataset.itemId === dragItemId) return;
  if (row.dataset.catId !== dragCatId) { row.classList.add('drop-deny'); return; }
  ev.dataTransfer.dropEffect = 'move';
  const r = row.getBoundingClientRect();
  const before = (ev.clientY - r.top) < r.height / 2;
  row.classList.toggle('drop-before', before);
  row.classList.toggle('drop-after', !before);
}
function menuDragLeave(ev) {
  const row = ev.target.closest('.menu-item-row');
  if (row) row.classList.remove('drop-before', 'drop-after', 'drop-deny');
}
function menuDrop(ev) {
  ev.preventDefault();
  const row = ev.target.closest('.menu-item-row');
  document.querySelectorAll('.menu-item-row.drop-before,.menu-item-row.drop-after,.menu-item-row.drop-deny')
    .forEach(x => x.classList.remove('drop-before', 'drop-after', 'drop-deny'));
  if (!row || !dragItemId) return;
  if (row.dataset.catId !== dragCatId) { showToast('السحب داخل التصنيف نفسه فقط', '⚠️'); return; }
  if (row.dataset.itemId === dragItemId) return;
  const r = row.getBoundingClientRect();
  const before = (ev.clientY - r.top) < r.height / 2;
  const ids = catOrderedIds(dragCatId).filter(id => id !== dragItemId);
  let at = ids.indexOf(row.dataset.itemId);
  if (at < 0) return;
  if (!before) at += 1;
  ids.splice(at, 0, dragItemId);
  applyCatOrder(dragCatId, ids);
  showToast('تمت إعادة الترتيب', '✅');
}
function menuDragEnd() {
  dragItemId = null; dragCatId = null;
  document.querySelectorAll('.menu-item-row.dragging').forEach(x => x.classList.remove('dragging'));
}

/* ================================================================
   مودال تعديل صنف
   ================================================================ */
function openEditItem(id) {
  editingItemId = id;
  const item = items.find(i => i.id === id);
  if (!item) return;

  document.getElementById('menuModalHead').innerHTML = `
    <span>✏️ تعديل صنف</span>
    <button onclick="closeEditModal()">✕</button>
  `;
  document.getElementById('menuModalBody').innerHTML = `

    <!-- اسم الصنف -->
    <div class="mgr-form-group">
      <label>اسم الصنف</label>
      <!-- إصلاح: كان الحقل يعرض الاسم المؤلَّف («الاسم + الصيغة») فيُدفَع كله إلى
           عمود name ويتكرر عند كل سحب. الآن يعرض الاسم الأساسي وحده، والصيغة في حقلها. -->
      <input type="text" id="editItemName" value="${e(item.base_name || (window.AlfaItemBase ? AlfaItemBase(item) : item.name))}">
    </div>

    <!-- التصنيف الرئيسي -->
    <div class="mgr-form-group">
      <label>التصنيف الرئيسي</label>
      <select id="editItemCat" onchange="onEditItemCatChange(this.value)">
        ${categories.map(c => `
          <option value="${e(c.id)}" ${c.id === item.category_id ? 'selected' : ''}>
            ${c.icon || ''} ${e(c.name)}
          </option>`).join('')}
      </select>
    </div>

    <!-- العائلة / التصنيف الفرعي -->
    <div class="mgr-form-group">
      <label>التصنيف الفرعي (العائلة)</label>
      <input type="text" id="editItemFamily" value="${e(item.family || '')}">
    </div>

    <!-- الصيغة / المتغير -->
    <div class="mgr-form-row2">
      <div class="mgr-form-group">
        <label>الصيغة / المتغير</label>
        <input type="text" id="editItemVariant" value="${e(item.variant_clean || item.variant || '')}">
      </div>
      <div class="mgr-form-group">
        <label>الترتيب</label>
        <div class="auto-sort-note">🔢 تلقائي (#${item.sort_order || '—'}) — اسحب الصنف ⠿ في القائمة لتغيير ترتيبه</div>
      </div>
    </div>
    
    <div class="mgr-form-group">
      <label>الباركود (اختياري)</label>
      <input type="text" id="editItemBarcode" value="${e(item.barcode || '')}">
    </div>
    <div class="mgr-form-group">
      <label>رابط الصورة (اختياري - يظهر في المنيو الأونلاين)</label>
      <input type="url" id="editItemImage" value="${e(item.image_url || '')}" placeholder="https://example.com/image.jpg">
    </div>

    <!-- الأسعار -->

    <div class="menu-prices-section">
      <div class="menu-prices-title">💰 الأسعار</div>
      <div class="mgr-form-row2">
        <div class="mgr-form-group">
          <label>سعر البيع العادي (ل.س)</label>
          <input type="text" id="editItemPrice" value="${item.price || 0}" inputmode="numeric">
        </div>
        <div class="mgr-form-group">
          <label>سعر العقد الخاص (ل.س)</label>
          <input type="text" id="editItemContract" value="${item.contract_price || ''}"
            inputmode="numeric" placeholder="اتركه فارغاً إن لم يكن">
        </div>
      </div>
      <div class="mgr-form-group">
        <label>تكلفة الصنف التقديرية (ل.س)</label>
        <input type="text" id="editItemCost" value="${item.cost_manual || 0}" inputmode="numeric">
      </div>
    </div>

    <!-- الحالة -->
    <div class="menu-avail-toggle-row">
      <span>حالة الصنف</span>
      <label class="menu-toggle-label">
        <input type="checkbox" id="editItemAvail" ${item.is_available !== false ? 'checked' : ''}>
        <span class="menu-toggle-track"></span>
        <span class="menu-toggle-text" id="editItemAvailText">
          ${item.is_available !== false ? 'متوفر' : 'غير متوفر'}
        </span>
      </label>
    </div>

    <!-- أزرار -->
    <div class="menu-modal-footer">
      <button class="mgr-btn danger sm" onclick="deleteItem('${e(item.id)}')">🗑️ حذف</button>
      <div style="display:flex;gap:8px;">
        <button class="mgr-btn outline sm" onclick="closeEditModal()">إلغاء</button>
        <button class="mgr-btn navy sm" onclick="saveItem('${e(item.id)}')">💾 حفظ</button>
      </div>
    </div>
  `;

  document.getElementById('editItemAvail').addEventListener('change', function() {
    document.getElementById('editItemAvailText').textContent = this.checked ? 'متوفر' : 'غير متوفر';
  });

  openModalEl();
}

function saveItem(id) {
  const item = items.find(i => i.id === id);
  if (!item) return;

  /* إصلاح: الحقل يحمل الآن الاسم الأساسي وحده (بدون الصيغة) */
  const typedName    = document.getElementById('editItemName').value.trim();
  item.base_name     = typedName || item.base_name || (window.AlfaItemBase ? AlfaItemBase(item) : item.name);
  item.category_id   = document.getElementById('editItemCat').value;
  item.category_name = categories.find(c => c.id === item.category_id)?.name  || item.category_name;
  item.family        = document.getElementById('editItemFamily').value.trim()  || item.family;
  item.variant_clean = document.getElementById('editItemVariant').value.trim();
  /* ── إصلاح: هذه الحقول لم تكن تُحدَّث إطلاقاً عند الحفظ من مودال التعديل،
     فتبقى قيمها القديمة (وأحياناً اسم التصنيف الرئيسي) في أعمدة الجدول ── */
  item.variant       = item.variant_clean || item.variant || null;
  /* الاسم المحلي المؤلَّف = الاسم الأساسي + الصيغة (نفس صيغة fromRemote تماماً) */
  item.name          = item.variant_clean ? (item.base_name + ' ' + item.variant_clean) : item.base_name;
  /* option_name: name يُصحَّح تلقائياً إن كان يحمل اسم التصنيف الرئيسي (تلويث قديم) */
  item.option_name   = item.family
                    || ((item.option_name && item.option_name !== item.category_name) ? item.option_name : null)
                    || item.base_name;
  item.barcode       = document.getElementById('editItemBarcode')?.value.trim() || null;
  item.image_url     = document.getElementById('editItemImage')?.value.trim() || null;
  /* الترقيم آلي عبر السحب والإفلات — لا حقل يدوي بعد الآن */
  const sortEl = document.getElementById('editItemSort');
  if (sortEl) item.sort_order = parseInt(sortEl.value) || item.sort_order;
  item.price         = (() => { const v = parseLocalNum(document.getElementById('editItemPrice').value); return isNaN(v) ? item.price : v; })();
  item.cost_manual   = parseLocalNum(document.getElementById('editItemCost').value) || 0;
  item.is_available  = document.getElementById('editItemAvail').checked;
  const contract = document.getElementById('editItemContract').value.trim();
  item.contract_price = contract ? parseLocalNum(contract) : null;

  // تحديث DATA الأصلية
  // Trigger proxy update for sync
  const origIdx = DATA.items.findIndex(i => i.id === id);

  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID.test(item.id)) {
    // Upgrade dummy ID to real UUID on edit so it can be synced
    const newId = generateUUID();
    item.id = newId;
    if (origIdx > -1) {
      DATA.items[origIdx].id = newId;
    }
  }
  
  if (!UUID.test(item.category_id)) {
    // If the category is also dummy, it won't sync. We can't easily upgrade category ID here without breaking all other items in it.
    // Show a toast warning
    showToast('تحذير: هذا الصنف يتبع لتصنيف تجريبي ولن يظهر في السحابة. أنشئ تصنيفاً جديداً.', '⚠️');
  }

  if (origIdx > -1) {
    const updatedObj = Object.assign({}, DATA.items[origIdx], item);
    DATA.items[origIdx] = updatedObj;
  } else {
    // If somehow not found in DATA.items, push it
    DATA.items.push(item);
  }
  DATA.items = [...DATA.items];

  /* رفع مباشر فوري لقاعدة البيانات (upsert: إدراج أو تحديث) —
     يستبدل PATCH الناري-وانسَ الذي كان يفشل بصمت تام على الصفوف
     الجديدة (المعرّف المرقّى حديثاً لـ UUID غير موجود في السحابة
     فيعيد PATCH نجاحاً وهمياً بـ 0 صفوف!). */
  commitMenu();


  closeEditModal();
  renderContent();
  showToast(`تم حفظ: ${item.name} بسعر ${item.price}`, '✅');
}

function deleteItem(id) {
  const item = items.find(i => i.id === id);
  if (!confirm(`حذف الصنف: ${item?.name}؟`)) return;
  items = items.filter(i => i.id !== id);
  DATA.items = DATA.items.filter(i => i.id !== id);
  closeEditModal();
  renderContent();
  showToast('تم حذف الصنف', '🗑️');
  commitDelete('item', id);
}

/* ================================================================
   مودال إضافة صنف جديد
   ================================================================ */
function openAddItem() {
  document.getElementById('menuModalHead').innerHTML = `
    <span>➕ إضافة صنف جديد</span>
    <button onclick="closeEditModal()">✕</button>
  `;
  document.getElementById('menuModalBody').innerHTML = `

    <div class="mgr-form-group">
      <label>اسم الصنف الكامل</label>
      <input type="text" id="newItemName" placeholder="مثال: شاورما عربي صحن سندويشتين">
    </div>

    <div class="mgr-form-group">
      <label>التصنيف الرئيسي</label>
      <select id="newItemCat" onchange="onNewItemCatChange(this.value)">
        ${categories.map(c => `
          <option value="${e(c.id)}">${c.icon || ''} ${e(c.name)}</option>`).join('')}
        <option value="__new__">➕ تصنيف جديد...</option>
      </select>
    </div>
    <div class="mgr-form-group" id="newCatNameRow" style="display:none;">
      <label>اسم التصنيف الجديد</label>
      <input type="text" id="newCatNameInput" placeholder="مثال: وجبات خاصة">
    </div>

    <div class="mgr-form-row2">
      <div class="mgr-form-group">
        <label>التصنيف الفرعي</label>
        <input type="text" id="newItemFamily" placeholder="مثال: شاورما عربي">
      </div>
      <div class="mgr-form-group">
        <label>الصيغة / المتغير</label>
        <input type="text" id="newItemVariant" placeholder="مثال: صحن سندويشتين">
      </div>
    </div>
    
    <div class="mgr-form-group">
      <label>الباركود (اختياري)</label>
      <input type="text" id="newItemBarcode" placeholder="مثال: 123456789">
    </div>
    <div class="mgr-form-group">
      <label>رابط الصورة (اختياري - يظهر في المنيو الأونلاين)</label>
      <input type="url" id="newItemImage" placeholder="https://example.com/image.jpg">
    </div>
    </div>

    <div class="menu-prices-section">

      <div class="menu-prices-title">💰 الأسعار</div>
      <div class="mgr-form-row2">
        <div class="mgr-form-group">
          <label>سعر البيع (ل.س)</label>
          <input type="text" id="newItemPrice" placeholder="0" inputmode="numeric">
        </div>
        <div class="mgr-form-group">
          <label>سعر العقد (ل.س)</label>
          <input type="text" id="newItemContract" placeholder="اختياري" inputmode="numeric">
        </div>
      </div>
      <div class="mgr-form-group">
        <label>تكلفة تقديرية (ل.س)</label>
        <input type="text" id="newItemCost" placeholder="0" inputmode="numeric">
      </div>
    </div>

    <div class="menu-modal-footer">
      <button class="mgr-btn outline sm" onclick="closeEditModal()">إلغاء</button>
      <button class="mgr-btn navy sm" onclick="saveNewItem()">✅ إضافة الصنف</button>
    </div>
  `;

  document.getElementById('newItemCat').addEventListener('change', function() {
    document.getElementById('newCatNameRow').style.display =
      this.value === '__new__' ? 'block' : 'none';
  });

  openModalEl();
  setTimeout(() => document.getElementById('newItemName')?.focus(), 100);
}

function saveNewItem() {
  const name     = document.getElementById('newItemName').value.trim();
  const price    = parseLocalNum(document.getElementById('newItemPrice').value) || 0;
  const catSel   = document.getElementById('newItemCat').value;
  const family   = document.getElementById('newItemFamily').value.trim();
  const variant  = document.getElementById('newItemVariant').value.trim();
  const barcode  = document.getElementById('newItemBarcode')?.value.trim();
  const imageUrl = document.getElementById('newItemImage')?.value.trim();
  const cost     = parseLocalNum(document.getElementById('newItemCost').value) || 0;
  const contract = document.getElementById('newItemContract').value.trim();

  if (!name)  { showToast('أدخل اسم الصنف', '⚠️'); return; }
  if (!price) { showToast('أدخل سعر البيع', '⚠️'); return; }

  let catId   = catSel;
  let catName = categories.find(c => c.id === catSel)?.name || '';

  // تصنيف جديد
  if (catSel === '__new__') {
    const newCatName = document.getElementById('newCatNameInput').value.trim();
    if (!newCatName) { showToast('أدخل اسم التصنيف الجديد', '⚠️'); return; }
    catId   = generateUUID();
    catName = newCatName;
    const newCat = { id: catId, name: catName, icon: '📦', sort_order: nextCatSort(), is_active: true };
    categories.push(newCat);
    DATA.categories = categories;
  }

  /* الاسم الأساسي = الاسم المُدخل مجرّداً من الصيغة إن كانت مذكورة في آخره
     (الحقل يطلب «الاسم الكامل» وقد يكتب المستخدم الصيغة ضمنه) */
  const baseName = (variant && name.length > variant.length && name.slice(-variant.length) === variant)
    ? name.slice(0, name.length - variant.length).trim()
    : name;

  const newItem = {
    id:             generateUUID(),
    category_id:    catId,
    category_name:  catName,
    /* إصلاح: كان family/option_name يسقطان على اسم التصنيف الرئيسي عند ترك
       حقل «التصنيف الفرعي» فارغاً — فيُخزَّن اسم التصنيف في عمود option_name */
    family:         family || baseName,
    option_name:    family || baseName,
    base_name:      baseName,
    variant:        variant,
    variant_clean:  variant,
    barcode:        barcode || null,
    /* نفس صيغة الأصناف المسحوبة من السحابة: «الاسم + الصيغة» */
    name:           variant ? (baseName + ' ' + variant) : baseName,
    price:          price,
    is_available:   true,
    /* إصلاح: كان sort_order = (عدد أصناف هذا التصنيف) + 1، بينما الترقيم في
       المنيو عامٌّ على كل التصنيفات (1..N) — فيسقط الصنف الجديد فوق رقم محجوز.
       مثال واقعي: «كريسبي برغر» أُضيف و«السندويشات والغربي» فيها 66 صنف ⇒ 67،
       والرقم 67 كان أصلاً لـ«سكالوب سندويشة - دبل».
       الآن: أكبر رقم موجود في المنيو كله + 1 ⇒ لا تصادم إطلاقاً. */
    sort_order:     items.reduce((m, i) => Math.max(m, Number(i.sort_order) || 0), 0) + 1,
    cost_mode:      'manual',
    cost_manual:    cost,
    contract_price: contract ? parseLocalNum(contract) : null,
    order_count:    0,
    is_pinned_popular: false,
    image_url:      imageUrl || null
  };

  items.push(newItem);
  DATA.items = [...items]; // Force proxy setter

  closeEditModal();
  activeCatId = catId;
  renderContent();
  showToast(`تمت إضافة: ${name}`, '✅');
  commitMenu();
}

/* ================================================================
   مودال تعديل تصنيف
   ================================================================ */
function openEditCat(id) {
  editingCatId = id;
  const cat = categories.find(c => c.id === id);
  if (!cat) return;

  document.getElementById('menuModalHead').innerHTML = `
    <span>✏️ تعديل التصنيف</span>
    <button onclick="closeEditModal()">✕</button>
  `;
  document.getElementById('menuModalBody').innerHTML = `

    <div class="mgr-form-row2">
      <div class="mgr-form-group">
        <label>اسم التصنيف</label>
        <input type="text" id="editCatName" value="${e(cat.name)}">
      </div>
      <div class="mgr-form-group">
        <label>الأيقونة (إيموجي)</label>
        <input type="text" id="editCatIcon" value="${e(cat.icon || '')}" placeholder="🍔">
      </div>
    </div>

    <div class="mgr-form-group">
      <label>الترتيب</label>
      <input type="text" id="editCatSort" value="${cat.sort_order || 0}" inputmode="numeric">
    </div>

    <div class="menu-avail-toggle-row">
      <span>حالة التصنيف</span>
      <label class="menu-toggle-label">
        <input type="checkbox" id="editCatActive" ${cat.is_active !== false ? 'checked' : ''}>
        <span class="menu-toggle-track"></span>
        <span class="menu-toggle-text">${cat.is_active !== false ? 'نشط' : 'موقوف'}</span>
      </label>
    </div>

    <!-- عرض الأصناف المرتبطة -->
    <div class="menu-cat-items-count">
      <span>عدد الأصناف في هذا التصنيف</span>
      <strong>${items.filter(i => i.category_id === id).length} صنف</strong>
    </div>

    <div class="menu-modal-footer">
      <button class="mgr-btn danger sm" onclick="deleteCat('${e(id)}')">🗑️ حذف التصنيف</button>
      <div style="display:flex;gap:8px;">
        <button class="mgr-btn outline sm" onclick="closeEditModal()">إلغاء</button>
        <button class="mgr-btn navy sm" onclick="saveCat('${e(id)}')">💾 حفظ</button>
      </div>
    </div>
  `;

  openModalEl();
}

function saveCat(id) {
  const cat = categories.find(c => c.id === id);
  if (!cat) return;
  cat.name       = document.getElementById('editCatName').value.trim() || cat.name;
  cat.icon       = document.getElementById('editCatIcon').value.trim();
  cat.sort_order = parseInt(document.getElementById('editCatSort').value) || cat.sort_order;
  cat.is_active  = document.getElementById('editCatActive').checked;
  // تحديث category_name في الأصناف المرتبطة
  items.filter(i => i.category_id === id).forEach(i => i.category_name = cat.name);
  const orig = DATA.categories.find(c => c.id === id);
  if (orig) Object.assign(orig, cat);
  closeEditModal();
  renderContent();
  showToast(`تم حفظ التصنيف: ${cat.name}`, '✅');
  commitMenu();
}

function deleteCat(id) {
  const doomedIds = items.filter(i => i.category_id === id).map(i => i.id);
  const cnt = doomedIds.length;
  const cat = categories.find(c => c.id === id);
  if (cnt > 0) {
    if (!confirm(`التصنيف "${cat?.name}" يحتوي ${cnt} صنف — هل تريد حذفهم جميعاً؟`)) return;
    items = items.filter(i => i.category_id !== id);
    DATA.items = DATA.items.filter(i => i.category_id !== id);
  } else {
    if (!confirm(`حذف التصنيف: ${cat?.name}؟`)) return;
  }
  categories = categories.filter(c => c.id !== id);
  DATA.categories = DATA.categories.filter(c => c.id !== id);
  if (activeCatId === id) activeCatId = null;
  closeEditModal();
  renderContent();
  showToast('تم حذف التصنيف', '🗑️');
  commitDelete('cat', id, doomedIds);
}

/* ── إضافة تصنيف سريع ── */
function openAddCat() {
  document.getElementById('menuModalHead').innerHTML = `
    <span>➕ إضافة تصنيف جديد</span>
    <button onclick="closeEditModal()">✕</button>
  `;
  document.getElementById('menuModalBody').innerHTML = `
    <div class="mgr-form-row2">
      <div class="mgr-form-group">
        <label>اسم التصنيف</label>
        <input type="text" id="newCatName" placeholder="مثال: المأكولات البحرية">
      </div>
      <div class="mgr-form-group">
        <label>الأيقونة</label>
        <input type="text" id="newCatIcon" placeholder="🦐" value="📦">
      </div>
    </div>
    <div class="menu-modal-footer">
      <button class="mgr-btn outline sm" onclick="closeEditModal()">إلغاء</button>
      <button class="mgr-btn navy sm" onclick="saveNewCat()">✅ إضافة</button>
    </div>
  `;
  openModalEl();
  setTimeout(() => document.getElementById('newCatName')?.focus(), 100);
}

/* ترتيب تصنيف جديد = أكبر ترتيب موجود + 1
   (سابقاً: categories.length + 1 وكان يصطدم بترتيب تصنيف قائم
    فيظهر التصنيفان معاً في آخر شريط الأزرار) */
function nextCatSort() {
  return categories.reduce((m, c) => Math.max(m, Number(c.sort_order) || 0), 0) + 1;
}

function saveNewCat() {
  const name = document.getElementById('newCatName').value.trim();
  const icon = document.getElementById('newCatIcon').value.trim() || '📦';
  if (!name) { showToast('أدخل اسم التصنيف', '⚠️'); return; }
  const newCat = {
    id: generateUUID(),
    name, icon,
    sort_order: nextCatSort(),
    is_active: true
  };
  categories.push(newCat);
  DATA.categories = categories;
  closeEditModal();
  renderContent();
  showToast(`تمت إضافة التصنيف: ${name}`, '✅');
  commitMenu();
}

/* ================================================================
   مودال — فتح / إغلاق
   ================================================================ */
function openModalEl() {
  document.getElementById('menuModalScrim').classList.add('show');
  document.getElementById('menuModal').classList.add('show');
}
function closeEditModal() {
  document.getElementById('menuModalScrim').classList.remove('show');
  document.getElementById('menuModal').classList.remove('show');
  editingItemId = null;
  editingCatId  = null;
}

/* ================================================================
   بحث / تصفية
   ================================================================ */
function onSearch(val) {
  searchTerm = val;
  renderContent();
}
function clearSearch() {
  searchTerm = '';
  renderContent();
}
function selectCat(id) {
  activeCatId = id;
  searchTerm  = '';
  renderContent();
}
function filterFamily(family) {
  searchTerm = family;
  renderContent();
}

/* ================================================================
   nav
   ================================================================ */
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

/* ── تشغيل ── */
(window.alfaStart||function(fn){fn();})(function () {
  categories = JSON.parse(JSON.stringify(DATA.categories || []));
  items      = JSON.parse(JSON.stringify(DATA.items || []));
  renderApp();
});



window.onNewItemCatChange = function(val) {
  const row = document.getElementById('newCatNameRow');
  if (row) row.style.display = val === '__new__' ? 'block' : 'none';
};
window.onEditItemCatChange = function(val) {
  const row = document.getElementById('editCatNameRow');
  if (row) row.style.display = val === '__new__' ? 'block' : 'none';
};
