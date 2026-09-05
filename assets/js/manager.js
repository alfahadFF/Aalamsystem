/* ================================================================
   manager.js — لوحة الإدارة (Dashboard)
   alfaprosys — standalone, href-based navigation
   ================================================================ */

const DATA = window.DEMO_DATA;

/* ── أدوات ── */
function today() {
  return new Date().toLocaleDateString('ar-EG', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
}

/* ================================================================
   قائمة التنقل — روابط مباشرة لكل صفحة مستقلة
   ================================================================ */
const MGR_NAV = window.AlfaNav.MGR_NAV;
const CURRENT = 'dashboard';
const navLink = window.AlfaNav.linker(CURRENT);

/* ── حالة ── */
let navOpen = false;

function toggleNav() {
  navOpen = !navOpen;
  document.getElementById('mgrMobileNav')?.classList.toggle('expanded', navOpen);
  document.getElementById('mgrNavScrim')?.classList.toggle('show', navOpen);
}
function closeNav() {
  navOpen = false;
  document.getElementById('mgrMobileNav')?.classList.remove('expanded');
  document.getElementById('mgrNavScrim')?.classList.remove('show');
}

/* ================================================================
   البناء الرئيسي
   ================================================================ */
function renderApp() {
  const invoices   = DATA.invoices   || [];
  const employees  = DATA.employees  || [];
  const categories = DATA.categories || [];
  const items      = DATA.items      || [];

  const open       = invoices.filter(i => i.status === 'open');
  const closed     = invoices.filter(i => i.status === 'printed');
  const totalSales = closed.reduce((s, i) => s + (i.total || 0), 0);
  const session    = DATA.cashierSession || {};
  const openCash   = session.opening_cash || 0;
  const purchasesArr = DATA.material_purchases || [];
  const expensesArr = DATA.expenditures || [];
  const purchases = purchasesArr.reduce((sum, p) => sum + (p.total || 0), 0);
  const expenses = expensesArr.reduce((sum, x) => sum + (x.amount || 0), 0);
  const totalOut   = purchases + expenses;
  const netCash    = openCash + totalSales - totalOut;
  const estProfit  = Math.round(totalSales * 0.32);

  document.getElementById('mgrApp').innerHTML = `
    <div class="mgr-layout">

      <!-- Sidebar ديسكتوب -->
      <nav class="mgr-sidebar" id="mgrSidebar">
        <button class="mgr-side-toggle"
          onclick="document.getElementById('mgrSidebar').classList.toggle('expanded')">☰</button>
        <div class="mgr-side-logo"><strong>α</strong><span>alfaprosys</span></div>
        <div class="mgr-side-nav">${MGR_NAV.map(n => navLink(n)).join('')}</div>
        <div class="mgr-side-spacer"></div>
        <a class="mgr-side-link danger" href="index.html" onclick="sessionStorage.removeItem('alfaprosys_role')" title="خروج">
          <span class="mgr-side-ic">🚪</span>
          <span class="mgr-side-lb">خروج</span>
        </a>
      </nav>

      <!-- المحتوى -->
      <div class="mgr-content-panel">
        <div id="mgrContent">

          <!-- رأس الصفحة -->
          <div class="mgr-page-header">
            <div>
              <div class="mgr-page-brand">alfaprosys</div>
              <div class="mgr-page-title">📊 لوحة الإدارة</div>
            </div>
            <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-align:left;">
              ${today()}
            </div>
          </div>

          <!-- إحصائيات الكاش -->
          <div class="mgr-stats-grid">
            ${(window.Alerts ? Alerts.cardHTML() : '')}
            <div class="mgr-stat-card blue">
              <div class="mgr-stat-lbl">مبيعات اليوم</div>
              <div class="mgr-stat-val">${fmtNum(totalSales)}</div>
              <div class="mgr-stat-sub">ل.س</div>
            </div>
            <div class="mgr-stat-card">
              <div class="mgr-stat-lbl">عدد الفواتير</div>
              <div class="mgr-stat-val">${closed.length}</div>
              <div class="mgr-stat-sub">مطبوعة</div>
            </div>
            <div class="mgr-stat-card gold">
              <div class="mgr-stat-lbl">فواتير مفتوحة</div>
              <div class="mgr-stat-val">${open.length}</div>
              <div class="mgr-stat-sub">على الطاولات</div>
            </div>
            <div class="mgr-stat-card red">
              <div class="mgr-stat-lbl">الصادرات</div>
              <div class="mgr-stat-val">${fmtNum(totalOut)}</div>
              <div class="mgr-stat-sub">ل.س</div>
            </div>
            <div class="mgr-stat-card navy span2">
              <div class="mgr-stat-lbl">صافي الكاش المتوقع بالدرج</div>
              <div class="mgr-stat-val">${fmtNum(netCash)}</div>
              <div class="mgr-stat-sub">
                ${fmtNum(openCash)} افتتاح + ${fmtNum(totalSales)} مبيعات − ${fmtNum(totalOut)} صادرات
              </div>
            </div>
            <div class="mgr-stat-card green">
              <div class="mgr-stat-lbl">ربح تقديري</div>
              <div class="mgr-stat-val">${fmtNum(estProfit)}</div>
              <div class="mgr-stat-sub">~32% هامش</div>
            </div>
            <div class="mgr-stat-card">
              <div class="mgr-stat-lbl">الوردية</div>
              <div class="mgr-stat-val" style="font-size:14px;">
                ${session.shift_open ? '🟢 مفتوحة' : '🔴 مغلقة'}
              </div>
              <div class="mgr-stat-sub">
                ${session.shift_open ? 'بدأت: ' + e(session.shift_opened_at || '') : 'لم تُفتح'}
              </div>
            </div>
          </div>

          <!-- أكثر التصنيفات مبيعاً اليوم -->
          ${(function () {
            const today = businessDay();
            const byCat = {};
            (DATA.categories || []).forEach(ct => byCat[ct.id] = { name: ct.name, icon: ct.icon || '🏷️', rev: 0 });
            invoices.filter(i => (i.date || '') === today && i.status !== 'cancelled')
              .forEach(i => (i.items || []).forEach(li => {
                const it = (DATA.items || []).find(x => x.id === (li.item_id || li.id));
                const cid = it ? it.category_id : 'other';
                if (!byCat[cid]) byCat[cid] = { name: 'أخرى', icon: '🏷️', rev: 0 };
                byCat[cid].rev += (li.price || 0) * (li.qty || 1);
              }));
            const top = Object.values(byCat).filter(x => x.rev > 0).sort((a, b) => b.rev - a.rev).slice(0, 3);
            const max = top[0] ? top[0].rev : 1;
            return top.length ? `
          <div class="mgr-card">
            <div class="mgr-card-title" style="margin-bottom:10px;">🏷️ أكثر التصنيفات مبيعاً اليوم</div>
            ${top.map((t, i) => `
              <div class="mgr-list-row" style="align-items:center;">
                <div class="mgr-row-main">
                  <div class="mgr-row-title">${i + 1}. ${t.icon} ${e(t.name)}</div>
                </div>
                <div style="display:flex;align-items:center;gap:8px;flex:1;max-width:220px;">
                  <div class="rpt-inline-bar" style="flex:1;"><div class="rpt-inline-fill" style="width:${Math.round(t.rev / max * 100)}%;background:var(--fahad-blue);"></div></div>
                </div>
                <div class="mgr-row-val">${fmtNum(t.rev)}</div>
              </div>`).join('')}
          </div>` : '';
          })()}

          <!-- آخر الفواتير -->
          <div class="mgr-card">
            <div class="mgr-card-head">
              <div class="mgr-card-title">🧾 آخر الفواتير</div>
              <a class="mgr-btn outline sm" href="sales.html" onclick="if(window.AlfaNav && window.AlfaNav.navigate) window.AlfaNav.navigate(event, 'sales.html')">عرض الكل</a>
            </div>
            ${invoices.slice(0, 5).map(inv => `
              <div class="mgr-list-row">
                <div class="mgr-row-main">
                  <div class="mgr-row-title">
                    ${e(inv.id)}
                    <span class="mgr-badge ${inv.type === 'table' ? 'blue' : inv.type === 'delivery' ? 'gold' : 'muted'}">
                      ${inv.type === 'table' ? '🍽️ طاولة' : inv.type === 'delivery' ? '🛵 توصيل' : '🥡 سفري'}
                    </span>
                    <span class="mgr-badge ${inv.status === 'open' ? 'green' : inv.status === 'cancelled' ? 'red' : 'muted'}">
                      ${inv.status === 'open' ? 'مفتوحة' : inv.status === 'cancelled' ? 'ملغاة' : 'مطبوعة'}
                    </span>
                  </div>
                  <div class="mgr-row-sub">${e(inv.customer_name || inv.hall || '')} • ${e(inv.time || '')}</div>
                </div>
                <div class="mgr-row-val">${fmtNum(inv.total)}</div>
              </div>
            `).join('')}
          </div>

          <!-- وصول سريع -->
          <div class="mgr-card">
            <div class="mgr-card-title" style="margin-bottom:12px;">⚡ وصول سريع</div>
            <div class="mgr-quick-grid">
              ${[
                { icon: '🧾', label: 'المبيعات',         href: 'sales.html'        },
                { icon: '💸', label: 'الصادرات',          href: 'expenditures.html' },
                { icon: '🍔', label: 'المنيو والأسعار',   href: 'menu_admin.html'   },
                { icon: '👤', label: 'الموظفون',          href: 'employees.html'    },
                { icon: '👥', label: 'العملاء',           href: 'customers.html'    },
                { icon: '🔒', label: 'الوردية والصندوق', href: 'cash_reports.html' },
                { icon: '📈', label: 'التقارير',          href: 'reports.html'      },
                { icon: '🖥️', label: 'شاشة الكاشير',     href: 'pos.html'          },
                { icon: '🛡️', label: 'درع المالك',       href: 'owner_shield.html' },
              ].map(r => `
                <a class="mgr-quick-card" href="${r.href}" onclick="if(window.AlfaNav && window.AlfaNav.navigate) window.AlfaNav.navigate(event, '${r.href}')">
                  <span class="mgr-quick-icon">${r.icon}</span>
                  <span class="mgr-quick-label">${r.label}</span>
                </a>
              `).join('')}
            </div>
          </div>

          <!-- إحصائيات إضافية -->
          <div class="mgr-stats-grid" style="margin-bottom:14px;">
            <div class="mgr-stat-card">
              <div class="mgr-stat-lbl">الموظفون</div>
              <div class="mgr-stat-val">${employees.length}</div>
              <div class="mgr-stat-sub">موظف</div>
            </div>
            <div class="mgr-stat-card">
              <div class="mgr-stat-lbl">التصنيفات</div>
              <div class="mgr-stat-val">${categories.length}</div>
              <div class="mgr-stat-sub">في المنيو</div>
            </div>
            <div class="mgr-stat-card">
              <div class="mgr-stat-lbl">الأصناف</div>
              <div class="mgr-stat-val">${items.length}</div>
              <div class="mgr-stat-sub">صنف نشط</div>
            </div>
          </div>

        <div id="alertsTableHost">${(window.Alerts ? Alerts.tableHTML() : '')}</div>
        </div><!-- /#mgrContent -->
      </div><!-- /.mgr-content-panel -->
    </div><!-- /.mgr-layout -->

    <!-- Scrim + FAB + Mobile Nav -->
    <div class="mgr-nav-scrim" id="mgrNavScrim" onclick="closeNav()"></div>
    <button class="mgr-fab" onclick="toggleNav()">☰</button>
    <nav class="mgr-mobile-nav" id="mgrMobileNav">
      <div class="mgr-mobile-nav-head">
        <strong>قائمة الإدارة</strong>
        <button onclick="closeNav()">✕</button>
      </div>
      <div class="mgr-mobile-nav-grid">
        ${MGR_NAV.map(n => navLink(n, true)).join('')}
        <a class="mgr-mobile-nav-link danger" href="index.html" onclick="sessionStorage.removeItem('alfaprosys_role')">
          <span>🚪</span><small>خروج</small>
        </a>
      </div>
    </nav>
  `;
}


/* ── تشغيل ── */
(window.alfaStart||function(fn){fn();})(function () {
  renderApp();
  if (window.Alerts) Alerts.start();

  // إخفاء القائمة الجانبية إذا كان العرض داخل نافذة منبثقة (iframe)
  if (new URLSearchParams(window.location.search).get('embed') === '1' || window.name === 'mgrIframe') {
    document.body.classList.add('is-embedded');
  }
});

