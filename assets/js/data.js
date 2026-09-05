// بيانات تجريبية من menu_hierarchy_no_col_b.csv بعد إعادة التنظيم: بروستد ومشوي + دمج السمك والدجاج المشوي.

window.DEMO_DATA = {
  "roles": {
    "manager": {
      "label": "المدير العام",
      "icon": "👑",
      "desc": "مبيعات اليوم، المصاريف، والأرباح"
    },
    "cashier": {
      "label": "الكاشير",
      "icon": "🧾",
      "desc": "نقطة البيع وإصدار الفواتير"
    }
  },
  "categories": [
    {
      "id": "cat_shawarma",
      "name": "الشاورما والشاورما العربي",
      "icon": "🌯",
      "sort_order": 1,
      "is_active": true
    },
    {
      "id": "cat_western",
      "name": "السندويشات والغربي",
      "icon": "🍔",
      "sort_order": 2,
      "is_active": true
    },
    {
      "id": "cat_broasted",
      "name": "بروستد ومشوي",
      "icon": "🍗",
      "sort_order": 3,
      "is_active": true
    },
    {
      "id": "cat_pizza",
      "name": "البيتزا",
      "icon": "🍕",
      "sort_order": 4,
      "is_active": true
    },
    {
      "id": "cat_sides",
      "name": "المقبلات والإضافات",
      "icon": "🍟",
      "sort_order": 5,
      "is_active": true
    },
    {
      "id": "cat_juices",
      "name": "العصائر والكوكتيلات",
      "icon": "🍹",
      "sort_order": 6,
      "is_active": true
    },
    {
      "id": "cat_drinks",
      "name": "المشروبات الباردة",
      "icon": "🥤",
      "sort_order": 7,
      "is_active": true
    }
  ],
  "items": [
    {
      "id": "item_001",
      "category_id": "cat_shawarma",
      "category_name": "الشاورما والشاورما العربي",
      "family": "شاورما عربي",
      "option_name": "شاورما عربي",
      "variant": "صحن - سندويشتين",
      "variant_clean": "صحن سندويشتين",
      "name": "شاورما عربي صحن سندويشتين",
      "price": 60000,
      "is_available": true,
      "sort_order": 1,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_002",
      "category_id": "cat_shawarma",
      "category_name": "الشاورما والشاورما العربي",
      "family": "شاورما عربي",
      "option_name": "شاورما عربي",
      "variant": "صحن - 3سندويشات",
      "variant_clean": "صحن 3سندويشات",
      "name": "شاورما عربي صحن 3سندويشات",
      "price": 90000,
      "is_available": true,
      "sort_order": 2,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_003",
      "category_id": "cat_shawarma",
      "category_name": "الشاورما والشاورما العربي",
      "family": "شاورما عربي",
      "option_name": "شاورما عربي",
      "variant": "صحن - 4 سندويشات",
      "variant_clean": "صحن 4 سندويشات",
      "name": "شاورما عربي صحن 4 سندويشات",
      "price": 120000,
      "is_available": true,
      "sort_order": 3,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_004",
      "category_id": "cat_shawarma",
      "category_name": "الشاورما والشاورما العربي",
      "family": "شاورما عربي",
      "option_name": "شاورما عربي",
      "variant": "صحن - 5 سندويشات",
      "variant_clean": "صحن 5 سندويشات",
      "name": "شاورما عربي صحن 5 سندويشات",
      "price": 150000,
      "is_available": true,
      "sort_order": 4,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_005",
      "category_id": "cat_shawarma",
      "category_name": "الشاورما والشاورما العربي",
      "family": "شاورما عربي",
      "option_name": "شاورما عربي",
      "variant": "صحن - 6 سندويشات",
      "variant_clean": "صحن 6 سندويشات",
      "name": "شاورما عربي صحن 6 سندويشات",
      "price": 180000,
      "is_available": true,
      "sort_order": 5,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_006",
      "category_id": "cat_shawarma",
      "category_name": "الشاورما والشاورما العربي",
      "family": "شاورما عربي",
      "option_name": "شاورما عربي",
      "variant": "صحن - 7 سندويشات",
      "variant_clean": "صحن 7 سندويشات",
      "name": "شاورما عربي صحن 7 سندويشات",
      "price": 210000,
      "is_available": true,
      "sort_order": 6,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_007",
      "category_id": "cat_shawarma",
      "category_name": "الشاورما والشاورما العربي",
      "family": "شاورما",
      "option_name": "شاورما",
      "variant": "وجبة - عادي",
      "variant_clean": "وجبة عادي",
      "name": "شاورما وجبة عادي",
      "price": 35000,
      "is_available": true,
      "sort_order": 7,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_008",
      "category_id": "cat_shawarma",
      "category_name": "الشاورما والشاورما العربي",
      "family": "شاورما",
      "option_name": "شاورما",
      "variant": "وجبة - دبل",
      "variant_clean": "وجبة دبل",
      "name": "شاورما وجبة دبل",
      "price": 45000,
      "is_available": true,
      "sort_order": 8,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_009",
      "category_id": "cat_shawarma",
      "category_name": "الشاورما والشاورما العربي",
      "family": "شاورما",
      "option_name": "شاورما",
      "variant": "سندويش - كبير",
      "variant_clean": "سندويش كبير",
      "name": "شاورما سندويش كبير",
      "price": 40000,
      "is_available": true,
      "sort_order": 9,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_010",
      "category_id": "cat_shawarma",
      "category_name": "الشاورما والشاورما العربي",
      "family": "شاورما",
      "option_name": "شاورما",
      "variant": "سندويش - وسط",
      "variant_clean": "سندويش وسط",
      "name": "شاورما سندويش وسط",
      "price": 30000,
      "is_available": true,
      "sort_order": 10,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_011",
      "category_id": "cat_shawarma",
      "category_name": "الشاورما والشاورما العربي",
      "family": "شاورما",
      "option_name": "شاورما",
      "variant": "سندويش - صغير",
      "variant_clean": "سندويش صغير",
      "name": "شاورما سندويش صغير",
      "price": 25000,
      "is_available": true,
      "sort_order": 11,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_012",
      "category_id": "cat_shawarma",
      "category_name": "الشاورما والشاورما العربي",
      "family": "شاورما",
      "option_name": "شاورما",
      "variant": "سندويش - سمون",
      "variant_clean": "سندويش سمون",
      "name": "شاورما سندويش سمون",
      "price": 30000,
      "is_available": true,
      "sort_order": 12,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_013",
      "category_id": "cat_shawarma",
      "category_name": "الشاورما والشاورما العربي",
      "family": "شاورما",
      "option_name": "شاورما",
      "variant": "خرطوشة",
      "variant_clean": "خرطوشة",
      "name": "شاورما خرطوشة",
      "price": 12000,
      "is_available": true,
      "sort_order": 13,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_014",
      "category_id": "cat_shawarma",
      "category_name": "الشاورما والشاورما العربي",
      "family": "شاورما",
      "option_name": "شاورما",
      "variant": "بالكيلو",
      "variant_clean": "بالكيلو",
      "name": "شاورما بالكيلو",
      "price": 200000,
      "is_available": true,
      "sort_order": 14,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_015",
      "category_id": "cat_western",
      "category_name": "السندويشات والغربي",
      "family": "كريسبي",
      "option_name": "كريسبي",
      "variant": "وجبة - قطع",
      "variant_clean": "وجبة قطع",
      "name": "كريسبي وجبة قطع",
      "price": 75000,
      "is_available": true,
      "sort_order": 15,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_016",
      "category_id": "cat_western",
      "category_name": "السندويشات والغربي",
      "family": "كريسبي",
      "option_name": "كريسبي",
      "variant": "وجبة - طاولة",
      "variant_clean": "وجبة طاولة",
      "name": "كريسبي وجبة طاولة",
      "price": 80000,
      "is_available": true,
      "sort_order": 16,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_017",
      "category_id": "cat_western",
      "category_name": "السندويشات والغربي",
      "family": "كريسبي",
      "option_name": "كريسبي",
      "variant": "وجبة - سمون",
      "variant_clean": "وجبة سمون",
      "name": "كريسبي وجبة سمون",
      "price": 45000,
      "is_available": true,
      "sort_order": 17,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_018",
      "category_id": "cat_western",
      "category_name": "السندويشات والغربي",
      "family": "كريسبي",
      "option_name": "كريسبي",
      "variant": "وجبة - عربي",
      "variant_clean": "وجبة عربي",
      "name": "كريسبي وجبة عربي",
      "price": 40000,
      "is_available": true,
      "sort_order": 18,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_019",
      "category_id": "cat_western",
      "category_name": "السندويشات والغربي",
      "family": "كريسبي",
      "option_name": "كريسبي",
      "variant": "سندويش - عادي",
      "variant_clean": "سندويش عادي",
      "name": "كريسبي سندويش عادي",
      "price": 26000,
      "is_available": true,
      "sort_order": 19,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_020",
      "category_id": "cat_western",
      "category_name": "السندويشات والغربي",
      "family": "كريسبي",
      "option_name": "كريسبي",
      "variant": "سندويش - سمون",
      "variant_clean": "سندويش سمون",
      "name": "كريسبي سندويش سمون",
      "price": 28000,
      "is_available": true,
      "sort_order": 20,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_021",
      "category_id": "cat_western",
      "category_name": "السندويشات والغربي",
      "family": "كريسبي",
      "option_name": "كريسبي",
      "variant": "سندويش - دبل",
      "variant_clean": "سندويش دبل",
      "name": "كريسبي سندويش دبل",
      "price": 36000,
      "is_available": true,
      "sort_order": 21,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_022",
      "category_id": "cat_western",
      "category_name": "السندويشات والغربي",
      "family": "كريسبي",
      "option_name": "كريسبي وجبنة",
      "variant": "سندويش - عادي",
      "variant_clean": "سندويش عادي",
      "name": "كريسبي وجبنة سندويش عادي",
      "price": 30000,
      "is_available": true,
      "sort_order": 22,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_023",
      "category_id": "cat_western",
      "category_name": "السندويشات والغربي",
      "family": "كريسبي",
      "option_name": "كريسبي وجبنة",
      "variant": "سندويش - سمون",
      "variant_clean": "سندويش سمون",
      "name": "كريسبي وجبنة سندويش سمون",
      "price": 30000,
      "is_available": true,
      "sort_order": 23,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_024",
      "category_id": "cat_western",
      "category_name": "السندويشات والغربي",
      "family": "كريسبي",
      "option_name": "كريسبي وجبنة",
      "variant": "سندويش - دبل",
      "variant_clean": "سندويش دبل",
      "name": "كريسبي وجبنة سندويش دبل",
      "price": 40000,
      "is_available": true,
      "sort_order": 24,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_025",
      "category_id": "cat_broasted",
      "category_name": "بروستد ومشوي",
      "family": "بروستد",
      "option_name": "بروستد",
      "variant": "وجبة - دجاجة كاملة",
      "variant_clean": "وجبة دجاجة كاملة",
      "name": "بروستد وجبة دجاجة كاملة",
      "price": 145000,
      "is_available": true,
      "sort_order": 25,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_026",
      "category_id": "cat_broasted",
      "category_name": "بروستد ومشوي",
      "family": "بروستد",
      "option_name": "بروستد",
      "variant": "وجبة - نصف دجاجة",
      "variant_clean": "وجبة نصف دجاجة",
      "name": "بروستد وجبة نصف دجاجة",
      "price": 80000,
      "is_available": true,
      "sort_order": 26,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_027",
      "category_id": "cat_broasted",
      "category_name": "بروستد ومشوي",
      "family": "بروستد",
      "option_name": "بروستد",
      "variant": "طاولة - دجاجة كاملة",
      "variant_clean": "طاولة دجاجة كاملة",
      "name": "بروستد طاولة دجاجة كاملة",
      "price": 160000,
      "is_available": true,
      "sort_order": 27,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_028",
      "category_id": "cat_broasted",
      "category_name": "بروستد ومشوي",
      "family": "بروستد",
      "option_name": "بروستد",
      "variant": "طاولة - نصف دجاجة",
      "variant_clean": "طاولة نصف دجاجة",
      "name": "بروستد طاولة نصف دجاجة",
      "price": 90000,
      "is_available": true,
      "sort_order": 28,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_029",
      "category_id": "cat_broasted",
      "category_name": "بروستد ومشوي",
      "family": "بروستد",
      "option_name": "بروستد",
      "variant": "وجبة - دبوس",
      "variant_clean": "وجبة دبوس",
      "name": "بروستد وجبة دبوس",
      "price": 75000,
      "is_available": true,
      "sort_order": 29,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_030",
      "category_id": "cat_broasted",
      "category_name": "بروستد ومشوي",
      "family": "بروستد",
      "option_name": "بروستد",
      "variant": "وجبة - جناح",
      "variant_clean": "وجبة جناح",
      "name": "بروستد وجبة جناح",
      "price": 55000,
      "is_available": true,
      "sort_order": 30,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_031",
      "category_id": "cat_broasted",
      "category_name": "بروستد ومشوي",
      "family": "سمك",
      "option_name": "سمك",
      "variant": "كيلو",
      "variant_clean": "كيلو",
      "name": "سمك كيلو",
      "price": 110000,
      "is_available": true,
      "sort_order": 31,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_032",
      "category_id": "cat_broasted",
      "category_name": "بروستد ومشوي",
      "family": "سمك",
      "option_name": "سمك",
      "variant": "وجبة",
      "variant_clean": "وجبة",
      "name": "سمك وجبة",
      "price": 50000,
      "is_available": true,
      "sort_order": 32,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_033",
      "category_id": "cat_western",
      "category_name": "السندويشات والغربي",
      "family": "مكسيكي",
      "option_name": "مكسيكي",
      "variant": "سندويشة - عادي",
      "variant_clean": "سندويشة عادي",
      "name": "مكسيكي سندويشة عادي",
      "price": 26000,
      "is_available": true,
      "sort_order": 33,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_034",
      "category_id": "cat_western",
      "category_name": "السندويشات والغربي",
      "family": "مكسيكي",
      "option_name": "مكسيكي",
      "variant": "سندويشة - سمون",
      "variant_clean": "سندويشة سمون",
      "name": "مكسيكي سندويشة سمون",
      "price": 28000,
      "is_available": true,
      "sort_order": 34,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_035",
      "category_id": "cat_western",
      "category_name": "السندويشات والغربي",
      "family": "مكسيكي",
      "option_name": "مكسيكي",
      "variant": "سندويشة - دبل",
      "variant_clean": "سندويشة دبل",
      "name": "مكسيكي سندويشة دبل",
      "price": 36000,
      "is_available": true,
      "sort_order": 35,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_036",
      "category_id": "cat_western",
      "category_name": "السندويشات والغربي",
      "family": "مكسيكي",
      "option_name": "مكسيكي",
      "variant": "وجبة - سمون",
      "variant_clean": "وجبة سمون",
      "name": "مكسيكي وجبة سمون",
      "price": 45000,
      "is_available": true,
      "sort_order": 36,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_037",
      "category_id": "cat_western",
      "category_name": "السندويشات والغربي",
      "family": "مكسيكي",
      "option_name": "مكسيكي وجبنة",
      "variant": "سندويشة - دبل",
      "variant_clean": "سندويشة دبل",
      "name": "مكسيكي وجبنة سندويشة دبل",
      "price": 40000,
      "is_available": true,
      "sort_order": 37,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_038",
      "category_id": "cat_western",
      "category_name": "السندويشات والغربي",
      "family": "زنجر",
      "option_name": "زنجر",
      "variant": "سندويشة - عادي",
      "variant_clean": "سندويشة عادي",
      "name": "زنجر سندويشة عادي",
      "price": 26000,
      "is_available": true,
      "sort_order": 38,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_039",
      "category_id": "cat_western",
      "category_name": "السندويشات والغربي",
      "family": "زنجر",
      "option_name": "زنجر",
      "variant": "سندويشة - سمون",
      "variant_clean": "سندويشة سمون",
      "name": "زنجر سندويشة سمون",
      "price": 28000,
      "is_available": true,
      "sort_order": 39,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_040",
      "category_id": "cat_western",
      "category_name": "السندويشات والغربي",
      "family": "زنجر",
      "option_name": "زنجر",
      "variant": "سندويشة - دبل",
      "variant_clean": "سندويشة دبل",
      "name": "زنجر سندويشة دبل",
      "price": 36000,
      "is_available": true,
      "sort_order": 40,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_041",
      "category_id": "cat_western",
      "category_name": "السندويشات والغربي",
      "family": "زنجر",
      "option_name": "زنجر",
      "variant": "وجبة - سمون",
      "variant_clean": "وجبة سمون",
      "name": "زنجر وجبة سمون",
      "price": 45000,
      "is_available": true,
      "sort_order": 41,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_042",
      "category_id": "cat_western",
      "category_name": "السندويشات والغربي",
      "family": "زنجر",
      "option_name": "زنجر",
      "variant": "وجبة - قطع",
      "variant_clean": "وجبة قطع",
      "name": "زنجر وجبة قطع",
      "price": 75000,
      "is_available": true,
      "sort_order": 42,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_043",
      "category_id": "cat_western",
      "category_name": "السندويشات والغربي",
      "family": "زنجر",
      "option_name": "زنجر وجبنة",
      "variant": "سندويشة - عادي",
      "variant_clean": "سندويشة عادي",
      "name": "زنجر وجبنة سندويشة عادي",
      "price": 30000,
      "is_available": true,
      "sort_order": 43,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_044",
      "category_id": "cat_western",
      "category_name": "السندويشات والغربي",
      "family": "زنجر",
      "option_name": "زنجر وجبنة",
      "variant": "سندويشة - سمون",
      "variant_clean": "سندويشة سمون",
      "name": "زنجر وجبنة سندويشة سمون",
      "price": 30000,
      "is_available": true,
      "sort_order": 44,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_045",
      "category_id": "cat_western",
      "category_name": "السندويشات والغربي",
      "family": "زنجر",
      "option_name": "زنجر وجبنة",
      "variant": "سندويشة - دبل",
      "variant_clean": "سندويشة دبل",
      "name": "زنجر وجبنة سندويشة دبل",
      "price": 40000,
      "is_available": true,
      "sort_order": 45,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_046",
      "category_id": "cat_western",
      "category_name": "السندويشات والغربي",
      "family": "فاهيتا",
      "option_name": "فاهيتا",
      "variant": "سندويشة - عادي",
      "variant_clean": "سندويشة عادي",
      "name": "فاهيتا سندويشة عادي",
      "price": 26000,
      "is_available": true,
      "sort_order": 46,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_047",
      "category_id": "cat_western",
      "category_name": "السندويشات والغربي",
      "family": "فاهيتا",
      "option_name": "فاهيتا",
      "variant": "سندويشة - سمون",
      "variant_clean": "سندويشة سمون",
      "name": "فاهيتا سندويشة سمون",
      "price": 28000,
      "is_available": true,
      "sort_order": 47,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_048",
      "category_id": "cat_western",
      "category_name": "السندويشات والغربي",
      "family": "فاهيتا",
      "option_name": "فاهيتا",
      "variant": "سندويشة - دبل",
      "variant_clean": "سندويشة دبل",
      "name": "فاهيتا سندويشة دبل",
      "price": 36000,
      "is_available": true,
      "sort_order": 48,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_049",
      "category_id": "cat_western",
      "category_name": "السندويشات والغربي",
      "family": "فاهيتا",
      "option_name": "فاهيتا",
      "variant": "وجبة - سمون",
      "variant_clean": "وجبة سمون",
      "name": "فاهيتا وجبة سمون",
      "price": 45000,
      "is_available": true,
      "sort_order": 49,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_050",
      "category_id": "cat_western",
      "category_name": "السندويشات والغربي",
      "family": "برغر",
      "option_name": "برغر جبنة",
      "variant": "سندويشة - عادي",
      "variant_clean": "سندويشة عادي",
      "name": "برغر جبنة سندويشة عادي",
      "price": 28000,
      "is_available": true,
      "sort_order": 50,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_051",
      "category_id": "cat_western",
      "category_name": "السندويشات والغربي",
      "family": "برغر",
      "option_name": "برغر بيض",
      "variant": "سندويشة - عادي",
      "variant_clean": "سندويشة عادي",
      "name": "برغر بيض سندويشة عادي",
      "price": 28000,
      "is_available": true,
      "sort_order": 51,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_052",
      "category_id": "cat_western",
      "category_name": "السندويشات والغربي",
      "family": "برغر",
      "option_name": "برغر بيض وجبنة",
      "variant": "سندويشة - عادي",
      "variant_clean": "سندويشة عادي",
      "name": "برغر بيض وجبنة سندويشة عادي",
      "price": 35000,
      "is_available": true,
      "sort_order": 52,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_053",
      "category_id": "cat_western",
      "category_name": "السندويشات والغربي",
      "family": "برغر",
      "option_name": "برغر دجاج",
      "variant": "سندويشة - عادي",
      "variant_clean": "سندويشة عادي",
      "name": "برغر دجاج سندويشة عادي",
      "price": 27000,
      "is_available": true,
      "sort_order": 53,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_054",
      "category_id": "cat_western",
      "category_name": "السندويشات والغربي",
      "family": "برغر",
      "option_name": "برغر دجاج",
      "variant": "وجبة - عادي",
      "variant_clean": "وجبة عادي",
      "name": "برغر دجاج وجبة عادي",
      "price": 40000,
      "is_available": true,
      "sort_order": 54,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_055",
      "category_id": "cat_western",
      "category_name": "السندويشات والغربي",
      "family": "برغر",
      "option_name": "برغر",
      "variant": "سندويشة - عادي",
      "variant_clean": "سندويشة عادي",
      "name": "برغر سندويشة عادي",
      "price": 28000,
      "is_available": true,
      "sort_order": 55,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_056",
      "category_id": "cat_western",
      "category_name": "السندويشات والغربي",
      "family": "برغر",
      "option_name": "برغر",
      "variant": "سندويشة - دبل",
      "variant_clean": "سندويشة دبل",
      "name": "برغر سندويشة دبل",
      "price": 36000,
      "is_available": true,
      "sort_order": 56,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_057",
      "category_id": "cat_western",
      "category_name": "السندويشات والغربي",
      "family": "سودة",
      "option_name": "سودة",
      "variant": "سندويشة - عادي",
      "variant_clean": "سندويشة عادي",
      "name": "سودة سندويشة عادي",
      "price": 26000,
      "is_available": true,
      "sort_order": 57,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_058",
      "category_id": "cat_western",
      "category_name": "السندويشات والغربي",
      "family": "سودة",
      "option_name": "سودة",
      "variant": "سندويشة - سمون",
      "variant_clean": "سندويشة سمون",
      "name": "سودة سندويشة سمون",
      "price": 28000,
      "is_available": true,
      "sort_order": 58,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_059",
      "category_id": "cat_western",
      "category_name": "السندويشات والغربي",
      "family": "سودة",
      "option_name": "سودة",
      "variant": "سندويشة - سمون دبل",
      "variant_clean": "سندويشة سمون دبل",
      "name": "سودة سندويشة سمون دبل",
      "price": 36000,
      "is_available": true,
      "sort_order": 59,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_060",
      "category_id": "cat_broasted",
      "category_name": "بروستد ومشوي",
      "family": "دجاج",
      "option_name": "دجاج",
      "variant": "مشوي - دجاجة كاملة",
      "variant_clean": "مشوي دجاجة كاملة",
      "name": "دجاج مشوي دجاجة كاملة",
      "price": 100000,
      "is_available": true,
      "sort_order": 60,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_061",
      "category_id": "cat_western",
      "category_name": "السندويشات والغربي",
      "family": "جبنة",
      "option_name": "جبنة",
      "variant": "سندويشة - عادي",
      "variant_clean": "سندويشة عادي",
      "name": "جبنة سندويشة عادي",
      "price": 15000,
      "is_available": true,
      "sort_order": 61,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_062",
      "category_id": "cat_western",
      "category_name": "السندويشات والغربي",
      "family": "جبنة",
      "option_name": "جبنة",
      "variant": "سندويشة - سمون",
      "variant_clean": "سندويشة سمون",
      "name": "جبنة سندويشة سمون",
      "price": 15000,
      "is_available": true,
      "sort_order": 62,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_063",
      "category_id": "cat_western",
      "category_name": "السندويشات والغربي",
      "family": "سكالوب",
      "option_name": "سكالوب",
      "variant": "سندويشة - عادي",
      "variant_clean": "سندويشة عادي",
      "name": "سكالوب سندويشة عادي",
      "price": 26000,
      "is_available": true,
      "sort_order": 63,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_064",
      "category_id": "cat_western",
      "category_name": "السندويشات والغربي",
      "family": "سكالوب",
      "option_name": "سكالوب",
      "variant": "سندويشة - سمون",
      "variant_clean": "سندويشة سمون",
      "name": "سكالوب سندويشة سمون",
      "price": 28000,
      "is_available": true,
      "sort_order": 64,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_065",
      "category_id": "cat_western",
      "category_name": "السندويشات والغربي",
      "family": "سكالوب",
      "option_name": "سكالوب",
      "variant": "سندويشة - دبل",
      "variant_clean": "سندويشة دبل",
      "name": "سكالوب سندويشة دبل",
      "price": 35000,
      "is_available": true,
      "sort_order": 65,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_066",
      "category_id": "cat_western",
      "category_name": "السندويشات والغربي",
      "family": "سكالوب",
      "option_name": "سكالوب",
      "variant": "وجبة - سمون",
      "variant_clean": "وجبة سمون",
      "name": "سكالوب وجبة سمون",
      "price": 45000,
      "is_available": true,
      "sort_order": 66,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_067",
      "category_id": "cat_western",
      "category_name": "السندويشات والغربي",
      "family": "سكالوب",
      "option_name": "سكالوب وجبنة",
      "variant": "سندويشة - عادي",
      "variant_clean": "سندويشة عادي",
      "name": "سكالوب وجبنة سندويشة عادي",
      "price": 30000,
      "is_available": true,
      "sort_order": 67,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_068",
      "category_id": "cat_western",
      "category_name": "السندويشات والغربي",
      "family": "سكالوب",
      "option_name": "سكالوب وجبنة",
      "variant": "سندويشة - سمون",
      "variant_clean": "سندويشة سمون",
      "name": "سكالوب وجبنة سندويشة سمون",
      "price": 32000,
      "is_available": true,
      "sort_order": 68,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_069",
      "category_id": "cat_western",
      "category_name": "السندويشات والغربي",
      "family": "سكالوب",
      "option_name": "سكالوب وجبنة",
      "variant": "سندويشة - دبل",
      "variant_clean": "سندويشة دبل",
      "name": "سكالوب وجبنة سندويشة دبل",
      "price": 45000,
      "is_available": true,
      "sort_order": 69,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_070",
      "category_id": "cat_western",
      "category_name": "السندويشات والغربي",
      "family": "شيش",
      "option_name": "شيش",
      "variant": "سندويشة - عادي",
      "variant_clean": "سندويشة عادي",
      "name": "شيش سندويشة عادي",
      "price": 26000,
      "is_available": true,
      "sort_order": 70,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_071",
      "category_id": "cat_western",
      "category_name": "السندويشات والغربي",
      "family": "شيش",
      "option_name": "شيش",
      "variant": "سندويشة - سمون",
      "variant_clean": "سندويشة سمون",
      "name": "شيش سندويشة سمون",
      "price": 28000,
      "is_available": true,
      "sort_order": 71,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_072",
      "category_id": "cat_western",
      "category_name": "السندويشات والغربي",
      "family": "شيش",
      "option_name": "شيش",
      "variant": "سندويشة - دبل",
      "variant_clean": "سندويشة دبل",
      "name": "شيش سندويشة دبل",
      "price": 36000,
      "is_available": true,
      "sort_order": 72,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_073",
      "category_id": "cat_western",
      "category_name": "السندويشات والغربي",
      "family": "شيش",
      "option_name": "شيش",
      "variant": "وجبة - عربي",
      "variant_clean": "وجبة عربي",
      "name": "شيش وجبة عربي",
      "price": 45000,
      "is_available": true,
      "sort_order": 73,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_074",
      "category_id": "cat_western",
      "category_name": "السندويشات والغربي",
      "family": "شيش",
      "option_name": "شيش",
      "variant": "وجبة - سياخ",
      "variant_clean": "وجبة سياخ",
      "name": "شيش وجبة سياخ",
      "price": 75000,
      "is_available": true,
      "sort_order": 74,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_075",
      "category_id": "cat_western",
      "category_name": "السندويشات والغربي",
      "family": "شيش",
      "option_name": "شيش مع جبنة",
      "variant": "سندويشة عادي",
      "variant_clean": "سندويشة عادي",
      "name": "شيش مع جبنة سندويشة عادي",
      "price": 30000,
      "is_available": true,
      "sort_order": 75,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_076",
      "category_id": "cat_western",
      "category_name": "السندويشات والغربي",
      "family": "شيش",
      "option_name": "شيش مع جبنة",
      "variant": "سندويشة دبل",
      "variant_clean": "سندويشة دبل",
      "name": "شيش مع جبنة سندويشة دبل",
      "price": 45000,
      "is_available": true,
      "sort_order": 76,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_077",
      "category_id": "cat_western",
      "category_name": "السندويشات والغربي",
      "family": "شيش",
      "option_name": "شيش مع جبنة",
      "variant": "سندويشة سمون",
      "variant_clean": "سندويشة سمون",
      "name": "شيش مع جبنة سندويشة سمون",
      "price": 32000,
      "is_available": true,
      "sort_order": 77,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_078",
      "category_id": "cat_western",
      "category_name": "السندويشات والغربي",
      "family": "بطاطا",
      "option_name": "بطاطا",
      "variant": "سندويشة - عادي",
      "variant_clean": "سندويشة عادي",
      "name": "بطاطا سندويشة عادي",
      "price": 11000,
      "is_available": true,
      "sort_order": 78,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_079",
      "category_id": "cat_western",
      "category_name": "السندويشات والغربي",
      "family": "بطاطا",
      "option_name": "بطاطا",
      "variant": "سندويشة - دبل",
      "variant_clean": "سندويشة دبل",
      "name": "بطاطا سندويشة دبل",
      "price": 15000,
      "is_available": true,
      "sort_order": 79,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_080",
      "category_id": "cat_western",
      "category_name": "السندويشات والغربي",
      "family": "بطاطا",
      "option_name": "بطاطا",
      "variant": "سندويشة - دبل سمون",
      "variant_clean": "سندويشة دبل سمون",
      "name": "بطاطا سندويشة دبل سمون",
      "price": 15000,
      "is_available": true,
      "sort_order": 80,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_081",
      "category_id": "cat_western",
      "category_name": "السندويشات والغربي",
      "family": "بطاطا",
      "option_name": "بطاطا",
      "variant": "سندويشة - سمون",
      "variant_clean": "سندويشة سمون",
      "name": "بطاطا سندويشة سمون",
      "price": 14000,
      "is_available": true,
      "sort_order": 81,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_082",
      "category_id": "cat_western",
      "category_name": "السندويشات والغربي",
      "family": "بطاطا",
      "option_name": "بطاطا وجبنة",
      "variant": "سندويشة - عادي",
      "variant_clean": "سندويشة عادي",
      "name": "بطاطا وجبنة سندويشة عادي",
      "price": 18000,
      "is_available": true,
      "sort_order": 82,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_083",
      "category_id": "cat_western",
      "category_name": "السندويشات والغربي",
      "family": "بطاطا",
      "option_name": "بطاطا وجبنة",
      "variant": "سندويشة - سمون",
      "variant_clean": "سندويشة سمون",
      "name": "بطاطا وجبنة سندويشة سمون",
      "price": 20000,
      "is_available": true,
      "sort_order": 83,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_084",
      "category_id": "cat_western",
      "category_name": "السندويشات والغربي",
      "family": "بطاطا",
      "option_name": "بطاطا وجبنة",
      "variant": "سندويشة - دبل",
      "variant_clean": "سندويشة دبل",
      "name": "بطاطا وجبنة سندويشة دبل",
      "price": 25000,
      "is_available": true,
      "sort_order": 84,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_085",
      "category_id": "cat_western",
      "category_name": "السندويشات والغربي",
      "family": "بطاطا",
      "option_name": "بطاطا ومرتديلا",
      "variant": "سندويشة - عادي",
      "variant_clean": "سندويشة عادي",
      "name": "بطاطا ومرتديلا سندويشة عادي",
      "price": 14000,
      "is_available": true,
      "sort_order": 85,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_086",
      "category_id": "cat_western",
      "category_name": "السندويشات والغربي",
      "family": "مرتديلا",
      "option_name": "مرتديلا",
      "variant": "سندويشة - عادي",
      "variant_clean": "سندويشة عادي",
      "name": "مرتديلا سندويشة عادي",
      "price": 13000,
      "is_available": true,
      "sort_order": 86,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_087",
      "category_id": "cat_western",
      "category_name": "السندويشات والغربي",
      "family": "مرتديلا",
      "option_name": "مرتديلا",
      "variant": "سندويشة - دبل",
      "variant_clean": "سندويشة دبل",
      "name": "مرتديلا سندويشة دبل",
      "price": 18000,
      "is_available": true,
      "sort_order": 87,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_088",
      "category_id": "cat_western",
      "category_name": "السندويشات والغربي",
      "family": "مرتديلا",
      "option_name": "مرتديلا",
      "variant": "سندويشة - سمون",
      "variant_clean": "سندويشة سمون",
      "name": "مرتديلا سندويشة سمون",
      "price": 15000,
      "is_available": true,
      "sort_order": 88,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_089",
      "category_id": "cat_pizza",
      "category_name": "البيتزا",
      "family": "بيتزا",
      "option_name": "بيتزا",
      "variant": "صغير",
      "variant_clean": "صغير",
      "name": "بيتزا صغير",
      "price": 35000,
      "is_available": true,
      "sort_order": 89,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_090",
      "category_id": "cat_pizza",
      "category_name": "البيتزا",
      "family": "بيتزا",
      "option_name": "بيتزا",
      "variant": "وسط",
      "variant_clean": "وسط",
      "name": "بيتزا وسط",
      "price": 45000,
      "is_available": true,
      "sort_order": 90,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_091",
      "category_id": "cat_pizza",
      "category_name": "البيتزا",
      "family": "بيتزا",
      "option_name": "بيتزا",
      "variant": "كبير",
      "variant_clean": "كبير",
      "name": "بيتزا كبير",
      "price": 60000,
      "is_available": true,
      "sort_order": 91,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_092",
      "category_id": "cat_pizza",
      "category_name": "البيتزا",
      "family": "بيتزا",
      "option_name": "بيتزا",
      "variant": "عائلي",
      "variant_clean": "عائلي",
      "name": "بيتزا عائلي",
      "price": 80000,
      "is_available": true,
      "sort_order": 92,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_093",
      "category_id": "cat_sides",
      "category_name": "المقبلات والإضافات",
      "family": "بطاطا",
      "option_name": "بطاطا",
      "variant": "صحن - كبير",
      "variant_clean": "صحن كبير",
      "name": "بطاطا صحن كبير",
      "price": 30000,
      "is_available": true,
      "sort_order": 93,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_094",
      "category_id": "cat_sides",
      "category_name": "المقبلات والإضافات",
      "family": "بطاطا",
      "option_name": "بطاطا",
      "variant": "صحن - صغير",
      "variant_clean": "صحن صغير",
      "name": "بطاطا صحن صغير",
      "price": 20000,
      "is_available": true,
      "sort_order": 94,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_095",
      "category_id": "cat_sides",
      "category_name": "المقبلات والإضافات",
      "family": "سلطة سويسرية",
      "option_name": "سلطة سويسرية",
      "variant": "صحن",
      "variant_clean": "صحن",
      "name": "سلطة سويسرية صحن",
      "price": 10000,
      "is_available": true,
      "sort_order": 95,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_096",
      "category_id": "cat_sides",
      "category_name": "المقبلات والإضافات",
      "family": "كتشب",
      "option_name": "كتشب",
      "variant": "علبة",
      "variant_clean": "علبة",
      "name": "كتشب علبة",
      "price": 2000,
      "is_available": true,
      "sort_order": 96,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_097",
      "category_id": "cat_sides",
      "category_name": "المقبلات والإضافات",
      "family": "مايونيز",
      "option_name": "مايونيز",
      "variant": "علبة",
      "variant_clean": "علبة",
      "name": "مايونيز علبة",
      "price": 5000,
      "is_available": true,
      "sort_order": 97,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_098",
      "category_id": "cat_sides",
      "category_name": "المقبلات والإضافات",
      "family": "مخلل",
      "option_name": "مخلل",
      "variant": "سرفيس",
      "variant_clean": "سرفيس",
      "name": "مخلل سرفيس",
      "price": 5000,
      "is_available": true,
      "sort_order": 98,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_099",
      "category_id": "cat_sides",
      "category_name": "المقبلات والإضافات",
      "family": "صوص جبنة",
      "option_name": "صوص جبنة",
      "variant": "علبة",
      "variant_clean": "علبة",
      "name": "صوص جبنة علبة",
      "price": 2000,
      "is_available": true,
      "sort_order": 99,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_100",
      "category_id": "cat_sides",
      "category_name": "المقبلات والإضافات",
      "family": "صوص",
      "option_name": "صوص",
      "variant": "علبة",
      "variant_clean": "علبة",
      "name": "صوص علبة",
      "price": 2000,
      "is_available": true,
      "sort_order": 100,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_101",
      "category_id": "cat_sides",
      "category_name": "المقبلات والإضافات",
      "family": "خبز",
      "option_name": "خبز",
      "variant": "ربطة",
      "variant_clean": "ربطة",
      "name": "خبز ربطة",
      "price": 13000,
      "is_available": true,
      "sort_order": 101,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_102",
      "category_id": "cat_juices",
      "category_name": "العصائر والكوكتيلات",
      "family": "عصير",
      "option_name": "عصير",
      "variant": "كوكتيل - حليب وموز",
      "variant_clean": "كوكتيل حليب وموز",
      "name": "عصير كوكتيل حليب وموز",
      "price": 20000,
      "is_available": true,
      "sort_order": 102,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_103",
      "category_id": "cat_juices",
      "category_name": "العصائر والكوكتيلات",
      "family": "عصير",
      "option_name": "عصير",
      "variant": "كوكتيل - فريز",
      "variant_clean": "كوكتيل فريز",
      "name": "عصير كوكتيل فريز",
      "price": 20000,
      "is_available": true,
      "sort_order": 103,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_104",
      "category_id": "cat_juices",
      "category_name": "العصائر والكوكتيلات",
      "family": "عصير",
      "option_name": "عصير",
      "variant": "كوكتيل - فواكه",
      "variant_clean": "كوكتيل فواكه",
      "name": "عصير كوكتيل فواكه",
      "price": 20000,
      "is_available": true,
      "sort_order": 104,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_105",
      "category_id": "cat_juices",
      "category_name": "العصائر والكوكتيلات",
      "family": "عصير",
      "option_name": "عصير",
      "variant": "كوكتيل - حليب وفريز",
      "variant_clean": "كوكتيل حليب وفريز",
      "name": "عصير كوكتيل حليب وفريز",
      "price": 20000,
      "is_available": true,
      "sort_order": 105,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_106",
      "category_id": "cat_juices",
      "category_name": "العصائر والكوكتيلات",
      "family": "عصير",
      "option_name": "عصير",
      "variant": "كوكتيل - افوكادو",
      "variant_clean": "كوكتيل افوكادو",
      "name": "عصير كوكتيل افوكادو",
      "price": 30000,
      "is_available": true,
      "sort_order": 106,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_107",
      "category_id": "cat_juices",
      "category_name": "العصائر والكوكتيلات",
      "family": "عصير",
      "option_name": "عصير",
      "variant": "كوكتيل - توت",
      "variant_clean": "كوكتيل توت",
      "name": "عصير كوكتيل توت",
      "price": 20000,
      "is_available": true,
      "sort_order": 107,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_108",
      "category_id": "cat_juices",
      "category_name": "العصائر والكوكتيلات",
      "family": "عصير",
      "option_name": "عصير",
      "variant": "كوكتيل - موز وحليب وفريز",
      "variant_clean": "كوكتيل موز وحليب وفريز",
      "name": "عصير كوكتيل موز وحليب وفريز",
      "price": 20000,
      "is_available": true,
      "sort_order": 108,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_109",
      "category_id": "cat_juices",
      "category_name": "العصائر والكوكتيلات",
      "family": "عصير",
      "option_name": "عصير",
      "variant": "كوكتيل - برتقال",
      "variant_clean": "كوكتيل برتقال",
      "name": "عصير كوكتيل برتقال",
      "price": 20000,
      "is_available": true,
      "sort_order": 109,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_110",
      "category_id": "cat_juices",
      "category_name": "العصائر والكوكتيلات",
      "family": "عصير",
      "option_name": "عصير",
      "variant": "كوكتيل - منغا",
      "variant_clean": "كوكتيل منغا",
      "name": "عصير كوكتيل منغا",
      "price": 20000,
      "is_available": true,
      "sort_order": 110,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_111",
      "category_id": "cat_juices",
      "category_name": "العصائر والكوكتيلات",
      "family": "عصير",
      "option_name": "عصير",
      "variant": "لتر ونصف",
      "variant_clean": "لتر ونصف",
      "name": "عصير لتر ونصف",
      "price": 85000,
      "is_available": true,
      "sort_order": 111,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_112",
      "category_id": "cat_drinks",
      "category_name": "المشروبات الباردة",
      "family": "مشروبات باردة",
      "option_name": "مشروبات باردة",
      "variant": "بيبسي - عائلي",
      "variant_clean": "بيبسي عائلي",
      "name": "مشروبات باردة بيبسي عائلي",
      "price": 18000,
      "is_available": true,
      "sort_order": 112,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_113",
      "category_id": "cat_drinks",
      "category_name": "المشروبات الباردة",
      "family": "مشروبات باردة",
      "option_name": "مشروبات باردة",
      "variant": "بيبسي - لتر",
      "variant_clean": "بيبسي لتر",
      "name": "مشروبات باردة بيبسي لتر",
      "price": 11000,
      "barcode": "6291000113017",
      "is_available": true,
      "sort_order": 113,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_114",
      "category_id": "cat_drinks",
      "category_name": "المشروبات الباردة",
      "family": "مشروبات باردة",
      "option_name": "مشروبات باردة",
      "variant": "بيبسي - تنك",
      "variant_clean": "بيبسي تنك",
      "name": "مشروبات باردة بيبسي تنك",
      "price": 8000,
      "barcode": "6291000114014",
      "is_available": true,
      "sort_order": 114,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_115",
      "category_id": "cat_drinks",
      "category_name": "المشروبات الباردة",
      "family": "مشروبات باردة",
      "option_name": "مشروبات باردة",
      "variant": "سفن - عائلي",
      "variant_clean": "سفن عائلي",
      "name": "مشروبات باردة سفن عائلي",
      "price": 18000,
      "is_available": true,
      "sort_order": 115,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_116",
      "category_id": "cat_drinks",
      "category_name": "المشروبات الباردة",
      "family": "مشروبات باردة",
      "option_name": "مشروبات باردة",
      "variant": "سفن - لتر",
      "variant_clean": "سفن لتر",
      "name": "مشروبات باردة سفن لتر",
      "price": 11000,
      "is_available": true,
      "sort_order": 116,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_117",
      "category_id": "cat_drinks",
      "category_name": "المشروبات الباردة",
      "family": "مشروبات باردة",
      "option_name": "مشروبات باردة",
      "variant": "سفن - تنك",
      "variant_clean": "سفن تنك",
      "name": "مشروبات باردة سفن تنك",
      "price": 8000,
      "is_available": true,
      "sort_order": 117,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_118",
      "category_id": "cat_drinks",
      "category_name": "المشروبات الباردة",
      "family": "مشروبات باردة",
      "option_name": "مشروبات باردة",
      "variant": "مكسي - جوال",
      "variant_clean": "مكسي جوال",
      "name": "مشروبات باردة مكسي جوال",
      "price": 5000,
      "barcode": "6291000118015",
      "is_available": true,
      "sort_order": 118,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    },
    {
      "id": "item_119",
      "category_id": "cat_drinks",
      "category_name": "المشروبات الباردة",
      "family": "مشروبات باردة",
      "option_name": "مشروبات باردة",
      "variant": "عيران",
      "variant_clean": "عيران",
      "name": "مشروبات باردة عيران",
      "price": 5000,
      "barcode": "6291000119012",
      "is_available": true,
      "sort_order": 119,
      "cost_mode": "manual",
      "cost_manual": 0,
      "order_count": 0,
      "is_pinned_popular": false,
      "image_url": null
    }
  ],
  "orderTypes": [
    {
      "id": "dinein",
      "label": "طاولة",
      "icon": "🍽️"
    },
    {
      "id": "takeaway",
      "label": "سفري",
      "icon": "🥡"
    },
    {
      "id": "delivery",
      "label": "توصيل",
      "icon": "🛵"
    },
    {
      "id": "contract",
      "label": "عقود",
      "icon": "📋"
    }
  ],
  "tables": [
    "طاولة 1",
    "طاولة 2",
    "طاولة 3",
    "طاولة 4",
    "طاولة 5",
    "طاولة 6",
    "طاولة 7",
    "طاولة 8",
    "طاولة 9",
    "طاولة 10",
    "طاولة 11",
    "طاولة 12"
  ]
};

