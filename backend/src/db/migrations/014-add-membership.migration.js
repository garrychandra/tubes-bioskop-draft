'use strict';

module.exports = {
  async up(queryInterface, Sequelize, transaction) {
    await queryInterface.addColumn(
      'users',
      'membership_expires_at',
      {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null,
      },
      { transaction }
    );
  },

  async down(queryInterface, Sequelize, transaction) {
    await queryInterface.removeColumn('users', 'membership_expires_at', { transaction });
  }
};
