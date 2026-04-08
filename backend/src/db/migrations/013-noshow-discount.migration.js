'use strict';

module.exports = {
  async up(queryInterface, Sequelize, transaction) {
    // Add pending_discount to users
    await queryInterface.addColumn(
      'users',
      'pending_discount',
      {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      { transaction }
    );

    // Add discount_applied to transaksi
    await queryInterface.addColumn(
      'transaksi',
      'discount_applied',
      {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      { transaction }
    );
  },

  async down(queryInterface, Sequelize, transaction) {
    await queryInterface.removeColumn('users', 'pending_discount', { transaction });
    await queryInterface.removeColumn('transaksi', 'discount_applied', { transaction });
  },
};
