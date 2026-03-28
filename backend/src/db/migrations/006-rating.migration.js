'use strict';

module.exports = {
  async up(queryInterface, Sequelize, transaction) {
    await queryInterface.createTable(
      'rating',
      {
        id_rating: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          allowNull: false,
          primaryKey: true,
        },
        nilai_rating: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        komentar: {
          type: Sequelize.TEXT,
          allowNull: true,
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

    await queryInterface.addConstraint('rating', {
      fields: ['nilai_rating'],
      type: 'check',
      where: {
        nilai_rating: {
          [Sequelize.Op.between]: [1, 10],
        },
      },
      name: 'rating_nilai_rating_between_1_10',
      transaction,
    });

    await queryInterface.addIndex('rating', ['id_user', 'id_film'], {
      unique: true,
      transaction,
    });
    await queryInterface.addIndex('rating', ['id_user'], { transaction });
    await queryInterface.addIndex('rating', ['id_film'], { transaction });
  },

  async down(queryInterface, Sequelize, transaction) {
    await queryInterface.dropTable('rating', { transaction });
  },
};
