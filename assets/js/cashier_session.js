/* ================================================================
   cashier_session.js — الوردية والصندوق — alfaprosys
   + الإغلاق الأعمى + إحصائيات المبيعات + ربط Supabase
   + زر التوصيل + سجل الورديات السابقة
   ================================================================ */
const DATA = window.DEMO_DATA;
let session = DATA.cashierSession || {};
let closeResult = null;
let blindOpen = false;

/* ── أدوات ── */
function now() { return new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }); }
function today() { return window.businessDay ? businessDay() : new Date().toISOString().slice(0, 10); }
function goPOS() { location.href = 'pos.html'; }

/* ── حفظ الجلسة ── */
function saveSession() {
  DATA.cashierSession = session;
  if (window.alfaPersist) window.alfaPersist();
  if (window.SessionSync) SessionSync.pushSoon();
}

/* ── إحصائيات مبيعات اليوم ── */
function getSalesStats() {
  var d = today();
  var invoices = (DATA.invoices || []).filter(function (i) {
    return (i.date || '') === d && i.status !== 'cancelled';
  });
  var cancelled = (DATA.invoices || []).filter(function (i) {
    return (i.date || '') === d && i.status === 'cancelled';
  });
  var cash = invoices.filter(function (i) { return (i.pay_type || 'cash') === 'cash'; });
  var deferred = invoices.filter(function (i) { return i.pay_type === 'deferred'; });
  var partial = invoices.filter(function (i) { return i.pay_type === 'partial'; });
  var cashTotal = cash.reduce(function (s, i) { return s + (i.total || 0); }, 0);
  var deferredTotal = deferred.reduce(function (s, i) { return s + (i.total || 0); }, 0);
  var partialTotal = partial.reduce(function (s, i) {
    var paid = (i.discount_detail && i.discount_detail.partial_amount) || 0;
    return s + paid;
  }, 0);
  var partialDebt = partial.reduce(function (s, i) {
    var paid = (i.discount_detail && i.discount_detail.partial_amount) || 0;
    return s + Math.max(0, (i.total || 0) - paid);
  }, 0);
  var exps = (DATA.expenditures || []).filter(function (x) { return (x.date || '') === d; })
    .reduce(function (s, x) { return s + (x.amount || 0); }, 0);

  return {
    totalInvoices: invoices.length,
    cancelledCount: cancelled.length,
    cash: { count: cash.length, total: cashTotal },
    deferred: { count: deferred.length, total: deferredTotal },
    partial: { count: partial.length, paid: partialTotal, debt: partialDebt },
    expenditures: exps,
    totalRevenue: cashTotal + partialTotal,
  };
}

/* ── المتوقع في الدرج ── */
function expectedCash() {
  var stats = getSalesStats();
  var base = session.opening_cash || 0;
  return {
    base: base,
    cashSales: stats.cash.total,
    partialPaid: stats.partial.paid,
    exps: stats.expenditures,
    expected: base + stats.cash.total + stats.partial.paid - stats.expenditures,
  };
}

/* ══════════════════════════════════════════
   الإجراءات
   ══════════════════════════════════════════ */

function toggleShift() {
  if (session.shift_open) return openBlindClose();
  session.shift_open = true;
  session.shift_opened_at = new Date().toISOString();
  session.cashier_name = session.cashier_name || 'الكاشير';
  saveSession();
  render();
  showToast('تم فتح الوردية', '🕘');
}

function toggleCashbox() {
  var v = Number(document.getElementById('openingCash')?.value || 0);
  if (!session.cashbox_open) session.opening_cash = v;
  session.cashbox_open = !session.cashbox_open;
  session.cashbox_opened_at = session.cashbox_open ? now() : '';
  saveSession();
  render();
  showToast(session.cashbox_open ? 'تم فتح الصندوق' : 'تم إغلاق الصندوق', '💵');
}

