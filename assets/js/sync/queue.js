/* ============================================================
   sync/queue.js — طابور العمليات (ذاكرة + IndexedDB)
   الدفع للخادم عند تفعيل syncEnabled.
   ============================================================ */
window.SyncQueue = {
  MAX: 500,
  _list: [],

  hydrate: function (arr) {
    this._list = Array.isArray(arr) ? arr.slice(-this.MAX) : [];
  },

  list: function () { return this._list.slice(); },

  push: function (op) {
    this._list.push(op);
    this._list = this._list.slice(-this.MAX);
    if (window.SyncStorage && SyncStorage.saveQueue) {
      SyncStorage.saveQueue(this._list);
    }
  },

  count: function () { return this._list.length; },

  clear: function () {
    this._list = [];
    if (window.SyncStorage && SyncStorage.saveQueue) SyncStorage.saveQueue([]);
  },
};
