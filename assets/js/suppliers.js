/* ================================================================
   suppliers.js — 🚚 الموردون (خطة شاشات الإدارة)
   الاسم · الهاتف · المواد الموردة · ملاحظات + ربط بسجل المشتريات
   ================================================================ */
const DATA = window.DEMO_DATA;
let suppliers = DATA.suppliers || [];
const MGR_NAV = window.AlfaNav.MGR_NAV;
const navLink = window.AlfaNav.linker('suppliers');

/* إجمالي المشتريات المسجلة من سجلات المخزون (type in) لكل مورد */
function supplierPurchases(id){
  let total = 0, count = 0, last = '';
  (DATA.inventory || []).forEach(inv => (inv.log || []).forEach(l => {
    if (l.type === 'in' && l.supplier_id === id) {
      total += (l.cost || 0); count++;
      if ((l.date || '') > last) last = l.date;
    }
  }));
  return { total, count, last };
}

function commitSupplier(row){
  if (window.AlfaDB && AlfaDB.upsert) AlfaDB.upsert('suppliers', row);
  else DATA.suppliers = suppliers.slice();
  if (window.SupplierSync) SupplierSync.pushSoon();
}

let editId = null;
function showSupplierForm(){ document.getElementById('supForm').style.display = 'block'; document.getElementById('supScrim').style.display = 'block'; }
function closeSupplierForm(){ document.getElementById('supForm').style.display = 'none'; document.getElementById('supScrim').style.display = 'none'; }
function clearSupplierForm(){ ['supName','supPhone','supMats','supNotes'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; }); }
function openAddSupplier(){ editId = null; clearSupplierForm(); showSupplierForm(); }
function openEditSupplier(id){
  editId = id;
  const s = suppliers.find(x => x.id === id); if (!s) return;
  document.getElementById('supName').value = s.name || '';
  document.getElementById('supPhone').value = s.phone || '';
  document.getElementById('supMats').value = s.materials || '';
  document.getElementById('supNotes').value = s.notes || '';
  showSupplierForm();
}
function saveSupplier(){
  const name = document.getElementById('supName').value.trim();
  if (!name) return showToast('اسم المورد إلزامي', '⚠️');
  const rec = {
    name,
    phone: document.getElementById('supPhone').value.trim(),
    materials: document.getElementById('supMats').value.trim(),
    notes: document.getElementById('supNotes').value.trim(),
  };
  if (editId) {
    const row = Object.assign(suppliers.find(x => x.id === editId), rec);
    commitSupplier(row);
    window.AlfaAudit.log('suppliers', 'تعديل مورد', name, 'المدير');
    showToast('عُدّل المورد', '🚚');
  } else {
    rec.id = 'sup_' + String(Date.now()).slice(-6);
    suppliers.push(rec);
    commitSupplier(rec);
    window.AlfaAudit.log('suppliers', 'إضافة مورد', name, 'المدير');
    showToast('أُضيف المورد', '🚚');
  }
  closeSupplierForm();
  render();
}
function deleteSupplier(id){
  const s = suppliers.find(x => x.id === id); if (!s) return;
  if (!confirm(`حذف المورد «${s.name}»؟`)) return;
  suppliers = suppliers.filter(x => x.id !== id);
  if (window.AlfaDB && AlfaDB.remove) AlfaDB.remove('suppliers', id);
  else DATA.suppliers = suppliers.slice();
  if (window.SupplierSync) { SupplierSync.remove(id); SupplierSync.pushSoon(); }
  window.AlfaAudit.log('suppliers', 'حذف مورد', s.name, 'المدير');
  showToast('حُذف المورد', '🗑️');
  render();
}

