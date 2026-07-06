async function loadInventory() {
  const inventoryList = document.getElementById('inventoryList');
  const lowStockList = document.getElementById('lowStockList');
  const expiringList = document.getElementById('expiringList');
  const lowStockCount = document.getElementById('lowStockCount');
  const expiringCount = document.getElementById('expiringCount');
  const totalStock = document.getElementById('totalStock');
  if (!inventoryList || !lowStockList || !expiringList) return;

  try {
    const response = await fetch(`${API_BASE_URL}/inventory`, {
      headers: getAuthHeaders(),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Failed to load inventory');

    const batches = result.data || [];
    const lowStock = batches.filter((b) => b.quantity <= b.minStock);
    const expiring = batches.filter((b) => new Date(b.expiryDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));

    if (lowStockCount) lowStockCount.textContent = lowStock.length;
    if (expiringCount) expiringCount.textContent = expiring.length;
    if (totalStock) totalStock.textContent = batches.reduce((sum, b) => sum + b.quantity, 0);

    renderInventoryList(inventoryList, batches);
    renderInventoryList(lowStockList, lowStock);
    renderInventoryList(expiringList, expiring);
  } catch (error) {
    [inventoryList, lowStockList, expiringList].forEach((el) => {
      el.innerHTML = `<div class="alert alert-danger">${error.message}</div>`;
    });
  }
}

function renderInventoryList(container, batches) {
  if (!batches.length) {
    container.innerHTML = '<div class="alert alert-info">No batches found.</div>';
    return;
  }

  container.innerHTML = batches.map((batch) => `
    <div class="card mb-3">
      <div class="card-body">
        <h6>${batch.vaccineName} • ${batch.batchNumber}</h6>
        <p class="mb-1">Quantity: ${batch.quantity}</p>
        <p class="mb-1">Min Stock: ${batch.minStock}</p>
        <p class="mb-1">Expiry: ${formatDate(batch.expiryDate)}</p>
        <p class="mb-0">Supplier: ${batch.supplier}</p>
      </div>
    </div>
  `).join('');
}

async function handleAddVaccine(event) {
  if (event) event.preventDefault();
  const payload = {
    vaccineName: document.getElementById('vaccineName').value,
    batchNumber: document.getElementById('batchNumber').value,
    quantity: Number(document.getElementById('quantity').value),
    minStock: Number(document.getElementById('minStock').value),
    dateReceived: document.getElementById('dateReceived').value,
    expiryDate: document.getElementById('expiryDate').value,
    supplier: document.getElementById('supplier').value,
  };

  try {
    const response = await fetch(`${API_BASE_URL}/inventory`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Failed to add vaccine');

    document.getElementById('vaccineForm').reset();
    bootstrap.Modal.getInstance(document.getElementById('addVaccineModal')).hide();
    loadInventory();
  } catch (error) {
    alert(error.message);
  }
}

window.handleAddVaccine = handleAddVaccine;
document.addEventListener('DOMContentLoaded', loadInventory);
