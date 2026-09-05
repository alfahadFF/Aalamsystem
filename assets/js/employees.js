/* ================================================================
   employees.js — شاشة الموظفين — alfaprosys
   ================================================================ */

const DATA = window.DEMO_DATA;
let employees = JSON.parse(JSON.stringify(DATA.employees || []));

/* ── أدوات ── */
/* ================================================================
   الثوابت
   ================================================================ */
const SHIFTS = ['صباحية', 'مسائية', 'ليلية', 'مرنة', 'كاملة'];

const ROLES_LIST = [
  'مدير', 'كاشير', 'طاهي', 'نادل', 'سائق', 'مستودعجي', 'عامل نظافة', 'محاسب'
];

const SALARY_TYPES = {
  daily:   { label: 'يومي',   icon: '📅' },
  weekly:  { label: 'أسبوعي', icon: '📆' },
  monthly: { label: 'شهري',   icon: '🗓️' },
};

const LOG_TYPES = {
  salary:    { label: 'راتب',     icon: '💵', color: 'green' },
  advance:   { label: 'سلفة',     icon: '🔄', color: 'gold'  },
  bonus:     { label: 'مكافأة',   icon: '🎁', color: 'blue'  },
  deduction: { label: 'خصم',      icon: '➖', color: 'red'   },
};

/* ================================================================
   التنقل
   ================================================================ */
const MGR_NAV = window.AlfaNav.MGR_NAV;
const CURRENT = 'employees';
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
let filterRole   = 'all';
let filterShift  = 'all';
let searchTerm   = '';
let openEmpId    = null;   // accordion
let openTab      = {};     // { empId: 'info' | 'salary' | 'log' }

/* ================================================================
   البناء الرئيسي
   ================================================================ */
function renderApp() {
  document.getElementById('empApp').innerHTML = `
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
        <div id="empContent"></div>
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

    <!-- مودال الموظف -->
    <div class="emp-modal-scrim" id="empModalScrim" onclick="closeEmpModal()"></div>
    <div class="emp-modal" id="empModal" role="dialog">
      <div class="emp-modal-head">
        <span id="empModalTitle">إضافة موظف</span>
        <button onclick="closeEmpModal()">✕</button>
      </div>
      <div class="emp-modal-body" id="empModalBody"></div>
    </div>

    <!-- مودال السجل المالي -->
    <div class="emp-modal-scrim" id="logModalScrim" onclick="closeLogModal()"></div>
    <div class="emp-modal wide" id="logModal" role="dialog">
      <div class="emp-modal-head">
        <span id="logModalTitle">السجل المالي</span>
        <button onclick="closeLogModal()">✕</button>
      </div>
      <div class="emp-modal-body" id="logModalBody"></div>
    </div>
  `;
  renderContent();
}

/* ================================================================
   المحتوى الرئيسي
   ================================================================ */