function render(){
  document.getElementById('supApp').innerHTML = `
  <div class="mgr-layout">
    <nav class="mgr-sidebar" id="mgrSidebar">
      <button class="mgr-side-toggle" onclick="document.getElementById('mgrSidebar').classList.toggle('expanded')">☰</button>
      <div class="mgr-side-logo"><strong>α</strong><span>alfaprosys</span></div>
      <div class="mgr-side-nav">${MGR_NAV.map(n => navLink(n)).join('')}</div>
      <div class="mgr-side-spacer"></div>
      <a class="mgr-side-link danger" href="index.html" onclick="sessionStorage.removeItem('alfaprosys_role')" title="خروج"><span class="mgr-side-ic">🚪</span><span class="mgr-side-lb">خروج</span></a>
    </nav>
    <div class="mgr-content-panel"><div id="mgrContent">
      <div class="mgr-page-header">
        <div>
          <div class="mgr-page-brand">alfaprosys</div>
          <div class="mgr-page-title">🚚 الموردون</div>
        </div>
        <button class="mgr-btn navy sm" onclick="openAddSupplier()">+ مورد جديد</button>
      </div>

      <div class="mgr-card" style="padding:0;overflow:hidden;">
        ${suppliers.length ? suppliers.map(s => {
          const p = supplierPurchases(s.id);
          return `
          <div class="set-row offer-admin-row">
            <div class="offer-admin-info">
              <strong>${e(s.name)}</strong>
              <small>📞 ${e(s.phone || '—')} · ${e(s.materials || 'مواد غير محددة')}</small>
              ${p.count ? `<small>المشتريات المسجلة: ${p.count} عملية · ${fmtNum(p.total)} ل.س${p.last ? ` · آخرها ${e(p.last)}` : ''}</small>` : '<small>لا مشتريات مسجلة بعد</small>'}
            </div>
            <button class="set-btn" onclick="openEditSupplier('${e(s.id)}')">تعديل</button>
            <button class="set-del" onclick="deleteSupplier('${e(s.id)}')" title="حذف">🗑️</button>
          </div>`;
        }).join('') : '<div class="inv-empty">لا موردين بعد — أضف أول مورد</div>'}
      </div>
    </div></div>
  </div>

  <div class="mgr-nav-scrim" id="mgrNavScrim" onclick="document.getElementById('mgrMobileNav').classList.remove('open');document.getElementById('mgrNavScrim').classList.remove('show')"></div>
  <button class="mgr-fab" onclick="document.getElementById('mgrMobileNav').classList.add('open');document.getElementById('mgrNavScrim').classList.add('show')">☰</button>
  <nav class="mgr-mobile-nav" id="mgrMobileNav">
    <div class="mgr-mobile-nav-head"><strong>قائمة الإدارة</strong>
      <button onclick="document.getElementById('mgrMobileNav').classList.remove('open');document.getElementById('mgrNavScrim').classList.remove('show')">✕</button></div>
    <div class="mgr-mobile-nav-grid">
      ${MGR_NAV.map(n => navLink(n, true)).join('')}
      <a class="mgr-mobile-nav-link danger" href="index.html" onclick="sessionStorage.removeItem('alfaprosys_role')"><span>🚪</span><small>خروج</small></a>
    </div>
  </nav>

  <div class="inv-modal-scrim" id="supScrim" onclick="closeSupplierForm()" style="position:fixed;inset:0;background:rgba(15,23,42,.5);z-index:60;display:none;"></div>
  <div id="supForm" style="display:none;position:fixed;z-index:61;top:50%;left:50%;transform:translate(-50%,-50%);width:min(430px,calc(100vw - 26px));background:var(--surface);border-radius:16px;border:1.5px solid var(--line);padding:20px;box-shadow:0 24px 60px rgba(15,23,42,.3);">
    <strong style="display:block;margin-bottom:12px;">${editId ? 'تعديل مورد' : 'مورد جديد'}</strong>
    <div style="display:flex;flex-direction:column;gap:8px;">
      <input id="supName" placeholder="اسم المورد" style="padding:10px;border-radius:10px;border:1.5px solid var(--line);font-family:inherit;">
      <input id="supPhone" placeholder="الهاتف" style="padding:10px;border-radius:10px;border:1.5px solid var(--line);font-family:inherit;">
      <input id="supMats" placeholder="المواد الموردة (مثال: دجاج، خبز)" style="padding:10px;border-radius:10px;border:1.5px solid var(--line);font-family:inherit;">
      <input id="supNotes" placeholder="ملاحظات" style="padding:10px;border-radius:10px;border:1.5px solid var(--line);font-family:inherit;">
    </div>
    <div style="display:flex;gap:8px;margin-top:14px;">
      <button class="set-btn" style="flex:1;" onclick="closeSupplierForm()">إلغاء</button>
      <button class="set-btn primary" style="flex:1;" onclick="saveSupplier()">حفظ</button>
    </div>
  </div>`;
}
(window.alfaStart||function(fn){fn();})(function () {
  suppliers = DATA.suppliers || [];
  render();
});

