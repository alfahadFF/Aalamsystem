/* ================================================================
   db.js — طبقة بيانات موحّدة (تجربة محلية الآن، Supabase لاحقاً)
   الشاشات تبقى على DEMO_DATA. هذا الملف هو نقطة الربط الوحيدة.
   عند الربط: املأ ALFA_CONFIG.supabase ثم mode:'prod' و syncEnabled:true
   ================================================================ */
window.AlfaDB = {
  /* مفاتيح DEMO_DATA التي ستصبح جداول/مجموعات */
  collections: [
    'categories', 'items', 'customers', 'invoices',
    'inventory', 'suppliers', 'employees', 'contracts',
    'online_orders', 'offers', 'discount_settings', 'price_settings',
    'cashierSession', 'shifts_history', 'expenditures', 'material_purchases',
    'audit_log', 'loyalty', 'loyalty_ledger', 'delivery_agents',
    'tables',
  ],

  mode: function () {
    return (window.ALFA_CONFIG && ALFA_CONFIG.mode) || 'trial';
  },
  syncEnabled: function () {
    return !!(window.ALFA_CONFIG && ALFA_CONFIG.syncEnabled);
  },
  configured: function () {
    const s = (window.ALFA_CONFIG && ALFA_CONFIG.supabase) || {};
    return !!(s.url && s.anonKey);
  },
  provider: function () {
    if (this.mode() === 'trial' || !this.configured()) return 'local';
    return 'supabase';
  },
  isOnline: function () {
    return navigator.onLine !== false;
  },
  snapshot: function () {
    return window.DEMO_DATA || {};
  },
  pending: function () {
    return window.SyncQueue ? SyncQueue.count() : 0;
  },

  /* فحص وصول (لا يُستدعى تلقائياً في التجربة) */
  ping: async function () {
    if (!this.configured()) return { ok: false, reason: 'not-configured' };
    if (!this.isOnline()) return { ok: false, reason: 'offline' };
    try {
      const s = ALFA_CONFIG.supabase;
      const res = await fetch(s.url + '/rest/v1/', {
        headers: { apikey: s.anonKey, Authorization: 'Bearer ' + s.anonKey },
      });
      return { ok: res.ok, status: res.status };
    } catch (e) {
      return { ok: false, reason: String(e && e.message || e) };
    }
  },

  flush: async function () {
    if (window.SyncRemote) return SyncRemote.flush();
    return { sent: 0, skipped: true, reason: 'no-remote' };
  },

  /* كتابة صف واحد — الطابور يسجّل entity+id لا استبدال الجدول كامل */
  upsert: function (table, row) {
    const d = window.DEMO_DATA;
    if (!d || !table || !row) return;
    if (Array.isArray(d[table])) {
      let found = false;
      const next = d[table].map(function (r) {
        if (r && r.id === row.id) { found = true; return row; }
        return r;
      });
      d[table] = found ? next : next.concat([row]);
    } else {
      d[table] = row;
    }
    if (window.SyncQueue) {
      SyncQueue.push({ table: table, op: 'upsert', row_id: row.id || table, row: row, at: Date.now() });
    }
  },
  remove: function (table, id) {
    const d = window.DEMO_DATA;
    if (!d || !table || id == null) return;
    if (Array.isArray(d[table])) d[table] = d[table].filter(function (r) { return r.id !== id; });
    if (window.SyncQueue) {
      SyncQueue.push({ table: table, op: 'delete', row_id: id, at: Date.now() });
    }
  },
};
