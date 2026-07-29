async function loadVaccinations() {
  const completedList = document.getElementById('completedList');
  const upcomingList = document.getElementById('upcomingList');
  const overdueList = document.getElementById('overdueList');
  if (!completedList || !upcomingList || !overdueList) return;

  try {
    const childrenResp = await fetch(`${API_BASE_URL}/children`, { headers: getAuthHeaders() });
    const childrenData = await childrenResp.json();
    const childSelect = document.getElementById('childSelect');
    const vaccineSelect = document.getElementById('vaccineSelect');

    if (childSelect) {
      childSelect.innerHTML = '<option value="">Select child...</option>' + (childrenData.data || []).map((child) => `<option value="${child._id}">${child.firstName} ${child.lastName}</option>`).join('');
    }
    if (vaccineSelect) {
      vaccineSelect.innerHTML = '<option value="">Select vaccine...</option>' + ['BCG','OPV','Pentavalent','Measles','Rotavirus','PCV','Hepatitis B'].map((name) => `<option value="${name}">${name}</option>`).join('');
    }

    // Get all vaccination records (completed)
    const response = await fetch(`${API_BASE_URL}/vaccinations`, { headers: getAuthHeaders() });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Failed to load vaccinations');
    const records = result.data || [];
    const completed = records.filter((r) => r.status === 'administered');
    renderVaccinationList(completedList, completed, 'completed', 'success');

    // Get upcoming/overdue from the schedule engine for ALL children
    const children = childrenData.data || [];
    const allUpcoming = [];
    const allOverdue = [];

    for (const child of children) {
      try {
        const schedResp = await fetch(`${API_BASE_URL}/schedule/${child._id}`, { headers: getAuthHeaders() });
        if (schedResp.ok) {
          const schedData = await schedResp.json();
          const schedule = schedData.data?.schedule;
          if (schedule) {
            schedule.due.forEach((v) => {
              allOverdue.push({ childName: `${child.firstName} ${child.lastName}`, vaccineName: v.vaccineName, doseNumber: v.doseNumber, administrationDate: null, batchNumber: 'N/A', status: 'due', description: v.description });
            });
            schedule.upcoming.forEach((v) => {
              allUpcoming.push({ childName: `${child.firstName} ${child.lastName}`, vaccineName: v.vaccineName, doseNumber: v.doseNumber, administrationDate: v.dueDate, batchNumber: 'N/A', status: 'upcoming', description: v.description });
            });
          }
        }
      } catch (e) {
        // skip child if schedule fails
      }
    }

    renderVaccinationList(upcomingList, allUpcoming, 'upcoming', 'primary');
    renderVaccinationList(overdueList, allOverdue, 'overdue', 'danger');
  } catch (error) {
    completedList.innerHTML = `<div class="alert alert-danger">${error.message}</div>`;
    upcomingList.innerHTML = `<div class="alert alert-danger">${error.message}</div>`;
    overdueList.innerHTML = `<div class="alert alert-danger">${error.message}</div>`;
  }
}

function renderVaccinationList(container, items, type, badgeColor = 'primary', maxItems = 10) {
  if (!items.length) {
    const emptyMsg = type === 'completed' ? 'No completed vaccinations yet.' : type === 'upcoming' ? 'No upcoming vaccinations scheduled.' : 'No overdue vaccinations.';
    container.innerHTML = `<div class="alert alert-info">${emptyMsg}</div>`;
    return;
  }

  const displayItems = items.slice(0, maxItems);
  const remaining = items.length - maxItems;

  container.innerHTML = displayItems.map((item) => `
    <div class="card mb-3 border-${badgeColor}">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <h6>${item.childName}</h6>
            <p class="mb-1">Vaccine: ${item.vaccineName}</p>
            <p class="mb-1">Dose: ${item.doseNumber}</p>
            <p class="mb-1">Date: ${formatDate(item.administrationDate)}</p>
            <p class="mb-0">Batch: ${item.batchNumber}</p>
          </div>
          <span class="badge bg-${badgeColor}">${type.charAt(0).toUpperCase() + type.slice(1)}</span>
        </div>
      </div>
    </div>
  `).join('');

  if (remaining > 0) {
    container.innerHTML += `<div class="text-center mt-2"><small class="text-muted">+ ${remaining} more records</small></div>`;
  }
}

async function handleRecordVaccination(event) {
  if (event) event.preventDefault();
  const payload = {
    childId: document.getElementById('childSelect').value,
    vaccineName: document.getElementById('vaccineSelect').value,
    doseNumber: Number(document.getElementById('doseNumber').value),
    adminDate: document.getElementById('adminDate').value,
    batchNumber: document.getElementById('batchNumber').value,
    notes: '',
  };

  try {
    const response = await fetch(`${API_BASE_URL}/vaccinations`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Failed to record vaccination');

    document.getElementById('recordVaccinationForm').reset();
    loadVaccinations();
  } catch (error) {
    alert(error.message);
  }
}

window.handleRecordVaccination = handleRecordVaccination;
document.addEventListener('DOMContentLoaded', loadVaccinations);
