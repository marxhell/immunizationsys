const express = require('express');
const Child = require('../models/Child');
const Appointment = require('../models/Appointment');
const VaccinationRecord = require('../models/VaccinationRecord');
const { protect } = require('../middleware/auth');
const { protectParent } = require('../middleware/parentAuth');

const router = express.Router();

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

router.get('/', protect, async (req, res) => {
  try {
    const children = await Child.find().sort({ createdAt: -1 });
    res.json({ success: true, data: children });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/', protect, async (req, res) => {
  try {
    const { firstName, lastName, dateOfBirth, gender, bloodGroup, guardianName, guardianRelationship, guardianEmail, guardianPhone, notes } = req.body;

    if (!firstName || !lastName || !dateOfBirth || !gender) {
      return res.status(400).json({ success: false, message: 'Required fields are missing' });
    }

    const normalizedFirst = String(firstName).trim();
    const normalizedLast = String(lastName).trim();
    const normalizedDob = new Date(dateOfBirth);

    if (Number.isNaN(normalizedDob.getTime())) {
      return res.status(400).json({ success: false, message: 'Date of birth is invalid' });
    }

    const existingChild = await Child.findOne({
      firstName: { $regex: new RegExp(`^${escapeRegex(normalizedFirst)}$`, 'i') },
      lastName: { $regex: new RegExp(`^${escapeRegex(normalizedLast)}$`, 'i') },
      dateOfBirth: normalizedDob,
    });

    if (existingChild) {
      return res.status(409).json({ success: false, message: 'Child already registered' });
    }

    const patientId = `PAT-${Date.now().toString().slice(-6)}`;
    const child = await Child.create({
      patientId,
      firstName: normalizedFirst,
      lastName: normalizedLast,
      dateOfBirth: normalizedDob,
      gender,
      bloodGroup,
      guardianName,
      guardianRelationship,
      guardianEmail,
      guardianPhone,
      notes,
    });

    res.status(201).json({ success: true, data: child });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/:id', protect, async (req, res) => {
  try {
    const { firstName, lastName, dateOfBirth, gender, bloodGroup, guardianName, guardianRelationship, guardianEmail, guardianPhone, notes } = req.body;

    const child = await Child.findById(req.params.id);
    if (!child) {
      return res.status(404).json({ success: false, message: 'Child not found' });
    }

    if (firstName) child.firstName = String(firstName).trim();
    if (lastName) child.lastName = String(lastName).trim();
    if (dateOfBirth) {
      const normalizedDob = new Date(dateOfBirth);
      if (Number.isNaN(normalizedDob.getTime())) {
        return res.status(400).json({ success: false, message: 'Date of birth is invalid' });
      }
      child.dateOfBirth = normalizedDob;
    }
    if (gender) child.gender = gender;
    if (bloodGroup !== undefined) child.bloodGroup = bloodGroup;
    if (guardianName !== undefined) child.guardianName = String(guardianName).trim();
    if (guardianRelationship !== undefined) child.guardianRelationship = String(guardianRelationship).trim();
    if (guardianEmail !== undefined) child.guardianEmail = String(guardianEmail).trim();
    if (guardianPhone !== undefined) child.guardianPhone = String(guardianPhone).trim();
    if (notes !== undefined) child.notes = String(notes).trim();

    if (!firstName && !lastName && !dateOfBirth && !gender && bloodGroup === undefined && guardianName === undefined && guardianRelationship === undefined && guardianEmail === undefined && guardianPhone === undefined && notes === undefined) {
      return res.status(400).json({ success: false, message: 'No updates provided' });
    }

    await child.save();
    res.json({ success: true, data: child });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only admins can delete child records' });
    }

    const child = await Child.findById(req.params.id);
    if (!child) {
      return res.status(404).json({ success: false, message: 'Child not found' });
    }

    await Promise.all([
      Child.findByIdAndDelete(req.params.id),
      Appointment.deleteMany({ childId: req.params.id }),
      VaccinationRecord.deleteMany({ childId: req.params.id }),
    ]);

    res.json({ success: true, message: 'Child deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/parent/me', protectParent, async (req, res) => {
  try {
    const child = await Child.findById(req.parent._id);
    if (!child) return res.status(404).json({ success: false, message: 'Child not found' });

    const appointments = await Appointment.find({ childId: child._id }).sort({ appointmentDate: 1 });
    const records = await VaccinationRecord.find({ childId: child._id }).sort({ administrationDate: -1 });

    res.json({ success: true, data: { child, appointments, records } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/:id', protect, async (req, res) => {
  try {
    const child = await Child.findById(req.params.id);
    if (!child) return res.status(404).json({ success: false, message: 'Child not found' });

    const appointments = await Appointment.find({ childId: child._id }).sort({ appointmentDate: 1 });
    const records = await VaccinationRecord.find({ childId: child._id }).sort({ administrationDate: -1 });

    res.json({ success: true, data: { child, appointments, records } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
