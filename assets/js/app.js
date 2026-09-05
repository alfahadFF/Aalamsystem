const DATA = window.DEMO_DATA;
const ROLES = DATA.roles;
let currentRole = null;
let pendingRole = null;
let currentPin = '';

function renderLogin() {
  const grid = document.getElementById('roleGrid');
  grid.innerHTML = Object.keys(ROLES).map(key => {
    const role = ROLES[key];
    return `
      <button class="role-card" type="button" onclick="requestPin('${key}')" aria-label="الدخول كـ ${escapeHtml(role.label)}">
        <div class="role-icon">${role.icon}</div>
        <div class="role-title">${escapeHtml(role.label)}</div>
        <div class="role-desc">${escapeHtml(role.desc)}</div>
      </button>
    `;
  }).join('');
}

function requestPin(roleKey) {
  pendingRole = roleKey;
  currentPin = '';
  document.getElementById('pinDisplay').textContent = '';
  document.getElementById('pinTitle').textContent = `الرمز السري لـ ${ROLES[roleKey].label}`;
  document.getElementById('pinModal').style.display = 'flex';
}

function pinPress(num) {
  if (currentPin.length < 4) {
    currentPin += num;
    document.getElementById('pinDisplay').textContent = '*'.repeat(currentPin.length);
  }
  if (currentPin.length === 4) {
    verifyPin();
  }
}

function pinClear() {
  currentPin = '';
  document.getElementById('pinDisplay').textContent = '';
}

function pinCancel() {
  document.getElementById('pinModal').style.display = 'none';
  pendingRole = null;
  currentPin = '';
}

function verifyPin() {
  const isManager = pendingRole === 'manager' && currentPin === '9090';
  const isCashier = pendingRole === 'cashier' && currentPin === '1234';

  if (isManager || isCashier) {
    document.getElementById('pinModal').style.display = 'none';
    login(pendingRole);
  } else {
    showToast('الرمز السري غير صحيح', '❌');
    pinClear();
  }
}

function login(roleKey) {
  currentRole = roleKey;
  sessionStorage.setItem('alfaprosys_role', roleKey);

  if (roleKey === 'cashier') {
    showToast('جاري فتح شاشة البيع', '🧾');
    setTimeout(() => { window.location.href = 'pos.html'; }, 350);
    return;
  }

  if (roleKey === 'manager') {
    showToast(`تم الدخول كـ ${ROLES[roleKey].label}`, ROLES[roleKey].icon);
    setTimeout(() => { window.location.href = 'dashboard.html'; }, 350);
    return;
  }
}

function logout() {
  currentRole = null;
  sessionStorage.removeItem('alfaprosys_role');
  document.getElementById('appShell').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'flex';
  showToast('تم تسجيل الخروج بنجاح', '🚪');
}

(window.alfaStart||function(fn){fn();})(renderLogin);