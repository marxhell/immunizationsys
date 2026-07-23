async function loadAppointments() {
  const todayList = document.getElementById('todayList');
  const allList = document.getElementById('allList');
  const missedList = document.getElementById('missedList');
  if (!todayList || !allList || !missedList) return;

  try {
    const response = await fetch(`${API_BASE_URL}/appointments`, {
      headers: getAuthHeaders(),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Failed to load appointments');

    const appointments = result.data || [];
    const today = new Date().toISOString().slice(0, 10);

    const todayAppointments = appointments.filter((a) => a.appointmentDate?.slice(0, 10) === today);
    const missedAppointments = appointments.filter((a) => a.status === 'missed');

    renderList(todayList, todayAppointments);
    renderList(allList, appointments);
    renderList(missedList, missedAppointments);
  } catch (error) {
    [todayList, allList, missedList].forEach((el) => {
      el.innerHTML = `<div class="alert alert-danger">${error.message}</div>`;
    });
  }
}

function renderList(container, items) {
  if (!items.length) {
    container.innerHTML = '<div class="alert alert-info">No appointments found.</div>';
    return;
  }

  container.innerHTML = items.map((item) => `
    <div class="card mb-3">
      <div class="card-body">
        <h6>${item.childName || 'Child'}</h6>
        <p class="mb-1">Vaccine: ${item.vaccineName}</p>
        <p class="mb-1">Date: ${formatDate(item.appointmentDate)} ${item.appointmentTime || ''}</p>
        <p class="mb-0">Status: <span class="badge bg-primary">${item.status}</span></p>
      </div>
    </div>
  `).join('');
}

async function handleCreateAppointment(event) {
  if (event) event.preventDefault();
  const payload = {
    childId: document.getElementById('appointmentChild').value,
    vaccineName: document.getElementById('appointmentVaccine').value,
    appointmentDate: document.getElementById('appointmentDate').value,
    appointmentTime: document.getElementById('appointmentTime').value,
  };

  try {
    const response = await fetch(`${API_BASE_URL}/appointments`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Failed to create appointment');

    document.getElementById('appointmentForm').reset();
    bootstrap.Modal.getInstance(document.getElementById('createAppointmentModal')).hide();
    loadAppointments();
    populateAppointmentSelects();
  } catch (error) {
    alert(error.message);
  }
}

async function handleSendReminders() {
  const button = document.getElementById('sendRemindersBtn');
  if (button) {
    button.disabled = true;
    button.textContent = 'Sending...';
  }

  try {
    const response = await fetch(`${API_BASE_URL}/appointments/reminders`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Failed to send reminders');
    alert(`Sent ${result.data.sent} reminder(s) for appointments in the next 24 hours.`);
    loadAppointments();
  } catch (error) {
    alert(error.message);
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = 'Send Reminders';
    }
  }
}

async function populateAppointmentSelects() {
  try {
    const childrenResp = await fetch(`${API_BASE_URL}/children`, { headers: getAuthHeaders() });
    const childrenData = await childrenResp.json();
    const childSelect = document.getElementById('appointmentChild');
    const vaccineSelect = document.getElementById('appointmentVaccine');

    if (childSelect) {
      childSelect.innerHTML = '<option value="">Select child...</option>' + (childrenData.data || []).map((child) => `<option value="${child._id}">${child.firstName} ${child.lastName}</option>`).join('');
    }

    if (vaccineSelect) {
      vaccineSelect.innerHTML = '<option value="">Select vaccine...</option>' + ['BCG','OPV','Pentavalent','Measles','Rotavirus','PCV','Hepatitis B'].map((name) => `<option value="${name}">${name}</option>`).join('');
    }
  } catch (error) {
    console.error(error);
  }
}

window.handleCreateAppointment = handleCreateAppointment;
window.handleSendReminders = handleSendReminders;
document.addEventListener('DOMContentLoaded', () => {
  populateAppointmentSelects();
  loadAppointments();
});
