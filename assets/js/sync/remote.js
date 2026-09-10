/* ============================================================
   sync/remote.js — السحابة شاشة تلو الأخرى
   المنيو: جداول categories + items كما ملأها المستخدم
   (name = الصنف، variant = الحجم)
   ============================================================ */
window.SyncRemote = {
  /* تفريغ موحّد عبر المحرك العام — يغني عن الدفع القديم.
     (الدفع القديم الكامل مع delExtra أُبطل: كان يمسح جداول السحابة إن
     فُرّغ وذاكرة الصفحة فارغة — كما يحدث عند عودة الإنترنت بعد إقلاع
     أوفلاين، حيث يتجاهل الإقلاع النسخة المحلية!) */
  async flush() {
    const cfg = window.ALFA_CONFIG || {};
    if (!cfg.syncEnabled || !cfg.supabase || !cfg.supabase.url) {
      return { sent: 0, skipped: true, reason: 'sync-disabled' };
    }
    var sent = 0;
    try {
      if (window.AlfaOutbox) {
        const rs = await AlfaOutbox.flushAll();
        (rs || []).forEach(function (r) { if (r && r.flushed) sent += (r.rows || 0) + (r.dels || 0); });
      }
    } catch (e) {}
    try { if (window.MenuOutbox) { await MenuOutbox.flush(); } } catch (e) {}
    return { sent: sent, skipped: false };
  },
};

window.AlfaCloud = {
  menu: { state: 'idle' },
  customers: { state: 'idle' },
  liveMenu: function () {
    try {
      const id = String(((window.DEMO_DATA && DEMO_DATA.items) || [])[0] && DEMO_DATA.items[0].id || '');
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    } catch (e) { return false; }
  },
  html: function () {
    const m = this.menu || {};
    const live = this.liveMenu();
    if (m.state === 'ok') {
      return '<div class="cloud-banner cloud-ok">☁ سُحب الآن من السحابة — '
        + (m.cats || 0) + ' تصنيفات · ' + (m.items || 0)
        + ' صنفاً — الربط نجح</div>';
    }
    if (m.state === 'fail' && live) {
      return '<div class="cloud-banner cloud-warn">⚠ تعذر تحديث السحابة الآن — يظهر آخر منيو محفوظ (ليس تجريبياً)'
        + (m.error ? ' · ' + String(m.error).slice(0, 90) : '') + '</div>';
    }
    if (m.state === 'fail' || m.state === 'offline' || m.state === 'empty') {
      const why = m.error ? ' · ' + String(m.error).slice(0, 90) : '';
      return '<div class="cloud-banner cloud-fail">⚠ تعذر الربط بالسحابة — المنيو فارغ حتى ينجح السحب' + why + '</div>';
    }
    return '';
  },
};

