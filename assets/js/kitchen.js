/* ================================================================
   kitchen.js — شاشة المطبخ KDS المتقدمة — alfaprosys
   تعرض الطلبات الحيّة مع تنبيهات صوتية وبصرية للطلبات
   الجديدة والتعديلات والإلغاءات.
   ================================================================ */
const DATA = window.DEMO_DATA;

/* ── حالة الشاشة ── */
let knownIds = new Set();       // الطلبات المعروفة (للكشف عن الجديد)
let knownMods = {};             // عدد التعديلات لكل فاتورة
let cancelBanners = [];         // banners الإلغاء النشطة
let autoRefreshMs = 3000;       // تحديث كل 3 ثوان
let refreshTimer = null;
let audioCtx = null;

/* ── الفواتير النشطة (آخر ساعتين + قيد التحضير/جاهز دائماً) ── */
var TWO_HOURS_MS = 2 * 60 * 60 * 1000;
function activeTickets() {
  var cutoff = Date.now() - TWO_HOURS_MS;
  return (DATA.invoices || []).filter(function (i) {
    if (i.status === 'cancelled') return false;
    var st = i.kitchen_status;
    if (st === 'done' || st === 'delivered') return false;
    /* cooking و ready تظهر دائماً مهما كان عمرها */
    if (st === 'cooking' || st === 'ready') return true;
    /* باقي الطلبات: فقط آخر ساعتين */
    var created = i.created_at ? new Date(i.created_at).getTime() : 0;
    if (created && created < cutoff) return false;
    return true;
  });
}

/* ── الطلبات المهملة (أقدم من ساعتين وليست cooking/ready) ── */
function staleTickets() {
  var cutoff = Date.now() - TWO_HOURS_MS;
  return (DATA.invoices || []).filter(function (i) {
    if (i.status === 'cancelled') return false;
    var st = i.kitchen_status;
    if (st === 'done' || st === 'delivered') return false;
    if (st === 'cooking' || st === 'ready') return false;
    var created = i.created_at ? new Date(i.created_at).getTime() : 0;
    return created && created < cutoff;
  });
}

/* ── الوقت المنقضي ── */
function elapsedMin(inv) {
  var t = inv.created_at ? new Date(inv.created_at) : null;
  if (!t || isNaN(t)) return 0;
  return Math.max(0, Math.round((Date.now() - t.getTime()) / 60000));
}
function timerClass(min) {
  if (min < 5) return 'green';
  if (min < 10) return 'yellow';
  return 'red';
}

/* ── معلومات الطلب ── */
function typeLabel(inv) {
  return { table: '🍽️ طاولة', takeaway: '🥡 سفري', delivery: '🛵 توصيل', contract: '📋 عقد' }[inv.type] || inv.type || '';
}
function typeClass(inv) {
  return inv.type || 'takeaway';
}
function locationLabel(inv) {
  return inv.hall || inv.table_label || inv.customer_name || '';
}

/* ── تحديث حالة المطبخ ── */
function setKitchen(id, st) {
  var inv = (DATA.invoices || []).find(function (i) { return i.id === id; });
  if (!inv) return;
  inv.kitchen_status = st;
  if (st === 'done' || st === 'delivered') {
    playSound('done');
  }
  /* ── ترحيل ── */
  if (window.AlfaDB && AlfaDB.upsert) AlfaDB.upsert('invoices', inv);
  if (window.InvoiceSync) InvoiceSync.pushSoon(inv);
  if (window.alfaPersist) window.alfaPersist();
  render();
}

/* ── الأصوات (Web Audio API — بدون ملفات) ── */
function getAudioCtx() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
  }
  return audioCtx;
}
function playSound(type) {
  var ctx = getAudioCtx();
  if (!ctx) return;
  var osc = ctx.createOscillator();
  var gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  gain.gain.value = 0.3;
  if (type === 'new') {
    osc.frequency.value = 880;
    osc.type = 'sine';
    osc.start();
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.15);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc.stop(ctx.currentTime + 0.5);
  } else if (type === 'modify') {
    osc.frequency.value = 660;
    osc.type = 'triangle';
    osc.start();
    osc.frequency.setValueAtTime(660, ctx.currentTime);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
    osc.frequency.setValueAtTime(660, ctx.currentTime + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
    osc.stop(ctx.currentTime + 0.35);
  } else if (type === 'cancel') {
    osc.frequency.value = 440;
    osc.type = 'sawtooth';
    gain.gain.value = 0.2;
    osc.start();
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.setValueAtTime(330, ctx.currentTime + 0.2);
    osc.frequency.setValueAtTime(220, ctx.currentTime + 0.4);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
    osc.stop(ctx.currentTime + 0.6);
  } else if (type === 'done') {
    osc.frequency.value = 523;
    osc.type = 'sine';
    osc.start();
    osc.frequency.setValueAtTime(523, ctx.currentTime);
    osc.frequency.setValueAtTime(659, ctx.currentTime + 0.12);
    osc.frequency.setValueAtTime(784, ctx.currentTime + 0.24);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    osc.stop(ctx.currentTime + 0.4);
  }
}

