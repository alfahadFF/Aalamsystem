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

/* ================================================================
   alfaAutoRefresh(fn, intervalMs?)
   ----------------------------------------------------------------
   يعيد تشغيل fn عند اكتمال السحب من السحابة (حدث alfa:cloud-ready)،
   واختيارياً بصورة دورية عبر AlfaLive.

   لماذا؟ السحب يستبدل المصفوفة كاملة (DEMO_DATA.invoices = ... جديدة)،
   بينما شاشات عدة التقطت المرجع مرة واحدة عند الإقلاع، فتبقى تعرض
   البذرة المحلية إلى الأبد. هذه الشاشات: reports / sales /
   cash_reports / owner_shield / audit_log / tables / track.

   ملاحظة: لا تستدعِ fn فوراً — الشاشة تبقى مسؤولة عن رسمها الأول،
   ونتجنب الرسم المزدوج.
   ================================================================ */
window.alfaAutoRefresh = function (fn, intervalMs) {
  if (typeof fn !== 'function') return;
  var run = function () { try { fn(); } catch (err) { console.error('[alfaAutoRefresh]', err); } };

  /* 1) الحدث الطبيعي: اكتمل السحب بعد تسجيل المستمع */
  try { window.addEventListener('alfa:cloud-ready', run); } catch (e) {}

  /* 2) إن كان السحب قد اكتمل قبل تسجيل المستمع (سباق تحميل) نفّذ فوراً */
  try {
    if (window.__ALFA_BG_P && typeof window.__ALFA_BG_P.then === 'function') {
      window.__ALFA_BG_P.then(run).catch(function () {});
    }
  } catch (e) {}

  /* 3) تحديث دوري اختياري (يسحب الفواتير ثم يعيد الرسم) */
  if (intervalMs && window.AlfaLive && window.AlfaLive.start) {
    try { window.AlfaLive.start(intervalMs, run); } catch (e) {}
  }
};

/* ── نوع الطلب الموحّد ──
   السحابة تخزّن طاولات باسم dinein، بينما شاشات عدة تقارنها بـ 'table'
   فتظهر «طاولة: 0 ل.س» رغم وجود طلبات طاولات فعلية. مصدر واحد للتحويل. */
window.alfaOrderType = function (inv) {
  const t = String((inv && inv.type) || '').toLowerCase();
  if (t === 'dinein' || t === 'dine_in' || t === 'table') return 'table';
  if (t === 'delivery') return 'delivery';
  return 'takeaway';
};
window.alfaOrderTypeLabel = function (inv) {
  const k = window.alfaOrderType(inv);
  return k === 'table' ? '🍽️ طاولة' : k === 'delivery' ? '🛵 توصيل' : '🥡 سفري';
};

/* ── رمز السحب الترويجي: 8 أرقام ──
   مصدر واحد لتوليده (شاشة البيع + إعادة المحاولة عند التضارب)،
   حتى لا تُوزَّع خوارزميتان مختلفتان على ملفين. */
window.alfaNewDrawCode = function () {
  var a = new Uint32Array(1);
  if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(a);
  else a[0] = Math.floor(Math.random() * 0xFFFFFFFF);
  return String(a[0] % 100000000).padStart(8, '0');
};

/* ================================================================
   alfaLiveInput — حافظ التركيز عند إعادة الرسم
   ----------------------------------------------------------------
   المشكلة: شاشات عدة ترسم نفسها بالكامل (innerHTML) عند كل ضغطة
   مفتاح، فيُدمَّر حقل الإدخال ويُعاد بناؤه من الصفر. النتيجة على
   الجوال: يُفقد التركيز فتُغلق لوحة المفاتيح بعد كل حرف، ويقفز
   المؤشّر إلى آخر النص.

   الاستخدام في القالب:
     <input id="invSearchInput" oninput="alfaLiveInput(this, function(v){ searchQuery = v; }, render)">

   تعيد الدالة التركيز وموضع المؤشّر (ونطاق التحديد) بعد الرسم.
   ================================================================ */
window.alfaLiveInput = function (el, apply, rerender) {
  if (!el) return;
  var id = el.id;
  var s = null, e2 = null;
  try { s = el.selectionStart; e2 = el.selectionEnd; } catch (err) {}

  try { apply(el.value); } catch (err) { console.error('[alfaLiveInput] apply', err); }
  try { rerender(); }     catch (err) { console.error('[alfaLiveInput] render', err); }

  var restore = function () {
    var next = id ? document.getElementById(id) : null;
    if (!next || typeof next.focus !== 'function') return;
    /* preventScroll: لا تُزحزح الصفحة أثناء فتح لوحة المفاتيح */
    try { next.focus({ preventScroll: true }); }
    catch (err) { try { next.focus(); } catch (err2) {} }
    if (next.setSelectionRange && s != null) {
      try { next.setSelectionRange(s, e2 == null ? s : e2); } catch (err) {}
    }
  };
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(restore);
  else setTimeout(restore, 0);
};

/* ================================================================
   التكلفة الموحّدة — مصدر واحد للحقيقة (نسخة عن منطق costs.js)
   ----------------------------------------------------------------
   alfaItemCost(item)    : تكلفة صنف (يدوية إن وُجدت، وإلا من الوصفات)
   alfaInvoiceCost(inv)  : تكلفة فاتورة = Σ (تكلفة الصنف × الكمية)
   ================================================================ */
window.alfaItemCost = function (item) {
  if (!item) return 0;
  if (item.cost_mode === 'manual' && Number(item.cost_manual) > 0) return Number(item.cost_manual) || 0;
  var total = 0;
  (((window.DEMO_DATA || {}).inventory) || []).forEach(function (inv) {
    (inv.recipe || []).forEach(function (line) {
      if (line && line.item_id === item.id) {
        total += (Number(inv.cost_per_unit) || 0) * (Number(line.qty) || 0);
      }
    });
  });
  return total;
};

window.alfaInvoiceCost = function (inv) {
  var lines = (inv && inv.items) || [];
  if (!lines.length) return 0;
  var byId = {};
  (((window.DEMO_DATA || {}).items) || []).forEach(function (it) { byId[String(it.id)] = it; });
  return lines.reduce(function (sum, line) {
    var it = byId[String(line.id)] || byId[String(line.item_id)] || null;
    return sum + (window.alfaItemCost(it) * (Number(line.qty) || 0));
  }, 0);
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