window.AlfaSB = (function () {
  function cfg() { return (window.ALFA_CONFIG && ALFA_CONFIG.supabase) || {}; }
  function enabled() { const s = cfg(); return !!(s.url && s.anonKey); }
  function useProxy() {
    try {
      if (location.protocol === 'file:') return false;
      return /e2b\.app$/i.test(String(location.hostname || ''));
    } catch (e) { return false; }
  }
  function root() {
    if (useProxy()) return '';
    return String(cfg().url || '').replace(/\/$/, '');
  }
  function headers(prefer) {
    const s = cfg();
    const h = {
      apikey: s.anonKey,
      Authorization: 'Bearer ' + s.anonKey,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
    if (prefer) h.Prefer = prefer;
    return h;
  }
  function rest(table, qs) { return root() + '/rest/v1/' + table + (qs || ''); }
  /* مهلة كل طلب (وضع سوريا): الطلب المعلق يُجهض بدل التكدس — تُضبط عبر AlfaSB.timeoutMs */
  function rfetch(url, opts) {
    const ms = Number((window.AlfaSB && window.AlfaSB.timeoutMs) || 15000);
    if (typeof AbortController === 'undefined') return fetch(url, opts);
    const ctrl = new AbortController();
    const t = setTimeout(function () { try { ctrl.abort(); } catch (e) {} }, ms);
    const o = opts || {};
    o.signal = ctrl.signal;
    return fetch(url, o).then(function (res) { clearTimeout(t); return res; },
      function (err) {
        clearTimeout(t);
        if (ctrl.signal.aborted) throw new Error('timeout after ' + ms + 'ms');
        throw err;
      });
  }
  function get(table, qs) {
    return rfetch(rest(table, qs || '?select=*'), { headers: headers() }).then(function (res) {
      return res.text().then(function (t) {
        if (!res.ok) throw new Error(table + ' ' + res.status + ' ' + t.slice(0, 180));
        return t ? JSON.parse(t) : [];
      });
    });
  }
  function upsert(table, rows, conflict, opts) {
    if (!rows.length) return Promise.resolve();
    const o = opts || {};
    return rfetch(rest(table, '?on_conflict=' + conflict), {
      method: 'POST',
      headers: headers('resolution=merge-duplicates,return=minimal'),
      body: JSON.stringify(rows),
      /* keepalive: يتيح إتمام الطلب عند مغادرة الصفحة (pagehide) */
      keepalive: !!o.keepalive,
    }).then(function (res) {
      return res.text().then(function (t) {
        if (!res.ok) throw new Error(table + ' upsert ' + res.status + ' ' + t.slice(0, 220));
      });
    });
  }
  function del(table, ids) {
    if (!ids.length) return Promise.resolve();
    const list = ids.map(function (id) { return '"' + String(id).replace(/"/g, '') + '"'; }).join(',');
    return rfetch(rest(table, '?id=in.(' + list + ')'), {
      method: 'DELETE',
      headers: headers('return=minimal'),
    }).then(function (res) {
      if (!res.ok) return res.text().then(function (t) { throw new Error(table + ' delete ' + t.slice(0, 180)); });
    });
  }
  function delFilter(table, qs) {
    return rfetch(rest(table, qs || ''), {
      method: 'DELETE',
      headers: headers('return=minimal'),
    }).then(function (res) {
      if (!res.ok) return res.text().then(function (t) { throw new Error(table + ' delete ' + t.slice(0, 180)); });
    });
  }
  function rpc(fn, args) {
    return rfetch(root() + '/rest/v1/rpc/' + encodeURIComponent(fn), {
      method: 'POST', headers: headers('return=representation'),
      body: JSON.stringify(args || {}),
    }).then(function (res) { return res.text().then(function (t) {
      if (!res.ok) throw new Error('rpc ' + fn + ' ' + res.status + ' ' + t.slice(0, 220));
      return t ? JSON.parse(t) : null;
    }); });
  }
  function insert(table, rows) {
    if (!rows.length) return Promise.resolve();
    return rfetch(rest(table, ''), {
      method: 'POST',
      headers: headers('return=minimal'),
      body: JSON.stringify(rows),
    }).then(function (res) {
      return res.text().then(function (t) {
        if (!res.ok) throw new Error(table + ' insert ' + res.status + ' ' + t.slice(0, 220));
      });
    });
  }
  return { enabled: enabled, get: get, rpc: rpc, upsert: upsert, del: del, delFilter: delFilter, insert: insert, timeoutMs: 15000 };
})();

window.MenuSync = (function () {
  const sb = window.AlfaSB;
  let pushTimer = null;
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  function isUuid(id) { return UUID.test(String(id || '')); }

  /* ────────────────────────────────────────────────────────────
     baseName — الاسم الأساسي للصنف (محتوى العمود name في السحابة)

     محلياً:  it.name = «الاسم + الصيغة» (مؤلَّف في fromRemote)
     سحابياً:  العمود name = الاسم وحده، والعمود variant = الصيغة

     لذلك عند الدفع نحو السحابة يجب تجريد الاسم من الصيغة، وإلا
     تكرّر الاسم عند كل سحب («برغر سندويش عادي سندويش عادي»).
     ──────────────────────────────────────────────────────────── */
  function baseName(it) {
    const full = String((it && it.name) || '').trim();
    if (!full) return '';
    const raw = String((it && (it.variant_clean || it.variant)) || '').trim();
    if (!raw) return full;
    const cands = [raw, raw.replace(/\s*-\s*/g, ' '), raw.replace(/\s+/g, ' ')];
    for (let k = 0; k < cands.length; k++) {
      const v = String(cands[k] || '').trim();
      if (v && full.length > v.length && full.slice(-v.length) === v) {
        return full.slice(0, full.length - v.length).trim();
      }
    }
    return full;
  }
  window.AlfaItemBase = baseName;

  function fromRemote(i, cats) {
    const cid = i.category_id != null ? String(i.category_id) : '';
    const cat = (cats || []).find(function (c) { return String(c.id) === cid; });
    const base = String(i.name || '').trim();
    const variant = String(i.variant || '').trim();
    return {
      id: String(i.id),
      category_id: cid,
      category_name: cat ? cat.name : '',
      /* الاسم كما في العمود name — يُستخدم لتسمية زر البيع وللدفع بلا تكرار */
      base_name: base,
      family: i.family || base,
      option_name: i.option_name || base,
      variant: variant || null,
      variant_clean: i.variant_clean || variant || null,
      name: variant ? (base + ' ' + variant) : base,
      price: Math.round(Number(i.price) || 0),
      cost_mode: i.cost_mode || 'manual',
      cost_manual: Math.round(Number(i.cost_manual) || 0),
      is_available: i.is_available !== false,
      sort_order: Number(i.sort_order) || 0,
      order_count: Number(i.order_count) || 0,
      is_pinned_popular: !!i.is_pinned_popular,
      image_url: i.image_url || null,
      barcode: i.barcode || null,
      category_name: i.category_name || (cat ? cat.name : ''),
      price_new: i.price_new,
      price_usd: i.price_usd,
      discount_pct: i.discount_pct,
      online_discount_pct: i.online_discount_pct,
    };
  }

  function toRemote(it) {
    if (!isUuid(it.id) || !isUuid(it.category_id)) return null;
    const family = String(it.family || it.option_name || '').trim();
    const variant = String(it.variant || it.variant_clean || '').trim();

    /* ── إصلاح: العمود name يجب أن يحمل اسم الصنف نفسه، لا اسم «الصنف الأب».
       سابقاً كانت تُكتب family فوق الاسم فيضيع الاسم الذي أدخله المستخدم
       (مثال: كُتب «برغر» بدل «كريسبي برغر»). ── */
    const base = String(it.base_name || baseName(it) || it.name || family || '').trim();

    /* ── إصلاح: option_name كان يتجمّد على اسم التصنيف الرئيسي عندما يُترك
       حقل «التصنيف الفرعي» فارغاً عند الإنشاء. نُصحّحه هنا تلقائياً. ── */
    const catName = String(it.category_name || '').trim();
    const optRaw  = String(it.option_name || '').trim();
    const optName = (!optRaw || optRaw === catName) ? (family || base) : optRaw;

    return {
      id: it.id,
      category_id: it.category_id,
      name: base,
      variant: variant || null,
      family: family || null,
      option_name: optName || null,
      variant_clean: it.variant_clean || variant || null,
      category_name: it.category_name || null,
      barcode: it.barcode || null,
      price: Math.round(Number(it.price) || 0),
      cost_mode: it.cost_mode || 'manual',
      cost_manual: Math.round(Number(it.cost_manual) || 0),
      is_available: it.is_available !== false,
      sort_order: Number(it.sort_order) || 0,
      order_count: Number(it.order_count) || 0,
      is_pinned_popular: !!it.is_pinned_popular,
      image_url: it.image_url || null,
    };
  }

  function pull() {
    if (!sb.enabled()) {
      if (window.AlfaCloud) window.AlfaCloud.menu = { state: 'fail', error: 'لا مفاتيح سحابة' };
      return Promise.resolve({ skipped: true });
    }
    if (navigator.onLine === false) {
      if (window.AlfaCloud) window.AlfaCloud.menu = { state: 'offline', error: 'بدون إنترنت' };
      return Promise.resolve({ skipped: true });
    }
    return Promise.all([
      sb.get('categories', '?select=id,name,icon,sort_order,is_active&order=sort_order.asc'),
      sb.get('items', '?select=id,category_id,name,price,cost_mode,cost_manual,is_available,sort_order,order_count,is_pinned_popular,image_url,variant,variant_clean,family,option_name,barcode,category_name,price_new,price_usd,discount_pct,online_discount_pct&order=sort_order.asc'),
    ]).then(function (pair) {
      const cats = pair[0] || [];
      const remote = pair[1] || [];
      if (!remote.length) {
        if (window.AlfaCloud) window.AlfaCloud.menu = { state: 'empty', error: 'جدول الأصناف فارغ' };
        return { skipped: true, reason: 'empty' };
      }
      /* قبل الكتابة فوق النسخة المحلية: ارفع أي تعديلات معلقة أولاً
         (push-before-pull) حتى لا يمحو السحب تعديلات لم تصل بعد. */
      const gate = (window.MenuOutbox && MenuOutbox.flush) ? MenuOutbox.flush() : Promise.resolve({ skipped: true });
      return gate.then(function () {
        if (window.MenuOutbox && MenuOutbox.hasPending()) {
          /* تعذّر الرفع رغم الاتصال — اعرض أحدث نسخة محلية ولا تمحُها. */
          const snap = MenuOutbox.snapshot();
          if (snap && window.DEMO_DATA) {
            DEMO_DATA.categories = snap.cats || [];
            DEMO_DATA.items = snap.items || [];
            DEMO_DATA.offers = [];
            try { if (window.alfaPersist) window.alfaPersist(); } catch (e) {}
          }
          if (window.AlfaCloud) window.AlfaCloud.menu = { state: 'pending', error: 'تعديلات معلقة بانتظار الرفع' };
          try { if (window.showToast) showToast('توجد تعديلات منيو معلقة — ستُرفع تلقائياً', '⏳'); } catch (e) {}
          return { skipped: true, reason: 'pending-local' };
        }
        const items = remote.map(function (i) { return fromRemote(i, cats); });
        if (window.DEMO_DATA) {
          DEMO_DATA.categories = cats;
          DEMO_DATA.items = items;
          /* لا تُعرض عروض/خصومات الملف التجريبي مع المنيو الحقيقي */
          DEMO_DATA.offers = [];
          DEMO_DATA.discount_settings = { invoice_pct: 0, items: [] };
        }
        if (window.AlfaCloud) window.AlfaCloud.menu = { state: 'ok', items: items.length, cats: cats.length, at: Date.now() };
        try { if (window.alfaPersist) window.alfaPersist(); } catch (e) {}
        return { pulled: true, items: items.length, cats: cats.length };
      });
    }).catch(function (e) {
      if (window.AlfaCloud) window.AlfaCloud.menu = { state: 'fail', error: String(e && e.message || e) };
      return { skipped: true, error: String(e && e.message || e) };
    });
  }

  /* تحويل لقطة محلية (أصناف+تصنيفات) إلى صفوف السحابة — تُستخدم للرفع
     المباشر ورفع الصندوق الصادر ورفع المغادرة (keepalive). */
  function buildRows(itemsArr, catsArr) {
    const items = (itemsArr || []).map(toRemote).filter(Boolean);
    const cats = (catsArr || []).map(function (c) {
      if (!isUuid(c.id)) return null;
      return {
        id: String(c.id), name: c.name || '', icon: c.icon || '🏷️',
        sort_order: Number(c.sort_order) || 0, is_active: c.is_active !== false,
      };
    }).filter(Boolean);
    return { items: items, cats: cats };
  }

  /* رفع لقطة صريحة (لا يقرأ DEMO_DATA) — يُستخدم مع الصندوق الصادر عند
     الإقلاع حيث تكون الذاكرة فارغة بعد. upsert ⇒ آمن للتكرار. */
  function pushPayload(itemsArr, catsArr, opts) {
    if (!sb.enabled() || navigator.onLine === false) return Promise.resolve({ skipped: true, reason: 'offline' });
    const rows = buildRows(itemsArr, catsArr);
    if (!rows.items.length && !rows.cats.length) return Promise.resolve({ skipped: true, reason: 'no-uuid' });
    const o = opts || {};
    return sb.upsert('categories', rows.cats, 'id', o)
      .then(function () { return sb.upsert('items', rows.items, 'id', o); })
      .then(function () { return { pushed: true, items: rows.items.length, cats: rows.cats.length }; });
  }

  function push() {
    if (!sb.enabled() || navigator.onLine === false) return Promise.resolve({ skipped: true });
    const d = window.DEMO_DATA || {};
    return pushPayload(d.items, d.categories).then(function (r) {
      if (r && r.pushed) {
        try { if (window.showToast) showToast('تم رفع وتحديث المنيو في السحابة بنجاح ✅', '☁️'); } catch (err) {}
      }
      return r;
    });
  }

  /* ── رفع فوري مباشر (بديل pushSoon المؤجَّل لمسارات الحفظ الصريحة):
     يُستدعى لحظة الضغط على «حفظ» فيصل قاعدة البيانات مباشرة عند توفر
     الاتصال، ويمسح الصندوق الصادر عند النجاح، ويُبقيه (مع تنبيه واضح)
     عند الفشل لتُعاد المحاولة تلقائياً. ── */
  function pushNow() {
    if (!sb.enabled() || navigator.onLine === false) return Promise.resolve({ skipped: true, reason: 'offline' });
    return push().then(function (r) {
      if (r && r.pushed && window.MenuOutbox) MenuOutbox.clear();
      return r;
    }).catch(function (e) {
      try { if (window.showToast) showToast('تعذّر الرفع المباشر — حُفظ وسيُعاد تلقائياً: ' + (e && e.message || e), '⚠️'); } catch (err) {}
      throw e;
    });
  }

  function pushSoon() {
    if (!sb.enabled()) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(function () {
      push().catch(function (e) {
        try { if (window.showToast) { console.error(e); showToast('تعذر رفع المنيو: ' + (e && e.message ? e.message : JSON.stringify(e)), '⚠️'); } } catch (err) {}
      });
    }, 700);
  }

  let menuPullInflight = null;
  function menuPullGuarded() {
    if (!menuPullInflight) {
      menuPullInflight = pull().then(function (r) { menuPullInflight = null; return r; },
        function (e) { menuPullInflight = null; throw e; });
    }
    return menuPullInflight;
  }

  return {
    /* منع تكدس سحب المنيو: المتزامنون يتشاركون نفس الوعد (المنيو بلا صندوق outbox) */
    enabled: sb.enabled, pull: menuPullGuarded, push: push, pushSoon: pushSoon,
    pushNow: pushNow, pushPayload: pushPayload, buildRows: buildRows,
    /* الحذف يُرجع الوعد خاماً (دون ابتلاع الخطأ) ليتعامل معه commitMenuDelete:
       نجاح ⇒ يُستكمل الحفظ، فشل ⇒ يُقيَّد في الصندوق الصادر ويُعاد تلقائياً. */
    removeItem: function (id) { return (!sb.enabled() || !id) ? Promise.resolve({ skipped: true }) : sb.del('items', [id]); },
    removeCat: function (id) { return (!sb.enabled() || !id) ? Promise.resolve({ skipped: true }) : sb.del('categories', [id]); },
  };
})();

/* ================================================================
   MenuOutbox — الصندوق الصادر للمنيو (ضمان عدم ضياع أي تعديل)
   ----------------------------------------------------------------
   المشكلة الأصلية: الحفظ كان يجدول الرفع بعد 700ms فقط (pushSoon)،
   فإن غادر المستخدم الصفحة قبلها مات المؤقت، ثم يمحو السحبُ عند
   الإقلاع التالي النسخةَ المحلية ⇒ تعديلات تضيع بصمت.
   الحل: كل حفظ صريح (إضافة/تعديل/حذف/أسعار/تكاليف) يُقيَّد فوراً في
   هذا الصندوق الدائم (IndexedDB) ثم يُرفع مباشرة. أي فشل (انقطاع،
   إغلاق سريع، خطأ شبكة) يُعاد تلقائياً: عند عودة الإنترنت، وعند كل
   إقلاع قبل السحب (push-before-pull)، وبمحاولة أخيرة عند المغادرة.
   الرفع upsert ⇒ آمن للتكرار ولا ازدواجية إطلاقاً.
   ================================================================ */
window.MenuOutbox = (function () {
  const KEY = 'menu_outbox_v1';
  let cache = null;      /* {items, cats, delItems:[], delCats:[], at} */
  let hydrated = false;
  let flushing = false;
  let inFlight = null;

  function toast(msg, icon) { try { if (window.showToast) showToast(msg, icon); } catch (e) {} }
  function refreshBadge() { try { if (window.NetBadge) NetBadge.refresh(); } catch (e) {} }
  function cloudOn() { return !!(window.AlfaSB && AlfaSB.enabled && AlfaSB.enabled()); }

  function persist() {
    refreshBadge();
    if (!(window.SyncStorage && SyncStorage.setKey)) return Promise.resolve(false);
    if (cache) return SyncStorage.setKey(KEY, cache);
    if (SyncStorage.delKey) return SyncStorage.delKey(KEY);
    return Promise.resolve(false);
  }

  function hydrate() {
    if (hydrated) return Promise.resolve(cache);
    hydrated = true;
    if (!(window.SyncStorage && SyncStorage.getKey)) return Promise.resolve(cache);
    return SyncStorage.getKey(KEY).then(function (v) {
      if (v && ((v.items && v.items.length) || (v.delItems && v.delItems.length) || (v.delCats && v.delCats.length))) cache = v;
      refreshBadge();
      return cache;
    }).catch(function () { return cache; });
  }

  function hasPending() {
    if (!cloudOn()) return false;
    return !!(cache && ((cache.items && cache.items.length) || (cache.delItems && cache.delItems.length) || (cache.delCats && cache.delCats.length)));
  }

  /* تقييد لقطة كاملة من الحالة الحالية — يُستدعى لحظة كل حفظ صريح. */
  function markDirty(itemsArr, catsArr) {
    if (!cloudOn()) return;
    const prev = cache || {};
    try {
      cache = {
        items: JSON.parse(JSON.stringify(itemsArr || [])),
        cats: JSON.parse(JSON.stringify(catsArr || [])),
        delItems: prev.delItems || [],
        delCats: prev.delCats || [],
        at: Date.now(),
      };
    } catch (e) { return; }
    persist();
  }

  /* تقييد حذف معلَق (يُنفَّذ قبل رفع اللقطة عند التفريغ). */
  function addDelete(kind, id, itemsArr, catsArr) {
    if (!cloudOn() || !id) return;
    const sid = String(id);
    const d = window.DEMO_DATA || {};
    try {
      cache = {
        items: JSON.parse(JSON.stringify(itemsArr || d.items || [])),
        cats: JSON.parse(JSON.stringify(catsArr || d.categories || [])),
        delItems: ((cache && cache.delItems) || []).slice(),
        delCats: ((cache && cache.delCats) || []).slice(),
        at: Date.now(),
      };
    } catch (e) { return; }
    const key = (kind === 'cat') ? 'delCats' : 'delItems';
    if (cache[key].indexOf(sid) < 0) cache[key].push(sid);
    persist();
  }

  function clear() { cache = null; persist(); }

  /* تفريغ الصندوق: الحذوفات أولاً ثم اللقطة. يُستدعى عند الإقلاع (قبل
     السحب)، وعند عودة الإنترنت. */
  function flush() {
    if (flushing) return inFlight || Promise.resolve({ skipped: true, reason: 'busy' });
    flushing = true;
    inFlight = hydrate().then(function () {
      if (!hasPending()) return { skipped: true, reason: 'empty' };
      if (navigator.onLine === false) return { skipped: true, reason: 'offline' };
      if (!window.MenuSync || !MenuSync.pushPayload) return { skipped: true, reason: 'no-sync' };
      const snap = cache;
      const sb = window.AlfaSB;
      const dels = [];
      if (snap.delItems && snap.delItems.length) dels.push(sb.del('items', snap.delItems));
      if (snap.delCats && snap.delCats.length) dels.push(sb.del('categories', snap.delCats));
      return Promise.all(dels).then(function () {
        return MenuSync.pushPayload(snap.items, snap.cats);
      }).then(function () {
        /* لا نمسح إلا إن كانت اللقطة ما تزال هي نفسها
           (لم يطرأ تعديل أحدث أثناء الرفع). */
        if (cache === snap) clear();
        else persist();
        toast('تم رفع تعديلات المنيو المعلقة إلى قاعدة البيانات ✅', '☁️');
        return { flushed: true };
      });
    }).catch(function (e) {
      return { failed: true, error: String((e && e.message) || e) };
    }).then(function (r) {
      flushing = false; inFlight = null; refreshBadge();
      return r;
    });
    return inFlight;
  }

  /* محاولة أخيرة عند مغادرة الصفحة — keepalive يُتم الطلب بعد المغادرة.
     غير مؤكدة: لا نمسح الصندوق هنا أبداً، فالإقلاع التالي يؤكد ويتفادى
     الفقد. تُتخطى إن تجاوزت الحمولة حدّ المتصفح (~64KB). */
  function flushKeepalive() {
    if (!hasPending()) return;
    if (navigator.onLine === false) return;
    if (!window.MenuSync || !MenuSync.buildRows) return;
    try {
      const sb = window.AlfaSB;
      const rows = MenuSync.buildRows(cache.items, cache.cats);
      const payload = JSON.stringify(rows);
      if (payload.length > 50000) return;
      sb.upsert('categories', rows.cats, 'id', { keepalive: true }).then(function () {
        return sb.upsert('items', rows.items, 'id', { keepalive: true });
      }).catch(function () {});
    } catch (e) {}
  }

  return {
    markDirty: markDirty, addDelete: addDelete, clear: clear,
    flush: flush, flushKeepalive: flushKeepalive,
    hasPending: hasPending, hydrate: hydrate,
    snapshot: function () { return cache; },
  };
})();

/* ── حفظ منيو مباشر: تقييد فوري في الصندوق + رفع فوري لقاعدة البيانات.
   تُستدعى من كل مسارات الحفظ الصريحة بدل pushSoon المؤجَّل. ── */
window.commitMenuNow = function (itemsArr, catsArr) {
  const d = window.DEMO_DATA || {};
  const items = itemsArr || d.items || [];
  const cats = catsArr || d.categories || [];
  if (window.MenuSync && MenuSync.enabled && !MenuSync.enabled()) {
    return Promise.resolve({ local: true }); /* وضع تجريبي بلا سحابة: محلي فقط */
  }
  try { if (window.MenuOutbox) MenuOutbox.markDirty(items, cats); } catch (e) {}
  if (navigator.onLine === false) {
    try { if (window.showToast) showToast('حُفظ محلياً — سيُرفع تلقائياً عند عودة الإنترنت', '⏳'); } catch (e) {}
    return Promise.resolve({ queued: true });
  }
  /* لا يرفض أبداً: الفشل مُقيَّد مسبقاً في الصندوق ومُعلن بتنبيه،
     فالرفض هنا مجرد ضجيج في صفحات تستدعيه نار-وانسَ. */
  if (window.MenuSync && MenuSync.pushNow) {
    return MenuSync.pushNow().catch(function (e) { return { failed: true, error: String((e && e.message) || e) }; });
  }
  if (window.MenuSync) MenuSync.pushSoon();
  return Promise.resolve({ legacy: true });
};

/* ── حذف مع ضمان الوصول: حذف مباشر، وعند الفشل يُقيَّد في الصندوق
   ويُعاد تلقائياً. deletedItemIds: أصناف حُذفت ضمناً (حذف تصنيف). ── */
window.commitMenuDelete = function (kind, id, itemsArr, catsArr, deletedItemIds) {
  const d = window.DEMO_DATA || {};
  const items = itemsArr || d.items || [];
  const cats = catsArr || d.categories || [];
  const direct = (window.MenuSync && (kind === 'cat' ? MenuSync.removeCat(id) : MenuSync.removeItem(id))) || Promise.resolve();
  /* حذف تصنيف يحذف ضمناً كل أصنافه من السحابة أيضاً (كانت تُبعث من جديد
     عند السحب التالي لأن الـ upsert لا يحذف!). */
  const extra = (deletedItemIds || []).map(function (iid) {
    return (window.MenuSync && MenuSync.removeItem(iid)) || Promise.resolve();
  });
  return Promise.all([direct].concat(extra)).then(function () {
    return window.commitMenuNow(items, cats);
  }).catch(function (e) {
    try {
      if (window.MenuOutbox) {
        MenuOutbox.addDelete(kind, id, items, cats);
        (deletedItemIds || []).forEach(function (iid) { MenuOutbox.addDelete('item', iid, items, cats); });
      }
    } catch (err) {}
    try { if (window.showToast) showToast('تعذّر الحذف من السحابة — سيُحذف تلقائياً: ' + (e && e.message || e), '⚠️'); } catch (err) {}
    return window.commitMenuNow(items, cats);
  });
};

/* ربط تلقائي: إعادة الرفع عند عودة الإنترنت + محاولة أخيرة عند المغادرة. */
try {
  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('online', function () { if (window.MenuOutbox) MenuOutbox.flush(); });
    window.addEventListener('pagehide', function () { if (window.MenuOutbox) MenuOutbox.flushKeepalive(); });
    if (typeof document !== 'undefined' && document.addEventListener) {
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'hidden' && window.MenuOutbox) MenuOutbox.flushKeepalive();
      });
    }
  }
  if (window.MenuOutbox) MenuOutbox.hydrate();
} catch (e) {}

