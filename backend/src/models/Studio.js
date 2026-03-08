const { DataTypes } = require('sequelize');
const sequelize = require('../db/sequelize');

const Studio = sequelize.define('Studio', {
  id_studio: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  nama_studio: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  kapasitas: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 80,
  },
  id_bioskop: {
    type: DataTypes.UUID,
    allowNull: false,
  },
}, {
  tableName: 'studio',
  timestamps: false,
  indexes: [
    { fields: ['id_bioskop'] },
  ],
});

module.exports = Studio;
