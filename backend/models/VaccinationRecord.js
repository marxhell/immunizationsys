const mongoose = require('mongoose');

const vaccinationRecordSchema = new mongoose.Schema({
  childId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Child',
    required: true,
  },
  childName: String,
  vaccineName: {
    type: String,
    required: true,
  },
  doseNumber: {
    type: Number,
    required: true,
  },
  administrationDate: {
    type: Date,
    required: true,
  },
  batchNumber: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['administered', 'pending'],
    default: 'administered',
  },
  notes: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('VaccinationRecord', vaccinationRecordSchema);
