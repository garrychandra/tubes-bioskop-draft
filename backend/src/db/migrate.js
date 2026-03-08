require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { sequelize } = require('../models');

async function migrate() {
  try {
    console.log('Running migrations...');

    // Drop legacy tables from old schema that Sequelize doesn't manage
    await sequelize.query(`
      DROP TABLE IF EXISTS order_items CASCADE;
      DROP TABLE IF EXISTS orders CASCADE;
      DROP TABLE IF EXISTS seat_locks CASCADE;
      DROP TABLE IF EXISTS seats CASCADE;
      DROP TABLE IF EXISTS schedules CASCADE;
      DROP TABLE IF EXISTS halls CASCADE;
      DROP TABLE IF EXISTS movies CASCADE;
      DROP TABLE IF EXISTS cinemas CASCADE;
    `);

    // Sync all Sequelize models — drops and recreates managed tables
    await sequelize.sync({ force: true });

    console.log('Migrations completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

migrate();

