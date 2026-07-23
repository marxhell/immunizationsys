/**
 * Database Backup Utility
 * Creates MongoDB database dumps for data protection and recovery.
 * Can be triggered via API or run as a scheduled task.
 */

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const BACKUP_DIR = path.resolve(__dirname, '../../backups');

/**
 * Ensure backup directory exists
 */
function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

/**
 * Create a database backup using mongodump
 * @returns {Promise<{success: boolean, filePath: string, timestamp: Date, size: string}>}
 */
async function createBackup() {
  return new Promise((resolve, reject) => {
    ensureBackupDir();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `immunization-backup-${timestamp}`;
    const backupPath = path.join(BACKUP_DIR, backupFileName);

    // Get MongoDB URI from environment
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/child-immunization-system';

    // Use mongodump to create the backup
    const cmd = `mongodump --uri="${mongoUri}" --out="${backupPath}"`;

    exec(cmd, { timeout: 120000 }, (error, stdout, stderr) => {
      if (error) {
        console.error('Backup failed:', error.message);
        // Fallback: create a JSON export using mongoexport for each collection
        createJsonBackup(backupPath)
          .then(resolve)
          .catch(reject);
        return;
      }

      // Calculate backup size
      let totalSize = 0;
      try {
        const walkDir = (dir) => {
          const files = fs.readdirSync(dir);
          files.forEach((file) => {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);
            if (stat.isFile()) totalSize += stat.size;
            if (stat.isDirectory()) walkDir(filePath);
          });
        };
        walkDir(backupPath);
      } catch (e) {
        // ignore size calculation errors
      }

      const sizeMB = (totalSize / (1024 * 1024)).toFixed(2);
      console.log(`Backup created successfully: ${backupPath} (${sizeMB} MB)`);

      resolve({
        success: true,
        filePath: backupPath,
        timestamp: new Date(),
        size: `${sizeMB} MB`,
        method: 'mongodump',
      });
    });
  });
}

/**
 * Fallback: Create JSON backup using mongoose models directly
 * This is used when mongodump is not available
 */
async function createJsonBackup(backupPath) {
  ensureBackupDir();

  const mongoose = require('mongoose');
  const collections = mongoose.connection.collections;
  const backupData = {};

  for (const [name, collection] of Object.entries(collections)) {
    const documents = await collection.find({}).toArray();
    backupData[name] = documents;
  }

  const backupFile = path.join(BACKUP_DIR, `${path.basename(backupPath)}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));

  const stats = fs.statSync(backupFile);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

  console.log(`JSON backup created: ${backupFile} (${sizeMB} MB)`);

  return {
    success: true,
    filePath: backupFile,
    timestamp: new Date(),
    size: `${sizeMB} MB`,
    method: 'json-export',
  };
}

/**
 * List all available backups
 * @returns {Array<{name: string, date: Date, size: string}>}
 */
function listBackups() {
  ensureBackupDir();

  const items = fs.readdirSync(BACKUP_DIR);
  return items
    .map((item) => {
      const itemPath = path.join(BACKUP_DIR, item);
      const stat = fs.statSync(itemPath);
      const size = stat.isDirectory()
        ? getDirSize(itemPath)
        : stat.size;
      return {
        name: item,
        date: stat.mtime,
        size: `${(size / (1024 * 1024)).toFixed(2)} MB`,
        isDirectory: stat.isDirectory(),
      };
    })
    .sort((a, b) => b.date - a.date);
}

function getDirSize(dirPath) {
  let totalSize = 0;
  try {
    const files = fs.readdirSync(dirPath);
    files.forEach((file) => {
      const filePath = path.join(dirPath, file);
      const stat = fs.statSync(filePath);
      if (stat.isFile()) totalSize += stat.size;
      if (stat.isDirectory()) totalSize += getDirSize(filePath);
    });
  } catch (e) {
    // ignore
  }
  return totalSize;
}

module.exports = { createBackup, listBackups };