// بيانات عملاء تجريبية — لاحقًا ستأتي من Supabase أو من تطبيق الطلبات الأونلاين
window.DEMO_DATA.customers = window.DEMO_DATA.customers || [
  {
    id: 'cus_001', name: 'محمد الأحمد',
    phone: '0991234567', whatsapp: '0991234567', address: 'حي الروضة - قرب المدرسة',
    type: 'regular',   // regular | contract | vip | delivery
    notes: ''
  },
  {
    id: 'cus_002', name: 'أم خالد',
    phone: '0987654321', whatsapp: '', address: 'شارع السوق - بناء النور',
    type: 'vip',
    notes: 'زبونة دائمة منذ 2022'
  },
  {
    id: 'cus_003', name: 'شركة الربيع للتموين',
    phone: '0112233445', whatsapp: '0944556677', address: 'المنطقة الصناعية - مستودع 4',
    type: 'contract',
    notes: 'عقد سنوي — وجبات يومية للموظفين',
    contract_price_list: 'standard_contract',  // مرجع قائمة أسعار العقد
    credit_limit:   3000000,   // سقف الذمة بالليرة
    credit_balance: 1750000,   // الذمة المستحقة حالياً
    next_due_date:  '2026-09-05',
    payments: [
      { id: 'pay_001', date: '2026-08-01', amount: 500000, note: 'دفعة أول الشهر'    },
      { id: 'pay_002', date: '2026-08-15', amount: 750000, note: 'تسوية جزئية'       },
      { id: 'pay_003', date: '2026-09-01', amount: 500000, note: 'دفعة مجدولة'       },
    ]
  },
  {
    id: 'cus_004', name: 'مطبخ البلد',
    phone: '0933221100', whatsapp: '0933221100', address: 'الحي التجاري - شارع النصر',
    type: 'contract',
    notes: 'عقد ربع سنوي — طلبات أسبوعية',
    contract_price_list: 'standard_contract',
    credit_limit:   2000000,
    credit_balance: 2050000,   // تجاوز السقف — تنبيه
    next_due_date:  '2026-08-28',
    payments: [
      { id: 'pay_010', date: '2026-07-10', amount: 300000, note: '' },
    ]
  },
  {
    id: 'cus_005', name: 'أبو رامي',
    phone: '0955443322', whatsapp: '', address: 'شارع الشهداء',
    type: 'delivery',
    notes: 'زبون توصيل منتظم'
  },
];

