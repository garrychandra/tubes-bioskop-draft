require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') });

const common = {
  username: process.env.DB_USER || 'cinema_user',
  password: process.env.DB_PASSWORD || 'cinema_pass',
  database: process.env.DB_NAME || 'cinema_db',
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 5432,
  dialect: 'postgres',
  migrationStorageTableName: 'sequelize_meta',
  seederStorage: 'sequelize',
  seederStorageTableName: 'sequelize_data',
  logging: false,
};

module.exports = {
  development: common,
  test: {
    ...common,
    database: process.env.DB_NAME_TEST || common.database,
  },
  production: common,
};
