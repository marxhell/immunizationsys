const express = require('express');
const VaccineBatch = require('../models/VaccineBatch');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, async (req, res) => {
  try {
    const batches = await VaccineBatch.find().sort({ expiryDate: 1 });
    res.json({ success: true, data: batches });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/:id', protect, async (req, res) => {
  try {
    const batch = await VaccineBatch.findById(req.params.id);
    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }

    const { vaccineName, batchNumber, quantity, minStock, dateReceived, expiryDate, supplier } = req.body;

    if (vaccineName !== undefined) batch.vaccineName = vaccineName;
    if (batchNumber !== undefined) batch.batchNumber = batchNumber;
    if (quantity !== undefined) batch.quantity = quantity;
    if (minStock !== undefined) batch.minStock = minStock;
    if (dateReceived !== undefined) batch.dateReceived = dateReceived;
    if (expiryDate !== undefined) batch.expiryDate = expiryDate;
    if (supplier !== undefined) batch.supplier = supplier;

    await batch.save();
    res.json({ success: true, data: batch });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/', protect, async (req, res) => {
  try {
    const { vaccineName, batchNumber, quantity, minStock, dateReceived, expiryDate, supplier } = req.body;
    if (!vaccineName || !batchNumber || !quantity || !expiryDate || !supplier) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const batch = await VaccineBatch.create({ vaccineName, batchNumber, quantity, minStock, dateReceived, expiryDate, supplier });
    res.status(201).json({ success: true, data: batch });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
