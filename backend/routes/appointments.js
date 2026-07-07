const express = require('express');
const mongoose = require('mongoose');
const Appointment = require('../models/Appointment');
const Child = require('../models/Child');
const { protect } = require('../middleware/auth');
const { sendMail } = require('../utils/email');

const router = express.Router();

function normalizeAppointmentDate(dateValue, timeValue) {
  if (!dateValue) return null;

  if (dateValue instanceof Date) return dateValue;

  if (typeof dateValue === 'string' && dateValue.includes('T')) {
    return new Date(dateValue);
  }

  const rawTime = typeof timeValue === 'string' && timeValue.trim() ? timeValue.trim() : '00:00';
  const combined = `${dateValue}T${rawTime}`;
  const parsed = new Date(combined);
  return Number.isNaN(parsed.getTime()) ? new Date(dateValue) : parsed;
}

async function resolveGuardianContact(child) {
  if (!child) return null;

  if (child.guardianEmail) {
    return {
      email: child.guardianEmail,
      name: child.guardianName || `${child.firstName || ''} ${child.lastName || ''}`.trim(),
    };
  }

  const guardianIds = Array.isArray(child.guardians) ? child.guardians : [];
  if (!guardianIds.length) {
    return null;
  }

  const db = mongoose.connection.db;
  if (!db) return null;

  for (const guardianId of guardianIds) {
    let normalizedGuardianId = guardianId;
    if (typeof guardianId === 'string' && mongoose.Types.ObjectId.isValid(guardianId)) {
      normalizedGuardianId = new mongoose.Types.ObjectId(guardianId);
    }

    const guardianDoc = await db.collection('guardians').findOne({ _id: normalizedGuardianId });
    if (guardianDoc?.email) {
      return {
        email: guardianDoc.email,
        name: guardianDoc.name || guardianDoc.fullName || child.guardianName || `${child.firstName || ''} ${child.lastName || ''}`.trim(),
      };
    }
  }

  return null;
}

router.get('/', protect, async (req, res) => {
  try {
    const appointments = await Appointment.find().sort({ appointmentDate: 1 });
    res.json({ success: true, data: appointments });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/', protect, async (req, res) => {
  try {
    const { childId, vaccineName, appointmentDate, appointmentTime } = req.body;
    if (!childId || !vaccineName || !appointmentDate) {
      return res.status(400).json({ success: false, message: 'Missing required appointment fields' });
    }

    const child = await Child.findById(childId);
    if (!child) return res.status(404).json({ success: false, message: 'Child not found' });

    const normalizedAppointmentDate = normalizeAppointmentDate(appointmentDate, appointmentTime);

    const appointment = await Appointment.create({
      childId,
      childName: `${child.firstName} ${child.lastName}`,
      vaccineName,
      appointmentDate: normalizedAppointmentDate,
      appointmentTime,
      status: 'scheduled',
    });

    res.status(201).json({ success: true, data: appointment });

    if (child.guardianEmail) {
      sendMail({
        to: child.guardianEmail,
        subject: 'New vaccination appointment scheduled',
        html: `<p>Hello ${child.guardianName || child.firstName},</p><p>A new vaccination appointment has been scheduled for ${child.firstName} ${child.lastName} on ${new Date(appointmentDate).toDateString()} at ${appointmentTime || 'TBD'}.</p>`,
      }).catch((err) => {
        console.error('Failed to send appointment email:', err);
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/reminders', protect, async (req, res) => {
  try {
    const now = new Date();
    const windowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const candidates = await Appointment.find({
      status: 'scheduled',
      $or: [
        { reminderSent: false },
        { reminderSent: { $exists: false } },
        { reminderSent: null },
      ],
    });

    const upcoming = [];

    for (const appointment of candidates) {
      const appointmentDate = normalizeAppointmentDate(appointment.appointmentDate, appointment.appointmentTime);
      if (!appointmentDate || Number.isNaN(appointmentDate.getTime())) {
        continue;
      }

      if (appointmentDate < now || appointmentDate > windowEnd) {
        continue;
      }

      if (typeof appointment.appointmentDate === 'string' && !String(appointment.appointmentDate).includes('T')) {
        appointment.appointmentDate = appointmentDate;
        await appointment.save().catch((err) => {
          console.warn('Failed to migrate appointment date during reminder run:', err);
        });
      }

      const childId = appointment.childId || appointment.child;
      let child = null;
      if (childId) {
        const normalizedChildId = mongoose.Types.ObjectId.isValid(childId) ? new mongoose.Types.ObjectId(childId) : childId;
        child = await Child.findById(normalizedChildId);
      }

      const guardianContact = await resolveGuardianContact(child);
      if (!guardianContact?.email) {
        console.warn(`Skipping reminder for appointment ${appointment._id}: no guardian email`);
        continue;
      }

      upcoming.push({ appointment, child, guardianContact });
    }

    let sent = 0;
    let failed = 0;

    for (const { appointment, child, guardianContact } of upcoming) {
      try {
        await sendMail({
          to: guardianContact.email,
          subject: 'Vaccination appointment reminder',
          html: `<p>Hello ${guardianContact.name || child?.firstName || 'Parent'},</p><p>This is a reminder that ${child?.firstName || 'your child'} ${child?.lastName || ''} has a vaccination appointment scheduled for ${new Date(appointment.appointmentDate).toLocaleString()}.</p><p>Please arrive a few minutes early.</p>`,
        });
        sent += 1;
        appointment.reminderSent = true;
        if (!appointment.childId && child._id) {
          appointment.childId = child._id;
        }
        await appointment.save();
      } catch (err) {
        console.error('Failed to send reminder email:', err);
        failed += 1;
      }
    }

    res.json({ success: true, data: { sent, failed, total: upcoming.length } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