/* ── الترقيم اليومي ──
   الدور = رقم الفاتورة. رقم مجرد فقط (001) بلا أحرف.
   اليوم الإداري يبدأ 08:00 صباحاً وينتهي 05:00 فجراً:
   أي طلب قبل الساعة 8 يتبع تسلسل اليوم الإداري السابق،
   وعند الساعة 8 صباحاً يبدأ التسلسل من جديد من 001 تلقائياً. */
const _alfaBD = function (offsetDays) {
  const p = function (n) { return String(n).padStart(2, '0'); };
  const s = new Date(Date.now() - 8 * 3600e3 - (offsetDays || 0) * 86400e3);
  return s.getFullYear() + '-' + p(s.getMonth() + 1) + '-' + p(s.getDate());
};
const ALFA_TODAY = _alfaBD(0);
const ALFA_YESTERDAY = _alfaBD(1);

// فواتير تجريبية مفتوحة ومغلقة للكاشير — لاحقًا من Supabase orders/order_items
window.DEMO_DATA.invoices = window.DEMO_DATA.invoices || [
  {
    id: ALFA_TODAY + '-001', no: 1, date: ALFA_TODAY,
    type: 'table', hall: 'صالة داخلية', table_label: 'طاولة 3',
    customer_name: '', phone: '', cashier: 'محمود عثمان',
    status: 'open', pay_type: null, total: 311000, time: '10:15', is_new_customer: false,
    items: [
      { id: 'item_025',   name: 'بروستد وجبة دجاجة كاملة',    qty: 2, price: 145000, total: 290000, note: 'ثوم زيادة، بدون حار' },
      { id: 'item_114',             name: 'مشروبات باردة بيبسي تنك',     qty: 2, price: 8000,   total: 16000,  note: '' },
      { id: 'item_119',             name: 'مشروبات باردة عيران',          qty: 1, price: 5000,   total: 5000,   note: '' }
    ]
  },
  {
    id: ALFA_TODAY + '-002', no: 2, date: ALFA_TODAY,
    type: 'table', hall: 'صالة العائلات', table_label: 'طاولة 7',
    customer_name: '', phone: '', cashier: 'محمود عثمان',
    status: 'open', pay_type: null, total: 180000, time: '10:22', is_new_customer: false,
    items: [
      { id: 'item_002', name: 'شاورما عربي صحن 3 سندويشات', qty: 2, price: 90000, total: 180000, note: '' }
    ]
  },
  {
    id: ALFA_YESTERDAY + '-008', no: 8, date: ALFA_YESTERDAY,
    type: 'takeaway', hall: '', table_label: '',
    customer_name: '', phone: '', cashier: 'محمود عثمان',
    status: 'printed', pay_type: 'cash', total: 155000, time: '10:05', is_new_customer: false,
    items: [
      { id: 'item_015', name: 'كريسبي وجبة قطع',    qty: 1, price: 75000, total: 75000,  note: '' },
      { id: 'item_009', name: 'شاورما سندويش كبير', qty: 2, price: 40000, total: 80000,  note: 'بدون مخلل' }
    ]
  },
  {
    id: ALFA_YESTERDAY + '-007', no: 7, date: ALFA_YESTERDAY,
    type: 'table', hall: 'صالة خارجية', table_label: 'طاولة 1',
    customer_name: '', phone: '', cashier: 'محمود عثمان',
    status: 'printed', pay_type: 'partial', total: 226000, time: '09:55', is_new_customer: false,
    items: [
      { id: 'item_025',  name: 'بروستد وجبة دجاجة كاملة',    qty: 1, price: 145000, total: 145000, note: '' },
      { id: 'item_008',            name: 'شاورما وجبة دبل',              qty: 1, price: 45000,  total: 45000,  note: 'ثوم زيادة' },
      { id: 'item_104',            name: 'عصير كوكتيل فواكه',            qty: 1, price: 20000,  total: 20000,  note: '' },
      { id: 'item_113',            name: 'مشروبات باردة بيبسي لتر',      qty: 1, price: 11000,  total: 11000,  note: '' },
      { id: 'item_119',            name: 'مشروبات باردة عيران',           qty: 1, price: 5000,   total: 5000,   note: '' }
    ]
  },
  {
    id: ALFA_YESTERDAY + '-006', no: 6, date: ALFA_YESTERDAY,
    type: 'delivery', hall: '', table_label: '',
    customer_name: 'محمد الأحمد', phone: '0991234567', cashier: 'محمود عثمان',
    status: 'printed', pay_type: 'wallet', total: 85000, time: '09:40', is_new_customer: false,
    items: [
      { id: 'item_111', name: 'عصير لتر ونصف', qty: 1, price: 85000, total: 85000, note: '' }
    ]
  },
  {
    id: ALFA_YESTERDAY + '-005', no: 5, date: ALFA_YESTERDAY,
    type: 'table', hall: 'صالة داخلية', table_label: 'طاولة 5',
    customer_name: '', phone: '', cashier: 'محمود عثمان',
    status: 'cancelled', pay_type: null, cancel_reason: 'طلب العميل الإلغاء', total: 70000, time: '09:20', is_new_customer: false,
    items: [
      { id: 'item_007', name: 'شاورما وجبة عادي', qty: 2, price: 35000, total: 70000, note: '' }
    ]
  },
  {
    id: ALFA_YESTERDAY + '-004', no: 4, date: ALFA_YESTERDAY,
    type: 'takeaway', hall: '', table_label: '',
    customer_name: '', phone: '', cashier: 'محمود عثمان',
    status: 'printed', pay_type: 'cash', total: 163000, time: '09:10', is_new_customer: false,
    items: [
      { id: 'item_025', name: 'بروستد وجبة دجاجة كاملة', qty: 1, price: 145000, total: 145000, note: 'بدون صوص' },
      { id: 'item_119',           name: 'مشروبات باردة عيران',      qty: 1, price: 5000,   total: 5000,   note: '' },
      { id: 'item_118',           name: 'مشروبات باردة مكسي جوال', qty: 1, price: 5000,   total: 5000,   note: '' },
      { id: 'item_114',           name: 'مشروبات باردة بيبسي تنك', qty: 1, price: 8000,   total: 8000,   note: '' }
    ]
  },
  {
    id: ALFA_YESTERDAY + '-003', no: 3, date: ALFA_YESTERDAY,
    type: 'delivery', hall: '', table_label: '',
    customer_name: 'أم خالد', phone: '0987654321', cashier: 'محمود عثمان',
    status: 'printed', pay_type: 'deferred', total: 170000, time: '08:55', is_new_customer: true,
    items: [
      { id: 'item_002', name: 'شاورما عربي صحن 3 سندويشات', qty: 1, price: 90000, total: 90000, note: '' },
      { id: 'item_092',   name: 'بيتزا عائلي',           qty: 1, price: 80000, total: 80000, note: '' }
    ]
  },
  {
    id: ALFA_YESTERDAY + '-002', no: 2, date: ALFA_YESTERDAY,
    type: 'takeaway', hall: '', table_label: '',
    customer_name: '', phone: '', cashier: 'محمود عثمان',
    status: 'printed', pay_type: 'cash', total: 126000, time: '08:30', is_new_customer: false,
    items: [
      { id: 'item_001', name: 'شاورما عربي صحن سندويشتين', qty: 1, price: 60000, total: 60000, note: '' },
      { id: 'item_007', name: 'شاورما وجبة عادي',           qty: 1, price: 35000, total: 35000, note: '' },
      { id: 'item_094', name: 'بطاطا صحن صغير',           qty: 1, price: 20000, total: 20000, note: '' },
      { id: 'item_113', name: 'مشروبات باردة بيبسي لتر',    qty: 1, price: 11000, total: 11000, note: '' }
    ]
  },
  {
    id: ALFA_YESTERDAY + '-001', no: 1, date: ALFA_YESTERDAY,
    type: 'table', hall: 'صالة داخلية', table_label: 'طاولة 2',
    customer_name: '', phone: '', cashier: 'محمود عثمان',
    status: 'printed', pay_type: 'cash', total: 348000, time: '08:10', is_new_customer: true,
    items: [
      { id: 'item_025', name: 'بروستد وجبة دجاجة كاملة',    qty: 2, price: 145000, total: 290000, note: '' },
      { id: 'item_009',           name: 'شاورما سندويش كبير',          qty: 1, price: 40000,  total: 40000,  note: 'ثوم زيادة' },
      { id: 'item_112',           name: 'مشروبات باردة بيبسي عائلي',  qty: 1, price: 18000,  total: 18000,  note: '' }
    ]
  },
  {
    id: ALFA_YESTERDAY + '-009', no: 9, date: ALFA_YESTERDAY,
    type: 'table', hall: 'صالة العائلات', table_label: 'طاولة 5',
    customer_name: 'أبو علي', phone: '', cashier: 'سارة منصور',
    status: 'pending', pay_type: null, total: 185000, time: '12:45', is_new_customer: false,
    pending_reason: 'العميل يفكر في الطلب',
    items: [
      { id: 'item_007', name: 'شاورما وجبة عادي',  qty: 3, price: 35000, total: 105000, note: '' },
      { id: 'item_016', name: 'كريسبي وجبة طاولة', qty: 1, price: 80000, total: 80000,  note: 'بدون حار'  }
    ]
  }
];