window.CustomerSync = (function () {
  const sb = window.AlfaSB;
  let pushTimer = null;

  function row(c) {
    const due = c.next_due_date ? String(c.next_due_date) : null;
    return {
      id: String(c.id),
      name: c.name || '',
      phone: c.phone || null,
      whatsapp: c.whatsapp || null,
      address: c.address || null,
      type: c.type || 'regular',
      notes: c.notes || null,
      contract_price_list: c.contract_price_list || null,
      credit_limit: Number(c.credit_limit) || 0,
      credit_balance: Number(c.credit_balance) || 0,
      next_due_date: due || null,
      payments: Array.isArray(c.payments) ? c.payments : [],
      source: c.source || 'pos',
    };
  }

  function pull() {
    if (!sb.enabled() || navigator.onLine === false) return Promise.resolve({ skipped: true });
    return sb.get('customers', '?select=*&order=name.asc').then(function (remote) {
      if (!(remote || []).length) {
        /* لا ترحيل بيانات تجريبية — فقط عملاء حقيقيون يُنشؤون من POS */
        if (window.DEMO_DATA) DEMO_DATA.customers = [];
        window.AlfaCloud.customers = { state: 'ok', n: 0 };
        return { pulled: true, n: 0 };
      }
      if (window.DEMO_DATA) DEMO_DATA.customers = remote;
      window.AlfaCloud.customers = { state: 'ok', n: remote.length };
      return { pulled: true, n: remote.length };
    }).catch(function (e) {
      window.AlfaCloud.customers = { state: 'fail', error: String(e && e.message || e) };
      return { skipped: true };
    });
  }

  function push() {
    if (!sb.enabled() || navigator.onLine === false) return Promise.resolve({ skipped: true });
    const list = ((window.DEMO_DATA && DEMO_DATA.customers) || []).map(row);
    return sb.get('customers', '?select=id').then(function (remote) {
      const localIds = {};
      list.forEach(function (c) { localIds[c.id] = true; });
      const extra = (remote || []).map(function (r) { return r.id; }).filter(function (id) { return !localIds[id]; });
      return sb.upsert('customers', list, 'id')
        .then(function () { return sb.del('customers', extra); })
        .then(function () { return { pushed: true, n: list.length }; });
    });
  }

  function pushSoonLegacy() {
    clearTimeout(pushTimer);
    pushTimer = setTimeout(function () {
      push().catch(function (e) {
        try { if (window.showToast) showToast('تعذر رفع العملاء: ' + (e && e.message || e), '⚠️'); } catch (err) {}
      });
    }, 700);
  }
  function pushSoon() {
    if (!sb.enabled()) return;
    if (!window.AlfaOutbox) { pushSoonLegacy(); return; }
    /* التزام مباشر: تقييد دائم + دفع فوري + إعادة تلقائية */
    AlfaOutbox.commitRows('customers', (window.DEMO_DATA && DEMO_DATA.customers) || []);
  }

  /* ── صندوق صادر العملاء ── */
  function pushRows(rows) {
    if (!sb.enabled() || navigator.onLine === false) return Promise.reject(new Error('offline'));
    const list = (rows || []).map(row);
    if (!list.length) return Promise.resolve({ pushed: true, n: 0 });
    return sb.upsert('customers', list, 'id').then(function () { return { pushed: true, n: list.length }; });
  }
  function delRows(ids) {
    if (!sb.enabled() || navigator.onLine === false) return Promise.reject(new Error('offline'));
    return sb.del('customers', ids || []);
  }
  function applyBox(b) {
    if (!window.DEMO_DATA || !window.AlfaOutbox) return;
    DEMO_DATA.customers = AlfaOutbox.mergeLists(DEMO_DATA.customers, b);
    try { if (window.alfaPersist) window.alfaPersist(); } catch (e) {}
  }
  if (window.AlfaOutbox) AlfaOutbox.register('customers', { pushRows: pushRows, delRows: delRows });
  function pullGuarded() {
    if (!window.AlfaOutbox) return pull();
    return AlfaOutbox.guarded('customers', pull, applyBox)();
  }

  return {
    enabled: sb.enabled, pull: pullGuarded, push: push, pushSoon: pushSoon,
    remove: function (id) {
      if (!sb.enabled() || !id) return Promise.resolve({ skipped: true });
      if (window.AlfaOutbox) return AlfaOutbox.commitDelete('customers', id);
      return sb.del('customers', [id]).catch(function () {});
    },
  };
})();

