'use strict';

module.exports = {
  async up(queryInterface, Sequelize, transaction) {
    await queryInterface.createTable(
      'jadwal',
      {
        id_jadwal: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          allowNull: false,
          primaryKey: true,
        },
        jam_tayang: {
          type: Sequelize.DATE,
          allowNull: false,
        },
        jam_selesai: {
          type: Sequelize.DATE,
          allowNull: false,
        },
        harga_tiket: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 50000,
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
        id_film: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'film',
            key: 'id_film',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
      },
      { transaction },
    );

    await queryInterface.addIndex('jadwal', ['id_film'], { transaction });
    await queryInterface.addIndex('jadwal', ['id_studio'], { transaction });
    await queryInterface.addIndex('jadwal', ['jam_tayang'], { transaction });
  },

  async down(queryInterface, Sequelize, transaction) {
    await queryInterface.dropTable('jadwal', { transaction });
  },
};
