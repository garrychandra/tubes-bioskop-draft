const { DataTypes } = require('sequelize');
const sequelize = require('../db/sequelize');

const Bioskop = sequelize.define('Bioskop', {
  id_bioskop: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  nama_bioskop: {
    type: DataTypes.STRING(200),
    allowNull: false,
  },
  lokasi: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  image_url: DataTypes.TEXT,
}, {
  tableName: 'bioskop',
  timestamps: false,
});

module.exports = Bioskop;
