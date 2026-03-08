const { DataTypes } = require('sequelize');
const sequelize = require('../db/sequelize');

const Jadwal = sequelize.define('Jadwal', {
  id_jadwal: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  jam_tayang: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  jam_selesai: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  harga_tiket: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 50000,
  },
  id_studio: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  id_film: {
    type: DataTypes.UUID,
    allowNull: false,
  },
}, {
  tableName: 'jadwal',
  timestamps: false,
  indexes: [
    { fields: ['id_film'] },
    { fields: ['id_studio'] },
    { fields: ['jam_tayang'] },
  ],
});

module.exports = Jadwal;