/* ── الإغلاق الأعمى ── */
function openBlindClose() { blindOpen = true; render(); }
function cancelBlindClose() { blindOpen = false; render(); }
function confirmBlindClose() {
  var counted = Number(document.getElementById('blindCounted')?.value || 0);
  if (!document.getElementById('blindCounted')?.value.trim())
    return showToast('أدخل الموجود فعلياً في الدرج أولاً', '⚠️');
  var exp = expectedCash();
  var diff = counted - exp.expected;
  closeResult = {
    at: now(), counted: counted, expected: exp.expected, diff: diff,
    cashSales: exp.cashSales, partialPaid: exp.partialPaid || 0,
    exps: exp.exps, base: exp.base,
  };

  /* حفظ في سجل الورديات */
  var stats = getSalesStats();
  var history = DATA.shifts_history || [];
  history.unshift({
    id: 'sh_' + Date.now(),
    date: today(),
    cashier: session.cashier_name || 'الكاشير',
    opened_at: session.shift_opened_at || '',
    closed_at: new Date().toISOString(),
    opening_cash: session.opening_cash || 0,
    sales_total: stats.totalRevenue,
    invoices_count: stats.totalInvoices,
    cancelled_count: stats.cancelledCount,
    by_payment: {
      cash: stats.cash,
      deferred: stats.deferred,
      partial: stats.partial,
    },
    expenditures: stats.expenditures,
    closing_cash: counted,
    difference: diff,
    notes: '',
  });
  DATA.shifts_history = history;
  if (window.SessionSync) SessionSync.pushClose(history[0]);

  session.last_close = closeResult;
  session.shift_open = false;
  session.cashbox_open = false;
  saveSession();
  if (window.alfaPersist) window.alfaPersist();
  blindOpen = false;
  render();
  showToast('أُغلقت الوردية — النتيجة أمامك الآن', '🕘');
}
function dismissCloseResult() { closeResult = null; render(); }

/* ══════════════════════════════════════════
   الرسم
   ══════════════════════════════════════════ */
