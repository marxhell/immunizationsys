const express = require('express');
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

    const upcoming = await Appointment.find({
      status: 'scheduled',
      appointmentDate: { $gte: now, $lte: windowEnd },
      reminderSent: false,
    }).populate('childId');

    let sent = 0;
    let failed = 0;

    for (const appointment of upcoming) {
      const child = appointment.childId;
      if (!child?.guardianEmail) {
        console.warn(`Skipping reminder for appointment ${appointment._id}: no guardian email`);
        continue;
      }

      try {
        await sendMail({
          to: child.guardianEmail,
          subject: 'Vaccination appointment reminder',
          html: `<p>Hello ${child.guardianName || child.firstName},</p><p>This is a reminder that ${child.firstName} ${child.lastName} has a vaccination appointment scheduled for ${new Date(appointment.appointmentDate).toLocaleString()}.</p><p>Please arrive a few minutes early.</p>`,
        });
        sent += 1;
        appointment.reminderSent = true;
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
