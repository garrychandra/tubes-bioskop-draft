const { DataTypes } = require('sequelize');
const sequelize = require('../db/sequelize');

const Kursi = sequelize.define('Kursi', {
  id_kursi: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  nomor_kursi: {
    type: DataTypes.STRING(10),
    allowNull: false,
  },
  id_studio: {
    type: DataTypes.UUID,
    allowNull: false,
  },
}, {
  tableName: 'kursi',
  timestamps: false,
  indexes: [
    { unique: true, fields: ['id_studio', 'nomor_kursi'] },
    { fields: ['id_studio'] },
  ],
});

module.exports = Kursi;
