const { DataTypes } = require('sequelize');
const sequelize = require('../db/sequelize');

const KursiLock = sequelize.define('KursiLock', {
  id_lock: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  id_kursi: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  id_jadwal: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  id_user: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  locked_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false,
  },
}, {
  tableName: 'kursi_locks',
  timestamps: false,
  indexes: [
    { unique: true, fields: ['id_kursi', 'id_jadwal'] },
    { fields: ['id_jadwal'] },
    { fields: ['expires_at'] },
  ],
});

module.exports = KursiLock;
