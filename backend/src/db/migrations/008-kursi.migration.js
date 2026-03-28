'use strict';

module.exports = {
  async up(queryInterface, Sequelize, transaction) {
    await queryInterface.createTable(
      'kursi',
      {
        id_kursi: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          allowNull: false,
          primaryKey: true,
        },
        nomor_kursi: {
          type: Sequelize.STRING(10),
          allowNull: false,
        },
        id_studio: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'studio',
            key: 'id_studio',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
      },
      { transaction },
    );

    await queryInterface.addIndex('kursi', ['id_studio', 'nomor_kursi'], {
      unique: true,
      transaction,
    });
    await queryInterface.addIndex('kursi', ['id_studio'], { transaction });
  },

  async down(queryInterface, Sequelize, transaction) {
    await queryInterface.dropTable('kursi', { transaction });
  },
};
