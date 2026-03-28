'use strict';

module.exports = {
  async up(queryInterface, Sequelize, transaction) {
    await queryInterface.createTable(
      'detail_fnb',
      {
        id_detail: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          allowNull: false,
          primaryKey: true,
        },
        qty: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 1,
        },
        harga_saat_pesan: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
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
        id_item: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'fnb',
            key: 'id_item',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
      },
      { transaction },
    );

    await queryInterface.addIndex('detail_fnb', ['id_transaksi'], { transaction });
    await queryInterface.addIndex('detail_fnb', ['id_item'], { transaction });
  },

  async down(queryInterface, Sequelize, transaction) {
    await queryInterface.dropTable('detail_fnb', { transaction });
  },
};