function renderContent() {
  const totalSalaries = employees.reduce((s, emp) => {
    if (emp.salary_type === 'monthly') return s + (emp.salary_amount || 0);
    return s;
  }, 0);

  const totalPaidThisMonth = employees.reduce((s, emp) => {
    const thisMonth = new Date().toISOString().slice(0, 7);
    return s + (emp.salary_log || [])
      .filter(l => l.date?.startsWith(thisMonth) && l.type !== 'deduction')
      .reduce((ss, l) => ss + (l.amount || 0), 0);
  }, 0);

  const totalAdvances = employees.reduce((s, emp) =>
    s + (emp.salary_log || []).filter(l => l.type === 'advance')
      .reduce((ss, l) => ss + (l.amount || 0), 0), 0);

  document.getElementById('empContent').innerHTML = `

    <!-- رأس الصفحة -->
    <div class="mgr-page-header">
      <div>
        <div class="mgr-page-brand">alfaprosys</div>
        <div class="mgr-page-title">👤 الموظفون</div>
      </div>
      <button class="mgr-btn navy sm" onclick="openAddEmp()">+ موظف جديد</button>
    </div>

    <!-- إحصائيات -->
    <div class="mgr-stats-grid" style="margin-bottom:12px;">
      <div class="mgr-stat-card blue">
        <div class="mgr-stat-lbl">إجمالي الموظفين</div>
        <div class="mgr-stat-val">${employees.length}</div>
        <div class="mgr-stat-sub">موظف نشط</div>
      </div>
      <div class="mgr-stat-card gold">
        <div class="mgr-stat-lbl">رواتب شهرية</div>
        <div class="mgr-stat-val">${fmtNum(totalSalaries)}</div>
        <div class="mgr-stat-sub">ل.س / شهر</div>
      </div>
      <div class="mgr-stat-card green">
        <div class="mgr-stat-lbl">مدفوع هذا الشهر</div>
        <div class="mgr-stat-val">${fmtNum(totalPaidThisMonth)}</div>
        <div class="mgr-stat-sub">ل.س</div>
      </div>
      <div class="mgr-stat-card red">
        <div class="mgr-stat-lbl">السلف القائمة</div>
        <div class="mgr-stat-val">${fmtNum(totalAdvances)}</div>
        <div class="mgr-stat-sub">ل.س</div>
      </div>
    </div>

    <!-- فلاتر -->
    <div class="emp-filters">
      <div class="emp-filter-strip" id="roleFilterStrip">
        ${buildRoleChips()}
      </div>
      <div class="emp-filter-strip" id="shiftFilterStrip">
        ${buildShiftChips()}
      </div>
    </div>

    <!-- بحث -->
    <div class="cust-search-bar" style="margin-bottom:12px;">
      <span>🔍</span>
      <input id="empSearch" type="text" inputmode="search"
        placeholder="ابحث باسم الموظف أو وظيفته…"
        oninput="onEmpSearch(this.value)" value="${e(searchTerm)}" />
      <button id="empSearchClear" onclick="clearEmpSearch()"
        style="display:${searchTerm ? '' : 'none'};">✕</button>
    </div>

    <!-- قائمة الموظفين -->
    <div id="empListWrap">${renderEmpList()}</div>
  `;
}

/* ── شرائح الفلتر ── */
function buildRoleChips() {
  const roles = ['all', ...new Set(employees.map(e => e.role).filter(Boolean))];
  return roles.map(r => `
    <button class="emp-chip ${filterRole === r ? 'active' : ''}"
      onclick="setRoleFilter('${e(r)}')">
      ${r === 'all' ? '👥 الكل' : e(r)}
      <span>${r === 'all' ? employees.length : employees.filter(emp => emp.role === r).length}</span>
    </button>`).join('');
}
function buildShiftChips() {
  const shifts = ['all', ...new Set(employees.map(e => e.shift).filter(Boolean))];
  return shifts.map(s => `
    <button class="emp-chip shift ${filterShift === s ? 'active' : ''}"
      onclick="setShiftFilter('${e(s)}')">
      ${s === 'all' ? '🕐 كل الورديات' : e(s)}
    </button>`).join('');
}

/* ── فلترة ── */
function filteredEmps() {
  let list = employees;
  if (filterRole  !== 'all') list = list.filter(emp => emp.role === filterRole);
  if (filterShift !== 'all') list = list.filter(emp => emp.shift === filterShift);
  if (searchTerm) {
    const q = searchTerm.toLowerCase();
    list = list.filter(emp =>
      emp.name?.toLowerCase().includes(q) ||
      emp.role?.toLowerCase().includes(q) ||
      emp.phone?.includes(q)
    );
  }
  return list;
}
function setRoleFilter(r) {
  filterRole = r;
  rebuildContent();
}
function setShiftFilter(s) {
  filterShift = s;
  rebuildContent();
}
function onEmpSearch(val) {
  searchTerm = val.trim().toLowerCase();
  document.getElementById('empSearchClear').style.display = searchTerm ? '' : 'none';
  document.getElementById('empListWrap').innerHTML = renderEmpList();
}
function clearEmpSearch() {
  searchTerm = '';
  document.getElementById('empSearch').value = '';
  document.getElementById('empSearchClear').style.display = 'none';
  document.getElementById('empListWrap').innerHTML = renderEmpList();
}

/* ================================================================
   قائمة الموظفين — accordion
   ================================================================ */
function renderEmpList() {
  const list = filteredEmps();
  if (!list.length) return `
    <div class="emp-empty">لا يوجد موظفون مطابقون</div>`;

  return `<div class="mgr-card" style="padding:0;overflow:hidden;">
    ${list.map(emp => renderEmpRow(emp)).join('')}
  </div>`;
}

