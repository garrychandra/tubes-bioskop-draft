'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('users', 'reset_otp', {
      type: Sequelize.STRING(255),
      allowNull: true,
      defaultValue: null,
    });
  },

  async down(queryInterface, Sequelize) {
    // Note: Data truncation might occur if downgrading and hashes exceed 6 chars.
    await queryInterface.changeColumn('users', 'reset_otp', {
      type: Sequelize.STRING(6),
      allowNull: true,
      defaultValue: null,
    });
  },
};
