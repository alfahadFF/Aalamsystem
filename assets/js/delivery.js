/* ================================================================
   delivery.js — شاشة التوصيل — alfaprosys
   - تبويب 1: طلبات التوصيل المعلقة (بانتظار إسناد عامل)
   - تبويب 2: سجل كل عامل/شركة + محاسبة
   - تبويب 3: تقرير شامل (للمدير فقط)
   ================================================================ */

const DATA   = window.DEMO_DATA;
const isPage = document.getElementById('deliveryApp') !== null;

/* ── أدوات ── */

function nowTime() {
  return new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
}
function nowISO() { return new Date().toISOString().slice(0, 16); }

/* ── التنقل ── */
const MGR_NAV = window.AlfaNav?.MGR_NAV || [];
const CURRENT  = 'delivery';
const navLink  = window.AlfaNav?.linker(CURRENT) || (() => '');
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

/* ── حالة الشاشة ── */
let activeTab      = 'pending';   // pending | agents | report
let activeAgentId  = null;        // التبويب الفرعي في سجل العمال
let assignModal    = null;        // { invoiceId } — مودال الإسناد
let feedbackModal  = null;        // { invoiceId } — مودال ملاحظة العميل
let trackModal     = null;        // invoiceId — مودال التتبع
let agentFormModal = false;
let role           = '';

/* ── حالة التوصيل ── */
const DELIVERY_STATUS = {
  pending:    { label: 'بانتظار التسليم', icon: '⏳', cls: 'dlv-st-pending'   },
  assigned:   { label: 'أُسند للعامل',    icon: '📦', cls: 'dlv-st-assigned'  },
  on_the_way: { label: 'في الطريق',       icon: '🛵', cls: 'dlv-st-otw'       },
  delivered:  { label: 'تم التوصيل',      icon: '✅', cls: 'dlv-st-done'      },
};

/* ── مصادر البيانات ── */
function deliveryInvoices() {
  return (DATA.invoices || []).filter(i => i.type === 'delivery');
}
function pendingInvoices() {
  return deliveryInvoices().filter(i =>
    !i.delivery_info || i.delivery_info.status === 'pending');
}
function agents() {
  return DATA.delivery_agents || [];
}
function agentInvoices(agentId) {
  return deliveryInvoices().filter(i =>
    i.delivery_info && i.delivery_info.agent_id === agentId);
}

/* ================================================================
   التهيئة
   ================================================================ */
function init() {
  role = sessionStorage.getItem('alfaprosys_role') || 'cashier';
  renderApp();
}

/* ================================================================
   الهيكل الرئيسي
   ================================================================ */
function renderApp() {
  const app = document.getElementById('deliveryApp');
  if (!app) return;

  app.innerHTML = `
    <div class="mgr-layout">

      <!-- Sidebar ديسكتوب -->
      <nav class="mgr-sidebar" id="mgrSidebar">
        <button class="mgr-side-toggle"
          onclick="document.getElementById('mgrSidebar').classList.toggle('expanded')">☰</button>
        <div class="mgr-side-logo"><strong>α</strong><span>alfaprosys</span></div>
        <div class="mgr-side-nav">
          ${MGR_NAV.map(n => navLink(n)).join('')}
        </div>
        <div class="mgr-side-spacer"></div>
        <a class="mgr-side-link danger" href="index.html" onclick="sessionStorage.removeItem('alfaprosys_role')" title="خروج">
          <span class="mgr-side-ic">🚪</span><span class="mgr-side-lb">خروج</span>
        </a>
      </nav>

      <!-- المحتوى -->
      <div class="mgr-content-panel">

        <!-- رأس الصفحة -->
        <div class="mgr-page-header">
          <div>
            <div class="mgr-page-brand">alfaprosys</div>
            <div class="mgr-page-title">🛵 إدارة التوصيل</div>
          </div>
          <div class="dlv-header-stats">
            <span class="dlv-badge-stat pending">${pendingInvoices().length} بانتظار إسناد</span>
            <span class="dlv-badge-stat total">${deliveryInvoices().length} إجمالي اليوم</span>
          </div>
        </div>

        <!-- التبويبات الرئيسية -->
        <div class="dlv-tabs">
          <button class="dlv-tab ${activeTab==='pending'?'active':''}"
            onclick="switchTab('pending')">
            ⏳ طلبات معلقة
            ${pendingInvoices().length > 0
              ? `<span class="dlv-tab-badge">${pendingInvoices().length}</span>` : ''}
          </button>
          <button class="dlv-tab ${activeTab==='agents'?'active':''}"
            onclick="switchTab('agents')">
            👤 سجل العمال
          </button>
          ${role === 'manager'
            ? `<button class="dlv-tab ${activeTab==='report'?'active':''}"
                onclick="switchTab('report')">
                📊 تقرير شامل
              </button>` : ''}
        </div>

        <!-- محتوى التبويب -->
        <div id="dlvContent"></div>

      </div>
    </div>

    <!-- Scrim -->
    <div class="mgr-nav-scrim" id="mgrNavScrim" onclick="closeNav()"></div>
    <!-- FAB -->
    <button class="mgr-fab" onclick="toggleNav()">☰</button>
    <!-- Mobile Nav -->
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

    <!-- مودال الإسناد -->
    ${assignModal ? renderAssignModal() : ''}
    <!-- مودال ملاحظة العميل -->
    ${feedbackModal ? renderFeedbackModal() : ''}
    <!-- مودال التتبع -->
    ${trackModal ? renderTrackModal() : ''}
    ${agentFormModal ? renderAgentFormModal() : ''}
  `;

  renderTabContent();
}

