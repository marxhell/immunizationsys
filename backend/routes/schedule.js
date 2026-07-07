const express = require('express');
const Child = require('../models/Child');
const VaccinationRecord = require('../models/VaccinationRecord');
const { protect } = require('../middleware/auth');
const { getRecommendedVaccines, KENYA_VACCINE_SCHEDULE } = require('../utils/vaccineSchedule');

const router = express.Router();

/**
 * GET /api/schedule/:childId
 * Returns the full vaccination schedule for a specific child based on their DOB
 */
router.get('/:childId', protect, async (req, res) => {
  try {
    const child = await Child.findById(req.params.childId);
    if (!child) {
      return res.status(404).json({ success: false, message: 'Child not found' });
    }

    const records = await VaccinationRecord.find({ childId: child._id });
    const schedule = getRecommendedVaccines(child.dateOfBirth, records);

    res.json({
      success: true,
      data: {
        child: {
          id: child._id,
          name: `${child.firstName} ${child.lastName}`,
          dateOfBirth: child.dateOfBirth,
          ageWeeks: schedule.ageWeeks,
          ageMonths: schedule.ageMonths,
        },
        schedule: {
          due: schedule.due,
          upcoming: schedule.upcoming,
          completed: schedule.completed,
        },
        summary: {
          totalDue: schedule.due.length,
          totalUpcoming: schedule.upcoming.length,
          totalCompleted: schedule.completed.length,
        },
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * GET /api/schedule
 * Returns the full KEPI reference schedule (no child-specific data)
 */
router.get('/', protect, async (req, res) => {
  try {
    res.json({
      success: true,
      data: KENYA_VACCINE_SCHEDULE,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;