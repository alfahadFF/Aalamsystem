/* ================================================================
   sign.js — توقيع طلبات QZ Tray سيرفرياً (Netlify Function)
   ================================================================

   يستقبل النص المراد توقيعه من thermal.js في المتصفح،
   يوقّعه بالمفتاح الخاص المخزَّن كمتغير بيئة سري على Netlify،
   ويُرجع التوقيع فقط — المفتاح الخاص لا يغادر السيرفر أبداً.

   متغيرات البيئة المطلوبة على Netlify:
     QZ_PRIVATE_KEY  — المفتاح الخاص PEM (-----BEGIN PRIVATE KEY-----)
                       أو (-----BEGIN RSA PRIVATE KEY-----)
     QZ_SIGN_SECRET  — سر مشترك اختياري للتحقق من المُرسِل
                       (يُرسَل من thermal.js كـ header: x-qz-secret)

   توليد الشهادة والمفتاح الخاص (مرة واحدة):
     1. حمّل أداة QZ Tray Certificate Tool:
        https://qz.io/wiki/app-certification
     2. نفّذ: keytool -genkey -alias qztray -keyalg RSA -keysize 2048
              -keystore keystore.jks -validity 3650
     3. صدّر PEM: openssl pkcs12 ... (انظر docs QZ)
     4. QZ_PRIVATE_KEY = محتوى private-key.pem
     5. QZ_PUBLIC_CERT = محتوى public-cert.pem (ضعه في config.js فقط)
   ================================================================ */

const crypto = require('crypto');

/* تنظيف PEM القادم من متغير البيئة:
   - يستبدل «\n» الحرفية (تظهر مع بعض طرق اللصق)
   - يعيد بناء الأسطر إذا ضاعت كلها وأصبح الملف سطراً واحداً
     (يحدث كثيراً عند لصق PEM في خانات Netlify) */
function normalizePem(raw) {
  let k = String(raw || '').trim();
  if (!k) return '';
  k = k.replace(/\\r\\n|\\n|\\r/g, '\n');          // \n حرفية → أسطر حقيقية
  k = k.replace(/\r\n?/g, '\n');
  if (!k.includes('\n')) {
    // سطر واحد: أعد ترتيب الرأس والذيل ولفّ base64 على 64 محرفاً
    const m = k.match(/^-----BEGIN ([A-Z0-9 ]+)-----(.+)-----END \1-----\s*$/);
    if (m) {
      const b64 = m[2].replace(/\s+/g, '');
      const lines = b64.match(/.{1,64}/g) || [];
      k = '-----BEGIN ' + m[1] + '-----\n' + lines.join('\n') + '\n-----END ' + m[1] + '-----\n';
    }
  }
  return k;
}

exports.handler = async (event) => {
  /* 1. طريقة الطلب */
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  /* 2. فحص السر المشترك — معطَّل مؤقتاً (2026-09-08)
     السبب: qzSecret كان فارغاً في config.js بينما QZ_SIGN_SECRET مضبوط على
     Netlify، فكانت كل طباعة QZ تفشل بـ 401 unauthorized، ويسقط النظام إلى
     حوار طباعة المتصفح (سحب ورق زائد + أخطاء كونسول عند كل بيع).

     لإعادة التفعيل لاحقاً:
       1) ضع نفس قيمة QZ_SIGN_SECRET في config.js ← thermal.qzSecret
       2) أعد الفحص في أول الدالة:
          const expected = process.env.QZ_SIGN_SECRET;
          if (expected && event.headers['x-qz-secret'] !== expected) {
            return { statusCode: 401, body: JSON.stringify({ error: 'unauthorized' }) };
          }
     ملاحظة: الحماية الحقيقية تبقى المفتاح الخاص QZ_PRIVATE_KEY — لا يغادر
     السيرفر أبداً، والشهادة العامة وحدها في config.js. */

  /* 3. المفتاح الخاص — تنظيف وفحص برسائل واضحة */
  const privateKey = normalizePem(process.env.QZ_PRIVATE_KEY);
  if (!privateKey) {
    return {
      statusCode: 503,
      body: JSON.stringify({ error: 'QZ_PRIVATE_KEY not configured — add it to Netlify environment variables' }),
    };
  }
  if (/-----BEGIN CERTIFICATE-----/.test(privateKey)) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'QZ_PRIVATE_KEY يحتوي شهادة (CERTIFICATE) وليس مفتاحاً خاصاً — الصق محتوى private-key.pem وليس public-cert.pem' }),
    };
  }
  let keyObj;
  try {
    keyObj = crypto.createPrivateKey(privateKey);
  } catch (e) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'QZ_PRIVATE_KEY غير مقروء (' + String(e.code || e.message).slice(0, 80) +
               ') — الصق محتوى private-key.pem كاملاً من سطر -----BEGIN PRIVATE KEY----- حتى -----END PRIVATE KEY-----',
      }),
    };
  }

  /* 4. النص المراد توقيعه */
  let toSign;
  try {
    const body = JSON.parse(event.body || '{}');
    toSign = body.request;
    if (!toSign || typeof toSign !== 'string') throw new Error('missing request');
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'bad request: ' + e.message }) };
  }

  /* 5. التوقيع */
  try {
    const sign = crypto.createSign('SHA512');
    sign.update(toSign);
    sign.end();
    const signature = sign.sign(keyObj, 'base64');
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signature }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'signing failed: ' + err.message }),
    };
  }
};
