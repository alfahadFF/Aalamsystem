/* ================================================================
   owner_shield.js — 🛡️ درع المالك (29)
   رصد مركزي للإلغاءات والخصومات والجرد الناقص والآجل اليدوي.
   يعمل محلياً الآن من سجلات النظام؛ وقيمته الكاملة بعد الربط
   (هوية كاشير عبر الأجهزة + تنبيه فوري على هاتف المالك).
   ================================================================ */
const DATA = window.DEMO_DATA;
let invoices = DATA.invoices || [];
let session = DATA.cashierSession || {};

/* ── التنقل (نفس قائمة الإدارة) ── */
const MGR_NAV = window.AlfaNav.MGR_NAV;
const CURRENT = 'dashboard';
const navLink = window.AlfaNav.linker(CURRENT);
function toggleNav(){ document.getElementById('mgrMobileNav')?.classList.add('open'); document.getElementById('mgrNavScrim')?.classList.add('show'); }
function closeNav(){ document.getElementById('mgrMobileNav')?.classList.remove('open'); document.getElementById('mgrNavScrim')?.classList.remove('show'); }

/* ── الفترة ── */
let shieldRange = 'week';   // today | week | all
function todayStr(){ return businessDay(); }
function weekStart(){
  const now = new Date(); const day = now.getDay(); const diff = (day === 0) ? 6 : day - 1;
  const mon = new Date(now); mon.setDate(now.getDate() - diff);
  const p = n => String(n).padStart(2,'0');
  return mon.getFullYear() + '-' + p(mon.getMonth()+1) + '-' + p(mon.getDate());
}
function inShieldRange(dateStr){
  if (shieldRange === 'all') return true;
  const d = (dateStr || '').slice(0,10);
  if (shieldRange === 'today') return d === todayStr();
  return d >= weekStart() && d <= todayStr();
}

/* ── جمع الأحداث المشبوهة ── */
const KIND = {
  cancel: { icon:'🔴', label:'إلغاء فاتورة' },
  discount:{ icon:'✂️', label:'خصم' },
  blind:  { icon:'🔒', label:'جرد وردية ناقص' },
  manualDeferred:{ icon:'📒', label:'آجل يدوي (بلا عقد)' },
};
function severity(v){
  if (v >= 200000) return { cls:'sh-high', label:'عالي', icon:'🔴' };
  if (v >= 50000)  return { cls:'sh-mid',  label:'متوسط', icon:'🟠' };
  return { cls:'sh-low', label:'ملاحظة', icon:'🟡' };
}
function collectEvents(){
  const ev = [];

  invoices.forEach(inv => {
    const d = inv.date || (inv.created_at || '').slice(0,10);

    /* الإلغاءات */
    if (inv.status === 'cancelled' && inShieldRange(d)) {
      ev.push({
        kind:'cancel', date:d, time:inv.time || '', who:inv.cashier || '—',
        value: inv.total || 0,
        detail: `فاتورة ${e(inv.id)} — السبب: ${e(inv.cancel_reason || 'غير مذكور')}`,
      });
    }

    /* الخصومات (فواتير غير ملغاة عليها خصم فعلي) */
    if (inv.status !== 'cancelled' && (inv.discount || 0) > 0 && inShieldRange(d)) {
      const dd = inv.discount_detail || {};
      const itemsCnt = (dd.items || []).length;
      ev.push({
        kind:'discount', date:d, time:inv.time || '', who:inv.cashier || '—',
        value: inv.discount,
        detail: `فاتورة ${e(inv.id)} (${fmtNum(inv.total + inv.discount)} قبل الخصم)${dd.invoice_pct ? ` · نسبة فاتورة ${dd.invoice_pct}%` : ''}${itemsCnt ? ` · خصومات أصناف على ${itemsCnt} صنف` : ''}`,
      });
    }

    /* آجل يدوي: بلا عقد */
    if (inv.pay_type === 'deferred' && inv.status !== 'cancelled' && inShieldRange(d) && !inv.is_online) {
      const linked = inv.contract_id || inv.selectedContractId
        || ((DATA.contracts || []).some(c => c.invoice_ids && c.invoice_ids.includes(inv.id)));
      if (!linked) {
        ev.push({
          kind:'manualDeferred', date:d, time:inv.time || '', who:inv.cashier || '—',
          value: inv.total || 0,
          detail: `فاتورة ${e(inv.id)} — على ذمة «${e(inv.customer_name || 'بلا اسم')}» بلا عقد`,
        });
      }
    }
  });

  /* فرق الجرد الأعمى */
  const lc = session.last_close;
  if (lc && lc.diff < 0) {
    ev.push({
      kind:'blind', date: todayStr(), time: lc.at || '', who: session.cashier_name || '—',
      value: Math.abs(lc.diff),
      detail: `الجرد أقل من المتوقع بـ ${fmtNum(Math.abs(lc.diff))} ل.س (المتوقع ${fmtNum(lc.expected)} · الموجود ${fmtNum(lc.counted)})`,
    });
  }

  return ev.sort((a,b) => b.value - a.value);
}

let kindFilter = 'all';
function setShieldRange(btn, r){ shieldRange = r; kindFilter='all'; renderShield(); }
function setKindFilter(btn, k){ kindFilter = k; renderShield(); }

