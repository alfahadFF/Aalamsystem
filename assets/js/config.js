/* ============================================================
   config.js — إعدادات التشغيل — alfaprosys
   ============================================================ */
window.ALFA_CONFIG = {
  // trial  = نسخة تجريبية (ما قبل الربط)
  // prod   = عميل حقيقي
  mode: 'trial',
  // فعّلها عند ربط Supabase لتبدأ المزامنة
  syncEnabled: false,
  // تُعبَّأ لاحقًا عند الربط بقواعد البيانات
  supabase: { url: '', anonKey: '' },
  // مصدر الطلبات الأونلاين:
  //  - اترك endpoint فارغًا للوضع التجريبي (بيانات محلية).
  //  - أو ضع رابط دالة orders.js (Netlify) لسحب الطلبات من Google Sheet،
  //    أو لاحقًا اجعل remote.js يسحبها من جدول DB مخصص.
  onlineOrders: { endpoint: '', pin: '' },
  // الطباعة الحرارية عبر QZ Tray
  // ثبّت QZ Tray على جهاز الكاشير واترك أسماء الطابعات كما هي إن كانت نفس الأجهزة
  thermal: {
    printerCashier: 'RONGTA 80mm 2',              // طابعة الكاشير
    printerKitchen: 'RONGTA 80mm Series Printer', // طابعة المطبخ
    widthMm: 72,         // عرض قالب الفاتورة (72 يناسب طابعات 80مم)
    autoAfterSale: true, // طباعة تلقائية بعد كل عملية بيع (كاشير + مطبخ)
    kitchenCopy: true,   // إرسال نسخة للمطبخ تلقائياً
    // ── أمان QZ Tray ──
    // qzCert: الشهادة العامة فقط (Public Certificate) — آمن وضعه هنا
    qzCert: `-----BEGIN CERTIFICATE-----
MIIDETCCAfmgAwIBAgIUbsjhLKI129JTyx3v92BqNMBoqcUwDQYJKoZIhvcNAQEL
BQAwGDEWMBQGA1UEAwwNYWxmYXByb3N5cy1xejAeFw0yNjA5MDUyMjU2NTNaFw0z
NjA5MDIyMjU2NTNaMBgxFjAUBgNVBAMMDWFsZmFwcm9zeXMtcXowggEiMA0GCSqG
SIb3DQEBAQUAA4IBDwAwggEKAoIBAQCt5tJOB9bbAk9kctEfjFCcv9HBqT4iLxH4
iaRHXN1SDXJ6xF3ygAuwrGunSHOMgA7dJkUgCycERbFhAH02MCTyHW5WEyWPDPK2
Q1vTi/kcLFT2h3t0D/fxoQvydsvZPC1Ff4FFkw0rHI99CjFuJ4tdZQ1NXZdkvJBj
p9DW1WeW+sjHCFsXczgFEbh50ZkC9/wxol6ddhzkn6ORnxMVDuyNeF3hX0ThJx3c
0jT17BB0SpHPMzfu3yBGa02A//68wZYPFJwDe1n2+ZtyMk0Da3odH7AwGLa4r8Ln
YeU6iGsdjfRuuyygDAQSuCFPKjIekuWDdV2nvoV2D8IV8yta2fFhAgMBAAGjUzBR
MB0GA1UdDgQWBBRY+hcDKb+9jGKv/q97CVi4mkAxDDAfBgNVHSMEGDAWgBRY+hcD
Kb+9jGKv/q97CVi4mkAxDDAPBgNVHRMBAf8EBTADAQH/MA0GCSqGSIb3DQEBCwUA
A4IBAQBrOnLMeVRh86jHzCK6m5zi63kWe/XjoXPTE+7m4obXHXvE2t3Ozo47zQJo
GIWSQQtBl9XArzJq/S9MAe+1LsacGlDNxP8zv/zylooVcWsJ9AOr+KoD87AwI6aB
k6z5jjphM+oOUtcbiDPWWrSOUGCXvhjM5RaqhMuNw+38hvKWncJnGiX9APXQuANh
gYV/klMzloxkWCwXHu4ChtusgR4AHoMTsBQBraBsvS4wjJAEu2UprdW5bk4Eo4gg
+5bzw7NmC6A1yGReQYw0IifADMwNGXEnkEpcBjleol16/pK7Rnb/HaStDslxx27m
ct0NdzgIQRWJFfJ77QECqub1eU4S
-----END CERTIFICATE-----`,
    // qzSecret: سر مشترك يُرسَل لـ Netlify Function sign.js للتحقق من المُرسِل
    //   نفس القيمة لازم موجودة بمتغير بيئة Netlify باسم QZ_SIGN_SECRET
    //   تحذير: هذا ليس سراً حقيقياً (مرئي بالمتصفح) — هو حاجز بسيط فقط
    //   الحماية الحقيقية = المفتاح الخاص على Netlify (QZ_PRIVATE_KEY)
    qzSecret: 'b3c243502f040dd24503dc190ca9132a3c290a4caed4b2ce925e53d70beeadd4', // ← لازم نفس القيمة بالضبط بمتغير QZ_SIGN_SECRET على Netlify
  },
};
/* هوية المطعم — تُحرر من الإعدادات وتُطبق هنا على كل الشاشات والإيصالات */
try {
  const __b = JSON.parse(localStorage.getItem('alfaprosys_branding') || 'null');
  if (__b && __b.name) {
    window.ALFA_CONFIG.restaurantName = __b.name;
    window.ALFA_CONFIG.thermal.restaurantName = __b.name;
  }
  if (__b) window.ALFA_CONFIG.branding = __b;
} catch (e) {}