/* ================================================================
   التبويبات
   ================================================================ */
function switchTab(tab) {
  activeTab = tab;
  renderApp();
}

function renderTabContent() {
  const box = document.getElementById('dlvContent');
  if (!box) return;
  if (activeTab === 'pending')  box.innerHTML = renderPendingTab();
  if (activeTab === 'agents')   box.innerHTML = renderAgentsTab();
  if (activeTab === 'report')   box.innerHTML = renderReportTab();
}

/* ================================================================
   تبويب 1 — الطلبات المعلقة
   ================================================================ */
function renderPendingTab() {
  const list = pendingInvoices();
  const allDelivery = deliveryInvoices().filter(i =>
    i.delivery_info && i.delivery_info.status !== 'pending');

  if (list.length === 0 && allDelivery.length === 0) {
    return `<div class="dlv-empty">
      <div class="dlv-empty-icon">🛵</div>
      <div>لا توجد طلبات توصيل اليوم</div>
    </div>`;
  }

  return `
    <!-- طلبات بانتظار الإسناد -->
    ${list.length > 0 ? `
      <div class="dlv-section-title">⏳ بانتظار تحديد العامل (${list.length})</div>
      <div class="dlv-cards-grid">
        ${list.map(inv => renderInvoiceCard(inv, true)).join('')}
      </div>
    ` : '<div class="dlv-all-assigned">✅ جميع طلبات التوصيل أُسندت</div>'}

    <!-- طلبات مُسندة جارية -->
    ${allDelivery.length > 0 ? `
      <div class="dlv-section-title" style="margin-top:24px;">🛵 في الطريق / مكتملة</div>
      <div class="dlv-cards-grid">
        ${allDelivery.map(inv => renderInvoiceCard(inv, false)).join('')}
      </div>
    ` : ''}
  `;
}

function renderInvoiceCard(inv, isPending) {
  const di = inv.delivery_info || {};
  const st = DELIVERY_STATUS[di.status || 'pending'];
  const agentName = di.agent_name || '—';
  const isDone = di.status === 'delivered';

  return `
    <div class="dlv-card ${isDone ? 'dlv-card-done' : ''}">

      <!-- رأس البطاقة -->
      <div class="dlv-card-head">
        <div class="dlv-card-id">🧾 ${e(inv.id)}</div>
        <span class="dlv-status-badge ${st.cls}">${st.icon} ${st.label}</span>
      </div>

      <!-- بيانات العميل -->
      <div class="dlv-card-info">
        <div class="dlv-info-row">
          <span class="dlv-info-lbl">العميل</span>
          <span class="dlv-info-val"><strong>${e(inv.customer_name || 'غير محدد')}</strong></span>
        </div>
        <div class="dlv-info-row">
          <span class="dlv-info-lbl">الهاتف</span>
          <span class="dlv-info-val">${e(inv.phone || '—')}</span>
        </div>
        <div class="dlv-info-row">
          <span class="dlv-info-lbl">الإجمالي</span>
          <span class="dlv-info-val dlv-amount">${fmt(inv.total)}</span>
        </div>
        ${di.fee > 0 ? `
          <div class="dlv-info-row">
            <span class="dlv-info-lbl">رسوم توصيل</span>
            <span class="dlv-info-val dlv-fee">${fmt(di.fee)}</span>
          </div>` : ''}
        ${!isPending ? `
          <div class="dlv-info-row">
            <span class="dlv-info-lbl">العامل</span>
            <span class="dlv-info-val"><strong>${e(agentName)}</strong></span>
          </div>` : ''}
        ${di.assigned_at ? `
          <div class="dlv-info-row">
            <span class="dlv-info-lbl">وقت الإسناد</span>
            <span class="dlv-info-val">${e(di.assigned_at)}</span>
          </div>` : ''}
      </div>

      <!-- ملاحظة العميل -->
      ${di.customer_feedback ? `
        <div class="dlv-feedback-box">
          💬 <em>${e(di.customer_feedback)}</em>
        </div>` : ''}

      <!-- أزرار الإجراءات -->
      <div class="dlv-card-actions">
        ${isPending ? `
          <button class="dlv-btn dlv-btn-assign"
            onclick="openAssignModal('${e(inv.id)}')">
            📦 إسناد لعامل
          </button>
        ` : `
          ${di.status === 'assigned' ? `
            <button class="dlv-btn dlv-btn-otw"
              onclick="updateStatus('${e(inv.id)}', 'on_the_way')">
              🛵 في الطريق
            </button>` : ''}
          ${di.status === 'on_the_way' ? `
            <button class="dlv-btn dlv-btn-done"
              onclick="updateStatus('${e(inv.id)}', 'delivered')">
              ✅ تم التوصيل
            </button>` : ''}
        `}

        ${true ? `
          <button class="dlv-btn dlv-btn-track"
            onclick="copyTrackLink('${e(inv.id)}')">
            🔗 رابط التتبع
          </button>` : ''}

        <button class="dlv-btn dlv-btn-feedback"
          onclick="openFeedbackModal('${e(inv.id)}')">
          💬 ${di.customer_feedback ? 'تعديل الملاحظة' : 'ملاحظة العميل'}
        </button>
      </div>
    </div>
  `;
}

