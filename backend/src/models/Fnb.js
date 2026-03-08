const { DataTypes } = require('sequelize');
const sequelize = require('../db/sequelize');

const Fnb = sequelize.define('Fnb', {
  id_item: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  nama_item: {
    type: DataTypes.STRING(200),
    allowNull: false,
  },
  harga: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
  },
}, {
  tableName: 'fnb',
  timestamps: false,
});

module.exports = Fnb;