window.DEMO_DATA.cashierSession = window.DEMO_DATA.cashierSession || {
  shift_open: false,
  cashbox_open: false,
  shift_opened_at: '',
  cashbox_opened_at: '',
  opening_cash: 0,
  current_cash: 0,
  cashier_name: 'الكاشير'
};

/* ================================================================
   بيانات الموظفين
   ================================================================ */
window.DEMO_DATA.employees = window.DEMO_DATA.employees || [
  {
    id: 'emp_001',
    name: 'محمود عثمان',
    age: 28,
    role: 'كاشير',
    shift: 'صباحية',
    shift_start: '08:00', shift_end: '16:00',
    salary_type: 'monthly',   // daily | weekly | monthly
    salary_amount: 1500000,
    hire_date: '2024-03-01',
    phone: '0991112233',
    notes: '',
    salary_log: [
      { id: 'sl_001', date: '2026-08-01', amount: 1500000, type: 'salary', note: 'راتب أغسطس'  },
      { id: 'sl_002', date: '2026-07-01', amount: 1500000, type: 'salary', note: 'راتب يوليو'  },
      { id: 'sl_003', date: '2026-08-15', amount: 200000,  type: 'advance', note: 'سلفة شخصية' },
    ],
    deductions_log: []
  },
  {
    id: 'emp_002',
    name: 'أحمد الشيخ',
    age: 35,
    role: 'طاهي',
    shift: 'صباحية',
    shift_start: '07:00', shift_end: '15:00',
    salary_type: 'monthly',
    salary_amount: 2000000,
    hire_date: '2023-10-15',
    phone: '0944556677',
    notes: 'متخصص في المشاوي',
    salary_log: [
      { id: 'sl_004', date: '2026-08-01', amount: 2000000, type: 'salary',  note: 'راتب أغسطس'   },
      { id: 'sl_005', date: '2026-07-01', amount: 2000000, type: 'salary',  note: 'راتب يوليو'   },
    ],
    deductions_log: [
      { id: 'dl_001', date: '2026-08-10', amount: 50000, reason: 'غياب يوم' }
    ]
  },
  {
    id: 'emp_003',
    name: 'رامي حسن',
    age: 22,
    role: 'نادل',
    shift: 'مسائية',
    shift_start: '16:00', shift_end: '00:00',
    salary_type: 'daily',
    salary_amount: 60000,
    hire_date: '2026-01-10',
    phone: '0933445566',
    notes: '',
    salary_log: [
      { id: 'sl_006', date: '2026-08-20', amount: 420000, type: 'salary', note: '7 أيام عمل' },
    ],
    deductions_log: []
  },
  {
    id: 'emp_004',
    name: 'سارة منصور',
    age: 30,
    role: 'كاشير',
    shift: 'مسائية',
    shift_start: '16:00', shift_end: '00:00',
    salary_type: 'monthly',
    salary_amount: 1400000,
    hire_date: '2025-06-01',
    phone: '0955667788',
    notes: '',
    salary_log: [],
    deductions_log: []
  }
];

