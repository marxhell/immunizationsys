const express = require('express');
const jwt = require('jsonwebtoken');
const Child = require('../models/Child');

const router = express.Router();

function signToken(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'dev-secret', {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
}

router.post('/login', async (req, res) => {
  try {
    const identifierInput = req.body?.identifier;
    const phoneInput = req.body?.phoneNumber;
    const identifier = typeof identifierInput === 'string' ? identifierInput.trim().toLowerCase() : '';
    const phoneNumber = typeof phoneInput === 'string' ? phoneInput.trim() : '';

    if (!identifier || !phoneNumber) {
      return res.status(400).json({ success: false, message: 'Email and phone number are required' });
    }

    const child = await Child.findOne({
      $or: [{ guardianEmail: { $regex: new RegExp(`^${identifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }, { guardianPhone: phoneNumber }],
    });

    if (!child) {
      return res.status(401).json({ success: false, message: 'No matching guardian found' });
    }

    const guardian = {
      id: child._id,
      name: child.guardianName || `${child.firstName} ${child.lastName}`,
      email: child.guardianEmail,
      phone: child.guardianPhone,
      childId: child._id,
      childName: `${child.firstName} ${child.lastName}`,
    };

    const token = signToken(child._id);
    res.json({ success: true, data: { token, guardian } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
