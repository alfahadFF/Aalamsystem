/* ================================================================
   reports.js — شاشة التقارير الشاملة — alfaprosys
   ================================================================ */

const DATA      = window.DEMO_DATA;
let invoices, expenses, shifts, employees, customers, menuItems;
function bindReportData() {
  invoices  = DATA.invoices         || [];
  expenses  = DATA.expenditures     || [];
  shifts    = DATA.shifts_history   || [];
  employees = DATA.employees        || [];
  customers = DATA.customers        || [];
  menuItems = DATA.items            || [];
}

/* ── أدوات مساعدة ── */
function fmtMoney(n){ return fmtNum(n) + ' ل.س'; }
function fmtDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleDateString('ar-EG', { year:'numeric', month:'short', day:'numeric' });
}
/* ================================================================
   التنقل
   ================================================================ */
const MGR_NAV = window.AlfaNav.MGR_NAV;
const CURRENT = 'reports';
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
function buildNav() {
  const side   = document.getElementById('sideNav');
  const mobile = document.getElementById('mobileNavGrid');
  if (side)   side.innerHTML   = MGR_NAV.map(n => navLink(n, false)).join('');
  if (mobile) mobile.innerHTML = MGR_NAV.map(n => navLink(n, true)).join('');
}

/* ================================================================
   حالة الفلتر
   ================================================================ */
let currentPreset = 'today';
let currentTab    = 'summary';
let dateFrom      = '';
let dateTo        = '';

/* ── حساب نطاق التاريخ ── */
function calcRange(preset) {
  const now   = new Date();
  const pad   = n => String(n).padStart(2,'0');
  const fmt   = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const today = fmt(now);

  if (preset === 'today')  return { from: today, to: today };

  if (preset === 'week') {
    const day = now.getDay(); // 0=Sun
    const diff = (day === 0) ? 6 : day - 1;
    const mon = new Date(now); mon.setDate(now.getDate() - diff);
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
    return { from: fmt(mon), to: fmt(sun) };
  }

  if (preset === 'month') {
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const last  = new Date(now.getFullYear(), now.getMonth()+1, 0);
    return { from: fmt(first), to: fmt(last) };
  }

  if (preset === 'year') {
    return {
      from: `${now.getFullYear()}-01-01`,
      to:   `${now.getFullYear()}-12-31`
    };
  }

  if (preset === 'custom') {
    return { from: dateFrom, to: dateTo };
  }

  return { from: today, to: today };
}

function labelForRange(from, to) {
  if (from === to) return `📅 ${fmtDate(from)}`;
  return `📅 ${fmtDate(from)} — ${fmtDate(to)}`;
}

/* ── تصفية البيانات حسب التاريخ ── */
function inRange(dateStr, from, to) {
  if (!dateStr) return false;
  const d = dateStr.substring(0, 10);
  return (!from || d >= from) && (!to || d <= to);
}

function filteredShifts(from, to) {
  return shifts.filter(s => inRange(s.date, from, to));
}
function filteredInvoices(from, to) {
  return invoices.filter(inv => inRange(inv.date || inv.created_at, from, to));
}
function filteredExpenses(from, to) {
  return expenses.filter(ex => inRange(ex.date, from, to));
}

/* ================================================================
   ضبط الفلتر
   ================================================================ */
function setPreset(btn, preset) {
  currentPreset = preset;
  document.querySelectorAll('.rpt-preset').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  const customRow = document.getElementById('customRow');
  if (preset === 'custom') {
    customRow.style.display = 'flex';
  } else {
    customRow.style.display = 'none';
    applyFilter();
  }
}

function applyFilter() {
  const range = calcRange(currentPreset);

  if (currentPreset === 'custom') {
    dateFrom = document.getElementById('dateFrom')?.value || '';
    dateTo   = document.getElementById('dateTo')?.value   || '';
    range.from = dateFrom;
    range.to   = dateTo;
  } else {
    dateFrom = range.from;
    dateTo   = range.to;
  }

  const lbl = document.getElementById('periodLabel');
  if (lbl) lbl.textContent = labelForRange(range.from, range.to);
  updatePrintHead();

  renderTab(currentTab, range.from, range.to);
}

/* ================================================================
   التبويبات
   ================================================================ */
