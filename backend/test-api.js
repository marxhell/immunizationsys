#!/usr/bin/env node

const BASE_URL = 'http://localhost:5000';
let adminToken = '';
let nurseToken = '';
let parentToken = '';
let childId = '';
let nurseEmail = '';


const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function test(name, fn) {
  try {
    log(`\n▶ ${name}`, 'cyan');
    await fn();
    log('✓ PASSED', 'green');
  } catch (error) {
    log(`✗ FAILED: ${error.message}`, 'red');
  }
}

async function request(method, endpoint, body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const response = await fetch(`${BASE_URL}${endpoint}`, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(`${response.status}: ${data.message || data.error}`);
  }

  return data;
}

async function runTests() {
  log('\n=== CHILD IMMUNIZATION SYSTEM - API TESTS ===\n', 'blue');

  // Test 1: Admin Login
  await test('Admin Login', async () => {
    const result = await request('POST', '/api/auth/login', {
      email: 'admin@childvacc.org',
      password: 'Admin@12345',
    });
    adminToken = result.data?.token;
    if (!adminToken) throw new Error('No token received');
  });

  // Test 2: Get all users (admin-only)
  await test('Get All Users (Admin)', async () => {
    const result = await request('GET', '/api/auth/users', null, adminToken);
    if (!Array.isArray(result.data)) throw new Error('Expected array of users');
  });

  // Test 3: Create Nurse User
  await test('Create Nurse User', async () => {
    nurseEmail = `nurse-${Date.now()}@test.com`;
    const result = await request('POST', '/api/auth/register', {
      name: 'Nurse Test User',
      email: nurseEmail,
      password: 'Nurse@123456',
      role: 'staff',
      department: 'Nursing',
    }, adminToken);
    if (!result.data?.user?.email) throw new Error('User not created');
  });

  // Test 4: Nurse Login
  await test('Nurse Login', async () => {
    const result = await request('POST', '/api/auth/login', {
      email: nurseEmail,
      password: 'Nurse@123456',
    });
    nurseToken = result.data?.token;
    if (!nurseToken) throw new Error('No token received');
  });

  // Test 5: Create Child
  await test('Create Child', async () => {
    const result = await request('POST', '/api/children', {
      firstName: 'Test',
      lastName: 'Child',
      dateOfBirth: '2024-01-15',
      gender: 'male',
      bloodGroup: 'O+',
      guardianName: 'Parent Name',
      guardianEmail: 'parent@test.com',
      guardianPhone: '1234567890',
      guardianRelationship: 'mother',
    }, nurseToken);
    childId = result.data._id;
    if (!childId) throw new Error('Child not created');
  });

  // Test 6: Get All Children
  await test('Get All Children', async () => {
    const result = await request('GET', '/api/children', null, nurseToken);
    if (!Array.isArray(result.data)) throw new Error('Expected array of children');
    if (result.data.length === 0) throw new Error('No children found');
  });

  // Test 7: Create Vaccination Record
  await test('Create Vaccination Record', async () => {
    const result = await request('POST', '/api/vaccinations', {
      childId: childId,
      vaccineName: 'Pentavalent',
      doseNumber: 1,
      adminDate: new Date().toISOString(),
      batchNumber: 'BATCH-001',
      notes: 'Test vaccination',
    }, nurseToken);
    if (!result.data._id) throw new Error('Vaccination not recorded');
  });

  // Test 8: Create Appointment
  await test('Create Appointment', async () => {
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const result = await request('POST', '/api/appointments', {
      childId: childId,
      vaccineName: 'Measles',
      appointmentDate: futureDate.toISOString(),
      appointmentTime: '10:00 AM',
    }, nurseToken);
    if (!result.data._id) throw new Error('Appointment not created');
  });

  // Test 9: Get Reports
  await test('Get Reports (Analytics)', async () => {
    const result = await request('GET', '/api/reports', null, nurseToken);
    if (result.data.totalChildren === undefined) throw new Error('Missing totalChildren');
    if (result.data.totalVaccinations === undefined) throw new Error('Missing totalVaccinations');
  });

  // Test 10: Get Vaccine Batches
  await test('Get Vaccine Batches', async () => {
    const result = await request('GET', '/api/inventory', null, nurseToken);
    if (!Array.isArray(result.data)) throw new Error('Expected array of batches');
    if (result.data.length === 0) throw new Error('No batches found');
  });

  // Test 11: Parent Login
  await test('Parent Login (Lookup Child)', async () => {
    const result = await request('POST', '/api/parent/auth/login', {
      identifier: 'parent@example.com',
      phoneNumber: '1234567890',
    });
    parentToken = result.data?.token;
    if (!parentToken) throw new Error('No token received');
  });

  // Test 12: Verify Parent Cannot Access Staff User List
  await test('Parent Cannot Access User List', async () => {
    try {
      await request('GET', '/api/auth/users', null, parentToken);
      throw new Error('Should not have access');
    } catch (error) {
      if (error.message.includes('401') || error.message.includes('403')) {
        return;
      }
      throw error;
    }
  });

  log('\n=== TEST SUITE COMPLETED ===\n', 'blue');
}

// Run tests
runTests().catch((error) => {
  log(`\nUnexpected error: ${error.message}`, 'red');
  process.exit(1);
});
