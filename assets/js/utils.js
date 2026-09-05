/* ================================================================
   utils.js — الدوال المساعدة المشتركة — alfaprosys
   يُحمَّل في كل صفحة بعد config.js وقبل ملف الصفحة.
   ================================================================ */

/* ── تعقيم HTML (حماية XSS) ── */
window.e = window.escapeHtml = function(v) {
  return String(v ?? '').replace(/[&<>'"]/g, c =>
    ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[c]));
};

/* ── تنسيق الأرقام ── */
window.fmtNum = function(n) {
  return Number(n || 0).toLocaleString('en-US');
};
window.fmt = function(n) {
  return fmtNum(n) + ' ل.س';
};

/* ── Toast إشعار ── */
window.showToast = function(msg, icon) {
  icon = icon || '✅';
  const t = document.getElementById('toast');
  if (!t) return;
  t.innerHTML = '<span>' + icon + '</span><span>' + e(msg) + '</span>';
  t.classList.add('show');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(function() { t.classList.remove('show'); }, 2200);
};

/* ── مرجع البيانات ── */
Object.defineProperty(window, 'DATA', {
  get: function() { return window.DEMO_DATA; },
  configurable: true,
});



// إخفاء القائمة الجانبية إذا كان العرض داخل نافذة منبثقة (iframe)
(function() {
  if (new URLSearchParams(window.location.search).get('embed') === '1' || window.name === 'mgrIframe') {
    document.documentElement.classList.add('is-embedded-view');
    const style = document.createElement('style');
    style.innerHTML = `
      .is-embedded-view .mgr-sidebar,
      .is-embedded-view .mgr-fab,
      .is-embedded-view .mgr-mobile-nav,
      .is-embedded-view .mgr-nav-scrim,
      .is-embedded-view .mgr-side-toggle { display: none !important; }
      .is-embedded-view .mgr-content-panel { margin-right: 0 !important; width: 100% !important; padding: 15px !important; }
      .is-embedded-view .mgr-layout { display: block !important; }
    `;
    document.head.appendChild(style);
  }
})();
