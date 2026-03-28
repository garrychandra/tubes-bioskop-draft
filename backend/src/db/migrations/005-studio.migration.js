'use strict';

module.exports = {
  async up(queryInterface, Sequelize, transaction) {
    await queryInterface.createTable(
      'studio',
      {
        id_studio: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          allowNull: false,
          primaryKey: true,
        },
        nama_studio: {
          type: Sequelize.STRING(100),
          allowNull: false,
        },
        kapasitas: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 80,
        },
        id_bioskop: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'bioskop',
            key: 'id_bioskop',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
      },
      { transaction },
    );

    await queryInterface.addIndex('studio', ['id_bioskop'], { transaction });
  },

  async down(queryInterface, Sequelize, transaction) {
    await queryInterface.dropTable('studio', { transaction });
  },
};
