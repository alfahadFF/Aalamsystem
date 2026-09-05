/* ================================================================
   nav.js — قائمة الإدارة الموحدة (بند 43: توحيد الدوال)
   نسخة واحدة لحقيقة واحدة: أينما تعدّل بنود القائمة تعدّل هنا فقط.
   الصفحات تستخدمها هكذا:
     const MGR_NAV = window.AlfaNav.MGR_NAV;
     const navLink = window.AlfaNav.linker(CURRENT);
   ================================================================ */
window.AlfaNav = (function () {
  const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const MGR_NAV = [
    { key: 'dashboard',    label: 'لوحة الإدارة',    icon: '📊', href: 'dashboard.html'    },
    { key: 'sales',        label: 'مبيعات اليوم',    icon: '🧾', href: 'sales.html'        },
    { key: 'expenditures', label: 'الصادرات',        icon: '💸', href: 'expenditures.html' },
    { key: 'menu_admin',   label: 'المنيو والأسعار', icon: '🍔', href: 'menu_admin.html'   },
    { key: 'employees',    label: 'الموظفون',        icon: '👤', href: 'employees.html'    },
    { key: 'customers',    label: 'العملاء',         icon: '👥', href: 'customers.html'    },
    { key: 'inventory',    label: 'المخزون',         icon: '📦', href: 'inventory.html'    },
    { key: 'suppliers',    label: 'الموردون',        icon: '🚚', href: 'suppliers.html'    },
    { key: 'audit_log',    label: 'سجل التعديلات',   icon: '📜', href: 'audit_log.html'    },
    { key: 'contracts',    label: 'العقود',          icon: '📋', href: 'contracts.html'    },
    { key: 'delivery',     label: 'التوصيل',         icon: '🛵', href: 'delivery.html'     },
    { key: 'cash_reports', label: 'الوردية والصندوق', icon: '🔒', href: 'cash_reports.html' },
    { key: 'costs',        label: 'التكاليف',        icon: '💰', href: 'costs.html'        },
    { key: 'settings',     label: 'الإعدادات',       icon: '⚙️', href: 'settings.html'   },
    { key: 'reports',      label: 'التقارير',        icon: '📈', href: 'reports.html'      },
  ];

  /* linker(current) — يُرجع دالة navLink مربوطة بصفحة الحالية */
  function linker(current) {
    return function navLink(n, mobile = false) {
      const active = n.key === current;
      return mobile
        ? `<a class="mgr-mobile-nav-link ${active ? 'active' : ''}" href="${n.href}" onclick="if(window.AlfaNav && window.AlfaNav.navigate) window.AlfaNav.navigate(event, '${n.href}')"><span>${n.icon}</span><small>${esc(n.label)}</small></a>`
        : `<a class="mgr-side-link ${active ? 'active' : ''}" href="${n.href}" onclick="if(window.AlfaNav && window.AlfaNav.navigate) window.AlfaNav.navigate(event, '${n.href}')" title="${esc(n.label)}"><span class="mgr-side-ic">${n.icon}</span><span class="mgr-side-lb">${esc(n.label)}</span></a>`;
    };
  }

  
  /* navigate — لفتح الشاشات في نافذة مباشرة بدلًا من إعادة التحميل */
  function navigate(event, href) {
    if (href === 'index.html' || href === 'pos.html') { if(href === 'index.html') sessionStorage.removeItem('alfaprosys_role'); return; } // السماح بالخروج
    event.preventDefault();
    
    // إذا كنا داخل نافذة iframe مسبقاً، نطلب من النافذة الأب تغيير الرابط
    
    try {
      if (window.self !== window.top && window.name === 'mgrIframe' && window.parent && window.parent.AlfaNav && window.parent.AlfaNav.openIframe) {
        window.parent.AlfaNav.openIframe(href);
        return;
      }
    } catch (e) {
      // Cross-origin error or similar, ignore and continue opening iframe locally
    }
  
    openIframe(href);
  }

  function openIframe(href) {
    // إنشاء الحاوية إن لم تكن موجودة
    let modal = document.getElementById('mgrIframeModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'mgrIframeModal';
      modal.innerHTML = `
        <div class="iframe-modal-overlay" onclick="window.AlfaNav.closeIframe()"></div>
        <div class="iframe-modal-content">
          <div class="iframe-modal-head">
            <div style="display:flex;gap:10px;align-items:center;">
              <button onclick="window.AlfaNav.closeIframe()" class="iframe-close-btn">✕ إغلاق</button>
            </div>
          </div>
          <iframe id="mgrIframe" name="mgrIframe" src="" frameborder="0"></iframe>
        </div>
      `;
      document.body.appendChild(modal);

      // CSS للنافذة المنبثقة
      const style = document.createElement('style');
      style.innerHTML = `
        #mgrIframeModal {
          position: fixed; top: 0; left: 0; width: 100%; height: 100%;
          z-index: 99999; display: none; align-items: center; justify-content: center;
          padding: 0; box-sizing: border-box;
        }
        #mgrIframeModal.active { display: flex; }
        .iframe-modal-overlay {
          position: absolute; top: 0; left: 0; width: 100%; height: 100%;
          background: var(--bg, #F8FAFC); 
        }
        .iframe-modal-content {
          position: relative; width: 100vw; height: 100vh; max-width: none; border-radius: 0;
          background: var(--bg-color, #F0F4F8); border-radius: 0;
          display: flex; flex-direction: column; overflow: hidden;
          box-shadow: 0 10px 40px rgba(0,0,0,0.3);
          animation: iframePop 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
        .iframe-modal-head {
          background: var(--card-bg, #fff); padding: 10px 15px;
          border-bottom: 1px solid var(--border-color, #D9E2EC);
          display: flex; justify-content: flex-end; align-items: center;
        }
        .iframe-close-btn {
          background: var(--fahad-red, #EF4444); color: #fff; border: none;
          padding: 6px 12px; border-radius: 6px; font-weight: bold; cursor: pointer;
        }
        #mgrIframe {
          flex: 1; width: 100%; height: 100%; background: var(--bg-color, #F0F4F8);
        }
        @keyframes iframePop {
          0% { opacity: 0; transform: translateY(20px) scale(0.95); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @media (max-width: 768px) {
          #mgrIframeModal { padding: 0; }
          .iframe-modal-content { height: 100vh; max-width: 100%; border-radius: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    const iframe = document.getElementById('mgrIframe');
    iframe.src = href + (href.includes('?') ? '&' : '?') + 'embed=1';
    modal.classList.add('active');
  }

  function closeIframe() {
    const modal = document.getElementById('mgrIframeModal');
    if (modal) {
      modal.classList.remove('active');
      document.getElementById('mgrIframe').src = '';
    }
  }

  return { MGR_NAV, linker, navigate, openIframe, closeIframe };

})();
