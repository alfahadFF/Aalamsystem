/* ================================================================
   audit_log.js — 📜 سجل التعديلات الموحد (خطة شاشات الإدارة)
   من ألغى/حذف/عدّل/خصم/غيّر سعراً — الوقت والسبب — من كل النظام
   ================================================================ */
const DATA = window.DEMO_DATA;
const MGR_NAV = window.AlfaNav.MGR_NAV;
const navLink = window.AlfaNav.linker('audit_log');

const MODULES = {
  invoices:  { icon: '🧾', label: 'الفواتير' },
  settings:  { icon: '⚙️', label: 'الإعدادات' },
  inventory: { icon: '📦', label: 'المخزون' },
  suppliers: { icon: '🚚', label: 'الموردون' },
  pos:       { icon: '🖥️', label: 'الكاشير' },
  online:    { icon: '🛵', label: 'الأونلاين' },
};
let modFilter = 'all';
function setModFilter(m){ modFilter = m; renderAudit(); }

function fmtWhen(at){
  const d = String(at || '');
  return d.replace('T', ' · ');
}

function renderAudit(){
  const all = DATA.audit_log || [];
  const list = modFilter === 'all' ? all : all.filter(l => l.module === modFilter);
  const mods = Object.keys(MODULES);

  document.getElementById('auditApp').innerHTML = `
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
          <div class="mgr-page-title">📜 سجل التعديلات</div>
        </div>
        <div style="font-size:10.5px;font-weight:800;color:var(--text-muted);">كل حذف وتعديل وخصم وإلغاء في مكان واحد — الوقت والفاعل</div>
      </div>

      <div class="sh-kinds" style="margin-bottom:12px;">
        <button class="sh-kind ${modFilter==='all'?'active':''}" onclick="setModFilter('all')">الكل (${all.length})</button>
        ${mods.map(m => {
          const n = all.filter(l => l.module === m).length;
          return `<button class="sh-kind ${modFilter===m?'active':''}" onclick="setModFilter('${m}')">${MODULES[m].icon} ${MODULES[m].label} (${n})</button>`;
        }).join('')}
      </div>

      <div class="mgr-card" style="padding:0;overflow:hidden;">
        ${list.length ? `
        <div class="sh-table-wrap">
          <table class="sh-table">
            <thead><tr><th>الوقت</th><th>القسم</th><th>الإجراء</th><th>التفصيل</th><th>من</th></tr></thead>
            <tbody>
              ${list.map(l => { const m = MODULES[l.module] || { icon:'❓', label:l.module }; return `
              <tr>
                <td class="sh-date">${e(fmtWhen(l.at))}</td>
                <td class="sh-kind-cell">${m.icon} ${m.label}</td>
                <td style="font-weight:900;white-space:nowrap;">${e(l.action)}</td>
                <td class="sh-detail">${e(l.detail)}</td>
                <td style="font-weight:800;">${e(l.who)}</td>
              </tr>`; }).join('')}
            </tbody>
          </table>
        </div>` : `<div class="sh-empty">لا تسجيلات في هذا القسم بعد</div>`}
      </div>
    </div></div>
  </div>

  <div class="mgr-nav-scrim" onclick="document.getElementById('mgrMobileNav').classList.remove('open');this.classList.remove('show')"></div>
  <button class="mgr-fab" onclick="document.getElementById('mgrMobileNav').classList.add('open');document.getElementById('mgrNavScrim').classList.add('show')">☰</button>
  <nav class="mgr-mobile-nav" id="mgrMobileNav">
    <div class="mgr-mobile-nav-head"><strong>قائمة الإدارة</strong>
      <button onclick="document.getElementById('mgrMobileNav').classList.remove('open');document.getElementById('mgrNavScrim').classList.remove('show')">✕</button></div>
    <div class="mgr-mobile-nav-grid">
      ${MGR_NAV.map(n => navLink(n, true)).join('')}
      <a class="mgr-mobile-nav-link danger" href="index.html" onclick="sessionStorage.removeItem('alfaprosys_role')"><span>🚪</span><small>خروج</small></a>
    </div>
  </nav>`;
}
(window.alfaStart||function(fn){fn();})(renderAudit);