window.InvoiceSync = (function () {
  const sb = window.AlfaSB;
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  function isUuid(id) { return UUID.test(String(id || '')); }

  function fromLine(l) {
    return {
      id: l.item_id || ('line_' + l.id),
      line_id: l.id,
      name: l.name || '',
      qty: Number(l.qty) || 0,
      price: Math.round(Number(l.price) || 0),
      total: Math.round(Number(l.total) || 0),
      note: l.note || '',
      offer_id: l.offer_id || null,
      is_free: !!l.is_free,
      offer_disc: !!l.offer_disc,
    };
  }

  function fromInv(row, lines) {
    /* ── إذا كانت الفاتورة لديها modified_at → حالتها المحلية = modified ── */
    var localStatus = row.status || 'open';
    if (localStatus === 'printed' && row.modified_at) localStatus = 'modified';
    var dd = row.discount_detail || null;
    var delivery = row.delivery_info || null;
    if (!delivery && dd && dd._delivery) {
      delivery = dd._delivery;
      dd = Object.assign({}, dd);
      delete dd._delivery;
    } else if (dd && dd._delivery) {
      dd = Object.assign({}, dd);
      delete dd._delivery;
    }
    /* خدمات الطلب (طاولة/توصيل) تُرحَّل داخل discount_detail وتُعاد هنا لحقول مباشرة */
    var svcT = (dd && Number(dd.service_table)) || 0;
    var svcD = (dd && Number(dd.service_delivery)) || 0;
    return {
      id: String(row.id),
      no: Number(row.no) || 0,
      date: row.date || '',
      type: row.type || 'takeaway',
      hall: row.hall || '',
      table_label: row.table_label || '',
      customer_name: row.customer_name || '',
      phone: row.phone || '',
      cashier: row.cashier || '',
      status: localStatus,
      kitchen_status: row.kitchen_status || 'new',
      pay_type: row.pay_type || null,
      contract_id: row.contract_id || null,
      online_order_id: row.online_order_id || null,
      discount: Number(row.discount) || 0,
      discount_detail: dd,
      delivery_info: delivery,
      service_table: svcT,
      service_delivery: svcD,
      service_fee: svcT + svcD,
      stock_applied: !!row.stock_applied,
      notes: row.notes || '',
      address: row.address || '',
      total: Number(row.total) || 0,
      time: row.time || '',
      queue_no: row.queue_no,
      cancel_reason: row.cancel_reason || null,
      pending_reason: row.pending_reason || null,
      cancelled_at: row.cancelled_at || null,
      modified_at: row.modified_at || null,
      modifications: row.modifications || null,
      cancel_items: row.cancel_items || null,
      last_kitchen_print: row.last_kitchen_print || null,
      is_online: !!row.is_online,
      is_new_customer: !!row.is_new_customer,
      created_at: row.created_at,
      items: (lines || []).map(fromLine),
    };
  }

  function toInv(inv) {
    /* ── حالة modified تبقى محلية فقط — في Supabase تبقى printed ── */
    var statusForDB = inv.status;
    if (statusForDB === 'modified') statusForDB = 'printed';
    var dd = inv.discount_detail ? Object.assign({}, inv.discount_detail) : {};
    if (inv.delivery_info) dd._delivery = inv.delivery_info;
    if (!Object.keys(dd).length) dd = null;
    return {
      id: String(inv.id),
      no: Number(inv.no) || 0,
      date: inv.date || '',
      type: inv.type || 'takeaway',
      hall: inv.hall || null,
      table_label: inv.table_label || null,
      customer_name: inv.customer_name || null,
      phone: inv.phone || null,
      cashier: inv.cashier || null,
      status: statusForDB,
      kitchen_status: inv.kitchen_status || 'new',
      pay_type: inv.pay_type || 'cash',
      contract_id: inv.contract_id || null,
      online_order_id: inv.online_order_id || inv.source_order_id || null,
      discount: Number(inv.discount) || 0,
      discount_detail: dd,
      delivery_info: inv.delivery_info || null,
      stock_applied: !!inv.stock_applied,
      notes: inv.notes || null,
      address: inv.address || null,
      total: Number(inv.total) || 0,
      time: inv.time || null,
      queue_no: inv.queue_no == null ? null : inv.queue_no,
      cancel_reason: inv.cancel_reason || null,
      pending_reason: inv.pending_reason || null,
      cancelled_at: inv.cancelled_at || null,
      modified_at: inv.modified_at || null,
      modifications: inv.modifications || null,
      cancel_items: inv.cancel_items || null,
      last_kitchen_print: inv.last_kitchen_print || null,
      is_online: !!inv.is_online,
      is_new_customer: !!inv.is_new_customer,
    };
  }

  function toLine(invId, c) {
    const iid = c.offer_disc ? null : (isUuid(c.id) ? c.id : null);
    return {
      invoice_id: invId,
      item_id: iid,
      name: c.name || '',
      qty: Number(c.qty) || 0,
      price: Math.round(Number(c.price) || 0),
      total: Math.round((Number(c.price) || 0) * (Number(c.qty) || 0)),
      note: c.note || null,
      offer_id: c.offer_id || null,
      is_free: !!c.is_free,
      offer_disc: !!c.offer_disc,
    };
  }

  function pull() {
    if (!sb.enabled() || navigator.onLine === false) return Promise.resolve({ skipped: true });
    return Promise.all([
      sb.get('invoices', '?select=*&order=created_at.desc'),
      sb.get('invoice_items', '?select=*'),
    ]).then(function (pair) {
      const rows = pair[0] || [];
      const lines = pair[1] || [];
      const by = {};
      lines.forEach(function (l) {
        const k = String(l.invoice_id);
        (by[k] || (by[k] = [])).push(l);
      });
      const invoices = rows.map(function (r) { return fromInv(r, by[String(r.id)] || []); });
      if (window.DEMO_DATA) DEMO_DATA.invoices = invoices;
      return { pulled: true, n: invoices.length };
    }).catch(function (e) {
      return { skipped: true, error: String(e && e.message || e) };
    });
  }

  function pushOne(inv) {
    if (!sb.enabled() || !inv || !inv.id) return Promise.resolve({ skipped: true });
    var row = toInv(inv);
    var lines = (inv.items || []).map(function (c) { return toLine(row.id, c); });
    console.log('[InvoiceSync] pushOne:', row.id, 'status:', row.status, 'items:', lines.length);
    return sb.upsert('invoices', [row], 'id')
      .then(function () {
        console.log('[InvoiceSync] invoices upsert OK:', row.id);
        return sb.delFilter('invoice_items', '?invoice_id=eq.' + encodeURIComponent(row.id));
      })
      .then(function () {
        console.log('[InvoiceSync] invoice_items delete OK:', row.id);
        return sb.insert('invoice_items', lines);
      })
      .then(function () {
        console.log('[InvoiceSync] invoice_items insert OK:', row.id, '—', lines.length, 'lines');
        return { pushed: true, id: row.id };
      })
      .catch(function (e) {
        console.error('[InvoiceSync] pushOne FAILED:', row.id, e && e.message || e);
        throw e;
      });
  }

  function removeRaw(id) {
    return sb.delFilter('invoice_items', '?invoice_id=eq.' + encodeURIComponent(id))
      .then(function () { return sb.del('invoices', [id]); });
  }
  function remove(id) {
    if (!sb.enabled() || !id) return Promise.resolve({ skipped: true });
    if (window.AlfaOutbox) return AlfaOutbox.commitDelete('invoices', id);
    return removeRaw(id).catch(function (e) {
      try { if (window.showToast) showToast('تعذر حذف الفاتورة من السحابة: ' + (e && e.message || e), '⚠️'); } catch (err) {}
    });
  }

  function pushSoon(inv) {
    if (!sb.enabled() || !inv) return;
    if (!window.AlfaOutbox) {
      pushOne(inv).catch(function (e) {
        try { if (window.showToast) showToast('تعذر رفع الفاتورة: ' + (e && e.message || e), '⚠️'); } catch (err) {}
      });
      return;
    }
    /* التزام مباشر للفاتورة: تُقيَّد قبل الدفع فلا تضيع أبداً */
    AlfaOutbox.commitOne('invoices', inv);
  }

  /* ── صندوق صادر الفواتير (أحرج مسار — فلوس حقيقية!) ── */
  function pushRows(rows) {
    if (!sb.enabled() || navigator.onLine === false) return Promise.reject(new Error('offline'));
    return (rows || []).reduce(function (p, inv) { return p.then(function () { return pushOne(inv); }); }, Promise.resolve())
      .then(function () { return { pushed: true, n: (rows || []).length }; });
  }
  function delRows(ids) {
    if (!sb.enabled() || navigator.onLine === false) return Promise.reject(new Error('offline'));
    return (ids || []).reduce(function (p, id) { return p.then(function () { return removeRaw(id); }); }, Promise.resolve());
  }
  function applyBox(b) {
    if (!window.DEMO_DATA || !window.AlfaOutbox) return;
    DEMO_DATA.invoices = AlfaOutbox.mergeLists(DEMO_DATA.invoices, b);
    try { if (window.alfaPersist) window.alfaPersist(); } catch (e) {}
  }
  if (window.AlfaOutbox) AlfaOutbox.register('invoices', { pushRows: pushRows, delRows: delRows });
  function pullGuarded() {
    if (!window.AlfaOutbox) return pull();
    return AlfaOutbox.guarded('invoices', pull, applyBox)();
  }

  return { pull: pullGuarded, pushOne: pushOne, pushSoon: pushSoon, remove: remove };
})();

