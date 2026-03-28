const { sequelize, User, Film, Transaksi, Tiket } = require('../models');
const { QueryTypes } = require('sequelize');
const { Op } = require('sequelize');

const getStats = async (req, res) => {
  try {
    const [totalUsers, totalFilms, revenueResult, todayResult, tiketRows] = await Promise.all([
      User.count({ where: { role: 'User' } }),
      Film.count(),
      Transaksi.sum('total_bayar', { where: { status: 'paid' } }),
      sequelize.query(`
        SELECT COALESCE(SUM(total_bayar),0) as today_revenue, COUNT(*) as today_orders
        FROM transaksi WHERE status='paid' AND DATE(tanggal_bayar)=CURRENT_DATE
      `, { type: QueryTypes.SELECT }),
      sequelize.query(`
        SELECT status_tiket, COUNT(*) as count FROM tiket GROUP BY status_tiket
      `, { type: QueryTypes.SELECT }),
    ]);

    const tiketStats = {};
    tiketRows.forEach(r => { tiketStats[r.status_tiket] = parseInt(r.count); });

    res.json({
      total_users: totalUsers,
      total_films: totalFilms,
      total_revenue: parseFloat(revenueResult || 0),
      today_revenue: parseFloat(todayResult[0]?.today_revenue || 0),
      today_orders: parseInt(todayResult[0]?.today_orders || 0),
      tiket: tiketStats,
    });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
};

const getIncome = async (req, res) => {
  try {
    const { period = 'daily', days = 30 } = req.query;
    let dateExpr, groupBy;
    if (period === 'monthly') {
      dateExpr = "TO_CHAR(DATE_TRUNC('month', tanggal_bayar), 'YYYY-MM')";
      groupBy = "DATE_TRUNC('month', tanggal_bayar)";
    } else {
      dateExpr = "TO_CHAR(DATE_TRUNC('day', tanggal_bayar), 'YYYY-MM-DD')";
      groupBy = "DATE_TRUNC('day', tanggal_bayar)";
    }
    const income = await sequelize.query(`
      SELECT ${dateExpr} as date,
             COALESCE(SUM(total_bayar),0) as revenue,
             COUNT(*) as transactions
      FROM transaksi
      WHERE status='paid' AND tanggal_bayar >= NOW() - INTERVAL '1 day' * $1
      GROUP BY ${groupBy}
      ORDER BY ${groupBy} ASC
    `, { bind: [parseInt(days) || 30], type: QueryTypes.SELECT });
    res.json({ income });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
};

const getTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const [rows, countResult] = await Promise.all([
      sequelize.query(`
        SELECT tr.*, u.nama, u.email,
               COUNT(t.id_tiket) as total_tiket
        FROM transaksi tr
        JOIN users u ON tr.id_user = u.id_user
        LEFT JOIN tiket t ON t.id_transaksi = tr.id_transaksi
        GROUP BY tr.id_transaksi, u.id_user
        ORDER BY tr.tanggal_bayar DESC
        LIMIT $1 OFFSET $2
      `, { bind: [parseInt(limit), offset], type: QueryTypes.SELECT }),
      Transaksi.count(),
    ]);

    res.json({ transactions: rows, total: countResult, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
};

const getUsers = async (req, res) => {
  try {
    const users = await sequelize.query(`
      SELECT u.id_user, u.nama, u.email, u.role,
             COUNT(tr.id_transaksi) as total_transactions,
             COALESCE(SUM(tr.total_bayar), 0) as total_spent
      FROM users u
      LEFT JOIN transaksi tr ON tr.id_user = u.id_user
      GROUP BY u.id_user ORDER BY u.nama ASC
    `, { type: QueryTypes.SELECT });
    res.json({ users });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
};

const updateUserRole = async (req, res) => {
  const { role } = req.body;
  if (!['User', 'Admin', 'Banned'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    await user.update({ role });
    res.json({ user: { id_user: user.id_user, nama: user.nama, email: user.email, role: user.role } });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
};

module.exports = { getStats, getIncome, getTransactions, getUsers, updateUserRole };

