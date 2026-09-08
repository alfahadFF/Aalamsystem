/* ============================================================
   sw.js — Service Worker: العمل دون اتصال (Offline-first)
   - تثبيت: تخزين مسبق لكل ملفات التطبيق.
   - تصفح (HTML): شبكة أولًا ثم الكاش (لتلقي التحديثات، ويعمل أوفلاين).
   - ملفات الإعداد الحساسة (config.js): شبكة أولًا دائماً — لا يجوز
     تجميدها بالكاش، لأنها تحمل مفاتيح/إعدادات تتغيّر بدون نشر كامل.
   - أصول أخرى (js/css/أيقونات): كاش أولًا ثم شبكة.
   - خطوط خارجية: كاش أولًا بعد أول تحميل (تعمل أوفلاين لاحقًا).
   ============================================================ */
const VERSION = 'alfaprosys-v36';

/* ملفات تُجلب دائماً من الشبكة أولاً (لا كاش-أولاً أبداً)
   أضف هنا أي ملف إعدادات حسّاس مستقبلاً بنفس الطريقة */
const NETWORK_FIRST_ASSETS = [
  'assets/js/config.js',
  'assets/js/qz-tray.min.js',   // مكتبة QZ — محلية الآن (كانت CDN) لطباعة أوفلاين
];

const CORE = [
  'manifest.webmanifest',
  'assets/icon/logo.png',
  // الصفحات — كاملة
  'index.html','pos.html','dashboard.html','sales.html','invoices.html',
  'open_invoices.html','edit_invoice.html','reports.html','menu_admin.html',
  'inventory.html','employees.html','customers.html','contracts.html',
  'expenditures.html','cash_reports.html','cashier_session.html','costs.html',
  'online_orders.html','kitchen.html','queue.html','tables.html',
  'audit_log.html','delivery.html','owner_shield.html','settings.html',
  'suppliers.html','track.html',
  // السكربتات المشتركة
  'qz-key.html',
  'assets/js/config.js','assets/js/utils.js','assets/js/data.js','assets/js/app.js',
  'assets/js/nav.js','assets/js/notify.js','assets/js/alerts.js','assets/js/thermal.js',
  'assets/js/qz-tray.min.js',
  'assets/js/sync/storage.js','assets/js/sync/queue.js','assets/js/sync/remote.js',
  // السكربتات — كل صفحة
  'assets/js/pos.js','assets/js/manager.js','assets/js/sales.js','assets/js/invoices.js',
  'assets/js/open_invoices.js','assets/js/edit_invoice.js','assets/js/reports.js',
  'assets/js/menu_admin.js','assets/js/inventory.js','assets/js/employees.js',
  'assets/js/customers.js','assets/js/contracts.js','assets/js/expenditures.js',
  'assets/js/cash_reports.js','assets/js/cashier_session.js','assets/js/costs.js',
  'assets/js/online_orders.js','assets/js/kitchen.js','assets/js/queue.js',
  'assets/js/tables.js','assets/js/audit_log.js','assets/js/delivery.js',
  'assets/js/owner_shield.js','assets/js/settings.js','assets/js/suppliers.js',
  'assets/js/track.js',
  // الأنماط — كل الملفات
  'assets/css/style.css','assets/css/manager.css','assets/css/reports.css',
  'assets/css/costs.css','assets/css/cash_reports.css','assets/css/contracts.css',
  'assets/css/employees.css','assets/css/expenditures.css','assets/css/inventory.css',
  'assets/css/invoices.css','assets/css/menu_admin.css','assets/css/online.css',
  'assets/css/tables.css','assets/css/delivery.css',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION).then(async (cache) => {
      // أضف كل ملف على حدة حتى لا يُفشِل 404 واحد التثبيت كله
      await Promise.all(CORE.map((url) =>
        cache.add(url).catch(() => null)
      ));
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // تصفح الصفحات: شبكة أولًا ثم الكاش (يعمل أوفلاين)
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(req, copy));
        return res;
      }).catch(() =>
        caches.match(req).then((hit) => hit || caches.match('index.html'))
      )
    );
    return;
  }

  // ملفات إعداد حساسة: شبكة أولًا دائماً (config.js وما شابهه)
  if (url.origin === self.location.origin &&
      NETWORK_FIRST_ASSETS.some((p) => url.pathname.endsWith('/' + p) || url.pathname.endsWith(p))) {
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // أصول نفس الأصل: كاش أولًا
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((hit) => hit ||
        fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
          return res;
        })
      )
    );
    return;
  }

  // أصول خارجية (خطوط Google): كاش أولًا بعد أول تحميل
  event.respondWith(
    caches.match(req).then((hit) => hit ||
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req))
    )
  );
});


/* ── إشعارات الهاتف: استقبال Push من الخادم عند النشر لاحقاً ── */
self.addEventListener('push', function (event) {
  var data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = { body: event.data && event.data.text() }; }
  event.waitUntil(self.registration.showNotification(data.title || '🔔 alfaprosys', {
    body: data.body || '',
    icon: 'assets/icon/logo.png',
    badge: 'assets/icon/logo.png',
    tag: data.tag || 'alfa-push',
    data: { url: data.url || 'dashboard.html' },
    vibrate: [180, 90, 180],
  }));
});

/* نقر الإشعار يفتح الشاشة المعنية */
self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var url = (event.notification.data && event.notification.data.url) || 'dashboard.html';
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
    for (var i = 0; i < list.length; i++) if (list[i].url.indexOf(url) > -1 && 'focus' in list[i]) return list[i].focus();
    return clients.openWindow(url);
  }));
});
