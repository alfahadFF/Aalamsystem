/* ============================================================
   sw.js — Service Worker: العمل دون اتصال (Offline-first)
   - تثبيت: تخزين مسبق لكل ملفات التطبيق.
   - تصفح (HTML): سباق شبكة 2.5ث وإلا الكاش فوراً + تحديث خلفي (وضع سوريا).
   - ملفات الإعداد الحساسة (config.js): نفس السباق — لا تجميد بالكاش
     (التحديث يصل خلفاً) ولا تعليق للإقلاع على شبكة بطيئة.
   - أصول أخرى (js/css/أيقونات): كاش أولًا ثم شبكة.
   - خطوط خارجية: كاش أولًا بعد أول تحميل (تعمل أوفلاين لاحقًا).
   ============================================================ */
const VERSION = 'alfaprosys-v65'; /* v65: الكاشير يدخل العملاء — إصلاح صلاحية */ 

/* ملفات تُجلب دائماً من الشبكة أولاً (لا كاش-أولاً أبداً)
   أضف هنا أي ملف إعدادات حسّاس مستقبلاً بنفس الطريقة */
const NETWORK_FIRST_ASSETS = [
  'assets/js/config.js',
  'assets/js/qz-tray.min.js',   // مكتبة QZ — محلية الآن (كانت CDN) لطباعة أوفلاين
];

/* مهلة سباق الشبكة (وضع سوريا): إن لم ترد الشبكة خلالها قُدّم الكاش فوراً
   وأكمل التحديث في الخلفية — التنقل بين الشاشات لا ينتظر الشبكة أبداً */
const NAV_TIMEOUT = 2500;

/* سباق شبكة/كاش: الأحدث إن كانت الشبكة سريعة، وإلا الكاش فوراً + تحديث خلفي.
   يعيد { res, bg } حيث bg وعد التحديث الخلفي (يُمرر لـ waitUntil). */
function networkRace(req, ms) {
  return caches.open(VERSION).then((cache) =>
    cache.match(req).then((cached) => {
      const net = fetch(req).then((res) => {
        if (res && res.ok) cache.put(req, res.clone()).catch(() => {});
        return res;
      }).catch(() => null);
      return Promise.race([
        net,
        new Promise((resolve) => setTimeout(() => resolve('timeout'), ms)),
      ]).then((winner) => {
        if (winner && winner !== 'timeout') return { res: winner, bg: null };
        if (cached) return { res: cached, bg: net };
        return net.then((late) => ({ res: late, bg: null }));
      });
    })
  );
}

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
  'assets/js/sync/storage.js','assets/js/sync/outbox.js','assets/js/sync/queue.js','assets/js/sync/remote.js',
  'assets/js/sync/manager.js',
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

  // تصفح الصفحات: سباق شبكة 2.5ث وإلا الكاش فوراً + تحديث خلفي (يعمل أوفلاين)
  if (req.mode === 'navigate') {
    event.respondWith(
      networkRace(req, NAV_TIMEOUT).then(({ res, bg }) => {
        if (bg) event.waitUntil(bg);
        return res || caches.match('index.html');
      })
    );
    return;
  }

  // ملفات إعداد حساسة: سباق شبكة 2.5ث وإلا الكاش (config.js سكربت حاجب — لا يعلّق الإقلاع)
  if (url.origin === self.location.origin &&
      NETWORK_FIRST_ASSETS.some((p) => url.pathname.endsWith('/' + p) || url.pathname.endsWith(p))) {
    event.respondWith(
      networkRace(req, NAV_TIMEOUT).then(({ res, bg }) => {
        if (bg) event.waitUntil(bg);
        return res || caches.match(req);
      })
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
