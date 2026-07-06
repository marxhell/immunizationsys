const jwt = require('jsonwebtoken');
const Child = require('../models/Child');

async function protectParent(req, res, next) {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
    req.parent = await Child.findById(decoded.id);
    if (!req.parent) {
      return res.status(401).json({ success: false, message: 'Parent not found' });
    }
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Token invalid' });
  }
}

module.exports = { protectParent };
