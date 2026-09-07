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

/* ================================================================
   قوائم البيع — إخفاء غير المتوفر
   ----------------------------------------------------------------
   availableItems(catId?) : الأصناف المتاحة فقط (is_available !== false)
   sellableCategories()   : التصنيفات النشطة التي تحتوي صنفاً متاحاً
                            واحداً على الأقل، مرتّبة حسب sort_order.

   ملاحظة: شاشة «إدارة الأصناف» لا تستخدم هاتين الدالتين عمداً —
   يجب أن ترى كل الأصناف والتصنيفات لتتمكّن من إعادة تفعيلها.
   ================================================================ */
window.availableItems = function (catId) {
  const list = (window.DEMO_DATA && window.DEMO_DATA.items) || [];
  return list.filter(function (i) {
    return i && i.is_available !== false && (catId == null || i.category_id === catId);
  });
};

window.sellableCategories = function () {
  const cats = (window.DEMO_DATA && window.DEMO_DATA.categories) || [];
  return cats
    .filter(function (c) { return c && c.is_active && window.availableItems(c.id).length > 0; })
    .sort(function (a, b) { return (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0); });
};

/* عدد الأصناف والتصنيفات المخفية (للتشخيص من كونسول المتصفح) */
window.hiddenMenuStats = function () {
  const items = (window.DEMO_DATA && window.DEMO_DATA.items) || [];
  const cats  = (window.DEMO_DATA && window.DEMO_DATA.categories) || [];
  return {
    items_total: items.length,
    items_hidden: items.filter(function (i) { return i && i.is_available === false; }).length,
    cats_total: cats.filter(function (c) { return c && c.is_active; }).length,
    cats_hidden: cats.filter(function (c) {
      return c && c.is_active && window.availableItems(c.id).length === 0;
    }).map(function (c) { return c.name; }),
  };
};



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
