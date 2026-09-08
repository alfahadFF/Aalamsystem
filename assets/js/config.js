/* ============================================================
   config.js — إعدادات التشغيل — alfaprosys
   ============================================================ */
window.ALFA_CONFIG = {
  // trial  = نسخة تجريبية (ما قبل الربط)
  // prod   = عميل حقيقي
  mode: 'prod',

  /* ── هوية المطعم (الترويسة على الفواتير) ──
     هذه القيم الافتراضية تظهر على كل جهاز بلا أي إعداد.
     ملاحظة: إن ضُبطت الهوية من صفحة الإعدادات على جهازٍ ما (localStorage
     باسم alfaprosys_branding) فإنها تتقدم على هذه الافتراضيات على ذلك الجهاز. */
  restaurantName: 'عالم الفواكه',
  branding: { name: 'عالم الفواكه', address: 'قسيم الحريري', phone: '0983831671' },

  // فعّلها عند ربط Supabase لتبدأ المزامنة
  syncEnabled: true,

  // تُعبَّأ لاحقًا عند الربط بقواعد البيانات
  // 1) url + anonKey من لوحة Supabase → Project Settings → API
  // 2) mode: 'prod'
  // 3) syncEnabled: true
  // راجع DATA_MODEL.md لأسماء المجموعات والحقول كما هي في التطبيق
  supabase: {
    url: 'https://xqsbyosxzfqqzzgwppyk.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhxc2J5b3N4emZxcXp6Z3dwcHlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxNzc3OTgsImV4cCI6MjEwMjc1Mzc5OH0.mlsG5y0W2ZVVL0TxviMr0dCXJBh0KDz1W8tIZMcdQXk',
  },

  // مصدر الطلبات الأونلاين:
  //  - اترك endpoint فارغًا للوضع التجريبي (بيانات محلية).
  //  - أو ضع رابط دالة orders.js (Netlify) لسحب الطلبات من Google Sheet،
  //    أو لاحقًا اجعل remote.js يسحبها من جدول DB مخصص.
  onlineOrders: { endpoint: '', pin: '' },

  // الطباعة الحرارية عبر QZ Tray
  // ثبّت QZ Tray على جهاز الكاشير واترك أسماء الطابعات كما هي إن كانت نفس الأجهزة
  /* ── معادلات الاستهلاك التلقائي (ينفّذها assets/js/stock.js) ──
     كل صنف شاورما مُعبَّر بعدد السندويشات وحجمها، فيُخصم لحم السيخ
     والخبز تلقائياً عند كل بيع، ذاتي الشفاء على كل الأجهزة.
     عدّل الأرقام هنا فقط ولا تلمس المعادلات يدوياً. */
  stock: {
    category: 'الشاورما',          // تصنيف الأصناف التي تنطبق عليها القواعد
    skewerMaterial: 'سيخ شاورما',  // المادة التي يُخصم وزنها (يخلقها زر «تجهيز سيخ»)
    /* غرام السيخ لكل سندويشة حسب حجمها
       — كبير أصبح 120 (كان 110)
       — «وجبة دبل» مفتاح مستقل: سندويشة واحدة بوزن 120غ
         (الدبل = زيادة كمية الشاورما، وليست سندويشتين) */
    sizes: { خرطوشة: 50, صغير: 60, وسط: 80, كبير: 120, 'وجبة دبل': 120 },
    /* كل صنف مباع = كم سندويشة وبأي حجم، وأي خبز يستهلك:
       bread 'عادي' = شراك + سياحي عن كل سندويشة
       bread 'سمون' = رغيف سمون فقط (لا شراك ولا سياحي)
       sandwiches 'fromVariant' = العدد يُقرأ من اسم التشكيلة (صحن - 3سندويشات ⇒ 3) */
    rules: [
      { variant: 'خرطوشة',      sandwiches: 1,            size: 'خرطوشة', bread: 'عادي' },
      { variant: 'صغير',        sandwiches: 1,            size: 'صغير',   bread: 'عادي' },
      { variant: 'وسط',         sandwiches: 1,            size: 'وسط',    bread: 'عادي' },
      { variant: 'كبير',        sandwiches: 1,            size: 'كبير',   bread: 'عادي' },
      { variant: 'صحن',         sandwiches: 'fromVariant', size: 'وسط',   bread: 'عادي' },   // كل سندويشة بالصحن 80غ
      { variant: 'وجبة - عادي', sandwiches: 1,            size: 'وسط',    bread: 'عادي' },   // سندويشة واحدة 80غ (كانت كبير 110)
      { variant: 'وجبة - دبل',  sandwiches: 1,            size: 'وجبة دبل', bread: 'عادي' }, // سندويشة واحدة 120غ — الدبل زيادة كمية لا سندويشتان (كانت 2×110)
      { variant: 'سمون',        sandwiches: 1,            size: 'وسط',    bread: 'سمون' },
    ],
    breads: [                      /* خبز السندويشات العادية */
      { name: 'خبز صاج / شراك', loaves: 1 },              // وحدتها «عدد» ⇒ رغيف كامل
      { name: 'خبز سياحي',      loaves: 1, bundle: 12 },  // 12 رغيفاً في الربطة
    ],
    samounBread: { name: 'سمون شاورما', loaves: 1, bundle: 4 },  // 4 أرغفة في ربطة السمون
    burgerBread: { name: 'خبز برغر', loaves: 1, bundle: 6, matchName: 'برغر' }, // رغيف لكل صنف اسمه يحوي «برغر»
    drumsticks: { material: 'دبوس دجاج', category: 'البروستد', matchVariant: 'دبوس', qty: 5 }, // وجبة دبوس = 5 دبابيس
  },

  thermal: {
    printerCashier: 'RONGTA 80mm 2',              // طابعة الكاشير
    printerKitchen: 'RONGTA 80mm Series Printer', // طابعة المطبخ

    /* ── المقاسات ──
       widthMm      = عرض قالب الفاتورة نفسه (محتوى الإيصال)
       paperWidthMm = عرض الورق الفيزيائي الذي تُطبع عليه
       ⇒ القالب 72 مم يتمركز داخل ورق 79.2 مم (هامش ~3.6 مم لكل طرف)
       إن كانت طابعتك تقصّ الأطراف اجعل paperWidthMm = 72

       ⚠️ مهم — طول الورق والسحب الزائد:
       الطباعة عبر QZ (الأساسية) تطبع بطول الفاتورة نفسه + feedMm — بلا فراغ.
       أما حوار المتصفح الاحتياطي (عند غياب QZ) فيستخدم مقاس ورق تعريف
       الطابعة في ويندوز. لتجنب السحب الزائد هناك:
       إعدادات الطباعة في ويندوز ← الطابعة RONGTA ← Printing Preferences
       ← Paper Size = RP80:Roll (وليس 100mm/120mm/210mm). */
     widthMm: 72,
     paperWidthMm: 79.2,

  /* الاسم في ترويسة الإيصال — الافتراضي من الجذر أعلاه، والإعدادات المحلية تتقدم عليه */
  restaurantName: 'عالم الفواكه',

     /* الطول الثابت للفاتورة (مم) — الفاتورة المعتمدة طولها 15سم (150مم)
        مهما كان المحتوى؛ فإن تجاوزه المحتوى (فاتورة طويلة) تتمدد تلقائياً.
        اجعله 0 لإلغاء الطول الثابت. */
     minHeightMm: 150,

    /* خطوط الإيصال — مقاسات الفاتورة المعتمدة (صورة 9/3/2026) كما هي.
       عدّل أي رقم هنا إن أراد صاحب المطعم تغييراً:
       title اسم المطعم · sub العنوان/الهاتف · noLabel «رقم الطلب:» · no الرقم
       date سطر التاريخ · cust سطر الزبون · th رؤوس الأعمدة · td خلايا الجدول
       note الملاحظات · sum المجاميع · thanks سطر الشكر */
    fonts: { title: 20, sub: 11.5, noLabel: 14, no: 26, date: 11, cust: 11.5,
             th: 10.5, td: 10.5, note: 10, sum: 11.5, thanks: 13 },
    feedMm: 3,           // مساحة السحب بعد آخر سطر (كانت 8 مم)

    autoAfterSale: true, // طباعة تلقائية بعد كل عملية بيع (كاشير + مطبخ)
    kitchenCopy: true,   // إرسال نسخة للمطبخ تلقائياً (عبر QZ فقط — انظر thermal.js)

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
    //   ضع نفس القيمة في متغير بيئة Netlify: QZ_SIGN_SECRET
    //   تحذير: هذا ليس سراً حقيقياً (مرئي بالمتصفح) — هو حاجز بسيط فقط
    //   الحماية الحقيقية = المفتاح الخاص على Netlify (QZ_PRIVATE_KEY)
    qzSecret: '', // ← ضع نفس القيمة يلي حطيتها بمتغير QZ_SIGN_SECRET على Netlify
  },
};