function renderEmpRow(emp) {
  const isOpen = openEmpId === emp.id;
  const tab    = openTab[emp.id] || 'info';
  const st     = SALARY_TYPES[emp.salary_type] || SALARY_TYPES.monthly;

  // الشهر الحالي
  const thisMonth = new Date().toISOString().slice(0, 7);
  const paidThisMonth = (emp.salary_log || [])
    .filter(l => l.date?.startsWith(thisMonth) && l.type !== 'deduction')
    .reduce((s, l) => s + (l.amount || 0), 0);
  const remaining = (emp.salary_amount || 0) - paidThisMonth;

  return `
    <div class="emp-row ${isOpen ? 'open' : ''}" id="erow_${e(emp.id)}">
      <!-- صف رئيسي -->
      <div class="emp-row-main" onclick="toggleEmp('${e(emp.id)}')">
        <div class="emp-avatar">${e(emp.name).charAt(0)}</div>
        <div class="emp-row-info">
          <div class="emp-row-name">
            ${e(emp.name)}
            <span class="emp-badge role">${e(emp.role || '—')}</span>
            <span class="emp-badge shift">${e(emp.shift || '—')}</span>
          </div>
          <div class="emp-row-sub">
            ${e(emp.shift_start || '')}${emp.shift_end ? ' — ' + e(emp.shift_end) : ''}
            ${emp.phone ? `<span>· ${e(emp.phone)}</span>` : ''}
          </div>
        </div>
        <div class="emp-row-salary">
          <div class="emp-salary-val">${fmtNum(emp.salary_amount)}</div>
          <div class="emp-salary-type">${st.icon} ${st.label}</div>
        </div>
        <div class="emp-row-chevron ${isOpen ? 'open' : ''}">›</div>
      </div>

      <!-- تفاصيل accordion -->
      <div class="emp-row-detail ${isOpen ? 'open' : ''}">
        <div class="emp-detail-inner">

          <!-- تابز -->
          <div class="emp-tabs">
            <button class="emp-tab ${tab === 'info'   ? 'active' : ''}"
              onclick="setTab('${e(emp.id)}','info')">📋 بيانات</button>
            <button class="emp-tab ${tab === 'salary' ? 'active' : ''}"
              onclick="setTab('${e(emp.id)}','salary')">💰 الراتب</button>
            <button class="emp-tab ${tab === 'log'    ? 'active' : ''}"
              onclick="setTab('${e(emp.id)}','log')">📜 السجل</button>
          </div>

          <!-- تاب: البيانات -->
          ${tab === 'info' ? `
          <div class="emp-tab-content">
            <div class="emp-fields-grid">
              <div class="emp-field"><span>الاسم</span><strong>${e(emp.name)}</strong></div>
              <div class="emp-field"><span>العمر</span><strong>${emp.age ? emp.age + ' سنة' : '—'}</strong></div>
              <div class="emp-field"><span>الوظيفة</span><strong>${e(emp.role || '—')}</strong></div>
              <div class="emp-field"><span>الوردية</span><strong>${e(emp.shift || '—')}</strong></div>
              <div class="emp-field"><span>بداية الدوام</span><strong>${e(emp.shift_start || '—')}</strong></div>
              <div class="emp-field"><span>نهاية الدوام</span><strong>${e(emp.shift_end || '—')}</strong></div>
              <div class="emp-field"><span>رقم الهاتف</span><strong dir="ltr">${e(emp.phone || '—')}</strong></div>
              <div class="emp-field"><span>تاريخ التعيين</span><strong>${e(emp.hire_date || '—')}</strong></div>
              ${emp.notes ? `<div class="emp-field full"><span>ملاحظات</span><strong>${e(emp.notes)}</strong></div>` : ''}
            </div>
            <div class="emp-detail-actions">
              <button class="emp-action-btn primary" onclick="openEditEmp('${e(emp.id)}')">✏️ تعديل</button>
              <button class="emp-action-btn danger"  onclick="deleteEmp('${e(emp.id)}')">🗑 حذف</button>
            </div>
          </div>` : ''}

          <!-- تاب: الراتب -->
          ${tab === 'salary' ? `
          <div class="emp-tab-content">
            <div class="emp-salary-summary">
              <div class="emp-salary-cell">
                <div class="emp-salary-cell-val">${fmtNum(emp.salary_amount)}</div>
                <div class="emp-salary-cell-lbl">الراتب (${st.label})</div>
              </div>
              <div class="emp-salary-cell green">
                <div class="emp-salary-cell-val">${fmtNum(paidThisMonth)}</div>
                <div class="emp-salary-cell-lbl">مدفوع هذا الشهر</div>
              </div>
              <div class="emp-salary-cell ${remaining > 0 ? 'red' : ''}">
                <div class="emp-salary-cell-val">${fmtNum(Math.max(0, remaining))}</div>
                <div class="emp-salary-cell-lbl">الباقي المستحق</div>
              </div>
            </div>

            <!-- أزرار الدفع -->
            <div class="emp-pay-actions">
              <button class="emp-pay-btn salary"  onclick="openPayModal('${e(emp.id)}','salary')">
                💵 دفع راتب
              </button>
              <button class="emp-pay-btn advance" onclick="openPayModal('${e(emp.id)}','advance')">
                🔄 منح سلفة
              </button>
              <button class="emp-pay-btn bonus"   onclick="openPayModal('${e(emp.id)}','bonus')">
                🎁 مكافأة
              </button>
              <button class="emp-pay-btn deduct"  onclick="openPayModal('${e(emp.id)}','deduction')">
                ➖ خصم
              </button>
            </div>

            <!-- آخر 3 حركات -->
            <div class="emp-log-mini">
              <div class="emp-log-mini-title">آخر الحركات</div>
              ${(emp.salary_log || []).slice(0, 3).length
                ? (emp.salary_log || []).slice(0, 3).map(l => renderLogRow(l)).join('')
                : `<div class="emp-no-log">لا توجد حركات بعد</div>`}
              ${(emp.salary_log || []).length > 3
                ? `<button class="emp-see-all-btn"
                    onclick="setTab('${e(emp.id)}','log')">عرض كل السجل ←</button>`
                : ''}
            </div>
          </div>` : ''}

          <!-- تاب: السجل الكامل -->
          ${tab === 'log' ? `
          <div class="emp-tab-content">
            <div class="emp-log-header">
              <span class="emp-log-header-title">📜 السجل المالي الكامل</span>
              <button class="emp-pay-btn salary sm" onclick="openPayModal('${e(emp.id)}','salary')">+ حركة جديدة</button>
            </div>
            ${(emp.salary_log || []).length
              ? `<div class="emp-log-list">${(emp.salary_log || []).map((l, i) => renderLogRow(l, emp.id, i)).join('')}</div>`
              : `<div class="emp-no-log">لا توجد حركات بعد</div>`}

            ${(emp.deductions_log || []).length ? `
            <div class="emp-log-mini-title" style="margin-top:14px;">📉 سجل الخصومات</div>
            <div class="emp-log-list">
              ${emp.deductions_log.map((d, i) => `
                <div class="emp-log-row deduction">
                  <div class="emp-log-type-icon">➖</div>
                  <div class="emp-log-info">
                    <div class="emp-log-note">${e(d.reason || 'خصم')}</div>
                    <div class="emp-log-date">${e(d.date)}</div>
                  </div>
                  <div class="emp-log-amount red">− ${fmtNum(d.amount)} ل.س</div>
                  <button class="emp-del-log-btn"
                    onclick="deleteDeduction('${e(emp.id)}',${i})">✕</button>
                </div>`).join('')}
            </div>` : ''}
          </div>` : ''}

        </div>
      </div>
    </div>`;
}

