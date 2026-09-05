/* ================================================================
   tables.js — خريطة الطاولات — alfaprosys
   شاغرة/مشغولة مباشرة من الفواتير المفتوحة:
   - الطاولة الشاغرة → نقرة واحدة تفتح فاتورة طاولة في شاشة البيع.
   - الطاولة المشغولة → الانتقال لشاشة الفواتير المفتوحة.
   ================================================================ */
const DATA = window.DEMO_DATA;

const HALLS = ['صالة داخلية', 'صالة خارجية', 'صالة العائلات'];

/* فاتورة الطاولة المفتوحة (إن وُجدت) */
function openInvFor(hall, table) {
  return (DATA.invoices || []).find(i =>
    i.type === 'table' && i.status === 'open' && i.hall === hall && i.table_label === table);
}

/* دقائق مروراً على وقت الفاتورة (HH:MM) */
function minsSince(hhmm) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || ''));
  if (!m) return null;
  const now = new Date();
  let diff = (now.getHours() * 60 + now.getMinutes()) - (+m[1] * 60 + +m[2]);
  if (diff < 0) diff += 24 * 60; // بعد منتصف الليل
  return diff;
}
function durLabel(mins) {
  if (mins == null) return '';
  if (mins < 60) return mins + ' د';
  return Math.floor(mins / 60) + ' س ' + (mins % 60) + ' د';
}

function render() {
  const tables = DATA.tables || [];
  const stats = HALLS.map(h => ({
    hall: h,
    busy: tables.filter(t => openInvFor(h, t)).length,
    total: tables.length,
  }));
  const busyAll = stats.reduce((s, x) => s + x.busy, 0);
  const totalAll = stats.reduce((s, x) => s + x.total, 0);

  document.getElementById('tablesApp').innerHTML = `
    <header class="tm-topbar">
      <a class="tm-back" href="pos.html">‹ شاشة البيع</a>
      <div class="tm-title"><strong>🗺️ خريطة الطاولات</strong><span>${busyAll} مشغولة من ${totalAll}</span></div>
      <div class="tm-legend">
        <span class="tm-chip tm-chip-free">شاغرة</span>
        <span class="tm-chip tm-chip-busy">مشغولة</span>
      </div>
    </header>

    ${HALLS.map(h => {
      const sec = stats.find(s => s.hall === h);
      return `
      <section class="tm-hall">
        <div class="tm-hall-head">
          <h2>${e(h)}</h2>
          <span class="tm-hall-count">${sec.busy}/${sec.total}</span>
        </div>
        <div class="tm-grid">
          ${tables.map(t => {
            const inv = openInvFor(h, t);
            if (!inv) return `
              <a class="tm-card tm-free" href="pos.html?hall=${encodeURIComponent(h)}&table=${encodeURIComponent(t)}">
                <div class="tm-table-name">${e(t)}</div>
                <div class="tm-status">شاغرة — اضغط للطلب</div>
              </a>`;
            const mins = minsSince(inv.time);
            return `
              <a class="tm-card tm-busy" href="open_invoices.html">
                <div class="tm-table-name">${e(t)}</div>
                <div class="tm-inv-no">فاتورة ${e(window.invNoLabel ? invNoLabel(inv) : inv.id)}</div>
                <div class="tm-inv-meta">${fmtNum(inv.total)} ل.س${mins != null ? ' · ' + durLabel(mins) : ''}</div>
                <div class="tm-status">اضغط لعرض الفاتورة</div>
              </a>`;
          }).join('')}
        </div>
      </section>`;
    }).join('')}
  `;
}

(window.alfaStart||function(fn){fn();})(function () {
  if (typeof setInterval === 'function' && !window.__TABLES_TIMER) {
    window.__TABLES_TIMER = setInterval(render, 30000);
  }
  render();
  if (window.AlfaLive) AlfaLive.start(8000, render);
});
