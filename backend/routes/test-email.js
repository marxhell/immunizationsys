const express = require('express');
const { protect } = require('../middleware/auth');
const { sendMail } = require('../utils/email');

const router = express.Router();

/**
 * POST /api/test-email
 * Direct email test - sends to shelmartin99@gmail.com
 */
router.post('/', protect, async (req, res) => {
  try {
    const to = 'shelmartin99@gmail.com';
    console.log(`[TEST-EMAIL] Attempting to send to ${to}...`);
    console.log(`[TEST-EMAIL] EMAIL_USER=${process.env.EMAIL_USER ? 'SET' : 'NOT SET'}`);
    console.log(`[TEST-EMAIL] EMAIL_PASS=${process.env.EMAIL_PASS ? 'SET (' + process.env.EMAIL_PASS.length + ' chars)' : 'NOT SET'}`);

    const result = await sendMail({
      to,
      subject: 'Test from Child Vaccination System',
      html: `<h2>Test Email</h2><p>This is a direct test from the immunization system.</p><p>Time: ${new Date().toLocaleString()}</p>`,
    });

    console.log(`[TEST-EMAIL] Result:`, JSON.stringify(result));
    res.json({ success: result.success, data: result });
  } catch (error) {
    console.error(`[TEST-EMAIL] Error:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;