/* ================================================================
   سجل الورديات التاريخي
   ================================================================ */
window.DEMO_DATA.shifts_history = window.DEMO_DATA.shifts_history || [];

/* ================================================================
   المخزون — inventory
   ================================================================ */
window.DEMO_DATA.inventory = window.DEMO_DATA.inventory || [

  /* ── دواجن ── */
  {
    id: 'inv_001', name: 'دجاج كامل للبروستد', category: 'دواجن',
    unit: 'قطعة', qty: 45, min_qty: 10,
    cost_per_unit: 35000,
    trackable: true,   // يُحسب تلقائياً من الفواتير
    recipe: [
      /* item_id : كمية من هذه المادة تُستهلك لكل وحدة مباعة */
      { item_id: 'item_025', qty: 1   },  // وجبة دجاجة كاملة
      { item_id: 'item_027', qty: 1   },  // طاولة دجاجة كاملة
      { item_id: 'item_026', qty: 0.5 },  // وجبة نصف دجاجة
      { item_id: 'item_028', qty: 0.5 },  // طاولة نصف دجاجة
      { item_id: 'item_029', qty: 0.25},  // وجبة دبوس
      { item_id: 'item_030', qty: 0.25},  // وجبة جناح
    ],
    log: [
      { id:'il_001', date:'2026-08-29', type:'in',  qty:50, note:'مشتريات الصباح', cost:35000 },
      { id:'il_002', date:'2026-08-29', type:'out', qty:18, note:'مبيعات اليوم - تلقائي', auto:true },
    ]
  },
  {
    id: 'inv_002', name: 'صدر دجاج مسحب (شاورما)', category: 'دواجن',
    unit: 'كغ', qty: 22.5, min_qty: 5,
    cost_per_unit: 28000,
    trackable: true,
    recipe: [
      /* ~200غ صدر لكل سندويش؛ الصحون بعدد السندويشات */
      { item_id: 'item_001', qty: 0.4 },   // صحن سندويشتين
      { item_id: 'item_002', qty: 0.6 },   // صحن 3
      { item_id: 'item_003', qty: 0.8 },   // صحن 4
      { item_id: 'item_004', qty: 1.0 },   // صحن 5
      { item_id: 'item_005', qty: 1.2 },   // صحن 6
      { item_id: 'item_006', qty: 1.4 },   // صحن 7
      { item_id: 'item_007', qty: 0.2 },   // وجبة عادي
      { item_id: 'item_008', qty: 0.3 },   // وجبة دبل
      { item_id: 'item_009', qty: 0.2 },   // سندويش كبير
      { item_id: 'item_010', qty: 0.15 },  // وسط
      { item_id: 'item_011', qty: 0.12 },  // صغير
      { item_id: 'item_012', qty: 0.2 },   // سمون
      { item_id: 'item_013', qty: 0.15 },  // خرطوشة
      { item_id: 'item_014', qty: 1.0 },   // بالكيلو
    ],
    log: [
      { id:'il_003', date:'2026-08-29', type:'in',  qty:30, note:'مشتريات الصباح', cost:28000 },
      { id:'il_004', date:'2026-08-29', type:'out', qty:7.5, note:'مبيعات اليوم - تلقائي', auto:true },
    ]
  },

  /* ── مخبوزات ── */
  {
    id: 'inv_003', name: 'خبز صاج / شراك', category: 'مخبوزات',
    unit: 'ربطة', qty: 8, min_qty: 3,
    cost_per_unit: 8000,
    trackable: true,
    loaves_per_bundle: 10,   // عدد الأرغفة في الربطة
    recipe: [
      // شاورما عربي صحون (سندويشتين→7) — كل صحن = عدد سندويشاته / 10
      { item_id: 'item_001', qty: 2/10 },   // صحن سندويشتين
      { item_id: 'item_002', qty: 3/10 },   // صحن 3 سندويشات
      { item_id: 'item_003', qty: 4/10 },   // صحن 4
      { item_id: 'item_004', qty: 5/10 },   // صحن 5
      { item_id: 'item_005', qty: 6/10 },   // صحن 6
      { item_id: 'item_006', qty: 7/10 },   // صحن 7
      // شاورما وجبة — رغيف واحد كبير = 2/10 ربطة
      { item_id: 'item_007', qty: 2/10 },   // وجبة عادي
      { item_id: 'item_008', qty: 2/10 },   // وجبة دبل
      // سندويشات شاورما بالخبز الشراك
      { item_id: 'item_009', qty: 1/10 },   // سندويش كبير
      { item_id: 'item_010', qty: 1/10 },   // سندويش وسط
      { item_id: 'item_011', qty: 1/10 },   // سندويش صغير
      { item_id: 'item_013', qty: 2/10 },   // شاورما خرطوشة
      // زنجر وكريسبي عربي
      { item_id: 'item_018', qty: 1/10 },   // كريسبي وجبة عربي
      { item_id: 'item_038', qty: 1/10 },   // زنجر سندويشة عادي
      { item_id: 'item_039', qty: 1/10 },   // زنجر سندويشة سمون (شراك)
      // شيش طاووق عربي
      { item_id: 'item_073', qty: 2/10 },   // شيش وجبة عربي
    ],
    log: [
      { id:'il_005', date:'2026-08-29', type:'in',  qty:15, note:'توريد الصباح', cost:8000 },
      { id:'il_006', date:'2026-08-29', type:'out', qty:3, note:'مبيعات - تلقائي', auto:true },
    ]
  },
  {
    id: 'inv_004', name: 'سمون شاورما كبير', category: 'مخبوزات',
    unit: 'قطعة', qty: 60, min_qty: 20,
    cost_per_unit: 1500,
    trackable: true,
    recipe: [
      // شاورما وجبات بالسمون
      { item_id: 'item_007', qty: 1 },   // شاورما وجبة عادي
      { item_id: 'item_008', qty: 1 },   // شاورما وجبة دبل
      // كريسبي بالسمون
      { item_id: 'item_017', qty: 1 },   // كريسبي وجبة سمون
      { item_id: 'item_020', qty: 1 },   // كريسبي سندويش سمون
      { item_id: 'item_023', qty: 1 },   // كريسبي وجبنة سندويش سمون
      // مكسيكي وزنجر وسكالوب وشيش بالسمون
      { item_id: 'item_034', qty: 1 },   // مكسيكي سندويشة سمون
      { item_id: 'item_036', qty: 1 },   // مكسيكي وجبة سمون
      { item_id: 'item_039', qty: 1 },   // زنجر سندويشة سمون
      { item_id: 'item_041', qty: 1 },   // زنجر وجبة سمون
      { item_id: 'item_044', qty: 1 },   // زنجر وجبنة سندويشة سمون
      { item_id: 'item_047', qty: 1 },   // فاهيتا سندويشة سمون
      { item_id: 'item_049', qty: 1 },   // فاهيتا وجبة سمون
      { item_id: 'item_058', qty: 1 },   // سودة سندويشة سمون
      { item_id: 'item_059', qty: 1 },   // سودة سندويشة سمون دبل
      { item_id: 'item_064', qty: 1 },   // سكالوب سندويشة سمون
      { item_id: 'item_066', qty: 1 },   // سكالوب وجبة سمون
      { item_id: 'item_068', qty: 1 },   // سكالوب وجبنة سندويشة سمون
      { item_id: 'item_071', qty: 1 },   // شيش سندويشة سمون
      { item_id: 'item_074', qty: 2 },   // شيش وجبة سياخ (سمونة كبيرة)
      { item_id: 'item_077', qty: 1 },   // شيش مع جبنة سندويشة سمون
      { item_id: 'item_081', qty: 1 },   // بطاطا سندويشة سمون
      { item_id: 'item_083', qty: 1 },   // بطاطا وجبنة سمون
      { item_id: 'item_088', qty: 1 },   // مرتديلا سندويشة سمون
      { item_id: 'item_012', qty: 1 },   // شاورما سندويش سمون
    ],
    log: [
      { id:'il_007', date:'2026-08-29', type:'in', qty:100, note:'توريد', cost:1500 },
      { id:'il_007b', date:'2026-08-29', type:'out', qty:22, note:'مبيعات - تلقائي', auto:true },
    ]
  },

  /* ── دجاج كريسبي / مكسيكي / زنجر (فيليه) ── */
  {
    id: 'inv_008', name: 'فيليه دجاج (شرائح)', category: 'دواجن',
    unit: 'كغ', qty: 18, min_qty: 5,
    cost_per_unit: 32000,
    trackable: true,
    recipe: [
      // كريسبي — كل وحدة ≈ 150غ
      { item_id: 'item_015', qty: 0.15 },  // كريسبي وجبة قطع
      { item_id: 'item_016', qty: 0.15 },  // كريسبي وجبة طاولة
      { item_id: 'item_017', qty: 0.15 },  // كريسبي وجبة سمون
      { item_id: 'item_018', qty: 0.15 },  // كريسبي وجبة عربي
      { item_id: 'item_019', qty: 0.15 },  // كريسبي سندويش عادي
      { item_id: 'item_020', qty: 0.15 },  // كريسبي سندويش سمون
      { item_id: 'item_021', qty: 0.30 },  // كريسبي سندويش دبل
      { item_id: 'item_022', qty: 0.15 },
      { item_id: 'item_023', qty: 0.15 },
      { item_id: 'item_024', qty: 0.30 },
      // مكسيكي
      { item_id: 'item_033', qty: 0.15 },
      { item_id: 'item_034', qty: 0.15 },
      { item_id: 'item_035', qty: 0.30 },
      { item_id: 'item_036', qty: 0.15 },
      { item_id: 'item_037', qty: 0.30 },
      // زنجر
      { item_id: 'item_038', qty: 0.15 },
      { item_id: 'item_039', qty: 0.15 },
      { item_id: 'item_040', qty: 0.30 },
      { item_id: 'item_041', qty: 0.15 },
      { item_id: 'item_042', qty: 0.15 },
      { item_id: 'item_043', qty: 0.15 },
      { item_id: 'item_044', qty: 0.15 },
      { item_id: 'item_045', qty: 0.30 },
      // فاهيتا
      { item_id: 'item_046', qty: 0.15 },
      { item_id: 'item_047', qty: 0.15 },
      { item_id: 'item_048', qty: 0.30 },
      { item_id: 'item_049', qty: 0.15 },
      // سودة
      { item_id: 'item_057', qty: 0.15 },
      { item_id: 'item_058', qty: 0.15 },
      { item_id: 'item_059', qty: 0.30 },
      // سكالوب
      { item_id: 'item_063', qty: 0.15 },
      { item_id: 'item_064', qty: 0.15 },
      { item_id: 'item_065', qty: 0.30 },
      { item_id: 'item_066', qty: 0.15 },
      { item_id: 'item_067', qty: 0.15 },
      { item_id: 'item_068', qty: 0.15 },
      { item_id: 'item_069', qty: 0.30 },
      // برغر دجاج
      { item_id: 'item_053', qty: 0.15 },
      { item_id: 'item_054', qty: 0.15 },
    ],
    log: [
      { id:'il_020', date:'2026-08-28', type:'in', qty:25, note:'مشتريات', cost:32000 },
      { id:'il_021', date:'2026-08-29', type:'out', qty:7, note:'مبيعات - تلقائي', auto:true },
    ]
  },

  /* ── دجاج مشوي (شيش + شيش طاووق) ── */
  {
    id: 'inv_009', name: 'دجاج مشوي / شيش طاووق', category: 'دواجن',
    unit: 'كغ', qty: 10, min_qty: 3,
    cost_per_unit: 30000,
    trackable: true,
    recipe: [
      { item_id: 'item_060', qty: 0.8 },   // دجاج مشوي كاملة ≈ 800غ
      { item_id: 'item_070', qty: 0.12 },  // شيش سندويشة عادي
      { item_id: 'item_071', qty: 0.12 },  // شيش سندويشة سمون
      { item_id: 'item_072', qty: 0.24 },  // شيش سندويشة دبل
      { item_id: 'item_073', qty: 0.2  },  // شيش وجبة عربي
      { item_id: 'item_074', qty: 0.3  },  // شيش وجبة سياخ
      { item_id: 'item_075', qty: 0.12 },
      { item_id: 'item_076', qty: 0.24 },
      { item_id: 'item_077', qty: 0.12 },
    ],
    log: [
      { id:'il_022', date:'2026-08-28', type:'in', qty:15, note:'مشتريات', cost:30000 },
      { id:'il_023', date:'2026-08-29', type:'out', qty:3, note:'مبيعات - تلقائي', auto:true },
    ]
  },

  /* ── زيوت ── */
  {
    id: 'inv_005', name: 'زيت نباتي للقلي', category: 'زيوت وتوابل',
    unit: 'لتر', qty: 40, min_qty: 10,
    cost_per_unit: 12000,
    trackable: false,   // يدوي فقط — لا توجد وصفة جزئية دقيقة
    recipe: [],
    log: [
      { id:'il_008', date:'2026-08-28', type:'in', qty:50, note:'شراء', cost:12000 },
      { id:'il_009', date:'2026-08-29', type:'out', qty:10, note:'استهلاك يومي', auto:false },
    ]
  },

  /* ── أرز ── */
  {
    id: 'inv_006', name: 'أرز أبيض', category: 'حبوب',
    unit: 'كغ', qty: 30, min_qty: 8,
    cost_per_unit: 9000,
    trackable: false,
    recipe: [],
    log: [
      { id:'il_010', date:'2026-08-28', type:'in', qty:50, note:'مشتريات', cost:9000 },
    ]
  },

  /* ── مشروبات معبأة ── */
  {
    id: 'inv_007', name: 'بيبسي تنك 330مل', category: 'مشروبات',
    unit: 'قطعة', qty: 120, min_qty: 24,
    cost_per_unit: 5000,
    trackable: true,
    recipe: [
      { item_id: 'item_114', qty: 1 },   // مشروبات باردة بيبسي تنك
    ],
    log: [
      { id:'il_011', date:'2026-08-28', type:'in', qty:144, note:'توريد', cost:5000 },
      { id:'il_012', date:'2026-08-29', type:'out', qty:24, note:'مبيعات - تلقائي', auto:true },
    ]
  },
  {
    id: 'inv_010', name: 'سفن أب تنك 330مل', category: 'مشروبات',
    unit: 'قطعة', qty: 72, min_qty: 12,
    cost_per_unit: 5000,
    trackable: true,
    recipe: [
      { item_id: 'item_117', qty: 1 },   // مشروبات باردة سفن تنك
    ],
    log: [
      { id:'il_013', date:'2026-08-28', type:'in', qty:72, note:'توريد', cost:5000 },
    ]
  },
  {
    id: 'inv_011', name: 'عيران', category: 'مشروبات',
    unit: 'قطعة', qty: 48, min_qty: 12,
    cost_per_unit: 3500,
    trackable: true,
    recipe: [
      { item_id: 'item_119', qty: 1 },   // مشروبات باردة عيران
    ],
    log: [
      { id:'il_014', date:'2026-08-28', type:'in', qty:48, note:'توريد', cost:3500 },
    ]
  },
  {
    id: 'inv_012', name: 'بيبسي لتر', category: 'مشروبات',
    unit: 'قطعة', qty: 36, min_qty: 6,
    cost_per_unit: 8000,
    trackable: true,
    recipe: [
      { item_id: 'item_113', qty: 1 },   // بيبسي لتر
    ],
    log: [
      { id:'il_015', date:'2026-08-28', type:'in', qty:36, note:'توريد', cost:8000 },
    ]
  },
  {
    id: 'inv_013', name: 'بيبسي عائلي 2.25لتر', category: 'مشروبات',
    unit: 'قطعة', qty: 24, min_qty: 6,
    cost_per_unit: 14000,
    trackable: true,
    recipe: [
      { item_id: 'item_112', qty: 1 },   // بيبسي عائلي
    ],
    log: [
      { id:'il_016', date:'2026-08-28', type:'in', qty:24, note:'توريد', cost:14000 },
    ]
  },

  /* ── بطاطا مجمدة ── */
  {
    id: 'inv_014', name: 'بطاطا مجمدة', category: 'خضار',
    unit: 'كغ', qty: 25, min_qty: 8,
    cost_per_unit: 12000,
    trackable: true,
    recipe: [
      // كل وجبة بطاطا ≈ 200غ، صحن كبير ≈ 400غ
      { item_id: 'item_093', qty: 0.4 },  // بطاطا صحن كبير
      { item_id: 'item_094', qty: 0.2 },  // بطاطا صحن صغير
      // وجبات تُقدَّم معها بطاطا جانبية ≈ 150غ
      { item_id: 'item_015', qty: 0.15 }, // كريسبي وجبة قطع
      { item_id: 'item_016', qty: 0.15 }, // كريسبي وجبة طاولة
      { item_id: 'item_017', qty: 0.15 }, // كريسبي وجبة سمون
      { item_id: 'item_018', qty: 0.15 }, // كريسبي وجبة عربي
      { item_id: 'item_025', qty: 0.2  }, // بروستد دجاجة كاملة
      { item_id: 'item_026', qty: 0.15 }, // بروستد نصف دجاجة
      { item_id: 'item_027', qty: 0.2  }, // بروستد طاولة كاملة
      { item_id: 'item_028', qty: 0.15 }, // بروستد طاولة نصف
      { item_id: 'item_036', qty: 0.15 }, // مكسيكي وجبة سمون
      { item_id: 'item_041', qty: 0.15 }, // زنجر وجبة سمون
      { item_id: 'item_042', qty: 0.2  }, // زنجر وجبة قطع
      { item_id: 'item_049', qty: 0.15 }, // فاهيتا وجبة سمون
      { item_id: 'item_054', qty: 0.15 }, // برغر دجاج وجبة
      { item_id: 'item_066', qty: 0.15 }, // سكالوب وجبة سمون
      { item_id: 'item_074', qty: 0.15 }, // شيش وجبة سياخ
      // سندويشات بطاطا — نسبة قليلة كإضافة
      { item_id: 'item_078', qty: 0.1  },
      { item_id: 'item_079', qty: 0.2  },
      { item_id: 'item_080', qty: 0.2  },
      { item_id: 'item_081', qty: 0.1  },
      { item_id: 'item_082', qty: 0.1  },
      { item_id: 'item_083', qty: 0.1  },
      { item_id: 'item_084', qty: 0.2  },
      { item_id: 'item_085', qty: 0.1  },
    ],
    log: [
      { id:'il_017', date:'2026-08-28', type:'in', qty:30, note:'مشتريات', cost:12000 },
      { id:'il_018', date:'2026-08-29', type:'out', qty:5, note:'مبيعات - تلقائي', auto:true },
    ]
  },

  /* ── لحمة مشوية (شيش/سودة) ── */
  {
    id: 'inv_015', name: 'لحمة غنم / شيش لحمة', category: 'لحوم',
    unit: 'كغ', qty: 8, min_qty: 2,
    cost_per_unit: 85000,
    trackable: true,
    recipe: [
      { item_id: 'item_057', qty: 0.15 },  // سودة سندويشة عادي
      { item_id: 'item_058', qty: 0.15 },  // سودة سندويشة سمون
      { item_id: 'item_059', qty: 0.30 },  // سودة سندويشة سمون دبل
    ],
    log: [
      { id:'il_019', date:'2026-08-28', type:'in', qty:10, note:'مشتريات', cost:85000 },
    ]
  },
];

