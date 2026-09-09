/* ============================================================
   sync/storage.js — تخزين التشغيل في IndexedDB (أوفلاين حقيقي)
   الإعدادات الصغيرة (ثيم، مسودة، هوية) تبقى في localStorage.
   يهاجر تلقائياً من المفتاح القديم alfaprosys_data_v1.
   ============================================================ */
window.SyncStorage = (function () {
  const DB_NAME = 'AlfaProSysDB';
  const DB_VER = 1;
  const STORE = 'kv';
  const DATA_KEY = 'data';
  const QUEUE_KEY = 'queue';
  const LEGACY = 'alfaprosys_data_v1';
  const LEGACY_Q = 'alfaprosys_queue_v1';

  let dbp = null;

  function openDb() {
    if (dbp) return dbp;
    dbp = new Promise(function (resolve, reject) {
      if (!window.indexedDB) { reject(new Error('no-idb')); return; }
      const req = indexedDB.open(DB_NAME, DB_VER);
      req.onupgradeneeded = function () {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
    return dbp;
  }

  function idbGet(key) {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        const tx = db.transaction(STORE, 'readonly');
        const r = tx.objectStore(STORE).get(key);
        r.onsuccess = function () { resolve(r.result === undefined ? null : r.result); };
        r.onerror = function () { reject(r.error); };
      });
    });
  }

  function idbSet(key, val) {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(val, key);
        tx.oncomplete = function () { resolve(true); };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }

  function idbDel(key) {
    return openDb().then(function (db) {
      return new Promise(function (resolve) {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).delete(key);
        tx.oncomplete = function () { resolve(true); };
        tx.onerror = function () { resolve(false); };
      });
    });
  }

  function warnFail() {
    try { if (window.showToast) showToast('تعذر الحفظ المحلي — تحقق من مساحة الجهاز', '⚠️'); } catch (e) {}
  }

  return {
    engine: 'indexeddb',

    /* مفاتيح عامة (صناديق الصادرة المعلقة وغيرها) */
    getKey: function (key) { return idbGet(key).catch(function () { return null; }); },
    setKey: function (key, val) { return idbSet(key, val).catch(function () { return false; }); },
    delKey: function (key) { return idbDel(key).catch(function () { return false; }); },

    load: function () {
      return idbGet(DATA_KEY).then(function (data) {
        if (data) return data;
        try {
          const raw = localStorage.getItem(LEGACY);
          if (!raw) return null;
          const parsed = JSON.parse(raw);
          return idbSet(DATA_KEY, parsed).then(function () {
            try { localStorage.removeItem(LEGACY); } catch (e) {}
            return parsed;
          }).catch(function () { return parsed; });
        } catch (e) { return null; }
      }).catch(function () {
        try {
          const raw = localStorage.getItem(LEGACY);
          return raw ? JSON.parse(raw) : null;
        } catch (e) { return null; }
      });
    },

    save: function (data) {
      return idbSet(DATA_KEY, data).then(function () { return true; }).catch(function () {
        warnFail();
        return false;
      });
    },

    loadQueue: function () {
      return idbGet(QUEUE_KEY).then(function (q) {
        if (Array.isArray(q)) return q;
        try {
          const raw = localStorage.getItem(LEGACY_Q);
          const parsed = raw ? JSON.parse(raw) : [];
          if (parsed && parsed.length) {
            idbSet(QUEUE_KEY, parsed).catch(function () {});
            try { localStorage.removeItem(LEGACY_Q); } catch (e) {}
          }
          return parsed || [];
        } catch (e) { return []; }
      }).catch(function () { return []; });
    },

    saveQueue: function (q) {
      return idbSet(QUEUE_KEY, q || []).catch(function () { return false; });
    },

    clear: function () {
      return Promise.all([idbDel(DATA_KEY), idbDel(QUEUE_KEY)]).then(function () {
        try { localStorage.removeItem(LEGACY); localStorage.removeItem(LEGACY_Q); } catch (e) {}
      }).catch(function () {});
    },
  };
})();
