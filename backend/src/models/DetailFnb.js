const { DataTypes } = require('sequelize');
const sequelize = require('../db/sequelize');

const DetailFnb = sequelize.define('DetailFnb', {
  id_detail: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  qty: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
  harga_saat_pesan: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  id_transaksi: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  id_item: {
    type: DataTypes.UUID,
    allowNull: false,
  },
}, {
  tableName: 'detail_fnb',
  timestamps: false,
  indexes: [
    { fields: ['id_transaksi'] },
    { fields: ['id_item'] },
  ],
});

module.exports = DetailFnb;