function render() {
  var stats = getSalesStats();
  var exp = expectedCash();
  var history = (DATA.shifts_history || []).slice(0, 5);

  document.getElementById('sessionApp').innerHTML =
    '<div class="simple-shell">' +
      /* ── الشريط العلوي ── */
      '<header class="simple-topbar">' +
        '<div>' +
          '<div class="pos-brand">alfaprosys</div>' +
          '<div class="pos-subtitle">الوردية والصندوق — ' + e(today()) + '</div>' +
        '</div>' +
        '<div style="display:flex;gap:6px;flex-wrap:wrap;">' +
          '<a class="back-to-pos-btn" href="delivery.html" style="background:#059669;">🛵 التوصيل</a>' +
          '<a class="back-to-pos-btn" href="kitchen.html" style="background:#d97706;">🍳 المطبخ</a>' +
          '<a class="back-to-pos-btn" href="invoices.html">🧾 الفواتير</a>' +
          '<a class="back-to-pos-btn" href="pos.html">→ البيع</a>' +
        '</div>' +
      '</header>' +

      '<main class="simple-content session-grid">' +

        /* ── الوردية ── */
        '<section class="simple-card session-card">' +
          '<div class="session-icon">🕘</div><h1>الوردية</h1>' +
          '<div class="session-status ' + (session.shift_open ? 'open' : 'closed') + '">' + (session.shift_open ? 'مفتوحة' : 'مغلقة') + '</div>' +
          '<p>' + (session.shift_open
            ? 'بدأت: ' + e(session.shift_opened_at ? session.shift_opened_at.slice(11, 16) : '')
            : (session.last_close ? 'آخر إغلاق: ' + e(session.last_close.at) : 'لم تُفتح وردية بعد')) + '</p>' +
          '<button class="' + (session.shift_open ? 'session-danger' : 'session-primary') + '" onclick="toggleShift()">' +
            (session.shift_open ? '🔒 إغلاق الوردية (عمياء)' : 'فتح الوردية') +
          '</button>' +
          (session.shift_open ? '<p class="blind-hint">ستُدخل الموجود فعلياً دون رؤية المتوقع</p>' : '') +
        '</section>' +

        /* ── الصندوق ── */
        '<section class="simple-card session-card">' +
          '<div class="session-icon">💵</div><h1>الصندوق</h1>' +
          '<div class="session-status ' + (session.cashbox_open ? 'open' : 'closed') + '">' + (session.cashbox_open ? 'مفتوح' : 'مغلق') + '</div>' +
          '<label class="cash-input-label"><span>مبلغ افتتاح الصندوق</span>' +
            '<input id="openingCash" type="number" inputmode="numeric" value="' + (session.opening_cash || '') + '" placeholder="0">' +
          '</label>' +
          '<button class="' + (session.cashbox_open ? 'session-danger' : 'session-primary') + '" onclick="toggleCashbox()">' +
            (session.cashbox_open ? 'إغلاق الصندوق' : 'فتح الصندوق') +
          '</button>' +
        '</section>' +

        /* ── ملخص المبيعات ── */
        '<section class="simple-card session-summary">' +
          '<h1>📊 ملخص مبيعات اليوم</h1>' +
          '<div class="summary-row"><span>إجمالي الفواتير</span><strong>' + stats.totalInvoices + ' فاتورة</strong></div>' +
          (stats.cancelledCount ? '<div class="summary-row" style="color:#ef4444;"><span>ملغاة</span><strong>' + stats.cancelledCount + '</strong></div>' : '') +
          '<div class="summary-row"><span>💵 نقدي (' + stats.cash.count + ')</span><strong>' + fmtNum(stats.cash.total) + ' ل.س</strong></div>' +
          '<div class="summary-row"><span>📒 آجل (' + stats.deferred.count + ')</span><strong style="color:#f59e0b;">' + fmtNum(stats.deferred.total) + ' ل.س</strong></div>' +
          (stats.partial.count ? '<div class="summary-row"><span>💳 جزئي (' + stats.partial.count + ') — مدفوع</span><strong>' + fmtNum(stats.partial.paid) + ' ل.س</strong></div>' +
            '<div class="summary-row"><span>  — ذمة متبقية</span><strong style="color:#ef4444;">' + fmtNum(stats.partial.debt) + ' ل.س</strong></div>' : '') +
          (stats.expenditures ? '<div class="summary-row" style="color:#ef4444;"><span>📤 مصروفات</span><strong>− ' + fmtNum(stats.expenditures) + ' ل.س</strong></div>' : '') +
          '<div class="summary-row" style="border-top:2px solid var(--line);padding-top:8px;margin-top:4px;">' +
            '<span style="font-weight:900;">إجمالي الإيرادات النقدية</span>' +
            '<strong style="font-size:16px;color:var(--fahad-blue);">' + fmtNum(stats.totalRevenue) + ' ل.س</strong>' +
          '</div>' +
        '</section>' +

        /* ── المتوقع في الدرج ── */
        (session.shift_open ? 
          '<section class="simple-card session-summary">' +
            '<h1>💰 المتوقع في الدرج</h1>' +
            '<div class="summary-row"><span>افتتاح الصندوق</span><strong>' + fmtNum(exp.base) + '</strong></div>' +
            '<div class="summary-row"><span>+ مبيعات نقدية</span><strong>' + fmtNum(exp.cashSales) + '</strong></div>' +
            (exp.partialPaid ? '<div class="summary-row"><span>+ مدفوعات جزئية</span><strong>' + fmtNum(exp.partialPaid) + '</strong></div>' : '') +
            (exp.exps ? '<div class="summary-row"><span>− مصروفات</span><strong style="color:#ef4444;">' + fmtNum(exp.exps) + '</strong></div>' : '') +
            '<div class="summary-row" style="border-top:2px solid var(--fahad-blue);padding-top:8px;margin-top:4px;">' +
              '<span style="font-weight:900;">المتوقع</span>' +
              '<strong style="font-size:18px;color:var(--fahad-blue);">' + fmtNum(exp.expected) + ' ل.س</strong>' +
            '</div>' +
          '</section>'
        : '') +

        /* ── آخر نتيجة جرد ── */
        (session.last_close ?
          '<section class="simple-card session-summary">' +
            '<h1>📋 آخر جرد (عمياء)</h1>' +
            '<div class="summary-row"><span>المتوقع</span><strong>' + fmtNum(session.last_close.expected) + ' ل.س</strong></div>' +
            '<div class="summary-row"><span>الموجود فعلياً</span><strong>' + fmtNum(session.last_close.counted) + ' ل.س</strong></div>' +
            '<div class="summary-row ' + (session.last_close.diff < 0 ? 'diff-neg' : session.last_close.diff > 0 ? 'diff-pos' : 'diff-ok') + '">' +
              '<span>الفرق</span>' +
              '<strong>' + (session.last_close.diff > 0 ? '+' : '') + fmtNum(session.last_close.diff) + ' ل.س ' +
                (session.last_close.diff === 0 ? '✅' : session.last_close.diff > 0 ? '📈' : '🔴') +
              '</strong>' +
            '</div>' +
          '</section>'
        : '') +

        /* ── سجل الورديات ── */
        (history.length ?
          '<section class="simple-card" style="grid-column:1/-1;">' +
            '<h1 style="margin-bottom:10px;">📜 آخر الورديات</h1>' +
            '<div style="overflow-x:auto;">' +
              '<table style="width:100%;border-collapse:collapse;font-size:12px;">' +
                '<thead><tr style="background:var(--card-subtle);">' +
                  '<th style="padding:8px;text-align:right;">التاريخ</th>' +
                  '<th style="padding:8px;text-align:right;">الكاشير</th>' +
                  '<th style="padding:8px;text-align:right;">افتتاح</th>' +
                  '<th style="padding:8px;text-align:right;">مبيعات</th>' +
                  '<th style="padding:8px;text-align:right;">فواتير</th>' +
                  '<th style="padding:8px;text-align:right;">إغلاق</th>' +
                  '<th style="padding:8px;text-align:right;">الفرق</th>' +
                '</tr></thead><tbody>' +
                history.map(function (sh) {
                  var d = sh.difference || 0;
                  return '<tr style="border-bottom:1px solid var(--line);">' +
                    '<td style="padding:6px 8px;">' + e(sh.date) + '</td>' +
                    '<td style="padding:6px 8px;">' + e(sh.cashier) + '</td>' +
                    '<td style="padding:6px 8px;">' + fmtNum(sh.opening_cash) + '</td>' +
                    '<td style="padding:6px 8px;font-weight:700;">' + fmtNum(sh.sales_total) + '</td>' +
                    '<td style="padding:6px 8px;">' + (sh.invoices_count || 0) + (sh.cancelled_count ? ' <span style="color:#ef4444;">(' + sh.cancelled_count + ' ملغى)</span>' : '') + '</td>' +
                    '<td style="padding:6px 8px;">' + fmtNum(sh.closing_cash) + '</td>' +
                    '<td style="padding:6px 8px;font-weight:900;color:' + (d === 0 ? '#22c55e' : d > 0 ? '#f59e0b' : '#ef4444') + ';">' +
                      (d > 0 ? '+' : '') + fmtNum(d) + (d === 0 ? ' ✅' : '') +
                    '</td>' +
                  '</tr>';
                }).join('') +
              '</tbody></table>' +
            '</div>' +
          '</section>'
        : '') +

      '</main>' +

      /* ── مودال الإغلاق الأعمى ── */
      (blindOpen ?
        '<div class="blind-scrim"></div>' +
        '<div class="blind-modal">' +
          '<div class="blind-icon">🔒</div>' +
          '<div class="blind-title">إغلاق الوردية — جرد أعمى</div>' +
          '<p class="blind-sub">أحصِ ما في الدرج فعلياً وأدخله — الفرق يظهر بعد الإغلاق</p>' +
          '<label class="blind-field">' +
            '<span>الموجود فعلياً في الدرج (ل.س)</span>' +
            '<input id="blindCounted" type="number" inputmode="numeric" placeholder="0" autofocus>' +
          '</label>' +
          '<div class="blind-actions">' +
            '<button class="blind-cancel" onclick="cancelBlindClose()">رجوع</button>' +
            '<button class="blind-confirm" onclick="confirmBlindClose()">تأكيد الإغلاق</button>' +
          '</div>' +
        '</div>'
      : '') +

      /* ── نتيجة الجرد ── */
      (closeResult ?
        '<div class="blind-scrim"></div>' +
        '<div class="blind-modal blind-result">' +
          '<div class="blind-icon">' + (closeResult.diff === 0 ? '✅' : closeResult.diff > 0 ? '📈' : '🔴') + '</div>' +
          '<div class="blind-title">نتيجة الجرد — ' +
            (closeResult.diff === 0 ? 'مطابق تماماً' : closeResult.diff > 0 ? 'زيادة في الدرج' : 'نقص في الدرج') +
          '</div>' +
          '<div class="blind-rows">' +
            '<div><span>افتتاح الصندوق</span><b>' + fmtNum(closeResult.base) + ' ل.س</b></div>' +
            '<div><span>+ مبيعات نقدية</span><b>' + fmtNum(closeResult.cashSales) + ' ل.س</b></div>' +
            (closeResult.partialPaid ? '<div><span>+ مدفوعات جزئية</span><b>' + fmtNum(closeResult.partialPaid) + ' ل.س</b></div>' : '') +
            '<div><span>− مصروفات</span><b>' + fmtNum(closeResult.exps) + ' ل.س</b></div>' +
            '<div style="border-top:1px solid var(--line);padding-top:6px;"><span>المتوقع</span><b>' + fmtNum(closeResult.expected) + ' ل.س</b></div>' +
            '<div><span>الموجود فعلياً</span><b>' + fmtNum(closeResult.counted) + ' ل.س</b></div>' +
            '<div class="' + (closeResult.diff < 0 ? 'blind-neg' : closeResult.diff > 0 ? 'blind-pos' : '') + '">' +
              '<span>الفرق</span><b>' + (closeResult.diff > 0 ? '+' : '') + fmtNum(closeResult.diff) + ' ل.س</b>' +
            '</div>' +
          '</div>' +
          '<div class="blind-actions">' +
            '<button class="blind-confirm" onclick="dismissCloseResult()">تم</button>' +
          '</div>' +
        '</div>'
      : '') +

    '</div>';
}

/* ── التهيئة ── */
(window.alfaStart || function (fn) { fn(); })(function () {
  session = DATA.cashierSession || {};
  render();
  if (window.AlfaLive) AlfaLive.start(12000, function () {
    session = DATA.cashierSession || session;
    render();
  });
  if (window.SessionSync && SessionSync.pull) {
    setInterval(function () {
      if (navigator.onLine === false) return;
      SessionSync.pull().then(function () {
        session = DATA.cashierSession || session;
        render();
      }).catch(function () {});
    }, 15000);
  }
});
