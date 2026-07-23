const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/child-immunization-system';
  const dbName = process.env.MONGO_DB_NAME || 'child-immunization-system';

  mongoose.set('strictQuery', false);

  await mongoose.connect(uri, {
    dbName,
    serverSelectionTimeoutMS: 10000,
  });

  console.log(`MongoDB connected to ${dbName}`);
}

module.exports = connectDB;