window.PosSync = (function () {
  const sb = window.AlfaSB;

  function pullOffers() {
    return Promise.all([
      sb.get('offers', '?select=id,title,price,active,expires_at'),
      sb.get('offer_items', '?select=*').catch(function () { return []; }),
    ]).then(function (pair) {
      const offers = pair[0] || [];
      const lines = pair[1] || [];
      const by = {};
      lines.forEach(function (l) {
        const k = String(l.offer_id);
        (by[k] || (by[k] = [])).push({ item_id: l.item_id, qty: Number(l.qty) || 1, free: !!l.free });
      });
      return offers.map(function (o) {
        return {
          id: String(o.id),
          title: o.title || '',
          price: Math.round(Number(o.price) || 0),
          active: o.active !== false,
          expires_at: o.expires_at || null,
          items: by[String(o.id)] || [],
        };
      });
    });
  }

  function pull() {
    if (!sb.enabled() || navigator.onLine === false) return Promise.resolve({ skipped: true });
    return Promise.all([
      pullOffers().catch(function () { return []; }),
      sb.get('contracts', '?select=*').catch(function () { return []; }),
      sb.get('online_orders', '?select=*').catch(function () { return []; }),
      sb.get('settings', '?select=key,value&key=eq.discount').catch(function () { return []; }),
      sb.get('contract_installments', '?select=*').catch(function () { return []; }),
    ]).then(function (pack) {
      const offers = pack[0] || [];
      var contracts = pack[1] || [];
      const online = pack[2] || [];
      const discRows = pack[3] || [];
      const inst = pack[4] || [];
      if (inst.length && contracts.length) {
        const by = {};
        inst.forEach(function (r) {
          const k = String(r.contract_id);
          (by[k] || (by[k] = [])).push({
            id: r.id, due_date: r.due_date, amount: Number(r.amount) || 0,
            paid: !!r.paid, paid_date: r.paid_date || '',
          });
        });
        contracts = contracts.map(function (c) {
          return Object.assign({}, c, { installments: by[String(c.id)] || c.installments || [] });
        });
      }
      if (window.DEMO_DATA) {
        DEMO_DATA.offers = offers;
        DEMO_DATA.contracts = contracts;
        DEMO_DATA.online_orders = online;
        const disc = (discRows[0] && discRows[0].value) || { invoice_pct: 0, items: [] };
        const liveIds = {};
        (DEMO_DATA.items || []).forEach(function (i) { liveIds[String(i.id)] = true; });
        DEMO_DATA.discount_settings = {
          invoice_pct: Number(disc.invoice_pct) || 0,
          items: (disc.items || []).filter(function (r) { return liveIds[String(r.item_id)]; }),
        };
      }
      return { pulled: true, offers: offers.length, contracts: contracts.length, online: online.length };
    }).catch(function (e) {
      return { skipped: true, error: String(e && e.message || e) };
    });
  }

  /* ── حراسة السحب الموحّد: إعادة تطبيق المعلَّقات فوق النتيجة ── */
  function applyOffersBox(b) {
    if (!window.DEMO_DATA || !window.AlfaOutbox) return;
    DEMO_DATA.offers = AlfaOutbox.mergeLists(DEMO_DATA.offers, b);
  }
  function applyContractsBox(b) {
    if (!window.DEMO_DATA || !window.AlfaOutbox) return;
    DEMO_DATA.contracts = AlfaOutbox.mergeLists(DEMO_DATA.contracts, b);
  }
  function applyOnlineBox(b) {
    if (!window.DEMO_DATA || !window.AlfaOutbox) return;
    DEMO_DATA.online_orders = AlfaOutbox.mergeLists(DEMO_DATA.online_orders, b);
  }
  function applySettingsBox(b) {
    if (!window.DEMO_DATA) return;
    const rows = (b && b.rows) || {};
    if (rows['discount']) DEMO_DATA.discount_settings = rows['discount'].value;
    if (rows['price']) DEMO_DATA.price_settings = rows['price'].value;
    if (rows['loyalty']) DEMO_DATA.loyalty = rows['loyalty'].value;
  }
  function persistAll() { try { if (window.alfaPersist) window.alfaPersist(); } catch (e) {} }
  function pullGuarded() {
    if (!window.AlfaOutbox) return pull();
    const g = window.AlfaOutbox.guarded;
    const p1 = g('offers', pull, function (b) { applyOffersBox(b); persistAll(); });
    const p2 = g('contracts', p1, function (b) { applyContractsBox(b); persistAll(); });
    const p3 = g('online_orders', p2, function (b) { applyOnlineBox(b); persistAll(); });
    const p4 = g('settings', p3, function (b) { applySettingsBox(b); persistAll(); });
    return p4();
  }

  return { pull: pullGuarded };
})();