function renderLogRow(l, empId = null, idx = null) {
  const lt = LOG_TYPES[l.type] || LOG_TYPES.salary;
  const isNeg = l.type === 'deduction';
  return `
    <div class="emp-log-row">
      <div class="emp-log-type-icon">${lt.icon}</div>
      <div class="emp-log-info">
        <div class="emp-log-note">${e(l.note || lt.label)}</div>
        <div class="emp-log-date">${e(l.date)} · <span class="emp-log-badge ${lt.color}">${lt.label}</span></div>
      </div>
      <div class="emp-log-amount ${isNeg ? 'red' : 'green'}">
        ${isNeg ? '−' : '+'} ${fmtNum(l.amount)} ل.س
      </div>
      ${empId !== null && idx !== null
        ? `<button class="emp-del-log-btn" onclick="deleteLogEntry('${e(empId)}',${idx})">✕</button>`
        : ''}
    </div>`;
}

/* ── accordion ── */
function toggleEmp(id) {
  openEmpId = openEmpId === id ? null : id;
  if (!openTab[id]) openTab[id] = 'info';
  document.getElementById('empListWrap').innerHTML = renderEmpList();
}
function setTab(empId, tab) {
  openEmpId = empId;
  openTab[empId] = tab;
  document.getElementById('empListWrap').innerHTML = renderEmpList();
}