function switchTab(btn, tab) {
  currentTab = tab;
  document.querySelectorAll('.rpt-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const range = calcRange(currentPreset);
  renderTab(tab, range.from, range.to);
}

const TAB_LABELS = { summary:'الملخص', sales:'المبيعات', expenses:'المصروفات', items:'الأصناف', employees:'الموظفون', customers:'العملاء', compare:'مقارنة الفترات', cats:'التصنيفات', purchases:'المشتريات' };
function updatePrintHead(){
  const el = document.getElementById('rptPrintHead');
  if (el) el.textContent = `alfaprosys — تقرير ${TAB_LABELS[currentTab] || ''} · ${labelForRange(dateFrom, dateTo)} · طُبع في ${new Date().toLocaleString('ar')}`;
}

/* ================================================================
   ⬇️ تصدير التقرير — Excel (CSV) أو طباعة/PDF لما يُعرض الآن
   ================================================================ */
function toggleExportMenu(ev){
  ev.stopPropagation();
  document.getElementById('exportMenu')?.classList.toggle('open');
}
document.addEventListener('click', e => {
  if (!e.target.closest || !e.target.closest('.rpt-export'))
    document.getElementById('exportMenu')?.classList.remove('open');
});
function csvCell(v){
  v = String(v == null ? '' : v);
  return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
}
function csvClean(t){
  return String(t || '').replace(/\u00A0/g, ' ').replace(/ ل\.س/g, '').replace(/,/g, '').replace(/\s+/g, ' ').trim();
}
function exportReportCSV(){
  const rows = [
    ['alfaprosys — تقرير ' + (TAB_LABELS[currentTab] || currentTab)],
    ['الفترة', labelForRange(dateFrom, dateTo)],
    ['تاريخ التصدير', new Date().toLocaleString('ar')],
    [],
  ];
  const tables = document.querySelectorAll('#tabContent table');
  if (tables.length) {
    tables.forEach((tb, ti) => {
      if (ti) rows.push([]);
      tb.querySelectorAll('tr').forEach(tr =>
        rows.push([...tr.cells].map(td => csvClean(td.textContent))));
    });
  } else {
    document.querySelectorAll('#tabContent .rpt-kpi').forEach(k =>
      rows.push([
        csvClean(k.querySelector('.rpt-kpi-lbl')?.textContent),
        csvClean(k.querySelector('.rpt-kpi-val')?.textContent),
      ]));
  }
  const name = `تقرير-${TAB_LABELS[currentTab] || currentTab}-${dateFrom}_${dateTo}`;
  if (window.XLSX) {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = rows.reduce((a, r) => { r.forEach((v,i) => a[i] = { wch: Math.max(a[i]?.wch || 10, Math.min(42, String(v||'').length + 2)) }); return a; }, []);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'التقرير');
    XLSX.writeFile(wb, name + '.xlsx');
    showToast('تم تصدير ملف Excel فعلي', '📊');
  } else {
    const csv = '\uFEFF' + rows.map(r => r.map(csvCell).join(',')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = name + '.csv'; document.body.appendChild(a); a.click(); a.remove();
    showToast('تم تصدير CSV احتياطيًا', '📄');
  }
}
function printReport(){
  document.getElementById('exportMenu')?.classList.remove('open');
  updatePrintHead();
  setTimeout(() => window.print(), 60);
}

function renderTab(tab, from, to) {
  const el = document.getElementById('tabContent');
  if (!el) return;

  switch (tab) {
    case 'summary':   el.innerHTML = renderSummary(from, to);   break;
    case 'sales':     el.innerHTML = renderSales(from, to);     break;
    case 'expenses':  el.innerHTML = renderExpenses(from, to);  break;
    case 'items':     el.innerHTML = renderItems(from, to);     break;
    case 'employees': el.innerHTML = renderEmployees(from, to); break;
    case 'customers': el.innerHTML = renderCustomers(from, to); break;
    case 'compare':   el.innerHTML = renderCompare();            break;
    case 'cats':      el.innerHTML = renderCatsReport(from, to);  break;
    case 'purchases': el.innerHTML = renderPurchases(from, to);   break;
  }
}

/* ================================================================
   📊 تبويب الملخص
   ================================================================ */
function renderSummary(from, to) {
  const sh   = filteredShifts(from, to);
  const invs = filteredInvoices(from, to);
  const exps = filteredExpenses(from, to);

  /* ── إجماليات من الورديات (أكثر دقة) ── */
  const totalSales    = sh.reduce((s, x) => s + (x.sales_total || 0), 0);
  const totalExp      = sh.reduce((s, x) => s + (x.expenditures || 0), 0)
                       + exps.reduce((s, x) => s + (x.amount || 0), 0);
  const totalCash     = sh.reduce((s, x) => s + (x.by_payment?.cash || 0), 0);
  const totalDeferred = sh.reduce((s, x) => s + (x.by_payment?.deferred || 0), 0);
  const totalPartial  = sh.reduce((s, x) => s + (x.by_payment?.partial || 0), 0);
  const netCash       = totalSales - totalExp;

  const byType = {
    table:    sh.reduce((s,x)=>s+(x.by_type?.table||0),0),
    takeaway: sh.reduce((s,x)=>s+(x.by_type?.takeaway||0),0),
    delivery: sh.reduce((s,x)=>s+(x.by_type?.delivery||0),0),
  };

  const invCount  = sh.reduce((s,x)=>s+(x.invoices_count||0),0);
  const cancelled = sh.reduce((s,x)=>s+(x.cancelled_count||0),0);
  const avgInv    = invCount > 0 ? Math.round(totalSales / invCount) : 0;

  /* ── رسم بار حسب نوع ── */
  const typeTotal = byType.table + byType.takeaway + byType.delivery || 1;
  const bar = (val, color) => {
    const w = Math.round(val / typeTotal * 100);
    return `<div class="rpt-bar-seg" style="width:${w}%;background:${color}" title="${fmtMoney(val)}"></div>`;
  };

  /* ── رسم دونات بسيط (SVG) ── */
  const payTotal = totalCash + totalDeferred + totalPartial || 1;
  const donutSVG = buildDonut([
    { val: totalCash,     color: 'var(--fahad-blue)',  label: 'نقدي'    },
    { val: totalDeferred, color: 'var(--fahad-gold)',  label: 'آجل'     },
    { val: totalPartial,  color: 'var(--sage, #5BA08A)', label: 'جزئي'  },
  ], payTotal);

  /* ── رسم خط يومي (مبيعات) ── */
  const lineChart = buildDailySalesLine(sh, from, to);

  return `
  <div class="rpt-summary-grid">

    <!-- بطاقات الإجماليات -->
    <div class="rpt-kpi-row">
      <div class="rpt-kpi rpt-kpi-blue">
        <div class="rpt-kpi-icon">🧾</div>
        <div class="rpt-kpi-val">${fmtMoney(totalSales)}</div>
        <div class="rpt-kpi-lbl">إجمالي المبيعات</div>
      </div>
      <div class="rpt-kpi rpt-kpi-red">
        <div class="rpt-kpi-icon">💸</div>
        <div class="rpt-kpi-val">${fmtMoney(totalExp)}</div>
        <div class="rpt-kpi-lbl">إجمالي المصروفات</div>
      </div>
      <div class="rpt-kpi ${netCash>=0?'rpt-kpi-green':'rpt-kpi-red'}">
        <div class="rpt-kpi-icon">${netCash>=0?'📈':'📉'}</div>
        <div class="rpt-kpi-val">${fmtMoney(netCash)}</div>
        <div class="rpt-kpi-lbl">صافي الربح</div>
      </div>
      <div class="rpt-kpi rpt-kpi-gold">
        <div class="rpt-kpi-icon">🧾</div>
        <div class="rpt-kpi-val">${fmtNum(invCount)}</div>
        <div class="rpt-kpi-lbl">عدد الفواتير</div>
      </div>
    </div>

    <!-- رسم خط المبيعات اليومية -->
    <div class="rpt-card rpt-chart-card">
      <div class="rpt-card-title">📈 المبيعات اليومية</div>
      ${lineChart}
    </div>

    <!-- منحنى آخر 30 يوماً -->
    <div class="rpt-card rpt-chart-card">
      <div class="rpt-card-title">📅 منحنى آخر ٣٠ يوماً</div>
      ${buildCurve30()}
    </div>

    <!-- نوع الطلب + طريقة الدفع -->
    <div class="rpt-two-col">

      <div class="rpt-card">
        <div class="rpt-card-title">🍽️ توزيع نوع الطلب</div>
        <div class="rpt-bar-chart">
          <div class="rpt-bar-track">
            ${bar(byType.table,    'var(--fahad-blue)')}
            ${bar(byType.takeaway, 'var(--fahad-gold)')}
            ${bar(byType.delivery, 'var(--sage,#5BA08A)')}
          </div>
        </div>
        <div class="rpt-legend">
          <span class="rpt-leg-dot" style="background:var(--fahad-blue)"></span> طاولة ${fmtMoney(byType.table)}
          <span class="rpt-leg-dot" style="background:var(--fahad-gold)"></span> سفري ${fmtMoney(byType.takeaway)}
          <span class="rpt-leg-dot" style="background:var(--sage,#5BA08A)"></span> توصيل ${fmtMoney(byType.delivery)}
        </div>
      </div>

      <div class="rpt-card">
        <div class="rpt-card-title">💳 طريقة الدفع</div>
        <div class="rpt-donut-wrap">
          ${donutSVG}
          <div class="rpt-donut-center">
            <div class="rpt-donut-total">${fmtMoney(totalCash+totalDeferred+totalPartial)}</div>
            <div class="rpt-donut-sub">إجمالي</div>
          </div>
        </div>
        <div class="rpt-legend">
          <span class="rpt-leg-dot" style="background:var(--fahad-blue)"></span> نقدي ${fmtMoney(totalCash)}
          <span class="rpt-leg-dot" style="background:var(--fahad-gold)"></span> آجل ${fmtMoney(totalDeferred)}
          <span class="rpt-leg-dot" style="background:var(--sage,#5BA08A)"></span> جزئي ${fmtMoney(totalPartial)}
        </div>
      </div>

    </div>

    <!-- إحصاءات إضافية -->
    <div class="rpt-card">
      <div class="rpt-card-title">📋 إحصاءات إضافية</div>
      <div class="rpt-stats-grid">
        <div class="rpt-stat"><span class="rpt-stat-lbl">متوسط الفاتورة</span><span class="rpt-stat-val">${fmtMoney(avgInv)}</span></div>
        <div class="rpt-stat"><span class="rpt-stat-lbl">فواتير ملغاة</span><span class="rpt-stat-val">${fmtNum(cancelled)}</span></div>
        <div class="rpt-stat"><span class="rpt-stat-lbl">عدد الورديات</span><span class="rpt-stat-val">${fmtNum(sh.length)}</span></div>
        <div class="rpt-stat"><span class="rpt-stat-lbl">نسبة الإلغاء</span><span class="rpt-stat-val">${invCount>0?Math.round(cancelled/invCount*100):0}%</span></div>
        <div class="rpt-stat"><span class="rpt-stat-lbl">نسبة الربح</span><span class="rpt-stat-val">${totalSales>0?Math.round(netCash/totalSales*100):0}%</span></div>
        <div class="rpt-stat"><span class="rpt-stat-lbl">آجل متراكم</span><span class="rpt-stat-val">${fmtMoney(totalDeferred)}</span></div>
      </div>
    </div>

  </div>`;
}

/* ================================================================
   🧾 تبويب المبيعات
   ================================================================ */
function renderSales(from, to) {
  const sh = filteredShifts(from, to);

  if (!sh.length) return emptyState('لا توجد بيانات مبيعات في هذه الفترة');

  /* تجميع يومي */
  const byDay = {};
  sh.forEach(s => {
    if (!byDay[s.date]) byDay[s.date] = { sales:0, invoices:0, cancelled:0, cashiers:[] };
    byDay[s.date].sales     += s.sales_total || 0;
    byDay[s.date].invoices  += s.invoices_count || 0;
    byDay[s.date].cancelled += s.cancelled_count || 0;
    if (!byDay[s.date].cashiers.includes(s.cashier)) byDay[s.date].cashiers.push(s.cashier);
  });

  const days = Object.keys(byDay).sort().reverse();
  const totalSales = days.reduce((s,d)=>s+byDay[d].sales, 0);
  const totalInv   = days.reduce((s,d)=>s+byDay[d].invoices, 0);

  const rows = days.map(d => {
    const day = byDay[d];
    return `<tr>
      <td>${fmtDate(d)}</td>
      <td class="rpt-num">${fmtMoney(day.sales)}</td>
      <td class="rpt-num">${fmtNum(day.invoices)}</td>
      <td class="rpt-num">${day.invoices>0?fmtMoney(Math.round(day.sales/day.invoices)):'—'}</td>
      <td class="rpt-num ${day.cancelled>0?'rpt-warn':''}">${fmtNum(day.cancelled)}</td>
      <td>${day.cashiers.join(' / ')}</td>
    </tr>`;
  }).join('');

  return `
  <div class="rpt-card rpt-full">
    <div class="rpt-card-head">
      <div class="rpt-card-title">🧾 تفاصيل المبيعات اليومية</div>
      <div class="rpt-card-sub">الإجمالي: <strong>${fmtMoney(totalSales)}</strong> — ${fmtNum(totalInv)} فاتورة</div>
    </div>
    <div class="rpt-table-wrap">
      <table class="rpt-table">
        <thead>
          <tr>
            <th>التاريخ</th>
            <th>المبيعات</th>
            <th>الفواتير</th>
            <th>متوسط الفاتورة</th>
            <th>ملغاة</th>
            <th>الكاشير</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr class="rpt-total-row">
            <td>الإجمالي</td>
            <td class="rpt-num">${fmtMoney(totalSales)}</td>
            <td class="rpt-num">${fmtNum(totalInv)}</td>
            <td class="rpt-num">${totalInv>0?fmtMoney(Math.round(totalSales/totalInv)):'—'}</td>
            <td class="rpt-num">${fmtNum(days.reduce((s,d)=>s+byDay[d].cancelled,0))}</td>
            <td>—</td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>

  <!-- تقسيم حسب نوع الطلب -->
  ${renderSalesByType(sh)}`;
}

function renderSalesByType(sh) {
  const types = { table:'طاولة', takeaway:'سفري', delivery:'توصيل' };
  const cols  = { table:'var(--fahad-blue)', takeaway:'var(--fahad-gold)', delivery:'var(--sage,#5BA08A)' };
  const totals = {};
  Object.keys(types).forEach(k => totals[k] = sh.reduce((s,x)=>s+(x.by_type?.[k]||0),0));
  const grand = Object.values(totals).reduce((a,b)=>a+b,0) || 1;

  const rows = Object.keys(types).map(k => `
    <tr>
      <td><span class="rpt-dot" style="background:${cols[k]}"></span> ${types[k]}</td>
      <td class="rpt-num">${fmtMoney(totals[k])}</td>
      <td class="rpt-num">${Math.round(totals[k]/grand*100)}%</td>
      <td>
        <div class="rpt-inline-bar">
          <div class="rpt-inline-fill" style="width:${Math.round(totals[k]/grand*100)}%;background:${cols[k]}"></div>
        </div>
      </td>
    </tr>`).join('');

  return `
  <div class="rpt-card rpt-full">
    <div class="rpt-card-title">🍽️ مبيعات حسب نوع الطلب</div>
    <div class="rpt-table-wrap">
      <table class="rpt-table">
        <thead><tr><th>النوع</th><th>المبلغ</th><th>النسبة</th><th>الشريط</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </div>`;
}

/* ================================================================
   💸 تبويب المصروفات
   ================================================================ */
function renderExpenses(from, to) {
  const sh   = filteredShifts(from, to);
  const exps = filteredExpenses(from, to);

  const shiftExp = sh.reduce((s,x)=>s+(x.expenditures||0),0);
  const directExp= exps.reduce((s,x)=>s+(x.amount||0),0);
  const total    = shiftExp + directExp;

  /* تجميع حسب النوع */
  const byType = {};
  exps.forEach(ex => {
    const t = ex.type || ex.category || 'أخرى';
    byType[t] = (byType[t] || 0) + (ex.amount || 0);
  });

  const colors = ['var(--fahad-blue)','var(--fahad-gold)','var(--clay,#C25B3E)','var(--sage,#5BA08A)',
                  '#7C3AED','#DB2777','#059669','#D97706'];
  const typeKeys = Object.keys(byType).sort((a,b) => byType[b]-byType[a]);

  const pieRows = typeKeys.map((k,i) => {
    const pct = total > 0 ? Math.round(byType[k]/total*100) : 0;
    return `<tr>
      <td><span class="rpt-dot" style="background:${colors[i%colors.length]}"></span>${e(k)}</td>
      <td class="rpt-num">${fmtMoney(byType[k])}</td>
      <td class="rpt-num">${pct}%</td>
      <td><div class="rpt-inline-bar"><div class="rpt-inline-fill" style="width:${pct}%;background:${colors[i%colors.length]}"></div></div></td>
    </tr>`;
  }).join('');

  const expRows = exps.length ? exps.sort((a,b)=>b.date<a.date?-1:1).map(ex => `
    <tr>
      <td>${fmtDate(ex.date)}</td>
      <td>${e(ex.type||ex.category||'—')}</td>
      <td>${e(ex.description||ex.note||'—')}</td>
      <td class="rpt-num">${fmtMoney(ex.amount)}</td>
      <td>${e(ex.added_by||ex.cashier||'—')}</td>
    </tr>`).join('') : `<tr><td colspan="5" class="rpt-empty-row">لا توجد مصروفات مباشرة</td></tr>`;

  return `
  <div class="rpt-kpi-row">
    <div class="rpt-kpi rpt-kpi-red">
      <div class="rpt-kpi-icon">💸</div>
      <div class="rpt-kpi-val">${fmtMoney(total)}</div>
      <div class="rpt-kpi-lbl">إجمالي المصروفات</div>
    </div>
    <div class="rpt-kpi rpt-kpi-gold">
      <div class="rpt-kpi-icon">🔒</div>
      <div class="rpt-kpi-val">${fmtMoney(shiftExp)}</div>
      <div class="rpt-kpi-lbl">مصروفات الورديات</div>
    </div>
    <div class="rpt-kpi rpt-kpi-blue">
      <div class="rpt-kpi-icon">📄</div>
      <div class="rpt-kpi-val">${fmtMoney(directExp)}</div>
      <div class="rpt-kpi-lbl">مصروفات مسجّلة</div>
    </div>
    <div class="rpt-kpi rpt-kpi-green">
      <div class="rpt-kpi-icon">🧾</div>
      <div class="rpt-kpi-val">${fmtNum(exps.length)}</div>
      <div class="rpt-kpi-lbl">عدد البنود</div>
    </div>
  </div>

  ${typeKeys.length ? `
  <div class="rpt-card rpt-full">
    <div class="rpt-card-title">📊 المصروفات حسب النوع</div>
    <div class="rpt-table-wrap">
      <table class="rpt-table">
        <thead><tr><th>النوع</th><th>المبلغ</th><th>النسبة</th><th>الشريط</th></tr></thead>
        <tbody>${pieRows}</tbody>
      </table>
    </div>
  </div>` : ''}

  <div class="rpt-card rpt-full">
    <div class="rpt-card-title">📋 سجل المصروفات</div>
    <div class="rpt-table-wrap">
      <table class="rpt-table">
        <thead>
          <tr><th>التاريخ</th><th>النوع</th><th>الوصف</th><th>المبلغ</th><th>بواسطة</th></tr>
        </thead>
        <tbody>${expRows}</tbody>
      </table>
    </div>
  </div>`;
}

/* ================================================================
   🍔 تبويب الأصناف
   ================================================================ */
function renderItems(from, to) {
  /* نحصي من الفواتير المفلترة */
  const invs = filteredInvoices(from, to);

  /* بناء خريطة اسم الصنف */
  const nameMap = {};
  menuItems.forEach(it => { nameMap[it.id] = it.name || it.option_name; });

  /* تجميع الكميات والمبالغ */
  const itemStats = {};
  invs.forEach(inv => {
    (inv.items || []).forEach(li => {
      const id   = li.item_id || li.id;
      const name = li.name || nameMap[id] || id;
      if (!itemStats[id]) itemStats[id] = { name, qty:0, revenue:0 };
      itemStats[id].qty     += li.qty || 1;
      itemStats[id].revenue += (li.price || 0) * (li.qty || 1);
    });
  });

  const list = Object.values(itemStats).sort((a,b)=>b.qty-a.qty);
  const maxQty = list[0]?.qty || 1;

  if (!list.length) return emptyState('لا توجد بيانات مبيعات بصنيف في هذه الفترة');

  const rows = list.map((it, i) => `
    <tr>
      <td>${i+1}</td>
      <td>${e(it.name)}</td>
      <td class="rpt-num">${fmtNum(it.qty)}</td>
      <td class="rpt-num">${fmtMoney(it.revenue)}</td>
      <td>
        <div class="rpt-inline-bar">
          <div class="rpt-inline-fill" style="width:${Math.round(it.qty/maxQty*100)}%;background:var(--fahad-blue)"></div>
        </div>
      </td>
    </tr>`).join('');

  const totalRev = list.reduce((s,it)=>s+it.revenue,0);

  return `
  <div class="rpt-kpi-row">
    <div class="rpt-kpi rpt-kpi-blue">
      <div class="rpt-kpi-icon">🍔</div>
      <div class="rpt-kpi-val">${fmtNum(list.length)}</div>
      <div class="rpt-kpi-lbl">عدد الأصناف</div>
    </div>
    <div class="rpt-kpi rpt-kpi-green">
      <div class="rpt-kpi-icon">📦</div>
      <div class="rpt-kpi-val">${fmtNum(list.reduce((s,it)=>s+it.qty,0))}</div>
      <div class="rpt-kpi-lbl">إجمالي الوحدات</div>
    </div>
    <div class="rpt-kpi rpt-kpi-gold">
      <div class="rpt-kpi-icon">💰</div>
      <div class="rpt-kpi-val">${fmtMoney(totalRev)}</div>
      <div class="rpt-kpi-lbl">إجمالي الإيراد</div>
    </div>
    <div class="rpt-kpi rpt-kpi-blue">
      <div class="rpt-kpi-icon">🏆</div>
      <div class="rpt-kpi-val">${e(list[0]?.name?.substring(0,16)||'—')}</div>
      <div class="rpt-kpi-lbl">الأكثر مبيعاً</div>
    </div>
  </div>

  <div class="rpt-card rpt-full">
    <div class="rpt-card-title">🏆 ترتيب الأصناف حسب المبيعات</div>
    <div class="rpt-table-wrap">
      <table class="rpt-table">
        <thead>
          <tr><th>#</th><th>الصنف</th><th>الكمية</th><th>الإيراد</th><th>الشريط</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </div>`;
}

/* ================================================================
   👤 تبويب الموظفون
   ================================================================ */
function renderEmployees(from, to) {
  if (!employees.length) return emptyState('لا يوجد موظفون مسجلون');

  const sh = filteredShifts(from, to);

  /* إحصاء ورديات لكل كاشير */
  const cashierStats = {};
  sh.forEach(s => {
    const c = s.cashier;
    if (!cashierStats[c]) cashierStats[c] = { shifts:0, sales:0, invoices:0 };
    cashierStats[c].shifts++;
    cashierStats[c].sales    += s.sales_total || 0;
    cashierStats[c].invoices += s.invoices_count || 0;
  });

  /* رواتب في الفترة */
  const empRows = employees.map(emp => {
    const salaries = (emp.salary_log || []).filter(sl => inRange(sl.date, from, to));
    const advances  = salaries.filter(sl=>sl.type==='advance').reduce((s,sl)=>s+sl.amount,0);
    const paid      = salaries.filter(sl=>sl.type==='salary').reduce((s,sl)=>s+sl.amount,0);
    const deductions= (emp.deductions_log||[]).filter(dl=>inRange(dl.date,from,to))
                       .reduce((s,dl)=>s+dl.amount,0);
    const stats = cashierStats[emp.name] || { shifts:0, sales:0, invoices:0 };

    return `<tr>
      <td>${e(emp.name)}</td>
      <td><span class="rpt-badge">${e(emp.role)}</span></td>
      <td class="rpt-num">${fmtNum(stats.shifts)}</td>
      <td class="rpt-num">${fmtMoney(stats.sales)}</td>
      <td class="rpt-num">${fmtMoney(paid)}</td>
      <td class="rpt-num ${advances>0?'rpt-warn':''}">${fmtMoney(advances)}</td>
      <td class="rpt-num ${deductions>0?'rpt-red':''}">${fmtMoney(deductions)}</td>
    </tr>`;
  }).join('');

  const totalPaid = employees.reduce((s,emp) => {
    return s + (emp.salary_log||[]).filter(sl=>inRange(sl.date,from,to)&&sl.type==='salary')
                                    .reduce((a,sl)=>a+sl.amount,0);
  }, 0);

  return `
  <div class="rpt-kpi-row">
    <div class="rpt-kpi rpt-kpi-blue">
      <div class="rpt-kpi-icon">👤</div>
      <div class="rpt-kpi-val">${fmtNum(employees.length)}</div>
      <div class="rpt-kpi-lbl">إجمالي الموظفين</div>
    </div>
    <div class="rpt-kpi rpt-kpi-red">
      <div class="rpt-kpi-icon">💰</div>
      <div class="rpt-kpi-val">${fmtMoney(totalPaid)}</div>
      <div class="rpt-kpi-lbl">رواتب مدفوعة</div>
    </div>
    <div class="rpt-kpi rpt-kpi-gold">
      <div class="rpt-kpi-icon">🔒</div>
      <div class="rpt-kpi-val">${fmtNum(sh.length)}</div>
      <div class="rpt-kpi-lbl">الورديات</div>
    </div>
  </div>

  <div class="rpt-card rpt-full">
    <div class="rpt-card-title">👤 أداء الموظفين</div>
    <div class="rpt-table-wrap">
      <table class="rpt-table">
        <thead>
          <tr>
            <th>الاسم</th><th>الدور</th><th>الورديات</th>
            <th>المبيعات</th><th>راتب مدفوع</th><th>سلف</th><th>خصومات</th>
          </tr>
        </thead>
        <tbody>${empRows}</tbody>
      </table>
    </div>
  </div>`;
}

/* ================================================================
   👥 تبويب العملاء
   ================================================================ */
function renderCustomers(from, to) {
  if (!customers.length) return emptyState('لا يوجد عملاء مسجلون');

  const invs = filteredInvoices(from, to);

  /* إحصاء مشتريات العملاء */
  const custStats = {};
  invs.forEach(inv => {
    const cid = inv.customer_id;
    if (!cid) return;
    if (!custStats[cid]) custStats[cid] = { count:0, total:0, deferred:0 };
    custStats[cid].count++;
    custStats[cid].total    += inv.total || inv.amount || 0;
    if (inv.pay_type === 'deferred' || inv.pay_type === 'آجل') {
      custStats[cid].deferred += inv.total || inv.amount || 0;
    }
  });

  const rows = customers.map(c => {
    const st = custStats[c.id] || { count:0, total:0, deferred:0 };
    const typeLabel = { regular:'مباشر', contract:'عقد', vip:'VIP', delivery:'توصيل' }[c.type] || c.type || '—';
    return `<tr>
      <td>${e(c.name)}</td>
      <td><span class="rpt-badge rpt-badge-${c.type||'regular'}">${typeLabel}</span></td>
      <td>${e(c.phone||'—')}</td>
      <td class="rpt-num">${fmtNum(st.count)}</td>
      <td class="rpt-num">${fmtMoney(st.total)}</td>
      <td class="rpt-num ${st.deferred>0?'rpt-warn':''}">${fmtMoney(st.deferred)}</td>
    </tr>`;
  }).join('');

  const topCust = customers
    .filter(c => custStats[c.id])
    .sort((a,b)=>(custStats[b.id]?.total||0)-(custStats[a.id]?.total||0))[0];

  return `
  <div class="rpt-kpi-row">
    <div class="rpt-kpi rpt-kpi-blue">
      <div class="rpt-kpi-icon">👥</div>
      <div class="rpt-kpi-val">${fmtNum(customers.length)}</div>
      <div class="rpt-kpi-lbl">إجمالي العملاء</div>
    </div>
    <div class="rpt-kpi rpt-kpi-green">
      <div class="rpt-kpi-icon">🛒</div>
      <div class="rpt-kpi-val">${fmtNum(Object.keys(custStats).length)}</div>
      <div class="rpt-kpi-lbl">عملاء نشطون</div>
    </div>
    <div class="rpt-kpi rpt-kpi-gold">
      <div class="rpt-kpi-icon">🏆</div>
      <div class="rpt-kpi-val">${e(topCust?.name||'—')}</div>
      <div class="rpt-kpi-lbl">أعلى إنفاق</div>
    </div>
  </div>

  <div class="rpt-card rpt-full">
    <div class="rpt-card-title">👥 تفاصيل العملاء</div>
    <div class="rpt-table-wrap">
      <table class="rpt-table">
        <thead>
          <tr><th>الاسم</th><th>النوع</th><th>الهاتف</th><th>الطلبات</th><th>الإجمالي</th><th>آجل</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </div>`;
}

/* ================================================================
   رسم الخط اليومي (SVG بسيط)
   ================================================================ */
function buildDailySalesLine(sh, from, to) {
  /* تجميع يومي */
  const byDay = {};
  sh.forEach(s => {
    byDay[s.date] = (byDay[s.date]||0) + (s.sales_total||0);
  });

  const days = Object.keys(byDay).sort();
  if (!days.length) return '<div class="rpt-chart-empty">لا توجد بيانات</div>';

  const W = 600, H = 160, PAD = 40;
  const vals  = days.map(d => byDay[d]);
  const maxV  = Math.max(...vals) || 1;
  const stepX = (W - PAD * 2) / Math.max(days.length - 1, 1);

  const points = vals.map((v, i) => {
    const x = PAD + i * stepX;
    const y = H - PAD - ((v / maxV) * (H - PAD * 2));
    return `${x},${y}`;
  }).join(' ');

  const dotsMk = vals.map((v, i) => {
    const x = PAD + i * stepX;
    const y = H - PAD - ((v / maxV) * (H - PAD * 2));
    return `<circle cx="${x}" cy="${y}" r="4" fill="var(--fahad-blue)" stroke="#fff" stroke-width="2">
      <title>${fmtDate(days[i])}: ${fmtMoney(v)}</title>
    </circle>`;
  }).join('');

  /* تسميات X */
  const labelsX = days.map((d,i) => {
    const x = PAD + i * stepX;
    const lbl = days.length > 7 ? d.substring(5) : d.substring(5);
    return `<text x="${x}" y="${H-8}" text-anchor="middle" font-size="10" fill="#64748b">${lbl}</text>`;
  }).join('');

  /* تسميات Y */
  const yTicks = [0, 0.5, 1].map(t => {
    const y = H - PAD - t * (H - PAD*2);
    return `<text x="${PAD-4}" y="${y+4}" text-anchor="end" font-size="9" fill="#94a3b8">${fmtNum(Math.round(maxV*t/1000))}k</text>
    <line x1="${PAD}" y1="${y}" x2="${W-PAD}" y2="${y}" stroke="#e2e8f0" stroke-dasharray="3"/>`;
  }).join('');

  /* منطقة التعبئة */
  const areaPoints = `${PAD},${H-PAD} ${points} ${PAD+stepX*(vals.length-1)},${H-PAD}`;

  return `
  <div class="rpt-line-chart">
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
      ${yTicks}
      <polygon points="${areaPoints}" fill="var(--fahad-blue)" fill-opacity="0.1"/>
      <polyline points="${points}" fill="none" stroke="var(--fahad-blue)" stroke-width="2.5" stroke-linejoin="round"/>
      ${dotsMk}
      ${labelsX}
    </svg>
  </div>`;
}

/* ================================================================
   رسم الدونات (SVG)
   ================================================================ */
function buildDonut(segments, total) {
  const R = 50, CX = 60, CY = 60, thickness = 18;
  let offset = -Math.PI / 2;

  const arcs = segments.map(seg => {
    const frac = seg.val / total;
    const angle = frac * 2 * Math.PI;
    const x1 = CX + R * Math.cos(offset);
    const y1 = CY + R * Math.sin(offset);
    offset += angle;
    const x2 = CX + R * Math.cos(offset);
    const y2 = CY + R * Math.sin(offset);
    const large = angle > Math.PI ? 1 : 0;
    if (frac < 0.005) return '';
    return `<path d="M${x1.toFixed(2)},${y1.toFixed(2)} A${R},${R} 0 ${large},1 ${x2.toFixed(2)},${y2.toFixed(2)}"
      fill="none" stroke="${seg.color}" stroke-width="${thickness}">
      <title>${seg.label}: ${fmtMoney(seg.val)}</title>
    </path>`;
  }).join('');

  return `<svg viewBox="0 0 120 120" class="rpt-donut-svg">
    <circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="#f1f5f9" stroke-width="${thickness}"/>
    ${arcs}
  </svg>`;
}

/* ================================================================
   مساعدات
   ================================================================ */
function emptyState(msg) {
  return `<div class="rpt-empty"><span>📭</span><p>${e(msg)}</p></div>`;
}

/* ================================================================
   طباعة
   ================================================================ */
function printReport() {
  window.print();
}

/* ================================================================
   تهيئة
   ================================================================ */
function init() {
  bindReportData();
  buildNav();

  /* ضبط التواريخ الافتراضية */
  const today = (window.businessDay ? businessDay() : new Date().toISOString().slice(0,10));
  const df = document.getElementById('dateFrom');
  const dt = document.getElementById('dateTo');
  if (df) df.value = today;
  if (dt) dt.value = today;

  applyFilter();
}

(window.alfaStart||function(fn){fn();})(init);

/* ================================================================
   ⚖️ مقارنة الفترات — أي فترتين تختارهما (يوم/أسبوع/شهر/متماثلان/مخصص)
   ================================================================ */
let cmpPreset = 'day';
function ymd(d){ const p=n=>String(n).padStart(2,'0'); return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate()); }

