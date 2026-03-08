const { DataTypes } = require('sequelize');
const sequelize = require('../db/sequelize');

const Tiket = sequelize.define('Tiket', {
  id_tiket: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  barcode: {
    type: DataTypes.TEXT,
    allowNull: false,
    unique: true,
  },
  status_tiket: {
    type: DataTypes.STRING(30),
    allowNull: false,
    defaultValue: 'active',
  },
  id_transaksi: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  id_jadwal: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  id_kursi: {
    type: DataTypes.UUID,
    allowNull: false,
  },
}, {
  tableName: 'tiket',
  timestamps: false,
  indexes: [
    { unique: true, fields: ['id_kursi', 'id_jadwal'] },
    { fields: ['id_transaksi'] },
    { fields: ['id_jadwal'] },
    { fields: ['id_kursi'] },
  ],
});

module.exports = Tiket;
