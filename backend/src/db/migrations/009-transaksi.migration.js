'use strict';

module.exports = {
  async up(queryInterface, Sequelize, transaction) {
    await queryInterface.createTable(
      'transaksi',
      {
        id_transaksi: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          allowNull: false,
          primaryKey: true,
        },
        total_bayar: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0,
        },
        tanggal_bayar: {
          type: Sequelize.DATE,
          allowNull: true,
          defaultValue: Sequelize.NOW,
        },
        status: {
          type: Sequelize.STRING(20),
          allowNull: false,
          defaultValue: 'paid',
        },
        id_user: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id_user',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
      },
      { transaction },
    );

    await queryInterface.addIndex('transaksi', ['id_user'], { transaction });
  },

  async down(queryInterface, Sequelize, transaction) {
    await queryInterface.dropTable('transaksi', { transaction });
  },
};
