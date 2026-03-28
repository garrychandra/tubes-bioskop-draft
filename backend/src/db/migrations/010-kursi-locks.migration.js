'use strict';

module.exports = {
  async up(queryInterface, Sequelize, transaction) {
    await queryInterface.createTable(
      'kursi_locks',
      {
        id_lock: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          allowNull: false,
          primaryKey: true,
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
        locked_at: {
          type: Sequelize.DATE,
          allowNull: true,
          defaultValue: Sequelize.NOW,
        },
        expires_at: {
          type: Sequelize.DATE,
          allowNull: false,
        },
      },
      { transaction },
    );

    await queryInterface.addIndex('kursi_locks', ['id_kursi', 'id_jadwal'], {
      unique: true,
      transaction,
    });
    await queryInterface.addIndex('kursi_locks', ['id_jadwal'], { transaction });
    await queryInterface.addIndex('kursi_locks', ['expires_at'], { transaction });
  },

  async down(queryInterface, Sequelize, transaction) {
    await queryInterface.dropTable('kursi_locks', { transaction });
  },
};