/* ================================================================
   العقود — contracts
   ================================================================ */
window.DEMO_DATA.contracts = window.DEMO_DATA.contracts || [
  {
    id: 'con_001',
    client_name: 'السيد أحمد الزعيم',
    company: 'شركة الربيع للتموين',
    customer_id: 'cus_003',
    contract_type: 'monthly',     // daily | weekly | monthly | custom
    start_date: '2026-08-01',
    end_date:   '2026-10-31',
    status: 'active',             // active | paused | expired | cancelled
    items: [
      { item_id: 'item_007', name: 'شاورما وجبة عادي',  qty: 10, price: 35000, note: '' },
      { item_id: 'item_025', name: 'بروستد دجاجة كاملة', qty: 5, price: 130000, note: 'بدون حار' },
    ],
    delivery_time: '13:00',
    payment_method: 'installments', // cash | installments
    installments: [
      { id: 'ci_001', due_date: '2026-09-01', amount: 1500000, paid: true,  paid_date: '2026-09-01' },
      { id: 'ci_002', due_date: '2026-10-01', amount: 1500000, paid: false, paid_date: '' },
    ],
    notes: 'توصيل يومي للموظفين',
    total_value: 3000000,
  },
  {
    id: 'con_002',
    client_name: 'السيد كريم منصور',
    company: 'مطبخ البلد',
    customer_id: 'cus_004',
    contract_type: 'weekly',
    start_date: '2026-08-15',
    end_date:   '2026-11-15',
    status: 'active',
    items: [
      { item_id: 'item_002', name: 'شاورما عربي صحن 3 سندويشات', qty: 8, price: 90000, note: '' },
    ],
    delivery_time: '12:30',
    payment_method: 'cash',
    installments: [],
    notes: '',
    total_value: 720000,
  },
];