/* ================================================================
   مودال إضافة / تعديل موظف
   ================================================================ */
let editingEmpId = null;

function openAddEmp() {
  editingEmpId = null;
  document.getElementById('empModalTitle').textContent = '+ إضافة موظف جديد';
  document.getElementById('empModalBody').innerHTML = buildEmpForm(null);
  openModal('empModal', 'empModalScrim');
}
function openEditEmp(id) {
  const emp = employees.find(x => x.id === id);
  if (!emp) return;
  editingEmpId = id;
  document.getElementById('empModalTitle').textContent = 'تعديل بيانات موظف';
  document.getElementById('empModalBody').innerHTML = buildEmpForm(emp);
  openModal('empModal', 'empModalScrim');
}
function buildEmpForm(emp) {
  const roleVal      = emp?.role        || '';
  const shiftVal     = emp?.shift       || '';
  const salTypeVal   = emp?.salary_type || 'monthly';

  return `
    <!-- البيانات الشخصية -->
    <div class="emp-form-section-title">👤 البيانات الشخصية</div>
    <div class="emp-form-grid">
      <label class="emp-field-label full">الاسم الكامل
        <input id="efName" class="emp-field-input" type="text"
          placeholder="اسم الموظف" value="${e(emp?.name || '')}" />
      </label>
      <label class="emp-field-label">العمر
        <input id="efAge" class="emp-field-input" type="number"
          inputmode="numeric" placeholder="28" value="${e(emp?.age || '')}" />
      </label>
      <label class="emp-field-label">رقم الهاتف
        <input id="efPhone" class="emp-field-input" type="tel"
          inputmode="tel" placeholder="09xxxxxxxx" value="${e(emp?.phone || '')}" />
      </label>
      <label class="emp-field-label">تاريخ التعيين
        <input id="efHireDate" class="emp-field-input" type="date"
          value="${e(emp?.hire_date || new Date().toISOString().split('T')[0])}" />
      </label>
      <label class="emp-field-label full">ملاحظات (اختياري)
        <input id="efNotes" class="emp-field-input" type="text"
          placeholder="أي ملاحظات إضافية" value="${e(emp?.notes || '')}" />
      </label>
    </div>

    <!-- الوظيفة -->
    <div class="emp-form-section-title">💼 الوظيفة</div>
    <input type="hidden" id="efRole" value="${e(roleVal)}" />
    <div class="emp-pick-grid" id="efRoleGrid">
      ${ROLES_LIST.map(r => `
        <button type="button"
          class="emp-pick-btn ${roleVal === r ? 'active' : ''}"
          onclick="pickVal('efRole','efRoleGrid',this,'${e(r)}')">${e(r)}</button>`).join('')}
    </div>
    <input id="efRoleCustom" class="emp-field-input" type="text"
      style="margin-top:8px;"
      placeholder="وظيفة أخرى (اكتب هنا)"
      value="${e(ROLES_LIST.includes(roleVal) ? '' : roleVal)}"
      oninput="pickCustom('efRole',this.value)" />

    <!-- الوردية -->
    <div class="emp-form-section-title">🕐 الوردية والدوام</div>
    <input type="hidden" id="efShift" value="${e(shiftVal)}" />
    <div class="emp-pick-grid" id="efShiftGrid">
      ${SHIFTS.map(s => `
        <button type="button"
          class="emp-pick-btn ${shiftVal === s ? 'active' : ''}"
          onclick="pickVal('efShift','efShiftGrid',this,'${e(s)}')">${e(s)}</button>`).join('')}
    </div>
    <div class="emp-form-grid" style="margin-top:10px;">
      <label class="emp-field-label">بداية الدوام
        <input id="efShiftStart" class="emp-field-input" type="time"
          value="${e(emp?.shift_start || '')}" />
      </label>
      <label class="emp-field-label">نهاية الدوام
        <input id="efShiftEnd" class="emp-field-input" type="time"
          value="${e(emp?.shift_end || '')}" />
      </label>
    </div>

    <!-- الراتب -->
    <div class="emp-form-section-title">💰 الراتب</div>
    <input type="hidden" id="efSalaryType" value="${e(salTypeVal)}" />
    <div class="emp-pick-grid" id="efSalTypeGrid" style="margin-bottom:10px;">
      ${Object.entries(SALARY_TYPES).map(([k,v]) => `
        <button type="button"
          class="emp-pick-btn ${salTypeVal === k ? 'active' : ''}"
          onclick="pickVal('efSalaryType','efSalTypeGrid',this,'${k}')">${v.icon} ${v.label}</button>`).join('')}
    </div>
    <label class="emp-field-label">المبلغ (ل.س)
      <div style="display:flex;gap:6px;align-items:center;">
        <input id="efSalaryAmount" class="emp-field-input" type="number"
          inputmode="numeric" placeholder="مثال: 1500000"
          value="${e(emp?.salary_amount || '')}" style="flex:1;" />
        <span class="emp-currency-badge">ل.س</span>
      </div>
    </label>

    <button class="emp-save-btn" onclick="saveEmp()">💾 حفظ الموظف</button>
  `;
}

