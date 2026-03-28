'use strict';

module.exports = {
  async up(queryInterface, Sequelize, transaction) {
    await queryInterface.createTable(
      "users",
      {
        id_user: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          allowNull: false,
          primaryKey: true,
        },
        nama: {
          type: Sequelize.STRING(80),
          allowNull: false,
        },
        email: {
          type: Sequelize.STRING(120),
          allowNull: false,
          unique: true,
        },
        password: {
          type: Sequelize.TEXT,
          allowNull: false,
        },
        role: {
          type: Sequelize.STRING(20),
          allowNull: false,
          defaultValue: "User",
        },
      },
      { transaction }
    );
  },
  async down(queryInterface, Sequelize, transaction) {
    await queryInterface.dropTable("users", { transaction });
  },
};

    