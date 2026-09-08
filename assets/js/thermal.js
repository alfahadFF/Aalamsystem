/* ================================================================
   thermal.js — الطباعة الحرارية عبر QZ Tray — alfaprosys
   نفس آلية نظام الطلبات الأونلاين: شهادة موقّعة + طباعة صامتة
   على طابعتين (كاشير + مطبخ)، مع بديل حوار الطباعة عند غياب QZ.
   الأسماء والعرض قابلة للتعديل من config.js ← thermal
   ================================================================ */
(function () {
  if (window.ThermalPrint) return;

  const CFG = () => (window.ALFA_CONFIG && window.ALFA_CONFIG.thermal) || {};
  const PRINTER_CASHIER = () => CFG().printerCashier || 'RONGTA 80mm 2';
  const PRINTER_KITCHEN = () => CFG().printerKitchen || 'RONGTA 80mm Series Printer';
  const WIDTH = () => Number(CFG().widthMm) || 72;            // عرض قالب الإيصال
  const PAPER = () => Number(CFG().paperWidthMm) || WIDTH();  // عرض الورق الفيزيائي
  /* الحد الأدنى لطول الإيصال (مم) — من config.js ← thermal.minHeightMm
     فاتورة صاحب المطعم المعتمدة طولها ثابت 128مم (12.8سم) بغض النظر عن
     المحتوى؛ فإن تجاوزه المحتوى يتمدد الإيصال تلقائياً. صفر = بلا حد أدنى. */
  const MINH = () => Number(CFG().minHeightMm) || 0;
  /* أحجام الخطوط = مقاسات الفاتورة المعتمدة لدى المطعم (صورة 9/3/2026).
     عدّلها من config.js → thermal.fonts إن أراد صاحب المطعم تغييراً. */
  const FONTS = () => Object.assign({
    title: 20, sub: 12.5, noLabel: 15, no: 28, date: 12, cust: 12.5,
    th: 12.5, td: 12, note: 11, sum: 13, thanks: 15,
  }, CFG().fonts || {});
  const FEED = () => Number(CFG().feedMm) || 3;
  const RESTAURANT = () => CFG().restaurantName || 'alfaprosys';

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
    const res = await fetch('/.netlify/functions/sign', {
      method: 'POST',
      headers,
      body: JSON.stringify({ request: toSign }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error('sign failed: ' + (err.error || res.status));
    }
    const { signature } = await res.json();
    return signature;
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

  async function connect(force) {
    if (state === 'connected' && window.qz && qz.websocket.isActive()) return true;
    if (force !== true && Date.now() < offlineUntil) return false;
    try {
      setState('connecting');
      if (!window.qz) {
        // محلي أولاً (أوفلاين) — نفس نسخة CDN مضمّنة في المشروع.
        // لو غاب الملف عن السيرفر نرجع للـCDN كي لا تتعطل الطباعة الإلكترونية
        try {
          await loadScript('assets/js/qz-tray.min.js');
        } catch (e) {
          console.warn('[ThermalPrint] المكتبة المحلية غير متوفرة — نستخدم CDN:', e.message);
          await loadScript('https://cdn.jsdelivr.net/npm/qz-tray@2.2.6/qz-tray.min.js');
        }
      }
      setupSecurity();
      if (!qz.websocket.isActive()) await qz.websocket.connect(force === true ? { retries: 3, delay: 2 } : { retries: 1, delay: 1 });
      setState('connected');
      offlineCooldown = 30000; offlineUntil = 0;
      return true;
    } catch (err) {
      setState('offline');
      offlineUntil = Date.now() + offlineCooldown;              // لا تُهدر وقت الكاشير في المحاولات
      offlineCooldown = Math.min(120000, offlineCooldown * 2);  // تصاعديًا حتى دقيقتين
      return false;
    }
  }

  function isActive() { return state === 'connected' && window.qz && qz.websocket.isActive(); }

  /* الوقت بنظام 12 ساعة كالفاتورة المعتمدة: 14:32 ← 2:32 PM */
  function to12h(t) {
    const m = String(t || '').trim().match(/^(\d{1,2}):(\d{2})/);
    if (!m) return String(t || '');
    let h = +m[1]; const ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return h + ':' + m[2] + ' ' + ap;
  }

  function esc(v) { return String(v ?? '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch])); }

  /* حذف كلمة «سندويش» بكل صيغها من أسماء الأصناف في الفاتورة (طلب صاحب المطعم):
     بطاطا سندويشة عادي ← بطاطا عادي · شاورما سندويش كبير ← شاورما كبير
     صحن سندويشتين ← صحن 2 · صحن 3سندويشات ← صحن 3 · صحن 4 سندويشات ← صحن 4 */
  function cleanItemName(n) {
    return String(n ?? '')
      .split(/\s+/)
      .map(w => w === 'سندويشتين' ? '2'
        : w.replace(/سندويشات$/, '').replace(/سندويشة$/, '').replace(/سندويش$/, ''))
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  function fmtN(n) { return Number(n || 0).toLocaleString('en-US'); }

  /* تسمية نوع الطلب كما تُخزَّن في الفاتورة (dinein/takeaway/delivery/contract/أونلاين) */
  function typeLabel(inv) {
    if (inv.is_online || inv.source_order_id) return 'طلب أونلاين';
    return ({ dinein: 'طلب طاولة', table: 'طلب طاولة', takeaway: 'سفري', delivery: 'توصيل', contract: 'عقد' })[inv.type] || 'طلب';
  }
  function payLabel(inv) {
    return ({ cash: 'نقداً', wallet: 'محفظة', partial: 'دفع جزئي', deferred: 'آجل' })[inv.pay_type] || (inv.pay_type || '');
  }

  /* ──────────────────────────────────────────────────────────────
     قالب الإيصال — بنفس تنسيق الفاتورة المعتمدة (صورة عالم الفواكه)
     وبأحجام الخطوط نفسها تماماً (thermal.fonts في config.js):

       الاسم 20 · العنوان/الهاتف 14 · «رقم الطلب:» 15 والرقم 28
       التاريخ 13 · الزبون 14 · رؤوس الأعمدة 12.5 · الخلايا 12
       الملاحظات 11 · المجاميع 13 · شكراً 15

     الفرق عن الطبعة القديمة الطويلة: التباعد فقط — ارتفاع السطر 1.2
     بدل 1.5، وحشوات الخلايا 1.5px بدل 3-5px، وهوامش الكتل ~1مم بدل
     12px، وسحب الورق 3مم بدل 8مم. حجم الحرف نفسه لم يتغير.
     ────────────────────────────────────────────────────────────── */
  function receiptHtml(inv, opts = {}) {
    const w = WIDTH();
    const F = FONTS();
    /* رقم الفاتورة بلا أصفار بادئة (طلب صاحب المطعم): 001 ← 1 */
    const no = String(window.invoiceNo ? window.invoiceNo(inv) : (inv.no != null ? inv.no : (inv.id || '')))
      .replace(/^0+(?=\d)/, '');
    const items = inv.items || [];
    const sub = items.reduce((s, x) => s + (Number(x.price) || 0) * (Number(x.qty) || 0), 0);
    const disc = Number(inv.discount) || 0;
    const total = Number(inv.total != null ? inv.total : Math.max(0, sub - disc));

    // سطر التعريف تحت الاسم: العنوان + الهاتف (بلا كلمة «هاتف:»)
    const brand = (window.ALFA_CONFIG && ALFA_CONFIG.branding) || {};
    const subLine = [brand.address, brand.phone].filter(Boolean).join(' ');

    // سطر الزبون المدمج: الاسم الهاتف العنوان خارجي
    // (حُذف [الرقم] — كان تكراراً لرقم الطلب الظاهر أعلاه)
    const cust = [inv.customer_name, inv.phone, inv.customer_address].filter(Boolean).join(' ')
      + (inv.type === 'delivery' ? ' خارجي' : '');

    /* خلايا بحدود كاملة كالصورة + التفاف النص داخل الخلايا حتى لا تتمدد
       الأسماء والملاحظات الطويلة خارج الجدول */
    /* التفاف النص: الخواص الثلاث معاً — القديمة (word-wrap) لمحرك QZ/JavaFX
       القديم الذي لا يعرف overflow-wrap الحديثة، وwhite-space:normal صراحةً */
    const WRAP = 'white-space:normal;word-wrap:break-word;word-break:break-word;overflow-wrap:break-word;';
    const TD = `border:1px solid #000;padding:1.5px 1px;font-size:${F.td}px;line-height:1.2;font-weight:bold;${WRAP}`;
    const TH = `border:1px solid #000;padding:1.5px 1px;font-size:${F.th}px;line-height:1.2;font-weight:900;${WRAP}`;

    /* عمود الملاحظات موجود في النسختين — كاشير ومطبخ بنفس الشكل تماماً */
    const rows = items.map(it => {
      const note = String(it.note || '').trim();
      const inline = note.length <= 10 ? note : '';
      let h = `<tr>
          <td style="${TD}text-align:right;">${it.offer_id ? '🎟️ ' : ''}${it.is_free ? '🎁 ' : ''}${esc(cleanItemName(it.name))}</td>
          <td style="${TD}text-align:center;">${(Number(it.qty) || 1).toFixed(2)}</td>
          <td style="${TD}text-align:center;">${fmtN(it.price)}</td>
          <td style="${TD}text-align:center;">${fmtN((Number(it.price) || 0) * (Number(it.qty) || 1))}</td>`
        + `\n          <td style="${TD}text-align:center;font-weight:normal;font-size:${F.note}px;">${esc(inline)}</td>`
        + `\n         </tr>`;
      if (note.length > 10) h += `<tr><td colspan="5" style="${TD}text-align:right;font-weight:normal;font-size:${F.note}px;">▸ ${esc(note)}</td></tr>`;
      return h;
    }).join('');

    /* رؤوس الأعمدة: خط أصغر وخط فاصل أسفلها أثقل لشكل أنظف — 5 أعمدة دائماً */
    const HB = 'border-bottom:2px solid #000;';
    /* عروض الأعمدة مقيسة من فاتورة العميل نفسها (مواضع الأرقام): اسم المادة ≈
       الإجمالي ≈ الملاحظات ≈ 22.7% لكل منها، الكمية 15%، السعر 17% */
    const headCols = `<th style="${TH}${HB}text-align:center;width:22%;">اسم المادة</th>
         <th style="${TH}${HB}text-align:center;width:15%;">الكمية</th>
         <th style="${TH}${HB}text-align:center;width:18%;">السعر</th>
         <th style="${TH}${HB}text-align:center;width:22.5%;">إجمالي</th>
         <th style="${TH}${HB}text-align:center;width:22.5%;">ملاحظات</th>`;

    /* الترويسة (~7سم): الأسطر موزعة بتساوٍ عبر عمود مرن —
       الاسم · الاسم والهاتف · رقم الطلب كبير + نوع الطلب · التاريخ والوقت · الزبون */
    const SUM = `border:1px solid #000;padding:2px 6px;font-size:${F.sum}px;line-height:1.2;font-weight:bold;`;

    return `
      <div style="display:flow-root;${MINH() && !opts.kitchen ? `min-height:${MINH()}mm;` : ''}width:${w}mm;max-width:${w}mm;min-width:${w}mm;margin:0 auto;padding:0;font-family:Tahoma,Arial,sans-serif;color:#000;direction:rtl;text-align:right;box-sizing:border-box;line-height:1.25;background:#fff;">
        <div style="min-height:64mm;display:flex;flex-direction:column;justify-content:space-evenly;margin:1mm 0 2mm;">
          <div style="font-size:${F.title}px;font-weight:900;text-align:center;">${esc(RESTAURANT())}</div>
          ${subLine ? `<div style="font-size:${F.sub}px;font-weight:bold;text-align:center;">${esc(subLine)}</div>` : ''}
          <div style="font-size:${F.noLabel}px;font-weight:900;text-align:center;">رقم الطلب: <span style="font-size:${F.no}px;line-height:1.1;">${esc(no)}</span> — ${esc(typeLabel(inv))}</div>
          <div style="font-size:${F.date}px;font-weight:bold;text-align:center;">تاريخ الطلب: ${esc(inv.date || '')} ${esc(to12h(inv.time))}</div>
          ${cust ? `<div style="font-size:${F.cust}px;font-weight:bold;text-align:center;">${esc(cust)}</div>` : ''}
        </div>

        <table style="width:100%;border-collapse:collapse;border:1px solid #000;margin-bottom:10mm;table-layout:fixed;">
          <thead><tr>${headCols}</tr></thead>
          <tbody>${rows}</tbody>
        </table>

        <table style="width:100%;border-collapse:collapse;border:1px solid #000;margin-bottom:1mm;">
          <tr><td style="${SUM}text-align:right;padding-inline-start:12px;">مجموع الطلب</td><td style="${SUM}text-align:center;">${fmtN(sub)}</td></tr>
          <tr><td style="${SUM}text-align:right;padding-inline-start:12px;">الحسم</td><td style="${SUM}text-align:center;">${fmtN(disc)}</td></tr>
          <tr><td style="${SUM}text-align:right;padding-inline-start:12px;">الصافي</td><td style="${SUM}text-align:center;">${fmtN(total)}</td></tr>
        </table>

        <div style="font-size:${F.thanks}px;font-weight:bold;text-align:center;padding-bottom:${FEED()}mm;">شكرا لزيارتكم</div>
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
  async function print(inv, opts = {}) {
    const html = receiptHtml(inv, opts);
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
        const data = [{ type: 'pixel', format: 'html', flavor: 'plain', data: html }];
        const config = qz.configs.create(opts.kitchen ? PRINTER_KITCHEN() : PRINTER_CASHIER(), printOptions);
        await qz.print(config, data);
        return 'qz';
      } catch (err) {
        console.error('QZ print failed:', err);
        /* ليُدرك الكاشير لماذا فُتح حوار المتصفح بدل الطباعة الصامتة */
        try { if (window.showToast) showToast('فشلت طباعة QZ (' + String(err && err.message || err).slice(0, 60) + ') — فُتح حوار الطباعة، اختر ورق Roll', '⚠️'); } catch (e2) {}
      }
    }
    await fallbackPrint(html);
    return 'dialog';
  }

  /* بعد كل عملية بيع: إيصال كاشير + نسخة مطبخ (حسب config.js)
     ── إصلاح: عند غياب QZ Tray كان يُفتح حوار الطباعة مرتين متتاليتين
     (نسخة كاشير + نسخة مطبخ) والحوار الثاني يكتب فوق نفس الحاوية.
     حوار المتصفح يستهدف طابعة واحدة فقط، فنطبع نسخة واحدة. ── */
  async function afterSale(inv) {
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
  }

  window.ThermalPrint = {
    connect,
    reconnect: () => connect(true),   // إعادة محاولة كاملة يدوياً (زر/إعدادات)
    print,
    afterSale,
    receiptHtml,
    isActive,
    onStatus(fn) { if (typeof fn === 'function') handlers.push(fn); },
    state: () => state,
    printers: () => ({ cashier: PRINTER_CASHIER(), kitchen: PRINTER_KITCHEN(), widthMm: WIDTH(), paperWidthMm: PAPER(), fonts: FONTS(), feedMm: FEED() }),
    sizes: () => ({ contentMm: WIDTH(), paperMm: PAPER(), feedMm: FEED() }),
    /* التوقيع المحلي (أوفلاين) — تستخدمه صفحة qz-key.html للاختبار */
    hasLocalKey: () => !!localKeyPem(),
    localSign,
  };
})();