/* ── اختيار من الشبكة ── */
function pickVal(hiddenId, gridId, btn, val) {
  document.getElementById(hiddenId).value = val;
  document.querySelectorAll(`#${gridId} .emp-pick-btn`).forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  // مسح حقل النص المخصص إن وجد (للوظيفة)
  const custom = document.getElementById('efRoleCustom');
  if (hiddenId === 'efRole' && custom) custom.value = '';
}
function pickCustom(hiddenId, val) {
  document.getElementById(hiddenId).value = val;
  // إلغاء تحديد كل الـ chips
  const grid = document.getElementById('efRoleGrid');
  if (grid) grid.querySelectorAll('.emp-pick-btn').forEach(b => b.classList.remove('active'));
}

function saveEmp() {
  const name        = document.getElementById('efName').value.trim();
  const age         = parseInt(document.getElementById('efAge').value) || null;
  const phone       = document.getElementById('efPhone').value.trim();
  const hireDate    = document.getElementById('efHireDate').value;
  const notes       = document.getElementById('efNotes').value.trim();
  const role = document.getElementById('efRole').value.trim();
  const shift       = document.getElementById('efShift').value;
  const shiftStart  = document.getElementById('efShiftStart').value;
  const shiftEnd    = document.getElementById('efShiftEnd').value;
  const salaryType  = document.getElementById('efSalaryType').value;
  const salaryAmt   = Number(document.getElementById('efSalaryAmount').value) || 0;

  if (!name) { showToast('الاسم مطلوب', '⚠️'); return; }
  if (!salaryAmt) { showToast('أدخل مبلغ الراتب', '⚠️'); return; }

  const payload = {
    name, age, phone, hire_date: hireDate, notes, role,
    shift, shift_start: shiftStart, shift_end: shiftEnd,
    salary_type: salaryType, salary_amount: salaryAmt,
  };

  if (editingEmpId) {
    const idx = employees.findIndex(x => x.id === editingEmpId);
    if (idx > -1) employees[idx] = { ...employees[idx], ...payload };
    showToast('تم تحديث بيانات الموظف', '✏️');
  } else {
    employees.unshift({
      id: 'emp_' + Date.now(), ...payload,
      salary_log: [], deductions_log: []
    });
    showToast('تمت إضافة الموظف', '👤');
  }
  DATA.employees = employees;
  if (window.EmployeeSync) EmployeeSync.pushSoon();
  closeEmpModal();
  rebuildContent();
}

function deleteEmp(id) {
  const emp = employees.find(x => x.id === id);
  if (!confirm(`حذف الموظف "${emp?.name}" نهائياً؟`)) return;
  employees = employees.filter(x => x.id !== id);
  if (openEmpId === id) openEmpId = null;
  DATA.employees = employees;
  if (window.EmployeeSync) { EmployeeSync.remove(id); EmployeeSync.pushSoon(); }
  showToast('تم حذف الموظف', '🗑');
  rebuildContent();
}

/* ================================================================
   مودال الدفع / السلفة / المكافأة / الخصم
   ================================================================ */
let payEmpId   = null;
let payType    = 'salary';

