'use strict';

module.exports = {
  async up(queryInterface, Sequelize, transaction) {
    await queryInterface.createTable(
      "fnb",
      {
        id_item: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          allowNull: false,
          primaryKey: true,
        },
        nama_item: {
          type: Sequelize.STRING(200),
          allowNull: false,
        },
        harga: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0,
        },
      },
      { transaction },
    )
  },
  async down(queryInterface, Sequelize, transaction) {
    await queryInterface.dropTable("fnb", { transaction })
  },
}
