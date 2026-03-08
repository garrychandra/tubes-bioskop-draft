const sequelize = require('../db/sequelize');

const User = require('./User');
const Film = require('./Film');
const Rating = require('./Rating');
const Bioskop = require('./Bioskop');
const Studio = require('./Studio');
const Jadwal = require('./Jadwal');
const Kursi = require('./Kursi');
const KursiLock = require('./KursiLock');
const Transaksi = require('./Transaksi');
const Tiket = require('./Tiket');
const Fnb = require('./Fnb');
const DetailFnb = require('./DetailFnb');

// User associations
User.hasMany(Rating, { foreignKey: 'id_user', onDelete: 'CASCADE' });
User.hasMany(Transaksi, { foreignKey: 'id_user', onDelete: 'CASCADE' });
User.hasMany(KursiLock, { foreignKey: 'id_user', onDelete: 'CASCADE' });

// Film associations
Film.hasMany(Rating, { foreignKey: 'id_film', onDelete: 'CASCADE' });
Film.hasMany(Jadwal, { foreignKey: 'id_film', onDelete: 'CASCADE' });

// Rating associations
Rating.belongsTo(User, { foreignKey: 'id_user' });
Rating.belongsTo(Film, { foreignKey: 'id_film' });

// Bioskop associations
Bioskop.hasMany(Studio, { foreignKey: 'id_bioskop', onDelete: 'CASCADE' });

// Studio associations
Studio.belongsTo(Bioskop, { foreignKey: 'id_bioskop' });
Studio.hasMany(Jadwal, { foreignKey: 'id_studio', onDelete: 'CASCADE' });
Studio.hasMany(Kursi, { foreignKey: 'id_studio', onDelete: 'CASCADE' });

// Jadwal associations
Jadwal.belongsTo(Film, { foreignKey: 'id_film' });
Jadwal.belongsTo(Studio, { foreignKey: 'id_studio' });
Jadwal.hasMany(Tiket, { foreignKey: 'id_jadwal', onDelete: 'CASCADE' });
Jadwal.hasMany(KursiLock, { foreignKey: 'id_jadwal', onDelete: 'CASCADE' });

// Kursi associations
Kursi.belongsTo(Studio, { foreignKey: 'id_studio' });
Kursi.hasMany(Tiket, { foreignKey: 'id_kursi', onDelete: 'CASCADE' });
Kursi.hasMany(KursiLock, { foreignKey: 'id_kursi', onDelete: 'CASCADE' });

// KursiLock associations
KursiLock.belongsTo(Kursi, { foreignKey: 'id_kursi' });
KursiLock.belongsTo(Jadwal, { foreignKey: 'id_jadwal' });
KursiLock.belongsTo(User, { foreignKey: 'id_user' });

// Transaksi associations
Transaksi.belongsTo(User, { foreignKey: 'id_user' });
Transaksi.hasMany(Tiket, { foreignKey: 'id_transaksi', onDelete: 'CASCADE' });
Transaksi.hasMany(DetailFnb, { foreignKey: 'id_transaksi', onDelete: 'CASCADE' });

// Tiket associations
Tiket.belongsTo(Transaksi, { foreignKey: 'id_transaksi' });
Tiket.belongsTo(Jadwal, { foreignKey: 'id_jadwal' });
Tiket.belongsTo(Kursi, { foreignKey: 'id_kursi' });

// Fnb associations
Fnb.hasMany(DetailFnb, { foreignKey: 'id_item', onDelete: 'CASCADE' });

// DetailFnb associations
DetailFnb.belongsTo(Transaksi, { foreignKey: 'id_transaksi' });
DetailFnb.belongsTo(Fnb, { foreignKey: 'id_item' });

module.exports = {
  sequelize,
  User,
  Film,
  Rating,
  Bioskop,
  Studio,
  Jadwal,
  Kursi,
  KursiLock,
  Transaksi,
  Tiket,
  Fnb,
  DetailFnb,
};
