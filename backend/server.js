const path = require('path');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const User = require('./models/User');
const Child = require('./models/Child');
const Appointment = require('./models/Appointment');
const VaccineBatch = require('./models/VaccineBatch');
const VaccinationRecord = require('./models/VaccinationRecord');

dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// Enhanced CORS for production
const frontendUrlRaw = process.env.FRONTEND_URL || process.env.FRONTEND_URI || '';
const frontendUrl = frontendUrlRaw.replace(/\/$/, '');
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5000',
  'https://district-vaccination-sys.netlify.app',
  frontendUrl,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server or direct tools (no origin)
    if (!origin) return callback(null, true);

    // Exact matches from allowedOrigins
    if (allowedOrigins.includes(origin)) return callback(null, true);

    // Allow Netlify preview/custom Netlify sites (endsWith .netlify.app)
    try {
      if (origin.endsWith('.netlify.app')) return callback(null, true);
    } catch (e) {
      // ignore
    }

    // Otherwise reject
    console.warn(`Blocked CORS request from origin: ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    return res.sendStatus(204);
  }
  next();
});

app.get('/health', (req, res) => {
  res.json({ success: true, message: 'Server is healthy', timestamp: new Date() });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/parent/auth', require('./routes/parentAuth'));
app.use('/api/children', require('./routes/children'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/vaccinations', require('./routes/vaccinations'));
app.use('/api/schedule', require('./routes/schedule'));
app.use('/api/backup', require('./routes/backup'));
app.use('/api/test-email', require('./routes/test-email'));
app.use('/api/reports', require('./routes/reports'));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Server error' });
});

async function seedAdminUser() {
  const email = process.env.DEFAULT_ADMIN_EMAIL || 'admin@childvacc.org';
  const password = process.env.DEFAULT_ADMIN_PASSWORD || 'Admin@12345';

  const existingUser = await User.findOne({ email });
  if (!existingUser) {
    await User.create({
      name: 'System Administrator',
      email,
      password,
      role: 'admin',
      department: 'Administration',
    });
    console.log(`Seeded admin user: ${email}`);
  }
}

async function seedSampleData() {
  const childCount = await Child.countDocuments();
  const existingBatches = await VaccineBatch.countDocuments();

  if (childCount === 0) {
    const child = await Child.create({
    patientId: 'PAT-100001',
    firstName: 'Amina',
    lastName: 'Otieno',
    dateOfBirth: '2022-03-16',
    gender: 'female',
    bloodGroup: 'A+',
    guardianName: 'Mary Otieno',
    guardianRelationship: 'mother',
    guardianEmail: 'parent@example.com',
    guardianPhone: '0712345678',
    notes: 'Sample child created for demo',
  });

    await Appointment.create({
      childId: child._id,
      childName: `${child.firstName} ${child.lastName}`,
      vaccineName: 'Pentavalent',
      appointmentDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      appointmentTime: '09:00',
      status: 'scheduled',
    });

    await VaccinationRecord.create({
      childId: child._id,
      childName: `${child.firstName} ${child.lastName}`,
      vaccineName: 'BCG',
      doseNumber: 1,
      administrationDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      batchNumber: 'BATCH-001',
      status: 'administered',
      notes: 'Demo record',
    });
  }

  // Seed any missing vaccine types from the KEPI schedule
  const allVaccineNames = ['BCG', 'OPV', 'Pentavalent', 'PCV', 'Rotavirus', 'IPV', 'Measles', 'Hepatitis B', 'Yellow Fever', 'Vitamin A'];
  const existingVaccineNames = await VaccineBatch.distinct('vaccineName');
  const missingVaccines = allVaccineNames.filter((name) => !existingVaccineNames.includes(name));

  for (const vaccineName of missingVaccines) {
    await VaccineBatch.create({
      vaccineName,
      batchNumber: `BATCH-${vaccineName.replace(/\s+/g, '').toUpperCase()}-AUTO`,
      quantity: 100,
      minStock: 30,
      dateReceived: new Date().toISOString().slice(0, 10),
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      supplier: 'KEMSA',
    });
    console.log(`Auto-seeded batch for: ${vaccineName}`);
  }

  if (missingVaccines.length > 0) {
    console.log(`Seeded ${missingVaccines.length} missing vaccine type(s): ${missingVaccines.join(', ')}`);
  }

  console.log('Seed check complete. Total batches in DB:', await VaccineBatch.countDocuments());
}

async function startServer() {
  try {
    await connectDB();
    await seedAdminUser();
    await seedSampleData();
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
