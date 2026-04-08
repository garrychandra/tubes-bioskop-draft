const { DataTypes } = require('sequelize');
const sequelize = require('../db/sequelize');

const Transaksi = sequelize.define('Transaksi', {
  id_transaksi: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  total_bayar: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
  },
  tanggal_bayar: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'paid',
  },
  id_user: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  discount_applied: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
}, {
  tableName: 'transaksi',
  timestamps: false,
  indexes: [
    { fields: ['id_user'] },
  ],
});

module.exports = Transaksi;
