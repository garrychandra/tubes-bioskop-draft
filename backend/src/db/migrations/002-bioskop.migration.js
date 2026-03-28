'use strict';

module.exports = {
  async up(queryInterface, Sequelize, transaction) {
    await queryInterface.createTable(
      "bioskop",
      {
        id_bioskop: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          allowNull: false,
          primaryKey: true,
        },
        nama_bioskop: {
          type: Sequelize.STRING(200),
          allowNull: false,
        },
        lokasi: {
          type: Sequelize.TEXT,
          allowNull: false,
        },
        image_url: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
      },
      { transaction },
    )
  },
  async down(queryInterface, Sequelize, transaction) {
    await queryInterface.dropTable("bioskop", { transaction })
  },
}
