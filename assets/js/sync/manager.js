/* ============================================================
   sync/manager.js — مزامنة شاشات المدير مع Supabase
   الكاشير يبقى على InvoiceSync / CustomerSync / SessionSync
   ============================================================ */
(function () {
  const sb = window.AlfaSB;
  function on() {
    return !!(sb && sb.enabled && sb.enabled() && navigator.onLine !== false);
  }
  function D() { return window.DEMO_DATA || {}; }
  function day() {
    return window.businessDay ? businessDay() : new Date().toISOString().slice(0, 10);
  }
  function toast(msg) {
    try { if (window.showToast) showToast(String(msg).slice(0, 140), '⚠️'); } catch (e) {}
  }
  function timerSoon(holder, fn, ms) {
    if (!on()) return;
    clearTimeout(holder.t);
    holder.t = setTimeout(function () {
      fn().catch(function (e) { toast(e && e.message || e); });
    }, ms || 700);
  }
  function delExtra(table, localList) {
    return sb.get(table, '?select=id').then(function (remote) {
      const keep = {};
      (localList || []).forEach(function (r) { if (r && r.id != null) keep[String(r.id)] = true; });
      const extra = (remote || []).map(function (r) { return r.id; }).filter(function (id) { return !keep[String(id)]; });
      if (!extra.length) return;
      const num = extra.every(function (id) { return typeof id === 'number' || /^[0-9]+$/.test(String(id)); });
      const list = extra.map(function (id) {
        return num ? String(id) : '"' + String(id).replace(/"/g, '') + '"';
      }).join(',');
      return sb.delFilter(table, '?id=in.(' + list + ')');
    });
  }

  /* ---------- موظفون ---------- */
  window.EmployeeSync = (function () {
    const hold = {};
    function row(e) {
      return {
        id: String(e.id),
        name: e.name || '',
        age: e.age == null || e.age === '' ? null : Number(e.age),
        role: e.role || null,
        shift: e.shift || null,
        shift_start: e.shift_start || null,
        shift_end: e.shift_end || null,
        salary_type: e.salary_type || 'monthly',
        salary_amount: Number(e.salary_amount) || 0,
        hire_date: e.hire_date || null,
        phone: e.phone || null,
        notes: e.notes || null,
        salary_log: Array.isArray(e.salary_log) ? e.salary_log : [],
        deductions_log: Array.isArray(e.deductions_log) ? e.deductions_log : [],
      };
    }
    function pull() {
      if (!on()) return Promise.resolve({ skipped: true });
      return sb.get('employees', '?select=*&order=name.asc').then(function (remote) {
        D().employees = remote || [];
        return { pulled: true, n: (remote || []).length };
      }).catch(function (e) { return { skipped: true, error: String(e && e.message || e) }; });
    }
    function push() {
      if (!on()) return Promise.resolve({ skipped: true });
      const list = (D().employees || []).map(row);
      return sb.upsert('employees', list, 'id')
        .then(function () { return delExtra('employees', list); })
        .then(function () { return { pushed: true, n: list.length }; });
    }
    return {
      pull: pull, push: push,
      pushSoon: function () { timerSoon(hold, push); },
      remove: function (id) { return (!on() || !id) ? Promise.resolve() : sb.del('employees', [id]).catch(function () {}); },
    };
  })();

  /* ---------- موردون ---------- */
  window.SupplierSync = (function () {
    const hold = {};
    function row(s) {
      return {
        id: String(s.id),
        name: s.name || '',
        phone: s.phone || null,
        materials: s.materials || null,
        notes: s.notes || null,
      };
    }
    function pull() {
      if (!on()) return Promise.resolve({ skipped: true });
      return sb.get('suppliers', '?select=*&order=name.asc').then(function (remote) {
        D().suppliers = remote || [];
        return { pulled: true, n: (remote || []).length };
      }).catch(function (e) { return { skipped: true, error: String(e && e.message || e) }; });
    }
    function push() {
      if (!on()) return Promise.resolve({ skipped: true });
      const list = (D().suppliers || []).map(row);
      return sb.upsert('suppliers', list, 'id')
        .then(function () { return delExtra('suppliers', list); })
        .then(function () { return { pushed: true, n: list.length }; });
    }
    return {
      pull: pull, push: push,
      pushSoon: function () { timerSoon(hold, push); },
      remove: function (id) { return (!on() || !id) ? Promise.resolve() : sb.del('suppliers', [id]).catch(function () {}); },
    };
  })();

  /* ---------- مخزون: inventory_materials + inventory_log ---------- */
  window.InventorySync = (function () {
    const hold = {};
    function toMat(m) {
      return {
        id: String(m.id),
        name: m.name || '',
        category: m.category || null,
        unit: m.unit || 'قطعة',
        qty: Number(m.qty) || 0,
        min_qty: Number(m.min_qty) || 0,
        reorder_qty: m.reorder_qty == null || m.reorder_qty === '' ? null : Number(m.reorder_qty),
        cost_per_unit: Number(m.cost_per_unit) || 0,
        trackable: !!m.trackable,
        loaves_per_bundle: m.loaves_per_bundle == null || m.loaves_per_bundle === '' ? null : Number(m.loaves_per_bundle),
        recipe: Array.isArray(m.recipe) ? m.recipe : [],
        supplier_name: m.supplier_name || null,
      };
    }
    function toLog(mid, l) {
      return {
        id: String(l.id),
        material_id: String(mid),
        date: l.date || day(),
        type: l.type || 'in',
        qty: Number(l.qty) || 0,
        note: l.note || null,
        cost: l.cost == null || l.cost === '' ? null : Number(l.cost),
        auto: !!l.auto,
        supplier_name: l.supplier_name || null,
        by: l.by || null,
        time: l.time || null,
      };
    }
    function fromMat(m, logs) {
      return {
        id: String(m.id),
        name: m.name || '',
        category: m.category || '',
        unit: m.unit || 'قطعة',
        qty: Number(m.qty) || 0,
        min_qty: Number(m.min_qty) || 0,
        reorder_qty: m.reorder_qty == null ? 0 : Number(m.reorder_qty),
        cost_per_unit: Number(m.cost_per_unit) || 0,
        trackable: !!m.trackable,
        loaves_per_bundle: m.loaves_per_bundle,
        recipe: Array.isArray(m.recipe) ? m.recipe : [],
        supplier_name: m.supplier_name || '',
        log: (logs || []).map(function (l) {
          return {
            id: String(l.id),
            date: l.date,
            type: l.type,
            qty: Number(l.qty) || 0,
            note: l.note || '',
            cost: l.cost,
            auto: !!l.auto,
            supplier_name: l.supplier_name || '',
            by: l.by || '',
            time: l.time || '',
          };
        }),
      };
    }
    function pull() {
      if (!on()) return Promise.resolve({ skipped: true });
      return Promise.all([
        sb.get('inventory_materials', '?select=*'),
        sb.get('inventory_log', '?select=*'),
      ]).then(function (pair) {
        const mats = pair[0] || [];
        const logs = pair[1] || [];
        const by = {};
        logs.forEach(function (l) {
          const k = String(l.material_id);
          (by[k] || (by[k] = [])).push(l);
        });
        D().inventory = mats.map(function (m) { return fromMat(m, by[String(m.id)] || []); });
        return { pulled: true, n: mats.length };
      }).catch(function (e) { return { skipped: true, error: String(e && e.message || e) }; });
    }
    function pushOne(m) {
      if (!m || !m.id) return Promise.resolve();
      const logs = (m.log || []).map(function (l) { return toLog(m.id, l); });
      return sb.upsert('inventory_materials', [toMat(m)], 'id')
        .then(function () { return sb.delFilter('inventory_log', '?material_id=eq.' + encodeURIComponent(m.id)); })
        .then(function () { return sb.insert('inventory_log', logs); });
    }
    function push() {
      if (!on()) return Promise.resolve({ skipped: true });
      const list = D().inventory || [];
      return list.reduce(function (p, m) { return p.then(function () { return pushOne(m); }); }, Promise.resolve())
        .then(function () { return delExtra('inventory_materials', list); })
        .then(function () { return { pushed: true, n: list.length }; });
    }
    function remove(id) {
      if (!on() || !id) return Promise.resolve();
      return sb.delFilter('inventory_log', '?material_id=eq.' + encodeURIComponent(id))
        .then(function () { return sb.del('inventory_materials', [id]); })
        .catch(function () {});
    }
    return { pull: pull, push: push, pushOne: pushOne, pushSoon: function () { timerSoon(hold, push, 900); }, remove: remove };
  })();

  /* ---------- عقود (الرفع؛ السحب عبر PosSync) ---------- */
  window.ContractSync = (function () {
    const hold = {};
    function toCon(c) {
      return {
        id: String(c.id),
        client_name: c.client_name || '',
        company: c.company || null,
        customer_id: c.customer_id || null,
        contract_type: c.contract_type || 'monthly',
        start_date: c.start_date || null,
        end_date: c.end_date || null,
        status: c.status || 'active',
        delivery_time: c.delivery_time || null,
        payment_method: c.payment_method || 'cash',
        items: c.items || [],
        notes: c.notes || null,
        total_value: Number(c.total_value) || 0,
        has_delivery: !!c.has_delivery,
        daily_meals: c.daily_meals ? Number(c.daily_meals) : null,
        daily_cap: c.daily_cap ? Number(c.daily_cap) : null,
      };
    }
    function pushOne(c) {
      if (!c || !c.id) return Promise.resolve();
      const inst = (c.installments || []).filter(function (i) { return i && i.due_date; }).map(function (i) {
        return {
          id: String(i.id || ('ci_' + c.id + '_' + i.due_date)),
          contract_id: String(c.id),
          due_date: i.due_date,
          amount: Number(i.amount) || 0,
          paid: !!i.paid,
          paid_date: i.paid_date || null,
        };
      });
      return sb.upsert('contracts', [toCon(c)], 'id')
        .then(function () { return sb.delFilter('contract_installments', '?contract_id=eq.' + encodeURIComponent(c.id)); })
        .then(function () { return sb.insert('contract_installments', inst); });
    }
    function push() {
      if (!on()) return Promise.resolve({ skipped: true });
      const list = D().contracts || [];
      return list.reduce(function (p, c) { return p.then(function () { return pushOne(c); }); }, Promise.resolve())
        .then(function () { return delExtra('contracts', list); })
        .then(function () { return { pushed: true, n: list.length }; });
    }
    function remove(id) {
      if (!on() || !id) return Promise.resolve();
      return sb.delFilter('contract_installments', '?contract_id=eq.' + encodeURIComponent(id))
        .then(function () { return sb.del('contracts', [id]); })
        .catch(function () {});
    }
    return { push: push, pushOne: pushOne, pushSoon: function () { timerSoon(hold, push); }, remove: remove };
  })();

  /* ---------- مصاريف + مشتريات مواد ---------- */
  window.ExpenditureSync = (function () {
    const hold = {};
    function toExp(x) {
      return {
        id: Number(x.id) || Date.now(),
        date: x.date || day(),
        category: x.category || x.type || null,
        amount: Number(x.amount) || 0,
        note: x.note || null,
        employee: x.employee || null,
        type: x.type || null,
        icon: x.icon || null,
        title: x.title || null,
        time: x.time || null,
      };
    }
    function toPur(p) {
      return {
        id: Number(p.id) || Date.now(),
        date: p.date || day(),
        item: p.item || '',
        cat: p.cat || null,
        unit: p.unit || null,
        packages: Number(p.packages) || 1,
        weight: p.weight == null ? null : Number(p.weight),
        unit_cost: Number(p.unit_cost != null ? p.unit_cost : p.unitCost) || 0,
        total: Number(p.total) || 0,
        time: p.time || null,
        price_per_loaf: p.price_per_loaf != null ? Number(p.price_per_loaf) : null,
        price_per_piece: p.price_per_piece != null ? Number(p.price_per_piece) : null,
      };
    }
    function fromPur(r) {
      return {
        id: r.id,
        date: r.date,
        item: r.item,
        cat: r.cat,
        unit: r.unit,
        packages: Number(r.packages) || 1,
        weight: Number(r.weight) || 0,
        unitCost: Number(r.unit_cost) || 0,
        total: Number(r.total) || 0,
        time: r.time || '',
        price_per_loaf: r.price_per_loaf != null ? Number(r.price_per_loaf) : null,
        price_per_piece: r.price_per_piece != null ? Number(r.price_per_piece) : null,
      };
    }
    function pull() {
      if (!on()) return Promise.resolve({ skipped: true });
      return Promise.all([
        sb.get('expenditures', '?select=*&order=id.desc'),
        sb.get('material_purchases', '?select=*&order=id.desc'),
      ]).then(function (pair) {
        D().expenditures = pair[0] || [];
        D().expenditures_list = D().expenditures;
        D().material_purchases = (pair[1] || []).map(fromPur);
        return { pulled: true, exp: (pair[0] || []).length, pur: (pair[1] || []).length };
      }).catch(function (e) { return { skipped: true, error: String(e && e.message || e) }; });
    }
    function push() {
      if (!on()) return Promise.resolve({ skipped: true });
      const exps = (D().expenditures || []).map(toExp);
      const purs = (D().material_purchases || []).map(toPur);
      return sb.upsert('expenditures', exps, 'id')
        .then(function () { return delExtra('expenditures', exps); })
        .then(function () { return sb.upsert('material_purchases', purs, 'id'); })
        .then(function () { return delExtra('material_purchases', purs); })
        .then(function () { return { pushed: true, exp: exps.length, pur: purs.length }; });
    }
    return { pull: pull, push: push, pushSoon: function () { timerSoon(hold, push); } };
  })();

  /* ---------- سجل التدقيق ---------- */
  window.AuditSync = (function () {
    const hold = {};
    function row(l) {
      return {
        id: Number(l.id),
        at: l.at || null,
        module: l.module || null,
        action: l.action || '',
        detail: l.detail || null,
        who: l.who || null,
      };
    }
    function pull() {
      if (!on()) return Promise.resolve({ skipped: true });
      return sb.get('audit_log', '?select=*&order=id.desc').then(function (remote) {
        D().audit_log = remote || [];
        var max = 0;
        (remote || []).forEach(function (r) { if (Number(r.id) > max) max = Number(r.id); });
        window.__auditSeq = max + 1;
        return { pulled: true, n: (remote || []).length };
      }).catch(function (e) { return { skipped: true, error: String(e && e.message || e) }; });
    }
    function pushOne(l) {
      if (!on() || !l) return Promise.resolve();
      return sb.upsert('audit_log', [row(l)], 'id').catch(function () {});
    }
    function push() {
      if (!on()) return Promise.resolve({ skipped: true });
      const list = (D().audit_log || []).map(row);
      if (!list.length) return Promise.resolve({ skipped: true });
      return sb.upsert('audit_log', list, 'id').then(function () { return { pushed: true, n: list.length }; });
    }
    return { pull: pull, push: push, pushOne: pushOne, pushSoon: function () { timerSoon(hold, push, 400); } };
  })();

  /* ---------- إعدادات + عروض + ولاء ---------- */
  window.SettingsSync = (function () {
    const hold = {};
    function pull() {
      if (!on()) return Promise.resolve({ skipped: true });
      return Promise.all([
        sb.get('settings', '?select=key,value&key=in.(price,loyalty,discount)').catch(function () { return []; }),
        sb.get('loyalty_ledger', '?select=*&order=id.desc').catch(function () { return []; }),
      ]).then(function (pack) {
        (pack[0] || []).forEach(function (r) {
          if (r.key === 'price' && r.value) D().price_settings = r.value;
          if (r.key === 'loyalty' && r.value) D().loyalty = r.value;
          if (r.key === 'discount' && r.value) {
            D().discount_settings = {
              invoice_pct: Number(r.value.invoice_pct) || 0,
              items: r.value.items || [],
            };
          }
        });
        D().loyalty_ledger = pack[1] || [];
        var max = 0;
        (pack[1] || []).forEach(function (r) { if (Number(r.id) > max) max = Number(r.id); });
        window.__loySeq = max + 1;
        return { pulled: true };
      }).catch(function (e) { return { skipped: true, error: String(e && e.message || e) }; });
    }
    function pushOffers() {
      const offers = D().offers || [];
      const heads = offers.map(function (o) {
        return {
          id: String(o.id),
          title: o.title || '',
          price: Number(o.price) || 0,
          active: o.active !== false,
          expires_at: o.expires_at || null,
        };
      });
      return sb.upsert('offers', heads, 'id')
        .then(function () { return delExtra('offers', heads); })
        .then(function () {
          return offers.reduce(function (p, o) {
            return p.then(function () {
              return sb.delFilter('offer_items', '?offer_id=eq.' + encodeURIComponent(o.id));
            });
          }, Promise.resolve());
        })
        .then(function () {
          const lines = [];
          offers.forEach(function (o) {
            (o.items || []).forEach(function (it) {
              if (!it || !it.item_id) return;
              lines.push({
                offer_id: String(o.id),
                item_id: it.item_id,
                qty: Number(it.qty) || 1,
                free: !!it.free,
              });
            });
          });
          return sb.insert('offer_items', lines).catch(function () {});
        });
    }
    function push() {
      if (!on()) return Promise.resolve({ skipped: true });
      const rows = [
        { key: 'discount', value: D().discount_settings || { invoice_pct: 0, items: [] } },
        { key: 'price', value: D().price_settings || {} },
        { key: 'loyalty', value: D().loyalty || {} },
      ];
      return sb.upsert('settings', rows, 'key')
        .then(function () { return pushOffers(); })
        .then(function () { return { pushed: true }; });
    }
    return { pull: pull, push: push, pushSoon: function () { timerSoon(hold, push); } };
  })();

  window.LoyaltySync = (function () {
    function pushOne(l) {
      if (!on() || !l) return Promise.resolve();
      return sb.upsert('loyalty_ledger', [{
        id: Number(l.id),
        customer_id: l.customer_id || null,
        at: l.at || null,
        type: l.type || null,
        pts: Number(l.pts) || 0,
        note: l.note || null,
        by: l.by || null,
      }], 'id').catch(function () {});
    }
    return { pushOne: pushOne };
  })();

  /* ---------- طاولات: سحب الأسماء فقط ---------- */
  window.TableSync = (function () {
    function pull() {
      if (!on()) return Promise.resolve({ skipped: true });
      return sb.get('dining_tables', '?select=label,sort_order,is_active&is_active=eq.true&order=sort_order.asc').then(function (rows) {
        const seen = {};
        const labels = [];
        (rows || []).forEach(function (r) {
          if (r.label && !seen[r.label]) { seen[r.label] = 1; labels.push(r.label); }
        });
        if (labels.length) D().tables = labels;
        return { pulled: true, n: labels.length };
      }).catch(function (e) { return { skipped: true, error: String(e && e.message || e) }; });
    }
    return { pull: pull };
  })();

  /* ---------- سحب موحّد لشاشات المدير ---------- */
  window.ManagerSync = {
    pull: function () {
      if (!on()) return Promise.resolve({ skipped: true });
      const jobs = [];
      if (window.EmployeeSync) jobs.push(EmployeeSync.pull());
      if (window.SupplierSync) jobs.push(SupplierSync.pull());
      if (window.InventorySync) jobs.push(InventorySync.pull());
      if (window.ExpenditureSync) jobs.push(ExpenditureSync.pull());
      if (window.AuditSync) jobs.push(AuditSync.pull());
      if (window.SettingsSync) jobs.push(SettingsSync.pull());
      if (window.TableSync) jobs.push(TableSync.pull());
      return Promise.all(jobs).then(function () { return { pulled: true }; });
    },
    push: function () {
      if (!on()) return Promise.resolve({ skipped: true });
      const jobs = [];
      if (window.EmployeeSync) jobs.push(EmployeeSync.push());
      if (window.SupplierSync) jobs.push(SupplierSync.push());
      if (window.InventorySync) jobs.push(InventorySync.push());
      if (window.ContractSync) jobs.push(ContractSync.push());
      if (window.ExpenditureSync) jobs.push(ExpenditureSync.push());
      if (window.AuditSync) jobs.push(AuditSync.push());
      if (window.SettingsSync) jobs.push(SettingsSync.push());
      return Promise.all(jobs).then(function () { return { pushed: true }; });
    },
  };
})();
