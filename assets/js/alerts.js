/* ================================================================
   Alerts.js — لوحة تنبيهات الإدارة
   بطاقة بعدّاد ومستويات في لوحة التحكم + جدول تفصيلي عند النقر.
   الفلسفة: حدث يتطلب قراراً — لا إحصاء. تختفي التنبيهات
   بمعالجة فعلية (أو زر «تمّت المعالجة»)، وتعود تلقائياً إذا
   ساء الوضع (تصاعد الخطورة)، وترافق العاجلَ إشعارٌ هاتفي.
   ================================================================ */
window.Alerts = (function () {
  const LS_DISMISS = 'alfaprosys_alerts_dismissed_v1';
  const LS_NOTIFIED = 'alfaprosys_alerts_notified_v1';
  const DRAFT_KEY = 'alfaprosys_pos_draft';

  const LEVELS = {
    urgent: { icon: '🔴', cls: 'alert-urgent', label: 'عاجل' },
    warn:   { icon: '🟠', cls: 'alert-warn',   label: 'تحذير' },
    info:   { icon: '🟡', cls: 'alert-info',   label: 'متابعة' },
  };
  const ORDER = { urgent: 0, warn: 1, info: 2 };

  const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const get = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } };
  const set = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const minsSince = iso => { const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000); return isNaN(m) ? -1 : m; };
  const todayStr = () => (window.businessDay ? businessDay() : new Date().toISOString().slice(0,10));

  /* تكلفة الصنف (يدوي أو من وصفات المواد الخام) — نسخة خفيفة من منطق التكاليف */
  function itemCost(item, DATA) {
    if (item.cost_mode === 'manual' && Number(item.cost_manual) > 0) return Number(item.cost_manual);
    let c = 0;
    ((DATA || {}).inventory || []).forEach(inv => (inv.recipe || []).forEach(l => {
      if (l.item_id === item.id) c += (inv.cost_per_unit || 0) * (l.qty || 0);
    }));
    return c;
  }

  let active = [];
  let tableOpen = false;

  /* ── توليد التنبيهات من كل مصادر النظام ── */
  function scan() {
    const D = window.DEMO_DATA || {};
    const out = [];
    const now = new Date();

    /* 1) طلبات أونلاين بانتظار المعالجة */
    ((D.online_orders) || []).forEach(o => {
      if (o.status !== 'new') return;
      const m = minsSince(o.created_at);
      if (m < 0) return;
      const bucket = m >= 60 ? '60+' : m >= 30 ? '30' : '15';
      if (m >= 15) {
        out.push({
          key: 'onl:' + o.id, sig: bucket, level: 'urgent',
          title: `طلب أونلاين ${esc(o.id)} ينتظر المعالجة منذ ${m} دقيقة`,
          detail: `${esc(o.customer && o.customer.name || '')} · ${Number(o.total || 0).toLocaleString('en-US')} ل.س`,
          target: 'online_orders.html',
        });
      } else if (m >= 5) {
        out.push({
          key: 'onl:soon:' + o.id, sig: '5', level: 'warn',
          title: `طلب أونلاين ${esc(o.id)} وصل ولم يُعالج بعد`,
          detail: `${esc(o.customer && o.customer.name || '')} · منذ ${m} دقيقة`,
          target: 'online_orders.html',
        });
      }
    });

    /* 2) طلبات معلّقة عند الكاشير تجاوزت 30 دقيقة (من مسودة نقطة البيع) */
    try {
      const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
      (draft && draft.heldOrders || []).forEach(h => {
        const parts = String(h.at || '').split(':');
        if (parts.length < 2) return;
        const heldAt = new Date(); heldAt.setHours(+parts[0], +parts[1], 0, 0);
        const m = Math.floor((now - heldAt) / 60000);
        if (m < 30 || m > 20 * 60) return;   /* أقل من 30 دقيقة لا تنبيه، وأكثر من 20 ساعة = من يوم سابق */
        out.push({
          key: 'held:' + (h.id != null ? h.id : h.at), sig: m >= 120 ? '120+' : m >= 60 ? '60' : '30',
          level: 'warn',
          title: `طلب معلّق #${esc(h.id)} منذ ${m} دقيقة`,
          detail: `${(h.cart || []).length} صنف · عُلّق الساعة ${esc(h.at)} — نُسي أم ينتظر شيئاً؟`,
          target: 'pos.html',
        });
      });
    } catch (e) {}

    /* 2.5) المخزون: مواد نافدة أو بلغت حد الطلب */
    (function () {
      const invs = D.inventory || [];
      const printedItems = ((D.invoices) || []).filter(i => i.status === 'printed').flatMap(i => i.items || []);
      const eff = inv => {
        const manualOut = (inv.log || []).filter(l => l.type === 'out' && !l.auto).reduce((s, l) => s + (l.qty || 0), 0);
        let auto = 0;
        if (inv.trackable && (inv.recipe || []).length)
          inv.recipe.forEach(r => {
            const sold = printedItems.filter(i => i.id === r.item_id).reduce((s, i) => s + (i.qty || 1), 0);
            auto += sold * r.qty;
          });
        return (inv.qty || 0) - manualOut - auto;
      };
      const outMats = invs.filter(m => eff(m) <= 0);
      const lowMats = invs.filter(m => { const q = eff(m); return q > 0 && m.min_qty > 0 && q <= m.min_qty; });
      if (outMats.length) {
        out.push({
          key: 'inv:out', sig: String(outMats.length), level: 'urgent',
          title: `مواد نافدة من المخزون: ${outMats.length}`,
          detail: outMats.slice(0, 3).map(m => esc(m.name)).join('، ') + (outMats.length > 3 ? ' وغيرها' : '') + ' — اطلبها اليوم',
          target: 'inventory.html',
        });
      }
      if (lowMats.length) {
        out.push({
          key: 'inv:low', sig: String(lowMats.length), level: 'warn',
          title: `مواد بلغت حد الطلب: ${lowMats.length}`,
          detail: lowMats.slice(0, 3).map(m => esc(m.name)).join('، ') + (lowMats.length > 3 ? ' وغيرها' : '') + ' — قائمة الشراء جاهزة في شاشة المخزون',
          target: 'inventory.html',
        });
      }
    })();

    /* 2.7) دفعات عقود تستحق أو تأخرت */
    (function () {
      const today = todayStr();
      const soon = (()=>{ const d=new Date(Date.now()+2*864e5); return businessDay(d); })();
      const nf = n => Number(n || 0).toLocaleString('en-US');
      (D.contracts || []).forEach(c => {
        if (c.status !== 'active') return;
        (c.installments || []).forEach(i => {
          if (i.paid) return;
          if (i.due_date < today) {
            out.push({
              key: 'ci:' + c.id + ':' + i.id, sig: i.due_date, level: 'urgent',
              title: `دفعة عقد متأخرة — ${esc(c.client_name)}`,
              detail: `استحقت بتاريخ ${esc(i.due_date)} · ${nf(i.amount)} ل.س${c.company ? ' · ' + esc(c.company) : ''}`,
              target: 'contracts.html',
            });
          } else if (i.due_date <= soon) {
            out.push({
              key: 'ci:' + c.id + ':' + i.id, sig: i.due_date, level: 'warn',
              title: `دفعة عقد تستحق قريباً — ${esc(c.client_name)}`,
              detail: `تستحق بتاريخ ${esc(i.due_date)} · ${nf(i.amount)} ل.س`,
              target: 'contracts.html',
            });
          }
        });
        /* استحقاق العميل المرتبط (next_due_date) وإن لم يكن في الدفعات المجدولة */
        const cust = ((D.customers) || []).find(u => u.id === c.customer_id);
        if (cust && cust.next_due_date && cust.next_due_date < today &&
            !(c.installments || []).some(i => !i.paid && i.due_date === cust.next_due_date)) {
          out.push({
            key: 'cnd:' + c.id, sig: cust.next_due_date, level: 'warn',
            title: `استحقاق ذمة العقد تأخر — ${esc(c.client_name)}`,
            detail: `أقرب استحقاق ${esc(cust.next_due_date)} · الذمة الحالية ${nf(cust.credit_balance)} من سقف ${nf(cust.credit_limit)}`,
            target: 'contracts.html',
          });
        }
      });
    })();

    /* 2.8) فرق صندوق عند إغلاق الوردية (الجرد الأعمى) */
    (function () {
      const lc = (D.cashierSession || {}).last_close;
      if (lc && lc.diff < 0) {
        const nf = n => Number(n || 0).toLocaleString('en-US');
        out.push({
          key: 'cbox:diff', sig: String(Math.round(lc.diff)),
          level: Math.abs(lc.diff) >= 100000 ? 'urgent' : 'warn',
          title: `فرق صندوق عند إغلاق الوردية: نقص ${nf(Math.abs(lc.diff))} ل.س`,
          detail: `الجرد الفعلي ${nf(lc.counted)} مقابل متوقع ${nf(lc.expected)} · عند ${esc(lc.at || '')}`,
          target: 'cashier_session.html',
        });
      }
    })();

    /* 3) عروض فعّالة تنتهي خلال 48 ساعة */
    const today = todayStr();
    const after2 = (()=>{ const d=new Date(Date.now()+2*864e5); return businessDay(d); })();
    ((D.offers) || []).forEach(f => {
      if (!f.active || !f.expires_at) return;
      if (f.expires_at < today || f.expires_at > after2) return;
      out.push({
        key: 'ofr:' + f.id, sig: f.expires_at, level: 'warn',
        title: `عرض يقترب من انتهائه — ${esc(f.title)}`,
        detail: `ينتهي بتاريخ ${esc(f.expires_at)} · جدّده أو دعه ينتهي`,
        target: 'settings.html',
      });
    });

    /* 4) فواتير آجلة غير مسددة */
    const deferred = ((D.invoices) || []).filter(i => i.pay_type === 'deferred' && !i.paid);
    if (deferred.length) {
      const sum = deferred.reduce((s, i) => s + (i.total || 0), 0);
      out.push({
        key: 'defr', sig: String(deferred.length), level: 'info',
        title: `فواتير آجلة غير مسددة: ${deferred.length} فاتورة`,
        detail: `بإجمالي ${sum.toLocaleString('en-US')} ل.س · أقدمها ${esc(deferred[0].date || '')}`,
        target: 'invoices.html',
      });
    }

    /* 5) أصناف تُباع تحت التكلفة */
    const under = ((D.items) || []).filter(it => {
      const c = itemCost(it, D);
      return c > 0 && Number(it.price) < c;
    });
    if (under.length) {
      out.push({
        key: 'negmargin', sig: String(under.length), level: 'info',
        title: `أصناف تُباع تحت التكلفة: ${under.length}`,
        detail: under.slice(0, 3).map(i => esc(i.name)).join('، ') + (under.length > 3 ? ' وغيرها' : ''),
        target: 'costs.html',
      });
    }

    /* 6) دورة الكاشير تقرُب من الإغلاق (8ص → 5ف) */
    if (now.getHours() === 16) {
      out.push({
        key: 'sess:' + today, sig: today, level: 'info',
        title: 'دورة الكاشير تقرُب من الإغلاق',
        detail: `الساعة ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')} — التصفية تبدأ 5:00 مساءً`,
        target: 'cashier_session.html',
      });
    }

    /* استبعاد المعالَج ما لم يسوء وضعُه */
    const dismissed = get(LS_DISMISS, {});
    active = out.filter(a => {
      const d = dismissed[a.key];
      return !d || d.sig !== a.sig;
    }).sort((a, b) => ORDER[a.level] - ORDER[b.level]);

    notifyNewUrgent();
    return active;
  }

  /* ── إشعار هاتفي للعاجل الجديد (إشعار أصلي + نغمة إن كانت الصفحة مفتوحة) ── */
  function notifyNewUrgent() {
    const notified = get(LS_NOTIFIED, {});
    const urgents = active.filter(a => a.level === 'urgent');
    urgents.forEach(a => {
      if (notified[a.key] === a.sig) return;
      notified[a.key] = a.sig;
      if (window.Notify && Notify.chime) { try { Notify.chime(); } catch (e) {} }
      if ('Notification' in window && Notification.permission === 'granted' && navigator.serviceWorker) {
        navigator.serviceWorker.ready.then(reg => {
          try {
            reg.showNotification('🔔 تنبيه عاجل — alfaprosys', {
              body: a.title, icon: 'assets/icon/logo.png',
              badge: 'assets/icon/logo.png', tag: 'alert-' + a.key,
            });
          } catch (e) {}
        }).catch(() => {});
      }
    });
    set(LS_NOTIFIED, notified);
  }

  function counts() {
    const c = { urgent: 0, warn: 0, info: 0 };
    active.forEach(a => c[a.level]++);
    return c;
  }

  /* ── البطاقة داخل شبكة إحصائيات لوحة التحكم ── */
  function cardHTML() {
    const c = counts();
    const total = c.urgent + c.warn + c.info;
    const cls = c.urgent ? 'alert-urgent' : c.warn ? 'alert-warn' : c.info ? 'alert-info' : 'alert-ok';
    return `
      <div class="mgr-stat-card ${cls} alerts-stat-card ${c.urgent ? 'pulse-ring' : ''}" id="alertsCard"
        data-alerts-open="1" role="button" tabindex="0" title="فتح جدول التنبيهات">
        <div class="mgr-stat-lbl">🔔 التنبيهات</div>
        <div class="mgr-stat-val">${total}</div>
        <div class="mgr-stat-sub">
          ${total
            ? [c.urgent ? `🔴 ${c.urgent} عاجل` : '', c.warn ? `🟠 ${c.warn} تحذير` : '', c.info ? `🟡 ${c.info} متابعة` : '']
                .filter(Boolean).join(' · ')
            : '✓ لا شيء يحتاج تدخلك'}
        </div>
      </div>`;
  }

  /* ── جدول التنبيهات ── */
  function tableHTML() {
    if (!tableOpen) return '';
    const rows = active.map(a => {
      const L = LEVELS[a.level];
      return `
        <tr class="alert-row-${a.level}">
          <td><span class="alert-badge ${L.cls}">${L.icon} ${L.label}</span></td>
          <td class="alert-cell-title">${esc(a.title)}</td>
          <td class="alert-cell-detail">${esc(a.detail)}</td>
          <td>
            <button type="button" class="alert-go" data-alert-go="${a.target}">معالجة ↩</button>
            <button type="button" class="alert-done" data-alert-done="${esc(a.key)}">تمّت المعالجة ✓</button>
          </td>
        </tr>`;
    }).join('');
    return `
      <div class="alerts-scrim" data-alerts-close="1"></div>
      <div class="alerts-modal" role="dialog" aria-label="جدول التنبيهات">
        <div class="alerts-modal-head">
          <div>
            <div class="alerts-modal-title">🔔 جدول التنبيهات</div>
            <div class="alerts-modal-sub">أحداث تتطلب قراراً — مرتبة بالخطورة، ولا تُشطب إلا بمعالجة فعلية</div>
          </div>
          <button type="button" class="alerts-close" data-alerts-close="1">✕</button>
        </div>
        ${active.length ? `
          <div class="alerts-table-wrap">
            <table class="alerts-table">
              <thead><tr><th>المستوى</th><th>التنبيه</th><th>التفصيل</th><th>إجراء</th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>` : `<div class="alerts-empty">✓ لا تنبيهات — كل شيء تحت السيطرة</div>`}
      </div>`;
  }

  function dismiss(key) {
    const a = active.find(x => x.key === key);
    if (!a) return;
    const d = get(LS_DISMISS, {});
    d[key] = { sig: a.sig, at: Date.now() };
    set(LS_DISMISS, d);
    scan(); rerender();
  }

  /* ── واجهة ربط مع شاشة الإدارة ── */
  function rerender() {
    const card = document.getElementById('alertsCard');
    if (card) { card.outerHTML = cardHTML(); }
    const host = document.getElementById('alertsTableHost');
    if (host) host.innerHTML = tableHTML();
  }
  function refresh() { scan(); rerender(); }
  function start() {
    scan();
    document.addEventListener('click', e => {
      const openEl = e.target.closest && e.target.closest('[data-alerts-open]');
      if (openEl) { tableOpen = true; rerender(); return; }
      if (e.target.closest && e.target.closest('[data-alerts-close]')) { tableOpen = false; rerender(); return; }
      const go = e.target.closest && e.target.closest('[data-alert-go]');
      if (go) { window.location.href = go.dataset.alertGo; return; }
      const done = e.target.closest && e.target.closest('[data-alert-done]');
      if (done) { dismiss(done.dataset.alertDone); return; }
    });
    /* مراقبة دورية + عند عودة التركيز (متابعة هاتفية) */
    setInterval(refresh, 60000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
    window.addEventListener('storage', refresh);
  }

  return { scan, start, refresh, cardHTML, tableHTML, counts, get active() { return active; } };
})();
