'use strict';

// Adds reset_otp and reset_otp_expires columns to the users table so that
// forgot-password OTP codes are stored in the database instead of an
// in-memory Map.  This makes the OTP flow work correctly when the backend
// is scaled to multiple replicas (e.g. 2 pods on DOKS) because all pods
// share the same PostgreSQL instance.

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'reset_otp', {
      type: Sequelize.STRING(6),
      allowNull: true,
      defaultValue: null,
    });
    await queryInterface.addColumn('users', 'reset_otp_expires', {
      type: Sequelize.DATE,
      allowNull: true,
      defaultValue: null,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('users', 'reset_otp');
    await queryInterface.removeColumn('users', 'reset_otp_expires');
  },
};
