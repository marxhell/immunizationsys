const mongoose = require('mongoose');

const vaccineBatchSchema = new mongoose.Schema({
  vaccineName: {
    type: String,
    required: true,
  },
  batchNumber: {
    type: String,
    required: true,
    unique: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
  },
  minStock: {
    type: Number,
    default: 50,
  },
  dateReceived: Date,
  expiryDate: Date,
  supplier: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('VaccineBatch', vaccineBatchSchema);
