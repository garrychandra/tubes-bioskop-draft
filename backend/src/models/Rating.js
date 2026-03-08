const { DataTypes } = require('sequelize');
const sequelize = require('../db/sequelize');

const Rating = sequelize.define('Rating', {
  id_rating: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  nilai_rating: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 1, max: 10 },
  },
  komentar: DataTypes.TEXT,
  id_user: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  id_film: {
    type: DataTypes.UUID,
    allowNull: false,
  },
}, {
  tableName: 'rating',
  timestamps: false,
  indexes: [
    { unique: true, fields: ['id_user', 'id_film'] },
    { fields: ['id_user'] },
    { fields: ['id_film'] },
  ],
});

module.exports = Rating;