function cmpRanges(preset){
  const now = new Date();
  const t = ymd(now);
  if (preset === 'day')    return { A:{from:t,to:t}, B:{from:ymd(new Date(Date.now()-864e5)), to:ymd(new Date(Date.now()-864e5))} };
  if (preset === 'sameDay'){
    const prev = ymd(new Date(Date.now()-7*864e5));
    return { A:{from:t,to:t}, B:{from:prev,to:prev} };
  }
  if (preset === 'week'){
    const day = now.getDay(); const diff = (day===0)?6:day-1;
    const mon = new Date(now); mon.setDate(now.getDate()-diff);
    const sun = new Date(mon); sun.setDate(mon.getDate()+6);
    const pm = new Date(mon); pm.setDate(pm.getDate()-7);
    const ps = new Date(sun); ps.setDate(ps.getDate()-7);
    return { A:{from:ymd(mon),to:ymd(sun)}, B:{from:ymd(pm),to:ymd(ps)} };
  }
  if (preset === 'month'){
    const f1 = new Date(now.getFullYear(), now.getMonth(), 1);
    const l1 = new Date(now.getFullYear(), now.getMonth()+1, 0);
    const f0 = new Date(now.getFullYear(), now.getMonth()-1, 1);
    const l0 = new Date(now.getFullYear(), now.getMonth(), 0);
    return { A:{from:ymd(f1),to:ymd(l1)}, B:{from:ymd(f0),to:ymd(l0)} };
  }
  /* custom */
  const g = id => document.getElementById(id)?.value || '';
  return {
    A:{ from:g('cmpAFrom'), to:g('cmpATo') },
    B:{ from:g('cmpBFrom'), to:g('cmpBTo') },
  };
}

