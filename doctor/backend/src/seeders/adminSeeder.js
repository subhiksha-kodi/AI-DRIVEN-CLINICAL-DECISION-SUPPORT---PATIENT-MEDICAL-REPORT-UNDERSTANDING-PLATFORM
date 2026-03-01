/**
 * adminSeeder.js - Seeds the default admin account on startup if none exists
 */
const bcrypt = require('bcrypt');
const Admin = require('../models/Admin');

const seedAdmin = async () => {
  try {
    const existingAdmin = await Admin.findOne({ where: { username: process.env.ADMIN_USERNAME || 'admin' } });
    if (!existingAdmin) {
      const password_hash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin@12345', 12);
      await Admin.create({
        username: process.env.ADMIN_USERNAME || 'admin',
        password_hash,
      });
      console.log('✅ Default admin seeded: admin / Admin@12345');
    }


  } catch (err) {
    console.error('❌ Seeder error:', err.message);
  }
};

module.exports = { seedAdmin };