/* هوية المطعم — تُحرر من الإعدادات وتُطبق هنا على كل الشاشات والإيصالات */
try {
  const __b = JSON.parse(localStorage.getItem('alfaprosys_branding') || 'null') || {};
  const __d = window.ALFA_CONFIG.branding || {};
  /* دمج لا استبدال: كل حقل يأخذ قيمة الإعدادات إن وُجدت، وإلا فالافتراضي —
     فلا تُفرَّغ الترويسة بهوية قديمة ناقصة محفوظة على جهاز ما */
  window.ALFA_CONFIG.branding = {
    name: __b.name || __d.name,
    address: __b.address || __d.address,
    phone: __b.phone || __d.phone,
  };
  if (__b.name) {
    window.ALFA_CONFIG.restaurantName = __b.name;
    window.ALFA_CONFIG.thermal.restaurantName = __b.name;
  }
} catch (e) {}


// ── نظام الحماية والصلاحيات ──
(function() {
  const role = sessionStorage.getItem('alfaprosys_role');
  const path = window.location.pathname.split('/').pop() || 'index.html';

  // إذا كنا في شاشة الدخول (index.html) والمستخدم مسجل دخوله بالفعل
  if (path === 'index.html' || path === '') {
    if (role === 'manager') {
      window.location.replace('dashboard.html');
    } else if (role === 'cashier') {
      window.location.replace('pos.html');
    }
    return;
  }

  // إذا لم يكن مسجل دخوله، يطرد إلى شاشة الدخول
  if (!role) {
    window.location.replace('index.html');
    return;
  }

  // الصفحات المسموحة للكاشير
  const cashierAllowed = [
    'pos.html',
    'invoices.html',
    'cashier_session.html',
    'kitchen.html',
    'queue.html',
    'tables.html',
    'online_orders.html',
    'delivery.html',
    'edit_invoice.html'
  ];

  // التحقق من الصلاحيات
  if (role === 'cashier') {
    if (!cashierAllowed.includes(path)) {
      alert('ليس لديك صلاحية للوصول إلى هذه الشاشة');
      window.location.replace('pos.html');
    }
  }
})();
