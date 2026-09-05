/* ================================================================
   stock.js — خصم/عكس المخزون حسب الوصفة (مشترك بين الشاشات)
   يُحمَّل بعد data.js. لا يعتمد على inventory.js.
   ================================================================ */
(function () {
  function today() {
    return window.businessDay ? businessDay() : new Date().toISOString().slice(0, 10);
  }
  function logId() {
    return 'il_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
  }
  function data() {
    return window.DEMO_DATA || {};
  }
  function lineId(line) {
    if (!line || line.offer_disc) return null;
    if (line.id && String(line.id).indexOf('offerdisc_') !== 0) return line.id;
    const items = data().items || [];
    const found = items.find(function (i) { return i.name === line.name; });
    return found ? found.id : null;
  }
  function neededMap(cartItems) {
    const inv = data().inventory || [];
    const trackable = inv.filter(function (x) {
      return x.trackable && Array.isArray(x.recipe) && x.recipe.length;
    });
    const needed = {};
    (cartItems || []).forEach(function (line) {
      if (line.offer_disc || !line.qty) return;
      const lid = lineId(line);
      if (!lid) return;
      trackable.forEach(function (invItem) {
        invItem.recipe.forEach(function (rec) {
          if (rec.item_id === lid) {
            needed[invItem.id] = (needed[invItem.id] || 0) + rec.qty * line.qty;
          }
        });
      });
    });
    return needed;
  }
  function apply(cartItems, direction) {
    /* direction: -1 خصم مبيعات، +1 عكس/إلغاء */
    if (!cartItems || !cartItems.length) return;
    const D = data();
    const inv = D.inventory || [];
    const needed = neededMap(cartItems);
    const keys = Object.keys(needed);
    if (!keys.length) return;
    const day = today();
    const sign = direction < 0 ? -1 : 1;
    const type = sign < 0 ? 'out' : 'in';
    const note = sign < 0 ? 'مبيعات POS — تلقائي' : 'عكس مبيعات — تلقائي';

    keys.forEach(function (invId) {
      const idx = inv.findIndex(function (x) { return x.id === invId; });
      if (idx < 0) return;
      const totalQty = needed[invId];
      if (sign < 0) inv[idx].qty = Math.max(0, (inv[idx].qty || 0) - totalQty);
      else inv[idx].qty = (inv[idx].qty || 0) + totalQty;
      inv[idx].log = inv[idx].log || [];
      inv[idx].log.unshift({
        id: logId(), date: day, type: type, qty: totalQty,
        note: note, auto: true,
      });
      if (sign < 0 && inv[idx].qty <= (inv[idx].min_qty || 0) && window.showToast) {
        setTimeout(function () {
          showToast('⚠️ ' + inv[idx].name + ': المخزون وصل للحد الأدنى (' + inv[idx].qty + ' ' + inv[idx].unit + ')', '📦');
        }, 500);
      }
    });
    D.inventory = inv;
    if (window.alfaPersist) window.alfaPersist();
    if (window.InventorySync) InventorySync.pushSoon();
  }

  window.Stock = {
    deduct: function (lines) { apply(lines, -1); },
    restore: function (lines) { apply(lines, +1); },
    delta: function (line, qtySigned) {
      if (!line || !qtySigned) return;
      const row = { id: lineId(line) || line.id, name: line.name, qty: Math.abs(qtySigned) };
      if (qtySigned > 0) apply([row], -1);
      else apply([row], +1);
    },
  };
  window.deductStockForSale = function (lines) { window.Stock.deduct(lines); };
  window.restoreStockForSale = function (lines) { window.Stock.restore(lines); };
})();
