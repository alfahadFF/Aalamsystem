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

  function typeLabel(inv) {
    if (inv.is_online || inv.source_order_id) return 'طلب أونلاين';
    return ({ table: 'طلب طاولة', takeaway: 'سفري', delivery: 'توصيل', contract: 'عقد' })[inv.type] || 'طلب';
  }
  function payLabel(inv) {
    return ({ cash: 'نقداً', wallet: 'محفظة', partial: 'دفع جزئي', deferred: 'آجل' })[inv.pay_type] || (inv.pay_type || '');
  }

  /* قالب الإيصال — عرض قابل للضبط (72مم) */
  function receiptHtml(inv, opts = {}) {
    const w = WIDTH();
    const kitchen = !!opts.kitchen;
    const no = window.invoiceNo ? window.invoiceNo(inv) : String(inv.no != null ? inv.no : (inv.id || ''));
    const items = inv.items || [];
    const sub = items.reduce((s, x) => s + (Number(x.price) || 0) * (Number(x.qty) || 0), 0);
    const disc = Number(inv.discount) || 0;
    const total = Number(inv.total != null ? inv.total : Math.max(0, sub - disc));
    
    // إخفاء ملاحظات في نسخة المطبخ إن لم توجد
    const hasNotes = items.some(i => i.note && i.note.trim() !== '');

    const rows = items.filter(it => !(kitchen && it.offer_disc)).map(it => kitchen
      ? `<tr>
          <td style="border:1px solid #000;padding:4px 3px;text-align:right;font-weight:bold;font-size:12px;">${it.is_free ? '🎁 ' : ''}${esc(it.name)}</td>
          <td style="border:1px solid #000;padding:4px 3px;text-align:center;font-weight:900;font-size:14px;">${Number(it.qty) || 1}</td>
          ${hasNotes ? `<td style="border:1px solid #000;padding:4px 3px;text-align:center;font-size:11px;">${esc(it.note || '')}</td>` : ''}
         </tr>`
      : `<tr>
          <td style="border:1px solid #000;padding:4px 3px;text-align:right;font-weight:bold;font-size:12px;">${it.offer_id ? '🎟️ ' : ''}${esc(it.name)}</td>
          <td style="border:1px solid #000;padding:4px 3px;text-align:center;font-weight:bold;font-size:13px;">${Number(it.qty) || 1}</td>
          <td style="border:1px solid #000;padding:4px 3px;text-align:center;font-size:12px;">${fmtN(it.price)}</td>
          <td style="border:1px solid #000;padding:4px 3px;text-align:center;font-weight:bold;font-size:12px;">${fmtN((Number(it.price) || 0) * (Number(it.qty) || 1))}</td>
         </tr>`
    ).join('');

    return `
      <div style="width:${w}mm;max-width:${w}mm;min-width:${w}mm;margin:0 auto;padding:0;font-family:Tahoma,Arial,sans-serif;color:#000;direction:rtl;text-align:right;box-sizing:border-box;line-height:1.4;background:#fff;">
        <div style="text-align:center;border-bottom:1px solid #000;padding-bottom:5px;margin-bottom:6px;">
          <div style="font-size:22px;font-weight:900;margin-bottom:2px;">${esc(RESTAURANT())}</div>
          ${(window.ALFA_CONFIG && ALFA_CONFIG.branding && ALFA_CONFIG.branding.address) ? `<div style="font-size:14px;font-weight:bold;">${esc(ALFA_CONFIG.branding.address)}</div>` : ''}
          ${(window.ALFA_CONFIG && ALFA_CONFIG.branding && ALFA_CONFIG.branding.phone) ? `<div style="font-size:13px;font-weight:bold;">هاتف: ${esc(ALFA_CONFIG.branding.phone)}</div>` : ''}
          ${kitchen ? `<div style="font-size:16px;font-weight:900;margin-top:4px;">نسخة المطبخ</div>` : ''}
          <div style="font-size:14px;font-weight:bold;margin-top:2px;">${esc(typeLabel(inv))}${inv.type === 'table' && inv.table_label ? ' — ' + esc((inv.hall || '') + ' ' + inv.table_label) : ''}</div>
        </div>

        <div style="text-align:center;margin-bottom:6px;">
          <div style="font-size:14px;font-weight:bold;">${kitchen ? 'رقم الطلب' : 'رقم الطلب:'}</div>
          <div style="font-size:28px;font-weight:900;line-height:1;">${esc(no)}</div>
        </div>

        <div style="font-size:13px;font-weight:bold;display:flex;justify-content:space-between;margin-bottom:6px;">
          <span>تاريخ الطلب:</span><span style="direction:ltr;">${esc(inv.date || '')} ${esc(inv.time || '')}</span>
        </div>

        ${(inv.customer_name || inv.phone || inv.customer_address) ? `
        <div style="border-top:1px solid #000;padding-top:4px;margin-bottom:6px;font-size:14px;line-height:1.6;">
          ${inv.customer_name ? `<div style="display:flex;justify-content:space-between;"><span style="font-weight:bold;">الزبون:</span><strong>${esc(inv.customer_name)}</strong></div>` : ''}
          ${inv.phone ? `<div style="display:flex;justify-content:space-between;"><span style="font-weight:bold;">الهاتف:</span><strong style="direction:ltr;">${esc(inv.phone)}</strong></div>` : ''}
          ${inv.customer_address ? `<div style="display:flex;justify-content:space-between;"><span style="font-weight:bold;">العنوان:</span><strong>${esc(inv.customer_address)}</strong></div>` : ''}
        </div>` : ''}

        <table style="width:100%;border-collapse:collapse;border:1px solid #000;margin-bottom:6px;table-layout:fixed;">
          <thead>
            <tr>
            ${kitchen
              ? `<th style="border:1px solid #000;padding:4px 3px;font-size:13px;${hasNotes ? 'width:40%;' : 'width:70%;'}">الصنف</th>
                 <th style="border:1px solid #000;padding:4px 3px;font-size:13px;${hasNotes ? 'width:20%;' : 'width:30%;'}">الكمية</th>
                 ${hasNotes ? '<th style="border:1px solid #000;padding:4px 3px;font-size:13px;width:40%;">ملاحظات</th>' : ''}`
              : `<th style="border:1px solid #000;padding:4px 3px;font-size:13px;width:40%;">المادة</th>
                 <th style="border:1px solid #000;padding:4px 3px;font-size:13px;width:15%;">الكمية</th>
                 <th style="border:1px solid #000;padding:4px 3px;font-size:13px;width:20%;">السعر</th>
                 <th style="border:1px solid #000;padding:4px 3px;font-size:13px;width:25%;">إجمالي</th>`}
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>

        ${kitchen ? '' : `
        <table style="width:100%;border-collapse:collapse;border:1px solid #000;margin-bottom:8px;font-size:14px;font-weight:bold;">
          <tr><td style="border:1px solid #000;padding:4px;text-align:right;">مجموع الطلب</td><td style="border:1px solid #000;padding:4px;text-align:center;">${fmtN(sub)}</td></tr>
          ${disc ? `<tr><td style="border:1px solid #000;padding:4px;text-align:right;">الحسم</td><td style="border:1px solid #000;padding:4px;text-align:center;">${fmtN(disc)}-</td></tr>` : ''}
          <tr><td style="border:1px solid #000;padding:4px;text-align:right;font-size:16px;">الصافي</td><td style="border:1px solid #000;padding:4px;text-align:center;font-size:16px;font-weight:900;">${fmtN(total)}</td></tr>
        </table>`}

        <div style="text-align:center;font-size:14px;font-weight:bold;margin-top:8px;padding-bottom:10mm;">شكرا لزيارتكم</div>
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
