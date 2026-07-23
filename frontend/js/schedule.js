async function loadChildrenForSchedule() {
  try {
    const response = await fetch(`${API_BASE_URL}/children`, { headers: getAuthHeaders() });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Failed to load children');

    const select = document.getElementById('scheduleChildSelect');
    if (select) {
      select.innerHTML = '<option value="">-- Select a child --</option>' +
        (result.data || []).map((child) =>
          `<option value="${child._id}">${child.firstName} ${child.lastName} (${child.patientId})</option>`
        ).join('');
    }

    // Load reference schedule in the background
    loadReferenceSchedule();
  } catch (error) {
    console.error(error);
  }
}

async function loadChildSchedule() {
  const childId = document.getElementById('scheduleChildSelect').value;
  if (!childId) {
    document.getElementById('dueVaccinesList').innerHTML = '<div class="alert alert-info mb-0">Select a child to view their schedule.</div>';
    document.getElementById('upcomingVaccinesList').innerHTML = '<div class="alert alert-info mb-0">Select a child to view their schedule.</div>';
    document.getElementById('completedVaccinesList').innerHTML = '<div class="alert alert-info mb-0">Select a child to view their schedule.</div>';
    document.getElementById('dueCount').textContent = '0';
    document.getElementById('upcomingCount').textContent = '0';
    document.getElementById('completedCount').textContent = '0';
    document.getElementById('childAgeDisplay').textContent = '—';
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/schedule/${childId}`, { headers: getAuthHeaders() });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Failed to load schedule');

    const data = result.data;
    const child = data.child;
    const schedule = data.schedule;

    // Display child age
    document.getElementById('childAgeDisplay').textContent =
      `${child.ageWeeks} weeks (${child.ageMonths} months)`;

    // Summary cards
    document.getElementById('dueCount').textContent = schedule.due.length;
    document.getElementById('upcomingCount').textContent = schedule.upcoming.length;
    document.getElementById('completedCount').textContent = schedule.completed.length;
    document.getElementById('dueBadge').textContent = schedule.due.length;
    document.getElementById('upcomingBadge').textContent = schedule.upcoming.length;
    document.getElementById('completedBadge').textContent = schedule.completed.length;

    // Due vaccines (overdue)
    renderScheduleList('dueVaccinesList', schedule.due, 'danger');
    renderScheduleList('upcomingVaccinesList', schedule.upcoming, 'warning');
    renderScheduleList('completedVaccinesList', schedule.completed, 'success');

  } catch (error) {
    document.getElementById('dueVaccinesList').innerHTML =
      `<div class="alert alert-danger mb-0">${error.message}</div>`;
  }
}

function renderScheduleList(containerId, items, badgeClass) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!items.length) {
    container.innerHTML = `<div class="alert alert-info mb-0">No vaccines in this category.</div>`;
    return;
  }

  container.innerHTML = items.map((item) => {
    let extraInfo = '';
    if (item.dueDate) {
      extraInfo = `<small class="text-muted">Due: ${formatDate(item.dueDate)}</small>`;
    }
    if (item.ageAtDue !== undefined) {
      extraInfo = `<small class="text-muted">Was due at ${item.ageAtDue} weeks</small>`;
    }

    return `
      <div class="card mb-2">
        <div class="card-body py-2 px-3">
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <strong>${item.vaccineName}</strong> — Dose ${item.doseNumber}
              <br><small class="text-muted">${item.description}</small>
            </div>
            <span class="badge bg-${badgeClass}">${item.status}</span>
          </div>
          ${extraInfo ? `<div class="mt-1">${extraInfo}</div>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

async function loadReferenceSchedule() {
  const container = document.getElementById('referenceSchedule');
  if (!container) return;

  try {
    const response = await fetch(`${API_BASE_URL}/schedule`, { headers: getAuthHeaders() });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Failed to load schedule');

    const schedule = result.data || [];
    let tableHtml = `
      <div class="table-responsive">
        <table class="table table-sm table-striped">
          <thead>
            <tr>
              <th>Vaccine</th>
              <th>Dose</th>
              <th>Due Age</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
    `;

    schedule.forEach((item) => {
      const ageDesc = item.dueAgeWeeks === 0
        ? 'At birth'
        : item.dueAgeMonths >= 12
          ? `${item.dueAgeMonths / 12} year(s)`
          : `${item.dueAgeMonths} month(s)`;

      tableHtml += `
        <tr>
          <td><strong>${item.vaccineName}</strong></td>
          <td>${item.doseNumber}</td>
          <td>${ageDesc}</td>
          <td>${item.description}</td>
        </tr>
      `;
    });

    tableHtml += '</tbody></table></div>';
    container.innerHTML = tableHtml;
  } catch (error) {
    container.innerHTML = `<div class="alert alert-danger mb-0">${error.message}</div>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadChildrenForSchedule();
});