/* ── الطلبات الأونلاين الواردة (تُربط لاحقًا بجدول DB أو Google Sheet) ── */
window.DEMO_DATA.online_orders = window.DEMO_DATA.online_orders || [
  {
    id: 'ON-103', created_at: '2026-08-31T10:42:00',
    customer: { name: 'ليث حداد', phone: '0934111222', address: 'المزة ـ بناء 12، ط3' },
    items: [
      { name: 'عصير برتقال طبيعي', qty: 2, price: 12000, note: 'بدون سكر' },
      { name: 'كوكتيل فواكه كبير', qty: 1, price: 15000, note: '' },
    ],
    subtotal: 39000, delivery_fee: 5000, discount: 0, total: 44000,
    payment: 'cash', status: 'new', source: 'online',
  },
  {
    id: 'ON-102', created_at: '2026-08-31T10:12:00',
    customer: { name: 'شركة الربيع للتموين', phone: '0114555666', address: 'المنطقة الصناعية ـ مبنى 4' },
    items: [
      { name: 'شاورما وجبة عادي', qty: 10, price: 35000, note: '' },
      { name: 'مشروبات باردة عيران', qty: 10, price: 5000, note: '' },
    ],
    subtotal: 400000, delivery_fee: 0, discount: 40000, total: 360000,
    payment: 'credit', status: 'new', source: 'online',
  },
  {
    id: 'ON-101', created_at: '2026-08-31T09:30:00',
    customer: { name: 'أم خالد', phone: '0991234567', address: 'كفرسوسة ـ شارع 10' },
    items: [ { name: 'بروستد وجبة دجاجة كاملة', qty: 1, price: 145000, note: 'ثوم زيادة' } ],
    subtotal: 145000, delivery_fee: 5000, discount: 0, total: 150000,
    payment: 'cash', status: 'done', source: 'online', invoice_id: ALFA_YESTERDAY + '-006', no: 6, date: ALFA_YESTERDAY,
  },
];

/* العروض — ينشئها المدير من الإعدادات، واختصفي تلقائي عند انتهاء مدتها */
window.DEMO_DATA.offers = window.DEMO_DATA.offers || [
  { id: 'ofr_001', title: 'وجبة العائلة — 3 شاورما عربي', price: 240000, active: true, expires_at: '2026-09-30',
    items: [{ item_id: 'item_002', qty: 3 }] },
  { id: 'ofr_002', title: 'خذ 2 بيبسي تنك + عيران مجاناً', price: 16000, active: true, expires_at: null,
    items: [{ item_id: 'item_114', qty: 2 }, { item_id: 'item_119', qty: 1, free: true }] },
  { id: 'ofr_003', title: 'عرض منتهٍ (تجريبي)', price: 9000, active: true, expires_at: '2026-08-01',
    items: [{ item_id: 'item_113', qty: 1 }] },
];

/* إعدادات الخصم — يحددها المدير من شاشة الإعدادات (الكاشير يرى ما هنا فقط) */
window.DEMO_DATA.discount_settings = window.DEMO_DATA.discount_settings || {
  invoice_pct: 0,   // نسبة تُخصم تلقائياً من كل فاتورة (0 = بلا خصم) — يعتمدها المدير
  items: [          // خصومات تلقائية على أصناف محددة (تظهر نسبتها بجانب الصنف)
    { item_id: 'item_002', pct: 15 },
    { item_id: 'item_114', pct: 10 },
  ],
};

/* إعدادات الأسعار والعملة — آخر سعر دولار وآخر تغيير جماعي */
window.DEMO_DATA.price_settings = window.DEMO_DATA.price_settings || {
  usd_rate: 15000,
  updated_at: '2026-08-20',
  last_change: null,   // { rate, pct, direction, at }
};

/* ================================================================
   طبقة العمل دون اتصال (Offline-first) — IndexedDB
   - تسترجع AlfaProSysDB فوق البيانات التجريبية (مع هجرة localStorage).
   - تلتقط الكتابات العلوية عبر Proxy → حفظ + طابور.
   - تحفظ عند الإخفاء/المغادرة والنقر (يلتقط التعديلات المتداخلة).
   - الصفحات تبدأ عبر window.alfaStart بعد اكتمال التحميل.
   ================================================================ */
