const express = require('express');
const Child = require('../models/Child');
const VaccineBatch = require('../models/VaccineBatch');
const Appointment = require('../models/Appointment');
const VaccinationRecord = require('../models/VaccinationRecord');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, async (req, res) => {
  try {
    const totalChildren = await Child.countDocuments();
    const totalVaccinations = await VaccinationRecord.countDocuments();
    const upcomingAppointments = await Appointment.countDocuments({ status: 'scheduled' });
    const lowStock = await VaccineBatch.find({ quantity: { $lte: 50 } }).countDocuments();
    const expiringSoon = await VaccineBatch.find({ expiryDate: { $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } }).countDocuments();

    res.json({
      success: true,
      data: {
        totalChildren,
        totalVaccinations,
        upcomingAppointments,
        lowStock,
        expiringSoon,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