function renderShield(){
  const evAll = collectEvents();
  const ev = kindFilter === 'all' ? evAll : evAll.filter(x => x.kind === kindFilter);
  const totalValue = ev.reduce((s,x) => s + x.value, 0);
  const cancels = evAll.filter(x => x.kind === 'cancel');
  const discounts = evAll.filter(x => x.kind === 'discount');
  const highCnt = evAll.filter(x => severity(x.value).cls === 'sh-high').length;

  const kpis = [
    { lbl:'أحداث مشبوهة', val: evAll.length, sub:`${highCnt} عالي الخطورة`, cls: highCnt ? 'red' : 'green' },
    { lbl:'القيمة الإجمالية', val: fmtNum(totalValue), sub:'ل.س في الفترة المحددة', cls:'' },
    { lbl:'إلغاءات', val: cancels.length, sub: fmtNum(cancels.reduce((s,x)=>s+x.value,0)) + ' ل.س', cls: cancels.length ? 'gold' : '' },
    { lbl:'خصومات', val: discounts.length, sub: fmtNum(discounts.reduce((s,x)=>s+x.value,0)) + ' ل.س', cls:'' },
  ];

  document.getElementById('shieldApp').innerHTML = `
  <div class="mgr-layout">
    <nav class="mgr-sidebar" id="mgrSidebar">
      <button class="mgr-side-toggle" onclick="document.getElementById('mgrSidebar').classList.toggle('expanded')">☰</button>
      <div class="mgr-side-logo"><strong>α</strong><span>alfaprosys</span></div>
      <div class="mgr-side-nav">${MGR_NAV.map(n => navLink(n)).join('')}</div>
      <div class="mgr-side-spacer"></div>
      <a class="mgr-side-link danger" href="index.html" onclick="sessionStorage.removeItem('alfaprosys_role')" title="خروج"><span class="mgr-side-ic">🚪</span><span class="mgr-side-lb">خروج</span></a>
    </nav>

    <div class="mgr-content-panel">
      <div id="mgrContent">
        <div class="mgr-page-header">
          <div>
            <div class="mgr-page-brand">alfaprosys</div>
            <div class="mgr-page-title">🛡️ درع المالك</div>
          </div>
          <div class="sh-note">رصد الإلغاءات والخصومات والجرد الناقص — بعد الربط: هوية الكاشير عبر الأجهزة + تنبيه فوري على هاتفك</div>
        </div>

        <div class="sh-ranges">
          ${[['today','اليوم'],['week','هذا الأسبوع'],['all','كل الفترات']].map(([r,l]) =>
            `<button class="sh-range ${shieldRange===r?'active':''}" onclick="setShieldRange(this,'${r}')">${l}</button>`).join('')}
        </div>

        <div class="mgr-stats-grid" style="margin-bottom:12px;">
          ${kpis.map(k => `
          <div class="mgr-stat-card ${k.cls}">
            <div class="mgr-stat-lbl">${k.lbl}</div>
            <div class="mgr-stat-val">${k.val}</div>
            <div class="mgr-stat-sub">${k.sub}</div>
          </div>`).join('')}
        </div>

        <div class="sh-kinds">
          <button class="sh-kind ${kindFilter==='all'?'active':''}" onclick="setKindFilter(this,'all')">الكل (${evAll.length})</button>
          ${Object.entries(KIND).map(([k,v]) => {
            const n = evAll.filter(x => x.kind === k).length;
            return `<button class="sh-kind ${kindFilter===k?'active':''}" onclick="setKindFilter(this,'${k}')">${v.icon} ${v.label} (${n})</button>`;
          }).join('')}
        </div>

        <div class="mgr-card" style="padding:0;overflow:hidden;">
          ${ev.length ? `
          <div class="sh-table-wrap">
            <table class="sh-table">
              <thead><tr><th>الخطورة</th><th>النوع</th><th>التفصيل</th><th>الموظف</th><th>التاريخ</th><th>القيمة (ل.س)</th></tr></thead>
              <tbody>
                ${ev.map(x => { const sv = severity(x.value); const kd = KIND[x.kind]; return `
                <tr class="${sv.cls}">
                  <td><span class="sh-sev ${sv.cls}">${sv.icon} ${sv.label}</span></td>
                  <td class="sh-kind-cell">${kd.icon} ${kd.label}</td>
                  <td class="sh-detail">${x.detail}</td>
                  <td>${e(x.who)}</td>
                  <td class="sh-date">${e(x.date)}${x.time ? '<br>' + e(x.time) : ''}</td>
                  <td class="sh-val">${fmtNum(x.value)}</td>
                </tr>`; }).join('')}
              </tbody>
            </table>
          </div>` : `<div class="sh-empty">🛡️ لا أحداث مشبوهة في هذه الفترة — كل شيء تحت السيطرة</div>`}
        </div>
      </div>
    </div>
  </div>

  <div class="mgr-nav-scrim" id="mgrNavScrim" onclick="closeNav()"></div>
  <button class="mgr-fab" onclick="toggleNav()">☰</button>
  <nav class="mgr-mobile-nav" id="mgrMobileNav">
    <div class="mgr-mobile-nav-head"><strong>قائمة الإدارة</strong><button onclick="closeNav()">✕</button></div>
    <div class="mgr-mobile-nav-grid">
      ${MGR_NAV.map(n => navLink(n, true)).join('')}
      <a class="mgr-mobile-nav-link danger" href="index.html" onclick="sessionStorage.removeItem('alfaprosys_role')"><span>🚪</span><small>خروج</small></a>
    </div>
  </nav>`;
}
(window.alfaStart||function(fn){fn();})(function () {
  invoices = DATA.invoices || [];
  session = DATA.cashierSession || {};
  renderShield();
});

