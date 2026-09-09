/* ================================================================
   sync/outbox.js — محرك الصندوق الصادر العام (ضمان عدم ضياع أي تعديل)
   ----------------------------------------------------------------
   القاعدة الذهبية: أي كتابة على أي وحدة تمر من هنا:
     1) تُقيَّد فوراً في صندوق دائم (IndexedDB) — متانة قبل الشبكة.
     2) تُدفع مباشرة لقاعدة البيانات (مع ارتداد 250ms لدمج الدفعات).
     3) أي فشل (انقطاع/إغلاق/خطأ) يُعاد تلقائياً: عند عودة الإنترنت،
        وعند كل إقلاع قبل السحب، عبر كل استدعاء سحب (push-before-pull).
   الرفع upsert + حذف صريح مسجَّل ⇒ آمن للتكرار ولا ازدواجية.
   ملاحظة: صندوق المنيو (MenuOutbox) بقي مستقلاً كما هو (مُختبَر).
   ================================================================ */
window.AlfaOutbox = (function () {
  const PREFIX = 'alfa_outbox_v1:';
  const PUSH_DEBOUNCE = 250;   /* دمج دفعات الكتابة السريعة — آمن لأن التقييد يسبق */
  const boxes = {};            /* name -> {rows:{id:row}, dels:[id], at} */
  const adapters = {};         /* name -> {pushRows(rows)->Promise, delRows(ids)->Promise} */
  const hydrated = {};
  const flushing = {};
  const pulling = {};            /* اسم => وعد السحب الجاري (المتزامنون يتشاركونه) */
  const timers = {};

  function cloudOn() { return !!(window.AlfaSB && AlfaSB.enabled && AlfaSB.enabled()); }
  function toast(msg, icon) { try { if (window.showToast) showToast(msg, icon); } catch (e) {} }
  function refreshBadge() { try { if (window.NetBadge) NetBadge.refresh(); } catch (e) {} }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function rowId(r) { return String(r.id != null ? r.id : (r.key != null ? r.key : '')); }
  function isEmpty(b) { return !b || (!Object.keys(b.rows || {}).length && !(b.dels || []).length); }

  function persist(name) {
    refreshBadge();
    if (!(window.SyncStorage && SyncStorage.setKey)) return Promise.resolve(false);
    const b = boxes[name];
    if (b && !isEmpty(b)) return SyncStorage.setKey(PREFIX + name, b);
    if (SyncStorage.delKey) return SyncStorage.delKey(PREFIX + name);
    return Promise.resolve(false);
  }

  function hydrate(name) {
    if (hydrated[name]) return Promise.resolve(boxes[name] || null);
    hydrated[name] = true;
    if (!(window.SyncStorage && SyncStorage.getKey)) return Promise.resolve(null);
    return SyncStorage.getKey(PREFIX + name).then(function (v) {
      if (v && !isEmpty(v)) boxes[name] = v;
      refreshBadge();
      return boxes[name] || null;
    }).catch(function () { return boxes[name] || null; });
  }

  function hydrateAll() {
    return Promise.all(Object.keys(adapters).map(hydrate)).then(function () { refreshBadge(); });
  }

  function boxOf(name) {
    if (!boxes[name]) boxes[name] = { rows: {}, dels: [], at: 0 };
    return boxes[name];
  }

  function hasPending(name) {
    if (!cloudOn()) return false;
    if (name) return !isEmpty(boxes[name]);
    return Object.keys(boxes).some(function (k) { return !isEmpty(boxes[k]); });
  }

  function pendingCount() {
    if (!cloudOn()) return 0;
    let n = 0;
    Object.keys(boxes).forEach(function (k) {
      const b = boxes[k]; if (!b) return;
      n += Object.keys(b.rows || {}).length + (b.dels || []).length;
    });
    return n;
  }

  function register(name, adapter) { adapters[name] = adapter; }

  /* التزام صفوف: تقييد دائم أولاً ثم دفع مرتد. لا يرفض أبداً. */
  function commitRows(name, rows) {
    rows = (rows || []).filter(Boolean);
    if (!rows.length) return Promise.resolve({ skipped: true });
    if (!cloudOn()) return Promise.resolve({ local: true });
    return hydrate(name).then(function () {
      const b = boxOf(name);
      rows.forEach(function (r) {
        const id = rowId(r);
        if (!id) return;
        b.dels = (b.dels || []).filter(function (x) { return String(x) !== id; });
        try { b.rows[id] = clone(r); } catch (e) { b.rows[id] = r; }
      });
      b.at = Date.now();
      persist(name);
      queuePush(name);
      return { committed: true, n: rows.length };
    }).catch(function () { return { failed: true }; });
  }

  function commitOne(name, row) { return commitRows(name, row ? [row] : []); }

  function commitDelete(name, id) {
    if (id == null || id === '') return Promise.resolve({ skipped: true });
    if (!cloudOn()) return Promise.resolve({ local: true });
    const sid = String(id);
    return hydrate(name).then(function () {
      const b = boxOf(name);
      delete b.rows[sid];
      b.dels = b.dels || [];
      if (b.dels.indexOf(sid) < 0) b.dels.push(sid);
      b.at = Date.now();
      persist(name);
      queuePush(name);
      return { deleted: true, id: sid };
    }).catch(function () { return { failed: true }; });
  }

  function queuePush(name) {
    clearTimeout(timers[name]);
    timers[name] = setTimeout(function () { flush(name); }, PUSH_DEBOUNCE);
  }

  /* تفريغ صندوق: الحذوفات أولاً ثم الصفوف. يُزيل فقط ما لم يتغير أثناء الرفع. */
  function flush(name) {
    if (flushing[name]) return flushing[name];
    const a = adapters[name];
    flushing[name] = hydrate(name).then(function () {
      const b = boxes[name];
      if (!a || !b || isEmpty(b)) return { skipped: true, reason: 'empty' };
      if (!cloudOn() || navigator.onLine === false) return { skipped: true, reason: 'offline' };
      const dels = (b.dels || []).slice();
      const ids = Object.keys(b.rows || {});
      const rows = ids.map(function (id) { return b.rows[id]; });
      return Promise.resolve()
        .then(function () { return dels.length ? a.delRows(dels) : null; })
        .then(function () { return rows.length ? a.pushRows(rows) : null; })
        .then(function () {
          const bb = boxes[name];
          if (bb) {
            bb.dels = (bb.dels || []).filter(function (x) { return dels.indexOf(x) < 0; });
            ids.forEach(function (id, i) { if (bb.rows[id] === rows[i]) delete bb.rows[id]; });
            persist(name);
          }
          const total = dels.length + rows.length;
          /* تنبيه فقط لاسترداد معلَّقات قديمة — الدفعات الفورية تبقى صامتة. */
          if (total && Date.now() - (b.at || 0) > 3000) toast('تم رفع ' + total + ' تعديل معلق (' + name + ') ✅', '☁️');
          return { flushed: true, rows: rows.length, dels: dels.length };
        });
    }).catch(function (e) {
      return { failed: true, error: String((e && e.message) || e) };
    }).then(function (r) {
      flushing[name] = null; refreshBadge();
      return r;
    });
    return flushing[name];
  }

  function flushAll() {
    return Promise.all(Object.keys(adapters).map(flush)).then(function (rs) { refreshBadge(); return rs; });
  }

  /* دمج عام: صفوف السحابة + صفوف الصندوق (الصندوق يفوز) − المحذوفات. */
  function mergeLists(cloudRows, box, idFn) {
    const getId = idFn || (function (r) { return String(r.id != null ? r.id : r.key); });
    const dels = {};
    ((box && box.dels) || []).forEach(function (id) { dels[String(id)] = true; });
    const out = [];
    const seen = {};
    (cloudRows || []).forEach(function (r) {
      const id = getId(r);
      if (dels[id] || seen[id]) return;
      seen[id] = true;
      out.push(r);
    });
    Object.keys((box && box.rows) || {}).forEach(function (id) {
      if (dels[id]) return;
      if (seen[id]) {
        for (let i = 0; i < out.length; i++) {
          if (getId(out[i]) === id) { out[i] = box.rows[id]; break; }
        }
      } else {
        seen[id] = true;
        out.push(box.rows[id]);
      }
    });
    return out;
  }

  /* تغليف السحب: تفريغ أولاً، ثم سحب، ثم إعادة تطبيق ما بقي معلقاً فوق
     النتيجة — فالسحب لا يمحو تعديلاً لم يصل بعد أبداً. */
  function guarded(name, pullFn, applyBox) {
    return function () {
      if (pulling[name]) return pulling[name];
      const clear = function () { pulling[name] = null; };
      pulling[name] = flush(name).then(function () {
        return pullFn();
      }).then(function (res) {
        const b = boxes[name];
        if (b && !isEmpty(b) && typeof applyBox === 'function') {
          try { applyBox(clone(b)); } catch (e) {}
        }
        clear();
        return res;
      }, function (err) { clear(); throw err; });
      return pulling[name];
    };
  }

  return {
    register: register,
    commitOne: commitOne, commitRows: commitRows, commitDelete: commitDelete,
    flush: flush, flushAll: flushAll,
    hasPending: hasPending, pendingCount: pendingCount,
    snapshot: function (name) { const b = boxes[name]; return b ? clone(b) : null; },
    hydrate: hydrate, hydrateAll: hydrateAll,
    mergeLists: mergeLists, guarded: guarded,
  };
})();

/* ربط تلقائي: تفريغ شامل عند عودة الإنترنت. */
try {
  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('online', function () { if (window.AlfaOutbox) AlfaOutbox.flushAll(); });
  }
} catch (e) {}