/* ── كشف الطلبات الجديدة / المعدلة / الملغاة ── */
function detectChanges() {
  var current = activeTickets();
  var currentIds = new Set(current.map(function (i) { return i.id; }));

  /* طلبات جديدة */
  current.forEach(function (inv) {
    if (!knownIds.has(inv.id)) {
      playSound('new');
      inv._isNew = true;
    }
  });

  /* طلبات معدلة */
  current.forEach(function (inv) {
    var mods = (inv.modifications || []).length;
    if (knownMods[inv.id] !== undefined && mods > knownMods[inv.id]) {
      playSound('modify');
      inv._isModified = true;
    }
    knownMods[inv.id] = mods;
  });

  /* طلبات ملغاة (كانت موجودة والآن لا) */
  knownIds.forEach(function (id) {
    if (!currentIds.has(id)) {
      var inv = (DATA.invoices || []).find(function (i) { return i.id === id; });
      if (inv && inv.status === 'cancelled') {
        playSound('cancel');
        showCancelBanner(inv);
      }
    }
  });

  knownIds = currentIds;
}

/* ── بانر الإلغاء ── */
function showCancelBanner(inv) {
  var banner = {
    id: inv.id,
    label: inv.id,
    items: (inv.items || []).map(function (it) { return it.qty + '× ' + it.name; }).join(', '),
    time: Date.now(),
  };
  cancelBanners.push(banner);
  setTimeout(function () {
    cancelBanners = cancelBanners.filter(function (b) { return b.id !== inv.id; });
    renderBanners();
  }, 8000);
  renderBanners();
}
function renderBanners() {
  var el = document.getElementById('kdsBanners');
  if (!el) return;
  el.innerHTML = cancelBanners.map(function (b) {
    return '<div class="kds-cancel-banner" style="position:relative;top:auto;left:auto;transform:none;margin-bottom:8px;">' +
      '<span>🔴</span>' +
      '<span>تم إلغاء الطلب <strong>' + e(b.label) + '</strong></span>' +
      '<span style="font-size:12px;opacity:0.8;">' + e(b.items.slice(0, 60)) + '</span>' +
    '</div>';
  }).join('');
}

/* ── ملء الشاشة ── */
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(function () {});
    document.body.classList.add('kds-fullscreen');
  } else {
    document.exitFullscreen().catch(function () {});
    document.body.classList.remove('kds-fullscreen');
  }
}