/* ================================================================
   تبويب 2 — سجل العمال
   ================================================================ */
function renderAgentsTab() {
  const agentList = agents();
  if (!activeAgentId && agentList.length > 0) activeAgentId = agentList[0].id;

  const agent = agentList.find(a => a.id === activeAgentId);
  const agentInvs = activeAgentId ? agentInvoices(activeAgentId) : [];
  const total = agentInvs.reduce((s, i) => s + (i.total || 0), 0);
  const fees  = agentInvs.reduce((s, i) => s + (i.delivery_info?.fee || 0), 0);
  const done  = agentInvs.filter(i => i.delivery_info?.status === 'delivered').length;

  return `
    <!-- تبويبات العمال الفرعية -->
    <div class="dlv-agent-tabs">
      ${agentList.map(a => {
        const cnt = agentInvoices(a.id).length;
        return `
          <button class="dlv-agent-tab ${a.id === activeAgentId ? 'active' : ''}"
            onclick="selectAgent('${e(a.id)}')">
            ${a.type === 'company' ? '🏢' : '👤'} ${e(a.name)}
            ${cnt > 0 ? `<span class="dlv-tab-badge">${cnt}</span>` : ''}
          </button>`;
      }).join('')}

      <button class="dlv-agent-tab dlv-agent-tab-add"
        onclick="openAddAgentModal()">
        ➕ إضافة
      </button>
    </div>

    ${agent ? `
      <!-- ملخص العامل -->
      <div class="dlv-agent-summary">
        <div class="dlv-agent-info">
          <span class="dlv-agent-type-badge ${agent.type === 'company' ? 'company' : 'emp'}">
            ${agent.type === 'company' ? '🏢 شركة توصيل' : '👤 موظف'}
          </span>
          <span class="dlv-agent-phone">📞 ${e(agent.phone || '—')}</span>
          ${agent.fee_per_trip > 0
            ? `<span class="dlv-agent-fee">رسوم الرحلة: ${fmt(agent.fee_per_trip)}</span>` : ''}
          ${agent.notes ? `<span class="dlv-agent-notes">${e(agent.notes)}</span>` : ''}
        </div>
        <div class="dlv-agent-stats">
          <div class="dlv-agent-stat">
            <div class="dlv-agent-stat-val">${agentInvs.length}</div>
            <div class="dlv-agent-stat-lbl">فواتير</div>
          </div>
          <div class="dlv-agent-stat">
            <div class="dlv-agent-stat-val">${done}</div>
            <div class="dlv-agent-stat-lbl">مكتملة</div>
          </div>
          <div class="dlv-agent-stat dlv-stat-money">
            <div class="dlv-agent-stat-val">${fmtNum(total)}</div>
            <div class="dlv-agent-stat-lbl">إجمالي المبالغ (ل.س)</div>
          </div>
          ${fees > 0 ? `
            <div class="dlv-agent-stat dlv-stat-fee">
              <div class="dlv-agent-stat-val">${fmtNum(fees)}</div>
              <div class="dlv-agent-stat-lbl">رسوم التوصيل (ل.س)</div>
            </div>` : ''}
        </div>
      </div>

      <!-- جدول الفواتير -->
      ${agentInvs.length > 0 ? `
        <div class="dlv-table-wrap">
          <table class="dlv-table">
            <thead>
              <tr>
                <th>رقم الفاتورة</th>
                <th>العميل</th>
                <th>الهاتف</th>
                <th>قيمة الفاتورة</th>
                ${agent.fee_per_trip > 0 ? '<th>رسوم التوصيل</th>' : ''}
                <th>الحالة</th>
                <th>ملاحظة العميل</th>
                <th>إجراء</th>
              </tr>
            </thead>
            <tbody>
              ${agentInvs.map(inv => {
                const di = inv.delivery_info || {};
                const st = DELIVERY_STATUS[di.status || 'pending'];
                return `
                  <tr class="${di.status === 'delivered' ? 'dlv-row-done' : ''}">
                    <td><strong>${e(inv.id)}</strong></td>
                    <td>${e(inv.customer_name || '—')}</td>
                    <td>${e(inv.phone || '—')}</td>
                    <td class="dlv-td-money">${fmt(inv.total)}</td>
                    ${agent.fee_per_trip > 0
                      ? `<td class="dlv-td-fee">${fmt(di.fee || 0)}</td>` : ''}
                    <td><span class="dlv-status-badge ${st.cls}">${st.icon} ${st.label}</span></td>
                    <td class="dlv-td-feedback">
                      <div class="dlv-feedback-cell">
                        <span class="dlv-feedback-text">${e(di.customer_feedback || '')}</span>
                        <button class="dlv-inline-btn"
                          onclick="openFeedbackModal('${e(inv.id)}')">✏️</button>
                      </div>
                    </td>
                    <td>
                      ${di.status === 'assigned' ? `
                        <button class="dlv-inline-btn dlv-otw"
                          onclick="updateStatus('${e(inv.id)}','on_the_way')">🛵</button>` : ''}
                      ${di.status === 'on_the_way' ? `
                        <button class="dlv-inline-btn dlv-done"
                          onclick="updateStatus('${e(inv.id)}','delivered')">✅</button>` : ''}
                      ${di.status === 'delivered' ? '<span style="color:var(--sage)">✓</span>' : ''}
                    </td>
                  </tr>`;
              }).join('')}
            </tbody>
            <tfoot>
              <tr class="dlv-tfoot">
                <td colspan="${agent.fee_per_trip > 0 ? 3 : 3}"><strong>المجموع</strong></td>
                <td class="dlv-td-money"><strong>${fmt(total)}</strong></td>
                ${agent.fee_per_trip > 0
                  ? `<td class="dlv-td-fee"><strong>${fmt(fees)}</strong></td>` : ''}
                <td colspan="3"></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <!-- زر المحاسبة -->
        <div class="dlv-settle-bar">
          <div class="dlv-settle-info">
            💰 المبالغ المستلمة من العميل: <strong>${fmt(total)}</strong>
            ${fees > 0 ? ` &nbsp;|&nbsp; رسوم للشركة: <strong>${fmt(fees)}</strong>` : ''}
          </div>
          <button class="dlv-btn dlv-btn-print" onclick="printAgentReport('${e(agent.id)}')">🖨️ طباعة كشف</button>
          <button class="dlv-btn dlv-btn-settle"
            onclick="settleAgent('${e(agent.id)}','${e(agent.name)}',${total},${fees})">
            💵 محاسبة ${e(agent.name)}
          </button>
        </div>
      ` : `
        <div class="dlv-empty" style="margin-top:24px;">
          <div class="dlv-empty-icon">📭</div>
          <div>لا توجد فواتير مسندة لهذا العامل بعد</div>
        </div>
      `}
    ` : '<div class="dlv-empty">لا يوجد عمال توصيل — أضف عاملاً أولاً</div>'}
  `;
}

