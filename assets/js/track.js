/* ================================================================
   track.js — صفحة تتبع الطلب للعميل — alfaprosys
   رابط: track.html?id=INVOICE_ID
   ================================================================ */

const STEPS = [
  { key: 'pending',    label: 'تم استلام طلبك',     icon: '✅', desc: 'طلبك وصلنا وجاري تجهيزه'       },
  { key: 'assigned',   label: 'جاري التجهيز',        icon: '👨‍🍳', desc: 'طلبك يُجهَّز الآن ويُسلَّم للعامل' },
  { key: 'on_the_way', label: 'العامل في الطريق',    icon: '🛵', desc: 'طلبك في طريقه إليك الآن'         },
  { key: 'delivered',  label: 'تم التوصيل',          icon: '🎉', desc: 'وصل طلبك — بالهناء والشفاء!'     },
];

function getStepIndex(status) {
  const idx = STEPS.findIndex(s => s.key === status);
  return idx >= 0 ? idx : 0;
}

function render() {
  const app = document.getElementById('trackApp');
  if (!app) return;

  const params = new URLSearchParams(location.search);
  const invoiceId = params.get('id') || '';
  const inv = (window.DEMO_DATA?.invoices || []).find(i => i.id === invoiceId);

  if (!invoiceId || !inv) {
    app.innerHTML = `
      <div class="track-shell">
        <div class="track-brand">🛵 alfaprosys</div>
        <div class="track-card track-error">
          <div class="track-error-icon">❌</div>
          <div class="track-error-title">رابط التتبع غير صالح</div>
          <div class="track-error-sub">تأكد من الرابط أو تواصل مع المطعم</div>
        </div>
      </div>`;
    return;
  }

  const di = inv.delivery_info || {};
  const status = di.status || 'pending';
  const curStep = getStepIndex(status);
  const isDone  = status === 'delivered';

  app.innerHTML = `
    <div class="track-shell">
      <div class="track-brand">🛵 alfaprosys</div>

      <div class="track-card">

        <!-- رأس البطاقة -->
        <div class="track-head ${isDone ? 'track-head-done' : ''}">
          <div class="track-head-icon">${STEPS[curStep].icon}</div>
          <div class="track-head-title">${STEPS[curStep].label}</div>
          <div class="track-head-sub">${STEPS[curStep].desc}</div>
        </div>

        <!-- بيانات الطلب -->
        <div class="track-info">
          <div class="track-info-row">
            <span>رقم الطلب</span>
            <strong>${e(inv.id)}</strong>
          </div>
          <div class="track-info-row">
            <span>اسم العميل</span>
            <strong>${e(inv.customer_name || '—')}</strong>
          </div>
          <div class="track-info-row">
            <span>إجمالي الطلب</span>
            <strong>${fmtNum(inv.total)} ل.س</strong>
          </div>
          ${di.agent_name ? `
            <div class="track-info-row">
              <span>عامل التوصيل</span>
              <strong>${e(di.agent_name)}</strong>
            </div>` : ''}
          ${di.assigned_at ? `
            <div class="track-info-row">
              <span>وقت الإرسال</span>
              <strong>${e(di.assigned_at)}</strong>
            </div>` : ''}
          ${di.delivered_at ? `
            <div class="track-info-row">
              <span>وقت الوصول</span>
              <strong>${e(di.delivered_at)}</strong>
            </div>` : ''}
        </div>

        <!-- شريط التقدم -->
        <div class="track-steps">
          ${STEPS.map((step, idx) => {
            const done    = idx < curStep;
            const current = idx === curStep;
            return `
              <div class="track-step ${done ? 'done' : ''} ${current ? 'current' : ''}">
                <div class="track-step-icon">${done ? '✅' : step.icon}</div>
                <div class="track-step-label">${step.label}</div>
                ${idx < STEPS.length - 1 ? '<div class="track-step-line"></div>' : ''}
              </div>`;
          }).join('')}
        </div>

        <!-- أصناف الطلب -->
        ${(inv.items || []).length > 0 ? `
          <div class="track-items">
            <div class="track-items-title">🍽️ محتوى طلبك</div>
            ${inv.items.map(it => `
              <div class="track-item-row">
                <span>${e(it.name)} × ${it.qty}</span>
                <span>${fmtNum(it.total)} ل.س</span>
              </div>`).join('')}
          </div>
        ` : ''}

        <!-- رسالة الاكتمال -->
        ${isDone ? `
          <div class="track-done-msg">
            🎉 شكراً لطلبك من alfaprosys — نتمنى لك شهية طيبة!
          </div>
        ` : `
          <div class="track-refresh-hint">
            🔄 حدّث الصفحة لمعرفة آخر حالة طلبك
          </div>
        `}
      </div>

      <div class="track-footer">alfaprosys — أنظمة إدارة المطاعم</div>
    </div>
  `;
}

(window.alfaStart||function(fn){fn();})(render);