function openPayModal(empId, type) {
  payEmpId = empId;
  payType  = type;
  const emp = employees.find(x => x.id === empId);
  const lt  = LOG_TYPES[type] || LOG_TYPES.salary;

  document.getElementById('empModalTitle').textContent = `${lt.icon} ${lt.label} — ${e(emp?.name || '')}`;
  document.getElementById('empModalBody').innerHTML = `
    <div class="emp-form-grid">
      <label class="emp-field-label full">المبلغ (ل.س)
        <div style="display:flex;gap:6px;align-items:center;">
          <input id="payAmount" class="emp-field-input" type="number"
            inputmode="numeric" placeholder="أدخل المبلغ"
            ${type === 'salary' ? `value="${e(emp?.salary_amount || '')}"` : ''} style="flex:1;" />
          <span class="emp-currency-badge">ل.س</span>
        </div>
      </label>
      <label class="emp-field-label">التاريخ
        <input id="payDate" class="emp-field-input" type="date"
          value="${new Date().toISOString().split('T')[0]}" />
      </label>
      <label class="emp-field-label">ملاحظة (اختياري)
        <input id="payNote" class="emp-field-input" type="text"
          placeholder="${lt.label}…" />
      </label>
    </div>
    <button class="emp-pay-confirm-btn ${type}" onclick="savePay()">
      ${lt.icon} تأكيد ${lt.label}
    </button>
  `;
  openModal('empModal', 'empModalScrim');
  setTimeout(() => document.getElementById('payAmount')?.focus(), 60);
}

function savePay() {
  const amount = Number(document.getElementById('payAmount').value);
  const date   = document.getElementById('payDate').value;
  const note   = document.getElementById('payNote').value.trim();
  const lt     = LOG_TYPES[payType] || LOG_TYPES.salary;

  if (!amount) { showToast('أدخل المبلغ', '⚠️'); return; }
  if (!date)   { showToast('اختر التاريخ', '⚠️'); return; }

  const idx = employees.findIndex(x => x.id === payEmpId);
  if (idx < 0) return;

  if (!employees[idx].salary_log) employees[idx].salary_log = [];

  employees[idx].salary_log.unshift({
    id: 'sl_' + Date.now(), date, amount, type: payType,
    note: note || lt.label
  });

  DATA.employees = employees;
  if (window.EmployeeSync) EmployeeSync.pushSoon();
  closeEmpModal();
  showToast(`تم تسجيل ${lt.label} بقيمة ${fmtNum(amount)} ل.س`, lt.icon);
  // إعادة فتح نفس التاب
  openTab[payEmpId] = 'salary';
  openEmpId = payEmpId;
  rebuildContent();
}

function deleteLogEntry(empId, idx) {
  if (!confirm('حذف هذه الحركة؟')) return;
  const ei = employees.findIndex(x => x.id === empId);
  if (ei < 0) return;
  employees[ei].salary_log.splice(idx, 1);
  DATA.employees = employees;
  if (window.EmployeeSync) EmployeeSync.pushSoon();
  openEmpId = empId;
  openTab[empId] = 'log';
  rebuildContent();
  showToast('تم حذف الحركة', '🗑');
}
function deleteDeduction(empId, idx) {
  if (!confirm('حذف هذا الخصم؟')) return;
  const ei = employees.findIndex(x => x.id === empId);
  if (ei < 0) return;
  employees[ei].deductions_log.splice(idx, 1);
  DATA.employees = employees;
  if (window.EmployeeSync) EmployeeSync.pushSoon();
  openEmpId = empId;
  openTab[empId] = 'log';
  rebuildContent();
  showToast('تم حذف الخصم', '🗑');
}

/* ================================================================
   أدوات المودال
   ================================================================ */
function openModal(modalId, scrimId) {
  document.getElementById(scrimId)?.classList.add('show');
  document.getElementById(modalId)?.classList.add('show');
}
function closeEmpModal() {
  document.getElementById('empModalScrim')?.classList.remove('show');
  document.getElementById('empModal')?.classList.remove('show');
}
function closeLogModal() {
  document.getElementById('logModalScrim')?.classList.remove('show');
  document.getElementById('logModal')?.classList.remove('show');
}

/* ================================================================
   إعادة بناء المحتوى
   ================================================================ */
function rebuildContent() {
  renderContent();
}

/* ── تشغيل ── */
(window.alfaStart||function(fn){fn();})(function () {
  employees = JSON.parse(JSON.stringify(DATA.employees || []));
  renderApp();
});