window.SessionSync = (function () {
  const sb = window.AlfaSB;
  let pushTimer = null;

  function applyUi(ui) {
    if (!ui || typeof ui !== 'object') return;
    try {
      if (ui.require_shift != null) localStorage.setItem('alfaprosys_require_shift', ui.require_shift ? '1' : '0');
      if (ui.tables && window.DEMO_DATA && Array.isArray(ui.tables) && ui.tables.length) DEMO_DATA.tables = ui.tables;
    } catch (e) {}
  }

  function mapShift(r) {
    const pay = r.by_payment || {};
    return {
      id: String(r.id),
      date: r.date || '',
      cashier: r.cashier || 'الكاشير',
      opened_at: r.opened_at || '',
      closed_at: r.closed_at || '',
      opening_cash: Number(r.opening_cash) || 0,
      sales_total: Number(r.sales_total) || 0,
      invoices_count: Number(r.invoices_count) || 0,
      cancelled_count: Number(r.cancelled_count) || 0,
      by_payment: pay,
      expenditures: Number(r.expenditures) || 0,
      closing_cash: r.closing_cash == null ? 0 : Number(r.closing_cash),
      difference: pay._diff != null ? Number(pay._diff) : 0,
      notes: r.notes || '',
    };
  }

  function pull() {
    if (!sb.enabled() || navigator.onLine === false) return Promise.resolve({ skipped: true });
    return Promise.all([
      sb.get('settings', '?select=key,value&key=in.(cashier_session,ui)').catch(function () { return []; }),
      sb.get('shifts', '?select=*&order=date.desc').catch(function () { return []; }),
    ]).then(function (pack) {
      const rows = pack[0] || [];
      const shifts = pack[1] || [];
      rows.forEach(function (r) {
        if (r.key === 'cashier_session' && r.value && typeof r.value === 'object' && window.DEMO_DATA) {
          DEMO_DATA.cashierSession = Object.assign({}, DEMO_DATA.cashierSession || {}, r.value);
        }
        if (r.key === 'ui') applyUi(r.value);
      });
      if (window.DEMO_DATA) DEMO_DATA.shifts_history = (shifts || []).map(mapShift);
      return { pulled: true, shifts: shifts.length };
    }).catch(function (e) {
      return { skipped: true, error: String(e && e.message || e) };
    });
  }

  function push() {
    if (!sb.enabled() || navigator.onLine === false) return Promise.resolve({ skipped: true });
    const session = (window.DEMO_DATA && DEMO_DATA.cashierSession) || {};
    return sb.upsert('settings', [{ key: 'cashier_session', value: session }], 'key')
      .then(function () { return { pushed: true }; });
  }

  function pushSoon() {
    if (!sb.enabled()) return;
    if (!window.AlfaOutbox) {
      clearTimeout(pushTimer);
      pushTimer = setTimeout(function () {
        push().catch(function () {});
      }, 400);
      return;
    }
    AlfaOutbox.commitOne('cashier_session', { key: 'cashier_session', value: (window.DEMO_DATA && DEMO_DATA.cashierSession) || {} });
  }

  function pushCloseRaw(row) {
    const pay = Object.assign({}, row.by_payment || {});
    if (row.difference != null) pay._diff = row.difference;
    const rec = {
      id: String(row.id || ('sh_' + Date.now())),
      date: row.date || '',
      cashier: row.cashier || 'الكاشير',
      opened_at: row.opened_at || null,
      closed_at: row.closed_at || null,
      opening_cash: Number(row.opening_cash) || 0,
      sales_total: Number(row.sales_total) || 0,
      invoices_count: Number(row.invoices_count) || 0,
      cancelled_count: Number(row.cancelled_count) || 0,
      by_payment: pay,
      expenditures: Number(row.expenditures) || 0,
      closing_cash: Number(row.closing_cash) || 0,
      notes: row.notes || '',
      closed_by: row.cashier || null,
    };
    return sb.upsert('shifts', [rec], 'id');
  }
  function pushClose(row) {
    if (!sb.enabled() || !row) return Promise.resolve({ skipped: true });
    if (window.AlfaOutbox) return AlfaOutbox.commitOne('shifts', row);
    return pushCloseRaw(row)
      .then(function () { return push(); })
      .catch(function (e) {
        try { if (window.showToast) showToast('تعذر رفع الوردية: ' + (e && e.message || e), '⚠️'); } catch (err) {}
        return { skipped: true, error: String(e && e.message || e) };
      });
  }

  /* ── صندوقا الجلسة والورديات ── */
  function pushSessionRows(rows) {
    if (!sb.enabled() || navigator.onLine === false) return Promise.reject(new Error('offline'));
    const list = (rows || []).map(function (r) { return { key: r.key || 'cashier_session', value: r.value || {} }; });
    if (!list.length) return Promise.resolve({ pushed: true, n: 0 });
    return sb.upsert('settings', list, 'key').then(function () { return { pushed: true, n: list.length }; });
  }
  function pushShiftRows(rows) {
    if (!sb.enabled() || navigator.onLine === false) return Promise.reject(new Error('offline'));
    return (rows || []).reduce(function (p, r) { return p.then(function () { return pushCloseRaw(r); }); }, Promise.resolve())
      .then(function () { return { pushed: true, n: (rows || []).length }; });
  }
  function delShiftRows(ids) {
    if (!sb.enabled() || navigator.onLine === false) return Promise.reject(new Error('offline'));
    return sb.del('shifts', ids || []);
  }
  function applySessionBox(b) {
    if (!window.DEMO_DATA) return;
    const r = b.rows && b.rows['cashier_session'];
    if (r) {
      DEMO_DATA.cashierSession = Object.assign({}, DEMO_DATA.cashierSession || {}, (r.value || r));
      try { if (window.alfaPersist) window.alfaPersist(); } catch (e) {}
    }
  }
  function applyShiftsBox(b) {
    if (!window.DEMO_DATA || !window.AlfaOutbox) return;
    DEMO_DATA.shifts_history = AlfaOutbox.mergeLists(DEMO_DATA.shifts_history, b);
    try { if (window.alfaPersist) window.alfaPersist(); } catch (e) {}
  }
  if (window.AlfaOutbox) {
    AlfaOutbox.register('cashier_session', { pushRows: pushSessionRows, delRows: function () { return Promise.resolve(); } });
    AlfaOutbox.register('shifts', { pushRows: pushShiftRows, delRows: delShiftRows });
  }
  function pullGuarded() {
    if (!window.AlfaOutbox) return pull();
    return AlfaOutbox.guarded('shifts', AlfaOutbox.guarded('cashier_session', pull, applySessionBox), applyShiftsBox)();
  }

  return { pull: pullGuarded, push: push, pushSoon: pushSoon, pushClose: pushClose };
})();

