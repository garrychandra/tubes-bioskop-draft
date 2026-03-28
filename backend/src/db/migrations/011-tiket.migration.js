'use strict';

module.exports = {
  async up(queryInterface, Sequelize, transaction) {
    await queryInterface.createTable(
      'tiket',
      {
        id_tiket: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          allowNull: false,
          primaryKey: true,
        },
        barcode: {
          type: Sequelize.TEXT,
          allowNull: false,
          unique: true,
        },
        status_tiket: {
          type: Sequelize.STRING(30),
          allowNull: false,
          defaultValue: 'active',
        },
        id_transaksi: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'transaksi',
            key: 'id_transaksi',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        id_jadwal: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'jadwal',
            key: 'id_jadwal',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        id_kursi: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'kursi',
            key: 'id_kursi',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
      },
      { transaction },
    );

    await queryInterface.addIndex('tiket', ['id_kursi', 'id_jadwal'], {
      unique: true,
      transaction,
    });
    await queryInterface.addIndex('tiket', ['id_transaksi'], { transaction });
    await queryInterface.addIndex('tiket', ['id_jadwal'], { transaction });
    await queryInterface.addIndex('tiket', ['id_kursi'], { transaction });
  },

  async down(queryInterface, Sequelize, transaction) {
    await queryInterface.dropTable('tiket', { transaction });
  },
};