/* إحصاءات فترة كاملة (نفس منطق الملخص: الورديات + المصروفات، والأصناف من الفواتير) */
function cmpStats(range){
  const sh  = filteredShifts(range.from, range.to);
  const exp = filteredExpenses(range.from, range.to);
  const invs = filteredInvoices(range.from, range.to);
  const sales    = sh.reduce((s,x)=>s+(x.sales_total||0),0);
  const count    = sh.reduce((s,x)=>s+(x.invoices_count||0),0);
  const expTotal = sh.reduce((s,x)=>s+(x.expenditures||0),0) + exp.reduce((s,x)=>s+(x.amount||0),0);
  const st = {
    days: Math.max(1, Math.round((new Date(range.to) - new Date(range.from))/864e5) + 1),
    sales, count,
    avg: count>0 ? Math.round(sales/count) : 0,
    expenses: expTotal,
    net: sales - expTotal,
    cash:     sh.reduce((s,x)=>s+(x.by_payment?.cash||0),0),
    deferred: sh.reduce((s,x)=>s+(x.by_payment?.deferred||0),0),
    table:    sh.reduce((s,x)=>s+(x.by_type?.table||0),0),
    takeaway: sh.reduce((s,x)=>s+(x.by_type?.takeaway||0),0),
    delivery: sh.reduce((s,x)=>s+(x.by_type?.delivery||0),0),
    topItems: [],
  };
  const nameMap = {};
  menuItems.forEach(it => { nameMap[it.id] = it.name || it.option_name; });
  const agg = {};
  invs.forEach(inv => (inv.items||[]).forEach(li => {
    const id = li.item_id || li.id;
    const nm = li.name || nameMap[id] || id;
    if (!agg[id]) agg[id] = { name:nm, qty:0, revenue:0 };
    agg[id].qty += li.qty||1;
    agg[id].revenue += (li.price||0)*(li.qty||1);
  }));
  st.topItems = Object.values(agg).sort((a,b)=>b.qty-a.qty).slice(0,5);
  return st;
}