window.OnlineOrderSync = (function () {
  const sb = window.AlfaSB;
  let pushTimer = null;

  function row(o) {
    return {
      id: String(o.id),
      created_at: o.created_at || null,
      customer: o.customer || null,
      items: o.items || [],
      subtotal: Number(o.subtotal) || 0,
      delivery_fee: Number(o.delivery_fee) || 0,
      discount: Number(o.discount) || 0,
      total: Number(o.total) || 0,
      payment: o.payment || 'cash',
      status: o.status || 'new',
      source: o.source || 'online',
      invoice_id: o.invoice_id || null,
      no: o.no == null ? null : o.no,
      date: o.date || null,
    };
  }

  function pull() {
    if (!sb.enabled() || navigator.onLine === false) return Promise.resolve({ skipped: true });
    return sb.get('online_orders', '?select=*&order=created_at.desc').then(function (remote) {
      if (window.DEMO_DATA) DEMO_DATA.online_orders = remote || [];
      return { pulled: true, n: (remote || []).length };
    }).catch(function (e) {
      return { skipped: true, error: String(e && e.message || e) };
    });
  }

  function pushOne(o) {
    if (!sb.enabled() || !o || !o.id) return Promise.resolve({ skipped: true });
    return sb.upsert('online_orders', [row(o)], 'id');
  }

  function pushAll() {
    if (!sb.enabled() || navigator.onLine === false) return Promise.resolve({ skipped: true });
    const list = ((window.DEMO_DATA && DEMO_DATA.online_orders) || []).map(row);
    if (!list.length) return Promise.resolve({ skipped: true, reason: 'empty' });
    return sb.upsert('online_orders', list, 'id').then(function () { return { pushed: true, n: list.length }; });
  }

  function pushSoonLegacy(o) {
    if (o) {
      pushOne(o).catch(function (e) {
        try { if (window.showToast) showToast('تعذر رفع الطلب الأونلاين: ' + (e && e.message || e), '⚠️'); } catch (err) {}
      });
      return;
    }
    clearTimeout(pushTimer);
    pushTimer = setTimeout(function () { pushAll().catch(function () {}); }, 500);
  }
  function pushSoon(o) {
    if (!sb.enabled()) return;
    if (!window.AlfaOutbox) { pushSoonLegacy(o); return; }
    if (o) AlfaOutbox.commitOne('online_orders', o);
    else AlfaOutbox.commitRows('online_orders', (window.DEMO_DATA && DEMO_DATA.online_orders) || []);
  }

  /* ── صندوق صادر الطلبات الأونلاين ── */
  function pushRows(rows) {
    if (!sb.enabled() || navigator.onLine === false) return Promise.reject(new Error('offline'));
    const list = (rows || []).map(row);
    if (!list.length) return Promise.resolve({ pushed: true, n: 0 });
    return sb.upsert('online_orders', list, 'id').then(function () { return { pushed: true, n: list.length }; });
  }
  function delRows(ids) {
    if (!sb.enabled() || navigator.onLine === false) return Promise.reject(new Error('offline'));
    return sb.del('online_orders', ids || []);
  }
  function applyBox(b) {
    if (!window.DEMO_DATA || !window.AlfaOutbox) return;
    DEMO_DATA.online_orders = AlfaOutbox.mergeLists(DEMO_DATA.online_orders, b);
    try { if (window.alfaPersist) window.alfaPersist(); } catch (e) {}
  }
  if (window.AlfaOutbox) AlfaOutbox.register('online_orders', { pushRows: pushRows, delRows: delRows });
  function pullGuarded() {
    if (!window.AlfaOutbox) return pull();
    return AlfaOutbox.guarded('online_orders', pull, applyBox)();
  }

  return { pull: pullGuarded, pushOne: pushOne, pushAll: pushAll, pushSoon: pushSoon,
    remove: function (id) {
      if (!sb.enabled() || !id) return Promise.resolve({ skipped: true });
      if (window.AlfaOutbox) return AlfaOutbox.commitDelete('online_orders', id);
      return sb.del('online_orders', [id]).catch(function () {});
    } };
})();

