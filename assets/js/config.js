/* ============================================================
   config.js — إعدادات التشغيل — alfaprosys
   ============================================================ */
window.ALFA_CONFIG = {
  // trial  = نسخة تجريبية (ما قبل الربط)
  // prod   = عميل حقيقي
  mode: 'prod',

  /* ── هوية المطعم (افتراضيات فقط) ──
     المصدر الحي: مفتاح invoice_print في جدول settings (سحابة).
     تُحدَّث عبر alfaApplyInvoicePrint بعد السحب — بلا localStorage. */
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

  /* ══════════════════════════════════════════════════════════════
     خدمة الترقيم المحلية (اختيارية — تعمل بلا إنترنت)
     ──────────────────────────────────────────────────────────────
     مطلب الإدارة: التعداد ١، ٢، ٣… بلا أصفار وبلا قفزات، ويستمر
     صاعداً حتى لو صدر من جهازين. لازمُه أن يكون الرقم من مرجع
     مشترك — والسحابة وحدها لا تكفي إن انقطع الإنترنت.

     إن أردت الترقيم مستمراً حتى بلا إنترنت:
       ١) شغّل tools/numbering-server.js على جهاز داخل المطعم
       ٢) اكتب عنوانه هنا
     مثال: lanUrl: 'http://192.168.1.235:8787/next'

     اتركه فارغاً ⇒ الرقم من السحابة فقط، وإن تعذّر الاتصال يُوقف
     إصدار الفاتورة بدل إصدار رقم مكرّر أو ذي قفزة.
     ══════════════════════════════════════════════════════════════ */
  numbering: { lanUrl: '' },

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
    printerCashier: 'RONGTA 80mm 2',              // طابعة الكاشير (الاسم المحلي على الجهاز الرئيسي)
    printerKitchen: 'RONGTA 80mm Series Printer', // طابعة المطبخ (الاسم المحلي على الجهاز الرئيسي)

    /* أسماء المشاركة على الشبكة (ويندوز يفرض غالباً بلا فراغات).
       النظام يفضّل مسار الشبكة (UNC / «على …») ثم المحلي تلقائياً — بلا اختيار يدوي. */
    /* أسماء بديلة كما تظهر في ويندوز/QZ — المحلي + المشاركة (على SERVER) + اسم المشاركة بلا فراغات */
    printerCashierAliases: [
      'RONGTA 80mm 2 على SERVER',
      'RONGTA 80mm 2 on SERVER',
      '\\SERVER\\RONGTA 80mm 2',
      '\\SERVER\\RONGTA80mm2',
      'RONGTA80mm2',
    ],
    printerKitchenAliases: [
      'RONGTA 80mm Series Printer على SERVER',
      'RONGTA 80mm Series Printer on SERVER',
      '\\SERVER\\RONGTA 80mm Series Printer',
      '\\SERVER\\RONGTA80mm1',
      'RONGTA80mm1',
      'RONGTA 80mm Series Printer',
    ],

    /* عناوين QZ على الشبكة (الجهاز الرئيسي) — تُجرَّب أولاً قبل QZ المحلي،
       لأن الطابعات موصولة به. مثال: ['192.168.1.10']
       يمكن أيضاً حفظ العنوان محلياً: localStorage alfaprosys_qz_host */
    /* الترتيب الآن: الشبكة (هذا العنوان) أولاً، ثم QZ المحلي على جهاز
       الكاشير بديلاً، ثم حوار طباعة المتصفح إن غاب الاثنان. */
    qzHosts: ['192.168.1.235'],

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
    fonts: { title: 20, sub: 14, address: 14, noLabel: 26, no: 26, date: 14, cust: 12.5,
             th: 9.5, td: 12, name: 11, note: 14, itemNote: 11, sum: 12.5, thanks: 16 },
    addressLine: '',     // سطر العنوان المستقل في الترويسة
    showLogo: true,      // إظهار اللوغو من عدمه — اختياري للعميل
    showQr:   true,      // إظهار صورة QR من عدمها
    feedMm: 3,           // مساحة السحب بعد آخر سطر (كانت 8 مم)

    /* عروض أعمدة جدول الأصناف — نسبة مئوية من عرض الجدول (المجموع 100).
       عُدِّل: عمود «اسم المادة» مُوَسَّع من ٢٢٪ إلى ٣٤٪ على حساب البقية،
       لأن أسماء الأصناف طويلة فكانت تُلتفّ سطرين.
       عدّل هذه الأرقام كما تشاء — عرض الجدول نفسه لا يتغيّر. */
    cols: { name: 34, qty: 10, price: 16, total: 18, note: 22 },

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

/* هوية + تصميم الفاتورة — مصدر الحقيقة السحابة (DEMO_DATA بعد السحب).
   لا localStorage كمصدر دائم: النظام سحابي/هجين. تُطبَّق القيم عند
   وصول invoice_print / branding من SettingsSync، وأيضاً هنا إن كانت
   البيانات محمّلة مسبقاً في الذاكرة. */
window.alfaApplyInvoicePrint = function (p) {
  try {
    if (!p || typeof p !== 'object') return;
    const t = window.ALFA_CONFIG.thermal = window.ALFA_CONFIG.thermal || {};
    if (p.restaurant_name) {
      t.restaurantName = p.restaurant_name;
      window.ALFA_CONFIG.restaurantName = p.restaurant_name;
    }
    t.brandingDescription = p.description_line != null ? p.description_line : (t.brandingDescription || '');
    t.addressLine = p.address_line != null ? p.address_line : (t.addressLine || '');
    if (p.logo_url != null) t.logoUrl = p.logo_url;
    if (p.qr_image_url != null) t.qrImageUrl = p.qr_image_url;
    t.showLogo = p.show_logo !== false;
    t.showQr = p.show_qr !== false;
    t.showDrawCode = !!p.show_draw_code;
    t.footerTitle = p.footer_title != null ? p.footer_title : (t.footerTitle || '');
    t.thankYou = p.thank_you != null ? p.thank_you : (t.thankYou || 'شكرا لزيارتكم');
    if (p.font_family) t.fontFamily = p.font_family;
    if (p.logo_max_mm != null) t.logoMaxMm = Number(p.logo_max_mm) || 22;
    if (p.qr_size_mm != null) t.qrSizeMm = Number(p.qr_size_mm) || 25;
    t.show = {
      name: p.show_name !== false,
      description: p.show_description !== false,
      address: p.show_address !== false,
      orderNo: p.show_order_no !== false,
      date: p.show_date !== false,
      customer: p.show_customer !== false,
      orderNotes: p.show_order_notes !== false,
      footerTitle: p.show_footer_title !== false,
      thankYou: p.show_thank_you !== false,
      logo: p.show_logo !== false,
      qr: p.show_qr !== false,
      drawCode: !!p.show_draw_code,
    };
    const base = t.fonts || {};
    const it = Number(p.items_font_size) || base.td || 12;
    const thSz = (p.items_header_font_size != null && p.items_header_font_size !== '')
      ? Number(p.items_header_font_size) : (base.th != null ? base.th : Math.max(7, it - 2.5));
    const nameSz = (p.items_name_font_size != null && p.items_name_font_size !== '')
      ? Number(p.items_name_font_size) : (base.name != null ? base.name : Math.max(7, it - 1));
    const itemNoteSz = (p.items_note_font_size != null && p.items_note_font_size !== '')
      ? Number(p.items_note_font_size) : (base.itemNote != null ? base.itemNote : Math.max(7, it - 1));
    t.fonts = Object.assign({}, base, {
      title: Number(p.restaurant_name_font_size) || base.title || 20,
      sub: Number(p.description_font_size) || base.sub || 14,
      address: Number(p.address_font_size) || base.address || 14,
      no: Number(p.order_number_font_size) || base.no || 26,
      noLabel: Number(p.order_number_font_size) || base.noLabel || 26,
      date: Number(p.order_date_font_size) || base.date || 14,
      cust: Number(p.customer_data_font_size) || base.cust || 12.5,
      note: Number(p.order_notes_font_size) || base.note || 14, /* ملاحظات الطلب فوق الجدول */
      thanks: Number(p.thank_you_font_size) || base.thanks || 16,
      footerTitle: Number(p.footer_title_font_size) || base.footerTitle || base.sub || 14,
      sum: Number(p.sum_font_size) || base.sum || 12.5,
      td: it,
      th: thSz || 9.5,
      name: nameSz || 11,
      itemNote: itemNoteSz || 11, /* ملاحظات الصنف داخل الجدول */
    });
    window.ALFA_CONFIG.branding = Object.assign({}, window.ALFA_CONFIG.branding || {}, {
      name: p.restaurant_name || (window.ALFA_CONFIG.branding && window.ALFA_CONFIG.branding.name) || '',
      address: p.address_line || p.description_line || (window.ALFA_CONFIG.branding && window.ALFA_CONFIG.branding.address) || '',
      phone: p.phone || (window.ALFA_CONFIG.branding && window.ALFA_CONFIG.branding.phone) || '',
      footer: p.thank_you || (window.ALFA_CONFIG.branding && window.ALFA_CONFIG.branding.footer) || '',
    });
  } catch (e) {}
};
try {
  const __cloudPrint = (window.DEMO_DATA && window.DEMO_DATA.invoice_print_settings) || null;
  const __cloudBrand = (window.DEMO_DATA && window.DEMO_DATA.branding) || null;
  if (__cloudBrand && __cloudBrand.name) {
    window.ALFA_CONFIG.branding = Object.assign({}, window.ALFA_CONFIG.branding || {}, __cloudBrand);
    window.ALFA_CONFIG.restaurantName = __cloudBrand.name;
    window.ALFA_CONFIG.thermal.restaurantName = __cloudBrand.name;
  }
  if (__cloudPrint && typeof __cloudPrint === 'object') {
    window.alfaApplyInvoicePrint(__cloudPrint);
  }
} catch (e) {}


// ── نظام الحماية والصلاحيات ──
(function() {
  const role = sessionStorage.getItem('alfaprosys_role');
  const path = window.location.pathname.split('/').pop() || 'index.html';

  /* ── صفحات عامة: لا تحتاج جلسة دخول ──
     track.html = رابط تتبع الطلب الذي يُرسل للزبون؛ كان الحاجز يطرده
     إلى شاشة الدخول فيبدو الرابط «غير صالح» دائماً.
     (qz-key.html مضافة للتوثيق ولأي تحميل لاحق) */
  const PUBLIC_PAGES = ['track.html', 'qz-key.html'];
  if (PUBLIC_PAGES.indexOf(path) >= 0) return;

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
    'edit_invoice.html',
    'customers.html'
  ];

  // التحقق من الصلاحيات
  if (role === 'cashier') {
    if (!cashierAllowed.includes(path)) {
      alert('ليس لديك صلاحية للوصول إلى هذه الشاشة');
      window.location.replace('pos.html');
    }
  }
})();
