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
  const WIDTH = () => Number(CFG().widthMm) || 72;
  const RESTAURANT = () => CFG().restaurantName || 'alfaprosys';

  /* ── الشهادة العامة فقط — تُوضع في config.js أو متغير بيئة
     المفتاح الخاص لا يُوضع هنا أبداً — التوقيع يتم سيرفرياً
     عبر netlify/functions/sign.js ── */
  const CERT = () => (window.ALFA_CONFIG && window.ALFA_CONFIG.thermal && window.ALFA_CONFIG.thermal.qzCert) || '';

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

  /* التوقيع سيرفرياً عبر Netlify Function — المفتاح الخاص لا يغادر السيرفر */
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

  function setupSecurity() {
    const cert = CERT();
    if (!cert) {
      console.warn('[ThermalPrint] qzCert غير مضبوط في config.js — أضف الشهادة العامة لـ ALFA_CONFIG.thermal.qzCert');
    }
    qz.security.setCertificatePromise(resolve => resolve(cert));
    qz.security.setSignatureAlgorithm('SHA512');
    /* التوقيع يُرسَل لـ Netlify Function ولا يتم محلياً أبداً */
    qz.security.setSignaturePromise(toSign => (resolve, reject) => {
      serverSign(toSign).then(resolve).catch(reject);
    });
  }

  async function connect() {
    if (state === 'connected' && window.qz && qz.websocket.isActive()) return true;
    try {
      setState('connecting');
      if (!window.qz) {
        // jsrsasign لم تعد مطلوبة (التوقيع سيرفري) — نحمّل qz-tray فقط
        await loadScript('https://cdn.jsdelivr.net/npm/qz-tray@2.2.6/qz-tray.min.js');
      }
      setupSecurity();
      if (!qz.websocket.isActive()) await qz.websocket.connect({ retries: 3, delay: 2 });
      setState('connected');
      return true;
    } catch (err) {
      setState('offline');
      return false;
    }
  }

  function isActive() { return state === 'connected' && window.qz && qz.websocket.isActive(); }

  function esc(v) { return String(v ?? '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch])); }
  function fmtN(n) { return Number(n || 0).toLocaleString('en-US'); }

  /* تسمية نوع الطلب كما تُخزَّن في الفاتورة (dinein/takeaway/delivery/contract/أونلاين) */
  function typeLabel(inv) {
    if (inv.is_online || inv.source_order_id) return 'طلب أونلاين';
    return ({ dinein: 'طلب طاولة', table: 'طلب طاولة', takeaway: 'سفري', delivery: 'توصيل', contract: 'عقد' })[inv.type] || 'طلب';
  }
  function payLabel(inv) {
    return ({ cash: 'نقداً', wallet: 'محفظة', partial: 'دفع جزئي', deferred: 'آجل' })[inv.pay_type] || (inv.pay_type || '');
  }

  /* قالب الإيصال — يطابق الفاتورة الحقيقية (عرض 72مم)
     الترويسة: الاسم + سطر (العنوان الهاتف) + رقم الطلب + التاريخ + سطر الزبون المدمج
     الجدول: اسم المادة | الكمية | السعر | إجمالي | ملاحظات  (عمود الملاحظات ظاهر دائماً)
     الكمية بمنزلتين عشريتين، والتذييل: مجموع الطلب / الحسم / الصافي */
  function receiptHtml(inv, opts = {}) {
    const w = WIDTH();
    const kitchen = !!opts.kitchen;
    const no = window.invoiceNo ? window.invoiceNo(inv) : String(inv.no != null ? inv.no : (inv.id || ''));
    const items = inv.items || [];
    const sub = items.reduce((s, x) => s + (Number(x.price) || 0) * (Number(x.qty) || 0), 0);
    const disc = Number(inv.discount) || 0;
    const total = Number(inv.total != null ? inv.total : Math.max(0, sub - disc));

    // سطر التعريف تحت الاسم: العنوان + الهاتف (بلا كلمة «هاتف:»)
    const brand = (window.ALFA_CONFIG && ALFA_CONFIG.branding) || {};
    const subLine = [brand.address, brand.phone].filter(Boolean).join(' ');

    // سطر الزبون المدمج
    const cust = [inv.customer_name, inv.phone, inv.customer_address].filter(Boolean).join(' ')
      + (inv.type === 'delivery' ? ' خارجي' : '')
      + (inv.no != null ? ` [${inv.no}]` : '');

    const rows = items.filter(it => !(kitchen && it.offer_disc)).map(it => kitchen
      ? `<tr>
          <td style="border:1px solid #000;padding:3px 2px;text-align:right;font-weight:bold;font-size:12px;">${it.is_free ? '🎁 ' : ''}${esc(it.name)}</td>
          <td style="border:1px solid #000;padding:3px 2px;text-align:center;font-weight:bold;font-size:12px;">${(Number(it.qty) || 1).toFixed(2)}</td>
          <td style="border:1px solid #000;padding:3px 2px;text-align:center;font-size:11px;">${esc(it.note || '')}</td>
         </tr>`
      : `<tr>
          <td style="border:1px solid #000;padding:3px 2px;text-align:right;font-weight:bold;font-size:12px;">${it.offer_id ? '🎟️ ' : ''}${esc(it.name)}</td>
          <td style="border:1px solid #000;padding:3px 2px;text-align:center;font-weight:bold;font-size:12px;">${(Number(it.qty) || 1).toFixed(2)}</td>
          <td style="border:1px solid #000;padding:3px 2px;text-align:center;font-weight:bold;font-size:12px;">${fmtN(it.price)}</td>
          <td style="border:1px solid #000;padding:3px 2px;text-align:center;font-weight:bold;font-size:12px;">${fmtN((Number(it.price) || 0) * (Number(it.qty) || 1))}</td>
          <td style="border:1px solid #000;padding:3px 2px;text-align:center;font-size:11px;">${esc(it.note || '')}</td>
         </tr>`
    ).join('');

    const headCols = kitchen
      ? `<th style="border:1px solid #000;padding:3px 2px;font-size:12.5px;width:52%;">الصنف</th>
         <th style="border:1px solid #000;padding:3px 2px;font-size:12.5px;width:24%;">الكمية</th>
         <th style="border:1px solid #000;padding:3px 2px;font-size:12.5px;width:24%;">ملاحظات</th>`
      : `<th style="border:1px solid #000;padding:3px 2px;font-size:12.5px;width:24%;">اسم المادة</th>
         <th style="border:1px solid #000;padding:3px 2px;font-size:12.5px;width:16%;">الكمية</th>
         <th style="border:1px solid #000;padding:3px 2px;font-size:12.5px;width:20%;">السعر</th>
         <th style="border:1px solid #000;padding:3px 2px;font-size:12.5px;width:20%;">إجمالي</th>
         <th style="border:1px solid #000;padding:3px 2px;font-size:12.5px;width:20%;">ملاحظات</th>`;

    return `
      <div style="width:${w}mm;max-width:${w}mm;min-width:${w}mm;margin:0 auto;padding:0;font-family:Tahoma,Arial,sans-serif;color:#000;direction:rtl;text-align:right;box-sizing:border-box;line-height:1.5;background:#fff;">
        <div style="font-size:20px;font-weight:900;text-align:center;margin:6px 0 5px;">${esc(RESTAURANT())}</div>
        ${subLine ? `<div style="font-size:14px;font-weight:bold;text-align:center;margin-bottom:12px;">${esc(subLine)}</div>` : ''}
        ${kitchen ? `<div style="font-size:16px;font-weight:900;text-align:center;margin-bottom:10px;">نسخة المطبخ — ${esc(typeLabel(inv))}</div>` : ''}

        <div style="font-size:15px;font-weight:bold;text-align:center;">رقم الطلب:</div>
        <div style="font-size:28px;font-weight:900;text-align:center;line-height:1.1;margin:0 0 8px;">${esc(no)}</div>

        <div style="font-size:14px;font-weight:900;text-align:center;border:1px solid #000;border-radius:3px;padding:3px 6px;margin:0 auto 10px;max-width:${w-6}mm;">${esc(typeLabel(inv))}</div>

        <div style="font-size:13px;font-weight:bold;text-align:center;margin-bottom:12px;direction:ltr;">تاريخ الطلب: ${esc(inv.date || '')} ${esc(inv.time || '')}</div>

        ${cust ? `<div style="font-size:14px;font-weight:bold;text-align:center;margin-bottom:12px;">${esc(cust)}</div>` : ''}

        <table style="width:100%;border-collapse:collapse;border:1px solid #000;margin-bottom:10px;table-layout:fixed;">
          <thead><tr>${headCols}</tr></thead>
          <tbody>${rows}</tbody>
        </table>

        ${kitchen ? '' : `
        <table style="width:100%;border-collapse:collapse;border:1px solid #000;margin-bottom:12px;">
          <tr><td style="border:1px solid #000;padding:5px 6px;font-size:13px;font-weight:bold;text-align:right;padding-inline-start:12px;">مجموع الطلب</td><td style="border:1px solid #000;padding:5px 6px;font-size:13px;font-weight:bold;text-align:center;">${fmtN(sub)}</td></tr>
          <tr><td style="border:1px solid #000;padding:5px 6px;font-size:13px;font-weight:bold;text-align:right;padding-inline-start:12px;">الحسم</td><td style="border:1px solid #000;padding:5px 6px;font-size:13px;font-weight:bold;text-align:center;">${fmtN(disc)}</td></tr>
          <tr><td style="border:1px solid #000;padding:5px 6px;font-size:13px;font-weight:bold;text-align:right;padding-inline-start:12px;">الصافي</td><td style="border:1px solid #000;padding:5px 6px;font-size:13px;font-weight:bold;text-align:center;">${fmtN(total)}</td></tr>
        </table>`}

        <div style="font-size:15px;font-weight:bold;text-align:center;padding-bottom:8mm;">شكرا لزيارتكم</div>
      </div>`;
  }

  function ensureContainer() {
    let c = document.getElementById('printable-receipt');
    if (!c) { c = document.createElement('div'); c.id = 'printable-receipt'; document.body.appendChild(c); }
    return c;
  }
  function fallbackPrint(html) {
    ensureContainer().innerHTML = html;
    setTimeout(() => window.print(), 80);
  }

  /* الطباعة: صامتة عبر QZ إن كانت متصلة، وإلا حوار طباعة المتصفح */
  async function print(inv, opts = {}) {
    const html = receiptHtml(inv, opts);
    if (isActive()) {
      try {
        const printOptions = { size: { width: WIDTH() }, units: 'mm', margins: 0, rasterize: false, colorType: 'monochrome' };
        const data = [{ type: 'pixel', format: 'html', flavor: 'plain', data: html }];
        const config = qz.configs.create(opts.kitchen ? PRINTER_KITCHEN() : PRINTER_CASHIER(), printOptions);
        await qz.print(config, data);
        return 'qz';
      } catch (err) { console.error('QZ print failed:', err); }
    }
    fallbackPrint(html);
    return 'dialog';
  }

  /* بعد كل عملية بيع: إيصال كاشير + نسخة مطبخ (حسب config.js) */
  async function afterSale(inv) {
    try {
      await connect();
      await print(inv, {});
      if (CFG().kitchenCopy !== false) await print(inv, { kitchen: true });
    } catch (e) { fallbackPrint(receiptHtml(inv, {})); }
  }

  window.ThermalPrint = {
    connect,
    print,
    afterSale,
    receiptHtml,
    isActive,
    onStatus(fn) { if (typeof fn === 'function') handlers.push(fn); },
    state: () => state,
    printers: () => ({ cashier: PRINTER_CASHIER(), kitchen: PRINTER_KITCHEN(), widthMm: WIDTH() }),
  };
})();