window.AgentSync = (function () {
  const sb = window.AlfaSB;
  let pushTimer = null;

  function row(a) {
    return {
      id: String(a.id),
      name: a.name || '',
      type: a.type || 'employee',
      phone: a.phone || null,
      fee_per_trip: Number(a.fee_per_trip) || 0,
      notes: a.notes || null,
      is_active: a.is_active !== false,
    };
  }

  function pull() {
    if (!sb.enabled() || navigator.onLine === false) return Promise.resolve({ skipped: true });
    return sb.get('delivery_agents', '?select=*&order=name.asc').then(function (remote) {
      if (window.DEMO_DATA) DEMO_DATA.delivery_agents = remote || [];
      if ((remote || []).length) return { pulled: true, n: remote.length };
      return sb.get('settings', '?select=key,value&key=eq.delivery_agents').then(function (rows) {
        const val = rows && rows[0] && rows[0].value;
        if (Array.isArray(val) && val.length && window.DEMO_DATA) DEMO_DATA.delivery_agents = val;
        return { pulled: true, n: Array.isArray(val) ? val.length : 0 };
      });
    }).catch(function (e) {
      return { skipped: true, error: String(e && e.message || e) };
    });
  }

  function push() {
    if (!sb.enabled() || navigator.onLine === false) return Promise.resolve({ skipped: true });
    const list = ((window.DEMO_DATA && DEMO_DATA.delivery_agents) || []).map(row);
    return sb.get('delivery_agents', '?select=id').then(function (remote) {
      const keep = {};
      list.forEach(function (a) { keep[a.id] = true; });
      const extra = (remote || []).map(function (r) { return r.id; }).filter(function (id) { return !keep[String(id)]; });
      return sb.upsert('delivery_agents', list, 'id')
        .then(function () { return extra.length ? sb.del('delivery_agents', extra) : null; })
        .then(function () { return { pushed: true, n: list.length }; });
    });
  }

  function pushSoon() {
    if (!sb.enabled()) return;
    if (!window.AlfaOutbox) {
      clearTimeout(pushTimer);
      pushTimer = setTimeout(function () { push().catch(function () {}); }, 500);
      return;
    }
    AlfaOutbox.commitRows('agents', (window.DEMO_DATA && DEMO_DATA.delivery_agents) || []);
  }

  /* ── صندوق صادر المندوبين ── */
  function pushRows(rows) {
    if (!sb.enabled() || navigator.onLine === false) return Promise.reject(new Error('offline'));
    const list = (rows || []).map(row);
    if (!list.length) return Promise.resolve({ pushed: true, n: 0 });
    return sb.upsert('delivery_agents', list, 'id').then(function () { return { pushed: true, n: list.length }; });
  }
  function delRows(ids) {
    if (!sb.enabled() || navigator.onLine === false) return Promise.reject(new Error('offline'));
    return sb.del('delivery_agents', ids || []);
  }
  function applyBox(b) {
    if (!window.DEMO_DATA || !window.AlfaOutbox) return;
    DEMO_DATA.delivery_agents = AlfaOutbox.mergeLists(DEMO_DATA.delivery_agents, b);
    try { if (window.alfaPersist) window.alfaPersist(); } catch (e) {}
  }
  if (window.AlfaOutbox) AlfaOutbox.register('agents', { pushRows: pushRows, delRows: delRows });
  function pullGuarded() {
    if (!window.AlfaOutbox) return pull();
    return AlfaOutbox.guarded('agents', pull, applyBox)();
  }

  return { pull: pullGuarded, push: push, pushSoon: pushSoon,
    remove: function (id) {
      if (!sb.enabled() || !id) return Promise.resolve({ skipped: true });
      if (window.AlfaOutbox) return AlfaOutbox.commitDelete('agents', id);
      return sb.del('delivery_agents', [id]).catch(function () {});
    } };
})();

window.AlfaLive = {
  start: function (ms, after) {
    if (!window.InvoiceSync || !InvoiceSync.pull) return;
    var n = Number(ms) || 10000;
    setInterval(function () {
      if (navigator.onLine === false) return;
      InvoiceSync.pull().then(function () { if (typeof after === 'function') after(); }).catch(function () {});
    }, n);
  },
};
