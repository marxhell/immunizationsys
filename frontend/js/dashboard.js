async function loadDashboard() {
  const container = document.getElementById('dashboardContent') || document.getElementById('dashboardStats');
  if (!container) return;

  const currentUser = getCurrentUser();
  const userRole = String(currentUser?.role || 'staff').toLowerCase();

  try {
    const reportsResponse = await fetch(`${API_BASE_URL}/reports`, { headers: getAuthHeaders() });
    const reportsResult = await reportsResponse.json();

    if (!reportsResponse.ok) throw new Error(reportsResult.message || 'Failed to load dashboard');

    const stats = reportsResult.data;
    const isAdmin = userRole === 'admin';

    let staffSection = '';
    let adminModal = '';

    if (isAdmin) {
      const usersResponse = await fetch(`${API_BASE_URL}/auth/users`, { headers: getAuthHeaders() });
      const usersResult = await usersResponse.json();
      if (!usersResponse.ok) throw new Error(usersResult.message || 'Failed to load users');
      const users = usersResult.data || [];

      staffSection = `
        <div class="card mt-4">
          <div class="card-header d-flex justify-content-between align-items-center">
            <h5 class="mb-0">Staff Accounts</h5>
            <button class="btn btn-primary btn-sm" data-bs-toggle="modal" data-bs-target="#addUserModal">Add Staff User</button>
          </div>
          <div class="card-body">
            <div class="table-responsive">
              <table class="table table-sm">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Department</th>
                  </tr>
                </thead>
                <tbody>
                  ${users.map((user) => `
                    <tr>
                      <td>${user.name}</td>
                      <td>${user.email}</td>
                      <td>${user.role}</td>
                      <td>${user.department || '—'}</td>
                      <td>
                        <button class="btn btn-sm btn-outline-secondary me-1" onclick="openEditUserModal('${user._id}', '${user.name.replace(/'/g, "\\'")}', '${user.role}', '${(user.department || '').replace(/'/g, "\\'")}')">Edit</button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteUser('${user._id}')">Delete</button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="modal fade" id="addUserModal" tabindex="-1">
          <div class="modal-dialog">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">Add Staff User</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
              </div>
              <div class="modal-body">
                <form id="addUserForm" onsubmit="event.preventDefault(); handleAddUser();">
                  <div class="mb-3">
                    <label class="form-label">Full Name</label>
                    <input type="text" class="form-control" id="newUserName" required>
                  </div>
                  <div class="mb-3">
                    <label class="form-label">Email Address</label>
                    <input type="email" class="form-control" id="newUserEmail" required>
                  </div>
                  <div class="mb-3">
                    <label class="form-label">Temporary Password</label>
                    <input type="password" class="form-control" id="newUserPassword" required>
                  </div>
                  <div class="mb-3">
                    <label class="form-label">Role</label>
                    <select class="form-select" id="newUserRole" required>
                      <option value="nurse">Nurse</option>
                      <option value="pharmacist">Pharmacist</option>
                      <option value="records_officer">Records Officer</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>
                  <div class="mb-3">
                    <label class="form-label">Department</label>
                    <input type="text" class="form-control" id="newUserDepartment" placeholder="e.g. Immunization, Pharmacy">
                  </div>
                  <button type="submit" class="btn btn-primary w-100">Create Account</button>
                </form>
              </div>
            </div>
          </div>
        </div>

        <div class="modal fade" id="editUserModal" tabindex="-1">
          <div class="modal-dialog">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">Edit Staff User</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
              </div>
              <div class="modal-body">
                <form id="editUserForm" onsubmit="event.preventDefault(); handleEditUser();">
                  <input type="hidden" id="editUserId">
                  <div class="mb-3">
                    <label class="form-label">Full Name</label>
                    <input type="text" class="form-control" id="editUserName" required>
                  </div>
                  <div class="mb-3">
                    <label class="form-label">New Password</label>
                    <input type="password" class="form-control" id="editUserPassword" placeholder="Leave blank to keep current password">
                  </div>
                  <div class="mb-3">
                    <label class="form-label">Role</label>
                    <select class="form-select" id="editUserRole" required>
                      <option value="nurse">Nurse</option>
                      <option value="pharmacist">Pharmacist</option>
                      <option value="records_officer">Records Officer</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>
                  <div class="mb-3">
                    <label class="form-label">Department</label>
                    <input type="text" class="form-control" id="editUserDepartment" placeholder="e.g. Immunization, Pharmacy">
                  </div>
                  <button type="submit" class="btn btn-primary w-100">Save Changes</button>
                </form>
              </div>
            </div>
          </div>
        </div>
      `;
    } else {
      const roleLabel = ['nurse', 'staff'].includes(userRole)
        ? 'Nurse workspace'
        : userRole === 'pharmacist'
          ? 'Pharmacy workspace'
          : userRole === 'records_officer'
            ? 'Records workspace'
            : 'Staff workspace';

      staffSection = `
        <div class="card mt-4">
          <div class="card-body">
            <h5 class="card-title">${roleLabel}</h5>
            <p class="text-muted mb-0">Use the menu on the left to access the modules assigned to your role.</p>
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      <h2 class="mb-4">Dashboard</h2>
      <div class="row mb-4">
        <div class="col-md-3 mb-3">
          <div class="card text-bg-primary h-100">
            <div class="card-body">
              <h6 class="card-title">Children Registered</h6>
              <h2>${stats.totalChildren}</h2>
            </div>
          </div>
        </div>
        <div class="col-md-3 mb-3">
          <div class="card text-bg-success h-100">
            <div class="card-body">
              <h6 class="card-title">Vaccinations Recorded</h6>
              <h2>${stats.totalVaccinations}</h2>
            </div>
          </div>
        </div>
        <div class="col-md-3 mb-3">
          <div class="card text-bg-warning h-100">
            <div class="card-body">
              <h6 class="card-title">Scheduled Appointments</h6>
              <h2>${stats.upcomingAppointments}</h2>
            </div>
          </div>
        </div>
        <div class="col-md-3 mb-3">
          <div class="card text-bg-danger h-100">
            <div class="card-body">
              <h6 class="card-title">Low Stock Batches</h6>
              <h2>${stats.lowStock}</h2>
            </div>
          </div>
        </div>
      </div>
      ${staffSection}
    `;
  } catch (error) {
    container.innerHTML = `<div class="alert alert-danger">${error.message}</div>`;
  }
}

async function handleAddUser() {
  const payload = {
    name: document.getElementById('newUserName').value.trim(),
    email: document.getElementById('newUserEmail').value.trim().toLowerCase(),
    password: document.getElementById('newUserPassword').value.trim(),
    role: document.getElementById('newUserRole').value,
    department: document.getElementById('newUserDepartment').value.trim(),
  };

  try {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Failed to create user');

    document.getElementById('addUserForm').reset();
    bootstrap.Modal.getInstance(document.getElementById('addUserModal')).hide();
    loadDashboard();
    alert(`Account created for ${result.data.user.email}`);
  } catch (error) {
    alert(error.message);
  }
}

async function openEditUserModal(userId, name, role, department) {
  document.getElementById('editUserId').value = userId;
  document.getElementById('editUserName').value = name;
  document.getElementById('editUserRole').value = role;
  document.getElementById('editUserDepartment').value = department || '';
  document.getElementById('editUserPassword').value = '';
  bootstrap.Modal.getOrCreateInstance(document.getElementById('editUserModal')).show();
}

async function handleEditUser() {
  const userId = document.getElementById('editUserId').value;
  const payload = {
    name: document.getElementById('editUserName').value.trim(),
    password: document.getElementById('editUserPassword').value.trim(),
    role: document.getElementById('editUserRole').value,
    department: document.getElementById('editUserDepartment').value.trim(),
  };

  try {
    const response = await fetch(`${API_BASE_URL}/auth/users/${userId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Failed to update user');

    bootstrap.Modal.getInstance(document.getElementById('editUserModal')).hide();
    loadDashboard();
    alert('User updated successfully');
  } catch (error) {
    alert(error.message);
  }
}

async function deleteUser(userId) {
  if (!confirm('Delete this user account?')) return;

  try {
    const response = await fetch(`${API_BASE_URL}/auth/users/${userId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Failed to delete user');

    loadDashboard();
    alert('User deleted successfully');
  } catch (error) {
    alert(error.message);
  }
}

window.loadDashboard = loadDashboard;
window.handleAddUser = handleAddUser;
window.openEditUserModal = openEditUserModal;
window.handleEditUser = handleEditUser;
window.deleteUser = deleteUser;
document.addEventListener('DOMContentLoaded', loadDashboard);
