async function loadVaccinations() {
  const upcomingList = document.getElementById('upcomingList');
  const overdueList = document.getElementById('overdueList');
  if (!upcomingList || !overdueList) return;

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

    const response = await fetch(`${API_BASE_URL}/vaccinations`, { headers: getAuthHeaders() });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Failed to load vaccinations');

    const records = result.data || [];
    const today = new Date();
    const upcoming = records.filter((r) => new Date(r.administrationDate) > today);
    const overdue = records.filter((r) => new Date(r.administrationDate) < today);

    renderVaccinationList(upcomingList, upcoming, 'upcoming');
    renderVaccinationList(overdueList, overdue, 'overdue');
  } catch (error) {
    upcomingList.innerHTML = `<div class="alert alert-danger">${error.message}</div>`;
    overdueList.innerHTML = `<div class="alert alert-danger">${error.message}</div>`;
  }
}

function renderVaccinationList(container, items, type) {
  if (!items.length) {
    container.innerHTML = '<div class="alert alert-info">No vaccinations found.</div>';
    return;
  }

  container.innerHTML = items.map((item) => `
    <div class="card mb-3">
      <div class="card-body">
        <h6>${item.childName}</h6>
        <p class="mb-1">Vaccine: ${item.vaccineName}</p>
        <p class="mb-1">Dose: ${item.doseNumber}</p>
        <p class="mb-1">Date: ${formatDate(item.administrationDate)}</p>
        <p class="mb-0">Batch: ${item.batchNumber}</p>
      </div>
    </div>
  `).join('');
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
