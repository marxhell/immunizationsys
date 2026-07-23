const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendMail } = require('../utils/email');
const { protect } = require('../middleware/auth');

const router = express.Router();

function normalizeRole(role, department = '') {
  const normalizedRole = String(role || '').trim().toLowerCase();
  const normalizedDepartment = String(department || '').trim().toLowerCase();

  if (normalizedRole === 'admin') return 'admin';
  if (normalizedRole === 'parent') return 'parent';
  if (normalizedRole === 'pharmacist') return 'pharmacist';
  if (['records_officer', 'records officer', 'records', 'records-officer'].includes(normalizedRole)) return 'records_officer';
  if (normalizedRole === 'nurse') return 'nurse';
  if (['staff', 'employee'].includes(normalizedRole)) {
    if (normalizedDepartment.includes('pharm') || normalizedDepartment.includes('drug') || normalizedDepartment.includes('medicine')) return 'pharmacist';
    if (normalizedDepartment.includes('record') || normalizedDepartment.includes('data')) return 'records_officer';
    return 'nurse';
  }

  return 'staff';
}

function signToken(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'dev-secret', {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
}

router.post('/login', async (req, res) => {
  try {
    const emailInput = req.body?.email;
    const passwordInput = req.body?.password;
    const email = typeof emailInput === 'string' ? emailInput.trim().toLowerCase() : '';
    const password = typeof passwordInput === 'string' ? passwordInput.trim() : '';

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const escapedEmail = email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const user = await User.findOne({ email: { $regex: new RegExp(`^${escapedEmail}$`, 'i') } });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = signToken(user._id);
    const safeUser = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: normalizeRole(user.role, user.department),
      phone: user.phone,
      department: user.department,
    };

    res.json({ success: true, data: { token, user: safeUser } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/register', protect, async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only administrators can create staff accounts' });
    }

    const { name, email, password, phone, role, department } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email and password are required' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const normalizedRole = normalizeRole(role, department);
    const normalizedDepartment = department ? String(department).trim() : '';

    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      password: String(password).trim(),
      phone: phone ? String(phone).trim() : '',
      role: normalizedRole,
      department: normalizedDepartment,
    });

    await sendMail({
      to: user.email,
      subject: 'Your Child Vaccination System account has been created',
      html: `<p>Hello ${user.name},</p><p>Your account has been created for the Child Vaccination System.</p><p><strong>Email:</strong> ${user.email}</p><p><strong>Password:</strong> ${password}</p><p>Please log in and change your password after your first sign-in.</p>`,
    });

    res.status(201).json({ success: true, data: { user: { id: user._id, name: user.name, email: user.email, role: normalizeRole(user.role, user.department), department: user.department } } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/users', protect, async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only administrators can view staff accounts' });
    }

    const users = await User.find().sort({ createdAt: -1 }).select('-password');
    res.json({ success: true, data: users });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/users/:id', protect, async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only administrators can update staff accounts' });
    }

    const { name, password, role, department } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (name) user.name = String(name).trim();
    if (password) user.password = String(password).trim();
    if (role) user.role = normalizeRole(role, department);
    if (department !== undefined) user.department = String(department).trim();

    if (!name && !password && !role && department === undefined) {
      return res.status(400).json({ success: false, message: 'No updates provided' });
    }

    await user.save();
    const safeUser = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      department: user.department,
    };

    res.json({ success: true, data: safeUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.delete('/users/:id', protect, async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only administrators can delete staff accounts' });
    }

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