(function () {
  if (window.__ALFA_OFFLINE_BOOTED) return;
  window.__ALFA_OFFLINE_BOOTED = true;

  const base = window.DEMO_DATA;
  const _cfg = window.ALFA_CONFIG || {};
  const _sb = _cfg.supabase || {};
  /* لا نمسح البيانات التجريبية لمجرد وجود مفاتيح Supabase بالإعدادات —
     فقط عند الربط الفعلي (syncEnabled: true)، لأن الـ pull() سيملأها فوراً بعدها.
     هذا يمنع ظهور لوحة الإدارة فارغة (كل الأرقام صفر) وقت التجربة قبل الربط الحقيقي. */
  if (_cfg.syncEnabled && _sb.url && _sb.anonKey) {
    base.categories = [];
    base.items = [];
    base.offers = [];
    base.discount_settings = { invoice_pct: 0, items: [] };
    base.invoices = [];
    base.contracts = [];
    base.online_orders = [];
  }
  window.__ALFA_MERGING = true;

  let saveTimer = null;
  function persistNow() {
    if (window.__ALFA_MERGING) return;
    if (window.SyncStorage) window.SyncStorage.save(base);
  }
  function persistSoon() {
    if (window.__ALFA_MERGING) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(persistNow, 400);
  }
  window.alfaPersist = persistNow;

  window.DEMO_DATA = new Proxy(base, {
    set(t, k, v) {
      t[k] = v;
      persistSoon();
      return true;
    }
  });

  if (typeof window.addEventListener === 'function') {
    window.addEventListener('beforeunload', persistNow);
    window.addEventListener('pagehide', persistNow);
    window.addEventListener('online', function () { if (window.SyncRemote) window.SyncRemote.flush(); });
  }
  if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') persistNow();
    });
    document.addEventListener('click', persistSoon, true);
    document.addEventListener('change', persistSoon, true);
  }

  window.resetDemo = function () {
    window.__ALFA_MERGING = true;
    const p = (window.SyncStorage && window.SyncStorage.clear) ? window.SyncStorage.clear() : Promise.resolve();
    Promise.resolve(p).then(function () {
      if (window.SyncQueue) window.SyncQueue.clear();
      location.reload();
    });
  };

  // 5.5) مساعدات الترقيم اليومي المشتركة (الدور = رقم الفاتورة)
  // اليوم الإداري: يفتح 08:00 ويغلق 05:00 فجر اليوم التالي.
  window.businessDay = function (d) {
    const t = d ? new Date(d) : new Date();
    const s = new Date(t.getTime() - 8 * 3600e3);
    const p = function (n) { return String(n).padStart(2, '0'); };
    return s.getFullYear() + '-' + p(s.getMonth() + 1) + '-' + p(s.getDate());
  };
  window.padNo = function (n) { return String(Number(n || 0)).padStart(3, '0'); };
  window.invoiceNo = function (inv) {
    if (!inv) return '';
    if (inv.no != null) return window.padNo(inv.no);
    const m = /(\d+)\s*$/.exec(String(inv.id || ''));
    return m ? window.padNo(+m[1]) : '—';
  };
  window.invNoLabel = function (inv) {
    return window.invoiceNo ? window.invoiceNo(inv) : String((inv && inv.id) || '');
  };
  window.nextDailyNo = function () {
    const today = window.businessDay();
    let max = 0;
    (window.DEMO_DATA.invoices || []).forEach(function (i) {
      const d = i.date || (i.created_at ? window.businessDay(i.created_at) : null);
      if (d === today && +i.no > max) max = +i.no;
    });
    (window.DEMO_DATA.online_orders || []).forEach(function (o) {
      if (o.date === today && +o.no > max) max = +o.no;
    });
    return max + 1;
  };
  window.nextInvoiceId = function () {
    const today = window.businessDay();
    return today + '-' + window.padNo(window.nextDailyNo());
  };

  window.NetBadge = {
    html(id) {
      return `<button type="button" class="net-badge" id="${id || 'netBadge'}" title="حالة الاتصال"></button>`;
    },
    refresh() {
      document.querySelectorAll('.net-badge').forEach(el => {
        const on = navigator.onLine !== false;
        const pend = window.SyncQueue ? SyncQueue.count() : 0;
        el.className = 'net-badge ' + (on ? 'net-on' : 'net-off');
        el.innerHTML = `<span class="net-dot"></span><span>${on ? 'متصل' : 'دون اتصال'}</span>` +
          (pend ? `<span class="net-pend">${pend}⏳</span>` : '');
        el.title = on
          ? (pend ? `${pend} عملية بانتظار المزامنة — سترفع تلقائياً عند الربط` : 'متصل — كل العمليات متزامنة')
          : `العمل دون اتصال شغّال${pend ? ` · ${pend} عملية في الطابور` : ''}`;
      });
    },
    bind() {
      if (window.__NETBADGE_BOUND) { this.refresh(); return; }
      window.__NETBADGE_BOUND = true;
      window.addEventListener('online', () => this.refresh());
      window.addEventListener('offline', () => this.refresh());
      setInterval(() => this.refresh(), 15000);
      document.addEventListener('click', ev => {
        const b = ev.target.closest && ev.target.closest('.net-badge');
        if (!b) return;
        const pend = window.SyncQueue ? SyncQueue.count() : 0;
        if (navigator.onLine === false) { alert('النظام يعمل دون اتصال — الطلبات تُحفظ محلياً وترفع عند عودة الإنترنت.'); return; }
        if (window.SyncRemote) SyncRemote.flush().then(r => {
          if (r && r.skipped) alert(`العمليات المحفوظة محلياً: ${pend}\nسيبدأ الرفع الفعلي تلقائياً بعد ربط قاعدة البيانات.`);
          else { if (window.SyncQueue) SyncQueue.clear(); this.refresh(); }
        });
      });
      this.refresh();
    },
  };

  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      try {
        if (/e2b\.app$/i.test(location.hostname)) {
          navigator.serviceWorker.getRegistrations().then(function (rs) {
            rs.forEach(function (r) { r.unregister(); });
          });
          return;
        }
      } catch (e) {}
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
  }

  let readyResolve;
  window.__ALFA_READY_P = new Promise(function (r) { readyResolve = r; });
  window.alfaStart = function (fn) {
    window.__ALFA_READY_P.then(function () {
      function run() { try { fn(); } catch (e) { console.error(e); } }
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
      else run();
    });
  };

  let finished = false;
  function finish(saved, queue) {
    if (finished) return;
    finished = true;
    window.__ALFA_MERGING = true;
    if (saved && typeof saved === 'object') {
      const cloud = !!(window.ALFA_CONFIG && ALFA_CONFIG.supabase && ALFA_CONFIG.supabase.url && ALFA_CONFIG.supabase.anonKey);
      const posKeys = { items: 1, categories: 1, offers: 1, discount_settings: 1, invoices: 1, contracts: 1, online_orders: 1,
        employees: 1, suppliers: 1, inventory: 1, audit_log: 1, delivery_agents: 1,
        loyalty: 1, loyalty_ledger: 1, price_settings: 1, expenditures: 1, material_purchases: 1 };
      for (const k of Object.keys(saved)) {
        if (cloud && posKeys[k]) continue;
        base[k] = saved[k];
      }
    }
    if (window.SyncQueue && window.SyncQueue.hydrate) window.SyncQueue.hydrate(queue || []);
    window.__ALFA_MERGING = false;
    const done = function () { readyResolve(); };
    if (navigator.onLine !== false) {
      const first = [];
      if (window.MenuSync && MenuSync.pull) first.push(MenuSync.pull());
      if (window.CustomerSync && CustomerSync.pull) first.push(CustomerSync.pull());
      if (window.InvoiceSync && InvoiceSync.pull) first.push(InvoiceSync.pull());
      if (window.SessionSync && SessionSync.pull) first.push(SessionSync.pull());
      if (window.AgentSync && AgentSync.pull) first.push(AgentSync.pull());
      if (first.length) {
        const t = setTimeout(done, 10000);
        Promise.all(first).then(function () {
          const next = (window.PosSync && PosSync.pull) ? PosSync.pull() : Promise.resolve();
          return next.then(function () {
            return (window.ManagerSync && ManagerSync.pull) ? ManagerSync.pull() : null;
          });
        }).then(function () {
          clearTimeout(t);
          try { if (window.alfaPersist) window.alfaPersist(); } catch (e) {}
          done();
        }).catch(function () { clearTimeout(t); done(); });
      } else done();
    } else {
      if (window.AlfaCloud) window.AlfaCloud.menu = { state: 'offline', error: 'بدون إنترنت' };
      done();
    }
  }

  const loadData = (window.SyncStorage && window.SyncStorage.load)
    ? Promise.resolve(window.SyncStorage.load())
    : Promise.resolve(null);
  const loadQ = (window.SyncStorage && window.SyncStorage.loadQueue)
    ? Promise.resolve(window.SyncStorage.loadQueue())
    : Promise.resolve([]);
  const hang = setTimeout(function () { finish(null, []); }, 4000);
  Promise.all([loadData, loadQ]).then(function (res) {
    clearTimeout(hang);
    finish(res[0], res[1]);
  }).catch(function () {
    clearTimeout(hang);
    finish(null, []);
  });
})();

/* الموردون (خطة شاشات الإدارة) */
window.DEMO_DATA.suppliers = window.DEMO_DATA.suppliers || [
  { id: 'sup_001', name: 'مؤسسة الفردوس للدواجن', phone: '0991112233', materials: 'دجاج، صدر مسحب، أجنحة', notes: 'توريد يومي فجراً' },
  { id: 'sup_002', name: 'شركة البركة للتموين', phone: '0115556677', materials: 'بيبسي، عيران، ماء', notes: 'دفع آجل نهاية الشهر' },
  { id: 'sup_003', name: 'مخبز الحي الغربي', phone: '0944445566', materials: 'خبز عربي، صاج', notes: '' },
];

/* سجل التعديلات الموحد (audit) — يكتب فيه كل النظام عبر AlfaAudit.log */
window.DEMO_DATA.audit_log = window.DEMO_DATA.audit_log || [
  { id: 1, at: '2026-08-31T14:05:00', module: 'invoices', action: 'إلغاء فاتورة', detail: 'إلغاء 2026-08-30-004 — السبب: طلب العميل الإلغاء', who: 'الكاشير' },
  { id: 2, at: '2026-08-31T15:20:00', module: 'settings', action: 'تغيير أسعار جماعي', detail: 'رفع 15% بتقريب أقرب 1,000 ل.س', who: 'المدير' },
];
window.__auditSeq = (window.DEMO_DATA.audit_log.reduce((m, l) => Math.max(m, l.id), 0) || 0) + 1;
window.AlfaAudit = {
  log(module, action, detail, who) {
    try {
      const d = new Date();
      const row = {
        id: window.__auditSeq++,
        at: d.toISOString().slice(0, 10) + 'T' + d.toTimeString().slice(0, 5),
        module, action, detail: String(detail || ''), who: who || 'المستخدم',
      };
      window.DEMO_DATA.audit_log.unshift(row);
      if (window.AuditSync && AuditSync.pushOne) AuditSync.pushOne(row);
    } catch (e) {}
  },
};

/* 🎁 الولاء — نقاط ومستويات ومكافآت (تبويب داخل شاشة العملاء) */
window.DEMO_DATA.loyalty = window.DEMO_DATA.loyalty || {
  pointsPer1000: 1,   // نقطة لكل 1,000 ل.س مشتريات (يدرّها المدير)
  rewards: [
    { id: 'rwd_001', title: 'مشروب بارد مجاني', cost: 50,  kind: 'item',   value: 'مشروب بارد حسب التوفر' },
    { id: 'rwd_002', title: 'سندويش شاورما مجاني', cost: 120, kind: 'item', value: 'شاورما عربي صحن/سندويش' },
    { id: 'rwd_003', title: 'كوبون خصم 25,000 ل.س', cost: 200, kind: 'coupon', value: 25000 },
  ],
};
window.DEMO_DATA.loyalty_ledger = window.DEMO_DATA.loyalty_ledger || [
  { id: 1, customer_id: 'cus_002', at: '2026-08-20T12:00', type: 'manual_add', pts: 50, note: 'هدية انضمام للبرنامج', by: 'المدير' },
];
window.__loySeq = ((window.DEMO_DATA.loyalty_ledger.reduce((m,l)=>Math.max(m,l.id),0))||0) + 1;
window.Loyalty = {
  earned(c) {
    const ph = String(c.phone || '').trim();
    if (!ph) return 0;
    const rate = window.DEMO_DATA.loyalty.pointsPer1000 || 1;
    const spent = (window.DEMO_DATA.invoices || [])
      .filter(i => i.status !== 'cancelled' && String(i.phone || '').trim() === ph)
      .reduce((s, i) => s + (i.total || 0), 0);
    return Math.floor(spent / 1000 * rate);
  },
  points(c) {
    const led = (window.DEMO_DATA.loyalty_ledger || []).filter(l => l.customer_id === c.id);
    const delta = led.reduce((s, l) =>
      l.type === 'manual_add' ? s + l.pts : (l.type === 'manual_sub' || l.type === 'redeem') ? s - l.pts : s, 0);
    return Math.max(0, this.earned(c) + delta);
  },
  level(pts) {
    if (pts >= 500) return { key: 'gold',   icon: '🥇', label: 'ذهبي', cls: 'loy-gold' };
    if (pts >= 100) return { key: 'silver', icon: '🥈', label: 'فضي',  cls: 'loy-silver' };
    return { key: 'bronze', icon: '🥉', label: 'برونزي', cls: 'loy-bronze' };
  },
  add(customerId, type, pts, note) {
    const row = {
      id: window.__loySeq++, customer_id: customerId,
      at: new Date().toISOString().slice(0,10) + 'T' + new Date().toTimeString().slice(0,5),
      type, pts: Math.abs(Number(pts) || 0), note: note || '', by: 'المدير',
    };
    window.DEMO_DATA.loyalty_ledger.unshift(row);
    if (window.LoyaltySync && LoyaltySync.pushOne) LoyaltySync.pushOne(row);
  },
};

/* ================================================================
   بيانات التوصيل — عمال وشركات
   ================================================================ */
window.DEMO_DATA.delivery_agents = window.DEMO_DATA.delivery_agents || [
  { id: 'drv_001', name: 'أبو راتب',      type: 'employee', phone: '0933112233', fee_per_trip: 0,     notes: 'داخل البلد — مجاناً', is_active: true },
  { id: 'drv_002', name: 'بلال حسن',      type: 'employee', phone: '0944223344', fee_per_trip: 0,     notes: 'داخل البلد — مجاناً', is_active: true },
  { id: 'drv_003', name: 'طلبات (شركة)',  type: 'company',  phone: '0911000001', fee_per_trip: 5000,  notes: 'رسوم ثابتة 5000 ل.س', is_active: true },
  { id: 'drv_004', name: 'هنقرستيشن',    type: 'company',  phone: '0911000002', fee_per_trip: 8000,  notes: 'رسوم ثابتة 8000 ل.س', is_active: true },
];

/* حقل delivery_info يُضاف على كل فاتورة توصيل عند الإسناد:
   { agent_id, agent_name, status, fee, assigned_at, delivered_at, customer_feedback } */
