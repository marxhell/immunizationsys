function canDeleteChildren() {
  const user = getCurrentUser();
  return user?.role === 'admin';
}

async function loadChildren() {
  const list = document.getElementById('childrenList');
  if (!list) return;

  try {
    const response = await fetch(`${API_BASE_URL}/children`, {
      headers: getAuthHeaders(),
    });
    const result = await response.json();

    if (!response.ok) throw new Error(result.message || 'Failed to load children');

    if (!result.data.length) {
      list.innerHTML = '<div class="alert alert-info">No children registered yet.</div>';
      return;
    }

    list.innerHTML = result.data.map((child) => {
      const childName = `${child.firstName} ${child.lastName}`.replace(/'/g, "\\'");
      return `
        <div class="card mb-3">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start">
              <div>
                <h5>${child.firstName} ${child.lastName}</h5>
                <p class="mb-1">Patient ID: ${child.patientId}</p>
                <p class="mb-1">DOB: ${formatDate(child.dateOfBirth)} • Age: ${getAge(child.dateOfBirth)}</p>
                <p class="mb-1">Guardian: ${child.guardianName || '—'}</p>
                <p class="mb-0 text-muted">${child.guardianEmail || ''}</p>
              </div>
              <div class="d-flex gap-2">
                <button class="btn btn-outline-primary btn-sm" onclick="viewChildDetails('${child._id}')">View</button>
                ${canDeleteChildren() ? `<button class="btn btn-outline-danger btn-sm" onclick="handleDeleteChild('${child._id}', '${childName}')">Delete</button>` : ''}
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  } catch (error) {
    list.innerHTML = `<div class="alert alert-danger">${error.message}</div>`;
  }
}

async function handleRegisterChild() {
  const payload = {
    firstName: document.getElementById('firstName').value.trim(),
    lastName: document.getElementById('lastName').value.trim(),
    dateOfBirth: document.getElementById('dateOfBirth').value,
    gender: document.getElementById('gender').value,
    bloodGroup: document.getElementById('bloodGroup').value,
    guardianName: document.getElementById('guardianName').value.trim(),
    guardianRelationship: document.getElementById('guardianRelationship').value,
    guardianEmail: document.getElementById('guardianEmail').value.trim(),
    guardianPhone: document.getElementById('guardianPhone').value.trim(),
  };

  try {
    const response = await fetch(`${API_BASE_URL}/children`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Failed to register child');

    document.getElementById('registerChildForm').reset();
    bootstrap.Modal.getInstance(document.getElementById('registerChildModal')).hide();
    loadChildren();
  } catch (error) {
    alert(error.message);
  }
}

async function handleDeleteChild(id, name) {
  if (!confirm(`Delete ${name} from the system? This will remove their records and appointments.`)) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/children/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Failed to delete child');

    loadChildren();
    alert(`${name} was deleted successfully.`);
  } catch (error) {
    alert(error.message);
  }
}

async function viewChildDetails(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/children/${id}`, {
      headers: getAuthHeaders(),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Failed to load child details');

    const { child, appointments, records } = result.data;
    document.getElementById('childDetailsContent').innerHTML = `
      <h5>${child.firstName} ${child.lastName}</h5>
      <p><strong>Patient ID:</strong> ${child.patientId}</p>
      <p><strong>DOB:</strong> ${formatDate(child.dateOfBirth)} (${getAge(child.dateOfBirth)} years)</p>
      <p><strong>Gender:</strong> ${child.gender}</p>
      <p><strong>Guardian:</strong> ${child.guardianName || '—'} (${child.guardianRelationship || '—'})</p>
      <p><strong>Contact:</strong> ${child.guardianEmail || '—'} / ${child.guardianPhone || '—'}</p>
      <hr>
      <h6>Appointments</h6>
      <ul>${appointments.map((a) => `<li>${formatDate(a.appointmentDate)} - ${a.vaccineName} (${a.status})</li>`).join('')}</ul>
      <h6>Vaccination Records</h6>
      <ul>${records.map((r) => `<li>${formatDate(r.administrationDate)} - Dose ${r.doseNumber} ${r.vaccineName}</li>`).join('')}</ul>
    `;
    new bootstrap.Modal(document.getElementById('childDetailsModal')).show();
  } catch (error) {
    alert(error.message);
  }
}

window.handleRegisterChild = handleRegisterChild;
window.handleDeleteChild = handleDeleteChild;
window.viewChildDetails = viewChildDetails;
document.addEventListener('DOMContentLoaded', loadChildren);
