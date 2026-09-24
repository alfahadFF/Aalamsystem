/* ================================================================
   thermal.js — الطباعة الحرارية عبر QZ Tray — alfaprosys
   نفس آلية نظام الطلبات الأونلاين: شهادة موقّعة + طباعة صامتة
   على طابعتين (كاشير + مطبخ)، مع بديل حوار الطباعة عند غياب QZ.
   الأسماء والعرض قابلة للتعديل من config.js ← thermal
   ================================================================ */
(function () {
  if (window.ThermalPrint) return;

  const CFG = () => (window.ALFA_CONFIG && window.ALFA_CONFIG.thermal) || {};
  /* الاسم الأساسي + aliases — الاختيار الفعلي: USB حي → وإلا مشاركة شبكة (على …) → وإلا محلي */
  const PRINTER_CASHIER = () => CFG().printerCashier || 'RONGTA 80mm 2';
  const PRINTER_KITCHEN = () => CFG().printerKitchen || 'RONGTA 80mm Series Printer';
  function uniqNames(list) {
    const out = [], seen = {};
    (list || []).forEach(function (n) {
      const s = String(n || '').trim();
      if (!s) return;
      const k = s.toLowerCase();
      if (seen[k]) return;
      seen[k] = true;
      out.push(s);
    });
    return out;
  }
  function cashierCandidates() {
    return uniqNames([PRINTER_CASHIER()].concat(CFG().printerCashierAliases || [
      'RONGTA 80mm 2 على SERVER', 'RONGTA 80mm 2 on SERVER',
      '\\SERVER\\RONGTA 80mm 2', '\\SERVER\\RONGTA80mm2',
      'RONGTA80mm2'
    ]));
  }
  function kitchenCandidates() {
    return uniqNames([PRINTER_KITCHEN()].concat(CFG().printerKitchenAliases || [
      'RONGTA 80mm Series Printer على SERVER', 'RONGTA 80mm Series Printer on SERVER',
      '\\SERVER\\RONGTA 80mm Series Printer', '\\SERVER\\RONGTA80mm1',
      'RONGTA80mm1', 'RONGTA 80mm Series Printer'
    ]));
  }
  /* مضيفو QZ الشبكيون: config.qzHosts + localStorage + اكتشاف خفيف لنفس الشsubnet */
  const QZ_HOST_LS = 'alfaprosys_qz_host';
  function savedQzHost() {
    try { return (localStorage.getItem(QZ_HOST_LS) || '').trim(); } catch (e) { return ''; }
  }
  function rememberQzHost(h) {
    if (!h || h === 'localhost' || h === '127.0.0.1') return;
    try { localStorage.setItem(QZ_HOST_LS, h); } catch (e) {}
  }
  function qzHostCandidates() {
    const cfgH = CFG().qzHosts || CFG().qzHost || [];
    const list = Array.isArray(cfgH) ? cfgH.slice() : (cfgH ? [cfgH] : []);
    const saved = savedQzHost();
    if (saved) list.unshift(saved);
    return uniqNames(list);
  }
  /* مدة صلاحية الأسماء المحلولة — ١٠ دقائق بدل ٨ ثوانٍ.
     الاستكشاف كان يعاد كل ٨ ثوانٍ فيُبطئ كل فاتورة. */
  const RESOLVE_TTL = 10 * 60 * 1000;
  const PRINTER_LS = 'alfaprosys_qz_printers';
  let lastDetails = null, lastDetailsAt = 0;

  const WIDTH = () => Number(CFG().widthMm) || 72;            // عرض قالب الإيصال
  const PAPER = () => Number(CFG().paperWidthMm) || WIDTH();  // عرض الورق الفيزيائي
  /* الحد الأدنى لطول الإيصال (مم) — من config.js ← thermal.minHeightMm
     فاتورة صاحب المطعم المعتمدة طولها ثابت 128مم (12.8سم) بغض النظر عن
     المحتوى؛ فإن تجاوزه المحتوى يتمدد الإيصال تلقائياً. صفر = بلا حد أدنى. */
  const MINH = () => Number(CFG().minHeightMm) || 0;
  /* أحجام الخطوط = مقاسات الفاتورة المعتمدة لدى المطعم (صورة 9/3/2026).
     عدّلها من config.js → thermal.fonts إن أراد صاحب المطعم تغييراً. */
  const FONTS = () => Object.assign({
    title: 20, sub: 12.5, noLabel: 26, no: 26, date: 12, cust: 12.5,
    th: 9.5, td: 12, name: 11, note: 14, itemNote: 11, sum: 13, thanks: 15, address: 12.5,
  }, CFG().fonts || {});
  const FEED = () => Number(CFG().feedMm) || 3;
  /* عروض أعمدة جدول الأصناف (نسبة مئوية من عرض الجدول) — من config.js
     ← thermal.cols. الافتراضي: اسم المادة مُوسَّع على حساب البقية. */
  const COLS = () => Object.assign({ name: 34, qty: 10, price: 16, total: 18, note: 22 }, CFG().cols || {});
  const RESTAURANT = () => CFG().restaurantName || 'alfaprosys';
  const FONT_FAMILY = () => CFG().fontFamily || 'Tahoma,Arial,sans-serif';
  /* أعلام إظهار عناصر الترويسة/التذييل — من invoice_print في السحابة */
  const SHOW = () => {
    const s = CFG().show || {};
    return {
      logo: CFG().showLogo !== false && s.logo !== false,
      name: s.name !== false,
      description: s.description !== false,
      address: s.address !== false,
      orderNo: s.orderNo !== false,
      date: s.date !== false,
      customer: s.customer !== false,
      orderNotes: s.orderNotes !== false,
      footerTitle: s.footerTitle !== false,
      thankYou: s.thankYou !== false,
      qr: CFG().showQr !== false && s.qr !== false,
      drawCode: !!(CFG().showDrawCode || s.drawCode),
    };
  };
  const LOGO_MAX = () => Number(CFG().logoMaxMm) || 22;
  const QR_SIZE = () => Number(CFG().qrSizeMm) || 25;

  /* ── الشهادة العامة فقط — تُوضع في config.js
     المفتاح الخاص لا يُوضع في الموقع أبداً. خياران للتوقيع:
     1) محلي (أوفلاين): يُدخَل المفتاح الخاص مرة واحدة لكل جهاز عبر
        صفحة qz-key.html ويُحفظ في localStorage — التوقيع يتم بالمتصفح.
     2) سيرفري: عبر netlify/functions/sign.js إن لم يوجد مفتاح محلي ── */
  const CERT = () => (window.ALFA_CONFIG && window.ALFA_CONFIG.thermal && window.ALFA_CONFIG.thermal.qzCert) || '';
  const KEY_STORE = 'alfaprosys_qz_private_key';
  const localKeyPem = () => { try { return (localStorage.getItem(KEY_STORE) || '').trim(); } catch (e) { return ''; } };

  let state = 'idle'; // idle | connecting | connected | offline
  const handlers = [];
  function setState(s) { state = s; handlers.forEach(h => { try { h(s); } catch (e) {} }); }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const el = document.createElement('script');
      el.src = src;
      el.onload = resolve;
      el.onerror = () => reject(new Error('تحميل مكتبة فشل: ' + src));
      document.head.appendChild(el);
    });
  }

  /* التوقيع سيرفرياً عبر Netlify Function — المفتاح الخاص لا يغادر السيرفر
     (احتياط عند غياب المفتاح المحلي، ويحتاج إنترنت) */
  async function serverSign(toSign) {
    const secret = window.ALFA_CONFIG && window.ALFA_CONFIG.thermal && window.ALFA_CONFIG.thermal.qzSecret;
    const headers = { 'Content-Type': 'application/json' };
    if (secret) headers['x-qz-secret'] = secret;
    /* مهلة 8ث: الطباعة لا تعلق على توقيع سيرفري (وضع سوريا) */
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const st = ctrl ? setTimeout(function () { try { ctrl.abort(); } catch (e) {} }, 8000) : null;
    try {
    const res = await fetch('/.netlify/functions/sign', {
      method: 'POST',
      headers,
      body: JSON.stringify({ request: toSign }),
      signal: ctrl ? ctrl.signal : undefined,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error('sign failed: ' + (err.error || res.status));
    }
    const { signature } = await res.json();
    if (st) clearTimeout(st);
    return signature;
    } finally { if (st) clearTimeout(st); }
  }

  /* ── التوقيع محلياً بلا إنترنت (WebCrypto) ──
     نفس ما تفعله دالة Netlify تماماً: RSA-SHA512 فوق النص المُمرَّر،
     لكن داخل متصفح الجهاز. المفتاح الخاص يُقرأ من localStorage
     (أُدخِل عبر qz-key.html) ولا يغادر الجهاز أبداً. */
  function b64ToBuf(b64) {
    const bin = atob(b64.replace(/\s+/g, ''));
    const buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    return buf;
  }
  function bufToB64(buf) {
    let s = '';
    const u = new Uint8Array(buf);
    for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
    return btoa(s);
  }
  /* PKCS#1 (BEGIN RSA PRIVATE KEY) → PKCS#8: WebCrypto لا يستورد PKCS#1 مباشرة */
  function derLen(n) {
    if (n < 128) return [n];
    if (n < 256) return [0x81, n];
    return [0x82, (n >> 8) & 0xff, n & 0xff]; // مفاتيح 2048-بت وأكبر (~1190+ بايت)
  }
  function pkcs1ToPkcs8(der) {
    const alg = [0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7,
                 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00]; // SEQ{OID rsaEncryption, NULL}
    const inner = [0x02, 0x01, 0x00, ...alg, 0x04, ...derLen(der.length), ...der];
    return new Uint8Array([0x30, ...derLen(inner.length), ...inner]);
  }
  async function importLocalKey(pem) {
    const m = pem.match(/-----BEGIN ([A-Z ]+)-----([^-]+)-----END \1-----/);
    if (!m) throw new Error('صيغة PEM غير مفهومة');
    let der = b64ToBuf(m[2]);
    if (m[1] === 'RSA PRIVATE KEY') der = pkcs1ToPkcs8(der); // PKCS#1 → PKCS#8
    else if (m[1] !== 'PRIVATE KEY') throw new Error('هذا ليس مفتاحاً خاصاً (وجدنا: ' + m[1] + ')');
    return crypto.subtle.importKey('pkcs8', der,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-512' }, false, ['sign']);
  }
  async function localSign(toSign) {
    const pem = localKeyPem();
    if (!pem) throw new Error('لا يوجد مفتاح محلي');
    const key = await importLocalKey(pem);
    const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(toSign));
    return bufToB64(sig);
  }

  function setupSecurity() {
    const cert = CERT();
    if (!cert) {
      console.warn('[ThermalPrint] qzCert غير مضبوط في config.js — أضف الشهادة العامة لـ ALFA_CONFIG.thermal.qzCert');
    }
    qz.security.setCertificatePromise(resolve => resolve(cert));
    qz.security.setSignatureAlgorithm('SHA512');
    /* الأولوية للتوقيع المحلي (أوفلاين)، وإلا فسيرفري عبر Netlify */
    qz.security.setSignaturePromise(toSign => (resolve, reject) => {
      (localKeyPem() ? localSign(toSign) : serverSign(toSign)).then(resolve).catch(reject);
    });
  }

  /* مهلة إعادة المحاولة: عندما تكون QZ Tray غير مشغّلة كان كل بيع ينتظر
     3 محاولات × 2 ثانية (~6 ث) قبل فتح حوار الطباعة. الآن المحاولة التلقائية
     واحدة، ولا تُعاد إلا بعد OFFLINE_COOLDOWN — والاتصال اليدوي (force) كامل. */
  /* مهلة متصاعدة: 30ث ثم 60ث ثم 120ث (حد أقصى). تنجح المحاولة ⇒ تصفير.
     الهدف: ألا ينتظر الكاشير ثوانٍ عند كل بيع وطابعة QZ غير مشغّلة. */
  let offlineCooldown = 30000;
  let offlineUntil = 0;
  /* مسار الاتصال الحالي: 'local' | 'network' */
  let linkMode = 'local';
  let linkHost = 'localhost';
  /* أسماء الطابعات المحلولة فعلياً بعد الاستعلام من QZ */
  let resolved = { cashier: null, kitchen: null, at: 0, host: null };

  async function ensureQzLib() {
    if (window.qz) return;
    try {
      await loadScript('assets/js/qz-tray.min.js');
    } catch (e) {
      console.warn('[ThermalPrint] المكتبة المحلية غير متوفرة — نستخدم CDN:', e.message);
      await loadScript('https://cdn.jsdelivr.net/npm/qz-tray@2.2.6/qz-tray.min.js');
    }
  }

  async function disconnectQz() {
    try {
      if (window.qz && qz.websocket && qz.websocket.isActive()) {
        await qz.websocket.disconnect();
      }
    } catch (e) {}
  }

  /* اتصال بـ QZ على مضيف واحد (localhost أو IP الشبكة) */
  async function connectHost(host, force) {
    await ensureQzLib();
    setupSecurity();
    if (qz.websocket.isActive()) {
      /* إن كنا متصلين بمضيف آخر — اقطع وأعد */
      const cur = (linkHost || '').toLowerCase();
      const want = String(host || 'localhost').toLowerCase();
      if (cur === want || (want === 'localhost' && (cur === 'localhost' || cur === '127.0.0.1' || cur === 'localhost.qz.io'))) {
        return true;
      }
      await disconnectQz();
    }
    const opts = force === true
      ? { host: host, retries: 2, delay: 1 }
      : { host: host, retries: 1, delay: 1 };
    /* QZ يقبل host كنص أو مصفوفة — نمرّر مضيفاً واحداً صريحاً */
    await qz.websocket.connect(opts);
    linkHost = host;
    linkMode = (host === 'localhost' || host === '127.0.0.1') ? 'local' : 'network';
    if (linkMode === 'network') rememberQzHost(host);
    return true;
  }

  /* استعلام الطابعات المتاحة ومطابقة المرشّحين (محلي + مشترك) */
  /* includeDetails: false = find() فقط (سريع).
     qz.printers.details() أبطأ عملية في QZ (تستعلم حالة كل طابعة،
     وإن كانت مشاركة شبكة فالاستعلام يذهب إلى الخادم فعلياً) — كانت
     تُستدعى دائماً في كل استكشاف. الآن تُستدعى عند الحاجة فقط. */
  async function listPrinterNames(includeDetails) {
    const names = [];
    const push = function (n) {
      n = String(n || '').trim();
      if (!n) return;
      if (names.some(function (x) { return x.toLowerCase() === n.toLowerCase(); })) return;
      names.push(n);
    };
    try {
      if (qz.printers && typeof qz.printers.find === 'function') {
        const found = await qz.printers.find();
        if (Array.isArray(found)) found.forEach(push);
        else if (typeof found === 'string' && found) push(found);
      }
    } catch (e) {
      console.warn('[ThermalPrint] printers.find failed:', e && e.message || e);
    }
    /* details أحياناً تكشف UNC لا يظهر في find بنفس الصيغة */
    if (includeDetails) {
      try {
        if (qz.printers && typeof qz.printers.details === 'function') {
          const det = await qz.printers.details();
          (Array.isArray(det) ? det : (det ? [det] : [])).forEach(function (d) {
            if (!d) return;
            push(d.name || d.printer || '');
          });
        }
      } catch (e2) {}
    }
    return names;
  }

  /* ── تصنيف اسم الطابعة: مشاركة شبكة أم محلي ──
     أشكال الشبكة التي يُرجعها ويندوز/QZ:
       - RONGTA … على SERVER
       - RONGTA … on SERVER
       - \\SERVER\RONGTA 80mm 2          ← ظهر في الكونسول للمطبخ
       - \\SERVER\RONGTA80mm2
     الاسم القصير بدون لاحقة = تعريف محلي (USB أو نسخة محلية) */
  function isNetworkPrinterName(name) {
    const s = String(name || '').trim();
    if (!s) return false;
    /* UNC: \\SERVER\share أو //SERVER/share */
    if (/^[\/\\]{2}[^\/\\]+[\/\\]/.test(s)) return true;
    if (/^[\/\\]{2}/.test(s)) return true;
    if (/\sعلى\s+\S+/i.test(s)) return true;
    if (/\son\s+\S+/i.test(s)) return true;
    return false;
  }
  /* استخرج اسم المشاركة من UNC أو أزل «على/on …» */
  function uncShareName(name) {
    const s = String(name || '').trim();
    const m = s.match(/^[\/\\]{2}[^\/\\]+[\/\\]+(.+)$/);
    return m ? String(m[1] || '').trim() : '';
  }
  function stripShareSuffix(s) {
    let x = String(s || '').trim();
    const share = uncShareName(x);
    if (share) x = share;
    else {
      x = x.replace(/^[\/\\]{2}[^\/\\]+[\/\\]+/, '');
      x = x.replace(/\s*على\s+\S+\s*$/i, '');
      x = x.replace(/\s*on\s+\S+\s*$/i, '');
    }
    return x.replace(/\s+/g, ' ').trim();
  }
  function normPrinter(s) {
    return stripShareSuffix(s).toLowerCase().replace(/[\s_\-]+/g, '');
  }

  /* هل هذا الاسم ينتمي لدور الكاشير / المطبخ؟ */
  function roleOfName(name) {
    const raw = String(name || '');
    const n = normPrinter(raw);
    if (!n) return null;
    /* مطبخ: Series أو 80mm1 */
    if (/series/i.test(raw) || /series/i.test(n) || /80mm1/.test(n) || /80mmseries/.test(n)) return 'kitchen';
    /* كاشير: 80mm2 أو rongta بلا series */
    if (/80mm2/.test(n) || (/rongta/.test(n) && !/series/i.test(n))) return 'cashier';
    return null;
  }

  function candidatesWantRole(candidates) {
    let kitchen = false, cashier = false;
    (candidates || []).forEach(function (c) {
      const raw = String(c || '');
      const n = normPrinter(raw);
      if (/series/i.test(raw) || /series/i.test(n) || /80mm1/.test(n) || /80mmseries/.test(n)) kitchen = true;
      else if (/80mm2/.test(n)) cashier = true;
      else if (/rongta/.test(n) && !/series/i.test(n) && !/80mm1/.test(n)) cashier = true;
    });
    if (kitchen && !cashier) return 'kitchen';
    if (cashier && !kitchen) return 'cashier';
    return null;
  }

  function nameMatchesCandidates(name, candidates) {
    if (!candidates || !candidates.length) return false;
    const key = String(name).trim().toLowerCase();
    const base = stripShareSuffix(name).toLowerCase();
    const nrm = normPrinter(name);
    const share = uncShareName(name);
    const nameRole = roleOfName(name);
    const want = candidatesWantRole(candidates);
    if (want && nameRole && want !== nameRole) return false;

    for (let i = 0; i < candidates.length; i++) {
      const c = String(candidates[i] || '').trim();
      if (!c) continue;
      if (key === c.toLowerCase()) return true;
      if (base && base === stripShareSuffix(c).toLowerCase()) return true;
      if (share && share.toLowerCase() === c.toLowerCase()) return true;
      if (share && stripShareSuffix(share).toLowerCase() === stripShareSuffix(c).toLowerCase()) return true;
      if (nrm && nrm === normPrinter(c)) return true;
      const cn = normPrinter(c);
      if (cn.length >= 8 && nrm.length >= 8 && (nrm.indexOf(cn) >= 0 || cn.indexOf(nrm) >= 0)) return true;
    }
    if (want && nameRole === want) return true;
    return false;
  }

  /* تفاصيل المنفذ من QZ إن توفّرت (USB = محلي حي) */
  async function printerDetailsMap() {
    const map = {};
    try {
      if (!(qz.printers && typeof qz.printers.details === 'function')) return map;
      /* details() بطيئة — وكانت تُستدعى مرتين في الاستكشاف الواحد
         (مرة في listPrinterNames ومرة هنا). نعيد استخدام النتيجة نفسها
         إن كانت حديثة (٥ ثوانٍ) فنوفر جولة شبكة كاملة. */
      let det = null;
      if (lastDetails && (Date.now() - lastDetailsAt) < 5000) det = lastDetails;
      else { det = await qz.printers.details(); lastDetails = det; lastDetailsAt = Date.now(); }
      (Array.isArray(det) ? det : (det ? [det] : [])).forEach(function (d) {
        if (!d) return;
        (map[d.name] = map[d.name] || d);
        if (d.printer) map[d.printer] = d;
      });
    } catch (e) {}
    return map;
  }

  function isUsbLive(detail) {
    if (!detail) return false;
    const blob = JSON.stringify(detail).toLowerCase();
    if (/\busb\b/.test(blob)) return true;
    if (detail.connection && /usb/i.test(String(detail.connection))) return true;
    if (detail.port && /usb/i.test(String(detail.port))) return true;
    return false;
  }
  function isDetailNetwork(detail) {
    if (!detail) return false;
    const blob = JSON.stringify(detail).toLowerCase();
    if (/\bnetwork\b|\bwsd\b|\btcp\b|\bip_?\b|\bshared\b|\bremote\b|\bunc\b/.test(blob)) return true;
    if (detail.connection && /network|tcp|wsd|smb|unc/i.test(String(detail.connection))) return true;
    return false;
  }

  /*
    اختيار اسم الدور — من كونسول الجهاز الثاني:
      cashier كان: RONGTA 80mm 2          ← قصير محلي (لا يطبع عبر الشبكة)
      kitchen كان: \\SERVER\RONGTA …     ← UNC شبكة (يطبع)
    القاعدة: إن وُجد أي اسم شبكة للدور (UNC / على …) يُفضَّل على القصير
    ما لم يكن هناك USB حي لنفس الدور.
  */
  function pickBestForRole(available, candidates, detailsMap) {
    const matches = [];
    (available || []).forEach(function (nm) {
      if (!nm || /fax/i.test(String(nm))) return;
      if (!nameMatchesCandidates(nm, candidates)) return;
      const d = (detailsMap && (detailsMap[nm] || detailsMap[String(nm).toLowerCase()])) || null;
      /* الشبكة من الاسم (UNC/على) أولاً — لا تُلغى حتى لو details قالت USB على الاسم القصير */
      const byNameNet = isNetworkPrinterName(nm);
      const usb = !byNameNet && isUsbLive(d);
      const net = byNameNet || (!usb && isDetailNetwork(d));
      matches.push({ name: nm, network: !!net, usb: !!usb, byNameNet: !!byNameNet });
    });
    if (!matches.length) return null;

    /* 1) إن وُجد أي مسار شبكة للدور — فضّله دائماً (يحل: كاشير قصير + مطبخ \\SERVER) */
    const nets = matches.filter(function (m) { return m.network || m.byNameNet; });
    if (nets.length) {
      const unc = nets.find(function (m) { return /^[\/\\]{2}/.test(String(m.name).trim()); });
      if (unc) return unc.name;
      const arabic = nets.find(function (m) { return /\sعلى\s+/i.test(String(m.name)) || /\son\s+/i.test(String(m.name)); });
      if (arabic) return arabic.name;
      return nets[0].name;
    }

    /* 2) لا شبكة: USB حي إن وُجد (الجهاز الموصول مباشرة) */
    const usbHit = matches.find(function (m) { return m.usb; });
    if (usbHit) return usbHit.name;

    /* 3) محلي بالاسم القصير */
    return matches[0].name;
  }

  /* توافق خلفي: matchName يُستخدم إن استُدعي من خارج */
  function matchName(available, candidates) {
    return pickBestForRole(available, candidates, {});
  }

  /* من اسم شبكة مثل \\SERVER\RONGTA … أو «… على SERVER» استخرج بادئة الخادم */
  function networkServerPrefix(name) {
    const s = String(name || '').trim();
    const unc = s.match(/^([\/\\]{2}[^\/\\]+[\/\\])/);
    if (unc) return unc[1].replace(/\//g, '\\');
    const ar = s.match(/\sعلى\s+(\S+)\s*$/i);
    if (ar) return '\\\\' + ar[1] + '\\';
    const en = s.match(/\son\s+(\S+)\s*$/i);
    if (en) return '\\\\' + en[1] + '\\';
    return '';
  }

  /* إن وُجدت طابعة شبكة لدور واحد فقط: ابنِ مسار UNC للدور الآخر من اسمه القصير + نفس الخادم
     (الكونسول: kitchen=\\SERVER\Series… يطبع، cashier=RONGTA 80mm 2 لا — لأن UNC الكاشير قد لا يظهر في find) */
  function synthesizeNetworkName(shortName, serverPrefix) {
    if (!shortName || !serverPrefix) return null;
    if (isNetworkPrinterName(shortName)) return shortName;
    const base = stripShareSuffix(shortName) || shortName;
    const pref = serverPrefix.endsWith('\\') ? serverPrefix : serverPrefix + '\\';
    return pref + base;
  }

  /* الأسماء المحلولة تُحفظ في ذاكرة الجهاز: عند إعادة فتح الصفحة — أو
     عند كل فاتورة — لا حاجة لإعادة الاستكشاف من الصفر. */
  function saveResolved() {
    try {
      if (!resolved.cashier && !resolved.kitchen) return;
      localStorage.setItem(PRINTER_LS, JSON.stringify({
        cashier: resolved.cashier || null,
        kitchen: resolved.kitchen || null,
        host: resolved.host || linkHost || '',
        at: resolved.at || 0,
      }));
    } catch (e) {}
  }
  function invalidateResolved() {
    resolved = { cashier: null, kitchen: null, at: 0, host: '', available: [] };
    lastDetails = null; lastDetailsAt = 0;
    try { localStorage.removeItem(PRINTER_LS); } catch (e) {}
  }
  /* استرجاع ما حُفظ عند تحميل الملف */
  (function restoreResolved() {
    try {
      const raw = localStorage.getItem(PRINTER_LS);
      if (!raw) return;
      const o = JSON.parse(raw);
      if (!o || (!o.cashier && !o.kitchen)) return;
      resolved = { cashier: o.cashier || null, kitchen: o.kitchen || null,
                   host: o.host || '', at: o.at || 0, available: [] };
    } catch (e) {}
  })();

  async function resolvePrinters(force) {
    /* كان الشرط يطلب حلّ الكاشير والمطبخ معاً خلال ٨ ثوانٍ — فإن كانت
       عندك طابعة واحدة (وهو الغالب) لم يتحقق الشرط أبداً فأُعيد
       الاستكشاف الكامل عند كل فاتورة. الآن: يكفي حلّ أحدهما، و١٠ دقائق. */
    if (!force && resolved.host === linkHost &&
        (resolved.cashier || resolved.kitchen) &&
        (Date.now() - (resolved.at || 0)) < RESOLVE_TTL) {
      return resolved;
    }
    /* find() أولاً (سريع)؛ فإن لم تُحل الطابعتان نلجأ لـ details() (بطيء) */
    let available = await listPrinterNames(false);
    let detailsMap = {};
    let cash = pickBestForRole(available, cashierCandidates(), detailsMap);
    let kit = pickBestForRole(available, kitchenCandidates(), detailsMap);
    if (!cash || !kit) {
      available = await listPrinterNames(true);
      detailsMap = await printerDetailsMap();
      cash = pickBestForRole(available, cashierCandidates(), detailsMap) || cash;
      kit  = pickBestForRole(available, kitchenCandidates(), detailsMap) || kit;
    }

    const cashNet = cash && isNetworkPrinterName(cash);
    const kitNet = kit && isNetworkPrinterName(kit);
    /* إن أحدهما شبكة والآخر لا — أكمل الناقص بنفس الخادم */
    if (kitNet && cash && !cashNet) {
      const pref = networkServerPrefix(kit);
      const syn = synthesizeNetworkName(cash, pref);
      if (syn) {
        console.info('[ThermalPrint] synthesize cashier network:', syn, 'from kitchen', kit);
        cash = syn;
      }
    } else if (cashNet && kit && !kitNet) {
      const pref = networkServerPrefix(cash);
      const syn = synthesizeNetworkName(kit, pref);
      if (syn) {
        console.info('[ThermalPrint] synthesize kitchen network:', syn, 'from cashier', cash);
        kit = syn;
      }
    } else if (!cashNet && !kitNet) {
      /* لا شبكة في الاختيار لكن القائمة فيها UNC — حاول التقاط أي \\SERVER\ */
      let pref = '';
      (available || []).forEach(function (n) {
        if (!pref && isNetworkPrinterName(n)) pref = networkServerPrefix(n);
      });
      if (pref) {
        if (cash) {
          const syn = synthesizeNetworkName(cash, pref);
          if (syn) cash = syn;
        }
        if (kit) {
          const syn = synthesizeNetworkName(kit, pref);
          if (syn) kit = syn;
        }
      }
    }

    resolved = {
      cashier: cash || null,
      kitchen: kit || null,
      at: Date.now(),
      host: linkHost,
      available: available,
    };
    saveResolved();
    console.info('[ThermalPrint] resolve on', linkHost,
      '→ cashier:', resolved.cashier,
      '| kitchen:', resolved.kitchen,
      '| available:', available);
    return resolved;
  }

  /* هل هذا المضيف يخدم طابعاتنا؟ (كاشير على الأقل) */
  async function hostHasOurPrinters() {
    const r = await resolvePrinters(true);
    return !!(r.cashier || r.kitchen);
  }

  /* تبريد قصير لكل مضيف شبكي فشل: إن كان جهاز المطعم مطفأً فمحاولة
     الاتصال به تستغرق ثوانٍ، ولا معنى لتكرارها مع كل فاتورة. */
  const HOST_FAIL_TTL = 30000;
  let hostFailUntil = {};
  function hostCoolingDown(h) { return (hostFailUntil[h] || 0) > Date.now(); }
  function markHostFailed(h) { hostFailUntil[h] = Date.now() + HOST_FAIL_TTL; }
  function markHostGood(h) { delete hostFailUntil[h]; }

  async function connect(force) {
    if (force !== true && state === 'connected' && window.qz && qz.websocket.isActive()) {
      /* إن كانت الأسماء محلولة حديثاً اكتفِ */
      if (resolved.cashier || resolved.kitchen) return true;
    }
    if (force !== true && Date.now() < offlineUntil) return false;
    try {
      setState('connecting');
      await ensureQzLib();
      setupSecurity();

      /* الأسماء محفوظة من جلسة سابقة على نفس المضيف → لا استكشاف */
      const warm = force !== true && (resolved.cashier || resolved.kitchen) &&
                   resolved.host === linkHost &&
                   (Date.now() - (resolved.at || 0)) < RESOLVE_TTL;

      let ok = false;
      if (warm) {
        ok = true;
      } else {
        /* ── ١) الشبكة أولاً: QZ على جهاز المطعم حيث الطابعات ──
           الترتيب السابق كان يعكس ذلك (المحلي أولاً) فيطبع الكاشير عبر
           QZ المحلي إن وُجد ولو كانت الطابعات مشاركة من الجهاز الرئيسي.
           الآن: الشبكة مقدَّمة — فإن تعذّرت ننتقل إلى QZ المحلي. */
        const hosts = qzHostCandidates();
        for (let i = 0; i < hosts.length; i++) {
          const h = hosts[i];
          if (!h || h === 'localhost' || h === '127.0.0.1') continue;
          if (force !== true && hostCoolingDown(h)) continue;
          try {
            await connectHost(h, force === true);
            if (await hostHasOurPrinters()) { ok = true; markHostGood(h); break; }
            await disconnectQz();
          } catch (eNet) {
            console.info('[ThermalPrint] QZ على', h, 'فشل:', eNet && eNet.message || eNet);
            markHostFailed(h);
            try { await disconnectQz(); } catch (e2) {}
          }
        }

        /* ── ٢) محلي ثانياً: QZ على جهاز الكاشير نفسه ── */
        if (!ok) {
          try {
            await connectHost('localhost', force === true);
            if (await hostHasOurPrinters()) {
              ok = true;
            } else {
              console.info('[ThermalPrint] QZ محلي متصل لكن بلا طابعات مطابقة');
              if (!hosts.length) await disconnectQz();
            }
          } catch (eLocal) {
            console.info('[ThermalPrint] QZ محلي غير متاح:', eLocal && eLocal.message || eLocal);
          }
        }

        /* ── ٣) ملاذ أخير: نقبل أي اتصال ناجح حتى بلا مطابقة تامة،
              الشبكة أولاً ثم المحلي — print() يستخدم أول مرشّح. ── */
        if (!ok) {
          for (let i = 0; i < hosts.length && !ok; i++) {
            const h = hosts[i];
            if (!h || h === 'localhost' || h === '127.0.0.1') continue;
            if (force !== true && hostCoolingDown(h)) continue;
            try {
              await connectHost(h, force === true);
              await resolvePrinters(true);
              ok = !!qz.websocket.isActive();
              if (ok) markHostGood(h);
            } catch (e) { markHostFailed(h); }
          }
        }
        if (!ok) {
          try {
            await connectHost('localhost', force === true);
            await resolvePrinters(true);
            ok = !!qz.websocket.isActive();
          } catch (e) {}
        }
      }

      if (!ok) throw new Error('لا QZ شبكي ولا محلي');

      setState('connected');
      offlineCooldown = 30000; offlineUntil = 0;
      return true;
    } catch (err) {
      setState('offline');
      offlineUntil = Date.now() + offlineCooldown;
      offlineCooldown = Math.min(120000, offlineCooldown * 2);
      return false;
    }
  }

  function isActive() { return state === 'connected' && window.qz && qz.websocket.isActive(); }

  /* الاسم الفعلي للطباعة: المحلول من QZ، وإلا أول مرشّح */
  async function printerName(kind) {
    if (!isActive()) return kind === 'kitchen' ? PRINTER_KITCHEN() : PRINTER_CASHIER();
    try { await resolvePrinters(false); } catch (e) {}
    if (kind === 'kitchen') return resolved.kitchen || kitchenCandidates()[0] || PRINTER_KITCHEN();
    return resolved.cashier || cashierCandidates()[0] || PRINTER_CASHIER();
  }

  /* الوقت بنظام 12 ساعة كالفاتورة المعتمدة: 14:32 ← 2:32 PM */
  function to12h(t) {
    /* يقبل 24 ساعة (20:32 — صيغة pos.js) أو 12 ساعة مع لاحقة (8:32 PM) */
    const s = String(t || '').trim();
    const m = s.match(/^(\d{1,2}):(\d{2})/);
    if (!m) return s;
    if (/\s*[AP]M\s*$/i.test(s)) return (+m[1] % 12 || 12) + ':' + m[2] + ' ' + (/PM/i.test(s) ? 'PM' : 'AM');
    let h = +m[1]; const ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return h + ':' + m[2] + ' ' + ap;
  }

  function esc(v) { return String(v ?? '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch])); }

  /* أسماء الأصناف تُطبع كما هي في البيانات (اسم + متغير) بلا أي حذف —
     قاعدة حذف «سندويش» أُلغيت لأن المسميات نُظّفت مباشرة في المنيو */
  function cleanItemName(n) {
    return String(n ?? '').replace(/\s+/g, ' ').trim();
  }
  /* سطور اسم المادة: الأسماء الطويلة (>12 حرفاً) تُقسَّم (نوع / عائلة / متغير) —
     «صحن شاورما عربي 3سندويشات» ← 3 سطور موسّطة. القصيرة والمجهولة: سطر واحد */
  function nameLines(it) {
    const full = cleanItemName(it.name);
    const all = (window.DEMO_DATA && DEMO_DATA.items) || [];
    const item = all.find(i => i.id === it.id);
    const variant = item ? String(item.variant_clean || item.variant || '').trim() : '';
    if (!item || !variant || full.length <= 12 || !full.endsWith(variant)) return [full];
    const head = full.slice(0, -variant.length).replace(/[-–—]\s*$/, '').trim();
    const fam = String(item.family || '').trim();
    if (fam && head !== fam && head.endsWith(fam)) {
      const type = head.slice(0, -fam.length).trim();
      return type ? [type, fam, variant] : [fam, variant];
    }
    return head ? [head, variant] : [variant];
  }
  function fmtN(n) { return Number(n || 0).toLocaleString('en-US'); }

  /* تسمية نوع الطلب كما تُخزَّن في الفاتورة (dinein/takeaway/delivery/contract/أونلاين) */
  function typeLabel(inv) {
    if (inv.is_online || inv.source_order_id) return 'طلب أونلاين';
    return ({ dinein: 'طلب طاولة', table: 'طلب طاولة', takeaway: 'خارجي', delivery: 'توصيل', contract: 'عقد' })[inv.type] || 'طلب';
  }
  function payLabel(inv) {
    return ({ cash: 'نقداً', wallet: 'محفظة', partial: 'دفع جزئي', deferred: 'آجل' })[inv.pay_type] || (inv.pay_type || '');
  }

  /* ──────────────────────────────────────────────────────────────
     قالب الإيصال — بنفس تنسيق الفاتورة المعتمدة (صورة عالم الفواكه)
     وبأحجام الخطوط نفسها تماماً (thermal.fonts في config.js):

       الاسم 20 · العنوان/الهاتف 14 · «رقم الطلب:» 26 = الرقم 26
       التاريخ 13 · الزبون 14 · رؤوس الأعمدة 12.5 · الخلايا 12
       الملاحظات 11 · المجاميع 13 · شكراً 15

     الفرق عن الطبعة القديمة الطويلة: التباعد فقط — ارتفاع السطر 1.2
     بدل 1.5، وحشوات الخلايا 1.5px بدل 3-5px، وهوامش الكتل ~1مم بدل
     12px، وسحب الورق 3مم بدل 8مم. حجم الحرف نفسه لم يتغير.
     ────────────────────────────────────────────────────────────── */
  function receiptHtml(inv, opts = {}) {
    const w = WIDTH();
    const F = FONTS();
    /* رقم الفاتورة للطباعة: بلا أصفار بادئة (1، 2، 15…) — طلب العميل */
    const no = String(
      window.invoiceNo ? window.invoiceNo(inv)
        : (inv.no != null && window.displayInvoiceNo ? window.displayInvoiceNo(inv.no, inv)
          : (inv.no != null ? String(Number(inv.no)) : (inv.id || '')))
    );
    const items = inv.items || [];
    const sub = items.reduce((s, x) => s + (Number(x.price) || 0) * (Number(x.qty) || 0), 0);
    const disc = Number(inv.discount) || 0;
    const total = Number(inv.total != null ? inv.total : Math.max(0, sub - disc));

    // سطر التعريف تحت الاسم: العنوان + الهاتف (بلا كلمة «هاتف:»)
    const brand = (window.ALFA_CONFIG && window.ALFA_CONFIG.branding) || {};
    const S = SHOW();
    const subLine = S.description
      ? (CFG().brandingDescription || [brand.address, brand.phone].filter(Boolean).join(' ')).trim()
      : '';
    const addrLine = S.address ? (CFG().addressLine || '') : '';

    // سطر الزبون المدمج: الاسم الهاتف العنوان خارجي
    // (حُذف [الرقم] — كان تكراراً لرقم الطلب الظاهر أعلاه)
    const isDlv = inv.type === 'delivery';
    const cust = S.customer
      ? ([inv.customer_name, inv.phone, inv.customer_address].filter(Boolean).join(' ') + (isDlv ? ' خارجي' : ''))
      : '';
    /* التوصيل: سطر الاسم والهاتف + سطر العنوان (بقية الأنواع: سطر واحد كما هو) */
    const cust1 = S.customer ? [inv.customer_name, inv.phone].filter(Boolean).join(' ') : '';
    const cust2 = S.customer
      ? ([inv.customer_address].filter(Boolean).join(' ') + (isDlv ? ' خارجي' : '')).trim()
      : '';
    /* نوع الطلب قبل الجدول: كلمة عارية بلا عنوان (طاولة/سفري/خارجي/أونلاين) */
    const TYPE_AR = { dinein: 'طاولة', table: 'طاولة', takeaway: 'خارجي', delivery: 'خارجي', online: 'أونلاين', contract: 'عقد' };
    const typeAr = inv.source === 'online' ? 'أونلاين' : (inv.type === 'dinein' ? '' : (TYPE_AR[inv.type] || ''));

    /* خلايا بحدود كاملة كالصورة + التفاف النص داخل الخلايا حتى لا تتمدد
       الأسماء والملاحظات الطويلة خارج الجدول */
    /* التفاف النص: الخواص الثلاث معاً — القديمة (word-wrap) لمحرك QZ/JavaFX
       القديم الذي لا يعرف overflow-wrap الحديثة، وwhite-space:normal صراحةً */
    const WRAP = 'white-space:normal;word-wrap:break-word;word-break:break-word;overflow-wrap:break-word;';
    const TD = `border:1px solid #000;padding:1.5px 1px;font-size:${F.td}px;line-height:1.2;font-weight:bold;${WRAP}`;
    const TH = `border:1px solid #000;padding:1.5px 1px;font-size:${F.th}px;line-height:1.2;font-weight:900;${WRAP}`;

    /* عمود الملاحظات موجود في النسختين — كاشير ومطبخ بنفس الشكل تماماً */
    /* صفوف الخدمات: طاولة / توصيل — تُطبع فقط عند وجود قيمة (> 0)،
       وتُستثنى من نسخة المطبخ. التوافق القديم: service_fee وحيد حسب النوع */
    const svcT = Number(inv.service_table != null ? inv.service_table : (inv.discount_detail || {}).service_table) || 0;
    const svcD = Number(inv.service_delivery != null ? inv.service_delivery : (inv.discount_detail || {}).service_delivery) || 0;
    const svcRowFor = (label, amt) => `\n        <tr>
          <td style="${TD}text-align:center;font-size:${F.name || F.td}px;">${label}</td>
          <td style="${TD}text-align:center;">1.00</td>
          <td style="${TD}text-align:center;">${fmtN(amt)}</td>
          <td style="${TD}text-align:center;">${fmtN(amt)}</td>
          <td style="${TD}text-align:center;font-weight:normal;font-size:${F.itemNote || F.note}px;"></td>
        </tr>`;
    let svcRows = '';
    if (!opts.kitchen && !items.some(x => x.is_service)) {
      if (svcT > 0 || inv.type === 'dinein' || inv.type === 'table') svcRows += svcRowFor('خدمة طاولة', svcT);
      if (svcD > 0 || inv.type === 'delivery') svcRows += svcRowFor('خدمة توصيل', svcD);
      if (!svcRows) {
        const fee = Number(inv.service_fee) || 0;
        if (fee > 0 && (inv.type === 'delivery' || inv.type === 'table' || inv.type === 'dinein'))
          svcRows = svcRowFor(inv.type === 'delivery' ? 'خدمة توصيل' : 'خدمة طاولة', fee);
      }
    }
    const svcTotal = svcT + svcD;

    /* ملاحظات الصنف: توضع كاملة داخل خلية «ملاحظات» في نفس صف الصنف.
       (سابقاً: الملاحظة الأطول من 10 أحرف كانت تُنقل إلى سطر منفصل تحت
       الصنف بـ colspan=5 — مرفوض؛ الخلية تلتفّ تلقائياً فلا داعي له.) */
    const rows = items.map(it => {
      const note = String(it.note || '').trim();
      const nm = nameLines(it);
      const nameCell = nm.map((ln, ix) => `${ix === 0 && it.offer_id ? '🎟️ ' : ''}${ix === 0 && it.is_free ? '🎁 ' : ''}${esc(ln)}`).join('<br>');
      return `<tr>
          <td style="${TD}text-align:center;font-size:${F.name || F.td}px;">${nameCell}</td>
          <td style="${TD}text-align:center;">${it.weight_label ? esc(it.weight_label) : (Number(it.qty) || 1).toFixed(2)}</td>
          <td style="${TD}text-align:center;">${fmtN(it.price)}</td>
          <td style="${TD}text-align:center;">${fmtN((Number(it.price) || 0) * (Number(it.qty) || 1))}</td>
          <td style="${TD}text-align:center;font-weight:normal;font-size:${F.itemNote || F.note}px;">${esc(note)}</td>
         </tr>`;
    }).join('');

    /* رؤوس الأعمدة: خط أصغر وخط فاصل أسفلها أثقل لشكل أنظف — 5 أعمدة دائماً */
    const HB = 'border-bottom:2px solid #000;';
    /* عروض الأعمدة — النسبة من عرض الجدول (عرض الجدول نفسه ثابت: 100% - 1مم).
       العمود الأول «اسم المادة» مُوَسَّع على حساب البقية بأمر صاحب المطعم:
       أسماء الأصناف طويلة فكانت تُلتفّ من سطرين. عدّل من config.js
       ← thermal.cols، والمجموع يجب أن يبقى 100. */
    const C = COLS();
    const headCols = `<th style="${TH}${HB}text-align:center;width:${C.name}%;">اسم المادة</th>
         <th style="${TH}${HB}text-align:center;width:${C.qty}%;">الكمية</th>
         <th style="${TH}${HB}text-align:center;width:${C.price}%;">السعر</th>
         <th style="${TH}${HB}text-align:center;width:${C.total}%;">إجمالي</th>
         <th style="${TH}${HB}text-align:center;width:${C.note}%;">ملاحظات</th>`;

    /* الترويسة (~7سم): الأسطر موزعة بتساوٍ عبر عمود مرن —
       الاسم · الاسم والهاتف · رقم الطلب كبير + نوع الطلب · التاريخ والوقت · الزبون */
    const SUM = `border:1px solid #000;padding:2px 6px;font-size:${F.sum}px;line-height:1.2;font-weight:bold;`;

    const footerTitleTxt = (S.footerTitle && CFG().footerTitle) ? String(CFG().footerTitle) : '';
    const thankTxt = (S.thankYou) ? String(CFG().thankYou || 'شكرا لزيارتكم') : '';
    const fTitleSize = Number(F.footerTitle || F.sub || 14) || 14;
    const fThanksSize = Number(F.thanks || 16) || 16;
    const footerBlock = (footerTitleTxt || thankTxt)
      ? `<div style="text-align:center;padding-bottom:${FEED()}mm;font-weight:bold;">${footerTitleTxt ? `<div style="font-size:${fTitleSize}px;">${esc(footerTitleTxt)}</div>` : ''}${thankTxt ? `<div style="font-size:${fThanksSize}px;">${esc(thankTxt)}</div>` : ''}</div>`
      : '';
    const drawBlock = (S.drawCode && inv.draw_code && !opts.kitchen)
      ? `<div style="font-size:${Math.max(10, (F.date || 12))}px;font-weight:900;text-align:center;padding:1mm 0;">رمز السحب: ${esc(inv.draw_code)}</div>`
      : '';
    const qrBlock = (S.qr && CFG().qrImageUrl)
      ? `<div style="text-align:center;padding-bottom:${FEED()}mm;"><img src="${esc(CFG().qrImageUrl)}" style="width:${QR_SIZE()}mm;height:${QR_SIZE()}mm;object-fit:contain;"></div>`
      : '';
    const logoBlock = (S.logo && CFG().logoUrl)
      ? `<div style="text-align:center;"><img src="${esc(CFG().logoUrl)}" style="max-width:35mm;max-height:${LOGO_MAX()}mm;object-fit:contain;"></div>`
      : '';
    const nameBlock = S.name
      ? `<div style="font-size:${F.title}px;font-weight:900;text-align:center;">${esc(RESTAURANT())}</div>`
      : '';
    /* إشارة التعديل: حرف m صغير بجانب رقم الطلب نفسه (بدل سطر إضافي).
       يظهر فقط عند الطباعة من شاشة الفواتير (opts.modifiedMark) لفاتورة
       طرأ عليها تعديل بعد إصدارها — الرقم نفسه لا يتغيّر. */
    const modMark = (opts.modifiedMark && S.orderNo)
      ? `<span style="font-size:${Math.max(9, Math.round((F.no || 26) * 0.5))}px;font-weight:900;">m</span>`
      : '';
    const noBlock = S.orderNo
      ? `<div style="font-size:${F.noLabel}px;font-weight:900;text-align:center;">رقم الطلب: <span style="font-size:${F.no}px;line-height:1.1;">${esc(no)}</span>${modMark}</div>`
      : '';
    const dateBlock = S.date
      ? `<div style="font-size:${F.date}px;font-weight:bold;text-align:center;">تاريخ الطلب: ${esc(inv.date || '')} ${esc(to12h(inv.time))}</div>`
      : '';
    const notesBlock = (S.orderNotes && inv.notes)
      ? `<div style="font-size:${F.note}px;font-weight:900;text-align:right;margin:0 auto 3mm;width:calc(100% - 1mm);line-height:1.3;border:0 !important;outline:0 !important;box-shadow:none !important;background:transparent !important;padding:0 !important;">ملاحظات الطلب: ${esc(inv.notes)}</div>`
      : '';

    return `
      <div style="display:flow-root;${MINH() && !opts.kitchen ? `min-height:${MINH()}mm;` : ''}width:${w}mm;max-width:${w}mm;min-width:${w}mm;margin:0 auto;padding:0;font-family:${esc(FONT_FAMILY())};color:#000;direction:rtl;text-align:right;box-sizing:border-box;line-height:1.25;background:#fff;">
        <div style="min-height:${isDlv ? 60 : 64}mm;display:flex;flex-direction:column;justify-content:space-evenly;margin:1mm 0 2mm;">
          ${logoBlock}
          ${nameBlock}
          ${subLine ? `<div style="font-size:${F.sub}px;font-weight:bold;text-align:center;">${esc(subLine)}</div>` : ''}
          ${addrLine ? `<div style="font-size:${F.address || F.sub}px;font-weight:bold;text-align:center;">${esc(addrLine)}</div>` : ''}
          ${noBlock}
          ${dateBlock}
          ${isDlv
            ? `${cust1 ? `<div style="font-size:${F.cust}px;font-weight:bold;text-align:center;">${esc(cust1)}</div>` : ''}${cust2 ? `<div style="font-size:${F.cust}px;font-weight:bold;text-align:center;">${esc(cust2)}</div>` : ''}`
            : `${cust ? `<div style="font-size:${F.cust}px;font-weight:bold;text-align:center;">${esc(cust)}</div>` : ''}`}
          ${typeAr ? `<div style="font-size:${F.date}px;font-weight:900;text-align:center;">${esc(typeAr)}</div>` : ''}
          ${inv.type === 'dinein' && inv.hall ? `<div style="font-size:14px;font-weight:900;text-align:center;">طاولة — ${esc(inv.hall)}</div>` : ''}
        </div>
        ${notesBlock}

        <table style="width:calc(100% - 1mm);border-collapse:collapse;border:1px solid #000;margin:0 auto 10mm;table-layout:fixed;">
          <thead><tr>${headCols}</tr></thead>
          <tbody>${rows}${svcRows}</tbody>
        </table>

        <table style="width:calc(100% - 1mm);border-collapse:collapse;border:1px solid #000;margin:0 auto 1mm;">
          <tr><td style="${SUM}text-align:right;padding-inline-start:12px;">مجموع الطلب</td><td style="${SUM}text-align:center;">${fmtN(sub)}</td></tr>
          <tr><td style="${SUM}text-align:right;padding-inline-start:12px;">الحسم</td><td style="${SUM}text-align:center;">${fmtN(disc)}</td></tr>
          ${svcTotal > 0 ? `<tr><td style="${SUM}text-align:right;padding-inline-start:12px;">الخدمات</td><td style="${SUM}text-align:center;">${fmtN(svcTotal)}</td></tr>` : ''}
          <tr><td style="${SUM}text-align:right;padding-inline-start:12px;">الصافي</td><td style="${SUM}text-align:center;">${fmtN(total)}</td></tr>
        </table>

        ${drawBlock}
        ${footerBlock}
        ${qrBlock}
      </div>`;
  }

  function ensureContainer() {
    let c = document.getElementById('printable-receipt');
    if (!c) { c = document.createElement('div'); c.id = 'printable-receipt'; document.body.appendChild(c); }
    return c;
  }

  /* ──────────────────────────────────────────────────────────────
     CSS الطباعة — يُحقن من config.js عند الحاجة فقط

     لماذا الحقن الديناميكي؟
       قاعدة @page عامة (لا يمكن حصرها بمحدّد) — فلو بقيت مكتوبة في
       style.css لفرضت ورق 72 مم على كل شاشة: تقارير المبيعات، Z-Report،
       كشوف الحساب… كانت تُطبع على شريط حراري ضيّق.
       لذلك تُحقن قبل window.print() مباشرة وتُزال بعده.

     وكل قواعد الإخفاء محصورة بـ html.printing-receipt حتى لا تكسر
     طباعة التقارير وكشوف الحساب في بقية الشاشات.
     ────────────────────────────────────────────────────────────── */
  /* heightMm: ارتفاع صفحة الورق.
     ملاحظة مهمة: «size: 79.2mm auto» قاعدة غير صالحة في CSS (auto لا يجوز
     طولاً ثانياً) فكان كروم يتجاهلها ويطبع على A4/Letter وتتقطع الفاتورة
     صفحاتٍ طويلة. الحل: نقيس ارتفاع الإيصال فعلياً ونحقنه طولاً صريحاً
     ⇒ صفحة واحدة بطول الفاتورة تماماً. */
  function ensurePrintCss(heightMm) {
    const w = WIDTH(), paper = PAPER();
    /* حجم الطباعة حصراً 72مم — الورق الفيزيائي 79.2مم والباقي هامش */
    const sizeCss = heightMm ? `size: ${w}mm ${heightMm}mm;` : `size: ${w}mm;`;
    let st = document.getElementById('thermal-print-css');
    if (!st) { st = document.createElement('style'); st.id = 'thermal-print-css'; document.head.appendChild(st); }
    st.textContent = `
@page { ${sizeCss} margin: 0; }
#printable-receipt { display: none; }
@media print {
  html.printing-receipt,
  html.printing-receipt body {
    width: ${w}mm !important; max-width: ${w}mm !important;
    margin: 0 !important; padding: 0 !important; background: #fff !important;
    height: auto !important; min-height: 0 !important; overflow: visible !important;
  }
  html.printing-receipt body > *:not(#printable-receipt) { display: none !important; }
  html.printing-receipt #printable-receipt {
    display: block !important; position: static !important; visibility: visible !important;
    width: ${w}mm !important; max-width: ${w}mm !important;
    margin: 0 auto !important; padding: 0 !important;
    color: #000 !important; background: #fff !important;
    page-break-before: avoid !important; page-break-after: avoid !important;
  }
  /* لا يُقصّ صف صنف بين صفحتين */
  html.printing-receipt #printable-receipt tr { page-break-inside: avoid !important; }
}`;
    return st;
  }
  function removePrintCss() {
    const st = document.getElementById('thermal-print-css');
    if (st && st.parentNode) st.parentNode.removeChild(st);
  }

  /* طباعة احتياطية عبر حوار المتصفح — مرة واحدة، مع حقن/إزالة CSS الطباعة */
  let printing = false;
  function fallbackPrint(html) {
    return new Promise(resolve => {
      if (printing) { resolve(); return; }
      printing = true;
      let finished = false;
      const cleanup = () => {
        if (finished) return;
        finished = true;
        printing = false;
        document.documentElement.classList.remove('printing-receipt');
        removePrintCss();
        window.removeEventListener('afterprint', cleanup);
        resolve();
      };
      const c = ensureContainer();
      c.innerHTML = html;
      /* قياس المدى الحقيقي للإيصال من أعلى الحاوية إلى أدنى نقطة فعلية:
         1) كان هامش عنوان المطعم (1مم) ينهار خارج جذر الإيصال (margin collapse)
            فيدفع الإيصال 1مم داخل الحاوية — عولج بـ display:flow-root في القالب.
         2) يُؤخذ أدنى نقطة لكل العناصر (لا ارتفاع الجذر وحده) لالتقاط أي تجاوز
            لصناديق الأسطر تحت آخر سطر.
         + هامش أمان 0.3مم فقط — بدل +1مم الكاملة سابقاً التي كانت تعوّض
         الانهيار جزئياً وتترك فراغاً يُسحب ورقاً بكل فاتورة. */
      const hMm = (function () {
        const top = c.getBoundingClientRect().top;
        let bottom = c.getBoundingClientRect().bottom;
        const walk = document.createTreeWalker(c, NodeFilter.SHOW_ELEMENT);
        while (walk.nextNode()) {
          const b = walk.currentNode.getBoundingClientRect().bottom;
          if (b > bottom) bottom = b;
        }
        return Math.ceil(((bottom - top) * 25.4 / 96) * 10) / 10 + 0.3;
      })();
      ensurePrintCss(hMm);
      document.documentElement.classList.add('printing-receipt');
      window.addEventListener('afterprint', cleanup);
      /* أمان: إن لم يُطلق المتصفح afterprint */
      setTimeout(cleanup, 60000);
      setTimeout(() => { try { window.print(); } catch (e) { cleanup(); } }, 100);
    });
  }

  /* الطباعة: صامتة عبر QZ إن كانت متصلة، وإلا حوار طباعة المتصفح */
  /* إرسال HTML جاهز إلى الطابعة الحرارية (كاشير/مطبخ).
     opts.withDrawer: فتح درج النقود (حصراً للفواتير، لا للتقارير). */
  async function sendToPrinter(html, opts = {}) {
    if (isActive()) {
      try {
        /* size.width = عرض الورق الفيزيائي؛ القالب نفسه عرضه widthMm ويتمركز داخله.
           size.height = الطول المقيس فعلياً (يشمل الطول الأدنى minHeightMm):
           بدونه كانت QZ تطبع طول المحتوى المرئي فقط فتُقصّ الفواتير القصيرة
           قبل الطول الثابت. +3مم هامش أمان لفروق عرض الخطوط بين المتصفح وQZ. */
        let size = { width: WIDTH() };  // عرض الطباعة 72مم حصراً على ورق 79.2مم
        try {
          const c = ensureContainer();
          c.innerHTML = html;
          const el = c.firstElementChild;
          if (el) {
            const mm = el.getBoundingClientRect().height * 25.4 / 96;
            if (mm > 10) size.height = Math.ceil(mm) + 3;
          }
        } catch (e) { console.warn('[ThermalPrint] تعذر قياس الطول — طباعة بطول تلقائي:', e); }
        const printOptions = { size, units: 'mm', margins: 0, rasterize: false, colorType: 'monochrome' };
        /* وثيقة كاملة بلا هوامش: متصفح QZ الداخلي يضيف هامش body 8px افتراضياً
           فيتجاوز المحتوى 72مم وتُقصّ حدود الجدول من الأطراف */
        const doc = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
@page { size: ${WIDTH()}mm auto; margin: 0; }
html, body { margin: 0 !important; padding: 0 !important; background: #fff; }
</style></head><body>${html}</body></html>`;
        const data = [{ type: 'pixel', format: 'html', flavor: 'plain', data: doc }];
        const pName = await printerName(opts.kitchen ? 'kitchen' : 'cashier');
        const config = qz.configs.create(pName, printOptions);
        await qz.print(config, data);
        if (opts.withDrawer && !opts.kitchen && CFG().openDrawer !== false) {
          try {
            const drawerName = await printerName('cashier');
            const drawerConfig = qz.configs.create(drawerName, { units:'in', margins:0 });
            await qz.print(drawerConfig, [{ type:'raw', format:'plain', data:'\x1B\x70\x00\x19\xFA' }]);
          } catch (drawerErr) { console.warn('[ThermalPrint] drawer failed:', drawerErr); }
        }
        return 'qz';
      } catch (err) {
        console.error('QZ print failed:', err);
        /* الاسم المحفوظ قد يكون قديماً (طابعة أُزيلت/تغيّر اسمها) —
           نُبطل الذاكرة ليُعاد الاستكشاف في المحاولة التالية مرة واحدة */
        invalidateResolved();
        /* ليُدرك الكاشير لماذا فُتح حوار المتصفح بدل الطباعة الصامتة */
        try { if (window.showToast) showToast('فشلت طباعة QZ (' + String(err && err.message || err).slice(0, 60) + ') — فُتح حوار الطباعة، اختر ورق Roll', '⚠️'); } catch (e2) {}
      }
    }
    await fallbackPrint(html);
    return 'dialog';
  }

  /* طباعة فاتورة (القالب المعتمد) — يفتح الدرج بعدها كالمعتاد */
  async function print(inv, opts = {}) {
    return sendToPrinter(receiptHtml(inv, opts), Object.assign({}, opts, { withDrawer: true }));
  }

  /* طباعة تقرير/كشف يبني قالبه بنفسه (كشف محاسبة التوصيل وغيره)
     على الطابعة الحرارية مباشرةً — بلا فتح درج. */
  async function printHtml(html, opts = {}) {
    return sendToPrinter(html, Object.assign({}, opts, { withDrawer: false }));
  }

  /* بعد كل عملية بيع: إيصال كاشير + نسخة مطبخ (حسب config.js)
     ── إصلاح: عند غياب QZ Tray كان يُفتح حوار الطباعة مرتين متتاليتين
     (نسخة كاشير + نسخة مطبخ) والحوار الثاني يكتب فوق نفس الحاوية.
     حوار المتصفح يستهدف طابعة واحدة فقط، فنطبع نسخة واحدة. ── */
  async function afterSale(inv) {
    /* قياس الزمن: من لحظة البيع حتى انتهاء آخر أمر أُرسل للطابعة.
       يُقرأ من الكونسول (F12 ← Console) لمعرفة الزمن الحقيقي على
       أجهزة المطعم — لأن الجزء الأكبر منه يقع داخل QZ Tray والطابعة. */
    const T0 = (window.performance && performance.now) ? performance.now() : Date.now();
    try {
      try { await connect(); } catch (e) {}
      if (isActive()) {
        try {
          await print(inv, {});
          if (CFG().kitchenCopy !== false) await print(inv, { kitchen: true });
          return;
        } catch (e) { console.error('[ThermalPrint] فشل الطباعة عبر QZ:', e); }
      }
      try { if (window.showToast) showToast('QZ Tray غير متصل — فُتح حوار الطباعة بنسخة واحدة · اختر ورق Roll للطابعة', '🖨️'); } catch (e) {}
      await fallbackPrint(receiptHtml(inv, {}));
    } finally {
      try {
        const T1 = (window.performance && performance.now) ? performance.now() : Date.now();
        console.info('[ThermalPrint] زمن طباعة الفاتورة (حتى انتهاء أمر الطابعة): ' + Math.round(T1 - T0) + ' ms');
      } catch (e) {}
    }
  }

  /* تسخين: يُستدعى عند فتح شاشة البيع في الخلفية، فلا تدفع أول فاتورة
     في اليوم تكلفة الاتصال والاستكشاف وحدها. */
  async function warmup() {
    try { await connect(); } catch (e) {}
    return isActive();
  }

  window.ThermalPrint = {
    connect,
    warmup,
    reconnect: () => connect(true),   // إعادة محاولة كاملة يدوياً (زر/إعدادات)
    print,
    printHtml,
    printModification: async function(inv){
      const mods = inv.modifications || [];
      const copy = Object.assign({}, inv, { items: mods.map(function(m){ return { name: (m.type || 'تعديل') + ': ' + (m.detail || ''), qty: 1, price: 0, note: 'إشعار تعديل' }; }), total: 0, notes: 'إشعار تعديل على الفاتورة ' + (inv.id || '') });
      return print(copy, { kitchen: true });
    },
    afterSale,
    receiptHtml,
    isActive,
    onStatus(fn) { if (typeof fn === 'function') handlers.push(fn); },
    state: () => state,
    linkMode: () => linkMode,
    linkHost: () => linkHost,
    printers: () => ({
      cashier: resolved.cashier || PRINTER_CASHIER(),
      kitchen: resolved.kitchen || PRINTER_KITCHEN(),
      cashierCandidates: cashierCandidates(),
      kitchenCandidates: kitchenCandidates(),
      resolved: { cashier: resolved.cashier, kitchen: resolved.kitchen, host: resolved.host },
      widthMm: WIDTH(), paperWidthMm: PAPER(), fonts: FONTS(), feedMm: FEED(),
      mode: linkMode, host: linkHost,
    }),
    sizes: () => ({ contentMm: WIDTH(), paperMm: PAPER(), feedMm: FEED() }),
    /* التوقيع المحلي (أوفلاين) — تستخدمه صفحة qz-key.html للاختبار */
    hasLocalKey: () => !!localKeyPem(),
    localSign,
    /* حفظ/قراءة مضيف QZ الشبكي (IP الجهاز الرئيسي) */
    setNetworkHost: function (ip) {
      const v = String(ip || '').trim();
      if (!v) { try { localStorage.removeItem(QZ_HOST_LS); } catch (e) {} return; }
      rememberQzHost(v);
    },
    getNetworkHost: function () { return savedQzHost() || (qzHostCandidates()[0] || ''); },
  };
})();
