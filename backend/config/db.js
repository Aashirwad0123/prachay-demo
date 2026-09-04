require('dotenv').config();
const { Sequelize } = require('sequelize');

// Tests run against an in-memory sqlite DB so the security test suite doesn't require a
// live Postgres instance. Production/development always use Postgres, unchanged.
const sequelize = process.env.NODE_ENV === 'test'
  ? new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false })
  : new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      dialect: 'postgres',
      logging: false,
    }
  );

module.exports = sequelize;
