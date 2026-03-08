const { DataTypes } = require('sequelize');
const sequelize = require('../db/sequelize');

const Film = sequelize.define('Film', {
  id_film: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  judul: {
    type: DataTypes.STRING(300),
    allowNull: false,
  },
  deskripsi: DataTypes.TEXT,
  poster_url: DataTypes.TEXT,
  durasi: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 120,
  },
  genre: DataTypes.STRING(100),
  avg_rating: {
    type: DataTypes.DECIMAL(3, 1),
    defaultValue: 0,
  },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'now_showing',
  },
  release_date: DataTypes.DATEONLY,
}, {
  tableName: 'film',
  timestamps: false,
});

module.exports = Film;
