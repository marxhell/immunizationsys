// Use shared getApiBaseUrl() from utils.js when available, otherwise fall back
const API_BASE_URL = (typeof getApiBaseUrl === 'function')
  ? getApiBaseUrl()
  : (['localhost', '127.0.0.1', '[::1]', ''].includes(window.location.hostname) ? 'http://localhost:5000/api' : '/api');

function getParentAuthHeaders() {
  const token = localStorage.getItem('parentToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function getParentUser() {
  const stored = localStorage.getItem('parentUser');
  return stored ? JSON.parse(stored) : null;
}

function handleParentLogout() {
  localStorage.removeItem('parentToken');
  localStorage.removeItem('parentUser');
  window.location.href = 'parent-login.html';
}

async function loadParentDashboard() {
  const user = getParentUser();
  if (!user) {
    window.location.href = 'parent-login.html';
    return;
  }

  document.getElementById('parentNameDisplay').textContent = user.name || 'Parent';
  document.getElementById('welcomeMessage').textContent = `Welcome, ${user.name || 'Parent'}!`;

  try {
    const response = await fetch(`${API_BASE_URL}/children/parent/me`, { headers: getParentAuthHeaders() });
    const contentType = response.headers.get('content-type') || '';
    let result;
    if (contentType.includes('application/json')) {
      result = await response.json();
    } else {
      const text = await response.text();
      throw new Error(`Unexpected response type: ${contentType || 'text/html'} — ${text.slice(0,200)}`);
    }
    if (!response.ok) throw new Error(result.message || 'Failed to load parent dashboard');

    const payload = result.data || {};
    const child = payload.child || (Array.isArray(payload) ? payload[0] : null);
    const appointments = payload.appointments || [];
    const records = payload.records || [];
    const children = child ? [child] : [];

    const now = new Date();
    const upcomingAppointments = appointments.filter((appointment) => {
      const date = new Date(appointment.appointmentDate);
      return appointment.status === 'scheduled' && date >= now && (date - now) <= 30 * 24 * 60 * 60 * 1000;
    });
    const overdueAppointments = appointments.filter((appointment) => {
      const date = new Date(appointment.appointmentDate);
      return appointment.status === 'scheduled' && date < now;
    });
    const completedRecords = records.filter((record) => record.status === 'administered');

    document.getElementById('parentStats').innerHTML = `
      <div class="col-md-4"><div class="stat-card"><div class="stat-number">${children.length}</div><div class="stat-label">Children</div></div></div>
      <div class="col-md-4"><div class="stat-card outline"><div class="stat-number">${upcomingAppointments.length}</div><div class="stat-label">Upcoming</div></div></div>
      <div class="col-md-4"><div class="stat-card warning"><div class="stat-number">${overdueAppointments.length}</div><div class="stat-label">Overdue</div></div></div>
    `;

    document.getElementById('childrenList').innerHTML = children.map((item) => `
      <div class="col-md-6 mb-3">
        <div class="card child-card p-3">
          <div class="d-flex align-items-center mb-3">
            <div class="child-avatar me-3">${item.firstName?.[0] || 'C'}</div>
            <div>
              <h5 class="mb-1">${item.firstName} ${item.lastName}</h5>
              <p class="mb-0 text-muted">DOB: ${new Date(item.dateOfBirth).toLocaleDateString()}</p>
            </div>
          </div>
          <p class="mb-1"><strong>Patient ID:</strong> ${item.patientId}</p>
          <p class="mb-1"><strong>Guardian:</strong> ${item.guardianName || '—'}</p>
          <button class="btn btn-parent btn-sm mt-2" onclick="viewParentChild('${item._id}')">View Details</button>
        </div>
      </div>
    `).join('');

    const renderList = (items, emptyMessage) => {
      if (!items.length) {
        return `<div class="alert alert-info mb-0">${emptyMessage}</div>`;
      }

      return items.map((item) => `
        <div class="schedule-item ${item.status === 'completed' ? 'completed' : ''} ${item.status === 'scheduled' && new Date(item.appointmentDate) < now ? 'overdue' : ''}">
          <div class="d-flex justify-content-between align-items-start gap-2">
            <div>
              <h6 class="mb-1">${item.vaccineName || item.vaccineName || 'Vaccination'}</h6>
              <p class="mb-1 text-muted">${new Date(item.appointmentDate).toLocaleDateString()} at ${item.appointmentTime || 'TBD'}</p>
              <small class="text-muted">Status: ${item.status}</small>
            </div>
            <span class="vaccine-badge">${item.status === 'scheduled' ? 'Upcoming' : item.status}</span>
          </div>
        </div>
      `).join('');
    };

    const renderRecords = (items, emptyMessage) => {
      if (!items.length) {
        return `<div class="alert alert-info mb-0">${emptyMessage}</div>`;
      }

      return items.map((item) => `
        <div class="schedule-item completed">
          <div class="d-flex justify-content-between align-items-start gap-2">
            <div>
              <h6 class="mb-1">${item.vaccineName}</h6>
              <p class="mb-1 text-muted">Dose ${item.doseNumber} • ${new Date(item.administrationDate).toLocaleDateString()}</p>
              <small class="text-muted">Batch: ${item.batchNumber}</small>
            </div>
            <span class="vaccine-badge">Completed</span>
          </div>
        </div>
      `).join('');
    };

    document.getElementById('fullScheduleList').innerHTML = renderList(appointments, 'No vaccination appointments have been scheduled yet.');
    document.getElementById('completedVaccinationsList').innerHTML = renderRecords(completedRecords, 'No completed vaccinations recorded yet.');
    document.getElementById('upcomingVaccinationsList').innerHTML = renderList(upcomingAppointments, 'No upcoming vaccinations in the next 30 days.');
    document.getElementById('overdueVaccinationsList').innerHTML = renderList(overdueAppointments, 'No overdue vaccinations at the moment.');
    document.getElementById('diseaseCards').innerHTML = [
      ['Measles', 'A highly contagious disease that can cause fever, cough, rash and severe complications. The measles vaccine is part of routine immunization in Kenya.', 'Measles vaccine'],
      ['Polio', 'A viral disease that can lead to paralysis. The polio vaccine helps prevent lifelong disability and is given in early childhood.', 'Polio vaccine'],
      ['Tuberculosis', 'TB is a serious bacterial disease that can affect the lungs and other organs. The BCG vaccine protects against severe forms of the illness.', 'BCG vaccine'],
      ['Pneumococcal Disease', 'This can cause pneumonia, meningitis and severe infections in young children. PCV vaccination helps reduce these risks.', 'PCV vaccine'],
      ['Rotavirus Diarrhea', 'A common cause of severe diarrhea and dehydration in infants. Rotavirus vaccination lowers the chance of hospitalization.', 'Rotavirus vaccine'],
      ['Hepatitis B', 'A viral infection that can damage the liver and spread from mother to child. Hepatitis B vaccination is part of the standard Kenyan schedule.', 'Hepatitis B vaccine'],
    ].map(([title, desc, vaccine]) => `
      <div class="col-md-6 col-xl-4 mb-3">
        <div class="card disease-card">
          <div class="card-header">${title}</div>
          <div class="card-body">
            <p class="mb-2">${desc}</p>
            <span class="vaccine-badge">${vaccine}</span>
          </div>
        </div>
      </div>
    `).join('');
  } catch (error) {
    document.getElementById('parentStats').innerHTML = `<div class="col-12"><div class="alert alert-danger">${error.message}</div></div>`;
  }
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (sidebar) sidebar.classList.toggle('open');
  if (overlay) overlay.classList.toggle('show');
}

function closeSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('show');
}

function switchSection(section, button) {
  document.querySelectorAll('.content-section').forEach((el) => el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach((el) => el.classList.remove('active'));
  document.getElementById(`section-${section}`).classList.add('active');
  if (button) button.classList.add('active');
  closeSidebar();
}

function viewParentChild(id) {
  alert('Child detail view is ready for further expansion.');
}

window.handleParentLogout = handleParentLogout;
window.switchSection = switchSection;
window.toggleSidebar = toggleSidebar;
window.closeSidebar = closeSidebar;
window.viewParentChild = viewParentChild;
document.addEventListener('DOMContentLoaded', loadParentDashboard);
