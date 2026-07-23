const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const User = require('./models/User');

dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/child-immunization-system', {
    dbName: process.env.MONGO_DB_NAME || 'child-immunization-system',
  });

  const email = 'admin@childvacc.org';
  const password = 'Admin@12345';
  let user = await User.findOne({ email });
  console.log('found before', !!user);
  if (!user) {
    user = await User.create({ name: 'System Administrator', email, password, role: 'admin', department: 'Administration' });
    console.log('created', user.email);
  }

  const fresh = await User.findOne({ email });
  console.log('stored password', fresh.password);
  const bcrypt = require('bcryptjs');
  console.log('compare result', await bcrypt.compare(password, fresh.password));
  await mongoose.disconnect();
})();