function setCmpPreset(btn, preset){
  cmpPreset = preset;
  document.querySelectorAll('.cmp-preset').forEach(b=>b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  document.getElementById('cmpCustomRow').style.display = preset==='custom' ? 'flex' : 'none';
  document.getElementById('tabContent').innerHTML = renderCompare();
}

function cmpDelta(a, b, goodUp, money){
  const diff = a - b;
  const pct = b ? (diff/b*100) : null;
  const better = goodUp === null ? null : (goodUp ? diff > 0 : diff < 0);
  const cls = (better === null || diff === 0) ? 'neutral' : better ? 'up' : 'down';
  const arrow = diff === 0 ? '＝' : diff > 0 ? '▲' : '▼';
  const val = money ? fmtMoney(Math.abs(diff)) : fmtNum(Math.abs(diff));
  const pctTxt = (pct == null || !isFinite(pct)) ? '' : ` (${diff>0?'+':'−'}${Math.abs(pct).toFixed(1)}%)`;
  return `<span class="cmp-delta ${cls}">${arrow} ${val}${pctTxt}</span>`;
}

function renderCompare(){
  const R = cmpRanges(cmpPreset);
  const A = cmpStats(R.A), B = cmpStats(R.B);
  const lbl = r => (r.from === r.to) ? fmtDate(r.from) : `${fmtDate(r.from)} — ${fmtDate(r.to)}`;
  const rows = [
    ['إجمالي المبيعات', A.sales,    B.sales,    true,  true ],
    ['عدد الفواتير',    A.count,    B.count,    true,  false],
    ['متوسط الفاتورة',  A.avg,      B.avg,      true,  true ],
    ['إجمالي المصروفات',A.expenses, B.expenses, false, true ],
    ['صافي الربح',      A.net,      B.net,      true,  true ],
    ['تحصيل نقدي',      A.cash,     B.cash,     true,  true ],
    ['فواتير آجلة',     A.deferred, B.deferred, false, true ],
    ['🍽️ صالة',         A.table,    B.table,    null,  true ],
    ['🥡 سفري',         A.takeaway, B.takeaway, null,  true ],
    ['🛵 توصيل',        A.delivery, B.delivery, null,  true ],
  ].map(([name, a, b, goodUp, money]) => `
    <tr>
      <td class="cmp-metric">${name}</td>
      <td class="cmp-val">${money ? fmtMoney(a) : fmtNum(a)}</td>
      <td class="cmp-val">${money ? fmtMoney(b) : fmtNum(b)}</td>
      <td>${cmpDelta(a,b,goodUp,money)}</td>
    </tr>`).join('');

  const topList = st => st.topItems.length ? st.topItems.map((it,i)=>`
      <div class="cmp-item-row"><span>${i+1}. ${e(it.name)}</span><b>${fmtNum(it.qty)} × · ${fmtMoney(it.revenue)}</b></div>`).join('')
    : '<div class="cmp-empty">لا مبيعات أصناف في هذه الفترة</div>';

  const presetBtn = (id, label) =>
    `<button class="cmp-preset ${cmpPreset===id?'active':''}" onclick="setCmpPreset(this,'${id}')">${label}</button>`;

  return `
  <div class="rpt-card cmp-card">
    <div class="cmp-presets">
      ${presetBtn('day','اليوم ↔ الأمس')}
      ${presetBtn('sameDay','اليوم ↔ نفسه الأسبوع الماضي')}
      ${presetBtn('week','هذا الأسبوع ↔ الماضي')}
      ${presetBtn('month','هذا الشهر ↔ الماضي')}
      ${presetBtn('custom','مخصص (أي فترتين)')}
    </div>
    <div class="cmp-custom-row" id="cmpCustomRow" style="display:${cmpPreset==='custom'?'flex':'none'}">
      <label>الفترة أ<br><input type="date" id="cmpAFrom" value="${R.A.from}"><input type="date" id="cmpATo" value="${R.A.to}"></label>
      <label>الفترة ب<br><input type="date" id="cmpBFrom" value="${R.B.from}"><input type="date" id="cmpBTo" value="${R.B.to}"></label>
      <button class="cmp-apply" onclick="setCmpPreset(null,'custom')">قارن</button>
    </div>

    <div class="cmp-heads">
      <div class="cmp-head cmp-head-a"><small>الفترة أ · ${A.days} يوم</small><b>${lbl(R.A)}</b></div>
      <div class="cmp-head cmp-head-b"><small>الفترة ب · ${B.days} يوم</small><b>${lbl(R.B)}</b></div>
    </div>

    <div class="cmp-table-wrap">
      <table class="cmp-table">
        <thead><tr><th>المؤشر</th><th>الفترة أ</th><th>الفترة ب</th><th>الفرق</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>

    <div class="cmp-tops">
      <div class="cmp-top-side"><div class="cmp-top-title">🍔 الأعلى في الفترة أ</div>${topList(A)}</div>
      <div class="cmp-top-side"><div class="cmp-top-title">🍔 الأعلى في الفترة ب</div>${topList(B)}</div>
    </div>
  </div>`;
}

/* ================================================================
   📅 منحنى آخر ٣٠ يوماً — ثابت مهما كان الفلتر + إحصاءات الاتجاه
   ================================================================ */
function buildCurve30(){
  const byDay = {};
  shifts.forEach(s => { byDay[s.date] = (byDay[s.date] || 0) + (s.sales_total || 0); });
  const days = [], vals = [];
  for (let i = 29; i >= 0; i--) {
    const d = ymd(new Date(Date.now() - i * 864e5));
    days.push(d); vals.push(byDay[d] || 0);
  }
  const total  = vals.reduce((a, b) => a + b, 0);
  const avg    = Math.round(total / 30);
  const best   = Math.max(...vals);
  const bestIx = vals.indexOf(best);
  const first  = vals.slice(0, 15).reduce((a, b) => a + b, 0);
  const second = vals.slice(15).reduce((a, b) => a + b, 0);
  const trend  = second > first * 1.05 ? 'up' : second < first * 0.95 ? 'down' : 'flat';

  const W = 640, H = 190, PAD = 46;
  const maxV = best || 1;
  const stepX = (W - PAD * 2) / 29;
  const xy = (v, i) => [PAD + i * stepX, H - PAD - (v / maxV) * (H - PAD * 2)];
  const pts  = vals.map((v, i) => xy(v, i).join(',')).join(' ');
  const dots = vals.map((v, i) => {
    const [x, y] = xy(v, i);
    const isLast = i === 29, isBest = i === bestIx;
    if (v === 0 && !isLast) return '';
    return `<circle cx="${x}" cy="${y}" r="${isLast ? 6 : isBest ? 5.5 : 3.5}"
      fill="${isLast ? 'var(--fahad-gold)' : 'var(--fahad-blue)'}" stroke="#fff" stroke-width="2">
      <title>${fmtDate(days[i])}: ${fmtMoney(v)}</title></circle>`;
  }).join('');
  const labelsX = days.map((d, i) => i % 5 === 0 || i === 29
    ? `<text x="${xy(vals[i], i)[0]}" y="${H - 10}" text-anchor="middle" font-size="9.5" fill="#64748b">${d.substring(5)}</text>` : '').join('');
  const yTicks = [0, 0.5, 1].map(t => {
    const y = H - PAD - t * (H - PAD * 2);
    return `<text x="${PAD - 4}" y="${y + 4}" text-anchor="end" font-size="9" fill="#94a3b8">${fmtNum(Math.round(maxV * t / 1000))}k</text>
      <line x1="${PAD}" y1="${y}" x2="${W - PAD}" y2="${y}" stroke="#e2e8f0" stroke-dasharray="3"/>`;
  }).join('');
  const avgY = H - PAD - (avg / maxV) * (H - PAD * 2);
  const area  = `${PAD},${H - PAD} ${pts} ${W - PAD},${H - PAD}`;

  const trendTxt = { up: '▲ صاعد', down: '▼ متراجع', flat: '＝ مستقر' }[trend];
  const chip = (lbl, val, cls = '') =>
    `<div class="c30-chip ${cls}"><small>${lbl}</small><b>${val}</b></div>`;

  return `
  <div class="c30-stats">
    ${chip('إجمالي ٣٠ يوم', fmtMoney(total))}
    ${chip('المتوسط اليومي', fmtMoney(avg))}
    ${chip('أفضل يوم', `${fmtMoney(best)}`, 'c30-best')}
    ${chip('أفضل يوم بتاريخ', fmtDate(days[bestIx]))}
    ${chip('الاتجاه (15ي ↔ 15ي)', trendTxt, 'c30-' + trend)}
  </div>
  <div class="rpt-line-chart">
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
      ${yTicks}
      <line x1="${PAD}" y1="${avgY}" x2="${W - PAD}" y2="${avgY}" stroke="var(--fahad-gold)" stroke-width="1.5" stroke-dasharray="6 4"/>
      <text x="${W - PAD}" y="${avgY - 6}" text-anchor="end" font-size="9" fill="var(--fahad-gold)" font-weight="700">المتوسط ${fmtNum(Math.round(avg / 1000))}k</text>
      <polygon points="${area}" fill="var(--fahad-blue)" fill-opacity="0.1"/>
      <polyline points="${pts}" fill="none" stroke="var(--fahad-blue)" stroke-width="2.5" stroke-linejoin="round"/>
      ${dots}
      ${labelsX}
    </svg>
  </div>`;
}

/* ================================================================
   🏷️ مبيعات حسب التصنيف (خطة شاشات الإدارة)
   ================================================================ */
function renderCatsReport(from, to){
  const invs = filteredInvoices(from, to);
  const byCat = {};
  (DATA.categories || []).forEach(c => byCat[c.id] = { name: c.name, icon: c.icon || '🏷️', qty: 0, revenue: 0 });
  invs.forEach(inv => (inv.items || []).forEach(li => {
    const it = menuItems.find(m => m.id === (li.item_id || li.id));
    const catId = it ? it.category_id : 'other';
    if (!byCat[catId]) byCat[catId] = { name:'أخرى', icon:'🏷️', qty:0, revenue:0 };
    byCat[catId].qty += li.qty || 1;
    byCat[catId].revenue += (li.price || 0) * (li.qty || 1);
  }));
  const list = Object.values(byCat).filter(c => c.qty > 0).sort((a,b) => b.revenue - a.revenue);
  const total = list.reduce((s,c) => s + c.revenue, 0) || 1;
  if (!list.length) return emptyState('لا مبيعات في هذه الفترة');
  return `
  <div class="rpt-kpi-row">
    <div class="rpt-kpi rpt-kpi-blue"><div class="rpt-kpi-icon">🏷️</div><div class="rpt-kpi-val">${fmtNum(list.length)}</div><div class="rpt-kpi-lbl">تصنيفات نشطة</div></div>
    <div class="rpt-kpi rpt-kpi-gold"><div class="rpt-kpi-icon">💰</div><div class="rpt-kpi-val">${fmtMoney(total)}</div><div class="rpt-kpi-lbl">إجمالي الإيراد</div></div>
  </div>
  <div class="rpt-card">
    <table class="rpt-table">
      <thead><tr><th>التصنيف</th><th>الكمية</th><th>الإيراد</th><th>الحصة</th></tr></thead>
      <tbody>
        ${list.map(c => `
        <tr>
          <td>${c.icon} ${e(c.name)}</td>
          <td class="rpt-num">${fmtNum(c.qty)}</td>
          <td class="rpt-num">${fmtMoney(c.revenue)}</td>
          <td>
            <div style="display:flex;align-items:center;gap:8px;">
              <div class="rpt-inline-bar"><div class="rpt-inline-fill" style="width:${Math.round(c.revenue/total*100)}%;background:var(--fahad-blue)"></div></div>
              <b style="font-size:11px;">${Math.round(c.revenue/total*100)}%</b>
            </div>
          </td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>`;
}

/* ================================================================
   🚚 تقرير المشتريات — من سجلات إضافة المخزون (بالمورد والمسجّل)
   ================================================================ */
function renderPurchases(from, to){
  const rows = [];
  ((DATA.inventory) || []).forEach(inv => (inv.log || []).forEach(l => {
    if (l.type !== 'in') return;
    if (!inRange(l.date, from, to)) return;
    rows.push({ date: l.date, mat: inv.name, unit: inv.unit, qty: l.qty,
      cost: l.cost || inv.cost_per_unit || 0, supplier: l.supplier_name || '—', by: l.by || '—' });
  }));
  rows.sort((a,b) => (b.date || '').localeCompare(a.date || ''));
  const total = rows.reduce((s,r) => s + r.qty * r.cost, 0);
  if (!rows.length) return emptyState('لا مشتريات مسجلة في هذه الفترة — سجّلها من شاشة المخزون «+ إضافة للمخزون»');
  return `
  <div class="rpt-kpi-row">
    <div class="rpt-kpi rpt-kpi-blue"><div class="rpt-kpi-icon">🚚</div><div class="rpt-kpi-val">${fmtNum(rows.length)}</div><div class="rpt-kpi-lbl">عمليات شراء</div></div>
    <div class="rpt-kpi rpt-kpi-red"><div class="rpt-kpi-icon">💸</div><div class="rpt-kpi-val">${fmtMoney(total)}</div><div class="rpt-kpi-lbl">إجمالي المشتريات</div></div>
  </div>
  <div class="rpt-card">
    <table class="rpt-table">
      <thead><tr><th>التاريخ</th><th>المادة</th><th>الكمية</th><th>سعر الوحدة</th><th>الإجمالي</th><th>المورد</th><th>سجّلها</th></tr></thead>
      <tbody>
        ${rows.map(r => `
        <tr>
          <td>${e(r.date)}</td>
          <td>${e(r.mat)}</td>
          <td class="rpt-num">${fmtNum(r.qty)} ${e(r.unit)}</td>
          <td class="rpt-num">${fmtNum(r.cost)}</td>
          <td class="rpt-num"><b>${fmtNum(Math.round(r.qty * r.cost))}</b></td>
          <td>${e(r.supplier)}</td>
          <td>${e(r.by)}</td>
        </tr>`).join('')}
        <tr><td colspan="4"><b>الإجمالي</b></td><td class="rpt-num"><b>${fmtNum(Math.round(total))}</b></td><td colspan="2"></td></tr>
      </tbody>
    </table>
  </div>`;
}
