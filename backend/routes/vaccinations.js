const express = require('express');
const VaccinationRecord = require('../models/VaccinationRecord');
const Appointment = require('../models/Appointment');
const Child = require('../models/Child');
const VaccineBatch = require('../models/VaccineBatch');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, async (req, res) => {
  try {
    const records = await VaccinationRecord.find().sort({ administrationDate: -1 });
    res.json({ success: true, data: records });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/', protect, async (req, res) => {
  try {
    const { childId, vaccineName, doseNumber, adminDate, batchNumber, notes } = req.body;
    if (!childId || !vaccineName || !doseNumber || !adminDate || !batchNumber) {
      return res.status(400).json({ success: false, message: 'Missing required vaccination fields' });
    }

    const child = await Child.findById(childId);
    if (!child) return res.status(404).json({ success: false, message: 'Child not found' });

    const batch = await VaccineBatch.findOne({ batchNumber });
    if (!batch) return res.status(404).json({ success: false, message: 'Vaccine batch not found' });

    if (batch.quantity < 1) return res.status(400).json({ success: false, message: 'Vaccine batch is out of stock' });

    batch.quantity = Math.max(0, batch.quantity - 1);
    await batch.save();

    const record = await VaccinationRecord.create({
      childId,
      childName: `${child.firstName} ${child.lastName}`,
      vaccineName,
      doseNumber,
      administrationDate: adminDate,
      batchNumber,
      notes,
      status: 'administered',
    });

    // Update matching appointment to "completed"
    try {
      await Appointment.findOneAndUpdate(
        { childId: childId, vaccineName: vaccineName, status: 'scheduled' },
        { status: 'completed' },
        { sort: { appointmentDate: -1 } }
      );
    } catch (apptErr) {
      console.warn('Could not update appointment status:', apptErr.message);
    }

    res.status(201).json({ success: true, data: record });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
