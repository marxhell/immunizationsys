// Determine API base URL based on environment
const getApiBaseUrl = () => {
  const isDevelopment = ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);
  
  if (isDevelopment) {
    return 'http://localhost:5000/api';
  }
  
  // Production: use Render backend
  return 'https://immunizationsys.onrender.com/api';
};

const API_BASE_URL = getApiBaseUrl();

function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function getParentAuthHeaders() {
  const token = localStorage.getItem('parentToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function buildSidebar() {
  const menu = document.getElementById('sidebarMenu');
  if (!menu) return;

  const user = getCurrentUser();
  const role = String(user?.role || 'staff').toLowerCase();
  const allItems = [
    { label: 'Dashboard', href: 'dashboard.html' },
    { label: 'Children', href: 'children.html' },
    { label: 'Vaccinations', href: 'vaccinations.html' },
    { label: 'Schedule', href: 'schedule.html' },
    { label: 'Appointments', href: 'appointments.html' },
    { label: 'Inventory', href: 'inventory.html' },
    { label: 'Reports', href: 'reports.html' },
  ];

  const visibleItems = role === 'admin'
    ? allItems
    : ['nurse', 'staff'].includes(role)
      ? allItems.filter((item) => ['Dashboard', 'Children', 'Vaccinations', 'Appointments'].includes(item.label))
      : role === 'pharmacist'
        ? allItems.filter((item) => ['Dashboard', 'Inventory'].includes(item.label))
        : role === 'records_officer'
          ? allItems.filter((item) => ['Dashboard', 'Reports'].includes(item.label))
          : allItems;

  menu.innerHTML = visibleItems.map((item) => `
    <li class="nav-item">
      <a class="nav-link ${window.location.pathname.endsWith(item.href) ? 'active' : ''}" href="${item.href}">${item.label}</a>
    </li>
  `).join('');

  const logoutItem = document.createElement('li');
  logoutItem.className = 'nav-item mt-3';
  logoutItem.innerHTML = '<a class="nav-link text-danger" href="#" onclick="handleLogout()">Logout</a>';
  menu.appendChild(logoutItem);
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (sidebar) sidebar.classList.toggle('open');
  if (overlay) overlay.classList.toggle('show');
  document.body.classList.toggle('sidebar-open');
}

function closeSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('show');
  document.body.classList.remove('sidebar-open');
}

function getCurrentUser() {
  const storedUser = localStorage.getItem('user');
  if (!storedUser) return null;

  const parsedUser = JSON.parse(storedUser);
  const role = String(parsedUser?.role || 'staff').toLowerCase();
  const normalizedRole = role === 'admin'
    ? 'admin'
    : role === 'parent'
      ? 'parent'
      : role === 'pharmacist'
        ? 'pharmacist'
        : role === 'records_officer' || role === 'records officer' || role === 'records'
          ? 'records_officer'
          : role === 'nurse'
            ? 'nurse'
            : 'staff';

  return { ...parsedUser, role: normalizedRole };
}

function handleLogout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'login.html';
}

function populateUserDisplay() {
  const display = document.getElementById('userDisplay');
  const user = getCurrentUser();
  if (display && user) {
    display.textContent = `${user.name} (${user.role})`;
  }
}

function formatDate(dateString) {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString();
}

function getAge(dateOfBirth) {
  if (!dateOfBirth) return 'N/A';
  const birth = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age -= 1;
  return age;
}

function ensureAuthenticated() {
  if (!localStorage.getItem('token')) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

window.toggleSidebar = toggleSidebar;
window.closeSidebar = closeSidebar;
window.handleLogout = handleLogout;
window.buildSidebar = buildSidebar;
window.populateUserDisplay = populateUserDisplay;

if (document.addEventListener) {
  document.addEventListener('DOMContentLoaded', () => {
    buildSidebar();
    populateUserDisplay();
    // Don't enforce staff authentication on parent pages (they use `parentToken`)
    const isParentPage = window.location.pathname.includes('parent-') || window.location.pathname.includes('/parent/');
    if (!window.location.pathname.includes('login.html') && !window.location.pathname.includes('parent-login.html') && !isParentPage) {
      ensureAuthenticated();
    }
  });
}
