const express = require('express');
const Child = require('../models/Child');
const VaccineBatch = require('../models/VaccineBatch');
const Appointment = require('../models/Appointment');
const VaccinationRecord = require('../models/VaccinationRecord');
const { protect } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/reports
 * Returns summary dashboard statistics
 */
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

/**
 * GET /api/reports/monthly
 * Returns monthly immunization report with breakdown by vaccine type
 */
router.get('/monthly', protect, async (req, res) => {
  try {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const monthlyData = [];
    for (let d = new Date(sixMonthsAgo); d <= now; d.setMonth(d.getMonth() + 1)) {
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const startOfMonth = new Date(year, month - 1, 1);
      const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

      const records = await VaccinationRecord.find({
        administrationDate: { $gte: startOfMonth, $lte: endOfMonth },
        status: 'administered',
      });

      // Group by vaccine name
      const vaccineBreakdown = {};
      records.forEach((r) => {
        vaccineBreakdown[r.vaccineName] = (vaccineBreakdown[r.vaccineName] || 0) + 1;
      });

      monthlyData.push({
        year,
        month,
        label: `${year}-${String(month).padStart(2, '0')}`,
        totalVaccinations: records.length,
        vaccineBreakdown,
      });
    }

    res.json({ success: true, data: monthlyData });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * GET /api/reports/overdue
 * Returns list of overdue vaccinations
 * A vaccination is overdue if the child is past the recommended age and hasn't received it
 */
router.get('/overdue', protect, async (req, res) => {
  try {
    const { getRecommendedVaccines } = require('../utils/vaccineSchedule');
    const children = await Child.find().sort({ dateOfBirth: -1 });
    const overdueList = [];

    for (const child of children) {
      const records = await VaccinationRecord.find({ childId: child._id });
      const schedule = getRecommendedVaccines(child.dateOfBirth, records);

      schedule.due.forEach((item) => {
        overdueList.push({
          childId: child._id,
          childName: `${child.firstName} ${child.lastName}`,
          patientId: child.patientId,
          dateOfBirth: child.dateOfBirth,
          guardianName: child.guardianName,
          guardianPhone: child.guardianPhone,
          vaccineName: item.vaccineName,
          doseNumber: item.doseNumber,
          dueAgeWeeks: item.dueAgeWeeks,
          description: item.description,
        });
      });
    }

    res.json({
      success: true,
      data: overdueList,
      summary: { totalOverdue: overdueList.length },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * GET /api/reports/inventory-usage
 * Returns inventory usage report showing consumption over time
 */
router.get('/inventory-usage', protect, async (req, res) => {
  try {
    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);

    // Get all vaccination records in the period
    const records = await VaccinationRecord.find({
      administrationDate: { $gte: threeMonthsAgo },
      status: 'administered',
    }).sort({ administrationDate: -1 });

    // Group by vaccine name
    const usageByVaccine = {};
    records.forEach((r) => {
      if (!usageByVaccine[r.vaccineName]) {
        usageByVaccine[r.vaccineName] = { totalUsed: 0, doses: [] };
      }
      usageByVaccine[r.vaccineName].totalUsed += 1;
      usageByVaccine[r.vaccineName].doses.push({
        date: r.administrationDate,
        batchNumber: r.batchNumber,
        childName: r.childName,
      });
    });

    // Get current stock levels
    const batches = await VaccineBatch.find().sort({ vaccineName: 1 });
    const currentStock = {};
    batches.forEach((b) => {
      currentStock[b.vaccineName] = (currentStock[b.vaccineName] || 0) + b.quantity;
    });

    // Combine into report
    const usageReport = Object.keys(usageByVaccine).map((vaccineName) => ({
      vaccineName,
      totalUsed: usageByVaccine[vaccineName].totalUsed,
      currentStock: currentStock[vaccineName] || 0,
      usagePeriod: {
        from: threeMonthsAgo,
        to: now,
      },
    }));

    res.json({
      success: true,
      data: {
        usageReport,
        totalVaccinesUsed: records.length,
        periodStart: threeMonthsAgo,
        periodEnd: now,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