/* ================================================================
   تبويب 3 — تقرير شامل (مدير فقط)
   ================================================================ */
function renderReportTab() {
  if (role !== 'manager') {
    return `<div class="dlv-empty">🔒 هذا التقرير للإدارة فقط</div>`;
  }

  const allDlv = deliveryInvoices();
  const totalRevenue = allDlv.reduce((s, i) => s + (i.total || 0), 0);
  const totalFees    = allDlv.reduce((s, i) => s + (i.delivery_info?.fee || 0), 0);
  const byStatus     = {};
  allDlv.forEach(i => {
    const st = i.delivery_info?.status || 'pending';
    byStatus[st] = (byStatus[st] || 0) + 1;
  });

  const agentSummary = agents().map(a => {
    const invs  = agentInvoices(a.id);
    const rev   = invs.reduce((s, i) => s + (i.total || 0), 0);
    const fees  = invs.reduce((s, i) => s + (i.delivery_info?.fee || 0), 0);
    const done  = invs.filter(i => i.delivery_info?.status === 'delivered').length;
    const feedbacks = invs.filter(i => i.delivery_info?.customer_feedback).length;
    return { ...a, count: invs.length, done, rev, fees, feedbacks };
  }).sort((a, b) => b.count - a.count);

  return `
    <!-- بطاقات الملخص -->
    <div class="dlv-report-stats">
      <div class="dlv-rstat-card">
        <div class="dlv-rstat-icon">🛵</div>
        <div class="dlv-rstat-val">${allDlv.length}</div>
        <div class="dlv-rstat-lbl">إجمالي طلبات التوصيل</div>
      </div>
      <div class="dlv-rstat-card">
        <div class="dlv-rstat-icon">✅</div>
        <div class="dlv-rstat-val">${byStatus.delivered || 0}</div>
        <div class="dlv-rstat-lbl">تم توصيلها</div>
      </div>
      <div class="dlv-rstat-card">
        <div class="dlv-rstat-icon">⏳</div>
        <div class="dlv-rstat-val">${(byStatus.pending || 0) + (byStatus.assigned || 0) + (byStatus.on_the_way || 0)}</div>
        <div class="dlv-rstat-lbl">قيد التنفيذ</div>
      </div>
      <div class="dlv-rstat-card dlv-rstat-money">
        <div class="dlv-rstat-icon">💰</div>
        <div class="dlv-rstat-val">${fmtNum(totalRevenue)}</div>
        <div class="dlv-rstat-lbl">إجمالي المبالغ (ل.س)</div>
      </div>
      ${totalFees > 0 ? `
        <div class="dlv-rstat-card dlv-rstat-fee">
          <div class="dlv-rstat-icon">🏢</div>
          <div class="dlv-rstat-val">${fmtNum(totalFees)}</div>
          <div class="dlv-rstat-lbl">رسوم شركات التوصيل (ل.س)</div>
        </div>` : ''}
    </div>

    <!-- جدول أداء العمال -->
    <div class="dlv-section-title" style="margin-top:24px;">📊 أداء عمال التوصيل</div>
    <div class="dlv-table-wrap">
      <table class="dlv-table">
        <thead>
          <tr>
            <th>العامل / الشركة</th>
            <th>النوع</th>
            <th>عدد الطلبات</th>
            <th>مكتملة</th>
            <th>إجمالي المبالغ</th>
            <th>رسوم التوصيل</th>
            <th>تقييمات العملاء</th>
          </tr>
        </thead>
        <tbody>
          ${agentSummary.map(a => `
            <tr>
              <td><strong>${e(a.name)}</strong><br><small>${e(a.phone || '')}</small></td>
              <td>${a.type === 'company' ? '🏢 شركة' : '👤 موظف'}</td>
              <td>${a.count}</td>
              <td>
                <span class="dlv-done-cnt">${a.done}</span>
                ${a.count > 0
                  ? `<small>(${Math.round(a.done / a.count * 100)}%)</small>` : ''}
              </td>
              <td class="dlv-td-money">${fmt(a.rev)}</td>
              <td class="dlv-td-fee">${a.fees > 0 ? fmt(a.fees) : '—'}</td>
              <td>${a.feedbacks > 0 ? `💬 ${a.feedbacks}` : '—'}</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr class="dlv-tfoot">
            <td colspan="2"><strong>المجموع</strong></td>
            <td><strong>${allDlv.length}</strong></td>
            <td><strong>${byStatus.delivered || 0}</strong></td>
            <td class="dlv-td-money"><strong>${fmt(totalRevenue)}</strong></td>
            <td class="dlv-td-fee"><strong>${totalFees > 0 ? fmt(totalFees) : '—'}</strong></td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- تفاصيل ملاحظات العملاء -->
    ${allDlv.filter(i => i.delivery_info?.customer_feedback).length > 0 ? `
      <div class="dlv-section-title" style="margin-top:24px;">💬 ملاحظات العملاء</div>
      <div class="dlv-feedbacks-list">
        ${allDlv.filter(i => i.delivery_info?.customer_feedback).map(inv => `
          <div class="dlv-feedback-item">
            <div class="dlv-feedback-meta">
              <strong>${e(inv.id)}</strong> — ${e(inv.customer_name || '—')}
              <span class="dlv-feedback-agent">عبر: ${e(inv.delivery_info?.agent_name || '—')}</span>
            </div>
            <div class="dlv-feedback-text-full">💬 ${e(inv.delivery_info.customer_feedback)}</div>
          </div>
        `).join('')}
      </div>
    ` : ''}
  `;
}

/* ================================================================
   مودال الإسناد
   ================================================================ */
function openAssignModal(invoiceId) {
  assignModal = { invoiceId };
  renderApp();
}
function closeAssignModal() {
  assignModal = null;
  renderApp();
}

function renderAssignModal() {
  const inv = (DATA.invoices || []).find(i => i.id === assignModal?.invoiceId);
  if (!inv) return '';
  const agentList = agents().filter(a => a.is_active);

  return `
    <div class="dlv-modal-scrim" onclick="closeAssignModal()"></div>
    <div class="dlv-modal" role="dialog">
      <div class="dlv-modal-head">
        <strong>📦 إسناد طلب التوصيل</strong>
        <button onclick="closeAssignModal()">✕</button>
      </div>
      <div class="dlv-modal-body">

        <!-- بيانات الفاتورة -->
        <div class="dlv-modal-inv-info">
          <div>🧾 <strong>${e(inv.id)}</strong></div>
          <div>👤 ${e(inv.customer_name || 'غير محدد')}</div>
          <div>📞 ${e(inv.phone || '—')}</div>
          <div>💰 <strong>${fmt(inv.total)}</strong></div>
        </div>

        <!-- اختيار العامل -->
        <div class="dlv-modal-label">اختر عامل أو شركة التوصيل:</div>
        <div class="dlv-agents-grid">
          ${agentList.map(a => `
            <button class="dlv-agent-btn"
              onclick="assignAgent('${e(inv.id)}','${e(a.id)}')">
              <span class="dlv-agent-btn-icon">${a.type === 'company' ? '🏢' : '👤'}</span>
              <span class="dlv-agent-btn-name">${e(a.name)}</span>
              ${a.fee_per_trip > 0
                ? `<span class="dlv-agent-btn-fee">${fmtNum(a.fee_per_trip)} ل.س</span>`
                : `<span class="dlv-agent-btn-free">مجاناً</span>`}
            </button>
          `).join('')}
        </div>

      </div>
    </div>
  `;
}

function assignAgent(invoiceId, agentId) {
  const agent = agents().find(a => a.id === agentId);
  if (!agent) return;

  window.DEMO_DATA.invoices = window.DEMO_DATA.invoices.map(i => {
    if (i.id !== invoiceId) return i;
    return {
      ...i,
      delivery_info: {
        agent_id:    agent.id,
        agent_name:  agent.name,
        agent_type:  agent.type,
        status:      'assigned',
        fee:         agent.fee_per_trip || 0,
        assigned_at: nowTime(),
        delivered_at: '',
        customer_feedback: '',
      }
    };
  });

  assignModal = null;
  const inv = (DATA.invoices || []).find(i => i.id === invoiceId);
  if (inv && window.InvoiceSync) InvoiceSync.pushSoon(inv);
  showToast(`أُسند لـ ${agent.name}`, '📦');
  renderApp();
}

/* ================================================================
   تحديث حالة التوصيل
   ================================================================ */
function updateStatus(invoiceId, newStatus) {
  window.DEMO_DATA.invoices = window.DEMO_DATA.invoices.map(i => {
    if (i.id !== invoiceId) return i;
    const di = { ...(i.delivery_info || {}) };
    di.status = newStatus;
    if (newStatus === 'delivered') di.delivered_at = nowTime();
    return { ...i, delivery_info: di };
  });
  const labels = { on_the_way: 'في الطريق 🛵', delivered: 'تم التوصيل ✅' };
  const inv = (DATA.invoices || []).find(i => i.id === invoiceId);
  if (inv && window.InvoiceSync) InvoiceSync.pushSoon(inv);
  showToast(labels[newStatus] || 'تم التحديث');
  renderApp();
}

/* ================================================================
   مودال ملاحظة العميل
   ================================================================ */
function openFeedbackModal(invoiceId) {
  feedbackModal = { invoiceId };
  renderApp();
}
function closeFeedbackModal() {
  feedbackModal = null;
  renderApp();
}

function renderFeedbackModal() {
  const inv = (DATA.invoices || []).find(i => i.id === feedbackModal?.invoiceId);
  if (!inv) return '';
  const current = inv.delivery_info?.customer_feedback || '';

  return `
    <div class="dlv-modal-scrim" onclick="closeFeedbackModal()"></div>
    <div class="dlv-modal dlv-modal-sm" role="dialog">
      <div class="dlv-modal-head">
        <strong>💬 ملاحظة العميل</strong>
        <button onclick="closeFeedbackModal()">✕</button>
      </div>
      <div class="dlv-modal-body">
        <div class="dlv-modal-inv-info">
          🧾 <strong>${e(inv.id)}</strong> — ${e(inv.customer_name || '—')}
        </div>
        <div class="dlv-modal-label">رأي أو ملاحظة العميل:</div>
        <textarea id="feedbackInput" class="dlv-feedback-input"
          placeholder="مثال: التوصيل كان سريعاً، الطلب مكتمل..."
          rows="4">${e(current)}</textarea>
      </div>
      <div class="dlv-modal-foot">
        <button class="dlv-modal-cancel" onclick="closeFeedbackModal()">إلغاء</button>
        <button class="dlv-modal-confirm" onclick="saveFeedback('${e(inv.id)}')">💾 حفظ</button>
      </div>
    </div>
  `;
}

function saveFeedback(invoiceId) {
  const text = document.getElementById('feedbackInput')?.value?.trim() || '';
  window.DEMO_DATA.invoices = window.DEMO_DATA.invoices.map(i => {
    if (i.id !== invoiceId) return i;
    const di = { ...(i.delivery_info || {}) };
    di.customer_feedback = text;
    return { ...i, delivery_info: di };
  });
  feedbackModal = null;
  const inv = (DATA.invoices || []).find(i => i.id === invoiceId);
  if (inv && window.InvoiceSync) InvoiceSync.pushSoon(inv);
  showToast('تم حفظ ملاحظة العميل', '💬');
  renderApp();
}

/* ================================================================
   رابط التتبع — يفتح نافذة التتبع مباشرة داخل الشاشة
   ================================================================ */
function copyTrackLink(invoiceId) {
  trackModal = invoiceId;
  renderApp();
}

function closeTrackModal() {
  trackModal = null;
  renderApp();
}

function renderTrackModal() {
  const inv = (DATA.invoices || []).find(i => i.id === trackModal);
  if (!inv) return '';
  const di = inv.delivery_info || {};
  const status = di.status || 'pending';

  const STEPS = [
    { key: 'pending',    label: 'تم استلام طلبك',   icon: '✅', desc: 'طلبك وصلنا وجاري تجهيزه'        },
    { key: 'assigned',   label: 'جاري التجهيز',      icon: '👨‍🍳', desc: 'طلبك يُجهَّز ويُسلَّم للعامل' },
    { key: 'on_the_way', label: 'العامل في الطريق',  icon: '🛵', desc: 'طلبك في طريقه إليك الآن'        },
    { key: 'delivered',  label: 'تم التوصيل',        icon: '🎉', desc: 'وصل طلبك — بالهناء والشفاء!'    },
  ];
  const curStep = Math.max(0, STEPS.findIndex(s => s.key === status));
  const isDone  = status === 'delivered';
  const step    = STEPS[curStep];

  // توليد رابط قابل للمشاركة
  const link = `${location.origin}${location.pathname.replace('delivery.html','')}track.html?id=${encodeURIComponent(inv.id)}`;

  return `
    <div class="dlv-modal-scrim" onclick="closeTrackModal()"></div>
    <div class="dlv-modal dlv-modal-track" role="dialog">
      <div class="dlv-modal-head" style="background:${isDone?'var(--sage)':'var(--fahad-navy)'}">
        <strong>🔍 تتبع الطلب — ${e(inv.id)}</strong>
        <button onclick="closeTrackModal()">✕</button>
      </div>
      <div class="dlv-modal-body" style="padding:0;overflow:hidden;">

        <!-- رأس حالة التتبع -->
        <div class="track-head-mini ${isDone?'done':''}">
          <div class="track-head-mini-icon">${step.icon}</div>
          <div class="track-head-mini-title">${step.label}</div>
          <div class="track-head-mini-sub">${step.desc}</div>
        </div>

        <!-- بيانات الطلب -->
        <div class="track-info-mini">
          <div class="track-info-row">
            <span>العميل</span>
            <strong>${e(inv.customer_name || '—')}</strong>
          </div>
          <div class="track-info-row">
            <span>الهاتف</span>
            <strong>${e(inv.phone || '—')}</strong>
          </div>
          <div class="track-info-row">
            <span>الإجمالي</span>
            <strong>${fmtNum(inv.total)} ل.س</strong>
          </div>
          ${di.agent_name ? `
          <div class="track-info-row">
            <span>العامل</span>
            <strong>${e(di.agent_name)}</strong>
          </div>` : ''}
        </div>

        <!-- شريط التقدم -->
        <div class="track-steps-mini">
          ${STEPS.map((s, idx) => {
            const done    = idx < curStep;
            const current = idx === curStep;
            return `
              <div class="track-step-mini ${done?'done':''} ${current?'current':''}">
                <div class="track-step-mini-icon">${done ? '✅' : s.icon}</div>
                <div class="track-step-mini-label">${s.label}</div>
                ${idx < STEPS.length-1 ? '<div class="track-step-mini-line"></div>' : ''}
              </div>`;
          }).join('')}
        </div>

        <!-- أصناف الطلب -->
        ${(inv.items||[]).length > 0 ? `
          <div style="padding:12px 16px;border-top:2px solid var(--line);">
            <div style="font-weight:700;font-size:13px;color:var(--fahad-navy);margin-bottom:8px;">🍽️ محتوى الطلب</div>
            ${inv.items.map(it => `
              <div style="display:flex;justify-content:space-between;font-size:13px;color:var(--text-muted);padding:3px 0;border-bottom:1px solid var(--line);">
                <span>${e(it.name)} × ${it.qty}</span>
                <span>${fmtNum(it.total)} ل.س</span>
              </div>`).join('')}
          </div>
        ` : ''}

        <!-- مشاركة الرابط -->
        <div class="track-share-bar">
          <div class="track-share-label">📤 أرسل رابط التتبع للعميل:</div>
          <div class="track-share-row">
            <input class="track-share-input" id="trackLinkInput" value="${e(link)}" readonly
              onclick="this.select()">
            <button class="track-copy-btn" onclick="doCopyLink()">نسخ</button>
          </div>
          <a class="track-whatsapp-btn"
            href="https://wa.me/${inv.phone?.replace(/\D/g,'')||''}?text=${encodeURIComponent('تتبع طلبك: '+link)}"
            target="_blank" rel="noopener">
            📱 إرسال واتساب
          </a>
        </div>

      </div>
    </div>
  `;
}

function doCopyLink() {
  const inp = document.getElementById('trackLinkInput');
  if (!inp) return;
  inp.select();
  try {
    document.execCommand('copy');
    showToast('تم نسخ الرابط ✅');
  } catch {
    showToast('اضغط على الرابط وانسخه يدوياً', '📋');
  }
}

function printAgentReport(agentId) {
  const agent = agents().find(a => a.id === agentId); if (!agent) return;
  const invs = agentInvoices(agentId); const total = invs.reduce((s,i)=>s+Number(i.total||0),0);
  const fees = invs.reduce((s,i)=>s+Number((i.delivery_info||{}).fee||0),0);
  const w = window.open('', '_blank', 'width=800,height=900'); if (!w) return showToast('اسمح بالنوافذ المنبثقة للطباعة','⚠️');
  w.document.write('<!doctype html><html dir="rtl"><head><meta charset="utf-8"><title>كشف توصيل</title><style>body{font-family:Arial,Tahoma;margin:18px;color:#111}h2{text-align:center}table{width:100%;border-collapse:collapse;margin-top:15px}th,td{border:1px solid #333;padding:7px;text-align:center}th{background:#eee}.sum{font-size:16px;font-weight:bold;margin-top:15px}@media print{button{display:none}}</style></head><body>');
  w.document.write('<h2>كشف محاسبة التوصيل</h2><div>العامل/الشركة: <b>'+String(agent.name).replace(/[<>]/g,'')+'</b></div><div>التاريخ: '+new Date().toLocaleString('ar')+'</div><table><tr><th>الفاتورة</th><th>العميل</th><th>الإجمالي</th><th>رسوم التوصيل</th><th>الحالة</th></tr>');
  invs.forEach(i=>{const d=i.delivery_info||{};w.document.write('<tr><td>'+i.id+'</td><td>'+String(i.customer_name||'').replace(/[<>]/g,'')+'</td><td>'+Number(i.total||0).toLocaleString()+'</td><td>'+Number(d.fee||0).toLocaleString()+'</td><td>'+String(d.status||'').replace(/[<>]/g,'')+'</td></tr>');});
  w.document.write('</table><div class="sum">إجمالي المبالغ: '+total.toLocaleString()+' ل.س — الرسوم: '+fees.toLocaleString()+' ل.س — الصافي: '+(total-fees).toLocaleString()+' ل.س</div><script>window.onload=function(){window.print();}</script></body></html>');w.document.close();
}

/* ================================================================
   محاسبة العامل
   ================================================================ */
function settleAgent(agentId, agentName, total, fees) {
  const net = total - fees;
  const msg = fees > 0
    ? `محاسبة ${agentName}:\nإجمالي المبالغ المستلمة: ${fmtNum(total)} ل.س\nرسوم التوصيل للشركة: ${fmtNum(fees)} ل.س\nصافي المبلغ المطلوب: ${fmtNum(net)} ل.س`
    : `محاسبة ${agentName}:\nإجمالي المبالغ المستلمة: ${fmtNum(total)} ل.س\n(موظف داخلي — لا رسوم توصيل)`;
  alert(msg);
}

/* ================================================================
   إضافة عامل (مؤقت)
   ================================================================ */
function openAddAgentModal() { agentFormModal = true; renderApp(); }
function closeAgentForm(){ agentFormModal = false; renderApp(); }
function renderAgentFormModal(){ return `<div class="dlv-modal-scrim" onclick="closeAgentForm()"></div><div class="dlv-modal" role="dialog"><div class="dlv-modal-head"><strong>إضافة عامل أو شركة توصيل</strong><button onclick="closeAgentForm()">✕</button></div><div class="dlv-modal-body"><label>الاسم<input id="agentName" type="text" placeholder="اسم العامل أو الشركة"></label><label>النوع<select id="agentType"><option value="employee">موظف</option><option value="company">شركة</option></select></label><label>الهاتف<input id="agentPhone" type="tel" placeholder="رقم الهاتف"></label><label>رسوم الرحلة<input id="agentFee" type="number" min="0" value="0" placeholder="0"></label><label>ملاحظات<textarea id="agentNotes" placeholder="ملاحظات"></textarea></label><div class="dlv-modal-actions"><button class="dlv-btn" onclick="closeAgentForm()">إلغاء</button><button class="dlv-btn dlv-btn-assign" onclick="saveAgentForm()">حفظ</button></div></div></div>`; }
function saveAgentForm(){ const name=(document.getElementById('agentName')?.value||'').trim(); if(!name) return showToast('اسم العامل أو الشركة مطلوب','⚠️'); const rec={id:'drv_'+Date.now(),name,type:document.getElementById('agentType').value,phone:document.getElementById('agentPhone').value.trim(),fee_per_trip:Number(document.getElementById('agentFee').value)||0,notes:document.getElementById('agentNotes').value.trim(),is_active:true}; window.DEMO_DATA.delivery_agents=[...(window.DEMO_DATA.delivery_agents||[]),rec]; if(window.AgentSync) AgentSync.pushSoon(); activeAgentId=rec.id; activeTab='agents'; agentFormModal=false; showToast('تمت إضافة عامل التوصيل','✅'); renderApp(); }

/* ================================================================
   اختيار عامل في التبويب
   ================================================================ */
function selectAgent(agentId) {
  activeAgentId = agentId;
  renderTabContent();
  // تحديث الأزرار
  document.querySelectorAll('.dlv-agent-tab').forEach(btn => {
    btn.classList.remove('active');
  });
  event.target.closest('.dlv-agent-tab')?.classList.add('active');
}

/* ── تشغيل ── */
if (isPage) (window.alfaStart||function(fn){fn();})(function () {
  init();
  if (window.AlfaLive) AlfaLive.start(10000, function () { if (isPage) renderApp(); });
});
