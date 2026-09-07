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
  /* ──────────────────────────────────────────────────────────────
     المعادلات الذاتية الشفاء — config.js → thermal? لا: ALFA_CONFIG.stock
     تربط وصفات المواد (سيخ الشاورما / شراك / سياحي) بأصناف السندويشات
     حسب الاسم والصنف، فتعمل مهما تغيّرت معرّفات الأصناف، وتُصحّح أي
     معادلة قديمة أو فارغة عند كل إقلاع وعند كل خصم.
     ────────────────────────────────────────────────────────────── */
  function stockCfg() { return (window.ALFA_CONFIG && window.ALFA_CONFIG.stock) || {}; }

  /* أحجام السندويشات (غرام) + قواعد الأصناف من config.js */
  function sizes() {
    return Object.assign({ "خرطوشة": 50, "صغير": 60, "وسط": 80, "كبير": 110 }, stockCfg().sizes || {});
  }
  /* عدد السندويشات من اسم التشكيلة: «صحن - 3سندويشات» ⇒ 3 ، «سندويشتين» ⇒ 2 */
  function variantCount(v) {
    const m = String(v || "").match(/(\d+)/);
    if (m) return +m[1];
    if (String(v || "").indexOf("سندويشتين") >= 0 || String(v || "").indexOf("اثنتين") >= 0) return 2;
    return 1;
  }
  /* قائمة الاستهلاك: لكل صنف شاورما مطابق ⇒ { id, label, sandwiches, grams, bread } */
  function consumptionRules() {
    const cfg = stockCfg();
    const sz = sizes();
    const cat = cfg.category || "الشاورما";
    const rules = [];
    (cfg.rules || []).forEach(function (r) {
      (data().items || []).forEach(function (it) {
        if (!it || (it.category_name || "").indexOf(cat) < 0) return;
        if ((it.variant || "").indexOf(r.variant) < 0) return;
        const n = r.sandwiches === "fromVariant" ? variantCount(it.variant) : (Number(r.sandwiches) || 1);
        rules.push({
          id: it.id, label: it.variant || it.name, sandwiches: n,
          grams: n * (sz[r.size] || sz["وسط"] || 80),
          bread: r.bread || "عادي",
        });
      });
    });
    return rules;
  }

  function ensureRecipes() {
    const cfg = stockCfg();
    const inv = data().inventory || [];
    const rules = consumptionRules();
    if (!inv.length || !rules.length) return false;
    const normal = rules.filter(function (r) { return r.bread !== "سمون"; });
    const samoun = rules.filter(function (r) { return r.bread === "سمون"; });
    let changed = false;
    function setRec(m, rec) {
      if (JSON.stringify(rec) !== JSON.stringify(m.recipe || [])) { m.recipe = rec; changed = true; }
      m.trackable = true;
    }
    inv.forEach(function (m) {
      if (!m || !m.name) return;
      /* 1) السيخ: غرامات كل صنف */
      if (cfg.skewerMaterial && m.name.indexOf(cfg.skewerMaterial) >= 0) {
        const per = (m.unit || "").indexOf("غ") === 0 ? 1 : 0.001;
        setRec(m, rules.map(function (r) { return { item_id: r.id, qty: +(r.grams * per).toFixed(4) }; }));
        return;
      }
      /* 2) خبز السندويشات العادية: شراك / سياحي */
      const b = (cfg.breads || []).filter(function (x) { return m.name.indexOf(x.name) >= 0; })[0];
      if (b) {
        const isBundle = (m.unit || "").indexOf("ربطة") >= 0;
        const bundle = isBundle ? (b.bundle || m.loaves_per_bundle || 10) : 1;
        if (isBundle) m.loaves_per_bundle = bundle;
        setRec(m, normal.map(function (r) { return { item_id: r.id, qty: +((b.loaves || 1) * r.sandwiches / bundle).toFixed(4) }; }));
        return;
      }
      /* 3) خبز السمون: رغيف سمون فقط لأصناف السمون */
      const sm = cfg.samounBread;
      if (sm && m.name.indexOf(sm.name) >= 0) {
        const isBundle = (m.unit || "").indexOf("ربطة") >= 0;
        const bundle = isBundle ? (sm.bundle || m.loaves_per_bundle || 10) : 1;
        if (isBundle) m.loaves_per_bundle = bundle;
        setRec(m, samoun.map(function (r) { return { item_id: r.id, qty: +((sm.loaves || 1) * r.sandwiches / bundle).toFixed(4) }; }));
        return;
      }
      /* 4) خبز البرغر: رغيف عن كل صنف يحوي اسمه «برغر» */
      const bg = cfg.burgerBread;
      if (bg && m.name.indexOf(bg.name) >= 0) {
        const isBundle = (m.unit || "").indexOf("ربطة") >= 0;
        const bundle = isBundle ? (bg.bundle || m.loaves_per_bundle || 6) : 1;
        if (isBundle) m.loaves_per_bundle = bundle;
        const match = (data().items || []).filter(function (it) { return it && (it.name || "").indexOf(bg.matchName || "برغر") >= 0; });
        setRec(m, match.map(function (it) { return { item_id: it.id, qty: +((bg.loaves || 1) / bundle).toFixed(4) }; }));
        return;
      }
      /* 5) الدبابيس: وجبة البروستد دبوس = 5 دبابيس */
      const dk = cfg.drumsticks;
      if (dk && m.name.indexOf(dk.material) >= 0) {
        const match = (data().items || []).filter(function (it) {
          return it && (it.category_name || "").indexOf(dk.category || "البروستد") >= 0
                     && (it.variant || "").indexOf(dk.matchVariant || "دبوس") >= 0;
        });
        setRec(m, match.map(function (it) { return { item_id: it.id, qty: dk.qty || 5 }; }));
      }
    });
    if (changed && window.InventorySync && InventorySync.pushSoon) InventorySync.pushSoon();
    return changed;
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
    ensureRecipes();
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
    ensureRecipes,
    sandwichMap: consumptionRules,
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

  /* بعد اكتمال تحميل البيانات والمزامنة: صحّح المعادلات فوراً */
  (window.alfaStart || function (fn) { fn(); })(function () { ensureRecipes(); });
  window.restoreStockForSale = function (lines) { window.Stock.restore(lines); };
})();
