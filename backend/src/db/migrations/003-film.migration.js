'use strict';

module.exports = {
  async up(queryInterface, Sequelize, transaction) {
    await queryInterface.createTable(
      "film",
      {
        id_film: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          allowNull: false,
          primaryKey: true,
        },
        judul: {
          type: Sequelize.STRING(300),
          allowNull: false,
        },
        deskripsi: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        poster_url: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        durasi: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 120,
        },
        genre: {
          type: Sequelize.STRING(100),
          allowNull: true,
        },
        avg_rating: {
          type: Sequelize.DECIMAL(3, 1),
          allowNull: true,
          defaultValue: 0,
        },
        status: {
          type: Sequelize.STRING(20),
          allowNull: true,
          defaultValue: "now_showing",
        },
        release_date: {
          type: Sequelize.DATEONLY,
          allowNull: true,
        },
      },
      { transaction },
    )
  },
  async down(queryInterface, Sequelize, transaction) {
    await queryInterface.dropTable("film", { transaction })
  },
}