/* ── الساعة ── */
function updateClock() {
  var el = document.getElementById('kdsClock');
  if (el) {
    var now = new Date();
    el.textContent = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
}

/* ══════════════════════════════════════════════════
   الرسم الرئيسي
   ══════════════════════════════════════════════════ */
function render() {
  detectChanges();

  var list = activeTickets().sort(function (a, b) {
    var sa = a.kitchen_status || 'new';
    var sb = b.kitchen_status || 'new';
    /* ترتيب المجموعات: new → cooking → ready */
    var order = { 'new': 0, 'cooking': 1, 'ready': 2 };
    var oa = order[sa] !== undefined ? order[sa] : 3;
    var ob = order[sb] !== undefined ? order[sb] : 3;
    if (oa !== ob) return oa - ob;
    /* داخل كل مجموعة: الأحدث أولاً (تنازلي) */
    return (b.created_at || '').localeCompare(a.created_at || '');
  });

  /* الطلبات المهملة */
  var stale = staleTickets();
  var staleEl = document.getElementById('kdsStale');
  if (staleEl) {
    if (stale.length > 0) {
      staleEl.innerHTML = '<span style="color:#ef4444;font-weight:800;">⚠️ ' + stale.length + ' طلب مهمل (أكثر من ساعتين)</span>';
      staleEl.style.display = '';
    } else {
      staleEl.style.display = 'none';
    }
  }

  /* إحصائيات */
  var newCount = list.filter(function (i) { return i.kitchen_status === 'new'; }).length;
  var cookingCount = list.filter(function (i) { return i.kitchen_status === 'cooking'; }).length;
  var readyCount = list.filter(function (i) { return i.kitchen_status === 'ready'; }).length;

  var statNew = document.getElementById('statNew');
  var statCooking = document.getElementById('statCooking');
  var statReady = document.getElementById('statReady');
  if (statNew) statNew.textContent = newCount;
  if (statCooking) statCooking.textContent = cookingCount;
  if (statReady) statReady.textContent = readyCount;

  /* الشبكة */
  var grid = document.getElementById('kdsGrid');
  if (!grid) return;

  if (!list.length) {
    grid.innerHTML =
      '<div class="kds-empty">' +
        '<div class="kds-empty-icon">🍳</div>' +
        '<div class="kds-empty-text">لا طلبات قيد التحضير</div>' +
        '<div class="kds-empty-sub">الطلبات الجديدة ستظهر هنا فوراً</div>' +
      '</div>';
    return;
  }

  grid.innerHTML = list.map(function (inv) {
    var st = inv.kitchen_status || 'new';
    var min = elapsedMin(inv);
    var isModified = inv._isModified || (inv.modified_at && (inv.modifications || []).length > 0);
    var isNew = inv._isNew;
    var mods = inv.modifications || [];
    var items = (inv.items || []).filter(function (it) { return !it.offer_disc; });

    var cardClass = 'kds-card status-' + st;
    if (isModified) cardClass += ' modified';
    if (isNew) cardClass += ' new-flash';

    var actionBtn = '';
    if (st === 'new')     actionBtn = '<button class="kds-btn btn-start" onclick="setKitchen(\'' + e(inv.id) + '\',\'cooking\')">▶ بدء التحضير</button>';
    if (st === 'cooking') actionBtn = '<button class="kds-btn btn-ready" onclick="setKitchen(\'' + e(inv.id) + '\',\'ready\')">✅ جاهز للتسليم</button>';
    if (st === 'ready')   actionBtn = '<button class="kds-btn btn-done" onclick="setKitchen(\'' + e(inv.id) + '\',\'done\')">🛵 تم التسليم</button>';

    return '<div class="' + cardClass + '">' +
      /* رأس */
      '<div class="kds-card-head">' +
        '<span class="kds-card-id">' + e(inv.id) + '</span>' +
        '<span class="kds-card-type ' + typeClass(inv) + '">' + typeLabel(inv) + '</span>' +
        '<div class="kds-card-badges">' +
          (inv.queue_no ? '<span class="kds-badge queue-badge">#' + inv.queue_no + '</span>' : '') +
          (isModified ? '<span class="kds-badge modified-badge">⚠️ معدّل</span>' : '') +
        '</div>' +
        '<span class="kds-timer ' + timerClass(min) + '">⏱ ' + min + ' د</span>' +
      '</div>' +
      /* معلومات */
      '<div class="kds-card-info">' +
        e(locationLabel(inv)) +
        (inv.time ? ' · ' + e(inv.time) : '') +
        (inv.cashier ? ' · كاشير: ' + e(inv.cashier) : '') +
      '</div>' +
      /* الأصناف */
      '<div class="kds-card-items">' +
        items.map(function (it) {
          return '<div class="kds-item">' +
            '<span class="kds-item-qty">' + it.qty + '</span>' +
            '<span class="kds-item-name">' + e(it.name) +
              (it.note ? '<span class="kds-item-note">📝 ' + e(it.note) + '</span>' : '') +
            '</span>' +
          '</div>';
        }).join('') +
      '</div>' +
      /* التعديلات */
      (mods.length ? '<div class="kds-modifications">' +
        '<div class="kds-mod-title">⚠️ تعديلات (' + mods.length + ')</div>' +
        mods.map(function (m) {
          var icons = { add: '🟢', decrease: '🔶', remove: '🔴', replace: '🔄' };
          return '<div class="kds-mod-item">' + (icons[m.type] || '•') + ' ' + e(m.detail) + '</div>';
        }).join('') +
      '</div>' : '') +
      /* الإجراءات */
      '<div class="kds-card-actions">' + actionBtn + '</div>' +
    '</div>';
  }).join('');

  /* مسح علامات الجديد بعد الرسم */
  list.forEach(function (inv) { inv._isNew = false; inv._isModified = false; });
}

/* ══════════════════════════════════════════════════
   التهيئة
   ══════════════════════════════════════════════════ */
(window.alfaStart || function (fn) { fn(); })(function () {
  /* تسجيل الطلبات الحالية كمعروفة (لا تنبيه عند أول تحميل) */
  activeTickets().forEach(function (inv) {
    knownIds.add(inv.id);
    knownMods[inv.id] = (inv.modifications || []).length;
  });

  render();
  updateClock();

  /* تحديث تلقائي */
  refreshTimer = setInterval(function () {
    render();
    updateClock();
  }, autoRefreshMs);

  /* الساعة كل ثانية */
  setInterval(updateClock, 1000);

  /* تفعيل الصوت عند أول تفاعل */
  document.addEventListener('click', function initAudio() {
    getAudioCtx();
    document.removeEventListener('click', initAudio);
  }, { once: true });

  /* Pull من Supabase كل 10 ثوان */
  if (window.InvoiceSync && InvoiceSync.pull) {
    setInterval(function () {
      InvoiceSync.pull().then(function () { render(); }).catch(function () {});
    }, 10000);
  }
});
